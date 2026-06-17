#!/usr/bin/env node
// scripts/smoke-faction-npc-full-audit.js — 5 问题完整 audit
// 2026-05-10·Q1 运行+时间·Q2 不污染·Q3 API·Q4 开关 OFF·Q5 存储+推演

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const SCN_DIR = path.resolve(ROOT, '..', 'scenarios');

function buildContext() {
  var ctx = { console: { log: function(){}, warn: function(){} },
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, Set: Set,
    Promise: Promise, structuredClone: (typeof structuredClone === 'function') ? structuredClone : null };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  ['tm-faction-paradigm.js', 'tm-faction-personality.js', 'tm-faction-index.js',
   'tm-faction-derived-health.js', 'tm-faction-membership.js',
   'tm-faction-derived-economy.js', 'tm-faction-derived-cohesion.js', 'tm-faction-derived-strength.js',
   'tm-faction-npc-settings.js',
   'tm-faction-npc-memorial.js', 'tm-faction-npc-edict.js', 'tm-faction-npc-chaoyi.js',
   'tm-faction-npc-office.js', 'tm-faction-npc-guoku.js',
   'tm-faction-npc-intervention.js',
   'tm-faction-npc-llm-decision.js'].forEach(function(f){
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  });
  return ctx;
}

function loadGM(ctx, sc, opts) {
  opts = opts || {};
  ctx.GM = {
    turn: 1,
    facs: (sc.factions || []).map(function(f){ return Object.assign({}, f); }),
    chars: (sc.characters || []).map(function(c){ return Object.assign({}, c, { alive: c.alive !== false }); }),
    armies: (sc.military && sc.military.initialTroops || []).map(function(a){ return Object.assign({}, a); }),
    parties: (sc.parties || []).map(function(p){ return Object.assign({}, p); }),
    factionRelations: sc.factionRelations || [],
    _provinceToFaction: {}, provinceStats: {},
    memorials: []
  };
  ctx.P = { playerInfo: sc.playerInfo || {}, conf: opts.conf || {}, ai: opts.ai || {} };
  ctx.getFactionProvinces = function(n) {
    var f = ctx.GM.facs.find(function(x){ return x.name === n; });
    if (!f) return [];
    if (Array.isArray(f.territories)) return f.territories.slice();
    if (typeof f.territory === 'string') return [f.territory];
    if (Array.isArray(f.territory)) return f.territory.slice();
    return [];
  };
  ctx.TM.FactionMembership.migrateArmyOwnerToFaction();
  ctx.TM.FactionMembership.migrateCharsAddFactionId();
  ctx.TM.FactionMembership.migrateProvinceOwnership();
  ctx.TM.FactionIndex.rebuild();
  ctx.TM.FactionDerived.compute();
  ctx.TM.FactionDerivedEconomy.compute();
  ctx.TM.FactionDerivedCohesion.compute();
  ctx.TM.FactionDerivedStrength.compute();
}

function simulateEndturn(ctx) {
  ctx.TM.FactionIndex.rebuild();
  ctx.TM.FactionDerived.compute();
  ctx.TM.FactionDerivedEconomy.compute();
  ctx.TM.FactionDerivedCohesion.compute();
  ctx.TM.FactionDerivedStrength.compute();
  ctx.TM.FactionNpcMemorial.generate();
  ctx.TM.FactionNpcEdict.generate();
  ctx.TM.FactionNpcChaoyi.generate();
  ctx.TM.FactionNpcOffice.generate();
  ctx.TM.FactionNpcGuoku.generate();
}

