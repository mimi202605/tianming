#!/usr/bin/env node
// 第二钻:gameState 内部 key 体积 + pretty-print 开销 + parse/stringify 实测耗时
'use strict';
const fs = require('fs');
const os = require('os');

const file = process.argv[2] || (os.homedir() + '\\AppData\\Roaming\\tianming\\saves\\__autosave__.json');
const raw = fs.readFileSync(file, 'utf8');
let t0 = Date.now();
const data = JSON.parse(raw);
const parseMs = Date.now() - t0;

t0 = Date.now();
const compact = JSON.stringify(data);
const compactMs = Date.now() - t0;

t0 = Date.now();
const pretty = JSON.stringify(data, null, 2);
const prettyMs = Date.now() - t0;

console.log('file chars:', raw.length, '≈' + (raw.length / 1048576).toFixed(1) + 'MB');
console.log('compact chars:', compact.length, '≈' + (compact.length / 1048576).toFixed(1) + 'MB', '(stringify ' + compactMs + 'ms)');
console.log('pretty chars:', pretty.length, '≈' + (pretty.length / 1048576).toFixed(1) + 'MB', '(stringify ' + prettyMs + 'ms)');
console.log('JSON.parse:', parseMs + 'ms');
console.log('缩进开销:', ((pretty.length - compact.length) / 1048576).toFixed(1) + 'MB', '=', (100 * (pretty.length - compact.length) / pretty.length).toFixed(0) + '% of file');

function strSize(v) { try { const s = JSON.stringify(v); return s ? s.length : 0; } catch (e) { return -1; } }

const gs = data.gameState || {};
console.log('\n== gameState 内部 key 体积 (top 50) ==');
Object.keys(gs).map(k => ({ k, n: strSize(gs[k]) })).sort((a, b) => b.n - a.n).slice(0, 50)
  .forEach(t => console.log(String(t.n).padStart(10), (t.n / 1048576).toFixed(2).padStart(8) + 'MB', t.k));

const spa = gs._socialPoliticalSignalApplications;
if (spa) {
  console.log('\n_socialPoliticalSignalApplications: len=' + spa.length, (strSize(spa) / 1048576).toFixed(2) + 'MB');
  spa.forEach((x, i) => console.log('  [' + i + ']', (strSize(x) / 1048576).toFixed(2) + 'MB', 'turn=' + (x && x.turn), 'keys=' + (x ? Object.keys(x).join(',') : '')));
}
const known = ['_turnReport', '_convArchive', 'jishiRecords', 'qijuHistory', 'shijiHistory', '_historyIndex', '_memTables', '_endturnTimingLedger', 'turnAiResults', '_aiMemory', '_facIndex', '_partyClassActionSchedulerLastRun', 'memoryTrace', '_memoryTrace'];
console.log('\n== gameState 嫌疑点名 ==');
for (const k of known) {
  const v = gs[k];
  if (v == null) { console.log(k, ': (无)'); continue; }
  if (Array.isArray(v)) console.log(k, ': len=' + v.length, (strSize(v) / 1048576).toFixed(2) + 'MB');
  else if (typeof v === 'object') console.log(k, ': keys=' + Object.keys(v).length, (strSize(v) / 1048576).toFixed(2) + 'MB');
  else console.log(k, ':', typeof v);
}
console.log('\ndone');
