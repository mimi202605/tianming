const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const envelopePath = path.join(ROOT, 'tm-memory-envelope.js');
assert(fs.existsSync(envelopePath), 'tm-memory-envelope.js should exist');

const src = fs.readFileSync(envelopePath, 'utf8');
const sandbox = { console, Date, Math, JSON, window: {} };
sandbox.window.window = sandbox.window;
vm.runInNewContext(src, sandbox.window, { filename: 'tm-memory-envelope.js' });

const ME = sandbox.window.TM && sandbox.window.TM.MemoryEnvelope;
assert(ME, 'TM.MemoryEnvelope should be exported');
assert.strictEqual(typeof ME.collect, 'function', 'MemoryEnvelope should expose collect');
assert.strictEqual(typeof ME.hashText, 'function', 'MemoryEnvelope should expose hashText');

const GM = {
  turn: 90,
  chars: [
    { id: 'char-wei-source', name: 'Wei Zhongxian', alive: true, location: 'Beijing', officialTitle: 'Sili Jian Bingbi', lastUpdateTurn: 89 },
  ],
  activeEdicts: [
    { id: 'edict-river', status: 'active', category: 'river', content: 'Repair the southern canal', startedTurn: 88 },
  ],
  _npcCommitments: {
    Sun: [{ id: 'commit-sun', status: 'pending', task: 'submit border memorial', assignedTurn: 89 }],
  },
  shijiHistory: [
    { id: 'shiji-1', turn: 87, shilu: 'Court debated canal repairs.' },
  ],
  _foreshadows: [
    { id: 'fore-1', turn: 86, content: 'Canal merchants quietly resist.' },
  ],
};

const envelopes = ME.collect(GM, {
  sc1q: {
    dialogue_commitments: [
      { id: 'dialogue-1', npc: 'Yuan', task: 'inspect Ningyuan', deadline: 'next turn' },
    ],
  },
});

assert(envelopes.length >= 5, 'collect should project multiple legacy memory sources');
assert(envelopes.every((e) => e.id && e.type && e.body), 'each envelope should have id/type/body');
assert(envelopes.every((e) => Array.isArray(e.sourceRefs) && e.sourceRefs.length > 0), 'each envelope should carry sourceRefs');
assert(envelopes.every((e) => e.contentHash), 'each envelope should carry contentHash');

const hard = envelopes.find((e) => e.id === 'hard-char-Wei Zhongxian');
assert(hard, 'character hard state envelope should exist');
assert.strictEqual(hard.type, 'hard_state', 'character envelope should be hard_state');
assert.strictEqual(hard.authority, 'engine_state', 'hard_state should use engine_state authority');
assert.strictEqual(hard.visibility, 'world_truth', 'hard_state should default to world_truth visibility');
assert.strictEqual(hard.lane, 'L1_world_truth', 'hard_state should map to world truth lane');
assert(hard.sourceRefs.some((r) => r.type === 'char' && r.id === 'char-wei-source'), 'hard_state should point back to source character');
assert(hard.entities.includes('Wei Zhongxian'), 'hard_state should list character entity');

const edict = envelopes.find((e) => e.id === 'edict-river');
assert(edict, 'active edict envelope should exist');
assert.strictEqual(edict.type, 'active_law', 'edict should map to active_law type');
assert.strictEqual(edict.authority, 'player_pin', 'active edict should be player_pin authority');
assert.strictEqual(edict.lane, 'L2_active_law_commitment', 'active edict should map to law/commitment lane');

const commit = envelopes.find((e) => e.id === 'commit-sun');
assert(commit, 'NPC commitment envelope should exist');
assert.strictEqual(commit.type, 'commitment', 'commitment should map to commitment type');
assert.strictEqual(commit.status, 'active', 'pending legacy commitment should become active envelope');

console.log('smoke-memory-envelope-facade ok');
