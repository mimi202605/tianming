# 穿越·扮演非皇帝角色 Spec

## Why

天命当前默认玩家=皇帝（北极星第4条），但项目核心是「AI 驱动的历史平行宇宙生成器」，玩家身份不应被锁死在皇帝位。已有大量基础设施（`P.playerInfo.playerRole`、`GM.regentState`、`buildRegentSignal`、`_applyRegentDecisions`）支持非皇帝玩家，但 UI 文案、朝议/诏令入口、官制权限判定仍硬编码"皇帝=玩家"。

新增「穿越」模式：玩家在主界面入口选择扮演除皇帝以外的任何人物（朝中重臣/军中将领/一方诸侯/摄政权臣/商贾平民/后宫等），皇帝由 AI 全权接管（自动下旨、朝议、处理事务）。玩家在自己职位上发挥应有作用，UI 和功能随角色定位动态调整。这一模式直击命门——把"硬核 × 自由"的核心爽点从"皇帝视角"扩展到"任何角色视角"，每个角色都是一条新的平行宇宙故事线。

## What Changes

### 主界面入口
- 在 `index.html` 主界面（launch 页）新增「穿越」按钮，与「开卷/续卷/著卷/典章」并列
- 点击「穿越」进入角色选择流程：先选剧本 → 再从剧本角色列表中选一位非皇帝角色作为玩家化身
- 角色选择面板按 `playerRole` 分组展示（重臣/将领/诸侯/宗室/外戚/后宫/商贾/隐逸等），并显示该角色档案（姓名、官职、品级、势力、性格、家族、关系网）

### 玩家身份系统
- **BREAKING**：`P.playerInfo.playerRole` 默认值从 `emperor` 改为根据剧本开局判定——若选穿越模式则取所选角色的角色定位
- 新增 `P.playerInfo.transmigrationMode`（boolean）：标记是否为穿越模式存档
- 新增 `P.playerInfo.sovereignName`：当前皇帝名（穿越模式下与 `characterName` 解耦）
- 复用 `c.isPlayer` 作为玩家化身标识，但 `isPlayer=true` 的角色不再隐含 `isEmperor`
- 启动时校验：穿越模式下所选角色 `_offIsSovereign(c)` 必须返回 false，否则拒绝

### 皇帝 AI 自动化
- 新增 `TM.Sovereign.runAITurn(root)`：穿越模式下每回合为皇帝生成决策（下旨/朝议发言/批奏/任免）
- 复用现有派系 NPC LLM 决策管线（`tm-faction-npc-llm-decision.js`），但皇帝作为"超级 NPC"获得最高优先级和独立 prompt 模板
- 皇帝诏令复用 `EDICT_TYPES` 与 `classifyEdict`，落账到 `GM._edictTracker`（带 `source: 'sovereign-ai'` 标记）
- 皇帝朝议发言复用 `_cyInterjectRespond` 的反向：皇帝作为主动发言人触发朝议，而非玩家插言
- 皇帝批奏：奏疏系统（`tm-memorials.js`）新增 AI 自动批答路径，玩家臣子的奏疏会得到皇帝批答

### 玩家角色功能（按 playerRole 分支）
- **朝中重臣（minister）**：
  - 上奏（奏疏面板从"批奏"改为"上奏"）
  - 议政（朝议中发言需先请旨，不能"插言"）
  - 任免建议（不能直接任免，只能廷推/荐举）
  - 处理本职政务（如吏部尚书可拟官制变更建议、户部尚书可拟财政方案）
- **军中将领（general）**：
  - 军事指令（调兵/出征/筑城/补给）需上报请旨
  - 战场指挥全权（沿用 tm-battle-turn）
  - 可上军事奏报
- **一方诸侯（prince）**：
  - 治理封国/封地（独立财政/官制/军事，但需朝贡）
  - 可举兵勤王/叛乱/割据
  - 可上表请旨
- **摄政权臣（regent）**：
  - 复用现有 `regentState` 摄政机制
  - 可代行部分皇权（需标注"代诏"），但有合法性损耗
  - 君主成年后需还政
- **宗室/外戚/后宫**：
  - 后宫：复用 `tm-houguong.js`，玩家可影响皇帝决策（枕边风）
  - 宗室：可就藩/参政/谋夺嫡
  - 外戚：可借势揽权/拱卫皇权
- **商贾/隐逸（merchant/custom）**：
  - 经济活动（经商/购置田产/资助势力）
  - 可上书言事，但需通过臣子转呈
  - 可被征辟出仕

