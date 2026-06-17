// map-editor-topology.js
// shared vertex topology·CK3 / EU4 / 古 GIS 范式
//
// 核心·  共享顶点 registry·两 div 共边时·顶点是 SAME id·非 deep clone
//        拖一个 vertex·全部使用此 vid 的 polygon 同步动·零裂缝
//
// 数据·
//   map.topology = {
//     enabled: bool,
//     vertices: { vid: [x, y] },       // 顶点存储
//     usage: { vid: Set<usageEntry> }, // 反向 index·vid → 谁用
//     nextVid: number
//   }
//   division.polygonVids = [vid, vid, ...]    // 主 polygon 的顶点 id 序列
//   division.extraPolygonsVids = [[vid,...], [vid,...]]
//   division.holesVids = [[vid,...], [vid,...]]
//   division.polygon = [[x,y],...]            // cached coords·从 topology 解析
//
// usageEntry·"divId|kind|polyIdx|vertexIdx"·便 reverse lookup
//
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[topology] core not loaded'); return; }

  var SNAP_DIST = 4;  // 像素·snap 半径 (世界 coord·考虑 zoom)
  var GRID_CELL = 16; // spatial grid 桶尺寸·世界单位·建议 ≥ SNAP_DIST·≤ 平均边长

  // ─── topology state factory ─────────────────────────────

  function ensureTopology(map){
    map = map || ME.EDITOR.map;
    if (!map.topology){
      map.topology = {
        enabled: false,
        vertices: {},
        usage: {},      // vid → array of "divId|kind|polyIdx|vertexIdx"
        nextVid: 1
      };
    }
    // grid·non-persistent·非 enumerable·避免被 JSON.stringify 序列化
    if (!map.topology._grid){
      defineGrid(map.topology, { cells: {}, cellSize: GRID_CELL });
    }
    return map.topology;
  }

  function defineGrid(topo, gridObj){
    Object.defineProperty(topo, '_grid', {
      value: gridObj,
      enumerable: false,
      configurable: true,
      writable: true
    });
  }

  // ─── spatial grid·O(1) 平均近邻查询 ─────────────────────

  function gridKey(x, y, cs){
    return Math.floor(x / cs) + ',' + Math.floor(y / cs);
  }

  function gridAdd(map, vid, x, y){
    var t = ensureTopology(map);
    var g = t._grid;
    var k = gridKey(x, y, g.cellSize);
    if (!g.cells[k]) g.cells[k] = [];
    if (g.cells[k].indexOf(vid) === -1) g.cells[k].push(vid);
  }

  function gridRemove(map, vid, x, y){
    var t = ensureTopology(map);
    var g = t._grid;
    var k = gridKey(x, y, g.cellSize);
    var arr = g.cells[k];
    if (!arr) return;
    var idx = arr.indexOf(vid);
    if (idx >= 0) arr.splice(idx, 1);
    if (arr.length === 0) delete g.cells[k];
  }

  function gridRebuild(map){
    var t = ensureTopology(map);
    t._grid = { cells: {}, cellSize: GRID_CELL };
    Object.keys(t.vertices).forEach(function(vid){
      var v = t.vertices[vid];
      gridAdd(map, vid, v[0], v[1]);
    });
  }

  function isEnabled(){
    var t = ME.EDITOR.map.topology;
    return !!(t && t.enabled);
  }

  // ─── vertex CRUD ────────────────────────────────────────

  function newVid(map){
    var t = ensureTopology(map);
    var id = 'v_' + (t.nextVid++).toString(36);
    return id;
  }

  function addVertex(map, x, y){
    var t = ensureTopology(map);
    var vid = newVid(map);
    t.vertices[vid] = [x, y];
    t.usage[vid] = [];
    gridAdd(map, vid, x, y);
    return vid;
  }

  function getVertex(map, vid){
    var t = ensureTopology(map);
    return t.vertices[vid] || null;
  }

  function moveVertex(map, vid, x, y){
    var t = ensureTopology(map);
    if (!t.vertices[vid]) return false;
    var old = t.vertices[vid];
    gridRemove(map, vid, old[0], old[1]);
    t.vertices[vid][0] = x;
    t.vertices[vid][1] = y;
    gridAdd(map, vid, x, y);
    return true;
  }

  function deleteVertex(map, vid){
    var t = ensureTopology(map);
    var v = t.vertices[vid];
    if (v) gridRemove(map, vid, v[0], v[1]);
    delete t.vertices[vid];
    delete t.usage[vid];
  }

  // 找指定坐标附近的现有 vertex (snap)·返回 vid 或 null
  // O(1) 平均·grid 邻 9 cell 扫
  function findNearbyVertex(map, x, y, snapDist){
    var t = ensureTopology(map);
    snapDist = snapDist == null ? SNAP_DIST : snapDist;
    var g = t._grid;
    if (!g){ ensureTopology(map); g = t._grid; }
    var cs = g.cellSize;
    var cx = Math.floor(x / cs), cy = Math.floor(y / cs);
    var bestVid = null, bestD = snapDist * snapDist;
    // 扫 3×3 邻 cell·边缘 vid 可能在邻桶
    for (var dy = -1; dy <= 1; dy++){
      for (var dx = -1; dx <= 1; dx++){
        var k = (cx + dx) + ',' + (cy + dy);
        var arr = g.cells[k];
        if (!arr) continue;
        for (var i = 0; i < arr.length; i++){
          var vid = arr[i];
          var v = t.vertices[vid];
          if (!v) continue;
          var ex = v[0] - x, ey = v[1] - y;
          var d2 = ex * ex + ey * ey;
          if (d2 < bestD){ bestD = d2; bestVid = vid; }
        }
      }
    }
    return bestVid;
  }

  // ─── usage tracking (vid → 谁用) ────────────────────────

  function usageKey(divId, kind, polyIdx, vertexIdx){
    return divId + '|' + kind + '|' + polyIdx + '|' + vertexIdx;
  }
  function parseUsageKey(key){
    var p = key.split('|');
    return { divId: p[0], kind: p[1], polyIdx: Number(p[2]), vertexIdx: Number(p[3]) };
  }

  function addUsage(map, vid, divId, kind, polyIdx, vertexIdx){
    var t = ensureTopology(map);
    if (!t.usage[vid]) t.usage[vid] = [];
    var key = usageKey(divId, kind, polyIdx, vertexIdx);
    if (t.usage[vid].indexOf(key) === -1) t.usage[vid].push(key);
  }

  function removeUsage(map, vid, divId, kind, polyIdx, vertexIdx){
    var t = ensureTopology(map);
    if (!t.usage[vid]) return;
    var key = usageKey(divId, kind, polyIdx, vertexIdx);
    var idx = t.usage[vid].indexOf(key);
    if (idx >= 0) t.usage[vid].splice(idx, 1);
  }

  function clearUsage(map, divId){
    // 清此 div 在 topology 中所有 usage·用于 div 删除前
    var t = ensureTopology(map);
    Object.keys(t.usage).forEach(function(vid){
      t.usage[vid] = t.usage[vid].filter(function(k){
        return parseUsageKey(k).divId !== divId;
      });
    });
  }

  // GC orphan vertex·无 usage 的 vertex 删除
  function gcOrphans(map){
    var t = ensureTopology(map);
    var deleted = 0;
    Object.keys(t.vertices).forEach(function(vid){
      var users = t.usage[vid] || [];
      if (users.length === 0){
        delete t.vertices[vid];
        delete t.usage[vid];
        deleted++;
      }
    });
    return deleted;
  }

  // ─── div 与 topology 双向 sync ───────────────────────────

  // 给 division 的某 ring 写入 vids·从 polygon 坐标 → vid array
  // 含 snap·近 existing vertex 复用
  function ringToVids(map, division, kind, polyIdx, points){
    var vids = [];
    points.forEach(function(p, i){
      var existingVid = findNearbyVertex(map, p[0], p[1]);
      var vid;
      if (existingVid){
        vid = existingVid;
      } else {
        vid = addVertex(map, p[0], p[1]);
      }
      vids.push(vid);
      addUsage(map, vid, division.id, kind, polyIdx, i);
    });
    return vids;
  }

  // 从 vid array 解析回 [[x,y],...] 用于 cache
  function vidsToCoords(map, vids){
    var t = ensureTopology(map);
    return vids.map(function(vid){
      var v = t.vertices[vid];
      return v ? [v[0], v[1]] : [0, 0];
    });
  }

  // 把 division 的 polygon / extraPolygons / holes 全 sync 到 topology
  // 调时机·migrate (一次性)·或新 div 加入时
  function syncDivisionToTopology(map, division){
    // 主 polygon
    if (division.polygon && division.polygon.length){
      // 先清旧 usage (此 div main)
      clearUsageOf(map, division.id, 'main', 0);
      division.polygonVids = ringToVids(map, division, 'main', 0, division.polygon);
    } else {
      division.polygonVids = [];
    }
    // extraPolygons
    division.extraPolygonsVids = [];
    if (division.extraPolygons && division.extraPolygons.length){
      division.extraPolygons.forEach(function(p, i){
        clearUsageOf(map, division.id, 'extra', i);
        division.extraPolygonsVids.push(ringToVids(map, division, 'extra', i, p));
      });
    }
    // holes
    division.holesVids = [];
    if (division.holes && division.holes.length){
      division.holes.forEach(function(p, i){
        clearUsageOf(map, division.id, 'hole', i);
        division.holesVids.push(ringToVids(map, division, 'hole', i, p));
      });
    }
  }

  // 清此 div + kind + polyIdx 在 topology 中 usage
  function clearUsageOf(map, divId, kind, polyIdx){
    var t = ensureTopology(map);
    Object.keys(t.usage).forEach(function(vid){
      t.usage[vid] = t.usage[vid].filter(function(k){
        var p = parseUsageKey(k);
        return !(p.divId === divId && p.kind === kind && p.polyIdx === polyIdx);
      });
    });
  }

  // 反方向·从 polygonVids 重建 polygon 坐标 cache
  function rebuildDivisionCoords(map, division){
    if (division.polygonVids){
      division.polygon = vidsToCoords(map, division.polygonVids);
    }
    if (division.extraPolygonsVids){
      division.extraPolygons = division.extraPolygonsVids.map(function(vids){
        return vidsToCoords(map, vids);
      });
    }
    if (division.holesVids){
      division.holes = division.holesVids.map(function(vids){
        return vidsToCoords(map, vids);
      });
    }
  }

  // ─── migration·polygon → topology ───────────────────────

  // 把当前所有 division 的 polygon 化为共享 vertex 拓扑
  // dedup snapDist 内的顶点
  function migrateToTopology(snapDist){
    snapDist = snapDist || SNAP_DIST;
    var map = ME.EDITOR.map;
    var t = ensureTopology(map);
    if (t.enabled){
      console.warn('[topology] already enabled');
      return { migrated: 0 };
    }

    // 重置 topology + grid
    t.vertices = {};
    t.usage = {};
    t.nextVid = 1;
    t.enabled = true;
    defineGrid(t, { cells: {}, cellSize: GRID_CELL });

    var divs = map.divisions;
    var nVerts = 0;
    divs.forEach(function(d){
      syncDivisionToTopology(map, d);
      nVerts += (d.polygonVids || []).length;
      (d.extraPolygonsVids || []).forEach(function(vs){ nVerts += vs.length; });
      (d.holesVids || []).forEach(function(vs){ nVerts += vs.length; });
    });

    var nUnique = Object.keys(t.vertices).length;
    var dedupRatio = nVerts > 0 ? (1 - nUnique / nVerts) : 0;

    return {
      migrated: divs.length,
      totalVerts: nVerts,
      uniqueVerts: nUnique,
      dedupRatio: dedupRatio,
      saved: nVerts - nUnique
    };
  }

  function disableTopology(){
    var map = ME.EDITOR.map;
    if (!map.topology || !map.topology.enabled) return;
    // 重建 polygon 坐标·清 vids array 和 topology
    map.divisions.forEach(function(d){
      if (d.polygonVids) d.polygon = vidsToCoords(map, d.polygonVids);
      if (d.extraPolygonsVids){
        d.extraPolygons = d.extraPolygonsVids.map(function(vids){ return vidsToCoords(map, vids); });
      }
      if (d.holesVids){
        d.holes = d.holesVids.map(function(vids){ return vidsToCoords(map, vids); });
      }
      delete d.polygonVids;
      delete d.extraPolygonsVids;
      delete d.holesVids;
    });
    map.topology.enabled = false;
    map.topology.vertices = {};
    map.topology.usage = {};
    defineGrid(map.topology, { cells: {}, cellSize: GRID_CELL });
  }

  // ─── topology-aware vertex move / propagate ─────────────

  // 当用户拖一个 vertex·更新 topology.vertices[vid]·然后 propagate 到所有用此 vid 的 polygon
  function moveVertexAndPropagate(vid, newX, newY){
    var map = ME.EDITOR.map;
    var t = ensureTopology(map);
    if (!t.vertices[vid]) return false;

    moveVertex(map, vid, newX, newY);

    // 找用此 vid 的所有 div·重建坐标
    var users = (t.usage[vid] || []).map(parseUsageKey);
    var affected = {};
    users.forEach(function(u){ affected[u.divId] = true; });

    Object.keys(affected).forEach(function(divId){
      var d = map.divisions.find(function(D){ return D.id === divId; });
      if (d){
        rebuildDivisionCoords(map, d);
        ME.recomputeDerived(d);
      }
    });

    return true;
  }

  // 按 ring 类型 + polyIdx + vertexIdx 取 vid (反 lookup)
  function getVidAt(division, kind, polyIdx, vertexIdx){
    if (kind === 'main')   return (division.polygonVids || [])[vertexIdx];
    if (kind === 'extra')  return ((division.extraPolygonsVids || [])[polyIdx] || [])[vertexIdx];
    if (kind === 'hole')   return ((division.holesVids || [])[polyIdx] || [])[vertexIdx];
    return null;
  }

  // 删除 ring 中 vertex (从 vid array)·若 vid 被孤立·GC
  function removeVertexFromRing(division, kind, polyIdx, vertexIdx){
    var map = ME.EDITOR.map;
    var arr;
    if (kind === 'main')   arr = division.polygonVids;
    else if (kind === 'extra') arr = (division.extraPolygonsVids || [])[polyIdx];
    else if (kind === 'hole')  arr = (division.holesVids || [])[polyIdx];
    if (!arr || !arr[vertexIdx]) return false;

    var vid = arr[vertexIdx];
    arr.splice(vertexIdx, 1);
    removeUsage(map, vid, division.id, kind, polyIdx, vertexIdx);

    // 重映 usage·后续 vertexIdx 减 1
    reindexUsageAfterDelete(map, division.id, kind, polyIdx, vertexIdx);

    // GC if orphan
    if ((map.topology.usage[vid] || []).length === 0){
      deleteVertex(map, vid);
    }
    rebuildDivisionCoords(map, division);
    return true;
  }

  // 删 vertexIdx 后·所有 vid 的 usage 中 vertexIdx 大于此的 -1
  function reindexUsageAfterDelete(map, divId, kind, polyIdx, deletedIdx){
    var t = ensureTopology(map);
    Object.keys(t.usage).forEach(function(vid){
      t.usage[vid] = t.usage[vid].map(function(k){
        var p = parseUsageKey(k);
        if (p.divId === divId && p.kind === kind && p.polyIdx === polyIdx && p.vertexIdx > deletedIdx){
          return usageKey(divId, kind, polyIdx, p.vertexIdx - 1);
        }
        return k;
      });
    });
  }

  // 在 ring 中 idx 位置插入新 vertex·snap 或 create new vid
  function insertVertexIntoRing(division, kind, polyIdx, vertexIdx, x, y){
    var map = ME.EDITOR.map;
    var arr;
    if (kind === 'main')   arr = division.polygonVids;
    else if (kind === 'extra') arr = (division.extraPolygonsVids || [])[polyIdx];
    else if (kind === 'hole')  arr = (division.holesVids || [])[polyIdx];
    if (!arr) return false;

    // snap or new
    var existingVid = findNearbyVertex(map, x, y);
    var vid = existingVid || addVertex(map, x, y);
    arr.splice(vertexIdx, 0, vid);

    // reindex usage·后续 idx 大 +1
    reindexUsageAfterInsert(map, division.id, kind, polyIdx, vertexIdx);

    addUsage(map, vid, division.id, kind, polyIdx, vertexIdx);
    rebuildDivisionCoords(map, division);
    return true;
  }

  function reindexUsageAfterInsert(map, divId, kind, polyIdx, insertedIdx){
    var t = ensureTopology(map);
    Object.keys(t.usage).forEach(function(vid){
      t.usage[vid] = t.usage[vid].map(function(k){
        var p = parseUsageKey(k);
        if (p.divId === divId && p.kind === kind && p.polyIdx === polyIdx && p.vertexIdx >= insertedIdx){
          return usageKey(divId, kind, polyIdx, p.vertexIdx + 1);
        }
        return k;
      });
    });
  }

  // 给 division 删除前调·清 usage + GC
  function removeDivisionFromTopology(divId){
    var map = ME.EDITOR.map;
    if (!map.topology || !map.topology.enabled) return;
    var d = map.divisions.find(function(D){ return D.id === divId; });
    var allVids = collectAllVids(d);
    clearUsage(map, divId);
    // GC
    allVids.forEach(function(vid){
      if ((map.topology.usage[vid] || []).length === 0){
        deleteVertex(map, vid);
      }
    });
  }

  function collectAllVids(div){
    if (!div) return [];
    var arr = [];
    if (div.polygonVids) arr = arr.concat(div.polygonVids);
    if (div.extraPolygonsVids) div.extraPolygonsVids.forEach(function(a){ arr = arr.concat(a); });
    if (div.holesVids) div.holesVids.forEach(function(a){ arr = arr.concat(a); });
    return arr;
  }

  // ─── 计数·UI 显示 ──────────────────────────────────────

  function getStats(){
    var map = ME.EDITOR.map;
    if (!map.topology || !map.topology.enabled){
      return { enabled: false, vertices: 0, sharedRatio: 0, totalUses: 0 };
    }
    var t = map.topology;
    var nVerts = Object.keys(t.vertices).length;
    var totalUses = 0;
    var sharedVerts = 0;
    Object.keys(t.usage).forEach(function(vid){
      var n = t.usage[vid].length;
      totalUses += n;
      if (n > 1) sharedVerts++;
    });
    return {
      enabled: true,
      vertices: nVerts,
      sharedVerts: sharedVerts,
      sharedRatio: nVerts > 0 ? sharedVerts / nVerts : 0,
      totalUses: totalUses,
      avgUses: nVerts > 0 ? totalUses / nVerts : 0
    };
  }

  // expose
  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.topology = {
    SNAP_DIST: SNAP_DIST,
    ensureTopology: ensureTopology,
    isEnabled: isEnabled,

    addVertex: addVertex,
    getVertex: getVertex,
    moveVertex: moveVertex,
    deleteVertex: deleteVertex,
    findNearbyVertex: findNearbyVertex,

    addUsage: addUsage,
    removeUsage: removeUsage,

    syncDivisionToTopology: syncDivisionToTopology,
    rebuildDivisionCoords: rebuildDivisionCoords,
    moveVertexAndPropagate: moveVertexAndPropagate,
    getVidAt: getVidAt,
    removeVertexFromRing: removeVertexFromRing,
    insertVertexIntoRing: insertVertexIntoRing,
    removeDivisionFromTopology: removeDivisionFromTopology,

    migrateToTopology: migrateToTopology,
    disableTopology: disableTopology,
    gcOrphans: gcOrphans,
    getStats: getStats,
    gridRebuild: gridRebuild
  };

})(typeof window !== 'undefined' ? window : this);
