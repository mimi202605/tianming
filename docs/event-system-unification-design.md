# 天命 · 事件系统统一范式 · 详细设计（v0.1 草案）

> 状态：草案 → **方向已定稿（owner 已拍板 4 抉择）**。2026-06-20 起。
> 决定（owner 已拍板）：**A 骨架** = 危机引擎闭环为骨 + 借 StoryEventBus 数据结构/队列/序列化；**B 后果** = AI 裁定为主 + 固定后果（effectKey/impact）兜底；**C 呈现** = 寄生既有通道（诏令/奏疏/廷议）为主 + 关键史实节点强弹窗；**D 节奏** = 渐进收编（开关默认关·每刀一套·可独立验证·可回退）。
> 命门对齐：事件本该是「AI 在玩家自由下给硬核可信回应」**最该发光的地方**——一个活世界不断抛出有质感的局面，玩家自由应对，AI 裁定硬核连锁后果。现状把这条主线切成了死的/软的三段。
> 跨朝代铁律：统一引擎只碰**抽象事件骨架**（涌现 / surface / 裁定 / 回流）；专名事件（魏忠贤自缢、红丸、东厂缉事…）只进**剧本数据**与 **AI 叙事**，绝不进引擎。
> 姊妹篇：与《官制活化》同源——同一招牌混合体（**机械设地板与压力，AI 填可信纹理**）落到事件域。

> 取证说明：现状全图基于 5 路并行审计 + 关键矛盾点亲手自证（文件身份用 PowerShell hash/计数复核、危机桥用 Grep 复核）。正文 `file:line` 为**审计快照**，实施前以运行时为准（CLAUDE.md：以运行时渲染器为权威）。

---

## 1. 诊断（grep 核对版）

事件系统**不缺功能，缺「统一」**。它不是"一套有缺陷的系统"，是 **7 套各管一段、哲学冲突、互不汇流的"事件"机制**叠在一起；没有统一 schema、统一入口、统一感知表、统一落账。而**"对的范式"早已在危机引擎里写出来了**，只是没被当成事件系统的统一答案推广。

### 1.1 七套并存的「事件」通道

| # | 通道 | 文件 | 性质 | 死活 |
|---|---|---|---|---|
| A | **StoryEventBus**（队列+玩家 `choices`+`EffectRegistry` 查表后果+`chainNext` 链式） | `tm-event-system.js`（227 行·自标 `@vestigial`） | 决策点框架·设计最完整 | 🔴 **死**（全库无 `enqueue`/`processNext` 调用方，总线恒空；仅存档序列化一个空队列） |
| B | **PhaseF2 经济事件总线**（`emit`/`on`，22 类经济钩子） | `tm-event-bus.js`（实为 `tm-phase-f2-linkage.js`，`EVENT_BUS`×7） | 经济联动 | 🟡 **空转**（`_checkEvents` 真 emit，但 `init` 处 **0 监听器**，emit 出去无人接） |
| C | **硬触发历史事件**（`checkHistoryEvents`，有分支） | `tm-history-events.js` | 剧本预置+年月/`triggerTurn` 门+固定 `impact` | 🟡 活但后果死板（每回合由 `tm-endturn-systems.js:435` 驱动） |
| D | **刚性触发器**（`checkRigidTriggers`，无分支） | `tm-history-events.js` | 阈值门→`triggerRigidEvent` 单按钮通知 | 🟡 纯通知（`tm-endturn-systems.js:442` 驱动） |
| E | **AI events**（`events[]` 字段） | `tm-ai-change-applier.js:1129` | AI 涌现 | 🟡 **软播报**（只 `addEB`+`_turnReport`，零后果、零决策点） |
| F | **`record_*_events`（14 工具）** | schema `tm-ai-schema.js:497-854`；落地 `tm-endturn-apply.js:349-685` | 事后漏录补抓/记账校验 | 🟡 记账（线①里**唯一真改状态**的一支，带护栏） |
| G | **GameEventBus**（机械 pub/sub：`war:start`/`character:death`/`faction:defeated`…） | emit 散在 apply；监听 `tm-endturn-helpers.js:728-809` | 机械联动 | 🟢 半活（有监听器做通知/级联/写 `_mutableFacts`） |
| — | **evtLog / `addEB`**（文本事件簿·风闻录事） | `tm-player-core.js:310` | 所有通道的呈现终点 | 🟢 活，且是**唯一进记忆系统**的事件流（`evtLog`→`eventHistory`→可 recall，`tm-memory-tables.js:849`） |
| ★ | **危机引擎**（涌现→surface→玩家响应→回流 闭环） | `tm-authority-engines.js` / `tm-authority-complete.js` / `tm-corruption-engine.js` | **范本·唯一做对** | 🟢 **活·对**（见 §1.3） |
| 专题 | 后宫（双轨分裂）/ 势力（双轨）/ 科举（玩家钦点）/ 地块状态 / 天象谶纬 | 各子系统 | 参差不齐 | 混（见 §1.6） |

