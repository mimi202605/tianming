#!/usr/bin/env node
/*
 * Tianming map asset pipeline.
 *
 * Converts a player-made map editor export or GeoJSON file into files that can
 * be consumed by the scenario editor and, later, by the game runtime. This is a
 * data pipeline only; it does not modify the formal game UI.
 */

const fs = require('fs');
const path = require('path');

const VERSION = 'tm-map-pipeline-2026-05-09';
const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 720;
const DEFAULT_PADDING = 24;

function usage(exitCode = 0) {
  const msg = `
Usage:
  node scripts/map-asset-pipeline.js <map.json|map.geojson> --out <dir> [options]

Options:
  --id <id>                 Stable asset id. Defaults to the input filename.
  --name <name>             Display name. Defaults to source name or id.
  --width <px>              Output map width. Default: source width or 1200.
  --height <px>             Output map height. Default: source height or 720.
  --padding <px>            GeoJSON normalization padding. Default: 24.
  --no-normalize            Keep GeoJSON coordinates instead of fitting to viewBox.
  --no-neighbors            Do not infer missing neighbors from shared edges.
  --neighbor-epsilon <px>   Shared-edge quantization. Default: 0.75.

Outputs:
  <id>.game-map.json
  <id>.admin-hierarchy.json
  <id>.scenario-fragment.json
  <id>.preview-data.js
  <id>.apply.js
  <id>.manifest.json
`;
  (exitCode ? console.error : console.log)(msg.trim());
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = { input: null, normalize: true, inferNeighbors: true, neighborEpsilon: 0.75 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--') && !args.input) {
      args.input = a;
      continue;
    }
    if (a === '--help' || a === '-h') usage(0);
    if (a === '--no-normalize') { args.normalize = false; continue; }
    if (a === '--no-neighbors') { args.inferNeighbors = false; continue; }
    const needsValue = ['--id', '--name', '--out', '--width', '--height', '--padding', '--neighbor-epsilon'];
    if (needsValue.includes(a)) {
      const v = argv[++i];
      if (v == null) throw new Error(`${a} requires a value`);
      const key = a.replace(/^--/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      args[key] = v;
      continue;
    }
    throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.input) usage(1);
  if (!args.out) throw new Error('--out is required');
  args.width = args.width == null ? null : Number(args.width);
  args.height = args.height == null ? null : Number(args.height);
  args.padding = args.padding == null ? DEFAULT_PADDING : Number(args.padding);
  args.neighborEpsilon = Number(args.neighborEpsilon);
  return args;
}

function readJson(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(text);
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function safeId(value, fallback = 'custom-map') {
  const raw = String(value || '').trim().toLowerCase();
  const id = raw
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return id || fallback;
}

function stableKey(value, fallback = 'key') {
  const id = safeId(value, '');
  if (id) return id;
  return `${fallback}-${hashString(String(value || fallback)).slice(0, 8)}`;
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function detectFormat(data) {
  if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) return 'geojson';
  if (data && Array.isArray(data.divisions)) return 'map-editor';
  if (data && Array.isArray(data.regions)) return 'game-map';
  if (data && data.map && Array.isArray(data.map.regions)) return 'scenario-fragment';
  if (data && Array.isArray(data.provinces)) return 'voronoi';
  throw new Error('Unsupported map format. Expected GeoJSON, map-editor divisions, or game-map regions.');
}

function numberOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) return value.split(/[,\u3001/| ]+/).filter(Boolean);
  return [];
}

function toPointArray(value) {
  if (!value) return [];
  if (Array.isArray(value) && value.length && Array.isArray(value[0])) {
    return value
      .filter(p => Array.isArray(p) && p.length >= 2)
      .map(p => [Number(p[0]), Number(p[1])])
      .filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
  }
  if (Array.isArray(value)) {
    const points = [];
    for (let i = 0; i + 1 < value.length; i += 2) {
      const x = Number(value[i]);
      const y = Number(value[i + 1]);
      if (Number.isFinite(x) && Number.isFinite(y)) points.push([x, y]);
    }
    return points;
  }
  return [];
}

function closeRing(points) {
  if (!points.length) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return points.slice(0, -1);
  return points;
}