### UI 改造
- 顶栏：从"皇帝年号·尊号"改为"玩家头衔 · 当前皇帝（年号）"，如"兵部尚书 · 崇祯十五年"
- 诏令面板（`tm-game-ui-shell.js`）：
  - 皇帝模式：保留现有"天子御笔 · 奉天承运皇帝诏曰" + 5 类诏书 textarea
  - 穿越模式：替换为"上奏 · 臣某某谨奏" + 奏疏 textarea（1-3 篇）+ 角色相关动作按钮
- 朝议面板（`tm-chaoyi.js`）：
  - 皇帝模式：玩家插言入口
  - 穿越模式：玩家请旨发言入口（需皇帝 AI 准许）+ 旁听模式
- 官制面板（`tm-office-panel.js`）：
  - 皇帝模式：任免/调动全权
  - 穿越模式：仅可查看本职下属、提请廷推
- 右栏御案：根据 playerRole 动态显示可用动作集
- 起居注/编年：标注"皇帝 AI 自动决策"与"玩家行动"两类条目，便于穿越模式回看
- 退位/禅让系统（`tm-player-core.js:openAbdication`）：穿越模式下禁用，改为"辞职/告老/被贬/起复"等角色身份变更路径

### 命门护栏
- 穿越模式下皇帝 AI 行为必须保持"硬核、自洽、有时代质感"——复用现有 LLM 决策管线的所有护栏（schema 验证、变更白名单、阻力模型）
- 玩家角色行为必须产生与皇帝模式同等强度的 AI 回应（NPC 反应、势力变化、编年史）
- 任何 UI 文案改朝代中立（沿用 CLAUDE.md 跨朝代铁律）

## Impact

### 受影响的 specs
- 玩家身份与角色系统（首次正式启用 `P.playerInfo.playerRole` 多值分支）
- 朝议廷议系统（玩家从插言者变为请旨发言者，皇帝从被动变为主动）
- 诏令系统（玩家从下旨者变为上奏者，皇帝 AI 从无到有）
- 奏疏系统（玩家从批奏者变为上奏者，皇帝 AI 自动批答）
- 官制系统（权限判定按 playerRole 分支）
- 派系 NPC 决策（皇帝作为超级 NPC 接入）
- 主界面/启动流程（新增穿越入口）
- 顶栏/御案/右栏 UI（按 playerRole 动态渲染）

### 受影响的代码（关键文件）
- `web/index.html` — 主界面新增「穿越」按钮
- `web/tm-launch.js` — 新增穿越开局流程（选剧本→选角色→enterGame 时设 playerRole）
- `web/tm-player-core.js` — 玩家身份初始化按 playerRole 分支
- `web/tm-game-ui-shell.js` — 顶栏/诏令面板按 playerRole 分支
- `web/tm-chaoyi.js` / `tm-chaoyi-yuqian.js` / `tm-tinyi-v3*.js` — 朝议发言人字面量 `'皇帝'` 动态化
- `web/tm-edict-lifecycle.js` / `tm-edict-complete.js` — 诏令来源标记 + 皇帝 AI 下旨路径
- `web/tm-office-system.js` — `_offIsSovereign` / `canPerformAction` 按 playerRole 分支
- `web/tm-memorials.js` — 玩家上奏 + 皇帝 AI 批答
- `web/tm-faction-npc-llm-decision.js` — 新增皇帝 AI 决策 prompt 与 schema
- `web/tm-endturn-pipeline-steps.js` / `tm-endturn-prep.js` — 穿越模式下的回合流程编排
- `web/tm-endturn-prompt.js` — prompt 中 `'皇帝亲颁诏令'` 等字面量动态化
- `web/tm-influence-groups.js` — `buildRegentSignal` 等已有非皇帝基础设施复用
- 新增 `web/tm-transmigration.js` — 穿越模式核心模块（角色选择/皇帝 AI/玩家动作集）
- 新增 `web/tm-sovereign-ai.js` — 皇帝 AI 决策引擎

## ADDED Requirements

### Requirement: 主界面穿越入口

系统 SHALL 在主界面（`web/index.html` 的 `#launch` 区）新增「穿越」按钮，与现有「开卷/续卷/著卷/典章」并列，按钮文案朝代中立（不写死"朕/御极/临朝"等皇帝专属词）。

#### Scenario: 用户点击穿越
- **WHEN** 用户在主界面点击「穿越」按钮
- **THEN** 进入剧本选择界面（复用现有 `showScnSelect`）
- **AND** 选定剧本后进入「角色选择」界面，展示该剧本所有非皇帝角色，按 playerRole 分组

