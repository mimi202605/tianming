#!/usr/bin/env node
// scripts/smoke-player-family.js — Phase 4.5·Task 19 + 19B 玩家家族与子女 + 婚姻礼制系统 smoke
// 验证（同时覆盖 Task 19 与 19B 全部 SubTask 断言）：
//   Task 19（玩家家族与子女系统）：
//     19.1  PlayerFamily 命名空间 + 双路径挂载
//     19.2  家族结构（addMember/removeMember/getMembers/getParents/getSiblings/getSpouse/getClan/getFamilyTree）
//     19.3  结婚（marry 委托 PlayerInteraction.interact）
//     19.4  生育子女（birthChild·首子自动 isHeir=true）
//     19.5  子女成长（tickGrowth + triggerGrowthEvent·满月/启蒙/及笄/冠礼）
//     19.6  子女教育（educateChild·延师/亲自教导/送书院 三模式）
//     19.7  子女联姻（marryChild·须成年）
//     19.8  子女出仕（appointChild·科举/荫袭/征辟 三路径）
//     19.9  子女继承（inherit·switchToHeir 切玩家角色）
//     19.10 子嗣危机（checkCrisis·绝嗣/夺嫡）
//     19.11 子女叛逃（checkDefection/triggerDefection·enemy≥80）
//     19.12 御案家族面板（renderFamilyPanel·内嵌婚姻子面板）
//   Task 19B（玩家婚姻礼制系统）：
//     19B.1 PlayerMarriage 命名空间 + STATUS/SIX_RITES/SEVEN_GROUNDS/MOURNING_KINDS 常量
//     19B.2 状态机（_ensureState/_defaultState·7 态）
//     19B.3 六礼（proposeMarriage → advanceRite ×6 → _finalizeMarriage）
//     19B.4 赘婿（marryAsUuxi·玩家男性）
//     19B.5 招赘（recruitZhaoshui·玩家女性）
//     19B.6 再婚（remarry·继室/平妻 + bindChildrenToNewSpouse）
//     19B.7 守制（startMourning/isInMourning/endMourning·禁婚）
//     19B.8 和离/休妻/休夫（mutualDivorce/divorceWife·七出/divorceHusband·妻家强势）
//     19B.9 平妻嫡庶（takePingqi + checkDispute·平妻≥2 触发）
//     19B.10 记忆与编年史（writeMarriageEvent·玩家记忆/NPC记忆/ChronicleTracker/addEB 四联写）
//     19B.11 婚姻面板（renderMarriagePanel）
//   跨朝代铁律：grep 验证两文件不含明清专名（内阁/票拟/司礼监/东厂/西厂/锦衣卫/军机处/廷杖/八股/巡按/总督/巡抚/郡王/藩王）

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

// ── 构造 sandbox·依次装载 tm-player-marriage.js + tm-player-family.js ──
//   装载序：婚姻在前·家族在后（家族的 marry/renderFamilyPanel 会引用 PlayerMarriage）
function buildContext() {
  var ctx = {
    console: { log: function () {}, warn: function () {}, error: function () {} },
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN,
    Set: Set, Map: Map, Promise: Promise,
    setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  ctx.TM = {};
  vm.createContext(ctx);
  // 先婚姻后家族（家族引用 PlayerMarriage）
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'tm-player-marriage.js'), 'utf8'),
    ctx, { filename: 'tm-player-marriage.js' }
  );
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'tm-player-family.js'), 'utf8'),
    ctx, { filename: 'tm-player-family.js' }
  );
  return ctx;
}

