# Tasks

> 状态标记：`[ ]` 待办 · `[~]` 进行中 · `[x]` 完成
> 依赖关系见末尾「Task Dependencies」。每刀收尾跑 `node scripts/lint-arch-all.js` + 主题 smoke。

## Phase 1 · 基础设施与开局流程（前置必做）

- [x] Task 1: 新增穿越模式核心模块 `web/tm-transmigration.js`
  - [x] SubTask 1.1: 定义 `TM.Transmigration` 命名空间，挂载到 `window.TM`
  - [x] SubTask 1.2: 实现 `TM.Transmigration.isTransmigrationMode()` —— 读取 `P.playerInfo.transmigrationMode`
  - [x] SubTask 1.3: 实现 `TM.Transmigration.derivePlayerRole(ch)` —— 根据角色 `role`/`officialTitle`/`royalRelation`/`familyTier` 推导 `playerRole`
  - [x] SubTask 1.4: 实现 `TM.Transmigration.getSovereignName(root)` —— 在 `GM.chars` 中找出 `_offIsSovereign` 角色并返回姓名
  - [x] SubTask 1.5: 注册到 `index.html` 的 `<script>` 顺序链（在 `tm-launch.js` 之前）
  - 验证：浏览器控制台 `TM.Transmigration.isTransmigrationMode()` 可调用

- [x] Task 2: 扩展 `P.playerInfo` 数据结构
  - [x] SubTask 2.1: 在 `editor-core.js:26-39` 给 `P.playerInfo` 增加字段：`transmigrationMode`(boolean) / `sovereignName`(string) / `sovereignTitle`(string) / `selectedCharId`(string)
  - [x] SubTask 2.2: 默认值：`transmigrationMode:false` / `sovereignName:''` / 其他空字符串
  - [x] SubTask 2.3: 在 `tm-save-lifecycle.js` 的存档 schema 增加这四个字段（向后兼容，缺失补默认）
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

- [ ] Task 18: 玩家科技研发系统 `web/tm-player-tech.js`（含固定科技路线）
  - [ ] SubTask 18.1: 定义 `TM.PlayerTech` 命名空间
  - [ ] SubTask 18.2: 玩家科技账本：currentResearch{field, level, progress, invested}, completed[], discoveries[]
  - [ ] SubTask 18.3: **预设固定科技路线数据**：内置默认路线（农业/军事/工艺/医药/水利/天文/算学/文学等线，每线 5 级），写入 `tm-engine-constants.js` 或新 `tm-tech-routes-data.js`
    - 农业线：`农具改良 → 良种选育 → 水利灌溉 → 耕作制度 → 多熟种植`
    - 军事线：`冶铁锻造 → 弩机改良 → 甲胄升级 → 攻城器械 → 火药初探`
    - 工艺线：`纺织改进 → 陶瓷烧制 → 造纸印刷 → 冶铸高炉 → 雕版活字`
    - 医药线：`本草整理 → 方剂编纂 → 针灸推拿 → 疫病防治 → 法医检验`
    - 水利线：`沟渠疏浚 → 陂塘修筑 → 堰坝工程 → 运河开凿 → 海塘修筑`
  - [ ] SubTask 18.4: 实现"启动研发"：选定领域，扣银钱，按 `学识 + 投入 + 基础 + 时代限制` 计算进度
  - [ ] SubTask 18.5: 实现"前置科技解锁"：完成 N 级才能研发 N+1 级，未完成时禁用按钮并提示
  - [ ] SubTask 18.6: 剧本数据可覆盖/扩展路线（merge 默认 + 剧本）
  - [ ] SubTask 18.7: 实现"招揽匠人加速"：关联人物互动，进度加成
  - [ ] SubTask 18.8: 实现"研发完成"：解锁对应增益
  - [ ] SubTask 18.9: 实现"上奏推广"与"私藏自用"两条路径
  - [ ] SubTask 18.10: 御案新增"科技"面板，可视化科技树（已解锁/进行中/锁定）
  - 验证：跑 `node web/scripts/smoke-player-tech.js`（新增 smoke），断言前置科技锁正确

