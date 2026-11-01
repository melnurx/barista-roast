import { isPoured, isRecipe } from '../../../lib/recipe';
import { json, readJSON, roastDrink } from '../../../lib/server-ai';

export async function POST(request: Request) {
  try {
    const body = await readJSON(request) as Record<string, unknown>;
    if (!body || !isRecipe(body.recipe) || !isPoured(body.poured)) return json({ error: 'A valid recipe and actual poured ingredients are required.' }, 400);
    const changes = body.changes === undefined ? 0 : body.changes;
    if (typeof changes !== 'number' || !Number.isInteger(changes) || changes < 0 || changes > 100) return json({ error: 'Invalid order-change count.' }, 400);
    return json(await roastDrink(body.recipe, body.poured, changes));
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Could not read the drink.' }, 400); }
}
