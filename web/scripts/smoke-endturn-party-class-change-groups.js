#!/usr/bin/env node
// smoke-endturn-party-class-change-groups.js - endturn party/class changes are localized and grouped.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error('[assert] ' + msg);
}

function count(src, needle) {
  return (src.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

function escHtml(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const sandbox = {
  console,
  Math, Date, JSON, RegExp, Error,
  Array, Object, String, Number, Boolean,
  parseInt, parseFloat, isNaN, isFinite,
  escHtml,
  TM: { errors: { capture() {}, captureSilent() {} } },
  GM: {
    turn: 9,
    turnChanges: {
      parties: [
        {
          name: '堂党',
          changes: [
            { field: 'influence', oldValue: 52, newValue: 53, reason: 'ecology matched corvee/military/keju' },
            { field: 'influence', oldValue: 53, newValue: 54, reason: 'ecology matched tax/corvee/military/keju/commerce' },
            { field: 'cohesion', oldValue: 64, newValue: 65, reason: 'AI turn result military arrears' }
          ]
        },
        {
          name: '清议党',
          changes: [
            { field: 'satisfaction', oldValue: 40, newValue: 38, reason: 'court feedback approved changed hukou census' }
          ]
        }
      ],
      classes: [
        {
          name: '士绅',
          changes: [
            { field: 'satisfaction', oldValue: 41, newValue: 39, reason: 'huji-governance-backlash' },
            { field: 'influence', oldValue: 70, newValue: 71, reason: 'social-political-signal land/tax/office' }
          ]
        }
      ]
    }
  }
};
sandbox.window = sandbox;  // 浏览器语义：window 即全局（compose IIFE 挂 window·alias 直达 sandbox 顶层）
vm.createContext(sandbox);

// 2026-07-06 弹窗组装拆至 sibling·须先加载（_renderUnifiedChanges alias 在此）
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-endturn-shiji-compose.js'), 'utf8'), sandbox, {
  filename: 'tm-endturn-shiji-compose.js'
});
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-endturn-render.js'), 'utf8'), sandbox, {
  filename: 'tm-endturn-render.js'
});

assert(typeof sandbox._renderUnifiedChanges === 'function', '_renderUnifiedChanges should be callable');

const html = sandbox._renderUnifiedChanges({});

assert(/data-action="turn-change-expand-all"/.test(html), 'party/class block should expose expand all action');
assert(/data-action="turn-change-collapse-all"/.test(html), 'party/class block should expose collapse all action');
assert(/class="tr-cg-fold-group"/.test(html), 'party/class changes should render collapsible groups');
assert(count(html, 'data-change-group="party:堂党"') === 1, 'same party should be grouped once');
assert(count(html, 'data-change-group="class:士绅"') === 1, 'same class should be grouped once');

assert(!/ecology matched/.test(html), 'raw ecology matched reason should not leak');
assert(!/AI turn result/.test(html), 'raw AI turn result reason should not leak');
assert(!/huji-governance-backlash/.test(html), 'raw huji governance key should not leak');
assert(!/court feedback/.test(html), 'raw court feedback key should not leak');
assert(!/social-political-signal/.test(html), 'raw social-political-signal key should not leak');

assert(/制度生态匹配/.test(html), 'ecology matched should be localized');
assert(/徭役/.test(html) && /军务/.test(html) && /科举/.test(html), 'reason tags should be localized');
assert(/AI推演结果/.test(html) && /军饷拖欠/.test(html), 'AI military arrears reason should be localized');
assert(/廷议裁定/.test(html), 'court feedback reason should be localized');
assert(/户口治理反噬/.test(html), 'huji backlash reason should be localized');
assert(/社会政治信号/.test(html), 'social-political signal reason should be localized');

console.log('[smoke-endturn-party-class-change-groups] PASS localized grouped party/class changes');
