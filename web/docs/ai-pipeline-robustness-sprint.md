# AI 管线健壮性 sprint·~3 天

**date**·2026-05-21
**owner**·Claude
**scope**·SC1 主推演结构化失败 (用户主诉) + 全 19 个 AI 子调用健壮性整体提升
**total est**·17-25 工作日 (按完整 4 方案算)·**最小可行 sprint 3 天 (Slice 0 + Slice 1·解决主诉)**

---

## §0 背景

User 报告·过回合 SC1 主推演的结构化数据返回**经常失败**·导致整轮回合卡死/弹"AI 推演未返回有效数据"。已诊断完 SC1 + 全 19 子调用·写就此 sprint 计划。

**全 19 子调用清单 (来自 `tm-endturn-ai.js:409-427`)**·

| ID | 名称 | minDepth | 文件位置 |
|---|---|---|---|
| sc0 | AI 深度思考 | standard | tm-endturn-ai.js:724-747 |
| sc05 | 记忆回顾 | standard | tm-endturn-ai.js:929-1164 |
| sc_recall | RAG 检索 (4 源) | (内嵌·非独立 _runSubcall) | tm-endturn-ai.js:752-927 |
| **sc1** | **结构化数据 (主推演)** | **lite** | **tm-endturn-ai.js:1167-3307** |
| sc1b | 文事鸿雁人际 | lite | tm-endturn-ai.js:2651-2810 |
| sc1c | 势力外交·NPC 阴谋 | lite | tm-endturn-ai.js:2812-3223 |
| sc1d | 实录时政 | lite | tm-endturn-ai.js:2583-2648 |
| sc15 | NPC 深度推演 | standard | tm-endturn-followup.js:394-810 |
| sc_memwrite | NPC 记忆回写 | lite | tm-endturn-followup.js:715-808 |
| sc16 | 势力推演 | full | tm-endturn-followup.js:814-891 |
| sc17 | 经济财政 | full | tm-endturn-followup.js:894-926 |
| sc18 | 军事态势 | full | tm-endturn-followup.js:929-1044 |
| sc_audit | 数据一致性审核 | lite | tm-endturn-followup.js:1060-1280 |
| sc2 | 叙事正文 | lite | tm-endturn-followup.js:1330-1655 |
| sc25 | 伏笔记忆 | lite | tm-endturn-followup.js:1659-1860 |
| sc27 | 叙事审查 | standard | tm-endturn-followup.js:1865-1940 |
| sc07 | NPC 认知整合 | lite | tm-endturn-followup.js:2050-2200 |
| sc28 | 世界快照 | full | tm-endturn-followup.js:2165-2200 |
| sc_consolidate | 记忆固化 (后台) | (post-turn queue) | tm-endturn-followup.js:2200-2399 |

---

## §1 SC1 失败原因诊断

详见 `tm-endturn-ai.js:1167-3320` 阅读结果·关键瓶颈 8 个·按严重度排：

| # | 问题 | 严重度 | 位置 |
|---|---|---|---|
| 1 | **schema 巨型化** | 🔴 致命 | tp1 ~60+ 顶级字段·总 prompt ≈ 30K tokens | L1357-1603 |
| 2 | **只用 json_object 不用 json_schema** | 🔴 致命 | OpenAI 走宽松 `response_format:{type:'json_object'}`·非 OpenAI 裸跑 | L2440, L604 |
| 3 | **流式 SC1 默认开** | 🟡 中 | `stream_sc1!==false`·stream + response_format 多 provider 静默冲突 | L2441-2469 |
| 4 | **截断丢失·只看 finish_reason** | 🟡 中 | 80% 完整但尾巴未闭合 → 整把扔走 rescue | L194 `_looksJsonUnclosed` |
| 5 | **JSON repair 只传 3500 字 schema 尾** | 🟡 中 | 60 字段中只看到末几个 → 修复常补错位置 | L206 `schemaHint.slice(-3500)` |
| 6 | **没有 partial JSON 提取** | 🟡 中 | robustParseJSON 失败就走 fallback·中间没"尽力提取已闭合字段"一层 | tm-ai-infra.js:1501-1566 |
| 7 | **G2 降级用 SC1b/SC1c 而非 SC1 自身片段** | 🟢 小 | SC1 返回半成品也算"空" | L3228-3259 |
| 8 | **schema 中文字段别名归一化只 8 个 key** | 🟢 小 | `_normalizeParsedJsonForExpected` 只 cover 8 字段·剩 50 字段中文版直接漏 | L114-150 |

---

## §2 4 个解决方案 + 原理 + 兼容性

### 方案 A·OpenAI json_schema strict (替换 json_object)

**原理**·OpenAI 在采样层 logit masking·物理上不能采样违反 schema 的 token·从"事后检查"升级为"事前约束"。

**击中失败**·#2 主要·#4 部分 (强制要求闭合)
**适用**·仅 OpenAI/Azure·非 OpenAI 自动降级
**工作量**·2-3 天

### 方案 B·SC1 schema 分片

