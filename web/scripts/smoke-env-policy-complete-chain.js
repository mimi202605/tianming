#!/usr/bin/env node
// smoke-env-policy-complete-chain.js - environment edicts must become live policies.
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
  parseInt, parseFloat, isFinite, isNaN,
  setTimeout() { return 1; },
  clearTimeout() {},
  addEB() {},
  toast() {}
};
ctx.window = ctx;
ctx.global = ctx;
ctx.globalThis = ctx;
ctx.TM = { errors: { capture() {}, captureSilent() {} } };
ctx.GM = {
  sid: 'env-policy-chain',
  turn: 72,
  regions: [
    { id: 'mountain', name: '山地府', unrest: 30, disasterLevel: 0.4 },
    { id: 'plain', name: '平原府', unrest: 20 }
  ],
  guoku: { money: 1000000, grain: 500000 },
  minxin: { trueIndex: 58 },
  population: {
    national: { households: 240000, mouths: 1200000, ding: 360000 },
    byRegion: {
      mountain: { households: 160000, mouths: 900000, ding: 270000, yearlyNetMigration: 0, yearlyDeaths: 0 },
      plain: { households: 80000, mouths: 300000, ding: 90000, yearlyNetMigration: 0, yearlyDeaths: 0 }
    }
  }
};
ctx.P = {
  id: 'env-policy-chain',
  name: '明末环境政策烟测',
  dynasty: '明',
  environmentConfig: {
    initialCarrying: {
      byRegion: {
        mountain: { arableArea: 220000, forestArea: 120000, soilFertility: 0.55, techLevel: { agriculture: 1, irrigation: 1 } },
        plain: { arableArea: 900000, forestArea: 650000, soilFertility: 0.88, techLevel: { agriculture: 1, irrigation: 1 } }
      }
    },
    initialScars: {
      byRegion: {
        mountain: { deforestation: 0.62, soilErosion: 0.58, riverSilting: 0.42, soilFertilityLoss: 0.52 },
        plain: { deforestation: 0.12, soilErosion: 0.10, riverSilting: 0.08, soilFertilityLoss: 0.06 }
      }
    }
  }
};
ctx.findScenarioById = () => ctx.P;

vm.createContext(ctx);
load(ctx, 'tm-economy-engine.js');
load(ctx, 'tm-edict-parser.js');

ctx.EnvCapacityEngine.init(ctx.P);

const policyIds = ctx.EnvCapacityEngine.ENV_POLICIES.map(p => p.id);
['migration_relief', 'tech_investment', 'disaster_recovery'].forEach(id => {
  assert(policyIds.includes(id), id + ' should be a real ENV_POLICIES entry');
});

const beforeMoney = ctx.GM.guoku.money;
const beforeGrain = ctx.GM.guoku.grain;
const beforeMountainMouths = ctx.GM.population.byRegion.mountain.mouths;
const beforePlainMouths = ctx.GM.population.byRegion.plain.mouths;
const beforeTech = ctx.GM.environment.byRegion.mountain.techLevel.irrigation;
const beforeScar = ctx.GM.environment.byRegion.mountain.ecoScars.soilErosion;
const beforeArable = ctx.GM.environment.byRegion.mountain.arableArea;

const edicts = [
  '诏令：山地府迁民出山，移民减压，给粮安置于平原府。',
  '诏令：山地府技术投入，修省水农具与水利技术，以救承载。',
  '诏令：山地府灾后恢复，复耕三年，修水毁田土。'
];
edicts.forEach(text => {
  const result = ctx.EdictParser.tryExecute(text, {}, { source: 'smoke-env-policy-complete-chain' });
  assert(result && result.ok, 'edict should execute directly: ' + text);
});

const active = ctx.GM.environment.activePolicies || [];
['migration_relief', 'tech_investment', 'disaster_recovery'].forEach(id => {
  assert(active.some(p => p.id === id && p.regionId === 'mountain'), id + ' should become an active mountain policy');
});

assert(ctx.GM.guoku.money < beforeMoney, 'environment policies should spend money');
assert(ctx.GM.guoku.grain < beforeGrain, 'migration/recovery should spend grain');
assert(ctx.GM.population.byRegion.mountain.mouths < beforeMountainMouths, 'migration relief should move people out of overloaded region');
assert(ctx.GM.population.byRegion.plain.mouths > beforePlainMouths, 'migration relief should settle people in receiving region');
assert(ctx.GM.environment.byRegion.mountain.techLevel.irrigation > beforeTech, 'tech investment should raise a real tech level');
assert(ctx.GM.environment.byRegion.mountain.arableArea > beforeArable, 'disaster recovery should restore arable area');

ctx.EnvCapacityEngine.tick({ turn: 73, monthRatio: 12, _monthRatio: 12 });
assert(ctx.GM.environment.byRegion.mountain.ecoScars.soilErosion < beforeScar, 'active policies should reduce scars through tick');
assert(ctx.GM._envPolicyActions && ctx.GM._envPolicyActions.length >= 3, 'edict path should audit environment policy actions');
assert(ctx.GM.environment.policyHistory && ctx.GM.environment.policyHistory.length >= 3, 'environment should keep policy history');

console.log('[smoke-env-policy-complete-chain] PASS environment policy complete chain');
