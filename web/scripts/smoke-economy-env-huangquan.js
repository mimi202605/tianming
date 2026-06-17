#!/usr/bin/env node
/* eslint-env node */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'tm-economy-engine.js'), 'utf8');

let assertions = 0;
function assert(cond, msg) {
  if (!cond) throw new Error('[smoke-economy-env-huangquan] ' + msg);
  assertions += 1;
}

const math = Object.create(Math);
math.random = () => 1;

const authorityCalls = [];
const ctx = {
  console,
  Date,
  JSON,
  Math: math,
  Object,
  Array,
  Number,
  String,
  Boolean,
  parseInt,
  parseFloat,
  isFinite,
  TM: { errors: { capture() {}, captureSilent() {} } },
  GM: {
    sid: 'smoke',
    turn: 12,
    regions: [{ id: 'capital', unrest: 30, disasterLevel: 0 }],
    population: {
      byRegion: { capital: { mouths: 1100000, yearlyDeaths: 0 } },
      national: { mouths: 1100000 }
    },
    minxin: { trueIndex: 60 },
    huangquan: { index: 55 },
    environment: {
      _inited: true,
      techEra: 'ming',
      nationalLoad: 2.0,
      nationalCarrying: {},
      activePolicies: [],
      crisisHistory: [],
      byRegion: {
        capital: {
          carrying: {
            farmlandSupport: 425000,
            waterSupport: 1500000,
            fuelSupport: 750000,
            housingSupport: 1200000,
            sanitationSupport: 1000000
          },
          carryingMax: 425000,
          ecoScars: {
            deforestation: 0,
            soilErosion: 0,
            waterTableDrop: 0,
            riverSilting: 0,
            soilFertilityLoss: 0,
            salinization: 0,
            desertification: 0,
            biodiversityLoss: 0,
            urbanSewageOverload: 0
          },
          currentLoad: 2.0,
          overloadYears: 0,
          forestArea: 500000,
          coalReserve: 0,
          aquiferLevel: 1.0,
          riverFlow: 1.0,
          arableArea: 500000,
          soilFertility: 0.85,
          techLevel: {}
        }
      }
    }
  },
  _adjAuthority(key, delta, reason, meta) {
    authorityCalls.push({ key, delta, reason, meta });
    if (key === 'minxin') ctx.GM.minxin.trueIndex += delta;
    if (key === 'huangquan') ctx.GM.huangquan.index += delta;
    return { ok: true };
  },
  addEB() {},
  turnsForMonths(months) { return months; },
  findScenarioById() { return null; }
};
ctx.window = ctx;
ctx.global = ctx;
ctx.globalThis = ctx;

vm.createContext(ctx);
vm.runInContext(src, ctx, { filename: 'tm-economy-engine.js' });

const beforeHuangquan = ctx.GM.huangquan.index;
ctx.EnvCapacityEngine.tick({ monthRatio: 1, turn: ctx.GM.turn });

assert(ctx.GM.environment.nationalLoad > 1.2, 'fixture should remain overloaded after recompute');
assert(authorityCalls.some(call => call.key === 'minxin'), 'overload should still affect minxin');
assert(!authorityCalls.some(call => call.key === 'huangquan'), 'environment capacity must not adjust huangquan');
assert(ctx.GM.huangquan.index === beforeHuangquan, 'huangquan index should remain unchanged by environment capacity');

console.log('[smoke-economy-env-huangquan] pass assertions=' + assertions);
