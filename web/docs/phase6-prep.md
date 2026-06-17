# Phase 6 prep·alias 退役 + architecture 文档 finalize

date·2026-05-04 · mode·**read-only prep doc·待 Phase 5 close 后启**·owner·Claude (prep)

> 与 Codex 共识 (2026-05-04 信)·Phase 6 = alias 退役 + docs finalize·1-2 day·

## 0·TL;DR

- **alias 退役**·grep 全调用方·改 TM.X·删 R200 alias (TM.MapSystem → TM.Map·TM.Storage → TM.Save 双向)
- **HTML inline onclick**·**412 处** 跨 12 个 HTML 文件·按 Q4 决议·Phase 6 才统一处理
- **3 文档 finalize**·`architecture-map.md` v1·`module-boundaries.md` v1·`refactor-playbook.md` v1 (新)
- **lint 强化**·新增 disallow `window.legacyName` 直调
- **TM.Lizhi 终决**·入 TM.Office.Lizhi 或 TM.UI.Lizhi (Codex Q1 决议·Phase 6 决定)
- **估时·~1-2 day**·按 architecture-target §9

---

## 1·alias 退役范围 (grep 实测)

### 1.1 R200 alias·TM.Map ⟷ TM.MapSystem·TM.Save ⟷ TM.Storage

```bash
$ grep "TM\.\(MapSystem\|Storage\|Lizhi\)" *.js
# 结果·81 hits 跨 9 文件·实际 production 仅 6 文件·
```

| 文件 | 出现 | call site |
|---|---|---|
| `tm-namespaces.js` | 31 | self-reference·meta·**保留**·R200 alias 定义 |
| `tm-lizhi-panel.js` | 7 | self·panel 内调·**Lizhi 终态决定后改** |
| `tm-test-harness.js` | 13 | test framework·内部·改不改不影响 |
| `tm-game-loop.js` | 1 | `TM.MapSystem.open("regions")` → 改 `TM.Map.open(...)` |
| `tm-hongyan-office.js` | 1 | `onclick="TM.MapSystem.open('terrain')"` → 改 HTML inline (Phase 6 一并改) |
| `tm-save-manager.js` | 1 | comment only·doc reference |
| smoke scripts | 25 | smoke 引用 alias·**保留**·验 alias 不破 |

**production 改动·~3 处**·

### 1.2 R87 facade alias 退役·更难

R87 facade getter 透传 (TM.Economy.getTributeRatio 等)·**Phase 6 不动 R87 facade 顶层**·因·

- R87 facade 已 alias·内部调用方仍走 facade 即可·
- 删除需要改 50+ call site·成本高·收益低·
- 推荐·**R87 facade 留·Phase 6 alias 退役只针对 P5 sub-ns alias** (.MapSystem · .Storage · 部分 .Lizhi)·

---

## 2·HTML inline onclick·**412 处** (Q4 主战场)

### 2.1 grep 结果

```
$ grep -rE "onclick=" --include="*.html"  | wc -l
412
```

跨 **12 个 HTML 文件**·

| 文件 | 估 onclick 数 | 处理 |
|---|---|---|
| `index.html` | ~150 | 主 game UI·**主战场**·改 `TM.X.fn()` |
| `editor.html` | ~80 | editor 主面·改 `TM.Editor.X.fn()` |
| `map-{annotator,editor-pro,smart,region-editor}.html` | ~50 | 独立 .html 工具·**留 window**·by design split |
| `preview-*.html` (6 文件) | ~130 | 静态预览·**留 window**·非 game runtime |

**实际改动·~230 处** (index 150 + editor 80)·**留 window·~180 处** (map editors + preview)·

### 2.2 改动策略

按 Codex Q4 决议·

```
方案 B (Q4 选定)·
  Phase 5·HTML 不动·alias 留 window
  Phase 6·grep + 半自动 sed + 手动 audit·改 TM.X.fn()
```

**实施**·

```
1. grep `onclick="(\w+)(\(`·提取所有 inline fn 名·
2. 对照 TM.X.* sub-ns 表·决定 each 改成 TM.X.fn()·
3. 部分留 (map editors / preview)·标 'by design legacy'·
4. verify-all gate·47/47·smoke 不破
5. headless-smoke 测 UI 路径·确保 onclick 仍 work
```

estimate·**~3-4h**·sed 半自动 + 手动 review (避错域 alias·如 aiGenChr 是 Office 域不是 Editor 域)·

### 2.3 风险

| 风险 | 等级 | 缓解 |
|---|---|---|
| sed 改错域 (aiGenChr → TM.Editor.X 而实际应 TM.Office.legacy) | **中** | 必手动 review·grep 域归属 prep audit 已锁 |
| 漏改一处·导致 button click 抛 ReferenceError | 低 | headless-smoke + render-smoke + manual UI 测 |
| HTML inline event binding (`<input onchange="fn(this)">`) 与 onclick 不同·脱节 | 低 | grep 全部 `on\w+="` 而非只 onclick |

---

## 3·3 文档 finalize

### 3.1 `architecture-map.md` v1 (现 297 行)

更新点·

- 加 Phase 4-5 历程 (R200-R207·24 ns 终表)
- 加 file → namespace 映射表 (P5 prep doc 已写·搬过来)
- 加 dependency graph (engine → panel → UI 层级)
- 删 P3 之前的 grab-bag 描述

