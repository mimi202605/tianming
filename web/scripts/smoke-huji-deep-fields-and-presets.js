#!/usr/bin/env node
// smoke-huji-deep-fields-and-presets.js - huji presets and deep demographic fields must affect runtime.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error('[assert] ' + msg);
}

function load(ctx, rel) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel });
}

const ctx = {
  console,
  Math, Date, JSON, RegExp, Error,
  Array, Object, String, Number, Boolean,
  parseInt, parseFloat, isNaN, isFinite,
  setTimeout() { return 1; },
  clearTimeout() {},
  addEB() {}
};
ctx.window = ctx;
ctx.global = ctx;
ctx.globalThis = ctx;
ctx.TM = { errors: { capture() {}, captureSilent() {} } };
ctx.GM = {
  sid: 'huji-deep-fields',
  turn: 120,
  year: 1627,
  guoku: { money: 800000, grain: 400000 },
  minxin: { trueIndex: 43 },
  huangquan: { index: 38 },
  corruption: { trueIndex: 72 },
  activeWars: [{ id: 'frontier-war' }],
  regions: [
    { id: 'frontier', name: '边地府' },
    { id: 'capital', name: '京畿府' }
  ]
};
ctx.P = {
  id: 'huji-deep-fields',
  name: '明 户口深字段烟测',
  dynasty: '明',
  populationConfig: {
    initial: {
      nationalHouseholds: 240000,
      nationalMouths: 1200000,
      nationalDing: 360000,
      hiddenPopulation: 80000,
      byRegion: {
        frontier: {
          households: 140000,
          mouths: 760000,
          ding: 250000,
          hidden: 50000,
          fugitives: 18000,
          byAge: { age_0_10: 160000, age_11_20: 130000, age_21_30: 130000, age_31_40: 110000, age_41_50: 85000, age_51_60: 65000, age_61_70: 45000, age_71_plus: 35000 },
          byGender: { male: 410000, female: 350000 },
          byEthnicity: { han: 0.58, miao: 0.24, yi: 0.18 },
          byFaith: { confucian: 0.36, buddhist: 0.12, taoist: 0.08, folk: 0.44 },
          baojiaUnits: 0
        },
        capital: {
          households: 100000,
          mouths: 440000,
          ding: 110000,
          hidden: 8000,
          fugitives: 3000,
          byAge: { age_0_10: 80000, age_11_20: 78000, age_21_30: 82000, age_31_40: 70000, age_41_50: 54000, age_51_60: 42000, age_61_70: 22000, age_71_plus: 12000 },
          byGender: { male: 220000, female: 220000 },
          byEthnicity: { han: 0.94, other: 0.06 },
          byFaith: { confucian: 0.58, buddhist: 0.18, taoist: 0.12, folk: 0.12 },
          baojiaUnits: 12000
        }
      }
    },
    categoryEnabled: ['bianhu', 'junhu', 'jianghu', 'sengdao', 'yuehu'],
    corveeRules: { annualCorveeDays: 60, commutationRate: 0.1 },
    militaryRules: { maxExpansionRate: 0.08 }
  }
};
ctx.findScenarioById = () => ctx.P;

vm.createContext(ctx);
load(ctx, 'tm-huji-engine.js');

ctx.HujiEngine.init(ctx.P);
assert(ctx.HujiEngine.LARGE_CORVEE_PRESETS.length >= 25, 'large corvee historical presets should reach 25');

const P = ctx.GM.population;
assert(P.byRegion.frontier.byAge && P.byRegion.frontier.byGender, 'region deep age/gender fields should be preserved');
assert(P.byRegion.frontier.byEthnicity && P.byRegion.frontier.byFaith, 'region ethnicity/faith fields should be preserved');

const before = {
  serviceDing: P.national.ding,
  hiddenFrontier: P.byRegion.frontier.hidden,
  fugitivesFrontier: P.byRegion.frontier.fugitives,
  hiddenCapital: P.byRegion.capital.hidden,
  fugitivesCapital: P.byRegion.capital.fugitives,
  maleFrontier: P.byRegion.frontier.byGender.male,
  unrest: ctx.GM.unrest || 0
};

ctx.HujiEngine.tick({ turn: 121, monthRatio: 12, _monthRatio: 12 });

assert(P.deepFieldEffects, 'HujiEngine should expose deepFieldEffects');
assert(P.deepFieldEffects.serviceAgeDing > 0, 'age/gender fields should compute service-age ding');
assert(P.deepFieldEffects.serviceAgeDing < before.serviceDing, 'service-age ding should constrain national ding/pool');
assert(P.corvee.deepFieldEffects && P.corvee.deepFieldEffects.effectiveDing <= P.deepFieldEffects.serviceAgeDing, 'corvee should use service-age ding');
assert(P.military.deepFieldEffects && P.military.totalPool <= P.deepFieldEffects.serviceAgeDing, 'military pool should use service-age ding');
assert(P.byRegion.frontier.byGender.male < before.maleFrontier, 'active war should reduce male population through gender field');
assert(P.byRegion.capital.hidden < before.hiddenCapital, 'baojia should reduce hidden households in covered region');
assert(P.byRegion.capital.fugitives < before.fugitivesCapital, 'baojia should reduce fugitives in covered region');
assert(P.byRegion.frontier.fugitives > before.fugitivesFrontier, 'low-trust heterogeneous frontier should create fugitive pressure');
assert(P.deepFieldEffects.ethnicityFaithPressure > 0, 'ethnicity/faith mix should be measured as pressure');
assert(Array.isArray(P.deepFieldEffects.ledger) && P.deepFieldEffects.ledger.length >= 2, 'deep field effects should keep ledger');

console.log('[smoke-huji-deep-fields-and-presets] PASS huji deep fields and presets');
