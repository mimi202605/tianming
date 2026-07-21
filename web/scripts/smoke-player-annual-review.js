#!/usr/bin/env node
// scripts/smoke-player-annual-review.js — Phase 4.5 · Task 25 玩家官员年终考核 smoke
// 验证：
//   - TM.PlayerAnnualReview 命名空间暴露（双路径：globalThis + module.exports）
//   - 常量：INDICATORS(6 维) / GRADES(9 等) / CONSEQUENCES(7 种后果) / OPERATION_KINDS(2 种运作)
//   - 守卫：非穿越模式 / 非官员身份 各拒
//   - 6 维指标计算 computeIndicators（履职/政务/廉洁/人际/上级评价/民众口碑）
//   - 九等结果 deriveGrade（上上 → 下下·按 minScore 阈值）
//   - LLM 评语 generateComment（主路径 + 规则引擎降级）
//   - 后果触发 applyConsequences（升迁/贬谪/加俸/罚俸/赐物/记过/罢黜）
//   - 主动运作 operateBribe（cost 1000 / boost / risk）+ operateNetwork（走 PlayerInteraction.interact 'entrust'）
//   - 主入口 triggerReview（指标→等级→评语→后果→编年史→通知·年末触发）
//   - 编年史写入 writeReviewEvent（ChronicleTracker.add + 玩家记忆 + addEB）
//   - 御案通知 API（getNotifications / clearNotification / dismissPendingReview）
//   - 御案面板 renderAnnualReviewPanel（年份/指标/等级/通知）
//   - 跨朝代铁律·零明清专名
//   - 双路径挂载（globalThis + module.exports）

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

// ── 加载 tm-player-annual-review.js（IIFE 模式，sandbox.window = ctx）──
function buildContext() {
  var ctx = {
    console: { log: function(){}, warn: function(){}, error: function(){} },
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN,
    Set: Set, Map: Map, Promise: Promise,
    setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  ctx.TM = {};
  vm.createContext(ctx);
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'tm-player-annual-review.js'), 'utf8'),
    ctx, { filename: 'tm-player-annual-review.js' }
  );
  return ctx;
}

// ── Mock 全局 P/GM/TM + NPC 阵容 ──
function setupCtx(ctx, opts) {
  opts = opts || {};

  // 玩家：李大臣（穿越模式·minister·rankLevel 6 中品）
  var playerCh = {
    name: '李大臣', alive: true, officialTitle: '尚书', role: '臣',
    learning: 80, administration: 70, sovereignRelation: 70, prestige: 60,
    rankLevel: 6, corruption: 0.1, isPlayer: true
  };
  // NPC1：张同僚（用于托人情）
  var npcPeer = { name: '张同僚', alive: true, officialTitle: '侍郎', role: '臣', learning: 60 };
  // NPC2：王将军（军中）
  var npcGeneral = { name: '王将军', alive: true, officialTitle: '大将', role: '武将', learning: 50 };
  // NPC3：故人（已故·守卫测试用）
  var npcDead = { name: '故人', alive: false, officialTitle: '已故', role: '臣' };
  // 君主
  var sovereign = { name: '今上', alive: true, officialTitle: '皇帝', role: '皇帝', isEmperor: true };

  ctx.GM = {
    sid: 'smoke',
    turn: 24,
    chars: [playerCh, npcPeer, npcGeneral, npcDead, sovereign],
    minxin: { trueIndex: 70, index: 70 },
    _playerTech: { completed: ['agriculture.0', 'agriculture.1'] } // 2 项科技完成·+4 administration boost
  };
  ctx.P = {
    playerInfo: {
      transmigrationMode: true,
      playerRole: 'minister',
      characterName: '李大臣',
      characterTitle: '尚书',
      sovereignName: '今上',
      money: 10000,
      energy: 100,
      prestige: 60,
      sovereignRelation: 70,
      learning: 80,
      administration: 70,
      _playerMemory: [
        { turn: 14, kind: 'visit',       label: '私访' },
        { turn: 15, kind: 'secretTalk',  label: '密谈' },
        { turn: 16, kind: 'entrust',     label: '托付' },
        { turn: 17, kind: 'recruit',     label: '招揽' },
        { turn: 18, kind: 'disciple',    label: '收徒' },
        { turn: 19, kind: 'frame',       label: '构陷' },
        { turn: 20, kind: 'visit',       label: '私访' }
      ]
    }
  };

  // mock findCharByName / canonicalizeCharName（直通）
  ctx.findCharByName = function (name) {
    return (ctx.GM.chars || []).find(function (c) { return c && c.name === name; }) || null;
  };
  ctx.canonicalizeCharName = function (n) { return n; };

  // mock TM.Transmigration
  ctx.TM.Transmigration = {
    isTransmigrationMode: function () { return !!ctx.P.playerInfo.transmigrationMode; }
  };

  // mock TM.PlayerEconomy（spend/getBalance/getState）
  ctx._econSpendCalls = [];
  ctx.TM.PlayerEconomy = {
    spend: function (cost, label) {
      ctx._econSpendCalls.push({ cost: cost, label: label });
      if (ctx.P.playerInfo.money < cost) return { ok: false, reason: '银钱不足', cash: ctx.P.playerInfo.money };
      ctx.P.playerInfo.money -= cost;
      return { ok: true, cash: ctx.P.playerInfo.money };
    },
    getBalance: function () { return ctx.P.playerInfo.money; },
    getState: function () { return { corruption: 0.1, cash: ctx.P.playerInfo.money }; }
  };

  // mock TM.PlayerInteraction（interact + listInteractableNpcs）
  ctx._interactCalls = [];
  ctx.TM.PlayerInteraction = {
    interact: function (npcName, kind, payload) {
      ctx._interactCalls.push({ npc: npcName, kind: kind, payload: payload });
      if (kind !== 'entrust') return { ok: false, reason: 'mock 仅支持 entrust' };
      return { ok: true, kind: kind, npc: npcName, scene: 'mock 托人情场景', energy: { cost: 2 } };
    },
    listInteractableNpcs: function () {
      // 返回 张同僚 + 王将军·friend dim 各 60（与 NPC 默认一致）
      return [
        { name: '张同僚', dims: { friend: 60 } },
        { name: '王将军', dims: { friend: 55 } }
      ];
    }
  };

  // mock ChronicleTracker.add（编年史写入记录）
  ctx._chronicleCalls = [];
  ctx.ChronicleTracker = {
    add: function (track) {
      ctx._chronicleCalls.push(track);
      return 'chronicle_id_' + ctx._chronicleCalls.length;
    }
  };

  // mock NpcMemorySystem.remember
  ctx._npcMemCalls = [];
  ctx.NpcMemorySystem = {
    remember: function (name, event, mood, importance, who, meta) {
      ctx._npcMemCalls.push({ name: name, event: event, mood: mood, importance: importance, who: who, meta: meta });
    }
  };

  // mock addEB（事件日志记录）
  ctx._addEBCalls = [];
  ctx.addEB = function (cat, txt) {
    ctx._addEBCalls.push({ cat: cat, txt: txt });
  };

  // 不挂 callAI：默认走规则引擎降级
  ctx.callAI = undefined;

  // Math.random 默认 0.5（不发现·贿赂 risk 0.30 / 托人情 risk 0.15）
  // 测试中如需控制检测·可临时覆盖 ctx.Math.random
  ctx._origRandom = Math.random;
}

