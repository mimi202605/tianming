#!/usr/bin/env node
// smoke-phase5-sc2-3stage.js — Phase 5·sc2 / sc27 三段合并 锚
// 用·锁 sc2_outline / sc27_review / sc2_prose 三段管线·opt-in via P.ai.sc2Pipeline='3stage'

'use strict';

const fs = require('fs');
const path = require('path');
const { readSource, makeAssert } = require('./smoke-endturn-baseline-helpers');

const ROOT = path.resolve(__dirname, '..');
const passed = { value: 0 };
const assert = makeAssert(passed);

const src = readSource();
const followupSrc = fs.readFileSync(path.join(ROOT, 'tm-endturn-followup.js'), 'utf8');

// ─── 三段管线 entry ───
assert(/P\.ai\.sc2Pipeline\s*===\s*'3stage'/.test(followupSrc),
  'P.ai.sc2Pipeline=3stage opt-in flag');
assert(/_runSubcall\('sc2_outline'/.test(followupSrc),
  'sc2_outline subcall 注册');
assert(/_runSubcall\('sc27_review'/.test(followupSrc),
  'sc27_review subcall 注册');
assert(/_runSubcall\('sc2_prose'/.test(followupSrc),
  'sc2_prose subcall 注册');

// ─── sc2_outline 输出 schema ───
['scenes', 'narrative_arc', 'character_features', 'time_period_markers'].forEach(function(k) {
  assert(followupSrc.indexOf('"' + k + '"') >= 0,
    'sc2_outline 输出·"' + k + '"');
});

// ─── sc27_review 输出 schema (新四字段·替代旧 rewritten_passages/added_details) ───
['anachronisms', 'name_errors', 'missing_beats', 'tone_guidance'].forEach(function(k) {
  assert(followupSrc.indexOf('"' + k + '"') >= 0,
    'sc27_review 输出·"' + k + '"');
});

// ─── sc2_prose 写 zhengwen + canonical subcall2 mirror ───
assert(/\bzhengwen\s*=\s*_pResult\.zhengwen/.test(followupSrc),
  'sc2_prose 写回 zhengwen');
assert(/_threeStage:\s*true/.test(followupSrc),
  'sc2 canonical mirror·subcall2 加 _threeStage 标记');
assert(/_sc2outline:\s*_sc2OutlineResult/.test(followupSrc),
  'subcall2 mirror 含 outline');
assert(/_sc27review:\s*_sc27ReviewResult/.test(followupSrc),
  'subcall2 mirror 含 review');

// ─── fallback·3stage 失败时跳到 legacy sc2 ───
assert(/3stage 失败·fallback to legacy sc2/.test(followupSrc),
  'Legacy fallback 路径标记');
assert(/3stage 成功·skip 旧 sc2 \+ sc27/.test(followupSrc),
  '3stage 成功时 return·skip 旧路径');

// ─── _subcallMeta registry ───
assert(/id:'sc2_outline'/.test(src) && /id:'sc27_review'/.test(src) && /id:'sc2_prose'/.test(src),
  '_subcallMeta·3 个新 entry');
assert(/sc2_outline:_p\(/.test(src) && /sc27_review:_p\(/.test(src) && /sc2_prose:_p\(/.test(src),
  'CALL_POLICIES·3 个新策略');

// ─── temp & 关键参数 ───
assert(/sc2_outline[\s\S]{0,2000}temperature:\s*0\.5/.test(followupSrc),
  'sc2_outline temp=0.5');
assert(/sc27_review[\s\S]{0,2000}temperature:\s*0\.3/.test(followupSrc),
  'sc27_review temp=0.3 (R-B 仅在确信时报告)');

console.log('[smoke-phase5-sc2-3stage] pass assertions=' + passed.value);
