# 天命 · 补丁文件分类标签

> 目的：对所有 `phase-*` / `-p2/-p4/-p5/-p6` / `-ext/-final/-fills/-fixes` 类文件做**分类**，
> 让未来维护者一眼看出每个文件是不是真 monkey patch。
>
> 最后更新：2026-04-24 R10+R12 评估

---

## 分类定义

| 类别 | 定义 | 合并难度 | 建议处理 |
|------|-----|---------|---------|
| **SELF** · 自包含模块 | 定义自己的 namespace，不覆盖现有函数 | — | 改名去除 `phase-` 前缀即可 |
| **APPEND** · 新增方法 | 往已有对象挂新方法（`CorruptionEngine.newFn = ...`）但不覆盖 | 低 | 可直接 inline 回目标文件 |
| **OVERRIDE** · Monkey Patch | 覆盖已有函数（`Foo.tick = function...` 原来 Foo.tick 已存在） | 中-高 | 合并需按覆盖链顺序，谨慎 |
| **LAYERED** · 叠加链 | 多个文件依次 override 同一方法 | 极高 | 保留分层或合并时一并处理 |
| **MIXED** · 混合 | 既有新增又有覆盖 | 中-高 | 按覆盖点拆分，新增部分好合 |

---

## Authority 相关

| 文件 | 类别 | 导出 | 覆盖点 | 合并建议 |
|------|------|------|-------|---------|
| `tm-authority-engines.js` | (主模块) | AuthorityEngines | — | 保留 |
| `tm-authority-complete.js` | (扩展) | AuthorityComplete | — | 与 engines 合并或保留拆分 |
| `tm-phase-f4-authority-deep.js` | **SELF** | PhaseF4 | 仅 `_patchDecreeParserWithTolerance`（1 处） | 改名 `tm-authority-deep.js`；1 处 patch 可 inline 到 edict-parser |
| `tm-phase-g1-authority-ui.js` | **SELF** | PhaseG1 + 5 个 window.open* | 无 | 改名 `tm-authority-ui.js` |

**结论**：F4/G1 实为自包含模块，命名误导。2026-04-24 已在文件顶部补文档标注。无需合并。

---

## Corruption 相关

| 文件 | 类别 | 导出 | 覆盖点 | 合并建议 |
|------|------|------|-------|---------|
| `tm-corruption-engine.js` | (主模块) | CorruptionEngine | — | 保留 |
| `tm-corruption-p2.js` | **MIXED** | 25 条案件库 + 6 新方法 | 覆盖 `tick` | 已于 R9 inline 到 `tm-corruption-engine.js` |
| `tm-corruption-p4.js` | **LAYERED** | 8 新方法 | 再覆盖 `tick` + `generateExposureCase` + `updatePerceived` | 已于 R9 inline 到 `tm-corruption-engine.js` |

**覆盖链**：
```
tm-corruption-engine.js:  CorruptionEngine.tick = v1
                                    ↓
tm-corruption-p2.js:      CorruptionEngine.tick = v2 (覆盖 v1) -> R9 inline
                                    ↓
tm-corruption-p4.js:      CorruptionEngine.tick = v3 (覆盖 v2，最终版) -> R9 inline
```

**合并策略**（未来执行）：
1. 把 p4 的 tick 内容 inline 到 engine.tick（因 p4 是终版）
2. 把 p4 覆盖的其他方法 inline 到 engine 对应方法
3. 把 p2 中未被 p4 覆盖的新增方法 inline 到 engine
4. 删除 p2/p4 文件
5. 给 engine 内的原 v1 tick 留注释："原 v1 逻辑已废弃，参见 git 历史 commit xxx"
6. 预计工时：30h（含测试）
7. **先决条件**：为 endTurn + corruption 路径写 smoke test

---

## Guoku 相关（R19 扫描完成）

