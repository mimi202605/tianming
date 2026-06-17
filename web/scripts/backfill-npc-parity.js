#!/usr/bin/env node
// scripts/backfill-npc-parity.js — Phase A2·NPC 字段 parity 补全
// 2026-05-10·use: node scripts/backfill-npc-parity.js [scenario-name]
// 默认跑 4 剧本·按 audit doc (npc-parity-gaps.md) 的 A/D 类规则补·skip B/C
// 不覆盖已有·只补 missing·内容文化适配

'use strict';
const fs = require('fs');
const path = require('path');
const SCN_DIR = path.resolve(__dirname, '..', '..', 'scenarios');

// ──────────────────────────────────────────────────────────
// 文化适配·按 NPC 名字推断文化 paradigm
// ──────────────────────────────────────────────────────────

function detectParadigm(facName, fac) {
  // 优先 fac.type / fac.culture 字段
  var t = (fac.type || '') + '|' + (fac.culture || '') + '|' + (fac.ideology || '');
  // 名字 pattern
  var n = facName;
  if (/明朝廷|明|宋朝|宋|大宋|大明|朝廷|皇朝/.test(n) || /中原帝国|汉/.test(t)) return 'central_empire';
  if (/后金|金国|大金|清/.test(n)) return 'manchu_empire';
  if (/察哈尔|科尔沁|蒙古|土默特/.test(n) || /游牧|蒙古/.test(t)) return 'mongol_tribe';
  if (/朝鲜|高丽/.test(n)) return 'tributary_kingdom';
  if (/葡萄牙|荷兰|西班牙|英国|东印度公司|耶稣会|马尼拉|澳门|台海|大员/.test(n)) return 'european_outpost';
  if (/海商|海盗|郑/.test(n)) return 'maritime_merchant';
  if (/土司|杨氏|奢氏|安氏|播州|水西|永宁/.test(n)) return 'native_chieftain';
  if (/饥民|起义|流寇|义军|叛军|联军|八字军/.test(n)) return 'rebellion';
  if (/西军|关陕|御营|镇/.test(n)) return 'military_jiedushi';
  if (/契丹|耶律/.test(n)) return 'remnant_dynasty';
  return 'generic';
}

// 各 paradigm 的 economicPolicy.labor 默认
var LABOR_DEFAULT = {
  central_empire: '里甲均徭·万历后部分摊入地亩',
  manchu_empire: '八旗壮丁·分牛录耕牧并行',
  mongol_tribe: '游牧·按部落分户出丁·季节征役',
  tributary_kingdom: '良役·身良身贱分·地方差役',
  european_outpost: '雇工·奴工 (混血/非洲奴隶)·教会服役',
  maritime_merchant: '海上雇佣·分股·伙计制',
  native_chieftain: '土司差役·部民承袭',
  rebellion: '部曲化·掠夺补给',
  military_jiedushi: '军屯·兵户世袭',
  remnant_dynasty: '部落+残部混役',
  generic: '差役制·细节缺'
};

// publicOpinion 默认 (按 paradigm)
var PUBLIC_OPINION_DEFAULT = {
  central_empire: { amongGentry: 50, amongPeasantry: 50, amongScholars: 50 },
  manchu_empire: { amongNobles: 60, amongWarriors: 70, amongHanSubjects: 40 },
  mongol_tribe: { amongTribes: 50 },
  tributary_kingdom: { amongYangban: 50, amongCommoners: 40 },
  european_outpost: { amongLocals: 50, amongMerchants: 60 },
  maritime_merchant: { amongCrews: 50, amongMerchants: 60 },
  native_chieftain: { amongClansmen: 60, amongTribute: 40 },
  rebellion: { amongFollowers: 70, amongCaptured: 30 },
  military_jiedushi: { amongOfficers: 60, amongTroops: 50 },
  remnant_dynasty: { amongLoyalists: 60 },
  generic: { amongCommoners: 50 }
};

// ──────────────────────────────────────────────────────────
// 缺漏字段填充器·每个 returns true 若发生改动
// ──────────────────────────────────────────────────────────

function fillIfMissing(fac, key, valueFactory) {
  if (fac[key] !== undefined && fac[key] !== null) return false;
  fac[key] = valueFactory();
  return true;
}

function ensureObject(fac, key) {
  if (!fac[key] || typeof fac[key] !== 'object' || Array.isArray(fac[key])) {
    fac[key] = {};
    return true;
  }
  return false;
}

function fillNestedIfMissing(parent, key, valueFactory) {
  if (parent[key] !== undefined && parent[key] !== null) return false;
  parent[key] = valueFactory();
  return true;
}

// ──────────────────────────────────────────────────────────
// 主补全函数
// ──────────────────────────────────────────────────────────

