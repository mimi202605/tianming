# 科举大改 sprint·实施计划 (v6.5·玩家操作补全版)

**状态**·plan 阶段·**等 user 批准开工**
**创建**·2026-05-22 (v1) → **2026-05-23 v6 整理 → v6.5 玩家操作补全**
**预计工时**·**28-40 天** (含 buffer 34-51 d)·**26 slice**·6 phase
**风险**·中·tm-keju-runtime 4305 行核心改动·但 95% paradigm 保留 (亮点 [unchanged])·**真新建仅 18-23 d**
**v6.5 变更**·v6 漏 6 类玩家操作 (殿试亲笔策问 / 钦点三甲 UX / 殿试代主明确保留 / 制度激活 UX / 答卷阅读 / 主考拟题审阅)·**插 4 slice (2.5 / 7.5 / 8.5 / 8.6)·+3-4 d·全闭环 27 操作**
**历史**·v1-v6 audit 详记见 `web/docs/keju-overhaul-sprint-history-v1-v5.md`·**本文档是最终整理版·覆盖所有决定**

---

## 1·目标

科举从"出人物工具"升级为"**N 年一次的政治大事件·党争·选官分配·改革派斗争**"·**整个中国古代覆盖**·跨朝代共性 paradigm 作主干·朝代差异化作 modifier。

**4 个 user 关注要素**·

1. **N 年一次政治大事件** — 默认 3 年一科·朝代 modifier·每场牵动整朝廷·走科议演绎
2. **党争** — 主考派系决定录取倾向·进士默认派系标签·跟现有党派系统集成
3. **选官分配** — 朝代联动·唐释褐试 / 宋直授 / 元四等差额 / 明清翰林 庶吉士 三甲·NPC 派系角逐
4. **改革派斗争** — **自然政治触发** (党争/F1-F3/国库/改革派 NPC)·非 timer·改革派 vs 保守派议演

**核心 design rule** (4 条·全 sprint 实施期遵守)·

- ✅ `feedback_refactor_not_reskin` — paradigm 应不应改·先问 → **95% 现 paradigm 不动·仅数学化 + 体系化**
- ✅ `feedback_runtime_renderer_canonical_for_schema` — runtime 才是权威 → 函数标 [unchanged] / [modified] / [new] 明示
- ✅ `feedback_editor_game_relation` — 三面 (编辑器+运行时+AI) 同步 → 利用现有 wuchang / 6 数值编辑器·扩展 AI prompt
- ✅ `feedback_tool_vs_system_costs` — 工具 vs 系统 → 5 议题类型全用 council/edict/defy 三 tier 代价

---

## 2·共性 paradigm·6 不变量

从 1300+ 年科举史 (隋 605 → 清 1905) 提取的 6 轴不变量·plan v1-v6 一直未变·

| 共性轴 | 不变 paradigm |
|---|---|
| **A·权力博弈** | 皇权 vs 文官集团 vs 地方·三向指针 + 4 条侵蚀路径 (恩荫/捐纳/行卷/冒籍) toggle |
| **B·筛选结构** | N 级状态机·人数指数衰减·主考从地方到皇帝·顶级不再黜落只排序 |
| **C·主考官** | 主考实体 (派系/学派/籍贯/风格)·座师-门生网络永远存在 (不可灭只可限) |
| **D·干预 vs 反干预** | 5 反舞弊 toggle (糊名/誊录/锁院/回避/监临) + 改革浪潮事件 (自然政治触发) |
| **E·身份金字塔** | 4-5 级身份阶梯·每级 status flag 包·顶级稀缺身份 (状元/庶吉士) |
| **F·历史功能** | **F1 士人吸纳率 / F2 官僚流动率 / F3 文化整合度** — 停科/操纵/改科通过这三个传导政治后果 |

---

## 3·三层架构 + 升级方向

```
┌─ 顶层·政治事件层 (扩 keyi 加 4 议题·非新建) ──────┐
│  开科 / 主考 / 弊案 / 改革浪潮 / 选官分配·          │
│  5 议题全走 keyi 引擎·council/edict/defy 三路径     │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─ 中层·N 级筛选层 (KejuTier 参数化扩 9 朝代) ───────┐
│  保留 advanceKejuByDays + 8 阶段·成熟引擎           │
│  扩·stageDurationDays → KejuTier[]·剧本 override   │
│  9 朝代 preset·汉 0 / 魏晋 0 / 隋唐宋元 3 / 明清 6  │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─ 底层·身份转换层 (扩 _aiGenerateFullCharacter) ────┐
│  进士已 eager 入 GM.chars·删 lazy 分支              │
│  座师-门生·复用 ch.party + 加 ch._mentorRef         │
│  选官分配 (朝代联动)·扩 _kejuAutoAssign             │
└──────────────────────────────────────────────────────┘

[侧支] 三大稳定性指针·扩 _kejuAggregateGradsEffect 数学化
       F1·士人吸纳率   ← 备考池 / 总士人池
       F2·官僚流动率   ← 新进士 / 总官员
       F3·文化整合度   ← 边远省进士占比 / 解额公平度
       → endTurn 副作用·**event-based** 邸报头条·非数值滴漏

显示位置 (user 锁)·
- 不进 GM.vars 顶栏
- 主显·科举弹窗顶部 3 印石 (跟皇威/皇权印石视觉一致)
- 次显·民心面板 expand 时加 3 行派生
- data namespace·P.keju.indicators.{f1, f2, f3}
```

**升级哲学** — **数学化 + 体系化·不是重构**·

```
旧科举亮点 (保留)·
  ✅ 叙事性强 (半文言·shiliao 原文摘引·演义跨朝代奇缘)
  ✅ 数据流完整 (7 处持久化·LLM 推演读 + 玩家看)
  ✅ 政治深度足 (代价梯度 council/edict/defy·殿试代主 6 身份分类)
  ✅ keyi 议政流程 (800 行·v7 单向不变量·圣谕拉拽 paradigm)
  ✅ 历史名臣 + 演义·_timeAnomaly 标签

旧科举缺失 (本 sprint 补)·
  ❌ tier 数 hardcode (2 套·明清 6 / 唐宋元 3)
  ❌ 集团效果没数学化为 F1/F2/F3
  ❌ 改革浪潮触发条件 hardcode·没接 F1/F2/F3 / 党争 tension
  ❌ 弊案完全没实现
  ❌ keyi 只跑筹办·没 5 议题类型
  ❌ tension 仅在 sc0 LLM 论述·非结构化
  ❌ corruption 按部门·无个人派生
```

---

## 4·亮点保留承诺·12 条 red line

实施全程 lock·**绝不破坏**·

```
❌ 绝不重写 keyi 800 行 (L1564-2353·开放扩 topicType 但不重写)
❌ 绝不删 _kejuGenChiefExaminerMemorial (主考奏折·tm-keju.js L495)
❌ 绝不简化历史名臣检索 (shiliao 字段必保·原文摘引)
❌ 绝不删演义模式 _timeAnomaly 标签
❌ 绝不改半文言风格 (LLM prompt 文案 "150-250 字策问体")
❌ 绝不删殿试代主 6 身份分类 (太子/首辅/礼部/宗室/权臣/武将)
❌ 绝不删党派推荐机制 (各党 influence>20 → 该党最高 intel 成员)
❌ 绝不简化经费三级 fallback (国库 → 内帑 → 流产)
❌ 绝不破坏 7 处持久化数据流 (_courtRecords/_edictTracker/qijuHistory/jishiRecords/eventBus/NpcMemorySystem/AffinityMap)
❌ 绝不替换 wuchang 5D 为西式 personality8D / OCEAN
❌ 绝不发明新代价 paradigm·所有议题复用 council/edict/defy 三 tier
❌ 绝不删 NpcMemorySystem.remember + AffinityMap.add 双轨写入
```

**23 个亮点详记**·见附录 B [unchanged·保留亮点] 函数表 + 附录 F 历史 v1-v5。

---

## 4.5·玩家操作全清单·27 操作·5 大阶段 (v6.5 新)

亲读 tm-keju.js + tm-keju-runtime.js 后清算·当前科举有 **27 个玩家可点的操作**·v6 plan 只覆盖了 ~50%·v6.5 补 Slice 2.5 / 7.5 / 8.5 / 8.6 后达 100% 闭环。

