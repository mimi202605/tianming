#!/usr/bin/env node
// scripts/smoke-player-economy.js — Phase 4.5·Task 16 玩家赚钱与私产系统 smoke
//
// 验证 TM.PlayerEconomy 10 个 SubTask API：
//   - init/getState/getBalance 银钱账本（SubTask 16.1）
//   - collectSalary 月初自动领官俸（SubTask 16.2 · 复用 CharEconEngine.Income.salary/salaryGrain）
//   - embezzle/acceptBribe 贪墨/受贿触发腐败引擎（SubTask 16.3 · GM.corruption.lumpSumIncidents 增长）
//   - buyProperty/collectPropertyRevenue 购置产业 + 经营性收入（SubTask 16.4 · 酒楼/当铺/作坊）
//   - lendMoney 放贷收息超阈值触发民怨（SubTask 16.5 · GM.minxin.trueIndex 下降）
//   - hoardGoods 囤货居奇触发海贸衙门调查（SubTask 16.6 · GM._charInvestigations 增长）
//   - confiscate 被抄家私产充公（SubTask 16.7 · cash 留 100, properties/investments 清空, confiscated=true, GM.guoku.balance 增长）
//   - handleFactionExtortion 派系勒索（SubTask 16.8 · 接受/拒绝分支）
//   - tick 月初 tick（SubTask 16.9 · 领俸+经营+到期结算）
//   - renderPanel 御案私产面板（SubTask 16.10 · 朝代中立 HTML）
//   - 守卫：非穿越模式拒绝
//
// 沿用 smoke-transmigration-regent.js 模式：vm.createContext + mock 全局 + 多测试函数 + try/catch + process.exit(0/1)

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); passed++; }

function buildContext() {
  var ctx = {
    console: console,
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, Set: Set,
    setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  ctx.TM = {};
  vm.createContext(ctx);
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'tm-player-economy.js'), 'utf8'),
    ctx,
    { filename: 'tm-player-economy.js' }
  );
  return ctx;
}

function setupCtx(ctx, opts) {
  opts = opts || {};
  ctx.GM = {
    turn: 12,
    chars: [
      { id: 'player', name: '李大臣', isPlayer: true,
        officialTitle: '户部尚书', rankLevel: 3, socialClass: 'civilOfficial',
        resources: { privateWealth: { money: 0, land: 0, treasure: 0, commerce: 0 },
                     hiddenWealth: 0, fame: 50 } }
    ],
    corruption: { lumpSumIncidents: [] },
    minxin: { trueIndex: 60 },
    guoku: { balance: 0 },
    neitang: { balance: 0 },
    _charInvestigations: []
  };
  ctx.P = {
    playerInfo: {
      transmigrationMode: opts.transmigrationMode !== false,
      playerRole: opts.playerRole || 'minister',
      characterName: '李大臣',
      sovereignName: '测试君主'
    }
  };
  ctx.toast = function () {};
  ctx.uid = function () { return 'smoke-uid-' + Math.random().toString(36).slice(2, 8); };

  ctx._minxinCalls = [];
  ctx.adjustMinxin = function (source, delta, reason, o2) {
    ctx._minxinCalls.push({ source: source, delta: delta, reason: reason, opts: o2 });
    if (ctx.GM && ctx.GM.minxin && typeof ctx.GM.minxin.trueIndex === 'number') {
      var v = ctx.GM.minxin.trueIndex + delta;
      if (v < 0) v = 0;
      if (v > 100) v = 100;
      ctx.GM.minxin.trueIndex = v;
    }
  };

  // CharEconEngine mock：14 类角色俸禄简化为 rank*15（与 tm-char-economy-engine.js 公式同源）
  ctx.CharEconEngine = {
    Income: {
      salary: function (ch) { return ((ch && ch.rankLevel) ? ch.rankLevel : 5) * 15; },
      salaryGrain: function (ch) { return ((ch && ch.rankLevel) ? ch.rankLevel : 5) * 2; }
    },
    confiscate: function (ch, o) {
      if (!ch) return { success: false };
      if (!ch.resources) ch.resources = { privateWealth: {} };
      if (!ch.resources.privateWealth) ch.resources.privateWealth = {};
      ch.resources.privateWealth.money = 0;
      ch.confiscated = true;
      ch.retired = true;
      ch.status = 'disgraced';
      return { success: true, total: 1000, hidden: 0 };
    }
  };
}

