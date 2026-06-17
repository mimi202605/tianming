#!/usr/bin/env node
// smoke-endturn-apply-fields.js — Phase 7 P7-β baseline·5/21
// 锁 §4 sc1 写回·7 字段族 (chars/factions/offices/fiscal/admin/events/harem)
// 拆分 P7-ε 时·写回逻辑迁入 tm-endturn-apply.js·所有字段族 marker / 调用 必保

'use strict';

const { readSource, makeAssert } = require('./smoke-endturn-baseline-helpers');

const passed = { value: 0 };
const assert = makeAssert(passed);

const src = readSource();

// ─── §4 marker 存在 ───
assert(/§4\s*sc1\s*写回/.test(src), '§4 sc1 写回 marker');
assert(/TM\.Endturn\.AI\.apply\.writeBack\s*\(ctx\)/.test(src), 'P7-epsilon bridge calls TM.Endturn.AI.apply.writeBack(ctx)');
assert(/ns\.writeBack\s*=\s*async\s+function\s*\(ctx\)/.test(src), 'tm-endturn-apply.js exposes writeBack(ctx)');
assert(/applyAITurnChanges/.test(src), 'applyAITurnChanges main 写回 fn');

// ─── 7 字段族 in sc1 schema (LLM 必读这 7 个 字段) ───
[
  'char_updates',
  'factions',
  'offices',
  'fiscal',
  'admin',
  'events',
  'harem'
].forEach(function(field) {
  // sc1 prompt 中应教 AI 这些字段·或写回逻辑应处理
  // 至少应在 prompt 段或 写回段出现
  assert(src.indexOf(field) >= 0,
    '§4 字段族·"' + field + '" (sc1 schema 或 写回逻辑)');
});

// ─── char_updates 详·人物字段写回 ───
[
  'char_updates',
  'lifecycle',                 // life-cycle field merge·R200 era
  'personnelChanges',          // 人事变动·return record 字段
].forEach(function(token) {
  assert(src.indexOf(token) >= 0, 'char_updates·"' + token + '"');
});

// ─── factions·势力 ───
[
  'factions',
  'factionsAffected'
].forEach(function(token) {
  assert(src.indexOf(token) >= 0, 'factions·"' + token + '"');
});

// ─── offices·官制·任免 ───
[
  'offices',
  'appointments',              // sc1 ai 字段
].forEach(function(token) {
  assert(src.indexOf(token) >= 0, 'offices·"' + token + '"');
});

// ─── fiscal·财政 (R10 redistribute 后·走 TM.Fiscal.cascade / FiscalEngine) ───
[
  'fiscal',
  'currentEffects',            // 诏令实际效果·写入 fiscal/admin 用
].forEach(function(token) {
  assert(src.indexOf(token) >= 0, 'fiscal·"' + token + '"');
});

// ─── admin·行政 ───
assert(src.indexOf('admin') >= 0, 'admin field·写回');

// ─── events·事件 ───
assert(src.indexOf('events') >= 0, 'events·field name');

// ─── harem·后宫 ───
assert(src.indexOf('harem') >= 0, 'harem field·写回');

// ─── _hardConstraints·跨 phase string·§3 produce·§4 read ───
assert(src.indexOf('_hardConstraints') >= 0,
  '_hardConstraints·§3 produce·§4 apply read·跨 phase 字符串');

// ─── _changeSummary·§5 collect ───
assert(src.indexOf('_changeSummary') >= 0,
  '_changeSummary·§5 收集·return record 用');

// ─── return shape·5 字段 (record finalize 锚) ───
[
  'shiluText',
  'szjTitle',
  'szjSummary',
  'personnelChanges',
  'hourenXishuo'
].forEach(function(field) {
  assert(src.indexOf(field) >= 0, 'return shape·"' + field + '" (record finalize)');
});

console.log('[smoke-endturn-apply-fields] pass assertions=' + passed.value);
