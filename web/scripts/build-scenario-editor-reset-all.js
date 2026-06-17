#!/usr/bin/env node
// build-scenario-editor-reset-all.js — single command that refreshes every
// generated editor artifact downstream of the official scenario JSONs:
//   1. preview/scenario-editor-reset-data.js (baked baseline + blueprint)
//   2. preview/official-scenarios-bundle.js (in-memory loader for both
//      official scenarios)
// Run this whenever a scenario file changes. The combined runner keeps the
// two artifacts in sync so a creator never sees one updated while the other
// reflects yesterday's data.
'use strict';

const path = require('path');

const buildData = require('./build-scenario-editor-reset-data.js');
const buildBundle = require('./build-official-scenarios-bundle.js');

function main() {
  console.log('[build-scenario-editor-reset-all] refreshing baked data');
  // build-scenario-editor-reset-data exports buildPayload but not the actual
  // file-write main(); to keep this script independent of the internal API,
  // re-invoke the CLI module via node so its main() executes.
  require('./build-scenario-editor-reset-data.js'); // module load registers exports
  // Re-require with a fresh main() execution: the simplest cross-version
  // approach is to call the buildPayload + write inline.
  rewriteData();

  console.log('[build-scenario-editor-reset-all] refreshing official bundle');
  buildBundle.build();

  console.log('[build-scenario-editor-reset-all] done');
}

function rewriteData() {
  const fs = require('fs');
  const ROOT = path.resolve(__dirname, '..');
  const OUT = path.join(ROOT, 'preview', 'scenario-editor-reset-data.js');
  const payload = buildData.buildPayload();
  const js = [
    '/* GENERATED FILE. Run `node web/scripts/build-scenario-editor-reset-all.js` to refresh both this baked baseline and the official scenarios bundle. */',
    '(function(global){',
    '  global.TM_SCENARIO_EDITOR_RESET_DATA = ' + JSON.stringify(payload, null, 2) + ';',
    '})(typeof window !== "undefined" ? window : globalThis);',
    ''
  ].join('\n');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, js, 'utf8');
  console.log('[build-scenario-editor-reset-all] wrote ' + path.relative(ROOT, OUT));
  console.log('[build-scenario-editor-reset-all] scenario=' + payload.summary.name +
    ' keys=' + payload.summary.topLevelKeys +
    ' blueprint-covers=' + payload.blueprint.assignedTopLevelKeys.length);
}

if (require.main === module) main();

module.exports = { main, rewriteData };
