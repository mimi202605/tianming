# Phase 6 inline namespace implementation

Date: 2026-05-04
Owner: Codex
Scope: P6-beta `index.html` and P6-gamma `editor.html` safe first pass.

## Summary

This slice moves the safest HTML inline handlers from legacy global function calls to the Phase 5 namespace facades. It does not remove the old `window.*` aliases yet, and it does not widen namespace ownership for functions that were not already covered by P5 facades.

## index.html

Migrated to namespace calls:

- `TM.UI.topbar.openAllVarsModal()`
- `TM.UI.shell.openSideDrawer(...)` and `TM.UI.shell.closeSideDrawer(...)`
- `TM.UI.turnResult.closeTurnResult()`, `TM.UI.turnResult.navTurn(...)`, and `TM.UI.turnResult.exportCurrent()`
- `TM.Save.openManager()`
- `TM.UI.tabs.switchGameTab(...)`
- `TM.Endturn.run.confirmEndTurn()`

Intentionally left as legacy/global or standalone:

- `TM_Changelog.show()` is the changelog/edict notice bridge, not part of the current P5 namespace cleanup.
- `openWentian()` remains game-loop owned.
- `openTodoPanel()` has not been assigned to a stable namespace.
- `openShiji()` remains player-core owned.
- `openShizhengTasks()` remains the shizheng business panel entrypoint, not `TM.UI` infrastructure.

## editor.html

`editor.html` now loads `tm-namespaces.js` after the editor modules and default scenario so inline handlers can use `TM.Editor.*` facades.

The script tag uses `data-tm-no-auto-verify="1"` because the editor page does not load all main-game runtime modules. Manual `TM.namespaces.verify()` still works, but the page no longer emits main-game missing-namespace warnings during normal editor load.

Migrated safe calls to:

- `TM.Editor.core`: clone, full-gen modal open/close, quick test, save, generic modal close.
- `TM.Editor.ai`: AI generation modal open/close, generation execute, player faction/character generation, goal generation.
- `TM.Editor.forms`: goal entry add.
- `TM.Editor.domain`: fiscal/corruption config entrypoints and military refresh.
- `TM.Editor.crud`: trait selector modal.
- `TM.Editor.map`: map-system config updates.

Left as legacy/global:

- Top-level editor navigation/import/export/API settings/AI validation/polish functions that are not in the P5-theta facade.
- CRUD/render helpers that still need an ownership audit before being moved.
- Standalone embedded map editor functions and dynamic HTML snippets.

## Regression Gate

Added `scripts/smoke-p6-inline-namespaces.js` and wired it into `scripts/verify-all.js`.

The smoke locks:

- migrated `index.html` namespace callsites,
- migrated `editor.html` namespace callsites,
- absence of targeted old inline call patterns,
- editor script load order for `tm-namespaces.js`,
- editor no-auto-verify attribute.

Added optional `scripts/lint-namespace.js` and wired it into `scripts/verify-all.js`.

The lint locks:

- no active-code use of retired `TM.MapSystem` / `TM.Storage`,
- no regression to the targeted legacy `index.html` inline handlers,
- no regression to the targeted legacy `editor.html` inline handlers,
- presence of the canonical migrated callsites that define this Phase 6 slice.

## Verification

- `node --check tm-namespaces.js` passed.
- `node scripts\smoke-p5-zeta-map-ui.js` passed with 54 assertions.
- `node scripts\smoke-p5-eta-endturn.js` passed with 28 assertions.
- `node scripts\smoke-p5-theta-editor.js` passed with 54 assertions.
- `node scripts\smoke-p6-inline-namespaces.js` passed with 58 assertions.
- `node scripts\lint-namespace.js` passed (`files=224 rules=222987`).
- `node scripts\verify-all.js` passed all 49 checks; headless smoke stayed at `212 passed / 0 failed`.
