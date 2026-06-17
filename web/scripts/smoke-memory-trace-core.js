const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'tm-memory-trace.js'), 'utf8');

const sandbox = {
  console,
  Date,
  Math,
  JSON,
  window: {},
};
sandbox.window.window = sandbox.window;

vm.runInNewContext(src, sandbox.window, { filename: 'tm-memory-trace.js' });

const MT = sandbox.window.TM && sandbox.window.TM.MemoryTrace;
assert(MT, 'TM.MemoryTrace should be exported');

const GM = { turn: 12, _turnAiResults: {} };
const trace = MT.ensureTurnTrace(GM, { source: 'smoke' });
assert(trace.traceId, 'turn trace should have traceId');
assert.strictEqual(trace.traceOnly, true, 'turn trace should be traceOnly');
assert.strictEqual(GM._turnAiResults.memoryTrace, trace, 'trace should be attached to GM._turnAiResults');

const subcall = MT.recordSubcall(GM, {
  id: 'sc1',
  label: '主推演',
  prompt: 'SECRET_PROMPT_天机_很长很长'.repeat(30),
  response: 'SECRET_RESPONSE_密折_很长很长'.repeat(20),
  usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
  latencyMs: 345,
  ok: true,
});
assert.strictEqual(subcall.id, 'sc1');
assert(subcall.promptHash && subcall.responseHash, 'subcall should hash prompt and response');
assert(!JSON.stringify(subcall).includes('SECRET_PROMPT_天机'), 'subcall trace must not store raw prompt');
assert(!JSON.stringify(subcall).includes('SECRET_RESPONSE_密折'), 'subcall trace must not store raw response');
assert(subcall.promptPreview.length <= 180, 'prompt preview should be bounded');

const retrieval = MT.recordRetrieval(GM, {
  id: 'SC_RECALL',
  query: '旧诏是否仍有效',
  gate: { shouldRecall: true, reason: 'smoke' },
  sources: { shiji: 2, npc: 1 },
  hits: [
    { id: 'm1', source: 'shiji', text: '旧诏内容'.repeat(50), score: 0.9, turn: 3, _reason: { relevance: 0.9, importance: 0.5, recency: 0.6, source: 0.7, dimension: 0.5 } },
    { id: 'm2', source: 'npc', text: 'NPC私怨'.repeat(50), score: 0.7, turn: 7 },
  ],
});
assert.strictEqual(retrieval.hits.length, 2);
assert.strictEqual(retrieval.hits[0].reason.relevance, 0.9, 'retrieval trace should keep score reason parts');
assert(!JSON.stringify(retrieval).includes('旧诏内容旧诏内容旧诏内容旧诏内容旧诏内容旧诏内容'), 'retrieval trace should bound hit previews');

const injection = MT.recordInjection(GM, {
  lane: 'L6_retrieved_evidence',
  stage: 'sc05',
  text: '<recalled-memories>密折正文'.repeat(80),
  items: [{ id: 'm1', source: 'shiji', reason: 'top-score' }],
  tokenEstimate: 222,
});
assert.strictEqual(injection.lane, 'L6_retrieved_evidence');
assert(injection.textHash, 'injection should hash injected text');
assert(!JSON.stringify(injection).includes('密折正文密折正文密折正文密折正文'), 'injection trace must not store raw injected text');

const snapshot = MT.snapshot(GM);
assert.strictEqual(snapshot.subcalls.length, 1, 'snapshot should include subcalls');
assert.strictEqual(snapshot.retrievals.length, 1, 'snapshot should include retrievals');
assert.strictEqual(snapshot.injections.length, 1, 'snapshot should include injections');

console.log('smoke-memory-trace-core ok');
