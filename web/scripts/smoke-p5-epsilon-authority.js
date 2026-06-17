#!/usr/bin/env node
// smoke-p5-epsilon-authority.js — Phase 5 P5-ε Authority/Office/Keju/Corruption fill gate.
// 验·5 ns·Authority sub-ns·Corruption.engine·Office.system+legacy·Keju.runtime·Lizhi 不破

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

// ─── R87 lizhi panel 22 fn (mock·legacy facade source) ───
[
  '_lizhiTabJump', 'renderInkDots', 'getLizhiPhase', 'getTrendSymbol',
  'getCorrVisibility', 'openCorruptionPanel', 'closeCorruptionPanel',
  'renderCorruptionPanel', 'computeTaxThreeNumber', 'renderTaxThreeNumberBlock',
  '_lizhiIntegrityBadge',
  '_lizhi_launchPurge', '_lizhi_reformSalary', '_lizhi_factionExposure',
  '_lizhi_openAppeals', '_lizhi_rotateOfficials', '_lizhi_harshRule',
  '_lizhi_secretPolice', '_lizhi_openInstitutionDesigner',
  '_lizhi_toggleJuanna', '_lizhi_toggleMapHeat', '_lizhi_dispatchCommissioner'
].forEach(function(n){ ctx[n] = fn(n); });

// ─── AuthorityEngines (R12c v1·24 keys) ───
ctx.AuthorityEngines = {
  init: fn('authInit'),
  tick: fn('authTick'),
  adjustHuangwei: fn('adjustHuangwei'),
  adjustHuangquan: fn('adjustHuangquan'),
  adjustMinxin: fn('adjustMinxin'),
  applyTyrantExecutionAmplification: fn('applyTyrantExecAmp'),
  filterQueryOptionsByPhase: fn('filterQueryOptions'),
  getHuangweiValue: fn('getHuangwei'),
  getHuangquanValue: fn('getHuangquan'),
  getMinxinValue: fn('getMinxin'),
  executePurge: fn('execPurge'),
  HUANGWEI_PHASE: {},
  HUANGQUAN_PHASE: {},
  MINXIN_PHASE: {},
  HUANGWEI_SOURCES_14: [],
  HUANGWEI_DRAINS_14: [],
  HUANGQUAN_SOURCES_8: [],
  HUANGQUAN_DRAINS_8: [],
  MINXIN_SOURCES_14: [],
  _updatePerceivedHuangwei_f1: fn('updatePerceived'),
  getUnifiedHuangquanPhaseHandler: fn('unifiedHandler'),
  checkDecreeRealtime: fn('checkDecree'),
  VERSION: 1
};

ctx.AuthorityComplete = {
  ensureCharFields: fn('completeEnsureChar'),
  applyAuthorityCheckOnEdict: fn('completeAuthCheck'),
  VERSION: 1
};

ctx.PhaseF1 = { init: ctx.AuthorityEngines.init, tick: ctx.AuthorityEngines.tick };
ctx.PhaseF4 = { init: fn('phaseF4Init'), tick: fn('phaseF4Tick') };
ctx.PhaseG1 = { init: fn('phaseG1Init'), tick: fn('phaseG1Tick') };

ctx._adjAuthority = fn('adjAuthority');
ctx.applyTyrantExecutionAmplification = ctx.AuthorityEngines.applyTyrantExecutionAmplification;
ctx.filterQueryOptionsByPhase = ctx.AuthorityEngines.filterQueryOptionsByPhase;
ctx.checkDecreeRealtime = ctx.AuthorityEngines.checkDecreeRealtime;

// ─── CorruptionEngine (R9 p2/p4 merged·v1·16 keys) ───
ctx.CorruptionEngine = {
  tick: fn('corrTick'),
  ensureModel: fn('corrEnsureModel'),
  updatePerceived: fn('corrUpdatePerceived'),
  calcVisibilityTier: fn('corrCalcVis'),
  getMonthRatio: fn('corrGetMonth'),
  Sources: {},
  Consequences: {},
  Actions: {},
  _deptName: fn('corrDeptName'),
  initFromDynasty: fn('corrInitDyn'),
  DYNASTY_PRESETS: {},
  checkFactionFormation: fn('corrCheckFaction'),
  checkBacklash: fn('corrCheckBacklash'),
  applyCrossLinkage: fn('corrCrossLinkage'),
  FACTION_TEMPLATES: []
};

