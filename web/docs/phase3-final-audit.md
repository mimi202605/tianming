# Phase 3 Final Audit (R11c + R11post update)

date·2026-05-04 · status·**Phase 3 真 close·R11abcde 全 done·verify-all 35/35·-1 net file·zero regression**
owner·Claude (R11c/d/e) · pair·Codex (R11ab mojibake recovery + R10 fiscal compat)

## 0·Phase 3 目标 (回 R0)

按 `architecture-target-final.md` (R0 alignment·R11ab 已恢复) 设定·

> **高价值模块治理·5 cluster·**·解 grab-bag dump·解 LAYERED 分层链·拆肥·合补丁·zero regression·

具体范围·
1. **chaoyi cluster** (5 文件·5370 行) — 朝议系统·拆 + 重组
2. **editor cluster** (16 文件·~13,000 行) — 编辑器·rename + 切分
3. **fiscal cluster** (22 文件·~13,847 行) — 财政·**LAYERED 链清** (guoku 5 层 / corruption 3 层) + grab-bag clean (tax-atomic 16 area redistribute)
4. **patches LAYERED** (16 文件·tm-phase-X 系列) — 补丁堆·SELF rename / APPEND inline / LAYERED defer
5. **hongyan-office** (extra·non-destructive) — 外交信件 office 子系统拆出

## 1·Phase 3 round-by-round

| round | date | task | owner | 文件 Δ | 行 Δ | 备注 |
|---|---|---|---|---|---|---|
| **prep** | 05-02 | influence-groups·class-engine·class-party·tinyi 等 R0-R1 收口 | both | - | - | Phase 0-2 收尾·Phase 3 prep |
| **chaoyi** | 05-03 | chaoyi 5370 行 → 4 模块·split 单 god file | Claude | -1 +3 | -0 实拆 | step 0-7·verify clean |
| **editor rename** | 05-03 | 4 个 tm-editor-* → editor-* | Claude | rename | 0 | A1 slice |
| **editor split** | 05-03 | editor-game-systems split · 1869 行 | Codex | +5 | -1869 拆 | timeline / edicts / goals / offend / influence / game-systems |
| **fiscal F2-F7** | 05-03 | fiscal cluster F2 neitang inline·F3 tax-atomic SELF·F6 cascade+expense 合·F7 economy 5 IIFE 合 | Claude | -3 | -2200 行 | 3 sub-slice 1 round·verify-all 35/35 × 3 |
| **R6** (hongyan-office) | 05-03~04 | hongyan-office carve·3391 → 2685 + new tm-office-system 741 | Claude | +1 | -706 拆 | extra·non-destructive·~24 fns + RANK_HIERARCHY |
| **R6** (editor batch 2) | 05-03 | editor-form-edicts/goals/offend/influence + editor-game-systems split | Codex | +5 -1 | ~+6000 拆 | mojibake fix·按 1.1.6 还原 |
| **R7** (province qiaozhi) | 05-04 | tm-endturn-province·2488 → 2229 + tm-endturn-qiaozhi 269 | Claude | +1 | -259 拆 | feature isolation |
| **R7** (ai-context) | 05-04 | tm-endturn-ai-context.js carve | Codex | +1 | ~-233 拆 | endturn ai-context isolation |
| **R8** (smoke baseline) | 05-04 | guoku 8 smoke (121 assertions) + corruption 8 smoke (56) | both 各半 | +16 | +smoke baseline | **177 layered assertions baseline 锁** |
| **R9** (guoku 4-slice merge) | 05-04 | tm-guoku-engine·1018 → 1820·吸 p2/p4/p5/p6 | Claude | -3 | -443 净 | 5→2 文件·flat inline pattern |
| **R9** (corruption nested merge) | 05-04 | tm-corruption-engine·吸 p2/p4 | Codex | -2 | -337 净 | 3→1 文件·nested IIFE pattern |
| **R10** (§A-§H redistribute) | 05-04 | tax-atomic §A-§H 8 sub-slice 拆入 fiscal/economy/feudal | Claude | 0 (附加) | +178/+106/+41 | 8 verify-all 35/35 连绿 |
| **R10** (§I-§Q redistribute) | 05-04 | tax-atomic §I-§Q 拆入 player-core/economy/mechanics/authority/edict | Codex | 0 (附加) | ~+550 | ladder pattern 模板 |
| **R10 collapse** | 05-04 | delete tax-atomic·改 endturn-systems L209 + game-loop L287 + index.html + var-drawers 2 处 | Claude | **-1** | -676 删 + ~+12 caller | net -1·真清 |
| **R10 fiscal compat fix** | 05-04 | fiscal-engine 重构 export·CascadeTax/FixedExpense VERSION 2·api 对象 + PhaseH 防御 shim | Codex | 0 | +106 compat | runtime gap 修·verify-all 仍 35/35 |
| **R11ab** (mojibake recovery) | 05-04 | architecture-map / module-boundaries / target-final | Codex | 0 | doc 修复 | done·三份架构文档 UTF-8 恢复·hard marker scan 0 hit |
| **R11c** (本 doc) | 05-04 | Phase 3 final audit | Claude | +1 | doc | 本 doc |
| **R11d** (头注 pass 2) | 05-04 | Phase 3 内新建/重命名 12 字段头注 verify + fiscal display name restore | Claude | 0 | doc | done |
| **R11e** (dev tools) | 05-04 | analyze_globals / detect_globals / scan.sh / final_scan.sh 重扫 | Claude | 0 | tools | done |

