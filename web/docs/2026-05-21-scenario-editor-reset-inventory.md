# 2026-05-21 剧本编辑器重置清单

本文件记录“剧本编辑器全面重置升级”的第一段基线。当前阶段只做编辑器侧审计与安全网，不改正式游戏运行时。

## 当前入口

- 剧本编辑器入口：`web/editor.html`
- 编辑器状态对象：`scriptData`
- 核心初始化：`web/editor-core.js`
- 保存/导入/导出：`web/editor-fullgen.js`
- 正式剧本适配：`web/editor-schema-adapter.js`
- 行政区划与地块映射：`web/editor-administration.js`
- 地图编辑器桥接：`web/map-editor-to-game.js`

## 官方天启剧本基线

审计脚本读取的官方剧本：

`C:\Users\37814\Desktop\tianming\scenarios\天启七年·九月（官方）.json`

核心规模：

- 顶层字段：82
- 人物：203
- 势力：22
- 党派：7
- 阶层：9
- 变量：21
- 事件：64
- 行政体系分组：23
- 地图陆地区域：43
- 海洋区域：8

这意味着新版剧本编辑器不能只按当前可见面板重做，必须以官方剧本真实字段为上限。

## 当前编辑器面板

静态检测到的 `panel-section`：

`administration`, `buildingSystem`, `characters`, `civicTree`, `classes`, `economy`, `eraState`, `events`, `factions`, `goals`, `government`, `haremConfig`, `imperialEdicts`, `influenceGroups`, `items`, `kejuSystem`, `mapSystem`, `military`, `offendGroups`, `palaceSystem`, `parties`, `playerOverview`, `postSystem`, `rules`, `scriptInfo`, `techTree`, `timeline`, `titleSystem`, `variables`, `vassalSystem`, `worldSettings`

隐藏但存在的面板：

`economy`, `goals`, `kejuSystem`, `postSystem`, `timeline`, `titleSystem`

存在但侧栏不可达的面板：

`imperialEdicts`, `offendGroups`

## 当前未映射顶层字段

第一版覆盖映射中，官方剧本里还没有明确编辑器归属的顶层字段：

`active`, `cities`, `culturalWorks`, `dynastyPhaseHint`, `environmentConfig`, `families`, `globalRules`, `mechanicsConfig`, `opening`, `openingLetters`, `traitDefinitions`

这些不一定都是要做独立面板，但新版编辑器必须决定它们的归属、展示、导入导出策略。

## 已确认风险与处理状态

1. `desktop-autosave-raw-scriptData`

   手动保存/导出会走 `SchemaAdapter.exportScenario(scriptData)`，但桌面自动保存路径存在直接写 raw `scriptData` 的分支。重置前必须统一保存出口。

   状态：已在本阶段修复。`saveScript()`、`autoSave()`、`returnToMain()` 的桌面保存统一走 `_saveScenarioToDesktop()`，并由 `_exportScenarioForPersistence()` 先调用 `SchemaAdapter.exportScenario(scriptData)`。

2. `map-editor-link-split-brain`

   当前 `地图编辑器`入口一边直接 `window.open('map-editor.html')`，另一边 `editor-core.js` 还保留旧的 `panel-map/toggleMapEditor` 内嵌路径。新版需要明确为“独立地图编辑器 + 剧本编辑器导入绑定向导”。

   状态：已在本阶段断开旧行为。`editor-core.js` 不再为 `map-editor-link` 绑定第二个监听器，当前入口只保留 `editor.html` 中打开独立 `map-editor.html` 的路径。后续需要补的是“剧本编辑器导入/绑定向导”，不是恢复内嵌地图面板。

3. `unreachable-editor-panels`

   `imperialEdicts` 和 `offendGroups` 有面板但侧栏不可达。重置时要么纳入信息架构，要么明确废弃/迁移。

   状态：已在本阶段恢复入口。侧栏新增 `初始皇命` 和 `额外得罪群体` 两个入口，`editor-core.js` 也加入对应 renderer。

4. `stale-rendered-admin-dom`

   `editor.html` 内含大量行政区划预渲染 DOM，不只是空挂载点。新版应改为数据驱动渲染，避免静态 HTML 存旧状态。

## 已新增安全网

- `web/scripts/editor-reset-inventory.js`
- `web/scripts/smoke-editor-reset-inventory.js`

运行：

```powershell
cd C:\Users\37814\Desktop\tianming\web
node scripts\smoke-editor-reset-inventory.js
node scripts\editor-reset-inventory.js
```

当前 smoke 结果：17 条断言通过。

## 下一步建议

1. 建立字段覆盖表第二版：从顶层字段下钻到人物、势力、行政区划、地图、官制、财政、军事。
2. 明确新版信息架构：剧本总览、玩家/开局、人物谱系、势力外交、朝廷官制、行政地图、财政人口、军事边防、事件时间、规则机制、AI/模型要求。
3. 清理行政区划旧 DOM：把静态预渲染内容改为空挂载点，由 `editor-administration.js` 独占渲染。
4. 再开始 UI 重构：先做剧本编辑器 shell 和导航，后迁移各旧面板功能。

## 2026-05-21 Update

- Cleared the stale administration DOM in `web/editor.html`. The `admin-stats-details`, `adminTree`, and `mapping-list` nodes are now empty mounts owned by the administration renderers.
- The reset inventory smoke now has 18 assertions and fails if stale administration output, raw desktop `scriptData` saves, map-editor split-brain handlers, or unreachable panels return.
- Current `node scripts\editor-reset-inventory.js` result: `risks: (none)`.
- Full verification after this slice: `node scripts\verify-all.js` passed all 123 checks in 83.0s.
- Next reset step: build the second-generation coverage map for unmapped official fields before redesigning the scenario-editor shell.

## 2026-05-21 Blueprint Update

- Added a future reset blueprint to `web/scripts/editor-reset-inventory.js`.
- The blueprint assigns all 82 official Tianqi top-level keys across 9 future editor modules: scenario opening, people/lineages, factions/society, court institutions, admin/map, economy/population, military/frontier, events/chronicle, and rules/AI.
- Current-editor coverage and future blueprint coverage are deliberately separate. Current editor coverage still reports unmapped keys such as `families`, `openingLetters`, and `traitDefinitions`; the future blueprint reports `unassignedTopLevelKeys: []`.
- The blueprint also summarizes nested official fields. Character coverage now groups identity, family/kinship, office career, abilities/traits, AI persona, and resources/memory. Faction coverage groups identity, leadership, NPC strategy, diplomacy, economy/military, and succession/end conditions.
- Verification after this blueprint pass: `smoke-editor-reset-inventory` passed 27 assertions and full `node scripts\verify-all.js` passed all 123 checks in 84.5s.

## 2026-05-21/22 Reset Preview Implementation Updates

- Added `web/preview/scenario-editor-reset-preview.html` as the standalone reset-editor preview shell. It does not load formal-game runtime scripts.
- Added `web/scripts/build-scenario-editor-reset-data.js` and generated `web/preview/scenario-editor-reset-data.js` from the official Tianqi scenario plus the reset blueprint.
- Added `web/preview/scenario-editor-reset-app.js` as the functional editor layer: module switching, field/entity editing, entity search/add/duplicate/delete, local draft persistence, JSON import/export, validation, and reviewable AI draft application.
- Added specialist entity forms, typed templates, and batch normalization for common arrays such as characters, factions, events, families, parties, classes, and items.
- Added live dashboard bindings so counts and coverage cards read from the editable scenario state rather than only the static official snapshot.
- Added reference inspection and jump flows through `buildReferenceReport()` / `renderReferenceInspector()`, plus draft-vs-baseline diff and single-field revert through `buildScenarioDiff()` / `revertField()`.
- Added release preflight through `buildPreflightReport()` / `renderPreflightGate()` / `runPreflight()` / `preflightExport()`. Structural problems block export; official historical reference mismatches remain visible warnings so the baseline remains usable.

## 2026-05-22 Project Library Update

- Added a real local project library to the reset preview so the editor is no longer limited to one implicit browser draft. Creators can save, fork, load, delete, and export named scenario snapshots.
- Storage is split for scale: metadata remains in `localStorage`, while complete scenario bodies are persisted through IndexedDB. This was required because two full Tianqi-sized snapshots exceeded localStorage quota during browser verification.
- The runtime workbench now includes `data-panel="project-library"` with `project-library-list`, snapshot name input, save/fork buttons, and per-row load/export/delete controls.
- `saveProjectSnapshot()`, `loadProjectSnapshot()`, `deleteProjectSnapshot()`, and `exportProjectSnapshot()` are exposed on `window.TM_SCENARIO_EDITOR_RESET_APP` for automation and future integration. Exported project bundles use `format: "tianming-scenario-editor-reset-package"` and include metadata plus the full scenario.
- Regression smoke coverage now reaches 134 assertions. Browser/CDP artifacts include `web/preview/scenario-editor-reset-library-verify.png`.
- Full verification after this pass: `node web\scripts\verify-all.js` passed all 127 checks in 90.1s. `web/bundled-scenarios/.gitkeep` was added so the existing hot-update bundled scenario fetch path has a real directory target for `ref-check`.

## 2026-05-22 Package Import Update

- Added package import to the standalone reset preview so project-library export is now a real round trip instead of a one-way download.
- `normalizeProjectPackage()` accepts both reset-editor packages (`format: "tianming-scenario-editor-reset-package"`) and raw scenario JSON, then normalizes name/source/scenario metadata before storage.
- `importProjectPackage()` writes imported scenario bodies to IndexedDB, keeps `localStorage` metadata compact, and loads the imported package by default. It also supports `{ load: false }` for importing raw/reference packages into the library without interrupting the current working scenario.
- The project-library panel now has `project-package-import-input` and an `import-project-package` command button. The preview facade exposes both import helpers for later formal-editor integration.
- Browser verification artifact: `web/preview/scenario-editor-reset-package-import-verify.png`. Full verification after this pass: `node web\scripts\verify-all.js` passed all 127 checks in 174.6s.

## 2026-05-23 Undo/Redo Safety Update

- Rebuilt `web/preview/scenario-editor-reset-app.js` after a failed patch write emptied the file, then restored the standalone editor contract against smoke and browser checks.
- Added a snapshot-based edit history for the reset preview. Field saves, entity creation, duplication, deletion, draft acceptance, field revert, import, package load, and reset paths now record recoverable checkpoints through `recordHistory()`.
- Added `undoEdit()` and `redoEdit()` to the runtime facade, plus an edit-history panel and top-level undo/redo commands in `scenario-editor-reset-preview.html`.
- The browser regression covered scalar field undo/redo and character add undo/redo. The package import regression still loads imported projects while keeping full scenario bodies out of `localStorage`.
- Current verification: `node --check web\preview\scenario-editor-reset-app.js` passed; `node web\scripts\smoke-scenario-editor-reset-preview.js` passed 148 assertions; full `node web\scripts\verify-all.js` passed all 127 checks in 127.7s.

## 2026-05-23 Release Notes Update

- Added a release-notes workflow to the standalone reset preview.
- `buildReleaseNotes()` converts the current draft-vs-baseline diff and release preflight state into structured notes plus Markdown. It reports scenario identity, changed top-level fields, validation errors/warnings, pending AI drafts, and a checklist summary.
- Added `data-panel="release-notes"` with `release-notes-list`, refresh, and copy commands. This gives creators a readable review surface before export.
- `exportProjectSnapshot()` now embeds `releaseNotes: buildReleaseNotes()` in reset-editor project packages.
- Regression smoke coverage now includes release-note helpers, panel hooks, commands, facade exposure, and package embedding. Browser verification artifact: `web/preview/scenario-editor-reset-release-notes-verify.png`.

## 2026-05-23 Field Notes Update

- Added field-level creator notes to the reset preview as non-scenario metadata.
- `state.fieldNotes` stores notes keyed by top-level field name. `saveFieldNote()` updates or clears a note, writes the preview draft, and refreshes the note panel without mutating `state.scenario`.
- `renderFieldNotes()` adds a `data-panel="field-notes"` block beside the field editor with `field-note-text`, save, clear, and AI follow-up controls.
- Project snapshots, package export, package import, and snapshot loading now carry `fieldNotes` so creator notes can move with a working package.
- Regression smoke coverage now includes the field-note state, helper functions, panel hooks, commands, facade exposure, and package persistence. Browser verification artifact: `web/preview/scenario-editor-reset-field-notes-verify.png`.

## 2026-05-23 Missing Field Template Update

- Added missing-field scaffolding for partial imported scenarios.
- `inferMissingFieldTemplate()` derives a conservative editable skeleton for absent blueprint fields. It prefers empty arrays for list fields, map shells for map fields, object shells from official config samples, and scalar defaults for primitive fields.
- `createMissingField()` inserts the skeleton into `state.scenario`, records undo history, and refreshes the workspace.
- `renderFieldEditor()` now recognizes absent fields and shows a `data-editor-command="create-missing-field"` button with a preview of the skeleton.
- Regression smoke coverage now includes the template helper, create command, and facade exposure. Browser verification artifact: `web/preview/scenario-editor-reset-missing-field-verify.png`.

## 2026-05-23 Global Search Update

- Added a global search workbench panel to the standalone reset preview.
- `buildGlobalSearchIndex()` indexes top-level scenario fields, array entities, and nested object keys, while `runGlobalSearch()` ranks creator queries across names, ids, titles, factions, summaries, and raw JSON text.
- `jumpToSearchResult()` lets a result row switch the active module, field, and selected entity, making it possible to move from search directly into the existing editor/specialist/reference panels.
- The preview facade exposes `buildGlobalSearchIndex`, `runGlobalSearch`, and `jumpToSearchResult` for automated checks and future AI-assisted repair workflows.
- Regression smoke coverage now reaches 181 assertions. Browser verification artifact: `web/preview/scenario-editor-reset-global-search-verify.png`.
- Full verification after this slice: `node web\scripts\verify-all.js` passed all 127 checks in 108.4s. During the gate, `smoke-letter-intercept-react.js` was made deterministic and NPC follow-up letters were aligned to enter `traveling` before later arrival-stage intercept handling.

## 2026-05-23 AI Task Package Update

