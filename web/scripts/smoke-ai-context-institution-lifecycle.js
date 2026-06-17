#!/usr/bin/env node
// smoke-ai-context-institution-lifecycle.js - full AI context should include recent institution lifecycle feedback.

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
const QUEHUO = '\u69b7\u8d27\u53f8';
const OLD = '\u65e7\u90fd\u6c34\u76d1';

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
    turn: 96,
    year: 1627,
    month: 1,
    chars: [],
    facs: [],
    parties: [],
    classes: [],
    armies: [],
    items: [],
    regions: [],
    guoku: { money: 50000 },
    neitang: { money: 20000 },
    _eventBus: { items: [] },
    _institutionLifecycleEvents: [
      { turn: 95, id: 'inst_wenshu', name: WENSHU, action: 'underfunded', stage: 'underfunded', text: WENSHU + '\u7ecf\u8d39\u4e0d\u8db3\uff0c\u8fd0\u884c\u53d7\u632b' },
      { turn: 94, id: 'inst_quehuo', name: QUEHUO, action: 'corruption_high', stage: 'running', text: QUEHUO + '\u8150\u5316\u504f\u9ad8\uff0c\u9700\u76d1\u5bdf' },
      { turn: 20, id: 'inst_old', name: OLD, action: 'abolished', stage: 'abolished', text: OLD + '\u5df2\u5e9f' }
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

  assert(ctx.AIChangeApplier && typeof ctx.AIChangeApplier.buildFullAIContext === 'function', 'AIChangeApplier.buildFullAIContext should load');

  const aiContext = ctx.AIChangeApplier.buildFullAIContext();
  assert(Array.isArray(aiContext.recentInstitutionLifecycle), 'AI context should expose recentInstitutionLifecycle array');
  assert(aiContext.recentInstitutionLifecycle.length === 2, 'AI context should include only recent institution lifecycle events');
  assert(aiContext.recentInstitutionLifecycle.some(e => e && e.name === WENSHU && e.action === 'underfunded'), 'AI context should include recent underfunded institution');
  assert(aiContext.recentInstitutionLifecycle.some(e => e && e.name === QUEHUO && e.action === 'corruption_high'), 'AI context should include recent high-corruption institution');
  assert(!aiContext.recentInstitutionLifecycle.some(e => e && e.name === OLD), 'AI context should omit stale institution lifecycle noise');

  console.log('[smoke-ai-context-institution-lifecycle] PASS full AI context institution lifecycle');
})();
