import type { Ingredient, MealType, Recipe } from '../types'
import { parseIngredientLine, uniqueId } from './parse'

/**
 * Import a recipe from a public recipe-website URL — completely free, no API keys.
 *
 * Almost every recipe site publishes its recipe as schema.org JSON-LD (the same
 * structured data Google reads for rich results), embedded in a
 * <script type="application/ld+json"> tag. We fetch the page through a free public
 * CORS proxy (the browser can't read another site directly), pull out that JSON-LD,
 * and map it onto our Recipe shape. The user reviews it in the form before saving.
 */

// Free, no-signup, no-key public CORS proxies that each return the page's HTML.
// The browser can't read another origin directly, so we relay through one of these.
// They're individually flaky/rate-limited, so we try several and fetch the HTML
// however that proxy hands it back (raw body, or wrapped in JSON). First one that
// yields a real page wins.
interface Proxy {
  url: (target: string) => string
  // Turn the proxy's HTTP response into the target page's HTML.
  extract: (res: Response) => Promise<string>
}

const asText = (res: Response) => res.text()
const PROXIES: Proxy[] = [
  // allorigins, raw passthrough — fast when it's up.
  { url: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`, extract: asText },
  // allorigins, JSON wrapper — a different backend path that often succeeds when /raw is throttled.
  {
    url: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
    extract: async (res) => {
      const data = (await res.json()) as { contents?: string }
      return data.contents ?? ''
    },
  },
  // codetabs — last-resort independent proxy.
  { url: (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`, extract: asText },
]

export async function fetchRecipeFromUrl(rawUrl: string, existing: Recipe[]): Promise<Recipe> {
  const url = normalizeUrl(rawUrl)
  let lastErr: unknown
  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy.url(url))
      if (!res.ok) {
        lastErr = new Error(`proxy returned ${res.status}`)
        continue
      }
      const html = await proxy.extract(res)
      if (!html || html.length < 200) {
        lastErr = new Error('empty page')
        continue
      }
      return parseRecipeFromHtml(html, url, existing)
    } catch (e) {
      // A parse failure (page loaded but has no readable recipe) is final — don't
      // keep retrying other proxies, they'd return the same unreadable page.
      if (e instanceof RecipeParseError) throw e
      lastErr = e
    }
  }
  throw new Error(
    `Couldn't load that page (${lastErr instanceof Error ? lastErr.message : 'network error'}). ` +
      'Some sites block importers — try 📷 From photo or ⬆ Import instead.',
  )
}

/** Thrown when a page loaded fine but carries no recipe we can read. */
export class RecipeParseError extends Error {}