- Added an AI task package workbench to the reset preview.
- `buildAiTaskPackage()` creates a JSON-only prompt from the current module, selected field/entity, common schema, creator notes, and current data sample.
- `renderAiTaskWorkbench()` mounts `data-panel="ai-task-workbench"` with prompt, copy, response paste, and response-application controls.
- `applyAiTaskResponse()` parses pasted AI JSON into a review-required draft rather than mutating the scenario immediately. Array-field object responses target the currently selected entity, and `acceptDraft()` can now replace that entity in place.
- Regression smoke coverage now reaches 193 assertions. Browser verification artifact: `web/preview/scenario-editor-reset-ai-task-verify.png`.
- Full verification after this slice: `node web\scripts\verify-all.js` passed all 127 checks in 89.1s.

## 2026-05-23 Reference Repair Update

- Added a reference-repair workbench to the reset preview.
- `collectMissingReferences()` scans common character/faction reference fields and groups unresolved references with source counts.
- `createReferencePlaceholder()` generates placeholder characters or factions for broken references, selects the new row, and records the edit for undo/redo.
- The runtime workbench now includes `data-panel="reference-repair-workbench"` and `reference-repair-list`, with `create-reference-placeholder` buttons for every unresolved reference.
- Regression smoke coverage now reaches 201 assertions. Browser verification artifact: `web/preview/scenario-editor-reset-reference-repair-verify.png`.
- Full verification after this slice: `node scripts\verify-all.js` passed all 127 checks in 88.3s. The previously unreferenced `tm-keju-learning-traits.js` helper is now explicitly listed as dev-only so `find-orphans` reports 0 real orphan files.

## 2026-05-23 Bulk Data Workbench Update

- Added a bulk data workbench to make the reset preview practical for large list fields instead of only one-row-at-a-time editing.
- `parseBulkRows()` accepts JSON arrays, package-like row payloads, JSONL, CSV, and TSV. Header-based text imports are converted into objects and common values are lightly typed.
- `previewBulkImport()` creates a review report before writing anything. `applyBulkImport()` can merge by id/name, append as new rows, or replace the entire selected array field, and every application enters the existing undo/redo history.
- `exportBulkField()` exports the selected array field as `tianming-scenario-editor-bulk-field`, allowing partial table round trips for people, factions, events, or other large collections.
- The detail view now mounts `data-panel="bulk-data-workbench"` with `bulk-import-input`, `bulk-import-preview`, preview/apply/export commands, and facade helpers for automation.
- Regression smoke coverage now reaches 216 assertions. Browser/CDP verification artifact: `web/preview/scenario-editor-reset-bulk-import-verify.png`.
- Full verification after this slice: `node scripts\verify-all.js` passed all 127 checks in 99.6s.

## 2026-05-23 Coverage Inspector Update

- Added a coverage inspector for list/entity fields so creators can audit missing columns after AI generation, CSV import, or manual editing.
- `analyzeFieldCoverage()` builds a key-level report from the selected field's specialist schema and existing entity keys, reporting present/missing counts and row-level gaps.
- `fillMissingKeys()` scaffolds missing or blank keys without overwriting existing values. String placeholders use `待补`, while empty arrays count as present fields to avoid false gaps for relationship/list fields.
- The detail view now mounts `data-panel="coverage-inspector"` with `coverage-inspector-list`, meter rows, `fill-missing-keys`, and AI validation affordances.
- Regression smoke coverage now reaches 224 assertions. Browser/CDP verification artifact: `web/preview/scenario-editor-reset-coverage-verify.png`.
- Full verification after this slice: `node scripts\verify-all.js` passed all 127 checks in 97.4s.

## 2026-05-23 Old Editor Parity Audit Update

- Added a visible old-editor parity audit to the reset preview, so future reset work can be driven by actual old-editor capability groups instead of ad hoc memory.
- `OLD_EDITOR_FEATURES` tracks 21 capability groups from `editor.html`: script/player setup, characters, factions, relations, parties/classes/items, military, tech/civic, variables, rules/prompts, events/timeline, government, corruption/fiscal config, administration/map, AI generation/validation, import/export/save, quick preview, and API/model settings.
- `buildOldEditorParityReport()` returns covered/partial/missing counts and grouped rows. `renderEditorParityAudit()` mounts `data-panel="old-editor-parity"` with `old-editor-parity-list`, status badges, evidence/gap text, and one-click routing.
- `jumpParityTarget()` locates a parity row in the closest reset-preview module/field so partial gaps become actionable authoring work.
- Current parity baseline: 6 covered, 14 partial, 1 missing. The missing row is API/model settings, which should become a separate creator-environment panel rather than a hidden scenario-field mutation.
- The reset inventory blueprint now assigns the official `tinyi` top-level field to `courtInstitutions` beside `chaoyi`; `smoke-editor-reset-inventory` now asserts this to keep the 83 official top-level keys fully assigned.
- Regression smoke coverage now reaches 233 assertions. Browser/CDP verification artifact: `web/preview/scenario-editor-reset-parity-verify.png`.
- Full verification after this slice: `node scripts\verify-all.js` passed all 127 checks in 102.9s.

## 2026-05-25 Polymorphism + Official Scenarios Bundle

Audit driver: the editor previously assumed 天启-shape schemas everywhere. Loading the 绍宋 official scenario silently dropped data in five fields because shape detection was missing. Six P0 slices closed that gap and made the editor a real two-scenario baseline tool.

- **Slice 1 · `variables` polymorphism.** 天启 stores 21 flat variable objects in an array; 绍宋 stores `{base:[...], other:[...], formulas:[...]}` kinded buckets. The variable workbench now detects via `isKindedVariables(value)`, renders a per-bucket section grid for kinded shapes, and `saveVariableWorkbench` branches on the detected shape so saves never collapse the buckets. New helpers: `flattenKindedVariables`, `variableRowHtml`, `applyVariableRowEdits`. `addVariableRow(bucketName)` forwards the clicked bucket so kinded scenarios can grow each bucket independently. CSS for `.variable-bucket` added to the shell.
- **Slice 2 · `globalRules` polymorphism.** 天启 stores a single 447-char paragraph string; 绍宋 stores an array of 5 short rule strings. New predicate `isRuleListField(field, value)` is checked *before* the existing `isPromptWorkbenchField` and `isConfigWorkbenchField`, routing array-shaped `globalRules`/`rules` to a new `renderRuleListWorkbench` with `saveRuleListWorkbench` + `addRuleListRow`. Save preserves the array shape and drops trimmed-empty rows.
- **Slice 3 · `rules`/`rigidTriggers`/`timeline` polymorphism.** `rules` array form is covered by the Slice 2 rule-list workbench. `buildRigidTriggerPreview` now reports `shape: 'array' | 'object'`; `saveRigidTriggerWorkbench` and `addRigidTriggerRow` branch on that shape so an array-form scenario (绍宋) keeps the array on save (and writes `id` instead of relying on object keys), while an object-form scenario (天启) keeps its keyed map. `timeline` already had this branching in `collectTimelineWorkbenchRows` + `saveTimelineWorkbench`; smoke now asserts the branch so a future refactor cannot regress it.
- **Slice 4 · official scenario loader.** New `OFFICIAL_SCENARIOS` manifest declares `tianqi7` and `shaosong`. `loadOfficialScenario(id)` runs through `applyLoadedOfficialScenario`, which goes through the standard `loadScenario` path and records a history entry. Starter panel now shows an "官方剧本基线" section above "从模板新建", each entry one click away.
- **Slice 5 · scenario switcher in the top ribbon.** Replaced the static `.scenario-pill` with a real button that toggles a dropdown listing both official scenarios, the blank-skeleton template, and an "open the new-scenario panel" shortcut. The pill title/detail nodes now update via id selectors so `renderWorkspaceMeta` no longer clobbers the dropdown trigger. Click-away closes the dropdown.
- **Slice 6 · in-memory official scenarios bundle.** `scripts/build-official-scenarios-bundle.js` bakes both scenario JSONs (~4.7 MB combined) into `preview/official-scenarios-bundle.js`, exposing `window.TM_OFFICIAL_SCENARIOS`. The preview shell loads it eagerly so the loader works even when Electron's `webSecurity` blocks `file://` fetches. `loadOfficialScenario` prefers the in-memory bundle; fetch remains the fallback. The build script lives next to `build-scenario-editor-reset-data.js` and should be rerun whenever an official scenario file changes.

### Verification

- `smoke-scenario-editor-reset-preview` now passes 1045 assertions (was 998); new assertions are tagged `Slice 1..6`.
- `smoke-editor-reset-inventory` aligned to the in-flight inventory mapping that now owns `openingLetters`; assertion replaced with `culturalWorks` to keep the unmapped-coverage check honest without breaking the existing-but-now-mapped expectation.
- `node scripts/verify-all.js` reports `all 127 checks passed` after the bundle slice (106s total).

### Known polymorphism still on the editor backlog

- `eraState` has 0 shared keys between the two scenarios. Currently rendered by the generic config workbench, which is correct for round-trip but does not yet surface which vocab belongs to which scenario tradition. **(closed in Slice 7 below)**
- `adminHierarchy` shape support already exists via `collectTreeRows`/`firstTreeArrayContainer` recursion (天启 uses 23 sibling faction containers, 绍宋 uses one container with recursive `children[]`), but the tree workbench does not yet expose the bitmap/polygon binding cues that the standalone map editor uses.
- Field renames between scenarios (`liege` vs `lord`, `desc` vs `description`, `vassalType` vs `type`, `historicalEvents` vs `history`, `buildingTypes` vs `types`, `civil`/`military` vs `nodes`) are still handled per-form (existing fall-through code preserves the original key when writing). **(`desc`/`description`, `liege`/`lord`, `historicalEvents`/`history` closed in Slice 8; the remaining pairs use generic keys (`type`, `types`, `nodes`) that would over-trigger as a global alias.)**

## 2026-05-25 Slices 7-10 follow-on

- **Slice 7 · eraState dual-vocabulary workbench.** Both scenarios share only 4 keys on `eraState`; the rest is two disjoint vocabularies. New `renderEraStateWorkbench` groups fields into 共有 / 天启传统 / 绍宋传统 sections with range sliders for 0-1 indicators and text inputs for enums. `detectEraStateOrigin` infers which vocabulary is dominant and labels the workbench. Save preserves all keys including any extras that fall outside the known vocabularies.
- **Slice 8 · rename alias for specialist forms.** Added `ENTITY_FIELD_ALIASES` map and `resolveEntityKey(entity, key)` so a specialist form column rendered as `desc` will read+write the entity's existing `description` field instead of duplicating data. Coverage: `desc↔description`, `historicalEvents↔history`, `liege↔lord`. Generic pairs like `vassalType↔type` were intentionally skipped because `type` is too generic to alias globally. The specialist form shows a small `(实体里实际是 X)` hint when the alias is active, and `specialistSchema` skips the alias when the canonical name is already in the field list.
- **Slice 9 · round-trip integrity smoke.** New `smoke-scenario-editor-reset-roundtrip.js` (395 assertions) loads `official-scenarios-bundle.js` in a vm sandbox and replays the editor's polymorphism predicates against both scenarios — confirming `variables` shape detection, `globalRules`/`rules` list vs string routing, `rigidTriggers`/`timeline` array vs object branching, alias-pair presence in the field alias table, and JSON deep-key-digest equality after a serialize→parse round-trip. Added to `verify-all.js` so the full gate now runs **128 checks** instead of 127.
- **Slice 10 · dynamic blueprint enrichment.** The baked blueprint module's `topLevelKeys` is filtered by `buildResetBlueprint` against the source scenario (天启 keys only), so loading 绍宋 leaves 21 of its top-level keys orphaned from the module navigation. New `absorbOrphanScenarioKeys()` runs in `loadScenario` and folds each unassigned key into the module suggested by `RUNTIME_FIELD_SURFACES` (or `scenarioOpening` as the fallback). `state.orphanKeysAbsorbed` records the count so future status pills can surface a hint when a scenario brought extra fields.

### Cumulative verification (2026-05-25)

- `smoke-scenario-editor-reset-preview`: **1113 assertions** (baseline before this work: 998 → +115).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions** (new behavioural smoke).
- `node scripts/verify-all.js`: **128/128 checks passed** in ~125 s.
- Files touched in this session: `preview/scenario-editor-reset-app.js` (~+700 lines net), `preview/scenario-editor-reset-preview.html` (CSS for pill dropdown + era-state workbench + rule-list rows + variable buckets), `scripts/build-official-scenarios-bundle.js` (new), `scripts/smoke-scenario-editor-reset-preview.js`, `scripts/smoke-scenario-editor-reset-roundtrip.js` (new), `scripts/verify-all.js`, `preview/official-scenarios-bundle.js` (generated artifact). The legacy editor (`editor.html`, `editor*.js`, `editor-*.js`) is untouched throughout.

## 2026-05-25 Slices 11-15 follow-on

- **Slice 11 · build-script union for blueprint coverage.** `build-scenario-editor-reset-data.js` now reads `RESET_BLUEPRINT_MODULES` from the inventory script, computes the union of keys across all shipped scenarios (currently 天启 + 绍宋), and re-derives each module's `topLevelKeys` against that wider universe. The baked blueprint went from 83 to **104 assigned keys** in one pass, and `state.blueprint.unassignedTopLevelKeys` is now `[]` for both scenarios. The Slice 10 runtime orphan absorber stays in place as belt-and-suspenders for any future scenario that brings keys outside both shipped vocabularies.
- **Slice 12 · scenario provenance badges on field list.** Added `fieldProvenance(field)` which classifies any top-level key into `tianqi` / `shaosong` / `both` / `outside` based on the in-memory `TM_OFFICIAL_SCENARIOS` bundle. Each chip in the module detail's field cloud now carries a 12 px badge (`启 / 宋 / 共 / 外`) with a tooltip explaining the classification. Helps creators see at a glance whether a field is a 天启 inheritance, a 绍宋 import, or a shared baseline.
- **Slice 13 · context-aware `vassalType ↔ type` alias.** The pair is too generic to alias globally (events/items use `type` for unrelated concepts), so added `CONTEXT_FIELD_ALIASES` keyed on the *parent* top-level field (`vassalSystem`, `officialVassalMapping`). `resolveEntityKey(entity, key, parentField)` now consults the context map first, then the global alias map. `saveTreeWorkbench` also pins `vassalType` ahead of `type` in its meta-key chain so a 天启 vassal entry isn't silently moved from `vassalType` to `type` on save. Specialist forms and `setEntityProp` thread the parent-field context through so future schemas covering vassal containers automatically pick up the alias.
- **Slice 14 · official scenarios comparison panel.** New `[data-panel="official-comparison"]` block lets the creator pick any two of (当前草稿 / 天启 / 绍宋) and see a sortable field-level diff: same / shape-diff / value-diff / left-only / right-only. `buildOfficialComparison(leftId, rightId)` returns rows + summary; the panel includes a "互换" toggle and a "定位" button that jumps to the field in the editor. Each row also shows the field's provenance badge so the creator can see at a glance whether a left-only or right-only field is fundamental or just one tradition's quirk.
- **Slice 15 · runtime field census enrichment.** `buildRuntimeFieldAudit` now annotates each row with `inTianqi` / `inShaosong` flags and a derived `provenance` tag. The rendered row gains a `官方 启 / 宋 / 共 / 外` badge alongside the existing status/blueprint/source tags, so the creator can tell at a glance whether a missing runtime field is missing because they haven't filled it in yet, or because the original scenario tradition never declared it.

