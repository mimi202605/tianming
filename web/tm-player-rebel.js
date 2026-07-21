// ============================================================
// tm-player-rebel.js — 穿越模式 Phase 4.5 · Task 26 玩家反叛系统
// 跨朝代铁律：禁明清专属机构/职务/科场专名（内阁/票拟/司礼监/东厂/西厂/
//   锦衣卫/军机处/廷杖/八股/巡按/总督/巡抚/郡王/藩王）·一律由剧本 hook。
//   "禁军/朝廷/言官/弹劾/问罪/平叛/篡位/摄政" 为跨朝代通称·不锚某朝某署。
// 反叛类型（宗室夺嫡/诸侯起兵/权臣篡位/边将叛乱/农民起义）取中国古代通用
//   称谓·引擎层只提供"筹备 → 举事 → 交战 → 胜后果实/败后处置"通用框架。
// 暴露：window.TM.PlayerRebel.{ STAGES, ALLY_TYPES, PREP_TYPES, PROPAGANDA_TYPES,
//   REBEL_TYPES, OUTCOMES, FATE_TYPES, READINESS_THRESHOLDS, DISCOVERY_THRESHOLDS,
//   init, getState, getLedger, getReadiness, getPlotId, getStage, listAllies,
//   listAllyTypes, listPrepTypes, listPropagandaTypes, listRebelTypes, listScenarioHooks,
//   contactAlly, prepareMaterials, spreadPropaganda, launchCoup, resolveBattle,
//   applyVictory, applyDefeat, courtSuppress, checkLeak, evaluateRisk, tick,
//   renderPanel, registerScenarioHook, clearScenarioHooks,
//   _ensureState, _getState, _defaultState, _callLLM, _pushEvent, _spendPlayerCash,
//   _addPlayerCash, _interactSecret, _deployPrivateArmy, _findHeir, _switchToHeir,
//   _chronicle, _evalReadiness, _resolveBattleInternal, _computePlayerForce,
//   _computeCourtForce, _isTrans, _getPlayerName, _getPlayerChar, _findSovereign,
//   _stageLabel, _allyTypeLabel, _prepTypeLabel, _propLabel, _rebelLabel }
// 软依赖（运行时·缺席降级）：TM.PlayerInteraction / TM.PlayerEconomy /
//   TM.PlayerPrivateArmy / TM.PlayerFamily / TM.Transmigration / GM._playerRebel /
//   P.playerInfo / global.callAI / callLLM / predictBattleBand / ChronicleTracker / _offIsSovereign
// 双路径挂载：浏览器走 window.TM.PlayerRebel；node smoke 走 module.exports。
// ============================================================

