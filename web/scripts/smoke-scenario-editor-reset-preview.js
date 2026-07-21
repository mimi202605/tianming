#!/usr/bin/env node
// smoke-scenario-editor-reset-preview.js - Preview shell gate for scenario editor reset UI.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const file = path.join(ROOT, 'preview', 'scenario-editor-reset-preview.html');
const dataFile = path.join(ROOT, 'preview', 'scenario-editor-reset-data.js');
const appFile = path.join(ROOT, 'preview', 'scenario-editor-reset-app.js');
const bridgeFile = path.join(ROOT, 'preview', 'scenario-editor-sandbox-bridge.js');
const adaptersFile = path.join(ROOT, 'preview', 'scenario-editor-reset-adapters.js');
const indexFile = path.join(ROOT, 'index.html');
const launchFile = path.join(ROOT, 'tm-launch.js');
const officeEditorFile = path.join(ROOT, 'tm-office-editor.js');
let passed = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  passed += 1;
}

assert(fs.existsSync(file), 'scenario editor reset preview html should exist');
assert(fs.existsSync(dataFile), 'scenario editor reset preview data should exist');
assert(fs.existsSync(appFile), 'scenario editor reset preview app script should exist');
assert(fs.existsSync(bridgeFile), 'scenario editor formal sandbox bridge should exist');
assert(fs.existsSync(adaptersFile), 'scenario editor runtime adapters should exist');

/* R1 架构整备(2026-07-03)：CSS 已外提 scenario-editor-reset-style.css——此 smoke 的
   2000+ 断言历史语义=『整页(内联时代)包含…』·故 html 取 html+css 合体·语义不变。 */
const html = fs.readFileSync(file, 'utf8') + fs.readFileSync(path.join(ROOT, 'preview', 'scenario-editor-reset-style.css'), 'utf8');
const dataJs = fs.readFileSync(dataFile, 'utf8');
const appJs = fs.readFileSync(appFile, 'utf8');
const bridgeJs = fs.readFileSync(bridgeFile, 'utf8');
const adaptersJs = fs.readFileSync(adaptersFile, 'utf8');
const indexHtml = fs.readFileSync(indexFile, 'utf8');
const launchJs = fs.readFileSync(launchFile, 'utf8');
const officeEditorJs = fs.readFileSync(officeEditorFile, 'utf8');

function runtimeSurfaceLine(field) {
  const pattern = new RegExp("runtimeSurface\\('" + field + "',[^\\n]+\\)");
  const match = appJs.match(pattern);
  return match ? match[0] : '';
}

function assertRuntimeSurfacePanel(field, panel, msg) {
  assert(runtimeSurfaceLine(field).includes("'" + panel + "'"), msg);
}

const expectedModules = [
  'scenarioOpening',
  'peopleLineages',
  'factionsSociety',
  'courtInstitutions',
  'adminMap',
  'economyPopulation',
  'militaryFrontier',
  'eventsChronicle',
  'rulesAi'
];

expectedModules.forEach((id) => {
  assert(html.includes('data-module-id="' + id + '"'), 'preview should render module ' + id);
  assert(html.includes('data-ai-scope="' + id + '"'), 'preview should provide AI scope for module ' + id);
});

