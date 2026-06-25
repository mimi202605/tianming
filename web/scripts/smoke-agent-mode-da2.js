'use strict';
// smoke-agent-mode-da2.js — DA2·_turnReport(扁平 path)→ GM.turnChanges(Delta 面板桶)确定性映射
//   桶结构锚 tm-dynamic-systems.js:432 / render.js §6:characters/factions{name,changes:[{field,oldValue,newValue,reason}]}·variables{name,oldValue,newValue,delta}
const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');
const passed = { value: 0 };
const assert = makeAssert(passed);

require(path.join(ROOT, 'tm-ai-change-pathutils.js'));
require(path.join(ROOT, 'tm-endturn-record-specs.js'));
require(path.join(ROOT, 'tm-endturn-agent-read-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-write-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-depth-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-mode.js'));
const TM = globalThis.TM;
const AM = TM.Endturn.AgentMode;

function findEnt(arr, name) { return (arr || []).filter(function (e) { return e.name === name; })[0]; }

// ── ① 干净分类:chars(slash 任免 / dot 字段)·facs·核心变量·guoku 跳过·非 agent 跳过 ──
var gm = {
  turn: 3,
  chars: [{ name: '袁崇焕' }, { name: '魏忠贤' }],
  facs: [{ name: '后金' }],
  vars: { socialStability: { value: 50, max: 100 }, centralControl: { value: 60 } },
  turnChanges: {},
  _turnReport: [
    { type: 'change', path: 'chars/袁崇焕', old: '', new: '蓟辽督师', reason: '起复', _agent: true, _op: 'appoint' },
    { type: 'change', path: 'chars.1', reason: '夺职下狱', _agent: true, _op: 'dismiss' },
    { type: 'change', path: 'chars.0.loyalty', old: 70, new: 85, reason: '君恩', _agent: true, _op: 'set_field' },
    { type: 'change', path: 'facs.0.strength', old: 80, new: 88, reason: '绕道破塞', _agent: true, _op: 'adjust_field' },
    { type: 'change', path: 'socialStability', old: 50, new: 44, reason: '阉党余波', _agent: true, _op: 'adjust_field' },
    { type: 'change', path: 'guoku.money', old: 1000000, new: 920000, reason: '军饷', _agent: true, _op: 'treasury' },  // 结构化账·应跳过
    { type: 'change', path: 'centralControl', old: 60, new: 63, reason: '集权', _agent: false }  // 非 agent·应跳过
  ]
};
AM.mapReportToTurnChanges(gm);
var tc = gm.turnChanges;
var yc = findEnt(tc.characters, '袁崇焕');
assert(yc && yc.changes.some(function (c) { return c.field === 'officialTitle' && c.newValue === '蓟辽督师'; }), '① chars/<name> 任命 → characters 桶(officialTitle)');
assert(yc.changes.some(function (c) { return c.field === 'loyalty' && c.oldValue === 70 && c.newValue === 85; }), '① chars.<idx>.<field> → 同人合并(loyalty 70→85)');
var wc = findEnt(tc.characters, '魏忠贤');
assert(wc && wc.changes.some(function (c) { return c.newValue === '去职'; }), '① chars.<idx> 罢免(idx→name 解析)→ 去职');
var hj = findEnt(tc.factions, '后金');
assert(hj && hj.changes.some(function (c) { return c.field === 'strength' && c.newValue === 88; }), '① facs.<idx>.<field> → factions 桶(idx→name)');
assert(tc.variables.some(function (v) { return v.name === 'socialStability' && v.newValue === 44 && v.delta === -6; }), '① 核心变量(GM.vars 有)→ variables 桶(含 delta)');
assert(!tc.variables.some(function (v) { return /guoku/.test(v.name) || v.name === 'money'; }), '① guoku.* 结构化账 → 跳过(不污染 Delta)');
assert(!tc.variables.some(function (v) { return v.name === 'centralControl'; }), '① 非 _agent 条目 → 跳过');

// ── ② additive merge:不 clobber 引擎已填·变量 update-or-push 合并 ──
var gm2 = {
  turn: 3, chars: [{ name: '孙承宗' }], vars: { socialStability: { value: 50 } },
  turnChanges: { characters: [{ name: '引擎角色', changes: [{ field: 'stress', oldValue: 10, newValue: 20 }] }], variables: [{ name: 'socialStability', oldValue: 55, newValue: 50 }] },
  _turnReport: [
    { type: 'change', path: 'chars/孙承宗', old: '', new: '阁臣', reason: '入阁', _agent: true, _op: 'appoint' },
    { type: 'change', path: 'socialStability', old: 50, new: 47, reason: 'x', _agent: true, _op: 'adjust_field' }
  ]
};
AM.mapReportToTurnChanges(gm2);
assert(findEnt(gm2.turnChanges.characters, '引擎角色'), '② 引擎已填 characters 条目保留(不 clobber)');
assert(findEnt(gm2.turnChanges.characters, '孙承宗'), '② agent 条目 additive 追加');
var sv = gm2.turnChanges.variables.filter(function (v) { return v.name === 'socialStability'; });
assert(sv.length === 1 && sv[0].oldValue === 55 && sv[0].newValue === 47, '② variables 合并:引擎旧值55→agent 新值47(不重不丢)');

// ── ③ 空 _turnReport / null → 不崩 ──
var gm3 = { turn: 1, turnChanges: {}, _turnReport: [] };
AM.mapReportToTurnChanges(gm3);
assert(Array.isArray(gm3.turnChanges.characters) && gm3.turnChanges.characters.length === 0, '③ 空 _turnReport → 桶建好但空·不崩');
AM.mapReportToTurnChanges(null);   // gm 缺失提前返回·不崩
AM.mapReportToTurnChanges({ turn: 1 });   // 无 _turnReport 提前返回·不崩
assert(true, '③ null / 无 _turnReport → 安全 no-op 不崩');

console.log('[smoke-agent-mode-da2] pass assertions=' + passed.value);
