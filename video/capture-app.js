// Screen-record the real Airlock app, in real time, through Chrome's own
// screencast (CDP Page.startScreencast). A scripted "user" moves a visible
// cursor, clicks and scrolls on a schedule planned against the voiceover.
// Frames are saved with their timestamps; video/build.py turns them into a
// constant-frame-rate clip.
//
//   node video/capture-app.js http://localhost:4173 video/work/app
const { chromium } = require('playwright')
const fs = require('fs')

const BASE = process.argv[2] || 'http://localhost:4173'
const OUT = process.argv[3] || 'video/work/app'

// Planned in FILM seconds (video/timeline.json) so one continuous take covers
// scenes 6-9 with no cuts: recording time = film time - FILM_OFFSET.
const FILM_OFFSET = 61.5
const FILM = [
  { t: 61.5, do: 'goto', url: '/#/app?replay=1&guard-demo=1' },
  { t: 62.3, do: 'move', sel: '.ck-drop >> nth=0', dur: 0.8 },
  { t: 63.3, do: 'click', sel: '.ck-drop >> nth=0' },       // VO06 "Watch. Nano reads the photo…"
  { t: 72.5, do: 'scroll', to: '.ck-lines', dur: 1.6, offset: -380 },
  { t: 82.2, do: 'scroll', to: '.ck-guard', dur: 1.2, offset: -330 }, // VO07 "a guard… checks it"
  { t: 87.8, do: 'move', sel: 'text=Try to smuggle the member ID', dur: 1.0 },
  { t: 89.2, do: 'click', sel: 'text=Try to smuggle the member ID' }, // "…and the request is blocked"
  { t: 96.4, do: 'move', sel: 'text=Send the clean version', dur: 0.8 },
  { t: 97.3, do: 'click', sel: 'text=Send the clean version' },
  { t: 97.4, do: 'scroll', to: 'top', dur: 0.6 },
  { t: 101.6, do: 'scroll', to: '.ck-findings', dur: 1.6, offset: -110 }, // VO08 "It found the X-ray…"
  { t: 110.4, do: 'move', sel: 'text=Explain in plain words >> nth=0', dur: 0.8 },
  { t: 111.3, do: 'click', sel: 'text=Explain in plain words >> nth=0' },
  { t: 118.2, do: 'scroll', to: '.ck-letter', dur: 1.5, offset: -70 }, // VO09 "The cloud drafts the letter…"
  { t: 121.6, do: 'move', sel: 'text=Fill in my details here', dur: 0.9 },
  { t: 122.6, do: 'click', sel: 'text=Fill in my details here' },   // "…fills in the real details"
  { t: 125.0, do: 'scroll', by: 300, dur: 3.0 },
  { t: 134.2, do: 'end' },
]
const SCENARIO = FILM.map((s) => ({ ...s, t: s.t - FILM_OFFSET }))

const HELPERS = `
(() => {
  if (window.__rec) return
  const ease = (x) => (x < .5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2)
  const c = document.createElement('div'); c.id = '__cursor'
  c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l15 9-6.5 1.6L9.6 19z" fill="#1D1726" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>'
  Object.assign(c.style, { position: 'fixed', left: '636px', top: '468px', zIndex: 99999, pointerEvents: 'none', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.25))' })
  const r = document.createElement('div'); r.id = '__ring'
  Object.assign(r.style, { position: 'fixed', width: '34px', height: '34px', borderRadius: '50%', border: '2px solid #E5484D', zIndex: 99998, pointerEvents: 'none', opacity: 0 })
  document.body.append(c, r)
  const st = document.createElement('style')
  st.textContent = '.footer{display:none!important}.checker{min-height:170vh}'
  document.head.append(st)
  const pos = { x: 640, y: 470 }
  const tween = (dur, fn) => new Promise((res) => { const t0 = performance.now(); const f = (now) => { const p = Math.min(1, (now - t0) / (dur * 1000)); fn(ease(p)); p < 1 ? requestAnimationFrame(f) : res() }; requestAnimationFrame(f) })
  window.__rec = {
    move(x, y, dur) { const a = { ...pos }; return tween(dur, (e) => { pos.x = a.x + (x - a.x) * e; pos.y = a.y + (y - a.y) * e; c.style.left = (pos.x - 4) + 'px'; c.style.top = (pos.y - 2) + 'px' }) },
    ring() { r.style.left = (pos.x - 17) + 'px'; r.style.top = (pos.y - 17) + 'px'; return tween(.45, (e) => { r.style.opacity = String(1 - e); r.style.transform = 'scale(' + (.6 + e * .9) + ')' }) },
    scroll(y, dur) { const a = scrollY; return tween(dur, (e) => scrollTo(0, a + (y - a) * e)) },
  }
})()`

;(async () => {
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 })
  page.on('pageerror', (e) => console.error('pageerror', e.message))
  const cdp = await page.context().newCDPSession(page)
  const frames = []
  let castStartedAt = 0
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const name = `f${String(frames.length).padStart(5, '0')}.jpg`
    fs.writeFileSync(`${OUT}/${name}`, Buffer.from(data, 'base64'))
    frames.push({ name, ts: metadata.timestamp })
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })

  const t0 = Date.now()
  const at = async (t) => { const ms = t0 + t * 1000 - Date.now(); if (ms > 0) await new Promise((r) => setTimeout(r, ms)) }
  const center = async (sel) => { const b = await page.locator(sel).first().boundingBox({ timeout: 4000 }).catch(() => null); return b && { x: b.x + b.width / 2, y: b.y + b.height / 2 } }

  for (const s of SCENARIO) {
    await at(s.t)
    if (s.do === 'goto') {
      await page.goto(BASE + s.url, { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      await page.evaluate(HELPERS)
      await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 })
      castStartedAt = (Date.now() - t0) / 1000
    } else if (s.do === 'move') {
      const c = await center(s.sel)
      if (c) void page.evaluate(({ x, y, d }) => window.__rec.move(x, y, d), { x: c.x, y: c.y, d: s.dur })
      else console.error('not found', s.sel)
    } else if (s.do === 'click') {
      void page.evaluate(() => window.__rec.ring())
      await page.locator(s.sel).first().click({ timeout: 4000 }).catch((e) => console.error('click', s.sel, e.message))
    } else if (s.do === 'scroll') {
      const y = await page.evaluate(({ to, by, off }) => {
        if (to === 'top') return 0
        if (by) return scrollY + by
        const e = document.querySelector(to); return e ? e.getBoundingClientRect().top + scrollY + off : scrollY
      }, { to: s.to, by: s.by, off: s.offset ?? 0 })
      void page.evaluate(({ y, d }) => window.__rec.scroll(Math.max(0, y), d), { y, d: s.dur })
    } else if (s.do === 'end') {
      await cdp.send('Page.stopScreencast')
    }
  }
  fs.writeFileSync(`${OUT}/frames.json`, JSON.stringify({ filmOffset: FILM_OFFSET, castStartedAt, frames }, null, 0))
  console.log(`captured ${frames.length} frames over ${((frames.at(-1).ts - frames[0].ts)).toFixed(1)} s`)
  await browser.close()
})()
