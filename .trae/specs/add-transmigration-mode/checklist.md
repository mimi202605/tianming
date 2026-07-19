# 穿越·扮演非皇帝角色 — 验收 Checklist

> 每条都需通过实查（跑命令 / 浏览器渲染 / grep 验证），不凭印象打勾。
> 命令须在 `/workspace` 下执行；smoke 文件位于 `web/scripts/`。

## 主界面与开局流程

- [ ] `web/index.html` 的 `#launch` 区新增「穿越」按钮，与「开卷/续卷/著卷/典章」并列
- [ ] 按钮文案朝代中立（grep 检查未出现"朕/御极/临朝/敕定天命"等皇帝专属词）
- [ ] 点击「穿越」进入剧本选择（复用 `showScnSelect`），选定剧本后进入角色选择面板
- [ ] 角色选择面板按 `playerRole` 分组展示（重臣/将领/诸侯/摄政/宗室/外戚/后宫/商贾/隐逸等）
- [ ] 每个角色条目展示：姓名、字/号、官职、品级、势力、家族层级、性格摘要
- [ ] 皇帝角色（`_offIsSovereign(c) === true`）不在可选列表中，或被禁用并标注"君主不可选"
- [ ] 提供"档案详情"展开入口，显示完整 SCHEMA 字段
- [ ] 提供"返回"按钮回到主界面

## 玩家身份系统

- [ ] `P.playerInfo` 新增字段：`transmigrationMode` / `sovereignName` / `sovereignTitle` / `selectedCharId`
- [ ] 默认值正确（`transmigrationMode:false` 等），向后兼容老存档
- [ ] 选定角色后 `c.isPlayer=true`，其他角色 `isPlayer=false`
- [ ] `P.playerInfo.playerRole` 根据 `derivePlayerRole(ch)` 正确推导
- [ ] `P.playerInfo.sovereignName` 写入剧本皇帝名（与 `characterName` 解耦）
- [ ] 启动校验：穿越模式下 `_offIsSovereign(playerChar) === false`，否则拒绝
- [ ] 存档读档往返不丢字段（跑 `smoke-scenario-editor-reset-roundtrip.js`）

## 皇帝 AI 自动决策

- [ ] 新增 `web/tm-sovereign-ai.js`，`TM.SovereignAI.runTurn(root, ctx)` 可调用
- [ ] 皇帝 AI 每回合生成 0-3 道诏令，类型限定 `EDICT_TYPES`
- [ ] 诏令落账 `GM._edictTracker`，标记 `source:'sovereign-ai'`
- [ ] 诏令经 `estimateResistance` + `applyEdictTypedIncidence` 走完整阻力与执行流程
- [ ] 皇帝 AI 可触发朝议议题并主动发言（非玩家插言）
- [ ] 皇帝发言经 LLM 生成，符合其性格与时代质感
- [ ] 皇帝 AI 批答奏疏（准/驳/留中/下议/交部 五选一 + 批语）
- [ ] 批答影响 NPC 忠诚度
- [ ] 玩家上奏的批答以"奉旨"卡片反馈到玩家御案
- [ ] 皇帝 AI 可任免（经 `_offAppointPerson` / `_offDismissPerson`）
- [ ] 变更经 `tm-ai-change-applier.js` 路径白名单校验
- [ ] 玩家本人可能被任免（升迁/贬谪/罢黜），收到通知
- [ ] 跑 `smoke-sovereign-ai-edict.js` / `smoke-sovereign-ai-chaoyi.js` / `smoke-sovereign-ai-memorial.js` / `smoke-sovereign-ai-office.js` 全过

## 玩家角色动作集（按 playerRole 分支）

- [ ] 诏令面板（`tm-game-ui-shell.js`）按 playerRole 分支渲染
  - [ ] emperor 模式保留"天子御笔 · 奉天承运皇帝诏曰" + 5 类诏书 textarea
  - [ ] 穿越模式替换为"上奏 · 臣{characterName}谨奏" + 1-3 篇奏疏 textarea
  - [ ] minister 显示"廷推/荐举"按钮
  - [ ] general 显示"请旨出征"按钮
  - [ ] prince 显示"朝贡/上表/举兵"按钮
  - [ ] regent 显示"代诏"按钮
  - [ ] 后宫显示"枕边风"按钮
- [ ] 朝议面板（`tm-chaoyi.js`）按 playerRole 分支
  - [ ] emperor 模式保留插言入口
  - [ ] 穿越模式禁用主动开朝议，提示"朝议由君主发起"
  - [ ] 穿越模式玩家可"请旨发言"
  - [ ] 穿越模式玩家旁听时显示气泡但不能插言
