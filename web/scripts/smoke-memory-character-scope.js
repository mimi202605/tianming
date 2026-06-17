#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const sandbox = { window: {}, console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

[
  'tm-memory-evidence-registry.js',
  'tm-memory-envelope.js',
  'tm-memory-controls.js',
  'tm-memory-retrieval.js',
  'tm-context-zones.js',
  'tm-memory-context-compiler.js'
].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
});

const GM = {
  turn: 7,
  _memoryAccepted: [
    {
      id: 'private-belief-1',
      type: 'character_belief',
      status: 'active',
      body: 'han-kuang privately believes wei should not be killed abruptly.',
      safeBody: 'han-kuang privately believes wei should not be killed abruptly.',
      authority: 'ai_extracted',
      turn: 6,
      entities: ['han-kuang', 'wei'],
      ownerScope: 'npc:han-kuang',
      readScope: 'npc:han-kuang',
      sourceRefs: [{ type: 'jishiRecords', id: 'jr-private' }]
    }
  ]
};

const publicCtx = sandbox.TM.MemoryContextCompiler.compileFromGM(GM, {
  turn: 7,
  audience: 'public',
  actorScope: 'system',
  intent: 'turn_inference'
});
assert(!publicCtx.text.includes('killed abruptly'), 'private belief hidden from public context');

const npcCtx = sandbox.TM.MemoryContextCompiler.compileFromGM(GM, {
  turn: 7,
  audience: 'npc:han-kuang',
  actorScope: 'npc:han-kuang',
  actorId: 'han-kuang',
  intent: 'actor_decision'
});
assert(npcCtx.text.includes('killed abruptly'), 'private belief visible to owning actor');
assert(npcCtx.text.includes('<character-memory'), 'owning actor sees character memory section');

console.log('smoke-memory-character-scope ok');