function restoreRandom(ctx) {
  ctx.Math.random = ctx._origRandom;
}

// ────────────────────────────────────────────────────────────
//  §1 命名空间 + 常量
// ────────────────────────────────────────────────────────────
function testNamespace(ctx) {
  assert(ctx.TM && ctx.TM.PlayerAnnualReview, 'namespace: TM.PlayerAnnualReview 暴露');
  var ns = ctx.TM.PlayerAnnualReview;
  // 常量
  assert(ns.INDICATORS, 'namespace: INDICATORS 存在');
  var indKeys = Object.keys(ns.INDICATORS);
  assert(indKeys.length === 6, 'namespace: INDICATORS 共 6 维·实际 ' + indKeys.length);
  var expectedInds = ['duty', 'administration', 'integrity', 'interpersonal', 'superior', 'public'];
  expectedInds.forEach(function (k) {
    assert(ns.INDICATORS[k], 'namespace: INDICATORS.' + k + ' 存在');
    assert(typeof ns.INDICATORS[k].label === 'string', 'namespace: INDICATORS.' + k + '.label 字符串');
    assert(typeof ns.INDICATORS[k].weight === 'number', 'namespace: INDICATORS.' + k + '.weight 数字');
  });
  // 权重合计 ≈ 1.0
  var wsum = expectedInds.reduce(function (s, k) { return s + ns.INDICATORS[k].weight; }, 0);
  assert(Math.abs(wsum - 1.0) < 0.001, 'namespace: 权重合计 = 1.0·实际 ' + wsum);

  // 九等
  assert(ns.GRADES && ns.GRADES.length === 9, 'namespace: GRADES 共 9 等·实际 ' + (ns.GRADES ? ns.GRADES.length : 0));
  var expectedGrades = ['上上', '上中', '上下', '中上', '中中', '中下', '下上', '下中', '下下'];
  ns.GRADES.forEach(function (g, i) {
    assert(g.label === expectedGrades[i], 'namespace: GRADES[' + i + '] = ' + expectedGrades[i] + '·实际 ' + g.label);
    assert(typeof g.minScore === 'number', 'namespace: GRADES[' + i + '].minScore 数字');
    assert(g.idx === i, 'namespace: GRADES[' + i + '].idx = ' + i);
  });

  // 后果（7 种动作·映射覆盖 9 等）
  assert(ns.CONSEQUENCES, 'namespace: CONSEQUENCES 存在');
  var allActs = new Set();
  Object.keys(ns.CONSEQUENCES).forEach(function (k) {
    ns.CONSEQUENCES[k].forEach(function (a) { allActs.add(a); });
  });
  var expectedActs = ['promote', 'demote', 'salaryRaise', 'salaryCut', 'gift', 'demerit', 'dismiss'];
  expectedActs.forEach(function (a) {
    assert(allActs.has(a), 'namespace: CONSEQUENCES 含动作 ' + a);
  });
  // 上上 → promote + salaryRaise；下下 → dismiss
  assert(ns.CONSEQUENCES.shangshang.indexOf('promote') >= 0, 'namespace: 上上 含 promote');
  assert(ns.CONSEQUENCES.xiaxia.indexOf('dismiss') >= 0, 'namespace: 下下 含 dismiss');

  // 运作种类
  assert(ns.OPERATION_KINDS, 'namespace: OPERATION_KINDS 存在');
  assert(ns.OPERATION_KINDS.bribe, 'namespace: OPERATION_KINDS.bribe');
  assert(ns.OPERATION_KINDS.network, 'namespace: OPERATION_KINDS.network');
  assert(ns.OPERATION_KINDS.bribe.cost === 1000, 'namespace: bribe.cost = 1000');
  assert(ns.OPERATION_KINDS.bribe.risk === 0.30, 'namespace: bribe.risk = 0.30');
  assert(ns.OPERATION_KINDS.network.via === 'interaction', 'namespace: network.via = interaction');

  // API
  assert(typeof ns.triggerReview === 'function', 'namespace: triggerReview');
  assert(typeof ns.computeIndicators === 'function', 'namespace: computeIndicators');
  assert(typeof ns.generateComment === 'function', 'namespace: generateComment');
  assert(typeof ns.deriveGrade === 'function', 'namespace: deriveGrade');
  assert(typeof ns.applyConsequences === 'function', 'namespace: applyConsequences');
  assert(typeof ns.operateBribe === 'function', 'namespace: operateBribe');
  assert(typeof ns.operateNetwork === 'function', 'namespace: operateNetwork');
  assert(typeof ns.writeReviewEvent === 'function', 'namespace: writeReviewEvent');
  assert(typeof ns.renderAnnualReviewPanel === 'function', 'namespace: renderAnnualReviewPanel');
  assert(typeof ns.getNotifications === 'function', 'namespace: getNotifications');
  assert(typeof ns.clearNotification === 'function', 'namespace: clearNotification');
  assert(typeof ns.dismissPendingReview === 'function', 'namespace: dismissPendingReview');
}