// ── SubTask 16.1：银钱账本 ──
function ledgerTest(ctx) {
  setupCtx(ctx);
  var PE = ctx.TM.PlayerEconomy;
  assert(typeof PE === 'object', 'PlayerEconomy 命名空间存在');
  assert(typeof PE.init === 'function', 'PE.init 是函数');
  assert(typeof PE.getBalance === 'function', 'PE.getBalance 是函数');

  assert(PE.init() === true, 'init 返回 true');
  assert(PE.getBalance() === 0, '初始 cash=0');

  var st = PE.getState();
  assert(st && st.cash === 0, 'getState.cash=0');
  assert(Array.isArray(st.properties), 'getState.properties 数组');
  assert(Array.isArray(st.investments), 'getState.investments 数组');
  assert(Array.isArray(st.grayIncome), 'getState.grayIncome 数组');
  assert(st.corruption === 0, 'getState.corruption=0');
  assert(st.confiscated === false, 'getState.confiscated=false');

  // addIncome / spend
  var r1 = PE.addIncome('test', 1000);
  assert(r1.ok === true && r1.cash === 1000, 'addIncome 1000 → cash=1000');
  var r2 = PE.spend(300, 'test-spend');
  assert(r2.ok === true && r2.cash === 700, 'spend 300 → cash=700');
  var r3 = PE.spend(99999);
  assert(r3.ok === false, 'spend 超额被拒');
  var r4 = PE.addIncome('test', -50);
  assert(r4.ok === false, 'addIncome 负数被拒');
}

// ── SubTask 16.2：月初自动领官俸 ──
function salaryTest(ctx) {
  setupCtx(ctx);
  var PE = ctx.TM.PlayerEconomy;
  PE.init();
  var bal0 = PE.getBalance();
  var r = PE.collectSalary();
  assert(r.ok === true, 'collectSalary.ok');
  // mock CharEconEngine.Income.salary = rankLevel(3) * 15 = 45
  assert(r.silver === 45, 'collectSalary.silver=45 (rank 3 * 15), got ' + r.silver);
  assert(r.grain === 6, 'collectSalary.grain=6 (rank 3 * 2), got ' + r.grain);
  assert(PE.getBalance() === bal0 + 45, '领俸后 cash += 45');

  var st = PE.getState();
  var hasSalaryLedger = st.ledger.some(function (e) { return e.kind === 'income:salary'; });
  assert(hasSalaryLedger, '账本含 income:salary 条目');
}

// ── SubTask 16.3：贪墨 / 受贿 触发腐败引擎 ──
function embezzleBribeTest(ctx) {
  setupCtx(ctx);
  var PE = ctx.TM.PlayerEconomy;
  PE.init();
  var bal0 = PE.getBalance();
  var inc0 = ctx.GM.corruption.lumpSumIncidents.length;

  var r1 = PE.embezzle(5000, { reason: '克扣河工银' });
  assert(r1.ok === true, 'embezzle.ok');
  assert(r1.cash === bal0 + 5000, 'embezzle 后 cash += 5000');
  assert(r1.corruption === 1.0, 'embezzle 后 corruption=1.0 (5000*0.0002), got ' + r1.corruption);
  assert(ctx.GM.corruption.lumpSumIncidents.length === inc0 + 1, 'lumpSumIncidents += 1');
  var inc1 = ctx.GM.corruption.lumpSumIncidents[ctx.GM.corruption.lumpSumIncidents.length - 1];
  assert(inc1.type === 'player_embezzle', 'incident.type=player_embezzle');
  assert(inc1.amount === 5000, 'incident.amount=5000');
  assert(inc1.source === 'player-economy', 'incident.source=player-economy');
  assert(inc1.status === 'active', 'incident.status=active');

  // 受贿
  var r2 = PE.acceptBribe(3000, { reason: '某商孝敬' });
  assert(r2.ok === true, 'acceptBribe.ok');
  assert(r2.cash === bal0 + 5000 + 3000, '受贿后 cash += 3000');
  assert(r2.corruption === 1.6, '受贿后 corruption=1.6 (8000*0.0002), got ' + r2.corruption);
  assert(ctx.GM.corruption.lumpSumIncidents.length === inc0 + 2, 'lumpSumIncidents += 2');
  var inc2 = ctx.GM.corruption.lumpSumIncidents[ctx.GM.corruption.lumpSumIncidents.length - 1];
  assert(inc2.type === 'player_bribe', 'incident.type=player_bribe');

  var st = PE.getState();
  assert(st.grayIncome.length === 2, 'grayIncome 含 2 条（贪墨+受贿）');
}

