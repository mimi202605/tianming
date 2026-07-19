# Tasks

> 状态标记：`[ ]` 待办 · `[~]` 进行中 · `[x]` 完成
> 依赖关系见末尾「Task Dependencies」。每刀收尾跑 `node scripts/lint-arch-all.js` + 主题 smoke。

## Phase 1 · 基础设施与开局流程（前置必做）

- [ ] Task 1: 新增穿越模式核心模块 `web/tm-transmigration.js`
  - [ ] SubTask 1.1: 定义 `TM.Transmigration` 命名空间，挂载到 `window.TM`
  - [ ] SubTask 1.2: 实现 `TM.Transmigration.isTransmigrationMode()` —— 读取 `P.playerInfo.transmigrationMode`
  - [ ] SubTask 1.3: 实现 `TM.Transmigration.derivePlayerRole(ch)` —— 根据角色 `role`/`officialTitle`/`royalRelation`/`familyTier` 推导 `playerRole`
  - [ ] SubTask 1.4: 实现 `TM.Transmigration.getSovereignName(root)` —— 在 `GM.chars` 中找出 `_offIsSovereign` 角色并返回姓名
  - [ ] SubTask 1.5: 注册到 `index.html` 的 `<script>` 顺序链（在 `tm-launch.js` 之前）
  - 验证：浏览器控制台 `TM.Transmigration.isTransmigrationMode()` 可调用

- [ ] Task 2: 扩展 `P.playerInfo` 数据结构
  - [ ] SubTask 2.1: 在 `editor-core.js:26-39` 给 `P.playerInfo` 增加字段：`transmigrationMode`(boolean) / `sovereignName`(string) / `sovereignTitle`(string) / `selectedCharId`(string)
  - [ ] SubTask 2.2: 默认值：`transmigrationMode:false` / `sovereignName:''` / 其他空字符串
  - [ ] SubTask 2.3: 在 `tm-save-lifecycle.js` 的存档 schema 增加这四个字段（向后兼容，缺失补默认）
  - 验证：跑 `node web/scripts/smoke-scenario-editor-reset-roundtrip.js` 确保存档读档不丢字段

## Phase 2 · 主界面入口与角色选择

- [ ] Task 3: 主界面新增「穿越」按钮
  - [ ] SubTask 3.1: 在 `web/index.html` 的 `#launch` 区（line 86-160 范围）「开卷」按钮旁加「穿越」按钮，文案"穿越 / 择一臣子，化身其身，俯瞰朝局"
  - [ ] SubTask 3.2: 按钮文案朝代中立（不出现"朕/御极/临朝"等）
  - [ ] SubTask 3.3: 绑定点击事件 `doTransmigration()` → 调用 `TM.Transmigration.startFlow()`
  - 验证：浏览器打开 `index.html`，主界面看到「穿越」按钮且点击不报错

- [ ] Task 4: 实现角色选择面板
  - [ ] SubTask 4.1: 在 `tm-transmigration.js` 实现 `TM.Transmigration.showCharacterSelect(scnId)` —— 加载剧本后过滤非皇帝角色
  - [ ] SubTask 4.2: 角色过滤逻辑：`!_offIsSovereign(c)` 且 `c.alive !== false`，按 `derivePlayerRole(c)` 分组
  - [ ] SubTask 4.3: 渲染角色条目：姓名、字/号、官职、品级、势力、家族层级、性格摘要（取自 `tm-char-full-schema.js` SCHEMA）
  - [ ] SubTask 4.4: 皇帝角色不出现在列表中（或显式禁用并标注"君主不可选"）
  - [ ] SubTask 4.5: "档案详情"展开按钮：显示完整 SCHEMA 关键字段（年龄/籍贯/性格五常/关系网摘要）
  - [ ] SubTask 4.6: "选定"按钮 → 调用 `TM.Transmigration.confirmCharacter(charId)`
  - [ ] SubTask 4.7: "返回"按钮 → 回到主界面
  - 验证：用 `scenarios/天启七年·九月（官方）.json` 测试，列出崇祯帝之外的所有主要角色

