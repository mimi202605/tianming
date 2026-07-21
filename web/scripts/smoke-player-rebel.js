#!/usr/bin/env node
// scripts/smoke-player-rebel.js — Phase 4.5 · Task 26 玩家反叛系统 smoke
// 验证（覆盖 13 项 SubTask + 跨朝代 + 双路径挂载）：
//   1.  命名空间：TM.PlayerRebel 暴露（双路径：globalThis + module.exports）
//   2.  守卫：非穿越模式 / 未知同盟类型 / 未知筹备类型 / 未知舆论类型 / 已举事 各拒
//   3.  反叛筹备账本（_defaultState + _ensureState + getState/getLedger/getReadiness/getPlotId/getStage）
//   4.  SubTask 26.3 contactAlly（暗中联络·secretAllies 累积 + 暴露风险 + readiness 推进）
//   5.  SubTask 26.4 prepareMaterials（扣银钱 + militaryStrength / financialResources 累积 + readiness）
//   6.  SubTask 26.5 spreadPropaganda（popularSupport 推动 + 弹劾风险 + 暴露风险）
//   7.  SubTask 26.6 launchCoup（readiness 阈值 + stage → launched + 双方战力快照）
//   8.  SubTask 26.7 resolveBattle（沿用 tm-battle-resolve.js predictBattleBand·mock 胜/败路径）
//   9.  SubTask 26.8 applyVictory（usurp 路径·playerRole → emperor + sovereign 切换 + 编年史）
//  10.  SubTask 26.9 applyDefeat（execution 路径 + 切继承人 via mock PlayerFamily.inherit）
//  11.  SubTask 26.10 courtSuppress（朝廷先发制人 + 私军自卫 useForSelfDefense）
//  12.  SubTask 26.11 checkLeak（高风险 → leakImminent + 触发先发制人）
//  13.  SubTask 26.12 renderPanel（御案"图谋"面板·HTML 字符串·朝代中立）
//  14.  SubTask 26.13 registerScenarioHook / clearScenarioHooks（剧本自定义举事条件·可阻拦）
//  15.  跨朝代铁律（grep 代码体无明清专名）
//  16.  双路径挂载（module.exports 等价 globalThis.TM.PlayerRebel）
//  17.  月度 tick（preparing/ready 阶段泄密衰减 + autoCheckLeak）

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

// ── 加载 tm-player-rebel.js（IIFE 模式，sandbox）──
function buildContext() {
  var ctx = {
    console: console,
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN,
    Set: Set, Map: Map, Promise: Promise,
    setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'tm-player-rebel.js'), 'utf8'),
    ctx, { filename: 'tm-player-rebel.js' }
  );
  return ctx;
}

// ── Mock 全局 P/GM/TM + 玩家私产 + 软依赖 ──
function setupCtx(ctx) {
  // 固定随机种子·确保招募/战力判定确定性成功（contactAlly 招募骰 < successThreshold）
  deterministicRandom(ctx);
  // 玩家：李大臣（穿越模式·minister）+ 前君主（用于 applyVictory 切换测试）
  var playerCh = { name: '李大臣', alive: true, officialTitle: '尚书', role: '臣', personality: '刚直', isPlayer: true, labels: [] };
  var sovereignCh = { name: '前君', alive: true, officialTitle: '皇帝', role: '皇帝', isEmperor: true, isPlayer: false, labels: [] };

  ctx.GM = {
    sid: 'smoke',
    turn: 10,
    chars: [playerCh, sovereignCh],
    _charInvestigations: []
  };
  ctx.P = {
    playerInfo: {
      transmigrationMode: true,
      playerRole: 'minister',
      characterName: '李大臣',
      characterTitle: '尚书',
      sovereignName: '前君',
      sovereignTitle: '皇帝',
      familyName: '李氏',
      playerEconomy: { cash: 100000, properties: [], investments: [], grayIncome: [], corruption: 0, ledger: [] }
    }
  };

  // mock TM.Transmigration
  if (!ctx.TM) ctx.TM = {};
  ctx.TM.Transmigration = {
    isTransmigrationMode: function () { return !!ctx.P.playerInfo.transmigrationMode; }
  };

  // mock TM.PlayerEconomy.spend / addCash / confiscate
  ctx._economyCalls = [];
  ctx.TM.PlayerEconomy = {
    spend: function (cost, reason) {
      ctx._economyCalls.push({ op: 'spend', cost: cost, reason: reason });
      var pe = ctx.P.playerInfo.playerEconomy;
      if (typeof pe.cash !== 'number') pe.cash = 0;
      if (pe.cash < cost) return { ok: false, reason: '银钱不足', cash: pe.cash };
      pe.cash -= cost;
      if (!Array.isArray(pe.ledger)) pe.ledger = [];
      pe.ledger.push({ kind: 'spend', delta: -cost, reason: reason });
      return { ok: true, cash: pe.cash };
    },
    addIncome: function (source, amount, opts) {
      ctx._economyCalls.push({ op: 'addIncome', source: source, amount: amount });
      var pe = ctx.P.playerInfo.playerEconomy;
      pe.cash = (pe.cash || 0) + Math.abs(amount);
      return { ok: true, cash: pe.cash };
    },
    addCash: function (n, reason) {
      ctx._economyCalls.push({ op: 'addCash', amount: n, reason: reason });
      var pe = ctx.P.playerInfo.playerEconomy;
      pe.cash = (pe.cash || 0) + n;
      return { ok: true, cash: pe.cash };
    },
    confiscate: function (opts) {
      ctx._economyCalls.push({ op: 'confiscate', opts: opts });
      var pe = ctx.P.playerInfo.playerEconomy;
      pe.cash = 0; pe.confiscated = true;
      return { ok: true };
    },
    getBalance: function () { return ctx.P.playerInfo.playerEconomy.cash; },
    getState: function () { return JSON.parse(JSON.stringify(ctx.P.playerInfo.playerEconomy)); }
  };

  // mock TM.PlayerInteraction.interact（暗中联络路径）
  ctx._interactCalls = [];
  ctx.TM.PlayerInteraction = {
    interact: function (npcName, kind, payload) {
      ctx._interactCalls.push({ npcName: npcName, kind: kind, payload: payload });
      if (ctx._interactFail) return { ok: false, reason: 'mock 拒绝' };
      return { ok: true, kind: kind, npc: npcName, scene: 'mock 暗中联络成功' };
    }
  };

  // mock TM.PlayerPrivateArmy.useForCoup / useForSelfDefense
  ctx._armyCalls = [];
  ctx.TM.PlayerPrivateArmy = {
    useForCoup: function (unitIds, opts) {
      ctx._armyCalls.push({ scenario: 'coup', unitIds: unitIds, opts: opts });
      var n = Array.isArray(unitIds) ? unitIds.length : 0;
      return { ok: true, scenario: 'coup', totalCount: n * 50, totalScore: n * 50 * 30, avgScore: 30, coupStrength: n * 1500, casualties: { total: 0 } };
    },
    useForSelfDefense: function (unitIds, opts) {
      ctx._armyCalls.push({ scenario: 'self-defense', unitIds: unitIds, opts: opts });
      var n = Array.isArray(unitIds) ? unitIds.length : 0;
      return { ok: true, scenario: 'self-defense', totalCount: n * 50, totalScore: n * 50 * 30, avgScore: 30, holdDays: n * 2, casualties: { total: 0 } };
    }
  };

  // mock TM.PlayerFamily.getChildren / inherit
  ctx._familyCalls = [];
  ctx.TM.PlayerFamily = {
    getChildren: function () {
      return [
        { name: '李长子', gender: '男', alive: true, isHeir: true, relation: 'son' },
        { name: '李次子', gender: '男', alive: true, relation: 'son' }
      ];
    },
    inherit: function (heirName, opts) {
      ctx._familyCalls.push({ heirName: heirName, opts: opts });
      // 切换玩家角色至继承人
      ctx.P.playerInfo.characterName = heirName;
      var oldPlayer = ctx.GM.chars.find(function (c) { return c && c.isPlayer === true; });
      if (oldPlayer) oldPlayer.isPlayer = false;
      var heir = ctx.GM.chars.find(function (c) { return c && c.name === heirName; });
      if (!heir) {
        heir = { name: heirName, alive: true, isPlayer: true, labels: [] };
        ctx.GM.chars.push(heir);
      }
      heir.isPlayer = true;
      return { ok: true, heirName: heirName };
    }
  };

  // mock ChronicleTracker.add
  ctx._chronicleCalls = [];
  ctx.ChronicleTracker = {
    add: function (track) {
      ctx._chronicleCalls.push(track);
      return { id: 'chronicle_' + ctx._chronicleCalls.length, ok: true };
    }
  };

  // mock _offIsSovereign（前君判定）
  ctx._offIsSovereign = function (c) {
    return !!(c && (c.role === '皇帝' || c.isEmperor === true));
  };

  // mock predictBattleBand（沿用 tm-battle-resolve.js 的接口签名）
  ctx.predictBattleBand = function (playerArmies, enemyArmies, opts) {
    opts = opts || {};
    var ps = (playerArmies || []).reduce(function (s, a) { return s + (a.soldiers || a.strength || 0); }, 0);
    var es = (enemyArmies || []).reduce(function (s, a) { return s + (a.soldiers || a.strength || 0); }, 0);
    var tot = ps + es || 1;
    var r = ps / tot;
    var winProb = (r * r) / (r * r + (1 - r) * (1 - r));
    return {
      strA: ps, strB: es, winProb: +winProb.toFixed(3),
      winner: r >= 0.5 ? 'player' : 'enemy',
      decisive: winProb >= 0.7 || winProb <= 0.3, swing: !(winProb >= 0.7 || winProb <= 0.3),
      playerLoss: { expected: +Math.max(0.03, 0.22 * (1 - r) * 2).toFixed(3), min: 0.03, max: 0.9 },
      enemyLoss:  { expected: +Math.max(0.03, 0.22 * r * 2).toFixed(3),     min: 0.03, max: 0.9 },
      k: 0.25, playerSoldiers: ps, enemySoldiers: es
    };
  };
}

