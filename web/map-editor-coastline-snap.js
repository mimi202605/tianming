// map-editor-coastline-snap.js
// Phase 20.3·coastline snap
//
// 用 bitmap-seeds 的 land mask·把 polygon 顶点中落海的吸附到陆海界
// 算法·BFS 从 vertex 出发·找最近 land pixel·snap
// 也可加·在 land-sea 跨越的边上·插入 boundary vertex
//
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[coastline-snap] core not loaded'); return; }

  // ─── 单 vertex·在海则 snap 到最近 land ────────────────

  function snapVertexToLand(v, mask, maxRadius){
    var BS = TM.MapEditor.bitmapSeeds;
    if (!BS) return v;
    var x = v[0], y = v[1];
    if (BS.isLand(x, y)) return v;
    // 螺旋扩展·找最近 land
    maxRadius = maxRadius || 30;
    var ix = Math.round(x), iy = Math.round(y);
    var w = mask.w, h = mask.h;

    // BFS·从近到远扫·只查 4-邻接·更快
    // 用·按 radius 由小到大·每 radius 扫圆周
    for (var r = 1; r <= maxRadius; r++){
      // 圆周 sample·每 1 px
      var step = Math.max(1, Math.floor(Math.PI * r / 8));   // ~8-point sample at small r
      var nSamples = Math.max(8, Math.round(2 * Math.PI * r / step));
      for (var k = 0; k < nSamples; k++){
        var theta = (k / nSamples) * 2 * Math.PI;
        var nx = ix + Math.round(r * Math.cos(theta));
        var ny = iy + Math.round(r * Math.sin(theta));
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        if (mask.mask[ny * w + nx] === 1){
          return [nx, ny];
        }
      }
    }
    return v;     // 找不到·留原
  }

  // ─── 边·跨越 land-sea·在 boundary 插点 (可选) ─────────

  // 沿边采样·找 land/sea 转换点·插入
  function densifyAcrossCoast(a, b, mask, samplePer){
    var BS = TM.MapEditor.bitmapSeeds;
    if (!BS) return [];
    samplePer = samplePer || 4;
    var dx = b[0] - a[0], dy = b[1] - a[1];
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < samplePer * 2) return [];
    var n = Math.ceil(len / samplePer);
    var lastLand = BS.isLand(a[0], a[1]);
    var inserts = [];
    for (var i = 1; i < n; i++){
      var t = i / n;
      var px = a[0] + dx * t;
      var py = a[1] + dy * t;
      var land = BS.isLand(px, py);
      if (land !== lastLand){
        // boundary·插点
        inserts.push([px, py]);
        lastLand = land;
      }
    }
    return inserts;
  }

  // ─── 单 ring·snap 顶点 + 跨越点插入 ────────────────────

  function snapRing(ring, mask, opts){
    if (!ring || ring.length < 3) return ring;
    opts = opts || {};
    var maxR = opts.maxRadius || 30;
    var densify = opts.densify !== false;

    // ① snap 海上顶点
    var snapped = ring.map(function(v){
      return snapVertexToLand(v, mask, maxR);
    });

    if (!densify) return snapped;

    // ② 插边上跨越点
    var newRing = [];
    for (var i = 0; i < snapped.length; i++){
      var a = snapped[i];
      var b = snapped[(i + 1) % snapped.length];
      newRing.push(a);
      var ins = densifyAcrossCoast(a, b, mask, 4);
      for (var k = 0; k < ins.length; k++){
        // 把跨越点也 snap 到 land
        newRing.push(snapVertexToLand(ins[k], mask, 6));
      }
    }
    return newRing;
  }

  // ─── apply·全 map ─────────────────────────────────────

  function snapAll(opts){
    opts = opts || {};
    var BS = TM.MapEditor.bitmapSeeds;
    if (!BS){
      if (global.meToast) meToast('bitmap-seeds 未加载', 'error');
      return null;
    }
    var mask = BS.getMask();
    if (!mask){
      // 自动建一次
      mask = BS.buildLandMask({ mode: 'bluedominant' });
      if (!mask){
        if (global.meToast) meToast('未载底图·snap 跳过', 'warn');
        return null;
      }
    }

    var stat = { divs: 0, vertsMoved: 0, vertsAdded: 0 };
    var maxR = opts.maxRadius || 30;
    var densify = opts.densify !== false;
    var divIds = opts.divIds;

    ME.commitMutation('coastline snap', function(){
      ME.EDITOR.map.divisions.forEach(function(d){
        if (divIds && divIds.indexOf(d.id) < 0) return;
        var origCount = d.polygon.length;
        d.polygon = snapRing(d.polygon, mask, { maxRadius: maxR, densify: densify });
        stat.vertsAdded += d.polygon.length - origCount;
        if (d.extraPolygons){
          d.extraPolygons = d.extraPolygons.map(function(p){
            var oc = p.length;
            var np = snapRing(p, mask, { maxRadius: maxR, densify: densify });
            stat.vertsAdded += np.length - oc;
            return np;
          });
        }
        ME.recomputeDerived(d);
        stat.divs++;
      });
    });

    if (global.meToast){
      meToast('snap·' + stat.divs + ' div·+' + stat.vertsAdded + ' 顶 (跨越点)', 'success');
    }
    return stat;
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.coastlineSnap = {
    snapAll: snapAll,
    snapRing: snapRing,
    snapVertexToLand: snapVertexToLand
  };

})(typeof window !== 'undefined' ? window : this);
