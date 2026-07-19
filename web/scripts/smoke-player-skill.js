#!/usr/bin/env node
// scripts/smoke-player-skill.js — Phase 4.5 · Task 26B 玩家自我技能提升系统 smoke
// 验证（覆盖 13 项 SubTask + 跨朝代 + 双路径挂载）：
//   1.  命名空间：TM.PlayerSkill 暴露（双路径：globalThis + module.exports）
//   2.  守卫：非穿越模式 / 未知技能 / 缺 NPC / 非武职 / 不在学塾 / 不在寺观 各拒
//   3.  技能账本：GM._playerSkill 含 skills/trainingLog/mentors/insights/events/customSkills/lastDecayTurn
//   4.  26B.3 学塾就读（studyAtAcademy·地点校验 + 束脩 + 经验增益）
//   5.  26B.4 拜师学艺 + 师徒进修 + 出师考核（apprenticeWithMaster/studyWithMaster/graduateApprenticeship）
//   6.  26B.5 自学苦读（selfStudy·经验增益 + 读出病风险）
//   7.  26B.6 游历增广（travelForInsight·软依赖 movement + 见闻累积 + 经验加成）
//   8.  26B.7 军中历练（militaryTraining·武职校验 + 胜战奖励/败战受伤）
//   9.  26B.8 寺观清修（templeRetreat·地点校验 + 悟道事件）
//  10.  26B.9 切磋比武（sparWithNpc·胜负判定 + 受伤风险）
//  11.  26B.10 季度衰减（decaySkills·周期校验 + idle threshold + 高 level 加重）
//  12.  26B.11 技能突破（checkBreakthrough·90/95/99 阈值 + 成功/失败 + cap 推进）
//  13.  26B.12 御案"自我提升"面板（renderPanel·HTML 字符串·朝代中立）
//  14.  26B.13 跨朝代 hook（registerCustomSkill/unregisterCustomSkill）
//  15.  月度 tick（tick = decaySkills 等价）
//  16.  跨朝代铁律（grep 代码体无明清专名）
//  17.  双路径挂载（module.exports 等价 globalThis.TM.PlayerSkill）
//  18.  listXxx 接口（listSkills/listTrainingPaths/listBreakthroughThresholds）

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

// ── 加载 tm-player-skill.js（IIFE 模式，sandbox）──
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
    fs.readFileSync(path.join(ROOT, 'tm-player-skill.js'), 'utf8'),
    ctx, { filename: 'tm-player-skill.js' }
  );
  return ctx;
}

// ── Mock 全局 P/GM/TM ──
function setupCtx(ctx, opts) {
  opts = opts || {};
  // 玩家：李将军（穿越模式·默认武职）/ 李书生（穿越模式·文职）
  var role = opts.role || 'minister';
  var playerCh = {
    name: '李将军', alive: true,
    officialTitle: role === 'military' ? '将军' : '尚书',
    role: role === 'military' ? '将' : '臣',
    military: 60, wushu: 55,
    personality: '刚直', isPlayer: true
  };
  if (role !== 'military') playerCh.name = '李大臣';

  ctx.GM = {
    sid: 'smoke',
    turn: 10,
    chars: [playerCh],
    _energy: 100
  };
  ctx.P = {
    playerInfo: {
      transmigrationMode: true,
      playerRole: role,
      characterName: playerCh.name,
      characterTitle: playerCh.officialTitle,
      sovereignName: '今上',
      familyName: '李氏',
      currentLocation: opts.location || '',
      playerEconomy: { cash: 100000, properties: [], investments: [], ledger: [] }
    }
  };

  // mock TM.Transmigration
  if (!ctx.TM) ctx.TM = {};
  ctx.TM.Transmigration = {
    isTransmigrationMode: function () { return !!ctx.P.playerInfo.transmigrationMode; }
  };

  // mock TM.PlayerEconomy（spend + withdrawCash 双接口）
  ctx._economyCalls = [];
  ctx.TM.PlayerEconomy = {
    spend: function (cost, reason) {
      ctx._economyCalls.push({ op: 'spend', cost: cost, reason: reason });
      var pe = ctx.P.playerInfo.playerEconomy;
      if (typeof pe.cash !== 'number') pe.cash = 0;
      if (pe.cash < cost) return { ok: false, reason: '银钱不足', cash: pe.cash };
      pe.cash -= cost;
      return { ok: true, cash: pe.cash };
    },
    withdrawCash: function (cost, reason) {
      ctx._economyCalls.push({ op: 'withdrawCash', cost: cost, reason: reason });
      var pe = ctx.P.playerInfo.playerEconomy;
      if (typeof pe.cash !== 'number') pe.cash = 0;
      if (pe.cash < cost) return { ok: false, reason: '银钱不足', cash: pe.cash };
      pe.cash -= cost;
      return { ok: true, cash: pe.cash };
    },
    getBalance: function () {
      return ctx.P.playerInfo.playerEconomy.cash;
    }
  };

  // mock TM.PlayerInteraction.interact（拜师 kind=disciple / 切磋 kind=antagonize）
  ctx._interactCalls = [];
  ctx.TM.PlayerInteraction = {
    interact: function (npcName, kind, payload) {
      ctx._interactCalls.push({ npcName: npcName, kind: kind, payload: payload });
      if (ctx._interactFail) return { ok: false, reason: 'mock 拒绝' };
      return { ok: true, kind: kind, npc: npcName };
    }
  };

  // mock TM.PlayerMovement（travelTo + moveTo 双接口）
  ctx._movementCalls = [];
  ctx.TM.PlayerMovement = {
    travelTo: function (destination, mode, entourage) {
      ctx._movementCalls.push({ op: 'travelTo', destination: destination, mode: mode });
      ctx.P.playerInfo.currentLocation = destination;
      return { ok: true, destination: destination };
    },
    moveTo: function (region, optsArg) {
      ctx._movementCalls.push({ op: 'moveTo', region: region, opts: optsArg });
      ctx.P.playerInfo.currentLocation = region;
      return { ok: true, region: region };
    },
    getCurrentLocation: function () {
      return ctx.P.playerInfo.currentLocation || '';
    }
  };
}

function resetPlayerCash(ctx, n) {
  ctx.P.playerInfo.playerEconomy.cash = (n != null ? n : 100000);
}

function setLoc(ctx, loc) {
  ctx.P.playerInfo.currentLocation = loc;
}

// ── Sub-tests ───────────────────────────────────────────────

