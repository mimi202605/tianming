# 省份/地块面板 · 字段体检表（2026-06-20）

> 目标：把"省份/地块方志"面板（八卷·`renderRegionBook` @ `web/phase8-formal-map.js:2967`）每个字段拉出来逐个审，揪出"显示了但引擎不消费"的死字段，按 **结构硬·氛围软** 分级活化。
> 命门：硬核×自由——面板上每个数字都该是"活账的真值"，而非开局冻结的剧本静数。

## 审核方法 · 五态

| 态 | 含义 | 判废依据 |
|---|---|---|
| **A 显示** | 面板渲染了 | 八卷都✓ |
| **B 数据** | 剧本填了值 | 空值不显示（`hasDisplayValue` 已守） |
| **C 被读** | 引擎拿它算账/决策/喂AI | grep 机制引擎层（排除序列化/编辑器/纯渲染） |
| **D 被写** | 每回合会更新 | grep 赋值端在 endturn/engine |
| **E 源活否** | 面板读的是**活对象**还是**静态 `data`** | 见数据流 |

**判定分类**：【活】C+D+E全有 ｜【半死·只读不写】C有 D无（影响推演但自己永不变）｜【半死·活值死显】D有但 E死（引擎在更新某活账，面板却读静态副本/异名字段）｜【死·纯装饰】C无。

## 数据流（已查实 · `phase8-formal-map.js:2141 regionBundle`）

```
面板字段值 ← b (regionBundle)
b.data = assignKnown({}, base, liveDivision, liveStats)   // assignKnown 非白名单, live 覆盖 static (:462-471)
   base        = r.admin + r.data            // 静态剧本·开局后不回滚
   liveDivision= findLiveAdminDivision(r)     // GM.adminHierarchy 节点(省节点开局冻结, 活的是叶子)
   liveStats   = findLiveProvinceStats(r)     // GM.provinceStats[叶键] (省级常空)
b.pop/b.fiscal/b.army/b.treasury 从 live 派生
唯一"活源补丁" = liveRegionVitals(r,liveDivision) (:619-659): walk 到活叶子, 人口加权聚合
   minxin/corruption/prosperity/unrest + 求和 population/farmland/commerceVolume, 置 firstValue 首位
```

**E 态总闸**：字段只有进了 `liveDivision`/`liveStats`/`vitals` 才显活值；否则永远显剧本静数。"活值死显"病根 = **引擎在另一个对象/另一个字段名上跑活账，面板读的是静态副本**。

---

## 总判定一览（八卷健康度）

| 卷 | 字段数 | 活 | 半死 | 死 | 健康度 |
|---|---|---|---|---|---|
| 一 户口志 | ~18 | 6 | 8 | 4 | ⚠️ 多"活值死显"（户/丁/族群账落在面板读不到的 P.byRegion） |
| 二 役政志 | 13 | **13** | 0 | 0 | ✅ **全活·标杆**（`tm-renli.js` 单一真相源） |
| 三 财赋志 | ~15 | 8 | 4 | 3 | ⚠️ 4个"改一行翻活"bug（漏写/错配/标度） |
| 四 军备志 | 14 | 4 | 3 | **7** | 🔴 **死字段重灾区**（旧剧本军情词，真账已迁 GM.armies） |
| 五 职官志 | 11 | 5 | 4 | 2 | 🟡 主官/贪腐/科举已活，官缺/政令半死 |
| 六 风物志 | ~24 | 2 | ~16 | 4 | 🟡 **物产组全"半死·只读不写"**（开局冻结，本卷正题） |
| 七 营造志 | — | ✅活 | | | `BuildingWorks.tick` 每回合扣库银/改 economyBase/增减乘子 |
| 八 状态 | — | ✅活 | | | `RegionStatus.tick` econPct乘税/minxinPerTurn摊民心 |

---

## 卷一 · 户口志（面板 `:3001-3016`）

