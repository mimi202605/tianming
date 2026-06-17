#!/usr/bin/env node
// scripts/smoke-faction-npc-endturn-e2e.js — Phase F·完整 endturn 模拟
// 2026-05-10·验证 NPC 5 系统 (memorial/edict/chaoyi/office/guoku) 全运行
// + 严格不污染 player faction
// + 多回合连续跑·trajectory 累积

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const SCN_DIR = path.resolve(ROOT, '..', 'scenarios');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

function buildContext() {
  var ctx = { console: { log: function(){}, warn: function(){} },
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, Set: Set };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  ['tm-faction-paradigm.js', 'tm-faction-personality.js', 'tm-faction-index.js',
   'tm-faction-derived-health.js', 'tm-faction-membership.js',
   'tm-faction-derived-economy.js', 'tm-faction-derived-cohesion.js', 'tm-faction-derived-strength.js',
   'tm-faction-npc-settings.js',
   'tm-faction-npc-news-bridge.js',
   'tm-faction-npc-memorial.js', 'tm-faction-npc-edict.js', 'tm-faction-npc-chaoyi.js',
   'tm-faction-npc-office.js', 'tm-faction-npc-guoku.js',
   'tm-faction-npc-intervention.js'].forEach(function(f){
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  });
  return ctx;
}

