#!/usr/bin/env node
// smoke-phase4-memory-merge.js — Phase 4·记忆层合并 锚
// 用·锁 Slice 1 基建·Slice 2/3 mirror API surface·Slice 4 sc28→sc1 注入

'use strict';

const fs = require('fs');
const path = require('path');
const { readSource, makeAssert } = require('./smoke-endturn-baseline-helpers');

const ROOT = path.resolve(__dirname, '..');
const passed = { value: 0 };
const assert = makeAssert(passed);

const src = readSource();
const followupSrc = fs.readFileSync(path.join(ROOT, 'tm-endturn-followup.js'), 'utf8');
const saveLifecycleSrc = fs.readFileSync(path.join(ROOT, 'tm-save-lifecycle.js'), 'utf8');
const postTurnJobsSrc = fs.readFileSync(path.join(ROOT, 'tm-post-turn-jobs.js'), 'utf8');

// ─── Slice 1·基建 ───
assert(/GM\._lastSc28Snapshot\s*=\s*null/.test(saveLifecycleSrc),
  'Slice 1·_lastSc28Snapshot ensureGMDefaults');
assert(/GM\._costHistory\s*=\s*\[\]/.test(saveLifecycleSrc),
  'Slice 1·_costHistory ensureGMDefaults (Phase 7 prep)');
assert(/sc25c:\s*true/.test(postTurnJobsSrc),
  'Slice 1·_POST_TURN_NEXT_REQUIRED_IDS·sc25→sc25c (sc25 兼容保留)');

// ─── Slice 4·sc28→sc1 注入 ───
assert(/Phase 4·sc28 snapshot 注入 sc1 prompt 头部/.test(src),
  'Slice 4·sc28 snapshot 注入 sc1 prompt 头部');
assert(/_sc28Inject \+ _stateBoard \+/.test(src),
  'Slice 4·_sc28Inject 在 tp1 build 第一位 (G1 schema 精简优先保留)');
assert(/GM\._lastSc28Snapshot\.turn\s*===\s*\(GM\.turn\s*\|\|\s*1\)\s*-\s*1/.test(src),
  'Slice 4·只注入上回合 snapshot·避免跨回合污染');
assert(/turn:\s*_ptTurn28[\s\S]{0,200}world_snapshot:\s*p28\.world_snapshot/.test(followupSrc),
  'Slice 4·sc28 result mirror 写入 GM._lastSc28Snapshot');

// ─── Slice 2·sc25c API surface mirror (foreshadow + state_board) ───
assert(/subcall25c\s*=\s*GM\._turnAiResults\.subcall25c\s*\|\|/.test(followupSrc),
  'Slice 2·sc25c API surface 初始化');
assert(/subcall25c\.foreshadow\s*=\s*p25/.test(followupSrc),
  'Slice 2·sc25c.foreshadow ← sc25 result');
assert(/subcall25c\.memory\s*=\s*_consPayload/.test(followupSrc),
  'Slice 2·sc25c.memory ← sc_consolidate result');
assert(/_mirrorOnly:\s*true/.test(followupSrc),
  'Slice 2·_mirrorOnly flag·标记暂未真正合并');

// ─── Slice 3·sc15n API surface mirror (3-tier) ───
assert(/subcall15n\s*=\s*GM\._turnAiResults\.subcall15n\s*\|\|/.test(followupSrc),
  'Slice 3·sc15n API surface 初始化');
assert(/subcall15n\.core\s*=/.test(followupSrc) && /subcall15n\.common\s*=/.test(followupSrc) && /subcall15n\.extended\s*=/.test(followupSrc),
  'Slice 3·sc15n 3-tier (core/common/extended)');

// ─── D·sc25c 真双调用 ───
assert(/Phase 4 A5·sc25 \+ sc_consolidate 双调用合一/.test(followupSrc),
  'D·sc25c dual-call entry registered');
assert(/sc25cEnabled\s*=\s*!\(P\.ai\s*&&\s*P\.ai\.sc25cEnabled\s*===\s*false\)/.test(followupSrc),
  'D·sc25c default enabled·P.ai.sc25cEnabled=false 回滚');
assert(/_queuePostTurnSubcall\('sc25c'/.test(followupSrc),
  'D·sc25c queued in post-turn');
assert(/Promise\.allSettled\(\[_callT,\s*_callS\]\)/.test(followupSrc),
  'D·sc25c tactical+strategic Promise.allSettled');
assert(/sc25c·tactical/.test(followupSrc) && /sc25c·strategic/.test(followupSrc),
  'D·两个 LLM call 各自 label');
assert(/sc25c 接管/.test(followupSrc),
  'D·旧 sc25 + sc_consolidate skip 标记');

// ─── E·sc15n 真 3-tier ───
assert(/Phase 4 A6·sc15n 3-tier 合一/.test(followupSrc),
  'E·sc15n 3-tier merged entry');
assert(/sc15nEnabled\s*=\s*!!\(P\.ai\s*&&\s*P\.ai\.sc15nEnabled\s*===\s*true\)/.test(followupSrc),
  'E·sc15n default off (true 才开)·P.ai.sc15nEnabled=true 启用');
assert(/_runSubcall\('sc15n'/.test(followupSrc),
  'E·sc15n subcall 注册');
assert(/sc15n 接管/.test(followupSrc),
  'E·sc07 / sc15 skip when sc15n enabled');
assert(/_fromSc15n/.test(followupSrc),
  'E·_factionUndercurrents / _npcCognition mirror 标记');

console.log('[smoke-phase4-memory-merge] pass assertions=' + passed.value);
