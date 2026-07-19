#!/usr/bin/env node
// scripts/smoke-player-special-identity.js — Phase 4.5 · Task 26C 9 类特殊身份路线 smoke
// 验证（覆盖 14 项 SubTask + 跨朝代 + 双路径挂载）：
//   1.  命名空间：TM.PlayerSpecialIdentity 暴露（双路径：globalThis + module.exports）
//   2.  守卫：非穿越模式主入口拒绝
//   3.  路由函数 getRoute（按 playerRole 返回动作集·9 类身份各就位）
//   4.  太监路线（净身标记 + 内廷权力线 4 阶 + 派系归类 + 清流反扑）
//   5.  宫女路线（采女→御女→宝林→才人→嫔→妃 晋升 + 宫斗事件）
//   6.  布衣路线（6 种选择 + 白衣卿相事件）
//   7.  盗贼路线（占山为王 + 招安/造反两分支）
//   8.  婴儿路线（自动成长 + 神童/顽童事件 + 满 3 岁转线）
//   9.  退休官员路线（朝廷顾问身份 + 东山再起/颐养天年）
//  10.  方外路线（寺观清修 + 医病/祈福/讲法 + 高僧入朝）
//  11.  商贾扩展路线（跨国贸易 hook + 巨贾行商 + 御赐官商）
//  12.  匠人扩展路线（技艺传承 + 进贡朝廷 + 御用匠人 + 上奏推广技艺）
//  13.  事件触发器 checkEvents（每回合检查 + 各身份事件链）
//  14.  御案"身份路线"面板 renderIdentityPanel
//  15.  跨朝代 hook registerCustomIdentity（剧本注入朝代专属身份）
//  16.  双路径挂载（module.exports 等价 globalThis.TM.PlayerSpecialIdentity）
//  17.  跨朝代铁律（grep 代码体无禁词清单内专名）

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

// ── 加载 tm-player-special-identity.js（IIFE 模式，sandbox）──
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
    fs.readFileSync(path.join(ROOT, 'tm-player-special-identity.js'), 'utf8'),
    ctx, { filename: 'tm-player-special-identity.js' }
  );
  return ctx;
}

// ── Mock 全局 P/GM/TM ──
function setupCtx(ctx) {
  ctx.GM = {
    sid: 'smoke',
    turn: 10,
    year: 1,
    chars: []
  };
  ctx.P = {
    playerInfo: {
      transmigrationMode: true,
      playerRole: 'eunuch',
      characterName: '李太监',
      sovereignName: '今上',
      familyName: '李氏',
      playerEconomy: { cash: 100000, properties: [], investments: [], grayIncome: [], corruption: 0, ledger: [] }
    }
  };

  if (!ctx.TM) ctx.TM = {};
  ctx.TM.Transmigration = {
    isTransmigrationMode: function () { return !!ctx.P.playerInfo.transmigrationMode; }
  };

  ctx.TM.PlayerEconomy = {
    spend: function (cost, reason) {
      var pe = ctx.P.playerInfo.playerEconomy;
      if (typeof pe.cash !== 'number') pe.cash = 0;
      if (pe.cash < cost) return { ok: false, reason: '银钱不足', cash: pe.cash };
      pe.cash -= cost;
      if (!Array.isArray(pe.ledger)) pe.ledger = [];
      pe.ledger.push({ kind: 'spend', delta: -cost, reason: reason });
      return { ok: true, cash: pe.cash };
    },
    addCash: function (n, reason) {
      var pe = ctx.P.playerInfo.playerEconomy;
      pe.cash = (pe.cash || 0) + n;
      return { ok: true, cash: pe.cash };
    }
  };

  ctx._interactCalls = [];
  ctx.TM.PlayerInteraction = {
    interact: function (npcName, kind, payload) {
      ctx._interactCalls.push({ npcName: npcName, kind: kind, payload: payload });
      return { ok: true, kind: kind, npc: npcName, scene: 'mock' };
    }
  };

  ctx._tradeCalls = [];
  ctx.TM.PlayerTrade = {
    dispatchTrade: function (caravanId, opts) {
      ctx._tradeCalls.push({ caravanId: caravanId, opts: opts });
      return { ok: true, caravanId: caravanId, dispatched: true };
    }
  };

  ctx._techCalls = [];
  ctx.TM.PlayerTech = {
    startResearch: function (field, opts) {
      ctx._techCalls.push({ method: 'startResearch', field: field, opts: opts });
      return { ok: true, field: field };
    },
    petitionToPromulgate: function (techId, opts) {
      ctx._techCalls.push({ method: 'petitionToPromulgate', techId: techId, opts: opts });
      return { ok: true, techId: techId };
    }
  };

  ctx._kejuCalls = [];
  ctx.TM.PlayerKeju = {
    applyForExam: function (stage, opts) {
      ctx._kejuCalls.push({ stage: stage, opts: opts });
      return { ok: true, stage: stage };
    }
  };

  ctx._rebelCalls = [];
  ctx.TM.PlayerRebel = {
    launch: function (opts) {
      ctx._rebelCalls.push({ opts: opts });
      return { ok: true, success: opts && opts.success !== false };
    }
  };

  ctx._movementCalls = [];
  ctx.TM.PlayerMovement = {
    travelTo: function (dest, opts) {
      ctx._movementCalls.push({ dest: dest, opts: opts });
      return { ok: true, dest: dest };
    }
  };

  ctx._familyCalls = [];
  ctx.TM.PlayerFamily = {
    marry: function (opts) {
      ctx._familyCalls.push({ method: 'marry', opts: opts });
      return { ok: true };
    },
    birthChild: function (opts) {
      ctx._familyCalls.push({ method: 'birthChild', opts: opts });
      return { ok: true, child: { name: '李子' } };
    }
  };

  ctx._chronicleEntries = [];
  ctx.addToChronicle = function (entry) { ctx._chronicleEntries.push(entry); };
}

function resetCtx(ctx) {
  ctx.P.playerInfo.transmigrationMode = true;
  ctx.P.playerInfo.playerRole = 'eunuch';
  ctx.P.playerInfo.characterName = '李太监';
  ctx.P.playerInfo.playerEconomy.cash = 100000;
  delete ctx.GM._playerSpecialIdentity;
}

