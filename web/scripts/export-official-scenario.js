#!/usr/bin/env node
// scripts/export-official-scenario.js
//
// 把官方剧本 web/scenarios/tianqi7-1627.js 跑一遍 register()，
// 把生成的 scenario 对象 + 其在 P.* 下的实体（characters / factions / parties /
// classes / variables / events / relations / items / rigidHistoryEvents）平铺
// 合并成一份 JSON，写到顶层 scenarios/天启七年·九月（官方）.json。
//
// 与既有用户剧本 JSON（崇祯.json / 挽天倾：崇祯死局.json 等）schema 对齐：
//   { ...scenario, characters: [...], factions: [...], ... }
//
// 用途：备份 · 版本对照 · 独立编辑工具二次加工 · git diff。
// 权威源仍是 tianqi7-1627.js — 这份 JSON 是导出快照，不参与运行时加载。
//
// 用法：
//   node scripts/export-official-scenario.js
//
// 退出码：0 = 成功；1 = 加载/注册失败。
//
// 零依赖（仅 fs / path / 内联运行剧本 JS）。

'use strict';
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const SCENARIO_JS = path.resolve(__dirname, '..', 'scenarios', 'tianqi7-1627.js');
const TARGET_JSON = path.resolve(__dirname, '..', '..', 'scenarios', '天启七年·九月（官方）.json');
const MERGE_SUPPLEMENT = path.resolve(__dirname, 'merge-tianqi-historical-supplement.js');
const BUILD_TIANQI_MAP = path.resolve(__dirname, 'build-tianqi-preview-map.js');
const ATTACH_TIANQI_MAP = path.resolve(__dirname, 'attach-tianqi-map-to-official-scenario.js');
const SID = 'sc-tianqi7-1627';
const args = new Set(process.argv.slice(2));

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.warn('[export] previous JSON unreadable, skip preserve: ' + err.message);
    return null;
  }
}

function arrayItemKeys(item, arrayName) {
  if (!item || typeof item !== 'object') return [];
  const keys = [];
  if (arrayName === 'characters') {
    if (item.name) keys.push('name:' + item.name);
    else if (item.id) keys.push('id:' + item.id);
    return keys;
  }
  if (arrayName === 'families') {
    if (item.name) keys.push('name:' + item.name);
    else if (item.id) keys.push('id:' + item.id);
    return keys;
  }
  if (item.from && item.to && item.type) keys.push('rel:' + item.from + '|' + item.to + '|' + item.type);
  if (item.id) keys.push('id:' + item.id);
  if (item.name) keys.push('name:' + item.name);
  if (item.key) keys.push('key:' + item.key);
  if (item.title) keys.push('title:' + item.title);
  return keys;
}

function preservePreviousArrays(out, previous) {
  if (!previous || !out || typeof previous !== 'object' || typeof out !== 'object') return {};
  const preserved = {};
  const arrayNames = ['characters', 'families', 'relations', 'factionRelations'];
  for (const arrayName of arrayNames) {
    const prevList = Array.isArray(previous[arrayName]) ? previous[arrayName] : [];
    if (!prevList.length) continue;
    if (!Array.isArray(out[arrayName])) out[arrayName] = [];
    const keyToIndex = new Map();
    out[arrayName].forEach(function (item, index) {
      for (const key of arrayItemKeys(item, arrayName)) {
        if (!keyToIndex.has(key)) keyToIndex.set(key, index);
      }
    });
    let merged = 0;
    const added = [];
    for (const item of prevList) {
      const itemKeys = arrayItemKeys(item, arrayName);
      if (!itemKeys.length) continue;
      const existingIndex = itemKeys.map(key => keyToIndex.get(key)).find(index => index !== undefined);
      if (existingIndex !== undefined) {
        out[arrayName][existingIndex] = Object.assign({}, out[arrayName][existingIndex], item);
        for (const key of itemKeys) {
          if (!keyToIndex.has(key)) keyToIndex.set(key, existingIndex);
        }
        merged++;
        continue;
      }
      out[arrayName].push(item);
      const newIndex = out[arrayName].length - 1;
      for (const key of itemKeys) keyToIndex.set(key, newIndex);
      added.push(item.name || item.id || itemKeys[0]);
    }
    if (merged || added.length) preserved[arrayName] = { merged, added };
  }
  return preserved;
}

