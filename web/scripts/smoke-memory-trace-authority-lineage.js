const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { console, Date, Math, JSON, window: {} };
sandbox.window.window = sandbox.window;
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'tm-memory-trace.js'), 'utf8'), sandbox.window, { filename: 'tm-memory-trace.js' });

const MT = sandbox.window.TM && sandbox.window.TM.MemoryTrace;
assert(MT, 'TM.MemoryTrace should be exported');

const GM = { turn: 42, _turnAiResults: {} };
const hit = {
  id: 'track-river',
  source: 'chronicle',
  text: 'River repair continues under imperial order.',
  turn: 42,
  score: 0.92,
  authority: 'rule_validated',
  authorityRank: 80,
  visibility: 'gm_hidden',
  lane: 'L3_long_term_affair',
  factStatus: 'active',
  confidence: 0.88,
  sourceRefs: [{ type: 'chronicleTrack', id: 'track-river', turn: 42 }],
  basisRefs: [{ type: 'edictTracker', id: 'edict-river', turn: 41, authority: 'player_pin', authorityRank: 90 }],
};

const retrieval = MT.recordRetrieval(GM, {
  id: 'SC_RECALL',
  status: 'hit',
  query: { keywords: ['river'] },
  hits: [hit],
});

assert.strictEqual(retrieval.hits[0].authority, 'rule_validated', 'retrieval hit should preserve authority');
assert.strictEqual(retrieval.hits[0].authorityRank, 80, 'retrieval hit should preserve authorityRank');
assert.strictEqual(retrieval.hits[0].visibility, 'gm_hidden', 'retrieval hit should preserve visibility');
assert.strictEqual(retrieval.hits[0].lane, 'L3_long_term_affair', 'retrieval hit should preserve lane');
assert.strictEqual(retrieval.hits[0].factStatus, 'active', 'retrieval hit should preserve factStatus');
assert.strictEqual(retrieval.hits[0].confidence, 0.88, 'retrieval hit should preserve confidence');
assert.strictEqual(retrieval.hits[0].sourceRefs[0].type, 'chronicleTrack', 'retrieval sourceRef should keep type');
assert.strictEqual(retrieval.hits[0].sourceRefs[0].id, 'track-river', 'retrieval sourceRef should keep id');
assert.strictEqual(retrieval.hits[0].sourceRefs[0].turn, 42, 'retrieval sourceRef should keep turn');
assert.strictEqual(retrieval.hits[0].basisRefs[0].type, 'edictTracker', 'retrieval basisRef should keep type');
assert.strictEqual(retrieval.hits[0].basisRefs[0].id, 'edict-river', 'retrieval basisRef should keep id');
assert.strictEqual(retrieval.hits[0].basisRefs[0].turn, 41, 'retrieval basisRef should keep turn');
assert.strictEqual(retrieval.hits[0].basisRefs[0].authority, 'player_pin', 'retrieval basisRef should keep authority');
assert.strictEqual(retrieval.hits[0].basisRefs[0].authorityRank, 90, 'retrieval basisRef should keep authorityRank');

const injection = MT.recordInjection(GM, {
  lane: 'L3_long_term_affair',
  stage: 'SC_PROMPT',
  text: 'River repair continues.',
  items: [hit],
});

assert.strictEqual(injection.items[0].authority, 'rule_validated', 'injected item should preserve authority');
assert.strictEqual(injection.items[0].authorityRank, 80, 'injected item should preserve authorityRank');
assert.strictEqual(injection.items[0].visibility, 'gm_hidden', 'injected item should preserve visibility');
assert.strictEqual(injection.items[0].factStatus, 'active', 'injected item should preserve factStatus');
assert.strictEqual(injection.items[0].sourceRefs[0].type, 'chronicleTrack', 'injected sourceRef should keep type');
assert.strictEqual(injection.items[0].sourceRefs[0].id, 'track-river', 'injected sourceRef should keep id');
assert.strictEqual(injection.items[0].sourceRefs[0].turn, 42, 'injected sourceRef should keep turn');
assert.strictEqual(injection.items[0].basisRefs[0].type, 'edictTracker', 'injected basisRef should keep type');
assert.strictEqual(injection.items[0].basisRefs[0].id, 'edict-river', 'injected basisRef should keep id');
assert.strictEqual(injection.items[0].basisRefs[0].turn, 41, 'injected basisRef should keep turn');
assert.strictEqual(injection.items[0].basisRefs[0].authority, 'player_pin', 'injected basisRef should keep authority');
assert.strictEqual(injection.items[0].basisRefs[0].authorityRank, 90, 'injected basisRef should keep authorityRank');

console.log('smoke-memory-trace-authority-lineage ok');
