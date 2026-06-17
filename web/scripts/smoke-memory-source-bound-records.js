const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sourceBoundPath = path.join(ROOT, 'tm-memory-source-bound.js');

assert(fs.existsSync(sourceBoundPath), 'tm-memory-source-bound.js should exist');

const sandbox = { console, Date, Math, JSON, window: {} };
sandbox.window.window = sandbox.window;

[
  'tm-memory-trace.js',
  'tm-memory-evidence-registry.js',
  'tm-memory-source-bound.js',
].forEach((file) => {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox.window, { filename: file });
});

const MSB = sandbox.window.TM && sandbox.window.TM.MemorySourceBound;
assert(MSB, 'TM.MemorySourceBound should be exported');
assert.strictEqual(typeof MSB.buildRecordMetadata, 'function', 'buildRecordMetadata should be exported');
assert.strictEqual(typeof MSB.mergeBasisRefs, 'function', 'mergeBasisRefs should be exported');

const GM = {
  turn: 12,
  _edictTracker: [{ id: 'edict-river', turn: 11, status: 'executing' }],
  qijuHistory: [{ id: 'qiju-prev', turn: 11, zhengwen: '昨日有司奏河工。' }],
  currentIssues: [{ id: 'issue-river', title: '河工未竟', raisedTurn: 11, evidenceRefs: [{ type: 'edictTracker', id: 'edict-river' }] }],
};

const meta = MSB.buildRecordMetadata(GM, {
  type: 'shijiHistory',
  turn: 11,
  text: '上命修河，工部督办。',
  authority: 'official_record',
  visibility: 'public',
  role: 'record',
  lane: 'L6_retrieved_evidence',
  aiBasisRefs: [
    { type: 'sc1_field', id: 'edict_feedback.0', authority: 'ai_extracted' },
    { type: 'edictTracker', id: 'edict-river', authority: 'player_pin' },
  ],
  maxBasisRefs: 8,
});

assert(/^shijiHistory-11-h/.test(meta.id), 'record id should be stable and content-hash based');
assert(meta.contentHash && meta.contentHash.startsWith('h'), 'record should carry contentHash');
assert.strictEqual(meta.sourceRefs[0].type, 'shijiHistory', 'sourceRefs should point at the record itself');
assert.strictEqual(meta.sourceRefs[0].id, meta.id, 'sourceRefs should use the stable record id');
assert(meta.basisRefs.some((r) => r.type === 'sc1_field' && r.id === 'edict_feedback.0'), 'AI basis_refs should be preserved');
assert(meta.basisRefs.some((r) => r.type === 'edictTracker' && r.id === 'edict-river'), 'registry/player basis refs should be preserved');
assert.strictEqual(
  meta.basisRefs.filter((r) => r.type === 'edictTracker' && r.id === 'edict-river').length,
  1,
  'duplicate basis refs should be deduped'
);
assert(meta.basisRefs.every((r) => r.authority && typeof r.authorityRank === 'number'), 'basis refs should be normalized with authority ranks');

const render = fs.readFileSync(path.join(ROOT, 'tm-endturn-render.js'), 'utf8');
const pipeline = fs.readFileSync(path.join(ROOT, 'tm-endturn-pipeline-steps.js'), 'utf8');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

assert(render.includes('MemorySourceBound.buildRecordMetadata'), 'render should build source-bound shiji/qiju metadata');
assert(render.includes('basisRefs: _recordMeta ? _recordMeta.basisRefs : _evidenceRefs'), 'shijiHistory should store basisRefs');
assert(render.includes('contentHash: _recordMeta && _recordMeta.contentHash'), 'shijiHistory should store contentHash');
assert(pipeline.includes('basis_refs') || pipeline.includes('basisRefs'), 'pipeline should pass SC1d basis refs into render');
assert(index.includes('tm-memory-source-bound.js'), 'index should load tm-memory-source-bound before render');

console.log('smoke-memory-source-bound-records ok');
