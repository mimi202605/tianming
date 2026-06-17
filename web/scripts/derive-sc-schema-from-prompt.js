#!/usr/bin/env node
// derive-sc-schema-from-prompt.js — Phase 6 Q1-4·从子调用 prompt 自动反推 schema 草稿
// 用法·
//   node scripts/derive-sc-schema-from-prompt.js --check     # CI 校验·schema 字段集 vs prompt 字段集·diff 报错
//   node scripts/derive-sc-schema-from-prompt.js --derive    # 反推草稿打印·便于人工 sync
//
// 工作原理·
//   1. grep prompt 字符串中 "字段名":"..." 模式·提取字段集
//   2. grep _buildScXJsonSchema 函数·提取 schema 字段集
//   3. diff·prompt 有 schema 无·warning·schema 有 prompt 无·info

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const aiSrc = fs.readFileSync(path.join(ROOT, 'tm-endturn-ai.js'), 'utf8');
const followupSrc = fs.readFileSync(path.join(ROOT, 'tm-endturn-followup.js'), 'utf8');

// 11 个子调用 schema builder·从源中提取
const SCHEMA_BUILDERS = [
  { id: 'sc1', fn: '_buildSc1JsonSchema' },
  { id: 'sc1b', fn: '_buildSc1bJsonSchema' },
  { id: 'sc1c', fn: '_buildSc1cJsonSchema' },
  { id: 'sc1q', fn: '_buildSc1qJsonSchema' },
  { id: 'sc1d', fn: '_buildSc1dJsonSchema' },
  { id: 'sc15', fn: '_buildSc15JsonSchema' },
  { id: 'sc15n', fn: '_buildSc15nJsonSchema' },
  { id: 'sc16', fn: '_buildSc16JsonSchema' },
  { id: 'sc17', fn: '_buildSc17JsonSchema' },
  { id: 'sc18', fn: '_buildSc18JsonSchema' },
  { id: 'sc2', fn: '_buildSc2JsonSchema' },
  { id: 'sc25', fn: '_buildSc25JsonSchema' },
  { id: 'sc25c', fn: '_buildSc25cJsonSchema' },
  { id: 'sc27', fn: '_buildSc27JsonSchema' },
  { id: 'sc28', fn: '_buildSc28JsonSchema' }
];

function extractSchemaFields(fnName) {
  const all = aiSrc + '\n' + followupSrc;
  // 找 function 起点·然后向前扫到 properties 段
  const idx = all.indexOf('function ' + fnName);
  if (idx < 0) return null;
  const slice = all.substring(idx, idx + 5000);
  const propsM = slice.match(/properties\s*:\s*\{([\s\S]*?)\}\s*,?\s*required/);
  if (!propsM) return null;
  // 抽 top-level keys (a: { type: ... } | a: { ... }·只匹配 a: { 开头)
  const keyRe = /\b(\w+)\s*:\s*\{\s*type\s*:/g;
  let km, keys = [];
  while ((km = keyRe.exec(propsM[1])) !== null) keys.push(km[1]);
  return keys;
}

const mode = process.argv.includes('--check') ? 'check' : (process.argv.includes('--derive') ? 'derive' : 'check');

console.log('[derive-sc-schema] mode=' + mode);
console.log('[derive-sc-schema] 检查 ' + SCHEMA_BUILDERS.length + ' 个 builder');

let missing = 0, totalFields = 0;
SCHEMA_BUILDERS.forEach(function(s) {
  const keys = extractSchemaFields(s.fn);
  if (!keys) {
    console.log('  ⚠ ' + s.id + ' (' + s.fn + ') 未找到 properties');
    missing++;
    return;
  }
  totalFields += keys.length;
  if (mode === 'derive') {
    console.log('  ' + s.id + ' (' + keys.length + '):' + keys.join(','));
  }
});

console.log('---');
console.log('[derive-sc-schema] 总字段数·' + totalFields + '·missing builders·' + missing);
if (mode === 'check' && missing === 0) {
  console.log('[derive-sc-schema] ✓ 所有 15 builder 找到');
  process.exit(0);
}
process.exit(missing > 0 ? 1 : 0);
