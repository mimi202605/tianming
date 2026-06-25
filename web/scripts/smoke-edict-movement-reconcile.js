#!/usr/bin/env node
/* eslint-env node */
'use strict';
// 移动对账层回归测试·2026-05-28
// 锁 extractEdictMovements 对玩家真实诏书措辞的确定性解析（"人物原地不动"顽疾修复）

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const edictSrc = fs.readFileSync(path.join(ROOT, 'tm-endturn-edict.js'), 'utf8');

let passed = 0;
function assert(cond, label) { if (!cond) throw new Error('[assert] ' + label); passed += 1; }

const sandbox = {
  console, RegExp, Array, Object, String, Number, Boolean, JSON, Math,
  GM: {
    turn: 4,
    _capital: '京师',
    chars: [
      { name: '徐光启', faction: '明廷' },
      { name: '李若琏', faction: '明廷' },
      { name: '袁崇焕', faction: '明廷', zi: '元素' }
    ]
  },
  // 仅为 load 期不报错的占位（这些函数本测试不调用）
  uid: () => 'x', _dbg: () => {}, addEB: () => {}, recordPlayerDecision: () => {},
  clamp: (v) => v, findCharByName: () => null
};
sandbox.window = sandbox;
sandbox.P = {};
vm.createContext(sandbox);
vm.runInContext(edictSrc, sandbox, { filename: 'tm-endturn-edict.js' });

const f = sandbox.extractEdictMovements;
assert(typeof f === 'function', 'extractEdictMovements 已导出');

// 1·玩家真实诏书（图一原文）："令 徐光启 返回京师……"
let r = f('令徐光启返回京师，里陕西以工代赈及安抚流民诸事，不得有误。命朱聿键为宗人府左宗人。');
assert(r.some(m => m.char === '徐光启' && m.to === '京师'), '①返回京师 → 徐光启→京师 ' + JSON.stringify(r));

// 2·召见/入朝列举（图二 AI 叙事同款措辞）："召徐光启、李若琏延朝"
r = f('召徐光启、李若琏延朝。');
assert(r.some(m => m.char === '徐光启' && m.to === '京师'), '②延朝 → 徐光启→京师 ' + JSON.stringify(r));
assert(r.some(m => m.char === '李若琏' && m.to === '京师'), '②延朝 → 李若琏→京师 ' + JSON.stringify(r));

// 3·明确外地目的地："命袁崇焕赴宁远督师"
r = f('命袁崇焕赴宁远督师。');
assert(r.some(m => m.char === '袁崇焕' && /宁远/.test(m.to)), '③赴宁远 → 袁崇焕→宁远 ' + JSON.stringify(r));

// 4·字号锚定："着元素移驻山海关"（元素=袁崇焕字）
r = f('着元素移驻山海关。');
assert(r.some(m => m.char === '袁崇焕' && /山海关/.test(m.to)), '④字号锚定 元素→袁崇焕→山海关 ' + JSON.stringify(r));

// 5·无移动令的诏书不误抓
r = f('着户部清查积欠，严核钱粮。');
assert(r.length === 0, '⑤无移动令不误抓 ' + JSON.stringify(r));

// 6·非在册人物不抓（only known chars）
r = f('令张三返回京师。');
assert(r.length === 0, '⑥非在册人物不抓 ' + JSON.stringify(r));

// 7·P-YW7 bug 原话(图一)："将徐光启、李若琏所在地移动到京师"——历代漏抓(moveVerb 无"移动"+"所在地"中插)·本刀根治
r = f('将徐光启、李若琏所在地移动到京师，以备咨询。');
assert(r.some(m => m.char === '徐光启' && m.to === '京师'), '⑦所在地移动到 → 徐光启→京师 ' + JSON.stringify(r));
assert(r.some(m => m.char === '李若琏' && m.to === '京师'), '⑦所在地移动到 → 李若琏→京师 ' + JSON.stringify(r));

// 8·即时抵达:诏文含"即刻/瞬间抵达"→捕获的移动标 instant(供 reconcile 当回合即抵·治"挪了也多回合不到")
r = f('将徐光启所在地移动到京师。玩家要求的一切人事调动必须即刻瞬间抵达。');
assert(r.some(m => m.char === '徐光启' && m.to === '京师' && m.instant === true), '⑧即刻瞬间抵达 → 标 instant ' + JSON.stringify(r));

// 9·无即时词→instant=false(默认多回合行程)
r = f('将徐光启所在地移动到南京。');
assert(r.some(m => m.char === '徐光启' && m.to === '南京' && !m.instant), '⑨无即时词 → instant=false(多回合) ' + JSON.stringify(r));

// 10·"移往"复式 + 字号锚定
r = f('把元素移往山海关。');
assert(r.some(m => m.char === '袁崇焕' && /山海关/.test(m.to)), '⑩移往+字号 元素→袁崇焕→山海关 ' + JSON.stringify(r));

// 11·"移交账册"不误抓(移交≠移动·relocVerb 用显式复合词避免误中)
r = f('着徐光启移交账册于户部。');
assert(r.length === 0, '⑪移交账册不误抓(移交非移动) ' + JSON.stringify(r));

console.log('[smoke-edict-movement-reconcile] PASS assertions=' + passed);
