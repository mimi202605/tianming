#!/usr/bin/env node
// smoke-wentian-light-theme.js — 玩家群 2026-07-22 实拍立案：素宣(浅)主题下问天确认卡
// 金字浅底糊成一片。防腐线：#wt-chat 在浅主题族(light/paper)作用域内把暗底调原色 token
// 重定标为深色档(ink-200/300→600/500·gold-300/400→600/500·celadon→500·vermillion-300→500)，
// 行内样式自动翻正；暗主题族不得被波及。

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let A = 0, F = 0;
function assert(cond, msg) {
  if (cond) { A++; console.log('  PASS ' + msg); }
  else { F++; console.log('  FAIL ' + msg); }
}

console.log('smoke-wentian-light-theme');

const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const i = css.indexOf('[data-theme="light"] #wt-chat');
assert(i >= 0, '浅主题问天重定标块在（light 族选择器挂 #wt-chat）');
const block = css.slice(i, css.indexOf('}', i) + 1);
assert(block.indexOf('[data-theme="paper"] #wt-chat') >= 0, 'paper 主题同享（素宣双别名）');
assert(/--ink-300:\s*var\(--ink-500\)/.test(block) && /--ink-200:\s*var\(--ink-600\)/.test(block),
  'ink 浅字重定标到深档（正文/注脚在浅底可读）');
assert(/--gold-300:\s*var\(--gold-600\)/.test(block) && /--gold-400:\s*var\(--gold-500\)/.test(block),
  'gold 金字重定标到深金（标签/题头在浅底可读）');
assert(/--celadon-400:\s*var\(--celadon-500\)/.test(block) && /--vermillion-300:\s*var\(--vermillion-500\)/.test(block),
  'celadon/vermillion 语义色同步压深');
assert(css.indexOf('[data-theme="sepia"] #wt-chat') < 0 && css.indexOf('[data-theme="blue"] #wt-chat') < 0,
  '暗主题族(sepia/blue 等)不被波及（只修浅族）');

console.log('smoke-wentian-light-theme ' + (F === 0 ? 'PASS' : 'FAIL') + ' ' + A + '/' + (A + F));
process.exit(F === 0 ? 0 : 1);
