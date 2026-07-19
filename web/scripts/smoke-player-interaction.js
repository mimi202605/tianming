#!/usr/bin/env node
// scripts/smoke-player-interaction.js — Phase 4.5 · Task 15 玩家人物互动系统 smoke
// 验证：
//   - TM.PlayerInteraction 命名空间暴露（双路径：globalThis + module.exports）
//   - interact(npcName, kind, payload) 主入口·10 种 kind 各能跑通
//   - 精力消耗（_spendEnergy 全局被调用·或降级 GM._energy 直减）
//   - 时间推进（GM.turn 累积满 12 小时 +1）
//   - LLM 降级（无 LLM 时返回确定性 mock 文本）
//   - 5 维关系值更新（_playerRelDims + NPC relations）
//   - 记忆写入（P.playerInfo._playerMemory + NpcMemorySystem.remember）
//   - 联姻·双方 family/familyAlliances 建立姻亲
//   - 事件钩子·禁军将领 + 死党 + 密谈 → 政变提示
//   - 守卫：非穿越模式 / 未知 kind / NPC 不存在 / 精力不足 各拒
//   - 御案面板：listInteractableNpcs + getActionMenu

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

// ── 加载 tm-player-interaction.js（IIFE 模式，sandbox.window = ctx）──
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
    fs.readFileSync(path.join(ROOT, 'tm-player-interaction.js'), 'utf8'),
    ctx, { filename: 'tm-player-interaction.js' }
  );
  return ctx;
}

// ── Mock 全局 P/GM/TM + NPC 阵容 ──
function setupCtx(ctx, opts) {
  opts = opts || {};
  var energyCalls = [];
  ctx._energyCalls = energyCalls;

  // 玩家：李大臣（穿越模式·minister）
  var playerCh = { name: '李大臣', alive: true, officialTitle: '尚书', role: '臣', personality: '刚直' };
  // NPC1：王将军（禁军将领·军中·用于政变钩子）
  var npcGeneral = { name: '王将军', alive: true, officialTitle: '禁军大将', role: '武将', personality: '豪迈' };
  // NPC2：张文人（文臣·非军中）
  var npcScholar = { name: '张文人', alive: true, officialTitle: '侍郎', role: '臣', personality: '温润' };
  // NPC3：已故 NPC（守卫测试）
  var npcDead = { name: '故人', alive: false, officialTitle: '已故', role: '臣' };
  // 君主（不可选）
  var sovereign = { name: '今上', alive: true, officialTitle: '皇帝', role: '皇帝', isEmperor: true };

  ctx.GM = {
    sid: 'smoke',
    turn: 10,
    _energy: 50,
    _energyMax: 100,
    chars: [playerCh, npcGeneral, npcScholar, npcDead, sovereign]
  };
  ctx.P = {
    playerInfo: {
      transmigrationMode: true,
      playerRole: 'minister',
      characterName: '李大臣',
      characterTitle: '尚书',
      sovereignName: '今上',
      familyName: '李氏'
    }
  };

  // mock 全局 _spendEnergy（与 tm-launch.js 同款·用于验证主路径被调用）
  ctx._spendEnergy = function (cost, label) {
    energyCalls.push({ cost: cost, label: label });
    if (ctx.GM._energy < cost) return false;
    ctx.GM._energy -= cost;
    return true;
  };

  // mock findCharByName（直接读 GM.chars）
  ctx.findCharByName = function (name) {
    return ctx.GM.chars.find(function (c) { return c && c.name === name; }) || null;
  };

  // mock canonicalizeCharName（直通）
  ctx.canonicalizeCharName = function (n) { return n; };

  // mock _offIsSovereign（识别君主）
  ctx._offIsSovereign = function (c) { return !!(c && c.isEmperor); };

  // mock TM.Transmigration（isTransmigrationMode + derivePlayerRole）
  if (!ctx.TM) ctx.TM = {};
  ctx.TM.Transmigration = {
    isTransmigrationMode: function () { return !!ctx.P.playerInfo.transmigrationMode; },
    derivePlayerRole: function (c) {
      if (!c) return 'commoner';
      if (c.isEmperor) return 'emperor';
      if (/将军|大将/.test(c.officialTitle || '')) return 'general';
      return 'minister';
    }
  };

  // mock NpcMemorySystem.remember（记录调用）
  ctx._npcMemCalls = [];
  ctx.NpcMemorySystem = {
    remember: function (name, event, emo, imp, who, meta) {
      ctx._npcMemCalls.push({ name: name, event: event, emo: emo, imp: imp, who: who, meta: meta });
    }
  };

  // mock applyNpcInteraction / ensureCharRelation（复用 tm-relations.js 的真接口形态·但简化）
  ctx.NPC_INTERACTION_TYPES = {
    private_visit: { label: '私访', conflict: 0, effect: { affinity: +5, trust: +5 }, mood: '喜', important: 4 },
    correspond_secret: { label: '密信', conflict: 0, effect: { trust: +8 }, mood: '平', important: 5 },
    recommend: { label: '举荐', conflict: 0, effect: { respect: +8 }, mood: '喜', important: 6 },
    invite_banquet: { label: '宴请', conflict: 0, effect: { affinity: +6 }, mood: '喜', important: 4 },
    gift_present: { label: '馈赠', conflict: 0, effect: { affinity: +4 }, mood: '喜', important: 3 },
    marriage_alliance: { label: '联姻', conflict: 0, effect: { affinity: +15, trust: +10 }, mood: '喜', important: 8 },
    confront: { label: '对质', conflict: +1, effect: { affinity: -10 }, mood: '恨', important: 6 },
    frame_up: { label: '构陷', conflict: +2, effect: { affinity: -25, hostility: +30 }, mood: '恨', important: 10 },
    form_clique: { label: '结党', conflict: 0, effect: { trust: +10 }, mood: '平', important: 5 },
    master_disciple: { label: '师徒缔结', conflict: 0, effect: { respect: +20, affinity: +10 }, mood: '喜', important: 9 }
  };
  ctx._applyNpcCalls = [];
  ctx.applyNpcInteraction = function (actor, target, type, extra) {
    ctx._applyNpcCalls.push({ actor: actor, target: target, type: type, extra: extra });
    // 真模拟·为双方 ensureCharRelation 后落 effect（与 tm-relations.js 同款·双向建·effect 落 rBA=target→actor）
    var rAB = ctx.ensureCharRelation(actor, target);
    var rBA = ctx.ensureCharRelation(target, actor);
    var def = ctx.NPC_INTERACTION_TYPES[type];
    if (def && def.effect && rBA) {
      Object.keys(def.effect).forEach(function (k) {
        rBA[k] = (rBA[k] || 0) + def.effect[k];
      });
    }
    return true;
  };
  ctx.ensureCharRelation = function (a, b) {
    if (!a || !b || a === b) return null;
    var ach = ctx.findCharByName(a);
    if (!ach) return null;
    if (!ach.relations) ach.relations = {};
    if (!ach.relations[b]) {
      ach.relations[b] = { affinity: 50, trust: 50, respect: 50, fear: 0, hostility: 0, labels: [], history: [], conflictLevel: 0 };
    }
    return ach.relations[b];
  };
}

