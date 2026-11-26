import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { AirlockBreach, guard, scan, stripBlobs } from './guard'
import { seal } from './vault'
import { ER_WRIST } from '../samples/erWrist'
import type { Identity } from './types'

const id = ER_WRIST.identity
const fields = (body: string, identity: Identity = id) => scan(body, identity).map((l) => l.field)

describe('guard: a clean sealed bill passes', () => {
  it('passes the sealed sample bill', () => {
    const { sealed } = seal(ER_WRIST)
    expect(scan(JSON.stringify(sealed), id)).toEqual([])
  })
  it('keeps CPT, HCPCS and revenue codes and amounts, even when a code equals the ZIP', () => {
    const body = JSON.stringify({ lines: [{ code: '43215', charge: 1284 }, { code: 'A4570' }, { code: '0450' }] })
    expect(fields(body)).toEqual([])
  })
})

describe('guard: catches identifiers written other ways', () => {
  const cases: [string, string][] = [
    ['exact name', 'Patient: Maya R. Ellison'],
    ['upper case surname first', 'ELLISON, MAYA'],
    ['surname alone', 'billed to ellison family'],
    ['first name alone', 'note from Maya'],
    ['member id with dashes', 'member XGH-8841-20937'],
    ['member id digits only', 'ref 884120937'],
    ['member id last six', 'card ending 120937'],
    ['dob long form', 'born April 17, 1991'],
    ['dob iso', '1991-04-17'],
    ['dob packed', 'dob 04171991'],
    ['phone reformatted', 'call 614.555.0142'],
    ['phone with country code', '+1 614 555 0142'],
    ['email', 'maya.ellison@example.com'],
    ['email local part', 'user maya.ellison'],
    ['street', 'mail to 2148 Oakridge Ave'],
    ['state and zip', 'Columbus OH 43215'],
    ['account number spaced', 'acct 400 118 273'],
    ['facility', 'Riverbend General Hospital'],
    ['diagnosis code', 'dx S63.501A'],
    ['json-escaped', JSON.stringify({ d: 'line one\nMaya Ellison' })],
  ]
  it.each(cases)('%s', (_name, text) => {
    expect(scan(JSON.stringify({ description: text }), id).length).toBeGreaterThan(0)
  })

  it('throws AirlockBreach with masked variants', () => {
    try {
      guard('{"x":"Maya R. Ellison"}', id)
      throw new Error('not blocked')
    } catch (e) {
      expect(e).toBeInstanceOf(AirlockBreach)
      const leaks = (e as AirlockBreach).leaks
      expect(leaks[0].field).toBe('PATIENT_NAME')
      expect(leaks.every((l) => !l.variant.includes('ellison'))).toBe(true)
    }
  })
})

describe('guard: blobs', () => {
  it('ignores inline image data but still scans text parts', () => {
    const b64 = 'A'.repeat(500)
    const body = JSON.stringify({ parts: [{ inlineData: { mimeType: 'image/png', data: b64 } }, { text: 'hello' }] })
    expect(stripBlobs(body)).toContain('<blob>')
    expect(fields(body)).toEqual([])
  })
})

describe('guard: property tests', () => {
  const name = fc.tuple(
    fc.stringMatching(/^[A-Z][a-z]{3,9}$/),
    fc.stringMatching(/^[A-Z][a-z]{4,11}$/),
  ).map(([f, l]) => `${f} ${l}`)
  const memberId = fc.stringMatching(/^[A-Z]{3}\d{9}$/)
  const formats = (n: string, m: string) => [
    n, n.toUpperCase(), n.split(' ').reverse().join(', '),
    m, m.slice(3), `${m.slice(0, 3)}-${m.slice(3, 7)}-${m.slice(7)}`, m.slice(3).replace(/(\d{3})/g, '$1 ').trim(),
  ]

  it('any generated identity smuggled into a description, in any format, is blocked', () => {
    fc.assert(fc.property(name, memberId, fc.nat(6), (n, m, i) => {
      const identity: Identity = { PATIENT_NAME: n, MEMBER_ID: m }
      const leak = formats(n, m)[i]
      const body = JSON.stringify({ lines: [{ code: '99285', description: `ED visit ${leak}`, charge: 1890 }] })
      return scan(body, identity).length > 0
    }), { numRuns: 400 })
  })

  it('a payload of only codes and amounts never trips the guard', () => {
    const line = fc.record({
      code: fc.oneof(fc.stringMatching(/^\d{5}$/), fc.stringMatching(/^[A-V]\d{4}$/), fc.stringMatching(/^0\d{3}$/)),
      charge: fc.float({ min: 1, max: 99999, noNaN: true }).map((x) => Math.round(x * 100) / 100),
      units: fc.integer({ min: 1, max: 12 }),
    })
    fc.assert(fc.property(name, memberId, fc.array(line, { maxLength: 30 }), (n, m, lines) => {
      // a member ID could coincidentally contain a code; that is a true positive, not what we test here
      const body = JSON.stringify({ lines })
      return scan(body, { PATIENT_NAME: n, MEMBER_ID: m }).filter((l) => l.field === 'PATIENT_NAME').length === 0
    }), { numRuns: 400 })
  })
})
