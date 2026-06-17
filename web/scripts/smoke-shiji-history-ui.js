#!/usr/bin/env node
// smoke-shiji-history-ui.js - guard the chronicle archive list and old-record fallback rendering.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  passed++;
}

function load(ctx, rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(src, ctx, { filename: rel });
}

const elements = {
  'shiji-list': { innerHTML: '' }
};
let modalHtml = '';

const history = [];
for (let i = 1; i <= 18; i++) {
  history.push({
    turn: i,
    time: '天启七年' + i + '月',
    shilu: '第' + i + '回完整实录：史官备书本回朝政军国细节，旧档亦须可读。',
    shizhengji: '第' + i + '回时政记：臣工奏对与地方情势皆入档。',
    zhengwen: '第' + i + '回政文长文。',
    szjTitle: '第' + i + '回纪要',
    turnSummary: '第' + i + '回总曰'
  });
}
delete history[0].html;

const ctx = {
  console,
  window: null,
  document: {
    createElement() { return { click() {}, set href(v) {}, set download(v) {} }; }
  },
  navigator: {},
  GM: { shijiHistory: history, saveName: 'smoke' },
  P: { time: { year: 1627 } },
  _$: function(id) { return elements[id] || null; },
  escHtml: function(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
  toast: function(){},
  showTurnResult: function(html) { modalHtml = html || ''; },
  calcDateFromTurn: function(turn) { return { adYear: 1627 + Math.floor((turn - 1) / 12) }; },
  _getDaysPerTurn: function() { return 30; }
};
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);

load(ctx, 'tm-shiji-qiju-ui.js');
ctx.renderShijiList();

const html = elements['shiji-list'].innerHTML;
assert((html.match(/class="sj-card/g) || []).length === 18,
  'default shiji archive page should show all 18 saved turns, not only the newest page slice');
assert(html.indexOf('第18回完整实录') >= 0 && html.indexOf('第1回完整实录') >= 0,
  'archive list should surface shilu text from both newest and oldest records');
assert(typeof ctx._sjlRecordHtmlByIdx === 'function',
  'archive UI should expose old-record HTML reconstruction helper');

const oldHtml = ctx._sjlRecordHtmlByIdx(0);
assert(oldHtml.indexOf('第1回完整实录') >= 0 && oldHtml.indexOf('第1回时政记') >= 0,
  'old records without stored html should reconstruct readable shilu and shizhengji content');

vm.runInContext("showTurnResult(_sjlRecordHtmlByIdx(0), 0)", ctx);
assert(modalHtml.indexOf('第1回完整实录') >= 0,
  'click path should pass reconstructed archive content into the turn-result modal');

console.log('[smoke-shiji-history-ui] PASS ' + passed + ' assertions');
