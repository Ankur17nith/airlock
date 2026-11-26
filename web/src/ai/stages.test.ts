import { describe, expect, it } from 'vitest'
import { normaliseRead, parseJson } from './stages'
import { auditPrompt } from './prompts'
import { seal } from '../airlock/vault'
import { scan } from '../airlock/guard'
import { ER_WRIST } from '../samples/erWrist'

describe('parseJson', () => {
  it('reads fenced JSON and JSON wrapped in prose', () => {
    expect(parseJson('```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(parseJson('Here you go: {"a":{"b":2}} hope it helps')).toEqual({ a: { b: 2 } })
  })
  it('throws on no JSON', () => { expect(() => parseJson('sorry')).toThrow() })
})

describe('normaliseRead', () => {
  it('turns "$1,284.00" strings into numbers and numbers lines', () => {
    const r = normaliseRead({ lines: [{ description: 'x', charge: '$1,284.00' as unknown as number } as never], totals: { patientOwes: '1,284' as unknown as number } })
    expect(r.lines[0]).toMatchObject({ line: 1, charge: 1284 })
    expect(r.totals.patientOwes).toBe(1284)
  })
})

describe('the audit prompt that is actually sent', () => {
  it('contains the sealed bill and no identity at all', () => {
    const { sealed } = seal(ER_WRIST)
    const body = JSON.stringify({ contents: [{ role: 'user', parts: [{ text: auditPrompt(sealed) }] }] })
    expect(scan(body, ER_WRIST.identity)).toEqual([])
    expect(body).toContain('99285')
  })
})