// SubTest 1: 命名空间暴露
function testNamespace(ctx) {
  setupCtx(ctx);
  assert(ctx.TM && ctx.TM.PlayerSkill, 'ns: TM.PlayerSkill 暴露');
  var ns = ctx.TM.PlayerSkill;
  // 常量
  assert(ns.SKILL_TYPES && Object.keys(ns.SKILL_TYPES).length === 10, 'ns: SKILL_TYPES 共 10 种');
  assert(ns.TRAINING_PATHS && Object.keys(ns.TRAINING_PATHS).length === 7, 'ns: TRAINING_PATHS 共 7 种');
  assert(Array.isArray(ns.BREAKTHROUGH_THRESHOLDS) && ns.BREAKTHROUGH_THRESHOLDS.length === 3, 'ns: BREAKTHROUGH_THRESHOLDS 共 3 档');
  assert(ns.BREAKTHROUGH_THRESHOLDS[0] === 90 && ns.BREAKTHROUGH_THRESHOLDS[1] === 95 && ns.BREAKTHROUGH_THRESHOLDS[2] === 99, 'ns: 阈值 90/95/99');
  assert(ns.DECAY_CONFIG && typeof ns.DECAY_CONFIG.intervalTurns === 'number', 'ns: DECAY_CONFIG 存在');
  assert(ns.DECAY_CONFIG.intervalTurns === 12 && ns.DECAY_CONFIG.idleThreshold === 24, 'ns: DECAY_CONFIG 12 回合/24 idle');

  // 主入口
  assert(typeof ns.init === 'function', 'ns: init 是函数');
  assert(typeof ns.getState === 'function', 'ns: getState 是函数');
  assert(typeof ns.getSkills === 'function', 'ns: getSkills 是函数');
  assert(typeof ns.getSkill === 'function', 'ns: getSkill 是函数');
  assert(typeof ns.getSkillLevel === 'function', 'ns: getSkillLevel 是函数');
  assert(typeof ns.getMentors === 'function', 'ns: getMentors 是函数');
  // 26B.3 学塾
  assert(typeof ns.studyAtAcademy === 'function', 'ns: studyAtAcademy 是函数');
  // 26B.4 拜师
  assert(typeof ns.apprenticeWithMaster === 'function', 'ns: apprenticeWithMaster 是函数');
  assert(typeof ns.studyWithMaster === 'function', 'ns: studyWithMaster 是函数');
  assert(typeof ns.graduateApprenticeship === 'function', 'ns: graduateApprenticeship 是函数');
  // 26B.5 自学
  assert(typeof ns.selfStudy === 'function', 'ns: selfStudy 是函数');
  // 26B.6 游历
  assert(typeof ns.travelForInsight === 'function', 'ns: travelForInsight 是函数');
  // 26B.7 军中
  assert(typeof ns.militaryTraining === 'function', 'ns: militaryTraining 是函数');
  // 26B.8 寺观
  assert(typeof ns.templeRetreat === 'function', 'ns: templeRetreat 是函数');
  // 26B.9 切磋
  assert(typeof ns.sparWithNpc === 'function', 'ns: sparWithNpc 是函数');
  // 26B.10 衰减
  assert(typeof ns.decaySkills === 'function', 'ns: decaySkills 是函数');
  // 26B.11 突破
  assert(typeof ns.checkBreakthrough === 'function', 'ns: checkBreakthrough 是函数');
  // 26B.12 面板
  assert(typeof ns.renderPanel === 'function', 'ns: renderPanel 是函数');
  // 26B.13 hook
  assert(typeof ns.registerCustomSkill === 'function', 'ns: registerCustomSkill 是函数');
  assert(typeof ns.unregisterCustomSkill === 'function', 'ns: unregisterCustomSkill 是函数');
  // tick
  assert(typeof ns.tick === 'function', 'ns: tick 是函数');
  // listXxx
  assert(typeof ns.listSkills === 'function', 'ns: listSkills 是函数');
  assert(typeof ns.listTrainingPaths === 'function', 'ns: listTrainingPaths 是函数');
  assert(typeof ns.listBreakthroughThresholds === 'function', 'ns: listBreakthroughThresholds 是函数');
}

// SubTest 2: 守卫·各拒
function testGuards(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerSkill;

  // 非穿越模式拒
  ctx.P.playerInfo.transmigrationMode = false;
  var r1 = ns.studyAtAcademy({});
  assert(r1.ok === false && /非穿越/.test(r1.reason), 'guard: 非穿越模式拒 studyAtAcademy');
  var r2 = ns.selfStudy({});
  assert(r2.ok === false && /非穿越/.test(r2.reason), 'guard: 非穿越模式拒 selfStudy');
  var r3 = ns.travelForInsight('江南', {});
  assert(r3.ok === false && /非穿越/.test(r3.reason), 'guard: 非穿越模式拒 travelForInsight');
  var r4 = ns.decaySkills({});
  assert(r4.ok === false && /非穿越/.test(r4.reason), 'guard: 非穿越模式拒 decaySkills');
  ctx.P.playerInfo.transmigrationMode = true;

  // 未知技能拒（拜师）
  var r5 = ns.apprenticeWithMaster('张师傅', 'unknown_skill', {});
  assert(r5.ok === false && /未知技能/.test(r5.reason), 'guard: 未知技能拒 apprenticeWithMaster');

  // 缺 NPC 拒（拜师/切磋）
  var r6 = ns.apprenticeWithMaster('', 'wenxue', {});
  assert(r6.ok === false, 'guard: 缺师傅 NPC 拒');
  var r7 = ns.sparWithNpc('', {});
  assert(r7.ok === false, 'guard: 缺切磋 NPC 拒');

  // 非武职拒军中历练
  var r8 = ns.militaryTraining({});
  assert(r8.ok === false && r8.code === 'not-military', 'guard: 非武职拒 militaryTraining');

  // 不在学塾拒学塾就读
  setLoc(ctx, '野外荒野');
  var r9 = ns.studyAtAcademy({});
  assert(r9.ok === false && r9.code === 'not-at-academy', 'guard: 不在学塾拒 studyAtAcademy');

  // 不在寺观拒寺观清修
  var r10 = ns.templeRetreat({});
  assert(r10.ok === false && r10.code === 'not-at-temple', 'guard: 不在寺观拒 templeRetreat');

  // 缺目的地拒游历
  var r11 = ns.travelForInsight('', {});
  assert(r11.ok === false, 'guard: 缺目的地拒 travelForInsight');

  // 银钱不足拒
  resetPlayerCash(ctx, 50); // 学塾需 200
  setLoc(ctx, '太学');
  var r12 = ns.studyAtAcademy({});
  assert(r12.ok === false && /银钱不足/.test(r12.reason), 'guard: 银钱不足拒 studyAtAcademy');
}

