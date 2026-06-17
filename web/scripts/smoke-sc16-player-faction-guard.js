#!/usr/bin/env node
// Regression smoke: SC16 faction simulation must never make the player faction act autonomously.

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
  isNaN,
  Set,
  Promise
};
ctx.window = ctx;
ctx.global = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);

vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-endturn-followup.js'), 'utf8'), ctx, {
  filename: 'tm-endturn-followup.js'
});

const followup = ctx.TM && ctx.TM.Endturn && ctx.TM.Endturn.AI && ctx.TM.Endturn.AI.followup;
assert(followup, 'followup export missing');
assert(typeof followup._resolvePlayerFactionNameForAi === 'function', 'SC16 player faction resolver missing');
assert(typeof followup._isPlayerFactionForAi === 'function', 'SC16 player faction predicate missing');
assert(typeof followup._filterSc16PlayerOutputs === 'function', 'SC16 output filter missing');

const G = {
  playerFaction: 'MingCourt',
  facs: [
    { name: 'MingCourt' },
    { name: 'LaterJin' }
  ],
  chars: []
};
assert(followup._resolvePlayerFactionNameForAi(G, { playerInfo: {} }) === 'MingCourt', 'resolver must fall back to GM.playerFaction');
assert(followup._isPlayerFactionForAi({ name: 'MingCourt' }, 'MingCourt'), 'predicate must match the resolved player faction name');
assert(!followup._isPlayerFactionForAi({ name: 'LaterJin' }, 'MingCourt'), 'predicate must leave NPC factions alone');

let p16 = {
  faction_actions: [
    { faction: 'MingCourt', action: 'player should not auto-act' },
    { faction: 'LaterJin', action: 'npc can act' }
  ],
  diplomatic_shifts: [
    { from: 'MingCourt', to: 'LaterJin', new_relation: 'hostile' },
    { from: 'LaterJin', to: 'MingCourt', new_relation: 'hostile' }
  ]
};
p16 = followup._filterSc16PlayerOutputs(p16, 'MingCourt');
assert(p16.faction_actions.length === 1 && p16.faction_actions[0].faction === 'LaterJin', 'filter must remove player faction actions');
assert(p16.diplomatic_shifts.length === 1 && p16.diplomatic_shifts[0].from === 'LaterJin', 'filter must remove player-origin diplomacy but keep NPC-to-player diplomacy');
assert(p16._playerFactionGuard && p16._playerFactionGuard.removedFactionActions === 1, 'filter should report removed player actions');
assert(p16._playerFactionGuard.removedDiplomaticShifts === 1, 'filter should report removed player diplomacy');

const src = fs.readFileSync(path.join(ROOT, 'tm-endturn-followup.js'), 'utf8');
assert(src.indexOf('玩家势力不得作为行动发起方') >= 0, 'SC16 prompt must explicitly forbid player faction actors');

console.log('[smoke-sc16-player-faction-guard] all assertions pass');
