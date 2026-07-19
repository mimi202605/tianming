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

  // ══════════════════════════════════════════════════════════════════
  //  C2·personnel_changes 司法类动词补来源判据(applyAITurnChanges 兜底段)
  // ══════════════════════════════════════════════════════════════════
  console.log('===== C2·personnel_changes 司法类动作来源判据 =====');
  // C2-neg·下诏狱·无任何源头 → 不执行(未下狱)+弱提示
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '魏忠贤', position: '司礼', officialTitle: '司礼', alive: true, faction: '明朝廷', resources: {} }]);
    ctx.applyAITurnChanges({ personnel_changes: [{ name: '魏忠贤', change: '下狱究问' }] });
    ok(!findCh(ctx.GM, '魏忠贤')._imprisoned, 'C2-neg 下诏狱无源→不执行(魏忠贤未下狱)');
    ok(hintNames(ctx.GM).indexOf('魏忠贤') >= 0, 'C2-neg 拒写降级→弱自查纸条留痕');
  }
  // C2-pos·玩家诏令点名(有源) → 照常执行(已下狱)·无 C2 弱提示
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '魏忠贤', position: '司礼', officialTitle: '司礼', alive: true, faction: '明朝廷', resources: {} }],
      { _playerDirectives: [{ id: 'd1', content: '着锦衣卫拿魏忠贤下诏狱究问' }] });
    ctx.applyAITurnChanges({ personnel_changes: [{ name: '魏忠贤', change: '下狱究问' }] });
    ok(!!findCh(ctx.GM, '魏忠贤')._imprisoned, 'C2-pos(诏令) 玩家诏令点名=有源→司法动作照常落(已下狱)');
    ok(hintCount(ctx.GM) === 0, 'C2-pos(诏令) 放行→零弱提示(不误杀)');
  }
  // C2-pos·本回合弹劾奏疏点名(输入面扫描·有源) → 照常执行
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '魏忠贤', position: '司礼', officialTitle: '司礼', alive: true, faction: '明朝廷', resources: {} }],
      { memorials: [{ from: '御史', text: '臣劾魏忠贤十大罪，乞下诏狱明正典刑' }] });
    ctx.applyAITurnChanges({ personnel_changes: [{ name: '魏忠贤', change: '下狱' }] });
    ok(!!findCh(ctx.GM, '魏忠贤')._imprisoned, 'C2-pos(弹劾) 本回合弹劾奏疏点名=有源→司法动作照常落');
    ok(hintCount(ctx.GM) === 0, 'C2-pos(弹劾) 放行→零弱提示');
  }
  // C2-pos·普通任免(致仕·非司法)无源也不入闸
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '孙承宗', position: '督师', officialTitle: '督师', alive: true, faction: '明朝廷', resources: {} }]);
    ctx.applyAITurnChanges({ personnel_changes: [{ name: '孙承宗', change: '乞骸骨致仕' }] });
    ok(hintCount(ctx.GM) === 0, 'C2-pos(致仕) 普通任免不入司法闸→零弱提示(宁漏勿误杀)');
  }

  // ══════════════════════════════════════════════════════════════════
  //  C3·char_updates 敏感字段来源判据 + 万能键(anyPathChanges)禁区
  // ══════════════════════════════════════════════════════════════════
  console.log('===== C3·char_updates 敏感字段来源判据 + 万能键禁区 =====');
  // C3-neg·无源敏感字段(stance/fame)跳过+弱提示·非敏感字段(age)照常 merge
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '魏忠贤', alive: true, faction: '明朝廷', stance: '忠', fame: 50, age: 59, resources: {} }]);
    ctx.applyAITurnChanges({ char_updates: [{ name: '魏忠贤', updates: { stance: '奸佞', fame: 5, age: 60 } }] });
    const ch = findCh(ctx.GM, '魏忠贤');
    ok(ch.stance === '忠' && ch.fame === 50, 'C3-neg 无源敏感字段(stance/fame)→跳过不落库(原值不变)');
    ok(ch.age === 60, 'C3-neg 非敏感字段(age)→照常 merge(其余字段不受影响)');
    ok(hintNames(ctx.GM).indexOf('魏忠贤') >= 0, 'C3-neg 拒写降级→弱自查纸条留痕');
  }
  // C3-pos·玩家诏令点名(有源)→敏感字段照常落·无弱提示
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '魏忠贤', alive: true, faction: '明朝廷', stance: '忠', resources: {} }],
      { _playerDirectives: [{ id: 'd1', content: '魏忠贤结党营私，着夺其清誉' }] });
    ctx.applyAITurnChanges({ char_updates: [{ name: '魏忠贤', updates: { stance: '奸佞' } }] });
    ok(findCh(ctx.GM, '魏忠贤').stance === '奸佞', 'C3-pos(诏令) 玩家诏令点名=有源→敏感字段照常落');
    ok(hintCount(ctx.GM) === 0, 'C3-pos(诏令) 放行→零弱提示(不误杀)');
  }
  // C3-pos·本回合弹劾奏疏点名(输入面·有源)→敏感字段照常落
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '魏忠贤', alive: true, faction: '明朝廷', fame: 80, resources: {} }],
      { memorials: [{ from: '御史', text: '劾魏忠贤欺君罔上、党同伐异' }] });
    ctx.applyAITurnChanges({ char_updates: [{ name: '魏忠贤', updates: { fame: 10 } }] });
    ok(findCh(ctx.GM, '魏忠贤').fame === 10, 'C3-pos(弹劾) 本回合弹劾输入点名=有源→敏感字段照常落');
    ok(hintCount(ctx.GM) === 0, 'C3-pos(弹劾) 放行→零弱提示');
  }
  // C3-backdoor·万能键 anyPathChanges 改敏感字段→禁区拦(不落库)
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '魏忠贤', alive: true, faction: '明朝廷', stance: '忠', resources: {} }]);
    ctx.applyAITurnChanges({ anyPathChanges: [{ path: 'chars.魏忠贤.stance', op: 'set', value: '奸佞' }] });
    ok(findCh(ctx.GM, '魏忠贤').stance === '忠', 'C3-backdoor anyPathChanges 改敏感字段→_isPathBlocked 禁区拦(不落库·不绕闸)');
  }

  console.log('');
  console.log('[smoke-write-gate-expansion] ' + passed + ' passed / ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
