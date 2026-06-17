#!/usr/bin/env node
// Smoke test for P4-beta tm-ui-foundation.js consolidation.

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

function makeElement(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    id: '',
    className: '',
    value: '',
    children: [],
    style: {},
    onclick: null,
    _innerHTML: '',
    appendChild(child) {
      this.children.push(child);
      if (child && child.id) elements.set(child.id, child);
      return child;
    },
    remove() {
      if (this.id) elements.delete(this.id);
      for (const [id, node] of [...elements.entries()]) {
        if (node === this) elements.delete(id);
      }
    },
    addEventListener(type, fn) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    }
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return this._innerHTML; },
    set(html) {
      this._innerHTML = String(html || '');
      if (this._innerHTML.includes('id="gm-save-btn"')) {
        const save = makeElement('button');
        save.id = 'gm-save-btn';
        elements.set('gm-save-btn', save);
      }
      if (this._innerHTML.includes('onclick="closeModal()"')) {
        const ok = makeElement('button');
        ok.className = 'bt bp';
        elements.set('__modal-ok', ok);
      }
    }
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
  querySelector(sel) {
    if (sel === '#gm-overlay .bt.bp') return elements.get('__modal-ok') || null;
    return null;
  },
  addEventListener(type, fn) {
    listeners[type] = listeners[type] || [];
    listeners[type].push(fn);
  }
};

const input = makeElement('input');
input.id = 'sample-input';
input.value = '  trimmed value  ';
elements.set(input.id, input);

const context = {
  console,
  document,
  window: null,
  escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m]);
  }
};
context.window = context;

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-ui-foundation.js'), 'utf8'), context, {
  filename: 'tm-ui-foundation.js'
});

assert(context.TM_ICONS && typeof context.TM_ICONS === 'object', 'TM_ICONS missing');
assert(typeof context.tmIcon === 'function', 'tmIcon missing');
assert(context.tmIcon('save', 16).includes('<svg width="16" height="16"'), 'tmIcon did not size svg');
assert(typeof context.gv === 'function', 'gv missing');
assert(context.gv('sample-input') === 'trimmed value', 'gv did not trim input');

let saved = false;
context.openGenericModal('Title', '<p>Body</p>', () => { saved = true; });
assert(elements.has('gm-overlay'), 'openGenericModal did not create overlay');
assert(typeof elements.get('gm-save-btn').onclick === 'function', 'save handler missing');
elements.get('gm-save-btn').onclick();
assert(saved, 'save handler was not invoked');
context.closeGenericModal();
assert(!elements.has('gm-overlay'), 'closeGenericModal did not remove overlay');

let closed = false;
context.showModal('Safe <Title>', '<p>Body</p>', () => { closed = true; });
assert(elements.has('gm-overlay'), 'showModal did not create overlay');
elements.get('__modal-ok').onclick();
assert(closed, 'showModal close callback was not invoked');

assert(context.TM && context.TM._migrationPlaceholders, 'migration placeholders missing');
assert(context.TM._migrationPlaceholders.some(p => p.createdBy === 'R22'), 'R22 settings placeholder missing');
assert(context.TM.cheatsheet && typeof context.TM.cheatsheet.show === 'function', 'TM.cheatsheet missing');
assert(context.TM.cheatsheet.sections.length >= 5, 'cheatsheet sections missing');
context.TM.cheatsheet.show();
assert(elements.has('tm-cheatsheet-overlay'), 'cheatsheet show did not create overlay');
context.TM.cheatsheet.hide();
assert(!elements.has('tm-cheatsheet-overlay'), 'cheatsheet hide did not remove overlay');
assert((listeners.keydown || []).length >= 1, 'cheatsheet hotkey was not installed');

console.log(`[smoke-ui-foundation] PASS ${passed} assertions`);
