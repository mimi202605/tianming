# 地块/势力面板重构 · 建筑入账 · 字段活化 — 机制设计案

> 2026-06-11 · 配套预览：`web/preview/map-dossier-redesign-preview.html`（舆图检签 v2）
> 状态更新 2026-06-12：**S1/S2(存量模型变体)/S4/S5 已落运行时**——四视图计分公式（moodViewScore 等四式·phase8-formal-map.js）、五档着色+哨牌+图例+签注判语、方志/谱牒册页（替换 codex 版 ppop·旧链 28 死函数删净）、建筑工役引擎（tm-building-works.js·工期 tick/完工入账白名单/appliedDelta 可逆/维护费/失修·挂 endturn-core final aggregate 前）、兴造入口复活 _dfBuildModal。验证：smoke-building-works+smoke-map-view-scores+phase8-map-live-panels PASS。
> 状态更新 2026-06-12（二）：**S3/S6/S7 全部落地 + 兴造弹窗御案化 + 谱牒渲染治理**。
> - **S3**：custom_build 须吐 `effectsStructured`（prompt 教学+schema 描述+apply 落库持久化）；引擎侧 `sanitizeStructuredFx` 白名单+**费效封顶**（费用五档→pct 上限 1%-25%·城防须 ≥5000 两·大数账目封 cost×8·募兵封 cost/4——十两银修不出雄关）。smoke-building-works 扩至 31 断言。
> - **S6 字段活化第一批五管线**（新模块 `tm-field-pipelines.js`·TM.FieldPipes）：①`policyExecRate(div)` 政令执行率（硬链 localExecutionRate 底数 − 官缺 8%/员 − 主官出缺 5% − 驿路阻滞 ≤10%·夹 [0.3,1]）→ **tm-endturn-apply admin_changes 五项 delta 全打折**（postRelays/officeVacancy/governor 由此成活）；②`fleeTaxPenalty(div)` 逃隐户税基折减（逃户全免+隐户六成·封顶 35%）→ **tm-fiscal-engine computeTaxAmount**（cascade 权威税路·零数据零变更·FieldPipes 缺位安全）；③`capRecruitDelta` 募兵硬上限（硬链 md.availableRecruits 兵源池·回退丁口×12%×0.7·同回合多笔共享扣池）→ **tm-ai-change-army 募字号正向扩编封顶·越限强征扣民心叶**；④重税缓跌 tick（taxFactor≥1.18 → 民心叶 −0.5/回合·≥1.3 → −1·地板 25）挂 endturn-core aggregate 前。
> - **S7**：`div._fieldLedger` 环形近账（8 条/字段·FieldPipes 重税/强征/募兵 + BuildingWorks 完工写入）+ 因果签浮层「近账」段（bkCauseLedgerHtml·minxin/recruits/fort/corruption 四键映射）。
> - **UI 补彻底**：`_dfBuildModal` 御案宣纸重做（tmjz 家族 CSS·剧本工籍卡带效用徽签/类别印/基费工期·自拟营造页带「有司核定之制」规则框·录入后 `tm-yingzao-submitted` 事件就地重渲营造志）；谱牒六卷结构感知渲染（fieldLabel 补 40+ 键·BK_ENUM_CN 值枚举译表·relations→邦交印泥条·publicOpinion/cohesion/techLevel→评分徽签·warState→现战/将起/近役·offendThresholds→阈值行·historicalEvents→年表行·leaderInfo/heirInfo 空名虚位卡·members 取 FactionIndex chars 名册）。
> - **验证**：smoke-field-pipelines 41 断言（含 cascade vm 实跑 8700=13% 折减+零依赖安全）+building-works 31+live-panels/view-scores PASS·全部注册 verify-all·靶向 83 smoke 79 绿 4 红（全部=已知假红·断在今日未触碰的 tm-endturn-ai.js·mtime 实证）·syntax 659 全过+encoding+ref-check 过·游戏内实拍 dg-*.png 全链路通。
> - **残留 backlog**：postRelays 真「时滞延迟回合数」（现以执行率折扣承载）；「势力格局」开局浮层盖册页（既有行为）；S6 第二批（保甲/承载上限/灾异折减/strategicValue 进 AI 目标评分）。
> 状态更新 2026-06-12（三）：**军地绑定 + 财赋归零病修 + 状态系统 + 经济演绎闭环**（.bak-econstatus-20260612×9）。
> - **两病钉死（实拍取证）**：①军队（GM.armies·驻地为城名）与地块驻军（区划字段全 undefined·provinceStats.soldiers=0 死缺省）两本账；②乌思藏财赋视图归零=cascade 对无税基区划无条件写 `fiscal.actualRevenue=0` 抹掉剧本静态账 + regionBundle 跨源混账（应征取静态/实征取 live 0）。
> - **修**：cascade 一文未征不抹账守卫（cascadeDivision claimedTotal≤0 直接 return）+ regionBundle 收支四账「正值优先·零视为缺」+ 实征空时以起运+留用同源重建 + `taxViewScore` 同守卫。验：乌思藏哨牌 0→77·全图零牌 0。
> - **军地绑定** `armyRegionIndex`（phase8-formal-map）：驻地名 token 拆分（·-/等）→ 两遍匹配（先全等后双向包含）→ 区划子树名册爬根 → 按地块聚合；剧本可在 region.data.aliases / division.aliases 扩别名（朝代地名不进引擎）。军备志卷首活军卡（军名/兵数/主将/士气低朱显）+「在驻之师 N 支」+ 驻军读数=绑定军合计（armyViewScore 同源受益）。实测：陕西绑 4 支 7.2 万、山西 3 支 5.9 万。
> - **状态系统**（新 `tm-region-status.js`·TM.RegionStatus）：`division.statusEffects[]` 五类（wonder 奇观/disaster 灾异/player 圣裁/event 风云/building 营造）·每条 {econPct, minxinPerTurn, expiresTurn|永续, source}·normalize 硬闸（econPct±25%·民心±2/回合·工期≤24·每地≤12·同源同名替换）。**econMult 乘进 cascade computeTaxAmount**（夹[0.5,1.6]·零状态=1）；tick（endturn-core·BuildingWorks 后 FieldPipes 前）过期清除+状态民心摊叶（合计夹±2）+**繁荣度缓变**（Δ=f(民心,状态乘子,兵燹) 夹[-2,+1]·地板5顶95·有字段才动——taxBase('prosperity') 读它=经济联动闭环）。AI 通道 `region_status_changes`（prompt 教学+schema+validator 白名单+apply 处理器）。
> - **建筑作用加强**：完工投「工成之利」building 状态（econPct=cost/200万·夹[0.5%,3%]×级·费<1000 两不成势）——oneShot 税基存量外的第二层流量账；失修撤/修缮复挂/拆毁撤。
> - **UI**：方志第七卷「状态」（检签「况」·kind 印色分卡·效果徽签±·余 N 回合/永续·空卷不挂签）；繁荣行因果签（prosperity 键+近账）。
> - **验证**：smoke-region-status 40（normalize/econMult/tick/建筑钩子/cascade vm 实跑 8000=−20%/不抹账守卫/十处接线契约）+field-pipelines 41+building-works 31+view-scores 38+live-panels 含军地绑定/零值守卫/状态卷新断言全 PASS·注册 verify-all·靶向 84 smoke=80 绿 4 红（同基线假红·零新增）·syntax 660+encoding+ref-check 过·游戏内实拍 g4-*.png（哨牌零牌数 0/活军卡/状态卷三色卡）。

