// 鸿雁传书 v2 驿传调度长卷 视觉验证 (file:// · 系统 Edge)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const FILE = 'file:///' + path.resolve(__dirname, 'hongyan-redesign-preview.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, 'shots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1680, height: 1020 }, deviceScaleFactor: 1.6 });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
  await page.goto(FILE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  async function shot(name) { await page.waitForTimeout(400); await page.screenshot({ path: path.join(OUT, name + '.png') }); console.log('shot:', name); }
  async function clickRow(id) { await page.evaluate((i) => { const r = document.querySelector('.track-row[data-id="'+i+'"] .lane'); if (r) r.click(); }, id); await page.waitForTimeout(550); }
  async function clickContact(name) { await page.evaluate((n) => { const b = [...document.querySelectorAll('.contact')].find(x => x.querySelector('b') && x.querySelector('b').textContent.trim() === n); if (b) b.click(); }, name); await page.waitForTimeout(350); }

  await shot('v2-01-initial');                    // 长卷全貌·京城锚柱·驿程刻度·各状态轨迹
  await clickRow('l5'); await shot('v2-02-expand-forged');  // 展开满桂伪造回书·驿路详情
  await clickRow('l5'); await clickRow('l1'); await shot('v2-03-expand-decree'); // 展开袁崇焕密旨在途
  await clickRow('l1');
  await page.evaluate(() => { document.querySelector('.sf[data-f="lost"]').click(); }); await shot('v2-04-filter-lost'); // 失约(截获+阻滞)
  await page.evaluate(() => { document.querySelector('.sf[data-f="all"]').click(); }); await page.waitForTimeout(300);

  await page.selectOption('#cp-type', 'military_order'); await page.waitForTimeout(200);
  await page.selectOption('#cp-cip', 'none'); await page.waitForTimeout(200);
  await shot('v2-05-composer-tally');              // 拟函台·征调令→虎符·不加密→密级条满
  await page.click('#multiToggle'); await page.waitForTimeout(200);
  await clickContact('卢象升'); await clickContact('孙传庭');
  await shot('v2-06-multi');                       // 群发
  await page.click('#multiToggle'); await page.waitForTimeout(150);
  await page.setViewportSize({ width: 1440, height: 880 }); await page.waitForTimeout(300);
  await shot('v2-07-1440');

  console.log('CONSOLE_ERRORS:', errs.length ? JSON.stringify(errs, null, 2) : 'NONE');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
