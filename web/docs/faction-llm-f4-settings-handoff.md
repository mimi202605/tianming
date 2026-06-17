# F4·NPC 势力 LLM 设置面板补全·handoff 给 Phase 7.5

**日期**·2026-05-22
**来源 sprint**·势力 LLM 整理 (F0-F4·F0/F1/F2/F3 已完)
**handoff target**·#108 AI 升级·Phase 7.5·设置面板大改
**原因**·F4 跟 #108 都改 `tm-patches.js:304-553 openSettings`·合做避免 merge 冲突 + 一次性把所有 NPC LLM 设置项整理完

---

## 背景

势力 LLM 推演系统 (Phase G·H2·H3·已上线·在 `tm-faction-npc-*.js`·跟 endturn AI 主管线无关) 有 14 个 `P.conf` 配置字段·当前只有 2 个暴露在主设置面板：

| 字段 | 默认 | 状态 |
|---|---|---|
| `npcAiPrecision` | true | ✅ 主面板 checkbox·label "NPC 势力真决策（LLM 精细推演·真实改动数据）" |
| `npcAiCosmeticEnrich` | true | ✅ 主面板 checkbox·label "NPC 文字润色（cosmetic·不改数据）" |
| `npcAiPrecisionMaxPerTurn` | 2 | ❌ 隐藏 (限流·非玩家关心·合理) |
| `npcAiPrecisionPriority` | 'overall' | ❌ 历史字段·**无消费者** (F0 已注释标记)·下次清理可删 |
| `npcAiPrecisionMode` | 'eager' | ❌ setEnabled() 自动管理 (合理隐藏) |
| `npcAiPrecisionConcurrency` | 2 | ❌ **该暴露**·影响成本与速度 |
| `npcAiPrecisionRetryAttempts` | 2 | ❌ 隐藏 (合理) |
| `npcAiPrecisionTimeoutMs` | 30000 | ❌ 隐藏 (合理) |
| `npcAiPrecisionMaxTokens` | 6000 | ❌ 隐藏 (合理) |
| `npcInTurnFirstDelayMs` | 30000 | ❌ **该暴露**·setSpeed 预设入口 |
| `npcInTurnRepeatDelayMs` | 90000 | ❌ **该暴露**·setSpeed 预设入口 |
| `npcInTurnMaxPerTurn` | 8 | ❌ **该暴露**·后台并发数 |
| `npcEagerDelayMs` | 300 | ❌ 隐藏 (合理·F0 已补 DEFAULTS) |
| `_npcAiPrecisionCadenceSwapped` | - | ❌ internal migration flag (绝对隐藏) |

---

## F4 具体改动·3 步

### Step 1·setSpeed 预设 radio group (~0.5 d)

**位置**·`tm-patches.js` openSettings·NPC LLM 区块 (现在的 `npcAiPrecision` checkbox 下方)

**新增 UI 块**·radio group·3 选项 (dev 不暴露)：
- 慢 (60s/180s)·省 API·适合长回合慢节奏
- 默认 (30s/90s)·`setSpeed('normal')`
- 快 (5s/15s)·开发期·几乎立刻看到 NPC 反应

**实现要点**·切换时**调 `TM.FactionNpcInTurnDriver.setSpeed(name)` 而非直接改 P.conf**·原因·setSpeed() 内置 P.conf 更新逻辑·避免重复维护

```js
// 伪码示例·按现有 settings UI 风格调整
function _renderSpeedRadio() {
  var current = _detectSpeedPreset();  // 读 P.conf.npcInTurnFirstDelayMs 反查 preset name
  return [
    {label:'慢·60s/180s·省 API', value:'slow'},
    {label:'默认·30s/90s', value:'normal'},
    {label:'快·5s/15s', value:'fast'}
  ].map(function(opt) {
    return '<label><input type="radio" name="npcSpeed" value="' + opt.value + '" ' + (current === opt.value ? 'checked' : '') + ' onchange="TM.FactionNpcInTurnDriver.setSpeed(\'' + opt.value + '\')"> ' + opt.label + '</label>';
  }).join('<br>');
}

function _detectSpeedPreset() {
  var first = (P.conf && P.conf.npcInTurnFirstDelayMs) || 30000;
  if (first <= 5000) return 'fast';
  if (first >= 60000) return 'slow';
  return 'normal';
}
```

**注意·切换只影响下回合**·当前已排 timers 不变 (这是 driver:258 的语义)·UI 提示文案加 "调整后下回合生效"

### Step 2·concurrency slider (~0.5 d)

**位置**·同区块·setSpeed radio 下方

