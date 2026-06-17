// map-editor-arealinks.js
// 邻接图持久化·AreaLink graph·借鉴 SGGameEditor AreaLinkEntity
// + PackColor / colorKey 反查·bitmap-recognize O(1) 颜色 → divId
//
// schema·添到 map·
//   map.areaLinks = [{ id, areaA, areaB, linkType, boundaryHint? }]
//   map.colorKeyMap = (运行时·非持久·从 division.colorKey 重建)
//   division.colorKey = number (24-bit BGR packed·唯一·持久化)
//
// linkType·'land' (默) / 'water' (水隔) / 'mountain' (山隔) / 'pass' (关津) / 'ferry' (渡)
//
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[arealinks] core not loaded'); return; }

  var LINK_TYPES = {
    land:     { label: '陆邻',  color: '#5a7a9e', dash: [] },
    water:    { label: '水隔',  color: '#5aa6c8', dash: [4, 4] },
    mountain: { label: '山隔',  color: '#8a8378', dash: [2, 4] },
    pass:     { label: '关津',  color: '#d4a017', dash: [] },
    ferry:    { label: '渡口',  color: '#7ab8d8', dash: [10, 4] }
  };

  // ─── color packing·BGR 24-bit·一个 24-bit number ────────

  function pack(r, g, b){
    // 0xRRGGBB·24 bit
    return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
  }
  function unpack(key){
    return [(key >> 16) & 0xff, (key >> 8) & 0xff, key & 0xff];
  }
  function packBGRA(b, g, r, a){
    // 兼容 raster BGRA 序·a 仅作 mask·返 24-bit RGB key
    return pack(r, g, b);
  }

  // ─── 唯一 colorKey 分配 ──────────────────────────────────

  // 黑 (0x000000) 留给水/空·白 (0xffffff) 留给纸·跳过
  function isReservedKey(k){
    return k === 0x000000 || k === 0xffffff;
  }

  function nextSequentialKey(usedSet){
    // 从 0x100001 开始顺序分配·保留空间足够 (>1.6 千万)
    var k = 0x100001;
    while (usedSet[k] || isReservedKey(k)) k++;
    return k;
  }

  // 给所有 division 分配 colorKey·已有的不动·缺的补
  function assignColorKeys(map){
    map = map || ME.EDITOR.map;
    var used = {};
    map.divisions.forEach(function(d){
      if (typeof d.colorKey === 'number' && !isReservedKey(d.colorKey)){
        used[d.colorKey] = true;
      }
    });
    var assigned = 0;
    map.divisions.forEach(function(d){
      if (typeof d.colorKey !== 'number' || isReservedKey(d.colorKey)){
        var k = nextSequentialKey(used);
        d.colorKey = k;
        used[k] = true;
        assigned++;
      }
    });
    return assigned;
  }

  // 重新分配 (强制)·新 colorKey 序列
  function regenerateColorKeys(map){
    map = map || ME.EDITOR.map;
    map.divisions.forEach(function(d){ delete d.colorKey; });
    return assignColorKeys(map);
  }

  // ─── colorKey → divId Dictionary (derived) ──────────────

  function buildColorKeyIndex(map){
    map = map || ME.EDITOR.map;
    var idx = {};
    map.divisions.forEach(function(d){
      if (typeof d.colorKey === 'number') idx[d.colorKey] = d.id;
    });
    map._colorKeyIndex = idx;
    return idx;
  }

  function getDivisionByColorKey(map, key){
    map = map || ME.EDITOR.map;
    if (!map._colorKeyIndex) buildColorKeyIndex(map);
    var divId = map._colorKeyIndex[key];
    if (!divId) return null;
    return map.divisions.find(function(d){ return d.id === divId; }) || null;
  }

  function getDivisionByRGB(map, r, g, b){
    return getDivisionByColorKey(map, pack(r, g, b));
  }

  // ─── AreaLink graph ─────────────────────────────────────

  function ensureGraph(map){
    map = map || ME.EDITOR.map;
    if (!map.areaLinks) map.areaLinks = [];
    return map.areaLinks;
  }

  function linkKey(a, b){
    // 规范化·小 id 放前·避免重复
    return a < b ? a + '|' + b : b + '|' + a;
  }
  function nextLinkId(map){
    map._linkSeq = (map._linkSeq || 0) + 1;
    return 'al_' + map._linkSeq.toString(36);
  }

  function findLink(map, a, b){
    map = map || ME.EDITOR.map;
    var k = linkKey(a, b);
    return (map.areaLinks || []).find(function(l){
      return linkKey(l.areaA, l.areaB) === k;
    }) || null;
  }

  function addLink(map, a, b, linkType, boundaryHint){
    map = map || ME.EDITOR.map;
    if (a === b) return null;
    ensureGraph(map);
    var existing = findLink(map, a, b);
    if (existing){
      if (linkType) existing.linkType = linkType;
      if (boundaryHint) existing.boundaryHint = boundaryHint;
      return existing;
    }
    var l = {
      id: nextLinkId(map),
      areaA: a < b ? a : b,
      areaB: a < b ? b : a,
      linkType: linkType || 'land',
      boundaryHint: boundaryHint || null
    };
    map.areaLinks.push(l);
    return l;
  }

  function removeLink(map, a, b){
    map = map || ME.EDITOR.map;
    if (!map.areaLinks) return false;
    var k = linkKey(a, b);
    var i = map.areaLinks.findIndex(function(l){ return linkKey(l.areaA, l.areaB) === k; });
    if (i < 0) return false;
    map.areaLinks.splice(i, 1);
    return true;
  }

  function setLinkType(map, a, b, type){
    var l = findLink(map, a, b);
    if (!l) return false;
    l.linkType = type;
    return true;
  }

  // 列出某 division 的所有 link
  function linksFor(map, divId){
    map = map || ME.EDITOR.map;
    return (map.areaLinks || []).filter(function(l){
      return l.areaA === divId || l.areaB === divId;
    });
  }

  function neighborsOf(map, divId){
    return linksFor(map, divId).map(function(l){
      return l.areaA === divId ? l.areaB : l.areaA;
    });
  }

  // ─── 自动重算·从 polygon adjacency 同步 graph ────────────

  // 借用 neighbor.computeAll·入 map·把结果烤成 areaLinks
  // strategy: 'preserve' (默·已存 link 保留原 type)·'overwrite' (重设 land)
  function recomputeFromNeighbors(opts){
    opts = opts || {};
    var strategy = opts.strategy || 'preserve';
    var map = ME.EDITOR.map;
    var NB = global.TM && TM.MapEditor.neighbor;
    if (!NB){ console.error('[arealinks] neighbor 未加载'); return null; }

    var nbMap = NB.computeAll();
    var oldLinks = map.areaLinks || [];
    var oldByKey = {};
    oldLinks.forEach(function(l){ oldByKey[linkKey(l.areaA, l.areaB)] = l; });

    var newLinks = [];
    var seen = {};
    Object.keys(nbMap).forEach(function(divA){
      (nbMap[divA] || []).forEach(function(divB){
        var k = linkKey(divA, divB);
        if (seen[k]) return;
        seen[k] = true;
        var existing = oldByKey[k];
        if (existing && strategy === 'preserve'){
          newLinks.push(existing);
        } else {
          newLinks.push({
            id: existing ? existing.id : nextLinkId(map),
            areaA: divA < divB ? divA : divB,
            areaB: divA < divB ? divB : divA,
            linkType: existing && strategy === 'preserve' ? existing.linkType : 'land',
            boundaryHint: existing ? existing.boundaryHint : null
          });
        }
      });
    });

    var stats = {
      old: oldLinks.length,
      neu: newLinks.length,
      added: newLinks.length - Object.keys(seen).filter(function(k){ return oldByKey[k]; }).length,
      removed: oldLinks.length - Object.keys(oldByKey).filter(function(k){ return seen[k]; }).length
    };

    ME.commitMutation('areaLinks 重算·' + newLinks.length + ' 链', function(){
      map.areaLinks = newLinks;
      // 同步 division.neighbors (向后兼容)·neighbor.applyAll 已写过·此处再保险
      map.divisions.forEach(function(d){ d.neighbors = neighborsOf(map, d.id); });
    });
    return stats;
  }

  // ─── render·debug 链可视 ───────────────────────────────

  function renderLinks(ctx, camera){
    var map = ME.EDITOR.map;
    if (!ME.EDITOR.layers.areaLinks) return;
    if (!map.areaLinks || !map.areaLinks.length) return;
    var z = camera.zoom;

    map.areaLinks.forEach(function(l){
      var a = map.divisions.find(function(d){ return d.id === l.areaA; });
      var b = map.divisions.find(function(d){ return d.id === l.areaB; });
      if (!a || !b || !a.centroid || !b.centroid) return;

      var t = LINK_TYPES[l.linkType] || LINK_TYPES.land;
      ctx.beginPath();
      ctx.moveTo(a.centroid[0], a.centroid[1]);
      ctx.lineTo(b.centroid[0], b.centroid[1]);
      ctx.lineWidth = 1.5 / z;
      ctx.strokeStyle = t.color + 'b0';
      if (t.dash.length) ctx.setLineDash(t.dash.map(function(v){ return v / z; }));
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  // ─── stats ──────────────────────────────────────────────

  function getStats(){
    var map = ME.EDITOR.map;
    var n = (map.areaLinks || []).length;
    var byType = {};
    (map.areaLinks || []).forEach(function(l){
      byType[l.linkType] = (byType[l.linkType] || 0) + 1;
    });
    return {
      total: n,
      byType: byType,
      uniqueDivs: map.divisions.length,
      coloredDivs: map.divisions.filter(function(d){ return typeof d.colorKey === 'number'; }).length
    };
  }

  // ─── expose ─────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.arealinks = {
    LINK_TYPES: LINK_TYPES,

    // color
    pack: pack,
    unpack: unpack,
    packBGRA: packBGRA,
    isReservedKey: isReservedKey,
    assignColorKeys: assignColorKeys,
    regenerateColorKeys: regenerateColorKeys,
    buildColorKeyIndex: buildColorKeyIndex,
    getDivisionByColorKey: getDivisionByColorKey,
    getDivisionByRGB: getDivisionByRGB,

    // graph
    ensureGraph: ensureGraph,
    findLink: findLink,
    addLink: addLink,
    removeLink: removeLink,
    setLinkType: setLinkType,
    linksFor: linksFor,
    neighborsOf: neighborsOf,
    recomputeFromNeighbors: recomputeFromNeighbors,

    // render + stats
    renderLinks: renderLinks,
    getStats: getStats
  };

})(typeof window !== 'undefined' ? window : this);