| # | 操作 | 函数 / 入口 | 行号 | v6.5 slice |
|---|---|---|---|---|
| **A·开局期·制度激活 (sc0 LLM)** ||||
| 1 | 请求启用科举 (隋唐前) | `requestEnableKeju` | tm-keju.js L964 | **Slice 2.5** |
| 2 | 发起科举改革 (已有察举/九品中正) | `startKejuReform` | tm-keju.js L1011 | **Slice 2.5** + Slice 6 (浪潮) |
| 3 | 提议筹办科举 (触发朝议) | `proposeKejuPreparation` | tm-keju.js L169 | Slice 4 (kaike topic) |
| **B·朝议路径选择 (3 路径)** ||||
| 4-6 | 依议启动 / 下诏强推 / 逆众议强推 | `startKejuByMethod('council'/'edict'/'defy')` | tm-keju.js L247 | ✓ keyi (复用) |
| 7 | 罢不议了 | `_keyiAbort` | runtime L2189 | ✓ keyi (复用) |
| 8 | 再议一轮 / 付表决 / 继续裁决 | `_keyiExtraRound` / `_keyiProceedToVote` / `_keyiProceedToDecide` | runtime L1690-2148 | ✓ keyi (复用) |
| 9 | 科议玩家圣谕 (拉拽立场) | `_keyiPlayerSpeak` | runtime L1721 | ✓ keyi (复用) |
| **C·会试期·主考与拟题** ||||
| 10 | 主考钦点 (从候选列表选) | `selectExaminer` | runtime L688 | Slice 5 (examiner_pick keyi) |
| 11 | 进入会试出题 | `proceedToHuishi` | runtime L683 | **Slice 8.5** (UX 收口) |
| 12 | 让主考官 AI 拟题 | `examinerProposeTopic` | runtime L778 | **Slice 8.5** |
| 13 | 修改/清空会试题目 (textarea) | textarea + `清空` | runtime L758-759 | **Slice 8.5** |
| 14 | 开榜批卷 (一键触发 LLM) | `generateHuishiResults` | runtime L806 | Slice 8 (eager 后逻辑) |
| **D·殿试期·策问与亲笔 (核心权力·v6 最大盲区)** ||||
| 15 | 殿试代主选委 (6 身份分类) | `openDianshiDelegatePicker` / `_pickDianshiDelegate` | tm-keju.js L623-718 | **Slice 7.5** |
| 16 | AI 代拟策问 | `generateDianshiQuestion` | runtime L1013 | **Slice 8.5** |
| 17 | 玩家亲笔策问 (`playerQuestion` 写入) | textarea·150-250 字策问体 | runtime L1101 | **Slice 8.5** |
| 18 | 开始殿试 | `startDianshi` | runtime L1004 | **Slice 8.5** |
| 19 | 查看答卷 (LLM 生成策论原文) | `viewAnswer` | runtime L2452 | **Slice 8.6** |
| 20 | 钦点状元 / 榜眼 / 探花 | `_qinDianPick` | runtime L1471 | **Slice 8.6** |
| 21 | 钦定·张榜天下 (锁定排名) | `confirmFinalRanking` | runtime L1484 | **Slice 8.6** |
| **E·完成期·授官与人物志** ||||
| 22 | 纳入人物志 (任意进士) | `recruitCandidate` | runtime L2548 | Slice 8 (eager 自动 + 玩家手纳) |
| 23 | 授予中央官职 (选 vacant post) | `assignOffice` | runtime L2661 | Slice 11 (allocation·单人微观) |
| 24 | 选官分配确认 | `_kejuAssignConfirm` | runtime L2715 | Slice 11 |
| 25 | 天子门生授恩 (前三 affinity+4·自动) | `_kejuFinalize` | runtime L2625 | ✓ 自动·不动 |
| 26 | 完成科举·邸报头条 | `finishKeju` | runtime L2746 | Slice 12.5 (event 联动) |
| **·紧急浮条 UX** ||||
| 27 | 紧急浮条点击 (顶部条·跳决策阶段) | `_kejuUrgentAction` | tm-keju.js L728-791 | ✓ 保留·event 联动 |

**关键 design rule**·**27 操作全保**·v6.5 仅"为每个操作明确归属 slice"·**不删任何 UX 触点**。

---

## 5·26 slice·6 phase·实施表 (v6.5)

### Phase 0·Prep (3-5 d)

| Slice | 目标 | 涉及文件 (函数 tag) | DoD + red line |
|---|---|---|---|
| **0** | 通读 tm-keju-runtime 3229 行 + tm-keju 1076 行·建 field inventory baseline doc | tm-keju-runtime.js · tm-keju.js · 输出 `web/docs/keju-field-inventory.md` | (1) doc 完整·8 阶段每字段标 [unchanged]/[modified]/[new] (2) 列出 §4 12 red line 对应函数行号 |
| **0.3** | _kjInferLearningTraits 派生函数 (~30 词关键词·学派 5 维度·派生不持久化) | 新 `web/tm-keju-learning-traits.js` (~80 行)·init 时挂 | (1) `_kjInferLearningTraits(ch.learning)` 返 `{confucian, statecraft, poetry, philosophy, practical}` (2) 5 剧本 ch.learning 字符串测试·≥70% 命中 (3) **不写入 ch·当场计算** |
| **0.5** | UI 入口·右侧"文"panel 拆 + 加科举按钮 | `phase8-formal-bridge.js`·titles.policy / #rp-title render / panel header | (1) panel 顶端只显"文事" (2) 右侧 gold "科举"按钮 (3) 点击唤起 `openKejuPanel()` (4) 不破坏 8 个其他 panel |
| **0.7** | 共性 paradigm research doc 整理 | 新 `web/docs/keju-paradigm-research.md` (~600 行) | (1) 6 不变量逐项 (2) 9 朝代差异化表 (3) 1300 年 timeline (4) doc 是后续 Slice 1-16 设计参考 |

### Phase 1·共性主干 (5-7 d → 5.5-8 d with 2.5)

| Slice | 目标 | 涉及文件 (函数 tag) | DoD + red line |
|---|---|---|---|
| **1** | KejuTier 数据结构扩 (从 stageDurationDays dict 扩 tier object·复用现有字段) | tm-keju-runtime.js initKejuSystem (L23) [modified]·_getDefaultTiers (L137) [modified]·新 `web/tm-keju-tier.js` (~150 行) | (1) `P.keju.tiers[]` 保留 (L27 已存在·扩字段) (2) 每 tier·`{name, level, interactive, desc, daysCost, tierKind, examinerLevel, contentType, passRate}` (3) 老存档兼容·`_kejuUpgradeExamSchema` 扩 stage→tier index 映射 (4) **绝不破坏现有时间化** |
| **2** | 9 朝代 preset (汉 chaju stub / 魏晋 jpzz stub / 隋唐宋元明清完整) | 新 `web/tm-keju-presets.js` (~400 行) | (1) 9 preset 跑 smoke·汉/魏晋走 keju.system='chaju'/'jpzz' 分支不报错·init 短路 (2) 隋唐宋元 3-tier·明清 6-tier·南宋道学化生效 (3) 真正流程仅 'kj'·察举/九品中正留 backlog |
| **2.5·新 (v6.5)** | **制度激活 UX·sc0 LLM 多档评估 (扩 `requestEnableKeju` + `startKejuReform` 的弹窗与后果)** | tm-keju.js requestEnableKeju (L964) [modified]·startKejuReform (L1011) [modified]·新 `web/tm-keju-activation.js` (~200 行) | (1) `requestEnableKeju` sc0 prompt 扩·返 `{canEnable, reason, intervalNote, restrictions[], cost}`·非二元 (2) 5 档后果·**全准** (新)·**有限** (3 年试·部分省) / **缓** (改革派 prestige+3·保守派 loyalty-2) / **改** (改为荐举混合·走 `startKejuReform`) / **拒** (拒理由文言·勋戚 satisfaction+5) (3) `startKejuReform` 隋前朝代的"改"路径接 sc0·**复用现有 LLM prompt 不重写** (4) UI·改革派 / 保守派 / 中间派 3 列 (走科议 keyi `topicType='activation'`·新加但走现 800 行 paradigm) (5) 红线·**绝不 hardcode 5 档·全 LLM 派生**·**绝不破坏 P.ai.key 缺失 fallback (现 L965 短路)** |
| **3** | P.keju.indicators·F1/F2/F3 公式化 (扩 `_kejuAggregateGradsEffect` L3088 数学化) | tm-keju-runtime.js _kejuAggregateGradsEffect (L3088) [modified]·新 `web/tm-keju-indicators.js` (~150 行)·_kejuArchiveExam (L557) [modified] | (1) 每场科举更新 P.keju.indicators.{f1, f2, f3}·从现 阶层满意度 + 党派吸纳 + 吏治调整 派生 (2) F1 公式·备考池 / 总士人池 × 500 (3) F2 公式·近 9 年新进士 / 总官员 × 400 (4) F3 公式·0.6×偏远进士占比 + 0.4×解额公平度 (5) **不进 GM.vars 顶栏** |