// SubTest 3: 技能账本（GM._playerSkill 初始化）
function testStateInit(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerSkill;

  // init 触发账本初始化
  var ok = ns.init();
  assert(ok === true, 'state: init 返回 true');

  var s = ns.getState();
  assert(s !== null, 'state: getState 非 null');
  assert(s.skills && typeof s.skills === 'object', 'state: skills 对象');
  assert(Array.isArray(s.trainingLog), 'state: trainingLog 数组');
  assert(s.mentors && typeof s.mentors === 'object', 'state: mentors 对象');
  assert(Array.isArray(s.insights), 'state: insights 数组');
  assert(Array.isArray(s.events), 'state: events 数组');
  assert(s.customSkills && typeof s.customSkills === 'object', 'state: customSkills 对象');
  assert(typeof s.lastDecayTurn === 'number', 'state: lastDecayTurn 数字');
  assert(typeof s.createdAt === 'number', 'state: createdAt 数字');

  // 默认 10 项技能 entry 全在
  Object.keys(ns.SKILL_TYPES).forEach(function (k) {
    assert(s.skills[k], 'state: 默认技能 ' + k + ' 有 entry');
    assert(typeof s.skills[k].level === 'number' && s.skills[k].level === 0, 'state: ' + k + ' level=0');
    assert(typeof s.skills[k].exp === 'number' && s.skills[k].exp === 0, 'state: ' + k + ' exp=0');
    assert(s.skills[k].master === null, 'state: ' + k + ' master=null');
    assert(s.skills[k].breakthroughCap === 90, 'state: ' + k + ' breakthroughCap=90（首次阈值）');
  });

  // getSkill / getSkillLevel / getSkills
  var wenxue = ns.getSkill('wenxue');
  assert(wenxue !== null && wenxue.level === 0, 'state: getSkill wenxue');
  assert(ns.getSkillLevel('wenxue') === 0, 'state: getSkillLevel wenxue=0');
  var allSkills = ns.getSkills();
  assert(Object.keys(allSkills).length === 10, 'state: getSkills 共 10 项');
}

// SubTest 4: 26B.3 学塾就读
function testStudyAtAcademy(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerSkill;
  resetPlayerCash(ctx, 100000);

  // 成功路径·在太学
  setLoc(ctx, '太学');
  var before = ctx.P.playerInfo.playerEconomy.cash;
  var r = ns.studyAtAcademy({});
  assert(r.ok === true, 'academy: 成功');
  assert(r.path === 'academy', 'academy: path=academy');
  assert(Array.isArray(r.skills) && r.skills.length === 2, 'academy: 默认修 2 项（文学/算学）');
  assert(r.skills.indexOf('wenxue') >= 0 && r.skills.indexOf('suanxue') >= 0, 'academy: 默认含 wenxue/suanxue');
  assert(r.cost === 200, 'academy: 束脩 200');
  assert(Array.isArray(r.expGains) && r.expGains.length === 2, 'academy: 2 项经验增益');
  r.expGains.forEach(function (g) {
    assert(g.ok === true && g.expGain > 0, 'academy: 增益 ok 且 expGain>0');
  });
  // 银钱扣减
  assert(ctx.P.playerInfo.playerEconomy.cash === before - 200, 'academy: 现金扣 200');
  // 精力扣减（GM._energy 从 100 减 2）
  assert(ctx.GM._energy === 98, 'academy: GM._energy 减 2');
  // 时间累积（P.playerInfo._timeUsedThisTurn += 6）
  assert(ctx.P.playerInfo._timeUsedThisTurn === 6, 'academy: 时间累积 6h');
  // 技能 exp 提升
  var wenxue = ns.getSkill('wenxue');
  assert(wenxue.exp > 0, 'academy: wenxue exp > 0');
  // 事件账本
  var s = ns.getState();
  assert(s.events.length >= 1, 'academy: 事件账本 ≥1');
  assert(s.trainingLog.length >= 1, 'academy: 训练日志 ≥1');
  var last = s.trainingLog[s.trainingLog.length - 1];
  assert(last.path === 'academy', 'academy: 训练日志 path=academy');

  // skillFocus 自定义
  setLoc(ctx, '书院');
  var r2 = ns.studyAtAcademy({ skillFocus: ['yishu', 'gongyi'], tuition: 100 });
  assert(r2.ok === true, 'academy: skillFocus 自定义 ok');
  assert(r2.cost === 100, 'academy: tuition 覆盖 100');
  assert(r2.skills.indexOf('yishu') >= 0 && r2.skills.indexOf('gongyi') >= 0, 'academy: skillFocus 生效');
}

// SubTest 5: 26B.4 拜师学艺 + 师徒进修 + 出师考核
function testApprenticeship(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerSkill;
  resetPlayerCash(ctx, 100000);

  // 添加师傅 NPC
  ctx.GM.chars.push({ name: '张师傅', alive: true, officialTitle: '匠作大臣', military: 40, wushu: 70 });

  // 拜师·修武术
  var r1 = ns.apprenticeWithMaster('张师傅', 'wushu', { gift: 100 });
  assert(r1.ok === true, 'mentor: 拜师 ok');
  assert(r1.mentor === '张师傅', 'mentor: mentor=张师傅');
  assert(r1.skill === 'wushu', 'mentor: skill=wushu');
  assert(r1.gift === 100, 'mentor: gift=100');
  // 关联 PlayerInteraction.interact kind='disciple'
  assert(ctx._interactCalls.length >= 1, 'mentor: 调用 interact');
  assert(ctx._interactCalls[0].kind === 'disciple', 'mentor: interact kind=disciple');
  // 师徒关系登记
  var mentors = ns.getMentors();
  assert(mentors['张师傅'], 'mentor: 师徒关系登记');
  assert(mentors['张师傅'].status === 'active', 'mentor: 状态 active');
  assert(mentors['张师傅'].skill === 'wushu', 'mentor: 师傅 skill=wushu');
  // 技能 master 标注
  var wushu = ns.getSkill('wushu');
  assert(wushu.master === '张师傅', 'mentor: wushu.master=张师傅');
  // 拜师小增益
  assert(r1.initGain && r1.initGain.expGain > 0, 'mentor: 拜师小增益 > 0');

  // 重复拜师·同一 NPC 拒
  var r2 = ns.apprenticeWithMaster('张师傅', 'wushu', {});
  assert(r2.ok === false && r2.code === 'already-apprentice', 'mentor: 重复拜师拒');

  // 师徒进修
  var beforeExp = ns.getSkill('wushu').exp;
  var r3 = ns.studyWithMaster('张师傅', {});
  assert(r3.ok === true, 'mentor: 师徒进修 ok');
  assert(r3.mentor === '张师傅', 'mentor: 进修 mentor=张师傅');
  assert(Array.isArray(r3.expGains) && r3.expGains.length === 1, 'mentor: 进修 1 项增益');
  var afterExp = ns.getSkill('wushu').exp;
  // exp 增长（注意可能因升级重置）
  assert(r3.expGains[0].expGain > 0, 'mentor: 进修 expGain > 0');

  // 出师考核·level 不够拒
  var r4 = ns.graduateApprenticeship('张师傅', {});
  assert(r4.ok === false && r4.code === 'level-too-low', 'mentor: level 不够拒出师');

  // 强行提升 level 到 60+，出师考核
  var s = ns._ensureState();
  s.skills.wushu.level = 65; // arch-ok 在 smoke 中直接改
  s.skills.wushu.exp = 50;
  // 强制通过：forceLevel=60，passProb = 0.4 + (65-60)*0.04 = 0.6，多次尝试确保至少看到一次成功或失败
  var tried = false;
  var passedOnce = false, failedOnce = false;
  for (var i = 0; i < 50; i++) {
    s.skills.wushu.level = 65;
    s.skills.wushu.exp = 50;
    s.mentors['张师傅'].status = 'active';
    s.mentors['张师傅'].graduateTurn = null;
    var r5 = ns.graduateApprenticeship('张师傅', { forceLevel: 60 });
    if (r5.ok === true) {
      tried = true;
      if (r5.passed) passedOnce = true;
      else failedOnce = true;
    }
    if (passedOnce && failedOnce) break;
  }
  assert(tried, 'mentor: 出师考核可执行');
  assert(passedOnce, 'mentor: 至少一次出师成功');
  // 出师成功后·师傅状态变 graduated
  s.skills.wushu.level = 80; // 提高通过率
  s.skills.wushu.exp = 50;
  s.mentors['张师傅'].status = 'active';
  s.mentors['张师傅'].graduateTurn = null;
  // 反复尝试直到成功
  var successR = null;
  for (var j = 0; j < 50; j++) {
    s.skills.wushu.level = 80;
    s.skills.wushu.exp = 50;
    s.mentors['张师傅'].status = 'active';
    s.mentors['张师傅'].graduateTurn = null;
    var r6 = ns.graduateApprenticeship('张师傅', { forceLevel: 60 });
    if (r6.ok && r6.passed) { successR = r6; break; }
  }
  assert(successR !== null, 'mentor: 出师成功至少一次');
  assert(ns.getMentors()['张师傅'].status === 'graduated', 'mentor: 出师后状态 graduated');
}

