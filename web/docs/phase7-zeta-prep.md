# Phase 7 zeta prep: `tm-endturn-followup.js`

date: 2026-05-04  
status: read-only prep; no runtime code moved  
owner: Codex future slice P7-zeta

## Scope

Target future module: `tm-endturn-followup.js`.

Semantic scope:

- current `§5 sc15-sc27 后续子调用 + 收尾`
- actual `§5` starts around L10373
- foreground followup continues until queued post-turn jobs are flushed around L12528-L12534
- final return object around L12577-L12585 is better left for P7-eta record/main-entry cleanup

## Required contract addendum

Current ctx result list should include these explicit result slots:

```js
ctx.results.sc2 = null;
ctx.results.sc_audit = null;
ctx.results.sc_memwrite = null;
ctx.results.sc28 = null;
```

`ctx.record` should also carry the old `p2` suggestions path:

```js
ctx.record.suggestions = [];
```

Reason: the current final return still reads `(p2 && p2.suggestions) || []`.

## Current branch topology

Preserve this topology unless the user explicitly opens another latency pass:

1. Branch A: foreground `sc15` NPC deep inference.
2. Queue `sc_memwrite` post-turn after `sc15`; it consumes `sc15.hidden_moves` and `p1.faction_events`.
3. Branch B: start `sc16/sc17/sc18` as `_runSubcallBatch('full-specialty', ..., concurrency=3)`.
4. Define `sc_audit` function; it reads `_turnAiResults.subcall1` and specialty outputs.
5. Queue `sc19` new entity enrichment post-turn.
6. Branch C: foreground `sc2` narrative, then queued `sc25`, then foreground `sc27` narrative review.
7. Define `sc07`; do not change its behavior.
8. Final parallel block: `sc_audit + Branch C + sc07` run in parallel after the earlier dependency gates.
9. Queue `sc28` world snapshot post-turn.
10. Queue `sc_consolidate` post-turn and explicitly wait for `sc25` and `sc28`.
11. Run local cleanup/compression.
12. Flush queued post-turn subcalls only after foreground cleanup.
13. Launch other post-turn jobs.

## Data flow notes

`sc15`:

- input: `p1`, `GM.chars`, `GM.factionEvents`, class/faction context
- writes: `GM._turnAiResults.subcall15`, mood/relationship/class reaction side effects, `GM._factionUndercurrents`, `p1Summary`
- later consumers: `sc_memwrite`, `sc16`, `sc_consolidate`, next turn prompt injection

`sc16/sc17/sc18`:

- started as Branch B with configured concurrency
- `sc16` reads faction relations and `GM._factionUndercurrents`
- `sc17` can append fiscal analysis to `p1Summary`
- `sc18` can call `MilitarySystems.applyBattleResult`

`sc_audit`:

- reads `_turnAiResults.subcall1` and specialty subcalls
- can patch consistency fields
- must remain non-fatal on failure

Branch C:

- `sc2` produces narrative and `p2`
- `sc27` modifies `zhengwen`
- final return still depends on `p2.suggestions`

Post-turn jobs:

- `sc_memwrite`, `sc19`, `sc25`, `sc28`, `sc_consolidate` are intentionally queued
- `sc_consolidate` must wait for `sc25` and `sc28`
- post-turn jobs should stay quiet: no loading overlay during player-visible next-turn interactions

## Do-not-change constraints

- Keep `sc07` behavior unchanged.
- Keep API count and call structure unchanged.
- Keep queued jobs queued; do not accidentally await them in the foreground path.
- Keep `_flushQueuedPostTurnSubcalls()` after foreground cleanup so compression does not race late writes.
- Keep fallback/error behavior non-fatal for followup calls.

## Smoke expectations for P7-zeta

Focused smoke should check:

- Branch A writes `GM._factionUndercurrents`
- `sc_memwrite` is queued, not awaited in foreground
- Branch B starts `sc16/sc17/sc18` through `_runSubcallBatch`
- final parallel still includes `sc_audit`, Branch C, and `sc07`
- `sc07` registration/call id remains `sc07`
- `sc_consolidate` waits for `sc25` and `sc28`
- queued jobs flush after foreground cleanup
- `p2.suggestions` survives into record/final return

