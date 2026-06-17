# 常朝大改 Sprint·完整 kickoff plan

date·2026-05-21·status·**Slice 0 完·已加 A+B 双管修正·待启动 Slice 1**

**Slice 0 verify gate 报告**·`web/docs/changchao-overhaul-slice0-report.md`·5/6 pass·1 critical risk (绍宋 traitIds 0%) → user 拍板 A+B 双管。

**Sprint 修订**·

- ✅ Slice 0 已完·`tm-npc-engine.js` 末尾加 `TM.NpcEngine` namespace export·`scripts/_baseline-changchao-before-prompts.json` 已 dump 11 NPC × 议题 baseline (天启 5 + 绍宋 6)
- ✅ v3 spec 已 5 处 correction (8D 英文 key·±scale·AffinityMap.add·NpcMemorySystem positional)
- ✅ v3 spec 已加 §4.5·personality-text fallback (B 方案·绍宋 personality 字符串 keyword 推 dims)
- ⏳ Slice 5 工作量 +0.5d (含 B fallback 实现)
- ⏳ 新加独立 slice·**绍宋 traitIds 补全** (A 方案)·~1d·sprint 完后做·不阻塞 Slice 流

source·

- `web/docs/chaoyi-changchao-improvements-backlog.md` (1+2 详 + 3 摘要)
- `web/docs/chaoyi-npc-dialogue-design-v3.md` (项 3 v3 完整 spec)
- `web/docs/chaoyi-stance-weights-longterm.md` (项 4 长期·不在本 sprint)

---

## 1. Sprint 目标

把常朝从 **60% 合规·40% 分裂** 升级到 **~95% 合规**·一次性闭环·

- ✅ NPC 自发表态 persona 跟 wendui 持平 (项 1)
- ✅ stance 推导 persona-first 而非 stat-first (项 2)
- ✅ NPC 之间形成 dialogue 链·非平行陈述 (项 3)
- ✅ 朝议**塑造**派系网·rebut/second 留痕到 AffinityMap (项 3·linkage)
- ✅ test harness 守门·后续不退化 (项 3·smoke)

**不在本 sprint**·

- 项 4·立场权重剧本化 (长期方案)
- yuqian / tinyi 跨场景 port (Slice 8 完成后再评估)
- fallback 模板 persona-aware (user 拍板不做)

---

## 2. 依赖图

```
                            ┌──────────────────────────────┐
                            │  Slice 0·prep + baseline      │
                            │  (read API·capture before·    │
                            │   verify TM_NPC_Engine 入口)   │
                            └──────────┬───────────────────┘
                                       │
              ┌────────────────────────┼─────────────────────────┐
              │                        │                         │
              v                        v                         v
   ┌────────────────────┐  ┌────────────────────┐   ┌──────────────────────┐
   │ Slice 1·项 1        │  │ Slice 2·项 2 Step A │   │ Slice 4·项 3 Step A   │
   │ aiPersonaText 注入  │  │ 议题 tagging        │   │ debate state +        │
   │ 30min               │  │ 0.5d                │   │ base mode·1d          │
   └────────────────────┘  └─────────┬──────────┘   └────────┬─────────────┘
                                     │                       │
                                     v                       │
                          ┌────────────────────┐             │
                          │ Slice 3·项 2 Step B │             │
                          │ 8D persona 接入     │             │
                          │ stance·1d          │             │
                          └─────────┬──────────┘             │
                                    │                        │
                                    └────────┬───────────────┘
                                             │
                                             v
                                  ┌────────────────────────┐
                                  │ Slice 5·项 3 Step B     │
                                  │ persona modulation +    │
                                  │ tone modulation·1d      │
                                  └─────────┬──────────────┘
                                            │
                                            v
                                  ┌────────────────────────┐
                                  │ Slice 6·项 3 Step C     │
                                  │ anti-monotony guards +  │
                                  │ NPC-NPC linkage·0.8d    │
                                  └─────────┬──────────────┘
                                            │
                                            v
                                  ┌────────────────────────┐
                                  │ Slice 7·项 3 Step D     │
                                  │ prompt 拼接 +           │
                                  │ manual sample·0.4d      │
                                  └─────────┬──────────────┘
                                            │
                                            v
                                  ┌────────────────────────┐
                                  │ Slice 8·test harness +  │
                                  │ DoD 验收·0.8d           │
                                  └─────────┬──────────────┘
                                            │
                                            v (optional)
                                  ┌────────────────────────┐
                                  │ Slice 9·Tier 2          │
                                  │ cumulative + emperor    │
                                  │ cue·1.5d                │
                                  └────────────────────────┘
```

