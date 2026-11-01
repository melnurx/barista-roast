import { isPoured, isRecipe } from '../../../lib/recipe';
import { interpretOrder, json, readJSON } from '../../../lib/server-ai';

export async function POST(request: Request) {
  try {
    const body = await readJSON(request) as Record<string, unknown>;
    if (!body || typeof body !== 'object' || typeof body.order !== 'string' || !body.order.trim() || body.order.length > 2000) return json({ error: 'Write an order between 1 and 2,000 characters.' }, 400);
    if (body.currentRecipe !== undefined && !isRecipe(body.currentRecipe)) return json({ error: 'The current recipe is invalid. Start a fresh order.' }, 400);
    if (body.poured !== undefined && !isPoured(body.poured)) return json({ error: 'The poured ingredient state is invalid.' }, 400);
    return json(await interpretOrder(body.order.trim(), body.currentRecipe, body.poured));
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Could not read the order.' }, 400); }
}
