#!/usr/bin/env node
// ============================================================
// smoke-transmigration-tab-no-fallback.js — 防止 4 个 tab 显示「待接入」回归
// ------------------------------------------------------------
// 2026-07-21 根治「际遇/变故/戎机/交往 tab 显示（XXX 待接入）冷提示」bug。
//
// 历史根因:
//   tm-player-systems-adapter.js 的 _callSystemRender 对以下系统返回 null·走 _fallback:
//   - PlayerRebel: 有 renderPanel 但未在 PANEL_METHOD_MAP 登记
//   - PlayerInteraction: 无 renderBlockHTML/getState·但有 listInteractableNpcs
//   - PlayerFortune / PlayerAdversity: 完全无源码实现
//
// 修复:
//   - PlayerRebel: PANEL_METHOD_MAP 加 'renderPanel' 映射
//   - PlayerInteraction: _customRender 加专用渲染器·调 listInteractableNpcs 渲染人际名录
//   - PlayerFortune / PlayerAdversity: FRIENDLY_FALLBACK 友好中文化占位
//
// 断言:
//   场景 1: PlayerRebel.renderPanel 存在 → renderBlock 调用之·不含「待接入」
//   场景 2: PlayerInteraction.listInteractableNpcs 存在 → renderBlock 走专用渲染·含「人际」
//   场景 3: PlayerFortune 完全未实现 → renderBlock 走友好占位·含「筹备中」·不含「待接入」
//   场景 4: PlayerAdversity 完全未实现 → renderBlock 走友好占位·含「筹备中」·不含「待接入」
//   场景 5: 4 个 tab 全部不含「待接入」字样
//
// 末尾打印 [smoke-transmigration-tab-no-fallback] PASS · N sub-tests
// ============================================================
'use strict';
var vm = require('vm');
var fs = require('fs');
var path = require('path');

var WEB_DIR = path.resolve(__dirname, '..');
var fail = 0, pass = 0;

function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

