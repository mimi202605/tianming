# 穿越·扮演非皇帝角色 Spec

## Why

天命当前默认玩家=皇帝（北极星第4条），但项目核心是「AI 驱动的历史平行宇宙生成器」，玩家身份不应被锁死在皇帝位。已有大量基础设施（`P.playerInfo.playerRole`、`GM.regentState`、`buildRegentSignal`、`_applyRegentDecisions`）支持非皇帝玩家，但 UI 文案、朝议/诏令入口、官制权限判定仍硬编码"皇帝=玩家"。

新增「穿越」模式：玩家在主界面入口选择扮演除皇帝以外的任何人物（朝中重臣/军中将领/一方诸侯/摄政权臣/商贾平民/后宫等），皇帝由 AI 全权接管（自动下旨、朝议、处理事务）。玩家在自己职位上发挥应有作用，UI 和功能随角色定位动态调整。同时配套七大玩家专属系统——人物互动、赚钱私产、跑商、科技研发、参加科举、官员年终考核、反叛——让玩家在自己职位上"有事可做、有成长感、有戏剧性"。这一模式直击命门——把"硬核 × 自由"的核心爽点从"皇帝视角"扩展到"任何角色视角"，每个角色都是一条新的平行宇宙故事线，反叛成功还可翻转回皇帝视角。

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

### 玩家专属系统（穿越模式新增）

> 以下系统是穿越模式的核心爽点，让玩家在自己职位上"有事可做、有成长感、有戏剧性"。复用现有引擎底层（角色经济/科举/编年/派系），新增玩家主观视角的参与入口。

- **人物互动系统**：
  - 玩家可与任意 NPC 进行一对一互动：拜访、密谈、请托、结交、馈赠、联姻、寻仇、陷害、笼络、收为门客
  - 每次互动消耗玩家精力/时间，影响 NPC 对玩家的关系值（5 维：师徒/亲友/政敌/同僚/仇敌）
  - 互动结果由 LLM 根据双方性格、关系、利益、当前局势生成（复用 `tm-wendui.js` 一对一对话语料管线）
  - 关键互动写入玩家记忆系统（沿用 `tm-memory-*.js`），形成长期关系弧线
  - 互动可触发"事件钩子"：如笼络禁军将领到一定程度可发动政变、与后宫结盟可影响皇帝继承人

- **赚钱系统**：
  - 玩家个人私产管理（复用 `tm-char-economy-engine.js` 的 14 类角色俸禄/私产/名望）
  - 多元收入源：官俸、赏赐、田租、商税分成、灰色收入（贪墨/受贿/索贿）、经营性收入（自营产业）、收藏性资产（古董/字画/珠宝）
  - 投资渠道：购置田产、置办产业（酒楼/当铺/作坊）、放贷收息、囤货居奇
  - 风险机制：贪墨触发吏治腐败引擎（沿用 `tm-corruption-engine.js`）的"被弹劾"风险；放贷过度触发民怨；囤货触发市舶司调查
  - 与派系勾连：资助某派系换取政治支持，或被派系勒索保护费
  - 玩家个人银钱账本（独立于国库），可被抄家清算（沿用 `tm-char-economy-ui.js` 的抄家路径）

- **跑商系统**：
  - 玩家可派遣商队（或亲自带队）跨区域贸易：买入低价商品→运输到高价区卖出
  - 复用 `tm-economy-engine.js` 的区域商品价格矩阵与市场动态
  - 路线风险：山贼劫掠（沿用 `tm-coastal-raid.js` 模式）、官府盘剥、气候灾害、地方势力索要过路费
  - 商队组建：雇佣护卫（消耗银钱）、购置车马、办理通关文牒（需朝廷许可，可与官场关系挂钩）
  - 大宗贸易可影响区域经济指标（复用 `tm-region-magnate.js`）
  - 跑商可积累商誉，开启新的商业网络与 NPC 关系
  - 跨朝代通用：丝路/茶马/漕运/海贸等都是剧本数据 hook，引擎只提供"商队+路线+风险+利润"通用框架

