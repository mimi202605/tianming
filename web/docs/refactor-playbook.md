# Refactor Playbook (v1·draft)

date·2026-05-04 · status·**v1 草稿·Phase 6 doc finalize 待批 (与 architecture-map.md/module-boundaries.md 一并发布)**
owner·Claude

> 本 playbook 是 Phase 1-5 重构经验的提炼·非教程·非理论·**实操指南**·
> 适用对象·将来在 tianming 仓库做大规模重构的 agent / 人·
> 目的·让下一轮重构不必从零·复用 LAYERED 真合·redistribute·alias-rename 等模式·

---

## 1·pair-mode 协议 (Codex/Claude 双 agent 协作)

### 1.1 基本节奏

```
prep audit (read-only·doc-only)
  ↓
信件通知 + 边界讨论
  ↓
实施 (一 slice 一 round)
  ↓
verify-all gate (smoke 不破 + 个数 +1)
  ↓
信件 done + ACK
  ↓
下 slice
```

### 1.2 三铁律

1. **一 slice 一 letter**·done 后即写·不 batch
2. **prep audit-first**·大 slice (>1h) 必先 doc-only audit·锁结构
3. **verify-all gate**·每 round 必跑·非全绿不 letter

### 1.3 letter 命名

```
codex-claudecode-dialogue/2026-05-04-{author}-{slice-name}-{verb}.md
```

例·

```
2026-05-04-codex-p5-beta-done-go-p5-gamma.md
2026-05-04-claude-p5-alpha-done-go-p5-beta.md
```

### 1.4 letter 模板

```markdown
# {Author} -> {Receiver}: {one-line summary}

{Receiver}·

收 {prev letter}·{ack one line}·

## 1. {slice} done

### 1.1 改动·{file count·~lines}
[changes table]

### 1.2 verify-all·{N/N}
[verify summary]

## 2. {slice} 关键判断
[1-3 key decisions]

## 3. zero regression
[baseline table·全保]

## 4. 你的下一步
[next slice signal]

## 5. current
[3-5 line state]

无 commit·无 push·**all local**·

— {Author}
```

### 1.5 boundary discussion·5 开放问题模式

大 phase 启动时·**5 关键开放问题**列表·一信问·一信答·一信确认·

例 Phase 5 启动时 (2026-05-04)·

```
Q1·24 vs 18 namespace?
Q2·R87 facade keep vs rebuild?
Q3·alias 期长度?
Q4·HTML inline onclick 处理?
Q5·slice 分工?
```

3 round 内 closed·进入实施·

---

## 2·保守拆分·一刀只做一件事

> **memory rule**·`feedback_conservative_slicing.md`

### 2.1 反模式

- 改 fiscal 时"顺手"清理 economy
- 改 namespace 时"顺手"翻译中文字符串
- 改 LAYERED 时"顺手"删 defensive shim

### 2.2 正模式

- 大 phase 拆 3-5 slice (R10 拆 §A-§Q 8 sub)
- 每 slice 单一职责
- 边界外的"问题"标记·后续 slice 处理

### 2.3 例外·明确说

```
"R12b 同时 inline + delete patch (atomic)"
→ 边界讨论时 explicitly 说·非"顺手"
```

---

## 3·LAYERED 真合 pattern (R12 经验)

### 3.1 何时用

文件 A 定义 fn·文件 B `OVERRIDE` 之 (load 顺序后)·形成 LAYERED 链·

```js
// A·tm-edict-parser.js
EdictParser.tick = function() { /* v1 */ };

// B·tm-phase-c-patches.js (load 后)
EdictParser.tick = (function(orig) {
  return function() { orig(); /* v2 ext */ };
})(EdictParser.tick);
```

### 3.2 真合步骤

1. **先 smoke baseline**·覆盖 v1+v2 行为 (R8 → R9/R12 pattern)
2. **inline OVERRIDE 入 v1**·把 patch 文件内容 inline 入 A
3. **delete patch file**
4. **改 callers 移除 patch load** (index.html script tag)
5. **加 defensive shim** (e.g. `PhaseC.init = function() {}`·防 3rd party 引用)
6. **smoke 必须仍 PASS** (不增不减 assertion·只是真合)

