# 科举大改 sprint·v7.1·激进 paradigm reset + player journey 结构 + 4 新维度全加 + keyi 触发 paradigm 修正

**状态**·plan 阶段·**等 user 拍板分 4 阶段 ship**
**创建**·v1 (2026-05-22) → v6 → v6.5 → v7 → **v7.1 (2026-05-23·keyi 真相修正 + AI 调用清单)**
**预计工时**·**77-109 天** (含 buffer 95-135 d)·**~39 slice** (v7 38 + J0)·**11 phase**·分 **4 release ship** (1.4 / 1.5 / 1.6 / 1.7)·v7.1 review 重算各 phase 后 (各 phase 工时之和真实加总·非粗估)
**v7.1 关键修正**·亲读 runtime 后发现 (1) keyi 现仅 1 topic hardcode (`筹办科举`)·**v7 plan §3 错写"7 议题路由"**·实际是 Slice B3 要先做 keyi 接参化·v7.1 实际 9 议题·(2) `checkKejuTrigger` 自动 trigger 现**完全绕过 keyi**·v7 必须改路径·(3) 现 AI 调用 **18 处**·v7 后 ~24 处·成本 80-130k/场 (v6.5 +20-30%)·见 §6.5·(4) **timeline 重算**·v7 header 60-85 d 是 v6.5 残留估·真和 77-109 d·(5) 内审 8 处一致性纠正 (议题数 / D1+D4 联动 / G2 不走 keyi / 等)
**风险**·中-高·tm-keju-runtime 4305 行 + tm-keju 1076 行**真重构** ~40%·**但 12 red line 严守·23 亮点保留**·新增 4 维度 namespace 全 greenfield·**真新建 35-45 d**
**v7 vs v6.5 关键差异**·结构按 **player journey 11 stage** 不按技术层·paradigm **允许激进重构** (拆 8 阶段引擎换 KejuTier 全驱动·删 lazy 分支·重写 _aiGenerateFullCharacter prompt)·**4 新维度全加** (进士长期反馈 / 特科 / 私学书院 / 宦官干预)
**历史归档**·v6.5 snapshot 在 `web/docs/keju-overhaul-sprint-v6.5-snapshot.md`·v1-v5 在 `-history-v1-v5.md`·**本文档是 canonical 最终版**

---

## 1·目标 (v7 重定义)

科举从"出人物工具"升级为"**整个朝代政治戏剧的核心引擎**"·1300+ 年中国古代全覆盖。

**v7 核心命题**·

> 科举不是"考试系统"·是"政治史诗的脊椎"。
> 每一次开科·每一次钦点·每一次弊案·都会震动整个朝廷三十年·并通过门生网络反馈到玩家身边。

**6 维全方位升级** (v6.5 4 维 + v7 新增 4 维)·

| 维度 | v6.5 已覆盖 | v7 新增 / 加强 |
|---|---|---|
| **核心政治** | N 年一次大事件·党争·选官·改革 | + 弊案/改革深度·新维度 |
| **筛选机制** | KejuTier 9 朝代 preset | **完整 player journey 11 stage 串通** |
| **身份金字塔** | 进士 eager·mentor·派系标签 | **+ D1·进士长期反馈·门生网络永远活** |
| **特殊科目** | (无) | **+ D2·恩科/武举/翻译科 event-driven** |
| **对抗机制** | (无) | **+ D3·私学/书院·F1 下行通道·东林党根源** |
| **朝代专有** | (无) | **+ D4·宦官干预·明清司礼监/东厂·撕裂 examiner factionBias** |

**4 核心 design rule** (v7 实施全程 lock)·

```
✅ Rule 1·paradigm reset 允许·但**保留 23 亮点 + 12 red line**·**黑名单 (red line) 严守·白名单 (亮点) 拷贝**
✅ Rule 2·**player journey first**·11 stage 顺通畅·**任何 slice 必标"影响 player journey 第几 stage"**
✅ Rule 3·**4 新维度第一公民地位**·非附属·有独立 namespace·有 editor 面·有 LLM 接入
✅ Rule 4·**runtime read first**·任何"新建函数"前 grep web/·v6 教训
```

---

## 2·player journey·11 stage 全景 (v7 核心结构)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 玩家科举 journey·11 stage·N 年一次循环·跨场 30+ 年长尾                       │
└─────────────────────────────────────────────────────────────────────────────┘

Stage 1·制度激活 (开局期·首次进入科举朝代)
   │  玩家·"陛下·当此乱世·该开科取士"
   │  操作·requestEnableKeju / startKejuReform / 朝代评估
   ↓  后果·5 档 (全准/有限/缓/改/拒)·sc0 LLM 决议
Stage 2·常规科目筹办 (3 年一科·正常 trigger)
   │  玩家·"今岁春闱·当如何"
   │  操作·proposeKejuPreparation → keyi `topicType='kaike'` → 3 路径
   ↓  后果·开科决议进入科议·议政立场拉拽·council/edict/defy 代价梯度
Stage 3·主考钦点 (会试前 60 天)
   │  玩家·"以何人主考"
   │  操作·selectExaminer → keyi `topicType='examiner_pick'`
   ↓  后果·examiner 4 属性派生 view·tension+1 / loyalty-2 / 党派联动
Stage 4·会试拟题 + 审阅 (会试期·~30 天)
   │  玩家·"会试题目当何"
   │  操作·examinerProposeTopic → 3 候选 → 玩家修改/采纳 → 召礼部商议 keyi
   ↓  后果·题目-主考契合度派生·错配 → 开榜 LLM 评价 -10 + event
Stage 5·开榜 + 殿试代主 (会试结果·殿试前)
   │  玩家·"开榜·殿试代主·题目"
   │  操作·generateHuishiResults → openDianshiDelegatePicker → generateDianshiQuestion / 亲笔
   ↓  后果·6 身份代主 (v7 D4 后 7 类含司礼监·明清专有)·权臣 -3 huangwei·武将礼部抗议·题目策问体 150-250 字
Stage 6·殿试钦点 + 答卷阅 (科举仪式最高潮·24 小时玩家专属)
   │  玩家·"亲点状元/榜眼/探花"
   │  操作·viewAnswer → _qinDianPick → confirmFinalRanking
   ↓  后果·钦点违 examiner 偏好·_kejuJudgeRankingControversy·tension+2/3·prestige+5
Stage 7·授官分配 (殿试后·~7 天)
   │  玩家·"分配中央 / 外放"
   │  操作·_kejuAutoAssign 朝代联动 → _kejuAssignConfirm 单人微观
   ↓  后果·朝代差异 (明清翰林 / 唐释褐试 / 宋直授 / 元四等)·选官钦点 4 代价
Stage 8·进士长期反馈 (v7 新·D1·跨场 30+ 年)
   │  玩家·"门生 X 来上书"·"同年集会·赞陛下圣德"·"恩师X已逝·门生联名请祭"
   │  操作·门生上书 modal / 同年集会 event / 言官清议 / 玩家可恩赏 / 罢黜
   ↓  后果·门生网络强度·进士 NPC 长期 affinity·言官清议根源
Stage 9·特科 (v7 新·D2·event-driven 非定时)
   │  玩家·"皇帝寿诞·恩科" / "边镇危机·武举" / "雍正初·翻译科"
   │  操作·startKejuExam(type='enke'/'wuju'/'fanyi'/'tongzi') → 简化版 journey
   ↓  后果·特科出身有独立标签·恩科生 affinity+5·武举生入营 valor 加权
Stage 10·私学/书院对抗 (v7 新·D3·F1 下行通道)
   │  玩家·"东林书院讲学·参与朝议" / "私学派进士影响选官" / "禁书院"
   │  操作·monitor 书院 → keyi `topicType='school_ban'` → 禁/容/扶
   ↓  后果·书院党派 (东林/复社)·F1 派生分裂·南北党争根源
Stage 11·宦官干预 (v7 新·D4·明清专有·撕裂 examiner factionBias)
   │  玩家·"司礼监批红开科" / "东厂阅卷查弊" / "司礼监钦点状元"
   │  操作·monitor 宦官 corruption → 制衡 (剥批红) / 放任 (背锅)
   ↓  后果·examiner factionBias 加 30%·宦党 (魏忠贤模式) / 反宦联盟

┌─────────────────────────────────────────────────────────────────────────────┐
│ 横贯三指针·F1/F2/F3 实时反馈·event-based 邸报头条·非数值滴漏                │
│ F1·士人吸纳率 (~50)  F2·官僚流动率 (~30)  F3·文化整合度 (~65)              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3·v6.5 → v7·paradigm reset 决定表

每个 paradigm 决策明示·**保留 / 重构 / 新增**·

| Paradigm 项 | v6.5 决定 | v7 决定 | 理由 |
|---|---|---|---|
| **8 阶段引擎** | 保留 (stageDurationDays dict) | **重构** (KejuTier 全驱动·删 dict 旧字段) | 激进 paradigm·9 朝代 preset 需 tier 灵活·dict 限制 |
| **进士 eager/lazy 双分支** | 保留 + 统一 (Slice 8 删 lazy) | **重构** (lazy 全删·只走 eager·crystallize 算法重写) | v6.5 已 80% 决定·v7 彻底化 |
| **keyi 800 行** | 不重写 (扩 topicType) | **不重写** (扩 topicType + 7 新议题·共 9 类) | red line #1·v6.5 已 lock·v7 继承 |
| **半文言风格** | 不改 | **不改** | red line #5·**绝对 lock** |
| **历史名臣 + shiliao** | 保留 | **保留 + 加强** (D2 特科加历史人物池·D3 书院加东林/复社真人) | red line #3 |
| **演义 _timeAnomaly** | 保留 | **保留** | red line #4 |
| **殿试代主 6 身份** | 保留 + Slice 7.5 加强 | **保留 + Slice C4 集成 D4 宦官干预** | red line #6 |
| **wuchang 5D** | 不改 (复用) | **不改** | red line #10 |
| **3 路径代价梯度** | 保留 | **保留** | red line #11 |
| **NpcMemorySystem + AffinityMap** | 保留双轨 | **保留 + D1 加进士专属 memorySeed pool** | red line #12 |
| **_aiGenerateFullCharacter prompt** | 扩 (Slice 8 注入 examiner hint) | **重写** (D1/D2/D3/D4 全维度 hint·prompt 重组) | 激进许可·LLM prompt 不在 red line |
| **char schema** | 不加新字段 (Slice 9 加 `_mentorRef`) | **加 3 新字段**·`_mentorRef` (D1) + `_specialExamType` (D2) + `_schoolAffiliation` (D3) | 4 维度需独立字段·非派生可承担 |
| **GM 顶层 namespace** | GM._factionTension (Slice 5.5) | **加 4 namespace**·`GM._discipleGraph` (D1) + `GM._specialExamCalendar` (D2) + `GM._schoolNetwork` (D3) + `GM._eunuchInterference` (D4) | 第一公民地位 |
| **F1/F2/F3 公式** | 阶层/党派/吏治派生 | **重写**·F1 加 D3 私学冲击·F3 加 D1 门生网络多样性 | 数学化加深 |
| **改革浪潮 5 触发** | 保留 | **保留 + 加 D3/D4 触发条件**·F1 跌破 30% + 私学崛起·宦党 corruption≥60 | 维度联动 |
| **弊案 sc16 扩** | 保留 | **保留 + 加 D4 宦官参与触发**·东厂阅卷舞弊 | 维度联动 |

---

## 3.5·keyi 触发 paradigm·v7 三路径整合 (亲读 runtime 后纠正)

**v7 plan 早期错误描述**·假设"keyi 主管 7 类议题·自然触发·全 keyi 公议"。**亲读 runtime 后发现**·

```
现状真相·
  · openKeyiSession 现仅 1 处调用·proposeKejuPreparation (tm-keju.js L213·玩家手动按按钮)
  · keyi topic hardcode '筹办科举' (runtime L1566)·**没有 topicType 参数**
  · 自动 trigger·checkKejuTrigger (runtime L170)·LLM 判断到期·**直接调 startKejuExam·完全绕过 keyi**
  · → 现"自动开科"完全不走议政·跟 v7 plan §3 设想冲突
```

**v7 必须明确 3 条触发路径·全部走 keyi**·

