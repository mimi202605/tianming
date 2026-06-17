#!/usr/bin/env node
// smoke-p5-delta-fiscal.js — Phase 5 P5-δ Fiscal/Economy/Guoku/Neitang facade fill gate.
// 验·4 sub-ns 同时填·R87 facade 不破·R10 dead-code rescue·sub-ns tick 强隔离

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

// ─── 最小 vm context ───
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

// ─── mock·R87 economy 顶层 fn (whitelist 20 fn 源) ───
[
  'getTributeRatio', 'calculateMonthlyIncome', 'updateEconomy',
  'recalculateEconomy', 'recalculatePowerStructure', 'triggerDynastyPhaseEvent',
  'updateFactions', 'updateParties', 'updateClasses', 'updateCharacters',
  'calculateInheritanceScore',
  'analyzeBattleStrategy', 'calculateArmyStrength', 'recommendTactics',
  'predictBattleOutcome', 'executeTactic',
  'getUnitTypes', 'initUnitSystem', 'createUnit',
  'calculateUnitCombatPower', 'calculateArmyCombatPowerByUnits'
].forEach(function(name) { ctx[name] = fn(name); });

// ─── mock·R87 guoku panel 21 fn ───
[
  '_guokuFmt', '_guokuTabJump', 'openGuokuPanel', 'closeGuokuPanel',
  'renderGuokuPanel', '_guoku_confirm',
  '_guoku_extraTax', '_guoku_doExtraTax',
  '_guoku_openGranary', '_guoku_doOpenGranary',
  '_guoku_takeLoan', '_guoku_openLoanDialog', '_guoku_showLoans',
  '_guoku_cutOfficials', '_guoku_reduceTax',
  '_guoku_issuePaper', '_guoku_viewReform', '_guoku_doEnactReform',
  '_guoku_lightCoin', '_guoku_doLightCoin',
  '_guoku_aiDecreeOpen', '_guoku_aiDecreeExec'
].forEach(function(name) { ctx[name] = fn(name); });

// ─── mock·R87 neitang panel 11 fn ───
[
  '_neitangFmt', '_neitangTabJump',
  'openNeitangPanel', 'closeNeitangPanel', 'renderNeitangPanel',
  '_neitang_renderTrendSection', '_neitang_transferFromGuoku',
  '_neitang_rescueGuoku', '_neitang_enableSpecial',
  '_neitang_disableSpecial', '_neitang_ceremony'
].forEach(function(name) { ctx[name] = fn(name); });

// ─── mock·FiscalEngine (R10 redistribute 后·api·12 keys) ───
ctx.FiscalEngine = {
  VERSION: 1,
  DEFAULT_TAXES: { land: 0.5, salt: 0.3 },
  DEFAULT_ALLOCATION: { central: 0.6, local: 0.4 },
  ATOMIC_TAX_TYPES_19: [],
  EXPENDITURE_EFFECTS_14: [],
  enableTaxesByDynasty: fn('feEnableTaxes'),
  _ensureRegionFiscal: fn('feEnsureRegion'),
  splitTaxByAllocation: fn('feSplitTax'),
  executeLocalAction: fn('feExecLocalAction'),
  createTransferOrderAtomic: fn('feCreateTransferAtomic'),
  createTransferOrder: fn('feCreateTransfer'),
  _tickTransferOrders: fn('feTickTransfers'),
  init: fn('feInit'),
  tick: fn('feTick')
};

// ─── mock·CascadeTax (v2·12 keys·与 FiscalEngine 同 DEFAULT_TAXES 共享) ───
ctx.CascadeTax = {
  VERSION: 2,
  DEFAULT_TAXES: ctx.FiscalEngine.DEFAULT_TAXES,            // 同源
  DEFAULT_ALLOCATION: ctx.FiscalEngine.DEFAULT_ALLOCATION,
  collect: fn('cascadeCollect'),
  tick: fn('cascadeTick'),                                   // !== FiscalEngine.tick
  _ensureEconomyBase: fn('cascadeEnsureBase'),
  _settleLandFlow: fn('cascadeSettleLand'),
  sumEconomyBase: fn('cascadeSumEconomy'),                   // R10 dead-code rescue 来源
  getDivEconomy: fn('cascadeGetDivEcon'),
  getTopContributors: fn('cascadeGetTop'),
  triggerSurvey: fn('cascadeTriggerSurvey'),
  getDiv: fn('cascadeGetDiv')
};

