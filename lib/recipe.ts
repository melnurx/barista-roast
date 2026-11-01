import { CAPACITY, INGREDIENTS, type Ingredient, type IngredientId, type Poured, type PourStep, type Recipe, type Score } from './contracts';

export const INGREDIENT_IDS = Object.keys(INGREDIENTS) as IngredientId[];
const MILKS: IngredientId[] = ['oat', 'milk', 'almond', 'soy'];
const SWEET: IngredientId[] = ['caramel', 'vanilla', 'chocolate', 'strawberry', 'foam', 'whipped'];
const LIMITS: Record<IngredientId, number> = { espresso: 8, oat: 500, milk: 500, almond: 500, soy: 500, water: 500, caramel: 12, vanilla: 12, chocolate: 12, strawberry: 100, foam: 100, whipped: 100, matcha: 100, ice: 10 };
const ORDER: IngredientId[] = ['ice', 'caramel', 'vanilla', 'chocolate', 'water', 'oat', 'milk', 'almond', 'soy', 'espresso', 'matcha', 'foam', 'strawberry', 'whipped'];
const ALIASES: Record<IngredientId, string> = {
  espresso: 'espresso|shots?', oat: 'oat(?:[ -]milk)?', milk: 'whole milk|dairy milk|regular milk|milk', almond: 'almond(?:[ -]milk)?', soy: 'soy(?:[ -]milk)?|soya(?:[ -]milk)?', water: 'water', caramel: 'caramel', vanilla: 'vanilla', chocolate: 'chocolate|mocha', strawberry: 'strawberry(?: cold)?(?: foam)?', foam: 'cold foam|milk foam|foam', whipped: 'whipped cream|whip|cream', matcha: 'matcha', ice: 'ice|iced',
};
const isIngredientId = (id: unknown): id is IngredientId => typeof id === 'string' && Object.prototype.hasOwnProperty.call(INGREDIENTS, id);
const round = (n: number) => Math.round(n * 1000) / 1000;
const positive = (n: unknown): number => typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0;
export function volume(poured: Poured): number { return INGREDIENT_IDS.reduce((total, id) => total + positive(poured[id]) * INGREDIENTS[id].ml, 0); }
export function ingredientMap(ingredients: Ingredient[]): Poured {
  const map: Poured = {};
  for (const ingredient of ingredients) if (isIngredientId(ingredient.id)) map[ingredient.id] = (map[ingredient.id] || 0) + positive(ingredient.quantity);
  return map;
}
const list = (map: Poured): Ingredient[] => ORDER.filter(id => positive(map[id]) > 0).map(id => ({ id, quantity: round(positive(map[id])) }));

export function describeIngredient({ id, quantity }: Ingredient): string {
  const item = INGREDIENTS[id];
  const amount = Math.round(quantity * 10) / 10;
  return `${amount} ${item.unit}${item.unit !== 'ml' && amount !== 1 ? 's' : ''} ${item.label.toLowerCase()}`;
}

export function nameRecipe(recipe: Recipe): string {
  const m = ingredientMap(recipe.ingredients);
  if (m.strawberry && m.espresso) return 'The Strawberry Plot Twist';
  if (m.matcha && m.espresso) return 'The Double Agent';
  if ((m.espresso || 0) >= 4) return 'The Caffeine Side Quest';
  if (m.caramel) return 'The Caramel Main Character';
  if (m.matcha) return 'The Green Room';
  if (m.chocolate) return 'The Chocolate Alibi';
  if (m.vanilla) return 'The Vanilla Soft Launch';
  if (!MILKS.some(id => m[id]) && !m.water) return 'The Short Story';
  if (m.water && m.espresso) return 'The Long Black Story';
  return m.oat ? 'The Oat of Office' : 'The House Favourite';
}

function normalizeWords(input: string): string {
  const numbers: Record<string, string> = { zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12', single: '1', double: '2', triple: '3', quadruple: '4' };
  return input.toLowerCase().replace(/[’]/g, "'").replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|single|double|triple|quadruple)\b/g, word => numbers[word]);
}

