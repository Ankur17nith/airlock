import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ledger } from '../airlock/ledger'
import type { LedgerEntry } from '../airlock/types'

const SOURCE_LABEL: Record<LedgerEntry['source'], string> = {
  on_device: 'On device', in_cloud: 'In cloud', local: 'Local code', replay: 'Replay',
}

export function useLedger() {
  const [entries, setEntries] = useState(ledger.all())
  useEffect(() => ledger.subscribe(setEntries), [])
  return entries
}

const fmtBytes = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`)
const fmtTime = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export function Boundary({ sealedCount, onForget }: { sealedCount: number; onForget?: () => void }) {
  const entries = useLedger()
  const [open, setOpen] = useState<number | null>(null)
  const out = entries.filter((e) => e.direction === 'out' && e.verdict === 'passed').reduce((a, e) => a + e.bytes, 0)
  const blocked = entries.filter((e) => e.verdict === 'blocked').length

  const download = () => {
    const url = URL.createObjectURL(new Blob([ledger.export()], { type: 'application/json' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'airlock-boundary-ledger.json' })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <aside className="boundary card" aria-label="Boundary ledger: everything that crossed to the cloud">
      <div className="bd-head">
        <span className="eyebrow">Boundary</span>
        <button className="btn btn-sm" onClick={download} disabled={!entries.length}>Export</button>
      </div>
      <div className="bd-stats">
        <div><span className="mono bd-num">{sealedCount}</span><span>sealed values<br />on this device</span></div>
        <div><span className="mono bd-num bd-teal">{fmtBytes(out)}</span><span>sent to the cloud<br />after the guard</span></div>
        <div><span className={`mono bd-num ${blocked ? 'bd-coral' : ''}`}>{blocked}</span><span>requests<br />blocked</span></div>
      </div>
      <ol className="bd-list">
        {!entries.length && <li className="bd-empty">Nothing has happened yet. Every read, crossing and block will be listed here.</li>}
        <AnimatePresence initial={false}>
          {[...entries].reverse().map((e) => (
            <motion.li key={e.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className={`bd-item bd-${e.verdict}`}>
              <button className="bd-row" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id}>
                <span className="bd-dir mono">{e.direction === 'local' ? '●' : e.direction === 'out' ? '→' : '←'}</span>
                <span className="bd-stage">{e.stage}</span>
                <span className={`badge ${e.verdict === 'blocked' ? 'badge-blocked' : e.source === 'in_cloud' ? 'badge-cloud' : e.source === 'on_device' ? 'badge-device' : 'badge-none'}`}>
                  {e.verdict === 'blocked' ? 'Blocked' : SOURCE_LABEL[e.source]}
                </span>
                <span className="bd-meta mono">{e.bytes ? fmtBytes(e.bytes) : ''} {fmtTime(e.at)}</span>
              </button>
              {open === e.id && (
                <div className="bd-detail">
                  {e.host && <div className="mono bd-host">{e.host}</div>}
                  <p>{e.preview.length > 400 ? `${e.preview.slice(0, 400)}…` : e.preview}</p>
                  {e.leaks?.map((l, i) => <div key={i} className="mono bd-leak">{l.field} · {l.kind} · {l.variant}</div>)}
                </div>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      {onForget && sealedCount > 0 && <button className="bd-forget" onClick={onForget}>Forget this bill on this device</button>}
    </aside>
  )
}
