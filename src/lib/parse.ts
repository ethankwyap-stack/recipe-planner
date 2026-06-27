import type { Aisle, Ingredient, MealType, Recipe } from '../types'

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function uniqueId(title: string, existing: Recipe[]): string {
  const base = slugify(title) || 'recipe'
  let id = base
  let n = 2
  const taken = new Set(existing.map((r) => r.id))
  while (taken.has(id)) id = `${base}-${n++}`
  return id
}

// Guess an aisle from the ingredient name so imports land in a sensible section.
const AISLE_HINTS: [RegExp, Aisle][] = [
  [/chicken|beef|pork|salmon|fish|shrimp|bacon|turkey|sausage|steak|mince/i, 'Meat & Seafood'],
  [/milk|cheese|yogurt|butter|cream|egg|feta|mozzarella|parmesan/i, 'Dairy & Eggs'],
  [/bread|tortilla|bun|bagel|baguette|pita/i, 'Bakery'],
  [/frozen|peas|ice/i, 'Frozen'],
  [/salt|pepper|cumin|paprika|oregano|cinnamon|chili|spice|curry powder|turmeric/i, 'Spices'],
  [
    /tomato|onion|garlic|pepper|carrot|broccoli|spinach|lettuce|cucumber|lemon|lime|potato|ginger|herb|basil|cilantro|avocado|mushroom|zucchini|apple|banana/i,
    'Produce',
  ],
  [/rice|pasta|flour|sugar|oil|vinegar|bean|chickpea|lentil|stock|broth|sauce|can|coconut milk|honey|miso|quinoa|oats|noodle/i, 'Pantry'],
]

export function guessAisle(item: string): Aisle {
  for (const [re, aisle] of AISLE_HINTS) if (re.test(item)) return aisle
  return 'Other'
}

// Longer / plural forms must precede their singular so the regex consumes the whole unit.
const UNIT_WORDS =
  'tablespoons|tablespoon|teaspoons|teaspoon|tbsps|tbsp|tsps|tsp|cups|cup|ounces|ounce|pounds|pound|grams|gram|kilograms|kilogram|kg|g|ml|liters|litre|l|cloves|clove|cans|can|heads|head|bunches|bunch|slices|slice|sticks|stick|packages|package|pkg|cartons|carton|jars|jar|pinch|handful|oz|lbs|lb'

// Unicode "vulgar fraction" characters → decimal, so "1½ cups" reads as 1.5 cups.
const VULGAR_FRACTIONS: Record<string, number> = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 1 / 6, '⅚': 5 / 6,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
}

function normalizeFractions(s: string): string {
  return s.replace(/(\d+)?\s*([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/g, (_, whole, frac) => {
    const val = (whole ? parseInt(whole, 10) : 0) + VULGAR_FRACTIONS[frac]
    return String(Math.round(val * 1000) / 1000)
  })
}

/** Parse a single ingredient line like "2 cups flour" or "1 onion, diced". */
export function parseIngredientLine(line: string): Ingredient | null {
  // Strip only leading bullet markers/whitespace — NOT digits, which are the quantity.
  const text = normalizeFractions(line.replace(/^[-*•]\s*/, '').trim())
  if (!text) return null
  // qty unit item
  const re = new RegExp(`^(\\d+(?:[.,/]\\d+)?)\\s*(${UNIT_WORDS})?\\s+(.*)$`, 'i')
  const m = text.match(re)
  if (m) {
    const qty = parseQty(m[1])
    const unit = (m[2] || '').toLowerCase()
    const item = m[3].split(',')[0].trim()
    return { item, qty, unit, aisle: guessAisle(item) }
  }
  const item = text.split(',')[0].trim()
  return { item, qty: 0, unit: '', aisle: guessAisle(item) }
}

function parseQty(s: string): number {
  if (s.includes('/')) {
    const [a, b] = s.split('/').map(Number)
    return b ? a / b : a
  }
  return parseFloat(s.replace(',', '.')) || 0
}

/**
 * Parse pasted plain-text recipes. Recipes are separated by a line of "---" or
 * by two blank lines. Within each: first non-empty line is the title; lines under
 * an "Ingredients" heading become ingredients; lines under "Steps"/"Instructions"
 * (or remaining numbered lines) become steps. Best-effort — the user can edit after.
 */
export function parseRecipeText(text: string, existing: Recipe[]): Recipe[] {
  const blocks = text
    .split(/\n\s*---+\s*\n|\n\s*\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
  const out: Recipe[] = []
  const running = [...existing]

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trimEnd())
    let title = ''
    const ingredients: Ingredient[] = []
    const steps: string[] = []
    let mode: 'none' | 'ing' | 'steps' = 'none'

    for (const raw of lines) {
      const line = raw.trim()
      if (!line) continue
      if (!title) {
        title = line.replace(/^#+\s*/, '')
        continue
      }
      if (/^(ingredients)\s*:?$/i.test(line)) {
        mode = 'ing'
        continue
      }
      if (/^(steps|instructions|method|directions)\s*:?$/i.test(line)) {
        mode = 'steps'
        continue
      }
      if (mode === 'ing') {
        const ing = parseIngredientLine(line)
        if (ing) ingredients.push(ing)
      } else if (mode === 'steps') {
        steps.push(line.replace(/^[-*•\d.)\s]+/, '').trim())
      } else {
        // No headings yet: treat dashed/bulleted lines as ingredients, numbered as steps.
        if (/^[-*•]/.test(line)) {
          const ing = parseIngredientLine(line)
          if (ing) ingredients.push(ing)
        } else if (/^\d+[.)]/.test(line)) {
          steps.push(line.replace(/^[-*•\d.)\s]+/, '').trim())
        }
      }
    }

    if (!title) continue
    const id = uniqueId(title, running)
    const recipe: Recipe = {
      id,
      title,
      meal: ['lunch', 'dinner'] as MealType[],
      servings: 4,
      ingredients,
      steps,
      tags: [],
    }
    out.push(recipe)
    running.push(recipe)
  }

  return out
}