#### Scenario: 角色选择面板展示
- **WHEN** 用户进入角色选择面板
- **THEN** 每个角色条目展示：姓名、字/号、官职、品级、势力、性格摘要、家族层级
- **AND** 皇帝角色（`_offIsSovereign(c) === true`）不出现在列表中或被显式禁用并标注"君主不可选"
- **AND** 提供"角色档案详情"展开入口（显示完整 SCHEMA 字段）

#### Scenario: 取消穿越回到主界面
- **WHEN** 用户在角色选择面板点击返回
- **THEN** 回到主界面，不进入游戏

### Requirement: 穿越模式存档标记

系统 SHALL 在存档元数据中标记 `P.playerInfo.transmigrationMode`，并持久化所选角色 ID 与 `playerRole`。

#### Scenario: 穿越模式存档读档
- **WHEN** 玩家在穿越模式下存档，再读档
- **THEN** `transmigrationMode === true` 被恢复
- **AND** `P.playerInfo.characterName` / `playerRole` / `sovereignName` 全部恢复
- **AND** `c.isPlayer` 正确指向所选角色

#### Scenario: 普通存档不受影响
- **WHEN** 读取传统皇帝模式存档（无 transmigrationMode 字段）
- **THEN** 默认补 `transmigrationMode: false`
- **AND** 行为与改造前完全一致（向后兼容）

### Requirement: 皇帝 AI 自动决策

系统 SHALL 在穿越模式下每回合为皇帝生成 AI 决策，覆盖下旨、朝议发言、批奏、任免四个动作面。

#### Scenario: 皇帝 AI 下旨
- **WHEN** 进入穿越模式的回合结算
- **THEN** 皇帝 AI 根据当前世界状态（国库/民心/边警/吏治/派系等）生成 0-3 道诏令
- **AND** 诏令类型限定在 `EDICT_TYPES` 范围内
- **AND** 诏令落账到 `GM._edictTracker`，标记 `source: 'sovereign-ai'`
- **AND** 诏令经 `estimateResistance` 与 `applyEdictTypedIncidence` 走完整阻力与执行流程

#### Scenario: 皇帝 AI 朝议发言
- **WHEN** 穿越模式下朝议开启
- **THEN** 皇帝作为主动发言人触发朝议议题（而非玩家插言）
- **AND** 皇帝发言经 LLM 生成，符合其性格与时代质感
- **AND** 玩家臣子可请旨发言（非打断式插言）

#### Scenario: 皇帝 AI 批奏
- **WHEN** 玩家臣子上奏或 NPC 上奏
- **THEN** 皇帝 AI 生成批答（准/驳/留中/下议/交部）
- **AND** 批答结果影响奏疏状态与 NPC 忠诚度
- **AND** 玩家上奏的批答以"奉旨"形式反馈给玩家

#### Scenario: 皇帝 AI 任免
- **WHEN** 皇帝 AI 判断需要任免（如廷推结果、罢免罪臣、赏功臣）
- **THEN** 经 `_offAppointPerson` / `_offDismissPerson` 走标准任职树变更
- **AND** 变更经 `tm-ai-change-applier.js` 路径白名单校验
- **AND** 玩家本人可能被任免（升迁/贬谪/罢黜），玩家收到通知

### Requirement: 玩家角色动作集

系统 SHALL 根据 `P.playerInfo.playerRole` 为玩家提供角色定位匹配的动作集，禁用与角色身份不符的动作。

#### Scenario: 朝中重臣上奏
- **WHEN** 玩家 playerRole === 'minister' 进入诏令面板
- **THEN** 面板标题改为"上奏"（非"天子御笔"）
- **AND** 提供 1-3 篇奏疏 textarea
- **AND** 提供"廷推荐举""本职政务"等角色相关动作按钮
- **AND** 不出现"诏令颁行"按钮

#### Scenario: 军中将领请旨出征
- **WHEN** 玩家 playerRole === 'general' 进入军事面板
- **THEN** 调兵/出征按钮改为"请旨出征"
- **AND** 上奏后由皇帝 AI 决定是否准允
- **AND** 准允后玩家在战场拥有完整指挥权（沿用 tm-battle-turn）

#### Scenario: 一方诸侯治理封国
- **WHEN** 玩家 playerRole === 'prince'
- **THEN** 御案显示封国面板（财政/官制/军事，限定于封国范围）
- **AND** 提供"朝贡""举兵""上表"等动作
- **AND** 朝贡不及时会触发朝廷问罪

