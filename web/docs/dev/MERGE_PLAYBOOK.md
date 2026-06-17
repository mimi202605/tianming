# 天命 · 测试环境合并作业手册

> 专供**已进入 Electron 测试环境**的维护者使用。
> 前 14 轮 A 类重构已建立基础设施，本文档告诉你如何用它们真做物理合并。
> 2026-04-24 R85

---

## 🎯 核心原则

**永远不要不走工具直接改 LAYERED 文件**。每次合并都必须走：

```
1. 打开游戏，玩 3-5 回合（让基础数据充分）
2. TM.checklist.preMerge('描述')
3. 改代码
4. 重新加载游戏（Ctrl+R 或 Electron 菜单 View → Reload）
5. 玩同样 3-5 回合（同样操作）
6. TM.checklist.postMerge('描述')
7. 看 overall 判断：'ok' 继续，'needs-review' 停下排查
```

---

## 📋 测试环境准备清单

**第一次进入测试环境必做**：

```javascript
// 1. 验证基础设施
TM.onboard()
// 应该看到 DA/TM.invariants/errors/perf/test 各 step 都有响应

// 2. 跑完整 smoke test
TM.test.run()
// 应该 200+ 通过，0 失败

// 3. 确认版本一致性
TM.version.report()
// 应该打印"所有文件版本号一致 ✓"

// 4. 剧本结构健康
TM.validateAllScenarios()
// 应该 3/3 通过

// 5. 不变量初始健康
TM.invariants.check()
// stats: 10/10 passed

// 6. 启用自动巡检（可选，后台每 5s 扫一次不变量）
TM.invariants.enableAutoCheck()

// 7. 启用污染守卫（可选，监视新增 window.*）
TM.guard.start()
```

**任一步有红色错误 → 基础设施本身有问题，先修这个再动其他**。

---

## 🔥 5 个典型合并场景 Playbook

### Scenario 1 · 删除 tm-patches.js 的双保险原代码（最安全先做）

**背景**：R17/R18/R20/R21 已把 Modal/Military/World/Editor Details 迁到独立文件，但 tm-patches.js 原代码还保留作双保险。验证稳定后可删。

**风险**：★☆☆☆☆（极低，4 段独立代码）
**预估工时**：2-4h（含验证）

**步骤**：

```javascript
// ━━ 准备 ━━
// 1. 跟进度读 tm-patches.js 头部，确认 §5/§6/§7/§8 标注 "已迁移"
// 2. 游戏启动并玩 5 回合，执行 Settings/Modal/World/Military/Editor Details 全流程 UI
//    （开设置、打开/关闭模态框、看天下大势、编辑物品、编辑军队）
//    全部正常 → 双保险的新文件独立工作

// ━━ 基准 ━━
TM.checklist.preMerge('delete-patches-doubled-code')

// ━━ 逐段删 ━━
// 依次删除 tm-patches.js 的：
//   §5 Editor Details（L1682-1860，179 行）
//   §6 Modal System（L1861-1892，32 行）
//   §7 World View（L1896-2090，195 行）
//   §8 Military System（L2092-2174，83 行）
// 共约 489 行被删（保留原 tm-patches.js:1-1680 和 2175-2186）
// index.html 加载顺序不变，tm-modal-system/world-view/military-ui 等继续提供函数

// ━━ 验证 ━━
// 重启游戏（Ctrl+R），再玩相同流程 5 回合
// 确认无任何 UI 异常

TM.checklist.postMerge('delete-patches-doubled-code')

// ━━ 判断 ━━
// overall === 'ok' 且 diff 只有合理变化（turn 增加/chars 变化）→ 成功
// 若有 errors 新增（特别是 'openGenericModal is not defined' 等）→
//   说明双保险仍需要，执行 git restore tm-patches.js
```

**预期 tm-patches.js 减重到 ~1,697 行（原 2,186 → 删 489）**。

---

### Scenario 2 · 合并 Corruption p2/p4 LAYERED 链

**背景**：CorruptionEngine.tick 被 p2 → p4 连续覆盖 2 次。合并终版到 engine。

**风险**：★★★☆☆（中）
**预估工时**：30-40h

**先决条件**：
- Scenario 1 已完成（确认双保险拆分模式可行）
- Corruption 已有 smoke test（R14 + R24 共 14 个用例）
- 熟悉腐败系统的业务语义

**详细步骤**：

