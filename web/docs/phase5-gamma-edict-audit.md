# Phase 5 P5-γ Edict Prep Audit

date·2026-05-04 · mode·**read-only prep audit·doc-only·待 P5-α 落地后实施**
owner·Claude (P5-γ)

> 模式·与 Codex 的 phase5-beta-npc-char-audit 同模式·不动 tm-namespaces.js·只 audit 候选 surface·sub-ns 形状·命名冲突·实施 plan·

## 0·背景

P5-α reconcile done·`TM.Edict = TM.Edict || {};` 容器已建·空对象·待 P5-γ 填充·

P3 R12 后·edict cluster 已清·

| round | 改动 |
|---|---|
| R12b·Claude | tm-phase-c-patches.js 1100 行 inline 入 tm-edict-parser.js·delete patch 文件 |
| R12 close | LAYERED 0 残留·EdictParser VERSION 2·EdictComplete extension·PhaseC defensive shim |

## 1·Edict cluster 现状 (4 文件·2325 行)

| 文件 | 行 | 主导出 | sub-ns 候选 |
|---|---|---|---|
| `tm-edict-parser.js` | 988 (R12b inline 后) | `EdictParser` (15 keys·VERSION 2) + `EdictComplete` 扩 4 keys + `PhaseC` defensive shim 10 keys | `TM.Edict.parser` |
| `tm-edict-complete.js` | 509 | `EdictComplete` (12 keys·VERSION 1) + 3 inline alias (openEdictHelp·openMemorialsPanel·_processAbduction) | `TM.Edict.complete` |
| `tm-edict-lifecycle.js` | 328 | 11 globals·EDICT_TYPES·EDICT_STAGES·REFORM_PHASES·RESISTANCE_SOURCES + 7 fn (classifyEdict/calcEdictMultiplier/estimateResistance/generateEdictForecast/daysToTurns/getEdictLifecycleTurns/getReformPhaseTurns/formatLifecycleForScript) | `TM.Edict.lifecycle` |
| `tm-edict-thresholds.js` | 500 | `PhaseG3` (~20 keys·VERSION 1) + TM_THRESHOLDS + openFuyiSchemeComparison alias | `TM.Edict.thresholds` |

**总·~50-60 public surface·分 4 sub-ns 清晰**·

## 2·关键命名冲突·**EDICT_TYPES 两义**

P5-γ 必须显式处理·

| 出处 | 类型 | 含义 | 暴露路径 |
|---|---|---|---|
| `tm-edict-parser.js:27` | parser 内部结构 | 17 个 edict type 详细定义 (含 trigger/effect/duration 等字段) | `EdictParser.EDICT_TYPES` (IIFE 内·非 window) |
| `tm-edict-lifecycle.js:10` + L316 export | lifecycle classification 枚举 | 11 个 broad category (政令/财政/军事/外交/...) | `window.EDICT_TYPES` (full global) |

**含义不同·load order 决定 window.EDICT_TYPES**·目前·

```
index.html load order·
  tm-edict-lifecycle.js (建 window.EDICT_TYPES = lifecycle 11 类)
    ↓
  tm-edict-parser.js (parser IIFE 内 EDICT_TYPES = 17 详细·不外泄·只走 EdictParser.EDICT_TYPES)
```

**结论**·**目前 window.EDICT_TYPES = lifecycle 版**·EdictParser.EDICT_TYPES 是另一对象·两者并存·**P5-γ 应保此分离·sub-ns 不合并**·

P5-γ 设计·

```js
TM.Edict.parser.EDICT_TYPES    = EdictParser.EDICT_TYPES;       // 17 type 详定义
TM.Edict.lifecycle.EDICT_TYPES = window.EDICT_TYPES;             // 11 大类枚举·alias
// alias 留·window.EDICT_TYPES 不动·legacy code 仍可用
```

## 3·其他命名重复·sub-ns 隔离即可

