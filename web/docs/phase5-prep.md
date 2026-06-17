# Phase 5 prep·namespace 大迁 audit & plan

> 起草·Claude·2026-05-04 (P4 期间空闲产出·待 Codex ack 后启 Phase 5)
>
> 目的·在 Phase 5 启动前·把 namespace 大迁的范围、阶梯、风险锁清楚·让 Phase 5 不再是开放问题·

---

## 0. TL;DR

- 现状·**1081 unique globals**·5 个 facade (R87) 已门面化 ~91 fn·**~990 待规约**·
- Phase 5 ≠ 把 1010 globals 全 rename·**只规约 public API ~600-750 fn**·内部 helper ~250 留 window·
- 战略·**接续 R87 的 3 阶段**·阶段 1 done (getter 门面)·**阶段 2 = 改定义到 TM.X·留 alias** (Phase 5)·阶段 3 = 删 alias (Phase 6)·
- **24 canonical namespaces** (与 Codex 共识 2026-05-04·target §6.2 18 → 实际 24)·
- 拆 **8 slice·4/4 分工**·Claude·α·γ·δ·ε·Codex·β·ζ·η·θ·总 ~18h·并行 ~9h·
- 时间估算·**1.5 day** (target 5-7 day·因 R87 stage 1 已铺 + prep 已锁 → 大幅压缩)·
- **5 开放问题已全部 closed** (§8)·

---

## 1. 当前 globals 现状 (detect_globals.js·R11e 重扫)

| 类别 | 数 |
|---|---|
| 函数声明 (`function fn() {}`) | 754 |
| `var/let/const X = ...` | 540 |
| `window.X = ...` (显式) | 28 |
| `X = function/class` | 2 |
| **唯一 globals 总数** | **1081** |

**Top 10 外泄文件**·

| 文件 | globals |
|---|---|
| tm-map-system.js | 134 |
| tm-lizhi-panel.js | 111 |
| tm-economy-engine.js | 105 |
| tm-guoku-panel.js | 102 |
| tm-fiscal-engine.js | 81 |
| tm-corruption-engine.js | 68 |
| tm-neitang-panel.js | 62 |
| tm-huji-deep-fill.js | 52 |
| tm-guoku-engine.js | 45 |
| tm-change-queue.js | 42 |

**3 命名冲突 hotspot**·

- `tick`·12+ 文件 (各 engine 都叫 `tick`)·**强烈推荐 namespace deconflict**
- `init`·7+ 文件
- `ov`·3+ 文件 (国库/UI foundation/lizhi panel 共用 mojibake-safe overlay helper)

---

## 2. R87 现有 facade·已铺基础

`tm-namespaces.js` (304 行) 已建·**Phase 5 不是从零·是接 R87 stage 2**·

| facade | 类型 | fn 数 | 来源文件 |
|---|---|---|---|
| `TM.Economy` | whitelist getter | 20 | tm-economy-military.js |
| `TM.MapSystem` | whitelist getter | 17 | tm-map-system.js |
| `TM.Lizhi` | whitelist getter | 22 | tm-lizhi-panel.js |
| `TM.Guoku` | whitelist getter | 21 | tm-guoku-panel.js (panel only·不含 engine) |
| `TM.Neitang` | whitelist getter | 11 | tm-neitang-panel.js (全量) |
| `TM.HujiEngine` | engine proxy | 透传 | window.HujiEngine |
| `TM.GuokuEngine` | engine proxy | 透传 | window.GuokuEngine |
| `TM.ChangeQueue` | engine proxy | 透传 | window.ChangeQueue |
| `TM.Storage` | custom (R113) | 12 | SaveManager + TM_SaveDB |
| `TM.namespaces` | meta | report/verify | self |

**总覆盖·~91 显式 fn·~3 引擎透传·剩 ~990 个 fn 未门面化**·

**R87 的 3 阶段定义** (来自 tm-namespaces.js header)·

```
阶段 1·getter 门面 (current·R87-R143 已做)
阶段 2·原函数定义改为 TM.Xxx.xxx = function(){} ·保留 window 别名 (R87 对 Lizhi 示范 3 处)
阶段 3·移除 window 别名·真减全局数
```

**Phase 5 = 阶段 2·Phase 6 = 阶段 3 (alias 退役)**·target doc §9 与此 align·

---

## 3. 24 canonical namespaces·**已与 Codex 共识 (2026-05-04)**

target-final §6.2 原列 18·Codex 反馈扩到 24 (补 Authority/Corruption/Diagnostics 等独立系统)·`TM.Lizhi` 不入 canonical (legacy facade·Phase 6 后退至 `TM.Office.Lizhi` 或 `TM.UI.Lizhi`)·

