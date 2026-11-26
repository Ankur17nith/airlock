/** Fields that identify a person or a case. They never leave the device. */
export const IDENTITY_FIELDS = [
  'PATIENT_NAME',
  'GUARANTOR_NAME',
  'ADDRESS',
  'DOB',
  'MEMBER_ID',
  'GROUP_NUMBER',
  'CLAIM_NUMBER',
  'ACCOUNT_NUMBER',
  'PHONE',
  'EMAIL',
  'PROVIDER_NAME',
  'FACILITY_NAME',
  'DIAGNOSIS',
] as const
export type IdentityField = (typeof IDENTITY_FIELDS)[number]
export type Identity = Partial<Record<IdentityField, string>>

export type DocumentType = 'itemized_bill' | 'summary_bill' | 'eob' | 'denial_letter' | 'other'
export type CodeType = 'CPT' | 'HCPCS' | 'REV' | 'NDC' | 'OTHER'

/** A line as read from the bill, on the device. */
export interface LineItem {
  line: number
  date?: string // ISO yyyy-mm-dd, stays on device
  code?: string
  codeType?: CodeType
  description: string
  units?: number
  charge: number
  allowed?: number
  paid?: number
  patientOwes?: number
  denialCode?: string
}

/** Everything the on-device read produces. */
export interface BillRead {
  documentType: DocumentType
  identity: Identity
  lines: LineItem[]
  totals: { charges?: number; insurancePaid?: number; patientOwes?: number }
  planType?: string
  providerType?: string
  state?: string
  denialCodes?: string[]
}

/** A line after sealing: calendar date replaced by a day offset, text swept. */
export interface SealedLine extends Omit<LineItem, 'date'> {
  day?: number
}

/** The only shape that is ever sent to the cloud. */
export interface SealedBill {
  documentType: DocumentType
  lines: SealedLine[]
  totals: BillRead['totals']
  planType?: string
  providerType?: string
  state?: string
  denialCodes?: string[]
}

export type FindingKind =
  | 'duplicate'
  | 'unbundling'
  | 'upcoding'
  | 'surprise_billing'
  | 'denial_appealable'
  | 'pricing'
  | 'math'
  | 'question'

export interface Finding {
  id: string
  kind: FindingKind
  title: string
  lines: number[]
  amount: number
  rationale: string
  rule: { name: string; citation?: string; url?: string }
  confidence: 'high' | 'medium' | 'low'
}

export interface AuditResult {
  summary: string
  findings: Finding[]
  letter: string // markdown with ⟦TOKENS⟧
  sources: { title: string; url: string }[]
}

export type Source = 'on_device' | 'in_cloud' | 'local' | 'replay'

export interface Leak {
  field: IdentityField
  /** The variant that matched, masked for display. */
  variant: string
  kind: 'exact' | 'collapsed' | 'digits' | 'date' | 'name'
}

export interface LedgerEntry {
  id: number
  at: number
  stage: 'read' | 'seal' | 'audit' | 'explain' | 'write' | 'outcome' | 'other'
  direction: 'local' | 'out' | 'in'
  source: Source
  bytes: number
  verdict: 'local' | 'passed' | 'blocked'
  host?: string
  preview: string
  leaks?: Leak[]
}