function resetPlayerCash(ctx, n) {
  ctx.P.playerInfo.playerEconomy.cash = (n != null ? n : 100000);
}

// 充分筹备至 readiness ≥ 60 阈值·供需要 launchCoup 成功的测试复用
// 公式：raw = strength*0.05 + finance*0.001 + support*0.4 + allies*4
// 本 helper 累计：3 同盟（205 str / 3200 fin / 3 allies）+ 300 兵器（+360 str）
//   + 500 粮草（+100 str / +4000 fin）+ chenwei×5（+32 sup）+ xiwen×3（+33.6 sup）
//   → raw ≈ 78.7（≥ 60 阈值）
function prepForLaunch(ns) {
  ns.contactAlly('王将军', 'general', {});
  ns.contactAlly('赵大员', 'magnate', {});
  ns.contactAlly('孙豪强', 'jianghu', {});
  ns.prepareMaterials('weapons', { units: 300 });
  ns.prepareMaterials('grain', { units: 500 });
  ns.spreadPropaganda('chenwei', { spreadRadius: 5 });
  ns.spreadPropaganda('xiwen', { spreadRadius: 3 });
}

// 固定随机种子·让招募/战力判定确定性成功（contactAlly 招募骰 < successThreshold）
// _rand()=0 时·recruitRoll=0 < successThreshold（>0）→招募必成；leakGain/supportGain 仍 > 0
function deterministicRandom(ctx) {
  if (!ctx.Math.__smokeOrigRandom) {
    ctx.Math.__smokeOrigRandom = ctx.Math.random;
  }
  ctx.Math.random = function () { return 0; };
}
function restoreRandom(ctx) {
  if (ctx.Math.__smokeOrigRandom) {
    ctx.Math.random = ctx.Math.__smokeOrigRandom;
  }
}

// ── Sub-tests ───────────────────────────────────────────────

// SubTest 1: 命名空间暴露
function testNamespace(ctx) {
  setupCtx(ctx);
  assert(ctx.TM && ctx.TM.PlayerRebel, 'ns: TM.PlayerRebel 暴露');
  var ns = ctx.TM.PlayerRebel;
  // 常量
  assert(ns.STAGES && Object.keys(ns.STAGES).length === 6, 'ns: STAGES 共 6 态');
  assert(ns.ALLY_TYPES && Object.keys(ns.ALLY_TYPES).length === 3, 'ns: ALLY_TYPES 共 3 类');
  assert(ns.PREP_TYPES && Object.keys(ns.PREP_TYPES).length === 3, 'ns: PREP_TYPES 共 3 类');
  assert(ns.PROPAGANDA_TYPES && Object.keys(ns.PROPAGANDA_TYPES).length === 3, 'ns: PROPAGANDA_TYPES 共 3 类');
  assert(ns.REBEL_TYPES && Object.keys(ns.REBEL_TYPES).length === 5, 'ns: REBEL_TYPES 共 5 类');
  assert(ns.OUTCOMES && Object.keys(ns.OUTCOMES).length === 4, 'ns: OUTCOMES 共 4 项');
  assert(ns.FATE_TYPES && Object.keys(ns.FATE_TYPES).length === 3, 'ns: FATE_TYPES 共 3 项');
  assert(ns.READINESS_THRESHOLDS && typeof ns.READINESS_THRESHOLDS.ready === 'number', 'ns: READINESS_THRESHOLDS');
  assert(ns.DISCOVERY_THRESHOLDS && typeof ns.DISCOVERY_THRESHOLDS.high === 'number', 'ns: DISCOVERY_THRESHOLDS');

  // 主入口
  assert(typeof ns.init === 'function', 'ns: init 是函数');
  assert(typeof ns.getState === 'function', 'ns: getState 是函数');
  assert(typeof ns.getLedger === 'function', 'ns: getLedger 是函数');
  assert(typeof ns.getReadiness === 'function', 'ns: getReadiness 是函数');
  assert(typeof ns.getPlotId === 'function', 'ns: getPlotId 是函数');
  assert(typeof ns.getStage === 'function', 'ns: getStage 是函数');
  assert(typeof ns.listAllies === 'function', 'ns: listAllies 是函数');
  assert(typeof ns.listAllyTypes === 'function', 'ns: listAllyTypes 是函数');
  assert(typeof ns.listPrepTypes === 'function', 'ns: listPrepTypes 是函数');
  assert(typeof ns.listPropagandaTypes === 'function', 'ns: listPropagandaTypes 是函数');
  assert(typeof ns.listRebelTypes === 'function', 'ns: listRebelTypes 是函数');
  assert(typeof ns.listScenarioHooks === 'function', 'ns: listScenarioHooks 是函数');
  // SubTask 26.3-26.5
  assert(typeof ns.contactAlly === 'function', 'ns: contactAlly 是函数');
  assert(typeof ns.prepareMaterials === 'function', 'ns: prepareMaterials 是函数');
  assert(typeof ns.spreadPropaganda === 'function', 'ns: spreadPropaganda 是函数');
  // SubTask 26.6-26.7
  assert(typeof ns.launchCoup === 'function', 'ns: launchCoup 是函数');
  assert(typeof ns.resolveBattle === 'function', 'ns: resolveBattle 是函数');
  // SubTask 26.8-26.9
  assert(typeof ns.applyVictory === 'function', 'ns: applyVictory 是函数');
  assert(typeof ns.applyDefeat === 'function', 'ns: applyDefeat 是函数');
  // SubTask 26.10-26.11
  assert(typeof ns.courtSuppress === 'function', 'ns: courtSuppress 是函数');
  assert(typeof ns.checkLeak === 'function', 'ns: checkLeak 是函数');
  assert(typeof ns.evaluateRisk === 'function', 'ns: evaluateRisk 是函数');
  // SubTask 26.12
  assert(typeof ns.renderPanel === 'function', 'ns: renderPanel 是函数');
  // SubTask 26.13
  assert(typeof ns.registerScenarioHook === 'function', 'ns: registerScenarioHook 是函数');
  assert(typeof ns.clearScenarioHooks === 'function', 'ns: clearScenarioHooks 是函数');
  // tick
  assert(typeof ns.tick === 'function', 'ns: tick 是函数');

  // 5 反叛类型 label 全部就位
  var labels = Object.keys(ns.REBEL_TYPES).map(function (k) { return ns.REBEL_TYPES[k].label; });
  ['宗室夺嫡', '诸侯起兵', '权臣篡位', '边将叛乱', '农民起义'].forEach(function (lbl) {
    assert(labels.indexOf(lbl) >= 0, 'ns: REBEL_TYPES 含 ' + lbl);
  });
  // 3 命运 label
  var fateLabels = Object.keys(ns.FATE_TYPES).map(function (k) { return ns.FATE_TYPES[k].label; });
  ['处决', '流放', '族诛'].forEach(function (lbl) {
    assert(fateLabels.indexOf(lbl) >= 0, 'ns: FATE_TYPES 含 ' + lbl);
  });
}

