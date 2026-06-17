#!/usr/bin/env node
/* eslint-env node */

'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const webRoot = path.resolve(__dirname, '..');
const scenarioDir = path.join(repoRoot, 'scenarios');
const assetDir = path.join(webRoot, 'data', 'maps', 'tianqi-ming2');
const gameMapPath = path.join(assetDir, 'tianqi-ming2.game-map.json');
const auditOut = path.join(assetDir, 'tianqi-map-attach-audit.json');

function findScenarioPath() {
  const file = fs.readdirSync(scenarioDir)
    .find(name => /天启七年/.test(name) && /官方/.test(name) && name.endsWith('.json'));
  if (!file) throw new Error('未找到天启七年官方剧本 JSON');
  return path.join(scenarioDir, file);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function stamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function pointsFromPath(pathText) {
  if (!pathText || typeof pathText !== 'string') return [];
  const nums = pathText.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 6) return [];
  const points = [];
  for (let i = 0; i < nums.length - 1; i += 2) points.push([Number(nums[i]), Number(nums[i + 1])]);
  return points;
}

function asPoints(value) {
  if (!Array.isArray(value)) return [];
  if (value.length > 0 && typeof value[0] === 'number') {
    const points = [];
    for (let i = 0; i < value.length - 1; i += 2) points.push([Number(value[i]), Number(value[i + 1])]);
    return points;
  }
  if (value.length > 0 && Array.isArray(value[0])) return value.map(p => [Number(p[0]), Number(p[1])]);
  return value.map(p => [Number(p.x), Number(p.y)]);
}

function flat(points) {
  return points.flatMap(([x, y]) => [Number(x), Number(y)]);
}

function objectPoints(points) {
  return points.map(([x, y]) => ({ x: Number(x), y: Number(y) }));
}

function centerOf(region, points) {
  if (Array.isArray(region.center) && region.center.length >= 2) return [Number(region.center[0]), Number(region.center[1])];
  if (region.center && typeof region.center === 'object') return [Number(region.center.x), Number(region.center.y)];
  if (region.centroid) return [Number(region.centroid.x), Number(region.centroid.y)];
  if (!points.length) return [0, 0];
  const sum = points.reduce((acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }), { x: 0, y: 0 });
  return [Number((sum.x / points.length).toFixed(1)), Number((sum.y / points.length).toFixed(1))];
}

function normalizeFactionLookup(scenario, gameMap) {
  const byId = new Map();
  const byName = new Map();
  for (const faction of scenario.factions || []) {
    if (faction.id) byId.set(faction.id, faction);
    if (faction.name) byName.set(faction.name, faction);
  }
  const lookup = {};
  for (const [stableKey, meta] of Object.entries(gameMap.factions || {})) {
    const hit = byId.get(meta.scenarioFactionId) ||
      byName.get(meta.scenarioFactionName) ||
      byName.get(meta.label) ||
      byId.get(stableKey) ||
      null;
    lookup[stableKey] = hit || {
      id: stableKey,
      name: meta.label || stableKey,
      color: meta.color || '#808080',
      _mapOnly: true,
    };
    gameMap.factions[stableKey] = {
      ...meta,
      scenarioFactionId: lookup[stableKey].id,
      scenarioFactionName: lookup[stableKey].name,
      scenarioFactionColor: lookup[stableKey].color || meta.color || '',
    };
  }
  return lookup;
}

function normalizeRegion(region, factionLookup, gameMap) {
  const stableKey = region.ownerKey || region.stableFactionId || region.factionId || region.owner || 'fac-ming';
  const faction = factionLookup[stableKey] || { id: stableKey, name: region.factionName || stableKey, color: region.color || '#808080' };
  let points = asPoints(region.points);
  if (!points.length) points = asPoints(region.coords);
  if (!points.length) points = asPoints(region.polygon);
  if (!points.length) points = pointsFromPath(region.path || region.d);
  const center = centerOf(region, points);
  const resources = Array.isArray(region.resources)
    ? region.resources
    : String(region.data?.specialResources || region.resources || '').split(/[、，,·\s]+/).filter(Boolean);
  return {
    ...region,
    type: region.type || 'poly',
    coords: flat(points),
    points,
    polygon: objectPoints(points),
    center,
    centroid: { x: center[0], y: center[1] },
    path: region.path || region.d || '',
    d: region.d || region.path || '',
    neighbors: Array.isArray(region.neighbors) ? region.neighbors : [],
    terrain: region.terrain || region.data?.terrain || 'plains',
    resources,
    owner: faction.id,
    initialOwner: region.initialOwner || faction.id,
    currentOwner: faction.id,
    controller: region.controller || faction.id,
    ownerKey: stableKey,
    initialOwnerKey: region.initialOwnerKey || stableKey,
    currentOwnerKey: stableKey,
    controllerKey: region.controllerKey || stableKey,
    stableFactionId: stableKey,
    factionId: faction.id,
    factionName: faction.name,
    ownerName: faction.name,
    factionColor: faction.color || gameMap.factions?.[stableKey]?.color || region.factionColor || region.color || '',
    color: region.color || faction.color || gameMap.factions?.[stableKey]?.color || '#808080',
    development: Number(region.development ?? region.data?.prosperity ?? 50),
    prosperity: Number(region.prosperity ?? region.data?.prosperity ?? region.development ?? 50),
    troops: Number(region.troops ?? region.data?.governanceMilitary?.standingArmy ?? region.data?.publicTreasuryInit?.troops ?? 0),
    events: region.events || '',
    ownerHistory: Array.isArray(region.ownerHistory) ? region.ownerHistory : [],
    mutable: region.mutable !== false,
  };
}

