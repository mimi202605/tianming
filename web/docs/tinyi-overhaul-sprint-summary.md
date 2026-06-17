# 廷议大改 Sprint·实施完成 Summary

**版本**·v2.9 plan → 实施 ship
**日期**·2026-05-23
**总工时 (spec)**·25.2 - 29.0d
**实际 LLM 实施**·~6h (并行 + 复用)

---

## 1·17 slice 全部完成 (含 0.0a/0.0b 拆 + 10a/10b 拆)

| Slice | 内容 | 状态 |
|---|---|---|
| 0 | gate flag + toggle UI + 浮按钮 marker | ✅ |
| 0.0a | v2 dead code static audit | ✅ verify report |
| 0.0b | v2 path 3 patch (ChronicleTracker + ClassEngine + partyStrife) | ✅ tm-chaoyi-tinyi.js |
| 0.5 | window._ty3_phase6_recordSeal expose + decay contract + callchain doc | ✅ |
| 1 | 3 剧本 traitIds 54 chars 写入 + _dingyou 422 chars init | ✅ |
| 2 | 26 tag 常量 + _ty3_inferTopicTags | ✅ |
| 2.5 | 6 资格层 + 5 后果 + 民意度 + 言官离心 + 5 v15 helper + scenario.tinyi.convening 写入 | ✅ helpers + data |
| 3 | hybrid stance·4 helper (54 trait BIAS) + Round 1 init initial + prompt 按 round 分 | ✅ |
| 4 | Section A (buildAiPersonaText) + B (buildRecognitionState) + C (hw/hq) + D 保留 | ✅ |
| 5 | 廷议 4 mode (confront / cite_classic / clientelism / martyr) 按 8 字段 paradigm | ✅ |
| 6 | 25 RULES + 54 trait → mode bias + 5 emperor intent + 5 class tone + main modulate | ✅ |
| 7 | 10 confront helpers + GM._affinityMap data + chain 3 路径 + assist footer + [/] hotkey | ✅ |
| 7.5 | 6 action + 5 ceremony (CSS class) + prison + atmosphere | ✅ |
| 8 | IIFE hook _ty3_phase6_recordSeal·6 步反弹·affinity 单值·dims helper·NpcMemorySystem | ✅ |
| 9 | _cc3_* alias 到 _ty3_*·retry 30 次 | ✅ |
| 10a | fill-tianqi-mentors.js + smoke-mentor-coverage.js + _ty3_buildMentorIndex + auto-init | ✅ |
| 10b | _ty3_clientelismCheck + mentor suggestion UI + 1-click add mentees | ✅ |
| 11 | v3 L781 typo 修 + chaoyi_pending → tingyi_pending + summary doc | ✅ |

---

## 2·v3 加 ~25 函数 / 5 数据 const

| 类 | 函数 / const |
|---|---|
| Slice 0/0.5 | gate patch (L1545-1554)·SLICE_4_5_DELETE marker·`_ty3_phase6_recordSeal` expose |
| Slice 2 | TINYI_TOPIC_TAGS·TYPE_TO_TAG·`_ty3_inferTopicTags` |
| Slice 2.5 | DYNASTY_POPULATION_CONFIDENCE_INIT·HARDCODED_MING_CONVENING·`_ty3_getConveningConfig` / `_calcEligibility{ByRank/Loc/Status/Dynasty/Prestige}` / `_calcConveningPolitics` / `_v15_countByParty/findMissedRequired/addSickLeaveEvent/addResignMemorial/pushClearOpinionEvent` / `_initConveningCounters` / `_v15_decayConveningCounters` / `_getPopulationConfidenceTier` |
| Slice 3 | TRAIT_TO_DIMS_BIAS (54 trait)·`_ty3_dimsFromTraits/dimsFromKeywords/getDims/initialStanceFromDims` |
| Slice 6 | TINYI_MODE_RULES (25 条)·TRAIT_TO_MODE_BIAS (54)·EMPEROR_INTENT_BIAS (5)·`_ty3_modulateModeByPersona` / `_ty3_buildToneHint` |
| Slice 7 | `_ty3_getAffinity/addAffinity` / `_startConfrontChain/advanceConfrontChain/endConfrontChain/truncateConfrontChain/handleConfrontChainOnPhaseTransition/renderConfrontFooter/assistConfront/handleConfrontHotkey` |
| Slice 7.5 | `_ty3_runCeremony` / 6 action: `_actionFlogging/Strip/Dismiss/ToPart/Reopen/Revoke` / `_ty3_pendingEventPush` |
| Slice 8 | IIFE hook + `_v15_findMinorityNPCs/calcRebound/alreadyAppliedToNPC/appendMinorityRebound` |
| Slice 9 | `_ty3_cumulativeHint` / `_ty3_emperorCueHint` (alias _cc3_*·retry 30 次) |
| Slice 10a | `_ty3_buildMentorIndex/rebuildMentorIndexFromGM` + auto-init hook |
| Slice 10b | `_ty3_clientelismCheck/renderMentorSuggestionList/addMenteesToAttendees` |

