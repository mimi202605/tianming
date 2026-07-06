# 巨石拆分范式法典（2026-07-06 · 拆分战役 #10-#27 制度化沉淀）

> 拆一座巨石之前读完本文。守卫细则见 [arch-guards.md](arch-guards.md)；分诊/阈值权威在 file-size 基线。
> 本文是范式与军规的单一真相源——委任实施 agent 时引用本文，不再逐份手抄。

## 分诊三类（先实测再定性，旧标签不可信）

先摸结构再选刀。**注意缩进陷阱**：经典 script 顶层函数是列 0 缩进，IIFE 内一般 2 空格——grep 两种都查
（前科：ai-infra 名义「IIFE 型」实测是经典顶层函数脚本；office/game-loop/hongyan 曾被 2 空格 grep 误判「不足十个顶层函数」）。

- **① 顶层函数型** → 保序切割（head/tail/mid 切），逐字节重组===原文，无 shim。
  先例：mechanics / feudal / game-loop / hongyan-office / office-runtime / **ai-infra**（中段切）。
  ★命门：origin 末尾若有装载期执行的导出块（`Object.assign(TM,{...})` 等），核清它引用的每个符号
  在执行时已定义——这决定迁出段能否放 origin 之后装载。
- **② IIFE 型** → bucket 三变体（见下）。
- **③ 单函数型**（一根函数占 85%+）→ 逐字节搬运数学无解（JS 函数体不可跨文件）。
  出路=stage 函数化（paradigm 重构·须金样比对+专项设计），或诚实判不拆。
  在册：endturn-apply / endturn-ai(runMain 88.7%) / endturn-followup 残体(HOLD)。反例不拆：endturn-prompt（拼接反例）。

## ②IIFE 型三变体（按依赖方向与可变态选）

| 变体 | 装载序 | 适用 | 先例 |
|---|---|---|---|
| ②a alias/bucket | sibling **先** | 纯 helper 迁出（origin 装载期就要用到迁出物） | authoring-agent-provider · followup-helpers · **bridge-styles**(装载期同步调 CSS 注入·必须②a) |
| ②b origin-first 双向 | sibling **后** | 中段/次域迁出（迁出物要读 origin kept 成员） | content-manager-community · rightrail-social · map-dossier(双段) · drafts-message-panels |
| ②c ui 共享单例 | 视情况 | **可变闭包对象**跨界（owner 已批范式） | authoring-agent-ui 三片(354 处突变同对象) |

- ②b 细节：origin 装载末尾 reverse-export kept 成员进 bucket → sibling 闭包捕获；sibling 回填函数 →
  origin 用 **function 声明式 forward shim**（hoisted·调用期解析）。shim **形参列表保真**（arity 与拆前一致，
  baseline smoke 有签名锁定契约）。
- ②c 细节：canonical init 在 origin：`var x = (__p.x = __p.x || {...})`；sibling `var x = __p.x` **同对象引用**。
  ★共享可变对象绝不许两侧各持副本（分裂状态 bug）——要么同引用，要么证明纯派生等价。
  纯常量/纯派生别名两侧各自声明可以（先例：rightrail-social 的死声明副本经核零用点）。
- bucket 命名一族一名（TM.__xxParts / bridge.__xxParts），勿复用他族。

## 军规（每刀硬性）

1. 先备份 `web/backups/YYYYMMDD/<name>.pre-split`，须与 HEAD 逐字节一致（backups/ gitignore 不入库）。
2. 业务体 0 改动：迁出代码逐字节一致（仅允许新头注释与结尾换行差）；origin diff 形状=删迁出段+bucket/alias/shim 脚手架+注释。禁顺手重构/改名/调空白。
3. CJK 守恒：禁中文翻英、乱码禁 ASCII 替换；拆前后 CJK 差须恰等于新增注释 CJK（三方计数入报告）。
4. 装载点：sibling 紧挨 origin 按范式序，附「勿动位置·第 N 拆」注释；**整族同一新 ?v= 戳**（守卫⑦）。
5. 全入口查：index.html / editor.html / preview/*.html / _yan_harness.html——grep 后逐一同步。
6. 契约登记 lint-split-contracts.js（+基线族戳、file-size 退名单、gm-writes 家族守恒——总量不变，无关漂移还原）。
7. smoke codemod：grep scripts/*.js 全部源码级消费者（read/readFileSync/vm/h.load/loadMany），**行级幂等**补装，拼接序=契约序（守卫⑧自动咬）。★文件级 skip 幂等会漏同文件第二处——行级判。
8. 一刀一事；辅助脚本用后即删；★别用 inline node -e 做比对（Windows bash 转义把 \b 变退格，前科在案）——写脚本文件跑。
9. 验证链全跑：node --check 每片 → 逐字节重组脚本 → （bucket 范式）VM 按真实序装载验 bucket 键/跨界互调/可变对象同一性(===) → 定向 smoke → lint-arch-all 全绿 → 全量 run-smokes 0 新增 FAIL。
10. agent 实施铁律：worktree 隔离；**先验基座**（worktree 曾检出发版扁平快照错 HEAD——`git log` 核对后不对就 `git reset --hard master`）；禁 commit/push/stash，改动全留树待终审。

## 终审与落账（主会话职责）

- **终审五项**：①备份===HEAD ②插入式重组 ③符号守恒 ④CJK 守恒（前四项跑
  `node scripts/audit-split-conservation.js <config.json>`，工具头注释有 config 格式；插入行逐行人工过目）
  ⑤基线按族守恒（gm-writes/file-size 走守卫）。外加 manifest 全文件 diff 形状过目。
- **三审流水线**：实施(worktree) → 独立复审（钉模型·SHA256 对拼+VM 实跑） → 终审 → 落账。
- **整合纪律**（撞车血泪版）：共享文件（index.html/契约/基线/多刀同改的 smoke）**现读现 diff 手工合 hunk，
  绝不整拷**——曾整拷夷平并行会话的 mount（靠会话转录取证逐字恢复）。选择性暂存用
  `git diff -U0` + `git apply --cached --unidiff-zero`（-U3 会把相邻他人改动合进同一 hunk）。
  staged 后 grep 核纯净再 commit。每条命令显式 cd/绝对路径（cwd 残留三次前科）。

## 类③ stage 解构（paradigm 重构·另行专项）

设计定案（2026-07-06）：ctx 管线上下文已成熟，解构=把「stage 产出→ctx 字段」发布点前移+切 stage(ctx) 函数。
等价性靠**金样比对**（发往 LLM 的完整 prompt 串/GM 突变快照/ctx 发布字段/返回结构，逐字节），
金样基准落 `scripts/arch-baselines/*-golden.json`。tp1 类拼接体整体提单函数，绝不二次分片。
顺序：apply(有金样网) → ai.runMain(先建 stub 网) → followup(HOLD)。设计全文在记忆档，实施须按 slice 逐刀金样验证。