---

## 一、背景与病象

Codex 版地块/势力面板（`phase8-formal-map.js` 的 `#ppop`）四病：占左半屏（830px）、羊皮纸样式脱离御案家族、7 标签页且字段重复两遍、**建筑功能丢失**。前两者属 UI（预览页已解），后两者背后是机制问题：

1. **建筑系统断头**：修建入口 `_dfBuildModal`（tm-player-core.js:1159）全库无调用点成孤儿；已建建筑 `division.buildings` 无任何 UI 展示；建筑效果只有一段 `judgedEffects` 文本，**不入任何账**——建了等于没建。
2. **字段大面积「死」**：面板展示的几十个字段中，约半数只是剧本静态描述的回显，既不被引擎读、也不被玩家/AI 写，更看不出它牵动什么。玩家看到「保甲：编练中」「承载上限：未逼」不知道这数字与自己何干。

本案解决三件事：**建筑怎么入账**（§二）、**字段怎么起作用**（§三）、**怎么让字段活而不死**（§四）。

---

## 二、建筑系统：从「文本摆设」到「入账之业」

### 2.1 现状链路考古（事实，已实查）

| 环节 | 现状 | 文件:行 |
|---|---|---|
| 模板 | `P.buildingSystem.buildingTypes[]`：`{name, category, maxLevel, baseCost, buildTime, description}`，天启剧本已配 17 种 | 剧本 + tm-data-model.js:160 |
| 玩家入口 | `_dfBuildModal(divName)` → 推 `GM._edictSuggestions`（诏令建议库）→ 颁诏 | tm-player-core.js:1159 **孤儿** |
| AI 通道 | endturn 吐 `p1.building_changes[]`（build/custom_build/upgrade/destroy + feasibility 三档）| tm-endturn-apply.js:3399 |
| 落库 | `division.buildings[]`：`{name, level, isCustom, description, judgedEffects, costActual, timeActual, status:'building'/'completed', remainingTurns, startTurn}` | tm-endturn-apply.js:3441 |
| AI 感知 | 已建建筑注入 endturn prompt | tm-ai-planning.js:924 |
| 工期推进 | **无**——`remainingTurns` 落库后无人递减，在建永远在建 | （缺失） |
| 效果入账 | **无**——`judgedEffects` 是纯文本，不作用任何字段 | （缺失） |
| UI 展示 | **无** | （缺失） |

