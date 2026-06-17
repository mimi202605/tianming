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
  turn: 12,
  sid: 'sc-test-turn-memory',
  currentIssues: [
    {
      id: 'issue-tax',
      title: 'liao-pay levy',
      description: 'military payroll gap expands',
      status: 'active',
      raisedTurn: 10,
      linkedChars: ['minister-bi']
    },
    {
      id: 'issue-wei',
      title: 'wei faction settlement',
      description: 'court has resolved the eunuch faction question',
      status: 'resolved',
      raisedTurn: 8,
      resolvedTurn: 11,
      resolution: 'exile to fengyang'
    }
  ],
  biannianItems: [
    {
      id: 'bn-11',
      turn: 11,
      title: 'wei exile edict',
      content: 'turn 11 records the exile order.',
      category: 'court'
    }
  ],
  yearlyChronicles: [
    {
      id: 'yc-1627',
      year: 1627,
      turn: 12,
      summary: 'autumn 1627 court chronicle notes faction pressure easing.'
    }
  ],
  _npcRelationEvents: [
    {
      id: 'rel-1',
      turn: 11,
      actor: 'minister-bi',
      target: 'emperor',
      kind: 'trust_gain',
      text: 'minister-bi gains trust after the payroll memorial.'
    }
  ],
  _memoryAccepted: [
    {
      id: 'char-mem-1',
      type: 'character_memory',
      status: 'active',
      body: 'minister-bi remembers the emperor promised a payroll review.',
      safeBody: 'minister-bi remembers the emperor promised a payroll review.',
      authority: 'ai_extracted',
      turn: 11,
      entities: ['minister-bi'],
      sourceRefs: [{ type: 'jishiRecords', id: 'jr-1' }]
    }
  ]
};

const compiled = sandbox.TM.MemoryContextCompiler.compileFromGM(GM, {
  turn: 12,
  audience: 'system',
  actorScope: 'system',
  intent: 'turn_inference',
  maxTokens: 1600
});

assert(compiled.text.includes('<memory-context'), 'compiled context exists');
assert(compiled.text.includes('<state-affairs'), 'state affairs section exists');
assert(compiled.text.includes('<chronology'), 'chronology section exists');
assert(compiled.text.includes('<character-memory'), 'character memory section exists');
assert(compiled.text.includes('liao-pay levy'), 'active state issue appears');
assert(compiled.text.includes('exile to fengyang'), 'issue resolution appears');
assert(compiled.text.includes('wei exile edict'), 'chronicle event appears');
assert(compiled.text.includes('autumn 1627'), 'yearly chronicle appears');
assert(compiled.text.includes('minister-bi remembers'), 'character memory appears');
assert(!compiled.text.includes('undefined'), 'compiled context has no undefined text');

console.log('smoke-memory-turn-inference-projection ok');
