import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

/**
 * The boundary, animated: identity on the left turns into tokens and stays;
 * line items cross to the cloud; the audit comes back. Loops every ~9 s.
 */
const IDENTITY = [
  ['PATIENT_NAME', 'Maya R. Ellison'],
  ['DOB', '04/17/1991'],
  ['MEMBER_ID', 'XGH884120937'],
  ['ADDRESS', '2148 Oakridge Ave, OH'],
] as const
const LINES = [
  ['99285', 'ED visit, level 5', '1,890.00'],
  ['73110', 'X-ray wrist, 3+ views', '212.00'],
  ['73110', 'X-ray wrist, 3+ views', '212.00'],
  ['36415', 'Routine venipuncture', '48.00'],
] as const

const STEPS = 7 // 0 idle · 1-4 sealing one field at a time · 5 crossing · 6 audit back
export function Wall() {
  const reduce = useReducedMotion()
  const [t, setT] = useState(reduce ? 6 : 0)
  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setT((x) => (x + 1) % (STEPS + 2)), 1100)
    return () => clearInterval(id)
  }, [reduce])
  const sealed = Math.min(t, 4)
  const crossed = t >= 5
  const audited = t >= 6

  return (
    <div className="wall" role="img" aria-label="Diagram: identity is sealed into tokens on the device; only codes and amounts cross to the cloud; findings come back.">
      <div className="wall-side wall-device">
        <div className="wall-head"><span className="badge badge-device">On this device · Gemini Nano</span></div>
        <div className="wall-label mono">identity → vault</div>
        <ul className="wall-ids">
          {IDENTITY.map(([field, value], i) => (
            <li key={field}>
              <span className="mono wall-key">{field.toLowerCase().replace('_', ' ')}</span>
              <AnimatePresence mode="wait" initial={false}>
                {i < sealed ? (
                  <motion.span key="tok" className="token" initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .28 }}>
                    <Lock />⟦{field}⟧
                  </motion.span>
                ) : (
                  <motion.span key="val" className="wall-val" exit={{ opacity: 0, x: -6, textDecoration: 'line-through' }} transition={{ duration: .2 }}>{value}</motion.span>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
        <div className="wall-label mono">line items</div>
        <ul className="wall-lines">
          {LINES.map(([code, desc, amt], i) => (
            <motion.li key={i} animate={{ opacity: crossed ? .35 : 1 }} transition={{ delay: i * .08 }}>
              <span className="mono">{code}</span><span>{desc}</span><span className="mono">{amt}</span>
            </motion.li>
          ))}
        </ul>
      </div>

      <div className="wall-rule" aria-hidden="true">
        <span className="mono">┤ WALL ├</span>
        {LINES.map((_, i) => (
          <motion.span key={i} className="wall-packet" initial={false}
            animate={crossed ? { x: ['-40%', '140%'], opacity: [0, 1, 0] } : { x: '-40%', opacity: 0 }}
            transition={{ duration: .9, delay: i * .12, ease: [.2, .7, .2, 1] }}
            style={{ top: `${42 + i * 9}%` }} />
        ))}
        <motion.span className="wall-bounce token" initial={false}
          animate={t === 5 ? { x: [-30, -6, -30], opacity: [0, 1, 0] } : { opacity: 0 }}
          transition={{ duration: .9 }}>
          <Lock />⟦NAME⟧
        </motion.span>
      </div>

      <div className="wall-side wall-cloud">
        <div className="wall-head"><span className="badge badge-cloud">In the cloud · Gemini</span></div>
        <pre className="wall-json mono">
          {crossed ? (
            <motion.code initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .4 }}>
{`{ "lines": [
  { "code": "99285", "day": 0, "charge": 1890 },
  { "code": "73110", "day": 0, "charge": 212 },
  { "code": "73110", "day": 0, "charge": 212 },
  { "code": "36415", "day": 1, "charge": 48 }
], "state": "OH", "plan": "PPO" }`}
            </motion.code>
          ) : <span className="wall-wait">waiting for sealed line items…</span>}
        </pre>
        <AnimatePresence>
          {audited && (
            <motion.div className="wall-finding" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .4 }}>
              <span className="mono wall-amt">−$212.00</span>
              <span>Same wrist X-ray billed twice · lines 2–3</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="wall-foot mono">Never sees: name · birthday · member ID · address · diagnosis</div>
      </div>
    </div>
  )
}

export function Lock() {
  return (
    <svg width="10" height="11" viewBox="0 0 10 11" aria-hidden="true" style={{ display: 'inline' }}>
      <rect x="1" y="4.5" width="8" height="6" rx="1.2" fill="currentColor" />
      <path d="M3 4.5V3a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
    </svg>
  )
}
