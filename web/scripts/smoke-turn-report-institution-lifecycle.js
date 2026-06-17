#!/usr/bin/env node
// smoke-turn-report-institution-lifecycle.js - turn report should render dynamic institution lifecycle feedback.

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

const WENSHU = '\u6587\u4e66\u53f8';

const ctx = {
  console,
  Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp,
  isFinite, isNaN, parseInt, parseFloat, Promise, Symbol, Map, Set,
  setTimeout: () => 0,
  clearTimeout: () => {},
  setInterval: () => 0,
  clearInterval: () => {},
  Error, TypeError, RangeError,
  GM: {
    turn: 89,
    chars: [],
    facs: [],
    parties: [],
    classes: [],
    armies: [],
    items: [],
    regions: [],
    _turnReport: [
      { type: 'institution_lifecycle', action: 'underfunded', name: WENSHU, stage: 'underfunded', text: WENSHU + '\u7ecf\u8d39\u4e0d\u8db3\uff0c\u8fd0\u884c\u53d7\u632b', turn: 88 },
      { type: 'institution_lifecycle', action: 'corruption_high', name: WENSHU, stage: 'underfunded', text: WENSHU + '\u8150\u5316\u504f\u9ad8\uff0c\u9700\u76d1\u5bdf', turn: 88 }
    ]
  },
  P: {},
  escHtml: (s) => String(s == null ? '' : s)
};
ctx.window = ctx;
ctx.global = ctx;
ctx.globalThis = ctx;
ctx.TM = { errors: { capture() {}, captureSilent() {} } };
vm.createContext(ctx);

(function main() {
  load(ctx, 'tm-ai-change-pathutils.js');
  load(ctx, 'tm-ai-change-army.js');
  load(ctx, 'tm-ai-change-narrative.js');
  load(ctx, 'tm-ai-change-applier.js');

  assert(ctx.AIChangeApplier && typeof ctx.AIChangeApplier.generateTurnReport === 'function', 'AIChangeApplier.generateTurnReport should load');
  assert(typeof ctx.AIChangeApplier.renderTurnReport === 'function', 'AIChangeApplier.renderTurnReport should load');

  const rep = ctx.AIChangeApplier.generateTurnReport(88);
  assert(rep && !rep.empty, 'turn report should not be empty');
  assert(Array.isArray(rep.institutionLifecycle), 'turn report should expose institutionLifecycle array');
  assert(rep.institutionLifecycle.length === 2, 'turn report should include all institution lifecycle events');

  const html = ctx.AIChangeApplier.renderTurnReport(88);
  assert(/\u5236\u5ea6\u8fd0\u884c/.test(html), 'rendered turn report should include institution lifecycle section heading');
  assert(html.includes(WENSHU), 'rendered turn report should include institution name');
  assert(/\u7ecf\u8d39\u4e0d\u8db3|\u8150\u5316\u504f\u9ad8/.test(html), 'rendered turn report should include lifecycle event text');

  console.log('[smoke-turn-report-institution-lifecycle] PASS turn report institution lifecycle rendering');
})();
