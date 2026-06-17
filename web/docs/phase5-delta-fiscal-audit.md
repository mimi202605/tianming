# Phase 5 P5-δ Fiscal/Economy/Guoku/Neitang Prep Audit

date·2026-05-04 · mode·**read-only prep audit·doc-only·待 P5-α/β/γ 顺序后实施**
owner·Claude (P5-δ·R10 fiscal redistribute 我做·熟)

> 模式·与 phase5-beta-npc-char-audit / phase5-gamma-edict-audit 同·doc-only·
> 范围·**4 canonical namespace 一并填**·因 fiscal/economy/guoku/neitang 跨域耦合·一刀切清·

## 0·背景

P5-δ 是 P5 最大的 slice (estimated 3h)·因·

1. **8 文件·10626 行**·cluster 最大
2. **4 sub-namespace 同时填** (Fiscal·Economy·Guoku·Neitang)
3. **R87 facade reconcile**·Economy/Guoku/Neitang 已有 R87 whitelist·需要扩 + sub-ns
4. **R10 redistribute 后聚集**·fiscal-engine 1753 行 含 §A-§G all redistribute target
5. **tm-fiscal-engine 已部分启 stage 2**·直接写 `global.TM.Economy.sum = ...`·**需要 reconcile**

## 1·Cluster 现状·8 文件·10626 行

| 文件 | 行 | 主导出 | 备注 |
|---|---|---|---|
| `tm-fiscal-engine.js` | **1753** | FiscalEngine (api·12 keys)·CascadeTax·FixedExpense·PhaseH·**TM.Economy 4 fn 直写** | R10 redistribute 后聚集·R12d compat fix |
| `tm-fiscal-ui.js` | 585 | PhaseG4·openYearlyReport·openCarryingCapacityHeatmap | UI·HTML inline callable |
| `tm-economy.js` | **725** | 20 顶层 fn (R87 whitelist 源·原 tm-economy-military·R122 拆) | getTributeRatio·calculateMonthlyIncome 等·**无 IIFE wrap** |
| `tm-economy-engine.js` | **2889** | 7 engine·CurrencyUnit / CurrencyEngine / EnvCapacityEngine / EconomyLinkage / EconomyEventBus / EconomyGapFill / EconomyCore | R10b/c·R7 collapse 入·**多 IIFE 块**·§A-§G |
| `tm-guoku-engine.js` | **1823** | GuokuEngine (30+ keys·R9 5 文件 merged·v1) | R9a/b/c/d inline·p2/p4/p5/p6 全合 |
| `tm-guoku-panel.js` | 1147 | 21 R87 whitelist fn (panel·_guoku_extraTax 等·HTML inline) | 无 top-level export·全 IIFE |
| `tm-neitang-engine.js` | 1213 | NeitangEngine (11 keys) + Phase 3 inline 第二 IIFE | R3 + p2 inline·neicangRules / royalClanPressure |
| `tm-neitang-panel.js` | 491 | 11 R87 whitelist fn (panel·_neitang_transferFromGuoku 等) | 无 top-level export·全 IIFE |

**总·~280-400 显式导出·跨 7 engine objects + 51 R87 whitelist fn + many UI helpers**·

## 2·R87 facade 现状 reconcile

| R87 facade | 类型 | 当前白名单 | 补/扩计划 |
|---|---|---|---|
| `TM.Economy` (20 fn) | whitelist getter | tm-economy.js 20 fn | **reconcile**·Economy 20 留 legacy·新加 sub-ns |
| `TM.Guoku` (21 fn) | whitelist getter | tm-guoku-panel.js 21 fn | **保 + 加 .engine sub** |
| `TM.GuokuEngine` | engine proxy | window.GuokuEngine 透传 | **保·改 alias 到 TM.Guoku.engine** |
| `TM.Neitang` (11 fn) | whitelist getter | tm-neitang-panel.js 11 fn 全量 | **保 + 加 .engine sub** |
| `TM.HujiEngine` | engine proxy | window.HujiEngine | 不在 P5-δ 范围·留下次 (Huji 单独 cluster) |
| `TM.ChangeQueue` | engine proxy | window.ChangeQueue | utility·不入 24 canonical |

