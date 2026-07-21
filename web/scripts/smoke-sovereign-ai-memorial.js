#!/usr/bin/env node
// scripts/smoke-sovereign-ai-memorial.js — Phase 3·Task 9 批奏 smoke
// 验证：5 选 1 状态映射 + 批语 + loyaltyDelta + 奉旨卡片反馈
//   路径 1: NPC 上奏 approved → adjustCharacterLoyalty +3·无奉旨卡片
//   路径 2: 玩家上奏 rejected → 不动玩家忠诚·推送奉旨卡片到 P.playerInfo._sovereignAINotices
//   路径 3: hold → 状态 pending_review（同 _holdMemorial 模式）

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

function buildContext() {
  var ctx = {
    console: { log: function(){}, warn: function(){} },
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, Set: Set,
    Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  ctx.TM = { Transmigration: { isTransmigrationMode: function(){ return true; }, getSovereignName: function(){ return '测试帝'; } } };
  vm.createContext(ctx);
  // tm-memorials.js 定义 _sovereignAIReplyMemorial + _stageMemorialDecision + _memMarkIllegalPresenter
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-memorials.js'), 'utf8'), ctx, { filename: 'tm-memorials.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-sovereign-ai.js'), 'utf8'), ctx, { filename: 'tm-sovereign-ai.js' });
  return ctx;
}

function npcMemorialApprovedTest(ctx) {
  var loyaltyCalls = [];
  var npc = { name: '李大臣', alive: true, isPlayer: false, loyalty: 50, officialTitle: '尚书' };
  ctx.findCharByName = function(name) {
    if (name === '李大臣') return npc;
    return null;
  };
  ctx.adjustCharacterLoyalty = function(ch, delta, reason, opts) {
    loyaltyCalls.push({ name: ch.name, delta: delta, reason: reason, opts: opts });
  };

  ctx.GM = { turn: 3, memorials: [], _approvedMemorials: [] };
  ctx.P = { playerInfo: { playerRole: 'minister', sovereignName: '测试帝' } };

  var m = {
    id: 'm1', from: '李大臣', status: 'pending', _playerSubmitted: false,
    content: '臣以为当修水利以利农桑', type: '政务'
  };
  var d = { memorialId: 'm1', from: '李大臣', decision: 'approved', ruling: '所奏准奏', loyaltyDelta: 3, reason: '水利当兴' };

  var r = ctx._sovereignAIReplyMemorial(m, d);
  assert(r.ok === true, 'npc approved: ok');
  assert(r.action === 'approved', 'npc approved: action');
  assert(r.loyaltyDelta === 3, 'npc approved: loyaltyDelta');
  assert(m.status === 'approved', 'npc approved: memorial.status');
  assert(m.reply === '所奏准奏', 'npc approved: memorial.reply');
  assert(loyaltyCalls.length === 1, 'npc approved: adjustCharacterLoyalty called once');
  assert(loyaltyCalls[0].delta === 3, 'npc approved: loyalty delta = 3');
  assert(loyaltyCalls[0].name === '李大臣', 'npc approved: loyalty target name');
  // NPC 上奏·不推奉旨卡片
  assert(!ctx.P.playerInfo._sovereignAINotices || ctx.P.playerInfo._sovereignAINotices.length === 0,
         'npc approved: no 奉旨 card (NPC 上奏不推卡片)');
}

function playerMemorialRejectedTest(ctx) {
  var loyaltyCalls = [];
  var player = { name: '玩家角色', alive: true, isPlayer: true, loyalty: 70, officialTitle: '侍郎' };
  ctx.findCharByName = function(name) {
    if (name === '玩家角色') return player;
    return null;
  };
  ctx.adjustCharacterLoyalty = function(ch, delta, reason, opts) {
    loyaltyCalls.push({ name: ch.name, delta: delta });
  };
  // 穿越模式下玩家即臣工·其上奏非"非法 presenter"·跳过 _memMarkIllegalPresenter 检查
  // （该检查为普通模式设计·普通模式下玩家=君主·不会上奏自己）
  ctx._memMarkIllegalPresenter = function() { return false; };

  ctx.GM = { turn: 3, memorials: [], _approvedMemorials: [] };
  ctx.P = { playerInfo: { playerRole: 'minister', sovereignName: '测试帝', characterName: '玩家角色' } };

  var m = {
    id: 'm2', from: '玩家角色', status: 'pending', _playerSubmitted: true,
    content: '请罢冗员以节国用', type: '政务'
  };
  var d = { memorialId: 'm2', from: '玩家角色', decision: 'rejected', ruling: '所奏不妥', loyaltyDelta: -2, reason: '时机未至' };

  var r = ctx._sovereignAIReplyMemorial(m, d);
  assert(r.ok === true, 'player rejected: ok');
  assert(r.action === 'rejected', 'player rejected: action');
  assert(m.status === 'rejected', 'player rejected: memorial.status');
  assert(m.reply === '所奏不妥', 'player rejected: memorial.reply');
  // 玩家上奏·不动玩家自己的忠诚
  assert(loyaltyCalls.length === 0, 'player rejected: NO loyalty change on player');
  // 奉旨卡片推送
  assert(Array.isArray(ctx.P.playerInfo._sovereignAINotices), 'player rejected: _sovereignAINotices array exists');
  assert(ctx.P.playerInfo._sovereignAINotices.length === 1, 'player rejected: 1 奉旨 card');
  var notice = ctx.P.playerInfo._sovereignAINotices[0];
  assert(notice.decision === 'rejected', 'player rejected: notice.decision');
  assert(notice.msg.indexOf('【奉旨】') === 0, 'player rejected: notice.msg 奉旨 prefix');
  assert(notice.msg.indexOf('所奏驳回') !== -1, 'player rejected: notice.msg 含"所奏驳回"');
  assert(notice.msg.indexOf('朱批') !== -1, 'player rejected: notice.msg 含"朱批"');
}

function holdTest(ctx) {
  ctx.findCharByName = function() { return null; };
  ctx.adjustCharacterLoyalty = function() {};
  ctx.GM = { turn: 3, memorials: [], _approvedMemorials: [] };
  ctx.P = { playerInfo: { playerRole: 'minister', sovereignName: '测试帝' } };

  var m = {
    id: 'm3', from: '王侍郎', status: 'pending', _playerSubmitted: false,
    content: '请立太子', type: '国本'
  };
  var d = { memorialId: 'm3', decision: 'hold', ruling: '留中再议', loyaltyDelta: 0, reason: '暂不发落' };

  var r = ctx._sovereignAIReplyMemorial(m, d);
  assert(r.ok === true, 'hold: ok');
  assert(r.action === 'pending_review', 'hold: action mapped to pending_review');
  assert(m.status === 'pending_review', 'hold: memorial.status = pending_review (同 _holdMemorial 模式)');
  assert(m.reply === '留中再议', 'hold: memorial.reply');
}

function runTurnSyncOrchestrationTest(ctx) {
  // 验证 tm-sovereign-ai.js 的 _applyMemorialDecisions 编排路径调到 _sovereignAIReplyMemorial
  var npc = { name: '赵将军', alive: true, isPlayer: false, loyalty: 60 };
  ctx.findCharByName = function(n) { return n === '赵将军' ? npc : null; };
  var loyaltyCalls = [];
  ctx.adjustCharacterLoyalty = function(ch, d) { loyaltyCalls.push({ n: ch.name, d: d }); };

  var m = { id: 'm4', from: '赵将军', status: 'pending', _playerSubmitted: false, content: '请增兵北边', type: '军务' };
  ctx.GM = { turn: 8, memorials: [m], _approvedMemorials: [] };
  ctx.P = { playerInfo: { playerRole: 'minister', sovereignName: '测试帝' } };

  var aiOutput = {
    rationale: '北边有警·宜增兵。',
    edicts: [],
    chaoyiSpeeches: [],
    memorialDecisions: [{ memorialId: 'm4', from: '赵将军', decision: 'approved', ruling: '准增兵三千', loyaltyDelta: 4, reason: '边警' }],
    officeActions: []
  };

  var r = ctx.TM.SovereignAI.runTurnSync(ctx.GM, {}, aiOutput);
  assert(r.ok === true, 'orchestration: ok');
  assert(r.memorials.applied === 1, 'orchestration: 1 memorial applied');
  assert(m.status === 'approved', 'orchestration: memorial.status = approved');
  assert(loyaltyCalls.length === 1, 'orchestration: adjustCharacterLoyalty called');
  assert(loyaltyCalls[0].d === 4, 'orchestration: loyalty delta = 4');
}

try {
  var ctx = buildContext();
  npcMemorialApprovedTest(ctx);
  playerMemorialRejectedTest(ctx);
  holdTest(ctx);
  runTurnSyncOrchestrationTest(ctx);
  console.log('[smoke-sovereign-ai-memorial] PASS · 4 sub-tests · 批答生成 + 忠诚度更新 + 奉旨卡片 + 编排路径');
  process.exit(0);
} catch (e) {
  console.error('[smoke-sovereign-ai-memorial] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
