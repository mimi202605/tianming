// map-editor-diff.js
// 两年快照 diff·色码 highlight on canvas
// 比对类·new (B 出 A 没) / abolished (A 有 B 没) / renamed / autonomy 变 / polygon 变
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[diff] core not loaded'); return; }

  var DIFF_COLORS = {
    'new':       '#6a9a7f',  // green·B 新立
    'abolished': '#dc4f3a',  // red·B 已废
    'renamed':   '#5a7a9e',  // blue
    'autonomy':  '#c9a96e',  // gold·宗主关系变
    'polygon':   '#e08020',  // orange·失/复土
    'unchanged': '#3a3a3a'   // gray
  };

  // ─── compute diff ───────────────────────────────────────

  function computeDiff(yearA, yearB){
    if (yearA == null || yearB == null) return null;
    var TL = TM.MapEditor.timeline;
    var divs = ME.EDITOR.map.divisions;
    var result = {
      yearA: yearA,
      yearB: yearB,
      perDiv: {},          // divId → diff type
      summary: {
        new: 0, abolished: 0, renamed: 0, autonomyChanged: 0, polygonChanged: 0, unchanged: 0
      }
    };

    divs.forEach(function(d){
      var sa = TL.getStateAt(d, yearA);
      var sb = TL.getStateAt(d, yearB);
      var inA = sa !== null;
      var inB = sb !== null;
      var diff = { types: [] };

      if (inB && !inA){
        diff.types.push('new');
        result.summary.new++;
      } else if (inA && !inB){
        diff.types.push('abolished');
        result.summary.abolished++;
      } else if (inA && inB){
        var changed = false;
        if (sa.name !== sb.name){
          diff.types.push('renamed');
          diff.from = sa.name; diff.to = sb.name;
          result.summary.renamed++;
          changed = true;
        }
        var aType = (sa.autonomy && sa.autonomy.type) || 'zhixia';
        var bType = (sb.autonomy && sb.autonomy.type) || 'zhixia';
        var aHolder = (sa.autonomy && sa.autonomy.holder) || '';
        var bHolder = (sb.autonomy && sb.autonomy.holder) || '';
        if (aType !== bType || aHolder !== bHolder){
          diff.types.push('autonomy');
          diff.autFrom = { type: aType, holder: aHolder };
          diff.autTo = { type: bType, holder: bHolder };
          result.summary.autonomyChanged++;
          changed = true;
        }
        if (polygonChanged(sa.polygon, sb.polygon)){
          diff.types.push('polygon');
          result.summary.polygonChanged++;
          changed = true;
        }
        if (!changed){
          diff.types.push('unchanged');
          result.summary.unchanged++;
        }
      } else {
        // not in either·skip (一直废止 / 未立)
        return;
      }
      result.perDiv[d.id] = diff;
    });

    return result;
  }

  function polygonChanged(pa, pb){
    if (!pa && !pb) return false;
    if (!pa || !pb) return true;
    if (pa.length !== pb.length) return true;
    // shallow stringify compare·够用·性能 ok 单 division ~10-100 顶点
    return JSON.stringify(pa) !== JSON.stringify(pb);
  }

  // ─── render·hook 到 core·colorForDivision 替换 ──────────

  // 给定 division id·返回 diff 色 (rgba)·若不在 diff 内·返回 null
  function getDiffColor(divId){
    var dm = ME.EDITOR.diffMode;
    if (!dm || !dm.report) return null;
    var diff = dm.report.perDiv[divId];
    if (!diff || diff.types.length === 0) return null;
    // 优先级·polygon > autonomy > renamed > new > abolished > unchanged
    var priority = ['polygon', 'autonomy', 'renamed', 'new', 'abolished', 'unchanged'];
    for (var i = 0; i < priority.length; i++){
      if (diff.types.indexOf(priority[i]) !== -1){
        return rgbaWithAlpha(DIFF_COLORS[priority[i]], 0.65);
      }
    }
    return null;
  }

  function rgbaWithAlpha(hex, alpha){
    if (!hex || hex[0] !== '#') return 'rgba(120,120,120,' + alpha + ')';
    var r = parseInt(hex.slice(1,3), 16);
    var g = parseInt(hex.slice(3,5), 16);
    var b = parseInt(hex.slice(5,7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  // ─── enter / exit diff mode ─────────────────────────────

  function enterDiffMode(yearA, yearB){
    var report = computeDiff(yearA, yearB);
    if (!report){ console.error('[diff] year invalid'); return false; }
    ME.EDITOR.diffMode = { yearA: yearA, yearB: yearB, report: report };
    ME.requestRender();
    ME.fire('diff-enter', { yearA: yearA, yearB: yearB, report: report });
    return true;
  }

  function exitDiffMode(){
    ME.EDITOR.diffMode = null;
    ME.requestRender();
    ME.fire('diff-exit');
  }

  function isDiffMode(){
    return !!ME.EDITOR.diffMode;
  }

  // ─── modal 渲染 ─────────────────────────────────────────

  var _modalEl = null;

  function ensureModal(){
    if (_modalEl) return _modalEl;
    _modalEl = document.createElement('div');
    _modalEl.className = 'me-diff-modal';
    _modalEl.style.cssText = 'position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); z-index:9999; background:#1a1a1f; border:1px solid #3a3530; border-radius:6px; padding:14px 18px; min-width:340px; max-width:560px; font-family:inherit; color:#e8ddc8; box-shadow:0 8px 30px rgba(0,0,0,0.6); display:none;';
    document.body.appendChild(_modalEl);
    return _modalEl;
  }

  function openDiffSetup(){
    var TL = TM.MapEditor.timeline;
    var keyYears = TL.collectKeyYears();
    var range = TL.getDynastyYearRange();
    var defaultA = keyYears[0] || range[0];
    var defaultB = keyYears[keyYears.length - 1] || range[1];
    var view = TL.getViewYear();
    if (view != null) defaultB = view;

    var modal = ensureModal();
    modal.innerHTML = '\
      <div style="font-size:14px; color:#c9a96e; margin-bottom:10px; letter-spacing:0.1em;">两年 diff 比对</div>\
      <div style="display:grid; grid-template-columns:auto 1fr; gap:6px 10px; align-items:center; margin-bottom:14px;">\
        <span style="font-size:11px; color:#6a6560;">基准年 A</span>\
        <input type="number" id="diff-yearA" value="' + defaultA + '" style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:5px 8px; border-radius:3px; font-family:inherit;" />\
        <span style="font-size:11px; color:#6a6560;">对比年 B</span>\
        <input type="number" id="diff-yearB" value="' + defaultB + '" style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:5px 8px; border-radius:3px; font-family:inherit;" />\
      </div>\
      <div style="font-size:10px; color:#6a6560; margin-bottom:10px;">\
        关键年·' + (keyYears.length ? keyYears.slice(0, 12).join(' / ') + (keyYears.length > 12 ? ' ...' : '') : '(无 timeline 数据·diff 仅按 base + established/abolished 算)') + '\
      </div>\
      <div style="display:flex; gap:8px; justify-content:flex-end;">\
        <button class="me-btn" id="diff-cancel">取消</button>\
        <button class="me-btn me-btn-warn" id="diff-go">开始 diff</button>\
      </div>\
    ';
    modal.style.display = 'block';

    document.getElementById('diff-cancel').addEventListener('click', function(){
      modal.style.display = 'none';
    });
    document.getElementById('diff-go').addEventListener('click', function(){
      var yA = Number(document.getElementById('diff-yearA').value);
      var yB = Number(document.getElementById('diff-yearB').value);
      if (isNaN(yA) || isNaN(yB)){ meAlert('请填年份'); return; }
      modal.style.display = 'none';
      enterDiffMode(yA, yB);
      openDiffReport();
    });
  }

  function openDiffReport(){
    var dm = ME.EDITOR.diffMode;
    if (!dm){ return; }
    var modal = ensureModal();
    var s = dm.report.summary;
    var rows = [];
    Object.keys(dm.report.perDiv).forEach(function(divId){
      var d = ME.EDITOR.map.divisions.find(function(D){ return D.id === divId; });
      if (!d) return;
      var diff = dm.report.perDiv[divId];
      if (diff.types[0] === 'unchanged') return; // skip unchanged
      rows.push({ d: d, diff: diff });
    });

    rows.sort(function(a,b){
      // priority new > abolished > polygon > autonomy > renamed
      var pri = { new:0, abolished:1, polygon:2, autonomy:3, renamed:4, unchanged:5 };
      return (pri[a.diff.types[0]] || 9) - (pri[b.diff.types[0]] || 9);
    });

    modal.innerHTML = '\
      <div style="font-size:14px; color:#c9a96e; margin-bottom:6px;">diff 报告·' + dm.yearA + ' → ' + dm.yearB + '</div>\
      <div style="font-size:11px; color:#6a6560; margin-bottom:10px;">\
        新立 <b style="color:#6a9a7f">' + s.new + '</b> · 废止 <b style="color:#dc4f3a">' + s.abolished + '</b> · 改名 <b style="color:#5a7a9e">' + s.renamed + '</b> · 自治变 <b style="color:#c9a96e">' + s.autonomyChanged + '</b> · 失/复土 <b style="color:#e08020">' + s.polygonChanged + '</b> · 不变 <b>' + s.unchanged + '</b>\
      </div>\
      <div style="max-height:300px; overflow:auto; border:1px solid #3a3530; border-radius:3px;">\
        ' + (rows.length === 0 ? '<div style="padding:14px; color:#6a6560; font-size:11px; text-align:center;">无变化 (除 unchanged)</div>' : rows.map(function(r){
          return '<div class="me-diff-row" data-jump="' + r.d.id + '" style="padding:5px 8px; font-size:11px; border-bottom:1px solid #2a2a30; cursor:pointer; display:grid; grid-template-columns:60px 1fr auto; gap:8px; align-items:center;">\
            <span style="color:' + DIFF_COLORS[r.diff.types[0]] + '">' + diffTypeLabel(r.diff.types[0]) + '</span>\
            <span>' + esc(r.d.name) + (r.diff.from ? ' <span style="color:#6a6560;">← ' + esc(r.diff.from) + '</span>' : '') + '</span>\
            <span style="color:#6a6560; font-family:Menlo,monospace; font-size:9px;">' + r.d.id.slice(-6) + '</span>\
          </div>';
        }).join('')) + '\
      </div>\
      <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:10px;">\
        <button class="me-btn" id="diff-close">关闭报告</button>\
        <button class="me-btn me-btn-warn" id="diff-exit">退出 diff 模式</button>\
      </div>\
    ';
    modal.style.display = 'block';

    document.getElementById('diff-close').addEventListener('click', function(){
      modal.style.display = 'none';
    });
    document.getElementById('diff-exit').addEventListener('click', function(){
      modal.style.display = 'none';
      exitDiffMode();
    });
    modal.querySelectorAll('[data-jump]').forEach(function(el){
      el.addEventListener('click', function(){
        var did = el.getAttribute('data-jump');
        ME.selectOne(did);
      });
    });
  }

  function diffTypeLabel(t){
    return ({
      'new': '新立',
      'abolished': '废止',
      'renamed': '改名',
      'autonomy': '隶属',
      'polygon': '失土',
      'unchanged': '不变'
    })[t] || t;
  }

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  // ─── expose ──────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.diff = {
    DIFF_COLORS: DIFF_COLORS,
    computeDiff: computeDiff,
    getDiffColor: getDiffColor,
    enterDiffMode: enterDiffMode,
    exitDiffMode: exitDiffMode,
    isDiffMode: isDiffMode,
    openDiffSetup: openDiffSetup,
    openDiffReport: openDiffReport,
    diffTypeLabel: diffTypeLabel
  };

})(typeof window !== 'undefined' ? window : this);