- [ ] 官制权限（`tm-office-system.js canPerformAction`）按 playerRole 分支
  - [ ] emperor: 全权
  - [ ] regent: 三品以下任免 + 代诏
  - [ ] minister: 仅本职下属 + 廷推
  - [ ] general: 仅本部军官
  - [ ] prince: 仅封国官属
  - [ ] 后宫/商贾/隐逸: 无任免权
- [ ] 摄政权臣特殊路径
  - [ ] 代诏诏令标记 `source:'regent-proxy'`
  - [ ] 代诏合法性损耗影响皇威或派生指标
  - [ ] 君主成年触发还政提示
  - [ ] 拒还触发"权臣架空"危机
- [ ] 跑 `smoke-transmigration-edict-panel.js` / `smoke-transmigration-chaoyi.js` / `smoke-transmigration-office-permission.js` / `smoke-transmigration-regent.js` 全过

## UI 文案与身份展示动态化

- [ ] 顶栏身份展示按 playerRole 分支
  - [ ] emperor 模式显示"年号 · 尊号"
  - [ ] 穿越模式显示"玩家官职 · 当前皇帝年号"
- [ ] 朝议气泡中 `'皇帝'` 字面量替换为 `P.playerInfo.sovereignName || '皇帝'`
  - [ ] `tm-chaoyi.js` line 35/141/186/189
  - [ ] `tm-chaoyi-yuqian.js` line 215/493/658
  - [ ] `tm-tinyi-v3.js` line 219/2629
  - [ ] `tm-tinyi-v3-edict-personnel.js` line 152/449
- [ ] `tm-endturn-prompt.js` line 568 `'本回合皇帝亲颁诏令原文'` 动态化
- [ ] `tm-edict-oversight.js` line 89 `'代陛下核查诏令'` 动态化
- [ ] grep 检查：穿越模式用户可见处无残留硬编码 `'皇帝'` 字面量（schema 数据中的 `'皇帝'` 保留不动）
- [ ] 退位/禅让系统（`tm-player-core.js openAbdication`）穿越模式下隐藏入口
- [ ] 角色定位匹配的身份变更路径：minister→辞职/告老，prince→袭爵/夺嫡，general→卸甲/起复等
- [ ] 跑 `smoke-transmigration-role-change.js` 全过

## 玩家人物互动系统

- [ ] 新增 `web/tm-player-interaction.js`，`TM.PlayerInteraction.interact(npcName, kind, payload)` 可调用
- [ ] 互动消耗精力（`_spendEnergy`）+ 推进时间
- [ ] LLM 生成互动场景描述（基于双方性格 + 关系 + 当前局势）
- [ ] NPC 对玩家的 5 维关系值更新（师徒/亲友/政敌/同僚/仇敌）
- [ ] 关键互动写入玩家记忆系统
- [ ] 联姻动作：双方 `family` 字段建立姻亲关系
- [ ] 事件钩子：与禁军将领关系达"死党"+ 选择"密谋" → 提示可发动政变
- [ ] 御案新增"人物互动"面板
- [ ] 跑 `smoke-player-interaction.js` 全过

## 玩家赚钱与私产系统

- [ ] 新增 `web/tm-player-economy.js`，玩家个人银钱账本（cash/properties/investments/grayIncome）
- [ ] 每月初自动领取官俸（复用 `tm-char-economy-engine.js`）
- [ ] "贪墨/受贿"动作：银钱+，corruption 累计，触发吏治腐败风险
- [ ] "购置产业"：酒楼/当铺/作坊三类，月经营性收入
- [ ] "放贷收息"超阈值触发民怨
- [ ] "囤货居奇"触发市舶司调查风险
- [ ] "被抄家"路径：罢黜/反叛失败/贪腐被查 → 私产充公
- [ ] "派系勒索"：派系索要保护费
- [ ] 御案新增"私产"面板
- [ ] 跑 `smoke-player-economy.js` 全过

## 玩家跑商系统

