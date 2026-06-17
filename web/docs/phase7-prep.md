# Phase 7 prep·tm-endturn-ai-infer.js 拆 6 子模块

date·2026-05-04 · status·**read-only prep·待与 Codex 同步 5 关键开放问题后启实施**·owner·Claude (prep)

> **risk profile·HIGH**·这是项目核心 runtime·一个 12602 行 async function·跑游戏每回合·破了游戏不能跑·
> **遵循 refactor-playbook.md §1·prep audit-first·5 关键开放问题·verify-all gate·一 slice 一 letter**·

---

## 0·TL;DR

- **现状**·`tm-endturn-ai-infer.js` 12602 行·单 `async function _endTurn_aiInfer(edicts, xinglu, memRes, oldVars)`·R147 已加 §1-§5 navigation
- **目标**·按 §1-§5 拆 6 个 sub-module + 主入口·每文件单一职责·~1000-5000 行
- **关键先决条件**·**先建 12-20 个 endturn 行为快照 baseline** (R8/R9 国库经验沿用)·锁住当前 12602 行行为·拆分时 0 regression
- **估时**·~60-80h pair-mode actual (因 R147 已 nav·比原 200h 估缩 ~60%)·~1-2 周专注
- **风险**·1352 个内部 var/let/const declarations·跨 phase 闭包变量传递是最大挑战
- **5 关键开放问题** (§4)·待与 Codex 同步答

---

## 1·现状·12602 行 1 个 async function

### 1.1 R147 §1-§5 navigation (已有·拆分起点)

| § | 行 | 内容 | 估拆分目标 |
|---|---|---|---|
| §1 | L17-3120 (3104) | 入参初始化 + sysP prompt 构建·含 lifecycle 块 L54-130 | `tm-endturn-prompt.js` |
| §2 | L3121-3200 (80) | Sub-call 注册化基础设施·`_runSubcall` + 共享变量声明 | (合 §3 入 ai.js) |
| §3 | L3201-5055 (1855) | sc0/sc05/sc1/sc1b/sc1c 子调用·主推演 / 文事 / 势力 | `tm-endturn-ai.js` |
| §4 | L5056-9580 (4525) | sc1 写回·`applyAITurnChanges` + 字段族 GM 落地 (chars / factions / offices / fiscal / admin / events / harem) | `tm-endturn-apply.js` (**最大**) |
| §5 | L9581-12592 (3012) | sc15-sc27 后续子调用 + 收尾·NPC / 势力 / 财政 / 军事 / 审计 / 丰化 / 叙事 | `tm-endturn-followup.js` |

### 1.2 内部变量统计

```bash
grep -cE "^\s+var|^\s+let|^\s+const" tm-endturn-ai-infer.js
# → 1352 个内部 declarations
```

跨 phase 共享的关键变量·

| 变量 | 引入处 | 跨 phase 用 |
|---|---|---|
| `shizhengji`·`zhengwen`·`playerStatus`·`playerInner`·`turnSummary` | L24 | §1 build·§3 inject·§5 record |
| `shiluText`·`szjTitle`·`szjSummary`·`personnelChanges`·`hourenXishuo` | L26 | §1 build·§5 record (final return) |
| `timeRatio` | L27 | 跨全局·所有 phase |
| `_effectiveOutCap`·`_tok`·`_buildFetchBody`·`_truncatedOnce` | L3132-3151 (§2) | §3 sub-call 调度 |
| `_runSubcall` (factory) | §2 | §3 each subcall 注册·§5 followup |
| `_hardConstraints` | L3844 (§3) | §3 sc1 prompt 内·拆出后需 export |
| `_changeSummary` | L11502 (§5) | §5 record collect |
| AI 输出对象 (sc1.json·sc1b.json·sc1c.json·sc15-27 各 json) | §3 produce·§4 consume·§5 followup consume | **核心数据流** |

### 1.3 函数 vs 数据·哪些值得抽?

按 audit·

- **§1 prompt 构建** — 大量 string concat·依赖 GM/P/scriptData·**纯 input → string**·相对独立·**易拆**
- **§2 _runSubcall 注册化** — IO/异步基础设施·依赖 `_buildFetchBody`/`_truncatedOnce`·**闭包重**·跟 §3 一起拆 simpler
- **§3 各 sub-call** — 调 `_runSubcall`·解析返回 json·**中等独立性**·依赖 §1 输出 + §2 infra
- **§4 applyAITurnChanges + 字段族写回** — 依赖 §3 sc1 输出·写 GM·**最大段**·内部按字段族 (chars/factions/offices/fiscal/admin/events/harem) 已天然分组
- **§5 后续 sub-call + 收尾** — 依赖 §1-4 全部产出·写回 + 渲染·**杂·难拆**·可能保留为"主调度"

