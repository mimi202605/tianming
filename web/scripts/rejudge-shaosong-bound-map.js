#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_SCENARIO = path.resolve(__dirname, '../../scenarios/绍宋·建炎元年八月_182区草案.json');
const EXPECTED_MAP_ID = 'shaosong-1127-182';
const EXPECTED_REGION_COUNT = 182;

const FACTIONS = {
  'fac-song': { name: '宋', color: '#C62828', realm: '大宋', control: '宋廷实控' },
  'fac-jin': { name: '金', color: '#7E57C2', realm: '大金', control: '金军实控' },
  'fac-hebei-yijun': { name: '河北义军', color: '#1565C0', realm: '两河忠义寨', control: '忠义寨控制' },
  'fac-xijun': { name: '关陕西军', color: '#6A5ACD', realm: '关陕西军', control: '西军控制' },
  'fac-taihang-bzj': { name: '太行八字军', color: '#0D47A1', realm: '太行八字军', control: '义军控制' },
  'fac-xixia': { name: '西夏', color: '#F9A825', realm: '西夏', control: '西夏实控' },
  'fac-dali': { name: '大理国', color: '#6A1B9A', realm: '大理国', control: '大理实控' },
  'fac-tubo': { name: '卫藏诸部', color: '#795548', realm: '卫藏诸部', control: '诸部控制' },
  'fac-guge': { name: '古格王国', color: '#8D6E63', realm: '古格王国', control: '古格王室控制' },
  'fac-kham': { name: '多康诸部', color: '#6D4C41', realm: '多康诸部', control: '诸部控制' },
  'fac-karakhan-east': { name: '东喀喇汗国', color: '#D97706', realm: '东喀喇汗国', control: '东喀喇汗实控' },
  'fac-karakhan-west': { name: '西喀喇汗国', color: '#92400E', realm: '西喀喇汗国', control: '西喀喇汗实控' },
  'fac-qocho': { name: '高昌回鹘', color: '#C2410C', realm: '高昌回鹘国', control: '亦都护实控' },
  'fac-caoyuan': { name: '乃蛮部', color: '#8D6E63', realm: '乃蛮部', control: '乃蛮部控制' },
  'fac-kereit': { name: '克烈部', color: '#455A64', realm: '克烈部', control: '克烈部控制' },
  'fac-merkit': { name: '蔑儿乞部', color: '#00897B', realm: '蔑儿乞部', control: '蔑儿乞部控制' },
  'fac-mongol': { name: '蒙兀诸部', color: '#3949AB', realm: '蒙兀诸部', control: '蒙兀诸部控制' },
  'fac-tatar': { name: '塔塔儿联盟', color: '#9E9D24', realm: '塔塔儿联盟', control: '塔塔儿部控制' },
  'fac-qongirat': { name: '弘吉剌部', color: '#EC407A', realm: '弘吉剌部', control: '弘吉剌部控制' },
  'fac-ongud': { name: '阴山诸部', color: '#FF7043', realm: '阴山诸部', control: '阴山诸部控制' },
  'fac-goryeo': { name: '高丽', color: '#00897B', realm: '高丽国', control: '高丽实控' },
  'fac-daiviet': { name: '大越李朝', color: '#2E7D32', realm: '大越李朝', control: '大越实控' },
  'fac-pagan': { name: '蒲甘王朝', color: '#A85D3A', realm: '蒲甘王朝', control: '蒲甘王朝控制' },
  'fac-xinan-tribes': { name: '滇中南诸部', color: '#7E57C2', realm: '滇中南诸部', control: '诸部自治' },
  'fac-jianchang': { name: '建昌诸部', color: '#5C6BC0', realm: '建昌诸部', control: '建昌诸部控制' },
  'fac-nw-yunnan': { name: '滇西北诸部', color: '#8D6E63', realm: '滇西北诸部', control: '滇西北诸部控制' },
  'fac-wumeng': { name: '乌蒙乌撒诸部', color: '#AB47BC', realm: '乌蒙乌撒诸部', control: '乌蒙乌撒诸部控制' },
  'fac-jinchi': { name: '金齿诸部', color: '#26A69A', realm: '金齿诸部', control: '金齿诸部控制' },
  'fac-japan': { name: '日本', color: '#AD1457', realm: '日本', control: '院政朝廷控制' },
  'fac-nanhai': { name: '吕宋诸邦', color: '#F57C00', realm: '吕宋诸邦', control: '吕宋诸邦控制' },
  'fac-liuqiu': { name: '流求诸部', color: '#7B1FA2', realm: '流求诸部', control: '岛上诸部控制' },
  'fac-mai': { name: '麻逸', color: '#D81B60', realm: '麻逸', control: '麻逸国控制' },
  'fac-visayas': { name: '米沙鄢诸邦', color: '#039BE5', realm: '米沙鄢诸邦', control: '岛上诸邦控制' },
  'fac-butuan': { name: '蒲端国', color: '#43A047', realm: '蒲端国', control: '蒲端国控制' },
  'fac-beihai': { name: '北海诸部', color: '#607D8B', realm: '北海诸部', control: '部落控制' },
  'fac-luodian': { name: '罗殿国', color: '#8E24AA', realm: '罗殿国', control: '罗殿诸部控制' },
  'fac-ziqi': { name: '自杞国', color: '#AB47BC', realm: '自杞国', control: '自杞诸部控制' }
};

const DALI_TRIBAL_REGION_IDS = new Set([]);

const STEPPE_OWNER_KEYS = new Set([
  'fac-caoyuan',
  'fac-kereit',
  'fac-merkit',
  'fac-mongol',
  'fac-tatar',
  'fac-qongirat',
  'fac-ongud'
]);

const WESTERN_REGION_OWNER_KEYS = new Set([
  'fac-karakhan-east',
  'fac-karakhan-west',
  'fac-qocho'
]);

const ECONOMY_BASE_DEFAULTS = {
  farmland: 0,
  commerceCoefficient: 1,
  commerceVolume: 0,
  maritimeTradeVolume: 0,
  saltProduction: 0,
  mineralProduction: 0,
  horseProduction: 0,
  fishingProduction: 0,
  imperialFarmland: 0,
  imperialAssets: { zhizao: 0, kuangchang: 0, yuyao: 0 },
  postRelays: 0,
  kejuQuota: 0,
  roadQuality: 40,
  landsAnnexed: 0,
  landsReclaimed: 0,
  landsSurveyed: 0,
  disasterRecord: []
};

const CIVIL_SERVICE_OWNER_KEYS = new Set([
  'fac-song',
  'fac-jin',
  'fac-goryeo',
  'fac-daiviet',
  'fac-dali',
  'fac-japan'
]);

const SOUTHWEST_OWNER_KEYS = new Set([
  'fac-dali',
  'fac-jianchang',
  'fac-nw-yunnan',
  'fac-wumeng',
  'fac-xinan-tribes',
  'fac-jinchi',
  'fac-luodian',
  'fac-ziqi'
]);

const MARITIME_OWNER_KEYS = new Set([
  'fac-liuqiu',
  'fac-nanhai',
  'fac-mai',
  'fac-visayas',
  'fac-butuan',
  'fac-beihai'
]);

const REGION_SOCIOECONOMIC_OVERRIDES = {
  div_1781355760530_5834: { population: 80000, prosperity: 24, taxLevel: '低', economyBase: { farmland: 8, commerceVolume: 18000, saltProduction: 2, mineralProduction: 4, horseProduction: 14, fishingProduction: 8, roadQuality: 26 } },
  div_1781355389457_4291: { population: 260000, prosperity: 42, taxLevel: '中', economyBase: { farmland: 28, commerceVolume: 90000, saltProduction: 2, mineralProduction: 8, horseProduction: 18, fishingProduction: 8, roadQuality: 46 } },
  div_1781355282408_4555: { population: 90000, prosperity: 24, taxLevel: '盟贡', economyBase: { farmland: 10, commerceVolume: 16000, saltProduction: 1, mineralProduction: 3, horseProduction: 28, fishingProduction: 6, roadQuality: 26 } },
  div_1781355478586_819: { population: 120000, prosperity: 28, taxLevel: '低', economyBase: { farmland: 12, commerceVolume: 24000, saltProduction: 1, mineralProduction: 4, horseProduction: 24, fishingProduction: 10, roadQuality: 32 } },
  div_1781355567346_9326: { population: 680000, prosperity: 34, taxLevel: '中', economyBase: { farmland: 60, commerceVolume: 160000, saltProduction: 6, mineralProduction: 10, horseProduction: 10, fishingProduction: 14, roadQuality: 50 } },
  div_1781498019765_3252: { population: 480000, prosperity: 32, taxLevel: '中', economyBase: { farmland: 66, commerceVolume: 160000, saltProduction: 8, mineralProduction: 8, horseProduction: 8, fishingProduction: 12, roadQuality: 52 } },
  div_1781498114835_4296: { population: 1800000, prosperity: 36, taxLevel: '中', economyBase: { farmland: 76, commerceVolume: 420000, saltProduction: 12, mineralProduction: 20, horseProduction: 8, roadQuality: 58 } },
  div_1781498100984_6331: { population: 1500000, prosperity: 34, taxLevel: '中', economyBase: { farmland: 74, commerceVolume: 320000, saltProduction: 8, mineralProduction: 14, horseProduction: 6, roadQuality: 54 } },
  div_1781497994899_9662: { population: 2200000, prosperity: 34, taxLevel: '中', economyBase: { farmland: 82, commerceVolume: 520000, saltProduction: 10, mineralProduction: 10, horseProduction: 6, roadQuality: 58 } },
  div_1781498061377_8807: { population: 850000, prosperity: 31, taxLevel: '低', economyBase: { farmland: 64, commerceVolume: 230000, saltProduction: 18, mineralProduction: 8, horseProduction: 5, roadQuality: 52 } },
  div_1781497921769_4411: { population: 700000, prosperity: 30, taxLevel: '低', economyBase: { farmland: 58, commerceVolume: 160000, saltProduction: 4, mineralProduction: 8, horseProduction: 6, roadQuality: 48 } },
  div_1781354940257_9797: { population: 380000, prosperity: 32, taxLevel: '低', economyBase: { farmland: 28, commerceVolume: 85000, saltProduction: 2, mineralProduction: 8, horseProduction: 30, roadQuality: 42 } },
  div_1781354884872_8567: { population: 70000, prosperity: 20, taxLevel: '盟贡', economyBase: { farmland: 8, commerceVolume: 12000, saltProduction: 1, mineralProduction: 3, horseProduction: 32, roadQuality: 25 } },
  div_1781354836536_6660: { population: 620000, prosperity: 35, taxLevel: '中', economyBase: { farmland: 42, commerceVolume: 160000, saltProduction: 4, mineralProduction: 12, horseProduction: 20, roadQuality: 48 } },
  div_1781353113596_528: { population: 110000, prosperity: 23, taxLevel: '低', economyBase: { farmland: 10, commerceVolume: 18000, saltProduction: 3, mineralProduction: 4, horseProduction: 32, roadQuality: 30 } },
  div_1781352947796_7235: { population: 160000, prosperity: 25, taxLevel: '低', economyBase: { farmland: 18, commerceVolume: 36000, saltProduction: 8, mineralProduction: 6, horseProduction: 28, roadQuality: 34 } },
  div_1781352933684_5384: { population: 760000, prosperity: 36, taxLevel: '中', economyBase: { farmland: 54, commerceVolume: 220000, saltProduction: 6, mineralProduction: 10, horseProduction: 16, roadQuality: 52 } },

  div_1781399253834_4024: { population: 160000, prosperity: 34, taxLevel: '低', economyBase: { farmland: 14, commerceVolume: 42000, saltProduction: 4, horseProduction: 10, roadQuality: 50 } },
  div_1781399219667_6447: { population: 95000, prosperity: 28, taxLevel: '低', economyBase: { farmland: 10, commerceVolume: 22000, saltProduction: 3, horseProduction: 12, roadQuality: 42 } },
  div_1781396396805_760: { population: 145000, prosperity: 30, taxLevel: '低', economyBase: { farmland: 13, commerceVolume: 32000, saltProduction: 4, horseProduction: 14, roadQuality: 44 } },
  div_1781355136177_3747: { population: 120000, prosperity: 24, taxLevel: '低', economyBase: { farmland: 9, commerceVolume: 14000, saltProduction: 2, horseProduction: 16, roadQuality: 35 } },
  div_1781397438204_2319: { population: 260000, prosperity: 38, taxLevel: '中', economyBase: { farmland: 26, commerceVolume: 78000, saltProduction: 7, horseProduction: 20, roadQuality: 58 } },
  div_1781397556155_6375: { population: 260000, prosperity: 36, taxLevel: '中', economyBase: { farmland: 24, commerceVolume: 70000, saltProduction: 6, horseProduction: 22, roadQuality: 54 } },
  div_1781397592435_3844: { population: 110000, prosperity: 24, taxLevel: '低', economyBase: { farmland: 10, commerceVolume: 12000, saltProduction: 8, horseProduction: 18, roadQuality: 34 } },
  div_1781397632377_3900: { population: 300000, prosperity: 46, taxLevel: '中', economyBase: { farmland: 34, commerceCoefficient: 1.2, commerceVolume: 120000, saltProduction: 12, horseProduction: 28, roadQuality: 62 } },
  div_1781397651196_5443: { population: 190000, prosperity: 28, taxLevel: '低', economyBase: { farmland: 13, commerceVolume: 28000, saltProduction: 16, horseProduction: 24, roadQuality: 38 } },
  div_1781397675571_1009: { population: 210000, prosperity: 34, taxLevel: '中', economyBase: { farmland: 22, commerceVolume: 62000, saltProduction: 24, horseProduction: 22, roadQuality: 55 } },
  div_1781397803525_1767: { population: 70000, prosperity: 20, taxLevel: '低', economyBase: { farmland: 7, commerceVolume: 9000, saltProduction: 3, horseProduction: 12, roadQuality: 30 } },
  div_1781517737733_8664: { population: 100000, prosperity: 25, taxLevel: '低', economyBase: { farmland: 11, commerceVolume: 15000, saltProduction: 2, horseProduction: 14, roadQuality: 35 } },
  div_1781517737733_1421: { population: 85000, prosperity: 24, taxLevel: '低', economyBase: { farmland: 8, commerceVolume: 12000, saltProduction: 2, horseProduction: 13, roadQuality: 32 } },

  div_1781350622895_2856: { population: 180000, prosperity: 54, taxLevel: '中', economyBase: { farmland: 70, commerceCoefficient: 1.25, commerceVolume: 180000, saltProduction: 4, fishingProduction: 18, roadQuality: 62 } },
  div_1781349565199_7418: { population: 45000, prosperity: 28, taxLevel: '低', economyBase: { farmland: 28, commerceVolume: 18000, saltProduction: 0, fishingProduction: 4, roadQuality: 35 } },
  div_1781349851998_1436: { population: 80000, prosperity: 34, taxLevel: '中', economyBase: { farmland: 42, commerceVolume: 42000, saltProduction: 0, fishingProduction: 6, roadQuality: 45 } },
  div_1781349885159_9314: { population: 140000, prosperity: 40, taxLevel: '中', economyBase: { farmland: 56, commerceVolume: 62000, saltProduction: 1, fishingProduction: 8, roadQuality: 48 } },
  div_1781349920055_2206: { population: 210000, prosperity: 46, taxLevel: '中', economyBase: { farmland: 64, commerceVolume: 92000, saltProduction: 2, fishingProduction: 10, roadQuality: 52 } },
  div_1781349900872_5017: { population: 45000, prosperity: 27, taxLevel: '低', economyBase: { farmland: 30, commerceVolume: 16000, saltProduction: 0, fishingProduction: 4, roadQuality: 32 } },
  div_1781349824470_5515: { population: 450000, prosperity: 62, taxLevel: '中', economyBase: { farmland: 84, commerceCoefficient: 1.2, commerceVolume: 240000, saltProduction: 6, fishingProduction: 22, roadQuality: 58 } },
  div_1781349981887_9247: { population: 250000, prosperity: 46, taxLevel: '中', economyBase: { farmland: 68, commerceVolume: 100000, saltProduction: 4, fishingProduction: 12, roadQuality: 50 } },
  div_1781349997872_7279: { population: 200000, prosperity: 42, taxLevel: '中', economyBase: { farmland: 52, commerceVolume: 98000, saltProduction: 8, fishingProduction: 18, roadQuality: 54 } },
  div_1781349947087_7864: { population: 170000, prosperity: 38, taxLevel: '中', economyBase: { farmland: 50, commerceVolume: 56000, saltProduction: 2, fishingProduction: 8, roadQuality: 42 } },

  div_1781400616464_643: { population: 920000 },
  div_1781400635057_5515: { population: 470000 },
  div_1781400651881_7356: { population: 700000 },
  div_1781400673164_6669: { population: 1600000 },
  div_1781400705823_4094: { population: 1150000 },
  div_1781400715695_6981: { population: 560000 },
  div_1781400739769_3153: { population: 760000 },

  div_1781350142225_295: { population: 1050000 },
  div_1781350274495_4414: { population: 130000 },
  div_1781350291174_9801: { population: 180000 },
  div_1781350305715_4661: { population: 450000 },

  div_1781399059930_267: { population: 95000, prosperity: 24, taxLevel: '盟贡', economyBase: { farmland: 4, commerceVolume: 15000, horseProduction: 60, roadQuality: 28 } },
  div_1781353164644_1158: { population: 26000, prosperity: 18, taxLevel: '盟贡', economyBase: { farmland: 3, commerceVolume: 5000, horseProduction: 22, roadQuality: 24 } },
  div_1781354621786_7079: { population: 62000, prosperity: 22, taxLevel: '盟贡', economyBase: { farmland: 4, commerceVolume: 11000, horseProduction: 48, roadQuality: 28 } },
  div_1781354767360_4346: { population: 58000, prosperity: 21, taxLevel: '盟贡', economyBase: { farmland: 4, commerceVolume: 10000, horseProduction: 46, roadQuality: 27 } },
  div_1781353301006_5039: { population: 55000, prosperity: 20, taxLevel: '盟贡', economyBase: { farmland: 3, commerceVolume: 9000, horseProduction: 44, roadQuality: 26 } },
  div_1781353185402_6378: { population: 48000, prosperity: 19, taxLevel: '盟贡', economyBase: { farmland: 3, commerceVolume: 8000, horseProduction: 40, roadQuality: 25 } },
  div_1781399597964_518: { population: 36000, prosperity: 24, taxLevel: '盟贡', economyBase: { farmland: 6, commerceVolume: 12000, horseProduction: 24, roadQuality: 36 } },
  div_1781399059930_9261: { population: 62000, prosperity: 24, taxLevel: '盟贡', economyBase: { farmland: 5, commerceVolume: 17000, horseProduction: 48, roadQuality: 30 } },
  div_1781354750105_8756: { population: 56000, prosperity: 23, taxLevel: '盟贡', economyBase: { farmland: 5, commerceVolume: 15000, horseProduction: 45, roadQuality: 28 } },
  div_1781354740329_267: { population: 70000, prosperity: 21, taxLevel: '盟贡', economyBase: { farmland: 4, commerceVolume: 12000, horseProduction: 52, roadQuality: 25 } },
  div_1781354907097_181: { population: 34000, prosperity: 18, taxLevel: '盟贡', economyBase: { farmland: 3, commerceVolume: 6000, horseProduction: 28, roadQuality: 22 } },
  div_1781354875218_3811: { population: 32000, prosperity: 18, taxLevel: '盟贡', economyBase: { farmland: 3, commerceVolume: 6000, horseProduction: 27, roadQuality: 22 } },
  div_1781354850978_1672: { population: 36000, prosperity: 18, taxLevel: '盟贡', economyBase: { farmland: 3, commerceVolume: 6500, horseProduction: 30, roadQuality: 23 } },
  div_1781354636130_9241: { population: 43000, prosperity: 19, taxLevel: '盟贡', economyBase: { farmland: 3, commerceVolume: 7500, horseProduction: 35, roadQuality: 24 } },
  div_1781354706273_5795: { population: 46000, prosperity: 19, taxLevel: '盟贡', economyBase: { farmland: 3, commerceVolume: 8000, horseProduction: 36, roadQuality: 24 } },
  div_1781353290805_6476: { population: 52000, prosperity: 20, taxLevel: '盟贡', economyBase: { farmland: 4, commerceVolume: 9000, horseProduction: 38, roadQuality: 24 } },
  div_1781353125973_7975: { population: 58000, prosperity: 20, taxLevel: '盟贡', economyBase: { farmland: 4, commerceVolume: 10000, horseProduction: 40, roadQuality: 25 } },
  div_1781397870896_989: { population: 55000, prosperity: 20, taxLevel: '盟贡', economyBase: { farmland: 5, commerceVolume: 12000, horseProduction: 26, roadQuality: 34 } },

  div_1781355155816_8574: { population: 35000, prosperity: 18, taxLevel: '低', economyBase: { farmland: 5, commerceVolume: 6000, saltProduction: 8, horseProduction: 18, roadQuality: 20 } },
  div_1781355214960_3469: { population: 42000, prosperity: 19, taxLevel: '低', economyBase: { farmland: 6, commerceVolume: 7000, saltProduction: 10, horseProduction: 22, roadQuality: 22 } },
  div_1781355073401_8763: { population: 60000, prosperity: 20, taxLevel: '低', economyBase: { farmland: 8, commerceVolume: 8000, saltProduction: 6, horseProduction: 24, roadQuality: 24 } },
  div_1781517494688_2820: { population: 75000, prosperity: 22, taxLevel: '低', economyBase: { farmland: 10, commerceVolume: 14000, saltProduction: 6, horseProduction: 20, roadQuality: 30 } },
  div_1781400032855_558: { population: 220000, prosperity: 34, taxLevel: '低', economyBase: { farmland: 22, commerceVolume: 42000, saltProduction: 2, horseProduction: 10, roadQuality: 36 } },
  div_1781399977547_4126: { population: 120000, prosperity: 24, taxLevel: '低', economyBase: { farmland: 13, commerceVolume: 16000, saltProduction: 1, horseProduction: 12, roadQuality: 28 } },
  div_1781400081462_266: { population: 115000, prosperity: 24, taxLevel: '低', economyBase: { farmland: 12, commerceVolume: 15000, saltProduction: 1, horseProduction: 12, roadQuality: 27 } },
  div_1781400142449_9259: { population: 130000, prosperity: 26, taxLevel: '低', economyBase: { farmland: 14, commerceVolume: 18000, saltProduction: 1, horseProduction: 12, roadQuality: 30 } }
};

function buildPopulationDetail(population, profile) {
  return {
    households: Math.max(1, Math.round(population / (profile.householdSize || 5))),
    mouths: population,
    ding: Math.round(population * (profile.dingRatio || 0.38)),
    fugitives: Math.round(population * (profile.fugitiveRatio || 0.006)),
    hiddenCount: Math.round(population * (profile.hiddenRatio || 0.008))
  };
}

function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function buildFiscalDetail(population, economyBase, profile) {
  const fiscal = profile.fiscal || {};
  const tribute = Math.round(population * (fiscal.tributePerMouth || 0));
  const landTax = Math.round(
    (population * (fiscal.landTaxPerMouth || 0)) +
    ((economyBase.imperialFarmland || 0) * (fiscal.imperialFarmlandUnit || 0)) +
    ((economyBase.landsSurveyed || 0) * (fiscal.surveyedLandUnit || 0))
  );
  const commerceTax = Math.round(
    ((economyBase.commerceVolume || 0) * (fiscal.commerceRate || 0)) +
    ((economyBase.maritimeTradeVolume || 0) * (fiscal.maritimeRate ?? fiscal.commerceRate ?? 0)) +
    ((economyBase.postRelays || 0) * (fiscal.relayUnit || 0))
  );
  const resourceTax = Math.round(
    ((economyBase.saltProduction || 0) * (fiscal.saltUnit || 0)) +
    ((economyBase.horseProduction || 0) * (fiscal.horseUnit || 0)) +
    ((economyBase.fishingProduction || 0) * (fiscal.fishUnit || 0)) +
    ((economyBase.mineralProduction || 0) * (fiscal.mineralUnit || 0))
  );
  const claimedRevenue = tribute + landTax + commerceTax + resourceTax;
  const compliance = clampNumber(
    profile.fiscalCompliance ??
      (0.73 + ((Number(profile.minxinLocal) || 45) - 45) / 250 - ((Number(profile.corruptionLocal) || 25) - 25) / 360),
    0.52,
    0.92
  );
  const actualRevenue = Math.max(1, Math.round(claimedRevenue * compliance));
  const remitRate = clampNumber(profile.remitRate ?? (profile.fiscalAutonomy ? 1 - profile.fiscalAutonomy : 0.45), 0.12, 0.72);
  const remittedToCenter = Math.round(actualRevenue * remitRate);
  const retainedBudget = Math.max(0, actualRevenue - remittedToCenter);
  const skimmingRate = clampNumber(
    profile.skimmingRate ?? (0.05 + ((Number(profile.corruptionLocal) || 25) - 20) / 420),
    0.02,
    0.22
  );
  const autonomy = clampNumber(profile.fiscalAutonomy ?? (1 - remitRate), 0.08, 0.88);
  const taxBurden = Math.round(clampNumber(
    profile.taxBurden ?? (24 + (claimedRevenue / Math.max(1, population)) * 85 + (1 - compliance) * 18),
    12,
    72
  ));
  const grainOutput = Math.max(1, Math.round(population * (profile.grainPerMouth || 0.08)));
  return {
    '岁贡折': tribute,
    '两税': landTax,
    '商税': commerceTax,
    '盐茶酒课': resourceTax,
    '岁入总': claimedRevenue,
    claimedRevenue,
    actualRevenue,
    remittedToCenter,
    retainedBudget,
    compliance: Number(compliance.toFixed(2)),
    skimmingRate: Number(skimmingRate.toFixed(2)),
    autonomy: Number(autonomy.toFixed(2)),
    taxBurden,
    moneyOutput: actualRevenue,
    grainOutput
  };
}

function buildPublicTreasury(population, fiscalDetail, profile) {
  const fiscalTotal = fiscalDetail['岁入总'];
  const money = Math.round(fiscalTotal * (profile.treasuryYears || 1.5));
  const grain = Math.round(population * (profile.grainPerMouth || 0.08));
  const military = Math.round(fiscalTotal * (profile.militaryYears || 0.8));
  const cloth = Math.max(1, Math.round(population * (profile.clothPerMouth || 0.035)));
  return {
    '库存折贯': money,
    '常平仓石': grain,
    '军资库': military,
    money,
    grain,
    cloth,
    military
  };
}

function buildEconomy(overrides) {
  return Object.assign({}, ECONOMY_BASE_DEFAULTS, overrides || {}, {
    imperialAssets: Object.assign({}, ECONOMY_BASE_DEFAULTS.imperialAssets, overrides?.imperialAssets || {}),
    disasterRecord: Array.isArray(overrides?.disasterRecord) ? overrides.disasterRecord : []
  });
}

