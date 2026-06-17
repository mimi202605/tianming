// @ts-check
/// <reference path="types.d.ts" />
// ============================================================
// Module: tm-endturn-qiaozhi.js — 侨置系统 (R161·R7·从 tm-endturn-province.js 拆出)
// Domain: 侨置 (领土丢失/收复后的侨置行政区生命周期)
// Status: active · Last Updated: 2026-05-04 (Phase 3 R7·从 tm-endturn-province.js carve out)
// Owner: TM 团队
// Imports: GM·P.adminHierarchy·toast·addEB
// Exports: 3 top-level functions
//   - openQiaozhiPanel(lostName) — 打开侨置选择面板 (领土丢失后调用)
//   - doQiaozhi(lostName, mode) — 执行侨置操作 (allocated/standalone)
//   - restoreQiaozhiDivision(qiaozhiName, recoveredDivisionName) — 收复领土时撤销侨置
// Used by: tm-memorials·tm-endturn-province (作为 sibling)
// Side effects: GM._lostTerritories·P.adminHierarchy·GM.provinceStats mutation·UI panel
// Test: official-scenario-smoke (覆盖 admin 行政区数据流)
// Notes: R161 R7·从 tm-endturn-province.js L2230-2479 carve out·**侨置作为独立 feature 模块**
// 姊妹: tm-endturn-province.js·tm-endturn-core.js·tm-endturn-helpers.js·tm-endturn-render.js·tm-endturn-edict.js
// ============================================================

// ============================================================
// ============================================================
// 侨置系统（P3）
// ============================================================

function _qiaozhiFindDivisionByName(divs, name) {
  var found = null;
  (function walk(list) {
    for (var i = 0; i < (list || []).length; i++) {
      if (list[i].name === name) { found = list[i]; return; }
      if (list[i].children) walk(list[i].children);
    }
  })(divs);
  return found;
}

/**
 * 打开侨置选择面板（领土丢失后调用）
 * lostName: 丢失的行政区名称
 */
