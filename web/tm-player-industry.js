// ============================================================
// tm-player-industry.js — 穿越模式 Phase 4.5 · Task 22 玩家产业建设系统
// ------------------------------------------------------------
// 跨朝代铁律：本文件绝不出现任何明清专属机构/职务/科场专名（具体禁词清单
//   见 lint 规则与项目铁律文档），一律由剧本 hook 处理。
//   产业类型（庄园/农场/牧场/矿场/林场/渔场/工坊/商号）是中国古代通用
//   称谓，本引擎层保留。工部 / 匠官 等机构名目由剧本 hook。
// ------------------------------------------------------------
// 暴露：window.TM.PlayerIndustry.{
//   INDUSTRY_TYPES, SIZE_TIERS, UPGRADE_KINDS, RISK_KINDS,
//   STATUS, HAOQIANG_THRESHOLDS, LOCATION_TERRAINS,
//   init, getState, getIndustries, getIndustry, getIndustryCount,
//   listIndustryTypes, listSizeTiers, listUpgradeKinds, listRiskKinds,
//   surveySite, acquireLand, startProject,
//   recruitWorkers, advanceConstruction, completeConstruction,
//   operateMonthly, computeOutput, computeIndustryValue,
//   upgrade,
//   triggerRisk, evaluateRisks, listRisks,
//   checkHaoqiang, getHaoqiangLevel, triggerConfiscation,
//   isBuildingWorksAvailable, applyBuildingWorksBridge,
//   tick, renderPanel,
//   _ensureState, _getState, _findIndustry, _classifyTerrain,
//   _callLLM, _spendPlayerCash, _addPlayerCash, _interactForPermit,
//   _useBuildingWorks, _defaultState
// }
// 依赖（运行时软依赖·缺席时降级）：
//   - TM.PlayerEconomy.spend / addCash        购地/建设消耗 + 经营收入
//   - TM.PlayerInteraction.interact           官府许可关联官场关系
//   - TM.Transmigration.isTransmigrationMode  模式判定
//   - TM.BuildingWorks.upkeepFor / applyCompletion / damageBuilding / repairBuilding
//     沿用 tm-building-works.js 建筑系统底层
//   - GM._playerIndustry / GM.turn / P.playerInfo
//   - global.callAI / callLLM                 运行时 LLM 适配
// 双路径挂载：浏览器走 window.TM.PlayerIndustry；node smoke 走 module.exports。
// ============================================================

