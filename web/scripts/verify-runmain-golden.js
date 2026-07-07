#!/usr/bin/env node
'use strict';
// ============================================================
// verify-runmain-golden — runMain stub 回归网（ai暖身刀 2026-07-06·金样基准）
//
// 目的：在拆 runMain 各 stage 之前，先给它拉一张「真值面金样网」——
//   vm-sandbox 按 index.html 真实序装载全 bundle（复用 headless-smoke 的 makeStubs/
//   parseIndexHtmlScripts·同 verify-live-playthrough 的 factory 法），mock ctx +
//   canned GM/P，stub 掉 ctx.subcalls._callEndturnAI（缝在 ns.setupInfra 包装层——
//   runMain 内部 L515 会重调 setupInfra 覆盖 ctx.subcalls，故必须包 ns 层），
//   按 subcall id 回罐装 fixture，同时录制每次调用的 id + 完整 prompt + 调用序。
//
// 金样面（arch-baselines/runmain-golden.json）：
//   · callOrder            — 子调用序（并行段做组内排序归一：见下）
//   · calls[seq:id]        — model/temperature/max_tokens/response_format + system/user
//                            prompt 全串 + sha256（tp1 等价面命门）
//   · results              — ctx.results.sc0/sc05/sc1/sc1q/sc1b/sc1c/sc1d + followup.p1Summary
//   · turnAiResults        — GM._turnAiResults 快照
//   · metaErrors/afterSc1Calls
//   volatile 字段（at/ms/ts/latencyMs·GM._subcallTimings·ctx.meta.timing）一律剥除。
//
// 并行段比对策略：runMain 有两处 Promise 并行屏障——sc0+sc1q（§2）与 sc1d/sc1b/sc1c
//   （sc1 wrapper 内三 IIFE·创建序 sc1d→sc1b→sc1c）。同一屏障内完成序不定，
//   故 callOrder 比对前对屏障组内的连续段做字典序归一（集合比对），组间序仍严格。
//
// _aiDepth 档位（P.conf.aiCallDepth·本网钉 'standard'）对 runMain 子调用 gate 的影响：
//   lite(0)     → 跳过 sc0/sc05（minDepth standard）·只跑 sc1q/sc1/sc1b/sc1c/sc1d
//   standard(1) → runMain 全 7 调用都跑（sc16/17/18/sc28 等 full-only 在 followup·非本网）
//   full(2)     → runMain 面与 standard 相同
//
// 用法：
//   node scripts/verify-runmain-golden.js            # 与金样比对·不一致 FAIL exit 1
//   node scripts/verify-runmain-golden.js --update   # 重采金样（会先做双跑确定性自检）
//   金样缺失时首跑=自动采基（同 --update）。
// ============================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const BASELINE = path.join(__dirname, 'arch-baselines', 'runmain-golden.json');
const UPDATE = process.argv.includes('--update');
const sha256 = s => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');