function flattenPoints(points) {
  const out = [];
  points.forEach(p => { out.push(round2(p[0]), round2(p[1])); });
  return out;
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function bboxOfPoints(points) {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  points.forEach(([x, y]) => {
    b.minX = Math.min(b.minX, x);
    b.minY = Math.min(b.minY, y);
    b.maxX = Math.max(b.maxX, x);
    b.maxY = Math.max(b.maxY, y);
  });
  if (!Number.isFinite(b.minX)) return null;
  b.width = b.maxX - b.minX;
  b.height = b.maxY - b.minY;
  return b;
}

function bboxOfMany(polys) {
  return bboxOfPoints(polys.flat());
}

function polygonArea(points) {
  const n = points.length;
  if (n < 3) return 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i][0] * points[j][1] - points[j][0] * points[i][1];
  }
  return area / 2;
}

function polygonCentroid(points) {
  const n = points.length;
  if (n < 3) {
    const b = bboxOfPoints(points);
    return b ? [round2((b.minX + b.maxX) / 2), round2((b.minY + b.maxY) / 2)] : [0, 0];
  }
  let area = 0, cx = 0, cy = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cross = points[i][0] * points[j][1] - points[j][0] * points[i][1];
    area += cross;
    cx += (points[i][0] + points[j][0]) * cross;
    cy += (points[i][1] + points[j][1]) * cross;
  }
  if (Math.abs(area) < 1e-9) {
    const b = bboxOfPoints(points);
    return b ? [round2((b.minX + b.maxX) / 2), round2((b.minY + b.maxY) / 2)] : [0, 0];
  }
  return [round2(cx / (3 * area)), round2(cy / (3 * area))];
}

function colorFromIndex(i) {
  const palette = ['#b94a32', '#2f806f', '#8f6b2e', '#5f6f94', '#8a4f69', '#6f7f45', '#9a6a3c', '#58756c'];
  return palette[i % palette.length];
}

function normalizeTerrain(value) {
  const terrain = String(value || '').trim().toLowerCase();
  const aliases = {
    plain: 'plains', plains: 'plains', grass: 'grassland', grassland: 'grassland',
    hill: 'hills', hills: 'hills', mountain: 'mountains', mountains: 'mountains',
    forest: 'forest', woods: 'forest', desert: 'desert', marsh: 'swamp',
    swamp: 'swamp', water: 'water', sea: 'water', coast: 'water', plateau: 'mountains'
  };
  return aliases[terrain] || terrain || 'plains';
}

function pickName(props, fallback) {
  return props.name || props.NAME || props.Name || props.title || props.label || props.admin || fallback;
}

function pickId(props, fallback) {
  return props.id || props.ID || props.adcode || props.code || props.gid || fallback;
}

function geojsonPolygons(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return geometry.coordinates.map(ring => closeRing(toPointArray(ring)));
  if (geometry.type === 'MultiPolygon') {
    const rings = [];
    geometry.coordinates.forEach(poly => {
      if (poly && poly[0]) rings.push(closeRing(toPointArray(poly[0])));
    });
    return rings;
  }
  return [];
}

function normalizeGeoPoint(point, bbox, width, height, padding) {
  const bw = bbox.width || 1;
  const bh = bbox.height || 1;
  const scale = Math.min((width - padding * 2) / bw, (height - padding * 2) / bh);
  const usedW = bw * scale;
  const usedH = bh * scale;
  const offsetX = (width - usedW) / 2;
  const offsetY = (height - usedH) / 2;
  return [
    offsetX + (point[0] - bbox.minX) * scale,
    height - (offsetY + (point[1] - bbox.minY) * scale)
  ];
}

function convertGeoJSON(data, opts) {
  const allPolys = [];
  data.features.forEach(f => geojsonPolygons(f.geometry).forEach(p => allPolys.push(p)));
  const geoBBox = bboxOfMany(allPolys) || { minX: 0, minY: 0, width: 1, height: 1 };
  const width = opts.width || DEFAULT_WIDTH;
  const height = opts.height || DEFAULT_HEIGHT;
  const regions = [];

  data.features.forEach((feature, index) => {
    const props = feature.properties || {};
    const polygons = geojsonPolygons(feature.geometry)
      .filter(p => p.length >= 3)
      .map(p => opts.normalize ? p.map(pt => normalizeGeoPoint(pt, geoBBox, width, height, opts.padding)) : p);
    if (!polygons.length) return;
    polygons.sort((a, b) => Math.abs(polygonArea(b)) - Math.abs(polygonArea(a)));
    const main = polygons[0];
    const id = safeId(pickId(props, `region-${index + 1}`), `region-${index + 1}`);
    regions.push(regionFromParts({
      id,
      name: pickName(props, id),
      points: main,
      extraPolygons: polygons.slice(1),
      props,
      index
    }));
  });

  return {
    name: opts.name || data.name || 'Imported GeoJSON Map',
    width,
    height,
    sourceKind: 'geojson',
    regions
  };
}