#### Scenario: 摄政权臣代行皇权
- **WHEN** 玩家 playerRole === 'regent'
- **THEN** 复用现有 `GM.regentState` 摄政机制
- **AND** 玩家可代行部分皇权（如代拟诏令），但诏令标记"代诏"
- **AND** 代诏行为有合法性损耗（影响 `皇威` 或派生合法性指标）
- **AND** 君主成年后系统提示还政，玩家可选择还政或拒还（拒还会触发"权臣架空"危机）

#### Scenario: 后宫玩家影响皇帝
- **WHEN** 玩家 playerRole 属于后宫定位
- **THEN** 御案显示后宫面板（复用 tm-houguong）
- **AND** 玩家可通过"枕边风"机制影响皇帝 AI 决策（增加皇帝 AI prompt 中的"宠爱妃嫔建议"权重）
- **AND** 影响力受位分/宠爱限制

### Requirement: UI 文案朝代中立化

系统 SHALL 将穿越模式涉及的所有 UI 文案改为朝代中立（沿用 CLAUDE.md 跨朝代铁律），不硬编明清专名。

#### Scenario: 朝议发言人动态化
- **WHEN** 朝议渲染气泡或写入起居注
- **THEN** 皇帝发言使用 `P.playerInfo.sovereignName`（穿越模式）或 `P.playerInfo.characterName`（皇帝模式）
- **AND** 不再硬编码 `'皇帝'` 字面量

#### Scenario: 诏令抬头动态化
- **WHEN** 诏令面板渲染
- **THEN** 皇帝模式显示"奉天承运皇帝诏曰"（或剧本配置的朝代特定抬头）
- **AND** 穿越模式下奏疏面板显示朝代中立的"臣某某谨奏"

#### Scenario: 顶栏身份展示
- **WHEN** 顶栏渲染玩家身份
- **THEN** 皇帝模式：显示"年号 · 尊号"（如"崇祯十五年 · 明思宗"）
- **AND** 穿越模式：显示"玩家官职 · 当前皇帝年号"（如"兵部尚书 · 崇祯十五年"）

## MODIFIED Requirements

### Requirement: 玩家身份初始化

原逻辑（`tm-launch.js:945, 950-956`）：剧本加载后强制把首位或匹配 `scn.role` 的角色设为 `isPlayer=true`，默认按皇帝处理。

修改后：
- 皇帝模式（开卷）：保留现有逻辑
- 穿越模式：玩家选定角色后，将该角色 `isPlayer=true`，并根据该角色的 `role`/`officialTitle`/`royalRelation` 推导 `P.playerInfo.playerRole`；同时确保剧本中的皇帝角色保持 `_offIsSovereign===true` 且 `isPlayer===false`，写入 `P.playerInfo.sovereignName`

### Requirement: 官制权限判定

原逻辑（`tm-office-system.js:930-963 canPerformAction`）：硬编码 `role==='皇帝'` 即放行所有动作。

修改后：
- 新增 `playerRole` 参数，按角色定位分支：
  - emperor: 全权
  - regent: 部分皇权（任免三品以下、代诏）
  - minister: 仅可任免本职下属、廷推荐举
  - general: 仅可任免本部军官
  - prince: 仅可任免封国官属
  - 后宫/商贾/隐逸: 无任免权
- 调用方（`tm-office-panel.js` 等）传入 `playerRole`，UI 按权限显隐按钮

### Requirement: 朝议入口

原逻辑（`tm-chaoyi.js:20 openChaoyi`）：玩家直接开启朝议并插言。

修改后：
- 皇帝模式：保留现有"插言"路径
- 穿越模式：
  - 玩家不能主动开朝议（朝议由皇帝 AI 或派系触发）
  - 玩家在朝议中"请旨发言"——通过按钮申请，皇帝 AI 决定准否
  - 玩家旁听时显示朝议气泡但不能插言

### Requirement: 回合结束确认

原逻辑（`tm-office-panel.js:1600 confirmEndTurn`）：玩家点"诏令颁行"结束回合。

修改后：
- 皇帝模式：保留"诏令颁行"路径
- 穿越模式：改为"上奏呈递"或"本回合动作完成"，结算时同时执行皇帝 AI 决策与玩家上奏处理

## REMOVED Requirements

### Requirement: 退位/禅让系统在穿越模式下的使用

**Reason**: 穿越模式下玩家不是皇帝，无权禅让。
**Migration**: `tm-player-core.js:openAbdication` 在穿越模式下隐藏入口；改为角色定位匹配的身份变更路径（辞职/告老/被贬/起复/袭爵等）。
