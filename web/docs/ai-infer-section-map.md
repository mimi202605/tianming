# tm-endturn-ai-infer.js Section Map

date: 2026-05-04
status: Phase 3 R7, Region 1 first context extraction active
source: `tm-endturn-ai-infer.js` (12,591 lines)

This document is a map for reading and later refactoring `tm-endturn-ai-infer.js`.
It also records the first active Region 1 extraction: `tm-endturn-ai-context.js`.
The original inline block remains as a fallback path in `tm-endturn-ai-infer.js`.

## Rules

- Treat this as a navigation document plus active split ledger.
- Do not move additional code out of `tm-endturn-ai-infer.js` until a follow-up slice has its own smoke gate.
- Do not edit `tm-endturn-render.js` from this slice.
- Preserve the current sub-call order unless a later slice explicitly audits dependencies.
- Any future extraction must keep `verify-all`, full `headless-smoke`, and relevant AI/endturn smoke green.

## Top-Level Regions

| Region | Lines | Responsibility | Notes |
|---|---:|---|---|
| 1. Prompt/context assembly | L25-L3230 | Build `tp` and `sysP`; inject world, memory, player, court, faction, chronicle, rules, and token-budget context | Largest prompt-policy block; high semantic coupling |
| 2. Sub-call infrastructure | L3235-L3390 | Declare shared sub-call state and wrappers | `_subcallMeta`, `_runSubcall`, `_runSubcallBatch`, `_maybeCacheSys` |
| 3. Core AI calls | L3391-L5767 | Run `sc0`, `sc05`, `sc1`, `sc1b`, `sc1c`; merge/fallback core AI output | Produces main `p1`, `p2`, `p1Summary`, `aiThinking`, `memoryReview` |
| 4. `sc1` writeback | L5767-L10361 | Apply structured `p1` output to GM/P and game systems | Mixes applier delegation, reconciliation, field-family reducers, lifecycle updates |
| 5. Post-`sc1` fanout and wrap-up | L10362-L12591 | Run follow-up subcalls and end-of-turn audits, memories, narrative review, timing summary | Parallel branch structure begins here |

## Region 1: Prompt/Context Assembly

Range: `L25-L3230`

Owns:

- Initial output buffers: `shizhengji`, `zhengwen`, `playerStatus`, `playerInner`, `turnSummary`, `shiluText`, `szjTitle`, `szjSummary`, `personnelChanges`, `hourenXishuo`.
- Scenario and output-length setup via `findScenarioById`, `_getCharRange`, `_getDaysPerTurn`.
- Main prompt strings: `tp` and `sysP`.

Important sub-blocks:

| Lines | Purpose |
|---:|---|
| L54-L130 | Edict lifecycle, reform phases, rebellion lifecycle, dynasty-specific prompt rules |
| L131-L230 | Player directives, absolute rules, imported memories/docs |
| L232-L325 | `buildAIContext(true)` plus battle/supply/march/siege/casus-belli/treaty/scheme/decision prompt injections |
| L327-L636 | Military movement, diplomatic missions, reform variables, province/pass/de-jure context, memorial routing, intel and letter state |
| L636-L818 | Memory anchors, chronicle archive/afterword, dialogue compression, NPC hearts, prior memorial handling, annual review, player energy, achievements |
| L951-L1233 | Court records, player choices, office/faction/government context, goals, stress context |
| L1459-L1667 | Player identity, faction identity, game mode, historical character limits |
| L1668-L1740 | `TM.PromptComposer` bridge: base system prompt, narrative guide, system prefix, temporal granularity, chronicle style |
| L1760-L2453 | Tensions, faction/party/army risk, NPC decision context, edict follow-up, character arcs, scenario digest, history index, player role/mood, class alerts, prophecy, contradiction, location prompt; first policy/context slice now owned by `tm-endturn-ai-context.js` with inline fallback |
| L2621-L2801 | Irreversible facts, NPC behavior/person goals, relation network, status coupling, execution pipeline, buildings/trade/resources/policies/divisions, NPC event proposals, legitimacy, scheme suggestions |
| L3109-L3230 | Token/output cap calculation, memory summary injection, hallucination whitelist, model adapter, prompt-layer cache, prompt dedupe, sysP truncation |

Extraction caution:

- This region blends prompt policy with live game state reads. Do not split before naming the individual prompt fragment owners.
- The `TM.PromptComposer` bridge is already a partial extraction point, but this file still assembles many dynamic fragments directly.
- R7 active split: `tm-endturn-ai-context.js` owns the first policy/context injection slice only. Candidate events, playerChoices, scenario digest, history index, class/prophecy/contradiction/location blocks remain in `tm-endturn-ai-infer.js`.

## Region 2: Sub-Call Infrastructure

Range: `L3235-L3390`

Owns:

- Shared mutable state: `_aiDepth`, `aiThinking`, `memoryReview`, `p1`, `p2`, `p1Summary`, `GM._turnAiResults`, `GM._subcallTimings`.
- Sub-call registry `_subcallMeta`.
- Provider/cache helper `_maybeCacheSys`.
- Execution wrappers `_runSubcall` and `_runSubcallBatch`.
- Dispatch stats in `GM._aiDispatchStats`.

Registered subcalls:

| id | Purpose | Depth |
|---|---|---|
| `sc0` | AI deep thinking | standard |
| `sc05` | Memory recall | standard |
| `sc1` | Main structured data | lite |
| `sc1b` | Culture, letters, NPC interactions | lite |
| `sc1c` | Factions, diplomacy, NPC schemes | lite |
| `sc15` | NPC depth | standard |
| `sc_memwrite` | NPC memory writeback | lite, post-turn queue |
| `sc16` | Faction simulation | full |
| `sc17` | Economy/fiscal simulation | full |
| `sc18` | Military situation | full |
| `sc_audit` | Data consistency audit | lite |
| `sc2` | Narrative prose | lite |
| `sc25` | Foreshadowing/memory | lite |
| `sc27` | Narrative audit | standard |
| `sc07` | NPC cognition consolidation | lite |
| `sc28` | World snapshot | full |

Extraction caution:

- This region is the best future target for a small orchestrator/helper module.
- Keep it behavior-identical first; many later branches rely on shared local variables.

## Region 3: Core AI Calls

Range: `L3391-L5767`

Subsections:

| Lines | Subcall | Responsibility |
|---:|---|---|
| L3395-L3415 | `sc0` | Generate deep thinking and memory query intent |
| L3417-L3591 | recall bridge | Use `sc0` memory queries to retrieve permanent archives |
| L3592-L3824 | `sc05` | Build memory review context |
| L3827-L5171 | `sc1` | Main structured turn output, schema-heavy JSON, world snapshots, memory tables, inbox review, token budget, Call A compression fallback |
| L5172-L5316 | `sc1b` | Culture/letters/interactions supplemental JSON; non-fatal failure |
| L5318-L5735 | `sc1c` | Faction diplomacy, schemes, undercurrents, hidden moves, rumors; non-fatal failure |
| L5737-L5767 | merge/fallback | Wait `sc1b` + `sc1c`, synthesize minimal fallback if main `sc1` fails |

Important behavior:

- `sc1` is the primary state-changing payload producer.
- `sc1b` and `sc1c` are parallel after `sc1` setup and merge into `p1`.
- If `sc1` fails or returns empty, the fallback synthesizes enough `p1` to avoid hard-blocking the end turn.
- Token diagnostics are stored under `window.TM.lastPromptTokens`.

Extraction caution:

- `sc1b` and `sc1c` are good future isolation candidates because their fields are mostly supplemental.
- `sc1` should not move until `p1` ownership and schema/application boundaries are separately documented.

## Region 4: `sc1` Writeback

Range: `L5767-L10361`

Owns:

- Applying AI output to GM/P/runtime systems.
- Delegating supported fields to `applyAITurnChanges`.
- Running reconciliation when validators set `GM._needsReconcile`.
- Applying direct patches not covered by the applier.
- Updating field-family systems: characters, relations, offices, factions, parties, policies, map/admin, military movement, events, cultural works, lifecycle.

Important sub-blocks:

| Lines | Responsibility |
|---:|---|
| L5767-L5800 | Main `applyAITurnChanges` delegation for narrative, changes, appointments, institutions, regions, events, NPC actions, relations, fiscal/personnel/office/faction/party/directive fields |
| L5801-L6170 | Reconciliation pass: tool-based structured patching for missing narrative/JSON effects |
| L6170-L6250 | Apply reconciliation patches and direct sentiment/population/war/revolt/disaster/diplomacy/keju/party/edict/court/construction/etc. records |
| L6251-L6466 | NPC autonomous actions, fuzzy character matching, mechanical execution attempts |
| L6467-L6582 | Ripple effects from affected characters and relationship propagation |
| L6583-L6659 | Structured relationship type storage |
| L6660-L6712 | Foreshadowing and chronicle linkage |
| L7235-L8790 | Military movement, map/admin/state reducers, broad field-family writebacks |
| L8790-L9196 | Helper cluster: `_findDiv`, `_findAdminNode`, `_removeChildPS` |
| L9585-L10361 | Edict lifecycle update application and hallucinated action filtering |