// ────────────────────────────────────────────────────────────
//  §2 守卫：非穿越模式 / 非官员身份 / 账本未就绪
// ────────────────────────────────────────────────────────────
function testGuards(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerAnnualReview;

  // 1) 非穿越模式·triggerReview 拒
  ctx.P.playerInfo.transmigrationMode = false;
  var r1 = ns.triggerReview(1);
  assert(r1.ok === false, 'guard-1: 非穿越模式 triggerReview 拒');
  assert(/非穿越模式/.test(r1.reason), 'guard-1: reason 含"非穿越模式"');
  ctx.P.playerInfo.transmigrationMode = true;

  // 2) 非穿越模式·operateBribe 拒
  ctx.P.playerInfo.transmigrationMode = false;
  var r2 = ns.operateBribe({});
  assert(r2.ok === false, 'guard-2: 非穿越模式 operateBribe 拒');
  ctx.P.playerInfo.transmigrationMode = true;

  // 3) 非穿越模式·operateNetwork 拒
  ctx.P.playerInfo.transmigrationMode = false;
  var r3 = ns.operateNetwork('张同僚', {});
  assert(r3.ok === false, 'guard-3: 非穿越模式 operateNetwork 拒');
  ctx.P.playerInfo.transmigrationMode = true;

  // 4) 非官员身份·triggerReview 拒（playerRole 设为 commoner）
  ctx.P.playerInfo.playerRole = 'commoner';
  var r4 = ns.triggerReview(1);
  assert(r4.ok === false, 'guard-4: 非官员身份 triggerReview 拒');
  assert(/非官员身份/.test(r4.reason), 'guard-4: reason 含"非官员身份"');
  ctx.P.playerInfo.playerRole = 'minister';

  // 5) 非官员身份·但 force=true 时通过（剧本 hook 强制）
  ctx.P.playerInfo.playerRole = 'commoner';
  var r5 = ns.triggerReview(1, { force: true, useLLM: false });
  assert(r5.ok === true, 'guard-5: force=true 时非官员身份通过');
  ctx.P.playerInfo.playerRole = 'minister';

  // 6) 未指定 NPC·operateNetwork 拒
  var r6 = ns.operateNetwork('', {});
  assert(r6.ok === false, 'guard-6: 未指定 NPC 拒');
  assert(/未指定/.test(r6.reason), 'guard-6: reason 含"未指定"');
}

// ────────────────────────────────────────────────────────────
//  §3 6 维指标计算 computeIndicators
// ────────────────────────────────────────────────────────────
function testComputeIndicators(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerAnnualReview;

  // 基础场景·6 维都在 0-100
  var inds = ns.computeIndicators({ applyOps: false });
  assert(inds && typeof inds === 'object', 'ind: 返回对象');
  var expectedDims = ['duty', 'administration', 'integrity', 'interpersonal', 'superior', 'public'];
  expectedDims.forEach(function (k) {
    assert(typeof inds[k] === 'number', 'ind: ' + k + ' 数字');
    assert(inds[k] >= 0 && inds[k] <= 100, 'ind: ' + k + ' ∈ [0,100]·实际 ' + inds[k]);
  });

  // 履职（duty）：玩家记忆中有 7 条·其中 6 条是履职类（visit×2/secretTalk/entrust/recruit/disciple）
  //   50 + min(30, 6*3) = 50 + 18 = 68
  assert(inds.duty === 68, 'ind: duty = 68·实际 ' + inds.duty);

  // 政务（administration）：50 + (80-50)/2 + (70-50)/2 + min(10, 2*2) = 50 + 15 + 10 + 4 = 79
  assert(inds.administration === 79, 'ind: administration = 79·实际 ' + inds.administration);

  // 廉洁（integrity）：100 - 0.1*100 = 90（PlayerEconomy.getState 返回 corruption 0.1）
  assert(inds.integrity === 90, 'ind: integrity = 90·实际 ' + inds.integrity);

  // 人际（interpersonal）：50 + (avg(friend)-50) - frameCount*2
  //   friendAvg = (60+55)/2 = 57.5；frameCount=1（仅 turn 19 frame）
  //   50 + 7.5 - 2 = 55.5 → round 56
  assert(inds.interpersonal === 56, 'ind: interpersonal = 56·实际 ' + inds.interpersonal);

  // 上级评价（superior）：50 + (70-50)/2 + (60-50)/3 = 50 + 10 + 3.33 = 63.33 → 63
  assert(inds.superior === 63, 'ind: superior = 63·实际 ' + inds.superior);

  // 民众口碑（public）：50 + (70-50)/2 = 60
  assert(inds.public === 60, 'ind: public = 60·实际 ' + inds.public);

  // 空玩家记忆场景·duty 应降到 50
  ctx.P.playerInfo._playerMemory = [];
  var inds2 = ns.computeIndicators({ applyOps: false });
  assert(inds2.duty === 50, 'ind: 空记忆 duty = 50·实际 ' + inds2.duty);

  // 民心降到 0·public 应降到 40（50 + (0-50)/2 = 25 → 实际公式 50 + (0-50)/2 = 25）
  ctx.GM.minxin.trueIndex = 0;
  var inds3 = ns.computeIndicators({ applyOps: false });
  assert(inds3.public === 25, 'ind: 民心 0 时 public = 25·实际 ' + inds3.public);
}