| # | namespace | 含义 | 现状 | R87 facade |
|---|---|---|---|---|
| 1 | `TM.Chaoyi` | 朝议/廷议/御前 | **缺·待建** | — |
| 2 | `TM.Wendui` | 问对 | **缺·待建** | — |
| 3 | `TM.Endturn` | endTurn / pipeline | **缺·待建** | — |
| 4 | `TM.Endturn.AI` | AI 推演 (sub-ns) | **缺·待建** | — |
| 5 | `TM.Military` | 军事 | **缺·待建** | — |
| 6 | `TM.Fiscal` | 财政 (R10 后聚) | **缺·待建** | — |
| 7 | `TM.Economy` | 经济 (与 Fiscal 交叉但不同) | R87 done·20 fn | `TM.Economy` |
| 8 | `TM.Guoku` | 国库面板 + engine | R87 done | `TM.Guoku` (panel) + `TM.GuokuEngine` (proxy) |
| 9 | `TM.Neitang` | 内堂 | R87 done·11 fn 全量 | `TM.Neitang` |
| 10 | `TM.Huji` | 户口 | 部分·engine proxy 有 | `TM.HujiEngine` |
| 11 | `TM.Office` | 官制 | **缺·待建** | — |
| 12 | `TM.Authority` | 权威 (独立 engine + AI coupling) | **缺·待建** | — |
| 13 | `TM.Corruption` | 腐败 (engine + state) | **缺·待建** | — |
| 14 | `TM.Keju` | 科举 | **缺·待建** | — |
| 15 | `TM.Edict` | 诏令 (R12 后 EdictParser/EdictComplete) | **缺·待建** | — |
| 16 | `TM.NPC` | NPC engine/decision | **缺·待建** | — |
| 17 | `TM.Char` | 角色 schema/data | **缺·待建** (wave-01..12 已部分 namespace) | — |
| 18 | `TM.Map` | 地图 | R87 done | `TM.MapSystem` (改名为 `TM.Map`·alias 留) |
| 19 | `TM.UI` | UI 公共 (modal/icons/overlay) | 部分·P4-β-1 已 ui-foundation | — |
| 20 | `TM.Save` | 存档 | R87 done (改名自 `TM.Storage`) | `TM.Storage` (alias) |
| 21 | `TM.Editor` | 编辑器 | **缺·待建** | — |
| 22 | `TM.Memory` | 记忆 | **缺·待建** | — |
| 23 | `TM.Player` | 玩家 | **缺·待建** | — |
| 24 | `TM.Diagnostics` | errors/perf/pollution/checklist (P4-β-2 后聚) | **foundation done** | `tm-diagnostics-foundation.js` |

**legacy (Phase 6 退役 / 重新归属)**·

- `TM.Lizhi` (R87 22 fn)·Phase 5 内保 facade·Phase 6 决定移到 `TM.Office.Lizhi` 或 `TM.UI.Lizhi`·
- `TM.MapSystem`·`TM.Storage`·Phase 5 改名 `TM.Map` / `TM.Save`·alias 期保旧名·

**总·24 canonical + 1 legacy + 3 sub-ns·24 个待门面化 (R87 已部分覆盖 7-8 个)**·

---

## 4. 文件 → namespace mapping (top 30 文件审视·按 24 ns 校准)

