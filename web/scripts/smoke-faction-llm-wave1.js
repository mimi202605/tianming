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

async function main() {
  playerIntelPresentTest();
  playerIntelOmittedTest();
  await templateFallbackTest();
  coldStartMindModelTest();
  console.log('[smoke-faction-llm-wave1] all pass · ' + PASS + ' assertions');
}

main().catch(function(e) {
  console.error('[smoke-faction-llm-wave1] ' + ((e && e.message) || e));
  if (e && e.stack) console.error(e.stack.split('\n').slice(1, 6).join('\n'));
  process.exit(1);
});
