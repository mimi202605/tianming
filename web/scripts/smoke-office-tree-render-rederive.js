#!/usr/bin/env node
// smoke-office-tree-render-rederive.js — 治"过回合后官制树大量官职被清掉"
//   根因:官制树是派生视图·render 用 _offSyncHoldersFromChars({ifChanged}) 的签名只哈希角色不看树态→
//        树被搅空(角色没变)时 render 误判"无变化"跳过重建·显示陈旧稀疏树(sync 本身正常·force 跑给满)
//   修=render 时在【角色已有 officialTitle】则 force 重派生(否则 ifChanged 兜底防初始化空角色扫空剧本树)
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function assert(c, m) { if (c) pass++; else { fail++; console.error('  ✗ ' + m); } }

// ── ① 源码契约:两个官制树渲染点·角色有officialTitle时force重派生 ──
(function () {
  const rt = fs.readFileSync(path.join(ROOT, 'tm-office-runtime.js'), 'utf8');
  const rr = fs.readFileSync(path.join(ROOT, 'phase8-formal-rightrail.js'), 'utf8');
  // 渲染点不再裸用 {ifChanged:true}·改为 officialTitle 决策 force/ifChanged
  assert(/c\.alive!==false&&c\.officialTitle;\}\)\?\{ force: true \}:\{ ifChanged: true \}/.test(rt), '① office-runtime:renderOfficeTree 角色有职则force');
  assert(/c\.alive!==false&&c\.officialTitle;\}\)\?\{ force: true \}:\{ ifChanged: true \}/.test(rr), '① rightrail:rightOfficeTree 角色有职则force');
  // 不再有裸 {ifChanged:true} 的官制树同步(渲染点)
  assert(!/_offSyncHoldersFromChars\(\{ ifChanged: true \}\)/.test(rt), '① office-runtime 无裸ifChanged官制同步');
  console.log('  [①] 源码契约:两渲染点角色有职则force重派生 OK');
})();

// ── 真 office-system 函数 ──
function loadOffice() {
  const ctx = { console: { log() {}, warn() {}, error() {} }, Math, JSON, Object, Array, Number, String, Boolean, RegExp, isFinite, isNaN, parseInt, parseFloat, Date: { now: () => 0 } };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-office-system.js'), 'utf8'), ctx, { filename: 'tm-office-system.js' });
  return ctx;
}
const hc = GM => { let n = 0; (function w(ns){ (ns||[]).forEach(d=>{ (d.positions||[]).forEach(p=>{ if(p.holder||(p.actualHolders&&p.actualHolders.some(x=>x&&x.name)))n++; }); if(d.subs)w(d.subs); }); })(GM.officeTree||[]); return n; };
// render 的决策谓词(复刻修复表达式)
const wantsForce = GM => (GM.chars || []).some(c => c && c.alive !== false && c.officialTitle);

// ── ② 树被搅空但角色有职 → 决策force → 重派生refill(治症) ──
(function () {
  const ctx = loadOffice();
  // 构造:树有结构(2座)但 holder 被搅空·角色有 officialTitle
  ctx.GM = {
    turn: 10,
    chars: [{ name: '甲', alive: true, faction: '明朝廷', officialTitle: '礼部尚书' }, { name: '乙', alive: true, faction: '明朝廷', officialTitle: '吏部尚书' }],
    officeTree: [{ name: '礼部', positions: [{ name: '礼部尚书', establishedCount: 1, holder: '' }] }, { name: '吏部', positions: [{ name: '吏部尚书', establishedCount: 1, holder: '' }] }]
  };
  assert(hc(ctx.GM) === 0, '② 前置:树holder被搅空(0)');
  assert(wantsForce(ctx.GM) === true, '② 角色有officialTitle → 决策选 force');
  // 模拟 render:角色有职→force
  ctx._offSyncHoldersFromChars(wantsForce(ctx.GM) ? { force: true } : { ifChanged: true });
  assert(hc(ctx.GM) === 2, '② force重派生refill·实=' + hc(ctx.GM) + ' (期望2)');
  console.log('  [②] 树搅空+角色有职 → force重派生填回 OK');
})();

// ── ③ 守卫:角色无officialTitle → 决策选ifChanged(不force·防初始化扫空) ──
(function () {
  const ctx = loadOffice();
  ctx.GM = { turn: 1, chars: [{ name: '甲', alive: true, faction: '明朝廷', title: '礼部尚书' }], officeTree: [{ name: '礼部', positions: [{ name: '礼部尚书', holder: '甲' }] }] };
  assert(wantsForce(ctx.GM) === false, '③ 角色无officialTitle → 决策选 ifChanged(不force)');
  console.log('  [③] 守卫:无officialTitle不force(防初始化空角色扫空剧本树) OK');
})();

// ── ④ ifChanged 守卫确实只哈希角色不看树态(证根因) ──
(function () {
  const ctx = loadOffice();
  ctx.GM = { turn: 5, chars: [{ name: '甲', alive: true, faction: '明朝廷', officialTitle: '礼部尚书' }], officeTree: [{ name: '礼部', positions: [{ name: '礼部尚书', establishedCount: 1, holder: '甲' }] }] };
  ctx._offSyncHoldersFromChars({ ifChanged: true }); // 建立签名
  // 搅空树·角色不动
  ctx.GM.officeTree[0].positions[0].holder = '';
  if (Array.isArray(ctx.GM.officeTree[0].positions[0].actualHolders)) ctx.GM.officeTree[0].positions[0].actualHolders.forEach(h => { if (h) h.name = ''; });
  const r = ctx._offSyncHoldersFromChars({ ifChanged: true }); // 角色没变→签名同→跳过
  assert(r && r.skipped === true, '④ ifChanged 因角色没变跳过(证:只哈希角色不看树态→树搅空也不重建)');
  assert(hc(ctx.GM) === 0, '④ 跳过后树保持被搅空(0)·这就是bug显现');
  console.log('  [④] 根因坐实:ifChanged只看角色·树搅空被误跳过');
})();

console.log('[smoke-office-tree-render-rederive] ' + pass + ' passed / ' + fail + ' failed');
if (fail > 0) process.exit(1);
