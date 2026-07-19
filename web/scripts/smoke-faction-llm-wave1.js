#!/usr/bin/env node
// scripts/smoke-faction-llm-wave1.js — 势力 LLM 推演·第一刀三件套 smoke
//   Slice 1·PLAYER_INTEL 结构化玩家动态段(有对玩家战争→段含战争行·无内容→段省略)
//   Slice 2·落地率兜底(解析失败→template-fallback 产 >=1 动作走正常 apply)+ turn 级聚合计数
//   Slice 3·心智模型冷启动(aiStrategy 空 + 剧本 profile 在→段非空含「据剧本推定」)
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
  ['tm-faction-paradigm.js', 'tm-faction-personality.js', 'tm-faction-index.js',
   'tm-faction-derived-health.js', 'tm-faction-membership.js',
   'tm-faction-derived-economy.js', 'tm-faction-derived-cohesion.js', 'tm-faction-derived-strength.js',
   'tm-faction-npc-settings.js', 'tm-qiju-ledger.js', 'tm-faction-npc-news-bridge.js',
   'tm-faction-action-engine.js',
   'tm-faction-npc-memorial.js', 'tm-faction-npc-edict.js', 'tm-faction-npc-chaoyi.js',
   'tm-faction-npc-office.js', 'tm-faction-npc-guoku.js',
   'tm-faction-npc-llm-decision.js'].forEach(function(f){
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  });
  return ctx;
}

// ── Slice 1·PLAYER_INTEL 段：有对玩家的战争/近战 → 段出现且含战争行 ──
function playerIntelPresentTest() {
  const ctx = buildContext();
  ctx.P = { playerInfo: { factionName: '玩家朝廷' }, conf: { npcAiPrecision: true }, ai: { key: 'fake' } };
  const npc = { name: '测试后金', treasury: { money: 200000 } };
  ctx.GM = {
    turn: 5,
    facs: [npc, { name: '玩家朝廷', isPlayer: true }],
    chars: [],
    _facIndex: { '测试后金': { chars: [], parties: {}, metrics: {} } },
    activeWars: [{ name: '边境战事', sides: ['测试后金', '玩家朝廷'], status: '僵持', frontline: '辽西' }],
    battleHistory: [{ turn: 4, attackerFaction: '玩家朝廷', defenderFaction: '测试后金', attacker: '玩家朝廷', defender: '测试后金', winner: '玩家朝廷', attackerLoss: 100, defenderLoss: 500 }],
    _playerDirectives: [{ id: 'd1', content: '密令诸将窥测测试后金虚实', type: 'setting', turn: 5 }]
  };
  const prompts = ctx.TM.FactionNpcLlmDecision._buildPrompt(npc);
  const combined = prompts.system + '\n' + prompts.user;
  assert(combined.indexOf('[PLAYER_INTEL]') >= 0, 'PLAYER_INTEL section should appear when player wars/battles exist');
  assert(combined.indexOf('与君上') >= 0 && combined.indexOf('边境战事') >= 0, 'PLAYER_INTEL should carry the player-war line with war name');
  assert(combined.indexOf('近战') >= 0, 'PLAYER_INTEL should carry a recent battle line involving both sides');
  assert(combined.indexOf('密令诸将窥测测试后金') >= 0, 'PLAYER_INTEL should surface player directives naming this faction');
}

// ── Slice 1·反例：无任何玩家动态 → PLAYER_INTEL 段省略 ──
function playerIntelOmittedTest() {
  const ctx = buildContext();
  ctx.P = { playerInfo: { factionName: '玩家朝廷' }, conf: { npcAiPrecision: true }, ai: { key: 'fake' } };
  const npc = { name: '孤立势力', treasury: { money: 200000 } };
  ctx.GM = {
    turn: 5,
    facs: [npc, { name: '玩家朝廷', isPlayer: true }],
    chars: [],
    _facIndex: { '孤立势力': { chars: [], parties: {}, metrics: {} } },
    activeWars: [], battleHistory: [], _playerDirectives: [], playerDecisions: []
  };
  const prompts = ctx.TM.FactionNpcLlmDecision._buildPrompt(npc);
  const combined = prompts.system + '\n' + prompts.user;
  assert(combined.indexOf('[PLAYER_INTEL]') < 0, 'PLAYER_INTEL section should be omitted entirely when there is no player-directed content');
}

