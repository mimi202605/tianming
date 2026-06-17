// v1 御案米金鸿雁 现状截图 (优化前基线)
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const FILE = 'file:///' + path.resolve(__dirname, 'hongyan-redesign-preview.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, 'shots'); if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await b.newPage({ viewport: { width: 1680, height: 1020 }, deviceScaleFactor: 1.6 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await p.goto(FILE, { waitUntil: 'networkidle' }); await p.waitForTimeout(700);
  const shot = async n => { await p.waitForTimeout(350); await p.screenshot({ path: path.join(OUT, n + '.png') }); console.log('shot:', n); };
  const cc = async name => { await p.evaluate(n => { const b=[...document.querySelectorAll('.contact')].find(x=>x.querySelector('b')&&x.querySelector('b').textContent.trim()===n); if(b)b.click(); }, name); await p.waitForTimeout(380); };
  await shot(arg('v1w2-01-initial'));
  await cc('郑芝龙'); await shot('v1w2-02-intercepted');
  await cc('满桂'); await shot('v1w2-03-forged');
  await cc('袁崇焕');
  await p.selectOption('#f-type','military_order').catch(()=>{}); await p.waitForTimeout(200);
  await shot('v1w2-04-composer');
  await p.click('#multiToggle').catch(()=>{}); await p.waitForTimeout(200); await cc('卢象升'); await cc('孙传庭');
  await shot('v1w2-05-multi');
  console.log('ERRORS:', errs.length?errs:'NONE'); await b.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
function arg(s){return s;}
