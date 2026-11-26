import { AirlockBreach, scan } from '../airlock/guard'
import { ledger } from '../airlock/ledger'
import type { Identity, LedgerEntry } from '../airlock/types'

/**
 * The last code before the network. Every request this page makes to a
 * Google API (Gemini, Firestore, App Check, Remote Config) passes through
 * here; the body is scanned for every value in the vault, and the request is
 * refused if anything identifying is found. Nothing can route around it,
 * because it replaces window.fetch itself.
 */
let currentStage: LedgerEntry['stage'] = 'other'
export const setStage = (s: LedgerEntry['stage']) => { currentStage = s }

const WATCH = /(^|\.)googleapis\.com$|(^|\.)firebaseio\.com$/

async function bodyText(input: RequestInfo | URL, init?: RequestInit): Promise<string> {
  const b = init?.body
  if (typeof b === 'string') return b
  if (b instanceof URLSearchParams) return b.toString()
  if (b instanceof Blob) return await b.text()
  if (b instanceof ArrayBuffer || ArrayBuffer.isView(b)) return new TextDecoder().decode(b as ArrayBuffer)
  if (input instanceof Request && !b) return await input.clone().text()
  return ''
}

export function installFetchGuard(getIdentity: () => Identity) {
  const w = window as Window & { __airlockFetch?: boolean }
  if (w.__airlockFetch) return
  w.__airlockFetch = true
  const original = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.href)
    if (!WATCH.test(url.hostname)) return original(input, init)
    const body = await bodyText(input, init)
    const isModel = /generativelanguage|firebasevertexai|aiplatform/.test(url.hostname)
    const stage = isModel ? currentStage : url.hostname.includes('firestore') ? 'outcome' : 'other'
    const leaks = body ? scan(body, getIdentity()) : []
    if (leaks.length) {
      ledger.add({ stage, direction: 'out', source: 'in_cloud', bytes: body.length, verdict: 'blocked', host: url.hostname, preview: body.slice(0, 600), leaks })
      throw new AirlockBreach(leaks)
    }
    if (isModel || stage === 'outcome') {
      ledger.add({ stage, direction: 'out', source: 'in_cloud', bytes: body.length, verdict: 'passed', host: url.hostname, preview: body.slice(0, 600) })
    }
    return original(input, init)
  }
}
