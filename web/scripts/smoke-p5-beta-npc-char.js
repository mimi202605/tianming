#!/usr/bin/env node
// smoke-p5-beta-npc-char.js - Phase 5 beta NPC/Char namespace facade gate.
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

function fn(name) {
  const f = function() {};
  Object.defineProperty(f, 'name', { value: name });
  return f;
}

const ctx = {
  document: { readyState: 'loading', addEventListener: function(){} },
  setTimeout: function() {},
  console: console,
  Object: Object,
  Array: Array,
  Promise: Promise,
  Proxy: Proxy
};
ctx.window = ctx;
ctx.globalThis = ctx;
ctx.addEventListener = function(){};

ctx.NpcEngine = {
  initialize: fn('npcEngineInitialize'),
  runEngine: fn('npcEngineRunEngine'),
  completePlayerTask: fn('npcEngineCompletePlayerTask'),
  getPlayerTasks: fn('npcEngineGetPlayerTasks'),
  switchPlayerCharacter: fn('npcEngineSwitchPlayerCharacter'),
  reset: fn('npcEngineReset')
};
ctx.InteractionSystem = {
  initialize: fn('interactionInitialize'),
  getAvailableInteractions: fn('interactionGetAvailable'),
  executeInteraction: fn('interactionExecute'),
  reset: fn('interactionReset')
};
ctx.NpcBehaviorRegistry = {
  register: fn('registerBehavior'),
  list: fn('listBehaviors'),
  execute: fn('executeBehavior')
};

[
  'executeNpcBehaviors', 'batchNpcDecisions', 'npcDecisionLayer',
  'buildNpcDecisionPrompt', 'buildNpcBehaviorContext', 'selectImportantNpcs',
  'findNpcOffice', 'hasOffice',
  'getCharacterPersonalityBrief', 'getNpcPersonalityInjection',
  'buildNpcContext', 'getCharacterFromContext', 'getFactionFromContext',
  'getVariableFromContext', 'getRelationFromContext', 'getOpinionFromContext',
  'getMilitaryStrengthFromContext', 'getEconomicLevelFromContext',
  'calculateDecisionWeight', 'evaluateCondition', 'generateDecisionsForActor',
  'executeNpcDecisions'
].forEach(function(name) { ctx[name] = fn(name); });

ctx.CentralizationSystem = { runSettlement: fn('centralizationRun') };
ctx.TerritoryProductionSystem = { calculateAll: fn('territoryCalculateAll') };

ctx.CharFullSchema = {
  ensureAll: fn('schemaEnsureAll'),
  ensureFullFields: fn('schemaEnsureFullFields'),
  toAIContext: fn('schemaToAIContext')
};
ctx.CharEconEngine = {
  tick: fn('charEconTick'),
  ensureCharResources: fn('charEconEnsure'),
  adjustFame: fn('charEconAdjustFame')
};
ctx.CharArcs = {
  advance: fn('charArcsAdvance'),
  abort: fn('charArcsAbort'),
  buildForSysP: fn('charArcsBuildForSysP'),
  ensureBeforeEndturn: fn('charArcsEnsureBeforeEndturn')
};
[
  'aiGenerateCompleteCharacter', 'edictRecruitCharacter',
  'parseEdictRecruitPatterns', 'handleEdictTextForRecruit',
  'crystallizePendingCharacter', 'addPendingCharacter',
  'scanMentionedCharacters', 'wrapPendingName', 'decoratePendingInDom',
  'purgeBlacklistedCharacters',
  'listProfilesByDynasty', 'listProfilesByRole', 'createCharFromProfile',
  'loadHistoricalCharsFromScenario',
  'renderCharResourcesSection', '_charConfiscate', '_charInspect'
].forEach(function(name) { ctx[name] = fn(name); });
ctx.HISTORICAL_CHAR_PROFILES = {
  baseOne: { name: 'baseOne' },
  waveOne: { name: 'waveOne' }
};

vm.createContext(ctx);

function load(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(src, ctx, { filename: rel });
}

load('tm-namespaces.js');

const TM = ctx.TM;

assert(TM && typeof TM === 'object', 'TM should exist');
assert(TM.NPC && typeof TM.NPC === 'object', 'TM.NPC should exist');
assert(TM.Char && typeof TM.Char === 'object', 'TM.Char should exist');
assert(TM.namespaces.NPC === TM.NPC, 'TM.namespaces.NPC should point at TM.NPC');
assert(TM.namespaces.Char === TM.Char, 'TM.namespaces.Char should point at TM.Char');

assert(TM.NPC.engine === ctx.NpcEngine, 'TM.NPC.engine should alias NpcEngine');
assert(TM.NPC.interactions === ctx.InteractionSystem, 'TM.NPC.interactions should alias InteractionSystem');
assert(TM.NPC.behaviors === ctx.NpcBehaviorRegistry, 'TM.NPC.behaviors should alias NpcBehaviorRegistry');
assert(TM.NPC.engine.runEngine === ctx.NpcEngine.runEngine, 'NPC engine method should be same reference');
assert(TM.NPC.interactions.executeInteraction === ctx.InteractionSystem.executeInteraction, 'interaction method should be same reference');
assert(TM.NPC.behaviors.register === ctx.NpcBehaviorRegistry.register, 'behavior registry method should be same reference');