// ─── Office·tm-office-system 2 fn + tm-office-editor 4 fn HTML inline ───
ctx.canPerformAction = fn('canPerformAction');
ctx._findPositionByCharName = fn('_findPositionByCharName');
ctx.aiGenChr = fn('aiGenChr');
ctx.aiGenFac = fn('aiGenFac');
ctx.aiGenFullScenario = fn('aiGenFullScenario');
ctx.execFullGen = fn('execFullGen');

// ─── Keju·tm-keju + tm-keju-runtime 9 主入口 ───
ctx.startKejuByMethod = fn('startKejuByMethod');
ctx.resolveKejuCouncilResult = fn('resolveKejuCouncilResult');
ctx.kejuConsultCourtier = fn('kejuConsultCourtier');
ctx.kejuConsultGuanGe = fn('kejuConsultGuanGe');
ctx.openDianshiDelegatePicker = fn('openDianshiDelegatePicker');
ctx.confirmFinalRanking = fn('confirmFinalRanking');
ctx.crystallizeKejuGrad = fn('crystallizeKejuGrad');
ctx.openKeyiSession = fn('openKeyiSession');
ctx.closeKeyi = fn('closeKeyi');

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
assert(TM.Authority && typeof TM.Authority === 'object', 'TM.Authority container');
assert(TM.Corruption && typeof TM.Corruption === 'object', 'TM.Corruption container');
assert(TM.Office && typeof TM.Office === 'object', 'TM.Office container');
assert(TM.Keju && typeof TM.Keju === 'object', 'TM.Keju container');

// ─── 2·TM.Authority sub-ns ───
assert(TM.Authority.engines === ctx.AuthorityEngines, 'Authority.engines === AuthorityEngines');
assert(TM.Authority.complete === ctx.AuthorityComplete, 'Authority.complete === AuthorityComplete');
assert(TM.Authority.engines.VERSION === 1, 'AuthorityEngines v1');
assert(typeof TM.Authority.engines.adjustHuangwei === 'function');
assert(typeof TM.Authority.engines.adjustHuangquan === 'function');
assert(typeof TM.Authority.engines.adjustMinxin === 'function');
assert(typeof TM.Authority.engines.applyTyrantExecutionAmplification === 'function',
  'R12c phase-f1 inline·applyTyrantExecutionAmplification');
assert(typeof TM.Authority.engines.checkDecreeRealtime === 'function',
  'R12c phase-f1 inline·checkDecreeRealtime');

// ─── 3·TM.Authority.legacy·_buildWindowRefGroup ───
assert(typeof TM.Authority.legacy.has === 'function');
assert(TM.Authority.legacy.PhaseF1 === ctx.PhaseF1, 'legacy.PhaseF1 alias');
assert(TM.Authority.legacy.PhaseF4 === ctx.PhaseF4, 'legacy.PhaseF4');
assert(TM.Authority.legacy.PhaseG1 === ctx.PhaseG1, 'legacy.PhaseG1');
assert(TM.Authority.legacy._adjAuthority === ctx._adjAuthority, 'legacy._adjAuthority helper');
assert(TM.Authority.legacy.list().length === 7, 'Authority.legacy 7 entries');

// ─── 4·TM.Corruption.engine ───
assert(TM.Corruption.engine === ctx.CorruptionEngine, 'Corruption.engine === CorruptionEngine');
assert(typeof TM.Corruption.engine.tick === 'function');
assert(typeof TM.Corruption.engine.ensureModel === 'function');
assert(typeof TM.Corruption.engine.checkFactionFormation === 'function', 'R9 p2 merged');
assert(typeof TM.Corruption.engine.checkBacklash === 'function', 'R9 p4 merged');
assert(typeof TM.Corruption.engine.applyCrossLinkage === 'function', 'R9 p4 merged');
assert(Array.isArray(TM.Corruption.engine.FACTION_TEMPLATES));

