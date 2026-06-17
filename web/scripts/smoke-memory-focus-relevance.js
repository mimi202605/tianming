#!/usr/bin/env node
'use strict';
// F-focus 守护：compileFromGM 对"本回合焦点实体"相关的记忆做 relevance 加成（Gen-Agents 三因子之 relevance），
// 令 token 预算受限时优先注入与当下诏令/议题相关的记忆。纯文本/实体匹配·BYOK 友好·非 Codex 原静态打分。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const sandbox = { window: {}, console, Date, Math, JSON };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

[
  'tm-memory-evidence-registry.js',
  'tm-memory-issue-governance.js',
  'tm-memory-envelope.js',
  'tm-memory-controls.js',
  'tm-memory-retrieval.js',
  'tm-context-zones.js',
  'tm-memory-context-compiler.js'
].forEach((file) => vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file }));

const MR = sandbox.TM && sandbox.TM.MemoryRetrieval;
const MCC = sandbox.TM && sandbox.TM.MemoryContextCompiler;
assert(MR && typeof MR.turnFocusTerms === 'function', 'MemoryRetrieval.turnFocusTerms should exist');
assert(MR && typeof MR.applyFocusRelevance === 'function', 'MemoryRetrieval.applyFocusRelevance should exist');

// 本回合焦点：活法令提到「毕自严」，未提「孙传庭」
const GM = {
  turn: 30,
  chars: [{ name: '毕自严' }, { name: '孙传庭' }],
  activeEdicts: [{ id: 'e1', name: '核辽饷', content: '命毕自严复核辽饷加派', status: 'active', startedTurn: 30 }],
  _memoryAccepted: [
    { id: 'm-bi', type: 'character_memory', status: 'active', body: '毕自严记得皇帝许诺复核辽饷。', safeBody: '毕自严记得皇帝许诺复核辽饷。', authority: 'ai_extracted', turn: 26, entities: ['毕自严'], readScope: 'public', sourceRefs: [{ type: 'jishiRecords', id: 'jr-bi' }] },
    { id: 'm-sun', type: 'character_memory', status: 'active', body: '孙传庭记得边镇粮饷之议。', safeBody: '孙传庭记得边镇粮饷之议。', authority: 'ai_extracted', turn: 26, entities: ['孙传庭'], readScope: 'public', sourceRefs: [{ type: 'jishiRecords', id: 'jr-sun' }] }
  ]
};

// 1) turnFocusTerms 只挑出活法令提到的实体
const focus = MR.turnFocusTerms(GM, {});
assert(focus.indexOf('毕自严') >= 0, 'focus terms include edict-mentioned NPC 毕自严');
assert(focus.indexOf('孙传庭') < 0, 'focus terms exclude NPC not in turn focus 孙传庭');

// 2) applyFocusRelevance 抬升焦点相关项、不动无关项
const hits = [
  { id: 'h-bi', text: '毕自严记得皇帝许诺复核辽饷。', char: '毕自严', relevance: 0.75 },
  { id: 'h-sun', text: '孙传庭记得边镇粮饷之议。', char: '孙传庭', relevance: 0.75 }
];
MR.applyFocusRelevance(hits, focus);
assert(hits[0].relevance > 0.75, 'focus-relevant hit relevance boosted');
assert(hits[1].relevance === 0.75, 'non-focus hit relevance unchanged');

// 3) 端到端：compileFromGM 让焦点相关记忆排在前（其余条件相同）
const compiled = MCC.compileFromGM(GM, { turn: 31, audience: 'system', actorScope: 'system', intent: 'turn_inference', maxTokens: 3000 });
const idxBi = compiled.text.indexOf('毕自严记得');
const idxSun = compiled.text.indexOf('孙传庭记得');
assert(idxBi >= 0 && idxSun >= 0, 'both memories present under generous budget');
assert(idxBi < idxSun, 'focus-relevant memory (毕自严) ranks before non-focus memory (孙传庭)');

// 4) S1(2026-06-03): applyFocusRelevance 也吃 SC_RECALL 活路的 hit 形态(source/turn/text/sim·无预设 relevance)
const recallHits = [
  { source: 'vector', turn: 30, text: '毕自严受赐辽饷复核之恩。', sim: 0.5 },
  { source: 'vector', turn: 30, text: '某桩与本回合无关之琐事。', sim: 0.5 }
];
MR.applyFocusRelevance(recallHits, focus);
assert(typeof recallHits[0].relevance === 'number' && recallHits[0].relevance > 0.75, 'recall-shaped focus hit boosted from default base 0.75');
assert(recallHits[1].relevance === undefined, 'non-focus recall-shaped hit left untouched');

console.log('smoke-memory-focus-relevance ok');
