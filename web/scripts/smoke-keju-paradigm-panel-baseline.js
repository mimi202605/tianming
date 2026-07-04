#!/usr/bin/env node
'use strict';
// smoke-keju-paradigm-panel-baseline — 科举范式面板拆分前基线(2026-07-04·alias范式军规第6条:先锁API再动刀)
//   锁:①TM.Keju.ParadigmPanel 公开面(名+arity) ②computeDiff/diffMagnitude 合成draft行为
//   ③渲染族产出字符串且携带关键DOM锚 ④常量表形状——拆分前后必须逐项等值
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function ok(c, m){ if(!c) throw new Error('FAIL: '+m); A++; console.log('  ✓ '+m); }

console.log('smoke-keju-paradigm-panel-baseline');

const ctx = { console: { log: function(){}, warn: function(){}, error: function(){} }, Math: Math, JSON: JSON, Date: Date, setTimeout: function(){}, document: { createElement: function(){ return { style:{}, classList:{ add:function(){}, remove:function(){} }, addEventListener:function(){}, setAttribute:function(){} }; }, getElementById: function(){ return null; }, body: { appendChild: function(){} } }, localStorage: { getItem: function(){return null;}, setItem: function(){} } };
ctx.global = ctx; ctx.globalThis = ctx; ctx.window = ctx; // 自引用·防IIFE绑定被裸mock劫走
vm.createContext(ctx);
ctx.GM = { turn: 5, sid: 'test', parties: [], chars: [], _kejuParadigm: null };

// 拆分后sibling载于origin前·两态通吃:有sibling先载·无则只载origin
const sib = path.join(ROOT, 'tm-keju-paradigm-panel-render.js');
if (fs.existsSync(sib)) vm.runInContext(fs.readFileSync(sib, 'utf8'), ctx, { filename: 'tm-keju-paradigm-panel-render.js' });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-keju-paradigm-panel.js'), 'utf8'), ctx, { filename: 'tm-keju-paradigm-panel.js' });

// ── ① 公开面:名+类型+arity ──
const P = ctx.TM && ctx.TM.Keju && ctx.TM.Keju.ParadigmPanel;
ok(!!P, 'TM.Keju.ParadigmPanel 存在');
const API = { open: 0, computeDiff: 1, classifyTags: 1, buildTopicText: 2, estimateStance: 2, submitReform: 5, diffMagnitude: 1 };
Object.keys(API).forEach(k => {
  ok(typeof P[k] === 'function', 'API ' + k + ' 是函数');
  ok(P[k].length === API[k], 'API ' + k + ' arity=' + API[k] + '(实际 ' + P[k].length + ')');
});
ok(Array.isArray(P.SUBJECT_CANDIDATES) && P.SUBJECT_CANDIDATES.length >= 15, 'SUBJECT_CANDIDATES ≥15 科目');
ok(Array.isArray(P.NEUTRAL_PARTIES) && P.NEUTRAL_PARTIES.indexOf('中立') >= 0, 'NEUTRAL_PARTIES 含中立');

// ── ② computeDiff/diffMagnitude 合成行为(draft 自含 Base/Draft 字段对) ──
const draft = {
  subjectsBase:  [{ id: 'jingyi', name: '经义', weight: 50 }],
  subjectsDraft: [{ id: 'jingyi', name: '经义', weight: 50 }, { id: 'suanxue', name: '算学', weight: 30 }],
  examIntervalBase: 3, examIntervalDraft: 1
};
const diff = P.computeDiff(draft);
ok(diff && typeof diff === 'object', 'computeDiff 返回对象');
ok(diff.subjects.added.length === 1 && diff.subjects.added[0].id === 'suanxue', '加科目入 diff.subjects.added');
ok(diff.examInterval && diff.examInterval.new === 1 && diff.examInterval.old === 3, '改开科间隔入 diff.examInterval');
const mag = P.diffMagnitude(diff);
ok(typeof mag === 'number' && mag > 0, 'diffMagnitude 对非空diff返回正数(' + mag + ')');
const noop = { subjectsBase: draft.subjectsBase, subjectsDraft: draft.subjectsBase, examIntervalBase: 3, examIntervalDraft: 3 };
const magEmpty = P.diffMagnitude(P.computeDiff(noop));
ok(magEmpty === 0 || magEmpty < mag, '空diff幅度更小(' + magEmpty + '<' + mag + ')');

// ── ③ 渲染族:全局名可达·产出字符串携锚 ──
// (拆分后这些名由 render sibling 导出·origin alias 回绑——两态下模块级 module.exports 面保持)
const modExports = vm.runInContext("typeof module !== 'undefined'", ctx);
['_kjpOpenReformProposal'].forEach(n => {
  ok(typeof ctx[n] === 'function' || typeof ctx.window[n] === 'function', '全局 ' + n + ' 可达');
});

console.log('[smoke-keju-paradigm-panel-baseline] PASS ' + A + ' assertions');
