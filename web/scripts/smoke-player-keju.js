#!/usr/bin/env node
// scripts/smoke-player-keju.js — Phase 4.5 · Task 24 玩家参加科举考试 smoke
// 验证：
//   - TM.PlayerKeju 命名空间暴露（双路径：globalThis + module.exports）
//   - 玩家考生状态（GM._playerKeju: stage/status/currentLevel/examHistory/scandals）
//   - "报名应试"：4 类开放身份（商贾/隐逸/宗室旁支/低级官吏子弟）可走科举路径
//   - "作答考题"：通过 tm-keju-question-ui.js 顶层函数（_kjCalcTopicAlignment）+ LLM 评卷
//   - "拜师求学"：关联人物互动（TM.PlayerInteraction.interact npcName, 'disciple', payload）
//   - "考中进士身份变更"：身份变更为进士·playerRole 升级为 minister·自动授予官职（tm-keju-allocation.js）
//   - "卷入科场弊案"：3 类选择（行贿考官/请托关节/枪替冒名）·沿用 tm-keju-scandal.js
//   - 御案"科举"面板
//   - 跨朝代通用：剧本 hook 政策参数·引擎只提供"报名→作答→评卷→授官"通用框架
//   - 守卫：非穿越模式 / 身份不可走 / 重复报名 / 答卷为空 / 未在殿试阶段 各拒
//   - LLM 降级：无 LLM 时返回确定性 mock 文本与规则引擎评分

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

// ── 加载 tm-player-keju.js（IIFE 模式，sandbox.window = ctx）──
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
    fs.readFileSync(path.join(ROOT, 'tm-player-keju.js'), 'utf8'),
    ctx, { filename: 'tm-player-keju.js' }
  );
  return ctx;
}