function mentioned(text: string, id: IngredientId): boolean { return new RegExp(`\\b(?:${ALIASES[id]})\\b`).test(text); }
function orderClauses(text: string): string[] {
  // Preserve ingredient lists (“no caramel or vanilla”), but start a fresh scope
  // when a conjunction introduces a new instruction. Decimal quantities stay intact.
  return text.split(/[,;!?]|\.(?!\d)|\b(?:but|then|with)\b|\band\s+(?=(?:please\s+)?(?:add|switch|swap|use|make|give|with|extra|another|more|keep|include|pour|put|no|without|remove|skip|hold|omit)\b)/);
}
function isRemoved(text: string, id: IngredientId): boolean {
  const clause = orderClauses(text).filter(part => mentioned(part, id)).at(-1);
  const negative = clause?.match(/\b(?:no|without|remove|skip|hold|omit)\b(.*)/);
  return !!negative && mentioned(negative[1], id);
}
function requestedQuantity(text: string, id: IngredientId): { quantity: number; additive: boolean } | undefined {
  const a = ALIASES[id];
  const unit = INGREDIENTS[id].unit;
  const amount = '(\\d+(?:\\.\\d+)?)\\s*(?:(?:extra|more|additional)\\s+)?';
  const patterns = unit === 'shot'
    ? [new RegExp(`\\b${amount}(?:espresso\\s*)?shots?\\b`), new RegExp(`\\b${amount}espresso\\b`)]
    : unit === 'pump'
      ? [new RegExp(`\\b${amount}pumps?(?:\\s+of)?\\s+(?:${a})\\b`), new RegExp(`\\b${amount}(?:${a})\\s+pumps?\\b`), new RegExp(`\\b(?:${a})\\s+${amount}pumps?\\b`)]
      : unit === 'cube'
        ? [new RegExp(`\\b${amount}(?:ice\\s*)?cubes?\\b`)]
        : [new RegExp(`\\b${amount}(?:ml|millilit(?:er|re)s?)(?:\\s+of)?\\s+(?:${a})\\b`)];
  const clause = orderClauses(text).filter(part => mentioned(part, id)).at(-1);
  if (!clause) return undefined;
  for (const pattern of patterns) {
    const match = clause.match(pattern);
    if (match) {
      const prefix = clause.slice(0, match.index);
      return { quantity: Number(match[1]), additive: /\b(?:add|plus|another|extra|more|additional)\b/.test(prefix) || /\b(?:extra|more|additional)\b/.test(match[0]) };
    }
  }
  return undefined;
}

