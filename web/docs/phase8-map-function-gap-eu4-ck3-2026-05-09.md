# Phase 8 Map Function Gap: EU4 / CK3 Reference - 2026-05-09

Scope: preview-only analysis for `web/preview/phase8-b-shell-preview.html`.

## Current Tianming Preview Map

Implemented:

- Data-aligned Ming 1582 basemap and 26 selectable region paths.
- Hover tooltip, click selection, province archive popup.
- Wheel zoom, reset, and zoomed pan plumbing; visible zoom buttons are hidden in the Phase 8 preview shell.
- Real preview layer chips: 民情 / 财赋 / 军务 / 官守 / 势力.
- Map alert chips, search, quick focus buttons, and right-side `图` entry.

Not yet implemented:

- Region popup data is derived mock data, not bound to formal game state.
- No geographic hierarchy drill-down beyond the 26-region level.
- No outliner sync, full province list, or issue-list ownership by production state.
- No map-mode keyboard shortcuts, filters, minimap, or camera bookmarks.
- No production armies/fronts/supply/trade/revolt overlays.
- No fog-of-war/intel/known-world logic or production state-based map annotations.

## EU4 / CK3 Reference Takeaways

EU4 is a map-mode-heavy game. Its map is not only a visual board; it is the main query surface for political, diplomatic, trade, economy, religion, culture, unrest, institutions, terrain, forts, supply, naval, colonial, and development questions. The important pattern is: one click changes the semantic layer, every color means a quantified or categorical state, and the UI provides many built-in modes plus user-favorite shortcuts.

CK3 is hierarchy-and-context-heavy. Its map changes meaning by zoom level and selected object: barony/county/duchy/kingdom/empire, realm, faith, culture, development, control, county opinion, houses, dynasties, governments, struggles, and war state. The important pattern is: the map helps the player answer "who controls what, under whom, with what social/religious/cultural pressure?"

## Gaps For Tianming

### P0: Make Map Modes Real

Turn the existing four chips into true modes:

- 民情: color by unrest / famine / satisfaction / petitions.
- 财赋: color by tax, grain, arrears, transport loss, corruption.
- 军务: color by garrison, border pressure, banditry, military logistics.
- 官守: color by official loyalty, vacancy, faction control, corruption, implementation rate.

Each mode needs:

- A color scale legend.
- Hover tooltip fields that change by mode.
- Click popup tabs that open to the matching section.
- Alert chips that jump to the affected region.

### P0: Bind Map To Game State

Replace derived mock values in `deriveMingRegionMeta()` with real data from the formal game state model:

- Province/region identity.
- Population, grain, tax, silver, manpower, unrest, disasters.
- Officials, factions, policy effects, local incidents.
- Current turn deltas and pending decisions.

The map should become a readable state projection, not a decorative preview layer.

### P1: Add Event And Issue Overlays

Add lightweight overlay markers:

- Drought/flood/famine/uprising icons.
- Military threat markers.
- Court memorials tied to regions.
- Tax/grain transport route stress.
- Hover/click opens the matching issue, not only the province popup.

### P1: Add Hierarchy And Drill-Down

The current map is one administrative scale. Add hierarchy behaviors:

- Top level: 天下 / region summary.
- Mid level: province or circuit.
- Detail level: prefecture/county placeholder, even if initially simulated.
- Breadcrumb in popup: 天下 > 布政司/都司 > 府州.

This is closer to CK3's zoom-level map meaning and EU4's province-level interaction.

### P1: Add Navigation Helpers

- Province/region search.
- Hotkey or list for current crises.
- Camera focus when clicking alert/right-panel item.
- Recently selected region memory.
- Optional minimap or overview inset for large future maps.

### P2: Add Strategic Overlays

These can wait until the data model is richer:

- Trade/grain route layer.
- Supply/transport layer.
- Administrative reach / decree implementation layer.
- Faction influence layer.
- Intelligence/uncertainty layer for border/frontier regions.
- Historical comparison or archive layer for "史官实录".

