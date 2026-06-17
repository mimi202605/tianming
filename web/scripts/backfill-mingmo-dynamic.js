#!/usr/bin/env node
// scripts/backfill-mingmo-dynamic.js — Slice K2·明末剧本动态字段补全
// 2026-05-10·use: node scripts/backfill-mingmo-dynamic.js
// 给 initialTroops 加 controlLevel / payArrearsMonths / mutinyRisk
// 让 derivedHealth 计算能反映史观 (明朝廷应入"弱/危")

'use strict';
const fs = require('fs');
const path = require('path');
const SCN_DIR = path.resolve(__dirname, '..', '..', 'scenarios');

// 名称 pattern → [controlLevel, payArrearsMonths, mutinyRisk]
// 较前 = 较高优先 (具体 > 通用)
const RULES = [
  // 后金 (健·汗亲领整旗)
  [/^后金·两黄旗/, [100, 0, 5]],
  [/^后金·两红旗/, [100, 0, 8]],
  [/^后金·两白旗/, [100, 0, 5]],
  [/^后金·两蓝旗/, [95, 0, 12]],
  [/^后金·蒙古/, [90, 0, 10]],
  [/^后金·汉军/, [85, 0, 12]],
  [/辽东土官·女真/, [70, 0, 15]],
  // 郑芝龙 (私军·满)
  [/郑芝龙/, [95, 0, 10]],
  // 关宁系 (祖大寿/吴襄家丁化·欠饷·袁去后人浮)
  [/祖氏家丁|宁远副总兵·祖氏/, [90, 4, 35]],
  [/关宁铁骑/, [80, 3, 25]],
  [/关宁军/, [75, 3, 30]],
  [/宁远卫·满桂/, [65, 2, 28]],
  [/^山海关/, [60, 2, 25]],
  // 东江镇 (毛文龙独立王国·冒饷)
  [/东江/, [90, 5, 60]],
  // 三边 (欠饷重·崇祯起义之源)
  [/^延绥/, [65, 6, 60]],
  [/^宁夏/, [60, 5, 55]],
  [/^甘肃/, [60, 6, 55]],
  [/^固原/, [60, 5, 50]],
  [/^三边/, [65, 6, 60]],
  // 北边
  [/^蓟州/, [45, 2, 28]],
  [/^宣府|^大同/, [50, 2, 30]],
  [/^山西镇/, [50, 2, 30]],
  // 京营 (阉党/空额·中央但无能)
  [/^京营/, [35, 1, 25]],
  // 土司私军 (忠但私)
  [/白杆兵|石柱/, [75, 1, 15]],
  [/狼兵/, [70, 1, 20]],
  // 水师/边缘
  [/^福建水师/, [60, 2, 25]],
  [/^广东水师/, [50, 2, 25]],
  // 卫所 (废弛)
  [/全国卫所军/, [25, 4, 50]],
  [/卫\(.*\)$|卫\(/, [25, 3, 40]],
  [/南京京营外备/, [30, 3, 40]],
  // 登莱
  [/^登莱/, [50, 3, 40]],
];
const DEFAULT_DYNAMIC = [50, 1, 25];

function inferDynamic(armyName) {
  for (var i = 0; i < RULES.length; i++) {
    if (RULES[i][0].test(armyName)) return RULES[i][1].slice();
  }
  return DEFAULT_DYNAMIC.slice();
}

// 党派 → 默认 loyalty (仅在 char.loyalty 缺失时用)
const PARTY_LOYALTY = {
  '阉党': 30, '魏党': 30,
  '东林党': 80, '东林': 80,
  '满洲八旗贵族': 90, '后金宗室': 90,
  '蒙古王公': 70
};

function backfillScenario(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log('skip·not found: ' + filePath);
    return null;
  }
  // 备份·走 _archived-backups 子目录
  var bakDir = path.join(path.dirname(filePath), '_archived-backups');
  fs.mkdirSync(bakDir, { recursive: true });
  var bakPath = path.join(bakDir, path.basename(filePath) + '.pre-dynamic-backfill.bak');
  if (!fs.existsSync(bakPath)) {
    fs.copyFileSync(filePath, bakPath);
  }
  var sc = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  var changedTroops = 0, changedChars = 0;

  // 1. initialTroops 动态字段
  var troops = (sc.military && sc.military.initialTroops) || [];
  troops.forEach(function(t) {
    var dyn = inferDynamic(t.name || '');
    if (t.controlLevel === undefined) { t.controlLevel = dyn[0]; changedTroops++; }
    if (t.payArrearsMonths === undefined) { t.payArrearsMonths = dyn[1]; }
    if (t.mutinyRisk === undefined) { t.mutinyRisk = dyn[2]; }
  });

  // 2. char.loyalty 党派微调 (仅当缺失或 0)
  var chars = sc.characters || [];
  chars.forEach(function(c) {
    if (typeof c.loyalty !== 'number' || c.loyalty === 0) {
      var lo = PARTY_LOYALTY[c.party];
      if (lo != null) { c.loyalty = lo; changedChars++; }
    }
  });

  fs.writeFileSync(filePath, JSON.stringify(sc, null, 2), 'utf8');
  console.log('backfilled ' + path.basename(filePath) + ': ' + changedTroops + ' troops, ' + changedChars + ' chars');
  return { troops: changedTroops, chars: changedChars };
}

function main() {
  var files = ['天启七年·九月（官方）.json', '崇祯.json', '挽天倾：崇祯死局.json'];
  files.forEach(function(f) {
    backfillScenario(path.join(SCN_DIR, f));
  });
}

try { main(); } catch (e) { console.error(e); process.exit(1); }
