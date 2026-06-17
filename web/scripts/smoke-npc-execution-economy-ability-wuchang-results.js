#!/usr/bin/env node
// smoke-npc-execution-economy-ability-wuchang-results.js - NPC execution outcomes use economy, abilities, and five constants.
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
      name: 'HonestTreasurer',
      alive: true,
      officialTitle: 'RevenueMinister',
      loyalty: 84,
      ambition: 38,
      intelligence: 86,
      administration: 90,
      management: 96,
      charisma: 64,
      diplomacy: 62,
      benevolence: 84,
      integrity: 94,
      location: 'Capital',
      faction: 'Ming',
      wuchangOverride: { '\u4EC1': 88, '\u4E49': 94, '\u793C': 78, '\u667A': 88, '\u4FE1': 96 },
      resources: {
        privateWealth: { money: 1000 },
        publicPurse: { money: 800, grain: 300, cloth: 40 },
        publicTreasury: { linkedPost: 'RevenueMinister', balance: 800, deficit: 7200, isReadOnly: true },
        fame: 18,
        virtueMerit: 360,
        stress: 34
      }
    },
    {
      name: 'CrookedMinister',
      alive: true,
      officialTitle: 'CourtMinister',
      loyalty: 38,
      ambition: 90,
      intelligence: 78,
      administration: 62,
      management: 90,
      charisma: 84,
      diplomacy: 76,
      benevolence: 28,
      integrity: 22,
      location: 'Capital',
      faction: 'Ming',
      party: 'ShadowBloc',
      wuchangOverride: { '\u4EC1': 24, '\u4E49': 18, '\u793C': 48, '\u667A': 78, '\u4FE1': 20 },
      resources: {
        privateWealth: { money: 2400, treasure: 900, commerce: 800 },
        publicPurse: { money: 2600, grain: 300, cloth: 80 },
        publicTreasury: { linkedPost: 'CourtMinister', balance: 2600, deficit: 500, isReadOnly: true },
        hiddenWealth: 1800,
        fame: -30,
        virtueMerit: -120,
        stress: 64
      }
    },
    {
      name: 'DebtorClerk',
      alive: true,
      officialTitle: 'Clerk',
      loyalty: 58,
      ambition: 62,
      intelligence: 68,
      administration: 58,
      management: 86,
      charisma: 52,
      diplomacy: 45,
      benevolence: 48,
      integrity: 52,
      location: 'Capital',
      faction: 'Ming',
      wuchangOverride: { '\u4EC1': 48, '\u4E49': 52, '\u793C': 55, '\u667A': 68, '\u4FE1': 52 },
      resources: {
        privateWealth: { money: -900, debt: 900 },
        fame: -6,
        virtueMerit: 10,
        stress: 76
      }
    },
    {
      name: 'BenevolentGovernor',
      alive: true,
      officialTitle: 'Governor',
      loyalty: 78,
      ambition: 42,
      intelligence: 74,
      administration: 84,
      management: 80,
      charisma: 74,
      diplomacy: 70,
      benevolence: 96,
      integrity: 88,
      location: 'Liaodong',
      jurisdiction: 'Liaodong',
      faction: 'Ming',
      wuchangOverride: { '\u4EC1': 96, '\u4E49': 90, '\u793C': 84, '\u667A': 76, '\u4FE1': 88 },
      resources: {
        privateWealth: { money: 800 },
        publicPurse: { money: 5200, grain: 1200, cloth: 300 },
        publicTreasury: { linkedRegion: 'Liaodong', balance: 5200, deficit: 0, isReadOnly: true },
        fame: 34,
        virtueMerit: 440,
        stress: 32
      }
    }
  ];
  const events = [];
  const ctx = {
    console: console,
    Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp,
    isFinite, isNaN, parseInt, parseFloat, Promise, Symbol, Map, Set,
    setTimeout: function() { return 0; },
    clearTimeout: function() {},
    GM: {
      running: true,
      turn: 11,
      vars: {},
      rels: {},
      facs: [],
      parties: [],
      chars: chars,
      armies: [],
      memorials: [],
      letters: [],
      guoku: { balance: 60000, money: 60000, ledgers: { money: { stock: 60000 } } },
      corruption: { trueIndex: 30, subDepts: { provincial: { true: 30 } } },
      _pendingNpcLetters: [],
      _pendingNpcCorrespondence: [],
      _pendingNpcConspiracies: [],
      _npcHiddenMoves: [],
      _pendingAudiences: [],
      _npcActionLedger: [],
      _npcInternalActionHistory: [],
      _npcExecutionResults: [],
      _npcDecisionDiagnostics: [],
      _capital: 'Capital',
      provinceStats: {
        Liaodong: { prosperity: 42, unrest: 40, security: 42 },
        Capital: { prosperity: 70, unrest: 8, security: 72 }
      },
      officeTree: [
        { name: 'Court', positions: [
          { name: 'RevenueMinister', holder: 'HonestTreasurer', rank: '2' },
          { name: 'CourtMinister', holder: 'CrookedMinister', rank: '2' },
          { name: 'Clerk', holder: 'DebtorClerk', rank: '7' }
        ] },
        { name: 'Province', positions: [
          { name: 'Governor', holder: 'BenevolentGovernor', rank: '4' }
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
    addEB: function(type, text) { events.push({ type: type, text: text }); },
    random: function() { return 0.2; }
  };
  ctx.window = ctx;
  ctx.global = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  return ctx;
}

function executeCard(ctx, npc, type, target) {
  const context = ctx.buildNpcBehaviorContext();
  const card = byType(ctx._buildNpcActionCandidates(npc, context), type);
  assert(card, npc.name + ' should have ' + type + ' ActionCard');
  const ok = ctx._executeNormalizedNpcDecision({
    name: npc.name,
    actionId: card.id,
    target: target || card.target,
    shouldExecute: true
  }, npc, context);
  assert(ok === true, npc.name + ' should execute ' + type);
  return card;
}

function main() {
  const ctx = buildContext();
  load(ctx, 'tm-npc-engine.js');
  load(ctx, 'tm-npc-action-ledger.js');
  load(ctx, 'tm-npc-decision.js');

  const treasurer = ctx.GM.chars[0];
  const crooked = ctx.GM.chars[1];
  const debtor = ctx.GM.chars[2];
  const governor = ctx.GM.chars[3];

  const treasurerDeficitBefore = treasurer.resources.publicTreasury.deficit;
  const treasurerPurseBefore = treasurer.resources.publicPurse.money;
  executeCard(ctx, treasurer, 'office_duty', 'Capital');
  assert(treasurer.resources.publicTreasury.deficit < treasurerDeficitBefore,
    'upright high-management office duty should reduce public treasury deficit');
  assert(treasurer.resources.publicPurse.money > treasurerPurseBefore,
    'upright office duty should replenish the office public purse');

  const crookedHiddenBefore = crooked.resources.hiddenWealth;
  const crookedPurseBefore = crooked.resources.publicPurse.money;
  executeCard(ctx, crooked, 'office_duty', 'Capital');
  assert(crooked.resources.hiddenWealth > crookedHiddenBefore,
    'low yi/xin corrupt office duty should convert part of gains into hidden wealth');
  assert(crooked.resources.publicPurse.money < crookedPurseBefore,
    'corrupt office duty should damage the attached public purse');

  const debtorMoneyBefore = debtor.resources.privateWealth.money;
  executeCard(ctx, debtor, 'private_life', 'DebtorClerk');
  assert(debtor.resources.privateWealth.money > debtorMoneyBefore,
    'debt pressure plus management should make private_life reduce private debt');
  assert(debtor._lastNpcExecution && debtor._lastNpcExecution.economyFit > 0,
    'private_life execution should retain economyFit metadata on the actor');

  const fundsDeficitBefore = treasurer.resources.publicTreasury.deficit;
  const fundsPurseBefore = treasurer.resources.publicPurse.money;
  executeCard(ctx, treasurer, 'request_funds', '朝廷');
  assert(treasurer.resources.publicTreasury.deficit < fundsDeficitBefore,
    'civil request_funds should directly relieve the matching public treasury deficit');
  assert(treasurer.resources.publicPurse.money > fundsPurseBefore,
    'civil request_funds should increase the attached public purse');
  assert(ctx.GM.memorials.some(function(m) { return m.from === 'HonestTreasurer' && m._npcFundingRequest; }),
    'request_funds should still leave an auditable memorial request');

  const unrestBefore = ctx.GM.provinceStats.Liaodong.unrest;
  const reliefPurseBefore = governor.resources.publicPurse.money;
  executeCard(ctx, governor, 'relief', 'Liaodong');
  assert(ctx.GM.provinceStats.Liaodong.unrest <= unrestBefore - 8,
    'high ren/administration relief should beat the old fixed -6 unrest effect');
  assert(governor.resources.publicPurse.money < reliefPurseBefore,
    'relief should consume local public purse funds');

  const prosperityBefore = ctx.GM.provinceStats.Liaodong.prosperity;
  const developPurseBefore = governor.resources.publicPurse.money;
  executeCard(ctx, governor, 'develop_local', 'Liaodong');
  assert(ctx.GM.provinceStats.Liaodong.prosperity >= prosperityBefore + 6,
    'high ability develop_local should beat the old fixed +5 prosperity effect');
  assert(governor.resources.publicPurse.money < developPurseBefore,
    'develop_local should consume public investment funds');

  assert(ctx.GM._npcExecutionResults.length >= 6,
    'executed NPC economic actions should be written to execution result ledger');
  assert(ctx.GM._npcExecutionResults.every(function(r) {
    return typeof r.abilityFit === 'number' && typeof r.wuchangFit === 'number' && typeof r.economyFit === 'number';
  }), 'execution result ledger should retain ability/wuchang/economy fit metadata');
  assert(ctx.GM._npcActionLedger.some(function(x) {
    return x.actor === 'HonestTreasurer' && x.behaviorType === 'office_duty' && x.stateEffects && x.stateEffects.executionResult;
  }), 'NPC action ledger should carry execution result stateEffects');

  console.log('[smoke-npc-execution-economy-ability-wuchang-results] PASS ' + passed + ' assertions');
}

try {
  main();
} catch (err) {
  console.error('[smoke-npc-execution-economy-ability-wuchang-results] FAIL');
  console.error(err && err.stack || err);
  process.exit(1);
}