### Phase 2·顶层政治事件 (7.5-12 d) — keyi 扩 5 议题

| Slice | 目标 | 涉及文件 (函数 tag) | DoD + red line |
|---|---|---|---|
| **4** | 扩 keyi·`topicType='kaike'` 复用现有路径 (开科决策) | tm-keju-runtime.js openKeyiSession (L1564) [modified]·_keyiConfirmStart (L2197) [modified] | (1) `openKeyiSession('kaike', topicData)` 现路径不变 (2) 新加 KEYI_TOPIC_TYPES 表 (3) **绝不重写 keyi 800 行**·只加 topicType 分支 (4) 现 council/edict/defy 代价不变 |
| **5** | 扩 keyi·`topicType='examiner_pick'`·主考 4 属性派生 view (从 ch.party / wuchang / intelligence / integrity 派生) | _keyiConfirmStart [modified]·新 `_kjPickExaminerByMethod`·新 `_kejuExaminerView(ch)` (~150 行) | (1) `_kejuExaminerView(ch)` 返 `{preferContent, preferRegion, strictness, factionBias}` (2) 4 属性全派生·**不加 char schema 字段** (3) 主考钦点 5 处代价·picked.party tension+1·非 picked loyalty-2·affinity-1·小党 affinity+5·跟廷议召集联动 (4) 复用现 党派推荐机制 (L656) |
| **5.5** | GM._factionTension namespace + `_corrCalcExaminerCorruption(ch)` 派生算法 (新建·真新增 paradigm) | 新 `web/tm-keju-tension.js` (~200 行)·`web/tm-keju-corruption.js` (~100 行) | (1) `GM._factionTension` 顶层·初始化所有党 0-20 (2) `_kjUpdateFactionTension(eventLog)` 一次科举/朝议/弊案后 tension 变化 (3) `_kjCalcTotalPartyTension()` 求 sum (4) `_kjGetEnemyParties(party)` / `_kjGetPartyLeaders(party)` 辅助 (5) `_corrCalcExaminerCorruption(ch)` 派生·deptCorruption × 0.6 + partyCorr × 0.3 + (greed/integrity 派生) × 0.1 (6) sc0 LLM tension 抽取 ≥ 50% 命中 |
| **6** | 扩 keyi·`topicType='reform'`·改革浪潮 (扩 `startKejuReform` tm-keju.js L1011·改自然政治触发·加主题池) | tm-keju.js startKejuReform (L1011) [modified]·新 `_kjReformThemePool` 6 主题映射 (~200 行) | (1) 5 触发条件·partyTension≥15 / F1<25 / F2<15 / F3<20 / 国库<1000 / 改革派 NPC≥2·任一满足 + 15 年冷却 (2) 6 主题·王安石经义 / 朱熹理学 / 张居正考成 / 戊戌策论 / 广开科目 / 南北中卷 (3) 走 keyi `topicType='reform'`·accept/reject/defer 三路径 (4) 改革代价·改革派 prestige+5/loyalty+3·保守派 loyalty-3/tension+2 (5) F1-F3 按主题 modifier |
| **7** | 扩 keyi·`topicType='scandal'`·弊案 + sc16 schema 扩 'impeach_examiner' (3 选 2 触发) | 新 `web/tm-keju-scandal.js` (~250 行)·sc16 schema 扩 (sc1*.json) | (1) 3 选 2·corruption≥50 + tension≥8 + examinerFactionBias>0.6 (不依赖进士派系·Slice 8/10 未完时也可触发) (2) memorial 走 sc16 + memorialType='impeach_examiner' (3) 走 keyi `topicType='scandal'`·investigate/dismiss/protect 三路径 (4) 罢黜·削籍·赐死 3 后果·loyalty / martyr 入队 |
| **7.5·新 (v6.5)** | **殿试代主明确保留·6 身份联动加强 + 触发条件细化** | tm-keju.js openDianshiDelegatePicker (L623) [modified]·_kejuClassifyDelegate (L660) [modified]·_pickDianshiDelegate (L683) [modified] | (1) **触发明确**·`P.playerInfo.absent === true` 或玩家手动选 (现有逻辑·明确写入 doc) (2) 6 身份 affinity / huangwei 后果**保留现实现**·只补 missing·**太子** prestige+8 / 储位+3·**首辅** prestige+5·partyTension+2·**礼部** 礼制满意+5·**宗室** 宗室派 satisfaction+10 (现有)·**权臣** huangwei-3·权臣 tension+5·**武将** huangwei-2·minxin-2·礼部抗议 event (3) `_isPlayerFactionChar` (L594) 资格限制保留·**绝不放开外朝代选** (4) 跟 Slice 5 examiner_pick 联动·若代主 = 主考·tension+3·额外提示 (5) 跟 Slice 12.5 event 系统集成·武将代主 → "礼部联名抗议" event spawn (6) **红线 #6 落地**·绝不删 6 身份分类 (太子/首辅/礼部/宗室/权臣/武将) |

### Phase 3·底层身份与派系 (6-10 d → 7.5-12.5 d with 8.5 + 8.6)

