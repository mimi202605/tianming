# 穿越模式 UI 体系重建 · Design Spec

> **设计日期**：2026-07-20
> **设计依据**：2026-07-19 穿越模式非皇帝 UI 重设计 spec（已落地 Phase A/B）·本次为「shell 体系重建」第二轮，针对仍存在的渲染入口报错、缺大地图、缺右栏三大缺口
> **痛点摘要**：上一轮 Phase A/B 给了穿越模式外壳与 7 tab，但渲染入口仍散落、`PlayerFamily 无可用渲染入口` 一类报错反复；穿越专属大地图完全缺失（玩家只能看皇帝御案 phase8-formal-map）；右栏只有身份卡，9 大玩家系统无图标栅格入口；callLLM/callAI 在穿越 UI 文件里被直接调用，朝代污染与超时无降级
> **目标**：建一套自洽的穿越专属 shell+rail+map+adapter+ai-bridge，根治「无可用渲染入口」、补齐大地图与右栏栅格、把 AI 调用全部收口到双轨桥，并加 2 条 lint 守卫把隔离铁律钉成自动化门禁
> **范围**：5 个新建核心实现文件 + 3 个 lint 守卫文件 + 5 个现有文件修改 + 8 个 smoke 文件，单一 PR 交付

---

## §0 · 背景与问题

### 0.1 上一轮留下的三个硬伤

2026-07-19 的 spec（`2026-07-19-transmigration-ui-redesign-design.md`）落地了双轨分派、7 场景 tab、5 套身份主题色、奉旨卡片浮层，但实际跑起来仍有三处硬伤：

1. **渲染入口报错反复**——`tm-player-systems-ui.js::renderBlock(systemKey)` 是个 switch，14 个 PlayerXxx 系统里有几个没有 case，落进 default 分支后输出 `PlayerFamily 无可用渲染入口` 一类占位文案。玩家点开「家族」tab 看到的是这句报错而不是家族信息。根因是「系统枚举」与「渲染入口枚举」两侧各自增长、没有单一适配层对齐。
2. **穿越专属大地图完全缺失**——`tm-player-map.js` 不存在，玩家在穿越模式想看「自己在哪、敌人在哪、京师离我多远」只能借皇帝御案的 `phase8-formal-map.js`。这违反「穿越专属 UI 绝不调皇帝御案渲染函数」的铁律，且皇帝地图的视角（御案俯瞰天下）和穿越视角（一个角色站在某地）本就不该共享。
3. **右栏只有身份卡**——`tm-player-ui-render.js::renderRightPanel()` 只渲染玩家身份卡 + 人物志 + 编年，9 大玩家系统（家族/婚姻/私产/产业/上奏/朝议/关系/移动/军务）没有快捷入口。玩家想看「我的私产」必须切到 social tab 再往下滚，操作链路过长。

### 0.2 AI 调用散落问题

穿越模式 UI 文件（`tm-player-shell`/`tm-player-rail`/`tm-player-map`/`tm-player-systems-ui`/`tm-player-ui-render`/`tm-player-systems-adapter`）里有若干处直接调 `callLLM(...)` 或 `callAI(...)`，带来三个问题：

- **超时无降级**：`callLLM` 默认无超时，LLM 卡住时整页 UI 卡死。
- **朝代污染**：systemPrompt 里偶尔混入「锦衣卫」「东厂」一类明清专名，破坏「跨朝代铁律」。
- **重复调用**：同一 systemKey 在同一 turn 内被多次调用，无缓存。

### 0.3 设计目标

| 目标 | 衡量标准 |
|------|---------|
| 根治「无可用渲染入口」 | 15 个 PlayerXxx 系统全部走 `TM.PlayerSystemsAdapter.renderBlock` 单一入口，未知 systemKey 走占位、fn 抛异常走 fallback |
| 补齐穿越专属大地图 | `TM.PlayerMap.render()` 独立 SVG，三态折叠，localStorage 持久化，绝不调 phase8-formal-map |
| 补齐右栏 3×3 栅格 | `TM.PlayerRail.render()` 9 槽位 + drawer，RAIL_MATRIX v2 放宽军务/反叛槽对 minister/regent/eunuch/custom/commoner 可见 |
| AI 调用全收口 | 穿越 UI 文件 0 处直接调 callLLM/callAI，全部走 `TM.PlayerAIBridge.invoke`，5s 超时 + 降级链 + 缓存 + schema 校验 + 朝代污染检查 |
| 隔离铁律自动化 | 守卫 9（隔离）+ 守卫 10（AI 包装）写进 `lint-arch-all.js`，CHECKS 从 8 项扩为 10 项 |

### 0.4 不做什么

- 不动皇帝御案 UI 一行代码（`phase8-formal-bridge.js` / `phase8-formal-map.js` 零改动）
- 不重构 14 个 PlayerXxx 系统的业务逻辑（只做渲染入口适配）
- 不引入构建系统（仍走原生 JS + 顺序 `<script>` + `window.TM.*` 命名空间）
- 不动 `tm-game-ui-shell.js::renderGameState` 的双轨分派（上一轮已落地）

