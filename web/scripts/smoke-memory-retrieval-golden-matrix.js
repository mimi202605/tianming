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

function ids(result) {
  return result.ranked.map((h) => h.id);
}

function suppressedReason(result, id) {
  const item = result.suppressed.find((s) => s.id === id);
  return item && item.reason;
}

const cases = [
  {
    name: 'new edict suppresses old edict',
    GM: { turn: 60, _edictRelations: [{ from: 'edict-new', to: 'edict-old', type: 'supersedes', reason: 'new law replaces old law' }] },
    hits: [
      { id: 'edict-old', source: 'imperialEdict', text: '旧盐法仍行', status: 'active', turn: 20, importance: 10 },
      { id: 'edict-new', source: 'imperialEdict', text: '新盐法覆盖旧盐法', status: 'active', turn: 59, importance: 10 },
    ],
    keep: ['edict-new'],
    suppress: { 'edict-old': 'superseded' },
  },
  {
    name: 'new commitment suppresses old commitment',
    GM: { turn: 60, _memEdges: [{ src: 'commit-new', dst: 'commit-old', type: 'supersedes', reason: 'new instruction replaces old task' }] },
    hits: [
      { id: 'commit-old', source: 'commitment', text: '旧承诺：三日后核账', status: 'executing', turn: 55, importance: 8 },
      { id: 'commit-new', source: 'commitment', text: '新承诺：今日核账', status: 'executing', turn: 59, importance: 8 },
    ],
    keep: ['commit-new'],
    suppress: { 'commit-old': 'superseded' },
  },
  {
    name: 'expired foreshadow is not injected',
    GM: { turn: 60 },
    hits: [
      { id: 'expired-foreshadow', source: 'foreshadow', text: '过期伏笔', expiresTurn: 58, turn: 50, importance: 9 },
      { id: 'live-foreshadow', source: 'foreshadow', text: '仍有效伏笔', expiresTurn: 66, turn: 59, importance: 6 },
    ],
    keep: ['live-foreshadow'],
    suppress: { 'expired-foreshadow': 'expired' },
  },
  {
    name: 'hard state rejects contradictory vector hit',
    GM: { turn: 60, _memEdges: [{ src: 'char-hard-alive', dst: 'vec-dead-rumor', type: 'contradicts', reason: 'hard state says character is alive' }] },
    hits: [
      { id: 'char-hard-alive', source: 'hard_state', text: '魏忠贤当前状态：存活，在京', turn: 60, relevance: 0.9, importance: 10 },
      { id: 'vec-dead-rumor', source: 'vector', text: '旧传闻：魏忠贤已死', turn: 30, sim: 0.99, importance: 9 },
    ],
    keep: ['char-hard-alive'],
    suppress: { 'vec-dead-rumor': 'contradicted' },
  },
];

cases.forEach((c) => {
  const result = MR.rankHitsDetailed(c.hits, { turn: c.GM.turn, GM: c.GM });
  const kept = ids(result);
  c.keep.forEach((id) => assert(kept.includes(id), c.name + ': expected kept ' + id));
  Object.keys(c.suppress).forEach((id) => {
    assert(!kept.includes(id), c.name + ': expected suppressed ' + id);
    assert.strictEqual(suppressedReason(result, id), c.suppress[id], c.name + ': wrong suppression reason for ' + id);
  });
});

console.log('smoke-memory-retrieval-golden-matrix ok');
