// ============================================================
// tm-player-economy.js — 穿越模式·玩家赚钱与私产系统（Phase 4.5 · Task 16）
// ------------------------------------------------------------
// 跨朝代铁律：本文件绝不出现任何朝代专属机构/职务专名（一律由剧本 hook）。
//   - 不写"市舶司"（明清专名）→ 改用"海贸衙门"通称
//   - 不写"内阁/票拟/司礼监/东厂/八股"等明清专名
//   - 产业类型（酒楼/当铺/作坊）取中国古代通用商业形态
//   - 国库通称"帑廪"·内库通称"内帑"·不锚定某朝某署
// ------------------------------------------------------------
// 暴露：window.TM.PlayerEconomy.{init, getState, getBalance, addIncome, spend,
//   collectSalary, embezzle, acceptBribe, buyProperty, collectPropertyRevenue,
//   lendMoney, hoardGoods, confiscate, handleFactionExtortion, tick, renderPanel,
//   PROPERTY_TYPES}
// 依赖（运行时软依赖，缺席时降级）：
//   - CharEconEngine.Income.salary / Income.salaryGrain / CharEconEngine.confiscate
//   - GM.corruption.lumpSumIncidents（吏治腐败引擎风险触发路径）
//   - adjustMinxin / GM.minxin（放贷过度民怨触发路径）
//   - TM.Transmigration.isTransmigrationMode（穿越模式判定）
//   - GM / P / GM.chars / P.playerInfo
// 双路径挂载：global.TM.PlayerEconomy + module.exports
// ============================================================