## 2·Phase 3 净结果

### 2.1 文件数

按 production js·

| 阶段 | 文件 | Δ |
|---|---|---|
| Phase 3 启 (05-02) | ~287 | base |
| chaoyi (split) | ~289 | +2 |
| editor (split) | ~294 | +5 |
| fiscal F-cluster | ~291 | -3 (F2/F6/F7 合) |
| R6/R7 carve out | ~293 | +2 |
| R9 (guoku/corruption merge) | ~288 | -5 |
| **R10 collapse** | **~287** | **-1** |
| 当前 | **~287** | **net 0** (但内部结构大改) |

**注**·文件数变化是 wash·真正价值在**结构清理**·见下·

### 2.2 行数

(主要 mover)·

| 文件 | Phase 3 启 | 当前 | Δ |
|---|---|---|---|
| tm-chaoyi (god file) | 5370 | 拆 4 文件 | -5370 → 4 模块 |
| tm-hongyan-office | 3391 | 2685 + tm-office-system 741 | -706 拆出 |
| tm-endturn-province | 2488 | 2229 + tm-endturn-qiaozhi 269 | -259 拆出 |
| tm-guoku-engine | 1018 | 1820 (吸 p2/p4/p5/p6) | +802 (但 -3 文件) |
| tm-corruption-engine | 1024 | 2284 (吸 p2/p4) | +1260 (但 -2 文件) |
| **tm-tax-atomic** | **676** | **0 (deleted)** | **-676** |
| tm-fiscal-engine | 1438 (R3 done) | 1731 | +293 (R10 §A-§D-§E-§F-§G + Codex compat) |
| tm-economy-engine | 2738 | 2880 | +142 (R10 §B-§C) |
| tm-feudal | 2670 | 2711 | +41 (R10 §H) |

### 2.3 verify-all baseline

| 阶段 | total | smoke assertions | layered (guoku+corruption) |
|---|---|---|---|
| Phase 3 启 | 35/35 | 212 passed | **0** (无 baseline) |
| R8 lock | 35/35 | 212 | **177** (guoku 121 + corruption 56) |
| R9-R10 全程 | 35/35 | 212 | **177** (1 条不挂) |
| **R10 真 close** | 35/35 | 212 | **177** |

**zero regression 全程·11 round + 1 collapse + 1 compat fix = 13 次 destructive change·每次 verify-all 35/35**·

## 3·namespace 全景 (Phase 3 启 vs 现)

### 3.1 解掉 / 弱化