assert((html.match(/class="module-tile/g) || []).length === expectedModules.length,
  'preview should render exactly nine module tiles');
assert(html.includes('剧本健康总览'), 'preview should include scenario health overview');
assert(html.includes('data-health-card="field-coverage"'), 'preview should include field coverage health card');
assert(html.includes('data-health-card="inventory-risks"'), 'preview should include inventory risk health card');
assert(html.includes('data-health-card="legacy-gaps"'), 'preview should include legacy gap health card');
assert(html.includes('data-health-card="map-admin"'), 'preview should include map/admin health card');
assert(html.includes('families') && html.includes('openingLetters') && html.includes('traitDefinitions'),
  'preview should surface known current editor coverage gaps');
assert(html.includes('203') && html.includes('22') && html.includes('83'),
  'preview should surface official Tianqi scenario counts');
/* 2026-07-03 玄墨案头重做：照片纹理(img/ancient-tabletop-board.png)按设计退役，
   背景改程序化墨底+微噪点；「使用天命自有视觉资产」的守卫改钉随游戏分发的自带字体。 */
assert(html.includes('../assets/fonts/ZCOOLXiaoWei-Regular.ttf'),
  'preview should reference the Tianming release font when assets are present');
assert(html.includes('font-display: swap') &&
  /--je-font-display:[^;]*var\(--je-font-kai\)/.test(html),
  'preview should remain usable through its tracked fallback stack when large release fonts are absent in CI');
assert(html.includes('scenario-editor-reset-data.js'), 'preview should load generated official scenario data');
assert(html.includes('scenario-editor-reset-app.js'), 'preview should load standalone functional app script');
assert(html.includes('id="scenario-editor-reset-static-prototype"'), 'preview should keep the old static prototype inert');
assert(!html.includes('<script>\r\n    const modules = {') && !html.includes('<script>\n    const modules = {'),
  'preview should not execute the legacy static prototype script');
assert(dataJs.includes('TM_SCENARIO_EDITOR_RESET_DATA'), 'preview data should publish a global data payload');
assert(dataJs.includes('天启七年'), 'preview data should be generated from the official Tianqi scenario');
assert(appJs.includes('TM_SCENARIO_EDITOR_RESET_APP'), 'preview app should publish a small inspection facade');
assert(appJs.includes("dataset.scenarioEditorResetApp = 'ready'"), 'preview app should mark the functional script as ready in the DOM');
['loadScenario', 'saveField', 'exportScenario', 'importScenario', 'validateScenario', 'simulateAiDraft', 'acceptDraft'].forEach((fn) => {
  assert(appJs.includes(fn), 'preview app should implement ' + fn);
});
assert(appJs.includes("typeof trigger === 'string'"), 'preview app AI draft API should accept string actions for automation/debugging');
assert(appJs.includes('return clone(state.scenario)'), 'preview app export API should return the current scenario snapshot');
assert(appJs.includes('localStorage'), 'preview app should persist preview-only drafts locally');
assert(appJs.includes('original: state.original'), 'preview app draft storage should preserve the comparison baseline');
assert(appJs.includes('state.original = isObject(stored.original)'), 'preview app should restore a runtime-loaded baseline');
assert(appJs.includes("detailPanelBlock('field-editor'"), 'preview app should render a field editor panel');
assert(appJs.includes('id="field-editor-value"'), 'preview app should render an editable field textarea');
assert(appJs.includes("detailPanelBlock('structured-workbench'"), 'preview app should render a structured authoring workbench panel');
assert(appJs.includes('function renderStructuredWorkbench'), 'preview app should route high-frequency fields into structured workbenches');
assert(appJs.includes('function renderGameSettingsWorkbench'), 'preview app should render a game settings time/system form');
assert(appJs.includes('function saveGameSettingsWorkbench'), 'preview app should save game settings without raw JSON editing');
assert(appJs.includes('function renderPlayerSyncWorkbench'), 'preview app should render a player/faction/character sync form');
assert(appJs.includes('function syncPlayerProfile'), 'preview app should sync player setup into characters and factions');
assert(appJs.includes('function renderRelationMatrixWorkbench'), 'preview app should render a faction relation matrix editor');
assert(appJs.includes('function saveRelationMatrix'), 'preview app should save faction relation matrix rows');
assert(appJs.includes('function buildFactionRelationGraph'), 'preview app should build a faction relation graph model');
assert(appJs.includes('function renderFactionRelationGraph'), 'preview app should render a faction relation graph panel');
assert(appJs.includes('data-relation-graph'), 'preview app should mark relation graph panels');
assert(appJs.includes('data-relation-node'), 'preview app should expose relation graph nodes');
assert(appJs.includes('data-relation-edge'), 'preview app should expose relation graph edges');
assert(appJs.includes('buildFactionRelationGraph: buildFactionRelationGraph'), 'preview app facade should expose relation graph helper');
assert(appJs.includes('function buildCharacterRelationGraph'), 'preview app should build a character relation graph model');
assert(appJs.includes('function renderCharacterRelationWorkbench'), 'preview app should render a character relation workbench');
assert(appJs.includes('function saveCharacterRelations'), 'preview app should save character relation rows');
assert(appJs.includes('function addCharacterRelationRow'), 'preview app should add character relation rows');
assert(appJs.includes('function jumpCharacterRelationNode'), 'preview app should jump from relation graph nodes to characters');
assert(appJs.includes('data-structured-kind="character-relations"'), 'preview app should mark the character relation workbench kind');
assert(appJs.includes('data-character-relation-graph'), 'preview app should mark character relation graph panels');
assert(appJs.includes('data-character-relation-row'), 'preview app should expose editable character relation rows');
assert(appJs.includes('data-character-relation-node'), 'preview app should expose character relation graph nodes');
assert(appJs.includes('data-character-relation-edge'), 'preview app should expose character relation graph edges');
assert(appJs.includes('data-editor-command="save-character-relations"'), 'preview app should expose character relation saving');
assert(appJs.includes('data-editor-command="add-character-relation"'), 'preview app should expose character relation row creation');
assert(appJs.includes('data-editor-command="jump-character-relation-node"'), 'preview app should expose character relation node jumping');
assert(appJs.includes('buildCharacterRelationGraph: buildCharacterRelationGraph'), 'preview app facade should expose character relation graph helper');
assert(appJs.includes('function buildFamilyLineageGraph'), 'preview app should build a family lineage graph model');
assert(appJs.includes('function renderFamilyLineageWorkbench'), 'preview app should render a family lineage workbench');
assert(appJs.includes('function saveFamilyLineageWorkbench'), 'preview app should save family lineage rows');
assert(appJs.includes('function addFamilyLineageRow'), 'preview app should add family lineage rows');
assert(appJs.includes('function jumpFamilyMember'), 'preview app should jump from family members to character records');
assert(appJs.includes('data-structured-kind="family-lineages"'), 'preview app should mark the family lineage workbench kind');
assert(appJs.includes('data-family-lineage-graph'), 'preview app should mark family lineage graph panels');
assert(appJs.includes('data-family-lineage-row'), 'preview app should expose editable family rows');
assert(appJs.includes('data-family-member-node'), 'preview app should expose family member graph nodes');
assert(appJs.includes('data-family-lineage-edge'), 'preview app should expose family lineage graph edges');
assert(appJs.includes('data-editor-command="save-family-lineages"'), 'preview app should expose family lineage saving');
assert(appJs.includes('data-editor-command="add-family-lineage"'), 'preview app should expose family lineage row creation');
assert(appJs.includes('data-editor-command="jump-family-member"'), 'preview app should expose family member jumping');
assert(appJs.includes('buildFamilyLineageGraph: buildFamilyLineageGraph'), 'preview app facade should expose family lineage graph helper');
assert(appJs.includes('function buildTraitUsageIndex'), 'preview app should build a trait usage index');
assert(appJs.includes('function renderTraitDictionaryWorkbench'), 'preview app should render a trait dictionary workbench');
assert(appJs.includes('function saveTraitDefinitionsWorkbench'), 'preview app should save trait definitions');
assert(appJs.includes('function addTraitDefinitionRow'), 'preview app should add trait definition rows');
assert(appJs.includes('function jumpTraitUsage'), 'preview app should jump from trait usage to characters');
assert(appJs.includes('data-structured-kind="trait-dictionary"'), 'preview app should mark the trait dictionary workbench kind');
assert(appJs.includes('data-trait-definition-row'), 'preview app should expose editable trait definition rows');
assert(appJs.includes('data-trait-effect-editor'), 'preview app should expose trait effect editors');
assert(appJs.includes('data-trait-usage-index'), 'preview app should mark trait usage index panels');
assert(appJs.includes('data-trait-usage-row'), 'preview app should expose trait usage rows');
assert(appJs.includes('data-editor-command="save-trait-definitions"'), 'preview app should expose trait definition saving');
assert(appJs.includes('data-editor-command="add-trait-definition"'), 'preview app should expose trait definition row creation');
assert(appJs.includes('data-editor-command="jump-trait-usage"'), 'preview app should expose trait usage jumping');
assert(appJs.includes('buildTraitUsageIndex: buildTraitUsageIndex'), 'preview app facade should expose trait usage indexing');
assert(appJs.includes('function buildSocietyInfluencePreview'), 'preview app should build a party/class influence preview');
assert(appJs.includes('function renderSocietyInfluenceWorkbench'), 'preview app should render a party/class influence workbench');
assert(appJs.includes('function saveSocietyInfluenceWorkbench'), 'preview app should save party/class influence rows');
assert(appJs.includes('function addSocietyInfluenceRow'), 'preview app should add party/class influence rows');
assert(appJs.includes('function jumpSocietyLeader'), 'preview app should jump from party/class leaders to characters');
assert(appJs.includes('data-structured-kind="society-influence"'), 'preview app should mark society influence workbench kind');
assert(appJs.includes('data-society-influence-panel'), 'preview app should mark society influence panels');
assert(appJs.includes('data-society-influence-row'), 'preview app should expose society influence rows');
assert(appJs.includes('data-society-influence-chart'), 'preview app should expose society influence charts');
assert(appJs.includes('data-society-leader'), 'preview app should expose society leader jump controls');
assert(appJs.includes('data-editor-command="save-society-influence"'), 'preview app should expose society influence saving');
assert(appJs.includes('data-editor-command="add-society-row"'), 'preview app should expose society influence row creation');
assert(appJs.includes('data-editor-command="jump-society-leader"'), 'preview app should expose society leader jumping');
assert(appJs.includes('buildSocietyInfluencePreview: buildSocietyInfluencePreview'), 'preview app facade should expose society influence preview helper');
assert(appJs.includes('function buildItemInventoryPreview'), 'preview app should build an item inventory preview');
assert(appJs.includes('function renderItemInventoryWorkbench'), 'preview app should render an item inventory workbench');
assert(appJs.includes('function saveItemInventoryWorkbench'), 'preview app should save item inventory rows');
assert(appJs.includes('function addItemInventoryRow'), 'preview app should add item inventory rows');
assert(appJs.includes('function jumpItemOwner'), 'preview app should jump from item owners to characters');
assert(appJs.includes('data-structured-kind="item-inventory"'), 'preview app should mark item inventory workbench kind');
assert(appJs.includes('data-item-inventory-panel'), 'preview app should mark item inventory panels');
assert(appJs.includes('data-item-inventory-row'), 'preview app should expose item inventory rows');
assert(appJs.includes('data-item-inventory-chart'), 'preview app should expose item inventory charts');
assert(appJs.includes('data-item-owner'), 'preview app should expose item owner jump controls');
assert(appJs.includes('data-editor-command="save-item-inventory"'), 'preview app should expose item inventory saving');
assert(appJs.includes('data-editor-command="add-item-row"'), 'preview app should expose item inventory row creation');
assert(appJs.includes('data-editor-command="jump-item-owner"'), 'preview app should expose item owner jumping');
assert(appJs.includes('buildItemInventoryPreview: buildItemInventoryPreview'), 'preview app facade should expose item inventory preview helper');
assert(appJs.includes('function buildCityRegistryPreview'), 'preview app should build a city registry preview');
assert(appJs.includes('function renderCityRegistryWorkbench'), 'preview app should render a city registry workbench');
assert(appJs.includes('function saveCityRegistryWorkbench'), 'preview app should save city registry rows');
assert(appJs.includes('function addCityRegistryRow'), 'preview app should add city registry rows');
assert(appJs.includes('function jumpCityMapRegion'), 'preview app should jump from cities to map bindings');
assert(appJs.includes('data-structured-kind="city-registry"'), 'preview app should mark city registry workbench kind');
assert(appJs.includes('data-city-registry-panel'), 'preview app should mark city registry panels');
assert(appJs.includes('data-city-registry-row'), 'preview app should expose city registry rows');
assert(appJs.includes('data-city-registry-chart'), 'preview app should expose city registry charts');
assert(appJs.includes('data-city-map-target'), 'preview app should expose city map jump controls');
assert(appJs.includes('data-editor-command="save-city-registry"'), 'preview app should expose city registry saving');
assert(appJs.includes('data-editor-command="add-city-row"'), 'preview app should expose city row creation');
assert(appJs.includes('data-editor-command="jump-city-region"'), 'preview app should expose city map jumping');
assert(appJs.includes('buildCityRegistryPreview: buildCityRegistryPreview'), 'preview app facade should expose city registry preview helper');
assert(appJs.includes('function buildInterestGroupPreview'), 'preview app should build an interest group preview');
assert(appJs.includes('function renderInterestGroupWorkbench'), 'preview app should render an interest group workbench');
assert(appJs.includes('function saveInterestGroupWorkbench'), 'preview app should save interest group rows');
assert(appJs.includes('function addInterestGroupRow'), 'preview app should add interest group rows');
assert(appJs.includes('function jumpInterestGroupMember'), 'preview app should jump from interest group leaders or members to characters');
assert(appJs.includes('data-structured-kind="interest-groups"'), 'preview app should mark interest group workbench kind');
assert(appJs.includes('data-interest-group-panel'), 'preview app should mark interest group panels');
assert(appJs.includes('data-interest-group-row'), 'preview app should expose interest group rows');
assert(appJs.includes('data-interest-group-chart'), 'preview app should expose interest group charts');
assert(appJs.includes('data-interest-group-member'), 'preview app should expose interest group member jump controls');
assert(appJs.includes('data-editor-command="save-interest-groups"'), 'preview app should expose interest group saving');
assert(appJs.includes('data-editor-command="add-interest-group"'), 'preview app should expose interest group row creation');
assert(appJs.includes('data-editor-command="jump-interest-group-member"'), 'preview app should expose interest group member jumping');
assert(appJs.includes('buildInterestGroupPreview: buildInterestGroupPreview'), 'preview app facade should expose interest group preview helper');
assert(appJs.includes('function buildImperialEdictPreview'), 'preview app should build an imperial edict preview');
assert(appJs.includes('function renderImperialEdictWorkbench'), 'preview app should render an imperial edict workbench');
assert(appJs.includes('function saveImperialEdictWorkbench'), 'preview app should save imperial edict rows');
assert(appJs.includes('function addImperialEdictRow'), 'preview app should add imperial edict rows');
assert(appJs.includes('function jumpImperialEdictTarget'), 'preview app should jump from imperial edict targets to characters or factions');
assert(appJs.includes("runtimeSurface('imperialEdicts',") && appJs.includes("'structured-workbench', '正式启动会把初始诏令写入 MemTables。'"),
  'runtime audit should route initial imperial edicts to the structured workbench');
assert(appJs.includes('data-structured-kind="imperial-edicts"'), 'preview app should mark imperial edict workbench kind');
assert(appJs.includes('data-imperial-edict-panel'), 'preview app should mark imperial edict panels');
assert(appJs.includes('data-imperial-edict-row'), 'preview app should expose imperial edict rows');
assert(appJs.includes('data-imperial-edict-chart'), 'preview app should expose imperial edict charts');
assert(appJs.includes('data-imperial-edict-target'), 'preview app should expose imperial edict target jump controls');
assert(appJs.includes('data-editor-command="save-imperial-edicts"'), 'preview app should expose imperial edict saving');
assert(appJs.includes('data-editor-command="add-imperial-edict"'), 'preview app should expose imperial edict row creation');
assert(appJs.includes('data-editor-command="jump-imperial-edict-target"'), 'preview app should expose imperial edict target jumping');
assert(appJs.includes('buildImperialEdictPreview: buildImperialEdictPreview'), 'preview app facade should expose imperial edict preview helper');
assert(appJs.includes('function renderVariableWorkbench'), 'preview app should render a variable table editor');
assert(appJs.includes('function saveVariableWorkbench'), 'preview app should save variable table rows');
assert(appJs.includes('function buildVariableUsageIndex'), 'preview app should build a variable usage index');
const configWorkbenchSource = appJs.slice(
  appJs.indexOf('function isConfigWorkbenchField'),
  appJs.indexOf('function isTimeWorkbenchField')
);
[
  'adminConfig', 'authorityConfigDeep', 'neitang_advanced', 'tinyi',
  'guoku', 'guoku_advanced', 'engineConstants', 'edictConfig', 'mechanics'
].forEach((field) => {
  assert(configWorkbenchSource.includes("'" + field + "'"), 'config workbench should include structured config field ' + field);
});
const promptWorkbenchSource = appJs.slice(
  appJs.indexOf('function isPromptWorkbenchField'),
  appJs.indexOf('function isRuleListField')
);
assert(promptWorkbenchSource.includes("'mechanics'"), 'mechanics string field should route to the prompt workbench');
assert(appJs.includes('data-variable-usage-index'), 'preview app variable workbench should render a usage index');
assert(appJs.includes('data-editor-command="jump-variable-usage"'), 'preview app should jump from variable usage rows to source fields');
assert(appJs.includes('buildVariableUsageIndex: buildVariableUsageIndex'), 'preview app facade should expose variable usage indexing');
assert(appJs.includes('function renderTreeWorkbench'), 'preview app should render tree editors for offices, tech, civic, and administration');
assert(appJs.includes('function saveTreeWorkbench'), 'preview app should save visible tree rows');
assert(appJs.includes('function buildTreeDependencyGraph'), 'preview app should build a tech/civic dependency graph');
assert(appJs.includes('function renderTreeDependencyGraph'), 'preview app should render tech/civic dependency graph panels');
assert(appJs.includes('data-tree-dependency-graph'), 'preview app should mark tree dependency graph panels');
assert(appJs.includes('data-tree-graph-node'), 'preview app should expose tree graph nodes');
assert(appJs.includes('data-tree-graph-edge'), 'preview app should expose tree graph edges');
assert(appJs.includes('buildTreeDependencyGraph: buildTreeDependencyGraph'), 'preview app facade should expose tree dependency graph helper');
assert(appJs.includes('function buildEventTimelinePreview'), 'preview app should build an event timeline preview model');
assert(appJs.includes('function renderEventTimelinePreview'), 'preview app should render event timeline preview panels');
assert(appJs.includes('data-event-timeline-preview'), 'preview app should mark event timeline preview panels');
assert(appJs.includes('data-event-timeline-row'), 'preview app should expose event timeline rows');
assert(appJs.includes('data-event-timeline-marker'), 'preview app should expose event timeline markers');
assert(appJs.includes('data-editor-command="jump-event-timeline"'), 'preview app should jump from timeline preview rows to event forms');
assert(appJs.includes('buildEventTimelinePreview: buildEventTimelinePreview'), 'preview app facade should expose event timeline preview helper');
assert(appJs.includes('function isEventLibraryField'), 'preview app should detect event library fields');
assert(appJs.includes('function buildEventLibraryPreview'), 'preview app should build editable event library previews');
assert(appJs.includes('function renderEventLibraryWorkbench'), 'preview app should render an editable event library workbench');
assert(appJs.includes('function saveEventLibraryWorkbench'), 'preview app should save event library rows');
assert(appJs.includes('function addEventLibraryRow'), 'preview app should add event library rows');
assert(appJs.includes("runtimeSurface('events', '事件库', '事件年表', 'eventsChronicle', 'structured-workbench'"),
  'runtime audit should route events to the structured workbench');
assert(appJs.includes("runtimeSurface('rigidHistoryEvents', '硬历史事件', '事件年表', 'eventsChronicle', 'structured-workbench'"),
  'runtime audit should route rigidHistoryEvents to the structured workbench');
assert(appJs.includes("runtimeSurface('goals', '目标列表', '事件年表', 'eventsChronicle', 'structured-workbench'"),
  'runtime audit should route goals to the structured workbench');
assert(appJs.includes('data-structured-kind="event-library"'), 'preview app should mark the event library workbench kind');
assert(appJs.includes('data-event-library-panel'), 'preview app should mark event library panels');
assert(appJs.includes('data-event-library-chart'), 'preview app should expose event library charts');
assert(appJs.includes('data-event-library-row'), 'preview app should expose editable event rows');
assert(appJs.includes('data-event-library-field'), 'preview app should expose editable event fields');
assert(appJs.includes('data-editor-command="save-event-library"'), 'preview app should expose event library saving');
assert(appJs.includes('data-editor-command="add-event-library"'), 'preview app should expose event library row creation');
assert(appJs.includes('buildEventLibraryPreview: buildEventLibraryPreview'), 'preview app facade should expose event library preview helper');
assert(appJs.includes('function buildGoalConditionPreview'), 'preview app should build a goal and victory condition model');
assert(appJs.includes('function renderGoalConditionWorkbench'), 'preview app should render a goal and condition workbench');
assert(appJs.includes('function saveGoalConditionWorkbench'), 'preview app should save goals, win conditions, and lose conditions together');
assert(appJs.includes('function addGoalConditionRow'), 'preview app should add goal rows from the condition workbench');
assertRuntimeSurfacePanel('winCond', 'structured-workbench',
  'runtime audit should route victory conditions to the goal condition workbench');
assertRuntimeSurfacePanel('loseCond', 'structured-workbench',
  'runtime audit should route failure conditions to the goal condition workbench');
assert(appJs.indexOf('if (isGoalConditionField(field)) return renderGoalConditionWorkbench(field, value);') >= 0 &&
  appJs.indexOf('if (isGoalConditionField(field)) return renderGoalConditionWorkbench(field, value);') <
  appJs.indexOf('if (isScenarioFoundationField(field)) return renderScenarioFoundationWorkbench(field);'),
  'structured workbench should route goal condition fields before the scenario foundation fallback');
assert(appJs.includes('data-structured-kind="goal-conditions"'), 'preview app should mark the goal condition workbench kind');
assert(appJs.includes('data-goal-condition-panel'), 'preview app should mark the goal condition panel');
assert(appJs.includes('data-goal-row'), 'preview app should expose editable goal rows');
assert(appJs.includes('data-editor-command="save-goal-conditions"'), 'preview app should expose goal condition saving');
assert(appJs.includes('data-editor-command="add-goal-condition"'), 'preview app should expose goal condition row creation');
assert(appJs.includes('buildGoalConditionPreview: buildGoalConditionPreview'), 'preview app facade should expose goal condition model helper');
assert(appJs.includes('function buildRigidTriggerPreview'), 'preview app should build a rigid trigger preview model');
assert(appJs.includes('function renderRigidTriggerWorkbench'), 'preview app should render a rigid trigger workbench');
assert(appJs.includes('function saveRigidTriggerWorkbench'), 'preview app should save rigid trigger object maps');
assert(appJs.includes('function addRigidTriggerRow'), 'preview app should add rigid trigger rows');
assert(appJs.includes('data-structured-kind="rigid-triggers"'), 'preview app should mark the rigid trigger workbench kind');
assert(appJs.includes('data-rigid-trigger-panel'), 'preview app should mark rigid trigger panels');
assert(appJs.includes('data-rigid-trigger-row'), 'preview app should expose editable rigid trigger rows');
assert(appJs.includes('data-rigid-trigger-effect'), 'preview app should expose rigid trigger effect editors');
assert(appJs.includes('data-editor-command="save-rigid-triggers"'), 'preview app should expose rigid trigger saving');
assert(appJs.includes('data-editor-command="add-rigid-trigger"'), 'preview app should expose rigid trigger row creation');
assert(appJs.includes('buildRigidTriggerPreview: buildRigidTriggerPreview'), 'preview app facade should expose rigid trigger preview helper');
assert(appJs.includes('function collectTimelineWorkbenchRows'), 'preview app should collect nested timeline rows for editing');
assert(appJs.includes('function renderTimelineWorkbench'), 'preview app should render a nested timeline workbench');
assert(appJs.includes('function saveTimelineWorkbench'), 'preview app should save nested timeline lanes without raw JSON editing');
assert(appJs.includes('function addTimelineRow'), 'preview app should add timeline rows to a selected lane');
assert(appJs.includes('data-structured-kind="timeline-editor"'), 'preview app should mark timeline workbench kind');
assert(appJs.includes('data-timeline-workbench'), 'preview app should mark timeline workbench panels');
assert(appJs.includes('data-timeline-row'), 'preview app should expose editable timeline rows');
assert(appJs.includes('data-timeline-lane'), 'preview app should expose timeline lane controls');
assert(appJs.includes('data-editor-command="save-timeline-workbench"'), 'preview app should expose timeline saving');
assert(appJs.includes('data-editor-command="add-timeline-row"'), 'preview app should expose timeline row creation');
assert(appJs.includes('collectTimelineWorkbenchRows: collectTimelineWorkbenchRows'), 'preview app facade should expose timeline row collection');
assert(appJs.includes('function renderConfigWorkbench'), 'preview app should render a config workbench for military/fiscal/mechanics fields');
assert(appJs.includes('function saveConfigWorkbench'), 'preview app should save config workbench primitive and list rows');
assert(appJs.includes('function buildPoliticalActionPreview'), 'preview app should build scheme and decision previews');
assert(appJs.includes('function renderPoliticalActionWorkbench'), 'preview app should render scheme and decision workbenches');
assert(appJs.includes('function savePoliticalActionWorkbench'), 'preview app should save scheme and decision rows');
assert(appJs.includes('function addPoliticalActionRow'), 'preview app should add scheme and decision rows');
assert(appJs.includes('function jumpPoliticalActionVariable'), 'preview app should jump from scheme or decision references to variables');
assert(appJs.includes('data-structured-kind="political-actions"'), 'preview app should mark scheme and decision workbench kind');
assert(appJs.includes('data-political-action-panel'), 'preview app should mark scheme and decision panels');
assert(appJs.includes('data-political-action-row'), 'preview app should expose scheme and decision rows');
assert(appJs.includes('data-political-action-chart'), 'preview app should expose scheme and decision charts');
assert(appJs.includes('data-political-action-variable'), 'preview app should expose scheme and decision variable jump controls');
assert(appJs.includes('data-editor-command="save-political-actions"'), 'preview app should expose scheme and decision saving');
assert(appJs.includes('data-editor-command="add-political-action"'), 'preview app should expose scheme and decision row creation');
assert(appJs.includes('data-editor-command="jump-political-action-variable"'), 'preview app should expose scheme and decision variable jumping');
assert(appJs.includes('buildPoliticalActionPreview: buildPoliticalActionPreview'), 'preview app facade should expose scheme and decision preview helper');
assert(appJs.includes('function buildNarrativeRulePreview'), 'preview app should build chronicle and event constraint previews');
assert(appJs.includes('function renderNarrativeRuleWorkbench'), 'preview app should render chronicle and event constraint workbenches');
assert(appJs.includes('function saveNarrativeRuleWorkbench'), 'preview app should save chronicle and event constraint rows');
assert(appJs.includes('function addNarrativeRuleRow'), 'preview app should add chronicle style or event constraint rows');
assert(appJs.includes('function jumpNarrativeRuleVariable'), 'preview app should jump from event constraint conditions to variables');
assert(appJs.includes('data-structured-kind="narrative-rules"'), 'preview app should mark chronicle and event constraint workbench kind');
assert(appJs.includes('data-narrative-rule-panel'), 'preview app should mark chronicle and event constraint panels');
assert(appJs.includes('data-narrative-rule-row'), 'preview app should expose chronicle style and event constraint rows');
assert(appJs.includes('data-narrative-rule-chart'), 'preview app should expose chronicle and event constraint charts');
assert(appJs.includes('data-narrative-rule-variable'), 'preview app should expose event constraint variable jump controls');
assert(appJs.includes('data-editor-command="save-narrative-rules"'), 'preview app should expose chronicle and event constraint saving');
assert(appJs.includes('data-editor-command="add-narrative-rule"'), 'preview app should expose chronicle or event constraint row creation');
assert(appJs.includes('data-editor-command="jump-narrative-rule-variable"'), 'preview app should expose event constraint variable jumping');
assert(appJs.includes('buildNarrativeRulePreview: buildNarrativeRulePreview'), 'preview app facade should expose chronicle and event constraint preview helper');
assert(appJs.includes('function buildWorldStatePreview'), 'preview app should build era state and world setting previews');
assert(appJs.includes('function renderWorldStateWorkbench'), 'preview app should render era state and world setting workbenches');
assert(appJs.includes('function saveWorldStateWorkbench'), 'preview app should save era state sliders and world setting notes');
assert(appJs.includes('function scaffoldWorldStateDefaults'), 'preview app should scaffold missing era/world defaults');
assertRuntimeSurfacePanel('worldview', 'structured-workbench',
  'runtime audit should route worldview to the world state workbench');
assert(appJs.includes("field === 'worldview'"),
  'world state workbench should recognize worldview as a structured field');
assert(appJs.includes('data-world-state-section="worldview"'),
  'world state workbench should expose a dedicated worldview text editor');
assert(appJs.includes('data-structured-kind="world-state"'), 'preview app should mark era and world setting workbench kind');
assert(appJs.includes('data-world-state-panel'), 'preview app should mark era and world setting panels');
assert(appJs.includes('data-world-state-metric'), 'preview app should expose era metric slider controls');
assert(appJs.includes('data-world-state-section'), 'preview app should expose world setting text controls');
assert(appJs.includes('data-world-state-chart'), 'preview app should expose era/world preview charts');
assert(appJs.includes('data-editor-command="save-world-state"'), 'preview app should expose era/world saving');
assert(appJs.includes('data-editor-command="scaffold-world-state"'), 'preview app should expose era/world default scaffolding');
assert(appJs.includes('buildWorldStatePreview: buildWorldStatePreview'), 'preview app facade should expose era/world preview helper');
assert(appJs.includes('function buildCourtLifePreview'), 'preview app should build harem and palace previews');
assert(appJs.includes('function renderCourtLifeWorkbench'), 'preview app should render harem and palace workbenches');
assert(appJs.includes('function saveCourtLifeWorkbench'), 'preview app should save harem ranks and palace rows');
assert(appJs.includes('function addCourtLifeRow'), 'preview app should add harem rank and palace rows');
assert(appJs.includes('data-structured-kind="court-life"'), 'preview app should mark harem and palace workbench kind');
assert(appJs.includes('data-court-life-panel'), 'preview app should mark harem and palace panels');
assert(appJs.includes('data-court-life-row'), 'preview app should expose harem rank and palace rows');
assert(appJs.includes('data-court-life-chart'), 'preview app should expose harem and palace preview charts');
assert(appJs.includes('data-editor-command="save-court-life"'), 'preview app should expose harem and palace saving');
assert(appJs.includes('data-editor-command="add-court-life-row"'), 'preview app should expose harem and palace row creation');
assert(appJs.includes('buildCourtLifePreview: buildCourtLifePreview'), 'preview app facade should expose harem and palace preview helper');
assert(appJs.includes('function buildMilitaryReadinessPreview'), 'preview app should build military troop and doctrine previews');
assert(appJs.includes('function renderMilitaryWorkbench'), 'preview app should render initial troops and military systems workbench');
assert(appJs.includes('function saveMilitaryWorkbench'), 'preview app should save initial troops, compositions, salaries, equipment, and systems');
assert(appJs.includes('function addMilitaryRow'), 'preview app should add initial troop or military system rows');
assert(appJs.includes('data-structured-kind="military-forces"'), 'preview app should mark the military forces workbench kind');
assert(appJs.includes('data-military-forces-panel'), 'preview app should mark military forces panels');
assert(appJs.includes('data-military-force-row'), 'preview app should expose editable initial troop and military system rows');
assert(appJs.includes('data-military-readiness-chart'), 'preview app should expose military readiness charts');
assert(appJs.includes('data-editor-command="save-military-forces"'), 'preview app should expose military workbench saving');
assert(appJs.includes('data-editor-command="add-military-row"'), 'preview app should expose military workbench row creation');
assert(appJs.includes('data-military-force-empty'), 'military forces empty state should expose a stable starter marker');
assert(appJs.includes('data-military-force-template-field'), 'military forces empty state should preview starter troop and system fields');
assert(appJs.includes('buildMilitaryReadinessPreview: buildMilitaryReadinessPreview'), 'preview app facade should expose military readiness preview helper');
assert(appJs.includes('function buildDiplomacyWarPreview'), 'preview app should build war casus belli and diplomacy treaty previews');
assert(appJs.includes('function renderDiplomacyWarWorkbench'), 'preview app should render war and diplomacy workbenches');
assert(appJs.includes('function saveDiplomacyWarWorkbench'), 'preview app should save casus belli and treaty rows');
assert(appJs.includes('function addDiplomacyWarRow'), 'preview app should add casus belli or treaty rows');
assert(appJs.includes('data-structured-kind="diplomacy-war"'), 'preview app should mark war and diplomacy workbench kind');
assert(appJs.includes('data-diplomacy-war-panel'), 'preview app should mark war and diplomacy panels');
assert(appJs.includes('data-diplomacy-war-row'), 'preview app should expose editable casus belli and treaty rows');
assert(appJs.includes('data-diplomacy-war-chart'), 'preview app should expose war and diplomacy preview charts');
assert(appJs.includes('data-editor-command="save-diplomacy-war"'), 'preview app should expose war and diplomacy saving');
assert(appJs.includes('data-editor-command="add-diplomacy-war-row"'), 'preview app should expose war and diplomacy row creation');
assert(appJs.includes('data-diplomacy-war-add'), 'war and diplomacy add buttons should carry the target field explicitly');
assert(appJs.includes('data-diplomacy-war-empty'), 'war and diplomacy empty state should expose a stable starter marker');
assert(appJs.includes('data-diplomacy-war-template-field'), 'war and diplomacy empty state should preview starter casus belli and treaty fields');
assert(appJs.includes('buildDiplomacyWarPreview: buildDiplomacyWarPreview'), 'preview app facade should expose war and diplomacy preview helper');
assert(appJs.includes('function buildEconomyConfigPreview'), 'preview app should build economy config previews');
assert(appJs.includes('function renderEconomyConfigWorkbench'), 'preview app should render an economy config workbench');
assert(appJs.includes('function saveEconomyConfigWorkbench'), 'preview app should save economy config sliders and text fields');
assert(appJs.includes('function scaffoldEconomyConfigWorkbench'), 'preview app should scaffold missing economy config defaults');
assert(appJs.includes('data-structured-kind="economy-config"'), 'preview app should mark the economy config workbench kind');
assert(appJs.includes('data-economy-config-panel'), 'preview app should mark economy config panels');
assert(appJs.includes('data-economy-config-chart'), 'preview app should expose economy config preview charts');
assert(appJs.includes('data-economy-metric'), 'preview app should expose editable economy metrics');
assert(appJs.includes('data-economy-textarea'), 'preview app should expose editable economy text fields');
assert(appJs.includes('data-editor-command="save-economy-config"'), 'preview app should expose economy config saving');
assert(appJs.includes('data-editor-command="scaffold-economy-config"'), 'preview app should expose economy config scaffolding');
assert(appJs.includes('data-economy-config-starter'), 'empty economy config should show an explicit default-starter callout');
assert(appJs.includes('data-economy-config-template-field'), 'empty economy config starter should preview default economy fields');
assert(appJs.includes('buildEconomyConfigPreview: buildEconomyConfigPreview'), 'preview app facade should expose economy config preview helper');
assert(appJs.includes('function buildPopulationConfigPreview'), 'preview app should build population config previews');
assert(appJs.includes('function renderPopulationConfigWorkbench'), 'preview app should render a population config workbench');
assert(appJs.includes('function savePopulationConfigWorkbench'), 'preview app should save population totals, age range, and categories');
assert(appJs.includes('function scaffoldPopulationConfigWorkbench'), 'preview app should scaffold missing population config defaults');
assert(appJs.includes('function addPopulationCategoryRow'), 'preview app should add population category rows');
assert(appJs.includes('data-structured-kind="population-config"'), 'preview app should mark the population config workbench kind');
assert(appJs.includes('data-population-config-panel'), 'preview app should mark population config panels');
assert(appJs.includes('data-population-config-chart'), 'preview app should expose population config preview charts');
assert(appJs.includes('data-population-metric'), 'preview app should expose editable population metrics');
assert(appJs.includes('data-population-category-row'), 'preview app should expose editable population category rows');
assert(appJs.includes('data-population-textarea'), 'preview app should expose editable population note fields');
assert(appJs.includes('data-editor-command="save-population-config"'), 'preview app should expose population config saving');
assert(appJs.includes('data-editor-command="scaffold-population-config"'), 'preview app should expose population config scaffolding');
assert(appJs.includes('data-editor-command="add-population-category"'), 'preview app should expose population category creation');
assert(appJs.includes('data-population-config-starter'), 'empty population config should show an explicit default-starter callout');
assert(appJs.includes('data-population-config-template-field'), 'empty population config starter should preview default population fields');
assert(appJs.includes('buildPopulationConfigPreview: buildPopulationConfigPreview'), 'preview app facade should expose population config preview helper');
assert(appJs.includes('function buildEnvironmentConfigPreview'), 'preview app should build environment config previews');
assert(appJs.includes('function renderEnvironmentConfigWorkbench'), 'preview app should render an environment config workbench');
assert(appJs.includes('function saveEnvironmentConfigWorkbench'), 'preview app should save climate, disaster, river, and region fields');
assert(appJs.includes('function scaffoldEnvironmentConfigWorkbench'), 'preview app should scaffold missing environment config defaults');
assert(appJs.includes('function addEnvironmentRegionRow'), 'preview app should add environment region rows');
assert(appJs.includes('function addEnvironmentDisasterType'), 'preview app should add environment disaster type rows');
assert(appJs.includes('data-structured-kind="environment-config"'), 'preview app should mark the environment config workbench kind');
assert(appJs.includes('data-environment-config-panel'), 'preview app should mark environment config panels');
assert(appJs.includes('data-environment-config-chart'), 'preview app should expose environment config preview charts');
assert(appJs.includes('data-environment-metric'), 'preview app should expose editable environment metrics');
assert(appJs.includes('data-environment-region-row'), 'preview app should expose editable environment region rows');
assert(appJs.includes('data-environment-disaster-row'), 'preview app should expose editable environment disaster rows');
assert(appJs.includes('data-environment-textarea'), 'preview app should expose editable environment note fields');
assert(appJs.includes('data-editor-command="save-environment-config"'), 'preview app should expose environment config saving');
assert(appJs.includes('data-editor-command="scaffold-environment-config"'), 'preview app should expose environment config scaffolding');
assert(appJs.includes('data-editor-command="add-environment-region"'), 'preview app should expose environment region creation');
assert(appJs.includes('data-editor-command="add-environment-disaster"'), 'preview app should expose environment disaster creation');
assert(appJs.includes('buildEnvironmentConfigPreview: buildEnvironmentConfigPreview'), 'preview app facade should expose environment config preview helper');
assert(appJs.includes('function buildCulturalWorkbenchPreview'), 'preview app should build cultural config and works previews');
assert(appJs.includes('function renderCulturalWorkbench'), 'preview app should render a cultural config and works workbench');
assert(appJs.includes('function saveCulturalWorkbench'), 'preview app should save cultural focus, style lists, and work rows');
assert(appJs.includes('function scaffoldCulturalWorkbench'), 'preview app should scaffold missing cultural config and works defaults');
assert(appJs.includes('function addCulturalWorkRow'), 'preview app should add cultural work rows');
assert(appJs.includes('data-structured-kind="cultural-workbench"'), 'preview app should mark the cultural workbench kind');
assert(appJs.includes('data-cultural-panel'), 'preview app should mark cultural workbench panels');
assert(appJs.includes('data-cultural-chart'), 'preview app should expose cultural preview charts');
assert(appJs.includes('data-cultural-metric'), 'preview app should expose editable cultural metrics');
assert(appJs.includes('data-cultural-work-row'), 'preview app should expose editable cultural work rows');
assert(appJs.includes('data-cultural-textarea'), 'preview app should expose editable cultural text fields');
assert(appJs.includes('data-editor-command="save-cultural-workbench"'), 'preview app should expose cultural workbench saving');
assert(appJs.includes('data-editor-command="scaffold-cultural-workbench"'), 'preview app should expose cultural workbench scaffolding');
assert(appJs.includes('data-editor-command="add-cultural-work"'), 'preview app should expose cultural work creation');
assert(appJs.includes('buildCulturalWorkbenchPreview: buildCulturalWorkbenchPreview'), 'preview app facade should expose cultural workbench preview helper');
assert(appJs.includes('function buildTimeConfigFromGameSettings'), 'preview app should sync time config from gameSettings like the current editor');
assert(appJs.includes('function buildTimeWorkbenchPreview'), 'preview app should build calendar/time previews');
assert(appJs.includes('function renderTimeWorkbench'), 'preview app should render a dedicated calendar/time workbench');
assert(appJs.includes('function saveTimeWorkbench'), 'preview app should save calendar/time fields without raw JSON editing');
assert(appJs.includes('function scaffoldTimeWorkbench'), 'preview app should scaffold missing calendar/time defaults');
assert(appJs.includes('function addTimeEraNameRow'), 'preview app should add era-name rows to the calendar workbench');
assertRuntimeSurfacePanel('startYear', 'structured-workbench',
  'runtime audit should route top-level startYear to the time calendar workbench');
assertRuntimeSurfacePanel('startMonth', 'structured-workbench',
  'runtime audit should route top-level startMonth to the time calendar workbench');
assert(appJs.includes("return ['time', 'startYear', 'startMonth'].indexOf(field) >= 0"),
  'time workbench dispatch should recognize top-level startYear/startMonth aliases');
assert(appJs.includes('state.scenario.startMonth = current.startMonth'),
  'game settings save should preserve top-level startMonth');
assert(appJs.includes("if (time.startMonth !== '') state.scenario.startMonth"),
  'time workbench save should preserve top-level startMonth');
assert(appJs.includes('data-structured-kind="time-calendar"'), 'preview app should mark the time calendar workbench kind');
assert(appJs.includes('data-time-calendar-panel'), 'preview app should mark time calendar panels');
assert(appJs.includes('data-time-calendar-chart'), 'preview app should expose time calendar preview charts');
assert(appJs.includes('data-time-calendar-metric'), 'preview app should expose editable time calendar metrics');
assert(appJs.includes('data-time-calendar-list'), 'preview app should expose editable season and era-name lists');
assert(appJs.includes('data-time-era-row'), 'preview app should expose editable era-name rows');
assert(appJs.includes('data-editor-command="save-time-workbench"'), 'preview app should expose time calendar saving');
assert(appJs.includes('data-editor-command="scaffold-time-workbench"'), 'preview app should expose time calendar scaffolding');
assert(appJs.includes('data-editor-command="add-time-era-name"'), 'preview app should expose time calendar era-name creation');
assert(appJs.includes('buildTimeWorkbenchPreview: buildTimeWorkbenchPreview'), 'preview app facade should expose time calendar preview helper');
assert(appJs.includes('function isInstitutionSystemField'), 'preview app should detect institution system fields');
assert(appJs.includes('function institutionSystemDefaults'), 'preview app should provide institution system defaults');
assert(appJs.includes('function buildInstitutionSystemPreview'), 'preview app should build institution system previews');
assert(appJs.includes('function renderInstitutionSystemWorkbench'), 'preview app should render a dedicated institution system workbench');
assert(appJs.includes('function saveInstitutionSystemWorkbench'), 'preview app should save institution system fields without raw JSON editing');
assert(appJs.includes('function scaffoldInstitutionSystemWorkbench'), 'preview app should scaffold missing institution system defaults');
assert(appJs.includes('function addInstitutionSystemRow'), 'preview app should add rows to institution system lists');
assert(appJs.includes('data-structured-kind="institution-system"'), 'preview app should mark the institution system workbench kind');
assert(appJs.includes('data-institution-panel'), 'preview app should mark institution system panels');
assert(appJs.includes('data-institution-chart'), 'preview app should expose institution system preview charts');
assert(appJs.includes('data-institution-metric'), 'preview app should expose editable institution system metrics');
assert(appJs.includes('data-institution-row'), 'preview app should expose editable institution system rows');
assert(appJs.includes('data-institution-textarea'), 'preview app should expose editable institution system text fields');
assert(appJs.includes('data-editor-command="save-institution-system"'), 'preview app should expose institution system saving');
assert(appJs.includes('data-editor-command="scaffold-institution-system"'), 'preview app should expose institution system scaffolding');
assert(appJs.includes('data-editor-command="add-institution-row"'), 'preview app should expose institution system row creation');
assert(appJs.includes('buildInstitutionSystemPreview: buildInstitutionSystemPreview'), 'preview app facade should expose institution system preview helper');
assert(appJs.includes('function isScenarioFoundationField'), 'preview app should detect scenario foundation fields');
assert(appJs.includes('function buildScenarioFoundationPreview'), 'preview app should build scenario foundation previews');
assert(appJs.includes('function syncScenarioFoundationAliases'), 'preview app should sync old-editor foundation fields with runtime aliases');
assert(appJs.includes('function renderScenarioFoundationWorkbench'), 'preview app should render a scenario foundation workbench');
assert(appJs.includes('function saveScenarioFoundationWorkbench'), 'preview app should save scenario foundation fields without hopping across raw field editors');
assert(appJs.includes('function scaffoldScenarioFoundationWorkbench'), 'preview app should scaffold missing scenario foundation fields');
[
  'name', 'era', 'dynasty', 'role', 'emperor', 'background', 'overview', 'opening',
  'openingText', 'openingHook', 'startLocation', 'suggestions'
].forEach((field) => {
  assertRuntimeSurfacePanel(field, 'structured-workbench',
    'runtime audit should route scenario foundation field to the structured workbench: ' + field);
});
assertRuntimeSurfacePanel('scnStyle', 'structured-workbench',
  'runtime audit should route scenario style to the scenario foundation workbench');
assertRuntimeSurfacePanel('scnStyleRule', 'structured-workbench',
  'runtime audit should route scenario style rules to the scenario foundation workbench');
assert(appJs.includes('data-structured-kind="scenario-foundation"'), 'preview app should mark the scenario foundation workbench kind');
assert(appJs.includes('data-foundation-panel'), 'preview app should mark scenario foundation panels');
assert(appJs.includes('data-foundation-field'), 'preview app should expose editable scenario foundation short fields');
assert(appJs.includes('data-foundation-textarea'), 'preview app should expose editable scenario foundation long fields');
assert(appJs.includes('data-foundation-meter'), 'preview app should expose scenario foundation readiness meters');
assert(appJs.includes('data-foundation-alias'), 'preview app should expose old-editor/runtime alias status');
assert(appJs.includes('data-editor-command="save-scenario-foundation"'), 'preview app should expose scenario foundation saving');
assert(appJs.includes('data-editor-command="scaffold-scenario-foundation"'), 'preview app should expose scenario foundation scaffolding');
assert(appJs.includes('buildScenarioFoundationPreview: buildScenarioFoundationPreview'), 'preview app facade should expose scenario foundation preview helper');
assert(appJs.includes('function isReferenceSourceField'), 'preview app should detect reference/source material fields');
assert(appJs.includes('function buildReferenceSourcePreview'), 'preview app should build reference/source material previews');
assert(appJs.includes('function renderReferenceSourceWorkbench'), 'preview app should render a reference/source material workbench');
assert(appJs.includes('function saveReferenceSourceWorkbench'), 'preview app should save reference text, source files, file bodies, and opening letters');
assert(appJs.includes('function scaffoldReferenceSourceWorkbench'), 'preview app should scaffold missing reference/source material defaults');
assert(appJs.includes('function addReferenceSourceRow'), 'preview app should add reference/source material rows');
assert(appJs.includes('data-structured-kind="reference-source"'), 'preview app should mark the reference/source workbench kind');
assert(appJs.includes('data-reference-source-panel'), 'preview app should mark reference/source panels');
assert(appJs.includes('data-reference-source-chart'), 'preview app should expose reference/source preview charts');
assert(appJs.includes('data-reference-source-field'), 'preview app should expose editable reference/source fields');
assert(appJs.includes('data-reference-source-textarea'), 'preview app should expose editable reference/source textareas');
assert(appJs.includes('data-reference-source-row'), 'preview app should expose editable reference/source rows');
assert(appJs.includes('data-editor-command="save-reference-source"'), 'preview app should expose reference/source saving');
assert(appJs.includes('data-editor-command="scaffold-reference-source"'), 'preview app should expose reference/source scaffolding');
assert(appJs.includes('data-editor-command="add-reference-source"'), 'preview app should expose reference/source row creation');
assert(appJs.includes("document.querySelector('[data-structured-kind=\"reference-source\"]')) saveReferenceSourceWorkbench({ silent: true })"),
  'preview app should preserve reference/source form edits before adding another row');
assert(appJs.includes('buildReferenceSourcePreview: buildReferenceSourcePreview'), 'preview app facade should expose reference/source preview helper');
assert(appJs.includes('function isAiAuthoringField'), 'preview app should detect AI authoring fields');
assert(appJs.includes('function buildAiAuthoringPreview'), 'preview app should build AI authoring previews');
assert(appJs.includes('function renderAiAuthoringWorkbench'), 'preview app should render an AI authoring workbench');
assert(appJs.includes('function saveAiAuthoringWorkbench'), 'preview app should save AI flags, model requirements, prompt text, and presets');
assert(appJs.includes('function scaffoldAiAuthoringWorkbench'), 'preview app should scaffold missing AI authoring defaults');
assert(appJs.includes('function addAiPresetRow'), 'preview app should add AI preset rows');
assert(appJs.includes('data-structured-kind="ai-authoring"'), 'preview app should mark the AI authoring workbench kind');
assert(appJs.includes('data-ai-authoring-panel'), 'preview app should mark AI authoring panels');
assert(appJs.includes('data-ai-authoring-chart'), 'preview app should expose AI authoring preview charts');
assert(appJs.includes('data-ai-authoring-toggle'), 'preview app should expose editable AI authoring toggles');
assert(appJs.includes('data-ai-authoring-model-field'), 'preview app should expose editable model requirement fields');
assert(appJs.includes('data-ai-authoring-textarea'), 'preview app should expose editable AI prompt textareas');
assert(appJs.includes('data-ai-preset-row'), 'preview app should expose editable AI preset rows');
assert(appJs.includes('data-editor-command="save-ai-authoring"'), 'preview app should expose AI authoring saving');
assert(appJs.includes('data-editor-command="scaffold-ai-authoring"'), 'preview app should expose AI authoring scaffolding');
assert(appJs.includes('data-editor-command="add-ai-preset"'), 'preview app should expose AI preset creation');
assert(appJs.includes('buildAiAuthoringPreview: buildAiAuthoringPreview'), 'preview app facade should expose AI authoring preview helper');
assert(appJs.includes('function isExternalForceField'), 'preview app should detect external force fields');
assert(appJs.includes('function buildExternalForcesPreview'), 'preview app should build external force previews');
assert(appJs.includes('function renderExternalForcesWorkbench'), 'preview app should render an external forces workbench');
assert(appJs.includes('function saveExternalForcesWorkbench'), 'preview app should save external force rows');
assert(appJs.includes('function addExternalForceRow'), 'preview app should add external force rows');
assert(appJs.includes('data-structured-kind="external-forces"'), 'preview app should mark the external forces workbench kind');
assert(appJs.includes('data-external-forces-panel'), 'preview app should mark external forces panels');
assert(appJs.includes('data-external-forces-chart'), 'preview app should expose external forces preview charts');
assert(appJs.includes('data-external-force-row'), 'preview app should expose editable external force rows');
assert(appJs.includes('data-external-force-field'), 'preview app should expose editable external force fields');
assert(appJs.includes('data-editor-command="save-external-forces"'), 'preview app should expose external forces saving');
assert(appJs.includes('data-editor-command="add-external-force"'), 'preview app should expose external force creation');
assert(appJs.includes('data-external-force-empty'), 'external forces empty state should expose a stable starter marker');
assert(appJs.includes('data-external-force-template-field'), 'external forces empty state should preview starter force fields');
assert(appJs.includes('buildExternalForcesPreview: buildExternalForcesPreview'), 'preview app facade should expose external force preview helper');
assert(appJs.includes('function isRelationSeedField'), 'preview app should detect opening relation seed fields');
assert(appJs.includes('function buildRelationSeedPreview'), 'preview app should build opening relation seed previews');
assert(appJs.includes('function renderRelationSeedWorkbench'), 'preview app should render an opening relation seed workbench');
assert(appJs.includes('function saveRelationSeedWorkbench'), 'preview app should save opening relation seed rows');
assert(appJs.includes('function addRelationSeedRow'), 'preview app should add opening relation seed rows');
assert(appJs.includes("runtimeSurface('initialEnYuan',") && appJs.includes("runtimeSurface('initialEnYuan', '初始恩怨', '人物势力', 'peopleLineages', 'structured-workbench'"),
  'runtime audit should route initialEnYuan to the structured workbench');
assert(appJs.includes("runtimeSurface('initialPatronNetwork',") && appJs.includes("runtimeSurface('initialPatronNetwork', '初始靠山网络', '人物势力', 'peopleLineages', 'structured-workbench'"),
  'runtime audit should route initialPatronNetwork to the structured workbench');
assert(appJs.includes('data-structured-kind="relation-seeds"'), 'preview app should mark the opening relation seed workbench kind');
assert(appJs.includes('data-relation-seed-panel'), 'preview app should mark opening relation seed panels');
assert(appJs.includes('data-relation-seed-chart'), 'preview app should expose opening relation seed preview charts');
assert(appJs.includes('data-relation-seed-row'), 'preview app should expose editable opening relation seed rows');
assert(appJs.includes('data-relation-seed-field'), 'preview app should expose editable opening relation seed fields');
assert(appJs.includes('data-editor-command="save-relation-seeds"'), 'preview app should expose opening relation seed saving');
assert(appJs.includes('data-editor-command="add-relation-seed"'), 'preview app should expose opening relation seed creation');
assert(appJs.includes('buildRelationSeedPreview: buildRelationSeedPreview'), 'preview app facade should expose opening relation seed preview helper');
assert(appJs.includes('function collectBudgetDivisions'), 'preview app should collect fiscal/admin divisions for budget preview');
assert(appJs.includes('function buildFiscalBudgetPreview'), 'preview app should build a fiscal budget preview');
assert(appJs.includes('function renderFiscalBudgetPreview'), 'preview app should render fiscal budget preview inside config workbench');
assert(appJs.includes('data-budget-preview'), 'preview app should mark budget preview panels');
assert(appJs.includes('data-budget-region-row'), 'preview app should expose budget region contribution rows');
assert(appJs.includes('buildFiscalBudgetPreview: buildFiscalBudgetPreview'), 'preview app facade should expose fiscal budget preview helper');
assert(appJs.includes('function renderPromptWorkbench'), 'preview app should render long-form rule/prompt editing');
assert(appJs.includes('function savePromptWorkbench'), 'preview app should save prompt/rule text without raw JSON editing');
assert(appJs.includes('function restoreStructuredOriginal'), 'preview app should restore structured fields from the official snapshot');
assert(appJs.includes('function renderOfficeGovernanceWorkbench'), 'preview app should render a government office governance workbench');
assert(appJs.includes('function saveOfficeGovernanceWorkbench'), 'preview app should save office posts, appointment rules, and costs');
assert(appJs.includes('function addOfficeCostVariable'), 'preview app should add office cost variables');
assert(appJs.includes('function addOfficePositionRow'), 'preview app should add office position rows');
assert(appJs.includes('function collectOfficePositionRows'), 'preview app should flatten office positions for authoring');
assert(appJs.includes("if (field === 'officeTree' || field === 'officeConfig') return renderOfficeGovernanceWorkbench(field, value)"),
  'officeConfig should route to the office governance workbench instead of the generic fallback');
const officeGovernanceWorkbenchSource = appJs.slice(
  appJs.indexOf('function renderOfficeGovernanceWorkbench'),
  appJs.indexOf('function renderMapBindingWorkbench')
);
assert(officeGovernanceWorkbenchSource.includes('state.scenario.officeTree'),
  'officeConfig governance route should still render the saved officeTree hierarchy');
assert(appJs.includes('function renderPresetRelationsWorkbench'), 'preview app should render a preset relations workbench');
assert(appJs.includes('function savePresetRelationsWorkbench'), 'preview app should save preset relation edits');
assert(appJs.includes('function addPresetRelationRow'), 'preview app should add preset relation rows');
assert(appJs.includes("if (field === 'presetRelations') return renderPresetRelationsWorkbench(value)"),
  'presetRelations should route to a dedicated preset relations workbench instead of the generic fallback');
assert(appJs.includes('data-structured-kind="preset-relations"'), 'preset relations workbench should expose a stable structured kind marker');
assert(appJs.includes("if (field === 'presetRelations') return { npc: [], faction: [] }"),
  'presetRelations missing-field template should preserve npc/faction relation buckets');
assert(appJs.includes('function renderMapBindingWorkbench'), 'preview app should render a visual map binding workbench');
assert(appJs.includes('function saveMapBindings'), 'preview app should save map owner/admin bindings from row controls');
assert(appJs.includes('function normalizeMapBindings'), 'preview app should smart-fill map bindings');
assert(appJs.includes('function clearSelectedMapBindings'), 'preview app should clear checked map bindings');
assert(appJs.includes('function syncMapMirror'), 'preview app should keep map and mapData bindings mirrored');
assert(appJs.includes('function normalizeRegionBinding'), 'preview app should normalize individual map region bindings');
[
  'save-game-settings',
  'save-player-info',
  'sync-player-profile',
  'save-relation-matrix',
  'add-relation-row',
  'save-character-relations',
  'add-character-relation',
  'jump-character-relation-node',
  'save-family-lineages',
  'add-family-lineage',
  'jump-family-member',
  'save-trait-definitions',
  'add-trait-definition',
  'jump-trait-usage',
  'save-society-influence',
  'add-society-row',
  'jump-society-leader',
  'save-item-inventory',
  'add-item-row',
  'jump-item-owner',
  'save-city-registry',
  'add-city-row',
  'jump-city-region',
  'save-interest-groups',
  'add-interest-group',
  'jump-interest-group-member',
  'save-imperial-edicts',
  'add-imperial-edict',
  'jump-imperial-edict-target',
  'save-variable-table',
  'add-variable-row',
  'save-tree-workbench',
  'add-tree-node',
  'save-event-library',
  'add-event-library',
  'save-goal-conditions',
  'add-goal-condition',
  'save-rigid-triggers',
  'add-rigid-trigger',
  'save-timeline-workbench',
  'add-timeline-row',
  'save-config-workbench',
  'add-config-array-row',
  'save-political-actions',
  'add-political-action',
  'jump-political-action-variable',
  'save-narrative-rules',
  'add-narrative-rule',
  'jump-narrative-rule-variable',
  'save-world-state',
  'scaffold-world-state',
  'save-court-life',
  'add-court-life-row',
  'save-military-forces',
  'add-military-row',
  'save-diplomacy-war',
  'add-diplomacy-war-row',
  'save-economy-config',
  'scaffold-economy-config',
  'save-population-config',
  'scaffold-population-config',
  'add-population-category',
  'save-environment-config',
  'scaffold-environment-config',
  'add-environment-region',
  'add-environment-disaster',
  'save-cultural-workbench',
  'scaffold-cultural-workbench',
  'add-cultural-work',
  'save-time-workbench',
  'scaffold-time-workbench',
  'add-time-era-name',
  'save-institution-system',
  'scaffold-institution-system',
  'add-institution-row',
  'save-scenario-foundation',
  'scaffold-scenario-foundation',
  'save-reference-source',
  'scaffold-reference-source',
  'add-reference-source',
  'save-ai-authoring',
  'scaffold-ai-authoring',
  'add-ai-preset',
  'save-external-forces',
  'add-external-force',
  'save-prompt-workbench',
  'restore-structured-original',
  'save-office-governance',
  'add-office-cost-variable',
  'add-office-position-row',
  'save-map-bindings',
  'normalize-map-bindings',
  'clear-selected-map-bindings'
].forEach((command) => {
  assert(appJs.includes('data-editor-command="' + command + '"'), 'preview app should expose structured command ' + command);
});
['game-settings', 'scenario-foundation', 'reference-source', 'ai-authoring', 'external-forces', 'event-library', 'player-sync', 'relation-matrix', 'character-relations', 'family-lineages', 'trait-dictionary', 'society-influence', 'item-inventory', 'city-registry', 'interest-groups', 'imperial-edicts', 'political-actions', 'narrative-rules', 'world-state', 'court-life', 'military-forces', 'diplomacy-war', 'economy-config', 'population-config', 'environment-config', 'cultural-workbench', 'time-calendar', 'institution-system', 'variable-table', 'tree-editor', 'goal-conditions', 'rigid-triggers', 'timeline-editor', 'config-editor', 'prompt-editor', 'office-governance', 'map-binding'].forEach((kind) => {
assert(appJs.includes('data-structured-kind="' + kind + '"'), 'preview app should mark structured workbench kind ' + kind);
});
['office-governance-layout', 'office-policy-panel', 'office-position-row', 'office-cost-row'].forEach((className) => {
  assert(html.includes(className), 'preview should include office governance UI class ' + className);
});
['tree-graph-panel', 'tree-graph-svg', 'tree-graph-node', 'tree-graph-edge', 'tree-graph-legend'].forEach((className) => {
  assert(html.includes(className), 'preview should include tree dependency graph UI class ' + className);
});
['event-timeline-panel', 'event-timeline-summary', 'event-timeline-row', 'event-timeline-marker', 'event-timeline-lane'].forEach((className) => {
  assert(html.includes(className), 'preview should include event timeline preview UI class ' + className);
});
['event-library-panel', 'event-library-chart', 'event-library-row', 'event-library-fields', 'event-library-chip'].forEach((className) => {
  assert(html.includes(className), 'preview should include event library workbench UI class ' + className);
});
['goal-condition-panel', 'goal-condition-summary', 'goal-condition-grid', 'goal-condition-row', 'goal-condition-textareas'].forEach((className) => {
  assert(html.includes(className), 'preview should include goal condition workbench UI class ' + className);
});
['rigid-trigger-panel', 'rigid-trigger-summary', 'rigid-trigger-row', 'rigid-trigger-fields', 'rigid-trigger-effect'].forEach((className) => {
  assert(html.includes(className), 'preview should include rigid trigger workbench UI class ' + className);
});
['timeline-workbench-panel', 'timeline-workbench-summary', 'timeline-workbench-lanes', 'timeline-workbench-row', 'timeline-workbench-fields'].forEach((className) => {
  assert(html.includes(className), 'preview should include timeline workbench UI class ' + className);
});
['relation-graph-panel', 'relation-graph-svg', 'relation-graph-node', 'relation-graph-edge', 'relation-graph-legend'].forEach((className) => {
  assert(html.includes(className), 'preview should include faction relation graph UI class ' + className);
});
['character-relation-panel', 'character-relation-summary', 'character-relation-graph', 'character-relation-row', 'character-relation-fields'].forEach((className) => {
  assert(html.includes(className), 'preview should include character relation workbench UI class ' + className);
});
['family-lineage-panel', 'family-lineage-summary', 'family-lineage-graph', 'family-lineage-row', 'family-lineage-fields'].forEach((className) => {
  assert(html.includes(className), 'preview should include family lineage workbench UI class ' + className);
});
['trait-dictionary-panel', 'trait-definition-row', 'trait-definition-fields', 'trait-usage-panel', 'trait-effect-editor'].forEach((className) => {
  assert(html.includes(className), 'preview should include trait dictionary workbench UI class ' + className);
});
['society-influence-panel', 'society-influence-chart', 'society-influence-row', 'society-influence-fields', 'society-influence-bar'].forEach((className) => {
  assert(html.includes(className), 'preview should include society influence workbench UI class ' + className);
});
['item-inventory-panel', 'item-inventory-chart', 'item-inventory-row', 'item-inventory-fields', 'item-type-chip'].forEach((className) => {
  assert(html.includes(className), 'preview should include item inventory workbench UI class ' + className);
});
['city-registry-panel', 'city-registry-chart', 'city-registry-row', 'city-registry-fields', 'city-type-chip'].forEach((className) => {
  assert(html.includes(className), 'preview should include city registry workbench UI class ' + className);
});
['interest-group-panel', 'interest-group-chart', 'interest-group-row', 'interest-group-fields', 'interest-type-chip'].forEach((className) => {
  assert(html.includes(className), 'preview should include interest group workbench UI class ' + className);
});
['imperial-edict-panel', 'imperial-edict-chart', 'imperial-edict-row', 'imperial-edict-fields', 'edict-type-chip'].forEach((className) => {
  assert(html.includes(className), 'preview should include imperial edict workbench UI class ' + className);
});
['political-action-panel', 'political-action-chart', 'political-action-row', 'political-action-fields', 'political-action-chip'].forEach((className) => {
  assert(html.includes(className), 'preview should include scheme and decision workbench UI class ' + className);
});
['narrative-rule-panel', 'narrative-rule-chart', 'narrative-rule-row', 'narrative-rule-fields', 'narrative-rule-chip'].forEach((className) => {
  assert(html.includes(className), 'preview should include chronicle and event constraint workbench UI class ' + className);
});
['world-state-panel', 'world-state-chart', 'world-state-metric', 'world-state-fields', 'world-state-chip'].forEach((className) => {
  assert(html.includes(className), 'preview should include era and world setting workbench UI class ' + className);
});
['court-life-panel', 'court-life-chart', 'court-life-row', 'court-life-fields', 'court-life-chip'].forEach((className) => {
  assert(html.includes(className), 'preview should include harem and palace workbench UI class ' + className);
});
['military-forces-panel', 'military-readiness-chart', 'military-force-row', 'military-force-fields', 'military-force-chip'].forEach((className) => {
  assert(html.includes(className), 'preview should include military forces workbench UI class ' + className);
});
['diplomacy-war-panel', 'diplomacy-war-chart', 'diplomacy-war-row', 'diplomacy-war-fields', 'diplomacy-war-chip'].forEach((className) => {
  assert(html.includes(className), 'preview should include war and diplomacy workbench UI class ' + className);
});
['economy-config-panel', 'economy-config-chart', 'economy-metric', 'economy-config-fields', 'economy-config-chip'].forEach((className) => {
  assert(html.includes(className), 'preview should include economy config workbench UI class ' + className);
});
['population-config-panel', 'population-config-chart', 'population-metric', 'population-category-row', 'population-config-chip'].forEach((className) => {
  assert(html.includes(className), 'preview should include population config workbench UI class ' + className);
});
['environment-config-panel', 'environment-config-chart', 'environment-metric', 'environment-region-row', 'environment-disaster-row', 'environment-config-chip'].forEach((className) => {
  assert(html.includes(className), 'preview should include environment config workbench UI class ' + className);
});
['cultural-panel', 'cultural-chart', 'cultural-metric', 'cultural-work-row', 'cultural-chip'].forEach((className) => {
  assert(html.includes(className), 'preview should include cultural workbench UI class ' + className);
});
['time-calendar-panel', 'time-calendar-chart', 'time-calendar-metric', 'time-calendar-list', 'time-calendar-chip'].forEach((className) => {
  assert(html.includes(className), 'preview should include time calendar workbench UI class ' + className);
});
['institution-panel', 'institution-chart', 'institution-metric', 'institution-row', 'institution-chip'].forEach((className) => {
  assert(html.includes(className), 'preview should include institution system workbench UI class ' + className);
});
['foundation-panel', 'foundation-chart', 'foundation-field', 'foundation-meter', 'foundation-alias'].forEach((className) => {
  assert(html.includes(className), 'preview should include scenario foundation workbench UI class ' + className);
});
['reference-source-panel', 'reference-source-chart', 'reference-source-field', 'reference-source-row', 'reference-source-chip'].forEach((className) => {
  assert(html.includes(className), 'preview should include reference/source workbench UI class ' + className);
});
['ai-authoring-panel', 'ai-authoring-chart', 'ai-authoring-metric', 'ai-preset-row', 'ai-authoring-chip'].forEach((className) => {
  assert(html.includes(className), 'preview should include AI authoring workbench UI class ' + className);
});
['external-forces-panel', 'external-forces-chart', 'external-force-row', 'external-force-fields', 'external-force-chip'].forEach((className) => {
  assert(html.includes(className), 'preview should include external forces workbench UI class ' + className);
});
['relation-seed-panel', 'relation-seed-chart', 'relation-seed-row', 'relation-seed-fields', 'relation-seed-chip'].forEach((className) => {
  assert(html.includes(className), 'preview should include opening relation seed workbench UI class ' + className);
});
['map-binding-layout', 'map-mini-svg', 'map-region-row', 'map-legend'].forEach((className) => {
  assert(html.includes(className), 'preview should include map binding UI class ' + className);
});
['budget-preview-panel', 'budget-kpi-grid', 'budget-region-row', 'budget-risk-list'].forEach((className) => {
  assert(html.includes(className), 'preview should include fiscal budget preview UI class ' + className);
});
assert(appJs.includes("detailPanelBlock('entity-list'"), 'preview app should render module entity lists');
assert(appJs.includes("detailPanelBlock('specialist-editor'"), 'preview app should render a specialist entity editor panel');
assert(appJs.includes('function renderSpecialistEditor'), 'preview app should implement specialist entity forms');
assert(appJs.includes('function saveSpecialistEntity'), 'preview app should save specialist entity fields');
assert(appJs.includes('function buildEntityTemplate'), 'preview app should create typed entity templates');
assert(appJs.includes('function runBatchNormalize'), 'preview app should provide batch normalization');
assert(appJs.includes('data-specialist-field'), 'preview app specialist forms should expose editable field inputs');
assert(appJs.includes('function renderSpecialistEmptyState'), 'preview app should render a specialist empty-state starter for blank entity lists');
const specialistEditorSource = appJs.slice(
  appJs.indexOf('function renderSpecialistEditor'),
  appJs.indexOf('function renderReferenceRows')
);
assert(specialistEditorSource.includes('renderSpecialistEmptyState(field, value, timelineHtml)'),
  'specialist editor should route empty arrays to the starter empty state instead of a dead fallback');
assert(appJs.includes('data-specialist-empty'), 'specialist empty state should expose a stable DOM marker');
assert(appJs.includes('data-specialist-template-field'), 'specialist empty state should preview editable template fields');
assert(html.includes('.specialist-empty'), 'preview CSS should style specialist empty-state starters');
assert(appJs.includes('data-event-library-empty'), 'event library empty state should expose a stable starter marker');
assert(appJs.includes('data-event-library-template-field'), 'event library empty state should preview its first event template fields');
assert(appJs.includes('data-goal-condition-empty'), 'goal condition empty state should expose a stable starter marker');
assert(appJs.includes('data-goal-condition-template-field'), 'goal condition empty state should preview its first goal template fields');
assert(appJs.includes('data-timeline-empty'), 'timeline empty state should expose a stable starter marker');
assert(appJs.includes('data-timeline-template-field'), 'timeline empty state should preview its first timeline template fields');
assert(appJs.includes('data-relation-seed-empty'), 'opening relation seed empty state should expose a stable starter marker');
assert(appJs.includes('data-relation-seed-template-field'), 'opening relation seed empty state should preview its first relation template fields');
assert(appJs.includes('data-rigid-trigger-empty'), 'rigid trigger empty state should expose a stable starter marker');
assert(appJs.includes('data-rigid-trigger-template-field'), 'rigid trigger empty state should preview its first trigger template fields');
assert(appJs.includes('data-reference-source-empty'), 'reference/source empty state should expose a stable starter marker');
assert(appJs.includes('data-reference-source-template-field'), 'reference/source empty state should preview starter source and letter fields');
assert(appJs.includes('data-ai-preset-empty'), 'AI preset empty state should expose a stable starter marker');
assert(appJs.includes('data-ai-preset-template-field'), 'AI preset empty state should preview starter preset fields');
assert(html.includes('.event-library-empty'), 'preview CSS should style event library empty-state starters');
assert(html.includes('.goal-condition-empty'), 'preview CSS should style goal condition empty-state starters');
assert(html.includes('.timeline-workbench-empty'), 'preview CSS should style timeline empty-state starters');
assert(html.includes('.relation-seed-empty'), 'preview CSS should style opening relation seed empty-state starters');
assert(html.includes('.rigid-trigger-empty'), 'preview CSS should style rigid trigger empty-state starters');
assert(html.includes('.reference-source-empty'), 'preview CSS should style reference/source empty-state starters');
assert(html.includes('.ai-preset-empty'), 'preview CSS should style AI preset empty-state starters');
assert(html.includes('.external-force-empty'), 'preview CSS should style external force empty-state starters');
assert(html.includes('.military-force-empty'), 'preview CSS should style military force empty-state starters');
assert(html.includes('.diplomacy-war-empty'), 'preview CSS should style war and diplomacy empty-state starters');
assert(html.includes('.config-default-starter'), 'preview CSS should style config default-starter callouts');
assert(appJs.includes('data-editor-command="batch-normalize"'), 'preview app should expose a batch normalize command');
assert(appJs.includes('linkedChars') && appJs.includes('linkedFactions'), 'preview app should keep event character/faction link authoring fields');
assert(appJs.includes('function renderScenarioDashboard'), 'preview app should render live scenario dashboard metrics');
assert(appJs.includes('data-live-metric'), 'preview app should update live metric nodes');
assert(appJs.includes("pill.dataset.source = state.dirty ? 'draft' : 'official'"), 'preview app should mark whether the current scenario is a draft or official baseline');
assert(appJs.includes("document.querySelector('.rail-head span')"), 'preview app should update the module rail blueprint count');
assert(appJs.includes("'蓝图 ' + covered + '/' + expected.length"), 'preview app should show dynamic blueprint coverage in the scenario pill');
assert(appJs.includes("countCollection(state.scenario.characters) + ' 人物'"), 'preview app should show live character count in the scenario pill');
assert(appJs.includes("brandSub.textContent = state.dirty ?"), 'preview app should update the brand subtitle for local drafts');
assert(appJs.includes('WORKBENCH_PANELS'), 'preview app should define field workbench tabs');
assert(appJs.includes('function setWorkbenchPanel'), 'preview app should switch field workbench panels');
assert(appJs.includes('function renderWorkbenchTabs'), 'preview app should render field workbench tab controls');
assert(appJs.includes('data-editor-command="set-workbench-panel"'), 'preview app should expose workbench panel switching');
assert(appJs.includes('id="workbench-panel-select"'), 'preview app should expose a compact workbench selector');
assert(appJs.includes('data-editor-control="workbench-panel-select"'), 'preview app should handle workbench selector changes');
assert(appJs.includes('data-active-workbench'), 'preview app should mark active field workbench blocks');
assert(html.includes('.module-detail > .workbench-mode-bar') && html.includes('.module-detail > .detail-block:not([data-panel])'),
  'preview app should visually place the active workbench before the full field cloud');
assert(appJs.includes('setWorkbenchPanel: setWorkbenchPanel'), 'preview app facade should expose workbench panel switching');
assert(html.includes('workbench-mode-bar'), 'preview should style the sticky workbench mode bar');
assert(html.includes('workbench-switcher'), 'preview should style the compact workbench selector');
assert(html.includes('workbench-tabs'), 'preview should style field workbench tabs');
assert(html.includes('detail-block[data-active-workbench="false"]'), 'preview should hide inactive field workbench panels');
assert(appJs.includes('function buildScenarioProductionChecklist'), 'preview app should build a production checklist');
assert(appJs.includes('function applyProductionTaskFix'), 'preview app should apply production task quick fixes');
assert(appJs.includes('function applyAllProductionTaskFixes'), 'preview app should apply all production task quick fixes');
assert(appJs.includes('function prepareReleaseReadiness'), 'preview app should prepare release-ready blueprint and runtime fields');
assert(appJs.includes('var focusReleaseGate = !next'), 'all-task quick fix should keep the completed release view focused');
assert(appJs.includes("if (focusReleaseGate) focusRuntimePanel('preflight-gate')"), 'completed all-task quick fix should focus the preflight gate');
assert(appJs.includes('function ensureProductionIdentity'), 'preview app should quick-fix missing scenario identity');
assert(appJs.includes('function ensureProductionMapAdmin'), 'preview app should quick-fix map/admin production tasks');
assert(appJs.includes('function ensureProductionMapScaffold'), 'preview app should create a minimum editable map scaffold');
assert(appJs.includes('scenario-editor-reset-map-scaffold'), 'preview app should mark generated map scaffolds');
assert(appJs.includes('adminBinding'), 'preview app should create map regions with admin bindings');
assert(appJs.includes('data-editor-command="apply-production-task-fix"'), 'preview app should expose production task fix commands');
assert(appJs.includes('data-editor-command="apply-all-production-task-fixes"'), 'preview app should expose all-task production fix command');
assert(appJs.includes('data-editor-command="prepare-release-readiness"'), 'preview app should expose release readiness preparation command');
assert(appJs.includes('applyProductionTaskFix: applyProductionTaskFix'), 'preview app facade should expose production task fixes');
assert(appJs.includes('applyAllProductionTaskFixes: applyAllProductionTaskFixes'), 'preview app facade should expose all production task fixes');
assert(appJs.includes('prepareReleaseReadiness: prepareReleaseReadiness'), 'preview app facade should expose release readiness preparation');
assert(appJs.includes('function renderProductionDashboard'), 'preview app should render a production dashboard');
assert(appJs.includes('function jumpProductionTask'), 'preview app should jump from production tasks to editor panels');
assert(appJs.includes('function scaffoldProductionMinimum'), 'preview app should scaffold a minimum playable scenario structure');
assert(appJs.includes('SCENARIO_STARTER_TEMPLATES'), 'preview app should define new-scenario starter templates');
assert(appJs.includes('function buildStarterScenario'), 'preview app should build starter scenario data');
assert(appJs.includes('function startNewScenario'), 'preview app should start a new scenario from a template');
assert(appJs.includes('data-panel="new-scenario-starter"'), 'preview app should mount a new-scenario starter panel');
assert(appJs.includes('id="new-scenario-starter-list"'), 'preview app should render starter template choices');
assert(appJs.includes("var runtimeAnchor = document.querySelector('.main-stack .hero-board') || bottom"),
  'preview app should mount the implemented runtime workbench inside the main authoring stack');
assert(appJs.includes("runtimeAnchor.insertAdjacentHTML(runtimePosition"),
  'preview app should insert runtime workbench next to the main authoring flow');
assert(appJs.includes('data-editor-command="create-new-scenario"'), 'preview app should expose a create-new-scenario command');
assert(appJs.includes('data-scenario-template'), 'preview app should identify the selected starter template');
assert(appJs.includes('startNewScenario: startNewScenario'), 'preview app facade should expose new scenario creation');
assert(appJs.includes('starterTemplates: SCENARIO_STARTER_TEMPLATES'), 'preview app facade should expose starter template metadata');
assert(appJs.includes('CREATOR_WORKFLOW_STEPS'), 'preview app should define a creator workflow sequence');
assert(appJs.includes('function buildCreatorWorkflow'), 'preview app should build dynamic creator workflow state');
assert(appJs.includes('function renderCreatorWorkflow'), 'preview app should render the creator workflow navigator');
assert(appJs.includes('function activateCreatorWorkflowStep'), 'preview app should activate a selected workflow step');
assert(appJs.includes('function continueCreatorWorkflow'), 'preview app should continue to the next incomplete workflow step');
assert(appJs.includes('function applyCreatorWorkflowStep'), 'preview app should apply fixes for a selected workflow step');
assert(appJs.includes('function applyNextCreatorWorkflow'), 'preview app should apply fixes for the next incomplete workflow step');
assert(appJs.includes('data-panel="creator-workflow"'), 'preview app should mount creator workflow navigation');
assert(appJs.includes('id="creator-workflow-list"'), 'preview app should render creator workflow rows');
assert(appJs.includes('data-workflow-step'), 'preview app should mark workflow steps for QA');
assert(appJs.includes('data-workflow-next'), 'preview app should mark the next workflow step');
assert(appJs.includes('data-editor-command="continue-creator-workflow"'), 'preview app should expose a next-step workflow command');
assert(appJs.includes('data-editor-command="apply-creator-workflow-step"'), 'preview app should expose workflow step fix commands');
assert(appJs.includes('data-editor-command="apply-next-creator-workflow"'), 'preview app should expose next-step fix commands');
assert(appJs.includes('buildCreatorWorkflow: buildCreatorWorkflow'), 'preview app facade should expose creator workflow state');
assert(appJs.includes('renderCreatorWorkflow: renderCreatorWorkflow'), 'preview app facade should expose creator workflow rendering');
assert(appJs.includes('activateCreatorWorkflowStep: activateCreatorWorkflowStep'), 'preview app facade should expose workflow step activation');
assert(appJs.includes('continueCreatorWorkflow: continueCreatorWorkflow'), 'preview app facade should expose next-step workflow continuation');
assert(appJs.includes('applyCreatorWorkflowStep: applyCreatorWorkflowStep'), 'preview app facade should expose workflow step fix helper');
assert(appJs.includes('applyNextCreatorWorkflow: applyNextCreatorWorkflow'), 'preview app facade should expose next-step fix helper');
assert(appJs.includes('data-panel="production-dashboard"'), 'preview app should mount the production dashboard panel');
assert(appJs.includes('id="production-dashboard-list"'), 'preview app should render production dashboard rows');
assert(appJs.includes('data-editor-command="jump-production-task"'), 'preview app should expose production task jump commands');
assert(appJs.includes('data-editor-command="scaffold-production-minimum"'), 'preview app should expose one-click production scaffolding');
assert(appJs.includes('buildScenarioProductionChecklist: buildScenarioProductionChecklist'), 'preview app facade should expose production checklist builder');
assert(appJs.includes('scaffoldProductionMinimum: scaffoldProductionMinimum'), 'preview app facade should expose production scaffolding');
assert(appJs.includes('RUNTIME_FIELD_SURFACES'), 'preview app should define formal runtime field surfaces');
assert(appJs.includes("runtimeSurface('engineConstants'"), 'runtime audit should cover engine constants from formal start');
assert(appJs.includes("runtimeSurface('imperialEdicts'"), 'runtime audit should cover initial imperial edicts');
assert(appJs.includes("runtimeSurface('initialEnYuan'"), 'runtime audit should cover Shaosong initial en-yuan records');
assert(appJs.includes("runtimeSurface('tinyi'"), 'runtime audit should cover the current Tianqi tinyi field');
assert(appJs.includes('function buildRuntimeFieldAudit'), 'preview app should build a formal runtime field audit');
assert(appJs.includes('function renderRuntimeFieldAudit'), 'preview app should render the formal runtime audit');
assert(appJs.includes('function jumpRuntimeFieldAuditTarget'), 'preview app should jump from runtime audit rows into editing');
assert(appJs.includes('runtimeAuditQuery'), 'preview app state should keep runtime audit search query');
assert(appJs.includes('runtimeAuditFilter'), 'preview app state should keep runtime audit filter');
assert(appJs.includes('RUNTIME_AUDIT_FILTERS'), 'preview app should define runtime audit filter chips');
assert(appJs.includes('function filterRuntimeAuditRows'), 'preview app should filter runtime audit rows');
assert(appJs.includes('function setRuntimeAuditFilter'), 'preview app should switch runtime audit filters');
assert(appJs.includes('function setRuntimeAuditQuery'), 'preview app should update runtime audit search');
assert(appJs.includes('function createRuntimeAuditFields'), 'preview app should batch-create runtime audit fields');
assert(appJs.includes('function moduleFieldsForDetail'), 'preview app should allow runtime-only fields to appear in the detail editor');
assert(appJs.includes('data-panel="runtime-field-audit"'), 'preview app should mount a formal runtime field audit panel');
assert(appJs.includes('id="runtime-field-search"'), 'preview app should render runtime audit search input');
assert(appJs.includes('id="runtime-field-audit-list"'), 'preview app should render a runtime field audit list');
assert(appJs.includes('data-editor-command="jump-runtime-field"'), 'preview app should expose runtime field jump commands');
assert(appJs.includes('data-editor-command="set-runtime-audit-filter"'), 'preview app should expose runtime audit filter commands');
assert(appJs.includes('data-editor-command="create-runtime-audit-fields"'), 'preview app should expose runtime audit batch-create commands');
assert(appJs.includes('buildRuntimeFieldAudit: buildRuntimeFieldAudit'), 'preview app facade should expose runtime audit builder');
assert(appJs.includes('jumpRuntimeFieldAuditTarget: jumpRuntimeFieldAuditTarget'), 'preview app facade should expose runtime field jump helper');
assert(appJs.includes('setRuntimeAuditFilter: setRuntimeAuditFilter'), 'preview app facade should expose runtime audit filter switching');
assert(appJs.includes('createRuntimeAuditFields: createRuntimeAuditFields'), 'preview app facade should expose runtime audit batch creation');
assert(html.includes('production-task-row'), 'preview should style production task rows');
assert(html.includes('production-score'), 'preview should style production readiness score');
assert(html.includes('production-task-actions'), 'preview should style production task action buttons');
assert(html.includes('production-actions'), 'preview should style production dashboard batch actions');
assert(html.includes('creator-workflow-panel'), 'preview should style the creator workflow panel');
assert(html.includes('workflow-step-card'), 'preview should style workflow step cards');
assert(html.includes('workflow-summary'), 'preview should style workflow summary');
assert(html.includes('workflow-summary-actions'), 'preview should style workflow summary actions');
assert(html.includes('workflow-step-actions'), 'preview should style workflow step action rows');
assert(html.includes('starter-template-panel'), 'preview should style the new-scenario starter panel');
assert(html.includes('starter-template-grid'), 'preview should style starter template choices');
assert(html.includes('starter-template-card'), 'preview should style starter template cards');
assert(html.includes('runtime-field-row'), 'preview should style runtime field audit rows');
assert(html.includes('runtime-field-summary'), 'preview should style runtime field audit summaries');
assert(html.includes('runtime-field-note'), 'preview should style runtime field audit notes');
assert(html.includes('runtime-audit-toolbar'), 'preview should style runtime audit toolbar');
assert(html.includes('runtime-audit-filter'), 'preview should style runtime audit filters');
assert(html.includes('runtime-audit-actions'), 'preview should style runtime audit batch actions');
assert(appJs.includes('function buildReferenceReport'), 'preview app should build entity reference reports');
assert(appJs.includes('function renderReferenceInspector'), 'preview app should render reference inspector panels');
assert(appJs.includes('function buildGlobalSearchIndex'), 'preview app should build a global scenario search index');
assert(appJs.includes('function runGlobalSearch'), 'preview app should search across fields and entities');
assert(appJs.includes('function renderGlobalSearch'), 'preview app should render a global search panel');
assert(appJs.includes('function jumpToSearchResult'), 'preview app should jump from global search results to fields/entities');
assert(appJs.includes('globalSearchQuery'), 'preview app state should keep global search query');
assert(appJs.includes('data-panel="global-search"'), 'preview app should mount a global search panel');
assert(appJs.includes('id="global-search-input"'), 'preview app should provide a global search input');
assert(appJs.includes('id="global-search-results"'), 'preview app should render global search results');
assert(appJs.includes('data-editor-command="jump-global-search"'), 'preview app should expose global search result jumps');
assert(appJs.includes('CREATOR_SHORTCUTS'), 'preview app should define actionable creator shortcuts');
assert(appJs.includes('function renderCreatorShortcuts'), 'preview app should render creator shortcut commands');
assert(appJs.includes('function jumpFieldWorkbench'), 'preview app should jump shortcuts into field workbenches');
assert(appJs.includes('function focusRuntimePanel'), 'preview app should focus runtime workbench panels');
assert(appJs.includes("command: 'jump-field-workbench'"), 'preview app should expose shortcut field jumps');
assert(appJs.includes("command: 'focus-runtime-panel'"), 'preview app should expose shortcut runtime panel jumps');
assert(appJs.includes('renderCreatorShortcuts: renderCreatorShortcuts'), 'preview app facade should expose shortcut rendering');
assert(appJs.includes('jumpFieldWorkbench: jumpFieldWorkbench'), 'preview app facade should expose field workbench jumps');
assert(appJs.includes('focusRuntimePanel: focusRuntimePanel'), 'preview app facade should expose runtime panel focus');
assert(html.includes('shortcut-actions'), 'preview should style shortcut action controls');
assert(html.includes('data-runtime-focus="true"'), 'preview should style focused runtime panels');
assert(appJs.includes("detailPanelBlock('reference-inspector'"), 'preview app should mount a reference inspector panel');
assert(appJs.includes('data-reference-row'), 'preview app should render trackable reference rows');
assert(appJs.includes('data-ref-jump-field'), 'preview app should support jumping to referenced entities');
assert(appJs.includes('data-editor-command="validate-references"'), 'preview app should expose reference validation command');
assert(appJs.includes('buildReferenceReport: buildReferenceReport'), 'preview app facade should expose reference report helper');
assert(appJs.includes('function collectMissingReferences'), 'preview app should collect missing references globally');
assert(appJs.includes('function createReferencePlaceholder'), 'preview app should create placeholder entities for missing references');
assert(appJs.includes('function createAllReferencePlaceholders'), 'preview app should batch-create placeholders for missing references');
assert(appJs.includes('function renderReferenceRepairWorkbench'), 'preview app should render a reference repair workbench');
assert(appJs.includes('data-panel="reference-repair-workbench"'), 'preview app should mount a reference repair workbench');
assert(appJs.includes('id="reference-repair-list"'), 'preview app should render missing references in a repair list');
assert(appJs.includes('data-editor-command="create-reference-placeholder"'), 'preview app should expose placeholder creation for missing refs');
assert(appJs.includes('data-editor-command="create-all-reference-placeholders"'), 'preview app should expose batch placeholder creation for missing refs');
assert(appJs.includes('data-ref-batch-kind'), 'preview app should identify reference placeholder batch scope');
assert(appJs.includes('collectMissingReferences: collectMissingReferences'), 'preview app facade should expose missing reference collection');
assert(appJs.includes('createReferencePlaceholder: createReferencePlaceholder'), 'preview app facade should expose placeholder creation');
assert(appJs.includes('createAllReferencePlaceholders: createAllReferencePlaceholders'), 'preview app facade should expose batch placeholder creation');
assert(html.includes('reference-repair-actions'), 'preview should style reference repair batch actions');
assert(appJs.includes('function parseBulkRows'), 'preview app should parse pasted bulk rows');
assert(appJs.includes('function previewBulkImport'), 'preview app should preview bulk array imports');
assert(appJs.includes('function applyBulkImport'), 'preview app should apply reviewed bulk imports');
assert(appJs.includes('function exportBulkField'), 'preview app should export the current array field');
assert(appJs.includes('function renderBulkDataWorkbench'), 'preview app should render a bulk data workbench');
assert(appJs.includes("detailPanelBlock('bulk-data-workbench'"), 'preview app should mount a bulk data workbench');
assert(appJs.includes('id="bulk-import-input"'), 'preview app should provide a bulk import input');
assert(appJs.includes('id="bulk-import-preview"'), 'preview app should render a bulk import preview');
assert(appJs.includes('data-editor-command="preview-bulk-import"'), 'preview app should expose bulk import preview');
assert(appJs.includes('data-editor-command="apply-bulk-import"'), 'preview app should expose reviewed bulk import application');
assert(appJs.includes('data-editor-command="export-bulk-field"'), 'preview app should expose bulk field export');
assert(appJs.includes('parseBulkRows: parseBulkRows'), 'preview app facade should expose bulk row parsing');
assert(appJs.includes('previewBulkImport: previewBulkImport'), 'preview app facade should expose bulk import preview');
assert(appJs.includes('applyBulkImport: applyBulkImport'), 'preview app facade should expose bulk import application');
assert(appJs.includes('exportBulkField: exportBulkField'), 'preview app facade should expose bulk field export');
assert(appJs.includes('function analyzeFieldCoverage'), 'preview app should analyze per-field entity coverage');
assert(appJs.includes('function fillMissingKeys'), 'preview app should fill missing entity keys safely');
assert(appJs.includes('function renderCoverageInspector'), 'preview app should render a field coverage inspector');
assert(appJs.includes("detailPanelBlock('coverage-inspector'"), 'preview app should mount a coverage inspector panel');
assert(appJs.includes('id="coverage-inspector-list"'), 'preview app should render coverage inspector rows');
assert(appJs.includes('data-editor-command="fill-missing-keys"'), 'preview app should expose one-click missing-key scaffolding');
assert(appJs.includes('analyzeFieldCoverage: analyzeFieldCoverage'), 'preview app facade should expose field coverage analysis');
assert(appJs.includes('fillMissingKeys: fillMissingKeys'), 'preview app facade should expose missing-key scaffolding');
assert(appJs.includes('OLD_EDITOR_FEATURES'), 'preview app should carry an old-editor feature parity catalog');
assert(appJs.includes('function buildOldEditorParityReport'), 'preview app should build old-editor parity reports');
assert(appJs.includes('function renderEditorParityAudit'), 'preview app should render an old-editor parity audit panel');
assert(appJs.includes('function jumpParityTarget'), 'preview app should jump from parity rows to relevant work areas');
assert(appJs.includes('function readApiSettings'), 'preview app should read creator API settings');
assert(appJs.includes('function saveApiSettings'), 'preview app should save creator API settings');
assert(appJs.includes('function renderApiSettingsWorkbench'), 'preview app should render creator API settings');
assert(appJs.includes('data-panel="old-editor-parity"'), 'preview app should mount old-editor parity audit');
assert(appJs.includes('id="old-editor-parity-list"'), 'preview app should render old-editor parity rows');
assert(appJs.includes('data-panel="api-settings-workbench"'), 'preview app should mount creator API settings');
assert(appJs.includes('id="reset-api-key"'), 'preview app should expose main API key input');
assert(appJs.includes('id="reset-img-api-key"'), 'preview app should expose image API key input');
assert(appJs.includes('data-editor-command="jump-parity-target"'), 'preview app should expose parity jump commands');
assert(appJs.includes('data-editor-command="save-api-settings"'), 'preview app should expose API settings save command');
assert(appJs.includes('buildOldEditorParityReport: buildOldEditorParityReport'), 'preview app facade should expose parity report builder');
assert(appJs.includes('jumpParityTarget: jumpParityTarget'), 'preview app facade should expose parity jump helper');
assert(appJs.includes('readApiSettings: readApiSettings'), 'preview app facade should expose API settings reader');
assert(appJs.includes('saveApiSettings: saveApiSettings'), 'preview app facade should expose API settings saver');
assert(appJs.includes('saveOfficeGovernanceWorkbench: saveOfficeGovernanceWorkbench'), 'preview app facade should expose office governance save helper');
assert(appJs.includes('addOfficeCostVariable: addOfficeCostVariable'), 'preview app facade should expose office cost add helper');
assert(appJs.includes('addOfficePositionRow: addOfficePositionRow'), 'preview app facade should expose office position add helper');
assert(appJs.includes('saveMapBindings: saveMapBindings'), 'preview app facade should expose map binding save helper');
assert(appJs.includes('normalizeMapBindings: normalizeMapBindings'), 'preview app facade should expose map binding normalize helper');
assert(appJs.includes('clearSelectedMapBindings: clearSelectedMapBindings'), 'preview app facade should expose map binding clear helper');
assert(appJs.includes('buildGlobalSearchIndex: buildGlobalSearchIndex'), 'preview app facade should expose global search index helper');
assert(appJs.includes('runGlobalSearch: runGlobalSearch'), 'preview app facade should expose global search helper');
assert(appJs.includes('jumpToSearchResult: jumpToSearchResult'), 'preview app facade should expose global search jump helper');
assert(appJs.includes('function buildScenarioDiff'), 'preview app should build draft-vs-baseline diff');
assert(appJs.includes('function renderDiffInspector'), 'preview app should render a diff inspector');
assert(appJs.includes('function inferMissingFieldTemplate'), 'preview app should infer templates for missing blueprint fields');
assert(appJs.includes('function createMissingField'), 'preview app should create missing blueprint fields on demand');
assert(appJs.includes('id="scenario-diff-list"'), 'preview app should mount a scenario diff list');
assert(appJs.includes('data-editor-command="select-diff-field"'), 'preview app should allow diff row field navigation');
assert(appJs.includes('data-editor-command="revert-field"'), 'preview app should allow single-field revert from diff rows');
assert(appJs.includes('data-editor-command="create-missing-field"'), 'preview app should expose missing-field creation command');
assert(appJs.includes('buildScenarioDiff: buildScenarioDiff'), 'preview app facade should expose scenario diff helper');
assert(appJs.includes('createMissingField: createMissingField'), 'preview app facade should expose missing-field creation helper');
assert(appJs.includes('function buildPreflightReport'), 'preview app should build a release preflight report');
assert(appJs.includes('function renderPreflightGate'), 'preview app should render a release preflight gate');
assert(appJs.includes('function buildReleaseNotes'), 'preview app should build release notes from diff and preflight state');
assert(appJs.includes('function renderReleaseNotes'), 'preview app should render a release notes panel');
assert(appJs.includes('function saveFieldNote'), 'preview app should save creator notes for individual fields');
assert(appJs.includes('function renderFieldNotes'), 'preview app should render field-level creator notes');
assert(appJs.includes('fieldNotes: {}'), 'preview app state should keep field notes outside scenario JSON');
assert(appJs.includes('function buildAiTaskPackage'), 'preview app should build field-aware AI task packages');
assert(appJs.includes('function renderAiTaskWorkbench'), 'preview app should render an AI task package workbench');
assert(appJs.includes('function applyAiTaskResponse'), 'preview app should apply AI JSON responses as reviewable drafts');
assert(appJs.includes('function runAiTaskPackage'), 'preview app should run a field AI task through the saved API');
assert(appJs.includes('function runAiQueue'), 'preview app should run queued AI generation tasks');
assert(appJs.includes('function queueModuleAiTasks'), 'preview app should enqueue current module fields for AI generation');
assert(appJs.includes('function buildAiRequestPayload'), 'preview app should build chat-completion payloads from task packages');
assert(appJs.includes('function extractAiMessageContent'), 'preview app should parse API response text from chat/responses payloads');
assert(appJs.includes('function jsonCandidateFromText'), 'preview app should normalize fenced or wrapped JSON AI responses');
assert(appJs.includes('function importAiReferenceFiles'), 'preview app should import local AI reference files');
assert(appJs.includes('function renderAiReferenceControls'), 'preview app should render AI reference file controls');
assert(appJs.includes('function buildAiFixPlan'), 'preview app should build cross-module AI repair plans');
assert(appJs.includes('function queueAiFixLoop'), 'preview app should enqueue AI repair loop jobs');
assert(appJs.includes('function runAiFixLoop'), 'preview app should run AI repair loop jobs');
assert(appJs.includes('aiTaskPackage'), 'preview app state should keep the current AI task package');
assert(appJs.includes('aiJobs: []'), 'preview app state should keep API generation jobs');
assert(appJs.includes('aiReferences: []'), 'preview app state should keep local AI reference materials');
assert(appJs.includes('aiFixPlan: null'), 'preview app state should keep AI repair plan state');
assert(appJs.includes("detailPanelBlock('ai-task-workbench'"), 'preview app should mount an AI task workbench panel');
assert(appJs.includes('id="ai-task-prompt"'), 'preview app should expose the AI task prompt');
assert(appJs.includes('id="ai-task-response"'), 'preview app should provide an AI response input');
assert(appJs.includes('id="ai-reference-file-input"'), 'preview app should provide an AI reference file picker');
assert(appJs.includes('data-editor-command="build-ai-task"'), 'preview app should expose AI task generation');
assert(appJs.includes('data-editor-command="copy-ai-task"'), 'preview app should expose AI task copy');
assert(appJs.includes('data-editor-command="select-ai-reference-files"'), 'preview app should expose AI reference file import');
assert(appJs.includes('data-editor-command="remove-ai-reference"'), 'preview app should expose AI reference removal');
assert(appJs.includes('data-editor-command="clear-ai-references"'), 'preview app should expose AI reference clearing');
assert(appJs.includes('data-editor-command="run-ai-task"'), 'preview app should expose direct API generation for the current task');
assert(appJs.includes('data-editor-command="queue-module-ai-tasks"'), 'preview app should expose module AI queue creation');
assert(appJs.includes('data-editor-command="run-ai-queue"'), 'preview app should expose AI queue execution');
assert(appJs.includes('data-editor-command="clear-ai-queue"'), 'preview app should expose AI queue clearing');
assert(appJs.includes('data-editor-command="build-ai-fix-plan"'), 'preview app should expose AI repair plan building');
assert(appJs.includes('data-editor-command="queue-ai-fix-loop"'), 'preview app should expose AI repair queueing');
assert(appJs.includes('data-editor-command="run-ai-fix-loop"'), 'preview app should expose AI repair loop execution');
assert(appJs.includes('data-editor-command="apply-ai-response"'), 'preview app should expose AI response application');
assert(appJs.includes('buildAiTaskPackage: buildAiTaskPackage'), 'preview app facade should expose AI task package builder');
assert(appJs.includes('applyAiTaskResponse: applyAiTaskResponse'), 'preview app facade should expose AI response application');
assert(appJs.includes('runAiTaskPackage: runAiTaskPackage'), 'preview app facade should expose field API generation');
assert(appJs.includes('runAiQueue: runAiQueue'), 'preview app facade should expose queued API generation');
assert(appJs.includes('queueModuleAiTasks: queueModuleAiTasks'), 'preview app facade should expose module AI queue creation');
assert(appJs.includes('buildAiFixPlan: buildAiFixPlan'), 'preview app facade should expose AI repair plan builder');
assert(appJs.includes('queueAiFixLoop: queueAiFixLoop'), 'preview app facade should expose AI repair queue helper');
assert(appJs.includes('runAiFixLoop: runAiFixLoop'), 'preview app facade should expose AI repair runner');
assert(appJs.includes('buildAiRequestPayload: buildAiRequestPayload'), 'preview app facade should expose AI payload builder');
assert(appJs.includes('importAiReferenceFiles: importAiReferenceFiles'), 'preview app facade should expose AI reference imports');
assert(html.includes('ai-job-row'), 'preview should style API generation jobs in the queue');
assert(html.includes('ai-reference-list'), 'preview should style local AI reference materials');
assert(html.includes('ai-fix-plan-panel'), 'preview should style AI repair plan panels');
assert(appJs.includes('data-panel="preflight-gate"'), 'preview app should mount a preflight gate panel');
assert(appJs.includes('data-panel="quick-test-workbench"'), 'preview app should mount a formal sandbox quick test panel');
assert(appJs.includes('data-panel="release-notes"'), 'preview app should mount a release notes panel');
assert(appJs.includes("detailPanelBlock('field-notes'"), 'preview app should mount field notes next to field editing');
assert(appJs.includes('id="preflight-gate-list"'), 'preview app should mount a preflight gate list');
assert(appJs.includes('id="release-notes-list"'), 'preview app should mount a release notes list');
assert(appJs.includes('id="field-note-text"'), 'preview app should provide a field note textarea');
assert(appJs.includes('data-editor-command="run-preflight"'), 'preview app should expose a preflight run command');
assert(appJs.includes("if (command === 'run-preflight')") && appJs.includes("focusRuntimePanel('preflight-gate')"),
  'top preflight command should run and focus the preflight gate');
assert(appJs.includes('data-editor-command="preflight-export"'), 'preview app should gate export behind preflight');
assert(appJs.includes('data-editor-command="run-quick-test"'), 'preview app should expose formal sandbox preflight');
assert(appJs.includes('data-editor-command="launch-sandbox-test"'), 'preview app should expose formal sandbox launch');
assert(appJs.includes('data-editor-command="return-to-formal-runtime"'), 'preview app should expose write-back to formal runtime');
assert(appJs.includes('data-editor-command="save-field-note"'), 'preview app should expose field note save command');
assert(appJs.includes('data-editor-command="clear-field-note"'), 'preview app should expose field note clear command');
assert(appJs.includes('data-editor-command="refresh-release-notes"'), 'preview app should expose release note refresh');
assert(appJs.includes('data-editor-command="copy-release-notes"'), 'preview app should expose release note copy');
assert(appJs.includes('buildPreflightReport: buildPreflightReport'), 'preview app facade should expose preflight report helper');
assert(appJs.includes('buildReleaseNotes: buildReleaseNotes'), 'preview app facade should expose release note helper');
assert(appJs.includes('buildQuickTestReport: buildQuickTestReport'), 'preview app facade should expose formal sandbox preflight helper');
assert(appJs.includes('saveFormalSandboxPayload: saveFormalSandboxPayload'), 'preview app facade should expose sandbox payload writer');
assert(appJs.includes('launchFormalSandbox: launchFormalSandbox'), 'preview app facade should expose sandbox launcher');
assert(appJs.includes('saveRuntimeReturnPayload: saveRuntimeReturnPayload'), 'preview app facade should expose formal runtime write-back payload helper');
assert(appJs.includes('returnToFormalRuntime: returnToFormalRuntime'), 'preview app facade should expose formal runtime return helper');
assert(appJs.includes('saveFieldNote: saveFieldNote'), 'preview app facade should expose field note save helper');
assert(appJs.includes('fieldNotes: clone(state.fieldNotes'), 'project snapshots should carry creator field notes');
assert(appJs.includes('releaseNotes: buildReleaseNotes()'), 'project package export should include generated release notes');
assert(appJs.includes('PROJECT_LIBRARY_KEY'), 'preview app should keep a named project library storage key');
assert(appJs.includes('function readProjectLibrary'), 'preview app should read a local project library');
assert(appJs.includes('function saveProjectSnapshot'), 'preview app should save project snapshots');
assert(appJs.includes('function loadProjectSnapshot'), 'preview app should load project snapshots');
assert(appJs.includes('function deleteProjectSnapshot'), 'preview app should delete project snapshots');
assert(appJs.includes('function exportProjectSnapshot'), 'preview app should export packaged project snapshots');
assert(appJs.includes('function normalizeProjectPackage'), 'preview app should normalize imported project packages');
assert(appJs.includes('function importProjectPackage'), 'preview app should import packaged project snapshots');
assert(appJs.includes('function renderProjectLibrary'), 'preview app should render a project library panel');
assert(appJs.includes('function undoEdit'), 'preview app should undo recent editor changes');
assert(appJs.includes('function redoEdit'), 'preview app should redo recently undone changes');
assert(appJs.includes('function renderEditHistory'), 'preview app should render an edit history panel');
assert(appJs.includes('data-panel="project-library"'), 'preview app should mount a project library panel');
assert(appJs.includes('data-panel="edit-history"'), 'preview app should mount an edit history panel');
assert(appJs.includes('id="project-library-list"'), 'preview app should mount a project library list');
assert(appJs.includes('id="edit-history-list"'), 'preview app should mount an edit history list');
assert(appJs.includes('id="project-package-import-input"'), 'preview app should provide a packaged project import control');
assert(appJs.includes('data-editor-command="save-project-snapshot"'), 'preview app should expose project snapshot save command');
assert(appJs.includes('data-editor-command="load-project-snapshot"'), 'preview app should expose project snapshot load command');
assert(appJs.includes('data-editor-command="delete-project-snapshot"'), 'preview app should expose project snapshot delete command');
assert(appJs.includes('data-editor-command="export-project-snapshot"'), 'preview app should expose project snapshot export command');
assert(appJs.includes('data-editor-command="import-project-package"'), 'preview app should expose packaged project import command');
assert(appJs.includes('data-editor-command="undo-edit"'), 'preview app should expose undo command');
assert(appJs.includes('data-editor-command="redo-edit"'), 'preview app should expose redo command');
assert(appJs.includes('saveProjectSnapshot: saveProjectSnapshot'), 'preview app facade should expose project snapshot save helper');
assert(appJs.includes('loadProjectSnapshot: loadProjectSnapshot'), 'preview app facade should expose project snapshot load helper');
assert(appJs.includes('importProjectPackage: importProjectPackage'), 'preview app facade should expose packaged project import helper');
assert(appJs.includes('undoEdit: undoEdit'), 'preview app facade should expose undo helper');
assert(appJs.includes('redoEdit: redoEdit'), 'preview app facade should expose redo helper');
assert(html.includes('data-live-metric="top-level-keys"'), 'preview should expose live top-level key metric');
assert(html.includes('data-live-metric="characters"'), 'preview should expose live character metric');
assert(html.includes('data-live-metric="factions"'), 'preview should expose live faction metric');
assert(html.includes('data-live-metric="validation-issues"'), 'preview should expose live validation issue metric');
assert(appJs.includes('id="scenario-import-input"'), 'preview app should provide a JSON import control');
assert(appJs.includes('id="generation-queue-list"'), 'preview app should render a live generation queue list');
assert(html.includes('data-panel="ai-desk"'), 'preview should include global AI coauthor desk');
assert(html.includes('data-panel="freedom-lab"'), 'preview should include freeform creator lab');
assert(html.includes('data-panel="generation-queue"'), 'preview should include generation queue');
assert(html.includes('data-panel="creator-shortcuts"'), 'preview should include creator shortcut workflows');
assert(html.includes('data-panel="ai-coverage-matrix"'), 'preview should include AI coverage matrix');
assert(html.includes('data-ai-drawer="coauthor"'), 'preview should include a unified AI coauthor drawer');
assert(html.includes('id="ai-context-title"'), 'AI drawer should expose current context title');
assert(html.includes('id="ai-context-route"'), 'AI drawer should expose current context route');
assert(html.includes('id="ai-result-preview"'), 'AI drawer should expose draft result preview');
assert(html.includes('data-draft-status="review-required"'), 'AI drawer should keep generated content in review status');
assert(html.includes('data-work-mode="freeform"'), 'preview should support freeform creation mode');
assert(html.includes('data-work-mode="structured"'), 'preview should support structured field mode');
assert(html.includes('data-work-mode="batch"'), 'preview should support batch generation mode');
['generate', 'polish', 'validate', 'derive', 'fill-field', 'batch', 'accept-draft', 'compare-diff', 'cite-source', 'regenerate', 'seed-from-map', 'seed-from-old-ui'].forEach((action) => {
  assert(html.includes('data-ai-action="' + action + '"'), 'preview should expose AI action ' + action);
});
['historical-fidelity', 'custom-freedom', 'granularity', 'overwrite-policy'].forEach((control) => {
  assert(html.includes('data-freedom-control="' + control + '"'), 'preview should expose freedom control ' + control);
});
assert((html.match(/data-ai-covered="health-card"/g) || []).length >= 4,
  'each health card should expose an AI follow-up');
assert((html.match(/data-ai-covered="flow-step"/g) || []).length >= 4,
  'each reset flow step should expose an AI follow-up');
assert((html.match(/data-ai-action=/g) || []).length >= 40,
  'preview should expose many AI actions across the workspace');
assert(html.includes('data-field-ai'), 'preview should provide field-level AI controls');
assert(!html.includes('tm-patches.js') && !html.includes('tm-endturn-ai-infer.js'),
  'preview should not load formal game runtime scripts');
assert(indexHtml.includes('preview/scenario-editor-sandbox-bridge.js'),
  'formal runtime should load the scenario editor sandbox bridge');
// 2026-07-04 放宽为语义锚：菜单页文案在迭代（并行会话重做启动页去开发腔）·逐字钉营销文案必然反复断——
// 只验「著卷入口卡存在且宣传剧本工坊」·措辞随文案组自由
assert(indexHtml.includes('btn-editor') && indexHtml.includes('剧本工坊'),
  'formal launch card should advertise the scenario workshop (btn-editor + 剧本工坊 anchor)');
assert(officeEditorJs.includes('function openScenarioResetEditor'),
  'formal runtime should provide a bridge into the new scenario workshop');
assert(officeEditorJs.includes('tm.scenarioEditorReset.previewDraft.v1'),
  'new workshop bridge should write the preview draft storage payload');
assert(officeEditorJs.includes('window.openScenarioResetEditor = openScenarioResetEditor'),
  'new workshop bridge should be callable from launch and scenario cards');
assert(launchJs.includes('window.openScenarioResetEditor||openEditorHtml'),
  'scenario manager should prefer the new workshop while preserving old editor fallback');
assert(launchJs.includes('\\u65B0\\u5DE5\\u574A') && launchJs.includes('\\u65E7\\u7F16\\u8F91'),
  'scenario cards should expose both new workshop and old editor actions');
assert(bridgeJs.includes('tm.scenarioEditorReset.formalSandbox.v1'),
  'sandbox bridge should read the preview editor sandbox payload key');
assert(bridgeJs.includes('tm.scenarioEditorReset.runtimeReturn.v1'),
  'sandbox bridge should read the preview editor formal write-back payload key');
assert(bridgeJs.includes('function installSandboxScenario'),
  'sandbox bridge should inject the preview scenario into formal runtime data');
assert(bridgeJs.includes('function installReturnedScenario'),
  'sandbox bridge should write returned editor scenarios into formal runtime data');
assert(bridgeJs.includes('function startWithPausedAi'),
  'sandbox bridge should pause automatic AI calls during autostart');
assert(bridgeJs.includes('TM_SCENARIO_EDITOR_SANDBOX'),
  'sandbox bridge should expose a verification marker');
assert(bridgeJs.includes('TM_SCENARIO_EDITOR_RETURN'),
  'sandbox bridge should expose a write-back verification marker');

// Slice 1: variables polymorphism. The editor must accept both the legacy flat
// array (天启) and the kinded `{base:[...], other:[...], formulas:[...]}` object
// (绍宋) without dropping data.
assert(appJs.includes('isKindedVariables'),
  'preview app should detect kinded-object variables (绍宋 schema)');
assert(appJs.includes('flattenKindedVariables'),
  'preview app should flatten kinded variables for the usage index');
assert(appJs.includes('renderKindedVariableWorkbench'),
  'preview app should render a per-bucket workbench for kinded variables');
assert(appJs.includes('data-variable-bucket'),
  'preview app should mark kinded variable rows with their bucket');
assert(appJs.includes("addVariableRow(target && target.dataset && target.dataset.variableBucket)"),
  'add-variable-row dispatch should forward the bucket name from the clicked button');
// Confirm both shapes show up in save logic so saving a kinded scenario never
// rebuilds it as an empty flat array.
assert(appJs.includes('var kinded = isKindedVariables(raw)'),
  'saveVariableWorkbench should branch on the detected shape');
assert(appJs.includes("[data-variable-bucket][data-variable-index]"),
  'saveVariableWorkbench should target kinded rows in the DOM');
// Verify 绍宋官方 scenario does have the kinded shape we are protecting.
const shaosongScenarioPath = path.resolve(ROOT, '..', 'scenarios', '绍宋·建炎元年八月（官方）.json');
if (fs.existsSync(shaosongScenarioPath)) {
  const shaosong = JSON.parse(fs.readFileSync(shaosongScenarioPath, 'utf8'));
  assert(shaosong && typeof shaosong.variables === 'object' && !Array.isArray(shaosong.variables),
    '绍宋 official scenario should keep variables as a kinded object — confirms the polymorphism the editor must handle');
  assert(Object.keys(shaosong.variables).every((k) => Array.isArray(shaosong.variables[k])),
    '绍宋 variables buckets should all be arrays (isKindedVariables predicate matches)');
  // Slice 2: globalRules / rules polymorphism. 绍宋 stores globalRules as an
  // array of short strings; 天启 stores it as one long paragraph string.
  assert(Array.isArray(shaosong.globalRules),
    '绍宋 official scenario should keep globalRules as an array — confirms the polymorphism the editor must handle');
}
assert(appJs.includes('isRuleListField'),
  'preview app should detect rule-list array form for globalRules/rules');
assert(appJs.includes('renderRuleListWorkbench'),
  'preview app should render the rule-list workbench when globalRules/rules is an array');
assert(appJs.includes('saveRuleListWorkbench'),
  'preview app should save the rule-list workbench back into the scenario');
assert(appJs.includes('addRuleListRow'),
  'preview app should support adding rule-list rows');
assert(appJs.includes("if (command === 'save-rule-list')"),
  'preview app event router should dispatch save-rule-list command');
assert(appJs.includes("if (command === 'add-rule-list-row')"),
  'preview app event router should dispatch add-rule-list-row command');
assert(html.includes('.rule-list-row'),
  'preview shell should ship rule-list-row styling');

// Slice 3: rigidTriggers polymorphism. 天启 stores it as object (keyed by id);
// 绍宋 stores it as an array (currently empty). The editor must accept both
// shapes and save back the same shape.
assert(appJs.includes("shape = Array.isArray(value) ? 'array' : 'object'"),
  'buildRigidTriggerPreview should detect array vs object shape');
assert(appJs.includes('var isArrayShape = Array.isArray(current)'),
  'saveRigidTriggerWorkbench should branch on array vs object shape');
assert(appJs.includes('（数组形态）'),
  'saveRigidTriggerWorkbench should annotate array-shape saves in history');
if (fs.existsSync(shaosongScenarioPath)) {
  const shaosong = JSON.parse(fs.readFileSync(shaosongScenarioPath, 'utf8'));
  assert(Array.isArray(shaosong.rigidTriggers),
    '绍宋 official scenario should store rigidTriggers as an array — confirms the polymorphism the editor must handle');
}
// timeline shape support already existed (collectTimelineWorkbenchRows /
// saveTimelineWorkbench both branch on Array.isArray) but assert it so the
// regression smoke catches accidental regressions.
assert(appJs.includes('var isArrayTimeline = Array.isArray(current)'),
  'saveTimelineWorkbench should branch on array vs object shape (天启 past/future object vs 绍宋 array)');

// Slice 4: one-click load of either official scenario via the starter panel.
// The creator should not have to file-pick the official baseline file.
assert(appJs.includes('OFFICIAL_SCENARIOS'),
  'preview app should declare an OFFICIAL_SCENARIOS manifest for one-click loading');
assert(appJs.includes('loadOfficialScenario'),
  'preview app should expose a loadOfficialScenario function');
assert(appJs.includes('officialScenarioUrl'),
  'preview app should resolve official scenario URLs relative to the preview shell');
assert(appJs.includes("'tianqi7'") && appJs.includes("'shaosong'"),
  'preview app should list both shipped official scenarios (天启 + 绍宋)');
assert(appJs.includes("if (command === 'load-official-scenario')"),
  'preview app event router should dispatch load-official-scenario command');
assert(appJs.includes('starter-template-card--official'),
  'preview app should render the official cards with a distinct variant class');
assert(html.includes('.starter-template-card--official'),
  'preview shell should ship the official starter-card variant styling');
// Confirm both official scenarios actually exist on disk so the loader has a
// real target. This protects against renames/moves of the scenario files.
const tianqiPath = path.resolve(ROOT, '..', 'scenarios', '天启七年·九月（官方）.json');
assert(fs.existsSync(tianqiPath),
  '天启 official scenario file should be present at scenarios/ root');
assert(fs.existsSync(shaosongScenarioPath),
  '绍宋 official scenario file should be present at scenarios/ root');

// Slice 5: scenario switcher in the top ribbon. The pill must become a real
// button that opens a dropdown of starters/official scenarios, so the creator
// can swap baseline without leaving the ribbon.
assert(html.includes('id="scenario-pill"') && html.includes('aria-haspopup="listbox"'),
  'preview shell should turn the scenario pill into a listbox-style button');
assert(html.includes('id="scenario-pill-menu"'),
  'preview shell should mount an empty scenario-pill-menu host for the dropdown');
assert(html.includes('id="scenario-pill-title"') && html.includes('id="scenario-pill-detail"'),
  'preview shell should expose pill title/detail nodes so JS can update them without rewriting the whole pill');
assert(appJs.includes('renderScenarioPillMenu'),
  'preview app should render menu items into the scenario-pill-menu host');
assert(appJs.includes('toggleScenarioPillMenu'),
  'preview app should toggle the scenario-pill dropdown open/closed');
assert(appJs.includes("event.target.closest('#scenario-pill')"),
  'preview app event delegation should treat clicks on the pill as a toggle');
assert(appJs.includes('toggleScenarioPillMenu(false)'),
  'preview app should close the dropdown after a starter/official-scenario selection');
assert(html.includes('.scenario-pill-menu '),
  'preview shell should ship dropdown menu styling');

// Slice 6: in-memory bundle of official scenarios. The bundle lets the loader
// work without fetch (Electron webSecurity on, file:// scopes) and gives the
// editor a deterministic baseline at boot.
const bundleFile = path.join(ROOT, 'preview', 'official-scenarios-bundle.js');
assert(fs.existsSync(bundleFile),
  'preview should ship a pre-built official scenarios bundle');
const bundleJs = fs.readFileSync(bundleFile, 'utf8');
assert(bundleJs.startsWith('/* GENERATED FILE'),
  'official scenarios bundle should be a generated artifact');
assert(bundleJs.includes('TM_OFFICIAL_SCENARIOS'),
  'official scenarios bundle should expose TM_OFFICIAL_SCENARIOS on the global');
assert(bundleJs.includes('"tianqi7"') && bundleJs.includes('"shaosong"'),
  'official scenarios bundle should include both tianqi7 and shaosong');
assert(html.includes('official-scenarios-bundle.js'),
  'preview shell should load the official scenarios bundle script');
assert(appJs.includes('global.TM_OFFICIAL_SCENARIOS'),
  'preview app should consume the in-memory official scenarios bundle');
assert(appJs.includes('applyLoadedOfficialScenario'),
  'preview app should share the scenario apply path between bundle and fetch loaders');
// Confirm the build script itself exists so anyone touching the scenario files
// can regenerate the bundle.
const bundleBuilder = path.join(ROOT, 'scripts', 'build-official-scenarios-bundle.js');
assert(fs.existsSync(bundleBuilder),
  'preview should ship the build script that regenerates the bundle');

// Slice 7: eraState dual vocabulary. Both official scenarios diverge sharply
// on this field (only 4 keys shared); the workbench must group the disjoint
// vocabularies so a creator knows which tradition they are filling in.
assert(appJs.includes('ERA_STATE_SHARED') && appJs.includes('ERA_STATE_TIANQI') && appJs.includes('ERA_STATE_SHAOSONG'),
  'preview app should declare three eraState vocabulary tables');
assert(appJs.includes('renderEraStateWorkbench'),
  'preview app should render a dedicated eraState dual-vocabulary workbench');
assert(appJs.includes('saveEraStateWorkbench'),
  'preview app should save eraState fields back into the scenario shape');
assert(appJs.includes("if (field === 'eraState') return renderEraStateWorkbench(value)"),
  'eraState dispatch should precede the generic config workbench branch');
assert(appJs.includes("if (command === 'save-era-state')"),
  'event router should dispatch save-era-state command');
assert(appJs.includes('detectEraStateOrigin'),
  'preview app should infer eraState vocabulary origin (tianqi vs shaosong)');
assert(html.includes('.era-state-workbench'),
  'preview shell should ship eraState workbench styling');
// Confirm the two official scenarios still match the vocabulary buckets we
// declared, so future scenario edits cannot silently drift the field set.
const tianqiSc = JSON.parse(fs.readFileSync(tianqiPath, 'utf8'));
if (fs.existsSync(shaosongScenarioPath)) {
  const shaosong = JSON.parse(fs.readFileSync(shaosongScenarioPath, 'utf8'));
  const tianqiEra = tianqiSc.eraState || {};
  const shaosongEra = shaosong.eraState || {};
  const tianqiUnique = ['politicalUnity','socialStability','culturalVibrancy','bureaucracyStrength','militaryProfessionalism','legitimacySource','landSystemType'];
  tianqiUnique.forEach((k) => assert(k in tianqiEra,
    '天启 eraState should still include the tianqi-tradition key: ' + k));
  const shaosongUnique = ['stabilityIndex','internalConflict','foreignPressure','militaryStrength','agriculturalYield','culturalDevelopment','technologyLevel','weatherStability'];
  shaosongUnique.forEach((k) => assert(k in shaosongEra,
    '绍宋 eraState should still include the shaosong-tradition key: ' + k));
  ['centralControl','economicProsperity','dynastyPhase','contextDescription'].forEach((k) => {
    assert(k in tianqiEra, '天启 eraState should include shared key ' + k);
    assert(k in shaosongEra, '绍宋 eraState should include shared key ' + k);
  });
}

// Slice 8: rename alias for specialist forms. Cross-scenario field renames
// (desc↔description, historicalEvents↔history, liege↔lord) used to cause the
// specialist editor to read blanks and write into the wrong key. The alias
// resolver routes reads + writes to whichever name the entity actually owns.
assert(appJs.includes('ENTITY_FIELD_ALIASES'),
  'preview app should declare the cross-scenario field alias table');
['desc', 'description', 'historicalEvents', 'history', 'liege', 'lord'].forEach((key) => {
  assert(appJs.indexOf("'" + key + "'") >= 0,
    'preview app should know alias pair member: ' + key);
});
assert(appJs.includes('function resolveEntityKey'),
  'preview app should expose resolveEntityKey for alias-aware reads');
assert(appJs.includes('var resolved = resolveEntityKey(entity, key, parentField)'),
  'setEntityProp should route writes through the alias resolver with parent context');
assert(appJs.includes('var resolvedKey = resolveEntityKey(entity, key, parentField)'),
  'renderSpecialistInput should display via the alias resolver with parent context');
assert(appJs.includes('data-specialist-alias'),
  'specialist input should hint when the underlying entity uses an aliased key');
assert(appJs.includes('if (alias && base.indexOf(alias) >= 0) return'),
  'specialistSchema fallback should skip aliases when the canonical name is already listed');

// Slice 10: dynamic blueprint enrichment. The baked blueprint only assigns
// keys present in 天启 (the source scenario); 绍宋's 21 extra top-level keys
// would be orphaned from module navigation without absorbing.
assert(appJs.includes('function absorbOrphanScenarioKeys'),
  'preview app should define an orphan-key absorber that runs at load time');
assert(appJs.includes('absorbOrphanScenarioKeys()'),
  'loadScenario should invoke absorbOrphanScenarioKeys before settling selection');
assert(appJs.includes('state.orphanKeysAbsorbed'),
  'absorbOrphanScenarioKeys should record how many keys it added per load');
assert(appJs.includes("var fallback = state.modules.find(function(m) { return m.id === 'scenarioOpening'; })"),
  'orphan absorption should fall back to scenarioOpening when no runtime mapping exists');
// 21 named 绍宋-only top-level keys must each have a runtime-audit row so the
// absorber can route them to the right module. RUNTIME_FIELD_SURFACES already
// contains them per the audit table in app.js; assert each individually.
['startMonth','startLocation','openingHook','_adaptation','_buildStatus','engineConstants',
 'diplomacyConfig','schemeConfig','decisionConfig','edictConfig','chronicleConfig',
 'eventConstraints','imperialEdicts','officeConfig','authorityConfigDeep','initialEnYuan',
 'initialPatronNetwork','externalForces','refFilesContent','guoku_advanced',
 'neitang_advanced','adminConfig'].forEach((key) => {
  assert(appJs.indexOf("runtimeSurface('" + key + "',") >= 0,
    'runtime audit table should list 绍宋-only key for orphan-absorber routing: ' + key);
});

// Slice 11: build-script union for blueprint coverage. The baked
// scenario-editor-reset-data.js must cover both 天启 and 绍宋 keys so the
// editor's module navigation does not need to lean on the runtime orphan
// absorber for the shipped scenarios.
const buildScript = fs.readFileSync(path.join(ROOT, 'scripts', 'build-scenario-editor-reset-data.js'), 'utf8');
assert(buildScript.includes('COMPANION_SCENARIO_FILES'),
  'build-scenario-editor-reset-data should declare a companion scenarios list');
assert(buildScript.includes('widenBlueprint'),
  'build-scenario-editor-reset-data should widen the blueprint to a key union');
assert(buildScript.includes('keyUniverseSize'),
  'baked payload should record the widened key universe size');
const inventoryScript = fs.readFileSync(path.join(ROOT, 'scripts', 'editor-reset-inventory.js'), 'utf8');
assert(inventoryScript.includes('RESET_BLUEPRINT_MODULES'),
  'editor-reset-inventory should export RESET_BLUEPRINT_MODULES for downstream wideners');
// Confirm the baked data file itself now exposes a union-blueprint with the
// 21 绍宋-only keys assigned.
const vm = require('vm');
const dataSandbox = {};
vm.createContext(dataSandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'preview', 'scenario-editor-reset-data.js'), 'utf8'), dataSandbox);
const bakedBlueprint = dataSandbox.TM_SCENARIO_EDITOR_RESET_DATA && dataSandbox.TM_SCENARIO_EDITOR_RESET_DATA.blueprint;
assert(bakedBlueprint && Array.isArray(bakedBlueprint.assignedTopLevelKeys),
  'baked blueprint should expose assignedTopLevelKeys');
