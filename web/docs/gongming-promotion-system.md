# 天命 · 功名升迁系统 设计与落地（owner 2026-06-04 锁定）

> 起因：owner 实玩发现人物图志「贤能」是死字段。查实功名(virtueMerit)系统**半实装**——挣取(tickVirtueMerit/事件)已接进 endTurn，但「用功名升官」未实装(calcPromotionChance 无调用方+字段路径错)、AI 行为权重(_computeBehaviorWeights)从没落地。owner 决定补全为完整系统，并把「贤能」更名「功名」。

## 一、概念
- **功名 = `char.resources.virtueMerit`**（累积政绩·升迁凭据·资历·**不扣减**·能力×勤政×政绩攒得）+ `char.resources.virtueStage`（1-6 数字阶）。
- 尺度 **0 ~ 15000(正一品)**。历史名臣 ≈ 一品级。**旧 0~1000 尺度迁移倍率 SCALE=15**。

## 二、阈值表（18 级·正/从分开·从九品也设门槛·big growing gaps·正一品=15000）
| 品 | level | floor | 区 | 品 | level | floor | 区 |
|---|---|---|---|---|---|---|---|
|从九品|18|70|自动|正四品|7|4120|自动顶|
|正九品|17|150|自动|从三品|6|5250|**政治线起**|
|从八品|16|260|自动|正三品|5|6650|政治|
|正八品|15|400|自动|从二品|4|8400|政治|
|从七品|14|580|自动|正二品|3|10550|政治|
|正七品|13|810|自动|从一品|2|12700|政治|
|从六品|12|1100|自动|正一品|1|15000|政治|
|正六品|11|1460|自动|||||
|从五品|10|1920|自动|||||
|正五品|9|2500|自动|||||
|从四品|8|3220|自动|||||

## 三、两层升迁模型
- **正四品及以下(level≥7) = 自动铨选升**：功名达标 floor + 概率(按 monthRatio) → 自动晋阶。资历政绩 routine。
- **从三品及以上(level≤6) = 政治擢升**：功名只是**门槛之一**(必要非充分)，还须 **皇帝特简/廷推会推 + 皇权皇威 + 派系 + 出缺**。**绝不自动**，归玩家诏令/廷推/AI。

## 四、挣取（已实装 + 待增强）
- **已接进 endTurn**：`CharEconEngine.tick→tickVirtueMerit`（时间·按 monthRatio）+ 事件(治理 ai-change-applier:1019 / 朝堂 tm-relations virtueActor)。
- **实测**：tick 仅 0.3~0.9/回合(mr=3)；`ch.abilities.administration` 字段**全无→政务项现在是死的**。
- **待增强(slice)**：① tick 改读真八维(getEffectiveAttr·按职类能臣度加权·能者多得庸者趋零) ② 高位递减(>9000 打折) ③ 单回合封顶。

## 五、科举注入（入仕功名来源·落点 `_kjApplyAllocations` keju-allocation:143）
状元+1100(正七品) / 榜眼+850 / 探花+700 / 二甲进士+430(正八品) / 三甲+280(从八品) / 举人+90(从九品过线)。武举/特科按名次同构。

## 六、玩家越级强擢·惩罚三档（缺口=目标 floor−实际功名·走皇威/民心/清议）
- 缺口 **<800 微擢**(轻：数言官微词·该员 fame−)
- **800~2500 幸进**(中：清议哗然·皇威−·部分忠诚−·该员+举主名望−)
- **>2500 骤升破格**(重：交章弹劾·皇威/民心明显损·该员压力↑成众矢之的·能力不配位政务打折)

## 七、自动升迁引擎 v3（只跑自动区·从三品及上交政治流程）
每回合：①综合分(功名+忠诚+才能配位+皇威皇权±)②功名达标 floor + 概率(按 monthRatio)→自动晋阶③散阶可微涨封顶≤实职+1④有降(功名跌破/恶行→议降腾缺)⑤纪事+邸报可见。

## 八、落地点
- `tm-promotion.js`（✅ 已建·常量+纯函数·零副作用）：阈值表/政治线/六阶/科举表/惩罚档/八维权重/能臣度。
- `onAppointment`(ai-change-applier:246·中央任免钩子·所有任免汇流)：**任职更新 rankLevel** + 升入更高品的功名门槛。
- `calcPromotionChance`(player-core:3177)：修字段路径(resources.virtueMerit+rankLevel)。
- endTurn 新增「自动铨选」步。
- AI context 注入「功名 X·阶名」。
- 玩家擢升诏令路径：软门槛+惩罚。
- `tm-renwu-tuzhi.js`：功名显示(✅ 已做·读 virtueMerit+阶名)。

