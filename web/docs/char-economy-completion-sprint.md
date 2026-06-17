# 角色经济系统·补全 sprint（设计方案-角色经济.md 剩余落地）

> 起：2026-06-05　owner 拍「全做含范式重写」
> 审计基线：方案 ~55% 已落地（六资源/14×14收支/8阶层/家族共财池/历史档案库12wave/字基础/抄家基础 全在）。
> 本 sprint = 补真缺口，13 刀，保守拆分一刀一事，每刀 node smoke 验。

## 铁律
- fame / 功名(virtueMerit) / prestige 三者**独立不混**（文档§11.1 已过时，别照它合并）。
- 民心/廷议/皇威是脆弱区：改源头**叶子**，防 P-ZV7 封顶冲突 + 回合末 aggregate 蒸发。
- 通用进引擎，朝代独有归剧本数据。
- 领袖(皇帝/势力主) isNeitang/isGuoku 镜像不许碰坏。
- 不私自 ship/commit/push。

## 切片进度

### Phase A 安全增量（自成一体）✅ 全完 2026-06-05（4刀全绿·applier baseline 无回归）
- [x] **A1 抄家深化** — estimateConcealmentRatio 动态隐匿率(豪门/监察/廉洁/权贵) + estimateHiddenWealth + 五级株连(none/immediate_family/full_family/nine_generations/ten_generations)递归(无双重入账) + 抄后 socialClass=commoner/status=disgraced/fame-40。向后兼容旧 includeClan/intensity。`smoke-confiscate-tiers.js` 29断言✓。文件 tm-char-economy-engine.js（.bak-A1）。
- [x] **A2 字系统深化** — COURTESY_TEMPLATES 语义词库(义根末字→典型表字·同义/反义/典故) + COURTESY_SEMANTIC 关联字 + generateCourtesyName 三级(词库→关联→兜底) + formatAddress 完整称呼树(皇帝/眷顾/正式/上下级/亲疏/敌对/家族)。prompt 补一行「称字称名之别」(tm-endturn-prompt.js·String.fromCharCode(10)免转义)。`smoke-courtesy-address.js` 37断言✓。
- [x] **A3 公库深化** — getCharPublicTreasuryDisplay 统一只读镜像(闲职全零·自动绑定linkedPost) + pursueTreasuryDeficit 去职追亏(非善意去职扣私产补亏·不造负债·盈余天然留任无需移交)。配额系数:office-system `_inferPublicTreasuryByRank` deptBoost+quota×4 已足,朝代系数归剧本不硬编。`smoke-public-treasury-a3.js` 16断言✓。applier onDismissal 接追亏(.bak-A3)。
- [x] **A4 阶层身份转换触发器** — reconcileSocialClassOnAppointment(绕sticky·平民/商/地主/僧道入仕→文/武官·受爵世袭→勋贵·皇族不降) 接 onAppointment(中央钩子·6+调用方覆盖科举/捐纳) + setSocialClass显式设置器。获罪→庶人在A1。`smoke-social-class-transition.js` 12断言✓。

### Phase B 名望 ✅ 全完 2026-06-05
- [x] **B1 名望涨降事件源** — ⚠审计false-negative纠正:政绩/救灾/水利/教育/赈济 fame **已由 applier:1040 localAction 映射表接好**(disaster_relief+4等)。真缺口:军事胜败fame、改革成败fame、叙事类(冤案/党争被贬/私德家族丑闻/投敌/著文/生祠/退隐)。建 engine FAME_EVENTS表+applyFameEvent。
- [x] **B2 名望四影响消费** — 3/4落地(均在vm加载真`_ty3_*`函数验证·非公式复刻)：①话语权 composite×(1+fame/100)clamp[0.5,1.5] @_ty3_calcEligibilityByPrestige；②弹劾防护 `_ty3_impeachmentVerdictGrade`加可选accusedCh参·score-=fame/25(高名望难扳/名声坏易成案)·两调用方传参；③改革通过率 高fame proposer urgency+1 @_ty3_calcUrgency。fame≠prestige纯增量。`smoke-fame-tinyi-b2.js` 8断言✓。**④民众敬爱→民心 并入C1**(避免双触民心叶子)。
  - B1基础设施:engine `FAME_EVENTS`(19种)+`applyFameEvent` + prompt一行重大事件fame指引(仅限重大事件防双计)·`smoke-fame-events-b1.js` 9断言✓。

### Phase C 变量联动 ✅ 安全核心完 2026-06-05（#7民心/#4 emperor 单列）
- [x] **C1 §XI七联动·安全核心** — engine `tickCharVariableLinkages(ch,mr)` 从 tickCharacter 调(全 char 叶子字段·零碰脆弱文件)：#1 环境腐败`GM.corruption.subDepts[dept].true`→integrity双向(浊>50加速堕落/清明<30约束贪官)；#2 皇威`GM.huangwei.index`段位+皇权弱+野心→loyalty温和漂移(×0.5 不压恩德系统·`loyaltyToEmperor`字段不存在→用真字段loyalty)；#3 暴君段(>90)→在朝官stress累积。#6 selectPowerMinister 早完(authority-complete:121)。`smoke-char-var-linkage-c1.js` 12断言✓。
  - **余 task#29**：#7 地方官integrity+fame→辖区民心(安全路径=`TM.MinxinLedger.recordAndApply` 源封顶·需region-governor映射+核对不双驱)；#4 emperor宠信疑忌→health(需建`GM.emperor`子系统·超范围暂搁)。