// SubTest 2: 守卫
function testGuards(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerRebel;

  // 非穿越模式·全部主入口拒绝
  ctx.P.playerInfo.transmigrationMode = false;
  var r1a = ns.contactAlly('张三', 'general', {});
  assert(r1a.ok === false && /非穿越模式/.test(r1a.reason), 'guard: 非穿越模式 contactAlly 拒绝');
  var r1b = ns.prepareMaterials('weapons', { units: 1 });
  assert(r1b.ok === false && /非穿越模式/.test(r1b.reason), 'guard: 非穿越模式 prepareMaterials 拒绝');
  var r1c = ns.spreadPropaganda('tongyao', {});
  assert(r1c.ok === false && /非穿越模式/.test(r1c.reason), 'guard: 非穿越模式 spreadPropaganda 拒绝');
  var r1d = ns.launchCoup({});
  assert(r1d.ok === false && /非穿越模式/.test(r1d.reason), 'guard: 非穿越模式 launchCoup 拒绝');
  var r1e = ns.resolveBattle({});
  assert(r1e.ok === false && /非穿越模式/.test(r1e.reason), 'guard: 非穿越模式 resolveBattle 拒绝');
  var r1f = ns.applyVictory({});
  assert(r1f.ok === false && /非穿越模式/.test(r1f.reason), 'guard: 非穿越模式 applyVictory 拒绝');
  var r1g = ns.applyDefeat({});
  assert(r1g.ok === false && /非穿越模式/.test(r1g.reason), 'guard: 非穿越模式 applyDefeat 拒绝');
  var r1h = ns.courtSuppress({});
  assert(r1h.ok === false && /非穿越模式/.test(r1h.reason), 'guard: 非穿越模式 courtSuppress 拒绝');
  var r1i = ns.checkLeak({});
  assert(r1i.ok === false && /非穿越模式/.test(r1i.reason), 'guard: 非穿越模式 checkLeak 拒绝');
  ctx.P.playerInfo.transmigrationMode = true;

  // 未知类型
  var r2 = ns.contactAlly('张三', 'bogus', {});
  assert(r2.ok === false && /未知同盟类型/.test(r2.reason), 'guard: 未知同盟类型拒绝');
  var r3 = ns.prepareMaterials('bogus', { units: 1 });
  assert(r3.ok === false && /未知筹备类型/.test(r3.reason), 'guard: 未知筹备类型拒绝');
  var r4 = ns.spreadPropaganda('bogus', {});
  assert(r4.ok === false && /未知舆论类型/.test(r4.reason), 'guard: 未知舆论类型拒绝');

  // 缺 NPC 名
  var r5 = ns.contactAlly('', 'general', {});
  assert(r5.ok === false && /未指定 NPC/.test(r5.reason), 'guard: 缺 NPC 拒绝');

  // 银钱不足
  resetPlayerCash(ctx, 5);
  var r6 = ns.prepareMaterials('weapons', { units: 10 });
  assert(r6.ok === false && /银钱不足/.test(r6.reason), 'guard: 银钱不足 prepareMaterials 拒绝');
  resetPlayerCash(ctx, 5);
  var r7 = ns.spreadPropaganda('xiwen', { spreadRadius: 5 });
  assert(r7.ok === false && /银钱不足/.test(r7.reason), 'guard: 银钱不足 spreadPropaganda 拒绝');

  // 筹备度不足·不可举事
  resetPlayerCash(ctx, 100000);
  var r8 = ns.launchCoup({});
  assert(r8.ok === false && /筹备度不足/.test(r8.reason), 'guard: 筹备度不足 launchCoup 拒绝');

  // 未处交战状态·不可结算
  var r9 = ns.resolveBattle({});
  assert(r9.ok === false && /未处交战状态/.test(r9.reason), 'guard: 非 launched 状态 resolveBattle 拒绝');

  // 反叛已胜利·不可走败后
  // 先 mock 进入胜利态
  var st = ns._ensureState();
  st.stage = ns.STAGES.SUCCEEDED; st.readiness = 80;
  var r10 = ns.applyDefeat({});
  assert(r10.ok === false && /已胜利/.test(r10.reason), 'guard: 胜利后 applyDefeat 拒绝');
}

// SubTest 3: 反叛筹备账本（SubTask 26.2）
function testLedgerInit(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerRebel;

  // _defaultState 字段完整
  var d = ns._defaultState();
  assert(d.stage === 'dormant', 'ledger: 默认 stage=dormant');
  assert(d.readiness === 0, 'ledger: 默认 readiness=0');
  assert(Array.isArray(d.secretAllies) && d.secretAllies.length === 0, 'ledger: 默认 secretAllies=[]');
  assert(d.militaryStrength === 0, 'ledger: 默认 militaryStrength=0');
  assert(d.financialResources === 0, 'ledger: 默认 financialResources=0');
  assert(d.popularSupport === 0, 'ledger: 默认 popularSupport=0');
  assert(d.discovered === 0, 'ledger: 默认 discovered=0');
  assert(Array.isArray(d.events), 'ledger: 默认 events=[]');
  assert(Array.isArray(d.scenarioHooks), 'ledger: 默认 scenarioHooks=[]');
  assert(/^plot_/.test(d.plotId), 'ledger: plotId 前缀 plot_');

  // init 创建账本
  assert(ns.init() === true, 'ledger: init 返回 true');
  assert(!!ctx.GM._playerRebel, 'ledger: GM._playerRebel 已挂载');

  // 查询接口
  var s = ns.getState();
  assert(s && s.stage === 'dormant', 'ledger: getState.stage=dormant');
  assert(ns.getLedger() && ns.getLedger().stage === 'dormant', 'ledger: getLedger 等价 getState');
  assert(ns.getReadiness() === 0, 'ledger: getReadiness=0');
  assert(/^plot_/.test(ns.getPlotId()), 'ledger: getPlotId 形如 plot_*');
  assert(ns.getStage() === 'dormant', 'ledger: getStage=dormant');

  // _ensureState 幂等
  var s1 = ns._ensureState();
  var s2 = ns._ensureState();
  assert(s1 === s2, 'ledger: _ensureState 幂等（同一引用）');

  // listAllyTypes / listPrepTypes / listPropagandaTypes / listRebelTypes
  var ats = ns.listAllyTypes();
  assert(Array.isArray(ats) && ats.length === 3, 'ledger: listAllyTypes 3 项');
  ats.forEach(function (a) {
    assert(a.id && a.label && typeof a.strengthGain === 'number', 'ledger: 同盟条目字段齐');
  });
  var pts = ns.listPrepTypes();
  assert(Array.isArray(pts) && pts.length === 3, 'ledger: listPrepTypes 3 项');
  var pgs = ns.listPropagandaTypes();
  assert(Array.isArray(pgs) && pgs.length === 3, 'ledger: listPropagandaTypes 3 项');
  var rts = ns.listRebelTypes();
  assert(Array.isArray(rts) && rts.length === 5, 'ledger: listRebelTypes 5 项');
  rts.forEach(function (r) {
    assert(r.id && r.label && typeof r.victoryThreshold === 'number', 'ledger: 反叛类型条目字段齐');
  });

  // listAllies 初始空
  assert(Array.isArray(ns.listAllies()) && ns.listAllies().length === 0, 'ledger: listAllies 初始空');
}

