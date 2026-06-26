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
  /** Original photo of the ingredients list (compressed JPEG data URL). */
  ingredientsPhoto?: string
  /** Original photo of the instructions/method (compressed JPEG data URL). */
  instructionsPhoto?: string
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
