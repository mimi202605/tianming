#!/usr/bin/env node
/* eslint-env node */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'tm-topbar-vars.js'), 'utf8');

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  passed += 1;
}

const sandbox = {
  console,
  setInterval() { return 1; },
  clearInterval() {},
  document: {
    readyState: 'complete',
    addEventListener() {},
    getElementById() { return null; },
    createElement() {
      return {
        className: '',
        innerHTML: '',
        style: {},
        appendChild() {},
        addEventListener() {},
        classList: { add() {}, remove() {}, contains() { return false; } }
      };
    },
    body: { appendChild() {} }
  },
  CurrencyUnit: {
    getUnit() { return { money: 'liang', grain: 'shi', cloth: 'pi' }; }
  },
  GM: {
    running: true,
    _prevGuoku: { money: 496000, grain: 12164000, cloth: 756000 },
    guoku: {
      money: 315000,
      balance: 315000,
      grain: 11439000,
      cloth: 807000,
      turnIncome: 1071000,
      turnExpense: 1174000,
      turnGrainIncome: 408000,
      turnGrainExpense: 596000,
      turnClothIncome: 0,
      turnClothExpense: 0,
      ledgers: {
        money: { stock: 220000 },
        grain: { stock: 11850000, turnDelta: -82000 },
        cloth: { stock: 910000, turnDelta: -106000 }
      }
    },
    _prevNeitang: { money: 1968000, grain: 19000, cloth: 255000 },
    neitang: {
      money: 3403000,
      balance: 3403000,
      grain: 0,
      cloth: 250000,
      turnIncome: 120000,
      turnExpense: 20000,
      ledgers: {
        money: { stock: 3300000 },
        grain: { stock: 19000, turnDelta: -19000 },
        cloth: { stock: 250000, turnDelta: -5040 }
      }
    },
    corruption: {},
    minxin: {},
    huangquan: {},
    huangwei: {}
  }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'tm-topbar-vars.js' });

const guoku = sandbox._renderGuoku();
assert(guoku.value === sandbox._barFmtNum(sandbox.GM.guoku.money), 'guoku main value must use scalar stock');
assert(guoku.subItems[0].v === sandbox._barFmtNum(sandbox.GM.guoku.money), 'guoku money stock must match scalar used by end-turn modal');
assert(guoku.subItems[0].d === sandbox.GM.guoku.money - sandbox.GM._prevGuoku.money, 'guoku money delta must match modal old-to-new delta');
assert(guoku.subItems[1].v === sandbox._barFmtNum(sandbox.GM.guoku.grain), 'guoku grain stock must match scalar used by end-turn modal');
assert(guoku.subItems[1].d === sandbox.GM.guoku.grain - sandbox.GM._prevGuoku.grain, 'guoku grain delta must match modal old-to-new delta');
assert(guoku.subItems[2].v === sandbox._barFmtNum(sandbox.GM.guoku.cloth), 'guoku cloth stock must match scalar used by end-turn modal');
assert(guoku.subItems[2].d === sandbox.GM.guoku.cloth - sandbox.GM._prevGuoku.cloth, 'guoku cloth delta must match modal old-to-new delta');

const neitang = sandbox._renderNeitang();
assert(neitang.value === sandbox._barFmtNum(sandbox.GM.neitang.money), 'neitang main value must use scalar stock');
assert(neitang.subItems[0].v === sandbox._barFmtNum(sandbox.GM.neitang.money), 'neitang money stock must match scalar used by end-turn modal');
assert(neitang.subItems[0].d === sandbox.GM.neitang.money - sandbox.GM._prevNeitang.money, 'neitang money delta must match modal old-to-new delta');
assert(neitang.subItems[1].v === sandbox._barFmtNum(sandbox.GM.neitang.grain), 'neitang grain stock must match scalar used by end-turn modal');
assert(neitang.subItems[1].d === sandbox.GM.neitang.grain - sandbox.GM._prevNeitang.grain, 'neitang grain delta must match modal old-to-new delta');
assert(neitang.subItems[2].v === sandbox._barFmtNum(sandbox.GM.neitang.cloth), 'neitang cloth stock must match scalar used by end-turn modal');
assert(neitang.subItems[2].d === sandbox.GM.neitang.cloth - sandbox.GM._prevNeitang.cloth, 'neitang cloth delta must match modal old-to-new delta');

console.log(`[smoke-topbar-fiscal-consistency] PASS ${passed} assertions`);
