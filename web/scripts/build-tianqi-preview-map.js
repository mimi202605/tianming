#!/usr/bin/env node
/* eslint-env node */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const webRoot = path.resolve(__dirname, '..');

const DEFAULT_MAP = 'C:/Users/37814/Downloads/ming-2________ming_2026-05-12.json';
const DEFAULT_SCENARIO = path.join(repoRoot, 'scenarios', '天启七年·九月（官方）.json');
const DEFAULT_PREVIEW_OUT = path.join(webRoot, 'preview', 'img', 'ming-1582-map-data.js');
const DEFAULT_ASSET_DIR = path.join(webRoot, 'data', 'maps', 'tianqi-ming2');
const DEFAULT_SUPPLEMENT = path.join(webRoot, 'data', 'scenario-supplements', 'tianqi7-ming2-historical-supplement.json');

const SEA_NAMES = new Set(['渤海', '黄海', '日本海', '东海', '台湾海峡', '南海', '东太平洋', '鄂霍茨克海']);

const STABLE_REGION_IDS = {
  北直隶: 'ming-01',
  南直隶: 'ming-02',
  浙江: 'ming-03',
  福建: 'ming-04',
  广东: 'ming-05',
  广西: 'ming-06',
  江西: 'ming-07',
  湖广: 'ming-08',
  河南: 'ming-09',
  山西: 'ming-10',
  陕西: 'ming-11',
  四川: 'ming-12',
  贵州: 'ming-13',
  云南: 'ming-14',
  朵甘思宣慰司: 'ming-15',
  鞑靼土默特部: 'ming-16',
  乌思藏宣慰司: 'ming-17',
  叶尔羌: 'ming-18',
  吐鲁番: 'ming-19',
  哈萨克: 'ming-20',
  瓦刺: 'ming-21',
  '后金（沈阳）': 'ming-22',
  山东: 'ming-26',
  辽东: 'ming-27',
  '辽东（明）': 'ming-28',
  朝鲜: 'ming-29',
  台湾: 'ming-30',
  澳门: 'ming-31',
};

const ADMIN_ALIAS = {
  北直隶: '北直隶',
  南直隶: '南直隶',
  浙江: '浙江布政使司',
  福建: '福建布政使司',
  广东: '广东布政使司',
  广西: '广西布政使司',
  江西: '江西布政使司',
  湖广: '湖广布政使司',
  河南: '河南布政使司',
  山西: '山西布政使司',
  陕西: '陕西布政使司',
  四川: '四川布政使司',
  贵州: '贵州布政使司',
  云南: '云南布政使司',
  山东: '山东布政使司',
  乌思藏宣慰司: '乌思藏都指挥使司',
  '辽东（明）': '辽东都指挥使司',
  '后金（沈阳）': '辽沈建州八旗辖区',
  '后金（建州）': '辽沈建州八旗辖区',
  科尔沁: '科尔沁东蒙古牧地',
  察哈尔: '察哈尔漠南牧地',
  朝鲜: '朝鲜八道',
  '澳门（葡萄牙占）': '澳门葡人租居地',
  台湾: '大员荷兰商馆区',
  北吕宋: '菲律宾马尼拉总督区',
};

const EXTRA_POWERS = {
  'fac-neutral-west': {
    label: '西域诸部',
    short: '西域',
    color: '#8f7544',
    line: '#d6bd79',
    note: '天启官方剧本未单列为核心势力，预览中作为边外诸部处理。',
  },
  'fac-mongol-outer': {
    label: '漠北诸部',
    short: '漠北',
    color: '#7a6d4c',
    line: '#cbb783',
    note: '天启官方剧本未细分此部，预览中保留为独立草原势力。',
  },
  'fac-jurchen-wild': {
    label: '野人女真',
    short: '女真',
    color: '#6a6451',
    line: '#b9a978',
    note: '非官方核心势力，作为东北边外部族底色。',
  },
  'fac-japan': {
    label: '日本诸国',
    short: '日本',
    color: '#68775d',
    line: '#bac98d',
    note: '天启官方剧本未单列日本势力，预览中作为域外势力显示。',
  },
  'fac-annam': {
    label: '安南诸部',
    short: '安南',
    color: '#567763',
    line: '#9bc4a5',
    note: '天启官方剧本未单列交趾势力，预览中作为域外势力显示。',
  },
};

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    args[key] = value;
  }
  return args;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pointTuple(point) {
  if (Array.isArray(point)) return [Number(point[0]), Number(point[1])];
  return [Number(point.x), Number(point.y)];
}

function collectBounds(divisions) {
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const division of divisions) {
    const rings = [division.polygon, ...(division.extraPolygons || []), ...(division.holes || [])].filter(Boolean);
    for (const ring of rings) {
      for (const point of ring) {
        const [x, y] = pointTuple(point);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        bounds.minX = Math.min(bounds.minX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.maxY = Math.max(bounds.maxY, y);
      }
    }
  }
  return bounds;
}

function buildFit(bounds, width, height) {
  const marginX = 56;
  const marginY = 50;
  const sourceW = bounds.maxX - bounds.minX;
  const sourceH = bounds.maxY - bounds.minY;
  const scale = Math.min((width - marginX * 2) / sourceW, (height - marginY * 2) / sourceH);
  return {
    scale,
    x: (width - sourceW * scale) / 2 - bounds.minX * scale,
    y: (height - sourceH * scale) / 2 - bounds.minY * scale,
  };
}

function tx(point, fit) {
  const [x, y] = pointTuple(point);
  return [x * fit.scale + fit.x, y * fit.scale + fit.y];
}

function formatNum(value) {
  return Number(value.toFixed(1));
}

function ringPath(ring, fit) {
  if (!Array.isArray(ring) || ring.length < 3) return '';
  const coords = ring.map(point => tx(point, fit)).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (coords.length < 3) return '';
  const [first, ...rest] = coords;
  return `M${formatNum(first[0])} ${formatNum(first[1])} ${rest.map(([x, y]) => `L${formatNum(x)} ${formatNum(y)}`).join(' ')} Z`;
}

