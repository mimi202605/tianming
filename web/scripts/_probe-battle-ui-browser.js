#!/usr/bin/env node
/* eslint-env node */
'use strict';
/*
 * _probe-battle-ui-browser.js — 御驾亲征·真浏览器 UI 探针(chromium headless)
 *   真局 doActualStart → 开 flag → 注入战斗 → runPending → 会参其事 modal 实渲染(截图) →
 *   点「委之·主攻」→ 会战战报 modal(补员双源按钮实渲染·截图) → 点「募兵补员」真加兵 → 继续关闭
 * node scripts/_probe-battle-ui-browser.js
 */
const path = require('path'); const fs = require('fs'); const http = require('http');
const ROOT = path.resolve(__dirname, '..');
const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
const SID = 'sc-tianqi7-1627';
const PORT = 8317;
const SHOT = path.join(ROOT, '_pw-scratch');
let A = 0, F = 0; function ok(c, m) { if (c) { A++; console.log('  ✓ ' + m); } else { F++; console.log('  ✗ FAIL: ' + m); } }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };

(async function main() {
  console.log('\n████ 御驾亲征 · 真浏览器 UI 探针（modal/战报/补员按钮实渲染）████\n');
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
  await page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded', timeout
: 60000 });
  await page.waitForFunction(() => typeof window.doActualStart === 'function', null, { timeout: 60000 });
  await page.evaluate((sid) => { window._pendingUseMap = true; window._pendingMapModeSid = sid; window.doActualStart(sid); }, SID);
  await page.waitForFunction(() => window.GM && window.GM.running && Array.isArray(window.GM.armies) && window.GM.armies.length > 0 && window.TMBattleTurn && window.TMBattleResolve, null, { timeout: 90000 });
  console.log('[起局] 真浏览器天启局就绪');
  await page.evaluate(() => { ['开始临朝', '知道了'].forEach((t) => { const b = Array.from(document.querySelectorAll('button')).find((x) => x.textContent.trim() === t); b && b.click(); }); }).catch(() => {});   // 关开局引导/密钥提示·免遮截图
  await page.waitForTimeout(600);

  /* 注入战斗 → 咽喉拦截 */
  const pre = await page.evaluate(() => {
    window.GM._yujiaQinzheng = true;
    const pf = (window.P && P.playerInfo && P.playerInfo.factionName) || GM.playerFaction || '';
    let pa = null, ea = null;
    GM.armies.forEach((a) => { if (!a) return; const s = +(a.soldiers || a.strength || 0); if (a.faction === pf && s > 1000 && !pa) pa = a; if (a.faction && a.faction !== pf && s > 500 && !ea) ea = a; });
    const br = { winnerFactionId: pf, loserFactionId: ea.faction, affectedArmies: [{ armyId: pa.id, loss: 500 }, { armyId: ea.id, loss: 700 }], battleId: 'ui-probe' };
    const ret = window.MilitarySystems.applyBattleResult(br, GM);
    return { deferred: ret === undefined, pending: TMBattleTurn._pending().length, paId: pa.id, paSoldiers: +(pa.soldiers || pa.strength || 0), paName: pa.name };
  });
  ok(pre.deferred && pre.pending === 1, '① 真浏览器咽喉拦下(pending=1)');

  /* runPending → 会参其事 modal */
  await page.evaluate(() => { window.__rp = window.TMBattleTurn.runPending(window.GM); });
  await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some((b) => /会参其事/.test(b.textContent)), null, { timeout: 20000 });
  if (!fs.existsSync(SHOT)) fs.mkdirSync(SHOT, { recursive: true });
  await page.screenshot({ path: path.join(SHOT, 'probe-ui-1-combat-choice.png') });
  ok(true, '② 会参其事 modal 实渲染(截图 probe-ui-1)');

  /* 点「委之·主攻」→ 战报 modal + 补员按钮 */
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => /委之 · 主攻/.test(x.textContent)); b && b.click(); });
  await page.waitForFunction(() => Array.from(document.querySelectorAll('div')).some((d) => /会战战报/.test(d.textContent || '')) && Array.from(document.querySelectorAll('button')).some((b) => /募兵补员/.test(b.textContent)), null, { timeout: 20000 });
  await page.screenshot({ path: path.join(SHOT, 'probe-ui-2-report-replenish.png') });
  const ui = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).map((b) => b.textContent.trim());
    return { ding: btns.find((t) => /丁口补员/.test(t)) || null, rec: btns.find((t) => /募兵补员/.test(t)) || null };
  });
  console.log('[战报] 按钮: ' + ui.ding + ' | ' + ui.rec);
  ok(!!ui.ding && !!ui.rec, '③ 战报 modal 带补员双源按钮(截图 probe-ui-2)');

  /* 点「募兵补员」→ 真加兵 + 行刷新 */
  const after = await page.evaluate((paId) => {
    const a = window.GM.armies.find((x) => x && x.id === paId);
    const before = +(a.soldiers || a.strength || 0);
    const b = Array.from(document.querySelectorAll('button')).find((x) => /募兵补员 \+[1-9]/.test(x.textContent));
    if (b) b.click();
    const nowBtns = Array.from(document.querySelectorAll('button')).map((x) => x.textContent.trim());
    return { before: before, after: +(a.soldiers || a.strength || 0), info: (Array.from(document.querySelectorAll('span')).map((s) => s.textContent).find((t) => /已补齐|缺员/.test(t)) || ''), clicked: !!b };
  }, pre.paId);
  console.log('[补员] ' + after.before + '→' + after.after + ' · ' + after.info);
  ok(after.clicked && after.after > after.before, '④ 点募兵补员→真加兵 ' + after.before + '→' + after.after);
  await page.screenshot({ path: path.join(SHOT, 'probe-ui-3-replenished.png') });

  /* 继续关闭 */
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => /整编归伍 · 继续/.test(x.textContent)); b && b.click(); });
  await page.waitForFunction(() => !Array.from(document.querySelectorAll('div')).some((d) => d.textContent === '⚔ 会战战报 · 整编归伍'), null, { timeout: 10000 }).catch(() => {});
  const leaked = errs.filter((s) => !/AudioContext|autoplay|Audio|IndexedDB|indexedDB/i.test(s));
  ok(leaked.length === 0, '⑤ 无 JS 错误' + (leaked.length ? ' → ' + leaked.slice(0, 3).join(' | ') : ''));

  await browser.close(); server.close();
  console.log('\n结果: ' + A + ' 通过 / ' + F + ' 失败');
  process.exit(F ? 1 : 0);
})().catch((e) => { console.error('探针失败: ' + ((e && e.stack) || e)); process.exit(1); });
