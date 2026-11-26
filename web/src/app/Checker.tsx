import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { configured, boot, reportOutcome, type Outcome } from '../ai/firebase'
import { installFetchGuard } from '../ai/fetchGuard'
import { audit as runAudit, explain as runExplain, prepareNano, read as runRead, type NanoState } from '../ai/stages'
import { AirlockBreach, scan } from '../airlock/guard'
import { ledger } from '../airlock/ledger'
import { forget, saveIdentity } from '../airlock/store'
import { seal, type SealResult } from '../airlock/vault'
import type { AuditResult, BillRead, Finding, Leak, SealedBill, Source } from '../airlock/types'
import { REPLAY } from '../samples/replay'
import { NanoBadge, useNano } from '../components/chrome'
import { Lock } from '../landing/Wall'
import { Boundary } from './Boundary'
import { LetterView } from './Letter'
import { ManualEntry } from './ManualEntry'
import './app.css'

type Step = 'start' | 'reading' | 'sealing' | 'review' | 'auditing' | 'results'
const SAMPLE = '/samples/er-wrist.jpg'
const params = () => new URLSearchParams(location.hash.split('?')[1] ?? '')
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

function SourceBadge({ source }: { source: Source }) {
  const map: Record<Source, [string, string]> = {
    on_device: ['badge-device', 'On device · Gemini Nano'],
    in_cloud: ['badge-cloud', 'In cloud · Gemini'],
    local: ['badge-none', 'Local code · no model'],
    replay: ['badge-none', REPLAY.kind === 'recorded' ? 'Replay · recorded run' : 'Replay · scripted sample'],
  }
  const [cls, label] = map[source]
  return <span className={`badge ${cls}`}>{label}</span>
}