> 注：A 和 B 是两个**易混的不同文件**——StoryEventBus 在 `tm-event-system.js`，`tm-event-bus.js` 是经济总线。已 PowerShell 计数自证（system: StoryEventBus×3/@vestigial×1；bus: PhaseF2×1/EVENT_BUS×7）。

### 1.2 三种打架的后果哲学

同一个"事件后果"，全工程有三套互斥的实现：

| 哲学 | 出处 | 后果怎么来 | 命门契合 |
|---|---|---|---|
| **effectKey 查表** | StoryEventBus `EffectRegistry`（`tm-event-system.js:175-274`，9 个 key：`change_variable`/`change_character`/`add_enYuan`/`start_war`/`trigger_chain`/`establish_patron`/`add_trait`/`change_face`/`noop`） | 选项→查表→委托现成子系统，**固定** | 🔴 AI 零参与 |
| **固定 impact 表** | history-events `applyEventBranch`（`tm-history-events.js:141-204`） | `branch.impact={国力+5,士气-3}` 写死双向 clamp(0,100)，与国势/前文/玩家路径**无关** | 🔴 AI 零参与 |
| **AI 裁定** | 开局 6 要务（`scenarios/tianqi7-1627.js:9210+`）已转向 | 选项只留 `aiHint`+`longTermConsequences`，后果由 AI 据局面演出 | 🟢 命门正解 |

### 1.3 唯一做对的活范式：危机引擎（范本）

危机（暴君综合症 `hw.index>90`、失威危机 `<30`、民变 区域民心`<25`）不是预置脚本，是**世界状态越阈值自发涌现**的派生状态，跑通了完整闭环：

```
涌现(状态越阈值翻 .active)  →  surface(寄生玩家既有通道)  →  玩家自由文本响应  →  AI?  →  回流(写回阈值变量，下一 tick 自然解除)
```

- **surface 不另开 UI**：危机"长"在玩家既有的下诏/朱批/密令/问对/廷议流里。中枢 `handleCrisisSurfaceResponse`（`tm-authority-complete.js:656`，已 Grep 自证）+ **7 个真实接线点**（颁诏/奏疏/鸿雁/玩家行动/问对/朝议/廷议，`phase8-formal-drafts.js:421` 等），双 smoke 在守（`smoke-crisis-player-paths` + `smoke-crisis-player-surface-bridge`）。
- **响应可触达**：玩家任意自由文本 → `inferCrisisActionFromSurface` 归类 → 共享路由 `handleCrisisAction` → 6 个 handler 改世界。
- **两种回流时序**：即时（写回 index 触发解除阈值）+ 延迟（挂单 `_suppressionOrder`，下 tick 结算，**玩家不响应则自动恶化**）。
- **18 件可复用机制**已审计成清单（涌现/surface/路由/回流/集成五层），见 §2.4。

### 1.4 既成事实的方向信号

**owner 已经用脚投票了**：开局 6 大要务（陕西大饥荒、魏忠贤…）的 `choices` **被刻意删除**，注释明写「choices 已移除·**由玩家召对/密问大臣自行商议决断**」，只保留 `aiHint`（"AI 推演务必以此为 T2-T30 陕北走向根基"）+ `longTermConsequences`。**剧本层已从「固定 choices+固定 impact」转向「玩家自由问对→AI 裁定长程后果」。** 统一范式只是把这个既成方向，从剧本个案上升为引擎主轴。

而 StoryEventBus 的 `choices[].aiHint` 与 `pauseGame` 字段**早就预留、却从没接线**（`resolveChoice` 只走 effectKey 查表，`tm-event-system.js:92`）——骨架等的就是这一刀。

### 1.5 命门缺口（升级面所在）