// ── Mock 全局 P/GM/TM + PlayerEconomy/PlayerInteraction 软依赖 ──
function setupCtx(ctx, opts) {
  opts = opts || {};

  // 玩家：李商贾（穿越模式·merchant·可走科举路径）
  var playerCh = {
    name: '李商贾', alive: true, officialTitle: '富商', role: '商',
    personality: '精明', rankLevel: 9, learning: 30, intelligence: 40
  };
  // NPC1：王大儒（大儒师父）
  var npcWang = {
    name: '王大儒', alive: true, officialTitle: '大儒', role: '儒',
    personality: '方正', learning: 80, masterType: 'confucian'
  };
  // NPC2：张名将（武将师父）
  var npcZhang = {
    name: '张名将', alive: true, officialTitle: '将军', role: '将',
    personality: '刚毅', military: 80, masterType: 'military'
  };
  // NPC3：已故（守卫测试用）
  var npcDead = { name: '故儒', alive: false, officialTitle: '已故', role: '儒' };

  ctx.GM = {
    sid: 'smoke',
    turn: 10,
    year: 1043,
    chars: [playerCh, npcWang, npcZhang, npcDead],
    corruption: 30
  };
  ctx.P = {
    playerInfo: {
      transmigrationMode: true,
      playerRole: 'merchant',
      characterName: '李商贾',
      characterTitle: '富商',
      sovereignName: '今上',
      officialRelation: 50,
      money: 10000
    },
    dynasty: '宋',
    conf: { useNewKejuScandal: true },  // 默认开弊案 flag
    keju: {
      currentExam: {
        id: 'keju_1043_zh_smoke',
        type: 'zhengke',
        stage: 'preliminary_local',
        chiefExaminer: '王大儒',
        huishiTopic: '请述"为政以德"之要',
        playerQuestion: '策问：今欲兴农，当以何策为先？',
        gradPool: [],
        dianshiResults: []
      },
      feeOverrides: null
    },
    time: { year: 1043 }
  };

  // mock TM.Transmigration
  if (!ctx.TM) ctx.TM = {};
  ctx.TM.Transmigration = {
    isTransmigrationMode: function () { return !!ctx.P.playerInfo.transmigrationMode; }
  };

  // mock TM.PlayerEconomy（用真实 API 名：getBalance / spend / addIncome）
  ctx._playerEconomyState = { cash: 10000 };
  ctx.TM.PlayerEconomy = {
    getBalance: function () { return ctx._playerEconomyState.cash; },
    spend: function (cost, label) {
      if (ctx._playerEconomyState.cash < cost) {
        return { ok: false, reason: '银钱不足', cash: ctx._playerEconomyState.cash };
      }
      ctx._playerEconomyState.cash -= cost;
      return { ok: true, cash: ctx._playerEconomyState.cash };
    },
    addIncome: function (source, amount, opts) {
      ctx._playerEconomyState.cash += amount;
      return { ok: true, cash: ctx._playerEconomyState.cash };
    }
  };

  // mock TM.PlayerInteraction（用于拜师 disciple 互动）
  ctx._interactionCalls = [];
  ctx.TM.PlayerInteraction = {
    interact: function (npcName, kind, payload) {
      ctx._interactionCalls.push({ npc: npcName, kind: kind, payload: payload });
      var ch = ctx.GM.chars.find(function (c) { return c && c.name === npcName; });
      if (!ch || ch.alive === false) return { ok: false, reason: 'NPC 不可互动' };
      return { ok: true, kind: kind, npc: npcName, scene: '拜' + npcName + '为师·受业解惑' };
    }
  };

  // mock addEB / toast / tmIcon / escHtml / uid
  ctx._ebCalls = [];
  ctx.addEB = function (cat, txt) { ctx._ebCalls.push({ cat: cat, txt: txt }); };
  ctx.toast = function (m) { /* noop */ };
  ctx.tmIcon = function (name, size) { return ''; };
  ctx.escHtml = function (s) { return String(s == null ? '' : s); };
  ctx.uid = function () { return 'uid_' + Math.random().toString(36).slice(2, 8); };

  // mock tm-keju-runtime.js 顶层函数（startKejuExam / advanceKejuByDays）
  ctx.startKejuExam = function (o) {
    // 已有 currentExam·不重置·noop
    return null;
  };
  ctx.advanceKejuByDays = function (d) { return null; };

  // mock tm-keju-question-ui.js 顶层函数（_kj*）
  ctx._kjCalcTopicAlignment = function (topicText, view) {
    if (!topicText) return 50;
    // 简化：含"为政"返 80·含"兴农"返 70·否则 50
    if (/为政/.test(topicText)) return 80;
    if (/兴农/.test(topicText)) return 70;
    return 50;
  };
  ctx._kjRenderExaminerHintBar = function (examiner) {
    if (!examiner) return '';
    return '<div class="kj-examiner-hint">主考偏好·' + (examiner.name || '未知') + '</div>';
  };
  // _kejuExaminerView 用于 _kjCalcAlignment 调用前的 view 派生
  ctx._kejuExaminerView = function (ch) {
    if (!ch) return null;
    return { preferContent: 'classics', strictness: 50, factionBias: 0.3, preferRegion: '', _summary: '偏好经义' };
  };
  ctx.findCharByName = function (n) {
    return ctx.GM.chars.find(function (c) { return c && c.name === n; }) || null;
  };

  // mock tm-keju-scandal.js 顶层函数（_kj*）
  ctx._kjSpawnScandalCalls = [];
  ctx._kjSpawnScandal = function (type, reason, detail) {
    ctx._kjSpawnScandalCalls.push({ type: type, reason: reason, detail: detail });
    return true;
  };

  // mock tm-keju-allocation.js 顶层函数（_kj*）
  ctx._kjDispatchCalls = [];
  ctx._kjDispatchAllocationByDynasty = function (grads, dynasty) {
    ctx._kjDispatchCalls.push({ grads: grads, dynasty: dynasty });
    // 模拟宋·状元直授制诰 / 4-10 通判 / 11+ 知县
    return grads.map(function (g, i) {
      var rank = g.rank || (i + 1);
      var dept, title;
      if (rank === 1) { dept = '中书省'; title = '知制诰'; }
      else if (rank <= 3) { dept = '中书省'; title = '中书舍人'; }
      else if (rank <= 10) { dept = '中央'; title = '通判'; }
      else { dept = '地方'; title = '知县'; }
      return { name: g.name, rank: rank, dept: dept, officialTitle: title, allocation: 'song' };
    });
  };
  ctx._kjApplyCalls = [];
  ctx._kjApplyAllocations = function (allocations, exam) {
    ctx._kjApplyCalls.push({ allocations: allocations, exam: exam });
    var applied = 0;
    if (!Array.isArray(ctx.GM.chars)) return 0;
    allocations.forEach(function (a) {
      var ch = ctx.GM.chars.find(function (c) { return c && c.name === a.name; });
      if (ch) {
        ch.officialTitle = a.officialTitle;
        if (a.dept) ch.dept = a.dept;
        ch._allocationType = a.allocation;
        applied++;
      }
    });
    return applied;
  };

  // mock tm-keju-school-network.js 顶层函数（_kjp*）
  ctx._kjpInitSchoolNetwork = function () {
    if (!ctx.GM._schoolNetwork) ctx.GM._schoolNetwork = { academies: [], tier: 'nascent' };
    return ctx.GM._schoolNetwork;
  };
  ctx._kjpGetActiveAcademies = function () {
    if (!ctx.GM._schoolNetwork) return [];
    return ctx.GM._schoolNetwork.academies.filter(function (a) { return a && a.lifecycle !== 'banned'; });
  };
  ctx._kjpSpawnShanzhang = function (cfg) {
    return { name: cfg && cfg.founder, _spawned: true };
  };

  // 重置 LLM 适配（每个 sub-test 起点干净·避免上个 test 的 callAI 泄漏）
  ctx.callAI = undefined;
  ctx.callLLM = undefined;

  return ctx;
}

// ── Sub-tests ───────────────────────────────────────────────

