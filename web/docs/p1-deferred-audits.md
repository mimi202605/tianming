# Phase 1 Deferred Audits

date·2026-05-03 · status·**Phase 2 完结·P1 标 audit 项**

来源·`web/docs/architecture-target-final.md` §4.4 / §4.9·`web/docs/architecture-map.md` §6 / §7

---

## 1·tm-edict-complete.js (451 行) audit

### 1.1 命名困惑·"complete" 是啥

读头注·**清楚**·

> "诏令系统补完"

→ **complete = 补完**·**指·诏令系统 P1 阶段补全的 features**·**非 'complete dump' 或 'complete archive'**

### 1.2 实质内容

- **11 类奏疏反向触发规则** (MEMORIAL_TRIGGERS)·水灾 / 旱荒 / 清查逃户 / 边警 / etc
- **6 主题诏书问对** (Help 页面)
- **tryExecute → 自动分流·submitToMemorial / askForClarification**
- **各子系统 aiEntry 执行逻辑**
- **抗疏 UI 处理选项**
- **游戏模式 × 贪腐提示三模式**

### 1.3 结论

| 项 | 结果 |
|---|---|
| 性质 | **active·实质功能** (非 dump·非 patches·非 transitional) |
| 边界 | clear·**诏令系统 P1 补完功能** |
| Phase 2 行动 | **保留**·**不动** |
| Phase 3 考虑 | inline 入 tm-edict-parser.js or tm-edict-lifecycle.js·**待 audit·或留独立** |
| Phase 5 namespace | TM.Edict.Complete |
| 头注 | ✓ 已有 (R-注·实施 list) |
| lint 全 pass | ✓ |

### 1.4 命名建议 (P3+)

可 rename·**`tm-edict-补完.js` → `tm-edict-implementations.js`** (英化)·或保留 (中文意义 explicit)·**low priority**

---

## 2·tm-arcs.js (161) vs tm-char-arcs.js (317) audit

### 2.1 关系·**非 duplicate·sync vs async 互补**

#### tm-arcs.js (161·同步·event-driven)

- 头注·"角色弧线 + 玩家决策追踪"·R91 抽出 (从 tm-endturn.js §A 抽出·原 L2213-2356)
- **5 functions** (sync·event-driven 记录)·
  - `recordCharacterArc(charName, eventType, description)` — 记录角色重大事件
  - `getCharacterArcSummary(charName)` — 取角色弧线摘要
  - `getAllCharacterArcContext()` — 全角色弧线 context (供 AI sysP)
  - `recordPlayerDecision(decisionType, content)` — 记录玩家决策
  - `getPlayerDecisionContext()` — 取玩家决策 context (供 AI sysP)
- 外部调用·recordCharacterArc 6 个 js·recordPlayerDecision 3 个·context 用于 tm-memory-anchors

#### tm-char-arcs.js (317·异步·idle-driven)

- 头注·"人物情节弧推进·后台 idle 异步调度"
- **三层触发保险**·
  - Layer 1·enterGame:after +10s·requestIdleCallback
  - Layer 2·面板打开时 (openCharDetail / openWenduiModal)·预热
  - Layer 3·过回合前兜底检查
- 缓存·`GM._charArcs`
- 主推演 sysP 读取·**AI 按弧线演 NPC**
- 阈值·MIN_IMPORTANCE 65·MAX_KEY_CHARS 12·CACHE_REFRESH 2 turns

### 2.2 区别·**完全互补**

| 项 | tm-arcs.js | tm-char-arcs.js |
|---|---|---|
| 性质 | 同步·event-driven | 异步·idle-driven |
| 触发 | 业务 module 主动 record | idle 后台自动推 |
| 数据 | GM.characterArcs (event log) | GM._charArcs (idle 推演 cache) |
| 用途 | 记录 + 取 context | 推演 + AI 按弧线演 |
| 函数数 | 5 sync | ~6 async (调度 / 缓存 / prompt) |

### 2.3 结论

| 项 | 结果 |
|---|---|
| 关系 | **完全互补·非 duplicate** |
| Phase 2 行动 | **保留 2 文件**·**不动** |
| Phase 3 行动 | **rename 提议** (低 priority)·明示边界·
  - `tm-arcs.js` → `tm-arcs-record.js` (event-driven 记录)
  - `tm-char-arcs.js` → `tm-arcs-async.js` (idle 推演) |
| Phase 5 namespace | `TM.Arcs.record` / `TM.Arcs.async` |
| 头注 | ✓ 两文件都已有 (R91 / 三层触发说明) |
| lint 全 pass | ✓ |

### 2.4 命名 critique·#2 critical 诉求

我之前 (slice 1 architecture-map.md §6 / §7) **错把 `tm-arcs` vs `tm-char-arcs` 标 "P1 audit·关系不明"**·

audit 后·**关系明确**·**互补·非 duplicate**·**应同时保留**·**rename 提议是 P3 优化·非 P1 必做**

---

## 3·总结·两 P1 deferred audits 完结

| 文件 | 性质 | Phase 2 行动 | Phase 3 候选 |
|---|---|---|---|
| `tm-edict-complete.js` | active·诏令补完功能·非 dump | **保留** | inline 入 tm-edict-parser·或留独立 |
| `tm-arcs.js` (sync record) | active·event-driven 弧线记录 | **保留** | rename `tm-arcs-record.js` |
| `tm-char-arcs.js` (async idle) | active·后台 idle 推演 NPC 弧线 | **保留** | rename `tm-arcs-async.js` |

---

## 4·doc 同步 (待 update)

next slice / batch·

- `architecture-map.md` §1 行 20·tm-arcs.js / tm-char-arcs.js 标 "P1 audit"·**update 为·sync vs async 互补·两文件同保留** (非 audit unknown)
- `architecture-map.md` §1 行 48·tm-edict-complete.js (P1 audit) → **active·诏令补完·非 dump**
- `architecture-map.md` §6 §7·**delete audit-pending entries** (这两条 P1 audit 已完)
- `module-boundaries.md` §15·**说明 tm-arcs vs tm-char-arcs 互补** (sync/async)
- `architecture-target-final.md` §4.9 / §4.4·同步 audit 结论

---

— end of p1-deferred-audits.md
