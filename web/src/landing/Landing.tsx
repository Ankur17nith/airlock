import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Wall, Lock } from './Wall'

const rise = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: .42, ease: [.2, .7, .2, 1] as const },
}

function Spark() {
  return (
    <svg className="spark" width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
      {[[27, 4, 27, 16], [8, 12, 16, 19], [46, 12, 38, 19], [4, 30, 15, 30], [50, 30, 39, 30], [44, 46, 37, 39]].map(([a, b, c, d], i) => (
        <line key={i} x1={a} y1={b} x2={c} y2={d} stroke="var(--coral)" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="3 3" />
      ))}
    </svg>
  )
}

function Chip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <span className="chip"><span className="chip-icon">{icon}</span>{children}</span>
}

const I = {
  read: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="var(--coral)" strokeWidth="1.4"><rect x="3" y="1.5" width="10" height="13" rx="1.5" /><path d="M5.5 5h5M5.5 8h5M5.5 11h3" /></svg>,
  seal: <span style={{ color: 'var(--coral)' }}><Lock /></span>,
  audit: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="var(--teal)" strokeWidth="1.4"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3.5 3.5" /></svg>,
}

const STEPS = [
  { n: '01', mode: 'ONLY_ON_DEVICE', where: 'device', title: 'Read', body: 'Gemini Nano reads the photo of your bill into structured JSON, right in Chrome. This mode cannot fall back to the cloud: if Nano is missing, Airlock stops and asks you instead.' },
  { n: '02', mode: 'no model', where: 'device', title: 'Seal', body: 'Your name, birthday, member ID, address, provider and diagnosis go into an encrypted vault on this device and are replaced by tokens. Dates become day offsets.' },
  { n: '03', mode: 'guard', where: 'wall', title: 'Guard', body: 'Before any byte leaves, plain code (not a prompt) scans the exact request for every sealed value written any way at all. One hit and the request is refused.' },
  { n: '04', mode: 'ONLY_IN_CLOUD', where: 'cloud', title: 'Audit', body: 'Gemini checks the anonymous charges for duplicates, unbundling, upcoding and surprise-billing protections, grounded in Google Search, and cites the rule behind each finding.' },
  { n: '05', mode: 'no model', where: 'device', title: 'Write', body: 'The cloud drafts the dispute letter with placeholders. Your real details are filled back in on your device. The finished letter never leaves it.' },
  { n: '06', mode: 'PREFER_ON_DEVICE', where: 'hybrid', title: 'Explain', body: 'Ask what any finding means in plain words. It runs on-device and offline when it can, in the cloud when it can’t — safe, because it carries no identity.' },
]

const FAQ = [
  ['Does my bill get uploaded anywhere?', 'The image never leaves your device. Gemini Nano reads it inside Chrome. What crosses to the cloud is a list of billing codes, amounts and day offsets, after the guard has checked it. You can watch every crossing in the boundary panel and export it.'],
  ['What if my computer doesn’t have Gemini Nano?', 'Airlock does not quietly fall back to the cloud, because that is exactly how private data leaks. You can type the line items yourself (your details stay in the vault), or watch a sample run.'],
  ['Is this legal advice?', 'No. Findings are questions to put to your billing office, each with the rule it relies on and a link. Disputing a bill is your right; Airlock does the reading and the writing.'],
  ['Why a guard if the model already removes my name?', 'Models are good at finding identifiers and unreliable as the last barrier. The guard is deterministic code with tests, and it wraps the network call itself, so nothing can route around it.'],
  ['What does Airlock store?', 'Your vault stays encrypted on your device for 24 hours so you can come back to your letter, then it is deleted. If you report an outcome, Firestore adds one to an anonymous counter (finding type × won/lost). No name, amount or text.'],
]