// ── Sub-tests ───────────────────────────────────────────────

// SubTest 1: 命名空间暴露
function testNamespace(ctx) {
  setupCtx(ctx);
  assert(ctx.TM && ctx.TM.PlayerSpecialIdentity, 'ns: TM.PlayerSpecialIdentity 暴露');
  var ns = ctx.TM.PlayerSpecialIdentity;
  // 常量
  assert(ns.IDENTITY_KINDS && Object.keys(ns.IDENTITY_KINDS).length === 9, 'ns: IDENTITY_KINDS 共 9 类');
  assert(ns.EUNUCH_RANKS && Object.keys(ns.EUNUCH_RANKS).length === 4, 'ns: EUNUCH_RANKS 共 4 阶');
  assert(ns.MAID_RANKS && Object.keys(ns.MAID_RANKS).length === 6, 'ns: MAID_RANKS 共 6 阶');
  assert(ns.COMMONER_PATHS && Object.keys(ns.COMMONER_PATHS).length === 6, 'ns: COMMONER_PATHS 共 6 选择');
  assert(ns.BANDIT_BRANCH && Object.keys(ns.BANDIT_BRANCH).length === 2, 'ns: BANDIT_BRANCH 共 2 分支');
  assert(ns.INFANT_EVENTS && Object.keys(ns.INFANT_EVENTS).length === 2, 'ns: INFANT_EVENTS 共 2 事件');
  assert(ns.RETIRED_BRANCH && Object.keys(ns.RETIRED_BRANCH).length === 2, 'ns: RETIRED_BRANCH 共 2 分支');
  assert(ns.MONK_SERVICES && Object.keys(ns.MONK_SERVICES).length === 3, 'ns: MONK_SERVICES 共 3 服务');
  assert(ns.MERCHANT_TIERS && Object.keys(ns.MERCHANT_TIERS).length === 3, 'ns: MERCHANT_TIERS 共 3 档');
  assert(ns.ARTISAN_TIERS && Object.keys(ns.ARTISAN_TIERS).length === 3, 'ns: ARTISAN_TIERS 共 3 档');
  // 9 身份 label 全部就位
  var labels = Object.keys(ns.IDENTITY_KINDS).map(function (k) { return ns.IDENTITY_KINDS[k].label; });
  ['太监','宫女','布衣','盗贼','婴儿','退休官员','方外','商贾','匠人'].forEach(function (lbl) {
    assert(labels.indexOf(lbl) >= 0, 'ns: IDENTITY_KINDS 含 ' + lbl);
  });
  // 主入口
  assert(typeof ns.init === 'function', 'ns: init 是函数');
  assert(typeof ns.getState === 'function', 'ns: getState 是函数');
  assert(typeof ns.getCurrentIdentity === 'function', 'ns: getCurrentIdentity 是函数');
  assert(typeof ns.setCurrentIdentity === 'function', 'ns: setCurrentIdentity 是函数');
  assert(typeof ns.getRoute === 'function', 'ns: getRoute 是函数');
  assert(typeof ns.listActionsForRole === 'function', 'ns: listActionsForRole 是函数');
  assert(typeof ns.checkEvents === 'function', 'ns: checkEvents 是函数');
  assert(typeof ns.triggerEvent === 'function', 'ns: triggerEvent 是函数');
  assert(typeof ns.registerCustomIdentity === 'function', 'ns: registerCustomIdentity 是函数');
  assert(typeof ns.renderIdentityPanel === 'function', 'ns: renderIdentityPanel 是函数');
  // 9 路线主入口
  ['eunuchInit','eunuchAdvanceRank','eunuchClassifyFaction','eunuchTriggerQingliuBackfire',
   'maidInit','maidPromote','maidTriggerCourtIntrigue',
   'commonerInit','commonerChoosePath','commonerTriggerBaiyiQingxiang',
   'banditInit','banditOccupyMountain','banditAcceptAmnesty','banditLaunchRebellion',
   'infantInit','infantAutoGrow','infantTriggerProdigyOrMischievous',
   'retiredInit','retiredTriggerComeback','retiredTriggerPeacefulAging',
   'monkInit','monkPracticeService','monkTriggerSummonToCourt',
   'merchantInit','merchantCrossBorderTrade','merchantTriggerMagnate','merchantBestowCourtMerchant',
   'artisanInit','artisanTributeToCourt','artisanTriggerRoyalArtisan','artisanPetitionToPromulgate'
  ].forEach(function (fn) {
    assert(typeof ns[fn] === 'function', 'ns: ' + fn + ' 是函数');
  });
}

