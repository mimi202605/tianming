#!/usr/bin/env node
'use strict';
// ============================================================
// verify-writeback-golden.js — endturn writeBack 行为金样网（类③巨石解构·apply解构 S1/S2 命门）
//
// 目的：为 tm-endturn-apply.js 的 ns.writeBack(ctx) 建逐字节行为金样，锁定 AP-1/AP-6 stage 迁出
//   的行为等价性。真值面：跑 writeBack 后 canonical(GM) + GM._unappliedChanges（含于 GM）
//   + addEB 调用序（spy）+ ctx.record/ctx.apply/ctx.meta 发布字段。
// 双路（★不许误定义 callAI 污染确定性路）：
//   Path A（确定性核心）：不定义 callAI/callAIWithTools → niyi/reconcile 的 await 分支自跳。
//   Path B（await 覆盖）：stub callAI+callAIWithTools（确定性返回）+ 置 GM._needsReconcile +
//     GM.memorials 待批 → 走通 niyi/奏疏代拟/reconcile 三处 await。
// 确定性护栏：冻结 Date.now / Math.random；两路各起独立 sandbox（互不污染）。
// 用法：
//   node scripts/verify-writeback-golden.js --record   # 落盘金样基线（改 writeBack 前跑一次）
//   node scripts/verify-writeback-golden.js            # 当前实现 vs 金样比对；不一致 FAIL exit 1
// 基线：scripts/arch-baselines/writeback-golden.json
// ============================================================
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const BASELINE_FILE = path.join(__dirname, 'arch-baselines', 'writeback-golden.json');
const RECORD = process.argv.includes('--record');

const FROZEN_NOW = 1700000000000;
const FROZEN_RAND = 0.4242424242;

// —— 运行时装载清单（tm-utils 供 clamp 等；内存栈供 AP-6 记忆入账；末装 origin→stages 保序）——
const LOAD_LIST = [
  'tm-utils.js',
  'tm-memory-evidence-registry.js',
  'tm-memory-issue-governance.js',
  'tm-memory-envelope.js',
  'tm-memory-controls.js',
  'tm-memory-retrieval.js',
  'tm-context-zones.js',
  'tm-memory-context-compiler.js',
  'tm-memory-writegate.js',
  'tm-memory-turn-inference.js',
  'tm-memory-turn-archive.js',
  'tm-memory-turn-rollup.js',
  'tm-endturn-apply.js',
  'tm-endturn-apply-stages.js'
];

// —— canonical 序列化（键递归排序·跳函数/undefined·循环引用记 [Circular]）——
function canonical(value) {
  const seen = new WeakSet();
  function walk(v) {
    if (v === null) return null;
    const t = typeof v;
    if (t === 'number') return Number.isFinite(v) ? v : ('__nonfinite__' + String(v));
    if (t === 'string' || t === 'boolean') return v;
    if (t === 'undefined' || t === 'function' || t === 'symbol') return undefined;
    if (t === 'bigint') return '__bigint__' + v.toString();
    if (Array.isArray(v)) {
      if (seen.has(v)) return '__circular__';
      seen.add(v);
      const out = v.map(walk);
      seen.delete(v);
      return out;
    }
    if (t === 'object') {
      if (seen.has(v)) return '__circular__';
      seen.add(v);
      const out = {};
      Object.keys(v).sort().forEach((k) => {
        const w = walk(v[k]);
        if (w !== undefined) out[k] = w;
      });
      seen.delete(v);
      return out;
    }
    return undefined;
  }
  return walk(value);
}
function canonJSON(value) { return JSON.stringify(canonical(value)); }
function sha(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }

// —— 深克隆基准（fixture 的 GM/p1 每路独享一份·JSON 往返足矣·纯数据无函数）——
function clone(o) { return JSON.parse(JSON.stringify(o)); }

