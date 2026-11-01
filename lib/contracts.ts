export const INGREDIENTS = {
  espresso: { label: 'Espresso', color: '#502918', unit: 'shot', ml: 30, kind: 'coffee' },
  oat: { label: 'Oat milk', color: '#e8ce9d', unit: 'ml', ml: 1, kind: 'milk' },
  milk: { label: 'Whole milk', color: '#f2e4cc', unit: 'ml', ml: 1, kind: 'milk' },
  almond: { label: 'Almond milk', color: '#e6d7b6', unit: 'ml', ml: 1, kind: 'milk' },
  soy: { label: 'Soy milk', color: '#e5ddbd', unit: 'ml', ml: 1, kind: 'milk' },
  water: { label: 'Water', color: '#b6d5d4', unit: 'ml', ml: 1, kind: 'water' },
  caramel: { label: 'Caramel', color: '#b66a28', unit: 'pump', ml: 10, kind: 'syrup' },
  vanilla: { label: 'Vanilla', color: '#e3ae5b', unit: 'pump', ml: 10, kind: 'syrup' },
  chocolate: { label: 'Chocolate', color: '#623624', unit: 'pump', ml: 10, kind: 'syrup' },
  strawberry: { label: 'Strawberry foam', color: '#e9a6a9', unit: 'ml', ml: 1, kind: 'foam' },
  foam: { label: 'Cold foam', color: '#f7ebcf', unit: 'ml', ml: 1, kind: 'foam' },
  whipped: { label: 'Whipped cream', color: '#fff0d7', unit: 'ml', ml: 1, kind: 'cream' },
  matcha: { label: 'Matcha', color: '#7f9551', unit: 'ml', ml: 1, kind: 'coffee' },
  ice: { label: 'Ice', color: '#c3e0dc', unit: 'cube', ml: 8, kind: 'ice' },
} as const;
export type IngredientId = keyof typeof INGREDIENTS;
export type Ingredient = { id: IngredientId; quantity: number };
export type Recipe = {
  name: string;
  size: 'small' | 'regular' | 'large';
  temperature: 'iced' | 'hot';
  ingredients: Ingredient[];
  wantsHealthy: boolean;
  notes: string[];
};
export type Poured = Partial<Record<IngredientId, number>>;
export type PourStep = Ingredient & { duration: number };
export type Score = { chaos: number; complexity: number; sweetness: number; archetype: string; reasons: string[] };
export type OrderResult = { recipe: Recipe; commentary: string; source: 'openai' | 'local'; warnings: string[] };
export type RoastResult = { commentary: string; name: string; source: 'openai' | 'local' };
export const CAPACITY = { small: 300, regular: 450, large: 600 };
export const SAMPLE_ORDER = 'A large iced oat latte, four espresso shots, six pumps of caramel, strawberry cold foam, and whipped cream. Make it healthy.';
export const DEFAULT_RECIPE: Recipe = {
  name: 'The Caramel Main Character', size: 'large', temperature: 'iced',
  ingredients: [{ id: 'ice', quantity: 5 }, { id: 'caramel', quantity: 6 }, { id: 'oat', quantity: 210 }, { id: 'espresso', quantity: 4 }, { id: 'strawberry', quantity: 50 }, { id: 'whipped', quantity: 35 }],
  wantsHealthy: true, notes: [],
};