// SubTest 4: SubTask 26.3 contactAlly（暗中联络）
function testContactAlly(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerRebel;
  resetPlayerCash(ctx, 100000);

  // 联络禁军将领
  var r1 = ns.contactAlly('王将军', 'general', {});
  assert(r1.ok === true, 'contact: 王将军(禁军将领) 入同盟');
  assert(r1.ally && r1.ally.name === '王将军', 'contact: ally.name 王将军');
  assert(r1.ally.type === 'general', 'contact: ally.type general');
  assert(r1.leakGain > 0, 'contact: 暴露风险 >0');
  assert(r1.readinessGain > 0, 'contact: readiness 增长');

  // 同盟入账
  var s = ns.getState();
  assert(s.secretAllies.length === 1, 'contact: secretAllies +1');
  assert(s.militaryStrength > 0, 'contact: militaryStrength 累积');
  assert(s.financialResources > 0, 'contact: financialResources 累积');
  assert(s.discovered > 0, 'contact: discovered 累积');

  // 首次筹备动作·stage dormant → preparing
  assert(s.stage === 'preparing' || s.stage === 'ready', 'contact: stage 从 dormant 进入 preparing/ready');

  // 重复 NPC 不可再联络
  var r2 = ns.contactAlly('王将军', 'general', {});
  assert(r2.ok === false && /已是同盟/.test(r2.reason), 'contact: 重复 NPC 拒绝');

  // 联络地方大员 + 江湖豪强
  var r3 = ns.contactAlly('赵大员', 'magnate', {});
  assert(r3.ok === true, 'contact: 赵大员(magnate) 入同盟');
  var r4 = ns.contactAlly('孙豪强', 'jianghu', {});
  assert(r4.ok === true, 'contact: 孙豪强(jianghu) 入同盟');

  // PlayerInteraction.interact 被调用 4 次（含 1 次失败重试）
  assert(ctx._interactCalls.length >= 3, 'contact: TM.PlayerInteraction.interact 被调用 ≥3 次');

  // interact 失败路径
  ctx._interactFail = true;
  var r5 = ns.contactAlly('钱将军', 'general', {});
  assert(r5.ok === false, 'contact: interact 失败时 contactAlly 失败');
  assert(r5.leakGain > 0, 'contact: 失败仍累计少量泄密');
  ctx._interactFail = false;

  // 已是同盟名录
  var allies = ns.listAllies();
  assert(allies.length === 3, 'contact: listAllies 3 人');
}

// SubTest 5: SubTask 26.4 prepareMaterials（筹备物资）
function testPrepareMaterials(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerRebel;
  resetPlayerCash(ctx, 100000);

  var cashBefore = ctx.P.playerInfo.playerEconomy.cash;

  // 筹备兵器
  var r1 = ns.prepareMaterials('weapons', { units: 10 });
  assert(r1.ok === true, 'prep: weapons ×10 成功');
  assert(r1.cost === 10 * 12, 'prep: cost=10×12=120');
  assert(r1.strengthGain > 0, 'prep: strengthGain >0');
  assert(r1.units === 10, 'prep: units=10');

  // 玩家银钱扣减
  var cashAfter = ctx.P.playerInfo.playerEconomy.cash;
  assert(cashAfter === cashBefore - 120, 'prep: 玩家银钱扣 120');

  // 账本累积
  var s = ns.getState();
  assert(s.militaryStrength > 0, 'prep: militaryStrength 累积');
  assert(s.discovered > 0, 'prep: 暴露风险累积');
  assert(s.readiness > 0, 'prep: readiness 累积');

  // 筹备粮草
  var r2 = ns.prepareMaterials('grain', { units: 20 });
  assert(r2.ok === true, 'prep: grain ×20 成功');
  assert(r2.financeGain > 0, 'prep: grain 的 financeGain >0');

  // 筹备军资（amount 推算 units）
  var r3 = ns.prepareMaterials('silver', { amount: 50 });
  assert(r3.ok === true, 'prep: silver amount=50 成功');
  assert(r3.units >= 50, 'prep: silver 按 amount 推 units');

  // 默认 units=1
  var r4 = ns.prepareMaterials('weapons', {});
  assert(r4.ok === true && r4.units === 1, 'prep: 默认 units=1');

  // TM.PlayerEconomy.spend 被调用 ≥4 次
  var spendCalls = ctx._economyCalls.filter(function (c) { return c.op === 'spend'; });
  assert(spendCalls.length >= 4, 'prep: TM.PlayerEconomy.spend 调用 ≥4 次');
}

// SubTest 6: SubTask 26.5 spreadPropaganda（制造舆论）
function testSpreadPropaganda(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerRebel;
  resetPlayerCash(ctx, 100000);

  var cashBefore = ctx.P.playerInfo.playerEconomy.cash;

  // 散发童谣
  var r1 = ns.spreadPropaganda('tongyao', { spreadRadius: 2 });
  assert(r1.ok === true, 'prop: tongyao ×2 成功');
  assert(r1.cost === 100 * 2, 'prop: cost=100×2=200');
  assert(r1.supportGain > 0, 'prop: supportGain >0');
  assert(r1.leakGain > 0, 'prop: 暴露风险 >0');
  assert(r1.impeachmentRisk >= 0 && r1.impeachmentRisk <= 1, 'prop: impeachmentRisk ∈ [0,1]');

  // 玩家银钱扣减
  assert(ctx.P.playerInfo.playerEconomy.cash === cashBefore - 200, 'prop: 玩家银钱扣 200');

  // 账本民心累积
  var s = ns.getState();
  assert(s.popularSupport > 0, 'prop: popularSupport 累积');

  // 谶纬（更高弹劾风险）
  var r2 = ns.spreadPropaganda('chenwei', { spreadRadius: 1 });
  assert(r2.ok === true, 'prop: chenwei 成功');
  assert(r2.impeachmentRisk > r1.impeachmentRisk || r2.leakGain > r1.leakGain, 'prop: chenwei 风险 ≥ tongyao');

  // 檄文（最高弹劾风险 + 暴露）
  var r3 = ns.spreadPropaganda('xiwen', { spreadRadius: 3 });
  assert(r3.ok === true, 'prop: xiwen ×3 成功');
  // 檄文的 leakRisk=0.30 高于童谣 0.08
  assert(ns.PROPAGANDA_TYPES.xiwen.leakRisk > ns.PROPAGANDA_TYPES.tongyao.leakRisk, 'prop: xiwen.leakRisk > tongyao.leakRisk');

  // spreadRadius 范围限制 1-5
  var r4 = ns.spreadPropaganda('tongyao', { spreadRadius: 100 });
  assert(r4.ok === true && r4.spreadRadius === 5, 'prop: spreadRadius 上限 5');
  var r5 = ns.spreadPropaganda('tongyao', { spreadRadius: 0 });
  assert(r5.ok === true && r5.spreadRadius === 1, 'prop: spreadRadius 下限 1');

  // 多次散发累积民心
  var supportAfter = ns.getState().popularSupport;
  assert(supportAfter > 5, 'prop: 多次散发民心累积 > 5');
}

