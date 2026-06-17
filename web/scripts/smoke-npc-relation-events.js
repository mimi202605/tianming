const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = {
  console,
  Date,
  Math,
  JSON,
  window: {},
};
sandbox.window.window = sandbox.window;
sandbox.window.GM = {
  turn: 8,
  chars: [
    { id: 'c-hairui', name: '海瑞', alive: true },
    { id: 'c-zhang', name: '张居正', alive: true },
  ],
};
sandbox.window.findCharByName = function(name) {
  return sandbox.window.GM.chars.find((c) => c.name === name);
};
sandbox.window.NpcMemorySystem = { remember() {} };

[
  'tm-memory-trace.js',
  'tm-memory-evidence-registry.js',
  'tm-memory-source-bound.js',
  'tm-memory-envelope.js',
  'tm-memory-retrieval.js',
  'tm-relations.js',
].forEach((file) => {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox.window, { filename: file });
});

const GM = sandbox.window.GM;
assert.strictEqual(typeof sandbox.window.applyNpcInteraction, 'function', 'applyNpcInteraction should be available');

const ok = sandbox.window.applyNpcInteraction('海瑞', '张居正', 'impeach', { description: '海瑞劾张居正夺情' });
assert.strictEqual(ok, true, 'interaction should apply');
assert(Array.isArray(GM._npcRelationEvents), 'NPC interactions should append GM._npcRelationEvents');
assert.strictEqual(GM._npcRelationEvents.length, 1, 'one relation event should be recorded');

const evt = GM._npcRelationEvents[0];
assert(evt.id && evt.contentHash, 'relation event should have stable id and contentHash');
assert.strictEqual(evt.actor, '海瑞', 'relation event should keep actor');
assert.strictEqual(evt.target, '张居正', 'relation event should keep target');
assert.strictEqual(evt.kind, 'impeach', 'relation event should keep kind');
assert(evt.text.includes('夺情'), 'relation event should preserve event text');
assert(evt.importance >= 8, 'important relation event should preserve importance');
assert(Array.isArray(evt.sourceRefs) && evt.sourceRefs[0].type === 'npcRelationEvent', 'relation event should carry sourceRefs');

const ME = sandbox.window.TM && sandbox.window.TM.MemoryEnvelope;
const MR = sandbox.window.TM && sandbox.window.TM.MemoryRetrieval;
const envelopes = ME.collect(GM, { turn: GM.turn });
const env = envelopes.find((e) => e.type === 'relationship_event');
assert(env, 'relation events should project to relationship_event envelope');
assert.strictEqual(env.authority, 'event_log', 'relationship_event should be event_log authority');
assert(env.entities.includes('海瑞') && env.entities.includes('张居正'), 'relationship_event should keep entities');
assert.strictEqual(env.basisRefs[0].id, evt.id, 'relationship_event should keep event as basis ref');

const hits = MR.collectPriorityHits(GM, { keywords: ['夺情'], participant: '张居正' }, { turn: GM.turn });
const hit = hits.find((h) => h.source === 'relation_event');
assert(hit, 'relation events should be retrievable by keyword/participant');
assert(hit._score == null, 'priority collection should not pre-score relation events');
assert.strictEqual(hit.authority, 'event_log', 'relation hit should preserve authority');

console.log('smoke-npc-relation-events ok');