## 3·**关键 reconcile 问题**·tm-fiscal-engine 已写入 TM.Economy

**tm-fiscal-engine.js L1746-1751**·

```js
global.TM = global.TM || {};
global.TM.Economy = global.TM.Economy || {};
global.TM.Economy.sum = sumEconomyBase;
global.TM.Economy.getDiv = getDivEconomy;
global.TM.Economy.topContributors = getTopContributors;
global.TM.Economy.triggerSurvey = triggerSurvey;
```

**问题**·这 4 fn 是 **fiscal 域** (CascadeTax 内部 helper)·写入 TM.Economy 是错域·

**P5-δ 改正·两选项**·

| 选项 | 内容 | 评估 |
|---|---|---|
| **A** (推荐) | 改 fiscal-engine L1746-1751·写 TM.Fiscal.cascade·留 TM.Economy 旧 alias 兼容 | 域纯·alias 期保 legacy code |
| B | 留 TM.Economy 4 fn·sub-ns flat (TM.Economy.fiscal = {...}) | 持续混域·不推荐 |

P5-δ 实施 A·

```js
// 改 tm-fiscal-engine.js L1746-1751·
global.TM = global.TM || {};
global.TM.Fiscal = global.TM.Fiscal || {};
global.TM.Fiscal.cascade = global.TM.Fiscal.cascade || {};
global.TM.Fiscal.cascade.sum = sumEconomyBase;
global.TM.Fiscal.cascade.getDiv = getDivEconomy;
global.TM.Fiscal.cascade.topContributors = getTopContributors;
global.TM.Fiscal.cascade.triggerSurvey = triggerSurvey;
// alias 期保 (Phase 6 删)
global.TM.Economy = global.TM.Economy || {};
global.TM.Economy.sum = sumEconomyBase;
global.TM.Economy.getDiv = getDivEconomy;
global.TM.Economy.topContributors = getTopContributors;
global.TM.Economy.triggerSurvey = triggerSurvey;
```

或更干净·**删 fiscal-engine L1746-1751**·全部走 tm-namespaces R202·

```js
// tm-namespaces.js R202·
TM.Fiscal.cascade = window.CascadeTax;
TM.Fiscal.cascade.sum = window.sumEconomyBase || (window.CascadeTax && window.CascadeTax.sumEconomyBase);
// ...
```

但 sumEconomyBase 等是 IIFE 内 helper·不外暴露·**无法走 namespace 集中点 R202**·

**结论·改 fiscal-engine 写入·走 A 方案·sub-ns 准 + alias 期 keep**·

## 4·sub-ns 设计

### 4.1 `TM.Fiscal` (24 canonical·new)

**main domain·R10 redistribute 后聚集·税/支出/转运/级联**·

```js
TM.Fiscal.engine        = window.FiscalEngine;     // R10·12 keys api
TM.Fiscal.cascade       = window.CascadeTax;       // v2·12 keys·级联税
TM.Fiscal.fixedExpense  = window.FixedExpense;     // v2·6 keys·固定支出
TM.Fiscal.legacy        = {
  PhaseH: window.PhaseH,                            // R10 历史 phase-h 命名 alias
};
// fiscal.cascade.sum/getDiv/topContributors/triggerSurvey 由 tm-fiscal-engine 自填
// (P5-δ 改 fiscal-engine L1746-1751 写入路径)
```

### 4.2 `TM.Economy` (R87 facade reconcile + 7 engine sub)

**main domain·tribute / income / population / inheritance + 7 sub-engines**·

```js
TM.Economy.legacy       = R87 whitelist (20 fn 在 tm-economy.js)·已为 facade
                          // 扩展·加新 sub
TM.Economy.core         = window.EconomyCore;       // formulaEstimateWealth·v1
TM.Economy.linkage      = window.EconomyLinkage;    // borrow/donate/forceLevy/governance·v1
TM.Economy.currency     = window.CurrencyEngine;    // 25 纸币·R10b·v1
TM.Economy.currencyUnit = window.CurrencyUnit;      // unit·R10b
TM.Economy.envCapacity  = window.EnvCapacityEngine; // SCAR/CRISIS/POLICY·v1
TM.Economy.eventBus     = window.EconomyEventBus;
TM.Economy.gapFill      = window.EconomyGapFill;    // R7 collapse·v1
```

