# Tianming AI Memory v6 Foundation Compendium

Date: 2026-05-31

## Executive Summary

This sixth-round research pass reframes Tianming's AI memory work from "make the model remember more" to "build a memory operating layer that can be traced, tested, edited, and replayed."

The minimum executable kernel is:

```text
Append-only Event Ledger
+ MemoryEnvelope facade
+ WorldTruth projection
+ MemoryWriteGate
+ RetrievalComposer
+ MemoryTrace
```

The first implementation phase should be `traceOnly`: observe current AI calls, recall paths, prompt composition, and injected memories without changing prompt behavior, retrieval ordering, or write outcomes.

The main conclusion is deliberately conservative:

- Do not build a bigger vector database as the foundation.
- Do not let summaries, reflections, embeddings, or graph edges become truth.
- Do not let NPCs read omniscient global memory.
- Do not wire new memory into production prompts until trace, goldens, old-save compatibility, stale rejection, leakage tests, and deletion residual tests exist.

## Research Method

This report extends the previous v3, v4, and v5 research dossiers. In this round, the main thread continued live source research while rolling sub-agents ran under the observed platform concurrency limit of six agents at a time.

Sixth-round additions covered:

- Cognitive architectures and human memory theory.
- Schema-grounded write paths and belief modeling.
- Retrieval, reranking, context budget, and prompt placement.
- Roleplay product memory design.
- Safety, privacy, poisoning, and governance.
- Tianming-specific architecture audit.
- Memory evaluation and golden cases.
- Chinese historical names, offices, places, eras, and document genres.
- Event-sourced ledger engineering, bitemporal data, hash chains, projection rebuild, and deletion.
- MemoryTrace and observability standards.
- Player, creator, and designer UX.
- Final Memory Constitution synthesis.

The third v6 wave was launched to widen the final pass: production memory frameworks, authority/visibility adjudication, prompt lanes, local-first implementation, code hook exploration, and red-team critique.

## Core Thesis

AI memory for Tianming is not a single feature. It is a contract between:

- deterministic game truth,
- player and designer intent,
- NPC subjective knowledge,
- historical/narrative continuity,
- retrieved evidence,
- prompt construction,
- and model-generated prose.

The memory system should behave more like a court archive, secret file room, intelligence bureau, and chronicle office than a chatbot memory box.

## Memory Is Not One Thing

The research repeatedly converges on a simple warning: "memory" is too broad a word. Tianming should separate at least these memory classes.

| Class | Meaning | Authority | Typical Use |
|---|---|---:|---|
| `hard_state` | Engine/system/player/designer adjudicated state | Highest | offices, grain, treasury, laws, territory |
| `episodic_event` | Raw or typed events that happened or were observed | High if source-backed | battles, meetings, edicts, promises |
| `semantic_fact` | Structured fact projected from events | High/medium | "X currently holds office Y" |
| `belief` | A subject's view of the world | Medium/subjective | "Minister A believes General B betrayed him" |
| `rumor` | Reported claim with low or contested authority | Low | faction gossip, enemy propaganda |
| `commitment` | Future-facing promise, order, debt, deadline | High if source-backed | "relief grain promised before autumn" |
| `relationship` | Edge between people/factions/places/events | Medium | loyalty, kinship, vendetta, patronage |
| `summary` | Derived compression for humans/models | Low as truth | chronicle, arc summary |
| `reflection` | AI-generated interpretation or lesson | Low | "this tactic failed twice" |
| `procedural` | Reusable workflow or strategy | Low/medium | relief process, negotiation habit |
| `trace` | Record of memory use and model context | Audit | why memory was injected |

The key rule is that every derived class must preserve backpointers to source events. Summaries and reflections are useful only if they are rebuildable and correctable.

## Academic Foundations

### Cognitive Architectures

ACT-R, Soar, the Common Model of Cognition, and CoALA all point toward modular memory rather than a single text store.

Sources:

- [ACT-R official site](https://act-r.psy.cmu.edu/)
- [Anderson et al. 2004](https://pubmed.ncbi.nlm.nih.gov/15482072/)
- [Soar manual](https://soar.eecs.umich.edu/soar_manual/)
- [Laird 2022 Soar](https://arxiv.org/abs/2205.03854)
- [Common Model of Cognition](https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/2744/0)
- [CoALA](https://arxiv.org/abs/2309.02427)

Useful translation for Tianming:

- Working memory is the current turn's activated focus.
- Episodic memory is the event ledger.
- Semantic memory is structured projections and stable facts.
- Procedural memory is reusable action knowledge.
- Prospective memory is commitments, deadlines, future triggers, and pending intentions.

### Complementary Learning Systems

Complementary Learning Systems separates fast episodic learning from slow semantic abstraction.

Source:

- [McClelland, McNaughton, and O'Reilly 1995](https://web.stanford.edu/~jlmcc/papers/McCMcNaughtonOReilly95.pdf)

Tianming should follow the same rhythm:

```text
event first -> typed claim/fact -> validated projection -> optional summary/reflection
```

New events should not be immediately collapsed into broad character summaries. The original episode must survive.

### Source Monitoring and Reconstructive Memory

Human memory research is useful because it warns that remembered content without source is dangerous.

Sources:

- [Johnson, Hashtroudi, and Lindsay source monitoring](https://memlab.yale.edu/sites/default/files/files/1993_Johnson_Hashtroudi_Lindsay_PsychBull.pdf)
- [Baddeley episodic buffer](https://pubmed.ncbi.nlm.nih.gov/11058819/)
- [Diekelmann and Born consolidation](https://www.nature.com/articles/nrn2762)

Tianming should preserve:

- who observed a claim,
- where it came from,
- when it was learned,
- whether it was direct observation, report, inference, rumor, system fact, or summary,
- and which actor is allowed to know it.

NPC bias can be narratively useful, but bias belongs in subjective belief and generated speech, not in the authoritative event layer.

## LLM Memory Research Map

### Foundational Agent Memory

Sources:

- [Generative Agents](https://arxiv.org/abs/2304.03442)
- [MemGPT](https://arxiv.org/abs/2310.08560)
- [MemoryBank](https://arxiv.org/abs/2305.10250)
- [A Survey on the Memory Mechanism of LLM-based Agents](https://arxiv.org/abs/2404.13501)
- [Memory for Autonomous LLM Agents](https://arxiv.org/abs/2603.07670)

The useful pattern is a loop:

```text
observe -> write/manage -> retrieve -> reason/act -> update -> audit
```

For Tianming this loop must be wrapped by game authority, visibility, staleness, and traceability.

### Schema-Grounded Memory

Source:

- [From Unstructured Recall to Schema-Grounded Memory](https://arxiv.org/abs/2604.27906)

The central shift is from text recall to structured memory. Exact fields, current state, updates, deletion, aggregation, relations, negative queries, and explicit unknowns should be first-class.

Implication:

```text
LLM extraction can propose candidates.
Schema validation and authority policy decide what becomes memory.
```

### Temporal Graph Memory

Sources:

- [Zep / Graphiti paper](https://arxiv.org/abs/2501.13956)
- [Graphiti docs](https://www.getzep.com/platform/graphiti/)
- [AriGraph](https://arxiv.org/abs/2407.04363)
- [A-MEM](https://arxiv.org/abs/2502.12110)

Temporal graph memory is useful for people, factions, offices, places, rumors, and relationships. It should not replace the ledger.

Recommended rule:

```text
Ledger is source of truth.
Graph is a rebuildable projection.
```

### Retrieval and Reranking

Sources:

- [RAG](https://arxiv.org/abs/2005.11401)
- [DPR](https://arxiv.org/abs/2004.04906)
- [BM25 and Beyond](https://www.ccs.neu.edu/home/vip/teach/IRcourse/IR_surveys/robertson_foundations.pdf)
- [Reciprocal Rank Fusion](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)
- [ColBERT](https://arxiv.org/abs/2004.12832)
- [Anthropic Contextual Retrieval](https://www.anthropic.com/research/contextual-retrieval)
- [RAPTOR](https://arxiv.org/abs/2401.18059)
- [GraphRAG](https://microsoft.github.io/graphrag/)
- [MemReranker](https://arxiv.org/abs/2605.06132)
- [Lost in the Middle](https://arxiv.org/abs/2307.03172)
- [Long Context vs RAG](https://arxiv.org/abs/2501.01880)

Recommended retrieval pipeline:

```text
Request
-> ActorScope
-> QueryPlan
-> HardFilters(save/world/actor/visibility/deletion/stale/authority)
-> CandidateSearch(BM25 + dense + graph + temporal)
-> Fusion/Rerank
-> BudgetPack
-> Inject or NoEvidenceAbstain
-> MemoryTrace
```

Hard filters must run before vector relevance. Similarity cannot adjudicate fact.

### Stale Memory and Update Handling

Sources:

- [STALE](https://arxiv.org/abs/2605.06527)
- [Useful Memories Become Faulty When Continuously Updated by LLMs](https://arxiv.org/abs/2605.12978)

Tianming needs:

- `validFrom`
- `validTo`
- `assertedAt`
- `learnedAt`
- `supersedes`
- `supersededBy`
- `invalidates`
- `invalidatedBy`
- `status`
- `contradictionGroup`

Old facts should become history, not disappear or keep injecting as current truth.

### Multi-Party Memory

Source:

- [GroupMemBench](https://arxiv.org/abs/2605.14498)

Tianming is a multi-party, multi-faction world. Every memory needs speaker, observer, audience, owner, faction scope, known-by, withheld-from, and perspective fields.

Group scenes should be tested separately from dyadic dialogue.

## Roleplay and Game Memory Systems

### Product Patterns

Sources:

- [AI Dungeon Plot Essentials](https://help.aidungeon.com/faq/plot-essentials)
- [AI Dungeon Story Cards](https://help.aidungeon.com/faq/story-cards)
- [AI Dungeon Memory System](https://help.aidungeon.com/faq/the-memory-system)
- [NovelAI Story Settings](https://docs.novelai.net/en/text/editor/storysettings/)
- [NovelAI Lorebook](https://docs.novelai.net/en/text/lorebook/)
- [SillyTavern World Info](https://docs.sillytavern.app/usage/core-concepts/worldinfo/)
- [SillyTavern Summarize](https://docs.sillytavern.app/extensions/summarize/)
- [SillyTavern Data Bank](https://docs.sillytavern.app/usage/core-concepts/data-bank/)
- [Agnai Memory Books](https://agnai.guide/docs/memory/memory-books.html)
- [Agnai Embeds](https://agnai.guide/docs/memory/embeddings.html)
- [RisuAI Lorebook](https://github.com/kwaroran/RisuAI/wiki/Lorebook)
- [Luker Memory Graph](https://luker.cups.moe/features/memory-graph.html)

Mature roleplay systems split memory into:

- permanent setting,
- current plot summary,
- triggered lore,
- event memory,
- NPC/relationship/location state,
- rules/state handled outside the LLM,
- and user-editable controls.

The best design lesson is that context placement is part of memory semantics. A memory's meaning depends on whether it is injected as system rule, canon, current state, evidence, rumor, relationship context, style note, or low-authority reflection.

### Interactive Narrative Precedent

Sources:

- [Ink tutorial](https://www.inklestudios.com/ink/web-tutorial/)
- [Ink runtime docs](https://github.com/inkle/ink/blob/master/Documentation/RunningYourInk.md)
- [Talk of the Town knowledge phenomena](https://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter37_Simulating_Character_Knowledge_Phenomena_in_Talk_of_the_Town.pdf)

Interactive narrative already separates text from state. The LLM should not own state. It should narrate, interpret, negotiate, and propose actions inside structured constraints.

Talk of the Town is especially relevant: NPC belief strength, contradictory candidate beliefs, source affinity, and controlled misremembering are all game-design tools.

## Chinese Historical Requirements

Tianming has requirements that generic roleplay memory systems do not cover.

Sources:

- [CBDB](https://cbdb.hsites.harvard.edu/)
- [CBDB API](https://input.cbdb.fas.harvard.edu/cbdbapi/index.html)
- [CHGIS](https://chgis.fas.harvard.edu/)
- [CHGIS placename search](https://chgis.fas.harvard.edu/search/)
- [DILA authority databases](https://authority.dila.edu.tw/)
- [DILA date query API](https://authority.dila.edu.tw/docs/services/date_query.php)
- [DILA open content](https://authority.dila.edu.tw/docs/open_content/download.php)
- [CHisIEC](https://arxiv.org/abs/2403.15088)
- [Bingenheimer 2015 ancient Chinese NER](https://link.springer.com/article/10.1186/s40655-015-0007-3)

### Required Entities

```yaml
HistoricalEntity:
  id
  type: person | place | office | institution | era | title | document | event
  canonicalName
  dynastyScope
  validFrom
  validTo
  authorityIds
  confidence
  sourceRefs

Alias:
  entityId
  text
  normalizedText
  aliasType: name | courtesy | art | room | ranking | temple | posthumous | reign | taboo | common | translated | office | oldPlaceName
  script
  validFrom
  validTo
  tabooOf
  searchable
  writeProtected

TimeExpression:
  rawText
  system: reign | ganzhi | lunar | julian | gregorian | relative | seasonal
  dynasty
  emperor
  eraName
  eraYear
  ganzhiYear
  lunarMonth
  leapMonth
  lunarDay
  ceStart
  ceEnd
  ambiguity

OfficePost:
  personId
  officeId
  institutionId
  placeId
  rank
  civilMilitary
  appointmentType
  validFrom
  validTo
  predecessorId
  successorId

PlaceInstance:
  chgisId
  name
  featureType
  parentPlaceId
  geometryRef
  seatPoint
  validFrom
  validTo
  changeType

SourceOccurrence:
  sourceRef
  textSpan
  rawText
  candidateEntityIds
  chosenEntityId
  confidence
```

### Chinese-Specific Rules

- NER produces occurrences, not facts.
- Exact ID and authority aliases should precede vector recall.
- Reign names, sexagenary years, lunar dates, and parallel regimes must normalize to intervals with ambiguity.
- Temple/posthumous names should not be used before death.
- Single-character aliases should not become active retrieval keys without strong context.
- Offices are not tags; they need institution, rank, jurisdiction, period, appointment type, and term.
- Places need time-sliced aliases and administrative hierarchy.
- Document genre controls visibility: memorial, secret memorial, edict, decree, gazette, chronicle, private letter, frontier report.

## Memory Constitution v6

### Ten Non-Negotiable Rules

1. World truth outranks generated artifacts.
2. Raw events are not overwritten.
3. Every active memory must be traceable to source refs, derivation, and content hash.
4. Scope, visibility, deletion, stale, and authority gates run before relevance.
5. NPCs cannot read omniscient memory.
6. AI writes default to draft or quarantine.
7. Stale, superseded, deleted, and rumor records do not inject as current facts by default.
8. Every injected memory must be explainable.
9. Forgetting and deletion must cascade to derived artifacts.
10. No trace, goldens, old-save compatibility, and leakage tests means no production memory injection.

### Authority Ladder

```text
5 engine_state / deterministic system rule
4 player adjudication / designer seed / confirmed canon
3 rule-validated summary / accepted AI result
2 NPC observation / memorial / report / faction intelligence
1 rumor / external import / low-trust source
0 draft / candidate / reflection / unaccepted generation
```

### Default Injection Rules

| Status | Default Current-Fact Injection |
|---|---|
| `active` | allowed if scope/visibility/authority pass |
| `draft` | no, except designer review |
| `quarantined` | no |
| `rumor` | no as fact; allowed only in gossip/rumor lane |
| `stale` | no as current fact |
| `superseded` | no as current fact; may inject as history |
| `redacted` | no body injection |
| `deleted_tombstone` | no body injection |
| `archived` | only by explicit historical query |

## Minimum Data Model

### MemoryEvent

```yaml
MemoryEvent:
  eventId
  eventType
  schemaVersion
  streamId
  seq
  worldId
  saveId
  turnId
  actorKind
  actorId
  targetType
  targetId
  happenedAtGameTime
  observedAt
  recordedAtSystemTime
  payloadHash
  prevHash
  hash
  idempotencyKey
  traceId
  causationId
  correlationId
  redactionOf
```

### MemoryEnvelope

```yaml
MemoryEnvelope:
  id
  schemaVersion
  projectionVersion
  eventId
  kind
  lane
  worldId
  saveId
  sceneId
  turnId
  ownerScope
  ownerId
  readScope
  writeScope
  authority
  visibility
  status
  reviewStatus
  body
  safeBody
  rawExcerpt
  sourceRefs
  derivedFrom
  validFrom
  validTo
  learnedAt
  recordedAt
  supersedes
  supersededBy
  invalidates
  invalidatedBy
  contradictionGroup
  entities
  aliases
  locations
  offices
  factions
  confidence
  sourceReliability
  importance
  trustTier
  sensitivity
  injectionScore
  riskTags
  deletionState
  promptPolicy
  retrievalStats
  extractorVersion
  promptTemplateVersion
  rulesetHash
  embeddingModelId
  contentHash
```

### MemoryTrace

```yaml
MemoryTrace:
  requestId
  traceId
  turnId
  subcall
  actorScope
  queryPlan
  hardFilters
  retrieverSpans
  candidates
  rejected
  injected
  scoreParts
  tokenCost
  cropReason
  noEvidenceDecision
  promptHash
  latencyMs
  featureFlags
  versions
```

### Minimum Tables

```text
event_ledger
memory_item
memory_source_ref
memory_edge
memory_entity
world_truth_projection
memory_trace_events
memory_audit_events
projection_checkpoint
```

FTS, vector, graph, summaries, and prompt previews are sidecars. They must be rebuildable or explicitly marked non-rebuildable with encrypted payload references and deletion receipts.

## State Machines

### Write State Machine

```text
RawEvent / ModelOutput / PlayerText
-> Candidate
-> SchemaValidation
-> SourceClassification
-> AuthorityScopeAssignment
-> InjectionPrivacySensitivityScan
-> ConflictStaleDuplicateCheck
-> Decision

Decision:
  engine/system verified -> Active
  clean AI/player extraction -> Draft
  low trust / conflict / prompt injection risk -> Quarantine
  duplicate -> Merged
  invalid -> Rejected

Active:
  -> Superseded
  -> Stale
  -> Archived
  -> Redacted
  -> DeletedTombstone
```

### Retrieval State Machine

```text
Request
-> ActorScope
-> QueryPlan
-> HardFilters
-> CandidateSearch
-> Rerank
-> BudgetPack
-> Inject or NoEvidenceAbstain
-> MemoryTrace
```

## Event Ledger Engineering

Sources:

- [Martin Fowler Event-Driven/Event Sourcing](https://martinfowler.com/articles/201701-event-driven.html)
- [Microsoft Event Sourcing Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)
- [CloudEvents spec](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [XTDB bitemporal docs](https://docs.xtdb.com/about/time-in-xtdb.html)
- [Trillian](https://google.github.io/trillian/)
- [RFC 6962 Certificate Transparency](https://www.rfc-editor.org/rfc/rfc6962)
- [Marten projection rebuild](https://martendb.io/events/projections/rebuilding)
- [eventsourcing projection tracking](https://eventsourcing.readthedocs.io/en/v9.4.1/topics/projection.html)
- [Akka schema evolution](https://doc.akka.io/libraries/akka-core/current/persistence-schema-evolution.html)
- [Axon upcasting](https://docs.axoniq.io/axon-framework-reference/main/events/event-versioning/)
- [Confluent schema evolution](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html)
- [NIST SP 800-88 Rev.2](https://csrc.nist.gov/pubs/sp/800/88/r2/final)

Engineering rules:

- Append-only; correction and erasure are events.
- Per-stream optimistic concurrency through stream version.
- Global or shard-level deterministic order through sequence.
- Bitemporal separation of world-valid time and system-recorded time.
- Canonical hashes, previous hash chain, and optional Merkle roots.
- PII should live in encrypted sidecars, not ledger body.
- Projection checkpoints and writes must be atomic.
- Projection rebuilds should be shadowed and compared before cutover.
- Roll back projection/writer code, not ledger history.

## MemoryTrace Standard

Sources:

- [OpenTelemetry Traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/)
- [OpenInference](https://arize-ai.github.io/openinference/spec/)
- [LangSmith run data format](https://docs.langchain.com/langsmith/run-data-format)
- [Langfuse data model](https://langfuse.com/docs/observability/data-model)
- [Phoenix tracing](https://arize.com/docs/phoenix/learn/tracing)
- [Promptfoo Tracing](https://www.promptfoo.dev/docs/tracing/)
- [MemTrace](https://arxiv.org/abs/2605.28732)

MemoryTrace should be OTLP-compatible but add `memory.*` semantic fields.

Four trace families are required:

- Retrieval trace.
- Write trace.
- Injection trace.
- Delete trace.

Raw prompt and memory bodies should not be exported as ordinary span attributes. Use:

- content hash,
- encrypted content reference,
- safe excerpt,
- redaction status,
- token count,
- policy version.

## Prompt Lanes

Prompt placement is part of the memory mechanism. NovelAI, SillyTavern, AI Dungeon, and related systems all expose some combination of trigger, insertion order, placement, budget, context preview, and memory inspection. Lost-in-the-Middle findings also mean that important memory cannot be dumped into arbitrary middle context.

Sources:

- [NovelAI Lorebook](https://docs.novelai.net/en/text/lorebook/)
- [SillyTavern World Info](https://docs.sillytavern.app/usage/core-concepts/worldinfo/)
- [SillyTavern Data Bank](https://docs.sillytavern.app/usage/core-concepts/data-bank/)
- [SillyTavern Chat Vectorization](https://docs.sillytavern.app/extensions/chat-vectorization/)
- [AI Dungeon Memory System](https://help.aidungeon.com/faq/the-memory-system)
- [LangChain short-term memory](https://docs.langchain.com/oss/python/langchain/short-term-memory)
- [LangChain LongContextReorder](https://api.python.langchain.com/en/latest/community/document_transformers/langchain_community.document_transformers.long_context_reorder.LongContextReorder.html)
- [Lost in the Middle](https://arxiv.org/abs/2307.03172)

For a 32k-context model, Tianming should not plan to fill the whole prompt. A practical main-prompt target is 16k-18k tokens, leaving room for provider differences, tool/schema overhead, repair/retry, and output.

Initial prompt lanes:

| Lane | Purpose | Authority | Budget Guidance |
|---|---|---:|---:|
| `L0_system_contract` | output format, safety, no fabrication, schema core | 100 | 900-1400 |
| `L1_world_truth` | current hard state: time, ruler, offices, life/death, geography, finance, military numbers | 95 | 2500-3500 |
| `L2_active_law_commitment` | continuing edicts, commitments, policies, unfinished tasks | 90 | 1200-1800 |
| `L3_actor_scope_visibility` | current subcall visibility and scope | 88 | 500-900 |
| `L4_current_turn_input` | player edict, memorial, current action, recent interaction | 85 | 1500-2500 |
| `L5_recent_state_delta` | recent structured changes and world snapshot | 75 | 1200-2000 |
| `L6_retrieved_evidence` | selected FTS/RAG/graph evidence with source, turn, confidence | 70 | 1800-3000 |
| `L7_actor_memory` | NPC/faction relationship, grievance, cognition, private memory | 65 | 1200-2200 |
| `L8_narrative_threads` | foreshadowing, crises, story arcs, historical recap | 55 | 1000-1800 |
| `L9_style_tone` | style, register, narrative rhythm | 35 | 300-700 |
| `L10_debug_trace` | traceOnly metadata | 0 | 0 injected |

TraceOnly should record lane, position, token estimate, source ids, injected reason, crop reason, and whether the current system lacks enough metadata to explain the placement.

Recommended placement:

- Put stable `L0` and compact `L1` near the beginning.
- Put `L4` early so old memory does not bury the current player action.
- Use the middle for sacrificial lower-authority summaries and narrative threads.
- Sandwich high-value evidence: top 1-2 after current input, top 3-4 near final instruction, low-value items in the middle or dropped.
- Put active commitments and final "use evidence / abstain if no evidence" instructions near the end.

TraceOnly should watch:

- `lane_manifest`: authority, limit, used, items, dropped, reason.
- `prompt_diff`: old prompt vs lane prompt length, repetition, movement.
- `pollution_flags`: summary-as-fact, hidden scope leak, stale fact without supersede.
- `budget_pressure`: which lane squeezed which other lane.
- `lost_middle_risk`: important item in 35%-65% prompt region.
- `cache_churn`: dynamic context entering stable system prefix.
- `used_signal`: output cites or uses injected evidence id/turn.

## Current Tianming Hook Map

Read-only code exploration found a feasible traceOnly path without changing generation behavior.

Primary hook points:

- [web/tm-endturn-ai.js](C:/Users/37814/Desktop/tianming/web/tm-endturn-ai.js:330): endturn AI runtime; `_callEndturnAI` is the main subcall exit.
- [web/tm-endturn-ai.js](C:/Users/37814/Desktop/tianming/web/tm-endturn-ai.js:1241): SC_RECALL data path from `sc0.memoryQueries` through gate, candidate gathering, scoring, and sorting.
- [web/tm-endturn-ai.js](C:/Users/37814/Desktop/tianming/web/tm-endturn-ai.js:1558): `<recalled-memories>` injection.
- [web/tm-endturn-prompt.js](C:/Users/37814/Desktop/tianming/web/tm-endturn-prompt.js:4): main prompt builder and `ctx.prompt` writer.
- [web/tm-prompt-composer.js](C:/Users/37814/Desktop/tianming/web/tm-prompt-composer.js:1): shared prompt composer helpers.
- [web/tm-recall-gate.js](C:/Users/37814/Desktop/tianming/web/tm-recall-gate.js:3): recall gate.
- [web/tm-semantic-recall.js](C:/Users/37814/Desktop/tianming/web/tm-semantic-recall.js:3): local semantic recall index/search.
- [web/tm-memory-tables.js](C:/Users/37814/Desktop/tianming/web/tm-memory-tables.js:3): structured memory tables and AI table ops.
- [web/tm-memory-adapter.js](C:/Users/37814/Desktop/tianming/web/tm-memory-adapter.js:9): memory table adapter.
- [web/tm-memory-anchors.js](C:/Users/37814/Desktop/tianming/web/tm-memory-anchors.js:4): anchors, execution constraints, memory layers.
- [web/tm-ai-infra.js](C:/Users/37814/Desktop/tianming/web/tm-ai-infra.js:121): token usage and diagnostics.
- [web/tm-mechanics.js](C:/Users/37814/Desktop/tianming/web/tm-mechanics.js:1522): NPC memory system.
- [main-impl.js](C:/Users/37814/Desktop/tianming/main-impl.js:1680): turn-data persistence.
- [web/tm-save-lifecycle.js](C:/Users/37814/Desktop/tianming/web/tm-save-lifecycle.js:285): save/restore of AI memory layers and anchors.

TraceOnly should:

- create `GM._turnAiResults.memoryTrace/traceId` each turn,
- wrap `_callEndturnAI` to record subcall id, model/provider, prompt hash, response hash, tokens, latency, parse repair, and errors,
- trace SC_RECALL gate decisions, query, candidate counts, scores, and top hits,
- preserve semantic recall item ids in trace even if prompt output stays unchanged,
- trace `<recalled-memories>` lane/source/length/hash,
- trace prompt assembly sections and prompt hash,
- trace AI memory table operations by sheet code rather than row index,
- persist through `GM._turnAiResults.memoryTrace` into `ai-results.json`.

Risk controls:

- Do not rely only on capped diagnostics logs.
- Avoid raw prompt/body logging; use hash, length, id, source, and safe preview.
- Add internal semantic item ids to search traces.
- Expect high volume when RecallGate is disabled.
- Broader non-endturn AI calls may need `callAI/callAIMessages` coverage later.

## Safety and Governance

Sources:

- [AgentPoison](https://arxiv.org/abs/2407.12784)
- [MINJA](https://arxiv.org/abs/2503.03704)
- [Unveiling Privacy Risks in LLM Agent Memory](https://arxiv.org/abs/2502.13172)
- [Hidden in Memory](https://arxiv.org/abs/2605.15338)
- [AgentSys](https://huggingface.co/papers/2602.07398)
- [AgentSentry](https://arxiv.org/abs/2602.22724)
- [Tensor Trust](https://huggingface.co/papers/2311.01011)
- [OWASP LLM Top 10 2025](https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf)
- [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework)
- [NIST Privacy Framework](https://www.nist.gov/privacy-framework)
- [OpenAI Memory FAQ](https://help.openai.com/en/articles/8590148-memory-in-chatgpt)

Required controls:

- AI writes default to draft/quarantine.
- Prompt-injection scanning before writes.
- Actor scope and visibility before retrieval.
- Deletion and redaction events with sidecar cleanup.
- Memory Observatory / Workshop with safe views.
- Red-team cases for hidden prompt injection, fake authority, rumor laundering, stale resurrection, cross-save leakage, deletion residual, and NPC omniscience.

## Evaluation Suite

Sources:

- [LongMemEval](https://github.com/xiaowu0162/LongMemEval)
- [LongMemEval-V2](https://github.com/xiaowu0162/LongMemEval-V2)
- [LoCoMo](https://github.com/snap-research/locomo)
- [STALE](https://arxiv.org/abs/2605.06527)
- [GroupMemBench](https://arxiv.org/abs/2605.14498)
- [StructMemEval](https://arxiv.org/abs/2602.11243)
- [MemoryAgentBench](https://github.com/HUST-AI-HYZ/MemoryAgentBench)
- [MRBench / MREval](https://arxiv.org/abs/2603.19313)
- [ConStory-Bench](https://picrew.github.io/constory-bench.github.io/)

### Capability Categories

- Current state accuracy.
- Stale/update handling.
- Structured memory.
- Multi-actor and multi-perspective memory.
- Roleplay memory: anchoring, recall, bounding, enacting.
- Chinese historical entity/time/office/register handling.
- Evidence and traceability.
- Safety and governance.
- Summary/consolidation drift.
- Cost, latency, and UX.

### Smoke Goldens

The first traceOnly phase should create at least 10 smoke goldens:

1. New edict supersedes old policy.
2. Hidden information does not leak.
3. NPC private knowledge is scoped correctly.
4. Rumor does not become fact.
5. Deleted memory has no residual retrieval.
6. False premise is resisted.
7. Pending commitment is recalled.
8. Summary does not alter critical numbers/causality.
9. Poison text in memorial is not treated as instruction.
10. Every injected memory has trace source, lane, and reason.

### Full Golden Suite

The 50-case suite should cover:

- edict ledger,
- office authority,
- territory/geography,
- faction memory,
- NPC knowledge boundaries,
- rumor graph,
- procedural memory,
- hidden state,
- governance/security,
- consolidation drift.

### Release Gates

- P0 failures block release: hidden leak, cross-save contamination, deletion residual, stale-as-current, hard-state fabrication.
- 10 smoke goldens pass 100%.
- 50 full goldens pass at least 92% overall, at least 85% per category, at least 98% safety/boundary, zero leakage.
- Hard-fact trace hit at least 95%.
- No-evidence abstention at least 95%.
- Stale rejection at least 95%.
- Critical numeric/person/causal summary drift at most 1%.
- Rumor-to-fact drift equals 0.

## Player and Designer Memory Workshop

Sources:

- [Sudowrite Story Bible](https://docs.sudowrite.com/using-sudowrite/1ow1qkGqof9rtcyGnrWUBS/what-is-story-bible/jmWepHcQdJetNrE991fjJC)
- [Sudowrite Visibility Settings](https://docs.sudowrite.com/using-sudowrite/1ow1qkGqof9rtcyGnrWUBS/visibility-settings/4KL8gFeLZP6ep8keUhKVGp)
- [Novelcrafter Codex](https://docs.novelcrafter.com/en/articles/9502548-codex-snippets-faq)
- [Obsidian links](https://obsidian.md/help/links)
- [Obsidian graph view](https://obsidian.md/help/Plugins/Graph%2Bview)
- [Memory Sandbox](https://arxiv.org/abs/2308.01542)

The Workshop should include:

- Overview.
- Draft Inbox.
- Memory Library.
- Lorebook / Setting Book.
- Event Ledger.
- Conflict Review.
- Visibility Review.
- Injection Trace.
- Local graph.
- Archive/Trash.

Minimum controls:

- Accept.
- Edit.
- Merge.
- Reject.
- Pin.
- Freeze.
- Archive.
- Delete.
- Mark false.
- Supersede.
- Review source.
- Preview visibility as NPC/faction/player/GM.
- Open why-this-memory drawer.

## TraceOnly Implementation Plan

### Phase A: Schema Contract

Create JSON schemas for:

- `MemoryEvent`
- `MemoryEnvelope`
- `MemoryTrace`
- `MemorySourceRef`
- `MemoryAuditEvent`

No prompt behavior changes.

### Phase B: Read-Only Projection Adapter

Project current data into read-only MemoryEnvelope-like records:

- existing memory tables,
- event history,
- anchors,
- chronicle/shiji,
- foreshadowing,
- semantic hits,
- NPC memory,
- SC_RECALL outputs,
- prompt composer sections.

No migration yet.

### Phase C: Trace Current Behavior

Add trace/request IDs to:

- every AI subcall,
- SC_RECALL,
- semantic recall,
- prompt composer,
- model call,
- output parser,
- memory write/update jobs.

Record actual injected items and current ordering.

### Phase D: Hypothetical Gates

Compute but do not enforce:

- wouldRejectVisibility,
- wouldRejectStale,
- wouldRejectDeleted,
- wouldRejectAuthority,
- wouldRejectScope,
- wouldRejectNoSource.

Use `unknown_current_path` where current code cannot explain a decision.

### Phase E: Baseline Goldens

Run the 10 smoke goldens and save baseline traces. The purpose is to understand current failure modes before changing behavior.

### Phase F: Exit Conditions

TraceOnly is complete only when:

- 100% AI subcalls have trace IDs.
- 100% injected memories have source/lane/reason or explicit unknown marker.
- Old saves load.
- Smoke goldens have baseline traces.
- No user-visible behavior changed.

## What to Defer

Defer until trace and goldens are stable:

- self-evolving memory,
- RL retrieval,
- learned memory managers,
- heavy graph database as mandatory dependency,
- cloud memory services as core dependency,
- full graph visualizer,
- full sandbox,
- complex emotional salience,
- reconsolidation curves,
- automatic long-summary rewriting without editable rollback,
- specialized NPC skill libraries,
- 3D/VLM/GIS/tactical micro-sim memory.

Ban outright for v6:

- full history prompt stuffing,
- pure vector chat dump as memory,
- LLM direct edits to hard state,
- parameter or fine-tune memory as save-game memory,
- summaries as truth,
- NPC omniscient recall.

## Final Recommendation

Build the foundation in this order:

1. `MemoryTrace` traceOnly around existing behavior.
2. Read-only `MemoryEnvelope` facade over current records.
3. Baseline smoke goldens and red-team fixtures.
4. Authority/visibility/stale/delete gates in observe-only mode.
5. Memory Workshop minimal views: Injection Trace, Draft Inbox, Conflict Review.
6. Append-only event ledger for new memory operations.
7. WorldTruth projection and structured Chinese historical entity/time/office modeling.
8. WriteGate enforcement for AI-generated candidate memories.
9. RetrievalComposer enforcement.
10. Only then consider graph/embedding/reranker upgrades.

The foundation is not "more memory." It is reliable causality: the system knows what happened, who knows it, why it believes it, whether it is still valid, why it was injected, and how to correct or delete it.

## Local-First Implementation Baseline

The first implementation should stay boring on purpose.

Recommended minimum stack:

- SQLite as local source of truth.
- FTS5 for exact names, offices, places, edicts, paths, and Chinese lexical recall.
- JSONL for append-only audit/export events.
- Background embedding worker.
- Optional `sqlite-vec` semantic sidecar.
- Backup manifest with schema version, app version, embedding model, dimension, file checksums, and row counts.

Sources:

- [SQLite FTS5](https://www.sqlite.org/fts5.html)
- [SQLite Backup API](https://www.sqlite.org/backup.html)
- [SQLite WAL](https://www.sqlite.org/wal.html)
- [sqlite-vec](https://github.com/asg017/sqlite-vec)
- [JSON Lines](https://jsonlines.org/)
- [MDN Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [LanceDB](https://docs.lancedb.com/quickstart)
- [Qdrant client local mode](https://github.com/qdrant/qdrant-client)

MVP performance targets:

| Item | Budget |
|---|---:|
| memory items | 1k-50k |
| chunks | 5k-200k |
| local hot retrieval | under 150 ms |
| local cold retrieval | under 500 ms |
| main DB write | under 50 ms |
| final injected evidence | 5-12 items |
| ordinary turn injected memory budget | under 1500 tokens |

Backup format:

```text
memory-backup-YYYY-MM-DD.zip
  manifest.json
  memory.sqlite
  events.jsonl.gz
  blobs/
  checksums.sha256
```

Do not begin with mandatory Qdrant/LanceDB/GraphRAG. Those are scale upgrades after trace, goldens, and local baseline bottlenecks are visible.

## Borrow, Do Not Bind

Production memory frameworks are useful as design pressure tests, but none should become Tianming's core truth store.

Useful references:

- [Letta MemGPT architecture](https://docs.letta.com/guides/agents/architectures/memgpt)
- [MemGPT](https://arxiv.org/abs/2310.08560)
- [Mem0 memory operations](https://docs.mem0.ai/core-concepts/memory-operations)
- [OpenMemory](https://mem0.ai/openmemory)
- [Zep / Graphiti](https://www.getzep.com/platform/graphiti/)
- [Graphiti GitHub](https://github.com/getzep/graphiti)
- [LangMem guide](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/)
- [LangGraph long-term memory](https://docs.langchain.com/oss/python/langchain/long-term-memory)
- [LlamaIndex Memory](https://docs.llamaindex.ai/en/stable/module_guides/deploying/agents/memory/)
- [CrewAI Memory](https://docs.crewai.com/concepts/memory)
- [Cognee](https://www.cognee.ai/)
- [Honcho](https://docs.honcho.dev/)
- [Supermemory](https://docs.supermemory.ai/memory-api/overview)

Borrow:

- Letta/MemGPT's separation of working context and archival recall.
- Zep/Graphiti's temporal facts, invalidation, provenance, and hybrid retrieval.
- LangMem's classification dimensions: duration, type, scope, update strategy, retrieval, permissions.
- Mem0/OpenMemory's explicit operations: add, search, update, delete, and access history.
- Honcho's peer/session boundaries for multi-subject memory.
- LlamaIndex's short-term-to-long-term block analogy.

Do not bind:

- hosted memory services as required infrastructure,
- a graph database as the only truth store,
- framework runtime as the game engine root,
- pure vector memory,
- or LLM summaries as canonical truth.

## Scope Control

v6 Constitution is an architectural constraint, not a first-phase engineering checklist.

First implementation should prove value with a small slice:

1. Inventory current prompt injection paths.
2. Add traceOnly for actual injected items, SC_RECALL, and semantic recall.
3. Build 10 smoke fixtures and capture baseline traces.
4. Add read-only Envelope facade for current high-frequency memory records.
5. Log `wouldReject` diagnostics for visibility, stale, deleted, and authority.
6. Enforce one real gate first: hidden information cannot enter NPC prompts.
7. Route AI-generated new memories to draft/quarantine only.
8. Add a minimal why-this-memory view.

Envelope v0 should be intentionally small:

```yaml
id
type
body
sourceRefs
status
authority
visibility
turn
entities
lane
reason
extra
```

State v0 can start with:

```text
active
draft
stale
quarantined
deleted_tombstone
```

Visibility v0 can start with:

```text
world_truth
player_known
faction_private
npc_private
gm_hidden
```

If a governance field cannot be populated reliably, treat it as diagnostic. Incomplete metadata must not create a false sense of safety.
