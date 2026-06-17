// 加载 web/_yan_harness.html，驱动真 renderFormalLetterPanel，截图 + 抓 console/error
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const FILE = 'file:///' + path.resolve(__dirname, '..', '_yan_harness.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, 'shots'); if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await b.newPage({ viewport: { width: 1680, height: 1020 }, deviceScaleFactor: 1.4 });
  const msgs = [];
  p.on('console', m => msgs.push('[' + m.type() + '] ' + m.text()));
  p.on('pageerror', e => msgs.push('[pageerror] ' + (e && e.message)));
  await p.goto(FILE, { waitUntil: 'networkidle' });
  await p.evaluate(() => { document.querySelectorAll('.pt-img').forEach(function(im){ im.loading = 'eager'; var s = im.getAttribute('src'); im.removeAttribute('src'); im.setAttribute('src', s); }); });
  await p.waitForTimeout(1600);
  const diag = await p.evaluate(() => { var q = function(s){ return document.querySelectorAll('.yan-yuan ' + s).length; }; return { ok: !!window.__yanOK, err: window.__yanErr || '', hasYan: !!document.querySelector('.yan-yuan'), contacts: q('.contact'), cards: q('.lcard'), incards: q('.incard'), imgs: q('.pt-img'), imgLoaded: [].filter.call(document.querySelectorAll('.yan-yuan .pt-img'), function(im){ return im.naturalWidth > 0; }).length, imgFallback: q('.has-portrait.fallback'), tokenBadge: q('.token-badge'), cipherGauge: q('.cipher-gauge'), routeBlock: q('.route'), routeCourier: q('.route-courier'), ccUnread: q('.cc.unread'), ccRoad: q('.cc.road'), ccLost: q('.cc.lost'), actsNote: q('.acts-note'), lcReply: q('.lc-reply'), lcMini: q('.lc-mini'), lcTagType: q('.lc-tag.type'), lcTagToken: q('.lc-tag.token'), lcTagCipher: q('.lc-tag.cipher'), threadFilter: q('.thread-filter .tf'), composeActs: q('.cmp-acts .yact'), cmpStat: q('.cmp-stat .tm-chip'), incActs: q('.inc-acts .inc-btn'), lcActs: q('.lc-acts .lc-btn'), routeEm: (document.querySelector('.yan-yuan .route-top em') || {}).textContent || '', routeNote: (document.querySelector('.yan-yuan .route-note') || {}).textContent || '', replyTitle: (document.querySelector('.yan-yuan .lc-reply b') || {}).textContent || '', threadEm: (document.querySelector('.yan-yuan .thread-hd em') || {}).textContent || '' }; });
  await p.screenshot({ path: path.join(OUT, 'landing-hongyan.png'), fullPage: false });
  console.log('DIAG:', JSON.stringify(diag));
  console.log('MSGS:', msgs.length ? msgs.slice(0, 30).join('\n') : 'NONE');
  await b.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
