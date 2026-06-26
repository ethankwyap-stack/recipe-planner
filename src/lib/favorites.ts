// Favorites are a personal, per-browser preference (not part of the shared
// recipes.json), so they live in localStorage as a list of recipe ids.
const KEY = 'mise.favorites'

export function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

export function saveFavorites(favs: Set<string>): void {
  localStorage.setItem(KEY, JSON.stringify([...favs]))
}
