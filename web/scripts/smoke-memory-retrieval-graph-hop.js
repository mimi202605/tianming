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
  'tm-memory-retrieval.js',
].forEach((file) => {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox.window, { filename: file });
});

const MR = sandbox.window.TM && sandbox.window.TM.MemoryRetrieval;
assert(MR, 'TM.MemoryRetrieval should be exported');

const GM = {
  turn: 44,
  currentIssues: [
    {
      id: 'issue-canal',
      title: 'Canal accounts must be audited',
      status: 'pending',
      raisedTurn: 44,
      evidenceRefs: [{ type: 'jishiRecords', id: 'jishi-44-canal', authority: 'court_report' }],
    },
  ],
  shijiHistory: [
    {
      id: 'shiji-flood',
      turn: 31,
      shizhengji: 'Last autumn the eastern embankment failed after false account books concealed missing funds.',
      sourceRefs: [{ type: 'shijiHistory', id: 'shiji-flood', authority: 'official_record', turn: 31 }],
    },
  ],
  _memEdges: [
    {
      src: 'currentIssues:issue-canal',
      dst: 'shijiHistory:shiji-flood',
      type: 'causes',
      reason: 'audit issue traces back to flood accounts',
      turn: 44,
    },
  ],
};

const hits = MR.collectPriorityHits(GM, { keywords: ['Canal'], participant: '' }, { turn: GM.turn });
assert(hits.some((h) => h.id === 'issue-canal'), 'query should match the active issue');

const graphHit = hits.find((h) => h.id === 'shiji-flood');
assert(graphHit, 'graph one-hop expansion should include connected shiji evidence');
assert.strictEqual(graphHit.source, 'shiji', 'graph-expanded shiji should keep shiji source');
assert.strictEqual(graphHit.graphEdge.type, 'causes', 'graph-expanded hit should keep edge type');
assert(graphHit.reason.indexOf('graph:causes') >= 0, 'graph-expanded hit should explain why it was included');

console.log('smoke-memory-retrieval-graph-hop ok');
