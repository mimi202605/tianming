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

- [ ] 跑 `smoke-transmigration-e2e.js` 全过（端到端穿越模式）
- [ ] 跑 `verify-all.js` 全套绿（皇帝模式无回归）
- [ ] 跑 `lint-arch-all.js` 8/8 绿
- [ ] 新增 GM/P 直写已登记 owners 或走 mutator/ledger
- [ ] `tm-transmigration.js` / `tm-sovereign-ai.js` 加入 `arch-baselines/*.json`
- [ ] `web/INDEX.md` 注册新文件
- [ ] `web/ARCHITECTURE.md` 增补「穿越模式架构」一节

## 跨朝代铁律审计

- [ ] grep 引擎层（`tm-*.js`）无新增明清专名（内阁/票拟/司礼监/东厂/八股等）
- [ ] 角色官衔属剧本数据，可保留专名
- [ ] UI 固定文案朝代中立

## 命门护栏

- [ ] 皇帝 AI 行为硬核自洽，复用 LLM 决策管线护栏（schema 验证 / 变更白名单 / 阻力模型）
- [ ] 玩家角色行为产生与皇帝模式同等强度的 AI 回应（NPC 反应 / 势力变化 / 编年史）
- [ ] 不出现"AI 敷衍 / 前后矛盾 / 穿越出戏"的塌方表现
