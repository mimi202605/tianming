#!/usr/bin/env node
// smoke-mint-agency-panel.js — 铸局逐局显账（深挖第七轮D）
// 验：帑廪面板(renderGuokuPanel)新增「铸局」区——GM.currency.mintAgencies 逐局
//     名/所铸/岁能/近铸(mintHistory 按局取末笔)/成色(近铸>局标>账面)/私铸侵市·
//     停炉标记·无铸局不显·纯读渲染(引擎零改动)。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let N = 0;
function assert(c, m) { N++; if (!c) { console.error('ASSERT FAIL [' + N + ']:', m); process.exit(1); } }

function makeEl() {
  const el = { _html: '', className: '', style: {}, classList: { add(){}, remove(){}, contains(){ return false; } },
    setAttribute() {}, appendChild() {}, querySelectorAll() { return []; }, querySelector() { return null; } };
  Object.defineProperty(el, 'innerHTML', { get() { return el._html; }, set(v) { el._html = v; } });
  Object.defineProperty(el, 'textContent', { get() { return ''; }, set(_) {} });
  return el;
}
const els = { 'guoku-body': makeEl(), 'guoku-subtitle': makeEl() };

const ctx = { console: console, Math: Math, JSON: JSON, Object: Object, Array: Array, Number: Number, String: String, isFinite: isFinite, isNaN: isNaN, parseFloat: parseFloat, parseInt: parseInt, Date: Date };
ctx.window = ctx; ctx.globalThis = ctx; ctx.global = ctx;
ctx.document = { getElementById: function (id) { return els[id] || null; }, createElement: makeEl, addEventListener: function(){} };
ctx.getTSText = function () { return '天启七年'; };
ctx._escHtml = function (s) { return String(s == null ? '' : s); };  // 运行时全局(别文件供)·沙箱 stub
ctx.P = { conf: {} };
ctx.GM = {
  running: true, turn: 12,
  guoku: { money: 500000, turnIncome: 80000, turnExpense: 70000, ledgers: { money: { stock: 500000 } } },
  currency: {
    mintAgencies: [
      { id: 'm1', name: '京师宝泉局', type: 'central', coinType: 'copper', capacity: 150000, purityStandard: 1.0, enabled: true },
      { id: 'm2', name: '宝源局', type: 'central', coinType: 'silver', capacity: 50000, purityStandard: 0.93, enabled: false }
    ],
    coins: {
      copper: { enabled: true, stock: 1000000, purity: 1.0, mintHistory: [
        { turn: 11, amount: 90000, purity: 0.98, agency: '京师宝泉局' },
        { turn: 12, amount: 120000, purity: 0.72, agency: '京师宝泉局' }
      ], privateMintShare: 0.42 },
      silver: { enabled: true, stock: 200000, purity: 0.93, mintHistory: [], privateMintShare: 0 }
    }
  }
};

vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-guoku-panel.js'), 'utf8'), ctx, { filename: 'tm-guoku-panel.js' });
assert(typeof ctx.renderGuokuPanel === 'function', '① renderGuokuPanel 在位');

ctx.renderGuokuPanel();
const h = els['guoku-body']._html || '';
assert(h.indexOf('铸局') >= 0, '② 铸局区已渲染');
assert(h.indexOf('京师宝泉局') >= 0 && h.indexOf('宝源局') >= 0, '③ 两局具名');
assert(h.indexOf('铜钱') >= 0, '④ 所铸币种汉名');
assert(h.indexOf('近铸 T12') >= 0, '⑤ 近铸按局取 mintHistory 末笔(本回合)');
assert(h.indexOf('72%') >= 0, '⑥ 成色取近铸真值(0.72→72%·劣钱可见)');
assert(h.indexOf('私铸侵市') >= 0 && h.indexOf('42%') >= 0, '⑦ 私铸对冲上屏');
assert(h.indexOf('尚未开铸') >= 0, '⑧ 无铸录的局诚实空态');
assert(h.indexOf('停炉') >= 0, '⑨ enabled=false 标停炉');
assert(h.indexOf('93%') >= 0, '⑩ 停炉局成色回落局标 purityStandard');

// ── 无铸局(旧档/未启钱法)→ 区块不显 ──
ctx.GM.currency = { mintAgencies: [], coins: {} };
ctx.renderGuokuPanel();
assert((els['guoku-body']._html || '').indexOf('铸局') < 0, '⑪ 无铸局不显区块');
ctx.GM.currency = null;
ctx.renderGuokuPanel();
assert((els['guoku-body']._html || '').indexOf('铸局') < 0, '⑫ currency 缺失不塌不显');

console.log('smoke-mint-agency-panel OK — ' + N + ' 断言全绿（逐局显账/劣钱成色/私铸/停炉/空态）');