// SubTest 7: SubTask 26.6 launchCoup（举事）
function testLaunchCoup(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerRebel;
  resetPlayerCash(ctx, 100000);

  // 筹备至 ready
  prepForLaunch(ns);

  var ready = ns.getReadiness();
  assert(ready >= ns.READINESS_THRESHOLDS.ready, 'launch: 筹备度达阈值（' + ready + ' ≥ ' + ns.READINESS_THRESHOLDS.ready + '）');

  // 举事
  var r = ns.launchCoup({ unitIds: ['u1', 'u2'] });
  assert(r.ok === true, 'launch: 举事成功');
  assert(r.stage === 'launched', 'launch: stage=launched');
  assert(r.rebelType && ns.REBEL_TYPES[r.rebelType], 'launch: rebelType 已设');
  assert(r.rebelLabel && r.rebelLabel.length > 0, 'launch: rebelLabel 就位');
  assert(typeof r.playerForce === 'number' && r.playerForce > 0, 'launch: playerForce >0');
  assert(typeof r.courtForce === 'number' && r.courtForce > 0, 'launch: courtForce >0');

  // 私军 useForCoup 被调用
  var coupCalls = ctx._armyCalls.filter(function (c) { return c.scenario === 'coup'; });
  assert(coupCalls.length === 1, 'launch: useForCoup 调用 1 次');

  // 账本 stage 切换
  var s = ns.getState();
  assert(s.stage === 'launched', 'launch: getState.stage=launched');
  assert(s.launchedAt != null, 'launch: launchedAt 已设');

  // 编年史写入
  assert(ctx._chronicleCalls.length >= 1, 'launch: ChronicleTracker.add 调用 ≥1 次');
  var cr = ctx._chronicleCalls[0];
  assert(cr.category === '反叛', 'launch: chronicle.category=反叛');
  assert(/举事/.test(cr.title), 'launch: chronicle.title 含"举事"');

  // 已举事·不可再次举事
  var r2 = ns.launchCoup({});
  assert(r2.ok === false && /已举事/.test(r2.reason), 'launch: 已举事不可再举');
}

// SubTest 8: SubTask 26.7 resolveBattle（交战判定）
function testResolveBattle(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerRebel;
  resetPlayerCash(ctx, 100000);

  // 准备并举事
  prepForLaunch(ns);
  var launchR = ns.launchCoup({});
  assert(launchR.ok === true, 'battle: 举事前置完成');

  // 胜利路径（mockWinProb=0.9）
  var r1 = ns.resolveBattle({ mockWinProb: 0.9 });
  assert(r1.ok === true, 'battle: resolveBattle ok');
  assert(r1.winner === 'player', 'battle: mockWinProb=0.9 → player 胜');
  assert(r1.winProb === 0.9, 'battle: winProb=0.9');
  assert(typeof r1.playerLossRate === 'number' && r1.playerLossRate > 0, 'battle: playerLossRate >0');
  assert(typeof r1.enemyLossRate === 'number' && r1.enemyLossRate > 0, 'battle: enemyLossRate >0');
  assert(r1.fate === 'victorious', 'battle: fate=victorious');

  // 战役缓存
  var s = ns.getState();
  assert(s.lastBattle && s.lastBattle.winner === 'player', 'battle: lastBattle 缓存 winner=player');

  // 失败路径（mockWinProb=0.1）
  // 重置 stage 为 launched 以再次结算
  var st = ns._ensureState();
  st.stage = ns.STAGES.LAUNCHED;
  var r2 = ns.resolveBattle({ mockWinProb: 0.1 });
  assert(r2.ok === true, 'battle: resolveBattle 2 ok');
  assert(r2.winner === 'enemy', 'battle: mockWinProb=0.1 → enemy 胜');
  assert(r2.fate === 'defeated', 'battle: fate=defeated');

  // strategy 修正：aggressive 双方伤亡更大
  var st2 = ns._ensureState();
  st2.stage = ns.STAGES.LAUNCHED;
  var r3 = ns.resolveBattle({ mockWinProb: 0.5, strategy: 'aggressive' });
  assert(r3.ok === true, 'battle: aggressive strategy ok');

  // predictBattleBand 被调用（mock 注入）
  // 注：mockWinProb 路径不走 predictBattleBand·改测一次不传 mockWinProb 走 predictBattleBand
  var st3 = ns._ensureState();
  st3.stage = ns.STAGES.LAUNCHED;
  var r4 = ns.resolveBattle({ playerForce: 1500, courtForce: 500 });
  assert(r4.ok === true, 'battle: 显式传 playerForce/courtForce ok');
  assert(r4.playerForce === 1500, 'battle: playerForce 透传 1500');
  assert(r4.courtForce === 500, 'battle: courtForce 透传 500');
  // r=1500/(1500+500)=0.75 → winProb 锐化后 > 0.9 → player 胜
  assert(r4.winner === 'player', 'battle: 1500 vs 500 → player 胜');
}

// SubTest 9: SubTask 26.8 applyVictory（胜后·玩家登基）
function testApplyVictory(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerRebel;
  resetPlayerCash(ctx, 100000);

  // 筹备 + 举事 + 胜利结算
  prepForLaunch(ns);
  ns.launchCoup({});
  var br = ns.resolveBattle({ mockWinProb: 0.95 });
  assert(br.winner === 'player', 'victory: 前置战胜');

  // usurp 路径·玩家登基
  var r = ns.applyVictory({ path: 'usurp' });
  assert(r.ok === true, 'victory: applyVictory usurp ok');
  assert(r.outcome === ns.OUTCOMES.VICTORY, 'victory: outcome=VICTORY');
  assert(r.path === 'usurp', 'victory: path=usurp');
  assert(r.newRole === 'emperor', 'victory: newRole=emperor');
  assert(r.sovereignChanged === true, 'victory: sovereignChanged=true');

  // P.playerInfo 切换
  assert(ctx.P.playerInfo.playerRole === 'emperor', 'victory: playerRole → emperor');
  assert(ctx.P.playerInfo.transmigrationMode === false, 'victory: transmigrationMode → false（切回皇帝模式）');
  assert(ctx.P.playerInfo.sovereignName === '李大臣', 'victory: sovereignName → 玩家名');

  // 玩家角色字段
  var pc = ctx.GM.chars.find(function (c) { return c.name === '李大臣'; });
  assert(pc.isEmperor === true, 'victory: 玩家 isEmperor=true');
  assert(pc.role === '皇帝', 'victory: 玩家 role=皇帝');
  assert(pc.labels.indexOf('篡位者') >= 0, 'victory: 玩家 labels 含"篡位者"');

  // 前君被废
  var sov = ctx.GM.chars.find(function (c) { return c.name === '前君'; });
  assert(sov.isEmperor === false, 'victory: 前君 isEmperor=false');
  assert(sov.role === '前君', 'victory: 前君 role=前君');
  assert(sov.labels.indexOf('废帝') >= 0, 'victory: 前君 labels 含"废帝"');

  // 账本 stage=succeeded
  var s = ns.getState();
  assert(s.stage === 'succeeded', 'victory: stage=succeeded');
  assert(s.outcome === ns.OUTCOMES.VICTORY, 'victory: outcome=VICTORY');
  assert(s.victoryResult && s.victoryResult.path === 'usurp', 'victory: victoryResult 缓存');

  // 编年史写入
  var vCr = ctx._chronicleCalls.filter(function (c) { return /新朝|篡位/.test(c.title || ''); });
  assert(vCr.length >= 1, 'victory: chronicle 含"新朝建立"或"篡位"');

  // puppet 路径（另开 ctx 测试）
  setupCtx(ctx);
  ns = ctx.TM.PlayerRebel;
  resetPlayerCash(ctx, 100000);
  prepForLaunch(ns);
  ns.launchCoup({});
  ns.resolveBattle({ mockWinProb: 0.95 });
  var r2 = ns.applyVictory({ path: 'puppet', puppetName: '幼主' });
  assert(r2.ok === true, 'victory: puppet path ok');
  assert(r2.newRole === 'regent', 'victory: puppet newRole=regent');
  assert(r2.puppetName === '幼主', 'victory: puppetName=幼主');
  assert(ctx.P.playerInfo.playerRole === 'regent', 'victory: playerRole=regent');
  assert(ctx.P.playerInfo.sovereignName === '幼主', 'victory: sovereignName=幼主（傀儡）');
  // transmigrationMode 仍为 true（puppet 不切回皇帝模式）
  assert(ctx.P.playerInfo.transmigrationMode === true, 'victory: puppet 仍处穿越模式');
  // GM.regentState 标记
  assert(ctx.GM.regentState && ctx.GM.regentState.regentName === '李大臣', 'victory: GM.regentState.regentName');
  assert(ctx.GM.regentState.puppetSovereign === '幼主', 'victory: GM.regentState.puppetSovereign');
}

