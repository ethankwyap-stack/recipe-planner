export type MealType = 'lunch' | 'dinner'

export interface Ingredient {
  /** Free-text ingredient name, e.g. "olive oil" */
  item: string
  /** Numeric quantity for one batch of the recipe (at `Recipe.servings`). 0 = "to taste" */
  qty: number
  /** Unit string, e.g. "g", "cup", "tbsp", "" for count items */
  unit: string
  /** Grocery aisle for grouping the shopping list */
  aisle: Aisle
}

export type Aisle =
  | 'Produce'
  | 'Meat & Seafood'
  | 'Dairy & Eggs'
  | 'Bakery'
  | 'Pantry'
  | 'Frozen'
  | 'Spices'
  | 'Other'

export const AISLES: Aisle[] = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Bakery',
  'Pantry',
  'Frozen',
  'Spices',
  'Other',
]

export interface Recipe {
  id: string
  title: string
  /** Which meal slots this recipe is suitable for */
  meal: MealType[]
  /** Number of servings the ingredient quantities produce */
  servings: number
  ingredients: Ingredient[]
  steps: string[]
  /** Free-form tags: diet (vegetarian, vegan, gluten-free), style (quick, comfort)… */
  tags: string[]
  prepTime?: number // minutes
  cookTime?: number // minutes
  sourceUrl?: string
  image?: string
  notes?: string
  /** Original photos of the ingredients (compressed JPEG data URLs; multi-page ok). */
  ingredientsPhotos?: string[]
  /** Original photos of the instructions/method (multi-page ok). */
  instructionsPhotos?: string[]
  /** @deprecated legacy single-photo fields, still read for back-compat. */
  ingredientsPhoto?: string
  instructionsPhoto?: string
}

/** Photos for a recipe section, tolerating both the new array and legacy single field. */
export function recipePhotos(recipe: Recipe, kind: 'ingredients' | 'instructions'): string[] {
  const arr = kind === 'ingredients' ? recipe.ingredientsPhotos : recipe.instructionsPhotos
  const single = kind === 'ingredients' ? recipe.ingredientsPhoto : recipe.instructionsPhoto
  return arr ?? (single ? [single] : [])
}

/** A single day's two planned slots. recipeId is null when empty. */
export interface DayPlan {
  /** ISO date string yyyy-mm-dd */
  date: string
  lunchRecipeId: string | null
  dinnerRecipeId: string | null
}

export interface WeekPlan {
  /** ISO date of the Monday that starts the week */
  weekStartDate: string
  days: DayPlan[] // length 7, Monday..Sunday
  /** How many people you're cooking for; scales the grocery list */
  householdServings: number
}

/** Compact snapshot embedded in a share link: includes the recipes used so a
 *  viewer who doesn't have them in their library can still see the full plan. */
export interface SharedPlan {
  v: 1
  plan: WeekPlan
  recipes: Recipe[]
  title?: string
}