function backfillFaction(fac, facListAll, scenarioName) {
  if (!fac || !fac.name) return { changed: 0, log: [] };
  var changed = 0;
  var log = [];

  function note(field) { changed++; log.push(field); }

  var paradigm = detectParadigm(fac.name, fac);

  // ── A 类·真该补 ──

  // id / sid (科尔沁等 stub)
  if (fillIfMissing(fac, 'id', function(){
    return fac.name.replace(/[^A-Za-z0-9_一-龥]/g, '_').slice(0, 32) + '_' + (Date.now() % 10000);
  })) note('id');
  if (fillIfMissing(fac, 'sid', function(){ return fac.id; })) note('sid');

  // strength (科尔沁有 prestige 没 strength)
  if (fillIfMissing(fac, 'strength', function(){
    if (typeof fac.prestige === 'number') return fac.prestige;
    return 50;
  })) note('strength');

  // courtInfluence / popularInfluence / cultureLevel
  if (fillIfMissing(fac, 'courtInfluence', function(){ return 50; })) note('courtInfluence');
  if (fillIfMissing(fac, 'popularInfluence', function(){ return 50; })) note('popularInfluence');
  if (fillIfMissing(fac, 'cultureLevel', function(){ return 50; })) note('cultureLevel');

  // capital
  if (fillIfMissing(fac, 'capital', function(){
    if (Array.isArray(fac.territory) && fac.territory.length > 0) return fac.territory[0];
    return '';
  })) note('capital');

  // ideology / traits / mainResources
  if (fillIfMissing(fac, 'ideology', function(){ return ''; })) note('ideology');
  if (fillIfMissing(fac, 'traits', function(){ return []; })) note('traits');
  if (fillIfMissing(fac, 'mainResources', function(){ return []; })) note('mainResources');

  // members (string list)
  if (fillIfMissing(fac, 'members', function(){
    return fac.leader ? [fac.leader] : [];
  })) note('members');

  // longTermStrategy
  if (fillIfMissing(fac, 'longTermStrategy', function(){
    return fac.strategy || '';
  })) note('longTermStrategy');

  // victoryConditions / defeatConditions
  if (fillIfMissing(fac, 'victoryConditions', function(){ return []; })) note('victoryConditions');
  if (fillIfMissing(fac, 'defeatConditions', function(){ return []; })) note('defeatConditions');

  // offendThresholds 3 层默认
  if (fillIfMissing(fac, 'offendThresholds', function(){
    return [
      { score: 15, description: '轻微触怒·言辞冷淡', consequences: ['relations -5'] },
      { score: 30, description: '严重触怒·撤回使节', consequences: ['relations -15', '召回使节'] },
      { score: 60, description: '不可忍·宣战或绝交', consequences: ['relations -40', '宣战或断交'] }
    ];
  })) note('offendThresholds');

  // history (跨年时间线)
  if (fillIfMissing(fac, 'history', function(){
    if (Array.isArray(fac.historicalEvents)) return fac.historicalEvents.slice();
    return [];
  })) note('history');

  // attitudeDetail
  if (fillIfMissing(fac, 'attitudeDetail', function(){
    return {
      self: [],
      allies: Array.isArray(fac.allies) ? fac.allies.slice() : [],
      enemies: Array.isArray(fac.enemies) ? fac.enemies.slice() : [],
      neutrals: Array.isArray(fac.neutrals) ? fac.neutrals.slice() : []
    };
  })) note('attitudeDetail');

  // partyRelations
  if (fillIfMissing(fac, 'partyRelations', function(){ return {}; })) note('partyRelations');

  // leadership 整块
  if (fillIfMissing(fac, 'leadership', function(){
    return {
      ruler: fac.leader || '',
      regent: '',
      general: '',
      chancellor: '',
      spy: ''
    };
  })) note('leadership');

  // treasury (科尔沁缺整块)
  if (fillIfMissing(fac, 'treasury', function(){
    return { money: 0, grain: 0, cloth: 0, note: '(数据缺·按势力规模再调)' };
  })) note('treasury');

  // economicPolicy 整块
  if (!fac.economicPolicy || typeof fac.economicPolicy !== 'object') {
    fac.economicPolicy = {};
    note('economicPolicy(create)');
  }
  if (fillNestedIfMissing(fac.economicPolicy, 'labor', function(){ return LABOR_DEFAULT[paradigm]; })) note('economicPolicy.labor');
  // 不补 taxation/trade/currency·这些太具体·留 backlog

  // warState
  if (!fac.warState || typeof fac.warState !== 'object') {
    fac.warState = { active: [], pending: [], recent: [] };
    note('warState(create)');
  } else {
    if (fillNestedIfMissing(fac.warState, 'active', function(){ return []; })) note('warState.active');
    if (fillNestedIfMissing(fac.warState, 'pending', function(){ return []; })) note('warState.pending');
    if (fillNestedIfMissing(fac.warState, 'recent', function(){ return []; })) note('warState.recent');
  }

  // publicOpinion (C 类·按 paradigm·只在完全缺时补)
  if (!fac.publicOpinion || typeof fac.publicOpinion !== 'object') {
    fac.publicOpinion = JSON.parse(JSON.stringify(PUBLIC_OPINION_DEFAULT[paradigm]));
    note('publicOpinion(create)');
  }

  // relations 双向对称补全 (A 类核心)
  if (!fac.relations || typeof fac.relations !== 'object') {
    fac.relations = {};
    note('relations(create)');
  }
  facListAll.forEach(function(other) {
    if (!other.name || other.name === fac.name) return;
    if (fac.relations[other.name] !== undefined) return;
    // 取对方对自己的 relation·没有则 0
    var sym = (other.relations && typeof other.relations[fac.name] === 'number') ? other.relations[fac.name] : 0;
    fac.relations[other.name] = sym;
    note('relations.' + other.name);
  });

  // ── D 类·structural normalize ──

  // population: number → object
  if (typeof fac.population === 'number') {
    var n = fac.population;
    fac.population = { actual: n, registered: 0, hidden: 0, ethnicities: {} };
    note('population(normalize)');
  } else if (!fac.population || typeof fac.population !== 'object') {
    fac.population = { actual: 0, registered: 0, hidden: 0, ethnicities: {} };
    note('population(create)');
  } else {
    if (fillNestedIfMissing(fac.population, 'actual', function(){ return 0; })) note('population.actual');
    if (fillNestedIfMissing(fac.population, 'registered', function(){ return 0; })) note('population.registered');
    if (fillNestedIfMissing(fac.population, 'hidden', function(){ return 0; })) note('population.hidden');
    if (fillNestedIfMissing(fac.population, 'ethnicities', function(){ return {}; })) note('population.ethnicities');
  }

  // techLevel: 至少有 overall
  if (!fac.techLevel || typeof fac.techLevel !== 'object') {
    fac.techLevel = { overall: 50 };
    note('techLevel(create)');
  } else if (fac.techLevel.overall === undefined) {
    fac.techLevel.overall = 50;
    note('techLevel.overall');
  }

  return { changed: changed, log: log };
}