// ────────────────────────────────────────────────────────────
//  §4 九等结果 deriveGrade
// ────────────────────────────────────────────────────────────
function testDeriveGrade(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerAnnualReview;
  var G = ns.GRADES;

  // 阈值边界：minScore ≤ score 落该等
  // 上上 90 / 上中 80 / 上下 70 / 中上 65 / 中中 55 / 中下 45 / 下上 35 / 下中 25 / 下下 0
  var cases = [
    { score: 95, expect: '上上' },
    { score: 90, expect: '上上' },
    { score: 89, expect: '上中' },
    { score: 80, expect: '上中' },
    { score: 79, expect: '上下' },
    { score: 70, expect: '上下' },
    { score: 69, expect: '中上' },
    { score: 65, expect: '中上' },
    { score: 64, expect: '中中' },
    { score: 55, expect: '中中' },
    { score: 54, expect: '中下' },
    { score: 45, expect: '中下' },
    { score: 44, expect: '下上' },
    { score: 35, expect: '下上' },
    { score: 34, expect: '下中' },
    { score: 25, expect: '下中' },
    { score: 24, expect: '下下' },
    { score: 0,  expect: '下下' }
  ];

  cases.forEach(function (c) {
    // 构造 6 维同分·使加权 = score
    var inds = { duty: c.score, administration: c.score, integrity: c.score, interpersonal: c.score, superior: c.score, public: c.score };
    var g = ns.deriveGrade(inds);
    assert(g && g.label === c.expect, 'grade: score=' + c.score + ' → ' + c.expect + '·实际 ' + (g && g.label));
  });

  // 缺席 indicators 返回中中
  var g0 = ns.deriveGrade(null);
  assert(g0 && g0.label === '中中', 'grade: null indicators → 中中');
}

// ────────────────────────────────────────────────────────────
//  §5 LLM 评语 generateComment（主路径 + 规则引擎降级）
// ────────────────────────────────────────────────────────────
function testLLMComment(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerAnnualReview;

  var inds = { duty: 80, administration: 70, integrity: 90, interpersonal: 60, superior: 65, public: 60 };
  var grade = ns.deriveGrade(inds);

  // 1) 无 LLM·降级规则引擎
  ctx.callAI = undefined;
  var c1 = ns.generateComment(1, inds, grade);
  assert(typeof c1 === 'string' && c1.length > 0, 'llm-1: 降级评语非空');
  assert(/考核/.test(c1), 'llm-1: 评语含"考核"');
  assert(/上上|上中|上下|中上|中中|中下|下上|下中|下下/.test(c1), 'llm-1: 评语含等级标签');

  // 2) 挂上 global.callAI·走 LLM 主路径
  ctx.callAI = function (prompt) {
    return '【LLM】考核评语：该官员本年表现优异。';
  };
  var c2 = ns.generateComment(2, inds, grade);
  assert(/^【LLM】/.test(c2), 'llm-2: 走 LLM 主路径');

  // 3) LLM 返回空字符串·降级规则引擎
  ctx.callAI = function () { return ''; };
  var c3 = ns.generateComment(3, inds, grade);
  assert(typeof c3 === 'string' && c3.length > 0, 'llm-3: LLM 空时降级');
  assert(!/^【LLM】/.test(c3), 'llm-3: 不含 LLM 标记');

  // 4) LLM 返回非字符串（null）·降级
  ctx.callAI = function () { return null; };
  var c4 = ns.generateComment(4, inds, grade);
  assert(typeof c4 === 'string' && c4.length > 0, 'llm-4: LLM null 时降级');

  // 5) 不同等级·降级评语末段不同（高/中/低三段）
  ctx.callAI = undefined;
  var lowGrade = ns.GRADES[8];   // 下下
  var midGrade = ns.GRADES[4];   // 中中
  var highGrade = ns.GRADES[0];  // 上上
  var cLow = ns.generateComment(5, inds, lowGrade);
  var cMid = ns.generateComment(6, inds, midGrade);
  var cHigh = ns.generateComment(7, inds, highGrade);
  assert(/处分/.test(cLow), 'llm-5: 下下评语含"处分"');
  assert(/中规中矩|循分供职/.test(cMid), 'llm-5: 中中评语含"中规中矩/循分供职"');
  assert(/斐然|可观/.test(cHigh), 'llm-5: 上上评语含"斐然/可观"');
}

