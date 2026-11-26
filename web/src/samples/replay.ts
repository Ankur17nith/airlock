import type { AuditResult } from '../airlock/types'
import { ER_WRIST } from './erWrist'

/**
 * What ?replay=1 plays. Until a real run is captured (Export run → this file),
 * it is a SCRIPTED sample and the UI says so. See docs/STATUS.md.
 */
export const REPLAY = {
  kind: 'scripted' as 'scripted' | 'recorded',
  read: ER_WRIST,
  audit: {
    summary: 'Two charges look like errors and one needs documentation. The X-ray on line 3 repeats line 2, and a blood draw was billed with no lab test.',
    findings: [
      {
        id: 'f1', kind: 'duplicate', title: 'Same wrist X-ray billed twice', lines: [2, 3], amount: 212,
        rationale: 'Lines 2 and 3 bill CPT 73110 (wrist X-ray, 3+ views) on the same day with identical descriptions and no modifier (such as -76 for a repeat study, or -RT/-LT for each wrist) to explain a second study. Ask for the duplicate to be removed.',
        rule: { name: 'CMS NCCI medically unlikely edits (MUEs)', citation: 'CMS, NCCI MUE table, practitioner services', url: 'https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-medically-unlikely-edits' },
        confidence: 'high',
      },
      {
        id: 'f2', kind: 'upcoding', title: 'Level 5 ER visit for a wrist sprain', lines: [1], amount: 0,
        rationale: 'Line 1 bills 99285, the highest ED level, which requires high-complexity medical decision making. A sprain treated with an X-ray, splint and one injection usually supports a lower level. Ask for the documentation of medical decision making.',
        rule: { name: 'AMA CPT 2023 ED E/M guidelines (99281–99285)', citation: 'Medical decision making levels', url: 'https://www.ama-assn.org/practice-management/cpt/cpt-evaluation-and-management' },
        confidence: 'medium',
      },
      {
        id: 'f3', kind: 'question', title: 'Blood draw with no lab test billed', lines: [9], amount: 48,
        rationale: 'Line 9 bills venipuncture (36415) the day after the visit, but no laboratory test appears anywhere on the bill. Ask which test the draw was for, or for the charge to be removed.',
        rule: { name: 'Billing for services not documented', citation: 'Itemised bill review', url: 'https://www.healthcare.gov/how-to-appeal-an-insurance-company-decision/' },
        confidence: 'low',
      },
    ],
    letter: `⟦PATIENT_NAME⟧
⟦ADDRESS⟧
⟦PHONE⟧ · ⟦EMAIL⟧

[DATE]

Patient Financial Services
⟦FACILITY_NAME⟧

**Re: Dispute of itemized statement, account ⟦ACCOUNT_NUMBER⟧ (member ID ⟦MEMBER_ID⟧)**

To whom it may concern,

I am writing to dispute charges on my itemized statement for an emergency department visit. I ask that you review the following lines and correct the bill:

1. **Lines 2 and 3, CPT 73110, $212.00.** The same wrist X-ray is billed twice on the same day with no modifier indicating a repeat study. Please remove the duplicate charge.
2. **Line 1, CPT 99285.** Please send the documentation of medical decision making that supports a level 5 visit, and recode the visit if it does not.
3. **Line 9, CPT 36415, $48.00.** No laboratory test appears on the bill. Please tell me which test this draw was for, or remove the charge.

Please also send me a fully itemized bill with all codes and the medical records supporting each line above. While this dispute is open, I ask that the account be placed on hold and not referred to collections.

Thank you,

⟦PATIENT_NAME⟧
Date of birth: ⟦DOB⟧`,
    sources: [
      { title: 'Medicare NCCI Medically Unlikely Edits | CMS', url: 'https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-medically-unlikely-edits' },
      { title: 'CPT evaluation and management | AMA', url: 'https://www.ama-assn.org/practice-management/cpt/cpt-evaluation-and-management' },
    ],
  } satisfies AuditResult,
  explain: {
    f1: 'Your bill charges for the same wrist X-ray twice on the same day. Unless you had both wrists X-rayed, or the first picture had to be redone (which the bill would usually mark with a code), you should only pay for one. Ask the billing office to remove line 3, which would take $212 off what you owe.',
  } as Record<string, string>,
}