function normalizeOcean(ocean) {
  let points = asPoints(ocean.points);
  if (!points.length) points = asPoints(ocean.coords);
  if (!points.length) points = asPoints(ocean.polygon);
  if (!points.length) points = pointsFromPath(ocean.path || ocean.d);
  const center = centerOf(ocean, points);
  return {
    ...ocean,
    type: ocean.type || 'poly',
    coords: flat(points),
    points,
    polygon: objectPoints(points),
    center,
    centroid: { x: center[0], y: center[1] },
    path: ocean.path || ocean.d || '',
    d: ocean.d || ocean.path || '',
    terrain: 'water',
    mutable: false,
  };
}

function attachMap() {
  const scenarioPath = findScenarioPath();
  if (!fs.existsSync(gameMapPath)) throw new Error(`未找到地图资产: ${gameMapPath}`);
  const scenario = readJson(scenarioPath);
  const gameMap = readJson(gameMapPath);
  const backupDir = path.join(path.dirname(scenarioPath), '_archived-backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `${path.basename(scenarioPath)}.pre-map-attach-${stamp()}.bak`);
  fs.copyFileSync(scenarioPath, backupPath);

  const factionLookup = normalizeFactionLookup(scenario, gameMap);
  const normalizedMap = {
    ...gameMap,
    enabled: true,
    regions: (gameMap.regions || []).map(region => normalizeRegion(region, factionLookup, gameMap)),
    oceans: (gameMap.oceans || []).map(normalizeOcean),
    roads: Array.isArray(gameMap.roads) ? gameMap.roads : [],
    runtimeContract: {
      ...(gameMap.runtimeContract || {}),
      mutable: true,
      aiReadable: true,
      ownershipMutable: true,
      liveState: 'GM.mapData',
      mirrors: ['P.map', 'P.mapData'],
      aiReadFunction: 'generateMapContextForAI(P.map, P)',
      aiApplyFunction: 'applyAIMapChanges(response, P.map) -> TMMapRuntime',
    },
  };

  scenario.map = normalizedMap;
  scenario.mapData = normalizedMap;
  scenario.mapRuntimeContract = normalizedMap.runtimeContract;
  scenario.refFiles ||= [];
  [
    'web/data/maps/tianqi-ming2/tianqi-ming2.game-map.json',
    'web/data/maps/tianqi-ming2/tianqi-ming2.scenario-fragment.json',
    'web/docs/phase8-map-asset-pipeline-2026-05-09.md',
  ].forEach(ref => {
    if (!scenario.refFiles.includes(ref)) scenario.refFiles.push(ref);
  });

  writeJson(scenarioPath, scenario);
  writeJson(auditOut, {
    ok: true,
    scenarioPath,
    backupPath,
    gameMapPath,
    regionCount: normalizedMap.regions.length,
    oceanCount: normalizedMap.oceans.length,
    ownerCount: new Set(normalizedMap.regions.map(r => r.owner)).size,
    unmappedStableOwners: Object.entries(factionLookup)
      .filter(([key, faction]) => normalizedMap.regions.some(region => region.ownerKey === key) && faction._mapOnly)
      .map(([key, faction]) => ({ key, name: faction.name })),
    mutableRegionCount: normalizedMap.regions.filter(r => r.mutable !== false).length,
    aiReadable: Boolean(normalizedMap.runtimeContract.aiReadable),
    ownershipMutable: Boolean(normalizedMap.runtimeContract.ownershipMutable),
  });

  console.log(JSON.stringify({
    ok: true,
    scenarioPath,
    backupPath,
    auditOut,
    regionCount: normalizedMap.regions.length,
    oceanCount: normalizedMap.oceans.length,
    ownerCount: new Set(normalizedMap.regions.map(r => r.owner)).size,
  }, null, 2));
}

attachMap();