// ────────────────────────────────────────────────────────────
//  §6 后果触发 applyConsequences（7 种动作）
// ────────────────────────────────────────────────────────────
function testApplyConsequences(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerAnnualReview;

  // 上上 → promote + salaryRaise
  ctx.GM._playerAnnualReview = null; // 重置账本
  var r1 = ns.applyConsequences(ns.GRADES[0], {});
  assert(r1.ok === true, 'cons-1: 上上 ok');
  var acts1 = r1.applied.map(function (a) { return a.act; });
  assert(acts1.indexOf('promote') >= 0, 'cons-1: 上上 含 promote');
  assert(acts1.indexOf('salaryRaise') >= 0, 'cons-1: 上上 含 salaryRaise');
  // salaryMultiplier 应 +0.10
  assert(Math.abs(r1.salaryMultiplier - 1.10) < 0.001, 'cons-1: salaryMultiplier = 1.10·实际 ' + r1.salaryMultiplier);
  // rankLevel 应降（数字越小品级越高）·6 → 5
  var playerCh = ctx.findCharByName('李大臣');
  assert(playerCh.rankLevel === 5, 'cons-1: rankLevel 6 → 5·实际 ' + playerCh.rankLevel);

  // 上中 → salaryRaise + gift
  ctx.GM._playerAnnualReview = null;
  ctx.findCharByName('李大臣').rankLevel = 6;
  var r2 = ns.applyConsequences(ns.GRADES[1], {});
  var acts2 = r2.applied.map(function (a) { return a.act; });
  assert(acts2.indexOf('salaryRaise') >= 0, 'cons-2: 上中 含 salaryRaise');
  assert(acts2.indexOf('gift') >= 0, 'cons-2: 上中 含 gift');
  var giftAct = r2.applied.find(function (a) { return a.act === 'gift'; });
  assert(giftAct && giftAct.item, 'cons-2: gift.item 非空');

  // 上下 → gift
  ctx.GM._playerAnnualReview = null;
  var r3 = ns.applyConsequences(ns.GRADES[2], {});
  var acts3 = r3.applied.map(function (a) { return a.act; });
  assert(acts3.length === 1 && acts3[0] === 'gift', 'cons-3: 上下 仅 gift');

  // 中上 / 中中 → 无后果
  ctx.GM._playerAnnualReview = null;
  var r4 = ns.applyConsequences(ns.GRADES[3], {});
  assert(r4.applied.length === 0, 'cons-4: 中上 无后果');
  ctx.GM._playerAnnualReview = null;
  var r5 = ns.applyConsequences(ns.GRADES[4], {});
  assert(r5.applied.length === 0, 'cons-5: 中中 无后果');

  // 中下 → salaryCut
  ctx.GM._playerAnnualReview = null;
  var r6 = ns.applyConsequences(ns.GRADES[5], {});
  var acts6 = r6.applied.map(function (a) { return a.act; });
  assert(acts6.indexOf('salaryCut') >= 0, 'cons-6: 中下 含 salaryCut');
  assert(Math.abs(r6.salaryMultiplier - 0.85) < 0.001, 'cons-6: salaryMultiplier = 0.85·实际 ' + r6.salaryMultiplier);

  // 下上 → salaryCut + demerit
  ctx.GM._playerAnnualReview = null;
  var r7 = ns.applyConsequences(ns.GRADES[6], {});
  var acts7 = r7.applied.map(function (a) { return a.act; });
  assert(acts7.indexOf('salaryCut') >= 0, 'cons-7: 下上 含 salaryCut');
  assert(acts7.indexOf('demerit') >= 0, 'cons-7: 下上 含 demerit');
  assert(r7.demerits === 1, 'cons-7: demerits = 1·实际 ' + r7.demerits);

  // 下中 → demerit + demote·demerit 累计到 1（未触发自动贬谪·阈值 3）
  ctx.GM._playerAnnualReview = null;
  ctx.findCharByName('李大臣').rankLevel = 6;
  var r8 = ns.applyConsequences(ns.GRADES[7], {});
  var acts8 = r8.applied.map(function (a) { return a.act; });
  assert(acts8.indexOf('demerit') >= 0, 'cons-8: 下中 含 demerit');
  assert(acts8.indexOf('demote') >= 0, 'cons-8: 下中 含 demote');
  // rankLevel 6 → 7（贬谪）
  assert(ctx.findCharByName('李大臣').rankLevel === 7, 'cons-8: rankLevel 6 → 7');

  // 下下 → dismiss·playerRole → retired_official
  ctx.GM._playerAnnualReview = null;
  ctx.P.playerInfo.playerRole = 'minister';
  var r9 = ns.applyConsequences(ns.GRADES[8], {});
  var acts9 = r9.applied.map(function (a) { return a.act; });
  assert(acts9.indexOf('dismiss') >= 0, 'cons-9: 下下 含 dismiss');
  assert(ctx.P.playerInfo.playerRole === 'retired_official', 'cons-9: playerRole → retired_official');

  // 记过满阈值自动贬谪：手动连续 3 次 demerit
  ctx.GM._playerAnnualReview = null;
  ctx.P.playerInfo.playerRole = 'minister';
  ctx.findCharByName('李大臣').rankLevel = 6;
  // 模拟 3 次下上（每次 demerit）
  ns.applyConsequences(ns.GRADES[6], {});
  ns.applyConsequences(ns.GRADES[6], {});
  var rLast = ns.applyConsequences(ns.GRADES[6], {});
  // 第 3 次 demerit 应触发自动 demote
  var lastActs = rLast.applied.map(function (a) { return a.act; });
  assert(lastActs.indexOf('demote') >= 0, 'cons-9: 记过满阈值自动 demote');
  assert(ctx.findCharByName('李大臣').rankLevel === 7, 'cons-9: 满阈值后 rankLevel 6 → 7');
}

// ────────────────────────────────────────────────────────────
//  §7 主动运作·贿赂考官 operateBribe
// ────────────────────────────────────────────────────────────
function testBribe(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerAnnualReview;

  // 1) 默认 Math.random()=0.5 > risk 0.30·未发现
  ctx.Math.random = function () { return 0.5; };
  var moneyBefore = ctx.P.playerInfo.money;
  var r1 = ns.operateBribe({});
  assert(r1.ok === true, 'bribe-1: ok');
  assert(r1.detected === false, 'bribe-1: 未被发现');
  assert(r1.cost === 1000, 'bribe-1: cost = 1000');
  assert(ctx.P.playerInfo.money === moneyBefore - 1000, 'bribe-1: 银钱扣 1000');
  // PlayerEconomy.spend 被调用
  assert(ctx._econSpendCalls.length >= 1, 'bribe-1: PlayerEconomy.spend 被调用');
  // operation 入账
  var state1 = ns.getState();
  assert(state1.operations.length === 1, 'bribe-1: operations 长度 1');
  assert(state1.operations[0].kind === 'bribe', 'bribe-1: operations[0].kind = bribe');
  assert(state1.operations[0].appliedToCurrentYear === true, 'bribe-1: appliedToCurrentYear = true');

  // 2) Math.random() < 0.30·被发现
  ctx.Math.random = function () { return 0.10; };
  ctx.GM._playerAnnualReview = null; // 重置账本
  ctx.P.playerInfo.money = 10000;
  var r2 = ns.operateBribe({});
  assert(r2.ok === true, 'bribe-2: ok');
  assert(r2.detected === true, 'bribe-2: 被发现');
  var state2 = ns.getState();
  assert(state2.detectedOpCount === 1, 'bribe-2: detectedOpCount = 1');

  // 3) 银钱不足·拒
  ctx.GM._playerAnnualReview = null;
  ctx.P.playerInfo.money = 500;
  // mock getBalance 返回实际余额（500 < 1000）
  var r3 = ns.operateBribe({});
  assert(r3.ok === false, 'bribe-3: 银钱不足拒');
  assert(/银钱不足/.test(r3.reason), 'bribe-3: reason 含"银钱不足"');

  // 4) 非穿越模式拒
  ctx.P.playerInfo.money = 10000;
  ctx.P.playerInfo.transmigrationMode = false;
  var r4 = ns.operateBribe({});
  assert(r4.ok === false, 'bribe-4: 非穿越模式拒');
  ctx.P.playerInfo.transmigrationMode = true;

  // 5) 玩家记忆 + addEB 已写入
  ctx.GM._playerAnnualReview = null;
  ctx.P.playerInfo.money = 10000;
  ctx._addEBCalls = [];
  ctx.P.playerInfo._playerMemory = [];
  ctx.Math.random = function () { return 0.5; };
  ns.operateBribe({});
  var memOps = ctx.P.playerInfo._playerMemory.filter(function (m) { return m.kind === 'annual_review_op'; });
  assert(memOps.length === 1, 'bribe-5: 玩家记忆 annual_review_op 1 条');
  assert(ctx._addEBCalls.length >= 1, 'bribe-5: addEB 调用 ≥1 次');

  restoreRandom(ctx);
}

