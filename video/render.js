// Render video/film.html to numbered JPEG frames. Every frame is window.render(t).
//   node video/render.js                 → all frames into video/work/film/
//   node video/render.js --stills 3,45,90 → only those times, into video/work/stills/
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const HERE = __dirname
const TL = JSON.parse(fs.readFileSync(path.join(HERE, 'timeline.json'), 'utf8'))
const meta = JSON.parse(fs.readFileSync(path.join(HERE, 'work/app/frames.json'), 'utf8'))
const ts0 = meta.frames[0].ts
const APP_FRAMES = meta.frames.map((f) => ({ name: f.name, t: meta.castStartedAt + (f.ts - ts0) }))

const args = process.argv.slice(2)
const stills = args[0] === '--stills' ? args[1].split(',').map(Number) : null
const WORKERS = Number(process.env.WORKERS || 4)
const OUT = path.join(HERE, stills ? 'work/stills' : 'work/film')
fs.mkdirSync(OUT, { recursive: true })

async function worker(browser, times, label) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => console.error('pageerror', e.message))
  await page.addInitScript(({ TL, APP_FRAMES }) => { window.TIMELINE = TL; window.APP_FRAMES = APP_FRAMES }, { TL, APP_FRAMES })
  await page.goto('file://' + path.join(HERE, 'film.html'), { waitUntil: 'networkidle' })
  await page.evaluate(() => window.ready())
  let n = 0
  for (const [i, t] of times) {
    await page.evaluate(async (t) => {
      window.render(t)
      const img = document.getElementById('appimg')
      if (img && img.getAttribute('src') && !img.complete) await new Promise((r) => { img.onload = img.onerror = r })
      if (img && img.getAttribute('src')) await img.decode().catch(() => {})
    }, t)
    const name = stills ? `t${t.toFixed(1).padStart(6, '0')}.jpg` : `f${String(i).padStart(5, '0')}.jpg`
    await page.screenshot({ path: path.join(OUT, name), type: 'jpeg', quality: 92 })
    if (++n % 300 === 0) console.log(label, n, '/', times.length)
  }
}

;(async () => {
  const browser = await chromium.launch()
  const all = stills
    ? stills.map((t, i) => [i, t])
    : Array.from({ length: Math.round(TL.duration * TL.fps) }, (_, i) => [i, i / TL.fps])
  const chunks = Array.from({ length: Math.min(WORKERS, all.length) }, (_, w) => all.filter((_, i) => i % Math.min(WORKERS, all.length) === w))
  await Promise.all(chunks.map((c, w) => worker(browser, c, `w${w}`)))
  console.log(`rendered ${all.length} frames → ${OUT}`)
  await browser.close()
})()