结论：管线前半段（玩家拟→诏令→AI 核定→落库→AI 感知）**骨架全在**，断在后半段（工期 tick、效果入账、UI）。修复是续骨，不是重做。

### 2.2 效果模型：三类效果，各走各的账

建筑效果必须服从本项目最大的范式教训——**「改源头叶子，非直写聚合值」**（民心三刀被 aggregate 蒸发之鉴）。同时要防第二个坑：**每回合直加叶子会无限累积**（耕地每回合 +5 万亩 → 爆账）。因此把效果分三类，账路各异：

**A. 存量效果（oneShot-on-complete）**——改的是「地块是什么」
- 例：城墙完工 → `armyDetail.fortification` +1 档；垦荒 → `economyBase.farmland` +N 亩；驿站 → `economyBase.postRelays` +5。
- 账路：**完工一次性写叶子**，记 `appliedDelta` 于建筑实例（可逆：拆毁/损毁时回退）。绝不每回合重复加。
- 防重复：实例上 `appliedTurn` 标记，apply 幂等。

**B. 流量效果（perTurn contribution）**——改的是「地块每回合产出什么」
- 例：盐场 → 本回合盐课产出 +X 斤；钞关 → 商税 +X 两；漕仓 → 灾年放赈护民心底。
- 账路：**不写叶子**，挂「贡献账」`division._buildingYield = {moneyOutput:+X, grainOutput:+Y, ...}`，由**读取点合算**——cascade 计税基/产出时 `+= 贡献账`，与现有八源→cascade 同路。每回合重算贡献账（按 status==='completed' 的建筑现算），天然无累积漂移。
- 民心类流量（文庙教化 +1/回合趋向）走 `adjustMinxin` 正路（摊叶子），且**封顶**（同一地块建筑民心流量合计 ±2/回合），不与稳定器打架。

**C. 战守效果（situational multiplier）**——改的是「事件发生时怎么算」
- 例：城防档位 → 守城战力乘成（`battleConfig.fortLevelBonus` 已有 1.0~3.0 表，**直接复用**）；烽燧 → 边警预警 +1 回合；总兵府 → 募兵上限 +N。
- 账路：不入常账，**结算公式读取**——战斗结算、募兵上限计算、预警判定时查该地建筑表。

> 维护费：每建筑 `upkeepPerTurn`，每回合从**地方留用**（retainedBudget→地方库银）扣除，入地方支出账。库银不足则记欠维护 `arrears`，连欠 3 回合建筑降为 `status:'neglected'`（效果减半），AI 叙事可接「府库空虚、武备废弛」。**不直接扣中央国库**——地方的业地方养，这正是央地 cascade 的题中之义。

### 2.3 两种建筑的核定差异

**剧本预定建筑**（buildingTypes 内）：
- 效果**编辑器可配**：模板新增 `effects` 字段（见 2.5 schema）。剧本作者定准账——卫所加多少兵源、盐场加多少盐课。
- 玩家颁诏修建 → AI 只核「此时此地能不能修」（feasibility 三档：合理/勉强/不合理）与实际费用工期（灾年料贵、边地工险），**效果照模板抄**，不让 AI 现编。
- 勉强档：费用 ×1.5、工期 ×1.5；不合理档：不开工，银不扣，邸报说明缘由（自然政治结果，非玄幻惩罚）。