// ────────────────────────────────────────────────────────────
//  §8 主动运作·托人情 operateNetwork
// ────────────────────────────────────────────────────────────
function testNetwork(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerAnnualReview;

  // 1) 默认 Math.random()=0.5 > risk 0.15·未发现
  ctx.Math.random = function () { return 0.5; };
  ctx._interactCalls = [];
  var r1 = ns.operateNetwork('张同僚', {});
  assert(r1.ok === true, 'net-1: ok');
  assert(r1.detected === false, 'net-1: 未被发现');
  // PlayerInteraction.interact 被调用·kind = 'entrust'
  assert(ctx._interactCalls.length === 1, 'net-1: PlayerInteraction.interact 调用 1 次');
  assert(ctx._interactCalls[0].kind === 'entrust', 'net-1: kind = entrust');
  assert(ctx._interactCalls[0].npc === '张同僚', 'net-1: npc = 张同僚');
  // operation 入账·cost = 0
  var state1 = ns.getState();
  assert(state1.operations.length === 1, 'net-1: operations 长度 1');
  assert(state1.operations[0].cost === 0, 'net-1: cost = 0');

  // 2) Math.random() < 0.15·被发现
  ctx.Math.random = function () { return 0.05; };
  ctx.GM._playerAnnualReview = null;
  ctx._interactCalls = [];
  ctx._npcMemCalls = [];
  var r2 = ns.operateNetwork('张同僚', {});
  assert(r2.ok === true, 'net-2: ok');
  assert(r2.detected === true, 'net-2: 被发现');
  // 被发现时 NPC 记忆写入"托人情败露"
  assert(ctx._npcMemCalls.length === 1, 'net-2: NpcMemorySystem.remember 调用 1 次');
  assert(/败露/.test(ctx._npcMemCalls[0].event), 'net-2: NPC 记忆含"败露"');

  // 3) interact 失败·拒
  ctx.GM._playerAnnualReview = null;
  ctx.TM.PlayerInteraction.interact = function () { return { ok: false, reason: 'mock 失败' }; };
  var r3 = ns.operateNetwork('张同僚', {});
  assert(r3.ok === false, 'net-3: interact 失败时拒');
  assert(/mock 失败/.test(r3.reason), 'net-3: reason 回显');

  // 4) 未指定 NPC·拒
  ctx.GM._playerAnnualReview = null;
  ctx.TM.PlayerInteraction.interact = function () { return { ok: true }; };
  var r4 = ns.operateNetwork('', {});
  assert(r4.ok === false, 'net-4: 未指定 NPC 拒');

  // 5) 非穿越模式·拒
  ctx.P.playerInfo.transmigrationMode = false;
  var r5 = ns.operateNetwork('张同僚', {});
  assert(r5.ok === false, 'net-5: 非穿越模式拒');
  ctx.P.playerInfo.transmigrationMode = true;

  restoreRandom(ctx);
}

// ────────────────────────────────────────────────────────────
//  §9 主入口 triggerReview·年末触发
// ────────────────────────────────────────────────────────────
function testTriggerReview(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerAnnualReview;

  ctx.Math.random = function () { return 0.5; }; // 不发现
  ctx._chronicleCalls = [];
  ctx._addEBCalls = [];

  // 1) 触发考核·指标综合分约 70+ → 上下/中上
  var r1 = ns.triggerReview(1, { useLLM: false });
  assert(r1.ok === true, 'trig-1: ok');
  assert(r1.year === 1, 'trig-1: year = 1');
  assert(r1.grade && typeof r1.grade.label === 'string', 'trig-1: grade.label 字符串');
  assert(typeof r1.comment === 'string' && r1.comment.length > 0, 'trig-1: comment 非空');
  assert(r1.review && r1.review.year === 1, 'trig-1: review.year = 1');
  assert(r1.review.indicators && typeof r1.review.indicators === 'object', 'trig-1: review.indicators 对象');
  assert(typeof r1.review.score === 'number', 'trig-1: review.score 数字');

  // 2) state 已更新：currentYear / indicators / history / pendingReview
  var state = ns.getState();
  assert(state.currentYear === 1, 'trig-1: state.currentYear = 1');
  assert(Object.keys(state.indicators).length === 6, 'trig-1: state.indicators 6 维');
  assert(state.history.length === 1, 'trig-1: state.history 长度 1');
  assert(state.pendingReview !== null, 'trig-1: state.pendingReview 非空');
  assert(state.pendingReview.year === 1, 'trig-1: pendingReview.year = 1');

  // 3) 编年史已写入
  assert(ctx._chronicleCalls.length === 1, 'trig-1: ChronicleTracker.add 调用 1 次');
  var track = ctx._chronicleCalls[0];
  assert(track.type === 'player_annual_review', 'trig-1: chronicle.type = player_annual_review');
  assert(track.category === '考核', 'trig-1: chronicle.category = 考核');
  assert(/年终考核/.test(track.title), 'trig-1: chronicle.title 含"年终考核"');

  // 4) 通知队列有 1 条
  var notifs = ns.getNotifications();
  assert(notifs.length === 1, 'trig-1: 通知 1 条');
  assert(/年终考核/.test(notifs[0].title), 'trig-1: 通知 title 含"年终考核"');

  // 5) addEB 已被调用
  assert(ctx._addEBCalls.length >= 1, 'trig-1: addEB 调用 ≥1 次');

  // 6) 玩家记忆已写入 annual_review 条目
  var memAnnuals = ctx.P.playerInfo._playerMemory.filter(function (m) { return m.kind === 'annual_review'; });
  assert(memAnnuals.length === 1, 'trig-1: 玩家记忆 annual_review 1 条');
  assert(memAnnuals[0].year === 1, 'trig-1: 玩家记忆 year = 1');

  // 7) 二次触发·history 长度 = 2
  ctx.Math.random = function () { return 0.5; };
  var r2 = ns.triggerReview(2, { useLLM: false });
  assert(r2.ok === true, 'trig-2: 二次触发 ok');
  var state2 = ns.getState();
  assert(state2.history.length === 2, 'trig-2: history 长度 2');
  assert(state2.currentYear === 2, 'trig-2: currentYear = 2');

  // 8) 主动运作后触发考核·运作偏移已应用
  ctx.GM._playerAnnualReview = null;
  ctx.P.playerInfo._playerMemory = [];
  ctx.P.playerInfo.money = 100000; // 保证贿赂成功
  ctx.Math.random = function () { return 0.5; }; // 不发现·贿赂 boost +10
  // 先采集基准指标
  var baseInds = ns.computeIndicators({ applyOps: false });
  // 贿赂后指标应 +
  ns.operateBribe({});
  var r3 = ns.triggerReview(3, { useLLM: false });
  assert(r3.ok === true, 'trig-3: 贿赂后触发 ok');
  // 至少一个维度应高于 baseInds（贿赂 boost +10）
  var ind3 = r3.indicators;
  var anyHigher = Object.keys(baseInds).some(function (k) { return ind3[k] > baseInds[k]; });
  assert(anyHigher, 'trig-3: 贿赂后至少一维 + boost');

  // 9) 被发现的运作·boost 反向 + superior 额外 -5
  ctx.GM._playerAnnualReview = null;
  ctx.P.playerInfo._playerMemory = [];
  ctx.P.playerInfo.money = 100000;
  ctx.Math.random = function () { return 0.05; }; // 发现·贿赂 boost 反向
  ns.operateBribe({});
  var r4 = ns.triggerReview(4, { useLLM: false });
  assert(r4.ok === true, 'trig-4: 贿赂被发现后触发 ok');
  var ind4 = r4.indicators;
  // 被发现·integrity 应低于 baseInds（贿赂 boost -10）
  var baseInteg = ns.computeIndicators({ applyOps: false }).integrity;
  assert(ind4.integrity < baseInteg, 'trig-4: 被发现 integrity 低于基准·基准 ' + baseInteg + ' 实际 ' + ind4.integrity);

  restoreRandom(ctx);
}

