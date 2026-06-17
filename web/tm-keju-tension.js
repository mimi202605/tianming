// tm-keju-tension.js
// C2·GM._factionTension namespace·{ 党派名: 0-20 }·上限 20·下限 0
//
// paradigm·
//   * 党派名 dynamic·读 GM.parties[].name·剧本不同时代党不同·不 hardcode
//   * tension 全 0 起步·initFactionTension 调用点·initKejuSystem 或 endTurn 首次
//   * update·{ party, delta, reason } 单条事件·上下钳·写 addEB
//   * decay·endTurn 钩子·每年 -0.5 (向下取整)·防 tension 永久累积
//   * 敌党表·历史 hardcode·东林/阉党/浙楚齐宣昆·北宋新旧·南宋主战主和·唐牛李
//   * leaders·从 GM.chars 找该党 (intelligence+influence) top 3
//
// 浏览器 + Node 双兼容·纯函数无副作用 (除写 GM._factionTension + addEB)
// 零依赖·调用时按需读 GM·缺 GM 时安全降级

(function () {
  'use strict';

  // 安全取 GM (浏览器 / Node 双境)
  function _kjGM() {
    try {
      if (typeof GM !== 'undefined' && GM) return GM;
      if (typeof global !== 'undefined' && global.GM) return global.GM;
      if (typeof window !== 'undefined' && window.GM) return window.GM;
    } catch (e) { /* silent */ }
    return null;
  }

  /**
   * _kjInitFactionTension()
   * 读 GM.parties·all 0 初始化·已有值保留 (幂等)。
   * 调用点·initKejuSystem (Step 3) 或 endTurn 首次·
   */
  function _kjInitFactionTension() {
    var gm = _kjGM();
    if (!gm) return;
    if (!gm._factionTension) gm._factionTension = {};
    var parties = (gm.parties || []).map(function (p) { return p && p.name; }).filter(Boolean);
    parties.forEach(function (name) {
      if (typeof gm._factionTension[name] !== 'number') {
        gm._factionTension[name] = 0;
      }
    });
  }

  /**
   * _kjUpdateFactionTension(eventLog)
   * eventLog·{ party: '东林', delta: +1, reason: '钦点主考' }
   * 上下钳 0-20·log warn 若超界·写 addEB
   */
  function _kjUpdateFactionTension(eventLog) {
    if (!eventLog || !eventLog.party) return;
    _kjInitFactionTension();
    var gm = _kjGM();
    if (!gm) return;
    if (!gm._factionTension) gm._factionTension = {};
    var cur = gm._factionTension[eventLog.party] || 0;
    var delta = (typeof eventLog.delta === 'number') ? eventLog.delta : 0;
    var next = Math.max(0, Math.min(20, cur + delta));
    if (next !== cur + delta) {
      try { console.warn('[科举·C2] _kjUpdateFactionTension 钳制·' + eventLog.party + '·' + cur + '+' + delta + '→' + next); } catch (_) {}
    }
    gm._factionTension[eventLog.party] = next;
    try {
      if (typeof addEB === 'function') {
        var sign = delta >= 0 ? '+' : '';
        addEB('党争', eventLog.party + sign + delta + '·' + (eventLog.reason || ''));
      }
    } catch (e) { /* silent */ }
  }

  /**
   * _kjCalcTotalPartyTension()
   * 返当前所有党 tension 之和 (用于 sc16 _factions / UI bar / endTurn 阈值警戒)
   */
  function _kjCalcTotalPartyTension() {
    _kjInitFactionTension();
    var gm = _kjGM();
    if (!gm || !gm._factionTension) return 0;
    return Object.keys(gm._factionTension).reduce(function (sum, k) {
      return sum + (gm._factionTension[k] || 0);
    }, 0);
  }

  /**
   * _kjGetEnemyParties(party)
   * 历史敌党表·返该党的敌对党列表 (string[])
   * 表外党 → 空数组 (无敌)
   */
  function _kjGetEnemyParties(party) {
    if (!party || typeof party !== 'string') return [];
    var table = {
      // 明·东林周边
      '东林':   ['阉党', '浙党', '楚党', '齐党', '宣党', '昆党'],
      '东林党': ['阉党', '浙党', '楚党', '齐党', '宣党', '昆党'],
      '阉党':   ['东林', '东林党', '复社'],
      '浙党':   ['东林', '东林党'],
      '楚党':   ['东林', '东林党'],
      '齐党':   ['东林', '东林党'],
      '宣党':   ['东林', '东林党'],
      '昆党':   ['东林', '东林党'],
      '复社':   ['阉党'],
      // 北宋
      '新党':   ['旧党'],
      '旧党':   ['新党'],
      // 南宋
      '主战派': ['主和派'],
      '主和派': ['主战派'],
      '主战':   ['主和'],
      '主和':   ['主战'],
      // 唐·牛李党争
      '牛党':   ['李党'],
      '李党':   ['牛党']
    };
    return table[party] || [];
  }

  /**
   * _kjGetPartyLeaders(party, limit?)
   * 从 GM.chars 找该党·(intelligence + influence) 总分 top N (默 3)
   * 仅活人·过滤 alive === false
   */
  function _kjGetPartyLeaders(party, limit) {
    var n = (typeof limit === 'number' && limit > 0) ? limit : 3;
    if (!party) return [];
    var gm = _kjGM();
    if (!gm || !Array.isArray(gm.chars)) return [];
    return gm.chars
      .filter(function (c) {
        return c && c.alive !== false && c.party === party;
      })
      .sort(function (a, b) {
        var sa = (a.intelligence || 0) + (a.influence || 0);
        var sb = (b.intelligence || 0) + (b.influence || 0);
        return sb - sa;
      })
      .slice(0, n);
  }

  /**
   * _kjDecayFactionTension()
   * endTurn 钩子·每年 -0.5 (向下取整 Math.floor(x - 0.5))·下钳 0
   * TODO·J1 endTurn 衰减钩子接入时·由 endTurn 调用本函数·
   */
  function _kjDecayFactionTension() {
    _kjInitFactionTension();
    var gm = _kjGM();
    if (!gm || !gm._factionTension) return;
    Object.keys(gm._factionTension).forEach(function (k) {
      gm._factionTension[k] = Math.max(0, Math.floor((gm._factionTension[k] || 0) - 0.5));
    });
  }

  // --- 暴露 ---
  if (typeof window !== 'undefined') {
    window._kjInitFactionTension    = _kjInitFactionTension;
    window._kjUpdateFactionTension  = _kjUpdateFactionTension;
    window._kjCalcTotalPartyTension = _kjCalcTotalPartyTension;
    window._kjGetEnemyParties       = _kjGetEnemyParties;
    window._kjGetPartyLeaders       = _kjGetPartyLeaders;
    window._kjDecayFactionTension   = _kjDecayFactionTension;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      _kjInitFactionTension:    _kjInitFactionTension,
      _kjUpdateFactionTension:  _kjUpdateFactionTension,
      _kjCalcTotalPartyTension: _kjCalcTotalPartyTension,
      _kjGetEnemyParties:       _kjGetEnemyParties,
      _kjGetPartyLeaders:       _kjGetPartyLeaders,
      _kjDecayFactionTension:   _kjDecayFactionTension
    };
  }
})();
