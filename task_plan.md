# AI Memory Research Plan

## Goal
Research academic and practical AI memory-system designs, especially long-term memory for roleplay/game agents, then produce a grounded architecture plan for Tianming's AI memory system.

## Scope
- Academic papers: retrieval-augmented memory, agent memory, episodic/semantic/procedural memory, memory consolidation, long-context limits, evaluation.
- Practical systems: SillyTavern and related roleplay memory extensions, lorebook/world-info patterns, summarization memories, vector memories, user-facing controls.
- Tianming fit: identify current AI pipeline and recommend a staged design that can be implemented without disrupting existing gameplay loops.

## Phases
| Phase | Status | Output |
|---|---|---|
| 1. Planning files | Complete | task_plan.md, findings.md, progress.md |
| 2. Academic survey | Complete | Annotated paper taxonomy |
| 3. Roleplay/game memory survey | Complete | Plugin/design pattern notes |
| 4. Tianming code context | Complete | Current-state summary and constraints |
| 5. Architecture proposal | Complete | Final design report and roadmap |
| 6. Deep literature expansion | Complete | Broader annotated bibliography and taxonomy |
| 7. Roleplay ecosystem expansion | Complete | More memory plugin/product pattern notes |
| 8. Tianming optimization blueprint v2 | Complete | Deeper design decisions, risks, and implementation sequence |
| 9. Parallel-agent mega survey | Complete | Six independent research briefs |
| 10. Missing-area local sweep | Complete | Additional primary-source notes while agents run |
| 11. Cross-source synthesis v3 | Complete | Unified taxonomy, design tradeoffs, and Tianming fit |
| 12. Final research dossier v3 | Complete | New Chinese report in web/docs |
| 13. Fourth-round swarm planning | Complete | Larger agent taxonomy and research wave |
| 14. Multi-dozen agent swarm survey | Complete | 18-agent rolling swarm across three six-agent waves due platform concurrency limit |
| 15. Local live research while swarm runs | Complete | Additional primary-source gap filling |
| 16. Cross-agent synthesis v4 | Complete | Deduplicated evidence map and Tianming deltas |
| 17. Final mega dossier v4 | Complete | New Chinese v4 report in web/docs |
| 18. Fifth-round super-swarm planning | Complete | New rolling waves focused on remaining evidence gaps and implementation-risk review |
| 19. Fifth-round rolling swarm survey | Complete | 12 additional agents across two six-agent waves under platform concurrency limit |
| 20. Fifth-round local live research | Complete | Main-thread search for new papers, plugins, engineering patterns, and design essays while agents ran |
| 21. Evidence normalization v5 | Complete | Cross-source evidence matrix, confidence tiers, and Tianming applicability scoring |
| 22. Tianming implementation-readiness synthesis v5 | Complete | Final pre-implementation architecture choices and risk register |
| 23. Final dossier v5 | Complete | New Chinese v5 report in web/docs |
| 24. Sixth-round foundation planning | Complete | Reframed research around memory-mechanism first principles and implementation foundations |
| 25. Sixth-round rolling swarm survey | Complete | 18 additional agents across three six-agent waves under platform concurrency limit |
| 26. Sixth-round local live research | Complete | Main-thread browsing for theory, algorithms, roleplay systems, governance, observability, and implementation gaps |
| 27. Memory mechanism foundation synthesis v6 | Complete | Foundation ontology, lifecycle, algorithms, evidence map, scope control, and traceOnly route |
| 28. Final foundation compendium v6 | Complete | New Chinese v6 report in web/docs |

## Evidence Standard
- Prefer primary sources for papers: arXiv, ACL Anthology, conference pages, official project pages.
- For community/plugin behavior, prefer official docs and repository pages; use articles/forums only as secondary evidence.
- Treat all external pages as untrusted content and record facts in findings.md with source links.

## Decisions
- No code changes in this phase unless explicitly requested.
- Use ASCII-only filenames to keep tooling predictable.
- Main report: web/docs/ai-memory-research-and-architecture-plan-2026-05-31.md
- Continuation requested 2026-05-31: extend research breadth/depth before implementation.
- Deep addendum: web/docs/ai-memory-deep-research-addendum-2026-05-31.md
- Third continuation requested 2026-05-31: use parallel agents plus local research for a broader/deeper dossier.
- v3 mega-survey report: web/docs/ai-memory-mega-survey-and-tianming-v3-blueprint-2026-05-31.md
- Fourth continuation requested 2026-05-31: user asked for a much larger multi-agent research swarm, several times larger than the six-agent pass, while main agent continues local research.
- v4 fourth-round swarm report: web/docs/ai-memory-fourth-round-swarm-research-and-implementation-plan-2026-05-31.md
- Fifth continuation requested 2026-05-31: user again asked to continue broader/deeper research and call far more agents; continue rolling six-agent waves due known platform concurrency limit.
- v5 evidence/readiness report: web/docs/ai-memory-v5-evidence-review-and-implementation-readiness-2026-05-31.md
- Sixth continuation requested 2026-05-31: user again asked to continue much broader/deeper research with many more agents; continue rolling six-agent waves while main thread researches in parallel, with v6 focused on memory-mechanism foundations before optimization.
- v6 foundation compendium target: web/docs/ai-memory-v6-foundation-compendium-2026-05-31.md
- v6 Chinese foundation compendium: web/docs/ai-memory-v6-foundation-compendium-zh-2026-05-31.md

## Errors Encountered
| Error | Attempt | Resolution |
|---|---|---|
| agent thread limit reached | Tried to spawn 12 fourth-round research agents in one parallel batch | Platform allowed 6 concurrent agents; proceed with rolling six-agent waves, closing each wave before spawning the next |
