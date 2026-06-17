#!/usr/bin/env node
'use strict';
// E2 守护：恩德/关系记忆「累积→立场」综合（MemoryBank 综合过往交互成立场的确定性变体）。
// 把某 NPC 在 _memoryAccepted 的散点 character_memory 综合为一条「对帝立场综述」(净账)，治「恩德不累积」呈现层。
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

const ME = sandbox.TM && sandbox.TM.MemoryEnvelope;
const MCC = sandbox.TM && sandbox.TM.MemoryContextCompiler;

function acc(id, actor, mt, body, turn) {
  return { id: id, type: 'character_memory', status: 'active', body: body, safeBody: body, authority: 'ai_extracted', turn: turn, entities: [actor], readScope: 'public', extra: { actor: actor, memoryType: mt }, sourceRefs: [{ type: 'jishiRecords', id: 'jr-' + id }] };
}

const GM = {
  turn: 30,
  _memoryAccepted: [
    acc('m1', '毕自严', 'favor', '毕自严受赐金犒劳。', 20),
    acc('m2', '毕自严', 'favor', '毕自严获皇帝复核辽饷之许。', 26),
    acc('m3', '毕自严', 'grudge', '毕自严因被言官弹劾而稍生怨。', 28),
    acc('m4', '孙传庭', 'favor', '孙传庭获起复督陕。', 29)
  ]
};

// 1) Envelope 综合出累积≥2条的 NPC 立场，且把净账数对
const envs = ME.collect(GM, { turn: 30 });
const stance = envs.filter((e) => e.reason === 'projection:character_stance');
const biStance = stance.find((e) => String(e.safeBody || '').indexOf('毕自严') >= 0);
assert(biStance, '毕自严(累计3条) gets a stance synthesis envelope');
assert(String(biStance.safeBody).indexOf('累计3条') >= 0, 'stance shows accumulated count');
assert(String(biStance.safeBody).indexOf('受恩2') >= 0, 'stance shows favor net (2)');
assert(String(biStance.safeBody).indexOf('恩怨1') >= 0, 'stance shows grudge net (1)');
assert(!stance.some((e) => String(e.safeBody || '').indexOf('孙传庭') >= 0), '孙传庭(仅1条) gets NO stance synthesis (count<2)');

// 2) compileFromGM 注入立场综述到 character-memory 区
const compiled = MCC.compileFromGM(GM, { turn: 31, audience: 'system', actorScope: 'system', intent: 'turn_inference', maxTokens: 4000 });
assert(compiled.text.includes('<character-memory'), 'character-memory section present');
assert(compiled.text.includes('对帝立场综述') && compiled.text.includes('累计3条'), 'stance synthesis injected into prompt context');

console.log('smoke-memory-character-stance ok');
