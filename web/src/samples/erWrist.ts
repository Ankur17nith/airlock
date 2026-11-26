import type { BillRead } from '../airlock/types'

/**
 * FICTIONAL. Maya R. Ellison does not exist. Phone numbers use the 555-01xx
 * range reserved for fiction; the e-mail uses example.com (RFC 2606).
 */
export const ER_WRIST: BillRead = {
  documentType: 'itemized_bill',
  identity: {
    PATIENT_NAME: 'Maya R. Ellison',
    ADDRESS: '2148 Oakridge Ave, Columbus, OH 43215',
    DOB: '04/17/1991',
    MEMBER_ID: 'XGH884120937',
    GROUP_NUMBER: '0072215',
    ACCOUNT_NUMBER: '400118273',
    PHONE: '(614) 555-0142',
    EMAIL: 'maya.ellison@example.com',
    FACILITY_NAME: 'Riverbend General Hospital',
    DIAGNOSIS: 'S63.501A Sprain of right wrist',
  },
  lines: [
    { line: 1, date: '2026-10-03', code: '99285', codeType: 'CPT', description: 'ED visit, high complexity (level 5)', units: 1, charge: 1890.0 },
    { line: 2, date: '2026-10-03', code: '73110', codeType: 'CPT', description: 'X-ray wrist, 3+ views', units: 1, charge: 212.0 },
    { line: 3, date: '2026-10-03', code: '73110', codeType: 'CPT', description: 'X-ray wrist, 3+ views', units: 1, charge: 212.0 },
    { line: 4, date: '2026-10-03', code: '29125', codeType: 'CPT', description: 'Application of short arm splint, static', units: 1, charge: 384.0 },
    { line: 5, date: '2026-10-03', code: 'A4570', codeType: 'HCPCS', description: 'Splint supply', units: 1, charge: 96.0 },
    { line: 6, date: '2026-10-03', code: 'J1885', codeType: 'HCPCS', description: 'Injection, ketorolac, 15 mg', units: 1, charge: 58.0 },
    { line: 7, date: '2026-10-03', code: '96372', codeType: 'CPT', description: 'Therapeutic injection, IM', units: 1, charge: 145.0 },
    { line: 8, date: '2026-10-03', code: '0450', codeType: 'REV', description: 'Emergency room, general', units: 1, charge: 640.0 },
    { line: 9, date: '2026-10-04', code: '36415', codeType: 'CPT', description: 'Routine venipuncture', units: 1, charge: 48.0 },
  ],
  totals: { charges: 3685.0, insurancePaid: 2401.0, patientOwes: 1284.0 },
  planType: 'PPO',
  providerType: 'hospital emergency department',
  state: 'OH',
}
