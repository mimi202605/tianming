const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const envelopePath = path.join(ROOT, 'tm-memory-envelope.js');
assert(fs.existsSync(envelopePath), 'tm-memory-envelope.js should exist');

const envelopeIdx = indexHtml.indexOf('tm-memory-envelope.js');
const retrievalIdx = indexHtml.indexOf('tm-memory-retrieval.js');
assert(envelopeIdx >= 0, 'index should load tm-memory-envelope.js');
assert(retrievalIdx >= 0, 'index should load tm-memory-retrieval.js');
assert(envelopeIdx < retrievalIdx, 'tm-memory-envelope.js should load before tm-memory-retrieval.js');

const sandbox = { console, Date, Math, JSON, window: {} };
sandbox.window.window = sandbox.window;
vm.runInNewContext(fs.readFileSync(envelopePath, 'utf8'), sandbox.window, { filename: 'tm-memory-envelope.js' });
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'tm-memory-retrieval.js'), 'utf8'), sandbox.window, { filename: 'tm-memory-retrieval.js' });

const MR = sandbox.window.TM && sandbox.window.TM.MemoryRetrieval;
assert(MR, 'TM.MemoryRetrieval should be exported');

const GM = {
  turn: 92,
  chars: [
    { id: 'char-wei-source', name: 'Wei Zhongxian', alive: true, location: 'Beijing', lastUpdateTurn: 92 },
  ],
  activeEdicts: [
    { id: 'edict-river', status: 'active', content: 'Wei Zhongxian must supervise canal repairs', startedTurn: 91 },
  ],
};

const hits = MR.collectPriorityHits(GM, {
  keywords: ['Wei Zhongxian'],
  participant: 'Wei Zhongxian',
}, { turn: GM.turn });

const hard = hits.find((h) => h.id === 'hard-char-Wei Zhongxian');
assert(hard, 'retrieval should consume hard_state envelope projection');
assert(Array.isArray(hard.sourceRefs) && hard.sourceRefs.length > 0, 'retrieval hit should preserve sourceRefs from envelope');
assert.strictEqual(hard.authority, 'engine_state', 'retrieval hit should preserve authority');
assert.strictEqual(hard.lane, 'L1_world_truth', 'retrieval hit should preserve lane');
assert.strictEqual(hard.reason, 'envelope:hard_state', 'retrieval hit should explain envelope projection reason');

const edict = hits.find((h) => h.id === 'edict-river');
assert(edict, 'retrieval should consume active_law envelope projection');
assert.strictEqual(edict.source, 'activeEdict', 'active_law envelope should become activeEdict hit');
assert(Array.isArray(edict.sourceRefs) && edict.sourceRefs[0].type === 'activeEdict', 'edict hit should keep source ref');

console.log('smoke-memory-envelope-retrieval ok');