(function (global) {
  'use strict';

  if (!global.TM) global.TM = {};

  // ── §1 常量·SubTask 26.2 反叛筹备账本 stage 枚举 + 类型字典 ──
  // 反叛筹备状态机·朝代中立：dormant 未启动 / preparing 筹备中 / ready 筹备就绪 /
  //   launched 已举事 / suppressed 被镇压 / succeeded 反叛成功
  var STAGES = {
    DORMANT: 'dormant', PREPARING: 'preparing', READY: 'ready',
    LAUNCHED: 'launched', SUPPRESSED: 'suppressed', SUCCEEDED: 'succeeded'
  };

  // 同盟类型·跨朝代通用：general 禁军将领 / magnate 地方大员 / jianghu 江湖豪强
  var ALLY_TYPES = {
    general: { id: 'general', label: '禁军将领', tag: 'court', strengthGain: 120, financeGain: 500, supportGain: 2, leakRisk: 0.18, recruitDifficulty: 0.7, hint: '中枢禁卫·战力强·一旦倒戈足以左右大局' },
    magnate: { id: 'magnate', label: '地方大员', tag: 'regional', strengthGain: 60, financeGain: 2500, supportGain: 4, leakRisk: 0.12, recruitDifficulty: 0.55, hint: '外官镇守一方·自带钱粮兵源·当地民心' },
    jianghu: { id: 'jianghu', label: '江湖豪强', tag: 'covert', strengthGain: 25, financeGain: 200, supportGain: 1, leakRisk: 0.06, recruitDifficulty: 0.35, hint: '草莽武人·隐秘灵活·战力有限' }
  };

  // 筹备物资类型·跨朝代通用：weapons 兵器 / grain 粮草 / silver 军资
  var PREP_TYPES = {
    weapons: { id: 'weapons', label: '兵器', tag: 'military', costPerUnit: 12, strengthPerUnit: 1.2, financePerUnit: 0, leakRisk: 0.10, hint: '甲胄刀枪弓弩·私下打造或劫库' },
    grain:   { id: 'grain',   label: '粮草', tag: 'logistics', costPerUnit: 4,  strengthPerUnit: 0.2, financePerUnit: 8, leakRisk: 0.04, hint: '行军补给·屯粮以备战' },
    silver:  { id: 'silver',  label: '军资', tag: 'finance',   costPerUnit: 1,  strengthPerUnit: 0.0, financePerUnit: 1.0, leakRisk: 0.05, hint: '贿买军心·蓄钱以充军需' }
  };

  // 舆论类型·跨朝代通用：tongyao 童谣 / chenwei 谶纬 / xiwen 檄文
  var PROPAGANDA_TYPES = {
    tongyao: { id: 'tongyao', label: '童谣', tag: 'folk', supportGain: 4,  leakRisk: 0.08, cost: 100, hint: '市井童谣·潜移默化·影响民间风评' },
    chenwei: { id: 'chenwei', label: '谶纬', tag: 'omen', supportGain: 8,  leakRisk: 0.16, cost: 300, hint: '符瑞图箓·建构合法性·易招清流攻讦' },
    xiwen:   { id: 'xiwen',   label: '檄文', tag: 'manifesto', supportGain: 14, leakRisk: 0.30, cost: 200, hint: '公开讨伐文书·煽动剧烈·暴露风险最高' }
  };

  // 反叛类型·按 playerRole 分支·跨朝代通用称谓
  var REBEL_TYPES = {
    prince_coup:      { id: 'prince_coup',      label: '宗室夺嫡', tag: 'royal',    roles: ['prince', 'royal', 'inlaw'],                 strengthBonus: 1.0,  supportBonus: 1.0,  victoryThreshold: 0.55, hint: '宗室亲贵夺嫡·合法性较高·民间易附' },
    vassal_rebellion: { id: 'vassal_rebellion', label: '诸侯起兵', tag: 'regional', roles: ['prince', 'vassal', 'magnate'],              strengthBonus: 1.15, supportBonus: 0.9,  victoryThreshold: 0.58, hint: '一方诸侯举兵·自带地盘兵源' },
    minister_usurp:   { id: 'minister_usurp',   label: '权臣篡位', tag: 'court',    roles: ['minister', 'regent', 'general'],            strengthBonus: 0.95, supportBonus: 0.85, victoryThreshold: 0.62, hint: '朝中重臣废君自立·须有禁军腹心' },
    border_mutiny:    { id: 'border_mutiny',    label: '边将叛乱', tag: 'military', roles: ['general', 'minister'],                      strengthBonus: 1.20, supportBonus: 0.70, victoryThreshold: 0.65, hint: '边将倒戈入犯·战力强但民心弱' },
    peasant_uprising: { id: 'peasant_uprising', label: '农民起义', tag: 'folk',     roles: ['merchant', 'commoner', 'bandit', 'custom'], strengthBonus: 0.80, supportBonus: 1.30, victoryThreshold: 0.70, hint: '布衣聚众举事·须民间声势浩大' }
  };

  // 反叛结局·朝代中立：VICTORY / DEFEAT / SUPPRESSED / FLED
  var OUTCOMES = { VICTORY: 'victory', DEFEAT: 'defeat', SUPPRESSED: 'suppressed', FLED: 'fled' };

  // 败后命运·朝代中立：execution 处决（可切继承人）/ exile 流放 / family_exterminate 族诛（继承人同诛）
  var FATE_TYPES = {
    execution:          { id: 'execution',          label: '处决', heirSurvives: true,  hint: '身死·可由子女继志' },
    exile:              { id: 'exile',              label: '流放', heirSurvives: true,  hint: '通缉逃亡·转地下' },
    family_exterminate: { id: 'family_exterminate', label: '族诛', heirSurvives: false, hint: '家属连坐·继承人同诛' }
  };

  // 筹备度 / 泄密风险阈值·剧本可覆盖
  var READINESS_THRESHOLDS = { ready: 60, high_alert: 80, max: 100 };
  var DISCOVERY_THRESHOLDS = { low: 30, medium: 50, high: 70, max: 100 };

  // 朝廷禁军战力基线·剧本可覆盖（用于 resolveBattle 计算 enemy force）
  var COURT_GARRISON_BASE = 600;
  var COURT_REINFORCEMENT_BASE = 400;
  var LEDGER_MAX = 200;
  var PLOT_ID_PREFIX = 'plot_';

  // ── §2 工具函数 ──

  function _isNum(v) { return typeof v === 'number' && !isNaN(v); }
  function _isStr(v) { return typeof v === 'string' && v.length > 0; }
  function _clamp(v, lo, hi) {
    v = Number(v);
    if (!isFinite(v)) v = lo;
    return v < lo ? lo : v > hi ? hi : v;
  }
  function _rndId(prefix) {
    return (prefix || 'rebel_') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function _curTurn() {
    try { if (typeof GM !== 'undefined' && GM && _isNum(GM.turn)) return GM.turn; } catch (_) {}
    return 0;
  }
  function _toast(m) {
    if (typeof toast === 'function') { try { toast(m); return; } catch (_) {} }
    try { console.log('[PlayerRebel]', m); } catch (_) {}
  }
  function _addEB(cat, txt) {
    try { if (typeof addEB === 'function') { addEB(cat, txt); return; } } catch (_) {}
    try { console.log('[PlayerRebel][' + cat + ']', txt); } catch (_) {}
  }
  function _esc(s) {
    if (typeof escHtml === 'function') return escHtml(s);
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function _rand() { return Math.random(); }
  function _pick(arr) {
    return Array.isArray(arr) && arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
  }

  // ── 软依赖·穿越模式判定 ─────────────────────────────────────
  function _isTrans() {
    try {
      if (global.TM && global.TM.Transmigration &&
          typeof global.TM.Transmigration.isTransmigrationMode === 'function') {
        return !!global.TM.Transmigration.isTransmigrationMode();
      }
    } catch (_) {}
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        return P.playerInfo.transmigrationMode === true;
      }
    } catch (_) {}
    return false;
  }

  function _getPlayerName() {
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo && P.playerInfo.characterName) {
        return P.playerInfo.characterName;
      }
    } catch (_) {}
    return '玩家';
  }

  function _getPlayerRole() {
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        return P.playerInfo.playerRole || 'minister';
      }
    } catch (_) {}
    return 'minister';
  }

  function _getPlayerChar() {
    try {
      if (typeof GM === 'undefined' || !GM || !Array.isArray(GM.chars)) return null;
      var name = _getPlayerName();
      for (var i = 0; i < GM.chars.length; i++) {
        var c = GM.chars[i];
        if (!c) continue;
        if (c.isPlayer === true) return c;
        if (name && c.name === name) return c;
      }
    } catch (_) {}
    return null;
  }

  // 寻君主·软依赖全局 _offIsSovereign·缺席按 role/isEmperor 兜底
  function _findSovereign() {
    try {
      if (typeof GM === 'undefined' || !GM || !Array.isArray(GM.chars)) return null;
      var isSov = (typeof _offIsSovereign === 'function') ? _offIsSovereign : null;
      for (var i = 0; i < GM.chars.length; i++) {
        var c = GM.chars[i];
        if (!c || c.alive === false) continue;
        if (isSov && isSov(c)) return c;
        if (c.role === '皇帝' || c.isEmperor === true) return c;
      }
    } catch (_) {}
    return null;
  }

  // ── LLM 调用·与 tm-sovereign-ai.js 一致·缺席降级返回 null ──
  function _callLLM(prompt) {
    try { if (typeof global.callAI === 'function') return global.callAI(prompt); } catch (_) {}
    try { if (typeof callLLM === 'function') return callLLM(prompt); } catch (_) {}
    return null;
  }

  // ── 编年史·软依赖 ChronicleTracker ──────────────────────────
  function _chronicle(track) {
    try {
      if (typeof ChronicleTracker !== 'undefined' && ChronicleTracker && typeof ChronicleTracker.add === 'function') {
        return ChronicleTracker.add(track);
      }
    } catch (_) {}
    try {
      if (typeof addToChronicle === 'function') return addToChronicle(track);
    } catch (_) {}
    try {
      if (typeof _chroniclePush === 'function') return _chroniclePush(track);
    } catch (_) {}
    return null;
  }

  // ── 玩家银钱消耗·主路径走 TM.PlayerEconomy.spend·降级直减 ──
  function _spendPlayerCash(cost, reason) {
    if (!_isNum(cost) || cost < 0) return { ok: false, reason: '金额非法' };
    try {
      if (global.TM && global.TM.PlayerEconomy) {
        if (typeof global.TM.PlayerEconomy.spend === 'function') {
          var r = global.TM.PlayerEconomy.spend(cost, reason);
          if (r && r.ok) return { ok: true, cash: r.cash };
          if (r && r.ok === false) return { ok: false, reason: r.reason || '银钱不足', cash: r.cash };
        }
        if (typeof global.TM.PlayerEconomy.withdrawCash === 'function') {
          var r2 = global.TM.PlayerEconomy.withdrawCash(cost, reason);
          if (r2 && r2.ok) return { ok: true, cash: r2.cash };
          if (r2 && r2.ok === false) return { ok: false, reason: r2.reason || '银钱不足', cash: r2.cash };
        }
      }
    } catch (_) {}
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        if (!P.playerInfo.playerEconomy) P.playerInfo.playerEconomy = { cash: 0 }; // arch-ok
        var pe = P.playerInfo.playerEconomy;
        if (typeof pe.cash !== 'number') pe.cash = 0;
        if (pe.cash < cost) return { ok: false, reason: '银钱不足', cash: pe.cash };
        pe.cash -= cost; // arch-ok
        return { ok: true, cash: pe.cash };
      }
    } catch (_) {}
    return { ok: true, cash: null };
  }

  // ── 玩家银钱入账·主路径走 TM.PlayerEconomy.addIncome·降级直加 ──
  function _addPlayerCash(amount, reason) {
    if (!_isNum(amount) || amount === 0) return { ok: true, cash: null };
    try {
      if (global.TM && global.TM.PlayerEconomy) {
        if (typeof global.TM.PlayerEconomy.addIncome === 'function') {
          var r = global.TM.PlayerEconomy.addIncome('rebel', Math.abs(amount), { reason: reason });
          if (r && r.ok) return { ok: true, cash: r.cash };
        }
        if (typeof global.TM.PlayerEconomy.addCash === 'function') {
          var r2 = global.TM.PlayerEconomy.addCash(Math.abs(amount), reason);
          if (r2 && r2.ok) return { ok: true, cash: r2.cash };
        }
      }
    } catch (_) {}
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        if (!P.playerInfo.playerEconomy) P.playerInfo.playerEconomy = { cash: 0 }; // arch-ok
        var pe = P.playerInfo.playerEconomy;
        if (typeof pe.cash !== 'number') pe.cash = 0;
        pe.cash += amount; // arch-ok
        return { ok: true, cash: pe.cash };
      }
    } catch (_) {}
    return { ok: true, cash: null };
  }

  // ── 暗中联络·关联 TM.PlayerInteraction.interact（缺席降级 ok=true 不阻拦）──
  function _interactSecret(npcName, kind, payload) {
    try {
      if (global.TM && global.TM.PlayerInteraction &&
          typeof global.TM.PlayerInteraction.interact === 'function') {
        return global.TM.PlayerInteraction.interact(npcName, kind, payload || {});
      }
    } catch (_) {}
    return { ok: true, scene: 'secret-fallback', npc: npcName, kind: kind };
  }

  // ── 私军调用·关联 TM.PlayerPrivateArmy.useForCoup / useForSelfDefense ──
  function _deployPrivateArmy(scenario, unitIds, opts) {
    try {
      if (global.TM && global.TM.PlayerPrivateArmy) {
        var fn = null;
        if (scenario === 'coup' && typeof global.TM.PlayerPrivateArmy.useForCoup === 'function') {
          fn = global.TM.PlayerPrivateArmy.useForCoup;
        } else if (scenario === 'self-defense' && typeof global.TM.PlayerPrivateArmy.useForSelfDefense === 'function') {
          fn = global.TM.PlayerPrivateArmy.useForSelfDefense;
        } else if (typeof global.TM.PlayerPrivateArmy.deploy === 'function') {
          // 通用入口·scenario 字段透传
          return global.TM.PlayerPrivateArmy.deploy(scenario, unitIds, opts || {});
        }
        if (fn) return fn(unitIds, opts || {});
      }
    } catch (_) {}
    // 缺席降级·返回 mock 战力
    return {
      ok: true, scenario: scenario,
      totalCount: (Array.isArray(unitIds) ? unitIds.length : 0) * 50,
      totalScore: (Array.isArray(unitIds) ? unitIds.length : 0) * 50 * 30,
      avgScore: 30,
      coupStrength: (scenario === 'coup') ? (Array.isArray(unitIds) ? unitIds.length : 0) * 1500 : 0,
      holdDays: (scenario === 'self-defense') ? Math.max(1, (Array.isArray(unitIds) ? unitIds.length : 0) * 2) : 0,
      casualties: { total: 0 },
      fallback: true
    };
  }

  // ── §3 SubTask 26.2 反叛筹备账本 ──
  // 状态挂载点：GM._playerRebel = {
  //   plotId, stage, readiness, secretAllies: [],
  //   militaryStrength, financialResources, popularSupport, discovered,
  //   rebelType, launchedAt, resolvedAt, outcome, fate,
  //   events: [], scenarioHooks: [],
  //   createdAt, updatedAt,
  //   // 战役缓存（举事后写入）
  //   lastBattle: null,
  //   // 胜后处置记录
  //   victoryResult: null,
  //   // 败后处置记录
  //   defeatResult: null
  // }

  function _defaultState() {
    return {
      plotId: _rndId(PLOT_ID_PREFIX),
      stage: STAGES.DORMANT,
      readiness: 0,
      secretAllies: [],
      militaryStrength: 0,
      financialResources: 0,
      popularSupport: 0,
      discovered: 0,
      rebelType: null,
      launchedAt: null,
      resolvedAt: null,
      outcome: null,
      fate: null,
      events: [],
      scenarioHooks: [],
      createdAt: _curTurn(),
      updatedAt: _curTurn(),
      lastBattle: null,
      victoryResult: null,
      defeatResult: null
    };
  }

  function _getState() {
    try {
      if (typeof GM === 'undefined' || !GM) return null;
      if (!GM._playerRebel) {
        GM._playerRebel = _defaultState(); // arch-ok
      }
      return GM._playerRebel;
    } catch (_) { return null; }
  }

  function _ensureState() {
    var s = _getState();
    if (!s) return null;
    if (!Array.isArray(s.secretAllies)) s.secretAllies = []; // arch-ok
    if (!Array.isArray(s.events)) s.events = []; // arch-ok
    if (!Array.isArray(s.scenarioHooks)) s.scenarioHooks = []; // arch-ok
    if (typeof s.readiness !== 'number') s.readiness = 0; // arch-ok
    if (typeof s.militaryStrength !== 'number') s.militaryStrength = 0; // arch-ok
    if (typeof s.financialResources !== 'number') s.financialResources = 0; // arch-ok
    if (typeof s.popularSupport !== 'number') s.popularSupport = 0; // arch-ok
    if (typeof s.discovered !== 'number') s.discovered = 0; // arch-ok
    if (typeof s.stage !== 'string') s.stage = STAGES.DORMANT; // arch-ok
    if (!s.plotId) s.plotId = _rndId(PLOT_ID_PREFIX); // arch-ok
    return s;
  }

  function _pushEvent(s, kind, summary, payload) {
    var ev = {
      id: _rndId('rev_'),
      turn: _curTurn(),
      kind: kind,
      summary: summary || '',
      payload: payload || null,
      at: Date.now()
    };
    s.events.push(ev); // arch-ok
    if (s.events.length > LEDGER_MAX) s.events = s.events.slice(-LEDGER_MAX); // arch-ok
    s.updatedAt = _curTurn(); // arch-ok
    return ev;
  }

  // 复算筹备度·由 militaryStrength + financialResources + popularSupport + secretAllies 综合
  function _evalReadiness(s) {
    if (!s) return 0;
    var strength = s.militaryStrength || 0;
    var finance = s.financialResources || 0;
    var support = s.popularSupport || 0;
    var allies = Array.isArray(s.secretAllies) ? s.secretAllies.length : 0;
    // 加权综合·封顶 100
    var raw = strength * 0.05 + finance * 0.001 + support * 0.4 + allies * 4;
    var ready = _clamp(raw, 0, READINESS_THRESHOLDS.max);
    s.readiness = Math.round(ready * 10) / 10; // arch-ok
    return s.readiness;
  }

  // 评估当前风险·返回 { discoveryLevel, leakImminent, courtAction }
  function _evaluateRiskInternal(s) {
    if (!s) return { discoveryLevel: 'none', leakImminent: false, courtAction: 'none' };
    var disc = s.discovered || 0;
    var ready = s.readiness || 0;
    var level = 'none';
    if (disc >= DISCOVERY_THRESHOLDS.high) level = 'critical';
    else if (disc >= DISCOVERY_THRESHOLDS.medium) level = 'serious';
    else if (disc >= DISCOVERY_THRESHOLDS.low) level = 'warning';

    // 高筹备 + 高泄密 → 朝廷先发制人
    var leakImminent = (ready >= READINESS_THRESHOLDS.high_alert && disc >= DISCOVERY_THRESHOLDS.medium) ||
                       (disc >= DISCOVERY_THRESHOLDS.high);
    var courtAction = 'none';
    if (level === 'warning') courtAction = 'whisper';
    else if (level === 'serious') courtAction = 'investigate';
    else if (level === 'critical') courtAction = 'suppress';
    return {
      discoveryLevel: level,
      leakImminent: leakImminent,
      courtAction: courtAction,
      discovered: disc,
      readiness: ready
    };
  }

  // ── §4 SubTask 26.3 暗中联络动作 ──
  // 调用 TM.PlayerInteraction.interact(npc, 'secretTalk' | 'recruit', payload)
  // 每次有暴露风险·成功则 secretAllies 累积·推动 readiness
  //   allyType ∈ ALLY_TYPES
  //   opts: { recruit: false, payload: {...} }
  // 返回 { ok, ally?, reason?, leakGain, readinessGain }

  function contactAlly(npcName, allyType, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '反叛账本未就绪' };
    if (s.stage === STAGES.LAUNCHED) return { ok: false, reason: '已举事·不可再联络' };
    if (s.stage === STAGES.SUCCEEDED || s.stage === STAGES.SUPPRESSED) {
      return { ok: false, reason: '反叛已结束' };
    }
    var def = ALLY_TYPES[allyType];
    if (!def) return { ok: false, reason: '未知同盟类型: ' + allyType };
    if (!npcName) return { ok: false, reason: '未指定 NPC' };
    opts = opts || {};

    // 进入 preparing 阶段（首次筹备动作）
    if (s.stage === STAGES.DORMANT) {
      s.stage = STAGES.PREPARING; // arch-ok
    }

    // 已是同盟·不可重复
    for (var i = 0; i < s.secretAllies.length; i++) {
      if (s.secretAllies[i] && s.secretAllies[i].name === npcName) {
        return { ok: false, reason: npcName + ' 已是同盟' };
      }
    }

    // 1) 调用 TM.PlayerInteraction.interact 走 secretTalk / recruit 路径
    var kind = opts.recruit ? 'recruit' : 'secretTalk';
    var payload = opts.payload || {
      topic: '暗中联络·' + def.label,
      intent: 'rebel_contact',
      allyType: allyType,
      action: 'contact_ally',
      rebelPlotId: s.plotId
    };
    var ir = _interactSecret(npcName, kind, payload);
    var interactOk = !ir || ir.ok !== false;
    if (!interactOk) {
      // 互动失败仍累计少量泄密（被拒后口风不严）
      var leakFail = _clamp(def.leakRisk * 0.5, 0, 1);
      s.discovered = _clamp(s.discovered + leakFail * 100, 0, DISCOVERY_THRESHOLDS.max); // arch-ok
      _pushEvent(s, 'contact:fail', '联络 ' + npcName + '（' + def.label + '）失败·口风走漏', {
        npc: npcName, allyType: allyType, leakGain: leakFail * 100
      });
      return {
        ok: false,
        reason: '联络被拒（' + (ir && ir.reason ? ir.reason : 'NPC 不从') + '）',
        interact: ir,
        leakGain: leakFail * 100
      };
    }

    // 2) 招募成功率·按 recruitDifficulty + 玩家声望/关系 + 随机
    var pc = _getPlayerChar();
    var fameBonus = 0;
    try {
      if (pc && pc.resources && _isNum(pc.resources.fame)) fameBonus = (pc.resources.fame - 50) * 0.005;
    } catch (_) {}
    var recruitRoll = _rand();
    var successThreshold = def.recruitDifficulty + fameBonus;
    var recruited = recruitRoll < successThreshold;
    if (!recruited) {
      // 招募失败但未走漏
      var leakMiss = _clamp(def.leakRisk * 0.6, 0, 1);
      s.discovered = _clamp(s.discovered + leakMiss * 100, 0, DISCOVERY_THRESHOLDS.max); // arch-ok
      _pushEvent(s, 'contact:reject', '联络 ' + npcName + '（' + def.label + '）未被接纳·口风略走漏', {
        npc: npcName, allyType: allyType, leakGain: leakMiss * 100
      });
      return {
        ok: false,
        reason: npcName + ' 未接纳密谋',
        interact: ir,
        leakGain: leakMiss * 100
      };
    }

    // 3) 入同盟账
    var ally = {
      id: _rndId('ally_'),
      name: npcName,
      type: allyType,
      typeLabel: def.label,
      tag: def.tag,
      joinedAt: _curTurn(),
      strength: def.strengthGain,
      finance: def.financeGain,
      support: def.supportGain,
      loyalty: 0.6 + _rand() * 0.35, // 0.6-0.95
      plotId: s.plotId
    };
    s.secretAllies.push(ally); // arch-ok

    // 4) 推动账本
    s.militaryStrength = _clamp(s.militaryStrength + def.strengthGain, 0, 5000); // arch-ok
    s.financialResources = _clamp(s.financialResources + def.financeGain, 0, 1000000); // arch-ok
    s.popularSupport = _clamp(s.popularSupport + def.supportGain, 0, 100); // arch-ok

    // 5) 暴露风险累计
    var leakGain = _clamp(def.leakRisk * (0.6 + _rand() * 0.8), 0, 1) * 100;
    s.discovered = _clamp(s.discovered + leakGain, 0, DISCOVERY_THRESHOLDS.max); // arch-ok

    // 6) 复算筹备度
    var prevReady = s.readiness;
    var newReady = _evalReadiness(s);
    var readinessGain = newReady - prevReady;
    if (s.stage === STAGES.PREPARING && newReady >= READINESS_THRESHOLDS.ready) {
      s.stage = STAGES.READY; // arch-ok
    }

    _pushEvent(s, 'contact:ok', '联络 ' + npcName + '（' + def.label + '）入同盟·战力 +' + def.strengthGain + '·钱粮 +' + def.financeGain, {
      npc: npcName, allyType: allyType, allyId: ally.id,
      strengthGain: def.strengthGain, financeGain: def.financeGain,
      supportGain: def.supportGain, leakGain: leakGain, readinessGain: readinessGain
    });

    return {
      ok: true,
      ally: ally,
      interact: ir,
      leakGain: leakGain,
      readinessGain: readinessGain,
      readiness: newReady,
      stage: s.stage
    };
  }

  // ── §5 SubTask 26.4 筹备物资动作 ──
  // 调用 TM.PlayerEconomy.spend 提取军资 / 兵器 / 粮草
  //   prepType ∈ PREP_TYPES
  //   opts: { amount, units }  amount=投入银钱 / units=筹备单位数量
  // 返回 { ok, spent, strengthGain, financeGain, leakGain, readinessGain }

  function prepareMaterials(prepType, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '反叛账本未就绪' };
    if (s.stage === STAGES.LAUNCHED) return { ok: false, reason: '已举事·不可再筹备物资' };
    if (s.stage === STAGES.SUCCEEDED || s.stage === STAGES.SUPPRESSED) {
      return { ok: false, reason: '反叛已结束' };
    }
    var def = PREP_TYPES[prepType];
    if (!def) return { ok: false, reason: '未知筹备类型: ' + prepType };
    opts = opts || {};

    var units = _isNum(opts.units) ? Math.max(1, Math.floor(opts.units)) : 0;
    var amount = _isNum(opts.amount) ? opts.amount : 0;
    // 若未指定 units 但指定 amount·按 amount/costPerUnit 推算
    if (units <= 0 && amount > 0) {
      units = Math.max(1, Math.floor(amount / Math.max(1, def.costPerUnit)));
    }
    if (units <= 0) units = 1;
    var cost = units * def.costPerUnit;

    if (s.stage === STAGES.DORMANT) {
      s.stage = STAGES.PREPARING; // arch-ok
    }

    // 1) 扣银钱·走 TM.PlayerEconomy.spend
    var spent = _spendPlayerCash(cost, '筹备' + def.label + '×' + units + '·反叛 plot ' + s.plotId);
    if (!spent.ok) {
      return {
        ok: false,
        reason: spent.reason || '银钱不足',
        need: cost,
        cash: spent.cash
      };
    }

    // 2) 物资入账
    var strengthGain = units * def.strengthPerUnit;
    var financeGain = units * def.financePerUnit;
    s.militaryStrength = _clamp(s.militaryStrength + strengthGain, 0, 5000); // arch-ok
    s.financialResources = _clamp(s.financialResources + financeGain, 0, 1000000); // arch-ok

    // 3) 暴露风险累计
    var leakGain = _clamp(def.leakRisk * (0.5 + _rand() * 1.0), 0, 1) * 100;
    s.discovered = _clamp(s.discovered + leakGain, 0, DISCOVERY_THRESHOLDS.max); // arch-ok

    // 4) 复算筹备度
    var prevReady = s.readiness;
    var newReady = _evalReadiness(s);
    var readinessGain = newReady - prevReady;
    if (s.stage === STAGES.PREPARING && newReady >= READINESS_THRESHOLDS.ready) {
      s.stage = STAGES.READY; // arch-ok
    }

    _pushEvent(s, 'prep:ok', '筹备 ' + def.label + ' × ' + units + '·耗银 ' + cost + '·战力 +' + Math.round(strengthGain) + '·钱粮 +' + Math.round(financeGain), {
      prepType: prepType, units: units, cost: cost,
      strengthGain: strengthGain, financeGain: financeGain,
      leakGain: leakGain, readinessGain: readinessGain
    });

    return {
      ok: true,
      prepType: prepType,
      units: units,
      cost: cost,
      cash: spent.cash,
      strengthGain: strengthGain,
      financeGain: financeGain,
      leakGain: leakGain,
      readinessGain: readinessGain,
      readiness: newReady,
      stage: s.stage
    };
  }

  // ── §6 SubTask 26.5 制造舆论动作 ──
  // 散发童谣 / 谶纬 / 檄文·影响 popularSupport·但触发言官弹劾风险
  //   kind ∈ PROPAGANDA_TYPES
  //   opts: { spreadRadius: 1-5, payload: {...} }
  // 返回 { ok, supportGain, leakGain, impeachmentRisk, readinessGain }

  function spreadPropaganda(kind, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '反叛账本未就绪' };
    if (s.stage === STAGES.LAUNCHED) return { ok: false, reason: '已举事·舆论已无意义' };
    if (s.stage === STAGES.SUCCEEDED || s.stage === STAGES.SUPPRESSED) {
      return { ok: false, reason: '反叛已结束' };
    }
    var def = PROPAGANDA_TYPES[kind];
    if (!def) return { ok: false, reason: '未知舆论类型: ' + kind };
    opts = opts || {};

    var radius = _isNum(opts.spreadRadius) ? _clamp(opts.spreadRadius, 1, 5) : 1;
    var cost = def.cost * radius;

    if (s.stage === STAGES.DORMANT) {
      s.stage = STAGES.PREPARING; // arch-ok
    }

    // 1) 扣银钱（散发成本）
    var spent = _spendPlayerCash(cost, '散发' + def.label + '·反叛 plot ' + s.plotId);
    if (!spent.ok) {
      return { ok: false, reason: spent.reason || '银钱不足', need: cost, cash: spent.cash };
    }

    // 2) 民心推动·按 radius 加成
    var supportGain = def.supportGain * radius * (0.8 + _rand() * 0.4);
    s.popularSupport = _clamp(s.popularSupport + supportGain, 0, 100); // arch-ok

    // 3) 暴露风险·按 radius 加成
    var leakGain = _clamp(def.leakRisk * radius * (0.8 + _rand() * 0.5), 0, 1) * 100;
    s.discovered = _clamp(s.discovered + leakGain, 0, DISCOVERY_THRESHOLDS.max); // arch-ok

    // 4) 弹劾风险·檄文/谶纬高·童谣低
    var impeachmentRisk = _clamp(def.leakRisk * 1.5 + (s.discovered / 100) * 0.3, 0, 1);
    var impeachmentTriggered = _rand() < impeachmentRisk * 0.5; // 实际触发概率减半

    // 5) 复算筹备度
    var prevReady = s.readiness;
    var newReady = _evalReadiness(s);
    var readinessGain = newReady - prevReady;
    if (s.stage === STAGES.PREPARING && newReady >= READINESS_THRESHOLDS.ready) {
      s.stage = STAGES.READY; // arch-ok
    }

    // 6) LLM 叙事（缺席降级）
    var narrative = null;
    try {
      var prompt = '玩家「' + _getPlayerName() + '」在反叛筹备期散发' + def.label +
                   '（传播范围 ' + radius + '）·当前民心 ' + Math.round(s.popularSupport) +
                   '·泄密 ' + Math.round(s.discovered) + '·请生成一段 30-60 字的剧情旁白';
      narrative = _callLLM(prompt);
    } catch (_) {}

    _pushEvent(s, 'propaganda:ok', '散发 ' + def.label + '·范围 ' + radius + '·耗银 ' + cost + '·民心 +' + Math.round(supportGain) + '·弹劾风险 ' + Math.round(impeachmentRisk * 100) + '%', {
      kind: kind, spreadRadius: radius, cost: cost,
      supportGain: supportGain, leakGain: leakGain,
      impeachmentRisk: impeachmentRisk,
      impeachmentTriggered: impeachmentTriggered,
      readinessGain: readinessGain,
      narrative: narrative
    });

    return {
      ok: true,
      kind: kind,
      spreadRadius: radius,
      cost: cost,
      cash: spent.cash,
      supportGain: supportGain,
      leakGain: leakGain,
      impeachmentRisk: impeachmentRisk,
      impeachmentTriggered: impeachmentTriggered,
      readinessGain: readinessGain,
      readiness: newReady,
      stage: s.stage,
      narrative: narrative
    };
  }

  // ── §7 SubTask 26.6 举事动作 ──
  // readiness 达阈值后可举事·触发政变事件链
  //   opts: { rebelType?, unitIds?, scenarioHookCtx? }
  // 返回 { ok, plotId, stage, force, courtForce, readiness }

  function launchCoup(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '反叛账本未就绪' };
    if (s.stage === STAGES.LAUNCHED) return { ok: false, reason: '已举事' };
    if (s.stage === STAGES.SUCCEEDED || s.stage === STAGES.SUPPRESSED) {
      return { ok: false, reason: '反叛已结束' };
    }
    opts = opts || {};

    // 1) 校验筹备度
    if (s.readiness < READINESS_THRESHOLDS.ready) {
      return {
        ok: false,
        reason: '筹备度不足（' + s.readiness + '/' + READINESS_THRESHOLDS.ready + '）·须继续筹备',
        readiness: s.readiness,
        threshold: READINESS_THRESHOLDS.ready
      };
    }

    // 2) 推导反叛类型·按 playerRole
    var role = _getPlayerRole();
    var rebelType = opts.rebelType || _deriveRebelType(role);
    var rebelDef = REBEL_TYPES[rebelType];
    if (!rebelDef) return { ok: false, reason: '未知反叛类型: ' + rebelType };
    s.rebelType = rebelType; // arch-ok

    // 3) 跨朝代 hook·剧本可注册自定义"举事条件"（SubTask 26.13）
    var hookCtx = {
      role: role,
      rebelType: rebelType,
      readiness: s.readiness,
      popularSupport: s.popularSupport,
      secretAllies: s.secretAllies.slice(),
      scenarioHookCtx: opts.scenarioHookCtx || {}
    };
    var hookResults = _runScenarioHooks('preLaunch', hookCtx);
    for (var i = 0; i < hookResults.length; i++) {
      var hr = hookResults[i];
      if (hr && hr.ok === false) {
        _pushEvent(s, 'launch:blocked', '举事被剧本 hook 阻拦：' + (hr.reason || hr.hookName), {
          hookName: hr.hookName, reason: hr.reason
        });
        return {
          ok: false,
          reason: '剧本 hook 阻拦：' + (hr.reason || hr.hookName),
          hookName: hr.hookName,
          hookResults: hookResults
        };
      }
    }

    // 4) 状态切换 → launched
    s.stage = STAGES.LAUNCHED; // arch-ok
    s.launchedAt = _curTurn(); // arch-ok

    // 5) 调用私军（如有 unitIds）·走 useForCoup 路径
    var armyResult = null;
    if (Array.isArray(opts.unitIds) && opts.unitIds.length > 0) {
      armyResult = _deployPrivateArmy('coup', opts.unitIds, {
        combatIntensity: 0.7,
        loyalty: opts.loyalty,
        scenarioHookCtx: opts.scenarioHookCtx
      });
    }

    // 6) 计算双方战力快照
    var playerForce = _computePlayerForce(s, { rebelDef: rebelDef, armyResult: armyResult });
    var courtForce = _computeCourtForce(s, { rebelDef: rebelDef });

    // 7) 编年史
    _chronicle({
      type: 'player_rebel',
      category: '反叛',
      title: _rebelLabel(rebelType) + '·举事',
      narrative: _getPlayerName() + '举事反叛·类型 ' + _rebelLabel(rebelType) + '·筹备度 ' + Math.round(s.readiness) + '·民心 ' + Math.round(s.popularSupport) + '·同盟 ' + s.secretAllies.length + '·战力 ' + Math.round(playerForce),
      actor: _getPlayerName(),
      stakeholders: [_getPlayerName(), _getPlayerName() + '党羽'],
      sourceType: 'player_rebel',
      sourceId: 'launch_' + s.plotId + '_T' + _curTurn(),
      priority: 'critical'
    });

    _pushEvent(s, 'launch:ok', '举事·' + _rebelLabel(rebelType) + '·筹备度 ' + Math.round(s.readiness) + '·我方战力 ' + Math.round(playerForce) + ' vs 朝廷 ' + Math.round(courtForce), {
      rebelType: rebelType,
      playerForce: playerForce,
      courtForce: courtForce,
      armyResult: armyResult,
      hookResults: hookResults
    });

    return {
      ok: true,
      plotId: s.plotId,
      rebelType: rebelType,
      rebelLabel: _rebelLabel(rebelType),
      stage: s.stage,
      playerForce: playerForce,
      courtForce: courtForce,
      armyResult: armyResult,
      hookResults: hookResults
    };
  }

  // 按 playerRole 推导反叛类型
  function _deriveRebelType(role) {
    if (!role) return 'minister_usurp';
    if (role === 'prince' || role === 'royal') return 'prince_coup';
    if (role === 'vassal' || role === 'magnate') return 'vassal_rebellion';
    if (role === 'general') return 'border_mutiny';
    if (role === 'regent') return 'minister_usurp';
    if (role === 'minister') return 'minister_usurp';
    if (role === 'merchant' || role === 'commoner' || role === 'bandit' || role === 'custom') return 'peasant_uprising';
    // 兜底
    return 'minister_usurp';
  }

  // 计算玩家方战力·综合 militaryStrength + secretAllies + popularSupport + privateArmy
  function _computePlayerForce(s, opts) {
    if (!s) return 0;
    opts = opts || {};
    var rebelDef = opts.rebelDef || REBEL_TYPES[s.rebelType] || { strengthBonus: 1.0, supportBonus: 1.0 };
    var strength = (s.militaryStrength || 0) * rebelDef.strengthBonus;
    var support = (s.popularSupport || 0) * 5 * rebelDef.supportBonus;
    var allies = 0;
    if (Array.isArray(s.secretAllies)) {
      for (var i = 0; i < s.secretAllies.length; i++) {
        var a = s.secretAllies[i];
        if (!a) continue;
        // 同盟战力按忠诚度折算
        allies += (a.strength || 0) * (a.loyalty || 0.7);
      }
    }
    var armyForce = 0;
    if (opts.armyResult && opts.armyResult.coupStrength) {
      armyForce = opts.armyResult.coupStrength;
    } else if (opts.armyResult && opts.armyResult.totalScore) {
      armyForce = opts.armyResult.totalScore;
    }
    // 钱粮后勤断粮系数·低于阈值则战力衰减
    var financeFactor = 1.0;
    if ((s.financialResources || 0) < 500) financeFactor = 0.7;
    else if ((s.financialResources || 0) < 1500) financeFactor = 0.85;
    var total = (strength + support + allies + armyForce) * financeFactor;
    return Math.max(0, Math.round(total));
  }

  // 计算朝廷方战力·禁军基线 + 增援 + 玩家泄密度反推御林军戒备
  function _computeCourtForce(s, opts) {
    if (!s) return COURT_GARRISON_BASE;
    opts = opts || {};
    var garrison = COURT_GARRISON_BASE;
    // 泄密高·朝廷加强戒备
    var disc = (s.discovered || 0) / 100;
    var reinforcement = COURT_REINFORCEMENT_BASE * (0.5 + disc * 0.8);
    // 反叛类型影响朝廷应对力度（边将叛乱 / 诸侯起兵 → 朝廷调外军·禁军压力略低）
    var rebelDef = opts.rebelDef || REBEL_TYPES[s.rebelType];
    var typeMul = 1.0;
    if (rebelDef) {
      if (rebelDef.id === 'border_mutiny') typeMul = 0.85;
      else if (rebelDef.id === 'vassal_rebellion') typeMul = 0.95;
      else if (rebelDef.id === 'peasant_uprising') typeMul = 1.15;
      else if (rebelDef.id === 'prince_coup') typeMul = 1.20;
      else if (rebelDef.id === 'minister_usurp') typeMul = 1.10;
    }
    var total = (garrison + reinforcement) * typeMul;
    return Math.max(0, Math.round(total));
  }

  // ── §8 SubTask 26.7 交战路径·判定胜负 ──
  // 沿用 tm-battle-resolve.js 的 predictBattleBand（如存在）·缺席本模块自算
  //   opts: { playerForce?, courtForce?, strategy?: 'aggressive'|'cautious'|'standard', mockWinProb? }
  // 返回 { ok, winner, playerForce, courtForce, winProb, playerLossRate, enemyLossRate, fate }

  function resolveBattle(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '反叛账本未就绪' };
    if (s.stage !== STAGES.LAUNCHED) {
      return { ok: false, reason: '当前未处交战状态（stage=' + s.stage + '）' };
    }
    opts = opts || {};

    var rebelDef = REBEL_TYPES[s.rebelType] || { victoryThreshold: 0.55 };
    var playerForce = _isNum(opts.playerForce) ? opts.playerForce : _computePlayerForce(s, { rebelDef: rebelDef });
    var courtForce = _isNum(opts.courtForce) ? opts.courtForce : _computeCourtForce(s, { rebelDef: rebelDef });
    var strategy = opts.strategy || 'standard';

    // 调用 tm-battle-resolve.js 的 predictBattleBand（如全局可用·node smoke 中可注入）
    // 注：测试 mock 路径 opts.mockWinProb 优先·跳过 predictBattleBand 调用
    var bandResult = null;
    if (!_isNum(opts.mockWinProb)) {
      try {
        if (typeof predictBattleBand === 'function') {
          var mockPlayerArmies = [{ id: 'rebel_main', soldiers: playerForce, strength: playerForce }];
          var mockCourtArmies = [{ id: 'court_garrison', soldiers: courtForce, strength: courtForce }];
          bandResult = predictBattleBand(mockPlayerArmies, mockCourtArmies, { strategy: strategy });
        } else if (global.predictBattleBand && typeof global.predictBattleBand === 'function') {
          var mockPlayerArmies2 = [{ id: 'rebel_main', soldiers: playerForce, strength: playerForce }];
          var mockCourtArmies2 = [{ id: 'court_garrison', soldiers: courtForce, strength: courtForce }];
          bandResult = global.predictBattleBand(mockPlayerArmies2, mockCourtArmies2, { strategy: strategy });
        }
      } catch (_) { bandResult = null; }
    } // arch-ok

    var battle = _resolveBattleInternal(playerForce, courtForce, {
      rebelDef: rebelDef,
      strategy: strategy,
      bandResult: bandResult,
      mockWinProb: opts.mockWinProb
    });

    // 战役缓存
    s.lastBattle = {
      turn: _curTurn(),
      playerForce: playerForce,
      courtForce: courtForce,
      winProb: battle.winProb,
      winner: battle.winner,
      playerLossRate: battle.playerLossRate,
      enemyLossRate: battle.enemyLossRate,
      fate: battle.fate,
      strategy: strategy,
      usedBattleEngine: !!bandResult
    }; // arch-ok

    _pushEvent(s, 'battle:resolved', '交战·我方 ' + playerForce + ' vs 朝廷 ' + courtForce + '·胜率 ' + Math.round(battle.winProb * 100) + '%·' + (battle.winner === 'player' ? '胜' : '败') + '·伤亡 ' + Math.round(battle.playerLossRate * 100) + '%', {
      playerForce: playerForce,
      courtForce: courtForce,
      winProb: battle.winProb,
      winner: battle.winner,
      playerLossRate: battle.playerLossRate,
      enemyLossRate: battle.enemyLossRate,
      fate: battle.fate
    });

    return {
      ok: true,
      winner: battle.winner,
      playerForce: playerForce,
      courtForce: courtForce,
      winProb: battle.winProb,
      playerLossRate: battle.playerLossRate,
      enemyLossRate: battle.enemyLossRate,
      fate: battle.fate,
      usedBattleEngine: !!bandResult,
      stage: s.stage
    };
  }

  // 内部胜负判定·复刻 tm-battle-resolve.js predictBattleBand 的核心算法
  //   r = playerForce / (playerForce + courtForce)
  //   winProb = r² / (r² + (1-r)²)   // 锐化
  //   winner = winProb >= rebelDef.victoryThreshold ? 'player' : 'enemy'
  //   弱者损更重·带宽 ±25%
  function _resolveBattleInternal(playerForce, courtForce, opts) {
    opts = opts || {};
    var rebelDef = opts.rebelDef || { victoryThreshold: 0.55 };
    var strA = Math.max(1, playerForce);
    var strB = Math.max(1, courtForce);
    var tot = strA + strB;
    var r = strA / tot;
    var winProb = (r * r) / (r * r + (1 - r) * (1 - r));

    // 若 tm-battle-resolve.js 已给出 bandResult·直接采用其 winProb / winner / loss
    if (opts.bandResult) {
      try {
        var br = opts.bandResult;
        if (_isNum(br.winProb)) winProb = br.winProb;
        var winner = (winProb >= rebelDef.victoryThreshold) ? 'player' : 'enemy';
        // 沿用 bandResult 的损失带·否则本模块自算
        var pLoss = (br.playerLoss && _isNum(br.playerLoss.expected)) ? br.playerLoss.expected :
                    _clamp(0.22 * (1 - r) * 2, 0.03, 0.9);
        var eLoss = (br.enemyLoss && _isNum(br.enemyLoss.expected)) ? br.enemyLoss.expected :
                    _clamp(0.22 * r * 2, 0.03, 0.9);
        // strategy 修正
        var st = opts.strategy;
        if (st === 'aggressive') { pLoss *= 1.12; eLoss *= 1.15; }
        else if (st === 'cautious') { pLoss *= 0.85; eLoss *= 0.92; }
        return {
          winProb: winProb,
          winner: winner,
          playerLossRate: _clamp(pLoss, 0.02, 0.95),
          enemyLossRate: _clamp(eLoss, 0.02, 0.95),
          fate: winner === 'player' ? 'victorious' : 'defeated'
        };
      } catch (_) {}
    }

    // 测试 mock 路径·允许 opts.mockWinProb 直接覆盖
    if (_isNum(opts.mockWinProb)) {
      winProb = _clamp(opts.mockWinProb, 0, 1);
    }

    var winnerFinal = (winProb >= rebelDef.victoryThreshold) ? 'player' : 'enemy';
    var pLoss = _clamp(0.22 * (1 - r) * 2, 0.03, 0.9);
    var eLoss = _clamp(0.22 * r * 2, 0.03, 0.9);
    var st2 = opts.strategy;
    if (st2 === 'aggressive') { pLoss *= 1.12; eLoss *= 1.15; }
    else if (st2 === 'cautious') { pLoss *= 0.85; eLoss *= 0.92; }

    return {
      winProb: Math.round(winProb * 1000) / 1000,
      winner: winnerFinal,
      playerLossRate: Math.round(_clamp(pLoss, 0.02, 0.95) * 1000) / 1000,
      enemyLossRate: Math.round(_clamp(eLoss, 0.02, 0.95) * 1000) / 1000,
      fate: winnerFinal === 'player' ? 'victorious' : 'defeated'
    };
  }

  // ── §9 SubTask 26.8 胜后果实·玩家登基或任摄政 ──
  // 成功路径：
  //   usurp   玩家登基（playerRole → emperor·清除君主 isPlayer·加"篡位者"标签·transmigrationMode=false）
  //   puppet  拥立傀儡（玩家任摄政·playerRole → regent·傀儡君主在位但无实权）
  //   opts: { path?: 'usurp'|'puppet', puppetName?, switchGameMode?: true }
  // 返回 { ok, outcome, path, newRole, sovereignChanged, chronicleId }

  function applyVictory(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '反叛账本未就绪' };
    if (s.stage !== STAGES.LAUNCHED) {
      // 允许在 launched 后调用·但也允许测试在 ready 后直接调用 applyVictory（mock 路径）
      if (s.stage !== STAGES.READY && s.stage !== STAGES.PREPARING) {
        return { ok: false, reason: '当前不可结算胜利（stage=' + s.stage + '）' };
      }
    }
    opts = opts || {};
    var path = opts.path || 'usurp';
    if (path !== 'usurp' && path !== 'puppet') {
      return { ok: false, reason: '未知胜利路径: ' + path };
    }

    var playerName = _getPlayerName();
    var pc = _getPlayerChar();
    var sovereign = _findSovereign();
    var sovereignName = null;
    if (sovereign) {
      sovereignName = sovereign.name || '前君';
    } else if (typeof P !== 'undefined' && P && P.playerInfo) {
      sovereignName = P.playerInfo.sovereignName || '前君';
    } else {
      sovereignName = '前君';
    }

    // 1) 状态切换
    s.stage = STAGES.SUCCEEDED; // arch-ok
    s.outcome = OUTCOMES.VICTORY; // arch-ok
    s.resolvedAt = _curTurn(); // arch-ok

    var result = {
      ok: true,
      outcome: OUTCOMES.VICTORY,
      path: path,
      playerName: playerName,
      sovereignName: sovereignName,
      newRole: null,
      sovereignChanged: false,
      puppetName: null,
      labelsAdded: [],
      chronicleId: null
    };

    if (path === 'usurp') {
      // 玩家登基
      // a) 清除前君主 isPlayer 标记 + 加 "前君"/"废帝" 标签 + 设 alive=false 或保留
      if (sovereign) {
        try {
          sovereign.isPlayer = false; // arch-ok (前君主让出玩家标记)
          sovereign.isEmperor = false; // arch-ok
          sovereign.role = '前君'; // arch-ok
          if (!Array.isArray(sovereign.labels)) sovereign.labels = []; // arch-ok
          var hasDeposed = false;
          for (var i = 0; i < sovereign.labels.length; i++) {
            if (sovereign.labels[i] === '废帝' || sovereign.labels[i] === '前君') { hasDeposed = true; break; }
          }
          if (!hasDeposed) sovereign.labels.push('废帝'); // arch-ok
          if (opts.deposeSovereign) {
            sovereign.alive = false; // arch-ok (剧本可指定弑君)
          }
          result.sovereignChanged = true;
        } catch (_) {}
      }
      // b) 玩家角色 → emperor
      try {
        if (pc) {
          pc.isPlayer = true; // arch-ok (保持玩家标记)
          pc.isEmperor = true; // arch-ok (新君登基)
          pc.role = '皇帝'; // arch-ok
          if (!Array.isArray(pc.labels)) pc.labels = []; // arch-ok
          var hasUsurper = false;
          for (var j = 0; j < pc.labels.length; j++) {
            if (pc.labels[j] === '篡位者') { hasUsurper = true; break; }
          }
          if (!hasUsurper) pc.labels.push('篡位者'); // arch-ok
          result.labelsAdded = ['篡位者'];
        }
      } catch (_) {}
      // c) P.playerInfo 切换
      try {
        if (typeof P !== 'undefined' && P && P.playerInfo) {
          P.playerInfo.playerRole = 'emperor'; // arch-ok (玩家登基)
          if (opts.switchGameMode !== false) {
            P.playerInfo.transmigrationMode = false; // arch-ok (切回皇帝模式)
          }
          P.playerInfo.sovereignName = playerName; // arch-ok (玩家即新君)
          if (P.playerInfo.sovereignTitle) {
            P.playerInfo.sovereignTitle = '皇帝'; // arch-ok
          }
          result.newRole = 'emperor';
        }
      } catch (_) {}
    } else {
      // puppet path·拥立傀儡·玩家任摄政
      var puppetName = opts.puppetName || sovereignName || '傀儡君';
      // a) 前君主保留（或指定新傀儡）·但剥夺实权
      if (sovereign) {
        try {
          sovereign.isPlayer = false; // arch-ok
          sovereign.isEmperor = true; // arch-ok (名义上仍是皇帝)
          sovereign.role = '皇帝'; // arch-ok
          if (!Array.isArray(sovereign.labels)) sovereign.labels = []; // arch-ok
          var hasPuppet = false;
          for (var k = 0; k < sovereign.labels.length; k++) {
            if (sovereign.labels[k] === '傀儡') { hasPuppet = true; break; }
          }
          if (!hasPuppet) sovereign.labels.push('傀儡'); // arch-ok
          result.sovereignChanged = true;
        } catch (_) {}
      }
      // b) 玩家角色 → regent（摄政）
      try {
        if (pc) {
          pc.isPlayer = true; // arch-ok
          if (!Array.isArray(pc.labels)) pc.labels = []; // arch-ok
          var hasRegent = false;
          for (var m = 0; m < pc.labels.length; m++) {
            if (pc.labels[m] === '摄政') { hasRegent = true; break; }
          }
          if (!hasRegent) pc.labels.push('摄政'); // arch-ok
          result.labelsAdded = ['摄政'];
        }
      } catch (_) {}
      // c) P.playerInfo 切换为 regent·保留 transmigrationMode
      try {
        if (typeof P !== 'undefined' && P && P.playerInfo) {
          P.playerInfo.playerRole = 'regent'; // arch-ok
          P.playerInfo.sovereignName = puppetName; // arch-ok (傀儡君主名)
          result.newRole = 'regent';
          result.puppetName = puppetName;
        }
      } catch (_) {}
      // d) GM.regentState 标记（软依赖·缺席不报错）
      try {
        if (typeof GM !== 'undefined' && GM) {
          if (!GM.regentState) GM.regentState = {}; // arch-ok
          GM.regentState.regentName = playerName; // arch-ok
          GM.regentState.puppetSovereign = puppetName; // arch-ok
          GM.regentState.establishedAt = _curTurn(); // arch-ok
          GM.regentState.cause = 'rebel_puppet'; // arch-ok
        }
      } catch (_) {}
    }

    // 2) 编年史·新朝建立 / 摄政确立
    var chronicleId = null;
    try {
      var cr = _chronicle({
        type: 'player_rebel',
        category: '反叛',
        title: path === 'usurp' ? '新朝建立·' + playerName + '篡位' : '摄政确立·' + playerName + '立' + puppetName,
        narrative: path === 'usurp'
          ? playerName + '反叛成功·废' + sovereignName + '自立·建立新朝·playerRole → emperor'
          : playerName + '反叛成功·拥立' + puppetName + '为傀儡君主·自任摄政·playerRole → regent',
        actor: playerName,
        stakeholders: [playerName, sovereignName].filter(Boolean),
        sourceType: 'player_rebel',
        sourceId: 'victory_' + s.plotId + '_T' + _curTurn(),
        priority: 'critical'
      });
      if (cr && cr.id) chronicleId = cr.id;
    } catch (_) {}
    result.chronicleId = chronicleId;

    // 3) 胜利结果缓存
    s.victoryResult = {
      path: path,
      newRole: result.newRole,
      sovereignName: sovereignName,
      puppetName: result.puppetName,
      labelsAdded: result.labelsAdded,
      chronicleId: chronicleId,
      resolvedAt: s.resolvedAt
    }; // arch-ok

    _pushEvent(s, 'victory:' + path,
      path === 'usurp'
        ? '反叛胜利·玩家登基·建立新朝'
        : '反叛胜利·玩家任摄政·拥立傀儡',
      result);

    _addEB('反叛', '玩家反叛胜利·路径 ' + path + '·新角色 ' + (result.newRole || '—'));
    return result;
  }

  // ── §10 SubTask 26.9 败后处置·玩家被处决/流放/族诛·可切换至子女 ──
  //   opts: { fate?: 'execution'|'exile'|'family_exterminate', switchToHeir?: true, heirName? }
  // 返回 { ok, outcome, fate, playerDied, heirSwitched, heirName, gameover }

  function applyDefeat(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '反叛账本未就绪' };
    if (s.stage !== STAGES.LAUNCHED && s.stage !== STAGES.SUPPRESSED) {
      // 允许在 launched 后调用·也允许 suppressed 后调用（处置链路）
      if (s.stage === STAGES.SUCCEEDED) {
        return { ok: false, reason: '反叛已胜利·不可走败后路径' };
      }
    }
    opts = opts || {};

    // 默认 fate 按 discovered / popularSupport 推断
    var fate = opts.fate;
    if (!fate) {
      var disc = s.discovered || 0;
      var support = s.popularSupport || 0;
      if (disc >= 70 || support < 10) fate = 'family_exterminate';
      else if (disc >= 50 || support < 30) fate = 'execution';
      else fate = 'exile';
    }
    var fateDef = FATE_TYPES[fate];
    if (!fateDef) return { ok: false, reason: '未知败后命运: ' + fate };

    // 状态切换
    if (s.stage !== STAGES.SUPPRESSED) {
      s.stage = STAGES.SUPPRESSED; // arch-ok
    }
    s.outcome = (fate === 'exile') ? OUTCOMES.FLED : OUTCOMES.DEFEAT; // arch-ok
    s.fate = fate; // arch-ok
    s.resolvedAt = _curTurn(); // arch-ok

    var playerName = _getPlayerName();
    var pc = _getPlayerChar();

    var result = {
      ok: true,
      outcome: s.outcome,
      fate: fate,
      fateLabel: fateDef.label,
      playerName: playerName,
      playerDied: false,
      heirSwitched: false,
      heirName: null,
      gameover: false,
      propertiesConfiscated: false,
      chronicleId: null
    };

    // 1) 玩家角色处置
    if (pc) {
      try {
        if (fate === 'execution' || fate === 'family_exterminate') {
          pc.alive = false; // arch-ok
          pc.isPlayer = false; // arch-ok (玩家身死·让出标记)
          if (!Array.isArray(pc.labels)) pc.labels = []; // arch-ok
          pc.labels.push('反贼'); // arch-ok
          if (fate === 'family_exterminate') pc.labels.push('族诛'); // arch-ok
          result.playerDied = true;
        } else if (fate === 'exile') {
          // 流放·玩家成通缉犯
          pc.isPlayer = false; // arch-ok (让出标记·子女继志)
          if (!Array.isArray(pc.labels)) pc.labels = []; // arch-ok
          pc.labels.push('通缉'); // arch-ok
          pc.labels.push('流亡'); // arch-ok
          // 流放状态字段
          try {
            if (typeof P !== 'undefined' && P && P.playerInfo) {
              if (!P.playerInfo.fugitiveState) P.playerInfo.fugitiveState = {}; // arch-ok
              P.playerInfo.fugitiveState.exiledAt = _curTurn(); // arch-ok
              P.playerInfo.fugitiveState.cause = 'rebel_defeat'; // arch-ok
            }
          } catch (_) {}
        }
      } catch (_) {}
    }

    // 2) 抄没私产·走 TM.PlayerEconomy.confiscate（如存在）·否则标记
    try {
      if (global.TM && global.TM.PlayerEconomy && typeof global.TM.PlayerEconomy.confiscate === 'function') {
        global.TM.PlayerEconomy.confiscate({ reason: '反叛失败·家属连坐·私产抄没' });
        result.propertiesConfiscated = true;
      } else if (typeof P !== 'undefined' && P && P.playerInfo && P.playerInfo.playerEconomy) {
        P.playerInfo.playerEconomy.confiscated = true; // arch-ok
        P.playerInfo.playerEconomy.cash = 0; // arch-ok
        result.propertiesConfiscated = true;
      }
    } catch (_) {}

    // 3) 切换至子女继续游戏（关联 TM.PlayerFamily.inherit）
    if (opts.switchToHeir && fateDef.heirSurvives) {
      var heirInfo = _findHeir(opts.heirName);
      if (heirInfo && heirInfo.heirName) {
        var switched = _switchToHeir(heirInfo.heirName, '反叛失败·继志');
        if (switched && switched.ok) {
          result.heirSwitched = true;
          result.heirName = heirInfo.heirName;
        } else {
          result.heirSwitched = false;
          result.gameover = true; // 切换失败·游戏结束
        }
      } else {
        // 无继承人·游戏结束
        result.heirSwitched = false;
        result.gameover = true;
      }
    } else if (!fateDef.heirSurvives) {
      // 族诛·继承人同诛·强制 game over
      result.gameover = true;
    } else if (!opts.switchToHeir) {
      // 未要求切继承人·游戏结束
      result.gameover = true;
    }

    // 4) 编年史·永久污点
    var chronicleId = null;
    try {
      var cr = _chronicle({
        type: 'player_rebel',
        category: '反叛',
        title: '反叛失败·' + playerName + '·' + fateDef.label,
        narrative: playerName + '反叛失败·' + fateDef.hint +
                   (result.heirSwitched ? '·由继承人 ' + result.heirName + ' 继志' : '·游戏结束'),
        actor: playerName,
        stakeholders: [playerName].concat(result.heirName ? [result.heirName] : []),
        sourceType: 'player_rebel',
        sourceId: 'defeat_' + s.plotId + '_T' + _curTurn(),
        priority: 'critical'
      });
      if (cr && cr.id) chronicleId = cr.id;
    } catch (_) {}
    result.chronicleId = chronicleId;

    // 5) 败后结果缓存
    s.defeatResult = {
      fate: fate,
      playerDied: result.playerDied,
      heirSwitched: result.heirSwitched,
      heirName: result.heirName,
      gameover: result.gameover,
      propertiesConfiscated: result.propertiesConfiscated,
      chronicleId: chronicleId,
      resolvedAt: s.resolvedAt
    }; // arch-ok

    _pushEvent(s, 'defeat:' + fate,
      '反叛失败·' + fateDef.label +
      (result.heirSwitched ? '·切继承人 ' + result.heirName : '·游戏结束'),
      result);

    _addEB('反叛', '玩家反叛失败·命运 ' + fateDef.label +
      (result.heirSwitched ? '·切继承人 ' + result.heirName : '·游戏结束'));
    return result;
  }

  // 寻继承人·软依赖 TM.PlayerFamily.getChildren / getMembers
  function _findHeir(preferredName) {
    var children = null;
    try {
      if (global.TM && global.TM.PlayerFamily) {
        if (typeof global.TM.PlayerFamily.getChildren === 'function') {
          children = global.TM.PlayerFamily.getChildren();
        } else if (typeof global.TM.PlayerFamily.getMembers === 'function') {
          var members = global.TM.PlayerFamily.getMembers();
          children = Array.isArray(members) ? members.filter(function (m) {
            return m && (m.relation === 'child' || m.relation === 'son' || m.relation === 'daughter' || m.isHeir);
          }) : [];
        } else if (typeof global.TM.PlayerFamily.heir === 'function') {
          var h = global.TM.PlayerFamily.heir();
          if (h && h.name) return { heirName: h.name, heir: h };
        }
      }
    } catch (_) {}
    if (!Array.isArray(children) || children.length === 0) return null;

    // 优先 isHeir 标记
    for (var i = 0; i < children.length; i++) {
      var c = children[i];
      if (!c) continue;
      if (c.isHeir && c.name && c.alive !== false) {
        return { heirName: c.name, heir: c };
      }
    }
    // 指定名优先
    if (preferredName) {
      for (var j = 0; j < children.length; j++) {
        var c2 = children[j];
        if (c2 && c2.name === preferredName && c2.alive !== false) {
          return { heirName: c2.name, heir: c2 };
        }
      }
    }
    // 长子优先·alive 优先
    for (var k = 0; k < children.length; k++) {
      var c3 = children[k];
      if (c3 && c3.alive !== false && (c3.gender === '男' || c3.gender === 'male')) {
        return { heirName: c3.name, heir: c3 };
      }
    }
    // 任意 alive 子女
    for (var m = 0; m < children.length; m++) {
      var c4 = children[m];
      if (c4 && c4.alive !== false && c4.name) {
        return { heirName: c4.name, heir: c4 };
      }
    }
    return null;
  }

  // 切换至继承人·软依赖 TM.PlayerFamily.inherit(heirName, { switchToHeir: true, reason })
  function _switchToHeir(heirName, reason) {
    try {
      if (global.TM && global.TM.PlayerFamily && typeof global.TM.PlayerFamily.inherit === 'function') {
        var r = global.TM.PlayerFamily.inherit(heirName, {
          switchToHeir: true,
          reason: reason || '反叛失败'
        });
        if (r && r.ok) {
          // 继承后·玩家角色已切换·重置 transmigrationMode 仍为 true（继续穿越模式）
          try {
            if (typeof P !== 'undefined' && P && P.playerInfo) {
              P.playerInfo.transmigrationMode = true; // arch-ok (继承后仍处穿越模式)
              // 若继承人无 playerRole·按 minister 兜底
              if (!P.playerInfo.playerRole) P.playerInfo.playerRole = 'minister'; // arch-ok
            }
          } catch (_) {}
          return { ok: true, heirName: heirName, inheritResult: r };
        }
        return { ok: false, reason: r && r.reason || 'inherit 失败' };
      }
    } catch (_) {}
    // 缺席降级·直接改 P.playerInfo.characterName
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        P.playerInfo.characterName = heirName; // arch-ok (剧本可后续覆盖)
        P.playerInfo.transmigrationMode = true; // arch-ok
        if (!P.playerInfo.playerRole) P.playerInfo.playerRole = 'minister'; // arch-ok
        return { ok: true, heirName: heirName, fallback: true };
      }
    } catch (_) {}
    return { ok: false, reason: 'PlayerFamily 缺席且 P 不可写' };
  }

  // ── §11 SubTask 26.10 朝廷镇压路径·皇帝 AI 派禁军围剿 ──
  // 玩家可调用私军自卫（useScenario='self-defense'）
  //   opts: { unitIds?, suppressForce?, mockWinProb? }
  // 返回 { ok, suppressed, defenderResult, battle, outcome }

  function courtSuppress(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '反叛账本未就绪' };
    if (s.stage === STAGES.SUCCEEDED) return { ok: false, reason: '反叛已胜利' };
    opts = opts || {};

    // 进入 launched 状态（若尚未）
    if (s.stage === STAGES.DORMANT || s.stage === STAGES.PREPARING || s.stage === STAGES.READY) {
      s.stage = STAGES.LAUNCHED; // arch-ok
      s.launchedAt = _curTurn(); // arch-ok
      if (!s.rebelType) {
        s.rebelType = _deriveRebelType(_getPlayerRole()); // arch-ok
      }
    }

    var rebelDef = REBEL_TYPES[s.rebelType] || { victoryThreshold: 0.55 };

    // 1) 调用私军自卫（如指定 unitIds）
    var defenderResult = null;
    if (Array.isArray(opts.unitIds) && opts.unitIds.length > 0) {
      defenderResult = _deployPrivateArmy('self-defense', opts.unitIds, {
        combatIntensity: 0.8,
        opponentStrength: opts.suppressForce || _computeCourtForce(s, { rebelDef: rebelDef })
      });
    }

    // 2) 计算双方战力·朝廷先发围剿（禁军+增援加成）
    var playerForce = _computePlayerForce(s, { rebelDef: rebelDef, armyResult: defenderResult });
    var courtForce = _isNum(opts.suppressForce) ? opts.suppressForce : _computeCourtForce(s, { rebelDef: rebelDef });
    // 先发制人加成
    courtForce = Math.round(courtForce * 1.15);

    // 3) 战役判定
    var battle = _resolveBattleInternal(playerForce, courtForce, {
      rebelDef: rebelDef,
      strategy: 'standard',
      mockWinProb: opts.mockWinProb
    });

    s.lastBattle = {
      turn: _curTurn(),
      playerForce: playerForce,
      courtForce: courtForce,
      winProb: battle.winProb,
      winner: battle.winner,
      playerLossRate: battle.playerLossRate,
      enemyLossRate: battle.enemyLossRate,
      fate: battle.fate,
      strategy: 'court-suppress',
      usedBattleEngine: false
    }; // arch-ok

    _pushEvent(s, 'court:suppress',
      '朝廷先发制人围剿·禁军 ' + courtForce + ' vs 玩家 ' + playerForce +
      '·胜率 ' + Math.round(battle.winProb * 100) + '%·' + (battle.winner === 'player' ? '玩家击退围剿' : '玩家被镇压'),
      {
        playerForce: playerForce,
        courtForce: courtForce,
        winProb: battle.winProb,
        winner: battle.winner,
        defenderResult: defenderResult
      });

    return {
      ok: true,
      suppressed: battle.winner === 'enemy',
      defenderResult: defenderResult,
      battle: {
        playerForce: playerForce,
        courtForce: courtForce,
        winProb: battle.winProb,
        winner: battle.winner,
        playerLossRate: battle.playerLossRate,
        enemyLossRate: battle.enemyLossRate
      },
      stage: s.stage
    };
  }

  // ── §12 SubTask 26.11 举事前泄密风险·高 readiness + 高 discovered → 朝廷先发制人 ──
  // 返回 { ok, leakImminent, discoveryLevel, courtAction, triggered, suppressResult? }

  function checkLeak(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '反叛账本未就绪' };
    if (s.stage === STAGES.SUCCEEDED || s.stage === STAGES.SUPPRESSED) {
      return { ok: false, reason: '反叛已结束' };
    }
    opts = opts || {};

    var risk = _evaluateRiskInternal(s);
    var leakImminent = risk.leakImminent;
    var willTrigger = leakImminent && (opts.force || _rand() < 0.5);

    _pushEvent(s, 'leak:check',
      '泄密风险评估·泄密度 ' + Math.round(s.discovered) + '·筹备度 ' + Math.round(s.readiness) +
      '·等级 ' + risk.discoveryLevel + '·朝廷行动 ' + risk.courtAction +
      (willTrigger ? '·触发先发制人' : ''),
      {
        discoveryLevel: risk.discoveryLevel,
        leakImminent: leakImminent,
        courtAction: risk.courtAction,
        willTrigger: willTrigger
      });

    var result = {
      ok: true,
      leakImminent: leakImminent,
      discoveryLevel: risk.discoveryLevel,
      courtAction: risk.courtAction,
      discovered: s.discovered,
      readiness: s.readiness,
      triggered: false
    };

    // 触发先发制人围剿
    if (willTrigger) {
      result.triggered = true;
      var suppressResult = courtSuppress({
        unitIds: opts.unitIds,
        suppressForce: opts.suppressForce,
        mockWinProb: opts.mockWinProb
      });
      result.suppressResult = suppressResult;
    }

    return result;
  }

  // 评估风险·对外暴露（与 _evaluateRiskInternal 等价但返回完整字段）
  function evaluateRisk() {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '反叛账本未就绪' };
    var risk = _evaluateRiskInternal(s);
    return {
      ok: true,
      stage: s.stage,
      readiness: s.readiness,
      discovered: s.discovered,
      discoveryLevel: risk.discoveryLevel,
      leakImminent: risk.leakImminent,
      courtAction: risk.courtAction,
      popularSupport: s.popularSupport,
      militaryStrength: s.militaryStrength,
      financialResources: s.financialResources,
      allyCount: (s.secretAllies || []).length
    };
  }

  // ── §13 SubTask 26.12 御案"图谋"面板 ──

  function renderPanel() {
    var s = _getState();
    if (!s) return '<div class="pr-panel-empty">反叛账本未就绪</div>';

    var stageLabel = _stageLabel(s.stage);
    var readiness = Math.round(s.readiness || 0);
    var readinessPct = Math.min(100, Math.round((readiness / READINESS_THRESHOLDS.max) * 100));
    var readyPct = Math.min(100, Math.round((readiness / READINESS_THRESHOLDS.ready) * 100));
    var discovered = Math.round(s.discovered || 0);
    var support = Math.round(s.popularSupport || 0);
    var strength = Math.round(s.militaryStrength || 0);
    var finance = Math.round(s.financialResources || 0);
    var allies = Array.isArray(s.secretAllies) ? s.secretAllies : [];
    var discLevel = _evaluateRiskInternal(s).discoveryLevel;
    var discLabel = discLevel === 'none' ? '无' :
                    discLevel === 'warning' ? '风闻' :
                    discLevel === 'serious' ? '调查' :
                    discLevel === 'critical' ? '危急' : '—';

    var h = '<div class="pr-panel" id="prPanel">';
    // 概览段
    h += '<div class="pr-section"><div class="pr-section-title">图 谋 · 概 览</div>';
    h += '<div class="pr-row"><span>阶 段</span><span class="pr-val pr-stage-' + s.stage + '">' + stageLabel + '</span></div>';
    h += '<div class="pr-row"><span>plotId</span><span class="pr-val pr-mono">' + _esc(s.plotId || '') + '</span></div>';
    h += '<div class="pr-row"><span>筹 备 度</span><span class="pr-val' + (readiness >= READINESS_THRESHOLDS.ready ? ' pr-good' : '') + '">' + readiness + ' / ' + READINESS_THRESHOLDS.ready + '（阈值）</span></div>';
    h += '<div class="pr-progress"><div class="pr-progress-bar" style="width:' + readyPct + '%"></div></div>';
    h += '<div class="pr-progress-meta">阈值进度 ' + readyPct + '% / 总进度 ' + readinessPct + '%</div>';
    h += '<div class="pr-row"><span>泄 密 度</span><span class="pr-val' + (discLevel === 'critical' ? ' pr-bad' : discLevel === 'serious' ? ' pr-warn' : '') + '">' + discovered + '（' + discLabel + '）</span></div>';
    h += '<div class="pr-row"><span>民 心</span><span class="pr-val">' + support + '</span></div>';
    h += '<div class="pr-row"><span>战 力</span><span class="pr-val">' + strength + '</span></div>';
    h += '<div class="pr-row"><span>钱 粮</span><span class="pr-val">' + finance + ' 两</span></div>';
    h += '<div class="pr-row"><span>同 盟</span><span class="pr-val">' + allies.length + ' 人</span></div>';
    if (s.rebelType) {
      h += '<div class="pr-row"><span>反叛类型</span><span class="pr-val">' + _esc(_rebelLabel(s.rebelType)) + '</span></div>';
    }
    if (s.outcome) {
      var outLabel = s.outcome === OUTCOMES.VICTORY ? '胜利' :
                     s.outcome === OUTCOMES.DEFEAT ? '失败' :
                     s.outcome === OUTCOMES.SUPPRESSED ? '被镇压' :
                     s.outcome === OUTCOMES.FLED ? '逃亡' : s.outcome;
      h += '<div class="pr-row"><span>结 局</span><span class="pr-val pr-stage-' + s.stage + '">' + outLabel + '</span></div>';
    }
    if (s.launchedAt != null) {
      h += '<div class="pr-row"><span>举事回合</span><span class="pr-val">T' + s.launchedAt + '</span></div>';
    }
    if (s.resolvedAt != null) {
      h += '<div class="pr-row"><span>结算回合</span><span class="pr-val">T' + s.resolvedAt + '</span></div>';
    }
    h += '</div>';

    // 同盟名录
    if (allies.length > 0) {
      h += '<div class="pr-section"><div class="pr-section-title">图 谋 · 同 盟</div>';
      allies.forEach(function (a) {
        if (!a) return;
        var allyDef = ALLY_TYPES[a.type] || { label: a.type };
        var loyaltyPct = Math.round((a.loyalty || 0) * 100);
        h += '<div class="pr-unit">';
        h += '<div class="pr-unit-head"><span>' + _esc(a.name) + ' · ' + _esc(allyDef.label) + '</span><span class="pr-val">忠诚 ' + loyaltyPct + '%</span></div>';
        h += '<div class="pr-unit-stats">';
        h += '<span>战力 +' + (a.strength || 0) + '</span>';
        h += '<span>钱粮 +' + (a.finance || 0) + '</span>';
        h += '<span>民心 +' + (a.support || 0) + '</span>';
        h += '</div>';
        h += '</div>';
      });
      h += '</div>';
    }

    // 风险评估段
    var risk = _evaluateRiskInternal(s);
    if (s.stage !== STAGES.DORMANT) {
      h += '<div class="pr-section"><div class="pr-section-title">图 谋 · 风 险</div>';
      h += '<div class="pr-row"><span>泄密等级</span><span class="pr-val' + (risk.discoveryLevel === 'critical' ? ' pr-bad' : risk.discoveryLevel === 'serious' ? ' pr-warn' : '') + '">' + discLabel + '</span></div>';
      h += '<div class="pr-row"><span>朝廷行动</span><span class="pr-val">' + _courtActionLabel(risk.courtAction) + '</span></div>';
      h += '<div class="pr-row"><span>先发制人</span><span class="pr-val' + (risk.leakImminent ? ' pr-bad' : '') + '">' + (risk.leakImminent ? '迫在眉睫' : '暂无') + '</span></div>';
      h += '</div>';
    }

    // 战役结果
    if (s.lastBattle) {
      var lb = s.lastBattle;
      h += '<div class="pr-section"><div class="pr-section-title">图 谋 · 战 役</div>';
      h += '<div class="pr-row"><span>我方战力</span><span class="pr-val">' + lb.playerForce + '</span></div>';
      h += '<div class="pr-row"><span>朝廷战力</span><span class="pr-val">' + lb.courtForce + '</span></div>';
      h += '<div class="pr-row"><span>胜 率</span><span class="pr-val">' + Math.round((lb.winProb || 0) * 100) + '%</span></div>';
      h += '<div class="pr-row"><span>胜 负</span><span class="pr-val' + (lb.winner === 'player' ? ' pr-good' : ' pr-bad') + '">' + (lb.winner === 'player' ? '胜' : '败') + '</span></div>';
      h += '<div class="pr-row"><span>伤 亡</span><span class="pr-val">' + Math.round((lb.playerLossRate || 0) * 100) + '%</span></div>';
      h += '</div>';
    }

    // 近事
    if (Array.isArray(s.events) && s.events.length) {
      var recent = s.events.slice(-5);
      h += '<div class="pr-section"><div class="pr-section-title">图 谋 · 近 事</div>';
      recent.forEach(function (e) {
        if (!e) return;
        h += '<div class="pr-row"><span class="pr-ev-kind">' + _esc(e.kind || '') + '</span><span class="pr-ev-summary">' + _esc(e.summary || '') + '</span></div>';
      });
      h += '</div>';
    }

    // 可选动作（2026-07-21·C2 根治·从空壳改为调用内部 API·参照 tm-player-marriage.js）
    //   举事为高风险动作·launchCoup 内部带筹备度/状态闸·不达标返回 ok:false reason
    var canLaunch = (s.stage === STAGES.PREPARING || s.stage === STAGES.READY);
    var canPrep = (s.stage !== STAGES.LAUNCHED && s.stage !== STAGES.SUCCEEDED && s.stage !== STAGES.SUPPRESSED);
    if (canPrep || canLaunch) {
      h += '<div class="pr-section"><div class="pr-section-title">可 选 · 动 作</div>';
      h += '<div style="display:flex;flex-wrap:wrap;gap:0.3rem;">';
      if (canPrep) {
        h += '<button class="bt bs" onclick="TM.PlayerRebel._uiContactAlly()">联络同盟</button>';
        h += '<button class="bt bs" onclick="TM.PlayerRebel._uiSpreadPropaganda()">散布舆论</button>';
      }
      if (canLaunch) {
        h += '<button class="bt bs" onclick="TM.PlayerRebel._uiLaunchCoup()">举事</button>';
      }
      h += '</div>';
      h += '</div>';
    }

    h += '</div>';
    return h;
  }

  // UI 钩子（2026-07-21·C2 根治·从空壳改为调用内部 API）
  //   历史根因：renderPanel 只展示反叛筹备状态·无任何动作按钮·玩家无法推进图谋。
  //   修复：联络同盟用 showPrompt 收 NPC 名（默认江湖豪强类型）·散布舆论/举事直接调内部 API → toast 反馈 → refreshAll 刷面板。
  function _refreshPanel() {
    try {
      if (global.TM && global.TM.PlayerShell && typeof global.TM.PlayerShell.refreshAll === 'function') {
        global.TM.PlayerShell.refreshAll();
      }
    } catch (_) {}
  }

  function _uiContactAlly() {
    if (!_isTrans()) { _toast('非穿越模式'); return; }
    var s = _ensureState();
    if (!s) { _toast('反叛账本未就绪'); return; }
    if (typeof showPrompt !== 'function') {
      _addEB('反叛', 'showPrompt 缺席·请在剧本面板中选择联络 NPC');
      return;
    }
    // 默认江湖豪强·招募难度最低·泄密风险最小·剧本可后续扩展选择面板
    showPrompt('联络同盟 NPC 姓名（默认江湖豪强·招募最易）：', '', function (name) {
      if (!name) return;
      var r = contactAlly(name, 'jianghu', {});
      if (r.ok) {
        var ally = r.ally || {};
        _toast('联络同盟·「' + name + '」入盟·战力 +' + (ally.strength || 0) + '·钱粮 +' + (ally.finance || 0));
      } else {
        _toast('联络同盟失败：' + (r.reason || '未知') + (r.leakGain ? '·泄密 +' + Math.round(r.leakGain) : ''));
      }
      _refreshPanel();
    });
  }

  function _uiSpreadPropaganda() {
    if (!_isTrans()) { _toast('非穿越模式'); return; }
    var s = _ensureState();
    if (!s) { _toast('反叛账本未就绪'); return; }
    // 默认童谣·成本最低·泄密最小·适合低调筹备
    var r = spreadPropaganda('tongyao', {});
    if (r.ok) {
      _toast('散布童谣·民心 +' + Math.round(r.supportGain) + '·耗银 ' + r.cost + '·弹劾风险 ' + Math.round(r.impeachmentRisk * 100) + '%');
    } else {
      _toast('散布舆论失败：' + (r.reason || '未知'));
    }
    _refreshPanel();
  }

  function _uiLaunchCoup() {
    if (!_isTrans()) { _toast('非穿越模式'); return; }
    var s = _ensureState();
    if (!s) { _toast('反叛账本未就绪'); return; }
    var r = launchCoup({});
    if (r.ok) {
      _toast('举事！' + (r.rebelLabel || '') + '·我方战力 ' + Math.round(r.playerForce || 0) + ' vs 朝廷 ' + Math.round(r.courtForce || 0));
    } else {
      _toast('举事失败：' + (r.reason || '未知'));
    }
    _refreshPanel();
  }

  function _stageLabel(stage) {
    var map = {
      dormant: '未启动',
      preparing: '筹备中',
      ready: '筹备就绪',
      launched: '已举事',
      suppressed: '被镇压',
      succeeded: '反叛成功'
    };
    return map[stage] || stage || '—';
  }

  function _allyTypeLabel(t) {
    var d = ALLY_TYPES[t];
    return d ? d.label : t;
  }

  function _prepTypeLabel(t) {
    var d = PREP_TYPES[t];
    return d ? d.label : t;
  }

  function _propLabel(t) {
    var d = PROPAGANDA_TYPES[t];
    return d ? d.label : t;
  }

  function _rebelLabel(t) {
    var d = REBEL_TYPES[t];
    return d ? d.label : t;
  }

  function _courtActionLabel(action) {
    var map = {
      none: '暂无',
      whisper: '言官风闻',
      investigate: '朝廷调查',
      suppress: '调兵围剿'
    };
    return map[action] || action || '—';
  }

  // ── §14 SubTask 26.13 跨朝代通用·剧本 hook 自定义"举事条件" ──
  // 引擎只提供通用框架·剧本可注册 hook 自定义举事条件
  //   hookName: 自定义名（如"祥瑞" / "谶纬应验" / "宗庙火"）
  //   fn(ctx) → { ok: true|false, reason? }  ok=false 阻止举事
  //   phase: 'preLaunch'（默认）| 'preBattle' | 'postVictory' | 'postDefeat'

  function registerScenarioHook(hookName, fn, opts) {
    var s = _ensureState();
    if (!s) return { ok: false, reason: '反叛账本未就绪' };
    if (!hookName || typeof fn !== 'function') return { ok: false, reason: '参数非法' };
    opts = opts || {};
    var hook = {
      name: hookName,
      fn: fn,
      phase: opts.phase || 'preLaunch',
      registeredAt: _curTurn()
    };
    s.scenarioHooks.push(hook); // arch-ok
    _pushEvent(s, 'hook:register', '注册剧本 hook：' + hookName + '（phase=' + hook.phase + '）', {
      hookName: hookName, phase: hook.phase
    });
    return { ok: true, hook: hook };
  }

  function clearScenarioHooks() {
    var s = _ensureState();
    if (!s) return { ok: false, reason: '反叛账本未就绪' };
    var n = s.scenarioHooks.length;
    s.scenarioHooks = []; // arch-ok
    _pushEvent(s, 'hook:clear', '清空剧本 hook（' + n + ' 项）', {});
    return { ok: true, cleared: n };
  }

  function listScenarioHooks() {
    var s = _getState();
    if (!s || !Array.isArray(s.scenarioHooks)) return [];
    return s.scenarioHooks.map(function (h) {
      return { name: h.name, phase: h.phase, registeredAt: h.registeredAt };
    });
  }

  function _runScenarioHooks(phase, ctx) {
    var s = _getState();
    if (!s || !Array.isArray(s.scenarioHooks)) return [];
    var results = [];
    for (var i = 0; i < s.scenarioHooks.length; i++) {
      var h = s.scenarioHooks[i];
      if (!h || h.phase !== phase) continue;
      try {
        var r = h.fn(ctx);
        results.push({
          hookName: h.name,
          ok: !r || r.ok !== false,
          reason: r && r.reason
        });
      } catch (e) {
        results.push({
          hookName: h.name,
          ok: false,
          reason: 'hook 抛错: ' + (e && e.message)
        });
      }
    }
    return results;
  }

  // ── §15 月度 tick·筹备期推进 / 风险衰减或增长 / 自动检查泄密 ──
  //   ctx: { autoCheckLeak?: true }
  // 返回 { ok, stage, readiness, discovered, leakCheck? }

  function tick(ctx) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '反叛账本未就绪' };
    ctx = ctx || {};

    // dormant / succeeded / suppressed ·无 tick 推进
    if (s.stage === STAGES.DORMANT || s.stage === STAGES.SUCCEEDED || s.stage === STAGES.SUPPRESSED) {
      return { ok: true, stage: s.stage, readiness: s.readiness, discovered: s.discovered, skipped: true };
    }

    // preparing / ready 阶段·每月泄密自然衰减（口风渐紧）·民心自然漂移
    if (s.stage === STAGES.PREPARING || s.stage === STAGES.READY) {
      // 泄密衰减·每月 -1（口风渐紧）·但不低于 0
      s.discovered = _clamp(s.discovered - 1, 0, DISCOVERY_THRESHOLDS.max); // arch-ok
      // 民心漂移·筹备期无人推动则每月 -0.5（民间淡忘）
      s.popularSupport = _clamp(s.popularSupport - 0.5, 0, 100); // arch-ok
      // 复算筹备度
      _evalReadiness(s);
      // 若 ready 但 readiness 已跌回阈值下·降回 preparing
      if (s.stage === STAGES.READY && s.readiness < READINESS_THRESHOLDS.ready) {
        s.stage = STAGES.PREPARING; // arch-ok
      }
    }

    // launched 阶段·不自动结算（须显式 resolveBattle / applyDefeat）
    s.updatedAt = _curTurn(); // arch-ok

    // 自动检查泄密（高筹备+高泄密 → 朝廷先发制人）
    var leakCheck = null;
    if (ctx.autoCheckLeak && (s.stage === STAGES.PREPARING || s.stage === STAGES.READY)) {
      leakCheck = checkLeak({ force: false });
    }

    return {
      ok: true,
      stage: s.stage,
      readiness: s.readiness,
      discovered: s.discovered,
      popularSupport: s.popularSupport,
      leakCheck: leakCheck
    };
  }

  // ── §16 API 入口 ──

  function init() {
    var s = _ensureState();
    return !!s;
  }

  function getState() {
    var s = _getState();
    return s ? JSON.parse(JSON.stringify(s)) : null;
  }

  function getLedger() {
    return getState();
  }

  function getReadiness() {
    var s = _getState();
    return s ? (s.readiness || 0) : 0;
  }

  function getPlotId() {
    var s = _getState();
    return s ? s.plotId : null;
  }

  function getStage() {
    var s = _getState();
    return s ? s.stage : STAGES.DORMANT;
  }

  function listAllies() {
    var s = _getState();
    if (!s || !Array.isArray(s.secretAllies)) return [];
    return JSON.parse(JSON.stringify(s.secretAllies));
  }

  function listAllyTypes() {
    return Object.keys(ALLY_TYPES).map(function (k) { var d = ALLY_TYPES[k]; return { id: d.id, label: d.label, tag: d.tag, hint: d.hint, strengthGain: d.strengthGain, financeGain: d.financeGain, supportGain: d.supportGain, leakRisk: d.leakRisk, recruitDifficulty: d.recruitDifficulty }; });
  }

  function listPrepTypes() {
    return Object.keys(PREP_TYPES).map(function (k) { var d = PREP_TYPES[k]; return { id: d.id, label: d.label, tag: d.tag, hint: d.hint, costPerUnit: d.costPerUnit, strengthPerUnit: d.strengthPerUnit, financePerUnit: d.financePerUnit, leakRisk: d.leakRisk }; });
  }

  function listPropagandaTypes() {
    return Object.keys(PROPAGANDA_TYPES).map(function (k) { var d = PROPAGANDA_TYPES[k]; return { id: d.id, label: d.label, tag: d.tag, hint: d.hint, supportGain: d.supportGain, leakRisk: d.leakRisk, cost: d.cost }; });
  }

  function listRebelTypes() {
    return Object.keys(REBEL_TYPES).map(function (k) { var d = REBEL_TYPES[k]; return { id: d.id, label: d.label, tag: d.tag, hint: d.hint, roles: (d.roles || []).slice(), strengthBonus: d.strengthBonus, supportBonus: d.supportBonus, victoryThreshold: d.victoryThreshold }; });
  }

  // ── §17 导出命名空间 + 双路径挂载 ──

  var ns = {
    STAGES: STAGES, ALLY_TYPES: ALLY_TYPES, PREP_TYPES: PREP_TYPES,
    PROPAGANDA_TYPES: PROPAGANDA_TYPES, REBEL_TYPES: REBEL_TYPES, OUTCOMES: OUTCOMES,
    FATE_TYPES: FATE_TYPES, READINESS_THRESHOLDS: READINESS_THRESHOLDS, DISCOVERY_THRESHOLDS: DISCOVERY_THRESHOLDS,
    // 生命周期 / 查询
    init: init, getState: getState, getLedger: getLedger, getReadiness: getReadiness,
    getPlotId: getPlotId, getStage: getStage, listAllies: listAllies,
    listAllyTypes: listAllyTypes, listPrepTypes: listPrepTypes,
    listPropagandaTypes: listPropagandaTypes, listRebelTypes: listRebelTypes, listScenarioHooks: listScenarioHooks,
    // SubTask 26.3-26.5 筹备动作
    contactAlly: contactAlly, prepareMaterials: prepareMaterials, spreadPropaganda: spreadPropaganda,
    // SubTask 26.6-26.7 举事 / 交战
    launchCoup: launchCoup, resolveBattle: resolveBattle,
    // SubTask 26.8-26.9 胜后 / 败后
    applyVictory: applyVictory, applyDefeat: applyDefeat,
    // SubTask 26.10-26.11 朝廷镇压 / 泄密风险
    courtSuppress: courtSuppress, checkLeak: checkLeak, evaluateRisk: evaluateRisk,
    // SubTask 26.12 御案"图谋"面板
    renderPanel: renderPanel,
    // SubTask 26.13 跨朝代 hook
    registerScenarioHook: registerScenarioHook, clearScenarioHooks: clearScenarioHooks,
    // 月度 tick
    tick: tick,
    // 内部函数暴露（smoke/调试·非游戏调用入口）
    _ensureState: _ensureState, _getState: _getState, _defaultState: _defaultState,
    _callLLM: _callLLM, _pushEvent: _pushEvent, _spendPlayerCash: _spendPlayerCash,
    _addPlayerCash: _addPlayerCash, _interactSecret: _interactSecret, _deployPrivateArmy: _deployPrivateArmy,
    _findHeir: _findHeir, _switchToHeir: _switchToHeir, _chronicle: _chronicle,
    _evalReadiness: _evalReadiness, _evaluateRiskInternal: _evaluateRiskInternal,
    _resolveBattleInternal: _resolveBattleInternal, _computePlayerForce: _computePlayerForce,
    _computeCourtForce: _computeCourtForce, _deriveRebelType: _deriveRebelType,
    _runScenarioHooks: _runScenarioHooks, _isTrans: _isTrans,
    _getPlayerName: _getPlayerName, _getPlayerRole: _getPlayerRole, _getPlayerChar: _getPlayerChar,
    _findSovereign: _findSovereign, _stageLabel: _stageLabel, _allyTypeLabel: _allyTypeLabel,
    _prepTypeLabel: _prepTypeLabel, _propLabel: _propLabel, _rebelLabel: _rebelLabel,

    // UI 钩子（C2·面板动作按钮入口·onclick 调用）
    _refreshPanel: _refreshPanel,
    _uiContactAlly: _uiContactAlly,
    _uiSpreadPropaganda: _uiSpreadPropaganda,
    _uiLaunchCoup: _uiLaunchCoup
  };

  // 双路径挂载：浏览器走 window.TM.PlayerRebel；node smoke 走 module.exports
  try { if (typeof module !== 'undefined' && module && module.exports) module.exports = ns; } catch (_) {}
  try { if (global) { if (!global.TM) global.TM = {}; global.TM.PlayerRebel = ns; } } catch (_) {}
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
