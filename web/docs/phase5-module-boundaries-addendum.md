# module-boundaries.md addendum·Phase 5 close (P6-δ drop-in)

date·2026-05-04 · status·**草稿·P6-δ 时合并入 docs/module-boundaries.md**

> 本 addendum 是 Phase 5 close 后对 module-boundaries.md 的补充·**P6-δ slice 实施时合并**·
> 合并位置·新增 §29·Phase 5 24 canonical namespace boundary lock + §30·跨域 fn 归属决议 + §31·R200-R207 sub-ns 详表·

---

## §29·Phase 5·24 canonical namespace boundary 锁

### 29.1 boundary 原则 (与 Codex 共识 2026-05-04·Q1-Q5)

| 原则 | 说明 |
|---|---|
| **24 canonical**·非 18 | target §6.2 列 18·实际扩 4 (Authority/Corruption/Diagnostics/Economy 独立 engine) |
| **R87 facade 留 顶层·扩 sub-ns** | 5 whitelist facade + 3 engine proxy + Storage 不破·调用方 50+·删了等于回退 |
| **alias 期 = Phase 5 全程·Phase 6 退役** | 跳过 P4 deprecated 标记·alias 不标·只留 |
| **HTML inline·方案 B** | Phase 5 不动·Phase 6 半自动 + 手动 review·412 处 ~230 实改 ~180 留 |
| **slice 4/4 平衡** | Claude α·γ·δ·ε / Codex β·ζ·η·θ |

### 29.2 24 ns boundary 表

| ns | owns | does not own | public API (P5 后) | round |
|---|---|---|---|---|
| `TM.Chaoyi` | 朝议·廷议·御前 (`tm-chaoyi-{changchao/tinyi/yuqian}.js`) | 1v1 (→Wendui)·弹劾 (→Authority?·待 Phase 7)·诏令解析 (→Edict) | (P5-ε reconcile 入·主入口待) | R204 |
| `TM.Wendui` | 1v1 私谈 | 朝议 (→Chaoyi)·诗政 (→UI.shizheng) | (空容器·Phase 7 fill) | R200 |
| `TM.Endturn` | endTurn pipeline | 子系统内部 helper (各自 ns 内·不暴露) | run·province (entrypoint only) | R206 |
| `TM.Endturn.AI` | AI 推演 (1b·1c 并行) | LLM 调度 (→ai-infra·utility) | infer (entrypoint·12602 行黑盒) | R206 |
| `TM.Military` | 军事·封建·头衔·补给·铨选 | 财政税收 (→Fiscal·tribute) | (空·Phase 7 fill) | R200 |
| `TM.Fiscal` | 税·支出·转运·级联 (R10 redistribute 入) | 通胀 / 货币 (→Economy)·国库面板 (→Guoku) | engine·cascade·fixedExpense·legacy{PhaseH} | R203 |
| `TM.Economy` | 单位·继承·tribute·通胀·环境 | 财政税 (→Fiscal)·国库余额 (→Guoku) | core·linkage·currency·currencyUnit·envCapacity·eventBus·gapFill + R87 whitelist 20 fn | R203 |
| `TM.Guoku` | 国库 panel + engine·R9 5-file merged·30+ keys | 中央/地方分账 (→Fiscal.cascade) | engine + R87 panel facade 21 fn | R203 |
| `TM.Neitang` | 内堂 panel + engine·R3 + Phase 3 inline·11 keys | 朝廷分账 (→Fiscal.fixedExpense) | engine + R87 panel facade 11 fn | R203 |
| `TM.Huji` | 户口·人口·阶级 | 经济 (→Economy)·封建 (→Military·Phase 7) | HujiEngine engine proxy (R87) | R87 |
| `TM.Office` | 官制·铨选·考课 | 朝议 (→Chaoyi)·腐败 (→Corruption) | system (R6 carve·canPerformAction)·legacy (4 aiGen) | R204 |
| `TM.Authority` | 皇威·皇权·民心·R12c phase-f1 inline·24 keys | 朝议 (→Chaoyi)·诏令 (→Edict) | engines·complete·legacy{PhaseF1/F4/G1} | R204 |
| `TM.Corruption` | 腐败·R9 p2/p4 merged·16 keys | 派系斗争 (→Authority·部分)·吏治 panel (→Lizhi legacy) | engine (v1) | R204 |
| `TM.Keju` | 科举·考试·策问·殿试 | 选官入仕 (→Office)·朝议结果 (→Chaoyi) | runtime (9 主入口) | R204 |
| `TM.Edict` | 诏令 parse·complete·lifecycle·thresholds | 解析后效果 (→Endturn.edict) | parser (v2)·complete (v1)·lifecycle·thresholds (PhaseG3)·legacy{PhaseC} | R202 |
| `TM.NPC` | NPC engine·decision·behavior·personality | 角色 data (→Char)·tribute/fiscal (→Fiscal·CentralizationSystem 物理住 npc-engine 但实质 fiscal) | engine·interactions·decision·behaviors·personality·legacy | R201 |
| `TM.Char` | 角色 schema·economy·arcs·autogen·historical | NPC 决策 (→NPC)·UI inline (留 window) | schema·economy·arcs·autogen·historical·ui | R201 |
| `TM.Map` | 地图 system·recognition·converter·integration·display | editor-map.js (→Editor.map)·独立 .html 工具 (留 window·by design split P4-α-2) | runtime·interactive·converter·integration·display·recognition + R87 MapSystem alias | R205 |
| `TM.UI` | UI 公共·foundation·shell·topbar·drawers | game runtime panel (→各 ns 自己 panel·Lizhi/Guoku/Neitang R87 facade) | foundation·cheatsheet·help·shizheng·renwu·military·drawers | R205 |
| `TM.Save` | 存档·SaveManager + TM_SaveDB | save migration (→tm-save-lifecycle·utility) | (R87 Storage rename alias) | R200 |
| `TM.Editor` | 编辑器 form·crud·ai·domain·schema | game runtime (→各 ns)·游戏内 office editor (在 tm-office-editor·入 Office.legacy 而非 Editor·物理位置 ≠ domain) | core·crud·ai·forms·domain·schema·map | R207 |
| `TM.Memory` | 记忆 (chronicle·relations·char-arcs?) | 角色 data (→Char.historical) | (空·Phase 7 决定 vs Char.historical 是否合) | R200 |
| `TM.Player` | 玩家 (tm-player-core·-tools·-settings) | 玩家 UI (→UI)·save (→Save) | (空·Phase 7 fill) | R200 |
| `TM.Diagnostics` | errors·perf·pollution·checklist (P4-β-2) | 测试框架 (→TM.test·utility 不入 24 ns) | errors·guard·report | R200 meta-add |