### 路径 A·玩家主动 (现保留·扩 7 议题)

```
玩家点科举 panel "[📋 提议筹办科举]" 按钮 (tm-keju.js L169)
  ↓
proposeKejuPreparation(topicType='kaike')   ← Slice B3 加 topicType 参数
  ↓
openKeyiSession({ topic, topicType, topicData })
  ↓
keyi 公议·走 council/edict/defy
```

**v7 加 9 议题入口**·`activation` (A1·制度激活) / `kaike` (B3) / `examiner_pick` (C1) / `question_review` (C3) / `scandal` (J4) / `reform` (J3) / `allocation` (E3) / `school_ban` (H3·v7 新) / `eunuch_check` (I2·v7 新)·**全走 A 路径**·从对应 panel/event 按钮入。

### 路径 B·LLM 定时自动 (现存·v7 必改 → 走 keyi)

```
endTurn 内 checkKejuTrigger() 跑·LLM 判 "是否到期"
  ↓ 返 {shouldTrigger: true, reason: '...'}
v7 改·**不再直接调 startKejuExam**·改·
  ↓
P.keju._pendingAutoOpen = { reason, source: 'autoTrigger' }
邸报头条 spawn·"礼部奏·三年期至·该开科"
玩家点头条·走 A 路径 (proposeKejuPreparation·topicType='kaike')
```

**rationale**·LLM 自动 trigger 只起"提醒"作用·**最终决议必走 keyi**·避免现"自动开科不议政"的硬伤。

### 路径 C·自然政治触发 (v7 新)

```
endTurn 钩子 _kjCheckNaturalTriggers(ctx) 跑·检查·
  · F1 < 25  → 邸报"士林沸腾·请陛下广开科目" (走 kaike + reform 双议)
  · partyTension ≥ 15 → 邸报"党争急·请议改革" (走 reform)
  · examiner corruption ≥ 60 → 邸报"主考有疑·请查弊" (走 scandal)
  · D3 私学占比 > 40% + F1<30 → 邸报"书院非朝廷" (走 school_ban)
  · D4 东厂 ≥ 60 → 邸报"宦党干预·请陛下定夺" (走 eunuch_check)
  · 改革派 NPC ≥ 2 → 邸报"改革派进言" (走 reform)
  ↓
邸报头条 spawn·玩家点击 → 走 A 路径
```

### 三路径关系图

```
                       endTurn
                          │
       ┌──────────────────┼──────────────────┐
       ↓                  ↓                  ↓
  路径 A·玩家主动    路径 B·LLM 定时     路径 C·自然政治
  (玩家点 panel)     (checkKejuTrigger)  (_kjCheckNaturalTriggers)
       │                  │                  │
       │                  ↓                  ↓
       │            邸报头条 spawn      邸报头条 spawn
       │            (B 改·不直接开科)    (C 新·v7 必建)
       │                  │                  │
       │                  ↓                  ↓
       │            玩家点头条 → 走 A    玩家点头条 → 走 A
       │                  │                  │
       └─────→ proposeKejuPreparation(topicType) ←─────┘
                          ↓
                  openKeyiSession({topic, topicType, topicData})
                          ↓
                       keyi 公议
                          ↓
              _keyiConfirmStart(method)·council/edict/defy
                          ↓
                  startKejuByMethod / startKejuReform / 其他
```

### v7 必修 3 处 (写入 Slice)

| Slice | 修什么 |
|---|---|
| **B3 (扩 keyi topicType)** | (1) `openKeyiSession({topic, topicType, topicData})` 改接参数·非 hardcode·(2) topicType 路由表 7 议题·分发到对应 UI 文案 + 表决阈值 + 后续 callback·(3) **绝不重写 keyi 800 行** |
| **B3 (改 checkKejuTrigger·v7 新加)** | LLM 自动 trigger 不再直接 `startKejuExam`·改 spawn 邸报头条·"礼部奏·三年期至" → 玩家点头条走 A 路径·**保留 LLM 智能·但议政不绕过** |
| **J0 (新加·自然政治触发)** | `_kjCheckNaturalTriggers(ctx)` endTurn 钩子·6 自然触发条件·spawn 邸报头条·走 A 路径·跟 Slice J1 F1/F2/F3 公式联动 |

---

## 4·12 条 red line (v7 全程 lock·继承自 v6.5)

```
❌ 1. 绝不重写 keyi 800 行 (L1564-2353·开放扩 topicType·v7 加 7 新议题共 9 类·但不重写)
❌ 2. 绝不删 _kejuGenChiefExaminerMemorial (主考奏折·tm-keju.js L495)
❌ 3. 绝不简化历史名臣检索 (shiliao 字段必保·原文摘引·v7 D2/D3 加强)
❌ 4. 绝不删演义模式 _timeAnomaly 标签
❌ 5. 绝不改半文言风格 (LLM prompt 文案 "150-250 字策问体")
❌ 6. 绝不删殿试代主 6 身份分类 (太子/首辅/礼部/宗室/权臣/武将·v7 加 D4 宦官第 7 类)
❌ 7. 绝不删党派推荐机制 (各党 influence>20 → 该党最高 intel 成员)
❌ 8. 绝不简化经费三级 fallback (国库 → 内帑 → 流产)
❌ 9. 绝不破坏 7 处持久化数据流 (_courtRecords/_edictTracker/qijuHistory/jishiRecords/eventBus/NpcMemorySystem/AffinityMap)
❌ 10. 绝不替换 wuchang 5D 为西式 personality8D / OCEAN
❌ 11. 绝不发明新代价 paradigm·所有议题复用 council/edict/defy 三 tier
❌ 12. 绝不删 NpcMemorySystem.remember + AffinityMap.add 双轨写入
```

**v7 增加 4 条 design rule (非 red line·但实施期遵守)**·

```
✅ 13. 4 新维度全有 editor 面·非"运行时偷偷加"
✅ 14. 4 新维度全有 LLM prompt 集成·NPC 会聊新维度内容
✅ 15. player journey 11 stage 任何 slice 必通畅·不允许中断
✅ 16. 4 release 分阶段 ship·每 release 独立可用·不依赖下一 release
```

---

## 5·~38 slice·11 phase·实施表 (v7)

### Phase A·Prep + 制度激活 (player journey Stage 1·5-7 d)

| Slice | 目标 | 涉及文件 | DoD + red line |
|---|---|---|---|
| **A0** | 通读 + field inventory (5305 行) + v6.5 → v7 diff doc | tm-keju.js + tm-keju-runtime.js·新 `web/docs/keju-field-inventory-v7.md` | (1) 5305 行全文标 [keep]/[refactor]/[delete] (2) 27 player op 全表·v7 mapping (3) v6.5 → v7 paradigm reset 决定 verbatim |
| **A0.3** | `_kjInferLearningTraits` 派生函数 (5 维 30 词) | 新 `web/tm-keju-learning-traits.js` (~80 行) | (1) `{confucian, statecraft, poetry, philosophy, practical}` (2) 5 剧本 ≥70% 命中 (3) 不持久化 |
| **A0.5** | UI 入口·右侧"文"panel 加科举按钮 | phase8-formal-bridge.js | (1) panel 顶端"文事" (2) gold "科举"按钮 → `openKejuPanel()` (3) 不破 8 其他 panel |
| **A0.7** | 共性 paradigm research v7 doc | 新 `web/docs/keju-paradigm-research-v7.md` (~800 行) | (1) 6 共性轴 (2) 9 朝代差异 (3) **4 新维度详记** (4) 后续 slice 设计参考 |
| **A1** | **制度激活 v7·sc0 多档 + UI 双弹窗** (player journey Stage 1) | tm-keju.js requestEnableKeju (L964) [重写]·startKejuReform (L1011) [重写]·新 `web/tm-keju-activation.js` (~250 行) | (1) sc0 prompt 重写·返 `{outcome: 'full/limited/delay/reform/reject', reason, restrictions[], affectedClasses[]}` (2) 5 档 UI·全准 / 有限 (3 年试点) / 缓 / 改 (走 reform) / 拒 (3) keyi `topicType='activation'` (4) **绝不 hardcode 5 档·全 LLM** (5) **保留 P.ai.key 缺失 fallback** |

### Phase B·常规科目筹办 (player journey Stage 2·4-6 d)

