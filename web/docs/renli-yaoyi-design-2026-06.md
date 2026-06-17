# 人力 / 徭役 / 农政层 — 机制设计案（实现草案）

> 2026-06-16 · 本案是 `region-panel-buildings-fields-design-2026-06.md` 的**续案与深化**。
> 它**完成**该文 §三「户口志」遗留的 ★接 清单（ding/fugitives/hiddenCount/carryingCapacity/taxBurden/recruits/leadingGentry）与 §六「S6 第二批（保甲/承载上限/灾异折减）」backlog，
> 并在其上叠加四层**全新**机制：①册载/实在双账 + 官报/真相双层雾；②丁→农业双边际（在耕田亩*数量* ⊕ 地力*质量*）；③役负独立闸（过 `gateSatisfaction`）；④变法阶梯（清丈 / 重修黄册 / 一条鞭法 / 限制优免 / 摊丁入亩）。
> **状态：机制层 R0-R8 已实现（tm-renli.js + 8 smoke·113 断言绿）·对未种子地域休眠零行为。激活（种真省 + 接役需 + 去重 + 校准）待 owner 触发——见附录二集成审计。**
> **二稿修订（2026-06-16）**：初稿写于发现既有 huji 子系统之前。核实后确认已存在约 4500 行户口/徭役/兵役子系统（且已浅接军事）。架构据此从「新建 GM.renli 丁账」改为「**单一丁分配权威 + 农政-物理层叠加 + 废三块劣账**」——见 **§〇·五**（此节为最终架构，与它冲突处以它为准）。
> **已 commit 到 main（R0–R6 `c0a87416a9` + R8 `12c199ee4b`）·未 ship 热更·未激活。**

---

## 〇、一句话立意

**丁，是连接「役」与「农」的同一份稀缺流量。** 朝廷每抽走一个丁去服役，就是从田里抽走一个丁。役负不再抽象扣满意度，而是**物理上**减少在耕田亩与亩产。于是「适当征发 / 过度征发 / 轻徭薄赋」三种结果，全从同一模型涌现，不写死任何开关。

**不做可累积的人力池。** 丁口是*存量*（人口，持久记账，本就在 `div.population.ding`）；役力/人力是从丁口每回合派生的*不结转流量*。全局没有"人力点数"计数器；动用人力=这一回合把某地具体的丁从田里拽出，立刻产生减产代价，役停即回田。大工程必须**跨地域、连续多回合持续抽流量**——这正是死亡螺旋的发动机（参 §五走查）。

---

## 〇·五、既有 huji 子系统 + 单一真相源架构决策（2026-06-16 二稿·最终架构）

> 本节是核实既有代码后补的，**纠正初稿"新建 GM.renli 丁账"的错误**。最终架构以本节为准。

### 0.5.1 发现：已存在一套完整、活的、已浅接军事的户口子系统

约 4500 行：`tm-huji-engine.js`(911·户口三元/徭役10类/兵役5类/大徭役预设/造册) + `tm-huji-runtime-bridge.js`(1252) + `tm-huji-governance-loop.js`(1404) + `tm-huji-deep-fill.js`(946)。endturn 实跑（`tm-endturn-systems.js:75` HujiEngine.tick / `tm-endturn-core.js:135-152` governance ingest+feedback + bridge.maintain / :847 喂AI / `phase8-formal-rightrail.js` 两块UI「户籍运行桥/治理环」）。

它已是一套**财政-行政层**：`tm-huji-runtime-bridge.js` 从**真 adminHierarchy 叶子**(`getLeafRegions`/`aggregatePopulation`)+**真 `GM.armies`**(`buildMilitaryPool:500`) 重算 → hukou/corvee/military 三本账 → 硬效果回写：`applyFiscalHardEffect:574`(隐逃→collectionMultiplier→砍 guoku)、`applyCorveeHardEffect:691`(役缺→MinxinLedger 按地域打农户/匠役)、`applyMilitaryHardEffect:625`(**兵源不足→真 GM.armies 扣 morale/supply** + 廷议「核实军户·募兵补边」) + `spawnHardEffectTinyi`(清丈黄册/折银代役/清查隐户) + `formatForPrompt` 喂AI + `classifyPlayerOperation`(已按 hukou/corvee/military 分类**诏令/奏疏/廷议/鸿雁**——正是我们要的五道政道入口)。

**结论修正**：军事**已浅接**（招募池读真军队、缺额扣真军士气）。所以"人力没接军事"不准确。

### 0.5.2 真正的空缺 = 缺「农政-物理层」（非"军事链接"）

既有回答的是"税基几何/兵源够不够/役缺多少/扣多少民心军心"。它缺的、也正是我们这几轮挖出的：①**丁不在 农/役/军 间争夺**（招募只封顶一个数 availableRecruits，不从务农丁扣人）；②**丁→农业双边际**（在耕田亩 + 地力/精粗）零实现，既有役账只算 demandDays/gap/burden→民心，从不碰 farmland/亩产；③**战争不定位毁地**（真 `applyBattleResult` 不动地方人口；只有一条"有战争→全国男丁均匀-0.2%"糊涂账，无"前线兵燹→抛荒→丁损→该地税基/兵源缩"闭环）；④**册实棘轮 + 官报雾 + 按省征发强度 + 一条鞭法地域适配** 仅有 taxBaseRatio 雏形。

### 0.5.3 架构决策（"哪个效果好用哪个"→ 选①单一真相源·外科式）

**决定性理由**：农政层**必须写丁**（招募/民夫抽务农丁、战损杀丁、逃亡减实在丁、抛荒回馈）。故"新模块只读丁"的隔离是**伪命题**——设计本身让农政层成为丁的写者。两个写丁者 = 必漂的双账。**丁的分配必须单一权威**，既有役/兵账与新农政层都过它。这不是为复用而复用，是要能跑就必须如此。

但"收口"≠"重写4500行"，而是**外科式**：
1. **立**一份 per-region **丁分配单一权威**（务农/应役/应征/逃/隐/优免/实在/册载），挂在 bridge 已归一、save/load 已持久的叶子真账 `leaf.populationDetail` 上。
2. **农政 tick** 是这份分配的**唯一写者+消费者**：按征发强度+招募需求算分配 → 写叶子 → 派生在耕/地力/粮产/役负。
3. **改既有两个 builder 去读分配**：`buildCorveeLedger`(:414) 的 demand 不再 `ding×annualDays` 凭空算、`buildMilitaryPool`(:500) 的 availableRecruits 改读"应征丁余"；bridge 其余机器（硬效果/廷议/喂AI/玩家五道分类）**全留不动**。
4. **军事真整合**：招募与民夫**实扣务农丁**（军农争丁）；战斗/围城 → **前线该地** 兵燹（抛荒+丁损+地力/水利损）→ 反馈税基与兵源——取代"全国均匀-0.2%"糊涂账。