**注意**·Economy 顶层 R87 facade 是 `_buildFacade`·有 has/list/_namespace 等·添加 sub 不破·

但 Codex 的新 helper `_buildWindowRefGroup` 也支持 sub-objects·可改用·

### 4.3 `TM.Guoku` (R87 panel facade + .engine sub)

```js
TM.Guoku                = R87 whitelist (21 fn·panel·_guoku_extraTax 等)·已为 facade
TM.Guoku.engine         = window.GuokuEngine;       // R9 merged·30+ keys·v1
TM.Guoku.legacy         = {
  GuokuEngine: window.GuokuEngine                   // alias 同 .engine·R87 TM.GuokuEngine 兼容
};
```

注意·`TM.GuokuEngine` (R87 engine proxy) 仍保·**双向 alias**·

```js
// R87 TM.GuokuEngine = engine proxy·透传 window.GuokuEngine
// R200 TM.Guoku.engine = window.GuokuEngine 直接引用
// 两者 ===·即·TM.GuokuEngine === TM.Guoku.engine === window.GuokuEngine
```

### 4.4 `TM.Neitang` (R87 panel facade + .engine sub)

```js
TM.Neitang              = R87 whitelist (11 fn·panel)·已为 facade·全量
TM.Neitang.engine       = window.NeitangEngine;     // 11 keys + Phase 3 inline ext
```

(无对应 R87 NeitangEngine proxy·因为之前未透传·P5-δ 加 .engine sub 即可)

## 5·命名冲突·sub-ns 隔离即可

| name | 跨多少 engine | sub-ns 解决 |
|---|---|---|
| **`tick`** | 11 处·FiscalEngine·CascadeTax·FixedExpense·CurrencyEngine·EnvCapacityEngine·EconomyLinkage·EconomyEventBus·EconomyGapFill·EconomyCore·GuokuEngine·NeitangEngine | sub-ns 各自·OK |
| **`init`** | 6 处 | sub-ns 各自·OK |
| **`VERSION`** | 不冲·sub-ns 隔离 | OK |
| **`DEFAULT_TAXES`** | FiscalEngine·CascadeTax | 同源·CascadeTax 是 fiscal 入·共享 OK |
| **`DEFAULT_ALLOCATION`** | 同上 | 同 |
| **`Sources` / `Expenses` / `Actions`** | GuokuEngine 和 NeitangEngine 都有 | sub-ns 各自·OK |

## 6·留 window·HTML inline callable

按 Q4 决议 (HTML inline 不动)·以下留 window·

| 名 | 出处 | 调用方 |
|---|---|---|
| `openYearlyReport` | fiscal-ui L582 | HTML inline (年度报告 button) |
| `openCarryingCapacityHeatmap` | fiscal-ui L583 | HTML inline (env-capacity heatmap) |
| `_guoku_extraTax` 等 21 个 | guoku-panel | HTML inline (国库面板按钮·R87 facade 已 alias·留) |
| `_neitang_transferFromGuoku` 等 11 个 | neitang-panel | HTML inline (内堂面板按钮·R87 facade 已 alias·留) |
| `getTributeRatio`·`calculateMonthlyIncome` 等 20 个 | tm-economy.js | tm-endturn / scenario · 多调用方·留 |

## 7·建议 P5-δ 实施 plan

### 7.1 tm-namespaces.js 改动·R202 段·~70 行

