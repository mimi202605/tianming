#!/usr/bin/env node
// smoke-p5-gamma-edict.js — Phase 5 P5-γ Edict facade fill gate.
// 验·TM.Edict 4 sub-ns·EDICT_TYPES 两版本不同·sub-ns 强隔离·legacy alias 全保

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

// ─── mock·EdictParser (R12b inline 后 v2·15 keys) ───
ctx.EdictParser = {
  classify: fn('parserClassify'),
  tryExecute: fn('parserTryExecute'),
  submitToMemorial: fn('parserSubmitToMemorial'),
  askForClarification: fn('parserAskForClarification'),
  processImperialAssent: fn('parserProcessImperialAssent'),
  tick: fn('parserTick'),
  getAIContext: fn('parserGetAIContext'),
  // parser 内部 17 详 type 定义·与 lifecycle EDICT_TYPES 不同对象
  EDICT_TYPES: { _kind: 'parser-detailed', _count: 17, foo: { trigger: 'x' } },
  HISTORICAL_EDICT_PRESETS: [],
  getHistoricalEdictPresets: fn('parserGetHistoricalPresets'),
  registerDynamicInstitution: fn('parserRegisterDynInst'),
  abolishInstitution: fn('parserAbolishInst'),
  enhanceOfficeReformDraft: fn('parserEnhanceOfficeReform'),
  VERSION: 2
};

// ─── mock·EdictComplete (v1·12 keys + R12b 4 ext) ───
ctx.EdictComplete = {
  init: fn('completeInit'),
  tick: fn('completeTick'),
  openEdictHelp: fn('completeOpenEdictHelp'),
  openMemorialsPanel: fn('completeOpenMemorialsPanel'),
  _checkProjectCompletion: fn('completeCheckProject'),
  _checkHuangceCycle: fn('completeCheckHuangce'),
  _checkGaituEscalation: fn('completeCheckGaitu'),
  getGameModeHint: fn('completeGetGameModeHint'),
  enhancedTryExecute: fn('completeEnhancedTryExec'),
  MEMORIAL_TRIGGERS: { project_complete: 'corvee' },
  P1_EDICT_TYPES: ['tax', 'office'],
  HELP_TOPICS: [],
  VERSION: 1,
  // R12b extension
  openClarificationPanel: fn('completeOpenClarification'),
  _answerClarification: fn('completeAnswerClarif'),
  processImperialAssentExtended: fn('completeProcImperialExt'),
  QUERY_QUICK_OPTIONS: ['yes', 'no']
};

// ─── mock·PhaseG3 (v1·~20 keys·tm-edict-thresholds) ───
ctx.PhaseG3 = {
  init: fn('phaseG3Init'),
  tick: fn('phaseG3Tick'),
  TM_THRESHOLDS: { jiansha: 5, gongdi: 8 },
  CORVEE_ABCD_VARIANTS: ['A', 'B', 'C', 'D'],
  generateCorveeABCDOptions: fn('phaseG3GenABCD'),
  openCorveeABCDPanel: fn('phaseG3OpenABCD'),
  _selectCorveeVariant: fn('phaseG3SelVar'),
  initiateMovCapitalThreeRound: fn('phaseG3MovCap3Round'),
  _resolveMovCapRound: fn('phaseG3ResolveMovCap'),
  ABDUCTION_12_CASES: [],
  findRelevantAbductionCases: fn('phaseG3FindAbduction'),
  FUYI_SCHEME_ABCD: {},
  openFuyiSchemeComparison: fn('phaseG3OpenFuyi'),
  _applyFuyiScheme: fn('phaseG3ApplyFuyi'),
  checkDecreeViolation: fn('phaseG3CheckViolation'),
  DYNASTY_POPULATION_PRESETS: {},
  applyDynastyPopulationPreset: fn('phaseG3ApplyPopPreset'),
  attachEdictReferenceButton: fn('phaseG3AttachBtn'),
  VERSION: 1
};

// ─── mock·PhaseC (R12b defensive shim·init no-op) ───
ctx.PhaseC = {
  init: function() { /* no-op·R12b inline 后 OVERRIDE 已直接入 v1 */ },
  tick: ctx.EdictParser.tick,
  registerDynamicInstitution: ctx.EdictParser.registerDynamicInstitution,
  abolishInstitution: ctx.EdictParser.abolishInstitution,
  enhanceOfficeReformDraft: ctx.EdictParser.enhanceOfficeReformDraft,
  VERSION: 2
};
// 注:detectEnvPolicy/routeEnvPolicy/POLICY_KEYWORDS 死代码已于 2026-05-29 删除