// ── SubTask 16.4：购置产业 + 经营性收入 ──
function propertyTest(ctx) {
  setupCtx(ctx);
  var PE = ctx.TM.PlayerEconomy;
  PE.init();
  PE.addIncome('test', 10000);
  var bal0 = PE.getBalance();

  var r1 = PE.buyProperty('tavern');
  assert(r1.ok === true, 'buyProperty(tavern).ok');
  assert(r1.property.type === 'tavern', 'property.type=tavern');
  assert(r1.property.label === '酒楼', 'property.label=酒楼');
  assert(r1.cash === bal0 - 2000, '购酒楼后 cash -= 2000, got ' + r1.cash);
  var st = PE.getState();
  assert(st.properties.length === 1, 'properties.length=1');

  // 未知类型
  var rBad = PE.buyProperty('bogus');
  assert(rBad.ok === false, 'buyProperty 未知类型被拒');

  // 当铺
  var r2 = PE.buyProperty('pawnshop');
  assert(r2.ok === true, 'buyProperty(pawnshop).ok');
  assert(r2.cash === bal0 - 2000 - 3000, '购当铺后 cash -= 3000');

  // 作坊
  var r3 = PE.buyProperty('workshop');
  assert(r3.ok === true, 'buyProperty(workshop).ok');
  assert(r3.cash === bal0 - 2000 - 3000 - 2500, '购作坊后 cash -= 2500');

  // 经营性收入：3 个产业，每个 baseRevenue > 0，fluct 0.7~1.3，总 revenue > 0
  var balPre = PE.getBalance();
  var r4 = PE.collectPropertyRevenue();
  assert(r4.ok === true, 'collectPropertyRevenue.ok');
  assert(r4.revenue > 0, 'collectPropertyRevenue.revenue > 0, got ' + r4.revenue);
  assert(r4.cash === balPre + r4.revenue, '经营性收入入账 cash += revenue');
}

// ── SubTask 16.5：放贷收息超阈值触发民怨 ──
function lendMoneyTest(ctx) {
  setupCtx(ctx);
  var PE = ctx.TM.PlayerEconomy;
  PE.init();
  PE.addIncome('test', 20000);

  // 阈值下不触民怨
  var mx0 = ctx.GM.minxin.trueIndex;
  var r1 = PE.lendMoney(3000, 0.1);
  assert(r1.ok === true, 'lendMoney(3000).ok');
  assert(r1.totalLend === 3000, 'totalLend=3000');
  assert(ctx.GM.minxin.trueIndex === mx0, '阈值下民怨不变');
  assert(ctx._minxinCalls.length === 0, '阈值下未调 adjustMinxin');

  // 超阈值 6000 → 累计 9000，超 4000 → 民怨 -4
  var r2 = PE.lendMoney(6000, 0.1);
  assert(r2.ok === true, 'lendMoney(6000).ok');
  assert(r2.totalLend === 9000, 'totalLend=9000');
  assert(ctx._minxinCalls.length === 1, '超阈值调 adjustMinxin 一次');
  var call = ctx._minxinCalls[0];
  assert(call.delta < 0, 'adjustMinxin.delta < 0');
  assert(/放贷盘剥/.test(call.reason), 'adjustMinxin.reason 含"放贷盘剥"');
  // overflow = 9000 - 5000 = 4000, minxinDelta = -ceil(4000/1000) = -4
  assert(call.delta === -4, 'adjustMinxin.delta = -4 (overflow 4000 / 1000), got ' + call.delta);
  assert(ctx.GM.minxin.trueIndex === mx0 - 4, 'minxin.trueIndex -= 4, got ' + ctx.GM.minxin.trueIndex);

  // 投资列表
  var st = PE.getState();
  var lends = st.investments.filter(function (v) { return v.kind === 'lend'; });
  assert(lends.length === 2, 'investments 含 2 笔放贷');
}