// ── Sub-tests ───────────────────────────────────────────────

function testNamespace(ctx) {
  assert(ctx.TM && ctx.TM.PlayerInteraction, 'namespace: TM.PlayerInteraction 暴露');
  var ns = ctx.TM.PlayerInteraction;
  assert(typeof ns.interact === 'function', 'namespace: interact 是函数');
  assert(typeof ns.listInteractableNpcs === 'function', 'namespace: listInteractableNpcs 是函数');
  assert(typeof ns.getActionMenu === 'function', 'namespace: getActionMenu 是函数');
  assert(typeof ns.getRelationDims === 'function', 'namespace: getRelationDims 是函数');
  assert(ns.KINDS && Object.keys(ns.KINDS).length === 10, 'namespace: KINDS 共 10 种');
  assert(ns.DIMS && Object.keys(ns.DIMS).length === 5, 'namespace: DIMS 共 5 维');
  var expectedKinds = ['visit','secretTalk','entrust','befriend','gift','marry','antagonize','frame','recruit','disciple'];
  expectedKinds.forEach(function (k) {
    assert(ns.KINDS[k], 'namespace: KINDS.' + k + ' 存在');
  });
  var expectedDims = ['master','friend','rival','colleague','enemy'];
  expectedDims.forEach(function (k) {
    assert(ns.DIMS[k], 'namespace: DIMS.' + k + ' 存在');
  });
}