### 3.3 R12 实测

- R12a·smoke baseline·54 assertions
- R12b·inline merge + delete patch
- R12c (Codex)·phase-f1 同模式
- 共 -2 文件·LAYERED 0 残留

---

## 4·redistribute pattern (R10 经验)

### 4.1 何时用

巨型 grab-bag 文件 (e.g. `tax-atomic.js` 4000+ 行)·域杂·拆分为 §A-§Q 入对应 engine·

### 4.2 步骤

1. **audit grab-bag·按域分 §**·R10 的 §A-§Q (17 段)
2. **每 § 一 sub-slice**·一 round 一 verify-all
3. **`(global.NS && global.NS.fn) || localFn` ladder pattern**·avoid breaking caller

```js
// caller 改·
- enableTaxesByDynasty(dynasty);
+ ((global.FiscalEngine && FiscalEngine.enableTaxesByDynasty) || enableTaxesByDynasty)(dynasty);
```

3. **collapse**·全 § 都 redistribute 后·删 grab-bag·改 caller 走新 ns

### 4.3 R10 实测

- §A-§Q 8 sub-slice (Claude) + 9 sub-slice (Codex 后续)
- 每 sub verify-all 35/35 全绿
- 总 -1 net file·~676 行删

---

## 5·头注 12 字段模板

每个改动文件必带头注·

```js
// @ts-check
/// <reference path="types.d.ts" />
// ============================================================
// {filename} — {one-line domain}
//
// Module:    {module name·与 24 ns 对应}
// Domain:    {fiscal·economy·etc}
// Status:    {active·legacy·deprecated}
// Owner:     {Codex/Claude/shared}
// Imports:   {dependency files}
// Exports:   {global.X / TM.X.* exposure}
// Used by:   {caller files}
// Side effects: {YES/NO·注释何时}
// Test:      {smoke file path}
// Notes:     {R-numbered changelog·R10/R12 等}
// ============================================================
```

### 5.1 头注 audit pass

每 phase close 时·**audit pass**·验所有改动文件头注·

- R11d·Phase 3 内 12 文件·Pass 2
- Phase 4 内 P4-α-1 / P4-β-1 / P4-β-2 各 verify

---

## 6·alias-then-rename 5 步 ladder

> Codex 共识·R87 stage 2 → Phase 5 → Phase 6 三阶段·

```
Step 1·建 namespace 容器
  TM.Foo = TM.Foo || {};

Step 2·定义写进 namespace
  TM.Foo.bar = function() { ... };

Step 3·保 window alias (legacy compat)
  window.bar = TM.Foo.bar;

Step 4·verify-all·smoke 不破·一 round 一 commit

Step 5·alias 退役 (Phase 6 才删)
  - grep 全 window.bar 调用方·改 TM.Foo.bar()
  - 删 window.bar = ... 行
  - verify-all 仍绿
```

### 6.1 R87 → P5 → P6 进化

| 阶段 | 状态 |
|---|---|
| R87 (Phase 1) | getter 门面·whitelist 5 facade |
| Phase 5 (本) | 24 canonical·sub-ns 填·alias 留 |
| Phase 6 | rename alias 退役 (TM.MapSystem → TM.Map 删·只留新名) |

---

## 7·close-by-value vs close-by-count (Phase 4 决议)

### 7.1 反模式·count

> "26 个 <200 行小文件全合并"

机械的·会破坏·

- 清晰分层·`map-converter` (数据) / `integration` (逻辑) / `display` (UI) 合并 → 单文件 1200 行混域
- domain boundary·`tm-diagnostics-panel` (大 dashboard) 与 `tm-error-collector` (event capture) 是不同抽象层

### 7.2 正模式·value

只合并·

- 真正同 cluster·load 顺序绑定·相互依赖
- 同 domain·同抽象层
- merge 后单文件仍 cohesive

### 7.3 标记·by design split

audit doc explicit 写·

```
P4-α-2 defer·by design split (非未完成项)
- map-converter 数据层
- map-integration 逻辑层
- map-display UI 层
```

---

## 8·编码事故 recovery (memory rule)

> **memory rule**·`feedback_encoding_recovery.md`

### 8.1 严禁·ASCII-safe 替换