危机引擎做对了"活"，**但它的活不依赖 AI**：`inferCrisisActionFromSurface` 是**硬编关键词匹配**（`_crisisHasAny` 子串命中），不是 LLM 语义理解；涌现/后果全是阈值算术。即——命门「AI 在玩家自由下给硬核可信回应」在事件系统里，**AI 的位置目前基本是空的**。

这不是坏消息，是**可叠加的升级面**：在不动闭环结构的前提下，把两处从"硬编"换成"AI"——
1. **surface 识别**：玩家自由文本→事件响应，从脆性关键词 → LLM 语义路由；
2. **后果裁定**：选项后果，从查表/固定 impact → AI 据局面裁定（走现成 `tm-ai-change-applier`）。

### 1.6 顺手查出的硬伤（可独立成小刀）

| 硬伤 | 位置 | 说明 |
|---|---|---|
| **跨朝代违规①** | `tm-keju-tension.js:89-114` | 敌党表把东林/阉党/浙楚齐宣昆/新旧党/牛李党**硬编进引擎**——铁律明禁，应下沉剧本（参照同目录 `_kjResolveClassName` 关键字匹配法） |
| **跨朝代违规②** | `tm-houguong.js:31-40` | 后宫位分表自称"清制为主"硬编进模块（有动态名兜底，轻度） |
| **后宫双轨分裂** | `tm-houguong.js`（consorts 孤岛）vs `GM.chars[spouse]+harem_events`（AI 通道） | 两套不通数据的后宫，玩家面板看到的人和 AI 叙事里的人对不上 |
| **死字段** | `bigYearEvent`/`bigyear`（schema `tm-ai-schema.js:253-254`） | 声明却零消费者，AI 输出即被丢弃 |
| **死代码** | `_kjDecayFactionTension`（`tm-keju-tension.js`） | 党争张力只升不降（衰减钩子从未接，自带 TODO） |
| **落账不一致** | history-events 写 `biannianItems`+`createMemoryAnchor` **不** `addEB`；StoryEventBus 写 `addEB` **不**写编年 | 同是"事件落定"，落点不统一→有的进记忆有的不进 |

---

## 2. 核心架构：统一事件总线

```
┌──────────────────────────────────────────────────────────────┐
│  机械脊柱（跨朝代通用·引擎）                                       │
│  · 统一事件 schema（id/source/priority/choices[aiHint]/chainNext │
│      + active/阈值/history —— 借 StoryEventBus×危机引擎）         │
│  · 涌现层：世界状态越阈值 → 产事件（抄危机引擎，§2.4 ①-⑤）         │
│  · 单一入口 enqueue + 单一驱动 processNext（接 endturn:435）       │
│  · surface 桥：事件寄生玩家既有通道（抄危机引擎 §2.4 ⑥-⑨）        │
│  · 回流：后果写回状态 + 落账(addEB+编年+记忆锚)                    │
└───────────────┬──────────────────────────────────────────────┘
                │  局面喂入 / AI 裁定 / 后果落地
                ▼
┌──────────────────────────────────────────────────────────────┐
│  AI 血肉（本朝代·可信叙事与裁决）                                  │
│  · surface 识别：玩家自由文本 → LLM 语义路由（替关键词匹配）        │
│  · 后果裁定：读 choices[].aiHint + 局面 → 演出硬核连锁后果         │
│      → 走现成 tm-ai-change-applier 落地（替 effectKey/固定impact） │
└───────────────┬──────────────────────────────────────────────┘
                │  专名只在此层与剧本出现
                ▼
        剧本：哪个史实节点在何时涌现（魏忠贤自缢=triggerTurn:3…）
```

**设计准绳**：机械设**涌现与地板**（事件何时从世界冒出、surface 接哪些通道、后果护栏），AI 填**可信纹理**（识别玩家意图、裁定连锁后果、本朝叙事）。既非纯阈值模拟（会假、AI 缺位），也非纯 LLM（不硬核、不可追溯）。这正是天命招牌的混合体——和官制活化同一把尺子。

### 2.1 一个事件的生命周期（目标态）

```
① 涌现   世界状态越阈值 / 势力动作 / 廷议结论 / 剧本史实节点 / AI 主推演
            → 统一 enqueue 一条 StoryEvent
② 排队   processNext（接 endturn 管线）按 priority 取出；cleanExpired 清超时
③ surface 寄生玩家既有通道（诏令/奏疏/廷议…），不另开弹窗（关键史实节点可强模态）
④ 应对   玩家自由文本 → AI 语义路由识别意图（替关键词匹配）
⑤ 裁定   读 choice.aiHint + 当前局面 → AI 出硬核连锁后果 → ai-change-applier 落地
            （AI 不可用时回落 EffectRegistry/固定 impact 兜底）
⑥ 回流   后果写回世界状态 + 统一落账(addEB+biannianItems+createMemoryAnchor)
            → 进记忆固化 / 进反思校正 / 进 NPC 感知；chainNext 触发后续事件
```