function convertMapEditor(data, opts) {
  const sourceW = data.bitmapWidth || data.width || DEFAULT_WIDTH;
  const sourceH = data.bitmapHeight || data.height || DEFAULT_HEIGHT;
  const width = opts.width || sourceW;
  const height = opts.height || sourceH;
  const sx = width / sourceW;
  const sy = height / sourceH;
  const factions = new Map((data.factions || []).filter(f => f && f.id).map(f => [f.id, f]));
  const regions = [];

  data.divisions.forEach((d, index) => {
    const main = scalePoints(toPointArray(d.polygon || d.coords), sx, sy);
    if (main.length < 3) return;
    const props = Object.assign({}, d);
    if (d.factionId && factions.has(d.factionId)) props.owner = factions.get(d.factionId).name || d.factionId;
    const id = safeId(d.id || `division-${index + 1}`, `division-${index + 1}`);
    regions.push(regionFromParts({
      id,
      name: d.name || id,
      points: main,
      extraPolygons: (d.extraPolygons || []).map(p => scalePoints(toPointArray(p), sx, sy)).filter(p => p.length >= 3),
      props,
      index
    }));
  });

  const map = {
    name: opts.name || data.title || data.name || 'Map Editor Export',
    width,
    height,
    dynasty: data.dynasty || '',
    era: data.era || '',
    sourceKind: 'map-editor',
    regions
  };
  map._v2 = {
    rivers: data.rivers || [],
    roads: data.roads || [],
    strongholds: data.strongholds || [],
    ferries: data.ferries || [],
    areaLinks: data.areaLinks || []
  };
  return map;
}

function convertGameMap(data, opts) {
  const width = opts.width || data.width || DEFAULT_WIDTH;
  const height = opts.height || data.height || DEFAULT_HEIGHT;
  const sx = width / (data.width || width);
  const sy = height / (data.height || height);
  const regions = (data.regions || []).map((r, index) => {
    const points = scalePoints(toPointArray(r.coords || r.polygon), sx, sy);
    return regionFromParts({
      id: safeId(r.id || `region-${index + 1}`, `region-${index + 1}`),
      name: r.name || r.title || `Region ${index + 1}`,
      points,
      props: r,
      index
    });
  }).filter(r => r.coords.length >= 6);
  return Object.assign({}, data, {
    name: opts.name || data.name || 'Game Map',
    width,
    height,
    sourceKind: 'game-map',
    regions
  });
}

function convertVoronoi(data, opts) {
  return convertGameMap({
    name: data.name,
    width: data.width,
    height: data.height,
    regions: (data.provinces || []).map(p => Object.assign({}, p, { coords: p.coords || p.polygon }))
  }, opts);
}

function scalePoints(points, sx, sy) {
  return points.map(([x, y]) => [x * sx, y * sy]);
}

function regionFromParts({ id, name, points, extraPolygons = [], props = {}, index = 0 }) {
  const center = props.center || props.centroid || polygonCentroid(points);
  const owner = props.owner || props.dejureOwner || (props.autonomy && props.autonomy.holder) || props.faction || '';
  const development = numberOr(props.development, numberOr(props.prosperity, 50));
  return {
    id: String(id),
    name: String(name || id),
    type: 'poly',
    coords: flattenPoints(points),
    center: Array.isArray(center) ? [round2(center[0]), round2(center[1])] : polygonCentroid(points),
    neighbors: asArray(props.neighbors).map(String),
    terrain: normalizeTerrain(props.terrain),
    resources: asArray(props.resources || props.specialResources),
    owner: String(owner || ''),
    characters: asArray(props.characters),
    troops: numberOr(props.troops, props.governanceMilitary && props.governanceMilitary.standingArmy || 0),
    development: Math.max(0, Math.min(100, Math.round(development))),
    events: props.events || '',
    color: props.color || colorFromIndex(index),
    _meta: makeMeta(props, points, extraPolygons)
  };
}

