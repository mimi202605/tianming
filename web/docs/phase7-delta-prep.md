# Phase 7 delta prep: `tm-endturn-ai.js`

date: 2026-05-04  
status: read-only prep; no runtime code moved  
owner: Codex future slice P7-delta

## Scope

Target future module: `tm-endturn-ai.js`.

Semantic scope:

- subcall infra: token/body/truncate helpers, `_maybeCacheSys`, `_runSubcall`, `_runSubcallBatch`, post-turn queue helpers
- main AI subcalls: `sc0`, `sc05`, `sc1`, `sc1b`, `sc1c`
- merged output handoff to apply: final `p1` after `sc1b/sc1c` merge and G2 fallback

Current line markers:

- helper strip begins before the `§2` marker: `_effectiveOutCap`, `_tok`, `_buildFetchBody`, `_truncatedOnce`, `_checkTruncated` are around L3132-L3164
- actual `§2` marker: around L3246-L3401
- actual `§3` marker: around L3402-L5777
- actual `§4` marker begins around L5778

Implementation warning: do not move the whole L3132-L3244 tail blindly. That range is mixed:

- subcall infra owns token/truncate/model helpers
- prompt module still owns prompt tail work such as memory summary injection, hallucination firewall, prompt-layer cache, and `sysP` truncation

## Required contract addendum

The current `phase7-ctx-contract.md` must add `ctx.prompt.tp`.

Reason: current `tp` is created in `§1` around L57 and appears hundreds of times across later subcalls. P7-delta cannot be implemented cleanly if only `ctx.prompt.sysP` is passed.

Suggested shape:

```js
ctx.prompt = {
  sysP: '',
  tp: '',
  shizhengji: '',
  zhengwen: '',
  playerStatus: '',
  playerInner: '',
  turnSummary: '',
  lifecycleBlock: ''
};
```

Also add dispatch fields under `ctx.subcalls` or `ctx.meta.ai`:

```js
ctx.subcalls.modelTemp = 0.8;
ctx.subcalls.modelFamily = 'openai';
ctx.subcalls.url = '';
ctx.subcalls._maybeCacheSys = null;
```

Those values are read by `sc1b/sc1c/sc07` and followup calls. Recomputing them in every module would increase drift risk.

## Data flow

Inputs:

- `ctx.input.edicts/xinglu/memRes/oldVars/timeRatio`
- `ctx.prompt.sysP`
- `ctx.prompt.tp`
- durable `GM/P`
- global helper compatibility: `extractJSON`, `fetch`, `TokenUsageTracker`, `ModelAdapter`, `PromptLayerCache`, `checkPromptTokenBudget`, `toast`, `showLoading`

Outputs:

- `ctx.results.sc0`: parsed deep-thinking result, plus current `aiThinking` string compatibility
- `ctx.results.sc05`: parsed memory/review result, plus current `memoryReview` string compatibility
- `ctx.results.sc1`: final merged `p1`
- `ctx.results.sc1b`: parsed `p1b`
- `ctx.results.sc1c`: parsed `p1c`
- `ctx.apply._hardConstraints`: currently built inside `sc1` before `tp1`
- `GM._turnAiResults`: keep current compatibility keys during Phase 7
- `GM._subcallTimings` and `GM._aiDispatchStats`: keep unchanged

## Execution order to preserve

1. Wait previous post-turn jobs and refresh memory before foreground AI work.
2. Run `sc0` and `sc05` in current order.
3. Run `sc1`.
4. Start `sc1b` and `sc1c` after `sc1`, in parallel.
5. Merge `sc1b` output into `p1` fields:
   `cultural_works`, `npc_letters`, `npc_correspondence`, `npc_interactions`.
6. Merge `sc1c` output into `p1` fields:
   `faction_interactions_advanced`, `faction_events`, `faction_relation_changes`, `faction_succession`, `scheme_actions`.
7. Keep immediate side effects from `sc1c`:
   `GM.activeSchemes`, `PhaseD.addFengwen`, `NpcMemorySystem.remember`, and `addEB`.
8. Keep G2 fallback: if `sc1` is missing valid narrative data, synthesize minimal `p1.shizhengji/zhengwen` from `sc1b/sc1c`.
9. Return with final merged `ctx.results.sc1` ready for apply.

## Smoke expectations for P7-delta

P7-beta baseline should already lock this, but P7-delta focused smoke should recheck:

- `_runSubcall` skip behavior by `aiCallDepth`
- retry count: `sc1` gets 2 retries, others get 1
- `GM._aiDispatchStats` and `GM._subcallTimings` are still populated
- `_checkTruncated` only toasts once per turn
- `GM._turnAiResults.subcall1/subcall1b/subcall1c` keys remain
- `sc1b/sc1c` merge does not replace existing `p1` arrays
- G2 fallback still produces minimum `p1.shizhengji` and `p1.zhengwen`