**关键依赖**·

- **Slice 5 强依赖 Slice 3** (persona modulation 用 8D 聚合 API)
- **Slice 5 强依赖 Slice 4** (modulation 修正的是 base mode)
- **Slice 7 强依赖 Slice 5+6** (prompt 拼接所有层产出)
- **Slice 1·2·4 互相独立**·可并行 (但实际上一个人做·按顺序)

---

## 3. Slice 详表

### Slice 0·prep + baseline·0.5d

| 任务 | 输出 |
|---|---|
| 读 `TM_NPC_Engine.aggregateDims` 入口·确认 API signature | code note·`aggregateDims(char) → { yonggang, renshan, ... }` |
| 读 `TM.PromptComposer.buildAiPersonaText` 入口·确认返回格式 | code note |
| 跑现状 baseline·5 NPC × 5 议题·收集 selfReact / debate 输出 | `scripts/_baseline-changchao-before.json` |
| 检查 existing 议题是否已带 tags 字段 | scenario 5+ × 议题 N·tag 覆盖率 (预期 ~0%) |
| 装 baseline·mode 分布 (现在都是 N/A·无 mode) | mode trace = null |

**verify gate**·能跑通 `aggregateDims(CHARS['李纲'])`·有非空 8D 输出。

### Slice 1·项 1·aiPersonaText 注入 selfReact·30min

| 任务 | 输出 |
|---|---|
| 改 `tm-chaoyi-changchao.js:L799 _cc3_aiGenReact`·补 `TM.PromptComposer.buildAiPersonaText(gmCh)` + `buildRecognitionState(gmCh)` 调用 | 单文件 +5 行 |
| sample 3-5 NPC selfReact·肉眼对比 baseline 是否更有 persona 味 | manual visual check |
| 跑 verify-all | 全绿 |

**verify gate**·sample NPC 输出**明显**含 aiPersonaText 提示的人设元素 (e.g., 李纲输出含"罢相"/"恨黄潜善蒙蔽" 之类来自记忆/背景的细节)。

### Slice 2·项 2 Step A·议题 tagging·0.5d

| 任务 | 输出 |
|---|---|
| 实现 `_cc3_inferTagsFromText(item)` rule-based fallback | 单函数 ~30 行 |
| 在 `_cc3_enhanceAgendaItem` 末尾调用·`if (!item.tags) item.tags = _cc3_inferTagsFromText(item);` | +1 行 |
| 更新 scenario 议题 schema doc·`event.tags?: string[]` | doc 更新 |
| 加 smoke·`scripts/smoke-changchao-agenda-tags.js`·验现存 2 剧本议题 tag 覆盖率 ≥ 60% | 1 smoke·进 verify-all |
| 手动给天启 / 绍宋 各 3-5 个高频议题打 tag (示范) | 2 scenario.json minor edit |

**verify gate**·smoke 通过·≥ 60% 议题至少 1 tag。

### Slice 3·项 2 Step B·8D personality 接入 stance·1d

| 任务 | 输出 |
|---|---|
| 改 `_cc3_computeStanceFromChar` (L1528)·加 persona8d 读取段·若 API 不可用·skip | +20 行 |
| 加 6-8 persona × tag 贡献项·见 backlog §2 草案 | +30 行 |
| 平衡·确保 persona 修正幅度 ≤ party_tone (避免单边压过) | tune 几轮 |
| 加 smoke·`smoke-changchao-persona-stance-divergence`·同党同忠诚 NPC 不同 persona 时立场分布 ≥ 2 种 | 1 smoke |
| sample·跑 3 个不同 persona × 同议题·验证 stance 差异 | manual visual |

**verify gate**·smoke 通过·sample 显示立场差异。

### Slice 4·项 3 Step A·debate state + base mode·1d

