# Phase 7 epsilon prep: `tm-endturn-apply.js`

date: 2026-05-04  
status: read-only prep; no runtime code moved  
owner: Codex future slice P7-epsilon

## Scope

Target future module: `tm-endturn-apply.js`.

Semantic scope:

- current `§4 sc1 写回`
- actual range: around L5778-L10372
- input: final merged `p1` from `ctx.results.sc1`
- output: durable `GM/P` writes plus `ctx.record` and apply summaries

Do not split this module into field-family public modules in Phase 7. Keep field-family work as private helpers inside `TM.Endturn.AI.apply`.

## Important correction

`phase7-ctx-contract.md` currently places `_changeSummary` in `ctx.apply`, but current code builds `_changeSummary` in `§5` around the `sc25` prompt preparation area, not in `§4`.

Recommendation:

- keep `ctx.apply.applied.*` for actual apply summaries
- move `_changeSummary` to `ctx.followup.changeSummary` or `ctx.record.changeSummary`
- do not require P7-epsilon to produce `_changeSummary`

## Apply order to preserve

The current order is not arbitrary. P7-epsilon should preserve the broad order:

1. Run generic `applyAITurnChanges()` first with selected `p1` arrays:
   `changes`, `appointments`, `institutions`, `regions`, `events`, `npc_actions`, `relations`, `fiscal_adjustments`, `char_updates`, `office_assignments`, `faction_updates`, `party_updates`, `personnel_changes`, `directive_compliance`, `regent_decisions`.
2. Run reconciliation if `GM._needsReconcile` exists. This can trigger another AI/tool call and direct patch writes.
3. Copy record-facing fields:
   `shizhengji`, `turnSummary`, `playerStatus`, `playerInner`, `shiluText`, `szjTitle`, `szjSummary`, `personnelChanges`.
4. Apply resource/relation/event/map changes.
5. Apply NPC action side effects, letters/correspondence, route disruptions, affinity/goals, foreshadowing, current issues.
6. Apply character lifecycle:
   `applyCharacterDeaths(p1)`, `new_characters`, `char_updates`, harem settlement adjacency.
7. Apply faction/party/class/reissue/military/item/era/global state.
8. Apply office, vassal, title, building, admin, harem, palace, cultural, lifecycle, interaction, policy, scheme, timeline, edict feedback blocks.
9. Close before `}); // end Sub-call 1 _runSubcall`, then hand off to followup.

## Field-family dependency notes

Character family:

- `character_deaths` must run before ordinary `char_updates` so dead/fake-dead constraints remain coherent.
- `new_characters` must update `GM.chars`, indices, and harem heir links before later references.
- `char_updates` may affect location, title, faction, party, health, memory, travel, and relationship semantics.

Faction/party/class family:

- `faction_changes`, `faction_events`, and `faction_relation_changes` populate later `sc15/sc16/sc_audit` context.
- `party_changes`, `party_*`, and `class_*` interact with `TM.ClassEngine`; `TM.ClassEngine.finalizeTurn(GM, p1, ...)` must stay after class writes.
- `reissue_topics` calls `_ty3_applyAIReissueTopics(..., {deferOpen:true})`; keep it non-UI-opening during end turn.

Office/admin family:

- `office_assignments`, `office_spawn`, `office_changes`, `office_aggregate`, `admin_changes`, `autonomy_changes`, `admin_division_updates` share `GM.officeTree` and `P.adminHierarchy`.
- Order matters because spawned/changed offices can alter holder lookup and later narrative/UI display.

Fiscal/military family:

- `applyAITurnChanges()` may already consume `fiscal_adjustments`; local fallback/reconcile patches can also touch fiscal-like variables.
- P7-epsilon focused smoke must guard double accounting.
- `army_changes` and later `battleResult` in followup use shared military state; apply should not reorder foreground military changes behind followup.

Narrative/record family:

- `shizhengji`, `zhengwen`, `shiluText`, `szjTitle`, `szjSummary`, `personnelChanges`, `hourenXishuo` are not durable game state only; they are return/record products and should be copied into `ctx.record`.

## Smoke expectations for P7-epsilon

Focused smoke should check at least:

- generic `applyAITurnChanges()` receives the same field set as before
- no duplicate fiscal application for one `fiscal_adjustments` item
- `personnel_changes` still updates display-facing `personnelChanges`
- character death before char update remains effective
- office assignment/spawn/admin update order is stable
- class alert/class change hooks still call `TM.ClassEngine`
- reissue topics stay deferred
- record fields are available for `TM.Endturn.AI.record.finalize(ctx)`