```html
<label>NPC AI 并发数 (高=快但贵)</label>
<input type="range" min="1" max="4" step="1" value="..."
       oninput="P.conf.npcAiPrecisionConcurrency = +this.value">
<span id="npcConcVal">2</span>
```

**默认 2**·允许 1-4·tooltip "同时跑几个势力的 LLM·1=串行省 token·4=最快但 4x cost"

### Step 3·setEnabled / setCosmeticEnrichEnabled 接口收口 (~0.25 d)

**现状 bug**·`tm-patches.js` 里 checkbox `onchange` 直接 `P.conf.npcAiPrecision = ...` (line 387-394 区域)·跳过了 `TM.FactionNpcSettings.setEnabled(on)` 的额外逻辑 (会 cancel inTurnTimers)

**改成**：
```js
// 之前 (假设)
onchange: function(v) { P.conf.npcAiPrecision = v; }

// 之后
onchange: function(v) {
  TM.FactionNpcSettings.setEnabled(v);  // 内部 set P.conf + cancel timers
}
```

同理 `npcAiCosmeticEnrich` 改用 `TM.FactionNpcSettings.setCosmeticEnrichEnabled(v)`

### Step 4·smoke (~0.25 d)

inline node 跑 4 个检查：

```js
// 1. setSpeed('fast') 后 P.conf.npcInTurnFirstDelayMs === 5000
// 2. setSpeed('slow') 后 P.conf.npcInTurnRepeatDelayMs === 180000
// 3. concurrency slider 0→3·P.conf.npcAiPrecisionConcurrency === 3
// 4. setEnabled(false) 后 TM.FactionNpcInTurnDriver.cancelInTurnTimers 被调用 (检查 _activeTimers 长度归 0)
```

---

## Phase 7.5 接入建议

F4 是 Phase 7.5 设置面板大改的子项·建议结构：

```
Phase 7.5 设置面板新结构 (草案·依 #108 设计)
├─ 核心 AI 设置 (主面板)
│  ├─ AI 服务商 / API key
│  ├─ 模型选择
│  ├─ AI 调用深度
│  └─ 记忆合成 (renamed from consolidationEnabled)
├─ 回合推演设置
│  ├─ ...
├─ NPC 势力 LLM (← F4 区块·这里挂)
│  ├─ ✅ NPC 势力真决策 (npcAiPrecision)
│  ├─ ✅ NPC 文字润色 (npcAiCosmeticEnrich)
│  ├─ + 推演节奏预设 (setSpeed: 慢/默认/快)   ← Step 1
│  ├─ + 并发数 slider (1-4)                ← Step 2
│  └─ + (status indicator·跟 F3 全局面板入口联动)
└─ 高级/调试 (折叠)
   └─ ... 其它隐藏字段保持隐藏
```

---

## 已完成相关 (F0-F3·背景)

| 子项 | 文件 | 改动 |
|---|---|---|
| F0 死代码清理 | tm-faction-npc-settings.js·tm-faction-npc-llm-decision.js | 删 dup field·标 'random' 死·补 npcEagerDelayMs default·3 fallback 加 console.warn |
| F1 双轨 schema 收口 | tm-faction-npc-llm-decision.js·tm-faction-action-engine.js | 单轨 actions[]·删 legacy 4 字段·in-batch 去重·~270 token 省 |
| F2 SC16 闭环 | tm-faction-action-engine.js·tm-endturn-followup.js | 采纳审计 (sc16Compliance) + cooldown (repetition -20) + 已执行标记 (-30) |
| F3 诊断面板 | tm-faction-npc-llm-decision.js·tm-three-systems-ui.js | getGlobalNpcLlmStatus + "NPC AI 全局状态" panel + status badge per fac + SC16:N% compliance badge |

**F4 是最后一项·blocked on #108 完成**·见证 Phase 7.5 整体设计后再做。

---

## Touch points·#108 该读这些

- `tm-faction-npc-settings.js`·14 字段 DEFAULTS·`isAiPrecisionEnabled() / isCosmeticEnrichEnabled() / maxPerTurn() / concurrency() / setEnabled() / setCosmeticEnrichEnabled() / getStatus()`
- `tm-faction-npc-in-turn-driver.js:245-260`·`setSpeed('dev'/'fast'/'normal'/'slow')` 预设·`SPEED_PRESETS` 常量
- `tm-faction-npc-llm-decision.js:1942+`·`getGlobalNpcLlmStatus()` 给 F3 全局面板·#108 设置面板可加"NPC AI 全局状态"按钮入口
- `tm-three-systems-ui.js:_tsInspectGlobalNpcLlm()`·F3 已建·可直接调用
