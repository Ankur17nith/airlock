import { getGenerativeModel, InferenceMode, type GenerateContentResult, type GenerativeModel } from 'firebase/ai'
import { firebase, policy } from './firebase'
import { BILL_SCHEMA } from './schemas'
import { auditPrompt, explainPrompt, READ_PROMPT } from './prompts'
import { setStage } from './fetchGuard'
import { ledger } from '../airlock/ledger'
import type { AuditResult, BillRead, Finding, SealedBill, Source } from '../airlock/types'

/**
 * The three model calls. The inference mode of each is the design:
 *   read    ONLY_ON_DEVICE    the photo holds identity; never fall back to the cloud
 *   audit   ONLY_IN_CLOUD     anonymous lines only, needs grounding and a larger model
 *   explain PREFER_ON_DEVICE  input has no identity, so a cloud fallback is safe
 */
export interface Staged<T> { data: T; source: Source; ms: number }

const sourceOf = (r: GenerateContentResult): Source =>
  r.response.inferenceSource === 'on_device' ? 'on_device' : 'in_cloud'

let readModel: GenerativeModel | undefined
function getReadModel() {
  readModel ??= getGenerativeModel(firebase().ai, {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: {
      createOptions: {
        expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
        temperature: 0,
        topK: 1,
      } as never, // temperature/topK are accepted by Chrome's LanguageModel.create
      promptOptions: { responseConstraint: BILL_SCHEMA },
    },
  })
  return readModel
}

// ── on-device availability (Chrome's Prompt API, for the UI only) ──────────
export type NanoState = 'unsupported' | 'unavailable' | 'downloadable' | 'downloading' | 'available'
interface LanguageModelStatic { availability(o?: object): Promise<string> }

export async function nanoState(): Promise<NanoState> {
  const LM = (globalThis as unknown as { LanguageModel?: LanguageModelStatic }).LanguageModel
  if (!LM) return 'unsupported'
  try {
    return (await LM.availability({ expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }] })) as NanoState
  } catch {
    return 'unavailable'
  }
}

/** Must be called from a click: Chrome only starts a model download after a user gesture. */
export async function prepareNano(onProgress: (fraction: number) => void): Promise<void> {
  await getReadModel().initializeDeviceModel((p) => onProgress(p))
}

// ── helpers ────────────────────────────────────────────────────────────────
export async function blobToBase64(b: Blob): Promise<string> {
  const buf = new Uint8Array(await b.arrayBuffer())
  let s = ''
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(s)
}

/** Models sometimes wrap JSON in fences or prose; take the outermost object. */
export function parseJson<T>(text: string): T {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  const a = t.indexOf('{'), b = t.lastIndexOf('}')
  if (a < 0 || b < a) throw new Error('The model did not return JSON')
  return JSON.parse(t.slice(a, b + 1)) as T
}

const toNum = (x: unknown) => {
  if (typeof x === 'number') return x
  if (typeof x === 'string') { const n = parseFloat(x.replace(/[$,\s]/g, '')); return Number.isFinite(n) ? n : undefined }
  return undefined
}

export function normaliseRead(raw: Partial<BillRead>): BillRead {
  return {
    documentType: raw.documentType ?? 'other',
    identity: raw.identity ?? {},
    lines: (raw.lines ?? []).map((l, i) => ({
      ...l,
      line: l.line ?? i + 1,
      description: String(l.description ?? ''),
      charge: toNum(l.charge) ?? 0,
      units: toNum(l.units),
      allowed: toNum(l.allowed),
      paid: toNum(l.paid),
      patientOwes: toNum(l.patientOwes),
    })),
    totals: {
      charges: toNum(raw.totals?.charges),
      insurancePaid: toNum(raw.totals?.insurancePaid),
      patientOwes: toNum(raw.totals?.patientOwes),
    },
    planType: raw.planType,
    providerType: raw.providerType,
    state: raw.state,
    denialCodes: raw.denialCodes,
  }
}

// ── 1 · Read (ONLY_ON_DEVICE) ──────────────────────────────────────────────
export async function read(image: Blob): Promise<Staged<BillRead>> {
  const t0 = performance.now()
  setStage('read')
  const r = await getReadModel().generateContent([
    READ_PROMPT,
    { type: 'inlineData', inlineData: { mimeType: image.type || 'image/png', data: await blobToBase64(image) } },
  ])
  const source = sourceOf(r)
  if (source !== 'on_device') throw new Error('Read did not run on the device; refusing to continue') // belt and braces
  const data = normaliseRead(parseJson<Partial<BillRead>>(r.response.text()))
  ledger.add({ stage: 'read', direction: 'local', source, bytes: image.size, verdict: 'local', preview: `Read ${data.lines.length} lines and ${Object.keys(data.identity).length} identifiers on this device` })
  return { data, source, ms: performance.now() - t0 }
}

// ── 3 · Audit (ONLY_IN_CLOUD + Google Search grounding) ────────────────────
export interface AuditExtras { searchEntryPoint?: string; queries?: string[] }

export async function audit(bill: SealedBill): Promise<Staged<AuditResult> & AuditExtras> {
  const t0 = performance.now()
  setStage('audit')
  const model = getGenerativeModel(firebase().ai, {
    mode: InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: { model: policy().cloud_model, tools: [{ googleSearch: {} }], generationConfig: { temperature: 0.2 } },
  })
  const r = await model.generateContent(auditPrompt(bill))
  const data = parseJson<AuditResult>(r.response.text())
  const gm = r.response.candidates?.[0]?.groundingMetadata
  data.findings = (data.findings ?? []).map((f, i) => ({ ...f, id: f.id || `f${i + 1}`, amount: toNum(f.amount) ?? 0, lines: f.lines ?? [] }))
  data.sources = (gm?.groundingChunks ?? []).flatMap((c) => (c.web?.uri ? [{ title: c.web.title ?? c.web.uri, url: c.web.uri }] : []))
  ledger.add({ stage: 'audit', direction: 'in', source: sourceOf(r), bytes: r.response.text().length, verdict: 'passed', preview: `${data.findings.length} findings, letter of ${data.letter?.length ?? 0} characters` })
  return { data, source: sourceOf(r), ms: performance.now() - t0, searchEntryPoint: gm?.searchEntryPoint?.renderedContent, queries: gm?.webSearchQueries }
}

// ── 5 · Explain (PREFER_ON_DEVICE) ─────────────────────────────────────────
export async function explain(f: Finding, language = 'English'): Promise<Staged<string>> {
  const t0 = performance.now()
  setStage('explain')
  const model = getGenerativeModel(firebase().ai, {
    mode: InferenceMode.PREFER_ON_DEVICE,
    inCloudParams: { model: policy().cloud_model },
  })
  const r = await model.generateContent(explainPrompt(f, language))
  const source = sourceOf(r)
  if (source === 'on_device') ledger.add({ stage: 'explain', direction: 'local', source, bytes: 0, verdict: 'local', preview: `Explained "${f.title}" on this device` })
  return { data: r.response.text().trim(), source, ms: performance.now() - t0 }
}