export function parseOrder(order: string, currentRecipe?: Recipe): Recipe {
  const text = normalizeWords(order.trim()).slice(0, 2000);
  const size = /\b(large|venti|grande)\b/.test(text) ? 'large' : /\b(small|short)\b/.test(text) ? 'small' : /\b(regular|medium)\b/.test(text) ? 'regular' : currentRecipe?.size || 'regular';
  const temperature = /\bhot\b/.test(text) || /\bno ice\b/.test(text) ? 'hot' : /\b(iced|ice|cold)\b/.test(text) ? 'iced' : currentRecipe?.temperature || 'iced';
  const notes: string[] = [];
  const map: Poured = currentRecipe ? ingredientMap(currentRecipe.ingredients) : {};
  const healthy = /\b(healthy|healthier|less sweet|less sugar|cut the sugar)\b/.test(text);
  const isInitial = !currentRecipe;
  const baseVolume = size === 'small' ? 140 : size === 'large' ? 210 : 180;
  if (isInitial) {
    if (/\bmatcha\b/.test(text) && !/\b(espresso|shot|dirty)\b/.test(text)) { map.matcha = 60; map.milk = baseVolume; }
    else if (/\bamericano|long black\b/.test(text)) { map.espresso = 2; map.water = baseVolume; }
    else if (/\bespresso\b/.test(text) && !/latte|cappuccino|flat white|milk|oat|almond|soy|mocha/.test(text)) { map.espresso = 2; }
    else { map.espresso = 2; map.milk = baseVolume; }
    if (/cappuccino/.test(text)) { map.milk = baseVolume * .65; map.foam = 60; }
    if (temperature === 'iced') map.ice = 5;
  }
  if (healthy && currentRecipe) {
    for (const id of SWEET) delete map[id];
    notes.push('Removed future syrup and toppings. Ingredients already poured stay in the glass. This is a playful recipe edit, not a health assessment.');
  } else if (healthy) notes.push('“Healthy” is a request, not a nutritional claim. Your explicit ingredients are preserved.');

  const dairyFree = /dairy[ -]free|no dairy|without dairy/.test(text);
  const targetMilk = (['oat', 'almond', 'soy'] as IngredientId[]).find(id => mentioned(text, id) && !isRemoved(text, id)) || (mentioned(text, 'milk') && !isRemoved(text, 'milk') ? 'milk' : dairyFree ? 'oat' : undefined);
  const addingMilk = currentRecipe && targetMilk && requestedQuantity(text, targetMilk)?.additive;
  if (targetMilk && !addingMilk) { const milkQuantity = MILKS.reduce((n, id) => n + (map[id] || 0), 0) || baseVolume; for (const id of MILKS) delete map[id]; map[targetMilk] = milkQuantity; }
  for (const id of INGREDIENT_IDS) {
    if (!mentioned(text, id)) continue;
    if (id === 'foam' && /strawberry(?: cold)?(?: foam)?/.test(text) && !/(?:and|plus|also) (?:cold |milk )?foam/.test(text)) continue;
    if (id === 'milk' && /(?:oat|almond|soy|soya)[ -]milk/.test(text) && !/whole milk|dairy milk|regular milk/.test(text)) continue;
    if (isRemoved(text, id)) { delete map[id]; continue; }
    const request = requestedQuantity(text, id);
    const extra = new RegExp(`\\b(?:extra|another|add|more)\\s+(?:a\\s+)?(?:${ALIASES[id]})\\b`).test(text);
    const less = new RegExp(`\\b(?:less|half(?: the)?)\\s+(?:${ALIASES[id]})\\b`).test(text);
    const defaults: Record<IngredientId, number> = { espresso: 2, oat: baseVolume, milk: baseVolume, almond: baseVolume, soy: baseVolume, water: baseVolume, caramel: 2, vanilla: 2, chocolate: 2, strawberry: 50, foam: 45, whipped: 35, matcha: 60, ice: 5 };
    if (request) map[id] = currentRecipe && request.additive ? (map[id] || 0) + request.quantity : request.quantity;
    else if (less) map[id] = (map[id] || defaults[id]) / 2;
    else if (extra && currentRecipe) map[id] = (map[id] || 0) + (id === 'espresso' || INGREDIENTS[id].kind === 'syrup' ? 1 : defaults[id] * .5);
    else if (!map[id]) map[id] = defaults[id] * (extra ? 1.5 : 1);
  }
  if (!requestedQuantity(text, 'espresso') && /\b(?:extra|another|add a|add an) (?:espresso )?shot\b/.test(text) && currentRecipe && !isRemoved(text, 'espresso')) map.espresso = (ingredientMap(currentRecipe.ingredients).espresso || 0) + 1;
  if (/\b(?:no|without|remove|skip) (?:all )?(?:syrups?|sugar)\b/.test(text)) for (const id of ['caramel', 'vanilla', 'chocolate'] as IngredientId[]) delete map[id];
  if (/\b(?:no|without|remove|skip) (?:all )?(?:milk|dairy)\b/.test(text) && !dairyFree && isRemoved(text, 'milk')) for (const id of MILKS) delete map[id];
  if (/\bhot\b/.test(text) || /\bno ice\b/.test(text)) delete map.ice;
  if (dairyFree) { delete map.milk; delete map.foam; delete map.whipped; notes.push('Requested dairy-free: future dairy removed. This simulator cannot certify allergens or an already-poured drink.'); }
  if (/allerg|lactose|gluten|nut[ -]free|vegan|sugar[ -]free|decaf|caffeine[ -]free/.test(text)) notes.push('Allergen-free, vegan, sugar-free and decaf guarantees are outside this simulator. Check the ingredient list; do not use it for dietary decisions.');
  const unsupported = text.match(/\b(honey|lavender|hazelnut|coconut|pumpkin|salt|banana|protein|alcohol|vodka|rum|tea|lemon)\b/g);
  if (unsupported) notes.push(`Not stocked: ${[...new Set(unsupported)].join(', ')}. These ingredients were not added.`);
  if (isInitial && !/coffee|latte|cappuccino|americano|espresso|flat white|mocha|matcha|milk|oat|almond|soy|caramel|vanilla|chocolate|foam|whip/.test(text)) notes.push('Local mode recognised no menu drink; started with an iced latte. Edit the ingredients or try a sample order.');
  const recipe: Recipe = { name: '', size, temperature, ingredients: list(map), wantsHealthy: healthy || !!currentRecipe?.wantsHealthy, notes };
  recipe.name = nameRecipe(recipe);
  return reconcileRecipe(recipe, {}).recipe;
}