function hasName(region, pattern) {
  return pattern.test(region.name || '');
}

function hasCoastalEconomy(region, ownerKey) {
  return MARITIME_OWNER_KEYS.has(ownerKey) || hasName(region, /海|岛|港|州·复州|平州|合懒|辽阳|高丽|广州|福州|杭州|琼州|两浙|福建|江宁|海东|清化|红河|若开|下缅甸|日本|东海道|北陆|西海道|南海道|山阳|山阴|骨嵬|流鬼|夜叉|虾夷/);
}

function hasRiverEconomy(region) {
  return hasName(region, /江|河|湖|泽|淮|红河|富良|蒲甘|成都|潼川|夔州|鄂州|洪州|襄阳|杭州|江宁|开封|河中|河间|平阳|真定|太原/);
}

function hasMountainMinerals(region, ownerKey) {
  return SOUTHWEST_OWNER_KEYS.has(ownerKey) || ownerKey === 'fac-kham' || ownerKey === 'fac-guge' ||
    hasName(region, /山|岭|高原|金齿|乌蒙|乌撒|建昌|磨些|柴达木|阿尔金|青唐|雅州|夔州|矿|银|铜|盐|石国|于阗|龟兹|高昌|北庭/);
}

function hasHorseEconomy(region, ownerKey) {
  if (ownerKey === 'fac-daiviet' || MARITIME_OWNER_KEYS.has(ownerKey)) return false;
  return STEPPE_OWNER_KEYS.has(ownerKey) || ownerKey === 'fac-xixia' || ownerKey === 'fac-jin' ||
    ownerKey === 'fac-tubo' || ownerKey === 'fac-kham' || ownerKey === 'fac-guge' ||
    WESTERN_REGION_OWNER_KEYS.has(ownerKey) || SOUTHWEST_OWNER_KEYS.has(ownerKey) ||
    hasName(region, /马|牧|草原|阴山|云内|天德|河东|秦凤|泾原|熙河|鄜延|麟州|西京|北界/);
}

function hasSaltEconomy(region, ownerKey) {
  return ownerKey === 'fac-xixia' || hasCoastalEconomy(region, ownerKey) ||
    hasName(region, /盐|海|沙州|瓜州|肃州|甘州|柴达木|青海|河中|解州|琼州|福建|广州/);
}

function defaultFarmlandFor(region, ownerKey) {
  if (STEPPE_OWNER_KEYS.has(ownerKey)) return hasName(region, /可敦城|阴山/) ? 6 : 3;
  if (ownerKey === 'fac-xixia') return hasName(region, /中兴|灵州|西凉|甘州/) ? 28 : 12;
  if (ownerKey === 'fac-jin') return hasName(region, /河北|河东|真定|太原|平阳|河中|隆德/) ? 66 : 24;
  if (ownerKey === 'fac-song') return hasName(region, /两浙|江南|福建|成都|潼川|荆湖|广州|开封/) ? 86 : 62;
  if (ownerKey === 'fac-daiviet') return hasName(region, /升龙|红河|富良|清化|海东/) ? 72 : 38;
  if (ownerKey === 'fac-goryeo' || ownerKey === 'fac-japan') return 58;
  if (ownerKey === 'fac-pagan') return hasName(region, /蒲甘|下缅甸/) ? 70 : 24;
  if (WESTERN_REGION_OWNER_KEYS.has(ownerKey)) return hasName(region, /八剌沙衮|疏勒|于阗|高昌|北庭|龟兹/) ? 34 : 18;
  if (ownerKey === 'fac-tubo' || ownerKey === 'fac-kham' || ownerKey === 'fac-guge') return hasName(region, /逻些|雅隆|青唐/) ? 18 : 8;
  if (SOUTHWEST_OWNER_KEYS.has(ownerKey)) return ownerKey === 'fac-dali' ? 52 : 20;
  if (MARITIME_OWNER_KEYS.has(ownerKey)) return ownerKey === 'fac-beihai' ? 6 : 18;
  return 24;
}

function completeEconomyBase(economyBase, region, ownerKey, profile, population) {
  const economy = buildEconomy(economyBase);
  const setPositive = (key, value) => {
    if (!(Number(economy[key]) > 0)) economy[key] = Math.max(1, Math.round(value));
  };
  const farmland = Number(economy.farmland) || defaultFarmlandFor(region, ownerKey);
  economy.farmland = Math.max(1, Math.round(farmland));
  if (!(Number(economy.commerceCoefficient) > 0)) economy.commerceCoefficient = profile.commerceCoefficient || 1;
  setPositive('commerceVolume', Math.max(5000, population * (profile.commercePerMouth || 0.08) * economy.commerceCoefficient));
  if (hasCoastalEconomy(region, ownerKey)) {
    setPositive('maritimeTradeVolume', economy.commerceVolume * (profile.maritimeShare || 0.38));
  }
  if (hasCoastalEconomy(region, ownerKey) || hasRiverEconomy(region)) {
    setPositive('fishingProduction', Math.max(2, population / (profile.fishingDivisor || 90000)));
  }
  if (hasSaltEconomy(region, ownerKey)) {
    setPositive('saltProduction', Math.max(2, economy.farmland * (profile.saltScale || 0.16)));
  }
  if (hasMountainMinerals(region, ownerKey)) {
    setPositive('mineralProduction', Math.max(2, economy.farmland * (profile.mineralScale || 0.14)));
  }
  if (hasHorseEconomy(region, ownerKey)) {
    setPositive('horseProduction', Math.max(2, economy.farmland * (profile.horseScale || 0.22)));
  }
  if (ownerKey === 'fac-daiviet') economy.horseProduction = 0;
  if (ownerKey === 'fac-song' || ownerKey === 'fac-jin') {
    setPositive('imperialFarmland', Math.max(2, economy.farmland * (ownerKey === 'fac-song' ? 0.18 : 0.08)));
    economy.imperialAssets.zhizao = Math.max(Number(economy.imperialAssets.zhizao) || 0, hasName(region, /杭州|江宁|成都|开封|福州|广州|会宁|太原|真定/) ? 2 : 1);
    economy.imperialAssets.kuangchang = Math.max(Number(economy.imperialAssets.kuangchang) || 0, hasMountainMinerals(region, ownerKey) ? 2 : 1);
    economy.imperialAssets.yuyao = Math.max(Number(economy.imperialAssets.yuyao) || 0, hasName(region, /两浙|杭州|江南|开封|真定|太原/) ? 2 : 1);
  } else if (CIVIL_SERVICE_OWNER_KEYS.has(ownerKey)) {
    economy.imperialAssets.zhizao = Math.max(Number(economy.imperialAssets.zhizao) || 0, 1);
    economy.imperialAssets.kuangchang = Math.max(Number(economy.imperialAssets.kuangchang) || 0, hasMountainMinerals(region, ownerKey) ? 1 : 0);
    economy.imperialAssets.yuyao = Math.max(Number(economy.imperialAssets.yuyao) || 0, 1);
  }
  setPositive('postRelays', Math.max(1, (Number(economy.roadQuality) || 35) / 12 + population / (profile.relayPopulationDivisor || 700000)));
  if (CIVIL_SERVICE_OWNER_KEYS.has(ownerKey) || WESTERN_REGION_OWNER_KEYS.has(ownerKey)) {
    setPositive('kejuQuota', Math.max(1, population / (profile.kejuPopulationDivisor || 850000)));
  }
  setPositive('landsSurveyed', Math.max(1, economy.farmland * (profile.surveyScale || 0.72)));
  setPositive('landsReclaimed', Math.max(1, economy.farmland * (profile.reclaimScale || 0.36)));
  setPositive('landsAnnexed', Math.max(1, economy.farmland * (profile.annexScale || 0.12)));
  economy.roadQuality = Math.max(18, Math.round(Number(economy.roadQuality) || profile.roadQuality || 35));
  return economy;
}

function deriveInitialTroops(region, ownerKey, population) {
  const current = Number(region.troops) || 0;
  if (current >= 500) return Math.round(current);
  const name = region.name || '';
  let ratio = 0.008;
  let min = 600;
  let max = 18000;
  if (ownerKey === 'fac-xixia') {
    ratio = /中兴|灵州|怀德|建宁|夏州|宥州/.test(name) ? 0.055 : 0.036;
    min = 3500;
    max = 18000;
  } else if (ownerKey === 'fac-jin') {
    ratio = /会宁|胡里改|合懒|金北边/.test(name) ? 0.055 : (/大同|云内|丰州|天德|太原|真定|平阳|河中/.test(name) ? 0.032 : 0.024);
    min = 4500;
    max = 26000;
  } else if (ownerKey === 'fac-daiviet') {
    ratio = /升龙/.test(name) ? 0.08 : (/广源|谅州|农州|乂安/.test(name) ? 0.045 : 0.028);
    min = 2500;
    max = 16000;
  } else if (STEPPE_OWNER_KEYS.has(ownerKey)) {
    ratio = /可敦城|阴山|阿尔泰|肯特|鄂嫩|三河|克鲁伦/.test(name) ? 0.18 : 0.14;
    min = 3000;
    max = 24000;
  } else if (WESTERN_REGION_OWNER_KEYS.has(ownerKey)) {
    ratio = /八剌沙衮|疏勒|于阗|龟兹|高昌|北庭|西州/.test(name) ? 0.055 : 0.036;
    min = 1800;
    max = 15000;
  } else if (ownerKey === 'fac-song') {
    ratio = /开封|河间|麟州|延安|凤翔|泾原|熙河|西京/.test(name) ? 0.022 : 0.008;
    min = /开封|河间|麟州|延安|凤翔|泾原|熙河|西京/.test(name) ? 3000 : 800;
    max = 22000;
  } else if (ownerKey === 'fac-goryeo' || ownerKey === 'fac-japan' || ownerKey === 'fac-pagan' || ownerKey === 'fac-dali') {
    ratio = 0.018;
    min = 1400;
    max = 12000;
  } else if (SOUTHWEST_OWNER_KEYS.has(ownerKey) || ownerKey === 'fac-tubo' || ownerKey === 'fac-kham' || ownerKey === 'fac-guge') {
    ratio = 0.05;
    min = 1000;
    max = 9000;
  } else if (MARITIME_OWNER_KEYS.has(ownerKey)) {
    ratio = 0.035;
    min = 800;
    max = 6500;
  }
  return Math.round(clampNumber(population * ratio, min, max));
}

function deriveRecruitPool(region, ownerKey, population) {
  let ratio = 0.045;
  if (STEPPE_OWNER_KEYS.has(ownerKey)) ratio = 0.22;
  else if (ownerKey === 'fac-xixia') ratio = 0.12;
  else if (ownerKey === 'fac-jin') ratio = 0.105;
  else if (ownerKey === 'fac-daiviet') ratio = /广源|谅州|农州/.test(region.name || '') ? 0.09 : 0.065;
  else if (WESTERN_REGION_OWNER_KEYS.has(ownerKey)) ratio = 0.085;
  else if (ownerKey === 'fac-song') ratio = /开封|河间|麟州|延安|凤翔|泾原|熙河/.test(region.name || '') ? 0.08 : 0.045;
  return Math.max(1, Math.round(population * ratio));
}

function buildMilitaryDetail(populationDetail, militaryRecruits) {
  const availableRecruits = Math.max(0, Math.round(Number(militaryRecruits) || 0));
  const ding = Math.max(0, Number(populationDetail?.ding) || 0);
  const detail = {
    availableRecruits,
    recruitmentBase: availableRecruits,
    recruitmentSource: 'populationDetail.ding'
  };
  if (ding > 0) detail.recruitmentRate = Number((availableRecruits / ding).toFixed(4));
  return detail;
}

function deriveArmyPressure(region, ownerKey, troops, population) {
  const name = region.name || '';
  const density = troops / Math.max(1, population);
  let score = 10 + density * 420;
  if (ownerKey === 'fac-jin') score += /太原|真定|平阳|河中|隆德|大同|云内|丰州/.test(name) ? 22 : 12;
  else if (ownerKey === 'fac-xixia') score += /怀德|建宁|夏州|宥州|灵州|盐州/.test(name) ? 18 : 10;
  else if (ownerKey === 'fac-daiviet') score += /广源|谅州|农州|乂安/.test(name) ? 12 : 5;
  else if (STEPPE_OWNER_KEYS.has(ownerKey)) score += 8;
  else if (ownerKey === 'fac-song') score += /开封|河间|麟州|延安|凤翔|泾原|熙河|西京/.test(name) ? 20 : 4;
  if (Number(region.garrisonStress) > score) score = Number(region.garrisonStress);
  return Math.round(clampNumber(score, 6, 92));
}

function toTagObject(value) {
  if (!value) return {};
  if (Array.isArray(value)) {
    return value.reduce((out, item) => {
      if (item !== undefined && item !== null && String(item).trim()) out[String(item).trim()] = true;
      return out;
    }, {});
  }
  if (typeof value === 'object') return Object.assign({}, value);
  return { [String(value)]: true };
}

function normalizeRegionTags(region) {
  const tags = toTagObject(region.tags);
  const economy = region.economyBase || {};
  tags.hasPort = Boolean(region.isTradePort || Number(economy.maritimeTradeVolume) > 0);
  tags.saltRegion = Number(economy.saltProduction) > 0;
  tags.mineralRegion = Number(economy.mineralProduction) > 0;
  tags.horseRegion = Number(economy.horseProduction) > 0;
  tags.fishingRegion = Number(economy.fishingProduction) > 0;
  tags.imperialDomain = Number(economy.imperialFarmland) > 0;
  return tags;
}

function percentText(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value || '');
  if (number <= 0) return '';
  return `${Math.round(number * 100)}%`;
}

function shareObjectForPanel(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const out = {};
  for (const [key, raw] of Object.entries(value)) {
    const text = percentText(raw);
    if (text) out[key] = text;
  }
  return out;
}

function syncHukouPanelFields(target, region) {
  for (const field of ['byAge', 'byGender', 'byEthnicity', 'byFaith', 'bySettlement']) {
    if (region[field] !== undefined) target[field] = shareObjectForPanel(region[field]);
  }
}

function syncRegionPanelData(region) {
  const data = Object.assign({}, region.data || {});
  const fields = [
    'name', 'description', 'regionType', 'level', 'officialPosition', 'governor', 'terrain',
    'specialResources', 'taxLevel', 'tags', 'byAge', 'byGender', 'byEthnicity', 'byFaith',
    'bySettlement', 'population', 'populationDetail', 'fiscalDetail', 'publicTreasuryInit',
    'economyBase', 'carryingCapacity', 'minxinLocal', 'corruptionLocal', 'prosperity',
    'unrest', 'taxBurden', 'militaryRecruits', 'recruits', 'levyPool', 'militaryDetail',
    'armyPressure', 'localMilitaryCost', 'retainedNet', 'armyDetail', 'ownerHistory',
    'dejureOwner', 'coreStatus', 'borderStatus'
  ];
  for (const field of fields) {
    if (region[field] !== undefined) data[field] = region[field];
  }
  data.garrison = region.armyDetail?.troops ?? region.troops;
  syncHukouPanelFields(data, region);
  region.data = data;
}

function getXixiaProfile(region) {
  const isCapital = region.id === 'div_1781397632377_3900';
  const isHexi = /沙州|瓜州|肃州|甘州|西凉/.test(region.name);
  return {
    householdSize: 5,
    dingRatio: 0.36,
    fugitiveRatio: 0.006,
    hiddenRatio: 0.01,
    byAge: { '幼': 0.34, '青壮': 0.47, '老': 0.19 },
    byGender: { '男': 0.51, '女': 0.49 },
    bySettlement: isCapital
      ? { '城': 0.35, '镇': 0.22, '乡': 0.25, '牧落': 0.18 }
      : (isHexi ? { '城': 0.18, '镇': 0.22, '乡': 0.35, '牧落': 0.25 } : { '城': 0.08, '镇': 0.14, '乡': 0.26, '牧落': 0.52 }),
    byEthnicity: isCapital
      ? { '党项': 0.42, '汉': 0.36, '吐蕃': 0.1, '回鹘': 0.08, '其他': 0.04 }
      : (isHexi ? { '党项': 0.3, '汉': 0.28, '回鹘': 0.24, '吐蕃': 0.1, '其他': 0.08 } : { '党项': 0.5, '汉': 0.28, '吐蕃': 0.1, '回鹘': 0.06, '其他': 0.06 }),
    byFaith: { '佛': 0.68, '本土神祇': 0.18, '儒道': 0.1, '景教伊斯兰等': 0.04 },
    minxinLocal: 46,
    corruptionLocal: 28,
    carryingMultiplier: isCapital ? 1.45 : 1.25,
    grainPerMouth: isCapital ? 0.18 : 0.12,
    treasuryYears: isCapital ? 2.4 : 1.7,
    militaryYears: isCapital ? 1.5 : 1,
    fiscal: { tributePerMouth: 0.015, landTaxPerMouth: 0.1, commerceRate: 0.08, saltUnit: 520, horseUnit: 90 }
  };
}

function getDaiVietProfile(region) {
  const isCapital = region.id === 'div_1781350622895_2856';
  const isDelta = /升龙|红河|富良|峰州|海东/.test(region.name);
  const isFrontier = /广源|农州|谅州/.test(region.name);
  return {
    householdSize: 5,
    dingRatio: 0.39,
    fugitiveRatio: 0.004,
    hiddenRatio: 0.006,
    byAge: { '幼': 0.36, '青壮': 0.46, '老': 0.18 },
    byGender: { '男': 0.5, '女': 0.5 },
    bySettlement: isCapital
      ? { '城': 0.22, '镇': 0.2, '乡': 0.58 }
      : (isFrontier ? { '城': 0.06, '镇': 0.12, '溪洞': 0.32, '乡': 0.5 } : { '城': 0.12, '镇': 0.18, '乡': 0.7 }),
    byEthnicity: isFrontier
      ? { '京越': 0.44, '岱侬溪洞': 0.42, '汉': 0.08, '其他': 0.06 }
      : (isDelta ? { '京越': 0.88, '汉': 0.06, '占': 0.03, '其他': 0.03 } : { '京越': 0.78, '汉': 0.06, '占': 0.08, '其他': 0.08 }),
    byFaith: { '佛': 0.62, '民间': 0.25, '儒道': 0.13 },
    minxinLocal: 52,
    corruptionLocal: 24,
    carryingMultiplier: isDelta ? 1.8 : 1.45,
    grainPerMouth: isDelta ? 0.32 : 0.24,
    treasuryYears: isCapital ? 2.2 : 1.7,
    militaryYears: 1,
    fiscal: { tributePerMouth: 0.01, landTaxPerMouth: 0.13, commerceRate: 0.09, saltUnit: 420, fishUnit: 90 }
  };
}

function getJinProfile(region) {
  const name = region.name || '';
  const isCapital = /会宁/.test(name);
  const isCore = /会宁|胡里改|合懒|金北边/.test(name);
  const isNorthwestFrontier = /金西北|云内|丰州|天德/.test(name);
  const isLiaoLegacy = /辽阳|平州|临潢|大定|大同/.test(name);
  const bySettlement = isCore
    ? { '城': isCapital ? 0.14 : 0.04, '镇': isCapital ? 0.18 : 0.1, '村寨': 0.3, '猛安谋克屯寨': isCapital ? 0.38 : 0.56 }
    : (isNorthwestFrontier
      ? { '城': 0.08, '镇': 0.12, '乡': 0.32, '牧落': 0.48 }
      : (isLiaoLegacy
        ? { '城': 0.12, '镇': 0.18, '乡': 0.52, '牧落': 0.18 }
        : { '城': 0.12, '镇': 0.18, '乡': 0.7 }));
  const byEthnicity = isCore
    ? { '女真': 0.52, '渤海': 0.18, '汉': 0.12, '契丹': 0.08, '奚室韦诸部': 0.06, '其他': 0.04 }
    : (isNorthwestFrontier
      ? { '汉': 0.34, '契丹奚诸部': 0.24, '阴山部族': 0.16, '女真': 0.08, '党项': 0.08, '回鹘': 0.04, '其他': 0.06 }
      : (isLiaoLegacy
        ? { '汉': 0.52, '契丹': 0.22, '女真': 0.08, '渤海': 0.08, '奚': 0.05, '其他': 0.05 }
        : { '汉': 0.88, '契丹': 0.05, '女真': 0.04, '渤海': 0.02, '其他': 0.01 }));
  const byFaith = isCore
    ? { '萨满与本部祭祀': 0.46, '佛': 0.24, '儒道': 0.16, '民间': 0.14 }
    : (isNorthwestFrontier
      ? { '佛': 0.34, '腾格里萨满': 0.28, '儒道': 0.24, '民间': 0.14 }
      : { '佛': 0.44, '儒道': 0.38, '民间': 0.14, '萨满': 0.04 });
  const fiscal = isCore
    ? { tributePerMouth: 0.018, landTaxPerMouth: 0.035, commerceRate: 0.05, saltUnit: 300, horseUnit: 85, fishUnit: 45 }
    : (isNorthwestFrontier
      ? { tributePerMouth: 0.016, landTaxPerMouth: 0.05, commerceRate: 0.055, saltUnit: 320, horseUnit: 90 }
      : (isLiaoLegacy
        ? { tributePerMouth: 0.018, landTaxPerMouth: 0.085, commerceRate: 0.07, saltUnit: 360, horseUnit: 80, fishUnit: 55 }
        : { tributePerMouth: 0.012, landTaxPerMouth: 0.115, commerceRate: 0.075, saltUnit: 420, horseUnit: 70, fishUnit: 60 }));
  return {
    householdSize: isCore ? 5.5 : 5,
    dingRatio: isCore ? 0.42 : 0.39,
    fugitiveRatio: isCore ? 0.003 : 0.018,
    hiddenRatio: isCore ? 0.006 : 0.035,
    byAge: { '幼': 0.34, '青壮': 0.48, '老': 0.18 },
    byGender: { '男': 0.51, '女': 0.49 },
    bySettlement,
    byEthnicity,
    byFaith,
    minxinLocal: isCore ? 56 : (isLiaoLegacy ? 38 : 28),
    corruptionLocal: isCore ? 22 : (isLiaoLegacy ? 30 : 36),
    carryingMultiplier: isCore ? 1.35 : (isNorthwestFrontier ? 1.4 : 1.25),
    grainPerMouth: isCore ? 0.06 : (isNorthwestFrontier ? 0.08 : 0.18),
    treasuryYears: isCore ? 1.2 : (isLiaoLegacy ? 1.1 : 0.75),
    militaryYears: isCore ? 1.3 : 0.9,
    fiscal
  };
}

function getSteppeEthnicity(ownerKey, region) {
  if (ownerKey === 'fac-mongol') return { '蒙兀': 0.74, '弘吉剌诸部': 0.12, '塔塔儿': 0.06, '突厥遗种': 0.05, '汉': 0.03 };
  if (ownerKey === 'fac-kereit') return { '克烈': 0.68, '乃蛮蒙兀诸部': 0.14, '回鹘': 0.08, '汪古及其他': 0.07, '汉': 0.03 };
  if (ownerKey === 'fac-merkit') return { '蔑儿乞': 0.76, '蒙兀': 0.1, '突厥遗种': 0.08, '其他': 0.06 };
  if (ownerKey === 'fac-tatar') return { '塔塔儿': 0.78, '蒙兀': 0.1, '突厥遗种': 0.08, '汉': 0.04 };
  if (ownerKey === 'fac-qongirat') return { '弘吉剌': 0.76, '蒙兀': 0.12, '突厥遗种': 0.08, '其他': 0.04 };
  if (ownerKey === 'fac-ongud') return { '汪古': 0.52, '沙陀突厥遗裔': 0.2, '汉': 0.16, '回鹘': 0.08, '其他': 0.04 };
  if (/乃蛮/.test(region.name)) return { '乃蛮': 0.7, '克烈': 0.1, '回鹘': 0.1, '蒙兀': 0.06, '其他': 0.04 };
  return { '草原诸部': 0.55, '乃蛮克烈诸部': 0.22, '回鹘汪古': 0.14, '蒙兀': 0.06, '汉': 0.03 };
}

function getSteppeProfile(ownerKey, region) {
  const isKereit = ownerKey === 'fac-kereit';
  const isOngud = ownerKey === 'fac-ongud';
  const hasTown = /可敦城|阴山/.test(region.name);
  return {
    householdSize: 5,
    dingRatio: 0.4,
    fugitiveRatio: 0.004,
    hiddenRatio: 0.006,
    byAge: { '幼': 0.35, '青壮': 0.48, '老': 0.17 },
    byGender: { '男': 0.51, '女': 0.49 },
    bySettlement: hasTown ? { '城': 0.08, '镇': 0.12, '游牧营': 0.8 } : { '城': 0.01, '镇': 0.04, '游牧营': 0.95 },
    byEthnicity: getSteppeEthnicity(ownerKey, region),
    byFaith: isKereit ? { '腾格里': 0.5, '景教': 0.32, '佛': 0.08, '其他': 0.1 } : (isOngud ? { '腾格里': 0.54, '佛': 0.18, '景教': 0.14, '其他': 0.14 } : { '腾格里': 0.78, '萨满': 0.12, '佛景教等': 0.1 }),
    minxinLocal: 44,
    corruptionLocal: 18,
    carryingMultiplier: 1.55,
    grainPerMouth: 0.025,
    treasuryYears: 0.9,
    militaryYears: 0.9,
    fiscal: { tributePerMouth: 0.018, commerceRate: 0.035, horseUnit: 115 }
  };
}

function getTuboProfile(region) {
  const isLhasa = /逻些/.test(region.name);
  const isNorthern = /阿尔金|柴达木|青海|青唐/.test(region.name);
  return {
    householdSize: 5,
    dingRatio: 0.37,
    fugitiveRatio: 0.004,
    hiddenRatio: 0.007,
    byAge: { '幼': 0.34, '青壮': 0.47, '老': 0.19 },
    byGender: { '男': 0.5, '女': 0.5 },
    bySettlement: isLhasa ? { '城': 0.16, '镇': 0.14, '村寨牧帐': 0.7 } : { '城': 0.02, '镇': 0.06, '村寨牧帐': 0.92 },
    byEthnicity: isNorthern ? { '吐蕃': 0.56, '羌': 0.18, '党项': 0.1, '回鹘': 0.08, '汉': 0.08 } : { '吐蕃': 0.82, '羌': 0.08, '汉': 0.04, '党项': 0.03, '其他': 0.03 },
    byFaith: { '藏传佛': 0.68, '苯教': 0.24, '民间': 0.08 },
    minxinLocal: 45,
    corruptionLocal: 20,
    carryingMultiplier: isLhasa ? 1.35 : 1.2,
    grainPerMouth: isLhasa ? 0.12 : 0.05,
    treasuryYears: 1.2,
    militaryYears: 0.8,
    fiscal: { tributePerMouth: 0.018, landTaxPerMouth: 0.03, commerceRate: 0.04, saltUnit: 360, horseUnit: 60 }
  };
}

