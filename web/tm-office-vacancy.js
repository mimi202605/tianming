// tm-office-vacancy.js — P1-C1 地方官缺写口（激活死字段 div.officeVacancy）
//   owner 选「div 加地方官位模型」(2026-06-20)。建制(按 regionType 省3/府2/州县1) − 实任 = 官缺。
//   读链 field-pipelines:53 已就位(div.officeVacancy → 政令执行率 vac×8% 封顶24%)·只差写端·本模块补写。
//   实任关联：chars 无 region 字段·靠 officialTitle 含本区核心地名匹配(任免改 officialTitle → 实任动态变)+governor 兜底。
//   跨朝代：建制按通用 regionType(省/府/州/县)·非明专名。开关 officeVacancyEnabled 默认开(owner 拍板·活化修复直接生效·显式 false 可关)。
//   局限：佐贰精确实任待完整地方官位模型(chars region 字段)·当前 officialTitle 地名匹配是近似。
(function (global) {
  'use strict';

  // 建制官数：按区划层级(主官+佐贰)。省级 3 / 府级 2 / 州县 1 / 默认 2。
  function _establishedOffices(div) {
    var s = String(div.regionType || div.level || div.type || '') + String(div.name || '');
    if (/省|布政|总督|巡抚|province/i.test(s)) return 3;
    if (/府|prefecture/i.test(s)) return 2;
    if (/州|县|卫|所|county/i.test(s)) return 1;
    return 2;
  }

  // 核心地名(去层级后缀)·用于 officialTitle 匹配
  function _coreGeoName(name) {
    return String(name || '').replace(/[省府州县司卫所道路军]/g, '').trim();
  }

  function tickOfficeVacancy() {
    var P = global.P || {};
    if (P.conf && P.conf.officeVacancyEnabled === false) return;   // 默认开·显式 false 才关(owner 拍板·活化修复直接生效)
    var G = global.GM;
    if (!G || !G.adminHierarchy) return;
    var chars = Array.isArray(G.chars) ? G.chars : [];
    var ah = G.adminHierarchy;

    Object.keys(ah).forEach(function (fid) {
      var fac = ah[fid];
      if (!fac || !fac.divisions) return;
      (function walk(list) {
        for (var li = 0; li < list.length; li++) {
          var div = list[li];
          if (!div) continue;
          var kids = div.divisions || div.children;
          if (kids && kids.length) { walk(kids); continue; }   // 非叶·下钻
          // 叶 div·算官缺
          var est = _establishedOffices(div);
          var core = _coreGeoName(div.name);
          var actual = 0;
          if (core) {
            for (var i = 0; i < chars.length; i++) {
              var c = chars[i];
              if (!c || c.alive === false || c._captured || !c.officialTitle) continue;
              if (String(c.officialTitle).indexOf(core) >= 0) actual++;   // 实任(officialTitle 含本区地名)
            }
          }
          if (actual === 0 && div.governor && String(div.governor).trim()) actual = 1;  // governor 兜底(主官 char 数据不全时)
          var supply = Number(div.officialSupply) || 0;   // A4·育才储官(书院/学宫自拟营建写)·补实任降官缺
          div.officeVacancy = Math.max(0, est - actual - supply);
        }
      })(fac.divisions);
    });
  }

  global.OfficeVacancy = { tick: tickOfficeVacancy, _establishedOffices: _establishedOffices };

  if (global.SettlementPipeline && typeof global.SettlementPipeline.register === 'function') {
    global.SettlementPipeline.register('officeVacancy', '地方官缺', tickOfficeVacancy, 21, 'perturn');
  }
})(typeof window !== 'undefined' ? window : this);
