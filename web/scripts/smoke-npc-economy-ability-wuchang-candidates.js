#!/usr/bin/env node
// smoke-npc-economy-ability-wuchang-candidates.js - economy, eight abilities, and five constants shape NPC ActionCards.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  passed++;
}

function load(ctx, rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(src, ctx, { filename: rel });
}

function byType(cards, type) {
  return cards.find(function(c) { return c.behaviorType === type; });
}

function buildContext() {
  const chars = [
    {
      id: 'treasurer',
      name: 'HonestTreasurer',
      alive: true,
      officialTitle: 'RevenueMinister',
      loyalty: 82,
      ambition: 42,
      intelligence: 84,
      valor: 30,
      military: 35,
      administration: 88,
      management: 94,
      charisma: 62,
      diplomacy: 55,
      benevolence: 82,
      integrity: 90,
      location: 'Capital',
      faction: 'Ming',
      wuchangOverride: { '仁': 86, '义': 92, '礼': 76, '智': 84, '信': 94 },
      resources: {
        privateWealth: { money: 1200, land: 30 },
        publicPurse: { money: 800, grain: 400, cloth: 60 },
        publicTreasury: { linkedPost: 'RevenueMinister', balance: 800, deficit: 7200, isReadOnly: true },
        fame: 18,
        virtueMerit: 340,
        virtueStage: 4,
        stress: 36
      }
    },
    {
      id: 'debtor',
      name: 'DebtorClerk',
      alive: true,
      officialTitle: 'Clerk',
      loyalty: 58,
      ambition: 68,
      intelligence: 62,
      valor: 30,
      military: 30,
      administration: 55,
      management: 74,
      charisma: 54,
      diplomacy: 45,
      benevolence: 45,
      integrity: 48,
      location: 'Capital',
      faction: 'Ming',
      wuchangOverride: { '仁': 44, '义': 46, '礼': 52, '智': 62, '信': 42 },
      resources: {
        privateWealth: { money: -900, debt: 900 },
        hiddenWealth: 0,
        stress: 72,
        fame: -8,
        virtueMerit: 20
      }
    },
    {
      id: 'crooked',
      name: 'CrookedMinister',
      alive: true,
      officialTitle: 'CourtMinister',
      loyalty: 42,
      ambition: 86,
      intelligence: 78,
      valor: 45,
      military: 40,
      administration: 62,
      management: 88,
      charisma: 82,
      diplomacy: 78,
      benevolence: 32,
      integrity: 28,
      location: 'Capital',
      faction: 'Ming',
      party: 'ShadowBloc',
      wuchangOverride: { '仁': 30, '义': 24, '礼': 48, '智': 78, '信': 22 },
      resources: {
        privateWealth: { money: 2600, treasure: 1200, commerce: 900 },
        hiddenWealth: 4200,
        fame: -26,
        virtueMerit: -80,
        stress: 58
      }
    },
    {
      id: 'governor',
      name: 'BenevolentGovernor',
      alive: true,
      officialTitle: 'Governor',
      loyalty: 76,
      ambition: 44,
      intelligence: 72,
      valor: 35,
      military: 42,
      administration: 82,
      management: 78,
      charisma: 72,
      diplomacy: 68,
      benevolence: 94,
      integrity: 86,
      location: 'Liaodong',
      jurisdiction: 'Liaodong',
      faction: 'Ming',
      wuchangOverride: { '仁': 96, '义': 88, '礼': 82, '智': 74, '信': 86 },
      resources: {
        privateWealth: { money: 900 },
        fame: 32,
        virtueMerit: 420,
        stress: 34
      }
    },
    {
      id: 'general',
      name: 'GeneralStrategist',
      alive: true,
      officialTitle: 'General',
      loyalty: 70,
      ambition: 60,
      intelligence: 80,
      valor: 42,
      military: 96,
      administration: 50,
      management: 48,
      charisma: 65,
      diplomacy: 45,
      benevolence: 62,
      integrity: 70,
      troops: 2000,
      location: 'Frontier',
      faction: 'Ming',
      wuchangOverride: { '仁': 62, '义': 78, '礼': 64, '智': 82, '信': 74 },
      resources: { privateWealth: { money: 1500 }, stress: 40 }
    },
    {
      id: 'diplomat',
      name: 'DiplomatCourtier',
      alive: true,
      officialTitle: 'Envoy',
      loyalty: 62,
      ambition: 74,
      intelligence: 76,
      valor: 25,
      military: 30,
      administration: 58,
      management: 52,
      charisma: 92,
      diplomacy: 95,
      benevolence: 68,
      integrity: 64,
      location: 'Capital',
      faction: 'Ming',
      party: 'CourtBloc',
      wuchangOverride: { '仁': 70, '义': 64, '礼': 92, '智': 76, '信': 68 },
      resources: { privateWealth: { money: 1800 }, fame: 24, stress: 45 }
    }
  ];

  const ctx = {
    console: console,
    Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp,
    isFinite, isNaN, parseInt, parseFloat, Promise, Symbol, Map, Set,
    setTimeout: function() { return 0; },
    clearTimeout: function() {},
    GM: {
      running: true,
      turn: 9,
      vars: {},
      rels: {},
      facs: [],
      parties: [],
      chars: chars,
      armies: [{ name: 'Frontier Army', commander: 'GeneralStrategist', training: 45, morale: 55 }],
      memorials: [],
      letters: [],
      _pendingNpcLetters: [],
      _pendingNpcCorrespondence: [],
      _pendingNpcConspiracies: [],
      _npcHiddenMoves: [],
      _pendingAudiences: [],
      _npcActionLedger: [],
      _npcPlans: [],
      _npcDecisionDiagnostics: [],
      _capital: 'Capital',
      provinceStats: {
        Liaodong: { prosperity: 42, unrest: 38, security: 40 },
        Capital: { prosperity: 70, unrest: 8, security: 72 },
        Frontier: { prosperity: 36, unrest: 24, security: 46 }
      },
      officeTree: [
        { name: 'Court', positions: [
          { name: 'RevenueMinister', holder: 'HonestTreasurer', rank: '2' },
          { name: 'Clerk', holder: 'DebtorClerk', rank: '7' },
          { name: 'CourtMinister', holder: 'CrookedMinister', rank: '2' },
          { name: 'Envoy', holder: 'DiplomatCourtier', rank: '4' }
        ] },
        { name: 'Province', positions: [
          { name: 'Governor', holder: 'BenevolentGovernor', rank: '4' }
        ] },
        { name: 'Army', positions: [
          { name: 'General', holder: 'GeneralStrategist', rank: '3' }
        ] }
      ],
      _turnContext: { npcActionsThisTurn: [] }
    },
    P: { ai: { key: 'test-key' }, traitDefinitions: [], npcEngine: { enabled: true, behaviors: [] } },
    AICache: { cleanup: function(){} },
    _dbg: function(){},
    getTSText: function(turn) { return 'T' + turn; },
    getCompressionParams: function() { return { scale: 1 }; },
    findCharByName: function(name) { return chars.find(function(c) { return c.name === name; }) || null; },
    addEB: function() {},
    random: function() { return 0.2; }
  };
  ctx.window = ctx;
  ctx.global = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  return ctx;
}

