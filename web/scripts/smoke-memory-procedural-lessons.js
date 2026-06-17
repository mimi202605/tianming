const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { console, Date, Math, JSON, window: {} };
sandbox.window.window = sandbox.window;

[
  'tm-memory-trace.js',
  'tm-memory-evidence-registry.js',
  'tm-memory-source-bound.js',
  'tm-memory-envelope.js',
  'tm-memory-governance.js',
  'tm-memory-retrieval.js',
].forEach((file) => {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox.window, { filename: file });
});

const ME = sandbox.window.TM && sandbox.window.TM.MemoryEnvelope;
const MG = sandbox.window.TM && sandbox.window.TM.MemoryGovernance;
const MR = sandbox.window.TM && sandbox.window.TM.MemoryRetrieval;

const GM = {
  turn: 30,
  _aiReflections: [
    {
      turn: 29,
      forecast: '北伐可速胜',
      actual: '饷道不继，军心疲惫',
      lesson: '冬季远征前必须先核查粮道和军心',
      divergence: 'high',
      confidence_calibration: -0.6,
    },
  ],
  _proceduralLessons: [
    {
      id: 'player-correction-1',
      turn: 30,
      type: 'player_correction',
      lesson: '玩家纠偏：不要把未颁布草案当成正式诏令',
      trigger: '草案/正式诏令冲突',
      scope: 'edict_status',
      confidence: 0.9,
      sourceRefs: [{ type: 'playerCorrection', id: 'pc-1', authority: 'player_pin' }],
    },
  ],
};

const envelopes = ME.collect(GM, { turn: GM.turn });
const reflection = envelopes.find((e) => e.type === 'procedural_lesson' && e.id.indexOf('ai-reflection') === 0);
const correction = envelopes.find((e) => e.type === 'procedural_lesson' && e.id === 'player-correction-1');

assert(reflection, '_aiReflections should project to procedural_lesson envelope');
assert(correction, '_proceduralLessons should project to procedural_lesson envelope');
assert.strictEqual(reflection.authority, 'reflection', 'AI reflection should be low-authority reflection');
assert.strictEqual(reflection.factStatus, 'procedural_advice', 'procedural lessons should be advice, not fact');
assert.strictEqual(correction.authority, 'procedural', 'player correction should remain procedural guidance');
assert(correction.basisRefs.length > 0 || correction.sourceRefs.length > 0, 'procedural lessons should remain source-bound');

const factualEval = MG.evaluateEnvelope(reflection, { intent: 'current_fact' });
assert(factualEval.wouldReject, 'procedural lesson should not satisfy current_fact');
assert(factualEval.reasons.some((r) => r.code === 'procedural_as_fact'), 'procedural rejection should be explicit');
assert(!MG.evaluateEnvelope(reflection, { intent: 'procedural_guidance' }).wouldReject, 'procedural lesson can be injected as guidance');

const hits = MR.collectPriorityHits(GM, { keywords: ['粮道'], participant: '' }, { turn: GM.turn });
const proceduralHit = hits.find((h) => h.source === 'procedural');
assert(proceduralHit, 'procedural lessons should be retrievable when query matches');
assert.strictEqual(proceduralHit.factStatus, 'procedural_advice', 'procedural hit should preserve factStatus');
assert(proceduralHit.importance <= 6, 'procedural lessons should not outrank hard facts by default importance');

console.log('smoke-memory-procedural-lessons ok');
