// 地图标签几何引擎 · tm-map-label-geo.js
// ============================================================
// 跨朝代通用·纯几何/字号/配色·零游戏依赖·可独立单测(node 亦可 require)。
// 供 phase8-formal-map.js 的势力名/地名动态字号+锚点使用：
//   · polyAreaSigned  鞋带公式真面积(带符号·顺逆时针)
//   · polylabel       内接圆心(pole of inaccessibility)·比质心稳·凹/沿海不落域外
//   · areaFont        面积→字号 平滑幂律 clamp(min, base*(area/ref)^k, max)
//   · brightenLabelColor 势力色亮化(暗色抬亮度保色相·标签用)
// 配色/印章样式仍归剧本，此处只提供数学；不含任何朝代专名。
// ============================================================
(function(){
  'use strict';

  // 多边形有符号面积(鞋带公式)·顺/逆时针决定正负·取绝对值即真面积。
  function polyAreaSigned(pts){
    var n = pts.length, s = 0;
    if (n < 3) return 0;
    for (var i = 0, j = n - 1; i < n; j = i++) { s += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y); }
    return s / 2;
  }

  // 点到多边形有符号距离：内为正、外为负·|值|=到最近边距离。polylabel 用。
  function pointToPolyDist(x, y, ring){
    var inside = false, minSq = Infinity, n = ring.length;
    for (var i = 0, j = n - 1; i < n; j = i++) {
      var a = ring[i], b = ring[j];
      if (((a.y > y) !== (b.y > y)) && (x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x)) inside = !inside;
      var dx = b.x - a.x, dy = b.y - a.y;
      var t = (dx || dy) ? (((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)) : -1;
      var px, py;
      if (t < 0) { px = a.x; py = a.y; } else if (t > 1) { px = b.x; py = b.y; } else { px = a.x + t * dx; py = a.y + t * dy; }
      var ex = x - px, ey = y - py; minSq = Math.min(minSq, ex * ex + ey * ey);
    }
    return (inside ? 1 : -1) * Math.sqrt(minSq);
  }

  // 最大内接圆心(pole of inaccessibility)·网格细分逼近·比质心稳(凹/沿海不落 territory 外)。
  function polylabel(ring){
    var n = ring.length;
    if (n < 3) return null;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < n; i++) { var p = ring[i]; if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y; if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y; }
    var w = maxX - minX, h = maxY - minY, cell = Math.min(w, h);
    if (!(cell > 0)) return { x: minX + w / 2, y: minY + h / 2 };
    var SQRT2 = 1.4142135623730951;
    function mkCell(cx, cy, hh){ var d = pointToPolyDist(cx, cy, ring); return { x: cx, y: cy, h: hh, d: d, max: d + hh * SQRT2 }; }
    var half = cell / 2, cells = [];
    for (var cx = minX; cx < maxX; cx += cell) for (var cy = minY; cy < maxY; cy += cell) cells.push(mkCell(cx + half, cy + half, half));
    var best = mkCell(minX + w / 2, minY + h / 2, 0);          // 种子：bbox 中心
    var precision = Math.max(0.4, cell / 100), iter = 0, MAXIT = 8000;
    while (cells.length && iter++ < MAXIT) {
      var bi = 0; for (var k = 1; k < cells.length; k++) if (cells[k].max > cells[bi].max) bi = k;
      var c = cells[bi]; cells[bi] = cells[cells.length - 1]; cells.pop();
      if (c.d > best.d) best = c;
      if (c.max - best.d <= precision) continue;
      var nh = c.h / 2;
      cells.push(mkCell(c.x - nh, c.y - nh, nh)); cells.push(mkCell(c.x + nh, c.y - nh, nh));
      cells.push(mkCell(c.x - nh, c.y + nh, nh)); cells.push(mkCell(c.x + nh, c.y + nh, nh));
    }
    return { x: best.x, y: best.y };
  }

  // 面积→字号 平滑幂律·clamp(min, base*(area/ref)^k, max)·k≈0.3~0.4(≈按边长·非线性防几百倍失衡)。
  function areaFont(area, ref, base, k, min, max){
    if (!(ref > 0) || !(area > 0)) return min;
    return Math.max(min, Math.min(max, base * Math.pow(area / ref, k)));
  }

  function parseColor(c){
    c = String(c || '').trim();
    var m = c.match(/^#([0-9a-f]{3})$/i);
    if (m) { var s = m[1]; return [parseInt(s[0] + s[0], 16), parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16)]; }
    m = c.match(/^#([0-9a-f]{6})$/i);
    if (m) { var hx = m[1]; return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)]; }
    m = c.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (m) return [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3])];
    return null;
  }
  function rgbToHsl(r, g, b){
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2;
    if (mx !== mn) { var d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h /= 6; }
    return [h, s, l];
  }
  function hslToRgb(h, s, l){
    function hue(p, q, t){ if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q; if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; }
    var r, g, b;
    if (s === 0) { r = g = b = l; } else { var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; r = hue(p, q, h + 1/3); g = hue(p, q, h); b = hue(p, q, h - 1/3); }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
  // 势力色亮化(标签用)·暗色抬亮度保对比·保留色相以读出「本势力的颜色」。
  function brightenLabelColor(color){
    var rgb = parseColor(color);
    if (!rgb) return null;
    var hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    hsl[1] = Math.max(0.32, Math.min(0.92, hsl[1]));            // 饱和度下限·别发灰
    hsl[2] = Math.max(0.62, Math.min(0.80, hsl[2] + 0.14));     // 亮度抬到可读区
    var out = hslToRgb(hsl[0], hsl[1], hsl[2]);
    return 'rgb(' + out[0] + ',' + out[1] + ',' + out[2] + ')';
  }

  // P2 印章框 SVG(rect + 印角) + 外框尺寸·bw/bh=内容盒·外扩留白。返回 {svg,w,h}·纯字符串。
  function sealFrame(bw, bh, size){
    var sw = bw + size * 0.55, sh = bh + size * 0.42, hw = sw / 2, hh = sh / 2;
    var cl = Math.max(4, Math.min(sw, sh) * 0.17);
    var svg = '<rect class="tmf-seal" x="' + (-hw).toFixed(1) + '" y="' + (-hh).toFixed(1) + '" width="' + sw.toFixed(1) + '" height="' + sh.toFixed(1) + '" rx="2.5"></rect>' +
      '<path class="tmf-seal-corner" d="' + sealCorners(hw, hh, cl) + '"></path>';
    return { svg: svg, w: sw, h: sh };
  }

  // 旧版势力名字号(三项 sqrt 混合·area/count/span)·仅 __TM_LABEL_LEGACY A/B 对比用·纯函数。
  function legacyFactionSize(area, maxArea, n, maxN, span, maxSpan, nameLen){
    var aS = maxArea ? Math.sqrt(Math.max(0, area) / maxArea) : 0;
    var cS = maxN ? Math.sqrt(Math.max(0, n) / maxN) : 0;
    var sS = maxSpan ? Math.sqrt(Math.max(0, span) / maxSpan) : 0;
    var score = Math.max(0.05, aS * 0.56 + cS * 0.28 + sS * 0.16);
    var size = 16 + score * 40;
    if (n <= 1) size = Math.min(size, 24);
    if (nameLen >= 5) size *= 0.9;
    if (nameLen >= 7) size *= 0.82;
    return Math.round(Math.max(16, Math.min(56, size)));
  }

  // 印章四角括号 path d(P2·纯几何)·盒[-hw,-hh,2hw,2hh]·每角一段 L 形·cl=角长。
  function sealCorners(hw, hh, cl){
    var r = function(n){ return Math.round(n * 10) / 10; };
    hw = r(hw); hh = r(hh); cl = r(cl);
    return 'M' + (-hw) + ' ' + r(-hh + cl) + 'L' + (-hw) + ' ' + (-hh) + 'L' + r(-hw + cl) + ' ' + (-hh) +
           'M' + r(hw - cl) + ' ' + (-hh) + 'L' + hw + ' ' + (-hh) + 'L' + hw + ' ' + r(-hh + cl) +
           'M' + hw + ' ' + r(hh - cl) + 'L' + hw + ' ' + hh + 'L' + r(hw - cl) + ' ' + hh +
           'M' + r(-hw + cl) + ' ' + hh + 'L' + (-hw) + ' ' + hh + 'L' + (-hw) + ' ' + r(hh - cl);
  }

  var api = {
    polyAreaSigned: polyAreaSigned,
    pointToPolyDist: pointToPolyDist,
    polylabel: polylabel,
    areaFont: areaFont,
    parseColor: parseColor,
    rgbToHsl: rgbToHsl,
    hslToRgb: hslToRgb,
    brightenLabelColor: brightenLabelColor,
    sealCorners: sealCorners,
    sealFrame: sealFrame,
    legacyFactionSize: legacyFactionSize
  };
  if (typeof window !== 'undefined') window.TMMapLabelGeo = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
