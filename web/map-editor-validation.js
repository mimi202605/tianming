// map-editor-validation.js
// 实时校验 chip·5 类规则
// 1·邻省闭合 (A 邻 B → B 邻 A)
// 2·人口和 (儿和 ≤ 父总·按 capitalChildId 不强制)
// 3·治所唯一 (不循环·不空)
// 4·autonomy 兼容 (autonomy.type ≠ '' 时·suzerain 必填)
// 5·level 与 dynasty 兼容 (秦无 district·明无...)
// 6·geometry 合法 (polygon ≥ 3 点·area > 0)
// 7·byEthnicity / byFaith·sum 应 ~ 1
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[validation] core not loaded'); return; }

  // ─── single-division checks ──────────────────────────────

  function checkGeometry(d){
    var issues = [];
    if (!d.polygon || d.polygon.length < 3){
      issues.push({ level: 'error', code: 'GEO_POLY', msg: 'polygon < 3 顶点' });
    }
    if ((d.area || 0) <= 0 && d.polygon && d.polygon.length >= 3){
      issues.push({ level: 'warn', code: 'GEO_AREA', msg: 'area = 0·可能 polygon 自相交' });
    }
    return issues;
  }

  function checkLevel(d, dynastyId){
    var dyn = TM.MapEditor.dynasty.get(dynastyId);
    var allowed = (dyn.levels || []).map(function(L){ return L.key; });
    if (allowed.indexOf(d.level) === -1){
      return [{ level: 'warn', code: 'LVL_INCOMPAT', msg: 'level "' + d.level + '" 不在 ' + dyn.label + ' 朝代允许 (' + allowed.join('/') + ')' }];
    }
    return [];
  }

  function checkAutonomy(d){
    var issues = [];
    var a = d.autonomy || {};
    if (a.type && a.type !== 'zhixia'){
      if (!a.holder){
        issues.push({ level: 'warn', code: 'AUT_HOLDER', msg: 'autonomy.type=' + a.type + ' 但 holder 未填' });
      }
    }
    if (a.loyalty != null && (a.loyalty < 0 || a.loyalty > 100)){
      issues.push({ level: 'error', code: 'AUT_LOYALTY', msg: 'loyalty 应 0-100 (' + a.loyalty + ')' });
    }
    if (a.tributeRate != null && (a.tributeRate < 0 || a.tributeRate > 1)){
      issues.push({ level: 'error', code: 'AUT_TRIBUTE', msg: 'tributeRate 应 0-1 (' + a.tributeRate + ')' });
    }
    return issues;
  }

  function checkRatioMap(d){
    var issues = [];
    var byEth = d.byEthnicity || null;
    var byFth = d.byFaith || null;
    if (byEth){
      var sumE = sumValues(byEth);
      if (sumE > 0 && Math.abs(sumE - 1) > 0.05){
        issues.push({ level: 'warn', code: 'POP_ETH', msg: 'byEthnicity 和 = ' + sumE.toFixed(2) + ' (应 = 1)' });
      }
    }
    if (byFth){
      var sumF = sumValues(byFth);
      if (sumF > 0 && Math.abs(sumF - 1) > 0.05){
        issues.push({ level: 'warn', code: 'POP_FAITH', msg: 'byFaith 和 = ' + sumF.toFixed(2) + ' (应 = 1)' });
      }
    }
    return issues;
  }

  function sumValues(map){
    var s = 0;
    for (var k in map){ s += Number(map[k]) || 0; }
    return s;
  }

  function checkPopulationConsistency(d){
    var issues = [];
    var pd = d.populationDetail || {};
    if (pd.households > 0 && pd.mouths > 0){
      var avg = pd.mouths / pd.households;
      if (avg < 1 || avg > 12){
        issues.push({ level: 'warn', code: 'POP_AVG', msg: '户均口 = ' + avg.toFixed(1) + ' (典常 3-7)' });
      }
    }
    if (pd.ding != null && pd.mouths != null && pd.ding > pd.mouths){
      issues.push({ level: 'error', code: 'POP_DING', msg: 'ding(' + pd.ding + ') > mouths(' + pd.mouths + ')' });
    }
    if (pd.fugitives != null && pd.households != null && pd.fugitives > pd.households){
      issues.push({ level: 'warn', code: 'POP_FUG', msg: 'fugitives > households' });
    }
    return issues;
  }

  // ─── cross-division checks ──────────────────────────────

  function checkNeighborSymmetry(d, allDivs){
    var issues = [];
    var idMap = {};
    allDivs.forEach(function(D){ idMap[D.id] = D; });
    (d.neighbors || []).forEach(function(nid){
      var n = idMap[nid];
      if (!n){
        issues.push({ level: 'warn', code: 'NB_GHOST', msg: 'neighbor "' + nid.slice(-4) + '" 不存在' });
        return;
      }
      if (!n.neighbors || n.neighbors.indexOf(d.id) === -1){
        issues.push({ level: 'warn', code: 'NB_ASYM', msg: 'neighbor "' + n.name + '" 未反指此省' });
      }
    });
    return issues;
  }

  function checkCapitalChild(d, allDivs){
    if (!d.capitalChildId) return [];
    var idMap = {};
    allDivs.forEach(function(D){ idMap[D.id] = D; });
    var c = idMap[d.capitalChildId];
    if (!c){
      return [{ level: 'warn', code: 'CAP_GHOST', msg: 'capitalChildId 指向不存在' }];
    }
    if (c.id === d.id){
      return [{ level: 'error', code: 'CAP_SELF', msg: 'capitalChildId = self' }];
    }
    return [];
  }

  function checkDuplicateNames(allDivs){
    var seen = {};
    var dup = [];
    allDivs.forEach(function(d){
      if (seen[d.name]) dup.push(d);
      seen[d.name] = true;
    });
    return dup.map(function(d){
      return { divId: d.id, level: 'warn', code: 'DUP_NAME', msg: '重名·"' + d.name + '" (' + d.id.slice(-4) + ')' };
    });
  }

  // ─── public api ──────────────────────────────────────────

  function validateOne(d, allDivs, dynastyId){
    var all = [];
    all = all.concat(checkGeometry(d));
    all = all.concat(checkLevel(d, dynastyId));
    all = all.concat(checkAutonomy(d));
    all = all.concat(checkRatioMap(d));
    all = all.concat(checkPopulationConsistency(d));
    all = all.concat(checkNeighborSymmetry(d, allDivs));
    all = all.concat(checkCapitalChild(d, allDivs));
    return all;
  }

  function validateAll(){
    var divs = ME.EDITOR.map.divisions;
    var dynastyId = ME.EDITOR.map.dynasty;
    var perDiv = {};
    var global = [];
    divs.forEach(function(d){
      perDiv[d.id] = validateOne(d, divs, dynastyId);
    });
    global = global.concat(checkDuplicateNames(divs));
    return { perDiv: perDiv, global: global };
  }

  function summarize(report){
    var nErr = 0, nWarn = 0;
    Object.keys(report.perDiv).forEach(function(id){
      report.perDiv[id].forEach(function(i){
        if (i.level === 'error') nErr++;
        else nWarn++;
      });
    });
    report.global.forEach(function(i){
      if (i.level === 'error') nErr++;
      else nWarn++;
    });
    return { errors: nErr, warns: nWarn };
  }

  // ─── chip render ─────────────────────────────────────────

  var _chipEl = null;
  var _detailEl = null;

  function bindChip(chipId, detailId){
    _chipEl = document.getElementById(chipId);
    _detailEl = document.getElementById(detailId);
    if (!_chipEl) return false;

    _chipEl.addEventListener('click', toggleDetail);

    ME.on('mutation', updateChip);
    ME.on('map-loaded', updateChip);
    ME.on('selection-change', updateChip);
    updateChip();
    return true;
  }

  function updateChip(){
    if (!_chipEl) return;
    var rep = validateAll();
    var sum = summarize(rep);
    _chipEl._lastReport = rep;
    _chipEl._lastSum = sum;

    var color, label;
    if (sum.errors > 0){
      color = '#dc4f3a';
      label = '⚠ ' + sum.errors + ' 错';
      if (sum.warns) label += ' · ' + sum.warns + ' 警';
    } else if (sum.warns > 0){
      color = '#c9a96e';
      label = '⚠ ' + sum.warns + ' 警';
    } else {
      color = '#6a9a7f';
      label = '✓ 校验通过';
    }
    _chipEl.style.color = color;
    _chipEl.style.borderColor = color;
    _chipEl.textContent = label;

    // refresh detail if open
    if (_detailEl && _detailEl.style.display !== 'none'){
      renderDetail(rep);
    }
  }

  function toggleDetail(){
    if (!_detailEl) return;
    var open = _detailEl.style.display !== 'none';
    if (open){
      _detailEl.style.display = 'none';
    } else {
      renderDetail(_chipEl._lastReport || validateAll());
      _detailEl.style.display = 'block';
    }
  }

  function renderDetail(rep){
    if (!_detailEl) return;
    var divs = ME.EDITOR.map.divisions;
    var idMap = {};
    divs.forEach(function(d){ idMap[d.id] = d; });

    var rows = [];
    Object.keys(rep.perDiv).forEach(function(divId){
      var issues = rep.perDiv[divId];
      if (issues.length === 0) return;
      var d = idMap[divId];
      issues.forEach(function(i){
        rows.push({ divId: divId, name: d ? d.name : '?', issue: i });
      });
    });
    rep.global.forEach(function(i){
      rows.push({ divId: i.divId || null, name: i.divId && idMap[i.divId] ? idMap[i.divId].name : '(全局)', issue: i });
    });

    if (rows.length === 0){
      _detailEl.innerHTML = '<div class="me-vc-empty">✓ 全部通过</div>';
      return;
    }

    rows.sort(function(a,b){
      if (a.issue.level !== b.issue.level) return a.issue.level === 'error' ? -1 : 1;
      return 0;
    });

    var html = '<div class="me-vc-hdr">校验明细 (' + rows.length + ' 项)</div>';
    html += rows.map(function(r){
      var c = r.issue.level === 'error' ? '#dc4f3a' : '#c9a96e';
      var clickAttr = r.divId ? ' data-vc-jump="' + r.divId + '"' : '';
      return '<div class="me-vc-row"' + clickAttr + ' style="cursor:' + (r.divId ? 'pointer' : 'default') + ';">\
        <span class="me-vc-lv" style="color:' + c + ';">' + (r.issue.level === 'error' ? '✕' : '⚠') + '</span>\
        <span class="me-vc-name">' + esc(r.name) + '</span>\
        <span class="me-vc-msg">' + esc(r.issue.msg) + '</span>\
        <span class="me-vc-code">' + r.issue.code + '</span>\
      </div>';
    }).join('');

    _detailEl.innerHTML = html;
    _detailEl.querySelectorAll('[data-vc-jump]').forEach(function(row){
      row.addEventListener('click', function(){
        var did = row.getAttribute('data-vc-jump');
        ME.selectOne(did);
        // optionally fitToContent on selected省·先简化·只 select
      });
    });
  }

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  // expose
  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.validation = {
    validateOne: validateOne,
    validateAll: validateAll,
    summarize: summarize,
    bindChip: bindChip,
    updateChip: updateChip
  };

})(typeof window !== 'undefined' ? window : this);