- [ ] Task 19: 玩家家族与子女系统 `web/tm-player-family.js`
  - [ ] SubTask 19.1: 定义 `TM.PlayerFamily` 命名空间
  - [ ] SubTask 19.2: 玩家家族结构（复用 `tm-char-full-schema.js` 的 `family` / `familyMembers` 字段）：父母/兄弟/姐妹/配偶/子女/宗族
  - [ ] SubTask 19.3: 实现"结婚"（常规娶妻/嫁女）：通过人物互动系统联姻，配偶带入嫁妆/陪嫁/家族关系，走"纳采/问名/纳吉/纳征/请期/亲迎"六礼流程
  - [ ] SubTask 19.4: 实现"生育子女"：时间推进到生育周期生成子女角色（写入 `family.children`）
  - [ ] SubTask 19.5: 实现"子女成长"：婴幼儿→少年→成年，每阶段触发事件（满月/启蒙/冠礼/及笄）
  - [ ] SubTask 19.6: 实现"子女教育"：延师/亲自教导/送书院，更新子女 `learning/intelligence/benevolence` 字段
  - [ ] SubTask 19.7: 实现"子女联姻"：成年子女与 NPC 家族联姻
  - [ ] SubTask 19.8: 实现"子女出仕"：科举/荫袭/征辟三条路径
  - [ ] SubTask 19.9: 实现"子女继承"：玩家死亡/罢黜时子女继承家产/官职/名望，可选切换至子女继续游戏
  - [ ] SubTask 19.10: 实现"子嗣危机"：无子触发"绝嗣"危机；子嗣过多触发"夺嫡"内斗
  - [ ] SubTask 19.11: 实现"子女叛逃"：关系恶化到"仇敌"级时子女可能叛逃
  - [ ] SubTask 19.12: 御案新增"家族"面板，展示家族树与子女状态

- [ ] Task 19B: 玩家婚姻礼制系统（婚嫁/赘婿/招赘/再婚/和离）`web/tm-player-marriage.js`
  - [ ] SubTask 19B.1: 定义 `TM.PlayerMarriage` 命名空间
  - [ ] SubTask 19B.2: 婚姻状态机：未婚/已娶/赘婿/招赘/和离/丧偶/再婚（继室/平妻）
  - [ ] SubTask 19B.3: 实现"六礼流程"：纳采/问名/纳吉/纳征/请期/亲迎，每步消耗时间/银钱，可被 NPC 拒婚
  - [ ] SubTask 19B.4: 实现"入赘为赘婿"路径：玩家男性 + 选择入赘，改入女方家族，地位较低，触发"赘婿逆袭"或"被妻家欺压"戏剧线
  - [ ] SubTask 19B.5: 实现"招赘"路径：玩家女性/女家主，赘婿入门加入玩家家族，子女归玩家家族
  - [ ] SubTask 19B.6: 实现"再婚"：丧偶/和离后度过守制期可再婚，新配偶标记继室/平妻
  - [ ] SubTask 19B.7: 实现"守制期校验"：父母丧/夫丧/妻丧期间禁婚，违规触发礼法风险（言官弹劾/名声下降/官员被罢）
  - [ ] SubTask 19B.8: 实现"再婚带子女"：鳏夫/寡妇带子女再婚，子女与新配偶关系动态生成（慈/严/慈爱/虐待/敌对）
  - [ ] SubTask 19B.9: 实现"和离/休妻/休夫"：玩家主动和离（协议）、休妻（男方需符合七出）、休夫（罕见需妻家强势），子女归属按礼法判定
  - [ ] SubTask 19B.10: 实现"平妻/嫡庶之争"：特殊情况下平妻触发嫡庶之争风险，子嗣继承顺序争议
  - [ ] SubTask 19B.11: 婚姻事件写入玩家记忆与编年史（结婚/赘婿/再婚/和离/休妻等关键节点）
  - [ ] SubTask 19B.12: 御案"家族"面板新增"婚姻"子面板，展示当前婚姻状态、配偶档案、可选婚姻动作
  - 验证：跑 `node web/scripts/smoke-player-family.js`（新增 smoke）

- [ ] Task 20: 玩家私军系统 `web/tm-player-private-army.js`
  - [ ] SubTask 20.1: 定义 `TM.PlayerPrivateArmy` 命名空间
  - [ ] SubTask 20.2: 私军数据结构：units[{id, type, count, training, equipment, morale}], type ∈ {家丁/门客剑士/部曲/死士}
  - [ ] SubTask 20.3: 实现"招募私军"：从流民/镖师/江湖人/退役军士中招募，关联人物互动可招揽名将
  - [ ] SubTask 20.4: 实现"私军维护"：每月消耗银钱/粮草，规模超限触发财政压力
  - [ ] SubTask 20.5: 实现"训练私军"：消耗时间/银钱，训练度提升（沿用 `tm-army-units.js` 模型）
  - [ ] SubTask 20.6: 实现"装备私军"：购置兵器/甲胄/战马（关联私产系统）
  - [ ] SubTask 20.7: 实现"护卫商队"使用场景：派遣护卫降低山贼劫掠风险
  - [ ] SubTask 20.8: 实现"自卫"使用场景：反叛筹备期抵御围剿
  - [ ] SubTask 20.9: 实现"政变"使用场景：反叛时私军作为主力参战（沿用 `tm-battle-*.js`）
  - [ ] SubTask 20.10: 实现"私斗"使用场景：与 NPC 家族械斗
  - [ ] SubTask 20.11: 实现"僭越风险"：规模超阈值触发朝廷调查/言官弹劾/问罪
  - [ ] SubTask 20.12: 沿用 `tm-military.js` / `tm-army-units.js` 战斗单位模型，标记 `kind:'private'` 独立账本
  - [ ] SubTask 20.13: 御案新增"私军"面板
  - 验证：跑 `node web/scripts/smoke-player-private-army.js`（新增 smoke）