function testNamespace(ctx) {
  assert(ctx.TM && ctx.TM.PlayerKeju, 'namespace: TM.PlayerKeju 暴露');
  var ns = ctx.TM.PlayerKeju;
  assert(typeof ns.applyForExam === 'function', 'namespace: applyForExam 是函数');
  assert(typeof ns.answerQuestion === 'function', 'namespace: answerQuestion 是函数');
  assert(typeof ns.seekMaster === 'function', 'namespace: seekMaster 是函数');
  assert(typeof ns.passDianshiAndPromote === 'function', 'namespace: passDianshiAndPromote 是函数');
  assert(typeof ns.triggerScandal === 'function', 'namespace: triggerScandal 是函数');
  assert(typeof ns.renderPanel === 'function', 'namespace: renderPanel 是函数');
  assert(typeof ns.getCandidateState === 'function', 'namespace: getCandidateState 是函数');
  assert(typeof ns.listExamHistory === 'function', 'namespace: listExamHistory 是函数');
  assert(typeof ns.listMasters === 'function', 'namespace: listMasters 是函数');
  assert(typeof ns.listScandals === 'function', 'namespace: listScandals 是函数');

  // 常量
  assert(ns.STAGE && Object.keys(ns.STAGE).length === 4, 'namespace: STAGE 共 4 阶段');
  var expectedStages = ['TONGSHI', 'XIANGSHI', 'HUISHI', 'DIANSHI'];
  expectedStages.forEach(function (k) { assert(ns.STAGE[k], 'namespace: STAGE.' + k + ' 存在'); });
  assert(ns.EXAM_STATUS && Object.keys(ns.EXAM_STATUS).length === 7, 'namespace: EXAM_STATUS 共 7 状态');
  assert(ns.IDENTITY_OPEN_CLASSES && Object.keys(ns.IDENTITY_OPEN_CLASSES).length === 5, 'namespace: IDENTITY_OPEN_CLASSES 共 5 类');
  // 4 类核心开放身份必含
  assert(ns.IDENTITY_OPEN_CLASSES.merchant, 'namespace: IDENTITY_OPEN_CLASSES.merchant（商贾）');
  assert(ns.IDENTITY_OPEN_CLASSES.commoner, 'namespace: IDENTITY_OPEN_CLASSES.commoner（隐逸）');
  assert(ns.IDENTITY_OPEN_CLASSES.prince, 'namespace: IDENTITY_OPEN_CLASSES.prince（宗室旁支）');
  assert(ns.IDENTITY_OPEN_CLASSES.retired_official, 'namespace: IDENTITY_OPEN_CLASSES.retired_official（低级官吏子弟）');
  assert(ns.SCANDAL_CHOICES && Object.keys(ns.SCANDAL_CHOICES).length === 3, 'namespace: SCANDAL_CHOICES 共 3 选择');
  var expectedChoices = ['bribe', 'solicit', 'impersonate'];
  expectedChoices.forEach(function (k) { assert(ns.SCANDAL_CHOICES[k], 'namespace: SCANDAL_CHOICES.' + k + ' 存在'); });
}

function testGuards(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerKeju;

  // 非穿越模式
  ctx.P.playerInfo.transmigrationMode = false;
  var r1 = ns.applyForExam({ stage: 'tongshi' });
  assert(r1.ok === false, 'guard: 非穿越模式拒绝');
  assert(/非穿越模式/.test(r1.reason), 'guard: 非穿越模式 reason');
  assert(r1.code === 'not-transmigration', 'guard: not-transmigration code');
  ctx.P.playerInfo.transmigrationMode = true;

  // 身份不可走科举·切换为 emperor
  ctx.P.playerInfo.playerRole = 'emperor';
  var r2 = ns.applyForExam({ stage: 'tongshi' });
  assert(r2.ok === false, 'guard: emperor 身份拒绝');
  assert(r2.code === 'identity-not-eligible', 'guard: identity-not-eligible code');
  assert(/不可走科举路径/.test(r2.reason), 'guard: 身份不可走 reason');
  ctx.P.playerInfo.playerRole = 'merchant';

  // 重复报名·先成功报一次再拒绝
  var ok1 = ns.applyForExam({ stage: 'tongshi' });
  assert(ok1.ok === true, 'guard: 首次报名 ok');
  var r3 = ns.applyForExam({ stage: 'xiangshi' });
  assert(r3.ok === false, 'guard: 重复报名拒绝');
  assert(r3.code === 'exam-in-progress', 'guard: exam-in-progress code');

  // 答卷为空
  // 先重置状态（用 _resetCandidate 内部函数）
  ns._resetCandidate();
  ns.applyForExam({ stage: 'tongshi' });
  var r4 = ns.answerQuestion({ answer: '' });
  assert(r4.ok === false, 'guard: 空答卷拒绝');
  assert(r4.code === 'empty-answer', 'guard: empty-answer code');

  // 未在殿试阶段·触发 passDianshiAndPromote 拒
  ns._resetCandidate();
  var r5 = ns.passDianshiAndPromote();
  assert(r5.ok === false, 'guard: 未在殿试阶段拒绝');
  assert(r5.code === 'wrong-stage' || r5.code === 'wrong-status', 'guard: wrong-stage/wrong-status code');

  // 弊案选择非法
  var r6 = ns.triggerScandal('bogus_choice');
  assert(r6.ok === false, 'guard: 非法弊案选择拒绝');
  assert(r6.code === 'invalid-choice', 'guard: invalid-choice code');

  // 拜师·NPC 不存在
  var r7 = ns.seekMaster('不存在的NPC');
  assert(r7.ok === false, 'guard: NPC 不存在拒绝');
  assert(r7.code === 'npc-not-found', 'guard: npc-not-found code');

  // 拜师·NPC 已故
  var r8 = ns.seekMaster('故儒');
  assert(r8.ok === false, 'guard: 已故 NPC 拒绝');
  assert(r8.code === 'npc-dead', 'guard: npc-dead code');
}