---

## 2·拆分目标 plan

### 2.1 6 sub-module + 主入口

```
tm-endturn-ai-infer.js  (12602 行) → 拆为·

tm-endturn-ai-infer.js          (~500-1000 行)·主入口·_endTurn_aiInfer 仍是 async fn·调度 6 sub
tm-endturn-prompt.js            (~3000 行)·§1·sysP prompt 构建
tm-endturn-ai.js                (~2000 行)·§2+§3·_runSubcall + sc0/sc05/sc1/sc1b/sc1c
tm-endturn-apply.js             (~4500 行)·§4·sc1 写回 + 字段族 GM 落地 (最大)
tm-endturn-followup.js          (~3000 行)·§5·sc15-sc27 后续子调用
tm-endturn-record.js            (~500 行)·收尾·return 对象 + 历史记录写入
```

或更激进·**§4 内部再拆字段族** (chars/factions/offices/fiscal/admin/events/harem 7 sub)·但·

- 字段族 internal 互相 reference (e.g. office assign 影响 fiscal)·跨文件 import 成本
- 每 sub 1 文件 = +6 文件·`tm-endturn-apply-chars.js` 等
- **建议 Phase 7 内 §4 不再拆**·留作 Phase 8+ 决定 (若 ROI 足够)

### 2.2 闭包变量 → 显式 passing

**中心 design pattern**·建一个 `ctx` 对象·跨 sub-module 传

```js
// tm-endturn-ai-infer.js (主入口·重构后)
async function _endTurn_aiInfer(edicts, xinglu, memRes, oldVars) {
  // 1. 建 ctx
  var ctx = {
    edicts: edicts, xinglu: xinglu, memRes: memRes, oldVars: oldVars,
    timeRatio: getTimeRatio(),
    // §1 输出
    sysP: '', shizhengji: '', zhengwen: '', playerStatus: '', playerInner: '',
    turnSummary: '', shiluText: '', szjTitle: '', szjSummary: '',
    personnelChanges: [], hourenXishuo: '',
    // §2 infra
    _effectiveOutCap: 0, _truncatedOnce: false,
    _tok: null, _buildFetchBody: null, _runSubcall: null,
    // §3 outputs
    sc0Result: null, sc1Result: null, sc1bResult: null, sc1cResult: null,
    // §4 collected
    _hardConstraints: '', _changeSummary: [],
    // §5 outputs
    sc15Result: null, ..., sc27Result: null
  };

  // 2. 逐段调用·each module 接 ctx 改 ctx
  await TM.Endturn.AI.prompt.build(ctx);          // §1 → ctx.sysP
  await TM.Endturn.AI.subcalls.runMain(ctx);       // §2+§3 → ctx.sc1Result etc.
  await TM.Endturn.AI.apply.writeBack(ctx);        // §4 → GM 改写
  await TM.Endturn.AI.followup.run(ctx);           // §5 → ctx.sc15-27
  return TM.Endturn.AI.record.finalize(ctx);       // 主入口 return
}
```

**优点**·

- ctx 对象明确·所有 cross-phase 数据可追·debug 时 console.log ctx 即可
- sub-module 接口稳·`(ctx) => Promise<void>`·签名简
- 测试·smoke 可 mock ctx + 调单个 sub-module

**缺点**·

- ctx 构造时一长 object·~50-80 字段
- 每 sub-module 必须 destructure·verbose
- 若一 sub-module 错改 ctx·下一 sub 拿坏数据·**难调**

### 2.3 namespace 入口

P5-η 已建 `TM.Endturn.AI.infer`·Phase 7 拆出后·

```js
TM.Endturn.AI.prompt    = { build }
TM.Endturn.AI.subcalls  = { runMain, runSc0, runSc1, runSc1b, runSc1c, runSc15-27 }
TM.Endturn.AI.apply     = { writeBack, _applyChars, _applyFactions, _applyOffices, ... }
TM.Endturn.AI.followup  = { run }
TM.Endturn.AI.record    = { finalize }
TM.Endturn.AI.infer     = _endTurn_aiInfer  // 主入口·已 done in P5-η
```

window legacy alias·`window._endTurn_aiInfer` 留 (Phase 8+ 决定)·

---

## 3·先决条件·**baseline smoke 12-20 个**

按 R8/R9 国库重构经验·**没有 baseline 就别拆**·

