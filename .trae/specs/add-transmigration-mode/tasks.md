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

## Phase 5 · UI 文案与身份展示动态化

- [ ] Task 15: 顶栏身份展示按 playerRole 分支
  - [ ] SubTask 15.1: 在 `tm-game-ui-shell.js` 顶栏渲染处读 `P.playerInfo.playerRole`
  - [ ] SubTask 15.2: 皇帝模式：显示"年号 · 尊号"（如"崇祯十五年 · 明思宗"）
  - [ ] SubTask 15.3: 穿越模式：显示"玩家官职 · 当前皇帝年号"（如"兵部尚书 · 崇祯十五年"）
  - 验证：浏览器实查两种模式渲染

- [ ] Task 16: 字面量 `'皇帝'` 全面动态化
  - [ ] SubTask 16.1: 在 `tm-chaoyi.js` line 35/141/186/189 替换为读 `P.playerInfo.sovereignName || '皇帝'`
  - [ ] SubTask 16.2: 在 `tm-chaoyi-yuqian.js` line 215/493/658 同样替换
  - [ ] SubTask 16.3: 在 `tm-tinyi-v3.js` line 219/2629 与 `tm-tinyi-v3-edict-personnel.js` line 152/449 同样替换
  - [ ] SubTask 16.4: 在 `tm-endturn-prompt.js` line 568 `'本回合皇帝亲颁诏令原文'` 改为读 `P.playerInfo` 动态拼接
  - [ ] SubTask 16.5: 在 `tm-edict-oversight.js` line 89 `'代陛下核查诏令'` 同样动态化
  - 验证：grep `'皇帝'` 字面量，确认穿越模式下所有用户可见处已动态化（保留 schema 数据中的 `'皇帝'` 不动）

- [ ] Task 17: 退位/禅让系统穿越模式禁用
  - [ ] SubTask 17.1: 在 `tm-player-core.js:68 openAbdication` 入口判定 `transmigrationMode`，true 时隐藏入口并提示"穿越模式下不可禅让"
  - [ ] SubTask 17.2: 改为角色定位匹配的身份变更路径：minister→"辞职/告老"，prince→"袭爵/夺嫡"，general→"卸甲/起复"等
  - [ ] SubTask 17.3: 调用 `TM.Transmigration.triggerRoleChange(kind, payload)` 触发身份变更
  - 验证：跑 `node web/scripts/smoke-transmigration-role-change.js`（新增 smoke）

## Phase 6 · 回合流程编排

- [ ] Task 18: 穿越模式回合流程接入
  - [ ] SubTask 18.1: 在 `tm-endturn-pipeline-steps.js` 新增 `_endturnStep_sovereignAI(root, ctx)` 步骤
  - [ ] SubTask 18.2: 步骤位置：玩家上奏收集之后、派系 NPC 决策之前
  - [ ] SubTask 18.3: 调用 `TM.SovereignAI.runTurn(root, ctx)`，将其输出转化为回合变更
  - [ ] SubTask 18.4: 在 `tm-endturn-prep.js:341 _endTurn_collectInput` 按 playerRole 分支收集（诏令 vs 上奏）
  - [ ] SubTask 18.5: `confirmEndTurn`（tm-office-panel.js:1600）按 playerRole 切换文案：皇帝模式"诏令颁行"，穿越模式"上奏呈递"
  - 验证：跑 `node web/scripts/smoke-transmigration-endturn.js`（新增 smoke）

- [ ] Task 19: 起居注/编年标注决策来源
  - [ ] SubTask 19.1: 在 `tm-shiji-qiju-ui.js` 渲染条目时读 `entry.source` 字段（'player' / 'sovereign-ai' / 'npc'）
  - [ ] SubTask 19.2: 不同来源用不同图标/颜色标识，便于玩家回看
  - [ ] SubTask 19.3: 编年史（`tm-chronicle-system.js`）月稿自动区分"君主自动决策"与"玩家行动"两段
  - 验证：跑 `node web/scripts/smoke-transmigration-chronicle.js`（新增 smoke）

## Phase 7 · 集成与回归

- [ ] Task 20: 端到端穿越模式 smoke
  - [ ] SubTask 20.1: 新增 `web/scripts/smoke-transmigration-e2e.js`：从主界面点穿越→选剧本→选角色→进入游戏→结束回合→皇帝 AI 决策→玩家上奏批答→起居注回看
  - [ ] SubTask 20.2: 断言：`P.playerInfo.transmigrationMode === true`，皇帝 AI 至少生成 1 个决策，玩家上奏得到批答
  - 验证：`node web/scripts/smoke-transmigration-e2e.js` 全过

- [ ] Task 21: 皇帝模式回归
  - [ ] SubTask 21.1: 跑 `node web/scripts/smoke-chaoyi-v3.js` / `smoke-edict-typed-incidence.js` / `smoke-office-dup-seat-heal.js` 等已有 smoke
  - [ ] SubTask 21.2: 跑 `node web/scripts/verify-all.js` 全套
  - [ ] SubTask 21.3: 修复任何因字面量动态化引入的回归
  - 验证：`verify-all` 全绿

- [ ] Task 22: 架构守卫
  - [ ] SubTask 22.1: 跑 `node scripts/lint-arch-all.js`，须 8/8 绿
  - [ ] SubTask 22.2: 新增 GM/P 直写需登记 owners 或走 mutator/ledger
  - [ ] SubTask 22.3: `tm-transmigration.js` / `tm-sovereign-ai.js` 加入 `arch-baselines/*.json`
  - 验证：lint 全绿

- [ ] Task 23: 文档与命名
  - [ ] SubTask 23.1: 在 `web/INDEX.md` 注册 `tm-transmigration.js` / `tm-sovereign-ai.js`
  - [ ] SubTask 23.2: 在 `web/ARCHITECTURE.md` 增补「穿越模式架构」一节
  - [ ] SubTask 23.3: 跨朝代铁律审计：grep 明清专名，确认未硬编入引擎层
  - 验证：grep 检查 + 文档完整性

# Task Dependencies

- Task 2 依赖 Task 1（数据结构需要核心模块）
- Task 3 / Task 4 依赖 Task 1 / Task 2
- Task 5 依赖 Task 4
- Task 6 独立（皇帝 AI 引擎）
- Task 7 / Task 8 / Task 9 / Task 10 依赖 Task 6（并行）
- Task 11 / Task 12 / Task 13 / Task 14 依赖 Task 5（并行）
- Task 15 / Task 16 / Task 17 依赖 Task 5（并行）
- Task 18 依赖 Task 6 + Task 11
- Task 19 依赖 Task 18
- Task 20 依赖 Task 18 + Task 19
- Task 21 / Task 22 / Task 23 依赖 Task 20（并行）

# 并行机会

- Phase 3 内部：Task 7/8/9/10 可并行（皇帝 AI 四个动作面）
- Phase 4 内部：Task 11/12/13/14 可并行（按 playerRole 分支的面板）
- Phase 5 内部：Task 15/16/17 可并行
- Phase 7 内部：Task 21/22/23 可并行
