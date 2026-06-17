# Slice 0·Prep + Baseline·Verify Gate Report

date·2026-05-21·status·**verify gate 5/6 pass·1 critical spec correction needed**·**绍宋 trait coverage 紧急**

---

## Findings 汇总

### ✅ 1. PromptComposer API·exists + 名字对得上

| 验证项 | 结果 |
|---|---|
| `TM.PromptComposer.buildAiPersonaText(char, options)` | ✅ 存在·tm-prompt-composer.js:154·已暴露在 TM 命名空间 (L234-243) |
| `TM.PromptComposer.buildRecognitionState(char)` | ✅ 存在·tm-prompt-composer.js:178 |
| Slice 1 改动·`_cc3_aiGenReact` 内追加 `TM.PromptComposer.buildAiPersonaText(gmCh)` | ✅ 可直接调用·无需 adapter |

### ⚠️ 2. 8D personality·API 命名 + 数值范围与 spec 不符·**spec 需修正**

| 验证项 | 实际 | spec 假设 | 差异 |
|---|---|---|---|
| 函数入口 | `_aggregatePersonalityDims(char)` (tm-npc-engine.js:29) | `TM_NPC_Engine.aggregateDims(char)` | **没暴露在 TM 命名空间**·需用 file-local 函数 或 reactor·或读 `char._dims` 缓存 |
| 8D 维度 key | `boldness / compassion / rationality / greed / honor / sociability / vengefulness / energy` (英文) | 勇敢 / 仁善 / 理性 / 贪心 / 名节 / 社交 / 复仇 / 精干 (中文) | **key 全部要改英文**·spec v3 中所有 15 条修正规则需 rewrite |
| 数值范围 | 累加自 trait.dims·**单 trait ±0.1~±0.5**·summed N traits 通常 **±2 范围** (但理论无上下界) | 0-100 整数 | **阈值 60/70/80 需重映射**·建议·≥ 0.3 / ≥ 0.5 / ≥ 0.7 |
| 是否暴露 | 无 `module.exports`·无 `TM.NpcEngine = ...`·无 `window.X` | spec 假设 stable API | **需在 tm-npc-engine.js 末尾加 export**·或在 changchao 内 reach into global function name |

**修复方案**·

```js
// tm-npc-engine.js 末尾·补暴露 (最小侵入)
if (typeof window !== 'undefined') {
  window.TM = window.TM || {};
  window.TM.NpcEngine = window.TM.NpcEngine || {};
  window.TM.NpcEngine.aggregateDims = _aggregatePersonalityDims;
  window.TM.NpcEngine.getCharacterPersonalityBrief = getCharacterPersonalityBrief;
}
```

(此 export 应作 Slice 0 收尾的 1 小改·5min·非破坏)

### 🔴 3. **traitIds 覆盖率·两剧本差异巨大**·**严重影响 Slice 3 / 5 实际效果**

| 剧本 | 总 NPC | 有 traitIds | 覆盖率 | dims 有效率 |
|---|---|---|---|---|
| 天启七年·九月 | 203 | 200 | 98.5% | ✅ v3 spec 8D 规则完全生效·109 个不同 trait IDs 在用 |
| 绍宋·建炎元年八月 | 98 | **0** | **0%** | ❌ **所有 8D 维度返回全 0**·v3 spec 15 条 persona 规则**完全失效** |

**这个 risk 在 sprint plan 没识别·必须现在决策**。

**为什么发生**·绍宋 NPC parity Slice B (前几天补的 25 字段) 加了 personality (中文字符串) / party / stats·**没加 traitIds**。绍宋的 traitDefinitions 在 scenario JSON 里有 (~70 trait def)·但 NPC 数据 unfilled。

**3 个选项**·

| 选项 | 工作量 | 效果 | 推荐 |
|---|---|---|---|
| **A·绍宋补 traitIds** | ~1d 额外 slice·98 NPCs × 选 2-4 trait IDs | 绍宋 8D 维度生效 | ⭐ 长期价值高·但拖 sprint |
| **B·v3 加 personality-text fallback** | ~0.5d·spec 内置·若 dims 全 0·从 ch.personality 字符串 keyword 推 dims | 不阻塞 sprint·绍宋部分生效 | ⭐ 推荐·先做 B |
| **C·只对 trait-rich scenarios 启用** | 0d·sprint scope 同·绍宋走 base mode-only | 绍宋玩家看不到 persona 改进 | 跟标尺 A 矛盾·不推荐 |

**强烈建议·B (sprint 内做) + A (sprint 后独立做)**。绍宋 traitIds 缺失是 NPC parity 系列**未完成项**·应另开 slice 补·跟 changchao sprint 解耦。

### ✅ 4. AffinityMap·API 名字与 spec 不符·**spec 需修正 (轻)**

| 验证项 | 实际 | spec 假设 |
|---|---|---|
| 函数 | `AffinityMap.add(a, b, delta, reason)` | `AffinityMap.adjust(...)` |
| 双向性 | 单向·两个 NPC 互相需调 2 次 | spec 已是 2 次调用·正确 |
| 数值范围 | 用户层观察·delta ±3 ~ ±30 不等·上下界由 AffinityMap 内部 clamp | spec intensity 2-3·**保守区间·安全** |

**修复**·v3 spec 全部 `AffinityMap.adjust` 改成 `AffinityMap.add`·SLOC 影响 0·只 doc 改字。

### ✅ 5. NpcMemorySystem·signature 与 spec 不符·**spec 需修正 (轻)**

| 验证项 | 实际 | spec 假设 |
|---|---|---|
| 签名 | `NpcMemorySystem.remember(name, text, emotionLabel, weight, ...args)`·**positional + 中文 emotion** ('喜'/'忧'/'怒'/'平'/'敬'/'重' 等) | spec 用 `{text, emotion, priority, source}` 对象·英文 emotion |
| 取回 | `NpcMemorySystem.recall(name, n)`·返 list | ✅ 已是 |

