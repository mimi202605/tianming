# 天启七年新舆图历史补丁记录

日期：2026-05-13

## 背景

`C:\Users\37814\Downloads\ming-2________ming_2026-05-12.json` 的地块数量多于官方天启七年剧本的 `adminHierarchy` 覆盖范围。官方剧本只覆盖核心明朝行政区、后金、朝鲜、澳门、大员、马尼拉等少数域外势力；新地块地图还包含朵甘思、土默特、西域诸汗国、哈萨克、瓦刺、野人女真、日本、交趾、喀尔喀等区域。

为避免预览页出现空地块、空势力面板，新增历史补丁：

`web/data/scenario-supplements/tianqi7-ming2-historical-supplement.json`

构建脚本会优先读取官方剧本；官方剧本缺失时，再读取这份补丁。原始下载地图和正式官方剧本均未被直接改写。

## 覆盖范围

本次补齐 17 个原空壳陆地地块：

朵甘思宣慰司、鞑靼土默特部、叶尔羌、吐鲁番、哈萨克、北哈萨克、东哈萨克、瓦刺、苦兀（野人女真）、北山女真、北海道、本州、九州、四国、交趾、漠南诸部、喀尔喀蒙古。

新增或细分 11 个历史势力：

土默特蒙古、叶尔羌汗国、吐鲁番诸伯克、哈萨克汗国、瓦刺诸部、野人女真诸部、虾夷地与松前氏、日本幕府、大越黎郑阮格局、喀尔喀蒙古，以及补丁内的域外势力来源目录。

## 字段策略

史实方向字段：

`name`、`factionId`、`factionName`、`officialPosition`、`governor`、`regionType`、`dejureOwner`、`description`、`terrain`、`specialResources`、`byEthnicity`、`byFaith`、`bySettlement`、`leadingGentry`、`religiousSites`、`strategicValue`、`tradeRoutes`、`threats`、`recentDisasters`、`specialCulture`、`sourceRefs`、`dataConfidence`。

玩法估算字段：

`population`、`populationDetail`、`prosperity`、`taxLevel`、`economyBase`、`fiscalDetail`、`publicTreasuryInit`、`minxinLocal`、`corruptionLocal`。

补丁 JSON 顶部的 `dataConfidenceNote` 已明确标注：数值字段为游戏化历史估算；政权、领属、资源、冲突和人物字段据可核史实整理并带 `sourceRefs`。

## 构建输出

运行：

```powershell
node web/scripts/build-tianqi-preview-map.js
```

会更新：

`web/preview/img/ming-1582-map-data.js`

`web/data/maps/tianqi-ming2/tianqi-ming2.preview-data.js`

`web/data/maps/tianqi-ming2/tianqi-ming2.game-map.json`

`web/data/maps/tianqi-ming2/tianqi-ming2.admin-hierarchy.json`

`web/data/maps/tianqi-ming2/tianqi-ming2.scenario-fragment.json`

`web/data/maps/tianqi-ming2/tianqi-ming2.historical-supplement.json`

`web/data/maps/tianqi-ming2/tianqi-ming2.manifest.json`

当前校验结果：

`landRegionCount = 43`

`oceanRegionCount = 8`

`unboundLandRegionCount = 0`

## UI 影响

左键地块面板现在能显示补丁行政字段，例如叶尔羌的区划类型、主官、人口、财赋、威胁、聚落、宗教场所、来源标记等。

右键势力面板现在能显示补丁势力字段，例如土默特蒙古、叶尔羌汗国、日本幕府、大越黎郑阮格局等势力的首领、政权类型、领土、战略目标、兵力、经济、关系、史案字段。

## 后续接入建议

地图编辑器仍只负责地块几何、海陆、名称、颜色、拓扑。

剧本编辑器导入地图时，应提供一个“历史补齐层”选择：官方剧本优先，缺失地块自动套用补丁，再允许作者逐项覆盖。

正式游戏运行时不应读取预览页常量，而应读取剧本导出的 `map + adminHierarchy + supplementMeta`。

## 2026-05-13 官方剧本合并

按后续要求，补丁已不再停留为预览层，而是合入：

`scenarios/天启七年·九月（官方）.json`

合并脚本：

`web/scripts/merge-tianqi-historical-supplement.js`

导出脚本：

`web/scripts/export-official-scenario.js`

现在 `export-official-scenario.js` 默认会先从 `web/scenarios/tianqi7-1627.js` 导出基础官方剧本，再自动执行历史补丁合并。若只需要基础导出，可显式使用：

```powershell
node web/scripts/export-official-scenario.js --base-only
```

当前合并后的官方剧本数据：

`factions = 22`

`characters = 119`

`adminHierarchy.player.divisions = 17`

`adminHierarchy.dokham.divisions = 1`

新增行政组：`tumed`、`yarkand`、`turpan`、`kazakh`、`oirat`、`wildJurchen`、`matsumaeAinu`、`tokugawaJapan`、`daiViet`、`khalkha`、`dokham`。

新增人物 15 人：卜失兔汗、阿布达勒拉提甫汗、吐鲁番伯克、也昔木汗、拜巴噶斯台吉、黑龙江部酋、松前公广、虾夷诸酋、德川家光、德川秀忠、黎神宗、郑梉、阮福源、却图汗、土谢图汗衮布。

校验：

```powershell
node web/scripts/official-scenario-smoke.js
node web/scripts/build-tianqi-preview-map.js
```

最近一次结果：

`official-scenario-smoke` 通过。

`landRegionCount = 43`

`oceanRegionCount = 8`

`unboundLandRegionCount = 0`

字段审计：新增势力缺失字段数 0；新增人物缺失常用字段数 0。