### Cumulative verification (after Slices 7-15)

- `smoke-scenario-editor-reset-preview`: **1160 assertions** (998 → +162 net this session).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions**.
- `node scripts/verify-all.js`: **128/128 checks passed**.
- Legacy `editor.html` / `editor*.js` files remain untouched per the standing constraint.

## 2026-05-25 Slices 16-18 follow-on

- **Slice 16 · apply-side buttons in the comparison panel.** Each comparison row now carries 采纳左 / 采纳右 buttons when the current draft is one of the two sides. Clicking imports the chosen scenario's field value into the draft (or deletes the field if the source side lacks it), with a history-entry tagged `剧本对照·采纳字段` / `剧本对照·删除字段` so undo/redo works as expected. The buttons only render on the non-draft side to avoid the meaningless self-copy case, and the handler refuses no-op cases with a status warning.
- **Slice 17 · adminHierarchy shape summary header.** Added `summarizeAdminHierarchy(value)` + `renderAdminHierarchySummary(value)`. The summary card lights up only when editing `adminHierarchy` and detects four paradigms: `flat-by-faction` (天启传统·多派系容器), `recursive-children-tree` (绍宋传统·单派递归), `single-flat`, `mixed`. Card shows faction count, root divisions, total nested nodes, max depth, and the top 5 most-populated faction containers. Color-coded per paradigm so the creator can see at a glance which paradigm they're editing.
- **Slice 18 · enriched specialist schemas.** The base schemas for characters/factions/families/parties/classes/items used to only declare 5-14 fields, leaving cross-tradition fields (天启's `haoName/persona/personalGoal`, 绍宋's `coreMotivations/redLines/displayName/isFictional`, family-tree depth fields like `currentHead/heir/ancestralSeat`) to the auto-append fallback — which is capped at 18 keys and order-dependent. The new schemas declare 20-30 fields per entity type covering both traditions, so the alias resolver visibly fires on `desc↔description` rows and every common authoring surface has a real form input instead of an unpredictable JSON tail.

### Cumulative verification (after Slices 7-18)

- `smoke-scenario-editor-reset-preview`: **1233 assertions** (998 → +235 net this session).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions**.
- `node scripts/verify-all.js`: **128/128 checks passed** in ~120 s.
- Eighteen P0/P1 slices shipped across this session, all behind local smoke gates. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-25 Slices 19-21 follow-on

- **Slice 19 · combo build-all script.** `scripts/build-scenario-editor-reset-all.js` refreshes both `preview/scenario-editor-reset-data.js` (baked baseline + widened blueprint) and `preview/official-scenarios-bundle.js` (in-memory loader for both official scenarios) in one command. Keeps the two artifacts in lockstep so a creator who updates a scenario file never sees a half-stale editor.
- **Slice 20 · batch apply buttons in comparison panel.** Slice 16 covered per-row 采纳; this adds a batch bar above the diff list with `采纳所有仅左 N / 采纳所有仅右 N / 采纳左侧形态 N / 采纳右侧形态 N / 采纳左侧值 N / 采纳右侧值 N` buttons. Each batch wraps a single history entry tagged `剧本对照·批量采纳` so undo reverses the whole batch in one click. Batches refuse to delete fields (single-row apply handles that case) — safer for migration workflows.
- **Slice 21 · module completeness indicator.** Each module tile in the rail now carries a 2 px progress bar showing `present / total` blueprint key coverage for the current scenario. Color-coded into four tones (empty / low / mid / full) — red gradient for empty, gold-to-jade for in-progress, jade-to-indigo for fully covered. The tile's count number changes from `N` to `N/total` so creators see both raw and ratio.

### Cumulative verification (after Slices 7-21)

- `smoke-scenario-editor-reset-preview`: **1260 assertions** (998 → +262 net this session).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions**.
- `node scripts/verify-all.js`: **128/128 checks passed** in ~100 s.
- **21 slices** shipped across this session. Legacy editor (`editor.html` + `editor*.js`) remains untouched. No git commits, no hot-update ships.

## 2026-05-25 Slices 22-24 follow-on

- **Slice 22 · adminHierarchy division deep-edit per row.** The tree workbench used to expose only `name / meta / desc` per node — adequate for tech tree leaves but a tiny fraction of an adminHierarchy division's 30+ scalar fields (governor, population, prosperity, terrain, taxLevel, fiscalDetail/economyBase metrics …). Added a per-row `深编 / 收起深编` toggle (`state.treeDeepPaths`) that expands an inline form rendering every primitive child key as an editable input plus a read-only hint for nested objects/arrays (those still belong to the JSON editor). `saveTreeDeepRow(path)` reads `[data-tree-deep-path][data-tree-deep-field]` inputs and writes back through `readTreeValue`, preserving the node's existing keys.
- **Slice 23 · AI prompt template per scenario tradition.** `buildAiTaskPackage` now prepends a tradition-aware context hint. `detectScenarioTradition(scenario)` weighs scenario.id, `_version` (v48 vs v1.6-D), dynasty (明/宋), variables shape (array vs kinded), globalRules shape (string vs array), and eraState origin to classify as `tianqi / shaosong / mixed / unknown`. `SCENARIO_TRADITION_HINTS` provides per-tradition guidance for the AI: vocabulary tilt (晚明党争/阉祸 vs 南渡靖康/三派) and expected data shapes for each polymorphic field. The payload object also carries `tradition` so downstream consumers can branch on it.
- **Slice 24 · events cross-scenario merge wizard.** New `[data-panel="events-merge-wizard"]` lets creators survey events from each official scenario, checkbox-select them, and merge into the current draft. Match key is `id:<event.id>` with a `name:<name>|<year>` fallback for legacy entries. Per-source group shows `可合并 / 已存在` counts and a "全选未合并" batch button; the toolbar tracks selection count and exposes "合并选中" + "清空选中". Each merged event gets `_mergedFrom: <sourceId>` provenance so creators can later trace which entries came from which scenario.

### Cumulative verification (after Slices 7-24)

- `smoke-scenario-editor-reset-preview`: **1304 assertions** (998 → +306 net this session).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions**.
- `node scripts/verify-all.js`: **128/128 checks passed** in ~120 s.
- **24 slices** shipped across this session, legacy editor still untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-25 Slices 25-27 follow-on

- **Slice 25 · keyboard shortcuts.** Added `handleKeydown` on `document`. Ctrl+S triggers the nearest `save-*` command (falls back to `saveSelectedField`). Ctrl+Z = undo; Ctrl+Y / Ctrl+Shift+Z = redo. Alt+← / Alt+→ navigate prev/next field within the current module (skips when focus is on an input). "/" focuses the entity search box. Esc closes the scenario pill dropdown. Input/textarea focus is detected so typing doesn't jump fields (but Ctrl+S/Z/Y still fire so a creator typing in a field can save without reaching for the mouse).
- **Slice 26 · field cloud filter by provenance + presence.** Long field clouds (the rulesAi module can show 13+ chips) gain a small filter bar with two selects: `来源 [全部 / 共 / 启 / 宋 / 外]` and `状态 [全部 / 已填写 / 待补]`. State persists in `state.fieldCloudFilter`. The count line shows `显示 X / Y` and a 重置筛选 button appears when filter is non-default. Lets creators triage which fields to fill next.
- **Slice 27 · status log panel.** `setStatus` now also pushes into a `state.statusLog` ring buffer (capacity 80). New `[data-panel="status-log"]` panel shows entries with timestamp + severity coloring (good / warn / error / info / neutral border tones). 清空日志 button resets the buffer. Most-recent-first ordering so the latest action is on top. The panel re-renders eagerly when `setStatus` fires, so creators can audit a session retroactively without leaving the editor.

### Cumulative verification (after Slices 7-27)

- `smoke-scenario-editor-reset-preview`: **1333 assertions** (998 → +335 net this session).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions**.
- `node scripts/verify-all.js`: **128/128 checks passed** in ~105 s.
- **27 slices** shipped across this session, all behind local smoke gates. Legacy editor (`editor.html` + `editor*.js`) remains untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-25 Slices 28-30 follow-on

- **Slice 28 · import file validation safety gate.** `importScenario` used to overwrite the working draft immediately upon JSON.parse success — a broken file would clobber unsaved edits. New `validateImportedScenario(parsed)` runs structural checks (must be object, sane shapes for characters/factions/events/variables/globalRules/adminHierarchy) and returns errors + warnings. Errors block the import and land in the status log; warnings annotate but don't block. The pending parse is stashed in `state.pendingImport` so the creator can call `forceImportScenario()` if they really mean to load a non-conforming file. `applyImportedScenario` extracts the common load/re-blueprint/orphan-absorb path so both normal and force-imports use it.
- **Slice 29 · collapsible module rail.** Added a `⇤ / ⇥` collapse button in the rail head. Collapsed state shrinks the rail to 52 px wide showing only the module glyph, persists to `localStorage` (`tm.scenarioEditorReset.railCollapsed.v1`), and restores on next load. Gives the detail area roughly +220 px of horizontal width — useful for the deep-edit grid which gets cramped at default rail width.
- **Slice 30 · division deep-edit grouped view.** Slice 22's flat field dump grew to 30+ inputs per division and became a wall of text. Added `DEEP_FORM_GROUPS` table classifying keys into 7 semantic buckets (identity / population / economy / fiscal / governance / carrying / description) by name pattern, with anything unclassified falling into 其他. Each section gets a colored left border + a header showing the group title + count. Same path-based save mechanism — only the layout changed.

### Cumulative verification (after Slices 7-30)

- `smoke-scenario-editor-reset-preview`: **1374 assertions** (998 → +376 net this session).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions**.
- `node scripts/verify-all.js`: **128/128 checks passed** in ~105 s.
- **30 slices** shipped across this session, all behind local smoke gates. Legacy editor untouched. No git commits, no hot-update ships.

## 2026-05-25 Slices 31-33 follow-on

- **Slice 31 · export validation safety gate.** Mirror of Slice 28. `exportScenario` now reuses `validateImportedScenario(state.scenario)` before triggering download. Errors stash the parse into `state.pendingExport` and surface in the status log; warnings pass through. `forceExportScenario()` is the escape hatch when a creator really means to ship a non-conforming file. Common download mechanics extracted into `performExportDownload(scenario, filename)` so both normal and forced exports share the path.
- **Slice 32 · tree workbench depth indentation.** `collectTreeRows` already returned `row.depth` (0-4 nesting), but the workbench rendered every row flat. Each row now sets `--tree-depth` and `data-tree-depth`, gets a depth-tier-colored left border (gold / jade / indigo / cinnabar / paper), and renders a small horizontal connector rail back to its parent indent line. Visual hierarchy is now obvious for officeTree, adminHierarchy children-trees, civicTree, techTree.
- **Slice 33 · AI call log panel.** New `[data-panel="ai-call-log"]` panel captures every `runAiJob` roundtrip into a 40-entry ring buffer with field / action / request char count / response char count / duration ms / status (draft/error/running). Color-coded by status (jade=draft, cinnabar=error, indigo=running). 清空日志 button resets the buffer. Lets creators audit token-equivalent traffic and trace failures without diving into devtools.

### Cumulative verification (after Slices 7-33)

- `smoke-scenario-editor-reset-preview`: **1403 assertions** (998 → +405 net this session).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions**.
- `node scripts/verify-all.js`: **128/128 checks passed** in ~98 s.
- **33 slices** shipped across this session, all behind local smoke gates. Legacy editor (`editor.html` + `editor*.js`) remains untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-25 Slices 34-36 follow-on

- **Slice 34 · field watch list.** Lets the creator pin up to 12 top-level fields across modules. Each field chip in the cloud grows a ☆ button; clicking toggles watched state and stars the chip. The right inspector's new `[data-panel="watch-list"]` panel renders the pinned list with provenance badges and a 跳转 button per row (with × to remove). State persists to `localStorage` (`tm.scenarioEditorReset.watchList.v1`). The field-pick click handler defers to inner star/AI button commands so clicking ☆ doesn't accidentally switch the selected field.
- **Slice 35 · history log panel.** `state.history` (chronological push log, capacity 80) was previously read-only behind the scenes. New `[data-panel="history-log"]` panel renders entries with timestamp, type, detail — color-coded into six kinds (save / merge / undo / delete / create / misc) by regex against the recorded `type` string. 清空日志 button resets the push log without affecting the undo stack. Distinct from `[data-panel="status-log"]` which captures `setStatus` UI flashes; this panel captures every persistent state mutation.
- **Slice 36 · granular AI batch helpers.** `queueModuleAiTasks` was an all-or-nothing batcher. New `queueModuleAiTasksFiltered(moduleId, filterId)` accepts `missing / present / watched / all` — `missing` only fields the scenario lacks, `present` re-polishes already-filled fields, `watched` intersects with the Slice 34 pin list. The AI task workbench gains a 批量入队 row with three buttons mapping to those filters. Dedupes against already-queued / running jobs.

### Cumulative verification (after Slices 7-36)

- `smoke-scenario-editor-reset-preview`: **1447 assertions** (998 → +449 net this session).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions**.
- `node scripts/verify-all.js`: **128/128 checks passed** in ~138 s.
- **36 slices** shipped across this session, all behind local smoke gates. Legacy editor (`editor.html` + `editor*.js`) remains untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-25 Slices 37-39 follow-on

