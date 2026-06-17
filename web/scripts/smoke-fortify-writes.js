#!/usr/bin/env node
'use strict';
// smoke-fortify-writes — fortify 加固死分支修(Tier1·簇3#8)
//   旧 if(typeof _armyMatch.fortification === 'number') 因字段从不初始化→永远 no-op(加固写不进)。
//   修:无条件写 (Number(x)||0)+5 从 0 累加。验:源契约 + 复刻分支(新写得进·旧 no-op)。
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function ok(c, m){ if(!c) throw new Error('FAIL: '+m); A++; console.log('  ✓ '+m); }

console.log('smoke-fortify-writes');
const apply = fs.readFileSync(path.join(ROOT,'tm-endturn-apply.js'),'utf8');
ok(/fortify'\) \{ _armyMatch\.morale = Math\.min\(100, \(_armyMatch\.morale\|\|50\) \+ 2\); _armyMatch\.fortification = Math\.min\(100, \(Number\(_armyMatch\.fortification\) \|\| 0\) \+ 5\)/.test(apply), '★fortify 分支无条件写 fortification(去死 guard)');
ok(!/if \(typeof _armyMatch\.fortification === 'number'\) _armyMatch\.fortification/.test(apply), '★旧 typeof number 死 guard 已清');

// 复刻新/旧分支
function newWrite(army){ army.fortification = Math.min(100, (Number(army.fortification) || 0) + 5); return army.fortification; }
function oldWrite(army){ if (typeof army.fortification === 'number') army.fortification = Math.min(100, army.fortification + 5); return army.fortification; }

const a1 = {}; // 未初始化(真实情形)
ok(newWrite(a1) === 5, '★新逻辑:未初始化军 fortify → fortification 5(从 0 累加)');
const a2 = {};
ok(oldWrite(a2) === undefined, '★swap-test:旧逻辑未初始化 → 仍 undefined(复现 no-op 死分支)');
const a3 = { fortification: 50 };
ok(newWrite(a3) === 55, '已有值继续累加 50→55');
const a4 = { fortification: 98 };
ok(newWrite(a4) === 100, '夹 100 上限');

console.log('\n结果: '+A+' 通过 / 0 失败');