| 文件 | 类别 | 导出 | 覆盖点 | 合并优先级 |
|------|------|------|-------|-----------|
| `tm-guoku-engine.js` | (主模块) | GuokuEngine {tick/ensureModel/getMonthRatio/Sources/Expenses/Actions/computeTaxFlow/monthlySettle/yearlySettle/checkBankruptcy/initFromDynasty/DYNASTY_PRESETS} | — | — |
| `tm-guoku-p2.js` | **MIXED** | 新增 applyTyrantFiscalDistortion/applyTaxMinxinFeedback/updateRegionalAccounts/updateGrainClothFlow/getRegions + 新 computeTaxFlow | 覆盖 `tick` / `computeTaxFlow` | 中 |
| `tm-guoku-p4.js` | **LAYERED** | FISCAL_REFORMS/canEnactReform/enactReform/tickReforms/updatePriceIndex/aiParseFiscalDecree/MintingActions | 覆盖 `tick`（替 p2）+ `Sources`（包装版）+ `initFromDynasty` + `yearlySettle` | 高 |
| `tm-guoku-p5.js` | **LAYERED** | LOAN_SOURCES/takeLoanBySource/calcCaoyunLossRate/aiFiscalAdvisor/isAIAvailable | 覆盖 `tick`（替 p4） | 高 |
| `tm-guoku-p6.js` | **LAYERED（终版）** | calcCustomTaxes | 覆盖 `tick`（最终版·替 p5） | 高 |
| `tm-guoku-panel.js` | UI | renderGuokuPanel | — | — |

### 5 层 tick 覆盖链

```
engine.tick v1   (基础收支 + 8 源 + 破产检查)
    ↓ 被覆盖
p2.tick v2       (+ 暴君扭曲 + 税压民心反馈 + 省级账簿 + 粮布流)
    ↓ 被覆盖
p4.tick v3       (+ 财政改革 ticker + 物价指数 + 铸币)
    ↓ 被覆盖
p5.tick v4       (+ 漕运损耗 + 借贷 + AI 参议)
    ↓ 被覆盖
p6.tick v5       (+ 自定义税种 calcCustomTaxes)  ← 终版
```

### 合并策略

若要真合并 guoku 全链（预估 80h，需先写 endTurn.guoku smoke test）：

1. **以 p6.tick 为基础**（终版，保留其包含的自定义税种支持）
2. **追加 p4/p5 的 APPEND 方法**到 engine namespace（FISCAL_REFORMS/LOAN_SOURCES 等）
3. **p2 的 tick 逻辑**（暴君扭曲/省级账簿）已被 p6 吸收，验证后可丢弃 p2 的覆盖代码
4. **保留 p2 的 computeTaxFlow**（可能有特定行为）
5. **engine 原 tick v1** 可删（已被 p6 完全覆盖）
6. **删除** p2.js、p4.js、p5.js、p6.js，一个引擎一个文件

### 先决条件

- 完整 endTurn + GuokuEngine.tick 的 smoke test（至少 10 个用例）
- 每层 tick 的行为语义文档化（当前每层都缺完整文档）
- 运行中玩家验证（3-5 回合无数值异常）

---

## Neitang 相关

| 文件 | 类别 | 说明 |
|------|------|-----|
| `tm-neitang-engine.js` | (主模块) | — |
| `tm-neitang-p2.js` | **待评估** | 单一补完，可能是 APPEND |
| `tm-neitang-panel.js` | UI | — |

---

## Var-Drawers 相关

| 文件 | 类别 | 说明 |
|------|------|-----|
| `tm-var-drawers.js` | (主模块) | 基础 render 函数 |
| `tm-var-drawers-ext.js` | **OVERRIDE** | 把 renderXxxPanel 替换为 Rich 版本 |
| `tm-var-drawers-final.js` | **OVERRIDE** (wrap 式) | 包装 renderXxxPanel 追加 extra 内容 |

**评估结果**（2026-04-24 R8）：不合并。三代设计有清晰的叠加语义，合并反而失去分层。已在顶部加文档注释。

---

## Three-Systems 相关

| 文件 | 类别 | 说明 |
|------|------|-----|
| `tm-three-systems-ext.js` | **待评估** | 可能与 ui 并存 |
| `tm-three-systems-ui.js` | **待评估** | UI 层 |

---

## Phase A-H 补丁系列（16 个 · R15 已全部评估）

> **重要发现**（2026-04-24 R15）：16 个 "phase" 文件里 **14 个 是 SELF/APPEND**，**仅 2 个 LAYERED**。
> 名字用 "-patches/-fills/-fixes/-deep/-final" 多为历史演化习惯，大部分不是真 monkey patch。

