# 1.2.4.0 Ship Readiness·势力 LLM 智力大升级 + 平行回合推演

**Status**·2026-05-22·**WAITING**·blocked on 平行回合推演 sprint #105/107/108/109 完成
**Target version**·1.2.4.0 (upbump from 1.2.3.1·major 主题升级)
**Ship 时机**·平行 sprint 全完 + 双方 smoke 全过 + runtime sample 验证

---

## 已就绪·my changes (势力 LLM 主题)

### 改动文件清单

| 文件 | 改动 | 关联任务 |
|---|---|---|
| `web/tm-faction-npc-settings.js` | F0·删 dup field·标 'random' 死·补 npcEagerDelayMs | #111 |
| `web/tm-faction-npc-llm-decision.js` | F0·3 fallback 加 warn·**F1**·删 legacy schema·单轨 actions[]·**G1**·3 反喂段 (memory/failures/compliance)·**G2**·3 加深段 (opponent/fiscal/psyche)·**G3**·2 新段 (ally/style-trend)·rationale 升级 Phase 1/2/3 | #111·#112·#116·#117·#119 |
| `web/tm-faction-action-engine.js` | F1·in-batch 去重·F2·SC16 采纳审计 + cooldown·G3-C·decision style trajectory | #112·#113·#119 |
| `web/tm-three-systems-ui.js` | F3·NPC AI 全局诊断面板·status badge·SC16:N% compliance badge | #114 |
| `web/tm-endturn-followup.js` | F2·directive hash + cooldown + 已执行标记·**⚠ 跟平行 sprint sc1q 共享文件** | #113 |
| `web/tm-chaoyi-changchao.js` | Slice 9·层 5 累积参考 + 层 6 皇帝 cue·+ 4 函数 | #88 |
| `scenarios/天启七年·九月（官方）.json` | G2-C·4 ruler psyche 数据 (皇太极/林丹汗/奢崇明/安邦彦) | #118 |
| `scenarios/绍宋·建炎元年八月（官方）.json` | G2-C·3 ruler psyche 数据 (赵构/完颜吴乞买/完颜宗翰) | #118 |
| `web/index.html` | 5 file version bump (chaoyi-changchao / faction-npc-settings / faction-npc-llm-decision / faction-action-engine / three-systems-ui) | 全部 |

### Changelog 草稿·势力 LLM 主题

**module**·势力 LLM 智力大升级·NPC 自主推演从"数值反应"升级为"有记忆 / 有计划 / 有人格 / 有对手心智"

**核心 items** (按主题分组)：