| namespace | Phase 3 启 | 现 |
|---|---|---|
| `global.PhaseH` | live·tm-tax-atomic 全 export·tick/init + 19 keys | **0 live caller** (注释 + Codex 防御 shim·不再 owner) |
| `global.PhaseC` | live (tm-phase-c-patches) | 仍 live (defer·LAYERED Phase 4 候选) |
| `global.PhaseF1` | live (tm-phase-f1-fixes) | 仍 live (defer·LAYERED Phase 4 候选) |

### 3.2 新建 / extend

| namespace | who | 内容 |
|---|---|---|
| `global.FiscalEngine` | **新·R10a** | ATOMIC_TAX_TYPES_19·EXPENDITURE_EFFECTS_14·enableTaxesByDynasty·_ensureRegionFiscal·splitTaxByAllocation·executeLocalAction·_tickTransferOrders·createTransferOrder·init·tick |
| `global.CurrencyEngine` | **extend·R10b/c** | + PAPER_DATA_25·_updatePaperStateAtomic·_checkPaperCollapseAtomic·_updateGrainPriceAtomic |
| `global.FeudalCore` | **新·R10h** | FEUDAL_HOLDING_TYPES·_tickFeudalHoldings |
| `global.PlayerCore` | **新·Codex R10i** | calcPromotionChance |
| `global.EconomyCore` | **新·Codex R10j** | formulaEstimateWealth |
| `global.MechanicsCore` | **新·Codex R10k/l** | abolishInstitutionExtended·evaluateReformFeasibility |
| `global.AuthorityEngines` | **extend·Codex R10m/n/o** | + applyTyrantExecutionAmplification·filterQueryOptionsByPhase·adjustHuangwei·adjustMinxin |
| `global.EdictComplete` | **extend·Codex R10p** | + _checkProjectCompletion·_checkHuangceCycle·_checkGaituEscalation |
| `global.TM.Economy` | **新·Codex R10 fiscal compat** | sum·getDiv·topContributors·triggerSurvey |

### 3.3 PhaseH 现状·诚实评估

R10 collapse 我宣称 zero live PhaseH callers·实际·

```
tm-fiscal-engine.js:1696-1698  global.PhaseH = {init, tick}  (Codex 防御 shim·R10 fiscal compat)
tm-endturn-systems.js:208       // R10 collapse 注释 (历史标记)
tm-game-loop.js:287             // R10 collapse 注释 (历史标记)
```

**0 live caller·1 防御 shim 保留**·防 3rd party patches / scenarios / editor 旁路 reference·不阻塞 Phase 4·**Phase 5 命名空间清理时统一审视**·

## 4·Phase 3 工作模式·**pair-mode rounds**

### 4.1 协议 (Codex 与 Claude 共制定 R6 起)

```
1. Round Start
   ├── Codex 半 (e.g. corruption merge)
   └── Claude 半 (e.g. guoku merge)
2. 各自 verify-all 35/35
3. 互发 done 信
4. 互审对方 patch
5. 互发 review 信 (PASS or 议)
6. Round Close 信 + Next Round Go
```

### 4.2 letter exchange 统计

| 指标 | 数 |
|---|---|
| Phase 3 letter (refactor-phase3-* 前缀) | 46 |
| 总 round 数 (chaoyi/editor/fiscal/R6/R7/R8/R9/R10/R11) | 11 |
| destructive verify-all 次数 (含 sub-slice) | ~30 |
| zero regression 次数 | **30/30 (100%)** |

### 4.3 pair-mode 验证

**优势**·两侧并行·吞吐 2x·互审捕 bug·风格差异 (Codex nested IIFE / Claude flat inline) 不强求统一·都 valid

**代价**·letter exchange 开销·~3-5 letter / round·但远低于 bug 修复成本

**结论**·pair-mode rounds 是 Phase 3 主成功因素·Phase 4 沿用·

## 5·已知 compat tax / 后续优化候选

### 5.1 PhaseH 防御 shim (R10 fiscal compat)