- [ ] Task 5: 角色选定后进入游戏
  - [ ] SubTask 5.1: 在 `tm-transmigration.js` 实现 `confirmCharacter(charId)` —— 设置 `c.isPlayer=true`（清除其他角色的 `isPlayer`），调用 `derivePlayerRole` 写入 `P.playerInfo.playerRole`
  - [ ] SubTask 5.2: 设置 `P.playerInfo.transmigrationMode = true`
  - [ ] SubTask 5.3: 调用 `getSovereignName(root)` 写入 `P.playerInfo.sovereignName` 与 `sovereignTitle`
  - [ ] SubTask 5.4: 校验：`_offIsSovereign(playerChar) === false`，否则报错并阻止
  - [ ] SubTask 5.5: 调用 `enterGame()`（复用 `tm-launch.js:6943`）
  - 验证：进入游戏后控制台检查 `P.playerInfo.transmigrationMode === true` 且玩家角色非皇帝

## Phase 3 · 皇帝 AI 自动决策引擎

- [ ] Task 6: 新增皇帝 AI 决策模块 `web/tm-sovereign-ai.js`
  - [ ] SubTask 6.1: 定义 `TM.SovereignAI` 命名空间，挂载到 `window.TM`
  - [ ] SubTask 6.2: 实现 `TM.SovereignAI.runTurn(root, turnCtx)` —— 主入口，编排下旨/朝议/批奏/任免四个子动作
  - [ ] SubTask 6.3: 复用 `tm-faction-npc-llm-decision.js` 的 LLM 调用基建（多 provider / token 预算 / 重试 / schema 验证）
  - [ ] SubTask 6.4: 编写皇帝 AI 专属 prompt 模板（高于派系 NPC，包含完整国库/民心/边警/吏治/派系矩阵 + 玩家上奏）
  - [ ] SubTask 6.5: 定义皇帝 AI 输出 schema：`{ rationale, edicts[], chaoyiSpeeches[], memorialDecisions[], officeActions[] }`
  - [ ] SubTask 6.6: 注册到 `index.html` `<script>` 顺序链
  - 验证：浏览器控制台 `TM.SovereignAI.runTurn` 可调用，且空状态返回合理空对象

- [ ] Task 7: 皇帝 AI 下旨路径
  - [ ] SubTask 7.1: 在 `TM.SovereignAI.runTurn` 中根据世界状态生成 0-3 道诏令文本
  - [ ] SubTask 7.2: 诏令文本经 `classifyEdict` 分类，落账到 `GM._edictTracker`，标记 `source:'sovereign-ai'`
  - [ ] SubTask 7.3: 经 `estimateResistance` + `applyEdictTypedIncidence` 走完整阻力与执行流程
  - [ ] SubTask 7.4: 诏令渲染到御案（带"AI 颁旨"标识，区别于玩家下旨）
  - 验证：跑 `node web/scripts/smoke-sovereign-ai-edict.js`（新增 smoke），断言诏令落账与阻力计算

- [ ] Task 8: 皇帝 AI 朝议发言
  - [ ] SubTask 8.1: 在 `tm-chaoyi.js` 抽出 `addCYBubble(speaker, text, opts)` 函数（如已存在则复用）
  - [ ] SubTask 8.2: 在 `TM.SovereignAI.runTurn` 中根据需要触发朝议议题
  - [ ] SubTask 8.3: 皇帝发言经 LLM 生成，符合其性格 + 时代质感（沿用 `tm-wendui-persona-views.js` persona）
  - [ ] SubTask 8.4: 朝议气泡中的"皇帝"字面量替换为 `P.playerInfo.sovereignName`
  - 验证：跑 `node web/scripts/smoke-sovereign-ai-chaoyi.js`（新增 smoke）

