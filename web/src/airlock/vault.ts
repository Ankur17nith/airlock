import type { BillRead, Identity, IdentityField, SealedBill, SealedLine } from './types'
import { IDENTITY_FIELDS } from './types'
import { escapeRe, parseDate, variantsFor } from './variants'
import { sweep, type SweepHit } from './sweep'

export const token = (field: IdentityField) => `⟦${field}⟧`
const TOKEN_RE = /(?:⟦|\[\[|\{\{)\s*([A-Z_]+)\s*(?:⟧|\]\]|\}\})/g

/** Identity ↔ token map. Lives only on the device. */
export class Vault {
  readonly identity: Identity
  constructor(identity: Identity = {}) {
    const clean: Identity = {}
    for (const f of IDENTITY_FIELDS) {
      const v = identity[f]?.trim()
      if (v) clean[f] = v
    }
    this.identity = clean
  }

  get size() { return Object.keys(this.identity).length }
  entries() { return Object.entries(this.identity) as [IdentityField, string][] }

  /** Replace every locatable variant of every identity value with its token. */
  redact(text: string): { text: string; replaced: IdentityField[] } {
    let out = text
    const replaced = new Set<IdentityField>()
    // Longest values first so "Maya R. Ellison" wins over "Ellison".
    const pairs: [IdentityField, string][] = []
    for (const [field, value] of this.entries()) {
      const v = variantsFor(field, value)
      for (const t of [value, ...v.text]) pairs.push([field, t])
      for (const w of v.words) pairs.push([field, w])
    }
    pairs.sort((a, b) => b[1].length - a[1].length)
    for (const [field, t] of pairs) {
      if (t.length < 3) continue
      const re = new RegExp(`(^|[^A-Za-z0-9])${escapeRe(t)}(?=[^A-Za-z0-9]|$)`, 'gi')
      if (re.test(out)) {
        out = out.replace(re, (_m, pre: string) => `${pre}${token(field)}`)
        replaced.add(field)
      }
    }
    // "⟦PATIENT_NAME⟧ ⟦PATIENT_NAME⟧" (first and last name matched separately) → one token
    out = out.replace(/(⟦[A-Z_]+⟧)(?:[\s.,]*\1)+/g, '$1')
    return { text: out, replaced: [...replaced] }
  }

  /** Put the real values back. Accepts ⟦X⟧, [[X]] and {{X}}, since models sometimes rewrite brackets. */
  rehydrate(text: string): string {
    return text.replace(TOKEN_RE, (m, name: string) => this.identity[name as IdentityField] ?? m)
  }

  /** Tokens present in a text, in order of first appearance. */
  static tokensIn(text: string): string[] {
    return [...new Set([...text.matchAll(TOKEN_RE)].map((m) => m[1]))]
  }
}

export interface SealResult {
  sealed: SealedBill
  vault: Vault
  /** Identity values found inside line text and replaced. */
  inlineRedactions: number
  sweepHits: SweepHit[]
}

const toDays = (iso?: string) => {
  if (!iso) return undefined
  const d = parseDate(iso)
  return d ? Date.UTC(d[0], d[1] - 1, d[2]) / 86_400_000 : undefined
}

/** On-device: turn what Nano read into the only shape that may cross. */
export function seal(read: BillRead): SealResult {
  const vault = new Vault(read.identity)
  const days = read.lines.map((l) => toDays(l.date)).filter((d): d is number => d !== undefined)
  const day0 = days.length ? Math.min(...days) : undefined
  let inlineRedactions = 0
  const sweepHits: SweepHit[] = []

  const clean = (s: string, line?: number) => {
    const r = vault.redact(s)
    inlineRedactions += r.replaced.length
    const sw = sweep(r.text)
    sweepHits.push(...sw.hits.map((h) => ({ ...h, line })))
    return sw.text
  }

  const lines: SealedLine[] = read.lines.map((l) => {
    const { date, ...rest } = l
    const d = toDays(date)
    return {
      ...rest,
      description: clean(l.description, l.line),
      denialCode: l.denialCode ? clean(l.denialCode, l.line) : undefined,
      day: d !== undefined && day0 !== undefined ? d - day0 : undefined,
    }
  })

  return {
    vault,
    inlineRedactions,
    sweepHits,
    sealed: {
      documentType: read.documentType,
      lines,
      totals: read.totals,
      planType: read.planType ? clean(read.planType) : undefined,
      providerType: read.providerType ? clean(read.providerType) : undefined,
      state: read.state && /^[A-Z]{2}$/.test(read.state.trim()) ? read.state.trim() : undefined,
      denialCodes: read.denialCodes?.map((c) => clean(c)),
    },
  }
}