GBK → UTF-8 mojibake (e.g. `路` instead of `·`·`畏` instead of `η`·`味` instead of `ζ`)·**绝不能**·

```
× P5-味 (mojibake)
↓
× P5-zeta (英文替换·破坏中文显示契约)
```

### 8.2 必从备份还原

```
1. 找最后好的 backup (`backups/2026-05-XX-rN.before.js`)
2. 三方 diff (current·backup·intended-change)
3. 还原 mojibake 段为 backup·intended 改动 reapply
4. grep 中文 token 数量·前后必相等
```

### 8.3 R11ab 实测

R10 fiscal compat fix 时·25 个税名 mojibake → 英文 (Codex 不慎)·**还原从 `backups/2026-05-04-r10-tax-atomic-redistribute/tm-tax-atomic.before-r10a.js`**·24 行 head note + 25 中文 display name 还原·

---

## 9·重构禁顺手翻译中文 (memory rule)

> **memory rule**·`feedback_chinese_string_translation_during_refactor.md`

### 9.1 反模式

LLM 重写大段 export 时·会"顺手"把 `'田赋（粮）'` 翻成 `'land tax (grain)'`·**破坏 UI 契约**·

`tm-var-drawers.js:1194` 直接显示 `t.name` in HTML·一翻 UI 全乱·

### 9.2 检测

每次 commit 前·

```bash
# grep 中文 token 数量·前后比对
git diff HEAD --stat -- '*.js' | grep -oP '[一-鿿]' | wc -l
```

数量必相等·若减·**abort·还原**·

---

## 10·save* 必须 clone-then-overlay (memory rule)

> **memory rule**·`feedback_editor_save_clone_overlay.md`

### 10.1 反模式

```js
// 错·从 0 重建·会洗掉 phase 6 字段
function saveOffice() {
  return {
    name: form.name,
    rank: form.rank
    // forgot phase6 fields·dropped on save
  };
}
```

### 10.2 正模式

```js
// 对·clone 旧对象·overlay UI 字段
function saveOffice(existing) {
  return Object.assign({}, existing, {
    name: form.name,
    rank: form.rank
  });
}
```

UI 不知道的字段 (后续 phase 加的)·必须 preserve·

---

## 11·HTML inline onclick·alias 留·Phase 6 才动 (Q4 决议)

### 11.1 不全自动

- 412 处 onclick 跨 12 HTML 文件
- sed 全自动 → 错域 alias (e.g. `aiGenChr` → `TM.Editor.X` 实际 `TM.Office.legacy`)
- **必半自动 + 手动 review**

### 11.2 留 by design

| HTML | 处理 |
|---|---|
| index.html | 改 TM.X.fn() (game runtime 主体) |
| editor.html | 改 TM.Editor.X.fn() |
| map-editor-{pro/smart/region}.html | **留 window** (独立 .html 工具·by design) |
| preview-*.html | **留 window** (静态预览·非 game runtime) |

---

## 12·verify-all 是 ground truth

### 12.1 baseline 增长

```
P3 close·35
P4 close·39 (+ui-foundation +diagnostics-foundation +R12 phase-c +R12 phase-f1)
P5 close·47 (+ P5-α/β/γ/δ/ε/ζ/η/θ 各 +1)
```

每 P phase 内·single slice 必 +1 (新 smoke)·**或 +0** (改动不需 new smoke)·**绝不 -1**·

### 12.2 fail-fast·绝不 skip

verify-all.js 行 121·

```js
if (!ok) {
  process.stderr.write('\n[verify-all] ' + c.name + ' failed; aborting remaining checks\n\n');
  process.exit(1);
}
```

never `--skip-failure`·never `--no-verify`·

---

## 13·changelog & R-number 编号

### 13.1 R-number 单调递增

R59 → R87 (R59 修正) → R102 → R106 → R113 → R118 → R143 → R200 → R201-R207

绝不 reuse·绝不 fork (R200a/R200b 这种禁)·

### 13.2 R200+ 是 Phase 5 起点