function getSongProfile(region) {
  const isNorthFront = /京畿|京东|河北|麟州|鄜延|秦凤|泾原|熙河|凤翔|延安|河间/.test(region.name);
  const isSouthRich = /两浙|江南|福建|成都|潼川|荆湖|广州|江宁|杭州|福州|洪州|潭州/.test(region.name);
  const isCapital = /东京开封/.test(region.name);
  return {
    householdSize: 5,
    dingRatio: 0.38,
    fugitiveRatio: isNorthFront ? 0.035 : 0.012,
    hiddenRatio: isNorthFront ? 0.045 : 0.018,
    byAge: { '幼': 0.34, '青壮': 0.47, '老': 0.19 },
    byGender: { '男': 0.5, '女': 0.5 },
    bySettlement: isCapital
      ? { '城': 0.34, '镇': 0.22, '乡': 0.44 }
      : (isSouthRich ? { '城': 0.18, '镇': 0.24, '乡': 0.58 } : { '城': 0.1, '镇': 0.18, '乡': 0.62, '寨堡': 0.1 }),
    byEthnicity: isNorthFront ? { '汉': 0.9, '蕃汉弓箭手诸部': 0.05, '契丹女真渤海': 0.03, '其他': 0.02 } : { '汉': 0.94, '溪洞蛮夷诸部': 0.03, '海商蕃客': 0.02, '其他': 0.01 },
    byFaith: { '儒道': 0.48, '佛': 0.34, '民间': 0.18 },
    minxinLocal: isNorthFront ? 46 : 58,
    corruptionLocal: isNorthFront ? 34 : 28,
    carryingMultiplier: isNorthFront ? 1.28 : 1.5,
    grainPerMouth: isSouthRich ? 0.28 : 0.2,
    treasuryYears: isNorthFront ? 0.8 : 1.25,
    militaryYears: isNorthFront ? 1.05 : 0.75,
    commercePerMouth: isSouthRich ? 0.18 : 0.1,
    fiscal: { landTaxPerMouth: isNorthFront ? 0.08 : 0.12, commerceRate: 0.075, maritimeRate: 0.06, saltUnit: 420, horseUnit: 70, fishUnit: 65, mineralUnit: 120, imperialFarmlandUnit: 80, relayUnit: 450 }
  };
}

function getGoryeoProfile(region) {
  const isSouth = /五道南部|西海道/.test(region.name);
  return {
    householdSize: 5,
    dingRatio: 0.38,
    fugitiveRatio: 0.008,
    hiddenRatio: 0.014,
    byAge: { '幼': 0.35, '青壮': 0.46, '老': 0.19 },
    byGender: { '男': 0.5, '女': 0.5 },
    bySettlement: isSouth ? { '城': 0.12, '镇': 0.2, '乡': 0.68 } : { '城': 0.08, '镇': 0.14, '乡': 0.58, '边寨': 0.2 },
    byEthnicity: { '高丽': 0.9, '女真': isSouth ? 0.02 : 0.06, '汉': 0.04, '其他': isSouth ? 0.04 : 0 },
    byFaith: { '佛': 0.56, '儒': 0.24, '民间': 0.2 },
    minxinLocal: 54,
    corruptionLocal: 28,
    carryingMultiplier: 1.4,
    grainPerMouth: 0.22,
    treasuryYears: 1.1,
    militaryYears: 0.8,
    commercePerMouth: isSouth ? 0.12 : 0.08,
    fiscal: { tributePerMouth: 0.006, landTaxPerMouth: 0.085, commerceRate: 0.06, maritimeRate: 0.045, saltUnit: 340, fishUnit: 55, mineralUnit: 90, horseUnit: 55, relayUnit: 260 }
  };
}

function getJapanProfile(region) {
  const isKinai = /畿内/.test(region.name);
  return {
    householdSize: 5,
    dingRatio: 0.37,
    fugitiveRatio: 0.006,
    hiddenRatio: 0.02,
    byAge: { '幼': 0.35, '青壮': 0.46, '老': 0.19 },
    byGender: { '男': 0.5, '女': 0.5 },
    bySettlement: isKinai ? { '京': 0.08, '寺社庄园': 0.24, '乡': 0.6, '港津': 0.08 } : { '城镇': 0.08, '寺社庄园': 0.18, '乡': 0.62, '港津': 0.12 },
    byEthnicity: { '倭人': 0.94, '虾夷': /陆奥/.test(region.name) ? 0.04 : 0.01, '渡来人后裔': 0.03, '其他': 0.02 },
    byFaith: { '神佛习合': 0.72, '民间': 0.18, '儒': 0.1 },
    minxinLocal: 50,
    corruptionLocal: 32,
    carryingMultiplier: 1.38,
    grainPerMouth: 0.2,
    treasuryYears: 0.9,
    militaryYears: 0.7,
    commercePerMouth: isKinai ? 0.12 : 0.08,
    fiscal: { tributePerMouth: 0.008, landTaxPerMouth: 0.07, commerceRate: 0.055, maritimeRate: 0.05, saltUnit: 280, fishUnit: 60, mineralUnit: 80, relayUnit: 220 }
  };
}

function getWesternOasisProfile(region, ownerKey) {
  const isMajor = /八剌沙衮|疏勒|于阗|龟兹|高昌|北庭|西州|石国/.test(region.name);
  return {
    householdSize: 5,
    dingRatio: 0.39,
    fugitiveRatio: 0.006,
    hiddenRatio: 0.012,
    byAge: { '幼': 0.34, '青壮': 0.48, '老': 0.18 },
    byGender: { '男': 0.51, '女': 0.49 },
    bySettlement: isMajor ? { '城': 0.24, '镇': 0.26, '绿洲乡': 0.42, '牧落': 0.08 } : { '城': 0.12, '镇': 0.18, '绿洲乡': 0.46, '牧落': 0.24 },
    byEthnicity: ownerKey === 'fac-qocho'
      ? { '回鹘': 0.48, '汉': 0.18, '粟特': 0.12, '吐蕃': 0.08, '突厥': 0.08, '其他': 0.06 }
      : { '突厥': 0.5, '粟特': 0.16, '回鹘': 0.12, '波斯大食商旅': 0.08, '汉': 0.08, '其他': 0.06 },
    byFaith: ownerKey === 'fac-qocho' ? { '佛': 0.62, '景教摩尼': 0.18, '伊斯兰': 0.1, '民间': 0.1 } : { '伊斯兰': 0.72, '佛': 0.12, '景教': 0.06, '民间': 0.1 },
    minxinLocal: 48,
    corruptionLocal: 24,
    carryingMultiplier: 1.32,
    grainPerMouth: 0.12,
    treasuryYears: 1.1,
    militaryYears: 0.8,
    commercePerMouth: isMajor ? 0.2 : 0.12,
    fiscal: { tributePerMouth: 0.012, landTaxPerMouth: 0.07, commerceRate: 0.09, saltUnit: 260, horseUnit: 65, fishUnit: 25, mineralUnit: 100, relayUnit: 240 }
  };
}

function getSouthwestProfile(ownerKey, region) {
  const isDali = ownerKey === 'fac-dali';
  const isStatelet = ownerKey === 'fac-luodian' || ownerKey === 'fac-ziqi';
  return {
    householdSize: 5,
    dingRatio: 0.37,
    fugitiveRatio: 0.006,
    hiddenRatio: 0.018,
    byAge: { '幼': 0.36, '青壮': 0.46, '老': 0.18 },
    byGender: { '男': 0.5, '女': 0.5 },
    bySettlement: isDali ? { '城': 0.14, '镇': 0.18, '坝区乡': 0.5, '山寨': 0.18 } : { '寨': 0.46, '溪洞': 0.24, '坝区乡': 0.22, '市镇': 0.08 },
    byEthnicity: isDali ? { '白蛮': 0.44, '乌蛮': 0.24, '汉': 0.16, '僰爨诸部': 0.1, '其他': 0.06 } : { '乌蛮': 0.42, '白蛮': 0.18, '僰爨诸部': 0.16, '汉': 0.12, '磨些金齿诸部': 0.08, '其他': 0.04 },
    byFaith: isDali ? { '佛': 0.58, '本土神祇': 0.26, '儒道': 0.16 } : { '本土神祇': 0.52, '佛': 0.28, '儒道': 0.12, '其他': 0.08 },
    minxinLocal: isDali ? 52 : 44,
    corruptionLocal: isDali ? 26 : 18,
    carryingMultiplier: isDali ? 1.34 : 1.24,
    grainPerMouth: isDali ? 0.16 : 0.09,
    treasuryYears: isDali ? 1.1 : 0.8,
    militaryYears: 0.75,
    commercePerMouth: isDali ? 0.1 : 0.055,
    fiscal: { tributePerMouth: 0.018, landTaxPerMouth: isDali ? 0.07 : 0.035, commerceRate: 0.055, saltUnit: 280, horseUnit: 65, fishUnit: 30, mineralUnit: 120, relayUnit: isStatelet ? 120 : 180 }
  };
}

function getPaganProfile(region) {
  const isCore = /蒲甘|下缅甸/.test(region.name);
  return {
    householdSize: 5,
    dingRatio: 0.38,
    fugitiveRatio: 0.006,
    hiddenRatio: 0.014,
    byAge: { '幼': 0.37, '青壮': 0.45, '老': 0.18 },
    byGender: { '男': 0.5, '女': 0.5 },
    bySettlement: isCore ? { '城': 0.14, '佛寺庄园': 0.18, '乡': 0.6, '港津': 0.08 } : { '山寨': 0.38, '乡': 0.42, '溪洞': 0.16, '市镇': 0.04 },
    byEthnicity: isCore ? { '缅': 0.62, '孟': 0.16, '掸': 0.1, '印度商旅': 0.04, '其他': 0.08 } : { '掸': 0.42, '缅': 0.24, '孟': 0.12, '山地诸部': 0.16, '其他': 0.06 },
    byFaith: { '上座部佛': 0.64, '民间': 0.22, '印度教婆罗门': 0.08, '其他': 0.06 },
    minxinLocal: 50,
    corruptionLocal: 24,
    carryingMultiplier: isCore ? 1.45 : 1.22,
    grainPerMouth: isCore ? 0.22 : 0.08,
    treasuryYears: isCore ? 1.1 : 0.75,
    militaryYears: 0.75,
    commercePerMouth: isCore ? 0.1 : 0.05,
    fiscal: { tributePerMouth: 0.01, landTaxPerMouth: isCore ? 0.075 : 0.03, commerceRate: 0.055, maritimeRate: 0.045, saltUnit: 260, horseUnit: 35, fishUnit: 45, mineralUnit: 85, relayUnit: 140 }
  };
}

function getHighlandProfile(ownerKey, region) {
  const isGuge = ownerKey === 'fac-guge';
  const isKham = ownerKey === 'fac-kham';
  return {
    householdSize: 5,
    dingRatio: 0.37,
    fugitiveRatio: 0.004,
    hiddenRatio: 0.01,
    byAge: { '幼': 0.34, '青壮': 0.47, '老': 0.19 },
    byGender: { '男': 0.5, '女': 0.5 },
    bySettlement: isGuge ? { '王城': 0.08, '寺院庄园': 0.14, '河谷村': 0.34, '牧帐': 0.44 } : { '寨': 0.12, '寺院庄园': 0.08, '河谷村': 0.28, '牧帐': 0.52 },
    byEthnicity: isKham ? { '吐蕃': 0.68, '羌': 0.12, '汉': 0.08, '磨些': 0.04, '其他': 0.08 } : { '吐蕃': 0.78, '象雄阿里诸部': 0.12, '商旅': 0.04, '其他': 0.06 },
    byFaith: { '藏传佛': 0.62, '苯教': 0.26, '民间': 0.12 },
    minxinLocal: 44,
    corruptionLocal: 18,
    carryingMultiplier: 1.2,
    grainPerMouth: 0.06,
    treasuryYears: 0.85,
    militaryYears: 0.65,
    commercePerMouth: 0.04,
    fiscal: { tributePerMouth: 0.018, landTaxPerMouth: 0.025, commerceRate: 0.04, saltUnit: 300, horseUnit: 55, fishUnit: 20, mineralUnit: 80, relayUnit: 90 }
  };
}

function getMaritimeProfile(ownerKey, region) {
  const isBeihai = ownerKey === 'fac-beihai';
  return {
    householdSize: 5,
    dingRatio: 0.39,
    fugitiveRatio: 0.003,
    hiddenRatio: 0.012,
    byAge: { '幼': 0.36, '青壮': 0.46, '老': 0.18 },
    byGender: { '男': 0.51, '女': 0.49 },
    bySettlement: isBeihai ? { '渔猎营': 0.62, '港湾聚落': 0.18, '山海部落': 0.2 } : { '港聚落': 0.32, '乡社': 0.38, '舟师营': 0.12, '山地部落': 0.18 },
    byEthnicity: isBeihai ? { '北海渔猎诸部': 0.76, '女真渤海': 0.08, '虾夷': 0.08, '其他': 0.08 } : { '海岛诸部': 0.78, '华商': 0.08, '南海商旅': 0.08, '其他': 0.06 },
    byFaith: { '海神与祖灵': 0.52, '佛': 0.18, '本土神祇': 0.22, '其他': 0.08 },
    minxinLocal: 46,
    corruptionLocal: 16,
    carryingMultiplier: 1.22,
    grainPerMouth: 0.07,
    treasuryYears: 0.75,
    militaryYears: 0.55,
    commercePerMouth: isBeihai ? 0.035 : 0.09,
    maritimeShare: isBeihai ? 0.42 : 0.75,
    fiscal: { tributePerMouth: 0.012, landTaxPerMouth: 0.02, commerceRate: 0.045, maritimeRate: 0.07, saltUnit: 220, fishUnit: 75, mineralUnit: 50, relayUnit: 60 }
  };
}

function getHebeiMilitiaRegionProfile(region) {
  return {
    householdSize: 5,
    dingRatio: 0.4,
    fugitiveRatio: 0.06,
    hiddenRatio: 0.08,
    byAge: { '幼': 0.3, '青壮': 0.52, '老': 0.18 },
    byGender: { '男': 0.52, '女': 0.48 },
    bySettlement: { '城寨': 0.26, '乡': 0.38, '避兵坞壁': 0.28, '山寨': 0.08 },
    byEthnicity: { '汉': 0.94, '契丹渤海': 0.03, '女真': 0.01, '其他': 0.02 },
    byFaith: { '儒道': 0.44, '佛': 0.34, '民间': 0.22 },
    minxinLocal: 62,
    corruptionLocal: 18,
    carryingMultiplier: 1.25,
    grainPerMouth: 0.14,
    treasuryYears: 0.45,
    militaryYears: 0.9,
    commercePerMouth: 0.04,
    fiscal: { tributePerMouth: 0.004, landTaxPerMouth: 0.035, commerceRate: 0.03, saltUnit: 120, horseUnit: 45, fishUnit: 25, mineralUnit: 60, relayUnit: 120 }
  };
}

function getGenericRegionProfile(region, ownerKey) {
  if (ownerKey === 'fac-song') return getSongProfile(region);
  if (ownerKey === 'fac-goryeo') return getGoryeoProfile(region);
  if (ownerKey === 'fac-japan') return getJapanProfile(region);
  if (WESTERN_REGION_OWNER_KEYS.has(ownerKey)) return getWesternOasisProfile(region, ownerKey);
  if (SOUTHWEST_OWNER_KEYS.has(ownerKey)) return getSouthwestProfile(ownerKey, region);
  if (ownerKey === 'fac-pagan') return getPaganProfile(region);
  if (ownerKey === 'fac-kham' || ownerKey === 'fac-guge') return getHighlandProfile(ownerKey, region);
  if (MARITIME_OWNER_KEYS.has(ownerKey)) return getMaritimeProfile(ownerKey, region);
  if (ownerKey === 'fac-hebei-yijun') return getHebeiMilitiaRegionProfile(region);
  return {
    householdSize: 5,
    dingRatio: 0.38,
    fugitiveRatio: 0.008,
    hiddenRatio: 0.014,
    byAge: { '幼': 0.35, '青壮': 0.47, '老': 0.18 },
    byGender: { '男': 0.5, '女': 0.5 },
    bySettlement: { '聚落': 0.44, '乡': 0.34, '市镇': 0.12, '营寨': 0.1 },
    byEthnicity: { '本地诸部': 0.7, '汉': 0.16, '商旅': 0.06, '其他': 0.08 },
    byFaith: { '本土神祇': 0.46, '佛': 0.28, '民间': 0.2, '其他': 0.06 },
    minxinLocal: 45,
    corruptionLocal: 20,
    carryingMultiplier: 1.25,
    grainPerMouth: 0.08,
    treasuryYears: 0.8,
    militaryYears: 0.65,
    commercePerMouth: 0.05,
    fiscal: { tributePerMouth: 0.012, landTaxPerMouth: 0.035, commerceRate: 0.045, saltUnit: 220, horseUnit: 55, fishUnit: 35, mineralUnit: 75, relayUnit: 80 }
  };
}

function getSocioeconomicProfile(region, ownerKey) {
  if (ownerKey === 'fac-jin') return getJinProfile(region);
  if (ownerKey === 'fac-xixia') return getXixiaProfile(region);
  if (ownerKey === 'fac-daiviet') return getDaiVietProfile(region);
  if (STEPPE_OWNER_KEYS.has(ownerKey)) return getSteppeProfile(ownerKey, region);
  if (ownerKey === 'fac-tubo') return getTuboProfile(region);
  return getGenericRegionProfile(region, ownerKey);
}

function applySocioeconomicProfile(region, ownerKey) {
  const profile = getSocioeconomicProfile(region, ownerKey);
  if (!profile) return;
  const overrides = REGION_SOCIOECONOMIC_OVERRIDES[region.id] || {};
  const population = overrides.population ?? region.population ?? 50000;
  const economyBase = completeEconomyBase(Object.assign({}, region.economyBase || {}, overrides.economyBase || {}), region, ownerKey, profile, population);
  const fiscalDetail = buildFiscalDetail(population, economyBase, profile);
  const populationDetail = buildPopulationDetail(population, profile);
  const troops = deriveInitialTroops(region, ownerKey, population);
  const militaryRecruits = deriveRecruitPool(region, ownerKey, population);
  const militaryDetail = buildMilitaryDetail(populationDetail, militaryRecruits);
  const armyPressure = deriveArmyPressure(region, ownerKey, troops, population);
  const localMilitaryCost = Math.round(troops * (profile.militaryCostPerSoldier || (STEPPE_OWNER_KEYS.has(ownerKey) ? 1.4 : (ownerKey === 'fac-jin' ? 3.5 : (ownerKey === 'fac-xixia' ? 2.4 : 2.8)))));
  Object.assign(region, {
    population,
    populationDetail,
    byAge: Object.assign({}, profile.byAge),
    byGender: Object.assign({}, profile.byGender),
    bySettlement: Object.assign({}, overrides.bySettlement || profile.bySettlement),
    byEthnicity: Object.assign({}, overrides.byEthnicity || profile.byEthnicity),
    byFaith: Object.assign({}, overrides.byFaith || profile.byFaith),
    prosperity: overrides.prosperity ?? profile.prosperity ?? region.prosperity ?? 30,
    taxLevel: overrides.taxLevel ?? profile.taxLevel ?? region.taxLevel ?? '低',
    economyBase,
    fiscalDetail,
    publicTreasuryInit: buildPublicTreasury(population, fiscalDetail, profile),
    carryingCapacity: Math.round(population * (profile.carryingMultiplier || 1.25)),
    minxinLocal: profile.minxinLocal,
    corruptionLocal: profile.corruptionLocal,
    taxBurden: fiscalDetail.taxBurden,
    troops,
    militaryRecruits,
    recruits: militaryRecruits,
    levyPool: militaryRecruits,
    militaryDetail,
    armyPressure,
    localMilitaryCost,
    retainedNet: fiscalDetail.retainedBudget - localMilitaryCost,
    armyDetail: {
      troops,
      recruits: militaryRecruits,
      availableRecruits: militaryRecruits,
      armyPressure,
      localMilitaryCost
    },
    baojia: null
  });
  region.tags = normalizeRegionTags(region);
  syncRegionPanelData(region);
}

function applyOwnerDefaults(region, ownerKey) {
  if (STEPPE_OWNER_KEYS.has(ownerKey)) {
    Object.assign(region, {
      level: '部',
      regionType: '部落',
      terrain: '草原',
      officialPosition: '部帅',
      governor: '',
      sources: ['《蒙鞑备录》', '《金史·本纪》'],
      specialResources: '战马·皮毛·牧场',
      tags: ['草原', '牧场', '市马'],
      autonomy: 'jimi',
      treats_as: '部落自治',
      treaty_year: 0,
      establishedYear: 0,
      renamedFrom: '',
      isCapital: false,
      isJunDi: false,
      isTunTian: false
    });
    return;
  }
  if (WESTERN_REGION_OWNER_KEYS.has(ownerKey)) {
    Object.assign(region, {
      level: '绿洲城',
      regionType: '绿洲城邦',
      terrain: '绿洲',
      officialPosition: ownerKey === 'fac-qocho' ? '亦都护城主' : '汗国城主',
      governor: '',
      sources: ['《宋史·西域传》', '《辽史·西域传》'],
      specialResources: '绿洲屯田·丝路商税',
      tags: ['西域', '绿洲', '丝路'],
      autonomy: 'fanguo',
      treats_as: '域外通贡',
      treaty_year: 0,
      establishedYear: 0,
      renamedFrom: '',
      isCapital: false,
      isJunDi: false,
      isTunTian: false
    });
    return;
  }
  if (ownerKey === 'fac-jin') {
    const name = region.name || '';
    const isCapital = /会宁/.test(name);
    const isCore = /会宁|胡里改|合懒|金北边/.test(name);
    const isFrontier = /金西北|云内|丰州|天德/.test(name);
    const isNewConquest = /河北|河东|太原|真定|平阳|河中|隆德/.test(name);
    Object.assign(region, {
      level: isCapital ? '国都' : (isFrontier ? '羁縻路' : '路府'),
      regionType: isCore ? '女真本部' : (isFrontier ? '北边羁縻' : (isNewConquest ? '新占路府' : '辽旧路府')),
      terrain: isCore ? '森林草原' : (isFrontier ? '阴山草原' : '农牧混合'),
      officialPosition: isCore ? '猛安谋克万户' : (isFrontier ? '北边详稳' : '金朝路府守臣'),
      governor: isCapital ? '完颜吴乞买' : '',
      sources: ['《金史·地理志》', '《三朝北盟会编》', '《建炎以来系年要录》'],
      specialResources: isCore ? '猛安谋克·良马·貂皮' : (isFrontier ? '战马·边市·阴山牧场' : (isNewConquest ? '汉地赋税·城池·转输粮道' : '辽旧州县·马政·商路')),
      tags: isCore ? ['金本部', '猛安谋克', '骑兵'] : (isFrontier ? ['羁縻', '边部', '牧场'] : ['新占', '路府', '转输']),
      autonomy: isFrontier ? 'jimi' : (isNewConquest ? 'military-occupation' : 'direct'),
      treats_as: isCore ? '女真本部' : (isFrontier ? '北边羁縻' : (isNewConquest ? '新占汉地' : '辽旧地')),
      treaty_year: 0,
      establishedYear: isCapital ? 1115 : 1125,
      renamedFrom: '',
      isCapital,
      isJunDi: true,
      isTunTian: true
    });
    return;
  }
  if (ownerKey === 'fac-xixia') {
    Object.assign(region, {
      level: '州',
      regionType: '正州',
      terrain: '荒漠',
      officialPosition: '西夏州主',
      governor: '',
      sources: ['《宋史·夏国传》', '《西夏书事》'],
      specialResources: '青盐·良马·边市',
      tags: ['州格·中', '沿边', '产盐', '市马'],
      autonomy: 'fanguo',
      treats_as: '称臣·岁赐',
      treaty_year: 1044,
      establishedYear: 0,
      renamedFrom: '',
      isCapital: false,
      isJunDi: false,
      isTunTian: true
    });
    return;
  }
  if (ownerKey === 'fac-daiviet') {
    Object.assign(region, {
      level: '州',
      regionType: '正州',
      terrain: '丘陵',
      officialPosition: '李朝州牧',
      governor: '',
      sources: ['《大越史记全书》', '《宋史·交阯传》'],
      specialResources: '稻米·渔盐·水路',
      tags: ['大越', '稻作', '溪洞'],
      autonomy: 'fanguo',
      treats_as: '朝贡·册封',
      treaty_year: 0,
      establishedYear: 0,
      renamedFrom: '',
      isCapital: false,
      isJunDi: false,
      isTunTian: false
    });
  }
}

const REGION_METADATA_OVERRIDES = {
  div_1781355155816_8574: {
    level: '羁縻部',
    regionType: '羁縻',
    terrain: '高原',
    officialPosition: '吐蕃部首',
    governor: '',
    sources: ['《宋史·吐蕃传》', '《青唐录》'],
    specialResources: '盐湖·牧场·驼道',
    tags: ['州格·下', '沿边', '市马'],
    autonomy: 'jimi',
    treats_as: '部落自治',
    treaty_year: 0,
    establishedYear: 0,
    renamedFrom: '',
    isCapital: false,
    isJunDi: false,
    isTunTian: false
  },
  div_1781355214960_3469: {
    level: '羁縻部',
    regionType: '羁縻',
    terrain: '高原',
    officialPosition: '吐蕃部首',
    governor: '',
    sources: ['《宋史·吐蕃传》', '《青唐录》'],
    specialResources: '盐湖·牧场·高原商路',
    tags: ['州格·下', '沿边', '市马'],
    autonomy: 'jimi',
    treats_as: '部落自治',
    treaty_year: 0,
    establishedYear: 0,
    renamedFrom: '',
    isCapital: false,
    isJunDi: false,
    isTunTian: false
  },
  div_1781397632377_3900: {
    level: '国都',
    regionType: '藩国都',
    terrain: '荒漠',
    officialPosition: '西夏国主',
    governor: '李乾顺',
    sources: ['《宋史·夏国传》', '《西夏书事》'],
    specialResources: '青盐·良马·骆驼',
    tags: ['州格·上', '沿边', '产盐', '市马'],
    autonomy: 'fanguo',
    treats_as: '称臣·岁赐',
    treaty_year: 1044,
    establishedYear: 1020,
    renamedFrom: '兴庆府',
    isCapital: true,
    isJunDi: false,
    isTunTian: true
  },
  div_1781397675571_1009: {
    level: '州',
    regionType: '正州',
    terrain: '荒漠',
    officialPosition: '西夏州主',
    specialResources: '青盐·良马·边市',
    isCapital: false
  },
  div_1781397651196_5443: {
    level: '州',
    regionType: '边州',
    officialPosition: '西夏州主',
    specialResources: '盐池·战马·边寨',
    isCapital: false
  },
  div_1781350622895_2856: {
    level: '国都',
    regionType: '王畿',
    terrain: '丘陵',
    officialPosition: '李朝京畿',
    governor: '李阳焕',
    sources: ['《大越史记全书》', '《宋史·交阯传》'],
    specialResources: '稻米·海盐·红河水运',
    tags: ['都城', '沿海', '稻作'],
    autonomy: 'fanguo',
    treats_as: '朝贡·册封',
    treaty_year: 0,
    establishedYear: 1010,
    renamedFrom: '',
    isCapital: true,
    isJunDi: false,
    isTunTian: false
  }
};