(function () {
  var globalObj = (typeof window !== 'undefined') ? window
                : (typeof global !== 'undefined') ? global
                : (typeof globalThis !== 'undefined') ? globalThis
                : this;
  if (!globalObj.TM) globalObj.TM = {};

  // ── 跨朝代通用产业类型表（不写死某朝专名）──
  var PROPERTY_TYPES = {
    tavern:   { label: '酒楼', cost: 2000, baseRevenue: 120, riskTag: '市井' },
    pawnshop: { label: '当铺', cost: 3000, baseRevenue: 150, riskTag: '金融' },
    workshop: { label: '作坊', cost: 2500, baseRevenue: 130, riskTag: '百工' }
  };

  // ── 阈值常量（朝代中立·数值由引擎兜底·剧本可覆盖）──
  var LEND_MINGYUAN_THRESHOLD = 5000;       // 放贷累计超此阈值开始触民怨
  var LEND_MINGYUAN_PER_OVERFLOW = 1000;    // 每超 1000 两·民心 -1
  var HOARD_INVESTIGATION_BASE_RISK = 0.15; // 囤货触发海贸衙门调查基础风险
  var GRAY_CORR_PER_SILVER = 0.0002;        // 每两贪腐累计 corruption 字段 0.0002（5000 两 → 1.0）
  var CONFISCATE_LIVING_ALLOWANCE = 100;    // 抄家后留存基本生活费
  var LEDGER_MAX = 200;

  // ── 工具函数 ──
  function _isNum(v) { return typeof v === 'number' && !isNaN(v); }
  function _clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function _rndId(prefix) {
    return (prefix || 'pe_') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function _curTurn() {
    try { if (typeof GM !== 'undefined' && GM && _isNum(GM.turn)) return GM.turn; } catch (_) {}
    return 0;
  }
  function _toast(m) {
    if (typeof toast === 'function') { try { toast(m); return; } catch (_) {} }
    try { console.log('[PlayerEconomy]', m); } catch (_) {}
  }

  // ── 玩家银钱账本（独立于国库）──
  // 字段：cash / properties[] / investments[] / grayIncome[] / corruption /
  //       factionRelations / confiscated / ledger[]
  function _defaultState() {
    return {
      cash: 0,
      properties: [],
      investments: [],
      grayIncome: [],
      corruption: 0,
      factionRelations: {},
      confiscated: false,
      ledger: []
    };
  }

  function _getState() {
    try {
      // 2026-07-21 修·C3：统一数据位置到 GM._playerEconomy（与其它 13 系统一致）
      // 历史根因：原挂 P.playerInfo.playerEconomy·但 ui-render 读 GM._playerEconomy.cash·
      //   数据位置不一致导致顶栏银钱永远显示「—」·玩家看不到自己资产。
      // 修复：优先读 GM._playerEconomy·若 P.playerInfo.playerEconomy 有旧数据则迁移过去。
      // 兼容：存档若有旧 P.playerInfo.playerEconomy·首次访问时迁移到 GM·之后统一走 GM。
      // arch-ok: C3 数据位置统一·本文件即 _playerEconomy 写口本体·经裁定合法直写
      if (typeof GM !== 'undefined' && GM) {
        if (!GM._playerEconomy) {
          GM._playerEconomy = _defaultState(); // arch-ok
          // 迁移旧存档数据
          if (typeof P !== 'undefined' && P && P.playerInfo && P.playerInfo.playerEconomy) {
            try {
              var _old = P.playerInfo.playerEconomy;
              GM._playerEconomy.cash = (typeof _old.cash === 'number') ? _old.cash : 0; // arch-ok
              GM._playerEconomy.properties = Array.isArray(_old.properties) ? _old.properties : []; // arch-ok
              GM._playerEconomy.investments = Array.isArray(_old.investments) ? _old.investments : []; // arch-ok
              GM._playerEconomy.grayIncome = Array.isArray(_old.grayIncome) ? _old.grayIncome : []; // arch-ok
              GM._playerEconomy.corruption = (typeof _old.corruption === 'number') ? _old.corruption : 0; // arch-ok
              GM._playerEconomy.factionRelations = _old.factionRelations || {}; // arch-ok
              GM._playerEconomy.confiscated = !!_old.confiscated; // arch-ok
              GM._playerEconomy.ledger = Array.isArray(_old.ledger) ? _old.ledger : []; // arch-ok
            } catch (_) {}
            // 迁移完成·清旧位置防后续读写错位
            try { delete P.playerInfo.playerEconomy; } catch (_) {} // arch-ok
          }
        }
        return GM._playerEconomy;
      }
      // GM 缺席降级（如 smoke 测试环境）·仍走 P
      if (typeof P === 'undefined' || !P || !P.playerInfo) return null;
      if (!P.playerInfo.playerEconomy) {
        P.playerInfo.playerEconomy = _defaultState(); // arch-ok
      }
      return P.playerInfo.playerEconomy;
    } catch (_) { return null; }
  }

  function _ensureState() {
    var s = _getState();
    if (!s) return null;
    if (!Array.isArray(s.properties)) s.properties = [];
    if (!Array.isArray(s.investments)) s.investments = [];
    if (!Array.isArray(s.grayIncome)) s.grayIncome = [];
    if (!Array.isArray(s.ledger)) s.ledger = [];
    if (typeof s.cash !== 'number') s.cash = 0;
    if (typeof s.corruption !== 'number') s.corruption = 0;
    if (!s.factionRelations || typeof s.factionRelations !== 'object') s.factionRelations = {};
    return s;
  }

  function _pushLedger(s, kind, delta, reason) {
    s.ledger.push({
      id: _rndId(),
      turn: _curTurn(),
      kind: kind,
      delta: delta,
      reason: reason || '',
      at: Date.now()
    });
    if (s.ledger.length > LEDGER_MAX) s.ledger = s.ledger.slice(-LEDGER_MAX);
  }

  function _isTrans() {
    try {
      if (typeof TM !== 'undefined' && TM.Transmigration &&
          typeof TM.Transmigration.isTransmigrationMode === 'function') {
        return TM.Transmigration.isTransmigrationMode();
      }
    } catch (_) {}
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        return P.playerInfo.transmigrationMode === true;
      }
    } catch (_) {}
    return false;
  }

  function _getPlayerChar() {
    try {
      if (typeof GM === 'undefined' || !GM || !Array.isArray(GM.chars)) return null;
      var pi = (typeof P !== 'undefined' && P && P.playerInfo) ? P.playerInfo : null;
      var name = pi && pi.characterName;
      for (var i = 0; i < GM.chars.length; i++) {
        var c = GM.chars[i];
        if (!c) continue;
        if (c.isPlayer === true) return c;
        if (name && c.name === name) return c;
      }
    } catch (_) {}
    return null;
  }

  // ─────────────────────────────────────────────────────────
  // API
  // ─────────────────────────────────────────────────────────

  function init() {
    var s = _ensureState();
    return !!s;
  }

  function getState() {
    var s = _getState();
    return s ? JSON.parse(JSON.stringify(s)) : null;
  }

  function getBalance() {
    var s = _getState();
    return s ? (s.cash || 0) : 0;
  }

  // 收入入账（通用入口·官俸/赏赐/经营/灰色皆可走此）
  function addIncome(source, amount, opts) {
    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };
    if (!_isNum(amount) || amount <= 0) return { ok: false, reason: '金额非法' };
    s.cash += amount;
    _pushLedger(s, 'income:' + (source || 'unknown'), amount, (opts && opts.reason) || '');
    return { ok: true, cash: s.cash };
  }

  // 支出
  function spend(cost, reason) {
    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };
    if (!_isNum(cost) || cost < 0) return { ok: false, reason: '金额非法' };
    if (s.cash < cost) return { ok: false, reason: '银钱不足', cash: s.cash };
    s.cash -= cost;
    _pushLedger(s, 'spend', -cost, reason || '');
    return { ok: true, cash: s.cash };
  }

  // ── 每月初自动领取官俸（复用 tm-char-economy-engine.js 的 14 类角色俸禄）──
  function collectSalary() {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };
    var ch = _getPlayerChar();
    if (!ch) return { ok: false, reason: '玩家角色未就绪' };

    var silver = 0, grain = 0;
    try {
      if (typeof CharEconEngine !== 'undefined' && CharEconEngine.Income) {
        silver = CharEconEngine.Income.salary(ch) || 0;
        grain = CharEconEngine.Income.salaryGrain(ch) || 0;
      }
    } catch (_) {}
    // 兜底：CharEconEngine 缺席时按品级 × 15 两/月（与 tm-char-economy-engine.js 公式同源）
    if (!silver && ch.officialTitle) {
      var rank = ch.rankLevel || 5;
      silver = rank * 15;
    }
    if (silver > 0) {
      s.cash += silver;
      _pushLedger(s, 'income:salary', silver, '官俸·月支');
    }
    return { ok: true, silver: silver, grain: grain, cash: s.cash };
  }

  // ── 贪墨（侵公）──
  function embezzle(amount, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };
    if (!_isNum(amount) || amount <= 0) return { ok: false, reason: '金额非法' };
    s.cash += amount;
    s.corruption += amount * GRAY_CORR_PER_SILVER;
    s.grayIncome.push({
      id: _rndId('em_'),
      kind: 'embezzle',
      amount: amount,
      turn: _curTurn(),
      reason: (opts && opts.reason) || '贪墨'
    });
    _pushLedger(s, 'income:embezzle', amount, (opts && opts.reason) || '贪墨');
    _triggerCorruptionRisk('embezzle', amount, opts);
    return { ok: true, cash: s.cash, corruption: s.corruption };
  }

  // ── 受贿 ──
  function acceptBribe(amount, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };
    if (!_isNum(amount) || amount <= 0) return { ok: false, reason: '金额非法' };
    s.cash += amount;
    s.corruption += amount * GRAY_CORR_PER_SILVER;
    s.grayIncome.push({
      id: _rndId('br_'),
      kind: 'bribe',
      amount: amount,
      turn: _curTurn(),
      reason: (opts && opts.reason) || '受贿'
    });
    _pushLedger(s, 'income:bribe', amount, (opts && opts.reason) || '受贿');
    _triggerCorruptionRisk('bribe', amount, opts);
    return { ok: true, cash: s.cash, corruption: s.corruption };
  }

  // 触发吏治腐败引擎风险（沿用 tm-corruption-engine.js lumpSumIncidents 路径）
  // 落账后腐败引擎 tick 会扫 lumpSumIncidents 自动评估"被弹劾风险"
  function _triggerCorruptionRisk(kind, amount, opts) {
    try {
      if (typeof GM === 'undefined' || !GM) return;
      if (!GM.corruption) GM.corruption = {}; // arch-ok
      if (!Array.isArray(GM.corruption.lumpSumIncidents)) {
        GM.corruption.lumpSumIncidents = []; // arch-ok
      }
      var pi = (typeof P !== 'undefined' && P && P.playerInfo) ? P.playerInfo : null;
      var who = (pi && pi.characterName) ? pi.characterName : '玩家';
      var label = kind === 'embezzle' ? '贪墨' : '受贿';
      var incident = {
        id: 'pe_' + kind + '_' + _curTurn() + '_' + Math.random().toString(36).slice(2, 6),
        name: who + '·' + label,
        type: kind === 'embezzle' ? 'player_embezzle' : 'player_bribe',
        amount: amount,
        ratioToAnnual: 0,
        peakCorruption: amount * GRAY_CORR_PER_SILVER,
        currentCorruption: amount * GRAY_CORR_PER_SILVER * 0.5,
        depts: { central: amount * 0.4, provincial: amount * 0.3, fiscal: amount * 0.3 },
        startTurn: _curTurn(),
        expectedDuration: 6,
        urgent: false,
        directPeopleBurden: !!(opts && opts.peopleBurden),
        status: 'active',
        source: 'player-economy',
        kind: kind
      };
      GM.corruption.lumpSumIncidents.push(incident); // arch-ok
    } catch (_) {}
  }

  // ── 购置产业（酒楼/当铺/作坊）──
  function buyProperty(type, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };
    var spec = PROPERTY_TYPES[type];
    if (!spec) return { ok: false, reason: '未知产业类型: ' + type };
    var cost = (opts && _isNum(opts.cost)) ? opts.cost : spec.cost;
    if (s.cash < cost) return { ok: false, reason: '银钱不足', cash: s.cash };
    s.cash -= cost;
    var prop = {
      id: _rndId('prop_'),
      type: type,
      label: spec.label,
      cost: cost,
      baseRevenue: spec.baseRevenue,
      riskTag: spec.riskTag,
      acquiredTurn: _curTurn(),
      status: 'active',
      name: (opts && opts.name) || (spec.label + '·' + (s.properties.length + 1))
    };
    s.properties.push(prop);
    _pushLedger(s, 'spend:property', -cost, '购置' + spec.label + '·' + prop.name);
    return { ok: true, property: prop, cash: s.cash };
  }

  // 每月经营性收入（由 tick 调用·亦可单测）
  function collectPropertyRevenue() {
    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };
    var total = 0;
    for (var i = 0; i < s.properties.length; i++) {
      var p = s.properties[i];
      if (!p || p.status !== 'active') continue;
      // 基础收入 × 经营波动（0.7~1.3）·朝代中立·不带任何专名
      var fluct = 0.7 + Math.random() * 0.6;
      var rev = Math.round(p.baseRevenue * fluct);
      total += rev;
    }
    if (total > 0) {
      s.cash += total;
      _pushLedger(s, 'income:property', total, '产业经营·月入');
    }
    return { ok: true, revenue: total, cash: s.cash };
  }

  // ── 放贷收息（超阈值触发民怨）──
  function lendMoney(amount, rate, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };
    if (!_isNum(amount) || amount <= 0) return { ok: false, reason: '金额非法' };
    rate = _isNum(rate) ? rate : 0.1;
    if (s.cash < amount) return { ok: false, reason: '银钱不足', cash: s.cash };
    s.cash -= amount;
    var months = (opts && _isNum(opts.months)) ? opts.months : 6;
    var inv = {
      id: _rndId('lend_'),
      kind: 'lend',
      principal: amount,
      rate: rate,
      interest: Math.round(amount * rate * months / 12),
      target: (opts && opts.target) || '某商',
      startTurn: _curTurn(),
      monthsLeft: months,
      status: 'active'
    };
    s.investments.push(inv);
    _pushLedger(s, 'spend:lend', -amount, '放贷·' + inv.target);

    // 超阈值触发民怨（放贷盘剥·朝代中立·非某朝某署）
    var totalLend = _sumActiveLend(s);
    if (totalLend > LEND_MINGYUAN_THRESHOLD) {
      var overflow = totalLend - LEND_MINGYUAN_THRESHOLD;
      var minxinDelta = -Math.ceil(overflow / LEND_MINGYUAN_PER_OVERFLOW);
      _applyMinxinDelta(minxinDelta, '放贷盘剥·民怨');
    }
    return { ok: true, investment: inv, cash: s.cash, totalLend: totalLend };
  }

  function _sumActiveLend(s) {
    var t = 0;
    for (var i = 0; i < s.investments.length; i++) {
      var v = s.investments[i];
      if (v && v.kind === 'lend' && v.status === 'active') t += v.principal || 0;
    }
    return t;
  }

  function _applyMinxinDelta(delta, reason) {
    try {
      if (typeof adjustMinxin === 'function') {
        adjustMinxin('playerEconomy', delta, reason, { persist: true });
        return;
      }
    } catch (_) {}
    try {
      if (typeof GM !== 'undefined' && GM) {
        if (!GM.minxin) GM.minxin = {}; // arch-ok
        if (typeof GM.minxin.trueIndex === 'number') {
          GM.minxin.trueIndex = _clamp(GM.minxin.trueIndex + delta, 0, 100); // arch-ok
        }
      }
    } catch (_) {}
  }

  // ── 囤货居奇（触发海贸衙门调查风险）──
  // 注："市舶司"是明清专名·此处用"海贸衙门"通称·跨朝代通用
  function hoardGoods(goods, amount, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };
    if (!goods || typeof goods !== 'string') return { ok: false, reason: '须指定囤货品类' };
    if (!_isNum(amount) || amount <= 0) return { ok: false, reason: '金额非法' };
    if (s.cash < amount) return { ok: false, reason: '银钱不足', cash: s.cash };
    s.cash -= amount;
    var inv = {
      id: _rndId('hoard_'),
      kind: 'hoard',
      goods: goods,
      amount: amount,
      startTurn: _curTurn(),
      monthsLeft: (opts && _isNum(opts.months)) ? opts.months : 3,
      status: 'active'
    };
    s.investments.push(inv);
    _pushLedger(s, 'spend:hoard', -amount, '囤货·' + goods);

    // 触发海贸衙门调查风险（基础风险 + 大额加成·上限 0.65）
    var risk = HOARD_INVESTIGATION_BASE_RISK + Math.min(0.5, amount / 100000);
    var investigate = Math.random() < risk;
    if (investigate) {
      try {
        if (typeof GM !== 'undefined' && GM) {
          if (!GM._charInvestigations) GM._charInvestigations = []; // arch-ok
          var pi = (typeof P !== 'undefined' && P && P.playerInfo) ? P.playerInfo : null;
          GM._charInvestigations.push({ // arch-ok
            target: (pi && pi.characterName) || '玩家',
            startTurn: _curTurn(),
            returnTurn: _curTurn() + 3,
            status: 'pending',
            reason: '囤货居奇·海贸衙门风闻'
          });
        }
      } catch (_) {}
    }
    return { ok: true, investment: inv, cash: s.cash, investigate: investigate, risk: risk };
  }

  // ── 被抄家（沿用 tm-char-economy-ui.js / CharEconEngine.confiscate 路径）──
  // 触发场景：罢黜 / 反叛失败 / 重大贪腐被查
  function confiscate(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };
    if (s.confiscated) return { ok: false, reason: '已抄没', total: 0 };
    opts = opts || {};

    // 玩家私产账本清零充公
    var total = 0;
    total += Math.max(0, s.cash || 0);
    for (var i = 0; i < s.properties.length; i++) {
      var p = s.properties[i];
      if (!p) continue;
      total += (p.cost || 0);
    }
    for (var j = 0; j < s.investments.length; j++) {
      var v = s.investments[j];
      if (!v) continue;
      if (v.kind === 'lend') total += (v.principal || 0);
      else if (v.kind === 'hoard') total += (v.amount || 0);
    }

    s.cash = CONFISCATE_LIVING_ALLOWANCE;
    s.properties = [];
    s.investments = [];
    s.grayIncome = [];
    s.confiscated = true;
    _pushLedger(s, 'confiscate', -Math.max(0, total - CONFISCATE_LIVING_ALLOWANCE),
                (opts && opts.reason) || '抄家充公');

    // 同步玩家角色私产（沿用 CharEconEngine.confiscate 抄家路径）
    var ch = _getPlayerChar();
    if (ch && typeof CharEconEngine !== 'undefined' && typeof CharEconEngine.confiscate === 'function') {
      try {
        CharEconEngine.confiscate(ch, {
          intensity: opts.intensity != null ? opts.intensity : 0.8,
          includeClan: !!opts.includeClan,
          destination: opts.destination || 'guoku'
        });
      } catch (_) {}
    }

    // 入帑廪 / 内帑（朝代中立·不写死某朝内库机构名）
    try {
      if (typeof GM !== 'undefined' && GM) {
        var dest = opts.destination || 'guoku';
        if (dest === 'neitang' && GM.neitang) {
          GM.neitang.balance = (GM.neitang.balance || 0) + total; // arch-ok
        } else if (GM.guoku) {
          GM.guoku.balance = (GM.guoku.balance || 0) + total; // arch-ok
        }
      }
    } catch (_) {}

    return { ok: true, total: total, cash: s.cash, confiscated: true };
  }

  // ── 派系勒索（拒绝则关系恶化）──
  function handleFactionExtortion(faction, amount, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };
    if (!faction || typeof faction !== 'string') return { ok: false, reason: '须指定派系' };
    if (!_isNum(amount) || amount <= 0) return { ok: false, reason: '金额非法' };
    opts = opts || {};

    if (!s.factionRelations) s.factionRelations = {};
    var cur = _isNum(s.factionRelations[faction]) ? s.factionRelations[faction] : 0;

    // 默认接受（若银钱足够且 opts.accept !== false）；显式 opts.accept=false 则拒绝
    var accept = (opts.accept !== false) && (s.cash >= amount);
    if (accept) {
      s.cash -= amount;
      _pushLedger(s, 'spend:extortion', -amount, '派系勒索·' + faction);
      s.factionRelations[faction] = _clamp(cur + (opts.reliefDelta || 5), -100, 100);
      return { ok: true, accept: true, faction: faction, cash: s.cash, relation: s.factionRelations[faction] };
    }
    // 拒绝：关系恶化
    s.factionRelations[faction] = _clamp(cur - (opts.refuseDelta || 20), -100, 100);
    _pushLedger(s, 'extortion:refuse', 0, '拒派系勒索·' + faction);
    return { ok: true, accept: false, faction: faction, cash: s.cash, relation: s.factionRelations[faction] };
  }

  // ── 每月初 tick：领官俸 + 产业经营 + 投资到期结算 ──
  function tick(ctx) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };
    var salaryR = collectSalary();
    var propR = collectPropertyRevenue();
    var matured = _matureInvestments(s);
    return {
      ok: true,
      salary: salaryR,
      property: propR,
      matured: matured,
      cash: s.cash
    };
  }

  function _matureInvestments(s) {
    var out = [];
    for (var i = s.investments.length - 1; i >= 0; i--) {
      var v = s.investments[i];
      if (!v || v.status !== 'active') continue;
      v.monthsLeft = (v.monthsLeft || 0) - 1;
      if (v.monthsLeft <= 0) {
        if (v.kind === 'lend') {
          var back = (v.principal || 0) + (v.interest || 0);
          s.cash += back;
          _pushLedger(s, 'income:lend', back, '放贷收回·' + (v.target || ''));
        } else if (v.kind === 'hoard') {
          // 囤货按 ±20% 波动出手（朝代中立·不带专名）
          var fluct = 0.8 + Math.random() * 0.4;
          var back2 = Math.round((v.amount || 0) * fluct);
          s.cash += back2;
          _pushLedger(s, 'income:hoard', back2, '囤货出手·' + (v.goods || ''));
        }
        v.status = 'closed';
        out.push(v);
      }
    }
    return out;
  }

  // ── 御案"私产"面板（SubTask 16.10·朝代中立·不写死某朝官署名）──
  function renderPanel() {
    var s = _getState();
    if (!s) return '<div class="pe-panel-empty">私产账本未就绪</div>';
    var cash = s.cash || 0;
    var corruption = s.corruption || 0;
    var propCount = (s.properties || []).length;
    var investCount = (s.investments || []).filter(function (v) { return v && v.status === 'active'; }).length;

    var h = '<div class="pe-panel" id="pePanel">';
    h += '<div class="pe-section"><div class="pe-section-title">私 产 · 银 钱</div>';
    h += '<div class="pe-row"><span>银 钱</span><span class="pe-val">' + Math.round(cash) + ' 两</span></div>';
    h += '<div class="pe-row"><span>贪 累</span><span class="pe-val' + (corruption > 1 ? ' pe-warn' : '') + '">' + corruption.toFixed(2) + '</span></div>';
    h += '<div class="pe-row"><span>产业 / 在投</span><span class="pe-val">' + propCount + ' / ' + investCount + '</span></div>';
    h += '</div>';

    if (Array.isArray(s.properties) && s.properties.length) {
      h += '<div class="pe-section"><div class="pe-section-title">产 业</div>';
      s.properties.forEach(function (p) {
        if (!p) return;
        h += '<div class="pe-row"><span>' + (p.label || p.type) + ' · ' + (p.name || '') + '</span><span class="pe-val">月入 ' + (p.baseRevenue || 0) + '</span></div>';
      });
      h += '</div>';
    }

    if (Array.isArray(s.investments) && s.investments.length) {
      h += '<div class="pe-section"><div class="pe-section-title">在 投</div>';
      s.investments.forEach(function (v) {
        if (!v || v.status !== 'active') return;
        var lbl = v.kind === 'lend' ? ('放贷 · ' + (v.target || '')) : ('囤货 · ' + (v.goods || ''));
        h += '<div class="pe-row"><span>' + lbl + '</span><span class="pe-val">' + (v.principal || v.amount || 0) + ' 两</span></div>';
      });
      h += '</div>';
    }

    if (s.confiscated) {
      h += '<div class="pe-section pe-warn-box">已 抄 没 · 仅 留 基 本 生 活</div>';
    }
    h += '</div>';
    return h;
  }

  // ── 双路径挂载：global.TM.PlayerEconomy + module.exports ──
  globalObj.TM.PlayerEconomy = {
    PROPERTY_TYPES: PROPERTY_TYPES,
    init: init,
    getState: getState,
    getBalance: getBalance,
    addIncome: addIncome,
    spend: spend,
    collectSalary: collectSalary,
    embezzle: embezzle,
    acceptBribe: acceptBribe,
    buyProperty: buyProperty,
    collectPropertyRevenue: collectPropertyRevenue,
    lendMoney: lendMoney,
    hoardGoods: hoardGoods,
    confiscate: confiscate,
    handleFactionExtortion: handleFactionExtortion,
    tick: tick,
    renderPanel: renderPanel
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = globalObj.TM.PlayerEconomy;
  }
})();