| 文件 | namespace | 估 globals | 备注 |
|---|---|---|---|
| tm-map-system.js | `TM.Map` | 134 | R87 `TM.MapSystem` rename·alias 留 |
| tm-lizhi-panel.js | `TM.Lizhi` (legacy) | 111 | R87 facade 留·Phase 6 决定移 `TM.Office.Lizhi` |
| tm-economy-engine.js | `TM.Economy` | 105 | R87 facade 留·补全剩余 85 fn |
| tm-guoku-panel.js | `TM.Guoku` | 102 | R87 panel facade 已 21·补 81 |
| tm-fiscal-engine.js | `TM.Fiscal` | 81 | R10 redistribute 后主财政文件·新建 |
| tm-corruption-engine.js | `TM.Corruption` | 68 | 24 ns 新加·新建 |
| tm-neitang-panel.js | `TM.Neitang` | 62 | R87 已 11·补 51 |
| tm-huji-deep-fill.js | `TM.Huji` | 52 | engine proxy 已·补全 panel/deep-fill |
| tm-guoku-engine.js | `TM.Guoku` (engine sub) | 45 | engine proxy 已·与 panel 同 ns 不同 sub |
| tm-change-queue.js | (utility·留 window) | 42 | 不入 24 canonical·内部 helper |
| tm-endturn*.js (~5 file) | `TM.Endturn` + `TM.Endturn.AI` | ~150 | scope 收窄·只 namespace public entrypoints |
| tm-edict-parser.js (R12 后 1100 行) | `TM.Edict` | ~30 | EdictParser/EdictComplete/PhaseC 统一入 |
| tm-authority-engines.js | `TM.Authority` | ~30 | 24 ns 新加·独立 engine |
| tm-chaoyi-keju.js (9454 行) | `TM.Chaoyi` + `TM.Keju` | ~80 | 一文件 2 ns·按 fn 名拆 |
| tm-npc-engine.js | `TM.NPC` | ~25 | clean·P5-β 第一刀 |
| tm-char-*.js (12 wave + 4 schema) | `TM.Char` | ~80 | wave-01..12 已部分 namespace·收口 |
| tm-data-access.js | `TM.DA` (existing·留) | ~30 | 不入 canonical·DA 是 R102 专名·与 24 ns 平行 |
| editor-*.js (多文件) | `TM.Editor.*` | ~80 | sub-namespace cluster |
| map-converter/integration/display | `TM.Map.*` | ~40 | sub-ns 入 TM.Map |
| tm-test-harness.js | `TM.test` (existing) | ~10 | 不入 canonical·测试框架·留独立 |
| tm-diagnostics-foundation.js | `TM.Diagnostics` | ~30 | **P4-β-2 (Codex) done: errors + panel + guard foundation** |
| tm-perf.js / checklist / hooks-tracker / state / diff | `TM.Diagnostics.*` | ~25 | sub-ns 与上同|
| tm-shell-extras.js / topbar-vars / var-drawers* | `TM.UI.*` | ~50 | sub-ns 入 TM.UI |
| tm-dynamic-systems.js (SaveManager) | `TM.Save` | ~20 | R87 `TM.Storage` rename·alias 留 |
| tm-relations / chronicle-tracker / char-arcs | `TM.Char` (sub) 或 `TM.Memory` | ~30 | 待 P5-β audit 时定 |
| tm-mechanics.js / event-system / change-queue | utility (留 window) | ~40 | 不入 canonical |

**剩 ~40 个低 globals 文件 (each <30 globals)**·按 cluster sub-ns·或留 window·

**globals 处理总数估**·

- 入 24 canonical·~600 fn (主要 public API)
- sub-ns·~150 fn
- 留 window (utility)·~250 fn (改不动·不需要 namespace·内部 helper)
- 共 ~1000·与 detect_globals 1081 大致 align (剩 ~80 是 var/const 数据·非 fn)

---

## 5. alias-then-rename 5 步 ladder (per file·R87 stage 2 的实操)

参考 architecture-target-final §6.3 的 6 阶段·适配文件级·

```
Step 1·建 namespace 容器
  TM.Foo = TM.Foo || {};

Step 2·把定义写进 namespace
  TM.Foo.bar = function() { ... };

Step 3·保 window alias (legacy compat)
  window.bar = TM.Foo.bar;
  // 标 deprecation comment·下个 phase 删

Step 4·verify-all·smoke·确认 0 regression
  - 38/38 (or whatever current)
  - encoding-check·markers 不变
  - find-orphans·无 orphan

Step 5·按 cluster commit·一 file 或一 cluster 一 round
  - 每 round 写 audit doc
  - 双向 letter 同步
```

**Phase 6·alias 退役期** (separate phase)·

```
Step 6·grep 调用方·改用 TM.Foo.bar()
Step 7·删 window.bar = ... 行
Step 8·verify-all 确认 0 regression
```

---

## 6. 风险评估

| 风险 | 等级 | 缓解 |
|---|---|---|
| **HTML inline onclick 直接写 `bar()`** | **高** | grep 所有 `onclick=` 与 `setTimeout('xxx')`·必走 alias·不能裸 TM.X 替 |
| **JSON/scenario 字段引用裸 fn 名** | 中 | scenario 不存 fn ref·只存 type key·但 dynamic-systems 有 string→fn lookup·需审 |
| **save migrations 引用旧 fn 名** | 低 | SaveMigrations 是版本化的·不动旧字段 |
| **smoke test 写死 window.X** | 低 | smoke 用 vm context·改 namespace 后 alias 期同时通过 |
| **Codex/Claude 同时改同 file** | 中 | 必须 cluster-wise division·不交叉 |
| **18 namespace 不够覆盖 (Authority/Corruption/Lizhi 没列)** | 中 | 推荐扩到 22-24·或在 target doc §6.2 补充·先与 Codex 同步 |
| **R87 5 facade 与 target 18 命名冲突·覆盖不一致** | 中 | reconcile pass·R87 stage 2 改 facade 时同时整理白名单·而不是各做各 |

---

