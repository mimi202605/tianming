#!/usr/bin/env node
// Regression smoke: NPC faction systems must skip fac.isPlayer even if P.playerInfo.factionName is wrong.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function runFile(ctx, file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
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
  Set
};
ctx.window = ctx;
ctx.global = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);

[
  'tm-faction-npc-memorial.js',
  'tm-faction-npc-edict.js',
  'tm-faction-npc-chaoyi.js',
  'tm-faction-npc-office.js',
  'tm-faction-npc-guoku.js'
].forEach(function(file) { runFile(ctx, file); });

ctx.P = {
  playerInfo: { factionName: 'wrong-player-name' },
  conf: {}
};
ctx.GM = {
  turn: 12,
  facs: [
    { name: 'PlayerMarked', isPlayer: true, treasury: { money: 900000 }, derivedEconomy: { monthlyIncome: 200000, monthlyExpense: 100000, fiscalStress: 10 } },
    { name: 'NpcNeighbor', treasury: { money: 300000 }, derivedEconomy: { monthlyIncome: 50000, monthlyExpense: 40000, fiscalStress: 20 } }
  ],
  chars: [
    { name: 'PlayerRuler', faction: 'PlayerMarked', role: 'ruler', loyalty: 80, alive: true },
    { name: 'PlayerMinister', faction: 'PlayerMarked', role: 'court', loyalty: 70, alive: true },
    { name: 'NpcRuler', faction: 'NpcNeighbor', role: 'ruler', loyalty: 70, alive: true },
    { name: 'NpcMinister', faction: 'NpcNeighbor', role: 'court', loyalty: 65, alive: true }
  ],
  parties: [
    { name: 'NpcCourt', faction: 'NpcNeighbor', loyalty: 60 },
    { name: 'NpcArmy', faction: 'NpcNeighbor', loyalty: 55 }
  ],
  _facIndex: {
    PlayerMarked: { fac: null, chars: [], armies: [], parties: [] },
    NpcNeighbor: { fac: null, chars: [], armies: [], parties: [] }
  }
};
ctx.GM._facIndex.PlayerMarked.fac = ctx.GM.facs[0];
ctx.GM._facIndex.PlayerMarked.chars = ctx.GM.chars.filter(function(c) { return c.faction === 'PlayerMarked'; });
ctx.GM._facIndex.NpcNeighbor.fac = ctx.GM.facs[1];
ctx.GM._facIndex.NpcNeighbor.chars = ctx.GM.chars.filter(function(c) { return c.faction === 'NpcNeighbor'; });
ctx.GM._facIndex.NpcNeighbor.parties = ctx.GM.parties;

ctx.TM.FactionNpcMemorial.generate();
ctx.TM.FactionNpcEdict.generate();
ctx.TM.FactionNpcChaoyi.generate();
ctx.TM.FactionNpcOffice.generate();
ctx.TM.FactionNpcGuoku.generate();

const player = ctx.GM.facs[0];
assert(!player.npcMemorials || player.npcMemorials.length === 0, 'isPlayer faction must not get NPC memorials');
assert(!player.npcEdicts || player.npcEdicts.length === 0, 'isPlayer faction must not get NPC edicts');
assert(!player.npcChaoyi || player.npcChaoyi.length === 0, 'isPlayer faction must not get NPC chaoyi');
assert(!player.npcOfficeActions || player.npcOfficeActions.length === 0, 'isPlayer faction must not get NPC office actions');
assert(!player.npcFiscalLedger || player.npcFiscalLedger.length === 0, 'isPlayer faction must not get NPC fiscal ledger');
assert(player.treasury.money === 900000, 'isPlayer faction treasury must not be changed by NPC fiscal cycle');

ctx.P.playerInfo.factionName = '';
ctx.GM = {
  turn: 13,
  playerFaction: 'PlayerByGM',
  facs: [
    { name: 'PlayerByGM', treasury: { money: 910000 }, derivedEconomy: { monthlyIncome: 200000, monthlyExpense: 100000, fiscalStress: 10 } },
    { name: 'NpcByGMNeighbor', treasury: { money: 300000 }, derivedEconomy: { monthlyIncome: 50000, monthlyExpense: 40000, fiscalStress: 20 } }
  ],
  chars: [
    { name: 'PlayerByGMRuler', faction: 'PlayerByGM', role: 'ruler', loyalty: 80, alive: true },
    { name: 'PlayerByGMMinister', faction: 'PlayerByGM', role: 'court', loyalty: 70, alive: true },
    { name: 'NpcByGMRuler', faction: 'NpcByGMNeighbor', role: 'ruler', loyalty: 70, alive: true },
    { name: 'NpcByGMMinister', faction: 'NpcByGMNeighbor', role: 'court', loyalty: 65, alive: true }
  ],
  parties: [
    { name: 'NpcByGMCourt', faction: 'NpcByGMNeighbor', loyalty: 60 },
    { name: 'NpcByGMArmy', faction: 'NpcByGMNeighbor', loyalty: 55 }
  ],
  _facIndex: {
    PlayerByGM: { fac: null, chars: [], armies: [], parties: [] },
    NpcByGMNeighbor: { fac: null, chars: [], armies: [], parties: [] }
  }
};
ctx.GM._facIndex.PlayerByGM.fac = ctx.GM.facs[0];
ctx.GM._facIndex.PlayerByGM.chars = ctx.GM.chars.filter(function(c) { return c.faction === 'PlayerByGM'; });
ctx.GM._facIndex.NpcByGMNeighbor.fac = ctx.GM.facs[1];
ctx.GM._facIndex.NpcByGMNeighbor.chars = ctx.GM.chars.filter(function(c) { return c.faction === 'NpcByGMNeighbor'; });
ctx.GM._facIndex.NpcByGMNeighbor.parties = ctx.GM.parties;

ctx.TM.FactionNpcMemorial.generate();
ctx.TM.FactionNpcEdict.generate();
ctx.TM.FactionNpcChaoyi.generate();
ctx.TM.FactionNpcOffice.generate();
ctx.TM.FactionNpcGuoku.generate();

const playerByGM = ctx.GM.facs[0];
assert(!playerByGM.npcMemorials || playerByGM.npcMemorials.length === 0, 'GM.playerFaction must not get NPC memorials');
assert(!playerByGM.npcEdicts || playerByGM.npcEdicts.length === 0, 'GM.playerFaction must not get NPC edicts');
assert(!playerByGM.npcChaoyi || playerByGM.npcChaoyi.length === 0, 'GM.playerFaction must not get NPC chaoyi');
assert(!playerByGM.npcOfficeActions || playerByGM.npcOfficeActions.length === 0, 'GM.playerFaction must not get NPC office actions');
assert(!playerByGM.npcFiscalLedger || playerByGM.npcFiscalLedger.length === 0, 'GM.playerFaction must not get NPC fiscal ledger');
assert(playerByGM.treasury.money === 910000, 'GM.playerFaction treasury must not be changed by NPC fiscal cycle');

console.log('[smoke-faction-npc-isplayer-guard] all assertions pass');