// SubTest 10: SubTask 26.9 applyDefeat（败后·切继承人）
function testApplyDefeat(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerRebel;
  resetPlayerCash(ctx, 100000);

  // 筹备 + 举事 + 失败结算
  prepForLaunch(ns);
  ns.launchCoup({});
  ns.resolveBattle({ mockWinProb: 0.05 });

  // execution + 切继承人
  var r = ns.applyDefeat({ fate: 'execution', switchToHeir: true });
  assert(r.ok === true, 'defeat: applyDefeat ok');
  assert(r.fate === 'execution', 'defeat: fate=execution');
  assert(r.playerDied === true, 'defeat: playerDied=true');
  assert(r.heirSwitched === true, 'defeat: heirSwitched=true');
  assert(r.heirName === '李长子', 'defeat: heirName=李长子（isHeir 优先）');
  assert(r.gameover === false, 'defeat: 切继承人后非 gameover');

  // TM.PlayerFamily.inherit 被调用
  assert(ctx._familyCalls.length === 1, 'defeat: PlayerFamily.inherit 调用 1 次');
  assert(ctx._familyCalls[0].heirName === '李长子', 'defeat: inherit heirName=李长子');
  assert(ctx._familyCalls[0].opts.switchToHeir === true, 'defeat: inherit opts.switchToHeir=true');

  // 玩家角色已死
  var pc = ctx.GM.chars.find(function (c) { return c.name === '李大臣'; });
  assert(pc.alive === false, 'defeat: 玩家 alive=false');
  assert(pc.isPlayer === false, 'defeat: 玩家 isPlayer=false（让出标记）');
  assert(pc.labels.indexOf('反贼') >= 0, 'defeat: 玩家 labels 含"反贼"');

  // 私产抄没
  assert(ctx.P.playerInfo.playerEconomy.cash === 0, 'defeat: 私产抄没 cash=0');
  assert(ctx.P.playerInfo.playerEconomy.confiscated === true, 'defeat: confiscated=true');

  // 玩家信息已切到继承人
  assert(ctx.P.playerInfo.characterName === '李长子', 'defeat: P.playerInfo.characterName=李长子');
  assert(ctx.P.playerInfo.transmigrationMode === true, 'defeat: 仍处穿越模式（继志）');

  // 账本 stage=suppressed
  var s = ns.getState();
  assert(s.stage === 'suppressed', 'defeat: stage=suppressed');
  assert(s.outcome === ns.OUTCOMES.DEFEAT, 'defeat: outcome=DEFEAT');
  assert(s.defeatResult && s.defeatResult.fate === 'execution', 'defeat: defeatResult.fate=execution');

  // 编年史写入
  var dCr = ctx._chronicleCalls.filter(function (c) { return /反叛失败/.test(c.title || ''); });
  assert(dCr.length >= 1, 'defeat: chronicle 含"反叛失败"');

  // family_exterminate 路径·继承人同诛·强制 gameover
  setupCtx(ctx);
  ns = ctx.TM.PlayerRebel;
  resetPlayerCash(ctx, 100000);
  prepForLaunch(ns);
  ns.launchCoup({});
  ns.resolveBattle({ mockWinProb: 0.05 });
  var r2 = ns.applyDefeat({ fate: 'family_exterminate', switchToHeir: true });
  assert(r2.ok === true, 'defeat: family_exterminate ok');
  assert(r2.gameover === true, 'defeat: 族诛 → gameover=true');
  assert(r2.heirSwitched === false, 'defeat: 族诛不可切继承人');

  // exile 路径
  setupCtx(ctx);
  ns = ctx.TM.PlayerRebel;
  resetPlayerCash(ctx, 100000);
  prepForLaunch(ns);
  ns.launchCoup({});
  ns.resolveBattle({ mockWinProb: 0.05 });
  var r3 = ns.applyDefeat({ fate: 'exile', switchToHeir: false });
  assert(r3.ok === true, 'defeat: exile ok');
  assert(r3.fate === 'exile', 'defeat: fate=exile');
  assert(r3.playerDied === false, 'defeat: exile 不死');
  assert(r3.gameover === true, 'defeat: 不切继承人 → gameover=true');
  // 流亡状态字段
  assert(ctx.P.playerInfo.fugitiveState && ctx.P.playerInfo.fugitiveState.cause === 'rebel_defeat', 'defeat: fugitiveState.cause=rebel_defeat');
}

// SubTest 11: SubTask 26.10 courtSuppress（朝廷镇压）
function testCourtSuppress(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerRebel;
  resetPlayerCash(ctx, 100000);

  // 玩家筹备中·朝廷先发制人
  ns.contactAlly('王将军', 'general', {});
  ns.prepareMaterials('weapons', { units: 50 });

  var stageBefore = ns.getStage();
  assert(stageBefore === 'preparing' || stageBefore === 'ready', 'suppress: 筹备阶段');

  // 朝廷镇压·玩家用私军自卫
  var r = ns.courtSuppress({ unitIds: ['u1', 'u2', 'u3'], mockWinProb: 0.6 });
  assert(r.ok === true, 'suppress: courtSuppress ok');
  assert(typeof r.suppressed === 'boolean', 'suppress: suppressed 是 boolean');
  assert(r.battle && typeof r.battle.winProb === 'number', 'suppress: battle 字段齐');
  assert(r.battle.winner === 'player' || r.battle.winner === 'enemy', 'suppress: winner ∈ {player,enemy}');

  // 私军 useForSelfDefense 被调用
  var sdCalls = ctx._armyCalls.filter(function (c) { return c.scenario === 'self-defense'; });
  assert(sdCalls.length === 1, 'suppress: useForSelfDefense 调用 1 次');
  assert(sdCalls[0].unitIds.length === 3, 'suppress: unitIds 透传 3 个');

  // stage 切换到 launched
  var s = ns.getState();
  assert(s.stage === 'launched', 'suppress: stage → launched');
  assert(s.lastBattle && s.lastBattle.strategy === 'court-suppress', 'suppress: lastBattle.strategy=court-suppress');

  // 朝廷先发制人加成 1.15
  // courtForce = base * 1.15·可对比无加成的 _computeCourtForce
  setupCtx(ctx);
  ns = ctx.TM.PlayerRebel;
  resetPlayerCash(ctx, 100000);
  ns.contactAlly('王将军', 'general', {});
  ns.prepareMaterials('weapons', { units: 50 });
  var baseCourt = ns._computeCourtForce(ns._ensureState(), {});
  var r2 = ns.courtSuppress({ suppressForce: 1000 });
  // 用户传入 suppressForce 时直接用（不再加 1.15·但 1.15 仍应用）
  assert(r2.battle.courtForce === Math.round(1000 * 1.15), 'suppress: courtForce = 1000 × 1.15（先发制人加成）');
}