- [ ] 新增 `web/tm-player-trade.js`，商队数据结构完整（route/goods/guards/carts/permit/status）
- [ ] "组建商队"消耗银钱 + 配置护卫/车马/通关文牒
- [ ] 通关文牒许可难度关联官场关系
- [ ] "派遣贸易"根据 `tm-economy-engine.js` 区域价格矩阵计算预期利润
- [ ] 路线风险事件：山贼劫掠/官府盘剥/气候灾害/势力索要过路费
- [ ] 商队到达后结算实际盈亏，写入玩家银钱账本
- [ ] 大宗贸易（超阈值）调用 `tm-region-magnate.js` 影响区域经济
- [ ] 跨朝代通用：剧本数据 hook 路线，引擎不预置朝代特定路线
- [ ] 跑商积累商誉，开启新商业网络与 NPC 关系
- [ ] 御案新增"商队"面板
- [ ] 跑 `smoke-player-trade.js` 全过

## 玩家科技研发系统（固定科技路线）

- [ ] 新增 `web/tm-player-tech.js`，玩家科技账本（currentResearch/completed/discoveries）
- [ ] **预设固定科技路线数据**（写入 `tm-engine-constants.js` 或新 `tm-tech-routes-data.js`）
  - [ ] 农业线：`农具改良 → 良种选育 → 水利灌溉 → 耕作制度 → 多熟种植`
  - [ ] 军事线：`冶铁锻造 → 弩机改良 → 甲胄升级 → 攻城器械 → 火药初探`
  - [ ] 工艺线：`纺织改进 → 陶瓷烧制 → 造纸印刷 → 冶铸高炉 → 雕版活字`
  - [ ] 医药线：`本草整理 → 方剂编纂 → 针灸推拿 → 疫病防治 → 法医检验`
  - [ ] 水利线：`沟渠疏浚 → 陂塘修筑 → 堰坝工程 → 运河开凿 → 海塘修筑`
- [ ] "启动研发"扣银钱，按 `学识 + 投入 + 基础 + 时代限制` 计算进度
- [ ] "前置科技解锁"：完成 N 级才能研发 N+1 级，未完成时禁用按钮并提示"需先研发 X"
- [ ] 剧本数据可覆盖/扩展路线（merge 默认 + 剧本）
- [ ] "招揽匠人加速"关联人物互动，进度加成
- [ ] "研发完成"解锁对应增益（农业增产/军事强军/工艺增收/医药减疫）
- [ ] "上奏推广"上奏到皇帝 AI，采纳后全国获得增益
- [ ] "私藏自用"增益仅作用于玩家本人/封国
- [ ] 跨朝代铁律：固定科技路线取中国古代通用脉络，剧本可加朝代专属支线（明清火器/宋代活字）
- [ ] 御案新增"科技"面板，可视化科技树（已解锁/进行中/锁定）
- [ ] 跑 `smoke-player-tech.js` 全过，断言前置科技锁正确

## 玩家家族与子女系统

- [ ] 新增 `web/tm-player-family.js`
- [ ] 玩家家族结构完整（父母/兄弟/姐妹/配偶/子女/宗族，复用 `tm-char-full-schema.js` 字段）
- [ ] "结婚"通过人物互动联姻，配偶带入嫁妆/陪嫁/家族关系
- [ ] "生育子女"按时间周期生成子女角色
- [ ] "子女成长"：婴幼儿→少年→成年，每阶段触发事件（满月/启蒙/冠礼/及笄）
- [ ] "子女教育"延师/亲自教导/送书院，更新子女能力字段
- [ ] "子女联姻"成年子女与 NPC 家族联姻
- [ ] "子女出仕"科举/荫袭/征辟三条路径
- [ ] "子女继承"玩家死亡/罢黜时继承家产/官职/名望，可切换至子女继续游戏
- [ ] "子嗣危机"无子触发"绝嗣"，子嗣过多触发"夺嫡"
- [ ] "子女叛逃"关系恶化到"仇敌"级时子女可能叛逃
- [ ] 御案新增"家族"面板，展示家族树与子女状态
- [ ] 跑 `smoke-player-family.js` 全过

## 玩家私军系统

- [ ] 新增 `web/tm-player-private-army.js`
- [ ] 私军数据结构完整（units: id/type/count/training/equipment/morale）
- [ ] 私军类型：家丁/门客剑士/部曲/死士
- [ ] "招募私军"从流民/镖师/江湖人/退役军士招募，关联人物互动可招揽名将
- [ ] "私军维护"每月消耗银钱/粮草，规模超限触发财政压力
- [ ] "训练私军"消耗时间/银钱，训练度提升（沿用 `tm-army-units.js`）
- [ ] "装备私军"购置兵器/甲胄/战马（关联私产系统）
- [ ] 使用场景：护卫商队（降低山贼风险）/ 自卫 / 政变（反叛主力）/ 私斗
- [ ] "僭越风险"规模超阈值触发朝廷调查/言官弹劾/问罪
- [ ] 沿用 `tm-military.js` / `tm-army-units.js` 战斗单位模型，标记 `kind:'private'` 独立账本
- [ ] 御案新增"私军"面板
- [ ] 跑 `smoke-player-private-army.js` 全过