function testApplyForExam(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerKeju;
  var cashBefore = ctx._playerEconomyState.cash;

  var r = ns.applyForExam({ stage: 'tongshi', note: '应试县试' });
  assert(r.ok === true, 'apply: 童试报名 ok');
  assert(r.stage === 'tongshi', 'apply: stage=tongshi');
  assert(r.level === '童试', 'apply: level=童试·实际 ' + r.level);
  assert(r.fee === 50, 'apply: fee=50·实际 ' + r.fee);

  // 银钱扣 50
  assert(ctx._playerEconomyState.cash === cashBefore - 50, 'apply: 银钱扣 50·实际余 ' + ctx._playerEconomyState.cash);

  // 考生状态写入
  var s = ns.getCandidateState();
  assert(s.stage === 'tongshi', 'apply: state.stage=tongshi');
  assert(s.status === 'registered', 'apply: state.status=registered·实际 ' + s.status);
  assert(s.currentLevel === '童试', 'apply: state.currentLevel=童试');

  // 已注册到 P.keju.currentExam.gradPool
  var exam = ctx.P.keju.currentExam;
  var playerEntry = exam.gradPool.find(function (g) { return g._player; });
  assert(playerEntry, 'apply: 玩家已注册到 gradPool');
  assert(playerEntry.name === '李商贾', 'apply: gradPool.name=李商贾');
  assert(playerEntry.class === '商贾', 'apply: gradPool.class=商贾·实际 ' + playerEntry.class);

  // scene 非空（降级 mock）
  assert(typeof r.scene === 'string' && r.scene.length > 0, 'apply: scene 非空');
  assert(/李商贾|商贾/.test(r.scene), 'apply: scene 含玩家/商贾');

  // 4 类开放身份各报一次（用不同 playerRole）
  var roleMap = {
    merchant: '商贾',
    commoner: '隐逸',
    prince: '宗室旁支',
    retired_official: '低级官吏子弟',
    artisan: '匠户子弟'
  };
  Object.keys(roleMap).forEach(function (role) {
    setupCtx(ctx);
    ctx.P.playerInfo.playerRole = role;
    var r2 = ctx.TM.PlayerKeju.applyForExam({ stage: 'tongshi' });
    assert(r2.ok === true, 'apply: ' + role + ' 报名 ok');
  });
}

function testAnswerQuestion(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerKeju;

  // 先报名
  var a = ns.applyForExam({ stage: 'huishi' });
  assert(a.ok === true, 'answer: 会试报名 ok');

  // 作答（含 LLM 降级·走规则引擎）
  var r = ns.answerQuestion({
    type: 'classics',
    topic: '请述"为政以德"之要义',
    answer: '为政以德者·治国以仁德为本·不严而治·不令而行·此王道之要也。'
  });
  assert(r.ok === true, 'answer: 作答 ok');
  assert(r.type === 'classics', 'answer: type=classics');
  assert(r.typeLabel === '经义', 'answer: typeLabel=经义');
  assert(typeof r.score === 'number' && r.score >= 0 && r.score <= 100, 'answer: score 0-100·实际 ' + r.score);
  assert(typeof r.alignment === 'number' && r.alignment >= 0 && r.alignment <= 100, 'answer: alignment 0-100·实际 ' + r.alignment);
  assert(typeof r.comment === 'string' && r.comment.length > 0, 'answer: comment 非空');
  assert(r.alignment === 80, 'answer: alignment=80（含"为政"·mock 80）·实际 ' + r.alignment);

  // 状态变更为 graded
  var s = ns.getCandidateState();
  assert(s.status === 'graded', 'answer: state.status=graded·实际 ' + s.status);
  assert(s.score === r.score, 'answer: state.score 同步');

  // 应试历史写入
  var hist = ns.listExamHistory();
  assert(hist.length === 1, 'answer: 历史 1 条·实际 ' + hist.length);
  assert(hist[0].stage === 'huishi', 'answer: 历史[0].stage=huishi');
  assert(hist[0].score === r.score, 'answer: 历史[0].score 同步');

  // gradPool 同步玩家成绩
  var exam = ctx.P.keju.currentExam;
  var playerEntry = exam.gradPool.find(function (g) { return g._player; });
  assert(playerEntry.score === r.score, 'answer: gradPool 同步玩家 score');

  // LLM 路径·挂上 callAI
  ctx.callAI = function (prompt) {
    return 'SCORE: 88\nCOMMENT: 文理通达·颇有见地';
  };
  ns._resetCandidate();
  ns.applyForExam({ stage: 'huishi' });
  var r2 = ns.answerQuestion({
    type: 'policy',
    topic: '策问：兴农之策',
    answer: '兴农之策在于轻徭薄赋·与民休息。'
  });
  assert(r2.ok === true, 'answer: LLM 作答 ok');
  assert(r2.score === 88, 'answer: LLM score=88·实际 ' + r2.score);
  assert(/文理通达/.test(r2.comment), 'answer: LLM comment 解析');
}

