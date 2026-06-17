# Phase 5 P5-Eta Endturn Implementation

Date: 2026-05-04
Owner: Codex
Scope: narrow namespace facade only

## Decision

P5-eta keeps the end-turn pipeline mostly private. `TM.Endturn` only exposes stable public entrypoints that are already called from the UI or other runtime modules:

- `TM.Endturn.run.endTurn`
- `TM.Endturn.province.openProvinceEconomy`
- `TM.Endturn.province.openDivisionDetail`
- `TM.Endturn.qiaozhi.openQiaozhiPanel`
- `TM.Endturn.qiaozhi.doQiaozhi`
- `TM.Endturn.qiaozhi.restoreQiaozhiDivision`

## Explicit Non-Goals

- Do not namespace `tm-endturn-ai-infer.js` internals.
- Do not expose `_endTurn_aiInfer`, `_endTurnCore`, `_endTurn_updateSystems`, or render/system helpers.
- Do not expose province inline helpers such as `_peLijuanPick`, `_peLijuanClear`, or `_peTriggerCascadeNow`.
- Do not move diagnostics such as `TM.lastPromptTokens`; it remains a diagnostic field, not a public entrypoint.

## Verification

The new `scripts/smoke-p5-eta-endturn.js` gate checks both sides of the boundary:

- the six public entrypoints are available through `TM.Endturn`;
- AI and province internals remain unexposed;
- adjacent Phase 5 namespaces are still present.

