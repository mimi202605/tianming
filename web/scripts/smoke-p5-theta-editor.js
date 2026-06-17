#!/usr/bin/env node
// smoke-p5-theta-editor.js - Phase 5 theta Editor namespace facade gate.
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

function fn(name) {
  const f = function() {};
  Object.defineProperty(f, 'name', { value: name });
  return f;
}

const ctx = {
  document: { readyState: 'loading', addEventListener: function(){} },
  setTimeout: function() {},
  console: console,
  Object: Object,
  Array: Array,
  Promise: Promise,
  Proxy: Proxy,
  TM: {}
};
ctx.window = ctx;
ctx.globalThis = ctx;
ctx.addEventListener = function(){};

[
  'openEditorModal', 'closeEditorModal', 'openGenericModal', 'closeGenericModal',
  'openFullGenModal', 'closeFullGenModal', 'saveScript', 'loadScript',
  'renderAll', 'cloneScript', 'quickTestScenario',
  'editChr', 'saveChrEdit', 'renderItmTab', 'editItm', 'renderRulTab',
  'renderEvtTab', 'renderFacTab', 'renderClassTab', 'editClass2',
  'renderWldTab', 'renderTechTab', 'editTech2', 'openTraitSelectorModal',
  'openAIGenModal', 'closeAIGenModal', 'doAIGenerate',
  'aiGeneratePlayerFaction', 'aiGeneratePlayerCharacter',
  'callAIEditor', 'callAIEditorSmart', 'aiGenItems', 'aiGenRules',
  'aiGenEvents', 'aiGenClasses', 'aiGenWorld', 'aiGenTech',
  'aiGenFiscalConfig', 'aiGenPopulationConfig', 'aiGenEnvironmentConfig',
  'aiGenAuthorityConfig', 'aiGenFactionRelations',
  'aiPolishStructuredField', 'aiPolishCharFamilyMembers',
  'aiPolishRegionOverrides', 'aiPolishCustomTaxes', 'aiGenerateGoals',
  'aiGenerateOffendGroups', 'aiGenerateEconomyConfig',
  'aiGenerateAdminHierarchy', 'aiExpandAdminChildren', 'aiGenDivisionDeep',
  'renderImperialEdictsList', 'addImperialEdictEntry', 'editImperialEdictEntry',
  'deleteImperialEdictEntry', 'renderGoalsList', 'addGoalEntry',
  'editGoalEntry', 'deleteGoalEntry', 'renderInfluenceGroupsList',
  'addInfluenceGroupEntry', 'editInfluenceGroup', 'deleteInfluenceGroup',
  'renderOffendGroupsList', 'addOffendGroupEntry', 'editOffendGroup',
  'deleteOffendGroup', 'renderTimeline', 'addTimeline',
  'renderEconomyConfig', 'updateEconomyConfig', 'renderPostSystem',
  'updatePostSystemConfig', 'renderVassalSystem', 'updateVassalSystemConfig',
  'renderTitleSystem', 'updateTitleSystemConfig', 'renderBuildingSystem',
  'updateBuildingSystemConfig', 'getCurrentAdminHierarchy',
  'initAdministrationPanel', 'renderAdminTree', 'addAdminDivision',
  'editAdminDivision', 'deleteAdminDivision', 'renderMappingList',
  'autoMapDivisions', 'clearAllMappings', 'renderOfficeConfig',
  'openFiscalConfigEditor', 'openCorruptionConfigEditor', 'renderMilitary',
  'renderMilitaryNew', 'renderHaremConfig', 'renderPalaceSystem',
  'renderContradictions', 'renderWarConfig', 'renderDiplomacyConfig',
  'renderDecisionConfig', 'renderNpcBehaviors', 'renderDivisionDeepFieldsHTML',
  'collectDivisionDeepFromForm',
  'renderOfficeSubtabs', 'addOfficeSubtab', 'editOfficeSubtab',
  'deleteOfficeSubtab', 'renderOfficeClassifierPatterns',
  'addOfficeClassifierPattern', 'editOfficeClassifierPattern',
  'deleteOfficeClassifierPattern', 'renderOfficialRanks',
  'saveOfficialRanksFromTextarea', 'renderConcurrentTitleCatalog',
  'addConcurrentTitle', 'editConcurrentTitle', 'deleteConcurrentTitle',
  'renderInquiryBodyCatalog', 'addInquiryBody', 'editInquiryBody',
  'deleteInquiryBody', 'renderModelRequirements', 'saveModelRequirements',
  'renderMapSystem', 'updateMapSystemConfig', 'addMapCity', 'editMapCity',
  'deleteMapCity', 'exportMapData', 'importMapData',
  'renderMapEditorPreview', 'generateVoronoiMapInEditor', 'editPolygonVertices'
].forEach(function(name) { ctx[name] = fn(name); });

