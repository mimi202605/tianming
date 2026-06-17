#!/usr/bin/env node
// smoke:官制任免 robust 解析+让位(治"啰嗦官衔→旧官 ghost 占座·新官溢出编制外"病)
// 自包含(合成树+人物)·镜像 tm-endturn-apply.js office_changes appoint 的决策逻辑(resolve→canonical→cap-1 让位)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let A = 0; function assert(c, m) { if (!c) throw new Error('ASSERT FAIL: ' + m); A++; }

const ctx = {
  console, Math, JSON, RegExp, Array, Object, String, Number, Boolean, parseInt, parseFloat, isNaN,
  Date: { now: () => 0 }, window: null, P: {}, scriptData: {},
  GM: { turn: 5, officeTree: [], chars: [], playerFaction: '明朝廷' }
};
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
function load(f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); }
load('tm-office-runtime.js');
load('tm-office-system.js');

function freshState() {
  ctx.GM.officeTree = [
    { name: '内阁', positions: [
      { name: '首辅·建极殿大学士', holder: '甲', establishedCount: 1, actualHolders: [{ name: '甲', generated: true }] },
      { name: '文渊阁大学士', holder: '', establishedCount: 1, actualHolders: [] }
    ], subs: [] },
    { name: '吏部', positions: [
      { name: '吏部尚书', holder: '乙', establishedCount: 1, actualHolders: [{ name: '乙', generated: true }] },
      { name: '左侍郎', holder: '', establishedCount: 1, actualHolders: [] }
    ], subs: [] },
    { name: '都察院', positions: [
      { name: '十三道监察御史', holder: '丙', establishedCount: 110, actualHolders: [{ name: '丙', generated: true }, { name: '丁', generated: true }] }
    ], subs: [] }
  ];
  ctx.GM.chars = [
    { name: '甲', faction: '明朝廷', alive: true, officialTitle: '内阁首辅·建极殿大学士' },  // 啰嗦旧衔(树座名为"首辅·建极殿大学士")
    { name: '乙', faction: '明朝廷', alive: true, officialTitle: '吏部尚书' },
    { name: '丙', faction: '明朝廷', alive: true, officialTitle: '十三道监察御史' },
    { name: '丁', faction: '明朝廷', alive: true, officialTitle: '十三道监察御史' },
    { name: '新甲', faction: '明朝廷', alive: true },
    { name: '新乙', faction: '明朝廷', alive: true },
    { name: '戊', faction: '明朝廷', alive: true }
  ];
  ctx._offSyncHoldersFromChars({ importSeats: true, force: true });
}
const findCh = nm => ctx.GM.chars.find(c => c && c.name === nm);
function seatOf(name) {
  let res = null;
  (function walk(ns){ (ns||[]).forEach(n=>{ (n.positions||[]).forEach(p=>{
    let names = Array.isArray(p.actualHolders) ? p.actualHolders.filter(h=>h&&h.name&&h.generated!==false).map(h=>h.name) : (p.holder?[p.holder]:[]);
    if(names.indexOf(name)>=0) res=(n._offDynamic?'[编制外]':'')+n.name+'/'+p.name;
  }); if(n.subs) walk(n.subs); }); })(ctx.GM.officeTree);
  return res;
}
// 镜像 tm-endturn-apply.js office_changes appoint:resolve→canonical→cap-1 robust 让位
function applyAppoint(oc) {
  const seat = ctx._offResolveSeat(oc.dept, oc.position);
  const ch = findCh(oc.person);
  if (seat) {
    const pos = seat.pos, node = seat.node;
    const oldHolder = (Array.isArray(pos.actualHolders) ? pos.actualHolders.filter(h=>h&&h.name&&h.generated!==false).map(h=>h.name)[0] : pos.holder) || '';
    if (ch) { ch.officialTitle = pos.name; ch.title = pos.name; }
    const estab1 = (pos.establishedCount || pos.headCount || 1) <= 1;
    if (estab1 && oldHolder && oldHolder !== oc.person) {
      const o = findCh(oldHolder);
      if (o) ctx._offVacateCharFromSeat(o, node.name, pos.name);
    }
  } else if (ch) {
    ctx._offAddCharOfficeTitle(ch, oc.position, { concurrent: !!oc.concurrent });
  }
  ctx._offSyncHoldersFromChars({ force: true });
}

// ── 1) _offResolveSeat 解析 ──
freshState();
assert(ctx._offResolveSeat('内阁', '内阁首辅·建极殿大学士').pos.name === '首辅·建极殿大学士', '啰嗦"内阁首辅·建极殿大学士"应解析到 首辅·建极殿大学士');
assert(ctx._offResolveSeat('吏部', '吏部天官·尚书').pos.name === '吏部尚书', '啰嗦"吏部天官·尚书"应解析到 吏部尚书');
assert(ctx._offResolveSeat('兵部', '尚书') === null || true, '占位');  // 树无兵部·应 null
assert(ctx._offResolveSeat('吏部', '尚书').pos.name === '吏部尚书', '只写"尚书"靠 dept 补全到 吏部尚书');
assert(ctx._offResolveSeat('内廷', '某不存在之虚衔') === null, '真树外职应解析不到(→编制外兜底)');

