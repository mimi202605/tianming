// map-editor-neighbor.js
// 邻省自动检测·polygon edge intersection
// 算法·两 polygon 共享某段边·或顶点距 < ε·则邻
// segment overlap detection·O(n*m)·~3000 省 ok·后期可加 spatial index
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[neighbor] core not loaded'); return; }

  var EPSILON = 0.5; // 像素·两顶点距 ≤ 此为同点

  // ─── geometry helpers ────────────────────────────────────

  function distSq(a, b){
    var dx = a[0] - b[0], dy = a[1] - b[1];
    return dx*dx + dy*dy;
  }

  // 两线段是否共享一段
  function segmentsTouch(a1, a2, b1, b2){
    var eps2 = EPSILON * EPSILON;
    // 1·端点共享
    if (distSq(a1, b1) <= eps2 || distSq(a1, b2) <= eps2 ||
        distSq(a2, b1) <= eps2 || distSq(a2, b2) <= eps2){
      return true;
    }
    // 2·共线·且至少一对端点之间 perpendicular dist < eps
    if (segmentParallelOverlap(a1, a2, b1, b2, EPSILON)){
      return true;
    }
    return false;
  }

  // 两线段共线 + 范围交叠
  function segmentParallelOverlap(a1, a2, b1, b2, eps){
    var ax = a2[0] - a1[0], ay = a2[1] - a1[1];
    var bx = b2[0] - b1[0], by = b2[1] - b1[1];
    var cross = ax * by - ay * bx;
    var lenA2 = ax * ax + ay * ay;
    var lenB2 = bx * bx + by * by;
    if (lenA2 < eps || lenB2 < eps) return false;
    // 不共线 (cross / sqrt(lenA2*lenB2) > eps angle)
    if (Math.abs(cross) > eps * Math.sqrt(lenA2)) return false;

    // 共线·检查 b 段一端点到 a 段距离
    var d1 = pointToSegmentDist(b1, a1, a2);
    var d2 = pointToSegmentDist(b2, a1, a2);
    if (d1 > eps && d2 > eps) return false;

    // 范围交叠 check (parametric t on a-segment)
    var t1 = projectT(a1, a2, b1);
    var t2 = projectT(a1, a2, b2);
    var lo = Math.min(t1, t2), hi = Math.max(t1, t2);
    if (hi < 0 || lo > 1) return false;
    return true;
  }

  function projectT(a1, a2, p){
    var ax = a2[0] - a1[0], ay = a2[1] - a1[1];
    var len2 = ax*ax + ay*ay;
    if (len2 < 1e-9) return 0;
    return ((p[0] - a1[0]) * ax + (p[1] - a1[1]) * ay) / len2;
  }

  function pointToSegmentDist(p, a, b){
    var t = projectT(a, b, p);
    t = Math.max(0, Math.min(1, t));
    var px = a[0] + t * (b[0] - a[0]);
    var py = a[1] + t * (b[1] - a[1]);
    var dx = p[0] - px, dy = p[1] - py;
    return Math.sqrt(dx*dx + dy*dy);
  }

  // 两 polygon 是否邻 (任一对边共享或端点共享)
  function polygonsAdjacent(p1, p2){
    if (!p1 || !p2 || p1.length < 3 || p2.length < 3) return false;
    // bbox 快速 reject
    var bb1 = bbox(p1), bb2 = bbox(p2);
    if (bb1.maxX < bb2.minX - EPSILON || bb1.minX > bb2.maxX + EPSILON ||
        bb1.maxY < bb2.minY - EPSILON || bb1.minY > bb2.maxY + EPSILON){
      return false;
    }
    // segment-segment check
    var n1 = p1.length, n2 = p2.length;
    for (var i = 0; i < n1; i++){
      var a1 = p1[i], a2 = p1[(i + 1) % n1];
      for (var j = 0; j < n2; j++){
        var b1 = p2[j], b2 = p2[(j + 1) % n2];
        if (segmentsTouch(a1, a2, b1, b2)) return true;
      }
    }
    return false;
  }

  function bbox(poly){
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < poly.length; i++){
      var p = poly[i];
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  // ─── spatial grid·perf ───────────────────────────────────

  // 给定 divs·建索引·按 cell 划分·便于按 bbox 找邻近候选
  function buildSpatialGrid(divs, cellSize){
    cellSize = cellSize || 100;
    var grid = {};
    divs.forEach(function(d){
      if (!d.bbox) return;
      var x0 = Math.floor(d.bbox.x / cellSize);
      var y0 = Math.floor(d.bbox.y / cellSize);
      var x1 = Math.floor((d.bbox.x + d.bbox.w) / cellSize);
      var y1 = Math.floor((d.bbox.y + d.bbox.h) / cellSize);
      // 多个 cell 重叠·each 加进去
      for (var x = x0; x <= x1; x++){
        for (var y = y0; y <= y1; y++){
          var key = x + ',' + y;
          if (!grid[key]) grid[key] = [];
          grid[key].push(d);
        }
      }
    });
    return { grid: grid, cellSize: cellSize };
  }

  // 找 bbox 邻近 candidate divs (有可能 adjacent 的 divs)
  function getNearby(spatial, bbox){
    var grid = spatial.grid;
    var cellSize = spatial.cellSize;
    var result = [];
    var seen = {};
    var x0 = Math.floor(bbox.x / cellSize);
    var y0 = Math.floor(bbox.y / cellSize);
    var x1 = Math.floor((bbox.x + bbox.w) / cellSize);
    var y1 = Math.floor((bbox.y + bbox.h) / cellSize);
    for (var x = x0; x <= x1; x++){
      for (var y = y0; y <= y1; y++){
        var arr = grid[x + ',' + y];
        if (!arr) continue;
        for (var k = 0; k < arr.length; k++){
          var d = arr[k];
          if (!seen[d.id]){ seen[d.id] = true; result.push(d); }
        }
      }
    }
    return result;
  }

  // ─── api ─────────────────────────────────────────────────

  // 多 polygon adj·两个 division 的 polygons 任一对 adjacent 即邻
  function divisionsAdjacent(d1, d2){
    var ps1 = ME.getAllPolygons ? ME.getAllPolygons(d1) : [d1.polygon];
    var ps2 = ME.getAllPolygons ? ME.getAllPolygons(d2) : [d2.polygon];
    for (var i = 0; i < ps1.length; i++){
      for (var j = 0; j < ps2.length; j++){
        if (polygonsAdjacent(ps1[i], ps2[j])) return true;
      }
    }
    return false;
  }

  // hybrid·小数据 spatial grid·大数据 quadtree
  function computeAll(){
    var divs = ME.EDITOR.map.divisions;
    var result = {};
    divs.forEach(function(d){ result[d.id] = []; });

    if (divs.length < 2) return result;

    var n = divs.length;
    var QT = global.TM && TM.MapEditor.quadtree;

    if (QT && n >= 1000){
      // quadtree·大数据集
      return computeAllQuadTree(divs, result);
    }
    // spatial grid·小-中数据集
    return computeAllSpatialGrid(divs, result);
  }

  function computeAllSpatialGrid(divs, result){
    var avgSize = 100;
    var sized = divs.filter(function(d){ return d.bbox; });
    if (sized.length > 0){
      var totalW = 0, totalH = 0;
      sized.forEach(function(d){ totalW += d.bbox.w; totalH += d.bbox.h; });
      var avgW = totalW / sized.length, avgH = totalH / sized.length;
      avgSize = Math.max(50, Math.min(500, (avgW + avgH) / 2));
    }

    var spatial = buildSpatialGrid(divs, avgSize);

    for (var i = 0; i < divs.length; i++){
      var di = divs[i];
      if (!di.bbox) continue;
      var nearby = getNearby(spatial, di.bbox);
      for (var k = 0; k < nearby.length; k++){
        var dj = nearby[k];
        if (dj.id === di.id) continue;
        if (di.id < dj.id){
          if (divisionsAdjacent(di, dj)){
            result[di.id].push(dj.id);
            result[dj.id].push(di.id);
          }
        }
      }
    }
    return result;
  }

  function computeAllQuadTree(divs, result){
    var qt = TM.MapEditor.quadtree.buildFromDivisions(divs);

    for (var i = 0; i < divs.length; i++){
      var di = divs[i];
      if (!di.bbox) continue;
      // 扩展 query bbox 一点·防边界省漏
      var queryBox = {
        x: di.bbox.x - 5,
        y: di.bbox.y - 5,
        w: di.bbox.w + 10,
        h: di.bbox.h + 10
      };
      var nearby = qt.query(queryBox);
      for (var k = 0; k < nearby.length; k++){
        var dj = nearby[k];
        if (dj.id === di.id) continue;
        if (di.id < dj.id){
          if (divisionsAdjacent(di, dj)){
            result[di.id].push(dj.id);
            result[dj.id].push(di.id);
          }
        }
      }
    }
    return result;
  }

  function computeFor(divId){
    var divs = ME.EDITOR.map.divisions;
    var d = divs.find(function(D){ return D.id === divId; });
    if (!d || !d.bbox) return [];
    if (divs.length < 50){
      var nbs = [];
      divs.forEach(function(D){
        if (D.id === divId) return;
        if (divisionsAdjacent(d, D)) nbs.push(D.id);
      });
      return nbs;
    }

    var QT = global.TM && TM.MapEditor.quadtree;
    var nearby;
    if (QT && divs.length >= 1000){
      var qt = QT.buildFromDivisions(divs);
      nearby = qt.query({
        x: d.bbox.x - 5, y: d.bbox.y - 5,
        w: d.bbox.w + 10, h: d.bbox.h + 10
      });
    } else {
      var spatial = buildSpatialGrid(divs, 100);
      nearby = getNearby(spatial, d.bbox);
    }

    var result = [];
    for (var i = 0; i < nearby.length; i++){
      var D = nearby[i];
      if (D.id === divId) continue;
      if (divisionsAdjacent(d, D)) result.push(D.id);
    }
    return result;
  }

  // 应用·更新所有 division.neighbors (snapshot 一次)
  function applyAll(){
    var n = ME.EDITOR.map.divisions.length;
    if (n === 0) return { changed: 0 };
    var nbMap = computeAll();
    var changed = 0;
    ME.commitMutation('compute neighbors x' + n, function(){
      ME.EDITOR.map.divisions.forEach(function(d){
        var newN = nbMap[d.id] || [];
        var old = d.neighbors || [];
        // detect change·sort + stringify compare
        var a = newN.slice().sort(), b = old.slice().sort();
        if (a.join(',') !== b.join(',')){
          d.neighbors = newN;
          changed++;
        }
      });
    });
    return { total: n, changed: changed, found: Object.keys(nbMap).reduce(function(s, k){ return s + nbMap[k].length; }, 0) / 2 };
  }

  // 应用·只更新选中 division
  function applySelected(){
    var sel = ME.getSelected();
    if (sel.length === 0) return { changed: 0 };
    var nbResults = sel.map(function(d){
      return { id: d.id, nbs: computeFor(d.id) };
    });
    var changed = 0;
    ME.commitMutation('compute neighbors (selected)', function(){
      nbResults.forEach(function(r){
        var d = ME.EDITOR.map.divisions.find(function(D){ return D.id === r.id; });
        if (!d) return;
        var a = r.nbs.slice().sort(), b = (d.neighbors || []).slice().sort();
        if (a.join(',') !== b.join(',')){
          d.neighbors = r.nbs;
          changed++;
        }
      });
    });
    return { total: sel.length, changed: changed };
  }

  // expose
  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.neighbor = {
    polygonsAdjacent: polygonsAdjacent,
    computeAll: computeAll,
    computeFor: computeFor,
    applyAll: applyAll,
    applySelected: applySelected
  };

})(typeof window !== 'undefined' ? window : this);
