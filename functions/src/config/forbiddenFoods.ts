/**
 * Forbidden / toxic foods for cats and dogs.
 * Sourced from ASPCA and veterinary guidelines. Used to filter ingredients in pet recipe mode.
 * Normalized to lowercase for matching; match against normalized ingredient names.
 */

const normalizeForMatch = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

/** Terms that indicate a toxic food (substring match after normalization). ASPCA-based. */
const TOXIC_COMMON: string[] = [
  'chocolate', 'cocoa', 'caffeine', 'coffee', 'tea',
  'grapes', 'raisins', 'currants', 'sultanas',
  'xylitol', 'onion', 'garlic', 'leek', 'chive', 'shallot',
  'avocado', 'macadamia', 'walnuts', 'pecans', 'nutmeg',
  'alcohol', 'ethanol', 'yeast dough', 'raw yeast', 'hops',
  'marijuana', 'cannabis', 'moldy', 'mold ', 'green tomato',
  'rhubarb leaves', 'wild mushroom', 'apple seeds', 'cherry pit',
  'peach pit', 'apricot pit', 'persin',
];

export const FORBIDDEN_DOG: string[] = [
  ...TOXIC_COMMON,
  'cooked bones', 'fat trimmings', 'excessive salt', 'cinnamon oil',
].map(normalizeForMatch);

export const FORBIDDEN_CAT: string[] = TOXIC_COMMON.map(normalizeForMatch);

/** Check if an ingredient string matches any forbidden term for the species */
function isForbidden(ingredient: string, list: string[]): boolean {
  const n = normalizeForMatch(ingredient);
  return list.some(term => n.includes(term) || term.includes(n));
}

export function filterIngredientsForPet(
  ingredients: string[],
  species: 'cat' | 'dog'
): { safe: string[]; removed: string[] } {
  const list = species === 'dog' ? FORBIDDEN_DOG : FORBIDDEN_CAT;
  const removed: string[] = [];
  const safe = ingredients.filter(name => {
    if (isForbidden(name, list)) {
      removed.push(name);
      return false;
    }
    return true;
  });
  return { safe, removed };
}

export const PET_RECIPE_DISCLAIMER =
  'Disclaimer: Always consult your veterinarian before making significant changes to your pet\'s diet. ' +
  'These treats or meals are intended as occasional supplements, not as a complete and balanced diet.';