[
  'executeNpcBehaviors', 'batchNpcDecisions', 'npcDecisionLayer',
  'buildNpcDecisionPrompt', 'buildNpcBehaviorContext', 'selectImportantNpcs',
  'findNpcOffice', 'hasOffice'
].forEach(function(name) {
  assert(TM.NPC.decision[name] === ctx[name], 'TM.NPC.decision.' + name + ' should alias legacy global');
});
assert(TM.NPC.decision.has('executeNpcBehaviors'), 'TM.NPC.decision.has should detect available functions');
assert(TM.NPC.decision.listMissing().length === 0, 'TM.NPC.decision should have no missing mocked refs');

[
  'getCharacterPersonalityBrief', 'getNpcPersonalityInjection'
].forEach(function(name) {
  assert(TM.NPC.personality[name] === ctx[name], 'TM.NPC.personality.' + name + ' should alias legacy global');
});

[
  'buildNpcContext', 'getCharacterFromContext', 'getFactionFromContext',
  'getVariableFromContext', 'getRelationFromContext', 'getOpinionFromContext',
  'getMilitaryStrengthFromContext', 'getEconomicLevelFromContext',
  'calculateDecisionWeight', 'evaluateCondition', 'generateDecisionsForActor',
  'executeNpcDecisions'
].forEach(function(name) {
  assert(TM.NPC.legacy[name] === ctx[name], 'TM.NPC.legacy.' + name + ' should alias legacy global');
});

assert(!Object.prototype.hasOwnProperty.call(TM.NPC, 'CentralizationSystem'),
  'TM.NPC must not expose CentralizationSystem');
assert(!Object.prototype.hasOwnProperty.call(TM.NPC, 'TerritoryProductionSystem'),
  'TM.NPC must not expose TerritoryProductionSystem');

assert(TM.Char.schema === ctx.CharFullSchema, 'TM.Char.schema should alias CharFullSchema');
assert(TM.Char.economy === ctx.CharEconEngine, 'TM.Char.economy should alias CharEconEngine');
assert(TM.Char.arcs === ctx.CharArcs, 'TM.Char.arcs should alias CharArcs');
assert(TM.Char.schema.ensureAll === ctx.CharFullSchema.ensureAll, 'Char schema method should be same reference');
assert(TM.Char.economy.tick === ctx.CharEconEngine.tick, 'Char economy tick should be same reference');
assert(TM.Char.arcs.buildForSysP === ctx.CharArcs.buildForSysP, 'Char arcs buildForSysP should be same reference');

[
  'aiGenerateCompleteCharacter', 'edictRecruitCharacter',
  'parseEdictRecruitPatterns', 'handleEdictTextForRecruit',
  'crystallizePendingCharacter', 'addPendingCharacter',
  'scanMentionedCharacters', 'wrapPendingName', 'decoratePendingInDom',
  'purgeBlacklistedCharacters'
].forEach(function(name) {
  assert(TM.Char.autogen[name] === ctx[name], 'TM.Char.autogen.' + name + ' should alias legacy global');
});
assert(TM.Char.autogen.has('scanMentionedCharacters'), 'TM.Char.autogen.has should detect scanMentionedCharacters');

assert(TM.Char.historical.profiles === ctx.HISTORICAL_CHAR_PROFILES,
  'TM.Char.historical.profiles should alias HISTORICAL_CHAR_PROFILES');
assert(Object.keys(TM.Char.historical.profiles).length === 2,
  'TM.Char.historical.profiles should expose shared profile table');
assert(TM.Char.historical.listByDynasty === ctx.listProfilesByDynasty,
  'TM.Char.historical.listByDynasty should alias legacy global');
assert(TM.Char.historical.listByRole === ctx.listProfilesByRole,
  'TM.Char.historical.listByRole should alias legacy global');
assert(TM.Char.historical.createFromProfile === ctx.createCharFromProfile,
  'TM.Char.historical.createFromProfile should alias legacy global');
assert(TM.Char.historical.loadFromScenario === ctx.loadHistoricalCharsFromScenario,
  'TM.Char.historical.loadFromScenario should alias legacy global');

assert(typeof ctx._charConfiscate === 'function', 'legacy _charConfiscate should remain global');
assert(typeof ctx._charInspect === 'function', 'legacy _charInspect should remain global');
assert(TM.Char.ui.renderResourcesSection === ctx.renderCharResourcesSection,
  'TM.Char.ui.renderResourcesSection should alias renderCharResourcesSection');
assert(TM.Char.ui.confiscate === ctx._charConfiscate,
  'TM.Char.ui.confiscate should alias _charConfiscate');
assert(TM.Char.ui.inspect === ctx._charInspect,
  'TM.Char.ui.inspect should alias _charInspect');

const report = TM.namespaces.report();
assert(report && typeof report === 'object', 'TM.namespaces.report should still work');
const verify = TM.namespaces.verify();
assert(verify && verify.facades && Array.isArray(verify.warnings), 'TM.namespaces.verify should still return expected shape');

console.log('[smoke-p5-beta-npc-char] pass assertions=' + passed);