## 玩家自由移动系统

- [ ] 新增 `web/tm-player-movement.js`
- [ ] 玩家移动状态完整（currentLocation/travelStatus/discoveredLocations）
- [ ] "发起移动"复用 `tm-military.js` 行军路径算法计算距离/耗时
- [ ] 移动方式：步行/骑马/车驾/舟船/驿站（不同速度/成本）
- [ ] 驿站方式需官场关系（关联人物互动）
- [ ] "移动事件"路上随机触发盗匪/天气/偶遇 NPC/发现古迹（LLM 生成）
- [ ] "地点决定动作集"分支：京城/地方/封国/边疆/名胜/敌国化外
- [ ] "携带随从"家属/私军/商队一起移动，成本按规模加成
- [ ] 玩家 `location` 字段更新
- [ ] 御案新增"移动"面板，显示地图与可去地点
- [ ] 跑 `smoke-player-movement.js` 全过

## 玩家产业建设系统

- [ ] 新增 `web/tm-player-industry.js`
- [ ] 产业数据结构完整（industries: id/type/location/size/status/output/workers/equipment/level）
- [ ] 产业类型：庄园/农场/牧场/矿场/林场/渔场/工坊/商号
- [ ] "选址建设"校验选址限制（矿场只能在矿山附近等），购地 + 当地官府许可
- [ ] "施工建设"募工 + 施工时间，完成后投产
- [ ] "产业经营"每月产出货物/银钱，受管理/民夫/治安/灾害影响
- [ ] "产业升级"扩建/改良/特化
- [ ] "产业风险"火灾/水灾/盗匪/民夫逃亡/官府强征/敌军劫掠
- [ ] "豪强标签"大产业触发朝廷强征/抄没
- [ ] 沿用 `tm-building-works.js` 建筑系统底层
- [ ] 御案新增"产业"面板
- [ ] 跑 `smoke-player-industry.js` 全过

## 玩家开垦荒地系统

- [ ] 新增 `web/tm-player-reclaim.js`
- [ ] 开垦状态完整（projects: id/region/size/progress/workers/status/expectedOutput）
- [ ] "勘探荒地"校验可开垦规模（小块/中块/大块）与成本预估
- [ ] "官府许可前置"需当地官府许可（关联人物互动 + 官制权限）
- [ ] "违规开垦"触发"占田"风险（言官弹劾/强令退还）
- [ ] "开垦施工"平整土地 → 修水利 → 播种 → 收获
- [ ] 不同规模消耗不同时间（小块 1 月/中块 3 月/大块 6-12 月）
- [ ] "开垦产出"新耕地按比例增加当地粮食产量，玩家享分成
- [ ] "开垦副作用"侵占牧场/林地/猎场触发当地势力不满；大规模开垦触发生态事件
- [ ] "与朝廷互动"开垦有成可上奏请功；失败触发问责
- [ ] 跨朝代通用：屯田/占田/均田等政策由剧本 hook
- [ ] 御案新增"开垦"面板
- [ ] 跑 `smoke-player-reclaim.js` 全过

## 玩家参加科举考试

- [ ] 新增 `web/tm-player-keju.js`，玩家考生状态完整
- [ ] "报名应试"对商贾/隐逸/宗室旁支/低级官吏子弟开放
- [ ] 接入 `tm-keju-runtime.js` 全流程
- [ ] "作答考题"通过 `tm-keju-question-ui.js`，LLM 评卷
- [ ] "拜师求学"关联人物互动 + `tm-keju-school-network.js`
- [ ] "考中进士"身份变更 + playerRole 升级为 minister + 自动授予官职
- [ ] "卷入科场弊案"沿用 `tm-keju-scandal.js`，风险与收益并存
- [ ] 御案新增"科举"面板（穿越模式与皇帝模式区分）
- [ ] 跑 `smoke-player-keju.js` 全过

## 玩家官员年终考核

- [ ] 新增 `web/tm-player-annual-review.js`
- [ ] 考核指标完整：履职/政务/廉洁/人际/上级评价/民众口碑
- [ ] 年末触发考核，综合玩家 1 年行为生成指标
- [ ] LLM 生成考核评语
- [ ] 结果分九等（上上至下下）
- [ ] 按等级触发后果：升迁/贬谪/加俸/罚俸/赐物/记过/罢黜
- [ ] "主动运作考核"：贿赂考官/托人情（关联人物互动），有被发现风险
- [ ] 考核结果写入编年史
- [ ] 玩家御案显示考核通知
- [ ] 跑 `smoke-player-annual-review.js` 全过

