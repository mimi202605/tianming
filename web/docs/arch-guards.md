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
- `--subtrees` 看权属矩阵：争抢最凶 = gm:qijuHistory(25写手)、gm:_chronicle(23)、gm:vars(21)、p:conf(17)、gm:guoku(13)——还账优先队列即此表。

**还账进度**：
- ✅ p:conf（2026-07-04·性质不同：收「写必随存」而非消灭写手）：
  17 写手 133 处逐点审计——设置面板/旗标模块的写本是其职，红线是「写后不 saveP =重启蒸发」（「设置不持久」bug 族）；
  恢复/迁移路径(save-lifecycle/launch/utils loadP)则**必须不 save**（否则重演 register 竞态覆盖）。
  修真病灶三处：①tm-ai-infra 全文件零 saveP——上下文/输出上限/证据分五类探测结果(烧真金 API 换来的)重启即蒸发每会话重烧，
  五个探测收笔点补 `_persistProbeConf()`；②③FactionNpcSettings.setEnabled/setCosmeticEnrich 与 InTurnDriver.setSpeed 补写必随存。
  其余无存点定性：恢复回填/启动暂存(随 startGame 流持久化)/临时换栈(设计如此)/字符串误报。
- ✅ gm:guoku（2026-07-04·写手 13→5·外来真金流 34 处全迁 FiscalEngine）：
  国库出入的真写口 = `FiscalEngine.spendFromGuoku / addToGuoku`（对账 ledger.stock↔balance + sinks/sources 记账 + 亏空落 `_欠`）。
  直改 `GM.guoku.balance/money` 就是「财政两本账」病灶——ledger 不知情，cascade 对账时账目漂移。
  扣账语义：不打负余额·落 0 + 记 deficit（破产链读 `balance<0 || ledgers.money.deficit>0`，亏空分支健在）。
  剩 5 写手皆非金流：game-loop(展示字段+对账镜像7)·endturn-followup(营葬银暂存2)·armory(挂载init 5)·
  corruption(actualTaxRate模型字段1)·guoku-engine(owner本体78·两引擎合账属owner级设计题另议)。
  沙箱纪律同 minxin：断言国库变动的 smoke 须同载 tm-fiscal-engine.js（已补4个）。
- ✅ gm:minxin（2026-07-04·写手 11→4·直写 45→6 行）：八文件 39 处 trueIndex 直写全部迁 `TM.MinxinLedger.recordAndApply`。
  这批不是账目洁癖——trueIndex 只是聚合缓存，`aggregateTrue()` 每次按叶子人口加权重算即冲掉直写，
  **带地图剧本里这些效果一直在静默蒸发**；走闸后 delta 落叶子+按源封顶(P-ZV7)才真正落地。
  kind 映射：加派/减税/税负感→taxation·赈济→disasterRelief·粮价→priceStability·狱案→judicialFairness·
  科举/恩科→socialMobility·内帑德政→imperialVirtue·其余系统专属 kind 走 _default(±20)。
  沙箱纪律：engine smoke 的 vm 沙箱须同载 tm-minxin-ledger.js（运行时同形态），否则效果静默跳过。
  剩 6 行另案：endturn-apply 的 mx.revolts 起义链(3)·game-loop 存档迁移 perceivedIndex(1)·office-panel/corruption 的 byClass 阶层矩阵(2)。

### ② 依赖显式化 `lint-dep-graph.js`（不上构建·v2）
把隐式依赖量成图：每文件的 provides/requires → `dev-tools/arch-guard/deps-manifest.json`。

- **拆分/改名前必查**：`node scripts/lint-dep-graph.js --who TM.ClassEngine` 看各入口引用面。
- 守卫：各入口**新增**悬空引用（引用了但该入口全集无人定义的 `TM.X`）即 FAIL——typo 或忘挂 `<script>`。
- **v2 三入口分集**：index.html(359脚本/165命名空间) · editor.html(36/38) · map-editor.html(77/2) 各自建集各自判；
  跨入口引用（如编辑器探测游戏侧 TM.ClassEngine）单独标注 crossEntry，多为带守卫的合法探测。
- **v2 TM 别名识别**：`var TMNS = root.TM;` 后 `TMNS.Foo=...` 算定义 TM.Foo。别名 RHS 必须是 TM 本体且随即终结——
  `window.TM && window.TM.X` 这类子树探测严禁误认（首版踩坑：悬空 9→67 全是这噪声）；别名只认定义不认引用。
- 存量欠账：index 7 / editor 8 / map-editor 2，全数经逐个裁定为「带兜底分支的防御探测」或「已注释的遗留 API(R143 删的 TM.register 族)」。
  已修真 bug：`TM.AISchema` 死引用(5af11599)、`TM.utils` 谎言自检(c8ef7afa)。
- 局限（诚实声明）：逐行正则非 AST；TM[动态key] 定义看不见（dynamicDefiners 兜底）；顶层加载顺序违例判不了，属 v3。

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

**队列余账·设计已勘（2026-07-04·实施待下刀）**：
- gm:qijuHistory（25写手69行）：形状惊人统一 `{turn, date:getTSText(GM.turn), content:'【标签】…'}` unshift——纯机械收口。
  设计：立 `TM.Qiju.record(content, opts)` 薄写口=ensure数组+unshift+getTSText兜底+**cap归一**。
  现状 cap 三处散装互搏（phase8-drafts 240 / in-turn-driver 200 / news-bridge 200·其余22写手裸写）；
  另有 hongyan-office:2668 用 push 破坏 newest-first 序=顺手修。25文件替换量大·单独一刀。
- gm:_chronicle（23写手·科举族为主）：同属史官流水·与 qiju 同范式收口·可并刀或紧随。
- gm:vars（21写手）：通用变量袋·**不宜整树收口**——按 key 细分权属（如 GM.vars['威望'] 谁是写主）属 v2 守卫增强。

## 基线文件（要进 git）

`scripts/arch-baselines/{gm-writes,dep-dangling,file-size,smoke-skip}.json` —— 棘轮的账本，删了守卫就瞎。
`dev-tools/arch-guard/` 下是生成物（依赖清单/smoke报告），不进安装包，可随时重生成。
