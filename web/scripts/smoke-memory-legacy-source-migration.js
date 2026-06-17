#!/usr/bin/env node
'use strict';
// F3-A 守护：老路 getMemoryAnchorsForAI 的 3 个独有源（memoryArchive / playerDecisions / characterArcs）
// 已迁入 v6 governed 投影，经 compileFromGM 注入正确分区。退役老路注入后，此 smoke 防内容回归丢失。
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
assert(ME && typeof ME.collect === 'function', 'MemoryEnvelope.collect should exist');
assert(MCC && typeof MCC.compileFromGM === 'function', 'MemoryContextCompiler.compileFromGM should exist');

const GM = {
  turn: 30,
  memoryArchive: [
    { type: 'archive', title: '天启五年纪要', content: '阉党渐去，辽饷日紧。', turn: 24, year: 1625, importance: 80 }
  ],
  playerDecisions: [
    { category: 'edict', desc: '诏令复核辽饷加派', consequences: '毕自严受命', turn: 28 },
    { category: 'appointment', desc: '起复孙传庭督陕', turn: 29 }
  ],
  characterArcs: {
    '毕自严': [
      { type: 'appointment', desc: '拜户部尚书', turn: 20, year: 1625 },
      { type: 'achievement', desc: '厘清辽饷亏空', turn: 28, year: 1627 }
    ]
  }
};

// 1) Envelope 把三源投影出来（含 safeBody）
const envs = ME.collect(GM, { turn: 30 });
assert(envs.some((e) => e.type === 'historiography_summary' && String(e.safeBody || '').includes('天启五年纪要')), 'memoryArchive → historiography_summary envelope');
assert(envs.some((e) => e.type === 'player_action_record' && String(e.safeBody || '').includes('复核辽饷加派')), 'playerDecisions → player_action_record envelope');
assert(envs.some((e) => e.type === 'character_memory' && String(e.safeBody || '').includes('厘清辽饷亏空')), 'characterArcs → character_memory envelope');

// 2) compileFromGM 注入到正确分区
const compiled = MCC.compileFromGM(GM, { turn: 31, audience: 'system', actorScope: 'system', intent: 'turn_inference', maxTokens: 3000 });
assert(compiled.text.includes('<chronology') && compiled.text.includes('天启五年纪要'), 'memory archive lands in chronology section');
assert(compiled.text.includes('<recent-events') && compiled.text.includes('复核辽饷加派'), 'player decisions land in recent-events section');
assert(compiled.text.includes('<character-memory') && compiled.text.includes('厘清辽饷亏空'), 'character arcs land in character-memory section');

// 3) 注入安全：projected envelope 的 safeBody 无裸尖括号
assert(envs.every((e) => !String(e.safeBody || '').includes('<')), 'projected envelopes use safeBody-clean text');

console.log('smoke-memory-legacy-source-migration ok');
