const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = path.resolve(__dirname, 'shots'); if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const f = n => 'file:///' + path.resolve(__dirname, n).replace(/\\/g, '/');
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await b.newPage({ viewport: { width: 1680, height: 980 }, deviceScaleFactor: 1.6 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  for (const [file, out] of [['hongyan-concept-A-dark.html','concept-A-dark'],['hongyan-concept-B-light.html','concept-B-light']]) {
    await p.goto(f(file), { waitUntil: 'networkidle' }); await p.waitForTimeout(700);
    await p.screenshot({ path: path.join(OUT, out + '.png') }); console.log('shot:', out);
  }
  console.log('ERRORS:', errs.length ? errs : 'NONE'); await b.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