### 29.3 legacy ns·Phase 6 退役决定

| ns | 类型 | 退役决定 |
|---|---|---|
| `TM.Lizhi` (R87 22 fn) | facade·非 24 canonical (Q1) | **保 R87 顶层 alias·Phase 7 决定移到 .Office.Lizhi 或 .UI.Lizhi**·Phase 6 不动 |
| `TM.MapSystem` (R87 17 fn + .open) | rename alias to TM.Map | **退役**·改 3 production call site·删 alias |
| `TM.Storage` (R113·12 fn) | rename alias to TM.Save | **退役**·改 1 production call site·删 alias |
| `TM.GuokuEngine` (R87 engine proxy) | 与 TM.Guoku.engine 同源 | alias 留·双向访问·Phase 7 看 |
| `TM.HujiEngine` / `TM.ChangeQueue` (R87 engine proxy) | 与 sub-ns 同源 | alias 留·内部 utility |

---

## §30·跨域 fn 归属决议·Phase 5 锁定

### 30.1 物理位置 ≠ domain 归属

> P5-β/ε/θ 分别 audit 时发现的关键判断·**fn 归 ns 看 domain·不看物理 file**·

| fn / 对象 | 物理 file | domain 归属 (sub-ns) | 决议 round |
|---|---|---|---|
| `CentralizationSystem` | tm-npc-engine.js | TM.Fiscal (待·Phase 7)·**非 TM.NPC** | R201 P5-β |
| `TerritoryProductionSystem` | tm-npc-engine.js | TM.Fiscal / Map.integration·**非 TM.NPC** | R201 P5-β |
| `aiGenChr` / `aiGenFac` / `aiGenFullScenario` / `execFullGen` | tm-office-editor.js | TM.Office.legacy·**非 TM.Editor** | R204 P5-ε |
| `_charConfiscate` / `_charInspect` | tm-char-economy-ui.js | window 留 (HTML inline) + TM.Char.ui (R201 alias)·**非 flatten 入 Char core** | R201 P5-β |
| `_checkProjectCompletion` / `_checkHuangceCycle` / `_checkGaituEscalation` | tm-edict-complete.js | TM.Edict.complete (留)·**非 TM.Endturn** (虽是 tick 路径) | R202 P5-γ |
| `enhanceOfficeReformDraft` | tm-edict-parser.js | TM.Edict.parser (留)·**非 TM.Office** (虽跨域) | R202 P5-γ |
| `editor-map.js` | editor-map.js | TM.Editor.map·**非 TM.Map** (game runtime)·by design split | R207 P5-θ |
| 12 wave (`tm-char-historical-wave-01..12.js`) | 12 文件 | data extension·只 profiles 共享表·**无独 facade** | R201 P5-β |
| `_miFindPath` | map-integration.js | window 留·internal helper·**不入 TM.Map.integration** | R205 P5-ζ |

