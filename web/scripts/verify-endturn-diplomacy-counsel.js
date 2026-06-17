#!/usr/bin/env node
/* eslint-env node */
'use strict';
// 延后两点·endturn 演绎注入(tm-endturn-prompt.js 层2 玩家意图):
//   ④ 本回合采纳之谏(_adoptedCounsel)→演绎朝其推进;⑨ 本回合受使决断(_envoyAudiences disposition)→邦交后续演绎。
// prompt 构建器庞大·以 source 锁注入逻辑存在且 gating 正确。
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'tm-endturn-prompt.js'), 'utf8');
let passed = 0;
function assert(cond, label) { if (!cond) throw new Error('[assert] ' + label); passed += 1; }

// ④ 采纳之谏注入
assert(/_adoptedCounsel[\s\S]{0,120}filter\(function\(a\)\{ return a && a\.turn === GM\.turn/.test(src), '④应只注入本回合采纳之谏(_adoptedCounsel·turn 过滤)');
assert(/面谕纳谏[\s\S]{0,200}朝政当顺此推进/.test(src), '④应提示演绎朝采纳之谏推进');
assert(/a\.advisor[\s\S]{0,40}a\.counsel/.test(src), '④应列进言者+所纳之谏文本');

// ⑨ 受使决断注入
assert(/_envoyAudiences[\s\S]{0,160}e\.turn === GM\.turn && e\.disposition && e\.disposition !== 'received'/.test(src), '⑨应只注入本回合有处置的受使决断(排除纯 received)');
assert(/受使决断[\s\S]{0,260}边衅风险升/.test(src), '⑨应提示驳索贡/和亲→边衅风险升(军事后果经叙事+势力行动)');
assert(/准其请和\/结盟[\s\S]{0,80}战事或渐息/.test(src), '⑨应提示准请和/结盟→战事渐息');

// 两块都在层2(玩家意图·_heldMems 之前)
var idxCounsel = src.indexOf('面谕纳谏');
var idxEnvoy = src.indexOf('受使决断');
var idxHeld = src.indexOf('var _heldMems = (GM.memorials||[]).filter');
assert(idxCounsel > 0 && idxEnvoy > 0 && idxHeld > 0, '三锚点均应存在');
assert(idxCounsel < idxHeld && idxEnvoy < idxHeld, '两注入块应在 _heldMems 之前(层2 玩家意图内)');

console.log('[verify-endturn-diplomacy-counsel] PASS ' + passed + ' assertions');
