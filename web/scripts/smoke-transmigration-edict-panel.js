#!/usr/bin/env node
// scripts/smoke-transmigration-edict-panel.js — Phase 4·Task 11 诏令面板按 playerRole 分支 smoke
// 验证：
//   A) tm-game-ui-shell.js 源码层面：_edictCatsForRole / _roleActionButtons 分支存在且按 playerRole 走不同路径
//   B) tm-endturn-prep.js 运行时层面：_endTurn_collectInput 在穿越模式下落账 source='player-memorial' + 3 类奏疏
//                                                       皇帝模式下落账 source='sovereign-player' + 5 类诏令

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

// ── A. 源码分支存在性验证 ──
function sourceBranchTest() {
  var src = fs.readFileSync(path.join(ROOT, 'tm-game-ui-shell.js'), 'utf8');

  // A.1 playerRole 检测变量存在
  assert(src.indexOf("var _pi = (typeof P !== 'undefined' && P && P.playerInfo)") !== -1,
         'src: 玩家信息读取 _pi');
  assert(src.indexOf("_pi.transmigrationMode === true && _pi.playerRole && _pi.playerRole !== 'emperor'") !== -1,
         'src: 穿越模式判定 _isTrans');

  // A.2 _edictCatsForRole 函数存在·且按 role 分支
  var fnStart = src.indexOf('function _edictCatsForRole(role)');
  assert(fnStart !== -1, 'src: _edictCatsForRole 函数存在');
  var fnSlice = src.slice(fnStart, fnStart + 2000);
  assert(/role\s*===\s*['"]emperor['"]/.test(fnSlice), 'src: emperor 分支存在');
  assert(fnSlice.indexOf('奏') !== -1, 'src: 穿越模式返回奏疏类（含"奏"字）');

  // A.3 emperor 模式 5 类：政/军/外/经/他
  assert(fnSlice.indexOf('政') !== -1, 'src: emperor 含政令类');
  assert(fnSlice.indexOf('外') !== -1, 'src: emperor 含外交类');
  assert(fnSlice.indexOf('经') !== -1, 'src: emperor 含经济类');

  // A.4 _roleActionButtons 函数存在·按 role 分支
  var fn2Start = src.indexOf('function _roleActionButtons(role)');
  assert(fn2Start !== -1, 'src: _roleActionButtons 函数存在');
  var fn2Slice = src.slice(fn2Start, fn2Start + 1500);
  assert(/case\s*'minister'/.test(fn2Slice), 'src: minister 分支（廷推/荐举）');
  assert(/case\s*'general'/.test(fn2Slice), 'src: general 分支（请旨出征）');
  assert(/case\s*'prince'/.test(fn2Slice), 'src: prince 分支（朝贡/上表）');
  assert(/case\s*'regent'/.test(fn2Slice), 'src: regent 分支（代诏）');
  assert(/case\s*'custom'/.test(fn2Slice), 'src: custom 分支（枕边风）');

  // A.5 御笔标题分支：穿越模式"臣 X 谨 奏"·皇帝模式"天子御笔"
  assert(/\bif\s*\(\s*_isTrans\s*\)/.test(src), 'src: if (_isTrans) 分支存在');
  assert(src.indexOf('臣 ') !== -1 && src.indexOf('谨 奏') !== -1,
         'src: 穿越模式御笔标题"臣 X 谨 奏"');
  assert(src.indexOf('御') !== -1, 'src: 皇帝模式御笔标题');

  // A.6 结束按钮文案分支
  assert(src.indexOf("_endBtnLabel = _isTrans") !== -1, 'src: 结束按钮分支');
  assert(src.indexOf('上 奏 呈 进') !== -1 || src.indexOf('上奏呈进') !== -1,
         'src: 穿越模式按钮"上奏呈进"');

  // A.7 帝王私行包裹 if (!_isTrans)
  assert(src.indexOf("if (!_isTrans)") !== -1, 'src: 帝王私行 if(!_isTrans) 包裹');

  // A.8 档案标题分支（_isTrans ? '奏疏档案' : '诏令档案'）
  assert(src.indexOf('_isTrans ? ') !== -1,
         'src: 档案标题使用 _isTrans 三元分支');
  assert(src.indexOf('\\u594F \\u774F \\u6863 \\u6848') !== -1 || src.indexOf('奏 疏 档 案') !== -1,
         'src: 穿越模式档案标题（奏疏档案 escape 序列）');
  assert(src.indexOf('\\u8BCF \\u4EE4 \\u6863 \\u6848') !== -1 || src.indexOf('诏 令 档 案') !== -1,
         'src: 皇帝模式档案标题（诏令档案 escape 序列）');
}

// ── B. _endTurn_collectInput 运行时验证 ──
function buildContext() {
  var ctx = {
    console: { log: function(){}, warn: function(){} },
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, Set: Set,
    Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-endturn-prep.js'), 'utf8'), ctx, { filename: 'tm-endturn-prep.js' });
  return ctx;
}

function setupCtx(ctx, playerRole, isTrans, characterName) {
  var domValues = {
    'edict-pol': '奏请整饬吏治',
    'edict-mil': '',
    'edict-dip': '',
    'edict-eco': '',
    'edict-oth': '',
    'xinglu-pub': '',
    'xinglu': ''
  };
  ctx._$ = function(id) {
    if (domValues[id] != null) return { value: domValues[id] };
    return null;
  };
  ctx.recordPlayerDecision = function() {};
  ctx.uid = function() { return 'smoke-uid-' + Math.random().toString(36).slice(2,8); };
  ctx.GM = {
    turn: 9,
    memorials: [],
    edicts: [],
    chars: [],
    facs: [],
    _edictTracker: [],
    _candidateEvents: [],
    vars: {},
    letters: [],
    _capital: '京城'
  };
  ctx.P = {
    playerInfo: {
      transmigrationMode: !!isTrans,
      playerRole: playerRole || 'emperor',
      characterName: characterName || (isTrans ? '李大臣' : '皇帝'),
      sovereignName: '测试君主'
    }
  };
  ctx.findCharByName = function() { return null; };
  ctx.addEB = function() {};
  ctx.turnsForMonths = function(n) { return n; };
  ctx._isSameLocation = function(a, b) { return a === b; };
  ctx.calcLetterDays = function() { return 5; };
  ctx._getDaysPerTurn = function() { return 15; };
  ctx.getCurrentGameDay = function() { return 0; };
  ctx.getTSText = function(turn) { return 'T' + turn; };
  ctx.TM = { Qiju: { recordEntry: function() {} } };
  ctx.resetTurnChanges = function() {};
  ctx.generateChancellorSuggestions = function() { return []; };
  ctx.extractEdictActions = function() { return { appointments: [], dismissals: [], deaths: [] }; };
  ctx.extractCustomPolicies = function() { return []; };
  ctx.applyCustomPolicies = function() {};
  ctx._reactToEdicts = function() {};
  ctx.extractEdictMovements = function() { return []; };
  ctx.extractEdictFiscalReforms = function() { return []; };
  ctx.extractEdictFiscalActions = function() { return []; };
  ctx.extractEdictDiplomacy = function() { return []; };
  ctx.applyEdictDiplomacy = function() {};
  ctx._dbg = function() {};
  ctx.clamp = function(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
  ctx.random = function() { return 0.5; };
}

function transModeTest(ctx) {
  setupCtx(ctx, 'minister', true, '李大臣');
  var r = ctx._endTurn_collectInput();
  assert(r && typeof r === 'object', 'trans: _endTurn_collectInput 返回 input 对象');

  var rec = ctx.GM._edictTracker.find(function(e) { return e.turn === 9; });
  assert(rec, 'trans: _edictTracker 有本回合记录');
  assert(rec.source === 'player-memorial', 'trans: source = player-memorial');
  assert(rec.category === '奏疏', 'trans: category = 奏疏');
  assert(rec.status === 'pending', 'trans: status = pending');
  assert(rec.content === '奏请整饬吏治', 'trans: content 保留');
}

function emperorModeTest(ctx) {
  setupCtx(ctx, 'emperor', false, '皇帝');
  var r = ctx._endTurn_collectInput();
  assert(r && typeof r === 'object', 'emperor: _endTurn_collectInput 返回 input 对象');

  var rec = ctx.GM._edictTracker.find(function(e) { return e.turn === 9; });
  assert(rec, 'emperor: _edictTracker 有本回合记录');
  assert(rec.source === 'sovereign-player', 'emperor: source = sovereign-player');
  assert(rec.category === '政令', 'emperor: category = 政令（皇帝模式 5 类首类）');
}

function categoryCountTest(ctx) {
  // 通过观察源码·皇帝模式 _edictCats 有 5 类·穿越模式 3 类
  // 这里间接验证：在穿越模式下传入 edict-mil（穿越模式 label='建议'）有内容·也会落账为 '建议'
  var domValues = {
    'edict-pol': '陈情一封',
    'edict-mil': '献议一条',
    'edict-dip': '',
    'edict-eco': '',
    'edict-oth': '其他陈乞',
    'xinglu-pub': '',
    'xinglu': ''
  };
  ctx._$ = function(id) {
    if (domValues[id] != null) return { value: domValues[id] };
    return null;
  };
  setupCtx(ctx, 'minister', true, '李大臣');
  ctx._$ = function(id) {
    if (domValues[id] != null) return { value: domValues[id] };
    return null;
  };
  ctx._endTurn_collectInput();
  var turnEntries = ctx.GM._edictTracker.filter(function(e) { return e.turn === 9; });
  var labels = turnEntries.map(function(e) { return e.category; }).sort();
  assert(labels.length === 3, 'trans-cat: 穿越模式落账 3 条（奏疏/建议/其他）·实际 ' + labels.length);
  assert(labels.indexOf('奏疏') !== -1, 'trans-cat: 含 奏疏');
  assert(labels.indexOf('建议') !== -1, 'trans-cat: 含 建议');
  assert(labels.indexOf('其他') !== -1, 'trans-cat: 含 其他');
}

function sourceFieldAllEntriesTest(ctx) {
  // 所有 3 条落账 source 都是 player-memorial
  setupCtx(ctx, 'minister', true, '李大臣');
  var domValues = {
    'edict-pol': '奏一',
    'edict-mil': '议二',
    'edict-dip': '',
    'edict-eco': '',
    'edict-oth': '他三',
    'xinglu-pub': '',
    'xinglu': ''
  };
  ctx._$ = function(id) {
    if (domValues[id] != null) return { value: domValues[id] };
    return null;
  };
  ctx._endTurn_collectInput();
  var turnEntries = ctx.GM._edictTracker.filter(function(e) { return e.turn === 9; });
  turnEntries.forEach(function(e) {
    assert(e.source === 'player-memorial', 'trans-source-all: 每条 source=player-memorial');
  });
}

try {
  sourceBranchTest();
  var ctx = buildContext();
  transModeTest(ctx);
  emperorModeTest(ctx);
  categoryCountTest(ctx);
  sourceFieldAllEntriesTest(ctx);
  console.log('[smoke-transmigration-edict-panel] PASS · 5 sub-tests · UI 源码分支 + _endTurn_collectInput 双模式分支（source/category）');
  process.exit(0);
} catch (e) {
  console.error('[smoke-transmigration-edict-panel] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
