#!/usr/bin/env node
// smoke-authority-variable-linkage-matrix.js - Seven-variable linkage matrix contract.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let assertions = 0;

function assert(cond, msg) {
  assertions++;
  if (!cond) {
    throw new Error(msg);
  }
}

function createContext() {
  const context = {
    console,
    Date,
    JSON,
    Math,
    RegExp,
    Error,
    Array,
    Object,
    String,
    Number,
    Boolean,
    parseInt,
    parseFloat,
    isFinite,
    isNaN,
    setTimeout() {},
    clearTimeout() {},
    document: {
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener() {},
      createElement: () => ({ style: {}, classList: { add() {}, remove() {} } }),
      body: {},
      head: {},
      readyState: 'complete'
    },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: { userAgent: 'node' },
    GM: {},
    P: {},
    scriptData: {},
    escHtml: v => String(v == null ? '' : v),
    toast() {},
    addEB() {},
    findScenarioById() { return null; },
    EventBus: { emit() {} },
    SettlementPipeline: { register() {} },
    EndTurnHooks: { register() {} },
    TM: { errors: { capture() {}, captureSilent() {} } }
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  return context;
}

function load(context, file) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
  vm.runInContext(code, context, { filename: file });
}

function byId(matrix, id) {
  return matrix.find(item => item.id === id);
}

function main() {
  const context = createContext();
  load(context, 'tm-authority-engines.js');
  const api = context.AuthorityEngines;
  assert(api, 'AuthorityEngines should export an API');
  assert(typeof api.getVariableLinkageMatrix === 'function', 'AuthorityEngines should export getVariableLinkageMatrix()');
  assert(typeof api.getVariableLinkageSummary === 'function', 'AuthorityEngines should export getVariableLinkageSummary()');

  const matrix = api.getVariableLinkageMatrix();
  const variables = ['guoku', 'neitang', 'population', 'corruption', 'minxin', 'huangquan', 'huangwei'];
  const statusSet = new Set(['implemented_default', 'implemented_gated', 'documented_gap']);
  const strengthSet = new Set(['strong', 'medium', 'weak']);
  const directionSet = new Set(['positive', 'negative', 'mixed', 'conditional']);
  const ids = new Set();

  assert(Array.isArray(matrix), 'matrix should be an array');
  assert(matrix.length === 42, `matrix should contain 42 directed links, got ${matrix.length}`);

  for (const link of matrix) {
    assert(link && typeof link === 'object', 'each link should be an object');
    assert(variables.includes(link.from), `unexpected from variable: ${link.from}`);
    assert(variables.includes(link.to), `unexpected to variable: ${link.to}`);
    assert(link.from !== link.to, `self link should not exist: ${link.id}`);
    assert(link.id === `${link.from}_to_${link.to}`, `id should be from_to_to: ${link.id}`);
    assert(!ids.has(link.id), `duplicate link id: ${link.id}`);
    assert(statusSet.has(link.status), `unexpected status for ${link.id}: ${link.status}`);
    assert(strengthSet.has(link.strength), `unexpected strength for ${link.id}: ${link.strength}`);
    assert(directionSet.has(link.direction), `unexpected direction for ${link.id}: ${link.direction}`);
    assert(typeof link.mechanism === 'string' && link.mechanism.length > 0, `missing mechanism for ${link.id}`);
    ids.add(link.id);
  }

  for (const from of variables) {
    for (const to of variables) {
      if (from === to) continue;
      assert(ids.has(`${from}_to_${to}`), `missing directed link ${from}->${to}`);
    }
  }

  assert(byId(matrix, 'guoku_to_neitang').status === 'implemented_default', 'guoku->neitang should be default implemented');
  assert(byId(matrix, 'corruption_to_huangquan').status === 'implemented_gated', 'corruption->huangquan should be gated implemented');
  assert(byId(matrix, 'huangwei_to_huangquan').status === 'implemented_gated', 'huangwei->huangquan should be gated implemented');
  assert(byId(matrix, 'corruption_to_population').status === 'implemented_default', 'corruption->population should be default implemented');
  assert(byId(matrix, 'population_to_corruption').status === 'implemented_default', 'population->corruption should be default implemented');
  assert(byId(matrix, 'minxin_to_corruption').status === 'implemented_default', 'minxin->corruption should be default implemented');
  assert(byId(matrix, 'huangquan_to_guoku').status === 'implemented_default', 'huangquan->guoku should be default implemented');
  assert(byId(matrix, 'huangquan_to_population').status === 'implemented_default', 'huangquan->population should be default implemented');
  assert(byId(matrix, 'neitang_to_minxin').status === 'documented_gap', 'neitang->minxin should be documented as a gap');
  assert(byId(matrix, 'population_to_huangquan').status === 'documented_gap', 'population->huangquan should be documented as a gap');
  assert(byId(matrix, 'huangquan_to_neitang').status === 'documented_gap', 'huangquan->neitang should be documented as a gap');

  const clone = api.getVariableLinkageMatrix();
  clone[0].status = 'mutated';
  assert(api.getVariableLinkageMatrix()[0].status !== 'mutated', 'matrix export should return defensive copies');

  const summary = api.getVariableLinkageSummary();
  const statusTotal = Object.values(summary.byStatus).reduce((sum, n) => sum + n, 0);
  assert(summary.total === 42, `summary total should be 42, got ${summary.total}`);
  assert(statusTotal === 42, `summary byStatus should add to 42, got ${statusTotal}`);
  assert(summary.byStatus.implemented_default > 0, 'summary should include default implemented links');
  assert(summary.byStatus.implemented_gated > 0, 'summary should include gated implemented links');
  assert(summary.byStatus.documented_gap > 0, 'summary should include documented gaps');
  assert(Array.isArray(summary.variables) && summary.variables.length === 7, 'summary should include seven variables');

  console.log(`[smoke-authority-variable-linkage-matrix] PASS assertions=${assertions}`);
}

main();
