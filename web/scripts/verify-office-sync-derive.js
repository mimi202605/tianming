#!/usr/bin/env node
// 验证 _offSyncHoldersFromChars 对真实 turn-18 存档的派生正确性
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let assertions = 0;
function assert(cond, msg) { if (!cond) throw new Error('ASSERT FAIL: ' + msg); assertions++; }

const ctx = {
  console, Math, JSON, RegExp, Array, Object, String, Number, Boolean, parseInt, parseFloat, isNaN,
  Date: { now: () => 0 },
  window: null, P: {}, scriptData: {},
  GM: { turn: 18, officeTree: [], chars: [] }
};
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
function load(f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); }
load('tm-office-runtime.js');  // 分类器 _officeGetClassifierPatterns / _OFFICE_CLASSIFIER_PATTERNS
load('tm-office-system.js');   // 被测

// 载入真存档
const save = JSON.parse(fs.readFileSync(path.join(ROOT, '..', '_scratch_online', '_repro-save.json'), 'utf8'));
ctx.GM.chars = JSON.parse(JSON.stringify(save.characters || []));
ctx.GM.officeTree = JSON.parse(JSON.stringify((save.scenarios && save.scenarios[1] && save.scenarios[1].officeTree) || []));
ctx.GM.playerFaction = '明朝廷';

// 派生前:记录既有正式座位(baseline)
function collectSeats() {
  const m = {};
  (function walk(ns){ (ns||[]).forEach(n=>{ if(n._offDynamic) return; (n.positions||[]).forEach(p=>{
    let names=[];
    if(Array.isArray(p.actualHolders)) names=p.actualHolders.filter(h=>h&&h.name&&h.generated!==false).map(h=>h.name);
    if(!names.length&&p.holder) names=[p.holder];
    names.forEach(nm=>{ m[nm]=n.name+'/'+p.name; });
  }); if(n.subs) walk(n.subs); }); })(ctx.GM.officeTree);
  return m;
}
const baseline = collectSeats();

// 跑派生(dedupChars:去重重复人物; importSeats:先回填officialTitle)
const rawCharCount = ctx.GM.chars.length;
const r = ctx._offSyncHoldersFromChars({ importSeats: true, dedupChars: true });
console.log('派生结果:', JSON.stringify(r), '| chars', rawCharCount, '->', ctx.GM.chars.length);
assert(r && r.ok, 'sync 应成功');
assert(ctx.GM.chars.length < rawCharCount, '应去重掉重复人物');
// 去重后无同名重复
const nameCount = {};
ctx.GM.chars.forEach(c => { if (c && c.name) nameCount[c.name] = (nameCount[c.name] || 0) + 1; });
assert(Object.values(nameCount).every(n => n === 1), '去重后不应有同名重复');

const derived = collectSeats();
// 派生后动态部门里的人也算"有座"
const dynSeated = {};
ctx.GM.officeTree.filter(d=>d._offDynamic).forEach(d=>{ (d.positions||[]).forEach(p=>{ if(p.holder) dynSeated[p.holder]=d.name+'/'+p.name; }); });

// ── 断言1:既有正式座位复现率(允许兼任/重名槽改座) ──
let repro=0, moved=0, lost=0;
const lostList=[];
Object.keys(baseline).forEach(name=>{
  const ch=ctx.GM.chars.find(c=>c.name===name && c.alive!==false);
  if(!ch) return;
  // 致仕/罢归被正确排除的不算丢
  const ot=String(ch.officialTitle||'');
  if(/已罢|罢归|致仕|削籍|告归|闲住|养病|去职/.test(ot)) return;
  if(derived[name]) { derived[name]===baseline[name]?repro++:moved++; }
  else if(dynSeated[name]) { moved++; } // 进了动态组也算有座
  else { lost++; lostList.push(name+'@'+baseline[name]+' OT='+JSON.stringify(ch.officialTitle)); }
});
console.log(`既有座:复现${repro} 改座${moved} 丢座${lost}`);
if(lostList.length) console.log('丢座:', lostList.join('; '));
assert(lost===0, '不应丢座(致仕除外):'+lostList.join('; '));
assert(repro>=30, '正式座位复现应>=30,实际'+repro);

// ── 断言2:敌国/外藩不进明官制树 ──
const enemies=['皇太极','德川家光','多尔衮','代善'];
enemies.forEach(n=>{
  assert(!derived[n], n+'(敌国)不应在正式槽');
  assert(!dynSeated[n], n+'(敌国)不应在动态组');
});

// ── 断言3:后宫封号不进树 ──
['周皇后','袁贵妃'].forEach(n=>{
  const inTree = derived[n] || dynSeated[n];
  assert(!inTree, n+'(后宫)不应进官制树');
});

// ── 断言4:编制外本朝官进动态组(南京官/低阶) ──
const offTreeMing=['毕自严','王在晋']; // 南京尚书
let dynHit=0;
offTreeMing.forEach(n=>{ if(derived[n]||dynSeated[n]) dynHit++; });
assert(dynHit>=1, '南京官等编制外本朝官应至少有人进树,实际'+dynHit);
console.log('动态组任职者数:', Object.keys(dynSeated).length);

// ── 断言5:幂等——再跑一次座位不变 ──
const before = JSON.stringify(collectSeats());
ctx._offSyncHoldersFromChars({ importSeats: false });
const after = JSON.stringify(collectSeats());
assert(before===after, '幂等:重复派生座位应不变');

// ── 断言6:树holder与人物officialTitle同步(随机抽查正式座位) ──
let synced=0, checked=0;
Object.keys(derived).slice(0,20).forEach(name=>{
  const ch=ctx.GM.chars.find(c=>c.name===name&&c.alive!==false);
  if(!ch) return; checked++;
  // 人物应有非空officialTitle(派生后图志能显示官职而非布衣)
  if(ch.officialTitle && String(ch.officialTitle).trim()) synced++;
});
console.log(`正式座位人物有officialTitle: ${synced}/${checked}`);
assert(synced===checked, '所有树任职者都应有officialTitle(否则图志显布衣):'+synced+'/'+checked);

console.log('[verify-office-sync-derive] pass assertions=' + assertions);