// —— fixture：覆盖 §1-§11 代表字段族的 mock GM 基准 + p1 ——
function makeBaseGM() {
  return {
    turn: 24,
    currentYear: 1627,
    sid: 'golden-writeback',
    worldId: 'world-golden',
    vars: {
      minxin: { value: 55, min: 0, max: 100, unit: '' },
      guoku: { value: 3200, min: 0, max: 999999, unit: '两' }
    },
    chars: [
      { name: '韩旷', alive: true, loyalty: 60, stress: 10, faction: '东林', title: '尚书' },
      { name: '温体仁', alive: true, loyalty: 40, stress: 30, faction: '浙党' },
      { name: '周延儒', alive: true, loyalty: 50, stress: 20 }
    ],
    facs: [
      { name: '东林', leader: '韩旷', strength: 70, leaderInfo: { name: '韩旷' }, succession: { stability: 60 }, historicalEvents: [] },
      { name: '浙党', leader: '温体仁', strength: 45, historicalEvents: [] }
    ],
    factionRelations: [
      { from: '东林', to: '浙党', type: '敌对', value: -40, desc: '' }
    ],
    classes: [
      { name: '士绅', population: 1200, satisfaction: 50 }
    ],
    parties: [
      { name: '清流', members: ['韩旷'], agenda: '澄清吏治', strength: 55 }
    ],
    officeTree: [
      { name: '吏部', positions: [ { name: '尚书', holder: '韩旷' }, { name: '侍郎', holder: '' } ], subs: [] }
    ],
    memorials: [
      { id: 'm1', type: '奏疏', subtype: '', from: '韩旷', title: '请修河工', text: '', status: 'pending' },
      { id: 'm2', type: '密折', from: '温体仁', title: '劾周延儒', text: '密陈周延儒结党', status: 'pending' }
    ],
    currentIssues: [
      { id: 'issue-he', title: '河工待修', description: '黄河决口待修', status: 'pending' }
    ],
    turnChanges: { variables: [] },
    religions: {},
    _npcCommitments: {},
    events: []
  };
}

function makeP1() {
  return {
    shizhengji: '本回合朝议以河工、盐课、边饷为要，东林与浙党争执不下。',
    turn_summary: '河工与边饷成为朝堂主压力。',
    shilu_text: '实录：帝御文华殿，议河工。',
    szj_title: '河工之议',
    szj_summary: '河工待修，边饷吃紧。',
    houren_xishuo: '后人析曰：党争积重。',
    // §1/主应用透传字段族
    changes: [{ target: 'minxin', delta: -2, reason: '河工未决' }],
    appointments: [{ name: '周延儒', office: '礼部侍郎' }],
    institutions: [],
    regions: [{ name: '河南', note: '受灾' }],
    events: [{ title: '黄河小决', desc: '开封段小决口' }],
    npc_actions: [
      { name: '温体仁', behaviorType: 'impeach', action: '劾周延儒', target: '周延儒' },
      { name: '不存在的幽灵', behaviorType: 'conspire', action: '密谋' }
    ],
    relations: [{ from: '东林', to: '浙党', type: '敌对', reason: '争河工主导' }],
    fiscal_adjustments: [{ target: 'guoku', delta: -300, reason: '拨付河工' }],
    currency_adjustments: [],
    population_adjustments: [{ region: '河南', delta: -50, reason: '灾民流散' }],
    central_local_actions: [],
    environment_actions: [],
    institution_changes: [],
    char_updates: [{ name: '韩旷', loyalty_delta: 3, note: '主河工得倚重' }],
    office_assignments: [{ name: '周延儒', action: 'appoint', dept: '礼部', position: '侍郎' }],
    faction_updates: [{ name: '东林', strength_delta: 2 }],
    party_updates: [{ name: '清流', agenda: '澄清吏治' }],
    personnel_changes: [{ name: '周延儒', change: '升礼部侍郎' }],
    directive_compliance: [],
    regent_decisions: [],
    // §3-§11 代表字段族（多为无 handler/typeof 守卫路径·确定性 surface 或跳过）
    province_changes: [
      { province: '河南', sentiment_delta: -5, reason: '灾情' },
      { province: '山东', note: '盐课紧' }
    ],
    resource_changes: { minxin: -1, junliang: 3 },
    faction_changes: [{ name: '东林', strength_delta: 1 }],
    faction_relation_changes: [{ from: '东林', to: '浙党', value_delta: -3 }],
    class_changes: [{ name: '士绅', satisfaction_delta: -2 }],
    revolt_precursor: [],
    reissue_topics: [{ topic: '盐课整顿', reason: '边饷吃紧' }],
    army_changes: [{ faction: '东林', strength_delta: 0 }],
    dialogue_commitment_feedback: [{ npc: '韩旷', commitment: '三日复奏', status: 'progress' }],
    collective_resolutions: [],
    npc_interactions: [{ from: '温体仁', to: '周延儒', type: 'impeach', summary: '当廷相劾' }],
    office_changes: [{ action: 'appoint', person: '周延儒', dept: '礼部', position: '侍郎', reason: '资序当迁' }],
    edict_feedback: [{ edictId: 'edict-he', status: 'executing', assignee: '工部', feedback: '河工兴役', progressPercent: 30, category: '工程', content: '修黄河决口' }],
    character_memory_updates: [
      { actor: '韩旷', memory: '韩旷记下帝许三日复奏河工。', private: false, confidence: 0.7, source_refs: [{ type: 'jishiRecords', id: 'jr-he' }] },
      { actor: '温体仁', memory: '温体仁私忖党争难解。', private: true, confidence: 0.72, source_refs: [{ type: 'courtRecords', id: 'cr-wen' }] }
    ],
    current_issues_update: [
      { action: 'update', id: 'issue-he', title: '河工待修', description: '决口扩大，急待钱粮。', confidence: 0.6 }
    ],
    character_deaths: []
  };
}