function getRegionControlLabel(ownerKey, regionId) {
  if (ownerKey === 'fac-dali' && DALI_TRIBAL_REGION_IDS.has(regionId)) {
    return '大理属部自治';
  }
  return FACTIONS[ownerKey].control;
}

function getRegionControlDescription(faction, ownerKey, regionId) {
  if (ownerKey === 'fac-dali' && DALI_TRIBAL_REGION_IDS.has(regionId)) {
    return '属大理国势力圈，按三十七部旧属与边地部落自治处理';
  }
  return `由${faction.name}控制`;
}

// Every row is bound to a stable polygon id. Do not infer names from array order or prior owners.
const ASSIGNMENT_ROWS = [
  // Song, Jin, Goryeo and the 1127 northern frontier.
  ['div_1781355760530_5834', '胡里改万户', 'fac-jin'],
  ['div_1781355615401_4586', '高丽东界·北界', 'fac-goryeo'],
  ['div_1781400368921_7703', '高丽西海道', 'fac-goryeo'],
  ['div_1781400412737_9846', '高丽五道南部', 'fac-goryeo'],
  ['div_1781497165369_5550', '泾原路·渭州', 'fac-song'],
  ['div_1781517381860_7552', '利州路·利州', 'fac-song'],
  ['div_1781496969104_1455', '京西北路·西京河南府', 'fac-song'],
  ['div_1781497597433_9652', '京畿路·东京开封府', 'fac-song'],
  ['div_1781517431064_1684', '多康北缘诸部', 'fac-kham'],
  ['div_1781497666750_6328', '成都府路·成都府', 'fac-song'],
  ['div_1781497467553_2755', '京西南路·襄阳府', 'fac-song'],
  ['div_1781399765352_4554', '多康东南缘诸部', 'fac-kham'],
  ['div_1781496969104_9532', '荆湖北路·鄂州', 'fac-song'],
  ['div_1781497522354_5010', '江南东路·江宁府', 'fac-song'],
  ['div_1781497627068_1120', '潼川府路·潼川府', 'fac-song'],
  ['div_1781351856060_5466', '两浙路·杭州', 'fac-song'],
  ['div_1781320285806_3910', '成都府路·雅州', 'fac-song'],
  ['div_1781497436724_9495', '荆湖南路·潭州', 'fac-song'],
  ['div_1781348933976_6593', '江南西路·洪州', 'fac-song'],
  ['div_1781321652810_217', '夔州路·夔州', 'fac-song'],
  ['div_1781349205847_2455', '福建路·福州', 'fac-song'],
  ['div_1781327567438_8817', '广南西路·桂州', 'fac-song'],
  ['div_1781396202102_998', '流求岛诸部', 'fac-liuqiu'],
  ['div_1781328222161_4358', '广南东路·广州', 'fac-song'],
  ['div_1781347270363_2858', '广南西路·琼州', 'fac-song'],
  ['div_1781355389457_4291', '会宁府', 'fac-jin'],
  ['div_1781400860458_8911', '黑水诸部', 'fac-beihai'],
  ['div_1781355282408_4555', '金北边契丹诸部', 'fac-jin'],
  ['div_1781355478586_819', '合懒路', 'fac-jin'],
  ['div_1781400840305_8989', '骨嵬诸部', 'fac-beihai'],
  ['div_1781400887935_8938', '夜叉诸部', 'fac-beihai'],
  ['div_1781400814895_6332', '流鬼诸部', 'fac-beihai'],
  ['div_1781355567346_9326', '辽阳府·复州', 'fac-jin'],
  ['div_1781498019765_3252', '平州军帅司', 'fac-jin'],
  ['div_1781498114835_4296', '河东北路·太原府', 'fac-jin'],
  ['div_1781498100984_6331', '河东南路·平阳府', 'fac-jin'],
  ['div_1781498010824_6498', '河北东路·河间府', 'fac-jin'],
  ['div_1781497994899_9662', '河北西路·真定府', 'fac-jin'],
  ['div_1781400785960_8090', '虾夷地', 'fac-beihai'],
  ['div_1781498061377_8807', '河东南路·河中府', 'fac-jin'],
  ['div_1781497921769_4411', '河东南路·隆德府', 'fac-jin'],
  ['div_1781355136177_3747', '肃州南境', 'fac-xixia'],
  ['div_1781517708481_3401', '罗布泊东南诸部', 'fac-qocho'],
  ['div_1781517737733_1421', '瓜州南境', 'fac-xixia'],
  ['div_1781517737733_8664', '甘州南境', 'fac-xixia'],
  ['div_1781517494688_2820', '青唐北界诸部', 'fac-tubo'],
  ['div_1781517373721_6009', '熙河兰廓路·熙州', 'fac-song'],
  ['div_1781355004544_6738', '多康东北诸部', 'fac-kham'],
  ['div_1781497218186_3334', '利州路·兴元府', 'fac-song'],
  ['div_1781497088960_7088', '磁相忠义寨', 'fac-hebei-yijun'],
  ['div_1781517873347_6141', '鄜延路·延安府', 'fac-song'],
  ['div_1781517873347_1407', '秦凤路·凤翔府', 'fac-song'],

  // Western Xia: the capital basin, Hexi corridor and Ordos frontier.
  ['div_1781355155816_8574', '阿尔金山北麓诸部', 'fac-tubo'],
  ['div_1781355214960_3469', '柴达木北缘诸部', 'fac-tubo'],

  // Southwest reset: Dali is one coarse Yunnan block; adjacent uplands are not Dali prefectures.
  ['div_1781350339046_4481', '滇西金齿诸部', 'fac-jinchi'],
  ['div_1781349402194_181', '强宗·休制诸部', 'fac-xinan-tribes'],
  ['div_1781350108121_7039', '滇南诸部', 'fac-xinan-tribes'],
  ['div_1781350414374_3519', '金齿诸部·滇缅山地', 'fac-jinchi'],
  ['div_1781319524909_9396', '建昌南部诸部', 'fac-jianchang'],
  ['div_1781319876963_6025', '建昌诸部', 'fac-jianchang'],
  ['div_1781350376226_9266', '金齿诸部·西北山地', 'fac-jinchi'],
  ['div_1781320436915_2696', '磨些诸部·滇西北', 'fac-nw-yunnan'],
  ['div_1781350358486_7868', '金齿诸部·伊洛瓦底上游', 'fac-jinchi'],
  ['div_1781319647068_4625', '乌蒙乌撒东部诸部', 'fac-wumeng'],
  ['div_1781349366104_7290', '滇黔边诸部', 'fac-xinan-tribes'],
  ['div_1781349430127_9836', '红河上游诸部', 'fac-xinan-tribes'],
  ['div_1781350291174_9801', '掸邦北部', 'fac-pagan'],
  ['div_1781320724075_8452', '西洱河诸部', 'fac-nw-yunnan'],
  ['div_1781350142225_295', '上缅甸·蒲甘', 'fac-pagan'],
  ['div_1781350389190_5641', '金齿诸部·西部山地', 'fac-jinchi'],
  ['div_1781320525555_5507', '乌蒙诸部', 'fac-wumeng'],
  ['div_1781327991857_7259', '云南·大理国', 'fac-dali'],
  ['div_1781350455463_3067', '罗婺诸部', 'fac-wumeng'],
  ['div_1781349528576_5328', '滇南溪洞诸部', 'fac-xinan-tribes'],
  ['div_1781349469455_7821', '特磨道诸部', 'fac-xinan-tribes'],
  ['div_1781350274495_4414', '若开山地', 'fac-pagan'],
  ['div_1781350305715_4661', '下缅甸孟地', 'fac-pagan'],
  ['div_1781350070961_7094', '步雄诸部', 'fac-xinan-tribes'],
  ['div_1781350233006_829', '嶍峨诸部', 'fac-xinan-tribes'],
  ['div_1781319502316_8596', '乌撒诸部', 'fac-wumeng'],
  ['div_1781349341712_5958', '乌蒙乌撒南缘诸部', 'fac-wumeng'],
  ['div_1781349316767_8229', '罗殿国', 'fac-luodian'],
  ['div_1781349498966_6616', '自杞国', 'fac-ziqi'],

  // Tibetan plateau. Song still holds the northeastern Xihe-Lankuo prefectures.
  ['div_1781355073401_8763', '青海西部诸部', 'fac-tubo'],
  ['div_1781355023938_2666', '多康东北缘诸部', 'fac-kham'],
  ['div_1781400117880_4382', '阿里三围·古格', 'fac-guge'],
  ['div_1781400032855_558', '卫地·逻些', 'fac-tubo'],
  ['div_1781399857240_6102', '多康川西诸部', 'fac-kham'],
  ['div_1781399977547_4126', '卫地诸部', 'fac-tubo'],
  ['div_1781400081462_266', '藏地诸部', 'fac-tubo'],
  ['div_1781320242432_5349', '多康南缘诸部', 'fac-kham'],
  ['div_1781400197584_2963', '多康西南诸部', 'fac-kham'],
  ['div_1781400142449_9259', '雅隆诸部', 'fac-tubo'],
  ['div_1781400186914_8724', '多康西部诸部', 'fac-kham'],
  ['div_1781400209984_411', '多康中部诸部', 'fac-kham'],
  ['div_1781400221961_6335', '多康东部诸部', 'fac-kham'],
  ['div_1781400239223_6336', '多康东南诸部', 'fac-kham'],

  // Đại Việt under the Lý dynasty.
  ['div_1781350622895_2856', '升龙京畿', 'fac-daiviet'],
  ['div_1781349565199_7418', '广源州', 'fac-daiviet'],
  ['div_1781349851998_1436', '谅州', 'fac-daiviet'],
  ['div_1781349885159_9314', '峰州', 'fac-daiviet'],
  ['div_1781349920055_2206', '富良府', 'fac-daiviet'],
  ['div_1781349900872_5017', '农州', 'fac-daiviet'],
  ['div_1781349824470_5515', '红河三角洲南缘', 'fac-daiviet'],
  ['div_1781349981887_9247', '清化府', 'fac-daiviet'],
  ['div_1781349997872_7279', '海东路', 'fac-daiviet'],
  ['div_1781349947087_7864', '乂安州', 'fac-daiviet'],

  // Western Regions and the Western Xia-held eastern end of the Hexi corridor.
  ['div_1781399597964_518', '可敦城北境', 'fac-kereit'],
  ['div_1781517651722_8664', '伊州', 'fac-qocho'],
  ['div_1781399253834_4024', '沙州监军司', 'fac-xixia'],
  ['div_1781517670496_1113', '龟兹', 'fac-karakhan-east'],
  ['div_1781399423953_7128', '西州', 'fac-qocho'],
  ['div_1781399384224_1412', '高昌', 'fac-qocho'],
  ['div_1781399325499_1598', '焉耆', 'fac-qocho'],
  ['div_1781399434553_5491', '交河', 'fac-qocho'],
  ['div_1781399653816_6249', '怛罗斯', 'fac-karakhan-east'],
  ['div_1781517679548_4691', '且末', 'fac-karakhan-east'],
  ['div_1781517670495_2568', '温宿', 'fac-karakhan-east'],
  ['div_1781399312581_33', '车师', 'fac-qocho'],
  ['div_1781517679548_69', '轮台', 'fac-qocho'],
  ['div_1781399166962_2104', '北庭', 'fac-qocho'],
  ['div_1781399219667_8436', '柳中', 'fac-qocho'],
  ['div_1781398953201_7019', '姑墨', 'fac-karakhan-east'],
  ['div_1781399219667_6447', '瓜州西平监军司', 'fac-xixia'],
  ['div_1781396278332_8754', '拨换', 'fac-karakhan-east'],
  ['div_1781396380734_6185', '蒲昌', 'fac-qocho'],
  ['div_1781396396805_760', '肃州监军司', 'fac-xixia'],
  ['div_1781396637411_1817', '阿图什', 'fac-karakhan-east'],
  ['div_1781396688877_102', '尼雅', 'fac-karakhan-east'],
  ['div_1781497361038_6100', '石国', 'fac-karakhan-west'],
  ['div_1781396688877_1976', '克里雅', 'fac-karakhan-east'],
  ['div_1781396669125_2945', '莎车', 'fac-karakhan-east'],
  ['div_1781396757028_482', '英吉沙', 'fac-karakhan-east'],
  ['div_1781396669125_5104', '于阗', 'fac-karakhan-east'],
  ['div_1781396870749_1530', '据史德', 'fac-karakhan-east'],
  ['div_1781396596863_9020', '精绝', 'fac-karakhan-east'],
  ['div_1781396870749_7400', '疏勒', 'fac-karakhan-east'],

  // Steppe, southern Mongolian frontier and the corrected Jin/Xia borderlands.
  ['div_1781354907097_181', '塔塔儿·捕鱼儿湖西部', 'fac-tatar'],
  ['div_1781354940257_9797', '上京·临潢府', 'fac-jin'],
  ['div_1781354875218_3811', '塔塔儿·捕鱼儿湖东部', 'fac-tatar'],
  ['div_1781399059930_9261', '克烈部·土兀剌河', 'fac-kereit'],
  ['div_1781354884872_8567', '金西北边契丹诸部', 'fac-jin'],
  ['div_1781399059930_267', '乃蛮部·阿尔泰东麓', 'fac-caoyuan'],
  ['div_1781354850978_1672', '塔塔儿南缘', 'fac-tatar'],
  ['div_1781354636130_9241', '塔塔儿西部', 'fac-tatar'],
  ['div_1781354621786_7079', '蒙兀诸部·三河源', 'fac-mongol'],
  ['div_1781354767360_4346', '蒙兀诸部·克鲁伦河', 'fac-mongol'],
  ['div_1781354750105_8756', '克烈部·杭爱东麓', 'fac-kereit'],
  ['div_1781354740329_267', '蔑儿乞部·色楞格河', 'fac-merkit'],
  ['div_1781353301006_5039', '蒙兀诸部·鄂嫩河', 'fac-mongol'],
  ['div_1781354706273_5795', '塔塔儿东部', 'fac-tatar'],
  ['div_1781353290805_6476', '弘吉剌部·西部', 'fac-qongirat'],
  ['div_1781353185402_6378', '蒙兀诸部·肯特山', 'fac-mongol'],
  ['div_1781353164644_1158', '漠北西南诸部', 'fac-caoyuan'],
  ['div_1781353125973_7975', '弘吉剌部·东部', 'fac-qongirat'],
  ['div_1781398917434_6580', '八剌沙衮', 'fac-karakhan-east'],
  ['div_1781354836536_6660', '中京·大定府', 'fac-jin'],
  ['div_1781397438204_2319', '甘州甘肃监军司', 'fac-xixia'],
  ['div_1781353113596_528', '西京路·云内州', 'fac-jin'],
  ['div_1781397870896_989', '阴山西部诸部', 'fac-ongud'],
  ['div_1781352947796_7235', '西京路·丰州天德军', 'fac-jin'],
  ['div_1781352933684_5384', '西京路·大同府', 'fac-jin'],
  ['div_1781397694572_1060', '麟府路·麟州', 'fac-song'],
  ['div_1781397675571_1009', '灵州·盐州', 'fac-xixia'],
  ['div_1781397632377_3900', '中兴府', 'fac-xixia'],
  ['div_1781397556155_6375', '西凉府', 'fac-xixia'],
  ['div_1781397803525_1767', '建宁寨', 'fac-xixia'],
  ['div_1781397651196_5443', '夏州·宥州', 'fac-xixia'],
  ['div_1781397592435_3844', '怀德军', 'fac-xixia'],
  ['div_1781352288643_2132', '京东两路·东平济南青州', 'fac-song'],

  // Japan and maritime islands. The small island south of Goryeo is Jeju/Tamna,
  // not part of the Japanese archipelago block.
  ['div_1781400739769_3153', '东山道·陆奥', 'fac-japan'],
  ['div_1781400705823_4094', '东海道', 'fac-japan'],
  ['div_1781400715695_6981', '北陆道', 'fac-japan'],
  ['div_1781400673164_6669', '畿内', 'fac-japan'],
  ['div_1781400651881_7356', '山阳道·山阴道', 'fac-japan'],
  ['div_1781400635057_5515', '南海道·四国', 'fac-japan'],
  ['div_1781400471783_6944', '耽罗郡', 'fac-goryeo'],
  ['div_1781400616464_643', '西海道·大宰府', 'fac-japan'],
  ['div_1781400517723_5245', '吕宋岛诸邦', 'fac-nanhai'],
  ['div_1781400559624_8594', '米沙鄢诸岛', 'fac-visayas'],
  ['div_1781400532282_9863', '麻逸·民都洛', 'fac-mai'],
  ['div_1781400578456_7775', '蒲端国', 'fac-butuan']
];