### 0.5.4 留 / 改 / 废 清单

- **留**：bridge 全部硬效果/廷议派生/喂AI/玩家五道分类、governance-loop、HujiEngine 的徭役10类/户计10类/军制/25大徭役预设/朝代丁参数（这些是好数据与好机器）。
- **改**：丁收口为单一分配权威（写在叶子）；上述两 builder 改为只读分配；役负/缺粮满意度统一走既有信号路 → `gateSatisfaction`（±14 闸）。
- **废**（确属冗余/更差的账）：①`HujiEngine.init` 的 `byRegion` 均摊国账（bridge 已从真叶取代）；②`HujiEngine._tickMilitary` 的抽象兵池 `mubing.strength=guoku.money/20`（与 bridge 读真 GM.armies 重复且更糙，是"军事孤岛"的来源）；③HujiEngine 的"全国均匀战损"（换成定位兵燹）。

> 因此**我们设计的全新贡献**精确为：在 bridge 已归一的真底座上，**叠一层农政-物理层**——丁在农/役/军真争夺、双边际(在耕+地力)、册实棘轮、官报雾、战争定位毁地闭环、按省征发与一条鞭法地域适配。下文 §二~§十二的公式/走查/变法/UI 仍有效，但数据落点以本节为准（**丁不另立账**）。

---

## 一、与既有系统的关系（先认地基，再谈新增）

> **§一写于初稿、面向浅层既有系统（province tick / FieldPipes / cascade）；与 huji 子系统的关系及最终架构以 §〇·五 为准。**

### 1.1 已存在、本案只「接线 / 激活」的部分

| 既有资产 | 文件 | 本案如何用 |
|---|---|---|
| `div.population = {mouths, households, ding, fugitives, hiddenCount}` | tm-endturn-province.js:593-599 | **丁口账的底座**。ding=实在可役丁的现值；fugitives/hiddenCount=册实裂口的两条线（见 §三）。 |
| `div.environment.arableLand` | tm-endturn-province.js:846,1565 | **田土账外延边际的底座**（实在可耕田）。 |
| `carryingCapacity {arable,water,climate}`（死字段） | scenario/snapshot `region.data` | **激活**为人口增长上限 + 超限产流民（户口志★接）。`climate` 接小冰期天时。 |
| 人口增减 tick（±1%/0.5%） | tm-endturn-province.js:144-148 | **改造**：增长率改由役负/余粮/承载力驱动（见 §四公式），而非固定 1%。 |
| 丁银 `丁 × pollTax` | tm-endturn-province.js:1317-1320 | 维持；摊丁入亩变法后**溶解**进田赋（见 §六）。 |
| `militaryRecruits = ding × 1%` + `capRecruitDelta` 募兵上限 | tm-endturn-province.js:486 / tm-field-pipelines.js | 军役需求接此；过度征兵 = 抽丁离田（接入 §四丁分流）。 |
| `fleeTaxPenalty`（逃隐户税基折减） | tm-field-pipelines.js | 维持；逃亡/隐丁增量改由本案 §三驱动后，它自动反映。 |
| 重税缓跌 tick（taxFactor≥1.18→民心叶−0.5） | tm-field-pipelines.js | 这是**税负**通道；本案新增**役负**通道（不同源，见 §四.4）。 |
| `gateSatisfaction(root,cls,rawDelta,info)` 总闸（±`classSatTurnBudget`默认14·写`_satLedger`） | tm-class-engine.js:784 | **役负/缺粮信号必须过此闸**（见 §四.4），绝不直写 `.satisfaction`。 |
| `class.regionalVariants[] = [{region,satisfaction,_satLocal,...}]` 地域分账 + 缓变 | tm-social-foundation.js:381-406 | 役负的**地方满意度**落此（陕西变体独立于江南）。 |
| 每回合确定性 tick 链 + `IntegrationBridge.aggregateRegionsToVariables()` | tm-endturn-core.js:512-534 | 本案 tick 挂此链（见 §四.5 hook 点）。 |
| `RegionStatus.statusEffects[]` + econMult 进 cascade | tm-region-status.js | 灾异/兵燹通过它已影响经济；本案读其 econMult/prosperity 作天时与安全因子。 |
| 优免 `char.resources.gongming.youmian`（进士16/举人8/生员2）+ `getAllYouMianTotal(G)` | tm-gongming.js:44-55,132-157,300-311 | **激活**：按地域归集优免丁（见 §七），让"功名越多→免役越多→负担压向平民"闭环成真。 |
| 问天 hardChange 解析器三件套（class/army） | tm-game-loop.js:1777-1884,1980-2104 | **克隆**出 丁/田/役 region-ledger 解析器（见 §八），否则 god-mode 静默写幽灵属性。 |
| 四视图舆图 + 方志册页 + `_fieldLedger` 因果账签 | phase8-formal-map.js / region-panel 设计 | **入站 UI 主面**（见 §九）：新增"役政"视图 + 役负哨牌 + 役账近账签。 |

### 1.2 本案「全新」的部分（既有文档/代码均无）

