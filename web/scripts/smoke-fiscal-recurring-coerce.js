#!/usr/bin/env node
// smoke-fiscal-recurring-coerce.js — 财政「一次性误判为长期」纠偏护栏
//   bug: LLM 偶把突发赏赐/赈济/抄没/缴获等一次性收支误标 recurring:true →
//        被当长期年例逐回合重复结算(虚增岁入岁出·且当回合 scheduled 不入账)。
//   fix(tm-ai-change-applier.js · fiscal_adjustments): 含明确一次性词且无长期年例词 → 强制 recurring:false。
//   本测试逐字镜像 applier 中的两条正则·校验分类矩阵(保守纠偏·真年例不误伤)。
'use strict';
let A = 0;
function assert(c, m) { if (!c) throw new Error('FAIL: ' + m); A++; console.log('  ✓ ' + m); }

// —— 与 tm-ai-change-applier.js 内护栏逐字一致 ——
const _oneTimeRe = /赏|赐|犒|赉|恤|赈|振济|抚恤|抄没|抄家|籍没|罚没|没入|查抄|缴获|赔款|赔偿|报效|进献|捐输|搜括|一次|临时|特支|特拨|特赐|赎银|犒军|犒赏/;
const _recurRe = /岁|年例|年额|月饷|月粮|月例|常额|常例|常税|经制|经常|盐课|盐引|榷|关税|商税|田赋|加派|皇庄|俸|禄|每年|每岁|逐年|年度/;

// 模拟护栏：返回纠偏后的 recurring
function coerce(fa) {
  var r = !!fa.recurring;
  if (r) {
    var t = String((fa.name || '') + ' ' + (fa.reason || '') + ' ' + (fa.category || ''));
    if (_oneTimeRe.test(t) && !_recurRe.test(t)) r = false;
  }
  return r;
}

console.log('smoke-fiscal-recurring-coerce');

// ── ① 一次性收支·误标 recurring:true → 纠为 false ──
const oneTimers = [
  { name: '赏银一万两', reason: '犒赏边军' },
  { name: '赈灾发放', reason: '河南大水赈济灾民' },
  { name: '缴获敌资', reason: '克城缴获' },
  { name: '罚没赃银', reason: '查处贪墨罚没' },
  { name: '临时特拨', reason: '一次性筹措军需' },
  { name: '抚恤阵亡', reason: '抚恤将士家属' },
  { name: '商人报效', reason: '盐商报效军饷一次' },
  { name: '进献方物', reason: '藩国进献' }
];
oneTimers.forEach(function (fa) {
  fa.recurring = true;
  assert(coerce(fa) === false, '① 一次性「' + fa.name + '」误标 recurring → 纠为 false');
});

// ── ② 真·长期年例 → 不误伤(仍 recurring:true) ──
const recurrers = [
  { name: '辽饷加派', reason: '岁加派辽东军饷' },
  { name: '盐课岁入', reason: '两淮盐课' },
  { name: '岁赐辽东饷', reason: '岁赐九边' },          // 含「赐」但有「岁」→ 保留
  { name: '皇庄岁入', reason: '皇庄子粒' },
  { name: '常设军饷', reason: '九边月饷常额' },
  { name: '开海榷税', reason: '市舶榷税年额' },
  { name: '田赋', reason: '夏秋两税田赋' },
  { name: '犒赏月饷', reason: '常额月饷犒赏' }          // 含「犒赏」但有「月饷/常额」→ 保留
];
recurrers.forEach(function (fa) {
  fa.recurring = true;
  assert(coerce(fa) === true, '② 真年例「' + fa.name + '」→ 保留 recurring:true');
});

// ── ③ 原本就 recurring:false → 护栏不动 ──
assert(coerce({ name: '赏银', reason: '', recurring: false }) === false, '③ 原 false 不变');
assert(coerce({ name: '岁赐', reason: '', recurring: false }) === false, '③ 原 false 不变(年例名亦不强制改 true)');

// ── ④ 无关键字的中性名目·recurring:true 保留(不武断纠偏) ──
assert(coerce({ name: '某项进项', reason: '新增财源', recurring: true }) === true, '④ 中性名目 recurring:true 保留(保守·不误伤)');

console.log('\nPASS · ' + A + ' assertions');