- [ ] Task 9: 皇帝 AI 批奏
  - [ ] SubTask 9.1: 在 `tm-memorials.js` 新增 `_sovereignAIReplyMemorial(memorial)` 函数
  - [ ] SubTask 9.2: 调用 LLM 生成批答（准/驳/留中/下议/交部 五选一 + 批语）
  - [ ] SubTask 9.3: 批答影响 NPC 忠诚度（取自 `tm-relations.js` 的 loyaltyDelta）
  - [ ] SubTask 9.4: 玩家上奏的批答以"奉旨"卡片形式反馈到玩家御案
  - 验证：跑 `node web/scripts/smoke-sovereign-ai-memorial.js`（新增 smoke）

- [ ] Task 10: 皇帝 AI 任免
  - [ ] SubTask 10.1: 在 `TM.SovereignAI.runTurn` 中根据廷推/罪臣/功臣判断任免需求
  - [ ] SubTask 10.2: 经 `_offAppointPerson` / `_offDismissPerson` 走标准任职树变更
  - [ ] SubTask 10.3: 经 `tm-ai-change-applier.js` 路径白名单校验
  - [ ] SubTask 10.4: 玩家本人可能被任免（升迁/贬谪/罢黜），向玩家推送通知
  - 验证：跑 `node web/scripts/smoke-sovereign-ai-office.js`（新增 smoke）

## Phase 4 · 玩家角色动作集（按 playerRole 分支）

- [ ] Task 11: 诏令面板按 playerRole 分支渲染
  - [ ] SubTask 11.1: 在 `tm-game-ui-shell.js:139` 把 `var _edictRole='天子';` 改为读 `P.playerInfo.playerRole` 分支
  - [ ] SubTask 11.2: 皇帝模式：保留"天子御笔 · 奉天承运皇帝诏曰" + 5 类诏书 textarea
  - [ ] SubTask 11.3: 穿越模式：替换为"上奏 · 臣{characterName}谨奏" + 1-3 篇奏疏 textarea
  - [ ] SubTask 11.4: 按角色定位增减动作按钮：minister→廷推/荐举，general→请旨出征，prince→朝贡/上表，regent→代诏，后宫→枕边风
  - [ ] SubTask 11.5: `_endTurn_collectInput`（tm-endturn-prep.js:341）按 playerRole 分支收集玩家上奏 vs 诏令
  - 验证：跑 `node web/scripts/smoke-transmigration-edict-panel.js`（新增 smoke）

- [ ] Task 12: 朝议面板按 playerRole 分支
  - [ ] SubTask 12.1: 在 `tm-chaoyi.js:20 openChaoyi` 入口判定 playerRole
  - [ ] SubTask 12.2: 皇帝模式：保留现有"插言"路径（line 35 的 placeholder 文案保留）
  - [ ] SubTask 12.3: 穿越模式：玩家不能主动开朝议（按钮禁用并提示"朝议由君主发起"）
  - [ ] SubTask 12.4: 穿越模式下玩家在朝议中"请旨发言"——按钮申请，皇帝 AI 决定准否
  - [ ] SubTask 12.5: 朝议气泡中所有 `'皇帝'` 字面量替换为 `P.playerInfo.sovereignName || '皇帝'`
  - 验证：跑 `node web/scripts/smoke-transmigration-chaoyi.js`（新增 smoke），断言皇帝名字动态化

- [ ] Task 13: 官制权限按 playerRole 分支
  - [ ] SubTask 13.1: 在 `tm-office-system.js:930-963 canPerformAction` 增加 `playerRole` 参数
  - [ ] SubTask 13.2: 按 spec「官制权限判定」分支：emperor 全权，regent 三品以下+代诏，minister 本职下属+廷推，general 本部军官，prince 封国官属，其他无任免权
  - [ ] SubTask 13.3: 调用方（`tm-office-panel.js` 等）传入 `P.playerInfo.playerRole`，UI 按权限显隐按钮
  - [ ] SubTask 13.4: 不删除现有 `_offIsSovereign` 中的剧本特定正则（向后兼容）
  - 验证：跑 `node web/scripts/smoke-transmigration-office-permission.js`（新增 smoke）