**自拟营造**（玩家自由文本）：
- 核心难题：AI 要把自然语言「修文馆以藏书安士心」翻成**入账的数**。
- 解法：AI 核定时必吐结构化 `effectsStructured`，但受**双重枷锁**：
  1. **白名单**：只许作用于下列叶子字段/贡献项——
     `economyBase.{farmland, commerceVolume, commerceCoefficient, saltProduction, mineralProduction, fishingProduction, horseProduction, postRelays, roadQuality, kejuQuota}`、`armyDetail.{fortification(档), recruits}`、`fiscalDetail.compliance`、`minxinLocal(流量·封顶)`、`corruptionLocal(流量·封顶)`、`_buildingYield.{moneyOutput, grainOutput}`、战守类 `{warning, defenseCasualtyCut}`。白名单外的键 apply 时**静默丢弃并记日志**（对齐 P-QAM apply 硬门思路）。
  2. **费效挂钩封顶**：效果量级与 `costActual` 挂钩——`效果上限 = f(费用档)`。十两银修不出雄关：apply 侧按费用档查封顶表，超出截断。AI prompt 里同时教这个尺度（提示词软约束 + apply 硬门，双层，对齐 P-QAM 两层范式）。
- 自拟建筑的 `judgedEffects` 文本保留——给 AI 叙事和玩家阅读；`effectsStructured` 给账。**文账分离，各司其职**。

### 2.4 生命周期状态机

```
candidate(诏令建议库) → promulgated(颁行) → [AI核定]
  ├─ 不合理 → rejected（邸报陈情，不扣银）
  └─ 合理/勉强 → building(扣银开工, remainingTurns=timeActual)
        │ 每回合: remainingTurns-- （★新增 tick，现缺失）
        ├─ 工成 → completed（施加 oneShot 存量、登记流量/战守、addEB「工成」、民心小赏+1 一次性）
        ├─ 兵灾过境/围城陷落 → damaged（效果减半，可再修复=半费半期）
        ├─ 连欠维护 3 回合 → neglected（效果减半）
        ├─ 玩家诏令拆除 / AI destroy → demolished（回退 appliedDelta，存量可逆）
        └─ 玩家诏令升级 → building(升级工期) → level+1（增量 oneShot）
```

工期 tick 挂 endturn 管道确定性步骤（非 AI 步），与「民心稳定器」同段执行——这是**纯机械账，不烧 token**。

### 2.5 Schema 增量（编辑器面/运行时面/AI 面三面齐备）

```js
// 编辑器面 · buildingTypes[i] 新增（向后兼容：无 effects 的旧模板 = 纯叙事建筑，照旧不入账）
effects: {
  oneShot:   { 'armyDetail.fortification': 1, 'economyBase.postRelays': 5 },   // 完工一次性·每级
  perTurn:   { moneyOutput: 12000, grainOutput: 0, minxin: 0.5 },              // 每回合贡献·每级
  combat:    { fortLevel: 1, warning: 1, defenseCasualtyCut: 0.1 },            // 战守·查表用
  upkeepPerTurn: 200,                                                          // 月维护（地方留用出）
}
// 运行时面 · division.buildings[i] 新增
effectsStructured: {...同上结构（预定=抄模板·自拟=AI核定吐）},
appliedDelta: {...完工时实际写入叶子的增量（拆毁可逆账）},
appliedTurn: N, arrears: 0,
// AI 面 · building_changes schema 新增（仅自拟需要）
{ action:'custom_build', territory, type, feasibility, costActual, timeActual,
  judgedEffects:'文本叙事', effectsStructured:{...白名单内} }
```

### 2.6 全局作用路径（建筑→地块→天下）

建筑**永不直改全局值**。路径只有一条：建筑 → 地块叶子/贡献账 → 既有聚合管线 → 全局。
- 财：贡献账 → cascade 实收 → 央地分成 → 太仓月入。
- 民心：流量 → adjustMinxin 摊叶子 → 回合末 aggregate → 全国民心。
- 军：城防/兵源 → 战斗结算/募兵公式（事发时读）。
- 认知：已建建筑注入 AI prompt（已有），AI 推演自然「看见」雄城坚仓——叙事层全局作用免费获得。

这样建筑系统不引入任何新的聚合头，**零双头撞账风险**。

---