| 任务 | 输出 |
|---|---|
| 实现 `_cc3_analyzeDebate(item, name, gmCh)` 返 8 字段 state | 单函数 ~50 行 |
| 实现 helper·`_sameParty(chA, chB)` / `_oppositeStance(a, b)` / `_wasHarmedBy(ch, target)` | 3 helper ~30 行 |
| 实现 `_cc3_baseMode(state, gmCh, item)` 6 mode 推导 | 单函数 ~40 行 |
| 单元测试·debate state 多组 combination·base mode 输出符合预期 | `scripts/test-changchao-mode-inference.js`·node 直接跑 |

**verify gate**·单测 9+ case 全过·至少含 6 个 mode 各 1 case。

### Slice 5·项 3 Step B·persona modulation + tone·1d

| 任务 | 输出 |
|---|---|
| 实现 `_cc3_modulateModeByPersona(mode, gmCh, item, state)` | ~60 行 |
| 编 15 条修正表·见 design v3 §4 | data table inline |
| 实现 `_cc3_pickTone(gmCh)` 5 套 + default | ~30 行 |
| 编朝堂语开头/结句池·见 design v3 §2 | data table inline |
| 实现优先级仲裁·tag-driven > 强制 > 弱·按维度数值 | ~15 行 |
| 单元测试·persona modulation 10+ case | extend test-changchao-mode-inference.js |

**verify gate**·单测包含·

- 仁善 70 + base rebut + oppCount < 3 → soften
- 名节 80 + ritual tag → 强制 rebut·即便 same party
- 理性 75 + historicalPrecedent tag → cite modifier flag = true
- 勇敢 80 + target=self → 强制 lead
- tag-driven vs 弱修正冲突·tag 胜

### Slice 6·项 3 Step C·anti-monotony + linkage·0.8d

| 任务 | 输出 |
|---|---|
| 实现 4 个 guard 函数·见 design v3 §6 | ~50 行 |
| guard 链装在 mode 推导末端·`(base → persona → guards) → final` | 接入 |
| 实现 `_cc3_writeNpcInteraction(name, mode, lastSpeaker, item, gmCh)` | ~40 行 |
| 接入 `_cc3_aiGenReact` 末尾 (LLM 返结果后)·AffinityMap + memory 更新 | 2-3 行 |
| 单元测试·跑 6 NPC 序列·验证 guard 1 触发 (强制改 augment)·linkage affinity 变化 | extend test |

**verify gate**·单测·

- 6 NPC 全 rebut input → guard 1 把第 3 个之后改为 soften/augment
- rebut → AffinityMap.adjust -3 ✓
- second → AffinityMap.adjust +3/+1 ✓

### Slice 7·项 3 Step D·prompt 拼接 + manual sample·0.4d

| 任务 | 输出 |
|---|---|
| 拼装函数·`_cc3_buildModeInstruction(mode, tone, state, modifiers)` | ~30 行 |
| 接入 `_cc3_aiGenReact` prompt 构造·拼到原 prompt 后 | ~5 行 |
| LLM 强约束 instruction·末尾加 "line 必须遵循应答模式·不得脱离·脱离视为生成失败" | +1 行 |
| 跑绍宋·南幸扬州议题·6 NPC × 2 round 全流程·肉眼检查 | sample output trace |
| 对比 Slice 0 baseline·**before vs after** | 写到 sprint summary |

**verify gate**·sample 6 NPC 输出 mode 分布·≥ 4 个不同 mode·每个 NPC 输出含其 mode 的关键词·affinity 至少 1 对变化。

### Slice 8·test harness + DoD·0.8d

| 任务 | 输出 |
|---|---|
| 实现 `scripts/smoke-changchao-mode-distribution.js` | 跑 30 trial |
| 实现 `scripts/smoke-changchao-content-novelty.js` | token-overlap < 0.4 |
| 实现 `scripts/smoke-changchao-persona-consistency.js` | 高 persona NPC ≥ 80% 命中 |
| 3 smoke 进 verify-all | `scripts/verify-all.js` 加 entry |
| 跑 DoD 8 项检查 (design v3 §15) | 全过 |
| 写 sprint summary doc·**before vs after**·mode 分布对比·sample 输出对比 | `web/docs/changchao-overhaul-sprint-summary.md` |

**verify gate**·全部 8 项 DoD 满足·verify-all 全绿。

