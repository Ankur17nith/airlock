// Render docs/deck/deck.html to docs/deck/airlock-deck.pdf (10 slides, 1920×1080).
const { chromium } = require('playwright')
const path = require('path')
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
  await p.goto('file://' + path.join(__dirname, 'deck.html'), { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  await p.pdf({ path: path.join(__dirname, 'airlock-deck.pdf'), width: '1920px', height: '1080px', printBackground: true })
  // a PNG of every slide for quick review
  const n = await p.locator('.slide').count()
  for (let i = 0; i < n; i++) await p.locator('.slide').nth(i).screenshot({ path: path.join(__dirname, `slide-${String(i + 1).padStart(2, '0')}.png`) })
  console.log('slides:', n)
  await b.close()
})()
