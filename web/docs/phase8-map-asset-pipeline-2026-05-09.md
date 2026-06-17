# Phase 8 Map Asset Pipeline - 2026-05-09

Scope: record the reusable map workflow behind the Phase 8 preview map. This is a data pipeline and handoff contract. It does not change the formal game UI.

## Why This Exists

The current Phase 8 map work lives in `web/preview/phase8-b-shell-preview.html`, but Tianming is not a fixed-map game. Players can create maps and scenarios, so the preview implementation should not become a hard-coded production dependency.

The durable target is:

1. Map editor draws geography and exports map data.
2. Scenario editor imports that map, binds history/gameplay data, and exports scenario data.
3. Formal game runtime loads the selected scenario and reads `map` / `adminHierarchy` from that scenario.
4. Preview pages remain visual prototypes for interaction, density, and presentation only.

## Responsibility Split

### Map Editor

Owns geometry and topology:

- Region polygons and optional extra polygons.
- Region ids, names, centers, colors, terrain, owner/faction hints.
- Map width/height and image coordinate space.
- Neighbor links, rivers, roads, ferries, strongholds, and other geographic annotations.

The map editor should export a portable map asset. It should not know formal-game UI layout.

### Scenario Editor

Owns historical and rules binding:

- Chooses which map asset the scenario uses.
- Converts/imports map regions into `scriptData.map`.
- Builds or edits `scriptData.adminHierarchy`.
- Adds population, fiscal, official, military, faction, event, and starting-state data.
- Exports the scenario so the formal game can load it without reading preview-only globals.

The scenario editor may use generated defaults, but it should let the author revise the generated hierarchy and gameplay fields.

### Formal Game Runtime

Owns live state:

- On scenario start, deep-clones scenario `map` into runtime `P.map`.
- Loads scenario `adminHierarchy` as the initial administrative seed.
- During play, reads mutable settlement and region state from the runtime state layer, not from preview constants.
- Renders map modes from actual state values.

Formal game UI should not depend on `MING_MAP_REGIONS`, the Phase 8 preview basemap, or the preview-only popup model.

### Preview Page

Owns interaction prototyping:

- Map-mode density and color language.
- Pointer-centered zoom and pan feel.
- Label hierarchy behavior by zoom level.
- EU4/CK3-inspired region detail panel form.
- Legend placement, right-side command stack, and bottom action cards.

Preview output can inform the formal UI later, but it should remain replaceable.

## New Utility

Added:

```bash
node web/scripts/map-asset-pipeline.js <map.json|map.geojson> --out <output-dir> [options]
```

Local Codex skill added:

```text
C:\Users\37814\.codex\skills\tianming-map-pipeline\SKILL.md
```

Use it for future Tianming map-editor exports, GeoJSON imports, scenario map assets, and `P.map` / `scriptData.map` / `adminHierarchy` pipeline work.

Current accepted inputs:

- GeoJSON `FeatureCollection`.
- Map editor v2 export with `divisions[]`.
- Existing game map with `regions[]`.
- Scenario fragment with `map.regions`.
- Simple Voronoi export with `provinces[]`.

Useful options:

```bash
--id <asset-id>
--name <display-name>
--width <number>
--height <number>
--padding <number>
--no-normalize
--no-neighbors
--neighbor-epsilon <number>
```

Example:

```bash
node web/scripts/map-asset-pipeline.js web/data/maps/default-map.json --out web/data/maps/default-map-pipeline --id default-map --name 默认地图
```

Example with a GeoJSON map:

```bash
node web/scripts/map-asset-pipeline.js "C:\Users\37814\Downloads\明代1582年地图 (1).geojson" --out "C:\Users\37814\AppData\Local\Temp\tm-map-pipeline-ming1582-test" --id ming-1582 --name 明代1582
```

## Generated Files

For asset id `ming-1582`, the pipeline writes:

- `ming-1582.game-map.json`: normalized `P.map` / `scriptData.map` compatible map data.
- `ming-1582.admin-hierarchy.json`: generated administrative hierarchy grouped by owner/faction.
- `ming-1582.scenario-fragment.json`: ready-to-merge scenario fragment containing `map`, `adminHierarchy`, and `mapUi`.
- `ming-1582.preview-data.js`: browser preview data, intended for prototypes and visual testing.
- `ming-1582.apply.js`: optional dev helper that applies the asset to known editor/runtime globals if present.
- `ming-1582.manifest.json`: generation summary, source kind, file names, and warnings.

## Data Contract

The normalized game map has this shape:

```js
{
  id: "ming-1582",
  name: "明代1582",
  width: 1200,
  height: 720,
  regions: [
    {
      id: "region-1",
      name: "京师",
      coords: [x1, y1, x2, y2, x3, y3],
      center: [cx, cy],
      neighbors: ["region-2"],
      terrain: "plains",
      owner: "大明",
      color: "#b94a32",
      development: 50,
      prosperity: 50,
      unrest: 20,
      _meta: {}
    }
  ]
}
```

The generated admin hierarchy uses stable internal owner keys. Chinese owner names are preserved as display names, while keys are made script-safe when necessary.

## Validation Rules

The pipeline currently validates:

- Region ids are present and unique.
- Region names are present.
- Each polygon has at least three points.
- Centers are generated if missing.
- Neighbor links are symmetric when inferred.
- Output dimensions are present.
- Manifest warnings are written for suspicious input.

Smoke tests run on 2026-05-09:

- `web/data/maps/default-map.json`: detected as `game-map`, 75 regions, no warnings.
- `C:\Users\37814\Downloads\明代1582年地图 (1).geojson`: detected as `geojson`, 26 regions, no warnings.

## Integration Path

Short term:

1. Keep improving the Phase 8 preview map UI in `web/preview/phase8-b-shell-preview.html`.
2. Use `web/scripts/map-asset-pipeline.js` to turn preview or editor map data into reusable assets.
3. Keep generated test outputs outside the repo unless they are intentionally promoted.

Medium term:

1. Add an import/export button in the map editor that calls this same conversion logic.
2. Add a scenario-editor import flow: choose a map asset, generate defaults, then let the author edit hierarchy/gameplay fields.
3. Store selected map asset metadata in the scenario.
4. Make formal-game map rendering consume generic `P.map` and runtime state, not preview constants.

Long term:

1. Promote the pipeline into a shared module used by map editor, scenario editor, preview, and tests.
2. Add formal validation for rivers, roads, strongholds, ferries, and cross-region graph consistency.
3. Add map asset version migration so old player-created maps remain loadable.
4. Add screenshot/visual validation for generated preview assets.

## Related Files

- `web/scripts/map-asset-pipeline.js`
- `web/map-editor-to-game.js`
- `web/map-converter.js`
- `web/map-integration.js`
- `web/editor-administration.js`
- `web/tm-map-system.js`
- `web/docs/phase8-map-function-gap-eu4-ck3-2026-05-09.md`
- `web/docs/phase8-region-detail-reference-eu4-ck3-2026-05-09.md`