assert(bakedBlueprint.assignedTopLevelKeys.length >= 104,
  'baked blueprint should cover at least the 104-key union of both scenarios; got ' + bakedBlueprint.assignedTopLevelKeys.length);
['engineConstants', '_adaptation', '_buildStatus', 'chronicleConfig', 'startMonth'].forEach((key) => {
  assert(bakedBlueprint.assignedTopLevelKeys.indexOf(key) >= 0,
    'baked blueprint should now route 绍宋-only key after Slice 11: ' + key);
});
assert(bakedBlueprint.keyUniverseSize >= 104,
  'baked blueprint should record keyUniverseSize >= 104');

// Slice 12: scenario provenance badges. Each field chip carries a small
// '启 / 宋 / 共 / 外' badge derived from the bundled official scenarios so a
// creator can see at a glance which tradition uses the field.
assert(appJs.includes('function fieldProvenance'),
  'preview app should expose a fieldProvenance lookup');
assert(appJs.includes('PROVENANCE_LABELS'),
  'preview app should declare provenance label metadata');
assert(appJs.includes('provenanceBadgeHtml(field)'),
  'field chip render should include the provenance badge HTML');
assert(appJs.includes("'tianqi'") && appJs.includes("'shaosong'") && appJs.includes("'both'") && appJs.includes("'outside'"),
  'provenance helper should classify into tianqi / shaosong / both / outside');
