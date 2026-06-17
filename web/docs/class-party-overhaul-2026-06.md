# 阶层/党派系统重构 · 2026-06-12

玩家三诉求：①两系统非常简陋 ②阶层议程经常雷同 ③满意度无缘无故跌到 0。

## 一、考古结论（五大病根）

| # | 病根 | 位置 | 机理 |
|---|------|------|------|
| ① | 标签误伤+权威倒置 | tm-class-engine.js:733-783 | `deriveTagsFromReason` 把**阶层自身的 demands/description** 也当匹配文本（自耕农描述含「赋役」→永远命中 corvee -10）；矩阵基线无方向感知（提到税=被加税）；AI 的 satisfaction_delta 被夹到基线的 30%（±2~3），正向修正结构性失效。佃农 tax 基线 -15、初值 10 → 碰一次归零 |
| ② | 校准器绝对值通道 | tm-party-class-llm-calibrator.js:599 | `update.satisfaction != null` → 直接 clamp(0,100) 硬设，无幅度闸。LLM 一次坏返回即写 0 |
| ③ | 多源叠扣无总预算 | class_changes(±20)+党派胜负耦合(无限幅 Σaffinity×delta)+校准器(±15/绝对值) | 同回合可叠 -30 以上；且全系统**无任何回归/恢复机制**（decay 只管党派指标） |
| ④ | 议程双病 | calibrator:469 / endturn-prompt:2486-2498 | 校准器英文模板 `demands:['short demand']` 让弱模型吐通用短语**整体覆盖** cls.demands；主推演 prompt **不注入任何阶层快照**（无名单/数值/诉求），AI 瞎猜 new_demands |
| ⑤ | 双源真相+读病 | class-engine:348-374 / 多处 | partyState 只在首播从 parties[] 种一次后各走各的（prompt 读 partyState·UI/AI 写 parties[]）；`parseTurnNumber(sat) ‖ 50` 把合法 0 读成 50 |

## 二、设计（五刀）

### 刀1 · 满意度治本（tm-class-engine.js + calibrator）
- **方向感知**：标签只从 `cc.reason + cc.new_demands`（事由文本）派生，不再读阶层静态文本；新增 `deriveDirection(text)`：蠲/赈/减赋/免役/缓征/昭雪… → +1（惠），加征/加派/摊派/苛敛/催科/强征… → -1（虐），不明 → 0。无标签命中不再兜底 'privilege'。
- **权威反转**：AI satisfaction_delta 为主信号（clamp ±12）；矩阵基线按方向取号（惠政对受害重的阶层惠更多=取反）；合成规则：AI 缺省→用基线(±10)；基线为 0→用 AI；同号→取强者（不叠加）；异号→**信 AI**（它读过叙事，矩阵只是关键词先验）。influence 同理（±8）。
- **总预算闸 `gateSatisfaction`**：所有事件源（class_changes/党派胜负耦合/校准器）统一过闸——每阶层每回合净变动封顶 `classSatTurnBudget`（默认 14，engineConstants 可调）；写 `cls._satLedger` 环账（12 条：{t,d,src,why}）。稳定器（刀2）走闸外（它是恢复通道，±1.2 自限）。
- **党派胜负耦合限幅**：applyPartyOutcomeToClasses 单次 outcome 的 classDelta clamp ±4，再过闸。
- **校准器关闸**：绝对值 satisfaction → 转 delta（目标-当前，clamp ±8）过闸；delta 路径也过闸。
- **读病修**：所有 `parseTurnNumber(sat) ‖ 50` → isFinite 判别（合法 0 不再读成 50）。

### 刀2 · 结构基线+稳定器（新模块 tm-social-foundation.js · TM.SocialFoundation）
满意度从「无主随机游走积分器」变「实况的派生量+事件扰动」：
- **结构输入**（全部 optional-guarded 读活引擎）：税负 taxFactor（TM.FieldPipes，按地块均值）、灾域占比（statusEffects kind=disaster + disasterPenalty）、战区占比（warZone）、欠饷（armies payArrearsMonths）、民心 trueIndex。
- **阶层暴露度**（从身份派生·跨朝代通用）：税暴露=economicIndicators.taxBurden/100（剧本有）或按 economicRole 兜底（生产 0.8/商 0.6/治理 0.2）；灾暴露（生产 1.0/其余 0.4）；战暴露（军 1.0/生产 0.6/其余 0.3）；饷暴露（军 1.0/其余 0）。
- **基线** = 55 − (taxFactor−1)×45×税暴露 − min(灾域×40,18)×灾暴露 − min(战区×50,20)×战暴露 − min(欠饷月×3,15)×饷暴露 + (民心−55)×0.15(生产/庶民) + 治理职 +6，clamp[5,95]。
- **缓变**：每回合 sat += clamp((基线−sat)×0.12, −1.2, +1.2)，近账记「结构回归」+主因文本。低谷有恢复路径，暴跌须有结构性理由——「无缘无故」变「有账可查」。