| 文件 | 类别 | 核心导出 | 被覆盖函数 | 建议处理 |
|------|------|---------|-----------|---------|
| `tm-phase-a-patches.js` | **SELF** | PhaseA.init/tick/dispatchAudit | — | 改名 `tm-audit.js` |
| `tm-phase-b-fills.js` | **SELF** | PhaseB.init/tick/enrichRegion | — | 改名 `tm-region-enrich.js` |
| ~~`tm-phase-c-patches.js`~~ | **LAYERED** → R12b done | PhaseC shim + EdictComplete extension | 已合并到 EdictParser.processImperialAssent/tick | 文件已删除 |
| `tm-phase-d-patches.js` | **SELF** | PhaseD.init/tick/spawnProphecy | — | 改名 `tm-prophecy.js` 或 `tm-power-minister.js` |
| `tm-phase-e-patches.js` | **APPEND** | EdictParser.getTemplatesByTypeExtended | — | 单方法 inline 到 edict-parser.js |
| ~~`tm-phase-f1-fixes.js`~~ | **LAYERED** → R12d done | PhaseF1 shim | 已合并到 AuthorityEngines.tick / PhaseD.COUNTER_STRATEGIES.rotate_officials | 文件已删除 |
| `tm-phase-f2-linkage.js` | **APPEND** | PhaseF2 + EventBus(22类) | — | 改名 `tm-event-bus.js`（事件系统是核心功能） |
| `tm-phase-f3-depth.js` | **APPEND** | PhaseF3 + 阶层流动3链 | — | 改名 `tm-class-mobility.js` |
| `tm-phase-f4-authority-deep.js` | **SELF** | PhaseF4（11 方法） | 仅 `_patchDecreeParserWithTolerance` (1 处) | 改名 `tm-authority-deep.js`，1 处 patch inline |
| `tm-phase-f5-ui-ai.js` | **APPEND** | PhaseF5 + UI 7 入口 + AI 生成 | — | 改名 `tm-player-tools.js` |
| `tm-phase-f6-economy-deep.js` | **APPEND** | PhaseF6 + Ledger 分解/纸币 25 条 | — | 改名 `tm-ledger-paper.js` |
| `tm-phase-g1-authority-ui.js` | **SELF** | PhaseG1 + 5 个 window.open* | — | 改名 `tm-authority-ui.js` |
| `tm-phase-g2-huji-complete.js` | **SELF** | PhaseG2 + 族群/宗教/保甲 | — | 改名 `tm-ethnic-religion.js` |
| `tm-phase-g3-edict-finalize.js` | **APPEND** | PhaseG3 + 阈值常量/徭役方案 | — | 改名 `tm-edict-thresholds.js` |
| `tm-phase-g4-economy-finalize.js` | **APPEND** | PhaseG4 + 破产驿站/决算弹窗 | — | 改名 `tm-fiscal-ui.js` |
| `tm-phase-h-final.js` | **SELF → REDISTRIBUTED** | PhaseH + 19 原子税/纸币数据 | — | ✓ R10 (2026-05-04)·§A-§Q 全 16 area 拆入 FiscalEngine·CurrencyEngine·FeudalCore·PlayerCore·EconomyCore·MechanicsCore·AuthorityEngines·EdictComplete·**file deleted** |

### 只有 2 个需要真合并

**`tm-phase-c-patches.js` (LAYERED → R12b done)** — 原覆盖 `EdictParser.processImperialAssent/tick`
- 已完成：PhaseC/EdictComplete 扩展、动态机构、问疑、环保路由已合并到 `tm-edict-parser.js`
- 守卫：`scripts/smoke-edict-parser-layered.js`

**`tm-phase-f1-fixes.js` (LAYERED → R12d done)** — 原覆盖 `AuthorityEngines.tick` + 改 `PhaseD.COUNTER_STRATEGIES.rotate_officials`
- 已完成：`AuthorityEngines.tick` 五段粉饰算法内联到 `tm-authority-engines.js`；`rotate_officials` 衰减算法内联到 `tm-prophecy.js`
- 守卫：`scripts/smoke-authority-f1-layered.js`

### 其余 14 个的"归位"实际上是**改名**

**操作步骤**（每个 10-15 分钟）：
1. 在原文件开头增加注释说明新旧名
2. 改文件名去掉 `phase-` 前缀
3. 更新 `index.html` 中的 `<script src="..."` 引用
4. 更新 `MODULE_REGISTRY.md` 对应行
5. 给原文件名保留一个 stub 文件做 redirect（可选，避免外部引用破坏）

**总工时**：~3-4 小时（14 文件 × 15 分钟 + 测试回归）

### 结论（修订）

原先 MODULE_REGISTRY 估计的"P2 工时 60h"（Phase 补丁归位）是**严重高估**。
真实值：
- 14 个 SELF/APPEND 文件改名：**3-4 小时**
- 2 个 LAYERED 文件合并：**25-45 小时**（需先写测试托底）
- 合计：**~30-50 小时**