function makeMeta(props, points, extraPolygons) {
  const excluded = new Set(['coords', 'polygon', 'extraPolygons', 'center', 'centroid', 'neighbors']);
  const meta = {};
  Object.keys(props || {}).forEach(k => {
    if (!excluded.has(k)) meta[k] = props[k];
  });
  meta.bbox = bboxOfPoints(points);
  meta.area = Math.abs(round2(polygonArea(points)));
  if (extraPolygons.length) meta.extraPolygons = extraPolygons.map(flattenPoints);
  return meta;
}

function inferNeighbors(regions, epsilon) {
  const edgeMap = new Map();
  regions.forEach(region => {
    const pts = toPointArray(region.coords);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const key = edgeKey(a, b, epsilon);
      if (!edgeMap.has(key)) edgeMap.set(key, []);
      edgeMap.get(key).push(region.id);
    }
  });
  const add = new Map(regions.map(r => [r.id, new Set(asArray(r.neighbors))]));
  edgeMap.forEach(ids => {
    const unique = Array.from(new Set(ids));
    if (unique.length < 2) return;
    unique.forEach(a => unique.forEach(b => {
      if (a !== b) add.get(a).add(b);
    }));
  });
  regions.forEach(r => {
    r.neighbors = Array.from(add.get(r.id)).filter(id => id && id !== r.id).sort();
  });
}

function edgeKey(a, b, epsilon) {
  const qa = quantPoint(a, epsilon);
  const qb = quantPoint(b, epsilon);
  return qa < qb ? `${qa}|${qb}` : `${qb}|${qa}`;
}

function quantPoint(p, epsilon) {
  return `${Math.round(p[0] / epsilon)},${Math.round(p[1] / epsilon)}`;
}

function buildAdminHierarchy(map, assetId) {
  const groups = new Map();
  map.regions.forEach(region => {
    const key = region.owner ? stableKey(region.owner, 'owner') : 'player';
    if (!groups.has(key)) {
      groups.set(key, {
        name: region.owner || '玩家势力',
        description: '',
        divisions: []
      });
    }
    groups.get(key).divisions.push(regionToDivision(region, assetId));
  });
  return Object.fromEntries(groups);
}

function regionToDivision(region, assetId) {
  const m = region._meta || {};
  return {
    id: region.id,
    name: region.name,
    level: m.level || 'province',
    description: m.description || '',
    dejureOwner: region.owner || m.dejureOwner || '',
    terrain: region.terrain,
    specialResources: region.resources || [],
    prosperity: region.development,
    minxinLocal: numberOr(m.minxinLocal, 50),
    corruptionLocal: numberOr(m.corruptionLocal, 10),
    populationDetail: m.populationDetail || null,
    fiscalDetail: m.fiscalDetail || null,
    carryingCapacity: m.carryingCapacity || null,
    economyBase: m.economyBase || null,
    tags: m.tags || null,
    mapRegionId: region.id,
    mapAssetId: assetId,
    children: []
  };
}

function buildMapUi(map) {
  return {
    renderer: 'svg-polygons',
    viewBox: [0, 0, map.width, map.height],
    defaultMode: 'owner',
    defaultScale: 'realm',
    interaction: {
      pointerAnchoredZoom: true,
      smoothZoom: true,
      zoomMin: 1,
      zoomMax: 2.65,
      panClamp: true
    },
    labels: {
      realm: 'show owner/realm labels at broad scale',
      region: 'show region labels at medium scale',
      prefecture: 'show leaf/local labels at close scale'
    },
    note: 'Derived from Phase 8 preview map work; this is data/UI contract only, not formal game UI code.'
  };
}

function validateAsset(map) {
  const warnings = [];
  const ids = new Set();
  map.regions.forEach(region => {
    if (ids.has(region.id)) warnings.push(`Duplicate region id: ${region.id}`);
    ids.add(region.id);
    if (!region.name) warnings.push(`Region ${region.id} has no name`);
    if (!Array.isArray(region.coords) || region.coords.length < 6) warnings.push(`Region ${region.id} has invalid coords`);
    if (!Array.isArray(region.center) || region.center.length < 2) warnings.push(`Region ${region.id} has no center`);
  });
  map.regions.forEach(region => {
    (region.neighbors || []).forEach(n => {
      if (!ids.has(n)) warnings.push(`Region ${region.id} references missing neighbor ${n}`);
    });
  });
  return warnings;
}