assert(html.includes('.provenance-badge'),
  'preview shell should ship provenance badge styling');
['both', 'tianqi', 'shaosong', 'outside'].forEach((origin) => {
  assert(html.includes('data-provenance="' + origin + '"'),
    'preview shell should style provenance variant: ' + origin);
});

// Slice 13: context-aware vassalType↔type alias. The pair is too generic for
// global aliasing (events/items also have a `type` field), so we only route
// the rename when the parent field is a vassal container. saveTreeWorkbench
// also pins vassalType ahead of type in its meta chain to keep TQ-shape data.
assert(appJs.includes('CONTEXT_FIELD_ALIASES'),
  'preview app should declare CONTEXT_FIELD_ALIASES for path-scoped renames');
assert(appJs.includes("vassalSystem: { vassalType: 'type', type: 'vassalType' }"),
  'context aliases should cover vassalSystem.vassalRelations vassalType↔type');
assert(appJs.includes("officialVassalMapping: { vassalType: 'type', type: 'vassalType' }"),
  'context aliases should also cover officialVassalMapping vassalType↔type');
assert(appJs.includes('function resolveEntityKey(entity, key, parentField)'),
  'resolveEntityKey should accept a parentField context');
assert(appJs.includes('CONTEXT_FIELD_ALIASES[parentField]'),
  'resolveEntityKey should consult the context-scoped alias map first');
