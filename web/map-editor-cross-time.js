// map-editor-cross-time.js
// 跨朝代时序·统一年代滑块·-1600 ~ 1949
// 按 year 自动检测 dynasty (按 yearRange 重叠)·从 atlas 库切到对应朝代地图
// 跨界 transition·prompt or 自动加载
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[cross-time] core not loaded'); return; }

  // ─── dynasty year range·collect ─────────────────────────

  function getGlobalYearRange(){
    var dynasties = TM.MapEditor.dynasty.list();
    var minY = Infinity, maxY = -Infinity;
    dynasties.forEach(function(d){
      if (d.yearRange){
        if (d.yearRange[0] < minY) minY = d.yearRange[0];
        if (d.yearRange[1] > maxY) maxY = d.yearRange[1];
      }
    });
    return { min: isFinite(minY) ? minY : -1600, max: isFinite(maxY) ? maxY : 1949 };
  }

  function dynasticAtYear(year){
    // 找 yearRange[0] ≤ year ≤ yearRange[1]·返回 dynasty obj
    // 多个匹配 (同期割据 / 重叠)·返回 list
    var dynasties = TM.MapEditor.dynasty.list();
    var matches = dynasties.filter(function(d){
      return d.yearRange && d.yearRange[0] <= year && year <= d.yearRange[1];
    });
    return matches;
  }

  // ─── mode state ──────────────────────────────────────────

  function isActive(){
    return !!ME.EDITOR.crossTimeMode;
  }

  function enter(){
    if (!ME.atlas){
      meAlert('atlas 模块未加载');
      return false;
    }
    var lib = ME.atlas.loadLibrary();
    var n = Object.keys(lib).length;
    if (n === 0){
      if (!confirm('atlas 库为空·跨朝代时序需 ≥ 2 朝代地图入库\n继续 (仅按 yearRange 探测·不切地图)?')) return false;
    }
    ME.EDITOR.crossTimeMode = {
      currentDynasty: ME.EDITOR.map.dynasty,
      autoSwitch: true,  // 默认自动切·user 可关
      year: ME.timeline ? ME.timeline.getViewYear() : null
    };
    var range = getGlobalYearRange();
    ME.fire('cross-time-enter', { range: range });
    updateBanner();
    return true;
  }

  function exit(){
    ME.EDITOR.crossTimeMode = null;
    var banner = document.getElementById('cross-time-banner');
    if (banner) banner.style.display = 'none';
    ME.fire('cross-time-exit');
  }

  function setAutoSwitch(b){
    if (!ME.EDITOR.crossTimeMode) return;
    ME.EDITOR.crossTimeMode.autoSwitch = !!b;
    updateBanner();
  }

  // ─── on year change·handle dynasty switch ───────────────

  function onYearChange(year){
    if (!isActive()) return;
    ME.EDITOR.crossTimeMode.year = year;
    var matches = dynasticAtYear(year);
    if (matches.length === 0){
      updateBanner();
      return;
    }

    var currentDyn = ME.EDITOR.map.dynasty;
    var stillIn = matches.some(function(d){ return d.id === currentDyn; });

    if (!stillIn){
      // 跨界·需切朝代
      var lib = ME.atlas ? ME.atlas.loadLibrary() : {};
      // 优先选库内已存的匹配朝代·若都没·alert
      var available = matches.filter(function(d){ return lib[d.id]; });
      if (available.length === 0){
        // 无库地图
        if (ME.EDITOR.crossTimeMode.autoSwitch){
          var statusEl = document.getElementById('status-tip');
          if (statusEl) statusEl.textContent = year + ' → ' + matches.map(function(d){ return d.label; }).join('/') + ' (库内无此朝代地图)';
        }
        updateBanner();
        return;
      }
      // 优先选第一个匹配
      var target = available[0];

      if (ME.EDITOR.crossTimeMode.autoSwitch){
        // 自动切·先保存当前到库 (防丢)
        if (ME.EDITOR.dirty){
          // 保存当前
          if (ME.atlas) ME.atlas.saveCurrentToLibrary();
        }
        // 切到 target
        if (ME.atlas){
          ME.atlas.loadFromLibrary(target.id);
          // 切完保持 viewYear
          if (ME.timeline) ME.timeline.setViewYear(year);
        }
      } else {
        // prompt
        var statusEl2 = document.getElementById('status-tip');
        if (statusEl2) statusEl2.textContent = year + ' → 应切 ' + target.label + ' (auto-switch 关·手动切)';
      }
    }

    updateBanner();
  }

  // ─── banner UI ───────────────────────────────────────────

  function ensureBanner(){
    var b = document.getElementById('cross-time-banner');
    if (b) return b;
    b = document.createElement('div');
    b.id = 'cross-time-banner';
    b.className = 'me-cross-banner';
    b.style.cssText = 'background:rgba(60,90,140,0.18); border-bottom:1px solid #3a4a6a; display:none; align-items:center; gap:10px; padding:4px 12px; font-size:11px; color:#e8ddc8;';
    // 插到 mid 之前
    var mid = document.querySelector('.me-mid');
    if (mid && mid.parentElement){
      mid.parentElement.insertBefore(b, mid);
    } else {
      document.body.appendChild(b);
    }
    return b;
  }

  function updateBanner(){
    var b = ensureBanner();
    if (!isActive()){
      b.style.display = 'none';
      return;
    }
    var ct = ME.EDITOR.crossTimeMode;
    var year = ct.year;
    var matches = year != null ? dynasticAtYear(year) : [];
    var lib = ME.atlas ? ME.atlas.loadLibrary() : {};
    var availLabels = matches.map(function(d){
      var inLib = lib[d.id] ? '✓' : '·缺';
      return d.label + (d.id === ME.EDITOR.map.dynasty ? '★' : '') + inLib;
    }).join(' / ');

    var range = getGlobalYearRange();
    b.innerHTML = '\
      <span>📅 跨朝代·' + range.min + ' ~ ' + range.max + '</span>\
      <span style="color:#6a6560;">|</span>\
      <span>当年·<b style="color:#c9a96e;">' + (year != null ? year : '?') + '</b></span>\
      <span style="color:#6a6560;">|</span>\
      <span>朝代·<b style="color:#c9a96e;">' + (availLabels || '(yearRange 无匹配)') + '</b></span>\
      <span style="color:#6a6560;">|</span>\
      <label><input type="checkbox" id="ct-auto"' + (ct.autoSwitch ? ' checked' : '') + ' /> 自动切朝代</label>\
      <span style="margin-left:auto;">\
        <button class="me-btn" id="ct-save-current">保存当前到库</button>\
        <button class="me-btn me-btn-warn" id="ct-exit">退出</button>\
      </span>\
    ';
    b.style.display = 'flex';

    var auto = document.getElementById('ct-auto');
    if (auto) auto.addEventListener('change', function(e){ setAutoSwitch(e.target.checked); });
    var saveBtn = document.getElementById('ct-save-current');
    if (saveBtn) saveBtn.addEventListener('click', function(){
      if (ME.atlas){
        ME.atlas.saveCurrentToLibrary();
        var statusEl = document.getElementById('status-tip');
        if (statusEl) statusEl.textContent = '当前 ' + ME.EDITOR.map.dynasty + ' 朝代地图已入库';
      }
    });
    var exitBtn = document.getElementById('ct-exit');
    if (exitBtn) exitBtn.addEventListener('click', exit);
  }

  // ─── 自动 hook·time slider 改变时通知 ────────────────────

  // 在 init 时挂 listener
  function bindTimeListener(){
    ME.on('view-year-change', function(p){
      if (isActive()) onYearChange(p.year);
    });
    ME.on('map-loaded', updateBanner);
  }

  // 立即 bind (load 时)
  bindTimeListener();

  // expose
  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.crossTime = {
    enter: enter,
    exit: exit,
    isActive: isActive,
    setAutoSwitch: setAutoSwitch,
    onYearChange: onYearChange,
    getGlobalYearRange: getGlobalYearRange,
    dynasticAtYear: dynasticAtYear,
    updateBanner: updateBanner
  };

})(typeof window !== 'undefined' ? window : this);
