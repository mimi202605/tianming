// map-editor-timeline.js
// 时序数据模型·每 division 的 timeline 快照
// 状态解析·  base + 累积 patches (year ≤ currentYear)
// active 区间· establishedYear ≤ Y < abolishedYear
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[timeline] core not loaded'); return; }

  // ─── data model ───────────────────────────────────────────

  // 给定 division 在 year 的有效状态·null 若未生效 / 已废
  // 每 timeline entry 是 { year, ...partial fields } 增量 patch
  function getStateAt(division, year){
    if (year == null) return division;  // no time mode·返回 base
    if (division.establishedYear != null && year < division.establishedYear) return null;
    if (division.abolishedYear != null && year >= division.abolishedYear) return null;

    // start with base
    var state = Object.assign({}, division);

    // apply patches in chronological order
    var sorted = (division.timeline || []).slice().sort(function(a,b){ return a.year - b.year; });
    for (var i = 0; i < sorted.length; i++){
      var s = sorted[i];
      if (s.year > year) break;
      // shallow merge·nested objects 直接覆盖 (timeline 通常只触关键字段)
      Object.keys(s).forEach(function(k){
        if (k === 'year') return;
        state[k] = s[k];
      });
    }

    // 若 patch 内有 abolishedYear ≤ year·已废
    if (state.abolishedYear != null && year >= state.abolishedYear) return null;

    return state;
  }

  function isActiveAt(division, year){
    return getStateAt(division, year) !== null;
  }

  // 收集所有 division 在指定 year 的 active states
  function getActiveDivisionsAt(year){
    var divs = ME.EDITOR.map.divisions;
    var result = [];
    divs.forEach(function(d){
      var s = getStateAt(d, year);
      if (s) result.push({ id: d.id, base: d, state: s });
    });
    return result;
  }

  // 收集全部 division 涉及到的关键 year (establishedYear / abolishedYear / each timeline year)
  function collectKeyYears(){
    var years = {};
    var divs = ME.EDITOR.map.divisions;
    divs.forEach(function(d){
      if (d.establishedYear != null) years[d.establishedYear] = true;
      if (d.abolishedYear != null) years[d.abolishedYear] = true;
      (d.timeline || []).forEach(function(s){
        if (s.year != null) years[s.year] = true;
      });
    });
    return Object.keys(years).map(Number).sort(function(a,b){ return a - b; });
  }

  // ─── snapshot CRUD ───────────────────────────────────────

  function addSnapshot(divId, snapshot){
    if (!snapshot || snapshot.year == null){
      console.error('[timeline] snapshot needs year');
      return false;
    }
    ME.commitMutation('add snapshot ' + snapshot.year, function(){
      var d = ME.EDITOR.map.divisions.find(function(D){ return D.id === divId; });
      if (!d) return;
      d.timeline = d.timeline || [];
      // 同年覆盖 (idempotent)
      var idx = d.timeline.findIndex(function(s){ return s.year === snapshot.year; });
      if (idx >= 0){
        d.timeline[idx] = Object.assign({}, d.timeline[idx], snapshot);
      } else {
        d.timeline.push(snapshot);
      }
      d.timeline.sort(function(a,b){ return a.year - b.year; });
    });
    return true;
  }

  function removeSnapshot(divId, year){
    ME.commitMutation('remove snapshot ' + year, function(){
      var d = ME.EDITOR.map.divisions.find(function(D){ return D.id === divId; });
      if (!d || !d.timeline) return;
      d.timeline = d.timeline.filter(function(s){ return s.year !== year; });
    });
  }

  function updateSnapshot(divId, year, patch){
    ME.commitMutation('update snapshot ' + year, function(){
      var d = ME.EDITOR.map.divisions.find(function(D){ return D.id === divId; });
      if (!d || !d.timeline) return;
      var idx = d.timeline.findIndex(function(s){ return s.year === year; });
      if (idx >= 0){
        d.timeline[idx] = Object.assign({}, d.timeline[idx], patch);
      }
    });
  }

  // 把当前 base 字段作为某年的 snapshot 写入 timeline (capture current state)
  function captureNow(divId, year, fields){
    fields = fields || ['name', 'level', 'autonomy', 'governor', 'dejureOwner', 'polygon'];
    var d = ME.EDITOR.map.divisions.find(function(D){ return D.id === divId; });
    if (!d) return;
    var snap = { year: year };
    fields.forEach(function(f){
      if (d[f] !== undefined){
        // deep clone for objects/arrays
        snap[f] = (typeof d[f] === 'object' && d[f] !== null) ? JSON.parse(JSON.stringify(d[f])) : d[f];
      }
    });
    addSnapshot(divId, snap);
  }

  // ─── current year (view state) ───────────────────────────

  // 在 EDITOR.viewYear 存当前查看年份·null = no time filter (默认)
  function setViewYear(year){
    ME.EDITOR.viewYear = year;
    ME.requestRender();
    ME.fire('view-year-change', { year: year });
  }

  function getViewYear(){
    return ME.EDITOR.viewYear == null ? null : ME.EDITOR.viewYear;
  }

  // 计算朝代默认 year range·辅 slider min/max
  function getDynastyYearRange(){
    var dyn = TM.MapEditor.dynasty.get(ME.EDITOR.map.dynasty);
    return dyn.yearRange || [-1600, 1949];
  }

  // ─── source / 考据 ──────────────────────────────────────

  function addSource(divId, source){
    // source = { title, author, juan, page, note, year? }
    ME.commitMutation('add source', function(){
      var d = ME.EDITOR.map.divisions.find(function(D){ return D.id === divId; });
      if (!d) return;
      d.sources = d.sources || [];
      d.sources.push(Object.assign({ added: Date.now() }, source));
    });
  }

  function removeSource(divId, idx){
    ME.commitMutation('remove source', function(){
      var d = ME.EDITOR.map.divisions.find(function(D){ return D.id === divId; });
      if (!d || !d.sources) return;
      d.sources.splice(idx, 1);
    });
  }

  function updateSource(divId, idx, patch){
    ME.commitMutation('update source', function(){
      var d = ME.EDITOR.map.divisions.find(function(D){ return D.id === divId; });
      if (!d || !d.sources || !d.sources[idx]) return;
      Object.assign(d.sources[idx], patch);
    });
  }

  // ─── expose ──────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.timeline = {
    getStateAt: getStateAt,
    isActiveAt: isActiveAt,
    getActiveDivisionsAt: getActiveDivisionsAt,
    collectKeyYears: collectKeyYears,

    addSnapshot: addSnapshot,
    removeSnapshot: removeSnapshot,
    updateSnapshot: updateSnapshot,
    captureNow: captureNow,

    setViewYear: setViewYear,
    getViewYear: getViewYear,
    getDynastyYearRange: getDynastyYearRange,

    addSource: addSource,
    removeSource: removeSource,
    updateSource: updateSource
  };

})(typeof window !== 'undefined' ? window : this);
