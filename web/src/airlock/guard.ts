import type { Identity, IdentityField, Leak } from './types'
import { collapse, digitsOf, escapeRe, variantsFor } from './variants'

export class AirlockBreach extends Error {
  readonly leaks: Leak[]
  constructor(leaks: Leak[]) {
    super(`Airlock blocked a request: ${leaks.map((l) => l.field).join(', ')} found in the outgoing payload`)
    this.name = 'AirlockBreach'
    this.leaks = leaks
  }
}

/** Show enough of a variant to recognise it, not enough to read it. */
export function mask(s: string): string {
  if (s.length <= 4) return '•'.repeat(s.length)
  return s.slice(0, 2) + '•'.repeat(Math.min(8, s.length - 4)) + s.slice(-2)
}

/**
 * Remove base64 blobs (inline images) before scanning: they cannot carry text
 * we could detect, and random base64 would produce false matches.
 */
export function stripBlobs(body: string): string {
  return body.replace(/"data"\s*:\s*"[A-Za-z0-9+/=\r\n]{200,}"/g, '"data":"<blob>"')
}

/** Every maximal run of digits, allowing the separators people write inside numbers. */
export function digitRuns(text: string): string[] {
  return (text.match(/\d[\d\s().\-/]*\d|\d/g) ?? []).map(digitsOf).filter((d) => d.length >= 4)
}

/**
 * The airlock guard. Deterministic and model-free.
 * Returns every identity value (or variant of it) found in `body`.
 */
export function scan(body: string, identity: Identity): Leak[] {
  const clean = stripBlobs(body)
  // JSON escapes (\n, é) would hide words; decode the common ones.
  const text = clean.replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  const lower = text.toLowerCase()
  const collapsed = collapse(text)
  const runs = digitRuns(text)
  const leaks: Leak[] = []
  const seen = new Set<string>()
  const add = (field: IdentityField, variant: string, kind: Leak['kind']) => {
    const key = `${field}|${variant}`
    if (seen.has(key)) return
    seen.add(key)
    leaks.push({ field, variant: mask(variant), kind })
  }

  for (const [field, value] of Object.entries(identity) as [IdentityField, string | undefined][]) {
    if (!value || !value.trim()) continue
    const v = variantsFor(field, value)
    for (const t of v.text) if (lower.includes(t)) add(field, t, field === 'DOB' ? 'date' : 'exact')
    for (const c of v.collapsed) if (collapsed.includes(c)) add(field, c, 'collapsed')
    for (const d of v.digits) {
      if (runs.some((r) => r === d || (d.length >= 7 && r.includes(d)))) add(field, d, 'digits')
    }
    for (const w of v.words) {
      if (new RegExp(`(^|[^a-z0-9])${escapeRe(w)}([^a-z0-9]|$)`, 'i').test(text)) add(field, w, 'name')
    }
  }
  return leaks
}

/** Throws AirlockBreach if anything identifying is present. */
export function guard(body: string, identity: Identity): void {
  const leaks = scan(body, identity)
  if (leaks.length) throw new AirlockBreach(leaks)
}