1. **册载/实在双账 + 官报/真相双层雾**（§三）——既有有 fugitives/hiddenCount 字段，但无系统化的「册载丁 vs 实在丁」棘轮，也无「督抚瞒报」第二层雾。
2. **丁→农业双边际**（§四.2-3）——既有有 arableLand 与 ding，但无「劳动力分流→在耕田亩(数量)+地力/精粗(质量)」耦合。`地力`（intensive margin / soil quality）是**全新字段**。
3. **役负独立闸**（§四.4）——既有 taxBurden→民心（税负），本案新增 corvée labor-burden 信号，与税负分账，过总闸。
4. **变法阶梯**（§六）——既有提到「清丈括户诏令」backlog，本案补全 清丈/重修黄册/一条鞭法/限制优免/**摊丁入亩** 全链 + 党派输赢。
5. **募役折银 + 劳动力市场深度 + 复种系数**（§二结构常数）。
6. **鸿雁官报双源信息不对称**（§九）。

---

## 二、数据结构（接真实 region.data，分「种子」与「活态」两层）

**设计要点：把「册载（黏滞、官报）」放进*快照种子*，把「实在（逐回合真相）」放进*运行时活态*。** 这样「册载 vs 实在」的裂口在数据层就是「快照种子 vs 运行时活态」的裂口——天然自洽，且各自的持久化路径不同（见 §十）。

### 2.1 种子层（写进 scenario → 走快照管线 + bump SNAP_QS）

挂在 `region.data`（与既有 population/environment 同级）：

```js
// region.data.renliSeed —— 黏滞官账与地方结构常数（剧本作者定，清丈/重修黄册才更新）
renliSeed: {
  registeredDing:   1000000,  // 册载丁（黄册）—— 黏滞，只有 清丈/重修黄册 变法更新
  registeredLand:   3000000,  // 额田（鱼鳞图册·课税）—— 黏滞
  soilBase:         70,       // 地力基线 0-100（陕西瘠~65 / 江南腴~90）★新字段
  waterworks:       50,       // 水利状态 0-100（不修自衰；河工役可修）★新字段
  // —— 两个地区结构常数（因地而异，不是动态系数）——
  doubleCropping:   1.0,      // 复种系数（旱地1.0 / 江南水田~1.4）★新
  laborMarketDepth: 0.2,     // 劳动力市场深度（陕西0.2 / 江南0.8）→ 募役折银比例 ★新
}
```

> 既有 `div.population.ding / fugitives / hiddenCount`、`div.environment.arableLand`、`carryingCapacity` **保留并复用**，不重复造。`registeredDing` 是新增的*官账*（区别于 `ding`=实在现值）。

### 2.2 活态层 —— 丁分配单一权威在叶子，GM.renli 只存农政派生（不立第三本丁账）

**丁的唯一真相在 `leaf.populationDetail`**（bridge 已归一、save/load 已持久的那份）。农政 tick 在其上补**分配字段**（单一权威·bridge 两 builder 改读它）：

```js
// leaf.populationDetail（既有·bridge 归一）—— 丁分配单一权威，农政 tick 补这几项
populationDetail: {
  mouths, households, ding,                 // 既有（ding = 实在可役丁现值 = 真相源）
  hiddenCount, fugitives,                   // 既有（隐/逃；农政 tick 驱动其增减）
  // —— 农政 tick 新增·每回合重算·不结转 ——
  alloc: { farm:0, corvee:0, draft:0, exempt:0 },  // 务农/应役/应征/优免，∑≤ding ★新·唯一分配权威
  registeredDing: 0                         // 册载丁（黏滞官账·来自 renliSeed/重修黄册）★新
}
```

```js
// GM.renli —— 只存「农政-物理派生 + 役政策 + 近账 + 官报雾」，绝无平行丁计数
GM.renli = {
  byRegion: {
    "陕西": {
      soil: 70,                             // 地力现值（慢变量·从 soilBase 起升降）★新
      cultivatedLand: 0, fallowLand: 0,     // 在耕/抛荒（派生）★新
      corveeRate: 0,                        // 役负率（派生 = alloc.corvee / 可征丁）
      levyPolicy: { strength:'normal', remitTurns:0 },  // 现行则例（诏书设·§九 杠杆）
      ledger: []                            // 近账（环形8条·复用 _fieldLedger 范式）
    },
    "江南苏松": { /* ... */ }
  },
  reported: { "陕西": { corveeRate:0, fallowShare:0 } }  // 官报雾·督抚奏报口径（可瞒报）
}
```

> **单一真相源纪律（铁律）**：丁及其分配只写在 `leaf.populationDetail`——**农政 tick 是唯一分配写者**，bridge 的 `buildCorveeLedger`/`buildMilitaryPool` 改为**只读** `alloc`；`hiddenCount/fugitives` 仍是既有叶子字段（农政 tick 驱动增减，不另立份）。`GM.renli` 只存 soil/在耕/役负/则例/近账/雾，**绝不含任何丁计数**——否则即第三本账（参 §〇·五）。

---

## 三、册载 / 实在双账 + 双层雾（螺旋发动机）

### 3.1 三条裂口（册载丁 − 实在丁 的成因）

- **隐丁** `hiddenDing`：随征发强度↑ + 黄册陈旧（距上次重修回合数）↑ 而增。重修黄册清零。
- **诡寄丁** `commendedDing`：随「优免吸引力」增——优免越厚（§七 exemptDing 占比）+ 役越重 → 自耕农投献士绅避役。清丈 + 限制优免 变法逆转。
- **逃亡丁** `fledDing`：随役负率 + 缺粮（§四）增；外溢成跨地域流民（接既有 fugitives + carryingCapacity 超限产流民）。招抚诏令收编回册。

### 3.2 棘轮（本系统的核心张力）

役额按 `registeredDing`（册载/官报）定，而册载黏滞（只有清丈/重修黄册更新）。当实在丁（`ding`）因逃亡跌破册载：

```
实际人均役负 = 役额 / 可征丁   （可征丁 = ding − exemptDing − commendedDing）
```

名义役额不变，分母缩 → 人均役负自动飙升 → 加速逃亡 → 螺旋。**这是晚明拖垮自身的机制；陕西先崩即由此（§五）。**

### 3.3 第二层雾：官报 vs 真相

`GM.renli.reported[region]` = 督抚奏报口径，可**主动瞒报**（怕担责，少报抛荒/逃户）。瞒报幅度 = f(督抚 NPC 的 stress/face/loyalty + 该地危情)。
- 读**奏疏**（§九）→ 看到 `reported`（官报，可能粉饰）。
- 读**鸿雁**（§九）/ 行**清丈巡查** → 看到 `GM.renli.byRegion`（真相）。
- **惰性派生自洽**：平时舆图/奏疏显示的本就是 reported（上次奏报旧值）；只有问对/清丈刷新真值——懒得算正好等于"朝廷不知地方实况"（§四.5 + §九）。

---

## 四、公式落地

### 4.1 劳动力分流

```
可征丁 = max(0, ding − exemptDing − commendedDing)
役需总量 = corveeDemand.gong + corveeDemand.jun + corveeDemand.za        // 丁-单位
// 募役折银：有市场的地方用银抵役，不抽田丁
corveeCommuted = round(役需总量 × laborMarketDepth)                       // 折银（计财政支出，不抽丁）
corveeLevied   = min(役需总量 − corveeCommuted, 可征丁 × strengthCap)     // 力役（真抽田丁）
corveeRate     = corveeLevied / max(1, 可征丁)                            // 核心标量
务农丁         = ding − corveeLevied                                      // 募役雇工来自剩余/工商，不减核心农耕（见走查）
```
`strengthCap` 由 `levyPolicy.strength` 映射：light 0.15 / normal 0.25 / heavy 0.40 / extreme 0.55。

### 4.2 农业·外延边际（田亩*数量*）

务农丁先尽力盖满**额田**（课税田，税在田上，不种也欠税）：

```
密度 ρ = 务农丁 / registeredLand            // 丁/亩
若 ρ ≥ ρ_min(0.15)：在耕田 = registeredLand，抛荒 = 0     // 还能粗放盖满
若 ρ <  ρ_min：     在耕田 = 务农丁 / ρ_min，抛荒 = registeredLand − 在耕田   // 盖不住，弃地
// 兵燹叠加（读 RegionStatus）：在耕田 ×= (1 − 安全折损)    // 流寇/围城时再砍
```

### 4.3 农业·内涵边际（耕作*质量* / 地力）★本次 owner 重点

```
精粗系数 Q(ρ) = clamp01(0.7 + 3×(ρ − 0.15))    // ρ≥0.25→1.0(精耕); ρ=0.15→0.7(粗放下限)
地力慢变（回合末，写 soil）：
  粗放(ρ<0.25)   : soil −2
  水利失修       : soil −1     （waterworks 每回合自衰 −1，封地板）
  旱(天时<0.85)  : soil −1
  精耕+水利修    : soil +1~+2  （河工役完工，见 §六）
  荒田复垦头2年  : 该地块 soil ×0.6（复垦惩罚，防随手抛荒/捡回无代价）