export function reconcileRecipe(input: Recipe, poured: Poured): { recipe: Recipe; warnings: string[] } {
  const recipe: Recipe = { ...input, ingredients: [], notes: [...(input.notes || [])] };
  const warnings: string[] = [];
  const desired = ingredientMap(input.ingredients);
  const committed: Poured = {};
  const future: Poured = {};
  for (const id of INGREDIENT_IDS) {
    committed[id] = positive(poured[id]);
    const raw = positive(desired[id]);
    const target = Math.min(raw, LIMITS[id]);
    if (raw > LIMITS[id]) warnings.push(`${INGREDIENTS[id].label} capped at ${LIMITS[id]} ${INGREDIENTS[id].unit}${LIMITS[id] !== 1 && INGREDIENTS[id].unit !== 'ml' ? 's' : ''} for this glass.`);
    if (committed[id]! > target + .001) warnings.push(`Already poured: ${describeIngredient({ id, quantity: committed[id]! })}. It stays in this glass; start over to remove it.`);
    future[id] = Math.max(0, target - committed[id]!);
  }
  // A milk swap changes the remaining portion, rather than adding a whole second milk serving.
  // Explicit blends can request both types; only omitted/reduced, already-poured milk is offset.
  let replacedMilk = MILKS.reduce((sum, id) => sum + Math.max(0, (committed[id] || 0) - (desired[id] || 0)), 0);
  for (const id of MILKS) {
    const reduction = Math.min(future[id] || 0, replacedMilk);
    future[id] = (future[id] || 0) - reduction;
    replacedMilk -= reduction;
  }
  const committedVolume = volume(committed);
  if (committedVolume > CAPACITY[recipe.size] + .001) {
    const larger = (['small', 'regular', 'large'] as const).find(size => CAPACITY[size] >= committedVolume);
    if (larger) { recipe.size = larger; warnings.push(`Kept a ${larger} glass to hold what is already poured.`); }
    else warnings.push('The glass is already at capacity. No more ingredients can be added.');
  }
  const available = Math.max(0, CAPACITY[recipe.size] - committedVolume);
  let excess = volume(future) - available;
  if (excess > .001) {
    warnings.push(`The order was adjusted to the ${CAPACITY[recipe.size]} ml glass capacity; already-poured ingredients are preserved.`);
    for (const id of [...MILKS, 'water'] as IngredientId[]) {
      const reduction = Math.min(future[id] || 0, excess / INGREDIENTS[id].ml);
      future[id] = (future[id] || 0) - reduction;
      excess -= reduction * INGREDIENTS[id].ml;
      if (excess <= .001) break;
    }
    if (excess > .001) { const remaining = volume(future); const ratio = remaining ? Math.max(0, available / remaining) : 0; for (const id of INGREDIENT_IDS) future[id] = (future[id] || 0) * ratio; }
  }
  const combined: Poured = {};
  for (const id of INGREDIENT_IDS) combined[id] = (committed[id] || 0) + (future[id] || 0);
  recipe.ingredients = list(combined);
  // Preserve precise committed values even when display rounding would otherwise shave them down.
  for (const ingredient of recipe.ingredients) ingredient.quantity = Math.max(ingredient.quantity, committed[ingredient.id] || 0);
  let roundingOverflow = volume(ingredientMap(recipe.ingredients)) - Math.max(CAPACITY[recipe.size], committedVolume);
  for (const ingredient of [...recipe.ingredients].reverse()) {
    if (roundingOverflow <= 0) break;
    const reduction = Math.min(ingredient.quantity - (committed[ingredient.id] || 0), roundingOverflow / INGREDIENTS[ingredient.id].ml);
    ingredient.quantity -= reduction;
    roundingOverflow -= reduction * INGREDIENTS[ingredient.id].ml;
  }
  recipe.notes = [...new Set([...recipe.notes, ...warnings])].slice(-12);
  if (!recipe.ingredients.length) recipe.notes.push('Nothing to pour. Add an ingredient or start a new order.');
  if (recipe.temperature === 'hot' && (committed.ice || 0) > 0) { recipe.temperature = 'iced'; warnings.push('Ice is already in the glass. Start over for a hot drink.'); recipe.notes.push(warnings[warnings.length - 1]); }
  recipe.name = nameRecipe(recipe);
  return { recipe, warnings };
}