// SubTest 6: 26B.5 自学苦读
function testSelfStudy(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerSkill;
  resetPlayerCash(ctx, 100000);

  // 默认修文学/治术
  var r = ns.selfStudy({});
  assert(r.ok === true, 'self: 自学 ok');
  assert(r.path === 'self', 'self: path=self');
  assert(Array.isArray(r.skills) && r.skills.length === 2, 'self: 默认修 2 项');
  assert(r.skills.indexOf('wenxue') >= 0 && r.skills.indexOf('zhishu') >= 0, 'self: 默认 wenxue/zhishu');
  assert(Array.isArray(r.expGains) && r.expGains.length === 2, 'self: 2 项经验增益');
  // 精力扣减
  assert(ctx.GM._energy === 98, 'self: GM._energy 减 2');
  // 时间累积 4h
  assert(ctx.P.playerInfo._timeUsedThisTurn === 4, 'self: 时间累积 4h');
  // 不收钱（TRAINING_PATHS.self.cost = 0）
  assert(ns.TRAINING_PATHS.self.cost === 0, 'self: 路径定义 cost=0');

  // skillFocus 自定义
  var r2 = ns.selfStudy({ skillFocus: ['yishu', 'nongxue'], intensity: 1.5 });
  assert(r2.ok === true, 'self: skillFocus 自定义 ok');
  assert(r2.skills.indexOf('yishu') >= 0, 'self: skillFocus 生效');

  // 读出病·高强度多次尝试
  var illnessSeen = false;
  for (var i = 0; i < 200; i++) {
    ctx.GM._energy = 100; // 重置精力
    ctx.P.playerInfo._timeUsedThisTurn = 0;
    var r3 = ns.selfStudy({ intensity: 2.0 });
    if (r3.illness) { illnessSeen = true; break; }
  }
  assert(illnessSeen, 'self: 200 次高强度自学至少触发一次读出病');
}

// SubTest 7: 26B.6 游历增广
function testTravelForInsight(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerSkill;
  resetPlayerCash(ctx, 100000);

  // 成功路径
  var r = ns.travelForInsight('江南', { mode: 'walk' });
  assert(r.ok === true, 'travel: 游历 ok');
  assert(r.path === 'travel', 'travel: path=travel');
  assert(r.region === '江南', 'travel: region=江南');
  assert(r.insightCount >= 1, 'travel: 见闻累积 ≥1');
  // 调用 movement（travelTo 或 moveTo）
  assert(ctx._movementCalls.length >= 1, 'travel: 调用 movement');
  // 治术/经商 exp 提升
  var zhishu = ns.getSkill('zhishu');
  assert(zhishu.exp > 0, 'travel: zhishu exp > 0');

  // 见闻账本累积
  var s = ns.getState();
  assert(s.insights.length >= 1, 'travel: insights 账本 ≥1');
  assert(s.insights[s.insights.length - 1].region === '江南', 'travel: insights 最后一条 region=江南');

  // 多次游历·累积加成
  var beforeCount = s.insights.length;
  var r2 = ns.travelForInsight('岭南', {});
  assert(r2.ok === true, 'travel: 第二次游历 ok');
  assert(r2.insightCount === beforeCount + 1, 'travel: 见闻累积 +1');

  // movement 缺席降级·移除 TM.PlayerMovement.travelTo/moveTo 仍能跑
  delete ctx.TM.PlayerMovement.travelTo;
  delete ctx.TM.PlayerMovement.moveTo;
  var r3 = ns.travelForInsight('塞北', {});
  assert(r3.ok === true, 'travel: 缺席 movement 降级仍 ok');
  assert(r3.movement === null, 'travel: movement=null 降级标记');

  // 银钱不足拒
  resetPlayerCash(ctx, 30); // 路费 50
  var r4 = ns.travelForInsight('辽东', {});
  assert(r4.ok === false && /银钱不足/.test(r4.reason), 'travel: 银钱不足拒');
}