## 九、施工顺序（每刀 node 断言 + 真游戏跑回合验·全完工前不 ship）
0. ✅ **常量层 tm-promotion.js**（已建·冒烟过）
1. ⬜ **功名重标定迁移（运行时 derive·非批改文件）**：VIRTUE_STAGES 已 ×15(常量层)；角色 virtueMerit 不做 ×15，改**按实际品级+八维能力 derive 拨发**(见 §十)——开局/读档/spawn 时跑 derive pass，标版本位防重跑。**不动那 12 个 historical-wave 文件**(风险骤降)。
2. ⬜ **地基** onAppointment 任职更新 rankLevel + 修 calcPromotionChance
3. ⬜ **科举注入** 按名次发功名
4. ⬜ **八维挣取** 修死字段 + 递减 + 封顶
5. ⬜ **玩家软门槛 + 三档惩罚**（诏令擢升路径）
6. ⬜ **AI 按功名举荐**（context 注入）
7. ⬜ **自动升迁引擎**（自动区）+ 政治区门槛

## 十、owner 2026-06-04 追加 4 条细化（已入常量层）
1. **旧档迁移 + 2. 剧本初始功名**：同一套 `deriveInitialMerit(ch, getEffectiveAttr, getRankLevel)` = 按**实际品级**(优先官衔 getRankLevel 推·回退 rankLevel)定区间 `[本品floor, 上一品floor]`，**八维能臣度**决定区间内位置(cap20→下界·cap90→上界)。例：正五品官→[2500,3220]按能力拨发。开局给天启/绍宋人物配，读档给老角色补。
3. **功名与道德/廉洁解耦**：去掉 tickVirtueMerit 里「廉洁>70 加分」；功名=政绩表现，不因清廉/贪婪本身增减。**唯一例外**：贪腐**被发现**(corruption_exposed) 才扣 −750。
4. **减功名内容**（`FAILURE_DELTA` 表·与能力挂钩·庸才办砸触发）：处事失败 −60 / 救灾不力 −120 / 地方失政 −150 / 改革失败 −450 / 重大冤案 −300 / 贻误军机 −400 / 军事溃败 −600 / 大败 −1000 / 贪腐案发 −750。
   - 挣取侧 #C：tick 改读真八维能臣度(getEffectiveAttr·能者多得庸者趋零)；事件挣取按能力**概率化**(能臣高概率拿满·庸才低概率甚至办砸→走 FAILURE_DELTA)。
   - 既有正向事件(治理 +6 系 / 朝堂 virtueActor) 在挣取刀按 `×SCALE` 应用到 15000 尺度(不批改 relations.js 字面量·在 adjustVirtueMerit 调用点乘)。

## 落地完成（2026-06-05·7 刀全验过·未 ship）
- **0 常量层** `tm-promotion.js`：阈值表/政治线从三品/六阶×15/科举/惩罚/失败表/八维能臣度/derive/resolveRankLevel/runAutoPromotion。
- **1 迁移** `migrateAllMerit`(幂等·loadPeople+endTurn 挂)·`resolveRankLevel`(officeTree holder→官衔关键字配名表→高阶差遣补充表→散阶 ch.rankLevel 取最高)·已罢官按官职保功名。验:毕自严正二品12485/温体仁正三品/孙承宗督师正二品。
- **2 地基** `onAppointment` 任职更新 rankLevel(officeTree权威)·`calcPromotionChance` 重写(读 resources.virtueMerit+resolveRankLevel+阈值+政治线gate)。验:任知县18→13·达标0.52/不达0/政治区0。
- **3 科举** `_kjApplyAllocations` 按名次注入(状元1100…举人90·标已迁移)。
- **4 八维挣取** `tickVirtueMerit` 改读真八维能臣度(去死字段 ch.abilities·#3 去廉洁耦合)·governance/relations 正政绩×SCALE+能力概率化(办砸走 FAILURE_DELTA)·高位递减·单回合封顶。验:能臣Δ20.5 vs 庸才Δ2.9。
- **5 玩家软门槛** `onAppointment` 骤擢(功名缺口)→penaltyForGap 档→皇威损+清议言官事件·大员(政治区)更重。验:功名50擢吏部尚书→皇威70→59+清议1。
- **6 AI举荐** AI 推演 npc-hearts 注 `gongming` 属性 + prompt 指令(擢人优先功名·骤擢招非议·三品以上尤重)。
- **7 自动升迁引擎** `runAutoPromotion`(endTurn 功名结算后)·自动区(正四品及下)按 calcPromotionChance×monthRatio 升·有降(功名跌破半档)·封顶 3×mr·出铨选纪事。政治区(从三品及上)不自动。验:黄立极功名4020→晋阶·**开局 frac 封顶 0.9 防通胀(开局0人立即升)**。

## 通用化
阈值/权重/封顶/科举/惩罚/失败表/derive/能臣度权重/高阶差遣补充表 全在 `tm-promotion.js` 引擎层，不硬编明朝；别的剧本朝代直接复用(officeTree 是 office→品级 权威源·剧本定义)，可剧本覆盖。

## 待办
- 真游戏跑多回合 live 验(功名随政绩涨→跨门槛→自动晋阶→纪事可见·骤擢惩罚 in-game fire)。
- 番邦/敌国/后宫显示(现未识·可选改"—/非本朝官")——owner 待拍 A/B。
- ship(双端热更)——owner 显式触发。
