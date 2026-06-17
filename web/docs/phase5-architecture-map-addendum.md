# architecture-map.md addendum·Phase 5 close (P6-δ drop-in)

date·2026-05-04 · status·**草稿·P6-δ 时合并入 docs/architecture-map.md**

> 本 addendum 是 Phase 5 close 后对 architecture-map.md 的补充·**P6-δ slice 实施时合并**·非独立文档·
> 合并位置·`docs/architecture-map.md` §3.5 (Phase 4 close 后) 之后·插入新 §3.6·§4·§5·

---

## §3.6 Phase 5 close·24 canonical namespaces (R200-R207·2026-05-04)

> Phase 5 完·**散落 ~1000 globals 收口到 24 canonical TM.X**·R87 stage 1 → stage 2 (alias 留)·Phase 6 退役 alias·

### A·24 ns 终表

| # | namespace | 含义 | round | sub-ns 主要 |
|---|---|---|---|---|
| 1 | `TM.Chaoyi` | 朝议/廷议/御前 | R204 | (与 chaoyi-keju 系统 reconcile·主入口待) |
| 2 | `TM.Wendui` | 问对·1v1 | R204 | (空容器·Phase 7 fill) |
| 3 | `TM.Endturn` | endTurn pipeline | R206 | run·province |
| 4 | `TM.Endturn.AI` | AI 推演 (sub-ns) | R206 | infer (entrypoint·12602 行 ai-infer 黑盒) |
| 5 | `TM.Military` | 军事 | (R200 容器) | (空容器·Phase 7 fill) |
| 6 | `TM.Fiscal` | 财政·R10 redistribute 后聚集 | R203 | engine·cascade (v2)·fixedExpense (v2)·legacy{PhaseH} |
| 7 | `TM.Economy` | 经济·与 Fiscal 交叉但不同 | R203 | core·linkage·currency·currencyUnit·envCapacity·eventBus·gapFill + R10 alias rescue (sum·getDiv·topContributors·triggerSurvey) |
| 8 | `TM.Guoku` | 国库·panel + engine | R203 | engine + R87 panel facade (21 fn) |
| 9 | `TM.Neitang` | 内堂·panel + engine | R203 | engine + R87 panel facade (11 fn) |
| 10 | `TM.Huji` | 户口 | (R87 only) | HujiEngine engine proxy (透传) |
| 11 | `TM.Office` | 官制 | R204 | system (R6 carve)·legacy (4 aiGen 主入口) |
| 12 | `TM.Authority` | 权威·R12c phase-f1 inline | R204 | engines (v1)·complete·legacy{PhaseF1/F4/G1} |
| 13 | `TM.Corruption` | 腐败·R9 p2/p4 merged | R204 | engine (v1·16 keys) |
| 14 | `TM.Keju` | 科举 | R204 | runtime (9 主入口) |
| 15 | `TM.Edict` | 诏令·R12 inline 后 | R202 | parser (v2)·complete (v1)·lifecycle·thresholds (PhaseG3 alias)·legacy{PhaseC} |
| 16 | `TM.NPC` | NPC engine/decision | R201 | engine·interactions·decision·behaviors·personality·legacy |
| 17 | `TM.Char` | 角色 schema/data | R201 | schema·economy·arcs·autogen·historical·ui |
| 18 | `TM.Map` | 地图·R87 MapSystem alias 顶层 | R205 | runtime·interactive·converter·integration·display·recognition |
| 19 | `TM.UI` | UI 公共 | R205 | foundation (P4-β-1)·cheatsheet·help·shizheng·renwu·military·drawers |
| 20 | `TM.Save` | 存档·R87 Storage rename alias | R200 | (R87 顶层 facade·rename alias TM.Storage 留) |
| 21 | `TM.Editor` | 编辑器 | R207 (Codex) | core·crud·ai·forms·domain·schema·map (TBD) |
| 22 | `TM.Memory` | 记忆 | (R200 容器) | (空容器·Phase 7 决定与 Char.historical 是否合) |
| 23 | `TM.Player` | 玩家 | (R200 容器) | (空容器·Phase 7 fill·tm-player-core audit) |
| 24 | `TM.Diagnostics` | errors/perf/pollution/checklist | R200 meta-add | errors·guard·report (P4-β-2 已建) |

### B·legacy (Phase 6 退役决定)