- **科技系统**：
  - 玩家可主导科技研发（不论 playerRole）：农业/水利/军事/工艺/医药/天文/算学/文学等领域
  - 玩家出资/出人/出时间投入研发，研发成功解锁对应增益（农业增产、军事强军、工艺增收、医药减疫）
  - 研发进度受玩家学识（`learning` 字段）+ 投入资源 + 现有科技基础 + 时代限制影响
  - 玩家可招揽匠人/学者加速研发（关联人物互动系统）
  - 研发成果可上奏朝廷推广（影响全国），或私藏自用（仅个人/封国受益）
  - 复用 `tm-dynamic-systems.js` 提供科技树通用框架（不硬编具体科技，科技列表归剧本数据）
  - 跨朝代铁律：引擎只提供"研发投入→进度→解锁增益"通用管线，不预置朝代特定科技

- **参加科举考试**：
  - 玩家若 playerRole 为商贾/隐逸/宗室旁支/低级官吏子弟，可选择走科举入仕路径
  - 玩家作为考生参与科举全流程：县试→府试→院试（秀才）→乡试（举人）→会试（贡士）→殿试（进士）
  - 复用 `tm-keju-*.js` 全套（37 文件 ~26k 行），玩家以考生身份接入
  - 考试内容：经义/策论/诗赋（剧本数据决定具体题型），玩家作答后由 LLM 评卷（沿用 `tm-keju-question-ui.js`）
  - 玩家可拜师求学（关联人物互动）、入书院深造（沿用 `tm-keju-school-network.js`）
  - 玩家考中后获官职（影响 `playerRole` 升级为 minister），未中可继续苦读或捐官
  - 玩家可主动卷入科场弊案（关联 `tm-keju-scandal.js`）：行贿考官、请托关节、枪替冒名——风险与收益并存

- **官员年终考核**：
  - 玩家若 playerRole 为 minister/general 等官员身份，每年末参加考核
  - 复用现有官制系统的"考课"机制（如有），新增玩家视角的考核指标：履职情况、政务成绩、廉洁度、人际关系、上级评价、民众口碑
  - 考核结果分九等（上上/上中/上下/中上/中中/中下/下上/下中/下下）
  - 考核影响：升迁（升级 playerRole 或品级）、贬谪、加俸、罚俸、赐物、记过、罢黜
  - 玩家可主动运作考核（关联人物互动）：贿赂考官、托人情、提前布局政绩
  - 考核结果由 LLM 综合 1 年玩家行为生成评语，写入编年史