// ─── mock·FixedExpense (v2·6 keys) ───
ctx.FixedExpense = {
  VERSION: 2,
  collect: fn('fixedCollect'),
  tick: fn('fixedTick'),                                     // !== Fiscal.engine/cascade.tick
  preview: fn('fixedPreview'),
  DEFAULT_RANK_SALARY: { '一品': 100 },
  DEFAULT_ARMY_PAY: 50,
  DEFAULT_IMPERIAL_MONTHLY: 1000
};

// ─── mock·PhaseH (R10 历史 phase-h 命名 alias) ───
ctx.PhaseH = {
  init: ctx.FiscalEngine.init,
  tick: ctx.FiscalEngine.tick
};

// ─── mock·Economy 7 sub-engine ───
ctx.EconomyCore = {
  formulaEstimateWealth: fn('coreFormulaEstWealth'),
  VERSION: 1
};
ctx.EconomyLinkage = {
  borrowFrom: fn('linkageBorrow'),
  acceptDonation: fn('linkageAcceptDon'),
  forceLevy: fn('linkageForceLevy'),
  ensureGovernance: fn('linkageEnsureGov'),
  attributeExpenditure: fn('linkageAttrExp'),
  submitReformToTinyi: fn('linkageSubmitReform'),
  onTinyiDecision: fn('linkageOnTinyiDec'),
  VERSION: 1
};
ctx.CurrencyEngine = {
  init: fn('currencyInit'),
  tick: fn('currencyTick'),                                  // !== Fiscal.tick
  issuePaper: fn('currencyIssue'),
  redeemPaper: fn('currencyRedeem'),
  VERSION: 1
};
ctx.CurrencyUnit = {
  convert: fn('unitConvert'),
  rates: { copper_per_silver: 1000 }
};
ctx.EnvCapacityEngine = {
  init: fn('envInit'),
  tick: fn('envTick'),                                       // !== Fiscal.tick
  enactPolicy: fn('envEnactPolicy'),
  getAIContext: fn('envGetAI'),
  SCAR_TYPES: [],
  CRISIS_EVENTS: [],
  TECH_TIERS: {},
  ENV_POLICIES: {},
  VERSION: 1
};
ctx.EconomyEventBus = {
  emit: fn('busEmit'),
  on: fn('busOn'),
  off: fn('busOff')
};
ctx.EconomyGapFill = {
  fillGap: fn('gapFill'),
  VERSION: 1
};

// ─── mock·GuokuEngine (R9 5-file merge·30+ keys) ───
ctx.GuokuEngine = {
  tick: fn('guokuTick'),                                     // !== Fiscal/Economy.tick
  ensureModel: fn('guokuEnsureModel'),
  Sources: {},
  Expenses: {},
  Actions: {},
  computeTaxFlow: fn('guokuComputeTax'),
  monthlySettle: fn('guokuMonthly'),
  yearlySettle: fn('guokuYearly'),
  initFromDynasty: fn('guokuInitDyn'),
  // R9 inline·p2/p4/p5/p6
  applyTyrantFiscalDistortion: fn('guokuTyrant'),
  FISCAL_REFORMS: [],
  enactReform: fn('guokuEnactReform'),
  LOAN_SOURCES: [],
  takeLoanBySource: fn('guokuTakeLoan'),
  calcCustomTaxes: fn('guokuCalcTaxes')
};

// ─── mock·NeitangEngine (R3 + Phase 3 inline) ───
ctx.NeitangEngine = {
  tick: fn('neitangTick'),                                   // !== Guoku/Fiscal/Economy.tick
  ensureModel: fn('neitangEnsureModel'),
  Sources: {},
  Expenses: {},
  Actions: {},
  monthlySettle: fn('neitangMonthly'),
  yearlySettle: fn('neitangYearly'),
  checkCrisis: fn('neitangCrisis'),
  initFromDynasty: fn('neitangInitDyn')
};

// ─── load tm-namespaces.js ───
vm.createContext(ctx);
function load(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(src, ctx, { filename: rel });
}
load('tm-namespaces.js');

const TM = ctx.TM;

// ═══════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════

// ─── 1·containers ───
assert(TM.Fiscal && typeof TM.Fiscal === 'object', 'TM.Fiscal container');
assert(TM.Economy && typeof TM.Economy === 'object', 'TM.Economy container (R87 facade)');
assert(TM.Guoku && typeof TM.Guoku === 'object', 'TM.Guoku container (R87 panel facade)');
assert(TM.Neitang && typeof TM.Neitang === 'object', 'TM.Neitang container (R87 panel facade)');