assert(appJs.includes("else if (Object.prototype.hasOwnProperty.call(node, 'vassalType')) node.vassalType = metaInput.value"),
  'saveTreeWorkbench meta chain should prefer vassalType over type to keep 天启 schema intact');
// Specialist forms should now forward the parent field context so future
// schemas covering vassalSystem entries pick up the alias automatically.
assert(appJs.includes('renderSpecialistInput(entity, key, parentField)'),
  'renderSpecialistInput should accept parentField for context-aware alias resolution');
assert(appJs.includes('renderSpecialistInput(entity, key, field)'),
  'renderSpecialistEditor should pass the parent field into the input renderer');
assert(appJs.includes('setEntityProp(entity, input.dataset.specialistField, input.value, parentField)'),
  'saveSpecialistEntity should pass parentField into setEntityProp');

// Slice 14: side-by-side official scenario comparison panel. Lets the creator
// pick any two of (current draft, 天启, 绍宋) and see field-level differences.
assert(appJs.includes('COMPARISON_SOURCES'),
  'preview app should declare the comparison source roster');
assert(appJs.includes('function buildOfficialComparison'),
  'preview app should expose a buildOfficialComparison helper');
assert(appJs.includes('function renderOfficialComparison'),
  'preview app should render the comparison panel');
assert(appJs.includes("'left-only'") && appJs.includes("'right-only'") && appJs.includes("'shape-diff'") && appJs.includes("'value-diff'"),
  'comparison helper should classify rows into left-only / right-only / shape-diff / value-diff');
assert(appJs.includes("if (command === 'swap-comparison-sides')"),
  'event router should dispatch the swap-comparison-sides command');
assert(appJs.includes("if (command === 'select-comparison-field')"),
  'event router should dispatch the select-comparison-field jump command');
assert(html.includes('[data-panel="official-comparison"]'),
  'preview shell should ship dedicated comparison panel styling');
assert(appJs.includes("'<div data-panel=\"official-comparison\">"),
  'preview app should mount the official-comparison panel into the workbench area');
assert(appJs.includes('renderOfficialComparison();'),
  'renderAll should refresh the comparison panel each pass');
assert(appJs.includes("data-comparison-side"),
  'comparison select inputs should carry data-comparison-side for the change handler');
assert(appJs.includes("event.target.dataset.comparisonSide"),
  'change handler should react to comparison-side select updates');

// Slice 15: runtime field census enrichment. Each runtime audit row now
// carries provenance (启/宋/共/外) and per-scenario presence flags so the
// creator can see whether the runtime expectation is met for the loaded
// scenario and whether it originates from one tradition or the other.
assert(appJs.includes("var provSets = provenanceSets()"),
  'buildRuntimeFieldAudit should consult the provenance sets');
assert(appJs.includes('inTianqi: inTianqi'),
  'audit rows should carry inTianqi presence flag');
assert(appJs.includes('inShaosong: inShaosong'),
  'audit rows should carry inShaosong presence flag');
assert(appJs.includes("provenance: provenance"),
  'audit rows should carry the derived provenance tag');
assert(appJs.includes("var presenceTags = (row.inTianqi ? '启' : '') + (row.inShaosong ? '宋' : '')"),
  'renderRuntimeFieldAudit should annotate rows with 启/宋/外 presence tags');
assert(appJs.includes("' · 官方 '"),
  'runtime audit row meta should include the 官方 source label');

// Slice 16: apply-side buttons in the comparison panel. Lets a creator pull a
// field from either official scenario into the current draft (or remove from
// draft when source side lacks the field) with a one-click history entry.
assert(appJs.includes('function applyComparisonSide'),
  'preview app should expose applyComparisonSide handler');
assert(appJs.includes("if (command === 'apply-comparison-side')"),
  'event router should dispatch the apply-comparison-side command');
assert(appJs.includes("data-editor-command=\"apply-comparison-side\""),
  'comparison rows should render apply buttons when the draft is one side');
assert(appJs.includes("var leftIsDraft = state.comparisonLeftId === 'draft'"),
  'comparison render should detect which side is the draft');
assert(appJs.includes("recordHistory('剧本对照·采纳字段'"),
  'apply action should record a history entry for undo');
assert(appJs.includes("recordHistory('剧本对照·删除字段'"),
  'apply-when-source-missing should record a delete history entry');

// Slice 17: adminHierarchy shape summary header. The flat-by-faction (天启)
// vs single-faction recursive children-tree (绍宋) paradigm difference is
// invisible in the generic tree workbench. The summary makes it explicit.
assert(appJs.includes('function summarizeAdminHierarchy'),
  'preview app should declare a summarizeAdminHierarchy helper');
assert(appJs.includes('function renderAdminHierarchySummary'),
  'preview app should render a summary card above the tree workbench');
assert(appJs.includes("field === 'adminHierarchy' ? renderAdminHierarchySummary(value) : ''"),
  'renderTreeWorkbench should inject the admin summary only when editing adminHierarchy');
['flat-by-faction', 'recursive-children-tree', 'mixed', 'single-flat'].forEach((paradigm) => {
  assert(appJs.indexOf("'" + paradigm + "'") >= 0,
    'admin summarizer should classify paradigm: ' + paradigm);
});
assert(html.includes('.admin-shape-summary'),
  'preview shell should ship admin shape summary styling');
['flat-by-faction', 'recursive-children-tree', 'mixed'].forEach((paradigm) => {
  assert(html.includes('data-admin-shape="' + paradigm + '"'),
    'preview shell should color-code admin shape variant: ' + paradigm);
});
// Verify the two official scenarios still match the expected paradigms — if
// they ever change, the summary header would mislabel them.
const tqAdmin = tianqiSc.adminHierarchy;
if (fs.existsSync(shaosongScenarioPath)) {
  const ss = JSON.parse(fs.readFileSync(shaosongScenarioPath, 'utf8'));
  assert(typeof tqAdmin === 'object' && !Array.isArray(tqAdmin) && Object.keys(tqAdmin).length > 5,
    '天启 adminHierarchy should be a flat-by-faction object with many faction containers');
  // 绍宋剧本已扩充为多势力 adminHierarchy(player + 金/西夏/大理/吐蕃/河北义军/外蕃诸势力·见剧本外蕃territories 扩充·设计演进非数据污染)·
  //   原"单一容器(===1)"假设过时→改验多势力容器(此断言本就是金丝雀:剧本换 paradigm 即触发·此处确认是有意演进)。
  assert(typeof ss.adminHierarchy === 'object' && !Array.isArray(ss.adminHierarchy) && Object.keys(ss.adminHierarchy).length > 5,
    '绍宋 adminHierarchy should now be a multi-faction container (剧本外蕃扩充·原 single-faction 假设过时)');
}

// Slice 18: specialist schemas enriched with cross-scenario fields. Without
// this, key fields used by only one tradition (e.g. 绍宋's coreMotivations,
// 天启's haoName) only appear via the auto-append fallback — which is capped
// at 18 keys and order-dependent. Declaring them explicitly guarantees they
// surface and the alias resolver visibly fires for desc/description rows.
[
  ['characters', ['haoName', 'displayName', 'persona', 'isHistorical', 'isFictional', 'coreMotivations', 'redLines', 'ambition', 'personalGoal']],
  ['factions', ['leaderTitle', 'coLeader', 'culture', 'territory', 'fiscalCondition', 'currentMorale', 'side', 'primaryTarget', 'primaryThreat', 'attitude', 'mainstream']],
  ['families', ['currentHead', 'heir', 'tier', 'prestige', 'wealth', 'ancestralSeat', 'tradition', 'politicalStance', 'notableAncestors', 'marriages', 'feuds']],
  ['parties', ['foundYear', 'peakYear', 'base', 'org', 'allies', 'enemies', 'policyStance', 'longGoal', 'strategy']],
  ['classes', ['status', 'mobility', 'populationShare', 'economicRole', 'privileges', 'obligations']],
  ['items', ['category', 'location', 'quantity', 'value', 'effects', 'tags', 'era']]
].forEach(([entityType, fields]) => {
  fields.forEach((field) => {
    assert(appJs.indexOf("'" + field + "'") >= 0,
      'enriched specialist schema for ' + entityType + ' should declare ' + field);
  });
});
// Confirm 绍宋 characters actually carry the enriched fields the schema now
// surfaces; otherwise the schema would be aspirational rather than useful.
if (fs.existsSync(shaosongScenarioPath)) {
  const ss = JSON.parse(fs.readFileSync(shaosongScenarioPath, 'utf8'));
  const sampleChar = (ss.characters || []).find((c) => c && c.coreMotivations);
  assert(sampleChar && Array.isArray(sampleChar.coreMotivations) || sampleChar && typeof sampleChar.coreMotivations === 'string',
    '绍宋 should have at least one character carrying coreMotivations — the enriched schema needs real data to surface');
}

// Slice 19: combo build-all runner. The two scenario-editor artifacts must
// stay in lockstep; the runner refreshes both with a single command.
const combo = path.join(ROOT, 'scripts', 'build-scenario-editor-reset-all.js');
assert(fs.existsSync(combo),
  'combo build runner should exist');
const comboSrc = fs.readFileSync(combo, 'utf8');
assert(comboSrc.includes("require('./sync-official-scenarios.js')"),
  'combo runner should delegate to the unified official-scenario synchronizer');
assert(comboSrc.includes('syncer.sync({ check: false })'),
  'combo runner should refresh every derived official artifact atomically');
assert(!comboSrc.includes("require('./build-scenario-editor-reset-data.js')") &&
  !comboSrc.includes("require('./build-official-scenarios-bundle.js')"),
  'combo runner should not rebuild editor artifacts through partial legacy paths');
assert(comboSrc.includes('module.exports = { main }'),
  'combo runner should expose only its unified main entry point');

// Slice 20: batch 采纳 buttons in the comparison panel. The single-row
// buttons from Slice 16 don't scale when migrating tens of fields between
// scenarios; the batch bar provides one-click "all left-only / right-only /
// shape-diff / value-diff" copy with a single history entry.
assert(appJs.includes('function applyComparisonBatch'),
  'preview app should expose applyComparisonBatch handler');
assert(appJs.includes("if (command === 'apply-comparison-batch')"),
  'event router should dispatch apply-comparison-batch');
assert(appJs.includes("data-editor-command=\"apply-comparison-batch\""),
  'comparison batch bar should render apply-comparison-batch buttons');
['left-only', 'right-only', 'shape-diff', 'value-diff'].forEach((kind) => {
  assert(appJs.indexOf("'" + kind + "'") >= 0,
    'comparison batch handler should classify by row status: ' + kind);
});
assert(appJs.includes("recordHistory('剧本对照·批量采纳'"),
  'batch apply should record a single history entry per invocation');
assert(html.includes('.comparison-batch-bar'),
  'preview shell should ship comparison batch bar styling');

// Slice 21: module completeness indicator. Each module tile gains a thin
// progress bar showing how many of its blueprint keys are populated in the
// current scenario, so creators can see which modules still need work.
assert(appJs.includes("bar.className = 'module-progress'"),
  'renderModuleTiles should append a module-progress bar element');
assert(appJs.includes('var pct = total ? Math.round((present / total) * 100) : 0'),
  'module tile renderer should compute completeness percentage');
assert(appJs.includes("bar.dataset.moduleTone = tone"),
  'module progress should tag the tile with a completeness tone');
['empty', 'low', 'mid', 'full'].forEach((tone) => {
  assert(appJs.indexOf("'" + tone + "'") >= 0,
    'module tile renderer should classify tone: ' + tone);
});
assert(html.includes('.module-progress'),
  'preview shell should ship module progress styling');