| name | 出现 | sub-ns 解决 |
|---|---|---|
| `tick` | EdictParser.tick·EdictComplete.tick·PhaseG3.tick | `TM.Edict.parser.tick` / `.complete.tick` / `.thresholds.tick`·sub-ns 隔离·OK |
| `init` | EdictComplete.init·PhaseG3.init | `.complete.init` / `.thresholds.init`·OK |
| `VERSION` | parser 2·complete 1·thresholds 1 | sub-ns 各自·OK |

## 4·候选 surface·按 sub-ns

### 4.1 `TM.Edict.parser` (R12b 后主入口·**核心**)

```js
TM.Edict.parser = EdictParser;  // 直接透传·R12b inline 后已是完整 surface
// 等价·
TM.Edict.parser = {
  classify, tryExecute, submitToMemorial, askForClarification,
  processImperialAssent, tick, getAIContext,
  EDICT_TYPES, HISTORICAL_EDICT_PRESETS, getHistoricalEdictPresets,
  registerDynamicInstitution, abolishInstitution,
  detectEnvPolicy, routeEnvPolicy, POLICY_KEYWORDS,
  enhanceOfficeReformDraft,
  VERSION: 2
};
```

### 4.2 `TM.Edict.complete`

```js
TM.Edict.complete = EdictComplete;  // 透传·12 keys + R12b 4 ext keys
// 包括 init / tick / openEdictHelp / openMemorialsPanel / _checkProjectCompletion 等
// + R12b inline·openClarificationPanel / _answerClarification / processImperialAssentExtended / QUERY_QUICK_OPTIONS
```

### 4.3 `TM.Edict.lifecycle`

```js
TM.Edict.lifecycle = {
  EDICT_TYPES: window.EDICT_TYPES,           // 11 大类·与 parser.EDICT_TYPES 不同
  EDICT_STAGES: window.EDICT_STAGES,
  REFORM_PHASES: window.REFORM_PHASES,
  RESISTANCE_SOURCES: window.RESISTANCE_SOURCES,
  classifyEdict: window.classifyEdict,
  calcEdictMultiplier: window.calcEdictMultiplier,
  estimateResistance: window.estimateResistance,
  generateEdictForecast: window.generateEdictForecast,
  daysToTurns: window.daysToTurns,
  getEdictLifecycleTurns: window.getEdictLifecycleTurns,
  getReformPhaseTurns: window.getReformPhaseTurns,
  formatLifecycleForScript: window.formatLifecycleForScript
};
```

### 4.4 `TM.Edict.thresholds` (PhaseG3·历史命名·alias 入)

```js
TM.Edict.thresholds = PhaseG3;  // 透传 R12 历史 phase-g3 命名
// 包括·init·tick·TM_THRESHOLDS·CORVEE_ABCD_VARIANTS·generateCorveeABCDOptions·
// openCorveeABCDPanel·initiateMovCapitalThreeRound·ABDUCTION_12_CASES·
// findRelevantAbductionCases·FUYI_SCHEME_ABCD·openFuyiSchemeComparison·
// checkDecreeViolation·DYNASTY_POPULATION_PRESETS·applyDynastyPopulationPreset·
// attachEdictReferenceButton·VERSION 1
```

### 4.5 legacy·**留 window·不入 TM.Edict** (Phase 6 才决定)

按 Phase 5 Q4 决议 (HTML inline 不动·alias 留)·以下 inline-callable 全部留 window·

| 名 | 出处 | 调用方 |
|---|---|---|
| `window.openEdictHelp` | edict-complete L325 | HTML inline button (历代圣鉴) |
| `window.openMemorialsPanel` | edict-complete L372 | HTML inline button (内阁奏疏) |
| `window._processAbduction` | edict-complete L403 | HTML inline (绑架处理) |
| `window.openFuyiSchemeComparison` | edict-thresholds L498 | HTML inline (赋役方案对照) |
| `window.TM_THRESHOLDS` | edict-thresholds L497 | scriptData / scenario JSON config |
| `window.PhaseC` | edict-parser L975 | defensive·防 3rd party 引用·R12b inline 后 init 是 no-op |
| `window.classifyEdict` 等 11 个 lifecycle | edict-lifecycle L316-327 | tm-endturn·scenario 解析·multiple call sites |