const previousOut = readJsonIfExists(TARGET_JSON);

if (args.has('--help') || args.has('-h')) {
  console.log([
    'Usage: node web/scripts/export-official-scenario.js [--base-only]',
    '',
    'Exports web/scenarios/tianqi7-1627.js to scenarios/天启七年·九月（官方）.json.',
    'By default it then applies the historical supplement, rebuilds the Tianqi Ming-2 map asset, and attaches it to the scenario.',
    '',
    'Options:',
    '  --base-only   export the JS source snapshot without applying the historical map supplement',
    '  --help, -h    show this help',
  ].join('\n'));
  process.exit(0);
}

global.P = {
  scenarios: [], scripts: [],
  characters: [], factions: [], parties: [], classes: [],
  variables: [], events: [], relations: [],
  rules: [], worldview: [],
  items: [], rigidHistoryEvents: []
};

const origLog = console.log;
console.log = function () {};
require(SCENARIO_JS);
console.log = origLog;

setTimeout(function () {
  const sc = global.P.scenarios.find(function (s) { return s.id === SID; });
  if (!sc) {
    console.error('[export] register 后未找到 scenario id=' + SID);
    process.exit(1);
  }
  function pick(arr) {
    return Array.isArray(arr) ? arr.filter(function (x) { return x && x.sid === SID; }) : [];
  }
  const out = Object.assign({}, sc, {
    characters: pick(global.P.characters),
    factions: pick(global.P.factions),
    parties: pick(global.P.parties),
    classes: pick(global.P.classes),
    variables: pick(global.P.variables),
    events: pick(global.P.events),
    relations: pick(global.P.relations),
    items: pick(global.P.items),
    rigidHistoryEvents: pick(global.P.rigidHistoryEvents)
  });

  fs.writeFileSync(TARGET_JSON, JSON.stringify(out, null, 2), 'utf8');
  if (!args.has('--base-only') && fs.existsSync(MERGE_SUPPLEMENT)) {
    if (fs.existsSync(BUILD_TIANQI_MAP)) {
      childProcess.execFileSync(process.execPath, [BUILD_TIANQI_MAP], { stdio: 'inherit' });
    }
    childProcess.execFileSync(process.execPath, [MERGE_SUPPLEMENT], { stdio: 'inherit' });
    if (fs.existsSync(BUILD_TIANQI_MAP)) {
      childProcess.execFileSync(process.execPath, [BUILD_TIANQI_MAP], { stdio: 'inherit' });
    }
    if (fs.existsSync(ATTACH_TIANQI_MAP)) {
      childProcess.execFileSync(process.execPath, [ATTACH_TIANQI_MAP], { stdio: 'inherit' });
    }
  }

  let finalOut = JSON.parse(fs.readFileSync(TARGET_JSON, 'utf8'));
  const preserved = preservePreviousArrays(finalOut, previousOut);
  if (Object.keys(preserved).length) {
    fs.writeFileSync(TARGET_JSON, JSON.stringify(finalOut, null, 2) + '\n', 'utf8');
    finalOut = JSON.parse(fs.readFileSync(TARGET_JSON, 'utf8'));
  }
  const stat = fs.statSync(TARGET_JSON);

  console.log('[export] written → ' + TARGET_JSON);
  if (Object.keys(preserved).length) {
    console.log('[export] preserved arrays: ' + Object.keys(preserved).map(function (key) {
      return key + '=merged:' + preserved[key].merged + ',added:' + preserved[key].added.length;
    }).join(' '));
  }
  console.log('[export] size: ' + (stat.size / 1024).toFixed(1) + ' KB');
  console.log('[export] counts: chars=' + finalOut.characters.length
    + ' facs=' + finalOut.factions.length
    + ' parties=' + finalOut.parties.length
    + ' classes=' + finalOut.classes.length
    + ' vars=' + finalOut.variables.length
    + ' events=' + finalOut.events.length
    + ' rels=' + finalOut.relations.length
    + ' items=' + finalOut.items.length
    + ' rigid=' + finalOut.rigidHistoryEvents.length);
  process.exit(0);
}, 300);
