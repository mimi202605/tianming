#!/usr/bin/env node
// Official scenario single-source guard.
// The root scenarios/*（官方）.json files are the only truth source. This smoke
// checks the compatibility entrypoint and the generated Electron seeder against
// the unified synchronizer without reintroducing an independent serializer.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const syncer = require('./sync-official-scenarios.js');
const compatibilityBuilder = require('./rebuild-official-scenario-bundle.js');

let assertions = 0;
function ok(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
}

ok(typeof compatibilityBuilder.build === 'function',
  'compatibility entrypoint must expose build()');
ok(compatibilityBuilder.ENTRIES === syncer.ENTRIES,
  'compatibility entrypoint must reuse the unified source registry');
ok(!Object.prototype.hasOwnProperty.call(compatibilityBuilder, 'serialize'),
  'compatibility entrypoint must not own a second serializer');

const built = syncer.buildArtifacts();
ok(Array.isArray(built.entries) && built.entries.length === syncer.ENTRIES.length,
  'unified build must include every registered official scenario');

const out = path.join(syncer.WEB_ROOT, 'tm-official-scenario-bundle.js');
const expected = built.files.get(out);
const current = fs.readFileSync(out, 'utf8');
ok(typeof expected === 'string' && current === expected,
  'Electron seeder must be byte-identical to the unified root-JSON artifact');
ok(current.indexOf('// GENERATED FILE.') === 0,
  'Electron seeder must retain the generated-file marker');

const context = { window: null, globalThis: null };
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(current, context, { filename: out });
const bundle = context.TMOfficialScenarioBundle;
ok(Array.isArray(bundle) && bundle.length === built.entries.length,
  'Electron seeder must publish every official scenario');

built.entries.forEach((entry) => {
  const row = bundle.find((item) => item && item.data && item.data.id === entry.id);
  ok(!!row, entry.key + ' must exist in the Electron seeder');
  ok(row.filename === entry.filename.replace(/\.json$/i, ''),
    entry.key + ' must use the seeder filename without .json');
  ok(row.source === '../' + entry.sourceRel,
    entry.key + ' must point back to its root JSON truth source');
  ok(JSON.stringify(row.data) === JSON.stringify(entry.data),
    entry.key + ' seeder payload must structurally equal its root JSON');
});

console.log('smoke-official-bundle-parity PASS: ' + assertions
  + ' assertions, ' + built.entries.length + ' root-sourced scenarios');