```js
// ═══════════════════════════════════════════════════════════════════
// R202·Phase 5 P5-δ Fiscal/Economy/Guoku/Neitang (2026-05-04·Claude)
//   填充 4 sub-namespace·sub-ns 透传 engine objects·R87 facade 不破
//   reconcile·tm-fiscal-engine L1746-1751 改写入·TM.Economy 4 fn → TM.Fiscal.cascade
// ═══════════════════════════════════════════════════════════════════

// ─── TM.Fiscal·R10 redistribute 后主财政 ───
TM.Fiscal.engine       = window.FiscalEngine;
TM.Fiscal.cascade      = window.CascadeTax;
TM.Fiscal.fixedExpense = window.FixedExpense;
TM.Fiscal.legacy       = { PhaseH: window.PhaseH };

// ─── TM.Economy·R87 facade 上挂 sub (Object.assign 不破 _buildFacade getters) ───
TM.Economy.core         = window.EconomyCore;
TM.Economy.linkage      = window.EconomyLinkage;
TM.Economy.currency     = window.CurrencyEngine;
TM.Economy.currencyUnit = window.CurrencyUnit;
TM.Economy.envCapacity  = window.EnvCapacityEngine;
TM.Economy.eventBus     = window.EconomyEventBus;
TM.Economy.gapFill      = window.EconomyGapFill;

// ─── TM.Guoku·R87 facade 上挂 .engine sub ───
TM.Guoku.engine         = window.GuokuEngine;
// alias·R87 TM.GuokuEngine 仍保·双向 ===

// ─── TM.Neitang·R87 facade 上挂 .engine sub ───
TM.Neitang.engine       = window.NeitangEngine;
```

### 7.2 tm-fiscal-engine.js L1746-1751 改动·~10 行

```js
// 旧·
global.TM.Economy.sum = sumEconomyBase;
// 新·sub-ns 准 + alias 期保
global.TM.Fiscal = global.TM.Fiscal || {};
global.TM.Fiscal.cascade = global.TM.Fiscal.cascade || {};
global.TM.Fiscal.cascade.sum = sumEconomyBase;
global.TM.Fiscal.cascade.getDiv = getDivEconomy;
global.TM.Fiscal.cascade.topContributors = getTopContributors;
global.TM.Fiscal.cascade.triggerSurvey = triggerSurvey;
// alias 期·Phase 6 删
global.TM.Economy = global.TM.Economy || {};
global.TM.Economy.sum = sumEconomyBase;
global.TM.Economy.getDiv = getDivEconomy;
global.TM.Economy.topContributors = getTopContributors;
global.TM.Economy.triggerSurvey = triggerSurvey;
```

### 7.3 P5-δ smoke·~25 assertions

```js
// scripts/smoke-p5-delta-fiscal.js

// ── TM.Fiscal sub-ns ──
assert(TM.Fiscal.engine === window.FiscalEngine);
assert(TM.Fiscal.cascade === window.CascadeTax);
assert(TM.Fiscal.cascade.VERSION === 2);
assert(TM.Fiscal.fixedExpense === window.FixedExpense);
assert(TM.Fiscal.fixedExpense.VERSION === 2);

// ── TM.Fiscal.cascade extension by fiscal-engine self-write ──
assert(typeof TM.Fiscal.cascade.sum === 'function');
assert(typeof TM.Fiscal.cascade.getDiv === 'function');

// ── TM.Economy sub-ns (R87 facade 上挂 sub) ──
assert(TM.Economy.core === window.EconomyCore);
assert(TM.Economy.linkage === window.EconomyLinkage);
assert(TM.Economy.currency === window.CurrencyEngine);
assert(TM.Economy.envCapacity === window.EnvCapacityEngine);
assert(TM.Economy.envCapacity.VERSION === 1);

// ── R87 Economy whitelist 仍 valid (legacy 不破) ──
assert(TM.Economy.has('getTributeRatio'));
assert(TM.Economy._namespace === 'Economy');

// ── alias·TM.Economy.sum 仍存 (Phase 5 全程·Phase 6 删) ──
assert(typeof TM.Economy.sum === 'function');
assert(TM.Economy.sum === TM.Fiscal.cascade.sum);

// ── TM.Guoku.engine ──
assert(TM.Guoku.engine === window.GuokuEngine);
assert(TM.Guoku.engine === TM.GuokuEngine);  // R87 双向 alias

// ── R87 TM.Guoku panel facade 仍 valid ──
assert(TM.Guoku.has('openGuokuPanel'));

// ── TM.Neitang.engine ──
assert(TM.Neitang.engine === window.NeitangEngine);
assert(TM.Neitang.has('openNeitangPanel'));  // R87 panel 仍 valid

// ── 命名冲突测试·sub-ns 隔离 ──
assert(TM.Fiscal.engine.tick !== TM.Fiscal.cascade.tick);
assert(TM.Fiscal.cascade.tick !== TM.Guoku.engine.tick);
assert(TM.Guoku.engine.tick !== TM.Neitang.engine.tick);

// ── DEFAULT_TAXES 共享 (FiscalEngine 与 CascadeTax 同源) ──
assert(TM.Fiscal.engine.DEFAULT_TAXES === TM.Fiscal.cascade.DEFAULT_TAXES);
```

