#!/usr/bin/env node
/* eslint-env node */
'use strict';
/*
 * _probe-dynasty-endgame-browser.js — 亡国终局·真浏览器探针(chromium headless)
 *   真局 doActualStart → 注入新鲜 GM._gameOver(民变改朝) → 调真 _consumeDynastyEndSignal →
 *   喂真 _showEndgameScreen('defeat') → 断言「天命已绝」终局屏实渲染(截图) + 幂等 + 无页错
 * node scripts/_probe-dynasty-endgame-browser.js
 */
const path = require('path'); const fs = require('fs'); const http = require('http');
const ROOT = path.resolve(__dirname, '..');
const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
const SID = 'sc-tianqi7-1627';
const PORT = 8319;
const SHOT = path.join(ROOT, '_pw-scratch');
let A = 0, F = 0; function ok(c, m) { if (c) { A++; console.log('  ✓ ' + m); } else { F++; console.log('  ✗ FAIL: ' + m); } }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };

(async function main() {
  console.log('\n████ 亡国终局 · 真浏览器探针（天命已绝屏实渲染）████\n');
  const server = http.createServer((req, res) => {
    try {
      let p = decodeURIComponent(String(req.url || '/').split('?')[0]); if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p.replace(/^\/+/, ''));
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || !fs.statSync(fp).isFile()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(res);
    } catch (e) { try { res.writeHead(500); res.end(); } catch (e2) {} }
  }).listen(PORT, '127.0.0.1');
  const exe = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1223', 'chrome-win64', 'chrome.exe');
  const browser = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror:' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|net::|404/.test(m.text())) errs.push('console:' + m.text()); });
  await page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof window.doActualStart === 'function', null, { timeout: 60000 });
  await page.evaluate((sid) => { window.doActualStart(sid); }, SID);
  await page.waitForFunction(() => window.GM && window.GM.running && typeof window._consumeDynastyEndSignal === 'function' && typeof window._showEndgameScreen === 'function', null, { timeout: 90000 });
  console.log('[起局] 真浏览器天启局就绪·终局函数全局可达');
  await page.evaluate(() => { ['开始临朝', '知道了', '已阅 · 闭卷'].forEach((t) => { const b = Array.from(document.querySelectorAll('button')).find((x) => x.textContent.trim() === t); b && b.click(); }); }).catch(() => {});
  await page.waitForTimeout(400);

  /* 注入新鲜亡国信号 → 真函数链（与 endTurn 尾部消费点同构） */
  const r1 = await page.evaluate(() => {
    window.GM._gameOver = { type: 'dynasty_change', revolt: 'probe-r1', turn: window.GM.turn };
    const d = window._consumeDynastyEndSignal();
    if (d) window._showEndgameScreen('defeat', d);
    return { got: !!d, title: d && d.title, shown: !!(window.GM._gameOver && window.GM._gameOver._shown) };
  });
  ok(r1.got && /改朝换代/.test(r1.title || ''), '① 真局消费民变改朝信号 → 败因「' + r1.title + '」');
  ok(r1.shown, '① 信号已标 _shown');
  await page.waitForFunction(() => !!document.getElementById('_endgame'), null, { timeout: 10000 });
  const scr = await page.evaluate(() => {
    const el = document.getElementById('_endgame');
    const txt = (el.textContent || '').replace(/\s+/g, '');
    return { hasTitle: txt.indexOf('天命已绝') >= 0, hasCause: txt.indexOf('民变席卷') >= 0, hasTabs: txt.indexOf('指标变化') >= 0 && txt.indexOf('NPC命运') >= 0 };
  });
  ok(scr.hasTitle, '② 终局屏实渲染「天命已绝」');
  ok(scr.hasCause, '② 败因标题上屏');
  ok(scr.hasTabs, '② 指标/时间轴/NPC命运标签页齐');
  if (!fs.existsSync(SHOT)) fs.mkdirSync(SHOT, { recursive: true });
  await page.evaluate(() => {
    const sm = document.getElementById('_situationModal'); sm && sm.remove();
    Array.from(document.querySelectorAll('button')).forEach((b) => { if (/已阅|开始治国|知道了/.test(b.textContent.trim())) b.click(); });
    // 兜底(仅探针截图)：移除异步晚到、盖在终局屏上的开局层(邸报/天下大势)
    const eg = document.getElementById('_endgame');
    if (eg) Array.from(document.body.children).forEach((el) => { if (el !== eg && el.nodeType === 1 && /邸报|天下大势/.test(el.textContent || '') && getComputedStyle(el).position === 'fixed') el.remove(); });
  }).catch(() => {});
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(SHOT, 'probe-dynasty-endgame.png') });
  console.log('[截图] probe-dynasty-endgame.png');

  /* 幂等：再消费一次 → null（不重复弹屏） */
  const r2 = await page.evaluate(() => window._consumeDynastyEndSignal());
  ok(r2 === null, '③ 已消费信号幂等不重弹');

  ok(errs.length === 0, '④ 全程无 JS 页错' + (errs.length ? ' → ' + errs.slice(0, 3).join(' | ') : ''));
  await browser.close(); server.close();
  console.log('\n' + (F === 0 ? 'ALL PASS' : 'FAIL') + ' (' + A + ' pass / ' + F + ' fail)');
  process.exit(F === 0 ? 0 : 1);
})().catch((e) => { console.error('PROBE ERROR:', e); process.exit(1); });
