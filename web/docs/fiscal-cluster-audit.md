# fiscal cluster F1 audit (Phase 3 third slice·Claude own)

date·2026-05-03 · status·**F1 audit done·待 Codex/user confirm sub-slice 启**

## 0·总览·22 文件·~13,847 行

按 architecture-map.md §17·`tm-fiscal-* + tm-economy-* + tm-currency-* + tm-corruption-* + tm-guoku-* + tm-neitang-* + tm-env-capacity-*`·

**全 top-level IIFE wrap (function(global) {...})·rename safe·split 时小心 IIFE 边界**·

## 1·22 文件 inventory + LAYERED 分类

| 文件 | 行 | 性质 | 分类 | 处理 |
|---|---|---|---|---|
| tm-corruption-engine | 1024 | 腐败核心 (calcSources / applyConsequences / updatePerceived / tick) | active engine | 留 |
| **tm-corruption-p2** | 693 | MIXED (APPEND + OVERRIDE engine.tick·v2) | **LAYERED** (R12 评估) | **deferred·30h**·R12 已 ACCEPTED |
| **tm-corruption-p4** | 560 | LAYERED 终端 (OVERRIDE engine + p2 tick·v3 最终) | **LAYERED** | **deferred·30h** |
| tm-guoku-engine | 1018 | 帑廪核心 | active engine | 留 |
| tm-guoku-panel | 1147 | 帑廪 panel UI | active | 留 |
| **tm-guoku-p2** | 332 | P0 补完 (民心/皇权/皇威/帑廪→民心反馈) | **LAYERED 5 层链第 1** | **deferred** R116c |
| **tm-guoku-p4** | 440 | P1 补完 (改革/税种/单位/物价/AI诏令/铸币) | **LAYERED 5 层链第 2** | **deferred** |
| **tm-guoku-p5** | 344 | LAYERED 5 层链第 4·OVERRIDE engine.tick | **ACCEPTED LAYERING·暂不合并** R116c | **deferred** |
| **tm-guoku-p6** | 329 | LAYERED 5 层链终端·OVERRIDE engine.tick 终版 | **ACCEPTED LAYERING·暂不合并** R116c | **deferred** |
| tm-neitang-engine | 721 | 内帑核心 | active engine | 留 |
| tm-neitang-panel | 491 | 内帑 panel UI | active | 留 |
| **tm-neitang-p2** | 500 | S/A 级补完·**APPEND only·无 OVERRIDE** | **APPEND·SAFE** | **F2·inline 进 engine·delete** |
| tm-fiscal-cascade | 943 | 税收级联自然结算 (CascadeTax.collect/tick) | active engine | 留 (或 F5 合) |
| tm-fiscal-ui | 585 | 财政 UI | active | 留 |
| tm-fiscal-fixed-expense | 519 | 固定支出 (俸禄/军饷/宫廷·FixedExpense) | active engine | 留 (或 F5 合) |
| ~~tm-tax-atomic~~ | ~~680~~ → **0** | **R10 (2026-05-04)·§A-§Q 全 16 area redistribute done·file deleted** (§A·D·E·F·G → FiscalEngine·§B·C → CurrencyEngine·§H → FeudalCore·§I → PlayerCore·§J → EconomyCore·§K·L → MechanicsCore·§M·N·O → AuthorityEngines·§P → EdictComplete·§Q orchestrator collapsed into 2 callers) | **R10 done·file deleted** | net -1 file |
| tm-economy | 725 | 经济 + 继承 (R122 拆) | active | 留 (或 F6 合) |
| tm-economy-linkage | 464 | 经济四子系统联动层 | active | 留 (或 F6 合) |
| tm-economy-gap-fill | 839 | 经济补完 12 项 | active | 留 (或 F6 合) |
| tm-currency-engine | 790 | 货币 engine | active | 留 (或 F6 合) |
| tm-currency-unit | 129 | 货币单位 | active | 留 (或 F6 合) |
| tm-env-capacity-engine | 574 | 环境容量 | active | 留 (或 F6 合) |

**关键统计**·

- **5 文件 ACCEPTED LAYERING·deferred** (corruption-p2/p4·guoku-p2/p4/p5/p6·实际 6 文件 deferred)
- **1 文件 SAFE inline** (neitang-p2·APPEND only)
- **1 文件 命名错误** (tax-atomic content = phase-h-final)
- **15 active engine / panel / ui** (留·或考虑 cluster merge 但需 audit)

## 2·sub-slice 拆 plan