- [ ] Task 14: 摄政权臣特殊路径
  - [ ] SubTask 14.1: 在 `tm-transmigration.js` 实现 `TM.Transmigration.runRegentAction(action, payload)` —— 玩家代行皇权入口
  - [ ] SubTask 14.2: 代诏诏令标记 `source:'regent-proxy'`，落账到 `_edictTracker`
  - [ ] SubTask 14.3: 代诏合法性损耗：影响 `皇威` 或派生合法性指标（沿用 `tm-authority-deep.js`）
  - [ ] SubTask 14.4: 复用 `TM.InfluenceGroups.buildRegentSignal`（tm-influence-groups.js:228）触发还政/拒还事件
  - [ ] SubTask 14.5: 拒还触发"权臣架空"危机（沿用 `tm-influence-groups.js` 危机管线）
  - 验证：跑 `node web/scripts/smoke-transmigration-regent.js`（新增 smoke）

## Phase 4.5 · 玩家专属系统（穿越模式核心爽点）

> 这 7 个系统是穿越模式相比皇帝模式的差异化玩法，让玩家在自己职位上"有事可做、有成长感、有戏剧性"。系统间存在关联（如人物互动→反叛筹备→交战），按依赖顺序实现。

- [ ] Task 15: 玩家人物互动系统 `web/tm-player-interaction.js`
  - [ ] SubTask 15.1: 定义 `TM.PlayerInteraction` 命名空间
  - [ ] SubTask 15.2: 实现 `interact(npcName, kind, payload)` —— kind ∈ {visit, secretTalk, entrust, befriend, gift, marry, antagonize, frame, recruit, disciple}
  - [ ] SubTask 15.3: 每次互动消耗精力（复用 `_spendEnergy`）+ 推进时间
  - [ ] SubTask 15.4: 调用 LLM 生成互动场景描述（基于双方性格 + 关系 + 当前局势）
  - [ ] SubTask 15.5: 更新 NPC 对玩家的 5 维关系值（师徒/亲友/政敌/同僚/仇敌，沿用 `tm-relations.js`）
  - [ ] SubTask 15.6: 关键互动写入玩家记忆系统（沿用 `tm-memory-*.js`）
  - [ ] SubTask 15.7: 实现"联姻"——双方 `family` 字段建立姻亲关系
  - [ ] SubTask 15.8: 事件钩子：与禁军将领关系达"死党"+ 选择"密谋" → 提示可发动政变
  - [ ] SubTask 15.9: 御案新增"人物互动"面板，列出可互动 NPC 与动作菜单
  - 验证：跑 `node web/scripts/smoke-player-interaction.js`（新增 smoke）

- [ ] Task 16: 玩家赚钱与私产系统 `web/tm-player-economy.js`
  - [ ] SubTask 16.1: 定义 `TM.PlayerEconomy` 命名空间
  - [ ] SubTask 16.2: 玩家个人银钱账本（独立于国库），字段：cash, properties[], investments[], grayIncome[]
  - [ ] SubTask 16.3: 每月初自动领取官俸（复用 `tm-char-economy-engine.js` 的 14 类角色俸禄）
  - [ ] SubTask 16.4: 实现"贪墨/受贿"动作：玩家银钱+，corruption 字段累计，触发吏治腐败引擎风险
  - [ ] SubTask 16.5: 实现"购置产业"：酒楼/当铺/作坊三类，每月产生经营性收入
  - [ ] SubTask 16.6: 实现"放贷收息"：超出阈值触发民怨
  - [ ] SubTask 16.7: 实现"囤货居奇"：触发市舶司调查风险
  - [ ] SubTask 16.8: 实现"被抄家"路径（沿用 `tm-char-economy-ui.js`）：罢黜/反叛失败/贪腐被查 → 私产充公
  - [ ] SubTask 16.9: 实现"派系勒索"：派系向玩家索要保护费，拒绝则关系恶化
  - [ ] SubTask 16.10: 御案新增"私产"面板
  - 验证：跑 `node web/scripts/smoke-player-economy.js`（新增 smoke）