// —— 建 sandbox 并装载运行时 ——
function buildSandbox() {
  const sandbox = { window: {}, console: { log() {}, warn() {}, error() {}, info() {} }, JSON };
  // 冻结 Date / Math.random（确定性）
  const FrozenDate = function Date2(...args) {
    if (args.length) return new (Function.prototype.bind.apply(Date, [null].concat(args)))();
    return new Date(FROZEN_NOW);
  };
  FrozenDate.now = () => FROZEN_NOW;
  FrozenDate.prototype = Date.prototype;
  sandbox.Date = FrozenDate;
  const FrozenMath = Object.create(Math);
  FrozenMath.random = () => FROZEN_RAND;
  sandbox.Math = FrozenMath;
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  LOAD_LIST.forEach((file) => {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
  });
  return sandbox;
}

// —— 通用 stub（两路共用·确定性 no-op / 固定返回）；addEB 走 spy ——
function installCommonStubs(sandbox, ebLog) {
  sandbox.addEB = function(category, message) { ebLog.push([String(category), String(message)]); };
  sandbox.preflightAIWriteBack = function() {};
  sandbox.applyAITurnChanges = function(payload) {
    // 确定性返回：声明一条"目标对不上"的失败（触发 _surfaceUnappliedChanges + reconcile 修复喂料路径）
    return { applied: { failed: [{ reason: 'target not found: 幽灵', target: '幽灵' }] } };
  };
  sandbox.adjustCharacterLoyalty = function(ch, delta, reason, opts) {
    if (!ch) return null;
    var old = (typeof ch.loyalty === 'number') ? ch.loyalty : 50;
    ch.loyalty = Math.max(0, Math.min(100, old + Math.round(Number(delta) || 0)));
    return { ok: true, oldValue: old, newValue: ch.loyalty };
  };
  sandbox.setCharacterLoyalty = function(ch, value, reason, opts) {
    if (!ch) return null;
    var old = (typeof ch.loyalty === 'number') ? ch.loyalty : 50;
    ch.loyalty = Math.max(0, Math.min(100, Math.round(Number(value))));
    return { ok: true, oldValue: old, newValue: ch.loyalty };
  };
  sandbox.applyCharacterDeaths = function() {};
  sandbox.recordCharacterArc = function() {};
  sandbox.getTSText = function(t) { return '天启' + (t || 0) + '年'; };
  sandbox.DebugLog = { log() {}, warn() {}, error() {}, info() {} };
  sandbox._fuzzyFindChar = function() { return null; };
  sandbox.NpcMemorySystem = { remember() {} };
  sandbox.P = { playerInfo: { characterName: '崇祯' } };
  // 中段（AP-2..AP-5·本刀不动）触及的未守卫全局·确定性 stub（不影响金样有效性·前后一致）
  sandbox._dbg = function() {};
  sandbox._enforceFormulas = function() {};
  sandbox.findCharByName = function(name) { return (sandbox.GM && Array.isArray(sandbox.GM.chars)) ? (sandbox.GM.chars.find(function(c){ return c && c.name === name && c.alive !== false; }) || null) : null; };
  sandbox.findFacByName = function(name) { return (sandbox.GM && Array.isArray(sandbox.GM.facs)) ? (sandbox.GM.facs.find(function(f){ return f && f.name === name; }) || null) : null; };
  sandbox.recordChange = function() {};
  sandbox.applyAIMapChanges = function() {};
  sandbox._isSameLocation = function() { return false; };
  sandbox._oteFind = function() { return null; };
  sandbox._offMaterializedCount = function() { return 0; };
  sandbox.findRegionByName = function() { return null; };
  sandbox.findProvinceByName = function() { return null; };
}