### 7.4 verify-all gate·**+1**

P5-α 后 40·P5-β 后 41·P5-γ 后 42·P5-δ 后 **43**·

## 8·风险评估

| 风险 | 等级 | 缓解 |
|---|---|---|
| **fiscal-engine L1746-1751 改写入·破调用方** | **中** | grep `TM.Economy.sum`·`TM.Economy.getDiv` 调用方·若有保 alias·smoke assert TM.Economy.sum 仍存 |
| R87 facade getter Object.defineProperty configurable=false·sub 加不进去 | 低 | _buildFacade 用 defineProperty 只对 whitelist names·新 keys 不在 whitelist·可正常 add (= obj.x = ...) |
| GuokuEngine 30+ methods·sub-ns 透传后调用方调用未变 | 低 | 透传·call site 不破 |
| HTML inline 21 + 11 个 panel fn | 低·Q4 决议 | 留 window·不动 |
| EconomyCore·EconomyLinkage 等 7 sub·命名 collision (formulaEstimateWealth 等) | 极低 | 各自 IIFE 内·命名清晰 |
| EnvCapacityEngine 跨 fiscal/env·应入 Economy 还是 Fiscal? | 低 | 入 Economy.envCapacity (env tier·非 cascade tax)·domain 决定 |
| `TM.Fiscal` 与 `TM.Economy` boundary 模糊 | 中 | doc 明确·**Fiscal = 税/支出/转运** (R10 域)·**Economy = 单位/通胀/继承/环境/公共** |
| Codex P5-β/我 P5-α/γ 都改 tm-namespaces.js·并行可能冲突 | 中 | **串行**·P5-δ 必须等 P5-β/γ 顺序后·再改 R202 段 |

## 9·与其他 slice 协同

| slice | 协同点 |
|---|---|
| P5-α (done) | 24 ns 容器已建·R200 段不动 |
| P5-β NPC/Char (Codex 进行中) | 无冲·NPC/Char 与 fiscal/economy 完全独立 |
| P5-γ Edict (Claude 后启) | 无冲·edict 域不进 fiscal·`_checkProjectCompletion` 等 fn 留 edict-complete |
| P5-ε Authority/Office/Keju/Corruption (Claude 后启) | **可能有 boundary**·corruption-engine 与 fiscal 跨域 (corruption tax 影响 fiscal)·但 corruption 主域是 Office/Authority 不入 Fiscal |
| P5-η Endturn (Codex) | 无冲·Endturn 透传调用 fiscal/guoku/neitang tick·sub-ns 透传不破调用 |

## 10·估时

| 步骤 | 估时 |
|---|---|
| 实施 R202 段 in tm-namespaces.js (~70 行) | 30 min |
| 改 tm-fiscal-engine.js L1746-1751 (~10 行 + alias 期 keep) | 15 min |
| 写 smoke-p5-delta-fiscal.js (~150 行·25 assertions + sub-ns 验证) | 45 min |
| 跑 verify-all 验证·target 43/43 | 10 min |
| 头注 update tm-namespaces.js + tm-fiscal-engine.js | 10 min |
| 写 P5-δ done letter | 15 min |
| **总** | **~2-2.5h** (高于 prep doc 估 3h·因 prep 已锁结构·Codex 的 _buildWindowRefGroup helper 也加速) |

## 11·current

- **P5-α done** (40/40·24 ns 容器)
- **P5-β 进行中** (Codex·NPC/Char)
- **P5-γ prep audit done** (Claude·待 P5-β 后启)
- **P5-δ prep audit done (本 doc)·待 P5-γ 后启**
- 我 owner·estimated ~2-2.5h

无 commit·无 push·**all local**·

— Claude (P5-δ prep audit·2026-05-04)