```javascript
// ━━ 准备 ━━
// 1. 玩 5 回合，确保 corruption 数据已初始化
// 2. 阈值防御
TM.perf.setThreshold('corruption.tick', 800)  // 合并后不超过 800ms

// ━━ 锁基准 ━━
TM.checklist.preMerge('corruption-p2-p4-merge')
// 此步自动：
//   state.snapshot('pre-corruption-p2-p4-merge')
//   perf.lockBaseline()  ← 关键：锁 corruption.tick 当前 p95
//   invariants.check()
//   errors baseline

// ━━ 合并（按 PATCH_CLASSIFICATION §Corruption 段指引） ━━
// Step A: 把 p4.tick 的完整代码复制到 engine.tick
//         （p4 是终版，已经吸收了 p2 的所有逻辑）
// Step B: p4 的 APPEND 方法（getGameMode/openJuanna 等 9 个）
//         inline 到 engine 的 global.CorruptionEngine = {...} 段
// Step C: p2 的 APPEND 方法（EXPOSURE_CASES/generateExposureCase 等 6 个）
//         也 inline 到 engine
// Step D: 删除 tm-corruption-p2.js 和 tm-corruption-p4.js
// Step E: index.html 移除对这两个文件的 <script src>

// ━━ 验证 ━━
// Ctrl+R 重启，再玩完全相同的操作 5 回合

TM.checklist.postMerge('corruption-p2-p4-merge')
// 自动 diff + perf compare + invariants + errors

// ━━ 检查项 ━━
// 1. overall === 'ok'？
// 2. state diff 里 _perf.corruption.tick 的 p95 不应显著增长
// 3. errors 里不应有 "CorruptionEngine.xxx is not a function"
// 4. 继续玩 5 回合，观察 corruption 数值变化是否正常

// ━━ Rollback（若有问题） ━━
// git restore tm-corruption-p2.js tm-corruption-p4.js tm-corruption-engine.js index.html
// 下载合并报告供后续分析
TM.checklist.downloadReport()
```

---

### Scenario 3 · 合并 Guoku p2/p4/p5/p6 最深 LAYERED

**风险**：★★★★☆（高）
**预估工时**：60-80h

**这是最复杂的合并**。5 层叠加链：
```
engine.tick v1 → p2.tick v2 → p4.tick v3 → p5.tick v4 → p6.tick v5 (终版)
```

**流程与 Scenario 2 相同**，但：
1. **必须**先执行 Scenario 2（Corruption）积累经验
2. preMerge 前跑 20+ 回合（财政复杂，短期数据不稳定）
3. `TM.perf.setThreshold('guoku.tick', 1500)`（给高阈值）
4. **每合并一层验证一次**（不要一次吞 4 层）：
   - Round 1: 先把 p6 合并到 engine（engine 会变成 p6 的逻辑）
   - Round 2: 删 p5（p5 的 tick 已被 p6 覆盖，安全）
   - Round 3: 类似处理 p4, p2
5. 每 Round 之间完整验证（preMerge/postMerge）

---

### Scenario 4 · 2 个真 LAYERED phase 文件归位

**适用**：`tm-phase-c-patches.js`（覆盖 EdictParser.processImperialAssent/tick）
`tm-phase-f1-fixes.js`（覆盖 AuthorityEngines.tick）

**风险**：★★★☆☆（中）
**预估工时**：15-25h/个

**步骤与 Scenario 2 类似**，但注意：
- phase-c 涉及 edict-parser，改前先了解诏令流程（ARCHITECTURE.md §6 Phase A）
- phase-f1 同时改 PhaseD.COUNTER_STRATEGIES.rotate_officials —— 一个 PR 会改两个文件

---

### Scenario 5 · 14 个 SELF phase 文件改名

**风险**：★☆☆☆☆（极低）
**预估工时**：3-4h 总共

**根据 PATCH_CLASSIFICATION.md 14 个 SELF 文件改名表**：
```
tm-phase-a-patches.js → tm-audit.js
tm-phase-b-fills.js → tm-region-enrich.js
tm-phase-d-patches.js → tm-prophecy.js
...（共 14 个）
```

**每个文件操作**：
```javascript
// 1. 跟进度看 PATCH_CLASSIFICATION.md 确认目标名
// 2. preMerge（可选，SELF 改名风险低，但养成习惯）
TM.checklist.preMerge('rename-phase-a-to-audit')

// 3. Electron 里操作：
//    - 复制 tm-phase-a-patches.js 内容 → 新文件 tm-audit.js
//    - 删除 tm-phase-a-patches.js
//    - 更新 index.html 的 <script src="tm-phase-a-patches.js"> → "tm-audit.js"

// 4. 验证：Ctrl+R 重启
TM.checklist.postMerge('rename-phase-a-to-audit')

// 5. 重复下一个
```