### 刀3 · 议程引擎（同模块）+ AI 面
- **议程=结构化条目** `cls._agenda.items[]`：{id,kind,text,urgency1-3,sinceTurn,source}。三类来源：
  - **seed**：剧本 demands 首次快照进 `cls._seedDemands`（按·拆分，本位诉求永不丢）；
  - **struct**：结构触发器确定性生成（税重→减赋；灾域→赈济；战区→止战守土；欠饷→清饷积欠；吏浊→惩贪肃吏），各阶层按暴露度命中不同条目→**议程必然不同**；条件持续 6+ 回合 urgency 升 3；**条件解除→条目自动得偿**（满意度 +2 过闸·近账「诉求得偿」）——闭环；
  - **ai**：AI new_demands/校准器 demands 只占一个补充槽位，**不再整体覆盖**。
- **显示串重建**：cls.demands = top3 按 urgency·近期排序 join '·'（既有 UI/快照零改动即生效）。
- **主 prompt 注入【阶层正册】**：逐阶层一行（名·满意+趋势·影响·态·诉求 top2），AI 不再瞎猜；class_changes 教学改写（delta 为主±12·事由须写明方向·无事勿动）。
- **校准器提示补丁**：禁绝对值 satisfaction；demands 须中文、须各阶层各异。

### 刀4 · 党派治理（同模块 + class-engine 播种）
- **单源对账 syncPartyTruth**：每回合 merge 双写者——engineDelta = partyState.influence − 上次同步值，并入 parties[].influence（canonical），回写 partyState=canonical；cohesion 同理。prompt/UI/AI 三面从此同数。
- **关系播种**：ensurePartyState 从剧本 party.allies/enemies 种 alliedWith/conflictWith（现在播空）。
- **议程保鲜**：party_changes 写 new_agenda 时 stamp `_agendaTurn`；8 回合无鲜议程且 PartyGoals 有活跃目标 → currentAgenda 由 top 目标派生。
- **近账**：复用 partyState.historyLog；AI party_changes 也入账。

### 刀5 · UI（phase8-formal-rightrail.js·纲纪页签）
- 阶层瘦卡：满意趋势箭头（本回合净Δ）+承压/回升徽（|基线−sat|>8）。
- 阶层详情：议程条目化（urgency 色徽+持续回合）、近账 4 条（何因±几）、结构基线行。
- 党派瘦卡/详情：势头箭头、盟/敌徽、近账、活跃目标。

## 三、验证（2026-06-12 全部完成）
- 新 smoke：smoke-class-satisfaction-guard **29/29**（方向/权威/总闸/绝对值关闸/读病/耦合限幅/校准器契约）、smoke-social-foundation **47/47**（结构输入/暴露度/基线/缓变/议程相异性+生命周期+AI 槽/党派对账/11 处接线契约）、已注册 verify-all。
- smoke-class-engine.js 契约**有意更新**（旧契约锁的就是病根行为：+99 被夹成 -3）·82 断言绿。
- 既有 class/party smoke 全量回归 **36/36 绿**（含原封未动的 llm-calibrator smoke）；endturn 22 个 smoke 仅 2 个已知基线假红（tm-endturn-ai.js 行数 4560/标记 L532·该文件未动·与红名单逐字一致）。
- syntax-check 661 文件全过；乱码守卫 0 替换符；中文 token 只增不减（新增皆为有意中文）。
- 游戏内实拍（_pw-scratch/g5-*.png + capture-g5-classparty.js）：天启剧本实跑 `SocialFoundation.tick` → 9 阶层**诉求 9/9 各异**（军户「清积欠·发饷银」由真实欠饷军队结构触发）、8 阶层结构回归入账、党派 7/7 双账相等、剧本盟敌（阉党↔东林党等）落 partyState；UI 实拍：列表卡趋势徽（士大夫「▲1.2·回升中」）、详情势位行+议程急缓徽+满意近账三笔、党派详情盟/敌徽+党势近账。
- 行尾：tm-class-engine.js 混合 CRLF/LF（手术后归一 LF）、endturn-apply/prompt、index.html 全 CRLF → node 手术（_pw-scratch/patch-class-engine-k1.js、patch-class-engine-k1b.js、patch-tax-regex.js、patch-prompt-apply-k34.js）；calibrator/rightrail/endturn-core/bridge 为 LF → Edit。
- 备份：.bak-classparty-20260612 ×9（phase8-formal-bridge.js 漏备·恢复点为 .bak-econstatus-20260612 + 改动仅 4 行 CSS 追加·另有 .bak-classparty-post 快照）。**未 ship**。
- Caveat：AI 面（class_changes 新教学/阶层正册/校准器新约束）是概率性的——prompt 已强化但须真实推演若干回合观察 AI 服从度。

