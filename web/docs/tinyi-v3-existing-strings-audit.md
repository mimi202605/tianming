# tm-tinyi-v3.js·中文 string + helper inventory audit (Slice 0.1)

**版本**·v2.6 Slice 0 DoD #1
**日期**·2026-05-23
**目的**·sprint 实施 mockup 时 100% preserve v3 现字串·避免 LLM 翻译 / 改名

---

## 1·v3 已暴露 window function (verified·~50 个)

```
window._cy_pickMode                       (gate override·Slice 0 加 v3On check)
window._ty3_open / _ty3_openPreAudit
window._ty3_paPickPending / _ty3_paUpdateProposer / _ty3_paUpdateForecast
window._ty3_settleArchonGrade
window._ty3_phase1_openSeating / _ty3_phase1_startDebate / _ty3_phase1_cancel
window._ty3_phase2_run
window._ty3_phase5_openDraftPicker / _ty3_phase5_pick / _ty3_phase5_pickFree / _ty3_phase5_skip
window._ty3_phase3_open / _ty3_phase3_qinDing / _ty3_phase3_doPublicVote / _ty3_phase3_skip
window._ty3_phase3_isPersonnelTopic / _ty3_phase3_buildCandidates / _ty3_collectOfficeHolderNames
window._ty3_phase6_recordSeal       (v2.6 Slice 0.5 新加 expose·Slice 8 hook 必经)
window._ty3_phase6_open / _ty3_phase6_resolveSeal / _ty3_phase6_offerVerdictNote
window._ty3_phase6_skipVerdictNote / _ty3_phase6_saveVerdictNote / _ty3_phase6_doSeal
window._ty3_phase3b_openSpawnDialog
window._ty3_doInterjectTrain / Summon / PartyLeader / Silence / Abort  (v2.6 标 SLICE_4_5_DELETE)
window._ty3_phase14_recordChaoyiSummary
window._ty3_policySanctionByGrade / _ty3_getTinyiFollowUpDelay / _ty3_recordTinyiDraft
window._ty3_enqueueTinyiFollowUp
window.terminateChronicleTrack
window._ty3_partySpawn / _ty3_partyDispose
... + v2.6 sprint 加 ~50 个 (TINYI_TOPIC_TAGS·_ty3_inferTopicTags·_ty3_calcEligibility·_ty3_getDims·... 见 sprint summary)
```

---

## 2·关键中文 string preserve 清单 (mockup 时必 1:1)

### 2.1·议前预审 4 处置·v3 L696-799

```
"留中" "私决" "下议" "明发"
"完整七阶段"    (v2.6 Slice 11·typo /div> 已修)
```

### 2.2·钦定 5 档·v3 L3370-3413

```
"S 圣旨煌煌"·"A 凛然奉旨"·"B 勉强尊行"·"C 众议汹汹"·"D 危诏激变"
```

### 2.3·4 轮辩议命名

```
"主奏起议"·"同党附议"·"敌党驳议"·"中立权衡"·"兜底补员"
```

### 2.4·朝代差异化用印·v3 L2929-2934

```
"内阁票拟"·"司礼监批红"·"诏命留中"·"强行用印"·"皇权-5"
"政事堂副署"·"军机处直递"·"朱批"
```

### 2.5·追责 4 outcome (古文·v2.9 §14.D)

```
"准奏果验" (fulfilled·≥80%)
"行而未尽" (partial·40-80%)
"奉行不力" (unfulfilled·<40%)
"适得其反" (backfire·feedback 含 "反噬/失控/恶化")
```

### 2.6·党派进化 status (v2.9 §14.A)

```
"分化"·"隐党"·"被劾"·"湮灭"
```

### 2.7·常用提示

```
"陛下" / "卿" / "臣" / "诸公" / "伏惟" / "察焉" / "圣鉴" / "圣裁"
"鸣鞭三响"·"卷帘退朝"·"廷议中止"·"议事新决·待落实"
```

---

## 3·v3 已有 bug 清单 (sprint 修过 / 留待)

| Bug | 位置 | 状态 |
|---|---|---|
| L781 typo `</div>` 缺 `<` | _ty3_paUpdateForecast | v2.6 Slice 11 已修 |
| chaoyi_pending 应为 tingyi_pending | L3690 / L3692 | v2.6 Slice 11 已修 (改名) |
| 浮按钮 paradigm (5 函数 + 2 DOM + ~80 CSS) | L545-682 | v2.6 Slice 0 加 SLICE_4_5_DELETE marker (Slice 4.5 删) |
| `_ty3_phase6_recordSeal` 未 window expose | L2778 | v2.6 Slice 0.5 已 expose·Slice 8 hook 装得上 |
| `CY._ty3.currentPhase` 只 init 'opening' 不 update | L1780 | v2.6 Slice 4.5 加 8 处 update |
| affinity 是 number·sprint 误写 .toEmperor | (sprint doc·非 v3) | v2.6 Slice 8 patch 修 |
| _imprisoned·非 _inPrison | tm-wendui-prison.js·v3 doc | v2.6 Slice 2.5 / 7.5 enforced |
| _chronicleTracks 复数 | v3 L3378 / L3865 | v2.6 Slice 0.0b / 11 enforced |

---

## 4·sprint mockup 字符串 fidelity rule

- doc / mockup / smoke 引 v3 string 必 1:1 复制·**禁翻译 / 改写**
- 4 outcome (准奏果验 / 行而未尽 / 奉行不力 / 适得其反) 是 v3 古文 label·必保留
- 5 档 (圣旨煌煌 / 凛然奉旨 / 勉强尊行 / 众议汹汹 / 危诏激变) 必保留
- 浮按钮 5 选项 "朕欲让某人起对" / "卿且退下" / "朕另有要事" / "朕来训示" 在 Slice 4.5 删时·语义按 §5.1.5 11 intent map 复述·**禁直翻译**
- mode 名·"augment" 非 "cite" (v2.6 Slice 5 enforced·常朝 paradigm 对齐)
- 议题 type label·"war 战和" / "succession 立储" / "reform 变法" / "judgment 重案" / "finance 财赋" / "relief 灾赈" / "appointment 廷推" / "other 其他" (v2 _ty2_genOneSpeech L308)