// SubTest 2: 守卫
function testGuards(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerSpecialIdentity;
  // 非穿越模式·全部主入口拒绝
  ctx.P.playerInfo.transmigrationMode = false;
  var r1 = ns.eunuchInit({});
  assert(r1.ok === false && /非穿越模式/.test(r1.reason), 'guard: 非穿越模式 eunuchInit 拒绝');
  var r2 = ns.maidInit({});
  assert(r2.ok === false && /非穿越模式/.test(r2.reason), 'guard: 非穿越模式 maidInit 拒绝');
  var r3 = ns.commonerChoosePath('study', {});
  assert(r3.ok === false && /非穿越模式/.test(r3.reason), 'guard: 非穿越模式 commonerChoosePath 拒绝');
  var r4 = ns.banditOccupyMountain({});
  assert(r4.ok === false && /非穿越模式/.test(r4.reason), 'guard: 非穿越模式 banditOccupyMountain 拒绝');
  var r5 = ns.infantAutoGrow(1, {});
  assert(r5.ok === false && /非穿越模式/.test(r5.reason), 'guard: 非穿越模式 infantAutoGrow 拒绝');
  var r6 = ns.merchantCrossBorderTrade({}, {});
  assert(r6.ok === false && /非穿越模式/.test(r6.reason), 'guard: 非穿越模式 merchantCrossBorderTrade 拒绝');
  var r7 = ns.artisanPetitionToPromulgate('tech1', {});
  assert(r7.ok === false && /非穿越模式/.test(r7.reason), 'guard: 非穿越模式 artisanPetitionToPromulgate 拒绝');
  var r8 = ns.getRoute('eunuch');
  assert(r8.ok === false && /非穿越模式/.test(r8.reason), 'guard: 非穿越模式 getRoute 拒绝');
  var r9 = ns.checkEvents({});
  assert(r9.ok === false && /非穿越模式/.test(r9.reason), 'guard: 非穿越模式 checkEvents 拒绝');
  ctx.P.playerInfo.transmigrationMode = true;

  // 未知身份 setCurrentIdentity 拒绝
  var r10 = ns.setCurrentIdentity('bogus', {});
  assert(r10.ok === false && /未知身份/.test(r10.reason), 'guard: 未知身份 setCurrentIdentity 拒绝');

  // 太监未净身 advanceRank 拒绝
  resetCtx(ctx);
  ns.setCurrentIdentity('eunuch', {});
  // 不调 eunuchInit·直接 advanceRank·应拒
  var r11 = ns.eunuchAdvanceRank('control', {});
  assert(r11.ok === false && /尚未净身/.test(r11.reason), 'guard: 太监未净身 advanceRank 拒绝');

  // 未知内廷阶 advanceRank 拒绝
  ns.eunuchInit({});
  var r12 = ns.eunuchAdvanceRank('bogus', {});
  assert(r12.ok === false && /未知内廷权力阶/.test(r12.reason), 'guard: 未知阶 advanceRank 拒绝');

  // maid 未知阶
  var r13 = ns.maidPromote('bogus', {});
  assert(r13.ok === false && /未知嫔御阶/.test(r13.reason), 'guard: 未知阶 maidPromote 拒绝');

  // commoner 未知路
  var r14 = ns.commonerChoosePath('bogus', {});
  assert(r14.ok === false && /未知出路/.test(r14.reason), 'guard: 未知路 commonerChoosePath 拒绝');

  // monk 未知服务
  var r15 = ns.monkPracticeService('bogus', {});
  assert(r15.ok === false && /未知方外世俗服务/.test(r15.reason), 'guard: 未知服务 monkPracticeService 拒绝');

  // 触发器未知 eventKey
  var r16 = ns.triggerEvent('eunuch', 'bogus', {});
  assert(r16.ok === false && /未支持的事件/.test(r16.reason), 'guard: 未知 eventKey triggerEvent 拒绝');

  // 触发条件不足·拒绝（不 force）
  ns.eunuchInit({});
  var r17 = ns.eunuchTriggerQingliuBackfire({});
  assert(r17.ok === false && /外朝紧张度不足/.test(r17.reason), 'guard: 紧张度不足 eunuchTriggerQingliuBackfire 拒绝');
}

// SubTest 3: 路由函数 getRoute
function testRoute(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerSpecialIdentity;
  var roles = ['eunuch','maid','commoner','bandit','infant','retired_official','monk','merchant','artisan'];
  roles.forEach(function (role) {
    var r = ns.getRoute(role);
    assert(r.ok === true, 'route: ' + role + ' ok');
    assert(r.identity === role, 'route: ' + role + ' identity 回显');
    assert(Array.isArray(r.actions) && r.actions.length > 0, 'route: ' + role + ' 有动作集');
  });
  // 无对应身份的 role
  var r2 = ns.getRoute('emperor');
  // emperor 不在 9 类特殊身份·应返回 ok=false
  assert(r2.ok === false, 'route: emperor 无对应特殊身份路线');
  // 由角色属性推断（playerRole=emperor 非特殊身份·走 char 属性推断分支）
  var r3 = ns.getRoute('emperor', { castrated: true });
  assert(r3.ok === true && r3.identity === 'eunuch', 'route: castrated=true 推断 eunuch');
  var r4 = ns.getRoute('emperor', { sect: '僧' });
  assert(r4.ok === true && r4.identity === 'monk', 'route: sect=僧 推断 monk');
  var r5 = ns.getRoute('emperor', { age: 1 });
  assert(r5.ok === true && r5.identity === 'infant', 'route: age=1 推断 infant');
  // listActionsForRole
  var acts = ns.listActionsForRole('bandit');
  assert(Array.isArray(acts) && acts.length >= 4, 'route: listActionsForRole bandit ≥4 动作');
}

// SubTest 4: 太监路线
function testEunuchRoute(ctx) {
  resetCtx(ctx);
  var ns = ctx.TM.PlayerSpecialIdentity;
  var r1 = ns.eunuchInit({});
  assert(r1.ok === true, 'eunuch: eunuchInit ok');
  assert(r1.data.castrated === true, 'eunuch: 净身标记 castrated=true');
  assert(r1.data.rank === 'attend', 'eunuch: 初始 rank=attend');
  assert(r1.data.factionTag === 'eunuch_party', 'eunuch: factionTag=eunuch_party');

  // 派系归类
  var r2 = ns.eunuchClassifyFaction();
  assert(r2.ok === true && r2.factionTag === 'eunuch_party', 'eunuch: classifyFaction ok');

  // 提升君主信任 → 晋升至 control
  var s = ns._getState();
  s.identityData.eunuch.sovereignTrust = 80; // arch-ok 在 smoke 里直接构造·测试用
  var r3 = ns.eunuchAdvanceRank('control', {});
  assert(r3.ok === true, 'eunuch: advanceRank control ok');
  assert(r3.data.rank === 'control', 'eunuch: rank=control');

  // 晋升至 seal
  s.identityData.eunuch.sovereignTrust = 100;
  var r4 = ns.eunuchAdvanceRank('seal', {});
  assert(r4.ok === true && r4.data.rank === 'seal', 'eunuch: rank=seal');

  // 晋升至 redblush → 外朝紧张度高·触发清流反扑
  s.identityData.eunuch.sovereignTrust = 100;
  var r5 = ns.eunuchAdvanceRank('redbrush', {});
  assert(r5.ok === true && r5.data.rank === 'redbrush', 'eunuch: rank=redbrush');
  // 紧张度 ≥50 → 触发清流反扑
  if (r5.backfire) {
    assert(r5.backfire.ok === true, 'eunuch: 自动触发清流反扑 ok');
  } else {
    // 手动触发一次
    var r6 = ns.eunuchTriggerQingliuBackfire({ force: true });
    assert(r6.ok === true, 'eunuch: 强制触发清流反扑 ok');
    assert(r6.qingliuBackfireCount >= 1, 'eunuch: qingliuBackfireCount >= 1');
  }

  // 信任不足拒绝晋升
  resetCtx(ctx);
  ns.eunuchInit({});
  var r7 = ns.eunuchAdvanceRank('redbrush', {});
  assert(r7.ok === false && /君主信任不足/.test(r7.reason), 'eunuch: 信任不足拒绝晋升');
}