### Phase D 行为权重 ✅ 完 2026-06-05
- [x] **D1 computeBehaviorWeights + AI prompt 注入** — engine `computeBehaviorWeights(ch)` 9权重(受贿/挪用/政治话语/豪奢/党资/反腐敏感/离职/谋反/荐才·按六资源)。**注入方式=挂进 buildEconomySnapshot.behaviorWeights → 顺势流入既有 NPC prompt CharacterEconomy(JSON)块**(零改 tm-npc-decision·零单独prompt编辑·`_npcBuildCharacterEconomySnapshot` 本就 Object.assign buildEconomySnapshot)。阈值朝代中立(BW_MIDCLASS/BW_RICH 引擎默认)。`smoke-behavior-weights-d1.js` 20断言✓·ai-context/family-tier回归绿。

### Phase E 范式重写 ✅ 全完 2026-06-05
- [x] **E1 私产五大类数组 overlay + `_calcPrivateSummary`** — 明细数组键 landHoldings[]/houses[]/shops[]/treasures[]/familyBusiness[]/debts[]/investments[](与扁平聚合并存不冲突·land 冲突用 landHoldings)；calcPrivateSummary 数组优先折算/缺则回退扁平；snapshot 加 privateSummary；领袖 isNeitang 镜像走 money/grain/cloth 不受影响。`smoke-private-summary-e1.js` 8断言✓。
- [x] **E2 私产细粒度收支** — Income 加 shopRevenue/businessProfit(按partner分红)/investmentReturn(违约不计)/landRentDetail；Expenses 加 houseUpkeep(年维护/12+奢华月耗)/debtService(按笔月息)；**数组在则对应扁平 commerce/rent/estate/debtInterest 跳过(防双计)**；新 income 键入 tick 白名单。`smoke-private-granular-e2.js` 14断言✓。
- [x] **E3 家族 communal/divided 模式 + 继承** — `FAMILY_MODE_DEFAULT`朝代表+`familyModeOf`(clan.mode覆盖)；tickClanPool 分家跳共财池；distributeInheritance honor clanRules.inheritance(eldest_son/equal/merit_based)。`smoke-family-mode-e3.js` 12断言✓。
- [x] **E4 运行时自动补齐** — `detectMissingFields`显式 + `ensureCharComplete`(确定性补 gender/age/十维50/资源/字)；**tick 全 char 扫描收口五类触发**(任何途径进来的新char下tick必补全·AI散文/家谱深度仍由 aiGenerateCompleteCharacter 创建时负责)。`smoke-ensure-char-complete-e4.js` 14断言✓。

## ✅ task#29（C1 余 #7）完 2026-06-05
- **#7 地方官→辖区民心**：⚠**实查救场**——整廉→民心**早由 `authority-engines:905-906` `adjustMinxin('localOfficial')` 驱动**(audit false-negative)。差点再加 MinxinLedger 平行驱动=**双驱 clobber**(民心 disaster 区根因)，已避开。改为**复用同一 localOfficial 源**：整廉块后加「民众敬爱」fame 块(beloved官>hated→+0.05×min(3,diff)/反之-·防单回合暴冲·并入同封顶源不双驱)。`smoke-local-official-fame-task29.js` 5断言(真 authority-engines.tick 验)·回归绿。.bak-task29。
- **#4 emperor 宠信疑忌→health**：需先建 `GM.emperor.suspicionOf/favorOf` 子系统(本库不存在)·超本 sprint 范围·搁置。

---
## 🎉 SPRINT 完工 2026-06-05
**13/13 刀全落地·13 个新 smoke 共 210 断言全过·既有经济/applier/authority 回归全绿。** 全部**未 ship**(按纪律等 owner 显式触发热更·建议先 live 跑几回合 playtest 看私产 tick / §XI 联动 / 自动补齐的真游戏多回合行为)。改过文件:tm-char-economy-engine.js(主·.bak-A1)、tm-ai-change-applier.js(.bak-A3)、tm-endturn-prompt.js、tm-tinyi-v3.js、tm-authority-engines.js(.bak-task29)。仅 #4(emperor子系统)超范围未做。

## 关键落点备忘
- 抄家：confiscate 内 estimateHiddenWealth 会 re-normalize r.privateWealth → pw 须在其后取（A1 踩过坑）。
- 调用方：confiscate 被 tm-char-economy-ui.js:426 + tm-economy-engine.js:1912 调用（旧形态 {intensity,includeClan,destination}）。
- prompt：已有「称谓系统」永久注入块在 tm-endturn-prompt.js ~2194（dynasty 级，别重复造）。