export function Landing() {
  return (
    <main>
      {/* ── hero ─────────────────────────────────────── */}
      <section className="hero">
        <motion.h1 className="display hero-title" {...rise}>
          Fight the bill,<br />
          <span className="accent">not your privacy</span>
          <Spark />
        </motion.h1>
        <motion.p className="hero-sub lead" {...rise} transition={{ ...rise.transition, delay: .08 }}>
          <Chip icon={I.read}>Read</Chip> your medical bill on your own device,{' '}
          <Chip icon={I.seal}>seal</Chip> who you are, and{' '}
          <Chip icon={I.audit}>audit</Chip> the charges in the cloud.
        </motion.p>
        <motion.div className="hero-cta" {...rise} transition={{ ...rise.transition, delay: .16 }}>
          <a className="btn btn-primary" href="#/app">Check a bill</a>
          <a className="btn" href="#/app?replay=1">Watch a sample run</a>
        </motion.div>
        <div className="built-on">
          <span className="eyebrow">Built on</span>
          <ul className="mono">
            <li>Firebase AI Logic</li><li>Gemini Nano</li><li>Gemini</li><li>App Check</li><li>Remote Config</li><li>Firestore</li><li>Auth</li><li>Hosting</li>
          </ul>
        </div>
      </section>

      {/* ── the wall ─────────────────────────────────── */}
      <section className="section" id="wall">
        <div className="wrap">
          <motion.div className="sec-head" {...rise}>
            <span className="eyebrow">The wall</span>
            <h2 className="h2">The model that knows your name<br /><span className="accent">never meets</span> the model that knows billing.</h2>
            <p className="lead">On-device Gemini Nano holds your identity. Cloud Gemini holds the expertise. Between them is a wall written in code, and you can watch everything that crosses it.</p>
          </motion.div>
          <motion.div {...rise} className="crop"><Wall /></motion.div>
        </div>
      </section>

      {/* ── numbers ──────────────────────────────────── */}
      <section className="numbers">
        <div className="wrap">
          <span className="eyebrow eyebrow-dark">Why it matters</span>
          <div className="num-grid">
            {[
              ['43%', 'of US adults have received a medical bill they believed was wrong', 'KFF Health Care Debt Survey'],
              ['< ½', 'of insured adults with a surprise bill ever challenge it, mostly because they didn’t know they could', 'Commonwealth Fund, 2024'],
              ['38%', 'of people who dispute get the bill reduced or cancelled', 'Commonwealth Fund, 2024'],
            ].map(([n, t, s], i) => (
              <motion.div key={n} className="num" {...rise} transition={{ ...rise.transition, delay: i * .08 }}>
                <div className={`num-big ${i === 2 ? 'num-teal' : i === 0 ? 'num-coral' : ''}`}>{n}</div>
                <p>{t}</p>
                <span className="mono">{s}</span>
              </motion.div>
            ))}
          </div>
          <p className="num-gap">The missing step is a letter. Today, getting an AI to write it means handing over your name, birthday, insurance ID and diagnosis. <em>Airlock is the version where you don’t.</em></p>
        </div>
      </section>

      {/* ── how it works ─────────────────────────────── */}
      <section className="section" id="how">
        <div className="wrap">
          <motion.div className="sec-head" {...rise}>
            <span className="eyebrow">How it works</span>
            <h2 className="h2">Six steps. <span className="accent">Three inference modes,</span> each chosen on purpose.</h2>
          </motion.div>
          <div className="steps">
            {STEPS.map((s, i) => (
              <motion.article key={s.n} className={`step card step-${s.where}`} {...rise} transition={{ ...rise.transition, delay: (i % 3) * .06 }}>
                <div className="step-top">
                  <span className="mono step-n">{s.n}</span>
                  <span className={`badge ${s.where === 'device' ? 'badge-device' : s.where === 'cloud' ? 'badge-cloud' : 'badge-none'}`}>{s.mode}</span>
                </div>
                <h3 className="h3">{s.title}</h3>
                <p>{s.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ── the guard ────────────────────────────────── */}
      <section className="section" id="privacy">
        <div className="wrap split">
          <motion.div {...rise}>
            <span className="eyebrow">The guard</span>
            <h2 className="h2">Hide an ID in a description.<br /><span className="accent">It still won’t cross.</span></h2>
            <p className="lead">The guard checks the exact outgoing request for every sealed value: upper case, reordered, digits only, the last six digits, a birthday written fourteen ways. It wraps the network call itself, so nothing can route around it.</p>
            <ul className="ticks">
              <li><b>The image never leaves.</b> Reading uses <code>ONLY_ON_DEVICE</code>; there is no silent cloud fallback.</li>
              <li><b>Dates become offsets.</b> <span className="mono">day 0</span>, <span className="mono">day 1</span>, never a calendar date.</li>
              <li><b>You can check.</b> Every crossing is listed in the boundary panel and can be exported as JSON.</li>
            </ul>
          </motion.div>
          <motion.div className="card guard-demo" {...rise} transition={{ ...rise.transition, delay: .1 }}>
            <div className="guard-row"><span className="mono">POST</span><span className="mono guard-host">generativelanguage.googleapis.com</span></div>
            <pre className="mono">{`{ "line": 7, "code": "96372",
  "description": "Therapeutic injection, IM
                  ref `}<mark>884120937</mark>{`" }`}</pre>
            <div className="guard-verdict">
              <span className="badge badge-blocked">Blocked</span>
              <span>MEMBER_ID found as digits in line 7 · <span className="mono">88•••••37</span></span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────── */}
      <section className="section">
        <div className="wrap faq-wrap">
          <div className="sec-head"><span className="eyebrow">Questions</span><h2 className="h2">Plainly answered</h2></div>
          <div className="faq">
            {FAQ.map(([q, a]) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </div>
      </section>

      {/* ── final CTA ────────────────────────────────── */}
      <section className="section final">
        <div className="wrap" style={{ textAlign: 'center' }}>
          <h2 className="display final-title">Your bill. <span className="accent">Your device.</span></h2>
          <p className="lead">Free, open source, and nothing to sign up for.</p>
          <div className="hero-cta"><a className="btn btn-primary" href="#/app">Check a bill</a><a className="btn" href="https://github.com/Ankur17nith/airlock">Read the code</a></div>
        </div>
      </section>
    </main>
  )
}