- **Slice 37 · AI draft diff visualization.** `compareDraft` used to dump current and draft into two raw `<pre>` blocks. New `buildDraftDiff(current, drafted)` classifies the diff kind (`identical / lines / keys / array / fallback`) and renders structured row-level coloring: strings get line-level added/removed/same, objects get key-level changed/added/removed/same, arrays get index-by-index status for the first 12 entries with truncation notice. Far easier to spot what the AI actually changed before clicking 纳入.
- **Slice 38 · field chip multi-select mode.** Field cloud gains a 多选模式 toggle. When active, each chip shows a ☐/☑ checkbox; the filter bar grows action buttons: 全选可见 / 清空选择 / 送入 AI 队列 / 加入关注列表. The AI queue action dedupes against jobs already queued/running; the watch-list action respects the 12-item capacity. The field-pick click handler defers to inner star/AI/checkbox controls so clicking the checkbox doesn't accidentally switch the selected field.
- **Slice 39 · API preset switcher.** `tm.scenarioEditorReset.apiPresets.v1` localStorage key stores a named list of API configs. `readApiPresets` seeds with the current `tm_api`/`tm_api_image` as a "默认" preset on first read. The API settings panel gets a preset dropdown + 保存为新预设 input/button + 删除当前预设 (refuses when only one remains). `applyApiPreset(id)` updates both the active preset pointer and `state.apiSettings`, persists, and re-renders. Lets creators swap OpenAI / Anthropic / local LM Studio configs in one click.

### Cumulative verification (after Slices 7-39)

- `smoke-scenario-editor-reset-preview`: **1488 assertions** (998 → +490 net this session).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions**.
- `node scripts/verify-all.js`: **128/128 checks passed** in ~166 s.
- **39 slices** shipped across this session, all behind local smoke gates. Legacy editor (`editor.html` + `editor*.js`) remains untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-25 Slices 40-42 follow-on

- **Slice 40 · scenario metadata workbench.** `_adaptation` / `_buildStatus` / `mapRuntimeContract` previously hit only the generic config workbench or the JSON editor. Added a dispatch branch (`isMetadataField`) and a dedicated workbench with per-field schemas: typed inputs (text / textarea / boolean / comma-list) per the actual shape of each metadata object. Unrecognized keys land in an 额外键 section preserved verbatim so import roundtrip stays lossless.
- **Slice 41 · draft inline edit in diff view.** `renderDraft` used to dump `draft.value` into a read-only `<pre>`. For drafts still in `review-required` status the preview now renders an editable textarea + `保存草稿编辑` button. `saveDraftEdit(id)` parses the textarea (JSON for objects/arrays, raw text for string drafts), persists `draft.value`, stamps `editedAt`, and lets the creator click 纳入 with the tweaked content. Avoids the accept-then-edit roundtrip.
- **Slice 42 · events timeline bucket headers.** `buildEventTimelinePreview` already sorted entries by year / turn / undated buckets, but the rendered list was a flat 36-row scroll. Added bucket header insertion: 年份 N for dated rows, 回合 X-Y (chunked into tens) for turn-only rows, 待定时间 for everything else. Each header is a sticky-feeling section divider so a 60-event scenario stops looking like a wall of cards.

### Cumulative verification (after Slices 7-42)

- `smoke-scenario-editor-reset-preview`: **1513 assertions** (998 → +515 net this session).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions**.
- `node scripts/verify-all.js`: **128/128 checks passed** in ~172 s.
- **42 slices** shipped across this session, all behind local smoke gates. Legacy editor (`editor.html` + `editor*.js`) remains untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-25/26 Slices 43-45 follow-on

- **Slice 43 · draft batch operations.** `acceptAllDrafts(filterField?)` / `rejectAllDrafts(filterField?)` / `rejectDraft(id)` + a `queue-batch-bar` that appears in the queue panel when pending drafts > 1. Each draft row gets a 拒绝 button alongside 纳入 / 比对. Lets a creator clear a 12-draft queue in one click instead of 24.
- **Slice 44 · scenario quick-stats delta vs baseline.** `setLiveMetric(name, value, baseline)` now renders `N (+x)` / `N (-y)` / `N` and tags the metric node with `data-metric-delta="up/down/zero"` so CSS can color it green / red / gold. Wired for characters / factions / admin-systems / top-level-keys / map-regions. Creators see live progress against the imported baseline without leaving the hero card.
- **Slice 45 · AI fill-missing combo.** `aiFillAllMissing({ run })` walks every module, calls `queueModuleAiTasksFiltered('missing')` per module, optionally awaits `runAiQueue()`. AI desk panel gains two combo buttons: 补齐所有缺失字段（仅入队） and 补齐并运行. Status log records the entry-point so creators can audit a multi-module batch later.

### Cumulative verification (after Slices 7-45)

- `smoke-scenario-editor-reset-preview`: **1538 assertions** (998 → +540 net this session).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions**.
- `node scripts/verify-all.js`: **128/128 checks passed** in ~153 s.
- **45 slices** shipped across this session, all behind local smoke gates. Legacy editor (`editor.html` + `editor*.js`) remains untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-25/26 Slices 46-51 follow-on (backlog drain)

- **Slice 46 · scenario skeleton wizard.** New `[data-panel="scenario-wizard"]` panel with form fields (dynasty / era / startYear / startMonth / role / emperor / tradition). `buildWizardScenario(spec)` produces a shape-correct minimal scenario: 天启 style ⇒ array `variables`, string `globalRules`, flat-by-faction `adminHierarchy`; 绍宋 style ⇒ kinded `{base, other, formulas}` variables, array `globalRules`, recursive `children`-tree, plus `_adaptation` / `_buildStatus` / `openingHook` metadata stubs. `launchScenarioWizard` replaces the working draft + resets history. One-click from "向导生成" to a clean canvas matching either schema generation.
- **Slice 47 · adminHierarchy nested string arrays edit.** The division deep-edit form now includes an inline editor for `academies / tradeRoutes / recentDisasters / threats / religiousSites / leadingGentry` — each rendered as an add/delete row group. `addTreeDeepArrayRow(path, key)` appends a blank entry; `saveTreeDeepArrays(path)` writes back all groups under one path, dropping empty entries. Object/non-string nested keys still fall through to the JSON editor with the existing read-only hint.
- **Slice 48 · module rail drag reorder.** `tm.scenarioEditorReset.moduleOrder.v1` stores the user-preferred order. `applyModuleOrder()` re-parents tile DOM nodes at init; `wireModuleDragHandlers` attaches HTML5 dragstart/dragover/drop. Dropping a tile above/below its target inserts it at that position, persists, and surfaces a status hint. New ⟲ button in the rail head dispatches `reset-module-order` to restore the blueprint default.
- **Slice 49 · performance overlay.** `Ctrl+Shift+P` toggles a sticky top-right overlay (`#perf-overlay`) showing `渲染耗时 X ms · 累计 N 次`, serialized scenario size (B / KB / MB), pending draft count, queued AI job count. `renderAll` now wraps `renderAllInner` so it can time itself without touching every existing renderer. State persists across reloads via `tm.scenarioEditorReset.perfOverlay.v1`.
- **Slice 50 · scenario diff markdown export.** Comparison panel grows 导出 MD / 复制 MD buttons. `buildComparisonMarkdown(leftId, rightId)` builds a title + summary list + 4-column markdown table (field / status / left type-count / right type-count). Export downloads to `剧本对照-{leftId}-vs-{rightId}.md`; copy uses navigator.clipboard with a status fallback.
- **Slice 51 · collaborative share URL.** `copyShareUrl()` encodes the current scenario as URI-encoded base64 in `#scenario=...`. 6 MB payload cap protects against pasting a full 天启 scenario into a URL (creators get a "改用案卷包" warning). On init, `importScenarioFromHash()` decodes and runs through `validateImportedScenario` first — failed validation stashes into `pendingImport` exactly like file-import (Slice 28). New 链 icon in the top action bar.

### Cumulative verification (after Slices 7-51 · backlog fully drained)

- `smoke-scenario-editor-reset-preview`: **1594 assertions** (998 → +596 net this session).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions**.
- `node scripts/verify-all.js`: **128/128 checks passed** in ~218 s.
- **51 slices** shipped across this session, all behind local smoke gates. Legacy editor (`editor.html` + `editor*.js`) remains untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-26 Slices 52-55 follow-on (UI polish pass · ui-ux-pro-max audit)

After the 51-slice feature complete, the editor was audited against the ui-ux-pro-max skill's Quick Reference. Four polish slices closed the highest-impact gaps without touching any runtime logic.

- **Slice 52 · focus-visible ring discipline + active module accent.** The original CSS combined `:hover`, `.active` and `:focus-visible` into a single rule, so keyboard users could not tell which module was actually selected vs hover-bled. Decoupled `:focus-visible` for every primary surface (module-tile, mode-card, queue-card, shortcut-card, health-card, flow-step, ai-card, ai-button, mini-ai, module-ai, scenario-pill-menu-item, workbench-tab, rail-collapse-btn, drawer-close) with a `2px solid var(--gold-bright) + offset 2px` halo. Added `.module-tile.active::before` left accent bar (3px wide gold→jade gradient with `0 0 6px rgba(242,217,132,.45)` glow) and `inset 0 0 0 1px` ring so the selected module survives hover-state changes. Collapsed-rail variant uses a thinner 2px bar.
- **Slice 53 · tabular numerals on numeric chrome.** Live-updating digits (metric `b`, `.health-value`, `.module-count`, `.status-log-time`, `.ai-call-log-time`, `#perf-overlay span/strong`, `.workflow-summary strong`, `.production-score strong`, `.preflight-summary strong`, `.scenario-pill-menu-item-badge`, `.scenario-pill-detail`, `[data-live-metric]`) now use `font-variant-numeric: tabular-nums` with `font-feature-settings: "tnum" 1` fallback. Eliminates digit jitter when counters tick (visible during AI fill-missing batch runs).
- **Slice 54 · prefers-reduced-motion safety.** New `@media (prefers-reduced-motion: reduce)` block. Universal selector drops `animation-duration` and `transition-duration` to `0.01ms` and resets `scroll-behavior`. AI drawer skips its slide transform; scenario-pill chevron snaps directly to its rotated state when expanded; module-progress bar transitions disabled. Closes ui-ux-pro-max §1 `reduced-motion` requirement.
- **Slice 55 · top-actions icon-btn a11y labels.** The 10 runtime-rendered top icon buttons (新/退/复/预/验/入/出/回/归/链) carried only `title=`, leaving screen readers to announce a single Chinese character (e.g. "复") with no context. Added explicit `aria-label` per button describing the action (e.g. "重做上一步撤销"), promoted titles to surface keyboard shortcuts where applicable (`Ctrl+Z` / `Ctrl+Y`), and forced `type="button"` to defuse any future implicit-submit accidents. Static prototype 验/入/出 trio in the HTML body got the same treatment so the inert design reference matches runtime ARIA.

### Cumulative verification (after Slices 7-55 · UI polish pass complete)

- `smoke-scenario-editor-reset-preview`: **1615 assertions** (+21 polish assertions over the 1594 baseline).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions** (unchanged — polish is pure CSS/markup).
- `find-orphans` reports 1 真孤岛 (`web/tm-keju-fanyi.js`) — pre-existing from the 科举 sprint, NOT a regression from this polish pass.
- Polish slices touch only `web/preview/scenario-editor-reset-preview.html` (CSS + 3 static ARIA strings) and `web/preview/scenario-editor-reset-app.js` (bootstrapChrome icon-btn HTML). No runtime logic, no JSON schema, no `state` shape changes. Legacy editor untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-26 Slices 56-58 follow-on (UI polish pass · round 2)

Second polish wave focused on feedback visibility and discoverability of existing drag-to-reorder behavior.

- **Slice 56 · floating status toast.** `setStatus` previously updated only `#detail-status` (inspector header) and `#editor-live-status` (runtime panel header). When the creator was scrolled into a long comparison or audit panel, important feedback ("已采纳 5 个草稿", "校验失败") could fire entirely off-screen. New `pushStatusToast(text, tone)` lazily mounts a fixed top-right `#status-toast-host` container (z-index 1200, aria-live="polite", aria-atomic="false") and pushes a tone-colored pill per call. Cap = 3 visible; oldest drops first. Dwell time scales: 4 s for good/info/neutral, 6 s for warn/error. Enter/exit fade respects prefers-reduced-motion. No setStatus call-site changed.
- **Slice 58 · module-tile drag handle affordance.** Module rail is HTML5 drag-and-drop reorderable (Slice 48) but the only existing cue was `cursor: grab`, which new creators rarely discover. A 22×6 px grip indicator (two horizontal 1 px lines on a transparent strip) rides on `.module-tile::after`, faded by default, opacity → 1 on hover/`:focus-visible`/`[data-dragging="true"]`. Hidden when the rail is collapsed. Pure CSS — no JS, no behavior change. Coexists with the Slice 52 `::before` active-accent bar without overlap.

### Cumulative verification (after Slices 7-58 · UI polish round 2 complete)

- `smoke-scenario-editor-reset-preview`: **1629 assertions** (+14 polish assertions over the 1615 round-1 baseline).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions** (unchanged — round 2 is pure CSS + a single non-state-affecting JS helper).
- Polish round 2 touches only `web/preview/scenario-editor-reset-preview.html` (~75 lines new CSS) and `web/preview/scenario-editor-reset-app.js` (+60 lines for `pushStatusToast` / `ensureStatusToastHost` + one call-site addition inside `setStatus`). No state-shape changes, no scenario JSON changes, no smoke regression. Legacy editor untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-26 Slices 59-62 follow-on (UI polish pass · round 3 · 美化 + 制作便利)

Round 3 mixed pure visual polish with creator-workflow ergonomics, picked from the ui-ux-pro-max audit backlog.

- **Slice 59 · themed scrollbar styling.** Default white-gray browser scrollbars clashed with the ink-and-gold theme on every `overflow-y: auto` panel (status-log, ai-call-log, ai-drawer, comparison list, module-detail, runtime audit). Webkit + Firefox styling targets `.reset-shell *` and `.ai-drawer *`: 9 px track tinted ink (rgba 10,8,5,.42), thumb is a gold→jade linear gradient with a 2 px ink border for "thumbprint" feel, hover brightens to gold-bright. Scoped via ancestor selectors so the styling doesn't leak into other Tianming surfaces.
- **Slice 60 · Alt+1..Alt+9 module quick-jump.** Creators previously stepped through 9 modules via Alt+←/→ (Slice 25). Added direct numeric jumps that respect the user's persisted module order (Slice 48): reads DOM order from `#module-rail .module-tile[data-module-id]`, selects the Nth, picks its first top-level field, clears entity search, fires `setStatus('已跳转到第 N 章：…')`. `renderModuleTiles` also stamps `aria-keyshortcuts="Alt+N"` and a `title="<label> · Alt+N"` on the first 9 tiles so the shortcut is discoverable on hover.
- **Slice 61 · interactive card hover lift.** `.mode-card / .queue-card / .shortcut-card / .health-card / .ai-card` previously sat completely flat; creators couldn't see at a glance which surfaces were interactive. Now lifted by `translateY(-1px)` on hover with brighter border + extended box-shadow. Also reacts to `:focus-within` so keyboard tabbing through internal inputs lights up the parent card. Transform-only animation per ui-ux-pro-max §3 reduce-reflows + §7 transform-performance. Reduced-motion fully suppressed via the existing Slice 54 block.
- **Slice 62 · empty-state callouts on high-traffic panels.** Replaced `<p>暂无…</p>` placeholders on status-log / ai-call-log / project-library / validation with `.empty-state-card` markup: a 32 px tinted glyph anchor + bolded title + 1-line hint explaining what *should* appear. validation gets an indigo-keyed glyph (校验 = indigo signal), ai-call-log gets a jade glyph (AI = jade), the rest fall through to a default gold-keyed glyph. Helps a creator opening the editor for the first time orient themselves instead of staring at blank rows.