- **反叛系统**：
  - 玩家若 playerRole 为 prince/regent/general/minister 均可发动反叛
  - 反叛前置：笼络军权（禁军/边军）、积累粮草、联络内外势力、制造舆论（童谣/谶纬）
  - 反叛类型：
    - 宗室夺嫡：趁君主病重/幼年发动政变
    - 藩王起兵：以"清君侧"名义举兵
    - 权臣篡位：废君自立（沿用 `tm-feudal.js` 的篡位机制）
    - 边将叛乱：拥兵自立割据一方
    - 农民起义（merchant/custom 角色可达）：聚众举事（沿用 `tm-class-radical-revolt.js`）
  - 反叛流程：筹备→举事→交战（沿用 `tm-battle-*.js`）→成败→后续（自立/被诛/逃亡/招安）
  - 反叛失败后果：抄家灭族、家属流放、声名扫地（写入编年史永久污点）
  - 反叛成功后果：玩家成为新君主（`playerRole` 转为 emperor，模式从穿越切回皇帝模式）

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
- 角色经济系统（玩家个人银钱账本独立于国库）
- 跑商贸易系统（玩家商队跨区域贸易）
- 科技研发系统（玩家主导研发，引擎层通用管线）
- 科举系统（玩家以考生身份接入，复用 37 文件 ~26k 行）
- 官员考核系统（玩家官员身份年末考核）
- 反叛系统（玩家可反叛成功转皇帝模式）
- 人物互动系统（玩家与 NPC 一对一互动，关联记忆/事件钩子）
- 编年史（新增玩家行动、皇帝 AI 决策、反叛成败等条目来源标记）

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
- `web/tm-char-economy-engine.js` / `tm-char-economy-ui.js` — 玩家个人银钱账本 + 抄家路径
- `web/tm-economy-engine.js` — 区域价格矩阵供跑商复用
- `web/tm-region-magnate.js` — 大宗贸易影响区域经济
- `web/tm-coastal-raid.js` — 跑商路线风险模式参考
- `web/tm-dynamic-systems.js` — 科技树通用框架
- `web/tm-keju-runtime.js` / `tm-keju-question-ui.js` / `tm-keju-allocation.js` / `tm-keju-school-network.js` / `tm-keju-scandal.js` — 玩家科举接入
- `web/tm-corruption-engine.js` — 玩家贪墨触发吏治风险
- `web/tm-feudal.js` — 反叛/篡位机制
- `web/tm-class-radical-revolt.js` — 玩家农民起义
- `web/tm-battle-turn.js` / `tm-battle-adapter.js` / `tm-battle-resolve.js` — 反叛交战
- `web/tm-wendui.js` — 玩家一对一互动语料管线
- `web/tm-memory-*.js` — 玩家互动/反叛筹备记忆
- `web/tm-chronicle-system.js` — 玩家行动/考核/反叛写入编年史
- `web/tm-relations.js` — 玩家与 NPC 5 维关系值更新
- `web/tm-houguong.js` — 后宫玩家路径
- 新增 `web/tm-transmigration.js` — 穿越模式核心模块（角色选择/玩家身份/穿越模式切换）
- 新增 `web/tm-sovereign-ai.js` — 皇帝 AI 决策引擎
- 新增 `web/tm-player-interaction.js` — 玩家人物互动系统
- 新增 `web/tm-player-economy.js` — 玩家赚钱/私产/抄家系统
- 新增 `web/tm-player-trade.js` — 玩家跑商系统
- 新增 `web/tm-player-tech.js` — 玩家科技研发系统
- 新增 `web/tm-player-keju.js` — 玩家科举接入层
- 新增 `web/tm-player-annual-review.js` — 玩家官员年终考核
- 新增 `web/tm-player-rebellion.js` — 玩家反叛系统

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

### Requirement: 玩家人物互动系统

系统 SHALL 在穿越模式下提供玩家与任意 NPC 一对一互动入口，互动消耗精力/时间并影响关系值，结果由 LLM 生成。

#### Scenario: 玩家拜访 NPC
- **WHEN** 玩家在御案选择"拜访"动作并选定 NPC
- **THEN** 玩家精力 -1（沿用 `_spendEnergy`），时间推进对应时长
- **AND** 调用 LLM 生成互动场景描述（基于双方性格、关系、当前局势）
- **AND** NPC 对玩家的关系值（5 维：师徒/亲友/政敌/同僚/仇敌）按结果更新
- **AND** 关键互动写入玩家记忆系统

#### Scenario: 互动触发事件钩子
- **WHEN** 玩家与禁军将领关系达到"死党"级别，玩家选择"密谋"
- **THEN** 系统提示可发动政变（关联反叛系统）
- **AND** 触发后续事件链

#### Scenario: 联姻
- **WHEN** 玩家选择"联姻"并与目标 NPC 协商成功
- **THEN** 双方家族建立姻亲关系（写入 `family` 字段）
- **AND** 影响 NPC 对玩家势力的态度

### Requirement: 玩家赚钱与私产系统

系统 SHALL 在穿越模式下提供玩家个人银钱账本与多元收入源，灰色收入触发吏治腐败风险。

#### Scenario: 玩家领取官俸
- **WHEN** 每月初玩家自动领取官俸（按品级，沿用 `tm-char-economy-engine.js`）
- **THEN** 玩家个人银钱账本 +对应俸禄
- **AND** 御案显示银钱变动通知