function main() {
  const ctx = buildContext();
  load(ctx, 'tm-npc-engine.js');
  load(ctx, 'tm-npc-action-ledger.js');
  load(ctx, 'tm-npc-decision.js'); load(ctx, 'tm-npc-decision-ai-driven.js');

  assert(typeof ctx._buildNpcActionCandidates === 'function',
    'NPC decision layer should expose action candidate builder');

  const context = ctx.buildNpcBehaviorContext();
  const chars = ctx.GM.chars;
  const treasurerCards = ctx._buildNpcActionCandidates(chars[0], context);
  const debtorCards = ctx._buildNpcActionCandidates(chars[1], context);
  const crookedCards = ctx._buildNpcActionCandidates(chars[2], context);
  const governorCards = ctx._buildNpcActionCandidates(chars[3], context);
  const generalCards = ctx._buildNpcActionCandidates(chars[4], context);
  const diplomatCards = ctx._buildNpcActionCandidates(chars[5], context);

  const allCards = [].concat(treasurerCards, debtorCards, crookedCards, governorCards, generalCards, diplomatCards);
  assert(allCards.every(function(c) {
    return typeof c.abilityFit === 'number' && typeof c.wuchangFit === 'number' && typeof c.economyFit === 'number';
  }), 'candidate actions should expose abilityFit, wuchangFit, and economyFit');

  const treasurerOffice = byType(treasurerCards, 'office_duty');
  const treasurerFunds = byType(treasurerCards, 'request_funds');
  assert(treasurerOffice && treasurerOffice.abilityFit > 0 && treasurerOffice.wuchangFit > 0,
    'high management/admin and upright five-constant treasurer should strongly fit office_duty');
  assert(treasurerFunds && treasurerFunds.economyFit > 0,
    'public treasury deficit should create a request_funds ActionCard for a civil official');

  const debtorPrivate = byType(debtorCards, 'private_life');
  assert(debtorPrivate && debtorPrivate.economyFit > 0,
    'private debt should create a private_life ActionCard even for an office holder');
  assert(debtorPrivate.score > byType(debtorCards, 'petition').score,
    'private debt and stress should outrank routine petition for debtor officials');

  const crookedConspire = byType(crookedCards, 'conspire');
  const crookedObstruct = byType(crookedCards, 'obstruct');
  assert(crookedConspire && crookedConspire.wuchangFit > 0 && crookedConspire.economyFit > 0,
    'hidden wealth plus low yi/xin should push crooked officials toward conspiracy');
  assert(crookedObstruct && crookedObstruct.wuchangFit > 0,
    'low five-constant trust/righteousness should increase obstruction fit');

  const relief = byType(governorCards, 'relief');
  const develop = byType(governorCards, 'develop_local');
  assert(relief && relief.wuchangFit > 0 && relief.abilityFit > 0,
    'benevolence and ren should improve relief fit');
  assert(relief.score >= develop.score,
    'benevolent governor in an unrest province should prefer relief over generic development');

  const train = byType(generalCards, 'train_troops');
  assert(train && train.abilityFit > 0,
    'high military ability should improve train_troops even when personal valor is modest');

  const network = byType(diplomatCards, 'build_network');
  const privateLetter = byType(diplomatCards, 'private_correspondence');
  assert(network && network.abilityFit > 0 && network.wuchangFit > 0,
    'high diplomacy/charisma and li should improve build_network');
  assert(privateLetter && privateLetter.abilityFit > 0,
    'high diplomacy/charisma should improve private correspondence');

  console.log('[smoke-npc-economy-ability-wuchang-candidates] PASS ' + passed + ' assertions');
}

try {
  main();
} catch (err) {
  console.error('[smoke-npc-economy-ability-wuchang-candidates] FAIL');
  console.error(err && err.stack || err);
  process.exit(1);
}
