# tax-atomic redistribute prep (R10·Claude·非阻塞 prep)

date·2026-05-04 · status·**non-destructive prep·待 R9 close (Codex corruption merge done) → 互审 → R10 启**

## 0·背景

`tm-tax-atomic.js` (674 行·原 `tm-phase-h-final.js`) 是 grab-bag dump·15+ unrelated areas (R12 PATCH_CLASSIFICATION §H)。R10 任务·**redistribute §A-§Q 各内容到对应 area·delete tax-atomic·net -1 文件**·

按 pair-mode schedule R10·
- **Claude 半**·§A-§H (~340 行·8 sections)
- **Codex 半**·§I-§Q (~340 行·9 sections)

## 1·§A-§H 详细映射·**Claude 这半的目标文件 + 内容 + 风险**

### §A · 19 原子税种 ATOMIC_TAX_TYPES_19 (L37-77·~40 行)

| 项 | 值 |
|---|---|
| 内容 | `var ATOMIC_TAX_TYPES_19 = {19 项税·tianfu/dingshui/.../zajuan}` + `function enableTaxesByDynasty(G)` |
| **目标文件** | `tm-fiscal-engine.js` (R3 done·F6 cascade + fixed-expense·1438 行) |
| 注入点 | top-level vars 段·`enableTaxesByDynasty` 入 `Sources` 旁 |
| 调用方 | `tm-game-loop.js` L287 `PhaseH.init(scriptData)` 现在调 `enableTaxesByDynasty`·迁移后改为 `FiscalEngine.enableTaxesByDynasty(scriptData)` |
| 风险 | low·纯数据 + 1 函数·无 LAYERED |

### §B · 纸币 25 条 PAPER_DATA_25 + 状态/崩溃 (L79-153·~75 行)

| 项 | 值 |
|---|---|
| 内容 | `var PAPER_DATA_25 = [25 项]` + `function _updatePaperState(G, mr)` + `function _checkPaperCollapse(G)` |
| **目标文件** | `tm-economy-engine.js` (R3 done·F7·5 IIFE 合·2738 行·有 CurrencyEngine sub-system) |
| 注入点 | CurrencyEngine IIFE 内·与 `coins.paper` 数据并列 |
| 调用方 | tax-atomic.tick L627 `_updatePaperState(G, mr)`·迁移后入 EconomyEngine.tick (R3 done) 或 SettlementPipeline.register('paper-state', ...) |
| 风险 | mid·_updatePaperState 涉及 `_adjAuthority` global 调用·`EventBus.emit` |

### §C · _updateGrainPrice 市场供需 (L155-190·~36 行)

| 项 | 值 |
|---|---|
| 内容 | `function _updateGrainPrice(G, mr)`·按朝代基价 × 供需比 × 季节 × 天灾 |
| **目标文件** | `tm-economy-engine.js`·CurrencyEngine sub (与 PAPER_DATA_25 同) 或独立 sub |
| 注入点 | CurrencyEngine 旁 |
| 调用方 | tax-atomic.tick L628 → 迁入 EconomyEngine.tick 或 SettlementPipeline |
| 风险 | low·纯计算·无副作用 |

### §D · _ensureRegionFiscal 四层递归 (L192-208·~17 行)

| 项 | 值 |
|---|---|
| 内容 | `function _ensureRegionFiscal(region, parentRegion)`·递归确保 fiscal 节点·父≥子之和 |
| **目标文件** | `tm-fiscal-engine.js` (含 cascade·已有 region tree 处理) |
| 注入点 | top-level helper·与 cascade 同段 |
| 调用方 | tax-atomic.init L642 forEach regions → 迁入 FiscalEngine.init / cascade init |
| 风险 | low·纯递归 |

### §E · splitTaxByAllocation (L210-227·~18 行)

