# 功名变化机制优化 · 2026-06（激活既有设计·不改锁定数值）

> owner：优化角色的功名变化机制。功名 = 资格(出身)⊕**政绩(virtueMerit)**，本轮治"政绩 merit 每回合的涨跌动态"。
> owner 圈定 4 维度全做：失败减全表激活 + 政绩涨激活 + 状态/方向感知 + 近账透明。**均不改 owner 2026-06-04 锁定的 EARN/FAILURE_DELTA 数值表，只接线让既有设计生效 + 加反馈。**

## 一、诊断（实证·非推测）

功名变化的输入严重贫乏，既有设计大量未接线：

| 病 | 实证 |
|---|---|
| **`_recentAchievements`（近期功绩）是纯死字段** | 挣取公式 `tickVirtueMerit` 1164 行 `base += _recentAchievements*0.5` 留了输入口，但全库**无人写入** → 恒 0 |
| **`FAILURE_DELTA` 9 种失败只 1 种生效** | owner 设了军事溃败(-1000)/改革失败(-450)/贪腐案发(-750)/贻误军机/重大冤案/救灾不力等 9 档，但 `failureDelta()` 只在地方"办砸"(task_botched)一处调用 → **砸大事不减功名** |
| **被动单调上涨** | merit ≈ 在职底 0.3 + 八维能臣度被动积累（只要挂 officialTitle 就涨），不反映在位尽职/立功/砸事 |

## 二、四刀（激活 + 反馈·tm-char-economy-engine 为主）

### 刀1 · tick 状态/方向感知 + 近期功绩激活
`tickVirtueMerit`：
- **状态闸**：在押/流放/逃亡/守丧/革职待罪（`_imprisoned/_exiled/_fled/_mourning`）→ **功名冻结**（不在位尽职则不攒资历），近期功绩仍消退。
- **怠政打折**：重压(stress≥75)/重病(health≤25) → 挣取 ×0.4；致仕(`_retired`) → ×0.5（退而不攒）。
- **激活 `_recentAchievements`**：进 base（原死字段），tick 后衰减 ×0.6（避免永久驱动）。
- 均为方向/状态调制，**EARN 数值不动**。

### 刀2 · 近账引擎
- `adjustVirtueMerit` 记一笔功名近账 → `GM._meritLedger`（滚动 200）+ `ch._meritLog`（近 10）。
- `addAchievement(ch, amount, reason)`：政绩缓冲累加 `_recentAchievements`（上限 40 防滚雪球）+ 记近账。
- tick 被动积累**不记**（避免淹没），只记显著事件。

### 刀3 · 政绩涨 + 失败减全表接入
- **NPC互动正政绩**（荐贤/调和）→ 原有 `adjustVirtueMerit` 旁加 `addAchievement`（功绩缓冲·持续涨数回合）。
- **贪腐案发**（地方行政 `oa.named_corrupt`）→ `failureDelta('corruption_exposed')` 被查者减（功名=政绩·唯贪腐"案发"与廉洁相关）。
- **AI `merit_changes` op**（validator + schema + apply 三处）：让 AI 按情节报谁立功/失职（AI 知道战败主帅/改革推动者/救灾督抚）→ `addAchievement`（立功）/`failureDelta(failureType)`（失职·**全表可用**）。比硬从 region 定位主帅可靠，覆盖军事/改革/救灾等所有失败档。玩家(君上)功名不受 AI 改。

### 刀4 · 近账透明显示
- 图志列传 overview 功名块加「近 期 功 名 升 降」：逐条 turn/delta/reason（绿涨红跌·功绩棕）。
- 邸报/起居注侧：apply 各 merit 变化已 `addEB('功名', …)`。

## 三、验证

- `smoke-merit-dynamics` **26**（源码契约 + vm 行为：adjustVirtueMerit 减功名+记 _meritLog/_meritLedger·addAchievement 喂缓冲·下界0·贪腐案发·merit_changes op 全表·君上保护·图志近账显示）。
- **实拍**（capture-merit-log）：崔呈秀注入 4 笔 → 图志功名块渲染「第4回 -150 地方失政 / 第3回 -750 贪腐案发 / 第2回 功绩 查处余孽 / 第1回 +120 督理京营」绿红配色（mr-01）。
- **回归零破坏**：char-economy/behavior-weights/confiscate/endturn-apply-fields + rank/gongming/office/map 全绿。
- `.bak-meritdyn-20260613`（economy/apply/tuzhi/validator/schema），**未 ship**。

## 四、边界

- war/disaster/revolt 事件**不带责任人**，失败减由 AI `merit_changes` op 演绎驱动（AI 报 failureType + 责任人），而非引擎硬从 region 定位（避免误伤）。
- 不改 owner 锁定的 EARN/FAILURE_DELTA 数值，只激活其接线 + 加状态/方向调制 + 近账反馈。
