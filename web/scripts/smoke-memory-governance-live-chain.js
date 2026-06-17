const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { console, Date, Math, JSON, window: {} };
sandbox.window.window = sandbox.window;

['tm-memory-governance.js', 'tm-memory-retrieval.js', 'tm-memory-trace.js'].forEach((file) => {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox.window, { filename: file });
});

const MR = sandbox.window.TM && sandbox.window.TM.MemoryRetrieval;
const MT = sandbox.window.TM && sandbox.window.TM.MemoryTrace;
assert(MR && MT, 'retrieval and trace modules should be exported');

function ids(result) {
  return result.ranked.map((h) => h.id);
}

function suppressedReason(result, id) {
  const item = result.suppressed.find((s) => s.id === id);
  return item && item.reason;
}

{
  const result = MR.rankHitsDetailed([
    { id: 'hard-current', source: 'hard_state', text: 'current treasury is 5000', authority: 'engine_state', visibility: 'world_truth' },
    { id: 'rumor-city', source: 'rumor', type: 'rumor_claim', text: 'rumor says city fell', authority: 'rumor', visibility: 'public' },
    { id: 'procedure-tax', source: 'procedural', type: 'procedural_lesson', text: 'lower tax slowly next time', authority: 'procedural', visibility: 'internal' },
    { id: 'quarantine-note', source: 'accepted_memory', text: 'unsafe extracted note', status: 'quarantined', authority: 'ai_extracted' },
  ], { turn: 40, intent: 'current_fact' });

  assert(ids(result).includes('hard-current'), 'hard state should remain in current_fact retrieval');
  assert.strictEqual(suppressedReason(result, 'rumor-city'), 'rumor_as_fact', 'rumor should be suppressed as current fact');
  assert.strictEqual(suppressedReason(result, 'procedure-tax'), 'procedural_as_fact', 'procedural memory should be suppressed as current fact');
  assert.strictEqual(suppressedReason(result, 'quarantine-note'), 'quarantined', 'quarantined memory should be suppressed');

  const GM = { turn: 40, _turnAiResults: {} };
  const trace = MT.recordRetrieval(GM, {
    id: 'GOVERNANCE_LIVE',
    status: 'hit',
    hits: result.ranked,
    suppressed: result.suppressed,
  });
  assert(trace.suppressed.some((s) => s.id === 'rumor-city' && s.reason === 'rumor_as_fact'), 'trace should preserve rumor governance suppression');
}

{
  const history = MR.rankHitsDetailed([
    { id: 'rumor-city', source: 'rumor', type: 'rumor_claim', text: 'rumor says city fell', authority: 'rumor', visibility: 'public' },
  ], { turn: 40, intent: 'historical_evidence' });
  assert(ids(history).includes('rumor-city'), 'rumor may remain as historical evidence');

  const procedure = MR.rankHitsDetailed([
    { id: 'procedure-tax', source: 'procedural', type: 'procedural_lesson', text: 'lower tax slowly next time', authority: 'procedural', visibility: 'internal' },
  ], { turn: 40, intent: 'procedural_guidance' });
  assert(ids(procedure).includes('procedure-tax'), 'procedural memory may remain as procedural guidance');
}

console.log('smoke-memory-governance-live-chain ok');