function testSeekMaster(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerKeju;
  var cashBefore = ctx._playerEconomyState.cash;

  // 拜师王大儒（confucian·大儒）
  var r = ns.seekMaster('王大儒', { tuition: 200, note: '拜师求学' });
  assert(r.ok === true, 'seek: 拜师 ok');
  assert(r.masterName === '王大儒', 'seek: masterName=王大儒');
  assert(r.masterType === 'confucian', 'seek: masterType=confucian');
  assert(r.masterTypeLabel === '大儒', 'seek: masterTypeLabel=大儒');
  assert(r.tuition === 200, 'seek: tuition=200');
  assert(ctx._playerEconomyState.cash === cashBefore - 200, 'seek: 银钱扣 200·实际余 ' + ctx._playerEconomyState.cash);

  // 已写入账本
  var s = ns.getCandidateState();
  assert(s.masterName === '王大儒', 'seek: state.masterName=王大儒');
  assert(s.masterType === 'confucian', 'seek: state.masterType=confucian');
  assert(s.schools.length === 1, 'seek: schools 1 条');

  // 调用了 PlayerInteraction.interact
  assert(ctx._interactionCalls.length === 1, 'seek: 调用 interact 1 次');
  assert(ctx._interactionCalls[0].npc === '王大儒', 'seek: interact.npc=王大儒');
  assert(ctx._interactionCalls[0].kind === 'disciple', 'seek: interact.kind=disciple');

  // 玩家 char 属性加成（learning +8·intelligence +4）
  var playerCh = ctx.GM.chars.find(function (c) { return c.name === '李商贾'; });
  assert(playerCh.learning === 38, 'seek: learning +8 → 38·实际 ' + playerCh.learning);
  assert(playerCh.intelligence === 44, 'seek: intelligence +4 → 44·实际 ' + playerCh.intelligence);
  assert(playerCh._master === '王大儒', 'seek: _master=王大儒');

  // 已拜师·不可重复（不带 replace）
  var r2 = ns.seekMaster('张名将', { tuition: 100 });
  assert(r2.ok === false, 'seek: 重复拜师拒绝');
  assert(r2.code === 'already-has-master', 'seek: already-has-master code');

  // 用 replace 切换师父
  var r3 = ns.seekMaster('张名将', { tuition: 100, replace: true });
  assert(r3.ok === true, 'seek: replace 切换师父 ok');
  assert(r3.masterName === '张名将', 'seek: 新师父=张名将');
  assert(r3.masterType === 'military', 'seek: 新 masterType=military');
  assert(r3.prevMaster === '王大儒', 'seek: prevMaster=王大儒');

  // 拜师场景非空
  assert(typeof r.scene === 'string' && r.scene.length > 0, 'seek: scene 非空');
}

function testPassDianshiAndPromote(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerKeju;

  // 直接走殿试阶段·使用 force 跳过状态守卫
  // 先确保玩家在 gradPool 中（applyForExam 会自动注册）
  var a = ns.applyForExam({ stage: 'dianshi', force: true });
  assert(a.ok === true, 'promote: 殿试报名 ok');

  // 作答·走殿试
  var ans = ns.answerQuestion({
    type: 'policy',
    topic: '策问：今欲兴农，当以何策为先？',
    answer: '兴农之策在于轻徭薄赋·与民休息·此王道之要也。'
  });
  assert(ans.ok === true, 'promote: 殿试作答 ok');

  // 触发进士身份变更
  var r = ns.passDianshiAndPromote({ force: true, score: 92, rank: 1 });
  assert(r.ok === true, 'promote: 进士及第 ok');
  assert(r.score === 92, 'promote: score=92');
  assert(r.rank === 1, 'promote: rank=1（状元）');
  assert(r.tier === 'zhuangyuan', 'promote: tier=zhuangyuan·实际 ' + r.tier);
  assert(r.tierLabel === '状元', 'promote: tierLabel=状元');
  assert(r.prevRole === 'merchant', 'promote: prevRole=merchant');
  assert(r.newRole === 'minister', 'promote: newRole=minister');

  // P.playerInfo.playerRole 已升 minister
  assert(ctx.P.playerInfo.playerRole === 'minister', 'promote: P.playerInfo.playerRole=minister');

  // 玩家 char 身份变更
  var playerCh = ctx.GM.chars.find(function (c) { return c.name === '李商贾'; });
  assert(playerCh.officialTitle === '进士', 'promote: 玩家 officialTitle=进士·实际 ' + playerCh.officialTitle);
  assert(playerCh._jinshi === true, 'promote: _jinshi=true');
  assert(playerCh._jinshiRank === 1, 'promote: _jinshiRank=1');

  // 自动授予官职·走 _kjDispatchAllocationByDynasty（宋·状元→知制诰）
  assert(r.officialTitle === '知制诰', 'promote: 授官 知制诰·实际 ' + r.officialTitle);
  assert(r.dept === '中书省', 'promote: dept=中书省');
  assert(r.applied === 1, 'promote: applied=1（_kjApplyAllocations 写入）');
  assert(playerCh.officialTitle === '进士', 'promote: 玩家 ch.officialTitle 保留 进士');

  // 玩家考生状态
  var s = ns.getCandidateState();
  assert(s.graduated === true, 'promote: state.graduated=true');
  assert(s.status === 'promoted', 'promote: state.status=promoted');
  assert(s.rank === 1, 'promote: state.rank=1');
  assert(s.tier === 'zhuangyuan', 'promote: state.tier=zhuangyuan');
  assert(s.officialTitle === '知制诰', 'promote: state.officialTitle=知制诰');

  // 应试历史写入
  var hist = ns.listExamHistory();
  var last = hist[hist.length - 1];
  assert(last.promoted === true, 'promote: 历史[末].promoted=true');
  assert(last.officialTitle === '知制诰', 'promote: 历史[末].officialTitle=知制诰');
  assert(last.prevRole === 'merchant', 'promote: 历史[末].prevRole=merchant');

  // 殿试结果写入 exam.dianshiResults
  var exam = ctx.P.keju.currentExam;
  var dr = exam.dianshiResults.find(function (g) { return g._player; });
  assert(dr, 'promote: dianshiResults 含玩家');
  assert(dr.rank === 1, 'promote: dianshiResults[玩家].rank=1');

  // 进士及第场景非空
  assert(typeof r.scene === 'string' && r.scene.length > 0, 'promote: scene 非空');
  assert(/进士|金榜/.test(r.scene), 'promote: scene 含 进士/金榜');

  // 不同 score 推不同 rank/tier
  setupCtx(ctx);
  ns = ctx.TM.PlayerKeju;
  ns.applyForExam({ stage: 'dianshi', force: true });
  ns.answerQuestion({ type: 'policy', answer: '策答' });
  var r2 = ns.passDianshiAndPromote({ force: true, score: 75 });
  assert(r2.ok === true, 'promote: 低分进士 ok');
  assert(r2.tier === 'sanjia', 'promote: score=75 → sanjia（三甲）·实际 ' + r2.tier);
  assert(r2.rank >= 21, 'promote: score=75 → rank ≥ 21·实际 ' + r2.rank);
}