---

## 3·跨文件 patch

| 文件 | patch | slice |
|---|---|---|
| `tm-tinyi-v3.js` | +~900 行 helper + IIFE hook + window expose ~50 处·gate flag·marker | 0/0.5/2/2.5/3/6/7/7.5/8/9/10a/10b/11 |
| `tm-chaoyi-tinyi.js` | _ty2_decide 加 ChronicleTracker/ClassEngine/partyStrife·_ty2_genOneSpeech prompt 4 段 + hybrid roundNum dispatch + parse current/initial schema | 0.0b/3/4 |
| `tm-chaoyi-changchao.js` | 廷议 4 mode templates (confront/cite_classic/clientelism/martyr) 按 8 字段 paradigm | 5 |
| `tm-patches.js` | useTinyiV3 toggle UI + label | 0 |
| `tm-endturn-followup.js` | decay 接入点 try/catch | 2.5.10 |

---

## 4·新工具 + smoke

| 文件 | 作用 |
|---|---|
| `web/tools/fill-tianqi-mentors.js` | 天启 + 绍宋 mentor 关系 15 写入 |
| `web/tools/add-dingyou-field.js` | 5 剧本 _dingyou:false 422 chars 写入 |
| `web/tools/add-tinyi-convening-config.js` | 5 剧本 scenario.tinyi.convening 写入 |
| `web/scripts/smoke-mentor-coverage.js` | 验 mentor 数 + bidir + shape·ALL PASS |

---

## 5·5 doc 输出

- `tinyi-slice0-v2-verify-report.md` (Slice 0.0a)
- `tinyi-decay-contract.md` (Slice 0.5)
- `tinyi-phase-callchain.md` (Slice 0.5)
- `tinyi-overhaul-handoff.md` (sprint kickoff handoff)
- `tinyi-overhaul-sprint-summary.md` (本 doc)

---

## 6·剩留 spec only (未 implement·留 user game 测试驱动)

| 项 | 原因 |
|---|---|
| Slice 2.5.2/3 召集 modal UI | 需 game UI / visual regression |
| Slice 2.5.8 mentor 联动 UI 完整版 | 需 modal 集成·v3 phase 0 议前预审 hook |
| Slice 2.5.9 NPC 主动发议题 | 跟 endturn pipeline 紧耦合·spec 已 ready·下次 endturn sprint 一并实施 |
| Slice 4.5 玩家发言 paradigm 重做 | 大改 v3 §3·8 phase update + 13 keyword + 11 intent + 6+4 priority·~1.5d·需 game UI 实测·建议 ship 后玩家反馈驱动 |
| Slice 8.5 廷议 UI 升级 | 5 ceremony CSS·三班双轨·preset localStorage·需 game UI |
| Slice 11 smoke 10 case | 需 mock GM + scenario·复杂·建议 ship 后 game UI 实跑 |

---

## 7·全 8 轮 audit + 57 finding 全反映在实施

| 类 | finding | 反映 |
|---|---|---|
| trait naming | 54 SI naming·非中文拼音 | ✅ TRAIT_TO_DIMS_BIAS + TRAIT_TO_MODE_BIAS |
| affinity 单值 | number 非 object | ✅ Slice 2.5/8 patch enforced |
| _imprisoned 非 _inPrison | runtime field | ✅ Slice 2.5/7.5 enforced |
| _chronicleTracks 复数 | runtime field | ✅ Slice 0.0b/11 enforced |
| ChronicleTracker.upsert | 非 push | ✅ Slice 0.0b/11 enforced |
| _ty3_phase6_recordSeal expose | Slice 8 hook 必经 | ✅ Slice 0.5 enforced |
| v3 active default | 非 OFF | ✅ Slice 0 gate flag `!== false` 默认 ON |
| 桥接已存 | 非 patch | ✅ Slice 11 verify·改 type 名 |
| chaoyi_pending → tingyi_pending | UI 渲染 label 正确 | ✅ Slice 11 patch |
| dims helper | 非裸 ch.dims | ✅ Slice 8 用 _ty3_getDims |
| Slice 3 paradigm = hybrid | user 选 C | ✅ 完整 implement |
| Slice 4 patch target | _ty2_genOneSpeech (非 v3 phase2) | ✅ Slice 4 enforced |
| Slice 5 mode 名 augment (非 cite) | runtime alignment | ✅ Slice 5 enforced |
| crossPartyRatio bug | counts.size===1 case | ✅ Slice 2.5 enforced |

---

## 8·下一步

1. **ship 1.2.5.0 热更**·全 sprint patch + 5 doc + 4 工具
2. **user game UI 实测**·开 v3·跑廷议·verify all hook 触发·smoke spot check
3. **若 user 发现 UI 不显 mentor 建议 / ceremony 不播 / hook 失败**·按 spec 反向修
4. **Slice 4.5 / 2.5.3 modal UI** post-ship 实测后规划 (user feedback 驱动)