// ─── 2·TM.Fiscal sub-ns ───
assert(TM.Fiscal.engine === ctx.FiscalEngine, 'Fiscal.engine === window.FiscalEngine');
assert(TM.Fiscal.cascade === ctx.CascadeTax, 'Fiscal.cascade === window.CascadeTax');
assert(TM.Fiscal.fixedExpense === ctx.FixedExpense, 'Fiscal.fixedExpense === window.FixedExpense');
assert(TM.Fiscal.legacy && TM.Fiscal.legacy.PhaseH === ctx.PhaseH, 'Fiscal.legacy.PhaseH alias');

// ─── 3·VERSION 跨 sub-ns 不冲 ───
assert(TM.Fiscal.engine.VERSION === 1, 'FiscalEngine v1');
assert(TM.Fiscal.cascade.VERSION === 2, 'CascadeTax v2');
assert(TM.Fiscal.fixedExpense.VERSION === 2, 'FixedExpense v2');

// ─── 4·DEFAULT_TAXES 共享 (FiscalEngine 与 CascadeTax 同源) ───
assert(TM.Fiscal.engine.DEFAULT_TAXES === TM.Fiscal.cascade.DEFAULT_TAXES,
  'DEFAULT_TAXES shared between FiscalEngine and CascadeTax (same reference)');
assert(TM.Fiscal.engine.DEFAULT_ALLOCATION === TM.Fiscal.cascade.DEFAULT_ALLOCATION,
  'DEFAULT_ALLOCATION shared');

// ─── 5·关键·tick 跨 sub-ns 强隔离 (5 个不同 tick) ───
assert(TM.Fiscal.engine.tick !== TM.Fiscal.cascade.tick,
  'Fiscal.engine.tick !== Fiscal.cascade.tick');
assert(TM.Fiscal.cascade.tick !== TM.Fiscal.fixedExpense.tick,
  'Fiscal.cascade.tick !== Fiscal.fixedExpense.tick');
assert(TM.Fiscal.engine.tick !== TM.Economy.currency.tick,
  'Fiscal.engine.tick !== Economy.currency.tick');
assert(TM.Economy.currency.tick !== TM.Economy.envCapacity.tick,
  'Economy.currency.tick !== Economy.envCapacity.tick');
assert(TM.Guoku.engine.tick !== TM.Neitang.engine.tick,
  'Guoku.engine.tick !== Neitang.engine.tick');
assert(TM.Guoku.engine.tick !== TM.Fiscal.engine.tick,
  'Guoku.engine.tick !== Fiscal.engine.tick');

// ─── 6·TM.Economy 7 sub-engine ───
assert(TM.Economy.core === ctx.EconomyCore);
assert(TM.Economy.linkage === ctx.EconomyLinkage);
assert(TM.Economy.currency === ctx.CurrencyEngine);
assert(TM.Economy.currencyUnit === ctx.CurrencyUnit);
assert(TM.Economy.envCapacity === ctx.EnvCapacityEngine);
assert(TM.Economy.envCapacity.VERSION === 1);
assert(TM.Economy.eventBus === ctx.EconomyEventBus);
assert(TM.Economy.gapFill === ctx.EconomyGapFill);

// ─── 7·R87 TM.Economy whitelist facade 不破 (顶层 has/list/_namespace 仍 valid) ───
assert(typeof TM.Economy.has === 'function', 'R87 Economy.has() preserved');
assert(typeof TM.Economy.list === 'function', 'R87 Economy.list() preserved');
assert(TM.Economy._namespace === 'Economy', 'R87 Economy._namespace preserved');
assert(TM.Economy.has('getTributeRatio'), 'R87 whitelist getTributeRatio still findable');
assert(TM.Economy.list().length === 21, 'R87 ECONOMY_FNS whitelist 20+1 (R87 is 21 names actually)');

// ─── 8·R10 dead-code rescue·TM.Economy.sum 等 4 alias 透传 CascadeTax ───
assert(TM.Economy.sum === ctx.CascadeTax.sumEconomyBase,
  'Economy.sum aliased to CascadeTax.sumEconomyBase (rescue R10 dead writes)');
assert(TM.Economy.getDiv === ctx.CascadeTax.getDivEconomy,
  'Economy.getDiv aliased to CascadeTax.getDivEconomy');
assert(TM.Economy.topContributors === ctx.CascadeTax.getTopContributors,
  'Economy.topContributors aliased to CascadeTax.getTopContributors');
assert(TM.Economy.triggerSurvey === ctx.CascadeTax.triggerSurvey,
  'Economy.triggerSurvey aliased to CascadeTax.triggerSurvey');

