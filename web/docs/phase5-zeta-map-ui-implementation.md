# Phase 5 P5-zeta Map/UI Implementation

Date: 2026-05-04
Owner: Codex
Mode: namespace facade fill only; no alias retirement; no HTML inline rewrite.

## Scope

Implemented `tm-namespaces.js` R205 after reading Claude's prep audit
`docs/phase5-zeta-map-ui-audit.md`.

Map:
- Kept `TM.Map` as the R200 canonical alias of the existing R87 `TM.MapSystem` facade.
- Added `TM.Map.system = TM.MapSystem` as an explicit marker.
- Added public toolchain sub-facades: `converter`, `integration`, `display`, and `recognition`.
- Left map helper internals such as `_mapCfg`, `_miFindPath`, and flood-fill helpers outside the namespace.
- Left standalone map editor HTML tools outside `TM.Map`.

UI:
- Added shared infrastructure sub-facades only: `foundation`, `shell`, `topbar`, and `varDrawers`.
- Exposed `TM.UI.cheatsheet` as a getter/setter alias to `TM.cheatsheet`.
- Did not expose business panels under `TM.UI`.
- Kept `TM.Lizhi` as the existing R87 legacy facade instead of moving it under `TM.UI`.

## Files Changed

- `tm-namespaces.js`
- `scripts/smoke-p5-zeta-map-ui.js`
- `scripts/verify-all.js`

## Smoke Contract

`scripts/smoke-p5-zeta-map-ui.js` covers:
- `TM.Map === TM.MapSystem` and `TM.Map.system === TM.MapSystem`.
- Map converter/integration/display/recognition aliases.
- Internal map helpers remain unexposed.
- Standalone map editors stay outside `TM.Map`.
- UI foundation/shell/topbar/varDrawers aliases.
- `TM.UI.cheatsheet` getter/setter sync.
- Business panel facades such as `TM.UI.help`, `TM.UI.shizheng`, `TM.UI.renwu`, and `TM.UI.military` remain absent.
- Previous P5 namespaces still exist.

## Verification

Focused checks passed before full verification:

```text
node --check tm-namespaces.js
node --check scripts\smoke-p5-zeta-map-ui.js
node scripts\smoke-p5-zeta-map-ui.js
```

Focused smoke result:

```text
[smoke-p5-zeta-map-ui] pass assertions=47
```
