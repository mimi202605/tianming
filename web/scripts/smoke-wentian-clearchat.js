#!/usr/bin/env node
// smoke-wentian-clearchat.js — 玩家群 2026-07-21 点名：问天要有「只清对话记录·保留指令」。
// 此前只有红字「清除指令」（连注入规矩一起清·易误点）。防腐线：
// ① 工具行有独立「清空对话」钮·排在「清除指令」之前且不带 vermillion 危险色
// ② _wtClearChatLog 只重置 _wentianHistory·绝不碰 _playerDirectives/_importedMemories
// ③ 清后留一条 system 行说明指令仍生效·有 confirm 守门

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let A = 0, F = 0;
function assert(cond, msg) {
  if (cond) { A++; console.log('  PASS ' + msg); }
  else { F++; console.log('  FAIL ' + msg); }
}

console.log('smoke-wentian-clearchat');

const loop = fs.readFileSync(path.join(ROOT, 'tm-game-loop.js'), 'utf8');
const hard = fs.readFileSync(path.join(ROOT, 'tm-game-loop-wentian-hardchange.js'), 'utf8');

const iChat = loop.indexOf('_wtClearChatLog()');
const iDir = loop.indexOf('_wtClearDirectives()');
assert(iChat >= 0, '工具行挂了「清空对话」钮(_wtClearChatLog)');
assert(iDir >= 0 && iChat < iDir, '「清空对话」排在「清除指令」之前(温和动作在先)');
const chatBtn = loop.slice(Math.max(0, iChat - 120), iChat);
assert(chatBtn.indexOf('vermillion') < 0, '「清空对话」不带危险红(只有清指令才红)');

assert(hard.indexOf('function _wtClearChatLog') >= 0, '_wtClearChatLog 函数在 hardchange 文件');
const fnStart = hard.indexOf('function _wtClearChatLog');
const fnEnd = hard.indexOf('function _wtClearDirectives', fnStart);
const fnBody = hard.slice(fnStart, fnEnd > fnStart ? fnEnd : fnStart + 900);
assert(/GM\._wentianHistory\s*=\s*\[\]/.test(fnBody), '清空=整体重置 _wentianHistory');
assert(!/_playerDirectives\s*=/.test(fnBody) && !/_playerDirectives\.push/.test(fnBody) &&
  !/_importedMemories\s*=/.test(fnBody) && !/_importedMemories\.push/.test(fnBody),
  '绝不写 _playerDirectives / _importedMemories(指令与记忆保留·注释提及不算)');
assert(fnBody.indexOf('confirm(') >= 0, '有 confirm 守门(防误点)');
assert(fnBody.indexOf('仍在生效') >= 0, '清后留 system 行说明指令仍生效');
assert(/_wtRenderHistory\(\)/.test(fnBody), '清后重渲对话区');

console.log('smoke-wentian-clearchat ' + (F === 0 ? 'PASS' : 'FAIL') + ' ' + A + '/' + (A + F));
process.exit(F === 0 ? 0 : 1);
