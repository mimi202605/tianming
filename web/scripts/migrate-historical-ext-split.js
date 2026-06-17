#!/usr/bin/env node
// scripts/migrate-historical-ext-split.js — Phase 2 one-time
//
// Split tm-char-historical-profiles-ext.js (10,298 行) by 12 波 → 12 独立文件
//
// Strategy:
//   - read source·extract each wave content (内 entries·skip header `// ═══ 波 N ═══` separator)
//   - wrap each in IIFE + Object.assign HISTORICAL_CHAR_PROFILES
//   - write 12 files·tm-char-historical-wave-NN.js
//
// Does NOT touch index.html / delete source·留给手动 / 下个 round
//
// Usage·node scripts/migrate-historical-ext-split.js

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'tm-char-historical-profiles-ext.js');

const content = fs.readFileSync(SOURCE, 'utf8');
const lines = content.split('\n');

// 12 wave boundaries (1-indexed inclusive·only entry lines·skip header separator + blank)
const WAVES = [
  { wave: 1,  name: '§1-§8 朝代 (周/汉/三国/两晋南北朝/隋唐/宋/明/清)', start: 31,   end: 1373 },
  { wave: 2,  name: '波 2·春秋战国-清·名相名将名儒',                      start: 1379, end: 2389 },
  { wave: 3,  name: '波 3·春秋-清·名臣武将谋士',                           start: 2395, end: 3361 },
  { wave: 4,  name: '波 4',                                                  start: 3367, end: 4245 },
  { wave: 5,  name: '波 5',                                                  start: 4251, end: 5063 },
  { wave: 6,  name: '波 6',                                                  start: 5069, end: 5859 },
  { wave: 7,  name: '波 7',                                                  start: 5865, end: 6501 },
  { wave: 8,  name: '波 8',                                                  start: 6507, end: 7341 },
  { wave: 9,  name: '波 9',                                                  start: 7347, end: 8005 },
  { wave: 10, name: '波 10',                                                 start: 8011, end: 8801 },
  { wave: 11, name: '波 11',                                                 start: 8807, end: 9597 },
  { wave: 12, name: '波 12·收官·补遗·冲刺 500',                             start: 9603, end: 10290 }
];

WAVES.forEach(w => {
  const segLines = lines.slice(w.start - 1, w.end);
  const segContent = segLines.join('\n');
  const fileName = `tm-char-historical-wave-${String(w.wave).padStart(2,'0')}.js`;
  const fileContent = `// @ts-check
/// <reference path="types.d.ts" />
// ============================================================
// Module: ${fileName}
// Domain: NPC / 历史人物 data
// 来源·${w.name}
// (Phase 2 split·from tm-char-historical-profiles-ext.js·12 waves)
//
// Owns:
//   - 本波历史人物数据 (与其他 wave + base 共用 HISTORICAL_CHAR_PROFILES)
// Does not own:
//   - 角色 schema (→ tm-char-full-schema.js)
//   - autogen (→ tm-char-autogen.js)
//   - base 27 条 (→ tm-char-historical-profiles.js)
// Public API:
//   - HISTORICAL_CHAR_PROFILES (global·via Object.assign)
// Depends on:
//   - global HISTORICAL_CHAR_PROFILES (initialized by tm-char-historical-profiles.js)
// Used by:
//   - tm-npc-engine / tm-char-autogen / tm-char-historical-profiles consumers
// Tests:
//   - official-scenario-smoke / verify-all
// Refactor notes:
//   - Phase 2 split done·原 tm-char-historical-profiles-ext.js (10298) → 12 wave 文件
//   - Phase 5 namespace·TM.Char.Historical
// ============================================================

(function(global){
  'use strict';
  if (!global.HISTORICAL_CHAR_PROFILES) {
    global.HISTORICAL_CHAR_PROFILES = {};
  }
  var WAVE_PROFILES = {
${segContent}
  };
  Object.assign(global.HISTORICAL_CHAR_PROFILES, WAVE_PROFILES);
  console.log('[historical-wave-${String(w.wave).padStart(2,'0')}] 加载 ' + Object.keys(WAVE_PROFILES).length + ' 条');
})(typeof window !== 'undefined' ? window : globalThis);
`;
  fs.writeFileSync(path.join(ROOT, fileName), fileContent);
  console.log('written: ' + fileName + ' (' + segLines.length + ' content lines)');
});

console.log('');
console.log('done·12 wave files written');
console.log('next: update index.html script tags·delete original·verify-all');