const SCENARIO_FACTION_CONFIGS = [
  {
    id: 'fac_karakhan_east', baseId: 'fac_xiyu', name: '东喀喇汗国', type: '西域汗国',
    leader: '艾哈迈德汗', capital: '八剌沙衮、疏勒', strength: 28, cultureLevel: 7,
    ideology: '喀喇汗王族分封而治，奉伊斯兰教，统合七河、疏勒与于阗诸绿洲。',
    longTermStrategy: '守住八剌沙衮与疏勒两大中心，控制南北丝路，并防备耶律大石继续西进。',
    primaryTarget: '维持七河与西部塔里木盆地的汗权', primaryThreat: '耶律大石西迁与诸王分裂',
    mainResources: ['突厥骑兵', '丝路商税', '疏勒绿洲', '于阗玉石'], treasury: 110000, population: 760000,
    stateDescription: '建炎元年八月，艾哈迈德汗仍统治东喀喇汗国；八剌沙衮尚未被耶律大石夺取，高昌回鹘亦未成为西辽属国。',
    history: '喀喇汗国十一世纪中叶分裂；东汗国以八剌沙衮、疏勒为中心，一〇〇六年前后兼并于阗，至一一二七年仍是西域东部主要伊斯兰政权。',
    traits: ['绿洲汗国', '伊斯兰政权', '丝路贸易', '诸王分封'], posture: '守境戒备', naturalAllies: [], warState: '戒备'
  },
  {
    id: 'fac_karakhan_west', baseId: 'fac_xiyu', name: '西喀喇汗国', type: '塞尔柱属国',
    leader: '穆罕默德·阿尔斯兰汗', capital: '撒马尔罕', strength: 24, cultureLevel: 8,
    ideology: '以撒马尔罕为中心的突厥伊斯兰汗国，名义臣属于塞尔柱苏丹。',
    longTermStrategy: '依托河中城邦和塞尔柱宗主权，维持对石国等东缘商路的控制。',
    primaryTarget: '维持河中与石国商路', primaryThreat: '东喀喇汗争界与契丹西迁',
    mainResources: ['河中商税', '突厥骑兵', '粟特城镇', '丝路商队'], treasury: 125000, population: 900000,
    stateDescription: '建炎元年八月，穆罕默德·阿尔斯兰汗在位，西喀喇汗国仍臣属于塞尔柱；石国属于其东部势力范围。',
    history: '西喀喇汗国十一世纪中叶形成，一〇八九年后受塞尔柱控制；一一二七年尚未遭西辽击败。',
    traits: ['塞尔柱属国', '河中城邦', '伊斯兰政权', '丝路贸易'], posture: '守成观望', naturalAllies: [], warState: '观望'
  },
  {
    id: 'fac_qocho', baseId: 'fac_xiyu', name: '高昌回鹘', type: '回鹘亦都护国',
    leader: '毕勒哥亦都护', capital: '高昌、西州与北庭', strength: 18, cultureLevel: 8,
    ideology: '回鹘佛国，以亦都护统治高昌、西州、北庭诸绿洲，兼行回鹘文与汉地佛教传统。',
    longTermStrategy: '凭绿洲坚城和商路维持独立，在东喀喇汗、西夏与耶律大石之间审势自保。',
    primaryTarget: '保有高昌与北庭绿洲', primaryThreat: '东喀喇汗东逼与耶律大石西来',
    mainResources: ['绿洲屯田', '葡萄与棉布', '佛寺网络', '丝路商税'], treasury: 85000, population: 420000,
    stateDescription: '建炎元年八月，高昌回鹘仍为独立的亦都护国；其臣服耶律大石发生在一一二八年，不能提前并入西辽。',
    history: '九世纪回鹘南迁建立高昌回鹘；十一世纪末失去温宿、姑墨与龟兹，但仍控制高昌、西州、北庭及轮台等东部绿洲。',
    traits: ['佛教回鹘', '绿洲城邦', '丝路贸易', '恃城自守'], posture: '保境观望', naturalAllies: [], warState: '观望'
  },
  {
    id: 'fac_guge', baseId: 'fac_tubo', name: '古格王国', type: '西部吐蕃王国',
    leader: '古格王', capital: '扎布让', strength: 10, cultureLevel: 6,
    ideology: '吉德尼玛衮王系之西部吐蕃王国，以佛教后弘上路传统为立国根本。',
    longTermStrategy: '据阿里高原与扎布让、托林诸地，维持古格王室在西部吐蕃的统治与商路。',
    primaryTarget: '维持阿里古格王权', primaryThreat: '阿里诸王系竞争与商路衰落',
    mainResources: ['阿里牧地', '托林寺佛教网络', '喜马拉雅西部商路'], treasury: 24000, population: 150000,
    stateDescription: '建炎元年八月，古格王国仍统治阿里西部核心区，与普兰、拉达克等西部吐蕃王系并立，不受逻些或青唐节制。',
    history: '吐蕃帝国崩溃后，吉德尼玛衮西走阿里；其子孙在十世纪建立古格等西部王国，一〇四二年阿底峡入藏后佛教后弘益盛。',
    traits: ['吐蕃王系', '高原王国', '佛教后弘', '西部商路'], posture: '据境守国', naturalAllies: [], warState: '和平'
  },
  {
    id: 'fac_tubo', baseId: 'fac_tubo', name: '卫藏诸部', type: '中部吐蕃诸王系与寺院势力',
    leader: '卫藏诸王系与寺院首领', capital: '无统一都城；逻些为重要中心', strength: 14, cultureLevel: 6,
    ideology: '吐蕃帝国分裂后，卫、藏、逻些与雅隆各王系、贵族与寺院各自为政。',
    longTermStrategy: '各守本部与寺院田地，在不形成统一王权的情况下维持卫藏诸地的贵族、寺院秩序。',
    primaryTarget: '维持卫藏诸部自治', primaryThreat: '诸王系内战与寺院竞争',
    mainResources: ['雅鲁藏布江谷地', '寺院庄园', '高原牧业', '吐蕃贵族武装'], treasury: 30000, population: 520000,
    stateDescription: '建炎元年八月仍属吐蕃分裂时期；卫、藏、逻些、雅隆诸王系与寺院彼此不统属，无共主也无统一都城。',
    history: '八四二年后吐蕃王统崩溃，卫藏诸地长期分裂；十一世纪后佛教后弘盛行，诸教派寺院与地方王系并立。',
    traits: ['吐蕃分裂', '王系林立', '寺院势力', '无统一共主'], posture: '分立自守', naturalAllies: [], warState: '分立'
  },
  {
    id: 'fac_kham', baseId: 'fac_tubo', name: '多康诸部', type: '东部吐蕃部落群',
    leader: '多康各部首领', capital: '无固定都城', strength: 12, cultureLevel: 5,
    ideology: '多康各部、贵族与寺院依高原谷地分散自守，不受卫藏或青唐统一节制。',
    longTermStrategy: '依托横断山地、牧场与川藏滇藏商路维持各部自主，避免为宋、大理或其他高原势力并吞。',
    primaryTarget: '维持多康诸部自主', primaryThreat: '邻境政权羁縻扩张与部落内争',
    mainResources: ['高原牧场', '川藏滇藏商路', '部落骑兵', '寺院网络'], treasury: 22000, population: 430000,
    stateDescription: '建炎元年八月，多康东西各部尚处分散格局，与卫藏诸部、古格王国与河湟地区分属不同政治系统。',
    history: '吐蕃帝国时期将东部广大地区称为多康；帝国崩溃后，当地部落、贵族与寺院长期各自为政。',
    traits: ['东部吐蕃', '部落分立', '高原商路', '山地骑兵'], posture: '诸部自守', naturalAllies: [], warState: '分立'
  },
  {
    id: 'fac_caoyuan', baseId: 'fac_caoyuan', name: '乃蛮部', type: '西部草原部落联盟',
    leader: '乃蛮诸部首领', capital: '无固定都城', strength: 18, cultureLevel: 4,
    ideology: '西部蒙古高原的突厥—蒙古语部落联盟，以阿尔泰东麓牧地为根本。',
    longTermStrategy: '守住阿尔泰东麓与西部草原牧道，在克烈、高昌回鹘与阴山诸部之间维持自主。',
    primaryTarget: '维持西部草原与阿尔泰牧地', primaryThreat: '克烈东逼与西部商路争夺',
    mainResources: ['战马', '牛羊', '皮毛', '阿尔泰牧地'], treasury: 22000, population: 130000,
    stateDescription: '建炎元年八月，乃蛮活动于蒙古高原西部，不能与克烈、蒙兀、塔塔儿合并为统一漠北势力。',
    history: '乃蛮在十二世纪形成西部草原的重要部落联盟，核心地域在今西蒙古一带。',
    traits: ['西部草原', '阿尔泰牧地', '部落联盟'], posture: '守境争牧', naturalAllies: [], warState: '分立'
  },
  {
    id: 'fac_kereit', baseId: 'fac_caoyuan', name: '克烈部', type: '中部草原部落联盟',
    leader: '克烈诸部首领', capital: '土兀剌河流域', strength: 20, cultureLevel: 5,
    ideology: '以土兀剌河、杭爱东麓至克鲁伦上游牧地为基础的部落联盟。',
    longTermStrategy: '控制中部草原牧道，并在乃蛮、蔑儿乞、蒙兀诸部之间维持优势。',
    primaryTarget: '控制土兀剌河与杭爱东麓', primaryThreat: '乃蛮竞争与蒙兀诸部崛起',
    mainResources: ['战马', '牧群', '中部草原商路'], treasury: 26000, population: 140000,
    stateDescription: '建炎元年八月，克烈已是中部蒙古高原的重要部族集团，但尚非后来王罕时代的统一汗国。',
    history: '克烈在十二世纪活动于蒙古高原中部，势力范围与土兀剌河、鄂尔浑—克鲁伦之间的牧地密切相关。',
    traits: ['中部草原', '部落联盟', '牧道争夺'], posture: '扩张争牧', naturalAllies: [], warState: '分立'
  },
  {
    id: 'fac_merkit', baseId: 'fac_caoyuan', name: '蔑儿乞部', type: '色楞格河部落联盟',
    leader: '蔑儿乞诸部首领', capital: '无固定都城', strength: 12, cultureLevel: 4,
    ideology: '依色楞格河与鄂尔浑河下游牧地分布的部落集团。',
    longTermStrategy: '守住色楞格河谷和北方牧地，抵御克烈与蒙兀诸部挤压。',
    primaryTarget: '维持色楞格河谷牧地', primaryThreat: '克烈与蒙兀诸部争牧',
    mainResources: ['河谷牧场', '战马', '皮毛'], treasury: 12000, population: 70000,
    stateDescription: '建炎元年八月，蔑儿乞应位于色楞格—鄂尔浑下游，旧图把其名称放到金朝河东边缘是严重错位。',
    history: '蔑儿乞是十二世纪蒙古高原五大部族集团之一，主要活动于色楞格河与鄂尔浑河下游。',
    traits: ['色楞格河', '北方牧地', '部落联盟'], posture: '据河自守', naturalAllies: [], warState: '分立'
  },
  {
    id: 'fac_mongol', baseId: 'fac_caoyuan', name: '蒙兀诸部', type: '鄂嫩—克鲁伦部落联盟',
    leader: '合不勒等蒙兀首领', capital: '无固定都城', strength: 18, cultureLevel: 4,
    ideology: '乞颜、泰赤乌、札只剌等蒙兀核心部族依鄂嫩河、克鲁伦河与肯特山分布。',
    longTermStrategy: '联合三河源诸部，抵御金朝北进并同塔塔儿、克烈争夺牧地。',
    primaryTarget: '整合鄂嫩—克鲁伦—肯特山诸部', primaryThreat: '金朝征讨与塔塔儿竞争',
    mainResources: ['三河源牧场', '战马', '猎场', '部落骑兵'], treasury: 18000, population: 130000,
    stateDescription: '建炎元年八月，辽亡不久，合不勒等蒙兀首领正开始扩张；泰赤乌属于蒙兀核心，不应被拆到金朝河东边缘。',
    history: '辽亡后蒙兀诸部在鄂嫩、克鲁伦与土兀剌河流域渐趋联合，后来形成合木黑蒙古联盟。',
    traits: ['三河源', '乞颜泰赤乌', '对金抗争'], posture: '联合扩张', naturalAllies: [], warState: '争雄'
  },
  {
    id: 'fac_tatar', baseId: 'fac_caoyuan', name: '塔塔儿联盟', type: '东部草原部落联盟',
    leader: '塔塔儿诸部首领', capital: '捕鱼儿湖周边', strength: 19, cultureLevel: 4,
    ideology: '东部蒙古高原诸塔塔儿部依捕鱼儿湖与呼伦草原结盟。',
    longTermStrategy: '控制东部草原牧地，在金朝与蒙兀诸部之间保持优势。',
    primaryTarget: '维持捕鱼儿湖与东部草原联盟', primaryThreat: '蒙兀诸部西东争牧与金朝利用',
    mainResources: ['东部草原', '战马', '牛羊', '对金互市'], treasury: 21000, population: 130000,
    stateDescription: '建炎元年八月，塔塔儿是东部草原部落联盟，与金时附时离；旧辽称“阻卜”不再适合作为其地块名。',
    history: '塔塔儿诸部长期活动在蒙古高原东部，十二世纪既与金往来，也同蒙兀诸部持续竞争。',
    traits: ['东部草原', '捕鱼儿湖', '对金往来'], posture: '附金争牧', naturalAllies: [], warState: '争雄'
  },
  {
    id: 'fac_qongirat', baseId: 'fac_caoyuan', name: '弘吉剌部', type: '东南草原部落集团',
    leader: '弘吉剌诸部首领', capital: '无固定都城', strength: 12, cultureLevel: 4,
    ideology: '活动于蒙兀诸部东南与塔塔儿西南缘的部落集团。',
    longTermStrategy: '维持东南草原牧地，并在蒙兀、塔塔儿与金北界之间结盟自保。',
    primaryTarget: '维持东南草原牧地', primaryThreat: '塔塔儿与蒙兀诸部夹击',
    mainResources: ['战马', '牧群', '婚盟网络'], treasury: 11000, population: 80000,
    stateDescription: '建炎元年八月，弘吉剌与蒙兀、塔塔儿彼此不统属，不能继续并入统一漠北势力。',
    history: '弘吉剌是十二世纪东南蒙古高原的重要部落集团，后来以婚盟闻名。',
    traits: ['东南草原', '婚盟网络', '部落集团'], posture: '结盟自守', naturalAllies: [], warState: '分立'
  },
  {
    id: 'fac_ongud', baseId: 'fac_caoyuan', name: '阴山诸部', type: '金北界阴山蕃部',
    leader: '阴山诸部首领', capital: '阴山—云内一带', strength: 15, cultureLevel: 5,
    ideology: '阴山、云内与金长城北缘的突厥语诸部，构成后来汪古部的前身集团。',
    longTermStrategy: '依附金朝守边互市，同时保存本部牧地与首领权力。',
    primaryTarget: '维持阴山与金北界牧地', primaryThreat: '金朝直接控制与北方部族南压',
    mainResources: ['阴山牧地', '边市', '战马', '守边骑兵'], treasury: 17000, population: 120000,
    stateDescription: '建炎元年八月，阴山—云内诸部处在金朝北部边防体系内；“汪古”作为成熟部名稍晚，本图以阴山诸部并注汪古前身处理。',
    history: '十二世纪阴山及长城北缘突厥语部落逐渐形成后来汪古集团，并为金朝承担北境守边职能。',
    traits: ['阴山牧地', '金朝守边', '汪古前身'], posture: '附金守边', naturalAllies: ['金朝'], warState: '羁縻'
  },
  {
    id: 'fac_goryeo', baseId: 'fac_daiviet', name: '高丽', type: '王国', leader: '高丽仁宗', capital: '开京',
    strength: 34, cultureLevel: 8, ideology: '高丽王朝以开京为中心，行五道两界制。',
    longTermStrategy: '守鸭绿江边界，在金宋之间维持王国安全。', primaryTarget: '守五道两界', primaryThreat: '金朝东境压力',
    mainResources: ['稻米', '人参', '陶瓷', '边军'], treasury: 170000, population: 2800000,
    stateDescription: '建炎元年八月，高丽仁宗在位，半岛由高丽王朝统一控制。', history: '高丽王朝自九一八年立国，十一世纪形成五道两界格局。',
    traits: ['五道两界', '半岛王国', '文官政治'], posture: '谨慎守境', naturalAllies: [], warState: '和平'
  },
  {
    id: 'fac_pagan', baseId: 'fac_dali', name: '蒲甘王朝', type: '缅甸王国',
    leader: '阿朗悉都', capital: '蒲甘', strength: 22, cultureLevel: 6,
    ideology: '以伊洛瓦底江流域为核心的缅族王国，奉上座部佛教，承阿奴律陀以来统一缅甸主体的格局。',
    longTermStrategy: '守住蒲甘与伊洛瓦底江中上游，同时维持对掸地、若开山地和下缅孟地的影响。',
    primaryTarget: '维持蒲甘王朝在缅甸主体的统治', primaryThreat: '边地掸部、若开山地与下缅孟人离心',
    mainResources: ['伊洛瓦底江谷地稻作', '佛寺庄园', '缅族步骑', '下缅商道'], treasury: 52000, population: 900000,
    stateDescription: '建炎元年八月，阿朗悉都在位，蒲甘王朝控制缅甸主体；大理不应越过滇西边境吞并整片缅甸。',
    history: '蒲甘王朝一〇四四年兴起，阿奴律陀征服掸族和孟族并扩展领土；一一一一年至一一六七年阿朗悉都在位，正覆盖建炎元年。',
    traits: ['伊洛瓦底江王国', '上座部佛教', '缅族王朝', '掸孟边地'], posture: '守境整合', naturalAllies: [], warState: '和平'
  },
  {
    id: 'fac_jianchang', baseId: 'fac_xinan_tribes', name: '建昌诸部', type: '川滇边乌蛮部族集团',
    leader: '建昌诸部首领', capital: '无统一都城', strength: 10, cultureLevel: 4,
    ideology: '建昌川谷与川滇边诸部依山谷、盐马道和寨落分立自守。',
    longTermStrategy: '维持建昌川谷与金沙江北缘牧地，周旋于宋、大理和乌蒙诸部之间。',
    primaryTarget: '维持建昌川滇边诸部自主', primaryThreat: '宋朝羁縻深入与大理北扩',
    mainResources: ['山地牧场', '战马', '盐马道'], treasury: 9000, population: 70000,
    stateDescription: '建炎元年八月，建昌与川滇边诸部并非大理直辖府县，也不受单一首领统合。',
    history: '建昌一带长期为乌蛮、罗罗斯等山地部族活动区，夹处宋川峡与大理北境。',
    traits: ['建昌川谷', '乌蛮诸部', '盐马交通'], posture: '山地自守', naturalAllies: [], warState: '分立'
  },
  {
    id: 'fac_nw_yunnan', baseId: 'fac_xinan_tribes', name: '滇西北诸部', type: '磨些与西洱河山地诸部',
    leader: '磨些与西洱河诸部首领', capital: '无统一都城', strength: 9, cultureLevel: 4,
    ideology: '磨些、西洱河及澜沧江上游诸部依高山河谷分立。',
    longTermStrategy: '守住滇西北河谷与横断山商路，避免被大理核心或多康诸部吞并。',
    primaryTarget: '维持滇西北诸部自主', primaryThreat: '大理与高原部族争夺河谷商路',
    mainResources: ['河谷农牧', '马匹', '横断山商路'], treasury: 8000, population: 60000,
    stateDescription: '建炎元年八月，滇西北磨些与西洱河诸部保持地方首领统治，不按大理普通府县处理。',
    history: '磨些诸部早见于南诏时代记录，长期分布于滇西北与横断山河谷。',
    traits: ['磨些诸部', '横断山河谷', '山地商路'], posture: '据谷自守', naturalAllies: [], warState: '分立'
  },
  {
    id: 'fac_wumeng', baseId: 'fac_xinan_tribes', name: '乌蒙乌撒诸部', type: '滇东北乌蛮部族集团',
    leader: '乌蒙、乌撒、罗婺诸部首领', capital: '无统一都城', strength: 12, cultureLevel: 4,
    ideology: '乌蒙、乌撒、罗婺等乌蛮诸部各据山地与寨城，彼此同源而不统一。',
    longTermStrategy: '控制滇东北至黔西南山地、马匹与盐道，在大理、宋与罗殿之间维持自主。',
    primaryTarget: '维持乌蒙乌撒罗婺诸部自治', primaryThreat: '大理属部扩张与宋朝羁縻',
    mainResources: ['战马', '山地寨落', '铜矿', '盐道'], treasury: 12000, population: 110000,
    stateDescription: '建炎元年八月，乌蒙、乌撒、罗婺是多个部族集团；本图合并为同色势力仅表达区域联盟层级，不套用元代宣慰司。',
    history: '乌蒙、乌撒、罗婺部名源于当地乌蛮集团；后世元代行政机构不能倒推为十二世纪统一政权。',
    traits: ['乌蛮诸部', '滇东北山地', '马匹盐道'], posture: '诸部自守', naturalAllies: [], warState: '分立'
  },
  {
    id: 'fac_jinchi', baseId: 'fac_xinan_tribes', name: '金齿诸部', type: '滇西缅北山地部族集团',
    leader: '金齿及滇缅山地诸部首领', capital: '无统一都城', strength: 11, cultureLevel: 4,
    ideology: '金齿、漆齿及伊洛瓦底上游山地诸部依河谷和山寨分立。',
    longTermStrategy: '控制滇西至伊洛瓦底上游山道，在大理与蒲甘之间维持自主。',
    primaryTarget: '维持滇西缅北诸部自主', primaryThreat: '大理与蒲甘向山地推进',
    mainResources: ['金银', '山林物产', '象马商路', '河谷牧地'], treasury: 11000, population: 90000,
    stateDescription: '建炎元年八月，滇西与缅北山地不属于蒲甘腹地，也不应涂作大理直辖；按金齿等诸部处理。',
    history: '《蛮书》已记永昌、开南一带金齿、漆齿等部族，十二世纪仍应按山地诸部而非掸邦行政区表达。',
    traits: ['金齿诸部', '滇缅山地', '伊洛瓦底上游'], posture: '山地自守', naturalAllies: [], warState: '分立'
  },
  {
    id: 'fac_xinan_tribes', baseId: 'fac_dali', name: '滇中南诸部', type: '滇中南山地部族集团',
    leader: '滇中南各部首领', capital: '无统一都城', strength: 12, cultureLevel: 4,
    ideology: '强宗、休制、步雄、嶍峨、特磨等部依滇中南河谷与寨落分立。',
    longTermStrategy: '在大理核心、罗殿、自杞与大越之间维持部族自治和红河商路。',
    primaryTarget: '维持滇中南诸部自治', primaryThreat: '大理属部整合与大越北境竞争',
    mainResources: ['红河商路', '铜锡矿山', '山地稻作', '部族弓弩兵'], treasury: 14000, population: 90000,
    stateDescription: '建炎元年八月，滇中南分布强宗、休制、步雄、嶍峨、特磨等部；它们与大理关系密切但不作为本图唯一大理核心块。',
    history: '步雄、嶍峨等为大理时期已有部名，特磨道亦见北宋材料；本图按地方诸部表达，不套用元明府路。',
    traits: ['滇中南诸部', '红河商路', '大理外围'], posture: '分散自守', naturalAllies: [], warState: '分立'
  },
  {
    id: 'fac_liuqiu', baseId: 'fac_nanhai', name: '流求诸部', type: '台湾岛部落群',
    leader: '岛上各部首领', capital: '无统一都城', strength: 5, cultureLevel: 3,
    ideology: '台湾岛各部依山海聚落分立，不存在统一的流求王权。',
    longTermStrategy: '维持岛上各部自主，并通过海路与闽粤沿海交换物产。',
    primaryTarget: '维持台湾岛诸部自主', primaryThreat: '外来海商、海寇与强制征服',
    mainResources: ['鹿皮', '渔猎物产', '山林物产'], treasury: 8000, population: 120000,
    stateDescription: '建炎元年八月，本图台湾本岛块按宋人泛称处理为流求岛诸部；岛上并无统一国家，也不归宋朝、日本或菲律宾海国统治。',
    history: '中古汉文史籍以流求称东南海岛，其具体指涉有争议；本图仅用作台湾本岛的时代称谓，不虚构统一王国。',
    traits: ['台湾本岛', '部落分立', '海路交换'], posture: '诸部自守', naturalAllies: [], warState: '和平'
  },
  {
    id: 'fac_nanhai', baseId: 'fac_nanhai', name: '吕宋诸邦', type: '吕宋岛沿海聚落与港邦',
    leader: '吕宋岛各邦首领', capital: '无统一都城', strength: 8, cultureLevel: 3,
    ideology: '吕宋岛各河口港邦与内陆聚落彼此分立，依海贸与稻作维系。',
    longTermStrategy: '守住吕宋岛各自聚落与港口，维持同南海商人的交换。',
    primaryTarget: '维持吕宋岛诸邦自主', primaryThreat: '岛内兼并与外来海上武装',
    mainResources: ['稻米', '蜂蜡', '黄金', '海贸'], treasury: 12000, population: 130000,
    stateDescription: '建炎元年八月，吕宋岛不存在统一吕宋国，本块只合并表达岛上彼此不统属的地方邦国与聚落。',
    history: '吕宋一名见于较晚汉文记录；本图以其作明确地理标识，不把十二世纪岛上诸邦合并成单一王朝。',
    traits: ['吕宋岛', '港邦分立', '南海贸易'], posture: '诸邦自守', naturalAllies: [], warState: '和平'
  },
  {
    id: 'fac_mai', baseId: 'fac_nanhai', name: '麻逸', type: '菲律宾海贸邦国',
    leader: '麻逸国主', capital: '民都洛岛港聚落', strength: 6, cultureLevel: 4,
    ideology: '以岛上港聚落与海贸网络维持的地方邦国。',
    longTermStrategy: '控制民都洛近海航路，与宋商及周边岛邦互市。',
    primaryTarget: '维持麻逸港邦与民都洛航路', primaryThreat: '周边海邦竞争与海盗劫掠',
    mainResources: ['蜂蜡', '棉布', '海产', '转口贸易'], treasury: 10000, population: 40000,
    stateDescription: '麻逸在宋代文献中已有记录；其位置学界仍有民都洛与内湖湾两说，本图按该小岛块的几何位置采用民都洛说。',
    history: '麻逸商人在北宋已见于对华贸易记载，十二世纪仍应作为独立海贸邦国，而非吕宋或米沙鄢的直辖地。',
    traits: ['宋代海贸', '民都洛定位', '港邦政权'], posture: '通商自守', naturalAllies: [], warState: '和平'
  },
  {
    id: 'fac_visayas', baseId: 'fac_nanhai', name: '米沙鄢诸邦', type: '中部菲律宾岛邦群',
    leader: '各岛邦首领', capital: '无统一都城', strength: 7, cultureLevel: 3,
    ideology: '米沙鄢群岛各岛邦、港聚落与部族彼此分立。',
    longTermStrategy: '维持群岛航路与各岛聚落自主。',
    primaryTarget: '维持米沙鄢群岛诸邦自主', primaryThreat: '岛邦战争与海盗袭掠',
    mainResources: ['海产', '蜂蜡', '木材', '群岛航路'], treasury: 9000, population: 80000,
    stateDescription: '建炎元年八月，中部菲律宾群岛不存在统一政权；旧名“三屿”属于更晚时代且地理不合，本图改按米沙鄢诸岛表达。',
    history: '中部菲律宾长期由多个岛邦与聚落组成，本图不以晚出的三屿或苏禄名号提前覆盖该区。',
    traits: ['群岛诸邦', '海上交通', '无统一共主'], posture: '分立通商', naturalAllies: [], warState: '和平'
  },
  {
    id: 'fac_butuan', baseId: 'fac_nanhai', name: '蒲端国', type: '棉兰老岛海贸政权',
    leader: '蒲端国主', capital: '蒲端', strength: 8, cultureLevel: 5,
    ideology: '以棉兰老岛东北河口港邦、黄金生产与远洋贸易为根基。',
    longTermStrategy: '控制阿古桑河口与黄金贸易，维持对宋朝贡和群岛航路。',
    primaryTarget: '维持蒲端港邦与黄金贸易', primaryThreat: '周边岛邦竞争与海路中断',
    mainResources: ['黄金', '舟船', '蜂蜡', '海贸'], treasury: 18000, population: 30000,
    stateDescription: '蒲端国位于棉兰老岛东北部，是宋代已有明确朝贡记录的独立海贸政权，不属于所谓南海诸番联盟。',
    history: '蒲端国在宋真宗景德元年、景德四年和大中祥符四年先后遣使入贡，至十二世纪应继续按独立政权表达。',
    traits: ['棉兰老东北', '黄金贸易', '对宋朝贡'], posture: '通商朝贡', naturalAllies: [], warState: '和平'
  },
  {
    id: 'fac_beihai', baseId: 'fac_caoyuan', name: '北海诸部', type: '北海部族', leader: '各部酋长', capital: '无固定都城',
    strength: 10, cultureLevel: 3, ideology: '黑水、骨嵬、流鬼、夜叉与虾夷诸部各守其地。',
    longTermStrategy: '依渔猎与海路贸易自存。', primaryTarget: '保有北海岛屿与沿岸猎场', primaryThreat: '金朝与日本势力北进',
    mainResources: ['鱼皮', '海兽', '鹰羽', '毛皮'], treasury: 20000, population: 120000,
    stateDescription: '北海诸部并非金朝直辖州府，分别活动于黑水以东、库页岛、北海以北与虾夷地。', history: '北海诸部长期以部落形态见于中原、女真与日本记载。',
    traits: ['渔猎部族', '海路贸易', '分散聚落'], posture: '部落自守', naturalAllies: [], warState: '和平'
  },
  {
    id: 'fac_luodian', baseId: 'fac_dali', name: '罗殿国', type: '西南部族政权', leader: '罗殿国主', capital: '贵州西部',
    strength: 8, cultureLevel: 4, ideology: '乌蛮诸部联合自守。', longTermStrategy: '在大理与宋境之间保持自主。',
    primaryTarget: '维持贵州西部部族联盟', primaryThreat: '大理与宋朝羁縻扩张', mainResources: ['马匹', '山地物产'],
    treasury: 12000, population: 180000, stateDescription: '罗殿国为贵州西部独立部族政权，并非大理直辖府州。', history: '罗殿诸部在宋代长期保持独立或半独立地位。',
    traits: ['乌蛮政权', '山地部族', '自主外交'], posture: '守境', naturalAllies: [], warState: '和平'
  },
  {
    id: 'fac_ziqi', baseId: 'fac_dali', name: '自杞国', type: '西南部族政权', leader: '自杞国主', capital: '滇黔东南',
    strength: 9, cultureLevel: 4, ideology: '以山地诸部为基础的地方政权。', longTermStrategy: '控制滇黔东南商道并维持独立。',
    primaryTarget: '维持滇黔东南自主', primaryThreat: '大理与交趾边境竞争', mainResources: ['战马', '山地商道', '矿产'],
    treasury: 14000, population: 200000, stateDescription: '自杞国在十二世纪已形成独立政权，不应列作大理普通部落。', history: '自杞国兴起于十二世纪初，控制滇黔东南部分地区。',
    traits: ['山地政权', '商道控制', '自主外交'], posture: '守境', naturalAllies: [], warState: '和平'
  }
];

const WESTERN_EXTERNAL_FORCES = [
  {
    name: '东喀喇汗国', desc: '以八剌沙衮、疏勒为中心的突厥伊斯兰汗国', threatLevel: 6,
    ruler: '艾哈迈德汗', capital: '八剌沙衮、疏勒',
    relationToSong: '去宋绝远，主要通过丝路商旅间接往来。', relationToJin: '与金无直接边界。',
    stance: '建炎元年八月仍独立统治七河与西部塔里木，八剌沙衮尚未落入耶律大石之手。',
    interests: ['维持八剌沙衮与疏勒双中心', '控制于阗玉石与丝路贸易', '防备契丹残部西进'],
    militaryNote: '以突厥骑兵与绿洲守军为主。', keyFigures: ['艾哈迈德汗'], resources: ['丝路商税', '于阗玉石', '突厥骑兵'],
    intervention: '若耶律大石继续西进，八剌沙衮将成为首要目标。', cultureNote: '突厥伊斯兰汗国，宫廷兼具突厥与波斯文化。',
    history: [{ year: 1006, event: '喀喇汗兼并于阗。' }, { year: 1127, event: '艾哈迈德汗仍统治东汗国。' }, { year: 1134, event: '其后八剌沙衮才被耶律大石夺取。' }]
  },
  {
    name: '西喀喇汗国', desc: '以撒马尔罕为中心、臣属于塞尔柱的河中汗国', threatLevel: 4,
    ruler: '穆罕默德·阿尔斯兰汗', capital: '撒马尔罕',
    relationToSong: '去宋极远，无直接邦交。', relationToJin: '与金无直接边界。',
    stance: '建炎元年八月仍受塞尔柱宗主权约束，控制河中与石国方向。',
    interests: ['维持河中城邦', '控制石国商路', '依靠塞尔柱抵御东部压力'], militaryNote: '城邦步骑与突厥骑兵并用。',
    keyFigures: ['穆罕默德·阿尔斯兰汗'], resources: ['河中商税', '粟特城市', '突厥骑兵'], intervention: '主要受河中与塞尔柱局势牵动。',
    cultureNote: '突厥王族统治下的波斯化伊斯兰城邦政权。', history: [{ year: 1089, event: '西喀喇汗国成为塞尔柱属国。' }, { year: 1127, event: '穆罕默德·阿尔斯兰汗在位。' }]
  },
  {
    name: '高昌回鹘', desc: '以高昌、西州、北庭为中心的佛教回鹘亦都护国', threatLevel: 4,
    ruler: '毕勒哥亦都护', capital: '高昌、西州与北庭',
    relationToSong: '丝路商旅与佛教文化往来尚存。', relationToJin: '与金无直接边界。',
    stance: '建炎元年八月仍为独立亦都护国，尚未臣服耶律大石。', interests: ['守高昌与北庭绿洲', '维持丝路商税', '在夏、黑汗与契丹之间自保'],
    militaryNote: '兵力有限，依靠绿洲城墙与商路。', keyFigures: ['毕勒哥亦都护'], resources: ['绿洲屯田', '葡萄与棉布', '佛寺网络'],
    intervention: '次年可能在耶律大石压力下称臣。', cultureNote: '奉佛、行回鹘文，保留强烈汉地佛教与丝路文化。',
    history: [{ year: 1096, event: '高昌回鹘失去温宿、姑墨与龟兹。' }, { year: 1127, event: '亦都护国仍保持独立。' }, { year: 1128, event: '其后始成为耶律大石属国。' }]
  }
];

const TIBETAN_EXTERNAL_FORCES = [
  {
    name: '古格王国', desc: '以阿里西部为核心的吐蕃王系国家', threatLevel: 2,
    ruler: '古格王', capital: '扎布让', relationToSong: '与宋相隔遥远，无直接军政冲突。',
    relationToJin: '与金无直接边界与往来。', stance: '建炎元年八月，古格王国据阿里西部自守，与普兰、拉达克等王系并立。',
    interests: ['维持古格王权', '保护托林寺等佛教中心', '维持喜马拉雅商路'], militaryNote: '以高原地方武装与王室部众为主。',
    keyFigures: ['古格王'], resources: ['阿里牧地', '佛教寺院', '西部商路'], intervention: '主要事务限于阿里诸王系与跨喜马拉雅商路。',
    cultureNote: '佛教后弘上路中心之一。', history: [{ year: 950, event: '十世纪末古格王国建立。' }, { year: 1042, event: '阿底峡受请至阿里弘法。' }]
  },
  {
    name: '卫藏诸部', desc: '吐蕃分裂时期的卫、藏、逻些与雅隆诸王系寺院', threatLevel: 3,
    ruler: '卫藏诸王系与寺院首领', capital: '无统一都城', relationToSong: '与宋直接往来有限，不控制宋属西宁及川陕边州。',
    relationToJin: '去金绝远，无直接边界。', stance: '建炎元年八月，卫藏尚在分裂时期，诸王系、贵族与寺院彼此不统属。',
    interests: ['维持卫藏诸部自治', '保全寺院与庄园', '避免王系内战'], militaryNote: '诸贵族与地方部众分散，无统一军队。',
    keyFigures: ['卫藏诸王系', '诸寺院首领'], resources: ['河谷农地', '牧场', '寺院庄园'], intervention: '难以作为统一政权对外干预。',
    cultureNote: '佛教后弘时期，寺院与地方王系并立。', history: [{ year: 842, event: '吐蕃王统崩溃。' }, { year: 1127, event: '卫藏诸地仍无统一共主。' }]
  },
  {
    name: '多康诸部', desc: '昌都、玉树与川西高原一带的东部吐蕃部落群', threatLevel: 4,
    ruler: '多康各部首领', capital: '无固定都城', relationToSong: '邻接宋属熙河兰廓与川峡边缘，以商旅、茶马与羁縻关系往来。',
    relationToJin: '与金无直接接触。', stance: '建炎元年八月，多康各部分散自守，不受卫藏、古格或青唐统一节制。',
    interests: ['保有高原牧场', '维持川藏滇藏商路', '抵制外部羁縻深入'], militaryNote: '以分散部落骑兵和山地武装为主。',
    keyFigures: ['多康各部首领'], resources: ['高原牧场', '部落骑兵', '川藏滇藏商路'], intervention: '主要围绕邻近商路、牧场和羁縻边界行动。',
    cultureNote: '东部吐蕃诸部与寺院并立。', history: [{ year: 842, event: '吐蕃崩溃后多康诸部渐趋分立。' }, { year: 1127, event: '多康尚无统一政权。' }]
  }
];