| Slice | 目标 | 涉及文件 (函数 tag) | DoD + red line |
|---|---|---|---|
| **8** | 进士 eager 统一·删 lazy 分支·crystallize 4 属性派生 (扩 `crystallizeKejuGrad` L3131·~50 行非 250 行重构) | tm-keju-runtime.js _aiGenerateFullCharacter (L2917) [modified]·crystallizeKejuGrad (L3131) [modified]·_kejuArchiveExam (L557) [modified] | (1) 删 `crystallizeKejuGrad` lazy 分支·_kejuArchiveExam 内 eager 入 GM.chars (2) `_aiGenerateFullCharacter` prompt 注入 examiner 4 属性 hint·让 LLM 顺主考倾向 (3) **historicalHits 路径优先**·`pickHistoricalCandidates` 命中的优先 crystallize (4) 每场 20 人 (跟现 dianshi 20 卷对等) (5) **shiliao 字段必保** (6) `_timeAnomaly` 演义跨朝代标签必保 (7) 跨场去重池 P.keju._historicalFiguresUsed 必保 |
| **9** | mentor 字段·`ch._mentorRef` 单字段 (硬指向主考·跟现 `ch.mentor` 并存不冲突) | 新 `web/tm-keju-mentor.js` (~150 行)·crystallizeKejuGrad [modified]·tm-three-systems-ui.js 新 tab | (1) 进士入 chars 时·`ch._mentorRef = examiner.name`·**`ch.mentor` 现有字段不动** (2) UI 复用现有党派列表展示"门生" (3) 反向索引 `GM._mentorIndex.mentor[examiner] = [mentees]` (4) 跟 6 系统翻新 partyRef entity 化前向兼容 |
| **10** | 进士派系标签·扩 `_kejuAggregateGradsEffect` L3088 党派吸纳段 (从 20% 扩到 100%·所有进士分配 ch.party) | tm-keju-runtime.js _kejuAggregateGradsEffect [modified] | (1) 进士 ch.party 写入 (复用现有党派 string·东林/阉党/浙党) (2) 进入 NPC LLM prompt 时·sc1b 文事段自动带 (3) **char.party 字符串不 entity 化**·跟 6 系统翻新前向兼容 |
| **11** | 扩 keyi·`topicType='allocation'`·选官分配·朝代联动 (扩 `_kejuAutoAssign` L3157 + `_kejuAssignConfirm` L2715) | tm-keju-runtime.js _kejuAutoAssign (L3157) [modified]·_kejuAssignConfirm (L2715) [modified]·新 `web/tm-keju-allocation.js` (~300 行) | (1) 明清·一甲直翰林·二甲选庶吉士·三甲外放·唐·进士+吏部释褐试二阶段·宋·状元直授高位·三甲县令·元·四等人差额授官 (2) 走 keyi `topicType='allocation'`·council/edict/defy 三路径 (3) 选官钦点 4 代价·deptParty tension+0.5·状元违制 loyalty-3+prestige-5·肥缺反方党 affinity+3 (4) 仅 `keju.system='kj'` 朝代生效·汉/魏晋 backlog |
| **8.5·新 (v6.5)** | **会试/殿试出题 UX·主考拟题审阅 + 玩家亲笔策问 (核心仪式权力)** | runtime examinerProposeTopic (L778) [modified]·generateDianshiQuestion (L1013) [modified]·textarea 区块 (L758 / L1003) [modified]·新 `web/tm-keju-question-ui.js` (~250 行) | (1) **会试题** UX·主考拟题 (复用 `_kejuGenChiefExaminerMemorial` 现 3 候选·red line #2)·玩家可修改/清空·**保留 textarea** (2) **殿试题** UX·AI 代拟 (复用 `generateDianshiQuestion` 半文言策问体 150-250 字·red line #5)·**绝不改文风** (3) **主考偏好 hint 显式**·UI 顶部显 `_kejuExaminerView(examiner)` 派生 4 属性·让玩家知道主考想要什么 (4) **题目-主考契合度** 派生·若 playerQuestion 跟 examiner.preferContent 错配 (例·主考道学派 + 玩家出实学题)·开榜后 LLM 评价 -10 +"考官私议陛下偏题" event (5) **进入 keyi 跳板**·若玩家想改方向·点 "召礼部商议"·走 keyi `topicType='question_review'` (复用 keyi 800 行) (6) 红线·**绝不绕开主考拟题 paradigm**·**绝不改半文言风格** |
| **8.6·新 (v6.5)** | **钦点三甲 + 答卷阅 UX (科举最高仪式·完成度收口)** | runtime renderKejuStage 殿试 finalize 段 (L1430-1468) [modified]·viewAnswer (L2452) [modified]·_qinDianPick (L1471) [modified]·confirmFinalRanking (L1484) [modified]·_kejuJudgeRankingControversy (L1520) [modified] | (1) **20 卷阅 UX 强化**·查看答卷弹窗 (L2495) 加 `_kejuExaminerView` 派生·让玩家看到主考会怎么评 (2) **钦点 3 甲流程保留**·状元/榜眼/探花·玩家亲点 (现 `_qinDianPick`) (3) **党争联动·新加**·钦点状元若 党派=examiner.party·`GM._factionTension[examiner.party]+=2`·若 党派=examiner 反方党·`enemyParties.tension+=3`·若 非主考前 3 建议·`_kejuJudgeRankingControversy` 已有·**加 prestige+5 / 中立派 affinity+3** (4) **天子门生加强**·`_kejuFinalize` L2625 已有 affinity+4·**保留** (5) **状元违制 hooks**·钦点出身寒门状元 (familyTier='commoner') → 寒门 satisfaction+10·门阀 satisfaction-5·**加 event 系统挂钩** (6) **失败 UX**·若 20 卷里没人是 examiner.preferRegion 的籍贯·开榜后 LLM 评价 "主考有偏" warning (7) 红线·**绝不改钦点 paradigm**·**绝不替代 LLM 答卷生成** |

### Phase 4·三指针闭环 (4.5-6 d)

| Slice | 目标 | 涉及文件 (函数 tag) | DoD + red line |
|---|---|---|---|
| **12** | F1/F2/F3 endTurn 钩子 (扩 endturn-pipeline-steps systems step) | tm-endturn-pipeline-steps.js systems step [modified]·tm-keju-indicators.js | (1) 每 endturn `_kjUpdateIndicators(ctx)` 更新 P.keju.indicators (2) 副作用应用·**event-based 不数值滴漏** (见 Slice 12.5) (3) 跟现 keju.tickAdvance / economy.tick / corruption.tick 并排·不增加管道层级 |
| **12.5** | event-based 反馈循环·F1/F2/F3 tier 化事件 (邸报头条 + 事件 modal·非数值滴漏) | 新 `web/tm-keju-events.js` (~300 行) | (1) F1<30 tier1 "公论沸腾" / F1<20 tier2 "罢考请愿"·5+ 联名 / F1<10 tier3 "罢考起义"·新派系 spawn (2) F2<20 tier1 "老牌派系强化" / F2<10 tier2 "世家清议党崛起" (3) F3<30 tier1 "边镇 NPC 上书" / F3<15 tier2 "边远士子拒考"·南方解额 -20% (4) 跟现 event-system + memorial + chaoyi_topic 集成 (5) 每 tier 玩家可见·"陛下旨" modal·4 选项 |
| **13** | F1/F2/F3 UI 双显·科举弹窗顶部 3 印石 + 民心面板派生 3 行 | tm-keju-runtime.js renderKejuStage (L327) [modified]·tm-authority-ui.js renderMinxinPanel [modified] | (1) 科举弹窗顶部加 indicators 区·跟皇威/皇权印石视觉一致 (2) 民心面板 expand "民心派生" 段加 3 行 (士人吸纳/官僚流动/文化整合)·小字灰色 + sparkline (3) **不进 GM.vars 顶栏** |

### Phase 5·朝代差异化 + 编辑器 (5-6.5 d)

| Slice | 目标 | 涉及文件 (函数 tag) | DoD + red line |
|---|---|---|---|
| **14** | 9 朝代 preset 编辑器面 + 剧本 keju.* schema 扩展 (~30 字段·数据层) | editor-game-systems.js kejuSystem panel [modified]·tm-keju-presets.js | (1) editor 现 7 字段扩到 30+ (2) scenario.keju.{indicators / reformTriggers / scandal / tiers / examInterval / partyTensionInit / convening / historicalFigurePolicy} 全可配 (3) **不动 UI 渲染·仅 schema 扩** |
| **14.5** | editor 三面补·KejuTier 列表编辑 + F1-F3 阈值 + reformThemes 池 | editor-game-systems.js [modified]·editor-crud.js [modified] | (1) KejuTier 列表 form (2) F1/F2/F3 阈值 3×3=9 个 input (3) reformThemes 池自定义·剧本可加 (4) 历史进士预置段 (5) **不加 personality8D / keju_status editor·复用现有 wuchang + ch.title 编辑器** |
| **15** | timeline 解锁·era 优先·绝对年份 fallback | tm-keju-presets.js·新 `web/tm-keju-timeline.js` (~150 行) | (1) era 优先·"宋以后糊名" (era 包含'宋/辽/金/元/明/清') (2) 绝对年份 fallback·糊名 992 / 誊录 1005 / 三年制 1065 / 八股永乐 / 翻译科 1723 (3) 剧本 keju.* override |
| **16** | 编辑器 UI·KejuTier 列表编辑·朝代 preset 一键加载 | editor-game-systems.js [modified]·新 `web/editor-keju-detailed.js` (~400 行) | (1) tiers 数组编辑·UI 直观 (2) preset selector dropdown·按朝代一键加载 (3) 调用 Slice 14 数据·Slice 16 仅 UI |

---

## 6·char schema·复用现有 (不加新字段)

**核心决定**·char schema **不加新字段**·全复用现有·

| plan 概念 | 实际字段 |
|---|---|
| "rigor 严谨" | `ch.integrity` (顶层数值) / `ch.wuchang.li` (礼) |
| "honor 守节" | `ch.wuchang.yi` (义) + `ch.loyalty` |
| "boldness 胆量" | `ch.valor` (顶层) |
| "rationality 理性" | `ch.wuchang.zhi` (智) + `ch.intelligence` |
| "compassion 怜悯" | `ch.benevolence` + `ch.wuchang.ren` (仁) |
| "ambition 野心" | `ch.ambition` (顶层) |
| "greed 贪婪" | `(100 - ch.integrity)` 派生 |
| "学派经史/经世/诗赋/理学/实学" | `_kjInferLearningTraits(ch.learning)` 派生函数·**不持久化** |
| "科举身份秀才/举人/进士/翰林" | `ch.title` (已有·状元/榜眼/探花/进士) |
| "籍贯" | `ch.birthplace` (实际字段名·plan 早期错叫 origin) |

**新加字段·仅 1 个**·

```
ch._mentorRef = examiner.name  // Slice 9·进士硬指向主考·跟 ch.mentor 并存
```

**rationale**·跟 [feedback_editor_game_relation] 对齐·**editor / runtime / AI 三面已有完整 wuchang + 6 数值编辑·复用即三面同步**。

---

## 7·跨 sprint 协调

### 7.1·廷议 sprint·**不再前置锁**

旧 plan v1-v4·"廷议 sprint Slice 0+2+5 是科举 Phase 2 block 前置"。
**v6 final 决定**·科举议题走 **keyi (科议·800 行已存)** 不走廷议 v3·两 sprint **并行独立 ship**。

```
廷议 v3·主管"非科举"政治议题 (国策 / 战争 / 礼制)
科议 keyi·主管"科举专属"5 议题 (kaike / examiner_pick / scandal / reform / allocation)
```

### 7.2·6 系统翻新·partyRef entity 化 migration

```
科举 sprint 先 ship·char.party 保持字符串
6 系统翻新做 partyRef entity 化时·
  写 _kjMigrateCharPartyToPartyRef()
  char.party string → partyRef entity
  ch._mentorRef string → mentorRef entity reference
  一次性·后续不维护双轨
```

### 7.3·admin_division design·解额集成

Slice 14 解额跟行政区划集成·若 admin_division 未 ship·用 `_kjDefaultQuotaByDynasty(scenario.dynasty)` fallback·后续 admin_division ship 时自动接管。**Slice 14 不 block 在 admin_division 上**。

### 7.4·常朝大改·selfReact 衔接

科举议题在常朝议程时·NPC 反应**走常朝大改的 `_ty3_getStanceWithDims`** (8D persona)·复用同套·**不独立维护**。

---

## 8·灰度 / migration / 回滚

### 8.1·feature flag

```js
P.conf.useNewKeju = false   // Slice 0.5 加·默认 false·sprint 期间 gate 所有新代码

function startKejuByMethod(method) {
  if (P.conf.useNewKeju) return _kjV2_startKejuByMethod(method);
  return startKejuByMethod_orig(method);   // 旧路径保留
}
```

### 8.2·中间 ship 节点

```
Phase 2 完成 (Slice 0-7)·不 ship — 无底层·进士不入 chars·体验残缺
Phase 3 完成 (Slice 0-11)·ship 1.3.0.0 — 新科举 minor release·flag 默认 true
Phase 5 完成 (Slice 0-16)·ship 1.3.1.0 — 完成·flag 删除·3 个月稳定期后旧路径废
```

### 8.3·老存档 migration

`_kejuUpgradeExamSchema` 扩 stage→tier index 映射·首次进游戏自动转换·失败时**回退保留 v1 数据**·log warning·不破坏存档。

### 8.4·3 级回滚

```
Slice 内·git revert·flag 仍 false·无影响
Phase 内·恢复 phase 起点 commit·跑 smoke
Ship 后·下一热更设 P.conf.useNewKeju=false·旧路径 default
```

### 8.5·scenario 可配 vs hardcode 边界

```
scenario 可配 (剧本 override)·
  F1/F2/F3 阈值·indicators.{f1_thresholds / f2_thresholds / f3_thresholds}
  改革浪潮触发·reformTriggers.{partyTension / treasury / reformistOnTop / timer / cooldown}
  弊案触发·scandal.{corruption_threshold / enemyTension_threshold}
  jinshiPerExam (默认 20)
  examInterval (默认 3 年)
  partyTensionInit (剧本初始 tension)
  reformThemes (主题池自定义)
  tiers·KejuTier[]·朝代 preset
  
hardcode (paradigm-level·不可配)·
  crystallization 算法权重 (0.3 籍贯偏好 / 0.6 同党拉拽 / etc)
  主考 4 属性派生公式
  F1/F2/F3 标准化系数 (× 500 / × 400)
  8D wuchang 维度名 (跟 char schema 一致)
```

---

## 9·timeline·28-40 d (含 buffer 34-51 d) (v6.5)

```
Phase 0·Prep                         3-5 d
  Slice 0     0.5-1 d    通读 + field inventory
  Slice 0.3   0.5 d      _kjInferLearningTraits 派生函数
  Slice 0.5   0.5-1 d    UI 入口
  Slice 0.7   1-1.5 d    paradigm research doc

Phase 1·共性主干                       5.5-8 d (含 2.5)
  Slice 1     1.5-2 d    KejuTier 数据结构扩
  Slice 2     1.5-2 d    9 朝代 preset
  Slice 2.5★  0.5-1 d    制度激活 UX·sc0 LLM 多档评估 (v6.5 新)
  Slice 3     2-3 d      F1/F2/F3 公式化

Phase 2·顶层政治事件·扩 keyi 加 4 议题   8-13 d (含 7.5)
  Slice 4     1 d        kaike·复现有路径
  Slice 5     1 d        examiner_pick·4 属性派生 view
  Slice 5.5   1.5 d      GM._factionTension + corruption 派生 (真新建)
  Slice 6     2 d        reform·扩 startKejuReform + 主题池
  Slice 7     2 d        scandal·sc16 扩 + 三选二触发
  Slice 7.5★  0.5-1 d    殿试代主明确保留 + 6 身份联动 (v6.5 新)

Phase 3·底层身份与派系                  7.5-12.5 d (含 8.5 + 8.6)
  Slice 8     1.5 d      进士 eager 统一 + 4 属性派生
  Slice 8.5★  1-1.5 d    会试/殿试出题 UX·主考拟题审阅 + 玩家亲笔策问 (v6.5 新)
  Slice 8.6★  1-1.5 d    钦点三甲 + 答卷阅 UX·党争联动 (v6.5 新)
  Slice 9     1.5 d      _mentorRef
  Slice 10    1.5 d      党派标签扩 100%
  Slice 11    2 d        allocation·朝代联动

Phase 4·三指针闭环                      4.5-6 d
  Slice 12    0.5 d      endTurn 钩子
  Slice 12.5  1.5 d      event-based 反馈
  Slice 13    1.5 d      UI 双显

Phase 5·朝代差异化 + 编辑器              5-6.5 d
  Slice 14    2 d        9 朝代 preset 数据层
  Slice 14.5  1 d        editor 三面补
  Slice 15    1 d        timeline 解锁
  Slice 16    1.5 d      编辑器 UI
─────────────────────────────────────────
真新建工时           18-23 d  (Slice 1-3 + 2.5 + 5.5 + 6 + 7 + 7.5 + 8.5 + 8.6 + 12 + 12.5 + 14 + 14.5 + 15 + 16 部分)
扩 keyi 4 议题        3-5 d   (Slice 4 + 5 + 11·复用 800 行 paradigm)
扩 _aiGenerateFullCharacter / crystallize  2-3 d   (Slice 8)
集成 / migration / smoke / doc            5-9 d
─────────────────────────────────────────
总  ·  28-40 d (含 buffer 34-51 d)·★ = v6.5 新加 4 slice
slice·  26 个 (22 + 4)
预期完成·2026-06-25 ± 5 d (假设 user 批准 2026-05-23 开工·~32 d 实施)
```

---

## 10·关联文件

- `web/tm-keju.js` (1076 行) — UI + 启动
- `web/tm-keju-runtime.js` (3229 行) — 主战场
- `web/phase8-formal-bridge.js` — Slice 0.5 UI 入口
- `web/tm-authority-ui.js` — Slice 13 民心面板派生
- `web/tm-chaoyi-changchao.js` — Slice 4-7 keyi 议题集成
- `web/tm-faction-action-engine.js` — Slice 5.5/10 派系联动
- `web/tm-corruption-engine.js` — Slice 5.5 corruption 派生
- `web/tm-endturn-pipeline-steps.js` — Slice 12 endturn 钩子
- `web/tm-office-system.js` — Slice 11 选官分配
- `web/tm-three-systems-ui.js` — Slice 9 mentor UI

**doc / memory**·

- `web/docs/keju-overhaul-sprint.md` (本 doc·final)
- `web/docs/keju-overhaul-sprint-history-v1-v5.md` (v1-v5 audit 历史·2477 行)
- `web/docs/keju-field-inventory.md` (Slice 0 输出·待建)
- `web/docs/keju-paradigm-research.md` (Slice 0.7 输出·待建)
- `web/docs/keju-backlog-chaju-jiupin.md` (察举/九品 backlog·待建)
- memory `project_keju_overhaul_sprint` — 本 sprint pointer
- memory `project_admin_division_design` — 解额跟行政区划集成
- memory `project_faction_center_layers` — 派系系统集成
- memory `project_chaoyi_changchao_backlog` — 朝议 v3 议题化
- memory `feedback_refactor_not_reskin` — paradigm 应不应改
- memory `feedback_runtime_renderer_canonical_for_schema` — runtime 才是权威
- memory `feedback_editor_game_relation` — 三面同步
- memory `feedback_tool_vs_system_costs` — 工具 vs 系统代价
- memory `feedback_audit_layers_ui_vs_mechanic` — 三层穿透 + 反馈循环
- memory `feedback_no_mystic_penalties` — F1-F3 自然政治后果
- memory `feedback_conservative_slicing` — 22 slice 一刀一事

---

# 附录 A·12 条 red line (实施期 lock)

**实施全程 lock·绝不破坏**·

```
❌ 1. 绝不重写 keyi 800 行 (L1564-2353·开放扩 topicType 但不重写)
❌ 2. 绝不删 _kejuGenChiefExaminerMemorial (主考奏折·tm-keju.js L495)
❌ 3. 绝不简化历史名臣检索 (shiliao 字段必保·原文摘引)
❌ 4. 绝不删演义模式 _timeAnomaly 标签
❌ 5. 绝不改半文言风格 (LLM prompt 文案 "150-250 字策问体")
❌ 6. 绝不删殿试代主 6 身份分类 (太子/首辅/礼部/宗室/权臣/武将)
❌ 7. 绝不删党派推荐机制 (各党 influence>20 → 该党最高 intel 成员)
❌ 8. 绝不简化经费三级 fallback (国库 → 内帑 → 流产)
❌ 9. 绝不破坏 7 处持久化数据流
❌ 10. 绝不替换 wuchang 5D 为西式 personality8D / OCEAN
❌ 11. 绝不发明新代价 paradigm·所有议题复用 council/edict/defy 三 tier
❌ 12. 绝不删 NpcMemorySystem.remember + AffinityMap.add 双轨写入
```

每 Slice 实施前·review 该 Slice 对应的 red line·若触碰需明示讨论。

---

# 附录 B·函数表·[unchanged] / [modified] / [new]

### [unchanged] 保留亮点 (~28 函数·v5 实施不动·只在 calling 时复用)

```
// 议政 paradigm·亮点 12-15·v7 单向不变量
openKeyiSession                    L1564·keyi 800 行·扩 topicType 但不重写
_renderKeyiModal                   L1635
_keyiRender                        L1654
_keyiRenderDiscuss                 L1664
_keyiPlayerSpeak                   L1721·玩家插话 + 立场推断 + 圣谕拉拽
_keyiStreamRound                   L1799·LLM 2 轮流式发言
_keyiInferStance                   L1904·算式兜底·圣谕拉拽 paradigm
_keyiGenAllStances                 L1965·v7 单向不变量
_keyiPersistToCourtRecords         L2212·7 处持久化数据流
_keyiMemoryEffects                 L2311·NPC 记忆 + AffinityMap 双轨

// 历史名臣 paradigm·亮点 3·21
pickHistoricalCandidates           tm-keju.js L835·AI 检索 + shiliao 强制 + 跨场去重
_kejuHistoricalWindow              tm-keju.js L827·strict/light/yanyi 3 模式
P.keju._historicalFiguresUsed      L82·跨场去重池
_timeAnomaly                       L899·演义跨朝代标签

// 君臣对答 paradigm·亮点 4·11·22
_kejuGenChiefExaminerMemorial      tm-keju.js L495·主考拟题 + 3 候选 + styleHint
examinerProposeTopic               L778·主考拟会试题
generateDianshiQuestion            L1013·殿试出题
viewAnswer                         L2452·答卷查看 UI
showAnswerModal                    L2495·答卷弹窗
_qinDianPick                       L1471·钦点 (玩家手钦)

// 经费 paradigm·亮点 5
_kejuSettleLocalCosts              L440·县/府/院三级
_kejuSettleProvincialCosts         L475·省级
_kejuSettleCentralCost             L925·国库 → 内帑 → 流产·三级 fallback

// 殿试代主 paradigm·亮点 7
openDianshiDelegatePicker          L623·6 身份分类
_kejuClassifyDelegate              L660·身份判定 (太子/首辅/礼部/宗室/权臣/武将/文臣)

// 资格 paradigm·亮点 6·廷议召集制原型
_isPlayerFactionChar               L594
_kejuIsEligibleChiefExaminer       L615
_kejuHasChiefExaminerOffice        L605

// UX·亮点 20
_kejuShowUrgentBanner              tm-keju.js L767·急办横幅
_kejuNotifyUrgentStage             tm-keju.js L728·紧急通知

// 三路径开科代价·亮点 1
startKejuByMethod                  tm-keju.js L247·council/edict/defy 三路径
resolveKejuCouncilResult           tm-keju.js L304

// 三级经费 paradigm·亮点 5
_keyiConfirmStart                  L2197·5 议题派发 (Slice 4-7 扩 topicType)

// 时间化·亮点 2 (从外部 calling)
advanceKejuByDays                  tm-chaoyi.js
P.keju.stageDurationDays           L33·8 阶段天数
```

### [modified] 现有·本 sprint 扩展 (~15 函数)

```
initKejuSystem                     L23 — 扩 KejuTier 字段 + 历史名臣 policy
_getDefaultTiers                   L137 — 扩 9 朝代 preset (Slice 2)
_kejuArchiveExam                   L557 — 加 P.keju.indicators 更新钩子 + 进士入 chars 统一 (Slice 3 + 8)
renderExaminerSelectStage          L626 — 顶部加 F1/F2/F3 印石区 (Slice 13)
openKeyiSession                    L1564 — 加 topicType 参数 (Slice 4-7)
_keyiStreamRound                   L1799 — prompt 加 topic context (Slice 4-7)
_keyiConfirmStart                  L2197 — 按 topicType 派发 (Slice 4-7)
_keyiMemoryEffects                 L2311 — 按议题类型不同 affinity 影响 (Slice 4-7)
crystallizeKejuGrad                L3131 — 删 lazy 分支·加 4 属性派生 (Slice 8)
_aiGenerateFullCharacter           L2917 — prompt 加 examiner 4 属性 hint (Slice 8)
_kejuAggregateGradsEffect          L3088 — 数学化 F1/F2/F3·阶层 → F1·党派 → F2·吏治 → F3 (Slice 3·10)
startKejuReform                    tm-keju.js L1011 — 自然政治触发 + 主题池 (Slice 6)
_kejuAutoAssign                    L3157 — 朝代联动 (Slice 11)
_kejuAssignConfirm                 L2715 — keyi 议题集成 (Slice 11)
_kejuUpgradeExamSchema             L384 — 扩 stage→tier index 映射 (Slice 1-2)
```

### [new] 真新建 (~12 函数 / 7 文件)

```
_kjInferLearningTraits             web/tm-keju-learning-traits.js (Slice 0.3·~80 行)
KejuTier 数据结构                  web/tm-keju-tier.js (Slice 1·~150 行)
9 朝代 preset                      web/tm-keju-presets.js (Slice 2·~400 行)
_kjCalcF1 / F2 / F3                web/tm-keju-indicators.js (Slice 3·~150 行)
P.keju.indicators                  顶层 namespace (Slice 3)
_kejuExaminerView                  Slice 5·~80 行·4 属性派生 view
GM._factionTension                 web/tm-keju-tension.js (Slice 5.5·~200 行)
_kjUpdateFactionTension            Slice 5.5
_kjCalcTotalPartyTension           Slice 5.5
_kjGetEnemyParties                 Slice 5.5
_kjGetPartyLeaders                 Slice 5.5
_corrCalcExaminerCorruption        web/tm-keju-corruption.js (Slice 5.5·~100 行)
_kjCalcPartyCorruption             Slice 5.5
_kjMapTitleToDept                  Slice 5.5
_kjReformThemePool                 Slice 6·6 主题映射 (~200 行)
_kjScandalTriggers                 web/tm-keju-scandal.js (Slice 7·~250 行)
sc16 'impeach_examiner'            schema 扩 (Slice 7)
_kjF1IndicatorSideEffects          web/tm-keju-events.js (Slice 12.5·~300 行)
_kjF2IndicatorSideEffects          Slice 12.5
_kjF3IndicatorSideEffects          Slice 12.5
mentor 反向索引 GM._mentorIndex     web/tm-keju-mentor.js (Slice 9·~150 行)
allocation 朝代联动                web/tm-keju-allocation.js (Slice 11·~300 行)
editor-keju-detailed.js             Slice 16·~400 行
tm-keju-timeline.js                Slice 15·~150 行
```

### [new schema field·仅 1 个]

```
ch._mentorRef = string             Slice 9·进士硬指向主考·跟 ch.mentor 并存
```

### [unchanged] schema field (复用现有)

```
ch.intelligence / administration / valor / benevolence / loyalty / integrity / ambition / charisma
ch.wuchang.{ren, yi, li, zhi, xin}
ch.party / faction / class / role / officialTitle / title / mentor / spouse
ch.birthplace / origin / age / personality / learning
ch.shiliao / _timeAnomaly / isHistorical
ch.familyTier / familyMembers / ancestry / appearance / hobbies / stance / partyLean
ch._memorySeeds / resources / alive / source / recruitTurn
```

---

# 附录 C·algorithm 公式表

## C.1·F1 士人吸纳率公式 (Slice 3)

```js
function _kjCalcF1() {
  // 备考池·所有 ch.title in 秀才/举人/生员/监生/童生 的活人
  const candidatePool = GM.chars.filter(c =>
    c.alive && /秀才|举人|生员|监生|童生/.test(c.title || '')
  ).length;
  
  // 全国总士人池·剧本 demographics 或按 dynasty + year 估算
  const totalScholarPool = scenario.demographics?.totalScholars 
    || _kjEstimateScholarPool(scenario.dynasty, GM.year);
  
  // F1 标准化·历史最盛 (明万历) ~20% → 100·历史最低 (五代) ~2% → 10
  const ratio = candidatePool / Math.max(totalScholarPool, 1);
  return Math.min(100, Math.max(0, ratio * 500));
}
```

**衰减率**·`alpha = 0.95^N` (N 年无科)·N=10 → 60%·N=20 → 36%。

**阈值** (event-based 触发)·
- F1 < 30·tier1 "公论沸腾"事件
- F1 < 20·tier2 "罢考请愿"集体上书 5+ 联名
- F1 < 10·tier3 "罢考起义" + 新派系 spawn

## C.2·F2 官僚流动率公式

```js
function _kjCalcF2() {
  // 近 9 年新进士入官
  const recentJinshi = (P.keju.history || []).filter(exam =>
    exam.examYear >= GM.year - 9 && exam.placements
  ).reduce((sum, exam) => sum + exam.placements.length, 0);
  
  // 当前总官员
  const totalOfficials = GM.chars.filter(c =>
    c.alive && c.officialTitle && c.officialTitle !== '草民'
  ).length;
  
  // 标准化·北宋熙宁 ~25% → 100·元朝禁科期 0%
  const ratio = recentJinshi / Math.max(totalOfficials, 1);
  return Math.min(100, Math.max(0, ratio * 400));
}
```

**阈值**·
- F2 < 20·tier1 "老牌派系强化" cohesion +0.5 (一次性)
- F2 < 10·tier2 "世家清议党崛起" 新派系 spawn

## C.3·F3 文化整合度公式

```js
function _kjCalcF3() {
  // 偏远省份进士占比
  const peripheryProvinces = ['云南', '贵州', '陕西', '甘肃', '广西', '宁夏', '辽东', '蜀'];
  const all9YearJinshi = (P.keju.history || [])
    .filter(exam => exam.examYear >= GM.year - 9)
    .flatMap(exam => exam.placements || []);
  const peripheryJinshi = all9YearJinshi.filter(j =>
    peripheryProvinces.some(p => (j.birthplace || j.origin || '').includes(p))
  ).length;
  const peripheryRatio = peripheryJinshi / Math.max(all9YearJinshi.length, 1);
  
  // 解额公平度·各省解额标准差倒数
  const quotaList = Object.values(scenario.demographics?.quotaByProvince || {});
  const quotaStdev = _stdev(quotaList);
  const quotaFairness = 1 / (1 + quotaStdev / Math.max(_mean(quotaList), 1));
  
  // F3 = 0.6 × 偏远占比 × 250 + 0.4 × 公平度 × 100
  return Math.min(100, Math.max(0, 0.6 * peripheryRatio * 250 + 0.4 * quotaFairness * 100));
}
```

**阈值**·
- F3 < 30·tier1 "边镇 NPC 上书"·勋望 >60 的边镇官员
- F3 < 15·tier2 "边远士子拒考"·南方解额 -20% + 南方派 tension +5

## C.4·主考 4 属性派生公式 (Slice 5·_kejuExaminerView)

```js
function _kejuExaminerView(ch) {
  // 派生·不加 char schema 字段·当场计算
  const learningTraits = _kjInferLearningTraits(ch.learning || '');
  
  return {
    // 1·preferContent·偏好考试内容
    preferContent: (() => {
      if ((ch.party || '').includes('道学')) return 'philosophy_zhuxi';
      if ((ch.party || '').includes('东林')) return 'classics_practical';
      if ((ch.party || '').includes('阉党')) return 'eight_legged';
      if (learningTraits.philosophy >= 70) return 'philosophy_zhuxi';
      if (learningTraits.statecraft >= 70) return 'statecraft';
      if (learningTraits.confucian >= 70) return 'classics';
      if (learningTraits.poetry >= 70) return 'poetry';
      return 'classics';
    })(),
    
    // 2·preferRegion·偏好籍贯
    preferRegion: ch.birthplace || ch.origin || null,
    
    // 3·strictness·阅卷严格度·派生 ch.integrity + ch.wuchang.li
    strictness: Math.min(100, Math.max(0, 
      (ch.integrity || 50) * 0.6 + (ch.wuchang?.li || 50) * 0.4
    )),
    
    // 4·factionBias·派系偏向强度
    factionBias: ((ch.party && ch.party !== '中立' && ch.party !== '无党派') ? 0.6 : 0.2)
                  + (ch.ambition || 50) / 200
                  + (ch.loyalty || 50) / 400
  };
}
```

## C.5·进士 crystallization 算法 (Slice 8·扩 crystallizeKejuGrad)

```js
function crystallizeKejuGrad_v2(examiner, examYear, rank, slot) {
  const view = _kejuExaminerView(examiner);
  
  // 1·优先使用历史名臣 (亮点 3·shiliao 强制原文)
  const historicalHit = exam.historicalHits?.find(h => h.rank === rank);
  if (historicalHit) {
    return _aiGenerateFullCharacter(historicalHit, _kjRankKey(rank));
  }
  
  // 2·LLM 凭空生·prompt 注入 examiner 4 属性 hint
  const seed = view.preferRegion + '_' + examYear + '_' + rank + '_' + slot + '_' + (GM._runId || '0');
  const candidateHint = {
    examinerParty: examiner.party,
    examinerPreferContent: view.preferContent,
    examinerPreferRegion: view.preferRegion,
    examinerFactionBias: view.factionBias,
    rank, examYear,
    expectedParty: Math.random() < view.factionBias ? examiner.party : null
  };
  
  return _aiGenerateFullCharacter(candidateHint, _kjRankKey(rank));
}

function _kjRankKey(rank) {
  return rank === 1 ? 'zhuangyuan'
       : rank === 2 ? 'bangyan'
       : rank === 3 ? 'tanhua'
       : rank <= 20 ? 'erjia'
       :              'sanjia';
}
```

**关键变化** vs plan v1-v4·

- ✅ 优先用 `pickHistoricalCandidates` 已选历史名臣·复用 `_aiGenerateFullCharacter` 现有 LLM 全字段生成
- ✅ 凭空生·prompt 注入 examiner 4 属性·让 LLM 自动顺主考倾向
- ✅ **不写 personality8D / learningProfile**·LLM 输出的是现有字段 (wuchang / 6 数值 / personality 字符串)
- ✅ `GM._runId` 防撞·重启游戏不重名
- ✅ `_timeAnomaly` 演义跨朝代标签必保

## C.6·改革浪潮 5 触发条件 (Slice 6)

```js
function _kjReformTriggers() {
  // 5 条件·任一满足 + 15 年冷却
  if (GM._reformCooldown && GM.year < GM._reformCooldown) return null;
  
  // A·党争烈度
  const partyTension = _kjCalcTotalPartyTension();
  if (partyTension >= 15) return { reason: 'partyTension', value: partyTension };
  
  // B·F1-F3 任一失衡
  const ind = P.keju.indicators;
  if (ind.f1 < 25) return { reason: 'F1_too_low', value: ind.f1 };
  if (ind.f2 < 15) return { reason: 'F2_too_low', value: ind.f2 };
  if (ind.f3 < 20) return { reason: 'F3_too_low', value: ind.f3 };
  
  // C·国库危机
  if ((GM.guoku?.money || 0) < 100000) return { reason: 'treasury_crisis' };
  
  // D·改革派 NPC 上位
  const reformistOnTop = GM.chars.filter(c =>
    c.alive && c.rank && _cyRankLevelOf(c.rank) <= 4 &&
    c.party && /改革|维新/.test(c.party)
  );
  if (reformistOnTop.length >= 2) return { reason: 'reformist_rising' };
  
  // Fallback·>100 年无改革
  const lastReform = (P.keju.reforms || []).slice(-1)[0];
  if (lastReform && GM.year - lastReform.year >= 100) return { reason: 'timer_fallback' };
  if (!lastReform && GM.year - scenario.startYear >= 100) return { reason: 'timer_fallback' };
  
  return null;
}
```

**主题池映射** (Slice 6 6 主题)·

| 条件 | 主题候选 |
|---|---|
| partyTension | "经义革新" (王安石范式) |
| F1_too_low | "广开科目" (扩大解额) |
| F2_too_low | "考成法" (张居正·官僚效率) |
| F3_too_low | "南北中卷" (明制) |
| treasury_crisis | "捐纳冲击" (清制) |
| reformist_rising | "实学改革" (戊戌策论) |

**6 主题·走 keyi `topicType='reform'`·accept/reject/defer 三路径**·每主题附带 changeMap (KejuTier 改 / toggle 改 / 解额改)。

## C.7·弊案 3 选 2 触发条件 (Slice 7·**不依赖进士派系**)

```js
function _kjScandalTriggers(examOutcome) {
  // 条件 A·主考个人腐败
  const corruptionScore = _corrCalcExaminerCorruption(examOutcome.examiner);
  const condA = corruptionScore >= 50;
  
  // 条件 B·examiner 党派 vs 反方党派 tension
  const examinerParty = examOutcome.examiner.party;
  const enemyParties = _kjGetEnemyParties(examinerParty);
  const totalEnemyTension = enemyParties.reduce((sum, p) =>
    sum + (GM._factionTension?.[p] || 0), 0
  );
  const condB = totalEnemyTension >= 8;
  
  // 条件 C·**examiner 录取偏倚** (依赖 examinerView.factionBias·**非进士派系**)
  const factionBias = examOutcome.examinerView?.factionBias || 0.3;
  const acceptedSameParty = (examOutcome.placements || []).filter(j =>
    j._examinerDerivedParty === examinerParty  // crystallize 时记录·非 j.party
  ).length;
  const totalAccepted = examOutcome.placements?.length || 20;
  const samePartyRatio = acceptedSameParty / totalAccepted;
  const condC = factionBias > 0.6 && samePartyRatio > 0.7;
  
  // 3 选 2 触发
  const matched = [condA, condB, condC].filter(Boolean).length;
  if (matched >= 2) {
    return {
      severity: matched === 3 ? 'major' : 'minor',
      reasons: [condA && 'corruption', condB && 'partyConflict', condC && 'factionBias'].filter(Boolean),
      accuserPool: enemyParties.flatMap(p => _kjGetPartyLeaders(p))
    };
  }
  return null;
}
```

**弊案处理** — 走 keyi `topicType='scandal'`·**investigate / dismiss / protect** 三路径·

- investigate·查办·examiner.officialTitle='待罪'·loyalty -10·走 sc16 memorial 链
- dismiss·罢黜·examiner.officialTitle='庶人'·alive 不变
- protect·保·examiner unchanged·但 enemyParties tension +5·言官离心 +10

---

# 附录 D·朝代 JSON preset

### D.1·明朝·九卿会议传统

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
      "requiredCallList": ["首辅", "次辅", "吏部尚书", "户部尚书", "礼部尚书",
                            "兵部尚书", "刑部尚书", "工部尚书", "都察院左都御史"],
      "topicSpecificRequired": {
        "examiner_pick": ["首辅", "次辅", "礼部尚书", "翰林学士"],
        "scandal":       ["都察院左都御史", "刑部尚书", "锦衣卫指挥"],
        "reform":        ["翰林学士", "礼部尚书", "国子监祭酒"],
        "allocation":    ["吏部尚书", "吏部左侍郎", "首辅"]
      }
    }
  }
}
```

### D.2·宋朝·两府制

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
      "requiredCallList": ["左相", "右相", "枢密使", "知枢密院事"]
    }
  }
}
```

