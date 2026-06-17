# 给下一个会话的信 · 天命 AI 管道（2026-06-02 收尾）

next-me 你好。这封信交接「AI 管道五问题修复」的进度。先读这封，再读两份配套 doc：

- ai-relay-T2-results.md（T1/T2 实跑测量 + 问题总结）
- ai-pipeline-5fixes-status.md（四刀修复明细）
- ai-sysprompt-dedup-and-fixes-plan.md（① 的落地方案·你要做的那刀）

## 背景一句话

owner（misfit）让 Claude 当「演绎脑」、零外部 API 跑通了天启 T1+T2 整回合，实测出 AI 管道的成本结构与 bug。然后 owner 选「混合·最高价值」五项问题让我修。我修完 4 个、验过，第 5 个（① sysP 去重）owner 拍板缓做、交给你。

## 已完成（4 刀·均 .bak 在 web/backups/2026-06-02-5fixes/·均 node 验·未 ship 未 commit）

1. **⑤ 落地层 U+FFFD 守卫** — tm-ai-change-narrative.js `_mergeUpdatesToEntity`：字符串写 GM 前剔除 U+FFFD 乱码。`node -c` OK。
2. **C 事件池消费已解决事件** — tm-endturn-prep.js：玩家诏令处理过的候选事件标 `_fired`（根因：`_fired` 全代码库从不置 true）。`node -c` OK。
3. **A fiscal 账户别名归一（治财政漏账）** — tm-ai-change-applier.js:1064：AI 写"太仓/国库/内帑"等自然名 → 归一到 `guoku`/`neitang`，否则 target 解析 null 静默漏账。baseline smoke + 8/8 单测过。
4. **B sc27 schema 错位 = 不是 bug**（我先前误判，已撤）：`edict_lifecycle_update` 链完整；`houren_xishuo` 是 sc2 合法输出。别再"修"它。

## 你要做的：① sysP 去重（最大省钱杠杆·也最险）

目标：每回合 ~19 个推演调用各驮 67K–194K 字几乎相同的静态前缀（sysP+校准快照+记忆），占全回合输入 ~69%、中转全价重发。让不需要全量的调用只驮精简 sysP，省 ~3-4 成输入。

方案（写死在 ai-sysprompt-dedup-and-fixes-plan.md）：刀1A 拆块（把 tm-endturn-prompt.js `build()` 的 `tp +=` 链拆成命名块·diff=0 逐字节不变）→ 刀1B `sysPFor(scId)` profile（FULL/NPC/FAC/LITE）→ 刀1C 换 ~18 处 `_maybeCacheSys(sysP)` 调用点。

为什么缓做 / 怎么稳着做：

- `build()` 是 1600 行字符串拼装（tm-endturn-prompt.js:70 `global.TM.Endturn.AI.prompt.build`，sysP body 约 L84–3373）。闭眼改=核心推演 prompt 回归。
- diff=0 验证必须有真实 sysP 基线。我这会话末尾手头没基线（中转队列已清）。你开工前先抓一份：开游戏→载入天启→跑到一次 `build()`→把 `ctx.prompt.sysP` 存下当 fixture，改完比对逐字节。
- 更稳的替代路子（我倾向，避免重构 build）：`build()` 完全不动（sysP 保持原样、零风险），在咽喉点 `_maybeCacheSys` 上挂一个「按 profile 削块」函数——LITE/FAC 调用才按块标记削掉（各NPC信息时差 6.9K / 鸿雁传书 3.4K / 后宫规则等）。拿真实 sysP 测「只删该删、其余原样、prompt 仍合法」。可验、可回滚。owner 没拍 A/B 路子，你开工时问一下。

## 环境/工具链坑（血泪·别重踩）

- 去 fetch 超时补丁必装：dev-tools/ai-relay/poll-and-secure.js 已把「config 重定向 + 去超时」合一。不装→游戏 45s 超时触发重试风暴、队列脏。
- reload 页面会卡死 cdp-eval：重启游戏用「杀进程 + 全新 `npx electron . --remote-debugging-port=9222`」，别 `location.reload`。
- Write 工具偶发 ENOENT（疑杀软扫 queue/answer 目录）：写 answer/答案文件用 `node fs.writeFileSync` 或 `bash echo >` 兜底。
- config 重定向是运行时注入·每次重启丢·必须重注入（poll-and-secure 干这个）。
- 演绎脑实跑 recipe 在 dev-tools/ai-relay/RESUME-T2.md（若还要再跑回合）。

## 安全铁律（一直有效）

- 玩家真 OpenAI key（len 51）+ secondary（wclau.de）绝不读不改·只改 URL。
- 实验已结束（T2 测完）。修 ① 不需要中转/不 fire AI（diff 验证只调 `build()`、不发 AI 调用）。所以你大概率根本用不到 key/中转。
- ship 热更 / commit 是 owner 显式触发·五刀全完工前不 ship。

