import { describe, expect, it } from 'vitest'
import { seal, Vault } from './vault'
import { sweep } from './sweep'
import { forget, loadIdentity, saveIdentity } from './store'
import { ER_WRIST } from '../samples/erWrist'
import type { BillRead } from './types'

describe('seal', () => {
  const { sealed, vault } = seal(ER_WRIST)

  it('moves every identity field into the vault', () => {
    expect(vault.size).toBe(Object.keys(ER_WRIST.identity).length)
  })
  it('replaces calendar dates with day offsets', () => {
    expect(sealed.lines.map((l) => l.day)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 1])
    expect(JSON.stringify(sealed)).not.toMatch(/2026-10-0/)
  })
  it('keeps codes, units and amounts exactly', () => {
    expect(sealed.lines.map((l) => l.code)).toEqual(ER_WRIST.lines.map((l) => l.code))
    expect(sealed.lines.reduce((a, l) => a + l.charge, 0)).toBe(3685)
    expect(sealed.totals.patientOwes).toBe(1284)
  })
  it('tokenises identity that the model left inside a description', () => {
    const read: BillRead = { ...ER_WRIST, lines: [{ line: 1, description: 'Visit for Maya Ellison, acct 400118273', charge: 10 }] }
    const r = seal(read)
    expect(r.sealed.lines[0].description).toBe('Visit for ⟦PATIENT_NAME⟧, acct ⟦ACCOUNT_NUMBER⟧')
    expect(r.inlineRedactions).toBeGreaterThan(0)
  })
  it('drops a state that is not a two-letter code', () => {
    expect(seal({ ...ER_WRIST, state: 'Columbus, Ohio' }).sealed.state).toBeUndefined()
  })
})

describe('rehydrate', () => {
  const v = new Vault(ER_WRIST.identity)
  it('fills tokens back in, in all bracket styles', () => {
    expect(v.rehydrate('Dear ⟦FACILITY_NAME⟧, I am ⟦PATIENT_NAME⟧ ({{MEMBER_ID}}, [[DOB]]).'))
      .toBe('Dear Riverbend General Hospital, I am Maya R. Ellison (XGH884120937, 04/17/1991).')
  })
  it('leaves unknown tokens visible so the user can fill them', () => {
    expect(v.rehydrate('Claim ⟦CLAIM_NUMBER⟧')).toBe('Claim ⟦CLAIM_NUMBER⟧')
  })
  it('lists tokens in a text', () => {
    expect(Vault.tokensIn('⟦A_B⟧ and {{C}} and ⟦A_B⟧')).toEqual(['A_B', 'C'])
  })
})

describe('sweep', () => {
  it.each([
    ['call (614) 555-0199 today', 'phone'],
    ['write to someone@example.org', 'email'],
    ['ssn 123-45-6789', 'ssn'],
    ['MRN 00912873', 'id'],
    ['seen 10/03/2026', 'date'],
    ['at 77 Elm Street', 'street'],
  ])('%s → %s', (text, kind) => {
    expect(sweep(text).hits.map((h) => h.kind)).toContain(kind)
  })
  it.each(['99285', 'A4570', 'J1885', '0450', '73110-RT', '00409-1886-01', '$1,284.00', '12 units'])('keeps %s', (text) => {
    expect(sweep(text).hits).toEqual([])
  })
})

describe('store', () => {
  it('round-trips the identity encrypted, and forgets it', async () => {
    await saveIdentity(ER_WRIST.identity)
    expect(await loadIdentity()).toEqual(ER_WRIST.identity)
    await forget()
    expect(await loadIdentity()).toBeNull()
  })
  it('expires after 24 hours', async () => {
    await saveIdentity(ER_WRIST.identity)
    expect(await loadIdentity(Date.now() + 25 * 3600_000)).toBeNull()
  })
})
