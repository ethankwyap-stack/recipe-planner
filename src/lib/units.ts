/** Format a numeric quantity nicely (drops trailing zeros, shows common fractions). */
export function formatQty(qty: number): string {
  if (qty === 0) return ''
  const rounded = Math.round(qty * 100) / 100
  if (Number.isInteger(rounded)) return String(rounded)
  // Show a tidy fraction for the common cooking values
  const frac: Record<string, string> = {
    '0.25': '¼',
    '0.5': '½',
    '0.75': '¾',
    '0.33': '⅓',
    '0.67': '⅔',
  }
  const whole = Math.floor(rounded)
  const rem = Math.round((rounded - whole) * 100) / 100
  const key = rem.toFixed(2).replace(/0$/, '').replace(/\.$/, '')
  const f = frac[String(rem)] ?? frac[key]
  if (f) return whole > 0 ? `${whole}${f}` : f
  return String(rounded)
}

/** A short human label for an ingredient quantity + unit. */
export function qtyLabel(qty: number, unit: string): string {
  if (qty === 0) return 'to taste'
  const q = formatQty(qty)
  if (!unit) return q
  // Pluralise count-ish units lightly (clove -> cloves) when qty != 1
  const plural = qty !== 1 && /^(clove|can|head|bunch|slice|stick)$/.test(unit) ? unit + 's' : unit
  return `${q} ${plural}`
}