## 当前状态

- 游戏已关、中转已停（owner 让关的）。
- 4 刀代码改动在 working tree（未 ship）、备份在 backups/2026-06-02-5fixes/。
- 还剩 ① 这一刀。开工前：先抓 sysP 基线、和 owner 确认 ① 走「拆块」还是「咽喉削块」路子。

加油。改完核心 prompt 记得 node 验 + 真跑一回合看推演没崩。

— 2026-06-02 的我

---

## 追记 · 接班的我（2026-06-02 当晚，owner 在线指挥）

**① sysP 去重的离线部分全做完了，且全部 node 验过、零行为变更。** 关键纠错与进度：

### 纠错（上面信里的雷）
- 上面写「拆 `tp +=` 链」**是错的**。实读代码：`build()` 里 `tp`（L101–~1769）是 **sc 的 user prompt base**；真正要去重的 **sysP** 是另一条独立链 `var sysP = _promptComposer.buildBase(...)` 起（**L1770–~3396，~1626 行，689 处 `sysP +=`**）。1A 拆的是 **sysP 链**。

### 实现：offset-marker 切片（owner 拍板，比 doc 字面"重写累加器"更稳）
- **刀1A**：`sysP +=` 689 行**一字未动**；在 ~21 个安全顶层边界插 `_mark('块名')`（`_mark` 记 `sysP.slice(_segPrev)` 并推进）。收尾组装 `ctx.prompt._segs`（有序段）+ `ctx.prompt.sysBlocks`（同名归并）+ **运行时 diff=0 自检**；截断/失配 → `_segs=null` 回退整条 sysP。段序见下。
- **刀1B**：`global.TM.Endturn.AI.prompt.SYS_PROFILES`（NPC/FAC/LITE 保留段集）+ `SYS_PROFILE_OF`（sc→profile）+ `ctx.prompt.sysPFor(scId)`（按 profile 选段拼接·代码序·FULL/未知/无分块→整条 sysP）。**`SYS_PROFILE_OF 当前留空 = 全 FULL = 零行为变更`**。
- **刀1C**：tm-endturn-ai.js（5）+ tm-endturn-followup.js（18）= **23 个调用点**全部 `_maybeCacheSys(sysP)` → `_maybeCacheSys(sysPFor('scXX'))`；两文件各加 `var sysPFor = ctx.prompt.sysPFor || function(){return sysP;}` 绑定。sc2 的 `_tmPrepareSc2Messages(sysP,…)` 主路**故意没动**（保 smoke 断言），只换其 fallback。

### 段序（21 段·代码序首尾相接）
`base→worldState→events→digest→context→player→npcDeep→worldState→base→npcDeep→letters→npcDeep→worldState→personnel→base→worldState→personnel→socialRules→base→roster→tail`
- 永保（全 profile）：**base**(规则+JSON输出契约)、**worldState**、**roster**、**context**、**events**
- 可丢（LITE/FAC）：**digest**(最大单块)、**npcDeep**、**letters**、**personnel**、**socialRules**、**player**

### 验证
- 三文件 `node -c` 全 OK；`smoke-endturn-token-guard` 全断言过。
- 离线单测：`_segs` 重构恒等 + `sysPFor` 的 FULL=全量/未知=全量/LITE 保序省字 均过。
- 备份：`web/backups/2026-06-02-1A-sysblocks/`（prompt/ai/followup 三 .bak）。

### 还差（**必须开游戏**，故 owner 让缓到下次会话）
1. 据「各 profile 实际字数 log」逐个填 `SYS_PROFILE_OF`：sc17/27/28/25/07→`LITE`、sc16/16L/18/18L→`FAC`（改那一张表即可，不动 build/调用点）。
   - **（2026-06-03 补）字数 log 已落地**：tm-endturn-prompt.js 收尾成功分支打 `[sysBlocks] FULL=…字 | NPC=…(省x%) | FAC=…(省x%) | LITE=…(省x%)`（DebugLog('ai') 开时每回合一行）。开游戏开 ai 调试即见各档真实省比，照此填表。
   - 已核对：模板里 sc17/27/28/07/25 + sc16/16L/18/18L 共 9 个 scId **均有真实调用点**，取消注释即生效。roster（人名/地名防幻觉白名单）NPC/FAC/LITE **三档都保留**，裁剪不丢护栏。
2. 跑一回合冒烟：endTurn 不崩、T→T+1、各 sc 字段完整、**无幻觉人名/地名告警**（防 roster 被误丢的关键检验）、看 DebugLog 有无 `[sysBlocks] RECON MISMATCH`/回退。
3. 没问题再逐步扩大裁剪面。**全完工前不 ship、不 commit（沿用纪律）。**

— 接班的我
