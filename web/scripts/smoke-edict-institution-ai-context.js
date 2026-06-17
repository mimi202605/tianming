#!/usr/bin/env node
// smoke-edict-institution-ai-context.js - dynamic institutions must appear in EdictParser AI context.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error('[assert] ' + msg);
}

function load(ctx, file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

const WENSHU = '\u6587\u4e66\u53f8';
const QUEHUO = '\u69b7\u8d27\u53f8';
const YINGSHAN = '\u8425\u7f2e\u6240';
const OLD_MAZHENG = '\u65e7\u9a6c\u653f\u76d1';

const ctx = {
  console,
  Date, JSON, Math,
  setTimeout: () => {},
  clearTimeout: () => {},
  GM: {
    turn: 120,
    _pendingMemorials: [],
    _pendingClarifications: [],
    _abductions: [],
    dynamicInstitutions: [
      { name: WENSHU, rank: 5, stage: 'running', annualBudget: 50000, corruption: 18, effectiveness: 0.86, duties: '\u638c\u6587\u4e66\u6863\u6848' },
      { name: QUEHUO, rank: 5, stage: 'underfunded', annualBudget: 30000, corruption: 42, effectiveness: 0.52, duties: '\u7406\u94b1\u6cd5\u5546\u7a0e' },
      { name: YINGSHAN, rank: 6, stage: 'abolished', abolishedTurn: 118, annualBudget: 12000, duties: '\u4fee\u5bab\u57ce' },
      { name: OLD_MAZHENG, rank: 4, stage: 'abolished', abolishedTurn: 12, annualBudget: 70000, duties: '\u7ba1\u9a6c\u653f' }
    ]
  },
  P: {},
  addEB: () => {},
  toast: () => {},
  callAI: async () => null
};
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);

(function main() {
  load(ctx, 'tm-edict-parser.js');

  assert(ctx.EdictParser && typeof ctx.EdictParser.getAIContext === 'function', 'EdictParser.getAIContext should load');

  const aiContext = ctx.EdictParser.getAIContext();
  assert(/\u3010\u5236\u5ea6\u3011/.test(aiContext), 'AI context should include dynamic institution heading');
  assert(aiContext.includes(WENSHU), 'AI context should include running institution name');
  assert(aiContext.includes(QUEHUO), 'AI context should include underfunded institution name');
  assert(/\u6b20\u8d39|\u7f3a\u6b3e|\u7ecf\u8d39/.test(aiContext), 'AI context should expose underfunded state');
  assert(aiContext.includes(YINGSHAN), 'AI context should include recently abolished institution');
  assert(!aiContext.includes(OLD_MAZHENG), 'AI context should omit very old abolished institution noise');

  console.log('[smoke-edict-institution-ai-context] PASS institution lifecycle AI context');
})();
