/**
 * A regex pass over text that has already been tokenised. It catches
 * identifiers the model put in the wrong field — a phone number inside a
 * description, an account number in a footer — without knowing their value.
 *
 * It must never remove what the audit needs: CPT (5 digits), HCPCS (letter +
 * 4 digits), revenue codes (4 digits), modifiers, NDCs, units and amounts.
 */
export interface SweepHit {
  kind: 'email' | 'phone' | 'ssn' | 'id' | 'date' | 'street'
  match: string
  line?: number
}

const RULES: [SweepHit['kind'], RegExp][] = [
  ['email', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
  ['ssn', /\b\d{3}-\d{2}-\d{4}\b/g],
  ['phone', /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g],
  ['date', /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/gi],
  ['street', /\b\d{1,6}\s+(?:[A-Z][a-z]+\s){1,3}(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place|Ter|Terrace|Pkwy|Hwy)\b\.?/g],
  // Identifier-like tokens: ≥ 7 characters of letters/digits/dashes containing ≥ 5 digits,
  // optionally after a label (MRN, ACCT, MBR, ID, #). Codes are 4–5 characters, so they are safe.
  ['id', /\b(?:(?:MRN|ACCT|ACC|MBR|MEMBER|ID|CLAIM|GRP|GROUP|POLICY|INV|ACCOUNT)[\s#:.-]*)?(?=[A-Z0-9-]*(?:\d[A-Z-]*){5})[A-Z0-9][A-Z0-9-]{6,}\b/gi],
]

/** NDC codes (5-4-2 and variants) look like IDs but are drug identifiers the audit needs. */
const NDC = /^\d{4,5}-\d{3,4}-\d{1,2}$/
/** A CPT or HCPCS code with modifiers: 73110-RT, 29125-LT-59. */
const CODE_WITH_MODIFIERS = /^(?:\d{5}|[A-V]\d{4})(?:-[A-Z0-9]{2})+$/i

export function sweep(text: string): { text: string; hits: SweepHit[] } {
  const hits: SweepHit[] = []
  let out = text
  for (const [kind, re] of RULES) {
    out = out.replace(re, (m) => {
      if (kind === 'id' && (NDC.test(m) || CODE_WITH_MODIFIERS.test(m) || /^\d+(?:\.\d+)?$/.test(m) && m.length < 7)) return m
      if (m.includes('⟦')) return m
      hits.push({ kind, match: m })
      return `⟦REDACTED_${kind.toUpperCase()}⟧`
    })
  }
  return { text: out, hits }
}