// ─── mock·lifecycle 11 globals (tm-edict-lifecycle.js·与 parser 同名 EDICT_TYPES 是不同对象!) ───
ctx.EDICT_TYPES = { _kind: 'lifecycle-broad-category', _count: 11, military: 'mil', fiscal: 'fis' };
ctx.EDICT_STAGES = { drafted: 0, executed: 1 };
ctx.REFORM_PHASES = { initial: 0, mid: 1, late: 2 };
ctx.RESISTANCE_SOURCES = { faction: 1, class: 2 };
ctx.classifyEdict = fn('lifecycleClassify');
ctx.calcEdictMultiplier = fn('lifecycleCalcMul');
ctx.estimateResistance = fn('lifecycleEstResist');
ctx.generateEdictForecast = fn('lifecycleGenForecast');
ctx.daysToTurns = fn('lifecycleDaysToTurns');
ctx.getEdictLifecycleTurns = fn('lifecycleGetTurns');
ctx.getReformPhaseTurns = fn('lifecycleGetReformTurns');
ctx.formatLifecycleForScript = fn('lifecycleFormatForScript');

ctx.TM_THRESHOLDS = ctx.PhaseG3.TM_THRESHOLDS;

// ─── 加载 tm-namespaces.js ───
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

// ─── 1·TM.Edict 容器存在 ───
assert(TM.Edict && typeof TM.Edict === 'object', 'TM.Edict container exists');

// ─── 2·sub-ns 4 个全建·parser/complete/lifecycle/thresholds ───
assert(TM.Edict.parser === ctx.EdictParser, 'TM.Edict.parser === window.EdictParser');
assert(TM.Edict.complete === ctx.EdictComplete, 'TM.Edict.complete === window.EdictComplete');
assert(TM.Edict.thresholds === ctx.PhaseG3, 'TM.Edict.thresholds === window.PhaseG3 (alias 历史命名)');
assert(TM.Edict.lifecycle && typeof TM.Edict.lifecycle === 'object', 'TM.Edict.lifecycle exists');
assert(TM.Edict.legacy && typeof TM.Edict.legacy === 'object', 'TM.Edict.legacy exists');

// ─── 3·VERSION 跨 sub-ns 不冲 ───
assert(TM.Edict.parser.VERSION === 2, 'parser VERSION 2 (R12b)');
assert(TM.Edict.complete.VERSION === 1, 'complete VERSION 1');
assert(TM.Edict.thresholds.VERSION === 1, 'thresholds VERSION 1');

// ─── 4·**关键·EDICT_TYPES 两版本不同对象** ───
assert(TM.Edict.parser.EDICT_TYPES !== TM.Edict.lifecycle.EDICT_TYPES,
  'parser.EDICT_TYPES (17 详定义) MUST NOT equal lifecycle.EDICT_TYPES (11 大类) — sub-ns 强隔离');
assert(TM.Edict.parser.EDICT_TYPES._kind === 'parser-detailed',
  'parser.EDICT_TYPES is the 17-detailed-type registry');
assert(TM.Edict.lifecycle.EDICT_TYPES._kind === 'lifecycle-broad-category',
  'lifecycle.EDICT_TYPES is the 11-broad-category enum');
assert(TM.Edict.parser.EDICT_TYPES._count === 17, 'parser detailed count 17');
assert(TM.Edict.lifecycle.EDICT_TYPES._count === 11, 'lifecycle category count 11');

// ─── 5·tick 跨 sub-ns 不冲 (3 个不同 tick 函数) ───
assert(TM.Edict.parser.tick !== TM.Edict.complete.tick,
  'parser.tick !== complete.tick·sub-ns 隔离');
assert(TM.Edict.complete.tick !== TM.Edict.thresholds.tick,
  'complete.tick !== thresholds.tick·sub-ns 隔离');
assert(TM.Edict.parser.tick !== TM.Edict.thresholds.tick,
  'parser.tick !== thresholds.tick·sub-ns 隔离');

// ─── 6·init 跨 sub-ns 不冲 ───
assert(TM.Edict.complete.init !== TM.Edict.thresholds.init,
  'complete.init !== thresholds.init·sub-ns 隔离');

// ─── 7·parser keys 完整 ───
assert(typeof TM.Edict.parser.classify === 'function');
assert(typeof TM.Edict.parser.tryExecute === 'function');
assert(typeof TM.Edict.parser.processImperialAssent === 'function');
assert(typeof TM.Edict.parser.registerDynamicInstitution === 'function', 'R12b inline·registerDynamicInstitution');
assert(typeof TM.Edict.parser.enhanceOfficeReformDraft === 'function', 'R12b inline·enhanceOfficeReformDraft');