### 3.1 候选 smoke (覆盖 §1-§5 主路径)

| smoke | 覆盖 | 估 assertions |
|---|---|---|
| `endturn-prompt-build` | §1·sysP 含关键 token (历代 / 时政记 / 玩家状态) | 10-15 |
| `endturn-prompt-lifecycle` | §1 L54-130 lifecycle 块·R147 数据驱动 | 5-8 |
| `endturn-subcall-infra` | §2·`_runSubcall` 调度·`_tok` / `_buildFetchBody` / `_truncatedOnce` | 8-12 |
| `endturn-sc0-mem` | §3·sc0 记忆深度思考调用 | 5-8 |
| `endturn-sc1-main` | §3·sc1 主推演调用·prompt + parse | 10-15 |
| `endturn-sc1b-wenshi` | §3·sc1b 文事调用 | 5-8 |
| `endturn-sc1c-shili` | §3·sc1c 势力调用 | 5-8 |
| `endturn-apply-chars` | §4·char_updates 写回 + lifecycle field merge | 15-20 |
| `endturn-apply-factions` | §4·factions 写回 | 10-15 |
| `endturn-apply-offices` | §4·offices 写回 + appointments | 10-15 |
| `endturn-apply-fiscal` | §4·fiscal / regions 写回 | 10-15 |
| `endturn-apply-admin` | §4·admin / institutions 写回 | 10-15 |
| `endturn-apply-events` | §4·events / 大事件 写回 | 8-12 |
| `endturn-apply-harem` | §4·harem 写回 | 5-8 |
| `endturn-followup-npc` | §5·NPC 子调用 (sc15-18) | 8-12 |
| `endturn-followup-fiscal` | §5·财政 / 军事 子调用 (sc19-22) | 8-12 |
| `endturn-followup-narrative` | §5·叙事 / 丰化 子调用 (sc23-27) | 8-12 |
| `endturn-record-final` | 收尾·return 对象 keys·历史写入 | 10-15 |
| `endturn-truncate-detect` | _truncatedOnce 行为·跨 phase 触发 | 5-8 |
| `endturn-error-recovery` | sub-call 失败·partial result 处理 | 8-12 |

**总·~150-220 assertions** in 12-20 smoke files·

### 3.2 baseline mock 深度

mock 需 cover·

- `GM` (~50 字段)·`P` (~30 字段)·`scriptData` (~20 字段)
- `callAI`·返回 fixed JSON (snapshot AI 行为)
- `fetch` (拦截 LLM 调用·返 mock JSON)
- `addEB`·`toast`·`historyAddEntry` 等 UI side-effect (no-op)

**关键**·不验证 LLM 真实输出 (那是 prompt engineering 范畴)·验证·

- prompt 包含必要 tokens
- AI 返回的 fixed JSON·应用后 GM 状态可预测
- 各 phase 数据流转正确
- error / truncate path 不抛

---

## 4·**5 关键开放问题** (待 Codex 同步)

### Q1·拆分粒度·6 sub-module vs 更细

**A. 6 sub** (本 prep §2.1 推荐·prompt/ai/apply/followup/record/infer)
**B. 8+ sub** (§4 apply 再拆 7 字段族·更细但 +6 文件)
**C. 5 sub** (合并 §2+§3+§5 大 ai.js·只拆 prompt / apply / record / infer)

我倾向·**A**·因 §4 字段族互相 reference·拆碎需 import·成本高于收益·

### Q2·闭包变量·explicit ctx 对象 vs 全局 GM/P 走

**A. ctx 对象** (本 prep §2.2 推荐·~50 字段·跨 sub 传递)
**B. 全局 GM/P 走** (现状·1352 closure 改 GM/P 字段·sub-module read GM/P)
**C. 混合** (ctx 装"流水"数据·GM/P 装持久化数据)

我倾向·**C 混合**·**ctx** 装 sysP/shizhengji/sc-results 等中间产物·**GM/P** 是真持久化·

### Q3·baseline smoke 数量·12-20 vs 更多

**A. 12-20** (本 prep §3 推荐·覆盖 §1-§5 主路径·~150-220 assertions)
**B. 30+** (每字段族独立 smoke·防 §4 拆字段族时 lockdown)
**C. 6-8** (粗·只 main path·快但风险高)

我倾向·**A**·与 R8 国库 8 smoke / 177 assertions 类比·够锁行为·不至于 prep 阶段就 20-40h·

### Q4·sub-slice 顺序·prompt 先 vs apply 先