### D.3·唐朝·三省六部

```json
{
  "keju": {
    "system": "kj",
    "tiers": [
      {"name": "解试", "level": "local",    "interactive": false, "daysCost": 90},
      {"name": "省试", "level": "national", "interactive": true,  "daysCost": 60},
      {"name": "殿试", "level": "imperial", "interactive": true,  "daysCost": 30}
    ],
    "examInterval": 1,
    "jinshiPerExam": 25,
    "specialRules": "行卷·座师 + 释褐试 (ranking 后吏部考二次)"
  }
}
```

### D.4·汉朝·察举

```json
{
  "keju": {
    "system": "chaju",
    "enabled": false,
    "alternativeSystem": "察举·孝廉/茂才/贤良方正/童子 4 科·岁举",
    "examInterval": 1
  }
}
```

### D.5·魏晋·九品中正

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

### D.6·元朝·四等人制

```json
{
  "keju": {
    "system": "kj",
    "tiers": [
      {"name": "乡试", "level": "province",  "interactive": false, "daysCost": 90},
      {"name": "会试", "level": "national",  "interactive": true,  "daysCost": 60},
      {"name": "殿试", "level": "imperial",  "interactive": true,  "daysCost": 30}
    ],
    "examInterval": 3,
    "jinshiPerExam": 15,
    "specialRules": "四等人制·蒙古/色目/汉人/南人·左右榜分卷·根脚优先"
  }
}
```

