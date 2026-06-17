# 科举·field inventory v7·baseline (A0 slice 输出)

**生成**·2026-05-23 (Phase A · Slice A0)
**目的**·v7 sprint 启动前的可信 baseline·让后续 39 slice 设计有 ground truth
**方法**·亲读 `web/tm-keju.js` (1076 行) + `web/tm-keju-runtime.js` (3229 行)·全 grep 实测
**配对 sprint**·`web/docs/keju-overhaul-sprint.md` (1413 行·v7.1 canonical)

文档结构·
- §1 全函数表·两文件 ~85 函数全列
- §2 27 player op 实测核对
- §3 18 AI 调用点实测核对
- §4 9 顶层 namespace 命名冲突检查
- §5 12 red line 函数行号实测
- §6 v7 改动量估算
- §7 开工 ready check

---

## §1·全函数表 (2 文件·~85 函数·按行号顺序)

`tag` 取值·
- `[keep]` — v7 不改 / `[refactor·X]` — v7 哪个 slice 改 / `[delete]` — v7 删 / `[unchanged·verified]` — 读过确认不改

### tm-keju.js (1076 行·~33 函数)

| 行号 | 函数名 | async | 用途 (1 句) | AI 调用 | 持久化字段 | tag |
|---|---|---|---|---|---|---|
| keju L108 | `openKejuPanel` | no | 打开科举主面板 (UI 入口) | - | P.keju.enabled/.history/.currentExam | [refactor·A0.5·K1] (UI 顶部加 3 印石) |
| keju L207 | `proposeKejuPreparation` | no | 玩家点筹办·开 keyi | - | - | [refactor·B3] (扩 topicType 参数) |
| keju L219 | `manualStartKeju` | no | 废弃·保留兼容 (旧弹窗) | - | - | [delete] (已注废弃) |
| keju L229 | `_kejuQueryLibuStance` | no | 查询礼部尚书态度 (support/oppose/null) | - | - | [keep] |
| keju L247 | `startKejuByMethod` | no | 3 路径启动科举·council/edict/defy | - | GM.keju._pendingProposal·penaltyLog | [keep] (red line #11·3 tier 代价) |
| keju L304 | `resolveKejuCouncilResult` | no | 朝议结果→提示玩家选路径 (v5 弹窗·v7 走 keyi) | - | - | [refactor·B3] (走 keyi 不弹窗) |
| keju L331 | `_adjustHuangquan` | no | 辅助·调整皇权 (绕 AuthorityEngines) | - | GM.huangquan | [keep] |
| keju L346 | `_adjustMinxin` | no | 辅助·调整民心 | - | GM.minxin.trueIndex | [keep] |
| keju L360 | `_kejuFindDivision` | no | 在 adminHierarchy 中递归找节点 | - | - | [keep] |
| keju L376 | `_kejuFindAncestorByLevel` | no | 找某节点的指定级别祖先 | - | - | [keep] |
| keju L400 | `_kejuDeductFromDivision` | no | 从区划公库扣钱·不足返 false | - | node.publicTreasury.money | [keep] |
| keju L411 | `payKejuLocalCost` | no | D1·童/府/院试经费·县→府→省回落 | - | exam.costsPaid.local | [keep] (red line #8) |
| keju L440 | `_kejuSettleLocalCosts` | no | 各省/府/县遍历扣童/府/院试费 | - | n._kejuYuanshiPaid | [keep] (red line #8) |
| keju L475 | `_kejuSettleProvincialCosts` | no | 乡试经费·每省独立 | - | prov._kejuPreliminaryHalved | [keep] (red line #8) |
| keju L495 | `_kejuGenChiefExaminerMemorial` | yes | E1·主考官 AI 生成 3 道备选会试题 | L520 (~2000 tok) | exam.chiefExaminerMemorial·huishiTopicCandidates | [keep] (red line #2·绝不删) |
| keju L542 | `kejuConsultCourtier` | no | E2·咨询问对 (会试·〔咨询他臣〕) | - | - | [keep] |
| keju L561 | `kejuConsultGuanGe` | no | E2·咨询馆阁 (殿试·〔咨询馆阁〕) | - | - | [keep] |
| keju L594 | `_isPlayerFactionChar` | no | 判定角色是否属玩家势力 | - | - | [keep] |
| keju L605 | `_kejuHasChiefExaminerOffice` | no | 判主考官资格·非后妃/学生 | - | - | [keep] |
| keju L615 | `_kejuIsEligibleChiefExaminer` | no | 综合资格判定·智力≥60 + 在任 | - | - | [keep] |
| keju L623 | `openDianshiDelegatePicker` | no | F1·打开殿试代主选任面板 | - | exam.dianshiDelegate | [refactor·D1] (D4 加司礼监第 7 类) |
| keju L660 | `_kejuClassifyDelegate` | no | 分类代主身份 (6 类) | - | - | [refactor·D1] (加宦官类·明清) |
| keju L673 | `_filterDelegateList` | no | 筛选代主列表 (search) | - | - | [keep] |
| keju L683 | `_pickDianshiDelegate` | no | 选中代主·身份副作用 | - | exam.dianshiDelegate·NpcMemory·AffinityMap | [refactor·D1] (加宦官 huangwei-5) |
| keju L713 | `_kejuAutoPickExaminer` | no | 考官自动选 (玩家未选时) | - | exam.chiefExaminer·examinerParty 等 | [keep] |
| keju L728 | `_kejuNotifyUrgentStage` | no | 进入需玩家决策阶段·显著提醒 (顶栏浮条) | - | qijuHistory·eventBus | [keep] |
| keju L767 | `_kejuShowUrgentBanner` | no | 科举待办浮条·常驻右上 | - | DOM keju-urgent-banner | [keep] |
| keju L803 | `_kejuUrgentAction` | no | 点击浮条按钮·打开科举面板 | - | - | [keep] (player op 27) |
| keju L810 | `_kejuClearUrgentBanner` | no | 清掉浮条·进下一阶段时 | - | - | [keep] |
| keju L827 | `_kejuHistoricalWindow` | no | 根据游戏模式决定时间窗 (strict/light/yanyi) | - | - | [keep] |
| keju L835 | `pickHistoricalCandidates` | yes | F2·AI 检索历史名臣考生 | L873 (~4000 tok) | exam.historicalHits·P.keju._historicalFiguresUsed | [keep] (red line #3·shiliao 必保) |
| keju L925 | `_kejuSettleCentralCost` | no | D2·中央经费 (考官/会试/殿试)·三级 fallback | - | exam.costsPaid.central·costShortfall | [keep] (red line #8) |
| keju L964 | `requestEnableKeju` | yes | sc0·请求启用科举 (隋唐后) | L988 (~500 tok) | P.keju.enabled·examIntervalNote | [refactor·A1] (重写·5 档多 outcome) |
| keju L1011 | `startKejuReform` | yes | sc0·发起科举改革 (隋唐前) | L1037 (~1000 tok) | P.keju.enabled·reformed | [refactor·A1·J3] (扩 8 主题池) |

### tm-keju-runtime.js (3229 行·~52 函数)

| 行号 | 函数名 | async | 用途 (1 句) | AI 调用 | 持久化字段 | tag |
|---|---|---|---|---|---|---|
| runtime L23 | `initKejuSystem` | yes | 朝代制度配置 LLM 决议·开局或切剧本 | L116 (~800 tok) | P.keju.{tiers,enabled,interval,subjects,specialRules,stageDurationDays,costs,attributeBonus,historicalFigurePolicy} | [refactor·B1] (KejuTier 全驱动·删 dict) |
| runtime L137 | `_getDefaultTiers` | no | 默认朝代层次配置 (明清/唐宋/其他) | - | - | [refactor·B1] (改 tier object) |
| runtime L161 | `isKejuEra` | no | 判朝代是否属科举时代 (隋唐及之后) | - | - | [keep] |
| runtime L170 | `checkKejuTrigger` | yes | 定期判 LLM 是否开科·endTurn 触发 | L202 (~300 tok) | - | [refactor·B3] (改 spawn 邸报·不直接 startKejuExam) |
| runtime L223 | `startKejuExam` | no | 开始科举考试流程 (v5·时间化) | - | P.keju.currentExam/currentEnke (全 schema init) | [keep] |
| runtime L302 | `showKejuModal` | no | 显示科举考试界面 | - | DOM keju-modal | [keep] |
| runtime L327 | `renderKejuStage` | no | 渲染科举当前阶段 (分派) | - | - | [refactor·K1] (顶加 3 印石 + 4 维度) |
| runtime L359 | `advanceKejuByDays` | no | 按天累积·每回合 endTurn 调·切阶段 | - | exam.stageElapsedDays | [keep] |
| runtime L384 | `_kejuUpgradeExamSchema` | no | 老存档 currentExam 升级 v5 schema | - | exam.{stage,id,type,stageElapsedDays 等} | [refactor·B1] (v7 重写·tier index 转) |
| runtime L408 | `renderKejuProgressStage` | no | 通用进度页 (huishi_draft 等) | - | - | [keep] |
| runtime L431 | `_finalizeStageAndAdvance` | yes | 阶段切换·终结动作 + 推进 (8 case) | (内部调多个) | exam.stage·stageStartTurn | [refactor·B1] (tier 驱动·case 改) |
| runtime L545 | `_adjustHuangwei` | no | 辅助·调整皇威 | - | GM.huangwei.index | [keep] |
| runtime L557 | `_kejuArchiveExam` | no | 归档本场科举到 history | - | P.keju.history·lastExamDate·currentExam=null | [refactor·D5] (扩 historicalHits 收录) |
| runtime L575 | `renderPreliminaryStage` | no | 童/府/院试 + 乡试·只读进度 | - | - | [keep] |
| runtime L587 | `runPreliminaryExams` | yes | 地方选拔统计 AI | L611 (~1000 tok) | exam.preliminaryStats | [keep] |
| runtime L626 | `renderExaminerSelectStage` | no | 选任主考官 UI·党派推荐 | - | - | [refactor·C1] (顶加 examinerView 4 属性) |
| runtime L688 | `selectExaminer` | no | 玩家选主考官·写 exam 字段 | - | exam.{chiefExaminer,examinerParty,examinerStance,examinerIntelligence}·NpcMemory·AffinityMap | [refactor·C1] (扩 4 属性派生 + tension+1/loyalty-2) |
| runtime L727 | `proceedToHuishi` | no | 进入会试出题 | - | exam.stage='huishi' | [keep] |
| runtime L737 | `renderHuishiStage` | no | 渲染会试阶段 (textarea + 开榜按钮) | - | - | [refactor·C3] (顶加 examinerView + 错配警示) |
| runtime L778 | `examinerProposeTopic` | yes | 主考官 AI 拟题 | L793 (~800 tok) | exam.huishiTopic | [refactor·C3] (注入 examinerView hint) |
| runtime L806 | `generateHuishiResults` | yes | 会试批卷 AI·LLM 评 N 卷 | L872 (~800 tok) | exam.huishiPassed·statistics·dianshiCandidates·GM.eraState.bureaucracyStrength | [keep] |
| runtime L924 | `_normalizeRatio` | no | 归一化 ratio (兼容多种 AI 形状) | - | - | [keep] |
| runtime L959 | `_hasRatio` | no | 判 ratio 是否非空 | - | - | [keep] |
| runtime L960 | `_fmtRatio` | no | 格式化 ratio 为 HTML | - | - | [keep] |
| runtime L971 | `renderDianshiStage` | no | 渲染殿试阶段 (策问 + 开始按钮) | - | - | [refactor·D2] (顶加 examinerView) |
| runtime L1013 | `generateDianshiQuestion` | yes | AI 代拟殿试策问·150-250 字 | L1042 (~500 tok) | DOM dianshi-question.value | [refactor·D2] (注入 examinerView·UI 错配 warning) |
| runtime L1057 | `_kejuOpenDianshiProgress` | no | 殿试进度弹窗·三次重试 | - | DOM dianshi-progress-modal | [keep] |
| runtime L1080 | `_kejuUpdateDianshiProgress` | no | 殿试进度刷新 | - | - | [keep] |
| runtime L1087 | `_kejuCloseDianshiProgress` | no | 关闭殿试进度弹窗 | - | - | [keep] |
| runtime L1092 | `startDianshi` | yes | 开始殿试·调 generateDianshiResults | (内部) | exam.playerQuestion·stage='finished' | [keep] |
| runtime L1143 | `generateDianshiResults` | yes | F3·生成殿试结果 (meta + 4 批答卷 + 批语) | L1185 (~6000) + L1239 (~16000·4 批) | exam.dianshiResults | [refactor·D3] (注入 D1/D2/D3/D4 hint) |
| runtime L1282 | `_parseJsonArr` | no | 解析 AI 返 JSON 数组·多级降级 | - | - | [keep] |
| runtime L1301 | `_kejuGenChiefExaminerComments` | yes | 主考官逐卷批语 | L1320 (~8000 tok) | candidates[].chiefExaminerComment | [keep] |
| runtime L1334 | `_kejuGenExaminerSuggestions` | yes | F4·考官建议 (合议推荐三甲) | L1377 (~3000 tok × N 考官) | exam.examinerSuggestions | [keep] |
| runtime L1402 | `renderDianshiDecideStage` | no | F5·钦定面板·考官意见全列 | - | - | [refactor·D4] (UX 强化·答卷弹加 examinerView) |
| runtime L1471 | `_qinDianPick` | no | 点击钦定位次 (状元/榜眼/探花) | - | exam._pendingRanking | [keep] |
| runtime L1484 | `confirmFinalRanking` | no | 确认钦定·触发后续 (controversy 判) | - | exam.finalRanking·NpcMemory·AffinityMap | [refactor·D4] (加党争联动 + 寒门 satisfaction) |
| runtime L1520 | `_kejuJudgeRankingControversy` | no | 判定钦定与考官意见分歧 | - | AffinityMap·huangwei | [keep] |
| runtime L1564 | `openKeyiSession` | no | 入口·打开科议 (v2·自动邀请) | - | KEYI_STATE·GM.keju._pendingProposal | [refactor·B3] (头部接参化·**绝不重写 800 行**·red line #1) |
| runtime L1635 | `_renderKeyiModal` | no | 创建科议 modal 容器 | - | DOM keyi-modal | [keep] |
| runtime L1654 | `_keyiRender` | no | 根据 phase 分派渲染 | - | - | [keep] |
| runtime L1664 | `_keyiRenderDiscuss` | no | 发言阶段 UI | - | - | [refactor·B3] (按 topicType 切话术) |
| runtime L1699 | `_keyiExtraRound` | yes | 手动再议一轮 (v4·无上限) | (内调 streamRound) | KEYI_STATE.round | [keep] |
| runtime L1710 | `_keyiInferPlayerStance` | no | 从玩家圣谕推断立场 (regex) | - | - | [keep] |
| runtime L1721 | `_keyiPlayerSpeak` | yes | 玩家插言·打断当前轮·下一轮 NPC 回应 | (内调 streamRound) | KEYI_STATE.{playerStance,playerSpeeches,abort} | [keep] |
| runtime L1763 | `_keyiRunBothRounds` | yes | 连续跑两轮·中间无玩家按键 | (内调 streamRound) | KEYI_STATE._discussDone | [keep] |
| runtime L1780 | `_keyiBubbleHtml` | no | 发言气泡 HTML 渲染 | - | - | [keep] |
| runtime L1799 | `_keyiStreamRound` | yes | 流式跑一轮发言·逐人流式 | L1865 (~800/人) callAIMessagesStream L1850 | KEYI_STATE.speeches | [refactor·B3] (prompt 注入 topicType context) |
| runtime L1896 | `_keyiNextRound` | yes | 再议一轮 (v2 旧入口·上限 2 轮) | (内调 streamRound) | KEYI_STATE.round | [keep] |
| runtime L1904 | `_keyiInferStance` | no | 算式推断立场 (AI 兜底) | - | - | [keep] |
| runtime L1939 | `_keyiProceedToVote` | yes | 进入表决·显式进度条 | (内调 GenAllStances) | KEYI_STATE.phase='vote' | [keep] |
| runtime L1965 | `_keyiGenAllStances` | yes | AI 一次生成所有大臣立场 (含单向不变量) | L2037 (~4000 tok) | KEYI_STATE.stances·support | [refactor·B3] (prompt 注 topicType) |
| runtime L2076 | `_keyiComputeSupport` | no | 计算支持率 (s/o/abstain) | - | KEYI_STATE.support·_breakdown | [keep] |
| runtime L2091 | `_keyiRenderVote` | no | 表决阶段 UI (进度条·结果) | - | - | [keep] |
| runtime L2153 | `_keyiProceedToDecide` | no | 进入裁决阶段 | - | KEYI_STATE.phase='decide' | [keep] |
| runtime L2160 | `_keyiRenderDecide` | no | 阶段 3·皇帝决策 UI | - | KEYI_STATE._opposingMinisters·_opposingParties | [keep] |
| runtime L2197 | `_keyiConfirmStart` | no | 确认启动科举·触发 startKejuByMethod | - | (调多个持久化函数) | [refactor·B3] (扩 callback by topicType) |
| runtime L2212 | `_keyiPersistToCourtRecords` | no | 科议结果写 GM._courtRecords·_edictTracker·qijuHistory·jishiRecords | - | GM._courtRecords·_edictTracker·qijuHistory·jishiRecords·eventBus | [keep] (red line #9·7 处持久化) |
| runtime L2299 | `_kejuWriteJishi` | no | 通用·写科举事件到纪事 | - | GM.jishiRecords | [keep] (red line #9) |
| runtime L2311 | `_keyiMemoryEffects` | no | 科议 NPC 记忆 + AffinityMap | - | NpcMemorySystem·AffinityMap | [keep] (red line #12) |
| runtime L2346 | `_keyiAbort` | no | 缓议 (玩家点罢不议了) | - | GM.keju._pendingProposal.resolved | [keep] |
| runtime L2353 | `closeKeyi` | no | 关闭科议 modal | - | KEYI_STATE=null·DOM remove | [keep] |
| runtime L2370 | `renderFinishedStage` | no | 渲染金榜题名 (前 3 + 4-20 名) | - | - | [refactor·D4] (eager 后 UI 简化) |
| runtime L2452 | `viewAnswer` | yes | 查看答卷·lazy 生成完整答卷 | L2481 (~1500 tok) | candidate.fullAnswer | [refactor·D4] (扩 examinerView 评分) |
| runtime L2495 | `showAnswerModal` | no | 显示答卷弹窗 (主考批语 + 评语 + 史料) | - | DOM modal | [keep] |
| runtime L2548 | `recruitCandidate` | no | 将考生纳入人物志·完整 char 数据 | - | GM.chars·GM.allCharacters·NpcMemory·AffinityMap·newChar._mentorParty | [refactor·D5·E1] (eager 化·mentor 字段) |
| runtime L2661 | `assignOffice` | no | 为考生授予官职 (选 vacant post UI) | - | - | [refactor·E3] (朝代联动·明清翰林 / 宋直授) |
| runtime L2715 | `_kejuAssignConfirm` | no | 在 officeTree 中找职位并任命 | - | pos.holder·addEB | [refactor·E3] (4 代价计算) |
| runtime L2746 | `finishKeju` | no | 完成科举·history push + 政斗影响 | - | P.keju.history·lastExamDate·GM.chars satisfaction·GM._kejuPendingAssignment | [refactor·D5] (扩 historicalHits·eager 后调) |
| runtime L2833 | `_kejuFinalize` | no | G1+G2·三甲自动纳入 + 4-20 入 gradPool 填缺 | - | exam.gradPool·历史 history 字段 | [refactor·D5·E2] (lazy 删·100% 党派标签) |
| runtime L2889 | `_kejuBasicRecruit` | no | 模板兜底·基础字段写入 GM.chars | - | GM.chars | [refactor·D5] |
| runtime L2917 | `_aiGenerateFullCharacter` | yes | G2·AI 全字段生成 (含生平/外貌/家谱/史料段) | L2964 (~3000 tok) | GM.chars (含 _timeAnomaly·historicalSource) | [refactor·D5·重写] (注入 examiner 4 属性 + D1/D2/D3/D4 hint) |
| runtime L3055 | `_kejuAllocateGradsToOffices` | no | G1·未纳入进士填 officeTree 空缺 | - | pos.{holder,holderSource,_kejuRank,_kejuPoolRef}·g.allocatedOffice | [refactor·E3] |
| runtime L3088 | `_kejuAggregateGradsEffect` | no | G2·阶层 + 党派 + 吏治影响 (派生) | - | GM.classes.satisfaction·GM.parties.influence·GM.eraState.bureaucracyStrength | [refactor·E2·J1] (扩 党派 100% + F1/F2/F3 公式) |
| runtime L3131 | `crystallizeKejuGrad` | yes | G2·懒加载具象化 (玩家打开职位时) | (内调 _aiGenerateFullCharacter) | postRef._crystallized | [delete] (D5·lazy 全删·eager 化) |
| runtime L3157 | `_kejuAutoAssign` | no | P7·科举入仕自动铨选·SettlementPipeline 钩 | - | GM._kejuPendingAssignment·ch.{title,officialTitle}·pos.holder·NpcMemory | [refactor·E3] (朝代联动) |
| runtime L3218 | `closeKejuModal` | no | 关闭科举界面 | - | DOM keju-modal | [keep] |

---

## §2·27 player op 实测核对

逐个 grep verify·与 sprint plan v6.5 §4.5 对照·

| # | op 名 | 函数 | sprint 标行号 | 实测行号 | 状态 | v7 slice |
|---|---|---|---|---|---|---|
| 1 | 请求启用科举 | `requestEnableKeju` | tm-keju.js L964 | L964 | ✓ | Slice A1 |
| 2 | 发起科举改革 | `startKejuReform` | tm-keju.js L1011 | L1011 | ✓ | Slice A1 + J3 |
| 3 | 提议筹办科举 | `proposeKejuPreparation` | tm-keju.js L169 (按钮 onclick) | 按钮 L169 / 函数定义 L207 | ⚠ sprint 标的是 onclick 位置·**实函数定义在 L207** | Slice B3 |
| 4-6 | 依议启动/下诏强推/逆众议强推 | `startKejuByMethod('council'/'edict'/'defy')` | tm-keju.js L247 | L247 | ✓ | keyi 复用 (Slice B3) |
| 7 | 罢不议了 | `_keyiAbort` | runtime L2189 | **L2346** | ❌ sprint 行号偏 157 行·真实 L2346 | keyi 复用 |
| 8 | 再议一轮 / 付表决 / 继续裁决 | `_keyiExtraRound` / `_keyiProceedToVote` / `_keyiProceedToDecide` | runtime L1690-2148 | L1699 / L1939 / L2153 | ⚠ sprint 范围近似·真实 L1699-2153 | keyi 复用 |
| 9 | 科议玩家圣谕 | `_keyiPlayerSpeak` | runtime L1721 | L1721 | ✓ | keyi 复用 |
| 10 | 主考钦点 | `selectExaminer` | runtime L688 | L688 | ✓ | Slice C1 |
| 11 | 进入会试出题 | `proceedToHuishi` | runtime L683 | **L727** | ❌ sprint 行号偏 44 行·L683 是 `_pickDianshiDelegate` (tm-keju.js)·`proceedToHuishi` 在 runtime L727 | Slice C3 |
| 12 | 让主考官 AI 拟题 | `examinerProposeTopic` | runtime L778 | L778 | ✓ | Slice C3 |
| 13 | 修改/清空会试题目 | textarea + 清空 | runtime L758-759 | L756 (textarea) / L759 (清空按钮) | ⚠ textarea 实际 L756·清空按钮 L759 | Slice C3 |
| 14 | 开榜批卷 | `generateHuishiResults` | runtime L806 | L806 | ✓ | Slice D3 (原 v6.5 Slice 8) |
| 15 | 殿试代主选委 | `openDianshiDelegatePicker` / `_pickDianshiDelegate` | tm-keju.js L623-718 | L623 / L683 / L728 (urgent ends) | ⚠ 范围近似·真 L623-712 | Slice D1 |
| 16 | AI 代拟策问 | `generateDianshiQuestion` | runtime L1013 | L1013 | ✓ | Slice D2 |
| 17 | 玩家亲笔策问 (`playerQuestion` 写入) | textarea·150-250 字策问体 | runtime L1101 | **textarea L1001·赋值 L1101** | ⚠ sprint 标的是赋值点·真 textarea 在 L1001 + 赋值在 L1101 | Slice D2 |
| 18 | 开始殿试 | `startDianshi` | runtime L1004 | **L1092** | ❌ sprint 行号偏 88 行·真 L1092·L1004 附近是 dianshi-question textarea | Slice D2 |
| 19 | 查看答卷 | `viewAnswer` | runtime L2452 | L2452 | ✓ | Slice D4 |
| 20 | 钦点状元/榜眼/探花 | `_qinDianPick` | runtime L1471 | L1471 | ✓ | Slice D4 |
| 21 | 钦定·张榜天下 | `confirmFinalRanking` | runtime L1484 | L1484 | ✓ | Slice D4 |
| 22 | 纳入人物志 | `recruitCandidate` | runtime L2548 | L2548 | ✓ | Slice D5 (eager 自动) |
| 23 | 授予中央官职 | `assignOffice` | runtime L2661 | L2661 | ✓ | Slice E3 |
| 24 | 选官分配确认 | `_kejuAssignConfirm` | runtime L2715 | L2715 | ✓ | Slice E3 |
| 25 | 天子门生授恩 | `_kejuFinalize` | runtime L2625 | **L2833** | ❌ sprint 行号偏 208 行·真 L2833 | 自动·不动 |
| 26 | 完成科举·邸报头条 | `finishKeju` | runtime L2746 | L2746 | ✓ | Slice D5 / J0 联动 |
| 27 | 紧急浮条点击 | `_kejuUrgentAction` | tm-keju.js L728-791 | L803 (函数定义) | ❌ sprint 标的范围错·`_kejuUrgentAction` 函数定义在 **L803**·L728 是 `_kejuNotifyUrgentStage`·L767 是 `_kejuShowUrgentBanner` | 保留·event 联动 |

**实测核对总结**·**27 op 中 9 处行号有偏差**·5 个错位 (❌·op #7/11/18/25/27)·4 个近似但需细化 (⚠·op #3/8/13/15/17)。整体函数都存在·只是行号在 v6.5 → v7 过程中漂移。

---

## §3·18 AI 调用点实测核对

跨 2 文件 grep `callAISmart`·实测 18 处 + `callAIMessagesStream` 1 处 (L1850·内嵌于 `_keyiStreamRound` 同函数·sprint 算 1 个 op)·

| sprint 行号 | 实测行号 | 函数 | tok | v7 影响 (sprint 决定) |
|---|---|---|---|---|
| runtime L116 | ✓ L116 | `initKejuSystem` | 800 | [refactor·B1] |
| runtime L202 | ✓ L202 | `checkKejuTrigger` | 300 | [refactor·B3] (改路径) |
| runtime L611 | ✓ L611 | `runPreliminaryExams` | 1000 | [keep] |
| keju L988 | ✓ L988 | `requestEnableKeju` | 500 | [refactor·A1] |
| keju L1037 | ✓ L1037 | `startKejuReform` | 1000 | [refactor·A1·J3] |
| keju L520 | ✓ L520 | `_kejuGenChiefExaminerMemorial` | 2000 | [keep] (red line #2) |
| runtime L793 | ✓ L793 | `examinerProposeTopic` | 800 | [refactor·C3] |
| runtime L1042 | ✓ L1042 | `generateDianshiQuestion` | 500 | [refactor·D2] |
| runtime L1320 | ✓ L1320 | `_kejuGenChiefExaminerComments` | _tokC (~8000) | [keep] |
| runtime L872 | ✓ L872 | `generateHuishiResults` | 800 | [keep] |
| runtime L1185 | ✓ L1185 | `generateDianshiResults` meta | 6000 | [refactor·D3] |
| runtime L1239 | ✓ L1239 | `generateDianshiResults` batch | variable (~16k·4 批) | [refactor·D3] |
| runtime L1377 | ✓ L1377 | `_kejuGenExaminerSuggestions` | 3000 (× N 考官) | [keep] |
| runtime L2481 | ✓ L2481 | `viewAnswer` | 1500 | [refactor·D4] |
| runtime L1865 | ✓ L1865 | `_keyiStreamRound` (callAISmart fallback) | 800 (~/人) | [refactor·B3] (注 topicType) |
| runtime L2037 | ✓ L2037 | `_keyiGenAllStances` | _tokBudget (~4000) | [refactor·B3] |
| runtime L2964 | ✓ L2964 | `_aiGenerateFullCharacter` | 3000 | [refactor·D5·重写] |
| keju L873 | ✓ L873 | `pickHistoricalCandidates` | _tokBudget (~4000) | [keep] (red line #3) |

**实测核对总结**·**18 处 callAISmart 调用点·全部 sprint 行号准确** ✓·零偏差。**额外**·runtime L1850 是 `callAIMessagesStream` (流式·_keyiStreamRound 内·sprint 算入 L1865 同 AI op)·实际 keyi 流式时 L1850 跑·callAISmart fallback L1865 跑·共 1 op 入口。**v7 后总 AI 调用点·~24 处** (18 + 6 v7 新加·G1/G2/H4/I2/I3/F2/F3/J0 各加 1)。

---

## §4·9 顶层 namespace 命名冲突检查

grep 全 web/*.js·

**v6.5 现已用 (不冲突)**·

| namespace | 实测出现 | 用途 |
|---|---|---|
| `P.keju.tiers` | runtime L27·137 | KejuTier 数组 (v7 重构) |
| `P.keju.history` | keju L110·149 + runtime L558 | 科举历史归档 |
| `P.keju.currentExam` | keju L112 + runtime L275·329 (~30 处) | 当前科举 (主 schema) |
| `P.keju.currentEnke` | runtime L275·360 | 当前恩科 |
| `P.keju.enabled` | keju L129·969 + runtime L86·119 | 制度激活 |
| `P.keju.lastExamDate` | keju L138 + runtime L569·2763·1816 | 上次科举时间 |
| `P.keju.examIntervalNote` | keju L134·967·995 等 | 考试间隔 |
| `P.keju.examSubjects` | keju L135 + runtime L124·741 等 | 科目 (诗赋/经义) |
| `P.keju.specialRules` | keju L137 + runtime L125·767·829 | 特殊规则 (糊名等) |
| `P.keju.quotaPerExam` | keju L136 | 每科取士 |
| `P.keju.stageDurationDays` | runtime L32·291·366 (v7 删) | 阶段时长 dict (Slice B1 删) |
| `P.keju.costs` | keju L412·442·476·926 + runtime L48 | 经费配置 |
| `P.keju.attributeBonus` | runtime L59 + L2892·2979 | 童生→状元 9 档加成 |
| `P.keju.historicalFigurePolicy` | keju L836 + runtime L74 | 历史名臣策略 |
| `P.keju._historicalFiguresUsed` | keju L843·851·896 + runtime L83 | 跨场去重池 |
| `P.keju.alternativeSystem` | runtime L29·121 | 非科举朝代替代制 |
| `P.keju.chiefExaminer` | runtime L28 (init·非 currentExam) | (待验证·罕用) |
| `P.keju.reformed` | keju L1014·1053 | 是否改革过 |
| `GM.keju._pendingProposal` | keju L298·305 + runtime L1566·2347 | keyi pending |
| `GM.keju.preparingExam` | keju L141·165 | UI 显示锁 |
| `GM._kejuPendingAssignment` | runtime L2808·3158·3162 | 科举铨选队列 |
| `GM._edictTracker` | runtime L2265 | edict 反馈 (sc16 联动) |
| `GM._courtRecords` | runtime L2213·2260 | 议政持久化 |

**v7 待加 (检查无冲突)** — grep 全 web/*.js·

| v7 namespace | 现有冲突? | 引入 slice |
|---|---|---|
| `GM._discipleGraph` | ❌ 无冲突·grep 0 命中 | Slice F1 (D1) |
| `GM._specialExamCalendar` | ❌ 无冲突·grep 0 命中 | Slice G1 (D2) |
| `GM._schoolNetwork` | ❌ 无冲突·grep 0 命中 | Slice H1 (D3) |
| `GM._eunuchInterference` | ❌ 无冲突·grep 0 命中 | Slice I1 (D4) |
| `GM._factionTension` | ❌ 无冲突·grep 0 命中 (除 sprint doc) | Slice C2 |
| `GM._mentorIndex` | ❌ 无冲突·grep 0 命中 (除 sprint doc) | Slice E1 |
| `P.keju.indicators` | ❌ 无冲突·grep 0 命中 | Slice J1 |
| `P.keju._pendingAutoOpen` | ❌ 无冲突·grep 0 命中 (除 sprint doc) | Slice B3 |
| `ch._cohortYear` / `ch._specialExamType` / `ch._schoolAffiliation` / `ch._mentorRef` | ❌ 无冲突·char schema 全新字段 | Slice F1/G1/H1/E1 |

**namespace 冲突检查总结**·**全 v7 新 namespace 0 冲突** ✓·**绿地开发**·**ch 新 4 字段 0 冲突** ✓·安全合并·v7 不会破坏现有数据。

---

## §5·12 red line 函数行号实测

逐条 grep verify·sprint plan §4 列 12 red line·

| # | red line 文本 | 函数 / 范围 | sprint 标行号 | 实测行号 | 状态 |
|---|---|---|---|---|---|
| 1 | 绝不重写 keyi 800 行 | `openKeyiSession` ~ `closeKeyi` | runtime L1564-2353 (开放扩 topicType·共 9 类) | ✓ L1564 (openKeyiSession) → L2353 (closeKeyi)·真实跨度 ~790 行 | ✓ OK |
| 2 | 绝不删 `_kejuGenChiefExaminerMemorial` | tm-keju.js | L495 | ✓ L495 | ✓ OK |
| 3 | 绝不简化历史名臣检索·shiliao 必保 | `pickHistoricalCandidates` | keju L835 / shiliao 字段 | ✓ L835 (函数) / shiliao 出现 14 处 (runtime L1167·1226·2535·2860 等) | ✓ OK |
| 4 | 绝不删演义模式 `_timeAnomaly` 标签 | runtime + char | 无具体行 | ✓ runtime L900·1181 (生成) + L2933·2957·2975·3028 (使用) + L1265·2912 (默认) | ✓ OK |
| 5 | 绝不改半文言风格 | LLM prompt 文案 | 无具体行 | ✓ "150-250 字" 出现 runtime L1037 + 多处 prompt 文言指令 (~10 处) | ✓ OK |
| 6 | 绝不删殿试代主 6 身份分类 | `_kejuClassifyDelegate` | tm-keju.js L660 (v7 加 D4 第 7 类) | ✓ L660 (6 分类: 太子/首辅/礼部/宗室/权臣/武将) | ✓ OK |
| 7 | 绝不删党派推荐机制 | `renderExaminerSelectStage` | runtime ~L656 (_partyRecs 段) | ✓ L656-664 (各党 influence>20·选最高 intel) | ✓ OK |
| 8 | 绝不简化经费三级 fallback | `_kejuSettleCentralCost` | tm-keju.js L925 | ✓ L925 (国库→内帑→流产) | ✓ OK |
| 9 | 绝不破坏 7 处持久化数据流 | 多处·_courtRecords/_edictTracker/qijuHistory/jishiRecords/eventBus/NpcMemory/AffinityMap | 无单一函数·多触点 | ✓ `_keyiPersistToCourtRecords` L2212·`_kejuWriteJishi` L2299·`_keyiMemoryEffects` L2311·分布 _qiju/EB/NpcMemory/AffinityMap 各 ~10-20 处 | ✓ OK |
| 10 | 绝不替换 wuchang 5D | char schema·`_aiGenerateFullCharacter` | runtime L2950 wuchang prompt | ✓ L2950 + L3009 (wuchang: {ren,yi,li,zhi,xin}) | ✓ OK |
| 11 | 绝不发明新代价 paradigm·复用 council/edict/defy 三 tier | `startKejuByMethod` | tm-keju.js L247 (3 method 分支) | ✓ L274/277/283 三 branch | ✓ OK |
| 12 | 绝不删 NpcMemorySystem.remember + AffinityMap.add 双轨写入 | 多处·`recruitCandidate`/`_pickDianshiDelegate`/`selectExaminer`/`_keyiMemoryEffects` 等 | 无单一函数 | ✓ NpcMemorySystem.remember 出现 9 处·AffinityMap.add 出现 10 处·双轨齐全 | ✓ OK |

**red line 实测核对总结**·**12 条 red line 函数 / 范围全部存在** ✓·无错位·sprint plan §4 描述精准。**1 处需注意**·red line #6 v7 D4 后加宦官第 7 类·`_kejuClassifyDelegate` 现 6 分类需扩 (Slice D1·明清 only)。

---

## §6·v7 改动量估算

按 §1 函数表统计·

### tm-keju.js (33 函数)

- **[keep]**·22 函数 (`_kejuQueryLibuStance` / `startKejuByMethod` / `_kejuGenChiefExaminerMemorial` / 经费链 4 函数 / 历史名臣 / `_kejuSettleCentralCost` / urgent banner 链 4 函数 等)
- **[refactor]**·9 函数 (proposeKejuPreparation [B3] / resolveKejuCouncilResult [B3] / openDianshiDelegatePicker [D1] / _kejuClassifyDelegate [D1] / _pickDianshiDelegate [D1] / openKejuPanel [A0.5·K1] / requestEnableKeju [A1·重写] / startKejuReform [A1·J3] / 等)
- **[delete]**·1 函数 (`manualStartKeju` L219·已注废弃)
- **改动量**·~30% 函数 touched·绝大多数 keep

### tm-keju-runtime.js (52 函数)

- **[keep]**·~25 函数 (renderXxx 多数 / 公库 / urgent / keyi 核心 8+ 函数 / 持久化层 / 其他)
- **[refactor]**·~25 函数 (按 slice 分布)
  - Slice B1 (KejuTier): `initKejuSystem`·`_getDefaultTiers`·`_kejuUpgradeExamSchema`·`_finalizeStageAndAdvance`·`renderKejuStage` 等 ~5
  - Slice B3 (keyi 接参): `openKeyiSession`·`_keyiRenderDiscuss`·`_keyiStreamRound`·`_keyiGenAllStances`·`_keyiConfirmStart`·`checkKejuTrigger` 共 6
  - Slice C1 (examinerView): `selectExaminer`·`renderExaminerSelectStage` ~2
  - Slice C3 (会试 UX): `renderHuishiStage`·`examinerProposeTopic` ~2
  - Slice D1-D4 (殿试链): `renderDianshiStage`·`generateDianshiQuestion`·`generateDianshiResults`·`renderDianshiDecideStage`·`confirmFinalRanking`·`renderFinishedStage`·`viewAnswer` ~7
  - Slice D5 (eager): `recruitCandidate`·`_kejuFinalize`·`_kejuBasicRecruit`·`_aiGenerateFullCharacter` (重写)·`_kejuArchiveExam`·`finishKeju` ~6
  - Slice E2/E3/J1 (集成): `_kejuAggregateGradsEffect`·`_kejuAllocateGradsToOffices`·`assignOffice`·`_kejuAssignConfirm`·`_kejuAutoAssign` ~5
- **[delete]**·1 函数 (`crystallizeKejuGrad` L3131·lazy 全删·Slice D5)
- **改动量**·~50% 函数 touched·主战场重构

### 新建文件 (~21 个·从 sprint plan §10)

```
web/tm-keju-tier.js                 Slice B1 (~200 行)
web/tm-keju-presets.js              Slice B2 (~500 行)
web/tm-keju-activation.js           Slice A1 (~250 行)
web/tm-keju-learning-traits.js      Slice A0.3 (~80 行) ← 已存·已完成 Task #151
web/tm-keju-tension.js              Slice C2 (~250 行)
web/tm-keju-corruption.js           Slice C2 (~120 行)
web/tm-keju-question-ui.js          Slice C3 (~250 行)
web/tm-keju-mentor.js               Slice E1 (~200 行)
web/tm-keju-allocation.js           Slice E3 (~350 行)
web/tm-keju-disciple-graph.js       Slice F1 (~300 行)
web/tm-keju-disciple-events.js      Slice F2 (~250 行)
web/tm-keju-cohort-meet.js          Slice F3 (~200 行)
web/tm-keju-special-exams.js        Slice G1 (~350 行)
web/tm-keju-special-exam-runner.js  Slice G2 (~250 行)
web/tm-keju-school-network.js       Slice H1 (~300 行)
web/tm-keju-school-events.js        Slice H4 (~250 行)
web/tm-keju-eunuch.js               Slice I1 (~300 行)
web/tm-keju-natural-triggers.js     Slice J0 (~250 行) v7 新
web/tm-keju-indicators.js           Slice J1 (~200 行)
web/tm-keju-events.js               Slice J2 (~400 行)
web/tm-keju-scandal.js              Slice J4 (~300 行)
web/tm-keju-timeline.js             Slice K4 (~200 行)
editor-keju-detailed.js             Slice K4 (~500 行)
```

**新建 ~5800 行**·分 4 release ship。

---

## §7·开工 ready check

| 项 | 状态 | 备注 |
|---|---|---|
| 所有 sprint plan slice 涉及的现函数 verify | ✅ 通过 | 33+52=85 函数全 grep·全部存在 |
| 所有 sprint plan red line 验证 | ✅ 通过 | 12 条·全部精准·red line #6 D4 后加第 7 类需明示讨论 |
| 所有 sprint plan player op 验证 | ⚠ **9/27 行号有偏差** | 5 处 ❌ 错位 (op #7/11/18/25/27)·4 处 ⚠ 近似 (op #3/8/13/15/17)·函数都在 |
| 所有 sprint plan AI 调用点 verify | ✅ 通过 | 18 处 callAISmart 全行号精准 |
| 所有 sprint plan 顶层 namespace 检查 | ✅ 通过 | v7 新 namespace 0 冲突·绿地开发 |
| char schema 新字段 (4 个) 冲突检查 | ✅ 通过 | 全 grep 0 命中·安全合并 |

### 不一致点汇总 (按严重度)

**高严重度** — 0 项 (无 paradigm-level 偏差)·

**中严重度** — 5 处 player op 行号错位 (sprint v6.5 → v7 漂移)·

| op | sprint 标 | 实测 | 偏差 |
|---|---|---|---|
| op #7 `_keyiAbort` | runtime L2189 | L2346 | +157 行 |
| op #11 `proceedToHuishi` | runtime L683 | L727 | +44 行 (L683 是其他文件函数) |
| op #18 `startDianshi` | runtime L1004 | L1092 | +88 行 |
| op #25 `_kejuFinalize` | runtime L2625 | L2833 | +208 行 |
| op #27 `_kejuUrgentAction` | tm-keju.js L728-791 | L803 (函数定义) | L728 是其他函数 |

**低严重度** — 4 处 player op 行号近似但需细化·

| op | sprint 标 | 实测 | 备注 |
|---|---|---|---|
| op #3 `proposeKejuPreparation` | tm-keju.js L169 | 函数 L207·按钮 onclick L169 | sprint 指 onclick·应改注函数定义 L207 |
| op #8 keyi 三按钮 | runtime L1690-2148 | L1699 / L1939 / L2153 | 范围近似·真 L1699-2153 |
| op #13 textarea | runtime L758-759 | L756 / L759 | textarea L756 (非 L758) |
| op #15 殿试代主链 | tm-keju.js L623-718 | L623-712 | 范围近似·真 L623-712 |

**改进建议**·后续 sprint plan update 时·把 §4.5 表格行号按本 doc §2 全部修正一遍·避免 v8/v9 再漂。

### 准 Phase B 开工

- ✅ **B1·KejuTier 重构** — `initKejuSystem` L23 / `_getDefaultTiers` L137 / `_kejuUpgradeExamSchema` L384 / `_finalizeStageAndAdvance` L431·函数全在·tier 改造路径清楚
- ✅ **B2·9 朝代 preset** — 新文件·无现有冲突
- ✅ **B3·keyi 接参化 + checkKejuTrigger 改路径 + proposeKejuPreparation 扩参** — 3 关键函数 `openKeyiSession` L1564·`checkKejuTrigger` L170·`proposeKejuPreparation` keju L207 全 verify·**绝不重写 keyi 800 行**·头部接参 + 内部话术按 topicType 切·DoD 清晰
- ✅ **C1/C3·examiner view + 会试 UX** — `selectExaminer` L688·`examinerProposeTopic` L778·`renderHuishiStage` L737 全在
- ✅ **D1-D5·殿试链** — 7 殿试函数全 verify·D5 `_aiGenerateFullCharacter` L2917 重写·lazy `crystallizeKejuGrad` L3131 删

**baseline ready**·Phase B kickoff·无 paradigm-level blocker·只有 9 处行号需在 sprint plan 自身 update 时修。Slice 设计 ground truth 已建立。
