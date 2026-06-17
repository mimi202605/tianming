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

const GM = {
  turn: 42,
  _edictRelations: [
    { from: 'edict-new-tax', to: 'edict-old-tax', type: 'supersedes', reason: '新税法覆盖旧税法', turn: 40 },
  ],
  _memEdges: [
    { src: 'commit-new', dst: 'commit-old', type: 'supersedes', reason: '新承诺取代旧承诺', turn: 41 },
  ],
};

const ranked = MR.rankHits([
  { id: 'edict-old-tax', source: 'imperialEdict', text: '旧税法仍按十税三征收', status: 'active', turn: 10, importance: 10, affects_future: true },
  { id: 'edict-new-tax', source: 'imperialEdict', text: '新税法改为十税二，旧税法废止', status: 'active', turn: 40, importance: 10, affects_future: true },
  { id: 'commit-old', source: 'commitment', text: '旧承诺：三日后查税', status: 'executing', turn: 38, importance: 8 },
  { id: 'commit-new', source: 'commitment', text: '新承诺：今日即查税', status: 'executing', turn: 41, importance: 8 },
  { id: 'reject-a', source: 'imperialEdict', text: '已被拒绝的皇命候选', status: 'rejected', turn: 42, importance: 10 },
  { id: 'done-c', source: 'commitment', text: '已经完成的承诺不再作为待办召回', status: 'completed', turn: 35, importance: 10 },
  { id: 'expired-v', source: 'vector', text: '已经过期的临时线索', expiresTurn: 40, turn: 39, sim: 0.99 },
  { id: 'history-ok', source: 'shiji', text: '已完成史事仍可作为历史证据', status: 'completed', turn: 20, importance: 5 },
], { turn: 42, GM });

const ids = ranked.map((h) => h.id);
assert(ids.includes('edict-new-tax'), 'superseding edict should remain');
assert(!ids.includes('edict-old-tax'), 'superseded old edict should be suppressed');
assert(ids.includes('commit-new'), 'superseding commitment should remain');
assert(!ids.includes('commit-old'), 'superseded old commitment should be suppressed');
assert(!ids.includes('reject-a'), 'rejected candidate should be filtered');
assert(!ids.includes('done-c'), 'completed live commitment should be filtered as active obligation');
assert(!ids.includes('expired-v'), 'expired hit should be filtered');
assert(ids.includes('history-ok'), 'completed shiji history should remain as evidence');

const inspected = MR.rankHits([
  { id: 'hidden-debug', source: 'vector', text: 'hidden inspector candidate', visibility: 'hidden', turn: 42, sim: 0.8 },
], { turn: 42, includeHidden: true });
assert(inspected.some((h) => h.id === 'hidden-debug'), 'includeHidden should still work for inspectors');

console.log('smoke-memory-retrieval-governance ok');