// ─── 5·TM.Office sub-ns·system + legacy ───
assert(typeof TM.Office.system.has === 'function');
assert(TM.Office.system.has('canPerformAction'), 'Office.system.canPerformAction');
assert(typeof TM.Office.system.canPerformAction === 'function');
assert(typeof TM.Office.system.findPositionByCharName === 'function');
assert(TM.Office.system.list().length === 2, 'Office.system 2 entries (R6 carve)');

assert(typeof TM.Office.legacy.has === 'function');
assert(TM.Office.legacy.has('aiGenChr'));
assert(typeof TM.Office.legacy.aiGenChr === 'function');
assert(typeof TM.Office.legacy.execFullGen === 'function');
assert(TM.Office.legacy.list().length === 4, 'Office.legacy 4 aiGen 主入口');

// ─── 6·TM.Keju.runtime·9 主入口 ───
assert(typeof TM.Keju.runtime.has === 'function');
assert(typeof TM.Keju.runtime.startKejuByMethod === 'function');
assert(typeof TM.Keju.runtime.resolveKejuCouncilResult === 'function');
assert(typeof TM.Keju.runtime.openKeyiSession === 'function');
assert(typeof TM.Keju.runtime.crystallizeKejuGrad === 'function');
assert(TM.Keju.runtime.list().length === 9, 'Keju.runtime 9 entries');
assert(TM.Keju.runtime.listMissing().length === 0, 'Keju.runtime 0 missing');

// ─── 7·TM.Lizhi (legacy)·R87 22-fn whitelist 不破·非 24 canonical (Q1 决议) ───
assert(TM.Lizhi && typeof TM.Lizhi.has === 'function', 'TM.Lizhi R87 facade preserved');
assert(TM.Lizhi._namespace === 'Lizhi', 'TM.Lizhi._namespace');
assert(TM.Lizhi.has('openCorruptionPanel'), 'R87 panel openCorruptionPanel');
assert(TM.Lizhi.has('_lizhi_launchPurge'), 'R87 panel _lizhi_launchPurge');
assert(TM.Lizhi.list().length === 22, 'R87 LIZHI_FNS 22 names');

// ─── 8·命名冲突·tick 跨 Authority/Corruption 不冲 ───
assert(TM.Authority.engines.tick !== TM.Corruption.engine.tick,
  'Authority.engines.tick !== Corruption.engine.tick (sub-ns 强隔离)');
assert(TM.Authority.legacy.PhaseF1.tick === TM.Authority.engines.tick,
  'PhaseF1.tick aliased to AuthorityEngines.tick (R12c 同源)');
assert(TM.Authority.legacy.PhaseF4.tick !== TM.Authority.engines.tick,
  'PhaseF4.tick !== engines.tick (deep 是 separate domain)');

// ─── 9·legacy window alias 全保 ───
assert(ctx.AuthorityEngines !== undefined && ctx.AuthorityEngines.VERSION === 1);
assert(ctx.CorruptionEngine !== undefined);
assert(ctx.startKejuByMethod !== undefined);
assert(ctx.canPerformAction !== undefined);
assert(ctx.PhaseF1 !== undefined && ctx.PhaseF4 !== undefined && ctx.PhaseG1 !== undefined);

// ─── 10·R200 + R201 + R202 + R203 容器仍存·R204 不破其他 ns ───
assert(TM.Chaoyi && typeof TM.Chaoyi === 'object', 'TM.Chaoyi (R200) preserved');
assert(TM.NPC && typeof TM.NPC === 'object', 'TM.NPC (R201 P5-β) preserved');
assert(TM.Edict && typeof TM.Edict === 'object', 'TM.Edict (R202 P5-γ) preserved');
assert(TM.Fiscal && typeof TM.Fiscal === 'object', 'TM.Fiscal (R203 P5-δ) preserved');
assert(TM.Economy && typeof TM.Economy.has === 'function', 'TM.Economy R87 facade preserved');

console.log('[smoke-p5-epsilon-authority] pass assertions=' + passed);
