#!/usr/bin/env node
// smoke-endturn-subcall-registry.js — Phase 7 P7-β baseline·2/21
// **关键 drift guard**·锁 sub-call registration table·拆分时 API call structure 必保
// 17 个 sub-call·exact id / name / minDepth / order
//
// Codex 5Q-A1·"subcall registration/call-order drift guard·refactor 不可改 API call structure"

'use strict';

const { readSource, makeAssert } = require('./smoke-endturn-baseline-helpers');

const passed = { value: 0 };
const assert = makeAssert(passed);

const src = readSource();

// ─── Test 1·registry table 整段存在 ───
const REGISTRY_RE = /\{id:'sc0',\s*name:'AI深度思考'[\s\S]+?\{id:'sc28',\s*name:'世界快照'/;
assert(REGISTRY_RE.test(src),
  'subcall registry table 完整·从 sc0 (AI深度思考) 到 sc28 (世界快照)');

// ─── Test 2·17 sub-call 各 entry·exact match ───
// 锁定·任何拆分都不能静默改名 / 改 order / 改 minDepth
const REGISTRY_LOCK = [
  { id: 'sc0',           name: 'AI深度思考',         minDepth: 'standard', order: 0 },
  { id: 'sc1q',          name: '对话承诺推演',       minDepth: 'lite',     order: 2 },
  { id: 'sc05',          name: '记忆回顾',           minDepth: 'standard', order: 5 },
  { id: 'sc1',           name: '结构化数据',         minDepth: 'lite',     order: 100 },
  { id: 'sc1b',          name: '文事鸿雁人际',       minDepth: 'lite',     order: 110 },
  { id: 'sc1c',          name: '势力外交·NPC阴谋',   minDepth: 'lite',     order: 120 },
  { id: 'sc1d',          name: '实录时政',           minDepth: 'lite',     order: 130 },
  { id: 'sc15n',         name: 'NPC合成·3tier',      minDepth: 'lite',     order: 148 },
  { id: 'sc15',          name: 'NPC深度',            minDepth: 'standard', order: 150 },
  { id: 'sc_memwrite',   name: 'NPC记忆回写',        minDepth: 'lite',     order: 155 },
  { id: 'sc16',          name: '势力推演',           minDepth: 'full',     order: 160 },
  { id: 'sc17',          name: '经济财政',           minDepth: 'full',     order: 170 },
  { id: 'sc18',          name: '军事态势',           minDepth: 'full',     order: 180 },
  { id: 'sc_audit',      name: '数据一致性审核',     minDepth: 'lite',     order: 185 },
  { id: 'sc2',           name: '叙事正文',           minDepth: 'lite',     order: 200 },
  { id: 'sc2_outline',   name: '叙事大纲',           minDepth: 'lite',     order: 202 },
  { id: 'sc27_review',   name: '大纲审查',           minDepth: 'standard', order: 204 },
  { id: 'sc2_prose',     name: '叙事成文',           minDepth: 'lite',     order: 206 },
  { id: 'sc25c',         name: '记忆合成·双调用',    minDepth: 'lite',     order: 245 },
  { id: 'sc25',          name: '伏笔记忆',           minDepth: 'lite',     order: 250 },
  { id: 'sc27',          name: '叙事审查',           minDepth: 'standard', order: 270 },
  { id: 'sc07',          name: 'NPC认知整合',        minDepth: 'lite',     order: 275 },
  { id: 'sc28',          name: '世界快照',           minDepth: 'full',     order: 280 }
];

REGISTRY_LOCK.forEach(function(entry) {
  // exact pattern·{id:'X', name:'Y', minDepth:'Z', order:N}
  // 容 spaces·但 id / name / minDepth / order 必 exact
  const escId = entry.id.replace(/[._]/g, function(c) { return '\\' + c; });
  const escName = entry.name.replace(/[·.]/g, function(c) { return '\\' + c; });
  const re = new RegExp(
    "\\{\\s*id:\\s*'" + entry.id.replace(/[._]/g, '\\$&') + "'\\s*,\\s*" +
    "name:\\s*'" + entry.name.replace(/[·.]/g, '\\$&') + "'\\s*,\\s*" +
    "minDepth:\\s*'" + entry.minDepth + "'\\s*,\\s*" +
    "order:\\s*" + entry.order + "\\s*\\}"
  );
  assert(re.test(src),
    'sub-call entry locked·{id:' + entry.id + ', name:' + entry.name + ', minDepth:' + entry.minDepth + ', order:' + entry.order + '}');
});

// ─── Test 3·exact 23·count·Phase 5 加 sc2_outline + sc27_review + sc2_prose 后 20→23 ───
const ENTRY_COUNT_RE = /\{\s*id:\s*'sc[0-9a-z_]+'\s*,\s*name:\s*'[^']+'\s*,\s*minDepth:/g;
const matches = src.match(ENTRY_COUNT_RE);
assert(matches !== null && matches.length === 23,
  'sub-call registry exact 23 entries·count=' + (matches ? matches.length : 0));

// ─── Test 4·order monotonic increasing (sub-call sequence integrity) ───
const orders = REGISTRY_LOCK.map(function(e) { return e.order; });
for (let i = 1; i < orders.length; i++) {
  assert(orders[i] > orders[i - 1],
    'order monotonic·' + REGISTRY_LOCK[i-1].id + '(' + orders[i-1] + ') < ' + REGISTRY_LOCK[i].id + '(' + orders[i] + ')');
}

// ─── Test 5·minDepth 值域·只许 'lite' / 'standard' / 'full' ───
REGISTRY_LOCK.forEach(function(entry) {
  assert(['lite', 'standard', 'full'].indexOf(entry.minDepth) >= 0,
    entry.id + ' minDepth in {lite,standard,full}');
});

// ─── Test 6·7 main pipeline + 13 followup·Phase 4 加 sc25c (245)·sc15n (148) ───
// main = sc0/sc1q/sc05/sc1/sc1b/sc1c/sc1d (order 0-130·7 个)
// followup = sc15n+ (order 148+·13 个·incl sc25c 在 sc25 之前·sc07 order 275 是 lite·混入但属 followup 后期)
const mainSubcalls = REGISTRY_LOCK.filter(function(e) { return e.order <= 130; });
const followupSubcalls = REGISTRY_LOCK.filter(function(e) { return e.order >= 148; });
assert(mainSubcalls.length === 7,
  'main 7 subcalls·sc0/sc1q/sc05/sc1/sc1b/sc1c/sc1d·count=' + mainSubcalls.length);
assert(followupSubcalls.length === 16,
  'followup 16 subcalls·sc15n/sc15/sc_memwrite/sc16/sc17/sc18/sc_audit/sc2/sc2_outline/sc27_review/sc2_prose/sc25c/sc25/sc27/sc07/sc28·count=' + followupSubcalls.length);
assert(mainSubcalls.length + followupSubcalls.length === 23,
  'main 7 + followup 16 = 23·全覆盖');

console.log('[smoke-endturn-subcall-registry] pass assertions=' + passed.value);
