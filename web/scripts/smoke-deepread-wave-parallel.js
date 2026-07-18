#!/usr/bin/env node
/* eslint-env node */
// smoke: 深读波次并行（issue #6①·2026-07-12）
// 只装载 tm-ai-planning.js 进轻量 vm 沙箱（不拉整页脚本链·CI 无资产可跑），验：
//   ① 27 次调用全部完成·digest 落 GM._aiScenarioDigest
//   ② 波间屏障：波1(17) 全部先于波2(2)·波2 先于波3(5)·波3 先于波4(3)
//   ③ 并发：conf=4 时有真并行(峰值 2..4)·conf=1 时严格串行(峰值 1)
//   ④ _call 单次重试：首击非 200 的块重试后仍成活·总请求数 = 27 + 失败次数
//   ⑤ 进度按完成计数报真值（出现 27/27）

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'tm-ai-planning.js'), 'utf8');

function assert(cond, msg) { if (!cond) throw new Error('ASSERT: ' + msg); }

// 每次调用的首个 JSON 键 → 波次（与 tm-ai-planning.js 波表镜像·改波次分组须同步这里）
const WAVE_BY_MARKER = {
  era_essence: 1, character_web: 1, faction_balance: 1, world_atmosphere: 1,
  bureaucratic_state: 1, regional_strengths: 1, military_assessment: 1,
  event_priorities: 1, character_profiles: 1, tech_strategy: 1, province_assessment: 1,
  real_social_conditions: 1, historical_anecdotes: 1, sensory_details: 1,
  folk_customs: 1, imperial_address: 1, court_etiquette: 1,
  master_digest: 2, court_procedure: 2,
  missed_relationships: 3, strategic_blind_spots: 3, economic_time_bombs: 3,
  narrative_gaps: 3, real_political_events: 3,
  world_branches: 4, npc_decision_logic: 4, macro_trajectory: 4
};
const MARKERS = Object.keys(WAVE_BY_MARKER);

function classify(userMsg) {
  // 只看最后一个「返回JSON」之后的输出合同段——请求体前部会拼进上一波结果的
  // JSON.stringify（带引号含全部键名），按全文匹配必误判（r10 会被当成波1）。
  const at = userMsg.lastIndexOf('返回JSON');
  const contract = at >= 0 ? userMsg.slice(at) : userMsg;
  for (const m of MARKERS) {
    if (contract.indexOf('"' + m + '"') >= 0) return m;
  }
  return null;
}