function buildCtx() {
  var ctx = {
    console: { log: function(){}, warn: function(){}, error: function(){} },
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    Set: Set, Map: Map,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN,
    setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  return ctx;
}

function loadAdapter(ctx) {
  var src = fs.readFileSync(path.join(WEB_DIR, 'tm-player-systems-adapter.js'), 'utf8');
  vm.runInContext(src, ctx, { filename: 'tm-player-systems-adapter.js' });
}

// ── 通用：装 P.playerInfo（穿越模式 + 非 emperor） ──────────
function installPlayerInfo(ctx) {
  ctx.P = {
    playerInfo: {
      transmigrationMode: true,
      playerRole: 'minister',
      characterName: '赵孟頫',
      characterTitle: '翰林学士'
    }
  };
  ctx.GM = { turn: 5, chars: [] };
}

// ═══════════════════════════════════════════════════════════
// 场景 1: PlayerRebel.renderPanel 存在 → renderBlock 调用之
// ═══════════════════════════════════════════════════════════
function testPlayerRebelUsesRenderPanel() {
  console.log('── 场景 1: PlayerRebel 走 renderPanel·不含「待接入」 ──');
  var ctx = buildCtx();
  installPlayerInfo(ctx);
  loadAdapter(ctx);

  var panelCalled = false;
  ctx.TM.PlayerRebel = {
    renderPanel: function () { panelCalled = true; return '<div class="pr-panel">反叛账本</div>'; }
  };

  var html = ctx.TM.PlayerSystemsAdapter.renderBlock('PlayerRebel', 'minister', '反叛');
  ok('renderBlock(PlayerRebel) 返回非空字符串', typeof html === 'string' && html.length > 0);
  ok('PlayerRebel.renderPanel 被调用', panelCalled);
  ok('返回 HTML 含反叛账本内容', html.indexOf('反叛账本') >= 0, 'html: ' + html.slice(0, 80));
  ok('返回 HTML 不含「待接入」', html.indexOf('待接入') < 0, 'html: ' + html.slice(0, 80));
}

// ═══════════════════════════════════════════════════════════
// 场景 2: PlayerInteraction.listInteractableNpcs 存在 → renderBlock 走专用渲染
// ═══════════════════════════════════════════════════════════
function testPlayerInteractionUsesCustomRender() {
  console.log('── 场景 2: PlayerInteraction 走专用渲染·含「人际」 ──');
  var ctx = buildCtx();
  installPlayerInfo(ctx);
  loadAdapter(ctx);

  var listCalled = false;
  ctx.TM.PlayerInteraction = {
    listInteractableNpcs: function () {
      listCalled = true;
      return [
        { name: '李大臣', title: '尚书', faction: '李氏', military: false, dims: { friend: 30, colleague: 10 } },
        { name: '王将军', title: '禁军大将', faction: '', military: true, dims: {} }
      ];
    },
    getActionMenu: function () { return []; }
  };

  var html = ctx.TM.PlayerSystemsAdapter.renderBlock('PlayerInteraction', 'minister', '人际');
  ok('renderBlock(PlayerInteraction) 返回非空字符串', typeof html === 'string' && html.length > 0);
  ok('listInteractableNpcs 被调用', listCalled);
  ok('返回 HTML 含「人际」字样', html.indexOf('人际') >= 0, 'html: ' + html.slice(0, 80));
  ok('返回 HTML 含 NPC「李大臣」', html.indexOf('李大臣') >= 0, 'html: ' + html.slice(0, 200));
  ok('返回 HTML 含 NPC「王将军」', html.indexOf('王将军') >= 0);
  ok('返回 HTML 含维度标签「亲友」', html.indexOf('亲友') >= 0);
  ok('返回 HTML 不含「待接入」', html.indexOf('待接入') < 0);
}

// 场景 2b: PlayerInteraction.listInteractableNpcs 返回空 → 显示「暂无可互动人物」
function testPlayerInteractionEmptyList() {
  console.log('── 场景 2b: PlayerInteraction 空列表 → 友好空态 ──');
  var ctx = buildCtx();
  installPlayerInfo(ctx);
  loadAdapter(ctx);
  ctx.TM.PlayerInteraction = {
    listInteractableNpcs: function () { return []; }
  };
  var html = ctx.TM.PlayerSystemsAdapter.renderBlock('PlayerInteraction', 'minister', '人际');
  ok('空列表返回 HTML 不含「待接入」', html.indexOf('待接入') < 0);
  ok('空列表返回 HTML 含友好空态提示', html.indexOf('暂无可互动') >= 0, 'html: ' + html.slice(0, 200));
}

// ═══════════════════════════════════════════════════════════
// 场景 3: PlayerFortune 完全未实现 → 走友好占位
// ═══════════════════════════════════════════════════════════
function testPlayerFortuneFriendlyFallback() {
  console.log('── 场景 3: PlayerFortune 未实现 → 友好占位 ──');
  var ctx = buildCtx();
  installPlayerInfo(ctx);
  loadAdapter(ctx);
  // 不装 TM.PlayerFortune（模拟完全未实现）

  var html = ctx.TM.PlayerSystemsAdapter.renderBlock('PlayerFortune', 'minister', '际遇');
  ok('renderBlock(PlayerFortune) 返回非空字符串', typeof html === 'string' && html.length > 0);
  ok('返回 HTML 含「筹备中」', html.indexOf('筹备中') >= 0, 'html: ' + html.slice(0, 200));
  ok('返回 HTML 不含「待接入」', html.indexOf('待接入') < 0);
}

// ═══════════════════════════════════════════════════════════
// 场景 4: PlayerAdversity 完全未实现 → 走友好占位
// ═══════════════════════════════════════════════════════════
function testPlayerAdversityFriendlyFallback() {
  console.log('── 场景 4: PlayerAdversity 未实现 → 友好占位 ──');
  var ctx = buildCtx();
  installPlayerInfo(ctx);
  loadAdapter(ctx);

  var html = ctx.TM.PlayerSystemsAdapter.renderBlock('PlayerAdversity', 'minister', '变故');
  ok('renderBlock(PlayerAdversity) 返回非空字符串', typeof html === 'string' && html.length > 0);
  ok('返回 HTML 含「筹备中」', html.indexOf('筹备中') >= 0, 'html: ' + html.slice(0, 200));
  ok('返回 HTML 不含「待接入」', html.indexOf('待接入') < 0);
}

// ═══════════════════════════════════════════════════════════
// 场景 5: 4 个 tab 全部不含「待接入」字样
// ═══════════════════════════════════════════════════════════
function testAllTabsNoFallback() {
  console.log('── 场景 5: 4 个 tab 全部不含「待接入」 ──');
  var ctx = buildCtx();
  installPlayerInfo(ctx);
  loadAdapter(ctx);

  // 装上能正常工作的 PlayerRebel/PlayerInteraction
  ctx.TM.PlayerRebel = { renderPanel: function () { return '<div class="pr-panel">反叛账本</div>'; } };
  ctx.TM.PlayerInteraction = { listInteractableNpcs: function () { return []; } };
  // PlayerFortune / PlayerAdversity 故意不装

  var tabTests = [
    { tab: '戎机·反叛', sysKey: 'PlayerRebel', title: '反叛' },
    { tab: '交往·人际', sysKey: 'PlayerInteraction', title: '人际' },
    { tab: '际遇', sysKey: 'PlayerFortune', title: '际遇' },
    { tab: '变故', sysKey: 'PlayerAdversity', title: '变故' }
  ];
  tabTests.forEach(function (t) {
    var html = ctx.TM.PlayerSystemsAdapter.renderBlock(t.sysKey, 'minister', t.title);
    ok('[' + t.tab + '] 不含「待接入」',
       html.indexOf('待接入') < 0,
       'html: ' + html.slice(0, 120));
  });
}

// ── 运行 ──────────────────────────────────────────────────
testPlayerRebelUsesRenderPanel();
testPlayerInteractionUsesCustomRender();
testPlayerInteractionEmptyList();
testPlayerFortuneFriendlyFallback();
testPlayerAdversityFriendlyFallback();
testAllTabsNoFallback();

// ── 总结 ──────────────────────────────────────────────────
console.log('');
if (fail === 0) {
  console.log('[smoke-transmigration-tab-no-fallback] PASS · ' + pass + ' sub-tests');
  process.exit(0);
} else {
  console.log('[smoke-transmigration-tab-no-fallback] FAIL · ' + fail + ' failed, ' + pass + ' passed');
  process.exit(1);
}