function testTriggerScandal(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerKeju;

  // 3 类弊案选择各触发一次
  var choices = ['bribe', 'solicit', 'impersonate'];
  var expectedMap = { bribe: 'bribery', solicit: 'bribery', impersonate: 'impersonation' };
  choices.forEach(function (c) {
    setupCtx(ctx);
    // 先报名 + 应试中（弊案依附科举）
    ctx.TM.PlayerKeju.applyForExam({ stage: 'xiangshi' });

    var r = ctx.TM.PlayerKeju.triggerScandal(c, { note: '作弊' });
    assert(r.ok === true, 'scandal-' + c + ': 触发 ok');
    assert(r.choice === c, 'scandal-' + c + ': choice=' + c);
    assert(r.mapsTo === expectedMap[c], 'scandal-' + c + ': mapsTo=' + expectedMap[c] + '·实际 ' + r.mapsTo);
    assert(r.spawned === true, 'scandal-' + c + ': spawned=true（flag 开）');
    assert(r.flagOn === true, 'scandal-' + c + ': flagOn=true');
    assert(typeof r.scene === 'string' && r.scene.length > 0, 'scandal-' + c + ': scene 非空');
  });

  // 弊案历史写入
  setupCtx(ctx);
  ns = ctx.TM.PlayerKeju;
  ns.applyForExam({ stage: 'xiangshi' });
  ns.triggerScandal('bribe');
  ns.triggerScandal('impersonate');
  var scandals = ns.listScandals();
  assert(scandals.length === 2, 'scandal: 历史 2 条·实际 ' + scandals.length);
  assert(scandals[0].choice === 'bribe', 'scandal: 历史[0].choice=bribe');
  assert(scandals[1].choice === 'impersonate', 'scandal: 历史[1].choice=impersonate');

  // _kjSpawnScandal 被调用
  assert(ctx._kjSpawnScandalCalls && ctx._kjSpawnScandalCalls.length === 2, 'scandal: _kjSpawnScandal 调用 2 次');
  assert(ctx._kjSpawnScandalCalls[0].type === 'bribery', 'scandal: 第一次 type=bribery');

  // flag 关闭·spawned=false·但仍写玩家历史
  setupCtx(ctx);
  ctx.P.conf.useNewKejuScandal = false;
  ctx.TM.PlayerKeju.applyForExam({ stage: 'xiangshi' });
  var r2 = ctx.TM.PlayerKeju.triggerScandal('bribe');
  assert(r2.ok === true, 'scandal: flag 关仍返 ok');
  assert(r2.spawned === false, 'scandal: flag 关 spawned=false');
  assert(r2.flagOn === false, 'scandal: flagOn=false');
  // 历史仍写入
  assert(ctx.TM.PlayerKeju.listScandals().length === 1, 'scandal: flag 关仍写历史');

  // 弊案风险应用·玩家分数微加
  setupCtx(ctx);
  ctx.TM.PlayerKeju.applyForExam({ stage: 'xiangshi' });
  var scoreBefore = ctx.TM.PlayerKeju.getCandidateState().score;
  var r3 = ctx.TM.PlayerKeju.triggerScandal('impersonate');
  assert(r3.ok === true, 'scandal: impersonate 触发 ok');
  assert(r3.risk.detectedProb > 0, 'scandal: detectedProb > 0');
  assert(r3.risk.scoreBonus === 15, 'scandal: impersonate scoreBonus=15（high reward）·实际 ' + r3.risk.scoreBonus);
  var scoreAfter = ctx.TM.PlayerKeju.getCandidateState().score;
  assert(scoreAfter === scoreBefore + 15, 'scandal: 玩家 score +15·实际 ' + scoreAfter);

  // 吏治腐败 +3（high risk）
  assert(ctx.GM.corruption === 33, 'scandal: corruption 30 → 33·实际 ' + ctx.GM.corruption);
}

