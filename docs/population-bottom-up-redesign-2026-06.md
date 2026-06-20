# 天命 · 人口「自下而上」重构 · 详设（2026-06-20）

> 来源：省份/地块面板字段活化审计（P0-3 户/丁死显）挖到的**总根因**。
> owner 拍板原则：「**地方增长汇到全国，不能将错就错**」——增长发生在地方，全国是汇总结果。
> 关联：[region-panel-fields-audit-2026-06.md](region-panel-fields-audit-2026-06.md)

---

## 0 · 一句话

人口自然增长从「**全国算一个统一率 → 按人口权重均匀摊回各区**」翻转为「**各叶按本地条件各自增长 → maintain 现成汇总成全国**」。根治户/丁/族群/田一整片「活值死显」死字段——面板读叶即见**活态 + 地方差异**。

---

## 1 · 诊断（现状 · 铁证）

### 1.1 两层错

**错 1 · 地方零差异（自上而下硬摊）** `tm-huji-engine.js:462-489`
全国算**统一** `birthRate/deathRate`（基于全国 `environmentLoad/disaster/war`）→ 全国 `net` → `:486 r.mouths += net × regWeight` 按人口权重**均匀摊**回各区。各区增长率完全一样——**本地 minxin / 承载 / 灾异 / 役负对本地人口零影响**。

**错 2 · 自然增长空转（被 maintain 冲掉）**
- `tick` 写 `P.national`(:473)、`P.byRegion`(:486)，但 **huji 自然增长 grep 零命中写叶 `populationDetail`**
- `maintain` 每回合从叶重建：`tm-huji-runtime-bridge.js:377 national = Σ叶` 覆盖、`:386 byRegion = Σ叶` 覆盖
- 叶 `populationDetail` 只被 `tm-endturn-apply.js:383`（AI 显式人口变更）更新
- 顺序 `tm-endturn-systems.js:79 tick → :98 maintain`——**tick 增长当场被 Σ叶 抹掉**

### 1.2 数据流真相

```
P.national (全国总账)    ← tick 每回合增长(:473)  ←┐  但被 maintain:377 用 Σ叶 覆盖
P.byRegion[rid] (区域)   ← tick 分摊(:486)        ←┤  且被 maintain:386 用 Σ叶 重建
叶 populationDetail       ← 仅 bridge:234 规范化写回自身旧值 + endturn-apply:383(AI变更)
                            huji 自然增长从不写叶  →  恒静态
                            net 效果：自然增长每回合丢，地方永远开局值
```

### 1.3 关键洞察（决定方案）

`maintain` 的「**叶 → 全国**」汇总管道（`:377/386` Σ叶）**方向本来就对**。错的**只是**「增长被放在全国 tick 层」。
→ **把增长从全国 tick 挪到叶级，整条链自洽**，maintain 不用动汇总方向。

---

## 2 · 正确架构（自下而上）

### 2.1 翻转点

| 函数 | 现状 | 重构后 |
|---|---|---|
| `_tickPopulationDynamics` (huji:451, tick:892 调) | 全国算 net → 按权重摊回各区 | **遍历叶 → 各叶按本地条件算生死 → 写叶 `populationDetail`** |
| `_tickMigration` (huji:768, tick:897 调) | 改 `P.byRegion.mouths`（被覆盖） | 改写**叶** `populationDetail`（与增长同源·免被 maintain 冲） |
| `maintain` (bridge:1114) | 从 Σ叶 汇总 national/byRegion | **不动**——叶一活，`national = Σ叶` 自动成立 |
| 全国 tick | 增长源 | 退化为**汇总 + 全国级事件叠加**（大疫/全国战），不再是增长源 |

### 2.2 叶级增长公式（**粮食供需为硬核** · 全取叶已有活账）

> **owner 定调**：马尔萨斯不用抽象 `carryingCapacity`，落到**粮食供需账**——人口增减由「**本地粮食供给 vs 人口口粮消耗**」驱动，**供给含调入**（漕运/赈济，见 §2.4）。再叠生活水平/经济/赋役。