['empty', 'low', 'mid', 'full'].forEach((tone) => {
  assert(html.includes('data-module-tone="' + tone + '"'),
    'preview shell should color-code module tone: ' + tone);
});
assert(/\.module-tile\s*\{\s*position:\s*relative;/.test(html),
  'module tile should be position: relative so the absolute progress bar anchors correctly');

// Slice 22: adminHierarchy division deep-edit per row. Tree workbench rows
// gain a 深编 toggle that expands an inline form for every primitive child
// key of the node, and surfaces nested objects/arrays as a hint.
assert(appJs.includes('function renderTreeDeepForm'),
  'preview app should declare renderTreeDeepForm');
assert(appJs.includes('function toggleTreeDeepRow'),
  'preview app should declare toggleTreeDeepRow');
assert(appJs.includes('function saveTreeDeepRow'),
  'preview app should declare saveTreeDeepRow');
assert(appJs.includes("if (command === 'toggle-tree-deep')"),
  'event router should dispatch toggle-tree-deep');
assert(appJs.includes("if (command === 'save-tree-deep')"),
  'event router should dispatch save-tree-deep');
assert(appJs.includes('data-tree-deep-path'),
  'deep-edit inputs should be tagged with data-tree-deep-path');
assert(appJs.includes('data-tree-deep-field'),
  'deep-edit inputs should be tagged with data-tree-deep-field');
assert(appJs.includes('state.treeDeepPaths'),
  'preview app state should track which tree rows have deep-edit open');
assert(html.includes('.tree-deep-form'),
  'preview shell should ship tree-deep-form styling');
assert(html.includes('.tree-deep-grid'),
  'preview shell should ship the deep-edit grid styling');
assert(html.includes('.tree-deep-nested'),
  'preview shell should style the nested-key hint');

// Slice 23: AI prompt template per scenario tradition. buildAiTaskPackage
// now prepends a tradition-specific hint (天启 v48 vs 绍宋 v1.6-D) so the
// generated content stays on-schema and stylistically consistent.
assert(appJs.includes('SCENARIO_TRADITION_HINTS'),
  'preview app should declare SCENARIO_TRADITION_HINTS table');
['tianqi', 'shaosong', 'mixed', 'unknown'].forEach((id) => {
  assert(appJs.indexOf(id + ":") >= 0 || appJs.indexOf("'" + id + "'") >= 0,
    'tradition table should include entry: ' + id);
});
assert(appJs.includes('function detectScenarioTradition'),
  'preview app should expose detectScenarioTradition');
assert(appJs.includes('function scenarioTraditionHint'),
  'preview app should expose scenarioTraditionHint helper');
assert(appJs.includes('traditionInfo.text'),
  'buildAiTaskPackage should inject the tradition hint into the prompt');
assert(appJs.includes('tradition: traditionInfo.tradition'),
  'AI task package payload should carry the detected tradition tag');
// Sanity-check the detection signals so a future refactor cannot regress them.
['var id = String(scenario.id', "if (id.indexOf('tianqi')", "if (id.indexOf('shaosong')",
 "if (dynasty === '明')", "if (dynasty === '宋')",
 'if (Array.isArray(scenario.variables))', 'if (isObject(scenario.variables)',
 "if (typeof scenario.globalRules === 'string')",
 'if (Array.isArray(scenario.globalRules))'
].forEach((needle) => {
  assert(appJs.includes(needle),
    'detectScenarioTradition should weigh signal: ' + needle);
});

// Slice 24: events cross-scenario merge wizard. Surveys events from each
// official scenario and lets the creator selectively merge them into the
// current draft with id/name+year dedupe.
assert(appJs.includes('function eventMatchKey'),
  'preview app should expose eventMatchKey for dedupe');
assert(appJs.includes('function collectMergeableEvents'),
  'preview app should expose collectMergeableEvents');
assert(appJs.includes('function mergeSelectedEvents'),
  'preview app should expose mergeSelectedEvents');
assert(appJs.includes('function selectAllUnmergedFromSource'),
  'preview app should expose select-all-unmerged batch helper');
assert(appJs.includes('function renderEventsMergeWizard'),
  'preview app should render the events merge wizard panel');
assert(appJs.includes("if (command === 'merge-selected-events')"),
  'event router should dispatch merge-selected-events command');
assert(appJs.includes("if (command === 'select-all-merge-source')"),
  'event router should dispatch select-all-merge-source command');
assert(appJs.includes("if (command === 'clear-merge-selection')"),
  'event router should dispatch clear-merge-selection command');
assert(appJs.includes("data-events-merge-source"),
  'merge wizard checkboxes should carry data-events-merge-source for delegation');
assert(appJs.includes("data-events-merge-key"),
  'merge wizard checkboxes should carry data-events-merge-key for selection state');
assert(appJs.includes("cloned._mergedFrom = sourceId"),
  'merged events should be tagged with _mergedFrom provenance');
assert(appJs.includes('<div data-panel="events-merge-wizard">'),
  'preview app should mount the events-merge-wizard panel in the workbench area');
assert(appJs.includes('renderEventsMergeWizard();'),
  'renderAll should refresh the events merge wizard each pass');
assert(html.includes('[data-panel="events-merge-wizard"]'),
  'preview shell should ship events-merge-wizard panel styling');
assert(html.includes('.events-merge-row'),
  'preview shell should ship events-merge-row styling');

// Slice 25: keyboard shortcuts. Ctrl+S saves the current workbench, Ctrl+Z /
// Ctrl+Y / Ctrl+Shift+Z drive undo/redo, Alt+←/→ jump between fields in the
// current module, "/" focuses the entity search, Esc closes the pill menu.
assert(appJs.includes('function handleKeydown'),
  'preview app should declare handleKeydown');
assert(appJs.includes("document.addEventListener('keydown', handleKeydown)"),
  'wireEvents should attach the keydown handler');
assert(appJs.includes("event.key === 's' || event.key === 'S'"),
  'Ctrl+S should be wired');
assert(appJs.includes("event.key === 'z' || event.key === 'Z'"),
  'Ctrl+Z should be wired');
assert(appJs.includes("event.key === 'y' || event.key === 'Y'"),
  'Ctrl+Y should be wired (redo);');
assert(appJs.includes("event.key === 'ArrowLeft' || event.key === 'ArrowRight'"),
  'Alt+←/→ should be wired for field navigation');
assert(appJs.includes("event.key === '/'"),
  '"/" should focus the entity search input');
assert(appJs.includes("event.key === 'Escape'"),
  'Esc should close the scenario pill dropdown');

// Slice 26: field cloud filter by provenance + presence. Lets creators triage
// long field lists by tradition (启/宋/共/外) and by present-vs-missing.
assert(appJs.includes("state.fieldCloudFilter"),
  'state should hold the field cloud filter');
assert(appJs.includes('data-field-filter="provenance"'),
  'field cloud should expose a provenance select');
assert(appJs.includes('data-field-filter="presence"'),
  'field cloud should expose a presence select');
assert(appJs.includes("if (command === 'reset-field-filter')"),
  'event router should dispatch reset-field-filter command');
assert(appJs.includes("event.target.dataset.fieldFilter"),
  'change listener should react to filter select updates');
assert(appJs.includes("var visibleFields = allFields.filter"),
  'field cloud render should compute visibleFields from the filter');
assert(html.includes('.field-cloud-filter'),
  'preview shell should ship field-cloud-filter styling');

// Slice 27: status log panel. Captures setStatus messages into a ring buffer
// so creators can review what just happened. Bounded by STATUS_LOG_CAPACITY.
assert(appJs.includes('STATUS_LOG_CAPACITY'),
  'preview app should declare a status log capacity');
assert(appJs.includes('function pushStatusLog'),
  'preview app should expose pushStatusLog');
assert(appJs.includes('function renderStatusLog'),
  'preview app should expose renderStatusLog');
assert(appJs.includes('function clearStatusLog'),
  'preview app should expose clearStatusLog');
assert(appJs.includes('pushStatusLog(text, tone)'),
  'setStatus should record entries into the ring buffer');
assert(appJs.includes("if (command === 'clear-status-log')"),
  'event router should dispatch clear-status-log');
assert(appJs.includes('<div data-panel="status-log">'),
  'preview app should mount the status-log panel in the workbench area');
assert(appJs.includes('renderStatusLog();'),
  'renderAll should refresh the status log');
assert(html.includes('[data-panel="status-log"]'),
  'preview shell should ship status-log panel styling');
assert(html.includes('.status-log-entry'),
  'preview shell should ship per-entry log styling');
['good', 'warn', 'error', 'info'].forEach((tone) => {
  assert(html.includes('data-status-log-tone="' + tone + '"'),
    'preview shell should color-code status-log tone: ' + tone);
});

// Slice 28: import file validation safety gate. Broken / non-scenario JSON
// used to clobber the working draft instantly; now validation runs first,
// errors go to the status log, and a force-load escape hatch is provided.
assert(appJs.includes('function validateImportedScenario'),
  'preview app should expose validateImportedScenario');
assert(appJs.includes('function applyImportedScenario'),
  'preview app should expose applyImportedScenario');
assert(appJs.includes('function forceImportScenario'),
  'preview app should expose forceImportScenario');
assert(appJs.includes('state.pendingImport'),
  'preview app should hold pendingImport until user confirms force-load');
assert(appJs.includes("pushStatusLog('校验错误：'"),
  'import validation errors should land in the status log');
assert(appJs.includes("pushStatusLog('校验警告：'"),
  'import validation warnings should land in the status log');
// Validation should sanity-check the polymorphic shapes we've been guarding.
['characters 不是数组', 'factions 不是数组', 'events 既不是数组也不是对象',
 'variables 既不是数组也不是对象', 'globalRules 既不是字符串也不是数组',
 'adminHierarchy 既不是对象也不是数组'].forEach((needle) => {
  assert(appJs.includes(needle),
    'validateImportedScenario should sanity-check field shape: ' + needle);
});

// Slice 29: collapsible module rail. Shrinks the left rail to a thin
// glyph-only strip so the detail area gets more width for deep editing.
// Persists collapsed state to localStorage.
assert(appJs.includes('RAIL_COLLAPSED_KEY'),
  'preview app should declare a rail-collapsed storage key');
assert(appJs.includes('function setRailCollapsed'),
  'preview app should expose setRailCollapsed');
assert(appJs.includes('function toggleRailCollapsed'),
  'preview app should expose toggleRailCollapsed');
assert(appJs.includes("event.target.closest('#rail-collapse-btn')"),
  'click handler should route to toggleRailCollapsed when the collapse button is clicked');
assert(appJs.includes('setRailCollapsed(isRailCollapsed())'),
  'init should restore persisted rail-collapsed state');
assert(html.includes('id="rail-collapse-btn"'),
  'preview shell should ship the rail collapse button');
assert(html.includes('id="editor-grid"'),
  'preview shell should mark the editor grid for collapse styling');
assert(html.includes('.editor-grid[data-rail-collapsed="true"]'),
  'preview shell should style the collapsed grid layout');
assert(html.includes('.rail-collapse-btn'),
  'preview shell should ship rail collapse button styling');

// Slice 30: division deep-edit grouped view. Buckets primitive fields by
// semantic domain so the 30+ field form is scannable instead of a wall of
// inputs.
assert(appJs.includes('DEEP_FORM_GROUPS'),
  'preview app should declare DEEP_FORM_GROUPS');
['identity', 'population', 'economy', 'fiscal', 'governance', 'carrying', 'description'].forEach((id) => {
  assert(appJs.indexOf("id: '" + id + "'") >= 0,
    'deep form groups should include: ' + id);
});
assert(appJs.includes('function classifyDeepField'),
  'preview app should classify each field key into a group');
assert(appJs.includes('data-tree-deep-section'),
  'deep form sections should be marked with data-tree-deep-section');
assert(appJs.includes('buckets[bucket]'),
  'deep form render should bucket primitives before rendering');
assert(html.includes('.tree-deep-section'),
  'preview shell should ship deep-section styling');
['identity', 'population', 'economy', 'fiscal', 'governance', 'carrying', 'description', 'other'].forEach((id) => {
  assert(html.includes('data-tree-deep-section="' + id + '"'),
    'preview shell should color-code deep-section: ' + id);
});

// Slice 31: export validation gate. Mirrors Slice 28 — refuses to download a
// scenario whose shape would break on re-import unless the creator
// explicitly forces it.
assert(appJs.includes('function performExportDownload'),
  'preview app should extract the download mechanics into performExportDownload');
assert(appJs.includes('function forceExportScenario'),
  'preview app should expose forceExportScenario');
assert(appJs.includes('state.pendingExport'),
  'export gate should stash pendingExport on validation failure');
assert(appJs.includes("pushStatusLog('导出错误：'"),
  'export errors should land in the status log');
assert(appJs.includes("pushStatusLog('导出警告：'"),
  'export warnings should land in the status log');
assert(appJs.includes('var report = validateImportedScenario(state.scenario)'),
  'exportScenario should reuse the import validator');

// Slice 32: tree workbench depth indentation. collectTreeRows already yields
// row.depth; the workbench now renders it as a leftward indent with a colored
// border per depth tier and a horizontal connector rail.
assert(appJs.includes('var depth = Number(row.depth) || 0'),
  'tree workbench should read row.depth for indentation');
assert(appJs.includes('data-tree-depth="'),
  'tree row should carry data-tree-depth for CSS targeting');
assert(appJs.includes('style="--tree-depth:'),
  'tree row should inline --tree-depth as a CSS custom property');
assert(appJs.includes('tree-row-depth-rail'),
  'tree row should render a depth rail connector');
['0', '1', '2', '3'].forEach((d) => {
  assert(html.includes('data-tree-depth="' + d + '"'),
    'preview shell should style tree depth: ' + d);
});
assert(html.includes('var(--tree-depth, 0)'),
  'preview shell should use --tree-depth custom property in tree-row CSS');
assert(html.includes('.tree-row-depth-rail'),
  'preview shell should ship depth rail connector styling');

// Slice 33: AI call log panel. Captures every AI API roundtrip (field,
// action, request/response char count, duration, status, error). Bounded
// by AI_CALL_LOG_CAPACITY.
assert(appJs.includes('AI_CALL_LOG_CAPACITY'),
  'preview app should declare AI call log capacity');
assert(appJs.includes('function pushAiCallEntry'),
  'preview app should expose pushAiCallEntry');
assert(appJs.includes('function renderAiCallLog'),
  'preview app should expose renderAiCallLog');
assert(appJs.includes('function clearAiCallLog'),
  'preview app should expose clearAiCallLog');
assert(appJs.includes('pushAiCallEntry({'),
  'runAiJob should record each roundtrip into the call log');
assert(appJs.includes('durationMs: Date.now() - startedAt'),
  'AI call log entries should include duration');
assert(appJs.includes("if (command === 'clear-ai-call-log')"),
  'event router should dispatch clear-ai-call-log');
assert(appJs.includes('<div data-panel="ai-call-log">'),
  'preview app should mount the ai-call-log panel');
assert(appJs.includes('renderAiCallLog();'),
  'renderAll should refresh the AI call log');
assert(html.includes('[data-panel="ai-call-log"]'),
  'preview shell should ship ai-call-log panel styling');
['draft', 'error', 'running'].forEach((status) => {
  assert(html.includes('data-ai-call-status="' + status + '"'),
    'preview shell should color-code ai call status: ' + status);
});

// Slice 34: field watch list. Pin top-level fields across modules to a
// persistent quick-jump list rendered in the right inspector.
assert(appJs.includes('WATCH_LIST_KEY'),
  'preview app should declare a watch-list storage key');
assert(appJs.includes('WATCH_LIST_CAPACITY'),
  'preview app should cap the watch list size');
assert(appJs.includes('function ensureWatchList'),
  'preview app should expose ensureWatchList');
assert(appJs.includes('function toggleWatched'),
  'preview app should expose toggleWatched');
assert(appJs.includes('function jumpWatchField'),
  'preview app should expose jumpWatchField');
assert(appJs.includes('function clearWatchList'),
  'preview app should expose clearWatchList');
assert(appJs.includes("if (command === 'toggle-watch-field')"),
  'event router should dispatch toggle-watch-field');
assert(appJs.includes("if (command === 'jump-watch-field')"),
  'event router should dispatch jump-watch-field');
assert(appJs.includes("if (command === 'clear-watch-list')"),
  'event router should dispatch clear-watch-list');
assert(appJs.includes('var starGlyph = watched ? '),
  'field chip should toggle star glyph based on watched state');
assert(appJs.includes('field-chip-star'),
  'field chip should render the watch star icon');
assert(appJs.includes("event.target.closest('[data-editor-command]') || event.target.closest('[data-ai-action]')"),
  'field-pick handler should defer to inner star/AI buttons');
assert(appJs.includes('<div data-panel="watch-list">'),
  'preview app should mount the watch-list panel');
assert(appJs.includes('renderWatchList();'),
  'renderAll should refresh the watch list');
assert(html.includes('[data-panel="watch-list"]'),
  'preview shell should ship watch-list panel styling');
assert(html.includes('.watch-list-row'),
  'preview shell should ship watch-list row styling');
assert(html.includes('.field-chip-star'),
  'preview shell should ship field-chip-star styling');

// Slice 35: history log panel. Renders state.history (the chronological push
// log, capacity 80) so creators can audit every action with timestamps and
// classification colors. Distinct from undo stack — undo can roll back, log
// is read-only audit.
assert(appJs.includes('function renderHistoryLogPanel'),
  'preview app should expose renderHistoryLogPanel');
assert(appJs.includes('function clearHistoryLog'),
  'preview app should expose clearHistoryLog');
assert(appJs.includes("if (command === 'clear-history-log')"),
  'event router should dispatch clear-history-log');
assert(appJs.includes('<div data-panel="history-log">'),
  'preview app should mount the history-log panel');
assert(appJs.includes('renderHistoryLogPanel();'),
  'renderAll should refresh the history log');
['save', 'merge', 'undo', 'delete', 'create', 'misc'].forEach((kind) => {
  assert(appJs.indexOf("data-history-type=\"' + escapeHtml(typeClass) +") >= 0 || appJs.includes("'" + kind + "'"),
    'history log render should classify by action kind: ' + kind);
});
assert(html.includes('[data-panel="history-log"]'),
  'preview shell should ship history-log panel styling');
['save', 'merge', 'undo', 'delete', 'create', 'misc'].forEach((kind) => {
  assert(html.includes('data-history-type="' + kind + '"'),
    'preview shell should color-code history kind: ' + kind);
});

// Slice 36: granular AI batch helpers. queueModuleAiTasksFiltered targets a
// subset of the module's fields (missing / present / watched) so creators
// don't have to run the full module batch when only certain gaps need work.
assert(appJs.includes('function queueModuleAiTasksFiltered'),
  'preview app should expose queueModuleAiTasksFiltered');
['missing', 'present', 'watched', 'all'].forEach((filterId) => {
  assert(appJs.indexOf("filterId === '" + filterId + "'") >= 0 || filterId === 'all',
    'queueModuleAiTasksFiltered should branch on filter id: ' + filterId);
});
assert(appJs.includes("if (command === 'queue-module-ai-filtered')"),
  'event router should dispatch queue-module-ai-filtered');
assert(appJs.includes('data-queue-filter="missing"'),
  'AI task workbench should expose the missing-fields batch button');
assert(appJs.includes('data-queue-filter="present"'),
  'AI task workbench should expose the polish-existing batch button');
assert(appJs.includes('data-queue-filter="watched"'),
  'AI task workbench should expose the watched-fields batch button');

// Slice 37: AI draft diff visualization. compareDraft now produces a
// structured diff (line / key / array / fallback) instead of two raw blobs.
assert(appJs.includes('function buildDraftDiff'),
  'preview app should expose buildDraftDiff');
assert(appJs.includes('function renderDraftDiff'),
  'preview app should expose renderDraftDiff');
['function diffLines', 'function diffObjectKeys', 'function diffArrayHead'].forEach((needle) => {
  assert(appJs.includes(needle), 'preview app should declare ' + needle);
});
["'identical'", "'lines'", "'keys'", "'array'", "'fallback'"].forEach((kind) => {
  assert(appJs.indexOf(kind) >= 0, 'buildDraftDiff should support diff kind: ' + kind);
});
assert(appJs.includes('var diff = buildDraftDiff(state.scenario[draft.field], draft.value)'),
  'compareDraft should run buildDraftDiff against current vs draft value');
assert(html.includes('.draft-diff'),
  'preview shell should ship draft-diff styling');
['added', 'removed', 'changed', 'same'].forEach((side) => {
  assert(html.includes('data-draft-diff-side="' + side + '"'),
    'preview shell should color-code draft diff side: ' + side);
});

// Slice 38: field multi-select mode. Toggle a mode that turns field chips
// into checkboxes for batch queue / pin / clear actions.
assert(appJs.includes('state.fieldMultiSelect'),
  'preview app should track multi-select state');
assert(appJs.includes('function toggleFieldMultiSelect'),
  'preview app should expose toggleFieldMultiSelect');
assert(appJs.includes('function toggleFieldMultiPick'),
  'preview app should expose toggleFieldMultiPick');
assert(appJs.includes('function selectAllVisibleFields'),
  'preview app should expose selectAllVisibleFields');
assert(appJs.includes('function multiQueueAi'),
  'preview app should expose multiQueueAi');
assert(appJs.includes('function multiPinWatch'),
  'preview app should expose multiPinWatch');
['toggle-field-multi-select', 'toggle-field-multi-pick', 'select-all-visible-fields',
 'clear-field-multi', 'multi-queue-ai', 'multi-pin-watch'].forEach((cmd) => {
  assert(appJs.indexOf("if (command === '" + cmd + "')") >= 0,
    'event router should dispatch ' + cmd);
});
assert(appJs.includes('data-multi-picked='),
  'field chip should expose data-multi-picked when selected');
assert(html.includes('.field-chip-pick'),
  'preview shell should style the multi-select checkbox');
assert(html.includes('[data-multi-picked="true"]'),
  'preview shell should outline picked chips');

// Slice 39: API preset switcher. Named slots persist key/url/model triples
// so a creator can swap between OpenAI / Anthropic / local endpoints with
// a single dropdown selection.
assert(appJs.includes('API_PRESETS_KEY'),
  'preview app should declare an API preset storage key');
assert(appJs.includes('function readApiPresets'),
  'preview app should expose readApiPresets');
assert(appJs.includes('function applyApiPreset'),
  'preview app should expose applyApiPreset');
assert(appJs.includes('function captureCurrentApiPreset'),
  'preview app should expose captureCurrentApiPreset');
assert(appJs.includes('function deleteApiPreset'),
  'preview app should expose deleteApiPreset');
assert(appJs.includes("if (command === 'capture-api-preset')"),
  'event router should dispatch capture-api-preset');
assert(appJs.includes("if (command === 'delete-api-preset')"),
  'event router should dispatch delete-api-preset');
assert(appJs.includes('event.target.dataset.apiPresetSelect != null'),
  'change handler should react to preset select');
assert(appJs.includes('id="api-preset-select"'),
  'API settings workbench should render the preset select');
assert(html.includes('.api-presets-bar'),
  'preview shell should ship api-presets-bar styling');

// Slice 40: scenario metadata workbench. _adaptation / _buildStatus /
// mapRuntimeContract get a dedicated form per schema instead of raw JSON.
assert(appJs.includes('function isMetadataField'),
  'preview app should expose isMetadataField');
assert(appJs.includes('function metadataFieldSchema'),
  'preview app should expose metadataFieldSchema');
assert(appJs.includes('function renderMetadataWorkbench'),
  'preview app should expose renderMetadataWorkbench');
assert(appJs.includes('function saveMetadataWorkbench'),
  'preview app should expose saveMetadataWorkbench');
['_adaptation', '_buildStatus', 'mapRuntimeContract'].forEach((field) => {
  assert(appJs.indexOf("'" + field + "'") >= 0,
    'metadata workbench should recognize field: ' + field);
});
['_adaptation', '_buildStatus'].forEach((field) => {
  assertRuntimeSurfacePanel(field, 'structured-workbench',
    'runtime audit should route scenario metadata to the metadata workbench: ' + field);
});
assert(appJs.includes("if (isMetadataField(field, value)) return renderMetadataWorkbench(field, value)"),
  'structured dispatch should route metadata fields to the workbench');
assert(appJs.includes("if (command === 'save-metadata-workbench')"),
  'event router should dispatch save-metadata-workbench');
assert(html.includes('.metadata-workbench'),
  'preview shell should ship metadata workbench styling');
assert(html.includes('.metadata-extras'),
  'preview shell should style the extras-preserving section');

// Slice 41: draft inline edit. Renders draft.value into a textarea so the
// creator can tweak before 纳入 without an accept-then-edit roundtrip.
assert(appJs.includes('function saveDraftEdit'),
  'preview app should expose saveDraftEdit');
assert(appJs.includes('data-draft-edit-id'),
  'draft preview should mark the editable textarea with data-draft-edit-id');
assert(appJs.includes('class="draft-edit-textarea"'),
  'draft preview should render the editable textarea class');
assert(appJs.includes('var editable = draft.status === '),
  'renderDraft should only expose the editor for review-required drafts');
assert(appJs.includes("if (command === 'save-draft-edit')"),
  'event router should dispatch save-draft-edit');
assert(html.includes('.draft-edit-textarea'),
  'preview shell should ship draft-edit-textarea styling');

// Slice 42: events timeline visualization. Adds year-bucket / turn-bucket
// section headers between rows so a 60-event scenario doesn't render as a
// single flat list.
assert(appJs.includes('var year = null'),
  'buildEventTimelinePreview should extract year per row');
assert(appJs.includes('var turn = null'),
  'buildEventTimelinePreview should extract turn per row');
assert(appJs.includes('var bucketHeader'),
  'renderEventTimelinePreview should compute a bucket header per row');
assert(appJs.includes("bucketHeader = '年份 '"),
  'dated rows should produce 年份 N bucket headers');
assert(appJs.includes("bucketHeader = '回合 '"),
  'turn-only rows should produce 回合 X-Y bucket headers');
assert(appJs.includes("bucketHeader = '待定时间'"),
  'undated rows should land in the 待定时间 bucket');
assert(appJs.includes("var bucketStart = Math.floor(row.turn / 10) * 10"),
  'turn buckets should chunk into tens to avoid one-header-per-turn');
assert(html.includes('.event-timeline-bucket'),
  'preview shell should ship event-timeline-bucket styling');

// Slice 43: draft batch operations. The queue panel can hold 40 drafts;
// individually 纳入/拒绝 each is tedious. Adds rejectDraft + acceptAllDrafts
// + rejectAllDrafts + a batch toolbar in renderQueue when >1 pending.
assert(appJs.includes('function rejectDraft'),
  'preview app should expose rejectDraft');
assert(appJs.includes('function acceptAllDrafts'),
  'preview app should expose acceptAllDrafts');
assert(appJs.includes('function rejectAllDrafts'),
  'preview app should expose rejectAllDrafts');
['reject-draft', 'accept-all-drafts', 'reject-all-drafts'].forEach((cmd) => {
  assert(appJs.indexOf("if (command === '" + cmd + "')") >= 0,
    'event router should dispatch ' + cmd);
});
assert(appJs.includes("queue-batch-bar"),
  'queue panel should render a batch bar when pending drafts > 1');
assert(html.includes('.queue-batch-bar'),
  'preview shell should ship queue-batch-bar styling');

// Slice 44: scenario quick-stats delta vs baseline. setLiveMetric now accepts
// a baseline and renders "N (+x)" / "N (-y)" / "N" plus a data-metric-delta
// attribute for CSS coloring.
assert(appJs.includes('function formatMetricDelta'),
  'preview app should expose formatMetricDelta');
assert(appJs.includes('node.dataset.metricDelta'),
  'setLiveMetric should tag the metric node with delta direction');
['up', 'down', 'zero'].forEach((dir) => {
  assert(appJs.indexOf("'" + dir + "'") >= 0,
    'metric delta direction should classify: ' + dir);
});
assert(appJs.includes('setLiveMetric(\'characters\', countCollection(sc.characters), countCollection(orig.characters))'),
  'renderScenarioDashboard should pass baseline counts to setLiveMetric');
['up', 'down', 'zero'].forEach((dir) => {
  assert(html.includes('data-metric-delta="' + dir + '"'),
    'preview shell should color-code metric delta: ' + dir);
});

// Slice 45: AI fill-missing combo. Wraps queueModuleAiTasksFiltered('missing')
// across all modules + optional runAiQueue. Adds two combo buttons to the AI
// desk panel.
assert(appJs.includes('function aiFillAllMissing'),
  'preview app should expose aiFillAllMissing');
assert(appJs.includes("queueModuleAiTasksFiltered(mod.id, 'missing')"),
  'aiFillAllMissing should iterate modules and queue missing fields each');
assert(appJs.includes('var drafts = await runAiQueue()'),
  'aiFillAllMissing should await the AI queue when opts.run is true');
['ai-fill-all-missing-queue', 'ai-fill-all-missing-run'].forEach((cmd) => {
  assert(appJs.indexOf("if (command === '" + cmd + "')") >= 0,
    'event router should dispatch ' + cmd);
});
assert(html.includes('data-editor-command="ai-fill-all-missing-queue"'),
  'AI desk should expose the fill-missing queue button');
assert(html.includes('data-editor-command="ai-fill-all-missing-run"'),
  'AI desk should expose the fill-missing run button');
assert(html.includes('.ai-button--combo'),
  'preview shell should style the combo button variant');

// Slice 46: scenario skeleton wizard. Dynasty/year/role/tradition →
// shape-correct minimal scenario.
assert(appJs.includes('function buildWizardScenario'),
  'preview app should expose buildWizardScenario');
assert(appJs.includes('function launchScenarioWizard'),
  'preview app should expose launchScenarioWizard');
assert(appJs.includes("if (command === 'run-scenario-wizard')"),
  'event router should dispatch run-scenario-wizard');
['wizard-dynasty', 'wizard-era', 'wizard-startYear', 'wizard-tradition'].forEach((id) => {
  assert(appJs.indexOf("id=\"" + id + "\"") >= 0,
    'wizard form should declare input ' + id);
});
assert(appJs.includes("tradition === 'shaosong'"),
  'wizard should branch on tradition for shape selection');
assert(html.includes('[data-panel="scenario-wizard"]'),
  'preview shell should style the scenario-wizard panel');

// Slice 47: nested string arrays in division deep edit.
assert(appJs.includes('function addTreeDeepArrayRow'),
  'preview app should expose addTreeDeepArrayRow');
assert(appJs.includes('function saveTreeDeepArrays'),
  'preview app should expose saveTreeDeepArrays');
['academies', 'tradeRoutes', 'recentDisasters', 'threats', 'religiousSites', 'leadingGentry'].forEach((key) => {
  assert(appJs.indexOf("'" + key + "'") >= 0,
    'deep array editor should cover string-array key: ' + key);
});
assert(appJs.includes("if (command === 'add-tree-deep-array-row')"),
  'event router should dispatch add-tree-deep-array-row');
assert(appJs.includes("if (command === 'save-tree-deep-arrays')"),
  'event router should dispatch save-tree-deep-arrays');
assert(html.includes('.tree-deep-arrays'),
  'preview shell should style the tree deep arrays section');

// Slice 48: module rail drag-and-drop reorder.
assert(appJs.includes('MODULE_ORDER_KEY'),
  'preview app should declare a module-order storage key');
assert(appJs.includes('function readModuleOrder'),
  'preview app should expose readModuleOrder');
assert(appJs.includes('function applyModuleOrder'),
  'preview app should expose applyModuleOrder');
assert(appJs.includes('function resetModuleOrder'),
  'preview app should expose resetModuleOrder');
assert(appJs.includes('function wireModuleDragHandlers'),
  'preview app should expose wireModuleDragHandlers');
assert(appJs.includes("list.addEventListener('dragstart'"),
  'wireModuleDragHandlers should subscribe to dragstart');
assert(appJs.includes("list.addEventListener('drop'"),
  'wireModuleDragHandlers should subscribe to drop');
assert(appJs.includes("if (command === 'reset-module-order')"),
  'event router should dispatch reset-module-order');
assert(appJs.includes('applyModuleOrder()'),
  'init should call applyModuleOrder after loadScenario');
assert(appJs.includes('wireModuleDragHandlers()'),
  'init should call wireModuleDragHandlers');
assert(html.includes('id="rail-reset-order-btn"'),
  'rail head should include reset-order button');
assert(html.includes('data-editor-command="reset-module-order"'),
  'reset button should dispatch reset-module-order command');

// Slice 49: performance overlay (Ctrl+Shift+P).
assert(appJs.includes('PERF_OVERLAY_KEY'),
  'preview app should declare a perf overlay storage key');
assert(appJs.includes('function togglePerfOverlay'),
  'preview app should expose togglePerfOverlay');
assert(appJs.includes('function renderPerfOverlay'),
  'preview app should expose renderPerfOverlay');
assert(appJs.includes('function renderAllInner'),
  'renderAll should delegate to renderAllInner so the wrapper can time it');
assert(appJs.includes('perf.totalRenders += 1'),
  'renderAll wrapper should accumulate render count');
assert(appJs.includes("ctrl && event.shiftKey && (event.key === 'p' || event.key === 'P')"),
  'keydown handler should dispatch Ctrl+Shift+P to togglePerfOverlay');
assert(html.includes('#perf-overlay'),
  'preview shell should style the perf overlay');

// Slice 50: scenario diff markdown export.
assert(appJs.includes('function buildComparisonMarkdown'),
  'preview app should expose buildComparisonMarkdown');
assert(appJs.includes('function exportComparisonMarkdown'),
  'preview app should expose exportComparisonMarkdown');
assert(appJs.includes('function copyComparisonMarkdown'),
  'preview app should expose copyComparisonMarkdown');
assert(appJs.includes("if (command === 'export-comparison-md')"),
  'event router should dispatch export-comparison-md');
assert(appJs.includes("if (command === 'copy-comparison-md')"),
  'event router should dispatch copy-comparison-md');
assert(appJs.includes('data-editor-command="export-comparison-md"'),
  'comparison-controls should expose 导出 MD button');
assert(appJs.includes('data-editor-command="copy-comparison-md"'),
  'comparison-controls should expose 复制 MD button');
assert(appJs.includes('# 剧本对照'),
  'markdown builder should produce a title row with both source labels');

// Slice 51: collaborative share URL.
assert(appJs.includes('SHARE_URL_PREFIX'),
  'preview app should declare a share URL prefix');
assert(appJs.includes('SHARE_URL_LIMIT'),
  'preview app should cap the share URL payload size');
assert(appJs.includes('function encodeScenarioForUrl'),
  'preview app should expose encodeScenarioForUrl');
assert(appJs.includes('function buildShareUrl'),
  'preview app should expose buildShareUrl');
assert(appJs.includes('function copyShareUrl'),
  'preview app should expose copyShareUrl');
assert(appJs.includes('function importScenarioFromHash'),
  'preview app should expose importScenarioFromHash');
assert(appJs.includes("if (command === 'copy-share-url')"),
  'event router should dispatch copy-share-url');
assert(appJs.includes('importScenarioFromHash()'),
  'init should attempt to import from URL hash');
// 2026-07-21 owner 裁：真剧本 MB 级 URL 装不下·分享钮点了只报「剧本过大」=死重→入口裁撤·装载机留(旧链接照开)
assert(!appJs.includes('data-editor-command="copy-share-url"'),
  '复制分享链接 entry must stay removed (dead weight at real scenario sizes)');

// Slice 52: focus-visible ring discipline + active module accent.
assert(html.includes('Slice 52: Focus discipline & active accent'),
  'preview shell should mark Slice 52 polish block');
assert(/\.module-tile:focus-visible[^{]*\{[^}]*outline:\s*2px solid var\(--gold-bright\)/s.test(html),
  'module-tile :focus-visible should render a gold halo');
assert(/\.scenario-pill-menu-item:focus-visible/.test(html),
  'scenario-pill-menu-item should ship :focus-visible halo');
assert(/\.workbench-tab:focus-visible/.test(html),
  'workbench-tab should ship :focus-visible halo');
assert(/\.module-tile\.active::before\s*\{/.test(html),
  'active module-tile should grow a left accent bar via ::before');
assert(html.includes('linear-gradient(180deg, var(--gold-bright), var(--jade))'),
  'active accent should use the gold→jade gradient token pair');

// Slice 53: tabular numerals on numeric chrome.
assert(html.includes('Slice 53: Tabular numerals on numeric chrome'),
  'preview shell should mark Slice 53 polish block');
assert(/font-variant-numeric:\s*tabular-nums/.test(html),
  'preview shell should declare font-variant-numeric: tabular-nums');
assert(/font-feature-settings:\s*"tnum" 1/.test(html),
  'preview shell should set font-feature-settings tnum 1 fallback');
assert(/\.metric b,[\s\S]*\.health-value,[\s\S]*\.module-count/.test(html),
  'tabular-nums rule should target metric b, health-value, module-count');

// Slice 54: prefers-reduced-motion safety.
assert(html.includes('Slice 54: prefers-reduced-motion'),
  'preview shell should mark Slice 54 polish block');
assert(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/.test(html),
  'preview shell should ship a prefers-reduced-motion media query');
assert(/animation-duration:\s*0\.01ms\s*!important/.test(html),
  'reduced-motion block should suppress animation duration');
assert(/transition-duration:\s*0\.01ms\s*!important/.test(html),
  'reduced-motion block should suppress transition duration');

// Slice 55: top-actions icon-btn accessibility labels.
assert(appJs.includes('aria-label="撤销上一步编辑"'),
  'undo icon-btn should expose an explicit aria-label');
assert(appJs.includes('aria-label="重做上一步撤销"'),
  'redo icon-btn should expose an explicit aria-label');
assert(appJs.includes('aria-label="校验剧本冲突"'),
  'validate icon-btn should expose an explicit aria-label');
assert(appJs.includes('data-editor-command="open-workshop-hub">创意工坊'),
  '⋯ more-menu should carry the 创意工坊 entry (owner 2026-07-21 点名)');
assert(appJs.includes("if (command === 'open-workshop-hub')") && appJs.includes('tmOpenWorkshop=1'),
  'workshop hub entry should navigate back to the game with the tmOpenWorkshop flag');
// 工坊案台二稿(owner 批「跳游戏不友好」)：入口首选聚焦编辑器内案台面板·adapters 缺席才兜底跳游戏
assert(appJs.includes("focusRuntimePanel('workshop-desk')"),
  'workshop hub entry should first focus the in-editor workshop desk panel');
assert(adaptersJs.includes("'data-panel', 'workshop-desk'") && adaptersJs.includes('workshop-desk-body'),
  'adapters should inject the workshop desk runtime panel');
assert(adaptersJs.includes("'../tm-online-client.js'"),
  'workshop desk should lazy-load the online client (zero-dep UMD·session 与游戏同源互通)');
assert(adaptersJs.includes('uploadScenario') && adaptersJs.includes('canExport'),
  'publish flow should call uploadScenario behind the preflight canExport gate');
assert(adaptersJs.includes('authorPacks'),
  'workshop desk should list my published packs via workshop/author');
assert(adaptersJs.includes('data-ws-act="publish"') && adaptersJs.includes('data-ws-act="login"'),
  'workshop desk should expose publish and login actions');
var contentManagerJs = fs.readFileSync(path.join(ROOT, 'tm-content-manager.js'), 'utf8');
assert(contentManagerJs.includes('tmOpenWorkshop=1') && contentManagerJs.includes('TMContentManager.open()'),
  'game side should honor tmOpenWorkshop=1 by auto-opening the content manager workshop view');
assert(/\.top-more-menu\[hidden\]\s*\{[^}]*display:\s*none/.test(html),
  'hidden attr must be explicitly re-armed on .top-more-menu (author display:flex would override UA [hidden])');
assert(appJs.includes('title="撤销 (Ctrl+Z)"'),
  'undo icon-btn title should surface the keyboard shortcut');
assert(appJs.includes('title="重做 (Ctrl+Y)"'),
  'redo icon-btn title should surface the keyboard shortcut');
assert(/<button type="button" class="icon-btn"[^>]*aria-label="校验剧本冲突">验<\/button>/.test(html),
  'static prototype 验 icon-btn should also carry aria-label and type=button');

// Slice 56: floating status toast.
assert(html.includes('Slice 56: Floating status toast'),
  'preview shell should mark Slice 56 polish block');
assert(/#status-toast-host\s*\{/.test(html),
  'preview shell should declare #status-toast-host fixed container');
assert(/\.status-toast\[data-status-toast-tone="(good|warn|error|info)"\]/.test(html),
  'status-toast should ship tone-keyed border-left colors');
assert(/\.status-toast\[data-status-toast-state="enter"\]/.test(html),
  'status-toast should ship enter/exit state transitions');
assert(appJs.includes('function pushStatusToast'),
  'preview app should expose pushStatusToast');
assert(appJs.includes('function ensureStatusToastHost'),
  'preview app should expose ensureStatusToastHost');
assert(appJs.includes("host.setAttribute('aria-live', 'polite')"),
  'status-toast host should announce updates with aria-live polite');
assert(appJs.includes('STATUS_TOAST_MAX'),
  'preview app should cap visible toasts via STATUS_TOAST_MAX');
assert(appJs.includes('STATUS_TOAST_DISMISS_MS'),
  'preview app should differentiate dwell time per tone');
assert(appJs.includes('pushStatusToast(text, tone)'),
  'setStatus should hand the message to pushStatusToast');

// Slice 58: module-tile drag handle affordance.
assert(html.includes('Slice 58: Module-tile drag handle affordance'),
  'preview shell should mark Slice 58 polish block');
assert(/\.module-tile::after\s*\{/.test(html),
  'module-tile drag handle should ride on ::after pseudo-element');
assert(/\.module-tile:hover::after,[\s\S]*\.module-tile:focus-visible::after,[\s\S]*\.module-tile\[data-dragging="true"\]::after/.test(html),
  'drag handle should surface on hover, keyboard focus, and during drag');
assert(/\.editor-grid\[data-rail-collapsed="true"\] \.module-tile::after\s*\{[^}]*display:\s*none/.test(html),
  'drag handle should disappear when the rail collapses');

// Slice 59: themed scrollbar.
assert(html.includes('Slice 59: Themed scrollbar styling'),
  'preview shell should mark Slice 59 polish block');
assert(/scrollbar-color:\s*rgba\(202,162,76,\.55\)\s*rgba\(10,8,5,\.42\)/.test(html),
  'Firefox scrollbar-color tokens should match ink/gold palette');
assert(/\.reset-shell ::-webkit-scrollbar\s*,[\s\S]*\.ai-drawer ::-webkit-scrollbar\s*\{/.test(html),
  'webkit scrollbar styling should cover both shell and drawer descendants');
assert(/::-webkit-scrollbar-thumb[\s\S]*linear-gradient\(180deg,\s*rgba\(202,162,76,\.62\)/.test(html),
  'scrollbar thumb should use the gold→jade gradient at rest');

// Slice 60: Alt+1..9 module quick-jump.
assert(appJs.includes("/^[1-9]$/.test(event.key)"),
  'keydown handler should match Alt + digit keys 1..9');
assert(appJs.includes("已跳转到第 ' + n + ' 章"),
  'Alt+digit jump should announce the new module index via setStatus');
assert(appJs.includes("tile.setAttribute('aria-keyshortcuts', 'Alt+'"),
  'renderModuleTiles should stamp aria-keyshortcuts on first 9 tiles');
assert(/' \+ '· Alt\+'/.test(appJs) || appJs.includes("' · Alt+'"),
  'renderModuleTiles should encode the Alt shortcut in the tile title');

// Slice 61: card hover lift.
assert(html.includes('Slice 61: Interactive card hover lift'),
  'preview shell should mark Slice 61 polish block');
assert(/\.mode-card:hover[\s\S]*translateY\(-1px\)/.test(html),
  'mode-card hover should apply a translateY(-1px) lift');
assert(/\.health-card:hover/.test(html),
  'health-card should opt into the hover lift treatment');
assert(/\.ai-card:hover/.test(html),
  'ai-card should opt into the hover lift treatment');

// Slice 62: empty-state callouts.
assert(html.includes('Slice 62: Empty-state callouts'),
  'preview shell should mark Slice 62 polish block');
assert(/\.empty-state-card\s*\{/.test(html),
  'preview shell should ship .empty-state-card baseline');
assert(/\.empty-state-card\[data-empty-state="validation"\] \.empty-state-glyph/.test(html),
  'validation empty-state should get its own indigo-keyed glyph');
assert(/\.empty-state-card\[data-empty-state="ai-call-log"\] \.empty-state-glyph/.test(html),
  'ai-call-log empty-state should get its own jade-keyed glyph');
assert(appJs.includes('data-empty-state="status-log"'),
  'status-log empty state should render the new callout markup');
assert(appJs.includes('data-empty-state="ai-call-log"'),
  'ai-call-log empty state should render the new callout markup');
assert(appJs.includes('data-empty-state="project-library"'),
  'project-library empty state should render the new callout markup');
assert(appJs.includes('data-empty-state="validation"'),
  'validation empty state should render the new callout markup');

// Slice 63: module glyph carved-seal elevation.
assert(html.includes('Slice 63: Module glyph carved-seal elevation'),
  'preview shell should mark Slice 63 polish block');
assert(/\.module-glyph\s*\{[\s\S]*radial-gradient\(circle at 28% 26%/.test(html),
  'module-glyph base should ship the radial highlight gradient');
assert(/\.module-tile\.active \.module-glyph[\s\S]*box-shadow:[\s\S]*0 0 10px rgba\(242,217,132,\.22\)/.test(html),
  'active tile glyph should pick up the gold halo');
assert(/\.detail-title \.module-glyph[\s\S]*0 0 12px rgba\(242,217,132,\.18\)/.test(html),
  'inspector detail-title glyph should pick up the carved-seal treatment');

// Slice 64: section-head panel-type accent strip.
assert(html.includes('Slice 64: Section-head panel-type accent strip'),
  'preview shell should mark Slice 64 polish block');
assert(/\.panel \.section-head::before\s*\{[\s\S]*width:\s*3px/.test(html),
  'section-head should ship a 3px left accent strip via ::before');
assert(/\[data-panel="ai-desk"\] \.section-head::before/.test(html),
  'AI-desk panel should opt into jade accent');
assert(/\[data-panel="creator-workflow"\] \.section-head::before/.test(html),
  'creator-workflow panel should opt into jade-soft accent');
assert(/\[data-panel="status-log"\] \.section-head::before/.test(html),
  'status-log panel should opt into indigo accent');
assert(/\[data-panel="validation"\] \.section-head::before/.test(html),
  'validation panel should opt into cinnabar accent');

// Slice 65: workbench tab active underline indicator.
assert(html.includes('Slice 65: Workbench tab active underline indicator'),
  'preview shell should mark Slice 65 polish block');
assert(/\.workbench-tab::after\s*\{[\s\S]*transform:\s*scaleX\(0\)/.test(html),
  'workbench-tab ::after should rest at scaleX(0)');
assert(/\.workbench-tab\[data-active="true"\]::after\s*\{[^}]*transform:\s*scaleX\(1\)/.test(html),
  'active workbench-tab should expand to scaleX(1)');
assert(/linear-gradient\(90deg,\s*var\(--gold-bright\),\s*var\(--jade\)\)/.test(html),
  'workbench-tab underline should use gold→jade gradient token pair');

// Slice 66: entity-search "/" hint badge.
assert(html.includes('Slice 66: "/" search hint badge on entity-search input'),
  'preview shell should mark Slice 66 polish block');
assert(/\.entity-search-host::after\s*\{[\s\S]*content:\s*"\/"/.test(html),
  'entity-search-host ::after should render a "/" kbd-style badge');
assert(/\.entity-search-host:focus-within::after,[\s\S]*\.entity-search-host\[data-has-value="true"\]::after\s*\{[^}]*opacity:\s*0/.test(html),
  'badge should fade on focus-within and when input has a value');
assert(appJs.includes('class="entity-search-host"'),
  'entity-toolbar render should wrap #entity-search in .entity-search-host');
assert(appJs.includes('aria-keyshortcuts="/"'),
  'entity-search input should expose aria-keyshortcuts="/"');

// Slice 68: keyboard shortcut cheatsheet.
assert(html.includes('Slice 68: Keyboard shortcut cheatsheet'),
  'preview shell should mark Slice 68 polish block');
assert(/#shortcut-cheatsheet\[data-active="true"\]\s*\{\s*display:\s*flex/.test(html),
  '#shortcut-cheatsheet should activate via data-active="true" + flex layout');
assert(/\.shortcut-cheatsheet-card\s*\{[\s\S]*max-height:\s*calc\(100vh - 80px\)/.test(html),
  'cheatsheet card should cap height to viewport with 80px margin');
assert(/\.shortcut-cheatsheet-group kbd\s*\{/.test(html),
  'cheatsheet should style <kbd> tokens');
assert(appJs.includes('function toggleShortcutCheatsheet'),
  'preview app should expose toggleShortcutCheatsheet');
assert(appJs.includes('function ensureShortcutCheatsheetNode'),
  'preview app should expose ensureShortcutCheatsheetNode');
assert(appJs.includes('SHORTCUT_GROUPS'),
  'preview app should declare SHORTCUT_GROUPS table');
assert(appJs.includes("event.key === '?'"),
  'keydown handler should match the ? key directly');
assert(appJs.includes("if (command === 'open-shortcut-cheatsheet')"),
  'command router should dispatch open-shortcut-cheatsheet');
assert(appJs.includes("if (command === 'close-shortcut-cheatsheet')"),
  'command router should dispatch close-shortcut-cheatsheet');
assert(appJs.includes("if (cheatsheet && cheatsheet.dataset.active === 'true')"),
  'Esc handler should close the cheatsheet ahead of the scenario pill');
assert(appJs.includes('data-editor-command="open-shortcut-cheatsheet"'),
  'top actions should expose the 帮 icon-btn');
assert(appJs.includes('aria-keyshortcuts="Shift+?"'),
  '帮 icon-btn should declare Shift+? as its shortcut');

// Slice 69: module gap count badge.
assert(html.includes('Slice 69: Module gap count badge'),
  'preview shell should mark Slice 69 polish block');
assert(/\.module-gap-badge\s*\{/.test(html),
  'preview shell should ship .module-gap-badge baseline');
assert(/\.module-gap-badge\[data-gap-tone="high"\]\s*\{[^}]*rgba\(245,183,167,\.92\)/.test(html),
  'high-gap badge should pick up cinnabar tone');
assert(/\.editor-grid\[data-rail-collapsed="true"\] \.module-gap-badge\s*\{[^}]*display:\s*none/.test(html),
  'gap badge should hide when the rail is collapsed');
assert(appJs.includes("existingBadge.className = 'module-gap-badge'"),
  'renderModuleTiles should create the gap badge element');
assert(appJs.includes("existingBadge.textContent = '·' + gaps + '待补'"),
  'gap badge should read 待补 + N');
assert(appJs.includes("existingBadge.dataset.gapTone = total && gaps >= total / 2 ? 'high' : 'low'"),
  'gap badge tone should flip to high when gaps >= half the module size');

// Slice 70: hero board 印 watermark + corner ornament.
assert(html.includes('Slice 70: Hero board 印 watermark'),
  'preview shell should mark Slice 70 polish block');
assert(/\.hero-board::before\s*\{[\s\S]*content:\s*"印"/.test(html),
  'hero-board ::before should plant the 印 watermark');
assert(/\.hero-board\s*\{[\s\S]*isolation:\s*isolate/.test(html),
  'hero-board should create a new stacking context for the watermark');
assert(/\.hero-board\s*>\s*\*\s*\{[\s\S]*z-index:\s*1/.test(html),
  'hero-board direct children should sit above the watermark');

// Slice 72: AI in-flight shimmer.
assert(html.includes('Slice 72: AI in-flight shimmer'),
  'preview shell should mark Slice 72 polish block');
assert(/@keyframes ai-shimmer-sweep\s*\{/.test(html),
  'preview shell should define ai-shimmer-sweep keyframes');
assert(/\.queue-row\[data-ai-job-status="running"\][\s\S]*animation:\s*ai-shimmer-sweep/.test(html),
  'running queue rows should drive the shimmer animation');
assert(/\.queue-row\[data-ai-job-status="queued"\]::before/.test(html),
  'queued queue rows should pick up the indigo left strip');
assert(/\.queue-row\[data-ai-job-status="failed"\]/.test(html),
  'failed queue rows should pick up the cinnabar wash');

// Slice 73: save indicator pill.
assert(html.includes('Slice 73: Save indicator pill'),
  'preview shell should mark Slice 73 polish block');
assert(/#save-indicator\[data-save-state="saving"\]\s*\{/.test(html),
  'save indicator should style the saving state');
assert(/#save-indicator\[data-save-state="saved"\]\s*\{/.test(html),
  'save indicator should style the saved state');
assert(/#save-indicator\[data-save-state="error"\]\s*\{/.test(html),
  'save indicator should style the error state');
assert(/@keyframes save-indicator-pulse/.test(html),
  'save indicator should drive a pulse keyframe set');
assert(appJs.includes('function setSaveIndicator'),
  'preview app should expose setSaveIndicator');
assert(appJs.includes('function renderSaveIndicator'),
  'preview app should expose renderSaveIndicator');
assert(appJs.includes("setSaveIndicator('saving')"),
  'writeStoredDraft should flip indicator to saving on entry');
assert(appJs.includes("setSaveIndicator('saved', payload.savedAt)"),
  'writeStoredDraft should flip indicator to saved on successful persist');
assert(appJs.includes("setSaveIndicator('error'"),
  'writeStoredDraft should flip indicator to error on persistence failure');
// 治 quota：超大剧本(天启 3.7M)超 localStorage 配额时落 IndexedDB 后备（治本：不再静默丢一整轮编辑），不再 throw。
assert(appJs.includes('DRAFT_PERSIST_MAX'),
  'writeStoredDraft should guard oversized drafts via DRAFT_PERSIST_MAX (quota fix)');
assert(appJs.includes('persistDraftToIdb') && appJs.includes('function putDraftBody') && appJs.includes('function getDraftBody'),
  'oversized/quota draft should fall back to IndexedDB instead of being dropped (quota 治本)');

// Slice 74: top-action group dividers.
assert(html.includes('Slice 74: Top-action group dividers'),
  'preview shell should mark Slice 74 polish block');
assert(/\.top-actions \.icon-btn:not\(:last-of-type\) \+ \.icon-btn\[data-editor-command="validate"\]/.test(html),
  'validate button should start the check group with a divider (顶栏收纳后分组=退复|验|出回|👁|⋯)');
assert(/\.top-actions \.icon-btn:not\(:last-of-type\) \+ \.icon-btn\[data-editor-command="preflight-export"\]/.test(html),
  'preflight-export button should start the 成品 group with a divider');
// 顶栏收纳(2026-07-21)：十三钮→六钮+「⋯」菜单·预(与出重复)不再直出·重置入危险区二次确认
assert(html.includes('.top-more-menu') && html.includes('.top-more-danger'),
  'style should carry the ⋯ more-menu with a danger zone');
assert(appJs.includes('data-editor-command="toggle-more-menu"'),
  'toolbar should expose the ⋯ more-menu toggle');
assert(appJs.includes('class="top-more-item top-more-danger" data-editor-command="reset"'),
  'reset should live in the more-menu danger zone, not as a bare top button');
assert(appJs.includes('window.confirm') && appJs.includes('重置将丢弃当前剧本的全部改动'),
  'reset command must be gated behind an explicit confirm (地雷修复)');
assert(!/icon-btn" data-editor-command="run-preflight"/.test(appJs),
  '预 must not be a bare top icon-btn anymore (出 already preflights — redundant)');
assert(appJs.includes('data-pv-launch="preview"'),
  'toolbar should carry 玩家视角 launcher inline so adapters skip double-injection');
assert(appJs.includes('data-pv-launch="audit"'),
  '数值体检 should live in the more-menu via data-pv-launch=audit');
assert(/\.top-actions \.icon-btn:active\s*\{[^}]*transform:\s*scale\(0\.96\)/.test(html),
  'icon-btn press should scale down for tactile feedback');

// Slice 76: custom focus-visible for form controls.
assert(html.includes('Slice 76: Custom focus-visible for form controls'),
  'preview shell should mark Slice 76 polish block');
assert(/\.reset-shell textarea:focus-visible,[\s\S]*\.reset-shell input:not\(\[type="file"\]\):focus-visible/.test(html),
  'form inputs should pick up gold halo on :focus-visible');
assert(/box-shadow:\s*\n?\s*0 0 0 2px rgba\(242,217,132,\.28\)/.test(html),
  'focus halo should be 2px gold-bright at 28% alpha');
assert(/\.reset-shell input\[type="range"\]:focus-visible::-webkit-slider-thumb/.test(html),
  'range slider thumb should pick up gold ring on focus');

// Slice 77: field name dictionary tooltip.
assert(appJs.includes('var FIELD_DESCRIPTIONS'),
  'preview app should declare FIELD_DESCRIPTIONS lookup');
assert(appJs.includes("'_adaptation': '改编与版权元信息"),
  'FIELD_DESCRIPTIONS should describe _adaptation in Chinese');
assert(appJs.includes("'aiPersonaText': 'AI 人格描述"),
  'FIELD_DESCRIPTIONS should describe aiPersonaText');
assert(appJs.includes("'dynastyPhaseHint': '朝代阶段提示"),
  'FIELD_DESCRIPTIONS should describe dynastyPhaseHint');
assert(appJs.includes("'mapRuntimeContract': '地图运行时契约"),
  'FIELD_DESCRIPTIONS should describe mapRuntimeContract');
assert(appJs.includes('function describeField'),
  'preview app should expose describeField');
assert(appJs.includes('var chipTitle = description ? field'),
  'field-chip render should compose chipTitle from describeField');
assert(/'<button class="' \+ cls \+ '" data-field-pick="' \+ escapeHtml\(field\) \+ '" title="' \+ escapeHtml\(chipTitle\)/.test(appJs),
  'field-chip render should bind the title attribute to chipTitle');

// Slice 78: j / k entity navigation.
assert(appJs.includes("event.key === 'j' || event.key === 'k' || event.key === 'J' || event.key === 'K'"),
  'keydown handler should match j/k/J/K for entity navigation');
assert(appJs.includes('已选中 ' + "' + (next + 1) + ' / ' + total"),
  'j/k handler should announce position via setStatus');
assert(appJs.includes("var direction = (event.key === 'j' || event.key === 'J') ? 1 : -1"),
  'j steps forward, k steps backward');
assert(appJs.includes('Array.isArray(listValue) && listValue.length > 0'),
  'j/k should only fire when the selected field is a non-empty array');
assert(appJs.includes("{ keys: 'j / k', desc:"),
  'shortcut cheatsheet should advertise j/k binding');

// Slice 80: skip-to-main-content link.
assert(html.includes('Slice 80: Skip-to-main-content link'),
  'preview shell should mark Slice 80 polish block');
assert(html.includes('<a class="skip-to-main" href="#editor-grid"'),
  'skip link anchor should target #editor-grid');
assert(/\.skip-to-main\s*\{[\s\S]*transform:\s*translateY\(-110%\)/.test(html),
  'skip link should rest off-screen via translateY(-110%)');
assert(/\.skip-to-main:focus-visible\s*\{[\s\S]*transform:\s*translateY\(0\)/.test(html),
  'skip link should slide in on :focus-visible');

// Slice 81: module-tile hover lift parity.
assert(html.includes('Slice 81: Module-tile hover lift parity'),
  'preview shell should mark Slice 81 polish block');
assert(/\.module-tile:hover:not\(\.active\)\s*\{[\s\S]*translateY\(-1px\)/.test(html),
  'module-tile hover should lift by translateY(-1px)');

// Slice 82: inspector sticky section-head.
assert(html.includes('Slice 82: Inspector .section-head sticky on scroll'),
  'preview shell should mark Slice 82 polish block');
assert(/\.inspector \.section-head\s*\{[\s\S]*position:\s*sticky/.test(html),
  'inspector section-head should be sticky');
assert(/\.inspector \.section-head\s*\{[\s\S]*backdrop-filter:\s*blur\(3px\)/.test(html),
  'sticky inspector head should blur the content scrolling under it');

// Slice 84: per-panel collapse toggle.
assert(html.includes('Slice 84: Per-panel collapse toggle'),
  'preview shell should mark Slice 84 polish block');
assert(/\.panel\[data-panel-collapsed="true"\] > \*:not\(\.section-head\)\s*\{[^}]*display:\s*none/.test(html),
  'collapsed panels should hide everything except the section-head');
assert(/\.panel-collapse-toggle\s*\{/.test(html),
  'preview shell should ship .panel-collapse-toggle baseline');
assert(appJs.includes("var PANEL_COLLAPSE_KEY = 'tm.scenarioEditorReset.panelCollapse.v2'"),
  'preview app should declare PANEL_COLLAPSE_KEY');
assert(appJs.includes('function applyPanelCollapseState'),
  'preview app should expose applyPanelCollapseState');
assert(appJs.includes('function togglePanelCollapse'),
  'preview app should expose togglePanelCollapse');
assert(appJs.includes("if (command === 'toggle-panel-collapse')"),
  'command router should dispatch toggle-panel-collapse');
assert(appJs.includes('applyPanelCollapseState();'),
  'renderAll should reapply panel collapse after every render pass');

// Slice 85: field-cloud quick filter.
assert(html.includes('Slice 85: Field-cloud quick filter'),
  'preview shell should mark Slice 85 polish block');
assert(/\.field-cloud-text-filter\s*\{/.test(html),
  'preview shell should style the text filter wrapper');
assert(appJs.includes('state.fieldCloudFilter.text'),
  'renderDetailApp should source the text filter from state');
assert(appJs.includes("event.target.dataset.fieldFilter === 'text'"),
  'input handler should react to the text filter input');
assert(appJs.includes('data-field-filter="text"'),
  'field-cloud-filter should expose the text input');
assert(appJs.includes("placeholder=\"如 keju / 国库 / ai\""),
  'text filter input should hint at allowed query forms');
assert(appJs.includes("state.fieldCloudFilter = { provenance: 'all', presence: 'all', text: '' }"),
  'reset-field-filter should clear the text field too');

// Slice 86: global AI prompt wired into buildAiTaskPackage.
assert(appJs.includes('var sessionPrompt = (state.globalAiPrompt || '),
  'buildAiTaskPackage should read state.globalAiPrompt as sessionPrompt');
assert(appJs.includes("'本次会话总指令（创作者填写）：' + sessionPrompt"),
  'sessionPrompt should appear as a labeled block in the AI prompt');
assert(appJs.includes('sessionPrompt: sessionPrompt'),
  'task package should retain sessionPrompt for downstream inspection');

// Slice 87: AI prompt template dropdown.
assert(appJs.includes('var AI_PROMPT_TEMPLATES'),
  'preview app should declare AI_PROMPT_TEMPLATES table');
assert(/{ id: 'late-ming', label: '保持晚明史实风格'/.test(appJs),
  'AI_PROMPT_TEMPLATES should include the late-ming starter');
assert(/{ id: 'liaodong', label: '为辽东军政补人物/.test(appJs),
  'AI_PROMPT_TEMPLATES should include the liaodong starter');
assert(/{ id: 'timeline-audit', label: '校验时间线一致性'/.test(appJs),
  'AI_PROMPT_TEMPLATES should include the timeline-audit starter');
assert(appJs.includes('function bootstrapAiPromptControls'),
  'preview app should expose bootstrapAiPromptControls');
assert(appJs.includes('bootstrapAiPromptControls();'),
  'init should bootstrap AI prompt controls after chrome');
assert(html.includes('id="global-ai-prompt-template"'),
  'preview shell should ship the template <select>');
assert(html.includes('data-editor-control="ai-prompt-template"'),
  'template select should carry data-editor-control hook');

// Slice 88: AI cost badge.
assert(html.includes('id="ai-prompt-cost-badge"'),
  'preview shell should ship the cost badge');
assert(html.includes('Slice 87 / 88: AI prompt template select + cost badge'),
  'preview shell should mark Slice 87/88 polish block');
assert(/\.ai-prompt-cost-badge\[data-cost-state="heavy"\]\s*\{[^}]*rgba\(182,66,50/.test(html),
  'heavy cost badge should pick up cinnabar accent');
assert(appJs.includes('function estimateAiTokenCount'),
  'preview app should expose estimateAiTokenCount');
assert(appJs.includes('function refreshAiPromptCostBadge'),
  'preview app should expose refreshAiPromptCostBadge');
assert(appJs.includes("badge.dataset.costState = tokens === 0 ? 'empty' : tokens > 800 ? 'heavy' : tokens > 200 ? 'medium' : 'light'"),
  'cost badge should bucket tokens into empty / light / medium / heavy');

// Slice 89: module-aware AI strategy hints.
assert(appJs.includes('var MODULE_AI_STRATEGY'),
  'preview app should declare MODULE_AI_STRATEGY lookup');
assert(/scenarioOpening:[^,]+开局类内容/.test(appJs),
  'MODULE_AI_STRATEGY should describe scenarioOpening discipline');
assert(/peopleLineages:[^,]+保持字号/.test(appJs),
  'MODULE_AI_STRATEGY should keep character identifiers consistent');
assert(/eventsChronicle:[^,]+触发条件/.test(appJs),
  'MODULE_AI_STRATEGY should require event trigger conditions');
assert(appJs.includes("'模块策略：' + moduleStrategy"),
  'module strategy should be injected as a labeled prompt line');
assert(appJs.includes('moduleStrategy: moduleStrategy'),
  'task package should retain moduleStrategy for downstream inspection');

// Slice 91: action-aware AI prompt suffix.
assert(appJs.includes('var AI_ACTION_INSTRUCTIONS'),
  'preview app should declare AI_ACTION_INSTRUCTIONS lookup');
assert(/'polish':\s*'润色文风/.test(appJs),
  'AI_ACTION_INSTRUCTIONS should describe polish discipline');
assert(/'validate':\s*'校验冲突/.test(appJs),
  'AI_ACTION_INSTRUCTIONS should describe validate discipline');
assert(/'fill-field':\s*'补字段/.test(appJs),
  'AI_ACTION_INSTRUCTIONS should describe fill-field discipline');
assert(appJs.includes("'当前操作：' + (actionLabels[action] || action) + ' — ' + actionInstruction"),
  'buildAiTaskPackage should inject 当前操作 line with the action instruction');
assert(appJs.includes('action: action,'),
  'task package should retain action for downstream inspection');
assert(appJs.includes('actionInstruction: actionInstruction,'),
  'task package should retain actionInstruction for downstream inspection');

// Slice 92: system / user prompt split.
assert(appJs.includes('var DEFAULT_AI_SYSTEM_PROMPT'),
  'preview app should declare DEFAULT_AI_SYSTEM_PROMPT');
assert(appJs.includes('var systemPrompt = (state.aiSystemPromptOverride && state.aiSystemPromptOverride.trim()) || DEFAULT_AI_SYSTEM_PROMPT'),
  'buildAiTaskPackage should let creator override the system prompt');
assert(appJs.includes('systemPrompt: systemPrompt,'),
  'task package should expose systemPrompt');
assert(appJs.includes('userPrompt: userPromptLines,'),
  'task package should expose userPrompt');
assert(appJs.includes('var systemText = pkg.systemPrompt ||'),
  'buildAiRequestPayload should prefer pkg.systemPrompt over hardcoded text');
assert(appJs.includes('var userText = (pkg.userPrompt || pkg.prompt)'),
  'buildAiRequestPayload should prefer pkg.userPrompt over legacy pkg.prompt');

// Slice 93: recent prompt history dropdown.
assert(appJs.includes("var AI_PROMPT_HISTORY_KEY = 'tm.scenarioEditorReset.aiPromptHistory.v1'"),
  'preview app should declare AI_PROMPT_HISTORY_KEY');
assert(appJs.includes('var AI_PROMPT_HISTORY_CAP = 5'),
  'history cap should be 5');
assert(appJs.includes('function rememberPromptHistory'),
  'preview app should expose rememberPromptHistory');
assert(appJs.includes('function refreshAiPromptHistoryDropdown'),
  'preview app should expose refreshAiPromptHistoryDropdown');
assert(html.includes('id="global-ai-prompt-history"'),
  'preview shell should ship the history <select>');
assert(html.includes('class="ai-prompt-head-controls"'),
  'AI prompt head should host both template + history selects in a controls wrapper');
assert(/\.ai-prompt-head select:disabled\s*\{/.test(html),
  'history select should have a styled disabled state for empty history');

// Slice 95: de-preview the editor surface.
assert(html.includes('<title>天命 · 剧本工坊</title>'),
  'document title should no longer carry 重构预览');
assert(!html.includes('剧本工坊重构预览'),
  'no surface text should still mention 剧本工坊重构预览');
assert(!html.includes('可制作预览'),
  'no surface text should still mention 可制作预览');
assert(html.includes('剧本工坊 · 历史模拟剧本总控台'),
  'brand sub should describe the workshop without 预览');
assert(html.includes('<p class="hero-kicker">剧本工坊总控台</p>'),
  'hero kicker should be Chinese, not Scenario Authoring Desk');
assert(!html.includes('Scenario Authoring Desk'),
  'no surface text should still carry the English kicker');
assert(!html.includes('从旧侧栏表单'),
  'hero h2 should drop the 从旧侧栏表单 transition framing');
assert(!appJs.includes("'新版剧本工坊 · 官方基线预览'"),
  'runtime brandSub state should no longer carry 官方基线预览');
assert(appJs.includes("'剧本工坊 · 历史模拟剧本总控台'"),
  'runtime brandSub clean state should reflect the new copy');

// Slice 96: English module + field-group titles translated.
const inventorySource = fs.readFileSync(path.join(ROOT, 'scripts', 'editor-reset-inventory.js'), 'utf8');
assert(!/title:\s*'[A-Z][a-z]+\s/.test(inventorySource),
  'editor-reset-inventory should no longer carry English titles starting with a capitalised word');
assert(inventorySource.includes("title: '剧本总览与玩家开局'"),
  'scenarioOpening should use the Chinese title');
assert(inventorySource.includes("title: '人物、立绘、家族与特质'"),
  'peopleLineages should use the Chinese title');
assert(inventorySource.includes("title: '势力、党派、阶层与外交'"),
  'factionsSociety should use the Chinese title');
assert(inventorySource.includes("title: '事件、硬历史锁、时间线与胜负条件'"),
  'eventsChronicle should use the Chinese title');
assert(inventorySource.includes("title: 'AI 人格与行为'"),
  'character aiPersona group should use the Chinese title');
assert(inventorySource.includes("title: '继承与终局条件'"),
  'faction succession group should use the Chinese title');
const bakedData = fs.readFileSync(dataFile, 'utf8');
assert(bakedData.includes('"剧本总览与玩家开局"'),
  'baked data should carry the regenerated Chinese module title');
assert(bakedData.includes('"AI 人格与行为"'),
  'baked data should carry the regenerated Chinese field-group title');

// Round 13 · Slice 98: runtime field audit rows promote the Chinese title and
// demote the English JSON key to a muted monospace identifier chip.
assert(appJs.includes('<span class="runtime-field-title">'),
  'runtime field audit rows should wrap the Chinese title in .runtime-field-title');
assert(appJs.includes('<code class="runtime-field-key"'),
  'runtime field audit rows should wrap the English JSON key in a muted .runtime-field-key chip');
assert(html.includes('.runtime-field-row .runtime-field-title'),
  'preview should style the Chinese title chip prominently');
assert(html.includes('.runtime-field-row .runtime-field-key'),
  'preview should style the English JSON key chip as muted monospace');
assert(!/<b>'\s*\+\s*provenanceBadgeHtml\(row\.field\)\s*\+\s*escapeHtml\(row\.field\)/.test(appJs),
  'runtime field audit rows should no longer render the bare English key right after the provenance badge');

// Round 13 · Slice 99: module rail title and sub-tagline should stack
// vertically — .module-name needs flex-column or the .module-sub margin-top
// is silently dropped by its inline-span parent.
const moduleNameBlock = html.match(/\.module-name\s*\{[^}]*\}/);
assert(moduleNameBlock && /display:\s*flex/.test(moduleNameBlock[0]),
  '.module-name should use display:flex so its sub-tagline stacks vertically');
assert(moduleNameBlock && /flex-direction:\s*column/.test(moduleNameBlock[0]),
  '.module-name should set flex-direction:column for stacked title/sub layout');

// Round 14 · Slice 101: focus-runtime-panel command must close the scenario
// pill dropdown so "更多模板与案卷" doesn't leave the menu stuck open.
assert(/focusRuntimePanel\(target\.dataset\.runtimePanel\);[\s\S]{0,500}toggleScenarioPillMenu\(false\)/.test(appJs),
  'focus-runtime-panel handler should close the scenario pill menu after focusing');

// Round 14 · Slice 102: sticky section nav strip at the top of .main-stack.
assert(appJs.includes('bootstrapSectionNav'),
  'preview app should declare a bootstrapSectionNav function');
assert(/SECTION_NAV_ENTRIES\s*=\s*\[/.test(appJs),
  'preview app should declare a SECTION_NAV_ENTRIES list');
assert(appJs.includes("panel: 'runtime-editor'") && appJs.includes("label: '实装工作台'"),
  'section nav should include the runtime workbench entry');
assert(appJs.includes("panel: 'ai-coverage-matrix'") && appJs.includes("label: 'AI 覆盖矩阵'"),
  'section nav should include the AI coverage matrix entry');
assert(appJs.includes("command === 'jump-section-panel'"),
  'handleEditorCommand should route jump-section-panel');
assert(appJs.includes("command === 'collapse-all-stack-panels'"),
  'handleEditorCommand should route collapse-all-stack-panels');
assert(appJs.includes("command === 'expand-all-stack-panels'"),
  'handleEditorCommand should route expand-all-stack-panels');
assert(appJs.includes('bootstrapSectionNav();'),
  'init() should call bootstrapSectionNav after bootstrapChrome');
assert(html.includes('.section-nav-strip'),
  'preview should style the section nav strip');
assert(html.includes('.section-nav-pill'),
  'preview should style section nav pills');
assert(html.includes('.section-nav-toggle'),
  'preview should style section nav batch toggles');
const navStripBlock = html.match(/\.section-nav-strip\s*\{[^}]*\}/);
assert(navStripBlock && /position:\s*sticky/.test(navStripBlock[0]),
  'section nav strip should be position:sticky');
assert(html.includes('class="panel health-panel" data-panel="health-panel"'),
  'health-panel should carry data-panel so it can be collapsed + targeted');
assert(html.includes('class="panel flow-panel" data-panel="flow-panel"'),
  'flow-panel should carry data-panel so it can be collapsed + targeted');

// Round 15 · Slice 104: right inspector rail must have a 收起 button mirroring
// the left module-rail pattern so creators can free the middle column when
// they want focus mode.
assert(html.includes('id="inspector-collapse-btn"'),
  'inspector should expose a collapse button');
assert(appJs.includes('INSPECTOR_COLLAPSED_KEY'),
  'preview app should declare an INSPECTOR_COLLAPSED_KEY localStorage key');
assert(appJs.includes('isInspectorCollapsed') && appJs.includes('setInspectorCollapsed') && appJs.includes('toggleInspectorCollapsed'),
  'preview app should declare isInspectorCollapsed/setInspectorCollapsed/toggleInspectorCollapsed helpers');
assert(appJs.includes("setInspectorCollapsed(isInspectorCollapsed());"),
  'init() should apply the persisted inspector-collapsed state on load');
assert(/inspector-collapse-btn[\s\S]{0,200}toggleInspectorCollapsed/.test(appJs),
  'click on #inspector-collapse-btn should route to toggleInspectorCollapsed');
assert(html.includes('.editor-grid[data-inspector-collapsed="true"]'),
  'preview should style the inspector-collapsed grid state');
assert(/\.editor-grid\[data-inspector-collapsed="true"\]\s*\{[^}]*52px/.test(html),
  'collapsed inspector grid should shrink the right column to 52px');

// Round 16 · Slice 106: 承接旧编辑器 transition copy on API settings panel
// should be deleted.
assert(!appJs.includes('此处承接旧编辑器顶部'),
  'API settings panel should no longer carry the 承接旧编辑器 transition copy');

// Round 16 · Slice 107: runtime-panel should expose a sub-nav with 23 jump
// pills for its sub-panels, grouped into categories.
assert(appJs.includes('<div class="runtime-subnav"'),
  'runtime-panel should render a .runtime-subnav strip');
assert(appJs.includes('data-runtime-panel="new-scenario-starter">新建剧本'),
  'runtime sub-nav should include 新建剧本 pill targeting new-scenario-starter');
assert(appJs.includes('data-runtime-panel="ai-draft-queue">AI 草稿队列'),
  'runtime sub-nav should include AI 草稿队列 pill');
assert(appJs.includes('data-runtime-panel="history-log">修改日志'),
  'runtime sub-nav should include 修改日志 pill');
assert(appJs.includes('data-panel="validation-results-panel"'),
  '校验结果 sub-panel should carry a data-panel attr so the sub-nav can target it');
assert(appJs.includes('data-panel="ai-draft-queue"'),
  'AI 草稿队列 sub-panel should carry a data-panel attr');
assert(appJs.includes('data-panel="scenario-diff"'),
  '变更清册 sub-panel should carry a data-panel attr');
assert(html.includes('.runtime-subnav'),
  'preview should style the runtime sub-nav');
assert(html.includes('.runtime-subnav-pill'),
  'preview should style the runtime sub-nav pills');
assert(html.includes('.runtime-subnav-sep'),
  'preview should style the runtime sub-nav group separators');

// Round 17 · Slice 109: scenario pill dropdown must show an explicit ✕
// close button at the top + close when the user clicks the menu background.
assert(appJs.includes('scenario-pill-menu-head'),
  'scenario pill menu should include a head row with the close button');
assert(appJs.includes('scenario-pill-menu-close'),
  'scenario pill menu should include a .scenario-pill-menu-close button');
assert(appJs.includes("data-editor-command=\"close-scenario-pill-menu\""),
  'pill menu close button should be wired with the close-scenario-pill-menu command');
assert(appJs.includes("command === 'close-scenario-pill-menu'"),
  'handleEditorCommand should route close-scenario-pill-menu to toggleScenarioPillMenu(false)');
assert(/pillMenu\s*=\s*event\.target\.closest\('#scenario-pill-menu'\)/.test(appJs),
  'click-outside handler should also close when clicking the menu background');
assert(html.includes('.scenario-pill-menu-head'),
  'preview should style the pill menu head row');
assert(html.includes('.scenario-pill-menu-close'),
  'preview should style the pill menu close button');

// Round 18 · Slice 110: .scenario-pill-menu base CSS sets display:grid which
// overrides the UA stylesheet's [hidden]{display:none}. Without an explicit
// .scenario-pill-menu[hidden]{display:none} rule, JS toggleScenarioPillMenu
// successfully sets the hidden attribute but the menu remains visible. This
// is the REAL bug behind every "can't close" report since the dropdown
// existed — earlier slices 101 / 109 added JS pathways but the CSS kept the
// menu visually open regardless.
assert(/\.scenario-pill-menu\[hidden\]\s*\{[^}]*display:\s*none/.test(html),
  '.scenario-pill-menu[hidden] must set display:none — otherwise the base display:grid rule keeps the menu visible even when the hidden attribute is set');

// Round 19 · Slice 111: left rail + right inspector each need their own
// internal scroll so middle column can scroll the page independently. Without
// max-height + overflow-y:auto, content past the viewport in the sticky rails
// was unreachable.
// Match the standalone .inspector / .module-rail base rules (not selectors
// like ".editor-grid[data-inspector-collapsed='true'] .inspector").
const inspectorBlock = html.match(/(^|\n)\s{0,4}\.inspector\s*\{[\s\S]{0,800}?\n\s{0,4}\}/);
assert(inspectorBlock && /max-height:\s*calc\(100vh/.test(inspectorBlock[0]),
  '.inspector base rule should declare max-height: calc(100vh - …) so it scrolls internally');
assert(inspectorBlock && /overflow-y:\s*auto/.test(inspectorBlock[0]),
  '.inspector base rule should set overflow-y:auto for its internal scroll');
const railBlock = html.match(/(^|\n)\s{0,4}\.module-rail\s*\{[\s\S]{0,800}?\n\s{0,4}\}/);
assert(railBlock && /max-height:\s*calc\(100vh/.test(railBlock[0]),
  '.module-rail base rule should also declare max-height for parity with .inspector');
assert(railBlock && /overflow-y:\s*auto/.test(railBlock[0]),
  '.module-rail base rule should set overflow-y:auto');

// ── 保存/导出加固（2026-07-10 玩家反馈「无法保存」「导出无法选文件夹」）──
// 案卷索引 localStorage 配额加固：此前裸 setItem 一炸即断 saveProjectSnapshot·索引丢失成孤儿案卷。
assert(appJs.includes("LIBRARY_DB_ID = '__projectLibraryMeta__'"), 'library meta should have a reserved IndexedDB backup key');
assert(/function writeProjectLibrary\(\)\s*\{[\s\S]{0,900}?try\s*\{[\s\S]{0,300}?localStorage\.setItem\(PROJECT_LIBRARY_KEY/.test(appJs),
  'writeProjectLibrary should wrap localStorage.setItem in try/catch (quota-proof)');
assert(appJs.includes('putLibraryMetaBody(metas)'), 'writeProjectLibrary quota failure should fall back to IndexedDB meta backup');
assert(appJs.includes('function reconcileLibraryFromIdb'), 'reconcileLibraryFromIdb self-heal should exist');
assert(/finishInit\(\)\s*\{[\s\S]{0,300}?reconcileLibraryFromIdb\(\)/.test(appJs), 'finishInit should run library reconcile self-heal');
// 导出走桌面原生另存为对话框（可选目录）·无 IPC 回退浏览器下载。
assert(/function performExportDownload[\s\S]{0,600}?dialogExport\(scenario,\s*\{\s*filename:\s*name\s*\}\)/.test(appJs),
  'performExportDownload should prefer native dialogExport with filename');
assert(/function performExportDownload[\s\S]{0,1600}?a\.download = name/.test(appJs),
  'performExportDownload should keep browser anchor download fallback');
assert(/await performExportDownload\(pack,/.test(appJs), 'exportProjectSnapshot should route through the unified export helper');
const mainImplJs = fs.readFileSync(path.join(ROOT, '..', 'main-impl.js'), 'utf8');
const preloadImplJs = fs.readFileSync(path.join(ROOT, '..', 'preload-impl.js'), 'utf8');
assert(/ipcMain\.handle\('dialog-export', async \(event, data, opts\)/.test(mainImplJs), 'dialog-export handler should accept opts (filename/title)');
assert(mainImplJs.indexOf("o.filename || '天命项目.json'") >= 0, 'dialog-export should use opts.filename as defaultPath with legacy fallback');
assert(/dialogExport: \(data, opts\)/.test(preloadImplJs), 'preload dialogExport should pass opts through');

// ── 2026-07-19 剧本工坊 + 国师联合加固回归 ──
const authoringUiJs = fs.readFileSync(path.join(ROOT, 'editor-authoring-agent-ui.js'), 'utf8');
const authoringRenderJs = fs.readFileSync(path.join(ROOT, 'editor-authoring-agent-ui-render.js'), 'utf8');

// 默认上下文不能落到 _version/id/ai/conf/meta 等国师不可写内部字段。
assert(appJs.includes('function isAgentEditableFieldKey') && appJs.includes('function firstAgentEditableField'),
  'workshop should centralize the Agent-editable default-field predicate');
assert(/key\.charAt\(0\) !== '_'/.test(appJs) && /!\/\^\(ai\|conf\|meta\)\$\/i\.test\(key\)/.test(appJs),
  'default-field predicate should exclude private and AI/config/meta roots');
assert(/state\.selectedField = firstAgentEditableField\(mod\.topLevelKeys/.test(appJs),
  'module switching should select the first Agent-editable field');

// linkedChars/linkedFactions 是多态标签：保留传播能力，但不应制造假断引用占位实体。
['events', 'rigidHistoryEvents', 'timeline'].forEach(function(field) {
  assert(new RegExp("field: '" + field + "', key: 'linkedChars'[^\\n]*validate: false").test(appJs)
    && new RegExp("field: '" + field + "', key: 'linkedFactions'[^\\n]*validate: false").test(appJs),
  field + ' linked* fields should be soft references');
});
assert(!/validateRefs\(sc\.(events|rigidHistoryEvents)/.test(appJs),
  'global validation should not treat event tags as strict entity foreign keys');
assert(/field: 'characters', key: 'faction'[^\n]*shape: 'scalar'/.test(appJs)
  && /field: 'factionRelations', key: 'to'[^\n]*shape: 'relation'/.test(appJs),
  'true character-faction and faction-relation foreign keys should remain strict');
assert(/field: 'relations', key: 'from'[^\n]*validate: false/.test(appJs)
  && /field: 'relations', key: 'to'[^\n]*validate: false/.test(appJs)
  && !/validateRefs\(sc\.relations/.test(appJs),
  'open relation graph nodes should not be forced into the current character roster');

// 顶栏、保存标签与案卷元信息都必须读取同一份 live diff truth。
assert(appJs.includes('function workspaceTruth') && appJs.includes('changedFields: changes.length') && appJs.includes('dirty: changes.length > 0'),
  'workspace state should derive from the live scenario diff');
assert(appJs.includes('state.dirty = truth.dirty') && appJs.includes("label = truth.dirty ? '有未保存改动' : '官方快照'"),
  'workspace pill and save indicator should agree on official/draft truth');
assert(/renderWorkspaceMeta\(\);\s*renderSaveIndicator\(\);/.test(appJs),
  'renderAll should refresh truth-bearing chrome after mutating renderers');
assert(appJs.includes('recordExternalEdit: recordExternalEdit') && /recordExternalEdit\('设置世界类型'/.test(authoringUiJs),
  'Guoshi direct world-kind edits should enter workshop history/dirty/autosave flow');

// 顶栏“运行发布预检”必须真打开全局总览，再展开并聚焦目标。
assert(/function focusRuntimePanel[\s\S]{0,900}?je-deck-open[\s\S]{0,400}?deckToggle\.click\(\)/.test(appJs),
  'runtime focus should open the global deck before scrolling');
assert(/hostPanel\.dataset\.panelCollapsed === 'true'\) togglePanelCollapse/.test(appJs),
  'runtime focus should expand a collapsed host panel');

// AI drawer 闭合态必须从无障碍树和键盘顺序中移除，打开后聚焦关闭键，Escape 可退回。
assert(/id="ai-drawer"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-hidden="true"[^>]*inert/.test(html),
  'AI drawer should start as an inert hidden dialog');
assert(/function openDrawerForApp[\s\S]{0,500}?removeAttribute\('inert'\)[\s\S]{0,180}?aria-hidden', 'false'[\s\S]{0,180}?closeButton\.focus/.test(appJs),
  'opening the runtime AI drawer should expose it and move focus inside');
assert(/function closeDrawerForApp[\s\S]{0,500}?aria-hidden', 'true'[\s\S]{0,120}?setAttribute\('inert'[\s\S]{0,500}?returnFocus\.focus/.test(appJs),
  'closing the runtime AI drawer should restore inert state and trigger focus');
assert(/TM_SCENARIO_EDITOR_DRAWER\s*=\s*\{ open: openDrawerForApp, close: closeDrawerForApp \}/.test(appJs)
  && /drawerClose\.addEventListener\('click', closeDrawerForApp\)/.test(appJs)
  && /drawerBackdrop\.addEventListener\('click', closeDrawerForApp\)/.test(appJs),
  'runtime AI drawer should own executable open/close bindings');
assert(/event\.key === 'Escape'[^\n]*closeDrawerForApp/.test(appJs)
  && /\.ai-drawer\s*\{[^}]*visibility:\s*hidden/.test(html)
  && /\.ai-drawer\.open\s*\{[^}]*visibility:\s*visible/.test(html),
  'drawer should support Escape and be visually absent while closed');

// 停靠国师的 × 必须真关闭，并归还工坊正文宽度。
assert(/#tm-aa-x'[\s\S]{0,260}?panel\.classList\.remove\('open'\)[\s\S]{0,260}?classList\.remove\('je-guoshi-docked', 'je-guoshi-settings-open'/.test(authoringUiJs),
  'Guoshi close button should remove both panel-open and docked body states');
assert(/_jeGuoshiDockToggleBound[\s\S]{0,520}?document\.addEventListener\('click'[\s\S]{0,520}?classList\.add\('je-guoshi-docked'\)/.test(adaptersJs),
  'reopening Guoshi from the workshop launcher should restore the docked layout');
assert(/scenario-editor-reset-adapters\.js\?v=[^"']+/.test(html),
  'workshop should version the Guoshi adapter asset so reopen fixes are not masked by stale browser cache');
assert(/body\.je-guoshi-docked #tm-aa-panel\s*\{[^}]*display:\s*none !important/.test(html)
  && /body\.je-guoshi-docked #tm-aa-panel\.open\s*\{\s*display:\s*flex !important/.test(html),
  'docked CSS should only display an explicitly open Guoshi panel');

// 首屏密度：运行/健康保留展开，低频六区默认折叠；本地旧状态通过 v2 迁移。
['ai-desk', 'freedom-lab', 'flow-panel', 'generation-queue', 'creator-shortcuts', 'ai-coverage-matrix'].forEach(function(panel) {
  assert(new RegExp("'" + panel + "': true").test(appJs), panel + ' should default collapsed');
});

// 草稿必须绑定运行起点、应用到实时剧本，冲突/选择后坏引用一律 fail closed；diff 不隐藏第 41 条以后改动。
assert(/ui\.baseScenario = AA\.makeDraft\(live\)/.test(authoringUiJs)
  && /AA\.computeDiff\(ui\.baseScenario/.test(authoringUiJs),
  'Guoshi draft diff should bind to the run-start baseline');
assert(/AA\.applySelectedDiffs\(ui\.adapter\.getScenario\(\), ui\.draft/.test(authoringUiJs)
  && /e\.code === 'edit-conflict'/.test(authoringUiJs),
  'Guoshi apply should merge into live state and surface same-path conflicts');
assert(/function _validateSelectedScenario[\s\S]{0,1200}?AA\.preflight\(candidate\)/.test(authoringUiJs)
  && /_validateSelectedScenario\(_liveBefore, _finalSc\)/.test(authoringUiJs),
  'partial diff selection should be revalidated before commit');
assert(/diffs\.forEach\(function\(d\)/.test(authoringRenderJs)
  && /var inner = es\.map\(function\(d\)/.test(authoringRenderJs)
  && !/var inner = es\.slice\(0,\s*40\)/.test(authoringRenderJs),
  'every diff hunk should remain visible and individually rejectable');

console.log('smoke-scenario-editor-reset-preview OK: ' + passed + ' assertions');