#### Scenario: 玩家贪墨受贿
- **WHEN** 玩家选择"贪墨"或"受贿"动作
- **THEN** 玩家银钱 +对应金额
- **AND** 玩家角色 `corruption` 字段累计
- **AND** 吏治腐败引擎（`tm-corruption-engine.js`）增加"被弹劾风险"，玩家可能被言官弹劾

#### Scenario: 玩家投资产业
- **WHEN** 玩家选择"购置产业"并选择产业类型（酒楼/当铺/作坊）
- **THEN** 玩家银钱 -投资额
- **AND** 每月获得经营性收入（按产业类型 + 经营状况）
- **AND** 产业被记入玩家私产清单

#### Scenario: 玩家被抄家
- **WHEN** 玩家被罢黜/反叛失败/重大贪腐被查
- **THEN** 沿用 `tm-char-economy-ui.js` 抄家路径，玩家私产全部充公
- **AND** 玩家银钱归零（或仅留基本生活费）

### Requirement: 玩家跑商系统

系统 SHALL 在穿越模式下提供商队组建与跨区域贸易入口，路线风险由山贼/官府/灾害/势力构成。

#### Scenario: 玩家组建商队
- **WHEN** 玩家选择"组建商队"并配置护卫/车马/通关文牒
- **THEN** 玩家银钱 -组建成本
- **AND** 商队状态记入玩家私产
- **AND** 通关文牒需朝廷许可，许可难度关联玩家官场关系

#### Scenario: 商队跨区贸易
- **WHEN** 玩家派遣商队从 A 区到 B 区贸易
- **THEN** 系统根据 `tm-economy-engine.js` 区域价格矩阵计算预期利润
- **AND** 路线风险事件触发（山贼劫掠/官府盘剥/气候灾害/势力索要过路费）
- **AND** 商队到达后结算实际盈亏

#### Scenario: 大宗贸易影响区域经济
- **WHEN** 商队贸易量超过阈值
- **THEN** 调用 `tm-region-magnate.js` 影响区域经济指标
- **AND** 区域商品价格动态调整

#### Scenario: 跨朝代通用贸易路线
- **WHEN** 剧本配置特定贸易路线（如丝路/茶马/漕运/海贸）
- **THEN** 引擎读取剧本 hook 数据，按"商队+路线+风险+利润"通用框架执行
- **AND** 引擎不预置朝代特定路线

### Requirement: 玩家科技研发系统

系统 SHALL 在穿越模式下提供科技研发入口，玩家投入资源推动研发进度，成果可上奏推广或私藏自用。

#### Scenario: 玩家启动研发
- **WHEN** 玩家选择"研发"并选定领域（农业/水利/军事/工艺/医药等）
- **THEN** 玩家银钱 -研发投入
- **AND** 研发进度按 `玩家学识 + 投入资源 + 现有科技基础 + 时代限制` 计算
- **AND** 进度记入玩家科技账本

#### Scenario: 招揽匠人加速研发
- **WHEN** 玩家通过人物互动招揽到匠人/学者
- **THEN** 研发进度加速（按匠人能力加成）
- **AND** 匠人加入玩家门客清单

#### Scenario: 研发成果上奏推广
- **WHEN** 玩家研发完成并选择"上奏推广"
- **THEN** 上奏到皇帝 AI，皇帝 AI 决定是否采纳
- **AND** 采纳后全国获得对应增益（农业增产/军事强军等）

#### Scenario: 私藏自用
- **WHEN** 玩家研发完成并选择"私藏自用"
- **THEN** 增益仅作用于玩家本人/封国
- **AND** 不影响全国指标

#### Scenario: 跨朝代铁律
- **WHEN** 引擎层处理科技研发
- **THEN** 引擎只提供"研发投入→进度→解锁增益"通用管线
- **AND** 具体科技列表归剧本数据（不硬编朝代特定科技）

