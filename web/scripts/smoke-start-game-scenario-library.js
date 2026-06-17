#!/usr/bin/env node
// smoke-start-game-scenario-library.js - Guards that Start Game shows every
// local scenario, including creator drafts returned from the reset editor.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const electronFile = path.join(ROOT, 'tm-electron.js');
const mainFile = path.resolve(ROOT, '..', 'main-impl.js');
const bridgeFile = path.join(ROOT, 'preview', 'scenario-editor-sandbox-bridge.js');

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  passed += 1;
}

assert(fs.existsSync(electronFile), 'desktop scenario bridge should exist');
assert(fs.existsSync(mainFile), 'Electron main process should exist');
assert(fs.existsSync(bridgeFile), 'formal scenario return bridge should exist');

const electronJs = fs.readFileSync(electronFile, 'utf8');
const mainJs = fs.readFileSync(mainFile, 'utf8');
const bridgeJs = fs.readFileSync(bridgeFile, 'utf8');

assert(!/files\s*=\s*files\.filter\(function\(f\)\{return f\.playable!==false;\}\);/.test(electronJs),
  'desktop Start Game must not hide incomplete or draft scenarios');
assert(!/if\s*\(!_isPlayableScenario\(scn\)\)/.test(electronJs),
  'desktop Start Game must not reject empty or incomplete scenarios before launch');
assert(/function _projectScenarioListItems\(/.test(electronJs),
  'desktop Start Game should merge P.scenarios into its visible scenario list');
assert(/desktopStartProjectScn/.test(electronJs),
  'desktop Start Game should be able to start a P.scenarios-only script');

assert(/id:\s*meta\.id/.test(mainJs),
  'list-scenarios IPC should expose each scenario file id for dedupe');
assert(/const id = data && data\.id/.test(mainJs),
  'scenario list metadata should read ids from JSON files');

assert(/global\.tianming\.saveScenario/.test(bridgeJs),
  'returned editor scenarios should persist to desktop scenario storage');

console.log('smoke-start-game-scenario-library OK: ' + passed + ' assertions');