### 2.2 统一事件 schema（借 StoryEventBus × 危机引擎）

```js
StoryEvent {
  id, title, description,
  source: 'emergent'|'faction'|'court'|'scripted'|'ai'|'chain',  // 涌现来源
  priority(1-10), deadline?, pauseGame?,                          // 既有字段
  choices?: [{ text, aiHint, effectKey?, effectData? }],          // aiHint 主路·effectKey 兜底
  chainNext?,                                                     // 链式
  // —— 借危机引擎的"派生状态"维度（让事件能持续、能恶化、能解除）——
  active?, activatedTurn?, enterThreshold?, exitThreshold?, history?
}
```

### 2.3 七套通道如何收编（映射表）

| 现状通道 | 收编去向 |
|---|---|
| A StoryEventBus | **留作骨架**（数据结构/队列/序列化已存档安全）；后果出口改 AI 裁定 |
| B PhaseF2 经济总线 | 接监听器：经济事件 → 统一 enqueue（现在空转） |
| C/D history-events | 触发后改为 `enqueue` 统一事件（替直接弹模态）；固定 impact 降兜底 |
| E AI events | 符合条件的 event **升格**为带 choices 的决策点 enqueue（替纯 addEB） |
| F record_*_events | **保留作"兜底校验层"**，明确定位（不动，它修的是 narrative↔state 的账） |
| G GameEventBus | 机械事件标准化进统一事件表（单向汇流） |
| evtLog/addEB | 统一落账终点（所有事件经此进记忆/呈现） |
| 危机引擎 | **升格为骨架范本**；其 surface 桥/路由/回流被通用事件复用 |

### 2.4 危机引擎 18 件可复用映射（详见审计·此处列骨干）

- **涌现层**：① active+双阈值滞回（防抖动）② 源/汇驱动+衰减 ③ 多点阈值再同步（防存档脱钩）④ 激活后加深子循环 ⑤ 不响应则自动恶化
- **surface 层**：⑥ ★Surface Bridge 总桥 ⑦ 自由文本→动作识别（**AI 升级位**）⑧ 7 通道接线模板（失败静默不阻断）⑨ 缺参兜底解析
- **响应层**：⑩ ★共享路由 ⑪ 双入口（结构化 req / 自然语言 surface 汇同一后端）⑫ handler 统一返回契约
- **回流层**：⑬ 即时回流（写回阈值变量自然解除）⑭ 延迟回流（挂单+tick 结算）⑮ 跨引擎委托 ⑯ 双账审计+封顶
- **集成层**：⑰ 单 tick 入口+全 try/catch 隔离 ⑱ ★可执行契约（双 smoke，`surfaceHook` 静态断言每面板都接桥——防新面板漏接）

**最高价值三件**（详设骨架）：⑥ Surface Bridge、⑩+⑪ 共享路由+双入口、⑬+⑭ 两种回流时序。

---

## 3. 关键抉择（✅ owner 已拍板 · 全部采纳推荐，见头部「决定」）

| # | 抉择 | 选项 | 推荐 |
|---|---|---|---|
| A | **骨架** | (a) 危机闭环为主 + 借 StoryEventBus 数据结构/队列/序列化 ＜br＞ (b) 纯激活 StoryEventBus | **(a)**——危机引擎是唯一**真跑通**的活闭环；StoryEventBus 强在数据模型，弱在它从没活过。取长补短，不二选一 |
| B | **后果出口** | (a) AI 裁定为主 + 固定后果兜底 ＜br＞ (b) 保留查表/固定 impact | **(a)**——剧本已用脚投票（§1.4）；`aiHint` 字段天生为此预留 |
| C | **surface** | (a) 寄生既有通道为主 + 关键史实节点可强模态 ＜br＞ (b) 一律弹窗 | **(a)**——命门要玩家在自由理政流里应对，不被弹窗打断；危机模式已验 |
| D | **节奏** | (a) 渐进收编（先立统一骨架+开关，再逐套迁移，每刀一套）＜br＞ (b) 一次性大改重写 | **(a)**——7 套都在跑，渐进可隔离风险、可独立验证、可随时回退；符合"大改拆 3-5 刀"纪律 |