// ── SubTask 16.6：囤货居奇触发海贸衙门调查 ──
function hoardGoodsTest(ctx) {
  setupCtx(ctx);
  var PE = ctx.TM.PlayerEconomy;
  PE.init();
  PE.addIncome('test', 20000);

  // 用确定性 Math.random = 0（< risk，必触发调查）
  var origRandom = ctx.Math.random;
  ctx.Math.random = function () { return 0; };
  try {
    var inv0 = ctx.GM._charInvestigations.length;
    var r = PE.hoardGoods('丝绸', 5000);
    assert(r.ok === true, 'hoardGoods.ok');
    assert(r.investigate === true, 'hoardGoods.investigate=true (mock random=0)');
    assert(r.risk > 0, 'hoardGoods.risk > 0');
    assert(ctx.GM._charInvestigations.length === inv0 + 1, '_charInvestigations += 1');
    var inv = ctx.GM._charInvestigations[ctx.GM._charInvestigations.length - 1];
    assert(inv.target === '李大臣', 'investigation.target=李大臣');
    assert(inv.status === 'pending', 'investigation.status=pending');
    assert(/海贸衙门/.test(inv.reason), 'investigation.reason 含"海贸衙门"');
    assert(inv.returnTurn === 15, 'investigation.returnTurn = turn+3 = 15, got ' + inv.returnTurn);
  } finally {
    ctx.Math.random = origRandom;
  }

  // 用 Math.random = 0.99 不触发调查
  ctx.Math.random = function () { return 0.99; };
  try {
    var inv0b = ctx.GM._charInvestigations.length;
    var r2 = PE.hoardGoods('茶叶', 1000);
    assert(r2.ok === true, 'hoardGoods(茶叶).ok');
    assert(r2.investigate === false, 'hoardGoods.investigate=false (mock random=0.99)');
    assert(ctx.GM._charInvestigations.length === inv0b, '_charInvestigations 不变');
  } finally {
    ctx.Math.random = origRandom;
  }
}

// ── SubTask 16.7：被抄家私产充公 ──
function confiscateTest(ctx) {
  setupCtx(ctx);
  var PE = ctx.TM.PlayerEconomy;
  PE.init();
  PE.addIncome('test', 10000);
  PE.buyProperty('tavern');
  PE.buyProperty('pawnshop');
  PE.lendMoney(2000, 0.1);
  PE.embezzle(5000);

  var st0 = PE.getState();
  var totalWealth = st0.cash + 2000 + 3000 + 2000; // cash + 产业 cost + 放贷本金
  var g0 = ctx.GM.guoku.balance;
  var bal0 = PE.getBalance();

  var r = PE.confiscate({ reason: '罢黜抄家', destination: 'guoku' });
  assert(r.ok === true, 'confiscate.ok');
  assert(r.confiscated === true, 'confiscate.confiscated=true');
  assert(r.total > 0, 'confiscate.total > 0');
  assert(PE.getBalance() === 100, '抄家后 cash=100 (基本生活费), got ' + PE.getBalance());

  var st = PE.getState();
  assert(st.confiscated === true, 'state.confiscated=true');
  assert(st.properties.length === 0, '抄家后 properties 清空');
  assert(st.investments.length === 0, '抄家后 investments 清空');
  assert(st.grayIncome.length === 0, '抄家后 grayIncome 清空');

  // 入帑廪
  assert(ctx.GM.guoku.balance === g0 + r.total, 'GM.guoku.balance += total, got ' + ctx.GM.guoku.balance);

  // 玩家角色被 CharEconEngine.confiscate 处理（mock 标 confiscated/retired）
  var ch = ctx.GM.chars[0];
  assert(ch.confiscated === true, '玩家角色 confiscated=true');
  assert(ch.retired === true, '玩家角色 retired=true');

  // 重复抄家拒绝
  var r2 = PE.confiscate();
  assert(r2.ok === false, '已抄没者拒绝重复抄');
}

