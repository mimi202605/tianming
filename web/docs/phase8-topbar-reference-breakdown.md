# Phase 8 Topbar Reference Breakdown

Date: 2026-05-10

Scope: preview UI only. Formal game UI is not touched.

## Reference Crops

Reference crops used for the redesign:

- EU4: `web/docs/assets/topbar-breakdown/ref-eu4-topbar.png`
- CK3 in-game: `web/docs/assets/topbar-breakdown/ref-ck3-ingame-topbar.png`
- 历史模拟器：崇祯: `web/docs/assets/topbar-breakdown/ref-chongzhen-topbar.png`

Generated Tianming module underlays:

- Left identity module: `web/preview/img/topbar-left-identity-underlay-v1.png`
- Resource rail module: `web/preview/img/topbar-resource-underlay-v1.png`
- Right date module: `web/preview/img/topbar-right-date-underlay-v1.png`
- Right time module v2: `web/preview/img/topbar-right-time-underlay-v2.png`
- Applied v12 crop: `web/docs/assets/topbar-breakdown/applied-tianming-topbar-v12.png`
- Module sheet v12: `web/docs/assets/topbar-breakdown/topbar-reference-module-sheet-v12.png`
- Applied v14 field/time crop: `web/docs/assets/topbar-breakdown/applied-tianming-topbar-v14-fields-time.png`
- Module sheet v14 field/time: `web/docs/assets/topbar-breakdown/topbar-reference-module-sheet-v14-fields-time.png`
- Generated material strip: `web/preview/img/topbar-material-generated-v1.png`
- Exact resource rail v15:
  - `web/preview/img/topbar-resource-fieldrail-v2-wide.png` = 932x54
  - `web/preview/img/topbar-resource-fieldrail-v2-compact.png` = 706x50
  - `web/preview/img/topbar-resource-fieldrail-v2-narrow.png` = 626x50
- Exact right time rail v15:
  - `web/preview/img/topbar-right-fieldtime-v3-wide.png` = 340x52
  - `web/preview/img/topbar-right-fieldtime-v3-compact.png` = 282x48
  - `web/preview/img/topbar-right-fieldtime-v3-narrow.png` = 154x48
- Applied v15 exact field crop: `web/docs/assets/topbar-breakdown/applied-tianming-topbar-v15-exact-fields.png`
- Module sheet v15 exact field: `web/docs/assets/topbar-breakdown/topbar-reference-module-sheet-v15-exact-fields.png`

## Reference Observations

### Europa Universalis IV

- Structure: country identity at the left, then a continuous row of compact resources, then right-side date and game controls.
- Density: very high. The bar is thin and never becomes a decorative banner.
- Visual rule: icons and numbers carry the information; the frame only separates data.
- Useful for Tianming: resource values should be a continuous chain with tiny separators, not isolated large cards.

### Crusader Kings III

- Structure: top information is broken into small clusters. The map remains visually dominant.
- Density: medium-high. Important values are readable, but panel chrome is restrained.
- Visual rule: dark translucent strips, subtle metal highlights, minimal ornament.
- Useful for Tianming: use light texture and small highlights, not a full-width ornate generated image.

### 历史模拟器：崇祯

- Structure: left dynasty/era seal, compact Chinese stat row, right utility circles.
- Density: high. Chinese labels are small and close to the numbers.
- Visual rule: black ink/lacquer panel, muted gold text, minimal red/yellow warning accents.
- Useful for Tianming: Chinese serif/kaiti labels can stay small; the left identity block can be a seal plus season/weather.

## Tianming Mapping

- Left cluster: `问天` + season/weather. It replaces EU4 country shield and Chongzhen dynasty seal.
- Main resource chain: `帑廪`, `内帑`, `户口`, `吏治`, `民心`, `皇权`, `皇威`.
- Right cluster: `全部变量` + current scenario date.
- Generated images: only used as faint local texture or small module underlays. Text, numbers, trends, and state must stay in DOM.

## Module Design

### Module A: Left Identity

- Reference source: EU4 country shield + Chongzhen left dynasty seal.
- Tianming content: `问天`, season seal, season/weather text.
- Asset: `topbar-left-identity-underlay-v1.png`.
- Constraint: the generated image is an underlay only; `问天` and weather text remain live.

### Module B: Resource Rail

- Reference source: EU4 continuous resource row + Chongzhen compact Chinese stat string.
- Tianming content: treasury, inner treasury, population, administration, popular support, imperial authority, imperial awe.
- Asset: `topbar-resource-underlay-v1.png`.
- Constraint: the rail hugs the actual resources and does not stretch across empty topbar space.

### Module C: Right Date And Utility

- Reference source: EU4 right date/control area + CK3 compact right information cluster.
- Tianming content: `全部变量`, scenario date, year conversion.
- Asset: `topbar-right-date-underlay-v1.png`.
- Constraint: date text is live and ellipsized for long scenario calendars.

## Design Rules

- Topbar height target: 60-64px container, but only the modules are visible.
- No large full-width ornate frame and no full-height right rail.
- The map/desk should remain visible between left identity, resource rail, and right date/utility modules.
- Use one continuous resource rail, with each variable as a compact chip.
- Keep map first: topbar must not pull the eye more than the map or main action.
- Dynamic values must truncate safely instead of resizing the bar.

## v12 Applied Notes

- Topbar is now three floating modules: left identity, center resource rail, right date/utility.
- The full-width topbar background is removed. `#topbar` is an invisible hit-test container; child modules handle pointer events.
- The right sidebar is now a floating button stack instead of a full-height visual rail, matching the CK3 outliner idea more closely.
- Generated module images are used as underlays with live DOM text above them, so scenario/editor values can still change dynamically.

## v14 Field And Time Notes

- Resource fields now have their own live cell layout inside the generated resource rail: wide treasury cells use label + three stock slots; scalar fields use icon + compact label/value.
- Narrower preview widths hide secondary treasury deltas before truncating primary numbers, so values like `12,000` stay readable.
- The right date/utility area now uses `topbar-right-time-underlay-v2.png` as the module background, while `全部变量`, scenario date, and Gregorian year remain live DOM.

## v15 Exact Image Sizing Notes

- The rail artwork is now generated from field widths, not stretched from a generic equal-slot image.
- Wide resource rail uses seven slots: `212, 212, 104, 110, 82, 82, 82`, with 12px side padding and 4px gaps, total `932x54`.
- Compact resource rail uses `166, 166, 76, 82, 60, 60, 60`, with 9px side padding and 3px gaps, total `706x50`.
- Narrow resource rail uses `126, 126, 76, 82, 60, 60, 60`, with 9px side padding and 3px gaps, total `626x50`.
- The right time rail also has exact wide/compact/narrow images so the `全部变量` chip and date text sit inside their own drawn compartments.
- CSS variables in `phase8-b-shell-preview.html` define the same widths used by the generated PNGs. Update the variables and regenerate PNGs together if field composition changes.
