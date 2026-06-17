# Phase 5 P5-Theta Editor Implementation

Date: 2026-05-04
Owner: Codex
Scope: namespace facade only

## Decision

P5-theta groups the editor cluster under `TM.Editor` without moving implementation or changing HTML inline handlers.

Implemented sub-namespaces:

- `TM.Editor.core`
- `TM.Editor.crud`
- `TM.Editor.ai`
- `TM.Editor.forms`
- `TM.Editor.domain`
- `TM.Editor.schema`
- `TM.Editor.map`

## Boundaries

- `aiGenChr`, `aiGenFac`, `aiGenFullScenario`, and `execFullGen` stay owned by `TM.Office.legacy`.
- `TM.Editor.ai` covers editor AI helpers from `editor-ai-*`, form generation helpers, and editor-owned AI domain helpers.
- `editor-map.js` is exposed through `TM.Editor.map`.
- Runtime map APIs remain under `TM.Map`; standalone map editor HTML tools stay outside the 24 canonical namespace table.
- HTML inline `onclick` handlers remain window-compatible for Phase 5. Alias retirement is deferred to Phase 6.

## Verification

`scripts/smoke-p5-theta-editor.js` checks:

- all seven `TM.Editor.*` sub-namespaces exist and point at mocked public entrypoints;
- Office-owned AI entrypoints are not duplicated under `TM.Editor.ai`;
- `SchemaAdapter` has a setter-aware alias under `TM.Editor.schema.adapter`;
- runtime `TM.Map` still does not expose editor tools.