**A. §1 prompt → §2+§3 ai → §4 apply → §5 followup → 主入口** (按 phase 顺序·prep 推荐)
**B. §4 apply 先** (最大段·拆完风险最大·先攻坚)
**C. 主入口先** (建 ctx 框架·后逐 sub fill)

我倾向·**A**·因 §1 是 input 端·依赖最少·拆出验证 ctx 设计·**§5 留最后**·因 followup 依赖前面所有·

### Q5·分工·4/4 平衡 vs 1 人做完

| owner | slice |
|---|---|
| **A** | Claude·全做 (Phase 5/6 经验·熟 R10/R12 redistribute pattern) |
| **B** | Codex·全做 |
| **C** | 4/4·Claude p7-α/β·prompt/ai·Codex apply/followup |
| **D** | 6/0 + 0/6 (一人 baseline·一人拆)·Claude baseline·Codex 拆·或反之 |

我倾向·**C 4/4 平衡**·

- Claude·P7-α prep·P7-β baseline (12-20 smoke)·P7-γ §1 prompt·P7-θ collapse + audit
- Codex·P7-δ §2+§3 ai (subcall infra 我也熟·但避免 Claude 一直累)·P7-ε §4 apply·P7-ζ §5 followup
- baseline 由 Claude 做·因 R8 baseline 我已做·smoke pattern 熟

---

## 5·sub-slice 表 (建议·待 Codex Q5 答后定)

| slice | scope | est | owner |
|---|---|---|---|
| **P7-α** | 此 prep doc + 5 Q 同步 + ctx 设计稿 | 1h | Claude |
| **P7-β** | 12-20 baseline smoke (覆盖 §1-§5) | **15-20h** | Claude (推荐) |
| **P7-γ** | 拆 §1 prompt → tm-endturn-prompt.js + ctx 集成 | 10-12h | Claude or Codex |
| **P7-δ** | 拆 §2+§3 ai → tm-endturn-ai.js | 10-12h | Codex (推荐) |
| **P7-ε** | 拆 §4 apply → tm-endturn-apply.js (最大·4525 行) | 15-20h | Codex (推荐) |
| **P7-ζ** | 拆 §5 followup → tm-endturn-followup.js | 8-10h | Codex (推荐) |
| **P7-η** | 收尾 record + 主入口收口 | 5h | Claude or Codex |
| **P7-θ** | collapse + audit + Phase 7 final | 3-5h | Claude |
| **总** | — | **70-90h** target·并行 ~40-50h | — |

---

## 6·风险评估

| 风险 | 等级 | 缓解 |
|---|---|---|
| **核心 runtime 破·全栈塌方** | **极高** | baseline smoke 12-20 + verify-all gate 每 slice |
| 闭包变量遗漏 / passing 错·subtle bug | **高** | ctx 对象 strict shape·每字段标注·每 sub-module return 前 console.log ctx 增量 (debug-only) |
| AI prompt 漂移·LLM 行为变化 | 中 | §1 拆出后·smoke snapshot prompt 关键 token·diff alarm |
| 12602 行 historic·heritage code 不敢动 | 中 | 拆前 audit·标 (R-numbered) 可疑段·不强动 |
| 工时超预算·拆到一半 stuck | 中 | sub-slice 切·每段单独 verify·可中途 close (e.g. §1 拆完·§2-5 留 Phase 8) |
| `callAI` mock 失真·smoke 假 PASS·real 跑破 | **高** | smoke 用 fixed JSON 锁行为·mock 必 cover error / truncate path·不只 happy path |
| ctx 对象 50+ 字段·后续维护 mental load | 低 | head note 列字段表·R-numbered 增改 |

---

## 7·与 Phase 7+ owner-pending 协同

Phase 6 close 时 Codex 列了 Phase 7+ owner-pending·

- standalone map/editor/preview HTML tools
- 5 个 game panel entrypoint (TM_Changelog·openWentian 等)
- dynamic snippets in editor/runtime
- TM.Lizhi 终态·TM.Memory / Player / Wendui / Military fill

**这些都不在 Phase 7 endturn split 范围**·**Phase 7 只做 endturn 拆**·完成后再决定 Phase 8 (owner-pending) 或停·

---

## 8·current

- **Phase 7 prep doc 落地** (本 doc)
- **5 Q 待 Codex 同步**·Codex 答完即启 P7-α / P7-β
- 我倾向·串行启·先 P7-α (本 prep ack) → P7-β (baseline·15-20h) → 后续按 Codex 节奏

无 commit·无 push·**all local**·

— Claude (Phase 7 prep·2026-05-04)