// ──────────────────────────────────────────────────────────
// 主流程
// ──────────────────────────────────────────────────────────

function backfillScenario(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log('skip·not found: ' + filePath);
    return;
  }
  // 备份·走 _archived-backups 子目录
  var bakDir = path.join(path.dirname(filePath), '_archived-backups');
  fs.mkdirSync(bakDir, { recursive: true });
  var bakPath = path.join(bakDir, path.basename(filePath) + '.pre-npc-parity.bak');
  if (!fs.existsSync(bakPath)) {
    fs.copyFileSync(filePath, bakPath);
  }
  var sc = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  var name = path.basename(filePath);
  var playerName = sc.playerInfo && sc.playerInfo.factionName;
  var facs = sc.factions || [];
  var playerFac = facs.find(function(f){ return f.name === playerName; });

  console.log('\n=== ' + name + ' ===');
  console.log('player:', playerName, '·factions:', facs.length);

  // playerInfo 缺 player faction → 跳过 (Phase A2 backlog)
  if (!playerFac && playerName) {
    console.log('  ⚠ player faction "' + playerName + '" NOT in sc.factions[]·skip (Phase A2 backlog)');
    return;
  }

  var totalChanged = 0;
  facs.forEach(function(f) {
    if (f.name === playerName) return;  // skip player
    var r = backfillFaction(f, facs, name);
    totalChanged += r.changed;
    if (r.changed > 0) {
      console.log('  + ' + f.name + ': +' + r.changed + ' fields');
    }
  });

  // 写回 (即使 0 changed 也不写·避免 noise)
  if (totalChanged > 0) {
    fs.writeFileSync(filePath, JSON.stringify(sc, null, 2), 'utf8');
    console.log('  total: +' + totalChanged + ' fields written');
  } else {
    console.log('  no changes');
  }
}

function main() {
  var arg = process.argv[2];
  var files;
  if (arg) {
    files = [arg];
  } else {
    files = ['天启七年·九月（官方）.json', '崇祯.json', '挽天倾：崇祯死局.json', '绍宋·建炎元年八月（官方）.json'];
  }
  files.forEach(function(f) {
    backfillScenario(path.join(SCN_DIR, f));
  });
}

try { main(); } catch (e) { console.error(e); process.exit(1); }