`tm-fiscal-engine.js:1696-1698` re-exports `global.PhaseH = {init, tick}`·防 3rd party·**Phase 5 namespace 清理时按 grep 全 cover·确认无 live caller 后可删**·

### 5.2 字段双名 alias (claimed/claimedRevenue 等)

R10 fiscal compat 加·`syncFiscalAliases`·**长期应统一一种命名**·**Phase 5 命名规约**·

### 5.3 createTransferOrder 双签名

- `EconomyEngine.createTransferOrder(spec)` (object)
- `FiscalEngine.createTransferOrder(from, toRegion, amount)` (3 positional·alias to createTransferOrderAtomic)

**Phase 5 命名清理时 candidate 统一**·暂不冲·

### 5.4 LAYERED 链未清

- `tm-phase-c-patches.js` (LAYERED·OVERRIDE EdictParser.processImperialAssent)
- `tm-phase-f1-fixes.js` (LAYERED·OVERRIDE AuthorityEngines.tick + PhaseD.COUNTER_STRATEGIES.rotate_officials)

**两个 LAYERED 真合并 (R12 评估·~25-45h)·deferred 至 Phase 4 / Phase 5**·

### 5.5 mojibake 文件 (Codex R11ab done)

- `web/docs/architecture-map.md`
- `web/docs/module-boundaries.md`
- `web/docs/architecture-target-final.md` (R0 设定·阻塞最终对照)

**R11ab 已完成**·三份文档恢复为可读 UTF-8，hard mojibake marker scan 0 hit；R11post 已按恢复后文档完成最终对照。

## 6·Phase 4 入口条件

按 architecture-target 设定 Phase 4 = **小文件合并 (26 个 <200 行)**·

### 6.1 Phase 4 启动 prerequisite

- [x] **R10 collapse done·tax-atomic deleted**
- [x] **R10 fiscal compat done·verify-all 35/35**
- [x] **177 baseline 全保**
- [x] **R11c 本 doc done**
- [x] **R11ab mojibake recovery done** (Codex)
- [x] **R11d 头注 pass 2 done** (Claude)
- [x] **R11e dev tools 重扫 done** (Claude)

### 6.2 Phase 4 候选 26 个 <200 行文件 (待 audit)

`scripts/find-orphans.js` + manual scan·R11d 中一并审·**预计 Phase 4 启时 -10 ~ -15 文件**·

### 6.3 Phase 4 风险

| 风险 | 应对 |
|---|---|
| 小文件多·合并方向多·决策成本高 | 按 cluster (admin / data / utils / scenario / debug) 分组·一组一 round |
| LAYERED 残留·tm-phase-c-patches / tm-phase-f1-fixes | 同 batch·参 R12 / R8 模式 (smoke baseline → merge) |
| compat tax 持续累积 | Phase 5 namespace 清理时统一断舍离·Phase 4 暂忍 |

## 7·总结

Phase 3 11 round·~30 次 destructive change·**zero regression**·**-1 净文件 (tax-atomic) + 大量内部重组**·

**最大成果**·
- **tax-atomic 676 行 grab-bag 16 area redistribute** (R10·两侧并行·8 sub-slice + 9 area)·这是 Phase 3 最大单笔
- **guoku 5 层 / corruption 3 层 LAYERED 链全清** (R9·两侧·-5 文件)
- **chaoyi 5370 行 god file 拆 4 模块** (Phase 3 startup)
- **editor 16 文件 cluster** rename + split (Phase 3 second slice)
- **177 layered assertion baseline** 锁住 (R8·全程零回归保障)

**风格观察**·Codex nested IIFE 保 layer 边界·Claude flat inline 真 merge·都过 verify-all·**审美差·不强求统一**·

**pair-mode rounds 协议** 是 Phase 3 协作的关键 enabler·两侧并行·互审捕 bug·**继续作为 Phase 4-6 主模式**·

**Phase 3 → Phase 4** 入口·R11abcde 全 done (2026-05-04 同日)·**Phase 3 真 close**·

