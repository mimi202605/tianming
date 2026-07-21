#!/usr/bin/env node
// scripts/smoke-transmigration-chronicle.js — Phase 6·Task 31 起居注/编年标注决策来源 smoke
// 验证：
//   - tm-shiji-qiju-ui.js _qijuNormalize 返回 source 字段（向前兼容老存档）
//   - tm-shiji-qiju-ui.js _qijuSourceClass / _qijuSourceLabel 工具函数（5 类来源映射）
//   - tm-shiji-qiju-ui.js renderQiju 在条目 hdr 渲染 qj-src-chip
//   - tm-shiji-qiju-ui.js _qijuZoom 展阅弹窗显示 source chip
//   - tm-sovereign-ai.js _generateEdicts 通过 TM.Qiju.record 写起居注带 source='sovereign-ai'
//   - tm-endturn-prep.js _endTurn_collectInput recordEntry 调用带 source=_src
//   - tm-chronicle-system.js addMonthDraft 月稿含 sovereignDecisions / playerActions 两段
//   - tm-chronicle-system.js _tryGenerateYearChronicle prompt 注入两段叙事

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

function readFile(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

// ── 1. 静态源码：tm-shiji-qiju-ui.js 含 source 工具函数 ──
function staticQijuUiTest() {
  var src = readFile('tm-shiji-qiju-ui.js');
  assert(src.indexOf('function _qijuSourceClass') >= 0, 'static-qiju-ui: _qijuSourceClass 存在');
  assert(src.indexOf('function _qijuSourceLabel') >= 0, 'static-qiju-ui: _qijuSourceLabel 存在');
  assert(src.indexOf("'player-memorial'") >= 0 || src.indexOf('"player-memorial"') >= 0,
    'static-qiju-ui: 识别 player-memorial 来源');
  assert(src.indexOf("'sovereign-ai'") >= 0 || src.indexOf('"sovereign-ai"') >= 0,
    'static-qiju-ui: 识别 sovereign-ai 来源');
  assert(src.indexOf("'fallback'") >= 0 || src.indexOf('"fallback"') >= 0,
    'static-qiju-ui: 识别 fallback 来源');
  assert(src.indexOf('qj-src-chip') >= 0, 'static-qiju-ui: renderQiju 含 qj-src-chip 元素');
  // _qijuNormalize 返回 source 字段
  assert(/return\s*\{[^}]*source:\s*src/.test(src), 'static-qiju-ui: _qijuNormalize 返回 source 字段');
  // _qijuZoom 展阅弹窗显示 source
  assert(src.indexOf('Task 31·展阅弹窗显示决策来源') >= 0, 'static-qiju-ui: _qijuZoom 含 source chip');
}

// ── 2. 静态源码：tm-sovereign-ai.js _generateEdicts 写起居注带 source ──
function staticSovereignAiTest() {
  var src = readFile('tm-sovereign-ai.js');
  assert(src.indexOf('TM.Qiju.record') >= 0, 'static-sovereign-ai: 调用 TM.Qiju.record');
  assert(src.indexOf("source: 'sovereign-ai'") >= 0, 'static-sovereign-ai: source=sovereign-ai');
  assert(src.indexOf('Task 31·起居注标注君主 AI 决策来源') >= 0, 'static-sovereign-ai: Task 31 注释存在');
}

// ── 3. 静态源码：tm-endturn-prep.js recordEntry 调用带 source ──
function staticPrepTest() {
  var src = readFile('tm-endturn-prep.js');
  assert(src.indexOf('source:_src') >= 0, 'static-prep: recordEntry 带 source=_src');
  assert(src.indexOf('Task 31·起居注标注决策来源') >= 0, 'static-prep: Task 31 注释存在');
}

// ── 4. 静态源码：tm-chronicle-system.js 月稿区分两段 ──
function staticChronicleTest() {
  var src = readFile('tm-chronicle-system.js');
  assert(src.indexOf('sovereignDecisions') >= 0, 'static-chronicle: 含 sovereignDecisions 字段');
  assert(src.indexOf('playerActions') >= 0, 'static-chronicle: 含 playerActions 字段');
  assert(src.indexOf('Task 31·SubTask 31.3') >= 0, 'static-chronicle: Task 31 SubTask 31.3 注释存在');
  // prompt 注入两段叙事
  assert(src.indexOf('君主自动决策') >= 0, 'static-chronicle: prompt 含「君主自动决策」段');
  assert(src.indexOf('玩家行动') >= 0, 'static-chronicle: prompt 含「玩家行动」段');
  // 穿越模式额外提示
  assert(src.indexOf('穿越模式') >= 0, 'static-chronicle: prompt 含穿越模式提示');
}

// ── 5. 动态测试：_qijuNormalize / _qijuSourceClass / _qijuSourceLabel ──
function dynamicQijuNormalizeTest() {
  // 加载 tm-shiji-qiju-ui.js 到 sandbox（依赖 escHtml + GM）
  var ctx = {
    console: { log: function(){}, warn: function(){} },
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, Set: Set
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);

  // mock 依赖：escHtml / GM / P 等
  ctx.GM = { chars: [], allCharacters: [], qijuHistory: [], shijiHistory: [], _edictTracker: [], turn: 1 };
  ctx.P = { playerInfo: { transmigrationMode: true, playerRole: 'minister' }, time: { year: 1627 } };
  ctx.escHtml = function(s) { return String(s == null ? '' : s); };
  ctx._$ = function() { return null; };
  ctx.toast = function() {};
  ctx.getTSText = function(t) { return 'T' + t; };
  ctx._gtTabVisible = function() { return true; };
  ctx._getDaysPerTurn = function() { return 30; };
  ctx.calcDateFromTurn = function() { return { adYear: 1627 }; };
  ctx.decoratePendingInDom = function() {};

  vm.runInContext(readFile('tm-shiji-qiju-ui.js'), ctx, { filename: 'tm-shiji-qiju-ui.js' });

  // _qijuSourceClass 测试
  assert(ctx._qijuSourceClass('player-memorial') === 'src-player', 'dyn-norm: player-memorial → src-player');
  assert(ctx._qijuSourceClass('sovereign-player') === 'src-player', 'dyn-norm: sovereign-player → src-player');
  assert(ctx._qijuSourceClass('player') === 'src-player', 'dyn-norm: player → src-player');
  assert(ctx._qijuSourceClass('sovereign-ai') === 'src-sovereign', 'dyn-norm: sovereign-ai → src-sovereign');
  assert(ctx._qijuSourceClass('fallback') === 'src-sovereign', 'dyn-norm: fallback → src-sovereign');
  assert(ctx._qijuSourceClass('npc') === 'src-npc', 'dyn-norm: npc → src-npc');
  assert(ctx._qijuSourceClass('') === '', 'dyn-norm: 空 → 空（无 chip）');
  assert(ctx._qijuSourceClass(undefined) === '', 'dyn-norm: undefined → 空');

  // _qijuSourceLabel 测试
  assert(ctx._qijuSourceLabel('player-memorial') === '玩家·上奏', 'dyn-norm: label player-memorial');
  assert(ctx._qijuSourceLabel('sovereign-player') === '玩家·君主', 'dyn-norm: label sovereign-player');
  assert(ctx._qijuSourceLabel('sovereign-ai') === '君主AI', 'dyn-norm: label sovereign-ai');
  assert(ctx._qijuSourceLabel('fallback') === '君主AI·兜底', 'dyn-norm: label fallback');
  assert(ctx._qijuSourceLabel('npc') === 'NPC', 'dyn-norm: label npc');
  assert(ctx._qijuSourceLabel('') === '', 'dyn-norm: label 空');

  // _qijuNormalize 测试：schema1 (edicts) 带 source
  var r1 = ctx._qijuNormalize({ edicts: { political: '奏请施恩' }, source: 'player-memorial' });
  assert(r1.source === 'player-memorial', 'dyn-norm: schema1 透传 source=player-memorial');
  assert(r1.cat === '诏令', 'dyn-norm: schema1 cat=诏令');

  // _qijuNormalize 测试：schema3 (content) 无 source 但内容含「君主 AI」前缀（兜底反推）
  var r2 = ctx._qijuNormalize({ content: '【君主 AI 颁旨】大赦天下' });
  assert(r2.source === 'sovereign-ai', 'dyn-norm: schema3 兜底反推 source=sovereign-ai');
  assert(r2.text === '【君主 AI 颁旨】大赦天下', 'dyn-norm: schema3 text 正确');

  // _qijuNormalize 测试：老存档无 source 且无 AI 前缀
  var r3 = ctx._qijuNormalize({ content: '【朝议】议立太子' });
  assert(r3.source === '', 'dyn-norm: 老存档 source 为空');
  assert(r3.cat === '朝议', 'dyn-norm: 老存档 cat 反推正确');

  // _qijuNormalize 测试：schema2 (zhengwen)
  var r4 = ctx._qijuNormalize({ zhengwen: '春风十里', source: 'sovereign-ai' });
  assert(r4.source === 'sovereign-ai', 'dyn-norm: schema2 透传 source');
  assert(r4.cat === '叙事', 'dyn-norm: schema2 cat=叙事');
}

// ── 6. 动态测试：renderQiju 含 source-chip HTML ──
function dynamicRenderQijuTest() {
  var ctx = {
    console: { log: function(){}, warn: function(){} },
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, Set: Set
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);

  // mock 依赖
  ctx.GM = {
    chars: [{ name: '李大臣' }, { name: '王尚书' }],
    allCharacters: [],
    qijuHistory: [
      { turn: 5, content: '【君主 AI 颁旨】大赦天下', category: '诏令', source: 'sovereign-ai' },
      { turn: 5, content: '【奏疏】臣请陛下施恩', category: '奏疏', source: 'player-memorial' },
      { turn: 5, content: '【朝议】议立太子', category: '朝议' }
    ],
    shijiHistory: [],
    _edictTracker: [],
    turn: 5
  };
  ctx.P = { playerInfo: { transmigrationMode: true, playerRole: 'minister' }, time: { year: 1627 } };
  ctx.escHtml = function(s) { return String(s == null ? '' : s); };
  ctx._$ = function(id) {
    if (id === 'qiju-history') return { innerHTML: '' };
    return null;
  };
  ctx.toast = function() {};
  ctx.getTSText = function(t) { return 'T' + t; };
  ctx._gtTabVisible = function() { return true; };
  ctx._getDaysPerTurn = function() { return 30; };
  ctx.decoratePendingInDom = function() {};

  vm.runInContext(readFile('tm-shiji-qiju-ui.js'), ctx, { filename: 'tm-shiji-qiju-ui.js' });

  // 渲染并捕获 innerHTML
  var capturedHtml = '';
  ctx._$ = function(id) {
    if (id === 'qiju-history') {
      return {
        get innerHTML() { return capturedHtml; },
        set innerHTML(v) { capturedHtml = String(v); }
      };
    }
    if (id === 'qj-statbar' || id === 'qj-legend') return null;
    return null;
  };
  ctx.renderQiju();
  assert(capturedHtml.length > 0, 'dyn-render: innerHTML 已生成');
  assert(capturedHtml.indexOf('qj-src-chip') >= 0, 'dyn-render: 含 qj-src-chip');
  assert(capturedHtml.indexOf('src-sovereign') >= 0, 'dyn-render: 含 src-sovereign CSS 类');
  assert(capturedHtml.indexOf('src-player') >= 0, 'dyn-render: 含 src-player CSS 类');
  assert(capturedHtml.indexOf('君主AI') >= 0, 'dyn-render: 含君主AI 标签');
  assert(capturedHtml.indexOf('玩家·上奏') >= 0, 'dyn-render: 含玩家·上奏 标签');
  // 第三条无 source 不应渲染 chip
  var thirdRecIdx = capturedHtml.lastIndexOf('qj-cat-chip');
  // 第三条之前应无 qj-src-chip（仅两处 chip）
  var chipCount = (capturedHtml.match(/qj-src-chip/g) || []).length;
  assert(chipCount === 2, 'dyn-render: 仅 2 条 source chip（第三条无 source 不渲染）');
}

// ── 7. 动态测试：ChronicleSystem.addMonthDraft 月稿区分两段 ──
function dynamicChronicleAddMonthDraftTest() {
  var ctx = {
    console: { log: function(){}, warn: function(){} },
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, Set: Set
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);

  // mock 依赖
  ctx.P = {
    time: { year: 1627, seasons: ['春', '夏', '秋', '冬'] },
    conf: { chronicleKeep: 10 },
    ai: { key: '' }
  };
  ctx._getDaysPerTurn = function() { return 30; };
  ctx.isYearBoundary = function() { return false; };
  ctx.GM = {
    turn: 6,
    _edictTracker: [
      { turn: 5, content: '君主AI颁旨：大赦天下', category: '诏令', source: 'sovereign-ai' },
      { turn: 5, content: '臣请陛下施恩于江南', category: '奏疏', source: 'player-memorial' },
      { turn: 5, content: '臣请陛下整饬吏治', category: '奏疏', source: 'player-memorial' },
      { turn: 5, content: '老存档条目无 source', category: '诏令' },  // 老 data 不进两段
      { turn: 4, content: '上回合的君主AI颁旨', category: '诏令', source: 'sovereign-ai' }  // 上回合不算
    ],
    _chronicle: []
  };

  vm.runInContext(readFile('tm-chronicle-system.js'), ctx, { filename: 'tm-chronicle-system.js' });

  // 调 addMonthDraft（turn=5）
  ctx.ChronicleSystem.addMonthDraft(5, '本季大事：春令施恩', '春风十里');

  // 取月稿
  var keys = Object.keys(ctx.ChronicleSystem.monthDrafts);
  assert(keys.length === 1, 'dyn-chronicle: 1 条月稿');
  var draft = ctx.ChronicleSystem.monthDrafts[keys[0]];
  assert(draft.sovereignDecisions && draft.sovereignDecisions.length === 1,
    'dyn-chronicle: sovereignDecisions 长度=1');
  assert(draft.sovereignDecisions[0].content === '君主AI颁旨：大赦天下',
    'dyn-chronicle: sovereignDecisions 内容正确');
  assert(draft.playerActions && draft.playerActions.length === 2,
    'dyn-chronicle: playerActions 长度=2');
  assert(draft.playerActions[0].content === '臣请陛下施恩于江南',
    'dyn-chronicle: playerActions[0] 内容正确');
  assert(draft.playerActions[1].content === '臣请陛下整饬吏治',
    'dyn-chronicle: playerActions[1] 内容正确');
  // 老存档条目不进两段
  var allDecs = draft.sovereignDecisions.concat(draft.playerActions);
  var hasOldEntry = allDecs.some(function(d){ return d.content === '老存档条目无 source'; });
  assert(!hasOldEntry, 'dyn-chronicle: 老存档条目（无 source）不进两段');
  // 上回合条目不进两段
  var hasLastTurn = allDecs.some(function(d){ return d.content === '上回合的君主AI颁旨'; });
  assert(!hasLastTurn, 'dyn-chronicle: 上回合条目不进两段');
  // summary/narrative 仍正常
  assert(draft.summary === '本季大事：春令施恩', 'dyn-chronicle: summary 正常');
  assert(draft.narrative === '春风十里', 'dyn-chronicle: narrative 正常');
}

// ── 8. 动态测试：_tryGenerateYearChronicle prompt 含两段叙事 ──
function dynamicChroniclePromptTest() {
  var capturedPrompt = '';
  var ctx = {
    console: { log: function(){}, warn: function(){} },
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, Set: Set,
    Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);

  ctx.P = {
    time: { year: 1627, seasons: ['春', '夏', '秋', '冬'] },
    conf: { chronicleKeep: 10 },
    ai: { key: 'fake-key' },  // 有 key 才会进入 _tryGenerateYearChronicle
    playerInfo: { transmigrationMode: true, playerRole: 'minister', characterName: '李大臣' },
    chronicleConfig: { style: 'biannian' }
  };
  ctx._getDaysPerTurn = function() { return 30; };
  ctx.isYearBoundary = function() { return true; };  // 强制年末触发
  ctx._getCharRange = function() { return [400, 800]; };
  ctx._charRangeText = function() { return '400-800字'; };
  ctx._charRangeScaled = function() { return '100-200字'; };
  ctx.findScenarioById = function() { return { dynasty: '大明', emperor: '测试君' }; };
  ctx.calcDateFromTurn = function(t) { return { adYear: 1627 }; };
  ctx._dbg = function() {};
  ctx.addEB = function() {};
  ctx.extractJSON = function(s) { try { return JSON.parse(s); } catch(_) { return null; } };
  // callAI mock：捕获 prompt 不实际调用
  ctx.callAI = function(prompt) {
    capturedPrompt = prompt;
    return Promise.resolve(JSON.stringify({ chronicle: '编年史正文', afterword: '史评' }));
  };
  ctx.GM = {
    turn: 13,
    _edictTracker: [
      { turn: 5, content: '君主AI颁旨：大赦天下', category: '诏令', source: 'sovereign-ai', status: 'pending' }
    ],
    _chronicle: [],
    _foreshadowings: [],
    _yearlyDigest: []
  };

  vm.runInContext(readFile('tm-chronicle-system.js'), ctx, { filename: 'tm-chronicle-system.js' });

  // 预置月稿带两段
  ctx.ChronicleSystem.monthDrafts['1627-0'] = {
    turn: 5, year: 1627, season: 0,
    summary: '春令施恩',
    narrative: '',
    sovereignDecisions: [{ content: '君主AI颁旨：大赦天下', category: '诏令' }],
    playerActions: [{ content: '臣请陛下施恩', category: '奏疏' }],
    timestamp: Date.now()
  };

  // 触发 _tryGenerateYearChronicle
  ctx.ChronicleSystem._tryGenerateYearChronicle(1627);

  // 异步等 callAI 完成
  return new Promise(function(resolve) {
    setTimeout(function() {
      assert(capturedPrompt.length > 0, 'dyn-prompt: prompt 已被捕获');
      assert(capturedPrompt.indexOf('君主自动决策') >= 0, 'dyn-prompt: 含「君主自动决策」段');
      assert(capturedPrompt.indexOf('玩家行动') >= 0, 'dyn-prompt: 含「玩家行动」段');
      assert(capturedPrompt.indexOf('穿越模式') >= 0, 'dyn-prompt: 含穿越模式提示');
      assert(capturedPrompt.indexOf('君主AI颁旨') >= 0, 'dyn-prompt: 含君主AI颁旨条目');
      assert(capturedPrompt.indexOf('臣请陛下施恩') >= 0, 'dyn-prompt: 含玩家上奏条目');
      resolve();
    }, 50);
  });
}

async function run() {
  staticQijuUiTest();
  staticSovereignAiTest();
  staticPrepTest();
  staticChronicleTest();
  dynamicQijuNormalizeTest();
  dynamicRenderQijuTest();
  dynamicChronicleAddMonthDraftTest();
  await dynamicChroniclePromptTest();
  console.log('[smoke-transmigration-chronicle] PASS · 8 sub-tests · 起居注 source chip + 编年史月稿区分君主AI/玩家两段 + 年度 prompt 注入');
  process.exit(0);
}

run().catch(function(e) {
  console.error('[smoke-transmigration-chronicle] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