// SubTest 12: SubTask 26.11 checkLeak（泄密风险）
function testCheckLeak(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerRebel;
  resetPlayerCash(ctx, 100000);

  // 低风险·不触发
  ns.contactAlly('孙豪强', 'jianghu', {});  // jianghu.leakRisk=0.06·低
  var r1 = ns.checkLeak({});
  assert(r1.ok === true, 'leak: 低风险 checkLeak ok');
  assert(typeof r1.leakImminent === 'boolean', 'leak: leakImminent 是 boolean');
  assert(typeof r1.discoveryLevel === 'string', 'leak: discoveryLevel 是 string');
  assert(r1.triggered === false || r1.triggered === true, 'leak: triggered 是 boolean');

  // 高风险·强制触发先发制人
  setupCtx(ctx);
  ns = ctx.TM.PlayerRebel;
  resetPlayerCash(ctx, 100000);
  // 拉高泄密度：大量散发檄文
  ns.spreadPropaganda('xiwen', { spreadRadius: 5 });
  ns.spreadPropaganda('xiwen', { spreadRadius: 5 });
  ns.spreadPropaganda('xiwen', { spreadRadius: 5 });
  // 拉高筹备度
  ns.contactAlly('王将军', 'general', {});
  ns.contactAlly('赵大员', 'magnate', {});
  ns.prepareMaterials('weapons', { units: 100 });

  var s = ns._ensureState();
  // 强制设到 high_alert + 高泄密
  s.discovered = 75; s.readiness = 85;

  var r2 = ns.checkLeak({ force: true });
  assert(r2.ok === true, 'leak: 高风险 force=true ok');
  assert(r2.leakImminent === true, 'leak: 高风险 leakImminent=true');
  assert(r2.discoveryLevel === 'critical', 'leak: discoveryLevel=critical');
  assert(r2.courtAction === 'suppress', 'leak: courtAction=suppress');
  assert(r2.triggered === true, 'leak: triggered=true（force 触发先发制人）');
  assert(r2.suppressResult && r2.suppressResult.ok === true, 'leak: suppressResult.ok=true');

  // evaluateRisk 对外暴露等价
  var risk = ns.evaluateRisk();
  assert(risk.ok === true, 'leak: evaluateRisk ok');
  assert(typeof risk.readiness === 'number', 'leak: evaluateRisk.readiness');
  assert(typeof risk.discovered === 'number', 'leak: evaluateRisk.discovered');
  assert(typeof risk.allyCount === 'number', 'leak: evaluateRisk.allyCount');
}

// SubTest 13: SubTask 26.12 renderPanel（御案"图谋"面板）
function testRenderPanel(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerRebel;
  resetPlayerCash(ctx, 100000);

  // 空状态面板
  var html0 = ns.renderPanel();
  assert(typeof html0 === 'string' && html0.length > 0, 'panel: 空状态返回非空字符串');
  assert(/pr-panel/.test(html0), 'panel: 含 pr-panel 类');
  assert(/图 谋 · 概 览/.test(html0), 'panel: 含"图 谋 · 概 览"段');
  assert(/未启动/.test(html0), 'panel: 含 stage=未启动');

  // 筹备 + 举事后面板
  prepForLaunch(ns);
  ns.launchCoup({});
  ns.resolveBattle({ mockWinProb: 0.6 });

  var html = ns.renderPanel();
  assert(typeof html === 'string' && html.length > 0, 'panel: 举事后返回非空字符串');
  assert(/pr-panel/.test(html), 'panel: 含 pr-panel 类');
  assert(/图 谋 · 概 览/.test(html), 'panel: 含"概 览"段');
  assert(/图 谋 · 同 盟/.test(html), 'panel: 含"同 盟"段');
  assert(/图 谋 · 风 险/.test(html), 'panel: 含"风 险"段');
  assert(/图 谋 · 战 役/.test(html), 'panel: 含"战 役"段');
  assert(/图 谋 · 近 事/.test(html), 'panel: 含"近 事"段');
  assert(/王将军/.test(html), 'panel: 含"王将军"');
  assert(/禁军将领/.test(html), 'panel: 含"禁军将领"');
  assert(/筹备度|筹 备 度/.test(html), 'panel: 含"筹备度"');
  assert(/泄密度|泄 密 度/.test(html), 'panel: 含"泄密度"');

  // 朝代中立·不含明清专名
  assert(!/锦衣卫|司礼监|东厂|西厂|军机处|内阁|票拟|廷杖|八股/.test(html), 'panel: 不含明清专名');
  assert(!/巡按|总督|巡抚|郡王|藩王/.test(html), 'panel: 不含地方/宗藩专名');

  // 胜利后面板
  setupCtx(ctx);
  ns = ctx.TM.PlayerRebel;
  resetPlayerCash(ctx, 100000);
  prepForLaunch(ns);
  ns.launchCoup({});
  ns.resolveBattle({ mockWinProb: 0.95 });
  ns.applyVictory({ path: 'usurp' });
  var html2 = ns.renderPanel();
  assert(/反叛成功|胜 利/.test(html2), 'panel: 胜利后含"反叛成功"或"胜利"');
}

// SubTest 14: SubTask 26.13 registerScenarioHook（跨朝代剧本 hook）
function testScenarioHooks(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerRebel;
  resetPlayerCash(ctx, 100000);

  // 注册 hook
  var hookCalls = [];
  var r1 = ns.registerScenarioHook('祥瑞降临', function (c) {
    hookCalls.push({ name: '祥瑞降临', ctx: c });
    if (c.readiness < 70) return { ok: false, reason: '祥瑞未现·须筹备度 ≥70' };
    return { ok: true };
  }, { phase: 'preLaunch' });
  assert(r1.ok === true, 'hook: 注册 ok');
  assert(r1.hook && r1.hook.name === '祥瑞降临', 'hook: hook.name=祥瑞降临');

  // listScenarioHooks
  var hooks = ns.listScenarioHooks();
  assert(Array.isArray(hooks) && hooks.length === 1, 'hook: listScenarioHooks 1 项');
  assert(hooks[0].name === '祥瑞降临', 'hook: hooks[0].name');
  assert(hooks[0].phase === 'preLaunch', 'hook: hooks[0].phase=preLaunch');

  // 筹备到 ready 但 < 70·hook 阻拦举事
  ns.contactAlly('孙豪强', 'jianghu', {});
  ns.contactAlly('赵大员', 'magnate', {});
  ns.prepareMaterials('weapons', { units: 20 });
  // 强制设 readiness=65（< 70）
  var s = ns._ensureState();
  s.readiness = 65;

  var r2 = ns.launchCoup({});
  assert(r2.ok === false, 'hook: readiness=65 < 70 → hook 阻拦举事');
  assert(/剧本 hook 阻拦/.test(r2.reason), 'hook: reason 含"剧本 hook 阻拦"');
  assert(hookCalls.length === 1, 'hook: preLaunch hook 被调用 1 次');
  assert(r2.hookName === '祥瑞降临', 'hook: hookName=祥瑞降临');

  // 拉高 readiness=75 → hook 通过
  s.readiness = 75;
  var r3 = ns.launchCoup({});
  assert(r3.ok === true, 'hook: readiness=75 ≥ 70 → hook 通过·举事成功');
  assert(hookCalls.length === 2, 'hook: preLaunch hook 第二次调用');

  // clearScenarioHooks
  var r4 = ns.clearScenarioHooks();
  assert(r4.ok === true, 'hook: clearScenarioHooks ok');
  assert(r4.cleared === 1, 'hook: cleared=1');
  assert(ns.listScenarioHooks().length === 0, 'hook: listScenarioHooks 清空');

  // 多 hook 串行
  ns.registerScenarioHook('hook-A', function (c) { return { ok: true }; });
  ns.registerScenarioHook('hook-B', function (c) { return { ok: false, reason: 'B 拒绝' }; });
  ns.registerScenarioHook('hook-C', function (c) { return { ok: true }; });
  setupCtx(ctx);
  ns = ctx.TM.PlayerRebel;
  resetPlayerCash(ctx, 100000);
  ns.registerScenarioHook('hook-A', function (c) { return { ok: true }; });
  ns.registerScenarioHook('hook-B', function (c) { return { ok: false, reason: 'B 拒绝' }; });
  prepForLaunch(ns);
  var r5 = ns.launchCoup({});
  assert(r5.ok === false, 'hook: 多 hook 中有 B 拒绝 → 举事失败');
  assert(/B 拒绝/.test(r5.reason), 'hook: reason 含"B 拒绝"');

  // hook 抛错不应崩溃
  setupCtx(ctx);
  ns = ctx.TM.PlayerRebel;
  resetPlayerCash(ctx, 100000);
  ns.registerScenarioHook('bad-hook', function (c) { throw new Error('hook 内部错误'); });
  prepForLaunch(ns);
  var r6 = ns.launchCoup({});
  assert(r6.ok === false, 'hook: hook 抛错 → 举事失败（不应崩溃）');
  assert(/hook 抛错/.test(r6.reason), 'hook: reason 含"hook 抛错"');
}

