#!/usr/bin/env node
/* eslint-env node */
'use strict';
// 1b·赏赐/犒赏诏令识别验证·2026-05-31
// 验 extractEdictActions 新增的 rewards 识别：认 犒赏/赏赐/封赏/加俸 + 已知名 salvage，且不误吞"赐死"(那是 deaths)。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, label) { if (!cond) throw new Error('[assert] ' + label); passed += 1; }

const sandbox = { console, RegExp, Array, Object, String, Number, Boolean, JSON, Math, Date };
sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
sandbox.GM = { chars: [{ name: '孙传庭' }, { name: '袁崇焕' }, { name: '魏忠贤' }], officeTree: [] };
sandbox.P = { playerInfo: { characterName: '崇祯' } };
sandbox.addEB = function () {};
sandbox._dbg = function () {};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-endturn-edict.js'), 'utf8'), sandbox, { filename: 'tm-endturn-edict.js' });

assert(typeof sandbox.extractEdictActions === 'function', 'extractEdictActions 已定义');

function names(arr) { return (arr || []).map(function (x) { return x.character; }); }

// ① 犒赏/赏赐 → rewards 命中（含 salvage：犒赏后接"白银千两"也能兜回主名）
var a1 = sandbox.extractEdictActions('犒赏孙传庭白银千两，赏赐袁崇焕蟒玉');
assert(names(a1.rewards).indexOf('孙传庭') >= 0, '①犒赏孙传庭→rewards 含孙传庭（salvage 兜回）·实得 ' + JSON.stringify(names(a1.rewards)));
assert(names(a1.rewards).indexOf('袁崇焕') >= 0, '①赏赐袁崇焕→rewards 含袁崇焕·实得 ' + JSON.stringify(names(a1.rewards)));

// ② 加俸（动词在前）+ 名+受赏（名在前）两式都认
var a2 = sandbox.extractEdictActions('加俸孙传庭');
assert(names(a2.rewards).indexOf('孙传庭') >= 0, '②加俸孙传庭→命中·实得 ' + JSON.stringify(names(a2.rewards)));
var a2b = sandbox.extractEdictActions('袁崇焕受赏');
assert(names(a2b.rewards).indexOf('袁崇焕') >= 0, '②袁崇焕受赏→命中·实得 ' + JSON.stringify(names(a2b.rewards)));

// ③ 不误吞"赐死"——赐死魏忠贤应入 deaths、绝不入 rewards
var a3 = sandbox.extractEdictActions('赐死魏忠贤');
assert(names(a3.rewards).indexOf('魏忠贤') < 0, '③赐死魏忠贤绝不入 rewards·实得 rewards=' + JSON.stringify(names(a3.rewards)));
assert(names(a3.deaths).indexOf('魏忠贤') >= 0, '③赐死魏忠贤应入 deaths·实得 deaths=' + JSON.stringify(names(a3.deaths)));

// ④ 赏赐与赐死同诏：各归各（孙→rewards、魏→deaths）
var a4 = sandbox.extractEdictActions('赏赐孙传庭，赐死魏忠贤');
assert(names(a4.rewards).indexOf('孙传庭') >= 0 && names(a4.rewards).indexOf('魏忠贤') < 0, '④混诏·孙入rewards魏不入·实得 rewards=' + JSON.stringify(names(a4.rewards)));
assert(names(a4.deaths).indexOf('魏忠贤') >= 0, '④混诏·魏入deaths·实得 deaths=' + JSON.stringify(names(a4.deaths)));

console.log('  1b 识别: 犒赏/赏赐/加俸/受赏 命中(含salvage)·赐死不误吞·混诏各归各');
console.log('[verify-edict-reward] PASS assertions=' + passed);