// ────────────────────────────────────────────────────────────
//  §10 编年史写入 writeReviewEvent
// ────────────────────────────────────────────────────────────
function testChronicleWrite(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerAnnualReview;
  ctx._chronicleCalls = [];
  ctx._addEBCalls = [];
  ctx.P.playerInfo._playerMemory = [];

  var review = {
    year: 99,
    grade: ns.GRADES[0],
    comment: '编年史测试评语',
    consequences: [{ act: 'promote' }, { act: 'salaryRaise' }],
    indicators: { duty: 95, administration: 90, integrity: 95, interpersonal: 80, superior: 90, public: 85 }
  };

  var entry = ns.writeReviewEvent(review);
  assert(entry, 'chron: writeReviewEvent 返回 entry');
  assert(entry.kind === 'annual_review', 'chron: entry.kind = annual_review');
  assert(entry.year === 99, 'chron: entry.year = 99');
  assert(entry.grade === '上上', 'chron: entry.grade = 上上');

  // ChronicleTracker.add 已调用
  assert(ctx._chronicleCalls.length === 1, 'chron: ChronicleTracker.add 1 次');
  var track = ctx._chronicleCalls[0];
  assert(track.type === 'player_annual_review', 'chron: track.type = player_annual_review');
  assert(track.actor === '玩家', 'chron: track.actor = 玩家');
  assert(track.meta.year === 99, 'chron: track.meta.year = 99');
  assert(track.meta.grade === 'shangshang', 'chron: track.meta.grade = shangshang');

  // 玩家记忆已写入 annual_review
  var memAnnuals = ctx.P.playerInfo._playerMemory.filter(function (m) { return m.kind === 'annual_review'; });
  assert(memAnnuals.length === 1, 'chron: 玩家记忆 1 条');
  assert(memAnnuals[0].year === 99, 'chron: 玩家记忆 year = 99');

  // addEB 已调用
  assert(ctx._addEBCalls.length >= 1, 'chron: addEB 调用 ≥1 次');

  // ChronicleTracker 缺席时降级·不抛
  ctx._chronicleCalls = [];
  ctx.ChronicleTracker = undefined;
  var entry2 = ns.writeReviewEvent(review);
  assert(entry2, 'chron: ChronicleTracker 缺席时仍返回 entry');
}

// ────────────────────────────────────────────────────────────
//  §11 御案通知 API + dismissPendingReview
// ────────────────────────────────────────────────────────────
function testNotifications(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerAnnualReview;

  // 初始空
  var n0 = ns.getNotifications();
  assert(Array.isArray(n0) && n0.length === 0, 'notif: 初始空');

  // 触发考核后·通知 1 条
  ctx.Math.random = function () { return 0.5; };
  var r1 = ns.triggerReview(1, { useLLM: false });
  assert(r1.ok === true, 'notif: triggerReview ok');
  var n1 = ns.getNotifications();
  assert(n1.length === 1, 'notif: 1 条');
  var notifId = n1[0].id;
  assert(typeof notifId === 'string', 'notif: id 字符串');
  assert(n1[0].kind === 'annual_review', 'notif: kind = annual_review');

  // clearNotification 删
  var clr = ns.clearNotification(notifId);
  assert(clr.ok === true, 'notif: clearNotification ok');
  assert(clr.removed === 1, 'notif: removed = 1');
  var n2 = ns.getNotifications();
  assert(n2.length === 0, 'notif: 删除后空');

  // clearNotification 不存在的 id·removed = 0
  var clr2 = ns.clearNotification('bogus_id');
  assert(clr2.ok === true, 'notif: 不存在 id 仍 ok');
  assert(clr2.removed === 0, 'notif: removed = 0');

  // pendingReview 应有
  var pr = ns.getPendingReview();
  assert(pr !== null, 'notif: pendingReview 非空');
  assert(pr.year === 1, 'notif: pendingReview.year = 1');

  // dismissPendingReview 清空
  var dis = ns.dismissPendingReview();
  assert(dis.ok === true, 'notif: dismissPendingReview ok');
  var pr2 = ns.getPendingReview();
  assert(pr2 === null, 'notif: dismiss 后 pendingReview = null');

  restoreRandom(ctx);
}