const PAGAN_EXTERNAL_FORCES = [
  {
    name: '蒲甘王朝', desc: '以蒲甘和伊洛瓦底江流域为核心的缅甸王国', threatLevel: 3,
    ruler: '阿朗悉都', capital: '蒲甘',
    relationToSong: '去宋西南边境较远，主要通过滇缅商路和间接贸易相闻。',
    relationToJin: '与金无直接边界。',
    stance: '建炎元年八月，蒲甘王朝控制缅甸主体；滇缅之间的山地不应涂作大理直辖，缅甸腹地应归蒲甘。',
    interests: ['维持伊洛瓦底江谷地', '控制上缅甸与下缅商道', '约束掸地和若开边缘'],
    militaryNote: '以伊洛瓦底江谷地王室军、地方步骑与佛寺庄园资源为基础。',
    keyFigures: ['阿朗悉都'],
    resources: ['稻米', '佛寺庄园', '伊洛瓦底江航路', '缅孟商路'],
    intervention: '主要处理缅甸腹地、掸地和下缅孟地离心，不直接介入宋金战局。',
    cultureNote: '上座部佛教王朝，承阿奴律陀以来统一缅甸主体的传统。',
    history: [{ year: 1044, event: '蒲甘王朝兴起。' }, { year: 1111, event: '阿朗悉都即位。' }, { year: 1127, event: '蒲甘王朝为缅甸主体政权。' }]
  }
];

const SOUTH_SEA_EXTERNAL_FORCES = [
  {
    name: '流求诸部', desc: '台湾本岛彼此分立的山海诸部', threatLevel: 0,
    ruler: '岛上各部首领', capital: '无统一都城', relationToSong: '与闽粤沿海有零散海路交换，不属宋朝。', relationToJin: '与金无往来。',
    stance: '建炎元年八月，台湾本岛无统一流求王国，各部自主。', interests: ['维持岛上诸部自主', '进行沿海交换'],
    militaryNote: '无统一军队。', keyFigures: ['各部首领'], resources: ['鹿皮', '渔猎物产'], intervention: '不介入宋金战局。',
    cultureNote: '本图以流求作时代性泛称，不等同于统一国家。', history: [{ year: 1127, event: '台湾本岛仍由各部聚落分立。' }]
  },
  {
    name: '吕宋诸邦', desc: '吕宋岛彼此不统属的河口港邦与聚落', threatLevel: 0,
    ruler: '各邦首领', capital: '无统一都城', relationToSong: '通过南海商路间接互市。', relationToJin: '与金无往来。',
    stance: '建炎元年八月，吕宋岛诸邦分立，不存在统一吕宋国。', interests: ['维持港口互市', '守各自聚落'],
    militaryNote: '各邦自有地方武装，无统一军队。', keyFigures: ['各邦首领'], resources: ['稻米', '蜂蜡', '黄金'], intervention: '不介入宋金战局。',
    cultureNote: '吕宋仅作清晰地理标识。', history: [{ year: 1127, event: '吕宋岛诸邦与聚落各自为政。' }]
  },
  {
    name: '麻逸', desc: '本图按民都洛说定位的宋代菲律宾海贸邦国', threatLevel: 0,
    ruler: '麻逸国主', capital: '民都洛岛港聚落', relationToSong: '北宋已有麻逸商人赴华贸易记录。', relationToJin: '与金无往来。',
    stance: '建炎元年八月，以海贸与港聚落维持独立。', interests: ['维持民都洛航路', '同宋商互市'],
    militaryNote: '以港邦舟船和地方武装为主。', keyFigures: ['麻逸国主'], resources: ['蜂蜡', '棉布', '海产'], intervention: '不介入宋金战局。',
    cultureNote: '麻逸位置有民都洛与内湖湾两说，本图依几何采用民都洛说。', history: [{ year: 971, event: '宋代文献开始出现麻逸相关记录。' }, { year: 1127, event: '麻逸仍按独立海贸邦国处理。' }]
  },
  {
    name: '米沙鄢诸邦', desc: '中部菲律宾群岛的分立岛邦与港聚落', threatLevel: 0,
    ruler: '各岛邦首领', capital: '无统一都城', relationToSong: '通过麻逸、蒲端等海贸网络间接往来。', relationToJin: '与金无往来。',
    stance: '建炎元年八月，群岛诸邦分立。', interests: ['维持群岛航路', '守各岛聚落'],
    militaryNote: '各岛邦自有舟船武装。', keyFigures: ['各岛邦首领'], resources: ['海产', '蜂蜡', '木材'], intervention: '不介入宋金战局。',
    cultureNote: '不提前套用元代三屿或明代苏禄名号。', history: [{ year: 1127, event: '米沙鄢群岛诸邦彼此不统属。' }]
  },
  {
    name: '蒲端国', desc: '棉兰老岛东北部的黄金与海贸政权', threatLevel: 0,
    ruler: '蒲端国主', capital: '蒲端', relationToSong: '北宋真宗朝曾多次遣使入贡。', relationToJin: '与金无往来。',
    stance: '建炎元年八月，蒲端仍按独立海贸国处理。', interests: ['维持阿古桑河口', '经营黄金与对宋贸易'],
    militaryNote: '以河口港邦舟船和地方武装为主。', keyFigures: ['蒲端国主'], resources: ['黄金', '舟船', '蜂蜡'], intervention: '不介入宋金战局。',
    cultureNote: '位于棉兰老岛东北部。', history: [{ year: 1004, event: '蒲端国遣使入宋。' }, { year: 1007, event: '蒲端国再次入贡。' }, { year: 1011, event: '蒲端国主以金版表文入贡。' }]
  }
];

const STEPPE_EXTERNAL_FORCES = [
  {
    name: '乃蛮部', desc: '蒙古高原西部的部落联盟', threatLevel: 3,
    ruler: '乃蛮诸部首领', capital: '无固定都城', relationToSong: '相隔辽远，无直接关系。', relationToJin: '与金无稳定臣属关系。',
    stance: '建炎元年八月，据阿尔泰东麓和西部草原自守。', interests: ['维持西部牧地', '控制阿尔泰商路'], militaryNote: '以游牧骑兵为主。',
    keyFigures: ['乃蛮诸部首领'], resources: ['战马', '牛羊', '皮毛'], intervention: '主要与克烈争夺中西部牧地。', cultureNote: '西部草原突厥—蒙古语部落联盟。',
    history: [{ year: 1127, event: '乃蛮已是西部蒙古高原的重要部落集团。' }]
  },
  {
    name: '克烈部', desc: '土兀剌河与中部蒙古高原的部落联盟', threatLevel: 4,
    ruler: '克烈诸部首领', capital: '土兀剌河流域', relationToSong: '相隔辽远。', relationToJin: '与金无稳定臣属关系。',
    stance: '建炎元年八月，控制中部牧道，但尚未形成王罕时代汗国。', interests: ['控制土兀剌河', '同乃蛮、蒙兀争牧'], militaryNote: '部落骑兵与中部牧道动员。',
    keyFigures: ['克烈诸部首领'], resources: ['战马', '牧群', '商路'], intervention: '围绕中部草原牧地行动。', cultureNote: '十二世纪中部蒙古高原强部。',
    history: [{ year: 1127, event: '克烈诸部已据中部草原自立。' }]
  },
  {
    name: '蔑儿乞部', desc: '色楞格河与鄂尔浑下游的部落联盟', threatLevel: 2,
    ruler: '蔑儿乞诸部首领', capital: '无固定都城', relationToSong: '相隔辽远。', relationToJin: '与金无直接边界。',
    stance: '建炎元年八月，据色楞格河谷牧地自守。', interests: ['守色楞格河谷', '抵御克烈与蒙兀挤压'], militaryNote: '河谷牧民骑兵。',
    keyFigures: ['蔑儿乞诸部首领'], resources: ['河谷牧场', '战马', '皮毛'], intervention: '局限于北部草原争牧。', cultureNote: '色楞格—鄂尔浑下游部族集团。',
    history: [{ year: 1127, event: '蔑儿乞诸部活动于色楞格河流域。' }]
  },
  {
    name: '蒙兀诸部', desc: '鄂嫩—克鲁伦—肯特山的蒙兀核心部族', threatLevel: 5,
    ruler: '合不勒等蒙兀首领', capital: '无固定都城', relationToSong: '无直接往来。', relationToJin: '辽亡后逐渐同金发生冲突。',
    stance: '建炎元年八月，合不勒等首领正联合三河源诸部。', interests: ['整合乞颜、泰赤乌等部', '抵御金朝北进', '同塔塔儿争牧'], militaryNote: '三河源部落骑兵。',
    keyFigures: ['合不勒'], resources: ['战马', '猎场', '三河源牧地'], intervention: '未来将成为金北境的重要威胁。', cultureNote: '合木黑蒙古形成前后的蒙兀诸部。',
    history: [{ year: 1125, event: '辽亡后蒙兀诸部活动空间扩大。' }, { year: 1127, event: '合不勒等首领开始崛起。' }]
  },
  {
    name: '塔塔儿联盟', desc: '捕鱼儿湖与东部蒙古高原的部落联盟', threatLevel: 5,
    ruler: '塔塔儿诸部首领', capital: '捕鱼儿湖周边', relationToSong: '无直接往来。', relationToJin: '时受金招抚，亦可能反叛。',
    stance: '建炎元年八月，据东部草原，与蒙兀诸部竞争。', interests: ['控制捕鱼儿湖牧地', '利用对金互市', '压制蒙兀诸部'], militaryNote: '东部草原骑兵。',
    keyFigures: ['塔塔儿诸部首领'], resources: ['战马', '牛羊', '对金互市'], intervention: '主要牵动金朝东北边防。', cultureNote: '东部蒙古高原塔塔儿诸部联盟。',
    history: [{ year: 1127, event: '塔塔儿诸部在东部草原保持独立联盟。' }]
  },
  {
    name: '弘吉剌部', desc: '蒙兀与塔塔儿之间的东南草原部族集团', threatLevel: 2,
    ruler: '弘吉剌诸部首领', capital: '无固定都城', relationToSong: '无直接往来。', relationToJin: '与金北界有间接接触。',
    stance: '建炎元年八月，在东南草原以部落和婚盟网络自立。', interests: ['守东南牧地', '维持部族婚盟'], militaryNote: '地方骑兵。',
    keyFigures: ['弘吉剌诸部首领'], resources: ['战马', '牧群'], intervention: '在蒙兀、塔塔儿之间结盟自保。', cultureNote: '东南蒙古高原部族集团。',
    history: [{ year: 1127, event: '弘吉剌诸部与周边强部彼此不统属。' }]
  },
  {
    name: '阴山诸部', desc: '金北界阴山—云内蕃部，后来汪古集团的前身', threatLevel: 2,
    ruler: '阴山诸部首领', capital: '阴山—云内一带', relationToSong: '与宋西北边缘隔西夏、金境。', relationToJin: '受金羁縻并承担北界守边。',
    stance: '建炎元年八月，依附金朝边防体系而保有部族自治。', interests: ['守阴山牧地', '维持边市', '保留首领权力'], militaryNote: '守边部族骑兵。',
    keyFigures: ['阴山诸部首领'], resources: ['战马', '边市', '阴山牧地'], intervention: '主要服务金朝北界防务。', cultureNote: '汪古成熟部名稍晚，本图按其前身诸部表达。',
    history: [{ year: 1127, event: '阴山—云内诸部处于金朝北境羁縻体系。' }]
  }
];

const XINAN_EXTERNAL_FORCES = [
  {
    name: '建昌诸部', desc: '川滇边建昌川谷的乌蛮诸部', threatLevel: 2,
    ruler: '建昌诸部首领', capital: '无统一都城', relationToSong: '受宋川峡边地羁縻与盐马贸易影响。', relationToJin: '无直接关系。',
    stance: '建炎元年八月，在宋与大理之间维持山地自治。', interests: ['守建昌川谷', '维持盐马道'], militaryNote: '山地寨兵与骑兵。',
    keyFigures: ['建昌诸部首领'], resources: ['战马', '盐马道'], intervention: '主要活动于川滇边。', cultureNote: '建昌乌蛮部族集团。',
    history: [{ year: 1127, event: '建昌诸部夹处宋川峡与大理北境。' }]
  },
  {
    name: '滇西北诸部', desc: '磨些与西洱河山地诸部', threatLevel: 2,
    ruler: '磨些与西洱河诸部首领', capital: '无统一都城', relationToSong: '经川西商路间接往来。', relationToJin: '无直接关系。',
    stance: '建炎元年八月，据滇西北横断山河谷自守。', interests: ['守横断山河谷', '维持马帮商路'], militaryNote: '山地部族武装。',
    keyFigures: ['磨些诸部首领'], resources: ['马匹', '河谷农牧'], intervention: '主要维持地方自主。', cultureNote: '磨些与西洱河诸部。',
    history: [{ year: 1127, event: '滇西北诸部保持地方首领统治。' }]
  },
  {
    name: '乌蒙乌撒诸部', desc: '滇东北至黔西南的乌蛮诸部', threatLevel: 3,
    ruler: '乌蒙、乌撒、罗婺诸部首领', capital: '无统一都城', relationToSong: '与宋叙州、泸州边地有羁縻与马匹贸易。', relationToJin: '无直接关系。',
    stance: '建炎元年八月，乌蒙、乌撒、罗婺各部自立。', interests: ['守滇东北山地', '控制马匹盐道'], militaryNote: '部族寨兵与山地骑兵。',
    keyFigures: ['各部首领'], resources: ['战马', '铜矿', '盐道'], intervention: '在宋、大理、罗殿之间自保。', cultureNote: '不套用元代乌撒乌蒙宣慰司。',
    history: [{ year: 1127, event: '乌蒙、乌撒、罗婺诸部彼此同源而不统一。' }]
  },
  {
    name: '金齿诸部', desc: '滇西至伊洛瓦底上游的山地诸部', threatLevel: 3,
    ruler: '金齿及滇缅山地诸部首领', capital: '无统一都城', relationToSong: '经大理与南海商路间接往来。', relationToJin: '无直接关系。',
    stance: '建炎元年八月，在大理与蒲甘之间维持山地自主。', interests: ['守滇西缅北山道', '控制金银与象马贸易'], militaryNote: '山地寨兵。',
    keyFigures: ['金齿诸部首领'], resources: ['金银', '象马商路', '山林物产'], intervention: '主要应对大理与蒲甘边缘扩张。', cultureNote: '金齿、漆齿及伊洛瓦底上游诸部。',
    history: [{ year: 1127, event: '滇西缅北山地仍由多个部族集团分据。' }]
  },
  {
    name: '滇中南诸部', desc: '强宗、休制、步雄、嶍峨、特磨等部', threatLevel: 3,
    ruler: '滇中南各部首领', capital: '无统一都城', relationToSong: '通过大理与广南市舶商路间接往来。', relationToJin: '无直接关系。',
    stance: '建炎元年八月，与大理关系密切但仍按地方诸部表达。', interests: ['维持部族自治', '控制红河与滇南商路'], militaryNote: '部族弓弩兵与寨兵。',
    keyFigures: ['滇中南各部首领'], resources: ['铜锡', '稻米', '红河商路'], intervention: '在大理、自杞、罗殿与大越之间自保。', cultureNote: '保留大理时代部名，不套用元明府路。',
    history: [{ year: 1127, event: '步雄、嶍峨、特磨等部维持地方首领统治。' }]
  }
];

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function syncScenarioFactions(scenario) {
  const current = Array.isArray(scenario.factions) ? scenario.factions : [];
  const byId = new Map(current.map((faction) => [faction.id, faction]));
  const replacementIds = new Set(['fac_xiyu', ...SCENARIO_FACTION_CONFIGS.map((config) => config.id)]);
  const oldWesternIndex = Math.max(0, current.findIndex((faction) => replacementIds.has(faction.id)));
  const generated = SCENARIO_FACTION_CONFIGS.map((config) => {
    const base = byId.get(config.id) || byId.get(config.baseId) || {};
    const faction = {
      ...clone(base),
      ...config,
      side: config.side || '外蕃',
      victoryConditions: [`维持${config.primaryTarget}`, '政权核心不失'],
      defeatConditions: [`${config.primaryThreat}导致政权瓦解`, '都城与主要商路失守'],
      economicPolicy: '维护本地生产与商路税收',
      attitudeDetail: {
        self: [config.stateDescription],
        allies: config.naturalAllies.length ? config.naturalAllies : ['无固定盟友'],
        enemies: [config.primaryThreat]
      },
      _fromExternalForce: true,
      sid: 'fac_song'
    };
    delete faction.baseId;
    return faction;
  });
  const replacedIds = new Set(['fac_xiyu', ...generated.map((faction) => faction.id)]);
  const next = current.filter((faction) => !replacedIds.has(faction.id));
  next.splice(Math.min(oldWesternIndex, next.length), 0, ...generated);
  scenario.factions = next;
}

function splitWesternExternalForces(scenario) {
  if (!Array.isArray(scenario.externalForces)) return;
  const westernNames = new Set(['东喀喇汗国', '西喀喇汗国', '高昌回鹘']);
  const isReplaced = (force) => String(force?.name || '').startsWith('西域(') || westernNames.has(force?.name);
  const index = scenario.externalForces.findIndex(isReplaced);
  const filtered = scenario.externalForces.filter((force) => !isReplaced(force));
  filtered.splice(index < 0 ? filtered.length : index, 0, ...clone(WESTERN_EXTERNAL_FORCES));
  scenario.externalForces = filtered;
}

function splitTibetanExternalForces(scenario) {
  if (!Array.isArray(scenario.externalForces)) return;
  const tibetanNames = new Set(['吐蕃诸部', '古格王国', '卫藏诸部', '多康诸部']);
  const index = scenario.externalForces.findIndex((force) => tibetanNames.has(force?.name));
  const filtered = scenario.externalForces.filter((force) => !tibetanNames.has(force?.name));
  filtered.splice(index < 0 ? filtered.length : index, 0, ...clone(TIBETAN_EXTERNAL_FORCES));
  scenario.externalForces = filtered;
}

function syncPaganExternalForce(scenario) {
  if (!Array.isArray(scenario.externalForces)) return;
  const names = new Set(['蒲甘王朝']);
  const index = scenario.externalForces.findIndex((force) => names.has(force?.name));
  const filtered = scenario.externalForces.filter((force) => !names.has(force?.name));
  filtered.splice(index < 0 ? filtered.length : index, 0, ...clone(PAGAN_EXTERNAL_FORCES));
  scenario.externalForces = filtered;
}

function syncXinanExternalForce(scenario) {
  if (!Array.isArray(scenario.externalForces)) return;
  const names = new Set(['西南诸部', '建昌诸部', '滇西北诸部', '乌蒙乌撒诸部', '金齿诸部', '滇中南诸部']);
  const index = scenario.externalForces.findIndex((force) => names.has(force?.name));
  const filtered = scenario.externalForces.filter((force) => !names.has(force?.name));
  filtered.splice(index < 0 ? filtered.length : index, 0, ...clone(XINAN_EXTERNAL_FORCES));
  scenario.externalForces = filtered;
}

function splitSouthSeaExternalForces(scenario) {
  if (!Array.isArray(scenario.externalForces)) return;
  const names = new Set(['流求诸部', '吕宋诸邦', '麻逸', '米沙鄢诸邦', '蒲端国']);
  const isReplaced = (force) => String(force?.name || '').startsWith('南海诸番') || names.has(force?.name);
  const index = scenario.externalForces.findIndex(isReplaced);
  const filtered = scenario.externalForces.filter((force) => !isReplaced(force));
  filtered.splice(index < 0 ? filtered.length : index, 0, ...clone(SOUTH_SEA_EXTERNAL_FORCES));
  scenario.externalForces = filtered;
}

function splitSteppeExternalForces(scenario) {
  if (!Array.isArray(scenario.externalForces)) return;
  const names = new Set(['乃蛮部', '克烈部', '蔑儿乞部', '蒙兀诸部', '塔塔儿联盟', '弘吉剌部', '阴山诸部']);
  const isReplaced = (force) => String(force?.name || '').startsWith('漠北诸部') || names.has(force?.name);
  const index = scenario.externalForces.findIndex(isReplaced);
  const filtered = scenario.externalForces.filter((force) => !isReplaced(force));
  filtered.splice(index < 0 ? filtered.length : index, 0, ...clone(STEPPE_EXTERNAL_FORCES));
  scenario.externalForces = filtered;
}

function fiscalTotalOf(region) {
  return Number(region?.fiscalDetail?.['岁入总']) || 0;
}

function summarizeOwnerRegions(scenario, ownerKey) {
  const regions = (scenario.map?.regions || []).filter((region) => region.ownerKey === ownerKey);
  const totalPopulation = regions.reduce((sum, region) => sum + (Number(region.population) || 0), 0);
  const totalFiscal = regions.reduce((sum, region) => sum + fiscalTotalOf(region), 0);
  const publicTreasuryInit = regions.reduce((sum, region) => {
    const treasury = region.publicTreasuryInit || {};
    sum['库存折贯'] += Number(treasury['库存折贯']) || 0;
    sum['常平仓石'] += Number(treasury['常平仓石']) || 0;
    sum['军资库'] += Number(treasury['军资库']) || 0;
    return sum;
  }, { '库存折贯': 0, '常平仓石': 0, '军资库': 0 });
  const ethnicityWeights = {};
  for (const region of regions) {
    for (const [name, share] of Object.entries(region.byEthnicity || {})) {
      ethnicityWeights[name] = (ethnicityWeights[name] || 0) + (Number(region.population) || 0) * Number(share || 0);
    }
  }
  const ethnicities = {};
  for (const [name, weighted] of Object.entries(ethnicityWeights).sort((a, b) => b[1] - a[1])) {
    ethnicities[name] = totalPopulation ? Number(((weighted / totalPopulation) * 100).toFixed(1)) : 0;
  }
  return {
    regionCount: regions.length,
    totalPopulation,
    totalFiscal,
    publicTreasuryInit,
    keyRegions: regions
      .map((region) => ({
        id: region.id,
        name: region.name,
        population: region.population || 0,
        fiscal: fiscalTotalOf(region),
        resources: region.specialResources || ''
      }))
      .sort((a, b) => b.population - a.population),
    ethnicities
  };
}