export function makePlan(recipe: Recipe, poured: Poured): PourStep[] {
  return reconcileRecipe(recipe, poured).recipe.ingredients
    .map(item => ({ ...item, quantity: Math.max(0, item.quantity - positive(poured[item.id])), duration: item.id === 'ice' ? 2.3 : INGREDIENTS[item.id].kind === 'milk' ? 4 : INGREDIENTS[item.id].kind === 'cream' ? 2.6 : 3.1 }))
    .filter(item => item.quantity > .001);
}

export function recipeFromPoured(recipe: Recipe, poured: Poured): Recipe { const actual = { ...recipe, ingredients: list(poured), notes: [...recipe.notes] }; return { ...actual, name: nameRecipe(actual) }; }

export function scoreRecipe(recipe: Recipe, poured?: Poured, changes = 0): Score {
  const map = poured === undefined ? ingredientMap(recipe.ingredients) : poured;
  const shots = positive(map.espresso);
  const pumps = ['caramel', 'vanilla', 'chocolate'].reduce((n, id) => n + positive(map[id as IngredientId]), 0);
  const toppings = ['foam', 'strawberry', 'whipped'].filter(id => positive(map[id as IngredientId]) > .01).length;
  const count = INGREDIENT_IDS.filter(id => positive(map[id]) > .01).length;
  const changeCount = Math.max(0, Math.min(20, Math.floor(positive(changes))));
  const contradiction = recipe.wantsHealthy && (pumps > 0 || positive(map.whipped) > 0 || positive(map.strawberry) > 0) ? 20 : 0;
  const shotPoints = Math.max(0, shots - 2) * 9;
  const varietyPoints = Math.max(0, count - 4) * 3;
  const chaos = Math.min(100, Math.round(shotPoints + pumps * 5 + toppings * 12 + contradiction + changeCount * 6 + varietyPoints));
  const sweetness = Math.min(100, Math.round(pumps * 9 + positive(map.strawberry) * .35 + positive(map.whipped) * .3 + positive(map.foam) * .15));
  const complexity = Math.min(100, count * 10 + changeCount * 8);
  const reasons = [`${Math.round(shotPoints)} from shots beyond two (9 each)`, `${Math.round(pumps * 5)} from syrup pumps (5 each)`, `${toppings * 12} from topping types (12 each)`, `${contradiction} from a “healthy” request with sweet extras`, `${changeCount * 6} from order changes (6 each)`, `${varietyPoints} from ingredients beyond four (3 each)`, 'Scores cap at 100. Sweetness is a game meter, not sugar grams; complexity is 10 per ingredient + 8 per change.'];
  const archetype = chaos >= 75 ? 'The Chaos Connoisseur' : sweetness >= 50 ? 'Dessert in Disguise' : shots >= 4 ? 'The Caffeine Side Quest' : positive(map.matcha) ? 'The Green Room Regular' : count <= 2 ? 'The Minimalist' : 'The Main Character';
  return { chaos, complexity, sweetness, archetype, reasons };
}