| 项 | 值 |
|---|---|
| 内容 | `function splitTaxByAllocation(tax, amount, allocationMode)`·4 种 mode (tang_three/qiyun_cunliu/song_cash/equal) |
| **目标文件** | `tm-fiscal-engine.js` (税分账核心) |
| 注入点 | Sources 旁·与税收相关 |
| 调用方 | global.PhaseH.splitTaxByAllocation·迁后 export 到 FiscalEngine |
| 风险 | low·纯计算 |

### §F · EXPENDITURE_EFFECTS_14 + executeLocalAction (L229-277·~49 行)

| 项 | 值 |
|---|---|
| 内容 | `var EXPENDITURE_EFFECTS_14 = {14 项 localActions}` + `function executeLocalAction(regionId, actionType, scale)`·14 项地方支出效果 (灾赈/水利/驿路/守备/教育/普查/etc.) |
| **目标文件** | `tm-fiscal-engine.js` (与 fixed-expense 同域·R3 F6 done) |
| 注入点 | fixed-expense 旁 |
| 调用方 | global.PhaseH.executeLocalAction·迁后 export 到 FiscalEngine·callers 改 `FiscalEngine.executeLocalAction(...)` |
| 风险 | mid·涉及 `_adjAuthority` global·G.minxin/huangwei mutation |

### §G · _tickTransferOrders + createTransferOrder (L279-317·~39 行)

| 项 | 值 |
|---|---|
| 内容 | `function _tickTransferOrders(ctx, mr)` + `function createTransferOrder(from, toRegion, amount)`·调拨订单生命周期 |
| **目标文件** | `tm-fiscal-engine.js` (transfer 是 fiscal 域) 或 `tm-economy-engine.js` (EconomyLinkage IIFE) |
| 注入点 | 待 audit·若 cascade 已处理 transfer·入 fiscal·否则 economy-linkage |
| 调用方 | tax-atomic.tick L629 _tickTransferOrders·迁后入 FiscalEngine.tick / SettlementPipeline.register |
| 风险 | mid·`G._transferOrders` global state·跨 region budget 调拨 |

### §H · FEUDAL_HOLDING_TYPES + _tickFeudalHoldings (L319-351·~33 行)

| 项 | 值 |
|---|---|
| 内容 | `var FEUDAL_HOLDING_TYPES = {5 类·imperial_clan/warlord/tribal_federation/tributary_state/jimi_prefecture}` + `function _tickFeudalHoldings(ctx, mr)`·封建分封类型 + tick |
| **目标文件** | `tm-feudal.js` (R5 audit done·2656 行·封建+军事附属域) |
| 注入点 | top-level vars + functions·与 AUTONOMY_TYPES 段并列 |
| 调用方 | tax-atomic.tick L630 _tickFeudalHoldings·迁后入 SettlementPipeline.register('feudal-holdings', ...) 或 tm-feudal 自有 tick |
| 风险 | mid·tm-feudal 已有 5 sub-system IIFE·新加可能影响审计·建议独立 §N 章节 |

## 2·R10 §A-§H 总 plan (Claude·~6-10h)

### Phase 1·prep (本 doc·已 done)
- 详细映射各 section → 目标文件
- 风险评估
- 调用方梳理

### Phase 2·destructive (R10 启时)

按 8 个 sub-slice (每 1 section 1 slice)·**每 slice 完跑 verify-all 35/35**·

| Sub-slice | 内容 | ETA | 完成验证 |
|---|---|---|---|
| R10a | §A → tm-fiscal-engine | 30 min | verify-all 35/35 + tax-atomic.js 删 §A 段 |
| R10b | §B → tm-economy-engine.CurrencyEngine | 1 h | verify-all 35/35 |
| R10c | §C → tm-economy-engine.CurrencyEngine | 30 min | verify-all 35/35 |
| R10d | §D → tm-fiscal-engine | 30 min | verify-all 35/35 |
| R10e | §E → tm-fiscal-engine | 30 min | verify-all 35/35 |
| R10f | §F → tm-fiscal-engine | 1 h | verify-all 35/35 |
| R10g | §G → tm-fiscal-engine | 1 h | verify-all 35/35 |
| R10h | §H → tm-feudal | 1 h | verify-all 35/35 |
| **Phase 3** | tax-atomic.js 全 §A-§H 段已迁·剩 §I-§Q (Codex)·**两侧并行** | - | - |