- [ ] Task 17: 玩家跑商系统 `web/tm-player-trade.js`
  - [ ] SubTask 17.1: 定义 `TM.PlayerTrade` 命名空间
  - [ ] SubTask 17.2: 商队数据结构：id, owner, route{from,to}, goods[], guards, carts, permit, status
  - [ ] SubTask 17.3: 实现"组建商队"：消耗银钱 + 配置护卫/车马/通关文牒（许可难度关联官场关系）
  - [ ] SubTask 17.4: 实现"派遣贸易"：根据 `tm-economy-engine.js` 区域价格矩阵计算预期利润
  - [ ] SubTask 17.5: 路线风险事件：山贼劫掠（沿用 `tm-coastal-raid.js` 模式）、官府盘剥、气候灾害、地方势力索要过路费
  - [ ] SubTask 17.6: 商队到达后结算实际盈亏，写入玩家银钱账本
  - [ ] SubTask 17.7: 大宗贸易（超阈值）调用 `tm-region-magnate.js` 影响区域经济
  - [ ] SubTask 17.8: 跨朝代通用：剧本数据 hook 路线（丝路/茶马/漕运/海贸），引擎只提供"商队+路线+风险+利润"通用框架
  - [ ] SubTask 17.9: 跑商积累商誉，开启新商业网络与 NPC 关系
  - [ ] SubTask 17.10: 御案新增"商队"面板
  - 验证：跑 `node web/scripts/smoke-player-trade.js`（新增 smoke）

- [ ] Task 18: 玩家科技研发系统 `web/tm-player-tech.js`
  - [ ] SubTask 18.1: 定义 `TM.PlayerTech` 命名空间
  - [ ] SubTask 18.2: 玩家科技账本：currentResearch{field, progress, invested}, completed[], discoveries[]
  - [ ] SubTask 18.3: 实现"启动研发"：选定领域（农业/水利/军事/工艺/医药/天文/算学/文学等），扣银钱，按 `玩家学识 + 投入资源 + 现有科技基础 + 时代限制` 计算进度
  - [ ] SubTask 18.4: 实现"招揽匠人加速"：关联人物互动，匠人加入门客清单，进度加成
  - [ ] SubTask 18.5: 实现"研发完成"：解锁对应增益（农业增产/军事强军/工艺增收/医药减疫）
  - [ ] SubTask 18.6: 实现"上奏推广"：上奏到皇帝 AI，采纳后全国获得增益
  - [ ] SubTask 18.7: 实现"私藏自用"：增益仅作用于玩家本人/封国
  - [ ] SubTask 18.8: 跨朝代铁律：引擎只提供"研发投入→进度→解锁增益"通用管线，科技列表归剧本数据
  - [ ] SubTask 18.9: 御案新增"科技"面板，显示当前研发进度与已解锁增益
  - 验证：跑 `node web/scripts/smoke-player-tech.js`（新增 smoke）

- [ ] Task 19: 玩家参加科举考试 `web/tm-player-keju.js`
  - [ ] SubTask 19.1: 定义 `TM.PlayerKeju` 命名空间
  - [ ] SubTask 19.2: 玩家考生状态：role='student', currentLevel{县试/府试/院试/乡试/会试/殿试}, examHistory[]
  - [ ] SubTask 19.3: 实现"报名应试"：playerRole 为商贾/隐逸/宗室旁支/低级官吏子弟可走科举路径
  - [ ] SubTask 19.4: 接入 `tm-keju-runtime.js` 全流程，玩家以考生身份参与
  - [ ] SubTask 19.5: 实现"作答考题"：通过 `tm-keju-question-ui.js` 作答，LLM 评卷生成成绩
  - [ ] SubTask 19.6: 实现"拜师求学"：关联人物互动 + `tm-keju-school-network.js`
  - [ ] SubTask 19.7: 实现"考中进士"：身份变更 + `playerRole` 升级为 minister + 自动授予官职（沿用 `tm-keju-allocation.js`）
  - [ ] SubTask 19.8: 实现"卷入科场弊案"：玩家可选"行贿考官/请托关节/枪替冒名"，沿用 `tm-keju-scandal.js`，风险与收益并存
  - [ ] SubTask 19.9: 御案新增"科举"面板（穿越模式下与皇帝模式科举面板区分）
  - 验证：跑 `node web/scripts/smoke-player-keju.js`（新增 smoke）

