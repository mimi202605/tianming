#!/usr/bin/env node
'use strict';
/* smoke-narr-3stage-repair — 叙事三件套 3stage 管线修坏账 (2026-07-02)
 * 背景：3stage 成功时原代码 `return` 直接退出 _runBranchC——连带跳过其后 sc25c/sc25
 *   (记忆合成·伏笔)的排队(sc28 默认折叠进 sc25c·一并死)·且对话历史/建议/subcall2_raw 全缺。
 * 本刀：①return→_threeStageDone 标志位(只跳 legacy sc2 与 sc27·记忆管线照常)
 *   ②补齐 legacy 收尾职责:conv 推正文(同截断策略)/建议兜底(_ensureSc2Suggestions 共享)/subcall2_raw。
 */
const fs = require('fs');
const path = require('path');
const W = path.join(__dirname, '..');

let A = 0, F = 0;
function ok(cond, msg) { if (cond) { A++; console.log('  ✓ ' + msg); } else { F++; console.log('  ✗ ' + msg); } }

const src = fs.readFileSync(path.join(W, 'tm-endturn-followup.js'), 'utf8');

// ① 旧 bug 写法已不存：裸 return 退出 _runBranchC
ok(src.indexOf('return;  // skip legacy sc2 + sc27 below') < 0, '① 旧裸 return(跳过整个 BranchC 余下管线)已删');
ok(/var _threeStageDone = false;/.test(src), '① _threeStageDone 标志位已声明');
ok(/_threeStageDone = true;/.test(src), '① 成功路径置 _threeStageDone=true');
ok(/if \(!_threeStageDone\) await _runLegacySc2\(\);/.test(src), '① legacy sc2 由标志位门控(而非 return 跳过)');

// ② 记忆管线不再被跳：legacy 调用点之后 sc25c/sc25 排队仍无条件可达
const _legacyCallIdx = src.indexOf('if (!_threeStageDone) await _runLegacySc2();');
const _sc25cIdx = src.indexOf("_queuePostTurnSubcall('sc25c'");
const _sc25Idx = src.indexOf("_queuePostTurnSubcall('sc25'");
ok(_legacyCallIdx > 0 && _sc25cIdx > _legacyCallIdx, '② sc25c 排队在 legacy 门控之后·仍可达');
ok(_sc25Idx > _legacyCallIdx, '② sc25 排队仍可达');
const _between = src.slice(_legacyCallIdx, _sc25cIdx);
ok(!/if \(_threeStageDone\) return/.test(_between) && _between.indexOf('return;') < 0, '② legacy→sc25c 之间无新增提前 return');

// ③ 3stage 成功路径补齐 legacy 收尾职责
ok(/GM\.conv\.push\(\{ role: 'assistant', content: _cc3 \}\)/.test(src), '③ 正文入对话历史(后续回合 AI 记得本回合故事)');
ok(/GM\._turnAiResults\.subcall2\.suggestions = _ensureSc2Suggestions\(/.test(src), '③ 建议兜底接入 3stage 成功路径');
ok(/GM\._turnAiResults\.subcall2_raw = _pCall\.raw \|\| ''/.test(src), '③ subcall2_raw 镜像(诊断/agent 工具读)');
ok(/_skipped: 'threeStageAlreadyReviewed'/.test(src), '③ 旧 sc27 在 3stage 路径显式跳过(与原意一致)');

// ④ legacy 建议兜底改用共享 helper(语义不变)
ok(/p2\.suggestions = _ensureSc2Suggestions\(p2\.suggestions\);/.test(src), '④ legacy 建议兜底走共享 helper');

// ⑤ 行为：抽真 _ensureSc2Suggestions 跑
function extractFn(anchor) {
  const st = src.indexOf(anchor);
  if (st < 0) return null;
  let depth = 0, end = -1;
  for (let i = src.indexOf('{', st); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  return end > st ? src.slice(st, end) : null;
}
const fnSrc = extractFn('var _ensureSc2Suggestions = function(sugg) {');
ok(!!fnSrc, '⑤ _ensureSc2Suggestions 闭包提取');
const mkFn = new Function('GM', 'random', 'return (' + fnSrc.replace('var _ensureSc2Suggestions = ', '') + ')');

// 5a: ≥2 条建议原样返回（引用恒等=legacy 不触碰语义）
let fn = mkFn({ eraState: {}, _tyrantDecadence: 0 }, function(){ return 0; });
const twoSugg = ['甲', '乙'];
ok(fn(twoSugg) === twoSugg, '⑤ ≥2 条 → 原样返回(引用恒等·与 legacy 语义一致)');

// 5b: 空 → 兜底 2-4 条
const filled = fn(null);
ok(Array.isArray(filled) && filled.length >= 2 && filled.length <= 4, '⑤ 空 → 兜底 ' + filled.length + ' 条(2-4)');

// 5c: 荒淫值高 → 混入佞臣建议
fn = mkFn({ eraState: {}, _tyrantDecadence: 30 }, function(){ return 0; });
const decadent = fn([]);
ok(decadent.some(function(s){ return /宴饮群臣/.test(s); }), '⑤ 荒淫>25 → 混入佞臣"好建议"(random=0 → 首条宴饮)');

// 5d: 军备松弛 → 边防建议
fn = mkFn({ eraState: { militaryProfessionalism: 0.2 }, _tyrantDecadence: 0 }, function(){ return 0; });
ok(fn([]).some(function(s){ return /操练兵马/.test(s); }), '⑤ 军备松弛 → 边防建议进兜底');

console.log('\n' + (F === 0 ? 'ALL PASS' : 'FAIL') + ' (' + A + ' pass / ' + F + ' fail)');
process.exit(F === 0 ? 0 : 1);