// ── SubTask 16.7·destination=neitang 分支 ──
function confiscateNeitangTest(ctx) {
  setupCtx(ctx);
  var PE = ctx.TM.PlayerEconomy;
  PE.init();
  PE.addIncome('test', 5000);
  var g0 = ctx.GM.neitang.balance;
  var r = PE.confiscate({ destination: 'neitang' });
  assert(r.ok === true, 'confiscate(neitang).ok');
  assert(ctx.GM.neitang.balance === g0 + r.total, 'neitang.balance += total');
}

// ── SubTask 16.8：派系勒索 ──
function factionExtortionTest(ctx) {
  setupCtx(ctx);
  var PE = ctx.TM.PlayerEconomy;
  PE.init();
  PE.addIncome('test', 5000);

  // 接受（默认）
  var bal0 = PE.getBalance();
  var r1 = PE.handleFactionExtortion('阉党', 1000);
  assert(r1.ok === true, 'extortion(accept).ok');
  assert(r1.accept === true, 'extortion.accept=true');
  assert(r1.cash === bal0 - 1000, '接受勒索 cash -= 1000');
  assert(r1.relation > 0, '接受后 relation > 0');

  // 拒绝
  var bal1 = PE.getBalance();
  var r2 = PE.handleFactionExtortion('浙党', 1000, { accept: false });
  assert(r2.ok === true, 'extortion(refuse).ok');
  assert(r2.accept === false, 'extortion.accept=false');
  assert(r2.cash === bal1, '拒绝勒索 cash 不变');
  assert(r2.relation < 0, '拒绝后 relation < 0');

  // 银钱不足默认拒绝
  PE.addIncome('test', 0); // noop
  var r3 = PE.handleFactionExtortion('齐党', 99999);
  assert(r3.ok === true, 'extortion(银钱不足).ok');
  assert(r3.accept === false, '银钱不足默认拒绝');
}

// ── SubTask 16.9：tick 月初 tick ──
function tickTest(ctx) {
  setupCtx(ctx);
  var PE = ctx.TM.PlayerEconomy;
  PE.init();
  PE.addIncome('test', 5000);
  PE.buyProperty('tavern');

  var bal0 = PE.getBalance();
  var r = PE.tick();
  assert(r.ok === true, 'tick.ok');
  assert(r.salary && r.salary.ok === true, 'tick.salary.ok');
  assert(r.property && r.property.ok === true, 'tick.property.ok');
  assert(Array.isArray(r.matured), 'tick.matured 数组');
  // tick 后 cash = bal0 + salary(45) + property revenue(>0)
  assert(r.cash > bal0, 'tick 后 cash 增加');
}

// ── SubTask 16.10：御案私产面板 ──
function renderPanelTest(ctx) {
  setupCtx(ctx);
  var PE = ctx.TM.PlayerEconomy;
  PE.init();
  PE.addIncome('test', 5000);
  PE.buyProperty('tavern');
  PE.lendMoney(1000, 0.1);
  PE.embezzle(2000);

  var html = PE.renderPanel();
  assert(typeof html === 'string', 'renderPanel 返回字符串');
  assert(/pe-panel/.test(html), 'HTML 含 pe-panel 容器');
  assert(/银/.test(html) && /钱/.test(html), 'HTML 含"银钱"字样');
  assert(/酒楼/.test(html), 'HTML 含产业"酒楼"');
  assert(/放贷/.test(html), 'HTML 含"放贷"投资');

  // 抄家后面板有警示
  PE.confiscate();
  var html2 = PE.renderPanel();
  assert(/抄/.test(html2), '抄家后面板含"抄"字样');
}

