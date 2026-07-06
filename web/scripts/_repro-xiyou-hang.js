'use strict';
// 临时复现脚本：把西游剧本喂进经济/财政/桥接初始化链，逐步同步打点，定位卡死点。
// 用完即删。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..'); // web
const SCN = process.argv[2] || 'C:/Users/37814/NapCat/bridge/incoming_images/0361d8c336f32b2a.json';
const sc = JSON.parse(fs.readFileSync(SCN, 'utf8'));
const SID = sc.id;
const t0 = Date.now();

function step(s) { fs.writeSync(1, '[' + (Date.now() - t0) + 'ms] ' + s + '\n'); }
function clone(v) { return JSON.parse(JSON.stringify(v)); }

function makeContext() {
  const logs = [];
  const ctx = {
    console: {
      log: function () {},
      warn: function () { fs.writeSync(2, 'WARN ' + [].slice.call(arguments).join(' ') + '\n'); },
      error: function () { fs.writeSync(2, 'ERR ' + [].slice.call(arguments).join(' ') + '\n'); }
    },
    setTimeout, clearTimeout, Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp,
    parseInt, parseFloat, isNaN, isFinite, logs
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  ctx.TM = { errors: {
    capture: function (e, tag) { fs.writeSync(2, 'CAPTURE ' + (tag || '') + ':' + (e && e.message || e) + '\n'); },
    captureSilent: function () {}
  } };
  ctx.addEB = function () {};
  ctx.toast = function () {};
  ctx._getDaysPerTurn = function () { return 365; };
  ctx.findScenarioById = function (id) { return id === SID ? sc : null; };
  ctx.CurrencyUnit = { getUnit: function () { return { money: 'liang', grain: 'shi', cloth: 'bolt' }; } };
  ctx.P = {
    scenarios: [sc],
    adminHierarchy: clone(sc.adminHierarchy || {}),
    fiscalConfig: clone(sc.fiscalConfig || {}),
    populationConfig: clone(sc.populationConfig || {}),
    military: clone(sc.military || {}),
    map: clone(sc.map || sc.mapData || { enabled: false, regions: [] })
  };
  ctx.GM = {
    sid: SID, running: true, turn: 1,
    month: sc.startMonth || 1, year: sc.startYear || 1,
    chars: clone(sc.characters || []),
    facs: clone(sc.factions || []),
    officeTree: clone(sc.officeTree || []),
    adminHierarchy: clone(sc.adminHierarchy || {}),
    fiscalConfig: clone(sc.fiscalConfig || {}),
    populationConfig: clone(sc.populationConfig || {}),
    military: clone(sc.military || {}),
    turnChanges: { variables: [] },
    guoku: { balance: 0, money: 0, grain: 0, cloth: 0 },
    neitang: { balance: 0, money: 0, grain: 0, cloth: 0 },
    minxin: { trueIndex: 60, byRegion: {} },
    corruption: { overall: 30 },
    population: {}
  };
  return vm.createContext(ctx);
}

function runFile(ctx, rel) {
  const abs = path.join(ROOT, rel);
  const code = fs.readFileSync(abs, 'utf8');
  vm.runInContext(code, ctx, { filename: rel });
}

function guard(name, fn) {
  step(name + ' START');
  try { fn(); step(name + ' DONE'); }
  catch (e) { step(name + ' ERROR ' + (e && e.message || e)); if (e && e.stack) fs.writeSync(2, e.stack.split('\n').slice(1, 4).join('\n') + '\n'); }
}

step('scenario id=' + SID + ' worldKind=' + sc.worldKind);
const ctx = makeContext();
step('context built');
['tm-guoku-engine.js', 'tm-neitang-engine.js', 'tm-economy-engine-currency.js', 'tm-economy-engine.js', 'tm-region-enrich.js', 'tm-integration-bridge.js', 'tm-fiscal-engine.js'].forEach(function (rel) {
  step('load ' + rel);
  runFile(ctx, rel);
});
['tm-huji-engine.js', 'tm-huji-deep-fill.js', 'tm-env-recovery-fill.js', 'tm-authority-engines.js', 'tm-authority-complete.js'].forEach(function (rel) {
  guard('load ' + rel, function () { runFile(ctx, rel); });
});
step('engines loaded');

guard('IntegrationBridge.init', function () { ctx.IntegrationBridge.init(); });
step('  -> population.national=' + JSON.stringify(ctx.GM.population && ctx.GM.population.national));
guard('HujiEngine.init', function () { ctx.HujiEngine.init(sc); });
guard('EnvCapacityEngine.init', function () { ctx.EnvCapacityEngine.init(sc); });
guard('HujiDeepFill.init', function () { ctx.HujiDeepFill.init(); });
guard('EnvRecoveryFill.init', function () { ctx.EnvRecoveryFill.init(); });
guard('AuthorityEngines.init', function () { ctx.AuthorityEngines.init(); });
guard('AuthorityComplete.init', function () { ctx.AuthorityComplete.init(); });
guard('PhaseB.init', function () { ctx.PhaseB.init(sc); });
guard('CascadeTax.collect', function () { var c = ctx.CascadeTax.collect({ monthRatio: 1 }); step('  -> ok=' + (c && c.ok)); });
guard('FixedExpense.collect', function () { var f = ctx.FixedExpense.collect({ monthRatio: 1 }); step('  -> ok=' + (f && f.ok)); });
guard('aggregateRegionsToVariables', function () { ctx.IntegrationBridge.aggregateRegionsToVariables(); });
step('ALL DONE turnIncome=' + (ctx.GM.guoku && ctx.GM.guoku.turnIncome));
