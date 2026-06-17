// map-editor-pick.js
// 吸管工具·读 cursor 下的属性·设为 brush / addPoly / etc 默认
// 借鉴 SGGameEditor RadioHeightPick / RadioProvincePick / RadioWaterPick
//
// 模式·terrain / level / autonomy / colorKey / height
// 工具 'pick'·click·读·写到 status·部分模式同步到 brush 默认
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[pick] core not loaded'); return; }

  var MODES = ['terrain', 'level', 'autonomy', 'colorKey', 'height'];

  function getMode(){
    return ME.EDITOR._pickMode || 'terrain';
  }
  function setMode(m){
    if (MODES.indexOf(m) < 0) return;
    ME.EDITOR._pickMode = m;
    var statusEl = document.getElementById('status-tip');
    if (statusEl) statusEl.textContent = '吸管·模式·' + m;
  }

  function pickAt(wx, wy){
    var EDITOR = ME.EDITOR;
    var mode = getMode();
    var d = ME.findDivisionAt(wx, wy);
    var statusEl = document.getElementById('status-tip');
    var msg = '吸管·';
    var picked = null;

    if (mode === 'height'){
      var hm = TM.MapEditor.rastermaps && TM.MapEditor.rastermaps.height;
      if (hm){
        var v = hm.pickAt(wx, wy);
        EDITOR._pickedHeight = v;
        msg += '高·' + (v == null ? 'null' : v);
        picked = { kind: 'height', value: v };
      } else msg += '高·rastermaps 未载';
    } else if (mode === 'colorKey'){
      if (d && typeof d.colorKey === 'number'){
        var rgb = TM.MapEditor.arealinks ? TM.MapEditor.arealinks.unpack(d.colorKey) : null;
        EDITOR._pickedColorKey = d.colorKey;
        msg += 'colorKey·' + d.colorKey.toString(16) + (rgb ? ' (' + rgb.join(',') + ')' : '') + ' · ' + d.name;
        picked = { kind: 'colorKey', value: d.colorKey, divId: d.id };
      } else msg += '空地·无 colorKey';
    } else if (d){
      switch (mode){
        case 'terrain':
          EDITOR._pickedTerrain = d.terrain;
          msg += '地形·' + (d.terrain || '?') + ' · ' + d.name;
          picked = { kind: 'terrain', value: d.terrain, divId: d.id };
          break;
        case 'level':
          EDITOR._pickedLevel = d.level;
          msg += '层级·' + (d.level || '?') + ' · ' + d.name;
          picked = { kind: 'level', value: d.level, divId: d.id };
          break;
        case 'autonomy':
          var a = d.autonomy && d.autonomy.type;
          EDITOR._pickedAutonomy = a;
          msg += '自治·' + (a || '?') + ' · ' + d.name;
          picked = { kind: 'autonomy', value: a, divId: d.id };
          break;
      }
    } else {
      msg += '空地·无 division';
    }

    if (statusEl) statusEl.textContent = msg;
    EDITOR._lastPick = picked;
    ME.fire('pick', picked);
    return picked;
  }

  function getPicked(kind){
    var EDITOR = ME.EDITOR;
    if (kind === 'terrain') return EDITOR._pickedTerrain;
    if (kind === 'level') return EDITOR._pickedLevel;
    if (kind === 'autonomy') return EDITOR._pickedAutonomy;
    if (kind === 'colorKey') return EDITOR._pickedColorKey;
    if (kind === 'height') return EDITOR._pickedHeight;
    return null;
  }

  // ─── tool callbacks ──────────────────────────────────────

  function onMouseDown(wx, wy, e){
    var EDITOR = ME.EDITOR;
    if (EDITOR.activeTool !== 'pick') return false;
    if (e.button !== 0) return false;
    pickAt(wx, wy);
    return true;
  }

  function onMouseMove(wx, wy, e){
    return false;  // pick 不跟移
  }

  function onKeyDown(e){
    var EDITOR = ME.EDITOR;
    if (EDITOR.activeTool !== 'pick') return false;
    // 1-5 切模式
    if (e.key === '1'){ setMode('terrain'); return true; }
    if (e.key === '2'){ setMode('level'); return true; }
    if (e.key === '3'){ setMode('autonomy'); return true; }
    if (e.key === '4'){ setMode('colorKey'); return true; }
    if (e.key === '5'){ setMode('height'); return true; }
    return false;
  }

  // ─── expose ─────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.pick = {
    MODES: MODES,
    getMode: getMode,
    setMode: setMode,
    pickAt: pickAt,
    getPicked: getPicked,
    onMouseDown: onMouseDown,
    onMouseMove: onMouseMove,
    onKeyDown: onKeyDown
  };

})(typeof window !== 'undefined' ? window : this);