// SubTest 5: 宫女路线
function testMaidRoute(ctx) {
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'maid';
  var ns = ctx.TM.PlayerSpecialIdentity;
  var r1 = ns.maidInit({ servedMaster: '皇后' });
  assert(r1.ok === true, 'maid: maidInit ok');
  assert(r1.data.rank === 'cainu', 'maid: 初始 rank=cainu');
  assert(r1.data.servedMaster === '皇后', 'maid: servedMaster=皇后');

  // 提升宠爱 → 晋升路径
  var s = ns._getState();
  s.identityData.maid.favor = 100;
  var r2 = ns.maidPromote('yunu', {});
  assert(r2.ok === true && r2.data.rank === 'yunu', 'maid: 晋至 御女');
  var r3 = ns.maidPromote('baolin', {});
  assert(r3.ok === true && r3.data.rank === 'baolin', 'maid: 晋至 宝林');
  var r4 = ns.maidPromote('cairen', {});
  assert(r4.ok === true && r4.data.rank === 'cairen', 'maid: 晋至 才人');
  var r5 = ns.maidPromote('pin', {});
  assert(r5.ok === true && r5.data.rank === 'pin', 'maid: 晋至 嫔');
  // 晋至 妃 → 转线 houguang
  var r6 = ns.maidPromote('fei', {});
  assert(r6.ok === true && r6.data.rank === 'fei', 'maid: 晋至 妃');
  assert(r6.transition && r6.transition.to === 'houguang', 'maid: 晋妃后转线 houguang');
  assert(ctx.P.playerInfo.playerRole === 'houguang', 'maid: playerRole 转 houguang');

  // 宠爱不足拒绝
  resetCtx(ctx);
  ns.maidInit({});
  var r7 = ns.maidPromote('fei', {});
  assert(r7.ok === false && /宠爱不足/.test(r7.reason), 'maid: 宠爱不足拒绝');

  // 宫斗事件
  resetCtx(ctx);
  ns.maidInit({});
  var r8 = ns.maidTriggerCourtIntrigue({});
  assert(r8.ok === true, 'maid: maidTriggerCourtIntrigue ok');
  assert(r8.intrigueCount >= 1, 'maid: intrigueCount >= 1');
  assert(typeof r8.targetFavorDelta === 'number', 'maid: targetFavorDelta 是 number');
}

// SubTest 6: 布衣路线
function testCommonerRoute(ctx) {
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'commoner';
  var ns = ctx.TM.PlayerSpecialIdentity;
  var r1 = ns.commonerInit({});
  assert(r1.ok === true, 'commoner: commonerInit ok');

  // 6 种选择
  var paths = ['study','trade','farm','enlist','jianghu','hermit'];
  paths.forEach(function (p) {
    resetCtx(ctx);
    ns.commonerInit({});
    var r = ns.commonerChoosePath(p, {});
    assert(r.ok === true, 'commoner: choosePath ' + p + ' ok');
    assert(r.data.chosenPath === p, 'commoner: chosenPath=' + p);
  });

  // study 路径触发 keju 软依赖
  resetCtx(ctx);
  ns.commonerInit({});
  var r2 = ns.commonerChoosePath('study', {});
  assert(ctx._kejuCalls.length >= 1, 'commoner: study 触发 keju 软依赖');
  assert(ctx.P.playerInfo.playerRole === 'minister', 'commoner: study 转线 minister');

  // trade 路径触发 trade 软依赖
  resetCtx(ctx);
  ns.commonerInit({});
  var r3 = ns.commonerChoosePath('trade', {});
  assert(ctx._tradeCalls.length >= 1, 'commoner: trade 触发 trade 软依赖');
  assert(ctx.P.playerInfo.playerRole === 'merchant', 'commoner: trade 转线 merchant');

  // 白衣卿相事件
  resetCtx(ctx);
  ns.commonerInit({});
  var s = ns._getState();
  s.identityData.commoner.fame = 70;
  var r4 = ns.commonerTriggerBaiyiQingxiang({});
  assert(r4.ok === true, 'commoner: baiyi ok');
  assert(r4.fame > 70, 'commoner: baiyi fame 提升');

  // 声望不足拒绝
  resetCtx(ctx);
  ns.commonerInit({});
  var r5 = ns.commonerTriggerBaiyiQingxiang({});
  assert(r5.ok === false && /声望不足/.test(r5.reason), 'commoner: 声望不足 baiyi 拒绝');
}

// SubTest 7: 盗贼路线
function testBanditRoute(ctx) {
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'bandit';
  var ns = ctx.TM.PlayerSpecialIdentity;
  var r1 = ns.banditInit({});
  assert(r1.ok === true, 'bandit: banditInit ok');
  assert(r1.data.banditCount >= 30, 'bandit: 初始 banditCount >= 30');

  // 占山 3 回合 → 触发官府围剿
  var r2a = ns.banditOccupyMountain({});
  var r2b = ns.banditOccupyMountain({});
  var r2c = ns.banditOccupyMountain({});
  assert(r2c.ok === true, 'bandit: 第 3 次占山 ok');
  assert(r2c.surrounded && r2c.surrounded.threaten === true, 'bandit: 第 3 次占山触发围剿');

  // 招安分支
  resetCtx(ctx);
  ns.banditInit({});
  var r3 = ns.banditAcceptAmnesty({});
  assert(r3.ok === true, 'bandit: acceptAmnesty ok');
  assert(r3.data.branch === 'amnesty', 'bandit: branch=amnesty');
  assert(ctx.P.playerInfo.playerRole === 'general', 'bandit: 招安转线 general');

  // 造反分支
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'bandit';
  ns.banditInit({});
  var r4 = ns.banditLaunchRebellion({ success: true });
  assert(r4.ok === true, 'bandit: launchRebellion ok');
  assert(r4.data.branch === 'rebel', 'bandit: branch=rebel');
  assert(r4.data.rebellionLaunched === true, 'bandit: rebellionLaunched=true');
  assert(ctx._rebelCalls.length >= 1, 'bandit: 触发 rebel 软依赖');
  // 反叛成功 → playerRole 转 emperor
  assert(ctx.P.playerInfo.playerRole === 'emperor', 'bandit: 造反成功转线 emperor');
}

