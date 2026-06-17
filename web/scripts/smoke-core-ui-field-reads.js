#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error('[assert] ' + msg);
}

function load(file, context) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  vm.runInContext(src, context, { filename: file });
}

const GM = {
  turn: 3,
  date: 'test',
  authority: {
    huangquan: 88,
    huangwei: 77,
    minxin: 66
  },
  huangquan: { index: 0, value: 99 },
  huangwei: { index: 12, value: 99 },
  minxin: { trueIndex: 0, value: 99 },
  chars: [],
  guoku: { ledgers: { money: { stock: 1 }, grain: { stock: 2 }, cloth: { stock: 3 } } }
};

const localStore = {};
const context = {
  console,
  GM,
  P: {},
  window: null,
  TM: {},
  localStorage: {
    setItem(k, v) { localStore[k] = String(v); },
    getItem(k) { return Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null; },
    removeItem(k) { delete localStore[k]; },
    key(i) { return Object.keys(localStore)[i] || null; },
    get length() { return Object.keys(localStore).length; }
  },
  document: { createElement() { return { click() {} }; } },
  URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL() {} },
  Blob: function Blob() {}
};
context.window = context;

vm.createContext(context);
load('tm-data-access.js', context);
load('tm-state.js', context);

assert(context.DA.authority.huangquan() === 0, 'DA.authority should prefer canonical huangquan.index and preserve zero');
assert(context.DA.authority.huangwei() === 12, 'DA.authority should prefer canonical huangwei.index');
assert(context.DA.authority.minxin() === 0, 'DA.authority should prefer canonical minxin.trueIndex and preserve zero');

const summary = context.TM.state._extractSummary();
assert(summary.authority.huangquan === 0, 'TM.state should summarize canonical huangquan.index');
assert(summary.authority.huangwei === 12, 'TM.state should summarize canonical huangwei.index');
assert(summary.authority.minxin === 0, 'TM.state should summarize canonical minxin.trueIndex');

console.log('[smoke-core-ui-field-reads] PASS');