## 玩家反叛系统

- [ ] 新增 `web/tm-player-rebellion.js`
- [ ] 反叛筹备状态完整（军权/粮草/势力联络/舆论）
- [ ] "密谋反叛"对 prince/regent/general/minister/merchant 开放
- [ ] 筹备动作：笼络军权（关联人物互动）/积累粮草（关联私产）/联络势力/制造舆论
- [ ] 筹备进度可视化
- [ ] "举事"按 playerRole 分支反叛类型（宗室夺嫡/藩王起兵/权臣篡位/边将叛乱/农民起义）
- [ ] 触发交战（沿用 `tm-battle-*.js`）
- [ ] 皇帝 AI 发动平叛
- [ ] 反叛失败：被诛/逃亡/家属流放/私产抄没/编年史污点
- [ ] 反叛成功：playerRole 转 emperor，transmigrationMode 转 false，模式切回皇帝模式
- [ ] 编年史写入"新朝建立"事件
- [ ] 沿用 `tm-feudal.js` 篡位 + `tm-class-radical-revolt.js` 农民起义机制
- [ ] 跑 `smoke-player-rebellion.js` 全过

## 回合流程编排

- [ ] `tm-endturn-pipeline-steps.js` 新增 `_endturnStep_sovereignAI(root, ctx)` 步骤
- [ ] 步骤位置在玩家上奏收集之后、派系 NPC 决策之前
- [ ] `tm-endturn-prep.js _endTurn_collectInput` 按 playerRole 分支收集
- [ ] `confirmEndTurn` 文案按 playerRole 切换：emperor→"诏令颁行"，穿越→"上奏呈递"
- [ ] 起居注条目标注来源（'player' / 'sovereign-ai' / 'npc'）
- [ ] 不同来源用不同图标/颜色标识
- [ ] 编年史月稿区分"君主自动决策"与"玩家行动"两段
- [ ] 跑 `smoke-transmigration-endturn.js` / `smoke-transmigration-chronicle.js` 全过

## 集成与回归

- [ ] 跑 `smoke-transmigration-e2e.js` 全过（端到端穿越模式，含 7 大玩家系统核心动作）
- [ ] 跑 `verify-all.js` 全套绿（皇帝模式无回归）
- [ ] 跑 `lint-arch-all.js` 8/8 绿
- [ ] 新增 GM/P 直写已登记 owners 或走 mutator/ledger
- [ ] 9 个新文件加入 `arch-baselines/*.json`：
  - [ ] `tm-transmigration.js`
  - [ ] `tm-sovereign-ai.js`
  - [ ] `tm-player-interaction.js`
  - [ ] `tm-player-economy.js`
  - [ ] `tm-player-trade.js`
  - [ ] `tm-player-tech.js`
  - [ ] `tm-player-keju.js`
  - [ ] `tm-player-annual-review.js`
  - [ ] `tm-player-rebellion.js`
- [ ] `web/INDEX.md` 注册 9 个新文件
- [ ] `web/ARCHITECTURE.md` 增补「穿越模式架构」一节，含 7 大玩家系统数据流图

## 跨朝代铁律审计

- [ ] grep 引擎层（`tm-*.js`）无新增明清专名（内阁/票拟/司礼监/东厂/八股等）
- [ ] 角色官衔属剧本数据，可保留专名
- [ ] UI 固定文案朝代中立
- [ ] 跑商路线 hook 归剧本数据，引擎不预置朝代特定路线
- [ ] 科技列表归剧本数据，引擎不预置朝代特定科技

## 命门护栏

- [ ] 皇帝 AI 行为硬核自洽，复用 LLM 决策管线护栏（schema 验证 / 变更白名单 / 阻力模型）
- [ ] 玩家角色行为产生与皇帝模式同等强度的 AI 回应（NPC 反应 / 势力变化 / 编年史）
- [ ] 不出现"AI 敷衍 / 前后矛盾 / 穿越出戏"的塌方表现
- [ ] 7 大玩家系统彼此关联顺畅（人物互动→反叛筹备、私产→跑商→科技研发投入、科举→年终考核等）
- [ ] 反叛成功转皇帝模式后，原皇帝模式所有功能（诏令/朝议/官制等）正常运作