// ─── 8·complete keys 完整 ───
assert(typeof TM.Edict.complete.openEdictHelp === 'function');
assert(typeof TM.Edict.complete.openMemorialsPanel === 'function');
assert(typeof TM.Edict.complete._checkProjectCompletion === 'function');
assert(typeof TM.Edict.complete.openClarificationPanel === 'function', 'R12b ext·openClarificationPanel');
assert(typeof TM.Edict.complete.processImperialAssentExtended === 'function', 'R12b ext·processImperialAssentExtended');
assert(Array.isArray(TM.Edict.complete.QUERY_QUICK_OPTIONS), 'R12b ext·QUERY_QUICK_OPTIONS');

// ─── 9·thresholds keys 完整 (PhaseG3 历史命名) ───
assert(typeof TM.Edict.thresholds.openCorveeABCDPanel === 'function');
assert(typeof TM.Edict.thresholds.initiateMovCapitalThreeRound === 'function');
assert(typeof TM.Edict.thresholds.openFuyiSchemeComparison === 'function');
assert(Array.isArray(TM.Edict.thresholds.CORVEE_ABCD_VARIANTS));

// ─── 10·lifecycle 11 keys 透传 ───
assert(typeof TM.Edict.lifecycle.classifyEdict === 'function');
assert(typeof TM.Edict.lifecycle.calcEdictMultiplier === 'function');
assert(typeof TM.Edict.lifecycle.estimateResistance === 'function');
assert(typeof TM.Edict.lifecycle.generateEdictForecast === 'function');
assert(typeof TM.Edict.lifecycle.daysToTurns === 'function');
assert(typeof TM.Edict.lifecycle.formatLifecycleForScript === 'function');
assert(TM.Edict.lifecycle.EDICT_STAGES && typeof TM.Edict.lifecycle.EDICT_STAGES === 'object');
assert(TM.Edict.lifecycle.REFORM_PHASES && typeof TM.Edict.lifecycle.REFORM_PHASES === 'object');
assert(TM.Edict.lifecycle.RESISTANCE_SOURCES && typeof TM.Edict.lifecycle.RESISTANCE_SOURCES === 'object');

// ─── 11·legacy·PhaseC defensive shim + TM_THRESHOLDS ───
assert(TM.Edict.legacy.PhaseC === ctx.PhaseC, 'legacy.PhaseC === window.PhaseC (defensive shim)');
assert(typeof TM.Edict.legacy.PhaseC.init === 'function', 'PhaseC.init exists (no-op since R12b)');
assert(TM.Edict.legacy.TM_THRESHOLDS === ctx.TM_THRESHOLDS, 'legacy.TM_THRESHOLDS alias');

// ─── 12·_buildWindowRefGroup·has/list/listAvailable/listMissing 接口 ───
assert(typeof TM.Edict.lifecycle.has === 'function', 'lifecycle has() method (from _buildWindowRefGroup)');
assert(TM.Edict.lifecycle.has('classifyEdict'), 'lifecycle has classifyEdict');
assert(TM.Edict.lifecycle.has('EDICT_TYPES'), 'lifecycle has EDICT_TYPES');
assert(typeof TM.Edict.lifecycle.list === 'function');
assert(TM.Edict.lifecycle.list().length === 12, 'lifecycle 12 entries (EDICT_TYPES/STAGES/REFORM_PHASES/RESISTANCE + 8 fn)');
assert(TM.Edict.lifecycle.listMissing().length === 0, 'lifecycle 0 missing (all loaded)');

// ─── 13·legacy alias·window 仍可用 (Phase 6 才删) ───
assert(ctx.EdictParser !== undefined && ctx.EdictParser.VERSION === 2, 'window.EdictParser alias still works');
assert(ctx.classifyEdict !== undefined, 'window.classifyEdict alias still works');
assert(ctx.PhaseG3 !== undefined && ctx.PhaseG3.VERSION === 1, 'window.PhaseG3 alias still works');
assert(ctx.PhaseC !== undefined, 'window.PhaseC defensive shim still exists');

// ─── 14·R200 容器仍存·Edict 不破其他 ns ───
assert(TM.Chaoyi && typeof TM.Chaoyi === 'object', 'TM.Chaoyi container preserved');
assert(TM.Fiscal && typeof TM.Fiscal === 'object', 'TM.Fiscal container preserved');
assert(TM.NPC && typeof TM.NPC === 'object', 'TM.NPC container preserved (R201 P5-β)');
assert(TM.Char && typeof TM.Char === 'object', 'TM.Char container preserved (R201 P5-β)');

// ─── 15·R201 P5-β NPC/Char 不破 (跨 slice 共存) ───
// (P5-β fills NPC/Char with sub-ns·we just check they still exist as objects)
assert(typeof TM.NPC === 'object' && Object.keys(TM.NPC).length > 0,
  'TM.NPC still has P5-β fills');
assert(typeof TM.Char === 'object' && Object.keys(TM.Char).length > 0,
  'TM.Char still has P5-β fills');

console.log('[smoke-p5-gamma-edict] pass assertions=' + passed);
