#!/usr/bin/env node
// build-shaosong-parity.js — 把绍宋补全数据块(shaosong-parity-data.js)外科手术注入 4 制品。
// 通用:patch 里有哪些 key 就只覆盖绍宋的哪些 key,绝不动天启;逐 slice 累加调用即可。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const DATA = require('./shaosong-parity-data.js');

const ROOT = path.resolve(__dirname, '..');
const SS_SRC = path.join(ROOT, 'scenarios', '绍宋·建炎元年八月（官方）.json');
const EDITOR_BUNDLE = path.join(ROOT, 'web', 'preview', 'official-scenarios-bundle.js');
const GAME_BUNDLE = path.join(ROOT, 'web', 'tm-official-scenario-bundle.js');
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

// 第二步:把 canonical 绍宋整体同步到各 bundle 的绍宋条目(消除基底分歧·绝不动天启)
function syncBundle(file, globalName, isArray, canonical, label) {
  const src = fs.readFileSync(file, 'utf8');
  const ctx = { console }; ctx.global = ctx; ctx.window = ctx; ctx.globalThis = ctx;
  vm.runInNewContext(src, ctx, { filename: 'b.js' });
  const obj = ctx[globalName];
  if (isArray) {
    const e = obj.find((x) => x && x.data && x.data.id === SS_ID);
    if (!e) { console.warn('  ! ' + label + ' 未找到绍宋·跳过'); return; }
    e.data = clone(canonical);
  } else {
    if (!obj.shaosong) { console.warn('  ! ' + label + ' 未找到绍宋·跳过'); return; }
    obj.shaosong = clone(canonical);
  }
  const head = src.slice(0, src.indexOf('global.' + globalName)) + 'global.' + globalName + ' = ';
  const tail = src.slice(src.lastIndexOf('})('));
  fs.writeFileSync(file, head + JSON.stringify(obj) + ';\n' + tail, 'utf8');
  console.log('  ✓ ' + label + '(绍宋整体同步自源)');
}

function syncGodot(canonical) {
  if (!fs.existsSync(GODOT_SS)) { console.log('  - godot 副本不存在·跳过'); return; }
  fs.writeFileSync(GODOT_SS, JSON.stringify(canonical, null, 2), 'utf8');
  console.log('  ✓ godot 副本(整体同步自源)');
}

function main() {
  console.log('[build-shaosong-parity] 字段: ' + Object.keys(PATCH).join(', ') + ' + 合并(' + Object.keys(MERGE).join(',') + ')+troopsAdd');
  const canonical = buildCanonical();
  syncBundle(EDITOR_BUNDLE, 'TM_OFFICIAL_SCENARIOS', false, canonical, '编辑器 bundle');
  syncBundle(GAME_BUNDLE, 'TMOfficialScenarioBundle', true, canonical, '游戏 seeder bundle');
  syncGodot(canonical);
  console.log('[build-shaosong-parity] 完成·源=编辑器=游戏=godot 绍宋一致。');
}
if (require.main === module) main();
module.exports = { PATCH };
