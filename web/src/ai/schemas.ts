/**
 * JSON Schemas. BILL_SCHEMA constrains Gemini Nano's output on the device
 * (Prompt API `responseConstraint`); AUDIT_SHAPE is described to the cloud
 * model in the prompt (grounding and strict schemas don't always combine).
 */
const str = { type: 'string' }
const num = { type: 'number' }

export const BILL_SCHEMA = {
  type: 'object',
  properties: {
    documentType: { type: 'string', enum: ['itemized_bill', 'summary_bill', 'eob', 'denial_letter', 'other'] },
    identity: {
      type: 'object',
      properties: {
        PATIENT_NAME: str, GUARANTOR_NAME: str, ADDRESS: str, DOB: str, MEMBER_ID: str, GROUP_NUMBER: str,
        CLAIM_NUMBER: str, ACCOUNT_NUMBER: str, PHONE: str, EMAIL: str, PROVIDER_NAME: str, FACILITY_NAME: str, DIAGNOSIS: str,
      },
    },
    lines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          line: { type: 'integer' }, date: str, code: str,
          codeType: { type: 'string', enum: ['CPT', 'HCPCS', 'REV', 'NDC', 'OTHER'] },
          description: str, units: num, charge: num, allowed: num, paid: num, patientOwes: num, denialCode: str,
        },
        required: ['line', 'description', 'charge'],
      },
    },
    totals: { type: 'object', properties: { charges: num, insurancePaid: num, patientOwes: num } },
    planType: str,
    providerType: str,
    state: str,
    denialCodes: { type: 'array', items: str },
  },
  required: ['documentType', 'identity', 'lines', 'totals'],
} as const

export const AUDIT_SHAPE = `{
  "summary": string,                       // two sentences, plain English
  "findings": [{
    "id": string,                          // "f1", "f2", …
    "kind": "duplicate" | "unbundling" | "upcoding" | "surprise_billing" | "denial_appealable" | "pricing" | "math" | "question",
    "title": string,                       // ≤ 9 words
    "lines": number[],                     // line numbers this finding is about
    "amount": number,                      // dollars the patient may not owe; 0 if unknown
    "rationale": string,                   // ≤ 60 words, cites the lines
    "rule": { "name": string, "citation": string, "url": string },
    "confidence": "high" | "medium" | "low"
  }],
  "letter": string                         // markdown dispute letter using the placeholders below
}`
