#!/usr/bin/env node
// Smoke test for P4-beta tm-diagnostics-foundation.js consolidation.

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

const elements = new Map();
const listeners = {};
let timers = 0;

function makeElement(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    id: '',
    className: '',
    style: {},
    children: [],
    onclick: null,
    href: '',
    download: '',
    _innerHTML: '',
    appendChild(child) {
      this.children.push(child);
      if (child && child.id) elements.set(child.id, child);
      return child;
    },
    remove() {
      if (this.id) elements.delete(this.id);
    },
    click() {
      this.clicked = true;
    },
    addEventListener(type, fn) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    }
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return this._innerHTML; },
    set(html) { this._innerHTML = String(html || ''); }
  });
  return el;
}

const body = makeElement('body');
const document = {
  readyState: 'complete',
  body,
  createElement: makeElement,
  getElementById(id) {
    return elements.get(id) || null;
  },
  addEventListener(type, fn) {
    listeners[type] = listeners[type] || [];
    listeners[type].push(fn);
  }
};

function addEventListener(type, fn) {
  listeners[type] = listeners[type] || [];
  listeners[type].push(fn);
}

const context = {
  console: {
    log() {},
    info() {},
    warn() {},
    error() {}
  },
  document,
  window: null,
  GM: { turn: 7 },
  Blob: function(parts, opts) { this.parts = parts; this.opts = opts; },
  URL: {
    createObjectURL() { return 'blob:diagnostics'; },
    revokeObjectURL() {}
  },
  Date,
  Error,
  Object,
  Array,
  String,
  Math,
  JSON,
  setTimeout(fn) {
    timers++;
    if (typeof fn === 'function') fn();
    return timers;
  },
  clearTimeout() {},
  setInterval(fn) {
    timers++;
    return timers;
  },
  clearInterval() {},
  addEventListener
};
context.window = context;

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-diagnostics-foundation.js'), 'utf8'), context, {
  filename: 'tm-diagnostics-foundation.js'
});

assert(context.TM && typeof context.TM === 'object', 'TM missing');
assert(context.TM.errors && typeof context.TM.errors.capture === 'function', 'TM.errors.capture missing');
assert(typeof context.TM.errors.captureSilent === 'function', 'TM.errors.captureSilent missing');
assert(typeof context.TM.errors.getSummary === 'function', 'TM.errors.getSummary missing');
assert(typeof context.TM.errors.openPanel === 'function', 'TM.errors.openPanel missing');

const before = context.TM.errors.getLog().length;
const prevMirror = context.TM.errors.consoleMirror;
context.TM.errors.consoleMirror = false;
context.TM.errors.capture(new Error('diag-smoke-loud'), 'diag-smoke');
context.TM.errors.captureSilent(new Error('diag-smoke-silent'), 'diag-smoke');
context.TM.errors.consoleMirror = prevMirror;
assert(context.TM.errors.getLog().length === before + 2, 'TM.errors did not record captures');
assert(context.TM.errors.getLogSilent().length >= 1, 'silent capture not recorded');
assert(context.TM.errors.getLogLoud().some(e => e.module === 'diag-smoke'), 'loud capture not recorded');
assert(context.TM.errors.byModule('diag-smoke').length >= 2, 'byModule did not find captures');
assert(context.TM.errors.getSummary()['diag-smoke'].count >= 2, 'summary did not count captures');

context.TM.errors.openPanel();
assert(elements.has('tm-errors-panel'), 'errors panel did not open');
context.TM._renderErrorsPanel();
assert(elements.get('tm-errors-panel').innerHTML.includes('Ctrl+Shift+E'), 'errors panel did not render');
context.TM._downloadErrorsJSON();
context.TM.errors.closePanel();
assert(!elements.has('tm-errors-panel'), 'errors panel did not close');

assert(context.TM.guard && typeof context.TM.guard.snapshot === 'function', 'TM.guard missing');
const snapCount = context.TM.guard.snapshot();
assert(typeof snapCount === 'number' && snapCount > 0, 'guard snapshot count invalid');
context.diagSmokeAddedGlobal = function() {};
let diff = context.TM.guard.diffSince();
assert(diff.added.some(a => a.key === 'diagSmokeAddedGlobal'), 'guard did not detect added global');

context.diagSmokeOverride = function original() {};
context.TM.guard.snapshot();
context.diagSmokeOverride = function replacement() {};
diff = context.TM.guard.diffSince();
assert(diff.overridden.some(o => o.key === 'diagSmokeOverride'), 'guard did not detect overridden function');

const report = context.TM.guard.report();
assert(report && typeof report.total === 'number', 'guard report invalid');
assert(context.TM.Diagnostics && context.TM.Diagnostics.errors === context.TM.errors, 'TM.Diagnostics.errors not linked');
assert(context.TM.Diagnostics.guard === context.TM.guard, 'TM.Diagnostics.guard not linked');
assert(typeof context.TM.Diagnostics.report === 'function', 'TM.Diagnostics.report missing');
assert((listeners.error || []).length >= 1, 'global error listener missing');
assert((listeners.unhandledrejection || []).length >= 1, 'global rejection listener missing');
assert((listeners.keydown || []).length >= 1, 'errors hotkey listener missing');

console.log(`[smoke-diagnostics-foundation] PASS ${passed} assertions`);
