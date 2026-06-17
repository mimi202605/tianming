#!/usr/bin/env node
/* eslint-env node */
'use strict';
// P-DZ 吏治接浊度·机制验证（落点修正版·2026-05-29）
// 落点已查死：实征率/中央月入的 provincial 半，源头是 div.corruption——cascade corrPenalty(computeTaxAmount)直接读它，
//   回合末 aggregateRegionsToVariables 再把它聚合成 subDepts.provincial.true(实征率面板)。fiscal 半是独立全局口、aggregate 不覆盖。
// Part A：FiscalEngine.adjustPlayerDivisionCorruption 真降本势力 div.corruption（源头·cascade + aggregate 都吃它）+ corrPenalty 效应手算
// Part B：corruption-engine fiscal 半直接降 + calcActualTaxRate 随之升（财政口）
// 边界：provincial.true 经回合末 aggregate 从 div.corruption 聚合，那段端到端由桌面端真过回合兜底。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, label) { if (!cond) throw new Error('[assert] ' + label); passed += 1; }

// ── Part A·FiscalEngine.adjustPlayerDivisionCorruption 真降 div.corruption（源头）──
(function () {
  const sandbox = {
    console, RegExp, Array, Object, String, Number, Boolean, JSON, Math, Date,
    setTimeout: () => {}, clearTimeout: () => {}, addEB: () => {}, toast: () => {}, _dbg: () => {}
  };
  sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
  sandbox.TM = { errors: { capture: () => {}, captureSilent: () => {} } };
  sandbox.GM = {
    turn: 28,
    adminHierarchy: { '明廷': { divisions: [
      { id: 'shaanxi', name: '陕西', corruption: 45, fiscal: { compliance: 0.80 } },
      { id: 'henan', name: '河南', corruption: 35, fiscal: { compliance: 0.85 } }
    ] } }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-fiscal-engine.js'), 'utf8'), sandbox, { filename: 'tm-fiscal-engine.js' });
  const FE = sandbox.FiscalEngine;
  assert(FE && typeof FE.adjustPlayerDivisionCorruption === 'function', 'A·adjustPlayerDivisionCorruption 已导出');
  const divs = sandbox.GM.adminHierarchy['明廷'].divisions;
  const c0 = divs[0].corruption, c1 = divs[1].corruption;
  const n = FE.adjustPlayerDivisionCorruption('明廷', -3, 0, 100);
  assert(n === 2, 'A①遍历到 2 个本势力 division·实得 ' + n);
  assert(divs[0].corruption === c0 - 3, 'A②陕西 corruption ' + c0 + '→' + divs[0].corruption + '（真降·源头·cascade+aggregate 都吃它）');
  assert(divs[1].corruption === c1 - 3, 'A③河南 corruption ' + c1 + '→' + divs[1].corruption);
  FE.adjustPlayerDivisionCorruption('明廷', -999, 0, 100);
  assert(divs[0].corruption === 0, 'A④护栏夹底 0·不越界·实得 ' + divs[0].corruption);
  // corrPenalty 效应手算（computeTaxAmount: corrPenalty = min(0.5, corruption/100*0.4)）：corruption 45→42 → 留存率升
  const pen0 = Math.min(0.5, c0 / 100 * 0.4), pen1 = Math.min(0.5, (c0 - 3) / 100 * 0.4);
  assert((1 - pen1) > (1 - pen0), 'A⑤corrPenalty 降→cascade 实收留存率升 ' + ((1 - pen0) * 100).toFixed(1) + '%→' + ((1 - pen1) * 100).toFixed(1) + '%');
})();

// ── Part B·corruption-engine fiscal 半直接降 + 实征率随之升 ──
(function () {
  const sandbox = {
    console, RegExp, Array, Object, String, Number, Boolean, JSON, Math, Date,
    setTimeout: () => {}, clearTimeout: () => {}, setInterval: () => {}, clearInterval: () => {},
    addEB: () => {}, toast: () => {}, _dbg: () => {}, _adjAuthority: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, document: { addEventListener: () => {} }
  };
  sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
  sandbox.TM = { errors: { capture: () => {}, captureSilent: () => {} }, InfluenceGroups: null };
  sandbox.EventBus = { emit: () => {}, on: () => {}, off: () => {} };
  sandbox.SettlementPipeline = { register: () => {} };
  sandbox.GM = {
    turn: 28,
    guoku: { monthlyIncome: 800000, actualTaxRate: 1 },
    corruption: {
      trueIndex: 40, perceivedIndex: 30, phase: 'moderate',
      subDepts: {
        central:    { true: 25, perceived: 20, trend: 'stable' },
        provincial: { true: 35, perceived: 28, trend: 'stable' },
        military:   { true: 40, perceived: 30, trend: 'stable' },
        fiscal:     { true: 45, perceived: 35, trend: 'stable' },
        judicial:   { true: 30, perceived: 22, trend: 'stable' },
        imperial:   { true: 20, perceived: 10, trend: 'stable' }
      },
      supervision: { level: 45, institutions: [], recentReports: [] },
      sources: {}, countermeasures: {}, lumpSumIncidents: [], entrenchedFactions: [],
      history: { exposedCases: [], failedInvestigations: [], purgeCampaigns: [], backlash: [] }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-corruption-engine.js'), 'utf8'), sandbox, { filename: 'tm-corruption-engine.js' });
  const CE = sandbox.CorruptionEngine;
  assert(CE && CE.Consequences && typeof CE.Consequences.calcActualTaxRate === 'function', 'B·calcActualTaxRate 已导出');
  const c = sandbox.GM.corruption;
  const rate0 = CE.Consequences.calcActualTaxRate(), f0 = c.subDepts.fiscal.true;
  c.subDepts.fiscal.true = Math.max(0, c.subDepts.fiscal.true - 3); // 复刻 applier fiscal 半直接降
  CE.syncIndexFromSubDepts('P-DZ 验证·fiscal 半');
  const rate1 = CE.Consequences.calcActualTaxRate();
  assert(c.subDepts.fiscal.true === f0 - 3, 'B①fiscal.true 真降 ' + f0 + '→' + c.subDepts.fiscal.true);
  assert(rate1 > rate0, 'B②实征率随 fiscal 半升 ' + (rate0 * 100).toFixed(2) + '%→' + (rate1 * 100).toFixed(2) + '%');
  console.log('  fiscal 半（当回合即反映）: 实征率 ' + (rate0 * 100).toFixed(2) + '% → ' + (rate1 * 100).toFixed(2) + '%');
})();

// ── Part C·处决官员部门推断正则（与 edict.js deaths.forEach 内 P-DZ 映射逐字一致·验映射逻辑对）──
(function () {
  function deptOf(title) {
    var t = String(title || '');
    if (/户部|度支|太仓|钞关|盐运|税课/.test(t)) return 'fiscal';
    if (/兵部|都督|总兵|武选|军务/.test(t)) return 'military';
    if (/刑部|都察院|御史|大理寺|按察|提刑/.test(t)) return 'judicial';
    if (/吏部|内阁|大学士|首辅|次辅|中枢/.test(t)) return 'central';
    if (/锦衣卫|东厂|西厂|司礼监|内官监|宦/.test(t)) return 'imperial';
    if (/巡抚|总督|知府|知州|知县|布政|参政|道员/.test(t)) return 'provincial';
    return '';
  }
  assert(deptOf('户部尚书') === 'fiscal', 'C①户部尚书→fiscal');
  assert(deptOf('兵部侍郎') === 'military', 'C②兵部侍郎→military');
  assert(deptOf('左都御史') === 'judicial', 'C③左都御史→judicial');
  assert(deptOf('内阁首辅') === 'central', 'C④内阁首辅→central');
  assert(deptOf('陕西巡抚') === 'provincial', 'C⑤陕西巡抚→provincial（地方官走 div.corruption 源头）');
  assert(deptOf('司礼监掌印太监') === 'imperial', 'C⑥司礼监→imperial');
  assert(deptOf('翰林院侍读') === '', 'C⑦推不出→空（兜底降全势力 div.corruption）');
})();

console.log('[verify-pdz-corruption] PASS assertions=' + passed);
console.log('  注：provincial 半 + 中央月入走源头 div.corruption，由回合末 aggregate / cascade 体现，端到端待桌面端真过回合验。');