function testGuards(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerInteraction;

  // 非穿越模式
  ctx.P.playerInfo.transmigrationMode = false;
  var r1 = ns.interact('王将军', 'visit', {});
  assert(r1.ok === false, 'guard: 非穿越模式拒绝');
  assert(/非穿越模式/.test(r1.reason), 'guard: 非穿越模式 reason');
  ctx.P.playerInfo.transmigrationMode = true;

  // 未知 kind
  var r2 = ns.interact('王将军', 'bogusKind', {});
  assert(r2.ok === false, 'guard: 未知 kind 拒绝');
  assert(/未知互动类型/.test(r2.reason), 'guard: 未知 kind reason');

  // 未指定 NPC
  var r3 = ns.interact('', 'visit', {});
  assert(r3.ok === false, 'guard: 未指定 NPC 拒绝');

  // NPC 不存在
  var r4 = ns.interact('不存在的人', 'visit', {});
  assert(r4.ok === false, 'guard: NPC 不存在拒绝');
  assert(/未找到 NPC/.test(r4.reason), 'guard: NPC 不存在 reason');

  // NPC 已故
  var r5 = ns.interact('故人', 'visit', {});
  assert(r5.ok === false, 'guard: 已故 NPC 拒绝');
  assert(/不在人世/.test(r5.reason), 'guard: 已故 NPC reason');

  // 精力不足
  ctx.GM._energy = 0;
  var r6 = ns.interact('王将军', 'visit', {});
  assert(r6.ok === false, 'guard: 精力不足拒绝');
  assert(/精力不足/.test(r6.reason), 'guard: 精力不足 reason');
  ctx.GM._energy = 50;
}

function testTenKinds(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerInteraction;
  var kinds = ['visit','secretTalk','entrust','befriend','gift','marry','antagonize','frame','recruit','disciple'];

  // 重置精力·避免被前面 test 耗光
  ctx.GM._energy = 200;
  ctx.GM._energyMax = 200;

  kinds.forEach(function (k) {
    var before = ctx.GM._energy;
    var r = ns.interact('张文人', k, { topic: '试论', intent: '结欢' });
    assert(r.ok === true, 'kind=' + k + ': ok');
    assert(r.kind === k, 'kind=' + k + ': kind 回显');
    assert(r.npc === '张文人', 'kind=' + k + ': npc 回显');
    assert(r.player === '李大臣', 'kind=' + k + ': player 回显');
    assert(typeof r.scene === 'string' && r.scene.length > 0, 'kind=' + k + ': scene 非空字符串');
    assert(r.energy.cost === ns.KINDS[k].energy, 'kind=' + k + ': energy.cost');
    assert(r.time.hours === ns.KINDS[k].time, 'kind=' + k + ': time.hours');
    assert(r.relation && r.relation.delta, 'kind=' + k + ': relation.delta 存在');
    assert(r.memory && r.memory.kind === k, 'kind=' + k + ': memory.kind');
    // 精力消耗
    assert(ctx.GM._energy === before - ns.KINDS[k].energy, 'kind=' + k + ': GM._energy 减 ' + ns.KINDS[k].energy);
    // 记忆私账
    assert(ctx.P.playerInfo._playerMemory && ctx.P.playerInfo._playerMemory.some(function (m) { return m.kind === k; }),
      'kind=' + k + ': 玩家记忆已写入');
  });

  // applyNpcInteraction 应被调用（主路径）
  assert(ctx._applyNpcCalls.length === 10, '主路径: applyNpcInteraction 调用 10 次·实际 ' + ctx._applyNpcCalls.length);
  // NpcMemorySystem.remember 应被调用
  assert(ctx._npcMemCalls.length === 10, '记忆: NpcMemorySystem.remember 调用 10 次·实际 ' + ctx._npcMemCalls.length);
}

