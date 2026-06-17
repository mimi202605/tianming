// map-editor-bitmap-trace.js
// Phase 21.6·bitmap edge trace 替 voronoi 起点
//
// 用 land mask·marching squares + Moore-neighbor·提取 contour polygon
// flood-fill·色聚类·提多 region·color → 多 polygon
// 输出·natural shape·替 voronoi 数学 cell
//
// 2026-05-07

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[bitmap-trace] core not loaded'); return; }

  // ─── ① marching squares·从 binary mask 提 contour ─────

  // 输入·mask {w, h, mask: Uint8Array}·返回·一组 contour polygon
  // 仅·外轮廓·不分洞
  function traceContours(mask){
    if (!mask) return [];
    var w = mask.w, h = mask.h, m = mask.mask;

    // visited·标已 trace 过的 contour 起始
    var visited = new Uint8Array(w * h);

    var contours = [];

    function getCell(x, y){
      if (x < 0 || x >= w || y < 0 || y >= h) return 0;
      return m[y * w + x];
    }

    // Moore-neighbor tracing·从 (sx, sy) 起·sx 是边界 (mask=1·左 mask=0)
    function trace(sx, sy){
      var contour = [];
      var maxSteps = w * h * 2;
      var dirs = [
        [1, 0], [1, 1], [0, 1], [-1, 1],
        [-1, 0], [-1, -1], [0, -1], [1, -1]
      ];
      var x = sx, y = sy;
      var prevDir = 6;     // 前进方向反向
      var steps = 0;
      do {
        contour.push([x, y]);
        visited[y * w + x] = 1;
        var found = false;
        for (var i = 0; i < 8; i++){
          var d = (prevDir + i + 1) % 8;     // 起·反向 + 1
          var nx = x + dirs[d][0];
          var ny = y + dirs[d][1];
          if (getCell(nx, ny) === 1){
            x = nx; y = ny;
            prevDir = (d + 4) % 8;
            found = true;
            break;
          }
        }
        if (!found) break;
        steps++;
      } while ((x !== sx || y !== sy) && steps < maxSteps);

      return contour;
    }

    // 扫·找未访问的 mask=1 边界点
    for (var y = 0; y < h; y++){
      for (var x = 0; x < w; x++){
        if (m[y * w + x] !== 1) continue;
        if (visited[y * w + x]) continue;
        // 边界·上邻是 0 (或边外)
        if (getCell(x, y - 1) !== 1){
          var c = trace(x, y);
          if (c.length >= 8) contours.push(c);
        }
      }
    }
    return contours;
  }

  // ─── ② 简化·Douglas-Peucker ───────────────────────────

  function distPointLine(p, a, b){
    var dx = b[0] - a[0], dy = b[1] - a[1];
    var len2 = dx * dx + dy * dy;
    if (len2 < 1e-9){
      var ddx = p[0] - a[0], ddy = p[1] - a[1];
      return Math.sqrt(ddx * ddx + ddy * ddy);
    }
    var t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    var px = a[0] + t * dx;
    var py = a[1] + t * dy;
    var ex = p[0] - px, ey = p[1] - py;
    return Math.sqrt(ex * ex + ey * ey);
  }

  function simplifyDP(points, eps){
    if (points.length < 3) return points.slice();
    function rec(start, end, out){
      var maxD = 0, maxI = -1;
      for (var i = start + 1; i < end; i++){
        var d = distPointLine(points[i], points[start], points[end]);
        if (d > maxD){ maxD = d; maxI = i; }
      }
      if (maxD > eps && maxI > 0){
        rec(start, maxI, out);
        out.push(points[maxI]);
        rec(maxI, end, out);
      }
    }
    var result = [points[0]];
    rec(0, points.length - 1, result);
    result.push(points[points.length - 1]);
    return result;
  }

  // ─── ③ 主·extract land polygons from current bitmap ──

  function extractLandPolygons(opts){
    opts = opts || {};
    var BS = TM.MapEditor.bitmapSeeds;
    if (!BS){
      if (global.meToast) meToast('bitmap-seeds 未加载', 'error');
      return [];
    }
    var mask = BS.getMask();
    if (!mask){
      mask = BS.buildLandMask({ mode: opts.mode || 'bluedominant' });
      if (!mask){
        if (global.meToast) meToast('未载底图·trace 跳', 'warn');
        return [];
      }
    }

    var contours = traceContours(mask);
    var minArea = opts.minArea || 200;
    var simplifyEps = opts.simplifyEps || 1.5;

    // 简化 + filter
    var polys = contours.map(function(c){
      return simplifyDP(c, simplifyEps);
    }).filter(function(p){
      if (p.length < 3) return false;
      // area
      var a = polygonArea(p);
      return Math.abs(a) > minArea;
    });

    if (global.meToast){
      meToast('trace·' + polys.length + ' contour·' + (polys[0] ? polys[0].length : 0) + ' 顶 (主)', 'success', 2400);
    }
    return polys;
  }

  function polygonArea(poly){
    var a = 0;
    for (var i = 0; i < poly.length; i++){
      var p1 = poly[i], p2 = poly[(i + 1) % poly.length];
      a += p1[0] * p2[1] - p2[0] * p1[1];
    }
    return a / 2;
  }

  // ─── ④ 用 contour·替 voronoi 起点·clip voronoi to contour ─

  // 思路·先 trace land contour·然后 voronoi 各 cell 与 contour 取交·
  // 现成方案·hierarchicalGen.clipPolygon 可用·若有
  function generateFromTrace(opts){
    opts = opts || {};
    var n = opts.n || 50;
    var lloyd = opts.lloyd || 5;

    var lands = extractLandPolygons({ minArea: opts.minArea || 200 });
    if (!lands.length){
      if (global.meToast) meToast('未提到陆地 contour', 'warn');
      return false;
    }

    var BS = TM.MapEditor.bitmapSeeds;
    var V = TM.MapEditor.voronoi;
    var HG = TM.MapEditor.hierarchicalGen;
    if (!V || !BS){ return false; }

    // 取最大·主陆地·此为初步·后续可分各陆地处理
    var lands_sorted = lands.slice().sort(function(a, b){
      return Math.abs(polygonArea(b)) - Math.abs(polygonArea(a));
    });
    var mainLand = lands_sorted[0];
    if (!mainLand) return false;

    // bbox·voronoi bounds
    var minX = mainLand[0][0], maxX = mainLand[0][0], minY = mainLand[0][1], maxY = mainLand[0][1];
    for (var i = 1; i < mainLand.length; i++){
      if (mainLand[i][0] < minX) minX = mainLand[i][0];
      if (mainLand[i][0] > maxX) maxX = mainLand[i][0];
      if (mainLand[i][1] < minY) minY = mainLand[i][1];
      if (mainLand[i][1] > maxY) maxY = mainLand[i][1];
    }
    var bb = { x: minX - 5, y: minY - 5, w: maxX - minX + 10, h: maxY - minY + 10 };

    // 在 mainLand 内·rejection sample N 种子
    var seeds = HG && HG.samplePointsInPolygon
      ? HG.samplePointsInPolygon(mainLand, n)
      : [];
    if (seeds.length < 3){
      if (global.meToast) meToast('seed 不足·主陆地太小或 n 过大', 'warn');
      return false;
    }

    // Lloyd
    if (V.lloydsRelaxation && lloyd > 0){
      seeds = V.lloydsRelaxation(seeds, bb, lloyd);
    }

    // voronoi cells
    var cells = V.computeCells(seeds, bb);
    var clip = HG && HG.clipPolygon;
    if (!clip){
      if (global.meToast) meToast('hierarchicalGen.clipPolygon 不可用', 'error');
      return false;
    }

    // 各 cell 与 mainLand 取交
    var divs = [];
    for (var k = 0; k < cells.length; k++){
      var clipped = clip(cells[k], mainLand);
      if (!clipped || clipped.length < 3) continue;
      var d = ME.createDivision({
        name: 'T' + (k + 1),
        level: (TM.MapEditor.dynasty.get(ME.EDITOR.map.dynasty).levels[1] || {}).key || 'province',
        polygon: clipped
      });
      ME.recomputeDerived(d);
      divs.push(d);
    }
    if (!divs.length){
      if (global.meToast) meToast('无 cell 与陆地相交', 'warn');
      return false;
    }

    ME.commitMutation('bitmap trace · ' + divs.length + ' cell', function(){
      ME.EDITOR.map.divisions = divs;
    });
    if (global.meToast){
      meToast('bitmap trace·' + divs.length + ' 省·随真海岸', 'success', 3000);
    }
    return true;
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.bitmapTrace = {
    traceContours: traceContours,
    simplifyDP: simplifyDP,
    extractLandPolygons: extractLandPolygons,
    generateFromTrace: generateFromTrace,
    polygonArea: polygonArea
  };

})(typeof window !== 'undefined' ? window : this);