// SubTest 8: 26B.7 军中历练
function testMilitaryTraining(ctx) {
  setupCtx(ctx, { role: 'military' });
  var ns = ctx.TM.PlayerSkill;
  resetPlayerCash(ctx, 100000);

  // 武职校验通过
  var r = ns.militaryTraining({});
  assert(r.ok === true, 'military: 军中历练 ok');
  assert(r.path === 'military', 'military: path=military');
  assert(Array.isArray(r.skills) && r.skills.length === 2, 'military: 默认修 2 项');
  assert(r.skills.indexOf('wushu') >= 0 && r.skills.indexOf('zhishu') >= 0, 'military: 默认 wushu/zhishu');
  assert(Array.isArray(r.expGains) && r.expGains.length === 2, 'military: 2 项经验增益');
  // 精力扣减
  assert(ctx.GM._energy === 97, 'military: GM._energy 减 3');
  // 时间累积 6h
  assert(ctx.P.playerInfo._timeUsedThisTurn === 6, 'military: 时间累积 6h');

  // 胜战奖励
  var beforeExp = ns.getSkill('wushu').exp;
  var r2 = ns.militaryTraining({ battleRef: { winner: 'player', playerWon: true } });
  assert(r2.ok === true, 'military: 胜战 ok');
  // 胜战额外奖励·expGains 应有 3 项（2 默认 + 1 胜战奖励）
  assert(r2.expGains.length >= 3, 'military: 胜战额外奖励增益');

  // 败战受伤风险·多次尝试
  var injurySeen = false;
  for (var i = 0; i < 200; i++) {
    ctx.GM._energy = 100;
    ctx.P.playerInfo._timeUsedThisTurn = 0;
    var r3 = ns.militaryTraining({ battleRef: { winner: 'enemy', playerLost: true } });
    if (r3.injury) { injurySeen = true; break; }
  }
  assert(injurySeen, 'military: 200 次败战至少触发一次受伤');

  // 非武职拒
  setupCtx(ctx); // 默认 minister
  var r4 = ns.militaryTraining({});
  assert(r4.ok === false && r4.code === 'not-military', 'military: 非武职拒');
}

// SubTest 9: 26B.8 寺观清修
function testTempleRetreat(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerSkill;
  resetPlayerCash(ctx, 100000);

  // 不在寺观拒
  setLoc(ctx, '闹市');
  var r0 = ns.templeRetreat({});
  assert(r0.ok === false && r0.code === 'not-at-temple', 'temple: 不在寺观拒');

  // 成功路径·在寺观
  setLoc(ctx, '少林寺');
  var r = ns.templeRetreat({});
  assert(r.ok === true, 'temple: 寺观清修 ok');
  assert(r.path === 'temple', 'temple: path=temple');
  assert(Array.isArray(r.skills) && r.skills.length === 3, 'temple: 默认修 3 项（医术/艺术/音律）');
  assert(r.skills.indexOf('yishu') >= 0 && r.skills.indexOf('yishu_art') >= 0 && r.skills.indexOf('yinlv') >= 0, 'temple: 默认 yishu/yishu_art/yinlv');
  assert(Array.isArray(r.expGains) && r.expGains.length === 3, 'temple: 3 项经验增益');
  // 香火钱扣减（TRAINING_PATHS.temple.cost = 50）
  assert(ns.TRAINING_PATHS.temple.cost === 50, 'temple: 路径定义 cost=50');
  // 精力扣减 1
  assert(ctx.GM._energy === 99, 'temple: GM._energy 减 1');

  // 悟道事件·多次尝试
  var enlightSeen = false;
  for (var i = 0; i < 300; i++) {
    ctx.GM._energy = 100;
    ctx.P.playerInfo._timeUsedThisTurn = 0;
    resetPlayerCash(ctx, 100000);
    setLoc(ctx, '道观');
    var r2 = ns.templeRetreat({});
    if (r2.enlightenment) { enlightSeen = true; break; }
  }
  assert(enlightSeen, 'temple: 300 次清修至少触发一次悟道');

  // 悟道时·bonusGains 应有
  ctx.GM._energy = 100;
  ctx.P.playerInfo._timeUsedThisTurn = 0;
  resetPlayerCash(ctx, 100000);
  setLoc(ctx, '禅院');
  var enlightR = null;
  for (var j = 0; j < 300; j++) {
    ctx.GM._energy = 100;
    ctx.P.playerInfo._timeUsedThisTurn = 0;
    resetPlayerCash(ctx, 100000);
    var r3 = ns.templeRetreat({});
    if (r3.enlightenment) { enlightR = r3; break; }
  }
  assert(enlightR !== null, 'temple: 悟道事件捕获');
  assert(Array.isArray(enlightR.enlightenment.bonusGains), 'temple: 悟道 bonusGains 是数组');
}

// SubTest 10: 26B.9 切磋比武
function testSparWithNpc(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerSkill;
  resetPlayerCash(ctx, 100000);

  // 添加切磋 NPC
  ctx.GM.chars.push({ name: '王武师', alive: true, officialTitle: '武师', military: 50, wushu: 50 });

  // 成功路径
  var r = ns.sparWithNpc('王武师', { skill: 'wushu' });
  assert(r.ok === true, 'spar: 切磋 ok');
  assert(r.path === 'spar', 'spar: path=spar');
  assert(r.npc === '王武师', 'spar: npc=王武师');
  assert(r.skill === 'wushu', 'spar: skill=wushu');
  assert(r.won === true || r.won === false, 'spar: won 是 boolean');
  assert(r.result === 'win' || r.result === 'lose', 'spar: result win/lose');
  assert(Array.isArray(r.expGains) && r.expGains.length === 1, 'spar: 1 项经验增益');
  // 关联 PlayerInteraction.interact kind='antagonize'
  var hasAntagonize = ctx._interactCalls.some(function (c) { return c.kind === 'antagonize'; });
  assert(hasAntagonize, 'spar: 调用 interact kind=antagonize');

  // NPC 已不在人世拒
  ctx.GM.chars.push({ name: '鬼师傅', alive: false, military: 50 });
  var r2 = ns.sparWithNpc('鬼师傅', {});
  assert(r2.ok === false && /不在人世/.test(r2.reason), 'spar: 已故 NPC 拒');

  // 受伤风险·多次尝试
  var injurySeen = false;
  for (var i = 0; i < 300; i++) {
    ctx.GM._energy = 100;
    ctx.P.playerInfo._timeUsedThisTurn = 0;
    var r3 = ns.sparWithNpc('王武师', {});
    if (r3.injury) { injurySeen = true; break; }
  }
  assert(injurySeen, 'spar: 300 次切磋至少触发一次受伤');

  // interact 拒绝·切磋不阻拦
  ctx._interactFail = true;
  ctx.GM._energy = 100;
  ctx.P.playerInfo._timeUsedThisTurn = 0;
  var r4 = ns.sparWithNpc('王武师', {});
  assert(r4.ok === true, 'spar: interact 拒绝时切磋仍走本地规则 ok');
  ctx._interactFail = false;
}

