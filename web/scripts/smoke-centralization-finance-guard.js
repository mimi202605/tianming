#!/usr/bin/env node
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

const ctx = {
  console,
  Math,
  Date,
  JSON,
  Array,
  Object,
  String,
  Number,
  RegExp,
  isFinite,
  P: {
    traitDefinitions: [],
    centralizationSystem: {
      enabled: true,
      defaultCentralization: 2,
      defaultRedistributionRate: 0.3,
      tributeRates: {
        1: { civil: 0.1, military: 0.1 },
        2: { civil: 0.3, military: 0.2 },
        3: { civil: 0.45, military: 0.35 },
        4: { civil: 0.6, military: 0.5 }
      }
    },
    territoryProductionSystem: { enabled: false },
    npcEngine: { enabled: false }
  },
  GM: {
    chars: [
      { id: 'root', name: 'Root', finance: { income: '10', expenses: {} } },
      { id: 'child-missing-finance', name: 'MissingFinance', overlordId: 'root', centralization: 2 },
      { id: 'child-string-finance', name: 'StringFinance', overlordId: 'root', centralization: 2, territoryType: 'civil', finance: { income: '200', tribute: 'bad', expenses: null } },
      null
    ]
  },
  _dbg: function(){},
  random: function(){ return 0.5; },
  uid: function(){ return 'id'; },
  addEB: function(){},
  extractJSON: function(text){ return JSON.parse(text); },
  callAI: async function(){ return '{}'; }
};
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);

const src = fs.readFileSync(path.join(ROOT, 'tm-npc-engine.js'), 'utf8');
vm.runInContext(src, ctx, { filename: 'tm-npc-engine.js' });

assert(ctx.CentralizationSystem && typeof ctx.CentralizationSystem.runSettlement === 'function',
  'CentralizationSystem should be exposed');

ctx.CentralizationSystem.runSettlement();

ctx.GM.chars.filter(Boolean).forEach(function(ch) {
  assert(ch.finance && typeof ch.finance === 'object', ch.name + ' finance should be normalized');
  assert(Number.isFinite(ch.finance.income), ch.name + ' income should be finite');
  assert(Number.isFinite(ch.finance.tribute), ch.name + ' tribute should be finite');
  assert(Number.isFinite(ch.finance.redistribution), ch.name + ' redistribution should be finite');
  assert(Number.isFinite(ch.finance.netIncome), ch.name + ' netIncome should be finite');
  assert(Array.isArray(ch.finance.expenses.fixed), ch.name + ' fixed expenses should default to an array');
});

ctx.CentralizationSystem.resetFinance();
ctx.GM.chars.filter(Boolean).forEach(function(ch) {
  assert(ch.finance.income === 0, ch.name + ' income should reset to 0');
  assert(ch.finance.netIncome === 0, ch.name + ' netIncome should reset to 0');
  assert(Array.isArray(ch.finance.expenses.fixed), ch.name + ' fixed expenses should survive reset');
});

console.log('[smoke-centralization-finance-guard] pass assertions=' + passed);
