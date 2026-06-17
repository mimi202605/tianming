#!/usr/bin/env node
// smoke-editor-reset-inventory.js - Scenario editor reset inventory gate.
'use strict';

const path = require('path');
const fs = require('fs');
const {
  buildScenarioEditorResetInventory
} = require('./editor-reset-inventory.js');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  passed += 1;
}

const report = buildScenarioEditorResetInventory({ root: ROOT });

assert(report && typeof report === 'object', 'inventory report should be an object');
assert(report.officialScenario && report.officialScenario.id === 'sc-tianqi7-1627',
  'should inspect official Tianqi scenario');
assert(report.officialScenario.topLevelKeys >= 70,
  'official scenario should expose a rich top-level schema');
assert(report.officialScenario.counts.characters >= 150,
  'official scenario character count should be large enough to drive editor reset');
assert(report.officialScenario.counts.factions >= 20,
  'official scenario faction count should be large enough to drive editor reset');
assert(report.officialScenario.counts.adminHierarchyGroups >= 20,
  'official scenario adminHierarchy group count should be large enough');

assert(report.editor && report.editor.panelIds.length >= 25,
  'editor.html should expose existing editor panels');
assert(report.editor.scriptOrder.indexOf('editor-schema-adapter.js') <
  report.editor.scriptOrder.indexOf('editor.js'),
  'schema adapter should load before editor.js');
assert(report.editor.hiddenPanels.includes('timeline'),
  'inventory should detect hidden-but-existing timeline panel');
assert(report.editor.unreachablePanels.length === 0,
  'all existing editor panels should have a sidebar route');

assert(report.coverage && report.coverage.unmappedTopLevelKeys.length >= 1,
  'inventory should report unmapped official top-level keys');
assert(report.coverage.unmappedTopLevelKeys.includes('families'),
  'families should currently be reported as unmapped editor coverage');
assert(report.coverage.unmappedTopLevelKeys.includes('culturalWorks'),
  'culturalWorks should currently be reported as unmapped editor coverage');

assert(report.blueprint && Array.isArray(report.blueprint.modules),
  'inventory should include a reset blueprint module list');
assert(report.blueprint.modules.length >= 8,
  'reset blueprint should split the editor into enough domain modules');
assert(report.blueprint.unassignedTopLevelKeys.length === 0,
  'reset blueprint should assign every official top-level key to a future module');
assert(report.blueprint.modules.some((mod) =>
  mod.id === 'peopleLineages' &&
  mod.topLevelKeys.includes('families') &&
  mod.topLevelKeys.includes('traitDefinitions')),
  'peopleLineages blueprint should own families and trait definitions');
assert(report.blueprint.modules.some((mod) =>
  mod.id === 'scenarioOpening' &&
  mod.topLevelKeys.includes('opening') &&
  mod.topLevelKeys.includes('openingLetters')),
  'scenarioOpening blueprint should own opening and opening letters');
assert(report.blueprint.modules.some((mod) =>
  mod.id === 'courtInstitutions' &&
  mod.topLevelKeys.includes('tinyi') &&
  mod.topLevelKeys.includes('chaoyi')),
  'courtInstitutions blueprint should own tinyi and chaoyi court deliberation config');
assert(report.blueprint.nestedFieldGroups.character.groups.some((group) => group.id === 'familyKinship'),
  'character nested fields should include a family/kinship group');
assert(report.blueprint.nestedFieldGroups.character.groups.some((group) => group.id === 'aiPersona'),
  'character nested fields should include an AI persona group');
assert(report.blueprint.nestedFieldGroups.faction.groups.some((group) => group.id === 'npcStrategy'),
  'faction nested fields should include an NPC strategy group');
assert(report.blueprint.nestedFieldGroups.faction.groups.some((group) => group.id === 'succession'),
  'faction nested fields should include a succession group');

const editorFullgen = fs.readFileSync(path.join(ROOT, 'editor-fullgen.js'), 'utf8');
const editorCore = fs.readFileSync(path.join(ROOT, 'editor-core.js'), 'utf8');
assert(editorFullgen.indexOf('saveScenario(fname, scriptData)') === -1,
  'desktop save paths should not persist raw scriptData directly');
assert(!report.risks.some((r) => r.id === 'desktop-autosave-raw-scriptData'),
  'inventory should not flag raw scriptData desktop autosave after save unification');
assert(editorCore.indexOf("getElementById('map-editor-link')") === -1,
  'editor-core should not attach a second map-editor-link handler');
assert(!report.risks.some((r) => r.id === 'map-editor-link-split-brain'),
  'inventory should not flag map editor link split-brain after standalone-link cleanup');
assert(!report.risks.some((r) => r.id === 'stale-rendered-admin-dom'),
  'editor.html should keep administration panels as empty renderer-owned mounts');

console.log('smoke-editor-reset-inventory OK: ' + passed + ' assertions');