function testRelationUpdate(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerInteraction;
  ctx.GM._energy = 200;

  // friend 维·拜访后张文人对玩家的 friend dim 应 +
  var before = ns.getRelationDims('张文人');
  assert(before && before.friend.value === 50, 'rel: 初始 friend=50');
  ns.interact('张文人', 'visit', {});
  var after = ns.getRelationDims('张文人');
  assert(after.friend.value > 50, 'rel: visit 后 friend > 50·实际 ' + after.friend.value);

  // enemy 维·陷害后 enemy dim 应 +
  var beforeEnemy = ns.getRelationDims('张文人').enemy.value;
  ns.interact('张文人', 'frame', {});
  var afterEnemy = ns.getRelationDims('张文人').enemy.value;
  assert(afterEnemy > beforeEnemy, 'rel: frame 后 enemy 上升·前 ' + beforeEnemy + ' 后 ' + afterEnemy);

  // rival 维·寻仇后 rival 应 +
  var beforeRival = ns.getRelationDims('张文人').rival.value;
  ns.interact('张文人', 'antagonize', {});
  var afterRival = ns.getRelationDims('张文人').rival.value;
  assert(afterRival > beforeRival, 'rel: antagonize 后 rival 上升·前 ' + beforeRival + ' 后 ' + afterRival);

  // master 维·收徒后 master 应 +
  var beforeMaster = ns.getRelationDims('张文人').master.value;
  ns.interact('张文人', 'disciple', {});
  var afterMaster = ns.getRelationDims('张文人').master.value;
  assert(afterMaster > beforeMaster, 'rel: disciple 后 master 上升·前 ' + beforeMaster + ' 后 ' + afterMaster);

  // colleague 维·笼络后 colleague 应 +
  var beforeCol = ns.getRelationDims('张文人').colleague.value;
  ns.interact('张文人', 'recruit', {});
  var afterCol = ns.getRelationDims('张文人').colleague.value;
  assert(afterCol > beforeCol, 'rel: recruit 后 colleague 上升·前 ' + beforeCol + ' 后 ' + afterCol);

  // NPC→玩家 relations.affinity 应被 applyNpcInteraction 更新（visit 后立即检查·避免被后续 frame/antagonize 拉低）
  var npcCh = ctx.findCharByName('张文人');
  assert(npcCh.relations && npcCh.relations['李大臣'], 'rel: NPC.relations[玩家] 已建立');
  // visit 是第一个互动·affinity 应已被 private_visit effect 拉到 55
  assert(npcCh.relations['李大臣'].affinity !== 50, 'rel: NPC.relations[玩家].affinity 已被修改·实际 ' + npcCh.relations['李大臣'].affinity);
}

function testTimeAdvance(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerInteraction;
  ctx.GM._energy = 500;
  ctx.GM._energyMax = 500;
  var startTurn = ctx.GM.turn;
  // visit=2 + gift=1 + entrust=2 + befriend=3 + secretTalk=3 = 11h · 未跨 12
  ns.interact('张文人', 'visit', {});
  ns.interact('张文人', 'gift', {});
  ns.interact('张文人', 'entrust', {});
  ns.interact('张文人', 'befriend', {});
  assert(ctx.P.playerInfo._timeUsedThisTurn === 8, 'time: 累计 8h·实际 ' + ctx.P.playerInfo._timeUsedThisTurn);
  ns.interact('张文人', 'secretTalk', {}); // +3h = 11h · 仍未跨
  assert(ctx.GM.turn === startTurn, 'time: 累计 11h 不跨回合·仍 T' + ctx.GM.turn);
  assert(ctx.P.playerInfo._timeUsedThisTurn === 11, 'time: 累计 11h·实际 ' + ctx.P.playerInfo._timeUsedThisTurn);
  ns.interact('张文人', 'gift', {}); // +1h = 12h → 跨回合
  assert(ctx.GM.turn === startTurn + 1, 'time: 累计 12h 跨回合·T+1=' + ctx.GM.turn);
  // _timeUsedThisTurn 应已减 12 → 0
  assert(ctx.P.playerInfo._timeUsedThisTurn === 0, 'time: 跨回合后 _timeUsedThisTurn=0·实际 ' + ctx.P.playerInfo._timeUsedThisTurn);
}

function testMarry(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerInteraction;
  ctx.GM._energy = 100;

  var playerCh = ctx.findCharByName('李大臣');
  var npcCh = ctx.findCharByName('张文人');
  assert(!playerCh.familyAlliances, 'marry: 联姻前玩家无 familyAlliances');
  assert(!npcCh.family, 'marry: 联姻前 NPC family 空');

  var r = ns.interact('张文人', 'marry', { dowry: 1000 });
  assert(r.ok === true, 'marry: ok');
  assert(r.marriage !== null, 'marry: marriage 字段非空');
  assert(r.marriage.player === '李大臣', 'marry: player');
  assert(r.marriage.npc === '张文人', 'marry: npc');
  assert(r.marriage.dowry === 1000, 'marry: dowry 回显');
  assert(r.marriage.familyAlliances.indexOf('李大臣') >= 0, 'marry: familyAlliances 含玩家');
  assert(r.marriage.familyAlliances.indexOf('张文人') >= 0, 'marry: familyAlliances 含 NPC');

  // 双方 familyAlliances 互写
  assert(playerCh.familyAlliances.indexOf('张文人') >= 0, 'marry: 玩家.familyAlliances 含 NPC');
  assert(npcCh.familyAlliances.indexOf('李大臣') >= 0, 'marry: NPC.familyAlliances 含玩家');
  // family 字段·玩家有 playerInfo.familyName·写入玩家 family·NPC family 从玩家取
  assert(playerCh.family === '李氏', 'marry: 玩家.family = 李氏·实际 ' + playerCh.family);
  assert(npcCh.family === '李氏', 'marry: NPC.family 从玩家取·实际 ' + npcCh.family);

  // 5 维·friend 应有 +15 加成
  var dims = ns.getRelationDims('张文人');
  assert(dims.friend.value >= 65, 'marry: 联姻后 friend ≥ 65·实际 ' + dims.friend.value);
}