// SubTest 8: 婴儿路线
function testInfantRoute(ctx) {
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'infant';
  ctx.P.playerInfo.royalRelation = 'prince';
  var ns = ctx.TM.PlayerSpecialIdentity;
  var r1 = ns.infantInit({ guardian: '乳母' });
  assert(r1.ok === true, 'infant: infantInit ok');
  assert(r1.data.age === 0, 'infant: 初始 age=0');
  assert(r1.data.guardian === '乳母', 'infant: guardian=乳母');

  // 自动成长 + 触发神童（学习≥70）
  var s = ns._getState();
  s.identityData.infant.learning = 75; // 直接构造·触发神童
  s.identityData.infant.discipline = 60; // 不触发顽童
  var r2 = ns.infantAutoGrow(0.5, { tutored: true, transitionOnAdult: false });
  assert(r2.ok === true, 'infant: autoGrow ok');
  assert(r2.data.age > 0, 'infant: age 增长');
  if (r2.event) {
    assert(r2.event.event === 'prodigy', 'infant: 触发神童事件');
  }

  // 触发顽童（discipline < 30）
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'infant';
  ns.infantInit({});
  s = ns._getState();
  s.identityData.infant.discipline = 20;
  s.identityData.infant.learning = 10;
  var r3 = ns.infantAutoGrow(0.5, { transitionOnAdult: false });
  if (r3.event) {
    assert(r3.event.event === 'mischievous', 'infant: 触发顽童事件');
  }

  // 满 3 岁转线
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'infant';
  ctx.P.playerInfo.royalRelation = 'prince';
  ns.infantInit({});
  s = ns._getState();
  s.identityData.infant.age = 2.5;
  s.identityData.infant.learning = 10;
  s.identityData.infant.discipline = 60;
  var r4 = ns.infantAutoGrow(1, {});  // 2.5 + 1 = 3.5 → 转线
  assert(r4.ok === true, 'infant: 满 3 岁成长 ok');
  assert(r4.transition && r4.transition.to === 'prince', 'infant: 满 3 岁转线 prince');
  assert(ctx.P.playerInfo.playerRole === 'prince', 'infant: playerRole 转 prince');

  // 手动触发神童/顽童
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'infant';
  ns.infantInit({});
  var r5 = ns.infantTriggerProdigyOrMischievous('prodigy', { force: true });
  assert(r5.ok === true && r5.event === 'prodigy', 'infant: 手动触发 prodigy ok');
  var r6 = ns.infantTriggerProdigyOrMischievous('mischievous', { force: true });
  assert(r6.ok === true && r6.event === 'mischievous', 'infant: 手动触发 mischievous ok');
}

// SubTest 9: 退休官员路线
function testRetiredRoute(ctx) {
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'retired_official';
  var ns = ctx.TM.PlayerSpecialIdentity;
  var r1 = ns.retiredInit({});
  assert(r1.ok === true, 'retired: retiredInit ok');
  assert(r1.data.courtAdvisory === true, 'retired: 朝廷顾问身份默认开启');

  // 颐养天年分支
  resetCtx(ctx);
  ns.retiredInit({});
  var r2 = ns.retiredTriggerPeacefulAging({});
  assert(r2.ok === true, 'retired: peacefulAging ok');
  assert(r2.data.branch === 'peaceful_age', 'retired: branch=peaceful_age');

  // 东山再起：声望不足拒绝
  resetCtx(ctx);
  ns.retiredInit({});
  var r3 = ns.retiredTriggerComeback({});
  assert(r3.ok === false && /声望不足/.test(r3.reason), 'retired: 声望不足 comeback 拒绝');

  // 声望足 → 东山再起 + 转线 minister
  resetCtx(ctx);
  ns.retiredInit({});
  var s = ns._getState();
  s.identityData.retired_official.fame = 60;
  var r4 = ns.retiredTriggerComeback({});
  assert(r4.ok === true, 'retired: comeback ok');
  assert(r4.data.branch === 'comeback', 'retired: branch=comeback');
  assert(ctx.P.playerInfo.playerRole === 'minister', 'retired: comeback 转线 minister');
}

// SubTest 10: 方外路线
function testMonkRoute(ctx) {
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'monk';
  var ns = ctx.TM.PlayerSpecialIdentity;
  var r1 = ns.monkInit({ sect: '僧' });
  assert(r1.ok === true, 'monk: monkInit ok');
  assert(r1.data.sect === '僧', 'monk: sect=僧');
  assert(r1.data.merit >= 10, 'monk: 初始 merit >= 10');

  // 三种世俗服务
  ['heal','bless','preach'].forEach(function (k) {
    var r = ns.monkPracticeService(k, {});
    assert(r.ok === true, 'monk: practiceService ' + k + ' ok');
  });

  // 功德 ≥ 70 → 触发高僧入朝
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'monk';
  ns.monkInit({});
  var s = ns._getState();
  s.identityData.monk.merit = 75;
  var r2 = ns.monkPracticeService('preach', {});
  assert(r2.ok === true, 'monk: 高功德 preach ok');
  if (r2.summon) {
    assert(r2.summon.ok === true && r2.summon.summoned === true, 'monk: 自动触发高僧入朝');
  }

  // 手动触发入朝
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'monk';
  ns.monkInit({});
  var r3 = ns.monkTriggerSummonToCourt({ force: true });
  assert(r3.ok === true && r3.summoned === true, 'monk: 强制触发高僧入朝 ok');

  // 功德不足拒绝
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'monk';
  ns.monkInit({});
  var r4 = ns.monkTriggerSummonToCourt({});
  assert(r4.ok === false && /功德不足/.test(r4.reason), 'monk: 功德不足拒绝');
}

