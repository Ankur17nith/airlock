// Export the README banner and numbers band (2×) from readme.html.
const { chromium } = require('playwright')
const path = require('path')
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1700, height: 2400 }, deviceScaleFactor: 2 })
  await p.goto('file://' + path.join(__dirname, 'readme.html'), { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  for (const id of ['hero', 'numbers', 'thumb']) await p.locator('#' + id).screenshot({ path: path.join(__dirname, `${id}.png`) })
  await b.close()
})()