function ringPoints(ring, fit) {
  if (!Array.isArray(ring) || ring.length < 3) return [];
  return ring
    .map(point => tx(point, fit))
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
    .map(([x, y]) => [formatNum(x), formatNum(y)]);
}

function flattenPoints(points) {
  return points.flatMap(([x, y]) => [x, y]);
}

function pointObjects(points) {
  return points.map(([x, y]) => ({ x, y }));
}

function divisionPath(division, fit) {
  return [division.polygon, ...(division.extraPolygons || []), ...(division.holes || [])]
    .map(ring => ringPath(ring, fit))
    .filter(Boolean)
    .join(' ');
}

function scaledCentroid(division, fit) {
  if (division.centroid && Number.isFinite(division.centroid.x) && Number.isFinite(division.centroid.y)) {
    const [x, y] = tx(division.centroid, fit);
    return { cx: formatNum(x), cy: formatNum(y) };
  }
  const points = (division.polygon || []).map(point => tx(point, fit));
  const avg = points.reduce((acc, [x, y]) => {
    acc.x += x;
    acc.y += y;
    return acc;
  }, { x: 0, y: 0 });
  return { cx: formatNum(avg.x / points.length), cy: formatNum(avg.y / points.length) };
}

function normalizeName(name) {
  return String(name || '')
    .replace(/[（）()·\s]/g, '')
    .replace(/布政使司|都指挥使司|宣慰司|八道|牧地|辖区|租居地|商馆区|总督区/g, '');
}

function supplementPower(factionId, faction) {
  const color = faction.color || '#8a6c3d';
  const name = faction.name || factionId;
  let type = faction.type || faction.factionType || '';
  if (!type && /幕府|日本/.test(name)) type = '幕藩国家';
  if (!type && /汗国|叶尔羌|哈萨克/.test(name)) type = '汗国';
  if (!type && /蒙古|瓦刺|土默特|喀尔喀/.test(name)) type = '游牧部盟';
  if (!type && /女真|虾夷|阿伊努/.test(name)) type = '边外部落联盟';
  if (!type && /大越/.test(name)) type = '分裂王国';
  if (!type) type = '历史补丁势力';
  return {
    label: name,
    short: shortFactionName(name),
    color,
    line: lighten(color, 0.35),
    note: faction.desc || faction.description || `${name}为历史补丁补入的地图势力。`,
    type,
    score: Number(faction.strength) || 50,
    sourceRefs: faction.sourceRefs || [],
    isSupplement: true,
  };
}

function inferTags(record) {
  const text = [record.name, record.terrain, record.specialResources, record.description].filter(Boolean).join(' ');
  return {
    hasPort: /海|港|岛|台湾|澳门|吕宋|九州|四国|北海道|松前|海岸|航路/.test(text),
    saltRegion: /盐|海/.test(text),
    mineralRegion: /矿|银|铜|铁|金属|玉/.test(text),
    horseRegion: /马|牧|草原|骑/.test(text),
    fishingRegion: /鱼|渔|海|鲱|昆布/.test(text),
    imperialDomain: false,
  };
}

function supplementPopulationDetail(record) {
  const pop = Math.max(0, Number(record.population) || 0);
  return {
    households: Math.round(pop / 5),
    mouths: pop,
    ding: Math.round(pop * 0.42),
    fugitives: Math.round(pop * 0.015),
    hiddenCount: Math.round(pop * (record.regionType === 'foreign_shogunate' ? 0.08 : 0.12)),
  };
}

function supplementEconomy(record) {
  const pop = Math.max(0, Number(record.population) || 0);
  const prosperity = Math.max(20, Number(record.prosperity) || 45);
  const tags = record.tags || inferTags(record);
  const nomadic = /nomadic|tribal|frontier|牧|草原|部/.test([record.regionType, record.description, record.terrain].filter(Boolean).join(' '));
  const farmland = nomadic ? Math.round(pop * 0.005) : Math.round(pop * 0.018);
  const commerceVolume = Math.round(pop * prosperity * (tags.hasPort ? 0.18 : 0.08));
  return {
    farmland,
    commerceCoefficient: Number((prosperity / 50).toFixed(2)),
    commerceVolume,
    maritimeTradeVolume: tags.hasPort ? Math.round(commerceVolume * 0.55) : 0,
    saltProduction: tags.saltRegion ? Math.round(pop * 0.015) : 0,
    mineralProduction: tags.mineralRegion ? Math.round(pop * 0.01) : 0,
    horseProduction: tags.horseRegion ? Math.round(pop * 0.09) : 0,
    fishingProduction: tags.fishingRegion ? Math.round(pop * 0.035) : 0,
    imperialFarmland: 0,
    imperialAssets: { zhizao: 0, kuangchang: tags.mineralRegion ? 1 : 0, yuyao: 0 },
    postRelays: Math.max(0, Math.round(prosperity / 12)),
    kejuQuota: /foreign|nomadic|tribal|jimi|frontier/.test(record.regionType || '') ? 0 : Math.round(pop / 120000),
    roadQuality: Math.round(Math.min(72, Math.max(24, prosperity + (tags.hasPort ? 5 : -4)))),
    landsAnnexed: 0,
    landsReclaimed: Math.round(farmland * 0.05),
    landsSurveyed: Math.round(farmland * 0.42),
    disasterRecord: record.recentDisasters || [],
  };
}