function testEventHookCoup(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerInteraction;
  ctx.GM._energy = 500;

  // 阶段 1：未达死党·密谈王将军·不应触发政变钩子
  var r1 = ns.interact('王将军', 'secretTalk', { intent: 'coup' });
  assert(r1.ok === true, 'hook-1: 密谈 ok');
  assert(!r1.eventHooks || r1.eventHooks.length === 0 || !r1.eventHooks.some(function (h) { return h.id === 'coup_hint'; }),
    'hook-1: 未达死党·无 coup_hint');

  // 阶段 2：人为拉高 friend 维到 85·colleague 到 75（兜底 trust）·模拟死党
  var npcCh = ctx.findCharByName('王将军');
  if (!npcCh._playerRelDims) npcCh._playerRelDims = {};
  if (!npcCh._playerRelDims['李大臣']) npcCh._playerRelDims['李大臣'] = { master: 50, friend: 50, rival: 50, colleague: 50, enemy: 50 };
  npcCh._playerRelDims['李大臣'].friend = 85;
  npcCh._playerRelDims['李大臣'].colleague = 75;

  var r2 = ns.interact('王将军', 'secretTalk', { intent: 'coup' });
  assert(r2.ok === true, 'hook-2: 死党密谈 ok');
  assert(r2.eventHooks && r2.eventHooks.length > 0, 'hook-2: 有 eventHooks');
  var coupHint = r2.eventHooks.find(function (h) { return h.id === 'coup_hint'; });
  assert(coupHint, 'hook-2: 含 coup_hint');
  assert(coupHint.severity === 'critical', 'hook-2: severity = critical');
  assert(/政变/.test(coupHint.message), 'hook-2: message 含"政变"');
  assert(coupHint.payload.kind === 'coup', 'hook-2: payload.kind = coup');

  // 阶段 3：王将军密谈触发·但张文人（非军中）即使死党也不触发
  var npcSch = ctx.findCharByName('张文人');
  if (!npcSch._playerRelDims) npcSch._playerRelDims = {};
  if (!npcSch._playerRelDims['李大臣']) npcSch._playerRelDims['李大臣'] = { master: 50, friend: 50, rival: 50, colleague: 50, enemy: 50 };
  npcSch._playerRelDims['李大臣'].friend = 90;
  npcSch._playerRelDims['李大臣'].colleague = 80;
  var r3 = ns.interact('张文人', 'secretTalk', { intent: 'coup' });
  assert(r3.ok === true, 'hook-3: 文臣密谈 ok');
  var coupHint3 = r3.eventHooks && r3.eventHooks.find(function (h) { return h.id === 'coup_hint'; });
  assert(!coupHint3, 'hook-3: 文臣非军中·不触发 coup_hint');

  // 阶段 4：陷害·必触发 frame_backlash 钩子
  var r4 = ns.interact('张文人', 'frame', {});
  assert(r4.ok === true, 'hook-4: 陷害 ok');
  var fbHint = r4.eventHooks && r4.eventHooks.find(function (h) { return h.id === 'frame_backlash'; });
  assert(fbHint, 'hook-4: 含 frame_backlash');
  assert(fbHint.severity === 'warning', 'hook-4: severity = warning');
}

