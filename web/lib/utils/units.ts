import { AiIngredient, CanonicalUnit, ExtractedIngredient } from '../types/functions';

// Default confidence value for AI-extracted ingredients when confidence is not provided
const DEFAULT_AI_CONFIDENCE = 0.5;

const UNIT_NORMALIZATION_MAP: Record<string, CanonicalUnit> = {
  piece: 'piece',
  pieces: 'piece',
  pc: 'piece',
  pcs: 'piece',
  item: 'piece',
  items: 'piece',
  can: 'can',
  cans: 'can',
  bottle: 'bottle',
  bottles: 'bottle',
  pkg: 'package',
  pkgs: 'package',
  package: 'package',
  packages: 'package',
  g: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  l: 'l',
  liter: 'l',
  liters: 'l',
  cup: 'cup',
  cups: 'cup',
  tbsp: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tsp: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
};

export interface NormalizedQuantity {
  quantity: number;
  approximate?: boolean;
}

export function normalizeUnit(rawUnit: string | undefined | null): CanonicalUnit | string {
  if (!rawUnit) return '';
  const trimmed = rawUnit.trim();
  if (!trimmed) return '';

  const key = trimmed.toLowerCase();
  return UNIT_NORMALIZATION_MAP[key] || trimmed;
}

export function normalizeQuantity(rawQuantity: number | string | undefined | null): NormalizedQuantity {
  if (typeof rawQuantity === 'number' && !Number.isNaN(rawQuantity)) {
    return { quantity: rawQuantity };
  }

  if (rawQuantity == null) {
    return { quantity: 1, approximate: true };
  }

  const str = String(rawQuantity).toLowerCase().trim();
  if (!str) {
    return { quantity: 1, approximate: true };
  }

  // Strip common approximate words
  const cleaned = str.replace(/about|approx\.?|approximately|around/gi, '').trim();

  // Handle ranges like "1-2" or "1 to 2"
  const rangeMatch = cleaned.match(/(\d*\.?\d+)\s*[-–to]+\s*(\d*\.?\d+)/i);
  if (rangeMatch) {
    const a = parseFloat(rangeMatch[1]);
    const b = parseFloat(rangeMatch[2]);
    if (!Number.isNaN(a) && !Number.isNaN(b)) {
      return { quantity: (a + b) / 2, approximate: true };
    }
  }

  const numberMatch = cleaned.match(/(\d*\.?\d+)/);
  if (numberMatch) {
    const q = parseFloat(numberMatch[1]);
    if (!Number.isNaN(q)) {
      return { quantity: q };
    }
  }

  return { quantity: 1, approximate: true };
}

export function normalizeAiIngredient(ingredient: {
  name: string;
  quantity: number | string;
  unit?: string;
  confidence?: number;
}): AiIngredient {
  const { quantity, approximate } = normalizeQuantity(ingredient.quantity);

  return {
    name: ingredient.name,
    quantity,
    unit: normalizeUnit(ingredient.unit),
    approximate,
    confidence: ingredient.confidence,
  };
}

export function normalizeAiIngredients(ingredients: Array<Partial<AiIngredient>>): AiIngredient[] {
  if (!Array.isArray(ingredients)) return [];
  return ingredients.map((ing) => {
    // Validate required fields
    if (!ing.name || typeof ing.name !== 'string') {
      console.warn('Invalid ingredient detected: missing or invalid name', ing);
      throw new Error('Ingredient name is required and must be a string');
    }
    
    return normalizeAiIngredient({
      name: ing.name,
      quantity: ing.quantity ?? 1,
      unit: ing.unit ?? 'piece', // Use 'piece' instead of 'unit' for clarity
      confidence: ing.confidence,
    });
  });
}

export function aiIngredientsToExtracted(ingredients: AiIngredient[]): ExtractedIngredient[] {
  return ingredients.map((ing) => ({
    name: ing.name,
    quantity: ing.quantity,
    unit: ing.unit,
    confidence: ing.confidence ?? DEFAULT_AI_CONFIDENCE,
  }));
}

