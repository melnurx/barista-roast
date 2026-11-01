import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RECIPE, SAMPLE_ORDER, type OrderResult, type RoastResult } from './contracts';
import { POST as order } from '../app/api/order/route';
import { POST as roast } from '../app/api/roast/route';
import { POST as transcribe } from '../app/api/transcribe/route';
import { GET as health } from '../app/api/health/route';
import { interpretOrder, roastDrink } from './server-ai';

const request = (body: unknown) => new Request('http://localhost/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('local API path works without making any external request', async () => {
  const oldKey = process.env.OPENAI_API_KEY;
  const oldFetch = globalThis.fetch;
  delete process.env.OPENAI_API_KEY;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('External call not allowed in this test'); };
  try {
    assert.equal((await health().json() as { ai: boolean }).ai, false);
    const response = await order(request({ order: SAMPLE_ORDER }));
    assert.equal(response.status, 200);
    const result = await response.json() as OrderResult;
    assert.equal(result.source, 'local');
    assert.equal(result.recipe.ingredients.find(i => i.id === 'espresso')?.quantity, 4);
    const roasted = await roast(request({ recipe: result.recipe, poured: { espresso: 4, oat: 100 }, changes: 1 }));
    assert.equal(roasted.status, 200);
    assert.equal((await roasted.json() as RoastResult).source, 'local');
    const recording = await transcribe(new Request('http://localhost/api/transcribe', { method: 'POST' }));
    assert.equal(recording.status, 503);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = oldFetch; if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey; }
});

test('routes reject invalid payloads before any interpretation', async () => {
  for (const body of [null, {}, { order: '' }, { order: 'x'.repeat(2001) }, { order: 'latte', poured: { milk: -1 } }, { order: 'latte', currentRecipe: {} }, { order: 'latte', poured: { unknown: 1 } }]) assert.equal((await order(request(body))).status, 400);
  assert.equal((await order(new Request('http://localhost/api/order', { method: 'POST', body: 'not-json' }))).status, 400);
  assert.equal((await roast(request({ recipe: DEFAULT_RECIPE, poured: {}, changes: -1 }))).status, 400);
});

test('local interpretation exposes quantity, capacity and unrecognised-order notes as warnings', async () => {
  const oldKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const capped = await interpretOrder('Large latte with twelve espresso shots and 500 ml whole milk');
    assert.ok(capped.warnings.some(warning => warning.includes('Espresso capped')));
    assert.ok(capped.warnings.some(warning => warning.includes('capacity')));
    const unknown = await interpretOrder('surprise me with something mysterious');
    assert.ok(unknown.warnings.some(warning => warning.includes('recognised no menu drink')));
  } finally { if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey; }
});

test('AI errors fall back locally and keep committed quantities', async () => {
  const oldKey = process.env.OPENAI_API_KEY;
  const oldFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = 'test-only-placeholder';
  globalThis.fetch = async () => new Response('unavailable', { status: 503 });
  try {
    const result = await interpretOrder('No caramel', DEFAULT_RECIPE, { caramel: 2.12345 });
    assert.equal(result.source, 'local');
    assert.equal(result.recipe.ingredients.find(i => i.id === 'caramel')?.quantity, 2.12345);
    assert.ok(result.warnings.some(warning => warning.includes('coffee break')));
    assert.equal((await roastDrink(DEFAULT_RECIPE, { espresso: 2 })).source, 'local');
  } finally { globalThis.fetch = oldFetch; if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey; }
});

test('structured AI recipes are validated and reconciled rather than trusted as executable actions', async () => {
  const oldKey = process.env.OPENAI_API_KEY;
  const oldFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = 'test-only-placeholder';
  let captured: Record<string, unknown> | undefined;
  globalThis.fetch = async (_url, init) => {
    captured = JSON.parse(init?.body as string);
    return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ ...DEFAULT_RECIPE, ingredients: [{ id: 'oat', quantity: 120 }] }) }] }] });
  };
  try {
    const result = await interpretOrder('No caramel, only oat milk', DEFAULT_RECIPE, { caramel: 1.5 });
    assert.equal(result.source, 'openai');
    assert.equal(result.recipe.ingredients.find(i => i.id === 'caramel')?.quantity, 1.5);
    assert.equal(captured?.store, false);
    assert.deepEqual((captured?.text as {format:{type:string}}).format.type, 'json_schema');
  } finally { globalThis.fetch = oldFetch; if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey; }
});

test('AI roast speaks a rounded partial pump while scoring the exact poured amount', async () => {
  const oldKey = process.env.OPENAI_API_KEY;
  const oldFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = 'test-only-placeholder';
  let input: { actualRecipe?: { ingredients: Array<{ id: string; quantity: number }> }; scores?: { chaos: number }; changes?: number } = {};
  globalThis.fetch = async (_url, init) => {
    input = JSON.parse(JSON.parse(init?.body as string).input);
    return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ commentary: 'The caramel got in before the plot twist.', name: 'The First Draft' }) }] }] });
  };
  try {
    const poured = { ice: 5, caramel: 1.55612903, soy: 180, espresso: 3 };
    const recipe = { ...DEFAULT_RECIPE, ingredients: [{ id: 'ice' as const, quantity: 5 }, { id: 'caramel' as const, quantity: 1.55612903 }, { id: 'soy' as const, quantity: 180 }, { id: 'espresso' as const, quantity: 3 }] };
    const result = await roastDrink(recipe, poured, 1);
    assert.equal(result.source, 'openai');
    assert.equal(input.actualRecipe?.ingredients.find(item => item.id === 'caramel')?.quantity, 1.6);
    assert.equal(input.scores?.chaos, 43);
    assert.equal(input.changes, 1);
    assert.equal(poured.caramel, 1.55612903);
  } finally { globalThis.fetch = oldFetch; if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey; }
});

test('a fabricated amount in an AI roast cannot contradict the committed receipt', async () => {
  const oldKey = process.env.OPENAI_API_KEY;
  const oldFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = 'test-only-placeholder';
  globalThis.fetch = async () => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ commentary: 'Four and a half pumps of caramel survived the change.', name: 'Caramel Plot Twist' }) }] }] });
  try {
    const result = await roastDrink({ ...DEFAULT_RECIPE, wantsHealthy: true }, { caramel: 1.55612903, espresso: 4, oat: 180 }, 1);
    assert.equal(result.source, 'local');
    assert.match(result.commentary, /1\.6 syrup pumps/);
    assert.doesNotMatch(result.commentary, /four and a half/i);
  } finally { globalThis.fetch = oldFetch; if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey; }
});
