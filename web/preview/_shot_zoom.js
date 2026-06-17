// wave2 中栏高清特写 — 精确检视按钮/标签/密级条/信物/驿路质感
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const FILE = 'file:///' + path.resolve(__dirname, 'hongyan-redesign-preview.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, 'shots');
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await b.newPage({ viewport: { width: 1680, height: 1020 }, deviceScaleFactor: 2 });
  await p.goto(FILE, { waitUntil: 'networkidle' }); await p.waitForTimeout(700);
  await p.locator('#compose').screenshot({ path: path.join(OUT, 'zoom-compose.png') }); console.log('zoom-compose');
  await p.locator('.lcard').first().screenshot({ path: path.join(OUT, 'zoom-lcard.png') }); console.log('zoom-lcard');
  await p.locator('.inbox').screenshot({ path: path.join(OUT, 'zoom-inbox.png') }); console.log('zoom-inbox');
  await b.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
