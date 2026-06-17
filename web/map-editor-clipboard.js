// map-editor-clipboard.js
// Phase 19.1·autosave 心跳 + 字段 Ctrl+C/V
//
// ① autosave 心跳·status 显·"已存 Xs 前"·绿/灰
// ② Ctrl+C·复制选省字段子集·只取设计字段·跳几何 / id
// ③ Ctrl+V·粘贴到当前选省·若多选·全应用
//
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[clipboard] core not loaded'); return; }

  // ─── 字段·copy 范围 (跳几何) ───────────────────────────

  // 黑·polygon / id / 派生·复制粘贴时跳过
  var SKIP_FIELDS = {
    'id': 1, 'polygon': 1, 'extraPolygons': 1, 'extraPolygonsVids': 1,
    'holes': 1, 'holesVids': 1, 'bbox': 1, 'centroid': 1, 'area': 1,
    'colorKey': 1, '_grid': 1, 'sources': 1, 'timeline': 1, 'crossDynastyId': 1,
    // neighbors 是 derived·重算后会刷·跳
    'neighbors': 1
  };

  var _clip = null;     // 复制的 field map

  // ─── copy / paste ──────────────────────────────────────

  function copySelection(){
    var sels = ME.getSelected ? ME.getSelected() : [];
    if (sels.length === 0){
      if (global.meToast) meToast('未选省·复制无目标', 'warn');
      return false;
    }
    // 多选·只复 1 个 (sels[0])·提示
    var src = sels[0];
    var fields = {};
    Object.keys(src).forEach(function(k){
      if (SKIP_FIELDS[k]) return;
      if (k.charAt(0) === '_') return;
      var v = src[k];
      if (v == null) return;
      // 深 clone 防引用同源 (object / array)
      if (typeof v === 'object'){
        try { fields[k] = JSON.parse(JSON.stringify(v)); }
        catch(e){ /* skip */ }
      } else {
        fields[k] = v;
      }
    });
    _clip = { fields: fields, sourceId: src.id, sourceName: src.name };
    var n = Object.keys(fields).length;
    if (global.meToast){
      meToast('复·' + (src.name || src.id) + '·' + n + ' 字段' + (sels.length > 1 ? ' (多选只取首)' : ''), 'success');
    }
    return true;
  }

  function pasteSelection(){
    if (!_clip){
      if (global.meToast) meToast('剪贴板空·先 Ctrl+C 复制', 'warn');
      return false;
    }
    var sels = ME.getSelected ? ME.getSelected() : [];
    if (sels.length === 0){
      if (global.meToast) meToast('未选省·粘贴无目标', 'warn');
      return false;
    }

    var fields = _clip.fields;
    var n = sels.length;
    ME.commitMutation('粘贴字段·' + n + ' 省', function(){
      sels.forEach(function(d){
        Object.keys(fields).forEach(function(k){
          var v = fields[k];
          if (typeof v === 'object' && v !== null && !Array.isArray(v)){
            // 浅 merge 子 object (e.g., autonomy / populationDetail)
            d[k] = Object.assign({}, d[k] || {}, v);
          } else if (Array.isArray(v)){
            d[k] = v.slice();
          } else {
            d[k] = v;
          }
        });
      });
    });
    ME.fire('selection-change');  // 触发 panel 重渲
    if (global.meToast){
      meToast('粘·' + n + ' 省·' + Object.keys(fields).length + ' 字段', 'success');
    }
    return true;
  }

  // ─── autosave 心跳 ─────────────────────────────────────

  var _statusEl = null;

  function ensureStatusEl(){
    if (_statusEl) return _statusEl;
    var footer = document.querySelector('.me-status');
    if (!footer) return null;
    _statusEl = document.createElement('span');
    _statusEl.id = 'status-autosave';
    _statusEl.style.cssText = 'margin-left:var(--sp-3); color:var(--paper-3); font-size:var(--fs-xs); display:flex; align-items:center; gap:5px;';
    _statusEl.innerHTML =
      '<span class="me-as-dot" style="display:inline-block; width:7px; height:7px; border-radius:50%; background:var(--paper-4); transition:all var(--t-fast);"></span>' +
      '<span class="me-as-txt">未存</span>';
    // 插在 status-tip 之前
    var tip = document.getElementById('status-tip');
    if (tip) footer.insertBefore(_statusEl, tip);
    else footer.appendChild(_statusEl);
    return _statusEl;
  }

  function relTime(then){
    if (!then) return '未存';
    var dt = (Date.now() - then) / 1000;
    if (dt < 2) return '刚存';
    if (dt < 60) return Math.round(dt) + 's 前存';
    if (dt < 3600) return Math.round(dt / 60) + ' 分前';
    return Math.round(dt / 3600) + ' 时前';
  }

  function updateHeartbeat(){
    var el = ensureStatusEl();
    if (!el) return;
    var dot = el.querySelector('.me-as-dot');
    var txt = el.querySelector('.me-as-txt');
    var saved = ME.EDITOR.lastSavedAt;
    var dirty = ME.EDITOR.dirty;

    if (!saved){
      dot.style.background = 'var(--paper-4)';
      dot.style.boxShadow = 'none';
      txt.textContent = '未存';
      txt.style.color = 'var(--paper-4)';
      return;
    }

    var dt = (Date.now() - saved) / 1000;
    var color, text;
    if (dirty && dt > 30){
      color = '#dc4f3a';   // 朱·脏久·该存
      text = relTime(saved) + '·脏';
    } else if (dirty){
      color = '#c5a04d';   // 金·脏新
      text = relTime(saved) + '·脏';
    } else if (dt < 5){
      color = '#6a8a3a';   // 翠·刚存
      text = '已存';
    } else {
      color = 'var(--paper-3)';
      text = relTime(saved);
    }
    dot.style.background = color;
    dot.style.boxShadow = (dirty && dt > 30) ? '0 0 6px ' + color : 'none';
    txt.textContent = text;
    txt.style.color = color;
  }

  // ─── 键盘 ──────────────────────────────────────────────

  function bindKeys(){
    document.addEventListener('keydown', function(e){
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      var k = e.key.toLowerCase();
      if (k === 'c'){
        // 不抢 native·若没选·让 native (用户选 text)
        var sels = ME.getSelected ? ME.getSelected() : [];
        if (sels.length === 0) return;
        e.preventDefault();
        copySelection();
      } else if (k === 'v'){
        var sels = ME.getSelected ? ME.getSelected() : [];
        if (sels.length === 0 || !_clip) return;
        e.preventDefault();
        pasteSelection();
      }
    });
  }

  // ─── init ──────────────────────────────────────────────

  function init(){
    ensureStatusEl();
    bindKeys();
    setInterval(updateHeartbeat, 1000);
    ME.on('draft-saved', updateHeartbeat);
    ME.on('mutation', updateHeartbeat);
    updateHeartbeat();
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.clipboard = {
    init: init,
    copy: copySelection,
    paste: pasteSelection,
    getClip: function(){ return _clip; }
  };

})(typeof window !== 'undefined' ? window : this);