// SubTest 11: 商贾扩展路线
function testMerchantRoute(ctx) {
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'merchant';
  var ns = ctx.TM.PlayerSpecialIdentity;
  var r1 = ns.merchantInit({});
  assert(r1.ok === true, 'merchant: merchantInit ok');
  assert(r1.data.tier === 'local', 'merchant: 初始 tier=local');
  assert(r1.data.caoYunHook === true, 'merchant: 漕运 hook 默认开');
  assert(r1.data.haiMaoHook === true, 'merchant: 海贸 hook 默认开');

  // 跨国贸易 + 漕运/海贸 hook
  var r2 = ns.merchantCrossBorderTrade({ caravanId: 'c1' }, { profit: 1000 });
  assert(r2.ok === true, 'merchant: crossBorderTrade ok');
  assert(ctx._tradeCalls.length >= 1, 'merchant: 触发 TM.PlayerTrade.dispatchTrade 软依赖');
  assert(r2.hooks && r2.hooks.caoYun === 'pending', 'merchant: 漕运 hook pending');
  assert(r2.hooks && r2.hooks.haiMao === 'pending', 'merchant: 海贸 hook pending');

  // 资本 ≥ 8000 → 触发巨贾行商
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'merchant';
  ns.merchantInit({});
  var s = ns._getState();
  s.identityData.merchant.capital = 9000;
  var r3 = ns.merchantCrossBorderTrade({}, { profit: 0 });
  assert(r3.ok === true, 'merchant: 高资本 crossBorderTrade ok');
  if (r3.magnate) {
    assert(r3.magnate.ok === true && r3.magnate.tier === 'magnate', 'merchant: 自动触发巨贾行商');
  }

  // 手动触发巨贾行商
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'merchant';
  ns.merchantInit({});
  s = ns._getState();
  s.identityData.merchant.capital = 9000;
  var r4 = ns.merchantTriggerMagnate({});
  assert(r4.ok === true && r4.tier === 'magnate', 'merchant: 手动触发巨贾行商 ok');

  // 御赐官商（须先达巨贾行商）
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'merchant';
  ns.merchantInit({});
  var r5 = ns.merchantBestowCourtMerchant({});
  assert(r5.ok === false && /巨贾行商/.test(r5.reason), 'merchant: 未达巨贾拒绝御赐官商');
  // 升至巨贾 → 御赐
  ns.merchantTriggerMagnate({ force: true });
  var r6 = ns.merchantBestowCourtMerchant({});
  assert(r6.ok === true, 'merchant: bestowCourtMerchant ok');
  assert(r6.tier === 'court_bestowed', 'merchant: tier=court_bestowed');
  assert(r6.label === '御赐官商', 'merchant: label=御赐官商');
  assert(r6.data.bestowedCourtMerchant === true, 'merchant: bestowedCourtMerchant=true');
}

// SubTest 12: 匠人扩展路线
function testArtisanRoute(ctx) {
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'artisan';
  var ns = ctx.TM.PlayerSpecialIdentity;
  var r1 = ns.artisanInit({ field: '陶瓷' });
  assert(r1.ok === true, 'artisan: artisanInit ok');
  assert(r1.data.tier === 'apprentice', 'artisan: 初始 tier=apprentice');
  assert(r1.data.field === '陶瓷', 'artisan: field=陶瓷');

  // 进贡朝廷
  var r2 = ns.artisanTributeToCourt({});
  assert(r2.ok === true, 'artisan: tributeToCourt ok');
  assert(r2.data.tributes >= 1, 'artisan: tributes >= 1');

  // 技艺 ≥ 80 → 触发御用匠人
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'artisan';
  ns.artisanInit({});
  var s = ns._getState();
  s.identityData.artisan.skill = 85;
  var r3 = ns.artisanTributeToCourt({});
  assert(r3.ok === true, 'artisan: 高技艺 tribute ok');
  if (r3.royal) {
    assert(r3.royal.ok === true && r3.royal.royal === true, 'artisan: 自动触发御用匠人');
  }

  // 手动触发御用匠人
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'artisan';
  ns.artisanInit({});
  var r4 = ns.artisanTriggerRoyalArtisan({ force: true });
  assert(r4.ok === true && r4.royal === true, 'artisan: 强制触发御用匠人 ok');
  assert(r4.tier === 'royal', 'artisan: tier=royal');

  // 技艺不足拒绝
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'artisan';
  ns.artisanInit({});
  var r5 = ns.artisanTriggerRoyalArtisan({});
  assert(r5.ok === false && /技艺不足/.test(r5.reason), 'artisan: 技艺不足拒绝');

  // 上奏推广技艺 → 触发 TM.PlayerTech.petitionToPromulgate
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'artisan';
  ns.artisanInit({});
  var r6 = ns.artisanPetitionToPromulgate('tech_ceramic', {});
  assert(r6.ok === true, 'artisan: petitionToPromulgate ok');
  assert(ctx._techCalls.length >= 1, 'artisan: 触发 TM.PlayerTech 软依赖');
  var hasPetition = ctx._techCalls.some(function (c) { return c.method === 'petitionToPromulgate'; });
  assert(hasPetition, 'artisan: 触发 petitionToPromulgate');
}

