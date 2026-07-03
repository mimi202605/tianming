#!/usr/bin/env node
// smoke-confiscate-tiers.js - A1 抄家深化:隐匿动态公式 + 五级株连 + 抄后阶层
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, msg) { if (!cond) throw new Error(msg); passed++; }
function approx(a, b, eps) { return Math.abs(a - b) <= (eps || 0.01); }
function load(ctx, rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(src, ctx, { filename: rel });
}

function mkChar(over) {
  return Object.assign({
    id: over.id, name: over.id, integrity: 50, clanPrestige: 50,
    resources: { privateWealth: { money: 0, land: 0, treasure: 0, commerce: 0 }, hiddenWealth: 0, fame: 0 },
    socialClass: 'civilOfficial'
  }, over);
}

function main() {
  const chars = [];
  const ctx = {
    console, Math, JSON, Object, Array, Number, String, Boolean, RegExp, isFinite, isNaN,
    Error, TypeError, RangeError,
    GM: {
      turn: 5, clans: {}, chars: chars,
      guoku: { balance: 0, money: 0 },
      neitang: { balance: 0, money: 0 },
      corruption: { subDepts: {} },
      facs: [], regions: {}, officeTree: []
    },
    addEB: function() {},
    random: function() { return 0.2; }
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  load(ctx, 'tm-fiscal-engine.js');   // 国库出入已收口走真账(2026-07-04)·沙箱须与运行时同形态
  load(ctx, 'tm-char-economy-engine.js');
  const CE = ctx.CharEconEngine;
  assert(CE && typeof CE.confiscate === 'function', 'CharEconEngine.confiscate exported');
  assert(typeof CE.estimateHiddenWealth === 'function', 'estimateHiddenWealth exported');
  assert(typeof CE.estimateConcealmentRatio === 'function', 'estimateConcealmentRatio exported');

  // ── 1) 动态隐匿率：脏官(低廉+高功名+豪门) > 清官 ──
  const dirty = mkChar({ id: 'dirty', integrity: 20, clanPrestige: 80,
    resources: { privateWealth: { money: 100000, land: 1000, treasure: 50000, commerce: 20000 }, hiddenWealth: 30000, fame: 50 },
    virtueMeritInit: 8000 });
  const clean = mkChar({ id: 'clean', integrity: 90, clanPrestige: 30,
    resources: { privateWealth: { money: 5000 }, hiddenWealth: 0, fame: 40 }, virtueMeritInit: 100 });
  ctx.CharEconEngine.ensureCharResources(dirty);
  ctx.CharEconEngine.ensureCharResources(clean);
  const rDirty = CE.estimateConcealmentRatio(dirty);
  const rClean = CE.estimateConcealmentRatio(clean);
  assert(rDirty > rClean, '脏官隐匿率 > 清官 (' + rDirty.toFixed(2) + ' vs ' + rClean.toFixed(2) + ')');
  // 0.8*0.3 + 0.5*0.3 + 0.8*0.4 + 0.2 = 0.91
  assert(approx(rDirty, 0.91, 0.001), '脏官隐匿率公式=0.91, got ' + rDirty);
  // 隐匿总额 = tracked + visible×ratio ; visible = 100000+5000+50000+20000=175000
  const eh = CE.estimateHiddenWealth(dirty);
  assert(approx(eh, 30000 + 175000 * 0.91, 1), 'estimateHiddenWealth=tracked+visible×ratio, got ' + eh);

  // ── 2) 挖掘率：thoroughness×.3+interrogation×.5+informant×.2 ──
  // 用一个独立字段探针：不抄,只看 confiscate 内部 rate 反映在 hidden 上
  const probe = mkChar({ id: 'probe', integrity: 50, clanPrestige: 50,
    resources: { privateWealth: { money: 0 }, hiddenWealth: 10000, fame: 0 } });
  chars.push(probe);
  const pr = CE.confiscate(probe, { thoroughness: 1, interrogationPressure: 1, informantQuality: 1, destination: 'guoku' });
  // rate=1 → 全挖 10000 (visible=0,ratio*0=0 ⇒ hidden≈10000)
  assert(approx(pr.hidden, 10000, 1), '满挖掘率挖出全部藏款, got ' + pr.hidden);

  // ── 3) 基础抄家 → 庶人·身败名裂·名望重挫·入帑廪 ──
  const solo = mkChar({ id: 'solo', integrity: 30,
    resources: { privateWealth: { money: 20000, land: 0, treasure: 0, commerce: 0 }, hiddenWealth: 0, fame: 50 } });
  chars.push(solo);
  const g0 = ctx.GM.guoku.balance;
  const sr = CE.confiscate(solo, { intensity: 0.5, destination: 'guoku' });
  assert(sr.success && sr.total > 0, '基础抄家成功');
  assert(solo.confiscated === true && solo.retired === true, '抄后 confiscated/retired');
  assert(solo.status === 'disgraced', '抄后 status=disgraced');
  assert(solo.socialClass === 'commoner', '抄后 socialClass=commoner, got ' + solo.socialClass);
  assert(solo.resources.fame === 10, '抄后名望重挫 -40 (50→10), got ' + solo.resources.fame);
  assert(approx(ctx.GM.guoku.balance - g0, sr.total, 1), '入帑廪额=total');
  assert(solo.resources.privateWealth.money === 0, '现金清零');
  // 重复抄 → 拒绝
  const sr2 = CE.confiscate(solo, { intensity: 0.5 });
  assert(sr2.success === false, '已抄没者拒绝重复抄');

  // ── 4) 五级株连:immediate_family 只及妻孥(子女),不取共财 ──
  ctx.GM.clans.clanIM = { members: ['imHead', 'imCh1', 'imCh2', 'imCousin'], sharedWealth: 40000 };
  const imHead = mkChar({ id: 'imHead', integrity: 40,
    resources: { privateWealth: { money: 30000 }, hiddenWealth: 0, fame: 30 },
    family: { clanId: 'clanIM', children: ['imCh1', 'imCh2'] } });
  const imCh1 = mkChar({ id: 'imCh1', resources: { privateWealth: { money: 6000 }, hiddenWealth: 0, fame: 0 } });
  const imCh2 = mkChar({ id: 'imCh2', resources: { privateWealth: { money: 8000 }, hiddenWealth: 0, fame: 0 } });
  const imCousin = mkChar({ id: 'imCousin', resources: { privateWealth: { money: 99999 }, hiddenWealth: 0, fame: 0 } });
  chars.push(imHead, imCh1, imCh2, imCousin);
  const gIM0 = ctx.GM.guoku.balance;
  const shareIM0 = ctx.GM.clans.clanIM.sharedWealth;
  const imr = CE.confiscate(imHead, { clanImplication: 'immediate_family', intensity: 0.5, destination: 'guoku' });
  assert(imr.clanImplication === 'immediate_family', 'tier=immediate_family');
  assert(imCh1.confiscated && imCh2.confiscated, '子女受株连被抄');
  assert(imCousin.confiscated !== true, '远亲(堂兄弟)不在直系株连内');
  assert(imr.clanLoss === 0, 'immediate_family 不取家族共财, got ' + imr.clanLoss);
  assert(ctx.GM.clans.clanIM.sharedWealth === shareIM0, '共财未动');
  // 无双重入账:帑廪增量 === grandTotal(主犯total + 株连haul)
  assert(approx(ctx.GM.guoku.balance - gIM0, imr.grandTotal, 1),
    '帑廪增量===grandTotal(无双重入账): Δ' + (ctx.GM.guoku.balance - gIM0) + ' vs ' + imr.grandTotal);
  assert(imr.implicatedHaul > 0 && imr.grandTotal > imr.total, '株连haul计入grandTotal');

  // ── 5) 九族:取共财 + 全族成员;旧 includeClan→九族 ──
  ctx.GM.clans.clan9 = { members: ['n9Head', 'n9a', 'n9b'], sharedWealth: 50000 };
  const n9Head = mkChar({ id: 'n9Head', integrity: 40,
    resources: { privateWealth: { money: 40000 }, hiddenWealth: 0, fame: 30 },
    family: { clanId: 'clan9', children: [] } });
  const n9a = mkChar({ id: 'n9a', resources: { privateWealth: { money: 7000 }, hiddenWealth: 0, fame: 0 } });
  const n9b = mkChar({ id: 'n9b', resources: { privateWealth: { money: 9000 }, hiddenWealth: 0, fame: 0 } });
  chars.push(n9Head, n9a, n9b);
  const g90 = ctx.GM.guoku.balance;
  const share90 = ctx.GM.clans.clan9.sharedWealth;
  const n9r = CE.confiscate(n9Head, { includeClan: true, intensity: 0.6, destination: 'guoku' });
  assert(n9r.clanImplication === 'nine_generations', '旧 includeClan→九族');
  assert(n9r.clanLoss > 0, '九族取家族共财');
  assert(approx(ctx.GM.clans.clan9.sharedWealth, share90 - share90 * 0.6 * 0.5, 1), '共财损失=share×rate×0.5');
  assert(n9a.confiscated && n9b.confiscated, '全族成员受株连');
  assert(approx(ctx.GM.guoku.balance - g90, n9r.grandTotal, 1),
    '九族:帑廪增量===grandTotal(无双重): Δ' + (ctx.GM.guoku.balance - g90) + ' vs ' + n9r.grandTotal);

  // ── 6) 向后兼容:旧两参调用形态返回 success ──
  const compat = mkChar({ id: 'compat', resources: { privateWealth: { money: 1000 }, hiddenWealth: 0, fame: 0 } });
  chars.push(compat);
  const cr = CE.confiscate(compat, { intensity: 0.6, includeClan: false, destination: 'neitang' });
  assert(cr.success === true && typeof cr.total === 'number', '旧形态调用成功');
  assert(ctx.GM.neitang.balance > 0, 'destination=neitang 入内帑');

  console.log('[smoke-confiscate-tiers] PASS ' + passed + ' assertions');
}

try { main(); } catch (err) {
  console.error('[smoke-confiscate-tiers] FAIL');
  console.error(err && err.stack || err);
  process.exit(1);
}