## 三、地块字段作用矩阵（已活 / 半活 / 死）

判据见 §四。以下为面板展示字段的全量盘点与接活方案（按六卷分组）：

### 户口志
| 字段 | 现状 | 作用管线（设计） |
|---|---|---|
| mouths/households | **已活** | 税基、aggregate 人口 |
| ding 丁口 | 半活 | ★接：应征 = 田亩×税则 + **丁×丁银**；徭役征发按丁，大工役耗丁扣民心叶账 |
| fugitives 逃户 | 半活（AI 叙事有） | ★接：税基折减（逃户不纳）；民变规模加成项；安辑诏令可收编回册 |
| hiddenCount 隐户 | 死 | ★接：清丈括户诏令收编入册（+税基），触发士绅阻力（入廷议/阶层账）|
| carryingCapacity | 死 | ★接：人口增长上限；超限 → 流民产出（逃户+）|
| baojia 保甲 | 死 | ★接：民变压制系数（揭竿判级减档）+ 抽丁效率；编练走诏令 |
| byFaith/byEthnicity | 死 | ★接：特定诏令阻力矩阵（如禁教 → 按信仰构成算抵触面）；民变类型标签 |

### 财赋志
| 字段 | 现状 | 作用管线 |
|---|---|---|
| compliance/skimming | **已活**（cascade 实征闸·P-VWF） | 维持；UI 加因果显示 |
| claimedRevenue/actualRevenue/remitted/retained | **已活** | 维持 |
| taxBurden 税负 | 半活 | ★接：民心叶账月扣系数（重税之地民心缓跌）——闭环「加派激变」|
| 库藏银/粮/布 | 半活 | ★接：建筑维护费出此；放赈/募兵地方先动本库，竭则向中央乞拨（央地博弈味）|
| taxLevel 税级 | 半活 | ★并入 taxBurden 一本账，删二义性 |

### 军备志
| 字段 | 现状 | 作用管线 |
|---|---|---|
| garrison/troops | **已活** | 战斗/军压 |
| fortification | **已活**（battleConfig.fortLevelBonus）| 建筑 C 类效果挂此 |
| militaryRecruits | 半活 | ★接：募兵硬上限 = f(丁口, 民心系数)；强征越限 → 民心叶账立扣 |
| supply 补给 | 死（siegeConfig 未启） | ★接：围城/远征战力衰减系数（启用 siegeConfig 时）；驿路/海运加成 |
| borderRisk/armyPressure | 半活 | ★接：军压档 → 本地月耗粮饷 → 留用账支出；预警回合（烽燧加成）|
| strategicValue | 死 | ★接：AI 攻伐目标优先级权重（注入势力 LLM prompt 的目标评分）|

### 职官志
| 字段 | 现状 | 作用管线 |
|---|---|---|
| governor/officialPosition | **已活**（官制树/任免） | 维持 |
| corruptionLocal | **已活**（aggregate 吏治+截留） | 维持；与 GM.corruption.subDepts 两本账关系照旧（一中央一地方）|
| vacancy 官缺 | 半活 | ★接：政令执行率扣项（每缺 -8%）；铨选/科举补缺 |
| policyExecution | 半活 | ★接：**凡诏令落本地的效果按执行率打折**——这是字段活化的样板（见§四）|
| academies/leadingGentry | 死 | ★接：科举大改 F 系列已规划挂书院；士绅 → 清丈/加派阻力系数 + 隐户荫庇量 |
| religiousSites | 死 | ★接：信仰事件锚点（低优先）|

### 风物志
| 字段 | 现状 | 作用管线 |
|---|---|---|
| farmland/commerce/salt/mine/fishing | **已活**（八源→cascade）| 建筑 B 类贡献账并入 |
| postRelays/roadQuality | 半活（AI 叙事） | ★接：政令时滞（诏令生效延迟回合数）、军报预警、行军速度对账层、裁驿 → 流民事件 |
| kejuQuota | 半活 | 科举 sprint 已规划，不在本案动 |
| recentDisasters/threats | 半活（AI prompt 有） | ★接：灾异 → 当季产出折减 + 民心叶账扣 + 放赈诏令钩子 |

> 优先级建议：第一批接 **policyExecution（诏令打折）、taxBurden（重税缓跌民心）、fugitives/hidden（税基折减+清丈括户）、militaryRecruits（募兵上限）、postRelays（政令时滞）** 五条——它们都是「读管线」单点接入，不新增写渠道，风险最小、玩家感知最强。

