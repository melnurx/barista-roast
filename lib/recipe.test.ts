import test from 'node:test';
import assert from 'node:assert/strict';
import { CAPACITY, DEFAULT_RECIPE, SAMPLE_ORDER, type Poured, type Recipe } from './contracts';
import { buildRoast, ingredientMap, isPoured, isRecipe, makePlan, parseOrder, reconcileRecipe, scoreRecipe, volume } from './recipe';

test('sample order retains explicitly requested sweet additions despite initial healthy contradiction', () => {
  const recipe = parseOrder(SAMPLE_ORDER);
  const map = ingredientMap(recipe.ingredients);
  assert.equal(recipe.size, 'large');
  assert.equal(recipe.temperature, 'iced');
  assert.equal(map.espresso, 4);
  assert.equal(map.caramel, 6);
  assert.equal(map.strawberry, 50);
  assert.equal(map.foam, undefined);
  assert.equal(map.whipped, 35);
  assert.ok(map.oat);
  assert.equal(map.milk, undefined);
  assert.equal(recipe.wantsHealthy, true);
  assert.ok(recipe.notes.some(note => note.includes('not a nutritional claim')));
});

test('later healthy change cancels future sweet extras but preserves partial syrup already in the glass', () => {
  const poured: Poured = { ice: 5, caramel: 2.31827, oat: 28.4 };
  const desired = parseOrder('Actually make it healthy', DEFAULT_RECIPE);
  assert.equal(ingredientMap(desired.ingredients).caramel, undefined);
  const result = reconcileRecipe(desired, poured);
  const map = ingredientMap(result.recipe.ingredients);
  assert.equal(map.caramel, poured.caramel);
  assert.equal(map.strawberry, undefined);
  assert.equal(map.whipped, undefined);
  assert.ok(result.warnings.some(warning => warning.includes('Already poured')));
  assert.equal(makePlan(result.recipe, poured).find(step => step.id === 'caramel'), undefined);
});

test('milk swaps preserve old milk and queue the replacement, including repeated edits', () => {
  let recipe = parseOrder('Hot latte with whole milk');
  const poured: Poured = { milk: 72.34128, espresso: .4 };
  for (const command of ['Switch to oat milk', 'No milk, add another shot', 'Switch to almond milk', 'Make it healthy']) {
    recipe = reconcileRecipe(parseOrder(command, recipe), poured).recipe;
    const map = ingredientMap(recipe.ingredients);
    assert.ok(map.milk! >= poured.milk!);
    assert.ok(map.espresso! >= poured.espresso!);
    assert.ok(volume(map) <= CAPACITY[recipe.size] + 1e-6);
  }
  assert.ok(makePlan(recipe, poured).every(step => step.quantity > 0));
});

test('a milk swap replaces only the remaining portion and retains even tiny committed amounts', () => {
  const recipe = parseOrder('Hot latte with whole milk');
  const swapped = reconcileRecipe(parseOrder('Switch to oat milk', recipe), { milk: 70, espresso: .00001 }).recipe;
  const map = ingredientMap(swapped.ingredients);
  assert.equal(map.milk, 70);
  assert.equal(map.oat, 110);
  const removed = reconcileRecipe(parseOrder('No espresso', swapped), { milk: 70, espresso: .00001 }).recipe;
  assert.equal(ingredientMap(removed.ingredients).espresso, .00001);
});

test('zero shots and negated ingredient lists are respected', () => {
  const recipe = parseOrder('Iced oat latte with zero espresso shots, no caramel or vanilla, no foam');
  const map = ingredientMap(recipe.ingredients);
  assert.equal(map.espresso, undefined);
  assert.equal(map.caramel, undefined);
  assert.equal(map.vanilla, undefined);
  assert.equal(map.foam, undefined);
  assert.ok(map.oat);
});

test('extra shot changes add one without resetting the existing recipe', () => {
  const recipe = parseOrder('Add another shot', DEFAULT_RECIPE);
  assert.equal(ingredientMap(recipe.ingredients).espresso, 5);
  assert.equal(ingredientMap(recipe.ingredients).caramel, 6);
  assert.equal(ingredientMap(parseOrder('Add two shots', DEFAULT_RECIPE).ingredients).espresso, 6);
});

