// map-editor-multi-diff.js
// Phase 19.3·multi-edit diff
//
// 多选时·panel 已显批量编辑表·此模块在表内每字段下注·
// "现·全 X" (consensus) / "现·混·X(3)/Y(2)/Z(1)" / "现·全空"
// 帮助 user 知改前状态·防误覆盖
//
// 不改 panel.js·post-render 注·MutationObserver
//
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[multi-diff] core not loaded'); return; }

  var _observer = null;

  // ─── 取字段值·支持·dot path ───────────────────────────

  function getPath(obj, path){
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++){
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  // ─── 分析·返回 {kind, val, distrib, n} ─────────────────

  function analyzeField(divs, fieldPath){
    var counts = {};
    var emptyCount = 0;
    divs.forEach(function(d){
      var v = getPath(d, fieldPath);
      if (v === '' || v == null){
        emptyCount++;
        return;
      }
      var key = String(v);
      counts[key] = (counts[key] || 0) + 1;
    });
    var keys = Object.keys(counts);
    if (keys.length === 0){
      return { kind: 'empty', n: divs.length };
    }
    if (keys.length === 1 && emptyCount === 0){
      return { kind: 'all', val: keys[0], n: divs.length };
    }
    // sort by count desc
    keys.sort(function(a, b){ return counts[b] - counts[a]; });
    return {
      kind: 'mixed',
      distrib: keys.slice(0, 3).map(function(k){ return { v: k, c: counts[k] }; }),
      emptyN: emptyCount,
      uniqueN: keys.length,
      n: divs.length
    };
  }

  // ─── 注·diff 描述·插每 [data-batch] 之后 ──────────────

  function annotate(){
    var sels = ME.getSelected ? ME.getSelected() : [];
    if (sels.length < 2) return;

    var inputs = document.querySelectorAll('#right-panel [data-batch]');
    inputs.forEach(function(input){
      var path = input.getAttribute('data-batch');
      // 防重·若已注·skip
      var existing = input.parentElement && input.parentElement.querySelector('.me-md-anno');
      if (existing) existing.remove();

      var info = analyzeField(sels, path);
      var anno = document.createElement('div');
      anno.className = 'me-md-anno';
      anno.style.cssText = 'font-size:var(--fs-xxs); color:var(--paper-3); margin-top:2px; line-height:1.4; font-style:italic;';

      if (info.kind === 'empty'){
        anno.innerHTML = '<span style="color:var(--paper-4);">现·全空</span>';
      } else if (info.kind === 'all'){
        anno.innerHTML = '<span style="color:var(--gold-2);">现·全 <b style="color:var(--paper-1); font-style:normal;">' + escHtml(info.val) + '</b></span>';
      } else {
        var bits = info.distrib.map(function(d){
          return '<b style="color:var(--paper-1); font-style:normal;">' + escHtml(d.v) + '</b>(' + d.c + ')';
        }).join(' / ');
        var more = info.uniqueN > 3 ? ' +' + (info.uniqueN - 3) : '';
        var emp = info.emptyN > 0 ? ' / 空(' + info.emptyN + ')' : '';
        anno.innerHTML = '<span style="color:#dc4f3a;">现·混 ' + bits + more + emp + '</span>';
      }
      // 插 input 父元素 (.me-ctrl) 之后
      var ctrl = input.closest('.me-ctrl');
      if (ctrl && ctrl.parentNode){
        ctrl.parentNode.appendChild(anno);
      } else {
        input.parentNode.appendChild(anno);
      }
    });

    // flag·data-batch-flag·三态显示
    var flagInputs = document.querySelectorAll('#right-panel [data-batch-flag]');
    flagInputs.forEach(function(input){
      var key = input.getAttribute('data-batch-flag');
      var label = input.parentElement;
      if (!label) return;
      var existing = label.querySelector('.me-md-flag-anno');
      if (existing) existing.remove();

      var trueN = 0, falseN = 0, unsetN = 0;
      sels.forEach(function(d){
        var f = d.flags && d.flags[key];
        if (f === true) trueN++;
        else if (f === false) falseN++;
        else unsetN++;
      });
      var anno = document.createElement('span');
      anno.className = 'me-md-flag-anno';
      anno.style.cssText = 'font-size:var(--fs-xxs); margin-left:4px; color:var(--paper-3);';
      if (trueN === sels.length){
        anno.innerHTML = '<span style="color:var(--jade-1);">·全 ✓</span>';
      } else if (falseN + unsetN === sels.length && trueN === 0){
        anno.innerHTML = '<span style="color:var(--paper-4);">·全 ✗</span>';
      } else {
        anno.innerHTML = '<span style="color:#dc4f3a;">·混 ' + trueN + '✓ / ' + (falseN + unsetN) + '✗</span>';
      }
      label.appendChild(anno);
    });
  }

  // ─── observer·panel 重渲后·重 annotate ──────────────────

  function startObserver(){
    var panel = document.getElementById('right-panel');
    if (!panel) return;
    if (_observer) _observer.disconnect();
    _observer = new MutationObserver(function(muts){
      // 仅当 multi 表 (.me-batch-section) 出现时·才 annotate
      var has = panel.querySelector('.me-batch-section');
      if (has){
        // debounce·避免 trigger loop
        if (annotate._t) clearTimeout(annotate._t);
        annotate._t = setTimeout(annotate, 50);
      }
    });
    _observer.observe(panel, { childList: true, subtree: true });
  }

  // ─── helpers ───────────────────────────────────────────

  function escHtml(s){
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ─── init ──────────────────────────────────────────────

  function init(){
    // 等 panel 初始化
    setTimeout(function(){
      startObserver();
      annotate();
    }, 200);
    ME.on('selection-change', function(){
      setTimeout(annotate, 80);
    });
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.multiDiff = {
    init: init,
    annotate: annotate,
    analyzeField: analyzeField
  };

})(typeof window !== 'undefined' ? window : this);