- [ ] Task 21: 玩家自由移动系统 `web/tm-player-movement.js`
  - [ ] SubTask 21.1: 定义 `TM.PlayerMovement` 命名空间
  - [ ] SubTask 21.2: 玩家移动状态：currentLocation, travelStatus{moving, from, to, mode, eta}, discoveredLocations[]
  - [ ] SubTask 21.3: 实现"发起移动"：选定目的地，复用 `tm-military.js` 行军路径算法计算距离/耗时
  - [ ] SubTask 21.4: 实现移动方式选择：步行/骑马/车驾/舟船/驿站（不同速度/成本）
  - [ ] SubTask 21.5: 驿站方式需官场关系（关联人物互动）
  - [ ] SubTask 21.6: 实现"移动事件"：路上随机触发盗匪/天气/偶遇 NPC/发现古迹（LLM 生成）
  - [ ] SubTask 21.7: 实现"地点决定动作集"：京城/地方/封国/边疆/名胜/敌国化外 等地点分支
  - [ ] SubTask 21.8: 实现"携带随从"：家属/私军/商队一起移动，成本按规模加成
  - [ ] SubTask 21.9: 玩家 `location` 字段更新（沿用 `tm-char-full-schema.js`）
  - [ ] SubTask 21.10: 御案新增"移动"面板，显示地图与可去地点
  - 验证：跑 `node web/scripts/smoke-player-movement.js`（新增 smoke）

- [ ] Task 22: 玩家产业建设系统 `web/tm-player-industry.js`
  - [ ] SubTask 22.1: 定义 `TM.PlayerIndustry` 命名空间
  - [ ] SubTask 22.2: 产业数据结构：industries[{id, type, location, size, status, output, workers, equipment, level}]
  - [ ] SubTask 22.3: 产业类型：庄园/农场/牧场/矿场/林场/渔场/工坊/商号
  - [ ] SubTask 22.4: 实现"选址建设"：校验选址限制（矿场只能在矿山附近等），购地消耗银钱 + 当地官府许可
  - [ ] SubTask 22.5: 实现"施工建设"：募工 + 施工时间（按规模），完成后投产
  - [ ] SubTask 22.6: 实现"产业经营"：每月产出货物/银钱，受管理 + 民夫/匠人 + 治安 + 灾害影响
  - [ ] SubTask 22.7: 实现"产业升级"：扩建/改良/特化
  - [ ] SubTask 22.8: 实现"产业风险"：火灾/水灾/盗匪/民夫逃亡/官府强征/敌军劫掠
  - [ ] SubTask 22.9: 实现"豪强标签"：大产业触发朝廷强征/抄没风险
  - [ ] SubTask 22.10: 沿用 `tm-building-works.js` 建筑系统底层
  - [ ] SubTask 22.11: 御案新增"产业"面板，展示已建产业与产出
  - 验证：跑 `node web/scripts/smoke-player-industry.js`（新增 smoke）

- [ ] Task 23: 玩家开垦荒地系统 `web/tm-player-reclaim.js`
  - [ ] SubTask 23.1: 定义 `TM.PlayerReclaim` 命名空间
  - [ ] SubTask 23.2: 开垦状态：projects[{id, region, size, progress, workers, status, expectedOutput}]
  - [ ] SubTask 23.3: 实现"勘探荒地"：选定区域，校验可开垦规模（小块/中块/大块）与成本预估
  - [ ] SubTask 23.4: 实现"官府许可前置"：需当地官府许可（关联人物互动 + 官制权限）
  - [ ] SubTask 23.5: 实现"违规开垦"：触发"占田"风险（言官弹劾/强令退还）
  - [ ] SubTask 23.6: 实现"开垦施工"：募集流民/民夫，流程：平整土地 → 修水利 → 播种 → 收获
  - [ ] SubTask 23.7: 不同规模消耗不同时间（小块 1 月/中块 3 月/大块 6-12 月）
  - [ ] SubTask 23.8: 实现"开垦产出"：新耕地按比例增加当地粮食产量，玩家享分成
  - [ ] SubTask 23.9: 实现"开垦副作用"：侵占牧场/林地/猎场触发当地势力不满；大规模开垦触发生态事件（水患/沙化）
  - [ ] SubTask 23.10: 实现"与朝廷互动"：开垦有成可上奏请功；失败触发问责
  - [ ] SubTask 23.11: 跨朝代通用：屯田/占田/均田等政策由剧本 hook，引擎只提供"开垦→产出→风险"通用框架
  - [ ] SubTask 23.12: 御案新增"开垦"面板
  - 验证：跑 `node web/scripts/smoke-player-reclaim.js`（新增 smoke）