export function buildRoast(recipe: Recipe, poured?: Poured): string {
  const map = poured === undefined ? ingredientMap(recipe.ingredients) : poured;
  const shots = Math.round(positive(map.espresso) * 10) / 10;
  const pumps = Math.round((positive(map.caramel) + positive(map.vanilla) + positive(map.chocolate)) * 10) / 10;
  if (!INGREDIENT_IDS.some(id => positive(map[id]) > .001)) return 'An empty glass. Finally, an order with absolutely no complications.';
  if (recipe.wantsHealthy && pumps > 0) return `${pumps} syrup pumps and “make it healthy”? Your coffee has filed that request under creative writing.`;
  if (shots >= 4 && pumps >= 4) return `${shots} espresso shots and ${pumps} syrup pumps. A dessert with a caffeine side quest. Ambitious casting.`;
  if (positive(map.strawberry) && shots) return 'Strawberry foam over espresso. Your coffee has entered its romantic-comedy era.';
  if (shots >= 4) return `${shots} espresso shots. This coffee has already replied to your emails and reorganised the office.`;
  if (positive(map.matcha) && shots) return 'Matcha and espresso. Two main characters, one glass. I hope they have good chemistry.';
  if (positive(map.whipped) && pumps) return 'Syrup, whipped cream, and a very convincing coffee disguise. Dessert, your cover is blown.';
  if (pumps >= 4) return `${pumps} syrup pumps. The coffee is now a supporting character in a caramel-coloured drama.`;
  if (recipe.wantsHealthy) return 'Future sweet extras cancelled. A respectable plot twist; the glass still remembers the first draft.';
  if (positive(map.matcha)) return 'Matcha, looking effortlessly composed. Even your coffee order has a better morning routine than mine.';
  if (positive(map.oat)) return 'Oat milk and good intentions. A coffee with an out-of-office message and excellent knitwear.';
  if (!MILKS.some(id => positive(map[id])) && shots) return 'Straight to the coffee. No subplot, no costume changes. I respect the editing.';
  return 'A beautifully sensible order. I had a whole speech prepared, and you have left me professionally unbothered.';
}

export function isRecipe(value: unknown): value is Recipe {
  if (!value || typeof value !== 'object') return false;
  const r = value as Recipe;
  return typeof r.name === 'string' && r.name.length <= 100 && ['small', 'regular', 'large'].includes(r.size) && ['hot', 'iced'].includes(r.temperature) && typeof r.wantsHealthy === 'boolean' && Array.isArray(r.notes) && r.notes.length <= 20 && r.notes.every(n => typeof n === 'string' && n.length <= 600) && Array.isArray(r.ingredients) && r.ingredients.length <= INGREDIENT_IDS.length && new Set(r.ingredients.map(i => i?.id)).size === r.ingredients.length && r.ingredients.every(i => i && isIngredientId(i.id) && typeof i.quantity === 'number' && Number.isFinite(i.quantity) && i.quantity >= 0 && i.quantity <= 1000);
}
export function isPoured(value: unknown): value is Poured {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([id, quantity]) => isIngredientId(id) && typeof quantity === 'number' && Number.isFinite(quantity) && quantity >= 0 && quantity <= 1000) && volume(value as Poured) <= 600.1;
}