## Suggested Next Implementation Slice

Do one vertical slice instead of adding many empty buttons:

1. Implement real `mapMode` state for the four existing chips.
2. Add mode-specific region coloring and legend.
3. Add mode-specific hover fields.
4. Make alert chips focus/select their target region.
5. Keep values mock-but-structured in preview, with names matching future formal game state fields.

This would move the map from "selectable illustration" to "strategy information surface" without waiting for full production integration.

## Implementation Pass: Preview Vertical Slice

Implemented in `web/preview/phase8-b-shell-preview.html`:

- The four visible map chips are now real map modes: `mood`, `tax`, `army`, `office`.
- Each mode recolors the 26 Ming regions from structured preview state.
- Added a mode-aware legend with low/mid/high meaning and explanatory note.
- Hover tooltip now changes fields by active mode.
- Province popup now has mode tabs: 总览 / 民情 / 财赋 / 军务 / 官守.
- Popup header now shows a hierarchy breadcrumb: 天下 > region level > prefecture placeholder.
- Added event overlay markers for drought, pay arrears, canal transport, sea tax, and chieftain/officer risk.
- Alert chips now jump to target regions and switch to the relevant map mode.
- Added map search with datalist and quick crisis-region buttons.
- Added map scale buttons: 天下 / 省道 / 府州.
- 府州 scale shows placeholder prefecture pins, reserving the visual contract for future county/prefecture data.

Current limitation:

- The preview state is structured but still derived mock data. Formal-game integration should replace `deriveMingRegionMeta()` with the real province/region state projection layer.

Validation:

- Page reload on `http://127.0.0.1:8765/web/preview/phase8-b-shell-preview.html` had 26 `.ming-region`, 5 `.map-event-marker`, 4 `.map-layer`, 3 `.map-scale`, and 1 `#map-legend`.
- Console warnings/errors: none relevant.
- Clicking 财赋 sets `#mapwrap[data-map-mode="tax"]` and updates legend to `财赋 · 税粮压力`.
- Clicking `辽饷待拨` selects 1 region, opens `#ppop.show`, focuses `建西海西诸卫`, and switches mode to `army`.
- Clicking 府州 sets `#mapwrap[data-map-scale="prefecture"]` and shows 26 `.prefecture-hint` nodes.
- Searching `浙江` opens the 浙江 province popup.

Screenshots:

- `C:/Users/37814/AppData/Local/Temp/phase8-map-modes-default.png`
- `C:/Users/37814/AppData/Local/Temp/phase8-map-modes-final.png`

## Implementation Pass: Owner Dynamics Preview

Implemented in `web/preview/phase8-b-shell-preview.html`:

- Hid the visible right-side zoom button stack while keeping wheel zoom/pan behavior.
- Moved the map legend to the lower-right area above the red end-turn button.
- Strengthened region fills and mode colors so map ownership/state is easier to read.
- Added a fifth map mode, `owner`, shown as the `势力` chip and popup tab.
- Added two preview powers: `大明朝廷` and `辽海边镇`.
- Added scenario controls in the legend: `推演一步` and `复位势力`.
- Ownership changes now immediately rerender region fill colors and popup owner fields.

Validation:

- Browser target: `http://127.0.0.1:8765/web/preview/phase8-b-shell-preview.html`.
- Console warnings/errors after reload and interaction: 0.
- `.map-zoom-tools` remains in DOM for future use but is not visible.
- Clicking `势力` sets `#mapwrap[data-map-mode="owner"]`.
- Clicking `推演一步` changed `ming-26` from court red `#b94a32` to frontier green `#2f806f`.
- Clicking `ming-10` after the scenario opened the region popup and showed owner `辽海边镇`.

Screenshots:

- `C:/Users/37814/AppData/Local/Temp/phase8-map-owner-dynamic.png`
- `C:/Users/37814/AppData/Local/Temp/phase8-map-owner-popup.png`

