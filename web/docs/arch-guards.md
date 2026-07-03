# 架构守卫四刀（2026-07-04）

> 背景：运行时 355 个 JS 全靠 359 个 `<script>` 标签按序加载，GM 全局单例被 163 个文件直写 3314 处，
> 串台/双账/漏还原一族 bug 皆源于此。存量一口吃不掉 → 全部做成**棘轮（ratchet）**：
> 基线记录现状，**只许降、不许升**。还清一笔就 `--update` 收紧一格。

## 一条命令

```
node scripts/lint-arch-all.js     # 秒级全绿门禁：写口 + 依赖 + 巨石 + 断链（每刀收尾跑）
```

## 四刀分述

### ① 写口收窄 `lint-gm-writes.js`
纪律：**读随便，写必须走账**。直写 `GM.x=` / `GM.arr.push()` / `delete GM.x` / `Object.assign(GM…)` 逐行计数；
P 是剧本库，gameplay **只读 GM 不伸 P**（剧本隔离既有不变量），P 直写同样计数。

- 超基线 FAIL，处置三选一：改走子系统 mutator/ledger 入口；确属写口本体 → 登记 `arch-baselines/gm-writes.json` 的 `config.owners`；确经裁定的合法直写 → 行内加 `// arch-ok`。
- `--top 20` 看欠账大户。当前大户：`tm-save-lifecycle.js`(442·存读档本体,已登记owner)、`tm-endturn-apply.js`(269)、`tm-patches.js`(260,P直写165是重灾)。

**子树写主固化（2026-07-04 二期）**：直写按 `GM.<顶层子树>` 归属建权属矩阵（742 棵·单写主 484 棵）。
基线里每棵子树的写手名单即权属——两条新红线：
- **闯入**：非既有写手写别人的子树 → FAIL（例：又有人绕过 MinxinLedger 直写 gm:minxin）
- **新开**：新建 GM/P 顶层子树须显式裁定写主（`--update` 落权属），防止匿名新账本
- `--subtrees` 看权属矩阵：争抢最凶 = gm:qijuHistory(25写手)、gm:_chronicle(23)、gm:vars(21)、p:conf(17)、gm:guoku(13)、gm:minxin(11)——还账优先队列即此表。

### ② 依赖显式化 `lint-dep-graph.js`（不上构建）
把 359 个标签的隐式依赖量成图：每文件的 provides/requires → `dev-tools/arch-guard/deps-manifest.json`。

- **拆分/改名前必查**：`node scripts/lint-dep-graph.js --who TM.ClassEngine` 看引用面。
- 守卫：**新增**悬空引用（引用了但全集无人定义的 `TM.X`）即 FAIL——typo 或忘挂 `<script>`。
- 存量欠账 10 个入基线，已知真问题：`TM.AISchema`（`tm-endturn-ai.js` 死引用，真实导出是 `window.TM_AI_SCHEMA`）；`TM.AuthoringAgent` 等属编辑器侧文件（另一 HTML 入口加载）。
- 局限（诚实声明）：逐行正则非 AST；顶层立即执行的加载顺序违例判不了，属 v2。

### ③ smoke 统一 runner `run-smokes.js`
676 个 smoke 的发现式入口：并发、超时熔断、失败聚类、报告落 `dev-tools/arch-guard/smoke-report.json`。

```
node scripts/run-smokes.js --grep tinyi            # 按主题跑（可多个 --grep 取并集）
node scripts/run-smokes.js --list                  # 干跑看选中
node scripts/run-smokes.js --jobs 8 --timeout 90   # 全量扫荡（大改后/周期性）
```

- 与 `verify-all.js` 分工：verify-all = 手工精选快速门禁（fail-fast）；run-smokes = 全量/按主题扫荡。
- 尊重 `scripts/_<TOKEN>_NORUN.flag`（并行会话施工标记）与 `arch-baselines/smoke-skip.json`；`--all` 无视。
- `suspect` = 退出码 0 但输出带 FAIL → 该脚本忘了 `process.exit(1)`，见报告补上。

### ④ 巨石棘轮 `lint-file-size.js`
纪律：巨石**顺手拆、不立项拆**（动到它时按 alias+内联范式往外搬），但不许继续堆。

- 超 3000 行入基线（当前 20 座，最大 `tm-tinyi-v3.js` 7101 行）；涨超 +100 行预算 FAIL，预算内只提醒。
- 阈值/预算在 `arch-baselines/file-size.json` 的 `config` 里调。

## 基线文件（要进 git）

`scripts/arch-baselines/{gm-writes,dep-dangling,file-size,smoke-skip}.json` —— 棘轮的账本，删了守卫就瞎。
`dev-tools/arch-guard/` 下是生成物（依赖清单/smoke报告），不进安装包，可随时重生成。