- [ ] Task 24: 玩家参加科举考试 `web/tm-player-keju.js`
  - [ ] SubTask 24.1: 定义 `TM.PlayerKeju` 命名空间
  - [ ] SubTask 24.2: 玩家考生状态：role='student', currentLevel{县试/府试/院试/乡试/会试/殿试}, examHistory[]
  - [ ] SubTask 24.3: 实现"报名应试"：playerRole 为商贾/隐逸/宗室旁支/低级官吏子弟可走科举路径
  - [ ] SubTask 24.4: 接入 `tm-keju-runtime.js` 全流程，玩家以考生身份参与
  - [ ] SubTask 24.5: 实现"作答考题"：通过 `tm-keju-question-ui.js` 作答，LLM 评卷生成成绩
  - [ ] SubTask 24.6: 实现"拜师求学"：关联人物互动 + `tm-keju-school-network.js`
  - [ ] SubTask 24.7: 实现"考中进士"：身份变更 + `playerRole` 升级为 minister + 自动授予官职（沿用 `tm-keju-allocation.js`）
  - [ ] SubTask 24.8: 实现"卷入科场弊案"：玩家可选"行贿考官/请托关节/枪替冒名"，沿用 `tm-keju-scandal.js`，风险与收益并存
  - [ ] SubTask 24.9: 御案新增"科举"面板（穿越模式下与皇帝模式科举面板区分）
  - 验证：跑 `node web/scripts/smoke-player-keju.js`（新增 smoke）

- [ ] Task 25: 玩家官员年终考核 `web/tm-player-annual-review.js`
  - [ ] SubTask 25.1: 定义 `TM.PlayerAnnualReview` 命名空间
  - [ ] SubTask 25.2: 考核指标：履职情况、政务成绩、廉洁度、人际关系、上级评价、民众口碑
  - [ ] SubTask 25.3: 实现"年末触发考核"：每年末综合玩家 1 年行为生成指标
  - [ ] SubTask 25.4: LLM 生成考核评语
  - [ ] SubTask 25.5: 结果分九等（上上/上中/上下/中上/中中/中下/下上/下中/下下）
  - [ ] SubTask 25.6: 按等级触发后果：升迁/贬谪/加俸/罚俸/赐物/记过/罢黜
  - [ ] SubTask 25.7: 实现"主动运作考核"：贿赂考官/托人情（关联人物互动），指标向上偏移但有被发现风险
  - [ ] SubTask 25.8: 考核结果与评语写入编年史（沿用 `tm-chronicle-system.js`）
  - [ ] SubTask 25.9: 玩家御案显示考核通知
  - 验证：跑 `node web/scripts/smoke-player-annual-review.js`（新增 smoke）

- [ ] Task 26: 玩家反叛系统 `web/tm-player-rebellion.js`
  - [ ] SubTask 26.1: 定义 `TM.PlayerRebellion` 命名空间
  - [ ] SubTask 26.2: 反叛筹备状态：prepProgress{军权, 粮草, 势力联络, 舆论}, threshold
  - [ ] SubTask 26.3: 实现"密谋反叛"入口：playerRole ∈ {prince, regent, general, minister, merchant（农民起义条件）}
  - [ ] SubTask 26.4: 筹备动作：笼络军权（关联人物互动 + 私军）、积累粮草（关联私产）、联络势力、制造舆论（童谣/谶纬）
  - [ ] SubTask 26.5: 筹备进度可视化（御案显示筹备度）
  - [ ] SubTask 26.6: 实现"举事"：筹备度达阈值，按 playerRole 分支反叛类型（宗室夺嫡/藩王起兵/权臣篡位/边将叛乱/农民起义）
  - [ ] SubTask 26.7: 触发交战（沿用 `tm-battle-turn.js` / `tm-battle-adapter.js` / `tm-battle-resolve.js`），私军作为反叛主力
  - [ ] SubTask 26.8: 皇帝 AI 发动平叛（关联 `TM.SovereignAI`）
  - [ ] SubTask 26.9: 反叛失败：玩家被诛（游戏结束）或逃亡（角色变成通缉犯），家属流放，私产抄没，编年史写入永久污点
  - [ ] SubTask 26.10: 反叛成功：`playerRole` 转为 emperor，`transmigrationMode` 转为 false，模式切回皇帝模式，编年史写入"新朝建立"
  - [ ] SubTask 26.11: 沿用 `tm-feudal.js` 篡位机制 + `tm-class-radical-revolt.js` 农民起义机制
  - 验证：跑 `node web/scripts/smoke-player-rebellion.js`（新增 smoke）

