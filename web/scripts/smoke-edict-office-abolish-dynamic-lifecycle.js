#!/usr/bin/env node
// smoke-edict-office-abolish-dynamic-lifecycle.js - direct abolish edicts must close dynamic institution lifecycle.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error('[assert] ' + msg);
}

function load(ctx, file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

const createEdict = '诏令：设文书司，正五品，掌令档案，司典籍校雠。';
const abolishEdict = '诏令：裁撤文书司机构，职掌归并吏部，罢其冗员。';

const ctx = {
  console,
  Date, JSON, Math,
  setTimeout: () => {},
  clearTimeout: () => {},
  GM: {
    turn: 72,
    month: 1,
    huangquan: { index: 60 },
    huangwei: { index: 60 },
    minxin: { trueIndex: 55 },
    guoku: { money: 5000000 },
    officeTree: { central: {} },
    chars: [],
    corruption: { overall: 30 },
    _pendingMemorials: [],
    _pendingClarifications: [],
    dynamicInstitutions: [],
    customOffices: []
  },
  P: {},
  addEB: () => {},
  toast: () => {},
  callAI: async () => null
};
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);

(function main() {
  load(ctx, 'tm-edict-parser.js');

  assert(ctx.EdictParser && typeof ctx.EdictParser.tryExecute === 'function', 'EdictParser.tryExecute should load');

  const created = ctx.EdictParser.tryExecute(createEdict, {}, {});
  assert(created && created.ok, 'direct office create edict should execute before abolish test');

  const inst = ctx.GM.dynamicInstitutions.find(i => i && i.name === '文书司');
  assert(inst, 'create edict should register target institution');
  assert(inst.stage !== 'abolished', 'target institution should start active');

  ctx.GM.turn = 74;
  const beforeCount = ctx.GM.dynamicInstitutions.length;
  const abolished = ctx.EdictParser.tryExecute(abolishEdict, {}, {});
  assert(abolished && abolished.ok, 'direct office abolish edict should execute');
  assert(abolished.classification && abolished.classification.typeKey === 'office_reform', 'abolish edict should classify as office_reform');
  assert(ctx.GM.dynamicInstitutions.length === beforeCount, 'abolish edict should not create a replacement institution');
  assert(inst.stage === 'abolished', 'target institution should enter abolished stage');
  assert(inst.abolishedTurn === 74, 'target institution should record abolished turn');
  assert(ctx.GM.customOffices.some(o => o && o.name === '文书司'), 'legacy customOffices mirror should remain as historical record');

  console.log('[smoke-edict-office-abolish-dynamic-lifecycle] PASS direct office abolish dynamic lifecycle');
})();
