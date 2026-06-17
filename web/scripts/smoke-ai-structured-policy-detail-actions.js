#!/usr/bin/env node
// smoke-ai-structured-policy-detail-actions.js - AI structured outputs must cover detailed policy player paths.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error('[assert] ' + msg);
}

function runFile(ctx, file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

function buildContext() {
  const calls = [];
  const ctx = {
    console: { log(){}, warn(){}, info(){}, error(){}, debug(){} },
    Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp,
    isFinite, isNaN, parseInt, parseFloat, Promise, Symbol, Map, Set,
    setTimeout: () => 0,
    clearTimeout: () => {},
    Error, TypeError, RangeError,
    __edictCalls: calls
  };
  ctx.window = ctx;
  ctx.global = ctx;
  ctx.globalThis = ctx;
  ctx.GM = {
    turn: 61,
    _turnReport: [],
    chars: [],
    facs: [{ name: 'player', isPlayer: true, treasury: { money: 1000 } }],
    parties: [],
    classes: [],
    armies: [],
    items: [],
    regions: [],
    guoku: { money: 50000, grain: 30000 },
    neitang: { money: 20000 },
    population: { hiddenCount: 0, byLegalStatus: {}, byRegion: {} }
  };
  ctx.P = { playerInfo: { factionName: 'player' }, conf: {}, time: { year: 1627 } };
  ctx.TM = { errors: { capture(){}, captureSilent(){} } };
  ctx.EdictParser = {
    tryExecute(text, params, meta) {
      calls.push({ text: String(text || ''), params: params || {}, meta: meta || {} });
      return { ok: true, pathway: 'direct', classification: { typeKey: meta && meta.expectedType || 'smoke' } };
    }
  };
  ctx.escHtml = (s) => String(s || '');
  ctx.getTSText = (t) => 'T' + t;
  ctx.addEB = () => {};
  vm.createContext(ctx);
  return ctx;
}

function callByAction(calls, action) {
  return calls.find(c => c.params && c.params.action === action);
}

(function main() {
  const ctx = buildContext();
  runFile(ctx, 'tm-ai-change-pathutils.js');
  runFile(ctx, 'tm-ai-change-army.js');
  runFile(ctx, 'tm-ai-change-narrative.js');
  runFile(ctx, 'tm-ai-change-applier.js');

  const result = ctx.AIChangeApplier.applyAITurnChanges({
    currency_adjustments: [
      { action: 'full_currency_reform', presetId: 'silver_standard', amount: 600000 },
      { action: 'regional_acceptance', paperId: 'baochao', regionId: 'jiangnan', acceptanceDelta: 0.22 },
      { action: 'overseas_silver_flow', sourceRegionId: 'fujian', targetRegionId: 'jiangnan', amount: 880000 }
    ],
    population_adjustments: [
      { action: 'start_large_corvee', presetId: 'grand_canal_repair', amount: 42000 },
      { action: 'conscription', system: 'mubing', regionId: 'shaanxi', amount: 12000 },
      { action: 'migration_settlement', sourceRegionId: 'shaanxi', targetRegionId: 'jiangnan', amount: 6000 }
    ],
    central_local_actions: [
      { action: 'fiscal_bargain', regionId: 'jiangnan', retainedShare: 0.45 },
      { action: 'long_term_tracking', regionId: 'jiangnan', horizonTurns: 72 }
    ],
    environment_actions: [
      { action: 'migration_relief', region: 'jiangnan', policyId: 'migration_relief' },
      { action: 'tech_investment', region: 'jiangnan', policyId: 'tech_investment' },
      { action: 'disaster_recovery', region: 'jiangnan', policyId: 'disaster_recovery' }
    ]
  });

  assert(result && result.ok, 'applyAITurnChanges should return ok');
  assert(ctx.__edictCalls.length === 11, 'detailed structured policy fields should execute eleven EdictParser calls, got ' + ctx.__edictCalls.length);

  assert(callByAction(ctx.__edictCalls, 'full_currency_reform').params.presetId === 'silver_standard', 'currency reform should preserve presetId');
  assert(callByAction(ctx.__edictCalls, 'regional_acceptance').params.paperId === 'baochao', 'regional acceptance should preserve paperId');
  assert(callByAction(ctx.__edictCalls, 'regional_acceptance').params.acceptanceDelta === 0.22, 'regional acceptance should preserve acceptanceDelta');
  assert(callByAction(ctx.__edictCalls, 'overseas_silver_flow').params.sourceRegionId === 'fujian', 'overseas silver flow should preserve sourceRegionId');
  assert(callByAction(ctx.__edictCalls, 'overseas_silver_flow').params.targetRegionId === 'jiangnan', 'overseas silver flow should preserve targetRegionId');

  assert(callByAction(ctx.__edictCalls, 'start_large_corvee').params.presetId === 'grand_canal_repair', 'large corvee should preserve presetId');
  assert(callByAction(ctx.__edictCalls, 'conscription').params.system === 'mubing', 'conscription should preserve system');
  assert(callByAction(ctx.__edictCalls, 'conscription').params.regionId === 'shaanxi', 'conscription should preserve regionId');
  assert(callByAction(ctx.__edictCalls, 'migration_settlement').params.sourceRegionId === 'shaanxi', 'migration settlement should preserve sourceRegionId');
  assert(callByAction(ctx.__edictCalls, 'migration_settlement').params.targetRegionId === 'jiangnan', 'migration settlement should preserve targetRegionId');

  assert(callByAction(ctx.__edictCalls, 'fiscal_bargain').params.retainedShare === 0.45, 'fiscal bargain should preserve retainedShare');
  assert(callByAction(ctx.__edictCalls, 'long_term_tracking').params.horizonTurns === 72, 'long-term tracking should preserve horizonTurns');
  assert(callByAction(ctx.__edictCalls, 'migration_relief').params.policyId === 'migration_relief', 'migration relief should preserve policyId');
  assert(callByAction(ctx.__edictCalls, 'tech_investment').params.policyId === 'tech_investment', 'tech investment should preserve policyId');
  assert(callByAction(ctx.__edictCalls, 'disaster_recovery').params.policyId === 'disaster_recovery', 'disaster recovery should preserve policyId');

  assert(ctx.GM._aiStructuredPolicyActions.length === 11, 'GM should audit all detailed structured policy actions');
  assert(result.applied.semantic.ai_policy_actions === 11, 'applied semantic count should include all detailed policy actions');

  console.log('[smoke-ai-structured-policy-detail-actions] PASS AI structured policy detail actions');
})();