**留 window·alias 不破·Phase 6 audit + grep + 决定迁移**·

### 4.6 不入 TM.Edict 的 (虽住 edict 文件)

- `_checkProjectCompletion` / `_checkHuangceCycle` / `_checkGaituEscalation` (edict-complete L443-445) — 实质是 **endturn pipeline 步骤**·属 `TM.Endturn` 域 (待 P5-η Codex 决定·或 keep as `TM.Edict.complete` 内部)
- `MEMORIAL_TRIGGERS` / `P1_EDICT_TYPES` / `HELP_TOPICS` (edict-complete) — data·留 `TM.Edict.complete` 内即可
- `enhanceOfficeReformDraft` (edict-parser inline) — 跨域 (Office)·但实施在 edict 路径·留 `TM.Edict.parser` 内·若 P5-ε 整 Office 时发现需要透出·再 alias·

## 5·建议 P5-γ 实施 plan

### 5.1 改动·~30-50 行 in tm-namespaces.js·R200 段后追加 R201

```js
// ═══════════════════════════════════════════════════════════════════
// R201·Phase 5 P5-γ Edict (2026-05-04·Claude)
//   填充 TM.Edict 容器·sub-ns·parser/complete/lifecycle/thresholds
//   遵循 Codex P5-β 模式·sub-ns 透传·不 flatten·legacy alias 留 window
// ═══════════════════════════════════════════════════════════════════

if (typeof window.EdictParser !== 'undefined') {
  TM.Edict.parser = window.EdictParser;
}
if (typeof window.EdictComplete !== 'undefined') {
  TM.Edict.complete = window.EdictComplete;
}
TM.Edict.lifecycle = {
  // alias 透传·不 flatten·若 lifecycle fn 缺失·读 undefined 不抛
  EDICT_TYPES: window.EDICT_TYPES,
  EDICT_STAGES: window.EDICT_STAGES,
  REFORM_PHASES: window.REFORM_PHASES,
  RESISTANCE_SOURCES: window.RESISTANCE_SOURCES,
  classifyEdict: window.classifyEdict,
  calcEdictMultiplier: window.calcEdictMultiplier,
  estimateResistance: window.estimateResistance,
  generateEdictForecast: window.generateEdictForecast,
  daysToTurns: window.daysToTurns,
  getEdictLifecycleTurns: window.getEdictLifecycleTurns,
  getReformPhaseTurns: window.getReformPhaseTurns,
  formatLifecycleForScript: window.formatLifecycleForScript
};
if (typeof window.PhaseG3 !== 'undefined') {
  TM.Edict.thresholds = window.PhaseG3;
}
TM.Edict.legacy = {
  PhaseC: window.PhaseC,  // R12b defensive shim·init 是 no-op
  TM_THRESHOLDS: window.TM_THRESHOLDS
};
```

### 5.2 load 顺序考量

`tm-namespaces.js` load 在所有 edict 之后 (按 R200 设计)·所以·

```
index.html·
  tm-edict-lifecycle.js   →  window.EDICT_TYPES·classifyEdict 等
  tm-edict-complete.js    →  window.EdictComplete·openEdictHelp 等
  tm-edict-parser.js      →  window.EdictParser·EdictComplete 扩·PhaseC shim
  tm-edict-thresholds.js  →  window.PhaseG3·TM_THRESHOLDS·openFuyiSchemeComparison
  ...
  tm-namespaces.js        →  R201 读 window.EdictParser 等·填 TM.Edict.*
```

**load 顺序无需改**·R201 全部 after·安全·

### 5.3 P5-γ smoke·~10 assertions

