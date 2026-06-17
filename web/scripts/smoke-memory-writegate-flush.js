const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { console, Date, Math, JSON, window: {} };
sandbox.window.window = sandbox.window;

[
  'tm-memory-evidence-registry.js',
  'tm-memory-envelope.js',
  'tm-memory-writegate.js',
  'tm-memory-retrieval.js',
].forEach((file) => {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox.window, { filename: file });
});

const TM = sandbox.window.TM;
const MWG = TM && TM.MemoryWriteGate;
const ME = TM && TM.MemoryEnvelope;
const MR = TM && TM.MemoryRetrieval;

assert(MWG, 'TM.MemoryWriteGate should be exported');
assert.strictEqual(typeof MWG.flushAccepted, 'function', 'MemoryWriteGate should expose flushAccepted');

const GM = { turn: 18 };
const draft = MWG.enqueue(GM, {
  id: 'draft-canal-promise',
  type: 'semantic_fact',
  body: 'Minister Sun promised to inspect canal accounts before winter.',
  source: 'ai_extracted',
  sourceRefs: [{ type: 'dialogue', id: 'dlg-canal-1', authority: 'court_report' }],
  entities: ['Minister Sun', 'canal'],
  confidence: 0.72,
});

assert.strictEqual(draft.status, 'draft', 'AI extracted memory should start as draft');
assert.strictEqual((GM._memoryAccepted || []).length, 0, 'draft should not be accepted before review');

MWG.acceptDraft(GM, draft.id, { reviewer: 'smoke' });
assert.strictEqual(GM._memoryAccepted.length, 1, 'acceptDraft should immediately flush accepted memory');
const flushed = MWG.flushAccepted(GM, { reviewer: 'smoke' });
MWG.flushAccepted(GM, { reviewer: 'smoke' });

assert.strictEqual(flushed.added, 0, 'flushAccepted should be idempotent after automatic accept flush');
assert.strictEqual(GM._memoryAccepted.length, 1, 'accepted memory store should dedupe repeated flushes');
assert.strictEqual(GM._memoryAccepted[0].id, draft.id, 'accepted store should keep the reviewed draft id');
assert(GM._memoryAuditEvents.some((e) => e.action === 'flush_accepted' && e.id === draft.id), 'flush should be audit logged');

const envelopes = ME.collect(GM, { turn: GM.turn });
const acceptedEnvelope = envelopes.find((e) => e.id === draft.id);
assert(acceptedEnvelope, 'accepted memory should project into MemoryEnvelope');
assert.strictEqual(acceptedEnvelope.type, 'semantic_fact', 'accepted memory should preserve type');
assert.strictEqual(acceptedEnvelope.status, 'active', 'accepted memory envelope should be active');
assert(acceptedEnvelope.sourceRefs.some((r) => r.type === 'dialogue' && r.id === 'dlg-canal-1'), 'accepted memory should preserve source refs');

const hits = MR.collectPriorityHits(GM, { keywords: ['canal'], participant: '' }, { turn: GM.turn });
const acceptedHit = hits.find((h) => h.id === draft.id);
assert(acceptedHit, 'accepted memory should be retrievable by priority/entity search');
assert.strictEqual(acceptedHit.source, 'accepted_memory', 'accepted memory retrieval should use accepted_memory source');
assert.strictEqual(acceptedHit.factStatus, 'accepted_memory', 'accepted hit should preserve factStatus');

const trustedGM = { turn: 19 };
const trusted = MWG.enqueue(trustedGM, {
  id: 'trusted-world-law',
  type: 'semantic_fact',
  body: 'Canal inspection protocol is a designer seed.',
  source: 'designer_seed',
  sourceRefs: [{ type: 'designerSeed', id: 'law-canal', authority: 'designer_seed' }],
});
assert.strictEqual(trusted.status, 'active', 'trusted source should enqueue as active');
assert.strictEqual(trustedGM._memoryAccepted.length, 1, 'trusted active enqueue should auto-flush to accepted memory');

console.log('smoke-memory-writegate-flush ok');