// ── 复用 headless-smoke 的 harness（同 verify-live-playthrough 的 factory 法）──
let hsSrc = fs.readFileSync(path.join(__dirname, 'headless-smoke.js'), 'utf8');
hsSrc = hsSrc.replace(/^#!.*\n/, '').replace(/'use strict';/, '').replace(/main\(\);\s*$/, '');
const factory = new Function('require', '__dirname', hsSrc + '\nreturn { makeStubs, parseIndexHtmlScripts };');
const { makeStubs, parseIndexHtmlScripts } = factory(require, __dirname);

// ── 罐装 fixture（按 subcall id）──
// sc1 fixture 须过 _hasSc1StructuredResult：heavy≥1 且 hit≥3（heavy=events/resource_changes/
// char_updates 等实体账字段·light=turn_summary/player_status 等浅文本）——此处 3 heavy + 全套史记字段。
const FIXTURES = {
  sc0: {
    tensions: '北疆虏骑窥边·江南水患未平·国库度支渐紧·清流与勋贵相轧·东宫未定人心浮动',
    consequences: '减赋令下·江南民心可收·然岁入短三十万贯·度支司必有争执',
    npc_spotlight: '张丞相锐意奉行减赋·李将军请增边饷·二人于廷前必起争论',
    faction_dynamics: '北虏秋高马肥·有南下劫掠之势·其酋新立·欲以兵威服众',
    family_dynamics: '后宫安靖·无大变',
    class_unrest: '江南农户闻减赋而喜·市井商贾观望',
    economic_pressure: '岁入将短·边饷又增·度支两难',
    foreshadow: '虏酋新立必犯边·减赋岁入缺口三回合后显·张李之争渐成党争',
    mood: '外弛内张·山雨欲来',
    memoryQueries: []
  },
  sc1q: {
    dialogue_commitments: [{
      npc: '张丞相', task: '督办江南减赋一成并核实各州落地', category: 'finance', deadline: '3回合内',
      source_type: '问对', source_conv_id: '5-张丞相-问对', willingness: 0.85, player_emphasis: '明命',
      required_npc_action: '张丞相行文江南各州减赋并回奏'
    }],
    collective_resolutions: [],
    npc_dialogue_intent: [{ npc: '张丞相', mood: 'sincere', subtext: '愿以实绩固相位', next_likely_move: '遣属吏核江南税册' }],
    required_sc1_actions: ['张丞相督办江南减赋并回奏']
  },
  sc05: {
    causal_chains: '江南水患→圩田修缮→今岁减赋·一脉相承·民力渐苏',
    unresolved: '北虏新酋动向未明·减赋后岁入缺口如何弥补尚无着落',
    patterns: '玩家连续两回合施仁政于江南·仁政取向渐显',
    player_impact: '江南民心积累上行·然武备投入偏低·边防隐忧',
    npc_memories: '张丞相记玩家纳其减赋之谏·感遇日深',
    momentum: '若无干预·北虏秋后犯边·江南民心继续回暖'
  },
  sc1: {
    turn_summary: '帝纳丞相之谏·诏减江南赋税一成·江南民心稍安·北虏窥边未动',
    shizhengji_basis: '减赋诏下·张丞相领旨督办·行文江南各州·度支司核岁入将短三十万贯·边镇奏虏骑游弋',
    shilu_text: '五年春·诏减江南田赋十之一·命丞相张氏督之·北虏游骑见于边墙外·守将严备',
    szj_title: '减赋安民·虏骑窥边',
    shizhengji: '是岁春·上以江南水患初平·诏减田赋一成·丞相张氏奉诏惟谨·行文各州·吏民相庆·而度支岁入将短·边镇又奏虏骑游弋·廷议渐有增饷之请',
    szj_summary: '减赋令行·民心向附·然岁入之缺与边防之费·将为后患',
    player_status: '忧边事而慰民心',
    player_inner: '减赋易·补缺难·北虏若动·钱粮安出',
    events: [{ type: '政务', title: '减赋诏行', text: '江南田赋减一成·各州奉行·民心稍安', turn: 5 }],
    resource_changes: { 国库: -30 },
    char_updates: [{ name: '张丞相', loyalty_delta: 2, reason: '谏言被纳·奉诏督办' }],
    edict_feedback: [{ edict: '减江南赋税一成', status: 'executing', feedback: '张丞相行文江南各州·首季落地过半' }],
    npc_actions: [{ name: '张丞相', action: '行文江南各州督减赋', target: '江南各州', result: '首季落地过半', behaviorType: '奉公', publicReason: '奉诏行事', privateMotiv: '以实绩固相位' }],
    dialogue_commitment_feedback: [{ npc: '张丞相', task: '督办江南减赋一成并核实各州落地', progress: 60, status: 'executing' }],
    character_deaths: [], personnel_changes: [], fiscal_adjustments: [], suggestions: []
  },
  sc1b: {
    cultural_works: [],
    npc_letters: [],
    npc_correspondence: [],
    npc_interactions: [{ actor: '李将军', target: '张丞相', description: '过相府议边备粮饷·不欢而散', type: '私访' }]
  },
  sc1c: {
    faction_events: [{ actor: '北虏', target: '', action: '游骑沿边墙窥探虚实', actionType: '军事', result: '边镇戒严·未接战', strength_effect: 0 }],
    faction_ai_outcomes: [],
    faction_interactions_advanced: [],
    faction_relation_changes: [],
    faction_succession: [],
    npc_schemes: [],
    hidden_moves: [],
    scheme_actions: [],
    fengwen_snippets: []
  },
  sc1d: {
    shilu_text: '五年春正月·诏减江南田赋十之一·丞相张氏督之·虏骑见于边外·诏诸镇严备',
    szj_title: '减赋纪要',
    shizhengji: '春·减江南赋诏行·丞相督办·各州奉行过半·边镇奏虏骑游弋·增饷之议起于廷中',
    szj_summary: '仁政安内·边警未弭',
    zhengwen: '后人论曰·五年之减赋·所以收江南之心也·然虏患方兴而岁入自削·识者忧之',
    basis_refs: []
  },
  // 防御性 fixture：正常金样跑不该命中——一旦命中·callOrder 变化会让比对直接 FAIL 暴露回归
  sc1_rescue: { turn_summary: '(rescue·不应出现)', events: [], char_updates: [], resource_changes: {} },
  sc1_inc_retry: { turn_summary: '(inc-retry·不应出现)' }
};

// ── volatile 剥除 + 函数占位的深归一 ──
// createdAt/traceId：GM._turnAiResults.memoryTrace 携 Date.now 时间戳与 ts36 拼接 id（双跑自检实测抓获）
const VOLATILE_KEYS = { at: 1, ms: 1, ts: 1, latencyMs: 1, createdAt: 1, traceId: 1 };
function normalize(v, depth) {
  if (depth > 24) return '[depth-cap]';
  if (typeof v === 'function') return '[fn]';
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(x => normalize(x, (depth || 0) + 1));
  const out = {};
  Object.keys(v).sort().forEach(k => {
    if (VOLATILE_KEYS[k]) return;
    out[k] = normalize(v[k], (depth || 0) + 1);
  });
  return out;
}
function stableStringify(v) { return JSON.stringify(normalize(v, 0), null, 1); }

// ── 并行段归一：屏障组内连续段按字典序 ──
const PARALLEL_GROUPS = [['sc0', 'sc1q'], ['sc1d', 'sc1b', 'sc1c']];
function normalizeOrder(order) {
  const groupOf = id => { for (let g = 0; g < PARALLEL_GROUPS.length; g++) if (PARALLEL_GROUPS[g].indexOf(id) >= 0) return g; return -1; };
  const out = order.slice();
  let i = 0;
  while (i < out.length) {
    const g = groupOf(out[i]);
    if (g < 0) { i++; continue; }
    let j = i;
    while (j < out.length && groupOf(out[j]) === g) j++;
    const seg = out.slice(i, j).sort();
    for (let k = i; k < j; k++) out[k] = seg[k - i];
    i = j;
  }
  return out;
}

function msgContent(c) {
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map(p => (p && p.text) || '').join('');
  return String(c == null ? '' : c);
}

// ── 单次完整场景跑（装载→canned 世界→stub→runMain→采集）──
async function runScenario(tag) {
  const { win } = makeStubs();
  const sandbox = vm.createContext(win);

  // 确定性：sandbox 内 Math.random 换种子 LCG（scheme id/骰子等全钉死）
  new vm.Script(
    'Math.random = (function(){ var s = 42; return function(){ s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();',
    { filename: 'det-random.js' }
  ).runInContext(sandbox);

  const scripts = parseIndexHtmlScripts();
  const loadErrors = [];
  for (const src of scripts) {
    const abs = path.join(ROOT, src);
    if (!fs.existsSync(abs)) { loadErrors.push(src + ' [missing]'); continue; }
    try { new vm.Script(fs.readFileSync(abs, 'utf8'), { filename: src }).runInContext(sandbox, { timeout: 20000 }); }
    catch (e) { loadErrors.push(src + ' :: ' + (e && e.message)); }
  }
  if (loadErrors.length) throw new Error(tag + ' bundle 装载失败 ' + loadErrors.length + ' 处: ' + loadErrors.slice(0, 3).join(' | '));

  // ── canned P（merge 覆盖·不整体替换·保留 bundle 初始化的其余设置）──
  if (!sandbox.P || typeof sandbox.P !== 'object') sandbox.P = {};
  const P = sandbox.P;
  P.ai = { key: 'sk-golden-test', url: 'https://golden.invalid/v1', model: 'gpt-4o', temp: 0.7, openaiStrict: false, stream_sc1: false };
  P.conf = Object.assign({}, P.conf || {}, {
    aiCallDepth: 'standard', maxOutputTokens: 8192, gameMode: 'free',
    dialogueRecallTurns: 3, aiSubcallConcurrency: 2,
    anomalyRoutingEnabled: false, agentRecallEnabled: false
  });
  P.playerInfo = Object.assign({}, P.playerInfo || {}, { characterName: '皇帝', capital: '京城' });

  // ── canned GM（最小可推演世界·内容全钉死）──
  sandbox.GM = {
    turn: 5,
    vars: {},
    chars: [
      { name: '张丞相', alive: true, rank: 1, officialTitle: '丞相', location: '京城', faction: '朝廷', loyalty: 78, intelligence: 82, scholarship: 85, administration: 80, charisma: 66, age: 55, traits: ['清廉'] },
      { name: '李将军', alive: true, rank: 2, officialTitle: '大将军', location: '京城', faction: '朝廷', loyalty: 70, intelligence: 65, valor: 88, military: 84, age: 47, traits: ['骁勇'] }
    ],
    facs: [{ name: '北虏', strength: 62, leader: '虏酋', attitude: '敌视', goal: '南下劫掠', isPlayer: false, type: '游牧', culture: '草原' }],
    factionRelations: [],
    classes: [], parties: [], armies: [], activeWars: [],
    shijiHistory: [{
      turn: 4, time: '四年春', shizhengji: '江南水患初平·诏修圩田·民力渐苏', shilu: '四年春·江南水退·修圩田',
      zhengwen: '水患既平·江南始安', edicts: { 内政: '修江南圩田' }, personnel: [], playerStatus: '忧劳'
    }],
    evtLog: [{ turn: 4, type: '灾异', text: '江南大水·圩田尽没' }],
    jishiRecords: [{ turn: 5, char: '张丞相', mode: '问对', playerSaid: '朕欲减江南赋税一成·卿以为如何', npcSaid: '臣领旨·当即督办江南减赋', loyaltyDelta: 2 }],
    letters: [], memorials: [],
    _courtRecords: [], _secretMeetings: [], _npcCommitments: {}, _approvedMemorials: [],
    _turnAiResults: {}
  };

  const TM = sandbox.TM;
  if (!TM || !TM.Endturn || !TM.Endturn.AI || !TM.Endturn.AI.subcalls || typeof TM.Endturn.AI.subcalls.runMain !== 'function') {
    throw new Error(tag + ' TM.Endturn.AI.subcalls.runMain 未装载');
  }
  const ns = TM.Endturn.AI.subcalls;

  // ── 录制器 + stub（缝：包 ns.setupInfra·在其发布 ctx.subcalls 后覆盖 _callEndturnAI）──
  const calls = [];
  let seq = 0;
  async function stubCallEndturnAI(body, opts) {
    opts = opts || {};
    const id = opts.id || 'unknown';
    seq++;
    const msgs = (body && body.messages) || [];
    const sys = msgContent((msgs[0] || {}).content);
    const user = msgContent((msgs[1] || {}).content);
    let rf = null;
    if (body && body.response_format) rf = body.response_format.type + (body.response_format.json_schema ? ':' + body.response_format.json_schema.name : '');
    calls.push({
      seq, id, label: opts.label || '', model: (body && body.model) || '', temperature: body && body.temperature,
      max_tokens: body && body.max_tokens, response_format: rf,
      system: sys, systemSha256: sha256(sys), user, userSha256: sha256(user),
      expectedKeys: (opts.expectedKeys || []).slice()
    });
    const fx = FIXTURES[id];
    const obj = fx || { _unknownSubcall: id };
    const raw = JSON.stringify(obj);
    const data = { choices: [{ message: { content: raw }, finish_reason: 'stop' }], usage: { prompt_tokens: 1000, completion_tokens: 500 } };
    if (opts.expectedKeys && opts.expectedKeys.length) {
      const parsed = JSON.parse(raw);
      return { data, raw, parsed, parse: { parsed, raw, repaired: false, truncated: false } };
    }
    return { data, raw, parsed: null, parse: null };
  }
  const realSetup = ns.setupInfra;
  ns.setupInfra = function (c) {
    const r = realSetup.call(this, c);
    c.subcalls._callEndturnAI = stubCallEndturnAI;
    return r;
  };

  // ── mock ctx（照 tm-endturn-ai-infer.js L44 的字面构造·prompt 面用金样罐装串）──
  const ctx = {
    input: {
      edicts: { 内政: '减江南赋税一成', 军务: '' }, xinglu: '巡视太学', memRes: null, oldVars: {},
      timeRatio: 1
    },
    prompt: {
      sysP: '【金样sysP】你是天命回合推演引擎·本串为金样网固定系统提示·不代表真实 prompt 面。',
      tp: '【金样tp】T5·本回合玩家颁诏：减江南赋税一成。行录：巡视太学。\n',
      sc: null,
      _shiluR: null, _shiluMin: 0, _shiluMax: 0,
      _szjR: null, _szjMin: 0, _szjMax: 0,
      _hourenR: null, _hourenMin: 0, _hourenMax: 0,
      _zwR: null, _zwMin: 0, _zwMax: 0,
      _commentR: null
    },
    subcalls: { _runSubcall: null, _tok: null, _buildFetchBody: null, _truncatedOnce: false, _effectiveOutCap: 0, _checkTruncated: null },
    results: {
      sc0: null, sc05: null, sc1: null, sc1b: null, sc1c: null, sc1d: null, sc07: null,
      sc15: null, sc_memwrite: null, sc16: null, sc17: null, sc18: null,
      sc_audit: null, sc2: null, sc25: null, sc27: null, sc28: null, sc_consolidate: null
    },
    apply: { _hardConstraints: '', applied: { chars: null, factions: null, offices: null, fiscal: null, admin: null, events: null, harem: null } },
    followup: { _changeSummary: [], npcDeep: null, fiscalMil: null, narrative: null },
    record: {
      shizhengji: '', zhengwen: '', playerStatus: '', playerInner: '', turnSummary: '',
      shiluText: '', szjTitle: '', szjSummary: '', personnelChanges: [], hourenXishuo: '', suggestions: []
    },
    meta: { errors: [], warnings: [], timing: {}, retries: {} }
  };

  let afterSc1Calls = 0;
  await ns.runMain(ctx, async function () { afterSc1Calls++; }); // afterSc1 空壳·writeBack 是 apply 刀的网

  const GM = sandbox.GM;
  return {
    version: 'aiwarm-20260706',
    callOrder: calls.map(c => c.id),
    calls: calls.map(c => ({
      seq: c.seq, id: c.id, label: c.label, model: c.model, temperature: c.temperature,
      max_tokens: c.max_tokens, response_format: c.response_format, expectedKeys: c.expectedKeys,
      systemSha256: c.systemSha256, systemLen: c.system.length, system: c.system,
      userSha256: c.userSha256, userLen: c.user.length, user: c.user
    })),
    afterSc1Calls,
    results: {
      sc0: ctx.results.sc0, sc05: ctx.results.sc05, sc1: ctx.results.sc1, sc1q: ctx.results.sc1q || null,
      sc1b: ctx.results.sc1b, sc1c: ctx.results.sc1c, sc1d: ctx.results.sc1d,
      p1Summary: ctx.followup.p1Summary
    },
    turnAiResults: GM._turnAiResults,
    metaErrors: ctx.meta.errors
  };
}

// ── 递归 diff（找前 12 处差异路径）──
function diffPaths(a, b, p, out) {
  if (out.length >= 12) return;
  if (typeof a !== typeof b) { out.push(p + ' :: type ' + typeof a + ' → ' + typeof b); return; }
  if (a === null || b === null || typeof a !== 'object') {
    if (a !== b) out.push(p + ' :: ' + JSON.stringify(a).slice(0, 80) + ' → ' + JSON.stringify(b).slice(0, 80));
    return;
  }
  const ka = Object.keys(a), kb = Object.keys(b);
  ka.filter(k => !(k in b)).forEach(k => out.push(p + '.' + k + ' :: 金样有·当前无'));
  kb.filter(k => !(k in a)).forEach(k => out.push(p + '.' + k + ' :: 当前新增'));
  ka.filter(k => k in b).forEach(k => diffPaths(a[k], b[k], p + '.' + k, out));
}

(async function main() {
  console.log('verify-runmain-golden — runMain stub 回归网');
  const t0 = Date.now();
  const snap = await runScenario('run1');
  snap.callOrder = normalizeOrder(snap.callOrder);
  console.log('  装载+runMain 完成 ' + (Date.now() - t0) + 'ms · 子调用 ' + snap.calls.length + ' 次 · 序(归一后): ' + snap.callOrder.join(' → '));

  const needBaseline = UPDATE || !fs.existsSync(BASELINE);
  if (needBaseline) {
    // 双跑确定性自检：两个全新 sandbox 各跑一遍·归一后须逐字节一致
    const snap2 = await runScenario('run2');
    snap2.callOrder = normalizeOrder(snap2.callOrder);
    const s1 = stableStringify(snap), s2 = stableStringify(snap2);
    if (s1 !== s2) {
      const d = []; diffPaths(normalize(snap, 0), normalize(snap2, 0), '$', d);
      console.error('  ✗ 双跑确定性自检失败·金样不可采：');
      d.forEach(x => console.error('    ' + x));
      process.exit(1);
    }
    console.log('  ✓ 双跑确定性自检通过（两个独立 sandbox 逐字节一致）');
    fs.writeFileSync(BASELINE, s1 + '\n', 'utf8');
    const kb = Math.round(fs.statSync(BASELINE).size / 1024);
    console.log('  ✓ 金样已落盘 ' + path.relative(ROOT, BASELINE) + ' (' + kb + 'KB) · 总sha256[:16]=' + sha256(s1).slice(0, 16));
    console.log('verify-runmain-golden PASS (baseline ' + (UPDATE ? 'updated' : 'created') + ')');
    process.exit(0);
  }

  const golden = fs.readFileSync(BASELINE, 'utf8').replace(/\n$/, '');
  const current = stableStringify(snap);
  if (golden === current) {
    console.log('  ✓ 当前 vs 金样 逐字节一致 · 总sha256[:16]=' + sha256(current).slice(0, 16));
    console.log('verify-runmain-golden PASS');
    process.exit(0);
  }
  const d = [];
  diffPaths(JSON.parse(golden), JSON.parse(current), '$', d);
  console.error('  ✗ 当前与金样不一致（前 ' + d.length + ' 处）：');
  d.forEach(x => console.error('    ' + x));
  console.error('verify-runmain-golden FAIL（若为有意改动·复核后 --update 重采）');
  process.exit(1);
})().catch(e => {
  console.error('verify-runmain-golden CRASH:', e && e.stack || e);
  process.exit(1);
});