test('negative lists end before a positive add, with, or switch clause', () => {
  const add = ingredientMap(parseOrder('No caramel and add two shots', DEFAULT_RECIPE).ingredients);
  assert.equal(add.caramel, undefined);
  assert.equal(add.espresso, 6);
  const switchMilk = ingredientMap(parseOrder('Remove the caramel and switch to oat milk', parseOrder('Hot caramel latte with whole milk')).ingredients);
  assert.equal(switchMilk.caramel, undefined);
  assert.equal(switchMilk.milk, undefined);
  assert.equal(switchMilk.oat, 180);
  for (const phrase of ['No caramel and with two espresso shots', 'No caramel with two espresso shots']) {
    const map = ingredientMap(parseOrder(phrase, DEFAULT_RECIPE).ingredients);
    assert.equal(map.caramel, undefined);
    assert.equal(map.espresso, 2);
  }
  const list = ingredientMap(parseOrder('No caramel or vanilla and add one espresso shot', parseOrder('Large oat latte with caramel and vanilla')).ingredients);
  assert.equal(list.caramel, undefined);
  assert.equal(list.vanilla, undefined);
  assert.equal(list.espresso, 3);
});

test('explicit additions increase shots, syrup pumps, milk volumes and ice cubes', () => {
  assert.equal(ingredientMap(parseOrder('Add two pumps of caramel', DEFAULT_RECIPE).ingredients).caramel, 8);
  assert.equal(ingredientMap(parseOrder('Add two caramel pumps', DEFAULT_RECIPE).ingredients).caramel, 8);
  assert.equal(ingredientMap(parseOrder('Add 50 ml oat milk', DEFAULT_RECIPE).ingredients).oat, 260);
  assert.equal(ingredientMap(parseOrder('Add two ice cubes', DEFAULT_RECIPE).ingredients).ice, 7);
  assert.equal(ingredientMap(parseOrder('Add 0.5 pumps of caramel', DEFAULT_RECIPE).ingredients).caramel, 6.5);
  assert.equal(ingredientMap(parseOrder('Add two more espresso shots', DEFAULT_RECIPE).ingredients).espresso, 6);
  assert.equal(ingredientMap(parseOrder('Two more shots', DEFAULT_RECIPE).ingredients).espresso, 6);
  assert.equal(ingredientMap(parseOrder('Make it two pumps of caramel', DEFAULT_RECIPE).ingredients).caramel, 2);
});

test('the UI extra-shot shortcut adds exactly one even with explicit number and extra marker', () => {
  assert.equal(ingredientMap(parseOrder('Add one extra espresso shot', DEFAULT_RECIPE).ingredients).espresso, 5);
  assert.equal(ingredientMap(parseOrder('Add one extra shot', DEFAULT_RECIPE).ingredients).espresso, 5);
  assert.equal(ingredientMap(parseOrder('Add a shot', DEFAULT_RECIPE).ingredients).espresso, 5);
});

test('adding a measured different milk keeps a blend; switching changes the remaining milk', () => {
  const original = parseOrder('Hot latte with whole milk');
  const blend = ingredientMap(parseOrder('Add 50 ml oat milk', original).ingredients);
  assert.equal(blend.milk, 180);
  assert.equal(blend.oat, 50);
  const replacement = ingredientMap(parseOrder('No milk and switch to oat milk', original).ingredients);
  assert.equal(replacement.milk, undefined);
  assert.equal(replacement.oat, 180);
});

test('common drink bases and explicit millilitres produce distinct recipes', () => {
  assert.equal(ingredientMap(parseOrder('Hot double espresso').ingredients).espresso, 2);
  assert.equal(ingredientMap(parseOrder('Hot americano').ingredients).water, 180);
  assert.ok(ingredientMap(parseOrder('Cappuccino').ingredients).foam);
  assert.ok(ingredientMap(parseOrder('Iced matcha with oat milk').ingredients).matcha);
  assert.equal(ingredientMap(parseOrder('Hot latte with 120 ml whole milk').ingredients).milk, 120);
  assert.equal(ingredientMap(parseOrder('Hot flat white').ingredients).ice, undefined);
});