### Requirement: 玩家参加科举考试

系统 SHALL 在穿越模式下允许玩家以考生身份参与科举全流程，考中后变更 playerRole。

#### Scenario: 玩家报名县试
- **WHEN** 玩家 playerRole 为商贾/隐逸/宗室旁支等且选择"应试"
- **THEN** 玩家进入科举流程（沿用 `tm-keju-runtime.js`）
- **AND** 玩家状态标记为"考生"

#### Scenario: 玩家作答考题
- **WHEN** 玩家进入考场
- **THEN** 题目由剧本数据决定（经义/策论/诗赋）
- **AND** 玩家通过 `tm-keju-question-ui.js` 作答
- **AND** LLM 评卷生成成绩

#### Scenario: 玩家考中进士
- **WHEN** 玩家通过殿试
- **THEN** 玩家身份变更为进士
- **AND** `playerRole` 升级为 `minister`
- **AND** 系统自动授予官职（沿用 `tm-keju-allocation.js`）

#### Scenario: 玩家卷入科场弊案
- **WHEN** 玩家选择"行贿考官"或"请托关节"
- **THEN** 沿用 `tm-keju-scandal.js` 弊案引擎
- **AND** 玩家可能被检举，触发查办/罢黜后果

### Requirement: 玩家官员年终考核

系统 SHALL 在穿越模式下每年末为玩家官员身份生成考核结果，影响升迁/贬谪/加俸/罢黜。

#### Scenario: 年末触发考核
- **WHEN** 每年末（沿用游戏内时间机制）玩家 playerRole 为 minister/general 等
- **THEN** 系统综合玩家 1 年行为生成考核指标：履职情况、政务成绩、廉洁度、人际关系、上级评价、民众口碑
- **AND** LLM 生成考核评语

#### Scenario: 考核结果分九等
- **WHEN** 考核完成
- **THEN** 结果分九等（上上/上中/上下/中上/中中/中下/下上/下中/下下）
- **AND** 按等级触发对应后果：升迁、贬谪、加俸、罚俸、赐物、记过、罢黜

#### Scenario: 玩家主动运作考核
- **WHEN** 玩家在考核前选择"贿赂考官"或"托人情"
- **THEN** 关联人物互动系统
- **AND** 考核指标向上偏移但有被发现风险

#### Scenario: 考核写入编年史
- **WHEN** 考核结束
- **THEN** 考核结果与评语写入编年史
- **AND** 玩家御案显示考核通知

### Requirement: 玩家反叛系统

系统 SHALL 在穿越模式下允许符合身份的玩家发动反叛，反叛成功可转为皇帝模式。

#### Scenario: 反叛前置筹备
- **WHEN** 玩家选择"密谋反叛"
- **THEN** 进入筹备阶段：笼络军权、积累粮草、联络势力、制造舆论
- **AND** 每项筹备消耗时间/银钱/精力
- **AND** 筹备进度可视化（御案显示筹备度）

#### Scenario: 发动反叛
- **WHEN** 玩家筹备度达到阈值，选择"举事"
- **THEN** 反叛类型按 playerRole 分支（宗室夺嫡/藩王起兵/权臣篡位/边将叛乱/农民起义）
- **AND** 触发交战（沿用 `tm-battle-*.js`）
- **AND** 朝廷（皇帝 AI）发动平叛

#### Scenario: 反叛失败
- **WHEN** 玩家反叛军被击败
- **THEN** 玩家被诛（游戏结束）或逃亡（角色变成通缉犯）
- **AND** 家属流放，私产抄没
- **AND** 编年史写入永久污点

#### Scenario: 反叛成功转皇帝模式
- **WHEN** 玩家反叛军攻破京城或废君自立
- **THEN** `P.playerInfo.playerRole` 转为 `emperor`
- **AND** `P.playerInfo.transmigrationMode` 转为 `false`
- **AND** 模式切回皇帝模式（沿用现有皇帝玩法）
- **AND** 编年史写入"新朝建立"事件

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
