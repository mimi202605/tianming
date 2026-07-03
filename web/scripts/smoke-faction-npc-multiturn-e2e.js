#!/usr/bin/env node
// scripts/smoke-faction-npc-multiturn-e2e.js
// Multi-turn e2e: simulate 5 turns with mocked LLM, assert qijuHistory has NPC events
// from multiple factions at expected rate. Catches "all plumbing wired but no actual
// NPC events visible to player" regressions.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function runFile(ctx, file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

function makeCtx() {
  const timers = [];
  const ctx = {
    console: { log() {}, warn() {}, info() {}, error() {} },
    Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp,
    isFinite, parseInt, parseFloat, Promise, setImmediate,
    setTimeout(fn, delay) {
      const id = { fn, delay, cleared: false };
      timers.push(id);
      return id;
    },
    clearTimeout(id) { if (id) id.cleared = true; }
  };
  ctx.window = ctx;
  ctx.global = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  return { ctx, timers };
}

async function flushTimers(timers) {
  // Fire every uncleared scheduled timer in order, then await microtask drain.
  const snapshot = timers.slice();
  for (const t of snapshot) {
    if (!t.cleared) {
      try { await t.fn(); } catch (e) {}
    }
  }
  await new Promise(resolve => setImmediate(resolve));
}

async function main() {
  const { ctx, timers } = makeCtx();

  runFile(ctx, 'tm-faction-npc-settings.js');
  runFile(ctx, 'tm-qiju-ledger.js');   // 起居注已收口走写口(2026-07-04)·沙箱须与运行时同形态
  runFile(ctx, 'tm-faction-npc-news-bridge.js');
  runFile(ctx, 'tm-faction-npc-in-turn-driver.js');
  runFile(ctx, 'tm-faction-npc-dispatcher.js');

  ctx.P = {
    playerInfo: { factionName: '明朝廷' },
    conf: {
      npcAiPrecision: true,
      npcAiPrecisionMode: 'eager',
      npcAiPrecisionMaxPerTurn: 2,
      npcInTurnMaxPerTurn: 4,
      npcInTurnFirstDelayMs: 10,
      npcInTurnRepeatDelayMs: 20
    },
    ai: { key: 'fake-key' }
  };

  // Mock NPC LLM decision: every call returns an applied decision so qiju bridge fires.
  const decisionCalls = [];
  ctx.TM.FactionNpcLlmDecision = {
    async decideFor(name, opts) {
      decisionCalls.push({ name, source: opts && opts.source, turn: opts && opts.turn });
      // Push a synthetic news entry as the real decision module would via news bridge.
      const fac = (ctx.GM.facs || []).find(f => f.name === name);
      if (fac) {
        ctx.TM.FactionNpcNewsBridge.pushEdict(fac, {
          issuer: name + '·主君',
          type: '催征',
          content: '令所部加征军饷以备秋防'
        });
      }
      return { applied: true, rationale: name + ' 措置', appliedActions: 1, attempted: 1 };
    },
    async decideAll(opts) {
      const results = [];
      for (const fac of (ctx.GM.facs || [])) {
        if (fac.name === '明朝廷') continue;
        const r = await this.decideFor(fac.name, opts);
        results.push({ fac: fac.name, result: r });
      }
      return { applied: results.length, attempted: results.length, results };
    },
    hasRunThisTurn() { return false; },
    countRunsThisTurn() { return 0; }
  };

  // Mock action engine ranking — always returns positive scores so NPCs get picked.
  ctx.TM.FactionActionEngine = {
    scoreFactionCandidate(f) {
      return { score: (f.derivedStrength && f.derivedStrength.value) || 50, reasons: ['strength-fallback'] };
    }
  };

  // 5-faction fixture: 1 player + 4 NPCs
  ctx.GM = {
    turn: 1,
    facs: [
      { name: '明朝廷', isPlayer: true, derivedStrength: { value: 95 } },
      { name: '后金',     derivedStrength: { value: 80 }, npcEdicts: [] },
      { name: '察哈尔',   derivedStrength: { value: 40 }, npcEdicts: [] },
      { name: '朝鲜',     derivedStrength: { value: 35 }, npcEdicts: [] },
      { name: '葡萄牙·澳门', derivedStrength: { value: 25 }, npcEdicts: [] }
    ],
    qijuHistory: []
  };

  // ── Run 5 turns ──
  const TURNS = 5;
  let perTurnReport = [];
  for (let turn = 1; turn <= TURNS; turn++) {
    ctx.GM.turn = turn;
    timers.length = 0; // reset scheduled timers each turn

    // Simulate render-finalize: dispatcher schedules eager + in-turn jobs
    const sched = ctx.TM.FactionNpcDispatchQueue.scheduleTurnRuns({ turn, eagerDelayMs: 1 });
    assert(sched.scheduled > 0, `turn ${turn} should schedule at least one job·got ${sched.scheduled}`);

    // Fire all scheduled timers (eager batch + 4 in-turn picks)
    await flushTimers(timers);

    const turnEvents = ctx.GM.qijuHistory.filter(e => e.turn === turn);
    perTurnReport.push({ turn, scheduled: sched.scheduled, events: turnEvents.length });
  }

  // ── Assertions ──
  const totalQiju = ctx.GM.qijuHistory.length;
  const npcSourced = ctx.GM.qijuHistory.filter(e => e._source === 'npc-bridge' || e._source === 'npc-in-turn-llm');
  const npcRatio = npcSourced.length / Math.max(1, totalQiju);
  const npcFacsHit = new Set(npcSourced.map(e => e._facName).filter(Boolean));
  const playerEvents = ctx.GM.qijuHistory.filter(e => e._facName === '明朝廷');

  assert(totalQiju >= TURNS, `expected ≥ ${TURNS} qiju entries over ${TURNS} turns·got ${totalQiju}`);
  assert(npcRatio >= 0.5, `NPC event ratio should be ≥ 0.5 when precision is on·got ${(npcRatio * 100).toFixed(0)}%·${npcSourced.length}/${totalQiju}`);
  assert(npcFacsHit.size >= 2, `should hit ≥ 2 distinct NPC factions over ${TURNS} turns·got ${npcFacsHit.size}: ${[...npcFacsHit].join(',')}`);
  assert(playerEvents.length === 0, `player faction must never appear as NPC-sourced qiju·got ${playerEvents.length}`);
  assert(decisionCalls.length >= TURNS, `LLM decideFor should fire ≥ ${TURNS} times·got ${decisionCalls.length}`);

  // Dispatcher ledger should have per-turn stats
  const lastLedger = ctx.GM._npcFactionLlmDispatchLedger;
  assert(lastLedger && lastLedger.turn === TURNS, 'dispatch ledger should track last turn');
  assert(lastLedger.stats && (lastLedger.stats.applied + lastLedger.stats.noAction + lastLedger.stats.partial) >= 1,
    `dispatch ledger should record at least one completed job in turn ${TURNS}·got ${JSON.stringify(lastLedger.stats)}`);

  // setSpeed helper
  const speedRet = ctx.TM.FactionNpcInTurnDriver.setSpeed('dev');
  assert(speedRet.ok && ctx.P.conf.npcInTurnFirstDelayMs === 1000 && ctx.P.conf.npcInTurnRepeatDelayMs === 3000,
    'setSpeed(dev) should write 1s/3s to P.conf');
  const bad = ctx.TM.FactionNpcInTurnDriver.setSpeed('bogus');
  assert(!bad.ok && Array.isArray(bad.available), 'setSpeed should reject unknown preset and list available');

  console.log('[smoke-faction-npc-multiturn-e2e] all assertions pass');
  console.log('  turns:', TURNS, '· qiju total:', totalQiju, '· NPC sourced:', npcSourced.length,
              '· NPC ratio:', (npcRatio * 100).toFixed(0) + '%',
              '· distinct NPC facs hit:', npcFacsHit.size,
              '· LLM calls:', decisionCalls.length);
  console.log('  per-turn:', JSON.stringify(perTurnReport));
}

main().catch(function(e) {
  console.error('[smoke-faction-npc-multiturn-e2e] failed:', e && e.stack || e);
  process.exit(1);
});
