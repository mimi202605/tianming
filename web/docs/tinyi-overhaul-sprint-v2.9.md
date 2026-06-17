# 廷议大改 Sprint·v2.9 (八轮 audit·§9 工时表收口 + doc 内一致性最终扫)

date·2026-05-23·status·**ready for kickoff·8 轮 audit 收口** (v2.8 + 8 处八轮修订)
预算·**25.2 - 29.0d** · 关键路径 ~15.7d (vs v2.8 +0.1d·doc 收口为主)

**v2.9 vs v2.8 修订** (8 处·八轮 audit·完整在 `tinyi-overhaul-3slice-alignment-r8.md`)·

🔴 hard·
- **§9.1 工时表 / §9.2 时间线 stale** (v1.5 原版数字·v2.0-v2.8 全没同步·差 ~3d)·**v2.9 全重写**
- **§6.5 升级路径 L3408 `_chronicleTracker`** v2.6 修过 _chronicleTracks 复数·此处又重现错·改 +s

🟡 medium·
- §6.2 vs §5.4.15 schema fence 重复 spec·加注释明 §5.4.15 权威
- §5.1.6 #9 mentee 抢答依赖 GM._mentorIndex (Slice 10a)·加 lazy guard 注
- `P.userConveningPresets` 改 per-save (P 字段·非 localStorage)

