#!/usr/bin/env node
// smoke-p5-zeta-map-ui.js - Phase 5 zeta Map/UI namespace facade gate.
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

const cheatsheet = { show: fn('cheatsheetShow'), hide: fn('cheatsheetHide'), toggle: fn('cheatsheetToggle') };
const ctx = {
  document: { readyState: 'loading', addEventListener: function(){} },
  setTimeout: function() {},
  console: console,
  Object: Object,
  Array: Array,
  Promise: Promise,
  Proxy: Proxy,
  TM: { cheatsheet: cheatsheet }
};
ctx.window = ctx;
ctx.globalThis = ctx;
ctx.addEventListener = function(){};

[
  'initMapSystem', 'assignFactionColors', 'hslToRgb', 'hexToRgb',
  'initTerrainTypes', 'renderMap', 'findPath', 'buildAdjacencyGraph',
  'calculateSupplyLine', 'loadMapFromScenario', 'initGameMap',
  'openMapViewer', 'closeMapViewer', 'toggleTerrainView',
  'addCity', 'setNeighbors', 'updateCityOwner'
].forEach(function(name) { ctx[name] = fn(name); });

[
  'convertLeafletToGame', 'convertGameToGeoJSON', 'convertVoronoiToGame',
  'convertGeoJSONToGame', 'loadMapToScriptData', 'loadMapToGame',
  'loadMapFromURL', 'validateMapData'
].forEach(function(name) { ctx[name] = fn(name); });

[
  'generateMapContextForAI', 'findBorderConflicts', 'generateProvinceContextForAI',
  'calculateStrategicValue', 'getTerrainName', 'getTerrainCombatModifier',
  'calculateDistance', 'calculateMovementCost', 'canSupply',
  'applyAIMapChanges', 'getMapInfluenceRules'
].forEach(function(name) { ctx[name] = fn(name); });
ctx._miFindPath = fn('_miFindPath');
ctx._mapCfg = fn('_mapCfg');

[
  'renderGameMap', 'showMapInGame', 'closeGameMap', 'showProvinceDetails'
].forEach(function(name) { ctx[name] = fn(name); });

[
  'recognizeMapRegions', 'loadAndRecognizeMap', 'showRecognitionProgress',
  'hideRecognitionProgress', 'recognizeMapByBorders', 'smartRecognizeMap',
  'loadAndRecognizeMapByBorders', 'recognizeMapByBordersFast',
  'loadAndRecognizeMapByBordersFast', 'recognizeMapByBordersImproved',
  'loadAndRecognizeMapByBordersImproved', 'recognizeMapEU4Style',
  'loadAndRecognizeMapEU4Style'
].forEach(function(name) { ctx[name] = fn(name); });
ctx.floodFill = fn('floodFill');
ctx.mapEditorPro = { open: fn('mapEditorProOpen') };

ctx.TM_ICONS = { close: '<svg></svg>' };
ctx.tmIcon = fn('tmIcon');
ctx.gv = fn('gv');
ctx.openGenericModal = fn('openGenericModal');
ctx.closeGenericModal = fn('closeGenericModal');
ctx.showModal = fn('showModal');
ctx.closeModal = fn('closeModal');

ctx._renderShellExtrasLeft = fn('_renderShellExtrasLeft');
ctx._renderShellExtrasRight = fn('_renderShellExtrasRight');
ctx.openSideDrawer = fn('openSideDrawer');
ctx.closeSideDrawer = fn('closeSideDrawer');
ctx._tmApplyTheme = fn('_tmApplyTheme');
ctx._tmApplySize = fn('_tmApplySize');
ctx._tmApplyBodyFont = fn('_tmApplyBodyFont');
ctx._tmApplyTitleFont = fn('_tmApplyTitleFont');

ctx.TOP_BAR_VARS = ['guoku', 'neitang'];
ctx.renderTopBarVars = fn('renderTopBarVars');
ctx.openAllVarsModal = fn('openAllVarsModal');
ctx.closeAllVarsModal = fn('closeAllVarsModal');
ctx.switchGTab = fn('switchGTab');
ctx.closeTurnResult = fn('closeTurnResult');
ctx._trNavTurn = fn('_trNavTurn');
ctx._trExportCurrent = fn('_trExportCurrent');