## Implementation Pass: Scale-Aware Map Labels

Issue:

- Region names looked like annotations burned into the map texture.
- The same administrative labels were visible across scale levels, unlike EU4/CK3-style strategic maps.

Reference behavior:

- EU4-style zoomed-out maps emphasize country/realm names, while province names become useful at closer province-level inspection.
- CK3-style map text changes by hierarchy: realms/titles at broad scale, counties/holdings at closer scales.

Implemented in `web/preview/phase8-b-shell-preview.html`:

- Split map text into an independent `map-label-layer` instead of raw text painted directly on region shapes.
- `天下` scale now shows only large realm-level labels: `大明`, `西域`, `辽海`.
- `省道` scale shows province/region labels as small floating plaques.
- `府州` scale hides province labels and shows small point labels such as `顺天府`, `应天府`, `浙江府`, etc.
- Removed the low-opacity province ghost labels from `府州` scale so labels no longer read as carved into the basemap.

Validation:

- Browser target: `http://127.0.0.1:8765/web/preview/phase8-b-shell-preview.html`.
- Label DOM: 3 realm labels, 26 province labels, 26 prefecture labels, 26 point hints.
- Switching `天下 / 省道 / 府州` updated `#mapwrap[data-map-scale]` correctly.
- Console warnings/errors: 0.

Screenshots:

- `C:/Users/37814/AppData/Local/Temp/phase8-map-labels-realm-final.png`
- `C:/Users/37814/AppData/Local/Temp/phase8-map-labels-region-final.png`
- `C:/Users/37814/AppData/Local/Temp/phase8-map-labels-prefecture-final.png`

## Implementation Pass: Default Owner Mode

Implemented:

- Changed default map mode from `mood` to `owner`.
- Initial map layer chip state now selects `势力` and leaves `民情` unpressed.
- Initial legend now opens as `势力 · 地块所有者`.

Validation:

- `#mapwrap[data-map-mode]` is `owner` after page load.
- `.map-layer[data-map-mode="owner"]` has `aria-pressed="true"`.
- Court-owned region fill defaults to `#b94a32`; frontier-owned region fill defaults to `#2f806f`.
- Console warnings/errors: 0.

Screenshot:

- `C:/Users/37814/AppData/Local/Temp/phase8-map-default-owner.png`

## Implementation Pass: Pointer-Anchored Wheel Zoom

Implemented:

- Fixed the SVG map transform origin at the top-left of the map layer.
- Switched map transform writes to an explicit CSS matrix so pan/zoom math is unambiguous.
- Replaced fixed wheel zoom steps with a gentler continuous exponential zoom factor.
- Added a smoothed zoom target so wheel zoom eases toward the cursor point instead of snapping.
- Wheel zoom preserves the map point under the cursor before clamping to map bounds.

Validation:

- Browser target: `http://127.0.0.1:8765/web/preview/phase8-b-shell-preview.html`.
- Initial transform after load: `matrix(1, 0, 0, 1, 0, 0)`.
- Wheel zoom at left-side point `(420, 390)`: `matrix(1.14, 0, 0, 1.14, -47.37, -38.58)`.
- Wheel zoom at right-side point `(1000, 390)`: `matrix(1.14, 0, 0, 1.14, -128.57, -38.58)`.
- Three repeated wheel events at right-side point `(1000, 390)`: `matrix(1.4815, 0, 0, 1.4815, -442.23, -132.7)`.
- Console warnings/errors: 0.

Screenshot:

- `C:/Users/37814/AppData/Local/Temp/phase8-map-smooth-cursor-zoom.png`

## Sources

- EU4 map-mode reference: Paradox wiki mirror, `https://www.eu4cn.com/wiki/地图`.
- CK3 map feature reference: Paradox / Steam CK3 Dev Diary listing and external summaries of CK3 map modes, including GameWatcher `https://www.gamewatcher.com/news/crusader-kings-3-map`.
