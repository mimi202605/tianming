#!/usr/bin/env node
'use strict';

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
  'tm-memory-envelope.js',
  'tm-memory-writegate.js',
  'tm-memory-turn-inference.js'
].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
});

const MTI = sandbox.TM && sandbox.TM.MemoryTurnInference;
assert(MTI, 'MemoryTurnInference should be exported');
assert.strictEqual(typeof MTI.evaluateCharacterMemoryUpdate, 'function', 'quality evaluator should be exported');

const GM = { turn: 18 };
const candidates = MTI.collectPostTurnCandidates(GM, {
  character_memory_updates: [
    {
      actor: 'han-kuang',
      memory_type: 'commitment',
      memory: 'Han remembers the emperor promised a three-day review of the Liaodong levy.',
      confidence: 0.82,
      source_refs: [{ type: 'jishiRecords', id: 'jr-levy', turn: 17 }]
    },
    {
      actor: 'wen-tiren',
      memory_type: 'belief',
      memory: 'Wen privately suspects Han is using the levy dispute to weaken him.',
      private: true,
      confidence: 0.73,
      basis_refs: [{ type: 'courtRecords', id: 'court-levy', turn: 17 }]
    },
    {
      actor: 'sun-chuanting',
      memory_type: 'mood',
      memory: 'Angry.',
      confidence: 0.31
    },
    {
      memory_type: 'belief',
      memory: 'A memory with no actor should be dropped before WriteGate.',
      confidence: 0.9,
      source_refs: [{ type: 'aiTurnResult', id: 'SC1' }]
    }
  ]
}, { sourceId: 'SC1' });

assert.strictEqual(candidates.length, 3, 'valid actor records should produce three candidates; missing actor is dropped');
const commitment = candidates.find((item) => item.extra && item.extra.memoryType === 'commitment');
const belief = candidates.find((item) => item.extra && item.extra.memoryType === 'belief');
const lowQuality = candidates.find((item) => item.id.includes('sun-chuanting') || (item.extra && item.extra.actor === 'sun-chuanting'));

assert(commitment, 'commitment memory candidate exists');
assert.strictEqual(commitment.status || 'draft', 'draft', 'high-quality commitment should be draftable');
assert.strictEqual(commitment.extra.qualityStatus, 'draftable', 'high-quality memory quality status');
assert.strictEqual(commitment.extra.confidence, 0.82, 'confidence is preserved');
assert(commitment.sourceRefs.some((ref) => ref.type === 'jishiRecords' && ref.id === 'jr-levy'), 'explicit source_refs are preserved');

assert(belief, 'belief memory candidate exists');
assert.strictEqual(belief.type, 'character_belief', 'belief/private memory uses character_belief');
assert.strictEqual(belief.readScope, 'npc:wen-tiren', 'private belief remains actor-scoped');
assert(belief.basisRefs.some((ref) => ref.type === 'courtRecords' && ref.id === 'court-levy'), 'basis_refs are preserved');

assert(lowQuality, 'low-quality memory candidate is retained for quarantine review');
assert.strictEqual(lowQuality.status, 'quarantined', 'low-quality memory is quarantined');
assert.strictEqual(lowQuality.reviewStatus, 'quarantined', 'low-quality memory records quarantine reviewStatus');
assert(lowQuality.reasons.some((reason) => reason.code === 'low_confidence'), 'low-quality memory cites low confidence');
assert(lowQuality.reasons.some((reason) => reason.code === 'missing_source_refs'), 'low-quality memory cites missing source refs');
assert(lowQuality.reasons.some((reason) => reason.code === 'too_short'), 'low-quality memory cites short body');

const result = MTI.enqueueCandidates(GM, candidates, { forceDraft: true });
assert.strictEqual(result.added, 3, 'all candidates are routed through WriteGate queues');
assert.strictEqual(GM._memoryDraftInbox.length, 2, 'only quality-approved memories enter Draft');
assert.strictEqual(GM._memoryQuarantine.length, 1, 'low-quality memory enters Quarantine');
assert(!GM._memoryAccepted || GM._memoryAccepted.length === 0, 'no AI memory is auto-accepted');

console.log('smoke-memory-turn-quality-gate ok');