ctx.SchemaAdapter = {
  importScenario: fn('importScenario'),
  exportScenario: fn('exportScenario'),
  roundtripCheck: fn('roundtripCheck')
};
ctx.TM_OfficeDeep = {
  ensurePosDeep: fn('ensurePosDeep'),
  renderHTML: fn('renderHTML'),
  collectFromForm: fn('collectFromForm')
};

ctx.aiGenChr = fn('aiGenChr');
ctx.aiGenFac = fn('aiGenFac');
ctx.aiGenFullScenario = fn('aiGenFullScenario');
ctx.execFullGen = fn('execFullGen');
ctx.mapEditorPro = { open: fn('mapEditorProOpen') };

vm.createContext(ctx);

function load(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(src, ctx, { filename: rel });
}

load('tm-namespaces.js');

const TM = ctx.TM;
const hasOwn = Object.prototype.hasOwnProperty;

assert(TM.Editor && typeof TM.Editor === 'object', 'TM.Editor should exist');
assert(TM.namespaces.Editor === TM.Editor, 'TM.namespaces.Editor should point at TM.Editor');

assert(TM.Editor.core.openEditorModal === ctx.openEditorModal, 'Editor.core.openEditorModal');
assert(TM.Editor.core.closeEditorModal === ctx.closeEditorModal, 'Editor.core.closeEditorModal');
assert(TM.Editor.core.saveScript === ctx.saveScript, 'Editor.core.saveScript');
assert(TM.Editor.core.loadScript === ctx.loadScript, 'Editor.core.loadScript');
assert(TM.Editor.core.renderAll === ctx.renderAll, 'Editor.core.renderAll');
assert(TM.Editor.core.quickTestScenario === ctx.quickTestScenario, 'Editor.core.quickTestScenario');
assert(TM.Editor.core.listMissing().length === 0, 'Editor.core mocked refs should all be available');

assert(TM.Editor.crud.editChr === ctx.editChr, 'Editor.crud.editChr');
assert(TM.Editor.crud.saveChrEdit === ctx.saveChrEdit, 'Editor.crud.saveChrEdit');
assert(TM.Editor.crud.renderItmTab === ctx.renderItmTab, 'Editor.crud.renderItmTab');
assert(TM.Editor.crud.editClass2 === ctx.editClass2, 'Editor.crud.editClass2');
assert(TM.Editor.crud.openTraitSelectorModal === ctx.openTraitSelectorModal,
  'Editor.crud.openTraitSelectorModal');
assert(TM.Editor.crud.listMissing().length === 0, 'Editor.crud mocked refs should all be available');

assert(TM.Editor.ai.openAIGenModal === ctx.openAIGenModal, 'Editor.ai.openAIGenModal');
assert(TM.Editor.ai.doAIGenerate === ctx.doAIGenerate, 'Editor.ai.doAIGenerate');
assert(TM.Editor.ai.callAIEditorSmart === ctx.callAIEditorSmart, 'Editor.ai.callAIEditorSmart');
assert(TM.Editor.ai.aiGenFiscalConfig === ctx.aiGenFiscalConfig, 'Editor.ai.aiGenFiscalConfig');
assert(TM.Editor.ai.aiPolishCustomTaxes === ctx.aiPolishCustomTaxes, 'Editor.ai.aiPolishCustomTaxes');
assert(TM.Editor.ai.aiGenerateAdminHierarchy === ctx.aiGenerateAdminHierarchy,
  'Editor.ai.aiGenerateAdminHierarchy');