- [ ] Task 26B: 玩家自我技能提升系统 `web/tm-player-self-improvement.js`
  - [ ] SubTask 26B.1: 定义 `TM.PlayerSelfImprovement` 命名空间
  - [ ] SubTask 26B.2: 属性字段定义：`learning` / `intelligence` / `valor` / `military` / `administration` / `management` / `charisma` / `diplomacy` / `benevolence` / `diction` + `learning` 子项（经史/诗赋/算学/律法/医术/兵法/天文/地理/音律/书法等）
  - [ ] SubTask 26B.3: 实现"入读学塾/书院"：报名入学（学费/考核），按期学习提升 `learning` 与子项，不同书院侧重不同（经史/武/医/律书院等），复用 `tm-keju-school-network.js`
  - [ ] SubTask 26B.4: 实现"拜名师"：通过人物互动拜 NPC 名师，建立师徒关系，按师父专长定向加成（拜名将学兵法、拜名医学医术、拜大儒学经史），可传授独门技艺
  - [ ] SubTask 26B.5: 实现"自学苦读"：消耗时间 + 银钱（购书/置办文具）自学，效率低于书院/拜师但灵活，受 `intelligence` / 现有 `learning` 影响
  - [ ] SubTask 26B.6: 实现"游学"：通过自由移动到达名胜/古战场/名郡触发游学事件（LLM 生成见闻/感悟），按地点加成对应属性（如游赤壁加 `military`/`learning`），见闻写入玩家记忆
  - [ ] SubTask 26B.7: 实现"历练"：完成实际政务/军事/外交任务自动积累经验，按任务类型提升对应技能（政务→`administration`/`management`，军事→`military`/`valor`，外交→`diplomacy`/`charisma`），关键突破触发额外加成
  - [ ] SubTask 26B.8: 实现"江湖习武"：playerRole 为商贾/隐逸/江湖人，入武馆/镖局/门派习武，提升 `valor` / `military`，与江湖人物建立关系
  - [ ] SubTask 26B.9: 实现"修道/礼佛"：提升 `benevolence` / `intelligence`，副作用为远离世俗、官场关系疏远、可能被指"不思进取"，深度修道触发"出家"危机选项
  - [ ] SubTask 26B.10: 实现"属性上限与年龄影响"：每属性上限 100，提升效率随年龄变化（少年学习快但属性低，老年属性稳定但学习慢），概率按 `当前属性 + 师资 + 投入 + 资质` 计算
  - [ ] SubTask 26B.11: 实现"关键突破事件"：属性达里程碑（50/80/100）或完成成就（著作/拜名师/悟理）触发 LLM 叙事，写入记忆与编年史，解锁特殊能力/称号（如"经学大家"/"兵法宗师"/"医术圣手"）
  - [ ] SubTask 26B.12: 御案新增"修习"面板，展示当前属性、可学场所、师徒关系、近期突破
  - 验证：跑 `node web/scripts/smoke-player-self-improvement.js`（新增 smoke）

