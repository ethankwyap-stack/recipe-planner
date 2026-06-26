import type { Recipe } from '../types'

/** Owner-only settings for committing recipes back into the repo. Stored locally. */
export interface RepoConfig {
  owner: string // GitHub username / org
  repo: string // repository name
  branch: string // e.g. "main"
  path: string // e.g. "public/data/recipes.json"
  token: string // fine-grained PAT with Contents: write — stays in this browser only
  autoPublish?: boolean // commit changes automatically (default true once token is set)
}

/** Best-effort guess of owner/repo from a GitHub Pages URL like
 *  https://user.github.io/repo/ — pre-fills setup so the user only pastes a token. */
export function guessRepoFromUrl(): { owner: string; repo: string } {
  try {
    const m = location.hostname.match(/^([^.]+)\.github\.io$/)
    const owner = m ? m[1] : ''
    const seg = location.pathname.split('/').filter(Boolean)[0] ?? ''
    // On a project page the first path segment is the repo; on a user root page it isn't.
    const repo = owner && seg && !location.hostname.startsWith(seg) ? seg : ''
    return { owner, repo }
  } catch {
    return { owner: '', repo: '' }
  }
}

const CFG_KEY = 'mise.repoConfig'

export function loadRepoConfig(): RepoConfig | null {
  try {
    const raw = localStorage.getItem(CFG_KEY)
    if (!raw) return null
    const cfg = JSON.parse(raw) as RepoConfig
    // Backfill owner/repo from the site URL if they were left blank, so a token
    // saved without them still works for auto-publish.
    if (!cfg.owner || !cfg.repo) {
      const g = guessRepoFromUrl()
      cfg.owner = cfg.owner || g.owner
      cfg.repo = cfg.repo || g.repo
    }
    return cfg
  } catch {
    return null
  }
}

export function saveRepoConfig(cfg: RepoConfig): void {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg))
}

export function clearRepoConfig(): void {
  localStorage.removeItem(CFG_KEY)
}

export function isConfigured(cfg: RepoConfig | null): cfg is RepoConfig {
  return !!cfg && !!cfg.owner && !!cfg.repo && !!cfg.path && !!cfg.token
}

function b64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}

async function getCurrentSha(cfg: RepoConfig): Promise<string | undefined> {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}?ref=${cfg.branch}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${cfg.token}`, Accept: 'application/vnd.github+json' },
  })
  if (res.status === 404) return undefined
  if (!res.ok) throw new Error(`GitHub read failed (${res.status}): ${await res.text()}`)
  const json = await res.json()
  return json.sha as string
}

/** Commit the full recipe collection back to recipes.json in the repo. */
export async function commitRecipes(cfg: RepoConfig, recipes: Recipe[]): Promise<void> {
  const sha = await getCurrentSha(cfg)
  const content = b64(JSON.stringify(recipes, null, 2) + '\n')
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Update recipes (${recipes.length} total)`,
      content,
      branch: cfg.branch,
      ...(sha ? { sha } : {}),
    }),
  })
  if (!res.ok) throw new Error(`GitHub commit failed (${res.status}): ${await res.text()}`)
}