test('capacity fitting keeps every committed ingredient and never exceeds glass capacity', () => {
  const recipe: Recipe = { ...DEFAULT_RECIPE, ingredients: [
    { id: 'espresso', quantity: 8 }, { id: 'oat', quantity: 500 }, { id: 'caramel', quantity: 12 }, { id: 'vanilla', quantity: 12 }, { id: 'chocolate', quantity: 12 }, { id: 'whipped', quantity: 100 }, { id: 'ice', quantity: 10 },
  ] };
  const poured: Poured = { oat: 240.2332, caramel: 3.412, ice: 5 };
  const result = reconcileRecipe(recipe, poured);
  const actual = ingredientMap(result.recipe.ingredients);
  assert.ok(volume(actual) <= 600 + 1e-6);
  for (const [id, quantity] of Object.entries(poured)) assert.ok(actual[id as keyof Poured]! >= quantity!);
  assert.ok(result.warnings.some(warning => warning.includes('capacity')));
});

test('a smaller glass and hot change cannot undo existing volume or ice', () => {
  const poured: Poured = { ice: 5, milk: 320, espresso: 2 };
  const desired = parseOrder('Make it small and hot', DEFAULT_RECIPE);
  const result = reconcileRecipe(desired, poured);
  assert.equal(result.recipe.size, 'regular');
  assert.equal(result.recipe.temperature, 'iced');
  assert.ok(result.warnings.some(warning => warning.includes('Ice is already')));
  assert.equal(ingredientMap(result.recipe.ingredients).milk, 320);
});

test('makePlan queues only remaining amounts in preparation order', () => {
  const recipe = parseOrder(SAMPLE_ORDER);
  const plan = makePlan(recipe, { ice: 5, caramel: 2, oat: 100 });
  assert.equal(plan[0].id, 'caramel');
  assert.equal(plan[0].quantity, 4);
  assert.ok(plan.every(step => step.duration >= 2 && step.duration <= 4));
  assert.deepEqual(makePlan(recipe, ingredientMap(recipe.ingredients)), []);
});

test('scores use actual delivered ingredients instead of cancelled planned ones', () => {
  const actual = { espresso: 2, oat: 150 };
  const scored = scoreRecipe(DEFAULT_RECIPE, actual, 0);
  assert.equal(scored.sweetness, 0);
  assert.equal(scored.chaos, 0);
  assert.equal(scored.complexity, 20);
  const changed = scoreRecipe(DEFAULT_RECIPE, actual, 2);
  assert.equal(changed.chaos, 12);
  assert.equal(changed.complexity, 36);
  assert.ok(scored.reasons.some(reason => reason.includes('game meter')));
  assert.equal(scoreRecipe(DEFAULT_RECIPE, {}, 0).chaos, 0);
});

test('roasts do not hallucinate planned syrup in an actual syrup-free drink', () => {
  const roast = buildRoast(DEFAULT_RECIPE, { espresso: 4, oat: 100 });
  assert.ok(roast.includes('4 espresso shots'));
  assert.ok(!roast.includes('syrup'));
});

test('unsupported dietary guarantees and unavailable ingredients are made explicit', () => {
  const recipe = parseOrder('Dairy-free decaf oat latte with honey, I have an allergy');
  assert.ok(recipe.notes.some(note => /cannot certify allergens/.test(note)));
  assert.ok(recipe.notes.some(note => /decaf guarantees/.test(note)));
  assert.ok(recipe.notes.some(note => /Not stocked: honey/.test(note)));
  const result = reconcileRecipe(recipe, { milk: 50 });
  assert.equal(ingredientMap(result.recipe.ingredients).milk, 50);
  assert.ok(result.warnings.some(note => /whole milk/.test(note)));
});

test('validators reject invalid ingredient ids, negative numbers, duplicates and overflow', () => {
  assert.equal(isRecipe(DEFAULT_RECIPE), true);
  assert.equal(isRecipe({ ...DEFAULT_RECIPE, ingredients: [{ id: '__proto__', quantity: 4 }] }), false);
  assert.equal(isRecipe({ ...DEFAULT_RECIPE, ingredients: [{ id: 'espresso', quantity: -1 }] }), false);
  assert.equal(isRecipe({ ...DEFAULT_RECIPE, ingredients: [{ id: 'espresso', quantity: 2 }, { id: 'espresso', quantity: 3 }] }), false);
  assert.equal(isPoured({ espresso: NaN }), false);
  assert.equal(isPoured({ water: 601 }), false);
  assert.equal(isPoured({ toString: 2 }), false);
  assert.equal(isPoured({ espresso: .25, oat: 100.123 }), true);
});