function loadGM(ctx, sc) {
  ctx.GM = {
    turn: 1,
    facs: (sc.factions || []).map(function(f){ return Object.assign({}, f); }),
    chars: (sc.characters || []).map(function(c){ return Object.assign({}, c, { alive: c.alive !== false }); }),
    armies: (sc.military && sc.military.initialTroops || []).map(function(a){ return Object.assign({}, a); }),
    parties: (sc.parties || []).map(function(p){ return Object.assign({}, p); }),
    factionRelations: sc.factionRelations || [],
    _provinceToFaction: {}, provinceStats: {},
    memorials: [],  // player 奏疏池·NPC 不应往这里写
    qijuHistory: []
  };
  ctx.P = { playerInfo: sc.playerInfo || {}, conf: {} };
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

// 模拟 endturn pipeline·NPC 5 系统按 endturn 顺序跑
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
  var ctx = buildContext();
  var sc = JSON.parse(fs.readFileSync(path.join(SCN_DIR, '天启七年·九月（官方）.json'), 'utf8'));
  loadGM(ctx, sc);

  var playerName = sc.playerInfo.factionName;
  console.log('player =', playerName);
  console.log('facs =', ctx.GM.facs.length, '· chars =', ctx.GM.chars.length, '· armies =', ctx.GM.armies.length);

  // 跑 5 回合
  var summary = { mem: 0, ed: 0, cy: 0, of: 0, gk: 0 };
  for (var t = 1; t <= 5; t++) {
    ctx.GM.turn = t;
    simulateEndturn(ctx);
  }

  // 检·每个 NPC 是否 trajectory 累积
  console.log('\n=== Q1·NPC 是否正常运行 ===');
  ctx.GM.facs.forEach(function(f){
    if (f.name === playerName) return;
    var m = (f.npcMemorials || []).length;
    var e = (f.npcEdicts || []).length;
    var c = (f.npcChaoyi || []).length;
    var o = (f.npcOfficeActions || []).length;
    var g = (f.npcFiscalLedger || []).length;
    summary.mem += m; summary.ed += e; summary.cy += c; summary.of += o; summary.gk += g;
    console.log('  ' + f.name.padEnd(28) + ' mem=' + m + ' ed=' + e + ' cy=' + c + ' of=' + o + ' gk=' + g);
  });
  console.log('  TOTAL: mem=' + summary.mem + ' ed=' + summary.ed + ' cy=' + summary.cy + ' of=' + summary.of + ' gk=' + summary.gk);
  var quickNews = (ctx.GM.qijuHistory || []).filter(function(x){ return x && x._source === 'npc-bridge'; });
  var expectedQuickNews = Math.min(200, summary.mem + summary.ed + summary.cy + summary.of + summary.gk);
  console.log('  近事快报 npc-bridge=' + quickNews.length + ' expected=' + expectedQuickNews + ' (cap 200)');
  assert(quickNews.length === expectedQuickNews, 'NPC 5 系统所有操作都应进入近事快报直到 cap·got ' + quickNews.length + ' expected ' + expectedQuickNews);

  // 断言·5 回合·11 NPC·至少有些数据 (排除 chaoyi 因可能单派)
  assert(summary.mem > 0, 'NPC memorial 应有 > 0·got ' + summary.mem);
  assert(summary.ed >= 5, 'NPC edict ≥ 5 (1 per fac)·got ' + summary.ed);
  assert(summary.gk >= 5, 'NPC guoku ≥ 5·got ' + summary.gk);
  assert(summary.of > 0, 'NPC office 应有 > 0·got ' + summary.of);

  // ============================================================
  // Q2·验证 player faction 完全不污染
  // ============================================================
  console.log('\n=== Q2·NPC 内容是否污染 player ===');
  var ming = ctx.GM.facs.find(function(f){ return f.name === playerName; });
  console.log('  明朝廷.npcMemorials =', (ming.npcMemorials || []).length);
  console.log('  明朝廷.npcEdicts =', (ming.npcEdicts || []).length);
  console.log('  明朝廷.npcChaoyi =', (ming.npcChaoyi || []).length);
  console.log('  明朝廷.npcOfficeActions =', (ming.npcOfficeActions || []).length);
  console.log('  明朝廷.npcFiscalLedger =', (ming.npcFiscalLedger || []).length);
  // 严格 — 都应该 0
  assert(!ming.npcMemorials || ming.npcMemorials.length === 0, '明朝廷.npcMemorials 应 0·got ' + (ming.npcMemorials && ming.npcMemorials.length));
  assert(!ming.npcEdicts || ming.npcEdicts.length === 0, '明朝廷.npcEdicts 应 0');
  assert(!ming.npcChaoyi || ming.npcChaoyi.length === 0, '明朝廷.npcChaoyi 应 0');
  assert(!ming.npcOfficeActions || ming.npcOfficeActions.length === 0, '明朝廷.npcOfficeActions 应 0');
  assert(!ming.npcFiscalLedger || ming.npcFiscalLedger.length === 0, '明朝廷.npcFiscalLedger 应 0');
  console.log('  ✓ 明朝廷·5 个 NPC trajectory 字段全空');

  // GM.memorials (player 奏疏池) 不应被 NPC content 写入
  var pollutedMem = (ctx.GM.memorials || []).filter(function(m){
    return m && m.id && String(m.id).startsWith('npcm_');
  });
  console.log('  GM.memorials.length =', ctx.GM.memorials.length, ' (含 NPC id 的:', pollutedMem.length + ')');
  assert(pollutedMem.length === 0, 'GM.memorials 不应含 NPC id 项·got ' + pollutedMem.length);

  // 反向·GM.chars 中 player faction chars 的 _memorialMemory 不应受 NPC events 影响
  var mingChars = ctx.GM.chars.filter(function(c){ return c.faction === playerName; });
  var pollutedChars = mingChars.filter(function(c){
    return Array.isArray(c._memorialMemory) && c._memorialMemory.length > 0;
  });
  console.log('  明朝廷 chars 中带 _memorialMemory 的: ' + pollutedChars.length + ' / ' + mingChars.length);
  assert(pollutedChars.length === 0, '明朝廷 chars 不应有 _memorialMemory (NPC 系统不应碰他们)·got ' + pollutedChars.length);

  // player faction.treasury 不应被 NPC guoku 修改
  // 测前 snapshot
  var mingTreasuryStartMoney = ming.treasury && ming.treasury.money;
  // 再跑 1 回合·player treasury 不应变 (NPC guoku 仅算 NPC fac)
  var beforeMoney = ming.treasury.money;
  ctx.GM.turn = 6;
  simulateEndturn(ctx);
  console.log('  跑回合 6 后·明朝廷 treasury.money: ' + beforeMoney + ' → ' + ming.treasury.money);
  assert(ming.treasury.money === beforeMoney, '明朝廷 treasury 不应被 NPC guoku 改');
  console.log('  ✓ player faction 完全隔离');

  // ============================================================
  // Q3·新增 API 调用 (LLM enrich) 验证
  // ============================================================
  console.log('\n=== Q3·新 API 调用 (LLM enrich) 验证 ===');
  // F4 是 async·default off·我们只验 settings + structure·不真调 LLM
  var settings = ctx.TM.FactionNpcSettings.getStatus();
  console.log('  默认 settings:', JSON.stringify(settings));
  assert(settings.enabled === false, '默认 npcAiPrecision 应 false');
  assert(settings.maxPerTurn === 2, '过回合精细化批量默认应降为 2');
  assert(settings.effectivelyOn === false, '默认 effectivelyOn 应 false (无 key)');
  assert(settings.reason === 'switch off' || settings.reason === 'no API key', 'reason 应解释');
  // 模拟开启
  ctx.P.conf.npcAiPrecision = true;
  var s2 = ctx.TM.FactionNpcSettings.getStatus();
  console.log('  开关 ON·无 key:', JSON.stringify(s2));
  assert(s2.enabled === true && s2.effectivelyOn === false, '开关 on 但无 key·effectivelyOn 应仍 false');
  // 模拟有 key
  ctx.P.ai = { key: 'fake-key' };
  var s3 = ctx.TM.FactionNpcSettings.getStatus();
  console.log('  开关 ON·有 key:', JSON.stringify(s3));
  assert(s3.effectivelyOn === true, '开关 + key·effectivelyOn 应 true');
  // 关回·避免后续测试受影响
  ctx.P.conf.npcAiPrecision = false;
  console.log('  ✓ settings 开关 + key 双门控生效');

  // ============================================================
  // Q4·F2 干预 隔离测试·player 用资源·NPC 受影响
  // ============================================================
  console.log('\n=== F2·干预 资源隔离 ===');
  ming.treasury.money = 1000000;
  ming.treasury.grain = 1000000;
  var hjAmin = ctx.GM.chars.find(function(c){ return c.name === '阿敏'; });
  var loyB = hjAmin && hjAmin.loyalty;
  var r = ctx.TM.FactionNpcIntervention.bribe('后金', '阿敏');
  console.log('  bribe 后金·阿敏:', r.ok ? 'OK' : 'FAIL ' + r.reason);
  console.log('  阿敏 loyalty: ' + loyB + ' → ' + (hjAmin && hjAmin.loyalty));
  console.log('  明朝廷 treasury.money: 1000000 → ' + ming.treasury.money);
  assert(ming.treasury.money === 950000, 'player 应扣 5w·got ' + ming.treasury.money);

  console.log('\n[smoke-faction-npc-endturn-e2e] all assertions pass');
}

try { main(); }
catch (e) {
  console.error('[smoke-faction-npc-endturn-e2e] FAIL:', (e && e.message) || e);
  if (e && e.stack) console.error(e.stack.split('\n').slice(1, 6).join('\n'));
  process.exit(1);
}
