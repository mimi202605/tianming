#!/usr/bin/env node
// build-scenario-editor-reset-data.js - Build standalone data for the new scenario editor prototype.
'use strict';

const fs = require('fs');
const path = require('path');
const {
  buildScenarioEditorResetInventory,
  loadOfficialScenario,
  RESET_BLUEPRINT_MODULES
} = require('./editor-reset-inventory.js');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'preview', 'scenario-editor-reset-data.js');
const SCENARIO_DIR = path.resolve(ROOT, '..', 'scenarios');
// Sibling official scenarios to widen the blueprint's key universe. The
// inventory function itself stays single-scenario (天启) so existing smokes
// keep their semantics, but the baked blueprint should cover every key both
// shipped scenarios actually use — otherwise loading 绍宋 leaves 21 of its
// top-level keys (engineConstants, _adaptation, chronicleConfig, ...) absent
// from module navigation and only rescued by the runtime orphan absorber.
const COMPANION_SCENARIO_FILES = [
  '绍宋·建炎元年八月（官方）.json'
];

function stableClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function collectScenarioKeyUniverse(primaryScenario) {
  const keys = new Set(Object.keys(primaryScenario || {}));
  COMPANION_SCENARIO_FILES.forEach((name) => {
    const full = path.join(SCENARIO_DIR, name);
    if (!fs.existsSync(full)) return;
    try {
      const data = JSON.parse(fs.readFileSync(full, 'utf8'));
      Object.keys(data || {}).forEach((k) => keys.add(k));
    } catch (err) {
      console.warn('[build-scenario-editor-reset-data] failed to widen with ' + name + ': ' + err.message);
    }
  });
  return keys;
}

function widenBlueprint(blueprint, keyUniverse) {
  // Re-derive each module's topLevelKeys from RESET_BLUEPRINT_MODULES,
  // filtering against the wider key universe. This restores any blueprint
  // entries that were dropped because the source scenario didn't ship them.
  const assigned = new Set();
  const widenedModules = RESET_BLUEPRINT_MODULES.map((mod) => {
    const topLevelKeys = mod.topLevelKeys.filter((key) => keyUniverse.has(key));
    topLevelKeys.forEach((key) => assigned.add(key));
    const existing = blueprint.modules.find((m) => m.id === mod.id) || {};
    return Object.assign({}, existing, {
      id: mod.id,
      title: mod.title,
      topLevelKeys,
      topLevelCount: topLevelKeys.length
    });
  });
  const unassignedTopLevelKeys = Array.from(keyUniverse).filter((k) => !assigned.has(k)).sort();
  return Object.assign({}, blueprint, {
    modules: widenedModules,
    assignedTopLevelKeys: Array.from(assigned).sort(),
    unassignedTopLevelKeys,
    keyUniverseSize: keyUniverse.size
  });
}

function buildPayload() {
  const loaded = loadOfficialScenario(ROOT);
  const inventory = buildScenarioEditorResetInventory({ root: ROOT });
  const scenario = stableClone(loaded.scenario);
  const keyUniverse = collectScenarioKeyUniverse(scenario);
  const blueprint = widenBlueprint(inventory.blueprint, keyUniverse);
  return {
    builtAt: new Date().toISOString(),
    source: path.relative(path.resolve(ROOT, '..'), loaded.source).replace(/\\/g, '/'),
    summary: inventory.officialScenario,
    blueprint,
    scenario
  };
}

function main() {
  const payload = buildPayload();
  const js = [
    '/* GENERATED FILE. Run `node web/scripts/build-scenario-editor-reset-data.js` after updating the official scenario. */',
    '(function(global){',
    '  global.TM_SCENARIO_EDITOR_RESET_DATA = ' + JSON.stringify(payload, null, 2) + ';',
    '})(typeof window !== "undefined" ? window : globalThis);',
    ''
  ].join('\n');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, js, 'utf8');
  console.log('[build-scenario-editor-reset-data] wrote ' + path.relative(ROOT, OUT));
  console.log('[build-scenario-editor-reset-data] scenario=' + payload.summary.name +
    ' keys=' + payload.summary.topLevelKeys +
    ' blueprint-covers=' + payload.blueprint.assignedTopLevelKeys.length +
    ' chars=' + payload.summary.counts.characters +
    ' factions=' + payload.summary.counts.factions);
}

if (require.main === module) main();

module.exports = { buildPayload };
