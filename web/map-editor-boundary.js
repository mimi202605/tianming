// map-editor-boundary.js
// BoundaryMap·双向门·polygon ↔ raster ProvinceMap
// 借鉴 SGGameEditor 的 BuildBoundaryAdjacencyMapBgra + CollectPackedEdgesByAreaPair
//
// 出口·polygon → raster (bake)·按 colorKey 着色·导出 PNG
// 入口·raster → polygon (extract)·marching contour + RDP 简化
//
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[boundary] core not loaded'); return; }

  // ─── ① bake·polygon → raster ProvinceMap ────────────────

  // opts: { width, height, scale, bgRGB ('black'|'white'|hex), useMainOnly, evenodd }
  function bakeToProvinceMap(opts){
    opts = opts || {};
    var map = ME.EDITOR.map;
    var AL = TM.MapEditor.arealinks;
    if (!AL){ meAlert('arealinks 未加载'); return null; }

    var w = opts.width || map.bitmapWidth || 1280;
    var h = opts.height || map.bitmapHeight || 800;
    var scale = opts.scale || 1;
    var canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    var ctx = canvas.getContext('2d');

    // 背景·默 black (SGGameEditor 风)·兼容白
    var bg = opts.bgRGB || '#000000';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (scale !== 1) ctx.scale(scale, scale);

    // 先确保 colorKey 全部分配
    AL.assignColorKeys(map);

    map.divisions.forEach(function(d){
      if (typeof d.colorKey !== 'number') return;
      var rgb = AL.unpack(d.colorKey);
      var color = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
      ctx.fillStyle = color;

      // 主 polygon + 飞地·evenodd 扣 hole
      ctx.beginPath();
      if (d.polygon && d.polygon.length >= 3){
        polyPath(ctx, d.polygon);
      }
      if (!opts.useMainOnly && d.extraPolygons){
        d.extraPolygons.forEach(function(p){ if (p.length >= 3) polyPath(ctx, p); });
      }
      if (!opts.useMainOnly && d.holes){
        d.holes.forEach(function(p){ if (p.length >= 3) polyPath(ctx, p); });
      }
      ctx.fill('evenodd');
    });

    return canvas;
  }

  function polyPath(ctx, poly){
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (var i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath();
  }

  function exportProvinceMapPNG(opts){
    var canvas = bakeToProvinceMap(opts);
    if (!canvas) return;
    canvas.toBlob(function(blob){
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = (ME.EDITOR.map.title || 'provincemap') + '_provincemap.png';
      a.click();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    });
  }

  // ─── ② extract·raster → polygon ─────────────────────────

  // 从 ImageData 提取所有 color regions·返回 [{ colorKey, polygon, area, bbox }]
  // opts: { simplifyEps, minPixelArea, ignoreBg }
  function extractRegions(imageData, opts){
    opts = opts || {};
    var simplifyEps = opts.simplifyEps != null ? opts.simplifyEps : 1.5;
    var minArea = opts.minPixelArea != null ? opts.minPixelArea : 16;
    var ignoreBg = opts.ignoreBg != null ? opts.ignoreBg : 0x000000;

    var w = imageData.width, h = imageData.height;
    var data = imageData.data;
    var seen = new Uint8Array(w * h);
    var regions = [];

    function pxKey(x, y){
      var i = (y * w + x) * 4;
      return ((data[i] & 0xff) << 16) | ((data[i+1] & 0xff) << 8) | (data[i+2] & 0xff);
    }

    for (var y = 0; y < h; y++){
      for (var x = 0; x < w; x++){
        var idx = y * w + x;
        if (seen[idx]) continue;
        var c = pxKey(x, y);
        if (c === ignoreBg){ seen[idx] = 1; continue; }

        // flood fill 同色区域·BFS·标 seen·收 area
        var area = floodFillCollect(data, w, h, seen, x, y, c);
        if (area < minArea) continue;

        // boundary trace·从此 [x,y] 顶左点出发·8-邻 Moore
        var contour = traceContour(data, w, h, x, y, c);
        if (contour.length < 3) continue;

        // simplify
        var simp = rdp(contour, simplifyEps);
        if (simp.length < 3) continue;

        regions.push({
          colorKey: c,
          polygon: simp,
          area: area,
          bbox: contourBBox(simp)
        });
      }
    }
    return regions;
  }

  function floodFillCollect(data, w, h, seen, sx, sy, target){
    var stack = [[sx, sy]];
    var area = 0;
    while (stack.length){
      var p = stack.pop();
      var x = p[0], y = p[1];
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      var idx = y * w + x;
      if (seen[idx]) continue;
      var i = idx * 4;
      var c = ((data[i] & 0xff) << 16) | ((data[i+1] & 0xff) << 8) | (data[i+2] & 0xff);
      if (c !== target) continue;
      seen[idx] = 1;
      area++;
      stack.push([x+1, y]); stack.push([x-1, y]);
      stack.push([x, y+1]); stack.push([x, y-1]);
    }
    return area;
  }

  // 8-邻 Moore-neighbor boundary trace·返 [[x,y],...] 像素轮廓
  var DIRS_8 = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];

  function pxColor(data, w, h, x, y){
    if (x < 0 || y < 0 || x >= w || y >= h) return null;
    var i = (y * w + x) * 4;
    return ((data[i] & 0xff) << 16) | ((data[i+1] & 0xff) << 8) | (data[i+2] & 0xff);
  }

  function traceContour(data, w, h, sx, sy, target){
    var contour = [[sx, sy]];
    var curr = [sx, sy];
    var prev = [sx - 1, sy];
    var maxStep = w * h * 4;
    var steps = 0;
    while (steps++ < maxStep){
      var dx = prev[0] - curr[0], dy = prev[1] - curr[1];
      var startDir = -1;
      for (var i = 0; i < 8; i++){
        if (DIRS_8[i][0] === dx && DIRS_8[i][1] === dy){ startDir = i; break; }
      }
      if (startDir < 0) startDir = 4;
      var found = false;
      for (var k = 1; k <= 8; k++){
        var dir = (startDir + k) % 8;
        var nx = curr[0] + DIRS_8[dir][0];
        var ny = curr[1] + DIRS_8[dir][1];
        if (pxColor(data, w, h, nx, ny) === target){
          prev = curr.slice();
          curr = [nx, ny];
          contour.push([nx, ny]);
          found = true;
          break;
        }
      }
      if (!found) break;
      if (curr[0] === sx && curr[1] === sy && contour.length > 2){
        contour.pop();
        break;
      }
    }
    return contour;
  }

  function rdp(points, eps){
    if (points.length < 3) return points.slice();
    var n = points.length;
    var marks = new Uint8Array(n);
    marks[0] = 1; marks[n-1] = 1;
    var stack = [[0, n - 1]];
    while (stack.length){
      var s = stack.pop();
      var lo = s[0], hi = s[1];
      var maxD = 0, mi = -1;
      var a = points[lo], b = points[hi];
      for (var i = lo + 1; i < hi; i++){
        var d = pointSegDist(points[i], a, b);
        if (d > maxD){ maxD = d; mi = i; }
      }
      if (maxD > eps && mi > 0){
        marks[mi] = 1;
        stack.push([lo, mi]);
        stack.push([mi, hi]);
      }
    }
    var out = [];
    for (var k = 0; k < n; k++) if (marks[k]) out.push(points[k]);
    return out;
  }

  function pointSegDist(p, a, b){
    var dx = b[0]-a[0], dy = b[1]-a[1];
    var l2 = dx*dx + dy*dy;
    if (l2 < 1e-9){
      var ex = p[0]-a[0], ey = p[1]-a[1];
      return Math.sqrt(ex*ex + ey*ey);
    }
    var t = ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / l2;
    t = Math.max(0, Math.min(1, t));
    var qx = a[0] + t * dx, qy = a[1] + t * dy;
    var ex2 = p[0]-qx, ey2 = p[1]-qy;
    return Math.sqrt(ex2*ex2 + ey2*ey2);
  }

  function contourBBox(pts){
    var mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
    for (var i = 0; i < pts.length; i++){
      if (pts[i][0] < mnx) mnx = pts[i][0];
      if (pts[i][0] > mxx) mxx = pts[i][0];
      if (pts[i][1] < mny) mny = pts[i][1];
      if (pts[i][1] > mxy) mxy = pts[i][1];
    }
    return { x: mnx, y: mny, w: mxx - mnx, h: mxy - mny };
  }

  // ─── ③ apply·extract 结果 → division mutation ─────────

  // strategy: 'replace' = 已有 colorKey 的 div 用新 polygon 替换·新色 → 提示创建
  //           'merge'   = 同 colorKey 多 region 合并 (主 + 飞地)
  function applyExtraction(regions, opts){
    opts = opts || {};
    var strategy = opts.strategy || 'merge';
    var map = ME.EDITOR.map;
    var AL = TM.MapEditor.arealinks;
    AL.buildColorKeyIndex(map);

    var matched = 0, created = 0, ignored = 0;
    var unknownColors = [];

    // 按 colorKey 分组·若一 key 多 region·最大为 main·其余 extras
    var byKey = {};
    regions.forEach(function(r){
      if (!byKey[r.colorKey]) byKey[r.colorKey] = [];
      byKey[r.colorKey].push(r);
    });

    ME.commitMutation('apply boundary extraction', function(){
      Object.keys(byKey).forEach(function(keyStr){
        var key = Number(keyStr);
        var rs = byKey[keyStr];
        rs.sort(function(a, b){ return b.area - a.area; });
        var main = rs[0];
        var extras = rs.slice(1).map(function(r){ return r.polygon; });

        var d = AL.getDivisionByColorKey(map, key);
        if (d){
          if (strategy === 'replace' || strategy === 'merge'){
            d.polygon = main.polygon;
            d.extraPolygons = extras;
            ME.recomputeDerived(d);
            matched++;
          }
        } else {
          if (opts.createNew){
            var nd = ME.createDivision({
              name: '新省·' + key.toString(16),
              polygon: main.polygon,
              extraPolygons: extras,
              colorKey: key
            });
            ME.recomputeDerived(nd);
            map.divisions.push(nd);
            created++;
          } else {
            unknownColors.push(key);
            ignored++;
          }
        }
      });
      // 重建 colorKey index
      AL.buildColorKeyIndex(map);
    });

    return {
      regionsProcessed: regions.length,
      matched: matched,
      created: created,
      ignored: ignored,
      unknownColors: unknownColors
    };
  }

  // 从 PNG file 读 ImageData·导入 + extract + apply 一条龙
  function importProvinceMapFile(file, opts){
    return new Promise(function(resolve, reject){
      var img = new Image();
      img.onload = function(){
        var c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        var ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        var imd = ctx.getImageData(0, 0, c.width, c.height);
        var regions = extractRegions(imd, opts);
        var result = applyExtraction(regions, opts);
        resolve({ regions: regions.length, result: result });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  function importProvinceMapDialog(opts){
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/*';
    input.onchange = function(){
      if (!input.files[0]) return;
      var statusEl = document.getElementById('status-tip');
      if (statusEl) statusEl.textContent = '解析 ProvinceMap...';
      importProvinceMapFile(input.files[0], opts).then(function(r){
        var msg = '导入·' + r.regions + ' 区·匹配 ' + r.result.matched +
                  ' / 新建 ' + r.result.created +
                  (r.result.ignored ? ' / 忽略 ' + r.result.ignored : '');
        if (statusEl) statusEl.textContent = msg;
        ME.requestRender();
      }).catch(function(e){
        meAlert('解析失败·' + e.message);
      });
    };
    input.click();
  }

  // ─── expose ─────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.boundary = {
    bakeToProvinceMap: bakeToProvinceMap,
    exportProvinceMapPNG: exportProvinceMapPNG,
    extractRegions: extractRegions,
    applyExtraction: applyExtraction,
    importProvinceMapFile: importProvinceMapFile,
    importProvinceMapDialog: importProvinceMapDialog
  };

})(typeof window !== 'undefined' ? window : this);