- [ ] Task 26C: 特殊身份玩家路线（太监/宫女/布衣/盗贼/婴儿/退休官员等）`web/tm-player-special-roles.js`
  - [ ] SubTask 26C.1: 定义 `TM.PlayerSpecialRoles` 命名空间，作为特殊身份玩法的统一调度入口
  - [ ] SubTask 26C.2: 扩展 `P.playerInfo.playerRole` 枚举值：新增 `eunuch`（太监）/ `maid`（宫女）/ `commoner`（布衣）/ `bandit`（盗贼）/ `infant`（婴儿）/ `retired_official`（退休官员）/ `monk`（僧道）/ `artisan`（匠人）/ `actor`（伶人）等
  - [ ] SubTask 26C.3: 实现"太监路线"（`eunuch`）：
    - 不能结婚/生育（无家族延续），但有"养子/义子"路径（收养 NPC 为义子延续势力）
    - 专有动作：讨好皇帝（影响皇帝 AI 决策权重）、把持司礼监/内书堂、与外臣勾结（关联派系）、掌印/秉笔（如剧本允许）、阉党揽权（触发东林式反弹）
    - 专有风险：清流弹劾、皇帝猜忌、被诛（宦官专权必遭反噬）
    - 跨朝代铁律：太监具体职务（司礼监/秉笔/掌印等）由剧本 hook，引擎只提供"内廷宦官"通用框架
  - [ ] SubTask 26C.4: 实现"宫女路线"（`maid`）：
    - 专有动作：伺候后宫主位（关系网）、传递消息（影响前朝）、被宠幸（晋升妃嫔，playerRole 转为后宫）、出宫（年龄到限/被放出）
    - 专有风险：宫廷斗争（被诬陷/被毒杀/被罚）、与外臣私通（死罪）
    - 可晋升路径：宫女→女官→妃嫔（被宠幸后）→太后（罕见）
  - [ ] SubTask 26C.5: 实现"布衣路线"（`commoner`）：
    - 平民百姓起点，无官职无势力
    - 专有动作：耕读（关联自我技能提升）、经商（关联赚钱/跑商）、游学（关联自由移动）、应募当兵（转为军汉）、科举入仕（关联科举系统）、上书言事（需通过臣子转呈）
    - 专有风险：被豪强欺压、被征徭役、遇灾荒逃荒
    - 多条出路：科举出仕/经商致富/从军立功/落草为盗/皈依宗教
  - [ ] SubTask 26C.6: 实现"盗贼路线"（`bandit`）：
    - 落草为寇起点，占据山头/水寨
    - 专有动作：劫掠商队（关联跑商风险反面）、招揽喽啰（类似私军但身份非法）、与江湖势力结盟、打官府（小型战斗）、收保护费
    - 专有路径：被招安（转为正规军将领）、自立为王（建立割据政权，关联反叛系统）、被剿灭（游戏结束）
    - 专有风险：官兵围剿、黑吃黑、被仇家寻仇
  - [ ] SubTask 26C.7: 实现"婴儿路线"（`infant`）：
    - 玩家以婴幼儿身份开局（如皇子/宗室子/名门子），无法主动行动
    - 专有机制：由监护人（父母/乳母/太傅）代为决策，玩家只能"观察 + 选择反应"（如哭闹/乖巧/早慧）
    - 成长阶段：婴幼儿→少年→成年，每阶段有成长事件，玩家随年龄增长逐步获得行动权
    - 专有戏剧线：夺嫡之争（若为皇子）、家产之争（若为名门子）、早慧传闻（影响 NPC 期待）
    - 成年后 playerRole 按家族出身转为对应身份（皇子→宗室，名门子→minister/commoner 等）
  - [ ] SubTask 26C.8: 实现"退休官员路线"（`retired_official`）：
    - 致仕/罢黜/告老后的官员身份
    - 专有动作：乡居教学（开馆授徒，关联自我技能提升）、干预地方政务（幕后操纵）、撰写回忆录/史书（提升 `learning`，写入编年史）、被起复（朝廷重新征召）
    - 专有影响：余威犹存（旧部/门生故吏遍布朝野，可调度资源）、被清算（政敌上门报复）
    - 可被朝廷起复：起复后 playerRole 转为 minister/general
  - [ ] SubTask 26C.9: 实现"僧道路线"（`monk`，可选）：
    - 出家身份，远离世俗但有专属影响路径
    - 专有动作：修行（提升 `benevolence`/`intelligence`）、收徒（建立宗教势力）、影响信众（包括皇帝）、参与政变（以宗教名义）
    - 专有风险：被指妖言惑众、被朝廷清算（灭佛/毁道历史事件）
  - [ ] SubTask 26C.10: 实现"匠人路线"（`artisan`，可选）：
    - 手工业者身份，专精某项工艺（陶瓷/纺织/冶铸/造纸等）
    - 专有动作：精进技艺（关联科技研发）、收徒传艺、为朝廷服役（被征辟为官营作坊匠人）、自办作坊（关联产业建设）
    - 可晋升路径：匠户→匠师→工部匠官（playerRole 转为 minister）
  - [ ] SubTask 26C.11: 实现"伶人路线"（`actor`，可选）：
    - 戏曲/音乐/歌舞艺人身份
    - 专有动作：献艺（影响皇帝/重臣）、收徒传艺、结交权贵
    - 专有风险：被指"倡优误国"、被权贵强夺、身份低微受歧视
    - 可晋升路径：被宠幸后 playerRole 转为后宫/宠臣
  - [ ] SubTask 26C.12: 御案"身份"面板新增"特殊身份玩法"子面板，按当前 playerRole 展示对应专有动作集
  - [ ] SubTask 26C.13: 跨朝代铁律审计：所有特殊身份的专有职务/机构名目由剧本 hook，引擎只提供"特殊身份 + 通用动作框架"
  - 验证：跑 `node web/scripts/smoke-player-special-roles.js`（新增 smoke），断言 7 类特殊身份至少各跑通 1 个专有动作

## Phase 5 · UI 文案与身份展示动态化