// ─── 9·TM.Guoku panel 不破 (R87) + .engine sub ───
assert(typeof TM.Guoku.has === 'function', 'R87 Guoku.has() preserved');
assert(TM.Guoku.has('openGuokuPanel'), 'R87 panel openGuokuPanel');
assert(TM.Guoku.engine === ctx.GuokuEngine, 'Guoku.engine === window.GuokuEngine');

// ─── 10·R87 TM.GuokuEngine engine proxy 与 TM.Guoku.engine 同源 (双向 alias) ───
// 两路径同源底层 (window.GuokuEngine)·但实现不同·
//   TM.Guoku.engine = window.GuokuEngine (直接 alias·R203·===)
//   TM.GuokuEngine = _buildEngineFacade Proxy·.tick 走 Proxy·返 bound function (不 ===)
// 验·两路径都达到 underlying·调用方等价·
assert(TM.Guoku.engine === ctx.GuokuEngine,
  'TM.Guoku.engine 直接 alias 到 window.GuokuEngine (R203·===)');
assert(typeof TM.GuokuEngine.tick === 'function',
  'TM.GuokuEngine proxy 仍 functional (R87 _buildEngineFacade·tick 经 Proxy 返 bound fn)');
assert(TM.GuokuEngine.isAvailable() === true,
  'TM.GuokuEngine.isAvailable() returns true (proxy reads window.GuokuEngine)');

// ─── 11·TM.Neitang panel 不破 + .engine sub ───
assert(typeof TM.Neitang.has === 'function', 'R87 Neitang.has() preserved');
assert(TM.Neitang.has('openNeitangPanel'), 'R87 panel openNeitangPanel');
assert(TM.Neitang.engine === ctx.NeitangEngine, 'Neitang.engine === window.NeitangEngine');

// ─── 12·_buildWindowRefGroup 接口 (Fiscal.legacy) ───
assert(typeof TM.Fiscal.legacy.has === 'function', 'Fiscal.legacy.has() (from _buildWindowRefGroup)');
assert(TM.Fiscal.legacy.has('PhaseH'));
assert(TM.Fiscal.legacy.list().length === 1, 'Fiscal.legacy 1 entry (PhaseH)');

// ─── 13·legacy window alias 全保 ───
assert(ctx.FiscalEngine !== undefined && ctx.FiscalEngine.VERSION === 1, 'window.FiscalEngine');
assert(ctx.CascadeTax !== undefined && ctx.CascadeTax.VERSION === 2, 'window.CascadeTax');
assert(ctx.GuokuEngine !== undefined, 'window.GuokuEngine');
assert(ctx.NeitangEngine !== undefined, 'window.NeitangEngine');
assert(ctx.PhaseH !== undefined, 'window.PhaseH defensive shim');
assert(ctx.EconomyCore !== undefined && ctx.EconomyCore.VERSION === 1, 'window.EconomyCore');
assert(ctx.EnvCapacityEngine !== undefined, 'window.EnvCapacityEngine');

// ─── 14·R200 + R201 + R202 容器仍存·R203 不破其他 ns ───
assert(TM.Chaoyi && typeof TM.Chaoyi === 'object', 'TM.Chaoyi (R200) preserved');
assert(TM.Office && typeof TM.Office === 'object', 'TM.Office (R200) preserved');
assert(TM.NPC && typeof TM.NPC === 'object', 'TM.NPC (R201 P5-β) preserved');
assert(TM.Char && typeof TM.Char === 'object', 'TM.Char (R201 P5-β) preserved');
assert(TM.Edict && typeof TM.Edict === 'object', 'TM.Edict (R202 P5-γ) preserved');
assert(TM.Edict.parser === ctx.EdictParser || TM.Edict.parser === undefined,
  'TM.Edict.parser stable (smoke 不依赖 P5-γ engine 加载)');

// ─── 15·name 'tick' 跨 11 个 engine·全部不同·sub-ns 强隔离 ───
const tickRefs = [
  TM.Fiscal.engine.tick,
  TM.Fiscal.cascade.tick,
  TM.Fiscal.fixedExpense.tick,
  TM.Economy.currency.tick,
  TM.Economy.envCapacity.tick,
  TM.Guoku.engine.tick,
  TM.Neitang.engine.tick
];
for (let i = 0; i < tickRefs.length; i++) {
  for (let j = i + 1; j < tickRefs.length; j++) {
    assert(tickRefs[i] !== tickRefs[j],
      'tick ref [' + i + '] !== [' + j + '] (sub-ns 隔离)');
  }
}

console.log('[smoke-p5-delta-fiscal] pass assertions=' + passed);