## 四、backlog —— 已全部落地（2026-06-12 第二波·.bak-backlog-20260612）
- **地域分账（regionalVariants 活化）**：`tm-social-foundation.js` 新增 `localInputsFor`（顶级区划名双向包含→收叶子→局部税负/灾域/战区/民心·每回合缓存 `GM._socialLocalInputs`）+ `tickClassRegional`（变体满意度向**当地**局部基线缓变 ±1.5·地方灾只压当地分账）+ `applyRegionalDelta`（AI `class_changes.region` 指域事件只动当地变体·class-engine 转发）。UI 阶层详情「地域分账」块（最艰 4 地·势位·特记）；prompt 正册带「最艰:陕西12」。实跑验证：陕西自耕农 12（势位42·三年大旱）vs 江南 40。
- **党派关系 AI 通道**：`party_relation_changes`（{party,target,relation:ally|rival|neutral,reason}）四件套全registered（prompt 教学/schema/validator/apply），**对称生效**写双方 partyState 盟敌名册+historyLog 近账+addEB。党派 emerge/dissolve 通道原已存在（生灭基座不缺）。
- **编辑器面**：实查 editor-crud.js L1859/1867/1936——诉求（议程种子）、economicIndicators.taxBurden（税暴露度）、地域变体、分级不满**全部已可编**，按设计本义复用成立，无需加刀。

## 五、第二波修缮（同日·玩家回报）
- **军务驻军漏绑**（armyRegionIndex 四级链）：①剧本 `regionHint` 直绑（通用字段·朝代地名归剧本——京营×3/蓟州→北直隶·固原→陕西，已注入 .js 权威源+官方 JSON×2+运行时快照×2+bundle×2 共八处制品）②token 两遍匹配名册扩 **localityLayer 聚落层**（359 府级城名·宁远城/锦州城/皮岛/山海关全命中）③散驻分摊（/全国|各地|诸省|天下/ → 按本势力治下地块户口分摊·卡名缀「分驻」）④势力本部兜底（势力名↔地块名匹配或独块直绑——游牧汗帐/诸部寨落类全绑）。实跑：31 地块 75 活军卡，北直隶 9 支 25.7 万（京营三营+蓟州+宣府+卫所分驻 11.7 万+三卫），陕西 6 支（固原归列），辽东 7 支，外邦主力全绑。
- **财赋零地块**（玩家存档持久化零值病）：根因=旧版把 `compliance=0/actualRevenue=0` 死缺省写进了存档，而 regionBundle 零值跳过名单只护四收支账——**compliance 不在册**，live 0 盖掉静态 0.42，约 18 个走 compliance 评分路的境外/边镇地块整片归零。修=零值跳过名单扩 compliance/moneyOutput/grainOutput + taxViewScore comp>0 守卫 + 有征即非零地板（实征为正哨牌≥1）。**污染模拟验证**：210 个 provinceStats 全写零 → 零牌 0/43。
- **关键管线考古（坑·必记）**：运行时官方剧本从 `data/scenario-supplements/tianqi7-official-runtime-snapshot.js`（6.1MB 烤好快照·SNAP_QS 缓存）注册，**改 web/scenarios/tianqi7-1627.js 不会生效**！正规管线=export-official-scenario.js→官方 JSON→build-tianqi-runtime-snapshot.js；本轮因并发会话在场走外科补丁同步八制品+bump SNAP_QS=20260612-armyhint。
- 验证：smoke-social-foundation 扩到 67 断言（地域分账 10+军绑/通道契约 12）全绿；map-live-panels/map-view-scores/official-scenario/cache-recovery 绿；62 smoke 总回归仅 3 红=2 已知假红+1 并发会话进行中（smoke-phase8-party-class-debug-panel：他们正把 pcdebug 面板汉化，英文断言被打红，diff 实证非本轮改动）；tianqi-map-runtime 红经快照备份对照同因（基线假红）。实拍 g7-*.png。