function syncXixiaMetadata(scenario) {
  const summary = summarizeOwnerRegions(scenario, 'fac-xixia');
  const faction = Array.isArray(scenario.factions)
    ? scenario.factions.find((item) => item.id === 'fac_xixia')
    : null;
  if (faction) {
    Object.assign(faction, {
      capital: '中兴府',
      currentMorale: 66,
      fiscalCondition: '河西商税、盐池课利与牧马可支撑边军；横山新占地需屯戍安抚，短期财政收益有限。',
      longTermStrategy: '奉金为宗主以保国而不做金军前驱；守中兴府、灵州盐池与河西走廊根本；巩固怀德军、夏宥、建宁寨等横山新占据点，择机接收金所许陕北地，但不提前吞并麟州本州。',
      primaryTarget: '稳住灵夏核心、河西走廊和横山新占地，令宋西军无法集中全力抗金。',
      primaryThreat: '金朝既是宗主又夺天德、云内，宋西军若被赵构重新整合也会反攻横山。',
      stateDescription: '建炎元年八月，夏崇宗李乾顺在位，国都中兴府。西夏已由辽附金，名义臣属于金而保留完整国政；一一二六年乘宋金战争夺取怀德军、建宁寨等宋边地，天德军、云内州又被金军夺走；一一二七年三月金许以黄河为界割陕北地补偿，至八月仍处边界交割和实际占护阶段。夏国此时不是单纯中立旁观，而是谨慎扩边、两面防备。',
      history: '李元昊一〇三八年称帝建大夏；李乾顺一〇九九年亲政，崇汉法、兴学校、改兴庆府为中兴府；一一二四年西夏转附金；一一二六至一一二七年趁宋金鏖战扩入横山边寨，同时与金争夺阴山南麓和陕北割地。',
      timeline: [
        { year: 1038, event: '李元昊称帝建大夏，宋夏长期战和由此展开。' },
        { year: 1099, event: '李乾顺亲政，削外戚梁氏，改兴庆府为中兴府，推汉学文治。' },
        { year: 1119, event: '察哥等夏将与宋西军反复攻战，夏军熟悉横山堡寨与关陕边防。' },
        { year: 1124, event: '西夏奉表降金，改以金为宗主以保国。' },
        { year: 1126, event: '西夏夺西安州、怀德军、建宁寨等边地，试图补回宋夏战争旧失。' },
        { year: 1127, month: 3, event: '金许以黄河为界割陕西北部地补偿西夏，实际交割未稳。' },
        { year: 1127, month: 8, event: '绍宋开局：夏国守灵夏河西，观宋金成败，继续压迫横山边线。' }
      ],
      attitudeDetail: {
        self: ['党项宗室与汉法官僚共治，灵夏为腹心、河西为财路、横山为前沿。', '新占横山诸寨尚未归附，须以兵威、榷场、册授并用。'],
        allies: ['名义臣属于金，可借金势压宋，但对天德军、云内州被夺和陕北交割拖延深怀不满。', '河西回鹘、吐蕃、羌部可用互市羁縻。'],
        enemies: ['宋西军仍守秦凤、泾原、熙河诸路，是横山新占地的直接威胁。', '金朝既是宗主也是北境最强压迫者，不可全信。'],
        neutrals: ['多康与青唐诸部可用茶马、市盐往来牵制宋夏边境。', '漠北诸部离灵夏较远，可作为马源和北境情报来源。']
      },
      traits: ['河西走廊', '党项骑军', '称藩于金', '横山扩张', '蕃汉二元', '佛教译经', '盐池财政'],
      leadership: {
        ruler: '李乾顺（夏崇宗）',
        regent: '',
        general: '察哥（晋王、枢密使）',
        chancellor: '李仁礼等宗室文臣与汉官参政',
        spy: '边地蕃汉通事、榷场商旅与诸监军司斥候'
      },
      partyRelations: {
        '党项宗室与嵬名诸部': { strength: 88, mood: '拥戴崇宗与晋王，但重本部战获和监军司实权', leader: '李乾顺、察哥、嵬名诸统军' },
        '汉法文臣与学校僧院': { strength: 64, mood: '支持崇宗文治，主张以汉法理财治州', leader: '李仁礼、斡道冲、野利御史等' },
        '横山边军与新附州寨': { strength: 70, mood: '求战获、求屯戍粮饷，对宋西军仍有戒惧', leader: '察哥、萧合达、嵬名思忠' },
        '宋降人与外来军官': { strength: 38, mood: '可用而须防坐大，任得敬类人物已有伏线', leader: '任得敬、萧合达' },
        '河西回鹘吐蕃商旅': { strength: 46, mood: '逐互市与关税之利，服从强者而求路通', leader: '沙瓜甘肃诸监军司通事' }
      },
      territorySummary: {
        mapRegionCount: summary.regionCount,
        population: summary.totalPopulation,
        fiscalAnnual: summary.totalFiscal,
        publicTreasuryInit: summary.publicTreasuryInit,
        ethnicities: summary.ethnicities,
        coreRegions: ['中兴府', '灵州·盐州', '西凉府', '甘州甘肃监军司'],
        frontierRegions: ['夏州·宥州', '怀德军', '建宁寨', '沙州监军司', '瓜州西平监军司', '肃州监军司'],
        note: '统计由当前 map.regions 中 ownerKey=fac-xixia 的 13 个地块汇总，随地图重判同步更新。'
      },
      economyProfile: {
        basis: ['灵夏盐池', '河西丝路商税', '绿洲屯田', '党项与蕃部牧马', '宋夏旧榷场体系'],
        strengths: ['盐马与商税可支撑精锐骑军', '河西诸州兼有农业绿洲与过境贸易', '中兴府吸纳汉法文治，行政汲取力强于普通草原部族'],
        weaknesses: ['山川荒漠承载有限', '新占横山地块短期耗粮耗兵', '受金宋两强封锁时商路和岁赐易断'],
        fiscalRisk: '若金压贡、宋断互市、横山屯戍又久拖不决，国用会从宽裕转入紧张。'
      },
      militarySystem: {
        doctrine: '铁鹞子重骑冲坚、步跋子山卒逾险、蕃汉弓弩守寨，配合监军司就地屯戍与边境抄掠。',
        eliteUnits: ['铁鹞子重骑', '步跋子山地劲卒', '强弩蕃汉步军', '监军司部族骑兵'],
        command: ['中兴府枢密院定大略', '察哥总兵柄', '左右厢十二监军司守边', '嵬名诸部掌本部劲卒'],
        strengths: ['适应横山、河西、盐池地形', '骑兵机动优于宋西军', '党项宗室将领威望仍高'],
        weaknesses: ['攻坚久战不如宋州县体系', '宗室将权重，易牵动君权猜忌', '宋降人与契丹将领可用但忠诚复杂']
      },
      diplomacyMatrix: {
        song: { stance: '趁宋难而取边地，若宋能稳关陕则转为互市议和。', leverage: ['怀德军、建宁寨等新占地', '西军后方压力', '茶马与榷场'] },
        jin: { stance: '称藩但不愿被吞并或驱使；争取陕北补偿，防金再夺阴山南麓。', leverage: ['名义臣属', '牵制宋西军', '河西屏障'] },
        tibetan: { stance: '以茶马盐市羁縻多康、青唐、吐蕃诸部。', leverage: ['盐茶', '马源', '边境通事'] },
        steppe: { stance: '北境诸部可通马源与情报，但不纳入夏国核心控制。', leverage: ['互市', '婚盟', '牧场通道'] }
      },
      openingDilemmas: [
        { id: 'xixia-jin-border', title: '催金割地还是暂忍', choices: ['催金履行陕北割地', '暂忍天德云内之失，专压宋边', '暗通契丹旧部牵制金军'] },
        { id: 'xixia-hengshan-policy', title: '横山新附地如何治理', choices: ['增兵屯戍', '以榷场安抚蕃汉寨户', '纵兵抄掠以养军'] },
        { id: 'xixia-song-contact', title: '是否试探宋廷', choices: ['遣使通好求互市', '继续观望赵构能否稳住西军', '联金夹迫关陕'] },
        { id: 'xixia-faction-balance', title: '宗室武臣与汉法文臣平衡', choices: ['重察哥拓边', '重文臣理财收税', '防任得敬等降人坐大'] },
        { id: 'xixia-vassal-mask', title: '称臣金国的分寸', choices: ['奉表顺从换陕北实利', '拖延出兵避免作金前驱', '借金名义压宋而暗修边备'] },
        { id: 'xixia-border-intelligence', title: '横山与关陕情报', choices: ['重金收买蕃汉寨户', '遣商旅探宋西军虚实', '监视金军天德云内动向'] }
      ],
      aiBehaviorHints: [
        '西夏不是纯反派，也不是宋方天然盟友；每一步都以保夏国宗社、拓横山利益为准。',
        '李乾顺应表现为老练守成而善算计；察哥偏军略进取；任得敬是中长期权臣隐患。',
        '若宋西军内乱，西夏倾向压迫横山；若宋重整关陕，西夏倾向议和互市或借金牵制。',
        '不可把麟州本州提前写成西夏稳控；建宁寨、怀德军、夏宥等才是当前可控前沿。',
        'AI 语气应像边境老猎手：少喊灭国口号，多谈盐池、榷场、寨户、质子、割地文书和谁替谁流血。',
        '西夏会趁火取利，但不愿把铁鹞子消耗在金军指定的主战场；若金压迫过甚，应出现敷衍出兵、索地、暗联旧辽部族等反应。'
      ],
      aiPersonality: {
        voice: '克制、精算、边地现实主义；用臣金的外衣包住自保和扩边。',
        rulerBias: '李乾顺偏稳、偏文治、偏财政续航；不轻易孤注一掷。',
        hawkFaction: '察哥与横山边军主张趁宋乱夺寨夺堡。',
        hiddenRisk: '任得敬等降人和新附寨户坐大，会在中长期侵蚀宗室与监军司权威。'
      },
      aiDecisionWeights: {
        preserveCore: 100,
        exploitSongWeakness: 78,
        obeyJin: 44,
        demandJinCompensation: 82,
        avoidOverextension: 86,
        reopenTrade: 64,
        suppressNewBorder: 70
      },
      aiConditionalBehaviors: [
        { trigger: 'song_western_army_disorganized', response: '压迫横山、怀德军、建宁寨，优先夺寨而非深入关中。' },
        { trigger: 'song_controls_shaanxi_and_reopens_trade', response: '降低战意，试探互市、质子、边界承认。' },
        { trigger: 'jin_demands_full_auxiliary_campaign', response: '名义应从，实际以粮道、马疫、边报为由拖慢出兵，并索取陕北割地。' },
        { trigger: 'jin_withholds_promised_lands', response: '提高对金疑惧，暗联阴山、契丹旧部或加强天德云内方向斥候。' },
        { trigger: 'new_hengshan_regions_unrest', response: '先安抚寨户和榷场，再派监军司屯戍；避免一次性高压导致叛逃回宋。' }
      ],
      aiImmersionHooks: ['盐池岁入', '榷场开闭', '横山寨户归附', '铁鹞子惜用', '任得敬伏线', '对金索地文书'],
      aiStrategy: '机会主义守成扩边。默认不主动灭宋，也不真心替金打消耗战；优先守灵夏、河西和盐池财政，利用宋金主战场牵制关陕西军，在横山夺取可守寨堡。外交上称臣金国、索取陕北补偿，同时保留同宋互市和缓冲的后手。',
      posture: '守成兼扩边',
      warState: {
        active: [],
        pending: [
          { enemy: '宋西军', since: '1126', front: '横山、怀德军、建宁寨、夏宥方向' },
          { enemy: '金国边将', since: '1124', front: '天德军、云内州、阴山南麓与陕北割地交割' }
        ],
        recent: [
          { year: 1126, event: '夺怀德军、建宁寨等宋边据点。' },
          { year: 1127, month: 3, event: '金许割陕北补偿西夏，边界未定。' }
        ]
      },
      population: {
        actual: summary.totalPopulation,
        registered: Math.round(summary.totalPopulation * 0.85),
        hidden: Math.round(summary.totalPopulation * 0.15),
        ethnicities: summary.ethnicities,
        note: '由当前西夏地图地块人口按族群加权汇总；非旧剧本静态估值。'
      },
      treasury: {
        money: Math.round(summary.publicTreasuryInit['库存折贯']),
        grain: Math.round(summary.publicTreasuryInit['常平仓石']),
        cloth: Math.round(summary.totalFiscal * 0.18),
        note: '按西夏 13 地块财政府库折算为势力初始库储。'
      }
    });
  }

  const force = Array.isArray(scenario.externalForces)
    ? scenario.externalForces.find((item) => item.name === '西夏')
    : null;
  if (force) {
    Object.assign(force, {
      capital: '中兴府',
      stance: '建炎元年八月：西夏名义臣金，已夺怀德军、麟州建宁寨等宋边地；金又以黄河为界许割陕北补偿天德、云内之失，边界仍在交割，麟州本州仍不作西夏实控。',
      interests: ['守住中兴府、灵州与河西走廊', '巩固怀德军、建宁寨等横山新占据点', '迫使金履行陕北割地并防其继续侵夺'],
      keyFigures: ['李乾顺', '察哥', '任得敬', '萧合达', '李仁礼', '耶律南仙'],
      intervention: '以灵夏和河西为根本，在横山接收或攻取金所许陕北地；对宋则压迫西军后方，对金则称臣争利，避免被迫充当金军前驱。',
      territorySummary: {
        mapRegionCount: summary.regionCount,
        population: summary.totalPopulation,
        fiscalAnnual: summary.totalFiscal,
        keyRegions: summary.keyRegions.slice(0, 6)
      },
      policyHooks: ['横山新附地治理', '对金索地', '宋夏互市试探', '察哥军权与任得敬隐患', '称臣金国但避免充当前驱', '盐池榷场财政驱动'],
      history: [
        { year: 1099, event: '李乾顺亲政，兴庆府改称中兴府。' },
        { year: 1124, event: '西夏奉表降金，金许以阴山以南部分辽地。' },
        { year: 1126, event: '西夏夺西安州、怀德军与麟州建宁寨等地；天德军、云内州又被金军夺去。' },
        { year: 1127, event: '三月，金许以黄河为界割陕西北部地补偿西夏，边界进入交割期；八月尚不把麟州本州提前归夏。' }
      ]
    });
  }
}

function syncJinMetadata(scenario) {
  const summary = summarizeOwnerRegions(scenario, 'fac-jin');
  const faction = Array.isArray(scenario.factions)
    ? scenario.factions.find((item) => item.id === 'fac_jin')
    : null;
  if (faction) {
    const baseMoney = Math.round(summary.publicTreasuryInit['库存折贯']);
    const baseGrain = Math.round(summary.publicTreasuryInit['常平仓石']);
    const campaignMoney = Math.max(baseMoney, 2200000);
    const campaignGrain = Math.max(baseGrain, 1200000);
    Object.assign(faction, {
      capital: '会宁府（按出虎水·女真本部龙兴之地）',
      currentMorale: 98,
      strength: 99,
      aggression: 100,
      courtInfluence: 78,
      popularInfluence: 32,
      fiscalCondition: '汴京府藏与北狩掳获形成强大战役储备；燕云、河东、河北新占地可供转输，但人心未附、义军未平，长期治理成本极高。',
      stateDescription: '建炎元年八月，金朝处于灭辽破宋后的最强进攻窗口。女真本部、辽旧五京残余、燕云河东河北新占州府被同一套军政机器强行捏合；会宁府仍是龙兴根本，云中宗翰西路与燕云东路军府分掌南侵。金已稳握原辽腹地、燕云、太原、真定、河间与河东若干要地；河间府虽已入金军实控，但民心未附、粮道需护、义军仍可切扰，山东和东京开封仍不应提前写作稳定占领。此时金强在骑军、战役机动和掳获府藏，弱在新占汉地消化未深、东路宗望死后军权待重整。',
      longTermStrategy: '以最强女真骑军压迫南宋草创期：秋冬以河间为前进廊道和转运节点，优先再压山东、京畿与河南，若赵构南走则搜山检海追击；北方以汉地降官、傀儡政权和路府军镇代守，女真主力保持高机动攻势，不给宋廷重整河防、关陕和江淮防线的时间。',
      primaryTarget: 'fac_song',
      primaryThreat: '宋廷若召回李纲、倚重宗泽并整合河北义军、关陕西军与江淮水军，金军南侵成本会迅速上升。',
      internalParties: ['女真勃极烈宗室', '西路宗翰系', '东路宗望旧部与宗弼新锐', '汉契渤海官僚', '新占汉地降官与傀儡伏线', '北边属部'],
      traits: Array.from(new Set([
        ...(Array.isArray(faction.traits) ? faction.traits : []),
        'peak-invasion-window',
        'high-aggression-ai',
        'campaign-reserves',
        'two-route-command',
        'newly-conquered-hanlands',
        'unassimilated-empire'
      ])),
      mainResources: [
        '猛安谋克女真骑军',
        '辽东与阴山马源',
        '汴京府藏与靖康掳获',
        '燕云、河东、河北新占地赋税丁口',
        '契丹、渤海、燕云汉官的文书转输能力',
        '降军、签军与傀儡政权伏线'
      ],
      attitudeDetail: {
        self: ['灭辽破宋后武运正盛，视赵构南朝为未尽之余火。', '勃极烈共议与两路军府并行，军功诸王外重而汗权尚未完全收束。', '女真本部丁口少，必须以战役速度弥补占领深度不足。'],
        allies: ['韩企先、韩昉、萧庆等汉契官僚可治文书、赋役和降人。', '西夏、高丽为名义属国，可羁縻而不可全信。', '张邦昌伪楚已暴露傀儡代守的可用性与脆弱性，刘豫伪齐仍是后续伏线。'],
        enemies: ['赵构新朝尚存正朔，若立足江淮则宋祚难绝。', '宗泽汴梁、磁相忠义寨、河北义军与关陕西军会牵制金军南下。', '新占汉地民心未附，征调过猛会激发更多义军。'],
        neutrals: ['北边契丹、奚、室韦及阴山诸部叛服不常，需以互市、封号和军威并用。', '西域诸国与草原诸部远隔主战场，主要影响马源和北境情报。']
      },
      leadership: {
        ruler: '完颜吴乞买（金太宗）',
        regent: '',
        general: '完颜宗翰（粘罕·西路主帅）/ 完颜宗弼（兀术·东路新锐）/ 完颜娄室（西路骁将）/ 完颜挞懒（宗望旧部与后续和议伏线）',
        chancellor: '完颜希尹、韩企先、韩昉等女真与汉契辅政层',
        spy: '耶律余睹、萧庆、燕云通事与新附州县降官'
      },
      partyRelations: {
        '女真勃极烈宗室': { strength: 92, mood: '军功极盛但共治分权，既要灭宋又要平衡诸王', leader: '完颜吴乞买、完颜杲、完颜宗辅' },
        '西路宗翰系': { strength: 96, mood: '握灭辽破宋首功，主张继续南侵并经营云中河东', leader: '完颜宗翰、完颜娄室、完颜希尹、完颜银术可' },
        '东路宗望旧部与宗弼新锐': { strength: 84, mood: '宗望病死后军权重整，宗弼急需以追击赵构立威', leader: '完颜宗弼、完颜挞懒、完颜阇母' },
        '汉契渤海官僚': { strength: 68, mood: '能治州县转输，求以汉法安定新占地并保自身位次', leader: '韩企先、韩昉、萧庆、刘彦宗旧属' },
        '新占汉地降官与傀儡伏线': { strength: 54, mood: '畏金兵而求自保，可用作代守也最易反覆', leader: '张邦昌旧党、河北河东降官、刘豫伏线' },
        '北边属部与契丹奚诸部': { strength: 44, mood: '叛服随势，畏金威而未必真附', leader: '北边详稳、阴山诸部首领' }
      },
      territorySummary: {
        mapRegionCount: summary.regionCount,
        population: summary.totalPopulation,
        fiscalAnnual: summary.totalFiscal,
        publicTreasuryInit: summary.publicTreasuryInit,
        ethnicities: summary.ethnicities,
        coreRegions: ['会宁府', '胡里改万户', '合懒路', '辽阳府·复州'],
        liaoLegacyRegions: ['上京·临潢府', '中京·大定府', '西京路·大同府', '平州军帅司'],
        southernFrontierRegions: ['河东北路·太原府', '河北西路·真定府', '河北东路·河间府', '河东南路·平阳府', '河东南路·河中府', '河东南路·隆德府'],
        note: '统计由当前 map.regions 中 ownerKey=fac-jin 的地块汇总，随地图重判同步更新；河间府按本轮校正计入金军实控，不把山东、东京开封提前计为金稳控。'
      },
      economyProfile: {
        basis: ['汴京府藏与靖康掳获', '燕云河东河北新占地赋调', '辽东马政与渔猎皮货', '契丹渤海汉官转输文书', '傀儡代守与签军制度'],
        strengths: ['战役储备雄厚，能支撑短期高强度南侵', '骑兵机动强，补给压力可用掳获和征发暂时缓解', '辽宋旧官僚可快速接管州县税粮簿籍'],
        weaknesses: ['女真本部丁口少，无法长期直接驻守所有汉地州县', '新占地民心未附，义军与逃户会侵蚀税基', '东西两路军府争功，后方治理和前线进攻常互相牵扯'],
        fiscalRisk: '若南侵久拖、河北河东义军不断、宋廷稳住江淮水网，金的短期掳获优势会转化为漫长占领成本。'
      },
      militarySystem: {
        doctrine: '猛安谋克骑军高速突进，契丹渤海汉军守城转输，降军签军补足攻城和运输；以两路军府压迫宋廷，在宋未整军前连续出击。',
        eliteUnits: ['猛安谋克女真骑军', '合扎猛安亲军', '拐子马突击队', '契丹渤海辅骑', '汉地签军攻城队'],
        command: ['会宁府太宗与勃极烈定大略', '云中西路宗翰主河东关陕方向', '燕云东路宗望旧部重整后由宗弼等接手追击', '韩企先等汉官负责新占州县赋役文书'],
        strengths: ['骑兵战役机动压倒宋初草创军制', '灭辽灭宋经验完整，围城、强渡、长驱能力强', '士气和威慑处于峰值，降官降军容易被裹挟'],
        weaknesses: ['江淮水网、坚城久围和南方疫病会削弱骑军优势', '新占汉地守备稀薄，义军可切粮道', '宗望死后东路军权真空会刺激宗弼与挞懒等争位'],
        mobilization: {
          fieldArmyRating: 100,
          cavalryRating: 100,
          siegeRating: 82,
          logisticsRating: 74,
          occupationRating: 48,
          note: '短期南侵强度拉满；长期占领与民政消化明显弱于野战。'
        },
        invasionPriorities: ['河间与河北残宋据点', '东京开封与宗泽留守司', '山东京东两路', '河南与淮北追击赵构', '关陕河中与潼关压力']
      },
      diplomacyMatrix: {
        song: { stance: '视赵构南朝为必须尽快扑灭的正朔残火。', leverage: ['徽钦二帝与北狩宗室', '汴京府藏', '河北河东军事压力', '傀儡政权'] },
        xixia: { stance: '名义宗主，既许地羁縻又防其趁宋金大战扩张。', leverage: ['陕北割地承诺', '天德云内控制权', '共同压迫宋西军'] },
        goryeo: { stance: '册封威压为主，避免高丽联宋或收留辽宋余众。', leverage: ['海东朝贡', '辽东边防', '贸易与册命'] },
        steppe: { stance: '北边属部可用作屏障；蒙兀、塔塔儿等强部需分化招抚。', leverage: ['互市', '封号', '边军威慑'] },
        liaoRemnants: { stance: '耶律大石和契丹余众是后方隐患，南侵时不可完全放空西北。', leverage: ['辽旧官僚', '契丹降将', '北边羁縻'] }
      },
      openingDilemmas: [
        { id: 'jin-east-route-vacuum', title: '宗望死后东路军权谁主', choices: ['扶宗弼速成追击主帅', '由挞懒安抚燕云河北', '让宗翰统筹两路以求速胜'] },
        { id: 'jin-puppet-or-direct-rule', title: '中原用傀儡还是军府直辖', choices: ['再立傀儡代守', '设军府直辖征赋', '降官守州、女真控兵'] },
        { id: 'jin-southward-tempo', title: '秋冬南侵节奏', choices: ['以河间为廊道压山东京畿', '先平河北义军再南下', '西路压关陕、东路追赵构'] },
        { id: 'jin-occupation-cost', title: '新占汉地如何消化', choices: ['重征粮草养战', '减征安抚编户', '迁女真猛安屯守要地'] },
        { id: 'jin-xixia-border', title: '西夏割地与北边防务', choices: ['履行部分许地换其牵制宋军', '拖延交割保天德云内', '用阴山诸部防夏防契丹'] },
        { id: 'jin-hejian-corridor', title: '河间新占廊道如何稳住', choices: ['降官编户护粮道', '猛安屯守震慑州县', '放轻赋税诱河北豪右归附'] },
        { id: 'jin-song-pursuit-intel', title: '追击赵构的情报网', choices: ['重用燕云通事和降官', '逼河北州县供给斥候', '以傀儡名义诱降宋臣'] }
      ],
      aiBehaviorHints: [
        '金 AI 应主动、连续、压迫性南侵；赵构未稳江淮前优先进攻而非长期休整。',
        'AI 目标以灭宋正朔为最高优先级：东京、山东、淮北、赵构行在均应被标为高压方向；河间作为已控但未安的前进廊道处理。',
        '金很强但不全知：河间可作新占实控，山东和东京开封不能提前稳占；这些应通过秋冬战事或事件推进。',
        '宗翰系偏西路强攻，宗弼系偏追击赵构，挞懒与汉官更重代守安抚；AI 决策可围绕三者张力摆动。',
        '若宋廷启用宗泽、李纲、岳飞、韩世忠并整合河北义军，金 AI 应转为更凶猛的预防性打击。',
        'AI 语气应带灭国余威和军府冷酷：少讲仁义，多讲渡河、围城、签军、粮道、傀儡、降官、追索行在。',
        '占领逻辑要有成本：每多一片汉地，河北义军、逃户、粮道和降官忠诚都应制造噪音，迫使金在疾攻与消化之间拉扯。'
      ],
      aiAggressionProfile: {
        score: 100,
        openingTurns: '前 30 回合保持最高攻击欲望，优先制造宋廷迁幸、河防、河北义军多线压力。',
        strategicPriorities: ['hunt-emperor', 'secure-hejian-corridor', 'capture-kaifeng', 'break-hebei-loyalists', 'pressure-shaanxi', 'install-puppet'],
        restThreshold: 18,
        retreatThreshold: 8,
        acceptsPeaceOnlyIf: ['宋称臣纳贡并割河南河东关键州府', '赵构被俘或行在崩溃', '金本部爆发继承或北边危机']
      },
      aiPersonality: {
        voice: '强硬、短句、军令式，带灭辽破宋后的自信和对新占汉地的不信任。',
        strategicTemper: '开局疾攻优先，除非补给、疫病、义军和北边危机同时压高，才会短暂停顿。',
        internalTension: '宗翰要西路破关陕，宗弼要追赵构立威，挞懒与汉官想用傀儡和安抚降低占领成本。',
        blindSpot: '过度相信骑军威慑和靖康掳获能解决长期占领，容易低估江淮水网和河北义军。'
      },
      aiDecisionWeights: {
        destroySongLegitimacy: 100,
        huntEmperor: 98,
        secureHejianCorridor: 84,
        suppressHebeiMilitia: 88,
        conserveJurchenCore: 64,
        usePuppetRegimes: 76,
        appeaseHanOfficials: 48,
        pressureXixia: 42
      },
      aiConditionalBehaviors: [
        { trigger: 'song_court_reorganizes_yuying', response: '立即提高追击赵构和破坏御营整编优先级，不给其在江淮成军。' },
        { trigger: 'hebei_loyalists_link_regions', response: '暂停部分南下纵深，先以河间、真定、平州为轴清剿粮道威胁。' },
        { trigger: 'kaifeng_or_zongze_resists', response: '加大围城和傀儡招降压力，同时命西路牵制关陕援军。' },
        { trigger: 'supply_or_epidemic_crisis', response: '改以降官、签军、傀儡守州，女真主力后撤至河间、燕云、河东补给节点。' },
        { trigger: 'xixia_refuses_auxiliary_pressure', response: '拖延陕北割地，扶阴山诸部牵制西夏，但避免马上开启北边全面冲突。' }
      ],
      aiImmersionHooks: ['河间转运廊道', '宗望死后东路重整', '靖康府藏战役储备', '傀儡代守', '签军征发', '搜山检海伏线'],
      posture: 'all_out_invasion',
      aiStrategy: '超高侵略性南侵。默认主动寻战、围城、追击赵构和切断宋廷河防重建；除非补给或北边危机跌破阈值，否则不应长时间停在既占区经营。前期每回合以河间新占廊道、真定、太原、平州为北方节点，优先压迫宋廷核心目标：东京开封、山东、河南淮北、关陕河中与赵构行在。扶傀儡和招降是为释放女真主力继续进攻，不是转入保守防御。',
      warState: {
        active: [
          { enemy: '宋朝廷', since: '1126.11', front: '河北、河东、京畿、河南与淮北' },
          { enemy: '河北忠义武装', since: '1127.08', front: '磁相、太行、河朔州县' }
        ],
        pending: [
          { enemy: '宋西军', since: '1127.08', front: '河中、潼关、关陕方向' },
          { enemy: '宋江淮水军', since: '1127.08', front: '赵构南走后的江淮追击线' }
        ],
        recent: [
          { year: 1126, month: 11, event: '宗翰、宗望两路再围汴京，北宋亡。' },
          { year: 1127, month: 3, event: '掳徽钦二帝与府藏北行，立张邦昌伪楚。' },
          { year: 1127, month: 6, event: '东路统帅宗望病死，东路军权重整。' }
        ]
      },
      relations: Object.assign({}, faction.relations || {}, {
        '宋朝廷': -100,
        '河北义军': -95,
        '西军（关陕）': -90,
        '御营': -95,
        '太行八字军': -90,
        '西夏': 15,
        '高丽': 20
      }),
      population: {
        actual: summary.totalPopulation,
        registered: Math.round(summary.totalPopulation * 0.78),
        hidden: Math.round(summary.totalPopulation * 0.22),
        ethnicities: summary.ethnicities,
        note: '由当前金控地图地块人口按族群加权汇总；女真本部人数少，新占汉地人口占主体，消化未深。'
      },
      treasury: {
        money: campaignMoney,
        grain: campaignGrain,
        cloth: Math.max(Math.round(summary.totalFiscal * 0.22), 280000),
        campaignReserve: {
          money: campaignMoney - baseMoney,
          grain: campaignGrain - baseGrain,
          source: '靖康掳获、汴京府藏与短期战役征发补足地图府库之外的进攻储备'
        },
        note: '势力府库以当前金控地块府库为基础，并额外计入靖康掳获形成的短期战役储备；强在开局南侵，弱在长期占领。'
      }
    });
    const history = Array.isArray(faction.history)
      ? faction.history.filter((item) => !(item?.year === 1127 && item?.month === 8))
      : [];
    history.push({
      year: 1127,
      month: 8,
      event: '金已占原辽地、燕云、太原、真定、河间与河东若干要地；河间为新占实控但民心未附，山东和东京开封尚未纳入稳定占领线。宗望死后东路重整，宗翰、宗弼等正准备以更高强度秋冬南侵追击赵构。'
    });
    faction.history = history;
    faction.timeline = history.slice();
  }

  const force = Array.isArray(scenario.externalForces)
    ? scenario.externalForces.find((item) => item.name === '金 (大金国)' || /大金国/.test(item.name || ''))
    : null;
  if (force) {
    Object.assign(force, {
      ruler: '完颜吴乞买',
      capital: '会宁府',
      threatLevel: 10,
      stance: '建炎元年八月：大金处在灭辽破宋后的攻势峰值，已据原辽地、燕云、太原、真定、河间与河东若干要地；河间是新入实控的前进廊道，河南、山东和东京开封尚未完成稳定占领，正准备秋冬高强度南侵并追击赵构。',
      interests: ['持续南侵，尽快扑灭赵构南朝正朔', '巩固原辽地、燕云、太原、真定与河间等已占州府', '秋冬再压河南、京畿与山东', '以傀儡和降官代守新占汉地，释放女真主力'],
      keyFigures: ['完颜吴乞买', '完颜宗翰', '完颜宗弼', '完颜娄室', '完颜挞懒', '完颜希尹', '韩企先'],
      resources: ['猛安谋克骑军', '汴京府藏', '辽东马源', '燕云河东河北赋税', '汉契降官转输'],
      militaryNote: '开局按最高威胁处理：女真骑军野战、突袭和长驱追击能力极强；攻城与占领依赖汉契官僚、签军和傀儡代守，越往江淮越受水网、疫病和粮道限制。',
      intervention: '若宋廷整军或北方义军连成片，金会倾向提前发动预防性进攻；若赵构南走，则优先追击行在而不是保守经营已占地；若河间粮道受扰，则短暂停顿清剿河北义军。',
      territorySummary: {
        mapRegionCount: summary.regionCount,
        population: summary.totalPopulation,
        fiscalAnnual: summary.totalFiscal,
        keyRegions: summary.keyRegions.slice(0, 8)
      },
      policyHooks: ['东路宗望死后军权重整', '秋冬高强度南侵', '河间转运廊道治理', '傀儡代守新占汉地', '河北义军清剿', '西路宗翰与东路宗弼争功', '西夏割地与阴山边防'],
      aiAggressionProfile: {
        score: 100,
        strategicPriorities: ['hunt-emperor', 'secure-hejian-corridor', 'capture-kaifeng', 'break-hebei-loyalists', 'pressure-shaanxi', 'install-puppet']
      },
      history: [
        { year: 1115, event: '完颜阿骨打称帝建金。' },
        { year: 1125, event: '金灭辽，尽收辽东、燕云与辽旧地。' },
        { year: 1126, event: '金两路攻宋，宗望初围汴京。' },
        { year: 1127, month: 3, event: '汴京陷后掳徽钦二帝北行，立张邦昌伪楚。' },
        { year: 1127, month: 6, event: '完颜宗望病死，东路军权重整。' },
        { year: 1127, month: 8, event: '开局时金军准备秋冬再举南侵；河间府已作金军新占实控廊道，山东、东京开封仍不作稳定占领。' }
      ]
    });
  }
}