function supplementFiscal(record) {
  const pop = Math.max(0, Number(record.population) || 0);
  const prosperity = Math.max(20, Number(record.prosperity) || 45);
  const light = record.taxLevel === '轻';
  const heavy = record.taxLevel === '重';
  const claimedRevenue = Math.round(pop * (heavy ? 0.11 : light ? 0.035 : 0.065) * prosperity);
  const compliance = /foreign|nomadic|tribal|jimi|frontier/.test(record.regionType || '') ? 0.42 : 0.68;
  return {
    claimedRevenue,
    actualRevenue: Math.round(claimedRevenue * compliance),
    remittedToCenter: Math.round(claimedRevenue * compliance * 0.18),
    retainedBudget: Math.round(claimedRevenue * compliance * 0.52),
    compliance,
    skimmingRate: /tribal|nomadic|jimi|foreign/.test(record.regionType || '') ? 0.08 : 0.14,
    autonomyLevel: /foreign|nomadic|tribal/.test(record.regionType || '') ? 0.86 : record.regionType === 'jimi' ? 0.74 : 0.45,
  };
}

function normalizeSupplementAdmin(name, record) {
  const popDetail = record.populationDetail || supplementPopulationDetail(record);
  const economyBase = record.economyBase || supplementEconomy(record);
  const fiscalDetail = record.fiscalDetail || supplementFiscal(record);
  const publicTreasuryInit = record.publicTreasuryInit || {
    money: Math.round(fiscalDetail.actualRevenue * 0.7),
    grain: Math.round(popDetail.mouths * (/nomadic|tribal/.test(record.regionType || '') ? 0.25 : 1.1)),
    cloth: Math.round(popDetail.mouths * 0.03),
  };
  return {
    level: 'province',
    taxLevel: '中',
    minxinLocal: Math.round(Number(record.prosperity) || 50),
    corruptionLocal: /foreign|nomadic|tribal|jimi/.test(record.regionType || '') ? 18 : 28,
    ...record,
    name: record.name || name,
    id: record.id || `supp-${normalizeName(name)}`,
    populationDetail: popDetail,
    economyBase,
    fiscalDetail,
    publicTreasuryInit,
    tags: record.tags || inferTags(record),
    isSupplement: true,
  };
}

function buildScenarioBindings(scenario, supplement = {}) {
  const factionColors = new Map();
  const factionTypes = new Map();
  const factionByName = new Map();
  for (const faction of scenario.factions || []) {
    factionColors.set(faction.name, faction.color || '#8a6c3d');
    factionTypes.set(faction.name, faction.type || '');
    factionByName.set(faction.name, { ...faction });
  }

  const adminByName = new Map();
  const adminByNormalized = new Map();
  const powers = {};
  const adminHierarchy = {};
  const scenarioFactions = {};

  for (const [groupKey, group] of Object.entries(scenario.adminHierarchy || {})) {
    const factionId = group.factionId || groupKey;
    const factionName = group.factionName || groupKey;
    const color = factionColors.get(factionName) || group.color || '#8a6c3d';
    powers[factionId] = {
      label: factionName,
      short: shortFactionName(factionName),
      color,
      line: lighten(color, 0.35),
      note: `${factionName}在天启官方剧本中的初始控制范围。`,
      type: factionTypes.get(factionName) || '',
      score: factionId === 'fac-ming' ? 28 : 72,
    };
    scenarioFactions[factionId] = factionByName.get(factionName) || null;
    adminHierarchy[groupKey] = {
      factionId,
      factionName,
      divisions: [],
    };
    for (const division of group.divisions || []) {
      const record = { ...division, factionId, factionName, groupKey };
      adminByName.set(division.name, record);
      adminByNormalized.set(normalizeName(division.name), record);
      adminHierarchy[groupKey].divisions.push({ ...division });
    }
  }

  const supplementPowers = {};
  for (const [factionId, faction] of Object.entries(supplement.factions || {})) {
    if (!powers[factionId]) supplementPowers[factionId] = supplementPower(factionId, faction);
    if (!scenarioFactions[factionId]) {
      const power = supplementPowers[factionId] || supplementPower(factionId, faction);
      scenarioFactions[factionId] = { id: factionId, type: power.type, ...faction, isSupplement: true };
    }
  }

  for (const [name, sourceRecord] of Object.entries(supplement.adminRecords || {})) {
    const record = normalizeSupplementAdmin(name, sourceRecord);
    if (adminByName.has(name) || adminByName.has(record.name) || adminByNormalized.has(normalizeName(name)) || adminByNormalized.has(normalizeName(record.name))) {
      continue;
    }
    const factionId = record.factionId || 'fac-ming';
    const factionName = record.factionName || supplementPowers[factionId]?.label || factionId;
    const groupKey = `supplement-${factionId}`;
    const withFaction = { ...record, factionId, factionName, groupKey };
    adminByName.set(name, withFaction);
    adminByName.set(record.name, withFaction);
    adminByNormalized.set(normalizeName(name), withFaction);
    adminByNormalized.set(normalizeName(record.name), withFaction);
    if (!adminHierarchy[groupKey]) {
      adminHierarchy[groupKey] = { factionId, factionName, isSupplement: true, divisions: [] };
    }
    adminHierarchy[groupKey].divisions.push({ ...withFaction });
  }

  return {
    powers: { ...powers, ...EXTRA_POWERS, ...supplementPowers },
    scenarioFactions,
    adminByName,
    adminByNormalized,
    adminHierarchy,
    supplementMeta: {
      id: supplement.id || null,
      name: supplement.name || null,
      sourceCatalog: supplement.sourceCatalog || {},
      dataConfidenceNote: supplement.dataConfidenceNote || '',
    },
  };
}

function shortFactionName(name) {
  if (name === '明朝廷') return '明';
  if (name.includes('葡萄牙')) return '葡';
  if (name.includes('荷兰')) return '荷';
  if (name.includes('西班牙')) return '西';
  if (name.includes('科尔沁')) return '科';
  if (name.includes('郑氏')) return '郑';
  if (name.includes('陕北')) return '饥';
  if (name.includes('奢安')) return '奢';
  return name.slice(0, 2);
}

function hexToRgb(hex) {
  const clean = String(hex || '#8a6c3d').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(x => x + x).join('') : clean.padEnd(6, '0').slice(0, 6);
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
}