### Slice 9·optional·Tier 2 cumulative + emperor cue·1.5d

| 任务 | 输出 |
|---|---|
| 实现层 5 `_cc3_cumulativeHint(state)`·alliesPiledOn ≥ 3·oppStanceCount ≥ 3·momentum 处理 | ~30 行 |
| 实现层 6·`item._lastEmperorIntent` 跨发言传递·L1720 path 写入·L799 path 读 | ~10 行 |
| `_cc3_writeActionToGM` 议题切换时 reset `_lastEmperorIntent` | ~3 行 |
| sample·6 NPC × 3 round·验证后续 NPC 因 emperor cue 改变 mode 倾向 | manual visual |
| 评估 yuqian / tinyi 是否需 port·决策记录 | sprint summary 更新 |

**verify gate**·sample 中可见·

- 玩家 punish 上一位 NPC 后·后续 NPC 更多 rebut last speaker
- alliesPiledOn ≥ 3·后续同党 NPC second 变 "一字千钧" 风格

---

## 4. Timeline + buffer

| Slice | 工作量 | 累计 |
|---|---|---|
| 0·prep | 0.5d | 0.5d |
| 1·aiPersonaText | 0.03d (30min) | 0.53d |
| 2·议题 tagging | 0.5d | 1.03d |
| 3·8D 接入 stance | 1d | 2.03d |
| 4·debate state + base mode | 1d | 3.03d |
| 5·persona + tone modulation | 1d | 4.03d |
| 6·guards + linkage | 0.8d | 4.83d |
| 7·prompt 拼接 + sample | 0.4d | 5.23d |
| 8·test harness + DoD | 0.8d | 6.03d |
| **buffer** (tune cycle / unforeseen) | 1d | **7d** |
| 9·optional Tier 2 | 1.5d | **8.5d** |

**Sprint 核心 (Slice 0-8 + buffer)**·**7d**
**完整 (含 Tier 2)**·**8.5d**

**建议**·先跑 7d 核心·sample 看效果·**再决定是否花 1.5d 上 Tier 2**·因 Tier 2 的 emperor cue tracking 风险较高 (跨发言 state 容易串扰)。

---

## 5. Rollout strategy

### Option A·一锤一发 (推荐)

Slice 0-8 完成后·**ship 1.2.3.0 整包 hot update**·

- changelog 一条·"常朝大改·NPC 自发表态 persona 加深 / 立场推导接入 8D 人格 / 6 应答 mode + 朝堂语词库 / NPC-NPC AffinityMap linkage / 3 smoke 守门"
- GitHub 一个 commit
- 推服务器 / 验证 / 收尾

**优点**·一次性 release·玩家不用反复升级。`changelog.json` 不被本 sprint 反复污染。
**缺点**·风险集中·若上线有问题·全 sprint 工作要回滚。

### Option B·分批 ship

- Slice 1 完成 → 1.2.2.4 (aiPersonaText 注入)
- Slice 3 完成 → 1.2.2.5 (stance persona-driven)
- Slice 8 完成 → 1.2.3.0 (完整应答化)
- Slice 9 (若做) → 1.2.3.1

**优点**·风险分散·early feedback。
**缺点**·changelog 4 条·有 sprint 内部 polish·玩家心智负担高。

**选 A**·因为 Slice 1-3 是 internal architecture 改造·玩家肉眼差异不易感知·要等 Slice 7+ 完整应答化·肉眼差异才明显。一锤一发更干净。

---

## 6. Risk register