// SubTest 15: 跨朝代铁律审计
function testCrossDynastyIron(ctx) {
  // 扫描实际代码（剥注释）·确保无明清专名
  var src = fs.readFileSync(path.join(ROOT, 'tm-player-rebel.js'), 'utf8');
  var lines = src.split(/\r?\n/);
  var codeLines = lines.filter(function (l) {
    var t = l.trim();
    return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
  });
  var code = codeLines.join('\n');
  var forbidden = ['内阁', '票拟', '司礼监', '东厂', '西厂', '锦衣卫', '军机处', '廷杖', '八股', '巡按', '总督', '巡抚', '郡王', '藩王'];
  var hits = [];
  forbidden.forEach(function (term) {
    if (code.indexOf(term) >= 0) hits.push(term);
  });
  assert(hits.length === 0, 'cross-dynasty: 代码体无明清专名·命中 ' + hits.join(', '));

  // 古代通用称谓保留
  assert(code.indexOf('禁军') >= 0, 'cross-dynasty: 禁军（古代通用）保留');
  assert(code.indexOf('朝廷') >= 0, 'cross-dynasty: 朝廷保留');
  assert(code.indexOf('篡位') >= 0, 'cross-dynasty: 篡位保留');
  assert(code.indexOf('摄政') >= 0, 'cross-dynasty: 摄政保留');
  assert(code.indexOf('宗室夺嫡') >= 0, 'cross-dynasty: 宗室夺嫡保留');
  assert(code.indexOf('诸侯起兵') >= 0, 'cross-dynasty: 诸侯起兵保留');
  assert(code.indexOf('权臣篡位') >= 0, 'cross-dynasty: 权臣篡位保留');
  assert(code.indexOf('边将叛乱') >= 0, 'cross-dynasty: 边将叛乱保留');
  assert(code.indexOf('农民起义') >= 0, 'cross-dynasty: 农民起义保留');
  assert(code.indexOf('童谣') >= 0, 'cross-dynasty: 童谣保留');
  assert(code.indexOf('谶纬') >= 0, 'cross-dynasty: 谶纬保留');
  assert(code.indexOf('檄文') >= 0, 'cross-dynasty: 檄文保留');
}

// SubTest 16: 双路径挂载
function testDualMount(ctx) {
  var mod = require(path.join(ROOT, 'tm-player-rebel.js'));
  assert(mod && typeof mod.init === 'function', 'dual-mount: module.exports.init 是函数');
  assert(mod && typeof mod.contactAlly === 'function', 'dual-mount: module.exports.contactAlly 是函数');
  assert(mod && typeof mod.launchCoup === 'function', 'dual-mount: module.exports.launchCoup 是函数');
  assert(mod && typeof mod.applyVictory === 'function', 'dual-mount: module.exports.applyVictory 是函数');
  assert(mod && typeof mod.applyDefeat === 'function', 'dual-mount: module.exports.applyDefeat 是函数');
  assert(mod && typeof mod.renderPanel === 'function', 'dual-mount: module.exports.renderPanel 是函数');
  assert(mod.STAGES && Object.keys(mod.STAGES).length === 6, 'dual-mount: STAGES 6 态');
  assert(mod.ALLY_TYPES && Object.keys(mod.ALLY_TYPES).length === 3, 'dual-mount: ALLY_TYPES 3 类');
  assert(mod.PREP_TYPES && Object.keys(mod.PREP_TYPES).length === 3, 'dual-mount: PREP_TYPES 3 类');
  assert(mod.PROPAGANDA_TYPES && Object.keys(mod.PROPAGANDA_TYPES).length === 3, 'dual-mount: PROPAGANDA_TYPES 3 类');
  assert(mod.REBEL_TYPES && Object.keys(mod.REBEL_TYPES).length === 5, 'dual-mount: REBEL_TYPES 5 类');
  assert(mod.OUTCOMES && Object.keys(mod.OUTCOMES).length === 4, 'dual-mount: OUTCOMES 4 项');
  assert(mod.FATE_TYPES && Object.keys(mod.FATE_TYPES).length === 3, 'dual-mount: FATE_TYPES 3 项');
  assert(mod.READINESS_THRESHOLDS, 'dual-mount: READINESS_THRESHOLDS');
  assert(mod.DISCOVERY_THRESHOLDS, 'dual-mount: DISCOVERY_THRESHOLDS');
  // 内部函数亦暴露（调试/smoke 用）
  assert(typeof mod._ensureState === 'function', 'dual-mount: _ensureState 暴露');
  assert(typeof mod._resolveBattleInternal === 'function', 'dual-mount: _resolveBattleInternal 暴露');
  assert(typeof mod._computePlayerForce === 'function', 'dual-mount: _computePlayerForce 暴露');
}

// SubTest 17: 月度 tick
function testTick(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerRebel;
  resetPlayerCash(ctx, 100000);

  // dormant 阶段·tick 跳过
  var r0 = ns.tick({});
  assert(r0.ok === true && r0.skipped === true, 'tick: dormant 跳过');

  // 进入 preparing
  ns.contactAlly('孙豪强', 'jianghu', {});
  var s = ns._ensureState();
  var discBefore = s.discovered;
  var supportBefore = s.popularSupport;
  assert(s.stage === 'preparing' || s.stage === 'ready', 'tick: preparing 阶段');

  // tick 推进·泄密衰减 -1·民心漂移 -0.5
  var r1 = ns.tick({});
  assert(r1.ok === true, 'tick: preparing ok');
  assert(r1.discovered <= discBefore, 'tick: discovered 衰减（≤ before）');
  assert(r1.popularSupport <= supportBefore, 'tick: popularSupport 漂移（≤ before）');

  // autoCheckLeak 触发
  var r2 = ns.tick({ autoCheckLeak: true });
  assert(r2.ok === true, 'tick: autoCheckLeak ok');
  assert(r2.leakCheck === null || typeof r2.leakCheck === 'object', 'tick: leakCheck 字段');

  // succeeded / suppressed 阶段·tick 跳过
  setupCtx(ctx);
  ns = ctx.TM.PlayerRebel;
  ns._ensureState().stage = ns.STAGES.SUCCEEDED;
  var r3 = ns.tick({});
  assert(r3.ok === true && r3.skipped === true, 'tick: succeeded 跳过');

  ns._ensureState().stage = ns.STAGES.SUPPRESSED;
  var r4 = ns.tick({});
  assert(r4.ok === true && r4.skipped === true, 'tick: suppressed 跳过');

  // ready 但 readiness 跌回阈值下·降回 preparing
  setupCtx(ctx);
  ns = ctx.TM.PlayerRebel;
  resetPlayerCash(ctx, 100000);
  var st = ns._ensureState();
  st.stage = ns.STAGES.READY;
  st.readiness = ns.READINESS_THRESHOLDS.ready;  // 刚好阈值
  st.discovered = 50;
  var r5 = ns.tick({});
  assert(r5.ok === true, 'tick: ready ok');
  // discovered -1=49·readiness 应跌回阈值下·stage 降回 preparing
  assert(ns.getStage() === 'preparing', 'tick: readiness 跌回阈值下 → stage=preparing');
}

// ── 入口 ────────────────────────────────────────────────────
try {
  var ctx = buildContext();
  testNamespace(ctx);
  testGuards(ctx);
  testLedgerInit(ctx);
  testContactAlly(ctx);
  testPrepareMaterials(ctx);
  testSpreadPropaganda(ctx);
  testLaunchCoup(ctx);
  testResolveBattle(ctx);
  testApplyVictory(ctx);
  testApplyDefeat(ctx);
  testCourtSuppress(ctx);
  testCheckLeak(ctx);
  testRenderPanel(ctx);
  testScenarioHooks(ctx);
  testCrossDynastyIron(ctx);
  testDualMount(ctx);
  testTick(ctx);
  console.log('[smoke-player-rebel] PASS · 17 sub-tests · TM.PlayerRebel 完整覆盖（13 SubTask + 跨朝代 + 双路径挂载 + tick）');
  process.exit(0);
} catch (e) {
  console.error('[smoke-player-rebel] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
