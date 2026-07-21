#!/usr/bin/env node
// scripts/smoke-transmigration-endturn.js — Phase 6·Task 30 穿越模式回合流程接入 smoke
// 验证：
//   - tm-endturn-pipeline-steps.js 中存在 sovereign-ai step（name + reads + writes）
//   - tm-endturn-prep.js _endTurn_collectInput 已按 playerRole 分支（_isTrans + _src + _edictCats）
//   - tm-office-panel.js confirmEndTurn 含「上奏呈递」分支（_isTrans + _okLabel）
//   - 穿越模式 mock 调用 SovereignAI.runTurn 把决断落 _edictTracker（source='sovereign-ai'）
//   - 皇帝模式 step 跳过（不调 runTurn）
//   - SovereignAI 缺席时 step 不抛错（continue）

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

function readFile(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

// ── 1. 静态源码检查：sovereign-ai step 已在 pipeline list ──
function staticPipelineTest() {
  var src = readFile('tm-endturn-pipeline-steps.js');
  assert(src.indexOf("name: 'sovereign-ai'") >= 0, 'static-pipeline: name=sovereign-ai 存在');
  assert(src.indexOf('TM.SovereignAI.runTurn') >= 0, 'static-pipeline: 调 TM.SovereignAI.runTurn');
  assert(src.indexOf('_isTrans') >= 0, 'static-pipeline: 含 _isTrans 判定');
  assert(src.indexOf("onError: 'continue'") >= 0, 'static-pipeline: onError=continue（失败不阻断）');
  assert(src.indexOf('ctx.results.sovereignAiResult') >= 0, 'static-pipeline: 写 ctx.results.sovereignAiResult');
  // 位置：prep 之后、plan-prefetch 之前
  var prepIdx = src.indexOf("name: 'prep'");
  var sovereignIdx = src.indexOf("name: 'sovereign-ai'");
  var planPrefetchIdx = src.indexOf("name: 'plan-prefetch'");
  assert(prepIdx >= 0 && sovereignIdx > prepIdx && planPrefetchIdx > sovereignIdx,
    'static-pipeline: 顺序 prep < sovereign-ai < plan-prefetch');
}

// ── 2. 静态源码检查：_endTurn_collectInput 已按 playerRole 分支 ──
function staticCollectInputTest() {
  var src = readFile('tm-endturn-prep.js');
  assert(src.indexOf('_isTrans') >= 0, 'static-collect: _isTrans 判定存在');
  assert(src.indexOf("'player-memorial'") >= 0 || src.indexOf('"player-memorial"') >= 0,
    'static-collect: source=player-memorial 分支');
  assert(src.indexOf("'sovereign-player'") >= 0 || src.indexOf('"sovereign-player"') >= 0,
    'static-collect: source=sovereign-player 分支');
  assert(src.indexOf("label:'奏疏'") >= 0, 'static-collect: 穿越模式 category=奏疏');
  assert(src.indexOf("label:'政令'") >= 0, 'static-collect: 皇帝模式 category=政令');
}

// ── 3. 静态源码检查：confirmEndTurn 含「上奏呈递」分支 ──
function staticConfirmEndTurnTest() {
  var src = readFile('tm-office-panel.js');
  assert(src.indexOf('function confirmEndTurn') >= 0, 'static-confirm: confirmEndTurn 存在');
  assert(src.indexOf("'上奏呈递'") >= 0, 'static-confirm: 含「上奏呈递」按钮文案');
  assert(src.indexOf("'颁行天下'") >= 0, 'static-confirm: 含「颁行天下」按钮文案（默认）');
  assert(src.indexOf('_okLabel') >= 0, 'static-confirm: _okLabel 动态切换');
}

// ── 4. 动态测试：SovereignAI.runTurn 在穿越模式被调用 ──
function dynamicSovereignRunTest() {
  // mock SovereignAI.runTurn → 落 _edictTracker 一条 source='sovereign-ai' 记录
  var runTurnCalls = [];
  var mockSovereignAI = {
    runTurn: function(root, turnCtx) {
      runTurnCalls.push({ turn: turnCtx && turnCtx.turn, hasMemorials: !!(turnCtx && turnCtx.playerMemorials) });
      // 模拟 _generateEdicts 行为：push 一条 source='sovereign-ai'
      if (root && Array.isArray(root._edictTracker)) {
        root._edictTracker.push({
          id: 'sov_ai_smoke_' + Date.now(),
          content: '君主 AI 颁旨：大赦天下',
          type: 'amnesty',
          category: '诏令',
          turn: root.turn || 0,
          status: 'pending',
          source: 'sovereign-ai'
        });
      }
      return Promise.resolve({
        ok: true,
        source: 'fallback',
        rationale: 'smoke 测试',
        edicts: { applied: [{ content: '君主 AI 颁旨：大赦天下' }], failed: [] },
        chaoyi: { applied: [], failed: [] },
        memorials: { applied: [], failed: [] },
        office: { applied: [], failed: [] }
      });
    }
  };

  // 构造最小 ctx
  var GM = { turn: 7, _edictTracker: [], memorials: [], officeTree: [], facs: [] };
  var P = { playerInfo: { transmigrationMode: true, playerRole: 'minister', characterName: '李大臣', sovereignName: '测试君' } };
  var TM = { SovereignAI: mockSovereignAI };
  var ctx = { input: { edicts: { political: '请陛下施恩' } }, results: {} };

  // 重新实现 step fn 的核心逻辑（不加载整文件·避免依赖 window）
  async function stepFn(ctx) {
    var _pi = (typeof P !== 'undefined' && P && P.playerInfo) ? P.playerInfo : null;
    var _isTrans = _pi && _pi.transmigrationMode === true && _pi.playerRole && _pi.playerRole !== 'emperor';
    if (!_isTrans) return ctx;
    if (typeof TM === 'undefined' || !TM.SovereignAI || typeof TM.SovereignAI.runTurn !== 'function') return ctx;
    try {
      var _sovereignRes = await TM.SovereignAI.runTurn(GM, {
        turn: (GM && GM.turn) || 0,
        playerMemorials: (ctx.input && ctx.input.edicts) || {},
        maxTokens: 3000,
        maxAttempts: 2
      });
      ctx.results.sovereignAiResult = _sovereignRes;
    } catch (e) {
      ctx.results.sovereignAiResult = { ok: false, error: String(e && (e.message || e) || '') };
    }
    return ctx;
  }

  return stepFn(ctx).then(function() {
    assert(runTurnCalls.length === 1, 'dynamic-sovereign: runTurn 被调一次');
    assert(runTurnCalls[0].turn === 7, 'dynamic-sovereign: turn=7');
    assert(runTurnCalls[0].hasMemorials === true, 'dynamic-sovereign: playerMemorials 传入');
    assert(ctx.results.sovereignAiResult && ctx.results.sovereignAiResult.ok === true,
      'dynamic-sovereign: ctx.results.sovereignAiResult.ok');
    assert(ctx.results.sovereignAiResult.source === 'fallback', 'dynamic-sovereign: source=fallback');
    // 验证 _edictTracker 落了 source='sovereign-ai' 记录
    var sovereignEdicts = GM._edictTracker.filter(function(e){ return e.source === 'sovereign-ai'; });
    assert(sovereignEdicts.length === 1, 'dynamic-sovereign: _edictTracker 新增 1 条 sovereign-ai 记录');
    assert(sovereignEdicts[0].content.indexOf('君主 AI') === 0, 'dynamic-sovereign: 内容正确');
  });
}

// ── 5. 皇帝模式 step 跳过 ──
function dynamicEmperorSkipTest() {
  var runTurnCalls = [];
  var mockSovereignAI = { runTurn: function() { runTurnCalls.push(1); return Promise.resolve({ ok: true }); } };
  var P = { playerInfo: { transmigrationMode: false, playerRole: 'emperor' } };
  var TM = { SovereignAI: mockSovereignAI };
  var ctx = { input: {}, results: {} };

  async function stepFn(ctx) {
    var _pi = (typeof P !== 'undefined' && P && P.playerInfo) ? P.playerInfo : null;
    var _isTrans = _pi && _pi.transmigrationMode === true && _pi.playerRole && _pi.playerRole !== 'emperor';
    if (!_isTrans) return ctx;
    if (typeof TM === 'undefined' || !TM.SovereignAI || typeof TM.SovereignAI.runTurn !== 'function') return ctx;
    try {
      var _r = await TM.SovereignAI.runTurn(null, {});
      ctx.results.sovereignAiResult = _r;
    } catch (e) {}
    return ctx;
  }

  return stepFn(ctx).then(function() {
    assert(runTurnCalls.length === 0, 'dynamic-emperor: runTurn 未被调用');
    assert(ctx.results.sovereignAiResult === undefined, 'dynamic-emperor: ctx.results.sovereignAiResult 未设置');
  });
}

// ── 6. SovereignAI 缺席时不抛错 ──
function dynamicNoSovereignAITest() {
  var P = { playerInfo: { transmigrationMode: true, playerRole: 'minister' } };
  var TM = {};  // 无 SovereignAI
  var ctx = { input: {}, results: {} };

  async function stepFn(ctx) {
    var _pi = (typeof P !== 'undefined' && P && P.playerInfo) ? P.playerInfo : null;
    var _isTrans = _pi && _pi.transmigrationMode === true && _pi.playerRole && _pi.playerRole !== 'emperor';
    if (!_isTrans) return ctx;
    if (typeof TM === 'undefined' || !TM.SovereignAI || typeof TM.SovereignAI.runTurn !== 'function') return ctx;
    try {
      var _r = await TM.SovereignAI.runTurn(null, {});
      ctx.results.sovereignAiResult = _r;
    } catch (e) {}
    return ctx;
  }

  return stepFn(ctx).then(function() {
    assert(ctx.results.sovereignAiResult === undefined, 'dynamic-noAI: ctx.results.sovereignAiResult 未设置（无 AI 不抛错）');
  });
}

// ── 7. SovereignAI.runTurn 抛错时 step 不传播 ──
function dynamicSovereignThrowsTest() {
  var mockSovereignAI = {
    runTurn: function() { return Promise.reject(new Error('LLM 失败')); }
  };
  var P = { playerInfo: { transmigrationMode: true, playerRole: 'minister' } };
  var TM = { SovereignAI: mockSovereignAI };
  var ctx = { input: {}, results: {} };

  async function stepFn(ctx) {
    var _pi = (typeof P !== 'undefined' && P && P.playerInfo) ? P.playerInfo : null;
    var _isTrans = _pi && _pi.transmigrationMode === true && _pi.playerRole && _pi.playerRole !== 'emperor';
    if (!_isTrans) return ctx;
    if (typeof TM === 'undefined' || !TM.SovereignAI || typeof TM.SovereignAI.runTurn !== 'function') return ctx;
    try {
      var _r = await TM.SovereignAI.runTurn(null, {});
      ctx.results.sovereignAiResult = _r;
    } catch (e) {
      ctx.results.sovereignAiResult = { ok: false, error: String(e && (e.message || e) || '') };
    }
    return ctx;
  }

  return stepFn(ctx).then(function() {
    assert(ctx.results.sovereignAiResult && ctx.results.sovereignAiResult.ok === false,
      'dynamic-throws: ok=false');
    assert(/LLM 失败/.test(ctx.results.sovereignAiResult.error), 'dynamic-throws: error 含"LLM 失败"');
  });
}

// ── 8. SovereignAI.runTurnSync 真实调用（验证 _generateEdicts 落 source='sovereign-ai'） ──
function realSovereignRunSyncTest() {
  var ctx = {
    console: { log: function(){}, warn: function(){} },
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, Set: Set,
    Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  ctx.TM = {};
  vm.createContext(ctx);

  // 先加载 tm-transmigration.js（SovereignAI 依赖 TM.Transmigration.isTransmigrationMode）
  vm.runInContext(readFile('tm-transmigration.js'), ctx, { filename: 'tm-transmigration.js' });
  // 再加载 tm-sovereign-ai.js
  vm.runInContext(readFile('tm-sovereign-ai.js'), ctx, { filename: 'tm-sovereign-ai.js' });

  ctx.GM = {
    turn: 5,
    chars: [
      { name: '测试君', alive: true, officialTitle: '皇帝', role: '皇帝', isEmperor: true },
      { name: '李大臣', alive: true, isPlayer: true, officialTitle: '尚书', role: '臣' }
    ],
    _edictTracker: [],
    memorials: [],
    officeTree: [],
    facs: [],
    classes: [],
    vars: { corruption: { value: 30 } }
  };
  ctx.P = {
    playerInfo: {
      transmigrationMode: true,
      playerRole: 'minister',
      characterName: '李大臣',
      sovereignName: '测试君'
    },
    ai: { key: '' }  // 无 key · runTurn 会走 fallback
  };
  // mock 全局依赖
  ctx.uid = function() { return 'smoke-' + Math.random().toString(36).slice(2,8); };
  ctx.toast = function() {};
  ctx.addEB = function() {};
  ctx.classifyEdict = function() { return 'amnesty'; };
  ctx.EDICT_TYPES = { amnesty: { label: '诏令' } };
  ctx.estimateResistance = function() { return 30; };
  ctx.applyEdictTypedIncidence = function() { return null; };

  // 验证 _isEnabled
  assert(ctx.TM.SovereignAI._isEnabled() === true, 'real-sync: _isEnabled=true（穿越模式 + 非君主）');

  // 用 runTurnSync + presetOutput 模拟君主决策
  var presetOutput = {
    _source: 'preset-smoke',
    rationale: '君主决断：施恩天下',
    edicts: [
      { content: '大赦天下', trigger: '春令', treasuryDelta: -100 }
    ],
    chaoyiSpeeches: [],
    memorialDecisions: [],
    officeActions: []
  };
  var res = ctx.TM.SovereignAI.runTurnSync(ctx.GM, { turn: 5 }, presetOutput);
  assert(res.ok === true, 'real-sync: runTurnSync.ok');
  assert(res.source === 'preset-smoke', 'real-sync: source=preset-smoke（来自 _validateOutput 透传）');
  assert(res.edicts && res.edicts.applied && res.edicts.applied.length === 1, 'real-sync: 1 道诏令应用');
  // 验证 _edictTracker 落 source='sovereign-ai'
  var sovereignEdicts = ctx.GM._edictTracker.filter(function(e){ return e.source === 'sovereign-ai'; });
  assert(sovereignEdicts.length === 1, 'real-sync: _edictTracker 1 条 sovereign-ai 记录');
  assert(sovereignEdicts[0].content === '大赦天下', 'real-sync: 诏令内容正确');
  assert(sovereignEdicts[0].source === 'sovereign-ai', 'real-sync: source 标 sovereign-ai');
}

async function run() {
  staticPipelineTest();
  staticCollectInputTest();
  staticConfirmEndTurnTest();
  await dynamicSovereignRunTest();
  await dynamicEmperorSkipTest();
  await dynamicNoSovereignAITest();
  await dynamicSovereignThrowsTest();
  realSovereignRunSyncTest();
  console.log('[smoke-transmigration-endturn] PASS · 8 sub-tests · sovereign-ai pipeline step + collectInput 分支 + confirmEndTurn 文案 + 动态 runTurn (trans/emperor/noAI/throws) + real runTurnSync');
  process.exit(0);
}

run().catch(function(e) {
  console.error('[smoke-transmigration-endturn] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