- [ ] Task 27: 顶栏身份展示按 playerRole 分支
  - [ ] SubTask 27.1: 在 `tm-game-ui-shell.js` 顶栏渲染处读 `P.playerInfo.playerRole`
  - [ ] SubTask 27.2: 皇帝模式：显示"年号 · 尊号"（如"崇祯十五年 · 明思宗"）
  - [ ] SubTask 27.3: 穿越模式：显示"玩家官职 · 当前皇帝年号"（如"兵部尚书 · 崇祯十五年"）
  - 验证：浏览器实查两种模式渲染

- [ ] Task 28: 字面量 `'皇帝'` 全面动态化
  - [ ] SubTask 28.1: 在 `tm-chaoyi.js` line 35/141/186/189 替换为读 `P.playerInfo.sovereignName || '皇帝'`
  - [ ] SubTask 28.2: 在 `tm-chaoyi-yuqian.js` line 215/493/658 同样替换
  - [ ] SubTask 28.3: 在 `tm-tinyi-v3.js` line 219/2629 与 `tm-tinyi-v3-edict-personnel.js` line 152/449 同样替换
  - [ ] SubTask 28.4: 在 `tm-endturn-prompt.js` line 568 `'本回合皇帝亲颁诏令原文'` 改为读 `P.playerInfo` 动态拼接
  - [ ] SubTask 28.5: 在 `tm-edict-oversight.js` line 89 `'代陛下核查诏令'` 同样动态化
  - 验证：grep `'皇帝'` 字面量，确认穿越模式下所有用户可见处已动态化（保留 schema 数据中的 `'皇帝'` 不动）

- [ ] Task 29: 退位/禅让系统穿越模式禁用
  - [ ] SubTask 29.1: 在 `tm-player-core.js:68 openAbdication` 入口判定 `transmigrationMode`，true 时隐藏入口并提示"穿越模式下不可禅让"
  - [ ] SubTask 29.2: 改为角色定位匹配的身份变更路径：minister→"辞职/告老"，prince→"袭爵/夺嫡"，general→"卸甲/起复"等
  - [ ] SubTask 29.3: 调用 `TM.Transmigration.triggerRoleChange(kind, payload)` 触发身份变更
  - 验证：跑 `node web/scripts/smoke-transmigration-role-change.js`（新增 smoke）

## Phase 6 · 回合流程编排

- [ ] Task 30: 穿越模式回合流程接入
  - [ ] SubTask 30.1: 在 `tm-endturn-pipeline-steps.js` 新增 `_endturnStep_sovereignAI(root, ctx)` 步骤
  - [ ] SubTask 30.2: 步骤位置：玩家上奏收集之后、派系 NPC 决策之前
  - [ ] SubTask 30.3: 调用 `TM.SovereignAI.runTurn(root, ctx)`，将其输出转化为回合变更
  - [ ] SubTask 30.4: 在 `tm-endturn-prep.js:341 _endTurn_collectInput` 按 playerRole 分支收集（诏令 vs 上奏）
  - [ ] SubTask 30.5: `confirmEndTurn`（tm-office-panel.js:1600）按 playerRole 切换文案：皇帝模式"诏令颁行"，穿越模式"上奏呈递"
  - 验证：跑 `node web/scripts/smoke-transmigration-endturn.js`（新增 smoke）

- [ ] Task 31: 起居注/编年标注决策来源
  - [ ] SubTask 31.1: 在 `tm-shiji-qiju-ui.js` 渲染条目时读 `entry.source` 字段（'player' / 'sovereign-ai' / 'npc'）
  - [ ] SubTask 31.2: 不同来源用不同图标/颜色标识，便于玩家回看
  - [ ] SubTask 31.3: 编年史（`tm-chronicle-system.js`）月稿自动区分"君主自动决策"与"玩家行动"两段
  - 验证：跑 `node web/scripts/smoke-transmigration-chronicle.js`（新增 smoke）

## Phase 7 · 集成与回归

- [ ] Task 32: 端到端穿越模式 smoke
  - [ ] SubTask 32.1: 新增 `web/scripts/smoke-transmigration-e2e.js`：从主界面点穿越→选剧本→选角色→进入游戏→结束回合→皇帝 AI 决策→玩家上奏批答→起居注回看→人物互动→跑商→科技研发（固定路线解锁）→家族子女→婚嫁/再婚→私军招募→移动→产业建设→开垦荒地→科举→年终考核→自我技能提升（学塾/拜师）→特殊身份专有动作（至少 1 类）→反叛筹备
  - [ ] SubTask 32.2: 断言：`P.playerInfo.transmigrationMode === true`，皇帝 AI 至少生成 1 个决策，玩家上奏得到批答，14+ 大玩家系统至少各跑通 1 个核心动作
  - 验证：`node web/scripts/smoke-transmigration-e2e.js` 全过