function buildSandbox(opts) {
  const state = {
    seq: [],            // 按发起顺序的 marker 列表
    inFlight: 0,
    maxInFlight: 0,
    fetchCount: 0,
    failedOnce: new Set(),
    loadingMsgs: []
  };
  const sandbox = {
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    AbortController: AbortController,
    P: {
      ai: { key: 'mock-key', url: 'http://mock.local/v1', model: 'mock-model' },
      conf: { aiDeepReadConcurrency: opts.concurrency },
      playerInfo: { factionName: '朝廷', characterBio: '测试出身', characterPersonality: '沉毅', factionGoal: '中兴' },
      time: { year: 1627 },
      keju: { enabled: false }
    },
    GM: {
      sid: 'sc-smoke-wave',
      turn: 1,
      chars: [
        { name: '甲大臣', title: '尚书', loyalty: 80, ambition: 40, intelligence: 70, personality: '刚直', bio: '老臣', faction: '朝廷', party: '甲党', alive: true },
        { name: '乙将军', title: '总兵', loyalty: 30, ambition: 85, intelligence: 60, personality: '骄悍', bio: '边将', faction: '朝廷', party: '乙党', alive: true },
        { name: '丙皇帝', title: '皇帝', loyalty: 100, ambition: 50, intelligence: 65, isPlayer: true, alive: true }
      ],
      facs: [{ name: '朝廷', desc: '中枢' }, { name: '虏部', desc: '外患' }],
      vars: { treasury: 100, minxin: 50 },
      officeTree: [],
      provinces: [],
      _varFormulas: null
    },
    showLoading: function (msg) { state.loadingMsgs.push(String(msg || '')); },
    hideLoading: function () {},
    _dbg: function () {},
    _computeOfficeHash: function () { return 'hash-mock'; },
    findScenarioById: function (sid) {
      return sid === 'sc-smoke-wave' ? {
        id: 'sc-smoke-wave', era: '测试朝', overview: '烟测世界概述', openingText: '开篇', globalRules: '规则一',
        goals: [], events: [], timeline: []
      } : null;
    },
    fetch: function (url, init) {
      state.fetchCount++;
      const body = JSON.parse(init.body);
      const userMsg = String((body.messages && body.messages[1] && body.messages[1].content) || '');
      const marker = classify(userMsg);
      // ④ 指定块首击 500·验重试
      if (opts.failMarker && marker === opts.failMarker && !state.failedOnce.has(marker)) {
        state.failedOnce.add(marker);
        return Promise.resolve({ ok: false, status: 500, json: function () { return Promise.resolve({}); } });
      }
      if (marker) state.seq.push(marker);
      state.inFlight++;
      state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
      return new Promise(function (resolve) {
        setTimeout(function () {
          state.inFlight--;
          const payload = {};
          MARKERS.forEach(function (m) { payload[m] = 'mock-' + m; });
          resolve({
            ok: true, status: 200,
            json: function () {
              return Promise.resolve({ choices: [{ message: { content: JSON.stringify(payload) } }] });
            }
          });
        }, 5);
      });
    }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  return { sandbox: vm.createContext(sandbox), state: state };
}

async function runDeepRead(opts) {
  const built = buildSandbox(opts);
  vm.runInContext(SRC, built.sandbox, { filename: 'tm-ai-planning.js', displayErrors: true, timeout: 20000 });
  const fn = vm.runInContext('aiDeepReadScenario', built.sandbox);
  assert(typeof fn === 'function', 'aiDeepReadScenario 未定义');
  await fn();
  return built;
}

(async function main() {
  // ── 场景 A：并发 4 · 一块首击失败 ──
  const A = await runDeepRead({ concurrency: 4, failMarker: 'sensory_details' });
  const sa = A.state;
  assert(sa.seq.length === 27, 'A: 27 次成功调用·实得 ' + sa.seq.length);
  assert(sa.fetchCount === 28, 'A: 总请求 27+1 重试 = 28·实得 ' + sa.fetchCount);
  assert(sa.failedOnce.has('sensory_details'), 'A: 指定块经历过失败');
  // 波间屏障：任一 marker 的序号不得早于前一波的任何 marker
  const waveOf = (m) => WAVE_BY_MARKER[m];
  let maxSeenWaveEnd = { 1: -1, 2: -1, 3: -1, 4: -1 };
  sa.seq.forEach(function (m, i) { maxSeenWaveEnd[waveOf(m)] = Math.max(maxSeenWaveEnd[waveOf(m)], i); });
  let minSeenWaveStart = { 1: 999, 2: 999, 3: 999, 4: 999 };
  sa.seq.forEach(function (m, i) { minSeenWaveStart[waveOf(m)] = Math.min(minSeenWaveStart[waveOf(m)], i); });
  assert(maxSeenWaveEnd[1] < minSeenWaveStart[2], '波1 全部先于波2');
  assert(maxSeenWaveEnd[2] < minSeenWaveStart[3], '波2 全部先于波3');
  assert(maxSeenWaveEnd[3] < minSeenWaveStart[4], '波3 全部先于波4');
  assert(sa.seq.filter(function (m) { return waveOf(m) === 1; }).length === 17, '波1 共 17 项');
  assert(sa.maxInFlight >= 2 && sa.maxInFlight <= 4, 'A: 并发峰值 2..4·实得 ' + sa.maxInFlight);
  // digest 落库
  const digestA = vm.runInContext('GM._aiScenarioDigest', A.sandbox);
  assert(digestA && digestA.masterDigest === 'mock-master_digest', 'A: masterDigest 落库');
  assert(digestA.eraEssence === 'mock-era_essence', 'A: eraEssence 落库');
  assert(digestA.sensoryDetails === 'mock-sensory_details', 'A: 重试块字段成活');
  assert(digestA.generatedAt === 1, 'A: generatedAt=turn');
  // ⑤ 真实进度出现 27/27
  assert(sa.loadingMsgs.some(function (s) { return s.indexOf('27/27') >= 0; }), 'A: 进度出现 27/27');

  // ── 场景 B：conf=1 严格串行 ──
  const B = await runDeepRead({ concurrency: 1, failMarker: null });
  assert(B.state.maxInFlight === 1, 'B: 串行峰值=1·实得 ' + B.state.maxInFlight);
  assert(B.state.seq.length === 27 && B.state.fetchCount === 27, 'B: 27 调用零重试');

  console.log('smoke-deepread-wave-parallel OK — 27调用/四波屏障/并发4峰值' + A.state.maxInFlight + '/串行1/重试成活/27斜27真进度 全绿');
})().catch(function (e) {
  console.error('FAIL:', e && e.stack || e);
  process.exit(1);
});