### 30.2 命名冲突·sub-ns 强隔离

| name | 出现 | 隔离方式 |
|---|---|---|
| **`tick`** | 11+ 个 engine (Fiscal/Cascade/Fixed/Currency/EnvCapacity/EconomyLinkage/EconomyEventBus/EconomyGapFill/EconomyCore/Guoku/Neitang/Authority/Corruption/Edict.parser/Edict.complete/Edict.thresholds 等) | sub-ns 各自·`TM.Fiscal.engine.tick !== TM.Corruption.engine.tick` |
| **`init`** | 多处 | sub-ns 各自 |
| **`EDICT_TYPES`** | parser 17 详定义 + lifecycle 11 大类·**含义不同** | **强隔离**·`TM.Edict.parser.EDICT_TYPES !== TM.Edict.lifecycle.EDICT_TYPES`·smoke 显式 assert·永远不可合 |
| **`VERSION`** | 各 engine 各自 | sub-ns 各自·不冲 |
| **`Sources` / `Expenses` / `Actions`** | GuokuEngine + NeitangEngine 都有 | sub-ns 各自 |
| **`ov`** | guoku/neitang/lizhi panel 共用 mojibake-safe overlay helper | window 留·utility·不入 ns |

### 30.3 R10 dead code rescue (P5-δ 关键修)

```js
// 旧·tm-fiscal-engine.js L1746-1751 (已删)
global.TM.Economy.sum = sumEconomyBase;
// load 顺序问题·tm-namespaces.js 后 load·R87 facade overwrite·dead code

// 新·tm-namespaces.js R203
Object.defineProperty(TM.Economy, 'sum', {
  get: function() { return window.CascadeTax && window.CascadeTax.sumEconomyBase; },
  enumerable: true, configurable: true
});
```

**path**·`TM.Economy.sum` → `CascadeTax.sumEconomyBase` (R203 alias)·changelog R94 历史契约真生效·

---

## §31·R200-R207 sub-ns 详表 (实操索引)

> 改某 sub-ns·先看本表·**新代码强制走 TM.X.X**·

### 31.1 R200·24 容器 + rename alias (Claude)

```js
// rename
TM.Map = TM.MapSystem;     // R87 facade alias·Phase 6 退役
TM.Save = TM.Storage;      // R113 alias·Phase 6 退役

// 14 新容器
TM.Chaoyi/Wendui/Endturn(.AI)/Military/Fiscal/Office/Authority/
Corruption/Keju/Edict/NPC/Char/UI/Editor/Memory/Player = {};
// + TM.Diagnostics meta-add (P4-β-2 已建)
```

### 31.2 R201·NPC/Char (Codex P5-β)

```js
TM.NPC.engine        = NpcEngine
TM.NPC.interactions  = InteractionSystem
TM.NPC.decision      = { 8 fn·executeNpcBehaviors / batchNpcDecisions / ... }
TM.NPC.behaviors     = NpcBehaviorRegistry
TM.NPC.personality   = { 2 fn }
TM.NPC.legacy        = { 13 legacy ctx fn }

TM.Char.schema       = CharFullSchema
TM.Char.economy      = CharEconEngine
TM.Char.arcs         = CharArcs
TM.Char.autogen      = { 10 fn }
TM.Char.historical   = { profiles + 4 helper }
TM.Char.ui           = { renderResourcesSection·confiscate·inspect }
```

### 31.3 R202·Edict (Claude P5-γ)

```js
TM.Edict.parser      = EdictParser   // R12b inline 后·v2·15 keys
TM.Edict.complete    = EdictComplete // v1·12 keys + R12b 4 ext
TM.Edict.lifecycle   = { 12 entries·EDICT_TYPES (11 大类·与 parser.EDICT_TYPES 17 详不同)·classifyEdict 等 }
TM.Edict.thresholds  = PhaseG3       // 历史命名 alias
TM.Edict.legacy      = { PhaseC·TM_THRESHOLDS }
```

### 31.4 R203·Fiscal/Economy/Guoku/Neitang (Claude P5-δ)

```js
TM.Fiscal.engine        = FiscalEngine    // R10·12+ keys
TM.Fiscal.cascade       = CascadeTax      // v2·12 keys
TM.Fiscal.fixedExpense  = FixedExpense    // v2·6 keys
TM.Fiscal.legacy        = { PhaseH }

TM.Economy (R87 facade 顶层)
        + .core/.linkage/.currency/.currencyUnit/.envCapacity/.eventBus/.gapFill (7 sub)
        + sum/getDiv/topContributors/triggerSurvey (R10 dead code rescue·alias to CascadeTax)

TM.Guoku (R87 panel 顶层) + .engine = GuokuEngine (R9 30+ keys)
TM.Neitang (R87 panel 顶层) + .engine = NeitangEngine (11 keys)
```

