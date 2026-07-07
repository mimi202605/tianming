#!/usr/bin/env node
'use strict';
// smoke-player-commander-fate — 战斗静默杀修复+被俘北狩态（鼎革R1b·2026-07-07）
// 病灶(勘察D漏洞①)：commanderFate 对玩家角色零特判——御驾亲征战殁只标 alive=false=
// 先帝静默尸政·被俘只写 capturedBy 全无后果。
// 修：_routePlayerCommanderFate 岔口(两站点追加)——战殁→R1a 裁决器(有嗣继统/绝嗣终局)·
// 被俘→北狩特殊可玩态(不死不继承不终局·_playerCaptive+乘舆蒙尘入御案时政)·NPC 主将原样零回归。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let N = 0;
function assert(c, m) { N++; if (!c) { console.error('ASSERT FAIL [' + N + ']:', m); process.exit(1); } }

function mkCtx() {
  const ctx = { console: { log() {}, warn() {}, error() {} }, Math, JSON, String, Number, Array, Object, RegExp, parseInt, parseFloat, isFinite, isNaN, Date: { now: () => 0 } };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  ctx.SettlementPipeline = { register: function () {} };
  ctx.TM = {};
  ctx._ebs = []; ctx.addEB = (cat, txt) => ctx._ebs.push(cat + '|' + txt);
  // R1a 裁决器 stub(真身在 helpers·此处记录调用契约·继承逻辑由 adjudicator 自己的 smoke 验)
  ctx._adjCalls = [];
  ctx.adjudicatePlayerDeath = (ch, cause, opts) => { ctx._adjCalls.push({ name: ch && ch.name, cause: cause, kind: opts && opts.kind }); return { outcome: 'gameover' }; };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-utils.js'), 'utf8'), ctx, { filename: 'tm-utils.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-military.js'), 'utf8'), ctx, { filename: 'tm-military.js' });
  return ctx;
}
function fixGM(ctx, emperor) {
  ctx.GM = {
    turn: 30, currentIssues: [],
    chars: [emperor, { name: '皇太极', alive: true }],
    armies: [
      { name: '御营', faction: '明朝廷', soldiers: 40000, morale: 60, commander: emperor.name },
      { name: '八旗', faction: '后金', soldiers: 60000, morale: 70, commander: '皇太极' }
    ]
  };
  ctx.P = { conf: { deterministicCasualties: false }, battleConfig: {} };
}

// ── 玩家战殁 → 裁决器(kind=battle) ──
var c1 = mkCtx();
var emp1 = { name: '天子', isPlayer: true, alive: true };
fixGM(c1, emp1);
c1.MilitarySystems.applyBattleResult({
  winner: '后金', loser: '明朝廷', attacker: '御营', defender: '八旗',
  casualties: { attacker: 20000, defender: 5000 },
  affectedArmies: [{ name: '御营', side: 'attacker', loss: 20000, commander: '天子', commanderFate: { name: '天子', outcome: 'killed' } }]
}, c1.GM);
assert(emp1.alive === false && emp1.dead === true, '① 战殁标死齐全(alive+dead·不再半死态)');
assert(emp1.deathReason && emp1.deathReason.indexOf('御驾亲征') >= 0, '② 死因具名(御驾亲征崩于军中)');
assert(c1._adjCalls.length === 1 && c1._adjCalls[0].kind === 'battle' && c1._adjCalls[0].name === '天子', '③ 战殁交 R1a 裁决器(kind=battle·不再静默)');
assert(c1._ebs.some(e => e.indexOf('崩于军中') > 0), '④ 战殁讣文入编年');

// ── 玩家被俘 → 北狩特殊态(不死不终局·owner 裁定分叉①) ──
var c2 = mkCtx();
var emp2 = { name: '天子', isPlayer: true, alive: true };
fixGM(c2, emp2);
c2.MilitarySystems.applyBattleResult({
  winner: '后金', loser: '明朝廷', attacker: '御营', defender: '八旗',
  casualties: { attacker: 15000, defender: 4000 },
  affectedArmies: [{ name: '御营', side: 'attacker', loss: 15000, commander: '天子', commanderFate: { name: '天子', outcome: 'captured' } }]
}, c2.GM);
assert(emp2.alive !== false && !emp2.dead, '⑤ 被俘不死(北狩非终局)');
assert(c2._adjCalls.length === 0, '⑥ 被俘不触裁决器(不继承·天子未崩)');
assert(emp2._captured === true && emp2._capturedBy === '后金' && emp2.capturedBy === '后金', '⑦ 北狩态字段(_captured/_capturedBy+通用capturedBy原样)');
assert(c2.GM._playerCaptive && c2.GM._playerCaptive.name === '天子' && c2.GM._playerCaptive.by === '后金', '⑧ _playerCaptive 全局信号(摄政/赎归后续刀读)');
assert(c2.GM.currentIssues.length === 1 && c2.GM.currentIssues[0]._captive === true && c2.GM.currentIssues[0].description.indexOf('监国摄政') >= 0, '⑨ 乘舆蒙尘入御案时政·附监国/赎驾/迎还指引');
assert(c2._ebs.some(e => e.indexOf('国难|') === 0), '⑩ 国难入编年');

// ── NPC 主将战殁/被俘：原样零回归(不触玩家路由) ──
var c3 = mkCtx();
var emp3 = { name: '天子', isPlayer: true, alive: true };
fixGM(c3, emp3);
c3.MilitarySystems.applyBattleResult({
  winner: '明朝廷', loser: '后金', attacker: '御营', defender: '八旗',
  casualties: { attacker: 3000, defender: 20000 },
  affectedArmies: [{ name: '八旗', side: 'defender', loss: 20000, commander: '皇太极', commanderFate: { name: '皇太极', outcome: 'killed' } }]
}, c3.GM);
var htj = c3.GM.chars[1];
assert(htj.alive === false && !htj.deathReason, '⑪ NPC 主将战殁原样(alive=false·不带玩家专属字段)');
assert(c3._adjCalls.length === 0 && !c3.GM._playerDead, '⑫ NPC 死不触玩家路由(零回归)');

// ── 顶层 commanderFate 路(br.commanderFate 无 affectedArmies 条目) ──
var c4 = mkCtx();
var emp4 = { name: '天子', isPlayer: true, alive: true };
fixGM(c4, emp4);
c4.MilitarySystems.applyBattleResult({
  winner: '后金', loser: '明朝廷', attacker: '御营', defender: '八旗',
  casualties: { attacker: 10000, defender: 3000 },
  commanderFate: { name: '天子', outcome: 'captured' }
}, c4.GM);
assert(emp4._captured === true && c4.GM._playerCaptive, '⑬ 顶层 commanderFate 路同覆盖(两站点齐)');

// ── 裁决器缺位回落(沙箱/极端) ──
var c5 = mkCtx();
delete c5.adjudicatePlayerDeath;
var emp5 = { name: '天子', isPlayer: true, alive: true };
fixGM(c5, emp5);
c5.MilitarySystems.applyBattleResult({
  winner: '后金', loser: '明朝廷', attacker: '御营', defender: '八旗',
  casualties: { attacker: 10000, defender: 3000 },
  commanderFate: { name: '天子', outcome: 'killed' }
}, c5.GM);
assert(c5.GM._playerDead === true, '⑭ 裁决器缺位回落终局(宁终局勿尸政)');

console.log('smoke-player-commander-fate OK — ' + N + ' 断言全绿（战殁→裁决器/被俘北狩态/NPC零回归/两站点/缺位回落）');