**修复**·v3 §7 NPC-NPC linkage 中所有 `NpcMemorySystem.remember(name, { ... })` 改为·

```js
NpcMemorySystem.remember(name, '常朝议事·驳XX于「议题」', '怒', 5, lastSpeaker);
//                                  text                      emotion  wt  source
```

### ✅ 6. `_cc3_aiGenReact` **是顺序调用**·peer 看得见先发言

| 验证项 | 结果 |
|---|---|
| 调用方式 | `for (const r of directs) { await _cc3_streamReactBubble(r, ...); }` (L2279) | 
| 跨发言可见性 | `for...of + await` 顺序·前一 NPC 完成 (含 `npc._aiGen = true` 写回 L1037) 才进下一·peer 读 `item.selfReact.filter(r => ... && r._aiGen)` (L897) **看得见** ✅ |
| 风险 #6 (并行 vs 顺序) | **CLEARED**·spec dialogue 链假设成立 |

---

## 7. Spec corrections·v3 必改项汇总

| # | 位置 | 旧 | 新 |
|---|---|---|---|
| 1 | `chaoyi-npc-dialogue-design-v3.md §4 (15 条 persona 表)` | 中文 key + 0-100 阈值 | 英文 key (boldness/...) + ±0.3/0.5/0.7 阈值 |
| 2 | 同上 §7 (NPC-NPC linkage) `AffinityMap.adjust` | `adjust(...)` | `add(...)` |
| 3 | 同上 §7 (NpcMemorySystem.remember) | object form | positional·中文 emotion |
| 4 | 同上 §3 (依赖入口) `TM_NPC_Engine.aggregateDims` | spec API 名 | 实际名·`window.TM.NpcEngine.aggregateDims` (sprint 启动时一并暴露) |
| 5 | 同上 §4 增·若 `dims` 全 0·fallback 走 personality 字符串 keyword 推 dims (B 方案) | 不在 spec 内 | **新增 §4.5·personality-text fallback 推 dims** |

---

## 8. Baseline 捕获·分两件

### 8a·静态 baseline (本次完成)

写出当前 NPC trait 状态·

```json
{
  "scenario_tianqi": { "total": 203, "with_traitIds": 200, "coverage": 0.985, "expected_8d_efficacy": "✅ 完整" },
  "scenario_shaosong": { "total": 98, "with_traitIds": 0, "coverage": 0.0, "expected_8d_efficacy": "❌ 全 0·需 fallback" }
}
```

### 8b·LLM 实跑 baseline (需 user 启动游戏·或我写 mock script)

5 NPC × 5 议题·实际 LLM selfReact 输出。**Slice 0 暂未捕**·因·

- 需 user 启动游戏·跑 callAI·捕实际输出
- 或写 node script · mock callAI 跑 prompt 推到 LLM API · 也要 user 配 key

**建议**·此项推到 Slice 7 (manual sample) 一并做·sprint summary 时一次性对比。Slice 0 不阻塞。

---

## 9. Verify Gate 结论

| 5/6 verify gate pass | 状态 |
|---|---|
| API 1·PromptComposer | ✅ |
| API 2·_aggregatePersonalityDims | ⚠️ 名字不符 + scale 不符·**spec 改字**·5min 暴露到 TM.NpcEngine |
| traitIds 覆盖率·天启 OK·绍宋 0% | 🔴 **关键 risk**·**需 user 拍板 B 方案**·或加 A 方案 (独立 slice) |
| API 3·AffinityMap | ✅ (.add 不 .adjust) |
| API 4·NpcMemorySystem | ✅ (positional·中文 emotion) |
| 顺序调用确认 | ✅ |

**核心阻塞·绍宋 traitIds 0% 覆盖**·

- 若不解决·sprint 给绍宋玩家**无 persona-driven 立场差异**·base mode 仍工作但 Slice 5 (persona modulation) 沦为空操作
- 若选 B (fallback 推 dims) ·sprint 加 ~0.5d·v3 spec 加 §4.5
- 若选 A (绍宋补 traitIds) ·sprint 加 ~1d·或独立 slice 后续做·v3 spec 不动

---

## 10. 建议·user 拍板项

### 必答

**问·绍宋 traitIds 覆盖怎么补？**

- ⬜ **A**·独立 slice 补·sprint 内加·~+1d → 总 sprint 8d 核心
- ⬜ **B**·v3 spec 加 personality-text fallback·~+0.5d → 总 sprint 7.5d 核心 (推荐)
- ⬜ **A+B**·都做·~+1.5d → 总 sprint 8.5d 核心 (最稳)
- ⬜ **C**·只做天启·绍宋走 base mode-only → 总 sprint 7d 不变·绍宋玩家不受益

### 可推迟答

**问·8d LLM 实跑 baseline 谁做？**

- ⬜ Slice 7 manual sample 一并·sprint 内做
- ⬜ user 启动游戏自行捕 5 NPC × 5 议题·我读 log 写 baseline
- ⬜ 跳过·sprint 结束后直接对比 sample

---

## 11. 下一步

待 user 拍板后·

1. 改 v3 spec doc·5 处 correction (§4 key + scale·§7 AffinityMap.add·§7 memory positional·依赖 §3·新增 §4.5 fallback if B)
2. 改 sprint plan timeline·若 B·+0.5d·若 A+B·+1.5d
3. 5min 在 tm-npc-engine.js 末尾加 TM.NpcEngine namespace export·**5 行**·**这件事现在就做**·不阻塞 Slice 1
4. 解锁 Slice 1 (aiPersonaText 注入)·30min·开始 sprint 正式实施