- [ ] Task 33: 皇帝模式回归
  - [ ] SubTask 33.1: 跑 `node web/scripts/smoke-chaoyi-v3.js` / `smoke-edict-typed-incidence.js` / `smoke-office-dup-seat-heal.js` 等已有 smoke
  - [ ] SubTask 33.2: 跑 `node web/scripts/verify-all.js` 全套
  - [ ] SubTask 33.3: 修复任何因字面量动态化引入的回归
  - 验证：`verify-all` 全绿

- [ ] Task 34: 架构守卫
  - [ ] SubTask 34.1: 跑 `node scripts/lint-arch-all.js`，须 8/8 绿
  - [ ] SubTask 34.2: 新增 GM/P 直写需登记 owners 或走 mutator/ledger
  - [ ] SubTask 34.3: 新增 17 个文件加入 `arch-baselines/*.json`：
    - `tm-transmigration.js` / `tm-sovereign-ai.js`
    - `tm-player-interaction.js` / `tm-player-economy.js` / `tm-player-trade.js`
    - `tm-player-tech.js`（含 `tm-tech-routes-data.js`）/ `tm-player-family.js` / `tm-player-marriage.js` / `tm-player-private-army.js`
    - `tm-player-movement.js` / `tm-player-industry.js` / `tm-player-reclaim.js`
    - `tm-player-keju.js` / `tm-player-annual-review.js` / `tm-player-rebellion.js`
    - `tm-player-self-improvement.js` / `tm-player-special-roles.js`
  - 验证：lint 全绿

- [ ] Task 35: 文档与命名
  - [ ] SubTask 35.1: 在 `web/INDEX.md` 注册 17 个新文件
  - [ ] SubTask 35.2: 在 `web/ARCHITECTURE.md` 增补「穿越模式架构」一节，含 14+ 大玩家系统数据流图
  - [ ] SubTask 35.3: 跨朝代铁律审计：grep 明清专名（内阁/票拟/司礼监/东厂/八股等），确认未硬编入引擎层
  - [ ] SubTask 35.4: 科技路线默认数据跨朝代审计：默认 5 级科技链取中国古代通用脉络
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
- Task 18（科技，含固定路线数据）依赖 Task 15（招揽匠人）+ Task 16（研发投入）
- Task 19（家族子女）依赖 Task 15（联姻）+ Task 24（科举，子女出仕路径）
- Task 20（私军）依赖 Task 16（装备投入）
- Task 21（自由移动）依赖 Task 5
- Task 22（产业建设）依赖 Task 16（购地投入）+ Task 21（选址需先到地点）
- Task 23（开垦荒地）依赖 Task 16（开垦投入）+ Task 21（选址需先到地点）
- Task 24（玩家科举）依赖 Task 5
- Task 25（年终考核）依赖 Task 5
- Task 26（反叛）依赖 Task 15（笼络军权）+ Task 16（积累粮草）+ Task 20（私军主力）+ Task 6（皇帝 AI 平叛）
- Task 19B（婚姻礼制）依赖 Task 19（家族基础）+ Task 15（联姻人物互动）
- Task 26B（自我技能提升）依赖 Task 21（游学需自由移动）+ Task 15（拜师人物互动）
- Task 26C（特殊身份路线）依赖 Task 5（基础身份框架）+ Task 6（太监/宫女影响皇帝 AI）+ Task 19B（宫女晋升妃嫔）+ Task 26B（婴儿/布衣后续成长）+ Task 18（匠人关联科技）+ Task 22（匠人自办作坊）+ Task 26（盗贼自立为王关联反叛）
- Task 27 / Task 28 / Task 29 依赖 Task 5（并行）
- Task 30 依赖 Task 6 + Task 11
- Task 31 依赖 Task 30
- Task 32 依赖 Task 30 + Task 31 + Phase 4.5 全部（Task 15-26）
- Task 33 / Task 34 / Task 35 依赖 Task 32（并行）

# 并行机会

- Phase 3 内部：Task 7/8/9/10 可并行（皇帝 AI 四个动作面）
- Phase 4 内部：Task 11/12/13/14 可并行（按 playerRole 分支的面板）
- Phase 4.5 内部可并行批次：
  - 批次 A（无强依赖）：Task 15 / 16 / 21 / 24 / 25
  - 批次 B（依赖 A）：Task 17（依赖 16）/ 18（依赖 15+16）/ 20（依赖 16）/ 22（依赖 16+21）/ 23（依赖 16+21）/ 19（依赖 15+24）
  - 批次 C（依赖 B）：Task 26（依赖 15+16+20+6）
- Phase 5 内部：Task 27/28/29 可并行
- Phase 7 内部：Task 33/34/35 可并行
