#!/usr/bin/env node
// build-shaosong-map.js — 给绍宋(建炎元年八月·1127)建真实地图。
// 方案:复用天启官方剧本的真实中国地理几何(coords/polygon/path 是真中国轮廓),
// 逐区重标为南宋路名 + 按 1127 疆界设宋/金/西夏/大理/高丽/吐蕃/草原/西域/日本/大越归属。
// 只注入唯一真源，再由统一生成器重建运行时/编辑器/发布制品。
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCEN_DIR = path.join(ROOT, 'scenarios');
const TQ_SRC = path.join(SCEN_DIR, '天启七年·九月（官方）.json');
const SS_SRC = path.join(SCEN_DIR, '绍宋·建炎元年八月（官方）.json');
const GODOT_SS = path.join(ROOT, 'web', 'godot', 'data', 'scenarios', '绍宋·建炎元年八月（官方）.json');
const SS_ID = 'sc-jianyan1-1127-shaosong';

// ── 建炎元年八月(1127.09)政治映射:天启区名 → {name:南宋路名, key:势力, terrain可覆盖} ──
// 宋=南宋朝廷(赵构) 金=金国 都对齐绍宋 factions 名;其余为地图层政权。
const F = {
  song:   { key: 'fac-song',    name: '宋朝廷',          color: '#c0392b' },
  jin:    { key: 'fac-jin',     name: '金国（大金）',     color: '#2c3e50' },
  xixia:  { key: 'fac-xixia',   name: '西夏',            color: '#d4a017' },
  dali:   { key: 'fac-dali',    name: '大理国',          color: '#16a085' },
  tubo:   { key: 'fac-tubo',    name: '吐蕃诸部',        color: '#7f8c8d' },
  goryeo: { key: 'fac-goryeo',  name: '高丽',            color: '#8e44ad' },
  daiviet:{ key: 'fac-daiviet', name: '大越·李朝',       color: '#27ae60' },
  japan:  { key: 'fac-japan',   name: '日本（平安朝）',   color: '#95a5a6' },
  caoyuan:{ key: 'fac-caoyuan', name: '草原诸部（阻卜·蒙兀）', color: '#bdc3c7' },
  xiyu:   { key: 'fac-xiyu',    name: '西域诸部（回鹘·黑汗）', color: '#e67e22' },
  nanhai: { key: 'fac-nanhai',  name: '南海诸番',        color: '#1abc9c' }
};
// 天启区名 → [南宋路名, 势力]
const MAP = {
  '北直隶':            ['河北东路（金占）', F.jin],
  '南直隶':            ['江南东路·建康府', F.song],
  '浙江':              ['两浙路·临安府', F.song],
  '福建':              ['福建路', F.song],
  '广西':              ['广南西路', F.song],
  '江西':              ['江南西路', F.song],
  '湖广':              ['荆湖南北路', F.song],
  '河南':              ['京西北路·汴京（宗泽守）', F.song],
  '山西':              ['河东路（金占·八字军抗）', F.jin],
  '陕西':              ['永兴军路·关陕（西军）', F.song],
  '四川':              ['川峡四路·成都府', F.song],
  '贵州':              ['夔州路（羁縻）', F.song],
  '云南':              ['大理国', F.dali],
  '朵甘思宣慰司':       ['朵甘思·吐蕃', F.tubo],
  '鞑靼土默特部':       ['西夏（河套·灵夏）', F.xixia],
  '乌思藏宣慰司':       ['乌思藏·吐蕃', F.tubo],
  '叶尔羌':            ['黑汗（喀喇汗）', F.xiyu],
  '吐鲁番':            ['高昌回鹘', F.xiyu],
  '哈萨克':            ['西域草原', F.xiyu],
  '瓦刺':              ['西域诸部', F.xiyu],
  '后金（盛京辽沈）':    ['金·东京辽阳府', F.jin],
  '苦兀（野人女真）':    ['生女真诸部', F.jin],
  '山东':              ['京东路（宋·义军前沿）', F.song],
  '北海道':            ['虾夷', F.japan],
  '九州':              ['日本·镇西', F.japan],
  '四国':              ['日本·南海道', F.japan],
  '北哈萨克':          ['西域草原（北）', F.xiyu],
  '东哈萨克':          ['西域草原（东）', F.xiyu],
  '后金（建州本部）':    ['金源·会宁府（女真本土）', F.jin],
  '科尔沁':            ['草原·阻卜', F.caoyuan],
  '北山女真':          ['生女真（北山）', F.jin],
  '北吕宋':            ['南海诸番（吕宋）', F.nanhai],
  '交趾':              ['大越·李朝', F.daiviet],
  '漠南诸部':          ['草原·阻卜（漠南）', F.caoyuan],
  '喀尔喀蒙古':         ['漠北·蒙兀诸部', F.caoyuan],
  '察哈尔':            ['草原·阻卜', F.caoyuan],
  '澳门（葡萄牙占）':    ['广南东路·香山', F.song],
  '本州':              ['日本·京畿（平安朝）', F.japan],
  '广东':              ['广南东路', F.song],
  '后金（辽东占领区）':  ['金·辽东', F.jin],
  '辽东（明·关宁东江）': ['金·东京道', F.jin],
  '朝鲜':              ['高丽', F.goryeo],
  '台湾':              ['流求（羁縻·南海）', F.song]
};