---

## 四、字段活化范式（通用答案）

一个字段「活」，须同时满足三判据：

1. **有读管线**：至少一个确定性结算公式或事件判定每回合/事发时读它（引擎面）。只被 AI prompt 读不算活——那是叙事感知，账面无痕。
2. **有写渠道**：玩家诏令、AI 推演 apply、确定性事件至少一方能改它，且**只改源头叶子**（aggregate 范式铁律）。
3. **可追因果**：UI 能展示「它牵动什么、被什么牵动、最近为何变」（认知面）。玩家看不见因果的活字段，和死字段在体验上等价。

**活化的标准作法**（以 policyExecution 为样板）：
- 读：endturn apply 落本地诏令效果时 `效果 × execution%`；
- 写：官缺-8%/缺、贪腐 -X、主官能力 +X、整饬诏令 +Y——全在叶子上算出，不存死缓存（或存缓存但回合末统一重算，对齐 syncAuthorityPhases 治本范式）；
- 因果：面板该行 hover「牵动」账签——『凡颁于此地之诏，效用按执行率打折；因由：官缺 2 员、贪腐 74、阉党残余』。

**字段账本 `_fieldLedger`（第二期）**：关键叶子字段变更时记 `{turn, delta, why, src}` 环形账（每字段限 8 条防膨胀），面板因果签下半显示「近账」：『上回合 -3：辽饷加派摊派』。这把「为什么变」也补齐——与 MinxinLedger 既有设施同范式，可复用其思路。

**UI 端约定**（预览页已演示）：可追因果的字段在栏格行尾带「›」角标，hover 出「牵动」账签（朱缘宣纸小签：牵动项 2-4 条 + 尾注）。读数带五卡全部带账签。

---

## 五、四视图与悬浮签注（UI 规格 · 预览已实装）

- **视图签**：舆图顶部中央横排五签——势力（默认）/民情/军务/官守/财赋。active 朱底白字。
- **着色**：各视图 4-5 档色阶（民情 危朱→乐玉；军务 靖灰玉→急朱；官守 清玉→蠹墨朱；财赋 欠暗赭→足亮金）。化外势力在内政视图一律「化外灰」。深色底上对比 ≥3:1。
- **哨牌**：数据视图下每地块中心一枚圆牌显示**数值/档字**（民情=民心数、军务=靖备警急、官守=贪腐数、财赋=合规%）——色不孤行，色弱可读。
- **签注 tooltip**（248px 宣纸小笺，跟随光标，越界翻转）：
  - 头：地名 + 归属色点；
  - 体：本视图 3-4 行核心读数（危值朱显）；
  - **判语**：一句把数字翻成人话（『民心 46——民力已竭，逃户一十八万，有生变之虞』），档位定语气色（危朱/平金/安玉）；
  - 尾：『左键 翻方志 · 右键 展势力』。
  - 化外地块：显示『化外之邦 · 谍报有限』+ 仅兵威/邦交两行（情报所及）。
- **交互**：左键地块=方志册页；右键=所属势力谱牒（对齐现行运行时 contextmenu 习惯）；关闭(×)=隐藏整册，合册(—)=收成书脊。
- 运行时接线时，视图着色复用现行 `mapMode` 管线（MAP_MODE_META 已有 mood/tax/army/office 四模式与 dirty 守卫），只换配色函数与图例渲染；签注替换现行 hover 行为。

---

## 六、落地切片建议（保守拆分 · 一刀一事）

| Slice | 内容 | 风险 |
|---|---|---|
| S1 | 工期 tick + 维护费（确定性步，建筑状态机走通；不含效果入账） | 低 |
| S2 | 预定建筑 effects schema + 完工 oneShot 入账（appliedDelta 可逆） + 贡献账并入 cascade 读取点 | 中（碰 cascade 读取点，须等价性验证） |
| S3 | 自拟营造 effectsStructured：AI schema + 白名单/费效封顶 apply 硬门 + prompt 尺度教学 | 中 |
| S4 | 面板接线：openRegionDossier/openFactionDossier 重写成方志/谱牒册页（含营造志 UI + 复活 _dfBuildModal 流程并入「兴造」） | 中（纯 UI） |
| S5 | 四视图着色+哨牌+签注（复用 mapMode 管线换皮） | 低 |
| S6 | 字段活化第一批五条（policyExecution/taxBurden/fugitives/recruits/postRelays 读管线） | 中 |
| S7 | 因果账签 UI（CAUSES 表数据化，从字段作用矩阵生成） + `_fieldLedger` 近账 | 低 |