// SubTest 11: 26B.10 季度衰减
function testDecaySkills(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerSkill;
  resetPlayerCash(ctx, 100000);

  // 刚 init ·距上次衰减 0 回合·未到周期·skipped
  ns.init();
  var r1 = ns.decaySkills({});
  assert(r1.ok === true && r1.skipped === true, 'decay: 未到周期 skipped');
  assert(typeof r1.nextDueIn === 'number', 'decay: nextDueIn 数字');

  // 推进 turn ·但仍未到 idle threshold（24 回合）·即使 force 也不衰减
  var s = ns._ensureState();
  // 给一些技能 level
  s.skills.wenxue.level = 50;
  s.skills.wenxue.lastPracticedTurn = 10; // 当前 turn 10·idle=0
  ctx.GM.turn = 22; // 12 回合后
  var r2 = ns.decaySkills({ force: true });
  assert(r2.ok === true && r2.skipped === false, 'decay: force 衰减 ok');
  // idle=22-10=12 < 24·不应衰减
  assert(r2.decayed.length === 0, 'decay: idle < 24 不衰减·实际 ' + r2.decayed.length);

  // 推进 turn ·超过 idle threshold·应衰减
  ctx.GM.turn = 40; // idle = 40-10 = 30 > 24
  s.skills.wenxue.lastPracticedTurn = 10; // 重置
  var prevLevel = s.skills.wenxue.level;
  var r3 = ns.decaySkills({ force: true });
  assert(r3.ok === true, 'decay: 衰减 ok');
  assert(r3.decayed.length >= 1, 'decay: 至少 1 项衰减');
  var wenxueDecay = r3.decayed.find(function (d) { return d.skill === 'wenxue'; });
  assert(wenxueDecay, 'decay: wenxue 在衰减列表');
  assert(wenxueDecay.newLevel < prevLevel, 'decay: wenxue level 降低');
  assert(wenxueDecay.amount >= 1, 'decay: 衰减量 ≥1');

  // 0 level 不衰减
  s.skills.yinlv.level = 0;
  s.skills.yinlv.lastPracticedTurn = 0; // 远古
  ctx.GM.turn = 100;
  var r4 = ns.decaySkills({ force: true, skillKeys: ['yinlv'] });
  assert(r4.decayed.length === 0, 'decay: 0 level 不衰减');

  // 指定 skillKeys 范围
  s.skills.wushu.level = 30;
  s.skills.wushu.lastPracticedTurn = 0;
  s.skills.yishu.level = 30;
  s.skills.yishu.lastPracticedTurn = 0;
  ctx.GM.turn = 100;
  var r5 = ns.decaySkills({ force: true, skillKeys: ['wushu'] });
  assert(r5.ok === true, 'decay: 指定 skillKeys ok');
  var hasWushu = r5.decayed.some(function (d) { return d.skill === 'wushu'; });
  var hasYishu = r5.decayed.some(function (d) { return d.skill === 'yishu'; });
  assert(hasWushu, 'decay: 指定 wushu 在范围');
  assert(!hasYishu, 'decay: 不在范围的 yishu 不衰减');

  // 衰减后 lastDecayTurn 更新
  assert(s.lastDecayTurn === 100, 'decay: lastDecayTurn 更新');
}

// SubTest 12: 26B.11 技能突破
function testBreakthrough(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerSkill;
  resetPlayerCash(ctx, 100000);

  // 等级未达阈值拒
  var s = ns._ensureState();
  s.skills.wenxue.level = 50;
  s.skills.wenxue.exp = 99;
  s.skills.wenxue.breakthroughCap = 90;
  var r1 = ns.checkBreakthrough('wenxue', {});
  assert(r1.ok === false && r1.code === 'not-at-threshold', 'break: 未达阈值拒');
  assert(r1.level === 50 && r1.threshold === 90, 'break: level/threshold 回显');

  // 达到阈值·多次尝试确保至少看到一次成功
  s.skills.wenxue.level = 90;
  s.skills.wenxue.exp = 99;
  s.skills.wenxue.breakthroughCap = 90;
  var passed = false, failed = false;
  var passR = null, failR = null;
  for (var i = 0; i < 100; i++) {
    s.skills.wenxue.level = 90;
    s.skills.wenxue.exp = 99;
    s.skills.wenxue.breakthroughCap = 90;
    ctx.GM._energy = 100;
    ctx.P.playerInfo._timeUsedThisTurn = 0;
    var r2 = ns.checkBreakthrough('wenxue', {});
    if (r2.ok !== true) continue;
    if (r2.passed) { passed = true; passR = r2; }
    else { failed = true; failR = r2; }
    if (passed && failed) break;
  }
  assert(passed, 'break: 100 次尝试至少一次突破成功');
  assert(failed, 'break: 100 次尝试至少一次突破失败');

  // 突破成功·cap 升级
  assert(passR.passed === true, 'break: passed=true');
  assert(passR.prevCap === 90, 'break: prevCap=90');
  assert(passR.newCap === 95, 'break: newCap=95');
  assert(passR.bonus && passR.bonus.ok === true, 'break: 成功有奖励经验');

  // 突破失败·level -1·exp 清零
  assert(failR.passed === false, 'break: failed passed=false');
  assert(typeof failR.prevLevel === 'number' && typeof failR.newLevel === 'number', 'break: 失败有 prevLevel/newLevel');
  assert(failR.newLevel === failR.prevLevel - 1, 'break: 失败 level -1');
  assert(typeof failR.penalty === 'number', 'break: 失败有 penalty');

  // 已达等级上限拒
  s.skills.wenxue.level = 100;
  s.skills.wenxue.breakthroughCap = 100;
  var r3 = ns.checkBreakthrough('wenxue', {});
  assert(r3.ok === false && r3.code === 'at-max', 'break: 达上限拒');

  // 未知技能拒
  var r4 = ns.checkBreakthrough('unknown', {});
  assert(r4.ok === false && /未知技能/.test(r4.reason), 'break: 未知技能拒');

  // 师傅加成·拜师后突破概率提升
  ctx.GM.chars.push({ name: '师傅李', alive: true, military: 60, wushu: 80 });
  var r5 = ns.apprenticeWithMaster('师傅李', 'wenxue', { gift: 100 });
  assert(r5.ok === true, 'break: 拜师 ok');
  s.skills.wenxue.level = 90;
  s.skills.wenxue.exp = 99;
  s.skills.wenxue.breakthroughCap = 90;
  // 师傅在场 +15%·100 次尝试成功数应高于无师傅（不严格等价·仅看师傅加成路径无异常）
  var passCount = 0;
  for (var j = 0; j < 100; j++) {
    s.skills.wenxue.level = 90;
    s.skills.wenxue.exp = 99;
    s.skills.wenxue.breakthroughCap = 90;
    ctx.GM._energy = 100;
    ctx.P.playerInfo._timeUsedThisTurn = 0;
    var r6 = ns.checkBreakthrough('wenxue', {});
    if (r6.ok && r6.passed) passCount++;
  }
  assert(passCount > 0, 'break: 师傅加成下至少一次成功');
}