assert(TM.Editor.ai.aiGenDivisionDeep === ctx.aiGenDivisionDeep, 'Editor.ai.aiGenDivisionDeep');
assert(!hasOwn.call(TM.Editor.ai, 'aiGenChr'), 'Editor.ai should not duplicate Office-owned aiGenChr');
assert(!hasOwn.call(TM.Editor.ai, 'aiGenFac'), 'Editor.ai should not duplicate Office-owned aiGenFac');
assert(!hasOwn.call(TM.Editor.ai, 'aiGenFullScenario'), 'Editor.ai should not duplicate aiGenFullScenario');
assert(!hasOwn.call(TM.Editor.ai, 'execFullGen'), 'Editor.ai should not duplicate execFullGen');
assert(TM.Office.legacy.aiGenChr === ctx.aiGenChr, 'Office.legacy should keep aiGenChr ownership');
assert(TM.Office.legacy.execFullGen === ctx.execFullGen, 'Office.legacy should keep execFullGen ownership');
assert(TM.Editor.ai.listMissing().length === 0, 'Editor.ai mocked refs should all be available');

assert(TM.Editor.forms.renderImperialEdictsList === ctx.renderImperialEdictsList,
  'Editor.forms.renderImperialEdictsList');
assert(TM.Editor.forms.renderGoalsList === ctx.renderGoalsList, 'Editor.forms.renderGoalsList');
assert(TM.Editor.forms.renderInfluenceGroupsList === ctx.renderInfluenceGroupsList,
  'Editor.forms.renderInfluenceGroupsList');
assert(TM.Editor.forms.renderOffendGroupsList === ctx.renderOffendGroupsList,
  'Editor.forms.renderOffendGroupsList');
assert(TM.Editor.forms.renderTimeline === ctx.renderTimeline, 'Editor.forms.renderTimeline');
assert(TM.Editor.forms.listMissing().length === 0, 'Editor.forms mocked refs should all be available');

assert(TM.Editor.domain.renderEconomyConfig === ctx.renderEconomyConfig,
  'Editor.domain.renderEconomyConfig');
assert(TM.Editor.domain.initAdministrationPanel === ctx.initAdministrationPanel,
  'Editor.domain.initAdministrationPanel');
assert(TM.Editor.domain.openFiscalConfigEditor === ctx.openFiscalConfigEditor,
  'Editor.domain.openFiscalConfigEditor');
assert(TM.Editor.domain.renderMilitaryNew === ctx.renderMilitaryNew, 'Editor.domain.renderMilitaryNew');
assert(TM.Editor.domain.officeDeep === ctx.TM_OfficeDeep, 'Editor.domain.officeDeep alias');
assert(TM.Editor.domain.listMissing().length === 0, 'Editor.domain mocked refs should all be available');

assert(TM.Editor.schema.renderOfficeSubtabs === ctx.renderOfficeSubtabs,
  'Editor.schema.renderOfficeSubtabs');
assert(TM.Editor.schema.renderOfficialRanks === ctx.renderOfficialRanks,
  'Editor.schema.renderOfficialRanks');
assert(TM.Editor.schema.renderModelRequirements === ctx.renderModelRequirements,
  'Editor.schema.renderModelRequirements');
assert(TM.Editor.schema.adapter === ctx.SchemaAdapter, 'Editor.schema.adapter should alias SchemaAdapter');
const nextAdapter = { importScenario: fn('nextImportScenario') };
TM.Editor.schema.adapter = nextAdapter;
assert(ctx.SchemaAdapter === nextAdapter, 'Editor.schema.adapter setter should update SchemaAdapter owner');
assert(TM.Editor.schema.listMissing().length === 0, 'Editor.schema mocked refs should all be available');

assert(TM.Editor.map.renderMapSystem === ctx.renderMapSystem, 'Editor.map.renderMapSystem');
assert(TM.Editor.map.generateVoronoiMapInEditor === ctx.generateVoronoiMapInEditor,
  'Editor.map.generateVoronoiMapInEditor');
assert(TM.Editor.map.editPolygonVertices === ctx.editPolygonVertices, 'Editor.map.editPolygonVertices');
assert(!hasOwn.call(TM.Map, 'editors'), 'runtime TM.Map should still not expose map editor tools');
assert(!hasOwn.call(TM.Editor.map, 'mapEditorPro'), 'standalone map editor tools stay outside TM.Editor.map');
assert(TM.Editor.map.listMissing().length === 0, 'Editor.map mocked refs should all be available');

assert(TM.Endturn && TM.UI && TM.Map && TM.NPC && TM.Char, 'previous P5 namespaces should remain present');

console.log('[smoke-p5-theta-editor] pass assertions=' + passed);