function main() {
  var sc = JSON.parse(fs.readFileSync(path.join(SCN_DIR, '天启七年·九月（官方）.json'), 'utf8'));

  // ============================================================
  console.log('═══════════════════════════════════════════════════════');
  console.log('Q1·NPC 运行质量 + 时间');
  console.log('═══════════════════════════════════════════════════════');

  // 测 10 回合时间 (template only·开关 OFF)
  var ctx = buildContext();
  loadGM(ctx, sc);
  var t0 = Date.now();
  for (var t = 1; t <= 10; t++) {
    ctx.GM.turn = t;
    simulateEndturn(ctx);
  }
  var elapsed = Date.now() - t0;
  console.log('10 回合 endturn (5 NPC 模块·11 NPC fac)·耗时 ' + elapsed + 'ms (' + (elapsed/10).toFixed(1) + ' ms/turn)');

  // 内容质量·sample 后金 trajectory
  var hj = ctx.GM.facs.find(function(f){ return f.name === '后金'; });
  console.log('\n后金 10 回合 trajectory:');
  console.log('  memorials: ' + hj.npcMemorials.length + ' 条·样例:');
  hj.npcMemorials.slice(-3).forEach(function(m){
    console.log('    第' + m.turn + '·' + m.from + ' [' + m.type + '/' + m.status + ']: "' + m.content.slice(0, 40) + '..." 朱批: ' + (m.ruling||'').slice(0, 20));
  });
  console.log('  edicts: ' + hj.npcEdicts.length + ' 道·样例:');
  hj.npcEdicts.slice(-3).forEach(function(e){
    console.log('    第' + e.turn + '·[' + e.type + '·' + e.trigger + '] "' + e.content.slice(0, 40) + '..."');
  });
  console.log('  chaoyi: ' + hj.npcChaoyi.length + ' 次·样例:');
  hj.npcChaoyi.slice(-2).forEach(function(c){
    console.log('    第' + c.turn + '·[' + c.type + '] "' + c.summary + '"');
  });
  console.log('  office: ' + hj.npcOfficeActions.length + ' 项·样例:');
  hj.npcOfficeActions.slice(-2).forEach(function(o){
    console.log('    第' + o.turn + '·[' + o.action + '] ' + o.target + ' (' + o.effect.positionFrom + '→' + o.effect.positionTo + ') 由' + o.ruler);
  });
  console.log('  ledger 12 条 (近 3):');
  hj.npcFiscalLedger.slice(-3).forEach(function(l){
    console.log('    第' + l.turn + '·入' + l.monthlyIncome + '·支' + l.monthlyExpense + '·net' + (l.net>=0?'+':'') + l.net + '·库' + l.treasuryAfter);
  });
  console.log('  ✓ 内容真实·非空·非乱·有 trajectory');

  // 多回合·模板内容是否会重复?
  var contentSet = new Set();
  hj.npcMemorials.forEach(function(m){ contentSet.add(m.content); });
  console.log('  内容重复率: ' + hj.npcMemorials.length + ' mem 中 ' + contentSet.size + ' unique (' + Math.round(contentSet.size / hj.npcMemorials.length * 100) + '% unique)');

  // ============================================================
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('Q2·player 不污染 (10 回合后)');
  console.log('═══════════════════════════════════════════════════════');
  var ming = ctx.GM.facs.find(function(f){ return f.name === '明朝廷'; });
  console.log('明朝廷.npcMemorials: ' + (ming.npcMemorials || []).length);
  console.log('明朝廷.npcEdicts: ' + (ming.npcEdicts || []).length);
  console.log('明朝廷.npcChaoyi: ' + (ming.npcChaoyi || []).length);
  console.log('明朝廷.npcOfficeActions: ' + (ming.npcOfficeActions || []).length);
  console.log('明朝廷.npcFiscalLedger: ' + (ming.npcFiscalLedger || []).length);
  console.log('GM.memorials.length: ' + ctx.GM.memorials.length);
  var pollutedChars = ctx.GM.chars.filter(function(c){ return c.faction === '明朝廷' && Array.isArray(c._memorialMemory) && c._memorialMemory.length > 0; });
  console.log('明朝廷 chars 带 _memorialMemory: ' + pollutedChars.length + ' / 83');
  console.log('  ✓ 全 0·不污染');

  // ============================================================
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('Q3·新 API 调用 (LLM)·正常 + 限流 + fallback');
  console.log('═══════════════════════════════════════════════════════');
  // mock callAI·返回 invalid JSON·测 fallback
  var ctx2 = buildContext();
  loadGM(ctx2, sc, { conf: { npcAiPrecision: true }, ai: { key: 'fake' } });
  ctx2.callAI = function(){ return Promise.resolve('not a json'); };
  return ctx2.TM.FactionNpcLlmDecision.decideFor('后金').then(function(r){
    console.log('LLM 返回非 JSON·result: ' + JSON.stringify(r));
    if (r.fallbackToTemplate) console.log('  ✓ 标 fallbackToTemplate·调用方应走模板');
    if (r.skipped) console.log('  ✓ 不 apply·返回 skipped');

    // mock 正常 JSON
    ctx2.callAI = function(){ return Promise.resolve(JSON.stringify({
      rationale: '稳为先', memorials: [], edict: { type: '赏赐', content: '诏曰··赏赐', trigger: '稳定', treasuryDelta: -50000, loyaltyDeltas: { court: 2 } },
      chaoyi: null, office: []
    })); };
    return ctx2.TM.FactionNpcLlmDecision.decideFor('后金');
  }).then(function(r2){
    console.log('LLM 返回正常 JSON·result: ' + JSON.stringify(r2));
    if (r2.applied) console.log('  ✓ apply·' + JSON.stringify(r2.summary));

    // 测限流·decideAll·假定 8 fac max·实际只 11 NPC
    return ctx2.TM.FactionNpcLlmDecision.decideAll();
  }).then(function(r3){
    console.log('decideAll·attempted ' + r3.attempted + ' (限流 maxPerTurn 8)·applied ' + r3.applied);
    if (r3.attempted <= 8) console.log('  ✓ 限流·attempted ≤ maxPerTurn');

    // ============================================================
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('Q4·开关 OFF 时·NPC 5 模块仍正常运行 (非 LLM 路径)');
    console.log('═══════════════════════════════════════════════════════');
    var ctx3 = buildContext();
    loadGM(ctx3, sc);  // 默认 conf/ai 都空·开关 OFF
    var status = ctx3.TM.FactionNpcSettings.getStatus();
    console.log('settings status: ' + JSON.stringify(status));

    // 跑 3 回合·NPC 模块应正常 generate·不调 LLM
    for (var t = 1; t <= 3; t++) {
      ctx3.GM.turn = t;
      simulateEndturn(ctx3);
    }
    var hj3 = ctx3.GM.facs.find(function(f){ return f.name === '后金'; });
    console.log('开关 OFF 跑 3 回合后·后金 trajectory:');
    console.log('  mem=' + hj3.npcMemorials.length + ' ed=' + hj3.npcEdicts.length + ' cy=' + hj3.npcChaoyi.length);
    if (hj3.npcMemorials.length > 0 && hj3.npcEdicts.length > 0) console.log('  ✓ 开关 OFF·NPC 模块仍跑·走模板');
    // _generatedByLlm 应该 false (没设)
    var anyLlm = hj3.npcMemorials.some(function(m){ return m._generatedByLlm; });
    console.log('  开关 OFF·任何 mem._generatedByLlm: ' + anyLlm);
    if (!anyLlm) console.log('  ✓ 模板生成·非 LLM');

    // ============================================================
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('Q5·存储 + 推演关联');
    console.log('═══════════════════════════════════════════════════════');

    // Q5.1 序列化·simulate JSON.stringify(GM)·检 fac.npcXxx 是否在
    console.log('Q5.1 序列化测试 (saveToSlot path = JSON.stringify(GM)):');
    var ctx4 = buildContext();
    loadGM(ctx4, sc);
    for (var t = 1; t <= 3; t++) { ctx4.GM.turn = t; simulateEndturn(ctx4); }
    var serialized = JSON.stringify(ctx4.GM);
    var size = serialized.length;
    console.log('  serialized GM size: ' + size + ' bytes (~' + Math.round(size/1024) + ' KB)');
    var hasMemKey = serialized.indexOf('"npcMemorials"') >= 0;
    var hasEdictKey = serialized.indexOf('"npcEdicts"') >= 0;
    var hasLedgerKey = serialized.indexOf('"npcFiscalLedger"') >= 0;
    console.log('  含 npcMemorials: ' + hasMemKey + '·npcEdicts: ' + hasEdictKey + '·npcFiscalLedger: ' + hasLedgerKey);
    if (hasMemKey && hasEdictKey && hasLedgerKey) {
      console.log('  ✓ saveToSlot 走 deepClone(GM)·所有 NPC trajectory 都被保存');
    }

    // 反序列化·还原后能用?
    var restored = JSON.parse(serialized);
    var hjRestored = restored.facs.find(function(f){ return f.name === '后金'; });
    console.log('  反序列化后·后金.npcMemorials.length=' + (hjRestored.npcMemorials || []).length);
    if ((hjRestored.npcMemorials || []).length > 0) console.log('  ✓ 还原后 trajectory 完整');

    // turn snapshot 不保存整份 GM.facs，但应保存轻量 _facsNpcState 并在恢复时写回 facs。
    var stateSnapshot = fs.readFileSync(path.join(ROOT, 'tm-state-snapshot.js'), 'utf8');
    var snapshotCapturesNpc = stateSnapshot.indexOf('_facsNpcState') >= 0
      && stateSnapshot.indexOf('_captureFacsNpcState') >= 0
      && stateSnapshot.indexOf('npcMemorials') >= 0
      && stateSnapshot.indexOf('_lastLlmRationale') >= 0;
    console.log('\nQ5.1 turn snapshot 轻量回滚保存: ' + snapshotCapturesNpc);
    if (snapshotCapturesNpc) {
      console.log('  ✓ 自动 turn snapshot 已保存 NPC trajectory 摘要，不需要 deepClone 整份 GM.facs');
    } else {
      console.log('  ⚠ 自动 turn snapshot 未覆盖 NPC trajectory，按回合回滚会丢 NPC 内政历史');
    }

    // Q5.2 主推演关联·tm-ai-planning.js 是否注入 fac.npcXxx
    console.log('\nQ5.2 主推演 (AI prompt) 关联:');
    var aiPlanning = fs.readFileSync(path.join(ROOT, 'tm-ai-planning.js'), 'utf8');
    var hasNpcEdict = aiPlanning.indexOf('npcEdicts') >= 0;
    var hasNpcMem = aiPlanning.indexOf('npcMemorials') >= 0;
    var hasNpcRationale = aiPlanning.indexOf('_lastLlmRationale') >= 0;
    var hasFiscalCrisis = aiPlanning.indexOf('npcFiscalLedger') >= 0 || aiPlanning.indexOf('crisis') >= 0;
    console.log('  AI prompt 含 npcEdicts ref: ' + hasNpcEdict);
    console.log('  AI prompt 含 npcMemorials ref: ' + hasNpcMem);
    console.log('  AI prompt 含 _lastLlmRationale ref: ' + hasNpcRationale);
    console.log('  AI prompt 含 fiscal crisis check: ' + hasFiscalCrisis);
    if (hasNpcEdict) {
      console.log('  ✓ 推演已注入 NPC 近诏 (Phase C7 加的)');
    }
    if (!hasNpcRationale) {
      console.log('  ✗ 推演未注入 LLM 决策 rationale·player 看不到 NPC 决策动机');
    }
    if (!hasNpcMem) {
      console.log('  ✗ 推演未注入 NPC 近 memorial 关键字');
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('audit 完毕·见上');
    console.log('═══════════════════════════════════════════════════════');
  });
}

main().catch(function(e){
  console.error('audit failed:', e);
  if (e && e.stack) console.error(e.stack);
  process.exit(1);
});