function openQiaozhiPanel(lostName) {
  if (!GM._lostTerritories || !GM._lostTerritories[lostName]) {
    toast('\u627E\u4E0D\u5230\u4E22\u5931\u9886\u571F\u8BB0\u5F55');
    return;
  }

  var lostData = GM._lostTerritories[lostName];
  var lostNode = lostData.node;

  // 获取可作为宿主的现有行政区
  var _ahKey = P.adminHierarchy ? (P.adminHierarchy.player ? 'player' : Object.keys(P.adminHierarchy)[0]) : null;
  var _ahData = _ahKey ? P.adminHierarchy[_ahKey] : null;
  var hostOptions = [];
  if (_ahData && _ahData.divisions) {
    _ahData.divisions.forEach(function(d) {
      if (d.name !== '\u672A\u5B9A\u884C\u653F\u533A') {
        hostOptions.push(d.name);
      }
    });
  }

  var html = '<div style="padding:1rem;">';
  html += '<div style="margin-bottom:1rem;color:var(--txt-l);font-size:0.9rem;">\u300C' + lostName + '\u300D\u5DF2\u5931\u9677\uFF0C\u662F\u5426\u4FA8\u7F6E\uFF1F</div>';
  html += '<div style="margin-bottom:1rem;font-size:0.82rem;color:var(--txt-d);">\u539F\u4EBA\u53E3\uFF1A' + formatNumber(lostNode.population || 0)
    + ' | \u539F\u7E41\u8363\uFF1A' + (lostNode.prosperity || 0)
    + ' | \u5931\u4E8E\uFF1A' + (lostData.lostTo || '\u654C\u65B9')
    + ' | \u7B2C' + lostData.turn + '\u56DE\u5408</div>';

  // 选项1：不侨置（直接撤销）
  html += '<div style="background:var(--bg-2);padding:0.8rem;border-radius:6px;margin-bottom:0.8rem;cursor:pointer;border:1px solid transparent;" '
    + 'onmouseover="this.style.borderColor=\'var(--gold)\'" onmouseout="this.style.borderColor=\'transparent\'" '
    + 'onclick="doQiaozhi(\'' + lostName.replace(/'/g, '') + '\',\'none\')">';
  html += '<div style="font-weight:700;margin-bottom:0.3rem;">\u4E0D\u4FA8\u7F6E\uFF0C\u76F4\u63A5\u64A4\u9500</div>';
  html += '<div style="font-size:0.78rem;color:var(--txt-d);">\u653E\u5F03\u8BE5\u884C\u653F\u533A\u5212\u7684\u540D\u4E49\u548C\u5B98\u5236\u3002</div>';
  html += '</div>';

  // 选项2：纯名义侨置
  html += '<div style="background:var(--bg-2);padding:0.8rem;border-radius:6px;margin-bottom:0.8rem;cursor:pointer;border:1px solid transparent;" '
    + 'onmouseover="this.style.borderColor=\'var(--gold)\'" onmouseout="this.style.borderColor=\'transparent\'" '
    + 'onclick="doQiaozhi(\'' + lostName.replace(/'/g, '') + '\',\'nominal\')">';
  html += '<div style="font-weight:700;margin-bottom:0.3rem;">\u7EAF\u540D\u4E49\u4FA8\u7F6E</div>';
  html += '<div style="font-size:0.78rem;color:var(--txt-d);">\u4FDD\u7559\u5B98\u5236\u548C\u5B98\u804C\uFF08\u5982\u4FA8\u7F6E' + lostName + '\u523A\u53F2\uFF09\uFF0C\u4F46\u65E0\u5B9E\u9645\u7ECF\u6D4E\u6570\u636E\u548C\u7BA1\u8F96\u3002\u5F85\u6536\u590D\u540E\u53EF\u6062\u590D\u3002</div>';
  html += '</div>';

  // 选项3：划出治所侨置
  if (hostOptions.length > 0) {
    html += '<div style="background:var(--bg-2);padding:0.8rem;border-radius:6px;margin-bottom:0.8rem;">';
    html += '<div style="font-weight:700;margin-bottom:0.3rem;">\u5212\u51FA\u6CBB\u6240\u4FA8\u7F6E</div>';
    html += '<div style="font-size:0.78rem;color:var(--txt-d);margin-bottom:0.5rem;">\u4ECE\u73B0\u6709\u884C\u653F\u533A\u5212\u51FA\u4E00\u90E8\u5206\u7586\u57DF\u7ED9\u4FA8\u7F6E\u7684' + lostName + '\uFF0C\u7B49\u540C\u6B63\u5E38\u884C\u653F\u533A\u3002\u5BBF\u4E3B\u7ECF\u6D4E/\u4EBA\u53E3\u6570\u636E\u4F1A\u51CF\u5C11\u3002</div>';
    html += '<div style="display:flex;align-items:center;gap:0.5rem;">';
    html += '<span style="font-size:0.82rem;">\u5BBF\u4E3B\uFF1A</span>';
    html += '<select id="qiaozhi-host" style="flex:1;padding:4px;background:var(--bg-3);border:1px solid var(--bg-4);color:var(--txt-l);border-radius:4px;">';
    hostOptions.forEach(function(h) {
      html += '<option value="' + h + '">' + h + '</option>';
    });
    html += '</select>';
    html += '<button class="bt bsm" onclick="doQiaozhi(\'' + lostName.replace(/'/g, '') + '\',\'allocated\')">\u786E\u5B9A</button>';
    html += '</div>';
    html += '</div>';
  }

  html += '</div>';

  openGenericModal('\u4FA8\u7F6E\u51B3\u7B56 \u2014 ' + lostName, html, null);
}

/**
 * 执行侨置操作
 * mode: 'none' | 'nominal' | 'allocated'
 */
function doQiaozhi(lostName, mode) {
  if (!GM._lostTerritories || !GM._lostTerritories[lostName]) { closeGenericModal(); return; }

  var lostData = GM._lostTerritories[lostName];
  var lostNode = lostData.node;

  var _ahKey = P.adminHierarchy ? (P.adminHierarchy.player ? 'player' : Object.keys(P.adminHierarchy)[0]) : null;
  var _ahData = _ahKey ? P.adminHierarchy[_ahKey] : null;

  if (mode === 'none') {
    // 不侨置，彻底撤销
    delete GM._lostTerritories[lostName];
    addEB('\u884C\u653F', '\u64A4\u9500' + lostName + '\u884C\u653F\u533A\u5212\uFF0C\u4E0D\u4FA8\u7F6E');

  } else if (mode === 'nominal') {
    // 纯名义侨置：保留节点在树中但标记为侨置
    if (_ahData) {
      var nominalNode = {
        id: 'div_qz_' + Date.now(),
        name: '\u4FA8\u7F6E' + lostName,
        level: lostNode.level || '',
        officialPosition: lostNode.officialPosition || '',
        governor: lostNode.governor || '',
        description: '\u4FA8\u7F6E\uFF08\u7EAF\u540D\u4E49\uFF09\uFF0C\u539F' + lostName + '\u5931\u9677\u4E8E' + (lostData.lostTo || '\u654C\u65B9'),
        population: 0, prosperity: 0,
        terrain: '', specialResources: '', taxLevel: '\u65E0',
        _isQiaozhi: true, _qiaozhiType: 'nominal',
        _originalName: lostName, _lostTo: lostData.lostTo || '',
        children: []
      };
      _ahData.divisions.push(nominalNode);
    }
    addEB('\u884C\u653F', lostName + '\u7EAF\u540D\u4E49\u4FA8\u7F6E\uFF0C\u4FDD\u7559\u5B98\u5236');

  } else if (mode === 'allocated') {
    // 划出治所侨置
    var hostName = '';
    var hostEl = document.getElementById('qiaozhi-host');
    if (hostEl) hostName = hostEl.value;
    if (!hostName || !_ahData) { toast('\u8BF7\u9009\u62E9\u5BBF\u4E3B'); return; }

    // 从宿主划出20%人口和经济
    var hostFound = _qiaozhiFindDivisionByName(_ahData.divisions, hostName);

    if (!hostFound) { toast('\u5BBF\u4E3B\u4E0D\u5B58\u5728'); return; }

    var transferPop = Math.floor((hostFound.population || 0) * 0.2);
    var transferPros = Math.floor((hostFound.prosperity || 0) * 0.15);
    hostFound.population = Math.max(0, (hostFound.population || 0) - transferPop);
    hostFound.prosperity = Math.max(10, (hostFound.prosperity || 50) - transferPros);

    var qzNode = {
      id: 'div_qz_' + Date.now(),
      name: '\u4FA8\u7F6E' + lostName,
      level: lostNode.level || '',
      officialPosition: lostNode.officialPosition || '',
      governor: lostNode.governor || '',
      description: '\u4FA8\u7F6E\u4E8E' + hostName + '\uFF0C\u539F' + lostName + '\u5931\u9677\u4E8E' + (lostData.lostTo || '\u654C\u65B9'),
      population: transferPop,
      prosperity: transferPros > 0 ? transferPros : 30,
      terrain: hostFound.terrain || '',
      specialResources: '', taxLevel: '\u4E2D',
      _isQiaozhi: true, _qiaozhiType: 'allocated',
      _originalName: lostName, _hostName: hostName, _lostTo: lostData.lostTo || '',
      children: []
    };

    // 添加为宿主的子节点
    if (!hostFound.children) hostFound.children = [];
    hostFound.children.push(qzNode);

    // 同步provinceStats
    if (!GM.provinceStats) GM.provinceStats = {};
    var _pfn = (P.playerInfo && P.playerInfo.factionName) || '';
    GM.provinceStats[qzNode.name] = {
      name: qzNode.name, owner: _pfn,
      population: transferPop, wealth: qzNode.prosperity,
      stability: 45, development: 30,
      taxRevenue: 0, militaryRecruits: 0,
      unrest: 20, corruption: 20,
      terrain: qzNode.terrain, specialResources: '',
      governor: qzNode.governor, taxLevel: '\u4E2D'
    };
    // 更新宿主provinceStats
    if (GM.provinceStats[hostName]) {
      GM.provinceStats[hostName].population = Math.max(0, (GM.provinceStats[hostName].population || 0) - transferPop);
    }

    addEB('\u884C\u653F', lostName + '\u4FA8\u7F6E\u4E8E' + hostName + '\uFF0C\u5212\u51FA\u4EBA\u53E3' + formatNumber(transferPop));

    // 宿主主官可能不满
    if (hostFound.governor) {
      var _govCh = findCharByName(hostFound.governor);
      if (_govCh) {
        if (typeof adjustCharacterLoyalty === 'function') {
          adjustCharacterLoyalty(_govCh, -5, '\u4FA8\u7F6E' + lostName + '\u4E8E\u5176\u8F96\u533A', { source:'qiaozhi-host-governor-discontent' });
        } else {
          var oldGovL = (typeof _govCh.loyalty === 'number' && isFinite(_govCh.loyalty)) ? _govCh.loyalty : 50;
          _govCh.loyalty = Math.max(0, oldGovL - 5);
        }
        _govCh.stress = Math.min(100, (_govCh.stress || 0) + 8);
        addEB('\u4EBA\u7269', hostFound.governor + '\u5BF9\u4FA8\u7F6E' + lostName + '\u4E8E\u5176\u8F96\u533A\u8868\u793A\u4E0D\u6EE1');
      }
    }
  }

  delete GM._lostTerritories[lostName];
  closeGenericModal();
  // 刷新省级经济面板（如果当前打开的话）
  var _peOverlay = document.querySelector('.generic-modal-overlay');
  if (_peOverlay) { try { _peRefreshContent(); } catch(e){try{window.TM&&TM.errors&&TM.errors.captureSilent(e,'tm-endturn-province');}catch(_){}} }
  toast('\u4FA8\u7F6E\u64CD\u4F5C\u5B8C\u6210');
}

/**
 * 收复领土——将侨置行政区转回原建制
 * qiaozhiName: 侨置节点名称（如"侨置豫州"）
 * recoveredDivisionName: 收复后的行政区名称（如"豫州"）
 */
function restoreQiaozhiDivision(qiaozhiName, recoveredDivisionName) {
  var _ahKey = P.adminHierarchy ? (P.adminHierarchy.player ? 'player' : Object.keys(P.adminHierarchy)[0]) : null;
  var _ahData = _ahKey ? P.adminHierarchy[_ahKey] : null;
  if (!_ahData) return;

  // 查找侨置节点
  function _findAndRemove(divs, parent) {
    for (var i = 0; i < divs.length; i++) {
      if (divs[i].name === qiaozhiName && divs[i]._isQiaozhi) {
        var node = divs[i];
        divs.splice(i, 1);
        return node;
      }
      if (divs[i].children) {
        var found = _findAndRemove(divs[i].children, divs[i]);
        if (found) return found;
      }
    }
    return null;
  }

  var qzNode = _findAndRemove(_ahData.divisions, null);
  if (!qzNode) { toast('\u627E\u4E0D\u5230\u4FA8\u7F6E\u8282\u70B9'); return; }

  // 如果是划出治所侨置，归还数据给宿主
  if (qzNode._qiaozhiType === 'allocated' && qzNode._hostName) {
    var hostFound = _qiaozhiFindDivisionByName(_ahData.divisions, qzNode._hostName);

    if (hostFound) {
      hostFound.population = (hostFound.population || 0) + (qzNode.population || 0);
      if (GM.provinceStats && GM.provinceStats[qzNode._hostName]) {
        GM.provinceStats[qzNode._hostName].population += qzNode.population || 0;
      }
    }

    // 移除侨置节点的provinceStats
    if (GM.provinceStats && GM.provinceStats[qiaozhiName]) {
      delete GM.provinceStats[qiaozhiName];
    }
  }

  addEB('\u884C\u653F', qiaozhiName + '\u64A4\u9500\u4FA8\u7F6E\uFF0C' + (recoveredDivisionName || qzNode._originalName) + '\u6062\u590D\u539F\u5EFA\u5236');
  toast('\u4FA8\u7F6E\u5DF2\u64A4\u9500\uFF0C\u539F\u5EFA\u5236\u6062\u590D');
}