function rgbToHex(rgb) {
  return `#${rgb.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

function lighten(hex, amount) {
  const rgb = hexToRgb(hex);
  return rgbToHex(rgb.map(v => v + (255 - v) * amount));
}

function matchAdmin(division, bindings) {
  const aliased = ADMIN_ALIAS[division.name];
  if (aliased && bindings.adminByName.has(aliased)) return bindings.adminByName.get(aliased);
  if (bindings.adminByName.has(division.name)) return bindings.adminByName.get(division.name);
  const normalized = normalizeName(aliased || division.name);
  return bindings.adminByNormalized.get(normalized) || null;
}

function inferOwnerKey(division, admin) {
  if (admin) return admin.factionId;
  const name = division.name;
  if (['朵甘思宣慰司'].includes(name)) return 'fac-ming';
  if (['辽东', '后金（沈阳）', '后金（建州）'].includes(name)) return 'fac-later-jin';
  if (['科尔沁'].includes(name)) return 'fac-khorchin';
  if (['察哈尔', '漠南诸部'].includes(name)) return 'fac-chahar';
  if (['鞑靼土默特部'].includes(name)) return 'fac-tumed';
  if (['喀尔喀蒙古'].includes(name)) return 'fac-khalkha';
  if (['苦兀（野人女真）', '北山女真'].includes(name)) return 'fac-wild-jurchen';
  if (['叶尔羌'].includes(name)) return 'fac-yarkand';
  if (['吐鲁番'].includes(name)) return 'fac-turpan';
  if (['哈萨克', '北哈萨克', '东哈萨克'].includes(name)) return 'fac-kazakh';
  if (['瓦刺'].includes(name)) return 'fac-oirat';
  if (['北海道'].includes(name)) return 'fac-matsumae-ainu';
  if (['本州', '九州', '四国'].includes(name)) return 'fac-tokugawa-japan';
  if (['交趾'].includes(name)) return 'fac-dai-viet';
  return 'fac-ming';
}

function exactMapId(name, fallbackIndex) {
  if (name === '澳门（葡萄牙占）') return STABLE_REGION_IDS.澳门;
  return STABLE_REGION_IDS[name] || `ming2-${String(fallbackIndex + 1).padStart(2, '0')}`;
}

function formatWan(value, unit = '') {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return '未载';
  const wan = num / 10000;
  const fixed = wan >= 100 ? wan.toFixed(0) : wan >= 10 ? wan.toFixed(1) : wan.toFixed(2);
  return `${fixed}万${unit}`;
}

function disasterText(admin) {
  const disasters = admin?.recentDisasters;
  if (Array.isArray(disasters) && disasters.length) return disasters.join('、');
  if (typeof disasters === 'string' && disasters.trim()) return disasters;
  return '未见大灾';
}

function threatText(admin, ownerKey) {
  const threats = admin?.threats;
  if (Array.isArray(threats) && threats.length) return threats.join('、');
  if (typeof threats === 'string' && threats.trim()) return threats;
  return ownerKey === 'fac-ming' ? '常备巡防' : '边外自守';
}

function buildModes(division, admin, ownerKey, power) {
  const minxin = Number(admin?.minxinLocal ?? division.prosperity ?? 55);
  const corruption = Number(admin?.corruptionLocal ?? 35);
  const compliance = Number(admin?.fiscalDetail?.compliance ?? 0.68);
  const skimming = Number(admin?.fiscalDetail?.skimmingRate ?? 0.12);
  const autonomy = Number(admin?.fiscalDetail?.autonomyLevel ?? (ownerKey === 'fac-ming' ? 0.25 : 0.75));
  const prosperity = Number(admin?.prosperity ?? division.prosperity ?? 50);
  const coast = Boolean(admin?.tags?.hasPort || /海|岛|澳门|台湾|广东|福建|浙江|山东|辽东|朝鲜|日本|吕宋/.test(division.name));
  const frontier = ownerKey !== 'fac-ming' || /辽东|后金|蒙古|女真|乌思藏|哈萨克|瓦刺|吐鲁番|叶尔羌|朵甘思/.test(division.name);
  const mountain = /山地|高原|丘陵|山|岭|藏|云贵/.test(admin?.terrain || division.terrain || division.description || '');
  const disasterPressure = disasterText(admin) === '未见大灾' ? 18 : 54;
  const unrest = clamp(100 - minxin + corruption * 0.18 + disasterPressure * 0.22 + (frontier ? 8 : 0), 0, 100);
  const taxPressure = clamp((1 - compliance) * 82 + skimming * 100 + (admin?.taxLevel === '重' ? 14 : 0) + (prosperity < 45 ? 8 : 0), 0, 100);
  const armyPressure = clamp((frontier ? 62 : 22) + (coast ? 13 : 0) + (mountain ? 8 : 0) + (ownerKey === 'fac-later-jin' ? 12 : 0), 0, 100);
  const officeRisk = clamp(corruption * 0.72 + autonomy * 34 + (admin?.governor ? 0 : 15) + (frontier ? 7 : 0), 0, 100);
  const implementation = clamp(100 - officeRisk + compliance * 12, 0, 100);
  const famine = clamp(disasterPressure + (prosperity < 45 ? 18 : 0) + (mountain ? 6 : 0), 0, 100);
  const taxSilver = formatWan(admin?.fiscalDetail?.actualRevenue ?? admin?.fiscalDetail?.claimedRevenue, '两');
  const grain = formatWan(admin?.publicTreasuryInit?.grain, '石');
  const deliver = `${Math.round(compliance * 100)}%`;

  return {
    mood: {
      score: Math.round((unrest + famine) / 2),
      title: '民情压力',
      primary: '民心',
      primaryValue: String(Math.round(minxin)),
      secondary: '灾情',
      secondaryValue: disasterText(admin),
      issue: unrest >= 66 ? '地方不靖' : '民情可控',
      detail: `民心 ${Math.round(minxin)} · 灾情 ${disasterText(admin)} · ${power.short}辖`,
    },
    tax: {
      score: Math.round(taxPressure),
      title: '财赋压力',
      primary: '缴率',
      primaryValue: deliver,
      secondary: '税粮',
      secondaryValue: `${taxSilver} / ${grain}`,
      issue: taxPressure >= 66 ? '财赋链条吃紧' : '财赋尚可',
      detail: `实收 ${taxSilver} · 粮储 ${grain} · 漏耗 ${Math.round(skimming * 100)}%`,
    },
    army: {
      score: Math.round(armyPressure),
      title: '军防压力',
      primary: '军情',
      primaryValue: threatText(admin, ownerKey),
      secondary: '地势',
      secondaryValue: admin?.terrain || division.terrain || '未载',
      issue: armyPressure >= 66 ? '军务需议' : '守备常态',
      detail: `${threatText(admin, ownerKey)} · ${coast ? '海防相关' : '陆防相关'} · ${frontier ? '边地' : '腹里'}`,
    },
    office: {
      score: Math.round(officeRisk),
      title: '官守风险',
      primary: '执行',
      primaryValue: `${Math.round(implementation)}%`,
      secondary: '官员',
      secondaryValue: admin?.governor || division.governor || '未署',
      issue: officeRisk >= 66 ? '官守需整' : '官守尚稳',
      detail: `贪墨 ${Math.round(corruption)} · 自主 ${Math.round(autonomy * 100)}% · ${admin?.officialPosition || division.officialPosition || '职官未载'}`,
    },
  };
}

function metricColor(score) {
  const s = clamp(Number(score) || 0, 0, 100);
  if (s < 50) return mix('#2f8069', '#dfb95f', s / 50);
  return mix('#dfb95f', '#b6362c', (s - 50) / 50);
}

function mix(a, b, t) {
  const aa = hexToRgb(a);
  const bb = hexToRgb(b);
  return rgbToHex(aa.map((value, index) => value + (bb[index] - value) * clamp(t, 0, 1)));
}

function scoreTone(score) {
  if (score >= 76) return '危';
  if (score >= 58) return '警';
  if (score >= 38) return '待';
  return '稳';
}

function inferNeighbors(regions, epsilon = 0.75) {
  const edgeMap = new Map();
  for (const region of regions) {
    const points = region.points || [];
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      if (!a || !b) continue;
      const key = edgeKey(a, b, epsilon);
      if (!edgeMap.has(key)) edgeMap.set(key, []);
      edgeMap.get(key).push(region.id);
    }
  }
  const neighborSets = new Map(regions.map(region => [region.id, new Set(region.neighbors || [])]));
  for (const ids of edgeMap.values()) {
    const unique = [...new Set(ids)];
    if (unique.length < 2) continue;
    for (const a of unique) {
      for (const b of unique) {
        if (a !== b) neighborSets.get(a).add(b);
      }
    }
  }
  for (const region of regions) {
    region.neighbors = [...neighborSets.get(region.id)].filter(id => id && id !== region.id).sort();
  }
}

function edgeKey(a, b, epsilon) {
  const qa = quantPoint(a, epsilon);
  const qb = quantPoint(b, epsilon);
  return qa < qb ? `${qa}|${qb}` : `${qb}|${qa}`;
}

function quantPoint(point, epsilon) {
  return `${Math.round(point[0] / epsilon)},${Math.round(point[1] / epsilon)}`;
}

function scenarioOwnerId(ownerKey, bindings) {
  const faction = bindings.scenarioFactions && bindings.scenarioFactions[ownerKey];
  return faction && faction.id ? faction.id : ownerKey;
}

function buildRegion(division, index, fit, bindings) {
  const admin = matchAdmin(division, bindings);
  const ownerKey = inferOwnerKey(division, admin);
  const power = bindings.powers[ownerKey] || bindings.powers['fac-ming'];
  const { cx, cy } = scaledCentroid(division, fit);
  const points = ringPoints(division.polygon, fit);
  const modes = buildModes(division, admin, ownerKey, power);
  for (const mode of Object.values(modes)) {
    mode.color = metricColor(mode.score);
    mode.tone = scoreTone(mode.score);
  }
  const households = formatWan(admin?.populationDetail?.households ?? (admin?.population ? admin.population / 5 : division.population / 5), '户');
  const tax = formatWan(admin?.fiscalDetail?.actualRevenue ?? admin?.fiscalDetail?.claimedRevenue, '两');
  const grain = formatWan(admin?.publicTreasuryInit?.grain, '石');
  const deliver = modes.tax.primaryValue;
  const levelLabel = admin?.level === 'province' || division.level === 'province' ? '省级地块' : (admin?.level || division.level || '地块');
  const terrain = admin?.terrain || division.terrain || '未载';
  const control = ownerKey === 'fac-ming' ? '朝廷辖地' : `${power.label}辖地`;
  const focus = admin?.specialResources || admin?.strategicValue || admin?.description || division.description || '未载';
  const issue = modes.mood.issue;
  const culture = admin?.specialCulture || Object.keys(admin?.byEthnicity || {}).join('、') || '未载';
  const action = ownerKey === 'fac-ming' ? '查财赋、问民情、整官守' : '侦边情、察盟约、定守御';
  const hierarchy = {
    realm: '天下',
    region: power.label,
    prefecture: division.name,
  };

  return {
    id: exactMapId(division.name, index),
    sourceId: division.id,
    title: division.name,
    d: divisionPath(division, fit),
    cx,
    cy,
    center: [cx, cy],
    centroid: { x: cx, y: cy },
    coords: flattenPoints(points),
    points,
    polygon: pointObjects(points),
    neighbors: (division.neighbors || []).slice(),
    color: power.color,
    order: index + 1,
    sourceColor: division.bitmap_color || division.colorKey || null,
    ownerKey,
    factionId: ownerKey,
    factionName: power.label,
    factionColor: power.color,
    officialName: admin?.name || ADMIN_ALIAS[division.name] || null,
    bindingNote: admin ? '天启官方剧本行政区划绑定' : '地图扩展地块，按天启剧本势力外延推定',
    level: levelLabel,
    levelLabel,
    control,
    terrain,
    focus,
    issue,
    guard: modes.army.primaryValue,
    households,
    tax,
    grain,
    mood: Number(admin?.minxinLocal ?? division.prosperity ?? 55),
    deliver,
    culture,
    action,
    famine: modes.mood.score,
    unrest: modes.mood.score,
    taxPressure: modes.tax.score,
    armyPressure: modes.army.score,
    officeRisk: modes.office.score,
    corruption: Number(admin?.corruptionLocal ?? 35),
    vacancy: admin?.governor ? 12 : 60,
    implementation: Number.parseInt(modes.office.primaryValue, 10),
    hierarchy,
    modes,
    breadcrumb: `${hierarchy.realm} · ${hierarchy.region} · ${hierarchy.prefecture}`,
    prefLabel: admin?.officialPosition || division.officialPosition || division.name,
    admin: admin ? { ...admin } : null,
  };
}

function buildOcean(division, index, fit) {
  const { cx, cy } = scaledCentroid(division, fit);
  const points = ringPoints(division.polygon, fit);
  return {
    id: `sea-${String(index + 1).padStart(2, '0')}`,
    sourceId: division.id,
    title: division.name,
    d: divisionPath(division, fit),
    cx,
    cy,
    center: [cx, cy],
    centroid: { x: cx, y: cy },
    coords: flattenPoints(points),
    points,
    polygon: pointObjects(points),
    color: '#5f8178',
    order: index + 1,
  };
}

function centerOf(regions, matcher) {
  const hits = regions.filter(matcher);
  if (!hits.length) return null;
  return {
    x: formatNum(hits.reduce((sum, r) => sum + Number(r.cx), 0) / hits.length),
    y: formatNum(hits.reduce((sum, r) => sum + Number(r.cy), 0) / hits.length),
  };
}

function buildRealmLabels(regions, oceans) {
  const ming = centerOf(regions, r => r.ownerKey === 'fac-ming');
  const laterJin = centerOf(regions, r => r.ownerKey === 'fac-later-jin');
  const mongol = centerOf(regions, r => ['fac-chahar', 'fac-khorchin', 'fac-mongol-outer', 'fac-tumed', 'fac-khalkha'].includes(r.ownerKey));
  const west = centerOf(regions, r => ['fac-neutral-west', 'fac-yarkand', 'fac-turpan', 'fac-kazakh', 'fac-oirat'].includes(r.ownerKey));
  const japan = centerOf(regions, r => ['fac-japan', 'fac-tokugawa-japan', 'fac-matsumae-ainu'].includes(r.ownerKey));
  const sea = centerOf(oceans, r => ['东海', '南海'].includes(r.title));
  return [
    ming && { text: '大明', sub: '两京十三省', x: ming.x + 18, y: ming.y + 6, size: 38, rot: -5 },
    laterJin && { text: '后金', sub: '辽沈建州', x: laterJin.x, y: laterJin.y - 4, size: 26, rot: -3 },
    mongol && { text: '蒙古诸部', sub: '漠南漠北', x: mongol.x, y: mongol.y - 4, size: 25, rot: -6 },
    west && { text: '西域诸部', sub: '叶尔羌诸境', x: west.x, y: west.y, size: 24, rot: -4 },
    japan && { text: '日本', sub: '列岛诸国', x: japan.x, y: japan.y, size: 22, rot: -8 },
    sea && { text: '东海', sub: '海域', x: sea.x + 40, y: sea.y + 20, size: 22, rot: -8, kind: 'sea' },
  ].filter(Boolean);
}

function buildEvents(regions) {
  const byTitle = Object.fromEntries(regions.map(region => [region.title, region]));
  const eventSpecs = [
    ['drought', '北直隶', 'mood', 'hot', '旱', '京畿春旱', '常平仓请开，民心与粮价同受牵动。', -18, -14],
    ['liao-pay', '辽东（明）', 'army', 'hot', '饷', '辽饷待拨', '辽东边饷需补拨，军务压力抬升。', -12, 16],
    ['canal', '南直隶', 'tax', 'ok', '漕', '江南漕运', '漕粮入库顺畅，可缓北方赈济压力。', 16, -16],
    ['sea-tax', '广东', 'tax', 'warn', '税', '海税漏征', '市舶抽分与私贩并行，户部请核关。', 10, 15],
    ['chieftain', '云南', 'office', 'warn', '土', '土司观望', '改土归流复议未决，地方官守需稳住。', 10, -10],
  ];
  return eventSpecs
    .filter(([, title]) => byTitle[title])
    .map(([id, title, mode, severity, icon, label, note, dx, dy]) => ({
      id,
      region: byTitle[title].id,
      mode,
      severity,
      icon,
      label,
      note,
      dx,
      dy,
    }));
}

function buildRoutes(regions) {
  const byTitle = Object.fromEntries(regions.map(region => [region.title, region]));
  function route(a, b, mode, severity, bend = 0) {
    const ra = byTitle[a];
    const rb = byTitle[b];
    if (!ra || !rb) return null;
    const ax = Number(ra.cx);
    const ay = Number(ra.cy);
    const bx = Number(rb.cx);
    const by = Number(rb.cy);
    const cx = (ax + bx) / 2 + bend;
    const cy = (ay + by) / 2 - Math.abs(bend) * 0.28;
    return { mode, severity, d: `M${formatNum(ax)} ${formatNum(ay)} Q${formatNum(cx)} ${formatNum(cy)} ${formatNum(bx)} ${formatNum(by)}` };
  }
  return [
    route('北直隶', '辽东（明）', 'army', 'hot', 46),
    route('南直隶', '北直隶', 'tax', 'ok', -22),
    route('广东', '福建', 'tax', 'warn', 24),
  ].filter(Boolean);
}

function buildOwnerScenarios(regions) {
  const byTitle = Object.fromEntries(regions.map(region => [region.title, region.id]));
  return [
    { label: '天启初始', changes: {} },
    {
      label: '辽东失守推演',
      changes: byTitle['辽东（明）'] ? { [byTitle['辽东（明）']]: 'fac-later-jin' } : {},
    },
    {
      label: '台海商势推演',
      changes: byTitle.台湾 ? { [byTitle.台湾]: 'fac-zheng-maritime' } : {},
    },
    {
      label: '朝廷整饬推演',
      changes: {
        ...(byTitle['辽东（明）'] ? { [byTitle['辽东（明）']]: 'fac-ming' } : {}),
        ...(byTitle.台湾 ? { [byTitle.台湾]: 'fac-dutch-formosa' } : {}),
      },
    },
  ];
}

function ownerGradient(regions, powers) {
  const ownerKeys = [...new Set(regions.map(region => region.ownerKey))].filter(key => powers[key]).slice(0, 8);
  if (ownerKeys.length <= 1) return powers[ownerKeys[0]]?.color || '#c9a84c';
  const step = 100 / (ownerKeys.length - 1);
  return `linear-gradient(90deg,${ownerKeys.map((key, index) => `${powers[key].color} ${Math.round(index * step)}%`).join(',')})`;
}

function main() {
  const args = parseArgs(process.argv);
  const mapFile = path.resolve(args.map || DEFAULT_MAP);
  const scenarioFile = path.resolve(args.scenario || DEFAULT_SCENARIO);
  const previewOut = path.resolve(args['preview-out'] || DEFAULT_PREVIEW_OUT);
  const assetDir = path.resolve(args['asset-dir'] || DEFAULT_ASSET_DIR);
  const supplementFile = args.supplement === 'none' ? null : path.resolve(args.supplement || DEFAULT_SUPPLEMENT);
  const sourceMap = readJson(mapFile);
  const scenario = readJson(scenarioFile);
  const supplement = supplementFile && fs.existsSync(supplementFile) ? readJson(supplementFile) : {};
  const bindings = buildScenarioBindings(scenario, supplement);
  const bounds = collectBounds(sourceMap.divisions || []);
  const fit = buildFit(bounds, 1200, 720);
  const landDivisions = [];
  const seaDivisions = [];
  for (const division of sourceMap.divisions || []) {
    if (SEA_NAMES.has(division.name)) seaDivisions.push(division);
    else landDivisions.push(division);
  }
  const regions = landDivisions.map((division, index) => buildRegion(division, index, fit, bindings));
  const oceans = seaDivisions.map((division, index) => buildOcean(division, index, fit));
  inferNeighbors(regions, 0.75);
  const initialOwners = Object.fromEntries(regions.map(region => [region.id, region.ownerKey]));
  const realmLabels = buildRealmLabels(regions, oceans);
  const events = buildEvents(regions);
  const routes = buildRoutes(regions);
  const scenarios = buildOwnerScenarios(regions);
  const basemap = {
    imageHref: '',
    landPaths: regions.map(region => region.d),
    lakePaths: [],
    riverPaths: [],
    geoLabels: [
      ...realmLabels.map(label => ({
        text: label.text,
        x: label.x,
        y: label.y,
        kind: label.kind || (label.size <= 22 ? 'small' : ''),
      })),
      ...oceans.map(ocean => ({ text: ocean.title, x: ocean.cx, y: ocean.cy, kind: 'sea' })),
    ],
  };
  const meta = {
    id: 'tianqi-ming2',
    name: '天启七年新舆图',
    sourceMap: mapFile,
    sourceScenario: scenarioFile,
    sourceSupplement: supplementFile || null,
    supplementId: bindings.supplementMeta.id,
    supplementName: bindings.supplementMeta.name,
    dataConfidenceNote: bindings.supplementMeta.dataConfidenceNote,
    generatedAt: new Date().toISOString(),
    width: 1200,
    height: 720,
    landRegionCount: regions.length,
    oceanRegionCount: oceans.length,
    unboundLandRegions: regions.filter(region => !region.admin).map(region => region.title),
    notes: [
      '海域地块进入 MING_MAP_OCEANS，不进入可选中 MING_MAP_REGIONS。',
      '陆地地块优先绑定天启官方剧本 adminHierarchy；官方剧本未覆盖的域外/羁縻地块由历史补丁补齐。',
      '输出仅供 Phase 8 预览页使用，正式游戏 UI 未改动。',
    ],
  };
  const ownerMeta = {
    defaultOwner: 'fac-ming',
    gradient: ownerGradient(regions, bindings.powers),
  };
  const js = [
    '// Generated by web/scripts/build-tianqi-preview-map.js.',
    '// Source map: ming-2________ming_2026-05-12.json; scenario: 天启七年·九月（官方）.json.',
    '(function(){',
    `window.MING_MAP_SOURCE_META=${JSON.stringify(meta, null, 2)};`,
    `window.MING_HISTORICAL_SOURCE_CATALOG=${JSON.stringify(bindings.supplementMeta.sourceCatalog, null, 2)};`,
    `window.MING_OWNER_POWERS_DATA=${JSON.stringify(bindings.powers, null, 2)};`,
    `window.MING_FACTION_SCENARIO_DATA=${JSON.stringify(bindings.scenarioFactions, null, 2)};`,
    `window.MING_OWNER_META=${JSON.stringify(ownerMeta, null, 2)};`,
    `window.MING_OWNER_INITIAL_DATA=${JSON.stringify(initialOwners, null, 2)};`,
    `window.MING_OWNER_SCENARIOS_DATA=${JSON.stringify(scenarios, null, 2)};`,
    `window.MING_MAP_EVENTS_DATA=${JSON.stringify(events, null, 2)};`,
    `window.MING_MAP_ROUTES_DATA=${JSON.stringify(routes, null, 2)};`,
    `window.MING_MAP_OCEANS=${JSON.stringify(oceans, null, 2)};`,
    `window.MING_REALM_LABELS=${JSON.stringify(realmLabels, null, 2)};`,
    `window.EAST_ASIA_BASEMAP=${JSON.stringify(basemap, null, 2)};`,
    `window.MING_MAP_REGIONS=${JSON.stringify(regions, null, 2)};`,
    '})();',
    '',
  ].join('\n');

  ensureDir(path.dirname(previewOut));
  ensureDir(assetDir);
  fs.writeFileSync(previewOut, js, 'utf8');
  fs.writeFileSync(path.join(assetDir, 'tianqi-ming2.preview-data.js'), js, 'utf8');
  fs.writeFileSync(path.join(assetDir, 'tianqi-ming2.historical-supplement.json'), `${JSON.stringify(supplement, null, 2)}\n`, 'utf8');

  const gameMap = {
    id: 'tianqi-ming2',
    name: '天启七年新舆图',
    width: 1200,
    height: 720,
    enabled: true,
    source: meta,
    runtimeContract: {
      mutable: true,
      aiReadable: true,
      ownershipMutable: true,
      liveState: 'GM.mapData',
      mirrors: ['P.map', 'P.mapData'],
      ownershipFields: ['owner', 'currentOwner', 'controller', 'ownerKey', 'currentOwnerKey'],
      mutableFields: ['owner', 'currentOwner', 'controller', 'occupiedBy', 'troops', 'development', 'prosperity', 'mood', 'taxPressure', 'armyPressure', 'officeRisk', 'data']
    },
    factions: Object.fromEntries(Object.entries(bindings.powers).map(([key, value]) => {
      const scenarioFaction = bindings.scenarioFactions && bindings.scenarioFactions[key];
      return [key, {
        ...value,
        scenarioFactionId: scenarioFaction && scenarioFaction.id ? scenarioFaction.id : key,
        scenarioFactionName: scenarioFaction && scenarioFaction.name ? scenarioFaction.name : value.label,
      }];
    })),
    roads: [],
    regions: regions.map(region => ({
      id: region.id,
      sourceId: region.sourceId,
      name: region.title,
      type: 'poly',
      coords: region.coords,
      points: region.points,
      polygon: region.polygon,
      center: region.center,
      path: region.d,
      d: region.d,
      centroid: region.centroid,
      neighbors: region.neighbors || [],
      terrain: region.terrain,
      resources: String(region.admin?.specialResources || region.focus || '')
        .split(/[、，,·\s]+/)
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, 8),
      owner: scenarioOwnerId(region.ownerKey, bindings),
      initialOwner: scenarioOwnerId(region.ownerKey, bindings),
      currentOwner: scenarioOwnerId(region.ownerKey, bindings),
      controller: scenarioOwnerId(region.ownerKey, bindings),
      ownerKey: region.ownerKey,
      initialOwnerKey: region.ownerKey,
      currentOwnerKey: region.ownerKey,
      controllerKey: region.ownerKey,
      stableFactionId: region.ownerKey,
      factionId: scenarioOwnerId(region.ownerKey, bindings),
      factionName: region.factionName,
      ownerName: region.factionName,
      factionColor: region.factionColor,
      color: region.color,
      development: Math.round(Number(region.admin?.prosperity ?? region.mood ?? 50)),
      prosperity: Math.round(Number(region.admin?.prosperity ?? region.mood ?? 50)),
      troops: Math.round(Number(region.admin?.publicTreasuryInit?.troops ?? region.admin?.governanceMilitary?.standingArmy ?? 0)),
      mood: region.mood,
      unrest: region.unrest,
      taxPressure: region.taxPressure,
      armyPressure: region.armyPressure,
      officeRisk: region.officeRisk,
      events: '',
      ownerHistory: [],
      adminBinding: region.officialName,
      mapRegionId: region.id,
      mutable: true,
      mutableFields: ['owner', 'currentOwner', 'controller', 'occupiedBy', 'troops', 'development', 'prosperity', 'mood', 'taxPressure', 'armyPressure', 'officeRisk', 'data'],
      data: region.admin,
    })),
    oceans: oceans.map(ocean => ({
      id: ocean.id,
      sourceId: ocean.sourceId,
      name: ocean.title,
      type: 'poly',
      coords: ocean.coords,
      points: ocean.points,
      polygon: ocean.polygon,
      center: ocean.center,
      path: ocean.d,
      d: ocean.d,
      centroid: ocean.centroid,
      terrain: 'water',
      mutable: false,
    })),
  };
  const adminHierarchy = bindings.adminHierarchy;
  const regionIdsByOfficialName = new Map(regions.filter(r => r.officialName).map(r => [r.officialName, r.id]));
  for (const group of Object.values(adminHierarchy)) {
    for (const division of group.divisions || []) {
      division.mapRegionId = regionIdsByOfficialName.get(division.name) || null;
    }
  }
  fs.writeFileSync(path.join(assetDir, 'tianqi-ming2.game-map.json'), `${JSON.stringify(gameMap, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(assetDir, 'tianqi-ming2.admin-hierarchy.json'), `${JSON.stringify(adminHierarchy, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(assetDir, 'tianqi-ming2.scenario-fragment.json'), `${JSON.stringify({ map: gameMap, adminHierarchy, supplementMeta: bindings.supplementMeta }, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(assetDir, 'tianqi-ming2.manifest.json'), `${JSON.stringify({
    ...meta,
    files: {
      previewData: path.relative(assetDir, path.join(assetDir, 'tianqi-ming2.preview-data.js')),
      gameMap: 'tianqi-ming2.game-map.json',
      adminHierarchy: 'tianqi-ming2.admin-hierarchy.json',
      scenarioFragment: 'tianqi-ming2.scenario-fragment.json',
      historicalSupplement: 'tianqi-ming2.historical-supplement.json',
    },
  }, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    ok: true,
    previewOut,
    assetDir,
    landRegionCount: regions.length,
    oceanRegionCount: oceans.length,
    unboundLandRegionCount: meta.unboundLandRegions.length,
    owners: [...new Set(regions.map(region => region.ownerKey))],
  }, null, 2));
}

main();