// ────────────────────────────────────────────────────────────
//  §12 御案面板 renderAnnualReviewPanel
// ────────────────────────────────────────────────────────────
function testRenderPanel(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerAnnualReview;

  // 触发考核·让账本有数据
  ctx.Math.random = function () { return 0.5; };
  ns.triggerReview(7, { useLLM: false });

  // 调用 renderAnnualReviewPanel
  var html = ns.renderAnnualReviewPanel();
  assert(typeof html === 'string' && html.length > 0, 'panel: 返回非空字符串');
  assert(/官员考核/.test(html), 'panel: 含"官员考核"标题');
  assert(/考核年份/.test(html), 'panel: 含"考核年份"');
  assert(/7/.test(html), 'panel: 含年份 7');
  // 6 维指标 label 应在 HTML 中
  assert(/履职/.test(html), 'panel: 含"履职"');
  assert(/政务/.test(html), 'panel: 含"政务"');
  assert(/廉洁/.test(html), 'panel: 含"廉洁"');
  assert(/人际/.test(html), 'panel: 含"人际"');
  assert(/上级评价/.test(html), 'panel: 含"上级评价"');
  assert(/民众口碑/.test(html), 'panel: 含"民众口碑"');
  // 等级标签应出现
  assert(/上上|上中|上下|中上|中中|中下|下上|下中|下下/.test(html), 'panel: 含九等标签');
  // 俸禄倍率
  assert(/俸禄倍率/.test(html), 'panel: 含"俸禄倍率"');
  assert(/记过/.test(html), 'panel: 含"记过"');

  // 跨朝代铁律·面板 HTML 也不应含明清专名
  assert(!/内阁|票拟|司礼监|东厂|西厂|锦衣卫|军机处|廷杖|八股|巡按|总督|巡抚|郡王|藩王/.test(html),
    'panel: 面板 HTML 不含明清专名');

  restoreRandom(ctx);
}

// ────────────────────────────────────────────────────────────
//  §13 跨朝代铁律·grep 实现文件·零明清专名
// ────────────────────────────────────────────────────────────
function testCrossDynasty(ctx) {
  var src = fs.readFileSync(path.join(ROOT, 'tm-player-annual-review.js'), 'utf8');
  // 13 类明清专属专名·一律禁
  var forbidden = ['内阁', '票拟', '司礼监', '东厂', '西厂', '锦衣卫', '军机处', '廷杖', '八股', '巡按', '总督', '巡抚', '郡王', '藩王'];
  var hits = [];
  forbidden.forEach(function (w) {
    var idx = src.indexOf(w);
    if (idx !== -1) {
      // 找到行号·便于排查
      var lineNo = src.slice(0, idx).split('\n').length;
      hits.push(w + '@line ' + lineNo);
    }
  });
  assert(hits.length === 0, 'cross-dynasty: 禁字命中 ' + hits.join(', '));
  // 九等考核标签应存在（跨朝代通用的考核制度）
  ['上上', '上中', '上下', '中上', '中中', '中下', '下上', '下中', '下下'].forEach(function (g) {
    assert(src.indexOf(g) !== -1, 'cross-dynasty: 含九等标签 ' + g);
  });
}

// ────────────────────────────────────────────────────────────
//  §14 双路径挂载（globalThis + module.exports）
// ────────────────────────────────────────────────────────────
function testDualMount(ctx) {
  // 1) globalThis 路径已在前述各 test 验证
  assert(ctx.TM && ctx.TM.PlayerAnnualReview, 'dual: globalThis.TM.PlayerAnnualReview 存在');

  // 2) module.exports 路径·重新 require
  var mod = require(path.join(ROOT, 'tm-player-annual-review.js'));
  assert(mod && typeof mod.triggerReview === 'function', 'dual: module.exports.triggerReview 是函数');
  assert(mod.INDICATORS && Object.keys(mod.INDICATORS).length === 6, 'dual: module.exports.INDICATORS 6 维');
  assert(mod.GRADES && mod.GRADES.length === 9, 'dual: module.exports.GRADES 9 等');
  assert(mod.CONSEQUENCES, 'dual: module.exports.CONSEQUENCES');
  assert(mod.OPERATION_KINDS, 'dual: module.exports.OPERATION_KINDS');
  assert(typeof mod.computeIndicators === 'function', 'dual: module.exports.computeIndicators');
  assert(typeof mod.deriveGrade === 'function', 'dual: module.exports.deriveGrade');
  assert(typeof mod.applyConsequences === 'function', 'dual: module.exports.applyConsequences');
  assert(typeof mod.operateBribe === 'function', 'dual: module.exports.operateBribe');
  assert(typeof mod.operateNetwork === 'function', 'dual: module.exports.operateNetwork');
  assert(typeof mod.writeReviewEvent === 'function', 'dual: module.exports.writeReviewEvent');
  assert(typeof mod.renderAnnualReviewPanel === 'function', 'dual: module.exports.renderAnnualReviewPanel');
}

// ── 入口 ────────────────────────────────────────────────────
try {
  var ctx = buildContext();
  testNamespace(ctx);
  testGuards(ctx);
  testComputeIndicators(ctx);
  testDeriveGrade(ctx);
  testLLMComment(ctx);
  testApplyConsequences(ctx);
  testBribe(ctx);
  testNetwork(ctx);
  testTriggerReview(ctx);
  testChronicleWrite(ctx);
  testNotifications(ctx);
  testRenderPanel(ctx);
  testCrossDynasty(ctx);
  testDualMount(ctx);
  console.log('[smoke-player-annual-review] PASS · 14 sub-tests · namespace/guards/6-indicators/9-grades/llm-comment/7-consequences/bribe/network/trigger-review/chronicle/notifications/panel/cross-dynasty/dual-mount');
  process.exit(0);
} catch (e) {
  console.error('[smoke-player-annual-review] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