| 名 | 类型 | Phase 6 处理 |
|---|---|---|
| `TM.Lizhi` (R87 22 fn whitelist) | facade·非 24 canonical (Codex Q1) | 推荐**保 R87 顶层 alias 不动**·Phase 7 决定移到 .Office.Lizhi 或 .UI.Lizhi |
| `TM.MapSystem` (R87 17 fn) | rename alias to TM.Map | **退役**·改 3 production call site (game-loop·hongyan-office) |
| `TM.Storage` (R113·12 fn) | rename alias to TM.Save | **退役**·改 1 production call site |
| `TM.GuokuEngine` (R87 engine proxy) | 与 TM.Guoku.engine 同源 | alias 留·双向·Phase 7 看 |
| `TM.HujiEngine` / `TM.ChangeQueue` (R87 engine proxy) | 与 sub-ns 同源 | alias 留·内部 utility |

### C·R200-R207 段在 tm-namespaces.js 内的位置

```
L1-78    head note·@ts-check + 12 字段格式 + R87/R200-R204/R205 段 doc
L79-190  helpers·_buildFacade (R87) / _buildEngineFacade (R87) / _buildWindowRefGroup (P5-β·Codex) / _defineWindowAlias (P5-β·Codex)
L192-275 R87 facade·Economy/MapSystem/Lizhi/Guoku/Neitang/HujiEngine/GuokuEngine/ChangeQueue/Storage 8 个
L277-291 R200 head note·24 canonical 容器解释
L293-317 R200 实施·rename alias (Map/Save) + 14 容器声明
L319-356 R201 P5-β NPC/Char fill (Codex)
L358-385 R202 P5-γ Edict fill·EDICT_TYPES 隔离
L387-450 R203 P5-δ Fiscal/Economy/Guoku/Neitang fill·R10 dead code rescue
L452-510 R204 P5-ε Authority/Office/Keju/Corruption fill (Lizhi 不重建)
L512-540 R205 P5-ζ Map/UI fill (Codex)
L542-560 R206 P5-η Endturn fill (Codex·scope 收窄)
L562-590 R207 P5-θ Editor fill (Codex·TBD)
L592-650 _verify() + TM.namespaces meta + auto-verify (R87)
```

(line numbers approximate·待 P5-θ done 锁定)

---

## §4·alias-then-rename ladder·R87 → P5 → P6

(替换 v0 的 §3 命名异常 P2-3 rename 表头·或新建一节)

### 4.1 R87 stage 1·getter 门面 (Phase 1·完成)

5 whitelist facade·覆盖 ~91 fn·

```js
TM.Economy = _buildFacade('Economy', ECONOMY_FNS);  // 20 fn
TM.MapSystem = _buildFacade('MapSystem', MAP_FNS);   // 17 fn + R106 .open helper
TM.Lizhi = _buildFacade('Lizhi', LIZHI_FNS);          // 22 fn
TM.Guoku = _buildFacade('Guoku', GUOKU_FNS);          // 21 fn
TM.Neitang = _buildFacade('Neitang', NEITANG_FNS);    // 11 fn
```

### 4.2 R200-R207 stage 2·sub-ns 上挂 + alias 留 (Phase 5·完成)

24 canonical 容器全建·sub-ns fill 程度按 cluster 大小决定 (0-7 sub)·R87 facade 顶层留·alias 期保·

### 4.3 Phase 6 stage 3·alias 退役 (next)

| alias | 调用方 | Phase 6 行动 |
|---|---|---|
| `TM.MapSystem` | tm-game-loop:1·tm-hongyan-office:1 inline | 改 `TM.Map.X`·删 alias |
| `TM.Storage` | tm-save-manager (comment only) | 改 `TM.Save.X`·删 alias |
| `window.legacyFn` (HTML inline 主导·412 处) | index.html (~150)·editor.html (~80) | 改 `TM.X.fn()` (~230 处实改·~180 处留 window by design) |
| R87 facade 顶层 (TM.Economy·.Lizhi·.Guoku·.Neitang) | 50+ call site | **保留**·删了等于回退 R87·成本高 |
| sub-ns alias (TM.NPC.engine 等 R201-R207) | sub-ns 是 P5 目的非 alias | **保留** |

---

## §5·Phase 5 round 进度·R 段编号 (替换或扩 §2 Top 30 表)