// —— 跑一路：装载 → stub → 置 GM/ctx → writeBack → 采集 ——
async function runPath(kind) {
  const sandbox = buildSandbox();
  const ebLog = [];
  installCommonStubs(sandbox, ebLog);

  const GM = makeBaseGM();
  sandbox.GM = GM;

  if (kind === 'B') {
    // Path B：定义 callAI/callAIWithTools（确定性）+ 触发 reconcile
    sandbox.callAI = function(prompt) {
      // niyi 解析 [{i,niyi}] → 置 m._fuchenNiyi（可观测·令漏 await 被金样抓）；
      // 奏疏代拟因无 _needsAiBody 不触发；reconcile else 分支只读 toolCalls(空)·忽略此文本。
      return Promise.resolve('[{"i":1,"niyi":"依议·先勘河工"},{"i":2,"niyi":"下有司核议"}]');
    };
    sandbox.callAIWithTools = function(prompt, tools, opts) {
      return Promise.resolve({ text: '', toolCalls: [], fallback: false });
    };
    GM._needsReconcile = {
      warnings: { personnel: 2, fiscal: 1 },
      narrativeSnapshot: '叙事节选：河工议而未决。',
      structuredSnapshot: { personnel_changes: [], office_assignments: [], fiscal_adjustments: [], military_changes: [] }
    };
  }
  // Path A：不定义 callAI/callAIWithTools（确定性核心）

  const ctx = {
    input: {},
    prompt: { sc: {} },
    subcalls: {},
    results: { sc1: makeP1() },
    apply: {},
    followup: {},
    record: {},
    meta: { errors: [], warnings: [], timing: {}, retries: {} }
  };

  await sandbox.TM.Endturn.AI.apply.writeBack(ctx);

  return {
    gm: canonical(GM),
    eb: ebLog,
    ctxRecord: canonical(ctx.record),
    ctxApply: canonical(ctx.apply),
    ctxMeta: canonical(ctx.meta)
  };
}

// —— 首个差异定位（便于 FAIL 时读）——
function firstDiff(a, b, prefix) {
  prefix = prefix || '';
  if (canonJSON(a) === canonJSON(b)) return null;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) {
    return prefix + '  期望=' + JSON.stringify(a).slice(0, 160) + '  实得=' + JSON.stringify(b).slice(0, 160);
  }
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();
  for (const k of keys) {
    if (canonJSON(a[k]) !== canonJSON(b[k])) {
      const d = firstDiff(a[k], b[k], prefix + '.' + k);
      if (d) return d;
    }
  }
  return prefix + '  (键集差异)';
}

(async function main() {
  const paths = {};
  for (const kind of ['A', 'B']) {
    paths[kind] = await runPath(kind);
  }
  const current = {
    note: 'endturn writeBack 行为金样·apply解构 命门·canonical(GM)+addEB序+ctx发布面·双路(A确定性核心/B含await)',
    pathA: paths.A,
    pathB: paths.B,
    hashes: {
      A: sha(canonJSON(paths.A)),
      B: sha(canonJSON(paths.B))
    }
  };

  if (RECORD) {
    fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(current, null, 2) + '\n');
    console.log('[verify-writeback-golden] 基线已落盘 → ' + path.relative(ROOT, BASELINE_FILE));
    console.log('  hashA=' + current.hashes.A);
    console.log('  hashB=' + current.hashes.B);
    console.log('  ebA=' + paths.A.eb.length + ' 条 · ebB=' + paths.B.eb.length + ' 条');
    process.exit(0);
  }

  let baseline;
  try { baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')); }
  catch (e) {
    console.error('[verify-writeback-golden] 无基线。先跑: node scripts/verify-writeback-golden.js --record');
    process.exit(1);
  }

  let failed = 0;
  for (const kind of ['A', 'B']) {
    const cs = canonJSON(current['path' + kind]);
    const bs = canonJSON(baseline['path' + kind]);
    if (cs !== bs) {
      failed++;
      console.error('[verify-writeback-golden] FAIL Path ' + kind + '：writeBack 行为与金样不符');
      console.error('  金样 hash=' + sha(bs) + '  当前 hash=' + sha(cs));
      const d = firstDiff(baseline['path' + kind], current['path' + kind], 'path' + kind);
      if (d) console.error('  首个差异：' + d);
    }
  }
  if (failed) {
    console.error('[verify-writeback-golden] 命门 FAIL — AP-1/AP-6 迁出破坏了行为等价性（或中段被误动）');
    process.exit(1);
  }
  console.log('[verify-writeback-golden] PASS · 双路逐字节等价（A hash=' + current.hashes.A.slice(0, 12) + ' · B hash=' + current.hashes.B.slice(0, 12) + '）');
  process.exit(0);
})().catch((err) => {
  console.error('[verify-writeback-golden] 运行异常：', err && err.stack || err);
  process.exit(1);
});