🟢 low·
- §6.5 `_buildMentorIndex` → `_ty3_buildMentorIndex` 命名修
- §9.2 时间线 stale (跟 hard #1 同改)
- §5.1.6 示例补 priority 0/3/5 case (原 4 priority gap)

**8 轮 audit 累计 57 处 finding** (21 hard + 19 medium + 17 low)·所有 finding 都基于 grep / 亲读 v3+runtime verified。

**v2.8 vs v2.7 修订** (7 处·七轮 audit·完整在 `tinyi-overhaul-3slice-alignment-r7.md`)·

⚠️ catastrophic·
- **trait naming convention 跟 runtime 完全不一致**·doc 14 `trait_xianliang/chunzheng/...` (中文拼音前缀·~1 年前 spec)·runtime fill-shaosong-traits.js 50+ trait `brave/honest/just/scholar/schemer/gallant/fickle/zealous/...` (英文 SI·P 社风)·14/14 全 0 hit·**Slice 1/3/6/§5.4.14 用 trait_* 的 spec broken**·**v2.8 全写 ~50 trait BIAS table** (user 选 A) +0.5d

🔴 hard·
- §5.4.3 L2440 `ch.affinity.toEmperor` 重现 (跟 v2.3/v2.6 修过的 number paradigm 矛盾·**doc internal contradiction 又一处**)·改 number 单值
- §5.4.3 `crossPartyRatio` 算法 bug·`counts.size===1` 时 `Math.min/Math.max=1`·ratio=1·走 'balanced'·**实际应是 'oneParty'**·补 size===1 case

🟡 medium·
- §5.4.3 5 `_ty3_v15_*` helper (countByParty/findMissedRequired/addSickLeaveEvent/addResignMemorial/pushClearOpinionEvent) 全 sprint 新建·doc 措辞含糊·补 spec +0.1d
- §5.4.13 `proposer.dims?.honor` → `_ty3_getDims(proposer)?.honor`·跟 v2.3 修过的 helper paradigm 一致

🟢 low·
- §6 schema 加 `GM._urgentBorderAffairs: boolean` +0.05d·event hook 设置
- §5.4.13 urgency clamp 0-10·"10 伏阙急谏" 阈值太松·任何 4-5 条件累加都到 10·提到 9+ + 必 type='inge' + prestige>=80

**v2.7 vs v2.6 修订** (5 处·六轮 audit·完整在 `tinyi-overhaul-3slice-alignment-r6.md`)·

🔴 hard·
- **Slice 4.5·`CY._ty3.currentPhase` v3 只 init 'opening'·后续 0 hit update**·8 phase 分发 switch 永远 fallback default·**6 handler 全失效** (preAudit/seating/vote/archon/draft/seal)·**加 8 处 phase update**·工时 1.5d → **1.8d**
- **Slice 11·smoke 10 议题 topic 0/10 在剧本存在** ("九边粮饷/南迁/钞法/盐法/诛戮魏珰" 全 0 hit·verified)·**Slice 11 加 11.0 fabricate 议题** +0.2d
- **Slice 11·smoke scenario id 5/5 全错** (`tianqi-7-9` 实际 `sc-tianqi7-1627` 等)·按 id load scenario 全 fail·**Slice 11 改 5 id**·0 工时
- **Slice 2.5.5·5 剧本 0/5 有 `scenario.tinyi.convening` config**·朝代差异化 doc 假设是示例·实际全要写入剧本·工时 0.2d → **0.4d** + default fallback

🟡 medium·
- 崇祯/挽天倾 scenario id 重复 `scn_1774945158308` (data bug·flag 给 user backlog·非 sprint)

**verify pass** ✅·6 轮累 spot-check v3 亮点 API 4 项 (§14.A 党派进化 / §14.B NpcMemorySystem / §14.C ChronicleTracker.upsert / §14.G ClassEngine) 全 verified。

**v2.6 vs v2.5 修订** (7 处·五轮 audit·完整在 `tinyi-overhaul-3slice-alignment-r5.md` + paradigm detail 在 `tinyi-slice3-stance-paradigm-detail.md`)·

🔴 hard·
- **Slice 3 stance paradigm 锁 hybrid** (user 选 C)·Round 1 dims 锚定 initial·Round 2+ LLM 可调 current·两阶段 schema·initial 不可变 / current 可变·工时 1.5d → **2.7d**·LLM cost +5%·完整 spec 见 detail doc
- **§6 schema affinity number 收口**·v2.3 Slice 8 修过单值·v2.5 §6 schema 还 object 自相矛盾·v2.6 doc 改 `affinity: 50 (number)` + 注释 enforced

🟡 medium·
- doc 全替换 `_inPrison` → `_imprisoned` (verified 1 hit vs runtime 44 hit)·§5.4.2 + §6
- `_dingyou` (丁忧) runtime 0 hit·新建·Slice 1 子任务加 +0.1d·char 字段 init
- §6 `GM._chronicleTracker[]` → `GM._chronicleTracks[]` (复数·verified L3865)

🟢 low·
- Slice 11 verify chaoyi_pending → tingyi_pending 改名·v3 L3690/3692·user "廷议待落实卡缺" 真原因
- Slice 7.5 工时 0.8d → 1.0d (+prison 集成 + atmosphere 字段子任务)

**v2.5 vs v2.4 修订** (6 处·四轮 audit·完整在 `tinyi-overhaul-3slice-alignment-r4.md`)·

🔴 hard·
- **v3 不是 OFF·当前已 active default** (grep verified·`useTinyiV3` 0 hit·v3 L1534 IIFE 无条件接管)·v2 (`_ty2_openSetup`) 是 dead code·灰度 paradigm 完全错位·**user 选保留双轨 + 修 v2 dead code** (Slice 0 加 0.0a + 0.0b)
- **Slice 11 chronicleTracker 桥接 patch broken + 任务无效**·`ChronicleTracker.push` 不存在 (API 是 `upsert`)·v3 phase14 L3648 已调 `upsert({type:'chaoyi_pending'})`·**桥接没断**·**user 选删 patch + 复查 UI 渲染 bug** (Slice 11 -0.3d + verify UI 子任务 +0.3d·净 0d)

🟡 medium·
- Slice 1 `calibrate-derived-health.js` 路径错·实际 `web/scripts/` (非 `web/tools/`)
- Slice 10a `fill-tianqi-mentors.js` 不存在·doc 写"复用"·实际新建·+0.1d

🟢 low·
- Slice 1 doc "晋 (1) / 大明 (1)" → 实际 0 chars (空剧本)·总 121 chars 非 ~123
- Slice 0 patch 1 措辞模糊·"加" → "改 v3 现有 L1545 override"

**v2.4 vs v2.3 修订** (6 处·三轮 audit·完整在 `tinyi-overhaul-3slice-alignment-r3.md`)·

🔴 hard·
- **Slice 8.5·10 ceremony 全新建·v3 0 hit**·DoD #4 "5" vs 表 "10" 不一致·拆·5 核心 ceremony (鸣鞭/钦定/草诏/用印/追责) 留 8.5·5 联动 ceremony (廷杖/削籍/摘除/革职/更议) 挪 Slice 7.5·**Slice 7.5 工时 0.5d → 0.8d**

🟡 medium·
- **Slice 9 helper name 漂**·doc `_ty3_*` 但常朝 runtime `_cc3_*` (_cc3_cumulativeHint L2390·_cc3_emperorCueHint L2419)·改 alias 方式·Slice 0.5 一并 expose
- **Slice 6 §5.5.5 tone modulation 太薄**·补 prompt injection 方式 + `_ty3_buildToneHint` helper

🟢 low (doc 漂)·
- §5.2.2 mode 视觉表 cite → augment (跟 Slice 5 一致)
- §5.2.3 hotkey caption "7+1" → "1 新加 (V) + 9 已有 = 10"
- §5.2.1 廷推 "9 候选清单 modal" → "按党分组候选清单 (无固定数·v3 _ty3_phase3_buildCandidates verified)"
基础·`tm-tinyi-v3.js` 3942 行·**已是完整 8 阶段政治模拟 system**·**v2.5 verified·v3 当前已 active default** (L1534 IIFE 无条件接管 `_cy_pickMode`·`useTinyiV3` flag 不存在)·v2 (`_ty2_openSetup`) 是 dead code·sprint 走双轨 paradigm·**Slice 0 0.0a verify v2·若 broken 走 0.0b 修复**

**v2.3 vs v2.2 修订** (6 处·二轮 audit·完整在 `tinyi-overhaul-3slice-alignment-r2.md`)·

🔴 hard·
- **Slice 4 patch target 错位**·真 prompt 在 `tm-chaoyi-tinyi.js _ty2_genOneSpeech` (v2 复用)·非 v3 phase2_run·工时 1.5d → **0.8d** (Section A/B/D 已部分在 v2 prompt 内)
- **Slice 5 mode 名漂**·doc `cite` vs 常朝 runtime `augment`·structure 2 字段 vs 8 字段·1.2.4.4 后已不一致·工时 2.0d → **1.2d**
- **Slice 7 `_affinityMap` 不存在**·全 codebase 0 hit·data structure 必须 spec
- **Slice 8 `affinity.toEmperor` 字段错**·runtime `ch.affinity` 是 number·`50.toEmperor =` strict mode TypeError·patch 真 broken

🟡 medium·
- Slice 4.5 `_cySubmitPlayerLine` → `_ty3_onPlayerSpeak` 接入路径未明·补 patch spec
- Slice 4.5 §6 加 5 NPC 并发抢答 LLM cost 表 (~20K token/议题·~$0.3-0.7/玩家日) + DoD 降级 hint

**v2.2 vs v2.1 修订** (12 处·完整 audit 在 `tinyi-overhaul-3slice-alignment.md`)·

🔴 hard·
- (Slice 8) `_ty3_phase6_recordSeal` v3 未 `window` expose·v2.1 hook 必装不上·新 **Slice 0.5** 加 1 行 patch 修
- (Slice 2.5 → 10) mentor 联动调 `GM._mentorIndex`·但 Slice 10 才建·顺序倒挂·**拆 Slice 10a (提前) + 10b**
- (Slice 2.5 / 8) endturn decay 接入点未定·跟 endturn pipeline sprint 冲突·新 **Slice 0.5** 写 decay contract

🟡 medium·
- §5.4.2 "取最严" 实是 3 态 priority cascade·措辞改 + 伪代码补
- clientelism (Slice 10) vs 8D dims (Slice 3) 谁胜出未定·补优先级 rule
- `CY._ty3.conveningPolitics` 跨 slice 无 schema fence·新 **§5.5** 集中

🟢 low (措辞 / 数据源 / 默认值)·
- §5.4.5 "三步" → "四步" caption 修
- §5.4.7 dynastyInit / periodInit / customInit 数据源补
- §5.4.8 monthsPerTurn 精度修 (30 → 30.4375)
- §5.4.11 `_ty3_buildMentorIndex` shape 补 spec
- Slice 8 调用链 phase6→7 时序 verify (Slice 0.5 task)

---

## §0·TL;DR + Quick Start

### TL;DR (90 秒读)

**重大 paradigm 重调** (v2.1 vs v2.0)·本 sprint 不是"激活 + 增强 6 件"·**是 IIFE hook 模式增强 + 三大 v3 system 集成**·

**v3 已是完整政治模拟 system** (亲读 verified)·

- 8 阶段完整 (议前预审 → 起议 → 辩议 → 廷推 → 钦定 → 草诏 → 用印 → 追责)
- **党派进化完整** (3 路径诞生·分裂/私下结社/弹劾结党 + 消亡机制)
- **三大 v3 集成系统**·`ChronicleTracker` (长期工程) + `ClassEngine` (class 层传播) + `NpcMemorySystem` (NPC 记忆)
- **4 套 chronicle 并存**·`GM._chronicle` / `GM._chronicleTracks` / `GM.tinyi.followUpQueue` / `chaoyiChronicleTracks`
- **政治指标已有**·`partyStrife` / `corruption.history` / `partyState.policyFollowUpHistory` / `unlockedRegalia`
- **朝代差异化用印**·唐宋·政事堂 / 明·内阁票拟 → 司礼监批红 / 清·军机处直递

**Sprint 做 4 件**·

1. **激活 gate**·`P.conf.useTinyiV3` 灰度切换
2. **IIFE hook 增强** (non-replacement·v3 effects 不动·sprint 逻辑 append)·**这是 v3 自身 paradigm·sprint 学之** (见 §14.I)
3. **6 增强·全部走 hook**·召集制 / 民意度 / 言官离心 / 玩家发言重做 / 8D mode / mentor + NPC 主动议题
4. **2 bug 修 + 1 verify** (v2.5 改)·v3 L781 typo + chaoyi/chronicle dual write·**chronicleTracker 桥接 verify·非 patch** (v3 phase14 已调 upsert·桥接没断·若 UI 渲染 bug 复查)

### Quick Start (实施者第一步)

```
0. 备份·跑 web/scripts/backup-critical-docs.ps1  (D:\tianming-backups\)
1. 读·本 doc §1 (v3 现状·15 子节·亲读 verified) + §14 (v3 亮点保留清单·必看) + §4.0 (Slice 0 prep)
2. 跑·Slice 0 → 5 个 commit·见 web/docs/tinyi-overhaul-slice0-prep.md
3. 按依赖图 (§3)·Slice 1 → ... → Slice 11
4. 每 Slice 完·跑 §10 DoD 表内对应子项验收 + commit
5. **每 Slice 改 v3·必先 read·必走 IIFE hook 模式·禁止 replacement** (见 §14.I)
6. **每个 hook 必集成 ChronicleTracker / ClassEngine / NpcMemory** (见 §14.B/C/G)
```

### v3 现状速览·已实现 vs 待增强 (v2.1 修订·亲读 verified)

```
v3 已实现 (15 项)·
  8 阶段全 + UI 全
  archon (5档真名 + cohesion/prestige/favor 副作用)
  用印 2 sub-flow + 朝代差异化流程 (明朝·内阁票拟→司礼监批红)
  追责 venue-aware 4 outcome (廷议/御前/常朝/亲谕·fulfilled/partial/unfulfilled/backfire)
  党派 access layer (_ty3_getParties / OpposingParties / AlliedParties)
  党派进化 3 路径 (分裂·私下结社·弹劾结党) + 消亡
  留中册 reissue (三议永弃·_ty3_reissueLimit=3)
  ChronicleTracker (全局长期工程·_chronicleTracks + terminateChronicleTrack)
  ClassEngine (TM.ClassEngine.applyPartyOutcomeToClasses)
  NpcMemorySystem (4 emo·喜/平/忧/恨/politics·intensity 5-8)
  partyState 政治指标 (policyFollowUpHistory / recentPolicyWin/Lose / cohesion / influence)
  partyStrife (党争 0-100) + corruption.history (腐败历史)
  GM.unlockedRegalia (跨场威权特权) + GM._ccHeldItems (留中册)
  GM._turnReport + GM._ty3_pendingReviewForPrompt (AI prompt 注入)
  议前预审·forecast (_ty3_paUpdateForecast) + 主奏者 banner (_ty3_paUpdateProposer)

v3 未实现 (6 增强·sprint 做)·
  召集制 / 民意度 / 言官离心 / 8D mode 规则 / confront chain / 玩家灵活发言 / mentor 联动 / NPC 主动议题

v3 bug (3 修)·
  chronicleTracker 桥接断 (_ty3_phase14 写 _chronicle + chaoyiChronicleTracks·未推 ChronicleTracker)
  L781 typo·"完整七阶段/div>" 缺 <
  chaoyi → _chronicleTracks 单边·user 看到的"廷议待落实"卡需双向桥接
```

---

## §1·v3 现状 audit (亲读 verified·preserve 清单)

**关键背景**·`tm-tinyi-v3.js` 3942 行·已写完所有 8 阶段 + UI·只是被 gate。本 sprint 大量 mockup / spec 必须**100% preserve v3 现有字串 / 命名**·不可换名。

### 1.1·8 阶段·v3 实际命名 (header L4-15)

```
phase 0·  议前预审   (留中 / 私决 / 下议 / 明发) — preAudit
phase 1·  起议站班   (三班布局 + 潮汐条) — seating
phase 2·  分轮辩议   (主奏起议 / 同党附议 / 敌党驳议 / 中立权衡) — debate
phase 3·  廷推       (人事议题·钦定 / 廷推 / 暂阙) — vote
phase 4·  钦定档位   (S/A/B/C/D + huangwei/huangquan) — archon
phase 5·  草诏拟旨   (选官 + prestige/favor 反馈) — draft
phase 6·  用印颁行   (朝代差异化 + 党派阻挠 + 强行用印) — seal
phase 7·  追责回响   (N 回合后强制复盘·4 outcome) — pursue
```

### 1.2·议前预审 4 处置·v3 L761-781 (preserve 100%)

```
📥 留 中      | 皇权 -1   | 搁置一回合·奏者 prestige -2·世人议怠政
🤐 私 决      | 皇威 +1   | 走御前奏对·与心腹密议·不公开
🤝 下议·五人闭门 | 朝堂渐和  | 召三品以上 5 员·小范围议事
📜 明 发·廷议  | 完整七阶段 | 召三品以上百官·四轮辩议·公开裁决

底部·罢·改日再议 (不是 Cancel)
```

**v3 现有 features 在此 panel** (必复用·非新建)·

- **待议册 dropdown** (`GM._pendingTinyiTopics`)·从这选 seedTopic
- **留中册 + "再议" button** (`GM._ccHeldItems` + `_ty3_reissueTopic`)·跨议保留·复议次数 `it.reissuedCount`
- **奏者信息段** (密揭/题本/体裁·memorial content)
- **党派立场预测** (`_ty3_paUpdateForecast`)

**v3 typo bug** (Slice 11 顺手修)·L781·`'<div class="ty3-pa-opt-cost">完整七阶段/div>'` 缺 `<`。

### 1.3·三班布局·v3 L1706-1708 (stance-based·preserve)

```
左班·同·{proposerParty}+盟    (stance=support·proposer 同党)
中班·中立                    (stance=neutral)
右班·异                      (stance=oppose)
```

潮汐条·`〔 三班已立·同 X·中 Y·反 Z 〕` (v3 实际 bubble 文字)。

**user 拍板·双轨 view (v1.5)**·默认 stance-based·**V hotkey 切 class-based** (内阁紫/部院绯/言官绿)·两 paradigm 共存。

### 1.4·辩议 4 轮·v3 L1888-1912 (preserve)

```
〔 第一轮·主奏起议 〕
〔 第二轮·同党附议 〕
〔 第三轮·敌党驳议 〕
〔 第四轮·中立权衡 〕
```

### 1.5·钦定 5 档·v3 L1213-1221 (huangwei/huangquan 驱动)

```js
S· 圣旨煌煌   hw>=70 && hq>=70  → 跳过用印 + 草诏自由 + 反对方 cohesion -10 + 主奏 +3
A· 凛然奉旨   max>=70           → 草诏快通 + 反对 leader prestige -5 + 主奏 leader favor +10
B· 勉强尊行   min>=50           → (中性·众议无定)
C· 众议汹汹   min>=30           → (反意大·硬推)
D· 危诏激变   else              → 触发 [硬推 / 妥协] 二级选项

内侍 bubble·〔 钦定档位·{grade}·{label}·{labelCount} 名·皇威 N·皇权 M 〕
```

**关键**·v3 `_ty3_applyArchonGrade` 已实现完整副作用 (cohesion / prestige / favor)·Slice 8 反弹**必须共存非替换** (见 §7.2)。

### 1.6·朕意 5 浮按钮选项·v3 L545-682 (Slice 4.5 删·语义保留)

```
让 X 起对          → summon intent
让 Y 党党首言之    → summon-party-leader intent
卿且退下          → silence intent (bubble: 〔 X 缄口·朕命之 〕)
另有要事          → abort intent
(关闭)
```

Slice 4.5 删 9 函数 + 2 DOM·改底部 input + 11 intent map (含 v2 5 个 + v1.4 廷议特化 6 个·见 §5.1.5)。

### 1.7·用印 2 sub-flow·v3 L2943-3014 (preserve)

```
button·          ⚔ 强行用印（皇权-5）
阻挠成功·         〔 诏命留中·阻挠者·X 〕
强行成功·         〔 强行用印·阻于 X·皇威 -5·朝堂转 Y 〕
正常颁行·         〔 诏命用印颁行 〕
```

### 1.8·追责 4 outcome·v3 L3413 (preserve)

```js
outcome = sealStatus === 'blocked' ? 'blocked' :   // 阻挠
          (grade === 'S' || grade === 'A') ? 'fulfilled' :  // 圆满
          (grade === 'D') ? 'contested' :          // 抵触
          'partial';                                // 部分
```

### 1.9·v3 已有 helper·Slice 复用 inventory

```js
// §1·党派访问层 (L70-99)·Slice 2.5 召集 / Slice 8 反弹 直接复用·-0.3d
_ty3_getParties()                  → GM.parties[]
_ty3_getPartyObj(name)             → party object
_ty3_getOpposingParties(partyName) → enemies array
_ty3_getAlliedParties(partyName)   → allies array

// 议前预审 (L696+)·Slice 0 mockup 复用
_ty3_paUpdateForecast()            → 党派立场预测条
_ty3_reissueTopic(i)               → 复议留中议题

// archon (L1212+)·Slice 8 反弹必须 hook 在此之后
_ty3_readHuangwei()
_ty3_readHuangquan()
_ty3_computeArchonGrade()
_ty3_applyArchonGrade(grade, opts)  → cohesion / prestige / favor 副作用

// 入口 + gate (L1544-1553)·Slice 0 加 P.conf.useTinyiV3 flag
window._cy_pickMode override

// chronicleTracker 桥接断 (L3604-3678)·Slice 11 修
_ty3_phase14_recordChaoyiSummary    → 写 GM.recentChaoyi + chaoyiChronicleTracks·**未写 _chronicleTracker**
```

### 1.10·v3 GM state schema (已存在·sprint 必复用)

```js
GM.parties[]              // 党派 (从 P.parties 按 sid 过滤·tm-patches.js L1435 init)
GM.unlockedRegalia[]      // 永久威权特权·跨场廷议保留
GM._ccHeldItems[]         // 留中册
GM._pendingTinyiTopics[]  // 待议册 (议前预审"明发"从此读)
GM.recentChaoyi[]         // 短期记忆·cap 8 件
GM.huangwei.index         // 皇威·0-100
GM.huangquan.index        // 皇权·0-100
GM.vars['皇权'].value     // 备用 path
CY._ty3                   // 廷议会话状态 (替代 CY._ty2 v3 子集)
CY._ty3_archonGrade       // 当前档位 S/A/B/C/D
```

### 1.11·v3 弹劾结党 spawn 路径 (v3 §12·v2.1 亲读后 promote 入本期)

v3 L3173·`_ty3_phase12_onAccusationApproved`·**完整实现**·

```js
// 准奏弹劾后·
verdictGrade·{S:12, A:10, B:8, C:6, D:4} → sanction
新党·(parent + ' Trial Faction')·status='被劾'·initialInfluence 6-18·initialCohesion 30-72
累者 prestige -sanction·stress +sanction+8
NpcMemorySystem.remember(name, 'Impeachment approved', 'politics', 8)
bubble·〔 准奏弹劾·定性新党：X 〕

党派进化·_ty3_partyEvolutionTick (L3273)·
  cohesion<20 持 3 turn → 分裂 (status='分化')
  prestige>80+favor>70+cohesion<30 → 私下结社 (status='隐党')
  cohesion<10+influence<5+members<3 → 自然消亡 (status='湮灭')

API·_ty3_partySpawn / _ty3_partyDispose
```

**v2.1·从 backlog promote 入本期**·Slice 2.5 召集 + Slice 8 反弹 + Slice 10 mentor 都需复用此 API·不可绕过。

### 1.12·v3 三大集成系统 (v2.1 亲读新发现·必复用)

#### 1.12.1·ChronicleTracker (全局长期工程)

```js
// v3 已有·sprint 必走此 API·非自建
window.terminateChronicleTrack(id, reason)   // 玩家中辍·"已中辍·后果已应用"
window.listTerminableTracks()                // 列可中辍 active tracks
GM._chronicleTracks[]                        // 长期 chronicle track 数组

// chaoyi 桥接·_ty3_syncChaoyiChronicleTrack(...)·v3 已有
//   trackId / topic / proposerParty / opposingParties / grade / decisionMode
//   currentStage / progress / summary / narrative / sealStatus / priority
```

**Slice 11 桥接 verify** (v2.5 改·v2.4 误 patch)·v3 `_ty3_phase14_recordChaoyiSummary` L3648 已调 `_ty3_syncChaoyiChronicleTrack` → `ChronicleTracker.upsert({type:'chaoyi_pending'})` (L3689)·**桥接已存在·sprint 只 verify·非加 patch**·见 §14.C。

#### 1.12.2·ClassEngine (class 层政治结果传播)

```js
// v3 已有调用点·Slice 8 反弹必经此·非绕过
TM.ClassEngine.applyPartyOutcomeToClasses(GM, {
  sealStatus, outcome, grade, sourceParty, opposingParties, blockerParty
}, { turn, source: 'tinyi-stage6-blocked' | 'tinyi-stage6-issued' | 'tinyi-stage7-follow-up' });
```

#### 1.12.3·NpcMemorySystem (NPC 记忆)

```js
// v3 已有·sprint 必集成·Slice 4 + Slice 8 hook
NpcMemorySystem.remember(name, text, emoType, intensity, [venue])
// emo·喜 / 平 / 忧 / 恨 / politics
// intensity·5-8

// v3 调用点·
phase 5 草诏·     喜·6 (草诏荣宠)
phase 7 追责·     {fulfilled:喜·6 / partial:平·5 / unfulfilled:忧·5 / backfire:恨·8}
phase 12 弹劾审准·politics·8
```

### 1.13·4 套 chronicle 并存 (v2.1 亲读·sprint 必懂区分)

```js
1. GM._chronicle[]               ← v3 直接 push·短文本 entry
                                   "Blocked" / "Issued" / "议题永弃" / "党祸·新党生" / "党祸·党亡"
                                   _ty3_pushChronicle 写
2. GM._chronicleTracks[]         ← ChronicleTracker (全局长期工程)·terminable
                                   含·"廷议待落实" 卡的真源
3. GM.tinyi.followUpQueue[]      ← 廷议追责队列·**6 turn 后到期** (v3 _TY3_REVIEW_DELAY=3·tinyiFollowUpDelay=6·两套 delay)
                                   _ty3_enqueueTinyiFollowUp / _ty3_phase7_runFollowUpQueue
4. _ty3_syncChaoyiChronicleTrack → chaoyi → chronicle track 桥接 (v3 已有)
```

**v2.1 修正**·我 v2.0 写"6 turn"·实际 **`_TY3_REVIEW_DELAY=3` (复评)** + **`tinyiFollowUpDelay=6` (廷议追责)** 两套并存·**应分清**。

### 1.14·政治指标系统 (v3 已有·v2.0 漏)

```
GM.partyStrife              0-100·党争·phase 7 outcome 调整 (fulfilled -1·partial +1·blocked/contested +2)
GM.corruption.history[]     腐败历史·phase 7 push
partyState.policyFollowUpHistory  每党 policy 追责历史
partyState.recentPolicyWin / recentPolicyLose  党最近胜负 (Slice 4 prompt 注入 hint)
GM._turnReport[]            per-turn report·AI 推演 prompt 注入
GM._ty3_pendingReviewForPrompt[]  追责 prompt 注入队列
GM._partyEvolutionState     党派进化 state (lowCohStreak / privateSocietySpawned / splitSpawned)
GM._ccFinalBlockedItems[]   议题永弃清单 (三议不决)
```

### 1.15·v3 phase 7 追责·venue-aware 4 outcome (v2.0 J/K 推错·v2.1 verified)

**两种 outcome 系统并存**·

```js
// phase 6 用印瞬间 outcome (L3413·sealStatus mapping)·
blocked    阻挠    seal blocked
fulfilled  圆满    S 或 A 档
partial    部分    B 或 C 档
contested  抵触    D 档

// phase 7 真追责 outcome (L3534·progressPercent + feedback·跟 edict 关联)·
fulfilled    充分落实  (准奏果验·古文)  progress >= 80%
partial      部分落实  (行而未尽)        40-80%
unfulfilled  未落实    (奉行不力)        < 40%
backfire     反效果    (适得其反)        feedback 含 "反噬/失控/恶化"
```

**4 venue·廷议 / 御前 / 常朝 / 亲谕** — `_ty3_isReviewableEdict` 按 source 区分·sprint 必保留 venue label。

### 1.16·议前预审 forecast·gameplay hint (v3 L902·已实现·sprint preserve)

```js
// _ty3_paUpdateForecast·实时算各党 stance·
ratio > 20·  "★ 议题占优·明发可能直冲 A 档以上"
ratio < -20· "⚠ 反对势众·明发恐危诏激变(D 档)"
其他·        "势均力敌·结果难料"
```

D.8 mockup 应加 forecast 段 + 3 句 hint preserve。

---

## §2·Sprint 目标 + 范围

### 2.1·目标 (success criteria)

把廷议从 **v3 完整但 gated** 升级到 **激活 + 6 增强**·覆盖率 ≥ 95%·

| 维度 | 现状 | 目标 |
|---|---|---|
| v3 8 阶段 | gated | 激活 + 灰度 toggle |
| 召集制 | 无·进议题前无召集 | 6 资格 + 5 后果 + 4 策略 + AI 推荐 27 tag |
| 民意度系统 | 无 | -100~+100·5 档·按 dynasty/daysPerTurn decay |
| 言官离心 | 无 | 0-100·4 阈值 (20/40/60/80) + 2-3 turn buffer |
| 玩家发言 | 浮按钮 + 5 prompt() 选项 | 底部 input + 8 phase 分发 + 11 intent |
| 8D mode | 无 rule engine | 25 rules · trait bias · anti-塌缩 guard |
| mentor 联动 | mentor 字段 ~5 关系 | 补 ~50·clientelism + 召集联动 |
| NPC 主动议题 | 仅剧情 escalate | 言官/阁臣/党魁 上书 request_tinyi·3 路径 |
| 裁决反弹 | v3 仅 cohesion / prestige | + minority loyalty / affinity / martyr / 党争 (共存·折扣) |
| chronicleTracker bug | 桥接断 | 修·"廷议待落实" 卡入 _chronicleTracker |
| traitIds 覆盖 | 5 剧本全 0% | 100% (~123 chars) |

### 2.2·范围 (in scope)

✓ 上 11 项 + 11 边界 case (§5/§6/§7)·见 §10 DoD 总表

### 2.3·非范围 (out·留 backlog)

- yuqian (御前会议) port·5-7d
- 廷推算法重写·v3 按 influence 加权抽签继续用
- 议题词条剧本化 (war stance 不剧本化·内置规则)
- 朝代差异化朝堂语 (明清统一·宋唐先不做)
- 廷议中"私语" feature (跟 §A.7 重叠·post-sprint)
- 廷议结束 NPC gossip (跟 sc1q 联合·post-sprint)
- 私下接见 (post-tinyi audience·post-sprint)
- NPC 宣读奏疏全文 (用一句话摘要替代)
- 廷议音效 (静默 CSS animation 替代)
- 多语言 i18n (中文专属)

---

## §3·路线图

### 3.1·依赖图

```
        ┌──────────────────────────────────────────────────────────┐
        │  Slice 0·prep·v3 audit + flag + baseline + 浮按钮 prep    │
        │  (1.0d·v1.5 +0.5d·亲读 v3 audit)                          │
        └───────────┬──────────────────────────────────────────────┘
                    │
                    v
        ┌──────────────────────────────────────────────────────────┐
        │  Slice 0.5·**v2.2 新**·contract + v3 expose (0.5d)        │
        │  - window._ty3_phase6_recordSeal expose                  │
        │  - endturn decay contract doc                            │
        │  - phase6→7 调用链 verify                                 │
        │  - §5.4.15 schema fence                                  │
        └───────────┬──────────────────────────────────────────────┘
                    │
        ┌───────────┼─────────────────────────────────────┐
        │           │                                     │
        v           v                                     v
   ┌────────────┐  ┌─────────────────────┐  ┌────────────────────────┐
   │ Slice 1    │  │ Slice 2             │  │ Slice 4·常朝 paradigm  │
   │ traitIds   │  │ 议题 tag 扩 27·     │  │ 移植·aiPersonaText +    │
   │ 5 剧本     │  │ topicType → tag 映射 │  │ 8D dims + hw/hq 注入   │
   │ 1.5d       │  │ 1.2d                 │  │ 1.5d                   │
   └────────────┘  └──────────┬──────────┘  └─────────┬──────────────┘
                              │                       │
                              │   ┌───────────────────┴──┐
                              │   │ Slice 10a (v2.2 新)  │
                              │   │ mentor 数据 + index  │
                              │   │ 1.0d                 │
                              │   │ **必先于 Slice 2.5** │
                              │   └─────────┬────────────┘
                              │             │
                              v             │
                   ┌──────────────────────────┐       │
                   │ Slice 2.5·召集制          │       │
                   │ 6 资格 (含 prestige) +    │       │
                   │ 5 后果 + AI 27 tag +     │       │
                   │ 朝代三套 + mentor 联动 + │       │
                   │ NPC 主动发议题 +         │       │
                   │ 民意度 + 言官离心         │       │
                   │ 2.3d (v1.5.1·-0.2 复用)  │       │
                   └──────────┬──────────────┘       │
                              │                       │
                              v                       │
                   ┌────────────────────────┐         │
                   │ Slice 3·8D dims + tag  │         │
                   │ 接入 stance·fallback B │         │
                   │ 1.5d                   │         │
                   └──────────┬─────────────┘         │
                              │                       │
                              └────────┬──────────────┘
                                       │
                                       v
                  ┌────────────────────────────────────────────┐
                  │ Slice 4.5·玩家发言 paradigm 重做·         │
                  │   删 v3 浮按钮 + 5 prompt() 选项·         │
                  │   底部 input + 8 phase 分发·              │
                  │   13 keyword + 11 intent + 6+4 抢答       │
                  │   1.5d                                     │
                  └──────────────────┬─────────────────────────┘
                                     │
                                     v
                            ┌────────────────────────┐
                            │ Slice 5·10 mode 全实现 │
                            │ (6 常朝 + 4 廷议)      │
                            │ 2.0d                   │
                            └──────────┬─────────────┘
                                       │
                                       v
                            ┌────────────────────────┐
                            │ Slice 6·25 persona ×   │
                            │ tag 规则 + trait bias + │
                            │ tone modulation        │
                            │ 1.5d                   │
                            └──────────┬─────────────┘
                                       │
                                       v
                            ┌────────────────────────┐
                            │ Slice 7·confront 真对质│
                            │ + "助 A / 助 B / 敕停" │
                            │ + 链跨阶段 3 路径       │
                            │ 1.5d                   │
                            └──────────┬─────────────┘
                                       │
                                       v
                  ┌────────────────────────────────────────────┐
                  │ Slice 7.5·廷议特化 6 动作 + ceremony·     │
                  │   仗下 / 削籍 / 摘除 / 转部议 / 更议·     │
                  │   革职 + 10 ceremony 动画 (时长 inline)   │
                  │   0.5d                                     │
                  └──────────────────┬─────────────────────────┘
                                     │
                                     v
                            ┌────────────────────────┐
                            │ Slice 8·裁决反弹·     │
                            │ minority loyalty / 党争│
                            │ + 召集后果二次惩罚 +    │
                            │ v3 effects 共存折扣     │
                            │ 1.2d                   │
                            └──────────┬─────────────┘
                                       │
                                       v
                  ┌────────────────────────────────────────────┐
                  │ Slice 8.5·廷议 UI 升级·                   │
                  │   三班双轨 view (V hotkey) + 立场板放大·  │
                  │   confront 红线 + 10 mode 视觉·           │
                  │   用印 2 sub-flow modal + ceremony UI·    │
                  │   召集 preset (localStorage) +            │
                  │   7+1 hotkey·1.8d (v1.5 +0.3d)            │
                  └──────────────────┬─────────────────────────┘
                                     │
                                     v
                            ┌────────────────────────┐
                            │ Slice 9·cumulative +   │
                            │ emperor cue Tier 2     │
                            │ 0.5d                   │
                            └──────────┬─────────────┘
                                       │
                                       v
                            ┌────────────────────────┐
                            │ Slice 10b·**v2.2 拆**  │
                            │ clientelism + 联动 UI  │
                            │ (10a 已在 Slice 2.5 前) │
                            │ 0.5d                   │
                            └──────────┬─────────────┘
                                       │
                                       v
                            ┌────────────────────────┐
                            │ Slice 11·smoke + DoD + │
                            │ chronicleTracker 桥接 + │
                            │ typo 修 + summary doc   │
                            │ 1.8d (v1.5 +0.3d)      │
                            └────────────────────────┘
```

### 3.2·关键路径 + 总工时

**关键路径** (must-be-sequential)·Slice 0 (+0.0a/0.0b) → 0.5 → 2 → 10a → 2.5 → 3 → 4 → 4.5 → 5 → 6 → 11 = **~15.3-16.3d** (v2.7 +0.5d·Slice 4.5 +0.3d / Slice 11 +0.2d 都在关键路径)·Slice 2.5.5 +0.2d 在 Slice 2.5 子任务·不展开

**并行可能**·

```
并 1·  Slice 1 (traitIds) // Slice 2 (tag) — 同时跑
并 2·  Slice 4 (persona) // Slice 7.5 (廷议动作) — Slice 5 后并
并 3·  Slice 8 (反弹) // Slice 8.5 (UI) — Slice 7 后并
```

**总工时** (v1.5.1·亲读 v3 优化后)·

| Slice | 工时 | 备注 |
|---|---|---|
| 0  | 1.0d | v1.5 +0.5d 加 v3 audit |
| 1  | 1.5d | |
| 2  | 1.2d | v1.4 +0.2d (扩 11 tag) |
| 2.5 | 2.3d | v1.5.1 -0.2 (helper 复用 -0.3 + forecast +0.1) |
| 3  | 1.5d | |
| 4  | 1.5d | hw/hq 注入 prompt 在内 |
| 4.5 | 1.5d | |
| 5  | 2.0d | |
| 6  | 1.5d | |
| 7  | 1.5d | |
| 7.5 | 0.5d | |
| 8  | 1.2d | v3 effects 折扣计算在内 |
| 8.5 | 1.8d | v1.5 +0.3d (V hotkey + 用印 2 sub-flow) |
| 9  | 0.5d | |
| 10  | 1.5d | |
| 11  | 1.8d | v1.5 +0.3d (chronicle 桥接 + regalia smoke) |
| **总** | **22.8d** | (含 buffer 上限 25.8d) |

### 3.3·灰度策略

```js
// Slice 0 加·tm-tinyi-v3.js:1544-1553 patch
var v3On = !!(window.P && window.P.conf && window.P.conf.useTinyiV3 === true);
if (mode === 'tinyi' && v3On) {
  _ty3_open();
  return;
}
// fallback·走 v2·orig.apply
```

- 默认 `P.conf.useTinyiV3 = false`·v2 路径 (现状)
- 设置面板加 toggle "廷议·新框架 (v3·测试中)"
- sprint 完后·若 smoke 全绿 + 10+ 议题无 critical bug → 反转默认 `true`·v2 留 emergency fallback

---

## §4·Slice 详细 spec (按实施顺序·DoD inline)

### Slice 0·prep + v3 audit + flag + v2 verify (1.3-2.5d·v2.5 +0.3-1.5d·加 0.0a verify v2 + 条件 0.0b 修 v2 dead code)

**目标** (v2.5 改)·

1. **0.0a·verify v2 dead code 状态** (0.3d) — sprint 双轨假设 v2 仍可用 fallback·实际 v3 已 active default 多时·v2 (`_ty2_openSetup`) 可能多年没维护·先 verify
2. 若 v2 broken → **0.0b·修复 v2 dead code** (+0.5-1.2d 不等·按 broken 程度)·确保双轨 fallback 真可用
3. 激活 v3 灰度·建立 baseline·标记 Slice 4.5 删除目标·完整 v3 字串 audit (原 Slice 0)

**子任务 0.0a·verify v2** (v2.5 新·0.3d)·

```
1. 临时 patch tm-tinyi-v3.js L1545-1552·force `return orig.apply(this, arguments)` (绕过 v3 接管)
2. 跑 5 case·5 剧本 × 1 议题·_cy_pickMode('tinyi') → _ty2_openSetup
3. 录·v2 入口工作 / 4 轮辩议工作 / phase 0 议前预审工作 / 钦定档位工作 / 用印工作
4. 报告·v2 broken 程度·
   - clean (全 5 case pass) → 双轨 paradigm 可用·跳 0.0b
   - 部分 broken → 走 0.0b 选择性修
   - 全 broken (大部分 case fail) → 跟 user 协商·v3-only paradigm 或 0.0b 修
5. revert 临时 patch·恢复 v3 接管
```

**子任务 0.0b·修 v2 dead code (条件)** (v2.5 新·0.5-1.2d·按 0.0a 结果决定)·

```
若 0.0a 发现 v2 部分 broken·按破损 spot 修·
  - phase 0 议前预审 4 处置 modal 缺失·补 (~0.2d)
  - 4 轮辩议 NPC 调用 broken·修 (~0.3d)
  - 钦定档位 UI 缺失·补 (~0.3d)
  - 用印 sub-flow 缺失·补 (~0.4d)
若 0.0a 全 broken·跟 user 决定·
  - (i) 走 v3-only·删 Slice 0.0b·去 toggle UI + fallback 代码 (-0.2d)
  - (ii) 全修 v2 (~1.5d)·跟 v3 parity
```

**patch 1·改 v3 现有 override** (v2.5 措辞修)·**改** tm-tinyi-v3.js L1545-1552 现有 IIFE override·原·

```javascript
// 现有·v3 无条件接管 (L1545-1552)
window._cy_pickMode = function(mode) {
  if (mode === 'tinyi') {
    if (typeof CY !== 'undefined') CY.mode = mode;
    _ty3_open();   // 当前·所有 tinyi 强制 v3
    return;
  }
  return orig.apply(this, arguments);
};
```

改为 (加 v3On gate)·

```javascript
window._cy_pickMode = function(mode) {
  if (mode === 'tinyi') {
    var v3On = !!(window.P && window.P.conf && window.P.conf.useTinyiV3 !== false);  // 默认 true·显式 false 才 fallback
    if (v3On) {
      if (typeof CY !== 'undefined') CY.mode = mode;
      _ty3_open();
      return;
    }
    // fallback·走 v2 (条件·若 0.0a verify pass / 0.0b 已修)
  }
  return orig.apply(this, arguments);
};
window._cy_pickMode._ty3Override = true;
```

**v2.5 default**·`useTinyiV3 != false` → **默认 v3** (跟现状一致)·非 v2.4 doc 的 `=== true` (默认 v2)·**reflect v3 已 active default 的现实**·toggle 默认 v3·用户主动关到 v2 fallback。

**patch 2**·`tm-patches.js` 设置面板·参考 `recallGateEnabled` toggle 模式·加·

```javascript
var _tinyiV3On = !!(P.conf && P.conf.useTinyiV3 === true);
// HTML·
'<div class="s-row s-tinyi-v3" style="margin-top:0.6rem;">' +
  '<input type="checkbox" id="s-tinyi-v3" ' + (_tinyiV3On?'checked ':'')
    + 'onchange="_togglePConf(\'useTinyiV3\',this.checked)">' +
  '<label for="s-tinyi-v3">廷议·新框架 (v3·测试中)' +
    '<span style="font-size:0.85rem;color:#888;">8 阶段·测试期·遇 bug 关掉走 v2</span>' +
  '</label>' +
'</div>'
```

**patch 3**·`tm-tinyi-v3.js:545-682`·9 函数 + 2 DOM 加 `// SLICE_4_5_DELETE_START / END` marker (不删·只标)。

**baseline 录**·`web/scripts/_baseline-tinyi-before-prompts.json`·10 case (5 v2 + 5 v3)·5 剧本各 1 议题。

**v3 audit 输出**·`web/docs/tinyi-v3-existing-strings-audit.md`·grep v3 所有中文 string + helper inventory + 已知 bug 清单。

**子任务 + DoD** (v2.5 加 0.0a + 0.0b)·

| # | 子任务 | 工时 | DoD |
|---|---|---|---|
| **0.0a** | **(v2.5 新)** verify v2 dead code·force orig 跑 5 case·录 broken 程度 | **0.3d** | verify report·v2 入口/4 轮/钦定/用印 各自 pass / partial / fail 标 |
| **0.0b** | **(v2.5 新·条件)** 修 v2 dead code (按 0.0a 结果·选择性)·或 v3-only paradigm (跟 user) | **0-1.2d** | 双轨 fallback 可用 OR v3-only 决定签字 |
| 0.1 | grep v3 中文 string + helper inventory | 0.2d | `tinyi-v3-existing-strings-audit.md` ~200 行 |
| 0.2 | **(v2.5 改)** v3 gate flag 改 (patch 1)·**默认 v3** (useTinyiV3 != false)·toggle 关到 v2 (条件 0.0a/b 后) | 0.05d | flag != false → v3·= false → v2 fallback (条件) |
| 0.3 | 设置面板 toggle (patch 2)·**v2.5 改·默认勾选 (v3 ON)·关掉 → v2 fallback** | 0.1d | UI 显·重启保留·默认勾选 |
| 0.4 | 浮按钮 mark for delete (patch 3) | 0.05d | grep `SLICE_4_5_DELETE` ≥ 18 marker |
| 0.5 | baseline 录·10 case | 0.2d | JSON 入 git |
| 0.6 | task #131-146 创建 | 0.1d | 16 子 task 挂上 |
| 0.7 | v3 已有 UI 全审 (亲读) | 0.3d | spot-check 5 mockup vs v3 实际·100% 对齐 |

**5 commits**·按子任务·`[tinyi-overhaul Slice 0.X] ...`

详见 `web/docs/tinyi-overhaul-slice0-prep.md` (340 行·ready to apply)。

---

### Slice 0.5·v2.2 新增·contract + v3 expose (0.5d)

**目标** (v2.2 新)·解 v2.1 audit 出的 3 hard bug 的 setup 层·

1. **v3 expose patch**·`window._ty3_phase6_recordSeal = _ty3_phase6_recordSeal` (1 行·让 Slice 8 hook 装得上)
2. **endturn decay 接入契约**·哪个 step 跑 `_ty3_v15_decayConveningCounters()`
3. **跨 slice schema fence**·见 §5.5·确认字段名 + 读/写责任 slice
4. **phase6→7 调用链 verify**·亲读 v3 L2770-2914·确认 phase6_recordSeal 调用顺序·确保 Slice 8 hook 时 phase6 effects 已跑 + phase7 effects 尚未跑

**patch**·`tm-tinyi-v3.js`·L3366 附近 (跟现有 phase6_open / doSeal expose 一致位置)·加·

```js
window._ty3_phase6_recordSeal = _ty3_phase6_recordSeal;  // v2.2·Slice 8 hook 用
```

**decay 接入契约** (写入 `web/docs/tinyi-decay-contract.md` ~80 行)·

```
触发·每 turn endturn 阶段·"末段后处理" step (跟 sc_consolidate / chronicleTrack decay 同列)
顺序·partyStrife decay → 民意度 decay → 言官离心 decay → conveningPolitics 7-turn 后 reset
当前 endturn pipeline 接入点·
  - 旧 pipeline (现状)·patch tm-endturn-apply.js 末尾追加调用·风险低
  - 新 pipeline (endturn sprint 后)·挂 ctx.crossTurn step·风险更低
sprint 默认走旧 pipeline patch·endturn sprint 完后 Slice 11 收口迁移
```

**phase6→7 调用链 verify**·写入 `web/docs/tinyi-phase-callchain.md` ~50 行·

```
_ty3_phase6_doSeal(UI 入口) 
  → _ty3_phase6_resolveSeal(异步等用印动画) 
    → _ty3_phase6_recordSeal(状态写入·grade / sealStatus / ClassEngine 调用)  ← Slice 8 hook 这里
  → _ty3_phase6_advanceToFollowUp(N 回合后入队·非立即跑)
  
phase7 真追责·
  _ty3_phase7_runFollowUpQueue (endturn pipeline 内·跟 phase6 异步分离)
  
结论·Slice 8 hook recordSeal 时·phase6 effects (cohesion/prestige/favor) 已应用·phase7 effects (追责) 尚未发生 (N 回合后才到期)·正确。
```

**子任务 + DoD**·

| # | 子任务 | 工时 | DoD |
|---|---|---|---|
| 0.5.1 | window expose 1 行 patch v3 | 0.05d | grep `window._ty3_phase6_recordSeal` ≥ 1 hit·控制台 test `typeof window._ty3_phase6_recordSeal === 'function'` |
| 0.5.2 | decay 接入契约 doc | 0.2d | `tinyi-decay-contract.md` ready·Slice 2.5/8/11 实施直接看 |
| 0.5.3 | phase6→7 调用链 doc | 0.1d | `tinyi-phase-callchain.md` ready·verified by 亲读 v3 L2770-2914 |
| 0.5.4 | §5.5 schema fence (本 doc 内) | 0.1d | 6 字段全列·write/read slice 标 |
| 0.5.5 | smoke·hook 装得上 | 0.05d | mock `_ty3_phase6_recordSeal` 调用·assert hook 副作用触发 |

**DoD (5 项)**·

1. `window._ty3_phase6_recordSeal` 暴露 verified
2. `tinyi-decay-contract.md` 入 git
3. `tinyi-phase-callchain.md` 入 git·phase6→7 顺序 verified
4. v2.2 §5.5 schema fence 6 字段全列
5. smoke·Slice 8 hook 在 mock recordSeal 调用后能触发

---

### Slice 1·5 剧本 traitIds 补 + _dingyou 字段建 (1.6d·v2.6 +0.1d·加 _dingyou)

**目标**·5 剧本 121 chars 补 traitIds·让 8D dims fallback A 跑得通 (~95% 覆盖)·**v2.6 新加**·建 `_dingyou` (丁忧) 字段 init·5 剧本 chars schema 一并补。

**任务** (v2.5 修 + v2.6 加)·

- 复用 `web/tools/fill-shaosong-traits.js`·改剧本输入参数
- 批跑·崇祯 (45) / 挽天倾 (44) / 111 (32)·共 **121 chars** (v2.5 校正·非 ~123)·**晋 (0) / 大明 (0) 空剧本跳过**·官方剧本天启 (200/203·98%) + 绍宋 (98/98·100%) 已覆盖
- 抽 10 chars 手验·崇祯 5 + 挽天倾 5·top 6 traits 合理
- 跑 **`web/scripts/calibrate-derived-health.js`** 验证 (v2.5 路径修·非 `web/tools/`)
- **(v2.6 新)** `_dingyou` 字段建·char schema 加 `_dingyou: false` (default)·init hook 跟 `_imprisoned / _sick / _exiled` 等并列·Slice 2.5 §5.4.2 8 类 status 才能用全

**DoD** (v2.6 扩·4 项)·

1. 5 剧本 traitIds 覆盖率 → 100%
2. 抽 10 chars top 6 traits 合理
3. `aggregateDims` 任 NPC ≥ 95% 非全 0
4. **(v2.6 新)** `_dingyou` 字段 init·grep `_dingyou` ≥ 5 hit (schema + init + Slice 2.5 read·都齐)

---

### Slice 2·议题 27 tag + 映射 (1.2d·v1.4 +0.2d)

**目标**·v3 顶部加 27 tag 常量·`_ty3_inferTopicTags` 按 `topicType + topicText keyword` 推断。

**27 tag** (16 v1.3 + 11 v1.4 扩)·

```js
const TINYI_TOPIC_TAGS = [
  // 财政 5
  'finance', 'reward', 'land-tax', 'currency', 'canal-transport',
  // 军事 5
  'military-command', 'border-affairs', 'coastal-defense', 'northern-defense', 'regicide-pursuit',
  // 人事 3
  'personnel', 'official-selection', 'inspection',
  // 法律 3
  'execution', 'penal-harsh', 'law-reform',
  // 礼制 5
  'succession', 'ritual', 'ritual-major', 'etiquette', 'imperial-lecture',
  // 天文 2
  'prophecy', 'calendar',
  // 工程 1
  'river-works',
  // 外交 2
  'foreign-policy', 'relief'
];
```

**keyword 映射** (v1.4 扩)·

```js
function _ty3_inferTopicTags(topicType, topicText) {
  const tags = new Set();
  if (TYPE_TO_TAG[topicType]) TYPE_TO_TAG[topicType].forEach(t => tags.add(t));
  const t = topicText || '';
  if (/盐|税|赋|关税|榷|商/.test(t))    tags.add('finance');
  if (/赏|奖|加封|爵/.test(t))          tags.add('reward');
  if (/田|赋|清丈|纳粮/.test(t))        tags.add('land-tax');
  if (/钞|银|铜|铸钱|宝泉/.test(t))    tags.add('currency');
  if (/漕|船|粮运|海运/.test(t))        tags.add('canal-transport');
  if (/兵|将|师|战/.test(t))            tags.add('military-command');
  if (/边|九边|塞|关/.test(t))          tags.add('border-affairs');
  if (/海防|倭|海寇|水师/.test(t))      tags.add('coastal-defense');
  if (/北防|蒙|虏|马匪/.test(t))        tags.add('northern-defense');
  if (/诛|斩|赦免|逮/.test(t))          tags.add('execution');
  if (/魏珰|阉党|奸|戮/.test(t))        tags.add('regicide-pursuit');
  if (/吏|选|铨|官/.test(t))            tags.add('personnel');
  if (/选官|廷推|铨选/.test(t))         tags.add('official-selection');
  if (/察|按察|巡按/.test(t))           tags.add('inspection');
  if (/罪|刑|罚|株/.test(t))            tags.add('penal-harsh');
  if (/法|律|典/.test(t))               tags.add('law-reform');
  if (/储|嗣|太子/.test(t))             tags.add('succession');
  if (/礼|仪|祠|大祀/.test(t))          tags.add('ritual');
  if (/朔|历|大礼/.test(t))             tags.add('ritual-major');
  if (/拜|揖|趋/.test(t))               tags.add('etiquette');
  if (/经筵|讲读|进讲/.test(t))         tags.add('imperial-lecture');
  if (/谶|纬|妖言|天象/.test(t))        tags.add('prophecy');
  if (/历|时宪|交食|星象/.test(t))      tags.add('calendar');
  if (/河|水利|堤|渠|湖|江工/.test(t)) tags.add('river-works');
  if (/夷|使|和亲|互市/.test(t))        tags.add('foreign-policy');
  if (/灾|疫|旱|涝|蝗|饥/.test(t))      tags.add('relief');
  return Array.from(tags);
}
```

**DoD**·

1. `"盐法改革"` → `['finance']`
2. `"九边粮饷"` → `['finance', 'northern-defense', 'border-affairs']`
3. `"黄河决堤"` → `['river-works', 'relief', 'finance']`
4. `"立朱由检"` → `['succession', 'ritual-major']`
5. `"诛戮魏珰"` → `['regicide-pursuit', 'execution', 'personnel']`
6. 27 tag 各能至少 1 议题触发

---

### Slice 2.5·廷议召集制完整 (2.3d·v1.5.1 -0.2d 复用 v3 helper)

**目标**·v3 议前预审"明发"前·加召集 modal·6 资格 + 5 后果 + 4 策略 + AI 推荐 + 民意度 + 言官离心 + mentor 联动 + NPC 主动议题。

**详细设计**·见 **§5.4 召集制完整**。

**子任务分布** (2.4d·v2.2 +0.1d)·

| # | 子任务 | 工时 |
|---|---|---|
| 2.5.1 | 6 资格层 (复用 v3 `_ty3_getParties` 等 4 helper)·3 态 cascade·见 §5.4.2 | 0.3d |
| 2.5.2 | AI 推荐·27 tag + **四步** + forecast 集成 | 0.5d |
| 2.5.3 | 召集 modal·3 视图切换 UI | 0.4d |
| 2.5.4 | 必召 + 漏召 + 5 后果 (prestige 加权)·`CY._ty3.conveningPolitics` 写 §5.5 schema | 0.3d |
| 2.5.5 | **(v2.7 改)** 朝代差异·**5 剧本写 `scenario.tinyi.convening` config** (verified·全 0/5 当前空)·明 / 宋 / 唐 三套 template·default fallback hardcoded 明朝 | **0.4d** (v2.7 +0.2d) |
| 2.5.6 | 民意度·5 档 + monthsPerTurn 精度修 + §5.4.7 数据源补 | 0.3d |
| 2.5.7 | 言官离心·4 阈值 + 2-3 turn buffer | 0.2d |
| 2.5.8 | **(v2.2 改 lazy)** mentor 联动 lazy guard·`if (GM._mentorIndex)` UI 隐藏·Slice 10b 后追完整 UI | 0.1d (v2.1 -0.1) |
| 2.5.9 | NPC 主动发议题·言官/阁臣/党魁 上书 path | 0.1d |
| 2.5.10 | **(v2.2 新)** decay 接入 endturn·按 Slice 0.5 contract·patch tm-endturn-apply.js | 0.1d |

**DoD** (12 项·v2.2 改 #11 + 加 #13)·

```
1.  _ty3_calcEligibility 6 层正确 (含 prestige)·3 态 priority cascade·见 §5.4.2
2.  AI 推荐覆盖 27 tag
3.  召集 modal 3 视图切换工作
4.  必召强制
5.  漏召警告 + prestige 加权 (高声望加倍·低声望减半)
6.  _ty3_calcConveningPolitics 5 后果触发 (balanced/oneParty/fullOneParty/balanced/mega)
7.  CY._ty3.conveningPolitics 写入·schema 见 §5.5·Slice 8 反弹能读
8.  朝代差异·明/宋/唐 三套
9.  GM._convening_民意度·调小后 ±5/次·dynasty 差异 decay·monthsPerTurn 精度修 (见 §5.4.8)·5 档影响减半
10. GM._convening_言官离心·阈值 20/40/60/80·跨阈值 buffer 2-3 turn
11. **(v2.2 改 lazy)** mentor 联动·`if (GM._mentorIndex)` guard·有 index → UI 显 mentee suggest·无 index → 隐 section·不 throw·**完整 UI 验证迁到 Slice 10b**
12. NPC 主动发议题·入 GM._pendingTinyiTopics + memorial.type='request_tinyi'
13. **(v2.2 新)** decay 接入按 Slice 0.5 `tinyi-decay-contract.md`·patch tm-endturn-apply.js 末尾·5 turn smoke 民意度 / 言官离心 收敛验证
```

---

### Slice 3·8D dims 接入 stance·hybrid paradigm (2.7d·v2.6 +1.2d·paradigm = C·user 选)

**v2.6 paradigm 锁**·**hybrid C**·Round 1 用 dims 锚 initial·Round 2+ LLM 可调 current·两阶段 schema·initial 不可变·完整 paradigm 对比在 `tinyi-slice3-stance-paradigm-detail.md`。

**目标**·NPC stance 两阶段·

```
Round 1·initial = _ty3_initialStanceFromDims(ch, topic, tags)   ← 锚定·dims-driven·不可变
        current = initial   ← 起点
        confidence = 70 (中等初始)
Round 2+·LLM 看 (前发言 / cue / 党争 / mentor / hint)·可调 current·若 != initial 必含 reason
         history.push({round, stance, reason})·audit 用
         initial 锁·不可变
```

**4 共享 helper** (Slice 0.5 expose 一并加)·

```js
// 1·trait → dims (14 trait 映射·~40 行)
function _ty3_dimsFromTraits(traitIds) {
  const dims = { honor: 0.5, compassion: 0.5, boldness: 0.5, rationality: 0.5,
                 greed: 0.5, cunning: 0.5, loyalty: 0.5, confucianism: 0.5 };
  // BIAS table·xianliang/chunzheng/yiqi/jinshen/yaohua/gangzhi/xueshi/jiengong/quan/jian/...
  // (apply ±0.2~0.3 to dims based on trait)
  return dims;
}

// 2·keyword fallback (§5.5.6 已 spec·~60 行 / 30+ regex)
function _ty3_dimsFromKeywords(ch) { ... }

// 3·调度 (aggregateDims / fallback A / fallback B)
function _ty3_getDims(ch) {
  if (ch.aggregateDims && Object.values(ch.aggregateDims).some(v => v !== 0)) return ch.aggregateDims;
  if (ch.traitIds && ch.traitIds.length > 0) return _ty3_dimsFromTraits(ch.traitIds);
  return _ty3_dimsFromKeywords(ch);
}

// 4·initial stance·按 §5.5.1 25 RULES + class 加成
function _ty3_initialStanceFromDims(ch, topic, tags) {
  const dims = _ty3_getDims(ch);
  for (const rule of RULES) {
    if (rule.if(dims, tags, ch)) return rule.stance;
  }
  // fallback·按 dims dominant 算
  if (dims.honor >= 0.7 && tags.includes('regicide-pursuit')) return 'oppose';
  if (dims.compassion >= 0.7 && tags.includes('penal-harsh')) return 'oppose';
  if (dims.greed >= 0.7 && tags.includes('reward')) return 'support';
  return 'neutral';
}

// expose (Slice 0.5 块加)
window._ty3_getDims = _ty3_getDims;
window._ty3_dimsFromTraits = _ty3_dimsFromTraits;
window._ty3_dimsFromKeywords = _ty3_dimsFromKeywords;
window._ty3_initialStanceFromDims = _ty3_initialStanceFromDims;
```

**phase2_run 改** (`tm-tinyi-v3.js:1842`·Round 1 前 init initial)·

```js
async function _ty3_phase2_run() {
  // ...原 setup...
  
  // v2.6 hybrid·Round 1 前算 initial
  const tags = _ty3_inferTopicTags(CY._ty3.meta.topicType, CY._ty3.topic);  // Slice 2 helper
  CY._ty3.attendees.forEach(name => {
    const ch = findCharByName(name);
    const initial = _ty3_initialStanceFromDims(ch, CY._ty3.topic, tags);
    CY._ty3.stances[name].initial = initial;     // 锁·不可变
    CY._ty3.stances[name].current = initial;     // 起点
    CY._ty3.stances[name].confidence = 70;
    CY._ty3.stances[name].history = [];          // audit
    CY._ty3.stances[name].source = 'dims-initial';
  });
  
  // ...原 round loop...
}
```

**_ty2_genOneSpeech 改** (`tm-chaoyi-tinyi.js:292-349`·prompt 按 roundNum 分)·

```diff
+ // v2.6 hybrid·prompt 按 roundNum 分
  const myInitial = CY._ty2.stances[name].initial || 'neutral';
  const myCurrent = CY._ty2.stances[name].current || myInitial;
+ if (roundNum === 1) {
+   prompt += '\n你的 initial 立场 (按性格 8D 算)·' + myInitial;
+   prompt += '\n第一轮发言·尽量遵循 initial·若强反对·reason 必含原因';
+ } else {
+   prompt += '\n你的 initial 立场 (Round 1 dims 锚定·不可变)·' + myInitial;
+   prompt += '\n当前 current·' + myCurrent;
+   prompt += '\n本轮可保 current·或看前发言/cue/党争 调·若调 reason 必含';
+ }
  prompt += '\n返回 JSON：{"stance":"...","confidence":...,"line":"...","reason":"..."}';
```

**parse return 改** (`_ty3_safeGenSpeech L1931`·current 可变·initial 不变)·

```js
if (r && r.stance && CY._ty2.stances[name]) {
  CY._ty2.stances[name].current = r.stance;          // current 可变 (LLM 调)
  CY._ty2.stances[name].confidence = r.confidence;
  // initial 锁·不可变
  CY._ty2.stances[name].history = CY._ty2.stances[name].history || [];
  CY._ty2.stances[name].history.push({
    round: roundNum, stance: r.stance, reason: r.reason || '', timestamp: Date.now()
  });
  if (r.stance !== CY._ty2.stances[name].initial) {
    CY._ty2.stances[name].source = 'llm-adjusted';   // verify 用
  }
}
```

**schema 扩** (§6 + §5.4.15 schema fence)·

```js
CY._ty3.stances[name] = {
  initial: 'support',         // Round 1 dims 锚定·**不可变·invariant**
  current: 'support',         // 当前·LLM 可调
  confidence: 0-100,
  history: [{round, stance, reason, timestamp}, ...],
  locked: false,
  source: 'dims-initial' | 'llm-adjusted'
}
```

**子任务 + 工时** (2.7d)·

| # | 子任务 | 工时 |
|---|---|---|
| 3.1 | 4 共享 helper (dimsFromTraits / dimsFromKeywords / getDims / initialStanceFromDims) | 0.6d |
| 3.2 | phase2_run Round 1 init initial (跑前) | 0.5d |
| 3.3 | _ty2_genOneSpeech prompt 按 roundNum 分 (初 vs 后) | 0.5d |
| 3.4 | parse return·current 可变 / initial 锁 / history.push | 0.3d |
| 3.5 | §6 schema 扩 (initial / current / history / source) + §5.4.15 fence 更新 | 0.2d |
| 3.6 | smoke·5 case·initial deterministic·current 可变·若 != initial 必含 reason | 0.4d |
| 3.7 | **paradigm 整合**·invariant 实现 + 文档 + grep 验 initial 不被改写 | 0.2d |

**DoD** (v2.6 扩·6 项·原 4 项 + 2 新)·

1. 任 NPC `_ty3_getDims` 返非全 0 = 100%
2. 任 NPC `_ty3_getDims` 5 剧本测·≥ 95% 命中 aggregateDims 或 fallback A
3. fallback B (无 traitIds) 准确率 ≥ 85% (跟手工 baseline 比)
4. stance 分布·`极支+极反` ≥ 20% (initial 算·dims 可控保证)
5. **(v2.6 新)** initial deterministic·跑 2 次同 ch+topic·initial 一样·grep `initial` 写入点 = 1 处 (phase2_run init)
6. **(v2.6 新)** current 可变·若 != initial → history 含 reason·grep no `stances[name].initial =` after init·invariant 保

**LLM cost 影响**·+5% prompt token (initial hint ~30 token / NPC)·response 不变。

---

### Slice 4·aiPersonaText + hw/hq + 党派 + learning 注入 (0.8d·v2.3 -0.7d)

**v2.3 修**·patch target 改·真 prompt 在 `tm-chaoyi-tinyi.js:292 _ty2_genOneSpeech` (v2 旧函数·v3 phase2_run 复用)·不在 v3·v3 phase2_run 自己不 build prompt·只分 4 轮调 `_ty2_genOneSpeech`。

**目标**·`_ty2_genOneSpeech` (tm-chaoyi-tinyi.js L292-349) prompt 改 4 段·

```
Section A·persona text 摘要 ← 替换 ch.personality+background·复用 PromptComposer.buildAiPersonaText (常朝大改已建·~30% 改造)
Section B·8D dims + recognitionState + arc ← 替换 ch._memory+dialogueHistory·复用 PromptComposer.buildRecognitionState (~20% 改造)
Section C·当前皇威 X·皇权 Y·档位预测 ← **全新 100%**·读 GM.huangwei.index / GM.huangquan.index (object.index·非裸 number)
Section D·党派 stance (focal_disputes + policyStance) + learning ← v2 prompt 已注入·**0% 改造** (L307·320-327)
```

**v2 prompt 现状** (亲读 verified·tm-chaoyi-tinyi.js L300-349)·

| Section | 现状 | 改造 |
|---|---|---|
| A | `ch.personality` + `ch.background.slice(0,120)` | 替换为 `PromptComposer.buildAiPersonaText(ch, {maxLen:200})`·若 ch 无 aiPersonaText 降级原字段 |
| B | `ch._memory.slice(-5)` + `GM.dialogueHistory[name].slice(-3)` | 替换为 `PromptComposer.buildRecognitionState(ch)`·若 ch 无 recognitionState 降级原字段 |
| C | ❌ 缺 | 新加·`'\n  当前皇威：' + (GM.huangwei?.index ?? 50) + '·皇权：' + (GM.huangquan?.index ?? 50)` + 档位 hint |
| D | `_partyObj.policyStance.slice(0,5)` + `_partyObj.focal_disputes.slice(0,3)` + `ch.learning` | 保持·无改造 |

**关键** (v1.5.1·v2.3 保留)·**Section C 加 hw/hq**·NPC 看见 hq < 30 → 倾向 confront / martyr (Slice 6 rule 接入)。

**LLM cost** (按 §6 预算)·prompt **+300 token / NPC** (v2.3 -300·因 Section A/B/D 复用现有·只 Section C 真新加)·persona 注入率 ≥ 70%。

**子任务** (0.8d)·

| # | 子任务 | 工时 |
|---|---|---|
| 4.1 | tm-chaoyi-tinyi.js Section A 替换为 buildAiPersonaText·降级 fallback | 0.15d |
| 4.2 | Section B 替换为 buildRecognitionState·降级 fallback | 0.15d |
| 4.3 | Section C 新加 hw/hq + 档位预测 (读 GM.huangwei.index / GM.huangquan.index) | 0.2d |
| 4.4 | Section D 保留 (verify·prompt diff 看 0 行删) | 0.1d |
| 4.5 | smoke·5 case 测·prompt 体积 +300 / NPC·persona 注入率 ≥ 70% | 0.2d |

**DoD** (v2.3 改)·

1. prompt 体积 **+300 token / NPC** (Section C 主增·A/B 复用)
2. persona 注入率 ≥ 70% (有 aiPersonaText 字段的 NPC)
3. hw/hq 注入·5 case 测·NPC 提及"皇威"/"皇权"概率 ≥ 30%
4. learning 段·经史学识 ≥ 70 的 NPC·cite_classic mode 概率 +20%
5. **v2 prompt 字段 5 处** (`ch.personality` / `ch._memory` / `ch.dialogueHistory` / `ch.party.policyStance` / `ch.learning`) **降级 fallback 工作** — 老剧本无 aiPersonaText/recognitionState 时仍可用

---

### Slice 4.5·玩家发言 paradigm 重做 + currentPhase 同步 (1.8d·v2.7 +0.3d·补 8 处 phase update)

**目标**·删 v3 浮按钮 (L545-682·9 函数 + 2 DOM + ~145 JS + 80 CSS)·改底部 input + 8 phase 分发 + 13 keyword + 11 intent + 6+4 抢答。

**详细设计**·见 **§5.1 玩家发言 paradigm**。

**v2.7 关键·`CY._ty3.currentPhase` 同步**·v3 当前只 L1780 init 'opening'·后续从不 update·8 phase 分发永远 fallback default。Slice 4.5 必须·

```js
// v3 8 处 phase enter 加 currentPhase update·
// 1·preAudit modal open (议前预审 4 处置)
function _ty3_openPreAudit() { ... CY._ty3.currentPhase = 'preAudit'; ... }
// 2·seating 三班入场
function _ty3_phase1_openSeating() { ... CY._ty3.currentPhase = 'seating'; ... }
// 3·debate 辩议
async function _ty3_phase2_run() { CY._ty3.currentPhase = 'debate'; ... }
// 4·confront 链激活
function _ty3_startConfrontChain(A, B) { ... CY._ty3.currentPhase = 'confront'; ... }
// 5·vote 廷推
function _ty3_phase3_open() { ... CY._ty3.currentPhase = 'vote'; ... }
// 6·archon 钦定
function _ty3_settleArchonGrade() { ... CY._ty3.currentPhase = 'archon'; ... }
// 7·draft 草诏
function _ty3_phase5_openDraftPicker() { ... CY._ty3.currentPhase = 'draft'; ... }
// 8·seal 用印
function _ty3_phase6_open() { ... CY._ty3.currentPhase = 'seal'; ... }
```

每个 phase enter point patch 1 行·共 8 处 patch·~0.3d。

**DoD** (10 项·v2.3 +1·v2.7 改 #2)·

1. 浮按钮 + native prompt() 全清 (grep `_ty3_doInterject` = 0 hit)
2. **(v2.7 改)** 底部 input 工作·按 phase 分发·**`CY._ty3.currentPhase` 8 处 update verified**·8 case 测·每 phase 玩家输入走对应 handler (非 fallback default)·`_ty3_handlePlayerInterject` 改调 _ty3_onPlayerSpeak
3. 13 keyword regex 覆盖·5 case 测全触发
4. 11 intent map 工作
5. 6 抢答优先级 (代词 / 点名 / intent / 主奏者 / debate / 闲人)
6. 4 廷议加成 (confront 选边 / arbitrate / dispatch / mentee 抢答)
7. mentee 抢答按 honor 决定 (≥0.5 护师·<0.5 背师)
8. ~5 NPC 并发抢答·全 LLM 流式
9. v3 既有 5 intent (让 X 起对 / 等) 语义保留
10. **(v2.3 新)** 5 NPC 并发抢答 cost 实测 ≤ 25K token / 议题·超则降级 3 NPC 并发 (主点名 + 主奏者 + 言官头领·其他静默立场)

---

### Slice 5·10 mode 全实现 (1.2d·v2.3 -0.8d·复用常朝 6 mode 模板)

**v2.3 修**·常朝大改 sprint (1.2.4.4 已 ship) 后 mode 结构演化·doc v1 写 `{ prompt, tone }` (2 字段) 已不准·实际是 8 字段 `{ opens, closes, structure, requireEither, requireClose, forbidden, example, selfCheck }`。**复用常朝 6 mode 模板 + 新加廷议 4 mode**·非全 10 mode 重写。

**目标**·v3 phase 2 NPC 发言 mode 系统·6 常朝 mode 复用 (含 augment·**非 cite**·v2.1 doc 误写) + 4 廷议特化新加。

**6 常朝 mode 复用** (verified runtime tm-chaoyi-changchao.js L2092-2174·共 8 字段)·

```
lead / second / rebut / soften / pivot / augment   ← augment·非 cite
模板结构·{ opens: [15+], closes: [4+], structure, requireEither, requireClose, forbidden, example, selfCheck }
```

**4 廷议特化新加** (按常朝 8 字段 paradigm)·

```js
const TINYI_MODE_TEMPLATES = {
  confront: {
    opens: ['"X 公此论·恕臣不能附"', '"X 公方才所言"', '"愿与 X 公辩之"', /* 10+ 变体 */],
    closes: ['"伏请陛下察"', /* 4+ */],
    structure: '直接点名 {targetName}·正面驳其论·必含 1+ 具体论点',
    requireEither: ['具体论点反驳', '历史先例对比'],
    forbidden: ['空泛附议', '不指名'],
    example: ['"许显纯方才言重狱有功·然臣按律..." ', /* 4+ */],
    selfCheck: ['是否真点名', '是否含 1+ 具体论点反驳', '是否避空泛']
  },
  cite_classic: {
    opens: ['"《尚书》云"', '"《大学衍义》载"', '"昔者..."', /* 10+ */],
    structure: '援经引典·《尚书》《大学衍义》《通鉴》·1 经 + 1 史·必含书名',
    forbidden: ['现代词汇', '无书名'],
    example: ['"《尚书·洪范》云：唯辟作福..."', /* 5+ */],
    selfCheck: ['是否含书名', '是否 1 经 1 史']
  },
  clientelism: {
    opens: ['"先师 X 之论"', '"门生不敢异于先师"', /* 10+ */],
    structure: '附议师·"先师 X 论已尽·门人不敢异"·必含 mentor 名',
    requireEither: ['mentor 名', '"门生" / "门人"'],
    forbidden: ['直接反驳师'],
    example: ['"先师赵南星论东林之党议·门生不敢异"', /* 5+ */],
    selfCheck: ['是否含 mentor 名', '是否避反驳师']
  },
  martyr: {
    opens: ['"臣愿伏阙"', '"臣冒死直谏"', '"以死谏陛下"', /* 10+ */],
    closes: ['"虽千万人吾往矣"', '"臣不惧斧钺"', /* 4+ */],
    structure: '言官冒死直谏·尖锐 + 不留余地·必含 honor-driven 言辞',
    requireEither: ['"死" / "诛" / "斧钺"', '"陛下" + 直陈错'],
    forbidden: ['含糊', '迂回'],
    example: ['"臣愿伏阙·陛下用魏阉乱政·必致天下倾覆"', /* 5+ */],
    selfCheck: ['是否含死字', '是否直陈陛下错', 'cooldown 1 议题 1 次']
  }
};
```

**子任务** (1.2d)·

| # | 子任务 | 工时 |
|---|---|---|
| 5.1 | grep 常朝 6 mode 现状·确认 augment paradigm·扩 cooldown 字段 | 0.1d |
| 5.2 | 廷议 4 mode 模板 (confront / cite_classic / clientelism / martyr) 按 8 字段写·每 mode 10+ opens·5+ example | 0.6d |
| 5.3 | mode 触发条件·按 dims + tag 选 mode·见 Slice 6 RULES | 0.2d |
| 5.4 | smoke·10 mode 分布熵 + 廷议 4 mode 触发率 + martyr cooldown | 0.3d |

**DoD** (v2.3 改·6 项)·

1. 每 mode 至少 1 case trigger (smoke 验)
2. mode 分布熵 ≥ 1.8 bit
3. confront mode 5 议题触发率 ≥ 8%
4. clientelism mode 5 议题触发率 ≥ 12% (Slice 10b 完成后才能验·此 slice 见 stub)
5. martyr mode 1 议题最多 1 次 (cooldown)
6. **v2.3 新·mode 名 6+4 跟常朝 runtime mode 表 grep 对齐 100%** (lead/second/rebut/soften/pivot/augment + confront/cite_classic/clientelism/martyr·**禁止 cite**·常朝 augment 是权威名)

---

### Slice 6·~25 persona × tag rule engine + trait bias (1.5d)

**目标**·`_ty3_modulateModeByPersona(ch, dims, topicTags, currentMode)`·按 RULES (25 条) + trait bias (14 trait) + anti-塌缩 guard·决定最终 mode。

**详细设计**·见 **§5.5 mode rule engine**。

**DoD**·

1. 25 rules 实施·smoke 25 NPC 抽样·mode 熵 ≥ 1.8 bit
2. 14 trait bias 接入
3. anti-塌缩 guard 4 项各至少 1 次触发 (同 mode ≥ 3 → 切·全员同 stance ≥ 4 → 强 oppose·confront cooldown·martyr 一议最多 1)
4. tone modulation·阁臣庄重 / 言官激切 / 武将直白 / 勋戚谨慎 / 外戚柔曲

---

### Slice 7·真 NPC vs NPC confront 链 + 续议 (1.6d·v2.3 +0.1d·补 _affinityMap spec)

**目标**·confront mode trigger 对质链·

```
A confront B → next round·B prompt 加 "X 刚才对你言「Y」·请回应"
→ 链最多 2 round backforth (maxConfrontChain=2)
→ 链结束·GM._affinityMap[A][B] -= 10  (v2.3·明 GM scope)
→ phase2 finalize·若链未结束·按 §5.1.7 3 路径处理 (truncate / 1 round 续 / phase2 重启)
```

玩家面·footer 加 "助 A / 助 B / 敕停" 按钮组 + [ ] hotkey 切阵营。

**v2.3 新·`GM._affinityMap` 数据契约** (grep verified runtime 0 hit·全新建)·

```js
// 数据结构·
GM._affinityMap = { [nameA]: { [nameB]: number 0..100 } }   // 0=深仇·100=至交·50=中立

// init·
//   GM 初始化时·GM._affinityMap = {}  (懒加载·首次写时建 entry)

// 读·
function _ty3_getAffinity(nameA, nameB) {
  return GM._affinityMap?.[nameA]?.[nameB] ?? 50;  // default 50 中立
}

// 写·
function _ty3_addAffinity(nameA, nameB, delta) {
  GM._affinityMap = GM._affinityMap || {};
  GM._affinityMap[nameA] = GM._affinityMap[nameA] || {};
  GM._affinityMap[nameA][nameB] = Math.max(0, Math.min(100, (GM._affinityMap[nameA][nameB] ?? 50) + delta));
  // 对称·B 对 A 也 +delta (敌意相互)
  GM._affinityMap[nameB] = GM._affinityMap[nameB] || {};
  GM._affinityMap[nameB][nameA] = Math.max(0, Math.min(100, (GM._affinityMap[nameB][nameA] ?? 50) + delta));
}

// persist·随 GM save·跨场景 reset (剧本切换时清)
// UI·关系图 (可选 backlog·非本 slice)·v3 phase2 prompt 注入·"你对 X 的态度·亲近 75"
```

**与现有 `ch.affinity` (number·对皇帝) 区别**·

| 字段 | scope | 默认 | 含义 |
|---|---|---|---|
| `ch.affinity` (现存·number) | 单值 | 50 | NPC 对皇帝的 affinity·v3 phase6/7 写 |
| `GM._affinityMap[A][B]` (v2.3 新·nested) | 双向 NPC-NPC | 50 | NPC A 对 NPC B 的 affinity·confront 链写 |

**子任务** (1.6d)·

| # | 子任务 | 工时 |
|---|---|---|
| 7.1 | confront mode 触发·若 Slice 6 RULES 判 confront·prompt 注入对质上下文 | 0.4d |
| 7.2 | 2-round chain logic·maxConfrontChain=2 | 0.3d |
| 7.3 | **GM._affinityMap data structure + 2 helper** (v2.3 新) | 0.2d |
| 7.4 | confront 链结束·`_ty3_addAffinity(A, B, -10)` 双向写 | 0.1d |
| 7.5 | 链跨阶段 3 路径处理 (§5.1.7) | 0.3d |
| 7.6 | 玩家 "助 A / 助 B / 敕停" footer + [ ] hotkey | 0.2d |
| 7.7 | smoke·5 case·≥2 confront + 1 完整 chain + affinityMap 写 | 0.1d |

**DoD** (v2.3 改·5 项)·

1. 5 议题·confront 触发 ≥ 2
2. 至少 1 完整 2-round chain
3. **v2.3 改**·`GM._affinityMap[A][B]` 写入·_ty3_addAffinity 双向·default 50·clamp [0,100]·跨场景 reset verified
4. 链跨阶段 3 路径全 case 测
5. footer 按钮 + `[` `]` hotkey 工作

---

### Slice 7.5·廷议特化 6 动作 + 5 联动 ceremony (0.8d·v2.4 +0.3d·接 8.5 拆出的 5 联动 ceremony)

**v2.4 改**·原 Slice 8.5 §5.2.4 表里 5 联动 ceremony (廷杖/削籍/摘除/革职/更议·跟本 slice 6 动作 5/6 关联) 挪到本 slice·避免 8.5 DoD 数字不一致 + 工时低估。

**目标**·6 廷议特有动作 + 5 联动 ceremony 动画·

| 动作 | 后果 | ceremony 动画 (本 slice 实现) | 时长 |
|---|---|---|---|
| 廷杖 X | loyalty -10·prestige -5·健康 -8·入诏狱可能 +20% | 锤击 + 红 flash | 5s |
| 削籍 X | 革除官职·loyalty 归零·从 attendees 移除·全场气氛 cautious | 黑屏 + 大字 gold-screen | 4s |
| 摘除 X | 退殿·favor -3·attendees 临时移除·简短 ban | 简短退殿 | 2s |
| 转部议 | 议题转 X 部·廷议结束 | (无 ceremony·跳 phase) | - |
| 更议 | 重启本议题·attendees 重发·"敕令更议" 字样 | 敕令字幕 | 3s |
| 革职 X | 永久革除·从 GM.chars 移除 | 永久革除 + sound | 6s |

**子任务** (1.0d·v2.6 +0.2d·加 prison 集成 + atmosphere)·

| # | 子任务 | 工时 |
|---|---|---|
| 7.5.1 | 6 动作 trigger + state 应用 (loyalty / prestige / health 调) | 0.4d (v2.6 +0.1) |
| 7.5.2 | 5 ceremony CSS animation (.ty3-cer-flog / strip / dismiss / revoke / reopen) | 0.3d |
| 7.5.3 | 6 pendingEvents 入队 + schema 对齐 §5.4.15 fence | 0.15d (v2.6 +0.05) |
| 7.5.4 | **(v2.6 新)** prison 集成·廷杖 → `_imprisoned=true` + `_imprisonReason` + `_imprisonedTurn` (verified runtime 字段·非 _inPrison) | 0.1d |
| 7.5.5 | **(v2.6 新)** atmosphere 字段更新 (削籍 → 全场 `CY._ty3._atmosphereOverride='cautious'`·见 §6) | 0.05d |
| 7.5.6 | smoke·6 case·6 动作 + 5 ceremony + prison + atmosphere 触发 verify | 0.1d |

**DoD** (4 项·v2.6 +1)·

1. 6 动作触发 + state 写入
2. **(v2.4 新)** 5 联动 ceremony 动画播 (廷杖 5s / 削籍 4s / 摘除 2s / 革职 6s / 更议 3s)·CSS class 按 §5.2.4 表
3. 6 pendingEvents 入队·schema 对齐 §5.4.15
4. **(v2.6 新)** prison 集成·廷杖入诏狱 verified·`_imprisoned=true` + `_imprisonReason='廷杖致重伤'` + `_imprisonedTurn=GM.turn`·走狱中问对 path

---

### Slice 8·裁决反弹·minority + 党争 + v3 三大集成共存 (1.2d·v2.1 paradigm 重调)

**目标·v2.1 改**·**用 v3 IIFE hook 模式·non-replacement·共存于·**

- v3 `_ty3_applyArchonGrade` 副作用 (cohesion / prestige / favor) — 已跑
- v3 `_ty3_phase6_recordSeal` (用印 + chronicle + ClassEngine) — 已跑
- v3 `_ty3_phase7_reviewFollowUp` (追责 + venue + partyStrife + corruption.history) — 已跑

**v2.2 前置**·`_ty3_phase6_recordSeal` 必须在 Slice 0.5 已 `window.` expose (v3 原代码漏暴露·v2.1 audit verified)·否则下面 hook 装不上。

**v2.2 hook patch pattern** (学 v3 §11 `_ty3_installDraftHook`)·

```js
(function _ty3_installV15ReboundHook() {
  if (typeof window === 'undefined') return;
  var attempts = 0;
  function tryHook() {
    if (attempts++ > 20) return;
    if (typeof window._ty3_phase6_recordSeal !== 'function') { setTimeout(tryHook, 200); return; }
    if (window._ty3_phase6_recordSeal._v15Hooked) return;
    var orig = window._ty3_phase6_recordSeal;
    window._ty3_phase6_recordSeal = function(status, ctx, detail) {
      var seal = orig.apply(this, arguments);  // ← v3 effects 先跑·全保留
      try { _ty3_v15_appendMinorityRebound(seal, ctx, detail); } catch (e) { addEB('廷议', 'rebound err: ' + e.message); }
      return seal;
    };
    window._ty3_phase6_recordSeal._v15Hooked = true;
  }
  tryHook();
})();

async function _ty3_v15_appendMinorityRebound(seal, ctx, detail) {
  // 1. v3 effects 已跑·只查·别动 v3 已改的字段 (v2.3 修·affinity 是 number 非 object)
  const minority = _ty3_v15_findMinorityNPCs(seal);
  for (const npc of minority) {
    const baseRebound = _ty3_v15_calcRebound(npc, seal);
    const v3PrestigeDelta = _ty3_v15_alreadyAppliedToNPC(npc);  // 检查 v3 已 -prestige 没
    const finalRebound = baseRebound - (v3PrestigeDelta * 0.4);  // 折扣·避 2x
    npc.loyalty = Math.max(0, (npc.loyalty || 50) - finalRebound);
    // v2.3 修·ch.affinity 是 number (对皇帝)·非 object·禁 .toEmperor 嵌套
    npc.affinity = Math.max(0, (npc.affinity || 50) - finalRebound * 0.6);
  }
  
  // 2. 召集 tilt 二次惩罚
  let multiplier = 1.0;
  if (CY._ty3?.conveningPolitics?.tilt === 'oneParty')     multiplier = 1.3;
  if (CY._ty3?.conveningPolitics?.tilt === 'fullOneParty') multiplier = 1.5;
  if (CY._ty3?.conveningPolitics?.tilt === 'megaCeremony') multiplier = 0.8;
  if (multiplier !== 1.0) minority.forEach(npc => npc.loyalty *= multiplier);
  
  // 3. 民意度极低·额外
  if (GM._convening_民意度 <= -50) minority.forEach(npc => npc.loyalty -= 2);
  
  // 4. martyr 触发·_pendingMartyrEvents 入队 (v2.3 修·dims → aggregateDims·复用 Slice 3 _ty3_getDims helper)
  const martyrCandidates = minority.filter(n => {
    const d = (typeof _ty3_getDims === 'function') ? _ty3_getDims(n) : (n.aggregateDims || {});
    return (d.honor || 0) >= 0.7 && (d.boldness || 0) >= 0.7;
  });
  martyrCandidates.forEach(n => {
    GM._pendingMartyrEvents = GM._pendingMartyrEvents || [];
    GM._pendingMartyrEvents.push({ npc: n.name, turn: GM.turn, reason: 'minority-rebound' });
  });
  
  // 5. v3 集成·NpcMemorySystem.remember (§14.B)
  if (typeof NpcMemorySystem !== 'undefined' && NpcMemorySystem.remember) {
    minority.forEach(n => {
      const emoIntense = finalRebound >= 5 ? 8 : finalRebound >= 3 ? 6 : 5;
      NpcMemorySystem.remember(n.name, '议「' + seal.topic + '」裁决·loyalty -' + finalRebound, '恨', emoIntense, '廷议');
    });
  }
  
  // 6. 党争 / 民意度 / 言官离心 decay·按 dynasty + daysPerTurn (§5.4.8 / 5.4.9)
  _ty3_v15_decayConveningCounters();
  
  // 7. ClassEngine 已由 v3 phase6/phase7 调过·不重调
}
```

**关键 v2.1 paradigm 改动**·

- **不调用 `_ty3_applyArchonGrade` 也不绕过**·用 IIFE hook 在 `_ty3_phase6_recordSeal` 之后跑
- **NpcMemorySystem 集成** (新加·§14.B)·反弹时 NPC 记此事
- **ClassEngine 不重调** (v3 phase6/phase7 已调过)
- **党派进化系统·partyStrife / corruption.history 写入由 v3 phase7 完成·sprint 不重写**

**DoD** (v2.3 扩·10 项)·

1. 5 case 反弹正确
2. minority loyalty / affinity 写入·**(v2.3 改)** affinity 是 number 单值·非 `.toEmperor`·grep 0 hit `npc.affinity.toEmperor`
3. martyr 入队 (_pendingMartyrEvents)·**(v2.3 改)** martyrCandidates 用 `_ty3_getDims(n).honor` (Slice 3 helper)·非裸 `n.dims?.honor`
4. **v3 effects + v1.4 rebound 共存·总 prestige 惩罚 ≤ v3 单独 × 1.5** (折扣 0.4 验证)
5. conveningPolitics.tilt 二次惩罚正确触发·schema 见 §5.4.15
6. sc_consolidate prompt 含反弹 hint
7. **NpcMemorySystem.remember 5 case 验·NPC 记 '恨' emo·intensity 5-8** (v2.1 新)
8. **ClassEngine 不重调·grep call 数 = v3 原数** (v2.1 新)
9. **(v2.2 新)** Slice 0.5 `window._ty3_phase6_recordSeal` expose verified·hook 装上 (`._v15Hooked === true`)·非 20 次 retry 后 silent 失败
10. **(v2.3 新)** affinity / dims 字段名 grep verify·`npc.affinity.toEmperor` = 0 hit·`n.dims` 仅 _ty3_getDims 内部 = 0 hit 直接使用

---

### Slice 8.5·廷议 UI 升级 (1.8d·v1.5 +0.3d)

**目标** (v2.4 改·ceremony 范围明确)·

- 三班 **双轨 view** (default stance·V hotkey 切 class)
- 立场板放大版 (T)·N×9 矩阵
- 潮汐条 (按 v3 既有)
- confront 红色虚线 + 箭头
- 10 mode 视觉区分 (见 §5.2.2 表)
- **5 核心 ceremony** 动画 (鸣鞭 / 钦定 / 草诏 / 用印 / 追责·v2.4 明·5 联动 ceremony 廷杖/削籍/摘除/革职/更议挪 Slice 7.5)
- 用印 2 sub-flow modal (诏命留中阻挠·强行用印)·**v3 已有·我 sprint 加 UI polish**
- 召集 preset (localStorage)·"已保存模板" 列表·一键加召
- 9+1 hotkey (1 新加 V + 9 已有·见 §5.2.3 表·v2.4 caption 改)

**DoD** (7 项·v2.4 改 #4)·

1. 三班双轨切换工作 (V key)
2. 立场板放大版工作 (T key)
3. confront 红虚线显·10 mode 视觉区分清晰 (含 augment·非 cite·v2.4)
4. **(v2.4 改)** 5 核心 ceremony 动画播 (鸣鞭 8s / 钦定 3s / 草诏 2s / 用印 5s / 追责 4s)·CSS 时长按 §5.2.4 表·**5 联动 ceremony 见 Slice 7.5**
5. 用印 2 sub-flow 触发 (verified·v3 L2944 强行用印 + L3001 诏命留中)
6. 召集 preset 保存 / 加载工作 (localStorage)
7. 9+1 hotkey 全工作 + Esc 二次确认 (Enter / 空格 / Esc / T / 1-9 / [/] / M / Ctrl+Enter / H + 新加 V)

---

### Slice 9·cumulative + emperor cue Tier 2 (0.5d·v2.4 改·复用 _cc3 alias)

**v2.4 改**·doc v1 写 `_ty3_cumulativeHint` / `_ty3_emperorCueHint`·常朝 runtime 实际叫 `_cc3_cumulativeHint` (tm-chaoyi-changchao.js L2390) + `_cc3_emperorCueHint` (L2419) — name 漂。采 alias 方式·Slice 0.5 expose 一并加。

**目标**·复用常朝 `_cc3_*` helper·alias 到 `_ty3_*` 名空间·避免直接跨模块依赖·

```js
// Slice 0.5 expose block 加 (跟 _ty3_phase6_recordSeal expose 一起)
window._ty3_cumulativeHint = _cc3_cumulativeHint;
window._ty3_emperorCueHint = _cc3_emperorCueHint;
// item._lastEmperorIntent 字段·grep verified 已存·常朝 L2462 写入·廷议直接读
```

**功能**·

- `_cc3_cumulativeHint(state, gmCh, item)`·3+ 同党附议时·后续 NPC 一字千钧 (shortReply)
- `_cc3_emperorCueHint(item, state)`·读 `item._lastEmperorIntent`·后续 NPC stance 偏移 +20%·`item._lastEmperorIntent` 由 `_cc3_writeEmperorIntentFromAction` (L2434) 在玩家 action 后写入

**DoD** (v2.4 改)·

1. alias `window._ty3_cumulativeHint` / `window._ty3_emperorCueHint` 在 v3 phase2 内调用工作
2. 5 NPC 同党同议题·第 3-5 个明显短 (shortReply 触发)
3. 玩家"严办"·后续 NPC stance 偏 oppose +20% (item._lastEmperorIntent='punish' 后续生效)

---

### Slice 10·**v2.2 拆**·mentor 数据 + clientelism + 联动 (1.5d 总)

**v2.2 拆分原因**·v2.1 Slice 2.5 mentor 联动调 `GM._mentorIndex`·但原 Slice 10 在 2.5 之后建·顺序倒挂导致 2.5 silent 失功能。拆 10a (数据 + index·提前到 Slice 2.5 之前) + 10b (clientelism + 联动 UI·留原位)。

#### Slice 10a·mentor 数据补 + buildMentorIndex (1.0d·**实施顺序·Slice 2.5 之前**)

**目标**·

- 手补天启 ~30 关系 + 绍宋 ~15 (见 §5.4.11 完整清单)
- `_ty3_buildMentorIndex(GM.chars)`·反向索引·缓存到 `GM._mentorIndex` (shape 见 §5.4.11)
- 启动时 / 剧本加载时 build·入 GM

**子任务**·

| # | 子任务 | 工时 |
|---|---|---|
| 10a.1 | 天启 ~30 mentor 关系手补 (`web/tools/fill-tianqi-mentors.js`) | 0.4d |
| 10a.2 | 绍宋 ~15 mentor 关系手补 | 0.2d |
| 10a.3 | `_ty3_buildMentorIndex` 函数 + 启动 hook | 0.2d |
| 10a.4 | `smoke-mentor-coverage.js` 验天启≥30·绍宋≥15 | 0.1d |
| 10a.5 | 暴露 `window._ty3_buildMentorIndex` + `window._ty3_suggestMenteesOf` (Slice 2.5 lazy guard 用) | 0.1d |

**DoD** (3 项)·

1. 天启 mentor ≥ 30·绍宋 ≥ 15·smoke 过
2. `GM._mentorIndex.mentor[name]` / `GM._mentorIndex.mentee[name]` 双向索引 verified
3. Slice 2.5 lazy guard 在 10a 后 UI 自动显 mentee suggest

#### Slice 10b·clientelism + 联动 UI (0.5d·**实施顺序·留 Slice 9 之后**)

**目标**·

- clientelism 触发·NPC 看到 mentor 极支/极反·70% 概率附议·**priority 见 §5.4.10 (dims 极反 cancel)**
- mentor + 召集联动 UI·"X 的门生·建议同召 Y/Z" + "+一并召门生" 一键加召

**DoD** (2 项)·

1. clientelism 5 议题中触发 ≥ 3·dims 极反时不触发 (priority verified)
2. 一键加召正确·加召的 mentee 不入"漏召"统计·Slice 2.5 DoD #11 完整 UI 验证在此 slice 完成

---

### Slice 11·smoke + bug 修 + summary (1.7d·v2.7 +0.2d·fabricate 议题 + 改 id·-0.3 桥接 patch 去)

**v2.7 加 11.0 子任务**·smoke 议题跟剧本 data 错位修·

```
六轮 audit verified·
  v2.6 §10.1 SMOKE_CASES 10 议题 topic·0/10 在 scenarios 存在
  5/5 scenario id 错·"tianqi-7-9" 实际 "sc-tianqi7-1627"·等
  
11.0 fabricate (0.2d)·
  - 改 5 scenario id·按实际 grep 出的 id
  - 议题 topic 自己 fabricate·跟剧本时代 / 人物对齐 (无需 scenarios 含此 topic)
  - 例·天启 → "整顿东厂"·崇祯 → "查抄魏珰家产" (沿用人物 + 时代背景)
```

**目标** (v2.5 改·删桥接 patch + 加 UI 渲染 verify)·

1. 写 `web/scripts/smoke-tinyi-v3-full.js`·10 case (5 剧本 × 2 议题·见 §10 表)
2. 全 18 项 DoD 验收
3. **(v2.5 改)** chronicleTracker 桥接 **verify·非 patch** (v2.4 误以为断·实际 v3 phase14 L3648 已调 `_ty3_syncChaoyiChronicleTrack` → `ChronicleTracker.upsert({type:'chaoyi_pending'})`·grep verified) + **复查 user 报告"廷议待落实卡缺"真原因** (UI 渲染过滤? type 名漂?)
4. **v3 typo 修** (v1.5.1)·L781 `</div>` 缺 `<` 补上 (verified 还在)
5. **GM.unlockedRegalia smoke** (v1.5.1)·跨会话保留 verified
6. 跑 5/2 `廷议-visual-regression-checklist.md` (139 行)·9 大项 + 30 子项 全过
7. 写 `web/docs/tinyi-overhaul-sprint-summary.md`
8. changelog.json 写 1.X.X.X "廷议大改 sprint v3 激活"

**v2.5 chronicleTracker verify + UI 渲染复查** (取代 v2.4 broken patch)·

```
1. verify v3 现有桥接·
   - grep `_ty3_syncChaoyiChronicleTrack` 调用点 (L3648)
   - smoke 5 case·跑完一议·GM._chronicleTracks 应含 {type:'chaoyi_pending', ...} entry
   
2. 复查 user 报告"廷议待落实卡缺"真原因·按可能性排查·
   - (a) UI 渲染 filter·检查 chronicle UI 是否取 type='chaoyi_pending' (可能漏 filter)
   - (b) type 命名漂·v3 写 'chaoyi_pending' (snake)·UI filter 可能找 'tinyi-pending' (kebab)
   - (c) sourceType vs type 字段混·ChronicleTracker.upsert 看 sourceType+sourceId·UI 可能看 type

3. 若发现 UI bug·按 spot 修·~0.2-0.3d
   若 verify 全通·DoD #3 直接 pass·无需 patch
```

**为什么 v2.4 patch 错** (留档·防 v3 后续 audit 重蹈)·

- `ChronicleTracker.push` API 不存在·实际是 `add / update / upsert / complete / abort` (tm-chronicle-tracker.js L23-30)
- v3 phase14 已经在 L3648 调 `_ty3_syncChaoyiChronicleTrack(...)` → 内部 `ChronicleTracker.upsert(...)` (L3689)·**桥接没断**
- v2.4 doc 说"桥接断"是**事实假设错误**·应基于 grep verified·不基于推测

**v3 typo patch** (Slice 11·30s)·

```diff
- + '<div class="ty3-pa-opt-cost">完整七阶段/div>'
+ + '<div class="ty3-pa-opt-cost">完整七阶段</div>'
```

**DoD** (v2.6 改 #3·6 项)·

1. smoke 10 case 全 PASS·mode 熵 ≥ 1.8 bit
2. visual-regression-checklist 9 大项 + 30 子项 全过
3. **(v2.6 改)** chronicleTracker 桥接 **verify + type 改名**·
   - smoke verify `GM._chronicleTracks` 含 廷议 entry (v3 phase14 L3648 已调 upsert·非自建 patch)
   - **改 v3 L3690/3692·`type: 'chaoyi_pending'` → `'tingyi_pending'`** (verified·v3 廷议 phase14 误用 chaoyi 类型名·UI 渲染时 user 看 "廷议待落实" 找不到·这就是 user 当初报告真原因)
   - 跑 5 case·verify UI 渲染 "廷议待落实" 卡显
4. GM.unlockedRegalia·跨会话存档加载后保留
5. summary doc 写
6. changelog 写

**v2.6 工时**·1.5d 不变·verify + type 改名 5 分钟。

**v2.5 工时**·1.8d → **1.5d** (-0.3d·桥接 patch 删) + verify +0.0d (smoke check 已含) = **1.5d**·**或 1.8d** 若 UI 渲染 bug 真存在需修 (+0.3d)。

---

## §5·共享设计 (跨 Slice 引用)

### 5.1·玩家发言 paradigm (Slice 4.5)

#### 5.1.1·DELETE 清单 (v3 浮按钮系统)

```
JS 文件·tm-tinyi-v3.js
  L545-557·_ty3_mountInterjectButton
  L561-572·_ty3_show/hide InterjectButton
  L574-588·_ty3_openInterjectPanel
  L590-682·5 个 prompt() handler·
    _ty3_doInterjectTrain   (L590-603)
    _ty3_doInterjectSummon  (L611-631)
    _ty3_doInterjectPartyLeader (L640-661)
    _ty3_doInterjectSilence (L641-657)
    _ty3_doInterjectAbort   (L670-682)

DOM·
  #ty3-interject-btn
  #ty3-interject-panel

CSS·grep '.ty3-ij-' 全删
```

共 ~145 行 JS + ~80 行 CSS + 2 DOM·全清。

#### 5.1.2·REUSE (v2 chaoyi.js 已有)

```
#cy-input-row (tm-chaoyi.js L34-38)·底部 input + "插言"/"打断" 按钮
_cySubmitPlayerLine (L62-71)
_cyShowInputRow(show) (L56-59)
```

v3 主入口 `_ty3_open` 处·删 `_ty3_mountInterjectButton` / `showInterjectButton`·改 `_cyShowInputRow(true)` 让底部输入栏永显。

#### 5.1.3·主入口·按 phase 分发

**v2.3 补·接入路径** (解 v2.2 audit medium #5)·`_cySubmitPlayerLine` 现走 `CY._pendingPlayerLine` 缓存·`_ty3_handlePlayerInterject` 异步消费·调 `_ty2_playerTriggeredResponse`。Slice 4.5 接入·

```js
// tm-tinyi-v3.js L1948 改·
async function _ty3_handlePlayerInterject(prevSpeeches) {
  if (!CY || !CY._pendingPlayerLine) return false;
  var line = CY._pendingPlayerLine;
  CY._pendingPlayerLine = null;
  // v2.3·v3 模式走新 _ty3_onPlayerSpeak·非旧 _ty2_playerTriggeredResponse
  if (typeof _ty3_onPlayerSpeak === 'function') {
    try { await _ty3_onPlayerSpeak(line); } catch(_){}
  } else if (typeof _ty2_playerTriggeredResponse === 'function') {
    try { await _ty2_playerTriggeredResponse(line); } catch(_){}  // fallback
  }
  return true;
}
```

`_cySubmitPlayerLine` 不动 (保持缓冲 paradigm·timing 一致)·只换 handler。

```js
async function _ty3_onPlayerSpeak(text) {
  if (!text || !text.trim()) return;
  if (typeof addCYBubble === 'function') addCYBubble('皇帝', text.trim(), false);
  
  if (CY._ty3 && CY._ty3.done) {
    if (typeof addCYBubble === 'function') addCYBubble('内侍', '（朝会已散·陛下回乾清宫。）', true);
    return;
  }
  
  switch (CY._ty3.currentPhase) {
    case 'preAudit':  return _ty3_onSpeakPreAudit(text);
    case 'seating':   return _ty3_onSpeakSeating(text);
    case 'debate':    return _ty3_onSpeakDebate(text);
    case 'confront':  return _ty3_onSpeakConfront(text);
    case 'vote':      return _ty3_onSpeakVote(text);
    case 'archon':    return _ty3_onSpeakArchon(text);
    case 'draft':     return _ty3_onSpeakDraft(text);
    case 'seal':      return _ty3_onSpeakSeal(text);
    default:          return _ty3_onSpeakDebate(text);
  }
}
```

每 phase handler 职责·

- **preAudit**·识别 "留中/私决/下议/明发" → 触发处置·其他 → 让奏报者重述
- **seating**·识别 "开议/改班/摘 X 出殿" → 触发·其他 → 进辩议
- **debate**·**核心**·跑完整 keyword/intent/代词/点名/抢答 (见 §5.1.6)
- **confront**·识别 "助 X / 敕停" → 选边或停链·其他 → 注入下一发言者
- **vote**·识别 "钦定 X / 钦点 / 暂阙" → 触发·其他 → 提示明确
- **archon**·识别 "S/A/B/C/D" 或自由档位 → 钦定
- **draft**·识别 "翰林/钦点 X/自拟" → 触发
- **seal**·识别 "用印/暂缓/退还" → 触发

#### 5.1.4·13 keyword regex (常朝 5 + 廷议 8)

```js
function _ty3_parseDetailKeyword(text) {
  const t = text.replace(/[。·，。，！？\s]/g, '');
  // 常朝继承 5
  if (/^准奏$|^准$|^可$|准了|可办|从之|奏可/.test(t)) return 'approve';
  if (/^驳$|^驳奏$|不准|不可|否|不行|不允/.test(t)) return 'reject';
  if (/留中|从长计议|容朕|缓议|且听/.test(t)) return 'hold';
  if (/下廷议|集议|付廷议/.test(t)) return 'escalate';
  if (/部议|发部|交部/.test(t)) return 'toPart';
  // 廷议特化 8
  if (/敕停|且止|休再争|止争/.test(t)) return 'haltConfront';
  if (/钦点|朕意定/.test(t)) return 'imperialPick';
  if (/仗下|廷杖|杖之/.test(t)) return 'flogging';
  if (/削籍|革其官|革其籍/.test(t)) return 'strip';
  if (/摘除|退殿|出殿/.test(t)) return 'dismiss';
  if (/转(户|兵|礼|工|吏|刑)部/.test(t)) return 'toPartSpecific';
  if (/更议|重议|再议之/.test(t)) return 'reopen';
  if (/革职|罢职|罢其官/.test(t)) return 'revoke';
  return null;
}
```

#### 5.1.5·11 intent map (常朝 8 + 廷议 3·preserve v3 既有 5 intent 语义)

```js
function _ty3_inferPlayerIntent(text) {
  const t = text || '';
  // 常朝继承 8
  if (/严办|惩之|治罪|不察|可斩|罢黜|查办|严斥|拿下/.test(t)) return 'punish';
  if (/[!！]{2,}/.test(t) || /必须|即办|速行|不容/.test(t)) return 'aggressive';
  if (/民苦|忧|痛|哀|怜|惜民|百姓苦/.test(t)) return 'sympathetic';
  if (/善|嘉许|勤勉|可嘉|有功|忠勇|赏之/.test(t)) return 'praise';
  if (/恐有|未必|疑|或非|姑妄|存疑|不可不察/.test(t)) return 'doubt';
  if (/两全|折中|分发|分批|可缓|商榷|或可/.test(t)) return 'mediate';
  if (/何如|如何|可乎|几何|详言|细言|奈何/.test(t)) return 'inquire';
  if (/让.*起对|让.*党首言之|卿且退下|另有要事/.test(t)) return 'v3-legacy';  // 保留 v3 5 选项语义
  // 廷议特化 3
  if (/朕亲断|且止|二位且止|朕意已决/.test(t)) return 'arbitrate';
  if (/退下|入殿|召|起对|休奏/.test(t)) return 'dispatch';
  if (/鸣鞭|退朝|跪安|殿仪/.test(t)) return 'ceremonial';
  return 'neutral';
}
```

#### 5.1.6·抢答队列·6 priority + 4 廷议加成

**6 priority** (复用常朝)·

```
0. 代词识别·refsLastSpeaker (你说/讲来/续言/单字"说/讲/继续") → 上一发言者
1. 点名识别·text 含任 NPC 名 → 优先抢答
2. intent 特殊抢答·
     punish → 被批者抢辩 + 言官响应
     mediate/doubt → 首辅 (韩爌) 出来调和
3. 主奏者·若未在前面
4. debate / selfReact 已有立场者
5. 闲人兜底·首辅 + 言官头领
```

**4 廷议加成** (v1.4)·

```
6. confront 链中·"助王永光"
   → 王永光阵营 mode=force-rebut
   → 对方阵营 mode=force-soften

7. arbitrate intent
   → confront 链立即结束·跳 phase 5 (草诏)

8. dispatch intent
   → 召集·"召黄宗周入殿" → attendees += 黄宗周
   → 摘除·"许显纯退下" → attendees -= 许显纯·favor-3

9. mentee 抢答·玩家 punish X·**v2.9 注·依赖 Slice 10a `GM._mentorIndex`·Slice 4.5 实施时 lazy guard**·
     `if (GM._mentorIndex?.mentor?.[X]) { ... } else skip mentee 抢答`
   → X 的所有 mentee 按 honor 决定·
     honor >= 0.5 → 抢辩驳玩家 "陛下·先师之论·门生不敢异" (护师)
     honor <  0.5 → 附议玩家 "陛下圣明·X 公此论确有未察" (背师)
```

**v2.9 完整示例·"严办许显纯" 抢答** (补 priority 0/3/5 case·完整 10 priority)·

| priority | NPC | mode | 因为 |
|---|---|---|---|
| 0 | (无·首次发言·无上一发言者) | — | priority 0 代词识别·此 case 不触发 |
| 1 | 许显纯 | rebut | 被点名·必抢辩 |
| 1 | 王永光 | rebut | 点名提及方 (东林)·必驳玩家 |
| 2 | 黄宗周 | rebut | 言官 + punish intent → 言官响应 |
| 3 | 韩爌 (主奏者·若有) | second | 主奏者若未在前面 |
| 4 | 周道登 (debate 已有立场者) | augment | 之前辩议已表态·补一议 |
| 5 | 朱国祯 (闲人首辅兜底) | pivot | 闲人首辅·折中 |
| 9 | 田尔耕 | clientelism | 许显纯 mentee·honor=0.6 → 护师 |
| 9 | 周应秋 | second | 许显纯 mentee·honor=0.3 → 背师·附议玩家 |
| 6/7/8 | (无·此 case 非 confront/arbitrate/dispatch) | — | priority 6/7/8 仅特殊 intent 触发 |

**v2.3 补·5 NPC 并发抢答 LLM cost** (解 v2.2 audit medium #6)·

```
单 NPC 1 stream call ≈ 600 prompt + 200 response = 800 token
5 NPC 并发     = 3000 + 1000 = 4000 token / 玩家发言
玩家 1 廷议说 5 次   = ~20K token / 议题
玩家日 10 议题   = ~200K token / day
→ 用户日均 LLM 费·~$0.3-0.7
```

**降级 hint**·若实测 cost > 25K token / 议题·降级 3 NPC 并发 (主点名 + 主奏者 + 言官头领)·其他 NPC 走 fallback 静默立场·DoD #10 (v2.3 新) 强制 cost 上限。

**示例·玩家说 "严办许显纯"** (5 NPC 并发抢答·全 LLM 流式)·

| priority | 谁抢答 | mode | 因为 |
|---|---|---|---|
| 1 | 许显纯 | rebut | 被点名·必抢辩 |
| 1 | 王永光 | rebut | 点名提及方 (东林)·必驳玩家 |
| 2 | 黄宗周 | rebut | 言官 + punish intent → 言官响应 |
| 9 | 田尔耕 | clientelism | 许显纯 mentee·honor=0.6 → 护师 |
| 9 | 周应秋 | second | 许显纯 mentee·honor=0.3 → 背师·附议玩家 |

#### 5.1.7·confront 链跨阶段 3 路径 (Slice 7)

```js
function _ty3_handleConfrontChainOnPhaseTransition(fromPhase, toPhase) {
  const chain = CY._ty3._confrontChain;
  if (!chain || !chain.active) return;
  
  const remaining = chain.maxRound - chain.currentRound;
  if (remaining <= 0) { _ty3_endConfrontChain(); return; }
  
  if (toPhase === 'archon' || toPhase === 'draft') {
    // truncate·钦定/草诏 阶段强制结束
    addCYBubble('内侍', '（陛下钦定·诸卿且止辩。）', true);
    _ty3_truncateConfrontChain();
    chain.unresolved = true;  // 写入 archive 供 phase 7 追责用
  } else if (toPhase === 'vote') {
    // 保留 + 再 1 round (廷推时)
    chain.allowOneMoreRound = true;
    chain.suspendedAt = 'vote';
  } else {
    // 默认·phase 2 重启 1 round
    chain.currentRound = Math.max(0, chain.currentRound - 1);
    addCYBubble('内侍', '（X 公 Y 公复争·容再议一回合。）', true);
    return _ty3_runDebateRound();
  }
}
```

---

### 5.2·UI / hotkey / ceremony (Slice 8.5)

#### 5.2.1·UI 元素对照表

| 时机 | 常朝有? | 廷议要做 |
|---|---|---|
| 开场 | 无 | 鸣鞭三响动画 + 字幕 + 三班鱼贯入场 |
| 议前预审 | 无 | 4 处置 modal·v3 已有 (L696-799)·sprint 复用 |
| 起议站班 | 无 | 三班布局·v3 已有 (L1690-1709) stance-based·sprint 加 V hotkey 切 class |
| 立场板 | 无 | 9 stance 色块顶部 sticky·v2 缩略·sprint 升级到放大 + N×9 矩阵 |
| 辩议中 | 议程列表 | 底部 input + 三班分布 + 潮汐条 (替换浮按钮) |
| confront 链 | 无 | 红色虚线 + 箭头 + "助 A / 助 B / 敕停" 按钮组 |
| 廷推 | 无 | 按党分组候选清单 modal (v3 _ty3_phase3_buildCandidates 已有·无固定数·v2.4 verified) |
| 钦定档位 | 无 | S/A/B/C/D 5 卡牌·v3 已有名 + sprint 加 AI 预测段 |
| 草诏 | 无 | 3 卡选择·翰林 / 钦点首辅 / 自拟 |
| 用印 | 无 | 朱砂印章 + 阻挠 modal (v3 已有 2 sub-flow·sprint 加 UI polish) |
| 追责 | 无 | N 回合后小弹窗 (chronicleTracker 桥接后才显·见 Slice 11) |
| 廷杖 | 无 | gold-screen "🔨 廷杖 X 二十" 5s 淡出 |
| 削籍 | 无 | gold-screen "❌ 削籍 X" + 全场气氛 → cautious |

#### 5.2.2·10 mode 视觉一眼区分

| mode | 视觉标记 | 颜色 |
|---|---|---|
| lead | 气泡左侧 ▶ | 中性灰 |
| second | 气泡左侧 ⊕ | 同党色 |
| rebut | 气泡左侧 ← 红箭 | vermillion |
| soften | 气泡左侧 ～ 金波 | gold |
| pivot | 气泡左侧 ⇌ 双向 | indigo |
| augment | 气泡左侧 ➕ 视角 icon | celadon (v2.4 改·跟 Slice 5 一致) |
| **confront** | 立场板上**红色虚线**·气泡左侧 ❗ | vermillion-darkest |
| **cite_classic** | 气泡左侧 📜 卷轴 + 引文段缩进 | gold-darkest |
| **clientelism** | 气泡左侧 🎓 师承 icon + mentor 名 tag | indigo-darkest |
| **martyr** | 气泡**全红边框** + 字号加大 | vermillion-blood |

#### 5.2.3·9 + 1 廷议独有快捷键 (v1.5 新加 V·v2.4 caption 改·9 已有 + 1 新)

| 键 | 廷议动作 | 常朝同键 | 差异说明 |
|---|---|---|---|
| `Enter` | 提交 input 内发言 | 同 | 共用 |
| `空格` | 暂停 / 推进当前发言序列 | 无 | 廷议独有·节奏控制 |
| `Esc` | 退朝·**二次确认 modal** (3 路径·见 §5.1) | 直接关 | 廷议有保护·防误关 |
| `T` | 弹立场板放大版 (详细 N×9 矩阵) | 无立场板 | 廷议独有 |
| `1-9` | 廷推时·9 候选选择 | 无廷推 | 廷议独有 |
| `[` / `]` | confront 链中·切阵营 "助 X / 助 Y" | 无党争 | 廷议独有 |
| `M` | 召集 + 解散 attendees | 无召集 | 廷议独有 |
| `Ctrl+Enter` | 强制裁决·跳剩余阶段 | 无 | 廷议应急 |
| `H` | 弹历史档案 (本议题 stanceHistory) | 无 | 廷议独有 |
| **`V`** (v1.5 新) | **三班视图切换 (stance ↔ class)** | 无 | **v1.5 双轨 view** |

footer hint·

```
[T] 立场 · [M] 召集 · [[/]]助党 · [V] 班视图 · [Ctrl+Enter] 速决 · [H] 史 · [Esc] 退朝
```

#### 5.2.4·10 ceremony 动画时长 (v2.4 分两段·实施 slice 锁)

**5 核心 ceremony·Slice 8.5 实施**·

| ceremony | 时长 | 触发 | CSS class |
|---|---|---|---|
| 鸣鞭三响 (开场) | **8s** | 廷议开始 | `.ty3-cer-openrtn` |
| 钦定 gold-screen | **3s** | phase 4 钦定 | `.ty3-cer-archon` |
| 草诏 (毛笔挥洒) | **2s** | phase 5 草诏 | `.ty3-cer-draft` |
| 用印 (朱砂印章) | **5s** | phase 6 用印 | `.ty3-cer-seal` |
| 追责 (小弹窗) | **4s** auto-fade | phase 7 追责 | `.ty3-cer-pursue` |

**5 联动 ceremony·Slice 7.5 实施** (跟 6 动作绑定·v2.4 挪过来·避免 8.5 工时低估)·

| ceremony | 时长 | 触发 | CSS class |
|---|---|---|---|
| 廷杖 (锤击 + 红 flash) | **5s** | Slice 7.5 廷杖动作 | `.ty3-cer-flog` |
| 削籍 (黑屏 + 大字) | **4s** | Slice 7.5 削籍动作 | `.ty3-cer-strip` |
| 摘除 (简短退殿) | **2s** | Slice 7.5 摘除动作 | `.ty3-cer-dismiss` |
| 革职 (永久革除) | **6s** + sound | Slice 7.5 革职动作 | `.ty3-cer-revoke` |
| 更议 (敕令字幕) | **3s** | Slice 7.5 更议动作 | `.ty3-cer-reopen` |

P.conf 加 `tinyiCeremonyDuration = 1.0` multiplier (0.5 跳过快 / 2.0 慢慢看)·两段共用。

---

### 5.3·UI Mockup (v3 verified)

#### D.1·开场 (鸣鞭三响 + 三班·stance-based)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🏛 廷议·诛戮魏珰余孽议        第1轮     待定9            [✕ 退朝]      │
├──────────────────────────────────────────────────────────────────────────┤
│              〔 鸣 鞭 三 响 · 百 官 列 班 〕                              │
│                                                                           │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│   〔 三班已立·同 0·中 9·反 0 〕                       (按 V 切 class)    │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                           │
│  ┌── 左班·同·东林+盟 ──┐ ┌── 中班·中立 ────┐ ┌── 右班·异·阉党 ──┐      │
│  │ (待 stance 推演后入)│ │ ☖ 韩爌 ○待定    │ │ (待推演后入)     │      │
│  │                     │ │ ☖ 顾秉谦 ○待定  │ │                  │      │
│  │                     │ │ ☖ 叶向高 ○待定  │ │                  │      │
│  │                     │ │ ☖ 毕自严 ○待定  │ │                  │      │
│  │                     │ │ ☖ 高攀龙 ○待定  │ │                  │      │
│  │                     │ │ ☖ 杨涟 ○待定    │ │                  │      │
│  │                     │ │ ☖ 黄宗周 ○待定  │ │                  │      │
│  │                     │ │ ☖ 许显纯 ○待定  │ │                  │      │
│  │                     │ │ ☖ 田尔耕 ○待定  │ │                  │      │
│  └─────────────────────┘ └─────────────────┘ └──────────────────┘      │
│                                                                           │
│  📜 皇帝·今日特召卿等议诛戮魏珰余孽·诸卿各陈己见。                       │
├──────────────────────────────────────────────────────────────────────────┤
│ 陛下欲言······(回车插言)                          [📣 插言] [⏸ 打断]  │
│ [T]立场·[M]召集·[[/]]助党·[V]班视图·[Ctrl+Enter]速决·[H]史·[Esc]退朝   │
└──────────────────────────────────────────────────────────────────────────┘
```

按 [V] 切 class 视图·

```
┌── 内阁班 (紫·阁臣) ──┐ ┌── 部院班 (绯·尚书) ────┐ ┌── 言官班 (绿·御史) ──┐
│ ☖ 韩爌  ☖ 顾秉谦      │ │ ☖ 毕自严 ☖ 许显纯       │ │ ☖ 高攀龙 ☖ 杨涟        │
│ ☖ 叶向高              │ │ ☖ 田尔耕                 │ │ ☖ 黄宗周               │
└───────────────────────┘ └─────────────────────────┘ └───────────────────────┘
```

#### D.2·辩议中·confront 链

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🏛 廷议·诛戮魏珰余孽议         第2轮      〔 对 质 中 · 1/2 〕         │
├──────────────────────────────────────────────────────────────────────────┤
│   〔 三班已立·同 58·中 10·反 32 〕                                       │
│                                                                           │
│  ┌── 左班·同·东林 ──┐  ┌── 中班·中立 ──┐    ┌── 右班·异·阉党 ──┐         │
│  │ 韩爌 ●折中        │  │ 王永光 ●极反🔥┤    │ 许显纯 ●极支             │
│  │ 顾秉谦●支持       │  │              ┊←❗→│                          │
│  │ 高攀龙●极反       │  │ 毕自严●反对  ┊    │                          │
│  │ 杨涟  ●极反       │  └────────────────┘    └──────────────────────┘   │
│  │ 黄宗周●极反       │          └─── 红色虚线·confront 中 ─────┘        │
│  └──────────────────┘                                                    │
│                                                                           │
│  王永光 ❗【confront】 此议岂可复行!此乃魏珰旧策余孽·三年损饷三十万      │
│           两·势难再举·公等更欲翻案乎?                                    │
│                                                                           │
│  许显纯 ❗【confront】 王公此论·是欲翻天启朝定案乎?当年公等附议·今复    │
│           食言·岂非朝令夕改?                                              │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  [⚡ 助王永光]    [⚡ 助许显纯]    [⚖️ 敕停·强制结束]                 ││
│  └────────────────────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────────────────────┤
│ 陛下欲言······或输入"助X" / "敕停"            [📣 插言] [⏸ 打断]   │
│ [[助党 │ ]助党 │ T立场 │ V班 │ Ctrl+Enter 速决 │ Esc 退朝               │
└──────────────────────────────────────────────────────────────────────────┘
```

#### D.3·立场板放大版 (按 `T`)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 立场板·详细模式·议题 [诛戮魏珰余孽议·第2轮]            [✕ 关闭(T)]   │
├──────────────────────────────────────────────────────────────────────────┤
│         极支  支持  倾支  中立  倾反  反对  极反  折中  另提    | 班次    │
│ 韩爌     ░    ░    ░    ░    ░    ░    ░    ●70  ░     | 内阁紫   │
│ 顾秉谦   ░    ●62  ░    ░    ░    ░    ░    ░    ░     | 内阁紫   │
│ 叶向高   ░    ░    ●50  ░    ░    ░    ░    ░    ░     | 内阁紫   │
│ ────────────────────────────────────────────────────────  ────────  │
│ 王永光   ░    ░    ░    ░    ░    ░    ●85  ░    ░     | 部院绯   │
│ 毕自严   ░    ░    ░    ░    ░    ●70  ░    ░    ░     | 部院绯   │
│ ────────────────────────────────────────────────────────  ────────  │
│ 高攀龙   ░    ░    ░    ░    ░    ░    ●90  ░    ░     | 言官绿   │
│ 杨涟     ░    ░    ░    ░    ░    ░    ●88  ░    ░     | 言官绿   │
│ 黄宗周   ░    ░    ░    ░    ░    ●65  ░    ░    ░     | 言官绿   │
│ 许显纯   ●80  ░    ░    ░    ░    ░    ░    ░    ░     | 阉党红   │
├──────────────────────────────────────────────────────────────────────────┤
│  当前 mode 分布·confront ×2 (王永光 ↔ 许显纯) ·rebut ×3·second ×2       │
│  党派阵营·东林 (韩/顾/叶/高/杨/黄/王/毕)·阉党 (许)·中立 (-)             │
│  [按 T 关闭·返回主廷议视图]                                              │
└──────────────────────────────────────────────────────────────────────────┘
```

#### D.4·钦定档位 (v3 5 真档名)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  钦定档位·诛戮魏珰余孽议·诸卿议毕·陛下定档                            │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐            │
│  │   S    │  │   A    │  │   B    │  │   C    │  │   D    │            │
│  │圣旨煌煌│  │凛然奉旨│  │勉强尊行│  │众议汹汹│  │危诏激变│            │
│  │ ════   │  │ ════   │  │ ════   │  │ ════   │  │ ════   │            │
│  │支 8 名 │  │支 5 名 │  │支 3 名 │  │反 7 名 │  │反 12名 │            │
│  │皇威 +5 │  │皇威 +3 │  │皇威 +1 │  │皇威 -2 │  │皇威 -5 │            │
│  │皇权 +2 │  │皇权 +1 │  │皇权  0 │  │皇权 -3 │  │皇权 -5 │            │
│  │反弹 弱 │  │反弹 轻 │  │反弹 中 │  │反弹 重 │  │反弹 极 │            │
│  │martyr  │  │  ——   │  │  ——   │  │  ——   │  │martyr  │            │
│  │ ×3 触发│  │        │  │        │  │        │  │×2 触发 │            │
│  └────────┘  └────────┘  └────────┘  └────────┘  └────────┘            │
│    [1]         [2]         [3]         [4]         [5]                  │
│                                                                           │
│  D 档触发额外·  [硬 推]  [妥 协]                                          │
│                                                                           │
│  当前预测·众臣多倾向 B·阉党推 S (激进诛戮)                              │
│  钦定 D 将触发硬推 / 妥协 选项·选硬推 = 言官集体死谏 (~3 人)             │
├──────────────────────────────────────────────────────────────────────────┤
│ 输入 S/A/B/C/D 或按 1-5             [Esc 推迟决定·进留中]              │
└──────────────────────────────────────────────────────────────────────────┘

钦定后·内侍 bubble·
〔 钦定档位·S·圣旨煌煌·8 名·皇威 75·皇权 65 〕
```

#### D.5·廷议 8 阶段时序图

```
  议题 X 升级·或玩家手动召·或 NPC 上书请议 (v1.4 新)
       │
       v
  ┌──────────────────────────────────────────────────────────┐
  │ ★ Slice 2.5·召集 (仅"明发"路径)·6 资格筛 + AI 推荐       │
  └──────────────────────────────────────────────────────────┘
       │
       v
  阶段 0·议前预审  ☞ 4 处置·留中/私决/下议/明发  (v3 已有)
       │ 明发
       v
  阶段 1·起议站班  ☞ 三班·鸣鞭三响  (v3 已有)
       │
       v
  阶段 2·分轮辩议  ☞ 4 轮·主奏起议/同党附议/敌党驳议/中立权衡
                  ☞ 10 mode (v1.4 新加 4)·8D persona rule
                  ☞ 玩家输入 → 11 intent + 6+4 抢答  (Slice 4.5)
                  ☞ confront 链·NPC vs NPC 真对质  (Slice 7)
       │ 议毕
       v
  阶段 3·廷推    ☞ (仅人事议题)
       │
       v
  阶段 4·钦定档位 ☞ S/A/B/C/D + huangwei/huangquan  (v3 已有)
       │
       v
  阶段 5·草诏拟旨
       │
       v
  阶段 6·用印颁行 ☞ 党派阻挠 + 强行用印  (v3 已有 2 sub-flow)
                  ☞ Slice 8·v1.4 反弹·hook 在 archon effects 之后
                  ☞ 召集后果二次惩罚·partyTilt × 1.5
                  ☞ 写 chronicleTracker (Slice 11 桥接修)
       │ N 回合后
       v
  阶段 7·追责回响 ☞ 4 outcome·圆满/部分/抵触/阻挠  (v3 已有)
                  ☞ martyr NPC 上书谏诤·诏狱/廷杖事件
                  ☞ 民意度 / 言官离心 月衰 (按 dynasty)
```

#### D.6·廷杖动画 (Slice 7.5)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                            🔨 廷 杖 许 显 纯 二 十                        │
│                                                                           │
│              loyalty -10   prestige -5   健康 -8   入诏狱可能 +20%        │
│                                                                           │
│                          (5 秒后淡出·返回廷议)                          │
└──────────────────────────────────────────────────────────────────────────┘
```

整屏淡橙红 flash·中央大字·5 秒后淡出。

#### D.7·召集 modal (Slice 2.5)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 召集廷议·议题 [盐法改革受阻九边急饷]·tag [finance, reward, border]      │
├──────────────────────────────────────────────────────────────────────────┤
│  视图·  [品级 ▼] [党派] [部门]              已选 7 / 30·  ▼ 推荐 8 人   │
│                                                                           │
│  ───── 正一品 (必召) ─────                                                │
│   ✓ 韩爌 (首辅·中立)             [必] [AI 建议·议事核心]                │
│   ✓ 叶向高 (次辅·东林)           [必] [AI 建议·均衡需补 1 反方]         │
│   ☐ 顾秉谦 (阉党首辅)            [漏召警告·阉党 0 人]                   │
│                                                                           │
│  ───── 正二品 (必召) ─────                                                │
│   ✓ 毕自严 (户部尚书·东林)       [必] [AI 建议·tag:finance]             │
│   ☐ 张瑞图 (兵部尚书·阉党)       [漏召警告·tag:border 缺]              │
│   ✓ 黄克缵 (吏部尚书·中立)       [必]                                   │
│   ✓ 来宗道 (礼部尚书·东林)       [必]                                   │
│   ☐ 薛三才 (刑部尚书·阉党)       [漏召警告·阉党 0 人]                  │
│   ✓ 沈氵巨 (工部尚书·中立)       [必]                                   │
│   ✓ 高攀龙 (左都御史·东林)       [必]                                   │
│   ☐ 周应秋 (右都御史·阉党)       [漏召警告]                            │
│                                                                           │
│  ───── 正三品 (可召) ─────                                                │
│   ☐ 李逢申 (户部左侍郎·东林)    [AI 建议·tag:finance]                   │
│   ☐ 王永光 (吏部右侍郎·东林)    [AI 建议·均衡]                          │
│   ☐ 许显纯 (锦衣卫指挥·阉党)    [AI 建议·阉党均衡]                      │
│                                                                           │
│  ───── 正七品·言官清流 (v1.5 prestige 升级·必召) ─────                  │
│   ✓ 杨涟 (御史·prestige 90)      [必·v1.5 layer 6]                       │
│   ✓ 黄宗周 (御史·prestige 85)    [必·v1.5 layer 6]                       │
│                                                                           │
│  ───── 在外·不可召 (灰显) ─────                                          │
│   ☒ 袁崇焕 (蓟辽督师·辽东)       [外任·急召不及]                        │
│                                                                           │
│  ───── 师承联动·mentor 建议同召 (v1.4 新) ─────                          │
│   韩爌门生·钱龙锡·何如宠·吴宗达 (3 人)·  [+一并召]                        │
│   叶向高门生·朱国祯·朱延禧 (2 人)·       [+一并召]                        │
│                                                                           │
│  ───── 已保存模板 (v1.5 localStorage) ─────                              │
│   [我的财政会议 (4 人)]  [东林大会 (8 人)]  [+保存当前模板]              │
│                                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│  此次召集后果预测·                                                       │
│  ⚠ 阉党 0 / 东林 5 / 中立 4 → 党争张力 +3·清议事件 (3 回合后)           │
│  ⚠ 漏召二品 [周应秋·张瑞图·薛三才] → loyalty -5/-5/-3 (prestige 加权)   │
│  ⚠ tag:border 缺·建议召兵部 + 边帅                                     │
│  ⚠ 民意度 -4·言官离心 -3 (召了 2 言官·v1.5 杨涟 + 黄宗周)              │
│                                                                           │
│  策略·  [⚖️ 标准九卿]  [📊 专家小组]  [🔥 派系大会战]  [👥 大廷议(30+)]│
│         [✕ 取消]      [一键召推荐 (9)]      [仍开议·按当前 8 人]      │
└──────────────────────────────────────────────────────────────────────────┘
```

#### D.8·议前预审面板 (v3 既有·preserve 100%·v3 L696-799)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          〔 议 前 预 审 〕                                │
│        陛下决断之前·先察议题之轻重缓急·从容择处                          │
├──────────────────────────────────────────────────────────────────────────┤
│  议 题·[诛戮魏珰余孽议·涉者百余人·当依律严办抑或宽宥        ▼ 待议册]   │
│                                                                           │
│  ───── 留中册·上次留中·可"再议" ─────                                  │
│   • 议盐法改革受阻·复议 1                            [再议]              │
│   • 议九边粮饷紧                                     [再议]              │
│                                                                           │
│  ───── 奏者信息·密揭/题本·体裁 ─────                                    │
│   奏者·黄宗周 (科道御史) · 体裁·密揭                                     │
│   内容·阉党余孽尚在朝中·当尽诛之·以正朝纲... (摘 100 字)               │
│                                                                           │
│  ───── 党派立场预测 (v3 _ty3_paUpdateForecast) ─────                     │
│   东林清流·支持  ████████  8 人                                          │
│   阉党残部·反对  ████  4 人                                              │
│   中立朝臣·中立  ██  2 人                                                │
│                                                                           │
│  ───── 陛下何如裁处 ─────                                                │
│                                                                           │
│  ┌──────────────────────────┐  ┌──────────────────────────┐             │
│  │ 📥 留 中                 │  │ 🤐 私 决                 │             │
│  │ 皇权 -1                  │  │ 皇威 +1                  │             │
│  │ 搁置一回合·奏者          │  │ 走御前奏对·与心腹密议    │             │
│  │ prestige -2·世人议怠政   │  │ 不公开·不入廷议          │             │
│  └──────────────────────────┘  └──────────────────────────┘             │
│                                                                           │
│  ┌──────────────────────────┐  ┌──────────────────────────┐             │
│  │ 🤝 下议·五人闭门          │  │ 📜 明 发·廷议             │             │
│  │ 朝堂渐和                 │  │ 完整七阶段                │             │
│  │ 召三品以上 5 员·         │  │ 召三品以上百官·          │             │
│  │ 小范围议事               │  │ 四轮辩议·公开裁决        │             │
│  └──────────────────────────┘  └──────────────────────────┘             │
├──────────────────────────────────────────────────────────────────────────┤
│                              [罢·改日再议]                              │
└──────────────────────────────────────────────────────────────────────────┘
```

#### D.9·用印 2 sub-flow (v3 既有·preserve)

```
正常颁行·

┌──────────────────────────────────────────────────────────────────────────┐
│ 🖋 用印·诛戮魏珰余孽议·钦定 B (勉强尊行)                              │
├──────────────────────────────────────────────────────────────────────────┤
│              [朱砂印章 动画·5s 淡入淡出]                                 │
│                       〔 诏命用印颁行 〕                                  │
│              诏命·按 B 档·分批查办·首恶五人·余者宽宥                    │
└──────────────────────────────────────────────────────────────────────────┘


阻挠时·

┌──────────────────────────────────────────────────────────────────────────┐
│ 🖋 用印·诛戮魏珰余孽议·钦定 D (危诏激变)                              │
├──────────────────────────────────────────────────────────────────────────┤
│  阻挠概率·  35%·朝中反对方  (东林清流·杨涟 / 高攀龙 / 黄宗周)            │
│  有 35% 概率「留中不发」 —                                                │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ 🕊 放弃用印·议题转留中·影响轻                                       ││
│  │ ⚔ 强行用印 (皇权 -5)·硬推·朝堂转 cautious                          ││
│  └────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘

(若阻挠成功) 〔 诏命留中·阻挠者·东林 〕
(若强行成功) 〔 强行用印·阻于 东林·皇威 -5·朝堂转 cautious 〕
```

#### D.10·追责回响弹窗 (v3 既有·preserve·v3 L3413·4 outcome)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ⚖️ 追责回响·上回议·诛戮魏珰余孽 (3 回合前)                              │
├──────────────────────────────────────────────────────────────────────────┤
│  议题·诛戮魏珰余孽议·钦定 B (勉强尊行)                                  │
│  outcome·  圆 满 ✓ (fulfilled)                                            │
│                                                                           │
│  ✓ 阉党首恶 5 人查办·田尔耕 / 周应秋 / 等 已下诏狱                       │
│  ✓ 余者宽宥·阉党 morale -3·东林 morale +2                                │
│  ✓ 民意度 +5 (公允)·言官离心 -2 (诉求部分实现)                           │
│                                                                           │
│  ───── outcome 4 档对照 ─────                                             │
│  ✓ 圆满 (fulfilled)·    S/A 档 + 无阻挠           ← 本次                 │
│    部分 (partial)·      B/C 档                                            │
│    抵触 (contested)·    D 档                                              │
│    阻挠 (blocked)·      seal blocked                                      │
│                                                                           │
│  ───── 长期影响 ─────                                                     │
│  • 阉党残部 tension -2·继续衰退                                           │
│  • 东林士气 +3·后续议事更激进                                             │
│  • 民意度记录·"陛下治阉党有功" (累 +1 / 月)                              │
│                                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│ [明白]                              [入实录·永久档存]                    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 5.4·召集制完整 (Slice 2.5)

#### 5.4.1·核心 thesis

召集 = 廷议 phase 0 之前 = 入场政治表态。仅"明发"路径触发召集 modal·"留中/私决/下议"不召集。

每次召集影响·

1. 当场决议·谁被召决定立场板分布
2. 没被召的 NPC 不满 (漏召 loyalty / prestige 加权)
3. 党争状态变化 (cohesion · tension · morale)
4. 朝中评议·"陛下偏好 X 党"
5. NPC 长期 loyalty 微调
6. 民意度 + 言官离心累积

#### 5.4.2·6 资格层 (v2.2 措辞修·3 态 priority cascade)

每个 NPC 通过 `_ty3_calcEligibility(ch, topic, scenario)` 计算 category·6 层叠加·**3 态 priority cascade** (v2.2 措辞修·v2.1 误写"取最严")·

```
任 1 层判 '不召'  → 不召   (cancel·硬否决)
否则任 1 层判 '必召' → 必召  (elevate·硬通过)
否则在 ['可召', '罕召'] 内取严  (default cascade)
```

**层 1·品级筛**

```js
function _ty3_calcEligibilityByRank(ch) {
  const lv = _cyRankLevelOf(_cyGetRank(ch));
  if (lv <= 4)  return { category: '必召', layer: 1 };
  if (lv <= 8)  return { category: '可召', layer: 1 };
  if (lv <= 12) return { category: '可召', layer: 1 };
  if (lv <= 14) return { category: '罕召', layer: 1 };
  return { category: '不召', layer: 1 };
}
```

**层 2·在场筛**·复用 `_isAtCapital`·外任 / 在途 / 出使 不可召

**层 3·状态筛 8 类**·

```
ch.alive===false       → '不召'·殁
ch._imprisoned         → '不召'·入狱·走狱中问对   (v2.6 改·非 _inPrison·verified runtime 字段名)
ch._exiled             → '不召'·流放
ch._dingyou            → '不召'·丁忧·居丧不入朝   (v2.6 新建·Slice 1 一并补·runtime 当前 0 hit)
ch._sick && hp<=10     → '不召'·病重·告病
ch._retired            → '不召'·致仕·不入朝
ch._fled               → '不召'·逃亡
ch._missing            → '不召'·失踪
```

**层 4·朝代规矩** (剧本配·见 §5.4.6)

**层 5·党派回避** (议题特定·e.g. 立储议外戚回避)

**层 6·prestige / influence** (v1.4 新)

```js
function _ty3_calcEligibilityByPrestige(ch) {
  const composite = ((ch.prestige || 50) + (ch.influence || 50)) / 2;
  const rankLevel = _cyRankLevelOf(_cyGetRank(ch));
  
  if (composite >= 90)                       return { category: '必召', layer: 6 };
  if (composite >= 75 && rankLevel <= 8)     return { category: '必召', layer: 6 };
  if (composite >= 80 && rankLevel <= 14)    return { category: '必召', layer: 6 };  // 言官清流
  if (composite <= 30 && rankLevel >= 12)    return { category: '不召', layer: 6 };
  return null;
}
```

**示例·杨涟** (正七品御史·prestige=90·influence=85)·

```
层 1·从七品 → 罕召
层 6·composite=87 + rank=14 → 80+ 言官清流 → 必召
取最严·必召  (因为 6 层 "取严" 但 prestige 升级是 raise·不 cancel)
```

**实施伪代码** (v2.2 补)·

```js
function _ty3_calcEligibility(ch, topic, scenario) {
  const layers = [
    _ty3_calcEligibilityByRank(ch),
    _ty3_calcEligibilityByLocation(ch),
    _ty3_calcEligibilityByStatus(ch),
    _ty3_calcEligibilityByDynasty(ch, scenario, topic),
    _ty3_calcEligibilityByPartyTaboo(ch, topic),
    _ty3_calcEligibilityByPrestige(ch)
  ].filter(Boolean);
  if (layers.some(l => l.category === '不召')) return { category: '不召', layer: layers.find(l => l.category === '不召').layer };
  if (layers.some(l => l.category === '必召')) return { category: '必召', layer: layers.find(l => l.category === '必召').layer };
  const order = ['可召', '罕召'];
  let max = '可召';
  for (const l of layers) if (order.indexOf(l.category) > order.indexOf(max)) max = l.category;
  return { category: max, layer: 0, eligible: max !== '罕召' };
}
```

#### 5.4.3·5 政治后果 (v2.8 修·affinity 单值 + crossPartyRatio bug)

```js
function _ty3_calcConveningPolitics(attendees, proposerParty, topic, scenario) {
  const opposing = _ty3_getOpposingParties(proposerParty);
  const allied   = _ty3_getAlliedParties(proposerParty);
  
  // 算 crossPartyRatio (v2.8 bug 修·补 counts.size===1 case)
  const counts = _ty3_v15_countByParty(attendees);
  let crossPartyRatio = 0;
  let tilt = 'balanced';
  if (counts.size === 0) {
    crossPartyRatio = 0;
    tilt = 'balanced';
  } else if (counts.size === 1) {
    // v2.8 修·全同一党·之前 Math.min/max=1 算 ratio=1·走 balanced 是 bug
    crossPartyRatio = 0;
    tilt = attendees.length >= 8 ? 'fullOneParty' :
           attendees.length >= 5 ? 'oneParty'     : 'balanced';
  } else {
    const values = Array.from(counts.values());
    crossPartyRatio = Math.min(...values) / Math.max(...values);
    if (crossPartyRatio > 0.6)            tilt = 'balanced';
    else if (crossPartyRatio < 0.2 && attendees.length >= 5) {
      tilt = 'oneParty';
      opposing[0]?.tension && (opposing[0].tension += 3);
    }
    if (crossPartyRatio === 0 && attendees.length >= 8) {
      tilt = 'fullOneParty';
    }
  }
  if (attendees.length >= 20) {
    tilt = 'megaCeremony';
    CY._ty3._personaDamp = 0.8;
  }
  
  // 触发清议事件 (fullOneParty 时)
  if (tilt === 'fullOneParty') {
    _ty3_v15_pushClearOpinionEvent(opposing, GM.turn + 3);
  }
  
  // 后果 1·漏召大臣 (prestige 加权·v2.8 修·affinity 是 number 非 object)
  const missedRequired = _ty3_v15_findMissedRequired(attendees, topic, scenario);
  for (const ch of missedRequired) {
    const multiplier = ch.prestige >= 80 ? 2.0 :
                       ch.prestige >= 60 ? 1.5 :
                       ch.prestige >= 40 ? 1.0 : 0.5;
    ch.loyalty = Math.max(0, (ch.loyalty || 50) - 3 * multiplier);
    // v2.8 修·affinity 是 number 单值·禁 .toEmperor 嵌套
    ch.affinity = Math.max(0, (ch.affinity || 50) - 3 * multiplier * 0.6);
    ch._missedCallsCount = (ch._missedCallsCount || 0) + 1;
    if (ch._missedCallsCount >= 2) _ty3_v15_addSickLeaveEvent(ch, GM.turn + 2);
    if (ch._missedCallsCount >= 4) _ty3_v15_addResignMemorial(ch, GM.turn + 3);
  }
  
  return { tilt, crossPartyRatio, missedHighRank: missedRequired.map(c => c.name), attendeeCount: attendees.length };
}
```

**v2.8 新·5 `_ty3_v15_*` helper spec** (全新建·sprint 实施)·

```js
// 1·按党派统计 attendees·返 Map<partyName, count>
function _ty3_v15_countByParty(attendees) {
  const m = new Map();
  attendees.forEach(name => {
    const ch = findCharByName(name);
    const party = ch?.party || '中立';
    m.set(party, (m.get(party) || 0) + 1);
  });
  return m;
}

// 2·找漏召的 required attendees (scenario.tinyi.convening.requiredCallList 内·attendees 没的)
function _ty3_v15_findMissedRequired(attendees, topic, scenario) {
  const conv = _ty3_getConveningConfig(scenario);  // §5.4.6 helper
  const required = (conv.requiredCallList || []).slice();
  const topicSpecific = (conv.topicSpecificRequired || {})[topic] || [];
  const fullRequired = Array.from(new Set([...required, ...topicSpecific]));
  return fullRequired
    .map(roleName => _ty3_findByRole(roleName)[0])  // 取该 role 的首位
    .filter(ch => ch && !attendees.includes(ch.name));
}

// 3·入病假队 (per char·expireTurn 后清除)
function _ty3_v15_addSickLeaveEvent(ch, expireTurn) {
  GM._pendingSickLeaveEvents = GM._pendingSickLeaveEvents || [];
  GM._pendingSickLeaveEvents.push({ name: ch.name, fromTurn: GM.turn, expireTurn });
  ch._sick = true;  // verify·跟 runtime _sick 字段对齐
}

// 4·入辞呈队
function _ty3_v15_addResignMemorial(ch, expireTurn) {
  GM._pendingResignMemorials = GM._pendingResignMemorials || [];
  GM._pendingResignMemorials.push({ name: ch.name, fromTurn: GM.turn, expireTurn, reason: '漏召累计 4 次' });
}

// 5·清议事件入队 (fullOneParty 触发·N turn 后激活)
function _ty3_v15_pushClearOpinionEvent(opposingParties, triggerTurn) {
  GM._pendingClearOpinionEvents = GM._pendingClearOpinionEvents || [];
  opposingParties.forEach(p => {
    GM._pendingClearOpinionEvents.push({
      party: p.name, fromTurn: GM.turn, triggerTurn,
      effect: '该党联名清议·prestige 集体 +2·tension +5'
    });
  });
}

// expose (Slice 0.5 块加)
window._ty3_v15_countByParty = _ty3_v15_countByParty;
window._ty3_v15_findMissedRequired = _ty3_v15_findMissedRequired;
window._ty3_v15_addSickLeaveEvent = _ty3_v15_addSickLeaveEvent;
window._ty3_v15_addResignMemorial = _ty3_v15_addResignMemorial;
window._ty3_v15_pushClearOpinionEvent = _ty3_v15_pushClearOpinionEvent;
```

5 helper 工时 ~0.15d (Slice 2.5 子任务加入)。

**5 后果**·

```
balanced       crossPartyRatio > 0.6·朝中觉公允·民意度 +5
oneParty       crossPartyRatio < 0.2·反方 tension +3·成员 loyalty -2
fullOneParty   crossPartyRatio = 0 + N≥8·反方 tension +5·清议事件 3 turn 后
balanced (平衡) 3党各1-3人·总≤9·各党 affinity +1·民意度 +5
megaCeremony   N≥20·personaDamp 0.8·stamina -2·duration ×1.5
```

#### 5.4.4·4 召集策略

```
1·标准九卿  ⚖️  阁臣 2-3 + 六部 6 + 都察院 1·~9 人·平衡公允
2·专家小组  📊  按 tag 选 4-5·技术性议题·缺政治平衡
3·派系大会战 🔥  全一党 + 反方少数 2-3·~10-15·决议必过·反方记仇
4·大廷议    👥  全员 ~30+·仪式感最强·persona damping
```

#### 5.4.5·AI 推荐·27 tag 映射 (v1.4 扩 11)

```js
const TAG_TO_RECOMMEND = {
  // 财政 5
  'finance':            ['户部尚书', '户部左侍郎', '兵部尚书'],
  'reward':             ['吏部尚书', '户部尚书', '都察院'],
  'land-tax':           ['户部尚书', '户部各司', '布政使', '都察院'],
  'currency':           ['户部尚书', '工部尚书', '通政使', '宝泉局'],
  'canal-transport':    ['户部尚书', '工部尚书', '漕运总督', '巡漕御史'],
  // 军事 5
  'military-command':   ['兵部尚书', '兵部左侍郎', '督师', '边帅', '戎政尚书'],
  'border-affairs':     ['兵部尚书', '通政使', '边镇巡抚', '兵部右侍郎'],
  'coastal-defense':    ['兵部尚书', '水师提督', '沿海巡抚', '通政使'],
  'northern-defense':   ['兵部尚书', '督师', '兵备道', '北直巡抚'],
  'regicide-pursuit':   ['都察院都御史', '刑部尚书', '大理寺卿', '锦衣卫指挥', '北镇抚司'],
  // 人事 3
  'personnel':          ['吏部尚书', '吏部左侍郎', '首辅', '吏部考功郎'],
  'official-selection': ['吏部尚书', '都察院', '阁臣', '吏部考功郎'],
  'inspection':         ['都察院', '巡按御史', '六科给事中', '通政使'],
  // 法律 3
  'execution':          ['都察院都御史', '刑部尚书', '大理寺卿'],
  'penal-harsh':        ['刑部尚书', '大理寺卿', '都察院'],
  'law-reform':         ['刑部尚书', '大理寺卿', '都察院左都御史', '刑科给事中'],
  // 礼制 5
  'succession':         ['首辅', '次辅', '礼部尚书', '宗人府宗令', '太常寺卿'],
  'ritual':             ['礼部尚书', '太常寺卿', '钦天监'],
  'ritual-major':       ['礼部尚书', '太常寺卿', '宗人府宗令', '首辅', '翰林学士'],
  'etiquette':          ['礼部尚书', '太常寺卿', '通政使'],
  'imperial-lecture':   ['翰林学士', '礼部尚书', '大学士', '国子监祭酒'],
  // 天文 2
  'prophecy':           ['礼部尚书', '钦天监', '太医院', '翰林学士'],
  'calendar':           ['礼部尚书', '钦天监', '翰林学士', '司天监'],
  // 工程 1
  'river-works':        ['工部尚书', '户部尚书', '河道总督', '都水监'],
  // 外交 2
  'foreign-policy':     ['礼部尚书', '兵部尚书', '通政使', '理藩院', '会同馆'],
  'relief':             ['户部尚书', '工部尚书', '都察院', '巡抚', '布政使']
};
```

**四步推荐** (v2.2 caption 修)·

```js
function _ty3_recommendAttendees(topic, tags) {
  const recommended = new Set();
  // 第 1 步·必召 (阁臣等·复用层 1 + 层 4)
  for (const ch of _ty3_findByRole('首辅', '次辅', '阁臣'))
    if (_ty3_calcEligibility(ch).eligible) recommended.add(ch.name);
  // 第 2 步·按 tag 推荐
  for (const tag of tags) for (const role of (TAG_TO_RECOMMEND[tag] || []))
    for (const ch of _ty3_findByRole(role))
      if (_ty3_calcEligibility(ch).eligible) recommended.add(ch.name);
  // 第 3 步·党派均衡 (复用 v3 helper)
  for (const party of scenarioParties) {
    if (Array.from(recommended).filter(n => CHARS[n].party === party.name).length === 0) {
      const leader = _ty3_getPartyLeader(party.name);
      if (leader && _ty3_calcEligibility(leader).eligible) recommended.add(leader.name);
    }
  }
  // 第 4 步·prestige 补全到 8+
  const allEligible = GM.chars.filter(ch => _ty3_calcEligibility(ch).eligible);
  for (const ch of allEligible.sort((a, b) => (b.prestige || 50) - (a.prestige || 50))) {
    if (recommended.size >= 8) break;
    recommended.add(ch.name);
  }
  return Array.from(recommended);
}
```

#### 5.4.6·朝代差异化·明 / 宋 / 唐 (剧本配·v2.7 注·5 剧本全 0 hit·要新建)

**v2.7 关键**·六轮 audit verified·当前 5 剧本 `scenario.tinyi.convening` 全 undefined·Slice 2.5.5 实施时·

```js
// 1·default fallback·若 scenario.tinyi.convening 缺·用 hardcoded 明朝模板
function _ty3_getConveningConfig(scenario) {
  return scenario?.tinyi?.convening || DYNASTY_CONVENING_DEFAULTS[scenario.dynasty] || DYNASTY_CONVENING_DEFAULTS['明'];
}

// 2·5 剧本写入 tinyi config (按 dynasty 选 template)·
//    天启 / 崇祯 / 挽天倾·明
//    绍宋·宋
//    111·按其 dynasty 字段 (可能晋 / 别)
```


```json
// 天启七年·九月（官方）.json
{
  "tinyi": {
    "convening": {
      "requiredCallList": ["首辅", "次辅", "吏部尚书", "户部尚书", "礼部尚书",
                            "兵部尚书", "刑部尚书", "工部尚书", "都察院左都御史"],
      "topicSpecificRequired": {
        "succession":         ["首辅", "次辅", "礼部尚书", "宗人府宗令"],
        "regicide-pursuit":   ["都察院左都御史", "刑部尚书", "锦衣卫指挥"],
        "military-command":   ["兵部尚书", "兵部右侍郎", "戎政尚书"],
        "finance":            ["户部尚书", "户部左侍郎"]
      },
      "topicSpecificForbidden": {
        "succession":         ["外戚", "内监"],
        "regicide-pursuit":   ["阉党头目"]
      },
      "maxAttendees": 30,
      "minAttendees": 5,
      "maxFrequencyPerMonth": 2
    },
    "taboos": {
      "guosang": {
        "forbidActions": ["廷杖", "革职", "削籍"],
        "muteCeremony": true,
        "atmosphereOverride": "grave"
      },
      "zaiyi": {
        "mandatoryAppend": "罪己",
        "playerAutoFromBias": -10,
        "yanguanAutoUrge": true
      },
      "junzheng": {
        "forbidActions": ["休假", "致仕"],
        "mandatoryAttendees": ["兵部尚书", "戎政尚书", "督师"],
        "urgentMode": true
      }
    },
    "populationConfidenceInit": -20
  }
}
```

宋朝 (绍宋)·

```json
{
  "tinyi": {
    "convening": {
      "requiredCallList": ["左相", "右相", "枢密使", "知枢密院事"],
      "maxAttendees": 20,
      "minAttendees": 3,
      "maxFrequencyPerMonth": 4
    }
  }
}
```

唐朝·

```json
{
  "tinyi": {
    "convening": {
      "requiredCallList": ["中书令", "门下侍中", "尚书令", "左仆射", "右仆射"],
      "maxAttendees": 25,
      "minAttendees": 4,
      "maxFrequencyPerMonth": 3
    }
  }
}
```

#### 5.4.7·频率限制 + 民意度初始

```js
const DYNASTY_POPULATION_CONFIDENCE_INIT = {
  '明': 0, '宋': 0, '唐': 0, '元': -10, '清': -5,
  '太祖建国':  +20, '盛世': +10, '中兴': 0, '末世': -20, '危亡': -40
};
// v2.2 补·数据源·
const dynastyInit = DYNASTY_POPULATION_CONFIDENCE_INIT[scenario.dynasty] || 0;
const periodInit  = DYNASTY_POPULATION_CONFIDENCE_INIT[scenario.tinyi?.period]
                    ?? scenario.tinyi?.populationConfidenceInit
                    ?? 0;
const customInit  = scenario.tinyi?.populationConfidenceCustomInit || 0;
GM._convening_民意度 = clamp(-100, 100, dynastyInit + periodInit + customInit);
```

频率·明朝 maxFreq=2/月·过则言官弹劾·下次 attendees -3。

#### 5.4.8·民意度·5 档 + dynasty decay (v1.4 调小)

```js
// 每次召集 score
const score = (balance - 0.5) * 10;  // -5 ~ +5
GM._convening_民意度 = clamp(-100, 100, current + score);

// dynasty + daysPerTurn decay (v2.2 月长精度修·v3 helper 复用)
const baseRate = { '明':0.88, '宋':0.94, '唐':0.91, '元':0.85, '清':0.90 }[dynasty];
const monthsPerTurn = _getDaysPerTurn() / 30.4375;  // v2.2·365.25/12 平均月长·避 v2.1 整数误差
GM._convening_民意度 *= Math.pow(baseRate, monthsPerTurn);
```

5 档影响·

```
80+   极公允  loyalty +0.5/月·常朝 baseline +0.5
40+   公允    无
-40+  兼听    无
-80~  偏私    弱党 loyalty -0.5/月·常朝 baseline -0.5
-80-  独断    弱党 loyalty -1/月·NPC 自发行动 +0.5
```

#### 5.4.9·言官离心·4 阈值 + buffer (v1.4 调密)

```js
// 算分
召集言官         -3
0 言官 (N≥5)      +5
反弹言官           +5
punish 言官 intent +8
decay 5%/月
```

4 阈值 + buffer 2-3 turn·

```
20+   清议疏  (delay 2 turn)
40+   罢朝·常朝 -2 (delay 2 turn)
60+   乞罢·5+ 言官联名 (delay 3 turn)
80+   决裂·策划弹劾 (delay 3 turn)
```

#### 5.4.10·mentor + 召集联动 (v1.4 新)

```js
function _ty3_suggestMenteesOf(attendees) {
  const suggestions = [];
  for (const name of attendees) {
    const mentees = GM._mentorIndex?.mentor?.[name] || [];
    for (const menteeName of mentees) {
      if (attendees.includes(menteeName)) continue;
      const mentee = findCharByName(menteeName);
      if (!mentee || !_isEligible(mentee, scenario)) continue;
      suggestions.push({ mentee: menteeName, mentor: name });
    }
  }
  return suggestions;
}
```

UI 显示·`韩爌 → 建议同召·钱龙锡 / 何如宠 / 吴宗达`·[+一并召门生]·一键加召·加召的 mentee **不入"漏召"统计** (mentor 带的可选附议)·clientelism mode 触发率 +20%。

**v2.2 补·clientelism vs 8D dims 优先级** (Slice 10b 实施时·解 Slice 3 ↔ Slice 10 冲突)·

```
NPC 决策路径·
1. dims.loyalty > 80 + 主君直接表态  → 跟主君 (绝对优先·"忠不可贰")
2. dims.boldness > 0.8 + dims.honor > 0.7 → 独立站位 (傲性·拒附议·哪怕 mentor)
3. 否则·mentor 极支/极反 + NPC 自己 dims 同向 → 70% 附议 mentor (clientelism 触发)
4. 否则·mentor 极支/极反 + NPC 自己 dims 反向 → 沉默 (mode 'pivot' 或 'soften')·不反转 stance
5. 否则·按 dims 自己算 stance
```

**意图**·mentor 关系不应能强行反转 NPC 自己的 dims-driven stance·只能 amplify (同向时) 或 silence (反向时)。


#### 5.4.11·mentor 字段补具体清单 (Slice 10 实施直接看)

**天启七年·30 关系**·

```json
// 东林党 mentor chain
{ "name": "赵南星",   "mentees": ["高攀龙", "杨涟", "左光斗", "魏大中", "钱龙锡"] }
{ "name": "韩爌",     "mentees": ["钱龙锡", "何如宠", "吴宗达", "周道登"] }
{ "name": "叶向高",   "mentees": ["朱国祯", "朱延禧", "韩爌"] }
{ "name": "顾宪成",   "mentees": ["高攀龙", "赵南星", "钱一本"] }

// 阉党 mentor chain
{ "name": "魏忠贤",   "mentees": ["田尔耕", "许显纯", "崔呈秀", "周应秋"] }
{ "name": "顾秉谦",   "mentees": ["薛三才", "孙杰"] }

// 中立 mentor chain
{ "name": "孙承宗",   "mentees": ["袁崇焕", "祖大寿", "毛文龙"] }
{ "name": "毕自严",   "mentees": ["李逢申"] }

// 言官 mentor chain
{ "name": "赵南星",   "mentees": ["杨涟", "左光斗", "周朝瑞", "袁化中"] }
```

**绍宋·15 关系**·

```json
// 主战
{ "name": "李纲",  "mentees": ["宗泽", "张浚", "胡铨"] }
{ "name": "宗泽",  "mentees": ["岳飞", "刘锜", "韩世忠"] }
// 主和
{ "name": "黄潜善", "mentees": ["汪伯彦", "范宗尹"] }
{ "name": "秦桧",   "mentees": [] }  // 绍宋初未崛起·暂空
// 中立
{ "name": "李回",   "mentees": ["叶梦得"] }
```

工具脚本 (v2.5 修·全新建·doc 原写"复用"措辞错)·**新建** `web/tools/fill-tianqi-mentors.js` (模仿 `fill-shaosong-traits.js` paradigm·~80 行·grep verified `fill-shaosong-traits.js` 存在·`fill-tianqi-mentors.js` 不存在) + **新建** `web/scripts/smoke-mentor-coverage.js` (验天启≥30·绍宋≥15)。Slice 10a.1.5 子任务 +0.1d。

**`_ty3_buildMentorIndex` shape** (v2.2 补 spec)·

```js
function _ty3_buildMentorIndex(chars) {
  const idx = { mentor: {}, mentee: {} };
  for (const ch of chars) {
    if (!Array.isArray(ch.mentees) || ch.mentees.length === 0) continue;
    idx.mentor[ch.name] = ch.mentees.slice();
    for (const m of ch.mentees) {
      idx.mentee[m] = ch.name;  // 一 mentee 只一 mentor·后者覆盖前者
    }
  }
  return idx;
}
// 输出·{ mentor: { '韩爌': ['钱龙锡', '何如宠', ...], ... },
//        mentee: { '钱龙锡': '韩爌', '何如宠': '韩爌', ... } }
// 启动 / 剧本加载 / 人物增删时调用·缓存到 GM._mentorIndex
```

#### 5.4.12·NPC 主动发议题 (v1.4 新)

廷议触发 3 路径·

```
1. 玩家主动召            (已有)
2. NPC 上书请议           (新加)
3. 剧情 escalate         (已有)
```

NPC 上书条件 (每回合 endturn 检查)·

```js
言官倾向· class=='kdao' + 言官离心 > 10 + 最近重大事件
阁臣倾向· rank<=4 + prestige > 70 + 边事紧急
党魁倾向· is 党魁 + 党争 tension > 5
```

urgency 算法 (见 §5.4.13)·入 `GM._pendingTinyiTopics` (v3 已有字段!) + `GM._pendingMemorials.push({ type: 'request_tinyi', ... })`

玩家面·下回合开局·`[开廷议] [留中] [批驳]` 3 选项。

#### 5.4.13·NPC urgency 算法 (v2.8 修·dims helper + 阈值改 clamp 0-15)

```js
function _calcUrgency(proposer, type) {
  let urgency = 5;
  // v2.8 修·用 _ty3_getDims helper 一致·非裸 dims 字段
  const dims = (typeof _ty3_getDims === 'function') ? _ty3_getDims(proposer) : (proposer.aggregateDims || {});
  if (type === 'request_tinyi_yanguan') urgency += 2;
  if (type === 'request_tinyi_party')   urgency += 3;
  if (type === 'request_tinyi_inge')    urgency += 4;
  if ((dims.honor || 0) >= 0.7)         urgency += 1;
  if ((dims.boldness || 0) >= 0.7)      urgency += 1;
  if (proposer.prestige >= 80)          urgency += 1;
  if (proposer.loyalty < 30)            urgency -= 2;
  if (GM._convening_言官离心 > 30)      urgency += 2;
  if (GM._convening_民意度 < -50)       urgency += 2;
  if (GM._urgentBorderAffairs)          urgency += 3;     // §6 v2.8 新加 schema
  const retryCount = proposer._tinyiRetry || 0;
  if (retryCount > 0)                   urgency += retryCount;
  return clamp(0, 15, urgency);   // v2.8 改·clamp 0-15·非 0-10
}
```

**v2.8 阈值改** (原"10 伏阙" 过松·实测任 4-5 条件累加都到 10)·

```
0-4 不议·5-9 正常·10-12 急 (单独廷议召集)
13+ + 必 type === 'request_tinyi_inge' + prestige >= 80 → 伏阙急谏 (走 martyr 路径)
```

**v2.8 GM._urgentBorderAffairs spec** (新加·§6 schema 加 + event hook 设)·

```js
// §6 schema 加
GM._urgentBorderAffairs  // boolean·default false
// 设·event "边事告急" / "辽东陷" / "蒙古入塞" 等触发时 set true·1 turn 后 auto clear
// 用·§5.4.13 urgency +3·Slice 2.5 漏召加重
```

#### 5.4.14·NPC 主动议题过期处理

```js
function _ty3_checkExpiredTopics() {
  for (let i = GM._pendingTinyiTopics.length - 1; i >= 0; i--) {
    const t = GM._pendingTinyiTopics[i];
    if (GM.turn >= t.expiresAt) {
      const proposer = findCharByName(t.proposer);
      const traits = proposer?.traitIds || [];
      // v2.8 改·trait 名按 runtime SI naming (非中文拼音前缀)
      if (traits.includes('honest') || traits.includes('just') || traits.includes('zealous')) {
        // 直谏 / 秉公 / 狂热·再提 (urgency +2)
        GM._pendingTinyiTopics.push({ ...t, urgency: t.urgency + 2, retry: (t.retry || 0) + 1 });
      } else if (traits.includes('fickle') || traits.includes('craven') || traits.includes('deceitful')) {
        // 善变 / 怯懦 / 口蜜·撤回 (loyalty -1)
        proposer.loyalty -= 1;
      } else {
        // 默认·留中 (qijuHistory)
        GM.qijuHistory.push({ ... });
      }
      GM._pendingTinyiTopics.splice(i, 1);
    }
  }
}
```

retry max 3·过则永久不再提·loyalty -2。

#### 5.4.15·跨 slice schema fence (v2.2 新·解 v2.1 audit hard bug #6)

集中列召集制 + 反弹的所有 cross-slice 字段·写/读责任 slice 锁定。**任 slice 重命名字段必动此 fence + 通知关联 slice**。

| 字段 | 类型 | write slice | read slice | 备注 |
|---|---|---|---|---|
| `CY._ty3.conveningPolitics` | `{ tilt, crossPartyRatio, missedHighRank, attendeeCount }` | Slice 2.5 | Slice 8 | tilt ∈ `'balanced'\|'oneParty'\|'fullOneParty'\|'megaCeremony'` |
| `CY._ty3._personaDamp` | number 0-1 | Slice 2.5 (megaCeremony 时) | v3 _ty3_phase2_run | 0.8 = 大廷议·prompt persona 弱化 |
| `GM._convening_民意度` | number -100..+100 | Slice 2.5 + Slice 0.5 decay | Slice 4 prompt + Slice 8 + UI 立场板 | dynastyInit + periodInit + customInit (§5.4.7) |
| `GM._convening_言官离心` | number 0..100 | Slice 2.5 + Slice 0.5 decay | Slice 11 + UI 警示条 | 阈值 20/40/60/80 触发 buffer 事件 |
| `GM._mentorIndex` | `{ mentor: Record<name, name[]>, mentee: Record<name, name> }` | Slice 10a (启动 + 剧本加载) | Slice 2.5 (lazy guard) + Slice 10b (clientelism) | shape §5.4.11 |
| `GM._pendingMartyrEvents` | `Array<{ npc: string, turn: number, reason: string }>` | Slice 8 | endturn pipeline event runner | Slice 11 smoke 验消费 |
| `GM._pendingTinyiTopics` | `Array<{ topic, proposer, tags, urgency, turn }>` | Slice 2.5.9 (NPC 主动发) | 议前预审 modal | memorial.type='request_tinyi' 同写 |
| `ch._missedCallsCount` | number | Slice 2.5 (漏召 +1) | Slice 8 hint·Slice 2.5 阈值 (>=2 病假·>=4 辞呈) | char 字段 |
| `ch.mentees` | string[] | Slice 10a 数据手补 + 剧本 JSON | Slice 10a `_ty3_buildMentorIndex` | char 字段 |

**变更纪律**·
- 改字段名 / 类型 → 必同改本表 + grep 全 read slice 验证
- 加新跨 slice 字段 → 必加本表
- Slice 0.5 DoD #4 验证本表 6 字段在 §5.5.x schema fence 全列

---

### 5.5·mode rule engine (Slice 6)

#### 5.5.1·25 RULES (8D dims × topic-tag → mode)

```js
const RULES = [
  // 高 honor·廷议特化
  { if: dims.honor >= 0.7 && tags.includes('etiquette'),     then: 'rebut',   force: true },
  { if: dims.honor >= 0.7 && tags.includes('regicide-pursuit'), then: 'confront', force: true },
  // 高 compassion·缓冲
  { if: dims.compassion >= 0.7 && currentMode === 'rebut' && partyMembership < 3, then: 'soften' },
  { if: dims.compassion >= 0.7 && tags.includes('penal-harsh'), then: 'soften', force: true },
  // 高 boldness·激进
  { if: dims.boldness >= 0.7 && tags.includes('regicide-pursuit'), then: 'martyr', force: true },
  { if: dims.boldness >= 0.7 && currentMode === 'soften', then: 'rebut', force: true },
  // 高 rationality·数据流
  { if: dims.rationality >= 0.7 && tags.includes('finance'), then: 'augment' },
  { if: dims.rationality >= 0.7 && tags.includes('military-command'), then: 'cite_classic' },
  // 高 greed·随大流
  { if: dims.greed >= 0.7 && tags.includes('reward'), then: 'second' },
  { if: dims.greed >= 0.7 && partyMembership >= 3, then: 'second' },
  // 高 cunning·灵活
  { if: dims.cunning >= 0.7 && currentMode === 'lead', then: 'pivot' },
  { if: dims.cunning >= 0.7 && tags.includes('succession'), then: 'pivot', force: true },
  // 高 loyalty·门生附议 (clientelism 兜底)
  { if: dims.loyalty >= 0.8 && ch._mentorInAttendees, then: 'clientelism', force: true },
  // 高 confucianism·经典派
  { if: dims.confucianism >= 0.7 && tags.includes('ritual'), then: 'cite_classic' },
  { if: dims.confucianism >= 0.7 && tags.includes('imperial-lecture'), then: 'cite_classic', force: true },
  // 低 honor + 高 cunning·阴险
  { if: dims.honor <= 0.3 && dims.cunning >= 0.6, then: 'soften' },
  // 言官特化
  { if: ch.class === 'kdao' && tags.includes('regicide-pursuit'), then: 'martyr', force: true },
  { if: ch.class === 'kdao' && dims.honor >= 0.6, then: 'martyr' },
  // 阉党特化
  { if: ch.party === '阉党' && tags.includes('regicide-pursuit'), then: 'rebut', force: true },
  { if: ch.party === '阉党' && currentMode === 'lead', then: 'cite_classic' },
  // 内阁阁臣特化
  { if: ch.officialTitle?.match(/首辅|次辅/) && tags.includes('succession'), then: 'pivot', force: true },
  { if: ch.officialTitle?.match(/首辅/) && currentMode === 'rebut', then: 'soften' },
  // 中立 / 折中党
  { if: ch.party === '中立' && partyTensionMax > 5, then: 'pivot', force: true },
  { if: ch.party === '中立' && currentMode === 'confront', then: 'soften', force: true },
  // anti-塌缩 guard
  { if: sameModeCount >= 3 && currentMode === 'rebut', then: 'augment' }
];
```

#### 5.5.2·trait bias (v2.8 全写 ~50 trait·覆盖 runtime fill-shaosong-traits.js)

**v2.8 catastrophic 修**·doc v1-v2.7 用 `trait_xianliang/chunzheng/yaohua/xueshi` 等 14 个中文拼音前缀 trait·**runtime 0 hit**·实际 runtime fill-shaosong-traits.js L24-103 用英文 SI naming convention (P 社风)·~50 trait·v2.8 全写覆盖。

**完整 ~50 trait BIAS table** (按 runtime naming·跟 fill-shaosong-traits.js TRAIT_KEYWORDS 1:1 对齐)·

```js
const TRAIT_TO_MODE_BIAS = {
  // ── personality (36 pair·18 组对立·按廷议 mode 分布) ──
  // brave / craven (勇 / 怯)
  'brave':       { mode: 'confront',    weight: +0.4 },   // 勇敢 → 敢直谏
  'craven':      { mode: 'soften',      weight: +0.3 },   // 胆小 → 避锋芒
  // calm / wrathful (静 / 怒)
  'calm':        { mode: 'cite_classic',weight: +0.3 },   // 沉稳 → 理性援经
  'wrathful':    { mode: 'confront',    weight: +0.4 },   // 暴怒 → 激切对质
  // chaste / lustful (洁 / 欲)
  'chaste':      { mode: 'cite_classic',weight: +0.3 },   // 守贞 → 引经守节
  'lustful':     { mode: 'pivot',       weight: +0.2 },   // 好色 → 机变
  // content / ambitious (足 / 野)
  'content':     { mode: 'second',      weight: +0.3 },   // 安分 → 随大流
  'ambitious':   { mode: 'lead',        weight: +0.4 },   // 野心 → 主奏
  // diligent / lazy (勤 / 懒)
  'diligent':    { mode: 'augment',     weight: +0.3 },   // 勤政 → 补具体
  'lazy':        { mode: 'second',      weight: +0.3 },   // 懒 → 附议
  // honest / deceitful (诚 / 诈)
  'honest':      { mode: 'martyr',      weight: +0.4 },   // 直谏 → 死谏
  'deceitful':   { mode: 'pivot',       weight: +0.4 },   // 口蜜腹剑 → 机变
  // generous / greedy (慷 / 贪)
  'generous':    { mode: 'soften',      weight: +0.2 },   // 慷慨 → 调和
  'greedy':      { mode: 'second',      weight: +0.4 },   // 贪图 → 谀附
  // gregarious / shy (群 / 孤)
  'gregarious':  { mode: 'clientelism', weight: +0.3 },   // 善交 → 师生网络
  'shy':         { mode: 'pivot',       weight: +0.2 },   // 沉默 → 折中
  // humble / arrogant (谦 / 傲)
  'humble':      { mode: 'soften',      weight: +0.3 },   // 谦逊 → 缓和
  'arrogant':    { mode: 'rebut',       weight: +0.4 },   // 傲慢 → 驳议
  // just / arbitrary (正 / 专)
  'just':        { mode: 'martyr',      weight: +0.5 },   // 秉公 → 死谏 (核心言官)
  'arbitrary':   { mode: 'rebut',       weight: +0.3 },   // 专断 → 驳
  // patient / impatient (耐 / 急)
  'patient':     { mode: 'cite_classic',weight: +0.2 },   // 隐忍 → 引经
  'impatient':   { mode: 'confront',    weight: +0.3 },   // 急切 → 点名
  // temperate / gluttonous (节 / 嗜)
  'temperate':   { mode: 'cite_classic',weight: +0.2 },   // 节俭 → 引古制
  'gluttonous':  { mode: 'second',      weight: +0.2 },   // 嗜食 → 附议
  // trusting / paranoid (信 / 疑)
  'trusting':    { mode: 'second',      weight: +0.3 },   // 信人 → 附议
  'paranoid':    { mode: 'rebut',       weight: +0.4 },   // 多疑 → 驳
  // zealous / cynical (狂 / 冷)
  'zealous':     { mode: 'martyr',      weight: +0.5 },   // 狂热 → 殉道
  'cynical':     { mode: 'soften',      weight: +0.2 },   // 玩世 → 缓和
  // forgiving / vengeful (恕 / 仇)
  'forgiving':   { mode: 'soften',      weight: +0.3 },   // 宽恕 → 缓
  'vengeful':    { mode: 'confront',    weight: +0.4 },   // 记仇 → 点名
  // compassionate / callous (仁 / 酷)
  'compassionate':{mode: 'soften',      weight: +0.4 },   // 仁善 → 缓和
  'callous':     { mode: 'rebut',       weight: +0.3 },   // 冷酷 → 驳
  // sadistic (虐·无对立 pair)
  'sadistic':    { mode: 'rebut',       weight: +0.4 },   // 残忍 → 强硬驳
  // stubborn / fickle / eccentric (顽 / 变 / 异)
  'stubborn':    { mode: 'rebut',       weight: +0.3 },   // 固执 → 驳
  'fickle':      { mode: 'pivot',       weight: +0.5 },   // 善变 → 折中
  'eccentric':   { mode: 'pivot',       weight: +0.3 },   // 古怪 → 另案

  // ── lifestyle / role (9) ──
  'scholar':         { mode: 'cite_classic', weight: +0.5 },   // 学问 → 援经引典 (核心)
  'theologian':      { mode: 'cite_classic', weight: +0.4 },   // 神学 → 引经
  'schemer':         { mode: 'pivot',        weight: +0.4 },   // 阴谋 → 机变
  'diplomat_ls':     { mode: 'soften',       weight: +0.3 },   // 外交 → 缓和
  'administrator_ls':{ mode: 'augment',      weight: +0.3 },   // 治政 → 补具体
  'strategist':      { mode: 'augment',      weight: +0.3 },   // 兵略 → 具体方略
  'family_first':    { mode: 'clientelism',  weight: +0.4 },   // 顾家 → 师生人情
  'gallant':         { mode: 'confront',     weight: +0.4 },   // 侠义 → 义气对质
  'august':          { mode: 'lead',         weight: +0.4 },   // 威望 → 主奏

  // ── commander (7) ──
  'aggressive_attacker': { mode: 'confront', weight: +0.4 },   // 进攻 → 点名
  'unyielding_defender': { mode: 'rebut',    weight: +0.3 },   // 死守 → 驳
  'cautious_leader':     { mode: 'soften',   weight: +0.3 },   // 谨慎 → 缓
  'reckless':            { mode: 'confront', weight: +0.3 },   // 鲁莽 → 点名
  'flexible_leader':     { mode: 'pivot',    weight: +0.3 },   // 灵活 → 折中
  'organizer':           { mode: 'augment',  weight: +0.3 },   // 组织 → 补具体
  'holy_warrior':        { mode: 'martyr',   weight: +0.5 },   // 殉道 → 死谏

  // ── 健康 / 特殊 (2·背景类·弱 bias) ──
  'scarred':         { mode: 'martyr',    weight: +0.2 },      // 受伤 → 悲愤死谏
  'depressed':       { mode: 'soften',    weight: +0.2 }       // 抑郁 → 弱
};
// 共 ~54 trait·完整覆盖 fill-shaosong-traits.js L24-103
```

**RULES 决定 base mode·trait 加 weight·最终按 weight max 选 mode**。例·

- NPC 含 `honest + just + zealous` (东林清流)·all bias martyr·必走 martyr mode
- NPC 含 `scholar + temperate` (学究)·bias cite_classic·必走 cite_classic mode
- NPC 含 `schemer + fickle + greedy` (奸佞)·bias pivot/second·必走 pivot

**注意** (v2.8)·
- BIAS table **可以扩**·若 fill-shaosong-traits.js 后续加新 trait·doc 同步加 BIAS entry (Slice 6 子任务加 verify)
- trait 没有 `_` 前缀·doc 全删 `trait_*` 命名·改用 runtime convention
- Slice 1 / 3 / 6 / §5.4.14 全要按本 table 改 trait 名 (v2.8 Edit 后续覆盖)

#### 5.5.3·emperor 发言 mode bias

```js
const EMPEROR_INTENT_BIAS = {
  'punish':    { npcModeBias: { martyr: +0.3 }, npcStanceBias: { oppose: +0.2 } },
  'praise':    { npcModeBias: { second: +0.4 }, npcStanceBias: { support: +0.3 } },
  'doubt':     { npcModeBias: { soften: +0.3 }, npcStanceBias: { neutral: +0.2 } },
  'arbitrate': { npcModeBias: { soften: +0.4 }, npcStanceBias: { neutral: +0.3 } }
};
```

emperor intent 持续 3 NPC 发言后失效 (decay)·emperor keyword (准/驳/留中等) **跳整个 stance 阶段直接判决**。

#### 5.5.4·anti-塌缩 4 guard

```
guard 1·同 mode ≥ 3·切到别的 (RULES 末尾)
guard 2·全员同 stance ≥ 4·强制注入 oppose
guard 3·confront cooldown·普通廷议 5 round 1 次·≥20 ×2·≥30 ×3
guard 4·martyr·一议最多 1 次
```

#### 5.5.5·tone modulation (v2.4 补 prompt injection spec)

5 class × tone 映射·**通过 prompt 段注入**·非 UI styling 非 mode 内置 (避 mode × class 30 变体爆炸)·

```js
function _ty3_buildToneHint(ch) {
  const cls = ch.class || _ty3_classOf(ch);
  const tone = {
    'geechen':  '庄重·官式书面·四字格 / 排比',
    'kdao':     '激切·短促·感叹号多·"伏望陛下察焉"',
    'wujiang':  '直白·口语化·避典故',
    'xunqi':    '谨慎·回避 politically charged·"臣不敢妄议"',
    'waixi':    '柔曲·避嫌·"臣外戚·所言难免有亲"'
  }[cls];
  return tone ? '\n  语气提示·' + tone : '';
}
// 注入·Slice 4 _ty2_genOneSpeech prompt build 内·Section A 之后·~30 token / NPC
// expose·window._ty3_buildToneHint = _ty3_buildToneHint (Slice 0.5 expose 块)
```

**Slice 6 DoD #4 改** (v2.4)·

```
tone modulation prompt 段注入·5 class × 1 sample 测·
  阁臣 NPC prompt 含 '庄重'·言官含 '激切'·武将含 '直白'·勋戚含 '谨慎'·外戚含 '柔曲'
  grep prompt log verify·5 hit / 5 class
```

#### 5.5.6·8D dims fallback B (无 traitIds 时·85% 精度)

```js
function _ty3_dimsFromKeywords(ch) {
  const text = (ch.personality || '') + (ch.desc || '');
  const dims = { honor: 0.5, compassion: 0.5, boldness: 0.5, rationality: 0.5,
                 greed: 0.5, cunning: 0.5, loyalty: 0.5, confucianism: 0.5 };
  
  if (/正直|忠贞|清廉|耿介/.test(text)) dims.honor += 0.3;
  if (/贪|私|曲|阿/.test(text))         dims.honor -= 0.3;
  if (/仁慈|爱民|宽厚/.test(text))     dims.compassion += 0.3;
  if (/严苛|苛察|残忍/.test(text))     dims.compassion -= 0.3;
  if (/敢|勇|刚|果/.test(text))         dims.boldness += 0.3;
  if (/谨|怯|畏|柔/.test(text))         dims.boldness -= 0.3;
  if (/智|谋|策|权/.test(text))         dims.rationality += 0.3;
  if (/愚|憨|直/.test(text))            dims.rationality -= 0.2;
  if (/贪|嗜利|奢|奉禄/.test(text))     dims.greed += 0.3;
  if (/廉|俭|淡泊/.test(text))          dims.greed -= 0.3;
  if (/阴|险|狡|诈/.test(text))         dims.cunning += 0.3;
  if (/朴|实|讷/.test(text))            dims.cunning -= 0.2;
  if (/忠|顺|敬/.test(text))            dims.loyalty += 0.2;
  if (/叛|背|怀/.test(text))            dims.loyalty -= 0.3;
  if (/儒|经|学|博/.test(text))         dims.confucianism += 0.3;
  if (/武|武勇|战/.test(text))          dims.confucianism -= 0.2;
  
  // class 加成
  if (ch.class === 'kdao')      dims.honor += 0.2, dims.boldness += 0.2;
  if (ch.class === 'eunuch')    dims.cunning += 0.2, dims.honor -= 0.2;
  if (ch.class === 'xunqi')     dims.greed += 0.1;
  if (ch.class === 'wujiang')   dims.boldness += 0.2, dims.confucianism -= 0.2;
  if (ch.class === 'qingliu')   dims.honor += 0.2, dims.confucianism += 0.2;
  
  for (const k in dims) dims[k] = clamp(0, 1, dims[k]);
  return dims;
}
```

---

### 5.6·廷议 vs 常朝 10 维度对照

| 维度 | 常朝 | 廷议 |
|---|---|---|
| 1. 触发 | 每回合开局自动 | 玩家手动 / NPC 主动 / 剧情 escalate (v1.4 新加 3 路径) |
| 2. 议题数 | N 议程 (5-15) | 1 议题 单点深辩 |
| 3. 时长 | 5-15 分 | 15-40 分 |
| 4. 节奏 | 快·议程逐条 | 慢·8 阶段 |
| 5. NPC 数 | 全员到场 | 玩家召 5-30 人·6 资格层筛 |
| 6. UI 主体 | 议程列表 + 4 按钮 | 三班 (stance·V 切 class) + 立场板 + 潮汐条 + 多阶段 modal |
| 7. 玩家角色 | 决策者 | 裁决者 + 调度者·廷杖 / 削籍 / 革职 |
| 8. 决策类型 | 11 种 | 14 种·廷推 / 钦定档位 / 用印 / 追责 |
| 9. 反弹机制 | 弱·morale 反应 | v3 cohesion / prestige / favor + v1.4 minority loyalty / 党争 / martyr / 追责 (共存折扣) |
| 10. 历史落地 | qijuHistory + edictTracker | + chronicleTracker (Slice 11 桥接) + recentChaoyi + 追责队列 + martyr 事件队列 + 民意度 + 言官离心 |

**B.1·总结**·

```
常朝 = 数量 (覆盖 5-15 议程·快速治理·低成本)
廷议 = 深度 (单议挖到党争 / 追责 / 反弹·高风险·政治冒险)
```

---

## §6·数据契约 / state schema

### 6.1·v3 已有 GM state (sprint 必复用·不重建)

```js
// 党派 + 威权
GM.parties[]              // 党派 (从 P.parties 按 sid 过滤·tm-patches.js L1435 init)
GM.unlockedRegalia[]      // 永久威权特权·跨场廷议保留 (Slice 11 smoke 必含)
GM.huangwei.index         // 皇威·0-100
GM.huangquan.index        // 皇权·0-100
GM.vars['皇权'].value     // 备用 path

// 廷议状态
GM._ccHeldItems[]         // 留中册 (议前预审"留中"写入)
GM._pendingTinyiTopics[]  // 待议册 (议前预审"明发"读·v1.4 NPC 主动议题 push 进同 list)
GM.recentChaoyi[]         // 短期记忆·cap 8 件 (v3 写)
GM.chaoyiChronicleTracks  // chaoyi chronicle tracks (v3 写·Slice 11 桥接到 _chronicleTracker)

// 跨议 (v2.6 修字段名)
GM._chronicleTracks[]     // 长期 chronicle·**复数** (v3 verified L3865)·_ty3_syncChaoyiChronicleTrack 已写
GM.qijuHistory[]          // 起居注 (v2/v3 共用)
GM.edictTracker[]         // 诏书追踪

// 会话状态 (每议清)
CY._ty3                   // 廷议会话 (替代 CY._ty2 v3 子集)
CY._ty3_archonGrade       // 当前档位 S/A/B/C/D
```

### 6.2·v1.4/v1.5 新加 GM state

> **v2.9 注·字段权威见 §5.4.15 schema fence**·本节为 GM state 历史 reference·若 §5.4.15 跟本节冲突·以 §5.4.15 为准。implementer 修字段名 / 类型时·必先改 §5.4.15·再 grep 同步本节。

```js
// 召集制 (Slice 2.5)
GM._convening_民意度      // -100 ~ +100·按 dynasty + daysPerTurn decay (5.4.8)
GM._convening_言官离心    // 0 ~ 100·4 阈值·2-3 turn buffer (5.4.9)
GM._tinyiCountByMonth     // 频率限制 (5.4.7)
GM._missedCallsCount      // 漏召计数 (per NPC, 累计阈值 2/4)

// 反弹后果 (Slice 8)
GM._pendingMartyrEvents[] // martyr 触发的死谏队列
GM._pendingClearOpinionEvents[]  // 清议事件 (fullOneParty 触发)
GM._pendingYanguanEvents[]  // 言官离心阈值跨阈触发 (buffer 后)
GM._pendingSickLeaveEvents[]  // 漏召累计 2 → 称病不朝
GM._pendingResignMemorials[]  // 漏召累计 4 → 上乞罢疏

// mentor 系统 (Slice 10)
GM._mentorIndex           // { mentor: { name: [mentees] }, mentee: { name: mentor } }

// archive (Slice 8·H archive hotkey)
GM._tinyiArchive[]        // cap 100 议
GM._tinyiDeepArchive[]    // 100+ 压缩存

// 玩家 preset (Slice 8.5)
P.userConveningPresets[]  // v2.9 改·**per-save 持久化** (P 字段·跟 save 走)·非 localStorage·切剧本/save 时各自独立

// 会话内 (CY._ty3 扩)
CY._ty3.conveningPolitics  // { tilt, crossPartyRatio, missedHighRank, summonedCrossParty, yanguanIncluded }
CY._ty3._stamina           // 大廷议 -2
CY._ty3._duration          // 大廷议 ×1.5
CY._ty3._personaDamp       // 大廷议 0.8
CY._ty3._confrontChain     // { active, currentRound, maxRound, A, B, unresolved, allowOneMoreRound, suspendedAt }
CY._ty3._stanceMap         // { name: stance }
CY._ty3._historicalStances // NPC 中途死亡的 stance 入此
CY._ty3._atmosphereOverride  // 'grave' 等 (NPC 死/灾异)
CY._ty3._lastEmperorIntent   // Slice 9 emperorCue
CY._ty3._lastEmperorKeyword
CY._ty3._readingState      // NPC 宣读 state (本期不实施·一句话摘要替代)
```

### 6.3·NPC 字段 (sprint 必读 / 写)

```js
{
  // 基础 (v3 已有)
  name, rank, officialTitle, party, class, mentor,
  loyalty, prestige, influence, alive,
  
  // 状态 (v3 已有·v2.6 字段名修)
  _imprisoned,     // v2.6 改·非 _inPrison (verified 44 hit vs 1 hit)·tm-wendui-prison.js 主用
  _exiled, _sick, _retired, _fled, _missing,
  _underInvestigation, _travelTo, _eta,
  _dingyou,        // v2.6 新建·runtime 0 hit·Slice 1 子任务建 (丁忧·守孝 27 月·儒家政治关键)
  
  // 廷议字段 (v2.6 修·affinity 单值·跟 v2.3 Slice 8 patch 一致·禁 .toEmperor 嵌套)
  affinity: 50,                      // **number 单值·非 object**·对皇帝 affinity·v3 phase6/7 + Slice 8 反弹写
                                     // implementer 注意·禁 `affinity = affinity || {}; affinity.toEmperor = ...`·这会撞 v2.3 修过的 bug
  cohesion: 50,                      // v3 archon 副作用调
  favor: 0,                          // v3 archon 副作用调
  
  // 8D dims (Slice 1 补 + Slice 3 fallback)
  traitIds: [],                      // Slice 1 补 ~123 chars
  aggregateDims: {                   // 8D·honor/compassion/boldness/rationality/greed/cunning/loyalty/confucianism
    honor: 0.8, compassion: 0.6, ...
  },
  
  // recognitionState + arc (Slice 4 注入 prompt)
  recognitionState: { ... },
  arc: { ... },
  
  // v1.4 状态
  _missedCallsCount: 0,              // 漏召累计
  _tinyiRetry: 0                     // NPC 提议 retry 计数
}
```

### 6.4·剧本字段 (sprint 必为新剧本配)

```json
{
  "dynasty": "明",
  "period": "末世",
  "tinyi": {
    "convening": {
      "requiredCallList": [...],
      "topicSpecificRequired": { ... },
      "topicSpecificForbidden": { ... },
      "maxAttendees": 30,
      "minAttendees": 5,
      "maxFrequencyPerMonth": 2
    },
    "taboos": {
      "guosang": { forbidActions, muteCeremony, atmosphereOverride },
      "zaiyi": { mandatoryAppend, playerAutoFromBias, yanguanAutoUrge },
      "junzheng": { forbidActions, mandatoryAttendees, urgentMode }
    },
    "populationConfidenceInit": -20
  }
}
```

新剧本支持·~3h (5.4.6 + NPC 字段 + mentor + smoke)

### 6.5·v2 → v3 升级路径 (backwards compat)

```js
function loadSaveSlot(data) {
  const schemaVersion = data._schemaVersion || 'pre-tinyi-v3';
  if (schemaVersion === 'pre-tinyi-v3') {
    data = _upgradeSaveSlotFromV2(data);
  }
  // 强制·v3 字段 default
  if (!data.GM._convening_民意度) data.GM._convening_民意度 = 0;
  if (!data.GM._convening_言官离心) data.GM._convening_言官离心 = 0;
  if (!data.GM._mentorIndex) data.GM._mentorIndex = _ty3_buildMentorIndex(data.GM.chars);  // v2.9 改·_ty3_ 前缀
  if (!data.GM._tinyiArchive) data.GM._tinyiArchive = [];
  if (!data.GM._pendingTinyiTopics) data.GM._pendingTinyiTopics = [];
  if (!data.GM._chronicleTracks) data.GM._chronicleTracks = [];  // v2.9 改·复数·v3 verified L3865
  
  // 强制·NPC 字段补
  for (const ch of data.GM.chars) {
    if (!ch.prestige) ch.prestige = _estimatePrestigeFromTitle(ch);
    if (!ch.influence) ch.influence = _estimateInfluenceFromTitle(ch);
    if (!ch.aggregateDims || allZero(ch.aggregateDims))
      ch.aggregateDims = _ty3_dimsFromTraits(ch.traitIds) || _ty3_dimsFromKeywords(ch);
  }
  data._schemaVersion = 'tinyi-v3-1.5';
  return data;
}
```

- v2 存档·强制升级·首次加载弹"升级模式"提示
- 升级后**不可降级**
- 老存档·v3 字段全 default·玩家需 1-2 议校准 prestige / influence / mentor

**测试 case** (Slice 11)·

```
1. v2 存档加载·v3 字段全 default → 正常进廷议
2. v3 字段补全后·可正常召集 / 议事 / 反弹
3. v3 切回 v2·禁止·弹"已升级·不可回退"
```

---

## §7·跨系统集成

### 7.1·v3 既有 helper 复用 (Slice 2.5 -0.3d)

```js
// §1 党派访问层 (v3 L70-99)
_ty3_getParties()                  → GM.parties[]
_ty3_getPartyObj(name)             → party object
_ty3_getOpposingParties(partyName) → enemies array
_ty3_getAlliedParties(partyName)   → allies array

// 议前预审 (v3 L696+)
_ty3_paUpdateForecast()            → 党派立场预测条
_ty3_reissueTopic(i)               → 复议留中议题

// archon (v3 L1212+)
_ty3_readHuangwei()
_ty3_readHuangquan()
_ty3_computeArchonGrade()
_ty3_applyArchonGrade(grade, opts)  → cohesion / prestige / favor 副作用
```

### 7.2·`_ty3_applyArchonGrade` 副作用 + Slice 8 共存 (折扣)

**v3 已实现** (L1234-1265+)·

```
S 档·  反对方 cohesion -10·主奏方 +3
A 档·  反对方 leader prestige -5·主奏 leader favor +10
B/C/D·类似 cohesion / prestige / favor 调整
```

**Slice 8 反弹·必须共存**·

```js
async function _ty3_v15_appendMinorityRebound(decision, opts) {
  // 1. v3 archon effects 已跑 (cohesion / prestige / favor)·不动
  
  // 2. v1.4 反弹·追加 minority loyalty / affinity / martyr·跟 v3 effects 共存
  const minority = _ty3_v15_findMinorityNPCs(decision);
  for (const npc of minority) {
    const baseRebound = _ty3_v15_calcRebound(npc, decision);
    const v3Effect    = _ty3_v15_alreadyApplied(npc);  // 检查 v3 已 -prestige 没
    const finalRebound = baseRebound - (v3Effect.prestigeDelta * 0.4);  // 折扣·避 2x
    npc.loyalty = Math.max(0, npc.loyalty - finalRebound);
  }
  
  // 3. v1.4 二次惩罚·按 conveningPolitics.tilt 倍乘
  let multiplier = 1.0;
  if (CY._ty3.conveningPolitics?.tilt === 'oneParty')     multiplier = 1.3;
  if (CY._ty3.conveningPolitics?.tilt === 'fullOneParty') multiplier = 1.5;
  if (CY._ty3.conveningPolitics?.tilt === 'megaCeremony') multiplier = 0.8;  // 法不责众
  
  // 4. 民意度极低·额外惩罚
  if (GM._convening_民意度 <= -50) minority.forEach(npc => npc.loyalty -= 2);
  
  // 5. martyr 入队
  // 6. 党争·losingParty.tension++·winningParty.morale++
  // 7. 民意度 / 言官离心 decay (按 dynasty + daysPerTurn)
}
```

### 7.3·chronicleTracker 桥接 (Slice 11·1 patch)

**真实 bug** (v1.5.1 亲读后确认)·`_ty3_phase14_recordChaoyiSummary` **不是 partial**·实际有 `_ty3_syncChaoyiChronicleTrack` 完整调用·只是**两套系统 (chaoyiChronicleTracks vs _chronicleTracker) 没桥接**。

**Slice 11 patch** (tm-tinyi-v3.js L3676 之前追加)·

```js
if (typeof GM !== 'undefined' && Array.isArray(GM._chronicleTracker)) {
  GM._chronicleTracker.push({
    type: 'tinyi-pending',
    turn: GM.turn,
    topic: topic,
    chaoyiTrackId: item.chaoyiTrackId,  // 桥接 chaoyi → chronicle
    decision: decision,
    grade: grade,
    sealStatus: item.sealStatus,
    dueAt: GM.turn + 3,
    status: 'pending'
  });
}
// 1 处补桥接·function 整体不动·风险极低
```

### 7.4·邸报 (tm-news-bridge) 接口

```js
function _ty3_pushToNewsBridge(sessionEntry) {
  if (typeof TM === 'undefined' || !TM.NewsBridge) return;
  TM.NewsBridge.pushNews({
    type: 'tinyi-decision',
    turn: sessionEntry.turn,
    title: '议「' + sessionEntry.topic.text.slice(0, 20) + '」',
    summary: '钦定 ' + sessionEntry.archonChoice + ' 档·' + (sessionEntry.rebound?.summary || '议毕'),
    severity: _calcSeverity(sessionEntry),
    detailLink: 'tinyi:' + sessionEntry.sessionId
  });
}

function _calcSeverity(entry) {
  if (entry.rebound?.martyrTriggered)             return 'severe';
  if (entry.conveningPolitics?.tilt === 'fullOneParty') return 'severe';
  if (entry.archonChoice === 'D')                  return 'mild';
  if (entry.rebound?.partyTensionDelta >= 3)       return 'mild';
  return 'normal';
}
```

每议 push 1 条·1.2.4.x 邸报已存在·只需新加 type='tinyi-decision' 渲染。

### 7.5·sc_consolidate prompt 反弹 hint

Slice 8 写·

```
"上回廷议偏倚 (conveningPolitics.tilt=oneParty) + 言官离心高 + minority 强反对·loyalty -5"
"本党会议中·阉党全员未召·tension +3·清议事件 3 回合后"
```

### 7.6·LLM call·复用 ai-pipeline retry

```js
async function _ty3_callLLM(prompt, opts = {}) {
  return TM.AIPipeline.callWithRetry({
    prompt: prompt,
    section: 'tinyi-' + (opts.subsec || 'main'),
    maxRetries: 2,
    backoffMs: 1000,
    fallback: opts.fallback || _ty3_hardcodedFallback,
    onError: (err, attempt) => addEB('廷议', '[' + attempt + ' 次失败] ' + err.message)
  });
}
```

- max 2 retry·exp backoff 1s → 2s → fallback
- timeout 30s
- 全廷议 cap·5 NPC 同时 retry·只 retry 第一个·其他直接 fallback

---

## §8·风险与 mitigation

| 风险 | 概率 | 严重度 | mitigation |
|---|---|---|---|
| v3 gate 解开后某阶段崩 | 中 | 高 | Slice 0 baseline 必跑·崩则 patch |
| 8D dims fallback B 精度 <85% | 中 | 中 | 词表扩 + 10 chars 手验 |
| LLM token 爆·成本超 $0.15/议 | 高 | 中 | maxConfrontChain=2·personaTextMaxTok=200·全廷议 cap |
| mentor 字段考据难 | 中 | 低 | 只补名人 (天启 30 + 绍宋 15)·post-sprint 扩 |
| v2 存档不兼容 | 低 | 中 | flag 灰度·v3 不污染 GM state·升级路径 (§6.5) |
| sprint 中途中断 | 高 | 低 | 每 Slice commit·按子任务 ~50 commit·随时可暂停 |
| **disk 满 doc 丢** (post-incident) | 已发生 | 高 | doc commit 频·`backup-critical-docs.ps1` 自动备份·release-hot 旧 zip 及时清 |
| **chronicleTracker 桥接遗漏** | 已发现 | 中 | Slice 11 1 patch·smoke 验"廷议待落实" 入 _chronicleTracker |
| **v3 archon 副作用 + v1.4 反弹 2x 惩罚** | 已发现 | 中 | §7.2 折扣 0.4·Slice 8 实施验证·smoke 比对 v3-only vs v3+v1.4 总惩罚 ≤ v3 单独 × 1.5 |
| **sub-agent audit 偏差** | 已发现 | 高 | memory `feedback_design_must_audit_v3_first` 已更新·后续 sprint Slice 0 必含 LLM 亲读 |

---

## §9·工时 + 时间线 (v2.9 全重写·跟 8 轮 audit 同步)

### 9.1·单源工时表

| Slice | 工时 | 说明 |
|---|---|---|
| 0  | 1.0d | 含 v3 audit |
| **0.0a** | **0.3d** | **(v2.5 加)** verify v2 dead code (临 force orig·跑 5 case) |
| **0.0b** | **0-1.2d** | **(v2.5 加·条件)** 修 v2 dead code (按 0.0a 结果) |
| **0.5** | **0.5d** | **(v2.2 加)** contract + v3 expose (window._ty3_phase6_recordSeal + endturn decay contract + phase6→7 verify) |
| 1  | 1.6d | (v2.6 +0.1d) traitIds 121 chars + `_dingyou` 字段新建 |
| 2  | 1.2d | |
| 2.5 | 2.4d | (v2.2 +0.1d·v2.7 +0.2d) 召集制 + 5 helper spec + 5 剧本 tinyi config |
| **3** | **2.7d** | **(v2.6 +1.2d)** 8D dims hybrid paradigm·Round 1 initial 锚定·Round 2+ LLM 可调 |
| 4  | **0.8d** | **(v2.3 -0.7d)** patch target 改 `_ty2_genOneSpeech`·Section A/B/D 复用·只 Section C 新加 |
| 4.5 | **1.8d** | **(v2.7 +0.3d)** 加 8 处 `CY._ty3.currentPhase` update·解 6 phase handler 失效 |
| 5  | **1.2d** | **(v2.3 -0.8d)** 复用常朝 6 mode (lead/second/rebut/soften/pivot/**augment**)·新加 4 廷议 mode |
| 6  | 1.5d | 25 RULES + ~50 trait BIAS (v2.8 全写) + tone modulation |
| 7  | **1.6d** | **(v2.3 +0.1d)** confront 链·`GM._affinityMap` 新建 spec + 2 helper |
| 7.5 | **1.0d** | **(v2.4 +0.3d·v2.6 +0.2d)** 6 动作 + 5 联动 ceremony (廷杖/削籍/摘除/革职/更议·从 8.5 拆来) + prison + atmosphere |
| 8  | 1.2d | v3 effects 折扣计算在内·affinity 单值 (v2.3 修)·dims → _ty3_getDims (v2.3 修) |
| 8.5 | 1.8d | 5 核心 ceremony (鸣鞭/钦定/草诏/用印/追责) + 9+1 hotkey + 用印 2 sub-flow polish |
| 9  | 0.5d | 复用 `_cc3_cumulativeHint` + `_cc3_emperorCueHint` (v2.4 alias) |
| **10a** | **1.0d** | **(v2.2 拆)** mentor 数据 + buildMentorIndex·**必先于 Slice 2.5** |
| **10b** | **0.5d** | **(v2.2 拆)** clientelism + 联动 UI·Slice 9 后 |
| 11  | **1.7d** | **(v2.6 -0.1d)** smoke + typo 修 + summary·chronicleTracker 桥接 verify (非 patch·v3 已 upsert) + tingyi_pending 改名 |
| **总** | **22.5-25.7d** | (Slice 0.0b 0-1.2d 条件) |
| **关键路径** | **~15.7d** | Slice 0 + 0.0a + 0.5 → 2 → 10a → 2.5 → 3 → 4 → 4.5 → 5 → 6 → 11 |

**含 30% buffer 上限**·**~29d**

### 9.2·时间线推演 (v2.9 重写)

```
day 0      Sprint kickoff·task 全挂
day 1.0    Slice 0 完 (含 audit + flag + baseline)
day 1.3    Slice 0.0a 完 (verify v2)
day 1.3-2.5 Slice 0.0b 完 (按 0.0a 决定·若 v2 broken 修)
day 1.8-3.0 Slice 0.5 完 (contract + expose)
day 3.0-4.5 Slice 1 完 (traitIds 121 + _dingyou) // 并 Slice 2
day 4.2-5.7 Slice 2 完 (27 tag) // 并 Slice 10a
day 4.0-5.5 Slice 10a 完 (mentor 数据 + index)
day 6.4-9.5 Slice 2.5 完 (召集 + 民意度 + 言官离心 + tinyi config + decay)
day 9.1-12.2 Slice 3 完 (hybrid paradigm)
day 9.9-13.0 Slice 4 完 (prompt 注入·小改)
day 11.7-14.8 Slice 4.5 完 (玩家发言·8 phase update + LLM cost cap)
day 12.9-16.0 Slice 5 完 (10 mode)
day 14.4-17.5 Slice 6 完 (25 RULES + ~50 trait BIAS)
day 16.0-19.1 Slice 7 完 (confront 链 + _affinityMap)
day 17.0-20.1 Slice 7.5 完 (6 动作 + 5 ceremony + prison)
day 18.2-21.3 Slice 8 完 (反弹 hook)
day 20.0-23.1 Slice 8.5 完 (UI 升级·5 ceremony)
day 20.5-23.6 Slice 9 完 (cumulative + cue)
day 21.0-24.1 Slice 10b 完 (clientelism + UI)
day 22.7-25.8 Slice 11 完 → ship
```

**保守估计**·~26-29d (含 buffer + 0.0b 条件)
**乐观估计**·~22d (v2 verified clean·跳 0.0b·高度并行)
**预期完成**·2026-06-20 ± 3d

```
day 0     Sprint kickoff·task #131-146·16 子任务挂 (legacy v1.5·参考·实际见 9.2 重写)
day 1.0   Slice 0 完
day 2.5   Slice 1 完  (并 Slice 2)
day 3.7   Slice 2 完
day 6.0   Slice 2.5 完
day 7.5   Slice 3 完
day 9.0   Slice 4 完
day 10.5  Slice 4.5 完
day 12.5  Slice 5 完
day 14.0  Slice 6 完
day 15.5  Slice 7 完
day 16.0  Slice 7.5 完
day 17.2  Slice 8 完  (并 Slice 8.5)
day 19.0  Slice 8.5 完
day 19.5  Slice 9 完
day 21.0  Slice 10 完
day 22.8  Slice 11 完 → ship
```

**保守估计**·~23-25d (含 buffer)
**乐观估计**·~20d (高度并行)
**预期完成**·2026-06-17 ± 3d

---

## §10·DoD 总表 (18 项)

**paradigm 层 (8 项)**·

1. v3 8 阶段全跑通·5 剧本 × 5 议题 = 25 case
2. 10 mode 全触发
3. 8D dims 非空率 ≥ 95%
4. persona 注入率 ≥ 70%
5. confront 触发率 ≥ 8%
6. clientelism 触发率 ≥ 12%
7. 裁决反弹·5 case 输方·v3 effects + v1.4 共存折扣验证
8. smoke 全过·`smoke-tinyi-v3-full.js` 10 case

**UI / 操作层 (4 项)**·

9. 浮按钮 + native prompt() 全清 (grep 0 hit)
10. 13 keyword + 11 intent + 6+4 抢答工作
11. 廷议 vs 常朝 paradigm 视觉差异·盲测 ≥ 4/5 玩家能区分
12. 7+1 hotkey 全工作 (V 新加)

**召集制层 (6 项)**·

13. 6 资格层 (含 prestige v1.4 / 复用 v3 helper)
14. AI 推荐覆盖 27 tag (v1.4 扩 11)
15. 5 政治后果触发 + prestige 加权
16. 朝代差异化·明 / 宋 / 唐 三套
17. GM._convening_民意度·调小 ±5 + dynasty decay + daysPerTurn 归一
18. GM._convening_言官离心·阈值 20/40/60/80 + buffer 2-3 turn

### 10.1·Smoke test 10 case (Slice 11·v2.7 id + topic 修)

**v2.7 改**·六轮 audit verified·原 5 scenario id 全错·10 议题 topic 0/10 在剧本存在·全部按实际 id grep + topic fabricate 修。

```js
const SMOKE_CASES = [
  // 天启七年 (id verified·实际 'sc-tianqi7-1627')
  { scenario: 'sc-tianqi7-1627',     topic: '整顿东厂',           expectedModes: ['lead','rebut','augment'] },
  { scenario: 'sc-tianqi7-1627',     topic: '诛戮魏珰余孽',       expectedModes: ['confront','martyr','clientelism'] },
  // 崇祯元年 (id verified·'scn_1774945158308'·跟挽天倾重复·按 name 区分)
  { scenario: '崇祯',                 topic: '查抄魏珰家产',       expectedModes: ['augment','rebut','pivot'] },
  { scenario: '崇祯',                 topic: '袁崇焕召用',         expectedModes: ['confront','soften','cite_classic'] },
  // 挽天倾 (id verified·跟崇祯重复·按 name)
  { scenario: '挽天倾：崇祯死局',     topic: '南迁议',             expectedModes: ['martyr','pivot','cite_classic'] },
  { scenario: '挽天倾：崇祯死局',     topic: '兵部尚书廷推',       expectedModes: ['lead','second','confront'] },
  // 绍宋 (id verified·'sc-jianyan1-1127-shaosong')
  { scenario: 'sc-jianyan1-1127-shaosong', topic: '主战主和',      expectedModes: ['martyr','rebut','cite_classic'] },
  { scenario: 'sc-jianyan1-1127-shaosong', topic: '黄潜善去留',    expectedModes: ['confront','soften','clientelism'] },
  // 111 (id verified·'scn_1775152731923')
  { scenario: 'scn_1775152731923',   topic: '钞法',                expectedModes: ['augment','rebut'] },
  { scenario: 'scn_1775152731923',   topic: '勋戚加封',            expectedModes: ['pivot','soften'] }
];
// **v2.7 注意**·崇祯 / 挽天倾 id 重复 `scn_1774945158308` (data bug)·smoke 改按 scenario.name 字段 load·非 id
// **议题 topic** 自己 fabricate·sprint 不动剧本 data·跑廷议 init 接收任意 topic 即可
```

### 10.2·额外验收 (v1.5)

- 跑 5/2 `廷议-visual-regression-checklist.md` 139 行·9 大项 + 30 子项全过
- v3 typo L781 修
- chronicleTracker 桥接·"廷议待落实" 卡入 _chronicleTracker
- GM.unlockedRegalia 跨会话存档加载后保留
- v3 effects + v1.4 反弹 共存·比对 v3-only vs v3+v1.4·总惩罚 ≤ v3 × 1.5

### 10.3·LLM cost 验收

- 标准廷议 ~$0.10 / 议 (input 12k + output 7k)
- 月预算 ~$0.90 (6 议)
- 大廷议 ~$0.30 (额外 NPC ×3)
- 超 $0.15 / 议·`P.conf.tinyiMaxCostUSD` 自动 truncate

---

## §11·Backlog (post-sprint)

| 项 | 估时 | 备注 |
|---|---|---|
| yuqian (御前) port | 5-7d | 跟 v3 私决 sub-flow 整合 |
| 廷推算法重写 | 2d | 按 influence 加权 → multi-factor |
| 议题词条剧本化 | 3d | war stance 不剧本化 |
| 朝堂语朝代化 | 2d | 明清统一·宋唐先不做 |
| martyr 后续事件链 | 3d | 诏狱 / 廷杖 / 赐死 真事件 |
| 其他剧本 mentor 补 | 2d | 崇祯 / 111 / 晋 / 大明 |
| 廷议结束 NPC gossip | 2d | 跟 sc1q 联合 |
| 廷议结束玩家私下接见 | 3d | 跟"私语"合并 |
| NPC 宣读奏疏全文 + 打断 | 2d | UI 复杂 |
| 廷议音效 | 1-2d | web audio + autoplay 限制 |
| 朝代 mode pool 差异化 | 3d | 唐/宋/元 boost/dampen |
| v3 §15 弹劾结党 spawn 集成 | 5d | 必读 v3 §15 后定 |
| 多语言 i18n | 10d | 中文专属·long term |
| **总 backlog** | **~35-45d** | |

---

## §12·Sprint 启动 checklist

```
□ 0. user 拍板"开工"
□ 1. doc 已备份 (D:\tianming-backups\YYYY-MM-DD\·跑 backup-critical-docs.ps1)
□ 2. 创建 task #131-146·16 子任务挂上 (Slice 0 ~ 11)
□ 3. 读·本 doc §1 (v3 现状) + tinyi-overhaul-slice0-prep.md (340 行·实施 ready)
□ 4. 跑·Slice 0·5 commit (按 0.1-0.5 子任务)
□ 5. spot-check·v3 实际 UI vs §5.3 mockup·5 项 mockup 至少 1 项与实际逐字对照
□ 6. baseline 录·10 case·入 git
□ 7. Slice 0 完·确认 toggle 切换 v2/v3 工作
□ 8. 按依赖图·Slice 1 → ... → Slice 11
□ 9. 每 Slice 完·跑 §10 对应 DoD·commit
□ 10. Slice 11 完·跑 visual-regression-checklist 全过·ship
```

---

## §13·Reference

### 13.1·关键文件

```
本 doc·                  web/docs/tinyi-overhaul-sprint-v2.md (本)
原 v1.5.1 doc (reference)·web/docs/tinyi-overhaul-sprint.md (4413 行)
Slice 0 prep (ready)·    web/docs/tinyi-overhaul-slice0-prep.md (340 行)
visual regression·       廷议-visual-regression-checklist.md (139 行·5/2 已有)
backup 脚本·             web/scripts/backup-critical-docs.ps1

v3 主文件 (3942 行)·     web/tm-tinyi-v3.js
v2 廷议 (791 行)·         web/tm-chaoyi-tinyi.js (fallback 用·不动)
常朝 (45K)·               web/tm-chaoyi.js (_cy_pickMode 入口)
设置面板 (162K)·          web/tm-patches.js (P.conf toggle)
```

### 13.2·历史 audit 5 轮 (v1.0 → v1.5.1)

```
v1.0 (2026-05-22)·   初稿·11 slice·~15.5-17.5d
v1.1·                +§A (玩家发言·删浮按钮) + §B + §C·14 slice·~19-22d
v1.2·                +§D 6 mockup·1224 行
v1.3·                +§E 召集制 (E.0-E.10)·15 slice·1868 行·21-24d
v1.4·                7 调参 + §F·22-25d·**disk 满 truncate doc·rebuild**
v1.5·                +§J·v3 对齐 7 处 + chronicleTracker bug·23-26d·sub-agent audit
v1.5.1·              +§K·亲读 v3 fix 10 处·22.8-25.8d·**亲读 verified**
v2.0 (本)·           整理版·去重·按实施顺序·single source·~2500 行
```

### 13.3·5 轮 audit 教训

1. **凭对话推测必踩坑** (v1.0-v1.3 → v1.4 调参错·v1.5 v3 对齐错)
2. **sub-agent audit 有偏差** (v1.5 round 4 → 仍漏 3 处)
3. **LLM 主导者必亲读源代码** (v1.5.1 round 5 → 真发现 10 处)
4. **post-disk-incident 教训** — doc 频 commit·multi-target backup
5. **memory 必更新** — `feedback_design_must_audit_v3_first` 已含此教训

### 13.4·关联 memory

- [[design-must-audit-v3-first]] — 设计前必亲读·sub-agent 仅辅助
- [[paradox-ui-unreliable]] — UI 训练记忆不可信
- [[conservative-slicing]] — 大 phase 拆 3-5 slice
- [[refactor-not-reskin]] — 重构必先 audit
- [[no-mystic-penalties]] — 民意度 / 言官离心 是自然政治结果
- [[tool-vs-system-costs]] — 召集是系统型·挂政治后果
- [[runtime-renderer-canonical-for-schema]] — runtime 才是权威·preview/mockup 不可信
- [[chinese-string-translation-during-refactor]] — 不可顺手翻译

### 13.5·相关 sprint

- `web/docs/changchao-overhaul-sprint.md` — 常朝大改 (蓝本·已 ship)
- `web/docs/chaoyi-npc-dialogue-design-v3.md` — v3 spec
- `web/docs/keju-overhaul-sprint.md` — 科举大改 (并行 sprint·v4)

---

**status**·**v2.1·ready for kickoff** · 亲读 v3 ~1000 行 verified · 11 亮点已集成 · 备份机制就绪
**预算**·**22.8 - 25.8d** · 关键路径 ~14d
**预期完成**·2026-06-17 ± 3d
**下一步**·user 拍板 "开工" → Slice 0

---

## §14·v3 亮点保留清单 (v2.1 新·亲读 ~1000 行 verified)

**触发**·user "看一下当下廷议系统·看看有什么亮点值得保留纳入的"·2026-05-23·亲读 v3 L1-3680 关键段·发现 v3 远比 v2.0 sub-agent audit 报告丰富·**必保留 11 项亮点**。

### §14.A·党派进化完整 system (v3 §12·L3083-3396)

```
3 路径党派诞生·
  分裂   (_ty3_partyEvolutionTick L3320)·cohesion<20 持 3 turn → 拆 2 党·status='分化'
  私下结社 (L3292)·prestige>80 + favor>70 + cohesion<30 → 隐党·status='隐党'·publicKnown=false
  弹劾结党 (_ty3_phase12_onAccusationApproved L3173)·准奏弹劾 → 新党·status='被劾'

消亡·cohesion<10 + influence<5 + members<3 → 自然消亡·status='湮灭'

API·_ty3_partySpawn / _ty3_partyDispose
史实约束·"中国古代结党是罪名(结党营私)·非自愿身份·无人公开宣称" — 已记 memory
```

**sprint 集成**·

- Slice 2.5 召集制·**直接用 `_ty3_getOpposingParties` 计 crossPartyRatio·非自建**
- Slice 8 反弹·**不动 partyState·v3 phase7 已写 policyFollowUpHistory / recentPolicyWin/Lose**
- Slice 10 mentor·**clientelism 触发率 +20% 仅 hook NPC 应答·非动党派 system**
- Slice 11 smoke·**测一议触发分裂 / 隐党生成·verify GM._partyEvolutionState 累积**

### §14.B·NpcMemorySystem 集成 (v3 多处调用·v2.0 完全漏)

```js
NpcMemorySystem.remember(name, text, emoType, intensity, [venue])
// emo·喜 / 平 / 忧 / 恨 / politics
// intensity·5-8

v3 调用点·
  phase 5 草诏·  "陛下钦点臣草诏" emo='喜' wt=6
  phase 7 追责·  {fulfilled:喜·6 / partial:平·5 / unfulfilled:忧·5 / backfire:恨·8}
  phase 12 弹劾审准·emo='politics' wt=8
```

**sprint 集成** (新加)·

- **Slice 4 prompt 注入** (+0.05d·在原工时内)·Section E·"NPC X·近期记忆·【喜】陛下钦点草诏·【恨】上议遭斥..." → 让 NPC LLM 输出 reference 之前事件
- **Slice 8 反弹 hook** (已加 §Slice 8 patch)·minority 反弹时 `NpcMemorySystem.remember(name, '议X裁决·loyalty -N', '恨', 5-8, '廷议')`
- **Slice 10 clientelism trigger** (+0.05d)·mentee 抢答时·`NpcMemorySystem.remember(menteeName, '护师·先师X之论·门人不敢异', 'politics', 6)`
- **Slice 11 smoke 加 1 case**·跑 1 议·verify 3+ NPC 各有 ≥1 `_npcMemory.entries` 新加

### §14.C·4 套 chronicle 并存 (v2.0 推论"两套"·v2.1 verified 4 套)

```
1. GM._chronicle[]                ← v3 直接 push 短文本·_ty3_pushChronicle
2. GM._chronicleTracks[]          ← ChronicleTracker (全局长期工程·terminable)
3. GM.tinyi.followUpQueue[]       ← 廷议追责队列·**6 turn 后到期** (tinyiFollowUpDelay=6)
4. _ty3_syncChaoyiChronicleTrack  → chaoyi → chronicle track 桥接 (v3 已有 helper)
```

**v2.5 修正·桥接早已存在** (v2.0/v2.1 误以为 bug·实际不是)·

```js
// v2.0 写·GM._chronicleTracker.push (错·此字段不存在)
// v2.1 改·ChronicleTracker.push (错·API 不存在·真 API 是 upsert)
// v2.5 verified·v3 phase14 已自动调·tm-tinyi-v3.js L3648·
//   _ty3_syncChaoyiChronicleTrack({ trackId, topic, proposerParty, grade, ... })
//   → L3689 内部·ChronicleTracker.upsert({type:'chaoyi_pending', sourceType:'chaoyi_pending', ...})
// 桥接 chaoyi → chronicle 已存·Slice 11 只 verify·非 patch·若 user 看不到"廷议待落实" UI bug 在 UI 渲染层
```

**两套 delay 区分** (v2.0 模糊)·

```
_TY3_REVIEW_DELAY = 3     ← 复评 delay (edictTracker)
tinyiFollowUpDelay = 6    ← 廷议追责 delay (tinyi.followUpQueue)
```

sprint Slice 11 DoD 加·**两套 delay 都 verify·不混**。

### §14.D·phase 7 追责·venue-aware 4 outcome (v2.0 J/K 推错·v2.1 verified)

**两套 outcome 系统并存**·

```js
// phase 6 用印瞬间 outcome (sealStatus mapping·L3413)·
blocked / fulfilled / partial / contested

// phase 7 真追责 outcome (progressPercent + feedback·L3534)·
fulfilled    充分落实  (准奏果验·古文)  progress >= 80%
partial      部分落实  (行而未尽)        40-80%
unfulfilled  未落实    (奉行不力)        < 40%
backfire     反效果    (适得其反)        feedback 含 "反噬/失控/恶化"
```

**4 venue** (`_ty3_isReviewableEdict` 按 source 区分)·

```
廷议   tinyi2 / ty3
御前   yuqian2
常朝   changchao
亲谕   changchao_decree
```

**sprint 集成**·

- D.10 mockup 改·preserve **2 outcome 系统·并标注 "phase 6 瞬时 / phase 7 真追"**
- Slice 11 smoke·**4 venue 各 1 case** (廷议 / 御前 / 常朝 / 亲谕·若剧本支持)
- §10 DoD 加·**4 outcome 古文 label preserve** (准奏果验 / 行而未尽 / 奉行不力 / 适得其反)

### §14.E·朝代差异化用印流程 (v3 L2929-2934·v2.0 漏)

```
唐 / 宋·  政事堂副署 → 玉玺
明·       内阁票拟 → 司礼监批红 → 玉玺   ← 明朝特化·关键政治流程
清·       军机处直递 → 朱批
默认·     Standard seal procedure
```

**sprint 集成**·

- D.9 用印 mockup 改·UI 显示 "用印颁行·X 制·内阁票拟 → 司礼监批红 → 玉玺" (明朝)
- Slice 8.5 +0.1d·按 dynasty 切换 UI label·**朝代化用印流程在原工时内**
- Slice 11 smoke·**绍宋测·UI 显 "宋制·政事堂副署 → 玉玺"**

### §14.F·三议永弃 + 留中册 reissue (v3 已有·v2.0 漏)

```js
_ty3_reissueLimit = 3                 // engine constant
GM._ccHeldItems[]                     // 留中册
GM._ccFinalBlockedItems[]             // 永弃清单
_ty3_makeHeldItem / _ty3_markHeldFinalBlocked
_ty3_reissueTopic(i)                  // 复议·用 reissuedCount 计数

chronicle 入·"议题《X》三议不决·永弃留中"
```

**sprint 集成**·

- §5.4.7 频率限制 + §6.1 数据契约·**加 GM._ccHeldItems / GM._ccFinalBlockedItems**
- Slice 2.5 召集 modal·**display 留中册** (复议 button)·复用 v3 `_ty3_reissueTopic`
- Slice 11 smoke·**1 议留中 → 重议 ×3 → 永弃·verify GM._ccFinalBlockedItems += 1**

### §14.G·ClassEngine 集成 (v3 已有·v2.0 漏)

```js
TM.ClassEngine.applyPartyOutcomeToClasses(GM, {
  sealStatus, outcome, grade, sourceParty, opposingParties, blockerParty
}, { turn, source: 'tinyi-stage6-blocked' | 'tinyi-stage6-issued' | 'tinyi-stage7-follow-up' });

调用点·v3 phase 6 (blocked / issued) + phase 7 (follow-up)·**3 处**
```

**sprint 集成**·

- §7 跨系统·**加 ClassEngine 调用清单 + sprint 不重调原则**
- Slice 8 反弹 hook·**不重调 ClassEngine** (v3 phase 6/7 已调过)·grep call 数 = v3 原数

### §14.H·政治指标系统 (v3 已有·v2.0 严重不全)

```
GM.partyStrife              0-100·党争·phase 7 outcome 调整 (fulfilled -1·partial +1·blocked/contested +2)
GM.corruption.history[]     腐败历史
partyState.policyFollowUpHistory  每党 policy 追责历史
partyState.recentPolicyWin / recentPolicyLose  党最近胜负
GM._turnReport[]            per-turn report
GM._ty3_pendingReviewForPrompt[]  追责 prompt 注入队列
GM._partyEvolutionState     党派进化 state
GM._ccFinalBlockedItems[]   议题永弃清单
```

**sprint 集成**·

- §6.1 数据契约·**全面补这 8 项 GM state**
- Slice 4 prompt 注入·**加 partyState.recentPolicyWin / Lose hint** (NPC 看见党最近胜负 → 决定 stance 强度)
- Slice 11 smoke·**verify GM._partyEvolutionState 累积·跨 5 议**

### §14.I·v3 IIFE hook 模式·sprint paradigm

```js
// v3 §11·_ty3_installDraftHook (L2347)·
// v3 §11·_ty3_installDChainHook (L3055)·
// 均·tryHook + 20 attempts + _hooked flag·override 函数·orig 先跑·sprint 逻辑 append

(function _ty3_installV15SomeHook() {
  if (typeof window === 'undefined') return;
  var attempts = 0;
  function tryHook() {
    if (attempts++ > 20) return;
    if (typeof window._ty3_someFunc !== 'function') { setTimeout(tryHook, 200); return; }
    if (window._ty3_someFunc._v15Hooked) return;
    var orig = window._ty3_someFunc;
    window._ty3_someFunc = function() {
      var res = orig.apply(this, arguments);  // v3 effects 先跑
      try { _ty3_v15_appendLogic(res); } catch (e) {}
      return res;
    };
    window._ty3_someFunc._v15Hooked = true;
  }
  tryHook();
})();
```

**sprint 通用 paradigm**·

- 任何 hook v3 function·**用此 pattern**·**禁止 replacement**
- `_v15Hooked` flag 防重入
- `orig.apply` 在前·append 在后
- try/catch·sprint 逻辑崩不动 v3

**适用范围**·Slice 4 prompt 注入·Slice 8 反弹·Slice 10 mentor·Slice 11 chronicle 桥接 全 4 处必走。

### §14.J·议前预审·gameplay hint preserve (v3 L902)

```
forecast·实时算各党 stance·hint·
  ratio > 20·  "★ 议题占优·明发可能直冲 A 档以上"
  ratio < -20· "⚠ 反对势众·明发恐危诏激变(D 档)"
其他·          "势均力敌·结果难料"
```

**sprint 集成**·D.8 mockup 已加 forecast 段·**hint 字串 3 句必 preserve** (Slice 0 audit verify)。

### §14.K·其他细节·sprint 应补 (5 项)

```
_ty3_isControversial      争议性议题检测  → §5.4.5 AI 推荐·controversial 议题召人 +2
_ty3_isHaremTitle         后宫议题检测   → §5.4.6 朝代差异 forbidden 加宦官 / 后妃
_ty3_checkConsensusEvent  共识事件       → Slice 9 cumulative hint 触发条件
_ty3_pickFallbackSpeakers 兜底选人       → Slice 4.5 抢答 priority 5·闲人兜底 复用
_ty3_continueDebate       续议按钮       → §A.6 抢答集成·"继续 / 径取圣裁" 2 button
GM.player.faction         玩家所属势力   → Slice 4 prompt 注入·"陛下属 X 势力" 上下文
```

**sprint 集成**·

- 全 6 helper / state·**Slice 0 audit 列入 v3 helper inventory**
- 不重新设计·**直接 grep 现有调用·复用**

### §14.L·v2.1 paradigm 重调·总结

**v2.0 thesis**·"激活 v3 + 增强 6 件"
**v2.1 thesis** (重调)·"v3 已是完整 8 阶段政治模拟 system·sprint 是·**用 IIFE hook 模式增强**·**集成三大 v3 system** (ChronicleTracker / ClassEngine / NpcMemory)·**补 6 增强 + 3 bug 修**"

**v2.0 → v2.1 关键改动**·

| # | v2.0 | v2.1 |
|---|---|---|
| 1 | Slice 8 反弹·hook _ty3_applyArchonGrade·"v3 effects 之后追加 + 折扣" | **IIFE hook _ty3_phase6_recordSeal·+ NpcMemorySystem 集成·+ ClassEngine 不重调** |
| 2 | Slice 11 桥接·`GM._chronicleTracker.push (自建)` | **v2.5 verified·v3 phase14 L3648 已调 `_ty3_syncChaoyiChronicleTrack` → `ChronicleTracker.upsert({type:'chaoyi_pending'})`·桥接没断·只 verify** |
| 3 | §1 v3 现状·11 子节 | **+5 子节·1.12-1.16·三大集成 / 4 chronicle / 政治指标 / 4 outcome / forecast hint** |
| 4 | §6 数据契约·~20 字段 | **+8 字段·partyStrife / corruption / partyState / turnReport / pendingReviewForPrompt** |
| 5 | §7 跨系统·3 项 | **+3 项·ChronicleTracker API / ClassEngine 不重调 / NpcMemory hook 3 处** |
| 6 | 无 | **新 §14·v3 亮点保留清单 12 子节·A-L** |

**工时·净 +0.0d** (集成节省 -0.5d / NpcMemory hook +0.3d / DoD 扩 +0.2d)·总仍 22.8-25.8d。

---

**status·v2.1 final**·亲读 v3 ~1000 行 verified·11 亮点已集成·**ready for kickoff**