### 3.2 `module-boundaries.md` v1 (现 561 行)

更新点·

- 24 ns boundary 锁
- HTML inline 决议 (Phase 6 改 vs 留)
- 跨域 fn (e.g. `_checkGaituEscalation` 跨 Edict/Office) 的归属决议
- TM.Lizhi 终态归 (Office 还是 UI)

### 3.3 `refactor-playbook.md` v1 (新建)

内容·

- pair-mode 协议·一 slice 一 letter·verify-all gate·prep audit-first
- 保守拆分原则·一刀只做一件事·**写入 memory**
- LAYERED 真合 pattern (R12 经验)
- redistribute pattern (R10 经验)
- 头注 12 字段模板
- alias-then-rename 5 步 ladder
- close-by-value 而非 close-by-count (Phase 4 决议)

---

## 4·R87 facade vs P5 alias·该不该退役

| 类型 | Phase 6 退役? | 理由 |
|---|---|---|
| **R200 rename alias**·`TM.MapSystem`·`TM.Storage` | **退役** (3 production call sites) | 改名干净·调用方少·成本低 |
| **R87 facade 顶层**·`TM.Economy`·`TM.Lizhi`·`TM.Guoku`·`TM.Neitang` | **保留** | facade 是 R87 设计目的·删了等于回退 R87·调用方 50+·成本高 |
| **R201-R204 sub-ns alias** (TM.NPC.engine·TM.Edict.parser 等) | **保留** | sub-ns 是 Phase 5 的目的·非 alias |
| **window.X legacy global** | **保留**·按 Q4 | HTML inline 仍调·改了破·留即可 |

**结论**·Phase 6 alias 退役 ≠ 全部删·只删 P5-α 那种 rename alias (3 处)·R87 facade 留·HTML inline 大多数留·

---

## 5·lint 强化·optional

按 architecture-target §9·

```
"alias 退役·lint 强化"
```

可选·新增 lint rule 检查·

- 新代码不准 `window.legacyName` 直调 (必走 TM.X.fn)
- 新代码不准 `aiGenChr()` 裸调 (必 TM.Office.legacy.aiGenChr)
- 例外·HTML inline 仍可裸调 (alias 留)

implementation·`scripts/lint-namespace.js` 新建·~50 行·grep + AST·或 simple regex·

estimate·~30 min·optional·

---

## 6·TM.Lizhi 终态决议

Codex Q1 共识·Lizhi 不入 24 canonical·Phase 6 决定移到·

- 选项 A·`TM.Office.Lizhi` (吏治在历史上是官制 sub)
- 选项 B·`TM.UI.Lizhi` (lizhi-panel 实际 UI·panel 域)
- 选项 C·**保 R87 TM.Lizhi 顶层 alias·不动** (推荐·alias 留 + 加 .panel sub 标 legacy·Phase 7 才决定)

我推荐·**C**·因 7 处 self-reference 内部调·改了风险大·收益小·**alias 留即可**·

---

## 7·Phase 6 拆 sub-slice (推荐 4-5)

按 cluster·一 cluster 一 round·

| sub | scope | est | owner |
|---|---|---|---|
| **P6-α** | R200 rename alias 退役·grep 调用方·改 TM.Map·TM.Save·删 alias | 1h | Claude (我做) |
| **P6-β** | HTML inline onclick·index.html (~150 处)·改 TM.X.fn() | 2h | Codex |
| **P6-γ** | HTML inline onclick·editor.html (~80 处)·改 TM.Editor.X.fn() | 1.5h | Codex |
| **P6-δ** | architecture-map.md / module-boundaries.md update + refactor-playbook.md 新建 | 2h | Claude (我做) |
| **P6-ε** | lint 强化 (optional)·`scripts/lint-namespace.js` | 30 min | 任一 |
| **总** | — | **~7h** | — |

并行 ~4-5h·**1 day 内 close**·

---

## 8·Phase 5 close 时·verify-all 47/47·则 Phase 6 启信号 ready

启动条件·

- ✅ Phase 5 close (Codex 剩 P5-ζ/η/θ·按节奏)
- ✅ 24 ns 终表 (R200-R207 全 done)
- ✅ HTML inline grep 完成 (412 处全表)
- ✅ 3 文档现状已读

我现在已 prep done·等 Phase 5 close 即启 P6·

---

## 9·Phase 6 close 标准

| 项 | done? |
|---|---|
| R200 rename alias 删除·调用方全改 | TBD |
| HTML inline onclick 230 处改 TM.X.fn (180 留 by design) | TBD |
| architecture-map.md v1 | TBD |
| module-boundaries.md v1 | TBD |
| refactor-playbook.md v1 (新建) | TBD |
| lint-namespace.js (optional) | TBD |
| verify-all 47/47·zero regression | TBD |

---

## 10·current

- **Phase 5 进行中** (Codex P5-ζ/η/θ 待·我 Claude 4 slice done)
- **Phase 6 prep doc 落地** (本 doc)
- 待 Phase 5 close 即启 P6
- 估 1 day 内 close (per target §9·1-2 day)

— Claude (Phase 6 prep doc·2026-05-04)