---

## 🚨 Rollback 流程

任何时候发现问题：

```javascript
// 1. 立即保留合并报告供分析
TM.checklist.downloadReport()

// 2. 保留错误日志
TM.errors.clear()  // 清空前先下载
TM.errors.openPanel()
// → 点"下载 JSON" 保留

// 3. 用 git 回退
// 在 bash/cmd 里：
//   git diff                 看改了什么
//   git status               看哪些文件变了
//   git restore <file>       回退单个文件
//   git restore .            回退全部（慎用！）

// 4. 重启游戏 Ctrl+R
// 5. 重新跑 TM.test.run() 确认基础设施未损
```

---

## ⚠️ 不要做的事

### ❌ 不要跳过 preMerge 直接改代码
原因：合并后没有 state 快照，postMerge 无法 diff。你不知道改了什么。

### ❌ 不要一次合并多个系统
原因：若出问题无法定位是 Corruption 还是 Guoku 导致。一次只动一个。

### ❌ 不要 `git commit -a` 含多个系统的改动
原因：rollback 时需要一整个 commit 回退，影响其他工作。

### ❌ 不要在 postMerge 前 clear TM.errors
原因：checklist 会对比 pre/post 的 errors delta，清空就没了。

### ❌ 不要改基础设施文件（tm-data-access/tm-perf/tm-errors 等）
原因：这些是合并时的"尺子"，改尺子度量就失真。

---

## 📊 合并质量门禁（必须满足才算成功）

合并后 `TM.checklist.postMerge()` 返回必须满足：

| 检查项 | 标准 |
|------|------|
| `overall` | === 'ok' |
| `invariants.postCheck.ok` | === true |
| `perf.compare.regressions.length` | === 0（或已知的 < 20%） |
| `errors.postCheck` 新增 error | === 0 |
| `state.diff` | 只含预期内变化（turn/chars/guoku 数值） |
| 手工玩 5 回合 | 无 UI 异常·无数据异常 |

任一项不满足 → 不算成功 → rollback 或进一步排查。

---

## 📮 发现问题怎么办

1. **基础设施自身问题**（TM.test 有失败）
   - 先修 tm-test-harness.js 或对应基础设施
   - 不要继续做合并

2. **合并后 errors 新增**（TM.errors.byModule 有新模块）
   - 看错误栈，定位新写的代码
   - Rollback 单个改动，二分定位

3. **合并后 perf 回归**（TM.perf.printCompare 有 regressions）
   - 对比 p95 看哪个 tick 变慢
   - 可能某个 p2/p4 的循环被重复执行
   - 仔细读合并的 tick 逻辑

4. **state diff 有意外字段变化**
   - 对比 TM.diff 报告里 path 异常的字段
   - 可能合并时覆盖了不该改的数据

5. **手工玩时 UI 异常**
   - 看控制台 console.error
   - 按 Ctrl+Shift+E 打开 errors 面板
   - 常见：某个 window.* 函数被覆盖导致 undefined

---

## 🎓 学习资源

- [ARCHITECTURE.md](ARCHITECTURE.md) — 架构完整版
- [MODULE_REGISTRY.md](MODULE_REGISTRY.md) — 92 文件索引
- [PATCH_CLASSIFICATION.md](PATCH_CLASSIFICATION.md) — 每个补丁的类型/合并策略
- [DEBUG_CHEATSHEET.md](DEBUG_CHEATSHEET.md) — 控制台速查
- [INDEX.md](INDEX.md) — 文档总索引

---

## 🚦 推荐执行顺序

```
Week 1: Scenario 1（删双保险） + Scenario 5 前 3-5 个 SELF 改名
Week 2: Scenario 5 其余 SELF 改名
Week 3-4: Scenario 2（Corruption LAYERED）
Week 5-6: Scenario 4 的 phase-c 和 phase-f1
Week 7-10: Scenario 3（Guoku 5 层 LAYERED）——最后做，最高风险
```

**每周结束**：
- 跑 `TM.test.run()` 确认测试依然全绿
- `TM.version.report()` 确认版本号一致
- 把本周 checklist report 下载保留

---

## 💾 发现新问题时更新此 PLAYBOOK

本文档是活文档。如果你发现：
- 新的失败模式没覆盖 → 补到「发现问题怎么办」节
- 新的检查项 → 补到「合并质量门禁」节
- 新的 scenario → 补到 Playbook 段

让下一个进入测试环境的维护者少踩坑。