粮产 = 在耕田 × 基准亩产(1.5) × (soil/100) × Q(ρ) × doubleCropping × 天时
天时 = 1.0常 / 0.75旱 / 0.70大旱 / 1.1丰   （读 RegionStatus disaster + carryingCapacity.climate）
```

> **这就是 owner 要的"丁影响田亩数量与质量"**：丁被抽走 → ρ↓ → 先 Q↓（粗放·质量跌），再（ρ<0.15）抛荒（数量跌）。质量先垮、数量后垮，与史相符。

### 4.4 满意度接线（过总闸，役负与税负分账）

每回合每地域，对相关阶层（农户/军户/士绅）算原始信号，**经 `TM.ClassEngine.gateSatisfaction` 入闸**：

```js
// 役负信号（labor burden·区别于既有 taxBurden 税负通道）
var sRole = -80 * Math.max(0, corveeRate - 0.20);          // 可持续线 0.20
// 缺粮信号
var deficit = Math.max(0, 民食需求 + 赋 - 粮产);
var sGrain = -60 * (deficit / 民食需求);
// 入闸（源标签新增 'corvee-burden' / 'grain-deficit'）
TM.ClassEngine.gateSatisfaction(GM, 农户cls, sRole + sGrain,
  {turn: GM.turn, source: 'corvee-burden', reason: region+'·役负'+corveeRate.toFixed(2)});