---

## §1 · 三层分离架构与铁律

### 1.1 三层划分

```
┌─────────────────────────────────────────────────────────────────┐
│ 第 1 层 · 皇帝御案 UI                                            │
│   phase8-formal-bridge.js / phase8-formal-map.js /              │
│   phase8-formal-topbar.js / phase8-formal-rightrail.js          │
│   ↓ 穿越模式禁调（守卫 9 拦截）                                  │
├─────────────────────────────────────────────────────────────────┤
│ 第 2 层 · 穿越专属 UI（本次重建）                                │
│   tm-player-shell.js（主壳）                                     │
│   tm-player-rail.js（右栏栅格）                                  │
│   tm-player-map.js（大地图）                                     │
│   tm-player-systems-adapter.js（系统渲染适配器）                 │
│   tm-player-ai-bridge.js（AI 双轨桥）                            │
│   tm-player-systems-ui.js / tm-player-ui-render.js（既有·改委托）│
│   tm-transmigration-ui.css（既有·加新样式）                      │
│   ↓ 仅通过 GM/P 读写数据                                         │
├─────────────────────────────────────────────────────────────────┤
│ 第 3 层 · 数据逻辑层                                             │
│   GM.* / P.* / TM.PlayerFamily / TM.PlayerMarriage / ...        │
│   14 个 PlayerXxx 系统模块（业务逻辑·零改动）                    │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 三层分离的硬约束

| 约束 | 落地手段 |
|------|---------|
| 第 2 层绝不调第 1 层 | 守卫 9（lint-transmigration-isolation.js）正则拦截 `renderEmperorState(`、`TMPhase8FormalBridge.<method>(` 在 tm-player-shell/rail/map 中的实际调用 |
| 第 2 层绝不直接调 callLLM/callAI | 守卫 10（lint-ai-bridge-wrap.js）正则拦截 `callLLM(`、`callAI(` 在穿越 UI 文件中的实际调用，例外：`tm-player-ai-bridge.js` 本身是包装器 |
| 第 2 层只通过 GM/P 读写数据 | 既有约定，无新增守卫（lint-gm-writes 已覆盖 GM 写路径） |
| 第 1 层零改动 | git diff 检查 phase8-* 文件 0 行变化 |

### 1.3 穿越铁律（一条总纲）

> **穿越模式绝不降级到皇帝界面。** 穿越专属 shell/rail/map 绝不调皇帝御案渲染函数；穿越模式任何渲染异常都走占位（系统块占位 / 地图占位 / drawer 占位），不允许「降级到 renderEmperorState」一类回退。

这条铁律是本次重建的最高约束。落地方式：

- `tm-player-shell.js::_assertInvariants` 8 条不变量中第一条就是「`document.body.classList.contains('transmigration-mode')` 必为 true」
- `tm-player-map.js` 渲染失败走 SVG 占位（写「地图暂不可用」），不调 phase8-formal-map
- `tm-player-rail.js::openDrawer` 懒创建到 `document.body`，drawer body 走 `TM.PlayerSystemsAdapter.renderBlock`，绝调 phase8-formal-rightrail
- `tm-player-systems-adapter.js::renderBlock` 五步流程的「fallback」是占位字符串，不是 renderEmperorState

### 1.4 body class 互斥

```html
<body class="tm-phase8-formal">             <!-- 皇帝模式 -->
<body class="transmigration-mode tm-phase8-legacy player-role-minister">  <!-- 穿越模式·朝臣 -->
```

- `tm-phase8-formal`（皇帝）与 `transmigration-mode`（穿越）互斥，由 `renderGameState`/`renderEmperorState`/`renderPlayerState` 三者之一负责切换
- 穿越模式额外挂 `tm-phase8-legacy`（沿用上一轮约定）+ `player-role-<role>`（15 种角色主题色）
- CSS 通过这两个根类名空间隔离，皇帝模式样式不会被穿越模式覆盖，反之亦然

---

## §2 · 顶栏四段式设计

### 2.1 四段式分区

`tm-player-shell.js::renderTopBar` 把穿越模式顶栏分成四段，从左到右：

```
┌──────────┬───────────┬──────────┬──────────────────────────────────┐
│ §1 身份  │ §2 从属   │ §3 时序  │ §4 数值                          │
│ identity │ affiliation│ time    │ stats                            │
├──────────┼───────────┼──────────┼──────────────────────────────────┤
│ 头像     │ 官职      │ 年号     │ 财帛 / 声望 / 命格 / 厄难         │
│ 姓名     │ 阵营      │ 季节     │ （按当前 tab 优先级动态精选 3-4） │
│ 身份徽章 │ 家族      │ 年龄     │                                  │
│ 所在地   │ 君主      │ 在位年数 │                                  │
└──────────┴───────────┴──────────┴──────────────────────────────────┘
```

### 2.2 §1 identity（身份段）

- `player-portrait`：按 `playerRole` 取 ICON（朝臣=笏板、宦官=印玺、后宫=凤钗、平民=布衣、custom=自定义）
- `player-name`：玩家姓名（如「赵孟頫」）
- `player-role-chip`：身份徽章，按 15 角色主题色着色（`player-role-<role>` CSS 变量）
- `player-location`：所在地（如「京师·翰林院」），取自 `P.playerInfo.location`

### 2.3 §2 affiliation（从属段）

- `player-office`：官职（如「翰林学士」），取自 `P.playerInfo.office`
- `player-faction`：所属阵营（如「东林党」/「中立」），取自 `P.playerInfo.faction`
- `player-clan`：家族（如「赵氏·三代书香」），取自 `TM.PlayerFamily.getClanSummary()`
- `player-sovereign`：当今君主（如「君主·朱由检」），取自 `GM.sovereign`

  > **跨朝代铁律**：君主段只显示「君主·<姓名>」，不显示年号庙号（避免「崇祯帝」一类明清专名污染）。年号放在 §3 time 段。

### 2.4 §3 time（时序段）

- `player-era`：年号（如「崇祯三年」），取自 `GM.era`
- `player-season`：季节（如「孟春」），取自 `GM.season`
- `player-age`：年龄（如「年四十二」），取自 `P.playerInfo.age`
- `player-reign-year`：在位年数（如「御极三载」），取自 `GM.reignYear`

  > **跨朝代铁律**：「御极」「御宇」一类词朝代中立，可用；「万历」「康熙」一类年号只在剧本设定的朝代里出现，UI 不硬编。

### 2.5 §4 stats（数值段）

数值段是动态精选，按当前 tab 优先级展示 3-4 个数值：

| 当前 tab | 优先展示数值 |
|---------|-------------|
| home | 财帛 / 声望 / 命格 / 厄难 |
| court | 声望 / 朝议支持率 / 君主信任 / 厄难 |
| social | 家族威望 / 姻亲数 / 仇怨数 / 厄难 |
| study | 学识 / 弟子数 / 著作数 / 命格 |
| tech | 格物进度 / 已解技艺 / 工匠数 / 财帛 |
| military | 私兵数 / 装备精良度 / 军心 / 厄难 |
| fortune | 命格 / 气运 / 福报 / 业障 |
| adversity | 厄难 / 仇怨数 / 病厄 / 官非 |

数值段右上角小标显示「按 <tab> 优先」字样，玩家切 tab 时数值段刷新。

### 2.6 顶栏渲染契约

```javascript
TM.PlayerShell.renderTopBar() → {
  identity:   { portrait, name, roleChip, location },
  affiliation:{ office, faction, clan, sovereign },
  time:       { era, season, age, reignYear },
  stats:      [ { label, value, tone }, ... ]  // 3-4 条
}
```

- 任何一段数据缺失走「——」占位，不抛异常
- 顶栏渲染失败走整段占位（「顶栏暂不可用」），不调 renderEmperorState

---

## §3 · 8 tab 体系与角色可见性矩阵

### 3.1 8 tab 定义

`tm-player-shell.js::SCENE_BLOCKS` 8 个 tab，比上一轮 7 tab 多一个 `tech`（格物）：

| 序 | tabKey | 显示名 | 图标 | 主内容 |
|---|--------|--------|------|--------|
| 1 | home | 居所 | 庭院 | 居所概览 / 今日要务 / 近期家事 |
| 2 | court | 朝堂 | 殿宇 | 朝议 / 上奏 / 朝臣动向 |
| 3 | social | 亲党 | 姻亲 | 家族 / 婚姻 / 关系网 |
| 4 | study | 问学 | 书卷 | 学识 / 弟子 / 著作 |
| 5 | tech | 格物 | 齿轮 | 格物进度 / 已解技艺 / 工匠 |
| 6 | military | 军务 | 兵符 | 私兵 / 装备 / 军心（部分角色禁用） |
| 7 | fortune | 命格 | 算筹 | 命格 / 气运 / 福报 / 业障 |
| 8 | adversity | 厄难 | 风暴 | 厄难 / 仇怨 / 病厄 / 官非 |

### 3.2 ROLE_STATS 15 行 × 8 列可见性矩阵

`tm-player-shell.js::ROLE_STATS` 15 行（14 角色 + custom）× 8 列（8 tab），值 `'on'` / `'off'` / `'gray'`：

| 角色 \ tab | home | court | social | study | tech | military | fortune | adversity |
|------------|------|-------|--------|-------|------|----------|---------|-----------|
| emperor* | — | — | — | — | — | — | — | — |
| minister（朝臣） | on | on | on | on | on | on | on | on |
| regent（摄政） | on | on | on | on | on | on | on | on |
| eunuch（宦官） | on | on | on | on | on | on | on | on |
| consort（后宫） | on | on | on | on | on | gray | on | on |
| maid（侍女） | on | gray | on | on | gray | off | on | on |
| infant（稚童） | on | off | on | on | gray | off | on | on |
| general（武将） | on | on | on | on | on | on | on | on |
| scholar（士人） | on | on | on | on | on | gray | on | on |
| merchant（商贾） | on | gray | on | on | on | gray | on | on |
| monk（僧道） | on | off | on | on | on | off | on | on |
| artisan（匠人） | on | off | on | on | on | gray | on | on |
| commoner（平民） | on | gray | on | on | on | gray | on | on |
| rebel（反贼） | on | off | on | on | on | on | on | on |
| custom（自定义） | on | on | on | on | on | on | on | on |

\* emperor 行不参与（穿越模式排除皇帝）；其余 14 行 + custom = 15 行。

- `on`：可见且可交互
- `gray`：灰显（tab 图标变灰、点击进 tab 后内容区写「此角色暂无此系统权限」）
- `off`：隐藏 tab（不渲染 tab 头）

### 3.3 maid/infant 的 tech tab 灰显

maid（侍女）与 infant（稚童）的 tech（格物）tab 设为 `gray`：

- maid 社会地位限制其参与格物（历史依据：明清侍女无独立格物权）
- infant 年龄限制其参与格物（稚童未到开蒙年龄）

灰显后点击进 tab，内容区写：「此角色身份所限，格物一道暂不可及。」并附「成年后可解锁」字样（infant）或「晋升后可解锁」字样（maid）。

### 3.4 SCENE_BLOCKS 数据结构

```javascript
SCENE_BLOCKS = [
  { key: 'home',     label: '居所', icon: '庭院', roleStats: { emperor:'-', minister:'on', ... } },
  { key: 'court',    label: '朝堂', icon: '殿宇', roleStats: { ... } },
  { key: 'social',   label: '亲党', icon: '姻亲', roleStats: { ... } },
  { key: 'study',    label: '问学', icon: '书卷', roleStats: { ... } },
  { key: 'tech',     label: '格物', icon: '齿轮', roleStats: { ... } },
  { key: 'military', label: '军务', icon: '兵符', roleStats: { ... } },
  { key: 'fortune',  label: '命格', icon: '算筹', roleStats: { ... } },
  { key: 'adversity',label: '厄难', icon: '风暴', roleStats: { ... } }
];
```

`TM.PlayerShell.scenesForRole(role)` 返回该角色可见的 tab 子集（过滤 `off`），保留 `gray`（灰显但渲染）。

### 3.5 tab 切换的右栏联动

切 tab 时右栏 stats 段刷新（§2.5 数值段动态精选），但右栏 3×3 栅格（§6）不变——栅格是「9 大系统快捷入口」，与 tab 是两套正交维度。

---

## §4 · 大地图三态折叠 + 独立 SVG 渲染

### 4.1 三态状态机

`tm-player-map.js` 三态：

| 状态 | 高度 | 用途 | 切换按钮 |
|------|------|------|---------|
| expanded | 45vh | 默认态·看局部区域 | 右上角「⤢」切 fullscreen、「—」切 collapsed |
| fullscreen | 90vh | 全屏看天下 | 右上角「⤡」切 expanded |
| collapsed | 24vh | 折叠成一条·看当前位置概要 | 右上角「⤢」切 expanded |

状态机转移：

```
expanded ⇄ fullscreen
expanded ⇄ collapsed
fullscreen ✗ collapsed（不直接转移·必须经 expanded）
```

状态持久化到 `localStorage.playerMapState`，下次进游戏恢复。

### 4.2 独立 SVG 渲染

`TM.PlayerMap.render(container)` 渲染独立 SVG，**不耦合** `phase8-formal-map.js`：

- SVG 视口：`viewBox="0 0 1000 700"`，按容器高度自适应
- 图层（从下到上）：
  1. `terrain-layer`：地形底图（取自 `GM.map.terrain`，简化为 5 色：山/水/田/城/荒）
  2. `region-layer`：行政区划边界（取自 `GM.map.regions`）
  3. `route-layer`：道路与河流（取自 `GM.map.routes`）
  4. `marker-layer`：城市/要塞/资源点（取自 `GM.map.markers`）
  5. `player-layer`：玩家位置（取自 `P.playerInfo.location`，红色脉冲点）
  6. `relation-layer`：玩家关系网（取自 `TM.PlayerInteraction.getRelations()`，按关系类型着色）
  7. `event-layer`：当前 turn 的事件点（取自 `GM.events`，按事件类型着色）

### 4.3 与皇帝御案地图的差异

| 维度 | 皇帝御案 phase8-formal-map | 穿越专属 tm-player-map |
|------|---------------------------|------------------------|
| 视角 | 御案俯瞰天下 | 单角色站在某地 |
| 中心 | 京师 | 玩家当前位置 |
| 高亮 | 全国州县 | 玩家可见区域（基于 `P.playerInfo.sight`） |
| 交互 | 点州县下诏 | 点城市出「前往」drawer |
| 数据源 | GM.map.* 全量 | GM.map.* + P.playerInfo 过滤 |

### 4.4 渲染失败走占位

```javascript
try {
  container.innerHTML = buildSvg(...);
} catch (e) {
  container.innerHTML = '<div class="player-map-fallback">地图暂不可用</div>';
  // 不调 phase8-formal-map
}
```

### 4.5 跨朝代铁律

地图上的地名一律取自 `GM.map.markers`（剧本数据），UI 不硬编任何地名。例如：

- ✅ `marker.name`（取自剧本）→ 显示「长安」/「洛阳」/「汴京」
- ❌ 硬编 `'北京'` / `'南京'` 一类明清专名

---

## §5 · AI 双轨设计

### 5.1 双轨总纲

> **程序骨架（保证下限）+ LLM 血肉（保证上限）**：每个 AI 应用点都先跑程序骨架（确定性逻辑，必出结果），再调 LLM 增强（5s 超时 + 降级链，失败走骨架结果）。

### 5.2 三层级 L1/L2/L3

| 层级 | 含义 | 调用频率 | 降级到 |
|------|------|---------|--------|
| L1 | 程序骨架（纯规则·必出结果） | 每 turn 必跑 | 无（自身就是下限） |
| L2 | LLM 增强·轻量（5s 超时） | 每 turn 可跑 | L1 |
| L3 | LLM 增强·重度（5s 超时·带 schema 校验） | 关键节点跑 | L2 → L1 |

L1 必跑、L2 可跑、L3 关键节点跑——任何一层失败都向下降级，绝不向上抛异常。

### 5.3 AI_SCENARIOS 18 条应用点

`tm-player-ai-bridge.js::AI_SCENARIOS` 18 条，按 L1/L2/L3 分布：

**L1×4（程序骨架·必跑）**：

1. `family.daily` — 家族每日摘要
2. `economy.daily` — 私产每日结算
3. `fortune.tick` — 命格 tick
4. `adversity.tick` — 厄难 tick

**L2×8（LLM 轻量增强·5s 超时）**：

5. `marriage.propose` — 求亲文案
6. `interaction.dialogue` — 对话生成
7. `memorial.draft` — 上奏草稿
8. `court.debate.opening` — 朝议开场
9. `movement.travel.log` — 行旅日志
10. `skill.practice.feedback` — 习艺反馈
11. `industry.inspect` — 产业巡视
12. `tech.research.hint` — 格物提示

**L3×6（LLM 重度增强·5s 超时 + schema 校验）**：

13. `court.debate.speech` — 朝议发言（带 schema：立场/论据/措辞）
14. `rebel.plan` — 反叛谋划（带 schema：步骤/资源/风险）
15. `privatearmy.deploy` — 私兵调动（带 schema：目标/兵力/补给）
16. `marriage.negotiation` — 联姻谈判（带 schema：条件/让步/底线）
17. `memorial.finalize` — 奏疏定稿（带 schema：格式/用典/避讳）
18. `endturn.review` — 回合总结（带 schema：成就/失误/展望）

### 5.4 降级链

`TM.PlayerAIBridge.invoke(scenarioKey, opts)` 五步：

```
1. 查缓存（Map·key = scenarioKey + opts.hash）→ 命中返回
2. 调 callLLM（5s 超时）→ 成功且 schema 通过 → 缓存 + 返回
3. callLLM 失败/超时 → 调 callAI（5s 超时）→ 成功且 schema 通过 → 缓存 + 返回
4. callAI 失败/超时 → 用 opts.template（程序模板·L1 骨架）→ 返回
5. 朝代污染检查（COMMON_DYNASTY_TERMS 白名单 + SUSPECT 黑名单）→ 污染则降级到 opts.template
```

### 5.5 朝代污染检查

```javascript
var COMMON_DYNASTY_TERMS = ['皇帝', '君主', '朝廷', '州县', '京师', ...];  // 朝代中立词白名单
var SUSPECT = ['锦衣卫', '东厂', '西厂', '内行厂', '万历', '康熙', '乾隆', ...];  // 明清专名黑名单

function checkDynastyPollution(text) {
  for (var i = 0; i < SUSPECT.length; i++) {
    if (text.indexOf(SUSPECT[i]) !== -1) return { polluted: true, term: SUSPECT[i] };
  }
  return { polluted: false };
}
```

LLM 输出含 SUSPECT 词 → 判定污染 → 降级到 opts.template（程序骨架）+ 控制台 warning。

### 5.6 缓存

- `Map` key = `scenarioKey + '|' + hash(opts)`
- `hash(opts)` 简单 JSON.stringify 后取 hash（djb2 算法）
- 缓存有效期：当前 turn（`GM.turn` 不变时复用，turn 变化时清空）
- 缓存上限：100 条（LRU 淘汰）

### 5.7 schema 校验

L3 应用点必须带 schema：

```javascript
AI_SCENARIOS['court.debate.speech'] = {
  level: 'L3',
  schema: {
    stance: { type: 'string', required: true, enum: ['support', 'oppose', 'neutral'] },
    arguments: { type: 'array', required: true, minItems: 1, maxItems: 5 },
    rhetoric: { type: 'string', required: true, maxLength: 200 }
  },
  template: function(opts) {
    return { stance: 'neutral', arguments: ['略陈一端'], rhetoric: '臣有愚见，伏惟裁察。' };
  }
};
```

LLM 输出 JSON.parse 失败 → 降级；schema 校验失败 → 降级。

### 5.8 守卫 10 拦截规则

`lint-ai-bridge-wrap.js` 守卫规则：

- 扫描文件：`tm-player-shell.js` / `tm-player-rail.js` / `tm-player-map.js` / `tm-player-systems-ui.js` / `tm-player-systems-adapter.js` / `tm-player-ui-render.js`
- 拦截模式：`callLLM(` / `callAI(`（实际调用，含空白）
- 例外：`tm-player-ai-bridge.js` 本身（包装器·允许调 callLLM/callAI）
- 行内豁免：`// arch-ok` 行尾标记

---

## §6 · 右栏 3×3 图标栅格 + drawer

### 6.1 9 槽位定义

`tm-player-rail.js::SCENE_RAIL` 9 槽位（3×3 栅格）：

| 槽 | railKey | 显示名 | 图标 | 对应系统 | altKey |
|---|---------|--------|------|---------|--------|
| 1 | family | 家族 | 灯笼 | PlayerFamily | — |
| 2 | marriage | 婚姻 | 双鱼 | PlayerMarriage | — |
| 3 | economy | 私产 | 元宝 | PlayerEconomy | — |
| 4 | industry | 产业 | 厂坊 | PlayerIndustry | — |
| 5 | memorial | 上奏 | 奏疏 | PlayerMemorial | — |
| 6 | courtdebate | 朝议 | 殿议 | PlayerCourtDebate | — |
| 7 | interaction | 关系 | 网罗 | PlayerInteraction | — |
| 8 | movement | 移动 | 车马 | PlayerMovement | — |
| 9 | military | 军务 | 兵符 | PlayerPrivateArmy | rebel（反叛·altKey） |

### 6.2 RAIL_MATRIX v2

`tm-player-rail.js::RAIL_MATRIX` 15 行 × 9 列，值 `'enabled'` / `'disabled'` / `'hidden'`：

| 角色 \ 槽 | family | marriage | economy | industry | memorial | courtdebate | interaction | movement | military |
|-----------|--------|----------|---------|----------|----------|-------------|-------------|----------|----------|
| minister | enabled | enabled | enabled | enabled | enabled | enabled | enabled | enabled | **enabled** |
| regent | enabled | enabled | enabled | enabled | enabled | enabled | enabled | enabled | **enabled** |
| eunuch | enabled | enabled | enabled | enabled | enabled | enabled | enabled | enabled | **enabled** |
| consort | enabled | enabled | enabled | enabled | enabled | disabled | enabled | disabled | disabled |
| maid | enabled | disabled | enabled | disabled | disabled | disabled | enabled | disabled | disabled |
| infant | enabled | disabled | disabled | disabled | disabled | disabled | enabled | disabled | disabled |
| general | enabled | enabled | enabled | enabled | enabled | enabled | enabled | enabled | enabled |
| scholar | enabled | enabled | enabled | enabled | enabled | enabled | enabled | enabled | disabled |
| merchant | enabled | enabled | enabled | enabled | disabled | disabled | enabled | enabled | disabled |
| monk | enabled | disabled | enabled | disabled | disabled | disabled | enabled | enabled | disabled |
| artisan | enabled | enabled | enabled | enabled | disabled | disabled | enabled | enabled | disabled |
| **commoner** | enabled | enabled | enabled | enabled | disabled | disabled | enabled | enabled | **enabled** |
| rebel | enabled | enabled | enabled | enabled | disabled | disabled | enabled | enabled | enabled |
| custom | enabled | enabled | enabled | enabled | enabled | enabled | enabled | enabled | **enabled** |

**v2 放宽点**：槽 8（military/军务+反叛）对 `minister`/`regent`/`eunuch`/`custom`/`commoner` 从 v1 的 `disabled` 改为 `enabled`。

### 6.3 v2 放宽的历史依据

历史上摄政、朝臣、宦官、后宫、平民都有军务/反叛案例：

| 角色 | 历史案例 | 类型 |
|------|---------|------|
| 摄政（regent） | 王莽代汉、曹操挟天子、司马昭之心 | 军务+反叛 |
| 朝臣（minister） | 桓玄代晋、安史之乱（安禄山为节度使·朝臣身份）、袁世凯 | 军务+反叛 |
| 宦官（eunuch） | 唐末宦官专权（神策军中尉）、明代曹吉祥造反 | 军务+反叛 |
| 平民（commoner） | 陈胜吴广、黄巾张角、方腊、太平天国 | 反叛（核心案例） |
| 自定义（custom） | 玩家自创角色·不应预设限制 | 军务+反叛 |

v1 把这些角色全设 `disabled` 是过度限制，v2 放宽后玩家可以走「朝臣拥兵自重→反叛自立」一类历史合理的路径。

### 6.4 drawer 懒创建

`TM.PlayerRail.openDrawer(railKey)` 五步：

1. 关旧 drawer（若开着）——`closeDrawer()` 移除 DOM 节点
2. 懒创建新 drawer——`document.createElement('div')` + `classList.add('player-rail-drawer')`
3. 挂载到 `document.body`（避免被主面板 overflow 截断）
4. drawer body 调 `TM.PlayerSystemsAdapter.renderBlock(systemKey, role, blockTitle)`——复用场景区渲染入口，保持一致
5. drawer 头部显示槽位名 + 关闭按钮，底部显示「相关系统」链接（切到对应 tab）

### 6.5 drawer 开新关旧

```javascript
var currentDrawer = null;

function openDrawer(railKey) {
  if (currentDrawer) closeDrawer();  // 关旧
  var drawer = createDrawer(railKey);
  document.body.appendChild(drawer);
  currentDrawer = drawer;
}

function closeDrawer() {
  if (currentDrawer) {
    currentDrawer.remove();
    currentDrawer = null;
  }
}
```

避免多个 drawer 同时开着叠床架屋。

### 6.6 槽位状态

`TM.PlayerRail.getSlotState(railKey)` 返回：

- `enabled` / `disabled` / `hidden`（来自 RAIL_MATRIX）
- `reddot`：是否有红点（来自 `P.playerInfo.notifications[railKey]`）
- `pulse`：是否脉冲（来自 `P.playerInfo.urgent[railKey]`）

`hidden` 槽不渲染，`disabled` 槽灰显且点击无反应，`enabled` 槽正常点击开 drawer。

---

## §7 · 跨朝代铁律与守卫自动化

### 7.1 跨朝代铁律总纲

> **所有专名朝代中立，绝不硬编明清专名。**

穿越模式支持任意朝代剧本（先秦到清末），UI 层不能出现任何朝代特有词。具体：

- **官职**：用「君主」「朝臣」「摄政」「宦官」一类朝代中立词，不用「皇帝」「内阁」「司礼监」一类明清专名
- **机构**：用「朝廷」「州县」「京师」一类中立词，不用「锦衣卫」「东厂」「军机处」一类专名
- **地名**：从剧本数据 `GM.map.markers` 取，不硬编
- **年号**：从剧本数据 `GM.era` 取，不硬编
- **服饰/器物**：用「笏板」「印玺」「凤钗」「布衣」一类通用器物，不用「乌纱帽」「蟒袍」一类专名

### 7.2 朝代污染检查（AI 输出）

见 §5.5。LLM 输出含 SUSPECT 黑名单词 → 降级到程序骨架。

### 7.3 守卫 9 · 穿越隔离

`lint-transmigration-isolation.js` 守卫规则：

- 扫描文件：`tm-player-shell.js` / `tm-player-rail.js` / `tm-player-map.js`
- 拦截模式（实际调用·含空白）：
  - `renderEmperorState(`
  - `TMPhase8FormalBridge.<method>(`（任意 method）
  - `phase8FormalBridge.<method>(`
  - `TM.Phase8FormalBridge.<method>(`
- 行内豁免：`// arch-ok` 行尾标记
- 命中即报错，列出文件名+行号+匹配文本

### 7.4 守卫 10 · AI 包装

`lint-ai-bridge-wrap.js` 守卫规则（见 §5.8）：

- 扫描文件：`tm-player-shell.js` / `tm-player-rail.js` / `tm-player-map.js` / `tm-player-systems-ui.js` / `tm-player-systems-adapter.js` / `tm-player-ui-render.js`
- 拦截模式：`callLLM(` / `callAI(`
- 例外：`tm-player-ai-bridge.js`
- 行内豁免：`// arch-ok`

### 7.5 lint-arch-all 伞形入口

`lint-arch-all.js::CHECKS` 数组从 8 项扩为 10 项：

```javascript
const CHECKS = [
  { name: 'lint-gm-writes', file: 'lint-gm-writes.js' },
  { name: 'lint-dep-graph', file: 'lint-dep-graph.js' },
  { name: 'lint-file-size', file: 'lint-file-size.js' },
  { name: 'lint-control-bytes', file: 'lint-control-bytes.js' },
  { name: 'lint-split-contracts', file: 'lint-split-contracts.js' },
  { name: 'lint-split-stamps', file: 'lint-split-stamps.js' },
  { name: 'lint-smoke-family-order', file: 'lint-smoke-family-order.js' },
  { name: 'lint-transmigration-isolation', file: 'lint-transmigration-isolation.js' },  // 守卫 9
  { name: 'lint-ai-bridge-wrap', file: 'lint-ai-bridge-wrap.js' },                      // 守卫 10
  { name: 'ref-check', file: 'ref-check.js' }
];
```

跑 `node web/scripts/lint-arch-all.js` 输出 `PASS — 架构守卫 10/10 全绿` 才算过门禁。

### 7.6 守卫与 smoke 的分工

| 类型 | 工具 | 用途 | 速度 |
|------|------|------|------|
| 守卫（lint） | `lint-arch-all.js` | 静态正则拦截·防隔离铁律被破坏 | 秒级 |
| smoke | `ci-smokes.js` | JSDOM-like vm 跑实际渲染·防功能回归 | 分钟级 |

守卫 9 + 守卫 10 是「防隔离铁律被破坏」的静态门禁；5 个新 smoke 是「防功能回归」的动态门禁。两者互补，缺一不可。

### 7.7 铁律的「为什么」

每条铁律对应一次真实事故或可预见事故：

- **不调 renderEmperorState**：上一轮 Phase A 曾有 `renderPlayerState` 异常降级到 `renderEmperorState` 的写法，导致玩家在穿越模式突然看到皇帝御案——「我是谁我在哪」感极强。本次彻底禁止降级。
- **不调 phase8-formal-bridge**：曾有 `tm-player-map.js` 草稿版直接调 `TMPhase8FormalBridge.renderMap(...)`，结果皇帝地图的「点州县下诏」交互在穿越模式触发，玩家点了州县弹出皇帝才能用的下诏面板。
- **不直接调 callLLM/callAI**：曾有 `tm-player-shell.js` 直接调 `callLLM` 生成朝议发言，LLM 卡住 30s，整页 UI 卡死，且输出含「锦衣卫」明清专名污染。
- **不硬编明清专名**：曾有 `tm-player-rail.js` 草稿把槽 5 命名为「奏疏（东厂）」，结果在汉唐剧本里出现「东厂」字样，明显穿帮。

---

## 附录 · 文件清单总表

### 新建 5 个核心实现文件

| 文件 | 行数 | 职责 |
|------|------|------|
| `web/tm-player-systems-adapter.js` | 140 | 15 个 systemKey 统一 renderBlock 入口 |
| `web/tm-player-ai-bridge.js` | 474 | AI 双轨入口 + 降级链 + 缓存 + schema 校验 + 朝代污染检查 |
| `web/tm-player-map.js` | 299 | 穿越专属大地图·独立 SVG·三态折叠 |
| `web/tm-player-shell.js` | 447 | shell 主壳·组合顶栏/左栏/主面板/右栏 |
| `web/tm-player-rail.js` | 270 | 右栏 3×3 图标栅格 + drawer |

### 新建 3 个 lint 守卫文件

| 文件 | 守卫号 | 职责 |
|------|--------|------|
| `web/scripts/lint-transmigration-isolation.js` | 9 | 拦截 tm-player-shell/rail/map 调皇帝御案渲染函数 |
| `web/scripts/lint-ai-bridge-wrap.js` | 10 | 拦截穿越 UI 文件直接调 callLLM/callAI |
| `web/scripts/lint-arch-all.js`（修改） | — | CHECKS 从 8 项扩为 10 项 |

### 修改 5 个现有文件

| 文件 | 改动点 |
|------|--------|
| `web/tm-player-systems-ui.js` | 加 tech tab + renderBlock 委托给 TM.PlayerSystemsAdapter + ROLE_SCENES 加 tech |
| `web/tm-player-ui-render.js` | renderTopBar/renderLeftTabs/render/renderRightPanel 委托给 TM.PlayerShell |
| `web/tm-transmigration-ui.css` | 加 8 tab / 3×3 栅格 / drawer / 地图 / AI 渲染样式 |
| `web/tm-game-loop.js` | _showSituationOverview 加穿越模式守卫（穿越模式不显示「开始治国」按钮·改为「开始穿越」） |
| `web/index.html` | 加 5 个新 script 标签（adapter/ai-bridge/map/shell/rail） |

### 新建/修改 8 个 smoke 文件

| 文件 | 类型 | 职责 |
|------|------|------|
| `web/scripts/smoke-transmigration-shell.js` | 新建 | TM.PlayerShell 8 tab / 顶栏四段式 / 不变量 |
| `web/scripts/smoke-transmigration-rail.js` | 新建 | TM.PlayerRail 9 槽 / RAIL_MATRIX v2 / drawer 开新关旧 |
| `web/scripts/smoke-player-ai-bridge.js` | 新建 | 降级链 / 缓存 / schema 校验 / 朝代污染检查 |
| `web/scripts/smoke-player-systems-adapter.js` | 新建 | 15 systemKey 全覆盖 / 异常 fallback / 未知系统占位 |
| `web/scripts/smoke-player-map.js` | 新建 | 三态折叠 / localStorage 持久化 / SVG 占位 |
| `web/scripts/smoke-transmigration-e2e.js` | 修改 | 加 shell+rail+map 集成断言 |
| `web/scripts/smoke-transmigration-ui.js` | 修改 | 加 8 tab + tech tab 灰显断言 |
| `web/scripts/smoke-transmigration-ui-phase-b.js` | 修改 | 加 drawer + AI 双轨断言 |
