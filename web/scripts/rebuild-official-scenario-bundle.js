#!/usr/bin/env node
// rebuild-official-scenario-bundle.js — 剧本单一真源：从 scenarios/*（官方）.json 全量重建
// 桌面端 seeder 用的预烤 bundle web/tm-official-scenario-bundle.js（window.TMOfficialScenarioBundle）。
//
// 单一真源 = scenarios/ 下的官方 JSON。任何官方剧本改动后跑本脚本重烤 bundle，
// 保证 seeder（tm-official-scenario-seeder.js）落地桌面端的数据与源剧本逐字节一致。
// 幂等·纯函数式·无网络无 SSH。
//
// 注意：勿与 web/preview/official-scenarios-bundle.js（window.TM_OFFICIAL_SCENARIOS·另一份·
//       由 build-official-scenarios-bundle.js 生成）混淆——那是编辑器 reset 预览的同步 fallback，
//       全局名 / 结构（{tianqi7, shaosong} map 而非 [{filename,source,data}] 数组）/ 消费方都不同。
//
// 输出：web/tm-official-scenario-bundle.js
// 全局：window.TMOfficialScenarioBundle = [{ filename, source, data }, ...]
//   filename = 剧本名（不含 .json）·seeder 按 filename 匹配 tianming.listScenarios() 结果
//   source   = ../scenarios/<filename>.json（provenance·标注数据来源）
//   data     = JSON.parse(源文件)·即整份剧本对象（seeder 取 found.data 存盘）
//
// 序列化外壳与在树 bundle / patch-official-scenarios-armory.js 逐字节一致（见 serialize()）。
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');                 // web/
const SCENARIO_DIR = path.resolve(ROOT, '..', 'scenarios'); // tianming/scenarios/
const OUT = path.join(ROOT, 'tm-official-scenario-bundle.js');

// 顺序即 bundle 内条目顺序·须与在树 bundle 一致（天启 → 绍宋）。
const ENTRIES = [
  { filename: '天启七年·九月（官方）' },
  { filename: '绍宋·建炎元年八月（官方）' }
];

// 从各官方 JSON 源全量构建 [{filename, source, data}] 数组（键序 filename→source→data·不可乱）。
function buildBundleArray() {
  return ENTRIES.map(function (entry) {
    const source = '../scenarios/' + entry.filename + '.json';
    const full = path.join(SCENARIO_DIR, entry.filename + '.json');
    const raw = fs.readFileSync(full, 'utf8');
    const data = JSON.parse(raw); // 非法 JSON 直接抛·不产出半成品 bundle
    return { filename: entry.filename, source: source, data: data };
  });
}

// 与在树 bundle 逐字节一致的序列化外壳（模板同 patch-official-scenarios-armory.js）。
// 传入 arr 复用已构建数组·省一次读盘；不传则现构建。
function serialize(arr) {
  const bundle = arr || buildBundleArray();
  return '// GENERATED FILE. Source: ../scenarios official JSON files.\n'
    + '(function(global){\n'
    + '  global.TMOfficialScenarioBundle = ' + JSON.stringify(bundle) + ';\n'
    + '})(window);\n';
}

function build() {
  const arr = buildBundleArray();
  const out = serialize(arr);
  fs.writeFileSync(OUT, out, 'utf8');
  const stats = arr.map(function (e) {
    const d = e.data || {};
    return e.filename + ' → id=' + (d.id || '?')
      + ' chars=' + (Array.isArray(d.characters) ? d.characters.length : 0);
  }).join(' · ');
  console.log('[rebuild-official-scenario-bundle] wrote ' + path.relative(ROOT, OUT) + ' (' + Buffer.byteLength(out, 'utf8') + ' bytes)');
  console.log('[rebuild-official-scenario-bundle] ' + stats);
}

if (require.main === module) build();

module.exports = { ENTRIES: ENTRIES, ROOT: ROOT, SCENARIO_DIR: SCENARIO_DIR, OUT: OUT, buildBundleArray: buildBundleArray, serialize: serialize, build: build };
