#!/usr/bin/env node
// smoke-office-dup-seat-heal.js — 锁「同衔重复幽灵清理」(治玩家报「过回合后官职掉、官制树/图志都掉、推演改了官职但UI没变」)
//   病:任命未让旧官 → 多人持同一精确 officialTitle(如俩"礼部尚书") → cap=1 正式座只坐一人 →
//      落选者被 Pass3 甩进「（编制外）」显幽灵同衔 → 图志/树双误显「官职掉了」·过回合越积越多。
//   治:派生时·已坐正式座者=canonical·撤其余「非在座 且 与在座者精确同衔」者的陈旧重复衔。
//   关键不变量:①只清非在座者·绝不动在座者 ②无在座者持同精确衔的同名(多个总督等编制外职)不误伤 ③幂等。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let assertions = 0;
function assert(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); assertions++; }

function makeCtx(officeSrcOverride) {
  const ctx = {
    console: { log(){}, warn(){}, error(){} }, Math, JSON, RegExp, Array, Object, String, Number, Boolean, parseInt, parseFloat, isNaN,
    window: null, P: {}, scriptData: {},
    GM: { turn: 5, playerFaction: '明朝廷', officeTree: [], chars: [] }
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext((fs.readFileSync(path.join(ROOT, 'tm-office-runtime.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'tm-office-runtime-summary-appoint.js'), 'utf8')), ctx, { filename: 'tm-office-runtime.js' });
  const src = officeSrcOverride != null ? officeSrcOverride : fs.readFileSync(path.join(ROOT, 'tm-office-system.js'), 'utf8');
  vm.runInContext(src, ctx, { filename: 'tm-office-system.js' });
  return ctx;
}

function freshTree(ctx) {
  ctx.GM.officeTree = [
    { name: '礼部', positions: [
      { name: '礼部尚书', holder: '倪元璐', establishedCount: 1, vacancyCount: 0, actualHolders: [{ name: '倪元璐', generated: true }] },
      { name: '左侍郎',   holder: '',     establishedCount: 1, vacancyCount: 1, actualHolders: [{ name: '', generated: false }] }
    ], subs: [] },
    { name: '刑部', positions: [
      { name: '刑部尚书', holder: '袁可立', establishedCount: 1, vacancyCount: 0, actualHolders: [{ name: '袁可立', generated: true }] }
    ], subs: [] }
  ];
}

function chars() {
  return [
    { name: '倪元璐', faction: '明朝廷', officialTitle: '礼部尚书', title: '翰林院编修', alive: true }, // 真holder(树既有)
    { name: '林尧俞', faction: '明朝廷', officialTitle: '礼部尚书', title: '礼部尚书',   alive: true }, // 陈旧重复幽灵
    { name: '袁可立', faction: '明朝廷', officialTitle: '刑部尚书', title: '刑部尚书',   alive: true }, // 真holder(树既有)
    { name: '乔允升', faction: '明朝廷', officialTitle: '刑部尚书', title: '刑部尚书',   alive: true }, // 陈旧重复幽灵
    { name: '卢象升', faction: '明朝廷', officialTitle: '山西总督', title: '山西总督',   alive: true }  // 无正式座→合法编制外·不得误清
  ];
}

function dynNames(ctx) {
  const out = [];
  ctx.GM.officeTree.filter(d => d && d._offDynamic).forEach(d => (d.positions || []).forEach(p => { if (p.holder) out.push(p.holder); (p.additionalHolders || []).forEach(n => out.push(n)); }));
  return out;
}
function seatHolder(ctx, dept, pos) {
  let r = null;
  (function walk(ns){ (ns||[]).forEach(n=>{ if(!n||n._offDynamic)return; if((n.name||'')===dept){ (n.positions||[]).forEach(p=>{ if((p.name||'')===pos) r = p.holder; }); } if(n.subs)walk(n.subs); }); })(ctx.GM.officeTree);
  return r;
}
const findCh = (ctx, nm) => (ctx.GM.chars || []).find(c => c && c.name === nm);

// ════════════ 1) 修复后:同衔重复幽灵被清·在座者不动·合法编制外保留 ════════════
{
  const ctx = makeCtx();
  freshTree(ctx);
  ctx.GM.chars = chars();
  const r = ctx._offSyncHoldersFromChars({ force: true });
  assert(r && r.ok, 'sync 应成功');

  // 在座者(canonical)不动
  assert(seatHolder(ctx, '礼部', '礼部尚书') === '倪元璐', '礼部尚书应仍=倪元璐(在座者不动)·实=' + seatHolder(ctx, '礼部', '礼部尚书'));
  assert(seatHolder(ctx, '刑部', '刑部尚书') === '袁可立', '刑部尚书应仍=袁可立·实=' + seatHolder(ctx, '刑部', '刑部尚书'));
  assert(findCh(ctx, '倪元璐').officialTitle === '礼部尚书', '倪元璐 officialTitle 应保留');
  assert(findCh(ctx, '袁可立').officialTitle === '刑部尚书', '袁可立 officialTitle 应保留');

  // 重复幽灵衔被撤·不再溢出编制外
  assert(findCh(ctx, '林尧俞').officialTitle === '', '林尧俞 重复礼部尚书衔应被撤(=空)·实=' + JSON.stringify(findCh(ctx, '林尧俞').officialTitle));
  assert(findCh(ctx, '乔允升').officialTitle === '', '乔允升 重复刑部尚书衔应被撤(=空)·实=' + JSON.stringify(findCh(ctx, '乔允升').officialTitle));
  assert(dynNames(ctx).indexOf('林尧俞') < 0, '林尧俞 不应再出现在编制外(幽灵已清)');
  assert(dynNames(ctx).indexOf('乔允升') < 0, '乔允升 不应再出现在编制外(幽灵已清)');

  // 合法编制外(无正式座的总督)保留·绝不误清
  assert(dynNames(ctx).indexOf('卢象升') >= 0, '卢象升(山西总督·无正式座)应保留在编制外·不得误清');
  assert(findCh(ctx, '卢象升').officialTitle === '山西总督', '卢象升 officialTitle 应保留(非重复·不撤)');
}

// ════════════ 2) swap-test:剥掉 heal 块 → 幽灵复现(证修复是 load-bearing) ════════════
{
  let src = fs.readFileSync(path.join(ROOT, 'tm-office-system.js'), 'utf8');
  const before = src.length;
  src = src.replace(/\(function _healDupSeatTitles\(\)\{[\s\S]*?\}\)\(\);/, '/* heal removed for swap-test */');
  assert(src.length < before, 'swap-test 应成功剥掉 _healDupSeatTitles 块(契约锚:函数名存在)');
  const ctx = makeCtx(src);
  freshTree(ctx);
  ctx.GM.chars = chars();
  ctx._offSyncHoldersFromChars({ force: true });
  // 无 heal:林尧俞/乔允升 仍持重复衔·被甩进编制外(复现玩家所见 bug)
  assert(findCh(ctx, '林尧俞').officialTitle === '礼部尚书', 'swap-test:无heal时 林尧俞 仍持重复礼部尚书衔');
  assert(dynNames(ctx).indexOf('林尧俞') >= 0, 'swap-test:无heal时 林尧俞 应出现在编制外(幽灵·复现bug)·证heal load-bearing');
}

// ════════════ 3) 幂等:连跑两次结果稳定 ════════════
{
  const ctx = makeCtx();
  freshTree(ctx);
  ctx.GM.chars = chars();
  ctx._offSyncHoldersFromChars({ force: true });
  const after1 = dynNames(ctx).slice().sort().join(',');
  ctx._offSyncHoldersFromChars({ force: true });
  const after2 = dynNames(ctx).slice().sort().join(',');
  assert(after1 === after2, '幂等:连跑两次编制外名单应一致·1=' + after1 + ' 2=' + after2);
  assert(seatHolder(ctx, '礼部', '礼部尚书') === '倪元璐', '幂等:礼部尚书仍=倪元璐');
}

console.log('[smoke-office-dup-seat-heal] PASS assertions=' + assertions);