**立即可做**：14 个 SELF/APPEND 改名，纯低风险。
**需 smoke test 托底后做**：2 个 LAYERED 合并。

---

## tm-patches.js（2186 行 · R16 切分清单）

| 文件 | 类别 | 说明 |
|------|------|-----|
| `tm-patches.js` | **极度 MIXED** | 跨 6 个功能领域的 monkey patch 合集 |

### 6 个功能领域切分路线（R16 扫描）

| # | 领域 | 行号范围 | 大小 | 类别 | 目标文件（新建） | 风险 |
|---|------|---------|-----|------|---------------|------|
| 1 | **Settings UI** | 8–530 | ~560 行 | OVERRIDE (完整重写 openSettings) | `tm-ui-foundation.js` 内 R22 placeholder | 高 |
| 2 | **Game Init & Validation** | 535–1040 | ~290 行 | MIXED (扩展+覆盖 startGame) | `tm-game-init.js` | 高 |
| 3 | **Editor Details (角色/物品/规则)** | 1682–1860 | ~190 行 | APPEND (editChr/saveChrEdit/editItm/editClass2/editTech2 等) | `tm-editor-details.js` | 中 |
| 4 | **Modal System** | 1861–1892 | ~40 行 | APPEND (openGenericModal/closeGenericModal/showModal/closeModal) | `tm-ui-foundation.js` | **极低** |
| 5 | **World Situation & Era Trends** | 1894–2090 | ~120 行 | APPEND (openWorldSituation/drawEraTrendsChart 等) | `tm-world-view.js` | 低 |
| 6 | **Military System** | 2090–2186 | ~50 行 | APPEND (addArmy/editArmy/aiGenMil/renderMilTab) | `tm-military-ui.js` | 低 |

### 拆分优先级

**风险最低的 3 个先拆分**（总计 ~210 行，每域 1-2 天）：
1. **Modal System**（40 行）— 纯函数库，零依赖，最容易抽离
2. **Military System**（50 行）— 数据驱动，与 armies CRUD 关联清晰
3. **World Situation**（120 行）— UI 组件自洽，耦合度低

**中等风险**：
4. **Editor Details**（190 行）— 新增编辑面板，依赖 editor modal/gv 等

**高风险**（建议最后）：
5. **Game Init & Validation**（290 行）— 覆盖 startGame + 开场白动画
6. **Settings UI**（560 行）— 完整重写 openSettings，涉及 API 配置/模型检测

### 估算总工时

- 6 个域独立切分：**~60 小时**（含回归测试）
- 先切低风险 3 个：**~10-15 小时**，立即减小 tm-patches.js 到 ~1950 行
- 高风险 2 个留到有 smoke test 后再动

### 目标文件命名一致性

| 新文件 | 加载时机（相对于 index.html） |
|-------|----------------------------|
| `tm-ui-foundation.js` | 早（其他文件可能依赖 icon/modal/settings placeholder/cheatsheet） |
| `tm-military-ui.js` | 中（在 game-engine 之后） |
| `tm-world-view.js` | 晚（纯 UI 查看功能） |
| `tm-editor-details.js` | 与 editor 层一起（tm-editor-*-deep.js 附近） |
| `tm-ui-foundation.js` | 早（图标、通用 modal、settings placeholder、cheatsheet 合并入口） |
| `tm-game-init.js` | 最早（startGame 相关） |

---

## 用法说明（给维护者）

- 看到一个 `tm-phase-*.js` 文件，先查本文档它是 SELF 还是 OVERRIDE
- 如果是 **SELF**：删除 `phase-` 前缀改名即可，无需合并
- 如果是 **APPEND/OVERRIDE**：参照 MODULE_REGISTRY.md 的路线图谨慎合并
- 如果是 **LAYERED**：需要一起动三个文件以上，先补 smoke test
- 看到 `xxx-p2/p4/p5/p6`：大概率 LAYERED 叠加链，按 corruption 模式处理

---

## 未来评估任务清单

- [ ] `tm-guoku-p2/p4/p5/p6` 分类（预计 LAYERED）
- [ ] `tm-neitang-p2` 分类
- [ ] `tm-three-systems-ext` 与 ui 关系
- [ ] 16 个 phase 文件全部分类（目前只评估了 2/16）
- [ ] `tm-patches.js` 按功能领域切分清单