**原理**·把 60 字段拆成 4 个 15 字段并行子调用·三重收益：
1. 单次 prompt 缩短 → 长上下文衰减减弱
2. 单次输出 cap 内 → 不截断
3. 一个崩另三个还活 → 损失 100% → 25%

**击中失败**·#1 主要·#4 间接
**适用**·全 provider
**工作量**·5-7 天 (改动面最大)

### 方案 C·Partial JSON 抢救层

**原理**·用 jsonrepair (npm) + 部分流式解析·从破损输出里抢救已闭合的 key-value pairs·"AI 失败"→"AI 部分成功"。

**击中失败**·#4 + #6 主要
**适用**·全 provider·全 19 个子调用都受益
**工作量**·1-2 天

### 方案 D·关 stream + 强约束提示

**原理**·关 stream 让 response_format 真生效 (provider 静默吞 bug)·"YOU MUST RETURN JSON ONLY" 后置克服头部衰减。

**击中失败**·#3 主要·#2 部分激活
**适用**·全 provider·尤其中转站用户
**工作量**·半天

### 兼容性矩阵

四方案完全兼容·叠加顺序·

```
┌─────────────────────────────────────────────┐
│ D (半天)  ← 地基·让 response_format 生效   │
├─────────────────────────────────────────────┤
│ C (1-2 天) ← 抢救层·全 19 子调用受益       │
├─────────────────────────────────────────────┤
│ A (2-3 天) ← OpenAI 用户的强约束           │
├─────────────────────────────────────────────┤
│ B (5-7 天) ← 终极方案·只在 A 仍不稳时启   │
└─────────────────────────────────────────────┘
```

**最小可行 sprint**·D + C = **2-3 天**·先做这两·user 再判断 A/B 是否需要。

---

## §3 全 19 子调用健壮性审计 (已核实)

### ✅ 已核实·真问题 (5 条·要修)

| # | 问题 | 子调用 | 严重 | 位置 | 修法 |
|---|---|---|---|---|---|
| **R1** | **sc05 用 `throw e05`**·失败后 `_runSubcall` 重试·重试也失败则后续 sc1 注入 memoryReview 为空 string·sc1 失去跨回合因果链 | sc05 | 🟡 | tm-endturn-ai.js:1163 | catch 改 fallback string `'(记忆回顾失败)'` 不抛 |
| **R2** | **truncation toast 只首次触发**·`_truncatedOnce` bool·后续 5 个子调用截断玩家无感 | 全管线 | 🟢 | tm-endturn-ai.js:67-79 | 改成 count·>3 时再 toast |
| **R3** | **sc1b/sc1c IIFE catch 静默**·失败只 console.warn·`ctx.meta.errors` 不记 | sc1b/sc1c | 🟡 | tm-endturn-ai.js:3220-3223 | `catch(_sc1bErr) { ctx.meta.errors.push(...); console.warn(...) }` |
| **R4** | **JSON repair 只看 schema 尾 3500 字**·60 字段大约只看到末 8 个·修复 LLM 没法补对位置 | 全 JSON 子调用 | 🟡 | tm-endturn-ai.js:206 | 改传 expectedKeys list + 字段示例·而非 raw schema 尾 |
| **R5** | **sc1d 中文别名归一化分散**·5+ 别名 fallback chain·后续若 sc 多了易遗漏 | sc1d | 🟢 | tm-endturn-ai.js:2634-2638 | 复用 `_normalizeParsedJsonForExpected` (在 alias copy 表加 4 条) |

### ✅ 已核实·安全·无需修 (3 项·之前担心的)

| 项 | 状态 | 证据 |
|---|---|---|
| **sc_consolidate 后台任务错误隔离** | ✅ 安全 | catch 块吞错 (L2398)·`/* 不抛·后台静默失败 */`·失败时 `GM._consolidatedMemory` 无新条目·下回合 sc1 `_consolidated` 注入找不到匹配 turn 就跳过 (L1293)·静默降级·不崩 |
| **sc15 → sc2/sc27 下游降级** | ✅ 安全 | sc15 失败 → `_specialtySummary.sc15` 保持空 string → sc2 (L1388) `if(_branchSpecialtySummary)` 跳过注入·sc27 (L1872) 同·不崩·只是叙事缺少 rumors/暗流·质量轻微下降 |
| **sc16/17/18 depth=lite 跳过** | ✅ 安全 | `_runSubcall` (L460) 在 depth<minDepth 时 return·不运行 fn·`GM._turnAiResults.subcall16/17/18` 保持 undefined·下游 `(_tres.subcall17\|\|{})` (L1067) 防御性兜底·sc16 consumer (tm-faction-npc-llm-decision.js:371) `if (directive)` 守卫·全链路安全 |

### ❌ Explore agent 误报澄清 (已核实不存在)