### D.7·清朝·满汉分卷

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
    "specialRules": "满汉分卷·翻译科 (1723 起)·捐纳冲击 (晚清)"
  }
}
```

---

# 附录 E·UI mockup·科举弹窗顶部 3 印石区 (Slice 13)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 📜 科举·天启七年九月·会试阶段        [✕ 退]                            │
├──────────────────────────────────────────────────────────────────────────┤
│  皇威 ▓▓▓▓▓▓▓░░░ 75      皇权 ▓▓▓▓▓░░░░░ 52      民心 ▓▓▓▓▓▓▓░░░ 70 │
│  ─────────────────────────────────────────────────────────────────       │
│  📊 科举派生指标 (本朝)·                                               │
│   F1 士人吸纳 ▓▓▓▓▓▓░░░░ 58·良·士林较平·会试报名 1240 人               │
│   F2 官僚流动 ▓▓░░░░░░░░ 23·**低·门阀化警告**·近 9 年新进士占官 4%      │
│   F3 文化整合 ▓▓▓▓▓▓▓▓░░ 76·良·边远进士占 18%·解额公平度 0.82          │
│  ─────────────────────────────────────────────────────────────────       │
│                                                                           │
│  ▼ 会试阶段·                                                              │
│   ...                                                                    │
└──────────────────────────────────────────────────────────────────────────┘
```

