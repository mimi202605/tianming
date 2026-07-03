#!/usr/bin/env node
// scripts/smoke-memwrite-continuation.js
// 2026-07-03·方向B加强·sc_memwrite 截断续写——繁忙回合输出被 length 截断→后半 memory_writes 丢失·
//   检测截断且已录入部分→补一次续写(告知已录入者·去重·只补未录入的)。本测复制 _applyMwList 去重 + 触发条件。
// 2026-07-03 Codex 审后·加固:首轮不因 covered 拦截(同角色多件不同事件全录·不吞)·仅续写阶段(skipCovered)按角色去重。

'use strict';
let passed = 0, failed = 0;
function assert(cond, msg){ if(cond) passed++; else { failed++; console.error('  ✗ '+msg); } }

// ── mock NpcMemorySystem ──
let remembered;
const NpcMemorySystem = { remember: function(char, event){ remembered.push({ char, event }); } };
function _dbg(){}

// ── 复制自 tm-endturn-followup.js _applyMwList (skipCovered:仅续写传 true 拦截已录角色) ──
function _applyMwList(list, covered, skipCovered) {
  if (!Array.isArray(list) || typeof NpcMemorySystem === 'undefined' || !NpcMemorySystem.remember) return 0;
  var n = 0;
  list.forEach(function(mw) {
    if (!mw || !mw.char || !mw.event) return;
    if (skipCovered && covered && covered[mw.char]) return;  // 仅续写阶段拦截已录角色
    try {
      NpcMemorySystem.remember(mw.char, mw.event, mw.emotion || '平', mw.importance || 5, mw.relatedPerson || '', {});
      if (covered) covered[mw.char] = 1;
      n++;
    } catch(_amwE) {}
  });
  return n;
}
// ── 复制自续写触发条件 ──
function shouldContinue(finishReason, coveredCount) {
  return (finishReason === 'length' || finishReason === 'max_tokens') && coveredCount > 0;
}

console.log('===== _applyMwList·首轮应用 + 记 covered =====');
remembered = [];
var covered = {};
var n1 = _applyMwList([{ char: '甲', event: 'e1' }, { char: '乙', event: 'e2' }, { char: '丙', event: 'e3' }], covered);
assert(n1 === 3 && remembered.length === 3, '首轮应用3条 (得 ' + n1 + ')');
assert(covered['甲'] && covered['乙'] && covered['丙'], 'covered 记录已录入者');

console.log('===== ★首轮·同一角色多件不同事件全录(不因 covered 吞) =====');
remembered = [];
var covered2 = {};
var nMulti = _applyMwList([{ char: '甲', event: '甲被弹劾' }, { char: '甲', event: '甲获赏' }, { char: '乙', event: '乙升迁' }], covered2);
assert(nMulti === 3 && remembered.length === 3, '首轮甲的两件不同事件都录+乙 (得 ' + nMulti + ')');
assert(remembered.filter(function(r){ return r.char === '甲'; }).length === 2, '甲两条不同事件均在(修 Codex 指出的首轮吞后续事件)');

console.log('===== ★续写去重(skipCovered=true)·已录入角色跳过·只补新的 =====');
var n2 = _applyMwList([{ char: '甲', event: '重复(应跳)' }, { char: '丁', event: 'e4' }, { char: '戊', event: 'e5' }], covered, true);
assert(n2 === 2, '续写只补2条新的(甲重复跳过) (得 ' + n2 + ')');
assert(!remembered.some(r => r.event === '重复(应跳)'), '已录入的甲不重复写');
assert(remembered.some(r => r.char === '丁') && remembered.some(r => r.char === '戊'), '新的丁/戊补上');
assert(covered['丁'] && covered['戊'], 'covered 累积更新');

console.log('===== 续写·不传 skipCovered 时不拦截(仅续写显式 true 才去重) =====');
remembered = [];
var covered3 = { 甲: 1 };
assert(_applyMwList([{ char: '甲', event: '首轮语义应录' }], covered3) === 1, '首轮语义(无 skipCovered)即使 covered 有甲也录');

console.log('===== _applyMwList·脏数据/无 remember 不崩 =====');
assert(_applyMwList([null, { char: '' }, { event: '无char' }, { char: '己' }], {}) === 0, '缺 char/event 的条目跳过·合法计数0(己无event)');
assert(_applyMwList('notarray', {}) === 0, '非数组→0');

console.log('===== ★续写触发条件 =====');
assert(shouldContinue('length', 3) === true, 'length 截断+已录入→触发续写');
assert(shouldContinue('max_tokens', 1) === true, 'max_tokens 截断+已录入→触发');
assert(shouldContinue('stop', 3) === false, '正常结束(stop)→不续写');
assert(shouldContinue('length', 0) === false, '截断但零录入→不续写(无可续之基·交兜底)');
assert(shouldContinue('', 5) === false, '无 finish_reason→不续写');

console.log('');
console.log(`[smoke-memwrite-continuation] ${passed} passed / ${failed} failed`);
if (failed > 0) process.exit(1);