function clone(x) { return JSON.parse(JSON.stringify(x)); }

function remapRegion(r) {
  const m = MAP[r.name];
  const nr = clone(r);
  if (!m) {
    // 未在映射表(防御):标中立、清运行态,但保留几何
    nr.ownerKey = 'fac-neutral'; nr.ownerName = nr.factionName = '无主';
  } else {
    const [songName, fac] = m;
    nr.name = songName;
    nr.owner = fac.key; nr.ownerKey = fac.key;
    nr.initialOwner = fac.key; nr.initialOwnerKey = fac.key;
    nr.currentOwner = fac.key; nr.currentOwnerKey = fac.key;
    nr.controller = fac.key; nr.controllerKey = fac.key;
    nr.factionId = fac.key; nr.stableFactionId = fac.key;
    nr.ownerName = fac.name; nr.factionName = fac.name;
    nr.factionColor = fac.color; nr.color = fac.color;
  }
  // 清明代专属(避免南宋图里出现顺天府等)·运行态归中性
  nr.prefectures = []; nr.prefectureCount = 0;
  nr.localitiesSummary = ''; nr.adminBinding = '';
  nr.development = 50; nr.prosperity = 50; nr.troops = 0;
  nr.mood = 50; nr.unrest = 0; nr.taxPressure = 0; nr.armyPressure = 0; nr.officeRisk = 0;
  nr.events = []; nr.ownerHistory = [];
  // 几何字段(coords/points/polygon/center/centroid/path/neighbors/type/terrain)原样保留
  return nr;
}

function buildShaosongMap(tqMap) {
  const regions = (tqMap.regions || []).map(remapRegion);
  // 地图层势力注册表
  const factions = {};
  Object.keys(F).forEach((k) => {
    const f = F[k];
    factions[f.key] = { id: f.key, key: f.key, name: f.name, color: f.color };
  });
  const map = {
    id: 'map-shaosong-1127',
    name: '建炎元年·宋金对峙图',
    width: tqMap.width || 1200,
    height: tqMap.height || 720,
    enabled: true,
    source: 'shaosong-1127-repoliticized (geometry reused from official China base)',
    runtimeContract: tqMap.runtimeContract ? clone(tqMap.runtimeContract) : {
      mutable: true, aiReadable: true, ownershipMutable: true,
      liveState: 'GM.mapData', mirrors: ['P.map', 'P.mapData'],
      ownershipFields: ['owner', 'currentOwner', 'controller', 'ownerKey', 'currentOwnerKey'],
      mutableFields: ['owner', 'currentOwner', 'controller', 'occupiedBy', 'troops', 'development', 'prosperity']
    },
    factions: factions,
    roads: [],
    regions: regions,
    oceans: tqMap.oceans ? clone(tqMap.oceans) : [],
    localityLayer: { localities: [] }
  };
  return map;
}

// ── 注入到各制品(外科手术·只改绍宋 map/mapData/mapRuntimeContract)──
function injectIntoSourceJson(file, ssMap, label) {
  const sc = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (sc.id !== SS_ID) { console.warn('  ! ' + label + ' id 非绍宋(' + sc.id + ')·跳过'); return false; }
  sc.map = ssMap;
  sc.mapData = clone(ssMap);
  sc.mapRuntimeContract = clone(ssMap.runtimeContract);
  fs.writeFileSync(file, JSON.stringify(sc, null, 2), 'utf8');
  console.log('  ✓ ' + label + ' 注入完成(' + ssMap.regions.length + ' 区)');
  return true;
}

function main() {
  console.log('[build-shaosong-map] 读天启地理几何...');
  const tq = JSON.parse(fs.readFileSync(TQ_SRC, 'utf8'));
  if (!tq.map || !tq.map.regions) { console.error('天启源无 map·中止'); process.exit(1); }
  console.log('  天启 map: ' + tq.map.regions.length + ' 区');

  console.log('[build-shaosong-map] 重标为建炎元年宋金格局...');
  const ssMap = buildShaosongMap(tq.map);
  // 统计归属
  const byFac = {};
  ssMap.regions.forEach((r) => { byFac[r.ownerName] = (byFac[r.ownerName] || 0) + 1; });
  console.log('  归属分布: ' + Object.keys(byFac).map((k) => k + '×' + byFac[k]).join(' · '));

  console.log('[build-shaosong-map] 注入唯一真源...');
  injectIntoSourceJson(SS_SRC, ssMap, '源 JSON');
  if (fs.existsSync(GODOT_SS)) injectIntoSourceJson(GODOT_SS, ssMap, 'godot 副本');
  else console.log('  - godot 副本不存在·跳过');
  require('../web/scripts/sync-official-scenarios.js').sync({ check: false });

  console.log('[build-shaosong-map] 完成。');
}

if (require.main === module) main();
module.exports = { buildShaosongMap, MAP, F };
