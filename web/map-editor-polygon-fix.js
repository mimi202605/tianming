// map-editor-polygon-fix.js
// Phase 19.6·polygon 校验 + 修复
//
// 检·5 类几何问题:
//   self_intersect    polygon 自相交
//   acute_angle       极锐角 < 5° / > 175° (sliver vertex)
//   degenerate        area < threshold
//   duplicate_vert    相邻顶点距离 < ε
//   sliver_vert       顶点近共线 (off-line < ε)
//
// 一键修复·duplicate / sliver / degenerate
// self_intersect / acute 报告·user 手动 fix·click 跳
//
// 触发·Ctrl+Shift+G·或 status 栏 按钮
//
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[polygon-fix] core not loaded'); return; }

  var EPS_DUP = 0.5;             // 相邻顶距小于此·duplicate
  var EPS_COLLINEAR = 0.8;       // 顶点 off-line·小于此·sliver
  var ACUTE_THRESHOLD = 5;       // 度·小于此·flag
  var REFLEX_THRESHOLD = 175;    // 度·大于此·flag (反折近 180)
  var DEGEN_AREA = 4;            // 面积小于此 px²·degenerate

  // ─── 辅助·几何 ─────────────────────────────────────────

  function dist(a, b){
    var dx = a[0] - b[0], dy = a[1] - b[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  function distPointToSegment(p, a, b){
    var dx = b[0] - a[0], dy = b[1] - a[1];
    var len2 = dx * dx + dy * dy;
    if (len2 < 1e-9) return dist(p, a);
    var t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    var px = a[0] + t * dx, py = a[1] + t * dy;
    return Math.sqrt((p[0] - px) * (p[0] - px) + (p[1] - py) * (p[1] - py));
  }

  // 边 a-b 与 c-d 是否相交·不计共享顶点
  function segIntersect(a, b, c, d){
    function cross(o, p, q){
      return (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
    }
    var d1 = cross(c, d, a);
    var d2 = cross(c, d, b);
    var d3 = cross(a, b, c);
    var d4 = cross(a, b, d);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
    return false;
  }

  function angleDeg(a, b, c){
    var v1x = a[0] - b[0], v1y = a[1] - b[1];
    var v2x = c[0] - b[0], v2y = c[1] - b[1];
    var d1 = Math.sqrt(v1x * v1x + v1y * v1y);
    var d2 = Math.sqrt(v2x * v2x + v2y * v2y);
    if (d1 < 1e-9 || d2 < 1e-9) return 180;
    var cos = (v1x * v2x + v1y * v2y) / (d1 * d2);
    cos = Math.max(-1, Math.min(1, cos));
    return Math.acos(cos) * 180 / Math.PI;
  }

  // ─── scan ─────────────────────────────────────────────

  function scanPolygon(poly, divId, polyIdx, polyKind){
    var issues = [];
    if (!poly || poly.length < 3){
      issues.push({ divId: divId, polyIdx: polyIdx, polyKind: polyKind, type: 'degenerate', severity: 'error', message: '顶点不足·n=' + (poly ? poly.length : 0) });
      return issues;
    }
    var n = poly.length;

    // duplicate verts
    for (var i = 0; i < n; i++){
      var d = dist(poly[i], poly[(i + 1) % n]);
      if (d < EPS_DUP){
        issues.push({ divId: divId, polyIdx: polyIdx, polyKind: polyKind, type: 'duplicate_vert', severity: 'auto', vertIdx: i, message: 'v' + i + '·' + d.toFixed(2) + 'px' });
      }
    }

    // sliver verts·共线
    for (var i = 0; i < n; i++){
      var prev = poly[(i - 1 + n) % n];
      var cur = poly[i];
      var next = poly[(i + 1) % n];
      var off = distPointToSegment(cur, prev, next);
      if (off < EPS_COLLINEAR && dist(prev, next) > 2){
        issues.push({ divId: divId, polyIdx: polyIdx, polyKind: polyKind, type: 'sliver_vert', severity: 'auto', vertIdx: i, message: 'v' + i + '·off=' + off.toFixed(2) });
      }
    }

    // acute / reflex angles
    for (var i = 0; i < n; i++){
      var ang = angleDeg(poly[(i - 1 + n) % n], poly[i], poly[(i + 1) % n]);
      if (ang < ACUTE_THRESHOLD){
        issues.push({ divId: divId, polyIdx: polyIdx, polyKind: polyKind, type: 'acute_angle', severity: 'warn', vertIdx: i, message: 'v' + i + '·' + ang.toFixed(1) + '°' });
      } else if (ang > REFLEX_THRESHOLD){
        // 近 180·相当于 sliver
        issues.push({ divId: divId, polyIdx: polyIdx, polyKind: polyKind, type: 'sliver_vert', severity: 'auto', vertIdx: i, message: 'v' + i + '·' + ang.toFixed(1) + '° (近共线)' });
      }
    }

    // self-intersect·O(n²)·小 polygon ok
    if (n < 200){
      for (var i = 0; i < n; i++){
        var a1 = poly[i], a2 = poly[(i + 1) % n];
        for (var j = i + 2; j < n; j++){
          if (i === 0 && j === n - 1) continue;  // adjacent edges 不算
          var b1 = poly[j], b2 = poly[(j + 1) % n];
          if (segIntersect(a1, a2, b1, b2)){
            issues.push({ divId: divId, polyIdx: polyIdx, polyKind: polyKind, type: 'self_intersect', severity: 'error', vertIdx: i, edgeJ: j, message: 'edge ' + i + '↔' + j });
          }
        }
      }
    }

    // degenerate·面积
    var area = ME.polygonArea ? ME.polygonArea(poly) : 0;
    if (area < DEGEN_AREA){
      issues.push({ divId: divId, polyIdx: polyIdx, polyKind: polyKind, type: 'degenerate', severity: 'auto', message: 'area=' + area.toFixed(1) });
    }

    return issues;
  }

  function scanAll(){
    var divs = ME.EDITOR.map.divisions || [];
    var all = [];
    divs.forEach(function(d){
      // main polygon
      all.push.apply(all, scanPolygon(d.polygon, d.id, 0, 'main'));
      // extras
      if (d.extraPolygons){
        d.extraPolygons.forEach(function(e, i){
          all.push.apply(all, scanPolygon(e, d.id, i + 1, 'extra'));
        });
      }
      // holes (polygon 校验同标准)
      if (d.holes){
        d.holes.forEach(function(h, i){
          all.push.apply(all, scanPolygon(h, d.id, i + 1, 'hole'));
        });
      }
    });
    return all;
  }

  // ─── fix·只对 auto severity ─────────────────────────────

  function autoFix(issues){
    if (!issues || !issues.length) return 0;
    // 按 div 分·按 polyIdx 分·按 vertIdx 倒序删 (保 idx 稳定)
    var byDivPoly = {};
    issues.forEach(function(iss){
      if (iss.severity !== 'auto') return;
      var key = iss.divId + '|' + iss.polyIdx + '|' + iss.polyKind;
      if (!byDivPoly[key]) byDivPoly[key] = { divId: iss.divId, polyIdx: iss.polyIdx, polyKind: iss.polyKind, vertIdxs: [], drop: false };
      if (iss.type === 'degenerate'){
        byDivPoly[key].drop = true;
      } else if (iss.vertIdx != null){
        byDivPoly[key].vertIdxs.push(iss.vertIdx);
      }
    });

    var fixed = 0, droppedPolys = 0, droppedDivs = 0;
    ME.commitMutation('polygon 修复', function(){
      var divs = ME.EDITOR.map.divisions;
      Object.keys(byDivPoly).forEach(function(k){
        var info = byDivPoly[k];
        var d = divs.find(function(D){ return D.id === info.divId; });
        if (!d) return;
        var poly;
        if (info.polyKind === 'main') poly = d.polygon;
        else if (info.polyKind === 'extra') poly = d.extraPolygons && d.extraPolygons[info.polyIdx - 1];
        else if (info.polyKind === 'hole') poly = d.holes && d.holes[info.polyIdx - 1];
        if (!poly) return;

        if (info.drop){
          // 整 polygon 删
          if (info.polyKind === 'main'){
            // 主 polygon degenerate·删整 division
            divs.splice(divs.indexOf(d), 1);
            droppedDivs++;
          } else if (info.polyKind === 'extra'){
            d.extraPolygons.splice(info.polyIdx - 1, 1);
            if (d.extraPolygonsVids) d.extraPolygonsVids.splice(info.polyIdx - 1, 1);
            droppedPolys++;
          } else if (info.polyKind === 'hole'){
            d.holes.splice(info.polyIdx - 1, 1);
            if (d.holesVids) d.holesVids.splice(info.polyIdx - 1, 1);
            droppedPolys++;
          }
          return;
        }

        // 删 vertIdx (倒序去重)
        var dedup = {};
        info.vertIdxs.forEach(function(v){ dedup[v] = 1; });
        var sorted = Object.keys(dedup).map(Number).sort(function(a, b){ return b - a; });
        sorted.forEach(function(idx){
          if (poly.length > 3){
            poly.splice(idx, 1);
            fixed++;
          }
        });

        // 重 derive
        if (info.polyKind === 'main') ME.recomputeDerived(d);
      });
    });

    if (global.meToast){
      meToast('修·' + fixed + ' 顶 / -' + droppedPolys + ' poly / -' + droppedDivs + ' div', 'success');
    }
    return fixed;
  }

  // ─── modal·report + click 跳 ───────────────────────────

  var _modal = null;

  function openModal(){
    var issues = scanAll();
    if (!_modal){
      _modal = document.createElement('div');
      _modal.id = 'me-pf-modal';
      _modal.style.cssText = 'position:fixed; left:50%; top:50%; transform:translate(-50%, -50%); z-index:1000; width:560px; max-width:92vw; max-height:80vh; overflow:auto; background:linear-gradient(180deg, var(--ink-3), var(--ink-2)); border:1px solid var(--gold-3); border-radius:var(--rd-3); box-shadow:0 8px 32px rgba(0,0,0,0.7); padding:var(--sp-4); color:var(--paper-1); font-family:var(--font-serif);';
      document.body.appendChild(_modal);
    }

    var groups = {};
    issues.forEach(function(iss){
      groups[iss.type] = (groups[iss.type] || 0) + 1;
    });
    var typeNames = {
      'self_intersect': '自相交',
      'acute_angle': '锐角',
      'degenerate': '退化',
      'duplicate_vert': '重顶',
      'sliver_vert': '共线顶'
    };
    var typeColors = {
      'self_intersect': '#dc4f3a',
      'acute_angle': '#c5a04d',
      'degenerate': '#8a3a2e',
      'duplicate_vert': '#3d4f6a',
      'sliver_vert': '#7a8a4f'
    };

    var summary = '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:var(--sp-3);">' +
      Object.keys(groups).map(function(t){
        var c = typeColors[t] || '#666';
        return '<span style="padding:3px 10px; background:rgba(0,0,0,0.3); border:1px solid ' + c + '; border-radius:var(--rd-2); font-size:var(--fs-xs);"><span style="color:' + c + ';">●</span> ' + escHtml(typeNames[t] || t) + ' <b>' + groups[t] + '</b></span>';
      }).join('') + '</div>';

    var autoCount = issues.filter(function(i){ return i.severity === 'auto'; }).length;
    var listHtml = issues.length === 0
      ? '<div style="text-align:center; color:var(--jade-1); padding:var(--sp-4);">✓ 全 polygon 通过</div>'
      : '<div style="max-height:50vh; overflow-y:auto; border:1px solid var(--bd-1); border-radius:var(--rd-2);">' +
        issues.slice(0, 200).map(function(iss, i){
          var divs = ME.EDITOR.map.divisions;
          var d = divs.find(function(D){ return D.id === iss.divId; });
          var name = d ? (d.name || iss.divId) : iss.divId;
          var c = typeColors[iss.type] || '#666';
          var severityIcon = iss.severity === 'error' ? '⚠' : iss.severity === 'auto' ? '⚙' : 'ⓘ';
          return '<div class="me-pf-row" data-div="' + iss.divId + '" style="' +
            'padding:6px 10px; border-bottom:1px solid var(--bd-1); cursor:pointer;' +
            'display:flex; align-items:center; gap:8px;' +
          '">' +
            '<span style="color:' + c + '; font-size:14px;">' + severityIcon + '</span>' +
            '<span style="color:var(--gold-2); font-weight:var(--fw-sb); min-width:60px;">' + escHtml(name) + '</span>' +
            '<span style="color:var(--paper-2); font-size:var(--fs-xs);">' + escHtml(typeNames[iss.type] || iss.type) + '</span>' +
            '<span style="color:var(--paper-3); font-size:var(--fs-xxs); flex:1;">' + escHtml(iss.message) + '</span>' +
            '<span style="color:var(--paper-4); font-size:var(--fs-xxs);">' + (iss.polyKind || 'main') + (iss.polyIdx ? '#' + iss.polyIdx : '') + '</span>' +
          '</div>';
        }).join('') +
        (issues.length > 200 ? '<div style="padding:8px; text-align:center; color:var(--paper-3); font-size:var(--fs-xs);">··· 共 ' + issues.length + ' 项·只显前 200</div>' : '') +
      '</div>';

    _modal.innerHTML =
      '<div class="me-modal-title">polygon 校验·' + issues.length + ' 项</div>' +
      summary +
      listHtml +
      '<div class="me-modal-foot" style="margin-top:var(--sp-3); display:flex; gap:8px;">' +
        '<button class="me-btn" id="pf-rescan">重扫</button>' +
        '<button class="me-btn me-btn-warn" id="pf-fix" ' + (autoCount === 0 ? 'disabled style="opacity:0.4;"' : '') + '>一键修复·' + autoCount + ' 项</button>' +
        '<span style="margin-left:auto;"></span>' +
        '<button class="me-btn" id="pf-close">关</button>' +
      '</div>';

    _modal.style.display = 'block';

    _modal.querySelectorAll('.me-pf-row').forEach(function(row){
      row.addEventListener('click', function(){
        var divId = row.getAttribute('data-div');
        var d = ME.EDITOR.map.divisions.find(function(D){ return D.id === divId; });
        if (!d) return;
        if (TM.MapEditor.find && TM.MapEditor.find.gotoDivision){
          TM.MapEditor.find.gotoDivision(d);
        } else {
          ME.EDITOR.selectedIds = [d.id];
          ME.fire('selection-change');
          ME.requestRender();
        }
      });
    });
    _modal.querySelector('#pf-rescan').addEventListener('click', openModal);
    _modal.querySelector('#pf-close').addEventListener('click', function(){ _modal.style.display = 'none'; });
    var fb = _modal.querySelector('#pf-fix');
    if (fb && autoCount > 0){
      fb.addEventListener('click', function(){
        autoFix(issues);
        openModal();   // 重扫
      });
    }
  }

  // ─── 键盘 ──────────────────────────────────────────────

  function bindKeys(){
    document.addEventListener('keydown', function(e){
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
      if (e.ctrlKey && e.shiftKey && (e.key === 'g' || e.key === 'G')){
        e.preventDefault();
        openModal();
      }
    });
  }

  // ─── helpers ───────────────────────────────────────────

  function escHtml(s){
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ─── init ──────────────────────────────────────────────

  function init(){
    bindKeys();
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.polygonFix = {
    init: init,
    scanAll: scanAll,
    scanPolygon: scanPolygon,
    autoFix: autoFix,
    openModal: openModal
  };

})(typeof window !== 'undefined' ? window : this);