Helper hotspots:

- `_findDiv(divs)` around L8790.
- `_findAdminNode(name, divs, parent)` around L8999.
- `_removeChildPS(children)` around L9196.
- `_dispatchNpcActionToPlayer(it, typeInfo)` around L9856.
- `_dispatchFactionActionToPlayer(it, typeInfo)` around L10009.

Extraction caution:

- This is the riskiest future split area because it mixes validation, normalization, side effects, and UI/event history.
- Prefer extracting by field family only after each family has a narrow smoke or fixture.
- Watch cross-module coupling with `TM.ClassEngine.applyClassPartyCoupling`, `PostTransfer`, `AffinityMap`, `NpcMemorySystem`, map/admin systems, and lifecycle systems.

## Region 5: Post-`sc1` Fanout And Wrap-Up

Range: `L10362-L12591`

Branch model:

- Branch A: `sc15` NPC deep simulation, then `sc_memwrite` through post-turn queue.
- Branch B: `sc16`/`sc17`/`sc18` batch using `_runSubcallBatch` with concurrency.
- Branch C: `sc2` narrative prose, then `sc27` narrative review.

Important sub-blocks:

| Lines | Subcall/Block | Responsibility |
|---:|---|---|
| L10362-L10610 | `sc15` | NPC hidden moves, mood shifts, relationship changes, cascade effects, province/class/party/faction undercurrents |
| L10612-L10770 | `sc_memwrite` | NPC memory writeback moved to post-turn queue |
| L10771-L10955 | `sc16`/`sc17`/`sc18` | Faction, economy/fiscal, military batch |
| L10956-L11062 | `sc_audit` | Data consistency audit |
| L11063-L11261 | `sc1.9` enrichment | Enrich new skeleton entities |
| L11262-L11479 | `sc2` | Narrative prose / `hourenXishuo` style text |
| L11480-L11733 | `sc25` | Foreshadowing, turn memory compression, NPC emotion snapshot |
| L11734-L11787 | `sc27` | Narrative quality review and enhancement |
| L11788-L12004 | `sc07` | NPC cognition consolidation |
| L12005-L12040 | `sc28` | World state deep snapshot |
| L12041-L12237 | consolidate memory | Background memory solidification |
| L12238-L12472 | memory compression | Adaptive compression based on context window |
| L12473-L12507 | E13 + timing | Lightweight consistency self-check and sub-call timing summary |
| L12546-L12591 | `_stripHtmlResidue` tail helper and function close |

Important behavior:

- The branch fanout depends on `p1` already being applied enough for downstream context.
- `sc_memwrite` is intentionally backgrounded so the player can continue after the main turn.
- `sc07` remains untouched by the current performance/refactor work.

Extraction caution:

- Branch A/B/C can be documented independently before extraction.
- Do not combine render logic here; result rendering belongs to `tm-endturn-render.js`.

## Future Split Candidates

Only `tm-endturn-ai-context.js` is active/partial. The remaining rows are candidates only, not current work:

| Candidate | Current source region | Why |
|---|---|---|
| `tm-endturn-ai-context.js` | Region 1 | ACTIVE/PARTIAL: first policy/context injection owner; `tm-endturn-ai-infer.js` retains inline fallback |
| `tm-endturn-ai-subcalls.js` | Region 2 | `_runSubcall`, `_runSubcallBatch`, metadata, timings are reusable |
| `tm-endturn-ai-core-calls.js` | Region 3 | `sc0/sc05/sc1/sc1b/sc1c` can be read as a core pipeline |
| `tm-endturn-ai-sc1-applier.js` | Region 4 | Field-family writebacks need isolation and tests before deeper changes |
| `tm-endturn-ai-postcalls.js` | Region 5 | Post-`sc1` branches are already conceptually separated |

Recommended next step before extraction:

- Add a narrow AI/endturn smoke fixture that can execute the writeback reducers without real network calls.
- Document field ownership for `p1` fields before moving any reducer.
