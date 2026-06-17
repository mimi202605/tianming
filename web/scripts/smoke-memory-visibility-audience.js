const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { console, Date, Math, JSON, window: {} };
sandbox.window.window = sandbox.window;

vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'tm-memory-retrieval.js'), 'utf8'), sandbox.window, {
  filename: 'tm-memory-retrieval.js',
});

const MR = sandbox.window.TM && sandbox.window.TM.MemoryRetrieval;
assert(MR, 'TM.MemoryRetrieval should be exported');

const npcView = MR.rankHitsDetailed([
  { id: 'public-1', source: 'shiji', text: 'public court record', visibility: 'public', turn: 10 },
  { id: 'player-note', source: 'accepted_memory', text: 'player private plan', visibility: 'player_known', turn: 10 },
  { id: 'npc-other', source: 'accepted_memory', text: 'other npc secret', visibility: 'npc_private', audience: ['npc-li'], turn: 10 },
  { id: 'npc-self', source: 'accepted_memory', text: 'self npc secret', visibility: 'npc_private', audience: ['npc-wang'], turn: 10 },
], { turn: 12, audience: 'npc', actorId: 'npc-wang' });

assert(npcView.ranked.some((h) => h.id === 'public-1'), 'npc view should keep public memory');
assert(npcView.ranked.some((h) => h.id === 'npc-self'), 'npc view should keep private memory addressed to actor');
assert(npcView.suppressed.some((s) => s.id === 'player-note' && s.reason === 'audience_scope'), 'npc view should suppress player-only memory');
assert(npcView.suppressed.some((s) => s.id === 'npc-other' && s.reason === 'audience_scope'), 'npc view should suppress other npc private memory');

const playerView = MR.rankHitsDetailed([
  { id: 'player-note', source: 'accepted_memory', text: 'player private plan', visibility: 'player_known', turn: 10 },
], { turn: 12, audience: 'player' });
assert(playerView.ranked.some((h) => h.id === 'player-note'), 'player view should keep player-known memory');

const gmView = MR.rankHitsDetailed([
  { id: 'player-note', source: 'accepted_memory', text: 'player private plan', visibility: 'player_known', turn: 10 },
  { id: 'heaven', source: 'accepted_memory', text: 'hidden gm fact', visibility: 'heaven_secret', turn: 10 },
], { turn: 12 });
assert(gmView.ranked.some((h) => h.id === 'player-note'), 'default gm view should keep player-known memory');
assert(gmView.suppressed.some((s) => s.id === 'heaven' && s.reason === 'hidden'), 'hidden/heaven secret should remain hidden by default');

console.log('smoke-memory-visibility-audience ok');
