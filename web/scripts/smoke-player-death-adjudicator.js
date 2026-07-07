#!/usr/bin/env node
// smoke-player-death-adjudicator.js — 玩家之死裁决器（鼎革R1a·2026-07-07）
// 验：adjudicatePlayerDeath@tm-endturn-helpers 统一收口一切玩家死亡产地——
//   真 resolveHeir 有嗣→世代传承(isPlayer/playerInfo/继承事件/全朝记忆)续玩·
//   无嗣→_playerDead 终局(带死因分类 kind+deadReason 覆写)·两产地(AI叙事/自然死)皆委托。
//   owner 铁律：终局=玩家角色被杀·被杀有储君=继统续玩。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let N = 0;
function assert(c, m) { N++; if (!c) { console.error('ASSERT FAIL [' + N + ']:', m); process.exit(1); } }

function mkCtx(chars) {
  const ctx = { console: { log(){}, warn(){}, error(){} }, Date, JSON, Math, String, Number, Array, Object, parseInt, parseFloat, isNaN, isFinite };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.global = ctx;
  ctx.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  ctx.SettlementPipeline = { register: () => {} };
  ctx._ebs = []; ctx.addEB = (cat, txt) => ctx._ebs.push(cat + '|' + txt);
  ctx._mems = []; ctx.NpcMemorySystem = { addMemory: (n, ev) => ctx._mems.push(n + '|' + ev) };
  ctx._emits = []; ctx.GameEventBus = { emit: (t) => ctx._emits.push(t), on: () => {} };
  ctx.getTSText = () => ''; ctx.escHtml = (s) => String(s == null ? '' : s);
  ctx.findCharByName = (n) => (ctx.GM.chars || []).find(c => c && c.name === n) || null;
  ctx.GM = { running: true, turn: 40, chars: chars, harem: {}, vars: {}, deptTasks: [], currentIssues: [] };
  ctx.P = { conf: {}, playerInfo: { characterName: '天子' } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-endturn-helpers.js'), 'utf8'), ctx, { filename: 'tm-endturn-helpers.js' });
  return ctx;
}

// ── 有嗣(册立太子·真 resolveHeir)→ 世代传承 ──
var emperor = { id: 'p1', name: '天子', isPlayer: true, faction: '明朝廷', designatedHeirId: '皇长子', childrenIds: ['皇长子'] };
var heir = { id: 'h1', name: '皇长子', alive: true, faction: '明朝廷' };
var c1 = mkCtx([emperor, heir, { name: '权臣', alive: true, faction: '明朝廷', intelligence: 99, valor: 99, loyalty: 99 }]);
var r1 = c1.adjudicatePlayerDeath(emperor, '为乱兵所弑', { kind: 'regicide' });
assert(r1.outcome === 'succession' && r1.heir === '皇长子', '① 有储君被弑→继统续玩(owner 裁定①)');
assert(emperor.isPlayer === false && heir.isPlayer === true, '② isPlayer 转移');
assert(c1.P.playerInfo.characterName === '皇长子', '③ playerInfo 随继位');
assert(!c1.GM._playerDead, '④ 继统不触终局');
assert(c1.GM._successionEvent && c1.GM._successionEvent.from === '天子' && c1.GM._successionEvent.causeKind === 'regicide', '⑤ 继承事件带死因分类');
assert(c1._emits.indexOf('succession') >= 0, '⑥ GameEventBus succession');
assert(c1._mems.some(m => m.indexOf('皇长子|') === 0) && c1._mems.some(m => m.indexOf('权臣|') === 0), '⑦ 新君+群臣记忆');

// ── 无嗣(孤家寡人·真 resolveHeir 返 null)→ 终局 ──
var lonely = { id: 'p2', name: '天子', isPlayer: true };
var c2 = mkCtx([lonely]);
var r2 = c2.adjudicatePlayerDeath(lonely, '崩于乱军之中', { kind: 'battle' });
assert(r2.outcome === 'gameover' && c2.GM._playerDead === true, '⑧ 绝嗣→终局');
assert(c2.GM._playerDeathReason === '崩于乱军之中' && c2.GM._playerDeathKind === 'battle', '⑨ 死因+分类落账(供终局屏/本纪)');

// ── deadReason 覆写(econ 疾→圣躬不豫 映射经此保留) ──
var sick = { id: 'p3', name: '天子', isPlayer: true };
var c3 = mkCtx([sick]);
c3.adjudicatePlayerDeath(sick, '疾', { kind: 'natural', deadReason: '圣躬不豫，医药罔效' });
assert(c3.GM._playerDeathReason === '圣躬不豫，医药罔效', '⑩ deadReason 覆写(终局文案人话化)');

// ── 继承人已死→不传死人·终局 ──
var emp4 = { id: 'p4', name: '天子', isPlayer: true, designatedHeirId: '故太子', childrenIds: ['故太子'] };
var c4 = mkCtx([emp4, { name: '故太子', alive: false, dead: true }]);
var r4 = c4.adjudicatePlayerDeath(emp4, '疾', { kind: 'natural' });
assert(r4.outcome === 'gameover', '⑪ 储君已殁不传死人→终局');

// ── ch 缺失防御 ──
var c5 = mkCtx([]);
assert(c5.adjudicatePlayerDeath(null, 'x', {}).outcome === 'noop' && !c5.GM._playerDead, '⑫ 空入参 noop 不误终局');

// ── 静态契约：两产地皆委托·旧内联镜像已拆 ──
const econ = fs.readFileSync(path.join(ROOT, 'tm-char-economy-engine.js'), 'utf8');
const aid = fs.readFileSync(path.join(ROOT, 'tm-ai-apply-deaths.js'), 'utf8');
assert(econ.indexOf("adjudicatePlayerDeath(ch, cause, { kind: 'natural'") >= 0, '⑬ 自然死产地委托(kind=natural)');
assert(aid.indexOf("adjudicatePlayerDeath(ch, cd.reason, { kind: 'narrative' })") >= 0, '⑭ AI 叙事产地委托(kind=narrative)');
assert(aid.indexOf('_successionEvent') < 0, '⑮ apply-deaths 旧内联传承镜像已拆(单一裁决口)');
const helpers = fs.readFileSync(path.join(ROOT, 'tm-endturn-helpers.js'), 'utf8');
assert((helpers.match(/GM\._playerDead = true/g) || []).length >= 2, '⑯ 终局信号写点收拢在裁决器(含异常回落)');

console.log('smoke-player-death-adjudicator OK — ' + N + ' 断言全绿（继统续玩/绝嗣终局/死因分类/两产地一口）');
