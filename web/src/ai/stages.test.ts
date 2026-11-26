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

describe('audit fallback plan', () => {
  it('tries grounding first, then the same model ungrounded, then the fallback model', async () => {
    const { auditPlan } = await import('./stages')
    expect(auditPlan('a', 'b', true)).toEqual([{ model: 'a', grounded: true }, { model: 'a', grounded: false }, { model: 'b', grounded: false }])
    expect(auditPlan('a', 'a', false)).toEqual([{ model: 'a', grounded: false }])
  })
  it('retries quota and overload errors, not others', async () => {
    const { isRetryable } = await import('./stages')
    expect(isRetryable(new Error('[429 Too Many Requests] quota'))).toBe(true)
    expect(isRetryable(new Error('[500 Internal Server Error] high demand'))).toBe(true)
    expect(isRetryable(new Error('[401 Unauthorized] App Check token is invalid'))).toBe(false)
  })
})