每叶 `d`，每回合 `mr`：

```
// ── 粮食供需（硬约束·接 renli 现成账 :319）──
grainSupply = grainOutput(renli本地粮产) + grainInflow(调入·见§2.4)   // owner:"调粮过来·问题在供给数量"
grainDemand = foodNeed(renli·人口口粮 ≈ mouths × 人均口粮)
foodBalance = grainSupply − grainDemand              // = grainInflow − foodDeficit(renli)
载力 K      = grainSupply / 人均口粮                  // 真实承载=粮食能养活的人口(替代抽象 carryingCapacity)
load        = mouths / max(1, K)
deficitRatio= foodBalance<0 ? -foodBalance/grainDemand : 0

// ── 生活水平(生育意愿/夭折)·接经济活账 ──
生活水平 lv = g( prosperity, wealth, 人均粮=grainSupply/mouths, 赋役=corveeRate+taxBurden )

// ── 增减 ──
饥荒死亡  = mouths × deficitRatio × 0.??              // 缺粮且调入不足→饿殍
逃亡fug  += mouths × deficitRatio × 0.??              // 缺粮逃荒(并入 renli 逃户)
localBirth = baseBirth ×(民心)×(生活水平 lv)×clamp(1-load,..)   // 粮足/安定→多生·近载→少生
localDeath = baseDeath ×(民心)×(灾异 recentDisasters)×(1+max(0,load-1)×0.8)
births = mouths × localBirth × mr/12 ; deaths = mouths × localDeath × mr/12
net    = births − deaths − 饥荒死亡
写叶：d.mouths += net ; d.households = mouths/mphh ; d.ding = mouths × dingRatio
```

- **几乎全接现成活账**：`grainOutput/foodNeed/foodDeficit`(renli :319 已算)、`prosperity/wealth`(经济·顺带激活卷一/三)、`corveeRate/taxBurden`(renli/fiscal)、`minxin`/`recentDisasters`(叶)。
- **唯一新增** = `grainInflow`（调入供给·§2.4）。`baseBirth/baseDeath/mphh/dingRatio` 全国基准（`P.dynamics`）。

### 2.3 与 AI 变更 / maintain 协调

```
systems:79  自然增长(写叶·早)  →  sc1 apply:383 AI人口变更(写叶·后)  →  :98 maintain(从Σ叶汇总national)
```
两者都写叶、不冲突，maintain 汇总最终态。守恒 `national = Σ叶` 由 maintain:377 现成保证。

### 2.4 调粮供给 `grainInflow`（owner 核心诉求 · 救荒杠杆）

**现状缺口**：renli `foodDeficit` 只算本地粮产 vs 本地需求，**无"调入"项**；赈灾诏令现状发银/复耕（`ai-change-applier:710/1068 disaster_relief`），不直接调粮入区减缺口。

**设计**：`grainSupply = 本地产 + 调入`，调入来源（优先接现成机制）：
- **漕运/转运**：中央 / 富省调粮 → 缺粮区（玩家 · AI 调度——"问题在于能调多少"）
- **赈济发粮**：`disaster_relief` 扩为可发粮（非仅发银）→ 直接减 `foodDeficit`
- **常平仓 `granary_stockpile`**：平籴备荒放粮（:1036 已有诏令骨架）

每笔调入累计 `d._grainInflowThisTurn`，并入 `grainSupply`。**这让中央调粮、赈灾、漕运成为地方人口存续的真实杠杆**——玩家自由调度 → 硬核人口回应（命门）。**供给数量决定能救活多少人**，正是 owner 点的题眼。

---

## 3 · 守恒与防呆

- **守恒**：`national = Σ叶`——只要增长写叶，maintain:377 自动汇总，无需额外对账。
- **有界**：`d.mouths` clamp 下限（防归零）、上限 `carryingCapacity × 系数`（防爆炸）。
- **全国级事件**（大疫/全国战）：在全国层算总量，但**按叶 load/minxin 分摊为落点**（仍叶级落地，非均匀摊）——大疫在拥挤区死得多。
- **下游防呆**（重构必守）：`tm-fiscal-engine`(读 `pd.mouths/ding` 算税基)、`tm-military`(recruits)、阶层引擎——它们读叶 `pd`，重构后拿到的是**活值**（更准，非破坏）。S3 专验。