| Slice | 目标 | 涉及文件 | DoD + red line |
|---|---|---|---|
| **B1** | KejuTier 数据结构·**激进重构** (删 stageDurationDays dict + initKejuSystem 改 tier 全驱动) | tm-keju-runtime.js initKejuSystem (L23) [重写]·_getDefaultTiers (L137) [重写]·新 `web/tm-keju-tier.js` (~200 行) | (1) `P.keju.tiers[]` 全驱动·删旧 dict 字段 (2) tier·`{name, level, interactive, desc, daysCost, tierKind, examinerLevel, contentType, passRate}` (3) `_kejuUpgradeExamSchema` v7 重写·老存档转 tier index (4) **9 朝代 preset 全 tier 化** |
| **B2** | 9 朝代 preset (汉 chaju stub / 魏晋 jpzz stub / 隋唐宋元明清完整) | 新 `web/tm-keju-presets.js` (~500 行) | (1) 9 preset 跑 smoke (2) 隋唐宋元 3-tier·明清 6-tier·南宋道学化 (3) 真流程仅 'kj'·察举/九品 backlog |
| **B3** | **keyi 触发 paradigm 三路径整合 + topicType 路由** (player journey Stage 2 + 横贯·**v7 关键 slice**) | tm-keju-runtime.js openKeyiSession (L1564) [扩头 + 接参]·_keyiConfirmStart (L2197) [扩 callback]·checkKejuTrigger (L170) [改路径]·tm-keju.js proposeKejuPreparation (L207) [扩接 topicType] | **(1) keyi 接参化** — `openKeyiSession({topic, topicType, topicData})`·**不再 hardcode 'topic:筹办科举'** (L1566)·`KEYI_TOPIC_TYPES` 表 **9 议题** (activation/kaike/examiner_pick/question_review/scandal/reform/allocation/school_ban/eunuch_check) (2) **proposeKejuPreparation 扩 topicType** — 现 hardcode 走 kaike·v7 各 slice (A1/C1/C3/E3/H3/I2/J3/J4) 各自 button 入·`proposeKejuPreparation('examiner_pick', {candidates})`·路由到 keyi 对应 topicType (3) **checkKejuTrigger 改路径** — 现 L210 直接调 `startKejuExam`·v7 改 spawn 邸报头条 `P.keju._pendingAutoOpen = {reason, source:'autoTrigger'}` + addEB·**LLM 自动判到期但议政不绕过** (4) **keyi 内部话术按 topicType 切** — `_keyiRenderDiscuss` 标题/`_keyiPersistToCourtRecords` topic 字段全用 topicType 派生·council/edict/defy 三 tier 代价 paradigm 复用 (red line #11) (5) **绝不重写 keyi 800 行** (red line #1)·只改头部接参 + 内部话术派生 (6) **绝不破坏 7 处持久化** (red line #9)·_courtRecords/_edictTracker/qijuHistory/jishiRecords/eventBus/NpcMemory/AffinityMap 全保 (7) DoD smoke·9 议题各跑 1 次·council/edict/defy 各路径不破坏现 paradigm |

### Phase C·主考钦点 + 会试拟题 (player journey Stage 3-4·6-8 d)

| Slice | 目标 | 涉及文件 | DoD + red line |
|---|---|---|---|
| **C1** | 主考 4 属性派生 view (player journey Stage 3) | 新 `_kejuExaminerView` (~150 行)·_keyiConfirmStart [扩] | (1) `{preferContent, preferRegion, strictness, factionBias}` (2) 4 属性全派生·不加 char schema (3) keyi `topicType='examiner_pick'`·picked.party tension+1·非 picked loyalty-2 |
| **C2** | GM._factionTension namespace + corruption 派生 (新建·真新增 paradigm) | 新 `web/tm-keju-tension.js` (~250 行)·`web/tm-keju-corruption.js` (~120 行) | (1) GM._factionTension 顶层 init 0-20 (2) `_kjUpdateFactionTension` (3) `_kjCalcTotalPartyTension` (4) `_kjGetEnemyParties` / `_kjGetPartyLeaders` (5) `_corrCalcExaminerCorruption`·deptCorruption×0.6 + partyCorr×0.3 + greed/integrity×0.1 (6) sc0 LLM tension 抽取 ≥50% 命中 |
| **C3** | **会试拟题 UX·主考偏好 hint 显式** (player journey Stage 4·扩 examinerProposeTopic + 题目-主考契合度) | runtime examinerProposeTopic (L778) [扩]·_kejuGenChiefExaminerMemorial (tm-keju.js L495) [扩]·新 `web/tm-keju-question-ui.js` (~250 行) | (1) UI 顶部显 `_kejuExaminerView` 4 属性·让玩家知主考想要什么 (2) 主考 3 候选 (复用现 paradigm·red line #2)·玩家修改/采纳 (3) 题目-主考契合度派生·错配 → 开榜 LLM 评价 -10 + event "考官私议陛下偏题" (4) 召礼部商议·keyi `topicType='question_review'` (复用 keyi) (5) **绝不绕主考拟题 paradigm**·**绝不改文言** |
| **C4** | 经费三级 fallback 保留 + UI 显示 + 内帑补贴提皇威 (red line #8) | runtime _kejuSettleCentralCost (L925) [keep]·tm-keju.js L440-925 [keep]·UI 加经费显示行 | (1) 国库→内帑→流产 3 级保留 (2) UI 顶部新加"科举经费"行 (3) 内帑补贴时 toast "陛下慷慨·士林感念" + huangwei+2 (4) **绝不简化** |

### Phase D·殿试代主 + 钦点 (player journey Stage 5-6·8-10 d)

| Slice | 目标 | 涉及文件 | DoD + red line |
|---|---|---|---|
| **D1** | 殿试代主 6 身份 + Slice 7.5 联动 + D4 第 7 类预留 (player journey Stage 5) | tm-keju.js openDianshiDelegatePicker (L623) [扩]·_kejuClassifyDelegate (L660) [扩]·_pickDianshiDelegate (L683) [扩] | (1) 6 身份 affinity/huangwei 后果加强·太子 prestige+8 储位+3·首辅 prestige+5 partyTension+2·礼部 礼制满意+5·宗室 满意+10·权臣 huangwei-3 tension+5·武将 huangwei-2 礼部抗议 event (2) `_isPlayerFactionChar` 资格限制保留 (3) 跟 Slice C1 联动·若代主=主考·tension+3 (4) **red line #6 落地** (5) **D4 第 7 类预留**·Slice I2 D4 启用后·加司礼监代主分类·**明清专有** (`scenario.dynasty in ['明','清']`)·选择时 huangwei-5·宦党 prestige+10·反宦联盟 enmity+15·跟 I2 keyi `eunuch_check` 联动 |
| **D2** | **AI 代拟策问 + 玩家亲笔** (player journey Stage 5·核心仪式权力) | runtime generateDianshiQuestion (L1013) [扩]·playerQuestion textarea [keep] | (1) AI 代拟保留·**半文言策问体 150-250 字** (red line #5) (2) 玩家可亲笔写 (3) UI 顶部显 `_kejuExaminerView`·若错配 → warning (4) **绝不改文风** |
| **D3** | **开始殿试 + LLM 答卷生成** (player journey Stage 5→6 过渡) | runtime startDianshi (L1092·A0 verify) [keep]·generateDianshiResults (L1143) [扩] | (1) 进度条 5→95% 现保留 (2) LLM 答卷生成·prompt 注入 examiner hint + 题目 (3) 后过滤剔除已任官员/后妃/玩家 (现 L1195) (4) 跟 D2 玩家题目联动 |
| **D4** | **钦点三甲 + 答卷阅 UX** (player journey Stage 6·科举仪式最高潮) | runtime renderKejuStage 殿试 finalize 段 (L1430-1468) [扩]·viewAnswer (L2452) [扩]·_qinDianPick (L1471) [扩]·confirmFinalRanking (L1484) [扩]·_kejuJudgeRankingControversy (L1520) [扩] | (1) 20 卷阅 UX 强化·答卷弹窗加 `_kejuExaminerView`·让玩家看主考会怎么评 (2) 钦点 3 甲流程保留 (3) **党争联动·新加**·钦点状元=examiner.party → `GM._factionTension[examiner.party]+=2`·=反方党 → enemy tension+3·非主考前 3 建议 → prestige+5 + 中立派 affinity+3 (4) 寒门状元 (familyTier='commoner') → 寒门 satisfaction+10·门阀 -5 + event (5) 失败 UX·若 20 卷无人是 examiner.preferRegion 籍贯 → 开榜 warning "主考有偏" |
| **D5** | 进士 eager 统一 + crystallization 重写 (lazy 全删) (player journey Stage 6→7 过渡) | runtime _aiGenerateFullCharacter (L2917) [重写]·crystallizeKejuGrad (L3131) [重写]·_kejuArchiveExam (L557) [扩] | (1) lazy 分支全删·eager 入 GM.chars (2) prompt 重写·注入 examiner 4 属性 hint + D1/D2/D3/D4 维度 hint (3) historicalHits 优先·`pickHistoricalCandidates` 命中先 crystallize (4) 每场 20 人 (5) shiliao 字段必保 (red line #3) (6) `_timeAnomaly` 必保 (red line #4) (7) 跨场去重池保 (8) **GM._runId 防撞** |

### Phase E·授官分配 + 人物志 (player journey Stage 7·5-7 d)

| Slice | 目标 | 涉及文件 | DoD + red line |
|---|---|---|---|
| **E1** | mentor 字段 + 反向索引 (player journey Stage 7 长尾) | crystallizeKejuGrad [扩]·新 `web/tm-keju-mentor.js` (~200 行)·tm-three-systems-ui.js | (1) `ch._mentorRef = examiner.name` (2) 反向索引 `GM._mentorIndex.mentor[examiner] = [mentees]` (3) `ch.mentor` 现字段不动 (4) UI 复用现党派列表展"门生" (5) 跟 6 系统翻新 partyRef entity 前向兼容 |
| **E2** | 进士派系标签 100% (player journey Stage 7) | runtime _kejuAggregateGradsEffect (L3088) [扩] | (1) 进士 ch.party 写入 100% (现 20%) (2) 复用现党派字符串·东林/阉党/浙党 (3) NPC LLM prompt sc1b 自动带 (4) char.party 字符串不 entity 化 |
| **E3** | **朝代联动选官分配** (player journey Stage 7·扩 keyi `topicType='allocation'`) | runtime _kejuAutoAssign (L3157) [扩]·_kejuAssignConfirm (L2715) [扩]·新 `web/tm-keju-allocation.js` (~350 行) | (1) 明清·一甲直翰林·二甲选庶吉士·三甲外放·唐·释褐试二阶段·宋·状元直授高位·元·四等差额 (2) keyi `topicType='allocation'` (3) 4 代价·deptParty tension+0.5·状元违制 loyalty-3 prestige-5·肥缺反方党 affinity+3 (4) 仅 'kj' 朝代 |

---

### Phase F·**进士长期反馈** (player journey Stage 8·新维度 D1·12-18 d·v7 大头)

**核心命题**·进士入官后跟玩家长期互动·恩师/门生/同年网络永远活·让科举投资有长尾回报。

| Slice | 目标 | 涉及文件 | DoD + red line |
|---|---|---|---|
| **F1** | `GM._discipleGraph` namespace + 自动构建 (D1 基础) | 新 `web/tm-keju-disciple-graph.js` (~300 行)·crystallizeKejuGrad [扩] | (1) `GM._discipleGraph = { byMentor: {}, byCohort: {}, byDisciple: {} }` (2) 进士入 chars 时·自动加 disciple 边 + 同年 cohort 边 (3) `getDiscipleStrength(mentor, disciple)`·初始 60·跟随时长 + 互动事件衰减/增长 (4) endTurn 钩子衰减 0.95^year (5) **新增 1 字段 ch._cohortYear** |
| **F2** | 门生上书机制·event spawn (player journey Stage 8 主体) | 新 `web/tm-keju-disciple-events.js` (~250 行)·event-system 集成 | (1) 触发条件·门生 affinity>70 + (mentor 失势/被弹劾/将卒) → "门生联名请祭"/"门生上书救" event spawn (2) 玩家可恩赏 / 罢黜 / 留中 (3) 后果·门生 affinity ±·mentor.prestige 调整·言官清议根源 |
| **F3** | 同年集会 event·N 年一次集体 LLM (D1 二维) | 新 `web/tm-keju-cohort-meet.js` (~200 行) | (1) 触发·某 cohort 内 ≥5 同年活·距上次集会 ≥3 年 (2) LLM 生成集会内容·涉及朝政评议 + 引荐相互 (3) 玩家可派 NPC 监 / 容 / 禁 (4) 后果·cohort 内 affinity+5·若被禁 → 整 cohort loyalty-10·结党风险 +20 |
| **F4** | 言官清议·进士背景驱动 (D1 三维·跟现言官系统集成) | runtime 言官 spawn 段 [扩]·新 `_kjYanguanClassify` (~100 行) | (1) 言官的 mentor / cohort / school 影响清议立场 (2) "其师为东林·必清议党争" prompt 注入 (3) 玩家钦点状元的门生倾向 → 长尾 affinity (4) UI 言官面板显 "出身·X 朝 Y 年进士·门生于 Z" |

---

### Phase G·**特科** (player journey Stage 9·新维度 D2·6-10 d)

**核心命题**·event-driven 特殊科目·恩科 (皇帝寿诞) / 武举 (军事危机) / 翻译科 (清朝民族议题) / 童子科。

| Slice | 目标 | 涉及文件 | DoD + red line |
|---|---|---|---|
| **G1** | `GM._specialExamCalendar` namespace + 4 类特科 trigger (D2 基础) | 新 `web/tm-keju-special-exams.js` (~350 行) | (1) namespace·`{enke: [], wuju: [], fanyi: [], tongzi: []}` (2) trigger 函数·`_kjCheckSpecialExamTriggers(ctx)` endTurn 钩 (3) 恩科·`P.playerInfo.birthday year mod 10 === 0 / 皇帝大婚 / 万寿` (4) 武举·`边镇 war state ≥ 3 + 缺将领` (5) 翻译科·`scenario.dynasty === '清' + 1723 后` (6) 童子科·`scenario.era === '清' + 神童 event` (7) **新增 1 字段 ch._specialExamType** |
| **G2** | 特科 journey·**简化版 6 stage** (不走全 11 stage·不走 keyi 议政) | 新 `web/tm-keju-special-exam-runner.js` (~250 行) | (1) 特科 journey·trigger → 开科 → 主考钦点 (简化) → 出题 → 录取 → 授官 (2) **不走 keyi**·event-driven 自动启动 (恩科是皇帝恩典 / 武举是危机时 / 翻译科是雍正政策·不议政) (3) 出题特定·恩科诗赋·武举弓马·翻译科 满汉文·童子科 经义 (4) 录取人数 5-10·非 20 (5) 入 GM.chars 时打 ch._specialExamType 标签 (6) **保留**·若玩家想驳特科·可手动 keyi `topicType='kaike'` 议是否办 |
| **G3** | 特科进士 NPC 后果 + UI (D2 三维) | runtime _aiGenerateFullCharacter [扩]·UI 人物志面板 [扩] | (1) 恩科生 affinity+5·"蒙陛下大恩" memorySeed (2) 武举生入营·valor 加权 30 (3) 翻译科生入翻译房 / 理藩院·满汉双语 tag (4) 童子科生年轻·career 长尾 +10 年 (5) 跟现 chars 列表过滤"出身·X 科" |

---

### Phase H·**科举对抗·私学/书院** (player journey Stage 10·新维度 D3·10-14 d)

**核心命题**·私学/书院作为 F1 下行通道·东林党根源·宋元明书院 timeline 演进。

| Slice | 目标 | 涉及文件 | DoD + red line |
|---|---|---|---|
| **H1** | `GM._schoolNetwork` namespace + 5 类书院 (D3 基础) | 新 `web/tm-keju-school-network.js` (~300 行) | (1) namespace·`{official: [], private: [], academy: [], jianghue: [], banned: []}` (2) 5 类·官学·私学·书院·讲会·禁 (3) 朝代 timeline·北宋应天书院·南宋朱熹白鹿洞·元代书院官化·明东林书院·明末复社 (4) 玩家可 monitor / 禁 / 容 / 扶 (5) **新增 1 字段 ch._schoolAffiliation** |
| **H2** | 书院影响力 + F1 派生加强 (D3 二维) | runtime _kjCalcF1 [扩]·新 `_kjCalcSchoolImpact` (~150 行) | (1) F1 = 备考池 / 总士人池·扩·**+ 私学影响力 × 0.3 - 0.2** (私学繁荣短期吸纳 + 长期分裂) (2) `_kjCalcSchoolImpact(school)`·讲会规模 × 影响力 × 党派倾向 (3) F1 < 30·若私学占比 > 50% → 新 event "书院非朝廷" tier1 (4) 跟 Slice F4 言官联动 |
| **H3** | 书院党派·东林/复社·影响选官 (D3 三维) | runtime _kejuExaminerView [扩]·_kejuAggregateGradsEffect [扩] | (1) examiner 出身书院·factionBias +0.2 (2) 进士出身书院·ch.party 自动带书院党 (3) 东林党 = 'private + 应天书院 + 同期同地' (4) 复社 = '应天 + 1620+ + 文学结社' (5) 玩家可 keyi `topicType='school_ban'`·禁/容/扶 三路径 |
| **H4** | 禁书院 toggle + 历史 watershed 事件 (D3 四维) | 新 `web/tm-keju-school-events.js` (~250 行)·event-system 集成 | (1) 历史 watershed·朱熹理学官学化 1190·王阳明心学崛起 1500·东林党争 1604-1625·复社 1629·清禁讲学 1654 (2) 玩家禁书院 → 短期 F1+10·长期 minxin-5·新派系 "书院遗党"·loyalty -15 (3) 玩家扶书院 → F1+15·权臣 tension+5 (4) 跟 Slice E1 mentor 联动·禁 mentor 则禁 disciple |

---

### Phase I·**宦官干预** (player journey Stage 11·新维度 D4·6-9 d)

**核心命题**·明清司礼监批红 + 东厂阅卷·撕裂 examiner factionBias·宦党 (魏忠贤模式)。

| Slice | 目标 | 涉及文件 | DoD + red line |
|---|---|---|---|
| **I1** | `GM._eunuchInterference` namespace + 司礼监批红 (D4 基础·明清专有) | 新 `web/tm-keju-eunuch.js` (~300 行) | (1) namespace·`{secretary: 0, dongchang: 0, partisan: [], history: []}` (2) 仅 `scenario.dynasty in ['明','清']` 启用 (3) `_kjCanEunuchVeto(decision)`·批红 toggle (4) `_kjEunuchInterferenceLevel()`·宦官 corruption + influence × 2 |
| **I2** | 东厂阅卷·examiner factionBias 撕裂 (D4 二维) | runtime _kejuExaminerView [扩]·generateDianshiResults [扩] | (1) 东厂 corruption≥40·examiner factionBias × 1.3 (强化原偏) (2) 东厂 corruption≥60·钦点干预 event "司礼监请陛下钦点 X" (3) 玩家可制衡 (削批红权·剥司礼监 prestige-10)·放任 (背锅·minxin-5·宦党 +5) (4) keyi `topicType='eunuch_check'` (5) Slice D1 殿试代主加第 7 类·司礼监 |
| **I3** | 宦党 (魏忠贤模式) + 反宦联盟 (D4 三维) | runtime _kejuAggregateGradsEffect [扩]·新 `_kjEunuchPartyForm` (~150 行) | (1) 司礼监 corruption > 70 + 政治资本 > 50 → 宦党 spawn "X 党" (2) 进士入宦党·恶名 +5 prestige -5·门生 disgust +20 (3) 反宦联盟 = 东林 + 复社 + 太子党 (4) 改革浪潮触发条件加 D4·宦党 corruption≥60 → "清宦清议" 主题 (5) 弊案 sc16 扩·东厂阅卷舞弊·影响 examiner.tension |

---

### Phase J·三指针闭环 + 改革 + 弊案 + **自然政治触发** (横贯 player journey·7-10 d)

| Slice | 目标 | 涉及文件 | DoD + red line |
|---|---|---|---|
| **J0** (v7 新) | **自然政治触发·6 条件 + 邸报头条 spawn** (跟 Slice B3 路径 C 联动) | 新 `web/tm-keju-natural-triggers.js` (~250 行)·tm-endturn-pipeline-steps.js [扩] | (1) `_kjCheckNaturalTriggers(ctx)` endTurn 钩 (2) 6 条件·F1<25 + 私学占比>40% (走 school_ban) / partyTension≥15 (走 reform) / corruption≥60 (走 scandal) / 东厂≥60 (走 eunuch_check) / 改革派 NPC≥2 (走 reform) / 100 年无改革 (走 reform·fallback) (3) 各条件 cooldown·5/10/15 年防 spawn 爆炸 (4) spawn 邸报头条 + 玩家点击走 A 路径 (5) **不绕过 keyi** (6) 跟 J1 F1/F2/F3 公式联动 |
| **J1** | P.keju.indicators F1/F2/F3 公式化 + endTurn 钩子 (横贯) | runtime _kejuAggregateGradsEffect [扩]·新 `web/tm-keju-indicators.js` (~200 行)·tm-endturn-pipeline-steps.js [扩] | (1) F1·备考池 / 总士人池 × 500 + 私学冲击 (Slice H2) (2) F2·近 9 年新进士 / 总官员 × 400 (3) F3·0.6×偏远进士占比 + 0.4×解额公平度 + 0.2×门生网络多样性 (Slice F1) (4) endTurn `_kjUpdateIndicators(ctx)` (5) **不进 GM.vars 顶栏** |
| **J2** | event-based 反馈循环·F1/F2/F3 tier 化事件 (横贯·非数值滴漏) | 新 `web/tm-keju-events.js` (~400 行) | (1) F1<30 tier1 "公论沸腾" / F1<20 tier2 "罢考请愿" 5+ 联名 / F1<10 tier3 "罢考起义" 新派系 spawn (2) F2<20 "老牌派系强化" / F2<10 "世家清议党崛起" (3) F3<30 "边镇 NPC 上书" / F3<15 "边远士子拒考" 南方解额 -20% (4) **加 D3/D4 联动 event**·F1<25 + 私学占比>40% → "书院非朝廷"·D4 宦党 corruption≥60 → "宦官诬科" (5) "陛下旨" modal·4 选项 |
| **J3** | **改革浪潮 v7·5 触发 + 6 主题池 + D3/D4 联动** (扩 startKejuReform) | tm-keju.js startKejuReform (L1011) [扩]·新 `_kjReformThemePool` (~250 行) | (1) 5 触发·partyTension≥15 / F1<25 / F2<15 / F3<20 / 国库<1000 / 改革派 NPC≥2·任一 + 15 年冷却 (2) 6 主题·王安石经义 / 朱熹理学 / 张居正考成 / 戊戌策论 / 广开科目 / 南北中卷 (3) **加 2 主题**·"清讲学" (D3 触发) / "去宦党" (D4 触发) (4) keyi `topicType='reform'`·accept/reject/defer (5) 改革代价·改革派 prestige+5 loyalty+3·保守派 loyalty-3 tension+2 (6) F1-F3 modifier |
| **J4** | **弊案 sc16 v7·扩 D4 宦官参与触发** (扩 sc16) | 新 `web/tm-keju-scandal.js` (~300 行)·sc16 schema 扩 | (1) 3 选 2·corruption≥50 + tension≥8 + factionBias>0.6 + (v7) 东厂 corruption≥40 (2) memorial 走 sc16 + memorialType='impeach_examiner'·v7 加 'impeach_eunuch_in_exam' (3) keyi `topicType='scandal'`·investigate/dismiss/protect (4) 罢黜·削籍·赐死 3 后果·v7 加"宦党连坐" |

---

### Phase K·UI 双显 + 朝代差异化 + 编辑器 (横贯·8-10 d)

| Slice | 目标 | 涉及文件 | DoD + red line |
|---|---|---|---|
| **K1** | F1/F2/F3 UI 双显·科举弹窗顶部 3 印石 + 民心面板派生 3 行 | tm-keju-runtime.js renderKejuStage (L327) [扩]·tm-authority-ui.js [扩] | (1) 科举弹窗顶部 indicators 区·跟皇威/皇权印石视觉一致 (2) 民心面板 expand "科举派生" 段加 3 行·小字灰色 + sparkline (3) **不进 GM.vars 顶栏** |
| **K2** | 9 朝代 preset 编辑器面 + 剧本 keju.* schema 扩展 (~40 字段·**v7 含 4 新维度字段**) | editor-game-systems.js kejuSystem panel [扩]·tm-keju-presets.js | (1) editor 现 7 字段 → 40+ (2) scenario.keju.{indicators/reformTriggers/scandal/tiers/examInterval/partyTensionInit/convening/historicalFigurePolicy} 全可配 (3) **v7 加**·specialExamCalendar / schoolNetworkInit / eunuchInterferenceInit / discipleGraphSeed (4) **不动 UI 渲染·仅 schema 扩** |
| **K3** | editor 三面补·KejuTier 列表 + F1-F3 阈值 + reformThemes 池 + **4 新维度面** | editor-game-systems.js [扩]·editor-crud.js [扩] | (1) KejuTier 列表 form (2) F1/F2/F3 阈值 3×3=9 input (3) reformThemes 池 (4) 历史进士预置段 (5) **v7 加**·D1 mentor 预设·D2 specialExam 历史 trigger·D3 school 初始网络·D4 eunuch 初始 corruption (6) **不加 personality8D·复用 wuchang** |
| **K4** | timeline 解锁 + 朝代 preset 一键加载 + 编辑器 UI 详细 | tm-keju-presets.js·新 `web/tm-keju-timeline.js` (~200 行)·新 `web/editor-keju-detailed.js` (~500 行) | (1) era 优先·"宋以后糊名"·绝对年份 fallback·糊名 992·誊录 1005·三年制 1065·八股永乐·翻译科 1723 (2) D3 timeline·朱熹 1190·王阳明 1500·东林 1604·复社 1629·清禁讲学 1654 (3) preset selector dropdown·按朝代一键加载 (4) tiers 数组 UI 直观 |

---

## 6·char schema·v7 加 3 新字段 (v6.5 加 1)

```
ch._mentorRef         string  // Slice E1·进士硬指向主考 (v6.5 已有)
ch._cohortYear        number  // Slice F1·同年 cohort 标签 (v7 新)
ch._specialExamType   string  // Slice G1·特科出身标签 (v7 新)
ch._schoolAffiliation string  // Slice H1·书院归属 (v7 新)
```

**rationale**·4 维度全是第一公民·独立字段 ≠ 派生·派生不能承担 graph 边 / 历史标签 / 多对一关系。

**新加 GM 顶层 namespace** (4 个)·

```
GM._discipleGraph         { byMentor, byCohort, byDisciple }  // Slice F1
GM._specialExamCalendar   { enke, wuju, fanyi, tongzi }       // Slice G1
GM._schoolNetwork         { official, private, academy, jianghue, banned }  // Slice H1
GM._eunuchInterference    { secretary, dongchang, partisan, history }  // Slice I1
```

加上 v6.5 已有·

```
GM._factionTension        { 党派: 0-20 }                  // Slice C2 (原 v6.5 Slice 5.5)
GM._mentorIndex           { mentor: [mentees] }            // Slice E1
P.keju.indicators         { f1, f2, f3 }                   // Slice J1
```

---

## 6.5·AI 调用点·**18 处全清单 + v7 影响** (亲读 runtime 后整理)

跨 2 文件 18 处 `callAISmart`·v7 sprint 全程必须**先于编码 review 每处**·判定 keep/扩/重写。

### A·制度 / 触发类 (5 处)

| 行号 | 函数 | 干什么 | tok | 触发 | v7 影响 |
|---|---|---|---|---|---|
| runtime L116 | `initKejuSystem` | 朝代制度配置 (LLM 决定 tiers/interval/特色) | 800 | 开局 / 切剧本 | **重写** (B1·KejuTier 全驱动) |
| runtime L202 | `checkKejuTrigger` | 定期判断是否开科 | 300 | endturn 定时 | **改路径** (B3·spawn 邸报头条·不直接开科) |
| runtime L611 | `runPreliminaryExams` | 地方选拔统计 | 1000 | 进入会试前 | **保留** |
| keju L988 | `requestEnableKeju` | sc0·请求启用评估 | 500 | 玩家点按钮 | **重写** (A1·5 档多 outcome) |
| keju L1037 | `startKejuReform` | sc0·改革评估 | 1000 | 玩家点按钮 | **扩** (A1 + J3·8 主题池) |

### B·主考 / 拟题类 (4 处)

| 行号 | 函数 | 干什么 | tok | 触发 | v7 影响 |
|---|---|---|---|---|---|
| keju L520 | `_kejuGenChiefExaminerMemorial` | 主考奏折·拟会试题 3 候选 | 2000 | 主考钦点后 | **保留** (red line #2) |
| runtime L793 | `examinerProposeTopic` | 主考拟题呈报 | 800 | 玩家点 | **扩** (C3·UI 显主考偏好 + 错配警示) |
| runtime L1042 | `generateDianshiQuestion` | AI 代拟殿试策问 | 500 | 玩家点 | **扩** (D2·UI 显主考偏好) |
| runtime L1320 | `_kejuGenChiefExaminerComments` | 主考点评·开榜后 | _tokC | 开榜内部 | **保留** |

### C·答卷 / 录取类 (5 处)

| 行号 | 函数 | 干什么 | tok | 触发 | v7 影响 |
|---|---|---|---|---|---|
| runtime L872 | `generateHuishiResults` | 会试批卷·LLM 评 N 卷 | 800 | 玩家点开榜 | **保留** |
| runtime L1185 | `generateDianshiResults` meta | 殿试 meta·上下文·题目分析 | 6000 | startDianshi 内 | **扩** (D3·注入 D1/D2/D3/D4 hint) |
| runtime L1239 | `generateDianshiResults` batch | 殿试 20 卷批量生成 + 评分 | 变 | startDianshi 内 | **扩** (D3·examiner hint·_kejuExaminerView) |
| runtime L1377 | `_kejuGenExaminerSuggestions` | 各主考前 3 名建议 | 3000 | 殿试 finalize 前 | **保留** |
| runtime L2481 | `viewAnswer` | 单卷答卷正文·lazy | 1500 | 玩家点[答卷] | **扩** (D4·UI 加 examiner 派生评分) |

### D·议政 / 人物类 (4 处)

| 行号 | 函数 | 干什么 | tok | 触发 | v7 影响 |
|---|---|---|---|---|---|
| runtime L1865 | `_keyiStreamRound` | keyi NPC 2 轮流式发言 | 变 | openKeyiSession 后 | **扩** (B3·prompt 注入 topicType + 议题特定 context) |
| runtime L2037 | `_keyiGenAllStances` | keyi 全员一次性给立场 | 变 | 玩家点付表决 | **扩** (B3·prompt 注入 topicType) |
| runtime L2964 | `_aiGenerateFullCharacter` | 进士全字段生成 | 3000 | crystallize | **重写** (D5·注入 examiner 4 属性 + 4 维度 hint) |
| keju L873 | `pickHistoricalCandidates` | 历史名臣检索 + shiliao 摘引 | ~4k | 殿试前 | **保留** (red line #3) |

### v7 新加 AI 调用 (~6 处·待估)

| 用途 | 涉及 Slice | tok 估 | 说明 |
|---|---|---|---|
| 特科主题生成 | G1·G2 | 800 | 恩科/武举/翻译科 LLM 选合适人物 + 题目 |
| 私学/书院 watershed event | H4 | 600 | 历史 watershed (东林 1604 / 复社 1629) LLM 演绎 |
| 宦官干预 prompt | I2·I3 | 800 | 司礼监批红·东厂阅卷·LLM 决策 spawn |
| 门生上书 event | F2 | 1000 | 门生联名上书 LLM 生成 (恩师致仕/失势/将逝) |
| 同年集会 event | F3 | 1500 | 同年集会 LLM 生成对话 + 议题 |
| 自然政治触发 spawn | J0 | 400 | 6 自然条件触发时 LLM 生成邸报头条文案 |

### 总计

```
现有 18 处 (5 制度+4 主考+5 答卷+4 议政)
v7 改 8 处·保 10 处·新加 6 处
v7 后总 AI 调用点·~24 处

token 总成本估算 (每场常规科举·真实加总)·
  · 制度 init·~3k token (init 跑 1 次·非每场)
  · 主考拟题·~2k token (1 次·_kejuGenChiefExaminerMemorial)
  · 殿试 meta·~6k token (1 次)
  · 殿试 batch·~12-20k token (20 卷·分 4 批 × 3-5k)
  · keyi 公议·**每场 3-5 keyi** (kaike + examiner_pick + 偶尔 question_review/allocation) × ~10k = 30-50k
  · 进士 crystallize·~20-40k token (20 人 × 1-2k·非 3k·实测 _aiGenerateFullCharacter)
  · 历史名臣检索·~4k token (1 次)
  · 主考点评 + 建议·~3k token
  · v7 新加 (每场科举多触发)·
    - 门生上书 (D1·F2)·~1k × 0-2 次 = 0-2k
    - 同年集会 (D1·F3)·~1.5k × 0-1 次 = 0-1.5k
    - 特科 (D2·G)·若有 → +10-15k (单独科举)
    - 书院 watershed (D3·H4)·~0.6k × 0-1 次 = 0-0.6k
    - 宦官 (D4·I2/I3)·~0.8k × 0-2 次 = 0-1.6k
    - J0 自然触发·~0.4k × 0-3 次 = 0-1.2k
  · 总·**~80-130k token / 场** (v6.5 ~70-100k·v7 +15-30%)
```

**v7 design rule**·**AI 调用点不允许新增超过 30%** (现 18 → 上限 24)·否则成本爆炸。

---

## 7·跨 sprint 协调

### 7.1·廷议 sprint·**不再前置锁**

科议走 **keyi (科议·800 行已存)** 不走廷议 v3·两 sprint **并行独立 ship**。

```
廷议 v3·主管"非科举"政治议题 (国策 / 战争 / 礼制)
科议 keyi·主管"科举专属"议题·v7 共 9 类
  activation·制度激活 (Slice A1·v7 新)
  kaike·开科决策 (Slice B3)
  examiner_pick·主考钦点 (Slice C1)
  question_review·题目商议 (Slice C3·v7 新)
  scandal·弊案 (Slice J4)
  reform·改革浪潮 (Slice J3)
  allocation·选官分配 (Slice E3)
  school_ban·禁书院 (Slice H3·v7 新)
  eunuch_check·宦官制衡 (Slice I2·v7 新)
```

### 7.2·6 系统翻新·partyRef entity 化 migration

```
科举 v7 先 ship·char.party 保持字符串·_mentorRef/_schoolAffiliation 也字符串
6 系统翻新做 partyRef entity 化时·
  写 _kjMigrateCharPartyToPartyRef()
  char.party / _mentorRef / _schoolAffiliation 全 string → entity reference
  一次性 migration·后续不维护双轨
```

### 7.3·admin_division design·解额集成

Slice K2 解额跟行政区划集成·若 admin_division 未 ship·用 `_kjDefaultQuotaByDynasty(scenario.dynasty)` fallback。**K2 不 block 在 admin_division 上**。

### 7.4·常朝大改·selfReact 衔接

科举议题在常朝议程时·NPC 反应走常朝大改的 `_ty3_getStanceWithDims` (8D persona)·**不独立维护**。**v7 加**·D1 门生 / D3 书院 / D4 宦官身份会影响 NPC stance dim 加权。

### 7.5·势力 LLM·F1-F3 联动

v7 Slice J1 F1/F2/F3 endTurn 钩子·跟 `_facIndex` (势力反向索引) 联动·势力 derivedHealth 加新维度·**派生科举健康度** (F1×0.3 + F2×0.4 + F3×0.3)。

---

## 8·灰度 / migration / 4 release ship

### 8.1·feature flag (v7 增 4 子 flag)

```js
P.conf.useNewKeju = false           // v7 总开关
P.conf.useNewKejuD1 = false         // 进士长期反馈
P.conf.useNewKejuD2 = false         // 特科
P.conf.useNewKejuD3 = false         // 私学/书院
P.conf.useNewKejuD4 = false         // 宦官干预

function startKejuByMethod(method) {
  if (P.conf.useNewKeju) return _kjV7_startKejuByMethod(method);
  return startKejuByMethod_orig(method);   // 旧路径保留
}
```

### 8.2·4 release ship 节点

```
Release 1.4·Phase A-E 完成 (核心闭环·25-35 d)
  Slice A0-E3·制度激活到授官·5 phase / 17 slice
  flag·useNewKeju=true·useNewKejuD1-D4=false
  ship 1.4.0.0·flag gate 严格·向后兼容
  
Release 1.5·Phase F 完成 (D1·进士长期反馈·12-18 d)
  Slice F1-F4·门生网络 + 言官清议
  flag·useNewKejuD1=true
  ship 1.5.0.0
  
Release 1.6·Phase G+H 完成 (D2+D3·特科 + 书院·18-25 d)
  Slice G1-G3 + H1-H4·特科 + 私学/书院
  flag·useNewKejuD2=true·useNewKejuD3=true
  ship 1.6.0.0
  
Release 1.7·Phase I+J+K 完成 (D4 + 闭环 + 编辑器·20-28 d)
  Slice I1-I3 + J1-J4 + K1-K4·宦官 + 三指针 + 编辑器
  flag·useNewKejuD4=true·全 flag 删除 (1.8 删旧路径)
  ship 1.7.0.0
```

### 8.3·老存档 migration

`_kejuUpgradeExamSchema` v7 重写·

- v6.5 → v7·stage→tier index·dict 字段 → tier object·**首次进游戏自动转换**
- 失败时回退保留旧数据·log warning·**不破坏存档**
- 4 新维度首次启用时·GM 顶层 namespace 自动 init (空)·**无需 migration**

### 8.4·3 级回滚

```
Slice 内·git revert·flag 仍 false·无影响
Phase 内·恢复 phase 起点 commit·跑 smoke·flag rollback
Release 后·下一热更设 P.conf.useNewKeju*=false·旧路径 default
```

### 8.5·scenario 可配 vs hardcode 边界 (v7 扩)

```
scenario 可配 (剧本 override)·
  F1/F2/F3 阈值·indicators.{f1_thresholds, f2_thresholds, f3_thresholds}
  改革浪潮触发·reformTriggers.{...}
  弊案触发·scandal.{...}
  jinshiPerExam (默认 20)·examInterval (默认 3)
  partyTensionInit·reformThemes·tiers·KejuTier[]·朝代 preset
  
  v7 加·
  specialExamCalendar·{enke: [yearList], wuju: [trigger conditions], ...}
  schoolNetworkInit·朝代书院初始网络
  eunuchInterferenceInit·明清初始批红权 / 东厂 corruption
  discipleGraphSeed·历史 mentor-disciple 关系预置 (李善长-胡惟庸·张居正-王锡爵)
  
hardcode (paradigm-level·不可配)·
  crystallization 算法权重 (0.3 籍贯 / 0.6 同党 / etc)
  主考 4 属性派生公式
  F1/F2/F3 标准化系数 (× 500 / × 400)
  8D wuchang 维度名 (跟 char schema 一致)
  
  v7 加·
  discipleStrength 衰减公式 (0.95^year)
  schoolImpact 公式
  eunuchInterferenceLevel 公式
```

---

## 9·timeline·77-109 d (含 buffer 95-135 d·review 重算)

```
Phase A·Prep + 制度激活                5-7 d
  A0     0.5-1 d    通读 + field inventory v7
  A0.3   0.5 d      learning-traits 派生
  A0.5   0.5-1 d    UI 入口
  A0.7   1-1.5 d    paradigm research v7 doc
  A1     2-3 d      制度激活·sc0 多档·重写

Phase B·常规科目筹办                   4-6 d
  B1     1.5-2 d    KejuTier 重构 (激进)
  B2     1.5-2 d    9 朝代 preset
  B3     1 d        kaike keyi 议题

Phase C·主考钦点 + 会试拟题            6-8 d
  C1     1 d        examiner view·4 属性派生
  C2     1.5 d      factionTension + corruption (真新建)
  C3     2-3 d      会试拟题 UX
  C4     1.5 d      经费三级 + UI 显示

Phase D·殿试代主 + 钦点                8-10 d
  D1     1 d        殿试代主 6 身份联动
  D2     1.5 d      AI 代拟 + 玩家亲笔
  D3     1 d        开始殿试 + LLM 答卷
  D4     2-3 d      钦点三甲 + 答卷阅 UX
  D5     2.5-3 d    进士 eager + crystallize 重写

Phase E·授官分配 + 人物志               5-7 d
  E1     1.5 d      mentor 字段 + 反向索引
  E2     1.5 d      党派标签 100%
  E3     2 d        allocation·朝代联动

─────────────────────────── Release 1.4·28-38 d (A+B+C+D+E 真和) ─────────────────────────

Phase F·**进士长期反馈** (D1)           12-18 d
  F1     2-3 d      discipleGraph namespace + 自动构建
  F2     3-4 d      门生上书 event spawn
  F3     2-3 d      同年集会 event
  F4     3-4 d      言官清议·进士背景驱动

─────────────────────────── Release 1.5·12-18 d ─────────────────────────

Phase G·**特科** (D2)                  6-10 d
  G1     2-3 d      specialExamCalendar + 4 类 trigger
  G2     2-3 d      特科 journey·简化版 6 stage
  G3     2-3 d      特科进士 NPC + UI

Phase H·**科举对抗·私学/书院** (D3)    10-14 d
  H1     3-4 d      schoolNetwork + 5 类书院
  H2     2-3 d      书院影响力 + F1 派生
  H3     2-3 d      东林/复社·影响选官
  H4     3-4 d      禁书院 toggle + 历史 watershed

─────────────────────────── Release 1.6·16-24 d (G+H 真和) ─────────────────────────

Phase I·**宦官干预** (D4)              6-9 d
  I1     2-3 d      eunuchInterference namespace + 批红
  I2     2-3 d      东厂阅卷·factionBias 撕裂
  I3     2-3 d      宦党 + 反宦联盟

Phase J·自然触发 + 三指针闭环 + 改革 + 弊案        7-10 d
  J0     1-2 d      自然政治触发·6 条件 + 邸报头条 spawn (v7 新)
  J1     1.5 d      F1/F2/F3 公式 + endTurn 钩子
  J2     2 d        event-based 反馈 + D3/D4 联动
  J3     1.5 d      改革浪潮 v7·+ 2 D3/D4 主题
  J4     1.5 d      弊案 sc16·+ D4 宦官触发

Phase K·UI 双显 + 朝代差异化 + 编辑器   8-10 d
  K1     1.5 d      F1/F2/F3 UI 双显
  K2     2 d        scenario.keju.* schema 扩 + 4 维度字段
  K3     2 d        editor 三面补 + 4 维度面
  K4     2.5 d      timeline 解锁 + preset UI + editor 详细

─────────────────────────── Release 1.7·21-29 d (I+J+K 真和·含 J0) ─────────────────────────

总  ·  **77-109 d** (含 buffer 95-135 d)·分 4 release ship·**v7.1 review 修正后真和**
slice·  ~39 个·11 phase·(v7 加 J0 自然触发后)
预期完成 (按 ~95 d 中位估)·
  Release 1.4 (28-38 d)·2026-06-30 ± 7 d
  Release 1.5 (12-18 d)·2026-07-25 ± 7 d
  Release 1.6 (16-24 d)·2026-08-25 ± 7 d
  Release 1.7 (21-29 d)·2026-09-25 ± 7 d
```

**v7.1 review 修正**·v7 header 写 60-85 d 是 v6.5 残留估·亲算各 phase 真和 = **77-109 d**·相差 17 d (~20%)。**design rule**·后续每加 slice 必同步更新本节总和·禁止再用粗估。

---

## 10·关联文件 (v7)

**核心代码**·

- `web/tm-keju.js` (1076 行) — UI + 启动·改 ~30%
- `web/tm-keju-runtime.js` (3229 行) — 主战场·改 ~40%
- `web/phase8-formal-bridge.js` — Slice A0.5 UI 入口
- `web/tm-authority-ui.js` — Slice K1 民心面板派生
- `web/tm-chaoyi-changchao.js` — Slice C/D/E keyi 议题集成
- `web/tm-faction-action-engine.js` — Slice C2 派系联动
- `web/tm-corruption-engine.js` — Slice C2 corruption 派生
- `web/tm-endturn-pipeline-steps.js` — Slice J1 endturn 钩子
- `web/tm-office-system.js` — Slice E3 选官分配
- `web/tm-three-systems-ui.js` — Slice E1 mentor UI

**新建文件** (~16 个)·

```
web/tm-keju-tier.js                 Slice B1·KejuTier 数据结构 (~200 行)
web/tm-keju-presets.js              Slice B2·9 朝代 preset (~500 行)
web/tm-keju-activation.js           Slice A1·制度激活 (~250 行)
web/tm-keju-learning-traits.js      Slice A0.3·学派派生 (~80 行)
web/tm-keju-tension.js              Slice C2·派系紧张度 (~250 行)
web/tm-keju-corruption.js           Slice C2·corruption 派生 (~120 行)
web/tm-keju-question-ui.js          Slice C3·题目 UX (~250 行)
web/tm-keju-mentor.js               Slice E1·mentor 反向索引 (~200 行)
web/tm-keju-allocation.js           Slice E3·选官分配 (~350 行)
web/tm-keju-disciple-graph.js       Slice F1·门生图 (~300 行)
web/tm-keju-disciple-events.js      Slice F2·门生上书 (~250 行)
web/tm-keju-cohort-meet.js          Slice F3·同年集会 (~200 行)
web/tm-keju-special-exams.js        Slice G1·特科 trigger (~350 行)
web/tm-keju-special-exam-runner.js  Slice G2·特科 journey (~250 行)
web/tm-keju-school-network.js       Slice H1·书院网络 (~300 行)
web/tm-keju-school-events.js        Slice H4·书院 watershed (~250 行)
web/tm-keju-eunuch.js               Slice I1·宦官干预 (~300 行)
web/tm-keju-indicators.js           Slice J1·F1/F2/F3 公式 (~200 行)
web/tm-keju-events.js               Slice J2·event-based 反馈 (~400 行)
web/tm-keju-scandal.js              Slice J4·弊案 v7 (~300 行)
web/tm-keju-timeline.js             Slice K4·timeline 解锁 (~200 行)
editor-keju-detailed.js             Slice K4·编辑器 UI (~500 行)
```

**doc / memory**·

- `web/docs/keju-overhaul-sprint.md` (本 doc·v7)
- `web/docs/keju-overhaul-sprint-v6.5-snapshot.md` (v6.5 归档)
- `web/docs/keju-overhaul-sprint-history-v1-v5.md` (v1-v5 历史)
- `web/docs/keju-field-inventory-v7.md` (Slice A0 输出·待建)
- `web/docs/keju-paradigm-research-v7.md` (Slice A0.7 输出·待建·含 4 新维度)
- `web/docs/keju-backlog-chaju-jiupin.md` (察举/九品 backlog·待建)
- memory `project_keju_overhaul_sprint` — 本 sprint pointer
- memory `project_admin_division_design` — 解额跟行政区划集成
- memory `project_faction_center_layers` — 派系系统集成
- memory `project_chaoyi_changchao_backlog` — 朝议 v3 议题化
- memory `feedback_refactor_not_reskin` — paradigm 应不应改 (v7 激进许可)
- memory `feedback_runtime_renderer_canonical_for_schema` — runtime 才是权威
- memory `feedback_editor_game_relation` — 三面同步
- memory `feedback_tool_vs_system_costs` — 工具 vs 系统代价
- memory `feedback_audit_layers_ui_vs_mechanic` — 三层穿透 + 反馈循环
- memory `feedback_no_mystic_penalties` — F1-F3 自然政治后果
- memory `feedback_conservative_slicing` — ~38 slice 一刀一事

---

# 附录 A·12 条 red line (实施期 lock·v6.5 → v7 继承)

见 §4·全程严守。

---

# 附录 B·新维度 namespace 数据结构详记

### B.1·GM._discipleGraph (Slice F1·D1 基础)

```js
GM._discipleGraph = {
  byMentor: {
    "张居正": { disciples: ["王锡爵", "申时行"], strength: { "王锡爵": 85, "申时行": 78 } },
    ...
  },
  byCohort: {
    "1583": { members: ["王锡爵", "李三才", ...], events: [...] },
    ...
  },
  byDisciple: {
    "王锡爵": { mentor: "张居正", cohort: "1583", strength: 85, lastInteraction: 1599 },
    ...
  }
};

// 计算门生强度
function getDiscipleStrength(mentor, disciple) {
  const edge = GM._discipleGraph.byDisciple[disciple];
  if (!edge || edge.mentor !== mentor) return 0;
  const yearGap = GM.year - edge.lastInteraction;
  return edge.strength * Math.pow(0.95, yearGap);
}
```

### B.2·GM._specialExamCalendar (Slice G1·D2 基础)

```js
GM._specialExamCalendar = {
  enke: [
    { year: 1620, reason: "皇帝大婚", triggered: true, jinshi: ["崔呈秀", ...] }
  ],
  wuju: [
    { year: 1619, reason: "辽东危机", triggered: true, generals: ["袁崇焕", ...] }
  ],
  fanyi: [    // 仅清朝 1723+
    { year: 1725, reason: "雍正初·满汉融合", graduates: [...] }
  ],
  tongzi: [
    { year: 1622, reason: "神童 event", child: "黄道周" }
  ]
};

// 触发检查·endTurn
function _kjCheckSpecialExamTriggers(ctx) {
  // 恩科·皇帝寿诞 / 大婚 / 万寿
  if (ctx.eventBus.includes("皇帝大寿") && !_kjHasRecentEnke(GM.year, 5)) {
    return { type: "enke", reason: "皇帝大寿" };
  }
  // 武举·边镇危机 + 缺将
  if (_kjBorderCrisisLevel() >= 3 && !_kjHasRecentWuju(GM.year, 3)) {
    return { type: "wuju", reason: "边镇危机" };
  }
  // 翻译科·清雍正后
  if (scenario.dynasty === "清" && GM.year >= 1723 && !_kjHasRecentFanyi(GM.year, 10)) {
    return { type: "fanyi", reason: "民族议题" };
  }
  // 童子科·神童 event
  if (ctx.recentEvents.find(e => e.type === "神童")) {
    return { type: "tongzi", reason: "神童 event" };
  }
  return null;
}
```

### B.3·GM._schoolNetwork (Slice H1·D3 基础)

```js
GM._schoolNetwork = {
  official: [    // 官学·国子监 / 府学 / 州学 / 县学
    { name: "国子监", level: "central", influence: 100, students: [...] },
    ...
  ],
  private: [   // 私学
    { name: "湖湘私学", region: "湖南", influence: 30, ... },
    ...
  ],
  academy: [   // 书院
    { 
      name: "东林书院", 
      region: "无锡", 
      founder: "顾宪成", 
      foundedYear: 1604, 
      influence: 75,
      faction: "东林党",
      members: ["高攀龙", "钱一本", ...] 
    },
    ...
  ],
  jianghue: [  // 讲会·event-driven 短期聚会
    { name: "首善书院讲会", year: 1622, attendees: [...], topic: "时政" }
  ],
  banned: [    // 被禁
    { name: "首善书院", bannedYear: 1625, banReason: "魏忠贤诬告" }
  ]
};
```

### B.4·GM._eunuchInterference (Slice I1·D4 基础)

```js
GM._eunuchInterference = {
  secretary: 50,         // 司礼监批红权·0-100·>70 强干预
  dongchang: 30,         // 东厂干预度·0-100·阅卷 / 监察
  partisan: ["崔呈秀", "顾秉谦"],    // 宦党成员·从 NPC chars 派生
  history: [
    { year: 1620, event: "司礼监批红开科" },
    { year: 1623, event: "东厂查弊·诬陷东林" },
    ...
  ]
};

function _kjEunuchInterferenceLevel() {
  return (GM._eunuchInterference.secretary + GM._eunuchInterference.dongchang) / 2;
}

function _kjCanEunuchVeto(decision) {
  if (scenario.dynasty !== "明" && scenario.dynasty !== "清") return false;
  return GM._eunuchInterference.secretary > 70;
}
```

---

# 附录 C·algorithm 公式表

## C.1·F1 士人吸纳率 (Slice J1·v7 加 D3 私学冲击)

```js
function _kjCalcF1() {
  const candidatePool = GM.chars.filter(c =>
    c.alive && /秀才|举人|生员|监生|童生/.test(c.title || '')
  ).length;
  const totalScholarPool = scenario.demographics?.totalScholars 
    || _kjEstimateScholarPool(scenario.dynasty, GM.year);
  const baseRatio = candidatePool / Math.max(totalScholarPool, 1);
  
  // v7 加·D3 私学冲击
  const schoolImpact = _kjCalcSchoolImpact();  // 私学繁荣·短期吸纳 + 长期分裂
  const adjustedRatio = baseRatio + schoolImpact * 0.3 - 0.2;
  
  return Math.min(100, Math.max(0, adjustedRatio * 500));
}
```

**衰减率**·`alpha = 0.95^N` (N 年无科)。

**阈值**·F1<30 tier1·F1<20 tier2·F1<10 tier3·v7 加·F1<25 + 私学占比>40% → "书院非朝廷" event。

## C.2·F2 官僚流动率 (Slice J1)

```js
function _kjCalcF2() {
  const recentJinshi = (P.keju.history || []).filter(exam =>
    exam.examYear >= GM.year - 9 && exam.placements
  ).reduce((sum, exam) => sum + exam.placements.length, 0);
  const totalOfficials = GM.chars.filter(c =>
    c.alive && c.officialTitle && c.officialTitle !== '草民'
  ).length;
  const ratio = recentJinshi / Math.max(totalOfficials, 1);
  return Math.min(100, Math.max(0, ratio * 400));
}
```

## C.3·F3 文化整合度 (Slice J1·v7 加 D1 门生网络多样性)

```js
function _kjCalcF3() {
  const peripheryProvinces = ['云南', '贵州', '陕西', '甘肃', '广西', '宁夏', '辽东', '蜀'];
  const all9YearJinshi = (P.keju.history || [])
    .filter(exam => exam.examYear >= GM.year - 9)
    .flatMap(exam => exam.placements || []);
  const peripheryJinshi = all9YearJinshi.filter(j =>
    peripheryProvinces.some(p => (j.birthplace || j.origin || '').includes(p))
  ).length;
  const peripheryRatio = peripheryJinshi / Math.max(all9YearJinshi.length, 1);
  
  const quotaList = Object.values(scenario.demographics?.quotaByProvince || {});
  const quotaFairness = 1 / (1 + _stdev(quotaList) / Math.max(_mean(quotaList), 1));
  
  // v7 加·D1 门生网络多样性
  const mentorDiversity = _kjMentorDiversity();  // 不同 mentor 的进士占比
  
  return Math.min(100, Math.max(0,
    0.6 * peripheryRatio * 250
    + 0.4 * quotaFairness * 100
    + 0.2 * mentorDiversity * 100
  ));
}
```

## C.4·主考 4 属性派生 (Slice C1·复 v6.5)

```js
function _kejuExaminerView(ch) {
  const learningTraits = _kjInferLearningTraits(ch.learning || '');
  return {
    preferContent: /* 复 v6.5 */,
    preferRegion: ch.birthplace || ch.origin || null,
    strictness: Math.min(100, Math.max(0, 
      (ch.integrity || 50) * 0.6 + (ch.wuchang?.li || 50) * 0.4
    )),
    factionBias: ((ch.party && ch.party !== '中立') ? 0.6 : 0.2)
      + (ch.ambition || 50) / 200
      + (ch.loyalty || 50) / 400
      
    // v7 加·D4 东厂干预放大
    * (1 + (GM._eunuchInterference?.dongchang >= 40 ? 0.3 : 0))
  };
}
```

## C.5·进士 crystallization (Slice D5·v7 重写)

```js
function crystallizeKejuGrad_v7(examiner, examYear, rank, slot) {
  const view = _kejuExaminerView(examiner);
  const historicalHit = exam.historicalHits?.find(h => h.rank === rank);
  if (historicalHit) {
    return _aiGenerateFullCharacter_v7(historicalHit, _kjRankKey(rank));
  }
  
  // v7 prompt 重写·注入 4 维度 hint
  const seed = view.preferRegion + '_' + examYear + '_' + rank + '_' + slot + '_' + (GM._runId || '0');
  const candidateHint = {
    examinerParty: examiner.party,
    examinerPreferContent: view.preferContent,
    examinerPreferRegion: view.preferRegion,
    examinerFactionBias: view.factionBias,
    rank, examYear,
    expectedParty: Math.random() < view.factionBias ? examiner.party : null,
    
    // v7 加·4 维度 hint
    cohortYear: examYear,                                          // D1
    schoolAffiliation: _kjPickSchoolForJinshi(view, rank),         // D3
    eunuchPressureLevel: _kjEunuchInterferenceLevel(),             // D4
    specialExamType: null  // 常规科填 null·特科 G2 填具体 type    // D2
  };
  
  return _aiGenerateFullCharacter_v7(candidateHint, _kjRankKey(rank));
}
```

## C.6·改革浪潮 v7·8 触发 (Slice J3·v6.5 5 触发 + v7 加 3)

```js
function _kjReformTriggers_v7() {
  if (GM._reformCooldown && GM.year < GM._reformCooldown) return null;
  
  const partyTension = _kjCalcTotalPartyTension();
  if (partyTension >= 15) return { reason: 'partyTension' };
  
  const ind = P.keju.indicators;
  if (ind.f1 < 25) return { reason: 'F1_too_low' };
  if (ind.f2 < 15) return { reason: 'F2_too_low' };
  if (ind.f3 < 20) return { reason: 'F3_too_low' };
  
  if ((GM.guoku?.money || 0) < 100000) return { reason: 'treasury_crisis' };
  
  const reformistOnTop = GM.chars.filter(c =>
    c.alive && c.rank && _cyRankLevelOf(c.rank) <= 4 &&
    c.party && /改革|维新/.test(c.party)
  );
  if (reformistOnTop.length >= 2) return { reason: 'reformist_rising' };
  
  // v7 加 3 触发
  if (ind.f1 < 30 && _kjPrivateSchoolRatio() > 0.4) return { reason: 'private_school_surge' };
  if (GM._eunuchInterference?.dongchang >= 60) return { reason: 'eunuch_dominance' };
  
  const lastReform = (P.keju.reforms || []).slice(-1)[0];
  if (lastReform && GM.year - lastReform.year >= 100) return { reason: 'timer_fallback' };
  
  return null;
}
```

**8 主题** (v6.5 6 + v7 2)·王安石经义 / 朱熹理学 / 张居正考成 / 戊戌策论 / 广开科目 / 南北中卷 / **清讲学** (v7·D3) / **去宦党** (v7·D4)。

## C.7·弊案 sc16 v7·3 选 2 + D4 扩 (Slice J4)

```js
function _kjScandalTriggers_v7(examOutcome) {
  const condA = _corrCalcExaminerCorruption(examOutcome.examiner) >= 50;
  const condB = _kjEnemyPartyTension(examOutcome.examiner) >= 8;
  const condC = examOutcome.examinerView?.factionBias > 0.6 
    && _kjSamePartyAcceptRatio(examOutcome) > 0.7;
  
  // v7 加·D4 东厂干预触发
  const condD = (GM._eunuchInterference?.dongchang || 0) >= 40 
    && examOutcome.eunuchInvolvement;
  
  const matched = [condA, condB, condC, condD].filter(Boolean).length;
  if (matched >= 2) {
    return {
      severity: matched >= 3 ? 'major' : 'minor',
      reasons: [
        condA && 'corruption', 
        condB && 'partyConflict', 
        condC && 'factionBias',
        condD && 'eunuchInterference'  // v7 加
      ].filter(Boolean),
      accuserPool: _kjGetEnemyParties(examOutcome.examiner.party).flatMap(p => _kjGetPartyLeaders(p))
    };
  }
  return null;
}
```

---

# 附录 D·朝代 JSON preset (v7·含 4 新维度字段)

### D.1·明朝·完整 v7

```json
{
  "keju": {
    "system": "kj",
    "tiers": [
      {"name": "县试", "level": "county",       "interactive": false, "daysCost": 20},
      {"name": "府试", "level": "prefecture",   "interactive": false, "daysCost": 20},
      {"name": "院试", "level": "province_pre", "interactive": false, "daysCost": 20},
      {"name": "乡试", "level": "province",     "interactive": false, "daysCost": 90},
      {"name": "会试", "level": "national",     "interactive": true,  "daysCost": 60},
      {"name": "殿试", "level": "imperial",     "interactive": true,  "daysCost": 30}
    ],
    "examInterval": 3,
    "jinshiPerExam": 20,
    "convening": {
      "requiredCallList": ["首辅", "次辅", "吏部尚书", "户部尚书", "礼部尚书"],
      "topicSpecificRequired": {
        "examiner_pick": ["首辅", "次辅", "礼部尚书", "翰林学士"],
        "scandal":       ["都察院左都御史", "刑部尚书", "锦衣卫指挥"],
        "school_ban":    ["礼部尚书", "国子监祭酒", "首辅"],
        "eunuch_check":  ["都察院左都御史", "首辅", "兵部尚书"]
      }
    },
    
    "specialExamCalendar": {
      "enke_triggers": ["皇帝大寿", "皇帝大婚", "万寿"],
      "wuju_interval": 3,
      "wuju_trigger_threshold": 3
    },
    
    "schoolNetworkInit": {
      "academy": [
        {"name": "东林书院", "region": "无锡", "founder": "顾宪成", "foundedYear": 1604, "faction": "东林党"},
        {"name": "首善书院", "region": "京师", "founder": "邹元标", "foundedYear": 1622}
      ]
    },
    
    "eunuchInterferenceInit": {
      "secretary": 50,
      "dongchang": 30
    },
    
    "discipleGraphSeed": [
      {"mentor": "张居正", "disciples": ["王锡爵", "申时行"], "year": 1572},
      {"mentor": "顾宪成", "disciples": ["高攀龙", "钱一本"], "year": 1594}
    ]
  }
}
```

### D.2·宋朝·v7

```json
{
  "keju": {
    "system": "kj",
    "tiers": [
      {"name": "解试", "level": "local",     "interactive": false, "daysCost": 60},
      {"name": "省试", "level": "national",  "interactive": true,  "daysCost": 90},
      {"name": "殿试", "level": "imperial",  "interactive": true,  "daysCost": 30}
    ],
    "examInterval": 3,
    "jinshiPerExam": 30,
    "convening": {
      "requiredCallList": ["左相", "右相", "枢密使"]
    },
    "schoolNetworkInit": {
      "academy": [
        {"name": "白鹿洞书院", "founder": "朱熹", "foundedYear": 1180},
        {"name": "应天书院", "founder": "戚同文", "foundedYear": 1010}
      ]
    },
    "eunuchInterferenceInit": {
      "secretary": 0,
      "dongchang": 0
    }
  }
}
```

### D.3·清朝·v7

```json
{
  "keju": {
    "system": "kj",
    "tiers": [
      {"name": "县试", "level": "county",       "interactive": false, "daysCost": 20},
      {"name": "府试", "level": "prefecture",   "interactive": false, "daysCost": 20},
      {"name": "院试", "level": "province_pre", "interactive": false, "daysCost": 20},
      {"name": "乡试", "level": "province",     "interactive": false, "daysCost": 90},
      {"name": "会试", "level": "national",     "interactive": true,  "daysCost": 60},
      {"name": "殿试", "level": "imperial",     "interactive": true,  "daysCost": 30}
    ],
    "examInterval": 3,
    "jinshiPerExam": 25,
    "specialExamCalendar": {
      "fanyi_startYear": 1723,
      "fanyi_interval": 10
    },
    "eunuchInterferenceInit": {
      "secretary": 30,
      "dongchang": 20
    }
  }
}
```

### D.4·汉朝·察举 v7 (stub·backlog)

```json
{
  "keju": {
    "system": "chaju",
    "enabled": false,
    "alternativeSystem": "察举·孝廉/茂才/贤良方正/童子 4 科·岁举"
  }
}
```

### D.5·魏晋·九品中正 v7 (stub·backlog)

```json
{
  "keju": {
    "system": "jpzz",
    "enabled": false,
    "alternativeSystem": "九品中正·中正官品评·上下九品·门阀士族优先",
    "specialRules": "上品无寒门·下品无势族"
  }
}
```

### D.6·唐 / 元朝 v7

(参 v6.5·tiers + jinshiPerExam·v7 加 schoolNetworkInit 空 / eunuchInterferenceInit 空)

---

# 附录 E·UI mockup·player journey 关键截图

## E.1·Stage 1·制度激活·sc0 多档 (Slice A1)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 📜 科举·制度议·汉初太学时期 (公元前 124 年)                   [✕]      │
├──────────────────────────────────────────────────────────────────────────┤
│  陛下提议·"当此孝武皇帝盛世·遵祖宗仁政·议开科取士"                    │
│                                                                           │
│  廷臣议论·                                                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                       │
│  │ 改革派 (5)  │ │ 中间派 (3)  │ │ 保守派 (4)  │                       │
│  │ ✓ 全准      │ │ ⚠ 缓        │ │ ✗ 拒        │                       │
│  └─────────────┘ └─────────────┘ └─────────────┘                       │
│                                                                           │
│  sc0 评估·                                                                │
│  · 国库 12 万·支持开科                                                   │
│  · 士林尚薄·建议 3 年试点开科·部分省试行                                │
│  · 建议 outcome·有限·北方 6 省试·南方暂缓                              │
│                                                                           │
│  ▼ 选择路径·                                                              │
│   [✓ 全准·全国开科]  [⚖ 有限·3 年北方 6 省试]  [⏸ 缓·5 年后再议]      │
│   [⚙ 改·走科举改革议]  [✗ 拒·保察举旧制]                              │
└──────────────────────────────────────────────────────────────────────────┘
```

## E.2·Stage 6·钦点三甲 + 答卷阅 (Slice D4·v7 加 examiner view)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 📜 科举·天启七年·殿试·亲点三甲              [✕ 退]                    │
├──────────────────────────────────────────────────────────────────────────┤
│  皇威 75   皇权 52   民心 70                                              │
│  F1 58·良  F2 23·**低·门阀化警告**  F3 76·良                            │
│                                                                           │
│  主考·钱龙锡·                                                             │
│   偏好内容·朱熹理学  偏好籍贯·江浙  严格度 78  派系偏向 0.72 (高·东林)  │
│   ⚠ 警示·若钦点非东林籍贯·tension+3·prestige+5·非主考前 3 建议         │
│                                                                           │
│  当前钦定·                                                                │
│   🥇 状元·???   🥈 榜眼·???   🥉 探花·???                            │
│                                                                           │
│  20 卷读卷候来·                                                           │
│   第 1·张三 史 22 岁 浙江上虞 寒门 92                                    │
│      [答卷] [🥇状元] [🥈榜眼] [🥉探花]                                   │
│   第 2·李四 史 24 岁 江苏苏州 士族 90·东林                              │
│      [答卷] [🥇状元] [🥈榜眼] [🥉探花]                                   │
│   ...                                                                     │
│                                                                           │
│  [📜 钦定·张榜天下] (需先钦三甲)                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## E.3·Stage 8·门生上书 event (Slice F2·v7 新)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 📜 朝议·门生联名上书·万历四十六年                          [✕]          │
├──────────────────────────────────────────────────────────────────────────┤
│  事由·                                                                    │
│   申时行 (致仕·1591) 不日将逝。其门生王锡爵 (内阁) / 高攀龙 (东林)      │
│   等 22 人联名上书·请陛下御赐祭文·追谥"文襄"。                          │
│                                                                           │
│  门生网络·                                                                │
│   ├ 王锡爵 (内阁首辅·东林) ─── 强度 85                                    │
│   ├ 高攀龙 (东林党魁) ────── 强度 78                                     │
│   ├ 顾宪成 (东林创立) ────── 强度 70                                     │
│   └ 其余 19 门生·强度 50-65                                              │
│                                                                           │
│  ▼ 处置·                                                                  │
│   [✓ 御赐祭文 + 追谥"文襄"] (东林 affinity+10·门生 +5·阉党 -3)          │
│   [▣ 仅御赐祭文]            (东林 affinity+5·中性)                       │
│   [□ 留中不发]              (东林 -3·门生 -10·言官清议)                  │
│   [✗ 罢门生上书]            (东林 -15·门生 -30·危·结党风险 +20)         │
└──────────────────────────────────────────────────────────────────────────┘
```

## E.4·Stage 11·宦官干预·东厂阅卷 (Slice I2·v7 新)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 📜 司礼监请·东厂请阅会试卷·天启七年               [✕]                  │
├──────────────────────────────────────────────────────────────────────────┤
│  事由·                                                                    │
│   司礼监掌印太监魏忠贤奏·"会试卷中或有东林党人·请陛下允东厂参阅·       │
│   查核有无党争痕迹。"                                                     │
│                                                                           │
│  现况·                                                                    │
│   司礼监批红权 65·东厂干预度 50·宦党 4 人 (崔呈秀 / 顾秉谦 / ...)        │
│   主考钱龙锡·东林籍·factionBias 0.72                                    │
│                                                                           │
│  风险评估·                                                                │
│   若准·examiner factionBias 加 30% → 0.94·钦点强偏东林反方              │
│   若准·宦党 corruption+5·宦党 affinity+10·东林 tension+8                │
│   若准·若钦点反东林状元·东林清议党争 +15                                │
│                                                                           │
│  ▼ 处置·                                                                  │
│   [⚖ 制衡·剥东厂阅卷权] (司礼监 prestige-10·宦党 -5·东林 +5)            │
│   [▣ 准·限东厂阅 5 卷]   (东厂 corruption+3·主考被牵制)                 │
│   [✓ 准·全数 20 卷]      (宦党 corruption+8·东林 tension+15·结党高发)   │
│   [✗ 拒·明谕司礼监不可]  (司礼监 -15·魏忠贤 enmity·宦党反扑风险)        │
└──────────────────────────────────────────────────────────────────────────┘
```

## E.5·三指针 UI·科举弹窗顶部 (Slice K1)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 📜 科举·天启七年九月·会试阶段        [✕ 退]                            │
├──────────────────────────────────────────────────────────────────────────┤
│  皇威 ▓▓▓▓▓▓▓░░░ 75      皇权 ▓▓▓▓▓░░░░░ 52      民心 ▓▓▓▓▓▓▓░░░ 70 │
│  ─────────────────────────────────────────────────────────────────       │
│  📊 科举派生指标 (v7·含 4 新维度)·                                       │
│   F1 士人吸纳 ▓▓▓▓▓▓░░░░ 58·良·会试报名 1240 人·私学占比 35%             │
│   F2 官僚流动 ▓▓░░░░░░░░ 23·**低·门阀化警告**·近 9 年新进士占官 4%      │
│   F3 文化整合 ▓▓▓▓▓▓▓▓░░ 76·良·边远进士 18%·门生网络多样性 0.62          │
│   ─                                                                       │
│   D1 门生网络·89 活·8 cohort·最近上书 1 (东林请祭)                       │
│   D3 书院·东林+复社 + 首善·影响力 75·1 被禁 (首善·1625)                │
│   D4 宦官·司礼监 65·东厂 50·宦党 4 人 ⚠ 干预阅卷请求中                  │
│  ─────────────────────────────────────────────────────────────────       │
│  ▼ 会试阶段·                                                              │
│   ...                                                                    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

# 附录 F·历史版本链接

| 版本 | 日期 | 核心 | 章节 |
|---|---|---|---|
| **v1** | 2026-05-22 | 初稿·B+ paradigm 三层架构·16 slice / 35-50 d | history-v1-v5.md |
| **v2** | 2026-05-22 | 算法+接口+缺漏+ship·19 slice / 36-55 d | history-v1-v5.md |
| **v3** | 2026-05-22 | game audit·21 slice / 39.5-58.5 d | history-v1-v5.md |
| **v4** | 2026-05-23 | paradigm-audit·24 slice / 44-65.5 d | history-v1-v5.md |
| **v5** | 2026-05-23 | runtime read·14 函数 [new]→[modified]·22 slice / 31-46.5 d | history-v1-v5.md |
| **v6** | 2026-05-23 | 整理版·12 red line·25-36 d | v6.5-snapshot.md |
| **v6.5** | 2026-05-23 | 27 玩家操作清单·4 新 slice·26 slice / 28-40 d | v6.5-snapshot.md |
| **v7** | 2026-05-23 | 激进 paradigm reset + player journey 11 stage + 4 新维度 + 4 release ship·~38 slice / 60-85 d | 整文 |
| **v7.1** (本 doc) | **2026-05-23** | **keyi 触发 paradigm 修正·亲读 runtime 后纠正·9 议题 (非 7/8) + J0 自然触发 + §6.5 AI 18 处全清单 + 内审 8 处一致性 + timeline 重算 (60-85→77-109 d)·~39 slice** | §3.5 + B3 + J0 + 6.5 + review |

---

# Sprint 启动 checklist

- [ ] **User 拍板正式启动 v7**
- [x] 1.2.4.4 已 ship (常朝 NPC augment 修复)
- [ ] 创建 v7 sprint 主 task·**~39 子任务**挂上 (Phase A-K·全部 slice·含 J0)·按"开发顺序"链 blockedBy
- [ ] 4 release milestone task·1.4 / 1.5 / 1.6 / 1.7
- [ ] doc commit 进 git history·避免 disk 满丢失 (v5 教训)
- [ ] **每 Slice 实施前 review 该 Slice 对应的 red line·若触碰需明示讨论**
- [ ] **每 Release 完成时 review 该 release 覆盖 player journey stage 的端到端体验·非 slice 级 smoke**

**下一步·user 拍板 → 启动 Phase A·5 slice (A0 / A0.3 / A0.5 / A0.7 / A1) 同时开。**

---

**plan v7.1 review 修正完成** (2026-05-23·亲读 runtime + 内审 8 处一致性)·v6.5 (~1400 行) → v7 (~1600 行) → **v7.1 (~1450 行)**·**激进 paradigm reset + player journey 11 stage + 4 新维度 D1/D2/D3/D4 + 4 release 分阶段 ship + keyi 9 议题 + J0 自然触发**·**~39 slice / 11 phase / 77-109 d**·所有 v1-v6.5 决定 + 23 亮点 + 12 red line + 4 新维度·**真 ready**。

**v7 vs v6.5 核心增量**·

```
+ 结构重组·按 player journey 11 stage·不按技术层
+ paradigm 激进·8 阶段引擎重构 KejuTier·crystallize 重写·lazy 全删
+ D1·进士长期反馈·门生网络永远活·12-18 d
+ D2·特科·恩科/武举/翻译科/童子科·6-10 d
+ D3·私学/书院对抗·F1 下行通道·东林党根源·10-14 d
+ D4·宦官干预·明清专有·撕裂 examiner factionBias·6-9 d
+ 4 release 分阶段 ship·1.4 / 1.5 / 1.6 / 1.7
+ 7 新 keyi 议题 (共 9 类)·activation / question_review / school_ban / eunuch_check + 4 v6.5 (kaike/examiner_pick/scandal/reform/allocation 已有)
+ keyi 头部接参化 + 3 触发路径整合 (玩家主动 / LLM 定时 / 自然政治·全走 keyi)
+ J0 自然政治触发 (6 条件 + 邸报头条 spawn)
+ 4 新 GM 顶层 namespace·discipleGraph / specialExamCalendar / schoolNetwork / eunuchInterference
+ 3 新 char 字段·_cohortYear / _specialExamType / _schoolAffiliation
+ 改革浪潮 6 → 8 主题·加 D3/D4 触发
+ 弊案 sc16·3 选 2 → 4 选 2·加 D4 东厂参与
+ F1/F2/F3 公式·加 D3 私学冲击 / D1 门生网络多样性
```
