#!/usr/bin/env node
// build-official-scenarios-bundle.js — bake the official scenario JSON files
// into a single window-global JS bundle that the scenario-editor reset preview
// can read synchronously. This is the fallback path for `loadOfficialScenario`
// in environments where fetching `file://../scenarios/<name>` is blocked
// (Electron with webSecurity on, or static-hosted preview without same-origin).
//
// Output: preview/official-scenarios-bundle.js
// Exposes: window.TM_OFFICIAL_SCENARIOS = { tianqi7: <scenario>, shaosong: <scenario> }
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'preview', 'official-scenarios-bundle.js');
const SCENARIO_DIR = path.resolve(ROOT, '..', 'scenarios');

const ENTRIES = [
  { id: 'tianqi7', filename: '天启七年·九月（官方）.json' },
  { id: 'shaosong', filename: '绍宋·建炎元年八月（官方）.json' }
];

function readScenario(filename) {
  const full = path.join(SCENARIO_DIR, filename);
  const raw = fs.readFileSync(full, 'utf8');
  return JSON.parse(raw);
}

function build() {
  const bundle = {};
  ENTRIES.forEach((entry) => {
    bundle[entry.id] = readScenario(entry.filename);
  });
  const js = [
    '/* GENERATED FILE. Run `node web/scripts/build-official-scenarios-bundle.js` after updating any official scenario. */',
    '(function(global){',
    '  global.TM_OFFICIAL_SCENARIOS = ' + JSON.stringify(bundle) + ';',
    '})(typeof window !== "undefined" ? window : globalThis);',
    ''
  ].join('\n');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, js, 'utf8');
  const stats = ENTRIES.map((entry) => {
    const sc = bundle[entry.id];
    return entry.id + '=' + (sc.name || sc.id || '?') + ' chars=' + (Array.isArray(sc.characters) ? sc.characters.length : 0);
  }).join(' · ');
  console.log('[build-official-scenarios-bundle] wrote ' + path.relative(ROOT, OUT));
  console.log('[build-official-scenarios-bundle] ' + stats);
}

if (require.main === module) build();

module.exports = { build };
