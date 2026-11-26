import { useState } from 'react'
import type { BillRead, Identity, LineItem } from '../airlock/types'

/**
 * For devices without Gemini Nano. Airlock refuses to send a bill image to
 * the cloud, so here the person types the lines. Their details go only into
 * the local vault (used to fill in the letter and to arm the guard).
 */
const ID_FIELDS: [keyof Identity, string, string][] = [
  ['PATIENT_NAME', 'Your name', 'as printed on the bill'],
  ['ACCOUNT_NUMBER', 'Account number', ''],
  ['MEMBER_ID', 'Member ID', 'from your insurance card'],
  ['DOB', 'Date of birth', 'MM/DD/YYYY'],
  ['ADDRESS', 'Mailing address', 'one line'],
  ['FACILITY_NAME', 'Hospital or practice', ''],
]

export function ManualEntry({ onDone }: { onDone: (r: BillRead) => void }) {
  const [identity, setIdentity] = useState<Identity>({})
  const [lines, setLines] = useState<LineItem[]>([{ line: 1, code: '', description: '', charge: 0 }])
  const ok = lines.some((l) => l.description && l.charge > 0)
  const set = (i: number, k: keyof LineItem, v: string) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: k === 'charge' ? parseFloat(v) || 0 : v } : l)))

  return (
    <div className="manual">
      <div className="ck-note card">
        <h3 className="h3">This browser has no on-device model, so Airlock won’t read the image</h3>
        <p>Sending a photo of your bill to the cloud is exactly what Airlock exists to avoid. Type the lines instead (codes and amounts are enough), or open Airlock in desktop Chrome with Gemini Nano. Or <a href="#/app?replay=1" onClick={() => setTimeout(() => location.reload(), 0)}>watch the sample run</a>.</p>
      </div>
      <div className="manual-grid">
        <fieldset className="card manual-id">
          <legend className="eyebrow">Stays on this device</legend>
          {ID_FIELDS.map(([k, label, hint]) => (
            <label key={k}>
              <span>{label} <em>{hint}</em></span>
              <input value={identity[k] ?? ''} onChange={(e) => setIdentity({ ...identity, [k]: e.target.value })} autoComplete="off" />
            </label>
          ))}
          <p className="ck-small">Used to fill in your letter and to arm the guard. Never sent.</p>
        </fieldset>
        <fieldset className="card manual-lines">
          <legend className="eyebrow">Line items</legend>
          <table>
            <thead><tr><th>Code</th><th>Description</th><th className="num">Charge</th></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td><input className="mono" placeholder="99285" value={l.code} onChange={(e) => set(i, 'code', e.target.value)} aria-label="Code" /></td>
                  <td><input placeholder="ED visit, level 5" value={l.description} onChange={(e) => set(i, 'description', e.target.value)} aria-label="Description" /></td>
                  <td className="num"><input className="mono" placeholder="0.00" value={l.charge || ''} onChange={(e) => set(i, 'charge', e.target.value)} aria-label="Charge" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn btn-sm" onClick={() => setLines([...lines, { line: lines.length + 1, code: '', description: '', charge: 0 }])}>Add a line</button>
        </fieldset>
      </div>
      <button className="btn btn-primary" disabled={!ok} onClick={() => onDone({
        documentType: 'itemized_bill', identity, lines: lines.filter((l) => l.description || l.charge),
        totals: { charges: lines.reduce((a, l) => a + l.charge, 0) },
      })}>Seal and review</button>
    </div>
  )
}
