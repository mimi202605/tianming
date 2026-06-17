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
  turn: 70,
  chars: [
    {
      id: 'char-wei-source',
      name: 'Wei Zhongxian',
      alive: true,
      location: 'Beijing',
      officialTitle: 'Sili Jian Bingbi',
      faction: 'Eunuch Faction',
      lastUpdateTurn: 69,
    },
    {
      name: 'Yuan Chonghuan',
      alive: false,
      location: 'Imperial Prison',
      deathTurn: 65,
      deathReason: 'executed in prison',
    },
    {
      name: 'Unrelated Minister',
      alive: true,
      location: 'Nanjing',
    },
  ],
  _memEdges: [
    {
      src: 'hard-char-Wei Zhongxian',
      dst: 'vec-dead-rumor',
      type: 'contradicts',
      reason: 'character hard state says alive',
    },
  ],
};

const weiHits = MR.collectPriorityHits(GM, {
  keywords: ['Wei Zhongxian'],
  participant: 'Wei Zhongxian',
  purpose: 'confirm life status and location',
}, { turn: GM.turn });

const wei = weiHits.find((h) => h.id === 'hard-char-Wei Zhongxian');
assert(wei, 'collectPriorityHits should include matching character hard state');
assert(!weiHits.some((h) => h.id === 'hard-char-Unrelated Minister'), 'unmatched character hard state should not be recalled');
assert.strictEqual(wei.source, 'hard_state', 'character state should use hard_state source');
assert.strictEqual(wei.sourceId, 'char-wei-source', 'character hard state should retain original character id separately');
assert.strictEqual(wei.status, 'alive', 'living character should expose alive status');
assert.strictEqual(wei.alive, true, 'living character should expose alive boolean');
assert.strictEqual(wei.affects_future, true, 'hard state should be treated as future-affecting');
assert.strictEqual(wei.visibility, 'internal', 'hard state should be internal by default');
assert.strictEqual(wei.hardStateType, 'character', 'hard state should identify its domain');
assert(wei.text.includes('Wei Zhongxian'), 'hard state text should include character name');
assert(wei.text.includes('Beijing'), 'hard state text should include location');
assert(wei.text.includes('Sili Jian Bingbi'), 'hard state text should include official title');

const yuanHits = MR.collectPriorityHits(GM, {
  keywords: ['Yuan Chonghuan'],
  participant: 'Yuan Chonghuan',
}, { turn: GM.turn });
const yuan = yuanHits.find((h) => h.id === 'hard-char-Yuan Chonghuan');
assert(yuan, 'collectPriorityHits should include dead character hard state');
assert.strictEqual(yuan.status, 'dead', 'dead character should expose dead status');
assert.strictEqual(yuan.alive, false, 'dead character should expose alive=false');
assert(yuan.text.includes('executed in prison'), 'dead character hard state should include death reason');
assert.strictEqual(yuan.turn, 65, 'dead character hard state should use deathTurn when present');

const detailed = MR.rankHitsDetailed(weiHits.concat([
  {
    id: 'vec-dead-rumor',
    source: 'vector',
    text: 'old rumor says Wei Zhongxian died',
    sim: 0.99,
    turn: 20,
    importance: 9,
  },
]), { turn: GM.turn, GM });

assert(detailed.ranked.some((h) => h.id === 'hard-char-Wei Zhongxian'), 'hard state should be kept');
const suppressedRumor = detailed.suppressed.find((h) => h.id === 'vec-dead-rumor');
assert(suppressedRumor, 'contradictory vector rumor should be suppressed');
assert.strictEqual(suppressedRumor.reason, 'contradicted', 'hard state contradiction should explain suppression');
assert.strictEqual(suppressedRumor.by, 'hard-char-Wei Zhongxian', 'suppression should name the hard-state source');

console.log('smoke-memory-hard-state-source ok');