function normalizeUrl(u: string): string {
  const trimmed = u.trim()
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`
  return trimmed
}

/**
 * Pure HTML → Recipe. Kept free of any browser API (uses regex, not DOMParser) so
 * it runs identically in the app and in Node tests.
 */
export function parseRecipeFromHtml(html: string, sourceUrl: string, existing: Recipe[]): Recipe {
  const node = findRecipeNode(html)
  if (!node) {
    throw new RecipeParseError("that page doesn't publish a recipe we can read")
  }

  const title = stripHtml(firstString(node.name)) || 'Imported recipe'
  const servings = parseYield(node.recipeYield) ?? 4

  const ingredients: Ingredient[] = toArray(node.recipeIngredient)
    .map((line) => parseIngredientLine(stripHtml(String(line))))
    .filter((x): x is Ingredient => !!x && !!x.item)

  const steps = flattenInstructions(node.recipeInstructions)

  const tags = collectTags(node)
  const meal = mealFromCategory(node.recipeCategory)

  const recipe: Recipe = {
    id: uniqueId(title, existing),
    title: title.slice(0, 90),
    meal,
    servings,
    ingredients,
    steps,
    tags,
    prepTime: parseDuration(node.prepTime),
    cookTime: parseDuration(node.cookTime),
    sourceUrl,
    image: firstImage(node.image),
  }
  return recipe
}

/** Extract every <script type="application/ld+json"> block and find a Recipe node. */
function findRecipeNode(html: string): any | null {
  // Quotes around the type value are optional — minified pages often drop them.
  const re = /<script[^>]+type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    let data: unknown
    try {
      data = JSON.parse(m[1].trim())
    } catch {
      continue // malformed block — skip it
    }
    const found = searchForRecipe(data)
    if (found) return found
  }
  return null
}

// JSON-LD can be a single object, an array, or carry a "@graph" array of nodes.
function searchForRecipe(data: unknown): any | null {
  if (Array.isArray(data)) {
    for (const item of data) {
      const r = searchForRecipe(item)
      if (r) return r
    }
    return null
  }
  if (data && typeof data === 'object') {
    const obj = data as any
    if (isRecipeType(obj['@type'])) return obj
    if (obj['@graph']) return searchForRecipe(obj['@graph'])
  }
  return null
}

function isRecipeType(t: unknown): boolean {
  if (typeof t === 'string') return t.toLowerCase() === 'recipe'
  if (Array.isArray(t)) return t.some((x) => typeof x === 'string' && x.toLowerCase() === 'recipe')
  return false
}

// ----- field mappers -------------------------------------------------------

function parseDuration(iso: unknown): number | undefined {
  if (typeof iso !== 'string') return undefined
  // ISO 8601 duration, e.g. PT1H30M, PT45M, PT2H
  const m = iso.match(/P(?:T)?(?:(\d+)H)?(?:(\d+)M)?/i)
  if (!m) return undefined
  const hours = Number(m[1] || 0)
  const mins = Number(m[2] || 0)
  const total = hours * 60 + mins
  return total > 0 ? total : undefined
}

function parseYield(y: unknown): number | undefined {
  const candidates = toArray(y)
  for (const c of candidates) {
    const m = String(c).match(/\d+/)
    if (m) {
      const n = parseInt(m[0], 10)
      if (n > 0) return n
    }
  }
  return undefined
}

/** recipeInstructions: array of HowToStep | HowToSection | string, or a single string. */
function flattenInstructions(instr: unknown): string[] {
  const out: string[] = []
  const walk = (node: unknown) => {
    if (node == null) return
    if (typeof node === 'string') {
      // A single HTML blob — split into sentences/lines.
      stripHtml(node)
        .split(/\n+|(?<=[.!?])\s{2,}/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => out.push(s))
      return
    }
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (typeof node === 'object') {
      const obj = node as any
      const type = String(obj['@type'] || '').toLowerCase()
      if (type === 'howtosection' && obj.itemListElement) {
        if (obj.name) out.push(`— ${stripHtml(obj.name)} —`)
        walk(obj.itemListElement)
        return
      }
      const text = obj.text ?? obj.name
      if (text) {
        const clean = stripHtml(String(text)).trim()
        if (clean) out.push(clean)
      }
    }
  }
  walk(instr)
  return out
}

function collectTags(node: any): string[] {
  const tags = new Set<string>()
  const add = (v: unknown) => {
    toArray(v).forEach((item) =>
      String(item)
        .split(',')
        .map((s) => stripHtml(s).trim().toLowerCase())
        .filter(Boolean)
        .forEach((s) => tags.add(s)),
    )
  }
  add(node.keywords)
  add(node.recipeCuisine)
  add(node.recipeCategory)
  return [...tags].slice(0, 8)
}

function mealFromCategory(cat: unknown): MealType[] {
  const text = toArray(cat).join(' ').toLowerCase()
  const meals: MealType[] = []
  if (/dinner|supper|main/.test(text)) meals.push('dinner')
  if (/lunch|breakfast|brunch|salad|soup|side/.test(text)) meals.push('lunch')
  return meals.length ? [...new Set(meals)] : (['lunch', 'dinner'] as MealType[])
}

function firstImage(img: unknown): string | undefined {
  const first = toArray(img)[0]
  if (!first) return undefined
  if (typeof first === 'string') return first
  if (typeof first === 'object') {
    const url = (first as any).url
    if (typeof url === 'string') return url
  }
  return undefined
}

function firstString(v: unknown): string {
  const first = toArray(v)[0]
  return first == null ? '' : String(first)
}

// ----- small utilities -----------------------------------------------------

function toArray<T = unknown>(v: T | T[] | undefined | null): T[] {
  if (v == null) return []
  return Array.isArray(v) ? v : [v]
}

/** Strip HTML tags and decode the handful of entities that show up in recipes. */
function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&frac12;/gi, '½')
    .replace(/&frac14;/gi, '¼')
    .replace(/&frac34;/gi, '¾')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
    .trim()
}