```

- **地方满意度**：同时把该信号的地域分量写 `农户cls.regionalVariants[陕西]`（既有 ±12 地域通道，不占 class 全局预算），实现"陕西役负崩、江南无恙"。
- **关键纪律**：原始 −16 被闸夹成 −14 是*正确*的（防一回合砸穿，正是你被 ecology 直写坑过的总闸该有的样子）。**而物理亏空（粮产/逃亡）不过闸**——满意度被平滑，真实灾情在粮账里，民变由粮账+逃亡驱动而非仅满意度（见 §五 T2 认知）。

### 4.5 Hook 点 + 惰性派生

- **确定性 tick**：新模块 `TM.Renli.tick(GM, P)`，挂 `tm-endturn-core.js:512-534` 链中、**`SocialFoundation.tick` 与 `IntegrationBridge.aggregateRegionsToVariables()` 之间**（此时 AI 推演已落地、灾异/兵燹状态已更新、地块叶子待聚合）。tick 内只做**闭式公式**（§4.1-4.4），绝不按丁迭代——几百地域必须每地 O(1)。
- **惰性派生**：民政/役政方志册页（§九）打开时才调 `TM.Renli.deriveRegion(regionId)` 算细账并刷真值入 `reported`。承载力/役负哨牌用上次派生缓存（= 官报旧值，与雾自洽）。
- **动画**：tick 轻量同步即可（参 BuildingWorks/SocialFoundation 同段）；任何重计算（如全图清丈）走惰性或后台 job，**勿在过回合 BEATS 主线程跑**（前车之鉴：语义缓存冻帧）。

---

## 五、端到端数值走查（验收基线·见对话稿，移此存档）

**陕西（瘠）**：T0 适当(役负0.18,粮315,余+35) → T1 加辽饷(役负0.34,粮274,余−21,督抚瞒报/鸿雁漏真) → T2 过度+大旱(实在丁跌破册载→棘轮役负0.385,粮183,余−117,满意度过闸只掉14但物理亏空驱动逃亡) → T3 抛荒+流寇(务农丁崩,ρ<0.15弃地,流寇点火,粮95<30%)。

**江南（腴·同系数表，只换初始盘+两结构常数）**：富而空心（实在120万丁朝廷只够着65万，隐田120万亩逃税）→ 辽饷加派逼出**税基逃逸**(诡寄+,额田缩)而非抛荒 → 正解是**清丈+一条鞭法**（看更多+收公平），与陕西的**蠲免**（取更少）相反。

**验收断言**：同一系数表，初始盘一换，病机/棘轮方向/折银适配/正解全翻面 → 证明非"陕西崩溃模拟器"一招鲜。流寇点火：逃亡累计>20%实在 ∧ 亏空≥2回合 ∧ 满意度<35。

**系数总表**：ρ\*=0.25 / ρ_min=0.15 / Q=0.7+3(ρ−0.15) / 基准亩产1.5 / 地力±见4.3 / 天时1.0·0.75·0.70·1.1 / 民食=口×subsistence / 正赋=额田×0.10 / 辽饷=额田×0.05 / 役负线0.20 / 役负信号−80×(rate−0.20) / 缺粮−60×(deficit/民食) / 闸±14 / 流寇见上。

---

## 六、变法阶梯（诏书触发·三面齐备·党派输赢）

每条变法 = 玩家颁**诏书**（§九）→ 大者入**朝议**辩论（党派对撕）→ apply 处理器改 `renliSeed`/`GM.renli`。遵「失败禁玄幻惩罚」：阻力=自然政治结果。

| 变法 | 改什么 | 党派/阶层后果 | 适配 |
|---|---|---|---|
| 兴修水利/河工 | `waterworks +`，连带 soil + | 营建派 vs 治水派 | 通用 |
| 招抚流民/移民垦荒 | `fledDing −`、复垦抛荒（带复垦惩罚） | 惠农 | 通用 |
| 清丈田亩 | 堵隐田：`registeredLand → 实在可耕`（恢复部分） | **士绅满意度/影响力暴跌**+东林死保（入朝议） | 江南收益大 |
| 重修黄册 | `registeredDing → ding`（册实归一·棘轮归零）+ 隐丁清 | 胥吏失油水 | 通用 |
| 一条鞭法（役折银） | 役并入银赋（提高 laborMarketDepth 效应） | 利商利流民、损吃役胥吏 | **江南顺滑·陕西是毒**（无银市场逼贱卖） |
| 限制优免 | gongming youmian 阶梯下调（§七）→ 诡寄逆转 | 触动整个功名集团 | 通用 |
| **摊丁入亩** | 丁银并入田赋（终局）：删丁银路、负担随 registeredLand 走、丁作为计量溶解 | 最硬·士绅税特权终败 | 终局·须先赢清丈 |

> 一条鞭法的"同法适配相反"必须做出来：apply 时按 `laborMarketDepth` 判定——低于阈值（如0.4）的地域推行 → 产出贱卖、民心额外扣（陕西毒药效果），高于阈值 → 顺滑。这是奖励"因地诊断"的关键。

---

## 七、优免按地域归集（激活 tm-gongming 的丁）

- 既有 `char.resources.gongming.youmian`（免役丁数）+ `getAllYouMianTotal(G)`（全局合计）。
- **新增** `TM.Renli.exemptDingByRegion(GM)`：遍历活人物，用 §1.1 的 `armyRegionIndex` 同款**人物→地域归属**解析（籍贯/任地/驻地四级链回退），把每人 youmian 累加到其所在地域的 `exemptDing`。
- 闭环：进士越多（功名膨胀）→ 某地 exemptDing↑ → 可征丁↓ → 平民人均役负↑ → 诡寄↑（自耕农投献该地士绅）→ 税基烂。**限制优免变法**下调 youmian 阶梯即逆转。
- exemptDing 每回合派生、不持久（§2.2）。

---

## 八、问天 god-mode 解析器（必须·否则静默写幽灵属性）

照 `_wtResolveClassHardChange` 三件套（tm-game-loop.js:1830-1884）克隆 region-ledger 解析器：

```js
// 1) 字段别名表
_wtCanonicalRenliField(field): {
  '册载丁':'registeredDing','实在丁':'ding','隐丁':'hiddenDing','诡寄丁':'commendedDing',
  '逃亡丁':'fledDing','役负':'corveeRate','役负率':'corveeRate','地力':'soil','水利':'waterworks',
  '在耕':'cultivatedLand','抛荒':'fallowLand','额田':'registeredLand'
}
// 2) 按地域名找目标（GM.renli.byRegion / region.data.renliSeed），命中真对象（不写数组字符串键）
_wtFindRenliTarget(name) → {regionId, liveObj, seedObj}
// 3) 解析 parts（前缀 region|地域|丁口|役 + 地域名 + 字段），guard 字段白名单
_wtResolveRenliHardChange(parts) → {target, field, store}
```
- dispatcher（tm-game-loop.js:1980-2104）加 region 分支：按字段路由 seed/live，clamp（丁≥0 / 率0-1 / 地力·水利0-100），调 `_wtAfterHardChange` 刷 UI。
- **问对 prompt** 加可问/可改路径文档（如 `region[陕西].役负`、`region[陕西].地力`）——「解析器+prompt路径+字段别名」三件套缺一不可（血泪教训）。

---

## 九、五道政道 UI 接口（数据是真相，五道是视图+杠杆）

| 政道 | 方向 | 接既有 | 本案内容 |
|---|---|---|---|
| **奏疏** | 入站·官报 | 奏疏 AI 生成 workstream | 督抚抛荒/逃户奏报（读 `reported` 官报口径·可瞒报）、户部税基总览、工部请河工役、言官弹劾过度征发 |
| **鸿雁** | 入站·真相 | 鸿雁传书/correspondence + NPC hearts | 门生密报真情（读 `GM.renli` 真值）、督抚私下警告流民将变——**读私信者比只读奏疏者更早见螺旋** |
| **诏书** | 出站·杠杆 | 撰写诏书面板(政令/经济) + 问天意图解析 | 蠲免徭役、征发某省某役、兴修水利、§六各变法诏。现行则例显示为 `levyPolicy` |
| **朝议** | 决策辩论 | 朝议势力 tm-chaoyi + 党派 | 大变法（清丈/一条鞭法/摊丁入亩）入朝议·改革派vs守旧派 |
| **问对** | 查询+神权 | 问天 | 问大臣"陕西丁口几何/抛荒几许"(触发惰性派生刷真值)；问天直改(§八) |
| **舆图/方志** | 入站·空间 | 四视图 + 方志册页 + `_fieldLedger` | **新增"役政"视图**（按役负率/抛荒率染色，陕西先红）+ 役负哨牌 + 方志「役政卷」+ 役账近账签。**无 HUD 计数器**（无池→无全局数→状态散在地域→地图是仪表盘） |

---

## 十、持久化与快照（两条路·别只发一处）

- **种子层**（`region.data.renliSeed`）：改 scenario `.js` **不生效**——须走 `scenarios/*.js → 官方 JSON → build-tianqi-runtime-snapshot.js → 运行时快照`，并 **bump `SNAP_QS`**（index.html:828）+ 同步八制品（参 class-party-overhaul 文）。
- **活态层**（`GM.renli`·系统所有）：在 `tm-save-lifecycle.js` `_prepareGMForSave` 加 `if(GM.renli) GM._savedRenli = _safeClone(GM.renli)`，`_restoreSavedFields` 配对还原；`_ensureGMDefaults` 补 `GM.renli` 默认。
- 写既有 population 叶子（hiddenCount/fugitives）随 chars/divisions 全对象序列化，自动持久。

---

## 十一、对齐既有范式自检表（沿用 region-panel 文）

- ✅ 改源头叶子，不直写聚合值——粮产/丁/役全改 region 叶子，经 IntegrationBridge 聚合。
- ✅ 满意度过 `gateSatisfaction` 总闸——役负/缺粮新源标签入闸，不直写 `.satisfaction`。
- ✅ 单一真相源——ding=实在真相源；hiddenCount/fugitives 由本案驱动不另立第二份；exemptDing 派生不持久。
- ✅ 玩家操作只走五渠道，面板纯视图——征发/变法走诏书/朝议，方志只读。
- ✅ 提示词软约束 + apply 硬门双层——变法 AI schema 白名单 + apply clamp。
- ✅ 失败禁玄幻惩罚——过度征发=自然抛荒/逃亡/流寇，非凭空扣分。
- ✅ 新机制三面齐备——种子可编辑器配 / tick 确定性 / AI region+变法 schema。
- ✅ UI chrome 朝代中立——「役政/丁口/田土/水利/徭役」皆通用古语；辽饷/一条鞭法等专名属剧本数据。
- ✅ 缓存回合末统一重算 / 惰性按需——corveeRate/在耕/地力派生值不存死缓存。
- ✅ 时间阈值匹配机制刻度——役负按回合派生，地力慢变按回合，无绝对行号/天数硬编。

---

## 十二、落地切片（保守拆分·一刀一事·每片独立 smoke + .bak）

| Slice | 内容 | 依赖 | 风险 |
|---|---|---|---|
| **R0** | **核 huji 子系统 + 立单一权威**：实读 huji-engine/runtime-bridge/governance-loop，钉死 bridge `aggregatePopulation`/`buildCorveeLedger`/`buildMilitaryPool` 的读写点；在 `leaf.populationDetail` 上定义 `alloc`(务农/役/征/免)+`registeredDing` 为**丁分配单一权威**；定两 builder 的改读点 + 三废目标(§0.5.4)。产出一张「谁写丁/谁读丁」契约表 | — | 低（纯调研，但**必做**，决定全局不撞账） |
| **R1** | 数据底座：`renliSeed` 种子（陕西/江南两省试点）+ `leaf.populationDetail.alloc/registeredDing` + `GM.renli`（**仅农政派生·无丁计数**）+ save/load + `_ensureGMDefaults` | R0 | 低 |
| **R2** | `TM.Renli.tick`：劳动力分流 + 双边际（§4.1-4.3）+ 粮产，挂 endturn 链；先不接满意度，node 跑陕西 T0-T3 数值走查断言 | R1 | 中（碰 endturn 链，须等价性验证既有 tick 不受影响） |
| **R3** | 满意度接线（§4.4 过闸 + 地域分账变体）+ 册实棘轮 + 三裂口（隐/诡寄/逃亡，驱动既有 hiddenCount/fugitives） | R2 | 中（碰满意度，swap-test 验不绕闸） |
| **R3.5** | **军事整合**（owner 点名缺口）：①招募/民夫**实扣 `alloc.farm`**（军农争丁）→ bridge `buildMilitaryPool` 改读 `alloc.draft` 余；②战斗/围城 → **前线该地** 兵燹（抛荒+丁损+地力/水利损）写叶子 → 反馈税基/兵源；③**废** `_tickMilitary` 抽象兵池 + 全国均匀战损(§0.5.4) | R2,R3 | 中（碰 tm-military `applyBattleResult` + bridge builder，等价性验证） |
| **R4** | 优免按地域归集（§七，接 gongming + 人物→地域解析） | R1 | 低 |
| **R5** | 问天解析器三件套 + 问对 prompt 路径（§八） | R1 | 低 |
| **R6** | 变法阶梯 apply + AI schema + 诏书/朝议接线（§六，先 清丈/蠲免/一条鞭法/招抚 四条，摊丁入亩留末） | R3,R4 | 中 |
| **R7** | UI：役政视图着色+哨牌（复用 mapMode 换皮）+ 方志役政卷 + 役账近账签；鸿雁/奏疏官报双源（§九） | R3 | 中（纯 UI + 雾） |
| **R8** | 摊丁入亩终局变法（溶解丁银路） | R6 | 中 |

> 验证范式（沿用项目惯例）：每片 node 确定性断言（陕西/江南走查为黄金基线）+ swap-test（摘闸复现跳楼证伪）+ 真存档实跑 + 源码契约断言 + `.bak-renli-<date>`。先 R0 调研落地，再逐片推进。

---

## 十三、待 owner 拍板的开放问题

1. **试点范围**：R1 先做陕西+江南两省试点，验证后再铺全 17 省 / 359 聚落？（建议：是，控风险）
2. **与既有 `tm-endturn-province` 人口 tick 的归并**：现有 ±1%/0.5% 固定增长，本案要改由役负/余粮/承载力驱动——是**替换**该 tick 的人口逻辑，还是 `TM.Renli` 旁挂、province tick 退为只读？（R0 调研后定，倾向归并以免双账）
3. **地力 `soil` 是否要进编辑器面**（让剧本作者按省配瘠/腴），还是仅 `soilBase` 种子 + 运行时派生？
4. **摊丁入亩**是否第一版就排进（R8），还是先把前七片跑稳、终局变法二期？

---

## 附录 · R0 调研结论 · 丁「单一真相源」契约表（2026-06-16）

> 三探子扫全 `web/` 的丁 读/写/对象同一性。架构结论**高置信**（税读叶子 / 桥从叶子归一 / huji 均摊账已死，95-99% 交叉印证）；**具体行号实现前须再核**（CLAUDE.md：写码前实查，别凭转述）。

### R0.1 对象同一性裁定（命门）

| 表象 | 是什么 | 裁定 |
|---|---|---|
| **`adminHierarchy[faction].divisions[叶].population` / `.populationDetail`**（{mouths,households,ding,fugitives,hiddenCount}） | 经济模拟根·cascade 税/聚合/存档都用它 | **★唯一真相源（丁的家）**。`.populationDetail` 是编辑器权威态，cascade 读 `div.populationDetail ‖ div.population`。`alloc`+`registeredDing` 挂这里。 |
| `GM.population.byRegion[rid]` | 每回合 bridge `aggregatePopulation`/`syncHukou` 从叶子重算的**派生视图**（引用/镜像） | **只读视图**·聚合后才有效·不可当权威写 |
| `GM.population.national.*`（huji 国账） | bridge 从叶子 rollup | 派生·只读 |
| `HujiEngine._initByRegion` 均摊 byRegion | 开局均摊·**被 bridge 覆盖** | **死账·废**（§0.5.4①） |
| `P.map.regions[].data.population` | 地图视觉层·**从不与叶子同步** | UI-only·不碰丁逻辑 |
| `tm-endturn-province.js` `province`/`GM.provinceStats` | 每回合 UI 计算·**从不写回叶子·不持久** | 瞬态显示缓存 |

### R0.2 谁写丁（write 契约）

| 写者 | 现状 | 契约（重构后） |
|---|---|---|
| **农政 tick（新）** | — | **`alloc`(务农/役/征/免) 唯一写者** + 由劳动结果驱动叶子 ding 变化（逃亡/战损/抛荒） |
| 人口生灭（生/死/迁） | huji 比率 / ethnic-religion 按龄 / economy-engine 迁徙 **三四处各自重算 ding** | 收一个 demographic 主人写叶子；其余读叶子/喂入·不各自重算（见 R0.5） |
| 灾/战/迁/事件/AI | 写 `populationDetail.mouths/fugitives` 或 huji 国账 | 一律写**叶子**·不写 huji 国账平行份 |
| bridge 归一 | `aggregatePopulation` normalize 写叶子 | 留（它就是归一器） |
| 招募硬扣 | field-pipelines 扣 `militaryDetail.availableRecruits` | 改扣叶子 `alloc.draft` 余 |
| **废** | huji `_initByRegion` 均摊 / `_tickMilitary` 抽象兵池 / 全国均匀战损 | 删 |

### R0.3 谁读丁（read 契约·现状很碎）

现状各方读的丁字段**不一致**（不一致病根）：税读叶子 `populationDetail.ding`；役/募读 bridge `aggregate.byRegion[id].ding`；huji 役/军读 `P.national.ding`/`serviceAgeDing`；UI 读叶子 `div.population.ding`。**契约=全部归一到叶子**（或读引用叶子的派生视图）：税维持读叶子；役需改读 `alloc.corvee`；募兵改读 `alloc.draft` 余；AI 读归一后叶子总量；农政层读叶子 ding+alloc。

### R0.4 两 builder 确切改读点（核心改动·最小面）

- `tm-huji-runtime-bridge.js · buildCorveeLedger`：`demand = ding × annualDays` → `demand = 叶子.alloc.corvee`。
- `tm-huji-runtime-bridge.js · buildMilitaryPool`：`availableRecruits = f(national.ding,…)` → 读 `叶子.alloc.draft` 余。
- bridge 其余（hard effects/廷议/喂AI/玩家五道分类/governance-loop）**全留不动**。

### R0.5 R0 新发现 · 更深的纠缠（须 owner 定 scope）

**丁的人口生灭写者比 §0.5 估计的多**：除 huji，`tm-ethnic-religion.js` 按年龄结构独立重算 `r.ding`、`tm-economy-engine.js` 有自己的区域人口 tick（瘟疫/战争/迁徙）、`tm-huji-deep-fill.js` 征兵战损扣 national——**至少三四处独立写/重算 ding**。故"单一真相源"不止"改两 builder+废三块"，还涉及**收口 demographic 写者**（碰我们设计之外的 ethnic-religion/economy-engine）。

**两条 scope（R1 前定）**：
- **(甲) 窄**：本期只立 `alloc` 单一权威 + 改两 builder + 废三块；ding **总量**沿用现状多写者（农政层只读叶子总量即自洽）。风险小见效快，但 ding 总量仍非严格单源。
- **(乙) 宽**：连生灭也收口单一主人写叶子。最合"单一真相源"理想，但动 ethnic-religion/economy-engine/deep-fill 多文件，回归面大一截。

**建议先甲后乙**——本期窄口径（农政层只读叶子总量、`alloc` 单源），demographic 收口列为后续独立 slice（它本是既有遗留病，不该和农政层捆一刀，合"一刀一事"）。

---

## 附录二 · 激活前集成审计（Renli ↔ huji）（2026-06-16·机制层 R0-R8 完工后）

> 机制层 R0-R8 已实现并 commit（main `12c199ee4b`），对未种子地域**休眠零行为**。本附录是「激活」（种真省 + 接役需 + 去重 + 校准）前的最后一道地基审计：实读钉死 Renli 与**活着的 huji 子系统**在激活时**确切会在哪几处打架**及去重方案。两轮子代理实读 + grep 交叉验证（诏书/变法触发面 + 丁数据源关系）。**补正 R0 附录的转述误差。**

### 附2.1 两套丁账的确切关系（命门·补正 R0.1）

- **存储 A**（Renli 真相源）= adminHierarchy 叶子 `populationDetail`。
- **存储 B**（huji 引擎）= `GM.population`（`national.ding` / `byCategory.*.ding` / `byRegion` / `fugitives` / `deepFieldEffects.serviceAgeDing` / `military`）。
- **裁定：两套独立竞争的丁账，经叶子 populationDetail 单向耦合**（叶子 → `aggregateRegionsToVariables`(tm-integration-bridge.js:558-603·优先读叶子 populationDetail 求和) → `national`；**无 national→叶子回写**）。`GM.population.byRegion[x]` 指向 `div.population`（tm-integration-bridge.js:136-145 从 populationDetail **派生的兄弟扁平对象**，:385 `byRegion[div.id]=div.population`），**与叶子 populationDetail 不是同一对象**·初值相等后各自漂移。
- `national.ding` 现状 = huji 初始常数（天启 18,000,000·`scenarios/tianqi7-1627.js:2716`）→ 但每回合被 `aggregateRegionsToVariables` 用叶子之和**覆盖**。Renli 不写 ding 总量（铁律守住）→ **ding 真相源安全**。
- **byRegion key 漂移隐患**：huji `byRegion` key = adminHierarchy **顶级** division 的 `div_xxx` 自动 id（非中文名·非叶子 id）。live 天启「只生成最高一级」（顶级==叶子）故恰好对齐；AI 一旦生成府县子节点，叶子 id（Renli 读）与顶级 id（huji 读）分叉→两套 region 账脱钩。

### 附2.2 激活时的确切碰撞面（共 3 处）

1. **★逃亡双产（最直接）**：huji 每回合产 fugitives——`tm-huji-engine.js:633-647`（_tickCorvee 役负>0.40→`P.fugitives+=`）+ `:559-569`（_tickDeepFieldLinkages 族教压力→`r.fugitives`）。Renli `tickLeaf`（tm-renli.js:280）也产 fugitives。两者激活后同回合各产一份，且 Renli 写的叶子 fugitives 被 `aggregateRegionsToVariables`(:567) 聚进 `national.fugitives`·**与 huji 直写的 national.fugitives 叠加**。
2. **役负满意度双扣**：huji `applyCorveeHardEffect`（tm-huji-runtime-bridge.js:691·役缺→MinxinLedger 按地域打农户）+ Renli 役负信号（§4.4 过 gateSatisfaction）。都打农户·都过总闸——闸防跳楼但**叠两笔**役负扣分。
3. **叶子 populationDetail.{fugitives,hiddenCount} 三方共写**：huji-runtime-bridge `aggregatePopulation`(:234 回写)、huji-governance-loop `applyRegionalPopulationDelta`(:421-432 减 hiddenCount/fugitives)、Renli tickLeaf(:280/285)。bridge 那笔是读出原样写回（不增量·低危）；governance-loop 那笔在普查/招抚兑现时减（与 Renli 招抚变法语义重叠·须裁谁主）。

### 附2.3 好消息：变法填真空·无雷同（de-risk R6）

全库三个 `applyReform`：`CentralLocalEngine`（央地财政·allocation/autonomy/compliance/audit·**那 6 个农政变法词根本不在该文件**）、`CurrencyEngine`（货币·银本位/开海/纸钞·tm-economy-engine.js:690）、`TM.Renli`（农政·tm-renli.js:443）。诏书解析器（tm-edict-parser.js:194/236）**只调 CurrencyEngine** 且只认货币类（full_currency_reform/开海/纸钞/私铸）。huji/fiscal/guoku **均未建模** Renli 语义的「册载丁棘轮 / 士绅免役 youmian 折算 / 田亩清丈」（只有 taxBaseRatio 雏形 + landsSurveyed 兼并回退田·语义/字段都不同）。**→ Renli 的 重修黄册/限制优免/清丈/蠲免/水利/招抚/摊丁 七条填真空·与既有引擎不双重处理**。唯一沾边词「一条鞭法」：CurrencyEngine 当银本位、Renli 当役折银+穷省毒——同史事两 facet·激活时让二者**各管一面**（货币标准 vs laborMarketDepth）勿都扣满意度即可。

### 附2.4「清理刀」作废（补正 §0.5.4 / R0.2 的「废」前提）

§0.5.4 / R0.2 列的「废 `_tickMilitary` 抽象兵池 + 全国均匀战损」经实读**作废其前提**：`_tickMilitary`（tm-huji-engine.js:721-753）有 `military.enabled` 守卫、只从人口**算**军户/府兵/募兵兵力（非消耗·非扣减），是**活跃在用**的兵源枢纽·删之即断兵源。所谓「全国均匀战损」grep **0 命中**（记忆有误·不存在）。Renli 兵燹只定位毁田·与之互补不冲突。**→ 激活前无独立「清理刀」可做**；军事去重并入 R3.5 激活时处理（招募实扣 alloc.draft + 战损定位）·而非删 `_tickMilitary` 整体。

### 附2.5 激活硬约束 + 推荐序（待 owner 触发激活时执行·改 live 平衡）

激活 = **改 live 平衡**（owner 保留的谨慎决策）·按序：
1. **种子**：陕西/江南先行 → 全 17 省（走 scenario→官方JSON→快照→bump SNAP_QS 八制品管线·§十）。
2. **逃亡单一权威**：种子地域裁定 fugitives 由 Renli 叶子接管·**停掉 huji `_tickCorvee:633-647` + `_tickDeepFieldLinkages:559-569` 的 fugitive 产出**（按种子地域门控·或全局二选一）→ 消除双产。
3. **役负满意度去重**：种子地域役负→农户满意度由 Renli 走（过 gate）·huji `applyCorveeHardEffect` 役负那笔对种子地域让位（避双扣）；缺粮/隐逃→税基那笔 huji 留。
4. **接役需/draftDemand**：corveeDemand/draftDemand 接诏书/项目/战役生成（现为 0·有役需 Renli 才有役负可算）。
5. **R6c 变法诏书触发**（填真空·安全·**✅ 已落 2026-06-16·未 commit**）：8 变法接诏书识别 = `TM.Renli.recognizeEdictReform`（tm-renli.js）挂 `processEdictEffects`（tm-endturn-edict.js·additive guarded 钩子）。**未种子地域零工作早返回**（live 不扫文本·零风险）；按 `leaf.name` 配文本避 id 漂移；大变法（清丈/黄册/鞭法/限免/摊丁）未点名地域须带「天下/各省」才全国推行（防一句话血洗全国），软变法（蠲免/招抚/水利）未点名默认全部已种子；蠲免年数从文本解析；一条鞭法与 CurrencyEngine 各管一面（laborMarketDepth vs 货币标准）。24 smoke 断言 + 诏书路回归绿。`.bak-renlir6c-20260616`。
6. **R6b 两 builder 改读 alloc**（§0.5.4·R0.4·须种子后）：buildCorveeLedger 读 alloc.corvee、buildMilitaryPool 读 alloc.draft 余。
7. **R7 UI**（役政视图/方志卷/官报雾·种子后才有真数据可显）。
8. **校准**：swap-test + 真存档·逐项验逃亡不双产、满意度不双扣、陕西/江南走查基线仍成立。

> **当前安全态**：huji 全活、Renli 休眠（live 叶子无 `renliSeed` → tickLeaf 早返回零行为）。上述任何一步未做前·机制层对 live 局零影响。R6c/R6b/R7 虽属「激活」phase·但 R6c（诏书触发·gated 惰性）与 R7（UI）技术上可在种子前先落（休眠不显）·R6b 必须种子后（否则未种子地域 corvée/兵员被清零）。