// ── Slice 2·解析失败 → template-fallback 产 >=1 动作走正常 apply ──
async function templateFallbackTest() {
  const ctx = buildContext();
  ctx.P = { playerInfo: { factionName: '玩家朝廷' }, ai: { key: 'fake' },
    conf: { npcAiPrecision: true, npcAiPrecisionRetryAttempts: 1, npcAiPrecisionMaxTokens: 2000 } };
  const npc = { name: '兜底势力', treasury: { money: 5000 }, derivedStrength: { value: 20 }, derivedEconomy: { fiscalStress: 75, netFlow: -800 } };
  ctx.GM = { turn: 12, facs: [npc, { name: '玩家朝廷', isPlayer: true }], chars: [], qijuHistory: [],
    _facIndex: { '兜底势力': { chars: [], parties: {}, metrics: {} } } };
  ctx.callAI = function() { return Promise.resolve('这不是 JSON·纯废话输出'); };

  const ret = await ctx.TM.FactionNpcLlmDecision.decideFor('兜底势力', { source: 'manual', turn: 12, maxAttempts: 1 });
  assert(ret && ret.applied === true && ret.templateFallback === true, 'parse failure should be rescued by template fallback, not skip the whole turn');
  assert(ret.summary && ret.summary.actions >= 1, 'template fallback should apply at least one conservative action through the normal applyDecision pipeline');
  assert(ret.summary._source === 'template-fallback', 'fallback summary should be tagged _source=template-fallback');
  const fbRow = (npc._npcLlmActionLedger || []).find(function(r){ return r && r._source === 'template-fallback'; });
  assert(fbRow && fbRow.status === 'applied', 'fallback action ledger row should be applied and tagged _source=template-fallback');
  const run = ctx.GM._npcFactionLlmLedger.runs['兜底势力'];
  assert(run && run.status === 'applied' && run.templateFallback === true && run.parseFailed === true, 'rescued run should be applied + flag templateFallback + parseFailed');
  assert(run.parseFailure && run.parseFailure.kind, 'rescued run should preserve the parse failure kind for observability');

  // Slice 2·turn 级聚合计数
  const status = ctx.TM.FactionNpcLlmDecision.getGlobalNpcLlmStatus();
  assert(status.turnAggregate && status.turnAggregate.templateFallback >= 1, 'turnAggregate should count templateFallback');
  assert(status.turnAggregate.parseFail >= 1, 'turnAggregate should count parseFail');
  assert(status.turnAggregate.applied >= 1, 'turnAggregate should count applied runs');
}

// ── Slice 3·心智模型冷启动：对手 aiStrategy 空 + 剧本 profile 在 → 段非空含「据剧本推定」 ──
function coldStartMindModelTest() {
  const ctx = buildContext();
  ctx.P = { playerInfo: { factionName: '玩家朝廷' }, conf: { npcAiPrecision: true }, ai: { key: 'fake' } };
  // 决策方有 aiStrategy(把对手列入 threats 使其入选)·对手无 aiStrategy 但有剧本 profile
  const decider = { name: '甲势力', treasury: { money: 100000 }, aiStrategy: { threats: ['乙势力'] } };
  const opponent = { name: '乙势力', treasury: { money: 100000 },
    goal: '恢复旧疆', strategy: '联弱抗强·先取河北', openingProblems: ['粮饷不足', '将帅不和'], personality: '刚愎' };
  ctx.GM = {
    turn: 8,
    facs: [decider, opponent, { name: '玩家朝廷', isPlayer: true }],
    chars: [],
    _facIndex: { '甲势力': { chars: [], parties: {}, metrics: {} }, '乙势力': { chars: [], parties: {}, metrics: {} } },
    factionRelations: [{ from: '甲势力', to: '乙势力', type: '敌对', value: -70 }],
    activeWars: []
  };
  const prompts = ctx.TM.FactionNpcLlmDecision._buildPrompt(decider);
  const combined = prompts.system + '\n' + prompts.user;
  assert(combined.indexOf('[OPPONENT_MIND_MODEL]') >= 0, 'OPPONENT_MIND_MODEL should appear for a threat-listed opponent');
  assert(combined.indexOf('据剧本推定') >= 0, 'cold-start opponent (no aiStrategy) should be annotated 据剧本推定');
  assert(combined.indexOf('恢复旧疆') >= 0, 'cold-start opponent mind model should fall back to scenario profile goal');
  assert(combined.indexOf('posture≈') >= 0, 'cold-start mind model should infer a posture (敌对/戒备/亲善/观望)');
  assert(combined.indexOf('posture≈戒备') >= 0 || combined.indexOf('posture≈敌对') >= 0, 'hostile relation should infer 戒备/敌对 posture');
}

