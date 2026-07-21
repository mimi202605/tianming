#!/usr/bin/env node
// scripts/smoke-edict-recruit-parse.js
// 锁定诏令征召解析 parseEdictRecruitPatterns（tm-char-autogen.js）的姓名捕获契约。
// 病根（Codex 复审逮到）：动词头曾为单字类 [征诏]，「征召张三入朝」把姓名抓成「召张三」、
//   「征召司马相如入朝」直接无候选。修法：动词头改最长优先 (?:征召|征|诏)。
// 本 smoke 钉死修复后的行为，并守住既有句式（诏X为Y / 起复X / 徵X）与已在册排除。

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

const sandbox = {
  console,
  window: {},
  global: {},
  setTimeout, clearTimeout, setInterval, clearInterval,
  _dbg: function(){},
  toast: function(){},
  GM: {
    year: 1628, turn: 1,
    // 反例种子：孙承宗已在册 → 征召其人不应产生新造候选
    chars: [ { name: '孙承宗', loyalty: 70 } ],
    _pendingCharacters: [],
    deletedCharNames: [],
    _indices: { charByName: new Map() },
    facs: [{ id: 'ming', name: '大明', leader: '朱由检', territory: '京师' }],
    factions: {},
    parties: {}
  },
  P: { ai: { key: 'test-key' }, conf: {}, playerInfo: { characterName: '朱由检' }, time: { year: 1628 } },
  findCharByName: function(name) {
    return sandbox.GM.chars.find(function(c){ return c && c.name === name; }) || null;
  },
  buildIndices: function(){}
};
sandbox.window = sandbox;
sandbox.global = sandbox;

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-char-autogen.js'), 'utf8'), sandbox, { filename: 'tm-char-autogen.js' });

const parse = sandbox.parseEdictRecruitPatterns;
if (typeof parse !== 'function') { console.log('FAIL parseEdictRecruitPatterns 未导出'); process.exit(1); }

let pass = 0, fail = 0;
function expect(label, cond) {
  if (cond) { console.log('  PASS ' + label); pass++; }
  else { console.log('  FAIL ' + label); fail++; }
}
function names(text) { return parse(text).map(function(r){ return r.name; }); }

// 1. 教学主推句式「征召X入朝」——姓名须为 张三，绝不是旧 bug 的「召张三」
const c1 = parse('征召张三入朝');
expect('征召张三入朝 → 恰一个候选', c1.length === 1);
expect('征召张三入朝 → 姓名=张三', c1[0] && c1[0].name === '张三');
expect('征召张三入朝 → 不再误抓「召张三」（回归守卫）', !names('征召张三入朝').includes('召张三'));

// 2. 四字名「司马相如」——旧 bug 直接无候选，修复后须抓全名
const c2 = parse('征召司马相如入朝');
expect('征召司马相如入朝 → 恰一个候选', c2.length === 1);
expect('征召司马相如入朝 → 姓名=司马相如(4字)', c2[0] && c2[0].name === '司马相如');

// 3. 既有句式「诏X为Y」——姓名+官职都要对
const c3 = parse('诏郑成功为福建巡抚');
expect('诏郑成功为福建巡抚 → 姓名=郑成功', c3.some(function(r){ return r.name === '郑成功'; }));
expect('诏郑成功为福建巡抚 → 官职=福建巡抚', c3.some(function(r){ return r.name === '郑成功' && r.postTitle === '福建巡抚'; }));

// 4. 既有句式「起复X」
const c4 = parse('起复袁崇焕');
expect('起复袁崇焕 → 姓名=袁崇焕', c4.some(function(r){ return r.name === '袁崇焕'; }));

// 5. 征（无「召」）单字头仍工作
expect('征李定国入朝 → 姓名=李定国', names('征李定国入朝').includes('李定国'));

// 6. 徵X为士 既有句式不破
expect('徵刘宗周为士 → 姓名=刘宗周', names('徵刘宗周为士').includes('刘宗周'));

// 7. 反例：已在册人名不触发新造
const c7 = parse('征召孙承宗入朝');
expect('征召孙承宗入朝(已在册) → 无新造候选', c7.length === 0);

console.log('\nparse-recruit smoke: ' + pass + ' PASS · ' + fail + ' FAIL');
if (fail > 0) process.exit(1);