### Phase 4·collapse (R10 close 时·两侧都迁完后)

- delete `tm-tax-atomic.js`
- update `tm-endturn-systems.js` L209·改 `PhaseH.tick(...)` 为 `FiscalEngine.tick(...)` + `EconomyEngine.tick(...)` + `Feudal.tick(...)` 等 (按已迁去向)
- update `tm-game-loop.js` L287·改 `PhaseH.init(...)` 为各 area's init
- update `index.html`·删 tax-atomic script tag
- 最终 verify-all 35/35
- net·**1 文件 → 0 (-1 文件)** + 8 area files 各有微增

## 3·风险综合评估

| 风险 | 应对 |
|---|---|
| `global.PhaseH` namespace 解·callers 必须 update | grep PhaseH callers·已知·tm-endturn-systems L209 + tm-game-loop L287·两点可控 |
| 多个目标文件混合改·一旦 fail 难定位 | sub-slice·每 1 section 1 slice·verify-all 35/35 验证后再下一 section |
| §F executeLocalAction 跨 _adjAuthority·multi-side effect | 移植后跑全 smoke·特别注意 official-scenario-smoke + render-smoke |
| §H _tickFeudalHoldings 入 tm-feudal·tm-feudal 已 2656 行·继续 grow | 独立 §N 章节·头注同步 update |
| `splitTaxByAllocation` 等 utility·有无外部 callers | grep PhaseH.splitTaxByAllocation 等 → 全无·只 PhaseH.tick / PhaseH.init 用·安全 |

## 4·依赖

R10 启动条件·
- [x] R8 baseline (177 assertions·done)
- [x] Claude R9 (guoku merge·done)
- [ ] **Codex R9 (corruption merge done)**·待
- [ ] R9 互审 done

R10 启动后·
- Claude 启 R10a-h (8 sub-slice·6-10h)·**两侧并行**
- Codex 启 R10i-q (9 sub-slice·6-10h)
- 完成 Phase 4·delete tax-atomic·两侧互审

## 5·current

- **R10 prep done** (本 doc·~150 行)
- ~~等 Codex R9 corruption merge done + R9 互审~~ → R10 启 → **R10 done (2026-05-04)**

## 6·R10 实际执行 (closure log·2026-05-04)

| owner | 内容 | 结果 |
|---|---|---|
| Claude | §A-§H 8 sub-slice (R10a-h)·verify-all 35/35 × 8 | ✓ |
| Codex | §I-§Q 9 area·verify-all 35/35 | ✓ |
| 互审 | Codex review §A-§H·Claude review §I-§Q | PASS |
| collapse | Claude·delete tax-atomic + 改 endturn-systems L209 + game-loop L287 + index.html + var-drawers 2 callers | ✓ |
| 最终 | verify-all 35/35·**177 baseline assertions 全保**·net -1 file·Phase 3 ~95% | ✓ |

namespace 落地·
- `FiscalEngine` (新建·R10a) — §A·D·E·F·G
- `CurrencyEngine` (extend) — §B·C
- `FeudalCore` (新建·R10h) — §H
- `PlayerCore` (Codex 新建) — §I
- `EconomyCore` (Codex 新建) — §J
- `MechanicsCore` (Codex 新建) — §K·L
- `AuthorityEngines` (Codex extend) — §M·N·O
- `EdictComplete` (Codex extend) — §P
- §Q (orchestrator) — collapsed into 2 callers (tm-endturn-systems L209·tm-game-loop L287)

— end of tax-atomic-redistribute-prep.md