| 字段 | 面板标签 | 判定 | 关键证据 | 活化（尺度·接法） |
|---|---|---|---|---|
| `data.population`/`pop.mouths` | 在册口数 | 活 | 写 endturn-apply:3931 叶+:3939 provinceStats；vitals popSum:652 | — 已活 |
| `pop.households` | 在册户 | **半死·活值死显** | huji 活账写 `P.byRegion[rid].households`(huji-engine:487)，面板读叶/provinceStats，两账不通 | 结构硬·endturn 收尾把 P.byRegion.households 同步回叶 populationDetail |
| `pop.ding` | 丁口 | **半死·活值死显** | 同上，活账在 P.byRegion(huji-engine:488)，面板读不到 | 结构硬·同 households 一并同步 |
| `pop.fugitives` | 逃户 | 活 | renli 直写叶 pd.fugitives(renli:296/376/634) | — 已活 |
| `pop.hiddenCount` | 隐户 | 活 | renli 直写叶 pd.hiddenCount(renli:301/647) | — 已活 |
| `data.carryingCapacity` | 承载上限 | **半死·只读不写** | fiscal 当税基读(fiscal-engine:816/853)，**从不回写 currentLoad** | 结构硬·让 renli/huji 每回合回写 carryingCapacity.currentLoad，闭合"逼近承载→增长放缓" |
| `data.baojia` | 保甲 | **死·双账分裂**✓核实 | 面板显对象 `data.baojia`，引擎读标量 `baojiaUnits`(huji-engine:551)，字段名都不同 | 结构硬·面板改显 baojiaUnits 覆盖率，或反算回写消灭双账 |
| `data.prosperity` | 繁荣 | 活 | vitals 加权聚合叶:650 置首位:2378 | — 已活 |
| `data.wealth` | 财富 | 活 | endturn-province:159 每回合写 provinceStats | — 已活（与 prosperity 高度同义） |
| `data.development` | 发展 | 活·**语义冗余** | =prosperity×0.8 派生(endturn-province:44)，无独立硬机制 | 软·与 prosperity/wealth 三选一去重，或赋独立含义 |
| `data.unrest` | 不稳 | 活 | 写 endturn-apply:3942；读 63 文件 | — 已活（覆盖最广·健康） |
| `data.byGender/byAge/byEthnicity/byFaith` | 性别/年龄/族群/信仰 | **半死·活值死显** | huji/ethnic 硬用（多样性压力→逃户 huji:567，丁男服役 ethnic:442）但读 P.byRegion 副本，面板 data.byXxx 静态 | 氛围软·**它们早已不是装饰**，聚合 P.byRegion 回 data 供显示 |
| `data.bySettlement` | 聚落 | **死·纯装饰** | 仅渲染+文字化，无机制 | 氛围软·喂 AI 城乡结构（影响商税/民变叙事） |
| `data.religiousSites` | 宗教场所 | **死·纯装饰** | 全项目无引擎读 | 氛围软·喂 AI 地方信仰场景 |
| `classPressureForRegion` | 阶层压力 | 活 | 直读 GM._classMinxinBridgeLedger 活账(:891) | — 已活 |

---

## 卷二 · 役政志（面板 `:3122-3155`）—— ✅ 全活·标杆，无需活化

13 字段全活：役负率/地力/水利/在耕田亩/抛荒/粮产/缺粮/督抚奏报/丁分配/册载丁/优免丁/诡寄丁/现行则例。
数据源 `GM.renli.byRegion[rid]` 每回合更新（`tm-renli.js` 单一真相源契约严谨），面板直读=E全活。**督抚奏报**(renli:902 按 danger 粉饰真值)是官民信息差设计亮点。**可作其余卷活化的范式参考。**

---

## 卷三 · 财赋志（面板 `:3017-3033`）