// ── 守卫：非穿越模式拒绝 ──
function guardTest(ctx) {
  setupCtx(ctx, { transmigrationMode: false });
  var PE = ctx.TM.PlayerEconomy;
  PE.init();
  assert(PE.collectSalary().ok === false, '非穿越模式 collectSalary 拒绝');
  assert(PE.embezzle(100).ok === false, '非穿越模式 embezzle 拒绝');
  assert(PE.acceptBribe(100).ok === false, '非穿越模式 acceptBribe 拒绝');
  assert(PE.buyProperty('tavern').ok === false, '非穿越模式 buyProperty 拒绝');
  assert(PE.lendMoney(100, 0.1).ok === false, '非穿越模式 lendMoney 拒绝');
  assert(PE.hoardGoods('丝绸', 100).ok === false, '非穿越模式 hoardGoods 拒绝');
  assert(PE.confiscate().ok === false, '非穿越模式 confiscate 拒绝');
  assert(PE.handleFactionExtortion('阉党', 100).ok === false, '非穿越模式 handleFactionExtortion 拒绝');
  assert(PE.tick().ok === false, '非穿越模式 tick 拒绝');
}

// ── 跨朝代铁律：renderPanel 不出现明清专名 ──
function crossDynastyTest(ctx) {
  setupCtx(ctx);
  var PE = ctx.TM.PlayerEconomy;
  PE.init();
  PE.addIncome('test', 5000);
  PE.buyProperty('tavern');
  PE.lendMoney(1000, 0.1);
  PE.hoardGoods('丝绸', 1000);

  var html = PE.renderPanel();
  // 明清专名清单（与 tm-player-economy.js 顶部铁律声明对齐）
  var forbidden = ['市舶司', '内阁', '票拟', '司礼监', '东厂', '八股', '锦衣卫', '军机处'];
  forbidden.forEach(function (term) {
    assert(html.indexOf(term) === -1, 'renderPanel 不含明清专名: ' + term);
  });
}

// ── 双路径挂载 ──
function dualMountTest(ctx) {
  // vm 上下文里 module.exports 已生效（tm-player-economy.js 末尾 if module.exports）
  // 重新 require 一次：node 环境下 module.exports 路径
  var exported = require(path.join(ROOT, 'tm-player-economy.js'));
  assert(typeof exported === 'object', 'module.exports 是对象');
  assert(typeof exported.init === 'function', 'exports.init 函数');
  assert(typeof exported.collectSalary === 'function', 'exports.collectSalary 函数');
  assert(typeof exported.confiscate === 'function', 'exports.confiscate 函数');
  assert(typeof exported.PROPERTY_TYPES === 'object', 'exports.PROPERTY_TYPES 对象');
}

try {
  var ctx = buildContext();
  ledgerTest(ctx);
  salaryTest(ctx);
  embezzleBribeTest(ctx);
  propertyTest(ctx);
  lendMoneyTest(ctx);
  hoardGoodsTest(ctx);
  confiscateTest(ctx);
  confiscateNeitangTest(ctx);
  factionExtortionTest(ctx);
  tickTest(ctx);
  renderPanelTest(ctx);
  guardTest(ctx);
  crossDynastyTest(ctx);
  dualMountTest(ctx);
  console.log('[smoke-player-economy] PASS · 14 sub-tests · ' + passed + ' assertions · 10 SubTask + 守卫 + 跨朝代铁律 + 双路径挂载');
  process.exit(0);
} catch (e) {
  console.error('[smoke-player-economy] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