**民心面板 expand 派生 3 行** (Slice 13)·

```
民心 70·略低
├─ 民意来源·
│   赋税满意 +12 / 灾赈 -5 / 战事 -3 / 治安 +8
└─ 科举派生·(本 sprint 加)
    ├─ 士人吸纳 58·中·士论较平
    ├─ 官僚流动 23·**低·门阀化加深** (近 9 年新进士仅占官 4%)
    └─ 文化整合 76·良·边远进士占 18%
```

---

# 附录 F·历史 v1-v5 链接

完整 4 次 audit 历史·决定演进过程·见 `web/docs/keju-overhaul-sprint-history-v1-v5.md`·

| 版本 | 日期 | 核心 | 章节 |
|---|---|---|---|
| **v1** | 2026-05-22 | 初稿·B+ paradigm 三层架构·16 slice / 35-50 d | §1-14 |
| **v2** | 2026-05-22 | 补完算法 + 接口 + 缺漏 + ship 4 组·19 slice / 36-55 d | §15-19 |
| **v3** | 2026-05-22 | game audit·12 处生硬·新 Slice 0.3 + 5.5·21 slice / 39.5-58.5 d | §20 |
| **v4** | 2026-05-23 | paradigm-audit·5 类生硬·三面/代价/反馈循环/交叉/calibration·24 slice / 44-65.5 d | §21 |
| **v5** | 2026-05-23 | runtime read 后真重审·keyi 800 行已存·char schema 全复用·14 函数 [new]→[modified]·22 slice / 31-46.5 d | §22 |
| **v5+§23** | 2026-05-23 | 23 个亮点 audit·12 red line lock·真实工时 25-36 d | §23 |
| **v6 final** | 2026-05-23 | 整理版·全决定 + 亮点 + red line 合并·覆盖前 5 版 | 整文 |
| **v6.5** (本 doc) | 2026-05-23 | **玩家操作补全版**·亲读 runtime 发现 27 操作 v6 只覆盖 ~50%·插 Slice 2.5 / 7.5 / 8.5 / 8.6·26 slice / 28-40 d | §4.5 + 4 新 slice |

---

# Sprint 启动 checklist

- [ ] User 拍板正式启动
- [x] 1.2.4.3 已 ship
- [x] 1.2.4.4 已 ship (常朝 NPC augment 塌缩修复)
- [ ] 创建科举 sprint task·**26 子任务**挂上 (Slice 0-16 + 0.3 + 0.5 + 0.7 + 2.5 + 5.5 + 7.5 + 8.5 + 8.6 + 12.5 + 14.5)·按"开发顺序"链 blockedBy
- [ ] doc commit 进 git history·避免 disk 满丢失 (v5 教训)
- [ ] **每 Slice 实施前 review 该 Slice 对应的 red line·若触碰需明示讨论**

**下一步·user 拍板 → 启动 Phase 0·4 slice (0 / 0.3 / 0.5 / 0.7) 同时开。**

---

**plan v6.5 整理完成**·v6 (~1320 行) → **v6.5 (~1400 行)**·**新加 §4.5 玩家操作清单 + 4 slice (2.5 / 7.5 / 8.5 / 8.6)**·27 操作 100% 闭环·所有 v1-v6 决定 + 23 亮点 + 12 red line + 玩家操作补全·**真 ready**。