// SubTest 13: 26B.12 御案面板
function testPanel(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerSkill;
  resetPlayerCash(ctx, 100000);

  // 空面板（init 后）
  ns.init();
  var html0 = ns.renderPanel();
  assert(typeof html0 === 'string' && html0.length > 0, 'panel: 空面板非空字符串');
  assert(/ps-panel/.test(html0), 'panel: 含 ps-panel 类');
  assert(/自 我 提 升 · 概 览/.test(html0), 'panel: 含"自 我 提 升 · 概 览"段');
  assert(/技 能 · 名 录/.test(html0), 'panel: 含"技 能 · 名 录"段');
  assert(/提 升 路 径/.test(html0), 'panel: 含"提 升 路 径"段');

  // 做几个动作让面板有数据
  setLoc(ctx, '太学');
  ns.studyAtAcademy({});
  setLoc(ctx, '少林寺');
  ns.templeRetreat({});

  var html = ns.renderPanel();
  assert(typeof html === 'string' && html.length > 100, 'panel: 返回长字符串');
  assert(/ps-panel/.test(html), 'panel: 含 ps-panel 类');
  assert(/自 我 提 升 · 概 览/.test(html), 'panel: 含概览段');
  assert(/技 能 · 名 录/.test(html), 'panel: 含名录段');
  assert(/提 升 路 径/.test(html), 'panel: 含提升路径段');
  // 含技能名
  assert(/文学/.test(html), 'panel: 含"文学"');
  assert(/算学/.test(html), 'panel: 含"算学"');
  // 含路径名
  assert(/学塾就读/.test(html), 'panel: 含"学塾就读"');
  assert(/拜师学艺/.test(html), 'panel: 含"拜师学艺"');
  assert(/切磋比武/.test(html), 'panel: 含"切磋比武"');
  // 含近事段
  assert(/近 事/.test(html), 'panel: 含"近 事"段');

  // 朝代中立·不含明清专名
  assert(!/锦衣卫|司礼监|东厂|西厂|军机处|内阁|票拟|廷杖|八股/.test(html), 'panel: 不含明清中央专名');
  assert(!/巡按|总督|巡抚|郡王|藩王/.test(html), 'panel: 不含明清地方/宗藩专名');

  // 突破阈值展示·把 level 推到 90
  var s = ns._ensureState();
  s.skills.wenxue.level = 90;
  s.skills.wenxue.breakthroughCap = 90;
  var html2 = ns.renderPanel();
  assert(/待 突 破|⚠|突破阈值/.test(html2), 'panel: 含突破提示');
}

// SubTest 14: 26B.13 跨朝代 hook·自定义技能
function testCustomSkill(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerSkill;
  resetPlayerCash(ctx, 100000);
  ns.init();

  // 注册自定义技能·如「骑射」
  var r1 = ns.registerCustomSkill('qishe', { label: '骑射', category: 'martial', hint: '骑马射箭·游牧技艺' });
  assert(r1.ok === true, 'custom: 注册骑射 ok');
  assert(r1.skill === 'qishe', 'custom: skill=qishe');
  assert(r1.label === '骑射', 'custom: label=骑射');

  // 自定义技能 entry 已建
  var entry = ns.getSkill('qishe');
  assert(entry !== null, 'custom: qishe entry 存在');
  assert(entry.level === 0, 'custom: qishe level=0');

  // 自定义技能在 listSkills 中
  var list = ns.listSkills();
  var qisheItem = list.find(function (x) { return x.key === 'qishe'; });
  assert(qisheItem, 'custom: listSkills 含 qishe');
  assert(qisheItem.custom === true, 'custom: qishe custom=true');
  assert(qisheItem.label === '骑射', 'custom: qishe label=骑射');

  // 用自定义技能走学塾就读（须先到学塾）
  setLoc(ctx, '太学');
  var r2 = ns.studyAtAcademy({ skillFocus: ['qishe'] });
  assert(r2.ok === true, 'custom: 学塾就读用自定义技能 ok');
  assert(r2.skills.indexOf('qishe') >= 0, 'custom: skills 含 qishe');

  // 默认技能键不可覆盖
  var r3 = ns.registerCustomSkill('wenxue', { label: '新文学' });
  assert(r3.ok === false && /不可覆盖/.test(r3.reason), 'custom: 默认键拒覆盖');

  // 取消注册
  var r4 = ns.unregisterCustomSkill('qishe');
  assert(r4.ok === true, 'custom: 取消注册 ok');
  // customSkills 中已无·但 skills[skillKey] 保留历史
  var s = ns.getState();
  assert(!s.customSkills.qishe, 'custom: customSkills 已无 qishe');
  assert(s.skills.qishe, 'custom: skills 保留历史 qishe entry');

  // 取消未注册的拒
  var r5 = ns.unregisterCustomSkill('not_registered');
  assert(r5.ok === false, 'custom: 取消未注册拒');

  // 未注册键拒
  var r6 = ns.registerCustomSkill('', {});
  assert(r6.ok === false, 'custom: 缺键拒');
}

// SubTest 15: 月度 tick
function testTick(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerSkill;
  resetPlayerCash(ctx, 100000);
  ns.init();

  // tick = decaySkills 等价
  var r = ns.tick({});
  assert(r.ok === true, 'tick: ok');
  assert(r.decay && typeof r.decay === 'object', 'tick: decay 字段');
  assert(typeof r.turn === 'number', 'tick: turn 数字');

  // forceDecay 透传
  var r2 = ns.tick({ forceDecay: true });
  assert(r2.ok === true, 'tick: forceDecay ok');
  assert(r2.decay.skipped === false, 'tick: forceDecay skipped=false');
}

// SubTest 16: 跨朝代铁律审计
function testCrossDynastyIron(ctx) {
  // 扫描实际代码（剥注释）·确保无明清专名
  var src = fs.readFileSync(path.join(ROOT, 'tm-player-skill.js'), 'utf8');
  var lines = src.split(/\r?\n/);
  var codeLines = lines.filter(function (l) {
    var t = l.trim();
    return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
  });
  var code = codeLines.join('\n');
  // 检查明清专名
  var forbidden = ['内阁', '票拟', '司礼监', '东厂', '西厂', '锦衣卫', '军机处', '廷杖', '八股', '巡按', '总督', '巡抚', '郡王', '藩王'];
  var hits = [];
  forbidden.forEach(function (term) {
    if (code.indexOf(term) >= 0) hits.push(term);
  });
  assert(hits.length === 0, 'cross-dynasty: 代码体无明清专名·命中 ' + hits.join(', '));

  // 古代通用称谓保留
  assert(code.indexOf('学塾') >= 0, 'cross-dynasty: 学塾（古代通用）保留');
  assert(code.indexOf('寺观') >= 0, 'cross-dynasty: 寺观保留');
  assert(code.indexOf('拜师') >= 0, 'cross-dynasty: 拜师保留');
  assert(code.indexOf('出师') >= 0, 'cross-dynasty: 出师保留');
  assert(code.indexOf('悟道') >= 0, 'cross-dynasty: 悟道保留');
  assert(code.indexOf('切磋') >= 0, 'cross-dynasty: 切磋保留');
  assert(code.indexOf('比武') >= 0, 'cross-dynasty: 比武保留');
  assert(code.indexOf('自学') >= 0, 'cross-dynasty: 自学保留');
  assert(code.indexOf('游历') >= 0, 'cross-dynasty: 游历保留');
  assert(code.indexOf('军中') >= 0, 'cross-dynasty: 军中保留');
  // 古代通用技能名保留
  assert(code.indexOf('文学') >= 0, 'cross-dynasty: 文学保留');
  assert(code.indexOf('武术') >= 0, 'cross-dynasty: 武术保留');
  assert(code.indexOf('医术') >= 0, 'cross-dynasty: 医术保留');
  assert(code.indexOf('音律') >= 0, 'cross-dynasty: 音律保留');
  // 注释段提及禁词清单的引用式表述允许（用 grep 排除）
  // 此处只看代码体（已剥注释）·不会误报
}

