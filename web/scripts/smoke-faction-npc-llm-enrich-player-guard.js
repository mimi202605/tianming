#!/usr/bin/env node
// Regression smoke: cosmetic NPC LLM enrich must skip the player faction too.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const ctx = {
  console: { log() {}, warn() {} },
  Math,
  Date,
  JSON,
  Object,
  Array,
  Number,
  String,
  Boolean,
  RegExp,
  isFinite,
  parseInt,
  parseFloat,
  Promise
};
ctx.window = ctx;
ctx.global = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-npc-llm-enrich.js'), 'utf8'), ctx, {
  filename: 'tm-faction-npc-llm-enrich.js'
});

ctx.TM.FactionNpcSettings = {
  isAiPrecisionEnabled() { return true; },
  maxPerTurn() { return 8; }
};
ctx.P = {
  playerInfo: { factionName: '' },
  conf: { npcAiPrecision: true },
  ai: { key: 'fake' },
  scenarioName: 'smoke'
};
ctx.GM = {
  turn: 3,
  playerFaction: 'PlayerByGM',
  facs: [
    {
      name: 'PlayerByGM',
      npcMemorials: [{ content: 'player memorial' }],
      npcEdicts: [{ content: 'player edict' }],
      derivedStrength: { value: 999 }
    },
    {
      name: 'NpcNeighbor',
      npcMemorials: [{ content: 'npc memorial' }],
      npcEdicts: [{ content: 'npc edict' }],
      derivedStrength: { value: 1 }
    }
  ],
  chars: []
};

let calls = 0;
ctx.callAI = function() {
  calls++;
  return Promise.resolve('enriched');
};

ctx.TM.FactionNpcLlmEnrich.enrichRecent().then(function(ret) {
  assert(ret && ret.attempted === 2, 'only the NPC memorial and edict should be attempted');
  assert(calls === 2, 'LLM enrich should not call for player faction items');
  assert(!ctx.GM.facs[0].npcMemorials[0]._enrichedContent, 'player memorial must not be enriched');
  assert(!ctx.GM.facs[0].npcEdicts[0]._enrichedContent, 'player edict must not be enriched');
  assert(ctx.GM.facs[1].npcMemorials[0]._enrichedContent === 'enriched', 'NPC memorial should be enriched');
  assert(ctx.GM.facs[1].npcEdicts[0]._enrichedContent === 'enriched', 'NPC edict should be enriched');
  return ctx.TM.FactionNpcLlmEnrich.enrichFaction('PlayerByGM');
}).then(function(ret) {
  assert(ret && ret.skipped && ret.reason === 'player faction', 'direct enrichFaction must skip GM.playerFaction');
  console.log('[smoke-faction-npc-llm-enrich-player-guard] all assertions pass');
}).catch(function(err) {
  console.error('[smoke-faction-npc-llm-enrich-player-guard] failed:', err && err.stack || err);
  process.exit(1);
});