---

## 4. 实施切片（5 刀 · 每刀一件事 · 开关默认关 · 可独立验证）

> 全程开关隔离（`eventUnificationEnabled`，可并入 agent 总闸或独立），默认关→不碰现跑路径；每刀留 `.bak`、`node` 跑 smoke 绿后再下一刀；行为需真机验。

- **Slice 1 · 统一事件总线骨架**：定统一 schema（§2.2）；激活 StoryEventBus 队列——`enqueue` 单入口 + `processNext` 接 `tm-endturn-systems.js:435`（紧邻 checkHistoryEvents）+ `cleanExpired`；存档复用现成 `_savedEventBus`。**此刀只通管道，不接来源/不改后果**（总线先能空跑、能存档）。
- **Slice 2 · 后果出口接 AI 裁定**：改 `resolveChoice`（`tm-event-system.js:92`）——读 `choice.aiHint` → 投 AI → 返回 change 列表 → 走 `tm-ai-change-applier` 落地；`EffectRegistry`/固定 impact 降为 AI 不可用时的 fallback。统一落账（addEB+biannian+memoryAnchor 对齐 §1.6）。
- **Slice 3 · 统一 surface**：复用危机 Surface Bridge（§2.4 ⑥⑧）把"待决策事件"挂进玩家既有通道；抽 `showHistoryEventModal` 的分支卡片+impact 中文 label 为**共用事件模态组件**（关键史实节点用）；surface 识别先沿用关键词、预留 AI 语义路由位。
- **Slice 4 · 收编现有通道**：history-events（C/D）触发改 enqueue；AI events（E）符合条件升格 choices；PhaseF2（B）接监听器；GameEventBus（G）标准化汇流。**统一感知表**：所有事件汇入单一 `factionEvents`-style 表，`decideFor`/`reflection`/`memory-steward` 一处读全（补 §1 的孤岛缺口）。
- **Slice 5 · 接活世界（来源+去向）**：来源——势力动作（`tm-faction-action-engine`）/ 目标栈关键节点 / 廷议结论 涌现事件；去向——事件进记忆固化（`memory-steward.scan` 纳入）、进反思校正（`reflection` ground truth 纳入）、进 NPC 感知。这刀让事件从"孤岛"变成活世界的神经。

**可并行的独立小刀**（不依赖主线，随手清）：跨朝代违规①② 下沉剧本；后宫双轨合并；`bigYearEvent` 死字段清理；`_kjDecayFactionTension` 接衰减钩子。

---

## 5. 边界与风险

- **不破坏现跑**：危机引擎/科举钦点/history-events 都在跑且玩家在用——全程开关隔离 + 渐进迁移，每刀 smoke 绿+真机验后再下一刀；危机引擎是**复用不是重写**。
- **存档兼容**：StoryEventBus 已有 `_savedEventBus` 序列化骨架（存档安全已验）；新增字段走"缺省即旧行为"，旧档不炸。
- **跨朝代铁律**：统一引擎只碰抽象骨架；顺手把已发现的违规①②下沉剧本，别在统一时新增硬编。
- **AI 成本**：事件裁定是新增 AI 调用——复用 endturn 管线/按需触发（非每事件必调），参照势力精算的封顶经验（`inTurnMaxPerTurn`）；surface 语义路由可先保留关键词、AI 作增强。
- **二手行号风险**：本文件 `file:line` 为审计快照，实施每刀前先 grep/Read 复核当前位置（本会话工具曾被注入，关键处 PowerShell 自证）。

## 6. 不做什么（防镀金）

- **不**追求一次性重写 7 套——渐进收编，能跑的先留。
- **不**砍 `record_*_events`——它是 narrative↔state 的兜底对账，降格定位即可。
- **不**给每个事件都强行加玩家决策点——多数事件仍是叙事流过；只有"需要玩家应对的局面"才升格为决策点（避免弹窗轰炸）。
- **不**为 surface 强上 LLM——关键词匹配够用的地方先留着，AI 作为可信度增强叠加。

---

## 附：五线审计来源
线①AI涌现+记账 / 线②专门子系统 / 线③危机引擎范本（18件清单）/ 线④决策点框架+呈现层 / 线⑤活世界接入（11 接线缺口）。完整审计结论散见各线报告；本文件是综合 + 命门裁剪 + 实施切分。