依赖：S2 依赖 S1；S4/S5 可与 S1-S3 并行；S7 依赖 S6。每片独立 smoke + .bak。

---

## 附：与既有范式的对齐清单（自检）

- ✅ 改源头叶子，不直写聚合值（民心三刀之鉴）——建筑三类账全部走叶子/贡献/查表
- ✅ 玩家操作只走五渠道，面板纯视图——「兴造」入诏令建议库，不直改账
- ✅ 提示词软约束 + apply 硬门双层（P-QAM 范式）——自拟营造白名单+费效封顶
- ✅ 失败禁玄幻惩罚——不合理=不开工+陈情；欠维护=效果减半，皆自然政治/账务结果
- ✅ 新机制三面齐备（编辑器/运行时/AI）——effects 模板可配、tick 确定性、schema+prompt 扩展
- ✅ UI chrome 朝代中立——方志/谱牒/营造/兴造/邦交皆通用古语；卫所/辽饷等专名属剧本数据
- ✅ 缓存字段回合末统一重算（段位 phase 之鉴）——execution 等派生值不存死缓存

---

## 第四波 · 死字段修（2026-06-13·.bak-deadfields-20260613）

玩家报「各个视图读的是死字段不是真实字段——民情视图的民心就是开局的死字段，其他的也有」。

### 病根钉死（实锤）
`tm-minxin-hard-links.js:331-337` 的 `tick()` 只遍历 `getLeafDivisions(adminHierarchy,'player')`——**仅更新叶子**（顺天府…）的 `.minxin`。而：
- 地图 region 的 `r.data.minxinLocal` 是**另一对象**（map.regions[i].data），引擎从不碰；
- adminHierarchy 的**省级节点**（北直隶）`.minxin` 是开局种子，引擎只写叶不回滚；
- `provinceStats` 按**府级叶键**存（顺天府…），故 `findLiveProvinceStats(北直隶)` 恒空。

`regionBundle` 旧代码（2209 行）取 `firstValue(liveStats.minxin, …, liveDivision.minxinLocal, liveDivision.minxin)`——liveStats 恒空、liveDivision 是冻结省节点，故 `data.minxinLocal` 恒 = 开局死值。corruption/prosperity/unrest 同病。**动态证伪**：把北直隶全叶 minxin 砸到 13，mood 哨牌纹丝不动（旧）。

### 修法（三刀·phase8-formal-map.js）
1. **`liveRegionVitals(r, liveDivision)`**（新·缓存按回合）：走活区划子树**叶子**，人口加权聚合 minxin/corruption/prosperity + 民变取叶最坏。这才是引擎逐回合更新的真账。
2. **`regionBundle` 改 firstValue 首位取 `vitals.*`**（压过恒空 liveStats 与冻结省节点）→ 覆盖 `data.minxinLocal/minxin/corruptionLocal/corruption/prosperity/unrest` + 挂 `data.liveVitals` + 返回带 `vitals`。**一处 chokepoint**：mood/office 视图、hover 签注、判语、方志册页全部随之活化。
3. **`armyViewScore` 折入活态军情**：绑定活军（GM.armies）兵变险/欠饷/低气/缺粮取最坏并入军务分——军务舆图反映当下危局而非开局静态威胁词。

各视图活/死复核：mood(民心)❌→✅、office(吏治)❌→✅、army(军情)半静→✅、tax 已活（前波修）、classPressure 已活（读桥账本）、owner 已活。

### 验证
- 新 `smoke-map-live-vitals.js` 20 断言（vm 抽 liveRegionVitals 实算人口加权/嵌套只聚叶/null 让位/单叶/民变 max/回合缓存 + regionBundle 取 vitals 首位 + 军务读活军 源码契约）·注册 verify-all。
- **动态证伪转正**：北直隶全叶 minxin→18 corruption→92 后 mood 36→8(危)、office→100(蠹)、辽东注兵变险 88→army 急；方志册页民心读 **8**（活·非开局 46）、吏治 100。实拍 lf-*.png。
- map-view-scores/live-panels/region-status/field-pipelines/building-works/social-foundation 回归全绿；endturn 2 红为基线假红（tm-endturn-ai 行数·未动）。
- **未 ship**。
