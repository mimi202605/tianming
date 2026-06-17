#!/usr/bin/env node
// smoke-public-treasury-a3.js - A3 公库:统一只读镜像 + 去职追亏
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, msg) { if (!cond) throw new Error(msg); passed++; }
function load(ctx, rel) { vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel }); }

function main() {
  const ctx = {
    console, Math, JSON, Object, Array, Number, String, Boolean, RegExp, isFinite, isNaN,
    Error, TypeError, RangeError,
    GM: {
      turn: 7, clans: {}, chars: [], guoku: { balance: 0 }, neitang: { balance: 0 },
      corruption: { subDepts: {} }, facs: [], regions: {},
      officeTree: [
        { name: '户部', positions: [
          { name: '户部尚书', holder: '某', rank: '2',
            publicTreasury: {
              money: { stock: 30000, quota: 120000, used: 1000, available: 29000, deficit: 0 },
              grain: { stock: 2000, quota: 8000, used: 0, available: 2000, deficit: 0 },
              cloth: { stock: 300, quota: 1200, used: 0, available: 300, deficit: 0 }
            } }
        ] }
      ]
    },
    addEB: function() {}, random: function() { return 0.3; }
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  load(ctx, 'tm-char-economy-engine.js');
  const CE = ctx.CharEconEngine;
  assert(typeof CE.getCharPublicTreasuryDisplay === 'function', 'getCharPublicTreasuryDisplay 导出');
  assert(typeof CE.pursueTreasuryDeficit === 'function', 'pursueTreasuryDeficit 导出');

  // ── 1) 在职官 → 只读镜像读到职位公库 stock ──
  const minister = { id: 'm1', name: '毕自严', officialTitle: '户部尚书', rankLevel: 2 };
  ctx.GM.chars.push(minister);
  const disp = CE.getCharPublicTreasuryDisplay(minister);
  assert(disp.money === 30000, '在职镜像读职位公库 money=30000, got ' + disp.money);
  assert(disp.grain === 2000 && disp.cloth === 300, '镜像读 grain/cloth');
  assert(disp.isReadOnly === true, '镜像只读');
  assert(disp.linkedPost === '户部尚书', '自动绑定 linkedPost');

  // ── 2) 闲职/无官 → 全零 ──
  const idle = { id: 'm2', name: '隐士' };
  ctx.GM.chars.push(idle);
  const dispIdle = CE.getCharPublicTreasuryDisplay(idle);
  assert(dispIdle.money === 0 && dispIdle.grain === 0 && dispIdle.cloth === 0, '无官全零');
  assert(dispIdle.linkedPost === null, '无官无绑定');

  // ── 3) 去职追亏：私产足额 → 全补 ──
  const entity = { publicTreasury: { money: { deficit: 5000, available: 0, stock: 0 } } };
  const richDep = { id: 'd1', name: '富吏', resources: { privateWealth: { money: 8000 } } };
  const pr1 = CE.pursueTreasuryDeficit(richDep, entity);
  assert(pr1.pursued === 5000, '追亏全补5000, got ' + pr1.pursued);
  assert(pr1.deficitRemaining === 0, '亏空清零');
  assert(richDep.resources.privateWealth.money === 3000, '私产扣到3000, got ' + richDep.resources.privateWealth.money);
  assert(entity.publicTreasury.money.available === 5000, '机构 available 回补5000');

  // ── 4) 去职追亏：私产不足 → 追到见底,不造负债 ──
  const entity2 = { publicTreasury: { money: { deficit: 5000, available: 0 } } };
  const poorDep = { id: 'd2', name: '穷吏', resources: { privateWealth: { money: 2000 } } };
  const pr2 = CE.pursueTreasuryDeficit(poorDep, entity2);
  assert(pr2.pursued === 2000, '追到见底2000, got ' + pr2.pursued);
  assert(pr2.deficitRemaining === 3000, '剩亏空3000');
  assert(poorDep.resources.privateWealth.money === 0, '私产见底0,不负债');

  // ── 5) 无亏空 → 不追 ──
  const entity3 = { publicTreasury: { money: { deficit: 0 } } };
  const pr3 = CE.pursueTreasuryDeficit({ id: 'd3', name: 'x', resources: { privateWealth: { money: 9999 } } }, entity3);
  assert(pr3.pursued === 0, '无亏空不追');

  console.log('[smoke-public-treasury-a3] PASS ' + passed + ' assertions');
}
try { main(); } catch (err) { console.error('[smoke-public-treasury-a3] FAIL'); console.error(err && err.stack || err); process.exit(1); }
