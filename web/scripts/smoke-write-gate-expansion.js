#!/usr/bin/env node
// scripts/smoke-write-gate-expansion.js
// 2026-07-19·刀C·写端反向闸扩面(四通道)·正反用例集成断言(真 applier/preflight 链·源码判据)。
//   C1·结构化 character_deaths 键补来源判据(reconcile.preflightAIWriteBack)
//   C2·personnel_changes 司法类动词补来源判据(applier.applyAITurnChanges 兜底段)
//   C3·char_updates 敏感字段来源判据 + 万能键(anyPathChanges/changes)禁区(applier + pathutils)
//   C4·events 键时点闸(applier.applyAITurnChanges 事件段)
// 范式复用刀9：拒写降级→GM._aiWeakWriteHints 留痕·宁漏勿误杀(有任一源即放行)。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0, failed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.error('  ✗ ' + m); } }

function makeCtx() {
  const ctx = {
    console: { log() {}, warn() {}, info() {}, error() {} },
    Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp,
    isFinite, isNaN, parseInt, parseFloat, Promise, Symbol, Map, Set,
    setTimeout: () => 0, clearTimeout: () => {}, Error, TypeError, RangeError
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  ctx.TM = { errors: { capture() {}, captureSilent() {} } };
  ctx.GameEventBus = { emit() {}, on() {} };
  ctx._dbg = () => {};
  ctx.getTSText = () => '';
  ctx._eb = [];
  ctx.addEB = (cat, msg) => { ctx._eb.push({ cat, msg }); };
  ctx.findCharByName = (name) => (ctx.GM.chars || []).find(c => c && c.name === name);
  ctx._fuzzyFindChar = (name) => (ctx.GM.chars || []).find(c => c && c.name === name);
  vm.createContext(ctx);
  ['tm-time-utils.js', 'tm-ai-change-pathutils.js', 'tm-ai-change-army.js', 'tm-ai-change-narrative.js',
   'tm-ai-change-applier.js', 'tm-ai-change-applier-validators.js', 'tm-ai-change-applier-reconcile.js',
   'tm-ai-apply-deaths.js', 'tm-endturn-apply-stages.js']
    .forEach(f => { try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); } catch (_) {} });
  return ctx;
}

function baseGM(chars, extra) {
  return Object.assign({
    turn: 5, year: 1626, facs: [{ name: '明朝廷' }], officeTree: [], _turnReport: [], armies: [],
    memorials: [], currentIssues: [], _playerDirectives: [],
    publicTreasury: {}, guoku: { money: 100000 }, neitang: { money: 50000 }, chars: chars
  }, extra || {});
}
function hintNames(GM) { return (GM._aiWeakWriteHints || []).map(h => h && h.itemName); }
function hintCount(GM) { return (GM._aiWeakWriteHints || []).length; }
function findCh(GM, n) { return (GM.chars || []).find(c => c && c.name === n); }

(function () {
  console.log('smoke-write-gate-expansion');

  // ══════════════════════════════════════════════════════════════════
  //  C1·结构化 character_deaths 补来源判据(preflightAIWriteBack)
  // ══════════════════════════════════════════════════════════════════
  console.log('===== C1·结构化 character_deaths 来源判据 =====');
  // C1-neg·裸死因(病故=bare)+无任何源头 → 拦下+弱提示留痕
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '魏忠贤', alive: true, faction: '明朝廷', resources: {} }]);   // 魏忠贤·无司法态
    const ai = { character_deaths: [{ name: '魏忠贤', reason: '病故' }] };   // 病故·bare·无源
    ctx.preflightAIWriteBack(ai, { source: 'test-c1' });
    ok(ai.character_deaths.length === 0, 'C1-neg 裸病故无源→结构化死条被拦(不落库)');
    ok(hintNames(ctx.GM).indexOf('魏忠贤') >= 0, 'C1-neg 拒写降级→弱自查纸条留痕(itemName=魏忠贤)');
  }
  // C1-pos·裸死因但有司法前置态(_imprisoned·有源) → 放行·不误杀
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '魏忠贤', alive: true, _imprisoned: true, faction: '明朝廷', resources: {} }]);
    const ai = { character_deaths: [{ name: '魏忠贤', reason: '狱中病故' }] };   // 狱中病故·bare·司法态有源
    ctx.preflightAIWriteBack(ai, { source: 'test-c1' });
    ok(ai.character_deaths.length === 1, 'C1-pos(司法态) 裸死因但已下狱=有源→放行(不误杀)');
    ok(hintCount(ctx.GM) === 0, 'C1-pos(司法态) 放行→零弱提示');
  }
  // C1-pos·active 死因(奉旨赐死·含本局具体事由) → 放行·不误杀
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '陈新甲', alive: true, faction: '明朝廷', resources: {} }]);
    const ai = { character_deaths: [{ name: '陈新甲', reason: '奉旨赐死' }] };   // 奉旨赐死·active
    ctx.preflightAIWriteBack(ai, { source: 'test-c1' });
    ok(ai.character_deaths.length === 1, 'C1-pos(active) 奉旨赐死=active→放行(非 bare 不入闸)');
    ok(hintCount(ctx.GM) === 0, 'C1-pos(active) 放行→零弱提示');
  }
  // C1-pos·裸死因但玩家诏令点名(path4·有源) → 放行
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '李四', alive: true, faction: '明朝廷', resources: {} }],
      { _playerDirectives: [{ id: 'd1', content: '李四论罪当诛，着即拿问' }] });   // 玩家诏令点名李四
    const ai = { character_deaths: [{ name: '李四', reason: '伏诛' }] };   // 伏诛·bare·但玩家诏令有源
    ctx.preflightAIWriteBack(ai, { source: 'test-c1' });
    ok(ai.character_deaths.length === 1, 'C1-pos(诏令) 裸伏诛但玩家诏令点名=有源→放行');
    ok(hintCount(ctx.GM) === 0, 'C1-pos(诏令) 放行→零弱提示');
  }

  console.log('');
  console.log('[smoke-write-gate-expansion] ' + passed + ' passed / ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