function testPanel(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerKeju;

  // 空状态面板
  var html1 = ns.renderPanel();
  assert(typeof html1 === 'string' && html1.length > 0, 'panel: 空状态渲染 HTML');
  assert(/科举/.test(html1), 'panel: 含"科举"');
  assert(/考\s*生\s*身\s*份/.test(html1), 'panel: 含"考生身份"');
  assert(/报\s*名\s*入\s*口/.test(html1), 'panel: 含"报名入口"');
  assert(/商贾/.test(html1), 'panel: 含"商贾"（玩家身份）');

  // 报名后面板含 应试状态
  ns.applyForExam({ stage: 'tongshi' });
  var html2 = ns.renderPanel();
  assert(/应\s*试\s*状\s*态/.test(html2), 'panel: 含"应试状态"');
  assert(/童试/.test(html2), 'panel: 含"童试"');
  assert(/已报名/.test(html2), 'panel: 含"已报名"状态');

  // 拜师后面板含 拜师求学
  ns.seekMaster('王大儒', { tuition: 100 });
  var html3 = ns.renderPanel();
  assert(/拜\s*师\s*求\s*学/.test(html3), 'panel: 含"拜师求学"');
  assert(/王大儒/.test(html3), 'panel: 含师父名 王大儒');

  // 进士及第后面板
  ns._resetCandidate();
  ns.applyForExam({ stage: 'dianshi', force: true });
  ns.answerQuestion({ type: 'policy', answer: '策答' });
  ns.passDianshiAndPromote({ force: true, score: 92, rank: 1 });
  var html4 = ns.renderPanel();
  assert(/已通过殿试|进士及第/.test(html4), 'panel: 含"已通过殿试/进士及第"');
  assert(/知制诰/.test(html4), 'panel: 含授官"知制诰"');

  // targetEl 写入模式
  var targetEl = { innerHTML: '' };
  var r = ns.renderPanel(targetEl);
  assert(r === null, 'panel: targetEl 写入返回 null');
  assert(typeof targetEl.innerHTML === 'string' && targetEl.innerHTML.length > 0, 'panel: targetEl.innerHTML 已写入');

  // 非穿越模式面板
  setupCtx(ctx);
  ctx.P.playerInfo.transmigrationMode = false;
  var html5 = ns.renderPanel();
  assert(/非穿越模式/.test(html5), 'panel: 非穿越模式 提示');
}

function testCrossDynasty(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerKeju;

  // 切换朝代为唐·测试 _kjDispatchAllocationByDynasty 的朝代联动
  ctx.P.dynasty = '唐';
  ns.applyForExam({ stage: 'dianshi', force: true });
  ns.answerQuestion({ type: 'policy', answer: '策答' });
  var r = ns.passDianshiAndPromote({ force: true, score: 90, rank: 1 });
  assert(r.ok === true, 'cross: 唐朝殿试 ok');
  // 唐朝·状元→中书省校书郎（mock 已注·但这里 mock 永远返宋·所以断言只看朝代被传给 dispatch）
  assert(ctx._kjDispatchCalls && ctx._kjDispatchCalls.length === 1, 'cross: _kjDispatchAllocationByDynasty 被调用');
  assert(ctx._kjDispatchCalls[0].dynasty === '唐', 'cross: dynasty=唐·实际 ' + ctx._kjDispatchCalls[0].dynasty);

  // 切换朝代为元·四等人差额（mock 仍返宋·但应传 dynasty）
  setupCtx(ctx);
  ctx.P.dynasty = '元';
  ctx.TM.PlayerKeju.applyForExam({ stage: 'dianshi', force: true });
  ctx.TM.PlayerKeju.answerQuestion({ type: 'policy', answer: '策答' });
  var r2 = ctx.TM.PlayerKeju.passDianshiAndPromote({ force: true, score: 85, rank: 5 });
  assert(r2.ok === true, 'cross: 元朝殿试 ok');
  assert(ctx._kjDispatchCalls[0].dynasty === '元', 'cross: dynasty=元');

  // 剧本 hook 报名费覆盖
  setupCtx(ctx);
  ctx.P.keju.feeOverrides = { tongshi: 100, xiangshi: 500 };
  var cashBefore = ctx._playerEconomyState.cash;
  var r3 = ctx.TM.PlayerKeju.applyForExam({ stage: 'tongshi' });
  assert(r3.ok === true, 'cross: hook 报名 ok');
  assert(r3.fee === 100, 'cross: hook 报名费 100·实际 ' + r3.fee);
  assert(ctx._playerEconomyState.cash === cashBefore - 100, 'cross: 银钱扣 100');
}