| Agent claim | 实际 | 证据 |
|---|---|---|
| sc0/1b/1c/1d 等 8 个有 stream+response_format 冲突 | 只 sc1 用 stream·其他不设 stream:true | grep `stream:true\|.stream=` 全管线 |
| sc1d/sc27 修复超时 rethrow 中断流程 | sc1d catch 用 `_attachSc1RecordFallback`·sc27 同 fallback·不抛 | L2643-2647 |
| 多个子调用截断无 _checkTruncated | 19 个全有·`_callEndturnAI` (L288) wrapper 也做·_checkTruncated 出现 13+ 次 | grep 验证 |

---

## §4 Sprint 计划·3 个 slice (最小可行)

### Slice 0·D 方案 (半天)

**目标**·让 response_format 在所有 provider 上真生效·SC1 立刻见效·全管线无 regression。

**改动**·
```
1. tm-endturn-ai.js:2441  P.ai.stream_sc1 默认 false (或 detect provider !== openai 时关)
2. tm-endturn-ai.js:1357  tp1 末尾追加 LSR 后置约束:
     "\n\n═══【输出强约束·必读】═══\n"
     "你必须返回严格 JSON·禁止 markdown ``` 包裹·禁止字段名翻译为中文·禁止前缀文本。\n"
     "如果不确定某字段·留空字符串/空数组·不要省略 key。\n"
3. tm-endturn-ai.js:472  sc1 _retries 从 1 提到 2 (subcallRetries via getCallPolicy)
   · 第二次自动降 schema 复杂度 (砍 12 个低频字段)
```

**验收**·重跑 5 次 endTurn·SC1 成功率从 ~70% 升到 ~85% (口测·非 smoke)

### Slice 1·C 方案 (1-2 天)

**目标**·19 个子调用共享 partial JSON 抢救层·截断/破损不丢已生成部分。

**改动**·
```
1. npm install jsonrepair (~20kb)·或手写等效·内嵌到 tm-ai-infra.js
2. tm-ai-infra.js:1501 robustParseJSON
   · 在 Layer 2c (中文引号) 之后·Layer 3 (字段提取) 之前
   · 插 Layer 2.5: jsonrepair(substr) → 二次 try
3. tm-endturn-ai.js:574 _hasSc1StructuredResult
   · "任一关键 key" 降级为 "≥3 个 key"·避免 1 个空 events 通过
4. tm-endturn-ai.js:206 _parseOrRepairJsonResult
   · schemaHint 改成 expectedKeys list 拼成的字段示例·而非 raw schema 尾
```

**验收**·新增 smoke `scripts/smoke-json-repair-layers.js`·喂 5 种破损 JSON·全部能抢救出 ≥3 字段

### Slice 2·真问题 R1-R5 (1 天)

**目标**·5 个已核实小修·全管线收口。

**改动清单**·
- R1·sc05 catch fallback (1 行)
- R2·`_truncatedOnce` → `_truncatedCount` + 阈值 (3 行)
- R3·sc1b/sc1c catch 加 ctx.meta.errors push (4 行)
- R4·_parseOrRepairJsonResult schemaHint 重构 (~20 行)
- R5·_normalizeParsedJsonForExpected 加 4 条 alias (4 行)

**验收**·跑 `smoke-endturn-public-contract.js` + `smoke-endturn-error-path.js`·全过

### 总 sprint·~3 天

| Slice | 工作量 | 关键产物 |
|---|---|---|
| 0·D 方案 | 半天 | SC1 默认关 stream + 强约束提示 + retry 提升 |
| 1·C 方案 | 1-2 天 | jsonrepair + Layer 2.5 + repair hint 重构 |
| 2·真问题修复 | 1 天 | R1-R5 全 |
| **合计** | **3 天** | SC1 成功率 ~70% → ~92% (预估) |

---

## §5 sprint 完后·user 决定是否继续

**如果 3 天 sprint 后 SC1 仍频繁失败**·

```
[选 A·~2-3 天] OpenAI json_schema strict 替代 json_object
                · 只为 OpenAI/Azure 用户·非 OpenAI 不受益
                · 单次成功率 ~85% → ~95% (OpenAI 系)

[选 B·~5-7 天] SC1 schema 拆 4 路并行 (sc1 + sc1e + sc1f + sc1g)
                · 全 provider 受益·最大改动
                · 全成功率 ~85% → ~95%+ (全 provider)
```

**user 不主动开 A/B 之前·sprint 到此为止**。

---

## §6 风险·不做不行的

- **不做 Slice 0·SC1 主诉问题无任何改善** (user 报告的就是它)
- **不做 Slice 1·全 19 子调用都受截断 bug 影响**·不只 SC1
- **不做 Slice 2·R3 (sc1b/sc1c 静默) 是未来定位 bug 的瓶颈** (玩家报错时·log 里没记录)

---

## §7 不在 sprint 范围 (后续 backlog)

- sc25 (伏笔记忆)·sc27 (叙事审查)·sc28 (世界快照) 的 schema 健壮性单独审 (估 2-3 天)
- AI 诊断面板增强·把 R3 新记的 ctx.meta.errors 展示出来 (估 1 天)
- 设置面板·SC1 失败率/截断率/重试率 实时仪表盘 (估 2 天)

---

— Claude·2026-05-21