- [ ] Task 20: 玩家官员年终考核 `web/tm-player-annual-review.js`
  - [ ] SubTask 20.1: 定义 `TM.PlayerAnnualReview` 命名空间
  - [ ] SubTask 20.2: 考核指标：履职情况、政务成绩、廉洁度、人际关系、上级评价、民众口碑
  - [ ] SubTask 20.3: 实现"年末触发考核"：每年末综合玩家 1 年行为生成指标
  - [ ] SubTask 20.4: LLM 生成考核评语
  - [ ] SubTask 20.5: 结果分九等（上上/上中/上下/中上/中中/中下/下上/下中/下下）
  - [ ] SubTask 20.6: 按等级触发后果：升迁/贬谪/加俸/罚俸/赐物/记过/罢黜
  - [ ] SubTask 20.7: 实现"主动运作考核"：贿赂考官/托人情（关联人物互动），指标向上偏移但有被发现风险
  - [ ] SubTask 20.8: 考核结果与评语写入编年史（沿用 `tm-chronicle-system.js`）
  - [ ] SubTask 20.9: 玩家御案显示考核通知
  - 验证：跑 `node web/scripts/smoke-player-annual-review.js`（新增 smoke）

- [ ] Task 21: 玩家反叛系统 `web/tm-player-rebellion.js`
  - [ ] SubTask 21.1: 定义 `TM.PlayerRebellion` 命名空间
  - [ ] SubTask 21.2: 反叛筹备状态：prepProgress{军权, 粮草, 势力联络, 舆论}, threshold
  - [ ] SubTask 21.3: 实现"密谋反叛"入口：playerRole ∈ {prince, regent, general, minister, merchant（农民起义条件）}
  - [ ] SubTask 21.4: 筹备动作：笼络军权（关联人物互动）、积累粮草（关联私产）、联络势力、制造舆论（童谣/谶纬）
  - [ ] SubTask 21.5: 筹备进度可视化（御案显示筹备度）
  - [ ] SubTask 21.6: 实现"举事"：筹备度达阈值，按 playerRole 分支反叛类型（宗室夺嫡/藩王起兵/权臣篡位/边将叛乱/农民起义）
  - [ ] SubTask 21.7: 触发交战（沿用 `tm-battle-turn.js` / `tm-battle-adapter.js` / `tm-battle-resolve.js`）
  - [ ] SubTask 21.8: 皇帝 AI 发动平叛（关联 `TM.SovereignAI`）
  - [ ] SubTask 21.9: 反叛失败：玩家被诛（游戏结束）或逃亡（角色变成通缉犯），家属流放，私产抄没，编年史写入永久污点
  - [ ] SubTask 21.10: 反叛成功：`playerRole` 转为 emperor，`transmigrationMode` 转为 false，模式切回皇帝模式，编年史写入"新朝建立"
  - [ ] SubTask 21.11: 沿用 `tm-feudal.js` 篡位机制 + `tm-class-radical-revolt.js` 农民起义机制
  - 验证：跑 `node web/scripts/smoke-player-rebellion.js`（新增 smoke）

## Phase 5 · UI 文案与身份展示动态化

- [ ] Task 22: 顶栏身份展示按 playerRole 分支
  - [ ] SubTask 22.1: 在 `tm-game-ui-shell.js` 顶栏渲染处读 `P.playerInfo.playerRole`
  - [ ] SubTask 22.2: 皇帝模式：显示"年号 · 尊号"（如"崇祯十五年 · 明思宗"）
  - [ ] SubTask 22.3: 穿越模式：显示"玩家官职 · 当前皇帝年号"（如"兵部尚书 · 崇祯十五年"）
  - 验证：浏览器实查两种模式渲染