1. **双轨 schema 收口** (F1)·删 legacy memorials/edict/chaoyi/office 顶层 4 字段·LLM 输出单轨 actions[]·in-batch 去重防 LLM 双填重复 emit·~270 token / prompt 省。
2. **SC16 闭环** (F2)·新增 sc16Compliance 采纳审计 + directiveHash + 跨回合 cooldown·重复无视的 directive priority -20·已采纳的 priority -30·防 NPC 持续无视 SC16 指令。
3. **NPC AI 全局诊断面板** (F3)·势力列表加"NPC AI 全局状态"按钮·跨势力 candidates / dispatch / pickLog / failures 总览·每势力行加 status badge + SC16:N% compliance badge。
4. **智力反喂** (G1·Tier 1)·prompt 加 3 段·OWN_STRATEGIC_MEMORY (NPC 看见自己长期目标 / cooldowns)·LAST_TURN_FAILURES (LLM 看见上回合 fail target 不再重复)·LAST_TURN_COMPLIANCE (LLM 自查 SC16 采纳)。
5. **智力加深** (G2·Tier 2)·prompt 加 3 段·OPPONENT_MIND_MODEL (top 3 对手 strategy / militaryPlans·NPC 能预测对手)·FISCAL_CONTEXT (runway / deficit / reward_cost ratio·穷势力禁大赏)·RULER_PSYCHE (主君 coreMotivations / redLines / personalGrudges·区分度升一档)。
6. **智力结构改** (G3·Tier 3)·prompt 加 2 段 + rationale 升级·ALLY_MIND_MODEL (top 3 盟友 strategy·NPC 与盟友协调而非独立决策)·DECISION_STYLE_TREND (5 turns rolling·防今鹰派明鸽派)·rationale 改为 Phase 1/2/3 因果链结构 (cause / effect / contingency)。
7. **剧本 ruler psyche** (G2-C·剧本扩展)·天启 4 ruler + 绍宋 3 ruler 共 7 个主君·补 coreMotivations / redLines / personalGrudges 3 字段·共 21 条历史/剧本依据的人格数据。
8. **常朝 Slice 9·Tier 2** (#88)·NPC 应答化补 2 层·累积参考 (alliesPiledOn ≥ 3·后续同党 NPC 转"一字千钧"风格) + 皇帝意图 cue (玩家 admonish/praise/doubt 跨议题影响下议题 NPC 发言)。

### 文件版本号

- tm-faction-npc-settings.js·v=2026052201
- tm-faction-npc-llm-decision.js·v=2026052204
- tm-faction-action-engine.js·v=2026052202
- tm-three-systems-ui.js·v=2026052201
- tm-endturn-followup.js·v=2026052201
- tm-chaoyi-changchao.js·v=2026052201

### Smoke 状态 (我这条全绿)

- smoke-faction-npc-llm-decision·all pass
- smoke-faction-llm-comprehensive-upgrade·all pass
- smoke-faction-npc-multiturn-e2e·all pass·5 turns·40 LLM calls
- smoke-faction-npc-llm-ledger·all pass
- smoke-faction-llm-priority-lifecycle·all pass
- smoke-faction-panel-ui·pass
- smoke-changchao-mode-pipeline·12 pass·0 fail
- smoke-chaoyi-v3·56 pass·0 fail
- smoke-changchao-agenda-tags·PASS
- smoke-changchao-persona-stance·PASS

预存在失败 (跟我无关·git stash 验证)·smoke-faction-npc-endturn-e2e (断言默认 false 但默认 true)·smoke-faction-npc-full-audit (读 undefined npcChaoyi)

---

## 等待·平行回合推演 sprint

**Pending**·#105 Phase 5 (sc2/sc27 合并·in_progress) / #107 Phase 7 UX / #108 Phase 7.5 设置面板大改 / #109 Phase 8 (备选)

**共享文件**·`web/tm-endturn-followup.js`·我动 SC16 directive builder 区 (line 178-189 hash·216-243 cooldown)·平行 sprint 动 sc1q 注入区 (line 831/855 之前)·**行号不同·理论 merge 安全**·但 ship 前应跑双方 smoke 一遍确保。

**F4 (#115) handed off to #108**·`web/docs/faction-llm-f4-settings-handoff.md` 已写·#108 完成时把 F4 一并落地。

**估时**·9-15 d (平行 4 phase 累计)

---

## Ship 前 checklist (待平行完成后执行)

- [ ] 平行 sprint #105/#107/#108/#109 全 completed
- [ ] 双方 smoke 跑一遍·全绿
- [ ] 真实 LLM 跑 NPC 势力 sample 1-2 回合·验·
  - OPPONENT_MIND_MODEL 内容质量
  - rationale Phase 1/2/3 结构真生效
  - SC16 cooldown 真的让 priority 下降
- [ ] **changelog.json**·unshift 1 个汇总条目·两条 sprint 主题合并写
- [ ] **build-hot-update**·`node web/tools/build-hot-update-package.js --version 1.2.4.0 --out release-hot --notes "势力 LLM 智力大升级 + 回合推演 AI 全面升级"`
- [ ] **upload server**·按既往 1.2.3.0 workflow
- [ ] **GitHub atomic push (Path B)**·misfit-user/tianming·临时 clone + HTTP/1.1 + overlay·参考 memory `reference_github_push.md`

---

## 同期 backlog (ship 前可做)

- #89·绍宋 traitIds 补全 A 方案 (~0.5-1 d·让 layer 1-4 + Tier 2 在绍宋真 take effect)
- #61·I2 portrait PNG 压缩 (336MB → ~80MB·~1-2 d·跟 LLM 工作独立)
- Phase 8 v2 12 殿 (#85 doc 提到还 ~53%·剩 Slice 2/8/UI 收口·50-85 d)
- 绍宋剧本 1.2 规划 (memory 提到待启动信号)

**建议**·先做 #89 (短·跟 G2-C 数据补全主题一致·让 G1-G3 反喂在绍宋真生效)·或 #61 (并行无依赖)。