(function (global) {
  'use strict';

  if (!global.TM) global.TM = {};

  // ════════════════════════════════════════════════════════════
  //  §1 SubTask 22.1 命名空间 · §22.3 产业类型 8 种
  // ════════════════════════════════════════════════════════════

  // 产业状态机（与 tm-building-works.js 同款「存量模型」+ 玩家私产账本）
  //   PLANNING     选址购地阶段（已批地·待募工开建）
  //   CONSTRUCTING 施工中（remainingMonths > 0）
  //   OPERATING    投产经营
  //   DAMAGED      灾害受损（效用减半·可修缮）
  //   CONFISCATED  朝廷抄没（不可恢复·仅留记录）
  //   ABANDONED    玩家主动废弃
  var STATUS = {
    PLANNING:     'planning',
    CONSTRUCTING: 'constructing',
    OPERATING:    'operating',
    DAMAGED:      'damaged',
    CONFISCATED:  'confiscated',
    ABANDONED:    'abandoned'
  };

  // 选址地形标签（跨朝代通用·剧本可扩展）：
  //   plain 平原 / valley 河谷 / grass 草原 / steppe 大漠 / mountain 山地
  //   forest 林地 / river 河流 / lake 湖泊 / coast 海滨 / city 城邑 / town 市镇 / mine 矿山
  var LOCATION_TERRAINS = [
    'plain', 'valley', 'grass', 'steppe', 'mountain',
    'forest', 'river', 'lake', 'coast', 'city', 'town', 'mine'
  ];

  // 8 种产业类型（中国古代通用称谓·跨朝代可用）
  //   terrain:  允许地形（'*' 通配 / 必含 'mine' 等限定）
  //   requireNear: 选址需紧邻的标签（如矿场需 near 'mine'·渔场需 near water）
  //   landCost:   购地基础银钱（按 size scaleMul 加成）
  //   buildMonths: 基础工期月（按 size scaleMul 加成）
  //   workerDemand: 募工基础人数（按 size scaleMul 加成）
  //   baseOutput:  月度基础产出 { cash, goods }（按 size/level 加成）
  //   upkeep:     月度维护系数（占产出比·用于灾害/治安惩罚计算）
  //   riskMod:    各类灾害易感度修正（>1 易感 / <1 抵抗）
  var INDUSTRY_TYPES = {
    zhuangyuan: {
      id: 'zhuangyuan', label: '庄园', tag: 'composite',
      terrain: ['*'], requireNear: [],
      landCost: 1200, buildMonths: 6, workerDemand: 30,
      baseOutput: { cash: 200, goods: 80 }, upkeep: 0.18,
      riskMod: { fire: 1.0, flood: 0.8, bandit: 1.1, flee: 0.8, impress: 1.0, raid: 1.0 },
      hint: '综合型·含田地/园林/作坊/库房'
    },
    nongchang: {
      id: 'nongchang', label: '农场', tag: 'grain',
      terrain: ['plain', 'valley'], requireNear: [],
      landCost: 600, buildMonths: 3, workerDemand: 20,
      baseOutput: { cash: 90, goods: 120 }, upkeep: 0.12,
      riskMod: { fire: 0.7, flood: 1.3, bandit: 0.9, flee: 1.0, impress: 1.1, raid: 0.9 },
      hint: '粮食产出·依平原河谷'
    },
    muchang: {
      id: 'muchang', label: '牧场', tag: 'livestock',
      terrain: ['grass', 'steppe'], requireNear: [],
      landCost: 500, buildMonths: 2, workerDemand: 12,
      baseOutput: { cash: 110, goods: 50 }, upkeep: 0.14,
      riskMod: { fire: 0.6, flood: 0.7, bandit: 1.3, flee: 1.1, impress: 0.9, raid: 1.2 },
      hint: '牲畜产出·关联骑兵/私军战马'
    },
    kuangchang: {
      id: 'kuangchang', label: '矿场', tag: 'mineral',
      terrain: ['mountain', 'mine'], requireNear: ['mine'],
      landCost: 1500, buildMonths: 8, workerDemand: 40,
      baseOutput: { cash: 280, goods: 60 }, upkeep: 0.22,
      riskMod: { fire: 1.2, flood: 0.6, bandit: 1.0, flee: 1.3, impress: 1.2, raid: 1.0 },
      hint: '金属/煤/盐/玉石产出·须在矿山附近'
    },
    linchang: {
      id: 'linchang', label: '林场', tag: 'timber',
      terrain: ['forest', 'mountain'], requireNear: [],
      landCost: 450, buildMonths: 2, workerDemand: 15,
      baseOutput: { cash: 80, goods: 90 }, upkeep: 0.10,
      riskMod: { fire: 1.5, flood: 0.8, bandit: 1.0, flee: 0.9, impress: 0.8, raid: 0.9 },
      hint: '木材产出·依山林'
    },
    yuchang: {
      id: 'yuchang', label: '渔场', tag: 'fishery',
      terrain: ['river', 'lake', 'coast'], requireNear: ['water'],
      landCost: 400, buildMonths: 2, workerDemand: 18,
      baseOutput: { cash: 70, goods: 100 }, upkeep: 0.11,
      riskMod: { fire: 0.4, flood: 1.6, bandit: 0.8, flee: 0.9, impress: 0.7, raid: 1.1 },
      hint: '水产产出·须临水'
    },
    gongfang: {
      id: 'gongfang', label: '工坊', tag: 'craft',
      terrain: ['*'], requireNear: [],
      landCost: 800, buildMonths: 4, workerDemand: 25,
      baseOutput: { cash: 180, goods: 70 }, upkeep: 0.20,
      riskMod: { fire: 1.4, flood: 0.9, bandit: 1.0, flee: 1.0, impress: 1.1, raid: 1.0 },
      hint: '手工业产出·纺织/陶瓷/造纸/冶铸'
    },
    shanghao: {
      id: 'shanghao', label: '商号', tag: 'commerce',
      terrain: ['city', 'town'], requireNear: [],
      landCost: 1000, buildMonths: 3, workerDemand: 10,
      baseOutput: { cash: 240, goods: 20 }, upkeep: 0.16,
      riskMod: { fire: 1.0, flood: 0.9, bandit: 1.2, flee: 0.7, impress: 1.3, raid: 1.2 },
      hint: '商业产出·酒楼/当铺/客栈·须在城邑市镇'
    }
  };

  // 规模档（与 tm-building-works.js costActual 同源·按 size scaleMul 加成）
  //   small  小：基础工期/成本/产出
  //   medium 中：×2
  //   large  大：×4
  var SIZE_TIERS = {
    small:  { id: 'small',  label: '小', scaleMul: 1, monthsAdd: 0,  costMul: 1.0, outputMul: 1.0, workerMul: 1.0 },
    medium: { id: 'medium', label: '中', scaleMul: 2, monthsAdd: 2,  costMul: 1.8, outputMul: 1.7, workerMul: 1.8 },
    large:  { id: 'large',  label: '大', scaleMul: 4, monthsAdd: 4,  costMul: 3.2, outputMul: 3.0, workerMul: 3.5 }
  };

  // 升级 3 类（SubTask 22.7）
  //   expand     扩建：level + 1·产出 ×1.3·维护 ×1.2·募工需求 +20%
  //   improve    改良：level 不变·产出 ×1.15·维护 ×0.95·灾害易感 -10%
  //   specialize 特化：level 不变·产出 type 切换子方向（hook payload.subType）·产出 ×1.4·维护 ×1.1
  var UPGRADE_KINDS = {
    expand:      { id: 'expand',      label: '扩建',   costMul: 0.6, monthsAdd: 2, outputMul: 1.30, upkeepMul: 1.20, workerMul: 1.20, levelGain: 1, hint: '规模升级·产出/维护齐升' },
    improve:     { id: 'improve',     label: '改良',   costMul: 0.3, monthsAdd: 1, outputMul: 1.15, upkeepMul: 0.95, workerMul: 1.00, levelGain: 0, hint: '效率提升·降灾损' },
    specialize:  { id: 'specialize',  label: '特化',   costMul: 0.4, monthsAdd: 1, outputMul: 1.40, upkeepMul: 1.10, workerMul: 1.00, levelGain: 0, hint: '子方向切换·产出大幅升' }
  };

  // 6 类产业风险（SubTask 22.8·跨朝代通用）
  //   fire     火灾：随产值/规模上升·林场/工坊尤甚
  //   flood    水灾：渔场/农场易感·按地形修正
  //   bandit   盗匪：与治安挂钩·商号/牧场易遭劫
  //   flee     民夫逃亡：与士气/待遇挂钩·矿场/大工程尤甚
  //   impress  官府强征：朝廷征用产出/民夫·大产业触发
  //   raid     敌军劫掠：战区/边疆产业易遭·与战事挂钩
  var RISK_KINDS = {
    fire:    { id: 'fire',    label: '火灾',    severityBase: 0.4, outputLoss: 0.40, workerLoss: 0.10, fixable: true,  hint: '产值/规模上升·林场工坊尤甚' },
    flood:   { id: 'flood',   label: '水灾',    severityBase: 0.3, outputLoss: 0.50, workerLoss: 0.05, fixable: true,  hint: '渔场农场易感·按地形修正' },
    bandit:  { id: 'bandit',  label: '盗匪',    severityBase: 0.4, outputLoss: 0.30, workerLoss: 0.15, fixable: true,  hint: '治安挂钩·商号牧场易遭劫' },
    flee:    { id: 'flee',    label: '民夫逃亡', severityBase: 0.3, outputLoss: 0.20, workerLoss: 0.30, fixable: false, hint: '士气/待遇挂钩·矿场大工程尤甚' },
    impress: { id: 'impress', label: '官府强征', severityBase: 0.2, outputLoss: 0.50, workerLoss: 0.25, fixable: false, hint: '朝廷征用产出/民夫·大产业触发' },
    raid:    { id: 'raid',    label: '敌军劫掠', severityBase: 0.2, outputLoss: 0.70, workerLoss: 0.30, fixable: true,  hint: '战区/边疆产业易遭' }
  };

  // 豪强标签阈值（SubTask 22.9·按产业估值合计·朝代中立·数值由引擎兜底·剧本可覆盖）
  //   warning    言官风闻：朝廷开始关注
  //   serious    言官弹劾：朝廷差人查核
  //   confiscate 抄没风险：朝廷下诏强征/抄没
  var HAOQIANG_THRESHOLDS = {
    warning:    6000,  // 产业估值合计 ≥ 6000 两 → 风闻
    serious:   15000,  // ≥ 15000 两 → 弹劾+查核
    confiscate:30000,  // ≥ 30000 两 → 抄没风险
    max:       60000   // 硬上限
  };

  var LEDGER_MAX = 200;
  var _TIME_PER_TURN = 12; // 累积 12 小时 → GM.turn +1
  var SECURITY_BASE = 60;  // 治安基准值（0-100·剧本可覆盖）

  // ── 工具函数 ────────────────────────────────────────────────
  function _isStr(v) { return typeof v === 'string'; }
  function _isNum(v) { return typeof v === 'number' && !isNaN(v); }
  function _clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function _rndId(prefix) {
    return (prefix || 'ind_') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function _curTurn() {
    try { if (typeof GM !== 'undefined' && GM && _isNum(GM.turn)) return GM.turn; } catch (_) {}
    return 0;
  }
  function _turnsPerMonth() {
    try {
      if (typeof getTurnDays === 'function') {
        var d = getTurnDays(); if (d && d > 0) return 30 / d;
      }
    } catch (_) {}
    return 1; // 默认 1 回合 = 1 月
  }
  function _toast(m) {
    if (typeof toast === 'function') { try { toast(m); return; } catch (_) {} }
    try { console.log('[PlayerIndustry]', m); } catch (_) {}
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

  // ── LLM 调用·缺席降级返回 null ──────────────────────────────
  function _callLLM(prompt) {
    try { if (typeof global.callAI === 'function') return global.callAI(prompt); } catch (_) {}
    try { if (typeof callLLM === 'function') return callLLM(prompt); } catch (_) {}
    return null;
  }

  // ── 银钱消耗·主路径走 TM.PlayerEconomy.spend·降级直减 P.playerInfo.playerEconomy.cash ──
  function _spendPlayerCash(cost, reason) {
    try {
      if (global.TM && global.TM.PlayerEconomy &&
          typeof global.TM.PlayerEconomy.spend === 'function') {
        var r = global.TM.PlayerEconomy.spend(cost, reason);
        if (r && r.ok) return { ok: true, cash: r.cash };
        if (r && r.ok === false) return { ok: false, cash: r.cash };
      }
    } catch (_) {}
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        if (!P.playerInfo.playerEconomy) P.playerInfo.playerEconomy = { cash: 0 }; // arch-ok
        var pe = P.playerInfo.playerEconomy;
        if (typeof pe.cash !== 'number') pe.cash = 0;
        if (pe.cash < cost) return { ok: false, cash: pe.cash };
        pe.cash -= cost; // arch-ok
        return { ok: true, cash: pe.cash };
      }
    } catch (_) {}
    return { ok: true, cash: null };
  }

  // ── 银钱收入·主路径走 TM.PlayerEconomy.addCash·降级直加 ──
  function _addPlayerCash(amount, reason) {
    try {
      if (global.TM && global.TM.PlayerEconomy &&
          typeof global.TM.PlayerEconomy.addCash === 'function') {
        var r = global.TM.PlayerEconomy.addCash(amount, reason);
        if (r && r.ok) return { ok: true, cash: r.cash };
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

  // ── 官府许可·关联 TM.PlayerInteraction.interact（缺席降级 ok=true 不阻拦）──
  function _interactForPermit(action, payload) {
    try {
      if (global.TM && global.TM.PlayerInteraction &&
          typeof global.TM.PlayerInteraction.interact === 'function') {
        var npcName = (payload && payload.permitIssuerName) || _defaultPermitIssuer();
        return global.TM.PlayerInteraction.interact(npcName, 'petition', payload || {
          topic: action,
          intent: 'industry_permit',
          action: action
        });
      }
    } catch (_) {}
    return { ok: true, scene: 'permit-fallback' }; // 缺席降级
  }

  function _defaultPermitIssuer() {
    // 跨朝代通用「地方官」称谓（具体职名由剧本 hook）
    return '地方官';
  }

  // ── 沿用 tm-building-works.js 建筑系统底层 ─────────────────
  //   主路径：TM.BuildingWorks.* 调用
  //   降级：返回 null · 由本模块规则兜底
  function _useBuildingWorks(method, fallbackFn) {
    try {
      if (global.TM && global.TM.BuildingWorks &&
          typeof global.TM.BuildingWorks[method] === 'function') {
        var args = Array.prototype.slice.call(arguments, 2);
        return global.TM.BuildingWorks[method].apply(global.TM.BuildingWorks, args);
      }
    } catch (_) {}
    return typeof fallbackFn === 'function' ? fallbackFn() : null;
  }

  function isBuildingWorksAvailable() {
    try {
      return !!(global.TM && global.TM.BuildingWorks &&
                typeof global.TM.BuildingWorks.upkeepFor === 'function');
    } catch (_) {}
    return false;
  }

  // ════════════════════════════════════════════════════════════
  //  §2 SubTask 22.2 产业数据结构
  // ════════════════════════════════════════════════════════════
  // 状态挂载点：GM._playerIndustry = {
  //   industries: [...], haoqiangLevel, haoqiangScore, notoriety, events: [], createdAt
  // }
  // 产业字段（task spec 强约束）：
  //   { id, type, location, size, status, output, workers, equipment, level }
  // 扩展字段（生命周期/施工/风险/账本）：
  //   typeLabel, terrain, requireNear, scaleMul, landCost, buildMonths,
  //   construction: { remainingMonths, totalMonths, recruitedWorkers, demandWorkers },
  //   output: { cash, goods, lastTurn, lastDelta },
  //   workers: { count, skill(0-100), morale(0-100), overseer },
  //   equipment: { level, list[] },
  //   risks: { fire, flood, bandit, flee, impress, raid },  // 累积风险值 0-1
  //   security: 0-100,                                       // 当地治安（剧本可覆盖）
  //   upgradeLog: [{turn, kind, level, cost}],
  //   ledger: [{turn, kind, summary, delta}],
  //   haoqiang: false,
  //   builtAt, completedAt, lastOperatedAt, lastRiskAt

  function _defaultState() {
    return {
      industries: [],
      haoqiangLevel: 'none',
      haoqiangScore: 0,
      notoriety: 0,
      events: [],
      createdAt: _curTurn()
    };
  }

  function _getState() {
    try {
      if (typeof GM === 'undefined' || !GM) return null;
      if (!GM._playerIndustry) {
        GM._playerIndustry = _defaultState(); // arch-ok
      }
      return GM._playerIndustry;
    } catch (_) { return null; }
  }

  function _ensureState() {
    var s = _getState();
    if (!s) return null;
    if (!Array.isArray(s.industries)) s.industries = []; // arch-ok
    if (!Array.isArray(s.events)) s.events = []; // arch-ok
    if (typeof s.haoqiangScore !== 'number') s.haoqiangScore = 0; // arch-ok
    if (typeof s.notoriety !== 'number') s.notoriety = 0; // arch-ok
    if (typeof s.haoqiangLevel !== 'string') s.haoqiangLevel = 'none'; // arch-ok
    return s;
  }

  function _pushEvent(s, kind, summary, payload) {
    var ev = {
      id: _rndId('ev_'),
      turn: _curTurn(),
      kind: kind,
      summary: summary || '',
      payload: payload || null,
      at: Date.now()
    };
    s.events.push(ev); // arch-ok
    if (s.events.length > LEDGER_MAX) s.events = s.events.slice(-LEDGER_MAX); // arch-ok
    return ev;
  }

  function _findIndustry(s, industryId) {
    if (!s || !Array.isArray(s.industries)) return null;
    for (var i = 0; i < s.industries.length; i++) {
      if (s.industries[i] && s.industries[i].id === industryId) return s.industries[i];
    }
    return null;
  }

  // 地形分类·剧本 hook 路径
  function _classifyTerrain(loc) {
    if (!loc) return 'unknown';
    if (_isStr(loc)) return loc;
    if (loc.terrain) return loc.terrain;
    // 名称关键词推断（中文通用·跨朝代可用）
    var name = loc.name || loc.region || '';
    if (/山|岭|岳|岩/.test(name)) return 'mountain';
    if (/林|森/.test(name)) return 'forest';
    if (/河|江|水/.test(name)) return 'river';
    if (/湖|泽|池/.test(name)) return 'lake';
    if (/海|湾|港|滨/.test(name)) return 'coast';
    if (/城|都|京|府/.test(name)) return 'city';
    if (/镇|市|集/.test(name)) return 'town';
    if (/原|野|坝/.test(name)) return 'plain';
    if (/草|牧|原/.test(name)) return 'grass';
    if (/漠|沙|戈壁/.test(name)) return 'steppe';
    if (/谷|峡/.test(name)) return 'valley';
    if (/矿|坑|冶/.test(name)) return 'mine';
    return 'unknown';
  }

  // 选址校验·terrain 命中 + requireNear 紧邻
  //   loc: { name, terrain, near: [], region?, security? }
  //   返回 { ok, reason?, terrainMatched, nearMatched }
  function _validateLocation(typeDef, loc) {
    if (!loc) return { ok: false, reason: '未指定选址' };
    var terrain = _classifyTerrain(loc);
    var terrainMatched = false;
    if (typeDef.terrain.indexOf('*') >= 0) terrainMatched = true;
    else if (typeDef.terrain.indexOf(terrain) >= 0) terrainMatched = true;
    if (!terrainMatched) {
      return {
        ok: false,
        reason: typeDef.label + '不可建于「' + terrain + '」地形·仅限：' + typeDef.terrain.join('/'),
        terrainMatched: false,
        nearMatched: false
      };
    }
    // requireNear 检查（矿场需 near 'mine'·渔场需 near 'water'）
    var nearArr = Array.isArray(loc.near) ? loc.near : [];
    var missingNear = [];
    for (var i = 0; i < (typeDef.requireNear || []).length; i++) {
      var req = typeDef.requireNear[i];
      // 'water' 通配 river/lake/coast
      var matched = false;
      if (req === 'water') matched = nearArr.indexOf('water') >= 0 ||
                                     nearArr.indexOf('river') >= 0 ||
                                     nearArr.indexOf('lake') >= 0 ||
                                     nearArr.indexOf('coast') >= 0;
      else matched = nearArr.indexOf(req) >= 0;
      if (!matched) missingNear.push(req);
    }
    if (missingNear.length) {
      return {
        ok: false,
        reason: typeDef.label + '选址须紧邻：' + missingNear.join('/') + '·当前选址 near=[' + nearArr.join(',') + ']',
        terrainMatched: true,
        nearMatched: false,
        missingNear: missingNear
      };
    }
    return { ok: true, terrainMatched: true, nearMatched: true, terrain: terrain };
  }

  // ════════════════════════════════════════════════════════════
  //  §3 SubTask 22.4 选址建设（选址限制 + 购地 + 官府许可）
  // ════════════════════════════════════════════════════════════

  // 选址勘探·返回校验结果与成本预估（不扣费·不创建产业）
  function surveySite(type, loc, opts) {
    opts = opts || {};
    var typeDef = INDUSTRY_TYPES[type];
    if (!typeDef) return { ok: false, reason: '未知产业类型: ' + type };
    var sizeKey = opts.size || 'small';
    var sizeDef = SIZE_TIERS[sizeKey];
    if (!sizeDef) return { ok: false, reason: '未知规模: ' + sizeKey };
    var v = _validateLocation(typeDef, loc);
    if (!v.ok) return {
      ok: false, reason: v.reason,
      terrainMatched: v.terrainMatched, nearMatched: v.nearMatched
    };
    var landCost = Math.round(typeDef.landCost * sizeDef.costMul);
    var buildMonths = typeDef.buildMonths + sizeDef.monthsAdd;
    var workerDemand = Math.round(typeDef.workerDemand * sizeDef.workerMul);
    return {
      ok: true,
      type: type, typeLabel: typeDef.label,
      size: sizeKey, sizeLabel: sizeDef.label,
      terrain: v.terrain,
      landCost: landCost,
      buildMonths: buildMonths,
      workerDemand: workerDemand,
      baseOutput: {
        cash: Math.round(typeDef.baseOutput.cash * sizeDef.outputMul),
        goods: Math.round(typeDef.baseOutput.goods * sizeDef.outputMul)
      },
      requirePermit: true,
      hint: typeDef.hint
    };
  }

  // 购地 + 官府许可（购地成功后·产业以 PLANNING 状态入账）
  //   调用 TM.PlayerInteraction.interact 走 petition 路径·失败则不创建
  function acquireLand(type, loc, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    opts = opts || {};
    var survey = surveySite(type, loc, opts);
    if (!survey.ok) return survey;

    // 1) 官府许可（关联人物互动·缺席降级 ok=true）
    var permitR = _interactForPermit('产业购地许可', {
      permitIssuerName: opts.permitIssuerName,
      topic: '产业购地许可·' + survey.typeLabel + '·' + survey.sizeLabel,
      intent: 'industry_permit',
      action: 'acquire_land',
      industryType: type,
      location: loc,
      size: opts.size || 'small',
      landCost: survey.landCost
    });
    var permitOk = !permitR || permitR.ok !== false;
    if (!permitOk) {
      return {
        ok: false,
        reason: '官府未批购地许可（' + (permitR && permitR.reason ? permitR.reason : '人物互动未就绪/被拒') + '）',
        permit: permitR
      };
    }

    // 2) 扣购地银钱
    var spent = _spendPlayerCash(survey.landCost, '购地·' + survey.typeLabel + '·' + survey.sizeLabel);
    if (!spent.ok) {
      return { ok: false, reason: '银钱不足', need: survey.landCost, cash: spent.cash, permit: permitR };
    }

    // 3) 创建产业（PLANNING 状态·待募工开建）
    var s = _ensureState();
    if (!s) return { ok: false, reason: '产业账本未就绪' };
    var industry = _createIndustrySkeleton(survey, loc, opts);
    s.industries.push(industry); // arch-ok
    _pushEvent(s, 'acquire_land', '购地 ' + survey.typeLabel + '（' + survey.sizeLabel + '）·耗银 ' + survey.landCost + ' 两', {
      industryId: industry.id, type: type, size: opts.size || 'small', landCost: survey.landCost,
      permitIssuer: opts.permitIssuerName || _defaultPermitIssuer()
    });

    // 4) 豪强风险复算
    var haoqiangR = _evaluateHaoqiang(s, { silent: true });

    return {
      ok: true,
      industry: industry,
      landCost: survey.landCost,
      permit: permitR,
      haoqiang: haoqiangR
    };
  }

  // 别名：startProject = acquireLand（task spec 的"选址建设"主入口）
  function startProject(type, loc, opts) {
    return acquireLand(type, loc, opts);
  }

  function _createIndustrySkeleton(survey, loc, opts) {
    opts = opts || {};
    var sizeDef = SIZE_TIERS[survey.size];
    var typeDef = INDUSTRY_TYPES[survey.type];
    return {
      // task spec 强约束字段
      id: _rndId('ind_'),
      type: survey.type,
      location: _normalizeLoc(loc),
      size: survey.size,
      status: STATUS.PLANNING,
      output: { cash: 0, goods: 0, lastTurn: null, lastDelta: null },
      workers: { count: 0, skill: 30, morale: 60, overseer: opts.overseer || null },
      equipment: { level: 1, list: [] },
      level: 1,
      // 扩展字段
      typeLabel: survey.typeLabel,
      terrain: survey.terrain,
      scaleMul: sizeDef.scaleMul,
      landCost: survey.landCost,
      buildMonths: survey.buildMonths,
      construction: {
        remainingMonths: survey.buildMonths,
        totalMonths: survey.buildMonths,
        recruitedWorkers: 0,
        demandWorkers: survey.workerDemand
      },
      baseOutput: survey.baseOutput,
      risks: { fire: 0, flood: 0, bandit: 0, flee: 0, impress: 0, raid: 0 },
      security: _isNum(loc.security) ? loc.security : SECURITY_BASE,
      upgradeLog: [],
      ledger: [],
      haoqiang: false,
      builtAt: _curTurn(),
      completedAt: null,
      lastOperatedAt: null,
      lastRiskAt: null,
      subType: opts.subType || null
    };
  }

  function _normalizeLoc(loc) {
    if (!loc) return { name: '', terrain: 'unknown', near: [] };
    if (_isStr(loc)) return { name: loc, terrain: _classifyTerrain(loc), near: [] };
    return {
      name: loc.name || loc.region || '',
      terrain: loc.terrain || _classifyTerrain(loc),
      near: Array.isArray(loc.near) ? loc.near.slice() : [],
      region: loc.region || null,
      security: _isNum(loc.security) ? loc.security : SECURITY_BASE
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §4 SubTask 22.5 施工建设（募工 + 施工时间 + 投产）
  // ════════════════════════════════════════════════════════════

  // 募工：消耗银钱（按缺口×单价）·推进施工状态 PLANNING→CONSTRUCTING
  //   count: 此次募工人数（不超过 demandWorkers - recruitedWorkers）
  //   返回 { ok, recruited, cost, demand, remaining, status }
  function recruitWorkers(industryId, count, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '产业账本未就绪' };
    if (!industryId) return { ok: false, reason: '未指定 industryId' };
    var ind = _findIndustry(s, industryId);
    if (!ind) return { ok: false, reason: '未找到产业: ' + industryId };
    if (ind.status === STATUS.CONFISCATED) return { ok: false, reason: '产业已被抄没' };
    if (ind.status === STATUS.ABANDONED) return { ok: false, reason: '产业已废弃' };
    opts = opts || {};
    if (!_isNum(count) || count <= 0) return { ok: false, reason: '人数非法' };
    if (Math.floor(count) !== count) return { ok: false, reason: '人数须为整数' };

    var demand = ind.construction.demandWorkers || 0;
    var recruited = ind.construction.recruitedWorkers || 0;
    var remaining = Math.max(0, demand - recruited);
    if (remaining <= 0) return { ok: false, reason: '募工已满（需求 ' + demand + ' 人）' };
    var toRecruit = Math.min(count, remaining);

    // 募工单价（两/人·按产业类型不同·跨朝代通用）
    var costPerWorker = 8;
    if (ind.type === 'kuangchang') costPerWorker = 12;
    else if (ind.type === 'gongfang') costPerWorker = 14;
    else if (ind.type === 'shanghao') costPerWorker = 18;
    var cost = Math.round(toRecruit * costPerWorker);
    var spent = _spendPlayerCash(cost, '募工·' + ind.typeLabel + '·' + toRecruit + '人');
    if (!spent.ok) return { ok: false, reason: '银钱不足', need: cost, cash: spent.cash };

    ind.construction.recruitedWorkers = recruited + toRecruit; // arch-ok
    ind.workers.count = (ind.workers.count || 0) + toRecruit; // arch-ok
    ind.workers.morale = _clamp(ind.workers.morale || 60, 0, 100); // arch-ok
    ind.workers.skill = _clamp(ind.workers.skill || 30, 0, 100); // arch-ok
    ind.ledger.push({ turn: _curTurn(), kind: 'recruit', summary: '募工 ' + toRecruit + '人·耗银 ' + cost + ' 两', delta: -cost });

    // 募工满·进入施工状态
    var statusChanged = false;
    if (ind.status === STATUS.PLANNING && ind.construction.recruitedWorkers >= ind.construction.demandWorkers) {
      ind.status = STATUS.CONSTRUCTING; // arch-ok
      statusChanged = true;
      _pushEvent(s, 'construction_start', ind.typeLabel + ' 募工满·开建（工期 ' + ind.construction.remainingMonths + ' 月）', {
        industryId: ind.id, demand: ind.construction.demandWorkers, months: ind.construction.remainingMonths
      });
    }

    return {
      ok: true,
      recruited: toRecruit,
      cost: cost,
      demand: demand,
      recruitedTotal: ind.construction.recruitedWorkers,
      remaining: Math.max(0, demand - ind.construction.recruitedWorkers),
      status: ind.status,
      statusChanged: statusChanged
    };
  }

  // 推进施工·按 months 步进（月度 tick 调用）
  //   返回 { ok, industry, remainingMonths, completed }
  function advanceConstruction(industryId, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '产业账本未就绪' };
    var ind = _findIndustry(s, industryId);
    if (!ind) return { ok: false, reason: '未找到产业: ' + industryId };
    if (ind.status !== STATUS.CONSTRUCTING && ind.status !== STATUS.PLANNING) {
      return { ok: false, reason: '产业非施工中状态·当前：' + ind.status };
    }
    opts = opts || {};
    var months = opts.months || 1;
    if (ind.status === STATUS.PLANNING) {
      // 未募工满·不可推进
      if ((ind.construction.recruitedWorkers || 0) < (ind.construction.demandWorkers || 0)) {
        return {
          ok: false,
          reason: '募工未满（' + ind.construction.recruitedWorkers + '/' + ind.construction.demandWorkers + '）·不可推进施工',
          remainingMonths: ind.construction.remainingMonths
        };
      }
      ind.status = STATUS.CONSTRUCTING; // arch-ok
    }
    ind.construction.remainingMonths = Math.max(0, (ind.construction.remainingMonths || 0) - months); // arch-ok
    ind.ledger.push({ turn: _curTurn(), kind: 'construction_advance', summary: '施工推进 ' + months + ' 月', delta: 0 });

    // 完工判定
    if (ind.construction.remainingMonths <= 0) {
      var compR = _completeConstructionInternal(s, ind);
      return {
        ok: true,
        industry: ind,
        remainingMonths: 0,
        completed: true,
        completion: compR
      };
    }
    return {
      ok: true,
      industry: ind,
      remainingMonths: ind.construction.remainingMonths,
      completed: false
    };
  }

  // 完工投产（手动强制完工·或 advanceConstruction 自动触发）
  function completeConstruction(industryId, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '产业账本未就绪' };
    var ind = _findIndustry(s, industryId);
    if (!ind) return { ok: false, reason: '未找到产业: ' + industryId };
    if (ind.status === STATUS.OPERATING) return { ok: false, reason: '产业已投产' };
    if (ind.status === STATUS.CONFISCATED) return { ok: false, reason: '产业已被抄没' };
    opts = opts || {};
    if (!opts.force && (ind.construction.recruitedWorkers || 0) < (ind.construction.demandWorkers || 0)) {
      return {
        ok: false,
        reason: '募工未满（' + ind.construction.recruitedWorkers + '/' + ind.construction.demandWorkers + '）·不可完工'
      };
    }
    var compR = _completeConstructionInternal(s, ind);
    return {
      ok: true,
      industry: ind,
      completion: compR
    };
  }

  function _completeConstructionInternal(s, ind) {
    ind.status = STATUS.OPERATING; // arch-ok
    ind.construction.remainingMonths = 0; // arch-ok
    ind.completedAt = _curTurn(); // arch-ok
    ind.lastOperatedAt = _curTurn(); // arch-ok
    // 沿用 tm-building-works.js 完工入账（沿用底层·无 div 上下文时降级）
    var bwR = _useBuildingWorks('applyCompletion', function () { return null; },
      _buildBwFakeDivFor(ind), _buildBwFakeBuildingFor(ind), (typeof P !== 'undefined' ? P : null), (typeof GM !== 'undefined' ? GM : null));
    _pushEvent(s, 'construction_complete', ind.typeLabel + ' 完工投产·规模 ' + (SIZE_TIERS[ind.size] ? SIZE_TIERS[ind.size].label : ind.size) + '·等级 ' + ind.level, {
      industryId: ind.id, level: ind.level, size: ind.size, buildingWorksApplied: !!bwR
    });
    ind.ledger.push({ turn: _curTurn(), kind: 'complete', summary: '完工投产', delta: 0 });
    return { buildingWorksApplied: !!bwR, buildingWorksResult: bwR };
  }

  // 构造 tm-building-works.applyCompletion 期望的伪 div 上下文（用于沿用底层入账）
  //   注：玩家产业不强制写区域 economyBase·仅当 div.economyBase 可达时才写
  function _buildBwFakeDivFor(ind) {
    if (!ind || !ind.location) return null;
    var loc = ind.location;
    if (loc._divRef) return loc._divRef; // 剧本可注入 div 引用
    return null;
  }
  function _buildBwFakeBuildingFor(ind) {
    if (!ind) return null;
    return {
      name: ind.typeLabel,
      category: 'economic',
      level: ind.level,
      costActual: ind.landCost,
      remainingTurns: 0,
      effectsStructured: null,
      _playerIndustryId: ind.id,
      _playerOwned: true
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §5 SubTask 22.6 产业经营（月度产出·受管理/匠人/治安/灾害影响）
  // ════════════════════════════════════════════════════════════

  // 月度经营·对所有 OPERATING 产业产出
  //   返回 { ok, operated: [{id, cash, goods, modifiers, risks}], totalCash, totalGoods }
  function operateMonthly(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '产业账本未就绪' };
    opts = opts || {};
    var operated = [];
    var totalCash = 0, totalGoods = 0;
    for (var i = 0; i < s.industries.length; i++) {
      var ind = s.industries[i];
      if (!ind || ind.status !== STATUS.OPERATING) continue;
      var outR = _operateOne(s, ind, opts);
      operated.push(outR);
      totalCash += outR.cash;
      totalGoods += outR.goods;
    }
    // 豪强风险复算
    var haoqiangR = _evaluateHaoqiang(s, { silent: true });
    return {
      ok: true,
      operated: operated,
      totalCash: totalCash,
      totalGoods: totalGoods,
      haoqiang: haoqiangR
    };
  }

  function _operateOne(s, ind, opts) {
    var out = computeOutput(ind, opts);
    ind.output.cash = out.cash; // arch-ok
    ind.output.goods = out.goods; // arch-ok
    ind.output.lastTurn = _curTurn(); // arch-ok
    ind.output.lastDelta = { cash: out.cash, goods: out.goods }; // arch-ok
    ind.lastOperatedAt = _curTurn(); // arch-ok
    // 入账玩家银钱
    if (out.cash > 0) {
      _addPlayerCash(out.cash, '产业经营·' + ind.typeLabel + '·月入');
    }
    // 物资（goods）记入产业账本（可后续剧本 hook 兑换）
    ind.ledger.push({
      turn: _curTurn(),
      kind: 'operate',
      summary: '月度经营·银 ' + out.cash + ' 两·货 ' + out.goods + ' 担',
      delta: out.cash
    });
    // 沿用 tm-building-works.js 月维护（缺席降级·玩家私产维护由 upkeep 系数自算）
    var upkeep = _computeUpkeep(ind);
    if (upkeep > 0) {
      _spendPlayerCash(upkeep, '产业维护·' + ind.typeLabel);
    }
    // 风险检定（每月）
    var risksR = _evaluateRisksInternal(s, ind, opts);
    return {
      id: ind.id,
      type: ind.type,
      typeLabel: ind.typeLabel,
      cash: out.cash,
      goods: out.goods,
      upkeep: upkeep,
      modifiers: out.modifiers,
      risks: risksR.risks
    };
  }

  // 产出计算·受管理 + 民夫/匠人 + 治安 + 灾害影响
  //   返回 { ok, cash, goods, modifiers: { management, worker, security, disaster, level, size } }
  function computeOutput(industry, opts) {
    opts = opts || {};
    var ind = industry;
    if (!ind) return { ok: false, reason: '未指定产业' };
    if (ind.status !== STATUS.OPERATING && ind.status !== STATUS.DAMAGED) {
      return { ok: false, reason: '产业未投产·当前：' + ind.status, cash: 0, goods: 0 };
    }
    var typeDef = INDUSTRY_TYPES[ind.type];
    if (!typeDef) return { ok: false, reason: '未知产业类型', cash: 0, goods: 0 };
    var sizeDef = SIZE_TIERS[ind.size] || SIZE_TIERS.small;

    var baseCash = (ind.baseOutput && ind.baseOutput.cash) || typeDef.baseOutput.cash * sizeDef.outputMul;
    var baseGoods = (ind.baseOutput && ind.baseOutput.goods) || typeDef.baseOutput.goods * sizeDef.outputMul;

    // 等级乘子（每级 +15%）
    var levelMul = 1 + (ind.level - 1) * 0.15;

    // 管理因子：overseer 在场 ×1.1·缺席 ×0.85
    var managementMul = ind.workers.overseer ? 1.10 : 0.85;

    // 民夫/匠人因子：按 demand 满足率
    var demand = ind.construction.demandWorkers || typeDef.workerDemand * sizeDef.workerMul;
    var workerRatio = demand > 0 ? Math.min(1.0, (ind.workers.count || 0) / demand) : 1.0;
    // 技能因子：skill 0-100·50 为基线·每 ±10 → ±5%
    var skillMul = 1 + ((ind.workers.skill || 50) - 50) / 200;
    var workerMul = workerRatio * skillMul;

    // 治安因子：security 0-100·60 为基线·每 ±10 → ±5%
    var securityMul = 1 + ((ind.security || SECURITY_BASE) - SECURITY_BASE) / 200;

    // 灾害因子：DAMAGED 状态效用减半·累积风险值扣产出
    var disasterMul = 1.0;
    if (ind.status === STATUS.DAMAGED) disasterMul *= 0.5;
    var risks = ind.risks || {};
    var riskSum = 0;
    var rk = ['fire', 'flood', 'bandit', 'flee', 'impress', 'raid'];
    for (var i = 0; i < rk.length; i++) riskSum += (risks[rk[i]] || 0);
    // 风险累积 0-6·每点扣 5% 产出
    disasterMul *= Math.max(0.3, 1 - riskSum * 0.05);

    // 综合产出
    var cash = Math.round(baseCash * levelMul * managementMul * workerMul * securityMul * disasterMul);
    var goods = Math.round(baseGoods * levelMul * managementMul * workerMul * securityMul * disasterMul);

    return {
      ok: true,
      cash: cash,
      goods: goods,
      modifiers: {
        level: Math.round(levelMul * 100) / 100,
        size: sizeDef.outputMul,
        management: Math.round(managementMul * 100) / 100,
        worker: Math.round(workerMul * 100) / 100,
        security: Math.round(securityMul * 100) / 100,
        disaster: Math.round(disasterMul * 100) / 100,
        riskSum: Math.round(riskSum * 100) / 100
      }
    };
  }

  // 月度维护成本（沿用 tm-building-works.js upkeepFor 模型·降级本模块规则）
  function _computeUpkeep(ind) {
    if (!ind) return 0;
    var typeDef = INDUSTRY_TYPES[ind.type];
    if (!typeDef) return 0;
    // 主路径·TM.BuildingWorks.upkeepFor（沿用底层）
    var bwUpkeep = _useBuildingWorks('upkeepFor', function () { return null; },
      _buildBwFakeBuildingFor(ind), typeDef);
    if (_isNum(bwUpkeep)) return Math.max(0, Math.round(bwUpkeep));
    // 降级：upkeep 系数 × 月度基础产出
    var sizeDef = SIZE_TIERS[ind.size] || SIZE_TIERS.small;
    var baseCash = (ind.baseOutput && ind.baseOutput.cash) || typeDef.baseOutput.cash * sizeDef.outputMul;
    return Math.round(baseCash * typeDef.upkeep);
  }

  // 产业估值（用于豪强风险）
  function computeIndustryValue(ind) {
    if (!ind) return 0;
    var typeDef = INDUSTRY_TYPES[ind.type];
    if (!typeDef) return 0;
    var sizeDef = SIZE_TIERS[ind.size] || SIZE_TIERS.small;
    // 估值 = 购地成本 + 月产出 × 12 × level
    var landCost = ind.landCost || Math.round(typeDef.landCost * sizeDef.costMul);
    var monthlyCash = (ind.baseOutput && ind.baseOutput.cash) || typeDef.baseOutput.cash * sizeDef.outputMul;
    var monthlyGoods = (ind.baseOutput && ind.baseOutput.goods) || typeDef.baseOutput.goods * sizeDef.outputMul;
    var value = landCost + (monthlyCash + monthlyGoods * 0.5) * 12 * ind.level;
    return Math.round(value);
  }

  // ════════════════════════════════════════════════════════════
  //  §6 SubTask 22.7 产业升级（扩建/改良/特化）
  // ════════════════════════════════════════════════════════════

  // 升级主入口·kind ∈ {expand, improve, specialize}
  function upgrade(industryId, kind, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '产业账本未就绪' };
    if (!industryId) return { ok: false, reason: '未指定 industryId' };
    var def = UPGRADE_KINDS[kind];
    if (!def) return { ok: false, reason: '未知升级类型: ' + kind };
    var ind = _findIndustry(s, industryId);
    if (!ind) return { ok: false, reason: '未找到产业: ' + industryId };
    if (ind.status !== STATUS.OPERATING && ind.status !== STATUS.DAMAGED) {
      return { ok: false, reason: '产业非投产状态·不可升级·当前：' + ind.status };
    }
    opts = opts || {};

    // 升级成本 = 当前产业估值 × def.costMul
    var value = computeIndustryValue(ind);
    var cost = Math.round(value * def.costMul);
    var spent = _spendPlayerCash(cost, '产业升级·' + def.label + '·' + ind.typeLabel);
    if (!spent.ok) return { ok: false, reason: '银钱不足', need: cost, cash: spent.cash };

    // 应用升级
    var prevLevel = ind.level;
    ind.level = ind.level + def.levelGain; // arch-ok
    // 产出乘子
    var prevBaseCash = ind.baseOutput.cash;
    var prevBaseGoods = ind.baseOutput.goods;
    ind.baseOutput.cash = Math.round(prevBaseCash * def.outputMul); // arch-ok
    ind.baseOutput.goods = Math.round(prevBaseGoods * def.outputMul); // arch-ok
    // 维护乘子（写入 upkeep 系数·通过 typeDef.upkeep × upkeepMul 计算时反算）——
    // 这里直接乘到 baseOutput 的 upkeep 字段（如果存在）；维护由 _computeUpkeep 用 typeDef.upkeep 算·
    // 升级 upkeep 调整记到 industry.upkeepMul 累积
    if (typeof ind.upkeepMul !== 'number') ind.upkeepMul = 1.0; // arch-ok
    ind.upkeepMul = ind.upkeepMul * def.upkeepMul; // arch-ok
    // 募工需求乘子
    ind.construction.demandWorkers = Math.round((ind.construction.demandWorkers || 0) * def.workerMul); // arch-ok
    // 特化：切换 subType
    if (kind === 'specialize' && opts.subType) {
      ind.subType = opts.subType; // arch-ok
    }
    // 改良：风险易感 -10%（写入 riskModDelta）
    if (kind === 'improve') {
      if (typeof ind.riskModDelta !== 'number') ind.riskModDelta = 0; // arch-ok
      ind.riskModDelta = ind.riskModDelta - 0.10; // arch-ok
    }
    // 升级占用工期（暂停产出）
    if (def.monthsAdd > 0) {
      ind.construction.remainingMonths = def.monthsAdd; // arch-ok
      ind.status = STATUS.CONSTRUCTING; // arch-ok
    }
    ind.upgradeLog.push({
      turn: _curTurn(),
      kind: kind,
      kindLabel: def.label,
      level: ind.level,
      prevLevel: prevLevel,
      cost: cost,
      outputMul: def.outputMul
    }); // arch-ok
    _pushEvent(s, 'upgrade:' + kind, ind.typeLabel + ' ' + def.label + '·等级 ' + prevLevel + '→' + ind.level + '·耗银 ' + cost + ' 两', {
      industryId: ind.id, kind: kind, level: ind.level, cost: cost
    });
    ind.ledger.push({ turn: _curTurn(), kind: 'upgrade:' + kind, summary: def.label + '·耗银 ' + cost, delta: -cost });

    // 豪强风险复算（产业估值上升）
    var haoqiangR = _evaluateHaoqiang(s, { silent: true });

    return {
      ok: true,
      industry: ind,
      kind: kind,
      kindLabel: def.label,
      cost: cost,
      prevLevel: prevLevel,
      newLevel: ind.level,
      haoqiang: haoqiangR
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §7 SubTask 22.8 产业风险（6 类灾害事件）
  // ════════════════════════════════════════════════════════════

  // 触发指定风险·应用损害
  //   riskKind ∈ {fire, flood, bandit, flee, impress, raid}
  //   opts.severity 0-1·opts.force 强制触发
  function triggerRisk(industryId, riskKind, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '产业账本未就绪' };
    var ind = _findIndustry(s, industryId);
    if (!ind) return { ok: false, reason: '未找到产业: ' + industryId };
    if (ind.status === STATUS.CONFISCATED) return { ok: false, reason: '产业已被抄没' };
    if (ind.status === STATUS.ABANDONED) return { ok: false, reason: '产业已废弃' };
    var def = RISK_KINDS[riskKind];
    if (!def) return { ok: false, reason: '未知风险类型: ' + riskKind };
    opts = opts || {};
    var severity = _isNum(opts.severity) ? _clamp(opts.severity, 0, 1) : def.severityBase;
    // typeDef.riskMod 调整 + 升级 riskModDelta
    var typeDef = INDUSTRY_TYPES[ind.type];
    var riskMod = (typeDef && typeDef.riskMod && typeDef.riskMod[riskKind]) || 1.0;
    if (typeof ind.riskModDelta === 'number') riskMod += ind.riskModDelta;
    var effectiveSeverity = _clamp(severity * riskMod, 0, 1);

    // 累积风险值
    ind.risks[riskKind] = _clamp((ind.risks[riskKind] || 0) + effectiveSeverity * 0.3, 0, 1); // arch-ok
    ind.lastRiskAt = _curTurn(); // arch-ok

    // 应用损害
    var outLoss = Math.round((ind.output.cash || 0) * def.outputLoss * effectiveSeverity);
    var workerLoss = Math.max(0, Math.floor((ind.workers.count || 0) * def.workerLoss * effectiveSeverity));
    var cashLoss = outLoss;
    if (cashLoss > 0) {
      // 已入账产出被灾损回扣（直接扣玩家银钱）
      _spendPlayerCash(cashLoss, '产业灾损·' + def.label + '·' + ind.typeLabel);
    }
    if (workerLoss > 0) {
      ind.workers.count = Math.max(0, (ind.workers.count || 0) - workerLoss); // arch-ok
      ind.construction.recruitedWorkers = Math.max(0, (ind.construction.recruitedWorkers || 0) - workerLoss); // arch-ok
      ind.workers.morale = _clamp((ind.workers.morale || 60) - Math.round(effectiveSeverity * 20), 0, 100); // arch-ok
    }

    // 状态变 DAMAGED（可修复灾害）
    var statusChanged = false;
    if (def.fixable && effectiveSeverity > 0.4 && ind.status === STATUS.OPERATING) {
      ind.status = STATUS.DAMAGED; // arch-ok
      statusChanged = true;
      // 沿用 tm-building-works.js damageBuilding（如有 div 上下文）
      _useBuildingWorks('damageBuilding', function () { return null; },
        _buildBwFakeDivFor(ind), _buildBwFakeBuildingFor(ind));
    }

    // impress（官府强征）特殊：可触发豪强标签
    if (riskKind === 'impress') {
      var haoqiangR = _evaluateHaoqiang(s, { silent: true });
    }

    _pushEvent(s, 'risk:' + riskKind, ind.typeLabel + ' 遭「' + def.label + '」·severity ' + Math.round(effectiveSeverity * 100) + '%·银损 ' + cashLoss + '·人损 ' + workerLoss, {
      industryId: ind.id, riskKind: riskKind, severity: effectiveSeverity, cashLoss: cashLoss, workerLoss: workerLoss,
      statusChanged: statusChanged
    });
    ind.ledger.push({ turn: _curTurn(), kind: 'risk:' + riskKind, summary: def.label + '·银损 ' + cashLoss + '·人损 ' + workerLoss, delta: -cashLoss });

    return {
      ok: true,
      industry: ind,
      riskKind: riskKind,
      riskLabel: def.label,
      severity: effectiveSeverity,
      cashLoss: cashLoss,
      workerLoss: workerLoss,
      statusChanged: statusChanged,
      status: ind.status
    };
  }

  // 月度风险检定·对单产业跑 6 类风险概率判定
  //   返回 { ok, risks: [{riskKind, severity, triggered}], triggered }
  function evaluateRisks(industryId, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '产业账本未就绪' };
    var ind = _findIndustry(s, industryId);
    if (!ind) return { ok: false, reason: '未找到产业: ' + industryId };
    return _evaluateRisksInternal(s, ind, opts || {});
  }

  function _evaluateRisksInternal(s, ind, opts) {
    var riskKinds = Object.keys(RISK_KINDS);
    var triggered = [];
    var typeDef = INDUSTRY_TYPES[ind.type];
    var riskModDelta = (typeof ind.riskModDelta === 'number') ? ind.riskModDelta : 0;
    for (var i = 0; i < riskKinds.length; i++) {
      var rk = riskKinds[i];
      var def = RISK_KINDS[rk];
      var riskMod = (typeDef && typeDef.riskMod && typeDef.riskMod[rk]) || 1.0;
      riskMod += riskModDelta;
      // 治安修正：security < 60 → bandit/flee 风险升·security > 80 → 全风险降
      var securityAdj = 0;
      if (rk === 'bandit' || rk === 'flee') {
        securityAdj = ((ind.security || SECURITY_BASE) - SECURITY_BASE) / 200;
      } else if (rk === 'fire' || rk === 'flood' || rk === 'raid') {
        securityAdj = ((ind.security || SECURITY_BASE) - SECURITY_BASE) / 400;
      }
      var prob = _clamp(def.severityBase * riskMod - securityAdj, 0.01, 0.95);
      // 剧本可注入 forceRisk 数组
      var forceRk = opts.forceRisk && opts.forceRisk.indexOf(rk) >= 0;
      var roll = forceRk ? 1.0 : Math.random();
      if (roll < prob) {
        var severity = _clamp(def.severityBase * (0.7 + Math.random() * 0.6) * riskMod, 0, 1);
        var trigR = triggerRisk(ind.id, rk, { severity: severity });
        triggered.push({
          riskKind: rk,
          riskLabel: def.label,
          severity: severity,
          triggered: true,
          result: trigR
        });
      } else {
        // 未触发·累积风险值自然衰减 5%
        ind.risks[rk] = _clamp((ind.risks[rk] || 0) * 0.95, 0, 1); // arch-ok
      }
    }
    return { ok: true, risks: triggered, triggered: triggered };
  }

  function listRisks(industryId) {
    var s = _getState();
    if (!s) return [];
    var ind = _findIndustry(s, industryId);
    if (!ind) return [];
    var out = [];
    var rk = Object.keys(RISK_KINDS);
    for (var i = 0; i < rk.length; i++) {
      out.push({
        riskKind: rk[i],
        riskLabel: RISK_KINDS[rk[i]].label,
        accumulated: ind.risks ? (ind.risks[rk[i]] || 0) : 0,
        hint: RISK_KINDS[rk[i]].hint
      });
    }
    return out;
  }

  // ════════════════════════════════════════════════════════════
  //  §8 SubTask 22.9 豪强标签（大产业触发朝廷强征/抄没）
  // ════════════════════════════════════════════════════════════

  // 豪强风险等级：none / warning / serious / confiscate
  function _evaluateHaoqiang(s, opts) {
    opts = opts || {};
    var totalValue = 0;
    for (var i = 0; i < s.industries.length; i++) {
      var ind = s.industries[i];
      if (!ind) continue;
      if (ind.status === STATUS.CONFISCATED || ind.status === STATUS.ABANDONED) continue;
      totalValue += computeIndustryValue(ind);
    }
    var level = 'none';
    if (totalValue >= HAOQIANG_THRESHOLDS.confiscate) level = 'confiscate';
    else if (totalValue >= HAOQIANG_THRESHOLDS.serious) level = 'serious';
    else if (totalValue >= HAOQIANG_THRESHOLDS.warning) level = 'warning';

    var prevLevel = s.haoqiangLevel || 'none';
    s.haoqiangLevel = level; // arch-ok
    s.haoqiangScore = totalValue; // arch-ok

    // 恶名累计
    var notorietyGain = 0;
    if (level === 'warning') notorietyGain = 3;
    else if (level === 'serious') notorietyGain = 8;
    else if (level === 'confiscate') notorietyGain = 20;
    if (notorietyGain > 0) {
      s.notoriety = _clamp((s.notoriety || 0) + notorietyGain, 0, 200); // arch-ok
    }

    // 产业豪强标记
    for (var j = 0; j < s.industries.length; j++) {
      var ind2 = s.industries[j];
      if (!ind2) continue;
      var indVal = computeIndustryValue(ind2);
      ind2.haoqiang = indVal >= HAOQIANG_THRESHOLDS.warning; // arch-ok
    }

    // 等级跃升·触发朝廷反应
    var levelUp = _haoqiangLevelOrder(level) > _haoqiangLevelOrder(prevLevel);
    var actions = [];
    if (level === 'warning') {
      actions.push({ kind: 'whisper', label: '言官风闻', detail: '朝野风闻玩家广殖产业' });
    } else if (level === 'serious') {
      actions.push({ kind: 'investigate', label: '朝廷查核', detail: '朝廷差人查核产业规模' });
      actions.push({ kind: 'impeach', label: '言官弹劾', detail: '言官上章弹劾豪强' });
    } else if (level === 'confiscate') {
      actions.push({ kind: 'confiscate', label: '朝廷抄没', detail: '朝廷下诏抄没大产业' });
    }

    if (levelUp && level === 'confiscate') {
      // 自动抄没最大产业
      _triggerConfiscationInternal(s);
    } else if (levelUp && (level === 'serious' || level === 'confiscate')) {
      _triggerCourtInvestigation(s, level, totalValue);
    }

    if (!opts.silent) {
      _pushEvent(s, 'haoqiang', '豪强等级 ' + level + '·产业估值 ' + totalValue + '·恶名 ' + s.notoriety, {
        level: level, prevLevel: prevLevel, totalValue: totalValue, notoriety: s.notoriety, actions: actions
      });
    }

    return {
      level: level,
      prevLevel: prevLevel,
      levelUp: levelUp,
      totalValue: totalValue,
      notoriety: s.notoriety,
      actions: actions
    };
  }

  function _haoqiangLevelOrder(l) {
    return l === 'none' ? 0 : l === 'warning' ? 1 : l === 'serious' ? 2 : l === 'confiscate' ? 3 : 0;
  }

  function _triggerCourtInvestigation(s, level, totalValue) {
    try {
      if (typeof GM === 'undefined' || !GM) return;
      if (!GM._charInvestigations) GM._charInvestigations = []; // arch-ok
      var playerName = _getPlayerName();
      GM._charInvestigations.push({ // arch-ok
        target: playerName,
        startTurn: _curTurn(),
        returnTurn: _curTurn() + (level === 'confiscate' ? 1 : 3),
        status: 'pending',
        reason: '广殖产业·估值 ' + totalValue + ' 两·豪强' + (level === 'confiscate' ? '·抄没' : '·查核'),
        severity: level
      });
    } catch (_) {}
  }

  function _triggerConfiscationInternal(s) {
    // 找估值最高的非 CONFISCATED/ABANDONED 产业·抄没
    var target = null;
    var targetVal = 0;
    for (var i = 0; i < s.industries.length; i++) {
      var ind = s.industries[i];
      if (!ind || ind.status === STATUS.CONFISCATED || ind.status === STATUS.ABANDONED) continue;
      var v = computeIndustryValue(ind);
      if (v > targetVal) { target = ind; targetVal = v; }
    }
    if (!target) return null;
    target.status = STATUS.CONFISCATED; // arch-ok
    target.output.cash = 0; // arch-ok
    target.output.goods = 0; // arch-ok
    target.workers.count = 0; // arch-ok
    _pushEvent(s, 'confiscate', target.typeLabel + ' 被朝廷抄没·估值 ' + targetVal + ' 两', {
      industryId: target.id, value: targetVal
    });
    target.ledger.push({ turn: _curTurn(), kind: 'confiscate', summary: '朝廷抄没', delta: -targetVal });
    return { industryId: target.id, value: targetVal };
  }

  function checkHaoqiang() {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '产业账本未就绪' };
    return { ok: true, haoqiang: _evaluateHaoqiang(s, {}) };
  }

  function getHaoqiangLevel() {
    var s = _getState();
    if (!s) return 'none';
    return s.haoqiangLevel || 'none';
  }

  // 手动触发抄没（剧本 hook 路径）
  function triggerConfiscation(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '产业账本未就绪' };
    opts = opts || {};
    var r = _triggerConfiscationInternal(s);
    if (!r) return { ok: false, reason: '无可抄没产业' };
    var haoqiangR = _evaluateHaoqiang(s, { silent: true });
    return { ok: true, confiscation: r, haoqiang: haoqiangR };
  }

  // ════════════════════════════════════════════════════════════
  //  §9 SubTask 22.10 沿用 tm-building-works.js 建筑系统底层
  // ════════════════════════════════════════════════════════════

  // 桥接入口·调用 TM.BuildingWorks.<method> 并降级
  //   返回 { ok, available, method, result }
  function applyBuildingWorksBridge(method, args) {
    if (!isBuildingWorksAvailable()) {
      return { ok: false, available: false, method: method, reason: 'tm-building-works.js 未就绪·降级本模块规则' };
    }
    try {
      var r = global.TM.BuildingWorks[method].apply(global.TM.BuildingWorks, args || []);
      return { ok: true, available: true, method: method, result: r };
    } catch (e) {
      return { ok: false, available: true, method: method, reason: '调用失败: ' + (e && e.message) };
    }
  }

  // ════════════════════════════════════════════════════════════
  //  §10 SubTask 22.11 御案新增"产业"面板
  // ════════════════════════════════════════════════════════════

  function renderPanel() {
    var s = _getState();
    if (!s) return '<div class="pi-panel-empty">产业账本未就绪</div>';
    var totalValue = 0;
    var operating = 0, constructing = 0, planning = 0, damaged = 0, confiscated = 0;
    if (Array.isArray(s.industries)) {
      for (var i = 0; i < s.industries.length; i++) {
        var ind0 = s.industries[i];
        if (!ind0) continue;
        if (ind0.status === STATUS.OPERATING) operating++;
        else if (ind0.status === STATUS.CONSTRUCTING) constructing++;
        else if (ind0.status === STATUS.PLANNING) planning++;
        else if (ind0.status === STATUS.DAMAGED) damaged++;
        else if (ind0.status === STATUS.CONFISCATED) confiscated++;
        if (ind0.status !== STATUS.CONFISCATED && ind0.status !== STATUS.ABANDONED) {
          totalValue += computeIndustryValue(ind0);
        }
      }
    }
    var haoqiang = s.haoqiangLevel || 'none';
    var haoqiangLabel = haoqiang === 'none' ? '无' :
                        haoqiang === 'warning' ? '风闻' :
                        haoqiang === 'serious' ? '弹劾' :
                        haoqiang === 'confiscate' ? '抄没' : '—';

    var h = '<div class="pi-panel" id="piPanel">';
    h += '<div class="pi-section"><div class="pi-section-title">产 业 · 概 览</div>';
    h += '<div class="pi-row"><span>产 业 数</span><span class="pi-val">' + (s.industries || []).length + ' 座</span></div>';
    h += '<div class="pi-row"><span>投 产</span><span class="pi-val">' + operating + ' 座</span></div>';
    h += '<div class="pi-row"><span>施 工</span><span class="pi-val">' + constructing + ' 座</span></div>';
    if (planning > 0)   h += '<div class="pi-row"><span>选 址</span><span class="pi-val">' + planning + ' 座</span></div>';
    if (damaged > 0)    h += '<div class="pi-row pi-warn"><span>受 损</span><span class="pi-val">' + damaged + ' 座</span></div>';
    if (confiscated > 0) h += '<div class="pi-row pi-warn"><span>抄 没</span><span class="pi-val">' + confiscated + ' 座</span></div>';
    h += '<div class="pi-row"><span>产 业 估 值</span><span class="pi-val">' + totalValue + ' 两</span></div>';
    h += '<div class="pi-row"><span>豪 强</span><span class="pi-val' + (haoqiang !== 'none' ? ' pi-warn' : '') + '">' + haoqiangLabel + '</span></div>';
    h += '<div class="pi-row"><span>恶 名</span><span class="pi-val' + ((s.notoriety || 0) > 20 ? ' pi-warn' : '') + '">' + (s.notoriety || 0) + '</span></div>';
    h += '</div>';

    if (Array.isArray(s.industries) && s.industries.length) {
      h += '<div class="pi-section"><div class="pi-section-title">产 业 · 名 录</div>';
      s.industries.forEach(function (ind) {
        if (!ind) return;
        var sizeDef = SIZE_TIERS[ind.size] || { label: ind.size };
        var statusLabel = _statusLabel(ind.status);
        var val = computeIndustryValue(ind);
        var out = ind.output || { cash: 0, goods: 0 };
        h += '<div class="pi-unit">';
        h += '<div class="pi-unit-head"><span>' + (ind.typeLabel || ind.type) + ' · ' + (sizeDef.label || ind.size) + ' · Lv' + ind.level + '</span><span class="pi-val">' + statusLabel + ' · 估值 ' + val + '</span></div>';
        if (ind.location && ind.location.name) {
          h += '<div class="pi-unit-loc">地：' + ind.location.name + '</div>';
        }
        h += '<div class="pi-unit-stats">';
        if (ind.status === STATUS.OPERATING || ind.status === STATUS.DAMAGED) {
          h += '<span>月入 ' + (out.cash || 0) + ' 两</span>';
          h += '<span>月产 ' + (out.goods || 0) + ' 担</span>';
          h += '<span>用工 ' + (ind.workers.count || 0) + '/' + (ind.construction.demandWorkers || 0) + '</span>';
        } else if (ind.status === STATUS.CONSTRUCTING) {
          h += '<span>工期剩 ' + (ind.construction.remainingMonths || 0) + ' 月</span>';
          h += '<span>用工 ' + (ind.workers.count || 0) + '/' + (ind.construction.demandWorkers || 0) + '</span>';
        } else if (ind.status === STATUS.PLANNING) {
          h += '<span>待募工 ' + (ind.construction.demandWorkers || 0) + ' 人</span>';
        }
        h += '</div>';
        // 风险摘要
        if (ind.risks) {
          var riskParts = [];
          var rk = Object.keys(RISK_KINDS);
          for (var i2 = 0; i2 < rk.length; i2++) {
            var v = ind.risks[rk[i2]] || 0;
            if (v > 0.2) riskParts.push(RISK_KINDS[rk[i2]].label + ' ' + Math.round(v * 100) + '%');
          }
          if (riskParts.length) {
            h += '<div class="pi-unit-risks">风险：' + riskParts.join(' · ') + '</div>';
          }
        }
        if (ind.haoqiang) {
          h += '<div class="pi-unit-haoqiang">豪强产业·朝廷关注</div>';
        }
        h += '</div>';
      });
      h += '</div>';
    }

    if (Array.isArray(s.events) && s.events.length) {
      var recent = s.events.slice(-5);
      h += '<div class="pi-section"><div class="pi-section-title">近 事</div>';
      recent.forEach(function (e) {
        if (!e) return;
        h += '<div class="pi-row"><span class="pi-ev-kind">' + (e.kind || '') + '</span><span class="pi-ev-summary">' + (e.summary || '') + '</span></div>';
      });
      h += '</div>';
    }

    // 可选产业动作
    h += '<div class="pi-section"><div class="pi-section-title">操 作</div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:0.3rem;">';
    h += '<button class="bt bs" onclick="TM.PlayerIndustry._uiAdvanceConstruction()">推进施工</button>';
    h += '<button class="bt bs" onclick="TM.PlayerIndustry._uiOperateMonthly()">月度经营</button>';
    h += '<button class="bt bs" onclick="TM.PlayerIndustry._uiUpgrade()">升级产业</button>';
    h += '</div>';
    h += '</div>';

    h += '</div>';
    return h;
  }

  function _statusLabel(status) {
    if (status === STATUS.PLANNING) return '选址';
    if (status === STATUS.CONSTRUCTING) return '施工';
    if (status === STATUS.OPERATING) return '投产';
    if (status === STATUS.DAMAGED) return '受损';
    if (status === STATUS.CONFISCATED) return '抄没';
    if (status === STATUS.ABANDONED) return '废弃';
    return status || '—';
  }

  // ════════════════════════════════════════════════════════════
  //  §10.1 UI 钩子（2026-07-21·仿 PlayerMarriage C2 模式·让面板可玩）
  //    历史根因：renderPanel 只显示状态·玩家无法手动推进施工/经营/升级。
  //    修复：调内部 API → toast 反馈 → refreshAll 刷面板（升级用 showPrompt 收参数）。
  // ════════════════════════════════════════════════════════════
  function _refreshPanel() {
    try {
      if (global.TM && global.TM.PlayerShell && typeof global.TM.PlayerShell.refreshAll === 'function') {
        global.TM.PlayerShell.refreshAll();
      }
    } catch (_) {}
  }

  // 推进施工·对所有施工中/待开工且募工满的产业各推进 1 月
  function _uiAdvanceConstruction() {
    if (!_isTrans()) { _toast('非穿越模式'); return; }
    var s = _ensureState();
    if (!s) { _toast('产业账本未就绪'); return; }
    var advanced = 0, completed = 0, failed = 0;
    for (var i = 0; i < s.industries.length; i++) {
      var ind = s.industries[i];
      if (!ind) continue;
      if (ind.status !== STATUS.CONSTRUCTING && ind.status !== STATUS.PLANNING) continue;
      var r = advanceConstruction(ind.id, { months: 1 });
      if (r.ok) {
        advanced++;
        if (r.completed) completed++;
      } else {
        failed++;
      }
    }
    if (advanced === 0) {
      _toast('无可推进施工的产业（须先募工满·进入施工态）');
    } else {
      _toast('推进施工·' + advanced + ' 座前进 1 月' + (completed ? '·完工 ' + completed + ' 座' : '') + (failed ? '·受阻 ' + failed + ' 座' : ''));
    }
    _refreshPanel();
  }

  // 月度经营·对所有投产产业结算产出
  function _uiOperateMonthly() {
    if (!_isTrans()) { _toast('非穿越模式'); return; }
    var r = operateMonthly({});
    if (r.ok) {
      _toast('月度经营·入银 ' + (r.totalCash || 0) + ' 两·产货 ' + (r.totalGoods || 0) + ' 担·共 ' + ((r.operated && r.operated.length) || 0) + ' 座');
    } else {
      _toast('经营失败：' + (r.reason || '未知'));
    }
    _refreshPanel();
  }

  // 升级产业·showPrompt 收「类型名或ID:方式」·默认扩建
  function _uiUpgrade() {
    if (!_isTrans()) { _toast('非穿越模式'); return; }
    var s = _ensureState();
    if (!s) { _toast('产业账本未就绪'); return; }
    if (!s.industries || !s.industries.length) { _toast('尚无产业可升·先购地建产'); return; }
    if (typeof showPrompt !== 'function') {
      _toast('showPrompt 缺席·请直接调 TM.PlayerIndustry.upgrade(id, kind)');
      return;
    }
    showPrompt('产业类型名或ID:升级方式（expand 扩建 / improve 改良 / specialize 特化·默认 expand）：', '', function (input) {
      if (!input) return;
      var parts = input.split(':');
      var key = (parts[0] || '').trim();
      var kind = (parts[1] || 'expand').trim();
      if (!key) { _toast('未指定产业'); return; }
      var s2 = _ensureState();
      if (!s2) { _refreshPanel(); return; }
      // 先按 ID 查·再按 typeLabel 查
      var ind = _findIndustry(s2, key);
      if (!ind) {
        for (var i = 0; i < s2.industries.length; i++) {
          if (s2.industries[i] && s2.industries[i].typeLabel === key) { ind = s2.industries[i]; break; }
        }
      }
      if (!ind) { _toast('未找到产业：' + key); _refreshPanel(); return; }
      var r = upgrade(ind.id, kind, {});
      if (r.ok) {
        _toast((ind.typeLabel || ind.type) + ' ' + r.kindLabel + '·等级 ' + r.prevLevel + '→' + r.newLevel + '·耗银 ' + r.cost + ' 两');
      } else {
        _toast('升级失败：' + (r.reason || '未知'));
      }
      _refreshPanel();
    });
  }

  // ════════════════════════════════════════════════════════════
  //  §11 API 入口
  // ════════════════════════════════════════════════════════════

  function init() {
    var s = _ensureState();
    return !!s;
  }

  function getState() {
    var s = _getState();
    return s ? JSON.parse(JSON.stringify(s)) : null;
  }

  function getIndustries() {
    var s = _getState();
    if (!s || !Array.isArray(s.industries)) return [];
    return JSON.parse(JSON.stringify(s.industries));
  }

  function getIndustry(industryId) {
    var s = _getState();
    if (!s) return null;
    var ind = _findIndustry(s, industryId);
    return ind ? JSON.parse(JSON.stringify(ind)) : null;
  }

  function getIndustryCount() {
    var s = _getState();
    return (s && Array.isArray(s.industries)) ? s.industries.length : 0;
  }

  function listIndustryTypes() {
    return Object.keys(INDUSTRY_TYPES).map(function (k) {
      var d = INDUSTRY_TYPES[k];
      return {
        id: d.id, label: d.label, tag: d.tag, hint: d.hint,
        terrain: d.terrain.slice(), requireNear: (d.requireNear || []).slice(),
        landCost: d.landCost, buildMonths: d.buildMonths,
        workerDemand: d.workerDemand, baseOutput: { cash: d.baseOutput.cash, goods: d.baseOutput.goods }
      };
    });
  }

  function listSizeTiers() {
    return Object.keys(SIZE_TIERS).map(function (k) {
      var d = SIZE_TIERS[k];
      return { id: d.id, label: d.label, scaleMul: d.scaleMul,
               monthsAdd: d.monthsAdd, costMul: d.costMul,
               outputMul: d.outputMul, workerMul: d.workerMul };
    });
  }

  function listUpgradeKinds() {
    return Object.keys(UPGRADE_KINDS).map(function (k) {
      var d = UPGRADE_KINDS[k];
      return { id: d.id, label: d.label, hint: d.hint,
               costMul: d.costMul, monthsAdd: d.monthsAdd,
               outputMul: d.outputMul, upkeepMul: d.upkeepMul,
               workerMul: d.workerMul, levelGain: d.levelGain };
    });
  }

  function listRiskKinds() {
    return Object.keys(RISK_KINDS).map(function (k) {
      var d = RISK_KINDS[k];
      return { id: d.id, label: d.label, hint: d.hint,
               severityBase: d.severityBase, outputLoss: d.outputLoss,
               workerLoss: d.workerLoss, fixable: d.fixable };
    });
  }

  // 月度 tick = operateMonthly 等价
  function tick(ctx) {
    return operateMonthly(ctx || {});
  }

  // ════════════════════════════════════════════════════════════
  //  §12 导出命名空间
  // ════════════════════════════════════════════════════════════

  var ns = {
    // 常量
    STATUS: STATUS,
    INDUSTRY_TYPES: INDUSTRY_TYPES,
    SIZE_TIERS: SIZE_TIERS,
    UPGRADE_KINDS: UPGRADE_KINDS,
    RISK_KINDS: RISK_KINDS,
    HAOQIANG_THRESHOLDS: HAOQIANG_THRESHOLDS,
    LOCATION_TERRAINS: LOCATION_TERRAINS,

    // 生命周期
    init: init,
    getState: getState,
    getIndustries: getIndustries,
    getIndustry: getIndustry,
    getIndustryCount: getIndustryCount,

    listIndustryTypes: listIndustryTypes,
    listSizeTiers: listSizeTiers,
    listUpgradeKinds: listUpgradeKinds,
    listRiskKinds: listRiskKinds,

    // 22.4 选址建设
    surveySite: surveySite,
    acquireLand: acquireLand,
    startProject: startProject,

    // 22.5 施工建设
    recruitWorkers: recruitWorkers,
    advanceConstruction: advanceConstruction,
    completeConstruction: completeConstruction,

    // 22.6 产业经营
    operateMonthly: operateMonthly,
    computeOutput: computeOutput,
    computeIndustryValue: computeIndustryValue,

    // 22.7 产业升级
    upgrade: upgrade,

    // 22.8 产业风险
    triggerRisk: triggerRisk,
    evaluateRisks: evaluateRisks,
    listRisks: listRisks,

    // 22.9 豪强标签
    checkHaoqiang: checkHaoqiang,
    getHaoqiangLevel: getHaoqiangLevel,
    triggerConfiscation: triggerConfiscation,

    // 22.10 沿用 building-works
    isBuildingWorksAvailable: isBuildingWorksAvailable,
    applyBuildingWorksBridge: applyBuildingWorksBridge,

    // 22.11 面板
    renderPanel: renderPanel,

    // UI 钩子
    _uiAdvanceConstruction: _uiAdvanceConstruction,
    _uiOperateMonthly: _uiOperateMonthly,
    _uiUpgrade: _uiUpgrade,

    // 月度 tick
    tick: tick,

    // 内部函数暴露（smoke/调试·非游戏调用入口）
    _ensureState: _ensureState,
    _getState: _getState,
    _defaultState: _defaultState,
    _findIndustry: _findIndustry,
    _classifyTerrain: _classifyTerrain,
    _validateLocation: _validateLocation,
    _computeUpkeep: _computeUpkeep,
    _evaluateHaoqiang: _evaluateHaoqiang,
    _evaluateRisksInternal: _evaluateRisksInternal,
    _operateOne: _operateOne,
    _completeConstructionInternal: _completeConstructionInternal,
    _statusLabel: _statusLabel,
    _callLLM: _callLLM,
    _spendPlayerCash: _spendPlayerCash,
    _addPlayerCash: _addPlayerCash,
    _interactForPermit: _interactForPermit,
    _useBuildingWorks: _useBuildingWorks
  };

  // 双路径挂载：浏览器走 window.TM.PlayerIndustry；node smoke 走 module.exports
  try {
    if (typeof module !== 'undefined' && module && module.exports) {
      module.exports = ns;
    }
  } catch (_) {}
  try {
    if (global) {
      if (!global.TM) global.TM = {};
      global.TM.PlayerIndustry = ns;
    }
  } catch (_) {}
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
