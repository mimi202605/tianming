#!/usr/bin/env node
// smoke-wentian-light-theme.js — 玩家群 2026-07-22 实拍立案（二拍改根治）：
// 过回合后问天/问对/朝会等聊天区整体洗白，根因=根元素偶发被挂 data-theme=light/paper，
// styles.css 的素宣主题块把 sunken/elevated/accent-subtle 族 token 全翻浅（外壳被
// _tmThemeOverride 钉暗 → 外暗内白）。白底主题运行时早已停用（setTheme 拒收），
// 根治=①拆除 light/paper 活 CSS 块（负向棘轮）②根元素 setAttribute 守卫拒写留案底。

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
// ① 负向棘轮：停用主题不得再有活 CSS 规则块（注释里提及不算——只查选择器起始位形态）
assert(!/^\s*\[data-theme="light"\]/m.test(css) && !/\[data-theme="light"\]\s*[,{]/.test(css),
  '素宣 light 主题块已拆除（无活选择器）');
assert(!/\[data-theme="paper"\]\s*[,{]/.test(css), 'paper 别名同拆（无活选择器）');
assert(!/\[data-theme="light"\]\s+#wt-chat/.test(css), '旧 #wt-chat 单点重定标块已随根治撤除');
// 暗主题族保持完好（sepia 仍是暗色·turn-modal 隔离由 smoke-turn-result-theme-guard 另守）
assert(/\[data-theme="sepia"\],\[data-theme="scroll"\]/.test(css), '古卷 sepia/scroll 暗主题块仍在');

// ② 守卫契约：tm-audio-theme.js 在实例层遮蔽根元素 setAttribute·拒写 light/paper·留案底
const js = fs.readFileSync(path.join(ROOT, 'tm-audio-theme.js'), 'utf8');
assert(/__tmThemeTrace/.test(js), '守卫案底 window.__tmThemeTrace 在（复现取证用）');
assert(/value === 'light' \|\| value === 'paper'/.test(js), '守卫拦截名单=light/paper 两值');
assert(/_origSet\(name, value\)/.test(js), '非拦截属性原样放行（不破坏其他 setAttribute）');
assert(/setTheme:\s*function[\s\S]{0,200}light.*paper|themeName === 'light' \|\| themeName === 'paper'/.test(js),
  'ThemeSystem.setTheme 白底拒收闸仍在（守卫是第二道·不是替代）');

console.log('smoke-wentian-light-theme ' + (F === 0 ? 'PASS' : 'FAIL') + ' ' + A + '/' + (A + F));
process.exit(F === 0 ? 0 : 1);