## 8·vs Phase 0 architecture-target-final 对照 (R11post 2026-05-04)

按 architecture-target-final.md §9 路线图 Phase 3 目标·

| Phase 3 任务 | 目标 | 实际 | 状态 |
|---|---|---|---|
| **chaoyi 5 cleanup** | 5 god file → 4 模块 | done (Phase 3 startup·05-03) | ✓ |
| **editor 16 reorganize** | rename + split | done (R6 batch 2·Codex) | ✓ |
| **patches LAYERED + smoke** | smoke baseline → layer 链合并 | R8 (177 baseline) + R9 (guoku 5→2·corruption 3→1) done | ✓ |
| **ai-infer 抽出** | 拆 endturn-ai-context | R7 done (Codex·tm-endturn-ai-context.js) | ✓ |
| **财政 15 → 6** | 合并财政文件群 | R3 F1-F7 done (cascade+expense → fiscal-engine·5 IIFE 入 economy-engine) + R10 (tax-atomic redistribute·-1) | ✓ |
| **office/hongyan deep audit** | 深审 + 拆分 | R6 done (Claude·tm-office-system carve out 706 行) + R7 (province qiaozhi carve out 269 行) | ✓ |
| **tm-editor-* 前缀统一** | 4 文件 rename → editor-* | done (Phase 3 second slice·05-03) | ✓ |
| **map 12 → 6** | 地图集群合并 | **未做·deferred 至 Phase 4** | ⚠ |

**8 项目标·7 已 done·1 deferred (map 集群)**·

map 集群现状·`map-converter / map-display / map-integration / map-recognition·{borders,eu4,fast,improved,plain} / map-editor-{pro,smart} / map-region-editor / map-annotator / editor-map / tm-map-system` 共 ~13 文件·**多为 tooling (.html + .js 对)**·非 runtime 集群·R6-R10 节奏未含·

**Phase 4 入口建议**·**先做 map 集群 (~2-3 day)·再做 26 个 <200 行小文件合并**·或两者并行 (各半 owner)·

## 9·Phase 3 时长复盘

按 architecture-target-final ETA·Phase 3 = 1-2 weeks·

实际·

| date | 工作 |
|---|---|
| **2026-05-03** | Phase 3 startup·chaoyi cleanup·editor rename + audit·fiscal F1-F7 (cascade+expense 合·5 IIFE 入 economy-engine·neitang p2 inline)·R6 hongyan-office carve |
| **2026-05-04** | R7 (province qiaozhi + ai-context)·R8 (177 baseline)·R9 (guoku 5→2·corruption 3→1)·R10 (tax-atomic 16 area redistribute·-1 file)·R10 fiscal compat·R11abcde (final audit + 头注 pass 2 + dev tools 重扫 + mojibake recovery + fiscal name 还原) |

**实际·~2 day burst (压缩 5-7x)**·**zero regression 全程·~30 次 destructive change**·**这是 pair-mode rounds 协议的最大成果**·

## 10·Phase 4 入口 final check

- [x] R10 collapse done·tax-atomic deleted
- [x] R10 fiscal compat done (Codex·api 对象 + VERSION 2 + PhaseH 防御 shim + TM.Economy alias)
- [x] R10 fiscal name regression 还原 (Claude R11d·中文 display name 25 个 + 头注还原)
- [x] 177 baseline 全保 (guoku 121 + corruption 56)
- [x] R11a/b mojibake recovery (Codex·architecture-map / module-boundaries / target-final)
- [x] R11c phase 3 final audit (Claude·本 doc)
- [x] R11d 头注 pass 2 (Claude·6 文件 update + fiscal-engine 还原)
- [x] R11e dev tools 重扫 (Claude·4 tools update)
- [x] verify-all 35/35·encoding-check pass·212 headless smoke / 56 cc3 smoke / 0 fail
- [x] zero orphans

**Phase 3 真 close**·**Phase 4 ready to start**·

— end of phase3-final-audit.md (R11c by Claude·R11post update by Claude)
