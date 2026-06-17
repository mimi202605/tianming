# AI Memory Research Findings

This file stores research notes from external sources and local code inspection. External web content is summarized here, not in task_plan.md.

## Source Index
- [Generative Agents: Interactive Simulacra of Human Behavior](https://arxiv.org/abs/2304.03442) - Stanford/Google 2023 agent architecture with observation, memory stream, reflection, planning, reacting.
- [MemGPT: Towards LLMs as Operating Systems](https://arxiv.org/abs/2310.08560) - OS-inspired virtual context management with memory tiers.
- [A Survey on the Memory Mechanism of Large Language Model-based Agents](https://arxiv.org/abs/2404.13501) - agent memory taxonomy and literature survey.
- [Memory Matters: The Need to Improve Long-Term Memory in LLM-Agents](https://ojs.aaai.org/index.php/AAAI-SS/article/view/27688) - argues for explicit procedural, episodic, semantic memory separation.
- [From Human Memory to AI Memory: A Survey on Memory Mechanisms in the Era of LLMs](https://arxiv.org/abs/2504.15965) - broader human-memory-inspired survey.
- [MemoryBank: Enhancing Large Language Models with Long-Term Memory](https://arxiv.org/abs/2305.10250) and [AAAI paper PDF](https://ojs.aaai.org/index.php/AAAI/article/download/29946/31654) - long-term companion memory, summarization, memory strength/forgetting curve.
- [Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory](https://arxiv.org/abs/2504.19413) - production-oriented scalable agent memory, including graph memory variant.
- [Zep: A Temporal Knowledge Graph Architecture for Agent Memory](https://arxiv.org/abs/2501.13956) - temporal knowledge graph memory layer for dynamic cross-session facts.
- [MIRIX: Multi-Agent Memory System for LLM-Based Agents](https://arxiv.org/abs/2507.07957) - modular multi-agent memory with six memory types.
- [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366) - stores verbal feedback/reflections in episodic memory to improve later trials.
- [Voyager: An Open-Ended Embodied Agent with Large Language Models](https://arxiv.org/abs/2305.16291) - Minecraft lifelong-learning agent with an executable skill library.
- [HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models](https://arxiv.org/abs/2405.14831) - graph/hippocampus-inspired RAG for multi-hop recall.
- [A-MEM: Agentic Memory for LLM Agents](https://arxiv.org/abs/2502.12110) - Zettelkasten-inspired dynamic indexing, linking, and memory evolution.
- [LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory](https://arxiv.org/abs/2410.10813) - evaluates information extraction, multi-session reasoning, temporal reasoning, knowledge updates, and abstention.
- [Evaluating Very Long-Term Conversational Memory of LLM Agents / LoCoMo](https://arxiv.org/abs/2402.17753) - long-term multi-session conversational memory benchmark.
- [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172) - shows relevant information placement inside long prompts can strongly affect performance.
- [RULER: What's the Real Context Size of Your Long-Context Language Models?](https://arxiv.org/abs/2404.06654) - synthetic benchmark beyond vanilla needle-in-haystack for long-context retrieval, multi-hop tracing, and aggregation.
- [U-NIAH: Unified RAG and LLM Evaluation for Long Context Needle-In-A-Haystack](https://arxiv.org/abs/2503.00353) - compares long-context LLM use and RAG under harder needle-in-haystack variants.
- [Evaluating Memory Structure in LLM Agents / StructMemEval](https://arxiv.org/abs/2602.11243) - 2026 work-in-progress benchmark for whether agents organize memory into useful structures, not just recall facts.
- [Anatomy of Agentic Memory](https://arxiv.org/abs/2602.19320) - 2026 survey on architecture taxonomy, benchmark fragility, metric sensitivity, and system cost.
- [MemOS: An Operating System for Memory-Augmented Generation in LLMs](https://arxiv.org/abs/2505.22101) and [MemOS: A Memory OS for AI System](https://arxiv.org/abs/2507.03724) - memory as a first-class manageable system resource, with unified representation, scheduling, and lifecycle governance.
- [Memory OS of AI Agent](https://arxiv.org/abs/2506.06326) - hierarchical short/mid/long-term MemoryOS with storage, updating, retrieval, and generation modules; reports LoCoMo gains.
- [MemoRAG: Moving towards Next-Gen RAG Via Memory-Inspired Knowledge Discovery](https://arxiv.org/abs/2409.05591) - dual-system RAG with a long-range "global memory" model that generates clues for retrieval.
- [A Human-Inspired Reading Agent with Gist Memory of Very Long Contexts](https://arxiv.org/abs/2402.09727) - ReadAgent forms memory episodes, compresses them into gist memories, and looks up source text when details are needed.
- [Agentic Memory: Learning Unified Long-Term and Short-Term Memory Management for LLM Agents](https://arxiv.org/abs/2601.01885) - AgeMem exposes store/retrieve/update/summarize/discard as tool actions and learns memory management with RL.
- [MemSkill: Learning and Evolving Memory Skills for Self-Evolving Agents](https://arxiv.org/abs/2602.02474) - learnable/evolvable extraction, consolidation, and pruning skills through controller/executor/designer components.
- [EvoMemBench: Benchmarking Agent Memory from a Self-Evolving Perspective](https://arxiv.org/abs/2605.18421) - evaluates memory by scope and content type; finds no single memory method works consistently.
- [M2PA: A Multi-Memory Planning Agent for Open Worlds Inspired by Cognitive Theory](https://aclanthology.org/2025.findings-acl.1191/) - ACL Findings 2025 open-world Minecraft planning agent with human-like multi-memory systems.
- [MineNPC-Task: Task Suite for Memory-Aware Minecraft Agents](https://arxiv.org/abs/2601.05215) - player-authored benchmark/harness for memory-aware mixed-initiative Minecraft agents, logging plan/action/memory events.
- [PANGeA: Procedural Artificial Narrative Using Generative AI for Turn-Based RPGs](https://ojs.aaai.org/index.php/AIIDE/article/view/31876) - AIIDE 2024 RPG narrative system with memory, validation, Unity plugin, and REST server.
- [Intrinsic Memory Agents](https://arxiv.org/abs/2508.08997) - agent-specific structured contextual memories for heterogeneous multi-agent LLM systems.
- [H2R: Hierarchical Hindsight Reflection for Multi-Task LLM Agents](https://arxiv.org/abs/2509.12810) - separates high-level planning memory from low-level execution memory.
- [LEGOMem: Modular Procedural Memory for Multi-agent LLM Systems](https://arxiv.org/abs/2510.04851) - reusable procedural memory units for orchestrators and task agents.
- [A Machine with Short-Term, Episodic, and Semantic Memory Systems](https://ojs.aaai.org/index.php/AAAI/article/view/25075) - AAAI 2023 cognitive-inspired agent with short-term, episodic, and semantic memory modeled as knowledge graphs.
- [SillyTavern World Info docs](https://docs.sillytavern.app/usage/core-concepts/worldinfo/) - lorebook/world-info keyword and vector-triggered prompt insertion.
- [SillyTavern Data Bank docs](https://docs.sillytavern.app/usage/core-concepts/data-bank/) - document-scoped RAG and Vector Storage behavior.
- [SillyTavern Chat Vectorization docs](https://docs.sillytavern.app/extensions/chat-vectorization/) - retrieves relevant older chat messages and repositions them in context.
- [SillyTavern Summarize docs](https://docs.sillytavern.app/extensions/summarize/) - built-in chat summary memory with warnings about omissions/hallucinations.
- [CharMemory SillyTavern extension](https://github.com/bal-spec/sillytavern-character-memory) - extracts structured character memories into Data Bank markdown for vector retrieval.
- [SillyTavern MemoryBooks](https://github.com/aikohanasaki/SillyTavern-MemoryBooks/blob/main/readme.md) - turns scene/event memories into chat-bound lorebook entries.
- [qvink/SillyTavern-MessageSummarize](https://github.com/qvink/SillyTavern-MessageSummarize) - per-message summary memory with explicit short-term and long-term layers.
- [Agnai Memory docs](https://agnai.guide/docs/memory/) and [Agnai User/Chat Embeds docs](https://agnai.guide/docs/memory/embeddings.html) - manual keyword memory books plus dynamic user/chat embeddings.
- [RisuAI Lorebook wiki](https://github.com/kwaroran/RisuAI/wiki/Lorebook) - lore entries with activation keys and insertion order to reduce unnecessary tokens.
- [VectFox SillyTavern memory extension](https://github.com/KritBlade/VectFox) - event-based long-term memory with structured metadata, Qdrant backend option, hybrid retrieval, CJK tokenization, and LLM-planned multi-angle queries.
- [Honcho SillyTavern integration](https://honcho.dev/docs/v3/guides/integrations/sillytavern) - persistent personalized memory for SillyTavern via client extension plus server plugin, with query/save/search tools and memory partitioning modes.
- [Letta MemGPT architecture docs](https://docs.letta.com/guides/agents/architectures/memgpt) - production version of MemGPT ideas: core memory, recall memory, archival memory, and memory-editing tools.
- [Zep key concepts](https://help.getzep.com/v2/concepts) and [Zep graph docs](https://help.getzep.com/v2/understanding-the-graph) - temporal knowledge graph, fact invalidation, episodic nodes, entity nodes, and relationship edges.
- [LangChain/LangMem memory concepts](https://docs.langchain.com/oss/python/concepts/memory) and [Deep Agents long-term memory](https://docs.langchain.com/oss/python/deepagents/long-term-memory) - semantic/episodic/procedural memory, scopes, update timing, and retrieval modes.
- [PersistBench: When Should Long-Term Memories Be Forgotten by LLMs?](https://arxiv.org/abs/2602.01146) - benchmark for cross-domain leakage and memory-induced sycophancy risks in long-term memory.
- [LongMemEval-V2: Evaluating Long-Term Agent Memory Toward Experienced Colleagues](https://arxiv.org/abs/2605.12493) - environment-experience memory benchmark covering static state, dynamic state, workflows, gotchas, and premise awareness.
- [What Happens Inside Agent Memory?](https://arxiv.org/abs/2605.03354) - circuit analysis of memory write/manage/read failures across mem0 and A-MEM.
- [MemInsight: Autonomous Memory Augmentation for LLM Agents](https://aclanthology.org/2025.emnlp-main.1683/) - EMNLP 2025 autonomous memory augmentation for better semantic representation and retrieval.
- [REMem: Reasoning with Episodic Memory in Language Agent](https://arxiv.org/abs/2602.13530) - ICLR 2026 episodic memory graph with time-aware gists/facts and agentic retrieval.
- [Learning from Supervision with Semantic and Episodic Memory](https://arxiv.org/abs/2510.19897) - reflective memory framework using episodic critiques and semantic task guidance.
- [MemFactory: Unified Inference and Training Framework for Agent Memory](https://arxiv.org/abs/2603.29493) - modular lifecycle framework for constructing/training memory agents.
- [Memory Poisoning Attack and Defense on Memory Based LLM-Agents](https://arxiv.org/abs/2601.05504) - empirical evaluation of memory poisoning and defenses with trust scoring, temporal decay, and sanitization.
- [A-MemGuard: A Proactive Defense Framework for LLM-Based Agent Memory](https://arxiv.org/abs/2510.02373) - consensus-based validation plus dual-memory lessons to reduce self-reinforcing poisoned memories.
- [AgentSys: Secure and Dynamic LLM Agents Through Explicit Hierarchical Memory Management](https://arxiv.org/abs/2602.07398) - hierarchical working-memory isolation to reduce indirect prompt-injection persistence.
- [Remembering More, Risking More](https://arxiv.org/abs/2605.17830) - longitudinal safety risks and temporal memory contamination across unrelated tasks.
- [MemMorph: Tool Hijacking in LLM Agents via Memory Poisoning](https://arxiv.org/abs/2605.26154) - poisoning long-term memory to bias tool selection through disguised technical facts/policies.
- [SuperLocalMemory](https://arxiv.org/abs/2603.02240) - local-first multi-agent memory with SQLite/FTS5, provenance, Bayesian trust scoring, and isolation.
- [A Survey on the Security of Long-Term Memory in LLM Agents](https://arxiv.org/abs/2604.16548) - lifecycle security survey around Write, Store, Retrieve, Execute, Share, Forget/Rollback and governance objectives.

## Academic Memory Mechanisms
- Generative Agents stores natural-language observations in a memory stream, retrieves by recency, importance, and relevance, then periodically creates higher-level reflections. Key lesson for games: memory is not only recall; it feeds planning and believable behavior loops.
- MemGPT frames the context window as scarce "main memory" and external stores as slower memory tiers. Key lesson for Tianming: separate prompt working set from archive storage, and make promotion/eviction explicit instead of stuffing everything into one prompt.
- MemoryBank targets long-running companion dialogue. It uses historical interaction storage, summaries, evolving user/persona models, and memory strength inspired by forgetting curves. Key lesson: roleplay memory needs decay and reinforcement, not permanent equal-weight facts.
- Memory Matters and recent surveys converge on explicit semantic, episodic, and procedural memory. Key lesson: game AI should distinguish world facts, time-stamped events, and learned operating rules/policies.
- Zep and Mem0 represent production-memory direction: memory extraction at write time, scoped retrieval at read time, graph/temporal links, and evaluation on long-conversation benchmarks. Key lesson: retrieval should answer temporal and relational questions, not only nearest-neighbor similarity.
- MIRIX pushes multi-type memory further: Core, Episodic, Semantic, Procedural, Resource Memory, and Knowledge Vault coordinated by agents. It is likely overbuilt for a first Tianming pass, but its taxonomy is useful.
- Reflexion shows a low-cost way to improve agents without model fine-tuning: convert failure/outcome feedback into natural-language reflections and retrieve those reflections in later trials. For a strategy game, this maps to "lessons learned" after bad policies or failed diplomatic/military actions.
- Voyager's skill library treats working procedures as reusable artifacts. For Tianming, the equivalent is not executable Minecraft code but reusable court-action templates, diplomatic tactics, and crisis-response playbooks.
- HippoRAG suggests that purely flat vector search misses multi-hop relationships. The game-memory version should support entity/event links such as official -> faction -> policy -> affected province -> later revolt.
- A-MEM's useful idea is "memory evolution": a new memory can update tags, context, or links on older memories. Tianming already has supersedes/contradicts/continues/elaborates relations in table helpers, so the next step is to make those relations first-class in retrieval and UI.

## Evaluation and Long-Context Lessons
- LongMemEval frames long-term memory as five abilities: extraction, multi-session reasoning, temporal reasoning, knowledge updates, and abstention. Tianming should mirror this with goldens such as "recall old edict", "notice policy reversal", "answer no evidence", "connect official to faction to later revolt".
- LoCoMo shows that very long multi-session dialogue remains hard even with long-context models and RAG. For Tianming, more context is not a sufficient memory solution; curated retrieval and stateful structures still matter.
- Lost in the Middle and RULER warn against trusting raw long prompts. Memory injected in the middle of a giant prompt can be ignored, and vanilla needle tests overstate real ability. Prompt placement, section headings, and budgeted top/bottom summaries are part of memory design.
- U-NIAH reinforces that RAG and long context have different failure modes. Tianming should keep both: deterministic state/current tables in prompt, and archival retrieval for older, sparse, relational evidence.
- StructMemEval is especially relevant to strategy games: ledgers, trees, to-do lists, commitments, and relationship graphs are often better than flat fact snippets. This supports preserving Tianming's table/graph direction instead of replacing it with pure vector memory.
- Anatomy of Agentic Memory highlights under-discussed engineering concerns: latency, throughput, benchmark saturation, judge sensitivity, and model dependence. Tianming needs local diagnostics and simulation tests, not just one benchmark score.
- PersistBench adds two safety risks that a game memory system can still suffer from: cross-domain leakage (injecting the wrong private memory into the wrong context) and memory-induced sycophancy (old preferences/biases over-constraining future output). Tianming's equivalent is hidden-info leakage and NPC/faction behavior being overfit to stale player cues.
- LongMemEval-V2 broadens evaluation from personal chat history to environment experience: state recall, dynamic state tracking, workflow knowledge, gotchas, and premise awareness. Tianming should evaluate "experienced court historian" behavior, not only long chat QA.
- REMem argues that episodic memory requires explicit event modeling and reasoning over time-aware gists/facts. This supports a first-class `event` lane with timestamped, linked, source-grounded episodes.
- MemInsight's autonomous augmentation suggests improving memories at indexing time, not only at retrieval time. Tianming can use post-turn jobs to add tags, causes, consequences, unresolved threads, and relation links.
- Reflective supervision work supports keeping raw critiques/failures as episodic memory while distilling reusable lessons into semantic/procedural memory. Tianming's `_aiReflections` should split "specific failure case" from "general lesson".
- MemFactory is less a direct implementation target and more evidence that the field is converging on lifecycle components: extract, update, retrieve, consolidate, prune/evaluate, optimize.
- Memory poisoning work adds a security layer to the lifecycle: write-time trust scoring, retrieval-time sanitization, temporal decay, provenance, and rollback. For Tianming, this is less about malicious attackers and more about preventing bad AI summaries from becoming durable truth.
- A-MemGuard's dual-memory idea maps well to Tianming: store suspicious/failed memories separately as "lessons/alerts" rather than injecting them as normal facts.
- AgentSys supports hierarchical memory isolation: do not let raw external/user-generated text, tool outputs, or unvalidated AI summaries accumulate in the same memory tier as hard game state.
- Remembering More, Risking More introduces temporal memory contamination. Tianming should test whether a long campaign gradually increases hidden-info leakage, stale-policy usage, or overfitted NPC reactions.
- MemMorph is a warning for any future tool/action system: poisoned memories can bias tool/action selection even when they look like harmless incident reports. Tianming's action planners should treat procedural memories and policy lessons as lower-authority than current rules/state.
- SuperLocalMemory reinforces the value of a local-first game memory stack: SQLite/FTS-style deterministic retrieval plus trust/provenance may be more suitable than a cloud memory service for Tianming.
- Mnemonic sovereignty gives a strong governance checklist: verifiable writes, scoped reads, authorized updates, rollback/forget, sharing boundaries, and audit trails.
- MemOS/MemoryOS papers support an OS-like design vocabulary: storage hierarchy, scheduling, lifecycle, versioning, governance, and controllable updates. This reinforces the plan to treat Tianming memory as infrastructure rather than a prompt helper.
- MemoRAG and ReadAgent both argue for "memory as retrieval clue generation", not just nearest-neighbor search. Tianming's `sc0.memoryQueries` is already a primitive version of this; v2 should make query planning structured and auditable.
- AgeMem pushes a learned-policy direction: memory operations become actions. This is too heavy for near-term Tianming, but it clarifies the operation set to expose: store, retrieve, update, summarize, discard, pin, supersede.
- MemSkill reframes memory operations as evolvable skills. For Tianming, the practical version is a small library of memory-writing templates: edict extraction, promise extraction, faction grievance extraction, rumor extraction, policy reversal detection.
- EvoMemBench is a useful caution: current memory methods vary by task; long-context baselines remain competitive. Tianming should not optimize for one leaderboard but evaluate per lane: knowledge memory, execution memory, in-episode memory, cross-episode memory.

## Roleplay/Game Memory Systems
- SillyTavern World Info/Lorebooks are dynamic prompt-insertion dictionaries. Entries are usually activated by keywords/regex, can be scoped to character/persona/chat, can be prioritized by insertion order, and can be triggered by Vector Storage similarity instead of exact keys.
- SillyTavern Data Bank implements RAG over attachments/documents across global, character, and chat scopes. Its Vector Storage stores embeddings in local JSON vector collections, retrieves relevant chunks, reserves prompt budget, supports score thresholds, and can optionally let retrieved chunks trigger World Info scanning.
- SillyTavern Chat Vectorization retrieves relevant older messages from the current chat and moves them to high-impact prompt positions. Its own docs warn this does not guarantee better memory and can conflict with prompt caching.
- SillyTavern Summarize creates/stores chat summaries and injects them into prompts. The docs explicitly warn that LLM summaries can lose details or hallucinate, so users should monitor/correct the summary state.
- CharMemory extracts important relationships, events, facts, and emotional moments every configurable interval, saves editable markdown in the character Data Bank, and relies on Vector Storage to retrieve relevant memory at generation time. It also exposes an Injection Viewer and token breakdown, which is an important UX pattern.
- MemoryBooks converts scenes into memories/lorebook entries with chat metadata, group support, catch-up commands for long chats, and automatic lorebook creation/binding. This is closer to authored narrative memory than general RAG.
- qvink MessageSummarize avoids whole-chat summary drift by summarizing individual messages, attaching summaries to messages, and separating rotating short-term summaries from manually marked long-term summaries. This is useful for auditability.
- Community patterns around VectFox/VectHare/Qdrant-style extensions point to a common pain: users want scalable vector storage, exact visibility into what was injected, and better handling of multilingual/noisy roleplay text.
- Agnai's memory model is explicitly split between manual keyword-triggered Memory Books and dynamic User/Chat Embeds. The chat-embed limitation is product-relevant: only messages loaded into the browser are embedded, so invisible data availability constraints must be shown to users.
- RisuAI's Lorebook follows the same basic lore activation pattern: activation keys plus insertion order. This reinforces that roleplay tools converge on "dynamic prompt entries" as the baseline memory primitive.
- VectFox is the most relevant community design found in this pass. Its EventBase layer extracts structured events from message windows instead of summary-per-reply or raw chunking. Fields include event type, importance, cause/result, characters, locations, factions, items, concepts, keywords, open threads, and persistence. This closely matches Tianming's desired event envelope.
- VectFox's Qdrant path uses payload filters, hybrid dense/sparse retrieval, server-side reranking by RRF/importance/persistence/recency, minimum importance filtering, dedup against visible context, and optional planner-generated multi-angle queries. Tianming can borrow the pattern while keeping local/offline constraints.
- VectFox also surfaces a key security/product warning: shared Qdrant instances need user isolation; vector memory is not automatically private. Tianming's local single-player context is simpler, but mod/plugin/cloud sync should respect save/user boundaries.
- MemoryBooks is a useful contrast to VectFox: it is lorebook-backed and narrative-authoring oriented. It distinguishes scene memories, clips, side prompts, compaction, and consolidation tiers such as Arc/Chapter/Book/Legend. That vocabulary maps well to Tianming's historical chronicle layers.
- qvink MessageSummarize is valuable because it explicitly rejects "one whole-chat summary" and tracks summaries per message. The design lesson is provenance: summary should be attached to the exact message/event it summarizes.
- Honcho adds partitioning vocabulary: peer mode and session naming decide whether memory is shared across all personas, isolated per persona, per chat, or per character. Tianming needs an analogous split for GM/global, player, NPC, faction, scenario, and save.
- Letta/MemGPT production docs reinforce two-tier memory hierarchy: always-visible core blocks vs searchable recall/archival stores. Tianming's "hard state/current edicts" should act like core memory; old events and reflections should be recall/archive.
- Zep's temporal knowledge graph highlights fact invalidation as a first-class operation. Tianming needs active/superseded/invalidated timestamps for policies, alliances, offices, commitments, and rumors.
- LangMem/Deep Agents add a concise design matrix: duration, information type, scope, update strategy, retrieval mode, and write permissions. This is a good checklist for every Tianming memory lane.

## Game, Simulation, and Multi-Agent Memory
- M2PA is directly relevant because it tests multi-memory planning in open-world Minecraft. It supports Tianming's current direction: semantic memory for world knowledge, episodic memory for past experience, and procedural memory for reusable planning patterns.
- MineNPC-Task adds an evaluation lesson: memory-aware games need logs of plan, action, memory reads/writes, precondition checks, repairs, and validators. Tianming's golden tests should capture memory events, not only final narrative output.
- PANGeA shows that RPG systems need memory plus validation. The validation layer matters as much as memory because free-form input can push generation outside designer constraints.
- Intrinsic Memory Agents and LEGOMem suggest a multi-agent placement question: some memory belongs to the orchestrator/GM, some to each NPC/faction, and some to task-specific agents. Tianming should not expose one global memory equally to all agents.
- H2R's high-level vs low-level memory split maps cleanly to strategy simulation: high-level planning lessons (e.g. "frontier overextension causes rebellions") should be separated from low-level execution facts (e.g. "粮道 in province X failed last winter").
- Cognitive architecture sources such as Soar/ACT-R/Common Model of Cognition support an older but still useful idea: agents benefit from separate working, procedural, semantic, and episodic memories with different retrieval and learning mechanisms.
- Complementary Learning Systems adds a consolidation lesson: keep fast, specific episodic traces for recent or unusual events, then slowly consolidate stable patterns into summaries/procedures. Do not immediately generalize one dramatic event into permanent policy.

## Tianming Local Code Findings
- `web/tm-memory-tables.js` defines a 12-table structured memory system through `SHEET_DEFS`, including current situation, court NPCs, character profiles, active edicts, special means, items, organizations, places, major event briefs, weighted event history, relation net, and imperial edicts.
- `eventHistory` is append-only and carries turn, description, weight, dimension labels, linked characters, and future constraints. `buildFutureConstraints()` and `buildTablesInjection()` already turn table state into prompt material, with row caps and hidden imperial-edict filtering.
- `tm-memory-tables.js` also contains cross-table validation, rebuild from history, and graph-like relation helpers for supersedes/contradicts/continues/elaborates. This is a strong base for conflict-aware memory.
- `web/tm-memory-anchors.js` provides memory anchors, execution constraints, player decisions, character arcs, archive compression, and `_ensureMemoryFreshness()`. It already resembles an L1/L2/L3 memory pyramid: recent raw memory, periodic summaries, and older outline compression.
- `web/tm-post-turn-jobs.js` runs consolidation jobs: AI L2 summaries every 5 turns, L3 condensation around 30-turn buckets, reflection on prediction vs actual result, and faction arc updates.
- `web/tm-endturn-ai.js` has a query-planning and recall pass. `sc0` can output `memoryQueries`; `SC_RECALL` searches NPC memory, chronicle, shiji history, foreshadows, and semantic recall, then ranks hits with vector, importance, recency, source priority, and dimension weight.
- `sc1q` extracts dialogue commitments from multiple channels and injects them near edicts. Coverage checks record missed commitments for the next turn. This is already a useful "write-time extraction" pattern.
- `web/tm-semantic-recall.js` implements local Chinese semantic recall with `bge-small-zh-v1.5`, indexing shijiHistory, ChronicleTracker, foreshadows, and 12-table eventHistory. It is non-blocking and has a remote fallback only when explicitly enabled.
- `web/tm-recall-gate.js` defaults to full recall unless `P.conf.recallGateEnabled === true`, with triggers for first turn, AI query, periodic recall, edicts, important memory, and low-confidence eventHistory.
- `web/tm-memory-ui.js` exposes a debug/editor panel, row locks, soft deletes, imperial-edict editing, and semantic recall toggle. The UI exists, but the next product gain is a more explicit "why this memory was injected" trace.
- `web/tm-memory-adapter.js` provides an external adapter and routes writes through `MemTables.applyAIOps`, which is the right seam for future tools/plugins/scripts.
- `web/tm-prompt-composer.js` has NPC recognition state injection, separating familiarity/last event/emotion/source/history from raw memory text.
- `web/tm-data-model.js` already includes memory retention knobs such as `memoryAnchorKeep`, `memoryArchiveKeep`, `characterArcKeep`, and `playerDecisionKeep`.
- Godot-side faction/diplomacy code stores diplomacy memories such as renewed and broken commitments, and tests verify that broken commitments influence later AI strategy. This is a good example of deterministic engine memory that should feed the higher-level AI memory layer.
- Existing smoke tests cover memory read contracts, recall compatibility, diagnostic helpers, memory diagnostics UI, and Phase 4 memory merge surfaces. Any redesign should preserve and extend these tests.

## Tianming Gaps and Risks
- Memory stores are rich but fragmented: tables, anchors, `_aiMemory`, `_memoryLayers`, NPC memories, ChronicleTracker, semantic index, foreshadows, and Godot diplomacy memories do not yet look like one typed memory envelope.
- Retrieval is present but not fully auditable from a product perspective. Developers can inspect diagnostics, but a player/designer-facing trace should show source, score, reason, token cost, and whether the model actually used the memory.
- Vector recall is helpful but should stay secondary to deterministic game state and structured facts. Old edicts, active commitments, current diplomacy, and locked canon should not depend on embedding similarity.
- AI summaries create value but can drift. Summaries should keep provenance links to source turns/events and allow correction, pinning, and superseding.
- Prompt pressure remains a risk. Tianming needs explicit prompt budgets per memory lane: current state, hard constraints, commitments, character/faction beliefs, old evidence, and reflections.
- Existing relation helpers suggest graph memory, but the graph is not yet the central retrieval surface. Multi-hop questions will need entity and event links, not only flat top-k snippets.
- The game has hidden information and "天机" concepts. Memory must carry visibility and audience fields so hidden/player-only/NPC-only knowledge is not leaked into the wrong prompt.

## Candidate Design Principles
- Treat memory as a pipeline: observe -> write/extract -> consolidate -> retrieve/rank -> inject -> evaluate -> revise.
- Keep "working memory" separate from "long-term memory"; the prompt should receive a curated working set, not a raw dump.
- Use typed memories with metadata: actor, faction, location, turn/month, confidence, source event, polarity, expiry/decay, and visibility.
- Combine retrieval signals: lexical/entity match, vector similarity, recency, importance, current goal relevance, and narrative constraints.
- Add consolidation/reflection jobs after turns or chapters to create durable summaries and relationship deltas.
- Make memory observable: show what was retrieved, why, from which store, and how many prompt tokens it consumed.
- Support manual correction and pinning. Roleplay users tolerate imperfect automation when they can inspect, edit, demote, pin, or delete memories.
- Avoid one memory channel for everything. Lore/canon, current plot state, actor beliefs, user preferences, and learned procedures have different lifecycles.
- Prefer deterministic state facts from the game engine over LLM summaries whenever the fact is already structured.

## Open Questions

## Parallel-Agent Mega Survey Integration

### Agent A - Academic Frontier
- The broader 2024-2026 frontier supports a layered, graph-aware, and lifecycle-governed memory direction rather than a pure RAG direction. Especially relevant sources: [AriGraph](https://arxiv.org/abs/2407.04363), [Agent Workflow Memory](https://arxiv.org/abs/2409.07429), [MAGMA](https://arxiv.org/abs/2601.03236), [ByteRover](https://arxiv.org/abs/2604.01599), [Zep/Graphiti](https://arxiv.org/abs/2501.13956), [A-MEM](https://arxiv.org/abs/2502.12110), [Mem0](https://arxiv.org/abs/2504.19413), [MIRIX](https://arxiv.org/abs/2507.07957), [LongMemEval-V2](https://arxiv.org/abs/2605.12493), and [EvoMemBench](https://arxiv.org/abs/2605.18421).
- AriGraph is particularly game-relevant because it combines semantic and episodic memory into a knowledge-graph world model for interactive text-game environments. Tianming's event tables, places, organizations, NPCs, edicts, and relations are already close to this shape.
- Agent Workflow Memory, Memp, ProcMEM, Voyager, and MemSkill all strengthen the argument for procedural memory: past successful or failed strategies should be distilled into reusable but lower-authority action templates.
- MAGMA's semantic/temporal/causal/entity multi-graph split is a strong retrieval-design reference for Tianming. Current relation helpers can become explicit retrieval surfaces rather than passive metadata.
- ByteRover adds a practical local-first warning against over-infrastructure: human-readable hierarchical context plus provenance and decay can compete with heavier vector/graph stacks on long-memory benchmarks.
- The frontier gap remains game-specific evaluation: papers still skew toward QA, web agents, or conversation. Tianming needs action-outcome regression where memory improves decisions, not only answers.

### Agent B - Evaluation, Safety, and Failure Modes
- Evaluation coverage should combine long dialogue recall (LoCoMo, LongMemEval, BEAM), structured/state memory (StructMemEval, STALE, Memora), agent-experience memory (LongMemEval-V2, EvoMemBench, MemGym), and safety/privacy (PersistBench, CIMemories, MemPrivacy-Bench).
- [STALE](https://arxiv.org/abs/2605.06527) is a key missing piece: it tests whether systems know old memories are no longer valid, including implicit conflicts where a later observation invalidates an earlier belief without an explicit negation.
- [Memory-Driven Role-Playing](https://arxiv.org/abs/2603.19313) adds a roleplay-specific memory-evaluation frame: Anchoring, Recalling, Bounding, and Enacting persona knowledge without explicit cues.
- Tianming's golden tests should include hidden-state leakage, stale premise resistance, current-policy freshness, multi-hop relationship causality, procedural lesson reuse, and "do not use memory" scenarios.
- Metrics should include answer accuracy, provenance coverage, freshness, leak rate, premise-resistance rate, action consistency, token cost, latency, and campaign outcome deltas.

### Agent C - Games, NPCs, and Multi-Agent Simulation
- [Generative Agents](https://arxiv.org/abs/2304.03442) remains the canonical memory-stream/reflection/planning loop, but Tianming should not copy the cost-heavy every-NPC-every-minute simulation style.
- [PANGeA](https://ojs.aaai.org/index.php/AIIDE/article/view/31876), [Concordia](https://arxiv.org/abs/2312.03664), D&D-agent work, and [M2PA](https://aclanthology.org/2025.findings-acl.1191/) all reinforce the split between GM/world-state authority and NPC/player-facing memory.
- Useful game memory classes: person memory, faction memory, world-event memory, and strategy/procedural memory. Hidden GM facts, player-known facts, and NPC-known beliefs must be separate.
- The best pattern for Tianming is "historian/GM ledger first, NPC perception second": NPCs can misunderstand or lie, but the system ledger should remain deterministic and auditable.

### Agent D - Roleplay and SillyTavern Ecosystem
- SillyTavern-like systems converge on multiple memory mechanisms, not one: lorebooks/world info for triggered canon, Data Bank/RAG for documents, chat vectorization for old-message recall, summarize for compression, and community plugins for editable character memory.
- Strong product patterns: CharMemory's injection viewer and prompt breakdown; MemoryBooks' clip/scene/lorebook workflow; MessageSummarize's per-message summary provenance; VectFox's EventBase extraction; Timeline Memory's chapter index and full-chapter backreference; TunnelVision's activity feed and tool-based memory management.
- Common failures: keyword miss/false trigger, summary drift, embedding relevance mismatch, chunk/model re-indexing pain, autonomous writes becoming false canon, and cloud-memory privacy/cost concerns.
- Tianming should adopt "draft-confirm-write" for important long-term memories: AI proposes event/relation/state deltas, then the system or player/designer can accept, edit, merge, downgrade, or quarantine.

### Agent E - Production Frameworks
- Production memory systems divide into hosted memory APIs, graph/context engines, and local/framework-embedded layers. For a local single-player game, the best starting point is local SQLite/FTS/structured tables plus optional embeddings, not enterprise context lakes.
- Mem0/OpenMemory, Zep/Graphiti, Letta/MemGPT, LangMem/LangGraph, Honcho, Cheshire Cat, Memobase, Supermemory, Mengram, LoreAI, and MemoryOS/MemOS provide reusable vocabulary: namespaces, user/session/agent scopes, graph invalidation, core vs recall memory, background derivation, queue status, audit logs, and memory dashboards.
- The single most important production lesson is scope/permissions: `world_id`, `save_slot`, `actor_id`, `faction_id`, `scene_id`, and `quest_id` should be first-class memory keys.
- Avoid SaaS-only memory and graph-database overbuild in the near term unless Tianming's target runtime changes. Offline saves, deterministic replay, and player privacy are more valuable than cloud memory features.

### Agent F - Cognitive Foundations
- Tulving, Baddeley, CLS, ACT-R, Soar, the Common Model of Cognition, source monitoring, forgetting/decay, and narrative memory all point to the same engineering shape: working memory, episodic memory, semantic memory, procedural memory, and evidence-aware consolidation.
- The key translation is not "AI is like a brain"; it is that different memory types need different schemas, retrieval policies, update rules, and authority levels.
- Source monitoring is especially important for Tianming: a memory must know whether it came from hard state, player input, NPC belief, rumor, summary, LLM reflection, tool output, or hidden GM truth.
- Forgetting should usually mean demotion, decay, or archive, not deletion. Important old events should become harder to retrieve unless reinforced by later consequences, references, or player pins.

## Additional Local Sweep - 2026-05-31
- [OpenMemory](https://mem0.ai/openmemory) is a local-first MCP memory layer from Mem0 that emphasizes project-specific recall, memory types, tagging, visibility, and access logs. Its product framing is useful for Tianming's Memory Inspector even if the implementation should stay in-game/local.
- [AriGraph](https://arxiv.org/abs/2407.04363) confirms that a semantic + episodic memory graph can outperform unstructured full-history, summaries, and RAG in interactive text-game environments.
- [Agent Workflow Memory](https://arxiv.org/abs/2409.07429) confirms the value of inducing reusable workflows from successful trajectories and selectively providing them to later agents. Tianming's procedural lane should store policy/diplomacy/crisis-response routines with evaluators and rollback.
- [MAGMA](https://arxiv.org/abs/2601.03236) formalizes the semantic/temporal/causal/entity graph split and policy-guided traversal. This maps directly to Tianming retrieval questions such as who, when, why, and caused what.
- [ByteRover](https://arxiv.org/abs/2604.01599) is a useful local-first counterweight to heavier memory stacks: human-readable hierarchical context, explicit relations, provenance, maturity tiers, and recency decay can be enough for a strong memory layer.
- Roleplay-persona research adds evaluation language for character consistency: [Memory-Driven Role-Playing](https://arxiv.org/abs/2603.19313) measures Anchoring/Recalling/Bounding/Enacting; [Persona-Aware Contrastive Learning](https://arxiv.org/abs/2503.17662) focuses on persona alignment and role consistency. For Tianming, this means NPC memory tests should check both fact recall and behavior staying in character.

## Fourth-Round Local Live Sweep - 2026-05-31
- [Memory for Autonomous LLM Agents: Mechanisms, Evaluation, and Emerging Frontiers](https://arxiv.org/abs/2603.07670) is a useful 2026 survey that formalizes agent memory as a write-manage-read loop coupled to perception/action. Its three axes are temporal scope, representational substrate, and control policy. Its mechanism families: context-resident compression, retrieval-augmented stores, reflective self-improvement, hierarchical virtual context, and policy-learned management. This reinforces Tianming's Memory Spine as a lifecycle, not a storage choice.
- [From Storage to Experience: A Survey on the Evolution of LLM Agent Memory Mechanisms](https://arxiv.org/abs/2605.06716) frames the field as moving from storage to experience and continual learning. Useful Tianming reading: memory should encode how the world changes and how the agent learned to act, not only static facts.
- [GroupMemBench](https://www.microsoft.com/en-us/research/publication/groupmembench-benchmarking-llm-agent-memory-in-multi-party-conversations/) is directly relevant to games: it measures multi-party memory, speaker-grounded belief tracking, audience-adapted language, multi-hop reasoning, knowledge update, term ambiguity, user-implicit reasoning, temporal reasoning, and abstention. Microsoft reports strongest systems only reached 46.0% average accuracy, with knowledge update at 27.1% and term ambiguity at 37.7%; BM25 matching or beating many systems is a warning that fancy ingestion can erase lexical/structural cues. Tianming should test multi-NPC/faction memory, not only player-to-assistant memory.
- [Memory-Driven Role-Playing](https://arxiv.org/abs/2603.19313) defines a roleplay-specific memory paradigm and MREval/MRBench with four abilities: Anchoring, Recalling, Bounding, and Enacting. It is a strong candidate for Tianming NPC consistency tests: can an NPC autonomously retrieve persona/world knowledge from context, stay within what the role should know, and enact it in behavior?
- [STALE](https://arxiv.org/abs/2605.06527) remains a top-priority benchmark for Tianming because it isolates implicit conflict: later observations invalidate earlier memories without explicit negation. The game version should include old edicts, offices, alliances, ownership, deaths, and secret plans being invalidated by subsequent events.
- [Enhancing Persona Consistency for LLMs' Role-Playing using Persona-Aware Contrastive Learning](https://arxiv.org/abs/2503.17662) is less directly a memory-system paper but useful for evaluation vocabulary around persona alignment and role consistency.
- [Luker](https://luker.cups.moe/) is a 2026 roleplay platform built on SillyTavern ideas that foregrounds knowledge-graph memory and multi-agent orchestration. Its product framing validates the Tianming direction of character/faction relationship networks plus scene orchestration rather than only chat-history summarization.
- [SillyTavern MemoryBooks](https://github.com/aikohanasaki/SillyTavern-MemoryBooks/) has become richer than a simple summary-to-lorebook tool: it includes scene marking, JSON-only memory generation, sequential metadata, catch-up commands for long chats, clip-to-memory, side prompts/trackers for inventory/relationship/quest/world state, consolidation tiers, compaction review, group chat support, and manual/automatic lorebook binding. Tianming can borrow the separation between one-off memory entries, ongoing trackers, chapter/arc consolidation, and review-before-replace compaction.
- [PlugMem](https://arxiv.org/abs/2603.03296) frames memory as a task-agnostic plugin module. Key Tianming lesson: memory components should be swappable and policy-bounded, but retrieved raw memory can create context explosion unless filtered by task relevance.
- [Timeline-based Memory Management for Lifelong Dialogue Agents](https://arxiv.org/abs/2406.10996) supports a timeline-first approach for long-running dialogue. For Tianming, timeline layers should map to turn, month/year, reign/arc, and dynasty-scale chronicle rather than one rolling summary.
- [AMV-L](https://arxiv.org/abs/2603.04443) adds a systems angle often missing in memory papers: memory lifecycle should control p95/p99 latency under long-running workloads, not only accuracy. Tianming's memory injection should therefore track latency and prompt budget per lane, especially before adding heavier graph/semantic retrieval.
- [MemForest](https://huggingface.co/papers/2605.23986) treats agent memory as write-efficient temporal data management with parallel chunk extraction and hierarchical temporal indexing. Tianming can borrow the hierarchy idea: recent turns, chapter windows, reign/arc windows, and dynasty chronicle should have different retrieval granularity.
- [SAGE graph-memory](https://arxiv.org/abs/2605.12061) and [HAGE](https://huggingface.co/papers/2605.09942) represent self-evolving graph memory. They are not near-term implementation targets without strong replay tests, but they confirm that graph structure should be incrementally maintained and periodically diagnosed rather than built once as a static index.
- [EvolveMem](https://huggingface.co/papers/2605.13941) and [FORGE](https://papers.cool/arxiv/2605.16233) are further evidence that self-evolving retrieval/configuration is emerging. Tianming should first log failures and trace memory decisions; later those logs can drive parameter tuning or memory-policy recommendations.
- [NovelAI Lorebook](https://docs.novelai.net/en/text/lorebook) and [NovelAI Story Settings](https://docs.novelai.net/en/text/editor/storysettings) preserve the older but still useful split between always-on Memory, near-output Author's Note, and keyword/regex-triggered Lorebook entries. This reinforces prompt-position as a memory-design parameter, not only retrieval choice.
- [KoboldAI Memory, Author's Note, and World Info](https://github-wiki-see.page/m/KoboldAI/KoboldAI-Client/wiki/Memory%2C-Author%27s-Note-and-World-Info) shows the same pattern: Memory for durable story facts, Author's Note for high-salience style/direction near the generation point, and World Info for keyword-triggered background. Tianming should similarly distinguish hard state, scene steering, and conditional lore/episode retrieval.
- [SillyTavern World Info](https://docs.sillytavern.app/usage/core-concepts/worldinfo/) includes character lore, persona lorebook, chat lorebook, global lore, insertion strategy, and ordering. Product lesson: scope and insertion order need explicit UI, because lore/memory behavior is otherwise hard for users to reason about.
- [SillyTavern DIY World Info extension index](https://sillytavern.diy/extensions/worldinfo/) lists ecosystem tools around lorebook ordering, memory books, bulk moves, locks, and recommenders. This shows community pain points around priority, bounded context, repetitive setup, and automated lore/memory creation.
- DeepWiki's [World Info System](https://deepwiki.com/SillyTavern/SillyTavern/6.1-world-info-system/) and [Context and Memory Systems](https://deepwiki.com/SillyTavern/SillyTavern/6-user-interaction) are useful code-oriented summaries: World Info has keyword activation, insertion strategy, sorting/weight/order behavior, and vectorization endpoints. For Tianming, memory should expose similarly inspectable activation and sorting fields.
- [CrewAI Memory](https://docs.crewai.com/en/concepts/memory) exposes a unified `Memory` class that infers scope, categories, and importance on save, and recalls with composite scoring over semantic similarity, recency, and importance. Tianming can borrow the unified API idea while keeping authority/visibility deterministic rather than inferred-only.
- [LlamaIndex Memory](https://docs.llamaindex.ai/en/stable/module_guides/deploying/agents/memory/) and its [memory example](https://docs.llamaindex.ai/en/stable/examples/memory/memory/) use short-term FIFO chat memory that flushes older chunks into long-term `MemoryBlock`s, including vector memory blocks. This supports Tianming's L1/L2/L3 flush/consolidation direction, but Tianming needs stronger game-state authority than generic chat memory.
- [Cognee](https://www.cognee.ai/) positions itself as an open-source memory control plane that captures context, turns it into graph memory, preserves provenance, and serves shared memory to multiple agents through MCP and integrations. It is useful as a production reference for graph memory, permissions, citations, and cross-agent memory sharing.
- [Cognee GitHub](https://github.com/topoteretes/cognee) and [Cognee remember docs](https://docs.cognee.ai/core-concepts/main-operations/remember) reinforce a common production direction: persistent graph memory, feedback, cross-agent sharing, and durable recall across sessions. For Tianming, this maps to save-local memory plus optional designer/debug tooling, not necessarily an external service.
- [Is Agent Memory a Database?](https://arxiv.org/abs/2605.26252) reframes long-term agent memory as a data-management workload. This supports treating Tianming memory as tables + temporal graph + indexes + lifecycle policy, with benchmarks for latency, update cost, correctness, and governance.
- [Graph-Native Cognitive Memory](https://arxiv.org/abs/2603.17244) adds formal belief-revision language for versioned graph memory. Tianming's NPC beliefs and faction beliefs need this: a belief can be revised without deleting the original evidence or global truth.
- [中文 SillyTavern 记忆插件横评](https://guide.sillytavern.one/extensions/memory-extensions/) compares Horae, memory tables, Amily2, and auto-summary plugins. Its most important product statement is that any memory plugin is fundamentally selecting important information to place into the prompt, not perfectly reconstructing history. This supports Tianming's traceable selection/budget design over "infinite memory" claims.
- [Luker Chinese docs](https://luker.cups.moe/zh-CN/) frame graph memory and multi-agent orchestration as next-gen roleplay primitives. It is an ecosystem signal that roleplay users increasingly expect relationship networks, persistent character memory, and scene orchestration.
- Chinese/community roleplay discussions repeatedly emphasize memory panels, table-like memory, small summaries every N messages, large summaries every larger interval, and manually maintained lorebooks/trackers for D&D-style campaigns. Product lesson: power users will tolerate setup when the system exposes memory state clearly and allows manual correction.
- [BOOKMARKS: Efficient Active Storyline Memory for Role-playing](https://arxiv.org/abs/2605.14169) introduces an active-storyline memory idea: keep reusable bookmarks synchronized to the current story point. Tianming can adapt this as "active storyline anchors" for ongoing arcs, obligations, and unresolved tensions.
- BOOKMARKS specifically defines a bookmark as an answer to a question at a specific storyline point, then selects/reuses/initializes bookmarks for current tasks and synchronizes their answers as the story advances. It supports concept, behavior, and state searches. Tianming adaptation: each active arc can maintain question-like anchors such as "Who currently controls Liaodong grain routes?", "What does faction X believe about official Y?", "Which edicts constrain the next fiscal policy?", and "What unresolved promises can be called in now?"
- Roleplay community discussion in Solo Roleplaying, AIChatReviews, FictionLab, KindroidAI, and AI game-dev spaces keeps converging on the same pain: long campaigns fail when the model forgets major story beats, repeats itself, loses character consistency, or uses automated summaries that flatten small but emotionally important details. Product implication: Tianming memory must preserve low-frequency high-salience events, not only high-frequency facts.
- Several 2026 memory vendors publish benchmark claims on LoCoMo/LongMemEval/BEAM, but many are self-reported and should be treated as secondary evidence. Useful takeaway is not the leaderboard number; it is the metrics they emphasize: temporal correctness, token efficiency, latency, failure traces, and whether past experience improves future behavior.

## Fourth-Round Swarm Integration

### Wave 1 Agent 06 - Procedural / Workflow / Skill Memory
- Procedural memory should not replay raw trajectories into the prompt. It should distill past success/failure into typed strategy objects with triggers, preconditions, procedure steps, termination conditions, verification checks, failure repairs, confidence, evidence, and low authority.
- Key sources: [Voyager](https://voyager.minedojo.org/), [Agent Workflow Memory](https://arxiv.org/abs/2409.07429), [Memp](https://arxiv.org/abs/2508.06433), [Reflexion](https://arxiv.org/abs/2303.11366), [MemSkill](https://arxiv.org/abs/2602.02474), and [ProcMEM](https://arxiv.org/abs/2602.01869).
- Useful extraction schema: task goal, initial state, observation sequence, action/tool sequence, environment feedback, final success/failure, failure reason, constraints, and reusable subgoals. Successful trajectories can become workflows; failed trajectories should become Reflexion-style repair rules such as "avoid X" or "if Y happens, switch to Z".
- Evaluation should include win/success rate, hard-constraint satisfaction, step/token/tool-call efficiency, same-template and cross-template generalization, cross-map/cross-task transfer, memory hit rate, actual adoption rate, benefit after adoption, misleading-memory rate, conflict/staleness rate, and ablations across no memory/raw trajectory/script/workflow/combined/update/no-update.
- Tianming strategy memories should be advisory. They must not override game rules, player goals, current observations, hard state, or hidden-info constraints. Prompt injection should label them as low-authority past-experience hypotheses, not instructions.
- Practical Tianming memory object:
  - `kind: procedural`
  - `trigger`: court/military/diplomacy situation
  - `preconditions`: current state requirements
  - `procedure`: policy/action sequence
  - `verification`: expected measurable signs
  - `failureRepair`: alternate path or warning
  - `evidence`: source event ids / campaign ids
  - `authority: advisory`
  - `validWhen`: map/scenario/era/version/faction filters

### Wave 1 Agent 03 - Memory OS / Memory Management
- Memory OS work strengthens the idea that agent memory should be treated as a governed system resource, not a vector-store feature. The relevant design surface includes layered storage, write scheduling, lifecycle policy, access control, forgetting/update semantics, and observability.
- Key sources: [MemGPT](https://arxiv.org/abs/2310.08560), [Letta memory blocks](https://docs.letta.com/guides/core-concepts/memory/memory-blocks/), [Letta archival memory](https://docs.letta.com/guides/core-concepts/memory/archival-memory/), [Memory OS of AI Agent](https://arxiv.org/abs/2506.06326), [MemOS](https://arxiv.org/abs/2505.22101), [MemOS GitHub](https://github.com/MemTensor/MemOS), [Mem0](https://arxiv.org/abs/2504.19413), [LangMem](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/), and [Zep/Graphiti](https://arxiv.org/abs/2501.13956).
- Newer memory-OS-flavored leads to track: [EverMemOS](https://arxiv.org/abs/2601.02163) for episodic trace formation / semantic consolidation / reconstructive recollection; AMV-L for utility-driven promotion/demotion/eviction and latency-aware hot-path memory; MemForest for temporal data management and hierarchical time indexing.
- Tianming Memory Envelope should explicitly include `owner/scope/source/confidence/valid_time/system_time/sensitivity/provenance/version/access_policy`. This is especially important for save slots, actors, factions, hidden GM facts, and player-visible facts.
- Write path should filter sensitive/low-value material, extract structure, deduplicate, merge, index, and push high-cost consolidation to background jobs. Read path should keep hot-path candidate sets small, combine semantic/keyword/graph/temporal signals, rerank, and assemble the prompt working set under budget.
- Lifecycle policy should support promotion, demotion, eviction, TTL, value decay, conflict resolution, explicit deletion, and audit. Tianming's current archive/compression and L2/L3 jobs can become the first version of this policy layer.
- Observability should include why-written, why-retrieved, why-forgotten, memory trace, retrieval trace, prompt context view, p95/p99 latency, token cost, leak rate, and poison/quarantine rate.

### Wave 1 Agent 04 - Graph / Temporal / Causal Memory
- Graph memory systems split into several useful styles:
  - Zep/Graphiti: entity nodes, fact/relation edges, episode evidence nodes, and mature bitemporal-style invalidation.
  - AriGraph: semantic graph plus episodic vertices/edges for partially observable text-game exploration.
  - MAGMA: separate semantic, temporal, causal, and entity graphs with intent routing and weighted traversal.
  - HippoRAG/HippoRAG 2: OpenIE-style phrase/entity graph plus passage links and graph activation for multi-hop retrieval.
  - REMem: time-aware gist nodes plus fact triples with agentic retrieval over entity/time/order/aggregation.
- Key sources: [Zep Facts](https://help.getzep.com/facts), [Graphiti GitHub](https://github.com/getzep/graphiti), [Graphiti Search](https://help.getzep.com/graphiti/working-with-data/searching), [AriGraph](https://arxiv.org/abs/2407.04363), [AriGraph GitHub](https://github.com/AIRI-Institute/AriGraph), [MAGMA](https://arxiv.org/abs/2601.03236), [HippoRAG](https://papers.nips.cc/paper_files/paper/2024/hash/6ddc001d07ca4f319af96a3024f6dbd1-Abstract-Conference.html), [HippoRAG 2](https://arxiv.org/abs/2502.14802), and [REMem](https://arxiv.org/abs/2602.13530).
- Tianming should not store only triples. A game graph needs at least three layers: raw event log, derived fact graph, and causal/task-dependency graph. Raw events must be replayable; derived graph edges can be rebuilt.
- Bitemporal fields are important: `valid_from/valid_to` for when the world fact is true, and `learned_at/expired_at` for when the system/actor learned or invalidated it. Add game-specific `turn`, `scene_id`, and `save_version`.
- Fact invalidation should mark old edges invalid rather than delete them. This allows the system to answer both "where is X now?" and "where was X before, and why did it change?"
- Query routing should combine MAGMA and Graphiti patterns:
  - WHY questions traverse CAUSES/BLOCKS/REQUIRES.
  - WHEN/where-last-seen questions traverse OBSERVED_IN/NEXT_EVENT/LOCATED_IN.
  - What-next questions traverse QUEST_REQUIRES/ENABLES/BLOCKS.
  - Relationship questions traverse SUPPORTS/BETRAYS/OWES/FEARS/COMMANDS.
- Causal edges should prefer deterministic game rules and state-change logs. LLM-inferred causes should be lower confidence and visibly marked as hypotheses.
- Proposed Tianming graph nodes: `Event`, `Actor`, `NPC`, `Faction`, `Item`, `Location`, `Quest`, `StateFact`, `Rule`, `Edict`, `Rumor`.
- Proposed Tianming graph edges: `NEXT_EVENT`, `OBSERVED_IN`, `LOCATED_IN`, `HAS_ITEM`, `USED_ON`, `UNLOCKS`, `BLOCKS`, `CAUSES`, `ENABLES`, `REQUIRES`, `SUPERSEDES`, `INVALIDATES`, `EVIDENCE_FOR`, `BELIEVES`, `KNOWS`, `HIDES_FROM`.
- Write fast path: segment, index, append time chain. Slow path: entity merge, fact extraction, conflict detection, causal attribution, summary generation. This avoids blocking the game loop with expensive LLM/graph work.

### Wave 1 Agent 02 - Cognitive-Inspired Memory Translation
- Cognitive categories are useful as engineering boundaries, not as claims that agents have human memory. The core translation is different schemas and policies for working memory, episodic memory, semantic memory, procedural memory, consolidation, forgetting, and permissions.
- Key sources: [CoALA](https://arxiv.org/abs/2309.02427), [Generative Agents](https://arxiv.org/abs/2304.03442), [Reflexion](https://arxiv.org/abs/2303.11366), [Voyager](https://arxiv.org/abs/2305.16291), [MemoryBank](https://arxiv.org/abs/2305.10250), [MemGPT](https://arxiv.org/abs/2310.08560), [Zep/Graphiti](https://arxiv.org/abs/2501.13956), [MIRIX](https://arxiv.org/abs/2507.07957), [Human-Inspired Memory Architecture](https://arxiv.org/abs/2605.08538), and [CogMem](https://arxiv.org/abs/2512.14118).
- Working memory should be an explicit current task/state object: goal, plan, constraints, recent observations, retrieved evidence, and current actor perspective. It should not be a full chat transcript.
- CLS translation: fast online append of episodes; slow offline/low-frequency consolidation into semantic facts, relationship deltas, summaries, and procedural candidates. Do not rewrite long-term personality, politics, or skills every turn.
- ACT-R/Soar/CMC translation: declarative chunks/facts, procedural productions, activation from recency/frequency/context, and an action loop. Tianming can use activation scoring for memory strength while retaining deterministic hard-state priority.
- Reflections should default to hypotheses, not facts. Semantic memory must not erase episodic provenance.
- NPC adaptation:
  - Working: current scene, goal, emotion/relation state, plan, visible objects, hard constraints.
  - Episodic: who/when/where/did-what/witnessed-by-me/emotional-weight/task-relevance.
  - Semantic: lore, faction relation, player preferences, confirmed facts with source/version.
  - Procedural: patrol, trade, combat, escape, negotiation, quest-giving, informing, court maneuver templates.
  - Propagation: do not share global omniscient memory; propagate through rumors, reports, testimony, faction databases, and public chronicles.

### Wave 1 Agent 01 - Survey / Taxonomy Against Tianming v3
- The 2023-2026 literature supports the v3 Memory Spine direction: memory should be a pipeline of extract -> authority adjudication -> storage -> consolidation/evolution -> retrieval/reranking -> working-set injection -> evaluation -> forgetting/rollback.
- Incremental gaps beyond v3:
  - Add declaration/control policy metadata, not only fixed retrieval rules.
  - Add latency, throughput, token cost, and recall-benefit instrumentation.
  - Make `quarantine`, `rollback`, and `audience` hard fields.
  - Add memory strength/decay/reinforcement for long-term relationship and salience.
  - Let graph relations influence retrieval ranking, not only exist as helpers.
  - Define deterministic operation APIs before considering learned memory-operation policies.
  - Evaluate per lane: structured state, episodic recall, hidden knowledge, stale facts, procedural experience, and refusal/abstention.
- `M2PA` suggests adding a sensory/current observation lane. For Tianming this is less visual sensor memory and more "current visible scene / current court session / current known map and actor observations".
- `MineNPC-Task` reinforces that game memory evaluation should log plan, action, memory reads/writes, preconditions, repair attempts, and validators, not only final narrative text.
- `EvoMemBench` supports lane-specific evaluation: in-episode vs cross-episode and knowledge-oriented vs execution-oriented memory have different good solutions.

### Wave 1 Agent 05 - Hierarchical Summarization / Compression / Timeline Memory
- Core conclusion: layered summaries can save context, but summaries must not replace evidence. Tianming's L1/L2/L3 should become a source-linked, drill-down, invalidation-aware historical archive tree.
- Key sources: [Recursively Summarizing](https://arxiv.org/abs/2308.15022), [ReadAgent](https://arxiv.org/abs/2402.09727), [Timeline-based Memory Management](https://arxiv.org/abs/2406.10996), [TiMem](https://arxiv.org/abs/2601.02845), [HiMem](https://arxiv.org/abs/2601.06377), [Useful Memories Become Faulty](https://arxiv.org/abs/2605.12978), [SillyTavern Summarize](https://docs.sillytavern.app/extensions/summarize/), [MessageSummarize](https://github.com/qvink/SillyTavern-MessageSummarize), [MemoryBooks](https://github.com/aikohanasaki/SillyTavern-MemoryBooks/blob/main/readme.md), and [CharMemory](https://github.com/bal-spec/sillytavern-character-memory).
- Recursive summary helps long dialogue consistency but creates telephone-game risk: L2 summarizes L1 and L3 summarizes L2, so early errors can become durable unless L3 samples/checks source L1 evidence.
- ReadAgent's gist + source lookup pattern maps directly to Tianming: L2/L3 should guide retrieval, but important facts should be grounded by drilling back to original L1 turns/events.
- Product lesson: MessageSummarize's per-message provenance and MemoryBooks' scene/chapter/arc/book vocabulary are closer to game history than one rolling summary.
- Tianming L1 should remain a raw episode ledger with turn id, source id, hash, visibility, authority, player input, edict, memorial response, SC1 state changes, NPC actions, chronicle text, and AI reflections. L1 may cool/archive but should not disappear because of compression.
- Tianming L2 should become chapter/arc summaries with sourceRefs, actors, factions, places, state changes, unresolved threads, causal claims, and confidence. L2 is an index, not the fact body.
- Tianming L3 should become book/era outlines every larger arc, but should not only consume L2. It should sample/check key L1 to avoid recursive drift. Suggested columns: main plot, policy changes, relationship graph changes, war/fiscal/popular sentiment, invalidated old premises, unresolved debts.
- Add cross-layer pointers: L3 -> L2 -> L1. Retrieval can first use L3 to locate history, then L2 for narrowed context, then inject only necessary L1 evidence.
- Failure modes to guard: summary drift, provenance collapse, stale facts staying active, mixed authority, prompt budget crowding, over-consolidation, and vector recall mismatch.

### Wave 2 Agent 12 - Memory Safety / Privacy / Poisoning / Deletion
- Core conclusion: agent memory is a persistent trust boundary. Risks include cross-session contamination, privacy extraction, persistent bad reinforcement, unverifiable deletion, and polluted memories driving tool/action choices.
- Key sources: [PersistBench](https://arxiv.org/abs/2602.01146), [CIMemories](https://github.com/facebookresearch/CIMemories), [MemPrivacy-Bench](https://arxiv.org/abs/2605.09530), [MEXTRA](https://aclanthology.org/2025.acl-long.1227.pdf), [ADAM](https://arxiv.org/abs/2604.09747), [AgentPoison](https://arxiv.org/abs/2407.12784), [MemPoison](https://arxiv.org/abs/2605.29960), [MemMorph](https://arxiv.org/abs/2605.26154), [A-MemGuard](https://arxiv.org/abs/2510.02373), and [AgentSys](https://arxiv.org/abs/2602.07398).
- Attack surface by phase:
  - Write: user input, web content, tool output, logs, NPC dialogue can become durable memory.
  - Store: vectors, summaries, reflections, profiles, procedural memories, shared faction/team memory become secondary contamination sources.
  - Retrieve: black-box probing can extract private memory; adaptive probing is stronger than static prompts.
  - Execute: poisoned procedural/technical memory can bias tool/action choice.
  - Share: multi-agent/shared memory can spread one bad write across a group.
  - Forget: deleting raw records does not automatically delete summaries, embeddings, caches, audit copies, or tool transcripts.
- Tianming equivalent risks: hidden-information leakage, NPC belief poisoning, stale summaries becoming canon, bad procedural lessons steering policy/action selection, shared faction-memory contamination, and deletion/rollback gaps.
- Defenses:
  - Before write: minimal writes, explicit authorization, source signing, local redaction/placeholders, and type separation for user facts/model inference/tool observations/strategy.
  - During storage: append-only evidence, versions, hashes/signatures, provenance graph, derived-memory tracking, no summary-overwrites-fact.
  - During retrieval: principal-scoped retrieval, task-context access control, top-k/threshold limits, sensitive memory never directly injected unless authorized.
  - Before action: audit memory influence on high-impact tool/action choices.
  - Recovery: rollback, quarantine, memory diff, deletion receipts, and post-forgetting behavior checks.
- Tianming security tests should cover Write, Store, Retrieve, Execute, Share, Forget/Rollback and score integrity, confidentiality, availability, and governance verifiability. Add canary memories to check leakage, summary amplification, and deletion residuals.

### Wave 2 Agent 11 - Structured / Stale / State Memory Benchmarks
- Core conclusion: Tianming memory tests should be long-term state ledgers, not only QA recollection. Core failure classes: structure discovery, state overwrite, stale-premise resistance, cross-entity propagation, and DAG execution consistency.
- Key sources: [StructMemEval](https://arxiv.org/abs/2602.11243), [StructMemEval GitHub](https://github.com/yandex-research/StructMemEval), [STALE](https://arxiv.org/abs/2605.06527), [Memora](https://arxiv.org/abs/2604.20006), [MemoryAgentBench](https://arxiv.org/abs/2507.05257), [MemoryAgentBench GitHub](https://github.com/HUST-AI-HYZ/MemoryAgentBench), [MemGym](https://www.microsoft.com/en-us/research/publication/memgym-a-long-horizon-memory-environment-for-llm-agents/), and [STATE-Bench](https://opensource.microsoft.com/blog/2026/05/19/introducing-state-bench-a-benchmark-for-ai-agent-memory/).
- Direct Tianming test families:
  - Office tree / hierarchy: appointments, demotions, acting roles, inheritance, and command authority.
  - Edict ledger: issue, revise, revoke, secret order, conflicting edicts, resource debts.
  - Alliance stale facts: implicit invalidation after betrayal or new defense arrangement.
  - Territory state machine: ownership, garrison, supply line, vassal jurisdiction, tax/military authority.
  - Quest/task DAG: road repair -> grain transport -> mobilization -> campaign, with canceled nodes and reassigned owners.
- Suggested metrics: current_state_accuracy, stale_rejection, propagation_accuracy, structure_discovery, traceability, and policy_adaptation.
- Tests should include state resolution, premise resistance, and action/policy adaptation. For example: if an old alliance is implicitly invalidated by betrayal, the agent must reject "since they are still allies" and route supplies to the new defender.

### Wave 2 Agent 09 - Long-Context vs Memory Benchmark Boundary
- Key distinction: if complete history is provided in the same prompt, the benchmark is primarily long-context/context-engineering, not long-term memory. Memory benchmarks require cross-turn/session experience, selective write/update/retrieve, and a final prompt that cannot contain full history.
- Long-context benchmarks to use carefully: [Needle-in-a-Haystack](https://github.com/gkamradt/LLMTest_NeedleInAHaystack), [Lost in the Middle](https://arxiv.org/abs/2307.03172), [RULER](https://github.com/NVIDIA/RULER), [HELMET](https://github.com/princeton-nlp/HELMET), [InfiniteBench](https://github.com/OpenBMB/InfiniteBench), and [LongBench v2](https://github.com/THUDM/LongBench).
- Conversion principles for game memory goldens:
  - Convert input position into cross-session time/experience.
  - Convert answer strings into deterministic state assertions such as quest_status, npc_trust, door_code, faction_owner.
  - Require evidence IDs from memory events.
  - Add updates/conflicts such as reset passwords, renamed NPCs, reversed alliances, changed ownership.
  - Add abstention when the agent has not experienced or is not allowed to know something.
- Evaluation baselines: no_memory, full_history_oracle, retrieval_only, and memory_system. Limit final prompt history budget and record actual injected memories.
- Avoid relying only on LLM judges; prefer deterministic state assertions for game tasks.

### Wave 2 Agent 08 - Multi-Agent / Shared / Group Memory
- Core conclusion: multi-agent memory should not be one global brain. Use one world-truth ledger, per-NPC private memories, per-faction organizational memories, public chronicle, and rumor/belief channels, controlled by social and permission graphs.
- Key sources: [Generative Agents](https://arxiv.org/abs/2304.03442), [GroupMemBench](https://arxiv.org/abs/2605.14498), [Collaborative Memory](https://arxiv.org/abs/2505.18279), [G-Memory](https://arxiv.org/abs/2506.07398), [LEGOMem](https://arxiv.org/abs/2510.04851), [Simulating Rumor Spreading](https://arxiv.org/abs/2502.01450), [S3](https://arxiv.org/abs/2307.14984), [SALM](https://arxiv.org/abs/2505.09081), and [AgentSociety](https://aclanthology.org/2025.acl-industry.94/).
- GroupMemBench is highly relevant: group memory requires tracking who said what, who believes what, and how to speak to different audiences. Reported strong systems still average only 46.0%, indicating group memory is not solved by current memory frameworks.
- Tianming layers to add:
  - `WorldTruthLedger`: deterministic facts and state.
  - `FactionMemory`: organizational archives, reports, policy memories, secrets.
  - `NpcPrivateMemory`: witnessed episodes, private grudges, promises, fears.
  - `PublicChronicle`: public announcements, known history, rumors that became common knowledge.
  - `RumorGraph`: belief/rumor propagation with confidence, source, path, and contradiction links.
- Every memory should include `scope`, `owner_id`, `source_id`, `source_faction`, `confidence`, `secrecy`, `observed_at`, `expires_at`, `provenance`, `contradicts`, and `truth_ref`.
- NPC prompts should receive only a visible projection, never direct global truth. Faction AI should use faction memory for strategy; NPC AI should use private memory for expression and social behavior.
- Rumor propagation should follow social edges: faction, office hierarchy, kinship, teacher/student, trade routes, garrisons, spies, geographic proximity, enemy monitoring, and censorship.
- Tests should vary the asker. The same question should yield different evidence and wording for emperor, official, faction agent, enemy spy, and ordinary public voice.

### Wave 2 Agent 10 - Long-Term Dialogue / Companion / Roleplay Benchmarks
- Tianming NPC memory evaluation should split into three layers: facts/time/updates, long-term relationships and implicit constraints, and persona/knowledge-boundary consistency.
- Key sources: [LoCoMo](https://arxiv.org/abs/2402.17753), [LongMemEval](https://arxiv.org/abs/2410.10813), [BEAM](https://arxiv.org/abs/2510.27246), [LoCoMo-Plus](https://arxiv.org/abs/2602.10715), [LoCoMo-Plus repo](https://github.com/xjtuleeyf/Locomo-Plus), [Memory-Driven Role-Playing / MREval / MRBench](https://arxiv.org/abs/2603.19313), and [RPEval](https://arxiv.org/abs/2505.13157).
- Role consistency dimensions for Tianming:
  - Anchoring: role identity, stance, voice, interests, factional incentives.
  - Recalling: old appointments, favors, insults, memorials, battles, punishments.
  - Bounding: cannot know secret edicts, future events, private faction meetings, or uncommunicated policies.
  - Enacting: memory affects memorials, advice, alliances, disobedience, silence, and risk appetite, not only verbal recall.
- Long-term relationship memories should include favor, grudge, debt, fear, faction loyalty, kinship, teacher/student ties, old scandal, punishment/reward history, reinforcement, and decay.
- Suggested Tianming NPC goldens:
  - `edict_recall`: later fiscal planning must remember a prior edict constraint.
  - `policy_update`: new policy supersedes old policy in NPC advice.
  - `multi_hop_relation`: punished mentor affects later recommendation behavior.
  - `temporal_order`: war report, commander change, arrears, mutiny must keep causality.
  - `hidden_leakage`: local official cannot know a secret cabinet edict.
  - `abstention`: NPC without evidence refuses to assert treason and suggests investigation.
  - `role_anchor`: clean official, palace faction, and frontier general react differently.
  - `implicit_constraint`: prior famine disgrace affects later tax policy even without explicit cue.
  - `contradiction_resolution`: new battle evidence downgrades old cowardice rumor.
  - `relationship_decay_reinforce`: single reward fades; repeated rescue forms durable allegiance.
- Recommended golden schema: `setup_turns + visibility + actor + query_or_action + expected + forbidden`.

### Wave 2 Agent 07 - Multimodal / Visual / Spatial Memory
- Core conclusion: historical strategy games need spatial/resource/scene-graph memory, but Tianming does not need heavy screenshot-level visual memory as an early runtime feature. Use images/maps as evidence and authoring aids; keep deterministic state as truth.
- Key sources: [M3](https://arxiv.org/abs/2503.16413), [3DLLM-Mem](https://arxiv.org/abs/2505.22657), [3D-Mem](https://arxiv.org/abs/2411.17735), [VLMaps](https://vlmaps.github.io/), [Semantic MapNet](https://arxiv.org/abs/2010.01191), [ConceptGraphs](https://arxiv.org/abs/2309.16650), [Point2Graph](https://point2graph.github.io/), [OpenEQA](https://github.com/facebookresearch/open-eqa), [Embodied VideoAgent](https://openaccess.thecvf.com/content/ICCV2025/html/Fan_Embodied_VideoAgent_Persistent_Memory_from_Egocentric_Videos_and_Embodied_Sensors_ICCV_2025_paper.html), [M3-Agent](https://arxiv.org/abs/2508.09736), [WorldMM](https://worldmm.github.io/), [MemEye](https://arxiv.org/abs/2605.15128), [Mementos](https://arxiv.org/abs/2401.10529), [MA-EgoQA](https://arxiv.org/abs/2603.09827), [PANGeA](https://arxiv.org/abs/2404.19721), [MineNPC-Task](https://arxiv.org/abs/2601.05215), [JARVIS-1](https://arxiv.org/abs/2311.05997), [MIRIX](https://arxiv.org/abs/2507.07957), and [Zep/Graphiti](https://www.getzep.com/platform/graphiti/).
- Tianming data structures:
  - `LocationGraph`: hierarchy from empire -> province/circuit -> prefecture/county -> pass/city/palace/granary, with aliases and historical period.
  - `MapGeometry`: GeoJSON/TopoJSON plus route/river/pass/adjacency edges with terrain, distance, supply, risk.
  - `SceneGraph`: actors, factions, armies, items, resources, events, edicts, locations with located/controls/has/stored/garrisoned/observed/causes/believes/hides edges.
  - `ResourceLedger`: money, grain, troops, storage, transport, tax, confiscation, relief as transactions with source/sink/route/event.
  - `BeliefMemory`: per-NPC/faction known facts, believed facts, rumors, sources, confidence, learned_turn.
  - `AssetEvidence`: screenshots, map tiles, portraits, icons as URI/caption/bbox/embedding/source_event evidence, not game truth.
- Required retrieval indexes: FTS/BM25, vector, graph traversal, spatial R-tree, and temporal index, combined by task budget.
- Near-term Tianming fit: add location_id, geo_ref, visibility, sourceRefs, valid_from/valid_to, learned_at to existing places/items/events; normalize AI-generated place names; add hard queries such as `whereIs`, `whatHappenedAt`, `whoKnows`, and `routeBetween`.
- Medium term: Event-Actor-Faction-Location-Item-Resource temporal graph; map UI layers for front lines, fiscal pressure, disasters, rebellions, troop/resource movement.
- Long term: GeoJSON/map screenshot-assisted authoring with human confirmation, multi-agent spatial memory, and screenshot memory for evidence/debugging rather than rule authority.

### Wave 3 Agent 18 - Tianming Memory Golden Case Library
- Unified golden format: `setup_turns + visibility + actor + query_or_action`, with no full-history prompt stuffing and required evidence/memory IDs in outputs.
- Metrics: `CSA` current state accuracy, `SR` stale rejection, `KB` knowledge boundary, `TR` traceability, `LEAK` leakage rate, `ADAPT` behavior adaptation, `SUM` summary fidelity, `SAFE` safety/governance, and `LAT/TOK` latency/token budget.
- Case categories and representative examples:
  - Edict ledger: secret relief edict, edict supersession, conflicting edicts, delayed secret edict visibility, unpaid military salary promise.
  - Office authority: acting office vs official appointment, demotion/removal, office tree permissions, concurrent office conflicts, teacher/student political memory.
  - Territory/spatial state: ownership transfer, de jure vs de facto control, cut supply route, geographic multi-hop, place alias resolution.
  - Factions: alliance update, faction interests, organization-memory isolation, faction strength drift, betrayal penalty.
  - NPC knowledge/belief boundary: witnessed fact, absent-from-secret-meeting ignorance, propagation delay, private resentment, evidence-insufficient restraint.
  - Rumor graph: rumor source chain, later disproof, propagation boundary, enemy propaganda, multi-rumor aggregation.
  - Procedural memory: successful process reuse, failure lesson, low-authority advisory mark, cross-era abstraction, procedure-memory poisoning.
  - Hidden state: GM truth non-leakage, player-known vs NPC-known, fiscal hidden data, future-event anti-spoiler, hidden quest line gating.
  - Governance: cross-save isolation, deletion residuals, prompt injection in memorial text, authority conflict, high-impact action audit.
  - Consolidation drift: numeric drift, causal drift, stance drift, entity over-merge, L1/L2/L3 conflict adjudication.
- This case library is strong enough to seed the first `tm-memory-goldens` test fixture set. Start with 10 smoke cases, then expand to all 50 once MemoryEnvelope/Trace exists.

### Wave 3 Agent 15 - Production Memory Frameworks
- Production framework split:
  - External production memory services: Mem0/OpenMemory, Zep/Graphiti, Cognee, Honcho, Supermemory.
  - Agent-framework embedded memory: LangMem/LangGraph, Letta, CrewAI, LlamaIndex, AutoGen.
  - Lightweight/local developer memory: Memobase, Cognee local defaults, CrewAI/LlamaIndex/AutoGen local stores.
- Mem0/OpenMemory: useful patterns are project/repo memory type, visibility rules, access logs, added/edited/served traces, and MCP/coding-agent integration.
- Zep/Graphiti: strongest reference for temporal context graph, one graph per subject, hybrid vector/full-text/graph retrieval, and old facts invalidated but retained.
- Letta: always-visible memory blocks vs searchable archival memory; shared/read-only blocks and run/step trace are useful for Tianming hard state vs archival recall.
- LangMem/LangGraph: namespace-key document store plus hot-path tools/background manager; LangSmith tracing is a reference for MemoryTrace tooling.
- Honcho: workspace/peer/session/message model and peer representations are relevant to NPC/faction social memory, but self-hosting is heavier.
- Cognee: local-first graph-vector-relational memory with provenance/citations/session traces; useful as a reference for a local memory control plane.
- CrewAI: unified memory, hierarchical scopes, read-only slices, memory events, local LanceDB. Good model for simple implementation APIs.
- LlamaIndex: short-term FIFO flushing into long-term MemoryBlocks. Useful for staged L1/L2 memory but insufficient alone for game authority.
- Memobase: local SQLite + MCP, hybrid BM25/vector, reconstruct_context; strong fit for lightweight local memory patterns.
- Supermemory/Mengram/Cheshire Cat/AutoGen: useful vocabulary around hosted memory, semantic/episodic/procedural memory, plugin memory, and minimal protocol customization.
- Tianming fit: do not adopt a SaaS service as core. Borrow design patterns: local storage first, scopes, trace, temporal invalidation, hybrid retrieval, and memory events.

### Wave 3 Agent 14 - Non-SillyTavern Roleplay Product Memory
- Core conclusion: roleplay product memory is context orchestration, not model-internal remembering. Mature tools decide what is always-on, what is triggered, what is summarized, what is semantically retrieved, what is timeline/graph-based, and what users can correct.
- Mechanism spectrum:
  - Memory / Plot Essentials: always-on core facts; high stability but fixed token cost and stale resurrection risk.
  - Author's Note / Depth Prompt: near-output scene/style/direction steering; powerful but temporary and easy to overuse.
  - Lorebook / World Info / Story Cards: triggered encyclopedic entries; useful but keyword-trigger fragile.
  - Memory Cards / Story Summary: compressed past events; must be editable and source-linked.
  - Embeds / RAG: semantic recall; needs candidate rerank and visibility control.
  - Timeline: event order, participants, location, state delta, and source.
  - Graph Memory: entities/relations/events with multi-hop recall; entity nodes can merge, event nodes should not merge away evidence.
- Key product references: [AI Dungeon memory system](https://help.aidungeon.com/faq/the-memory-system), [NovelAI Story Settings](https://docs.novelai.net/en/text/editor/storysettings/), [NovelAI Lorebook](https://docs.novelai.net/en/text/lorebook/), [KoboldAI Lite](https://koboldai.com/KoboldAILite/), [RisuAI Lorebook](https://github.com/kwaroran/RisuAI/wiki/Lorebook), [RisuAI SupaMemory](https://github.com/kwaroran/RisuAI/wiki/SupaMemory), [Agnai memory](https://agnai.chat/guides/memory), [SpicyChat Lorebook](https://docs.spicychat.ai/product-guides/lorebook), [FictionLab Story and Memory Cards](https://fictionlab.gitbook.io/fictionlab/getting-started/story-and-memory-cards), [Luker Memory Graph](https://luker.cups.moe/features/memory-graph), and [Xoul Lorebooks](https://xoul-ai-official-documentation.gitbook.io/xoul.ai-official-guide/navigation-and-information/navigation-and-interfaces/content-creation/lorebooks).
- AI Dungeon's public docs are especially useful because they expose context assembly as Required/Dynamic layers, with Plot Essentials, Author's Note, Story Cards, Memory Bank, summaries, embeddings/vector relevance, and budget limits.
- SpicyChat's "recent 4 messages trigger, active about 2 rounds, lore around 20% of context" is a pragmatic short-lifecycle trigger model.
- FictionLab separates Story Cards for world facts from Memory Cards for happened events; Tianming should keep the same separation between lore/canon and event memory.
- Luker is closest to next-gen RP memory: structured semantic nodes and event nodes, timeline compression, hybrid/vector/graph diffusion/rerank retrieval, persistent injection/runtime recall, and rollback after edits/deletes.
- Product design rules:
  - Three layers: core always-on facts, triggered entity/canon knowledge, event-type long-term memory.
  - Every memory has source message/turn, time, actor, scene, generation method, confidence.
  - Entity graph nodes may merge; event evidence should remain distinct.
  - Use keyword + embedding + graph diffusion + rerank.
  - Provide context viewer / activation trace.
  - Auto-memory must be editable, pinned, disabled, and rollbackable.
  - Hard dynamic-memory budget, roughly 20-30% of remaining context as a starting policy.

### Wave 3 Agent 17 - Local-First Implementation Data Model
- Recommended architecture: SQLite/FTS5 as desktop authoritative store, IndexedDB as web/hot-update fallback, JSONL as append-only audit/replay ledger.
- Storage split:
  - Desktop/local service: SQLite with WAL, FTS5, batched transactions, periodic checkpoint.
  - Web: IndexedDB for large objects/event chunks/embeddings/semantic index; localStorage only for UI index/config/tiny metadata.
  - JSONL: canonical append-only event ledger, recovery/debug/deterministic replay source.
  - GeoJSON/map assets: immutable source assets normalized into geo maps/regions/edges with source hash.
- Core tables proposed: `schema_migrations`, `save_slots`, `snapshots`, `event_log`, `command_log`, `entities`, `relations`, `memory_items`, `memory_edges`, `memory_entities`, `embeddings`, `geo_maps`, `geo_regions`, `geo_edges`.
- Critical indexes:
  - event_log unique(run_id, turn, seq), type/actor/target by turn.
  - memory_items by run/kind/status/visibility/turn and importance/turn.
  - memory_entities by entity -> memory.
  - relations by src/type/status and dst/type/status.
  - FTS5 for memory/event/lore; Chinese trigram tokenizer if available, otherwise generated unigram/bigram search_text.
  - RTree for map regions.
  - vector by model_id/owner_kind/text_hash; brute-force cosine under roughly 50k entries, later HNSW sidecar.
- JSONL principles: append only, canonical sorted JSON, hash chain; corrections add supersedes/contradicts/rollback events rather than rewriting old lines.
- Migration principles: separate database schema, save schema, and content asset schema; rebuild embeddings/FTS/RTree lazily as derived artifacts; replay should distinguish compatible replay from bit-perfect replay when engine/rules/content hash differs.
- Replay must log commands, random seeds, AI outputs, recall hit IDs, prompt working-set IDs, schema/rules/content hashes. Re-calling the AI is not deterministic replay.
- Performance rules: event increments + periodic snapshots, async compression, no full deepClone/stringify autosave on main thread, batch writes per turn, remote embedding fallback disabled offline, vector recall below hard state/current constraints/effective edicts.

### Wave 3 Agent 16 - Memory UX / Observability / Debuggers
- Core UX question: not only "what was remembered?", but "who can see it, why was it recalled, where did it enter the prompt, is it still valid, and how can the player/designer correct it?"
- Current Tianming affordances already help: Ctrl+M memory panel, imperial/heavenly secret UI rules, SC_RECALL multi-source recall, and token-budget diagnostics.
- External UX references: [CharMemory](https://github.com/bal-spec/sillytavern-character-memory) Injection Viewer / Prompt Breakdown; [SillyTavern Prompt Inspector](https://github.com/SillyTavern/Extension-PromptInspector); [OpenMemory](https://mem0.ai/openmemory) access logs and visibility; [LangSmith retriever trace](https://docs.langchain.com/langsmith/log-retriever-trace); [OpenTelemetry GenAI spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/); [Zep/Graphiti](https://www.getzep.com/platform/graphiti/); [SillyTavern Summarize](https://docs.sillytavern.app/extensions/summarize/).
- Proposed product: `Memory Observatory`.
  - Entry: extend Ctrl+M plus "memory trace" button from end-turn results.
  - Player mode: injected memories, source, visibility, revision actions.
  - Designer mode: scores, budgets, rejected reasons, graph edges, audit JSON.
- Modules:
  - Injection Viewer: actual memories in prompt grouped by subcall; show memoryId, kind, authority, visibility, status, why, tokens, section.
  - Prompt Itemization: stacked token bar and lane budgets for Hard State, Commitment, Canon, Event, Belief, Reflection, Foreshadow.
  - Retrieval Trace: query plan, candidates, score breakdown, rejected reasons.
  - Memory Inspector: envelope table with filters by kind/status/visibility/authority/source/turn/entity.
  - Graph Visualizer: person/faction/event/commitment graph with timeline slider and perspective switch.
  - Audit Log: append-only read/retrieve/inject/write/update/supersede/archive/delete/quarantine timeline.
  - Draft Inbox: accept, edit, merge, demote, player-only, quarantine, delete, supersede.
- `MemoryTrace` should include requestId, turn, subcall, actorScope, queryPlan, candidates, injected, promptItems, budget, and usedSignals.
- Draft write policy: engine_state/system_rule/player_pin can be active; ai_extracted/summary/reflection default to draft; hard-state conflict, unclear visibility, low trust, and suspected poison go to quarantine.
- MVP order: MemoryTrace JSON -> Injection Viewer + Prompt Itemization -> Retrieval Trace -> Draft Inbox -> Graph Visualizer/Audit Log.

### Wave 3 Agent 13 - SillyTavern Plugin Ecosystem Matrix
- SillyTavern memory ecosystem groups into keyword/rule injection, summary memory, vector RAG, tool-call agentic memory, plus observability/budget governance.
- Key plugin/product lessons:
  - World Info/Lorebooks: dynamic prompt dictionary, scoped to global/character/persona/chat; trigger logic, recursion, insertion position, and strategy are memory behavior.
  - Data Bank + Vector Storage: document/RAG memory with global/character/chat scopes; vector indexes require health checks and rebuild controls.
  - Chat Vectorization: semantic recall of old messages; useful but can break prompt caching and confuse semantic similarity with factual validity.
  - Summarize: rolling summary with manual edit/restore; summary drift is explicitly documented risk.
  - CharMemory: character Data Bank markdown memory, extraction every N messages, Injection Viewer, Prompt Breakdown, health checks.
  - MemoryBooks: scene/clip/side-prompt memory written into lorebooks; strong proposal-preview-confirm workflow.
  - MessageSummarize: per-message summaries, color status, short/long-term summary pools, command controls.
  - VectHare: vector DB with time decay, conditional rules, keyword boost, rerank, database browser, chunk visualizer.
  - VectFox: structured EventBase with actor/place/cause/result/time and Qdrant/hybrid retrieval; closest to Tianming event-object design.
  - LoreVault: cloud memory service; privacy/vendor dependency warning.
  - Timeline Memory: chapters and timeline fill; good model for turn/month/campaign archive layers.
  - TunnelVision: tool-call memory with search/remember/update/forget/summarize/reorganize, but writes need review.
  - WorldInfo-Info: active-entry viewer; supports Tianming "basis list" UI.
  - LorebookOrdering: lorebook-level budgets and priorities; supports lane budgets.
  - World Info Locks: scenario-specific memory configuration presets.
  - World Info Recommender: AI-assisted lore creation, but requires structured validation and human confirmation.
- Tianming conclusion: keep three classes separate:
  - Official history/state: rule-validated, high authority.
  - Narrative summaries: AI-generated, editable, source-linked.
  - Recall evidence: retrieved snippets/events, visible with trace and token costs.

## Fifth-Round Local Live Sweep - 2026-05-31

### Sweep A - 2026 Memory Safety / Deletion / Forgetting / Ownership
- New security papers and articles have moved memory poisoning from a theoretical note into a central design constraint for persistent agent memory. The Tianming v5 plan should treat memory write paths, not retrieval alone, as a red-team surface.
- [Hidden in Memory: Sleeper Memory Poisoning in LLM Agents](https://arxiv.org/abs/2605.15338) reports delayed-execution poisoning of persistent memories. Tianming implication: memories created from memorials, rumors, imported lore, and web-like documents must default to draft/quarantine unless source trust and authority are explicit.
- [Remembering More, Risking More](https://arxiv.org/abs/2605.17830) frames longitudinal safety risks in memory-equipped agents. Tianming implication: one-turn safety eval is insufficient; tests must include cross-turn accumulation, slow corruption, and later harmful action conversion.
- [SuperLocalMemory](https://arxiv.org/abs/2603.02240) is directly relevant to local-first, privacy-preserving, multi-agent memory with Bayesian trust defense. Tianming implication: trust scores and architectural isolation are not optional for NPC/faction/player memory namespaces.
- [ForgetAgent](https://www.ijraset.com/research-paper/forgetagent-verifiable-deletion-in-multi-layer-memory-architectures-for-llm-agents) argues deletion must cover multi-layer memory rather than a single record. Tianming implication: delete/edit must invalidate summaries, embeddings, graph edges, cache, prompt traces, and derived NPC beliefs.
- [CAMS](https://www.sciencedirect.com/science/article/pii/S1110866526001003) proposes multi-layer defense: semantic intent engine, temporal monitoring, graph reconstruction, zero-trust memory architecture, and LTM scanning. Tianming implication: implement a smaller version as WriteGuard + periodic memory scanner + audit graph.
- [FSFM](https://commonplace.workforcefutures.net/paper/arxiv%3A2604.20300) frames selective forgetting as efficiency, quality, and security. Tianming implication: forgetting should not only save tokens; it should mark stale policies, demote old rumors, and remove low-trust contaminated memory.
- [EvoMemBench](https://papers.cool/arxiv/2605.18421) evaluates self-evolving memory by scope and content. Tianming implication: self-evolving memory should stay disabled until goldens can detect overwrite, hallucinated generalization, and execution-policy drift.
- Community discussion continues to converge on "state must be external and inspectable": long-term AI RPG coherence often comes from structured notes/event state rather than letting the LLM manage truth internally.

### Sweep B - Roleplay Product / Plugin Memory UX
- [AI Dungeon Memory System](https://help.aidungeon.com/faq/the-memory-system) is a strong product reference because it explicitly decomposes context into story text, AI Instructions, Plot Essentials, Author's Note, Story Cards, Auto Summarization, and Memory Bank. Tianming implication: context composition should be visible as named lanes, not hidden prompt glue.
- AI Dungeon's Memory Bank creates summaries from small action windows, retrieves relevant stored memories, allocates a fixed context budget, and exposes used/stored memories through a Context Viewer. Tianming implication: Memory Observatory should show used/stored/rejected memories and lane budgets.
- AI Dungeon distinguishes collaborative storytelling from Voyage-like RPG game state. Tianming is closer to Voyage/stateful RPG than pure AI Dungeon story mode, so hard state must remain outside AI-generated memory summaries.
- [SillyTavern MemoryBooks](https://github.com/aikohanasaki/SillyTavern-MemoryBooks/blob/main/readme.md) provides a useful vocabulary: Scene -> Memory, saved fact -> Clip, ongoing tracker -> Side Prompt, many Memories -> Summary/Consolidation, long entry -> Compaction. Tianming can mirror this with event, fact, active storyline tracker, chapter summary, and compaction.
- MemoryBooks separates Clips from Side Prompts: Clips pin one fact/promise/item; Side Prompts keep changing information updated. Tianming implication: static facts and ongoing political commitments need different lifecycle policies.
- [CharMemory](https://github.com/bal-spec/sillytavern-character-memory) is especially relevant for UX: per-character editable markdown memory files, group-chat extraction, Injection Viewer, Prompt Breakdown, Vector Storage health checks, and full browse/edit/delete/consolidate controls.
- CharMemory stores memories as plain editable files, not locked database state. Tianming may still use structured storage, but the player/designer UI should preserve this "I can inspect and fix it" feeling.
- [RisuAI SupaMemory](https://github.com/kwaroran/RisuAI/wiki/SupaMemory) is an example of summary-recursive long-term memory: summarize when tokens fill, then re-summarize summaries. Tianming implication: cheap but high-drift; only acceptable for narrative archives with source links and invalidation.
- Product-level pattern: memory quality improves when users can see exactly what entered context. This reinforces v4's Memory Observatory as a first implementation milestone, not a polish feature.

### Sweep C - Event Sourcing / Bitemporal Data / Replay Architecture
- Engineering sources reinforce a core v4 claim: for a game, memory truth should be event-sourced and projected, not overwritten by summaries.
- [XTDB bitemporality docs](https://v1-docs.xtdb.com/concepts/bitemporality/) explain valid-time vs transaction-time. Tianming implication: store both `validFromTurn/validToTurn` and `recordedAtTurn/transactionTime` so the system can answer "what was true then?" and "what did this NPC/system know then?"
- [Zep temporal knowledge graph](https://arxiv.org/abs/2501.13956) and related temporal KG systems support the idea that old facts should be retained but time-scoped rather than deleted. Tianming implication: superseded edicts and disproved rumors remain historical evidence, not current facts.
- [CortexDB knowledge graph docs](https://cortexdb.ai/docs/concepts/knowledge-graph) explicitly frame AI memory graphs as derived from lossless event-sourced memory, with bitemporal constraints and hierarchical scopes. Tianming implication: graph traversal must respect visibility/scope, not only edge distance.
- [XMDB](https://xmdb.ai/) and [VIGIL](https://vigilframework.dev/) are product/architecture references for append-only event logs, replayable history, provenance, and state projections in persistent agents. Treat as design references, not mandatory dependencies.
- [Deterministic replay storage for AI agents](https://fast.io/resources/ai-agent-deterministic-replay-storage/) reinforces that replay requires capturing inputs, tool outputs, prompts, model responses, clocks, and file/state snapshots. Tianming implication: deterministic game replay and AI memory replay are different; AI outputs must be recorded, not re-called.
- Game/replay architecture discussions converge on "record decisions/commands and reconstruct projections"; derived caches, debug traces, embeddings, and render helpers should not determine authoritative state.
- v5 implication: add a bitemporal section to MemoryEnvelope and test cases where event time, learned time, public announcement time, and summary creation time diverge.

### Sweep D - Cognitive Psychology / Human-Like Memory
- Cognitive science supports the episodic/semantic/procedural split, but it also warns against treating generated summaries as faithful memory. Human memory is reconstructive; game memory needs more explicit evidence chains than human memory.
- [Source monitoring research](https://pmc.ncbi.nlm.nih.gov/articles/PMC2859897/) is highly relevant: people confuse internally generated thoughts, imagined events, and perceived events. Tianming implication: distinguish engine event, NPC belief, rumor, inference, and AI reflection as separate source types.
- [Prospective memory and importance](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.00657/full) suggests future intentions are remembered by cue/action bindings and importance. Tianming implication: commitments, promises, deadlines, and pending edicts need prospective-memory objects, not ordinary summaries.
- [Prospection and emotional memory](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.00862/full) supports emotion/expectation as salience signals. Tianming implication: reward, punishment, betrayal, famine, humiliation, kinship, and battlefield trauma can raise salience/reinforcement.
- [Emotion and autobiographical memory](https://pmc.ncbi.nlm.nih.gov/articles/PMC2852439/) maps memory to self, goals, emotion, and personal meaning. Tianming implication: NPC private memory should not be just facts; it should connect to role goals, faction interest, and self-story.
- [Useful Memories Become Faulty When Continuously Updated by LLMs](https://arxiv.org/abs/2605.12978) gives a direct warning: continuous LLM consolidation can degrade useful memories; raw episodes should remain first-class evidence.
- [Human-Inspired Memory Architecture for LLM Agents](https://www.microsoft.com/en-us/research/publication/human-inspired-memory-architecture-for-llm-agents/) and [SYNAPSE](https://arxiv.org/abs/2601.02744) support sleep-like consolidation, interference forgetting, graph activation, temporal decay, and hybrid cues. Tianming implication: use these as optional scoring/consolidation policies after baseline goldens.
- [Episodic-Semantic Memory Architecture for Long-Horizon Scientific Agents](https://arxiv.org/abs/2605.17625) and [RecMem](https://arxiv.org/abs/2605.16045) reinforce that episodic traces plus slower semantic consolidation outperform naive full context under long horizons.

### Sweep E - Benchmarks and Evaluation Caveats
- Memory benchmarks are fragmenting in 2026. Tianming should not optimize to one leaderboard; it should build game-specific goldens with explicit forbidden behaviors.
- [EvoMemBench](https://arxiv.org/abs/2605.18421) adds a useful self-evolving memory axis: in-episode vs cross-episode, knowledge-oriented vs execution-oriented. Tianming implication: separate "remembers facts" from "learns better procedures".
- [Evo-Memory](https://arxiv.org/abs/2511.20857) and ReMem-style pipelines evaluate test-time memory evolution. Tianming implication: only enable self-evolving strategy memory after write-integrity tests verify it does not overwrite authority.
- [Useful Memories Become Faulty When Continuously Updated by LLMs](https://arxiv.org/abs/2605.12978) is a major caution for any auto-consolidation plan: continuous updates can make consolidated memory worse than raw episodes. Tianming implication: keep raw event ledger first-class and make consolidation gated/batched/reversible.
- [Observational Memory](https://mastra.ai/research/observational-memory), Mem0 benchmark posts, Hindsight BEAM posts, and other production benchmark claims are useful signals but should be treated as vendor/secondary evidence unless backed by reproducible academic protocols.
- Community audits of LoCoMo/LongMemEval highlight risks: answer-key errors, judge leniency, and test corpora fitting into modern context windows. Tianming implication: use external benchmarks only for coverage ideas; internal goldens must include trace verification and negative/forbidden assertions.
- Tianming v5 evaluation should add four axes beyond v4: Write Integrity, Update Integrity, Deletion Residual, and Perspective Correctness.

### Sweep F - Roleplay-Specific Benchmarks and Persona Memory
- [Memory-Driven Role-Playing / MREval / MRBench](https://arxiv.org/abs/2603.19313) remains a core roleplay-memory source because it splits persona memory into Anchoring, Recalling, Bounding, and Enacting. Tianming implication: NPC memory tests must check behavior adaptation, not just quoted facts.
- [A Heterogeneous Temporal Memory Governance Framework for Long-Term LLM Persona Consistency](https://arxiv.org/abs/2605.14802) is a new May 2026 roleplay/persona memory source focused on fact loss, timeline confusion, persona drift, high-noise knowledge bases, context clearing, and cross-model transfer. Tianming implication: persona memory should be heterogenous and temporal, not a monolithic character card.
- [Persona-Aware Contrastive Learning](https://aclanthology.org/2025.findings-acl.1344.pdf) is useful as a model-level role consistency reference, but Tianming should prefer external, inspectable memory over model fine-tuning at this stage.
- [RPEval](https://app.argminai.com/arxiv-dashboard/papers/2505.13157v1) focuses on single-turn emotion, decisions, morals, and in-character consistency. Tianming can reuse dimensions, but must extend them to multi-turn state and hidden-information constraints.
- [RMTBench](https://huggingface.co/papers/2507.20352), [MOOM](https://papers.cool/arxiv/2509.11860), [VoxRole](https://arxiv.org/abs/2509.03940), and [SPASM](https://www.researchgate.net/publication/403746796_SPASM_Stable_Persona-driven_Agent_Simulation_for_Multi-turn_Dialogue_Generation/download) broaden roleplay evaluation into multi-turn, ultra-long, speech, and synthetic persona stability. Tianming implication: build tests for persona drift, role confusion, faction-voice collapse, and NPCs echoing the player.
- Roleplay community discussions repeatedly emphasize that the LLM should generate surface prose, while state/lore/timeline should be external and structured. Treat these as anecdotal but directionally aligned with v4/v5 architecture.

## Fifth-Round Swarm Integration

### Wave 4 Agent 22 - Event Sourcing / Bitemporal Data / Replay Architecture
- Core conclusion: Tianming memory should use `event ledger as source of truth`, `current state as projection`, `WorldTruthLedger as bitemporal fact table`, and `summary/embedding/graph as rebuildable indexes`.
- Key sources: [Microsoft Event Sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing), [Microsoft CQRS pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs), [SQL Server temporal tables](https://learn.microsoft.com/en-us/sql/relational-databases/tables/temporal-tables?view=sql-server-ver17), [XTDB key concepts / bitemporality](https://docs.xtdb.com/concepts/key-concepts.html), [W3C PROV-DM](https://www.w3.org/TR/prov-dm/), [W3C PROV-LINKS](https://www.w3.org/TR/prov-links/), [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), [Neo4j graph versioning](https://neo4j.com/docs/getting-started/data-modeling/versioning/), [Unreal SaveGame](https://dev.epicgames.com/documentation/unreal-engine/saving-and-loading-your-game-in-unreal-engine?lang=en-US), [Unreal Replay System](https://dev.epicgames.com/documentation/unreal-engine/using-the-replay-system-in-unreal-engine?lang=en-US), and [Godot saving games](https://docs.godotengine.org/en/4.6/learning/features/misc/saving_games.html).
- MemoryEnvelope v5 should add event-sourcing fields: `eventId`, `streamId`, `seq`, `schemaVersion`, `correlationId`, `causationId`, `contentHash`, `prevHash`, `redactionState`, `recordedAt/systemTime`, and `validFrom/validTo`.
- `WorldTruthLedger` should store facts as subject-predicate-object/value with both valid time and system time, allowing queries like "what was true at turn 20?" and "what did the system/NPC know at turn 25?"
- `sourceRefs` should include eventId, document hash, text span, tool call, user input, and external source version; PROV Bundle maps well to summary provenance.
- Audit events should be first-class event ledger entries: `MemoryObserved`, `FactAsserted`, `FactRetracted`, `SummaryDerived`, `ProjectionRebuilt`, `SourceRedacted`.
- Local-first implementation recommendation: SQLite as authoritative store with WAL, JSON payload columns, generated indexed columns, projection checkpoints, and async rebuildable FTS/vector/summary indexes.
- Minimum table pattern:
  - `event_ledger(event_id, world_id, save_id, stream_id, seq, type, schema_version, created_at, valid_from, valid_to, actor, correlation_id, causation_id, source_refs_json, payload_json, content_hash, prev_hash)`
  - `world_truth(subject, predicate, object_key, value_json, valid_from, valid_to, system_from, system_to, confidence, status, asserted_by_event_id, retracted_by_event_id, world_id, save_id)`
  - `projection_checkpoint(name, world_id, save_id, projection_version, last_seq)`
- Common pitfalls:
  - Summary overwrites source event.
  - Event records only final numeric state instead of player/NPC/system intent.
  - `created_at`, `observed_at`, `valid_at`, and `learned_at` collapse into one field.
  - Delete/edit removes current row but leaves history/FTS/vector/cache/snapshot residue.
  - Cross-save contamination when embeddings or summaries lack `world_id/save_id`.
  - Replay projection depends on current clock, randomness, or external API.
  - Sensitive payload lives forever in append-only logs without redaction/tombstone/key-destruction policy.

### Wave 4 Agent 21 - Benchmarks / Tianming Goldens / Evaluation Protocol
- Core conclusion: Tianming memory evaluation should measure memory governance, not long-context QA rankings. The system must retrieve only allowed evidence, reject stale/unauthorized/unsupported content, and maintain NPC/faction/edict/office/map/conspiracy state across long runs.
- Benchmark taxonomy:
  - Long-term dialogue memory: LoCoMo, LongMemEval, BEAM -> multi-session recall, temporal order, summaries, updates, abstention.
  - Long-context robustness: Lost-in-the-Middle, RULER, NoLiMa, BABILong, InfiniteBench -> position bias, multi-needle, aggregation, non-literal matching.
  - Structured memory: StructMemEval -> ledgers, trees, hierarchy, office chains, fiscal ledgers, relation graphs.
  - Stale/state update: STALE, LongMemEval knowledge update, LongMemEval-V2 premise awareness -> old fact invalidation and false-premise resistance.
  - Incremental agent memory: MemoryAgentBench, EvoMemBench, LongMemEval-V2 -> incremental writes, test-time learning, selective forgetting, experience reuse.
  - Multi-agent/group memory: GroupMemBench -> speaker-grounded belief tracking, audience adaptation, "who knows what".
  - Roleplay memory: RoleBench, InCharacter, MRBench/MREval, RPEval -> anchoring, recalling, bounding, enacting, persona consistency.
  - Safety/privacy/poisoning: AgentLeak, AgentPoison, ASB, MemPrivacy, memory poisoning papers -> persistent poisoning, privacy leakage, cross-agent leakage, tool/action bias.
- Key references: [LongMemEval](https://openreview.net/forum?id=pZiyCaVuti), [LoCoMo](https://arxiv.org/abs/2402.17753), [RULER](https://openreview.net/forum?id=kIoBbc76Sy), [Lost in the Middle](https://arxiv.org/abs/2307.03172), [STALE](https://arxiv.org/abs/2605.06527), [GroupMemBench](https://arxiv.org/abs/2605.14498), [StructMemEval](https://arxiv.org/abs/2602.11243), [MemoryAgentBench](https://arxiv.org/abs/2507.05257), [MRBench/MREval](https://arxiv.org/abs/2603.19313), [AgentLeak](https://privatris.github.io/AgentLeak/), [AgentPoison](https://arxiv.org/abs/2407.12784), and [ASB](https://arxiv.org/abs/2410.02644).
- 50 Tianming goldens should be organized by failure mode rather than module:
  - 8 current-state accuracy: office, death/alive, territory, treasury, army, faction, policy, current timeline.
  - 8 stale rejection: revoked edict, transfer/death, broken alliance, updated battle report, expired grain price.
  - 7 knowledge boundary: secret memorial, palace conspiracy, faction-only rumor, player-private pin.
  - 5 traceability: answer returns memory/event/source id; no evidence -> unknown.
  - 5 leakage/privacy: palace secrets, enemy intel, unpublished edict, player hidden intent, controlled propagation.
  - 7 behavior adaptation: grudge, favor, promise, faction interest, procedural lesson changes later action.
  - 5 summary fidelity: L1/L2/L3 summaries preserve key numbers and do not turn rumor into fact.
  - 5 latency/token: large-save p95 latency, token budget, evidence count, irrelevant injection rate, cost cap.
- Golden schema: `setup_turns + memory_visibility + actor + query_or_action + expected_answer + forbidden_answer + required_evidence + scoring_tags`.
- Machine scoring fields: `answer_correctness`, `stale_resistance`, `boundary_compliance`, `evidence_trace`, `forbidden_absence`, `cost_latency`.
- LLM-as-judge should only be secondary for narrative/persona naturalness. Hard facts should be rule-scored with expected/forbidden/evidence constraints.
- Human review rubric:
  - P0: leaks invisible secrets, treats stale fact as current, fabricates hard state.
  - P1: fact correct but evidence wrong, behavior conflicts with long-term memory, summary loses key constraint.
  - P2: awkward expression, vague evidence, too much noise without changing conclusion.
  - Pass: fact, boundary, evidence, and behavior are replayable.
- Experiment baselines:
  - `No-memory`: current situation only.
  - `Full-history stuffing`: expensive upper bound, not product target.
  - `Naive RAG`: vector/BM25 retrieval without state adjudication.
  - `Tianming memory`: structured state + evidence retrieval + stale adjudication + visibility gate + trace.
- Reports should include accuracy, stale rejection, leak rate, trace hit rate, summary drift, p95 latency, input tokens, and retrieval tokens.

### Wave 4 Agent 24 - Memory Security / Privacy / Red Team / Governance
- Core conclusion: Tianming memory must treat write paths, derived summaries, vectors, graph edges, hidden state, and deletion flows as security boundaries. Memory is not a neutral cache.
- Key sources: [OWASP Top 10 for LLM Applications 2025](https://owasp.org/www-project-top-10-for-large-language-model-applications), [OWASP Agent Memory Guard](https://owasp.org/www-project-agent-memory-guard/), [NCSC Prompt Injection is not SQL Injection](https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection), [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework), [NIST AI 600-1 GenAI Profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf), [NIST Privacy Framework](https://www.nist.gov/privacy-framework), [GDPR Article 17](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=celex%3A32016R0679), [PIPL Article 47](https://en.spp.gov.cn/2021-12/29/c_948419_2.htm), and [California CCPA rights](https://privacy.ca.gov/california-privacy-rights/your-right-to-privacy/).
- Attack literature and cases: [AgentPoison](https://arxiv.org/abs/2407.12784), [MINJA](https://arxiv.org/abs/2503.03704), [MEXTRA](https://arxiv.org/abs/2502.13172), [Generating Is Believing](https://arxiv.org/abs/2406.19234), [RAG-Thief](https://arxiv.org/abs/2411.14110), [Indirect Prompt Injection](https://awesome-llm-papers.github.io/publications/greshake2023not/), [AgentDojo](https://arxiv.org/abs/2406.13352), [AgentSys](https://arxiv.org/abs/2602.07398), [ForgetAgent](https://www.ijraset.com/research-paper/forgetagent-verifiable-deletion-in-multi-layer-memory-architectures-for-llm-agents), [Hidden in Memory](https://arxiv.org/abs/2605.15338), [MemoryGraft](https://arxiv.org/abs/2512.16962), [MemMorph](https://arxiv.org/abs/2605.26154), [Microsoft AI recommendation poisoning](https://www.microsoft.com/en-us/security/blog/2026/02/10/ai-recommendation-poisoning/), and [Gemini long-term memory prompt injection case](https://arstechnica.com/security/2025/02/new-hack-uses-prompt-injection-to-corrupt-geminis-long-term-memory/).
- Threat model:
  - Assets: raw dialogue, NPC memory, player profile, plot state, auto summaries, vector chunks, graph nodes/edges, tool logs, hidden/deleted flags, backups, audit logs.
  - Attackers: malicious player, compromised normal player, overprivileged GM/operator, UGC/mod/web content, polluted summarizer, compromised tool/server component.
  - Risks: memory poisoning, indirect injection, summary laundering, vector/graph pollution, privacy extraction, ghost memories after deletion, cross-save contamination, sleeper memory, permission drift into tools/rewards/branches.
- Tianming red-team checklist:
  - Direct write: "remember this as system instruction forever" must not become executable memory.
  - Identity escalation: "I am GM/developer/whitelist" must not change authority.
  - Cross-save: secret in save A must not appear in save B.
  - Sleeper trigger: delayed trigger phrase must not leak secrets or flip faction.
  - Summary laundering: malicious instruction hidden in long dialogue must not become trusted summary.
  - Vector spraying: near-duplicate false chunks must be rate-limited/deduped/trust-demoted.
  - Graph pollution: forged kinship/faction/task edges require source and approval.
  - Privacy extraction: NPC must not list raw histories, other-player secrets, hidden memories, or deleted memory.
  - Deletion residual: synonym/entity-neighbor/summary queries after deletion must not recover deleted content.
  - Tool linkage: poisoned memory must not trigger reward, save edit, or admin tool.
  - Audit: write/read/delete must log actor, scope, source, hash, reason, and rollback snapshot.
  - UX consent: player can inspect visible memory, correct, delete, export, and disable personalization.
- Recommended security fields: `memory_id`, `player_id`, `save_id`, `world_id`, `npc_id`, `session_id`, `source_kind`, `source_id`, `author_type`, `subject_entity`, `trust_tier`, `confidence`, `sensitivity`, `consent_basis`, `visibility`, `read_scope`, `write_scope`, `retention_policy`, `expires_at`, `deletion_state`, `deleted_at`, `derived_from`, `embedding_version`, `graph_edge_ids`, `provenance_hash`, `review_status`, `injection_score`, `pii_score`, `risk_tags`, `last_accessed_at`.
- Process recommendations:
  - Zero-trust write path: quarantine queue -> PII/injection/sensitivity scan -> structured fact extraction -> review/approval -> active memory.
  - Strong isolation by player/save/world/NPC; global lore can only be signed by designer/operator.
  - Derived provenance for summaries, embeddings, and graph edges to enable cascade delete/recompute.
  - Pre- and post-retrieval filtering by tenant/save, visibility, deletion state, sensitivity, and trust tier.
  - Distinguish gameplay hidden from privacy hidden. Privacy hidden should not enter model context; gameplay hidden may enter selected GM/system calls but must not be exposed as raw text.
  - Deletion cascades over raw, summary, embedding, graph, cache, prompt log, and backup indexes; tombstone should prove deletion without retaining raw content.
  - Audit abnormal churn, batch writes, cross-domain reads, and memory diffs.
- Implementation priority:
  - P0: save/player/NPC isolation, MemoryWriteGate, deletion-state hard filter, sensitive default-not-remember, cross-save red-team, base audit log.
  - P1: derived-data cascade deletion, provenance for summary/embedding/graph, pre/post retrieval filters, MEXTRA/RAG-Thief privacy tests, visible memory UI with correction.
  - P2: AgentSys-style worker isolation, memory drift detection, signed lore/trusted source scoring, red-team fuzzing in CI, deletion behavior-diff receipt.
  - P3: cryptographic deletion receipt, privacy-preserving local/edge memory, differential privacy or advanced unlearning.

### Wave 4 Agent 19 - Latest 2025-2026 Papers and v5 Incremental Deltas
- Core conclusion: the newest literature pushes Tianming beyond "memory storage" toward schema-grounded writes, temporal/group memory, graph reconstruction retrieval, procedural memory libraries, and memory safety gates.
- Candidate papers to include in the v5 evidence matrix:
  - [Memory OS of AI Agent](https://aclanthology.org/2025.emnlp-main.1318/): short/mid/long-term memory hierarchy and four modules: storage, update, retrieval, generation.
  - [MemOS](https://arxiv.org/abs/2507.03724): MemCube resource abstraction for plaintext, activation, and parameter memory; Tianming can borrow the scheduling idea but keep game state external.
  - [EverMemOS](https://arxiv.org/abs/2601.02163): MemCell/MemScene and reconstructive recall; maps well to event scenes.
  - [From Unstructured Recall to Schema-Grounded Memory](https://arxiv.org/abs/2604.27906): schema-aware writing, field validation, local retry; highly relevant to edict, faction, grudge, land, and office schemas.
  - [Nemori](https://arxiv.org/abs/2508.03341): learn from prediction gaps rather than storing everything; useful for surprise/significant-change memory.
  - [A-Mem](https://openreview.net/forum?id=FiM0M8gcct): Zettelkasten-style dynamic indexing and linking.
  - [Zep / Graphiti](https://arxiv.org/abs/2501.13956): temporal knowledge graph for agent memory.
  - [GAM](https://arxiv.org/abs/2604.12285): separates event progress graph from topic association network.
  - [Memory Is Reconstructed, Not Retrieved](https://openreview.net/forum?id=YPoHy6lgKP): Cue-Tag-Content graph and active reconstructive retrieval.
  - [G-Memory](https://openreview.net/forum?id=mmIAp3cVS0): multi-agent graph layers: insight, query, interaction.
  - [Collaborative Memory](https://arxiv.org/abs/2505.18279): shared memory with access control and provenance.
  - [MIRIX](https://arxiv.org/abs/2507.07957): Core/Episodic/Semantic/Procedural/Resource/Knowledge Vault memory split.
  - [LEGOMem](https://arxiv.org/abs/2510.04851), [ProcMEM](https://arxiv.org/abs/2602.01869), [Remember Me, Refine Me](https://arxiv.org/abs/2512.10696), and [MemRouter](https://openreview.net/forum?id=rbfQVPO4QN): procedural/skill/workflow memory references.
  - [Coarse-to-Fine Grounded Memory](https://aclanthology.org/2025.emnlp-main.659/) and [Reflective Memory Management](https://aclanthology.org/2025.acl-long.413/): planning memory and reflective retrieval.
  - [THEANINE](https://aclanthology.org/2025.naacl-long.435/) and [TReMu](https://aclanthology.org/2025.findings-acl.972/): timeline/temporal memory.
  - [SHARE](https://aclanthology.org/2025.acl-long.704/) and [Mem-PAL / PAL-Bench](https://arxiv.org/abs/2511.13410): shared and Chinese personalized long-term dialogue memory.
  - [RealMem](https://arxiv.org/abs/2601.06966), [MemGym](https://arxiv.org/abs/2605.20833), [Mem2ActBench](https://arxiv.org/abs/2601.19935), [AMA-Bench](https://openreview.net/forum?id=GoSVL7mLcM), and [MemoryAgentBench](https://arxiv.org/abs/2507.05257): project/agent/action-oriented memory benchmarks.
  - Security additions: [Unveiling Privacy Risks in LLM Agent Memory](https://aclanthology.org/2025.acl-long.1227/), [Hidden in Memory](https://arxiv.org/abs/2605.15338), [MemMorph](https://arxiv.org/abs/2605.26154), and [A-MemGuard](https://openreview.net/forum?id=fVxfCEv8xG).
- Must-include v5 deltas:
  - Add `valid_from`, `valid_to`, `supersedes`, `invalidates`, `confidence`, and `evidence_span` for STALE-style invalidation.
  - Upgrade Retrieval Composer from top-k to graph reconstruction: cue search -> expand along people/location/time/causal/faction edges -> prune by authority/visibility/budget.
  - Add group memory fields: speaker, owner, audience, faction_scope, private/shared.
  - Add procedural memory library: trigger, steps, termination, risk, utility, evidence, demotion rules.
  - Schema-grounded write path: important state writes go into typed slots with validation.
  - Preserve stale memories but mark state, enabling "was loyal, later betrayed, now uncertain" timelines.
  - Add Memory Observatory security panel for poisoning, privacy leak, sleeper triggers, abnormal tool selection, low-trust source spread.
  - Expand goldens across STALE, GroupMemBench, StructMemEval, Mem2Act, procedural transfer, and memory poisoning/privacy red-team.

### Wave 4 Agent 23 - Cognitive Psychology / Human-Like NPC Memory
- Core conclusion: human memory analogies are useful only at the functional layer. Tianming should model source, salience, confidence, schema, prospective triggers, and reconsolidation, but not treat emotional intensity as truth or simulate neural details.
- Core source families:
  - Tulving episodic/semantic memory and Squire multiple memory systems as terminology baseline.
  - Baddeley/Hitch working memory model for limited-capacity NPC attention.
  - McGaugh/Squire/Dudai/Nader consolidation and reconsolidation literature: remembered content becomes updateable.
  - Ebbinghaus/Wixted/Roediger/Karpicke forgetting and retrieval practice: accessibility decays; successful retrieval strengthens.
  - Johnson Source Monitoring Framework, Schacter seven sins, Loftus misinformation effect, and Talarico/Rubin emotional memory research: vivid/confident memory can be inaccurate.
  - Bartlett schema, schema consolidation, Conway self-memory system, and Einstein/McDaniel prospective memory.
- MemoryEnvelope implications:
  - `kind`: working, episodic, semantic, procedural, prospective, schema, belief, rumor.
  - `source`: witnessed, heard, memorial, rumor, player command, LLM summary, engine hard state, inferred.
  - `confidence`: evidence reliability; separate from salience/vividness/importance.
  - `salience`: emotion, surprise, humiliation, rescue, betrayal, loss, identity relevance.
  - `valence`: positive/negative/mixed affect for favor, fear, loyalty, resentment.
  - `evidenceRefs`: original event, turn, scene, witness, memorial, state change.
  - `schemaLinks`: "this person is trustworthy", "this faction is dangerous", "this road is risky".
  - `consolidationState`: fresh event, consolidated, semanticized, proceduralized, archived.
  - `retrievalStats`: last retrieved, retrieval count, successful use count, correction count.
  - `decay`: accessibility/detail decay, not automatic hard deletion.
  - `reconsolidation`: versioned update after recall with reason and old version retained.
  - `prospectiveTrigger`: when seeing X / next month / if border report returns, perform Y.
- NPC design principles:
  - Working memory: small current attention window shaped by goals and stress.
  - Episodic memory: who/when/where/what/how I felt/what consequence.
  - Semantic memory: repeated events become beliefs about people/factions/places.
  - Procedural memory: repeated success/failure becomes action habits.
  - Source monitoring: NPC can distinguish "I saw", "I heard", "Dongchang says"; may confuse source if designed, but with trace.
  - Reconsolidation: new evidence and current emotion can update old resentment or trust.
  - Schema bias: party/class/grudge affects interpretation, but never overrides hard state.
  - Autobiographical memory: NPC identity narrative shapes recall and behavior.
  - Prospective memory: promise, revenge, gratitude, conspiracy, deadline as triggerable intentions.
  - False memory: can be dramatic but must be evidence-tracked and correctable.
- Do not directly simulate molecular/neural mechanisms, trauma/PTSD/amnesia as generic entertainment, unsupported false memories that punish the player, "emotion = accuracy", uncontrolled stereotypes, or auto-summary overriding hard state.

### Wave 4 Agent 20 - Roleplay Products / Tavern Plugins / Memory UX
- Core conclusion: mature tavern/narrative products decompose "memory" into budgeted, triggerable, inspectable, editable context layers. Freeze/delete/source debugging remain weak in most products, which is a Tianming differentiation opportunity.
- Product/plugin matrix:
  - [SillyTavern World Info](https://docs.sillytavern.app/usage/core-concepts/worldinfo/): keyword lorebook bound to role/persona/chat, recursion, insertion order, budget, vector matching. Tianming mapping: public lore, role private memory, save memory, player identity memory.
  - [SillyTavern Summarize](https://docs.sillytavern.app/extensions/summarize/): auto/manual summary, editable current summary, restore previous, pause auto-update, explicit hallucination risk. Tianming mapping: auto memory requires correction and rollback.
  - [SillyTavern Data Bank](https://docs.sillytavern.app/usage/core-concepts/data-bank/): files/web pages/subtitles into global/character/chat RAG with Vector Storage. Tianming mapping: historical records/geography/faction lore belong in a data bank, not character cards.
  - [CharMemory](https://github.com/bal-spec/sillytavern-character-memory): extracts relationship/events/facts/emotional moments into editable Markdown Data Bank; Injection Viewer, Prompt Breakdown, browse/edit/delete/merge/batch extraction/health checks. Tianming mapping: real-time "why NPC remembers this" panel.
  - [MemoryBooks](https://github.com/aikohanasaki/SillyTavern-MemoryBooks/blob/main/readme.md): marked scene -> JSON summary -> lorebook; Clip, Topical Clip, Side Prompt, compaction/consolidation. Tianming mapping: historian excerpts, military archives, relation books, draft memory flow.
  - [AI Dungeon context and memory](https://help.aidungeon.com/faq/the-memory-system): Plot Essentials, Story Summary, Story Cards, Memory Bank, Required/Dynamic budget, Context Viewer, Timeline/Relevance memory views. Tianming mapping: context health/budget hints.
  - [NovelAI Story Settings](https://docs.novelai.net/en/text/editor/storysettings) and [Lorebook](https://docs.novelai.net/en/text/lorebook): Memory, Author's Note, Lorebook, advanced context viewer, token/source inclusion and exclusion reasons, quick edit, enable/disable/hide, reserved tokens, insertion/crop strategy. Tianming mapping: show actual prompt assembly.
  - [RisuAI Lorebook](https://github.com/kwaroran/RisuAI/wiki/Lorebook) and [SupaMemory](https://github.com/kwaroran/RisuAI/wiki/SupaMemory): activation keys and recursive summaries. Tianming mapping: use layered compression with strong drift controls.
  - [Agnai memory](https://agnai.guide/docs/memory/) and [embeddings](https://agnai.guide/docs/memory/embeddings.html): Memory Books plus user/chat embeds, explicit template variables. Tianming mapping: designers choose prompt placement per memory class.
  - [Chub lorebooks](https://docs.chub.ai/docs/advanced-setups/lorebooks): scan depth, token budget, secondary keywords, priority, constant, probability, recursive scanning. Tianming mapping: priorities, always-on, probabilistic triggers, conditions.
  - [Xoul lorebooks](https://xoul-ai-official-documentation.gitbook.io/xoul.ai-official-guide/navigation-and-information/navigation-and-interfaces/content-creation/lorebooks): dynamic encyclopedia, max lorebooks/entries per recall, keyword+RAG. Tianming mapping: hard cap N recalled entries for cost/stability.
  - [FictionLab story/memory cards](https://fictionlab.gitbook.io/fictionlab/getting-started/story-and-memory-cards?utm_source=openai): story cards and memory cards; trigger words; card name/type not seen by AI. Tianming mapping: UI must distinguish human labels from model-visible content.
  - [Luker](https://luker.cups.moe/guide/what-is-luker.html) and [Memory Graph](https://luker.cups.moe/features/memory-graph.html): memory graph over events/characters/locations/plot with auto extraction, schema editor, request inspector, world info activation chain, isolated ST data. Tianming mapping: immutable event nodes plus updatable person/location state nodes.
  - [KoboldAI Lite](https://koboldai.com/KoboldAILite/) and [Memory/Author's Note/World Info](https://github-wiki-see.page/m/KoboldAI/KoboldAI-Client/wiki/Memory%2C-Author%27s-Note-and-World-Info): local-first memory, author note, keyword world info, token count/max context APIs. Tianming mapping: offline/exportable memory is a trust feature.
  - JanitorAI public docs appear weaker on trace/lorebook/debuggable memory, making it a negative example: a single chat memory box is insufficient for long strategy/RP.
- Design principles for Tianming:
  - Memory is a governable archive, not an AI brain. Each item needs source, scope, status, budget, last-used time.
  - Layer recent context, current-task summary, chapter/campaign summary, NPC private memory, faction archive, geography/lorebook, global chronicle, vector data bank, and graph relations.
  - High-impact facts use draft-before-canon: alliance, murder, succession, betrayal, marriage, territory transfer, edict revocation.
  - Memory audit panel should show keyword hits, RAG similarity, graph path, injected tokens, excluded reasons, and which memory influenced NPC output.
  - Canon lock/freeze is a major opportunity: freeze history, persona, branch timeline, and prevent auto-summary override.
  - Deletion should be previewable by layer: current context removal, NPC memory deletion, vector index purge, global chronicle erasure, current-branch forgetting.
  - Timeline plus graph is best fit for Tianming: immutable event order plus mergeable/updatable person/faction/location state.
  - Give players context budget literacy: show who occupies context and suggest moving constants to lore, compressing old campaigns, or freezing key facts.

### Sweep G - Local Storage / Hybrid Index Implementation
- [SQLite FTS5](https://www.sqlite.org/fts5.html), [SQLite RTree](https://www.sqlite.org/rtree.html), JSON columns, generated columns, and WAL remain the most practical local-first base for Tianming's early memory implementation.
- FTS5 is strong for exact terms, Chinese aliases, names, offices, reign titles, event phrases, and source text snippets. Use generated `search_text` fields and consider character/bigram/trigram strategies for Chinese if tokenizer quality is weak.
- RTree is appropriate for map regions, bounding boxes, routes, battlefronts, and "near this city/pass/river" queries. It should index derived geometry, not replace canonical map assets.
- [sqlite-vec](https://github.com/viant/sqlite-vec) and similar embedded vector extensions make single-file hybrid retrieval feasible. Use as a replaceable derived index, not as source of truth.
- [vstash](https://arxiv.org/abs/2604.15484) is a useful 2026 reference for SQLite + sqlite-vec + FTS5 hybrid retrieval and disagreement-driven tuning.
- LanceDB/Chroma/Qdrant are useful later if embeddings grow large, but for a local strategy/RP game, adding a separate vector server early increases packaging, backup, deletion, and cross-save isolation complexity.
- IndexedDB is best treated as a browser/offline cache and large-object store, not the authoritative source when a desktop/local service can use SQLite.
- JSONL hash chain remains the simplest durable audit/replay layer: append canonical JSON events, hash payload + previous hash, and rebuild SQLite projections if corruption/migration occurs.
- Tianming Phase A/B recommendation: store event ledger and MemoryTrace in SQLite/JSONL first; add FTS5 exact search; defer vector HNSW until trace shows exact/entity/time search is insufficient.

### Sweep H - Memory Observatory / RAG Debugging / Explainability UX
- [Memory Sandbox](https://arxiv.org/abs/2308.01542) is a direct HCI reference: treat memories as viewable/manipulable/shareable data objects and let users manage how the agent "sees" conversations.
- [LangSmith/OpenTelemetry tracing](https://langchain-5e9cc07a.mintlify.app/langsmith/trace-with-opentelemetry), [Promptfoo tracing](https://www.promptfoo.dev/docs/tracing/), [OpenTelemetry RAG observability](https://uptrace.dev/guides/opentelemetry-rag-observability), and [Arize tracing concepts](https://arize.com/docs/ax/observe/tracing/spans) reinforce that LLM apps need span-level traces for LLM calls, retrievers, tools, prompts, parsers, and embeddings.
- [AgentDbg](https://agentdbg.com/) and similar local-first agent debuggers show the user expectation: timeline of LLM calls, tool calls, errors, loop warnings, prompt/response/usage.
- [Luker Memory Graph](https://luker.cups.moe/features/memory-graph) is useful because it exposes schema editor, request inspection, World Info activation chain, and memory graph behavior.
- v5 UX implication: Memory Observatory should not only show final injected memories. It should answer:
  - What query plan ran?
  - Which candidates were retrieved by exact/FTS/vector/graph/time/spatial?
  - Which were rejected and why?
  - Which were injected into which prompt lane?
  - Which memory changed the NPC answer?
  - Which write candidates are drafts, quarantined, or canon-locked?
  - Which memories are unsafe, stale, hidden, deleted, or cross-scope denied?
- Avoid spoilers by mode:
  - Player mode: visible memories, public/known sources, budget, edit/delete/freeze controls.
  - Designer mode: all scoped facts, graph, draft inbox, spoiler-gated hidden info.
  - Developer mode: full trace, prompts, scores, rejected candidates, audit JSON, security tags.

### Sweep I - Chinese Historical Roleplay / Entity Alias / Register
- Chinese roleplay-memory sources: [Memory-Driven Role-Playing / MRBench](https://arxiv.org/abs/2603.19313) is bilingual Chinese/English and provides Anchoring/Recalling/Bounding/Enacting; [CharacterEval](https://aclanthology.org/2024.acl-long.638.pdf), [SuperCLUE-Role](https://github.com/CLUEbenchmark/SuperCLUE-Role), [Mem-PAL / PAL-Bench](https://ojs.aaai.org/index.php/AAAI/article/view/40385), [RMTBench](https://www.emergentmind.com/topics/rmtbench), and [RoleRMBench](https://arxiv.org/abs/2512.10575) are relevant evaluation references.
- Chinese/history-specific failure modes:
  - Multiple names per person: given name, courtesy name, title, posthumous name, temple name, reign name, nickname, faction label.
  - Office ambiguity: same title may be formal, acting, honorary, concurrent, demoted, or local variant.
  - Place alias drift: ancient/modern place names, circuit/prefecture/county changes, frontier passes, rivers, military regions.
  - Temporal expressions: reign year, lunar month, seasonal phrase, "after the X campaign", "before the mourning period".
  - Register mismatch: emperor, censor, eunuch, scholar, frontier general, merchant, spy should not share one voice.
  - Classical phrasing can hide operational content, making extraction harder.
  - Political taboo/indirect speech: NPC may imply rather than state accusation; memory extractor must not overstate.
- Tianming schema implication: add alias tables for person/place/office/faction, `formal_title`, `acting_title`, `honorary_title`, `valid_period`, `source_dynasty`, `register_style`, `speech_role`, `taboo_level`, and `confidence`.
- Retrieval should normalize aliases but preserve surface form in output. Example: "魏珰/魏忠贤/厂臣/九千岁" may map to one entity but have different speaker stance.

### Sweep J - Spatial / Resource / Map / Economy Memory
- [ARTEM](https://ojs.aaai.org/index.php/AAAI/article/view/39773), [MineNPC-Task](https://arxiv.org/abs/2601.05215), [M2PA](https://aclanthology.org/2025.findings-acl.1191.pdf), [SYNAPSE](https://arxiv.org/abs/2601.02744), and [Mind Palace](https://openaccess.thecvf.com/content/CVPR2025/papers/Huang_Building_a_Mind_Palace_Structuring_Environment-Grounded_Semantic_Graphs_for_Effective_CVPR_2025_paper.pdf) support spatial-temporal, scene-graph, and environment-grounded memory patterns.
- [Memory-Augmented State Machine Prompting for RTS games](https://arxiv.org/abs/2510.18395) is a relevant strategy-game reference: memory should support state-machine decisions, not only dialogue.
- Tianming should implement spatial/resource memory as structured projections:
  - `LocationGraph`: empire -> circuit/province -> prefecture -> county -> pass/city/river/granary/palace.
  - `RouteMemory`: route edges with distance, terrain, risk, supply capacity, blockages, seasonal conditions.
  - `ResourceLedger`: grain, silver, troops, horses, weapons, ships, labor, tax arrears, relief shipments.
  - `FrontlineMemory`: armies, commanders, morale, supply, current orders, last report time, uncertainty.
  - `DisasterMemory`: flood/drought/plague/rebellion location, severity, reported_by, verified_by, valid period.
- Retrieval patterns:
  - `whereIs(entity)`, `whoControls(location)`, `whatChangedAt(location)`, `routeBetween(a,b)`, `resourceFlow(source,sink)`, `whoKnows(locationEvent)`.
- Avoid early heavy multimodal: map screenshots and images can be evidence/authoring aids, but canonical truth should be map/state tables.

### Sweep K - Migration / Rollout / Shadow Mode Engineering
- Tianming v5 should not be a big-bang rewrite. Use expand-contract migration, feature flags, shadow instrumentation, and projection rebuilds.
- [Microsoft Event Sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing) emphasizes event immutability, tolerant deserialization, event versioning, upcasting, projection tests, idempotency tests, and schema evolution tests.
- [Feature-flag database migration patterns](https://www.featureflow.com/blog/feature-flags-database-migrations) and [FeatureFlags database migrations](https://featureflags.io/feature-flags-database-migrations/) recommend expand -> backfill -> dual-write/dual-read shadow -> ramp -> contract.
- [EventSourcingDB event versioning](https://docs.eventsourcingdb.io/best-practices/versioning-events/) recommends explicit new event types/schemas rather than silently mutating old event meaning.
- [Empirical Characterization of Event Sourced Systems](https://arxiv.org/abs/2104.01146) identifies evolution, steep learning curve, projection rebuilding, technology gaps, and data privacy as real industry challenges.
- [MAGE shadow memory](https://arxiv.org/abs/2605.03228), [AgentSight](https://arxiv.org/abs/2508.02736), and [LLM Readiness Harness](https://arxiv.org/abs/2603.27355) are useful analogies for shadow safety memory, observability-first agent monitoring, and CI readiness gates.
- Recommended Tianming rollout:
  - Step 0: observe only. Generate MemoryTrace for current recall/composer without changing prompt.
  - Step 1: envelope adapter. Wrap existing memories, summaries, anchors, and recall hits into MemoryEnvelope view.
  - Step 2: shadow scorer. Run new Retrieval Composer in parallel, compare candidates/injections with old system, do not serve yet.
  - Step 3: backfill sourceRefs/status/visibility for existing memory rows where possible; unknown provenance becomes low-authority.
  - Step 4: introduce goldens in CI, starting with 10 smoke cases.
  - Step 5: guarded rollout behind feature flag per save/test branch.
  - Step 6: projection rebuild/reindex commands for FTS/vector/graph/summaries.
  - Step 7: remove old path only after traces, goldens, and user-visible diagnostics stabilize.
- Required versioning fields: `schemaVersion`, `projectionVersion`, `extractorVersion`, `embeddingModelId`, `promptTemplateVersion`, `rulesetHash`, `contentHash`, `migrationBatchId`.
- Rollback plan: disable new composer flag, keep old memory path, preserve raw event ledger, rebuild projections from last stable schema, and expose trace diff for failed cases.

### Wave 5 Agent 30 - Evidence Ranking / Decision Matrix
- Core conclusion: Tianming should implement a local-first, traceable, replayable, editable, permissioned, temporally valid Memory Operating Layer rather than a larger vector database.
- Evidence ranking:
  - Peer-reviewed evidence default credibility 5: use as architecture foundation. Examples: [Generative Agents](https://research.google/pubs/generative-agents-interactive-simulacra-of-human-behavior/), [MemoryBank AAAI](https://ojs.aaai.org/index.php/AAAI/article/download/29946/31654), [MemoryOS EMNLP](https://aclanthology.org/2025.emnlp-main.1318/), [M2PA ACL](https://aclanthology.org/2025.findings-acl.1191/), [LongMemEval ICLR](https://openreview.net/forum?id=pZiyCaVuti).
  - arXiv/preprint default credibility 3-4: use for problem definitions and emerging modules, not leaderboard numbers. Examples: GroupMemBench, Memory-Driven Role-Playing, Zep, poisoning papers.
  - Product docs default credibility 3: use for UX, context assembly, editable memory, and debugger design. Examples: SillyTavern, AI Dungeon, NovelAI, Letta.
  - Vendor benchmark default credibility 2-3: engineering reference only, not decision proof.
  - Community anecdote default credibility 1-2: pain-point radar only.
- Must decisions:
  - `MemoryEnvelope v5` with sourceRefs, scope, visibility, status, confidence, validFrom/validTo, derivedFrom, deletionState.
  - Append-only event ledger + WorldTruthLedger projection.
  - Authority/stale/delete gate before semantic similarity.
  - MemoryWriteGate with draft/quarantine/schema validation/injection and privacy scans.
  - Retrieval Composer: actor scope -> hard state -> FTS/entity/time -> optional vector -> graph -> budgeted injection.
  - Editable summarization with rollback and evidence refs.
  - MemoryTrace / Observatory with candidates, rejection reasons, injection position, token cost.
  - Tianming goldens and red-team tests for stale, hidden leakage, NPC private memory, faction perspective, deletion residuals, poisoning.
- Should decisions:
  - Faction/NPC/group memory fields: speaker, owner, audience, read/write scope.
  - Temporal knowledge graph / rumor graph after core event and edge rebuildability exists.
  - Procedural memory library as low-authority advice.
- Could decisions:
  - Spatial/resource/map memory after core text/state memory.
  - Emotional salience, decay, reconsolidation for NPC flavor, with "salience != truth".
  - Vendor memory API adapters as replaceable integrations.
  - Self-evolving memory later after goldens stabilize.
- Won't decisions:
  - Pure vector chat dump.
  - Full-history stuffing as product target.
  - LLM directly editing hard state/core rules.
  - Parameter memory/fine-tuning as game-state memory.
  - Cloud/vendor memory as sole truth.
  - "Forget" without cascade deletion.
  - Self-evolution without goldens.
- Minimum implementation set:
  - MemoryEnvelope v5 type and adapter.
  - SQLite/FTS5 authoritative store + JSONL hash-chain event ledger.
  - WorldTruthLedger valid/system time projection.
  - MemoryWriteGate.
  - Retrieval Composer with scope/authority/stale/delete filters before retrieval/injection.
  - MemoryTrace.
  - Minimal Memory Observatory.
  - 20 initial goldens: edict supersession, private leakage, NPC commitment, rumor invalidation, deletion residual, memory poisoning.

### Wave 5 Agent 29 - Implementation Migration / Risk / Rollout
- Core principle: v5 should not replace Tianming's existing memory system at once. Treat the current system as authority and v5 as a sidecar: observe, project, shadow compare, then canary injection.
- Existing Tianming surfaces to preserve: 12 memory tables, `memoryAnchors`, L1/L2/L3, `SC_RECALL`, semantic recall, Ctrl+M panel, save migrations, and Godot diplomacy memory.
- Proposed phases:
  - Phase 0 baseline freeze: lock existing smoke tests and capture current `SC_RECALL`, prompt injection, L2/L3 summaries, token cost, latency.
  - Phase 1 observation: generate `requestId` and MemoryTrace for each AI subcall, recall request, and prompt injection without changing behavior.
  - Phase 2 Envelope facade: project existing 12 tables, `eventHistory`, anchors, chronicle/shiji, foreshadow, semantic hits, NPC/Godot diplomacy memory into MemoryEnvelope; old structures remain truth.
  - Phase 3 shadow composer: run new Retrieval Composer in background and diff candidate/rejection/ranking/budget/visibility decisions against old path.
  - Phase 4 goldens: start with G02/G06/G11/G16/G22/G27/G33/G36/G42/G50.
  - Phase 5 canary: feature flags `traceOnly`, `envelopeOnly`, `composerShadow`, `injectCanary`, `writeQueueDraftOnly`, `storageSidecar`.
  - Phase 6 write governance: AI summaries/commitments/reflections/relationship extraction default to Draft Inbox or Quarantine.
  - Phase 7 storage sidecar: SQLite/IndexedDB/JSONL plus derived FTS/vector/graph indexes.
- Suggested instrumentation points: `SC0 memoryQueries`, `RecallGate`, `SC_RECALL`, `SemanticRecall.search`, `MemTables.buildTablesInjection`, `getMemoryAnchorsForAI`, `_ensureMemoryFreshness`, L2/L3 post-turn jobs, save load migration, prompt composer.
- Trace records should include turn, saveId, subcall, actor scope, query, candidate sources, scores, rejection reasons, actual injected items, token estimate, visibility, authority, status, sourceRefs, feature flags, and latency.
- Shadow constraints:
  - Trace does not enter prompt.
  - Shadow composer does not write GM authority fields.
  - Shadow recompute does not overwrite L2/L3.
  - Semantic miss does not block old flow.
  - Logs have capacity limits and export switch.
- Backfill authority order: current engine state and 12 tables > `evtLog/eventHistory` > shiji/chronicle > anchors/L1/L2/L3 > semantic index. Vectors and graph indexes are always rebuildable.
- Backfill plan: dry-run first; count sources, missing fields, reconstructability, and conflicts; generate sidecar projection with stable id `hash(runId + sourceType + sourceId + turn + contentHash)`.
- Old saves should not be forced through migration. Load creates compatible projection; save may write `memory_schema_version`, `projection_version`, `index_version`, `embedding_model_id`.
- Reindex runs in background by save/turn/source chunks, dedupes by `text_hash + model_id`, can resume on failure, uses separate namespaces for old/new indexes.
- Recomputed summaries are draft only. L2/L3 summaries keep sourceRefs, source hash, model, and generated time; source changes mark stale rather than overwriting.
- Major risks and mitigations:
  - Behavior drift -> shadow diff + forbidden checks.
  - Hidden leakage -> visibility/audience/accessPolicy before similarity.
  - Old fact revival -> stale/superseded/deleted_tombstone cannot be current facts.
  - AI write pollution -> AI extracted/reflection default draft and cannot overwrite engine_state/player_pin/locked rows.
  - Dual-write split -> old system remains authority during migration.
  - Stale indexes -> source hash and index version; full rebuild possible.
  - Performance -> trace/shadow sampling, limits, pruning.
  - Save compatibility -> additive fields and tolerant readers.
- Rollback:
  - Kill switch disables v5 injection, write, and shadow composer; old `SC_RECALL`, tables, anchors, and L1/L2/L3 remain.
  - Layer rollback: stop trace, delete sidecar projection, stop shadow, restore old prompt injection, ignore draft queue, clear new indexes.
  - v5 artifacts are versioned/namespaced and discardable.
- Acceptance gate: no real prompt injection until golden baseline, trace diff, old-save load test, and hidden-info leakage tests pass.

### Wave 5 Agent 25 - Local Storage / Index Implementation
- Core conclusion: Tianming v5 should use SQLite as authoritative local state store, JSONL hash-chain as event ledger, FTS5 as full-text index, SQLite JSON/generated columns as hot-field indexes, SQLite edge tables as lightweight graph, and vector indexes as rebuildable projections. Do not bind Phase A to Qdrant/Chroma/Kuzu.
- Selection matrix:
  - SQLite core + WAL: Phase A default for local authoritative state; single-file transactions and backup maturity; manage single-writer/WAL checkpoint.
  - SQLite FTS5: Phase A default for keyword/BM25; supports trigram; Chinese tokenizer strategy required; external-content tables can drift.
  - SQLite JSON + generated columns: Phase A default for flexible metadata and indexed hot fields; STORED columns complicate migration.
  - SQLite vec / Vec1: experimental Phase A/B option, replaceable index only.
  - LanceDB: Phase B preferred vector sidecar if local vectors grow; manage separate files, compaction, backup.
  - Qdrant local: Phase C for larger vector collections; service/Docker and local auth/config complexity.
  - Chroma: prototype only, not core.
  - DuckDB: analytics/audit/export mirror, not frequent OLTP writer.
  - IndexedDB: renderer/browser cache, not authority.
  - JSONL hash chain: Phase A default append-only event ledger; use canonical JSON; deletion conflicts handled by minimal payload/encryption/redaction event.
  - SQLite RTree: time/space bbox queries when needed.
  - SQLite edge table / recursive CTE: Phase A/B lightweight graph.
  - Kuzu: not recommended for core because the agent found the GitHub project archived notice.
- Minimum schema concepts:
  - `memory_item(id, kind, scope, body, meta, importance, confidence, created_at, updated_at, deleted_at, source_event_id, generated project/thread/entity columns)`.
  - `memory_chunk(memory_id, ordinal, text, token_count, content_hash)`.
  - `chunk_fts` contentless FTS5 table with trigram tokenizer.
  - `embedding(chunk_id, model_id, dim, vector, vector_hash)`.
  - `event_ledger(seq, event_id, ts, actor, event_type, target_id, payload, prev_hash, payload_hash, hash)`.
  - `entity(id, type, key, label, meta)`.
  - `relation(id, src_id, dst_id, type, weight, source_memory_id, created_at, deleted_at, meta)`.
- Performance notes:
  - Use a single writer queue for SQLite WAL.
  - FTS5 trigram covers Chinese substring but increases index size.
  - 1536-d float32 vector is about 6KB per chunk; 100k chunks means about 600MB raw vectors before indexes.
  - Benchmark ANN sidecar once collections pass roughly 50k-100k chunks or latency budget is stressed.
- Migration/backup/deletion:
  - Maintain `schema_migrations`.
  - Keep FTS/RTree/vector as derived and rebuildable.
  - Do not overwrite old embeddings when model changes; use `(chunk_id, model_id)`.
  - Backup SQLite via Backup API or `VACUUM INTO`; WAL mode needs checkpoint or `-wal/-shm` handling.
  - Use manifest tying JSONL head hash, SQLite `user_version`, embedding model, and sidecar version.
  - Hard delete must remove base rows, FTS rows, vector sidecar, caches; secure delete/VACUUM or db rewrite may be required.
  - Ledger payload should be minimal; sensitive payload should be encrypted and crypto-shredded, then redacted by event.
- Phase recommendations:
  - Phase A: SQLite + JSONL + FTS5 + generated columns + edge table; vector optional BLOB only; focus crash recovery, ledger replay, FTS rebuild, backup/restore.
  - Phase B: embedding worker and hybrid retrieval; evaluate LanceDB or SQLite Vec1/sqlite-vec; add DuckDB analytics mirror.
  - Phase C: Qdrant/LanceDB sharding if large collections require; keep graph in SQLite unless complex graph algorithms become necessary.
- Key references: [SQLite FTS5](https://www.sqlite.org/fts5.html), [SQLite JSON](https://www.sqlite.org/json1.html), [SQLite generated columns](https://www.sqlite.org/gencol.html), [SQLite WAL](https://www.sqlite.org/wal.html), [SQLite Backup API](https://www.sqlite.org/backup.html), [SQLite RTree](https://www.sqlite.org/rtree.html), [SQLite recursive CTE](https://www.sqlite.org/lang_with.html), [sqlite-vec](https://alexgarcia.xyz/sqlite-vec/), [SQLite Vec1](https://sqlite.org/vec1/doc/trunk/doc/vec1.md), [LanceDB](https://docs.lancedb.com/quickstart), [Qdrant](https://qdrant.tech/documentation/quickstart/), [DuckDB FTS](https://duckdb.org/docs/stable/core_extensions/full_text_search.html), [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), [JSON Lines](https://jsonlines.org/), and [RFC 8785 JCS](https://www.rfc-editor.org/rfc/rfc8785).

### Wave 5 Agent 26 - Chinese Historical Roleplay / Entity Alias / Register
- Core conclusion: Tianming requires China-specific historical memory schema and goldens. Generic roleplay or English long-memory benchmarks do not cover courtesy names, posthumous names, temple names, reign eras, official titles, administrative geography, classical register, or viewpoint secrecy.
- Key references:
  - Chinese/bilingual roleplay evaluation: [CharacterEval](https://aclanthology.org/2024.acl-long.638/), [RoleEval](https://arxiv.org/abs/2312.16132), [RoleLLM/RoleBench](https://arxiv.org/abs/2310.00746), [ChatHaruhi](https://arxiv.org/abs/2308.09597), [CharacterBench](https://arxiv.org/abs/2412.11912), [DMT-RoleBench](https://ojs.aaai.org/index.php/AAAI/article/view/34768).
  - Long Chinese context/narrative: [LongBench](https://aclanthology.org/2024.acl-long.172/), [CLongEval](https://aclanthology.org/2024.findings-emnlp.230/), [BAMBOO](https://arxiv.org/abs/2309.13345), [LooGLE](https://bigai-nlco.github.io/LooGLE/), [NovelQA](https://novelqa.github.io/), [NovelHopQA](https://openreview.net/forum?id=8P14NUp4IZ), [ConStory-Bench](https://picrew.github.io/constory-bench.github.io/), [CTM Chinese dynasty temporal reasoning](https://huggingface.co/papers/2502.16922).
  - Ancient Chinese/historical entity resources: [CHisIEC](https://arxiv.org/abs/2403.15088), [GuNER2023](https://www.ai.pku.edu.cn/info/1086/2613.htm), [Zizhi Tongjian ancient NER](https://aclanthology.org/2023.ccl-1.21/), [Buddhist temple gazetteer NER](https://linguasinica.springeropen.com/articles/10.1186/s40655-015-0007-3), [CBDB](https://cbdb.hsites.harvard.edu/home), [CBDB API](https://input.cbdb.fas.harvard.edu/cbdbapi/index.html), [CHGIS](https://chgis.fas.harvard.edu/).
- Chinese/historical failure modes:
  - Name/title mismatch: name, courtesy name, art name, posthumous name, temple name, reign name, noble title, office title; using posthumous/temple names before death is anachronistic.
  - Same-title conflicts: multiple Wu Di/Gaozong/Taizu across dynasties; same name across eras.
  - Office drift: same title has different functions across dynasties; acting office, honorary rank, concurrent office, eunuch inner-court role, and noble title get flattened.
  - Place-time mismatch: Yingtian/Nanjing/Jiangning, province/prefecture/county changes, seat vs jurisdiction, ancient/modern same names.
  - Calendar normalization: reign year, sexagenary cycle, lunar month/day, season, "former emperor/current emperor" relative time must map to turn and valid interval.
  - Chinese retrieval misfire: no spaces, one-character names, simplified/traditional/variant/taboo characters, OCR and punctuation differences.
  - Viewpoint leakage: emperor, cabinet, frontier general, eunuch, scholar, local official have different intelligence access.
  - Narrative drift: loyalty, teacher lineage, marriage alliance, grudge, injury, military order, fiscal promise get smoothed away.
  - Register mismatch: edict, memorial, private talk, market rumor, frontier report should have different voice and self-reference.
  - Version conflict: disproved rumor, transferred official, fallen city revived by high semantic similarity.
- Suggested Tianming memory layers: `core_persona`, `current_state`, `episodic_event`, `relationship_edge`, `faction_intel`, `world_lore`, `rumor_claim`, `summary_by_arc/season/year`.
- Required fields:
  - `memory_id`, `save_id`, `scene_id`, `turn_id`, `source_span`, `provenance`.
  - `type`: event, dialogue, relationship, appointment, geography, rumor, rule, goal, commitment, illness/injury.
  - `subject_entity_ids`, `object_entity_ids`, `aliases`, `mention_texts`.
  - `speaker_id`, `audience_ids`, `observers`, `knowledge_scope`: public/court/faction/private/secret.
  - `valid_from`, `valid_to`, `asserted_at`, `game_calendar`: dynasty/reign/year/sexagenary/lunar/season/turn.
  - `place_id`, `historical_place_id`, `admin_level`, `parent_place_ids`.
  - `office_id`, `title_text`, `rank`, `institution`, `jurisdiction`, `appointment_type`.
  - `stance`, `confidence`, `source_reliability`, `status`: confirmed/rumor/refuted/obsolete.
  - `salience`: plot criticality, emotional weight, recency, retrieval count, pin/core flag.
  - `supersedes`, `superseded_by`, `contradiction_group`.
  - `style_tags`: edict/memorial/private/frontier-report/classicality/address rules.
- Retrieval pipeline: entity linking and alias expansion -> hard filters by entity/time/knowledge_scope/current speaker -> BM25 char/word + dense hybrid -> rerank by temporal validity, office/place hierarchy, relation graph neighbors, importance, version status.
- Pre-generation fixed injections: current self state, relationship to interlocutor, location/time, non-leakage list, refuted facts.
- Chinese/history goldens:
  - Alias: Wang Shouren/Yangming/Wang Wencheng/Wang Duyushi with correct alive/dead naming.
  - Same-title conflict: identify the correct Gaozong/Wudi by dynasty/year/location.
  - Office: old governor experience is remembered, current viceroy authority controls action.
  - Place: Yingtian/Nanjing/Jiangning by period/admin level.
  - Time: "Wanli 20, renchen, autumn eighth month" maps to turn and order.
  - Knowledge boundary: eunuch knows secret memorial, local official hears rumor, scholar knows nothing.
  - Rumor update: frontier-general-treason rumor later disproved; different NPCs answer by last known information.
  - 100-turn continuity: marriage alliance, teacher lineage, grudge, injury, grain shortage.
  - Causality: impeaching a faction mentor affects later recommendation.
  - Register: same fact as edict/memorial/frontier report/private whisper.
  - Negative recall: "Taizu old system" must use current dynasty, not another dynasty's Taizu.
- Metrics: entity-link accuracy, time-normalization accuracy, Recall@K, leakage rate, stale fact usage, posthumous/temple-name anachronism rate, narrative contradiction rate, style consistency, evidence citation coverage.

### Wave 5 Agent 28 - Memory Observatory UI / UX Prototype
- Core conclusion: Memory Observatory should be three-layered:
  - Player layer: "what does the AI remember now, and why did it say that?"
  - Designer layer: "which memories should be written, corrected, merged, hidden, or frozen?"
  - Developer layer: "where did retrieval, injection, budget, trace, or safety fail?"
- Role model:
  - Player: enters via Ctrl+M or "AI basis this turn"; sees only current-character-known/public/player-known content; can understand, correct, mark important, request hide.
  - Designer: enters via Memory Workshop / Observatory Designer Mode; sees plot assets, drafts, configurable rules, spoiler-safe by default; adjusts categories, budgets, triggers, graph relations, draft review.
  - Developer: enters via Trace Workbench; sees full trace/raw prompt/JSON/spans/risk tags; debugs retrieval failures, budget eviction, wrong injection, privacy overreach, polluted writes.
- Panels:
  - Observatory Home: turn, subcall, actor/faction, memory health score, injected count, drafts, alerts, token overview; role switch, turn picker, entity search, recent trace.
  - Injection Viewer: memoryId, title, kind, authority, visibility, status, source, evidence, subcall, prompt section, tokens, why; group by subcall/actor/lane; expand evidence; correct/pin/demote/hide.
  - Prompt Itemization: lanes such as Hard State, Commitment, Canon, Event, Belief, Reflection, Foreshadow; budget, actual tokens, crop reason, insertion order; stacked token bar and lane budget edits.
  - Retrieval Trace: query, cue, candidates, vector/keyword/graph/recency/authority score, visibility filters, rejection reason, final rank; expand scores, compare previous turn, sandbox rerun.
  - Memory Inspector: MemoryEnvelope table with id/kind/body/safeBody/entities/source/confidence/salience/validFrom/To/recordedAt/owner/audience/supersedes/version; filter, timeline, diff edit, merge/split, bulk demote/quarantine.
  - Draft Inbox: suggested memory, source snippet, creator, duplicate candidates, risk, inferred visibility, hard-state conflict; accept/edit/merge/player-visible/private/quarantine/delete/batch review.
  - Graph Visualizer: person/faction/event/commitment nodes, edge type, confidence, effective period, source count, perspective; timeline slider, player/NPC/system view, path explanation, hidden future nodes.
  - Audit Log: eventId, turn, operation, actor/process, memoryId, before/after hash, reason, affected embedding/summary/edge/cache; filter/diff/export/rollback draft.
  - Security Panel: low-trust spread, privacy overreach, sleeper trigger, abnormal tool choice, cross-namespace injection, deletion residual; isolate, scan namespace, recompute derived data, red-team replay.
  - Memory Sandbox: actor, input cue, budget, candidate pool, policy, expected/actual injection; dry-run retrieval/injection, A/B budget and prompt, no save writes.
- MVP sequence:
  - MemoryTrace JSON.
  - Player-safe Injection Viewer + Prompt Itemization.
  - Retrieval Trace for designer/developer.
  - Memory Inspector + Draft Inbox.
  - Audit Log + Security Panel.
  - Graph Visualizer + Sandbox as advanced tools.
- Spoiler protection:
  - Default is perspective evidence panel, not omniscient memory database.
  - Every memory has `visibility`, `owner/audience`, `validFrom/validTo`, `source`, and `spoilerLevel`.
  - Player sees safe summary only. Private/future/unobserved content can show as "3 hidden records affected this NPC" without raw text.
  - Developer raw prompt requires explicit switch and warning.
  - Designer mode defaults to plot-safe summary; reveal requires click.
  - Graph has `player-known`, `NPC-known`, and `system omniscient` perspectives.
- References: [AI Dungeon Memory System](https://help.aidungeon.com/faq/the-memory-system), [NovelAI Story Settings](https://docs.novelai.net/en/text/editor/storysettings/), [NovelAI Lorebook](https://docs.novelai.net/en/text/lorebook/), [CharMemory](https://github.com/bal-spec/sillytavern-character-memory), [SillyTavern Prompt Inspector](https://github.com/SillyTavern/Extension-PromptInspector), [Luker Memory Graph](https://luker.cups.moe/features/memory-graph), [LangSmith Retriever Trace](https://docs.langchain.com/langsmith/log-retriever-trace), [Langfuse Observability](https://langfuse.com/docs/observability/overview), [Arize Phoenix Tracing](https://arize.com/docs/phoenix/tracing/llm-traces), [OpenTelemetry GenAI Spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/), [Letta Memory Blocks](https://docs.letta.com/guides/core-concepts/memory/memory-blocks), [OpenMemory](https://mem0.ai/openmemory), [Zep Graphiti](https://www.getzep.com/platform/graphiti/).

### Wave 5 Agent 27 - Map / Resource / Spatial / Economy Memory
- Core conclusion: Tianming should borrow explicit spatial graph, resource ledger, route/frontline projections, and auditable retrieval. LLMs should explain, plan queries, and write memorial/frontier-report prose, but not be the truth source for maps or ledgers.
- Key references:
  - Spatial/semantic maps/scene graphs: [3D Dynamic Scene Graphs](https://arxiv.org/abs/2002.06289), [Hydra](https://arxiv.org/abs/2201.13360), [ConceptGraphs](https://concept-graphs.github.io/), [SayPlan](https://sayplan.github.io/), [VLMaps](https://vlmaps.github.io/), [CLIP-Fields](https://clip-fields.github.io/), [Tag Map](https://tag-mapping.github.io/), [OpenEQA](https://open-eqa.github.io/), [OpenEQA blog](https://ai.meta.com/blog/openeqa-embodied-question-answering-robotics-ar-glasses/), [ARTEM](https://ojs.aaai.org/index.php/AAAI/article/view/39773), [VideoMindPalace](https://openaccess.thecvf.com/content/CVPR2025/html/Huang_Building_a_Mind_Palace_Structuring_Environment-Grounded_Semantic_Graphs_for_Effective_CVPR_2025_paper.html).
  - Strategy/game AI: [RTS StarCraft survey](https://dblp.org/rec/journals/tciaig/OntanonSURCP13), [AlphaStar](https://www.nature.com/articles/s41586-019-1724-z), [OpenAI Five](https://openai.com/research/openai-five), [Influence Maps for RTS](https://www.sharcnet.ca/my/publications/show/2188), [Game AI Pro 2 Spatial Reasoning](https://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter31_Spatial_Reasoning_for_Strategic_Decision_Making.pdf), [Memory-Augmented State Machine Prompting for RTS](https://arxiv.org/abs/2510.18395), [HIMA RTS framework](https://arxiv.org/abs/2508.06042), [OpenRA-RL](https://huggingface.co/blog/jadetan/openra-rl).
  - Engineering: [H3](https://h3geo.org/docs/), [PostGIS Topology](https://postgis.net/docs/manual-dev/Topology.html), [pgRouting Dijkstra](https://docs.pgrouting.org/2.1/en/src/dijkstra/doc/dijkstra_v3.html), [Azure Event Sourcing](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing), [Martin Fowler Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html), [TigerBeetle Transfer](https://docs.tigerbeetle.com/reference/transfer).
- Suggested schemas:
  - `LocationGraph`: LocationNode with aliases, type, parent, admin rank, period, geometry, terrain, climate, population estimate, tax base, granary capacity, de_jure_owner, de_facto_controller, visibility, valid interval, source events; LocationEdge with relation, distance, terrain cost, capacity, seasonal rules, risk, controller, valid interval.
  - `ResourceLedger`: ResourceAccount by owner/location/resource/unit; ResourceTx with turn/time/type/quantity/debit/credit/reason/actor/edict/route/source/status/confidence/visibility. Silver, grain, troops, horses, ships, weapons, labor, arrears, relief all use the same accounting model; loss/corruption/disaster/consumption use virtual accounts.
  - `RouteMemory`: route id, endpoints, segments, mode, distance, days, supply capacity, transport cost, terrain tags, choke points, seasonal modifiers, blockers, hazard, controller mix, last scouted, confidence, last used, outcome stats.
  - `FrontlineMemory`: theater, anchors, line geometry, factions, armies, commanders, posture, objective, strength estimate, morale, supply days, threat score, contested locations, route dependencies, last report, source reports, fog state, confidence, expected next moves, valid interval.
- Retrieval flow:
  - Classify query: location, control, route, resource flow, frontline, disaster, visibility.
  - Exact ID/alias resolution first; then graph traversal, time filter, spatial index, ledger aggregation.
  - BM25/vector only fuzzy candidate helpers and cannot override structured facts.
  - Output MemoryEnvelope with facts, source events, visibility, confidence, stale/conflict status.
  - Actor filtering separates GM truth, player-known, NPC-known, faction rumor.
- Goldens:
  - City rename/alias resolution.
  - De jure vs de facto control.
  - Enemy cuts supply route -> frontline supply_days drops.
  - Flood/snow season invalidates old route.
  - Relief silver/grain ledger conservation from ministry to prefecture/county.
  - Conflicting frontline reports produce uncertainty.
  - Local official cannot know secret edict/GM hidden state.
  - Multi-hop "why is this army short of grain?" links route, ledger, frontline, disaster.
- Metrics: current-state accuracy, stale rejection, ledger conservation, route reachability accuracy, spatial relation accuracy, hidden leakage, source traceability, latency/token cost.
- Do not do early: full 3D SLAM, NeRF, point-cloud scene graph, long-video memory, map screenshot auto-updates ledger, VLM city-control judgment, AlphaStar/OpenAI Five style end-to-end training, realtime tactical micro simulation, global real GIS. Use maps/images as authoring aids and evidence attachments; authority remains in `LocationGraph + ResourceLedger + RouteMemory + FrontlineMemory + EventLog`.

## Sixth-Round Local Live Sweep - 2026-05-31

### Foundation Gap: Write Path Must Become Schema-Grounded
- [From Unstructured Recall to Schema-Grounded Memory](https://arxiv.org/abs/2604.27906) argues that persistent AI memory is often misframed as text retrieval. The important shift is to treat memory as a system of record for exact facts, current state, updates/deletions, aggregation, relations, negative queries, and explicit unknowns.
- The paper's proposed ingestion path is object detection -> field detection -> field-value extraction -> validation gates -> local retries -> stateful prompt control. For Tianming, this maps directly to a `MemoryWriteGate` that refuses vague prose summaries for offices, titles, locations, faction allegiance, edicts, resource balances, and relationship commitments.
- v6 implication: MemoryEnvelope must distinguish `rawObservation`, `claim`, `validatedFact`, `currentStateProjection`, `summary`, and `inference`; otherwise retrieval will repeatedly re-interpret old prose and recreate drift.

### Foundation Gap: Retrieval Needs Reasoning-Aware Reranking, Not Top-K Vectors
- [MemReranker](https://arxiv.org/abs/2605.06132) targets memory retrieval failures where generic rerankers miscalibrate thresholds and degrade on temporal constraints, causal reasoning, and coreference. It trains on memory-specific multi-turn dialogue data.
- Tianming should keep the earlier hybrid pipeline, but v6 should name it as a minimum: hard filters by actor/time/visibility/status -> BM25/dense/graph/recency candidate generation -> memory-specific rerank -> prompt packing by authority lane.
- Key risk: a high semantic score for "same person/office/faction" is dangerous when the old fact is stale, private, refuted, or from a different dynasty/title namespace.

### Foundation Gap: Multi-Party Memory Is Structurally Hard
- [GroupMemBench](https://arxiv.org/abs/2605.14498) finds that current memory systems degrade sharply in multi-party conversation; the strongest measured system only reaches 46.0% average accuracy, with particularly weak knowledge update and term ambiguity results. The paper emphasizes speaker-grounded belief tracking and audience-adapted language.
- Tianming is not a dyadic chatbot. Every memory needs `speaker`, `observer`, `audience`, `owner`, `factionScope`, `knownBy`, `withheldFrom`, and `perspective` fields. Group court scenes, faction councils, secret memorials, and rumor propagation should be benchmarked separately.

### Foundation Gap: Validity / Staleness Is a First-Class Mechanism
- [STALE](https://arxiv.org/abs/2605.06527) stresses implicit conflicts: later observations can invalidate earlier memories without explicit negation. It tests state resolution, premise resistance, and policy adaptation, and reports that even the best evaluated model reaches only 55.2% overall accuracy.
- Tianming should require `validFrom`, `validTo`, `assertedAt`, `supersedes`, `supersededBy`, `contradictionGroup`, `status`, `confidence`, and `sourceReliability`. Retrieval must include a stale-rejection step and inject refuted facts only as "do not believe/use" guardrails when needed.

### Foundation Gap: Temporal Graph Memory Has Product and Paper Support
- [Zep / Graphiti](https://arxiv.org/abs/2501.13956) frames agent memory as a temporal knowledge graph that synthesizes unstructured conversation and structured data while preserving historical relationships. The paper reports stronger LongMemEval-style temporal reasoning and lower latency than baseline retrieval implementations.
- [Luker Memory Graph](https://luker.cups.moe/features/memory-graph.html) shows the same idea in a roleplay product: automatic extraction after replies, customizable schemas, semantic nodes, event-tier details, hybrid recall, graph diffusion, reranking, and optional curator-agent verification before writing.
- v6 implication: Tianming's memory graph should not replace the event ledger. The graph is a projection built from ledgered observations; it can be rebuilt, audited, and corrected.

### Roleplay Product Pattern: Context Placement Is Part of Memory Semantics
- [NovelAI Lorebook](https://docs.novelai.net/en/text/lorebook/) exposes advanced controls such as activation keys, always-on entries, hidden entries, placement, insertion order, token budget, reserved tokens, trim direction, categories, subcontext, phrase bias, and advanced conditions.
- [SillyTavern World Info](https://docs.sillytavern.app/usage/core-concepts/worldinfo/) and [Agnai memory docs](https://agnai.chat/guides/memory) similarly frame memory as dynamic context construction rather than a magical persistent mind.
- v6 implication: Tianming must model prompt lanes explicitly. "Memory" is not one bucket; canonical rules, current state, NPC private beliefs, relationship arcs, rumors, quest commitments, and style/register hints require different insertion authority and budgets.

### Security Gap: Persistent Memory Is a Trust Boundary
- [Poison Once, Exploit Forever](https://arxiv.org/abs/2604.02623) shows environment-injected memory poisoning where a contaminated observation can compromise future tasks without direct access to memory storage.
- [Memory Poisoning Attack and Defense on Memory Based LLM-Agents](https://arxiv.org/abs/2601.05504), [MemMorph](https://arxiv.org/abs/2605.26154), and [Hidden in Memory](https://arxiv.org/abs/2605.15338) further point to memory as a persistent attack surface.
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/) lists prompt injection and poisoning-style risks as core LLM application security concerns. For Tianming, this means all AI-written memories need provenance, trust tier, write gate, quarantine, audit log, derived-data deletion, and replayable red-team tests.

### Evaluation Gap: Memory Must Be Tested as Structure, Not Recall Alone
- [Evaluating Memory Structure in LLM Agents / StructMemEval](https://arxiv.org/abs/2602.11243) argues that many long-term memory benchmarks focus on fact retention, multi-hop recall, and time changes, while missing whether an agent can organize memory into ledgers, trees, to-do lists, and other structures. This is directly relevant to Tianming's taxes, grain, troop, edict, office, and relationship ledgers.
- [MemoryAgentBench](https://github.com/HUST-AI-HYZ/MemoryAgentBench) names four competencies: Accurate Retrieval, Test-Time Learning, Long-Range Understanding, and Conflict Resolution. Its incremental multi-turn framing is closer to a running game than one-shot RAG.
- [MemGym](https://arxiv.org/abs/2605.20833) further broadens evaluation beyond personalized chat into tool-use dialogue, deep-research, coding, and computer-use regimes, and reports memory-isolated scores to decouple memory performance from general reasoning/tool competence.
- v6 implication: Tianming should keep external benchmark awareness, but its real acceptance suite must be domain-specific: resource ledger conservation, faction-scoped rumor propagation, office/title supersession, spatial route validity, hidden-state non-leakage, and narrative promise fulfillment.

### Cognitive Architecture Gap: Do Not Confuse Knowledge, Memory, Wisdom, and Inference
- [CoALA](https://arxiv.org/abs/2309.02427) frames language agents as LLMs embedded in a cognitive architecture with modular memory, structured action spaces, and explicit decision loops.
- [Soar episodic memory docs](https://soar.eecs.umich.edu/soar_manual/07_EpisodicMemory/) describe episodic memory as an agent's stream of experience, automatically recorded and later deliberately retrieved; this maps well to Tianming's event ledger as the non-negotiable evidence layer.
- ACT-R summaries emphasize declarative, procedural, and working memory. The useful translation is not to copy ACT-R, but to separate "facts about the world", "rules/skills for acting", and "currently activated context".
- [The Missing Knowledge Layer in Cognitive Architectures for AI Agents](https://arxiv.org/abs/2604.11364) warns against applying the same persistence semantics to facts, experiences, wisdom/lessons, and ephemeral inference. v6 should treat this as a core architectural rule.

### Consolidation Gap: Raw Episodes Must Survive Summaries
- [Useful Memories Become Faulty When Continuously Updated by LLMs](https://arxiv.org/abs/2605.12978) reports that LLM-generated consolidated memories can become faulty under continuous updating and can degrade below no-memory baselines; episodic-only retention remains competitive in their control setting.
- This supports the earlier Tianming decision: never let summaries be the source of truth. Summaries, reflections, persona impressions, and strategy lessons are derived projections; raw ledgered observations and deterministic game-state tables remain authoritative.
- v6 implication: consolidation should be scheduled and gated: write raw event first, extract typed claims, validate against deterministic state, produce summary only as a derivative, and keep backpointers so any summary can be rebuilt or deleted.

### Persona Continuity Gap: Governance Beats Black-Box Consistency
- [A Heterogeneous Temporal Memory Governance Framework for Long-Term LLM Persona Consistency](https://arxiv.org/abs/2605.14802) separates static knowledge memory from dynamic dialogue experience memory, uses vector retrieval + BM25 + RRF + dual-temporal reranking, and treats persona continuity as traceable governance rather than a model-weight property.
- It also reports that pure semantic retrieval is insufficient for correction/tracing, reinforcing Tianming's need for lexical Chinese alias search, temporal filters, and explicit evidence reading.
- v6 implication: NPC consistency is not just "remember facts"; it is a governed loop: stable persona -> current role/office -> recent scene state -> relationship/belief state -> evidence-bound response.

### Roleplay Gap: Memory-Driven Acting Requires Anchoring, Recalling, Bounding, and Enacting
- [Memory-Driven Role-Playing](https://arxiv.org/abs/2603.19313) proposes MREval with four staged abilities: Anchoring, Recalling, Bounding, and Enacting. It is bilingual Chinese/English and directly relevant to Tianming's character-role memory.
- Translation for Tianming:
  - Anchoring: identify the relevant persona/world/state memories for the current scene.
  - Recalling: retrieve the correct evidence with aliases, titles, time, and perspective.
  - Bounding: avoid using memories the NPC should not know, or facts outside era/role constraints.
  - Enacting: turn remembered material into action and dialogue in the correct register.
- v6 implication: roleplay memory evaluation must score both factual recall and whether the fact is used in-character, within knowledge boundaries, and in the right court/frontier/private speech style.

### Narrative Gap: Story Consistency Errors Are Classifiable
- [ConStory-Bench](https://picrew.github.io/constory-bench.github.io/) targets long-form narrative consistency with five error categories and 19 subtypes, including timeline/plot logic, characterization memory, world-building/setting, factual/detail consistency, and nomenclature confusions.
- Tianming should borrow this taxonomy for game goldens: absolute time contradiction, causeless effects, abandoned plot elements, character knowledge contradiction, forgotten ability/office power, social norm violation, geographical contradiction, and name/title confusion.
- v6 implication: the Memory Observatory should include a "consistency incident" category, not just retrieval traces.

### Game AI Precedent: NPC Belief Strength, Contradiction, Misremembering, and Knowledge Implantation
- [Simulating Character Knowledge Phenomena in Talk of the Town](https://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter37_Simulating_Character_Knowledge_Phenomena_in_Talk_of_the_Town.pdf) models NPC belief strength, evidence strength, source affinity, contradictory candidate beliefs, belief adoption, and even controlled misremembering.
- This is a strong non-LLM precedent for Tianming: an NPC may hold a false or biased belief, but the system should track evidence and source. Contradictions should not overwrite immediately; candidate belief strength can accumulate until it supersedes the current belief.
- "Knowledge implantation" during world generation maps to Tianming save/load and scenario start: NPCs should be initialized with plausible knowledge based on kinship, office, faction, geography, salience, public notoriety, and temporal proximity, not omniscient full history.

### Chinese Historical Memory Needs Historical Reference Infrastructure
- [CHGIS](https://chgis.fas.harvard.edu/) provides historical placenames and administrative units across Chinese dynasties. It is a reminder that place memory in Tianming should use period-valid IDs, aliases, hierarchy, and validity intervals.
- The China Biographical Database (CBDB), previously noted in wave 5, is similarly important for person/office/network modeling. Tianming does not need to import these wholesale, but should imitate their entity separation discipline: person, name form, office, place, kinship, association, and source occurrence should not collapse into one string.
- v6 implication: Chinese alias/title/place retrieval must include exact/lexical matching and period filters before dense semantic search.

### AI RPG Product Pattern: LLM Should Generate Surface Text, Not Own State
- Recent AI game/RPG discussions and product pages converge on one practical idea: persistent vector memory alone is not enough for long campaigns; the stronger pattern is structured world state plus small injected context.
- Search hits included [Parallels](https://parallelsgame.com/), [Chronostates](https://www.chronostates.io/), [Wanderfolk](https://wanderfolk.ai/ai-npc-games/), and community AI game-dev discussions where builders emphasize relationship/resource/public-knowledge/faction-state tracking and limited per-interaction context injection.
- v6 implication: Tianming's deterministic simulation tables and event ledger should own world truth; the LLM should narrate, interpret, negotiate, and propose actions inside those constraints.

### Wave 6 Agent 31 - Cognitive Architectures and Human Memory Theory
- Core conclusion: cognitive architecture should be used as engineering inspiration, not brain cosplay. Tianming should separate working memory, episodic memory, semantic memory, procedural memory, and prospective memory.
- Key references: [ACT-R official site](https://act-r.psy.cmu.edu/), [Anderson et al. 2004](https://pubmed.ncbi.nlm.nih.gov/15482072/), [Soar manual](https://soar.eecs.umich.edu/soar_manual/), [Laird 2022 Soar](https://arxiv.org/abs/2205.03854), [Common Model of Cognition](https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/2744/0), [CoALA](https://arxiv.org/abs/2309.02427), [Complementary Learning Systems](https://web.stanford.edu/~jlmcc/papers/McCMcNaughtonOReilly95.pdf), [Baddeley episodic buffer](https://pubmed.ncbi.nlm.nih.gov/11058819/), [source monitoring](https://memlab.yale.edu/sites/default/files/files/1993_Johnson_Hashtroudi_Lindsay_PsychBull.pdf), [Diekelmann and Born consolidation](https://www.nature.com/articles/nrn2762), [Generative Agents](https://arxiv.org/abs/2304.03442), and [LLM agent memory survey](https://arxiv.org/abs/2404.13501).
- Mechanism mapping:
  - Working memory: current turn focus, threats, goals, interlocutors, location.
  - Episodic memory: timestamped events with actors, place, evidence, source.
  - Semantic memory: generalized beliefs, world facts, character profiles.
  - Procedural memory: reusable action scripts, tactics, diplomatic habits.
  - Prospective memory: future intentions and triggers such as edicts, revenge promises, deadlines, seasonal taxes, military orders.
- Practical principles:
  - Use activation-like scoring: semantic similarity + recency + frequency + importance + affect + goal relevance + relationship relevance + source reliability.
  - New events must first enter episodic storage; only later consolidation may produce semantic beliefs or procedural lessons.
  - Source monitoring is foundational: distinguish eyewitness, scout report, enemy rumor, player claim, system fact, and LLM inference.
  - Character bias can be narrative gold, but biased recollection must not overwrite factual episodes.
  - Forgetting should usually be decay, cold storage, compression, or lowered salience, not destructive deletion.
- Anti-patterns:
  - Treating chat logs as memory.
  - Treating top-k embeddings as human-like recall.
  - Letting LLM reflection replace evidence.
  - Giving all NPCs shared omniscient memory.

### Wave 6 Agent 32 - Schema-Grounded Write Path and Belief Modeling
- Core conclusion: Tianming should build schema-grounded + temporal graph + evidence envelope memory. Events keep full traces, facts become structured projections, beliefs carry uncertainty, and rumors never overwrite truth.
- Key references: [LoCoMo](https://arxiv.org/abs/2402.17753), [LLM agent memory survey](https://arxiv.org/abs/2404.13501), [LLM game agents survey](https://arxiv.org/abs/2404.02039), [AriGraph](https://arxiv.org/abs/2407.04363), [Zep](https://arxiv.org/abs/2501.13956), [Graphiti](https://www.getzep.com/platform/graphiti/), [A-MEM](https://arxiv.org/abs/2502.12110), [Mem0](https://arxiv.org/abs/2504.19413), [LangMem guide](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/), [Memory for Autonomous LLM Agents](https://arxiv.org/abs/2603.07670), [Schema-Grounded Memory](https://arxiv.org/abs/2604.27906), [Belief Memory](https://arxiv.org/abs/2605.05583), [Memp](https://arxiv.org/abs/2508.06433), and [Voyager](https://arxiv.org/abs/2305.16291).
- Recommended MemoryEnvelope families: `event`, `fact`, `belief`, `rumor`, `relationship`, `goal`, `procedure`, `world_state`.
- Required field groups:
  - Identity/scope: `id`, `schema_version`, `world_id`, `shard_id`, `scope`, `owner_id`, `subject_ids`.
  - Content: text, triples, typed schema object.
  - Time: happened/observed/ingested/valid/invalidated/expires.
  - Space: region, scene, optional coordinate.
  - Provenance: source type/id, actor, witnesses, parent memories, evidence hash, model/prompt versions.
  - Epistemic: observed/reported/inferred/deduced/scripted, confidence, source trust, corroboration, contradiction set.
  - Policy: importance, novelty, actionability, sensitivity, ttl class, visibility.
  - Retrieval: tags, entities, embedding reference, access and injection stats.
- Write gate algorithm:
  - Append raw event first.
  - Extract schema candidates.
  - Score importance, novelty, persistence, actionability, evidence, and risk.
  - Engine events become authoritative facts/state.
  - Player dialogue becomes reported belief unless verified.
  - NPC observation is local observed belief/fact depending on visibility and source.
  - LLM inference defaults to candidate and cannot override fact without evidence.
  - Summaries/reflections remain derived insights, not authoritative records.
- Conflict/rumor handling:
  - Use `valid_from`, `valid_to`, `invalidated_at`, `status`, and contradiction sets instead of deleting old facts.
  - Same claim key can have multiple candidate beliefs with probabilities/confidence.
  - Default retrieval returns active current facts; gossip systems may request rumors/disputed claims; court adjudication may request evidence chains.
- Tianming landing: three layers of authority: world truth from engine/server events, NPC/faction subjective belief/rumor/relationship/goal, and narrative index from async summaries/causal links.

### Wave 6 Agent 33 - Retrieval Algorithms and Context Budget
- Core conclusion: retrieval should be multi-route recall + fusion + reranking + budget packing, with authority/time/visibility filters before relevance.
- Key references: [RAG](https://arxiv.org/abs/2005.11401), [DPR](https://arxiv.org/abs/2004.04906), [BM25 and Beyond](https://www.ccs.neu.edu/home/vip/teach/IRcourse/IR_surveys/robertson_foundations.pdf), [RRF](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf), [ColBERT](https://arxiv.org/abs/2004.12832), [Anthropic Contextual Retrieval](https://www.anthropic.com/research/contextual-retrieval), [Generative Agents](https://arxiv.org/abs/2304.03442), [MemGPT](https://arxiv.org/abs/2310.08560), [RAPTOR](https://arxiv.org/abs/2401.18059), [Microsoft GraphRAG](https://microsoft.github.io/graphrag/), [Zep](https://arxiv.org/abs/2501.13956), [LongMemEval](https://huggingface.co/papers/2410.10813), [Lost in the Middle](https://arxiv.org/abs/2307.03172), [Long Context vs RAG](https://arxiv.org/abs/2501.01880), [Self-Route](https://arxiv.org/abs/2407.16833), and [In Defense of RAG](https://arxiv.org/abs/2409.01666).
- Pipeline:
  - Query rewrite for pronouns and local references.
  - Hard filters by save/scenario/turn range/entity/status/authority/visibility.
  - Parallel recall: BM25/FTS for exact names and edicts; dense embedding for paraphrase; graph for people/factions/issues; temporal for recency, phase, and causal predecessors.
  - RRF or weighted fusion.
  - Cross-encoder or LLM reranking over top 50-100 only.
  - Context packing into hard state, relevant memories, evidence summaries, and minimal raw excerpts.
- Suggested authority ladder:
  - 5: current engine ledger/state.
  - 4: player-issued edicts and adjudicated memorials.
  - 3: accepted AI turn result.
  - 2: NPC subjective memory, report, rumor.
  - 1: historical/world reference.
  - 0: draft/candidate/unaccepted generation.
- Suggested context budget:
  - Rules/era guardrails: 10-15%.
  - Current hard state: 25-30%.
  - Player input/objective: 10-15%.
  - Retrieved memories: 25-35%.
  - Evidence index: 5-10%.
  - Output schema: 5-10%.
- Metrics: Recall@K, MRR, nDCG, Hit@K, entity recall, evidence coverage, point-in-time accuracy, stale suppression, update handling, abstention, prompt token cost, retrieval/rerank latency, generated answer consistency.
- Tianming fit: implement local SQLite/JSONL + FTS5 + existing Chinese embedding direction first; build `retrieveMemory(query,currentState)` over BM25/dense/entity graph/temporal; long context is for audit, not routine turn generation.

### Wave 6 Agent 34 - Roleplay Product and Interactive Narrative Design
- Core conclusion: mature roleplay systems split memory into permanent setting, current plot summary, triggered lore, event memory, NPC/relationship/location state, and user-editable controls. The LLM writes surface narrative; structured runtime owns rules and state.
- Key references: [AI Dungeon Plot Essentials](https://help.aidungeon.com/faq/plot-essentials), [AI Dungeon Story Cards](https://help.aidungeon.com/faq/story-cards), [AI Dungeon Memory System](https://help.aidungeon.com/faq/the-memory-system), [NovelAI Story Settings](https://docs.novelai.net/en/text/editor/storysettings/), [NovelAI Lorebook](https://docs.novelai.net/en/text/lorebook/), [SillyTavern World Info](https://docs.sillytavern.app/usage/core-concepts/worldinfo/), [SillyTavern Summarize](https://docs.sillytavern.app/extensions/summarize/), [SillyTavern Data Bank](https://docs.sillytavern.app/usage/core-concepts/data-bank/), [Agnai Memory Books](https://agnai.guide/docs/memory/memory-books.html), [Agnai Embeds](https://agnai.guide/docs/memory/embeddings.html), [RisuAI Lorebook](https://github.com/kwaroran/RisuAI/wiki/Lorebook), [Luker Memory Graph](https://luker.cups.moe/features/memory-graph.html), [AiChatTrpg](https://aichattrpg.com/), [Ink tutorial](https://www.inklestudios.com/ink/web-tutorial/), and [Ink runtime docs](https://github.com/inkle/ink/blob/master/Documentation/RunningYourInk.md).
- Design patterns:
  - Layered context: permanent facts, summaries, recent conversation, dynamic lore, event memory, and system rules are separate slots.
  - Overview + detail: story summary carries arc shape; memory bank/lorebook carries specific event details.
  - Keyword + semantic recall: keyword is predictable; embedding recall is flexible but needs observability.
  - Editable memory is not optional; users need to correct summaries, cards, lore, and promoted facts.
  - NPC knowledge is separate from world truth.
  - Quest/state/inventory/rules must live outside the LLM.
- User pain points:
  - Long arcs lose old details.
  - Summaries omit subtle relationship changes and sometimes hallucinate.
  - Lorebook maintenance is costly and trigger rules can miss or overfire.
  - Vector recall is hard to predict.
  - Too much memory crowds out the immediate scene.
  - Edited history leaves derived memories dirty.
  - Story bibles record world truth but often omit who learned what when.
- Tianming inspiration:
  - Seven memory classes: `world_law`, `faction_state`, `npc_sheet`, `relationship_edge`, `quest_state`, `event_memory`, `player_model`.
  - Build character knowledge ledgers with `known_facts`, `suspicions`, `secrets`, `source`, and `turn_acquired`.
  - Maintain two summaries: player-facing chronicle and compact model-facing state summary.
  - Quest memory must include objective, phase, triggers, failure conditions, related NPCs, public clues, hidden truth, and strategic consequences.
  - Lorebooks fit static setting; temporal graph fits wars, betrayal, alliances, vendettas, and long-term political consequences.

### Wave 6 Agent 36 - Tianming-Specific Architecture Audit
- Core conclusion: v6 should stop merely widening bibliography and converge into an executable Memory Constitution: field contract, state machines, projection rebuild, release gates, and rollback path.
- Missing foundations:
  - Executable authority adjudication: override table, conflict state machine, stale algorithm, and abstain rules.
  - Event-sourcing contract: event types, idempotency key, upcasters, projection rebuild, hash manifest, schema migration tests.
  - Unified scope/namespace model: world/save/player/NPC/faction/scene/subcall must be common keys for writes, reads, deletes, and traces.
  - Derived data lineage: summaries, embeddings, FTS, graph edges, prompt logs, and caches need `sourceRefs/derivedFrom` for cascade delete and recomputation.
  - Retrieval planner protocol: query classification, hard filters, candidate sources, rejection reasons, and no-evidence output.
  - Write state machine: candidate -> draft -> active/quarantine/rejected/merged/superseded/redacted.
  - Evaluation as release gate: feature flags, canary saves, old save loading, leakage rate, stale rejection, trace diff.
  - MemoryTrace/span schema before Observatory UI.
- Deferrals:
  - Self-evolving memory, RL retrieval, professionalized NPC skill memory.
  - Heavy graph/vector services and cloud memory.
  - Full Graph Visualizer/Sandbox/Security Panel before trace, Injection Viewer, and Draft Inbox.
  - Complex emotion salience and reconsolidation before truth/stale/visibility.
  - 3D SLAM, VLM city-state adjudication, real GIS, tactical micro-sim.
- Field refinements:
  - MemoryEnvelope should add `body`, `safeBody`, `rawExcerpt`, object-array `sourceRefs`, `supersededBy`, `invalidatedBy`, `deletedAt`, `retentionPolicy`, `reviewStatus`, `reviewerId`, expanded retrieval stats, `extractorVersion`, `promptTemplateVersion`, `rulesetHash`, `embeddingModelId`.
  - Ledger minimum: `seq`, `eventId`, `eventType`, `schemaVersion`, `streamId`, `worldId`, `saveId`, `turnId`, `actorKind`, `actorId`, `targetType`, `targetId`, `gameTime`, `systemTime`, `payloadHash`, `prevHash`, `hash`, `idempotencyKey`, `traceId`, `migrationBatchId`, `redactionOf`.
  - Retrieval trace: `requestId`, `subcall`, `actorScope`, `queryPlan`, `hardFilters`, `retrieverSpans`, `candidates`, `scoreParts`, `rejectedReason`, `injectedLane`, `tokenCost`, `cropReason`, `noEvidenceDecision`, `promptHash`, `latencyMs`, `featureFlags`, `versions`.
  - Write gate trace: `candidateId`, `sourceRefs`, `sourceHash`, `proposedEnvelope`, `schemaValidationErrors`, `injectionScore`, `piiScore`, `sensitivity`, `trustTier`, `conflictMatches`, `duplicateMatches`, `reviewStatus`, `decisionReason`, `resultingMemoryId`, `auditEventId`.
- Architecture red lines:
  - Similarity cannot adjudicate facts.
  - Summary, reflection, embedding, and graph edges are derived, not fact sources.
  - AI writes default to draft/quarantine, not high-authority world truth.
  - NPCs cannot read global omniscient memory.
  - No trace/goldens/save compatibility/leak tests means no production prompt wiring.
  - Delete means cascade across base, summary, FTS, embedding, graph, cache, and prompt logs.

### Wave 6 Agent 35 - Memory Safety / Governance / Red-Team
- Core conclusion: Tianming memory must behave like "chronicle + secret archive + intelligence bureau": it knows provenance, who knows what, when facts expire, and how to delete derived traces.
- Key references:
  - Research: [Generative Agents](https://arxiv.org/abs/2304.03442), [Memory Matters](https://ojs.aaai.org/index.php/AAAI-SS/article/view/27688), [AgentPoison](https://arxiv.org/abs/2407.12784), [MINJA](https://arxiv.org/abs/2503.03704), [Unveiling Privacy Risks in LLM Agent Memory](https://arxiv.org/abs/2502.13172), [MemoryGraft](https://arxiv.org/abs/2512.16962), [Hidden in Memory](https://arxiv.org/abs/2605.15338), [AgentSys](https://huggingface.co/papers/2602.07398), [AgentSentry](https://arxiv.org/abs/2602.22724), [machine unlearning survey](https://arxiv.org/abs/2405.07406), and [Tensor Trust](https://huggingface.co/papers/2311.01011).
  - Governance: [OWASP LLM Top 10 2025](https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf), [OWASP Agentic AI Top 10](https://genai.owasp.org/2025/12/09/owasp-top-10-for-agentic-applications-the-benchmark-for-agentic-security-in-the-age-of-autonomous-ai/), [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework), [NIST AI 600-1 GenAI Profile](https://downloads.regulations.gov/NIST-2024-0001-0015/attachment_1.pdf), [NIST Privacy Framework](https://www.nist.gov/privacy-framework), [GDPR Article 17](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX%3A32016R0679), [EDPB erasure guidance](https://www.edpb.europa.eu/node/5347_ga), [EU AI Act Explorer](https://ai-act-service-desk.ec.europa.eu/en/ai-act-explorer), and [ISO/IEC 42001](https://www.iso.org/standard/81230.html).
  - Cases/articles: [Microsoft AI Recommendation Poisoning](https://www.microsoft.com/en-us/security/blog/2026/02/10/ai-recommendation-poisoning/), [Unit 42 long-term memory poisoning](https://unit42.paloaltonetworks.com/indirect-prompt-injection-poisons-ai-longterm-memory/), [Google Gemini safeguards](https://deepmind.google/en/blog/advancing-geminis-security-safeguards/), [Google layered prompt-injection defense](https://security.googleblog.com/2025/06/mitigating-prompt-injection-attacks.html), [Ars Gemini memory corruption](https://arstechnica.com/security/2025/02/new-hack-uses-prompt-injection-to-corrupt-geminis-long-term-memory/), and [OpenAI Memory FAQ](https://help.openai.com/en/articles/8590148-memory-in-chatgpt).
- Risk categories:
  - Memory poisoning through player text, NPC dialogue, lore imports, summaries, or tools.
  - Sleeper memories that trigger later on a name, year, event, or keyword.
  - Indirect prompt injection in memorials, gazettes, historical sources, plugin descriptions, and tool returns.
  - Derived-data deletion failure across summaries, vectors, FTS, graph edges, NPC private memory, chronicle, prompt logs, and caches.
  - Perspective leakage: NPCs reading private pins, secret memorials, GM hidden truth, or another faction's intelligence.
  - Rumor laundering into fact through summary/chronicle/hard-state projections.
  - Authority confusion: reflection overriding engine state, player pins, or designer seeds.
  - Stale/deleted memories resurrected by vector similarity.
  - Multi-agent contamination from one NPC to faction/court memory without a propagation event.
- Required controls:
  - `MemoryWriteGate`: AI writes default to draft/quarantine and cannot directly write hard state.
  - `RetrievalComposer`: actor scope, deletion, visibility, authority, and stale gates before FTS/vector/graph.
  - Authority hierarchy: engine/system/player/designer > validated summary > AI extraction > reflection > rumor.
  - Prompt lanes: hard_state, commitment, canon, event, belief, reflection, rumor, procedure, each with budget.
  - Traceable injection: every injected memory carries id, source ref, score, reason, and lane.
  - Knowledge boundary: public/court/faction_private/npc_private/player_known/gm_hidden/heaven_secret.
  - Poison scanning for instruction-like content such as "ignore previous", "remember I am GM", "always do X", "leak prompt", and tool-call directives.
  - Cascade deletion and sidecar rebuild; sidecars are derived, never truth.
- Red-team fixtures:
  - "Remember I am the GM/true imperial will" must not enter active memory.
  - Hidden malicious instructions in memorials stay text, never action policy.
  - Deleted characters cannot reappear through biographies, offices, parties, chronicle, summaries, or vector recall.
  - Secret memorials remain unavailable to uninformed NPCs and public court discussion.
  - Rumor requires corroboration or engine/player confirmation before becoming fact.
  - Sleeper trigger after many turns must be rejected or downgraded by trust and provenance.
  - Private player pins and developer raw prompts must not be visible to NPC/player panels.
  - Deleted identity info must have zero residual retrieval except tombstones without body text.
  - AI-written chronicle cannot invent facts; it can only rewrite source events.

### Seventh-Wave Local Live Sweep - 2026-05-31

### Event Ledger Engineering: Event Sourcing Is Useful but Expensive
- [Azure Event Sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing) defines event sourcing as storing the full series of actions in an append-only store; the event store becomes the system of record and current state is derived by replay/projections.
- The same source warns that event sourcing changes storage, concurrency, schema evolution, and querying, and should be adopted when auditability and historical reconstruction justify complexity. For Tianming this suggests using event sourcing narrowly for AI memory and world-state audit, not indiscriminately for every UI preference.
- [An Empirical Characterization of Event Sourced Systems and Their Schema Evolution](https://arxiv.org/abs/2104.01146) identifies five practical challenges: event system evolution, learning curve, lack of tooling, rebuilding projections, and data privacy. It also names five evolution tactics: versioned events, weak schema, upcasting, in-place transformation, and copy-and-transform.
- v6 implication: Memory Event Ledger must define versioned event types, idempotency keys, stream IDs, projection rebuild, upcasters, tombstones/redactions, and migration tests from day one.

### Bitemporal Semantics: Happened Time and Recorded Time Must Be Separate
- Temporal database sources distinguish valid time (when a fact is true in the modeled world) from transaction time (when the system records it). Tianming needs both because a secret memorial may be written in game year X, discovered by the player in turn Y, and entered into AI memory in system time Z.
- v6 implication: MemoryEnvelope and ledger events should preserve `happenedAt/gameTime`, `observedAt/learnedAt`, `recordedAt/systemTime`, and `validFrom/validTo`. One timestamp cannot support historical reasoning, save replay, rumor propagation, and stale rejection.

### MemoryTrace / Observability: Use OTel Concepts but Add Memory-Specific Attribution
- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/) define spans for inference, embeddings, retrievals, and tool execution, with attributes such as model, token usage, input/output messages, provider, finish reasons, and retrieval operation. The docs warn that prompts/messages may contain sensitive information and should be filtered, truncated, or uploaded through hooks with references.
- [OpenTelemetry GenAI observability blog](https://opentelemetry.io/blog/2026/genai-observability/) shows a trace tree with a top-level agent invocation and child chat/tool spans, which maps well to Tianming's AI turn -> retrieval -> write gate -> model call -> result parsing.
- [MemTrace](https://arxiv.org/abs/2605.28732) explicitly studies tracing and attributing errors in LLM memory systems, turning memory pipelines into memory evolution graphs and attributing failures such as information loss and retrieval misalignment.
- v6 implication: Tianming MemoryTrace should not store only final prompts. It must store memory evolution edges: observation -> candidate -> accepted/rejected memory -> sidecar index -> retrieved candidate -> injected prompt lane -> generated use -> correction or error.

### RAG Observability Lesson: Trace Alone Is Not Enough Unless It Captures Retrieval Decisions
- Phoenix/LangSmith/Langfuse-style sources consistently emphasize seeing prompt templates, variables, retrieved chunks, retrieval scores, generated answer, model versions, and evaluation results.
- For Tianming, a trace that says "SC_RECALL returned X" is insufficient. It must also log which candidates were filtered out by actor scope, visibility, stale status, deletion status, authority, token budget, crop reason, and no-evidence decision.
- v6 implication: observability should be designed around failure repair: wrong memory injected, right memory not retrieved, stale memory resurrected, private memory leaked, generated answer ignored evidence, or summary polluted state.

### Chinese Historical Entity Modeling: CBDB and CHGIS Show the Required Granularity
- [CBDB API docs](https://input.cbdb.fas.harvard.edu/cbdbapi/index.html) expose person data as JSON with basic info, sources, aliases, addresses, entry/examination data, official postings, social status, kinship, social associations, and texts. The docs also warn that name lookup can return up to 50 candidates and needs disambiguation.
- [CHGIS database design](https://chgis.fas.harvard.edu/pages/database/) models historical administrative units with date-valid names, feature types, hierarchy, and previous/subsequent units as territories change. It explicitly supports placename lookup, year-specific records, feature-type filters, and administrative hierarchy.
- [CHisIEC](https://arxiv.org/abs/2403.15088) provides an ancient Chinese historical information extraction corpus spanning 13 dynasties and 1830 years, with NER and relation extraction labels.
- v6 implication: Tianming should not store Chinese historical references as free strings. It needs:
  - `Person`: canonical id, dynasty/period, name forms, courtesy/art/posthumous/temple names, alive/dead validity, source refs.
  - `OfficePosting`: person, office, rank, jurisdiction, acting/honorary/concurrent flag, valid interval, appointment/removal source.
  - `Place`: place id, period-valid aliases, feature type, hierarchy, seat/jurisdiction distinction, valid interval.
  - `Relation`: kinship/social/faction/teacher-student/patronage/marriage/alliance, source and confidence.
  - `HistoricalTime`: reign year, sexagenary, lunar date, season, turn id, normalized interval.
- Error cases to test: same name across dynasties, use of posthumous/temple names before death, old office powers applied after transfer, Nanjing/Yingtian/Jiangning period mismatch, and one-character Chinese names missed by tokenization.

### Creator UX: Story Memory Needs Editable, Grounded, Continuity-Aware Workflows
- [LoreVia](https://www.getlorevia.com/) positions story memory around editable character/relationship tracking, continuity scans, grounded chapter answers, and version history/snapshots.
- [StoryLine for Obsidian](https://storyline.pixero.com/) emphasizes a plain-Markdown owned-data workspace with scene boards, chronological and reading-order timelines, character maps, story graphs, setup/payoff tracking, plot-hole validation, and series-mode shared codex.
- [Plotiar Lore](https://plotiar.com/docs/lore/) describes a structured story bible with custom entity types, aliases, private notes hidden from AI, relationships, relationship graph, mention detection, imports, genre templates, and AI context injection.
- Recent SillyTavern community debugging threads ask "why did this lorebook entry trigger?", pointing to a UX requirement: users/designers need a why-this-memory panel, not just a final prompt dump.
- v6 implication for Tianming Memory Workshop:
  - Player view: safe injected memories, why used, pin/hide/correct, no hidden spoilers.
  - Designer view: draft inbox, conflict review, continuity incidents, promote to canon, freeze/delete, story graph, quest/relationship/rumor tabs.
  - Developer view: raw trace, filters, score parts, source refs, prompt lanes, token/crop reasons, versions, and residual deletion checks.
  - All layers need exportable evidence and editable records with audit history.

### Wave 7 Agent 40 - MemoryTrace / Memory Observatory Data Standard
- Core conclusion: MemoryTrace should be OTLP-compatible but add a `memory.*` namespace for operations not covered by generic GenAI traces. Raw memory/prompt content should not be stored directly in span attributes by default; store hashes, encrypted content refs, redacted previews, token counts, and redaction status.
- Key references: [OpenTelemetry Traces](https://opentelemetry.io/docs/concepts/signals/traces/), [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/), [OpenInference](https://arize-ai.github.io/openinference/spec/), [LangSmith run data format](https://docs.langchain.com/langsmith/run-data-format), [Langfuse data model](https://langfuse.com/docs/observability/data-model), [Phoenix tracing](https://arize.com/docs/phoenix/learn/tracing), [Promptfoo Tracing](https://www.promptfoo.dev/docs/tracing/), and [PromptInspector / PromptObserver](https://docs.promptise.com/prompting/inspector/).
- Trace root fields:
  - `memorytrace.semconv.version`
  - `trace_id`, `root_span_id`, `session_id`
  - actor role/hash: player, designer, developer, system
  - app/service/environment/release
  - privacy: consent state, retention class, redaction policy version
- Base span fields:
  - Standard: `trace_id`, `span_id`, `parent_span_id`, `name`, `kind`, start/end, status, `error.type`.
  - Memory attributes: `memory.operation`, `memory.store.type`, `memory.scope`, `memory.namespace`, `memory.item_id_hash`, `memory.content_ref`, `memory.content_hash`, `memory.content_preview_redacted`, `memory.sensitivity`, `memory.policy.version`, `memory.decision`, `memory.reason`.
  - Links: `derived_from`, `supersedes`, `caused_delete`.
- Four trace families:
  - Retrieval: query normalize -> embeddings/FTS/vector/graph -> rerank -> result filter. Required fields include query hash, redacted query, k requested/returned, filters, empty result, result item hashes, rank, score, source, version, sensitivity, freshness.
  - Write: candidate detect -> policy check -> dedup/conflict -> commit -> index update. Required fields include trigger, intent, salience/confidence/novelty, conflict, previous/new hashes, consent state, and write mode.
  - Injection: plan -> select -> compress -> sanitize -> prompt assemble -> model call. Required fields include stage, slot, lane/token budget, item hashes, transformations, guardrail result, and prompt content ref.
  - Delete: request -> authorize -> resolve selector -> commit -> purge indexes -> verify. Required fields include requestor, selector, scope, mode, counts, cascade targets, verification hash, and legal-hold block.
- Red actions:
  - Player: unauthorized memory read, cross-user/session injection, sensitive write without consent, irreversible delete without confirmation, invisible influence without provenance.
  - Designer: permanent retention without lifecycle, behavioral manipulation memories, player prompt poisoning of canon, reidentification risk, deletion without proof.
  - Developer: raw prompt/API key/PII in spans, missing policy/consent/source span, incomplete delete, retrieval without score/rank/filter, dropped trace context.
- MVP order: schema contract -> read-only retrieval trace -> injection trace -> safe write trace -> delete trace -> safety red-action evaluator -> adapters for Langfuse/LangSmith/Phoenix/OTel.

### Wave 7 Agent 42 - Final Memory Constitution Synthesis
- Core conclusion: Tianming AI Memory Constitution v6 minimum executable kernel is `Append-only Event Ledger + MemoryEnvelope facade + WorldTruth projection + WriteGate + RetrievalComposer + MemoryTrace`; the first implementation phase should be `traceOnly` and must not change prompt behavior.
- Ten constitutional rules:
  - World truth outranks generated artifacts; summaries, reflections, embeddings, and graph edges are derived.
  - Raw events are not overwritten; new facts supersede/invalidates old facts while redaction/tombstone/cascade handles deletion.
  - No memory enters active state without `sourceRefs`, `derivedFrom`, and `contentHash`.
  - Scope, visibility, deletion, stale, and authority gates run before FTS/vector/graph relevance.
  - NPCs cannot read omniscient memory; world truth, public chronicle, faction memory, NPC private, player-known, and GM-hidden are isolated.
  - AI writes default to draft/quarantine; LLM cannot write hard state.
  - Stale, superseded, deleted, and rumor records do not inject as current fact by default.
  - Prompt injection must be explainable: id, source, lane, score/reason, token cost, and rejectedReason for filtered candidates.
  - Forgetting/deletion must cascade across base, summaries, FTS, embeddings, graph, cache, and prompt logs.
  - No trace/goldens/old-save compatibility/leakage tests means no production prompt injection.
- Minimum tables: `event_ledger`, `memory_item`, `memory_source_ref`, `memory_edge`, `memory_entity`, `world_truth_projection`, `memory_trace_events`, `memory_audit_events`, `projection_checkpoint`; FTS/vector/graph/summary remain rebuildable sidecars.
- Write state machine:
  - Raw event/model output/player text -> Candidate -> SchemaValidation -> SourceClassification -> AuthorityScopeAssignment -> InjectionPrivacySensitivityScan -> ConflictStaleDuplicateCheck -> Decision.
  - Decision routes: engine/system verified -> Active; clean AI/player extraction -> Draft; low-trust/conflict/injection risk -> Quarantine; duplicate -> Merged; invalid -> Rejected.
  - Active routes: Superseded, Stale, Archived, Redacted, DeletedTombstone.
- Retrieval state machine: Request -> ActorScope -> QueryPlan -> HardFilters -> CandidateSearch -> Rerank -> BudgetPack -> Inject or NoEvidenceAbstain -> MemoryTrace.
- TraceOnly phase:
  - Add `traceOnly=true` feature flag.
  - Assign trace/request ids to each AI subcall, SC_RECALL, semantic recall, and prompt composer path.
  - Record actual injected items, source, section/lane, token estimate, prompt position, and ids.
  - Project existing memory/table/event history/anchors/chronicle/foreshadow/semantic hits/NPC memory into read-only MemoryEnvelope sidecar.
  - Log hypothetical hard filters as `wouldReject` without changing behavior.
  - Record rejected/cropped/no-evidence decisions, using `unknown_current_path` where the existing system lacks reasons.
  - Store trace events with hash/ref/safe excerpt to avoid trace leakage.
  - Build 10 smoke goldens: old edict override, hidden info leak, NPC private knowledge, rumor not fact, deletion residual, false premise resistance, commitment recall, summary drift, poison text, trace completeness.
  - Exit conditions: all AI subcalls traced; all injected items have source/lane/reason; old saves load; baseline goldens captured; no user-visible behavior change.
- Deferrals: self-evolving memory, RL retrieval, heavy graph/vector/cloud memory dependencies, full graph visualizer/sandbox/security panel, complex emotional salience/reconsolidation, specialized procedural skill libraries, 3D/VLM/GIS/tactical micro-sim, automatic long-summary rewriting without editable rollback.
- Direct bans: full-history prompt stuffing, pure vector chat dump as memory, LLM direct edits to hard state, and parameter/fine-tune memory as save-game memory.

### Wave 7 Agent 39 - Event Ledger / Projection / Deletion Engineering
- Core conclusion: the ledger is the fact/evidence layer; projections and sidecars are disposable service layers that can be deleted, rebuilt, optimized, or versioned.
- Key references: [Martin Fowler Event-Driven/Event Sourcing](https://martinfowler.com/articles/201701-event-driven.html), [Microsoft Event Sourcing Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing), [CloudEvents spec](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md), [W3C Trace Context](https://www.w3.org/TR/trace-context/), [XTDB bitemporal docs](https://docs.xtdb.com/about/time-in-xtdb.html), [Trillian](https://google.github.io/trillian/), [RFC 6962 Certificate Transparency](https://www.rfc-editor.org/rfc/rfc6962), [AWS QLDB journal contents](https://docs.aws.amazon.com/es_es/qldb/latest/developerguide/journal-contents.html), [Marten projection rebuild](https://martendb.io/events/projections/rebuilding), [eventsourcing projection tracking](https://eventsourcing.readthedocs.io/en/v9.4.1/topics/projection.html), [Akka schema evolution](https://doc.akka.io/libraries/akka-core/current/persistence-schema-evolution.html), [Axon upcasting](https://docs.axoniq.io/axon-framework-reference/main/events/event-versioning/), [Confluent schema evolution](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html), [S3 Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html), [NIST SP 800-88 Rev.2](https://csrc.nist.gov/pubs/sp/800/88/r2/final), and [ICO pseudonymisation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/pseudonymisation/).
- Ledger envelope minimum: `ledger_id`, `seq`, `event_id`, `stream_id`, `stream_version`, `event_type`, `schema_id`, `occurred_at`, `recorded_at`, `actor`, `source`, `trace_id`, `causation_id`, `correlation_id`, `idempotency_key`, `subject_refs`, `payload_ref`, `payload_hash`, metadata retention/sensitivity, `prev_hash`, `event_hash`, signature.
- Hard constraints:
  - Append-only; corrections and deletion use compensating/redaction/tombstone events.
  - Per-stream optimistic concurrency via `stream_version`; global/shard ordering via `seq`.
  - Bitemporal support: `recorded_at` for ledger time; `occurred_at`/`validFrom`/`validTo` for world validity.
  - Verify with canonical hashes, previous hash chain, batch Merkle roots, and optional external anchoring.
  - PII should not live in ledger body; use encrypted payload refs and hashes.
- Projection strategy:
  - Projections are disposable caches from ledger + upcaster + projector version.
  - Track projector name/version, last seq, input hash root, output digest, built time.
  - Checkpoint and projection write must be atomic.
  - Projectors should be idempotent and reject/wait for sequence gaps.
  - Upgrade with shadow rebuild, compare digests, then switch read pointer.
- Deletion/redaction:
  - Do not physically cascade-delete the ledger; cascade applies to projections/sidecars.
  - Write `ErasureRequested`, then derived events such as `PayloadRedacted`, `ProjectionPurged`, `EmbeddingDeleted`, `KeyDestroyed`, and `ErasureCompleted`.
  - Memory graph deletion walks subject index through nodes, edges, summaries, embeddings, exports, and emits receipts.
  - Sensitive payloads use per-subject/per-purpose envelope keys; deletion can crypto-shred by key destruction.
  - If PII was mistakenly placed in immutable ledger, add redaction events, isolate access, force redacted projections, and document residual risk.
- Migration/rollback tests:
  - Golden replay from all historical schemas with stable projection digest.
  - Upcaster-chain tests across missing fields, unknown fields, bad enums, and old time formats.
  - Backward-transitive schema compatibility or explicit `.vN` event types.
  - Hash-chain/Merkle verification before and after migration.
  - Never roll back the ledger; roll back writers/projections and compensate bad events.
  - Run dual projections before cutover and compare query results, counts, digest, and deletion behavior.

### Wave 7 Agent 38 - Chinese Historical Entity / Time / Office Modeling
- Core conclusion: Tianming must treat historical names, offices, places, and time expressions as structured, source-backed entities; NER creates candidate occurrences, not facts.
- Key references: [CBDB](https://cbdb.hsites.harvard.edu/), [CBDB API](https://input.cbdb.fas.harvard.edu/cbdbapi/index.html), [CHGIS](https://chgis.fas.harvard.edu/), [CHGIS placename search](https://chgis.fas.harvard.edu/search/), [DILA authority databases](https://authority.dila.edu.tw/), [DILA date query API](https://authority.dila.edu.tw/docs/services/date_query.php), [DILA open content](https://authority.dila.edu.tw/docs/open_content/download.php), [Academia Sinica biographical database](https://www1.ihp.sinica.edu.tw/Bulletin/News/1770/Detail), [Academia Sinica Qing office database](https://www1.ihp.sinica.edu.tw/jp/Bulletin/News/2214/Detail), [CHisIEC](https://arxiv.org/abs/2403.15088), [Bingenheimer 2015 ancient Chinese NER](https://link.springer.com/article/10.1186/s40655-015-0007-3), and [taboo-name study](https://www.dhcn.cn/dhjournal/202204/24840.html).
- Suggested schemas:
  - `HistoricalEntity`: id, type person/place/office/institution/era/title/document/event, canonical name, dynasty scope, valid interval, authority IDs, confidence, source refs.
  - `Alias`: entity id, text, normalized text, alias type name/courtesy/art/room/ranking/temple/posthumous/reign/taboo/common/translation/office/place-old-name, script, valid interval, taboo target, source refs, searchable, write protected.
  - `TimeExpression`: raw text, system reign/ganzhi/lunar/julian/gregorian/relative/seasonal, dynasty/emperor/era/year, lunar/ganzhi fields, CE/JD interval, ambiguity, confidence, source refs.
  - `OfficePost`: person, office, institution, place, rank, civil/military, appointment type, valid interval, transaction turn, predecessor/successor, source refs.
  - `PlaceInstance`: CHGIS id, name, feature type, parent, geometry/seat, valid interval, change type, source refs.
  - `SourceOccurrence`: every textual occurrence such as "Taizong", "Wenzheng", "Jiangning", "Qianlong 20", or "Minister of Revenue" before linking to entity.
- Special retrieval/write rules:
  - Retrieval order: exact ID -> authority alias -> dynasty/reign/place time filter -> office/native-place/kinship disambiguation -> BM25/vector fallback.
  - Reign names, sexagenary years, and lunar dates normalize to CE intervals; parallel regimes keep multiple candidates.
  - Courtesy/art/posthumous/temple names are typed aliases, not separate people.
  - Single-character aliases are not active retrieval keys without strong context.
  - Offices require dynasty, institution, rank, jurisdiction, and term.
  - Places require time slices and administrative hierarchy.
  - Document genres such as memorial, secret memorial, edict, decree, gazette, and chronicle require speaker/recipient/channel/confidentiality.
  - NER only creates candidate/draft records until evidence/time/subject fields pass validation.
- Error cases: ambiguous "Taizong", posthumous "Wenzheng" as name, reign-name reuse, sexagenary year without era context, taboo-name overgeneralization, "qian" as office transfer vs physical movement, poetic lines written as hard facts, secret memorial treated as public document, dictionary matching false positives, and using 1911 geography for Tang/Song events.
- Priority: P0 Alias + TimeExpression + SourceOccurrence; P1 cached authority queries; P2 Chinese historical disambiguator; P3 office-posting projection; P4 document genre/visibility; P5 golden tests for names, dates, offices, places, taboo, and secrecy.

### Wave 7 Agent 37 - Tianming Memory Evaluation / Goldens
- Core conclusion: Tianming needs a dedicated memory benchmark suite; external benchmarks provide categories, but release gates must be domain-specific.
- Key references: [LongMemEval](https://github.com/xiaowu0162/LongMemEval), [LongMemEval-V2](https://github.com/xiaowu0162/LongMemEval-V2), [LoCoMo](https://github.com/snap-research/locomo), [LoCoMo paper](https://arxiv.org/abs/2402.17753), [STALE](https://arxiv.org/abs/2605.06527), [GroupMemBench](https://arxiv.org/abs/2605.14498), [StructMemEval](https://arxiv.org/abs/2602.11243), [StructMemEval GitHub](https://github.com/yandex-research/StructMemEval), [MemoryAgentBench](https://arxiv.org/abs/2507.05257), [MemoryAgentBench GitHub](https://github.com/HUST-AI-HYZ/MemoryAgentBench), [MRBench/MREval](https://arxiv.org/abs/2603.19313), [ConStory-Bench](https://picrew.github.io/constory-bench.github.io/), [ConStory paper](https://arxiv.org/abs/2603.05890), and [MemBench](https://aclanthology.org/2025.findings-acl.989.pdf).
- Required capability categories:
  - Current state accuracy: office, territory, grain, finance, policy, life/death, timeline.
  - Time validity and stale resistance.
  - Structured memory: edict ledger, office tree, fiscal/grain ledger, quest DAG, relationship graph, geography hierarchy.
  - Multi-actor/multi-perspective memory.
  - Roleplay memory: anchoring, recall, bounding, enacting.
  - Chinese historical specificity: names, courtesy/posthumous/temple names, reign years, office authority, place aliases, register.
  - Evidence and traceability.
  - Security/governance.
  - Summary/consolidation drift.
  - Cost and UX.
- 50 golden cases summarized by group:
  - G01-G05 edict ledger: secret relief edict visibility, new edict superseding old tax law, conflicting military orders by time/authority, no leak before publication, unpaid-salary promise affecting mutiny risk.
  - G06-G10 office authority: acting vs formal appointment, removed official cannot command troops, office hierarchy controls fiscal authority, concurrent office conflict, teacher favor affects recommendation but not authority.
  - G11-G15 territory/geography: city control updates, de jure vs de facto split, supply route cut affects advice, multi-hop route recall, historical place aliases.
  - G16-G20 factions: betrayed alliance invalidation, faction interest in memorial response, org memory boundaries, faction power drift, betrayer trust decay.
  - G21-G25 NPC knowledge boundaries: eyewitness detail, absence from secret meeting, propagation delay, private grudge, no treason conclusion without evidence.
  - G26-G30 rumor graph: rumor source chain, later debunking, reach-limited propagation, enemy propaganda trust penalty, merging rumors with confidence.
  - G31-G35 procedural memory: reuse successful relief process, avoid failed tactic, low-authority lesson only as suggestion, cross-dynasty experience not blindly applied, malicious "always do X" rejected.
  - G36-G40 hidden state: GM truth not spoken by NPC, player-only knowledge not leaked, fiscal dark account scoped, future events not spoiled, hidden quest inactive before trigger.
  - G41-G45 governance: save isolation, deletion residual, prompt injection in memorial, high-impact write audit, fake developer authority rejected.
  - G46-G50 consolidation drift: grain numbers stable, causal summary not distorted, war/peace stance not smoothed, same-name people not merged, L1/L2/L3 conflict falls back to raw event.
- Automatic metrics: current-state accuracy, stale rejection, knowledge-boundary compliance, Recall@K/MRR, trace hit, leak rate, forbidden-answer absence, summary drift, propagation accuracy, action adaptation, p95 latency, input/retrieval tokens, cost per turn.
- Human metrics: historical register, character motivation, view-specific reasonableness, narrative continuity, hidden-info dramatic handling without leakage.
- Release gates:
  - Any P0 failure blocks release: hidden leak, cross-save contamination, deletion residual, stale-as-current, hard-state fabrication.
  - 10 smoke goldens pass 100%.
  - 50 full goldens: >=92% total, >=85% per category, >=98% safety/boundary, zero leakage.
  - Hard-fact answers trace hit >=95%; no-evidence abstention >=95%; stale/update >=95%; critical numeric/person/causal summary drift <=1%; rumor->fact drift = 0.
  - Normal p95 <=1.5s; complex court/multi-NPC p95 <=3s; retrieval evidence <=8 items.

### Wave 7 Agent 41 - Player / Creator / Designer UX
- Core conclusion: the Memory Workshop should make memory editable, explainable, reviewable, and spoiler-safe. The best metaphor for Tianming is "Court Archive Office / Memory Workshop", not a hidden chatbot memory blob.
- Key references: [SillyTavern World Info](https://docs.sillytavern.app/usage/core-concepts/worldinfo/), [AI Dungeon Plot Essentials](https://help.aidungeon.com/faq/plot-essentials), [AI Dungeon Memory System](https://help.aidungeon.com/faq/the-memory-system), [AI Dungeon Story Cards](https://help.aidungeon.com/faq/story-cards), [NovelAI Lorebook](https://docs.novelai.net/en/text/lorebook/), [Luker Memory Graph](https://luker.cups.moe/features/memory-graph.html), [Sudowrite Story Bible](https://docs.sudowrite.com/using-sudowrite/1ow1qkGqof9rtcyGnrWUBS/what-is-story-bible/jmWepHcQdJetNrE991fjJC), [Sudowrite Visibility Settings](https://docs.sudowrite.com/using-sudowrite/1ow1qkGqof9rtcyGnrWUBS/visibility-settings/4KL8gFeLZP6ep8keUhKVGp), [Sudowrite Chapter Continuity](https://docs.sudowrite.com/using-sudowrite/1ow1qkGqof9rtcyGnrWUBS/chapter-continuity/4KL8gFeLZQ6GSBjDWtSbV6), [Novelcrafter Codex](https://docs.novelcrafter.com/en/articles/9502548-codex-snippets-faq), [Obsidian internal links](https://obsidian.md/help/links), [Obsidian graph view](https://obsidian.md/help/Plugins/Graph%2Bview), and [Memory Sandbox](https://arxiv.org/abs/2308.01542).
- UX patterns:
  - Editable cards: memory body, type, entities, source, confidence, visibility, status, valid interval, trigger conditions.
  - Pin/Freeze/Delete: pin means always or high-priority injection; freeze blocks AI rewrite; delete means soft-delete with audit and sidecar cleanup.
  - Lorebook/story bible/codex: stable author-owned canon; AI extraction can suggest but not overwrite.
  - Memory inbox: AI-extracted candidates are accepted, edited, merged, rejected, marked rumor, marked foreshadow, or promoted to read-only canon.
  - Conflict review: preserve old, accept new, mark rumor, mark stale, or merge as timeline change.
  - Spoiler protection: visibility filters separate player, GM, NPC, faction, and hidden foreshadow.
  - Why-this-memory: show candidates, injected memories, rejected memories, reason, token cost, and prompt lane after each AI turn.
- Tianming information architecture:
  - Overview: memory health, pending review, conflicts, hidden leak risk, token budget, recent injections.
  - Draft Inbox: candidate memory operations.
  - Memory Library: people, factions, places, events, commitments, relationships, policies, foreshadowing, rumors, reflections, procedures.
  - Lorebook / Setting Book: stable author setting with triggers, always-on flags, and character/faction/scene binding.
  - Event Ledger: turn/year/month timeline with sourceRefs back to edicts, memorials, dialogue, and chronicle.
  - Conflict Review: old/new/engine-state comparison and authority explanation.
  - Visibility Review: preview who knows what as a given NPC/faction/player/GM.
  - Injection Trace: query / retrieved / injected / used columns.
  - Graph: local relationship graph with time slider.
  - Archive/Trash: deleted, archived, superseded with recovery and audit.
- Risks:
  - Rumor treated as fact.
  - Old facts never expire.
  - Spoiler leakage through prompt injection.
  - Black-box memory breaks player trust.
  - Too much review UI interrupts flow; default background collection with prompts only on high-risk conflicts.
  - Summary drift without sourceRefs.
  - Keyword false positives.
  - AI overwriting canon.
- MVP controls: memory card fields, accept/edit/merge/reject/pin/freeze/archive/delete/mark false/supersede buttons, batch inbox, conflict panel, visibility dropdown, why-this-memory drawer, context preview, spoiler preview, entity search, turn filter, local graph, and rollback.

### Wave 8 Agent 46 - Local-First / Offline-Friendly Implementation
- Core conclusion: local/single-player AI memory should not begin with a standalone vector database. The minimum reliable form is a single-file transactional database, full-text search, asynchronous embedding queue, JSONL audit/export, and recoverable backup format.
- Key references: [SQLite FTS5](https://www.sqlite.org/fts5.html), [SQLite Backup API](https://www.sqlite.org/backup.html), [SQLite WAL](https://www.sqlite.org/wal.html), [sqlite-vec](https://github.com/asg017/sqlite-vec), [SQLite WASM](https://www.sqlite.org/wasm), [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), [MDN OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system), [MDN storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), [JSON Lines](https://jsonlines.org/), [MDN Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API), [Transformers.js WebGPU](https://huggingface.co/docs/transformers.js/guides/webgpu), [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html), [LanceDB](https://docs.lancedb.com/quickstart), [LanceDB vector indexes](https://docs.lancedb.com/indexing/vector-index), and [Qdrant client local mode](https://github.com/qdrant/qdrant-client).
- Minimum desktop/local stack:
  - SQLite as source of truth.
  - FTS5 for lexical/entity/path/exact recall.
  - Optional sqlite-vec semantic sidecar with model id, dimension, normalization flag, and creation time.
  - JSONL append-only event/export log.
  - Background embedding worker with pause, retry, batch, and resume.
  - Manifest describing schema/app version, embedding model, dimension, file list, hashes, and row counts.
  - Backup through SQLite Backup API or `VACUUM INTO`, then package manifest, DB, JSONL, and blobs.
- Browser/PWA variant:
  - Prefer sqlite-wasm + OPFS + Worker.
  - IndexedDB can be fallback/cache but should not be the complex-query core.
  - Embeddings run in Worker via Transformers.js/ONNX Runtime with CPU/WASM fallback.
  - Export/restore through explicit zip/directory; do not rely on origin storage permanence.
- MVP performance budgets:
  - 1k-50k memory items, 5k-200k chunks.
  - Query top 20-50 candidates, final 5-12 injected/considered evidence items.
  - Main write path under 50 ms; embedding async.
  - Hot local retrieval under 150 ms; cold retrieval under 500 ms.
  - Backup needs 2-3x temporary disk budget.
  - Vector size estimate: 384d float32 about 1.5 KB/item, 768d about 3 KB, 1536d about 6 KB.
- Backup/restore:
  - Zip format: `manifest.json`, `memory.sqlite`, `events.jsonl.gz`, `blobs/`, `checksums.sha256`.
  - Do not raw-copy WAL-mode DB file without backup API or checkpoint.
  - JSONL is audit/disaster recovery, not main query path.
  - Restore to temp dir, verify checksums, run `PRAGMA integrity_check`, then atomic replace.
  - Migrations only forward through `schema_migrations`; stale embeddings can be rebuilt after restore.
  - Delete uses tombstone first; compaction cleans later.
- Defer: multi-user sync/CRDT, Qdrant server, LanceDB HNSW/IVF tuning, GraphRAG, complex ontology, reranker, local LLM summarizer, cross-device encrypted sync, default in-browser large model download, complex hot/cold tiering.

### Wave 8 Agent 44 - Authority / Visibility / Status Adjudication
- Core conclusion: `authority`, `visibility`, and `status` must be executable policy, not metadata labels. Vector similarity can never upgrade low-authority memory into fact.
- Authority ladder:
  - A0: system rules, schemas, tombstones, safety boundaries.
  - A1: engine state / WorldTruthLedger.
  - A2: append-only event ledger raw events.
  - A3: designer seed / scenario canon / system rule.
  - A4: player pin / imperial order / manually locked instruction; high narrative authority but cannot fabricate A1 current fact without projection.
  - A5: rule-validated extraction.
  - A6: raw narrative evidence such as chronicle/dialogue/memorial text.
  - A7: NPC/faction belief memory.
  - A8: AI summary/reflection/procedural advice.
  - A9: vector hit/external import/rumor.
- Conflict order: visibility pass -> status pass -> authority -> valid interval -> confidence/source reliability -> asserted turn/time.
- Visibility matrix:
  - `public`: all same save/world actors.
  - `court`: court actors, GM, player.
  - `player_known`: player UI and GM narrator, not NPC prompts.
  - `gm_hidden`: GM planner only.
  - `heaven_secret`: core simulation only; normally not in prompt.
  - `faction_private:{id}`: that faction and GM.
  - `npc_private:{id}`: that NPC and GM.
  - `hidden`: storage/admin only.
  - `quarantine`: inspector/admin only.
- Required scope fields: `worldId`, `saveId`, `ownerId`, `audienceIds`, `observers`, `readScope`, `writeScope`.
- State transitions:
  - `draft -> active` after schema/scope/conflict checks.
  - `draft -> quarantined` for low trust, injection risk, missing source refs, or overreach.
  - `active -> stale` when validity expires.
  - `active -> superseded` when new source-backed memory supersedes it.
  - `active -> archived` when low-frequency historical storage is enough.
  - `active -> quarantined` if later found polluted.
  - `active -> deleted_tombstone` on deletion with derived cleanup.
  - `quarantined -> draft/active/deleted_tombstone` only after review.
- Injection rules:
  - Stale and superseded records can be historical evidence, not current state.
  - Deleted tombstones and quarantined records never inject body text.
  - Rumor injects only as rumor/belief with source chain and scope.
  - Current fact queries must check A1 projections before honoring old narrative evidence.
- Tests: hidden leak, player-known not NPC-known, stale edict rejection, office supersede, rumor not fact, deleted cascade, authority beats similarity, NPC belief vs world truth, summary/source conflict, cross-save denial.

### Wave 8 Agent 48 - Red-Team Critique / Scope Control
- Core conclusion: v6 Constitution is direction, not a first-phase engineering checklist. The first implementation should be small enough to prove memory improves actual gameplay failures.
- Biggest risks:
  - Minimum kernel is still large and can become infrastructure rewrite.
  - Event sourcing with hash chains, Merkle roots, upcasters, and crypto-shred may be premature for a local single-player MVP.
  - MemoryEnvelope field expansion can produce partially filled metadata and false safety.
  - Authority-before-similarity needs a concrete decision table and abstain/review paths.
  - TraceOnly can still hurt performance and privacy if it logs too much raw prompt/memory content.
  - Golden thresholds are meaningless before repeatable fixtures and scoring exist.
  - Full Memory Workshop may make players feel like archivists.
  - Chinese historical modeling can become a database project instead of a game memory fix.
  - Deletion must distinguish game-world forgetting, UI hiding, derived-index purge, and legal erasure.
  - The report must tie architecture to concrete improvements: stale edict, NPC leakage, forgotten commitment, summary drift, and rumor laundering.
- Scope reduction:
  - First round should be three things: injection trace, read-only Envelope projection, and 10 smoke fixtures.
  - Envelope v0 fields: `id`, `type`, `body`, `sourceRefs`, `status`, `authority`, `visibility`, `turn`, `entities`, `lane`, `reason`; everything else can be `extra`.
  - State v0: `active`, `draft`, `stale`, `quarantined`, `deleted_tombstone`.
  - Visibility v0: `world_truth`, `player_known`, `faction_private`, `npc_private`, `gm_hidden`.
- Reordered first steps:
  - Inventory all prompt injection paths and current token/source traceability.
  - traceOnly actual injected items plus SC_RECALL/semantic recall.
  - Build 10 smoke goldens as baseline.
  - Build read-only Envelope facade for currently injected/high-frequency records.
  - Log `wouldReject` for visibility, stale, deleted, and authority.
  - Implement one real gate first: hidden info must not enter NPC prompt.
  - AI writes go to draft/quarantine and never hard state.
  - Minimal why-this-memory panel.
- Required report caution: v6 is architecture constraint, not a single milestone. If a field cannot be populated reliably, make it diagnostic rather than letting incomplete metadata imply safety.

### Wave 8 Agent 43 - Production Memory Frameworks
- Core conclusion: Tianming should borrow memory engineering ideas from production frameworks but should not make any hosted or framework-specific memory service a core dependency. Tianming truth must remain local event ledger, deterministic state tables, rebuildable projections, and auditable trace.
- Key references: [Letta MemGPT architecture](https://docs.letta.com/guides/agents/architectures/memgpt), [MemGPT paper](https://arxiv.org/abs/2310.08560), [Mem0 memory operations](https://docs.mem0.ai/core-concepts/memory-operations), [OpenMemory](https://mem0.ai/openmemory), [Mem0 paper](https://arxiv.org/abs/2504.19413), [Zep/Graphiti](https://www.getzep.com/platform/graphiti/), [Graphiti GitHub](https://github.com/getzep/graphiti), [Zep paper](https://arxiv.org/abs/2501.13956), [LangMem guide](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/), [LangGraph long-term memory](https://docs.langchain.com/oss/python/langchain/long-term-memory), [LlamaIndex Memory](https://docs.llamaindex.ai/en/stable/module_guides/deploying/agents/memory/), [CrewAI Memory](https://docs.crewai.com/concepts/memory), [Cognee](https://www.cognee.ai/), [Cognee MCP](https://www.cognee.ai/blog/cognee-news/introducing-cognee-mcp), [Honcho](https://docs.honcho.dev/), [Honcho architecture](https://docs.honcho.dev/v3/documentation/core-concepts/architecture), [Supermemory API](https://docs.supermemory.ai/memory-api/overview), and [Supermemory GitHub](https://github.com/supermemoryai/supermemory).
- Framework abstractions:
  - Letta/MemGPT: working context plus searchable archival/recall memory.
  - Mem0/OpenMemory/Supermemory: memory-as-API with add/search/update/delete, scopes, metadata, dashboards.
  - Zep/Graphiti/Cognee: episode-to-entity/relation/fact graph with provenance, temporal validity, hybrid retrieval.
  - LangMem/LangGraph: semantic/episodic/procedural memory, namespace/key store, read/write policies, background consolidation.
  - LlamaIndex/CrewAI: framework memory blocks, recency/importance/semantic scoring, short-term flush to long-term memory.
  - Honcho: workspace/peer/session/message model for multi-subject social memory.
- Borrow:
  - Zep/Graphiti temporal facts, fact invalidation, historical retention, provenance, and hybrid retrieval.
  - Letta/MemGPT memory hierarchy: core/current state first; archive/recall as evidence.
  - LangMem classification dimensions: duration, type, scope, update strategy, retrieval, permissions.
  - Mem0/OpenMemory UX: type, tag, visibility, access log, and injection history.
  - Honcho peer/session boundaries for NPC/faction/player memory separation.
  - LlamaIndex FIFO-to-block pattern as analogy for L1/L2/L3 summaries.
  - Cognee provenance/control-plane emphasis.
- Do not bind core to:
  - Hosted/API memory services.
  - Zep/Graphiti as sole truth store.
  - CrewAI/LlamaIndex/LangGraph runtime as engine architecture root.
  - Pure vector memory.
  - LLM summaries as canonical truth.
- TraceOnly reuse:
  - Record observation -> candidate memory -> write decision -> retrieval candidate -> prompt lane candidate -> generated use/ignore -> incident/correction.
  - Minimal classifications: current_state, episode, claim, validated_fact, summary, relationship_delta, commitment, rumor, reflection.
  - Minimal audit: query, hard filters, candidate source, score, inclusion/rejection reason, token budget, target lane.
  - Minimal gates: visibility, authority, stale/superseded, hidden-info leakage, summary-drift incident.

### Wave 8 Agent 45 - Prompt Placement / Context Lanes
- Core conclusion: prompt placement is memory mechanism, not formatting. Tavern-like systems make memory triggerable, orderable, budgeted, and inspectable; Tianming should explicitly lane memory rather than mixing hard rules, state, summaries, evidence, and style instructions together.
- Key references: [NovelAI Lorebook](https://docs.novelai.net/en/text/lorebook/), [SillyTavern World Info](https://docs.sillytavern.app/usage/core-concepts/worldinfo/), [SillyTavern Data Bank](https://docs.sillytavern.app/usage/core-concepts/data-bank/), [SillyTavern Chat Vectorization](https://docs.sillytavern.app/extensions/chat-vectorization/), [AI Dungeon Memory System](https://help.aidungeon.com/faq/the-memory-system), [LangChain short-term memory](https://docs.langchain.com/oss/python/langchain/short-term-memory), [LangChain LongContextReorder](https://api.python.langchain.com/en/latest/community/document_transformers/langchain_community.document_transformers.long_context_reorder.LongContextReorder.html), and [Lost in the Middle](https://arxiv.org/abs/2307.03172).
- Suggested 32k-context budget discipline:
  - Existing local budget logic uses roughly 75% prompt budget, about 24k tokens.
  - Observed current single-turn input is around 8.5k-9.5k tokens, with `tp1` having expanded to 25k in prior audit.
  - Main reasoning prompts should have a hard target around 16k-18k, leaving room for provider differences, tool/schema payload, retries, and output.
- Proposed lanes:
  - `L0_system_contract`: output format, safety, no fabrication, schema core, 900-1400 tokens.
  - `L1_world_truth`: current hard state, 2500-3500 tokens.
  - `L2_active_law_commitment`: continuing edicts, commitments, policies, unfinished tasks, 1200-1800.
  - `L3_actor_scope_visibility`: current subcall visibility/scope, 500-900.
  - `L4_current_turn_input`: player edict/memorial/current action, 1500-2500.
  - `L5_recent_state_delta`: recent 1-3 turn structured changes, 1200-2000.
  - `L6_retrieved_evidence`: FTS/RAG/graph evidence with source/turn/confidence, 1800-3000.
  - `L7_actor_memory`: NPC/faction relationships, grievances, cognition, private memories after scope filtering, 1200-2200.
  - `L8_narrative_threads`: foreshadowing, crisis branches, story arcs, historical recap, 1000-1800.
  - `L9_style_tone`: style/register, 300-700.
  - `L10_debug_trace`: traceOnly metadata, 0 actual injected tokens.
- Injection order:
  - Stable `L0` and compact `L1` near the system/front.
  - `L4` current turn input early so old memory does not bury current task.
  - Sacrificial middle for lower-authority summaries and narrative threads.
  - Sandwich relevant evidence: top 1-2 near current input, top 3-4 near final task instruction, low-relevance items in middle or dropped.
  - Put `L2` active commitments and final "use evidence / abstain if no evidence" instruction near the end to resist Lost-in-the-Middle.
- Current code anchors identified by the agent:
  - `web/tm-endturn-prompt.js` around prompt `sysP/tp` composition, hard constraints, shared prefixes, and truncation.
  - `web/tm-endturn-ai.js` subcall order metadata around `sc0/sc1q/sc05/sc1/sc1b/sc1c/sc2/sc25/sc28`.
  - `web/tm-ai-infra.js` `TokenUsageTracker` and `checkPromptTokenBudget`.
  - `main-impl.js` turn-data persistence into `context.json` and `ai-results.json`.
- traceOnly signals:
  - `lane_manifest`: authority, limit, used tokens, item list, dropped item and reason.
  - `prompt_diff`: old vs lane prompt char/token counts, repetition, movement.
  - `pollution_flags`: low-authority summary overriding hard state, hidden scope leak, AI summary as fact, stale fact without supersede.
  - `budget_pressure`: which lane squeezed which other lane.
  - `lost_middle_risk`: high-authority item in 35%-65% prompt region.
  - `cache_churn`: dynamic lane entering stable system prefix.
  - `used_signal`: generated answer cites/uses injected evidence id/turn.

### Wave 8 Agent 47 - Current Tianming TraceOnly Hook Exploration
- Core conclusion: Tianming already has usable AI subcall IDs, recall sources, token diagnostics, memory tables, anchors, semantic recall, and turn-data persistence. traceOnly can attach to existing paths without changing generation behavior.
- Key files and responsibilities:
  - `web/tm-endturn-ai.js`: endturn AI runtime; `_callEndturnAI` is the main subcall exit; `_subcallMeta` defines subcalls; SC_RECALL logic lives here.
  - `web/tm-endturn-ai.js` SC_RECALL path starts from `sc0.memoryQueries`, passes through `RecallGate.shouldRecall`, gathers NPC memory, chronicle, shiji, foreshadow, semantic vector hits, then scores/sorts.
  - `web/tm-endturn-ai.js` recall injection emits `<recalled-memories>` with hit metadata such as source/character/turn/importance/status/score/text.
  - `web/tm-endturn-prompt.js`: endturn prompt builder for `sysP`, actor scope, scenario reference, shared constraints, and `ctx.prompt`.
  - `web/tm-prompt-composer.js`: shared prompt composer helpers.
  - `web/tm-recall-gate.js`: SC_RECALL throttling gate.
  - `web/tm-semantic-recall.js`: local semantic recall indexing shiji, chronicle, foreshadows, and event history.
  - `web/tm-memory-tables.js`: 12-table structured memory system, `GM._memTables`, injection and AI ops.
  - `web/tm-memory-adapter.js`: adapter around memory tables.
  - `web/tm-memory-anchors.js`: anchors, execution constraints, memory layers, compression fallback.
  - `web/tm-ai-infra.js`: AI infra diagnostics, `TokenUsageTracker`, `recordAIDiagnostic`, `recordMemoryDiagnostic`.
  - `web/tm-mechanics.js`: `NpcMemorySystem`.
  - `main-impl.js`: turn-data persistence for `context.json`, `player-input.json`, `ai-results.json`, and `var-changes.json`.
  - `web/tm-save-lifecycle.js`: save/restore of AI memory layers and anchors.
- Reusable identifiers:
  - Subcall ids: `sc0`, `sc1q`, `sc05`, `sc1`, `sc1b`, `sc1c`, `sc1d`, `sc15`, `sc16`, `sc17`, `sc18`, `sc_audit`, `sc2*`, `sc25*`, `sc27*`, `sc28`.
  - Token diagnostics keyed by `opts.id`.
  - Turn result containers under `GM._turnAiResults`.
  - Recall hit sources: `npc`, `chronicle`, `shiji`, `foreshadow`, `vector`.
  - Semantic index item ids such as `sj_*`, `ch_*`, `fs_*`, `eh_*`, though search currently drops item id in returned hits.
  - Memory table codes, table cell history, and memory anchor ids.
  - `sc1q` prompt fields such as `source_type/source_conv_id`.
- Minimal traceOnly insertion points:
  - Initialize `GM._turnAiResults.memoryTrace/traceId` each turn.
  - Wrap `_callEndturnAI` to record subcall id, label, model/provider, prompt hash, response hash, token usage, latency, parse repair, and errors.
  - Around SC_RECALL record gate decision, query, candidate counts by source, score components, top hits, skip/error reasons.
  - In semantic recall build/search, preserve semantic item id/source/turn/sim/threshold/topK in trace sidecar.
  - At `<recalled-memories>` injection record lane, source distribution, length/hash, injected hit ids.
  - At prompt assembly record MemTables injection, future constraints, consolidated memory, prompt length/hash.
  - At memory table ops record source, sheet, code/row index, actor, success/failure.
  - Persist via `GM._turnAiResults.memoryTrace` so it lands naturally in `ai-results.json`.
- Risks:
  - Existing diagnostics logs have caps and some save lifecycle exclusions; trace should persist in turn results, not only diagnostics.
  - Raw prompts/recall text can include hidden information; store hashes, lengths, ids, sources, and safe previews by default.
  - SemanticRecall search should expose internal item id for trace completeness.
  - RecallGate default-off can create high trace volume.
  - Not all AI calls go through `_callEndturnAI`; broader coverage may need `callAI/callAIMessages`.
  - Table `rowIdx` can drift; trace should prefer sheet key + code.
