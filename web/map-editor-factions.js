// map-editor-factions.js
// Phase 25.1·势力 (faction) 注册中心
//
// faction = 一支政治实体·明/后金/大顺/蒙古土默特部/葡萄牙·...
// 与 autonomy.type (zhixia/fanguo/...) 解耦
//   autonomy = 关系 (中央 vs 藩 vs 羁縻)
//   faction  = 谁
// division.factionId 指实体·inkRealm 用其 color 上色
//
// 持久化·map.factions = [{id, name, shortName, color, type, parent, capitalDivId}]
//
// 2026-05-08

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[factions] core not loaded'); return; }

  // ─── store ─────────────────────────────────────────────

  // 取 / 存 都直接走 ME.EDITOR.map.factions
  // 保 schema·initMap 时挂上空数组

  function _arr(){
    var map = ME.EDITOR.map;
    if (!map.factions) map.factions = [];
    return map.factions;
  }

  // ─── CRUD ──────────────────────────────────────────────

  function add(spec){
    if (!spec || !spec.id) throw new Error('faction.add·需 id');
    var arr = _arr();
    if (arr.some(function(f){ return f.id === spec.id; })){
      // 已有·返
      return get(spec.id);
    }
    var f = {
      id:       spec.id,
      name:     spec.name || spec.id,
      shortName:spec.shortName || (spec.name ? spec.name.charAt(0) : '?'),
      color:    spec.color || '#888888',
      type:     spec.type || 'kingdom',   // kingdom / tribe / city / power
      parent:   spec.parent || null,
      capital:  spec.capital || null,     // 都城 division id
      desc:     spec.desc || ''
    };
    arr.push(f);
    return f;
  }

  function get(id){
    if (!id) return null;
    return _arr().filter(function(f){ return f.id === id; })[0] || null;
  }

  function list(){ return _arr().slice(); }

  function update(id, patch){
    var f = get(id);
    if (!f) return null;
    Object.keys(patch || {}).forEach(function(k){
      if (k === 'id') return;
      f[k] = patch[k];
    });
    return f;
  }

  function remove(id){
    var arr = _arr();
    var idx = arr.findIndex(function(f){ return f.id === id; });
    if (idx < 0) return false;
    arr.splice(idx, 1);
    // 清 division.factionId
    var divs = ME.EDITOR.map.divisions || [];
    divs.forEach(function(d){
      if (d.factionId === id) d.factionId = null;
    });
    return true;
  }

  function clearAll(){
    if (ME.EDITOR.map.factions) ME.EDITOR.map.factions.length = 0;
  }

  function bulkLoad(arr){
    clearAll();
    (arr || []).forEach(function(spec){ add(spec); });
  }

  // ─── 取省的 faction (含 fallback) ───────────────────

  // d.factionId·若设 → 直查·否则 null·上层 (inkRealm) fallback autonomy
  function getDivisionFaction(d){
    if (!d || !d.factionId) return null;
    return get(d.factionId);
  }

  // 设省 factionId·走 commit (有 history)
  function setDivisionFaction(d, factionId, opts){
    if (!d) return;
    var newId = factionId || null;
    var oldId = d.factionId || null;
    if (oldId === newId) return;
    var f = newId ? get(newId) : null;
    var label = '改属·' + (d.name || d.id) + ' → ' + (f ? f.name : '(无)');
    if (ME.commitMutation && !(opts && opts.silent)){
      ME.commitMutation(label, function(){
        d.factionId = newId;
      });
    } else {
      d.factionId = newId;
    }
    ME.requestRender();
  }

  // ─── helpers ───────────────────────────────────────────

  // 取该 faction 治下省数 + 总面积
  function statsByFaction(fid){
    var divs = ME.EDITOR.map.divisions || [];
    var n = 0, area = 0;
    divs.forEach(function(d){
      if (d.factionId === fid){
        n++;
        area += d.area || 0;
      }
    });
    return { count: n, area: area };
  }

  // 取该省所属 faction 的 color (含 fallback)
  // 若有 factionId → 用·否则 null
  function colorOfDivision(d){
    var f = getDivisionFaction(d);
    return f ? f.color : null;
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.factions = {
    add: add,
    get: get,
    list: list,
    update: update,
    remove: remove,
    clearAll: clearAll,
    bulkLoad: bulkLoad,
    getDivisionFaction: getDivisionFaction,
    setDivisionFaction: setDivisionFaction,
    statsByFaction: statsByFaction,
    colorOfDivision: colorOfDivision
  };

})(typeof window !== 'undefined' ? window : this);
