#!/usr/bin/env node
/* eslint-env node */
'use strict';
/*
 * _probe-mobile-force-browser.js — 游牧势力「机动兵力」真浏览器探针（chromium headless）
 *   真局 doActualStart(天启) → 定位察哈尔地块 SVG path → hover 触发 tooltip →
 *   断言 #tmf-map-tip 含「机动兵力」+ 9.5万数值（察哈尔 militaryStrength 95000·无逐块驻军）。
 *   验 B 方案 _mobileForceRow 在真机真数据下确实兜底显出机动兵力（居平报「地图兵力显0」）。
 * node web/scripts/_probe-mobile-force-browser.js
 */
const path = require('path'); const fs = require('fs'); const http = require('http');
const ROOT = path.resolve(__dirname, '..');
const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
const SID = 'sc-tianqi7-1627';
const PORT = 8327;
const SHOT = path.join(ROOT, '_pw-scratch');
try { fs.mkdirSync(SHOT, { recursive: true }); } catch (e) {}
let A = 0, F = 0;
function ok(c, m) { if (c) { A++; console.log('  ✓ ' + m); } else { F++; console.log('  ✗ FAIL: ' + m); } }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };

(async function main() {
  console.log('\n████ 游牧势力机动兵力 · 真浏览器探针 ████\n');
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
  await page.waitForFunction(() => window.GM && window.GM.running, null, { timeout: 90000 });
  console.log('[起局] 天启局就绪');

  // 等地图渲染；若默认视图无地图，尝试触发地图挂载点
  let hasMap = await page.$('.tmf-region');
  if (!hasMap) {
    await page.evaluate(() => {
      var cand = document.querySelector('[data-view="map"],[data-tab="map"],#tab-map,.tmf-map-mount,[data-bk-open-map]');
      if (cand && cand.click) cand.click();
    });
    await page.waitForTimeout(800);
    hasMap = await page.$('.tmf-region');
  }
  ok(!!hasMap, '地图已渲染(.tmf-region 存在)');

  // 找察哈尔 region
  const chahar = await page.evaluate(() => {
    var out = { count: 0, sampleIds: [], found: null };
    var els = Array.from(document.querySelectorAll('.tmf-region'));
    out.count = els.length;
    out.sampleIds = els.slice(0, 8).map(function (el) { return el.dataset.regionId || el.dataset.id || ''; });
    try {
      var maps = [window.GM && window.GM.mapData, window.P && window.P.map, window.P && window.P.mapData].filter(Boolean);
      for (var i = 0; i < maps.length; i++) {
        var rs = maps[i].regions || [];
        for (var j = 0; j < rs.length; j++) {
          var r = rs[j]; var nm = String(r.name || r.title || '');
          if (/察哈尔/.test(nm)) {
            out.found = { id: r.id || r.name, name: nm, garrison: (r.data && r.data.garrison), troops: r.troops };
            break;
          }
        }
        if (out.found) break;
      }
    } catch (e) { out.err = String(e); }
    return out;
  });
  console.log('[地图region数] ' + chahar.count + ' · 样例id ' + JSON.stringify(chahar.sampleIds));
  console.log('[察哈尔] ' + JSON.stringify(chahar.found));

  if (chahar.found) {
    var cid = chahar.found.id;
    var el = await page.$('.tmf-region[data-region-id="' + String(cid).replace(/"/g, '\\"') + '"]');
    ok(!!el, '定位到察哈尔 path 元素');
    if (el) {
      try { await el.scrollIntoViewIfNeeded(); } catch (e) {}
      // 用 bounding box 中心 page.mouse.move 触发 stage mousemove（regionPathFromPoint 用 elementFromPoint）
      // 直接 dispatch mousemove 到 path 元素——regionPathFromPoint 先看 e.target.closest('.tmf-region')，命中即返回，绕开 elementFromPoint 几何命中问题
      await page.evaluate((rid) => {
        var el = document.querySelector('.tmf-region[data-region-id="' + rid.replace(/"/g, '\\"') + '"]');
        if (!el) return;
        var b = el.getBoundingClientRect();
        var ev = new MouseEvent('mousemove', { bubbles: true, clientX: b.left + b.width / 2, clientY: b.top + b.height / 2 });
        el.dispatchEvent(ev);
      }, String(cid));
      await page.waitForTimeout(350);
      var tipHtml = await page.evaluate(() => { var t = document.getElementById('tmf-map-tip'); return t ? t.innerHTML : ''; });
      console.log('[tooltip] ' + tipHtml.replace(/\s+/g, ' ').slice(0, 500));
      ok(/机动兵力|势力军力/.test(tipHtml), 'tooltip 含「机动兵力/势力军力」');
      ok(/9\.5|95[,，]?000|9万5|95000/.test(tipHtml), 'tooltip 含 9.5万/95000 数值');
      try { await page.screenshot({ path: path.join(SHOT, 'mobile-force-chahar.png') }); console.log('[截图] _pw-scratch/mobile-force-chahar.png'); } catch (e) {}
    }
  } else {
    ok(false, '未找到察哈尔 region（无法验 tooltip）');
  }

  // ── canvas 舆图（tm-map-system showCityInfo）验证：天启局有 cities 才验，否则判定历史遗留 ──
  const canvasCheck = await page.evaluate(() => {
    var out = { hasFn: typeof window.showCityInfo === 'function', cityCount: 0, cityKeys: null, chahar: null, popHtml: null };
    try {
      var cities = (window.GM && window.GM.mapData && window.GM.mapData.cities) || null;
      if (cities) {
        var keys = Object.keys(cities);
        out.cityCount = keys.length;
        out.cityKeys = keys.slice(0, 12);
        for (var i = 0; i < keys.length; i++) {
          var c = cities[keys[i]];
          if (c && /察哈尔/.test(String(c.owner || '') + String(c.name || ''))) { out.chahar = { id: keys[i], owner: c.owner, name: c.name, garrison: c.garrison }; break; }
        }
      }
      if (out.hasFn && out.chahar) {
        window.showCityInfo(out.chahar.id);
        var pops = Array.from(document.querySelectorAll('div')).filter(function (d) { return /z-index:\s*10000/.test(d.getAttribute('style') || '') && /驻军|机动兵力|势力军力/.test(d.textContent || ''); });
        out.popHtml = pops.length ? pops[0].textContent.replace(/\s+/g, ' ').slice(0, 300) : '(调用后未找到弹窗)';
      }
    } catch (e) { out.err = String(e); }
    return out;
  });
  console.log('[canvas] showCityInfo=' + canvasCheck.hasFn + ' cityCount=' + canvasCheck.cityCount + ' 察哈尔=' + JSON.stringify(canvasCheck.chahar) + (canvasCheck.err ? ' err=' + canvasCheck.err : ''));
  if (canvasCheck.popHtml) console.log('[canvas弹窗] ' + canvasCheck.popHtml);
  if (canvasCheck.chahar) {
    ok(/机动兵力|势力军力/.test(canvasCheck.popHtml || ''), 'canvas 城市面板含机动兵力/势力军力');
  } else {
    console.log('[canvas] 天启局无 cities 或无察哈尔 city —— canvas 舆图对此剧本不适用（历史遗留·御案地图取代），改动无害保留');
  }

  ok(errs.length === 0, '无致命页面错误' + (errs.length ? ' :: ' + errs.slice(0, 3).join(' | ') : ''));
  console.log('\n结果: ' + A + ' 通过, ' + F + ' 失败');
  await browser.close(); server.close();
  process.exit(F > 0 ? 1 : 0);
})().catch((e) => { console.error('EXC', e); process.exit(2); });