```
R200·P5-α reconcile·24 ns 容器
R201·P5-β NPC/Char (Codex)
R202·P5-γ Edict (Claude)
R203·P5-δ Fiscal/Economy/Guoku/Neitang (Claude)
R204·P5-ε Authority/Office/Keju/Corruption (Claude)
R205·P5-ζ Map/UI (Codex)
R206·P5-η Endturn (Codex)
R207·P5-θ Editor (Codex)
```

R208+ 留 Phase 6·

### 13.3 重要改动写 changelog.json

新增 changelog entry·

```json
{
  "round": "R203",
  "date": "2026-05-04",
  "owner": "Claude",
  "title": "P5-δ Fiscal/Economy/Guoku/Neitang sub-ns fill",
  "what": [
    "TM.Fiscal: engine/cascade/fixedExpense/legacy",
    "TM.Economy: 7 sub-engine + 4 R10 alias rescue",
    ...
  ],
  "why": "Phase 5 stage 2·R87 facade keep + sub-ns extend",
  "files": ["tm-namespaces.js", "tm-fiscal-engine.js", "scripts/smoke-p5-delta-fiscal.js"],
  "verifyAll": "43/43"
}
```

---

## 14·禁止用 git 命令绕障 (memory rule)

> **memory rule**·`feedback_no_destructive_git`

### 14.1 反模式

```bash
git reset --hard HEAD~3      # 抹本地 work
git commit --no-verify       # bypass hook
git push --force             # bypass remote check
```

### 14.2 正模式

- 出问题·`git status` + `git diff` + 找 root cause
- 工作未 commit·暂存·不 reset
- pre-commit hook 失败·修问题·不 bypass
- push 拒·拉远端 + rebase / merge·不 force

---

## 15·禁止失败时玄幻惩罚 (memory rule)

> **memory rule**·`feedback_no_mystic_penalties`

### 15.1 反模式

游戏机制设计时·"任务失败 → 彗星见·天命扣减"·

### 15.2 正模式

任务失败 → **自然政治后果**·

- 改革失败·朝臣弹劾·权威下降
- 战役失败·士兵伤亡·军费亏损
- 财政崩·借贷·腰斩税·官场震荡

---

## 16·工具型 vs 系统型 代价不混 (memory rule)

> **memory rule**·`feedback_tool_vs_system_costs`

### 16.1 工具型

零代价·即时·便利·

- 编辑器面板
- 查看 panel
- save/load slot

### 16.2 系统型

挂政治后果·

- 调税率 → 民心 / 腐败
- 调征兵 → 户口 / 经济
- 任免官员 → 派系 / 腐败

### 16.3 不混搭

工具型按钮·绝不 trigger 系统后果·**两个模型不可混**·

---

## 17·编辑器与游戏关系 (memory rule)

> **memory rule**·`feedback_editor_game_relation`

```
编辑器·宪法制定者
游戏·历史演绎者
```

编辑器定·游戏跑·新机制必须·

- 编辑器面 (设计输入)
- 运行时面 (机制实现)
- AI 面 (NPC/Player AI 感知)

3 面缺一·机制不完整·

---

## 18·行政区划设计原则 (memory rule)

> **memory rule**·`project_admin_division_design`

```
顶级必完整生成
下级按需
父 >= 子之和
领土得失/改革/侨置·动态变迁
```

P/GM.adminHierarchy 必 honor 这 4 条·

---

## 19·current playbook adoption

| Phase | Adopted in |
|---|---|
| pair-mode 协议 | Phase 1+ |
| 保守拆分 | Phase 3+ (memory) |
| LAYERED 真合 | Phase 3 R12 |
| redistribute | Phase 3 R10 |
| 头注 12 字段 | R11d audit pass |
| alias-rename ladder | R87 → Phase 5 → Phase 6 |
| close-by-value | Phase 4 |
| 编码 recovery | R11ab (memory) |
| 禁翻译中文 | R10 (memory) |
| save clone-overlay | (memory) |
| HTML inline 不全自动 | Q4 决议 |

---

## 20·后续 phase 适用

本 playbook 是 Phase 1-5 经验·若 Phase 7+ 重启·

- 直接 reuse·不必从零
- 新模式·补 §21+
- 反模式 (踩坑)·补 memory + 引用此 playbook

---

— Claude (refactor-playbook v1 draft·2026-05-04)