| 字段 | 面板标签 | 判定 | 关键证据 | 活化（尺度·接法） |
|---|---|---|---|---|
| `b.fiscal.claimedRevenue` | 应征 | 叶活/**省级活值死显** | 写叶 fiscalDetail(minxin:248)，父节点上卷只写 n.fiscal 不写 fiscalDetail | 结构硬·父聚合也写 fiscalDetail |
| `b.fiscal.actualRevenue` | 实征 | 活 | province.taxRevenue 每回合写(endturn-province:218) | — 已活 |
| `b.fiscal.remittedToCenter` | 起运中枢 | 叶活/**省级活值死显** | 同应征·层级错配 | 结构硬·同应征 |
| `b.fiscal.retainedBudget` | 留用地方 | **半死·活值死显**✓核实 | minxin-hard-links:248-253 段**漏写 fd.retainedBudget**，叶子省级全死显 | 结构硬·**补一行 `fd.retainedBudget=...`** 即活 |
| `b.fiscal.compliance` | 合规率 | 活·**标度bug**✓核实 | 写 fiscalDetail(minxin:252 `×100`→0-100)，fiscal-engine 用 0-1，面板 pctValue 可能错乱 | 结构硬·**统一标度** |
| `b.fiscal.skimmingRate` | 截留率 | 活 | 写 fd.skimmingRate(minxin:251) | — 已活 |
| `b.fiscal.autonomy` | 财政自主 | **死·字段名错配** | 面板读 `autonomy`，引擎算税用 `autonomyLevel`(fiscal-engine:1058)，二者不通 | 结构硬·**对齐字段名**（面板改读 autonomyLevel 或引擎镜像） |
| `data.taxBurden` | 税负 | **死·字段孤立** | 税负语义由 taxLevel 承载，taxBurden 字段无引擎读写 | 软或删·若留则由 taxLevel+合规率派生 |
| `data.taxLevel` | 税级 | 半死·只读不写 | endturn-province:210 重×1.3/轻×0.7 算税 | — 合理（税级本应玩家定） |
| `b.treasury.money/grain` | 库藏银/粮 | 活 | military:2642-2643 ps.treasury 每回合 += | — 已活 |
| `b.treasury.cloth` | 库藏布 | **半死·活值死显** | military:2619 ps.treasury 只建 {money,grain} **无 cloth**，活值困在 publicTreasury.cloth.stock 面板不读 | 结构硬·补 ps.treasury.cloth 或面板改读 publicTreasury |
| `b.fiscal.moneyOutput/grainOutput` | 本回合银/粮产 | 活·**条件性** | endturn-province:283 写，但**仅当配 moneyRatio/grainRatio**(否则空白) | 结构硬·无配置时按默认比例兜底拆分 |
| `_magnateLabel(b.liveStats)` | 豪强 | 活 | magnatePower 每回合涨落(region-magnate:53)、瞒税:60、挂状态卡乘岁入:156 | — **全卷最硬核·活化范本** |

---

## 卷四 · 军备志（面板 `:3034-3059`）—— 🔴 死字段重灾区

| 字段 | 面板标签 | 判定 | 关键证据 | 活化（尺度·接法） |
|---|---|---|---|---|
| `b.army.liveArmies` | 活军卡 | 活 | GM.armies 按地块名索引(:2135)，回合更新 morale/supply | — 已活·全卷唯一真活账 |
| `data.garrison`/`troops` | 驻军 | 活 | 活军合计覆写(:2304)，静态值仅兜底 | — 已活 |
| `data.militaryRecruits` | 可募兵源 | 活 | endturn-province:238 逐回合重算+建筑加成 | — 已活 |
| `data.armyPressure` | 军压 | **死·纯装饰** | 引擎零读零写，仅 armyViewScore 渲染 | 结构硬·endturn-province 按驻军缺口+邻接敌势结算 0-100，留用账月耗随档浮动 |
| `data.fortification` | 城防 | **死**（被 fortLevel 取代） | 区域 data.fortification 无引擎读；fortLevel 才活(building-works:55 写/military:1176 守军乘数) | 清理·删 data.fortification，UI 留 fortLevel 档 |
| `data.commander` | 主将 | 半死→死（区域级冗余） | 战斗用 army.commander，区域 commander 无引擎读 | 软·投影活军卡 commander，删区域级 |
| **`data.borderRisk`** | 边警 | **死·纯装饰**✓核实(grep=0) | 全 tm-*.js 零命中，AI 开战对边境完全盲视 | 结构硬·endturn-province 按接壤敌势结算→faction-action-engine 读作攻击软肋/烽燧预警 |
| **`data.warRisk`** | 战事风险 | **死·纯装饰**✓核实(grep=0) | 零命中，面板已与 borderRisk 合显(:3054) | 合并·并入 borderRisk，勿单立 |
| `data.supply` | 补给 | 半死·活值死显 | 真账在 army.supply(military:122) army级，区域字段死 | 结构硬·显"驻军活军补给最坏值"或删 |
| `data.navy` | 水师 | **死·纯装饰** | 区域 navy 零读（引擎 navy 是募兵成本常量，无关） | 结构硬·并入活军卡(水师也是 GM.armies 一支) |
| **`data.coastalDefense`** | 海防 | **死·纯装饰**✓核实(grep=0) | 零命中 | 结构硬·building-works 加水寨建筑写+followup 沿海袭击读抵损；与 navy 合一 |
| `data.threats` | 威胁 | 半死→死（区域级） | 真账是势力级 aiStrategy.threats(faction-npc:680)，区域 threats 无读 | 软·投影邻接敌势喂 AI |
| `data.strategicValue` | 战略价值 | **死·纯装饰**✓核实 | 全 tm-*.js 零命中 | 结构硬·faction/npc-decision 攻守目标排序权重（只读即转半死，改动最小） |

**核心缺口**：军备死字段同源——军事真账已迁 `GM.armies` 活军 + `division.fortLevel`，这些区域静态军情词引擎从未接管。比"显示死值"更深的是 **AI 开战决策对地块边境/战略属性完全盲视**——边镇与腹地在 AI 眼里无差别。

---

## 卷五 · 职官志（面板 `:3060-3072`）

| 字段 | 面板标签 | 判定 | 关键证据 | 活化（尺度·接法） |
|---|---|---|---|---|
| `data.governor/official` | 主官 | 活 | regionBundle:2152-2173 覆盖 live；endturn-province:262 读 benevolence 驱动贪腐 | — 已活 |
| `data.officialPosition` | 官职 | 活 | regionBundle:2174-2189 覆盖 live | — 已活 |
| `data.officeVacancy` | 官缺 | **半死·只读不写** | field-pipelines:53 读官缺→执行率 -min(0.24,N×0.08)，**无写口** | 结构硬·**只差一个写口**：任免/officeTree 把空缺计数写 div.officeVacancy，既有惩罚立即生效·最高性价比 |
| `data.corruption` | 贪腐 | 活 | 硬链最完整：减实征(fiscal:1020)、+截留(minxin:229)、写 endturn-province:244/262 | — 已活（owner 想要的"贪腐→截留"已存在） |
| `data.policyExecution` | 政令执行 | 半死·只读不写 | 被活账 localExecutionRate 架空(field-pipelines:43 优先) | 结构硬·面板改显 policyExecRate(div).rate 真实活算值，或删字段统一走硬链 |
| `data.localFaction` | 地方派系 | **死·纯装饰** | division 级 party 零引擎读 | 氛围软·喂 AI 地方党派根基 |
| `data.leadingGentry` | 士绅 | **死·纯装饰** | 仅剧本+编辑器，零引擎读 | 氛围软·喂 AI 民变/加派/抗税情节 |
| `data.academies` | 书院 | 半死·活值死显 | 科举读运行态 `_schoolNetwork.academies`(keju-school-network:72)，**不读** division.academies | 软/硬·开局 seed 同源，或面板改显 _schoolNetwork |
| `econ.kejuQuota` | 科举解额 | 活 | endturn-province:1421 教育支出、书院增减(keju-school-network:804)、人物诞生+1 | — 已活 |
| `econ.imperialAssets` | 官府资产 | 半死·活值死显 | neitang:127 按资产生内帑岁入，但**数量永不随游戏变化**(fiscal:831 仅初始化) | 结构硬·兴造/政策增减资产数量，变可经营活资产 |
| `data.note` | 备注 | 死·设计本如此 | 纯文本注记 | 豁免·可拼进 AI 地方感知 |

---

## 卷六 · 风物志（面板 `:3073-3091`）—— 🟡 物产组本卷正题

**核心结论（✓核实 fiscal-engine:820-842）**：除 `farmland` 外，所有物产字段是 **`if (typeof eb.X!=='number') eb.X=tags×人口` 懒初始化——开局算一次后冻结**，每回合被当税基**读**（taxBase:1006-1010）但永不重算。面板显的是开局静数。

| 字段 | 面板标签 | 判定 | 活化（尺度·接法） |
|---|---|---|---|
| `econ.farmland` | 耕地 | 叶活/省级死显 | 结构硬·叶子已活(_settleLandFlow 兼并/开垦/清丈)；economy 合并接 vitals 聚合治省级 |
| `econ.commerceVolume` | 商贸 | 半死·只读不写 | 结构硬·**随人口/繁荣每回合重算**（现人口涨商税不涨，最违和） |
| `econ.commerceCoefficient` | 商系数 | 半死·只读不写 | 结构硬·随 prosperity 刷新 |
| `econ.saltProduction` | 盐课 | 半死·只读不写 | 结构硬·接盐场建筑/灾异调产量 |
| `econ.mineralProduction` | 矿课 | 半死·只读不写 | 结构硬·接矿场资产/开采枯竭 |
| `econ.horseProduction` | 马政 | 半死·只读不写 | 结构硬·接马政荒废/边患 |
| `econ.fishingProduction` | 渔课 | 半死·只读不写 | 结构硬·接海况/渔政 |
| `econ.imperialFarmland` | 皇庄 | 半死·只读不写 | 结构硬·随 farmland 流转同步 |
| `econ.maritimeTradeVolume` | 海贸 | 半死·只读不写(偏死) | 结构硬·接海禁/市舶司；regionBundle:2268 覆盖列表补此字段 |
| `econ.postRelays` | 驿站 | 半死·只读不写 | 结构硬·接驿政开支/废弛 |
| `econ.roadQuality` | 道路 | 半死·只读不写 | 结构硬·接修路建筑/战乱损毁 |
| `assets.zhizao/kuangchang/yuyao` | 织造/矿场/御窑 | 半死·只读不写 | 结构硬·接内帑投资扩产 |
| `data.terrain` | 地势 | 半死·只读不写 | — 合理静态（algn 算税:203 已消费） |
| `data.specialResources` | 特殊资源 | 半死·只读不写 | 软+硬·+5%税(endturn-province:206)+喂AI 已部分接 |
| `data.specialCulture` | 特殊文化 | **死·纯装饰** | 氛围软·喂 AI 省级叙事/归附感知 |
| `data.tradeRoutes` | 商路 | 半死·只读不写 | 氛围软·喂 AI 外交（faction-npc 已读） |
| `data.recentDisasters`/`econ.disasterRecord` | 近期灾异 | 半死·只读不写（近死） | 结构硬·**天灾系统 push 进 disasterRecord**+面板补读 `_disasterEconomyReduce`(现真灾走它但面板不读) |
| `data.tags` | 标签 | 半死·只读不写 | — 合理（决定物产初始化·经济结构之根·地理属性） |
| `data.dejureOwner` | 法理归属 | 半死/死 | 氛围软·喂 AI 法统叙事 |
| `data.coreStatus/borderStatus` | 核心/边缘 | 存疑偏死 | 软·边缘地块税损/边警联动 |
| `data.ownerHistory` | 归属历史 | 死·纯装饰 | 氛围软·易主时记录+喂 AI |
| `data.children` | 下辖子区 | 活（结构性） | — 已活 |

---

## 卷七营造志 / 卷八状态 —— ✅ 均活，无需活化

- **营造志** `bkYingzao`(:2943 读 liveDivision.buildings)：`BuildingWorks.tick`(endturn-core:518)每回合 在建-1/完工写 economyBase/扣 publicTreasury 维护费(building-works:369)/失修撤利。
- **状态卷** `statusEffects`(:3095)：`RegionStatus.tick`(endturn-core:522) econPct 乘进 cascade 税(fiscal-engine:1055)、minxinPerTurn 摊民心叶(region-status:131)。注释"非摆设"属实。

---

# 三大榜 · 活化路线图

## 🔧 P0 · "改一行翻活"bug 榜（活值死显/路径错配·最高性价比）
> 不是"加机制"，是"接通已有活账"——引擎早在跑，面板没接上。风险低、收益立竿见影。

1. **`retainedBudget` 漏写**（卷三）✓ minxin-hard-links:248 段补一行 `fd.retainedBudget`
2. **财赋四账省级层级错配**（卷三）父聚合写 fiscalDetail，治点省看静数
3. **`compliance` 标度冲突**（卷三）✓ 统一 0-1 / 0-100
4. **`autonomy` 字段名错配**（卷三）面板 autonomy ↔ 引擎 autonomyLevel 对齐
5. **`cloth` 库藏布**（卷三）military:2619 补 ps.treasury.cloth
6. **`households`/`ding` 双账**（卷一）endturn 把 P.byRegion 同步回叶
7. **`baojia` vs `baojiaUnits` 双账**（卷一）✓ 面板改显 baojiaUnits
8. **`byGender/byAge/byEthnicity/byFaith` 活值死显**（卷一）聚合 P.byRegion 回显
9. **`academies` 剧本 vs `_schoolNetwork` 异源**（卷五）seed 同源
10. **`fortification`→`fortLevel`、`supply`→活军卡**（卷四）删冗余字段

## ⚙️ P1 · 结构硬·接数值（这把刀的正题）
- **物产组随治理浮动**（卷六）：商贸随人口繁荣重算 / 盐矿马渔随建筑·灾异 / farmland 省级聚合 / imperialAssets 可经营
- **军备死字段接决策**（卷四）：边警→faction-action 读作攻击软肋 / 军压→endturn 结算+留用月耗 / 海防→沿海袭击抵损 / 战略价值→AI 攻守权重（**补 AI 开战盲视的硬核缺口**）
- **承载上限闭环**（卷一）currentLoad 回写 / **官缺写口**（卷五）/ **moneyOutput 兜底**（卷三）/ **disasterRecord 接天灾**（卷六）

## 🎭 P2 · 氛围软·喂 AI（低成本提沉浸）
`bySettlement`/`religiousSites`/`specialCulture`/`leadingGentry`/`localFaction`/`tradeRoutes`/`dejureOwner`/`ownerHistory` → 拼进 `endturn-prompt` 地方感知串，让 AI 在叙事/决策里调用，零数值改动。

---

## 跨面板隐患（非显示问题·建议另开 followup）
- `div.corruption`(adminHierarchy) 与 `provinceStats[x].corruption` 两 store 回合内无互同步（自然增长 vs 截留硬链读不同侧）。
- actualRevenue 叶子 cascade 与主循环 taxRevenue 两套算法并行（双轨）。

---

# 活化刀路线（owner 选「全量拆刀」· 2026-06-20）

> 原则：一刀一事 · 跨朝代通用（机制进引擎 / 专名归剧本）· 以运行时渲染器为权威 · 改完 `node` 验 + 留 `.bak`。
> 推荐顺序：**P0 先行**（低风险·立竿见影）→ P1 硬核（正题）→ P2 软（收尾）。每刀独立可验、可单独 ship。

## P0 · 接通已有活账（6 刀 · 改动小 · 风险低）

### 刀 P0-1 · 财赋四账补漏与标度对齐〔卷三〕
- **目标**：留用 / 合规 / 自主 / 库藏布 从死显转活值。
- **改点**：① `tm-minxin-hard-links.js:248-253` 补写 `fd.retainedBudget`（缺）；② `compliance` 标度统一（:252 写 `×100`=0-100 vs fiscal-engine 用 0-1）；③ `autonomy` 字段名对齐（面板读 `autonomy` ↔ 引擎 `autonomyLevel` fiscal-engine:1058）；④ `cloth`：`tm-military.js:2619` ps.treasury 补 cloth，或面板 regionBundle:2259 改读 publicTreasury.cloth.stock。
- **验收**：开局点省/府，留用/合规率/财政自主/库藏布 显非空真值，合规率百分比正常（非 8500%）；`node` fiscal smoke 不断。
- **风险**：compliance 改标度前先 grep 所有 `.compliance` 读者统一。

### 刀 P0-2 · 财赋省级聚合〔卷三〕
- **目标**：点"省"看到的四账=子府求和，非省节点静数。
- **改点**：父节点上卷处（integration-bridge:502 / fiscal-engine:1278 写 n.fiscal）同步写 `fiscalDetail`；或 regionBundle:2215 改优先读 liveDivision.fiscal。
- **验收**：省级四账 ≈ 其下各府之和；node 验。**依赖**：接 P0-1 后做（同卷）。

### 刀 P0-3 · 户口户/丁账同步回叶〔卷一〕
- **目标**：户数/丁口显 huji 每回合活值（现显开局静数）。
- **改点**：endturn 收尾把 `P.byRegion[rid].households/ding` 同步回叶 `populationDetail`（照抄 renli 对 fugitives/hiddenCount 的同步 renli:296/301）。
- **验收**：跑几回合，在册户/丁口随 huji 变化；node huji smoke。

### 刀 P0-4 · 保甲与族群构成显示接通〔卷一〕
- **目标**：保甲显真覆盖率；族群/信仰/年龄/性别 显活值（已被户籍硬用）。
- **改点**：面板 :3008 保甲改显 `baojiaUnits` 覆盖率（或反算回写 data.baojia.baoCount）；`byGender/byAge/byEthnicity/byFaith` 聚合 `P.byRegion.byXxx` 回 data 供显示。
- **验收**：保甲格显覆盖率%；chips 随人口结构变；node 验。

### 刀 P0-5 · 军备冗余字段清理〔卷四〕
- **目标**：删被取代的死字段，面板只留活账。
- **改点**：面板删 `data.fortification` 行（留 fortLevel 档 :3052）；`supply` 改显驻军活军补给最坏值（armyViewScore:2491 已算）或删；`commander` 投影 `liveArmies[0].commander`。
- **验收**：城防只显档、补给显活军值、主将随驻军；运行时渲染器为准，node 加载冒烟。**风险**：纯显示层，勿动 fortLevel 活逻辑。

### 刀 P0-6 · 书院数据源归一〔卷五〕
- **目标**：书院显示与驱动科举的 `_schoolNetwork` 同源。
- **改点**：开局把 `division.academies` seed 进 `GM._schoolNetwork`（keju-school-network），或面板改显 _schoolNetwork。
- **验收**：书院数与科举解额联动；node keju smoke。

## P1 · 结构硬·接数值（正题 · 11 刀）

### 军备（4 刀）— 补「AI 开战对地块军情盲视」缺口
- **P1-A1 · 边境风险结算+AI读**：endturn-province 按「接壤敌对 faction + 敌方兵力 + 驻军缺口」结算 `borderRisk`(0-100) 写 liveStats；`warRisk` 并入；faction-action-engine 出征决策读高 borderRisk 作软肋优先攻击 + 烽燧预警事件。**验收**：边境地块 borderRisk 随敌情升降，AI 优先打高风险边镇。
- **P1-A2 · 军压结算+留用月耗**：按驻军缺口 + 欠饷 + 邻接敌势结算 `armyPressure`，本地月耗粮饷随档浮动（接留用账支出）。**验收**：缺兵/欠饷→军压升、留用支出增。
- **P1-A3 · 海防/水师**：building-works 增「水寨/炮台」建筑写 `coastalDefense`；followup 沿海袭击(倭患)读 coastalDefense 抵扣损失；`navy` 并入。**验收**：建水寨→海防升→沿海袭击损失降。
- **P1-A4 · 战略价值入决策权重**：faction-action-engine/npc-decision 攻守目标排序 `score += strategicValue×w`（只读·最小改动）。**验收**：高价值地块更受 AI 争夺/把守。

### 物产（4 刀）— 填经济冻结空洞
- **P1-B1 · 商贸随治理浮动**：`commerceVolume/commerceCoefficient` 去一次性守卫，endturn-province 每回合随人口/繁荣重算。**验收**：人口/繁荣涨→商税涨。
- **P1-B2 · 盐矿马渔随建筑灾异**：盐/矿/马/渔/海贸 接建筑(扩产)、灾异(减产)、开采枯竭。**验收**：建矿场→矿课升；灾异→减产。
- **P1-B3 · 皇庄可经营+farmland省级聚合**：`imperialAssets`(织造/矿场/御窑) 接内帑投资/兴造增减；`imperialFarmland` 随 farmland 同步；economy 合并接 liveRegionVitals 治省级耕地。**验收**：内帑投资→织造增产；省级耕地=子府和。
- **P1-B4 · 灾异记录接天灾**：天灾系统 push 进 `disasterRecord`；面板补读 `_disasterEconomyReduce`。**验收**：天灾→近期灾异显记录+折损可见。

### 治理/人口（3 刀）
- **P1-C1 · 官缺写口**：任免/officeTree 把空缺 position 计数写 `div.officeVacancy`（读链 field-pipelines:53 已就位，只差写）。**验收**：出缺→执行率降→治理 delta 折扣。
- **P1-C2 · 承载上限闭环**：renli/huji 每回合回写 `carryingCapacity.currentLoad`，闭合「逼近承载→增长放缓」。**验收**：人口逼近承载→增长率降。
- **P1-C3 · 银/粮产兜底拆分**：无 moneyRatio/grainRatio 的区域按默认比例兜底拆 taxRevenue。**验收**：所有产税区域 本回合银/粮产 非空。

## P2 · 氛围软·喂 AI（2 刀 · 收尾）
- **P2-1 · 地方氛围感知串**：`bySettlement`/`religiousSites`/`specialCulture`/`leadingGentry`/`localFaction`/`tradeRoutes`/`dejureOwner`/`ownerHistory`/`coreStatus` 拼进 `tm-endturn-prompt` 地方感知串，AI 在叙事/任命/民变情节调用。零数值改动。**验收**：AI 输出现地方色彩（prompt 抽样）。
- **P2-2 · 去重收尾**：`development` 与 prosperity/wealth 三选一去重；`taxBurden` 由 taxLevel+合规派生或删；`note` 拼进感知串。

## 跨面板 followup（另开 · 非本面板显示）
- `div.corruption` ↔ `provinceStats.corruption` 两 store 回合内同步。
- actualRevenue 叶子 cascade ↔ 主循环 taxRevenue 双轨算法收敛。

---
> **当前状态**：体检 + 刀路线完成，未动代码、未 commit。下一步 = owner 过目刀路线 → 开 P0-1。
