#!/usr/bin/env node
// smoke-sc1-family-refactor.js — Phase 2·SC1 family 重构 (Slice 1-5) 锚
// 用·锁定 Slice 1 sysP 硬约束 / Slice 2-4 schema 拆分 prune / Slice 5 SC1d 解耦 不被回退

'use strict';

const fs = require('fs');
const path = require('path');
const { readSource, makeAssert } = require('./smoke-endturn-baseline-helpers');

const ROOT = path.resolve(__dirname, '..');
const passed = { value: 0 };
const assert = makeAssert(passed);

const src = readSource();
const composerSrc = fs.readFileSync(path.join(ROOT, 'tm-prompt-composer.js'), 'utf8');
const promptSrc = fs.readFileSync(path.join(ROOT, 'tm-endturn-prompt.js'), 'utf8');

// ─── Slice 1·硬约束抽到 sysP ───
assert(/function\s+buildHardConstraints\s*\(/.test(composerSrc),
  'Slice 1·tm-prompt-composer.js exports buildHardConstraints()');
assert(/全管线硬约束/.test(composerSrc),
  'Slice 1·buildHardConstraints contains "全管线硬约束" label');
assert(/PromptComposer\.buildHardConstraints/.test(promptSrc),
  'Slice 1·tm-endturn-prompt.js injects buildHardConstraints into sysP');
assert(/_version:\s*'v[89]'/.test(composerSrc),
  'Slice 1·PromptComposer version v8+ (Phase 7 wall-clock 后到 v9)');

// ─── Slice 2/3/4·SC1 schema prune (sc1b/sc1c-domain) ───
assert(/Phase 2 Slice 2\+3\+4/.test(src),
  'Slice 2+3+4·SC1 schema prune block present');
assert(/sc1OwnedBySc1b/.test(src),
  'Slice 3·P.ai.sc1OwnedBySc1b flag (default true·rollback hook)');
assert(/sc1OwnedBySc1c/.test(src),
  'Slice 4·P.ai.sc1OwnedBySc1c flag (default true·rollback hook)');

// sc1b-domain 4 fields
['npc_interactions', 'cultural_works', 'npc_letters', 'npc_correspondence'].forEach(function(f) {
  assert(src.indexOf("'" + f + "'") >= 0,
    'Slice 3·sc1b-domain field "' + f + '" in prune list');
});
// sc1c-domain 5 fields
['faction_events', 'npc_schemes', 'hidden_moves', 'faction_interactions_advanced', 'fengwen_snippets'].forEach(function(f) {
  assert(src.indexOf("'" + f + "'") >= 0,
    'Slice 4·sc1c-domain field "' + f + '" in prune list');
});
assert(/字段边界·重要/.test(src),
  'Slice 3/4·SC1 explicit boundary note appended to tp1');

// ─── Slice 5·SC1d 解耦 ───
assert(/Phase 2 Slice 5·SC1d 全面解耦/.test(src),
  'Slice 5·SC1d supplement block from edicts/GM');
assert(/_edictsSupplemented/.test(src),
  'Slice 5·_edictsSupplemented flag for diagnostic');
// Phase 0 Q3 fallback (p1 missing) 必须保留
assert(/_sc1dSeedFallback/.test(src),
  'Phase 0 Q3 still alive·_sc1dSeedFallback (p1=null fallback)');

// ─── concat 路径仍存在·确保 apply 仍能拿到 sc1b/sc1c 输出 ───
assert(/p1b\.cultural_works/.test(src) && /p1b\.npc_letters/.test(src),
  'sc1b concat path L2914-2917 still alive (cultural_works/npc_letters)');
assert(/p1c\.faction_events/.test(src) && /p1c\.faction_interactions_advanced/.test(src),
  'sc1c concat path L3285+ still alive (faction_events/faction_interactions_advanced)');

// ─── _hardConstraints 在 sc1 仍保留动态死亡名单 ───
assert(/_deadList/.test(src) && /_fakeList/.test(src),
  'Slice 1·SC1 _hardConstraints 仍保留动态死亡/诈死名单');

console.log('[smoke-sc1-family-refactor] pass assertions=' + passed.value);