function buildApplyJs(asset) {
  return `/* Generated by ${VERSION}. Loads a Tianming map asset into scriptData/P/GM when present. */
(function(global){
  var asset = ${JSON.stringify(asset, null, 2)};
  global.TIANMING_MAP_ASSET = asset;
  if (global.scriptData) {
    global.scriptData.map = asset.map;
    global.scriptData.adminHierarchy = asset.adminHierarchy;
  }
  if (global.P) {
    global.P.map = asset.map;
    global.P.adminHierarchy = asset.adminHierarchy;
  }
  if (global.GM && asset.adminHierarchy) {
    global.GM.adminHierarchy = JSON.parse(JSON.stringify(asset.adminHierarchy));
  }
  if (global.console) {
    console.log('[tm-map-pipeline] loaded ' + asset.id + ' regions=' + asset.map.regions.length);
  }
})(typeof window !== 'undefined' ? window : globalThis);
`;
}

function buildPreviewJs(asset) {
  return `/* Generated by ${VERSION}. Data-only preview asset. */
(function(global){
  global.TIANMING_MAP_ASSET = ${JSON.stringify(asset, null, 2)};
})(typeof window !== 'undefined' ? window : globalThis);
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(args.input);
  const data = readJson(inputPath);
  const detected = detectFormat(data);
  const id = safeId(args.id || path.basename(inputPath), 'custom-map');
  const opts = {
    id,
    name: args.name,
    width: args.width,
    height: args.height,
    padding: args.padding,
    normalize: args.normalize
  };

  let map;
  if (detected === 'geojson') map = convertGeoJSON(data, opts);
  else if (detected === 'map-editor') map = convertMapEditor(data, opts);
  else if (detected === 'game-map') map = convertGameMap(data, opts);
  else if (detected === 'scenario-fragment') map = convertGameMap(data.map, opts);
  else if (detected === 'voronoi') map = convertVoronoi(data, opts);

  map.id = id;
  map.pipelineVersion = VERSION;
  if (args.inferNeighbors) inferNeighbors(map.regions, args.neighborEpsilon);

  const adminHierarchy = data.adminHierarchy || buildAdminHierarchy(map, id);
  const mapUi = buildMapUi(map);
  const warnings = validateAsset(map);
  const asset = {
    id,
    name: args.name || map.name || id,
    pipelineVersion: VERSION,
    sourceKind: detected,
    generatedAt: new Date().toISOString(),
    map,
    adminHierarchy,
    mapUi
  };
  const scenarioFragment = {
    map: asset.map,
    adminHierarchy: asset.adminHierarchy,
    mapUi: asset.mapUi,
    mapPipeline: {
      id,
      version: VERSION,
      sourceKind: detected,
      generatedAt: asset.generatedAt
    }
  };

  const outDir = path.resolve(args.out);
  fs.mkdirSync(outDir, { recursive: true });
  const files = {
    gameMap: path.join(outDir, `${id}.game-map.json`),
    adminHierarchy: path.join(outDir, `${id}.admin-hierarchy.json`),
    scenarioFragment: path.join(outDir, `${id}.scenario-fragment.json`),
    previewData: path.join(outDir, `${id}.preview-data.js`),
    applyJs: path.join(outDir, `${id}.apply.js`),
    manifest: path.join(outDir, `${id}.manifest.json`)
  };

  writeJson(files.gameMap, asset.map);
  writeJson(files.adminHierarchy, asset.adminHierarchy);
  writeJson(files.scenarioFragment, scenarioFragment);
  fs.writeFileSync(files.previewData, buildPreviewJs(asset), 'utf8');
  fs.writeFileSync(files.applyJs, buildApplyJs(asset), 'utf8');
  writeJson(files.manifest, {
    id,
    name: asset.name,
    version: VERSION,
    source: inputPath,
    sourceKind: detected,
    generatedAt: asset.generatedAt,
    width: map.width,
    height: map.height,
    regionCount: map.regions.length,
    adminFactionCount: Object.keys(adminHierarchy || {}).length,
    warnings,
    files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, path.relative(outDir, v)]))
  });

  console.log(JSON.stringify({
    ok: true,
    id,
    sourceKind: detected,
    outDir,
    regionCount: map.regions.length,
    warnings
  }, null, 2));
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error('[tm-map-pipeline] ' + err.message);
    process.exit(1);
  }
}