- [ ] Task 23: 字面量 `'皇帝'` 全面动态化
  - [ ] SubTask 23.1: 在 `tm-chaoyi.js` line 35/141/186/189 替换为读 `P.playerInfo.sovereignName || '皇帝'`
  - [ ] SubTask 23.2: 在 `tm-chaoyi-yuqian.js` line 215/493/658 同样替换
  - [ ] SubTask 23.3: 在 `tm-tinyi-v3.js` line 219/2629 与 `tm-tinyi-v3-edict-personnel.js` line 152/449 同样替换
  - [ ] SubTask 23.4: 在 `tm-endturn-prompt.js` line 568 `'本回合皇帝亲颁诏令原文'` 改为读 `P.playerInfo` 动态拼接
  - [ ] SubTask 23.5: 在 `tm-edict-oversight.js` line 89 `'代陛下核查诏令'` 同样动态化
  - 验证：grep `'皇帝'` 字面量，确认穿越模式下所有用户可见处已动态化（保留 schema 数据中的 `'皇帝'` 不动）

- [ ] Task 24: 退位/禅让系统穿越模式禁用
  - [ ] SubTask 24.1: 在 `tm-player-core.js:68 openAbdication` 入口判定 `transmigrationMode`，true 时隐藏入口并提示"穿越模式下不可禅让"
  - [ ] SubTask 24.2: 改为角色定位匹配的身份变更路径：minister→"辞职/告老"，prince→"袭爵/夺嫡"，general→"卸甲/起复"等
  - [ ] SubTask 24.3: 调用 `TM.Transmigration.triggerRoleChange(kind, payload)` 触发身份变更
  - 验证：跑 `node web/scripts/smoke-transmigration-role-change.js`（新增 smoke）

## Phase 6 · 回合流程编排

- [ ] Task 25: 穿越模式回合流程接入
  - [ ] SubTask 25.1: 在 `tm-endturn-pipeline-steps.js` 新增 `_endturnStep_sovereignAI(root, ctx)` 步骤
  - [ ] SubTask 25.2: 步骤位置：玩家上奏收集之后、派系 NPC 决策之前
  - [ ] SubTask 25.3: 调用 `TM.SovereignAI.runTurn(root, ctx)`，将其输出转化为回合变更
  - [ ] SubTask 25.4: 在 `tm-endturn-prep.js:341 _endTurn_collectInput` 按 playerRole 分支收集（诏令 vs 上奏）
  - [ ] SubTask 25.5: `confirmEndTurn`（tm-office-panel.js:1600）按 playerRole 切换文案：皇帝模式"诏令颁行"，穿越模式"上奏呈递"
  - 验证：跑 `node web/scripts/smoke-transmigration-endturn.js`（新增 smoke）

- [ ] Task 26: 起居注/编年标注决策来源
  - [ ] SubTask 26.1: 在 `tm-shiji-qiju-ui.js` 渲染条目时读 `entry.source` 字段（'player' / 'sovereign-ai' / 'npc'）
  - [ ] SubTask 26.2: 不同来源用不同图标/颜色标识，便于玩家回看
  - [ ] SubTask 26.3: 编年史（`tm-chronicle-system.js`）月稿自动区分"君主自动决策"与"玩家行动"两段
  - 验证：跑 `node web/scripts/smoke-transmigration-chronicle.js`（新增 smoke）

## Phase 7 · 集成与回归

