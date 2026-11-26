import { useEffect, useState } from 'react'
import { nanoState, type NanoState } from '../ai/stages'

export function Mark({ size = 28 }: { size?: number }) {
  const s = 120, r = s * 0.24, cx = s / 2, cy = s / 2, w = s * 0.075, sw = s * 0.06
  return (
    <svg width={size} height={size} viewBox={`0 0 ${s} ${s}`} aria-hidden="true">
      <rect width={s} height={s} rx={s * 0.22} fill="var(--ink)" />
      <path d={`M${cx - w / 2} ${cy - r} A${r} ${r} 0 0 0 ${cx - w / 2} ${cy + r} Z`} fill="var(--coral)" />
      <path d={`M${cx + w / 2} ${cy - r + sw / 2} A${r - sw / 2} ${r - sw / 2} 0 0 1 ${cx + w / 2} ${cy + r - sw / 2}`} fill="none" stroke="var(--paper)" strokeWidth={sw} strokeDasharray={`${s * 0.07} ${s * 0.045}`} />
      <rect x={cx - w / 2} y={s * 0.17} width={w} height={s * 0.66} rx={w / 2} fill="var(--paper)" />
    </svg>
  )
}

export function Wordmark() {
  return (
    <a href="#/" className="wordmark" aria-label="Airlock home">
      <Mark size={26} />
      <span>AIRLOCK</span>
    </a>
  )
}

export function useNano() {
  const [state, setState] = useState<NanoState | 'checking'>('checking')
  useEffect(() => { nanoState().then(setState) }, [])
  return [state, setState] as const
}

const NANO_LABEL: Record<NanoState | 'checking', string> = {
  checking: 'Checking device…',
  unsupported: 'No on-device model',
  unavailable: 'No on-device model',
  downloadable: 'Nano ready to download',
  downloading: 'Nano downloading',
  available: 'Gemini Nano ready',
}

export function NanoBadge({ state }: { state: NanoState | 'checking' }) {
  const cls = state === 'available' ? 'badge-device' : state === 'downloadable' || state === 'downloading' ? 'badge-none' : 'badge-none'
  return <span className={`badge ${cls}`} title="Chrome's built-in Gemini Nano (Prompt API)">{state === 'available' ? 'On device · ' : ''}{NANO_LABEL[state]}</span>
}

type Theme = 'auto' | 'light' | 'dark'
function readTheme(): Theme {
  try { const t = localStorage.getItem('airlock-theme'); return t === 'light' || t === 'dark' ? t : 'auto' } catch { return 'auto' }
}
function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const choose = (t: Theme) => {
    setTheme(t)
    if (t === 'auto') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = t
    try { if (t === 'auto') localStorage.removeItem('airlock-theme'); else localStorage.setItem('airlock-theme', t) } catch { /* private mode */ }
  }
  const opts: [Theme, string, string][] = [
    ['light', 'Light', 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z'],
    ['auto', 'Match system', 'M12 21a9 9 0 1 0 0-18v18z'],
    ['dark', 'Dark', 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z'],
  ]
  return (
    <div className="theme-switch" role="radiogroup" aria-label="Colour theme">
      {opts.map(([t, label, d]) => (
        <button key={t} role="radio" aria-checked={theme === t} aria-label={label} title={label} className={theme === t ? 'on' : ''} onClick={() => choose(t)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={t === 'auto' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {t === 'auto' && <circle cx="12" cy="12" r="9" fill="none" />}<path d={d} />
          </svg>
        </button>
      ))}
    </div>
  )
}

export function Header({ route }: { route: string }) {
  const [nano] = useNano()
  return (
    <>
      <div className="announce mono">
        <span aria-hidden="true">↗</span> Built for #BuildHybridAI 2026 — one Firebase AI Logic SDK, Gemini Nano on your device, Gemini in the cloud
      </div>
      <header className="nav">
        <nav className="nav-side nav-left" aria-label="Sections">
          <a href="#/#how">How it works</a>
          <a href="#/#wall">The wall</a>
          <a href="#/#privacy">Privacy</a>
        </nav>
        <Wordmark />
        <nav className="nav-side nav-right" aria-label="Actions">
          <span className="hide-sm"><NanoBadge state={nano} /></span>
          <ThemeSwitch />
          <a href="https://github.com/Ankur17nith/airlock" className="hide-sm">GitHub</a>
          {route !== 'app' && <a className="btn btn-primary btn-sm" href="#/app">Check a bill</a>}
        </nav>
      </header>
    </>
  )
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-in">
        <div>
          <Wordmark />
          <p className="footer-note">Fight the bill, not your privacy. Open source under Apache-2.0. Not legal or medical advice; findings are questions to put to your billing office.</p>
        </div>
        <div className="footer-cols mono">
          <div><b>Product</b><a href="#/app">Check a bill</a><a href="#/app?replay=1">Watch a sample run</a><a href="#/#privacy">Privacy model</a></div>
          <div><b>Built on</b><span>Firebase AI Logic</span><span>Gemini Nano · Gemini</span><span>App Check · Remote Config · Firestore</span></div>
          <div><b>Source</b><a href="https://github.com/Ankur17nith/airlock">GitHub</a><a href="https://github.com/Ankur17nith/airlock/blob/main/docs/architecture.md">Architecture</a><a href="https://github.com/Ankur17nith/airlock/blob/main/docs/business-case.md">Sources for every number</a></div>
        </div>
      </div>
    </footer>
  )
}
