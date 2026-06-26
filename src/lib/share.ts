import type { SharedPlan } from '../types'

// UTF-8 safe base64 (handles emoji / accents in recipe text).
function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64(b64: string): string {
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + pad)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** Encode a shared plan into a URL hash fragment value. */
export function encodeSharedPlan(shared: SharedPlan): string {
  return toBase64(JSON.stringify(shared))
}

/** Build a full shareable URL for the current origin. */
export function buildShareUrl(shared: SharedPlan): string {
  const base = window.location.origin + window.location.pathname
  return `${base}#plan=${encodeSharedPlan(shared)}`
}

/** Read a shared plan out of the current URL hash, or null if none/invalid. */
export function readSharedPlanFromHash(): SharedPlan | null {
  const hash = window.location.hash.replace(/^#/, '')
  const m = hash.match(/(?:^|&)plan=([^&]+)/)
  if (!m) return null
  try {
    const obj = JSON.parse(fromBase64(m[1])) as SharedPlan
    if (obj && obj.v === 1 && obj.plan && Array.isArray(obj.recipes)) return obj
  } catch {
    /* malformed link */
  }
  return null
}

export function clearShareHash(): void {
  history.replaceState(null, '', window.location.pathname + window.location.search)
}