function syncHebeiMilitiaMetadata(scenario) {
  const factions = Array.isArray(scenario.factions) ? scenario.factions : [];
  const militia = factions.find((item) => item.id === 'fac_hebei_yijun');
  if (militia) {
    Object.assign(militia, {
      type: '磁相守城忠义武装',
      leader: '磁相守将与义兵头领',
      coLeader: null,
      members: [],
      _potentialMembers: ['王彦（建炎元年九月后整合部分两河忠义武装）'],
      _membershipNote: '此势力只表达磁、相一带仍奉宋廷正朔的守城官军与乡兵；原先误放在陕甘方位的两块“太行山水寨”已撤销。王善、丁进等流动武装不作磁相寨区的领土统治者。',
      stateDescription: '建炎元年八月，磁、相等州守城官军与忠义乡兵仍在抵抗金军，尚未纳入九月以后王彦八字军的整合系统。',
      currentMorale: 68,
      fiscalCondition: '磁相城寨自筹粮械·仰乡里输送·无统一府库',
      strength: 22,
      capital: '磁州、相州一带城寨（无定都）',
      ideology: '守土护民·忠于赵宋·据寨抗金·望王师北援',
      traits: ['local-militia', 'mountain-stockades', 'decentralized', 'anti-jin', 'song-loyalist', 'self-supplied'],
      mainResources: ['磁相守城义兵', '城寨与太行东麓险隘', '河朔乡民输粮', '袭扰金军所得辎重器械'],
      longTermStrategy: '依托磁相城寨避免在平原与金军主力决战；等待东京留守司或河北招抚司接济粮械、统一节制，再图恢复河朔州县。',
      victoryConditions: ['保全磁相城寨', '获宋廷粮械和官号支援', '与王师内外夹击收复两河州县'],
      defeatConditions: ['金军分道围剿、断绝山寨粮道', '诸寨争粮内讧、各自溃散', '长期无援而被迫降金或转为流寇'],
      history: [
        { year: 1126, month: 9, event: '宗泽知磁州，缮城、募义勇，以磁州为两河抗金据点。' },
        { year: 1127, month: 8, event: '磁、相等地守军与忠义乡兵仍据城抵抗，尚未形成统一指挥。' }
      ],
      attitudeDetail: {
        self: ['据城保境、抗击金军', '守军乡兵分散、难以久持', '仍奉宋廷正朔、望王师北援'],
        allies: ['宗泽东京留守司可为南面奥援', '河北招抚司官军尚在筹议北渡'],
        enemies: ['金军分兵攻取两河州县、招降乡寨', '附金地方武装与劫粮流寇'],
        neutrals: ['王善、丁进等流动武装可招抚，但不属磁相守军建制']
      },
      partyRelations: {
        '磁相守城义兵': { strength: 100, mood: '据城坚守', leader: '各州守将与义兵头领' }
      },
      leadership: { ruler: '磁相守将与义兵头领', regent: '', general: '各州守将与忠义民兵头领', chancellor: '', spy: '' },
      treasury: { money: 0, grain: 0, cloth: 0, note: '无统一府库；各寨靠乡里输送、山地屯粮与袭取金军辎重维持。' },
      warState: {
        active: [{ enemy: '金国（大金）', since: '1126.09', front: '磁相城寨' }],
        pending: [],
        recent: [{ event: '磁相守军与乡兵据城抗金', year: 1127, month: 8 }]
      },
      population: {
        actual: 0,
        registered: 0,
        hidden: 0,
        ethnicities: { '汉': 100 },
        note: '由守城官军、乡兵、溃卒与避兵乡民构成，分散于多座城寨，无可靠的统一兵额。'
      },
      posture: '分寨据守'
    });
  }

  const bazijun = factions.find((item) => item.id === 'fac_taihang_bzj');
  if (bazijun) {
    Object.assign(bazijun, {
      type: '河北招抚司北征军·尚未独立成军',
      stateDescription: '建炎元年八月，王彦仍在张所河北招抚司下筹备北渡，八字军尚未形成；九月王彦率七千人渡河、复新乡后败入共城西山，士卒才面刺八字。',
      currentMorale: 62,
      fiscalCondition: '由河北招抚司筹给·尚未建立山寨粮道',
      _independenceLevel: 5,
      _membershipNote: '场景开局时八字军尚未成为独立势力，因后续事件与角色关系保留根势力记录，但不绑定初始地块。',
      strength: 8,
      capital: '尚无据点；九月战败后始据共城西山',
      ideology: '奉河北招抚司之命筹议北渡·恢复河朔',
      traits: ['song-field-force', 'northern-expedition-preparing', 'not-yet-independent'],
      mainResources: ['张所河北招抚司官号', '王彦所部约七千官军', '尚在集结的河北义兵'],
      longTermStrategy: '待河北招抚司下令后率军渡河，恢复卫州、新乡并联络两河忠义；开局时尚无独立地盘与山寨系统。',
      victoryConditions: ['顺利渡河并恢复卫州新乡', '联络两河忠义武装', '获宋廷持续粮械支援'],
      defeatConditions: ['未渡河即因张所罢职而解散', '渡河后被金军重兵围歼', '与两河忠义武装无法取得联络'],
      history: [
        { year: 1127, month: 8, event: '王彦受张所拔为都统制，所部尚在河北招抚司下筹备北渡。' },
        { year: 1127, month: 9, event: '王彦率七千人渡河，复新乡后被金军重围，败入共城西山；士卒面刺“赤心报国，誓杀金贼”，八字军由此形成。' }
      ],
      attitudeDetail: {
        self: ['尚属河北招抚司官军', '北渡方略已定、但尚未开战', '尚无八字面刺与山寨根据地'],
        allies: ['张所与河北招抚司', '磁相及太行山水寨忠义武装'],
        enemies: ['真定、河东方向金军'],
        neutrals: ['两河诸寨尚各自为战，待北渡后联络']
      },
      partyRelations: { '河北招抚司军': { strength: 100, mood: '待命北渡', leader: '王彦' } },
      leadership: { ruler: '王彦', regent: '', general: '王彦', chancellor: '', spy: '' },
      treasury: { money: 0, grain: 0, cloth: 0, note: '尚由河北招抚司筹给，未建立后来八字军的山寨补给网。' },
      warState: {
        active: [],
        pending: [{ enemy: '金国（大金）', since: '1127.08', front: '待渡黄河 / 卫州新乡方向' }],
        recent: [{ event: '受张所任为都统制，筹备北渡', year: 1127, month: 8 }]
      },
      population: {
        actual: 0,
        registered: 0,
        hidden: 0,
        ethnicities: { '汉': 100 },
        note: '王彦所部约七千人，此时仍为宋军编制；尚未吸纳后来附入的两河忠义民兵。'
      },
      posture: '受命待渡'
    });
  }
}

function syncXijunMetadata(scenario) {
  const faction = Array.isArray(scenario.factions)
    ? scenario.factions.find((item) => item.id === 'fac_xijun')
    : null;
  if (!faction) return;
  Object.assign(faction, {
    type: '宋廷内部军伍集团·非领土政权',
    leader: '曲端',
    coLeader: null,
    _historicalLeader: '关陕诸路帅臣分治',
    stateDescription: '建炎元年八月，秦凤、泾原、熙河兰廓、环庆、鄜延及永兴军诸路仍奉宋廷正朔，由各路帅守、监司分治，并无独立“西军政权”。曲端尚为泾原路将领，未节制陕西六路；吴玠仅为泾原第二副将。',
    currentMorale: 60,
    fiscalCondition: '各路帅司与州府分筹粮饷，仍属宋廷地方财政军政体系',
    primaryTarget: 'fac_jin',
    loyaltyToSong: 90,
    _independenceLevel: 10,
    _membershipNote: '“西军”是对关陕边军将士的剧本内部集团标签，不是初始地图上的独立领土势力。曲端仅作代表性将领，不表示其在八月统治全陕西。',
    internalTension: '关陕诸路帅守、监司各有占护而不相统属；朝廷方议统合五路兵，尚无能总制诸路之人。',
    strength: 48,
    capital: '无独立都城；各路帅司分治（泾原治渭州，永兴军路治京兆府）',
    ideology: '奉宋廷正朔·分路守陕·保卫关中与川陕门户',
    traits: ['song-frontier-army', 'veteran-officer-corps', 'route-based-command', 'anti-xixia-hardened', 'not-a-territorial-state'],
    mainResources: ['宋廷陕西六路军额', '泾原、秦凤边军弓马手', '熙河兰廓番汉弓箭手', '京兆、凤翔府库与诸路屯田'],
    longTermStrategy: '以宋廷诏命统筹陕西诸路防务，保京兆、凤翔与陇山诸隘；补充调往行在后留下的兵力空缺，防金军自河中、同华方向入关，同时守备西夏边衔。',
    victoryConditions: ['守住京兆、凤翔与陕西诸路', '建立可有效调度各路的陕西节制体系', '阻止金军由关陕南迫川蜀'],
    defeatConditions: ['诸路各自为谋、援军不至', '永兴军、凤翔府与鄜延相继失陷', '关中与川蜀交通门户被金军打开'],
    history: [
      { year: 1126, month: 9, event: '西夏攻取西安州、怀德军，曲端被任为知镇戎军兼泾原经略司统制官。' },
      { year: 1127, month: 5, event: '高宗命唐重知京兆府并经略制置关中；陕西诸路仍由各帅守、监司分别掌握。' },
      { year: 1127, month: 8, event: '关陕诸路仍属宋廷；曲端尚屯泾州，未节制陕西六路，金军攻陕尚未开始。' }
    ],
    attitudeDetail: {
      self: ['关陕边军久经宋夏战事', '诸路帅守仍奉宋廷正朔', '各路不相统属是当前最大隐患'],
      allies: ['宋廷行在是唯一合法中枢', '川峡四路与关中互为后方'],
      enemies: ['金军已据河东，可自河中、同华方向入关', '西夏已夺横山部分州军，西北边防仍不可弛'],
      neutrals: ['曲端、吴玠等将领此时仅在各自军职内作战，不是独立藩镇']
    },
    partyRelations: {
      '永兴军与京兆帅司': { strength: 25, mood: '筹防沿河、请增援兵', leader: '唐重' },
      '泾原路': { strength: 20, mood: '据边备战', leader: '席贡、曲端等' },
      '秦凤与熙河兰廓诸路': { strength: 30, mood: '分路固守', leader: '各路帅臣' },
      '环庆与鄜延诸路': { strength: 25, mood: '防夏备金', leader: '各路帅臣' }
    },
    leadership: {
      ruler: '宋高宗·赵构',
      regent: '',
      general: '关陕诸路帅守分治；曲端为泾原将领，吴玠为第二副将',
      chancellor: '宋廷行在尚未设统一陕西节制帅',
      spy: ''
    },
    treasury: { money: 0, grain: 0, cloth: 0, note: '非独立府库；京兆、凤翔与陕西诸路府库、屯田均属宋廷地方财政军政体系。' },
    warState: {
      active: [],
      pending: [{ enemy: '金国（大金）', since: '1127.08', front: '河中、同华与潼关方向' }],
      recent: [{ event: '唐重受命知京兆府，筹议关中防河', year: 1127, month: 5 }]
    },
    population: {
      actual: 0,
      registered: 0,
      hidden: 0,
      ethnicities: { '汉': 80, '番汉弓箭手诸部': 20 },
      note: '此项表示关陕诸路宋军群体，不另立户口和疆域；其军户、乡兵与番汉弓箭手均纳入宋廷州县体系。'
    },
    posture: '奉宋分路守备'
  });
}

function buildAssignments(regions) {
  const assignments = new Map();
  for (const [id, name, owner] of ASSIGNMENT_ROWS) {
    if (assignments.has(id)) throw new Error(`duplicate assignment id ${id}`);
    assignments.set(id, [name, owner]);
  }
  if (assignments.size !== EXPECTED_REGION_COUNT) {
    const missing = regions.filter((region) => !assignments.has(region.id)).map((region) => region.id);
    throw new Error(`assignment coverage ${assignments.size}/${EXPECTED_REGION_COUNT}; missing=${missing.join(',')}`);
  }
  return assignments;
}

function updateRegion(region, assignment) {
  const [name, ownerKey] = assignment;
  const faction = FACTIONS[ownerKey];
  if (!faction) throw new Error(`unknown faction ${ownerKey} for ${region.id}`);
  const scenarioOwner = ownerKey.replaceAll('-', '_');
  region.name = name;
  region.owner = scenarioOwner;
  region.initialOwner = scenarioOwner;
  region.currentOwner = scenarioOwner;
  region.controller = scenarioOwner;
  region.ownerKey = ownerKey;
  region.initialOwnerKey = ownerKey;
  region.currentOwnerKey = ownerKey;
  region.controllerKey = ownerKey;
  region.stableFactionId = ownerKey;
  region.factionId = scenarioOwner;
  region.factionName = faction.name;
  region.ownerName = faction.name;
  region.factionColor = faction.color;
  region.color = faction.color;
  region.description = `${name}。建炎元年八月地理与势力归属按绑定地图几何重新判定，当前${getRegionControlDescription(faction, ownerKey, region.id)}。`;
  region.ownerHistory = [{ year: 1127, month: 8, owner: scenarioOwner, ownerKey, ownerName: faction.name }];
  region.mapRegionId = region.id;
  region.mutable = true;
  applyOwnerDefaults(region, ownerKey);
  Object.assign(region, REGION_METADATA_OVERRIDES[region.id] || {});
  applySocioeconomicProfile(region, ownerKey);
  return region;
}

function buildMapFactions() {
  const mapFactions = {};
  for (const [ownerKey, faction] of Object.entries(FACTIONS)) {
    const scenarioFactionId = ownerKey.replaceAll('-', '_');
    mapFactions[scenarioFactionId] = {
      label: faction.name,
      short: faction.name.slice(0, 4),
      color: faction.color,
      line: faction.color,
      note: `${faction.name}在建炎元年八月的初始控制范围。`,
      type: faction.control.includes('部落') ? '部落' : '主权政权',
      score: 50,
      scenarioFactionId,
      scenarioFactionName: faction.name,
      scenarioFactionColor: faction.color
    };
  }
  return mapFactions;
}

function copyRegionAdminData(region) {
  const fields = [
    'population', 'populationDetail', 'fiscalDetail', 'publicTreasuryInit', 'economyBase', 'byAge',
    'byGender', 'byEthnicity', 'byFaith', 'bySettlement', 'carryingCapacity', 'baojia', 'prosperity',
    'taxLevel', 'tags', 'taxBurden', 'minxinLocal', 'corruptionLocal', 'unrest', 'troops', 'armyDetail',
    'militaryRecruits', 'recruits', 'levyPool', 'militaryDetail', 'armyPressure', 'localMilitaryCost', 'retainedNet'
  ];
  const child = {
    name: region.name,
    type: region.level === 'province' ? '地块' : (region.level || '地块'),
    controlLevel: getRegionControlLabel(region.ownerKey, region.id),
    mapRegionId: region.id,
    desc: region.description
  };
  for (const field of fields) {
    if (region[field] !== undefined) child[field] = region[field];
  }
  syncHukouPanelFields(child, region);
  return child;
}

function rebuildAdminHierarchy(regions) {
  const hierarchy = {};
  for (const [ownerKey, faction] of Object.entries(FACTIONS)) {
    const owned = regions.filter((region) => region.ownerKey === ownerKey);
    if (!owned.length) continue;
    const key = ownerKey === 'fac-song' ? 'player' : ownerKey.replaceAll('-', '_');
    hierarchy[key] = {
      divisions: [{
        name: faction.realm,
        type: 'kingdom',
        controlLevel: faction.control,
        children: owned.map(copyRegionAdminData)
      }]
    };
  }
  return hierarchy;
}

function syncMilitaryRegionHints(scenario) {
  const regions = scenario.map?.regions || [];
  const names = new Set(regions.map((region) => region.name));
  const exactHints = {
    '御营司·中军': '京东两路·东平济南青州',
    '御营前军': '江南东路·江宁府',
    '御营右军': '江南东路·江宁府',
    '御营左军': '江南东路·江宁府',
    '东京留守司·正兵': '京畿路·东京开封府',
    '东京留守司·招抚义军': '京畿路·东京开封府',
    '太行八字军': '磁相忠义寨',
    '泾原吴玠部': '泾原路·渭州',
    '江淮水军': '江南东路·江宁府',
    '殿前司·残部': '江南东路·江宁府',
    '御营·苗傅刘正彦部': '两浙路·杭州',
    '熙河刘锜部': '泾原路·渭州',
    '泾原王庶节制兵': '泾原路·渭州',
    '河东忠义·李彦仙部': '京西北路·西京河南府',
    '建康水军·韩世忠舟师': '江南东路·江宁府',
    '建康水军·别部': '江南东路·江宁府',
    '川峡屯驻·吴璘部': '利州路·兴元府',
    '御营·张俊讨盗别部': '江南东路·江宁府',
    '御营·杨惟忠部': '江南东路·江宁府',
    '陕州忠义·邵隆部': '京西北路·西京河南府',
    '梁山泊水寨·张荣': '京东两路·东平济南青州',
    '洞庭乡社·钟相(将起)': '荆湖南路·潭州',
    '金西路军(粘罕)': '西京路·大同府',
    '金东路军(斡离不)': '河北西路·真定府',
    '金·娄室活女部(陕西)': '河东南路·河中府',
    '金·东京辽阳镇兵': '辽阳府·复州',
    '金·阇母山东兵': '京东两路·东平济南青州',
    '金·撒离喝陕西兵': '河东南路·河中府',
    '金·韩常燕京戍兵': '平州军帅司',
    '西夏·铁鹞子': '灵州·盐州',
    '西夏·铁鹞子重骑': '中兴府',
    '西夏·步跋子强弩': '夏州·宥州',
    '大越·李朝禁军': '升龙京畿',
    '大越·南疆御占军': '乂安州',
    '东喀喇汗·突厥游骑': '八剌沙衮',
    '东喀喇汗·怛逻斯边军': '怛罗斯',
    '高昌·回鹘统军': '高昌',
    '高昌·西陲戍军': '焉耆',
    '乃蛮·汗金印军': '乃蛮部·阿尔泰东麓',
    '乃蛮·镇山那颜军': '漠北西南诸部',
    '塔塔儿·盟主大纛本部': '塔塔儿·捕鱼儿湖西部',
    '塔塔儿·诸支联骑': '塔塔儿·捕鱼儿湖东部',
    '平氏·伊势武士团': '畿内',
    '延历寺山门僧兵': '畿内',
    '卫藏·后藏豪族部曲': '藏地诸部',
    '多康·康巴武士': '多康中部诸部',
    '多康·甘孜部骑': '多康东部诸部',
    '滇中南·乌蛮联部': '滇南诸部',
    '滇中南·白蛮城兵': '滇南溪洞诸部',
    '滇西北·磨些峡谷兵': '磨些诸部·滇西北',
    '蒲甘·伊江水步军': '上缅甸·蒲甘',
    '北海·渔猎部众': '黑水诸部'
  };
  const troops = scenario.military?.initialTroops;
  if (!Array.isArray(troops)) return;
  let corrected = 0;
  for (const army of troops) {
    const nextHint = exactHints[army.name];
    if (nextHint && names.has(nextHint) && army.regionHint !== nextHint) {
      army.regionHint = nextHint;
      corrected += 1;
    } else if (army.garrison && names.has(army.garrison) && army.regionHint !== army.garrison) {
      army.regionHint = army.garrison;
      corrected += 1;
    }
  }
  scenario._militaryRegionHintNote = `initialTroops regionHint已按重判后的182区地块名同步；本次校正${corrected}项，确保真实地块面板可绑定活军。`;
}

function validateMap(map, assignments) {
  if (map.id !== EXPECTED_MAP_ID) throw new Error(`unexpected map id ${map.id}`);
  if (!Array.isArray(map.regions) || map.regions.length !== EXPECTED_REGION_COUNT) {
    throw new Error(`unexpected region count ${map.regions?.length}`);
  }
  const ids = new Set();
  const names = new Set();
  for (const region of map.regions) {
    if (ids.has(region.id)) throw new Error(`duplicate region id ${region.id}`);
    if (names.has(region.name)) throw new Error(`duplicate region name ${region.name}`);
    if (!assignments.has(region.id)) throw new Error(`unassigned region ${region.id}`);
    if (!FACTIONS[region.ownerKey]) throw new Error(`unknown owner key ${region.ownerKey}`);
    if (region.owner !== region.ownerKey.replaceAll('-', '_')) {
      throw new Error(`owner binding mismatch for ${region.id}: ${region.ownerKey} -> ${region.owner}`);
    }
    if (!Array.isArray(region.polygon) || region.polygon.length < 3) {
      throw new Error(`invalid polygon for ${region.id}`);
    }
    ids.add(region.id);
    names.add(region.name);
  }
}

function main() {
  const scenarioPath = path.resolve(process.argv[2] || DEFAULT_SCENARIO);
  const scenario = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));
  if (scenario.map?.id !== EXPECTED_MAP_ID || scenario.mapData?.id !== EXPECTED_MAP_ID) {
    throw new Error('scenario is not bound to the expected 182-region map');
  }
  const assignments = buildAssignments(scenario.map.regions);
  syncScenarioFactions(scenario);
  splitWesternExternalForces(scenario);
  splitTibetanExternalForces(scenario);
  syncPaganExternalForce(scenario);
  syncXinanExternalForce(scenario);
  splitSouthSeaExternalForces(scenario);
  splitSteppeExternalForces(scenario);
  syncHebeiMilitiaMetadata(scenario);
  syncXijunMetadata(scenario);
  for (const map of [scenario.map, scenario.mapData]) {
    map.name = '绍宋·建炎元年八月·重判舆图';
    map.source = 'shaosong-1127-182-bound-rejudged-factions-2026-06-21';
    map.factions = buildMapFactions();
    for (const region of map.regions) {
      updateRegion(region, assignments.get(region.id));
    }
    validateMap(map, assignments);
  }
  syncJinMetadata(scenario);
  syncXixiaMetadata(scenario);
  scenario.adminHierarchy = rebuildAdminHierarchy(scenario.map.regions);
  syncMilitaryRegionHints(scenario);
  scenario._mapReplaceNote = '直接基于已绑定shaosong-1127-182几何重判182区名称与建炎元年八月势力归属；保留稳定ID、polygon、center与neighbors。';
  scenario._adminNote = 'adminHierarchy按重判后的mapRegionId与owner重新生成；owner绑定根势力ID，ownerKey保留稳定地图势力ID，map与mapData的名称、归属与势力绑定同步。';
  fs.writeFileSync(scenarioPath, `${JSON.stringify(scenario, null, 1)}\n`, 'utf8');
  const counts = scenario.map.regions.reduce((result, region) => {
    result[region.ownerKey] = (result[region.ownerKey] || 0) + 1;
    return result;
  }, {});
  console.log(JSON.stringify({ ok: true, scenarioPath, mapId: scenario.map.id, regionCount: scenario.map.regions.length, counts }, null, 2));
}

main();