// SubTest 17: 双路径挂载
function testDualMount(ctx) {
  var mod = require(path.join(ROOT, 'tm-player-skill.js'));
  assert(mod && typeof mod.init === 'function', 'dual-mount: module.exports.init 是函数');
  assert(mod && typeof mod.studyAtAcademy === 'function', 'dual-mount: module.exports.studyAtAcademy 是函数');
  assert(mod && typeof mod.apprenticeWithMaster === 'function', 'dual-mount: module.exports.apprenticeWithMaster 是函数');
  assert(mod && typeof mod.checkBreakthrough === 'function', 'dual-mount: module.exports.checkBreakthrough 是函数');
  assert(mod && typeof mod.renderPanel === 'function', 'dual-mount: module.exports.renderPanel 是函数');
  assert(mod && typeof mod.registerCustomSkill === 'function', 'dual-mount: module.exports.registerCustomSkill 是函数');
  assert(mod && typeof mod.tick === 'function', 'dual-mount: module.exports.tick 是函数');
  assert(mod.SKILL_TYPES && Object.keys(mod.SKILL_TYPES).length === 10, 'dual-mount: SKILL_TYPES 10 种');
  assert(mod.TRAINING_PATHS && Object.keys(mod.TRAINING_PATHS).length === 7, 'dual-mount: TRAINING_PATHS 7 种');
  assert(Array.isArray(mod.BREAKTHROUGH_THRESHOLDS) && mod.BREAKTHROUGH_THRESHOLDS.length === 3, 'dual-mount: BREAKTHROUGH_THRESHOLDS 3 档');
  assert(mod.DECAY_CONFIG && mod.DECAY_CONFIG.intervalTurns === 12, 'dual-mount: DECAY_CONFIG.intervalTurns=12');
  assert(mod.LEVEL_MAX === 100, 'dual-mount: LEVEL_MAX=100');
  assert(mod.EXP_PER_LEVEL === 100, 'dual-mount: EXP_PER_LEVEL=100');
}

// SubTest 18: listXxx 接口
function testListInterfaces(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerSkill;

  var skills = ns.listSkills();
  assert(Array.isArray(skills) && skills.length === 10, 'list: 默认 10 项技能');
  var s0 = skills[0];
  assert(s0.key && s0.label && typeof s0.category === 'string', 'list: 技能条目字段齐');
  assert(typeof s0.level === 'number' && typeof s0.exp === 'number', 'list: level/exp 数字');
  assert(typeof s0.breakthroughCap === 'number', 'list: breakthroughCap 数字');
  assert(s0.custom === false, 'list: 默认技能 custom=false');

  var paths = ns.listTrainingPaths();
  assert(Array.isArray(paths) && paths.length === 7, 'list: 7 种提升路径');
  paths.forEach(function (p) {
    assert(p.id && p.label, 'list: 路径条目 id/label');
    assert(typeof p.cost === 'number' && typeof p.energy === 'number' && typeof p.time === 'number', 'list: 路径 cost/energy/time 数字');
    assert(typeof p.expGain === 'number', 'list: 路径 expGain 数字');
    assert(Array.isArray(p.skills), 'list: 路径 skills 数组');
  });
  var pathIds = paths.map(function (p) { return p.id; }).sort();
  var expected = ['academy', 'military', 'mentor', 'self', 'spar', 'temple', 'travel'].sort();
  assert(JSON.stringify(pathIds) === JSON.stringify(expected), 'list: 7 路径 id 完整·实际 ' + pathIds.join(','));

  var ths = ns.listBreakthroughThresholds();
  assert(Array.isArray(ths) && ths.length === 3, 'list: 3 档阈值');
  assert(ths[0] === 90 && ths[1] === 95 && ths[2] === 99, 'list: 阈值 90/95/99');

  // 注册自定义技能后·listSkills 应包含
  ns.init();
  ns.registerCustomSkill('qishe', { label: '骑射', category: 'martial', hint: '骑马射箭' });
  var skills2 = ns.listSkills();
  assert(skills2.length === 11, 'list: 注册后 11 项');
  var qishe = skills2.find(function (x) { return x.key === 'qishe'; });
  assert(qishe && qishe.custom === true, 'list: qishe custom=true');
}

// ── 入口 ────────────────────────────────────────────────────
try {
  var ctx = buildContext();
  testNamespace(ctx);
  testGuards(ctx);
  testStateInit(ctx);
  testStudyAtAcademy(ctx);
  testApprenticeship(ctx);
  testSelfStudy(ctx);
  testTravelForInsight(ctx);
  testMilitaryTraining(ctx);
  testTempleRetreat(ctx);
  testSparWithNpc(ctx);
  testDecaySkills(ctx);
  testBreakthrough(ctx);
  testPanel(ctx);
  testCustomSkill(ctx);
  testTick(ctx);
  testCrossDynastyIron(ctx);
  testDualMount(ctx);
  testListInterfaces(ctx);
  console.log('[smoke-player-skill] PASS · 18 sub-tests · namespace(10-skills/7-paths/3-thresholds)/guards(trans/unknown-skill/no-npc/non-military/not-at-academy/not-at-temple/no-cash)/state-init(skills+trainingLog+mentors+insights+events+customSkills+lastDecayTurn)/academy(location+tuition+exp+skillFocus)/apprenticeship(disciple-interact+study+graduate-level60+self-expiry)/self-study(2-skills+intensity+illness)/travel(soft-movement+insights+bonus+fallback)/military(role-guard+win-bonus+lose-injury)/temple(location+incense+enlightenment)/spar(antagonize-interact+win-lose+injury+interact-fail-fallback)/decay(period+idle24+force+skillKeys+0-level-skip)/breakthrough(90/95/99+success-cap+fail-level-1+master-bonus)/panel/cross-dynasty-hook(register+unregister+default-key-reject)/tick=decay/dual-mount/list-interfaces');
  process.exit(0);
} catch (e) {
  console.error('[smoke-player-skill] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
