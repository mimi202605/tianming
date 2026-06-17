#!/usr/bin/env node
// smoke-social-class-transition.js - A4 阶层身份转换触发器
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
    console, Math, JSON, Object, Array, Number, String, Boolean, RegExp, isFinite, isNaN, Error, TypeError, RangeError,
    GM: { turn: 1, clans: {}, chars: [], guoku: {}, neitang: {}, corruption: { subDepts: {} }, facs: [], regions: {}, officeTree: [] },
    addEB: function() {}, random: function() { return 0.3; }
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  load(ctx, 'tm-char-economy-engine.js');
  const CE = ctx.CharEconEngine;
  const R = CE.reconcileSocialClassOnAppointment;
  assert(typeof R === 'function', 'reconcileSocialClassOnAppointment 导出');
  assert(typeof CE.setSocialClass === 'function', 'setSocialClass 导出');

  // 科举/平民入仕 → 文官
  let ch = { name: '寒士', socialClass: 'commoner', officialTitle: '知县', background: '寒门进士' };
  assert(R(ch) === 'civilOfficial' && ch.socialClass === 'civilOfficial', '平民进士→文官, got ' + ch.socialClass);
  // 捐纳:商人买官 → 文官
  ch = { name: '富商', socialClass: 'merchant', officialTitle: '光禄寺署丞', background: '商贾捐纳' };
  assert(R(ch) === 'civilOfficial', '商人捐纳→文官, got ' + ch.socialClass);
  // 平民 + 武职 → 武官
  ch = { name: '行伍', socialClass: 'commoner', officialTitle: '总兵', background: '行伍出身' };
  assert(R(ch) === 'militaryOfficial', '行伍→武官, got ' + ch.socialClass);
  // 受爵 → 勋贵
  ch = { name: '功臣', socialClass: 'militaryOfficial', officialTitle: '定西侯', background: '军功封爵' };
  assert(R(ch) === 'noble', '受爵→勋贵, got ' + ch.socialClass);
  // 世袭背景 → 勋贵
  ch = { name: '袭爵者', socialClass: 'commoner', officialTitle: '指挥使', background: '世袭锦衣卫' };
  assert(R(ch) === 'noble', '世袭→勋贵, got ' + ch.socialClass);
  // 皇族不降
  ch = { name: '亲王', socialClass: 'imperial', officialTitle: '宗人令' };
  assert(R(ch) === 'imperial', '皇族任官不降, got ' + ch.socialClass);
  // 已文官不变
  ch = { name: '老臣', socialClass: 'civilOfficial', officialTitle: '尚书' };
  assert(R(ch) === 'civilOfficial', '已文官不变');
  // 无官职不动
  ch = { name: '布衣', socialClass: 'commoner' };
  assert(R(ch) === 'commoner', '无官职不动');

  // setSocialClass
  ch = { name: 'x', socialClass: 'commoner' };
  assert(CE.setSocialClass(ch, 'merchant') === true && ch.socialClass === 'merchant', 'setSocialClass 合法');
  assert(CE.setSocialClass(ch, '不存在') === false && ch.socialClass === 'merchant', 'setSocialClass 非法拒绝');

  console.log('[smoke-social-class-transition] PASS ' + passed + ' assertions');
}
try { main(); } catch (err) { console.error('[smoke-social-class-transition] FAIL'); console.error(err && err.stack || err); process.exit(1); }