```
R200·P5-α reconcile·24 ns 容器 (Claude·40/40)
R201·P5-β NPC/Char (Codex·41/41)·6+6 sub-ns·12 历史 wave 不独 facade
R202·P5-γ Edict (Claude·42/42)·EDICT_TYPES 17 详 vs 11 大类强隔离
R203·P5-δ Fiscal/Economy/Guoku/Neitang (Claude·43/43)·17 sub-ns·R10 dead code rescue (-6 行 fiscal-engine·alias 至 CascadeTax)
R204·P5-ε Authority/Office/Keju/Corruption (Claude·44/44)·9 sub-ns·Lizhi 不重建 (legacy·Codex Q1)
R205·P5-ζ Map/UI (Codex·45/45)·6 Map sub-ns + 7 UI sub-ns·R87 顶层 facade 留
R206·P5-η Endturn (Codex·46/46)·scope 收窄·只 entrypoint·ai-infer 12602 行黑盒
R207·P5-θ Editor (Codex·47/47·TBD)·26 文件·HTML inline 主导·sub-ns marker + 主入口
```

---

## §6·Top 30 大文件·Phase 5 后 namespace 映射 (扩 §2)

(在 §2 Top 30 表的 "Phase 行动" 列加最后一行 namespace mapping)

| 行 | 文件 | namespace 映射 (Phase 5 后) |
|---|---|---|
| 12,602 | tm-endturn-ai-infer.js | TM.Endturn.AI.infer (entrypoint only·内部黑盒) |
| 5,379 | (tm-chaoyi-* 4 文件总) | TM.Chaoyi (R204·sub-ns 主入口待) |
| 3,843 | tm-chaoyi-changchao.js | TM.Chaoyi (R204) |
| 3,318 | tm-ai-change-applier.js | (无 P5 ns·utility) |
| 3,209 | tm-keju-runtime.js | TM.Keju.runtime (R204·9 主入口) |
| 3,106 | tm-ai-infra.js | (无 P5 ns·utility) |
| 3,015 | tm-military.js | TM.Military (R200 容器·Phase 7 fill) |
| 2,889 | tm-economy-engine.js | TM.Economy (R203·7 sub-engine) |
| 2,873 | tm-player-core.js | TM.Player (R200 容器·Phase 7) |
| 2,685 | tm-hongyan-office.js | TM.Office.system (R204·alias) |
| 2,656 | tm-feudal.js | (无 P5 ns·R10h §H 已 redistribute 入) |
| 2,352 | tm-office-runtime.js | TM.Office.* (R204·HTML inline 主) |
| 2,304 | tm-map-system.js | TM.Map (R205·R87 facade 顶层留) |
| 2,289 | tm-corruption-engine.js | TM.Corruption.engine (R204·v1) |
| 2,268 | map-recognition.js | TM.Map.recognition (R205·P4-α-1 merged) |
| 2,236 | tm-endturn-province.js | TM.Endturn.province (R206) |
| 2,099 | tm-endturn-render.js | (无 P5 ns·utility·内部) |
| 2,054 | tm-office-editor.js | TM.Office.legacy (R204·4 aiGen) + TM.Editor.* (R207·domain) |
| 2,026 | editor-crud.js | TM.Editor.crud (R207) |
| 2,026 | tm-npc-engine.js | TM.NPC.engine (R201) |
| 1,975 | editor-game-systems.js | TM.Editor.domain (R207) |
| 1,974 | editor-administration.js | TM.Editor.domain (R207) |
| 1,955 | tm-map-system.js (dup·see above) | — |
| 1,915 | tm-patches.js | (无 P5 ns·dump 待清·Phase 7) |
| 1,858 | editor-ai-gen.js | TM.Editor.ai (R207) |
| 1,823 | tm-var-drawers.js | TM.UI.drawers (R205) |
| 1,776 | tm-mechanics-world.js | (无 P5 ns·utility) |
| 1,753 | tm-fiscal-engine.js | TM.Fiscal.engine (R203·R10 main api) |
| 1,606 | tm-office-panel.js | TM.Office.* (R204·HTML inline) |
| 1,516 | tm-endturn-helpers.js | (无 P5 ns·utility) |
| 1,315 | tm-topbar-vars.js | TM.UI.topbar (R205) |
| 1,255 | editor-ai-validate.js | TM.Editor.ai (R207) |

(完整 87 文件 → namespace 映射表见 phase5-prep.md §4·doc 收口)

---

— Claude (architecture-map.md addendum·Phase 5 close·2026-05-04)
