#!/usr/bin/env node
// smoke-phase6-strict-schema.js — Phase 6·OpenAI json_schema strict 锚
// 用·锁 _buildSc1JsonSchema / _selectResponseFormat / SC1 strict fallback

'use strict';

const fs = require('fs');
const path = require('path');
const { readSource, makeAssert } = require('./smoke-endturn-baseline-helpers');

const ROOT = path.resolve(__dirname, '..');
const passed = { value: 0 };
const assert = makeAssert(passed);

const src = readSource();

// ─── Schema builders ───
['_buildSc1JsonSchema', '_buildSc1bJsonSchema', '_buildSc1cJsonSchema', '_buildSc1qJsonSchema'].forEach(function(fn) {
  assert(new RegExp('function\\s+' + fn + '\\s*\\(').test(src),
    fn + ' 存在');
});

// ─── _selectResponseFormat ───
assert(/function\s+_selectResponseFormat\s*\(\s*modelFamily,\s*schemaBuilder\s*\)/.test(src),
  '_selectResponseFormat(modelFamily, schemaBuilder) 签名');
assert(/P\.ai\s*&&\s*P\.ai\.openaiStrict\s*===\s*true/.test(src),
  'P.ai.openaiStrict 开关·默认 OFF·=== true 才开');
assert(/type:\s*'json_schema'/.test(src),
  'strict response_format type=json_schema');
assert(/type:\s*'json_object'/.test(src),
  'fallback type=json_object 仍存');

// ─── strict 字段定义 ───
assert(/strict:\s*true/.test(src),
  'json_schema strict:true');
assert(/additionalProperties:\s*true/.test(src),
  'additionalProperties:true·宽松字段防 prompt-schema 失配');

// ─── 关键字段在 sc1 schema 中 ───
['turn_summary', 'shizhengji', 'events', 'char_updates', 'edict_feedback', 'fiscal_adjustments', 'dialogue_commitment_feedback', 'faction_relation_shift', 'economic_advice'].forEach(function(f) {
  assert(new RegExp('\\b' + f + ':\\s*\\{').test(src),
    'sc1 schema 含 ' + f);
});

// ─── SC1 strict 失败 fallback ───
assert(/strict json_schema 失败·fallback to json_object/.test(src),
  'SC1 strict fallback 路径');
assert(/_sc1StrictFallback\s*=\s*true/.test(src),
  'strict fallback 写诊断 _sc1StrictFallback');

// ─── 替代旧 response_format = { type: 'json_object' } 硬编码 ───
assert(/_selectResponseFormat\(_modelFamily, _buildSc1JsonSchema\)/.test(src),
  'SC1 用 _selectResponseFormat');
assert(/_selectResponseFormat\(_modelFamily, _buildSc1qJsonSchema\)/.test(src),
  'sc1q 用 _selectResponseFormat');
assert(/_selectResponseFormat\(_modelFamily, _buildSc1bJsonSchema\)/.test(src),
  'sc1b 用 _selectResponseFormat');
assert(/_selectResponseFormat\(_modelFamily, _buildSc1cJsonSchema\)/.test(src),
  'sc1c 用 _selectResponseFormat');

console.log('[smoke-phase6-strict-schema] pass assertions=' + passed.value);