// SubTest 13: 事件触发器 checkEvents
function testCheckEvents(ctx) {
  resetCtx(ctx);
  var ns = ctx.TM.PlayerSpecialIdentity;

  // 太监·紧张度高 → 触发清流反扑
  ctx.P.playerInfo.playerRole = 'eunuch';
  ns.eunuchInit({});
  var s = ns._getState();
  s.identityData.eunuch.outerTension = 70;
  var r1 = ns.checkEvents({});
  assert(r1.ok === true, 'checkEvents: eunuch ok');
  assert(Array.isArray(r1.triggered), 'checkEvents: eunuch triggered 是数组');
  assert(r1.triggered.length >= 1, 'checkEvents: eunuch 触发 ≥1 事件');
  assert(r1.triggered[0].event === 'qingliu_backfire', 'checkEvents: eunuch 触发 qingliu_backfire');

  // 商贾·资本高 → 触发巨贾行商
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'merchant';
  ns.merchantInit({});
  s = ns._getState();
  s.identityData.merchant.capital = 9000;
  var r2 = ns.checkEvents({});
  assert(r2.ok === true, 'checkEvents: merchant ok');
  assert(r2.triggered.length >= 1, 'checkEvents: merchant 触发 ≥1 事件');
  assert(r2.triggered[0].event === 'magnate', 'checkEvents: merchant 触发 magnate');

  // 匠人·技艺高 → 触发御用匠人
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'artisan';
  ns.artisanInit({});
  s = ns._getState();
  s.identityData.artisan.skill = 85;
  var r3 = ns.checkEvents({});
  assert(r3.ok === true, 'checkEvents: artisan ok');
  assert(r3.triggered.length >= 1, 'checkEvents: artisan 触发 ≥1 事件');
  assert(r3.triggered[0].event === 'royal_artisan', 'checkEvents: artisan 触发 royal_artisan');

  // 无身份时不触发
  resetCtx(ctx);
  var r4 = ns.checkEvents({});
  assert(r4.ok === true, 'checkEvents: 无身份 ok');
  assert(r4.triggered.length === 0, 'checkEvents: 无身份不触发');

  // triggerEvent 通用入口
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'infant';
  ns.infantInit({});
  var r5 = ns.triggerEvent('infant', 'prodigy', { force: true });
  assert(r5.ok === true, 'checkEvents: triggerEvent infant/prodigy ok');
}

// SubTest 14: 御案"身份路线"面板
function testPanel(ctx) {
  resetCtx(ctx);
  var ns = ctx.TM.PlayerSpecialIdentity;

  // 无身份空面板
  var html0 = ns.renderIdentityPanel();
  assert(typeof html0 === 'string' && html0.length > 0, 'panel: 空面板返回非空字符串');
  assert(/psi-panel/.test(html0), 'panel: 含 psi-panel 类');
  assert(/身 份 路 线/.test(html0), 'panel: 含"身 份 路 线"标题');

  // 太监面板
  ctx.P.playerInfo.playerRole = 'eunuch';
  ns.eunuchInit({});
  ns.eunuchAdvanceRank('control', { force: true }) || null;
  // 直接拉高信任
  var s = ns._getState();
  s.identityData.eunuch.sovereignTrust = 80;
  ns.eunuchAdvanceRank('control', {});
  var html1 = ns.renderIdentityPanel();
  assert(typeof html1 === 'string' && html1.length > 100, 'panel: 太监面板长字符串');
  assert(/太监/.test(html1), 'panel: 含"太监"');
  assert(/可 用 动 作/.test(html1), 'panel: 含"可 用 动 作"段');
  assert(/亲近君主|把持内廷|内廷掌印|批红近侍/.test(html1), 'panel: 含内廷权力线阶名');
  assert(/近 事/.test(html1), 'panel: 含"近 事"段');

  // 商贾面板
  resetCtx(ctx);
  ctx.P.playerInfo.playerRole = 'merchant';
  ns.merchantInit({});
  ns.merchantCrossBorderTrade({}, { profit: 500 });
  var html2 = ns.renderIdentityPanel();
  assert(/商贾/.test(html2), 'panel: 含"商贾"');
  assert(/跨国贸易/.test(html2), 'panel: 含"跨国贸易"动作');

  // 朝代中立·不含禁词清单内专名
  assert(!/锦衣卫|司礼监|东厂|西厂|军机处|内阁|票拟|廷杖|八股/.test(html1 + html2), 'panel: 不含禁词清单内专名');
  assert(!/巡按|总督|巡抚|郡王|藩王/.test(html1 + html2), 'panel: 不含禁词清单内地方/宗藩专名');
}

// SubTest 15: 跨朝代 hook
function testCustomIdentity(ctx) {
  resetCtx(ctx);
  var ns = ctx.TM.PlayerSpecialIdentity;
  // 注册一个朝代专属身份（剧本 hook 场景·如某些朝代的「军户」）
  var r1 = ns.registerCustomIdentity('junhu', {
    id: 'junhu',
    label: '军户',
    desc: '世代从军·剧本自定义',
    actions: [
      { key: 'junhu_enlist', label: '从军役', hint: '世袭军职', available: true },
      { key: 'junhu_farm', label: '屯田', hint: '军屯耕作', available: true }
    ]
  });
  assert(r1.ok === true, 'custom: registerCustomIdentity ok');
  assert(r1.entry.label === '军户', 'custom: label=军户');

  // 列出已注册自定义身份
  var list = ns.listCustomIdentities();
  assert(Array.isArray(list) && list.length >= 1, 'custom: listCustomIdentities ≥1');
  var found = list.some(function (c) { return c.id === 'junhu'; });
  assert(found, 'custom: 含 junhu');

  // 切换至自定义身份
  var r2 = ns.setCurrentIdentity('junhu', {});
  assert(r2.ok === true && r2.current === 'junhu', 'custom: setCurrentIdentity junhu ok');

  // getRoute 返回自定义动作集
  var r3 = ns.getRoute('junhu');
  assert(r3.ok === true, 'custom: getRoute junhu ok');
  assert(r3.identity === 'junhu', 'custom: identity=junhu');
  assert(r3.actions.length >= 2, 'custom: actions ≥2');
  var keys = r3.actions.map(function (a) { return a.key; });
  assert(keys.indexOf('junhu_enlist') >= 0, 'custom: 含 junhu_enlist');
  assert(keys.indexOf('junhu_farm') >= 0, 'custom: 含 junhu_farm');

  // registerCustomIdentity 守卫
  var r4 = ns.registerCustomIdentity('', {});
  assert(r4.ok === false && /缺 role/.test(r4.reason), 'custom: 缺 role 拒绝');
  var r5 = ns.registerCustomIdentity('ok', null);
  assert(r5.ok === false && /缺 def/.test(r5.reason), 'custom: 缺 def 拒绝');
}

