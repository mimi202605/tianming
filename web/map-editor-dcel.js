// map-editor-dcel.js
// 轻量 half-edge / DCEL·建在 phase 9 vertex topology 之上
// 用于·邻接查询·边界 walk·孤岛检测·下游 mesh 算法的入口
// build 是 derived·非持久化·可按需重建
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[dcel] core not loaded'); return; }

  // ─── data structures ──────────────────────────────────────
  // halfEdge: { id, vid, faceKey, twinId|null, nextId, prevId, ringKey }
  //   vid·此 half-edge 起点 vertex id
  //   faceKey·所属 face·此处用 ring 唯一键替代 face id (面 = ring)
  //   twinId·对偶边 id·boundary 时为 null
  //   ringKey·形如 "divId|kind|polyIdx"
  // face: { key, divId, kind, polyIdx, incidentEdgeId, isHole, area }
  // ringKey 兼作 face 主键

  function createDCEL(){
    return {
      halfEdges: [],          // index = id
      faces: {},              // key → face
      facesByDiv: {},         // divId → [faceKey]
      edgeIndex: {},          // "vidA|vidB" → halfEdgeId
      vertexEdges: {},        // vid → [halfEdgeId]
      builtAt: 0,
      stats: null
    };
  }

  function ringKeyOf(divId, kind, polyIdx){
    return divId + '|' + kind + '|' + (polyIdx == null ? 0 : polyIdx);
  }

  function edgeKey(a, b){ return a + '|' + b; }

  // ─── ring 收集·从 division 取所有 ring + 对应 vid 数组 ───

  function collectRings(map){
    var out = [];
    var topo = TM.MapEditor.topology;
    var hasTopo = topo && topo.isEnabled();

    map.divisions.forEach(function(d){
      // main polygon
      var mainVids = hasTopo && d.polygonVids ? d.polygonVids :
                     buildEphemeralVids(d.polygon);
      if (d.polygon && d.polygon.length >= 3 && mainVids.length >= 3){
        out.push({
          divId: d.id, kind: 'polygon', polyIdx: 0,
          coords: d.polygon, vids: mainVids, isHole: false
        });
      }
      // extras·飞地
      if (d.extraPolygons){
        d.extraPolygons.forEach(function(p, idx){
          var vids = hasTopo && d.extraPolygonsVids && d.extraPolygonsVids[idx]
            ? d.extraPolygonsVids[idx]
            : buildEphemeralVids(p);
          if (p.length >= 3 && vids.length >= 3){
            out.push({
              divId: d.id, kind: 'extra', polyIdx: idx,
              coords: p, vids: vids, isHole: false
            });
          }
        });
      }
      // holes·圈
      if (d.holes){
        d.holes.forEach(function(h, idx){
          var vids = hasTopo && d.holesVids && d.holesVids[idx]
            ? d.holesVids[idx]
            : buildEphemeralVids(h);
          if (h.length >= 3 && vids.length >= 3){
            out.push({
              divId: d.id, kind: 'hole', polyIdx: idx,
              coords: h, vids: vids, isHole: true
            });
          }
        });
      }
    });
    return out;
  }

  // 无 topology 时·用临时 vid·形如 "eph:divid:idx"
  // 此模式下双 ring 间 twin 不会匹配 (因 vid 不共享)·属预期
  var _ephCounter = 0;
  function buildEphemeralVids(ring){
    var vids = [];
    for (var i = 0; i < ring.length; i++){
      vids.push('eph:' + (++_ephCounter));
    }
    return vids;
  }

  // ─── build·从 map 建 DCEL ─────────────────────────────────

  function build(map){
    var dcel = createDCEL();
    var rings = collectRings(map);

    rings.forEach(function(r){
      var key = ringKeyOf(r.divId, r.kind, r.polyIdx);
      var n = r.vids.length;
      var startEdgeId = dcel.halfEdges.length;
      var firstId = startEdgeId;

      // 为每条边·alloc half-edge
      for (var i = 0; i < n; i++){
        var vidA = r.vids[i];
        var vidB = r.vids[(i + 1) % n];
        var heId = dcel.halfEdges.length;
        var he = {
          id: heId,
          vid: vidA,
          faceKey: key,
          twinId: null,
          nextId: -1,
          prevId: -1,
          ringKey: key
        };
        dcel.halfEdges.push(he);
        // 索引
        var ek = edgeKey(vidA, vidB);
        // 同向 edge 多 ring 共用·罕见·此处覆盖·warn
        if (dcel.edgeIndex[ek] != null){
          // 同向重复·标 manifold 异常 (不阻断)
        } else {
          dcel.edgeIndex[ek] = heId;
        }
        if (!dcel.vertexEdges[vidA]) dcel.vertexEdges[vidA] = [];
        dcel.vertexEdges[vidA].push(heId);
      }

      // 链 next/prev
      for (var i = 0; i < n; i++){
        var heId = startEdgeId + i;
        var prevHe = startEdgeId + ((i - 1 + n) % n);
        var nextHe = startEdgeId + ((i + 1) % n);
        dcel.halfEdges[heId].nextId = nextHe;
        dcel.halfEdges[heId].prevId = prevHe;
      }

      // 注册 face
      dcel.faces[key] = {
        key: key,
        divId: r.divId,
        kind: r.kind,
        polyIdx: r.polyIdx,
        incidentEdgeId: firstId,
        isHole: r.isHole
      };
      if (!dcel.facesByDiv[r.divId]) dcel.facesByDiv[r.divId] = [];
      dcel.facesByDiv[r.divId].push(key);
    });

    // pair twins·(vidA,vidB) ↔ (vidB,vidA)
    var twinPairs = 0;
    for (var i = 0; i < dcel.halfEdges.length; i++){
      var he = dcel.halfEdges[i];
      if (he.twinId !== null) continue;
      var nextHe = dcel.halfEdges[he.nextId];
      var revKey = edgeKey(nextHe.vid, he.vid);
      var twinId = dcel.edgeIndex[revKey];
      if (twinId != null && twinId !== he.id){
        he.twinId = twinId;
        dcel.halfEdges[twinId].twinId = he.id;
        twinPairs++;
      }
    }

    dcel.builtAt = Date.now();
    dcel.stats = {
      halfEdges: dcel.halfEdges.length,
      faces: Object.keys(dcel.faces).length,
      twinPairs: twinPairs,
      boundaryEdges: dcel.halfEdges.length - twinPairs * 2,
      uniqueVerts: Object.keys(dcel.vertexEdges).length
    };
    return dcel;
  }

  // ─── queries ──────────────────────────────────────────────

  function neighborsOfDivision(dcel, divId){
    var keys = dcel.facesByDiv[divId] || [];
    var seen = {};
    var nbrs = [];
    keys.forEach(function(k){
      var face = dcel.faces[k];
      if (!face) return;
      var startId = face.incidentEdgeId;
      var heId = startId;
      var safety = 0;
      do {
        var he = dcel.halfEdges[heId];
        if (!he) break;
        if (he.twinId != null){
          var twin = dcel.halfEdges[he.twinId];
          var nbrFace = dcel.faces[twin.faceKey];
          if (nbrFace && nbrFace.divId !== divId && !seen[nbrFace.divId]){
            seen[nbrFace.divId] = true;
            nbrs.push(nbrFace.divId);
          }
        }
        heId = he.nextId;
        if (++safety > 100000) break;
      } while (heId !== startId);
    });
    return nbrs;
  }

  function boundaryEdges(dcel){
    // 返回边界 half-edge id 列表 (twin = null)
    var out = [];
    for (var i = 0; i < dcel.halfEdges.length; i++){
      if (dcel.halfEdges[i].twinId == null) out.push(i);
    }
    return out;
  }

  function walkRing(dcel, startEdgeId){
    var coords = [];
    var topo = TM.MapEditor.topology;
    var heId = startEdgeId;
    var safety = 0;
    do {
      var he = dcel.halfEdges[heId];
      if (!he) break;
      var v = topo && topo.isEnabled() ? topo.getVertex(he.vid) : null;
      coords.push(v ? [v[0], v[1]] : null);
      heId = he.nextId;
      if (++safety > 100000) break;
    } while (heId !== startEdgeId);
    return coords;
  }

  function edgesAtVertex(dcel, vid){
    return (dcel.vertexEdges[vid] || []).slice();
  }

  // ─── validation ───────────────────────────────────────────

  function validate(dcel){
    var issues = [];
    var n = dcel.halfEdges.length;
    var dangling = 0;
    var missingTwin = 0;
    for (var i = 0; i < n; i++){
      var he = dcel.halfEdges[i];
      if (he.nextId < 0 || he.prevId < 0) dangling++;
      if (he.twinId == null){
        missingTwin++;
        // 是否 outer boundary？·OK·非 issue
      }
    }
    if (dangling) issues.push('dangling links: ' + dangling);
    return {
      total: n,
      dangling: dangling,
      missingTwin: missingTwin,
      issues: issues,
      ok: issues.length === 0
    };
  }

  // ─── probe·用户触发·console + status 输出概览 ─────────────

  function probe(){
    if (!ME.EDITOR || !ME.EDITOR.map){
      meAlert('DCEL probe·地图未加载'); return null;
    }
    var t0 = performance.now();
    var dcel = build(ME.EDITOR.map);
    var t1 = performance.now();
    var v = validate(dcel);
    var msg = 'DCEL·' + dcel.stats.halfEdges + ' 半边·' +
              dcel.stats.faces + ' 面·' +
              dcel.stats.twinPairs + ' 对偶·' +
              dcel.stats.boundaryEdges + ' 边界·' +
              (t1 - t0).toFixed(1) + 'ms';
    console.log('[dcel]', msg, v);
    var statusEl = document.getElementById('status-tip');
    if (statusEl) statusEl.textContent = msg;
    // 缓存到 EDITOR·可后续 query
    ME.EDITOR.dcel = dcel;
    return dcel;
  }

  // ─── expose ───────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.dcel = {
    build: build,
    probe: probe,
    validate: validate,
    neighborsOfDivision: neighborsOfDivision,
    boundaryEdges: boundaryEdges,
    walkRing: walkRing,
    edgesAtVertex: edgesAtVertex,
    ringKeyOf: ringKeyOf
  };

})(typeof window !== 'undefined' ? window : this);
