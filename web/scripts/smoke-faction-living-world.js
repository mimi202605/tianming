#!/usr/bin/env node
// scripts/smoke-faction-living-world.js — 刀F2·势力活世界
//   OFF 矩阵：总闸 GM._factionLivingWorld 默认关 → 全线零行为变更(prompt 无新增段·新动作类型不收·appliers no-op)
//   ON  矩阵：declare_war/join_war 经 CasusBelliSystem 落 activeWars·重复开战被拒·对玩家宣战门槛·(S2)目标修剪·(S3)事件化
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

let PASS = 0;
function assert(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); PASS++; }

function buildContext() {
  const ctx = { console: { log: function(){}, warn: function(){}, error: function(){} },
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, Set: Set,
    Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  ['tm-agent-flags.js',
   'tm-faction-paradigm.js', 'tm-faction-personality.js', 'tm-faction-index.js',
   'tm-faction-derived-health.js', 'tm-faction-membership.js',
   'tm-faction-derived-economy.js', 'tm-faction-derived-cohesion.js', 'tm-faction-derived-strength.js',
   'tm-faction-npc-settings.js', 'tm-qiju-ledger.js', 'tm-faction-npc-news-bridge.js',
   'tm-faction-diplomacy.js', 'tm-faction-goal-stack.js',
   'tm-faction-action-engine.js',
   'tm-faction-npc-memorial.js', 'tm-faction-npc-edict.js', 'tm-faction-npc-chaoyi.js',
   'tm-faction-npc-office.js', 'tm-faction-npc-guoku.js',
   'tm-faction-npc-llm-decision.js'].forEach(function(f){
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  });
  return ctx;
}

// 忠实镜像 tm-feudal-warfare.js:257 CasusBelliSystem.declareWar 契约(停战/重复双向查/落 activeWars/{success,war})
function installCasusBelli(ctx) {
  ctx.CasusBelliSystem = {
    _calls: [],
    declareWar: function(attacker, defender, cbId) {
      ctx.CasusBelliSystem._calls.push({ attacker: attacker, defender: defender, cbId: cbId });
      var G = ctx.GM; if (!G.activeWars) G.activeWars = [];
      var exist = G.activeWars.find(function(w){ return (w.attacker===attacker&&w.defender===defender)||(w.attacker===defender&&w.defender===attacker); });
      if (exist) return { success: false, message: '已在交战中' };
      var war = { id: 'w' + (G.activeWars.length + 1), attacker: attacker, defender: defender, casusBelli: cbId, casusBelliName: cbId, startTurn: G.turn, warScore: 0, truceMonths: 12, _viaCasusBelli: true };
      G.activeWars.push(war);
      return { success: true, war: war };
    }
  };
}

function baseGM(ctx, opts) {
  opts = opts || {};
  ctx.P = { playerInfo: { factionName: '玩家朝廷' }, conf: { npcAiPrecision: true }, ai: { key: 'fake' } };
  ctx.GM = {
    turn: 5,
    facs: [ { name: '甲势力', treasury: { money: 100000 } }, { name: '乙势力', treasury: { money: 100000 } }, { name: '玩家朝廷', isPlayer: true } ],
    chars: [],
    _facIndex: { '甲势力': { chars: [], parties: {}, metrics: {} }, '乙势力': { chars: [], parties: {}, metrics: {} } },
    activeWars: [], factionRelations: []
  };
  if (opts.livingWorld) ctx.GM._factionLivingWorld = true;
}

function mkDecision(actions) { return { rationale: '测·因果·Phase 1·X (cause: y)。', memorials: [], edict: null, chaoyi: null, office: [], actions: actions }; }

// ─────────────── OFF 矩阵：零行为变更 ───────────────
function offZeroChangeTest() {
  const ctx = buildContext();
  installCasusBelli(ctx);
  baseGM(ctx);   // 默认 OFF
  const eng = ctx.TM.FactionActionEngine;
  const fld = ctx.TM.FactionNpcLlmDecision;

  assert(eng.livingWorldOn() === false, 'living world defaults OFF');
  assert(ctx.agentFlagOn('factionAgentEnabled') === false, 'OFF: factionAgentEnabled not brought on');
  assert(ctx.agentFlagOn('factionGoalStackEnabled') === false, 'OFF: factionGoalStackEnabled not brought on');

  // 契约 prompt·OFF 不列 living-world 类型
  const contractOff = eng.formatActionContractForPrompt({ maxChars: 4000 });
  assert(contractOff.indexOf('declare_war') < 0 && contractOff.indexOf('join_war') < 0, 'OFF: ACTION_CONTRACT must not advertise declare_war/join_war');

  // validateDecision·OFF 丢弃 living-world 动作(等同 F1：非法类型被过滤)
  const vOff = eng.validateDecision(mkDecision([{ type: 'declare_war', targetFaction: '乙势力' }, { type: 'edict', edictType: '安抚', type_x: 1 }]));
  assert(vOff.actions.filter(function(a){ return a.type === 'declare_war'; }).length === 0, 'OFF: validateDecision drops declare_war');

  // applyDecision·OFF：declare_war no-op·activeWars 不变·CasusBelli 未被调用
  const facA = ctx.GM.facs[0];
  const sumOff = eng.applyDecision(facA, mkDecision([{ type: 'declare_war', targetFaction: '乙势力' }]), { turn: 5 });
  assert(!sumOff.wars, 'OFF: no war applied');
  assert(ctx.GM.activeWars.length === 0, 'OFF: activeWars untouched');
  assert(ctx.CasusBelliSystem._calls.length === 0, 'OFF: CasusBelliSystem.declareWar never called');

  // buildPrompt·OFF：无 living-world / agent 段
  const pOff = fld._buildPrompt(facA);
  const combOff = pOff.system + '\n' + pOff.user;
  assert(combOff.indexOf('declare_war') < 0, 'OFF: prompt has no declare_war token');
  assert(combOff.indexOf('[ACTIVE_GOALS]') < 0 && combOff.indexOf('[INCOMING_PROPOSALS]') < 0, 'OFF: prompt has no goal-stack / diplomacy sections');
  return combOff;
}

// OFF idempotent + ON adds (逐字节：OFF 两次一致；ON 仅新增)
function offOnDiffTest() {
  const ctx = buildContext();
  installCasusBelli(ctx);
  baseGM(ctx);
  const fld = ctx.TM.FactionNpcLlmDecision;
  const facA = ctx.GM.facs[0];

  const off1 = (function(p){ return p.system + '\n' + p.user; })(fld._buildPrompt(facA));
  ctx.GM._factionLivingWorld = true;
  const on1 = (function(p){ return p.system + '\n' + p.user; })(fld._buildPrompt(facA));
  ctx.GM._factionLivingWorld = false;
  const off2 = (function(p){ return p.system + '\n' + p.user; })(fld._buildPrompt(facA));

  assert(off1 === off2, 'OFF prompt is byte-identical before and after toggling ON (zero residue)');
  assert(on1 !== off1, 'ON prompt differs from OFF (feature adds content)');
  assert(on1.length > off1.length && on1.indexOf('declare_war') >= 0, 'ON prompt is a superset that adds declare_war contract');
  assert(off1.indexOf('declare_war') < 0, 'OFF prompt never mentions declare_war');
}

// ─────────────── ON 矩阵：真战争接线 ───────────────
function onDeclareWarTest() {
  const ctx = buildContext();
  installCasusBelli(ctx);
  baseGM(ctx, { livingWorld: true });
  const eng = ctx.TM.FactionActionEngine;

  assert(ctx.agentFlagOn('factionAgentEnabled') === true, 'ON: master brings on factionAgentEnabled');

  const contractOn = eng.formatActionContractForPrompt({ maxChars: 4000 });
  assert(contractOn.indexOf('declare_war') >= 0 && contractOn.indexOf('join_war') >= 0, 'ON: ACTION_CONTRACT advertises declare_war/join_war');

  const facA = ctx.GM.facs[0];
  const sum = eng.applyDecision(facA, mkDecision([{ type: 'declare_war', targetFaction: '乙势力', casusBelli: 'border' }]), { turn: 5 });
  assert(sum.wars === 1, 'ON: declare_war applied');
  assert(ctx.CasusBelliSystem._calls.length === 1 && ctx.CasusBelliSystem._calls[0].attacker === '甲势力' && ctx.CasusBelliSystem._calls[0].defender === '乙势力', 'ON: routed through CasusBelliSystem.declareWar (not self-written)');
  const war = ctx.GM.activeWars.find(function(w){ return w.attacker === '甲势力' && w.defender === '乙势力'; });
  assert(war && war._viaCasusBelli === true, 'ON: activeWars entry created BY CasusBelliSystem (bears its marker)');

  // 重复开战被拒
  const sum2 = eng.applyDecision(facA, mkDecision([{ type: 'declare_war', targetFaction: '乙势力', casusBelli: 'border' }]), { turn: 5 });
  assert(!sum2.wars, 'ON: duplicate war declaration rejected');
  assert(ctx.GM.activeWars.filter(function(w){ return (w.attacker==='甲势力'&&w.defender==='乙势力'); }).length === 1, 'ON: no duplicate war record');
}

// 对玩家宣战门槛：关系不够恶 or 无正当 CB → 拦；够恶+正当 CB → 放行
function onPlayerWarThresholdTest() {
  const ctx = buildContext();
  installCasusBelli(ctx);
  baseGM(ctx, { livingWorld: true });
  const eng = ctx.TM.FactionActionEngine;
  const facA = ctx.GM.facs[0];

  // 关系中立(0) → 拦
  let sum = eng.applyDecision(facA, mkDecision([{ type: 'declare_war', targetFaction: '玩家朝廷', casusBelli: 'subjugation' }]), { turn: 5 });
  assert(!sum.wars && ctx.CasusBelliSystem._calls.length === 0, 'player-war blocked when relation not hostile enough');

  // 关系够恶(-60) 但 CB=none → 拦
  ctx.GM.factionRelations = [{ from: '甲势力', to: '玩家朝廷', value: -60 }];
  sum = eng.applyDecision(facA, mkDecision([{ type: 'declare_war', targetFaction: '玩家朝廷', casusBelli: 'none' }]), { turn: 6 });
  assert(!sum.wars, 'player-war blocked when casus belli is none even if hostile');

  // 关系够恶(-60) + 正当 CB → 放行
  sum = eng.applyDecision(facA, mkDecision([{ type: 'declare_war', targetFaction: '玩家朝廷', casusBelli: 'claim' }]), { turn: 7 });
  assert(sum.wars === 1 && ctx.GM.activeWars.some(function(w){ return w.defender === '玩家朝廷'; }), 'player-war allowed with hostility + legitimate casus belli');
}

// join_war：须有涉及目标的进行中战争(=加入)·否则拒
function onJoinWarTest() {
  const ctx = buildContext();
  installCasusBelli(ctx);
  baseGM(ctx, { livingWorld: true });
  const eng = ctx.TM.FactionActionEngine;
  const facA = ctx.GM.facs[0];

  // 无进行中战争涉乙 → join 被拒
  let sum = eng.applyDecision(facA, mkDecision([{ type: 'join_war', targetFaction: '乙势力', casusBelli: 'holy' }]), { turn: 5 });
  assert(!sum.wars, 'join_war rejected when target is not in any ongoing war');

  // 造一场 玩家朝廷 vs 乙势力 的战争，甲参战攻乙 → 放行
  ctx.GM.activeWars.push({ id: 'w0', attacker: '玩家朝廷', defender: '乙势力', casusBelli: 'border', startTurn: 4 });
  sum = eng.applyDecision(facA, mkDecision([{ type: 'join_war', targetFaction: '乙势力', casusBelli: 'holy' }]), { turn: 6 });
  assert(sum.wars === 1, 'join_war applied when target is in an ongoing war');
  assert(ctx.CasusBelliSystem._calls.some(function(c){ return c.attacker === '甲势力' && c.defender === '乙势力'; }), 'join_war routes through CasusBelliSystem too');
}

function main() {
  offZeroChangeTest();
  offOnDiffTest();
  onDeclareWarTest();
  onPlayerWarThresholdTest();
  onJoinWarTest();
  console.log('[smoke-faction-living-world] all pass · ' + PASS + ' assertions');
}

try { main(); } catch (e) {
  console.error('[smoke-faction-living-world] ' + ((e && e.message) || e));
  if (e && e.stack) console.error(e.stack.split('\n').slice(1, 6).join('\n'));
  process.exit(1);
}