## 7. Phase 5 拆 8 sub-slices·**4/4 分工 (与 Codex 共识 2026-05-04)**

按 cluster·一 cluster 一 round·verify-all gate 每 round·

| slice | scope | files | 估行 | 估时 | owner |
|---|---|---|---|---|---|
| **P5-α** | reconcile·锁 24 ns 终表·tm-namespaces.js 扩 + 改名 (MapSystem→Map·Storage→Save)·alias 留 | tm-namespaces.js + target doc | ~80 | 1.5h | **Claude** |
| **P5-β** | TM.NPC + TM.Char·wave-01..12 已部分 namespace·补完收口 | tm-npc-engine.js + tm-char-*.js | ~80 | 2h | **Codex** |
| **P5-γ** | TM.Edict·R12 后 EdictParser/EdictComplete/PhaseC 统一入 (R12 我做·熟) | tm-edict-parser.js + tm-edict-*.js | ~50 | 1.5h | **Claude** |
| **P5-δ** | TM.Fiscal + TM.Economy + TM.Guoku + TM.Neitang·R10 我做·熟 | tm-fiscal-*.js + tm-economy-*.js + guoku/neitang panel/engine | ~200 | 3h | **Claude** |
| **P5-ε** | TM.Authority + TM.Office + TM.Keju + TM.Corruption·拆 chaoyi-keju namespace 不拆文件 | tm-chaoyi-*.js + tm-authority-*.js + tm-keju.js + tm-corruption-engine.js + tm-lizhi-panel.js | ~150 | 3h | **Claude** |
| **P5-ζ** | TM.Map (R87 alias) + TM.UI 大类 (P4-β-1 ui-foundation 后续) | map-*.js + tm-ui-*.js + panel files | ~100 | 2h | **Codex** |
| **P5-η** | TM.Endturn·scope 收窄·只 namespace public entrypoints·内部 helper 不动 | tm-endturn*.js (5 files) | ~50 | 2h | **Codex** |
| **P5-θ** | TM.Editor·编辑器整组 sub-ns | editor-*.js (~16 files) | ~60 | 2h | **Codex** |

**owner 平衡·Claude 4 slice (~9h)·Codex 4 slice (~9h)·真 4/4·~9h 并行**·

**Claude 拿这 4 是因为**·熟 R10 Fiscal·熟 R12 Edict·熟 chaoyi (Phase 3 改的)·必做 first 的 P5-α·

**Codex 拿这 4 是因为**·NPC/Char 没改过·Map/UI 接续 P4-β-1·Endturn AI 并联他做过·Editor 独立面 cleanly 与 fiscal/edict 不冲·

**总·~18h·两人并行 ~9h·~1.5 day** (target 5-7 day → 实际压缩)·

**P5-α 必须 first**·因为它锁 namespace 终态表·所有后续 slice 依赖·

---

## 8. 5 开放问题·**已 closed (Codex 2026-05-04 letter)**

| Q | 决议 |
|---|---|
| Q1·18 vs 22-24 ns | **24 canonical** (扩 Authority/Corruption/Diagnostics·Lizhi 不入 canonical 但留 legacy facade) |
| Q2·R87 keep vs rebuild | **keep + reconcile**·TM.Storage→TM.Save·TM.MapSystem→TM.Map·alias 留·Lizhi/Guoku/Neitang 暂保 |
| Q3·alias 期 | **Phase 5 全程保 alias·Phase 6 退役**·跳过 Phase 4 deprecated 标记 (实际未做) |
| Q4·HTML inline onclick | **方案 B**·HTML 不动·留 window alias·Phase 6 才统一 audit + 改·禁止 sed 大替换 |
| Q5·slice 分工 | **4/4 平衡**·Claude·α·γ·δ·ε·Codex·β·ζ·η·θ·见 §7 |

---

## 9. Phase 6 prep teaser (alias 退役)

Phase 6 = 1-2 day·

- grep 所有 `window.fn` / 裸 `fn()` 调用点·confirmed by R143-style audit
- HTML inline onclick·全部替为 `TM.Foo.bar()`·或包成 helper
- 删 alias·verify-all·last 38/38 baseline 锁

target 同时·architecture-map.md v1·module-boundaries.md v1·refactor-playbook.md v1·1 day·

**Phase 6 总工时·~1-2 day**·

---

## 10. 当前 Phase 5 状态

- **Phase 4 进行中** (Codex P4-β-1 done·-3 runtime files·verify-all 38/38)
- **Phase 5 未启**·此 doc 为 prep·待 Phase 4 close 后启
- **R87 stage 1 已铺**·5 facade getter mode·这是 Phase 5 起点而非起点之前

---

— Claude (P4 期间空闲产出·2026-05-04)
