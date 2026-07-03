#!/usr/bin/env node
// scripts/smoke-restricted-roster.js
// 2026-07-02·锁住『下狱/罢官者仍上朝、上奏、被称旧衔』修复的名册分类逻辑
//
// 玩家报·下狱者仍上朝上奏 / 撤职后朝会仍称"陕西巡抚"。真因=AI 推演 prompt 名册只挡死人·
// 不知谁在狱/流放/罢官→继续把他们当活跃官员写。修=firewall 加「受限人员现状名册」硬约束 +
// injectNpcHearts 对受限者去在职加权/改标状态。
// 此测复制两处的分类逻辑·断言状态归类正确(逻辑与 tm-endturn-prompt.js 一致)。

'use strict';
let passed = 0, failed = 0;
function assert(cond, msg){ if(cond) passed++; else { failed++; console.error('  ✗ '+msg); } }

// ── 复制自 _hallucinationFirewall 受限名册分类 ──
function classifyRestricted(chars, curTurn){
  var R = { imprison: [], exile: [], flee: [], retire: [], dismiss: [] };
  (chars||[]).forEach(function(c){
    if (!c || c.alive === false || !c.name) return;
    if (c._imprisoned) R.imprison.push(c.name);
    else if (c._exiled) R.exile.push(c.name);
    else if (c._fled || c._missing) R.flee.push(c.name);
    else if (c._retired || c.retired) R.retire.push(c.name);
    else if (c._removedFromOfficeTurn != null && !c.officialTitle && (curTurn - c._removedFromOfficeTurn) <= 6) R.dismiss.push(c.name);
  });
  return R;
}
// ── 复制自 _injectNpcHearts 受限标签 ──
function restStatus(c){
  if (!c) return '';
  if (c._imprisoned) return '在狱';
  if (c._exiled) return '流放';
  if (c._fled || c._missing) return '在逃';
  if (c._retired || c.retired) return '致仕';
  return '';
}

var CHARS = [
  { name: '卢象升', alive: true, _imprisoned: true, officialTitle: null },
  { name: '孙传庭', alive: true, officialTitle: '陕西巡抚' },                // 正常在职
  { name: '胡廷晏', alive: true, officialTitle: null, _removedFromOfficeTurn: 8, _removedReason: '罢官' }, // 刚罢官(turn10·差2)
  { name: '某流放', alive: true, _exiled: true, officialTitle: null },
  { name: '某致仕', alive: true, _retired: true, officialTitle: null },
  { name: '某逃亡', alive: true, _fled: true },
  { name: '某亡者', alive: false, officialTitle: '太师' },                    // 死人不进受限册
  { name: '老罢官', alive: true, officialTitle: null, _removedFromOfficeTurn: 1 }, // turn10·差9>6·过期不列
  { name: '复职者', alive: true, officialTitle: '兵部尚书', _removedFromOfficeTurn: 9 }, // 已再任命(有官衔)·不算罢官
];
var R = classifyRestricted(CHARS, 10);

console.log('===== 受限名册分类 =====');
assert(R.imprison.join()==='卢象升', '下狱应含卢象升·得['+R.imprison.join()+']');
assert(R.exile.join()==='某流放', '流放应含某流放·得['+R.exile.join()+']');
assert(R.retire.join()==='某致仕', '致仕应含某致仕·得['+R.retire.join()+']');
assert(R.flee.join()==='某逃亡', '逃亡应含某逃亡·得['+R.flee.join()+']');
assert(R.dismiss.join()==='胡廷晏', '罢官应只含胡廷晏(近期无官职)·得['+R.dismiss.join()+']');

console.log('===== 反例·不误列 =====');
assert(R.imprison.indexOf('孙传庭')<0 && R.dismiss.indexOf('孙传庭')<0, '在职孙传庭不进任何受限册');
assert([].concat(R.imprison,R.exile,R.flee,R.retire,R.dismiss).indexOf('某亡者')<0, '死人不进受限册');
assert(R.dismiss.indexOf('老罢官')<0, '去职过久(>6回合)不再列罢官');
assert(R.dismiss.indexOf('复职者')<0, '已再任命(有官衔)不算罢官');

console.log('===== injectNpcHearts 状态标签 =====');
assert(restStatus(CHARS[0])==='在狱', '卢象升标签=在狱');
assert(restStatus(CHARS[1])==='', '在职孙传庭无受限标签');
assert(restStatus(CHARS[3])==='流放', '某流放标签=流放');
assert(restStatus(CHARS[4])==='致仕', '某致仕标签=致仕');
// 受限者不享 +20 在职加权
function weightBoost(c){ return (c.officialTitle && !restStatus(c)) ? 20 : 0; }
assert(weightBoost(CHARS[0])===0, '下狱者不享在职加权');
assert(weightBoost(CHARS[1])===20, '在职者享 +20 加权');

console.log('');
console.log(`[smoke-restricted-roster] ${passed} passed / ${failed} failed`);
if (failed > 0) process.exit(1);