| sub | 内容 | 风险 | ETA | 状态 |
|---|---|---|---|---|
| **F2·neitang-p2 inline** | 500 行 APPEND → engine·delete p2 | low | 1-2h | **✓ done 2026-05-03** (engine 721→1213) |
| F3·tax-atomic head note fix | grab-bag 15+ areas·R12 SELF rename·真 redistribute 留 patches slice | mid | 30 min | **✓ done 2026-05-03** (head note only·真 redistribute deferred) |
| F4·corruption inline (p2+p4 → engine) | LAYERED OVERRIDE chain·30h | **deferred** | 30h | **R12 ACCEPTED·暂不合并** |
| F5·guoku inline (p2/p4/p5/p6 → engine) | LAYERED 5 层链·暂不合并 | **deferred** | 50h+ | **R116c ACCEPTED·暂不合并** |
| **F6·fiscal cascade + fixed-expense → fiscal-engine** | 2 active engine merge·rename | mid | 1-2h | **✓ done 2026-05-03** (cascade 943 + fixed-expense 519 → fiscal-engine 1438·-1 文件) |
| **F7·economy 5 IIFE → 1** (linkage+gap-fill+currency-engine+currency-unit+env-capacity → economy-engine·tm-economy.js 留 top-level) | high | 1 round | **✓ done 2026-05-03** (5 → 1 economy-engine 2738 行·-4 文件) |

## 3·推荐启 F2·neitang-p2 inline

按 user mandate "保守拆分·一刀只做一件事"·**F2 是 fiscal cluster 唯一明确 SAFE 的 sub-slice**·

### F2 plan

| Step | 内容 |
|---|---|
| 1 | backup tm-neitang-p2.js + tm-neitang-engine.js |
| 2 | Read tm-neitang-p2.js 全 500 行·提取 IIFE 内容 |
| 3 | append 到 tm-neitang-engine.js (在 engine IIFE 内·或新 IIFE 块) |
| 4 | delete tm-neitang-p2.js |
| 5 | update index.html·remove tm-neitang-p2.js script tag |
| 6 | verify-all 必过·**关注 fiscal/guoku/neitang 相关 smoke** |

### F2 风险

| 风险 | 应对 |
|---|---|
| neitang-p2 内 IIFE inline 进 engine IIFE·变量名冲突 | 检查冲突·重命名·或保 separate IIFE 块 |
| neitang-p2 调 engine method (但被 inline 后变 same scope) | 行为不变·but verify smoke |
| index load 顺序·原是 engine 先·p2 后·**inline 后无 issue** | OK |

## 4·LAYERED 6 文件 deferred 理由 (R19 / R116c 文档)

按 head note·

- tm-corruption-p4·"⚠ 补丁分类（2026-04-24 R12 评估）：LAYERED（叠加链终端）·合并指引见 PATCH_CLASSIFICATION.md · Corruption 段（预计工时 30h）"
- tm-guoku-p5·"⚠ 状态（R116c · 2026-04-24）：**ACCEPTED LAYERING · 暂不合并**·guoku p2/p4/p5/p6 是 R19 明确记录的 5 层叠加链（tick 依次覆盖 4 次）·合并需为每层 tick 写行为快照测试·再按 R19 策略以 p6 为基础重建·无测试合并 = 回归风险·保留分片是审慎决定。"
- tm-guoku-p6·"⚠ 状态（R116c · 2026-04-24）：**ACCEPTED LAYERING · 暂不合并**·此文件是 5 层叠加链的终端。"

**结论**·**LAYERED 6 文件 (corruption 2 + guoku 4) 必先 5-8 行为快照 smoke·然后才合**·**Phase 3 first slice 范围内不动**·

## 5·current

- 我·F1 audit done·**等 Codex confirm·F2 启 (neitang-p2 inline)**
- 你 (Codex)·若 ack·我启 F2·~1-2h
- 若 你 想 F3 (tax-atomic audit) 先·我可改顺
- LAYERED 6 文件·**单独 slice·必先 smoke**·**非 first slice**

## 6·后续 sub-slice 顺序建议

1. **F2 neitang-p2 inline** (1-2h·SAFE)
2. **F3 tax-atomic audit + rename** (2-3h·content 不符)
3. F6 fiscal trio merge (cascade+fixed-expense+tax-atomic → fiscal-engine·5-8h·mid risk)
4. F7 economy cluster (6 文件 → economy-engine·8-12h·high risk·last)
5. **F4/F5 LAYERED·deferred·必先 5-8 行为快照 smoke·然后合**

— end of fiscal-cluster-audit.md