| 风险 | 概率 | 影响 | 对策 |
|---|---|---|---|
| **TM_NPC_Engine.aggregateDims signature 与预期不符** | 中 | 中·影响 Slice 3+5 | Slice 0 verify·若 API 不对·写 adapter 0.5d·**buffer 吸收** |
| **LLM 不遵守 mode instruction** | 中 | 高·sample 看上去仍是平行陈述 | Slice 7 后立刻 sample·若不灵·加 "脱离视为生成失败" 强化·或换更具体的朝堂语 instruction (e.g., "必须以 \"臣窃以为 X 所言未当\" 开头") |
| **议题 tagging fallback regex 漏召**·剧本议题命中 tag 少 | 高 | 中·persona modulation 半数规则失效 | Slice 2 smoke 守门·若覆盖率 < 60%·调 regex 或手动补 tag |
| **anti-monotony guard 过度·NPC 都变 augment** | 中 | 中·朝议变水 | Slice 6 单测·验 guard 不会把所有都改 augment·tune cap 阈值 |
| **AffinityMap.adjust 接口不存在/不同名** | 低 | 中·linkage 实现需改 | Slice 0 verify·若 API 不同·写 adapter |
| **NPC selfReact 并行生成·peer 看不到先发言** | 高 | 高·dialogue 链断 | Slice 4 前·**verify _cc3_aiGenReact 实际是顺序还是并行**·若并行·必须改为顺序 (~+0.3d 风险) |
| **Slice 7 prompt 膨胀超 LLM token 上限** | 低 | 高·call 失败 | Slice 7 sample 时·verify token count·若超·精简朝堂语词库 instruction (从 5 句 example pool 减到 2-3) |

**总 buffer 1d 应能覆盖** 上述风险。若 NPC selfReact 并行问题成真·额外 +0.5d。

---

## 7. Sprint-level DoD

打勾才算 sprint 完成·

- [ ] Slice 0-8 全部 verify gate 过
- [ ] verify-all 全绿 (含新 3 smoke)
- [ ] 绍宋·南幸扬州议题·6 NPC × 2 round sample·mode 分布 ≥ 5 种·affinity 至少 2 对变化
- [ ] 天启·任一 controversial ≥ 6 议题·5 NPC sample·mode 分布 ≥ 3 种
- [ ] sprint summary doc 写完·含 before/after 对比
- [ ] changelog.json 写完·一条总结性条目
- [ ] 1.2.3.0 hot update 包 build + 上传服务器 + CDN 验证
- [ ] GitHub atomic commit·涉及文件·tm-chaoyi-changchao.js + 3 scripts + 2 docs + scenarios (议题 tag) + changelog.json
- [ ] memory 留档·`project_chaoyi_changchao_backlog.md` 改 status·`[已完成]`

---

## 8. Stop conditions·什么时候 abort/pause sprint

- **Slice 0 verify gate fail**·TM_NPC_Engine 或 PromptComposer API 不存在·**pause** 改写或补 API·或 fallback 到无 8D 模式
- **Slice 4-5 单测多 case fail**·base mode / persona modulation 逻辑有根本错误·**pause** 改 design v3 §4·重新仲裁
- **Slice 7 LLM sample 完全不听 mode**·尝试强化 instruction 3 次仍不灵·**pause**·**升级 mode instruction 为 few-shot example** (~+0.5d)
- **Sprint 跑过 buffer 1d 还未到 DoD**·**pause** 评估·哪些 slice 砍掉做 v3.5·下个 sprint 再做剩余

---

## 9. Cross-references

| 文档 | 角色 |
|---|---|
| `web/docs/chaoyi-changchao-improvements-backlog.md` | 项 1+2+4 详 + 项 3 摘要 + 历史背景 |
| `web/docs/chaoyi-npc-dialogue-design-v3.md` | 项 3 完整 spec (本 sprint 的 spec 主源) |
| `web/docs/chaoyi-stance-weights-longterm.md` | 项 4 长期方案 (**不在本 sprint**) |
| `web/docs/changchao-overhaul-sprint.md` | **本 doc·sprint kickoff plan** |
| `web/docs/changchao-overhaul-sprint-summary.md` | sprint 结束后写·before/after 对比 |

---

## 10. 启动前·user 拍板项

| 项 | 选 |
|---|---|
| 是否包含 Tier 2 (Slice 9) | ⬜ 先 7d 核心·sample 后决定 ⬜ 直接 8.5d 全装 |
| Rollout 选 A 一锤还是 B 分批 | ⬜ A 一锤 (推荐) ⬜ B 分批 |
| 议题 tagging Slice 2 是否手动补 tag·还是只靠 fallback regex | ⬜ 手动补 5-10 议题 (推荐) ⬜ 只靠 regex (覆盖率可能 < 60%) |
| Slice 0 是否捕 baseline·便于 before/after 对比 | ⬜ 是 (推荐) ⬜ 否·节约 0.3d |

启动时回此 doc·勾选后开 Slice 0。