### Cumulative verification (after Slices 7-62 · UI polish round 3 complete)

- `smoke-scenario-editor-reset-preview`: **1649 assertions** (+20 over the 1629 round-2 baseline).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions** (unchanged — round 3 is pure CSS plus one keyboard handler + four empty-state markup swaps).
- Files touched: `web/preview/scenario-editor-reset-preview.html` (~115 new CSS lines for scrollbar + lift + empty-state), `web/preview/scenario-editor-reset-app.js` (+~30 lines for Alt+1..9 handler, `renderModuleTiles` ARIA stamping, 4 empty-state markup swaps). No state-shape changes, no scenario JSON changes. Legacy editor untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-26 Slices 63-66 follow-on (UI polish pass · round 4 · 美化深化)

Round 4 went deeper on visual identity: the glyphs, section heads, workbench tabs, and entity-search hotkey all got dedicated treatments instead of inheriting a generic gold-on-ink look.

- **Slice 63 · module glyph carved-seal elevation.** The 9 module glyphs (卷人势廷图户军史律) used to render as flat 32×32 boxes with a 1 px gold border. Now layered with a radial highlight at top-left (28% / 26%) + a 150° linear gradient base + inset top/bottom shadows + 0 1px 0 text-shadow — reads as a carved seal rather than a flat label. `.module-tile.active .module-glyph` brightens one notch with a 10 px gold halo; `.detail-title .module-glyph` (the 42×42 inspector glyph) inherits the same depth. Pure CSS, no markup change.
- **Slice 64 · section-head panel-type accent strip.** `.panel .section-head::before` ships a 3 px left strip color-keyed by the closest `[data-panel]` ancestor: gold default, jade for AI/creator panels (ai-desk, freedom-lab, generation-queue, creator-shortcuts, ai-coverage-matrix, ai-call-log), jade-soft for creator-workflow/scenario-wizard/new-scenario-starter, indigo for status-log/edit-history/runtime-editor, cinnabar for preflight-gate/validation. Helps creators identify panel categories at a glance when scrolling the main stack.
- **Slice 65 · workbench tab active underline indicator.** `.workbench-tab[data-active="true"]` used to only change border-color, reading as "hover" rather than "selected". Now a 2 px gold→jade gradient bar slides under the active tab via `::after` with a transform-only `scaleX` animation (0 → 1, .18s ease). Reduced-motion suppresses the transition. Clear visual signal that *this* tab is the current workbench.
- **Slice 66 · "/" search hint badge on entity-search input.** Slice 25 shipped a `/` hotkey that focuses `#entity-search` but the binding was invisible. Wrapped the input in `<span class="entity-search-host">` whose `::after` shows a tiny kbd-style "/" badge in the right inset; badge fades on `:focus-within` and when the host carries `data-has-value="true"` (set by the renderer when `state.search` is non-empty). Input also gained `aria-keyshortcuts="/"` + a placeholder hint "搜索名称、id、官职、势力 · 按 / 聚焦".

### Visual regression (playwright, real-browser render)

All 4 slices were verified with playwright captures stored under `output/playwright/`:
- `10-glyph-polish-rail.png` — carved-seal glyphs in the rail, active tile glyph brighter than non-active.
- `11-section-accent-aidesk.png` — jade left strip on AI 共创案台.
- `12-section-accent-statuslog.png` — indigo left strip on 状态日志.
- `13-workbench-tabs-underline.png` — gold→jade underline under the active 结构 tab, no underline on inactive tabs.
- `15-entity-search-slash.png` — "/" badge visible inside the entity-search input.

Computed-style + smoke verification:
- `smoke-scenario-editor-reset-preview`: **1668 assertions** (+19 over the 1649 round-3 baseline).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions** (unchanged).
- All polish CSS confirmed live via `getComputedStyle` of `::before` / `::after` content + computed scrollbar-color tokens.
- Files touched: `web/preview/scenario-editor-reset-preview.html` (~120 new CSS lines), `web/preview/scenario-editor-reset-app.js` (one entity-toolbar render edit). No state-shape changes, no scenario JSON changes. Legacy editor untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-26 Slices 68-70 follow-on (UI polish pass · round 5 · 制作便利深化)

Round 5 pushed creator ergonomics: a discoverable shortcut surface, a "gap" telegraph on the module rail, and a final hero identity touch.

- **Slice 68 · keyboard shortcut cheatsheet (Shift+?).** Creators had accumulated 11+ shortcuts (Ctrl+S/Z/Y, Alt+←/→, Alt+1..9, /, Ctrl+Shift+P, Esc) with zero UI surface. `Shift+?` toggles a centered modal listing every binding grouped into 4 categories (导航 / 编辑 / AI 校验 / 搜索 工具). Each entry styled as `<kbd>` chip + description. Built lazily via `ensureShortcutCheatsheetNode` on first toggle; subsequent toggles flip `dataset.active`. Esc + backdrop click + new 帮 icon-btn all dismiss. `SHORTCUT_GROUPS` table sits next to perf overlay code for cohesion. New top icon-btn 帮 carries `aria-keyshortcuts="Shift+?"` so screen readers announce the binding.
- **Slice 69 · module gap count badge.** Module tile previously showed `present/total` (e.g. "5/8") with a thin progress bar at the bottom, but didn't telegraph "this module has 6 fields to write". `renderModuleTiles` now derives `gaps = total - present` and (when > 0) inserts a `.module-gap-badge` element next to `.module-count` reading "·N待补". Tone flips to cinnabar (`data-gap-tone="high"`) when `gaps >= total/2` — at-a-glance signal of which modules are still mostly empty. Hidden when rail collapses. Badge also exposes `aria-label="缺失 N 个顶层字段"` for screen readers.
- **Slice 70 · hero board 印 watermark + sealed identity.** Hero board occupied ~258 px+ of premium real estate but felt visually generic next to the carved-seal glyphs (Slice 63). Added a large 240 px 印 character as `::before` in the bottom-right corner (rgba 7% opacity gold), `isolation: isolate` + `z-index: 1` on direct children stack the content above the watermark. Reinforces the seal-as-identity theme. Smaller variant (160 px) at narrow widths. Pure decorative pseudo-element — original `.hero-board::after` inner frame retained.

### Visual regression (playwright captures stored in `output/playwright/`)

- `17-rail-gap-badges.png` — module rail showing "·6待补", "·3待补", "·2待补", etc. badges next to counts (Slice 69).
- `20-hero-watermark-final.png` — hero board with the faded 印 watermark bleeding through the bottom-right (Slice 70).
- `21-cheatsheet-card.png` — full cheatsheet modal with 4 groups, kbd-styled chips, dismiss hint footer (Slice 68).

### Cumulative verification (after Slices 7-70 · UI polish round 5 complete)

- `smoke-scenario-editor-reset-preview`: **1692 assertions** (+24 over the 1668 round-4 baseline).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions** (unchanged).
- Files touched: `web/preview/scenario-editor-reset-preview.html` (~165 new CSS lines for cheatsheet + gap badge + watermark), `web/preview/scenario-editor-reset-app.js` (+~110 lines for `SHORTCUT_GROUPS` table + `toggleShortcutCheatsheet` + `ensureShortcutCheatsheetNode` + gap-badge inline in `renderModuleTiles` + 帮 icon-btn + 2 new command-router branches + Esc-precedence fix). No state-shape changes, no scenario JSON changes. Legacy editor untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-26 Slices 72-74 follow-on (UI polish pass · round 6 · 反馈可见性)

Round 6 focused on making invisible state visible: AI work in progress, autosave status, and top-action grouping.

- **Slice 72 · AI in-flight shimmer.** Queue rows already exposed `data-ai-job-status="<status>"` but visual styling was identical for queued/running/draft/failed. New CSS hooks paint each state distinctly: running rows pulse with a 1.6 s `ai-shimmer-sweep` keyframe sliding gold sheen left-to-right, queued rows pick up an indigo left strip via `::before`, failed rows wash cinnabar, draft rows get a jade border. Reduced-motion replaces the shimmer with a static jade tint so the row is still distinguishable. Closes ui-ux-pro-max §3 progressive-loading + §7 transform-performance.
- **Slice 73 · save indicator pill.** Persistent autosave was completely invisible — creators didn't know if their work was saved. Hooked `writeStoredDraft` to call `setSaveIndicator('saving')` on entry and `setSaveIndicator('saved', payload.savedAt)` on successful `localStorage.setItem`. Catch block surfaces `error` state. New CSS pill mounts inside `.brand-title`, role="status" + aria-live="polite". Tone shifts per `[data-save-state]`: gold pulse for saving, jade dot + "已保存 HH:MM:SS" for saved, cinnabar for error. Init seeds the indicator with the last savedAt from localStorage so the pill is visible immediately on load.
- **Slice 74 · top-action group dividers + 帮 jade accent + press scale.** 10 icon-btns ran together with uniform 8 px gap so creators couldn't tell which buttons belonged together. CSS-only divider pseudo-elements inserted before the three transition points: navigation (新 退 复) | validation (预 验) | i/o (入 出 回 归 链) | help (帮). 帮 button picks up a jade tint to mark it as the help group. All icon-btns gain `:active { transform: scale(0.96) }` for tactile press feedback. Reduced-motion suppresses the press scale.
- **Slice 69 fix-up.** The original gap-badge implementation in Slice 69 used grid-row positioning that squeezed `.module-name`'s sub-text. Reworked to absolute positioning in the bottom-right of each tile with a pill background + 1 px gold border + cinnabar variant. `.module-tile padding-bottom: 18px` reserves space above the module-progress bar.

### Visual regression (playwright captures stored in `output/playwright/`)

- `23-rail-gap-badges-v2.png` — gap badges now sit cleanly in the bottom-right of each tile, no sub-text collision (Slice 69 fix-up).
- `24-queue-shimmer.png` — running queue row with gold sheen sweeping across (Slice 72).
- `27-ribbon-with-save-indicator.png` — top ribbon showing brand + idle pill + grouped icons (Slice 73 + 74).
- `30-save-indicator-saved-forced.png` — jade dot + "已保存 · 13:42:18" (Slice 73 saved state).
- `31-save-indicator-saving-forced.png` — gold dot + "保存中…" (Slice 73 saving state).

### Cumulative verification (after Slices 7-74 · UI polish round 6 complete)

- `smoke-scenario-editor-reset-preview`: **1712 assertions** (+20 over the 1692 round-5 baseline).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions** (unchanged).
- Files touched: `web/preview/scenario-editor-reset-preview.html` (~150 new CSS lines — shimmer keyframes, save indicator pill, top-action dividers, gap-badge fix-up), `web/preview/scenario-editor-reset-app.js` (+~75 lines — `setSaveIndicator` / `renderSaveIndicator` / `saveIndicatorState` + `writeStoredDraft` hooks + init bootstrap). No state-shape changes, no scenario JSON changes. Legacy editor untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-26 Slices 76-78 follow-on (UI polish pass · round 7 · 可发现性 + 表单一致性)

Round 7 made the editor's form controls feel like part of the same ink-and-gold system and made cryptic field identifiers self-explanatory on hover. Also added a power-user vim-style navigation shortcut for entity lists.

- **Slice 76 · custom focus-visible for form controls.** Textareas, inputs, and selects previously fell back to the browser's default blue/gray focus ring, which clashed with the ink/gold theme and was inconsistent with the gold halo we already ship for buttons (Slice 52). New `:focus-visible` rule scoped to `.reset-shell` and `.ai-drawer`: `border-color: rgba(242,217,132,.88) + box-shadow: 0 0 0 2px rgba(242,217,132,.28) + inset 0 1px rgba(0,0,0,.32)`. Range slider thumbs get a dedicated `::-webkit-slider-thumb` rule with a 3 px gold ring. Reduced-motion suppresses the transition.
- **Slice 77 · field name dictionary tooltip.** Many top-level fields have terse identifiers (`_adaptation`, `_buildStatus`, `aiPersonaText`, `dynastyPhaseHint`, `mapRuntimeContract`, `vassalSystem`, ...) that don't read as Chinese descriptions. New `FIELD_DESCRIPTIONS` lookup ships ~70 entries mapping cryptic names to one-line Chinese explanations. `describeField(field)` exposes the lookup; field-chip render in `renderDetailApp` now attaches `title="{field} · {description}"` so creators get a hover tooltip explaining each field. Fields without an entry simply render `title="{field}"` (no schema mutation, fully optional).
- **Slice 78 · j/k vim navigation in entity grid.** Creators with 200+ characters / 22 factions / 64 events scrolled to fatigue. `j` (down) / `k` (up) now step `state.selectedEntityIndex` by ±1 within the current field's array, wrapping at bounds. Active when the user isn't typing into an input and the selected field is a non-empty array. `setStatus('已选中 N / total · field', 'neutral')` announces the position. The shortcut cheatsheet's 导航 group now lists `j / k` so the binding is discoverable.

### Visual + behavioral regression (playwright)

- `32-textarea-focus-halo.png` — global AI prompt textarea showing the new 2 px gold halo on `:focus-visible` (Slice 76).
- Programmatic checks: first field-chip carries `title="characters · 人物库 · 全部 NPC 与玩家可扮演角色"` (Slice 77 dictionary lookup confirmed). After pressing `j` twice on the characters list, `state.selectedEntityIndex` advanced from 0 → 2 (Slice 78 step navigation confirmed).

### Cumulative verification (after Slices 7-78 · UI polish round 7 complete)