// ── Mock GM/P/TM/PlayerInteraction/PlayerEconomy + 全局工具 ──
function setupCtx(ctx, opts) {
  opts = opts || {};

  // 玩家：李大臣（男·尚书·穿越模式）
  var playerCh = {
    name: '李大臣', alive: true, officialTitle: '尚书', role: '臣',
    gender: '男', family: '李氏', isPlayer: true,
    resources: { fame: 60, privateWealth: { money: 5000 } },
    familyMembers: []
  };
  // NPC1：王氏（女·可议婚）
  var npcWang = { name: '王氏', alive: true, gender: '女', officialTitle: '', role: '民' };
  // NPC2：张氏（女·再婚对象）
  var npcZhang = { name: '张氏', alive: true, gender: '女', officialTitle: '', role: '民' };
  // NPC3：赵郎（男·招赘对象）
  var npcZhao = { name: '赵郎', alive: true, gender: '男', officialTitle: '', role: '民' };
  // NPC4：李千金（女·赘婿对象）
  var npcLiJin = { name: '李千金', alive: true, gender: '女', officialTitle: '', role: '民' };
  // NPC5：故人（已故）
  var npcDead = { name: '故人', alive: false, officialTitle: '', role: '民' };
  // NPC6：周氏（女·平妻对象）
  var npcZhou = { name: '周氏', alive: true, gender: '女', officialTitle: '', role: '民' };
  // NPC7：吴氏（女·子女联姻对象）
  var npcWu = { name: '吴氏', alive: true, gender: '女', officialTitle: '', role: '民' };

  ctx.GM = {
    sid: 'smoke',
    turn: 10,
    chars: [playerCh, npcWang, npcZhang, npcZhao, npcLiJin, npcDead, npcZhou, npcWu]
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

  // 全局工具 mock
  ctx.findCharByName = function (name) {
    return ctx.GM.chars.find(function (c) { return c && c.name === name; }) || null;
  };
  ctx.canonicalizeCharName = function (n) { return n; };
  ctx.getTurnDays = function () { return 30; }; // 1 回合 = 1 月
  ctx.addEB = function (cat, txt) {
    ctx._ebCalls = ctx._ebCalls || [];
    ctx._ebCalls.push({ cat: cat, txt: txt });
  };

  // LLM mock（默认返回 null·走降级路径）
  ctx.callAI = null;

  // PlayerInteraction mock（联姻路径·记录调用）
  ctx._piCalls = [];
  ctx.TM.PlayerInteraction = {
    interact: function (npcName, kind, payload) {
      ctx._piCalls.push({ npc: npcName, kind: kind, payload: payload });
      // 真模拟·为双方建立 familyAlliances
      var player = ctx.findCharByName('李大臣');
      var npc = ctx.findCharByName(npcName);
      if (player && npc) {
        if (!player.familyAlliances) player.familyAlliances = [];
        if (player.familyAlliances.indexOf(npcName) < 0) player.familyAlliances.push(npcName);
        if (!npc.familyAlliances) npc.familyAlliances = [];
        if (npc.familyAlliances.indexOf('李大臣') < 0) npc.familyAlliances.push('李大臣');
      }
      return { ok: true, npc: npcName, kind: kind, payload: payload };
    },
    _spendEnergyLocal: function () { return true; },
    _advanceTime: function () { return { turnAdvanced: false }; }
  };

  // PlayerEconomy mock（银钱账本·记录调用）
  ctx._peBalance = 100000; // 给充足预算·不会被六礼耗尽
  ctx._peCalls = [];
  ctx.TM.PlayerEconomy = {
    spend: function (cost, reason) {
      ctx._peCalls.push({ cost: cost, reason: reason });
      if (ctx._peBalance < cost) return { ok: false, reason: '银钱不足' };
      ctx._peBalance -= cost;
      return { ok: true, cash: ctx._peBalance };
    },
    getBalance: function () { return ctx._peBalance; }
  };

  // Transmigration mock
  ctx.TM.Transmigration = {
    isTransmigrationMode: function () { return !!ctx.P.playerInfo.transmigrationMode; }
  };

  // ChronicleTracker mock
  ctx._chronicleCalls = [];
  ctx.ChronicleTracker = {
    add: function (track) {
      ctx._chronicleCalls.push(track);
      return 'chronicle_' + ctx._chronicleCalls.length;
    }
  };

  // NpcMemorySystem mock
  ctx._npcMemCalls = [];
  ctx.NpcMemorySystem = {
    remember: function (name, event, mood, importance, who, meta) {
      ctx._npcMemCalls.push({ name: name, event: event, mood: mood, importance: importance, who: who, meta: meta });
    }
  };

  return ctx;
}

// ── 辅助：跑完六礼 ──
function _runFullRites(ctx, ns, npcName, opts) {
  var r0 = ns.proposeMarriage(npcName, opts || {});
  assert(r0.ok === true, '六礼启动失败：' + (r0.reason || ''));
  for (var i = 0; i < 6; i++) {
    var r = ns.advanceRite({});
    if (!r.ok) fail('第 ' + (i + 1) + ' 步六礼失败：' + (r.reason || ''));
  }
  return r0;
}

// ═══════════════════════════════════════════════════════════════
//  §1 命名空间 + 常量（Task 19.1 + 19B.1 + 双路径挂载）
// ═══════════════════════════════════════════════════════════════
function testNamespace(ctx) {
  setupCtx(ctx);
  // PlayerMarriage 命名空间
  assert(ctx.TM.PlayerMarriage, 'namespace: TM.PlayerMarriage 暴露');
  var mns = ctx.TM.PlayerMarriage;
  ['proposeMarriage', 'advanceRite', 'cancelRite', 'marryAsUuxi', 'recruitZhaoshui',
   'remarry', 'bindChildrenToNewSpouse', 'startMourning', 'isInMourning', 'endMourning',
   'mutualDivorce', 'divorceWife', 'divorceHusband', 'takePingqi', 'checkDispute',
   'writeMarriageEvent', 'renderMarriagePanel', 'getState', 'getStatus', 'getSpouse',
   'getSpouses', 'getHistory'].forEach(function (fn) {
    assert(typeof mns[fn] === 'function', 'namespace: PlayerMarriage.' + fn + ' 是函数');
  });
  assert(mns.STATUS && Object.keys(mns.STATUS).length === 7, 'namespace: STATUS 共 7 态');
  assert(mns.SIX_RITES && mns.SIX_RITES.length === 6, 'namespace: SIX_RITES 共 6 步');
  assert(mns.SEVEN_GROUNDS && mns.SEVEN_GROUNDS.length === 7, 'namespace: SEVEN_GROUNDS 共 7 条');
  assert(mns.MOURNING_KINDS && Object.keys(mns.MOURNING_KINDS).length === 3, 'namespace: MOURNING_KINDS 共 3 种');
  // 验证 7 态
  ['UNMARRIED', 'MARRIED', 'UUXI', 'ZHAOZHUI', 'DIVORCED', 'WIDOWED', 'REMARRIED'].forEach(function (k) {
    assert(mns.STATUS[k], 'namespace: STATUS.' + k + ' 存在');
  });
  // 验证六礼步骤
  var riteKeys = mns.SIX_RITES.map(function (r) { return r.key; });
  ['naCai', 'wenMing', 'naJi', 'naZheng', 'qingQi', 'qinYing'].forEach(function (k) {
    assert(riteKeys.indexOf(k) >= 0, 'namespace: SIX_RITES 含 ' + k);
  });

  // PlayerFamily 命名空间
  assert(ctx.TM.PlayerFamily, 'namespace: TM.PlayerFamily 暴露');
  var fns = ctx.TM.PlayerFamily;
  ['addMember', 'removeMember', 'getMembers', 'getChildren', 'getParents', 'getSiblings',
   'getSpouse', 'getClan', 'getFamilyTree', 'marry', 'birthChild', 'tickGrowth',
   'triggerGrowthEvent', 'educateChild', 'marryChild', 'appointChild', 'inherit',
   'checkCrisis', 'triggerCrisis', 'checkDefection', 'triggerDefection',
   'setChildCustody', 'writeFamilyEvent', 'renderFamilyPanel', 'getState'].forEach(function (fn) {
    assert(typeof fns[fn] === 'function', 'namespace: PlayerFamily.' + fn + ' 是函数');
  });
  assert(fns.CHILD_STAGES && Object.keys(fns.CHILD_STAGES).length === 4, 'namespace: CHILD_STAGES 共 4 阶段');
  assert(fns.GROWTH_EVENTS && fns.GROWTH_EVENTS.length === 4, 'namespace: GROWTH_EVENTS 共 4 事件');
  assert(fns.EDUCATION_MODES && Object.keys(fns.EDUCATION_MODES).length === 3, 'namespace: EDUCATION_MODES 共 3 模式');
  assert(fns.CAREER_PATHS && Object.keys(fns.CAREER_PATHS).length === 3, 'namespace: CAREER_PATHS 共 3 路径');
  assert(fns.CRISIS_TYPES && Object.keys(fns.CRISIS_TYPES).length === 3, 'namespace: CRISIS_TYPES 共 3 类型');
}

// ═══════════════════════════════════════════════════════════════
//  §2 家族结构（Task 19.2）
// ═══════════════════════════════════════════════════════════════
function testFamilyStructure(ctx) {
  setupCtx(ctx);
  var fns = ctx.TM.PlayerFamily;

  // 添加父母兄弟宗亲
  var r1 = fns.addMember('父', '李父', { age: 60, note: '严父' });
  assert(r1.ok === true, 'family-struct: addMember 父 ok');
  fns.addMember('母', '李母', { age: 58 });
  fns.addMember('兄', '李兄', { age: 35 });
  fns.addMember('弟', '李弟', { age: 18 });
  fns.addMember('宗亲', '李伯', { note: '伯父' });

  // 同步写入玩家角色 familyMembers
  var pc = ctx.findCharByName('李大臣');
  assert(pc.familyMembers && pc.familyMembers.length === 5, 'family-struct: 玩家 familyMembers 同步 5 条');

  // 查询父母
  var parents = fns.getParents();
  assert(parents.length === 2, 'family-struct: 父母 2 人·实际 ' + parents.length);
  var parentRels = parents.map(function (p) { return p.relation; }).sort();
  assert(parentRels.indexOf('父') >= 0 && parentRels.indexOf('母') >= 0, 'family-struct: 父母关系正确·实际 ' + JSON.stringify(parentRels));

  // 查询兄弟姐妹
  var sibs = fns.getSiblings();
  assert(sibs.length === 2, 'family-struct: 同胞 2 人·实际 ' + sibs.length);

  // 查询宗亲
  var clan = fns.getClan();
  assert(clan.length === 1, 'family-struct: 宗亲 1 人');

  // 移除成员
  var rm = fns.removeMember('李伯');
  assert(rm.ok === true, 'family-struct: removeMember ok');
  assert(fns.getClan().length === 0, 'family-struct: 移除后宗亲 0 人');

  // 移除不存在
  var rm2 = fns.removeMember('不存在');
  assert(rm2.ok === false, 'family-struct: 移除不存在返回 false');

  // 家族树
  var tree = fns.getFamilyTree();
  assert(tree && tree.player && tree.player.name === '李大臣', 'family-struct: tree.player.name');
  assert(tree.player.family === '李氏', 'family-struct: tree.player.family');
  assert(tree.parents.length === 2, 'family-struct: tree.parents 2');
  assert(tree.siblings.length === 2, 'family-struct: tree.siblings 2');
  assert(Array.isArray(tree.children), 'family-struct: tree.children 数组');
}

// ═══════════════════════════════════════════════════════════════
//  §3 六礼流程（Task 19B.3）
// ═══════════════════════════════════════════════════════════════
function testSixRites(ctx) {
  setupCtx(ctx);
  var mns = ctx.TM.PlayerMarriage;

  // 启动六礼
  var r0 = mns.proposeMarriage('王氏', { dowry: 500 });
  assert(r0.ok === true, 'six-rites: proposeMarriage ok');
  assert(r0.rite.key === 'naCai', 'six-rites: 第一步是 naCai');
  assert(mns.getState().activeRites !== null, 'six-rites: activeRites 已建立');
  assert(mns.getState().activeRites.npcName === '王氏', 'six-rites: npcName=王氏');

  // 守制期校验：无守制时可发起
  assert(mns.isInMourning() === null, 'six-rites: 无守制期');

  // 推进 6 步
  var lastResult = null;
  for (var i = 0; i < 6; i++) {
    var beforeStep = mns.getState().activeRites.step;
    var r = mns.advanceRite({});
    assert(r.ok === true, 'six-rites: 第 ' + (i + 1) + ' 步 ok·' + (r.reason || ''));
    lastResult = r;
  }
  // 末步应已 finalize
  assert(lastResult.completed === true, 'six-rites: 末步 completed=true');
  assert(lastResult.spouse.name === '王氏', 'six-rites: spouse.name=王氏');
  assert(lastResult.status === ctx.TM.PlayerMarriage.STATUS.MARRIED, 'six-rites: status=MARRIED');

  // 调用了 PlayerInteraction.interact
  var piCall = ctx._piCalls.find(function (c) { return c.kind === 'marry' && c.npc === '王氏'; });
  assert(piCall, 'six-rites: 调用了 PlayerInteraction.interact(marry)');

  // 状态查询
  assert(mns.getStatus() === '已娶', 'six-rites: getStatus=已娶');
  var sp = mns.getSpouse();
  assert(sp && sp.name === '王氏', 'six-rites: getSpouse=王氏');
  assert(mns.getSpouses().length === 1, 'six-rites: getSpouses 1 人');

  // 历史记录
  var hist = mns.getHistory();
  assert(hist.some(function (h) { return h.kind === 'marry'; }), 'six-rites: history 含 marry');
}

// ═══════════════════════════════════════════════════════════════
//  §4 守制期（Task 19B.7）
// ═══════════════════════════════════════════════════════════════
function testMourning(ctx) {
  setupCtx(ctx);
  var mns = ctx.TM.PlayerMarriage;

  // 启动父母丧·27 月
  var r = mns.startMourning('parent', { forName: '李父' });
  assert(r.ok === true, 'mourning: startMourning ok');
  assert(r.mourningPeriod && r.mourningPeriod.kind === 'parent', 'mourning: kind=parent');
  assert(r.mourningPeriod.label === '父母丧', 'mourning: label=父母丧');
  assert(r.mourningPeriod.forName === '李父', 'mourning: forName=李父');

  // isInMourning
  var mp = mns.isInMourning();
  assert(mp !== null, 'mourning: isInMourning 非 null');

  // 守制期内禁婚
  var propose = mns.proposeMarriage('王氏', {});
  assert(propose.ok === false, 'mourning: 守制期禁婚');
  assert(/守制期/.test(propose.reason), 'mourning: reason 含 守制期');

  // 推进时间未到期·仍在守制
  ctx.GM.turn += 5;
  assert(mns.isInMourning() !== null, 'mourning: 5 月后仍在守制');

  // 推进到期·自动结束
  ctx.GM.turn += 100; // 远超 27 月
  assert(mns.isInMourning() === null, 'mourning: 27 月后自动结束');

  // 再次启动夫丧·12 月
  ctx.GM.turn = 50;
  var r2 = mns.startMourning('husband', { forName: '前夫' });
  assert(r2.ok === true && r2.mourningPeriod.kind === 'husband', 'mourning: 夫丧 ok');

  // 主动结束
  var end = mns.endMourning();
  assert(end.ok === true, 'mourning: endMourning ok');
  assert(mns.isInMourning() === null, 'mourning: endMourning 后 isInMourning=null');

  // 无守制时 endMourning 报错
  var end2 = mns.endMourning();
  assert(end2.ok === false, 'mourning: 无守制时 endMourning 拒绝');
}

// ═══════════════════════════════════════════════════════════════
//  §5 赘婿（Task 19B.4）— 玩家男性入赘女方
// ═══════════════════════════════════════════════════════════════
function testUuxi(ctx) {
  setupCtx(ctx);
  var mns = ctx.TM.PlayerMarriage;
  var pc = ctx.findCharByName('李大臣');
  pc.gender = '男'; // 玩家须为男性

  var r0 = mns.marryAsUuxi('李千金', { dowry: 0 });
  assert(r0.ok === true, 'uuxi: marryAsUuxi ok');
  assert(mns.getState().activeRites.path === 'uuxi', 'uuxi: path=uuxi');

  // 跑完六礼
  for (var i = 0; i < 6; i++) {
    var r = mns.advanceRite({});
    assert(r.ok === true, 'uuxi: 第 ' + (i + 1) + ' 步 ok');
  }
  assert(mns.getStatus() === ctx.TM.PlayerMarriage.STATUS.UUXI, 'uuxi: status=UUXI');
  assert(mns.getSpouse().role === '赘婿', 'uuxi: spouse.role=赘婿');
}

// ═══════════════════════════════════════════════════════════════
//  §6 招赘（Task 19B.5）— 玩家女性招赘婿入门
// ═══════════════════════════════════════════════════════════════
function testZhaoshui(ctx) {
  setupCtx(ctx);
  var mns = ctx.TM.PlayerMarriage;
  var pc = ctx.findCharByName('李大臣');
  pc.gender = '女'; // 玩家须为女性

  var r0 = mns.recruitZhaoshui('赵郎', { dowry: 0 });
  assert(r0.ok === true, 'zhaoshui: recruitZhaoshui ok');
  assert(mns.getState().activeRites.path === 'zhaoshui', 'zhaoshui: path=zhaoshui');

  // 跑完六礼
  for (var i = 0; i < 6; i++) {
    var r = mns.advanceRite({});
    assert(r.ok === true, 'zhaoshui: 第 ' + (i + 1) + ' 步 ok');
  }
  assert(mns.getStatus() === ctx.TM.PlayerMarriage.STATUS.ZHAOZHUI, 'zhaoshui: status=ZHAOZHUI');
  assert(mns.getSpouse().role === '赘婿', 'zhaoshui: spouse.role=赘婿');

  // 性别校验：男性不能招赘
  pc.gender = '男';
  var r1 = mns.recruitZhaoshui('赵郎', {});
  // 当前状态是 ZHAOZHUI 会被状态校验先拦下；如果是未婚男性则被性别校验拦下
  assert(r1.ok === false, 'zhaoshui: 男性招赘被拒');
}

// ═══════════════════════════════════════════════════════════════
//  §7 和离 / 休妻 / 休夫（Task 19B.8）
// ═══════════════════════════════════════════════════════════════
function testDivorce(ctx) {
  setupCtx(ctx);
  var mns = ctx.TM.PlayerMarriage;

  // 先结婚
  _runFullRites(ctx, mns, '王氏', { dowry: 500 });
  assert(mns.getStatus() === '已娶', 'divorce: 起始 status=已娶');

  // 和离
  var r1 = mns.mutualDivorce('王氏', { childCustody: '父' });
  assert(r1.ok === true, 'divorce: mutualDivorce ok');
  assert(r1.status === ctx.TM.PlayerMarriage.STATUS.DIVORCED, 'divorce: status=DIVORCED');
  assert(r1.prevSpouse.name === '王氏', 'divorce: prevSpouse=王氏');
  assert(mns.getSpouse() === null, 'divorce: getSpouse=null');

  // 配偶名不符
  var r1b = mns.mutualDivorce('不存在', {});
  assert(r1b.ok === false, 'divorce: 配偶名不符拒绝');

  // 再婚 → 再娶张氏（走 regular 路径需要重置状态为 DIVORCED 才能走 proposeMarriage，所以测休妻先回到 married）
  // 这里改用 remarry 直接进入 REMARRIED 状态后再测休妻
  var r2 = mns.remarry('张氏', { kind: '继室', dowry: 300 });
  assert(r2.ok === true, 'divorce: remarry ok');
  assert(mns.getStatus() === ctx.TM.PlayerMarriage.STATUS.REMARRIED, 'divorce: status=REMARRIED');
  assert(mns.getSpouse().role === '继室', 'divorce: spouse.role=继室');

  // 休妻·未援引七出 → 礼法风险
  var r3 = mns.divorceWife('张氏', '不存在的理由', {});
  assert(r3.ok === false, 'divorce: 未援引七出休妻被拒');
  assert(r3.risk === 'censor_impeach', 'divorce: risk=censor_impeach');

  // 休妻·援引七出
  var r4 = mns.divorceWife('张氏', '无子', {});
  assert(r4.ok === true, 'divorce: 援引七出休妻 ok');
  assert(r4.ground === '无子', 'divorce: ground=无子');
  assert(mns.getStatus() === ctx.TM.PlayerMarriage.STATUS.DIVORCED, 'divorce: status=DIVORCED');

  // 休夫·妻家未强 → 拒绝
  // 先 remarry 进入有配偶状态
  mns.remarry('王氏', { kind: '继室' });
  var r5 = mns.divorceHusband('王氏', {});
  assert(r5.ok === false, 'divorce: 妻家未强休夫被拒');
  assert(r5.risk === 'social_backlash', 'divorce: risk=social_backlash');

  // 休夫·妻家强势
  var r6 = mns.divorceHusband('王氏', { wifeClanStrong: true });
  assert(r6.ok === true, 'divorce: 妻家强势休夫 ok');
}

// ═══════════════════════════════════════════════════════════════
//  §8 再婚带子女·关系动态生成（Task 19B.6）
// ═══════════════════════════════════════════════════════════════
function testRemarryWithChildren(ctx) {
  setupCtx(ctx);
  var mns = ctx.TM.PlayerMarriage;
  var fns = ctx.TM.PlayerFamily;

  // 先用 PlayerFamily.marry 添加配偶
  fns.marry('王氏', { dowry: 500, skipMarriageRites: true });
  // 生育 2 子女
  fns.birthChild({ gender: '男', name: '李长子', mother: '王氏' });
  fns.birthChild({ gender: '女', name: '李长女', mother: '王氏' });

  // 设婚姻状态为丧偶·准备再婚
  var s = mns._ensureState();
  s.status = mns.STATUS.WIDOWED;
  s.spouse = null;

  // 再婚·继室张氏
  var r = mns.remarry('张氏', { kind: '继室', dowry: 200 });
  assert(r.ok === true, 'remarry-children: remarry ok');
  assert(r.childrenBound, 'remarry-children: 返回 childrenBound 字段');

  // 子女应已绑定与新配偶的关系
  var children = fns.getChildren();
  var boundCount = 0;
  children.forEach(function (c) {
    if (c.stepParentRels && c.stepParentRels.some(function (r) { return r.spouseName === '张氏'; })) {
      boundCount++;
    }
  });
  assert(boundCount === 2, 'remarry-children: 2 子女绑定新配偶·实际 ' + boundCount);
}

// ═══════════════════════════════════════════════════════════════
//  §9 平妻嫡庶之争（Task 19B.9）
// ═══════════════════════════════════════════════════════════════
function testPingqiDispute(ctx) {
  setupCtx(ctx);
  var mns = ctx.TM.PlayerMarriage;

  // 先娶王氏为正室
  _runFullRites(ctx, mns, '王氏', { dowry: 500 });

  // 纳平妻 1：周氏 — 未达阈值·无争议
  var r1 = mns.takePingqi('周氏', { dowry: 100 });
  assert(r1.ok === true, 'pingqi: 第 1 平妻 ok');
  assert(r1.dispute === null, 'pingqi: 1 平妻未触发争议');
  assert(mns.getSpouses().filter(function (s) { return s.role === '平妻'; }).length === 1, 'pingqi: 平妻 1 人');

  // 纳平妻 2：张氏 — 达阈值·触发嫡庶之争
  var r2 = mns.takePingqi('张氏', { dowry: 100 });
  assert(r2.ok === true, 'pingqi: 第 2 平妻 ok');
  assert(r2.dispute !== null, 'pingqi: 2 平妻触发争议');
  assert(r2.dispute.severity === 'warning', 'pingqi: 2 平妻 severity=warning');
  assert(/嫡庶之争/.test(r2.dispute.message), 'pingqi: message 含 嫡庶之争');

  // 3 平妻 → critical
  // 加一个李千金
  var r3 = mns.takePingqi('李千金', { dowry: 100 });
  assert(r3.ok === true, 'pingqi: 第 3 平妻 ok');
  assert(r3.dispute.severity === 'critical', 'pingqi: 3 平妻 severity=critical');

  // 已 2 平妻状态·未婚状态不可纳平妻
  var s = mns._ensureState();
  s.status = mns.STATUS.UNMARRIED;
  s.spouse = null;
  var r4 = mns.takePingqi('周氏', {});
  assert(r4.ok === false, 'pingqi: 未婚不可纳平妻');
}

// ═══════════════════════════════════════════════════════════════
//  §10 婚姻事件记忆与编年史（Task 19B.10）
// ═══════════════════════════════════════════════════════════════
function testMarriageMemory(ctx) {
  setupCtx(ctx);
  var mns = ctx.TM.PlayerMarriage;
  ctx._chronicleCalls = [];
  ctx._npcMemCalls = [];
  ctx._ebCalls = [];

  mns.writeMarriageEvent({
    kind: 'marry',
    label: '成婚·妻',
    name: '王氏',
    note: '路径：regular·嫁妆：500'
  });

  // 玩家记忆
  assert(ctx.P.playerInfo._playerMemory && ctx.P.playerInfo._playerMemory.some(function (m) {
    return m.kind === 'marry' && m.name === '王氏';
  }), 'marriage-mem: 玩家记忆已写入');

  // NPC 记忆
  var npcCall = ctx._npcMemCalls.find(function (c) { return c.name === '王氏'; });
  assert(npcCall, 'marriage-mem: NpcMemorySystem.remember 调用');
  assert(/成婚/.test(npcCall.event), 'marriage-mem: NPC event 含 成婚');

  // 编年史
  var chron = ctx._chronicleCalls.find(function (c) { return c.type === 'player_marriage'; });
  assert(chron, 'marriage-mem: ChronicleTracker.add 调用');
  assert(chron.category === '婚姻', 'marriage-mem: category=婚姻');
  assert(chron.priority === 'high', 'marriage-mem: priority=high');

  // 事件日志
  var eb = ctx._ebCalls.find(function (c) { return c.cat === '家族' && /成婚/.test(c.txt); });
  assert(eb, 'marriage-mem: addEB 调用');
}

// ═══════════════════════════════════════════════════════════════
//  §11 婚姻面板（Task 19B.11）
// ═══════════════════════════════════════════════════════════════
function testMarriagePanel(ctx) {
  setupCtx(ctx);
  var mns = ctx.TM.PlayerMarriage;

  // 空状态下面板应能渲染
  var html1 = mns.renderMarriagePanel();
  assert(typeof html1 === 'string' && html1.length > 0, 'marriage-panel: 空状态渲染字符串');
  assert(/婚姻/.test(html1), 'marriage-panel: 含"婚姻"');
  assert(/状态/.test(html1), 'marriage-panel: 含"状态"');

  // 已婚状态
  _runFullRites(ctx, mns, '王氏', { dowry: 500 });
  var html2 = mns.renderMarriagePanel();
  assert(/王氏/.test(html2), 'marriage-panel: 含配偶名 王氏');
  assert(/已娶/.test(html2), 'marriage-panel: 含状态 已娶');
  assert(/婚姻史/.test(html2), 'marriage-panel: 含"婚姻史"');

  // 守制期显示
  mns.startMourning('parent', { forName: '李父' });
  var html3 = mns.renderMarriagePanel();
  assert(/守制期/.test(html3), 'marriage-panel: 含"守制期"');
  assert(/父母丧/.test(html3), 'marriage-panel: 含"父母丧"');
}

// ═══════════════════════════════════════════════════════════════
//  §12 生育子女 + 首子继承人（Task 19.4）
// ═══════════════════════════════════════════════════════════════
function testBirth(ctx) {
  setupCtx(ctx);
  var fns = ctx.TM.PlayerFamily;

  // 无配偶 + 非 allowBastard → 拒绝
  var r0 = fns.birthChild({ gender: '男' });
  assert(r0.ok === false, 'birth: 无配偶拒绝');
  assert(/须先成婚/.test(r0.reason), 'birth: reason 含 须先成婚');

  // 显式 allowBastard → 允许
  var r0b = fns.birthChild({ gender: '男', name: '李庶子', allowBastard: true });
  assert(r0b.ok === true, 'birth: allowBastard 允许');
  // 庶子不是继承人
  assert(r0b.child.isHeir === false, 'birth: 庶子非继承人');

  // 删掉庶子·走正式婚生路径
  fns.removeChild('李庶子');
  var s = fns.getState();
  assert(s.children.length === 0, 'birth: 庶子已移除·children=0');

  // 先结婚（添加配偶到家族）
  fns.marry('王氏', { dowry: 500, skipMarriageRites: true });

  // 第一子（男）→ 自动 isHeir
  var r1 = fns.birthChild({ gender: '男', name: '李嫡长子' });
  assert(r1.ok === true, 'birth: 第 1 子 ok');
  assert(r1.child.isHeir === true, 'birth: 首子 isHeir=true');
  assert(r1.child.gender === '男', 'birth: gender=男');
  assert(r1.child.mother === '王氏', 'birth: mother=王氏');
  assert(r1.child.stage === ctx.TM.PlayerFamily.CHILD_STAGES.INFANT, 'birth: stage=infant');
  assert(r1.child.birthTurn === 10, 'birth: birthTurn=10');

  // 满月事件应已调度
  assert(r1.child.growthEvents.indexOf('manyue') >= 0, 'birth: 满月事件已调度');

  // 第二子（女）→ 非继承人
  var r2 = fns.birthChild({ gender: '女', name: '李次女' });
  assert(r2.ok === true, 'birth: 第 2 子 ok');
  assert(r2.child.isHeir === false, 'birth: 次子 isHeir=false');

  // 查询子女列表
  var children = fns.getChildren();
  assert(children.length === 2, 'birth: 2 子女·实际 ' + children.length);
}

// ═══════════════════════════════════════════════════════════════
//  §13 子女成长 + 满月/启蒙/及笄/冠礼（Task 19.5）
// ═══════════════════════════════════════════════════════════════
function testGrowth(ctx) {
  setupCtx(ctx);
  var fns = ctx.TM.PlayerFamily;
  fns.marry('王氏', { skipMarriageRites: true });
  fns.birthChild({ gender: '男', name: '李冠礼子' });
  fns.birthChild({ gender: '女', name: '李及笄女' });

  // 手动触发启蒙（年龄不足应拒绝）
  var r0 = fns.triggerGrowthEvent('李冠礼子', 'qimeng');
  assert(r0.ok === false, 'growth: 年龄不足启蒙拒绝');

  // 推进到 5 岁·触发启蒙
  var son = fns._findChild('李冠礼子'); // 内部 API
  son.age = 5;
  var r1 = fns.triggerGrowthEvent('李冠礼子', 'qimeng');
  assert(r1.ok === true, 'growth: 5 岁启蒙 ok');
  assert(r1.child.growthEvents.indexOf('qimeng') >= 0, 'growth: 启蒙已记录');
  // 启蒙效果：learning + 8
  assert(r1.child.learning >= 38, 'growth: 启蒙后 learning≥38·实际 ' + r1.child.learning);

  // 重复触发应拒绝
  var r1b = fns.triggerGrowthEvent('李冠礼子', 'qimeng');
  assert(r1b.ok === false, 'growth: 重复启蒙拒绝');

  // 推进到 20 岁·触发冠礼（男）
  son.age = 20;
  var r2 = fns.triggerGrowthEvent('李冠礼子', 'guanli');
  assert(r2.ok === true, 'growth: 20 岁冠礼 ok');
  assert(r2.child.stage === ctx.TM.PlayerFamily.CHILD_STAGES.ADULT, 'growth: 冠礼后 stage=adult');
  // 性别校验：男不能及笄
  var r2b = fns.triggerGrowthEvent('李冠礼子', 'jili');
  assert(r2b.ok === false, 'growth: 男性及笄拒绝');

  // 推进女儿到 15 岁·触发及笄
  var daughter = fns._findChild('李及笄女');
  daughter.age = 15;
  var r3 = fns.triggerGrowthEvent('李及笄女', 'jili');
  assert(r3.ok === true, 'growth: 15 岁及笄 ok');
  assert(r3.child.stage === ctx.TM.PlayerFamily.CHILD_STAGES.ADULT, 'growth: 及笄后 stage=adult');

  // 性别校验：女不能冠礼
  var r3b = fns.triggerGrowthEvent('李及笄女', 'guanli');
  assert(r3b.ok === false, 'growth: 女性冠礼拒绝');

  // tickGrowth 自动推进
  var beforeAge = fns._findChild('李及笄女').age;
  fns.tickGrowth({ monthsPerTurn: 12 }); // 1 年
  var afterAge = fns._findChild('李及笄女').age;
  assert(afterAge === beforeAge + 1, 'growth: tickGrowth 推进 1 岁');
}

// ═══════════════════════════════════════════════════════════════
//  §14 子女教育·3 模式（Task 19.6）
// ═══════════════════════════════════════════════════════════════
function testEducation(ctx) {
  setupCtx(ctx);
  var fns = ctx.TM.PlayerFamily;
  fns.marry('王氏', { skipMarriageRites: true });
  fns.birthChild({ gender: '男', name: '李学子' });

  var before = fns._findChild('李学子').learning;

  // 亲自教导（cost=0）
  var r1 = fns.educateChild('李学子', 'self_teach');
  assert(r1.ok === true, 'education: self_teach ok');
  assert(r1.child.learning === before + 3, 'education: self_teach learning +3');

  // 延师（cost=500）
  var before2 = fns._findChild('李学子').learning;
  var r2 = fns.educateChild('李学子', 'hire_tutor');
  assert(r2.ok === true, 'education: hire_tutor ok');
  assert(r2.child.learning === before2 + 6, 'education: hire_tutor learning +6');
  // 调用了 PlayerEconomy.spend
  var spendCall = ctx._peCalls.find(function (c) { return /延师/.test(c.reason); });
  assert(spendCall, 'education: spend 调用 延师');

  // 送书院（cost=1000）
  var before3 = fns._findChild('李学子').learning;
  var r3 = fns.educateChild('李学子', 'academy');
  assert(r3.ok === true, 'education: academy ok');
  assert(r3.child.learning === before3 + 8, 'education: academy learning +8');

  // 子女不存在
  var r4 = fns.educateChild('不存在', 'self_teach');
  assert(r4.ok === false, 'education: 子女不存在拒绝');

  // 银钱不足
  ctx._peBalance = 100;
  var r5 = fns.educateChild('李学子', 'academy');
  assert(r5.ok === false, 'education: 银钱不足拒绝');
  assert(/银钱不足/.test(r5.reason), 'education: reason 含 银钱不足');
}

// ═══════════════════════════════════════════════════════════════
//  §15 子女联姻·须成年（Task 19.7）
// ═══════════════════════════════════════════════════════════════
function testChildMarry(ctx) {
  setupCtx(ctx);
  var fns = ctx.TM.PlayerFamily;
  fns.marry('王氏', { skipMarriageRites: true });
  fns.birthChild({ gender: '男', name: '李幼子' }); // infant

  // 未成年不可联姻
  var r0 = fns.marryChild('李幼子', '吴氏', {});
  assert(r0.ok === false, 'child-marry: 未成年拒绝');
  assert(/冠礼|及笄|议婚年龄/.test(r0.reason), 'child-marry: reason 含 议婚年龄');

  // 推进到成年
  var ch = fns._findChild('李幼子');
  ch.age = 20;
  ch.stage = ctx.TM.PlayerFamily.CHILD_STAGES.ADULT;

  // 联姻
  ctx._piCalls = [];
  var r1 = fns.marryChild('李幼子', '吴氏', { dowry: 200 });
  assert(r1.ok === true, 'child-marry: 成年联姻 ok');
  assert(r1.child.marriedTo === '吴氏', 'child-marry: marriedTo=吴氏');
  // 调用了 PlayerInteraction.interact(marry)
  var piCall = ctx._piCalls.find(function (c) { return c.npc === '吴氏' && c.kind === 'marry'; });
  assert(piCall, 'child-marry: 调用了 PlayerInteraction.interact');

  // 已成婚不可再嫁
  var r2 = fns.marryChild('李幼子', '王氏', {});
  assert(r2.ok === false, 'child-marry: 已成婚拒绝');
}

// ═══════════════════════════════════════════════════════════════
//  §16 子女出仕·科举/荫袭/征辟（Task 19.8）
// ═══════════════════════════════════════════════════════════════
function testCareer(ctx) {
  setupCtx(ctx);
  var fns = ctx.TM.PlayerFamily;
  fns.marry('王氏', { skipMarriageRites: true });
  fns.birthChild({ gender: '男', name: '李仕子' });
  var ch = fns._findChild('李仕子');
  ch.age = 20;
  ch.stage = ctx.TM.PlayerFamily.CHILD_STAGES.ADULT;

  // 科举·learning 不足
  ch.learning = 40;
  var r0 = fns.appointChild('李仕子', 'keju');
  assert(r0.ok === false, 'career: 科举 learning 不足拒绝');

  // 提升学习·科举通过
  ch.learning = 70;
  var r1 = fns.appointChild('李仕子', 'keju');
  assert(r1.ok === true, 'career: 科举 ok');
  assert(/科举/.test(r1.child.career), 'career: career 含 科举');

  // 已出仕不可再出仕
  var r1b = fns.appointChild('李仕子', 'zhengpi');
  assert(r1b.ok === false, 'career: 已出仕拒绝');

  // 另一子测荫袭
  fns.birthChild({ gender: '男', name: '李荫子' });
  var ch2 = fns._findChild('李荫子');
  ch2.age = 20;
  ch2.stage = ctx.TM.PlayerFamily.CHILD_STAGES.ADULT;

  // 荫袭·玩家有官职 → 通过
  var pc = ctx.findCharByName('李大臣');
  pc.officialTitle = '尚书';
  var r2 = fns.appointChild('李荫子', 'yinxi');
  assert(r2.ok === true, 'career: 荫袭 ok');
  assert(/荫袭/.test(r2.child.career), 'career: career 含 荫袭');

  // 第三子测征辟
  fns.birthChild({ gender: '男', name: '李征子' });
  var ch3 = fns._findChild('李征子');
  ch3.age = 20;
  ch3.stage = ctx.TM.PlayerFamily.CHILD_STAGES.ADULT;

  // 征辟·名望足够（pc.resources.fame=60）
  var r3 = fns.appointChild('李征子', 'zhengpi');
  assert(r3.ok === true, 'career: 征辟 ok');
  assert(/征辟/.test(r3.child.career), 'career: career 含 征辟');

  // 编年史调用
  var chron = ctx._chronicleCalls.find(function (c) { return c.type === 'player_family' && /出仕/.test(c.title); });
  assert(chron, 'career: ChronicleTracker.add 调用');
}

// ═══════════════════════════════════════════════════════════════
//  §17 子女继承 + switchToHeir（Task 19.9）
// ═══════════════════════════════════════════════════════════════
function testInherit(ctx) {
  setupCtx(ctx);
  var fns = ctx.TM.PlayerFamily;
  fns.marry('王氏', { skipMarriageRites: true });
  fns.birthChild({ gender: '男', name: '李嗣子' });
  var ch = fns._findChild('李嗣子');
  ch.age = 20;
  ch.stage = ctx.TM.PlayerFamily.CHILD_STAGES.ADULT;
  ch.career = '科举出身';

  var pc = ctx.findCharByName('李大臣');
  pc.officialTitle = '尚书';
  pc.resources = { fame: 80, privateWealth: { money: 10000 } };

  var r = fns.inherit('李嗣子', { reason: '罢黜', switchToHeir: true });
  assert(r.ok === true, 'inherit: ok');
  assert(r.heir.name === '李嗣子', 'inherit: heir=李嗣子');
  assert(r.inherited.wealth === 7000, 'inherit: wealth=7000（70%·实际 ' + r.inherited.wealth + '）');
  assert(r.inherited.fame === 40, 'inherit: fame=40（50%·实际 ' + r.inherited.fame + '）');
  assert(r.inherited.office === true, 'inherit: office=true');
  assert(r.inherited.officeTitle === '尚书', 'inherit: officeTitle=尚书');
  assert(r.switched === true, 'inherit: switched=true');

  // 玩家角色已切换
  assert(ctx.P.playerInfo.characterName === '李嗣子', 'inherit: P.playerInfo.characterName=李嗣子');

  // 旧玩家退场·新玩家就位
  var oldPc = ctx.findCharByName('李大臣');
  assert(oldPc.isPlayer === false, 'inherit: 旧玩家 isPlayer=false');
  var newPc = ctx.findCharByName('李嗣子');
  assert(newPc.isPlayer === true, 'inherit: 新玩家 isPlayer=true');

  // 继承人标记
  var ch2 = fns._findChild('李嗣子');
  assert(ch2.isHeir === true, 'inherit: heir.isHeir=true');

  // 不存在继承人
  var r2 = fns.inherit('不存在', {});
  assert(r2.ok === false, 'inherit: 不存在继承人拒绝');

  // 已故继承人
  fns.birthChild({ gender: '男', name: '李故子' });
  var ch3 = fns._findChild('李故子');
  ch3.dead = true;
  var r3 = fns.inherit('李故子', {});
  assert(r3.ok === false, 'inherit: 已故继承人拒绝');
}

// ═══════════════════════════════════════════════════════════════
//  §18 绝嗣危机（Task 19.10）
// ═══════════════════════════════════════════════════════════════
function testCrisisNoHeir(ctx) {
  setupCtx(ctx);
  var fns = ctx.TM.PlayerFamily;

  // 无子女 → 绝嗣
  var r1 = fns.checkCrisis();
  assert(r1 !== null, 'crisis-no-heir: 无子女触发危机');
  assert(r1.type === ctx.TM.PlayerFamily.CRISIS_TYPES.NO_HEIR, 'crisis-no-heir: type=no_heir');
  assert(r1.severity === 'critical', 'crisis-no-heir: severity=critical');
  assert(/绝嗣/.test(r1.message), 'crisis-no-heir: message 含 绝嗣');

  // 危机已记录
  var st = fns.getState();
  assert(st.crises.length === 1, 'crisis-no-heir: crises 1 条');
}

// ═══════════════════════════════════════════════════════════════
//  §19 夺嫡危机（Task 19.10）
// ═══════════════════════════════════════════════════════════════
function testCrisisSuccession(ctx) {
  setupCtx(ctx);
  var fns = ctx.TM.PlayerFamily;
  fns.marry('王氏', { skipMarriageRites: true });
  // 生 2 个成年男性·都未标 isHeir（手动清掉）
  fns.birthChild({ gender: '男', name: '李长子' });
  fns.birthChild({ gender: '男', name: '李次子' });
  var ch1 = fns._findChild('李长子');
  ch1.age = 20; ch1.stage = ctx.TM.PlayerFamily.CHILD_STAGES.ADULT; ch1.isHeir = false;
  var ch2 = fns._findChild('李次子');
  ch2.age = 20; ch2.stage = ctx.TM.PlayerFamily.CHILD_STAGES.ADULT; ch2.isHeir = false;

  var r = fns.checkCrisis();
  assert(r !== null, 'crisis-succession: 2 成年男未定继承人触发');
  assert(r.type === ctx.TM.PlayerFamily.CRISIS_TYPES.SUCCESSION, 'crisis-succession: type=succession');
  assert(r.severity === 'warning', 'crisis-succession: severity=warning');
  assert(r.candidates.length === 2, 'crisis-succession: candidates 2');
  assert(/夺嫡/.test(r.message), 'crisis-succession: message 含 夺嫡');

  // 标定继承人后不再触发
  ch1.isHeir = true;
  var r2 = fns.checkCrisis();
  assert(r2 === null, 'crisis-succession: 已定继承人无危机');
}

// ═══════════════════════════════════════════════════════════════
//  §20 叛逃·enemy≥80（Task 19.11）
// ═══════════════════════════════════════════════════════════════
function testDefection(ctx) {
  setupCtx(ctx);
  var fns = ctx.TM.PlayerFamily;
  fns.marry('王氏', { skipMarriageRites: true });
  fns.birthChild({ gender: '男', name: '李逆子' });

  // 初始 enemy=0 → 不叛逃
  var r0 = fns.checkDefection();
  assert(r0 === null, 'defection: enemy=0 不叛逃');

  // 手动设敌意 ≥80
  var ch = ctx.findCharByName('李逆子');
  ch._playerRelDims = { '李大臣': { master: 50, friend: 50, rival: 50, colleague: 50, enemy: 85 } };

  // checkDefection 应触发
  var r1 = fns.checkDefection();
  assert(r1 !== null, 'defection: enemy=85 触发叛逃');
  assert(r1.length === 1, 'defection: 1 子女叛逃');
  assert(r1[0].ok === true, 'defection: 返回 ok=true');
  assert(r1[0].child.defected === true, 'defection: child.defected=true');
  assert(r1[0].child.isHeir === false, 'defection: 叛逃者不再是继承人');

  // 危机已记录
  var st = fns.getState();
  var defCrisis = st.crises.find(function (c) { return c.type === 'defection'; });
  assert(defCrisis, 'defection: crises 含 defection');

  // 重复叛逃拒绝
  var r2 = fns.triggerDefection('李逆子', { reason: '再叛' });
  assert(r2.ok === false, 'defection: 已叛逃拒绝');
}

// ═══════════════════════════════════════════════════════════════
//  §21 家族面板·内嵌婚姻子面板（Task 19.12）
// ═══════════════════════════════════════════════════════════════
function testFamilyPanel(ctx) {
  setupCtx(ctx);
  var fns = ctx.TM.PlayerFamily;

  // 空状态
  var html1 = fns.renderFamilyPanel();
  assert(typeof html1 === 'string' && html1.length > 0, 'family-panel: 空状态渲染字符串');
  assert(/家族/.test(html1), 'family-panel: 含"家族"');
  assert(/家主/.test(html1), 'family-panel: 含"家主"');
  assert(/李大臣/.test(html1), 'family-panel: 含家主名 李大臣');

  // 添加成员 + 子女后
  fns.addMember('父', '李父', {});
  fns.marry('王氏', { skipMarriageRites: true });
  fns.birthChild({ gender: '男', name: '李子' });
  var html2 = fns.renderFamilyPanel();
  assert(/李父/.test(html2), 'family-panel: 含 李父');
  assert(/王氏/.test(html2), 'family-panel: 含 王氏');
  assert(/李子/.test(html2), 'family-panel: 含 李子');
  assert(/子女/.test(html2), 'family-panel: 含"子女"');

  // 内嵌婚姻子面板
  assert(/婚姻/.test(html2), 'family-panel: 内嵌婚姻子面板');
}

// ═══════════════════════════════════════════════════════════════
//  §22 子女归属（PlayerMarriage ↔ PlayerFamily 集成）
// ═══════════════════════════════════════════════════════════════
function testChildCustody(ctx) {
  setupCtx(ctx);
  var mns = ctx.TM.PlayerMarriage;
  var fns = ctx.TM.PlayerFamily;

  // 准备家族状态：王氏 2 子女
  fns.marry('王氏', { skipMarriageRites: true });
  fns.birthChild({ gender: '男', name: '李子1', mother: '王氏' });
  fns.birthChild({ gender: '女', name: '李女1', mother: '王氏' });

  // 直接调用 setChildCustody
  var r1 = fns.setChildCustody('王氏', '母');
  assert(r1.ok === true, 'custody: setChildCustody ok');
  assert(r1.updated === 2, 'custody: 2 子女更新·实际 ' + r1.updated);

  // 子女 custody 字段已设
  var children = fns.getChildren();
  var motherCustody = children.filter(function (c) { return c.custody === '母'; });
  assert(motherCustody.length === 2, 'custody: 2 子女 custody=母');

  // PlayerMarriage.mutualDivorce 应触发 _applyChildCustody → setChildCustody
  // 准备婚姻状态
  var s = mns._ensureState();
  s.status = mns.STATUS.MARRIED;
  s.spouse = { name: '王氏', role: '妻', path: 'regular', marriedAt: 10 };
  s.spouses.push(s.spouse);

  // 重置 custody
  fns.getChildren().forEach(function (c) {
    var ch = fns._findChild(c.name);
    ch.custody = null;
  });

  // 和离·子女归父
  var r2 = mns.mutualDivorce('王氏', { childCustody: '父' });
  assert(r2.ok === true, 'custody: mutualDivorce ok');
  // 验证 _applyChildCustody → setChildCustody 已被调用
  var updated = fns.getChildren().filter(function (c) { return c.custody === '父'; });
  assert(updated.length === 2, 'custody: mutualDivorce 后 2 子女 custody=父');
}

// ═══════════════════════════════════════════════════════════════
//  §23 守卫：非穿越模式 + NPC 不存在 + 已故 NPC + 状态校验
// ═══════════════════════════════════════════════════════════════
function testGuards(ctx) {
  setupCtx(ctx);
  var mns = ctx.TM.PlayerMarriage;
  var fns = ctx.TM.PlayerFamily;

  // 非穿越模式
  ctx.P.playerInfo.transmigrationMode = false;
  var r1 = mns.proposeMarriage('王氏', {});
  assert(r1.ok === false && /非穿越模式/.test(r1.reason), 'guard: 非穿越模式拒绝');
  var r1b = fns.birthChild({});
  assert(r1b.ok === false && /非穿越模式/.test(r1b.reason), 'guard: 非穿越模式生育拒绝');
  var r1c = fns.marry('王氏', {});
  assert(r1c.ok === false && /非穿越模式/.test(r1c.reason), 'guard: 非穿越模式结婚拒绝');
  ctx.P.playerInfo.transmigrationMode = true;

  // 未指定对象
  var r2 = mns.proposeMarriage('', {});
  assert(r2.ok === false, 'guard: 未指定对象拒绝');

  // NPC 不存在
  var r3 = mns.proposeMarriage('不存在', {});
  assert(r3.ok === false && /未找到对象/.test(r3.reason), 'guard: NPC 不存在拒绝');

  // 已故 NPC
  var r4 = mns.proposeMarriage('故人', {});
  assert(r4.ok === false && /不在人世/.test(r4.reason), 'guard: 已故 NPC 拒绝');

  // 守制期禁婚
  mns.startMourning('parent', { forName: '李父' });
  var r5 = mns.proposeMarriage('王氏', {});
  assert(r5.ok === false && /守制期/.test(r5.reason), 'guard: 守制期禁婚');
  mns.endMourning({ silent: true });

  // 已娶状态不可再议婚
  _runFullRites(ctx, mns, '王氏', { dowry: 500 });
  var r6 = mns.proposeMarriage('张氏', {});
  assert(r6.ok === false && /平妻路径/.test(r6.reason), 'guard: 已娶不可再议婚·须走平妻');

  // 进行中六礼不可重复发起
  mns._ensureState().status = mns.STATUS.UNMARRIED;
  mns._ensureState().spouse = null;
  mns.proposeMarriage('王氏', {});
  var r7 = mns.proposeMarriage('张氏', {});
  assert(r7.ok === false && /进行中的六礼/.test(r7.reason), 'guard: 不可重复发起六礼');

  // 未知路径
  mns.cancelRite();
  var r8 = mns.proposeMarriage('王氏', { path: 'bogus' });
  assert(r8.ok === false && /未知婚姻路径/.test(r8.reason), 'guard: 未知路径拒绝');
}

// ═══════════════════════════════════════════════════════════════
//  §24 跨朝代铁律·两文件不含明清专名
// ═══════════════════════════════════════════════════════════════
function testCrossDynasty(ctx) {
  var forbidden = ['内阁', '票拟', '司礼监', '东厂', '西厂', '锦衣卫', '军机处', '廷杖', '八股', '巡按', '总督', '巡抚', '郡王', '藩王'];
  var files = ['tm-player-marriage.js', 'tm-player-family.js'];
  var hits = [];
  files.forEach(function (f) {
    var src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    forbidden.forEach(function (w) {
      // 排除以「跨朝代铁律」注释中提到这些词的情况（如本文件开头声明"不写内阁..."）
      // 但实现文件应直接不出现这些词
      var lines = src.split(/\r?\n/);
      lines.forEach(function (line, idx) {
        // 跳过注释行（// 开头）·允许铁律声明提及
        if (/^\s*\/\//.test(line)) return;
        if (line.indexOf(w) >= 0) {
          hits.push(f + ':' + (idx + 1) + ' 含 "' + w + '"：' + line.trim().slice(0, 80));
        }
      });
    });
  });
  assert(hits.length === 0, 'cross-dynasty: 不应出现明清专名·发现 ' + hits.length + ' 处：\n  ' + hits.join('\n  '));

  // 通用古制词应被保留
  var marriageSrc = fs.readFileSync(path.join(ROOT, 'tm-player-marriage.js'), 'utf8');
  ['六礼', '纳采', '问名', '纳吉', '纳征', '请期', '亲迎', '七出', '冠礼', '及笄'].forEach(function (w) {
    assert(marriageSrc.indexOf(w) >= 0, 'cross-dynasty: PlayerMarriage 保留通用古制词「' + w + '」');
  });
  var familySrc = fs.readFileSync(path.join(ROOT, 'tm-player-family.js'), 'utf8');
  ['冠礼', '及笄', '满月', '启蒙', '科举', '荫袭', '征辟'].forEach(function (w) {
    assert(familySrc.indexOf(w) >= 0, 'cross-dynasty: PlayerFamily 保留通用古制词「' + w + '」');
  });
}

// ═══════════════════════════════════════════════════════════════
//  §25 双路径挂载·module.exports 可取
// ═══════════════════════════════════════════════════════════════
function testDualMount(ctx) {
  // 删除 require cache 强制重载
  var mPath = require.resolve(path.join(ROOT, 'tm-player-marriage.js'));
  var fPath = require.resolve(path.join(ROOT, 'tm-player-family.js'));
  delete require.cache[mPath];
  delete require.cache[fPath];

  var mMod = require(path.join(ROOT, 'tm-player-marriage.js'));
  assert(mMod && typeof mMod.proposeMarriage === 'function', 'dual-mount: PlayerMarriage module.exports.proposeMarriage 是函数');
  assert(mMod.STATUS && mMod.STATUS.UNMARRIED === '未婚', 'dual-mount: module.exports.STATUS 可用');
  assert(mMod.SIX_RITES && mMod.SIX_RITES.length === 6, 'dual-mount: module.exports.SIX_RITES 共 6 步');

  var fMod = require(path.join(ROOT, 'tm-player-family.js'));
  assert(fMod && typeof fMod.birthChild === 'function', 'dual-mount: PlayerFamily module.exports.birthChild 是函数');
  assert(fMod.CHILD_STAGES && fMod.CHILD_STAGES.ADULT === 'adult', 'dual-mount: module.exports.CHILD_STAGES 可用');
  assert(fMod.CAREER_PATHS && fMod.CAREER_PATHS.KEJU, 'dual-mount: module.exports.CAREER_PATHS 可用');
}

// ── 入口 ────────────────────────────────────────────────────
try {
  var ctx = buildContext();
  // Task 19B（婚姻礼制系统）
  testNamespace(ctx);              // 1 命名空间 + 常量
  testSixRites(ctx);               // 2 六礼
  testMourning(ctx);               // 3 守制
  testUuxi(ctx);                   // 4 赘婿
  testZhaoshui(ctx);               // 5 招赘
  testDivorce(ctx);                // 6 和离/休妻/休夫
  testRemarryWithChildren(ctx);    // 7 再婚带子女
  testPingqiDispute(ctx);          // 8 平妻嫡庶
  testMarriageMemory(ctx);         // 9 婚姻记忆编年史
  testMarriagePanel(ctx);          // 10 婚姻面板
  // Task 19（家族与子女系统）
  testFamilyStructure(ctx);        // 11 家族结构
  testBirth(ctx);                  // 12 生育 + 首子继承人
  testGrowth(ctx);                 // 13 成长·满月/启蒙/及笄/冠礼
  testEducation(ctx);              // 14 教育·3 模式
  testChildMarry(ctx);             // 15 子女联姻
  testCareer(ctx);                 // 16 出仕·科举/荫袭/征辟
  testInherit(ctx);                // 17 继承 + switchToHeir
  testCrisisNoHeir(ctx);           // 18 绝嗣危机
  testCrisisSuccession(ctx);       // 19 夺嫡危机
  testDefection(ctx);              // 20 叛逃
  testFamilyPanel(ctx);            // 21 家族面板
  testChildCustody(ctx);           // 22 子女归属·跨模块集成
  testGuards(ctx);                 // 23 守卫
  testCrossDynasty(ctx);           // 24 跨朝代铁律
  testDualMount(ctx);              // 25 双路径挂载
  console.log('[smoke-player-family] PASS · 25 sub-tests · namespace/family-structure/six-rites/mourning/uuxi/zhaoshui/divorce/remarry-children/pingqi-dispute/marriage-memory/marriage-panel/birth/growth/education/child-marry/career/inherit/crisis-no-heir/crisis-succession/defection/family-panel/custody/guards/cross-dynasty/dual-mount');
  process.exit(0);
} catch (e) {
  console.error('[smoke-player-family] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
