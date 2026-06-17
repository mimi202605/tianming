const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'tm-memory-retrieval.js'), 'utf8');

const sandbox = { console, Date, Math, JSON, window: {} };
sandbox.window.window = sandbox.window;
vm.runInNewContext(src, sandbox.window, { filename: 'tm-memory-retrieval.js' });

const MR = sandbox.window.TM && sandbox.window.TM.MemoryRetrieval;
assert(MR, 'TM.MemoryRetrieval should be exported');
assert.strictEqual(typeof MR.rankHits, 'function', 'MemoryRetrieval should expose rankHits');
assert.strictEqual(typeof MR.filterVisibleHits, 'function', 'MemoryRetrieval should expose filterVisibleHits');
assert.strictEqual(typeof MR.scoreHit, 'function', 'MemoryRetrieval should expose scoreHit');

const hits = [
  { id: 'hidden-vector', source: 'vector', text: 'secret candidate', sim: 0.99, turn: 22, visibility: 'hidden' },
  { id: 'old-edict', source: 'imperialEdict', text: '旧诏仍有效，任何新叙事不得覆盖', importance: 10, turn: 8, affects_future: true },
  { id: 'fresh-vector', source: 'vector', text: '相似但只是语义候选', sim: 0.92, turn: 21, importance: 3 },
  { id: 'dup-a', source: 'shiji', text: '同一事件重复文本', turn: 20, importance: 5 },
  { id: 'dup-b', source: 'shiji', text: '同一事件重复文本', turn: 20, importance: 5 },
];

const visible = MR.filterVisibleHits(hits, { turn: 22 });
assert.strictEqual(visible.length, 4, 'hidden hits should be filtered by default');
assert(!visible.some((h) => h.id === 'hidden-vector'), 'hidden hit should not pass visibility filter');

const ranked = MR.rankHits(hits, { turn: 22 });
assert.strictEqual(ranked.length, 3, 'rankHits should filter hidden hits and dedupe repeated text');
assert.strictEqual(ranked[0].id, 'old-edict', 'hard/edict authority should beat fresh vector similarity');
assert(ranked.every((h) => typeof h._score === 'number'), 'ranked hits should carry scores');
assert(ranked.every((h) => h._reason && h._reason.source), 'ranked hits should carry score reasons');

const withHidden = MR.rankHits(hits, { turn: 22, includeHidden: true });
assert(withHidden.some((h) => h.id === 'hidden-vector'), 'includeHidden should allow hidden hits for inspectors');

console.log('smoke-memory-retrieval-core ok');