- `smoke-scenario-editor-reset-preview`: **1729 assertions** (+17 over the 1712 round-6 baseline).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions** (unchanged).
- Files touched: `web/preview/scenario-editor-reset-preview.html` (~30 new CSS lines for focus-visible rules), `web/preview/scenario-editor-reset-app.js` (+~95 lines for `FIELD_DESCRIPTIONS` + `describeField` + j/k keydown branch + chip title wiring + cheatsheet entry). No state-shape changes, no scenario JSON changes. Legacy editor untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-26 Slices 80-82 follow-on (UI polish pass · round 8 · a11y + 一致性)

Round 8 closed three outstanding gaps: the editor had no keyboard skip link, the module tiles didn't share the card hover lift treatment, and the inspector's section head disappeared off-screen when scrolling deep.

- **Slice 80 · skip-to-main-content link.** Keyboard / screen-reader users previously had to Tab past the entire top ribbon + 10-button action bar + 9-tile module rail (~30 stops) before reaching the inspector. New `<a class="skip-to-main" href="#editor-grid">跳到正文</a>` anchor at the very top of `<body>` rests off-screen via `translateY(-110%)`, slides into the top-left on `:focus-visible`. Gold border + ink-glass background + gold halo (Slice 52 cascade applies). Closes ui-ux-pro-max §1 skip-links rule.
- **Slice 81 · module-tile hover lift parity.** `.mode-card / .queue-card / .shortcut-card / .health-card / .ai-card` all got the translateY(-1px) hover lift in Slice 61, but `.module-tile` was left out — it only flipped border-color and background, breaking the visual family. Added matching `transform: translateY(-1px) + box-shadow: 0 6px 16px rgba(0,0,0,.32)` on `.module-tile:hover:not(.active)`. Active tiles keep the Slice 52 inset glow (no double-stacked lift). Reduced-motion safe.
- **Slice 82 · inspector .section-head sticky on scroll.** The inspector right column accumulates a long field cloud + workbench tabs + 4+ detail blocks; scrolling deep made creators lose track of which panel they were in. `.inspector .section-head { position: sticky; top: 0; z-index: 5 }` plus a backdrop-filter blur and box-shadow on hover state (always-on since sticky doesn't have a "stuck" pseudo-class — the shadow simply tells the head from the content). Scoped to `.inspector` so main-stack panel headers stay non-sticky and preserve vertical rhythm.

### Visual regression (playwright captures stored in `output/playwright/`)

- `33-skip-link-visible.png` — skip link slid into top-left on focus, gold halo from Slice 52 cascade visible (Slice 80).
- `34-module-tile-hover-lift.png` — non-active tile hovered with extended shadow lift (Slice 81).
- `35-inspector-sticky-head.png` — "案卷详情" header stays at top while field-cloud scrolls below with backdrop blur (Slice 82).

### Cumulative verification (after Slices 7-82 · UI polish round 8 complete)

- `smoke-scenario-editor-reset-preview`: **1738 assertions** (+9 over the 1729 round-7 baseline).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions** (unchanged).
- Files touched: `web/preview/scenario-editor-reset-preview.html` (~75 new CSS lines + one skip-link anchor in `<body>`). No JS changes this round. No state-shape changes, no scenario JSON changes. Legacy editor untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-26 Slices 84-85 follow-on (UI polish pass · round 9 · 工作台密度可控)

Round 9 gave creators direct control over the editor's information density — fold panels they don't need, narrow the field cloud by name.

- **Slice 84 · per-panel collapse toggle with persistence.** Main-stack accumulates 13+ panels (`ai-desk` / `freedom-lab` / `health-panel` / `flow-panel` / `generation-queue` / `creator-shortcuts` / `ai-coverage-matrix` / `runtime-editor` / `status-log` / `ai-call-log` / `edit-history` / `scenario-wizard` / `official-comparison`) and creators saw them all every load. New `applyPanelCollapseState()` walks every `.panel[data-panel]`, ensures a `.panel-collapse-toggle` button sits in `.section-head`, and flips `data-panel-collapsed` based on the persisted state. CSS `.panel[data-panel-collapsed="true"] > *:not(.section-head) { display: none }` hides everything except the header. State persists in `tm.scenarioEditorReset.panelCollapse.v1` keyed by `[data-panel]`. `renderAll` reapplies the collapse state after every render pass so the panels stay folded across re-renders.
- **Slice 85 · field-cloud quick filter input.** `field-cloud-filter` already exposed provenance + presence selects (Slice 26). When a module has 24+ top-level fields the chip cloud is hard to scan. Added a third control — `<input type="search" data-field-filter="text">` — that lowercase-substring-matches against both the field identifier AND its Chinese description (Slice 77 dictionary). So creators can type `ai`, `keju`, `国库`, `config`, etc. and the cloud narrows live as they type. Input handler re-renders `detailApp` then restores focus + caret position. `reset-field-filter` command clears the text field too.

### Visual regression (playwright captures stored in `output/playwright/`)

- `36-panel-with-collapse-button.png` — AI 共创案台 panel with new 收起 button in section-head.
- `37-panel-collapsed.png` — same panel folded to just the title bar (Slice 84).
- `40-filter-with-text-input.png` — field-cloud filter with new 搜字段 input + "ai" query narrowing 30 → 2 visible fields (Slice 85).

### Cumulative verification (after Slices 7-85 · UI polish round 9 complete)

- `smoke-scenario-editor-reset-preview`: **1753 assertions** (+15 over the 1738 round-8 baseline).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions** (unchanged).
- Files touched: `web/preview/scenario-editor-reset-preview.html` (~55 new CSS lines), `web/preview/scenario-editor-reset-app.js` (+~80 lines — `PANEL_COLLAPSE_KEY` / `applyPanelCollapseState` / `togglePanelCollapse` / `renderAll` hook / 1 new router branch · `state.fieldCloudFilter.text` plumbing in `renderDetailApp` + input handler + reset path · CSS markup in filter row). No state-shape changes, no scenario JSON changes. Legacy editor untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-26 Slices 86-89 follow-on (round 10 · AI 智能生成升级 + UI 配套)

Round 10 turned the AI 共创案台 from a static prototype into a functioning multi-layered prompt builder. Three of the four slices touch creator-facing UI; all four feed into `buildAiTaskPackage`.

- **Slice 86 · wire #global-ai-prompt into AI dispatch.** The global prompt textarea was a dead UI element — creators could type into it but the value never reached `buildAiTaskPackage`. Now reads `state.globalAiPrompt` (persisted to `tm.scenarioEditorReset.globalAiPrompt.v1`) and prepends `本次会话总指令（创作者填写）：…` as a labeled block in every per-field prompt. Empty session prompts fall through silently. Survives reload via localStorage.
- **Slice 87 · AI prompt template dropdown.** New `<select id="global-ai-prompt-template">` rendered next to the `总指令` label. `AI_PROMPT_TEMPLATES` ships 10 starters (`late-ming` / `liaodong` / `song-southern` / `faction-matrix` / `opening-letters` / `timeline-audit` / `npc-policy` / `admin-binding` / `event-chain` plus the placeholder). Selecting one fills the textarea with a thematic Chinese starter, persists to state + localStorage, fires `setStatus('已套用提示词模板：…', 'good')`, refreshes the cost badge.
- **Slice 88 · AI cost / token estimate badge.** New `#ai-prompt-cost-badge` pill inline with the action-button row. `estimateAiTokenCount(text)` uses a 1 char ≈ 1 token / 1.4 chars per Chinese-token heuristic. Badge color shifts by weight (`empty` / `light` ≤ 200 / `medium` ≤ 800 / `heavy` > 800) via `[data-cost-state]`. Refreshes on every textarea input event, on template change, and at init.
- **Slice 89 · module-aware AI strategy hints.** New `MODULE_AI_STRATEGY` lookup with per-module-id discipline lines for all 9 modules (e.g. `peopleLineages: '人物条目保持字号、生卒年、谥号与正史一致；自创人物标注虚构；家族节点要标父子/师徒关系；aiPersonaText 用 60-180 字'`). `buildAiTaskPackage` injects the active module's hint as a `模块策略：…` block before the field-specific instructions. Pure prompt enrichment — no UI surface — but it raises the floor on every per-module AI call.

### Behavioral verification

After clicking the `保持晚明史实风格` template:
- `state.globalAiPrompt` filled with `"基调：晚明天启七年，宦官当国、辽事危急、东林清议；风格冷峻克制、内含党争伏笔..."`.
- `buildAiTaskPackage('characters', { persist: false })` returned a package with:
  - `sessionPromptHead = "基调：晚明天启七年..."` (the template body, Slice 86)
  - `moduleStrategyHead = "人物条目保持字号、生卒年、谥号与正史一致..."` (peopleLineages strategy, Slice 89)
  - `pkg.prompt` containing both `'本次会话总指令'` and `'模块策略'` labeled blocks
- Cost badge shows `约 42 tokens / 次调用` with `[data-cost-state="light"]` styling.

### Visual regression (playwright captures stored in `output/playwright/`)

- `42-ai-prompt-after-template.png` — AI 共创案台 prompt box showing the template dropdown (`保持晚明史实风格` selected), the auto-filled textarea, and the cost badge reading `约 42 tokens / 次调用`.

### Cumulative verification (after Slices 7-89 · round 10 complete)

- `smoke-scenario-editor-reset-preview`: **1776 assertions** (+23 over the 1753 round-9 baseline).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions** (unchanged — no JSON/state-shape changes).
- Files touched: `web/preview/scenario-editor-reset-preview.html` (~75 new CSS lines + 4 prompt-row markup additions: head row, select, cost badge), `web/preview/scenario-editor-reset-app.js` (+~150 lines — `MODULE_AI_STRATEGY` + `AI_PROMPT_TEMPLATES` tables, `sessionPrompt` + `moduleStrategy` plumbing into buildAiTaskPackage, `AI_PROMPT_KEY` + `readStoredGlobalPrompt` + `writeStoredGlobalPrompt`, `estimateAiTokenCount` + `refreshAiPromptCostBadge` + `bootstrapAiPromptControls`). Legacy editor untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-26 Slices 91-93 follow-on (round 11 · AI 智能生成深化)

Round 11 layered three more AI-quality improvements on the foundation built in round 10. Every AI dispatch now knows *what mode it's in* (Slice 91), uses a proper *system role* (Slice 92), and creators can *replay recent prompts* (Slice 93).

- **Slice 91 · action-aware prompt suffix.** Each AI button (生成 / 润色 / 校验 / 拆解 / 批量 / 补字段 / 重生 / 比对差异 / 标注来源 / 从地图反推 / 从旧 UI 迁移 / 纳入草稿 / 比对草稿) previously fed identical prompts — the AI couldn't tell which mode it was in. `AI_ACTION_INSTRUCTIONS` ships a single Chinese discipline line per action; `buildAiTaskPackage(field, { action })` injects a `当前操作：{label} — {instruction}` block right after the module strategy block. The task package now also exposes `pkg.action` + `pkg.actionInstruction` for downstream renderers.
- **Slice 92 · system / user prompt split.** Promptlines previously jammed the system preamble + user request + data into one block. Now: `DEFAULT_AI_SYSTEM_PROMPT` ships a 5-rule system message; `state.aiSystemPromptOverride` can override it; the task package exposes `pkg.systemPrompt` + `pkg.userPrompt` separately. `buildAiRequestPayload` prefers the split form when present (passes `systemPrompt` as `role: system`, `userPrompt` as `role: user`) and falls back to legacy `pkg.prompt` only for callers that haven't migrated. Legacy `pkg.prompt` is still built as `systemPrompt + '\n\n' + userPromptLines` so nothing breaks.
- **Slice 93 · recent prompt history dropdown.** `AI_PROMPT_HISTORY_KEY` persists last 5 distinct `globalAiPrompt` values (whitespace-collapsed for de-dup). New `<select id="global-ai-prompt-history">` rides alongside the template select inside `.ai-prompt-head-controls`. Textarea `blur` + template `change` both record into history. Selecting a history entry fills the textarea + announces via `setStatus`. Empty history shows a disabled "— 暂无历史 —" option styled via `select:disabled` CSS.

### Behavioral verification

After picking the `opening-letters` template, typing a custom variation `"为开场补一封宦官视角的密札，180字，提到辽东军饷拖欠。"`, blurring, then calling `buildAiTaskPackage('characters', { persist: false, action: 'polish' })`:
- `pkg.action = "polish"` and `pkg.actionInstruction` starts with `"润色文风 — 仅调整语言、修辞、节奏；不可更改事实..."` (Slice 91).
- `pkg.systemPrompt` starts with `"你是《天命》剧本编辑器的协作作者。严格遵守：1. 输出只包含合法 JSON，..."` and `pkg.userPrompt` is a separate string (Slice 92).
- `pkg.userPrompt` contains both `"当前操作：润色文风"` (Slice 91 injection) and `"本次会话总指令"` (Slice 86 session prompt still flows through).
- History dropdown was already disabled with "— 暂无历史 —" placeholder at fresh start; would populate after the blur captures the custom variation.

### Visual regression

- `43-ai-prompt-head-twin-selects.png` — AI 共创案台 prompt head now shows `总指令` label + template select (`— 选择一个起点 —`) + history select (`— 暂无历史 —` disabled, dimmed) laid out side-by-side.

### Cumulative verification (after Slices 7-93 · round 11 complete)

- `smoke-scenario-editor-reset-preview`: **1796 assertions** (+20 over the 1776 round-10 baseline).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions** (unchanged — no JSON/state-shape changes).
- Files touched: `web/preview/scenario-editor-reset-preview.html` (~25 new CSS lines + 1 markup wrap + 1 select element), `web/preview/scenario-editor-reset-app.js` (+~140 lines — `AI_ACTION_INSTRUCTIONS` + `DEFAULT_AI_SYSTEM_PROMPT` tables, action / systemPrompt / userPrompt plumbing into buildAiTaskPackage, `AI_PROMPT_HISTORY_KEY` + history ring buffer + dropdown wiring + blur hook, buildAiRequestPayload prefers split fields). Legacy editor untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-26 Slices 95-97 follow-on (round 12 · de-preview + 英文标题汉化)

Round 12 strips the lingering "重构预览" / "可制作预览" framing so the surface reads as the production scenario editor (Slice 95), translates the 23 English blueprint titles still bleeding through the module rail and field-group headers (Slice 96), and lands the verification gate (Slice 97). Constraint preserved per latest user directive: 依旧不动旧编辑器.

- **Slice 95 · de-preview the editor surface.** `<title>剧本工坊重构预览 · 天命</title>` → `<title>天命 · 剧本工坊</title>`; brand-mark sub: `剧本工坊重构预览 · 可制作预览` → `剧本工坊 · 历史模拟剧本总控台`; hero kicker `Scenario Authoring Desk` → `剧本工坊总控台`; hero h2 dropped the `从旧侧栏表单，升级为...` framing in favor of a clean `可校验、可追踪、可导出的历史模拟剧本总控台。`; hero copy + bottom-note rewritten to drop "预览页" wording. Runtime brandSub mirror at `scenario-editor-reset-app.js:~10599` now uses `state.dirty ? '剧本工坊 · 本地草稿制作中' : '剧本工坊 · 历史模拟剧本总控台'` (was `… 重构预览 · 草稿编辑中` / `… 重构预览`).
- **Slice 96 · 23 English titles → 中文.** `web/scripts/editor-reset-inventory.js` is the source of truth for module + field-group titles; the baked `web/preview/scenario-editor-reset-data.js` is regenerated from it. Three sections rewritten: 9 `RESET_BLUEPRINT_MODULES` titles (e.g. `Scenario opening and player setup` → `剧本总览与玩家开局`, `Characters, portraits, families & traits` → `人物、立绘、家族与特质`, `Factions, parties, classes & diplomacy` → `势力、党派、阶层与外交`), 6 `CHARACTER_FIELD_GROUPS` titles, 6 `FACTION_FIELD_GROUPS` titles, 2 `ADMIN_FIELD_GROUPS` titles. Then `node web/scripts/build-scenario-editor-reset-all.js` regenerated `scenario-editor-reset-data.js` (~55k lines) — verified zero English titles remain in baked output (the 3 `VOC …` strings at line 54605+ are Dutch East India officer names inside scenario data, intentionally left alone). `official-scenarios-bundle.js` regenerated as part of the same build (4.7 MB).
- **Slice 97 · smoke + roundtrip + inventory MD (this round).** Added 18 new assertions to `smoke-scenario-editor-reset-preview.js` verifying: page title is `天命 · 剧本工坊` (no `重构预览`), the strings `剧本工坊重构预览` / `可制作预览` / `Scenario Authoring Desk` / `从旧侧栏表单` are gone from preview HTML, runtime `brandSub` literals use the new `剧本工坊 · 历史模拟剧本总控台` / `剧本工坊 · 本地草稿制作中` pair, inventory source carries Chinese module titles, baked data contains regenerated Chinese titles for all 9 modules + character/faction/admin groups. Roundtrip + inventory smokes unchanged (no JSON shape changes).

### Behavioral verification (playwright real-render at `http://127.0.0.1:8765/preview/scenario-editor-reset-preview.html`)

- `Page Title: 天命 · 剧本工坊` (browser tab no longer says "重构预览").
- Brand header h1 reads `天命 · 剧本工坊`; sub-text reads `剧本工坊 · 历史模拟剧本总控台`.
- Hero kicker reads `剧本工坊总控台` (was English `Scenario Authoring Desk`).
- Module rail buttons render with new Chinese titles: `剧本总览与开局` · `人物与家族` · `势力与社会` · `朝廷制度` · `行政地图` · `事件编年` (no English fragments leaking).
- Bottom-note reads `剧本工坊：编辑数据保存在本地草稿和案卷库中，AI 结果先审阅再纳入；需要跑真实开局时，可用"正式沙盒测试"把当前剧本注入正式游戏运行时验证。` (no "预览" framing).

### Visual regression

- `web/_screenshots/scenario-editor-reset/2026-05-26-round12-full.png` — full-page render of the de-previewed editor surface showing Chinese page title, brand-sub, hero kicker, module rail + all 11 workbench tabs in Chinese.

### Cumulative verification (after Slices 7-97 · round 12 complete)

- `smoke-scenario-editor-reset-preview`: **1814 assertions** (+18 over the 1796 round-11 baseline).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions** (unchanged).
- `smoke-editor-reset-inventory`: **28 assertions** (unchanged — inventory schema didn't change, only title text).
- Files touched: `web/preview/scenario-editor-reset-preview.html` (~6 preview-y strings rewritten — title, brand-sub, hero kicker, hero h2, hero copy, bottom-note), `web/preview/scenario-editor-reset-app.js` (1 brandSub state literal pair at ~L10599), `web/scripts/editor-reset-inventory.js` (23 title rewrites across 4 tables), `web/preview/scenario-editor-reset-data.js` + `web/preview/official-scenarios-bundle.js` (regenerated from build script — not hand-edited), `web/scripts/smoke-scenario-editor-reset-preview.js` (+18 assertions). Legacy editor untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-26 Slices 98-100 follow-on (round 13 · 视觉层级反转 + 模块栏堆叠修复)

Round 13 addresses two visual-hierarchy complaints user raised after seeing the round 12 build:
1. **"还是有很多英文字段没翻译成中文"** — these are JSON schema keys (`officeConfig`, `chronicleConfig`, `factionRelations`, …) which can't actually be translated since they must match runtime field names exactly. The visual fix is to flip the prominence: promote the Chinese title to primary, demote the English key to a muted monospace identifier chip.
2. **"ui显示需要进一步优化，现在还是有点乱"** — the module-rail buttons rendered title and sub-tagline flush against each other on one line because `.module-name` was a plain `<span>` with no flex/block layout, so `.module-sub`'s `margin-top: 3px` was silently ignored.

- **Slice 98 · invert title vs key weight in runtime-field-row.** `renderRuntimeFieldAudit()` at `scenario-editor-reset-app.js:14212` previously emitted `<b>{prov}{english-key}<em>{chinese-title}</em></b>` — English big, Chinese small. New emit: `<b>{prov}<span class="runtime-field-title">{chinese-title}</span><code class="runtime-field-key" title="正式游戏 JSON 字段名">{english-key}</code></b>`. Added CSS for both classes: `.runtime-field-title` reads at 13px / 600-weight / paper-strong (now the prominent label); `.runtime-field-key` is 10.5px monospace on a faint gold-tinted background at 55% opacity (visible but subordinate). The legacy `.runtime-field-row em` rule is kept as-is in case other callers still emit it.
- **Slice 99 · flex-column .module-name.** `.module-name` got `display: flex; flex-direction: column; gap: 3px;` so the bare title text and `.module-sub` span stack vertically as anonymous flex items. Removed the now-redundant `margin-top: 3px` from `.module-sub` (gap handles it). No markup change — the 9 module tiles in the HTML rail still use the same `<span class="module-name">{title}<span class="module-sub">{sub}</span></span>` structure. The visual change: every rail button now reads as `[glyph] [title]\n[sub-tagline]   [count] [AI]` instead of `[glyph] [title][sub-tagline]   [count] [AI]`.
- **Slice 100 · smoke + verification (this round).** Added 7 new assertions: `.runtime-field-title` + `.runtime-field-key` markup present in app.js, matching CSS rules present in preview HTML, the bare-English-key emit pattern is gone, `.module-name` block carries `display: flex` + `flex-direction: column`.

### Behavioral verification (playwright real-render)

- Runtime field audit row for `officeConfig` now renders as `[宋 badge] 官制成本配置 [officeConfig code chip]` instead of `[宋 badge] officeConfig [官制成本配置 em]`. Chinese title is the dominant text, English key reads as a small muted code identifier.
- Module rail button accessible name now reads `卷 剧本总览与开局 身份、时间、开场信、玩家设定 24/30 缺失 6 个顶层字段 AI` — note the space between `开局` and `身份` (the visual layout has them on separate lines; the accessible name flattens with a single space).
- Page title, brand-sub, hero kicker, and all 9 module Chinese titles from rounds 11-12 still intact.

### Visual regression

- `web/_screenshots/scenario-editor-reset/2026-05-26-round13-full.png` — full-page render showing the inverted field-audit row hierarchy + stacked module rail layout.

### Cumulative verification (after Slices 7-100 · round 13 complete)

- `smoke-scenario-editor-reset-preview`: **1821 assertions** (+7 over the 1814 round-12 baseline).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions** (unchanged).
- `smoke-editor-reset-inventory`: **28 assertions** (unchanged).
- Files touched: `web/preview/scenario-editor-reset-preview.html` (+~22 CSS lines for `.runtime-field-title` / `.runtime-field-key` / flex `.module-name`; -1 `margin-top` line from `.module-sub`), `web/preview/scenario-editor-reset-app.js` (1 row template rewritten at L14212), `web/scripts/smoke-scenario-editor-reset-preview.js` (+7 assertions). Legacy editor untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-26 Slices 101-103 follow-on (round 14 · 弹层 bug + 中间柱主导航)

Round 14 fixes a stuck-dropdown bug user reported via screenshot, then tackles the root cause of "中和右的 ui 还是有点乱" — the middle column is ~11,000 px of nine stacked sections with no top-level navigation. Right rail is mostly OK (it's a workbench with tab-switched panels); the real mess was the unguided 11k scroll dump in the middle.

- **Slice 101 · scenario pill dropdown bug fix.** Clicking "更多模板与案卷" in the scenario pill dropdown invoked `focusRuntimePanel(...)` but never called `toggleScenarioPillMenu(false)`, leaving the menu stuck open while the page scrolled to the runtime panel. The other two pill commands (`load-official-scenario`, `create-new-scenario`) already closed the menu — `focus-runtime-panel` had the close call missing. Fixed at `scenario-editor-reset-app.js:15670`. Playwright reproduction confirmed: pre-fix the menu stayed `aria-expanded="true"` after the item fired; post-fix it correctly toggles to `aria-expanded="false"` + `hidden`.
- **Slice 102 · sticky section-nav strip for `.main-stack`.** Inspection showed the middle column rendered 9 sections — `hero-board` (301 px), `runtime-panel` (~8,008 px containing 19 sub-panels), `ai-desk` (400 px), `freedom-lab` (345 px), `health-panel` (309 px), `flow-panel` (232 px), `generation-queue` (239 px), `creator-shortcuts` (739 px), `ai-coverage-matrix` (594 px) — totaling ~11,400 px of scroll with no jump-target nav. A new sticky strip is injected at the top of `.main-stack` by `bootstrapSectionNav()` (called from `init()` after `bootstrapChrome()`, so the dynamically-inserted runtime-panel is in the DOM when scroll-spy registers). The strip shows 8 anchor pills (一行 if viewport allows, else wraps) in DOM order — 实装工作台 / AI 共创 / 创作模式 / 健康总览 / 重置流程 / 生成队列 / 制作捷径 / AI 覆盖矩阵 — plus 全部收起 / 全部展开 batch buttons in a right-aligned cluster. Behaviors: (a) clicking a pill calls `jumpToSectionPanel()` which auto-expands the target if it was collapsed then smooth-scrolls it into view; (b) IntersectionObserver-based scroll-spy with `rootMargin: '-25% 0px -65% 0px'` picks the topmost visible section and sets `data-active="true"` on its pill so the active section is always highlighted; (c) batch toggles route through the existing `panelCollapse.v1` persistence so state survives reloads. Also added `data-panel="health-panel"` + `data-panel="flow-panel"` to those two sections so they participate in the existing per-panel collapse system (they were previously non-collapsible — the section-head had no toggle injected).
- **Slice 103 · smoke + verification (this round).** Added 15 new assertions: focus-runtime-panel handler now closes the pill menu, `bootstrapSectionNav` function exists, `SECTION_NAV_ENTRIES` list declared with the expected first + last entries, three new editor commands (`jump-section-panel` / `collapse-all-stack-panels` / `expand-all-stack-panels`) routed through `handleEditorCommand`, `bootstrapSectionNav()` called from `init()`, `.section-nav-strip` / `.section-nav-pill` / `.section-nav-toggle` CSS present, strip uses `position: sticky`, both previously-orphan panels (`health-panel` / `flow-panel`) now carry `data-panel`.

### Behavioral verification (playwright real-render)

- Pre-fix: click pill → click "更多模板与案卷" → menu stayed `aria-expanded="true"`, blocking subsequent UI. Post-fix: same flow leaves menu `aria-expanded="false"` and the menu DOM marked `hidden`.
- Section nav strip renders at top of `.main-stack` with 8 Chinese pills + 2 toggle buttons (`"全部收起"` / `"全部展开"`), `position: sticky`, `top: 0px`.
- Click pill "制作捷径" from scrollY=0 → page smooth-scrolls so `creator-shortcuts` is at viewport top (verified `window.scrollY=10216`, target's `pageY=10216`).
- Click "全部收起" → all 8 stackable panels gain `data-panel-collapsed="true"`. Click any pill afterwards → that one panel auto-expands and scrolls into view. Click "全部展开" → state cleared, all 8 expanded.

### Visual regression

- `web/_screenshots/scenario-editor-reset/2026-05-26-round14-section-nav.png` — viewport screenshot showing the new sticky nav strip above the hero-board with all 8 anchor pills + batch toggles.

### Cumulative verification (after Slices 7-103 · round 14 complete)

- `smoke-scenario-editor-reset-preview`: **1836 assertions** (+15 over the 1821 round-13 baseline).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions** (unchanged).
- `smoke-editor-reset-inventory`: **28 assertions** (unchanged).
- Files touched: `web/preview/scenario-editor-reset-preview.html` (+~95 CSS lines for `.section-nav-strip` / pills / toggles; 2 sections gained `data-panel` attrs), `web/preview/scenario-editor-reset-app.js` (+~90 lines — `SECTION_NAV_ENTRIES` / `bootstrapSectionNav` / `setupSectionNavScrollSpy` / `jumpToSectionPanel` / `setAllStackPanelsCollapsed` helpers, 3 new commands in `handleEditorCommand`, 1 init() call, 1 close-pill fix in focus-runtime-panel handler), `web/scripts/smoke-scenario-editor-reset-preview.js` (+15 assertions). Legacy editor untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-26 Slices 104-105 follow-on (round 15 · 右栏案卷详情收起)

Round 15 adds a 收起 button to the right "案卷详情" inspector rail, mirroring the existing left "九章" module-rail collapse pattern. User wanted to be able to free the middle column to full width when focused on the main workbench. The right rail was previously always visible at 300-380 px width with no toggle.

- **Slice 104 · right-rail collapse toggle.** Added `#inspector-collapse-btn` (class `rail-collapse-btn`, glyph `⇥`) into the inspector `.section-head`. New CSS branch `.editor-grid[data-inspector-collapsed="true"]` rewrites `grid-template-columns` from `minmax(230px,270px) minmax(560px,1fr) minmax(300px,380px)` to `minmax(230px,270px) minmax(560px,1fr) 52px`. Combined with the existing left-rail collapse it can also do `52px minmax(560px,1fr) 52px` for max focus mode. Collapsed state hides `.module-detail` body, stacks the section-head vertically, and flips the button glyph to `⇤`. New JS mirrors the left-rail helpers: `INSPECTOR_COLLAPSED_KEY = 'tm.scenarioEditorReset.inspectorCollapsed.v1'`, `isInspectorCollapsed()`, `setInspectorCollapsed()`, `toggleInspectorCollapsed()`. Click handler added in `wireEvents()` right after the existing `#rail-collapse-btn` handler. `init()` applies the persisted state on load (so reloads remember the choice).
- **Slice 105 · smoke + verification (this round).** Added 7 new assertions: button id present in HTML, `INSPECTOR_COLLAPSED_KEY` declared, three helpers exist, `init()` calls `setInspectorCollapsed(isInspectorCollapsed())`, click routing wires to `toggleInspectorCollapsed`, CSS branch exists, collapsed grid shrinks right column to 52px.

### Behavioral verification (playwright real-render)

- Default state (no localStorage): grid columns = `270px 560px 374px`, button text = `⇥`, title = `收起案卷详情`.
- After click: columns = `270px 882px 52px` (right shrank 374→52, middle grew 560→882, +322px gained), `.module-detail` `display: none`, localStorage `tm.scenarioEditorReset.inspectorCollapsed.v1 = "true"`, button title flips to `展开案卷详情`.
- Second click: columns restored to `270px 560px 374px`, localStorage flipped to `"false"`.
- Combined with left-rail collapse, max focus mode yields `52px ~ 52px` flanking a wide middle column.

### Visual regression

- `web/_screenshots/scenario-editor-reset/2026-05-26-round15-inspector-collapsed.png` — viewport with the right rail collapsed to a 52 px sliver and the middle column expanded.

### Cumulative verification (after Slices 7-105 · round 15 complete)

- `smoke-scenario-editor-reset-preview`: **1843 assertions** (+7 over the 1836 round-14 baseline).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions** (unchanged).
- `smoke-editor-reset-inventory`: **28 assertions** (unchanged).
- Files touched: `web/preview/scenario-editor-reset-preview.html` (+1 button markup; +~30 CSS lines for the collapsed-grid branch), `web/preview/scenario-editor-reset-app.js` (+~35 lines — `INSPECTOR_COLLAPSED_KEY` + 3 helpers + 1 click handler + 1 init() call), `web/scripts/smoke-scenario-editor-reset-preview.js` (+7 assertions). Legacy editor untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-26 Slices 106-108 follow-on (round 16 · 实装工作台子导航 + 过渡文案清理)

Round 16 deletes lingering 承接旧编辑器 transition copy + tackles the biggest remaining navigation pain: the 实装工作台 (runtime-panel) holds 23 sub-panels in a 2-column grid totaling ~7,866 px of internal scroll with no jump-target nav.

- **Slice 106 · delete 承接旧编辑器 paragraph.** API settings panel at `scenario-editor-reset-app.js:1271` carried `"此处承接旧编辑器顶部'API 设置 / 生图 API 设置'。Key 只保存在当前浏览器本机...多预设允许在 OpenAI / Anthropic / 自建端点之间一键切换。"` — user flagged it as the kind of new/old-UI handoff explainer that should be cut. Grep over the full codebase confirmed it was the only paragraph of this style; one line deleted, no other 承接 / 沿用 / 替代 / 旧版 / 原版 transition copy remained.
- **Slice 107 · 23-pill runtime sub-nav.** Added `.runtime-subnav` strip inserted between the runtime-panel `.section-head` and `.runtime-grid` (via the same `insertAdjacentHTML` call at `bootstrapChrome` L15542). 23 pills grouped into 7 categories with `<span class="runtime-subnav-sep">` dividers: **制作** (新建剧本 / 制作流程 / 制作驾驶舱 / 剧本向导) · **校验** (字段审计 / 校验结果 / 旧编辑器审计 / 剧本对照) · **工具** (全局检索 / 引用修复 / 编辑回退 / 变更清册) · **AI** (AI 草稿队列 / AI 调用日志 / 事件合并) · **发布** (发布预检 / 沙盒测试 / 发布说明) · **案卷** (案卷版本库 / API 设置) · **日志** (状态日志 / 字段关注 / 修改日志). Pills reuse the existing `focus-runtime-panel` editor command which already does smooth scroll-into-view + temporary `data-runtime-focus` highlight; new CSS gives the focus state a 2 px gold outline with 4 px offset so jumps visually anchor. Three sub-panels that previously lacked `data-panel` attrs (`校验结果` / `AI 草稿队列` / `变更清册`) got new keys (`validation-results-panel` / `ai-draft-queue` / `scenario-diff`) so the sub-nav can target them.
- **Slice 108 · smoke + verification (this round).** Added 11 new assertions: transition copy gone from app.js, sub-nav strip rendered, 3 representative pills present, 3 newly-keyed data-panel attrs present, sub-nav CSS classes styled.

### Behavioral verification (playwright real-render)

- Sub-nav renders 23 pills + 6 separators in a 590 × 133 px area at the top of the runtime-panel (wraps to ~3 visual rows by category groupings).
- Clicking the "发布说明" pill from `scrollY=0`: target `release-notes` panel ends with `targetTop=0` (at viewport top) and gains `data-runtime-focus="true"` (gold outline visible for ~1.8s before auto-clearing per existing focusRuntimePanel timer).
- API settings panel rendered without the deleted explainer; inputs above are self-explanatory.

### Visual regression

- `web/_screenshots/scenario-editor-reset/2026-05-26-round16-runtime-subnav.png` — scrolled viewport showing the new sub-nav strip with all 23 grouped pills above the runtime-grid.

### Cumulative verification (after Slices 7-108 · round 16 complete)

- `smoke-scenario-editor-reset-preview`: **1854 assertions** (+11 over the 1843 round-15 baseline).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions** (unchanged).
- `smoke-editor-reset-inventory`: **28 assertions** (unchanged).
- Files touched: `web/preview/scenario-editor-reset-preview.html` (+~55 CSS lines for `.runtime-subnav` / pills / seps / focus highlight), `web/preview/scenario-editor-reset-app.js` (+~28 lines — 23-pill sub-nav strip + 6 sep markers + 3 sub-panel data-panel rekeys; -1 transition-copy paragraph), `web/scripts/smoke-scenario-editor-reset-preview.js` (+11 assertions). Legacy editor untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-26 Slice 109 follow-on (round 17 · 剧本切换弹层 ✕ 关闭按钮)

User reported the scenario pill dropdown "依旧无法关闭" (still can't be closed) despite Slice 101 already wiring all 4 menu-item commands to close on action. Playwright verification confirmed all programmatic close paths work (Esc / click-pill-again / click-outside / each of the 4 items). Diagnosis: the issue is **discoverability** — there's no visible close affordance, so users perceive the menu as stuck even when the keyboard / outside-click paths exist. Two compensating moves below.

- **Slice 109a · explicit ✕ close button.** `renderScenarioPillMenu()` at `scenario-editor-reset-app.js:10602` now prepends a `.scenario-pill-menu-head` row containing `<span class="scenario-pill-menu-title">切换剧本 · 模板</span>` + a 22×22px `.scenario-pill-menu-close` ✕ button wired to a new `close-scenario-pill-menu` editor command (handled by routing to `toggleScenarioPillMenu(false)`). CSS gives the button a faint gold border + red-tinted hover so users always see how to dismiss the menu. The button uses `title="关闭 (Esc)"` so hover preview also surfaces the Esc keybinding.
- **Slice 109b · close on menu-background click.** Previously the click-outside handler returned early as long as the click landed anywhere inside `#scenario-pill-host` (which contains both the pill button and the menu). That meant clicks on the menu's empty gap-between-items area silently did nothing, reinforcing the "stuck" feeling. The check now also closes when the click target is inside `#scenario-pill-menu` BUT NOT on a menu item / head row / title / close button — so clicking the menu's own background dismisses it like clicking outside would.

### Behavioral verification (playwright real-render)

- Open menu → ✕ button visible in head row → click ✕ → `aria-expanded` flips to `false`, menu gains `hidden` attribute.
- Open menu → dispatch click on `#scenario-pill-menu` element itself (background, not item) → closes.
- Open menu → click outside the host → still closes (existing behavior preserved).
- Open menu → Esc → still closes (existing keydown handler preserved).
- Click pill → re-click pill → toggles closed (existing).

### Visual regression

- `web/_screenshots/scenario-editor-reset/2026-05-26-round17-pill-close-btn.png` — dropdown open showing the new head row (`切换剧本 · 模板`) + ✕ close button at right.

### Cumulative verification (after Slices 7-109 · round 17 complete)

- `smoke-scenario-editor-reset-preview`: **1861 assertions** (+7 over the 1854 round-16 baseline).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions** (unchanged).
- `smoke-editor-reset-inventory`: **28 assertions** (unchanged).
- Files touched: `web/preview/scenario-editor-reset-preview.html` (+~40 CSS lines for `.scenario-pill-menu-head` / `.scenario-pill-menu-title` / `.scenario-pill-menu-close`), `web/preview/scenario-editor-reset-app.js` (+~10 lines — menuHead string in `renderScenarioPillMenu`, new `close-scenario-pill-menu` command branch, widened click-outside check with `pillMenu` + `menuItem` matchers), `web/scripts/smoke-scenario-editor-reset-preview.js` (+7 assertions). Legacy editor untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-26 Slice 110 follow-on (round 18 · 终于找到 pill 弹层关不掉的真 bug)

User kept reporting the scenario pill dropdown "still can't be closed" despite Slices 101 / 109 each adding more JS close paths. Direct playwright operation finally surfaced the real root cause: a CSS specificity collision that made the menu **visually persist** even after JS correctly set the `hidden` attribute.

### Root cause

`.scenario-pill-menu { display: grid; ... }` is the base rule for the dropdown. The HTML `hidden` attribute is normally honored via the UA stylesheet's `[hidden] { display: none; }` rule. **Both selectors have specificity (0,1,0), and author styles beat UA styles when specificity ties.** So every time `toggleScenarioPillMenu(false)` set `menu.setAttribute('hidden', '')`, the menu's HTML attribute changed correctly, but the rendered `display` stayed `grid` — the menu remained visible.

This explains every prior failed "close fix":
- **Slice 101** wired `focus-runtime-panel` to call `toggleScenarioPillMenu(false)` ✓ — set attr, no visual change
- **Slice 109** added ✕ button + `close-scenario-pill-menu` command + widened click-outside ✓ — set attr, no visual change
- Playwright a11y snapshots showed the menu "closed" because the a11y tree respects `hidden` regardless of CSS. That's why automated verification kept passing while the user kept seeing the menu open.

The discovery happened by directly evaluating `getBoundingClientRect()` + `getComputedStyle().display` in playwright after a close click — both `width: 384px, height: 338px, display: "grid"` despite `hidden: true`. The element was visually shown but a11y-tree hidden.

### Fix

One additional CSS rule, specificity (0,2,0) which beats (0,1,0):

```css
.scenario-pill-menu[hidden] {
  display: none;
}
```

Now `hidden` attribute correctly hides the menu visually too.

### Behavioral verification (playwright real-render, post-fix)

- Open menu → click ✕ → `hidden: true, display: "none", width: 0, height: 0, isVisuallyShown: false`
- All previous close paths (Esc / re-click pill / click outside / click menu background / click any of 4 menu items) now work correctly — they were all calling the right JS, the CSS was the only broken link.

### Cumulative verification (after Slices 7-110 · round 18 complete)

- `smoke-scenario-editor-reset-preview`: **1862 assertions** (+1 over the 1861 round-17 baseline).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions** (unchanged).
- `smoke-editor-reset-inventory`: **28 assertions** (unchanged).
- Files touched: `web/preview/scenario-editor-reset-preview.html` (+4 lines — the `.scenario-pill-menu[hidden] { display: none }` rule + 7-line comment block explaining the specificity bug for future maintainers), `web/scripts/smoke-scenario-editor-reset-preview.js` (+1 assertion that future style refactors don't drop the rule). Legacy editor untouched. No git commits, no hot-update ships (Phase L lockdown holds).

## 2026-05-26 Slice 111 follow-on (round 19 · 左右栏独立滚动)

User reported "右边无法下滑" and clarified "右边和中间的下滑应该分开" — the right inspector rail's content (~2,117 px tall: workbench tabs + structure browser + field editor + form + JSON + AI panel + …) was unreachable below the viewport because the rail used `position: sticky` with no internal scroll. The sticky pinning kept the rail visually present while the page scrolled, but the rail itself never moved past its initial visible portion, so anything below the viewport fold was permanently cropped.

### Fix

Added `max-height: calc(100vh - 36px); overflow-y: auto;` to both the right `.inspector` base rule and the left `.module-rail` base rule. Now each rail has its own internal scrollbar:

- Page scroll continues to move the middle column (`.main-stack`) and the sticky `#section-nav-strip` follows along.
- Right inspector stays pinned to top:18px during page scroll, but its own content scrolls independently via the new scrollbar.
- Left rail same pattern (consistency + future-proof against module count growth).

### Behavioral verification (playwright real-render)

- `.inspector` post-fix: `height=684px (clamped to viewport)`, `scrollHeight=2117px`, `canScroll=true`, `max-height: 684px`, `overflow-y: auto`.
- `.module-rail` post-fix: `height=684px`, `scrollHeight=707px`, `canScroll=true`, `overflow-y: auto`.
- Set `inspector.scrollTop = 500` programmatically → `pageScrollY` stayed at 0 → confirmed independent scroll axes.

### Cumulative verification (after Slices 7-111 · round 19 complete)

- `smoke-scenario-editor-reset-preview`: **1866 assertions** (+4 over the 1862 round-18 baseline).
- `smoke-scenario-editor-reset-roundtrip`: **395 assertions** (unchanged).
- `smoke-editor-reset-inventory`: **28 assertions** (unchanged).
- Files touched: `web/preview/scenario-editor-reset-preview.html` (+~14 lines — `max-height` + `overflow-y` on both `.inspector` and `.module-rail` base rules with explanatory comments), `web/scripts/smoke-scenario-editor-reset-preview.js` (+4 assertions). Legacy editor untouched. No git commits, no hot-update ships (Phase L lockdown holds).