// ── 返工 S2·跨回合护栏：连续两回合解析失败，第二回合不落重复动作 + 兜底零副作用 ──
async function fallbackCooldownTest() {
  const ctx = buildContext();
  ctx.P = { playerInfo: { factionName: '玩家朝廷' }, ai: { key: 'fake' },
    conf: { npcAiPrecision: true, npcAiPrecisionRetryAttempts: 1, npcAiPrecisionMaxTokens: 2000 } };
  const npc = { name: '连败势力', treasury: { money: 5000 }, derivedStrength: { value: 20 }, derivedEconomy: { fiscalStress: 75, netFlow: -800 } };
  ctx.GM = { turn: 1, facs: [npc, { name: '玩家朝廷', isPlayer: true }], chars: [], qijuHistory: [],
    _facIndex: { '连败势力': { chars: [], parties: {}, metrics: {} } } };
  ctx.callAI = function() { return Promise.resolve('废话·非 JSON'); };

  const t1 = await ctx.TM.FactionNpcLlmDecision.decideFor('连败势力', { source: 'manual', turn: 1, maxAttempts: 1 });
  assert(t1 && t1.applied && t1.templateFallback === true, 'T1 parse failure should be rescued by fallback');
  assert(Array.isArray(npc.npcEdicts) && npc.npcEdicts.length === 1, 'T1 fallback should record exactly one edict');
  const eff = npc.npcEdicts[0].effects.loyaltyDeltas || {};
  assert(!eff.court && !eff.general && !eff.clan, 'fallback edict must carry zero loyalty deltas (no 薅忠诚)');

  ctx.GM.turn = 2;
  const t2 = await ctx.TM.FactionNpcLlmDecision.decideFor('连败势力', { source: 'manual', turn: 2, maxAttempts: 1 });
  assert(t2 && t2.skipped && !t2.applied, 'T2 identical fallback should be cooled down (silent, not re-applied)');
  assert(npc.npcEdicts.length === 1, 'T2 must NOT append a duplicate fallback edict (no per-turn 刷公告)');
}

// ── 返工 S1·短名 substring 假情报：fac.name='明' 不得被「黎明」命中，仅「明军」类组合命中 ──
function shortNameGuardTest() {
  const ctx = buildContext();
  ctx.P = { playerInfo: { factionName: '玩家朝廷' }, conf: { npcAiPrecision: true }, ai: { key: 'fake' } };
  const npc = { name: '明', treasury: { money: 100000 } };
  const base = function(dirs) { return { turn: 5, facs: [npc, { name: '玩家朝廷', isPlayer: true }], chars: [],
    _facIndex: { '明': { chars: [], parties: {}, metrics: {} } }, activeWars: [], battleHistory: [], _playerDirectives: dirs, playerDecisions: [] }; };

  ctx.GM = base([{ id: 'd1', content: '黎明时整饬京营，操练士卒', type: 'setting', turn: 5 }]);
  let combined = ((p) => p.system + '\n' + p.user)(ctx.TM.FactionNpcLlmDecision._buildPrompt(npc));
  assert(combined.indexOf('君上近令涉本势力') < 0, '「黎明」must NOT falsely match single-char faction 「明」(substring 假情报)');

  ctx.GM = base([{ id: 'd2', content: '着诸镇备边御明军来犯', type: 'setting', turn: 5 }]);
  combined = ((p) => p.system + '\n' + p.user)(ctx.TM.FactionNpcLlmDecision._buildPrompt(npc));
  assert(combined.indexOf('君上近令涉本势力') >= 0 && combined.indexOf('明军') >= 0, '「明军」(名+限定字) should legitimately match single-char faction 「明」');
}

