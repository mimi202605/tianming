// tm-keju-corruption.js
// C2·主考腐败派生 paradigm·
//   _corrCalcExaminerCorruption(ch) → 0-100
//
// 公式·deptCorruption × 0.6 + partyCorruption × 0.3 + personal × 0.1
//   * deptCorruption·从 ch.officialTitle / ch.title 模糊匹配 GM.corruption.subDepts 字典
//   * partyCorruption·党派内成员平均 (100 - integrity)
//   * personal·(100 - ch.integrity) × 0.5 + (100 - ch.wuchang.li) × 0.5
//
// 不动 GM.corruption 数据结构·只读·派生 view·
// TODO·D4 完后·东厂 corruption≥40 时·此处加 × 1.3 加强 (现先不接 D4 hook)
//
// 浏览器 + Node 双兼容·纯函数无副作用·零依赖

(function () {
  'use strict';

  // 安全取 GM
  function _kjGM() {
    try {
      if (typeof GM !== 'undefined' && GM) return GM;
      if (typeof global !== 'undefined' && global.GM) return global.GM;
      if (typeof window !== 'undefined' && window.GM) return window.GM;
    } catch (e) { /* silent */ }
    return null;
  }

  /**
   * _kjGetDeptCorruption(officialTitle)
   * 从官职 (string) fuzzy match GM.corruption.subDepts (或 byDept) 字典
   * 命中规则·officialTitle.indexOf(deptKey) >= 0 即命中 (如"礼部尚书"命中"礼部")
   * 未命中或缺数据 → 回落 GM.corruption.overall / trueIndex → 默 30
   *
   * subDepts 值结构·可能是 { true: number, ... } 或 直接 number·都支持
   */
  function _kjGetDeptCorruption(officialTitle) {
    if (!officialTitle) return 30;
    var gm = _kjGM();
    var corr = (gm && gm.corruption) || null;
    if (!corr) return 30;

    var depts = corr.subDepts || corr.byDept || {};
    var keys = Object.keys(depts);
    for (var i = 0; i < keys.length; i++) {
      if (officialTitle.indexOf(keys[i]) >= 0) {
        var d = depts[keys[i]];
        if (typeof d === 'number') return d;
        if (d && typeof d === 'object') {
          if (typeof d.true === 'number')     return d.true;
          if (typeof d.value === 'number')    return d.value;
          if (typeof d.trueIndex === 'number') return d.trueIndex;
        }
        return 30;
      }
    }

    // 回落 overall / trueIndex
    if (typeof corr.trueIndex === 'number') return corr.trueIndex;
    if (typeof corr.overall === 'number')   return corr.overall;
    return 30;
  }

  /**
   * _kjCalcPartyCorruption(party)
   * 党派内 alive 成员平均 (100 - integrity)
   * 无党 / 中立 → 默 20 (低基线)
   * 无成员 → 30
   */
  function _kjCalcPartyCorruption(party) {
    if (!party || party === '中立' || party === '无党' || party === '无党派') return 20;
    var gm = _kjGM();
    if (!gm || !Array.isArray(gm.chars)) return 30;
    var members = gm.chars.filter(function (c) {
      return c && c.alive !== false && c.party === party;
    });
    if (!members.length) return 30;
    var sumIntegrity = members.reduce(function (s, c) {
      return s + (typeof c.integrity === 'number' ? c.integrity : 50);
    }, 0);
    var avgIntegrity = sumIntegrity / members.length;
    return Math.max(0, Math.min(100, 100 - avgIntegrity));
  }

  /**
   * _corrCalcExaminerCorruption(ch) → 0-100 (round)
   * 派生公式·dept × 0.6 + party × 0.3 + personal × 0.1
   * 钳制 0-100·四舍五入
   */
  function _corrCalcExaminerCorruption(ch) {
    if (!ch) return 0;
    var deptCorr  = _kjGetDeptCorruption(ch.officialTitle || ch.title);
    var partyCorr = _kjCalcPartyCorruption(ch.party);
    var integrity = (typeof ch.integrity === 'number') ? ch.integrity : 50;
    var li = (ch.wuchang && typeof ch.wuchang.li === 'number') ? ch.wuchang.li : 50;
    var personal = (100 - integrity) * 0.5 + (100 - li) * 0.5;
    var total = deptCorr * 0.6 + partyCorr * 0.3 + personal * 0.1;
    // TODO·D4·东厂 corruption≥40 × 1.3 加强 hook 接入点
    return Math.max(0, Math.min(100, Math.round(total)));
  }

  // --- 暴露 ---
  if (typeof window !== 'undefined') {
    window._kjGetDeptCorruption        = _kjGetDeptCorruption;
    window._kjCalcPartyCorruption      = _kjCalcPartyCorruption;
    window._corrCalcExaminerCorruption = _corrCalcExaminerCorruption;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      _kjGetDeptCorruption:        _kjGetDeptCorruption,
      _kjCalcPartyCorruption:      _kjCalcPartyCorruption,
      _corrCalcExaminerCorruption: _corrCalcExaminerCorruption
    };
  }
})();