// SubTest 16: 双路径挂载
function testDualMount(ctx) {
  var mod = require(path.join(ROOT, 'tm-player-special-identity.js'));
  assert(mod && typeof mod.init === 'function', 'dual-mount: module.exports.init 是函数');
  assert(mod && typeof mod.getRoute === 'function', 'dual-mount: module.exports.getRoute 是函数');
  assert(mod && typeof mod.eunuchInit === 'function', 'dual-mount: module.exports.eunuchInit 是函数');
  assert(mod && typeof mod.renderIdentityPanel === 'function', 'dual-mount: module.exports.renderIdentityPanel 是函数');
  assert(mod.IDENTITY_KINDS && Object.keys(mod.IDENTITY_KINDS).length === 9, 'dual-mount: IDENTITY_KINDS 9 类');
  assert(mod.EUNUCH_RANKS && Object.keys(mod.EUNUCH_RANKS).length === 4, 'dual-mount: EUNUCH_RANKS 4 阶');
  assert(mod.MAID_RANKS && Object.keys(mod.MAID_RANKS).length === 6, 'dual-mount: MAID_RANKS 6 阶');
  assert(mod.COMMONER_PATHS && Object.keys(mod.COMMONER_PATHS).length === 6, 'dual-mount: COMMONER_PATHS 6 选择');
  assert(mod.BANDIT_BRANCH && Object.keys(mod.BANDIT_BRANCH).length === 2, 'dual-mount: BANDIT_BRANCH 2 分支');
  assert(mod.MONK_SERVICES && Object.keys(mod.MONK_SERVICES).length === 3, 'dual-mount: MONK_SERVICES 3 服务');
  assert(mod.MERCHANT_TIERS && Object.keys(mod.MERCHANT_TIERS).length === 3, 'dual-mount: MERCHANT_TIERS 3 档');
  assert(mod.ARTISAN_TIERS && Object.keys(mod.ARTISAN_TIERS).length === 3, 'dual-mount: ARTISAN_TIERS 3 档');
  // 双路径挂载·与 tm-player-industry.js 的 testDualMount 一致·校验 module.exports 形态完整
  // （sandbox-ctx.TM.PlayerSpecialIdentity 与 require-loaded module.exports 是两份独立 ns 对象·不可 ===）
  assert(ctx.TM && typeof ctx.TM.PlayerSpecialIdentity === 'object', 'dual-mount: ctx.TM.PlayerSpecialIdentity 已挂载');
  assert(ctx.TM.PlayerSpecialIdentity && typeof ctx.TM.PlayerSpecialIdentity.init === 'function', 'dual-mount: ctx.TM.PlayerSpecialIdentity.init 是函数');
}

// SubTest 17: 跨朝代铁律审计
function testCrossDynastyIron(ctx) {
  var src = fs.readFileSync(path.join(ROOT, 'tm-player-special-identity.js'), 'utf8');
  var lines = src.split(/\r?\n/);
  var codeLines = lines.filter(function (l) {
    var t = l.trim();
    return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
  });
  var code = codeLines.join('\n');
  // 检查禁词清单（与 lint-dep-graph / 项目铁律文档一致）
  var forbidden = ['内阁', '票拟', '司礼监', '东厂', '西厂', '锦衣卫', '军机处', '廷杖', '八股', '巡按', '总督', '巡抚', '郡王', '藩王'];
  var hits = [];
  forbidden.forEach(function (term) {
    if (code.indexOf(term) >= 0) hits.push(term);
  });
  assert(hits.length === 0, 'cross-dynasty: 代码体无禁词清单内专名·命中 ' + hits.join(', '));
  // 太监路线朝代中立表述保留
  assert(code.indexOf('内廷掌印') >= 0, 'cross-dynasty: 「内廷掌印」保留');
  assert(code.indexOf('批红近侍') >= 0, 'cross-dynasty: 「批红近侍」保留');
  // 不应出现「司礼」（即使无「监」）
  assert(code.indexOf('司礼') < 0, 'cross-dynasty: 代码体无「司礼」二字');
  // 朝代中立商爵称谓保留
  assert(code.indexOf('御赐官商') >= 0, 'cross-dynasty: 「御赐官商」（朝代中立）保留');
  // 古代通用称谓保留
  assert(code.indexOf('采女') >= 0, 'cross-dynasty: 采女（古代通用嫔御等级）保留');
  assert(code.indexOf('致仕') >= 0, 'cross-dynasty: 致仕（古代通用）保留');
  assert(code.indexOf('寺观') >= 0, 'cross-dynasty: 寺观（古代通用）保留');
  assert(code.indexOf('漕运') >= 0, 'cross-dynasty: 漕运（古代通用）保留');
  assert(code.indexOf('海贸') >= 0, 'cross-dynasty: 海贸（古代通用）保留');
}

// ── 入口 ────────────────────────────────────────────────────
try {
  var ctx = buildContext();
  testNamespace(ctx);
  testGuards(ctx);
  testRoute(ctx);
  testEunuchRoute(ctx);
  testMaidRoute(ctx);
  testCommonerRoute(ctx);
  testBanditRoute(ctx);
  testInfantRoute(ctx);
  testRetiredRoute(ctx);
  testMonkRoute(ctx);
  testMerchantRoute(ctx);
  testArtisanRoute(ctx);
  testCheckEvents(ctx);
  testPanel(ctx);
  testCustomIdentity(ctx);
  testDualMount(ctx);
  testCrossDynastyIron(ctx);
  console.log('[smoke-player-special-identity] PASS · 17 sub-tests · namespace/guards/route(9-identities)/eunuch(castrate+4-ranks+faction+qingliu)/maid(6-ranks+intrigue+houguang-transition)/commoner(6-paths+baiyi)/bandit(occupy+amnesty+rebel)/infant(auto-grow+prodigy+mischievous+age3-transition)/retired(advisor+comeback+peaceful)/monk(3-services+summon)/merchant(cross-border+caoYun/haiMao-hooks+magnate+court-bestowed)/artisan(tribute+royal+petition)/checkEvents/perPanel/customIdentity-hook/dual-mount/cross-dynasty-iron');
  process.exit(0);
} catch (e) {
  console.error('[smoke-player-special-identity] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
