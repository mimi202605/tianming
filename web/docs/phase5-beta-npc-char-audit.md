# Phase 5 P5-beta NPC/Char Prep Audit

Date: 2026-05-04

Mode: read-only prep audit. Do not edit `tm-namespaces.js` until Claude finishes P5-alpha namespace reconciliation.

## Current Load Order

- `index.html` loads `tm-npc-engine.js` and `tm-npc-decision.js` at the NPC engine boundary.
- Character runtime loads in this order: `tm-char-arcs.js`, `tm-char-autogen.js`, `tm-char-economy-engine.js`, `tm-char-historical-profiles.js`, `tm-char-historical-wave-01..12.js`, `tm-char-economy-ui.js`, and `tm-char-full-schema.js`.
- `tm-namespaces.js` loads after these legacy globals, so P5-beta can safely build facades from existing globals if P5-alpha keeps this load position.

## NPC Candidate Surfaces

Primary candidates for `TM.NPC`:

- `NpcEngine`: `initialize`, `runEngine`, `completePlayerTask`, `getPlayerTasks`, `switchPlayerCharacter`, `reset`.
- `InteractionSystem`: `initialize`, `getAvailableInteractions`, `executeInteraction`, `reset`.
- Decision layer: `executeNpcBehaviors`, `batchNpcDecisions`, `npcDecisionLayer`, `buildNpcDecisionPrompt`, `buildNpcBehaviorContext`, `selectImportantNpcs`, `findNpcOffice`, `hasOffice`.
- Behavior registry: `NpcBehaviorRegistry`.
- Personality context helpers: `getCharacterPersonalityBrief`, `getNpcPersonalityInjection`.
- Legacy context engine, if needed for compatibility: `buildNpcContext`, `calculateDecisionWeight`, `evaluateCondition`, `generateDecisionsForActor`, `executeNpcDecisions`.

Keep as legacy/internal unless an external call site requires them:

- Weight helpers such as `calculateCandidateWeight`, `rankCandidatesByWeight`, `generateWeightReport`.
- Specific behavior executors such as `executeAppointBehavior`, `executeDismissBehavior`, `executeRewardBehavior`, and similar dispatch targets.

Do not classify these as `TM.NPC`:

- `CentralizationSystem`: this is tribute/fiscal hierarchy logic, despite living in `tm-npc-engine.js`.
- `TerritoryProductionSystem`: this is territory production and map/fiscal-adjacent logic, not NPC behavior.
- `generateChangeReport`, `toggleSection`, `resetTurnChanges`: turn-report or UI/debug helpers.
- `updatePartyLoyaltyLink`, `evaluateThresholdTriggers`: cross-domain bridge logic; leave under legacy globals until its owning namespace is explicit.

## Char Candidate Surfaces

Primary candidates for `TM.Char`:

- `CharFullSchema`: schema, migration, memory summary, AI context, `evolveTick`, and career event helpers.
- `CharEconEngine`: resource tick, salary/bribe/confiscation, fame/virtue, courtesy-name, class inference, and public constants.
- `CharArcs`: `advance`, `abort`, `buildForSysP`, `shouldAdvance`, `warmIfStale`, `ensureBeforeEndturn`.
- Autogen/recruit helpers: `aiGenerateCompleteCharacter`, `edictRecruitCharacter`, `parseEdictRecruitPatterns`, `handleEdictTextForRecruit`, `crystallizePendingCharacter`, `addPendingCharacter`, `scanMentionedCharacters`, `wrapPendingName`, `decoratePendingInDom`, `purgeBlacklistedCharacters`.
- Historical profile helpers: `HISTORICAL_CHAR_PROFILES`, `listProfilesByDynasty`, `listProfilesByRole`, `createCharFromProfile`, `loadHistoricalCharsFromScenario`.

UI boundary:

- `renderCharResourcesSection`, `_charConfiscate`, and `_charInspect` are character UI helpers with inline HTML handler dependencies.
- Keep these globals through Phase 5. If exposed early, prefer a nested UI surface such as `TM.Char.ui` or defer to P5-zeta `TM.UI`, but do not flatten them into core `TM.Char`.

Historical waves:

- `tm-char-historical-wave-01..12.js` are data-only extension files.
- Each wave assigns into `global.HISTORICAL_CHAR_PROFILES` with `Object.assign`.
- Do not create one facade per wave; the public surface is the shared profile table plus the helpers in `tm-char-historical-profiles.js`.

## Proposed P5-beta Implementation After P5-alpha

- Add namespace facade entries only; do not move behavior yet.
- Preserve all current window/global aliases through Phase 5.
- Keep duplicate method names nested under subobjects. Do not flatten `initialize`, `reset`, or `tick`.
- Suggested shape:
  - `TM.NPC.engine`
  - `TM.NPC.interactions`
  - `TM.NPC.decision`
  - `TM.NPC.behaviors`
  - `TM.NPC.personality`
  - `TM.NPC.legacy`
  - `TM.Char.schema`
  - `TM.Char.economy`
  - `TM.Char.arcs`
  - `TM.Char.autogen`
  - `TM.Char.historical`
  - optional `TM.Char.ui`

## Suggested Smoke Gate

- Assert `TM.NPC` and `TM.Char` exist after `tm-namespaces.js`.
- Assert legacy globals are still functions/objects.
- Assert facade references point at the same legacy implementations, for example `TM.NPC.engine.runEngine === NpcEngine.runEngine`.
- Assert `TM.Char.schema.ensureAll === CharFullSchema.ensureAll`, `TM.Char.economy.tick === CharEconEngine.tick`, and `TM.Char.arcs.buildForSysP === CharArcs.buildForSysP`.
- Assert historical waves expanded `HISTORICAL_CHAR_PROFILES` beyond the base profile file.
- Assert UI onclick globals `_charConfiscate` and `_charInspect` remain functions.
- Do not call AI-backed autogen methods in smoke; only validate exposure and aliases.

## Risks

- `tm-npc-engine.js` is not a clean ownership file. It mixes NPC behavior, interaction registry, fiscal hierarchy, territory production, and UI/debug helpers.
- Several public names are generic (`initialize`, `reset`, `tick`). Facades should keep them nested to avoid ambiguity.
- Character autogen functions can call AI. Namespace smoke must not invoke those paths.
- If P5-alpha moves `tm-namespaces.js` earlier in the load chain, P5-beta should use lazy getters or tolerate missing globals during boot.

## Implementation Result

Implemented on 2026-05-04 after Claude's P5-alpha completion.

- `tm-namespaces.js` now defines `_buildWindowRefGroup()` and `_defineWindowAlias()`.
- `TM.NPC` now has `engine`, `interactions`, `decision`, `behaviors`, `personality`, and `legacy`.
- `TM.Char` now has `schema`, `economy`, `arcs`, `autogen`, `historical`, and `ui`.
- No legacy `window.*` alias was removed.
- `CentralizationSystem` and `TerritoryProductionSystem` were deliberately excluded from `TM.NPC`.
- `scripts/smoke-p5-beta-npc-char.js` locks the facade boundary with 67 assertions.
- Full `node scripts\verify-all.js` passed 41/41.