function testLLMDegrade(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerKeju;

  // 1) 无 LLM·降级 mock scene + 规则引擎评分
  ctx.callAI = undefined;
  ctx.callLLM = undefined;
  var a = ns.applyForExam({ stage: 'tongshi' });
  assert(a.ok === true, 'llm: 报名 ok');
  assert(typeof a.scene === 'string' && a.scene.length > 0, 'llm: scene 降级 mock 非空');
  assert(/李商贾|商贾/.test(a.scene), 'llm: scene 含玩家/商贾');

  var ans = ns.answerQuestion({
    type: 'classics',
    topic: '请述"学而时习之"之要义',
    answer: '学而时习之者·学贵持之以恒·不怠不辍。'
  });
  assert(ans.ok === true, 'llm: 作答 ok');
  assert(typeof ans.score === 'number', 'llm: 降级评分是数字');
  assert(typeof ans.comment === 'string' && ans.comment.length > 0, 'llm: 降级评语非空');

  // 2) 挂上 global.callAI·走 LLM 路径
  ctx.callAI = function (prompt) {
    if (/评卷/.test(prompt)) {
      return 'SCORE: 75\nCOMMENT: 中规中矩·堪堪入选';
    }
    return '【LLM 生成】' + prompt.split('\n').slice(1, 3).join('·');
  };
  ns._resetCandidate();
  var a2 = ns.applyForExam({ stage: 'tongshi' });
  assert(/^【LLM 生成】/.test(a2.scene), 'llm: 报名 scene 走 LLM 路径');

  var ans2 = ns.answerQuestion({
    type: 'policy',
    topic: '策问',
    answer: '策答'
  });
  assert(ans2.ok === true, 'llm: 作答 ok');
  assert(ans2.score === 75, 'llm: LLM score=75·实际 ' + ans2.score);
  assert(/中规中矩/.test(ans2.comment), 'llm: LLM comment 解析');

  // 3) LLM 返回空字符串·降级
  ctx.callAI = function () { return ''; };
  ns._resetCandidate();
  ns.applyForExam({ stage: 'tongshi' });
  var ans3 = ns.answerQuestion({ type: 'classics', answer: '答' });
  assert(ans3.ok === true, 'llm: LLM 空时降级 ok');
  // 降级后 score 应来自规则引擎
  assert(typeof ans3.score === 'number' && ans3.score >= 0, 'llm: 降级 score 合法');

  // 4) 拜师场景 LLM 降级
  ctx.callAI = undefined;
  ns._resetCandidate();
  var sm = ns.seekMaster('王大儒', { tuition: 100 });
  assert(sm.ok === true, 'llm: 拜师 ok');
  assert(typeof sm.scene === 'string' && sm.scene.length > 0, 'llm: 拜师 scene 降级非空');
  assert(/李商贾|拜/.test(sm.scene), 'llm: 拜师 scene 含玩家/拜');

  // 5) 进士及第场景 LLM 降级
  ctx.callAI = undefined;
  ns._resetCandidate();
  ns.applyForExam({ stage: 'dianshi', force: true });
  ns.answerQuestion({ type: 'policy', answer: '策答' });
  var pp = ns.passDianshiAndPromote({ force: true, score: 92, rank: 1 });
  assert(pp.ok === true, 'llm: 进士及第 ok');
  assert(typeof pp.scene === 'string' && pp.scene.length > 0, 'llm: 进士及第 scene 降级非空');
  assert(/进士|金榜/.test(pp.scene), 'llm: 进士 scene 含 进士/金榜');

  // 6) 弊案场景 LLM 降级
  ctx.callAI = undefined;
  ns._resetCandidate();
  ns.applyForExam({ stage: 'xiangshi' });
  var sc = ns.triggerScandal('bribe');
  assert(sc.ok === true, 'llm: 弊案 ok');
  assert(typeof sc.scene === 'string' && sc.scene.length > 0, 'llm: 弊案 scene 降级非空');
}

function testDualMount(ctx) {
  // 双路径挂载·module.exports 也应能取到 PlayerKeju
  var mod = require(path.join(ROOT, 'tm-player-keju.js'));
  assert(mod && typeof mod.PlayerKeju === 'object', 'dual-mount: module.exports.PlayerKeju 是对象');
  assert(typeof mod.PlayerKeju.applyForExam === 'function', 'dual-mount: module.exports.PlayerKeju.applyForExam 是函数');
  assert(typeof mod.PlayerKeju.answerQuestion === 'function', 'dual-mount: module.exports.PlayerKeju.answerQuestion 是函数');
  assert(typeof mod.PlayerKeju.seekMaster === 'function', 'dual-mount: module.exports.PlayerKeju.seekMaster 是函数');
  assert(typeof mod.PlayerKeju.passDianshiAndPromote === 'function', 'dual-mount: module.exports.PlayerKeju.passDianshiAndPromote 是函数');
  assert(typeof mod.PlayerKeju.triggerScandal === 'function', 'dual-mount: module.exports.PlayerKeju.triggerScandal 是函数');
  assert(mod.PlayerKeju.STAGE, 'dual-mount: module.exports.PlayerKeju.STAGE 存在');
  assert(Object.keys(mod.PlayerKeju.IDENTITY_OPEN_CLASSES).length === 5, 'dual-mount: IDENTITY_OPEN_CLASSES 共 5 类');
  assert(Object.keys(mod.PlayerKeju.SCANDAL_CHOICES).length === 3, 'dual-mount: SCANDAL_CHOICES 共 3 选择');
}

// ── 入口 ────────────────────────────────────────────────────
try {
  var ctx = buildContext();
  testNamespace(ctx);
  testGuards(ctx);
  testApplyForExam(ctx);
  testAnswerQuestion(ctx);
  testSeekMaster(ctx);
  testPassDianshiAndPromote(ctx);
  testTriggerScandal(ctx);
  testPanel(ctx);
  testCrossDynasty(ctx);
  testLLMDegrade(ctx);
  testDualMount(ctx);
  console.log('[smoke-player-keju] PASS · 11 sub-tests · namespace/guards/apply/answer/seek-master/promote/scandal/panel/cross-dynasty/llm/dual-mount');
  process.exit(0);
} catch (e) {
  console.error('[smoke-player-keju] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
