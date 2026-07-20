#!/usr/bin/env node
// build-shaosong-parity.js — 把绍宋补全数据块写入唯一真源，再统一重建所有派生物。
'use strict';
const fs = require('fs');
const path = require('path');
const DATA = require('./shaosong-parity-data.js');

const ROOT = path.resolve(__dirname, '..');
const SS_SRC = path.join(ROOT, 'scenarios', '绍宋·建炎元年八月（官方）.json');
const GODOT_SS = path.join(ROOT, 'web', 'godot', 'data', 'scenarios', '绍宋·建炎元年八月（官方）.json');
const SS_ID = 'sc-jianyan1-1127-shaosong';
const clone = (x) => JSON.parse(JSON.stringify(x));

// 替换型字段:绍宋原为空/缺,整体覆盖
const PATCH = {};
['government', 'military', 'rules', 'timeline', 'mechanicsConfig', 'cities', 'items', 'culturalWorks'].forEach(function (k) {
  if (DATA[k] != null) PATCH[k] = DATA[k];
});
// 合并型字段(按 name 追加·保留绍宋现有·幂等):字段名 → 数据块里的增量数组名
const MERGE = { families: 'familiesAdd', characters: 'charactersAdd' };

function applyPatch(target) {
  Object.keys(PATCH).forEach((k) => { target[k] = clone(PATCH[k]); });
  Object.keys(MERGE).forEach((field) => {
    const add = DATA[MERGE[field]];
    if (!Array.isArray(add)) return;
    if (!Array.isArray(target[field])) target[field] = [];
    const have = new Set(target[field].map((x) => x && x.name));
    add.forEach((item) => { if (!have.has(item.name)) target[field].push(clone(item)); });
  });
  // troopsAdd 并入 military.initialTroops(military 已被 PATCH 整覆盖·按 name 去重·幂等)
  if (Array.isArray(DATA.troopsAdd) && target.military && Array.isArray(target.military.initialTroops)) {
    const haveT = new Set(target.military.initialTroops.map((t) => t && t.name));
    DATA.troopsAdd.forEach((t) => { if (!haveT.has(t.name)) target.military.initialTroops.push(clone(t)); });
  }
}

// 第一步:以源 JSON 为唯一真相·打补丁成 canonical 绍宋
function buildCanonical() {
  const sc = JSON.parse(fs.readFileSync(SS_SRC, 'utf8'));
  if (sc.id !== SS_ID) throw new Error('源 JSON id 非绍宋');
  applyPatch(sc);
  fs.writeFileSync(SS_SRC, JSON.stringify(sc, null, 2), 'utf8');
  console.log('  ✓ 源 JSON(canonical)·characters=' + sc.characters.length + ' families=' + sc.families.length + ' troops=' + sc.military.initialTroops.length);
  return sc;
}

function syncGodot(canonical) {
  if (!fs.existsSync(GODOT_SS)) { console.log('  - godot 副本不存在·跳过'); return; }
  fs.writeFileSync(GODOT_SS, JSON.stringify(canonical, null, 2), 'utf8');
  console.log('  ✓ godot 副本(整体同步自源)');
}

function main() {
  console.log('[build-shaosong-parity] 字段: ' + Object.keys(PATCH).join(', ') + ' + 合并(' + Object.keys(MERGE).join(',') + ')+troopsAdd');
  const canonical = buildCanonical();
  syncGodot(canonical);
  require('../web/scripts/sync-official-scenarios.js').sync({ check: false });
  console.log('[build-shaosong-parity] 完成·根 JSON 已同步到全部运行时/编辑器/发布制品。');
}
if (require.main === module) main();
module.exports = { PATCH };