- [ ] Task 27: 端到端穿越模式 smoke
  - [ ] SubTask 27.1: 新增 `web/scripts/smoke-transmigration-e2e.js`：从主界面点穿越→选剧本→选角色→进入游戏→结束回合→皇帝 AI 决策→玩家上奏批答→起居注回看→人物互动→跑商→科技研发→科举→年终考核→反叛筹备
  - [ ] SubTask 27.2: 断言：`P.playerInfo.transmigrationMode === true`，皇帝 AI 至少生成 1 个决策，玩家上奏得到批答，7 大玩家系统至少各跑通 1 个核心动作
  - 验证：`node web/scripts/smoke-transmigration-e2e.js` 全过

- [ ] Task 28: 皇帝模式回归
  - [ ] SubTask 28.1: 跑 `node web/scripts/smoke-chaoyi-v3.js` / `smoke-edict-typed-incidence.js` / `smoke-office-dup-seat-heal.js` 等已有 smoke
  - [ ] SubTask 28.2: 跑 `node web/scripts/verify-all.js` 全套
  - [ ] SubTask 28.3: 修复任何因字面量动态化引入的回归
  - 验证：`verify-all` 全绿

- [ ] Task 29: 架构守卫
  - [ ] SubTask 29.1: 跑 `node scripts/lint-arch-all.js`，须 8/8 绿
  - [ ] SubTask 29.2: 新增 GM/P 直写需登记 owners 或走 mutator/ledger
  - [ ] SubTask 29.3: 新增 9 个文件（tm-transmigration / tm-sovereign-ai / tm-player-interaction / tm-player-economy / tm-player-trade / tm-player-tech / tm-player-keju / tm-player-annual-review / tm-player-rebellion）加入 `arch-baselines/*.json`
  - 验证：lint 全绿

- [ ] Task 30: 文档与命名
  - [ ] SubTask 30.1: 在 `web/INDEX.md` 注册 9 个新文件
  - [ ] SubTask 30.2: 在 `web/ARCHITECTURE.md` 增补「穿越模式架构」一节，含 7 大玩家系统数据流图
  - [ ] SubTask 30.3: 跨朝代铁律审计：grep 明清专名（内阁/票拟/司礼监/东厂/八股等），确认未硬编入引擎层
  - 验证：grep 检查 + 文档完整性

# Task Dependencies

- Task 2 依赖 Task 1（数据结构需要核心模块）
- Task 3 / Task 4 依赖 Task 1 / Task 2
- Task 5 依赖 Task 4
- Task 6 独立（皇帝 AI 引擎）
- Task 7 / Task 8 / Task 9 / Task 10 依赖 Task 6（并行）
- Task 11 / Task 12 / Task 13 / Task 14 依赖 Task 5（并行）
- Task 15（人物互动）依赖 Task 5 —— 后续多个系统依赖此系统
- Task 16（赚钱/私产）依赖 Task 5
- Task 17（跑商）依赖 Task 16（商队需银钱账本）
- Task 18（科技）依赖 Task 15（招揽匠人）+ Task 16（研发投入）
- Task 19（玩家科举）依赖 Task 5
- Task 20（年终考核）依赖 Task 5
- Task 21（反叛）依赖 Task 15（笼络军权）+ Task 16（积累粮草）+ Task 6（皇帝 AI 平叛）
- Task 22 / Task 23 / Task 24 依赖 Task 5（并行）
- Task 25 依赖 Task 6 + Task 11
- Task 26 依赖 Task 25
- Task 27 依赖 Task 25 + Task 26 + Phase 4.5 全部（Task 15-21）
- Task 28 / Task 29 / Task 30 依赖 Task 27（并行）

# 并行机会

- Phase 3 内部：Task 7/8/9/10 可并行（皇帝 AI 四个动作面）
- Phase 4 内部：Task 11/12/13/14 可并行（按 playerRole 分支的面板）
- Phase 4.5 内部：Task 15/16/19/20 可并行（人物互动/赚钱/科举/考核，无强依赖）
- Phase 4.5 串行链：Task 15→17（跑商依赖私产）→18（科技依赖互动+私产）→21（反叛依赖互动+私产+AI）
- Phase 5 内部：Task 22/23/24 可并行
- Phase 7 内部：Task 28/29/30 可并行