// ── 返工 S1·battleHistory shape：结构化 battleResult 只写 winner/loser，须以 winner/loser 产行、不伪造攻守 ──
function battleShapeTest() {
  const ctx = buildContext();
  ctx.P = { playerInfo: { factionName: '玩家朝廷' }, conf: { npcAiPrecision: true }, ai: { key: 'fake' } };
  const npc = { name: '结构势力', treasury: { money: 100000 } };
  ctx.GM = { turn: 6, facs: [npc, { name: '玩家朝廷', isPlayer: true }], chars: [],
    _facIndex: { '结构势力': { chars: [], parties: {}, metrics: {} } }, activeWars: [],
    // Shape A（tm-military.js:978 真实生产者形态）：只有 winner/loser，无 attacker*/defender*
    battleHistory: [{ battleId: 'b1', turn: 5, structured: true, verdict: 'structured', winner: '玩家朝廷', loser: '结构势力', attackerLoss: 0, defenderLoss: 0 }] };
  let combined = ((p) => p.system + '\n' + p.user)(ctx.TM.FactionNpcLlmDecision._buildPrompt(npc));
  const lineA = combined.split('\n').find(function(l){ return l.indexOf('近战') >= 0; });
  assert(lineA && lineA.indexOf('胜玩家朝廷') >= 0, 'shape-A battle should produce a line judged by winner/loser');
  assert(lineA.indexOf('攻') < 0 && lineA.indexOf('我损') < 0, 'shape-A (no attacker/defender) must NOT fabricate attack direction or unmappable losses');

  // Shape B（tm-military.js:1297 引擎战形态）：有 attackerFaction/defenderFaction → 补方向与可归属损失
  ctx.GM.battleHistory = [{ turn: 5, attackerFaction: '玩家朝廷', defenderFaction: '结构势力', winner: '玩家朝廷', loser: '结构势力', attackerLoss: 80, defenderLoss: 400 }];
  combined = ((p) => p.system + '\n' + p.user)(ctx.TM.FactionNpcLlmDecision._buildPrompt(npc));
  const lineB = combined.split('\n').find(function(l){ return l.indexOf('近战') >= 0; });
  assert(lineB && lineB.indexOf('玩家朝廷攻结构势力') >= 0, 'shape-B should show attack direction from attacker/defender factions');
  assert(lineB.indexOf('我损400/敌损80') >= 0, 'shape-B should map losses to this faction correctly (defender=self → 我损=defenderLoss)');

  // Shape C·canonical 僵持（tm-military.js:1283 真实生产者：winner===loser==='僵持' + verdict='僵持'）·不得伪报「胜僵持」
  ctx.GM.battleHistory = [{ turn: 5, attackerFaction: '玩家朝廷', defenderFaction: '结构势力', winner: '僵持', loser: '僵持', verdict: '僵持', attackerLoss: 200, defenderLoss: 220 }];
  combined = ((p) => p.system + '\n' + p.user)(ctx.TM.FactionNpcLlmDecision._buildPrompt(npc));
  const lineC = combined.split('\n').find(function(l){ return l.indexOf('近战') >= 0; });
  assert(lineC && lineC.indexOf('僵持') >= 0 && lineC.indexOf('胜') < 0, 'canonical stalemate must render ·僵持, never fabricate 胜僵持/胜果');
  assert(lineC.indexOf('我损220/敌损200') >= 0, 'stalemate should still show mapped losses (defender=self → 我损=defenderLoss)');
}

async function main() {
  playerIntelPresentTest();
  playerIntelOmittedTest();
  await templateFallbackTest();
  coldStartMindModelTest();
  await fallbackCooldownTest();
  shortNameGuardTest();
  battleShapeTest();
  console.log('[smoke-faction-llm-wave1] all pass · ' + PASS + ' assertions');
}

main().catch(function(e) {
  console.error('[smoke-faction-llm-wave1] ' + ((e && e.message) || e));
  if (e && e.stack) console.error(e.stack.split('\n').slice(1, 6).join('\n'));
  process.exit(1);
});