### 31.5 R204·Authority/Office/Keju/Corruption (Claude P5-ε)

```js
TM.Authority.engines = AuthorityEngines    // R12c·v1·24 keys
TM.Authority.complete = AuthorityComplete
TM.Authority.legacy = { PhaseF1·PhaseF4·PhaseG1 + 4 helper }

TM.Corruption.engine = CorruptionEngine    // v1·16 keys

TM.Office.system = { canPerformAction·findPositionByCharName }   // R6 carve
TM.Office.legacy = { aiGenChr·aiGenFac·aiGenFullScenario·execFullGen }

TM.Keju.runtime = { 9 主入口·startKejuByMethod 等 }

// TM.Lizhi 不重建·R87 22 fn whitelist 留 legacy
```

### 31.6 R205·Map/UI (Codex P5-ζ)

```js
// (TBD·按 Codex 实际填法·sub-ns 推荐表见 phase5-zeta-map-ui-audit.md)
TM.Map.runtime/interactive/converter/integration/display/recognition  // 6 sub
TM.UI.foundation/cheatsheet/help/shizheng/renwu/military/drawers        // 7 sub
```

### 31.7 R206·Endturn (Codex P5-η·scope 收窄)

```js
// 主体是 internal pipeline·无 public API surface
// 实施可能 5-10 行·主要是 marker
TM.Endturn.run = { endTurn? }    // 主 entrypoint·待 Codex grep 确认
TM.Endturn.province = { openDivisionDetail }   // R7 carve 后 UI entry
TM.Endturn.AI.infer = {...}      // entrypoint only·12602 行 ai-infer 黑盒
```

### 31.8 R207·Editor (Codex P5-θ·TBD)

```js
// (TBD·按 Codex 实际填法)
TM.Editor.core/crud/ai/forms/domain/schema/map  // 7 sub
// reconcile·aiGenChr 等 4 fn 已入 TM.Office.legacy (R204)·不重复
// editor-map.js 入 .Editor.map·与 TM.Map (game runtime) 域分离
```

---

## §32·新功能加哪·Phase 5 后

| 新功能类型 | 加哪 | 例 |
|---|---|---|
| 新税种 / 财政机制 | TM.Fiscal.cascade 扩 + tm-fiscal-engine 实现 | 矿冶税新增 |
| 新国库行为 | TM.Guoku.engine 扩 + tm-guoku-engine 实现 | 紧急借贷新方案 |
| 新 NPC 决策路径 | TM.NPC.decision 扩 + tm-npc-decision 实现 | 新 behavior 类型 |
| 新角色字段 | TM.Char.schema 扩 + tm-char-full-schema | 新 personality 维度 |
| 新诏令类型 | TM.Edict.parser/complete 扩 | 新 P1 edict |
| 新 UI panel | TM.UI.{newPanel} sub + tm-{newPanel}-panel | 新模式面板 |
| 新 editor form | TM.Editor.forms 扩 + editor-form-{X} | 新 scenario 字段编辑 |
| 新 diagnostic | TM.Diagnostics.{newKind} + tm-{newKind}-monitor | 新 perf metric |
| 新 endturn phase | **不要新 phase**·扩现有 phase·sub-ns 不动 | (Phase 6+ 决定) |

---

## §33·Phase 5 letter 链 (实操参考)

```
phase5-prep.md (Claude 写·5 Q answered·24 ns 终表·8 slice plan)
  ↓
P4-β-2 done + Phase 4 close (Codex)
  ↓
Phase 4 close audit + P5-α start (Claude)
  ↓
P5-α done (Claude·40/40)
  ↓
P5-β done + γ go (Codex·41/41)
  ↓
P5-γ prep audit + P5-δ prep audit (Claude·空闲)
  ↓
P5-γ done (Claude·42/42)
  ↓
P5-δ + P5-ε done·Claude side complete (Claude·44/44)
  ↓
P5-ζ/η/θ prep audits done (Claude·空闲·360 行)
  ↓
P5-ζ done (Codex·45/45)
  ↓
P5-η done (Codex·46/46)
  ↓
P5-θ done + Phase 5 close (Codex·47/47·TBD)
  ↓
Phase 5 final audit·changelog entry·doc finalize (P6-δ)
```

---

— Claude (module-boundaries.md addendum·Phase 5 close·2026-05-04)