[
  'openHukouPanel', 'closeHukouPanel', 'renderHukouPanel',
  'openMinxinPanel', 'closeMinxinPanel', 'renderMinxinPanel',
  'openHuangquanPanel', 'closeHuangquanPanel', 'renderHuangquanPanel',
  'openHuangweiPanel', 'closeHuangweiPanel', 'renderHuangweiPanel'
].forEach(function(name) { ctx[name] = fn(name); });
ctx.VarDrawersFinal = { install: fn('varDrawersInstall'), VERSION: 1 };

ctx.HelpSystem = {};
ctx.openShizhengTasks = fn('openShizhengTasks');
ctx.renderRenwu = fn('renderRenwu');
ctx.renderMilTab = fn('renderMilTab');

vm.createContext(ctx);

function load(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(src, ctx, { filename: rel });
}

load('tm-namespaces.js');

const TM = ctx.TM;

// R208 P6-α: TM.MapSystem alias 已退役·canonical = TM.Map (R87 facade 直接 rename in-place)
assert(TM.Map && typeof TM.Map.has === 'function', 'TM.Map is the R87 facade (rename from TM.MapSystem at R208)');
assert(typeof TM.MapSystem === 'undefined', 'R208·TM.MapSystem alias should be retired');
assert(TM.Map.system === TM.Map, 'TM.Map.system self-ref·marker for runtime facade');
assert(TM.Map.findPath === ctx.findPath, 'TM.Map top-level R87 facade should still expose findPath');
assert(TM.Map.open('regions') === undefined, 'TM.Map.open should keep its existing helper behavior');

assert(TM.Map.converter.convertLeafletToGame === ctx.convertLeafletToGame, 'Map.converter.convertLeafletToGame');
assert(TM.Map.converter.convertGeoJSONToGame === ctx.convertGeoJSONToGame, 'Map.converter.convertGeoJSONToGame');
assert(TM.Map.converter.validateMapData === ctx.validateMapData, 'Map.converter.validateMapData');
assert(TM.Map.converter.listMissing().length === 0, 'Map.converter mocked refs should all be available');

assert(TM.Map.integration.generateMapContextForAI === ctx.generateMapContextForAI, 'Map.integration.generateMapContextForAI');
assert(TM.Map.integration.canSupply === ctx.canSupply, 'Map.integration.canSupply');
assert(TM.Map.integration.applyAIMapChanges === ctx.applyAIMapChanges, 'Map.integration.applyAIMapChanges');
assert(!Object.prototype.hasOwnProperty.call(TM.Map.integration, '_miFindPath'),
  'Map.integration must not expose internal _miFindPath helper');
assert(!Object.prototype.hasOwnProperty.call(TM.Map.integration, '_mapCfg'),
  'Map.integration must not expose internal _mapCfg helper');

assert(TM.Map.display.renderGameMap === ctx.renderGameMap, 'Map.display.renderGameMap');
assert(TM.Map.display.showMapInGame === ctx.showMapInGame, 'Map.display.showMapInGame');
assert(TM.Map.display.closeGameMap === ctx.closeGameMap, 'Map.display.closeGameMap');
assert(TM.Map.display.list().length === 4, 'Map.display should expose four public entries');

assert(TM.Map.recognition.recognizeMapRegions === ctx.recognizeMapRegions, 'Map.recognition.recognizeMapRegions');
assert(TM.Map.recognition.recognizeMapEU4Style === ctx.recognizeMapEU4Style, 'Map.recognition.recognizeMapEU4Style');
assert(TM.Map.recognition.loadAndRecognizeMapByBordersImproved === ctx.loadAndRecognizeMapByBordersImproved,
  'Map.recognition improved loader');
assert(!Object.prototype.hasOwnProperty.call(TM.Map.recognition, 'floodFill'),
  'Map.recognition must not expose floodFill helper');
assert(!Object.prototype.hasOwnProperty.call(TM.Map, 'editors'),
  'standalone map editor tools should stay outside TM.Map');

