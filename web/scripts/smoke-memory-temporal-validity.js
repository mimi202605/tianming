const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { console, Date, Math, JSON, window: {} };
sandbox.window.window = sandbox.window;

['tm-memory-envelope.js', 'tm-memory-governance.js', 'tm-memory-retrieval.js'].forEach((file) => {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox.window, { filename: file });
});

const ME = sandbox.window.TM && sandbox.window.TM.MemoryEnvelope;
const MG = sandbox.window.TM && sandbox.window.TM.MemoryGovernance;
const MR = sandbox.window.TM && sandbox.window.TM.MemoryRetrieval;

assert(ME && MG && MR, 'memory modules should be exported');

function hasReason(evalResult, code) {
  return evalResult.reasons.some((r) => r.code === code);
}

const env = ME.makeEnvelope({
  id: 'edict-old-tax',
  type: 'state',
  body: 'old tax rate remains in force',
  sourceRefs: [{ type: 'edict', id: 'edict-old' }],
  validFromTurn: 10,
  validToTurn: 20,
  expiredAtTurn: 21,
  invalidationRefs: [{ type: 'edict', id: 'edict-new', authority: 'player_pin' }],
  invalidationReason: 'new edict supersedes old tax rate',
});

assert.strictEqual(env.validFromTurn, 10, 'envelope should preserve validFromTurn');
assert.strictEqual(env.validToTurn, 20, 'envelope should preserve validToTurn');
assert.strictEqual(env.expiredAtTurn, 21, 'envelope should preserve expiredAtTurn');
assert(env.invalidationRefs.some((r) => r.id === 'edict-new'), 'envelope should preserve invalidationRefs');
assert.strictEqual(env.invalidationReason, 'new edict supersedes old tax rate', 'envelope should preserve invalidationReason');

const expiredFact = MG.evaluateEnvelope(env, { turn: 22, intent: 'current_fact' });
assert(expiredFact.wouldReject && hasReason(expiredFact, 'expired_validity'), 'expired memory cannot serve as current fact');

const expiredEvidence = MG.evaluateEnvelope(env, { turn: 22, intent: 'historical_evidence' });
assert(!expiredEvidence.wouldReject, 'expired memory can remain historical evidence');

const futureFact = MG.evaluateEnvelope({ id: 'future-law', status: 'active', validFromTurn: 30 }, { turn: 25, intent: 'current_fact' });
assert(futureFact.wouldReject && hasReason(futureFact, 'not_yet_valid'), 'future-valid memory cannot be injected early');

const ranked = MR.rankHitsDetailed([
  { id: 'hard-current', source: 'hard_state', text: 'current tax rate is 12%', turn: 22, importance: 10 },
  { id: 'old-tax', source: 'imperialEdict', text: 'old tax rate is 10%', turn: 10, validToTurn: 20, importance: 10 },
  { id: 'future-tax', source: 'imperialEdict', text: 'future tax rate is 8%', turn: 24, validFromTurn: 30, importance: 10 },
], { turn: 22 });

assert(ranked.ranked.some((h) => h.id === 'hard-current'), 'current hard state should remain');
assert(ranked.suppressed.some((h) => h.id === 'old-tax' && h.reason === 'expired'), 'retrieval should suppress expired validity');
assert(ranked.suppressed.some((h) => h.id === 'future-tax' && h.reason === 'not_yet_valid'), 'retrieval should suppress future-valid memory');

console.log('smoke-memory-temporal-validity ok');