function testLLMdegrade(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerInteraction;
  ctx.GM._energy = 100;

  // 1) 无 LLM·降级 mock
  var r1 = ns.interact('张文人', 'visit', { topic: '茶道' });
  assert(r1.ok === true, 'llm-1: ok');
  assert(/张文人/.test(r1.scene), 'llm-1: scene 含 NPC 名');
  assert(/拜访/.test(r1.scene), 'llm-1: scene 含互动 label');

  // 2) 挂上 global.callAI·走真实路径
  ctx.callAI = function (prompt) {
    return '【LLM 生成】' + prompt.split('\n').slice(1, 3).join('·');
  };
  var r2 = ns.interact('张文人', 'visit', { topic: '茶道' });
  assert(r2.ok === true, 'llm-2: ok');
  assert(/^【LLM 生成】/.test(r2.scene), 'llm-2: scene 走 LLM 路径');

  // 3) LLM 返回空字符串·降级
  ctx.callAI = function () { return ''; };
  var r3 = ns.interact('张文人', 'visit', {});
  assert(r3.ok === true, 'llm-3: ok');
  assert(!/^【LLM 生成】/.test(r3.scene), 'llm-3: LLM 空时降级');
}

function testListAndMenu(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerInteraction;

  var list = ns.listInteractableNpcs();
  // 排除玩家自己 + 排除已故 + 排除君主 → 王将军 + 张文人 = 2
  assert(Array.isArray(list), 'list: 返回数组');
  assert(list.length === 2, 'list: 2 个可互动 NPC·实际 ' + list.length);
  var names = list.map(function (n) { return n.name; }).sort();
  assert(names[0] === '张文人' && names[1] === '王将军', 'list: 含 王将军 + 张文人');

  // 军中标记
  var gen = list.find(function (n) { return n.name === '王将军'; });
  assert(gen.military === true, 'list: 王将军 military=true');
  var sch = list.find(function (n) { return n.name === '张文人'; });
  assert(sch.military === false, 'list: 张文人 military=false');

  // includeSovereign=true·含君主
  var list2 = ns.listInteractableNpcs({ includeSovereign: true });
  assert(list2.length === 3, 'list: includeSovereign 后 3 个·实际 ' + list2.length);

  // 动作菜单·10 项
  var menu = ns.getActionMenu('王将军');
  assert(menu.length === 10, 'menu: 10 项·实际 ' + menu.length);
  var menuKinds = menu.map(function (m) { return m.kind; }).sort();
  assert(menuKinds[0] === 'antagonize' && menuKinds[9] === 'visit', 'menu: kind 全');
  var marryItem = menu.find(function (m) { return m.kind === 'marry'; });
  assert(marryItem.dimLabel === '亲友', 'menu: marry dimLabel=亲友');
  var discItem = menu.find(function (m) { return m.kind === 'disciple'; });
  assert(discItem.dimLabel === '师徒', 'menu: disciple dimLabel=师徒');
  var frameItem = menu.find(function (m) { return m.kind === 'frame'; });
  assert(frameItem.dimLabel === '仇敌', 'menu: frame dimLabel=仇敌');
  var antItem = menu.find(function (m) { return m.kind === 'antagonize'; });
  assert(antItem.dimLabel === '政敌', 'menu: antagonize dimLabel=政敌');
  var recItem = menu.find(function (m) { return m.kind === 'recruit'; });
  assert(recItem.dimLabel === '同僚', 'menu: recruit dimLabel=同僚');

  // hint 含 NPC 名
  var secretItem = menu.find(function (m) { return m.kind === 'secretTalk'; });
  assert(/王将军/.test(secretItem.hint), 'menu: secretTalk hint 含 NPC 名');
}

function testDualMount(ctx) {
  // 双路径挂载·module.exports 也应能取到
  var mod = require(path.join(ROOT, 'tm-player-interaction.js'));
  assert(mod && typeof mod.interact === 'function', 'dual-mount: module.exports.interact 是函数');
  assert(mod.KINDS && Object.keys(mod.KINDS).length === 10, 'dual-mount: module.exports.KINDS 共 10 种');
}

// ── 入口 ────────────────────────────────────────────────────
try {
  var ctx = buildContext();
  testNamespace(ctx);
  testGuards(ctx);
  testTenKinds(ctx);
  testRelationUpdate(ctx);
  testTimeAdvance(ctx);
  testMarry(ctx);
  testEventHookCoup(ctx);
  testLLMdegrade(ctx);
  testListAndMenu(ctx);
  testDualMount(ctx);
  console.log('[smoke-player-interaction] PASS · 10 sub-tests · namespace/guards/10-kinds/rel/time/marry/hook/llm/list-menu/dual-mount');
  process.exit(0);
} catch (e) {
  console.error('[smoke-player-interaction] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
