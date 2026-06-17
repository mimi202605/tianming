#!/usr/bin/env node
'use strict';
// smoke-mutiny-dedup — 兵变双管线重复扣减(真bug)
//   欠饷→军心→兵变 单一交 applyPayArrearsPressure(管线A)·_updateMilitaryState(管线B)不再按欠饷二次加兵变
//   swap-test 旧 vs 新 section-3 行为差 + 源契约(欠饷兵变分支已清·补给/低士气保留)
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function ok(c, m){ if(!c) throw new Error('FAIL: '+m); A++; console.log('  ✓ '+m); }

console.log('smoke-mutiny-dedup');

// 旧/新 section-3 逻辑复刻(swap-test)
function oldS3(a){
  if (a.supply < 20) a.morale = Math.max(0, a.morale - 5);
  if (a.morale < 30 && a.payArrearsMonths >= 3) a.mutinyRisk = Math.min(100, a.mutinyRisk + 10);
  else if (a.payArrearsMonths >= 3) a.mutinyRisk = Math.min(100, a.mutinyRisk + 5);
  else if (a.morale < 20) a.mutinyRisk = Math.min(100, a.mutinyRisk + 3);
  else a.mutinyRisk = Math.max(0, a.mutinyRisk - 2);
  return a;
}
function newS3(a){
  if (a.supply < 20) a.morale = Math.max(0, a.morale - 5);
  if (a.morale < 20) a.mutinyRisk = Math.min(100, (a.mutinyRisk||0) + 3);
  else a.mutinyRisk = Math.max(0, (a.mutinyRisk||0) - 2);
  return a;
}

// ① 欠饷军(arrears>=3·军心50·补给50):旧每回合 +5 兵变(与 A 重复)·新 -2 回落(A 单独负责欠饷兵变)
var base = { supply:50, morale:50, payArrearsMonths:4, mutinyRisk:30 };
var o1 = oldS3(Object.assign({}, base));
var n1 = newS3(Object.assign({}, base));
ok(o1.mutinyRisk === 35, '① 旧逻辑:arrears>=3 → 兵变 30→35(+5·与 A 重复扣)');
ok(n1.mutinyRisk === 28, '① 新逻辑:同军 → 兵变 30→28(-2 回落·欠饷兵变交 A)');
ok(n1.mutinyRisk < o1.mutinyRisk, '① ★新逻辑不再二次叠加欠饷兵变(去重)');

// ② 与欠饷无关的低士气兵变压力保留(morale<20)
var n2 = newS3({ supply:50, morale:15, payArrearsMonths:0, mutinyRisk:30 });
ok(n2.mutinyRisk === 33, '② 士气过低(morale<20)→ 兵变 +3 保留(与欠饷无关·独立)');

// ③ 补给短缺士气惩罚保留(A 只管欠饷·补给独立)
var n3 = newS3({ supply:10, morale:50, payArrearsMonths:0, mutinyRisk:20 });
ok(n3.morale === 45, '③ 补给<20 → 军心 -5 保留(A 不碰补给)');

// ④ 源契约:真文件欠饷兵变分支已清·补给/低士气保留
const ext = fs.readFileSync(path.join(ROOT,'tm-three-systems-ext.js'),'utf8');
ok(ext.indexOf('a.payArrearsMonths >= 3') < 0, '④ 欠饷兵变分支(payArrearsMonths>=3 加兵变)已清');
ok(ext.indexOf('a.morale < 30 && a.payArrearsMonths >= 3') < 0, '④ 旧 morale<30&&arrears>=3 组合条件已清');
ok(/applyPayArrearsPressure.*管线A|管线A.*单一负责|欠饷.*单一负责/.test(ext) || /单一负责/.test(ext), '④ 注明欠饷兵变单一真相源(管线A)');
ok(/if \(a\.supply < 20\)/.test(ext) && /a\.morale < 20/.test(ext), '④ 补给士气惩罚 + 低士气兵变压力保留');

console.log('\n结果: '+A+' 通过 / 0 失败');
