#!/usr/bin/env node
// smoke-office-derive-contract.js — 锁单一真相源契约:
//   人物 officialTitle 是真相·官制树/图志从它派生·AI改officialTitle即落座·卸任不误成布衣。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let assertions = 0;
function assert(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); assertions++; }

const ctx = {
  console, Math, JSON, RegExp, Array, Object, String, Number, Boolean, parseInt, parseFloat, isNaN,
  window: null, P: {}, scriptData: {},
  GM: { turn: 5, playerFaction: '明朝廷', officeTree: [], chars: [] }
};
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
const load = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
load('tm-office-runtime.js');
load('tm-office-system.js');

function seatOf(name) {
  let r = null;
  (function walk(ns){ (ns||[]).forEach(n=>{ (n.positions||[]).forEach(p=>{
    const named = (Array.isArray(p.actualHolders)?p.actualHolders:[]).filter(h=>h&&h.name&&h.generated!==false).map(h=>h.name);
    if (named.indexOf(name)>=0 || p.holder===name) r = (n._offDynamic?'[动态]':'') + n.name + '/' + p.name;
  }); if(n.subs) walk(n.subs); }); })(ctx.GM.officeTree);
  return r;
}

function freshTree() {
  ctx.GM.officeTree = [
    { name: '兵部', positions: [
      { name: '尚书', holder: '', establishedCount: 1, vacancyCount: 1, actualHolders: [{name:'',generated:false}] },
      { name: '左侍郎', holder: '', establishedCount: 1, vacancyCount: 1, actualHolders: [{name:'',generated:false}] }
    ], subs: [] },
    { name: '都察院', positions: [
      { name: '左都御史', holder: '', establishedCount: 1, vacancyCount: 1, actualHolders: [{name:'',generated:false}] }
    ], subs: [] }
  ];
}

// ── 契约1:AI把 officialTitle 写成"兵部尚书"(树pos是"尚书")·派生应据匹配落座(治症状③) ──
freshTree();
ctx.GM.chars = [ { name: '张三', faction: '明朝廷', officialTitle: '兵部尚书', alive: true } ];
ctx._offSyncHoldersFromChars({ force: true });
assert(seatOf('张三') === '兵部/尚书', '张三 officialTitle=兵部尚书 应落座 兵部/尚书·实际:' + seatOf('张三'));
assert(ctx.GM.officeTree[0].positions[0].holder === '张三', '树holder应=张三');

// ── 契约2:树与人物同步——人物 officialTitle 在·图志不显布衣 ──
assert(ctx.GM.chars[0].officialTitle && ctx.GM.chars[0].officialTitle.trim(), '张三 应有 officialTitle(非布衣)');

// ── 契约3:卸任单职者→officialTitle清空·真布衣(正确) ──
ctx._offRemoveCharOfficeTitle(ctx.GM.chars[0], '兵部尚书');
ctx._offSyncHoldersFromChars({ force: true });
assert(!seatOf('张三'), '卸任后张三不应在树·实际:' + seatOf('张三'));
assert(!ctx.GM.chars[0].officialTitle, '单职卸任后 officialTitle 应空(真布衣)');

// ── 契约4:兼任者卸一职·仍保留另一职·不误成布衣(治症状②) ──
freshTree();
ctx.GM.chars = [ { name: '李四', faction: '明朝廷', officialTitle: '兵部尚书', alive: true } ];
ctx._offAddCharOfficeTitle(ctx.GM.chars[0], '左都御史', { concurrent: true }); // 兼任都察院
ctx._offSyncHoldersFromChars({ force: true });
assert(ctx.GM.chars[0].officialTitle === '兵部尚书', '主职应仍是兵部尚书');
const seatsLi = [];
(function walk(ns){ (ns||[]).forEach(n=>{ (n.positions||[]).forEach(p=>{ if(p.holder==='李四'||(p.actualHolders||[]).some(h=>h&&h.name==='李四')) seatsLi.push(n.name+'/'+p.name); }); if(n.subs)walk(n.subs); }); })(ctx.GM.officeTree);
assert(seatsLi.length === 2, '兼任者应占两个座位·实际:' + JSON.stringify(seatsLi));
// 卸去主职·剩 concurrent
ctx._offRemoveCharOfficeTitle(ctx.GM.chars[0], '兵部尚书');
assert(ctx.GM.chars[0].officialTitle && ctx.GM.chars[0].officialTitle.trim(), '卸一职后仍有剩余官职·不应布衣·实际OT:' + JSON.stringify(ctx.GM.chars[0].officialTitle));
assert(ctx.GM.chars[0].title && ctx.GM.chars[0].title.trim(), 'title 应同步为剩余主职·非空(防布衣)');

// ── 契约5:敌国官员不进本朝树 ──
freshTree();
ctx.GM.chars = [
  { name: '皇太极', faction: '后金', officialTitle: '后金汗', alive: true },
  { name: '王五', faction: '明朝廷', officialTitle: '兵部左侍郎', alive: true }
];
ctx._offSyncHoldersFromChars({ force: true });
assert(!seatOf('皇太极'), '敌国皇太极不应进明官制树');
assert(seatOf('王五'), '本朝王五应进树');

// ── 契约6:幂等 ──
const a = JSON.stringify(ctx.GM.officeTree);
ctx._offSyncHoldersFromChars({ force: true });
assert(JSON.stringify(ctx.GM.officeTree) === a, '重复派生应幂等');

console.log('[smoke-office-derive-contract] pass assertions=' + assertions);