export default function Checker() {
  const replay = params().has('replay')
  const guardDemo = params().has('guard-demo')
  const [nano, setNano] = useNano()
  const mode: 'replay' | 'setup' | 'live' | 'manual' | 'checking' =
    replay ? 'replay' : !configured ? 'setup' : nano === 'checking' ? 'checking' : ['available', 'downloadable', 'downloading'].includes(nano) ? 'live' : 'manual'

  const [step, setStep] = useState<Step>('start')
  const [image, setImage] = useState<string | null>(null)
  const [readData, setReadData] = useState<BillRead | null>(null)
  const [sealedRes, setSealedRes] = useState<SealResult | null>(null)
  const [readSource, setReadSource] = useState<Source>('on_device')
  const [auditRes, setAuditRes] = useState<AuditResult | null>(null)
  const [auditSource, setAuditSource] = useState<Source>('in_cloud')
  const [entryPoint, setEntryPoint] = useState<string | undefined>()
  const [blocked, setBlocked] = useState<Leak[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [filled, setFilled] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const vaultRef = useRef<SealResult['vault'] | null>(null)

  useEffect(() => {
    if (configured && !replay) {
      installFetchGuard(() => vaultRef.current?.identity ?? {})
      void boot()
    }
  }, [replay])

  const reset = useCallback(() => {
    setStep('start'); setImage(null); setReadData(null); setSealedRes(null); setAuditRes(null)
    setBlocked(null); setError(null); setFilled(false); setOutcome(null); vaultRef.current = null
    ledger.clear()
  }, [])

  const doSeal = useCallback(async (r: BillRead, persist: boolean) => {
    const res = seal(r)
    vaultRef.current = res.vault
    setReadData(r)
    setSealedRes(res)
    ledger.add({ stage: 'seal', direction: 'local', source: 'local', bytes: 0, verdict: 'local', preview: `Sealed ${res.vault.size} identifiers into the vault; ${res.inlineRedactions} found inside line text; ${res.sweepHits.length} caught by the sweep` })
    if (persist) await saveIdentity(r.identity).catch(() => undefined)
    setStep('sealing')
    await wait(400 + res.vault.size * 140)
    setStep('review')
  }, [])

  // ── start: live (Nano) ───────────────────────────────────────────────
  const startLive = async (blob: Blob) => {
    setError(null)
    setImage(URL.createObjectURL(blob))
    setStep('reading')
    try {
      const r = await runRead(blob)
      setReadSource(r.source)
      await doSeal(r.data, true)
    } catch (e) {
      setStep('start')
      setError(e instanceof Error ? `${e.message}. Nothing was sent anywhere.` : 'The on-device read failed. Nothing was sent anywhere.')
    }
  }

  // ── start: replay ────────────────────────────────────────────────────
  const startReplay = async () => {
    setImage(SAMPLE)
    setStep('reading')
    await wait(2400)
    setReadSource('replay')
    ledger.add({ stage: 'read', direction: 'local', source: 'replay', bytes: 218191, verdict: 'local', preview: `Read ${REPLAY.read.lines.length} lines and ${Object.keys(REPLAY.read.identity).length} identifiers (replay of the on-device step)` })
    await doSeal(REPLAY.read, false)
  }

  const useSample = async () => {
    if (replay) return startReplay()
    const blob = await (await fetch(SAMPLE)).blob()
    await startLive(blob)
  }

  const prepare = async () => {
    setProgress(0)
    try {
      await prepareNano((p) => setProgress(p))
      setNano('available' as NanoState)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setProgress(null) }
  }

  // ── the payload that will cross ──────────────────────────────────────
  const payload: SealedBill | null = sealedRes?.sealed ?? null

  const precheck = useMemo(() => {
    if (!payload || !readData) return null
    const body = JSON.stringify(payload)
    return { bytes: body.length, leaks: scan(body, readData.identity) }
  }, [payload, readData])

  // ── audit ────────────────────────────────────────────────────────────
  const sendAudit = async (smuggle: boolean) => {
    if (!sealedRes || !readData) return
    setBlocked(null); setError(null)
    let toSend = sealedRes.sealed
    if (smuggle) {
      // ?guard-demo=1: put the member ID (digits only) into line 7, as a confused model or a bad edit might.
      const digits = (readData.identity.MEMBER_ID ?? '884120937').replace(/\D/g, '')
      toSend = { ...toSend, lines: toSend.lines.map((l, i) => (i === Math.min(6, toSend.lines.length - 1) ? { ...l, description: `${l.description} ref ${digits}` } : l)) }
    }
    if (replay) {
      const body = JSON.stringify(toSend)
      const leaks = scan(body, readData.identity)
      if (leaks.length) {
        ledger.add({ stage: 'audit', direction: 'out', source: 'replay', bytes: body.length, verdict: 'blocked', host: 'generativelanguage.googleapis.com', preview: body.slice(0, 600), leaks })
        setBlocked(leaks)
        return
      }
      setStep('auditing')
      ledger.add({ stage: 'audit', direction: 'out', source: 'replay', bytes: body.length + 2400, verdict: 'passed', host: 'generativelanguage.googleapis.com', preview: body.slice(0, 600) })
      await wait(3200)
      ledger.add({ stage: 'audit', direction: 'in', source: 'replay', bytes: REPLAY.audit.letter.length + 1800, verdict: 'passed', preview: `${REPLAY.audit.findings.length} findings and a letter with placeholders` })
      setAuditRes(REPLAY.audit); setAuditSource('replay'); setStep('results')
      return
    }
    setStep('auditing')
    try {
      const r = await runAudit(toSend)
      setAuditRes(r.data); setAuditSource(r.source); setEntryPoint(r.searchEntryPoint); setStep('results')
    } catch (e) {
      setStep('review')
      if (e instanceof AirlockBreach) setBlocked(e.leaks)
      else setError(e instanceof Error ? e.message : String(e))
    }
  }

  const doForget = async () => { await forget().catch(() => undefined); reset() }
  const total = auditRes?.findings.reduce((a, f) => a + (f.amount || 0), 0) ?? 0

  return (
    <main className="checker wrap">
      <div className="ck-main">
        <div className="ck-top">
          <div>
            <span className="eyebrow">{mode === 'replay' ? 'Sample run' : 'Check a bill'}</span>
            <h1 className="h2 ck-title">{titleFor(step)}</h1>
          </div>
          <div className="ck-top-right">
            {mode === 'replay' ? <span className="badge badge-none">{REPLAY.kind === 'recorded' ? 'Replay of a recorded run' : 'Scripted sample · no model calls'}</span> : <NanoBadge state={nano} />}
            {step !== 'start' && <button className="btn btn-sm" onClick={reset}>Start over</button>}
          </div>
        </div>
        <Stepper step={step} />

        {error && <div className="ck-alert" role="alert">{error}</div>}

        <AnimatePresence mode="wait">
          {/* ── START ─────────────────────────────────── */}
          {step === 'start' && (
            <motion.section key="start" className="ck-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {mode === 'setup' && (
                <div className="ck-note card">
                  <h3 className="h3">This copy of Airlock isn’t connected to Firebase yet</h3>
                  <p>Add the web config to <code>web/.env.local</code> (see the runbook), or watch the sample run, which plays every stage on a fictional bill with no model calls.</p>
                  <a className="btn btn-primary" href="#/app?replay=1" onClick={() => setTimeout(() => location.reload(), 0)}>Watch the sample run</a>
                </div>
              )}
              {mode === 'manual' && (
                <ManualEntry onDone={(r) => { setReadSource('local'); void doSeal(r, true) }} />
              )}
              {(mode === 'live' || mode === 'replay') && (
                <div className="ck-start">
                  <button className="ck-drop card crop" onClick={useSample}>
                    <img src={SAMPLE} alt="Sample itemized ER bill for a fictional patient" />
                    <span className="ck-drop-label"><b>Use the sample bill</b><span>Fictional ER visit · 9 lines · $1,284.00 due</span></span>
                  </button>
                  <label className={`ck-drop ck-upload card ${mode === 'replay' ? 'is-disabled' : ''}`}>
                    <input type="file" accept="image/png,image/jpeg" capture="environment" disabled={mode === 'replay'}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void startLive(f) }} />
                    <span className="ck-upload-icon" aria-hidden="true">+</span>
                    <span className="ck-drop-label"><b>Use my own bill</b><span>{mode === 'replay' ? 'Not available in the sample run' : 'Photo or screenshot, PNG or JPEG. Read on this device only.'}</span></span>
                  </label>
                  {mode === 'live' && nano !== 'available' && (
                    <div className="ck-note card ck-prepare">
                      <div>
                        <h3 className="h3">First, download Gemini Nano to this device</h3>
                        <p>Chrome downloads the on-device model once (it needs a click). After that, reading your bill works offline.</p>
                        {progress !== null && <div className="ck-progress"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
                      </div>
                      <button className="btn btn-primary" onClick={prepare} disabled={progress !== null}>{progress !== null ? `${Math.round(progress * 100)}%` : 'Prepare on-device model'}</button>
                    </div>
                  )}
                </div>
              )}
              {mode === 'checking' && <p>Checking this device…</p>}
            </motion.section>
          )}

          {/* ── READING ───────────────────────────────── */}
          {step === 'reading' && (
            <motion.section key="reading" className="ck-panel ck-reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="ck-scan card">
                {image && <img src={image} alt="Your bill" />}
                <span className="ck-scanline" aria-hidden="true" />
              </div>
              <div className="ck-reading-copy">
                <SourceBadge source={replay ? 'replay' : 'on_device'} />
                <h3 className="h3">Reading your bill on this device</h3>
                <p>Gemini Nano is turning the image into structured data inside Chrome, with <code>InferenceMode.ONLY_ON_DEVICE</code>. If it can’t, Airlock stops. It never falls back to the cloud.</p>
                <div className="ck-thinking" aria-hidden="true" />
              </div>
            </motion.section>
          )}

          {/* ── SEALING / REVIEW ──────────────────────── */}
          {(step === 'sealing' || step === 'review') && sealedRes && readData && (
            <motion.section key="review" className="ck-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="ck-two">
                <div className="card ck-side ck-device">
                  <div className="ck-side-head"><span className="eyebrow">Stays on this device</span><SourceBadge source={readSource} /></div>
                  <ul className="ck-ids">
                    {sealedRes.vault.entries().map(([field, value], i) => (
                      <SealRow key={field} field={field} value={value} delayMs={step === 'review' ? 0 : 250 + i * 140} />
                    ))}
                  </ul>
                  <p className="ck-small">Encrypted in this browser (AES-GCM), deleted after 24 hours or when you press <em>Forget</em>.</p>
                </div>
                <div className="card ck-side ck-cloud">
                  <div className="ck-side-head"><span className="eyebrow">Will cross the wall</span><span className="mono ck-bytes">{precheck ? `${precheck.bytes} bytes` : ''}</span></div>
                  <pre className="mono ck-json">{JSON.stringify(payload, null, 1)}</pre>
                </div>
              </div>

              {step === 'review' && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <LinesTable key={JSON.stringify(readData.lines)} read={readData} onChange={(r) => { void doSeal(r, mode !== 'replay') }} />
                  <div className={`ck-guard card ${blocked ? 'is-blocked' : ''}`}>
                    {blocked ? (
                      <>
                        <span className="badge badge-blocked">Blocked by the guard</span>
                        <div className="ck-guard-text">
                          <b>The request was refused before it left this device.</b>
                          <ul className="mono">{blocked.map((l, i) => <li key={i}>{l.field} found ({l.kind}) · {l.variant}</li>)}</ul>
                          <span>The sealed bill above is clean; the smuggled copy was not.</span>
                        </div>
                        <button className="btn btn-primary" onClick={() => void sendAudit(false)}>Send the clean version</button>
                      </>
                    ) : (
                      <>
                        <span className={`badge ${precheck?.leaks.length ? 'badge-blocked' : 'badge-cloud'}`}>{precheck?.leaks.length ? 'Leak found' : 'Guard: clear'}</span>
                        <div className="ck-guard-text">
                          <b>{precheck?.leaks.length ? `${precheck.leaks.length} identifiers found. Fix the lines above.` : `0 identifiers in ${precheck?.bytes ?? 0} bytes.`}</b>
                          <span>Only codes, amounts, day offsets, plan type and state will be sent to Gemini for the audit.</span>
                        </div>
                        <div className="ck-guard-actions">
                          {guardDemo && <button className="btn" onClick={() => void sendAudit(true)}>Try to smuggle the member ID</button>}
                          <button className="btn btn-primary" disabled={!!precheck?.leaks.length} onClick={() => void sendAudit(false)}>Send for audit</button>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.section>
          )}

          {/* ── AUDITING ──────────────────────────────── */}
          {step === 'auditing' && (
            <motion.section key="auditing" className="ck-panel ck-auditing card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SourceBadge source={replay ? 'replay' : 'in_cloud'} />
              <h3 className="h3">Auditing {sealedRes?.sealed.lines.length} anonymous lines</h3>
              <p>Gemini is checking for duplicates, unbundling, upcoding and surprise-billing protections, using Google Search for current rules, and drafting the letter with placeholders.</p>
              <div className="ck-thinking" aria-hidden="true" />
            </motion.section>
          )}

          {/* ── RESULTS ───────────────────────────────── */}
          {step === 'results' && auditRes && (
            <motion.section key="results" className="ck-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="ck-summary card">
                <div>
                  <span className="eyebrow">Findings</span>
                  <p className="lead">{auditRes.summary}</p>
                </div>
                <div className="ck-total">
                  <span className="mono ck-total-n">{usd(total)}</span>
                  <span>in question across {auditRes.findings.length} findings</span>
                  <SourceBadge source={auditSource} />
                </div>
              </div>
              <div className="ck-findings">
                {auditRes.findings.map((f, i) => <FindingCard key={f.id} f={f} i={i} replay={replay} />)}
              </div>
              {(auditRes.sources.length > 0 || entryPoint) && (
                <div className="ck-sources">
                  <span className="eyebrow">Grounding sources</span>
                  <ul>{auditRes.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></li>)}</ul>
                  {entryPoint && <iframe className="ck-entry" title="Google Search suggestions" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={entryPoint} />}
                </div>
              )}

              <div className="ck-letter">
                <div className="ck-letter-head">
                  <div>
                    <span className="eyebrow">Your letter</span>
                    <h3 className="h3">{filled ? 'Filled in on this device' : 'Drafted in the cloud, with placeholders'}</h3>
                  </div>
                  <div className="ck-letter-actions">
                    {!filled ? (
                      <button className="btn btn-primary" onClick={() => { setFilled(true); ledger.add({ stage: 'write', direction: 'local', source: 'local', bytes: 0, verdict: 'local', preview: `Filled ${sealedRes?.vault.size ?? 0} placeholders from the vault, on this device` }) }}>
                        Fill in my details here
                      </button>
                    ) : (
                      <>
                        <button className="btn" onClick={() => window.print()}>Print</button>
                        <button className="btn" onClick={() => void navigator.clipboard.writeText(sealedRes!.vault.rehydrate(auditRes.letter))}>Copy</button>
                      </>
                    )}
                  </div>
                </div>
                <LetterView text={auditRes.letter} vault={sealedRes?.vault ?? null} filled={filled} />
              </div>

              <div className="ck-outcome card">
                <div>
                  <h3 className="h3">Sent it? Tell us how it went</h3>
                  <p className="ck-small">Adds one to an anonymous counter per finding type ({[...new Set(auditRes.findings.map((f) => f.kind))].join(', ')}). No name, amount or text is stored.</p>
                </div>
                <div className="ck-outcome-btns">
                  {(['disputed', 'won', 'lost'] as Outcome[]).map((o) => (
                    <button key={o} className={`btn btn-sm ${outcome === o ? 'btn-primary' : ''}`} disabled={replay || outcome !== null}
                      onClick={async () => { setOutcome(o); await Promise.all([...new Set(auditRes.findings.map((f) => f.kind))].map((k) => reportOutcome(k, o))).catch(() => undefined) }}>
                      {o === 'disputed' ? 'I sent it' : o === 'won' ? 'Bill reduced' : 'Not reduced'}
                    </button>
                  ))}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
      <Boundary sealedCount={sealedRes?.vault.size ?? 0} onForget={replay ? undefined : doForget} />
    </main>
  )
}

function SealRow({ field, value, delayMs }: { field: string; value: string; delayMs: number }) {
  const [sealed, setSealed] = useState(delayMs === 0)
  useEffect(() => {
    if (delayMs === 0) return
    const t = setTimeout(() => setSealed(true), delayMs)
    return () => clearTimeout(t)
  }, [delayMs])
  return (
    <li>
      <span className="mono ck-key">{field.toLowerCase().replace(/_/g, ' ')}</span>
      <AnimatePresence mode="wait" initial={false}>
        {sealed || delayMs === 0 ? (
          <motion.span key="t" className="token" initial={{ opacity: 0, scale: .85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .28 }}>
            <Lock />⟦{field}⟧
          </motion.span>
        ) : (
          <motion.span key="v" className="ck-val" exit={{ opacity: 0, x: -6 }} transition={{ duration: .18 }}>{value}</motion.span>
        )}
      </AnimatePresence>
    </li>
  )
}

function titleFor(step: Step) {
  return {
    start: 'Which bill?',
    reading: 'Reading, on this device',
    sealing: 'Sealing who you are',
    review: 'Check what will cross',
    auditing: 'Auditing the charges',
    results: 'What we found',
  }[step]
}

const STEPS: [Step[], string][] = [[['start'], 'Bill'], [['reading'], 'Read'], [['sealing'], 'Seal'], [['review'], 'Guard'], [['auditing'], 'Audit'], [['results'], 'Letter']]
function Stepper({ step }: { step: Step }) {
  const idx = STEPS.findIndex(([s]) => s.includes(step))
  return (
    <ol className="stepper mono" aria-label="Progress">
      {STEPS.map(([, label], i) => (
        <li key={label} className={i < idx ? 'done' : i === idx ? 'now' : ''} aria-current={i === idx ? 'step' : undefined}>
          <span>{String(i + 1).padStart(2, '0')}</span>{label}
        </li>
      ))}
    </ol>
  )
}

function LinesTable({ read, onChange }: { read: BillRead; onChange: (r: BillRead) => void }) {
  const [draft, setDraft] = useState(read.lines)
  const dirty = JSON.stringify(draft) !== JSON.stringify(read.lines)
  const set = (i: number, k: 'code' | 'description' | 'charge', v: string) =>
    setDraft((d) => d.map((l, j) => (j === i ? { ...l, [k]: k === 'charge' ? parseFloat(v) || 0 : v } : l)))
  return (
    <details className="ck-lines card">
      <summary><span className="eyebrow">Line items as read ({read.lines.length})</span><span className="ck-small">Misread something? Fix it here; it is re-sealed and re-checked.</span></summary>
      <table>
        <thead><tr><th>#</th><th>Code</th><th>Description</th><th className="num">Charge</th></tr></thead>
        <tbody>
          {draft.map((l, i) => (
            <tr key={i}>
              <td className="mono">{l.line}</td>
              <td><input className="mono" value={l.code ?? ''} onChange={(e) => set(i, 'code', e.target.value)} aria-label={`Line ${l.line} code`} /></td>
              <td><input value={l.description} onChange={(e) => set(i, 'description', e.target.value)} aria-label={`Line ${l.line} description`} /></td>
              <td className="num"><input className="mono" value={l.charge} onChange={(e) => set(i, 'charge', e.target.value)} aria-label={`Line ${l.line} charge`} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {dirty && <button className="btn btn-sm" onClick={() => onChange({ ...read, lines: draft })}>Re-seal with my corrections</button>}
    </details>
  )
}

function FindingCard({ f, i, replay }: { f: Finding; i: number; replay: boolean }) {
  const [exp, setExp] = useState<{ text: string; source: Source } | null>(null)
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    try {
      if (replay) {
        await wait(900)
        setExp({ text: REPLAY.explain[f.id] ?? f.rationale, source: 'replay' })
      } else {
        const r = await runExplain(f)
        setExp({ text: r.data, source: r.source })
      }
    } catch (e) {
      setExp({ text: e instanceof Error ? e.message : String(e), source: 'local' })
    } finally { setBusy(false) }
  }
  return (
    <motion.article className={`finding card conf-${f.confidence}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .1 + i * .12 }}>
      <div className="finding-top">
        <span className="mono finding-kind">{f.kind.replace('_', ' ')} · line{f.lines.length > 1 ? 's' : ''} {f.lines.join(', ')}</span>
        <span className="mono finding-amt">{f.amount ? `−${usd(f.amount)}` : 'ask'}</span>
      </div>
      <h3 className="h3">{f.title}</h3>
      <p>{f.rationale}</p>
      <div className="finding-rule">
        <span className="mono">Rule</span>
        {f.rule.url ? <a href={f.rule.url} target="_blank" rel="noreferrer">{f.rule.name}</a> : <span>{f.rule.name}</span>}
        <span className={`conf mono`}>{f.confidence} confidence</span>
      </div>
      {exp ? (
        <div className="finding-explain"><SourceBadge source={exp.source} /><p>{exp.text}</p></div>
      ) : (
        <button className="btn btn-sm" onClick={go} disabled={busy}>{busy ? 'Explaining…' : 'Explain in plain words'}</button>
      )}
    </motion.article>
  )
}
