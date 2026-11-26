import { AUDIT_SHAPE } from './schemas'
import type { Finding, SealedBill } from '../airlock/types'

/** On device. The model sees the whole bill, so it is the one that separates identity from charges. */
export const READ_PROMPT = `You are reading a photo of a US medical document: an itemized hospital bill, a summary bill, an insurer's Explanation of Benefits (EOB) or a denial letter.

Return JSON only, matching the schema.

1. identity: copy EXACTLY as printed every value that identifies a person or a case: patient and guarantor names, mailing address (one line), date of birth, member ID, group number, claim number, account number, phone, e-mail, the provider's and facility's names, and diagnosis text or ICD-10 codes. Leave a field out if it is not printed.
2. lines: one entry per charge row, top to bottom, numbered from 1. date as YYYY-MM-DD. code is the CPT, HCPCS, revenue (4 digits) or NDC code exactly as printed, including modifiers like -RT. description WITHOUT any name, ID, date or address. Amounts as plain numbers (1284.00, not "$1,284.00").
3. totals: total charges, insurance paid, and patient responsibility, if printed.
4. planType (PPO, HMO, EPO, HDHP, Medicare Advantage…), providerType in generic words ("hospital emergency department", never a name), state as a 2-letter code, denialCodes (CARC/RARC like CO-197).

Never invent a value. If a number is unreadable, leave the field out.`

export const auditPrompt = (bill: SealedBill, grounded = true) => `You are a US medical billing advocate reviewing an anonymised bill for a patient. Identity has been removed on the patient's device and replaced with placeholders; never ask for it and never invent it.

Find charges the patient may not owe or should question. Check${grounded ? ', using Google Search for current rules when useful' : ' from your knowledge of current US billing rules (no web search is available, so cite only rules you are sure of)'}:
- duplicate lines (same code, same day, beyond the CMS NCCI medically unlikely edit units)
- unbundling (NCCI procedure-to-procedure edits: components billed separately from a comprehensive code)
- upcoding (e.g. ED E/M level 99285 requires high-complexity medical decision making under the 2023 AMA ED E/M guidelines)
- services that do not fit the rest of the bill (e.g. a blood draw with no lab test billed)
- surprise billing protections (No Surprises Act: emergency care, out-of-network at in-network facilities)
- appealable denial codes, and arithmetic errors in totals.

Rules for findings:
- Every finding names its lines and the rule it relies on, with a citation and an official URL (cms.gov, ecfr.gov, ama-assn.org, healthcare.gov, a state site). If you cannot cite a rule, make it kind "question" with confidence "low" and phrase it as a question to ask the billing office.
- amount is what the patient may not owe; 0 if you cannot tell. Do not double count.
- No speculation about diagnosis.

Then write the dispute letter (markdown, under 300 words) from the patient to the billing office. Use ONLY these placeholders for anything personal: ⟦PATIENT_NAME⟧ ⟦ADDRESS⟧ ⟦DOB⟧ ⟦ACCOUNT_NUMBER⟧ ⟦MEMBER_ID⟧ ⟦CLAIM_NUMBER⟧ ⟦FACILITY_NAME⟧ ⟦PHONE⟧ ⟦EMAIL⟧, and [DATE] for today. Ask for: an itemized bill with codes, the medical records supporting each questioned line, a coding review, correction of the listed errors, and a hold on collections while the dispute is open. Reference findings by line number.

Return JSON only, no prose and no code fences, in this shape:
${AUDIT_SHAPE}

The bill (service dates are day offsets from the first service day):
${JSON.stringify(bill)}`

export const explainPrompt = (f: Finding, language = 'English') =>
  `Explain this medical billing finding to a patient in ${language}, in under 90 words, plainly and calmly, without jargon. Say what it means, why it might be wrong, and the one thing to ask the billing office. Do not invent facts beyond these.

Finding: ${f.title}
Lines: ${f.lines.join(', ')}
Amount in question: $${f.amount.toFixed(2)}
Reasoning: ${f.rationale}
Rule: ${f.rule.name}${f.rule.citation ? ` (${f.rule.citation})` : ''}`
