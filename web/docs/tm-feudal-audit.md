# tm-feudal.js audit (Phase 3·Codex 建议·Claude own)

date·2026-05-03 · status·**audit done·non-destructive·recommendation = 保留 + head note correct**

## 0·概览

| 项 | 值 |
|---|---|
| 文件 | tm-feudal.js |
| 行数 | 2,656 (head note 说 2596·略偏差) |
| 性质 | top-level functions (非 IIFE wrap·与 tm-economy.js 同 pattern) |
| load | index.html L410·editor.html L2849·smoke-office-dynastification L97 (33 assertions) |
| top-level functions / vars | **54** |
| 局部 IIFE sub-systems | 5 (CasusBelliSystem·TreatySystem·SchemeSystem·DecisionSystem·WorkerPool) |
| R130 历史 | 从 tm-military.js L2286-end 拆出 (Phase 2 之前·active) |
| 姊妹 | tm-military.js (战斗+行军+围城+补给+建筑) |

## 1·实际 sections (按 `// ===` 分隔符)

**head note 简化为 8 sections·实际 12 sections**·

| § | 行 | 内容 | 主要 functions / vars |
|---|---|---|---|
| §A | L21-160 | 封建管辖层级系统 (中国化) | AUTONOMY_TYPES·PERMISSION_MATRIX·deriveAutonomy·getAutonomyPermission·applyAutonomyToAllDivisions |
| §B | L161-553 | 封臣系统 | establishVassalage·breakVassalage·calculateTotalIncome·levyVassalArmies·updateVassalSystem·getAllVassals·getFeudalLevel |
| §C | L554-655 | 头衔体系数据 | getTitleLevels·TITLE_LEVELS·_normalizeOfficialRanks·_readEngineOfficialRanks·getOfficialRanks·OFFICIAL_RANKS·TITLE_CLASSES·inferTitleClass |
| §D | L656-1182 | 头衔操作 + Title 更新 | grantFief·revokeFief·grantTitle·revokeTitle·inheritTitle·promoteTitle·hasPrivilege·getHighestTitle·assignOfficialRank·updateTitleSystem |
| §E | L1183-1469 | **补给系统** (与 head note 不符·应单出节) | updateSupplySystem·produceSupplies·consumeSupplies·transportSupplies·checkSupplyShortage·getSupplyPromptInjection·createSupplyRoute·cutSupplyRoute·generateSupplyReport |
| §F | L1470-1847 | 铨选三层 | QuanxuanConfig·performQuanxuan·quanxuanInitialScreen·quanxuanRefinedSelection·quanxuanFinalDecision·generateQuanxuanReport·autoQuanxuanAndAppoint |
| §G | L1848-1937 | 军事 + 地图 update | updateMilitary·updateMap |
| §H | L1938-2043 | 战争意愿 (局部 IIFE) | WarWeightSystem |
| §I | L2044-2156 | CB 宣战理由 (局部 IIFE) | CasusBelliSystem |
| §J | L2157-2398 | 盟约条约 (局部 IIFE) | TreatySystem |
| §K | L2399-2453 | 阴谋系统 (局部 IIFE) | SchemeSystem |
| §L | L2454-2566 | 决断系统 (局部 IIFE) | DecisionSystem |
| §M | L2567-2656 | 工人池 (局部 IIFE) | WorkerPool |

**实际 13 sections (含 §M WorkerPool)·head note 8 sections·偏差 5·应 update head note**·

## 2·拆分判断

| 选项 | 评估 |
|---|---|
| **A·保留 single·update head note** | **推荐**·effort 低·effect 中 (清晰度提升)·避碎片 |
| B·按 §A-§M 拆 12-13 sub-file | **否决**·小文件杂·违 user mandate "小文件杂"·top-level fn 跨 § ref 难 |
| C·按 functional 域拆 4 sub-file (封建/title/铨选/战争) | risk 高·top-level functions 跨 § 调用频繁·extract 时 globals 易 break |

**结论·保留 single 文件·因 12 sections 都围绕"封建+军事附属"同一域·拆碎反而 fragment**·

## 3·sub-domain 关系 (非拆)

按 functional 分组·12 sections 实际 4 cluster·

| cluster | sections | 行数 |
|---|---|---|
| **封建管辖** | §A·§B (autonomy + vassal) | ~553 |
| **头衔体系** | §C·§D·§F (title + quanxuan) | ~1300 |
| **军事附属** | §E·§G·§H·§I·§L (supply + military + war + CB + decision) | ~700 |
| **外交动作** | §J·§K (treaty + scheme) | ~400 |

**这 4 cluster 共享 globals·拆 sub-file 必先 introduce import/export 系统·非 vanilla JS pattern·风险高**·

## 4·与 tm-tax-atomic §H 的关系 (R10 done 2026-05-04)

按 tm-tax-atomic.js head note·

```
§H L325-357 FEUDAL_HOLDING_TYPES + _tickFeudalHoldings → tm-feudal.js (existing)
```

**R10h (2026-05-04) done**·§H 已迁入 `tm-feudal.js` §N 段 (line ~2671 起·`global.FeudalCore.FEUDAL_HOLDING_TYPES` + `global.FeudalCore._tickFeudalHoldings`)·**tax-atomic.js 已删除·net -1 file**·

## 5·推荐 plan

### 现 round (Phase 3·non-destructive)

1. **update tm-feudal head note**·12 字段 (Domain·Status·Last Updated·Owner·Imports·Exports·Used by·Side effects·Test·Notes·章节导航 13 sections)
2. **non-action**·保留 single 文件·**non-destructive·zero risk**
3. write 本 audit doc

### Phase 5 (namespace 期)

- 评估·将 5 个局部 IIFE (WarWeight·CasusBelli·Treaty·Scheme·Decision·WorkerPool) 各 namespace 化·`TM.Feudal.WarWeight = ...`·**统一 namespace**
- 评估·top-level functions namespace 化·`TM.Feudal.establishVassalage = ...`·**渐进 deprecation 全局**·**effort ~2-4h**

### deferred (后续 patches slice)

- tax-atomic §H FEUDAL_HOLDING_TYPES + _tickFeudalHoldings → 入 tm-feudal §A 或 §B (当真 redistribute tax-atomic 时·~30h)

## 6·风险

| 风险 | 应对 |
|---|---|
| 修 head note 影响下游 | head note 是 comment·不影响 runtime·**zero risk** |
| top-level functions 跨 ref·拆 sub-file 易 break | **不拆**·single file |
| WorkerPool 等局部 IIFE rename 时 break | 不动·当前 audit only |

## 7·效果总结

- **0 文件减少 (audit only·non-destructive)**
- **head note 13 sections 准确化**·清晰度提升
- **正式记录·tm-feudal 不应 Phase 3 拆·应 Phase 5 namespace 化**·避免后续 mistake

— end of tm-feudal-audit.md