---

## 4 · Slice 划分（先详设 · 后落地 · 开关守卫）

> 开关 `populationBottomUpEnabled` 默认**关**，并入 agent/实验总闸思路；新旧逻辑并存（守卫切换），`.bak` 留。

| Slice | 内容 | 验收 |
|---|---|---|
| **S1 叶级增长核心** | 改 `_tickPopulationDynamics`：遍历叶·本地 `birthRate/deathRate`（先只接 `minxin`）·写叶 `populationDetail`·废全国分摊（开关守卫） | node 守恒断言 `Σ叶 == national`；开关关=旧逻辑零回归 |
| **S2 粮食供需驱动** | 人口增减接 renli `grainOutput/foodNeed/foodDeficit`(:319 已算)：缺粮→饥荒死亡+逃亡·**载力 K=粮供/人均口粮**(替代抽象 carryingCapacity)·生活水平(`prosperity/wealth`)·灾异·赋役 | node：缺粮区人口减、粮足区增·地方差异断言 |
| **S3 调粮供给** | 补 `grainInflow`(漕运/赈济发粮/常平仓)→并入粮供减缺口·赈灾诏令扩为可发粮 | node：调粮入缺粮区→饥荒缓解·人口存续随调粮量变（owner"问题在供给数量"） |
| **S4 协调与防呆** | `_tickMigration` 改写叶；与 AI 变更/maintain 时序；下游 `fiscal/military` 读叶活值回归 | node：跑 N 回合，税基/兵源随人口活变；守恒不破 |
| **S5 验证** | headless 实测（`vm` 全链加载·跑 N 回合）：守恒 + 地方差异 + 调粮救荒 + 面板读叶活值；真机点府/省看户/丁逐回合变 | 实测报告 + owner 真机 |

---

## 5 · 风险与回滚

- **风险**：人口是**税基/兵源/赋税的下游源头**，改增长源牵动全链——S3 重点验下游拿到合理值。
- **回滚**：`populationBottomUpEnabled` 关 = 走旧「全国分摊」逻辑，新旧并存不删旧；每 slice `.bak`。
- **跨朝代**：增长因子全用通用词（民心/承载/灾异/役负/赋税），马尔萨斯是通用人口规律，不涉朝代专名。

---

## 6 · 待 S1 落地时核实（详设未尽 · 落地补核）

1. `tick` `:893-896` 之间其他步骤（死亡/隐户子函数 huji:599/665/698）——与叶级增长的协调顺序。
2. `d.dynamics`（`birthRateBase` 等）当前在全国 `P.dynamics`——叶级要不要各自 dynamics（先共享，S2 视需要叶级化）。
3. `mphh`(户均口) / `dingRatio`(丁口比)——先全国统一，地方差异留后续。
4. `_tickMigration:773-808`（首都虹吸）现状逻辑——改写叶时保持迁移语义。

---

## 7 · 顺带激活的死字段（重构红利）

| 字段 | 卷 | 重构后 |
|---|---|---|
| 户数 / 丁口 | 卷一 | 逐回合随本地生死活变 |
| `carryingCapacity` → **粮食供需** | 卷一/二 | 载力落到 `grainOutput/foodNeed/foodDeficit`(renli)·粮食真约束人口 |
| `prosperity/wealth` 繁荣/财富 | 卷一/三 | 接「生活水平」→生育意愿/夭折率 |
| 粮产/缺粮（已活·卷二） | 卷二 | 重构后**直接驱动人口增减·调粮可救荒** |
| `byGender/byAge/byEthnicity/byFaith` 族群构成 | 卷一 | 叶级人口结构活态（P0-4 并入此处） |
| 逃户 / 隐户 | 卷一 | 已部分活·重构后与增长同源一致 |

> P0-4（保甲/族群）并入本重构 S2/S3——族群构成本就是叶级人口结构。