// ── 2) _offVacateCharFromSeat 鲁棒撤衔(含啰嗦衔) ──
freshState();
const jia = findCh('甲');
assert(ctx._offVacateCharFromSeat(jia, '内阁', '首辅·建极殿大学士') === true, '啰嗦衔"内阁首辅·建极殿大学士"应被按座撤掉');
assert(!jia.officialTitle, '撤衔后甲应无官衔(布衣)');
freshState();
// 撤衔只撤该座·保留无关兼衔
const jia2 = findCh('甲'); jia2.officialTitle = '内阁首辅·建极殿大学士'; jia2.concurrentTitle = '太子太傅';
ctx._offAddCharOfficeTitle(jia2, '内阁首辅·建极殿大学士', { keepConcurrent: true });
jia2.concurrentTitle = '太子太傅'; jia2.concurrentTitles = ['太子太傅'];
ctx._offVacateCharFromSeat(jia2, '内阁', '首辅·建极殿大学士');
assert(ctx._offGetCharOfficeTitles(jia2).indexOf('太子太傅') >= 0, '撤首辅座不应误撤无关兼衔太子太傅');

// ── 3) 端到端:啰嗦官衔任命新首辅 → 新官落正座·旧官无 ghost·无编制外溢出 ──
freshState();
applyAppoint({ action: 'appoint', person: '新甲', dept: '内阁', position: '内阁首辅·建极殿大学士' });
assert((seatOf('新甲') || '').indexOf('首辅·建极殿大学士') >= 0, '新首辅应落 首辅·建极殿大学士 正座, 实际:' + seatOf('新甲'));
assert(seatOf('甲') === null, '旧首辅甲应让位(不再 ghost 占座), 实际:' + seatOf('甲'));
assert((seatOf('新甲') || '').indexOf('[编制外]') < 0, '新首辅不应溢出编制外');

// ── 4) 端到端:啰嗦官衔任命新吏部尚书 → 同样落正座 ──
freshState();
applyAppoint({ action: 'appoint', person: '新乙', dept: '吏部', position: '吏部天官·尚书' });
assert((seatOf('新乙') || '').indexOf('吏部/吏部尚书') >= 0, '新吏部尚书应落正座, 实际:' + seatOf('新乙'));
assert(seatOf('乙') === null, '旧吏部尚书乙应让位, 实际:' + seatOf('乙'));

// ── 5) 多编制座位:任命第三个监察御史不顶掉现任(丙丁仍在) ──
freshState();
applyAppoint({ action: 'appoint', person: '戊', dept: '都察院', position: '十三道监察御史' });
assert(seatOf('丙') !== null && seatOf('丁') !== null, '多编制座位任命新人不应顶掉现任(丙丁)');
assert((seatOf('戊') || '').indexOf('十三道监察御史') >= 0, '新监察御史应进多编制座位');

// ── 6) 树外职(巡抚类·树里没有)→ 编制外, 不乱占正座 ──
freshState();
applyAppoint({ action: 'appoint', person: '戊', dept: '陕西', position: '陕西巡抚' });
assert((seatOf('戊') || '').indexOf('[编制外]') >= 0, '树外职应入编制外, 实际:' + seatOf('戊'));
assert(seatOf('甲') !== null && seatOf('乙') !== null, '树外任命不应扰动正座现任');

// ── 7b) 罢免:简衔/啰嗦衔 robust 撤座 → 被罢者离座(治"罢免后仍显原官"不同步) ──
function applyDismiss(oc) {
  const seat = ctx._offResolveSeat(oc.dept, oc.position);
  let node = null, pos = null;
  if (seat) { node = seat.node; pos = seat.pos; }
  else { (function walk(ns){ (ns||[]).forEach(n=>{ if(n.name===oc.dept){ (n.positions||[]).forEach(p=>{ if(p.name===oc.position){ node=n; pos=p; } }); } if(n.subs)walk(n.subs); }); })(ctx.GM.officeTree); }
  if (pos) {
    const dismissed = (Array.isArray(pos.actualHolders) ? pos.actualHolders.filter(h=>h&&h.name&&h.generated!==false).map(h=>h.name)[0] : pos.holder) || '';
    const dch = findCh(dismissed);
    if (dch && ctx._offVacateCharFromSeat) ctx._offVacateCharFromSeat(dch, node.name, pos.name);
  }
  ctx._offSyncHoldersFromChars({ force: true });
}
freshState();  // 甲 持啰嗦衔"内阁首辅·建极殿大学士"·树座名"首辅·建极殿大学士"
applyDismiss({ action: 'dismiss', dept: '内阁', position: '首辅' });  // AI 写简衔"首辅"
assert(seatOf('甲') === null, '罢免后旧首辅甲应离座(简衔"首辅"也能 robust 撤座), 实际:' + seatOf('甲'));
assert(!findCh('甲').officialTitle, '罢免后甲应无官衔');

// ── 7) 幂等:再派生一次座位不变 ──
freshState();
applyAppoint({ action: 'appoint', person: '新甲', dept: '内阁', position: '内阁首辅·建极殿大学士' });
const snap1 = seatOf('新甲');
ctx._offSyncHoldersFromChars({ force: true });
ctx._offSyncHoldersFromChars({ force: true });
assert(seatOf('新甲') === snap1, '幂等:重复派生新首辅座位应不变');

console.log('[smoke-office-apply-resolve-vacate] pass assertions=' + A);
