# Phase 8 Map Legend Reference

Date: 2026-05-10

Scope: preview UI only. Formal game UI is not touched.

## Reference Assets

- EU4 / CK3 / 历史模拟器：崇祯 bottom-right reference crop sheet: `web/docs/assets/map-legend-reference-bottomright.png`
- Tianming v16 compact legend crop: `web/docs/assets/map-legend-v16-compact.png`
- Tianming v16 detail flyout crop: `web/docs/assets/map-legend-v16-detail.png`

## Reference Observations

- EU4 keeps map-mode controls near the lower/right map area and avoids a large always-on explanatory panel. Dense detail appears through tooltips or adjacent controls.
- CK3 keeps map mode and contextual details as compact bottom controls or temporary popups. The map remains visually dominant.
- 历史模拟器：崇祯 uses lighter paper/ink UI and lets large narrative panels appear only for commands or modal content, not as persistent map legends.

## Tianming v16 Rule

- Default legend is a compact strip: mode name, current scale, color ramp, and short owner/scale keys.
- Explanatory text, owner scenario, and test actions live in a flyout shown by hover/focus or the `详` button.
- The legend stays near the lower-right map controls and above the end-turn command, but no longer covers a large rectangular portion of the map by default.
