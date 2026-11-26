import type { IdentityField } from './types'

/**
 * The ways one identifying value can be written. The guard looks for every
 * variant; the vault replaces every variant it can locate as plain text.
 */
export interface Variants {
  /** Case-insensitive substrings that must not appear. */
  text: string[]
  /** Must not appear in the payload with all non-alphanumerics removed. */
  collapsed: string[]
  /** Must not equal (or, if ≥ 7 digits, be contained in) any digit run. */
  digits: string[]
  /** Whole words (case-insensitive). */
  words: string[]
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

export const collapse = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
export const digitsOf = (s: string) => s.replace(/\D/g, '')

/** Parse the common ways a date is written on a bill. Returns [y, m, d] or null. */
export function parseDate(raw: string): [number, number, number] | null {
  const s = raw.trim().toLowerCase()
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (m) return [+m[1], +m[2], +m[3]]
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
  if (m) return [fullYear(+m[3]), +m[1], +m[2]]
  m = s.match(/^([a-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/)
  if (m) { const mo = monthIndex(m[1]); if (mo) return [+m[3], mo, +m[2]] }
  m = s.match(/^(\d{1,2})\s+([a-z]{3,9})\.?,?\s+(\d{4})$/)
  if (m) { const mo = monthIndex(m[2]); if (mo) return [+m[3], mo, +m[1]] }
  m = s.match(/^(\d{2})(\d{2})(\d{4})$/)
  if (m) return [+m[3], +m[1], +m[2]]
  return null
}
const fullYear = (y: number) => (y < 100 ? (y > 30 ? 1900 + y : 2000 + y) : y)
const monthIndex = (name: string) => {
  const i = MONTHS.findIndex((mo) => mo.startsWith(name.slice(0, 3)))
  return i >= 0 ? i + 1 : 0
}
const pad = (n: number) => String(n).padStart(2, '0')

export function dateVariants([y, m, d]: [number, number, number]): string[] {
  const mon = MONTHS[m - 1]
  return [
    `${y}-${pad(m)}-${pad(d)}`, `${pad(m)}/${pad(d)}/${y}`, `${m}/${d}/${y}`, `${pad(m)}-${pad(d)}-${y}`,
    `${pad(m)}/${pad(d)}/${String(y).slice(2)}`, `${m}/${d}/${String(y).slice(2)}`,
    `${mon} ${d}, ${y}`, `${mon} ${d} ${y}`, `${mon.slice(0, 3)} ${d}, ${y}`, `${mon.slice(0, 3)} ${d} ${y}`,
    `${d} ${mon} ${y}`, `${d} ${mon.slice(0, 3)} ${y}`, `${pad(m)}${pad(d)}${y}`, `${y}${pad(m)}${pad(d)}`,
  ]
}

const STOP = new Set(['the', 'and', 'of', 'mr', 'mrs', 'ms', 'dr', 'md', 'jr', 'sr', 'ii', 'iii', 'inc', 'llc'])

export function variantsFor(field: IdentityField, raw: string): Variants {
  const value = raw.trim()
  const v: Variants = { text: [], collapsed: [], digits: [], words: [] }
  if (!value) return v
  v.text.push(value.toLowerCase())
  const c = collapse(value)
  if (c.length >= 5) v.collapsed.push(c)
  const dg = digitsOf(value)

  switch (field) {
    case 'PATIENT_NAME':
    case 'GUARANTOR_NAME':
    case 'PROVIDER_NAME':
    case 'FACILITY_NAME': {
      const parts = value.replace(/[.,]/g, ' ').split(/\s+/).filter((p) => p.length >= 3 && !STOP.has(p.toLowerCase()))
      // Distinctive single words: any part of a person's name; facility words only if long.
      const minLen = field === 'FACILITY_NAME' || field === 'PROVIDER_NAME' ? 6 : 3
      for (const p of parts) if (p.length >= minLen) v.words.push(p.toLowerCase())
      if (parts.length >= 2) {
        const first = parts[0], last = parts[parts.length - 1]
        v.text.push(`${first} ${last}`.toLowerCase(), `${last}, ${first}`.toLowerCase(), `${first[0]}. ${last}`.toLowerCase(), `${last} ${first}`.toLowerCase())
        v.collapsed.push(collapse(`${last}${first}`))
      }
      break
    }
    case 'DOB': {
      const d = parseDate(value)
      if (d) for (const s of dateVariants(d)) { v.text.push(s); }
      if (d) v.digits.push(`${pad(d[1])}${pad(d[2])}${d[0]}`, `${d[0]}${pad(d[1])}${pad(d[2])}`)
      break
    }
    case 'PHONE':
      if (dg.length >= 10) { const ten = dg.slice(-10); v.digits.push(ten, `1${ten}`) }
      else if (dg.length >= 7) v.digits.push(dg)
      break
    case 'EMAIL': {
      const local = value.split('@')[0]
      if (local && local.length >= 5) v.text.push(local.toLowerCase())
      break
    }
    case 'ADDRESS': {
      const street = value.match(/^\s*(\d+\s+[A-Za-z0-9.'\s]+?)(?:,|\n|$)/)
      if (street) { v.text.push(street[1].trim().toLowerCase()); v.collapsed.push(collapse(street[1])) }
      const zip = value.match(/\b(\d{5})(?:-\d{4})?\b\s*$/)
      // A ZIP alone collides with CPT codes, so only flag it with its state ("OH 43215").
      const st = value.match(/\b([A-Z]{2})\s+(\d{5})(?:-\d{4})?\b/)
      if (st) v.text.push(`${st[1]} ${st[2]}`.toLowerCase())
      if (zip && !st) v.text.push(`zip ${zip[1]}`)
      break
    }
    case 'DIAGNOSIS':
      for (const p of value.split(/[\s,;/]+/)) if (p.length >= 7) v.words.push(p.toLowerCase())
      break
    default: // IDs: member, group, claim, account
      if (dg.length >= 6) v.digits.push(dg)
      if (dg.length >= 9) v.digits.push(dg.slice(-6))
      if (c.length >= 5 && c !== dg) v.collapsed.push(c)
  }
  // de-duplicate
  v.text = [...new Set(v.text.filter((t) => t.length >= 3))]
  v.collapsed = [...new Set(v.collapsed)]
  v.digits = [...new Set(v.digits)]
  v.words = [...new Set(v.words)]
  return v
}

export const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