assert(TM.UI.foundation.TM_ICONS === ctx.TM_ICONS, 'UI.foundation.TM_ICONS');
assert(TM.UI.foundation.tmIcon === ctx.tmIcon, 'UI.foundation.tmIcon');
assert(TM.UI.foundation.gv === ctx.gv, 'UI.foundation.gv');
assert(TM.UI.foundation.openGenericModal === ctx.openGenericModal, 'UI.foundation.openGenericModal');
assert(TM.UI.cheatsheet === cheatsheet, 'TM.UI.cheatsheet should alias TM.cheatsheet');
const nextCheatsheet = { show: fn('nextCheatsheetShow') };
TM.UI.cheatsheet = nextCheatsheet;
assert(TM.cheatsheet === nextCheatsheet, 'TM.UI.cheatsheet setter should update TM.cheatsheet');

assert(TM.UI.shell.renderLeft === ctx._renderShellExtrasLeft, 'UI.shell.renderLeft');
assert(TM.UI.shell.renderRight === ctx._renderShellExtrasRight, 'UI.shell.renderRight');
assert(TM.UI.shell.openSideDrawer === ctx.openSideDrawer, 'UI.shell.openSideDrawer');
assert(TM.UI.shell.closeSideDrawer === ctx.closeSideDrawer, 'UI.shell.closeSideDrawer');
assert(TM.UI.shell.applyTheme === ctx._tmApplyTheme, 'UI.shell.applyTheme');
assert(TM.UI.shell.applyTitleFont === ctx._tmApplyTitleFont, 'UI.shell.applyTitleFont');

assert(TM.UI.topbar.vars === ctx.TOP_BAR_VARS, 'UI.topbar.vars');
assert(TM.UI.topbar.render === ctx.renderTopBarVars, 'UI.topbar.render');
assert(TM.UI.topbar.openAllVarsModal === ctx.openAllVarsModal, 'UI.topbar.openAllVarsModal');
assert(TM.UI.tabs.switchGameTab === ctx.switchGTab, 'UI.tabs.switchGameTab');
assert(TM.UI.turnResult.closeTurnResult === ctx.closeTurnResult, 'UI.turnResult.closeTurnResult');
assert(TM.UI.turnResult.navTurn === ctx._trNavTurn, 'UI.turnResult.navTurn');
assert(TM.UI.turnResult.exportCurrent === ctx._trExportCurrent, 'UI.turnResult.exportCurrent');

assert(TM.UI.varDrawers.openHukouPanel === ctx.openHukouPanel, 'UI.varDrawers.openHukouPanel');
assert(TM.UI.varDrawers.renderMinxinPanel === ctx.renderMinxinPanel, 'UI.varDrawers.renderMinxinPanel');
assert(TM.UI.varDrawers.openHuangweiPanel === ctx.openHuangweiPanel, 'UI.varDrawers.openHuangweiPanel');
assert(TM.UI.varDrawers.final === ctx.VarDrawersFinal, 'UI.varDrawers.final');

assert(!Object.prototype.hasOwnProperty.call(TM.UI, 'help'), 'TM.UI.help should stay out of P5-zeta');
assert(!Object.prototype.hasOwnProperty.call(TM.UI, 'shizheng'), 'TM.UI.shizheng should stay out of P5-zeta');
assert(!Object.prototype.hasOwnProperty.call(TM.UI, 'renwu'), 'TM.UI.renwu should stay out of P5-zeta');
assert(!Object.prototype.hasOwnProperty.call(TM.UI, 'military'), 'TM.UI.military should stay out of P5-zeta');
assert(TM.Lizhi && typeof TM.Lizhi.has === 'function', 'TM.Lizhi legacy facade should remain separate');

assert(TM.namespaces.Map === TM.Map, 'TM.namespaces.Map should point at TM.Map');
assert(TM.namespaces.UI === TM.UI, 'TM.namespaces.UI should point at TM.UI');
assert(TM.NPC && TM.Edict && TM.Fiscal && TM.Authority, 'previous P5 namespaces should remain present');

console.log('[smoke-p5-zeta-map-ui] pass assertions=' + passed);