```js
// scripts/smoke-p5-gamma-edict.js
// 验 TM.Edict sub-ns 填充·alias 链·关键 fn 透传

assert(TM.Edict && typeof TM.Edict === 'object');
assert(TM.Edict.parser && TM.Edict.parser.VERSION === 2);
assert(TM.Edict.complete && TM.Edict.complete.VERSION === 1);
assert(TM.Edict.lifecycle && typeof TM.Edict.lifecycle.classifyEdict === 'function');
assert(TM.Edict.thresholds && TM.Edict.thresholds.VERSION === 1);

// 关键·EDICT_TYPES 两版本分离
assert(TM.Edict.parser.EDICT_TYPES !== TM.Edict.lifecycle.EDICT_TYPES,
  'parser EDICT_TYPES (17 详定义) and lifecycle EDICT_TYPES (11 大类) must remain separate');

// alias 链·sub-ns 引用 === legacy global
assert(TM.Edict.parser === window.EdictParser);
assert(TM.Edict.complete === window.EdictComplete);
assert(TM.Edict.thresholds === window.PhaseG3);
assert(TM.Edict.lifecycle.classifyEdict === window.classifyEdict);

// VERSION 跨 sub-ns 不冲
assert(TM.Edict.parser.VERSION === 2 && TM.Edict.complete.VERSION === 1
    && TM.Edict.thresholds.VERSION === 1);
```

### 5.4 verify-all gate·**41/41**

P5-α 落地后 40/40·P5-γ 加 smoke·**+1·target 41/41**·

(P5-β 也 +1·若 Codex 先 done 则 P5-γ 之后 42/42·两 slice 顺序解耦)

## 6·风险评估

| 风险 | 等级 | 缓解 |
|---|---|---|
| EDICT_TYPES 含义混淆·调用方误用 | **中** | sub-ns 强制隔离·smoke 显式 assert `parser.EDICT_TYPES !== lifecycle.EDICT_TYPES` |
| PhaseC defensive shim·后续误删·legacy code 抛 | 低 | TM.Edict.legacy.PhaseC 留·且 R12b head note 已记录原因 |
| HTML inline button·openEdictHelp 等 | 低 (Q4 决议) | 不动 window alias·Phase 6 才统一 |
| EdictParser VERSION 2 · EdictComplete VERSION 1 不同步 | 低 | 不影响 sub-ns·两版本各自 |
| tm-edict-thresholds 命名 PhaseG3·语义老·命名不直观 | 低 | TM.Edict.thresholds alias·历史命名 PhaseG3 也保 |

## 7·与 Codex P5-β·P5-δ/ε 的协同

### 7.1 与 P5-β NPC/Char (Codex)

无冲·edict 不调 NPC/Char 的 internal·只 chars[] 数据 (经 GM)·

### 7.2 与 P5-δ Fiscal·P5-ε Authority/Office (Claude·我自己后续)

- `_checkGaituEscalation` 改土归流·跨 office 域·留 `TM.Edict.complete` 内·若 P5-ε 时 grep 调用方·再决定 alias 入 `TM.Office`
- `enhanceOfficeReformDraft` 跨 Office·留 `TM.Edict.parser`·同上

### 7.3 与 P5-η Endturn (Codex)

- `_checkProjectCompletion` / `_checkHuangceCycle` 是 tick 调用·属 endturn 域·但调用入口 `EdictComplete.tick` 留 `TM.Edict.complete`·**Codex P5-η 时只 namespace endturn entrypoint·不动 EdictComplete.tick**·

## 8·估时

| 步骤 | 估时 |
|---|---|
| 读 4 edict 文件 (~2300 行) | 0 (本 audit 已 cover) |
| 实施 R201 段·~50 行 | 20 min |
| 写 smoke-p5-gamma-edict.js | 25 min |
| verify-all 验证 | 5 min |
| 头注 update tm-namespaces.js | 5 min |
| letter | 10 min |
| **总** | **~1h** (低于 prep doc 估 1.5h·因本 audit 已锁结构) |

## 9·current

- **P5-α done** (40/40·R200 段·14 容器 + alias)
- **P5-γ prep audit done** (本 doc·read-only)
- 待·P5-α 落地后启 P5-γ (现已 ready)·或并 P5-β 启
- 我 owner·estimated ~1h

无 commit·无 push·**all local**·

— Claude (P5-γ prep audit·2026-05-04)
