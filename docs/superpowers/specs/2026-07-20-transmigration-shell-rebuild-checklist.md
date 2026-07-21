# 穿越模式 UI 体系重建 · Acceptance Checklist

> **验收日期**：2026-07-20
> **验收对象**：穿越模式 UI 体系重建 PR（5 核心文件 + 3 lint 守卫 + 5 现有文件修改 + 8 smoke 文件）
> **验收依据**：[设计文档](file:///workspace/docs/superpowers/specs/2026-07-20-transmigration-shell-rebuild-design.md) · [任务清单](file:///workspace/docs/superpowers/specs/2026-07-20-transmigration-shell-rebuild-tasks.md)
> **验收铁律**：5 个里程碑 M1-M5 必须顺序通过，每个里程碑的所有勾选项必须全部 `[x]` 才能进下一个。任一里程碑卡住即报告阻塞，不跳过、不降级。

---

## 里程碑总览

| 里程碑 | 内容 | 状态 |
|--------|------|------|
| M1 | 5 核心文件语法 OK + 功能冒烟通过 | ⏳ |
| M2 | 3 lint 守卫运行 PASS（lint-arch-all 10/10） | ⏳ |
| M3 | 5 现有文件修改完成 + 语法 OK | ⏳ |
| M4 | 8 smoke 文件全绿 | ⏳ |
| M5 | ci-smokes 全量 0 FAIL + git commit + push + PR | ⏳ |

**图例**：✅ 已通过 / ⏳ 待验收 / ❌ 阻塞

---

## M1 · 5 核心文件语法 OK + 功能冒烟通过

### M1.1 `web/tm-player-systems-adapter.js`（140 行）

#### 语法检查

- [ ] `node -c web/tm-player-systems-adapter.js` 0 错误
- [ ] 文件首行 `// tm-player-systems-adapter.js — 穿越模式系统渲染适配器` 注释存在
- [ ] 文件双路径挂载（`window.TM.PlayerSystemsAdapter` + `module.exports`）存在

#### RENDER_ADAPTERS 15 个 systemKey 全覆盖

- [ ] PlayerFamily
- [ ] PlayerMarriage
- [ ] PlayerEconomy
- [ ] PlayerIndustry
- [ ] PlayerTech
- [ ] PlayerPrivateArmy
- [ ] PlayerRebel
- [ ] PlayerInteraction
- [ ] PlayerMovement
- [ ] PlayerMemorial
- [ ] PlayerCourtDebate
- [ ] PlayerOffice
- [ ] PlayerSkill
- [ ] PlayerFortune
- [ ] PlayerAdversity

每条结构 `{ fn, fallback }`，`fn` 与 `fallback` 均为 function。

#### renderBlock 五步流程

- [ ] Step 1：取 `RENDER_ADAPTERS[systemKey]`
- [ ] Step 2：未知 systemKey → 占位「未知系统 <systemKey>」
- [ ] Step 3：`try { return adapter.fn(role, ctx) }`
- [ ] Step 4：`catch (e) { console.warn + return adapter.fallback(role, ctx) }`
- [ ] Step 5：fallback 是占位字符串，不是 `renderEmperorState`（守卫 9 兼容）

#### 功能冒烟

- [ ] mock `TM.PlayerFamily` → 调 `renderBlock('PlayerFamily', 'minister', '家族')` → 返回非空字符串
- [ ] 调 `renderBlock('PlayerUnknown', 'minister', 'test')` → 返回含「未知系统」占位
- [ ] mock adapter.fn 抛 Error → 调 renderBlock → 返回 fallback 结果 + 不抛异常

---

### M1.2 `web/tm-player-ai-bridge.js`（474 行）

#### 语法检查

- [ ] `node -c web/tm-player-ai-bridge.js` 0 错误
- [ ] 双路径挂载（`window.TM.PlayerAIBridge` + `module.exports`）存在

#### AI_SCENARIOS 18 条

L1×4（程序骨架·必跑）：

- [ ] `family.daily` — 家族每日摘要
- [ ] `economy.daily` — 私产每日结算
- [ ] `fortune.tick` — 命格 tick
- [ ] `adversity.tick` — 厄难 tick

L2×8（LLM 轻量增强·5s 超时）：

- [ ] `marriage.propose` — 求亲文案
- [ ] `interaction.dialogue` — 对话生成
- [ ] `memorial.draft` — 上奏草稿
- [ ] `court.debate.opening` — 朝议开场
- [ ] `movement.travel.log` — 行旅日志
- [ ] `skill.practice.feedback` — 习艺反馈
- [ ] `industry.inspect` — 产业巡视
- [ ] `tech.research.hint` — 格物提示

L3×6（LLM 重度增强·5s 超时 + schema 校验）：

- [ ] `court.debate.speech` — 朝议发言（schema：立场/论据/措辞）
- [ ] `rebel.plan` — 反叛谋划（schema：步骤/资源/风险）
- [ ] `privatearmy.deploy` — 私兵调动（schema：目标/兵力/补给）
- [ ] `marriage.negotiation` — 联姻谈判（schema：条件/让步/底线）
- [ ] `memorial.finalize` — 奏疏定稿（schema：格式/用典/避讳）
- [ ] `endturn.review` — 回合总结（schema：成就/失误/展望）

#### 降级链五步

- [ ] Step 1：查缓存（Map·key = `scenarioKey + '|' + hash(opts)`）→ 命中返回
- [ ] Step 2：调 callLLM（5s 超时）→ 成功且 schema 通过 → 缓存 + 返回
- [ ] Step 3：callLLM 失败/超时 → 调 callAI（5s 超时）→ 成功且 schema 通过 → 缓存 + 返回
- [ ] Step 4：callAI 失败/超时 → 用 opts.template（程序模板·L1 骨架）→ 返回
- [ ] Step 5：朝代污染检查 → 污染则降级到 opts.template

#### 朝代污染检查

- [ ] `COMMON_DYNASTY_TERMS` 白名单定义（皇帝/君主/朝廷/州县/京师/...）
- [ ] `SUSPECT` 黑名单定义（锦衣卫/东厂/西厂/内行厂/万历/康熙/乾隆/...）
- [ ] `checkDynastyPollution(text)` 返回 `{ polluted, term }`

#### 缓存

- [ ] Map 缓存 + djb2 hash
- [ ] 有效期：当前 turn（GM.turn 不变时复用）
- [ ] 上限 100 条（LRU 淘汰）

#### schema 校验

- [ ] L3 应用点必须带 schema（type/required/enum/minItems/maxItems/maxLength）
- [ ] JSON.parse 失败 → 降级
- [ ] schema 校验失败 → 降级

#### 功能冒烟

- [ ] mock callLLM 抛错 + mock callAI 抛错 → 调 invoke → 返回 opts.template 结果
- [ ] mock callLLM 计数 → 调 invoke 两次（同 opts）→ callLLM 仅被调 1 次（缓存命中）
- [ ] mock callLLM 返回 `{ stance: 'invalid' }` → 调 invoke('court.debate.speech') → 降级到 template
- [ ] mock callLLM 返回含「锦衣卫」→ 调 invoke → 降级到 template + 控制台 warning

---

### M1.3 `web/tm-player-map.js`（299 行）

#### 语法检查

- [ ] `node -c web/tm-player-map.js` 0 错误
- [ ] 双路径挂载（`window.TM.PlayerMap` + `module.exports`）存在

#### 三态状态机

- [ ] `expanded`（45vh）/ `fullscreen`（90vh）/ `collapsed`（24vh）三态定义
- [ ] 转移：`expanded ⇄ fullscreen` / `expanded ⇄ collapsed`
- [ ] 转移：`fullscreen ✗ collapsed`（不直接转移·必须经 expanded）
- [ ] 状态持久化 `localStorage.playerMapState`

#### 独立 SVG 渲染（7 图层）

- [ ] `terrain-layer`（5 色地形：山/水/田/城/荒）
- [ ] `region-layer`（行政区划边界）
- [ ] `route-layer`（道路与河流）
- [ ] `marker-layer`（城市/要塞/资源点）
- [ ] `player-layer`（玩家位置·红色脉冲点）
- [ ] `relation-layer`（玩家关系网·按关系类型着色）
- [ ] `event-layer`（当前 turn 事件点·按事件类型着色）

#### 铁律检查

- [ ] 源码文本 0 处调 `phase8-formal-map.js`
- [ ] 源码文本 0 处调 `TMPhase8FormalBridge.<method>(`（守卫 9 兼容）
- [ ] 渲染失败走 SVG 占位（`<div class="player-map-fallback">地图暂不可用</div>`）

#### 功能冒烟

- [ ] mock `GM.map.*` + `P.playerInfo` → 调 render(container) → container.innerHTML 含 `<svg`
- [ ] mock buildSvg 抛错 → 调 render → container.innerHTML 含「地图暂不可用」
- [ ] setState('fullscreen') → 重载（重新读 localStorage）→ getState() === 'fullscreen'

---

### M1.4 `web/tm-player-shell.js`（447 行）

#### 语法检查

- [ ] `node -c web/tm-player-shell.js` 0 错误
- [ ] 双路径挂载（`window.TM.PlayerShell` + `module.exports`）存在

#### SCENE_BLOCKS 8 tab

- [ ] `home`（居所·庭院）
- [ ] `court`（朝堂·殿宇）
- [ ] `social`（亲党·姻亲）
- [ ] `study`（问学·书卷）
- [ ] `tech`（格物·齿轮）
- [ ] `military`（军务·兵符）
- [ ] `fortune`（命格·算筹）
- [ ] `adversity`（厄难·风暴）

#### ROLE_STATS 15 行 × 8 列

- [ ] 14 角色 + custom = 15 行
- [ ] maid.tech === 'gray'
- [ ] infant.tech === 'gray'
- [ ] infant.court === 'off'（稚童不参与朝堂）
- [ ] monk.military === 'off'（僧道不带兵）
- [ ] rebel.court === 'off'（反贼不在朝堂）

#### 顶栏四段式

- [ ] `identity`（头像/姓名/身份徽章/所在地）
- [ ] `affiliation`（官职/阵营/家族/君主）
- [ ] `time`（年号/季节/年龄/在位年数）
- [ ] `stats`（按当前 tab 优先级动态精选 3-4）

#### _assertInvariants 8 条不变量

- [ ] 1. body.classList.contains('transmigration-mode') 必为 true
- [ ] 2. body.classList.contains('tm-phase8-formal') 必为 false（互斥）
- [ ] 3. playerRole 必非空且非 emperor
- [ ] 4. SCENE_BLOCKS 当前 tab 必在 scenesForRole(role) 返回集
- [ ] 5. TM.PlayerSystemsAdapter 必存在（软依赖·缺席走占位）
- [ ] 6. TM.PlayerMap 必存在（软依赖·缺席走占位）
- [ ] 7. TM.PlayerRail 必存在（软依赖·缺席走占位）
- [ ] 8. currentSceneKey 必在 SCENE_BLOCKS 中

#### 铁律检查

- [ ] 源码文本 0 处调 `renderEmperorState(`（守卫 9 兼容）
- [ ] 源码文本 0 处调 `TMPhase8FormalBridge.<method>(`（守卫 9 兼容）
- [ ] 源码文本 0 处直接调 `callLLM(` / `callAI(`（守卫 10 兼容·应走 TM.PlayerAIBridge.invoke）

#### 功能冒烟

- [ ] mock P/GM + body.classList 加 'transmigration-mode' → 调 refreshAll() → 不抛异常
- [ ] 调 switchTab('tech') → currentSceneKey === 'tech'
- [ ] 调 renderTopBar() → 输出含 identity/affiliation/time/stats 四段
- [ ] mock TM.PlayerSystemsAdapter 缺席 → 调 renderScene('home') → 主面板显示占位（不抛异常）

---

### M1.5 `web/tm-player-rail.js`（270 行）

#### 语法检查

- [ ] `node -c web/tm-player-rail.js` 0 错误
- [ ] 双路径挂载（`window.TM.PlayerRail` + `module.exports`）存在

#### SCENE_RAIL 9 槽

- [ ] `family`（家族·灯笼）
- [ ] `marriage`（婚姻·双鱼）
- [ ] `economy`（私产·元宝）
- [ ] `industry`（产业·厂坊）
- [ ] `memorial`（上奏·奏疏）
- [ ] `courtdebate`（朝议·殿议）
- [ ] `interaction`（关系·网罗）
- [ ] `movement`（移动·车马）
- [ ] `military`（军务·兵符·altKey=rebel）

#### RAIL_MATRIX v2（15 行 × 9 列）

- [ ] 14 角色 + custom = 15 行
- [ ] v2 放宽：minister.military === 'enabled'
- [ ] v2 放宽：regent.military === 'enabled'
- [ ] v2 放宽：eunuch.military === 'enabled'
- [ ] v2 放宽：custom.military === 'enabled'
- [ ] v2 放宽：commoner.military === 'enabled'
- [ ] consort.military === 'disabled'（后宫不带兵·未放宽）
- [ ] maid.military === 'disabled'
- [ ] infant.military === 'disabled'

#### drawer 懒创建 + 开新关旧

- [ ] openDrawer 懒创建到 document.body
- [ ] openDrawer 开新关旧（先 closeDrawer 旧 + appendChild 新）
- [ ] closeDrawer 移除 DOM 节点 + currentDrawer = null
- [ ] drawer body 调 TM.PlayerSystemsAdapter.renderBlock（复用场景区渲染入口）

#### 槽位状态

- [ ] getSlotState(railKey) 返回 `{ state, reddot, pulse }`
- [ ] `hidden` 槽不渲染
- [ ] `disabled` 槽灰显且点击无反应
- [ ] `enabled` 槽正常点击开 drawer

#### 铁律检查

- [ ] 源码文本 0 处调 `TMPhase8FormalBridge.<method>(`（守卫 9 兼容·不调 phase8-formal-rightrail）
- [ ] 源码文本 0 处直接调 `callLLM(` / `callAI(`（守卫 10 兼容）

#### 功能冒烟

- [ ] 调 openDrawer('family') → document.body 含 `.player-rail-drawer` 节点
- [ ] 调 openDrawer('marriage') → 旧 drawer 移除 + 新 drawer 挂载
- [ ] 调 closeDrawer() → document.body 不含 `.player-rail-drawer` 节点

---

### M1 整体验收

- [ ] M1.1-M1.5 全部 `[x]`
- [ ] 5 个文件 `node -c` 全 0 错误
- [ ] 5 个文件双路径挂载（window.TM + module.exports）全存在
- [ ] 5 个文件源码文本均 0 处违反守卫 9（不调 renderEmperorState / TMPhase8FormalBridge.*）
- [ ] 5 个文件源码文本均 0 处违反守卫 10（不直接调 callLLM/callAI）

**M1 状态**：⏳ → ✅

---

## M2 · 3 lint 守卫运行 PASS（lint-arch-all 10/10）

### M2.1 `web/scripts/lint-transmigration-isolation.js`（守卫 9）

#### 语法检查

- [ ] `node -c web/scripts/lint-transmigration-isolation.js` 0 错误

#### 扫描文件清单

- [ ] `tm-player-shell.js`
- [ ] `tm-player-rail.js`
- [ ] `tm-player-map.js`

#### 拦截模式

- [ ] `renderEmperorState\s*\(`（实际调用·含空白）
- [ ] `TMPhase8FormalBridge\.\w+\s*\(`
- [ ] `phase8FormalBridge\.\w+\s*\(`
- [ ] `TM\.Phase8FormalBridge\.\w+\s*\(`

#### 行内豁免

- [ ] `// arch-ok` 行尾标记的行跳过

#### 运行结果

- [ ] `node web/scripts/lint-transmigration-isolation.js` exit code 0
- [ ] 输出含 `PASS` 字样

### M2.2 `web/scripts/lint-ai-bridge-wrap.js`（守卫 10）

#### 语法检查

- [ ] `node -c web/scripts/lint-ai-bridge-wrap.js` 0 错误

#### 扫描文件清单

- [ ] `tm-player-shell.js`
- [ ] `tm-player-rail.js`
- [ ] `tm-player-map.js`
- [ ] `tm-player-systems-ui.js`
- [ ] `tm-player-systems-adapter.js`
- [ ] `tm-player-ui-render.js`

#### 拦截模式

- [ ] `callLLM\s*\(`
- [ ] `callAI\s*\(`

#### 例外

- [ ] `tm-player-ai-bridge.js` 不在扫描清单（包装器·允许调 callLLM/callAI）

#### 行内豁免

- [ ] `// arch-ok` 行尾标记的行跳过

#### 运行结果

- [ ] `node web/scripts/lint-ai-bridge-wrap.js` exit code 0
- [ ] 输出含 `PASS` 字样

### M2.3 `web/scripts/lint-arch-all.js`（伞形入口扩为 10 项）

#### 语法检查

- [ ] `node -c web/scripts/lint-arch-all.js` 0 错误

#### CHECKS 数组 10 项

- [ ] `lint-gm-writes`
- [ ] `lint-dep-graph`
- [ ] `lint-file-size`
- [ ] `lint-control-bytes`
- [ ] `lint-split-contracts`
- [ ] `lint-split-stamps`
- [ ] `lint-smoke-family-order`
- [ ] `lint-transmigration-isolation`（守卫 9·新增）
- [ ] `lint-ai-bridge-wrap`（守卫 10·新增）
- [ ] `ref-check`

#### 运行结果

- [ ] `node web/scripts/lint-arch-all.js` exit code 0
- [ ] 输出 10 行 `[lint-arch-all] PASS  <name>` 全 PASS
- [ ] 输出末行 `[lint-arch-all] PASS — 架构守卫全绿`

### M2 整体验收

- [ ] M2.1-M2.3 全部 `[x]`
- [ ] lint-arch-all 10/10 全绿

**M2 状态**：⏳ → ✅

---

## M3 · 5 现有文件修改完成 + 语法 OK

### M3.1 `web/tm-player-systems-ui.js`

#### 语法检查

- [ ] `node -c web/tm-player-systems-ui.js` 0 错误

#### 改动点

- [ ] ROLE_SCENES 加 `tech`（格物）条目
- [ ] renderTab 加 `case 'tech':` 分支，调 `TM.PlayerSystemsAdapter.renderBlock('PlayerTech', role, '格物')`
- [ ] renderBlock 委托给 `TM.PlayerSystemsAdapter.renderBlock`（adapter 缺席走旧 switch 兜底）
- [ ] scenesForRole(role) 加 tech 过滤（maid/infant 为 `gray`，其他 `on`）

#### 功能冒烟

- [ ] mock TM.PlayerSystemsAdapter.renderBlock → 调 TM.PlayerSystemsUI.renderBlock('PlayerFamily', 'minister') → mock 被调用
- [ ] 调 scenesForRole('maid') → 返回集含 tech 且 state === 'gray'

### M3.2 `web/tm-player-ui-render.js`

#### 语法检查

- [ ] `node -c web/tm-player-ui-render.js` 0 错误

#### 改动点

- [ ] `renderTopBar` 委托给 `TM.PlayerShell.renderTopBar()`（缺席走 legacyRenderTopBar 兜底）
- [ ] `renderLeftTabs` 委托给 `TM.PlayerShell.renderLeftTabs()`
- [ ] `render(sceneKey)` 委托给 `TM.PlayerShell.render(sceneKey)`
- [ ] `renderRightPanel` 委托给 `TM.PlayerShell.renderRightRail()`

#### 功能冒烟

- [ ] mock TM.PlayerShell.renderTopBar → 调 TM.PlayerUI.renderTopBar() → mock 被调用
- [ ] mock TM.PlayerShell 缺席 → 调 TM.PlayerUI.renderTopBar() → 走 legacy 兜底（不抛异常）

### M3.3 `web/tm-transmigration-ui.css`

#### 文件检查

- [ ] 文件存在且无 BOM/字节冻结问题（AGENTS.md 第六节铁律）
- [ ] 新增样式不破坏既有皇帝模式样式（CSS 通过 `body.transmigration-mode` 根类名空间隔离）

#### 改动点

- [ ] 8 tab 样式（`.player-shell-left-tabs` grid 8 列 + tech tab 灰显 `.player-tab-tech.gray`）
- [ ] 3×3 栅格样式（`.player-rail-grid` 3×3 + 槽位状态 + 红点 + 脉冲）
- [ ] drawer 样式（`.player-rail-drawer` 固定定位 + 进入动画）
- [ ] 地图样式（`.player-map-container` 三态高度 + 切换按钮 + fallback）
- [ ] AI 渲染样式（`.ai-loading` 骨架屏 + `.ai-fallback` 降级态 + `.ai-polluted` 污染态）

#### 功能冒烟

- [ ] 浏览器手动 playtest：进穿越模式 → 8 tab 显示正常 + 3×3 栅格显示正常 + drawer 弹出正常 + 地图三态切换正常 + AI 加载/降级/污染态显示正常

### M3.4 `web/tm-game-loop.js`

#### 语法检查

- [ ] `node -c web/tm-game-loop.js` 0 错误

#### 改动点

- [ ] `_showSituationOverview` 顶部加 `_isTrans` 判定
- [ ] `_isTrans === true` 时调 `_showPlayerSituationOverview()`（穿越专属概览）
- [ ] 「开始治国」按钮文案在穿越模式改为「开始穿越」
- [ ] 既有皇帝模式代码零改动

#### 功能冒烟

- [ ] mock P.playerInfo.transmigrationMode = true → 调 _showSituationOverview() → 走 _showPlayerSituationOverview 分支
- [ ] mock P.playerInfo.transmigrationMode = false → 调 _showSituationOverview() → 走既有皇帝模式分支
- [ ] 穿越模式按钮文案为「开始穿越」
- [ ] 皇帝模式按钮文案为「开始治国」

### M3.5 `web/index.html`

#### 文件检查

- [ ] 字节冻结合规（AGENTS.md 第六节·中文 .html 不强制 BOM·但行尾/编码不破坏）

#### 改动点

- [ ] 加 5 个新 `<script>` 标签，顺序：
  1. `tm-player-systems-adapter.js`
  2. `tm-player-ai-bridge.js`
  3. `tm-player-map.js`
  4. `tm-player-shell.js`
  5. `tm-player-rail.js`
- [ ] 5 个新 script 加载位置在 callLLM/callAI 定义之后（即 `tm-ai-infra.js` 一类既有 AI 基础设施之后）
- [ ] 5 个新 script 加载位置在既有 player 模块（`tm-player-core.js`/`tm-player-family.js` 等）之后

#### 功能冒烟

- [ ] 浏览器打开 index.html → 进穿越模式 → 控制台无 404 / 无「TM.PlayerShell is undefined」一类报错

### M3 整体验收

- [ ] M3.1-M3.5 全部 `[x]`
- [ ] 5 个文件 `node -c` 全 0 错误
- [ ] git diff 检查 5 个文件均有改动
- [ ] git diff 检查 `web/phase8-*.js` 0 行改动（皇帝御案 UI 零回归）

**M3 状态**：⏳ → ✅

---

## M4 · 8 smoke 文件全绿

### M4.1 `web/scripts/smoke-transmigration-shell.js`（新建）

#### 文件检查

- [ ] `node -c web/scripts/smoke-transmigration-shell.js` 0 错误
- [ ] 文件注册到 `ci-smokes.js` 的 smoke 清单

#### 断言项

- [ ] SCENE_BLOCKS 8 tab 全在
- [ ] ROLE_STATS 15 行 × 8 列
- [ ] maid.tech === 'gray' / infant.tech === 'gray'
- [ ] 顶栏四段式渲染（identity/affiliation/time/stats）
- [ ] _assertInvariants 8 条不变量
- [ ] 守卫 9 兼容（源码文本 0 处调 renderEmperorState / TMPhase8FormalBridge.*）

#### 运行结果

- [ ] `node web/scripts/smoke-transmigration-shell.js` exit code 0
- [ ] 输出 `PASS`

### M4.2 `web/scripts/smoke-transmigration-rail.js`（新建）

#### 文件检查

- [ ] `node -c web/scripts/smoke-transmigration-rail.js` 0 错误
- [ ] 文件注册到 `ci-smokes.js` 的 smoke 清单

#### 断言项

- [ ] SCENE_RAIL 9 槽
- [ ] RAIL_MATRIX 15 行 × 9 列
- [ ] v2 放宽（minister/regent/eunuch/custom/commoner 的 military === 'enabled'）
- [ ] openDrawer 开新关旧
- [ ] drawer body 复用 PlayerSystemsAdapter.renderBlock
- [ ] 守卫 9 兼容（源码文本 0 处调 TMPhase8FormalBridge.*）

#### 运行结果

- [ ] `node web/scripts/smoke-transmigration-rail.js` exit code 0
- [ ] 输出 `PASS`

### M4.3 `web/scripts/smoke-player-ai-bridge.js`（新建）

#### 文件检查

- [ ] `node -c web/scripts/smoke-player-ai-bridge.js` 0 错误
- [ ] 文件注册到 `ci-smokes.js` 的 smoke 清单

#### 断言项

- [ ] AI_SCENARIOS 18 条（L1×4 / L2×8 / L3×6）
- [ ] 降级链（callLLM 失败 → callAI → template）
- [ ] 缓存（同 opts 二次调不重复调 callLLM）
- [ ] schema 校验（L3 输出不符 schema → 降级）
- [ ] 朝代污染检查（输出含 SUSPECT 词 → 降级）
- [ ] 守卫 10 兼容（6 个穿越 UI 文件源码文本 0 处直接调 callLLM/callAI）

#### 运行结果

- [ ] `node web/scripts/smoke-player-ai-bridge.js` exit code 0
- [ ] 输出 `PASS`

### M4.4 `web/scripts/smoke-player-systems-adapter.js`（新建）

#### 文件检查

- [ ] `node -c web/scripts/smoke-player-systems-adapter.js` 0 错误
- [ ] 文件注册到 `ci-smokes.js` 的 smoke 清单

#### 断言项

- [ ] RENDER_ADAPTERS 15 个 systemKey 全覆盖
- [ ] 未知 systemKey 走占位
- [ ] fn 抛异常走 fallback
- [ ] 守卫 9 兼容（源码文本 0 处调 renderEmperorState）

#### 运行结果

- [ ] `node web/scripts/smoke-player-systems-adapter.js` exit code 0
- [ ] 输出 `PASS`

### M4.5 `web/scripts/smoke-player-map.js`（新建）

#### 文件检查

- [ ] `node -c web/scripts/smoke-player-map.js` 0 错误
- [ ] 文件注册到 `ci-smokes.js` 的 smoke 清单

#### 断言项

- [ ] 三态状态机（expanded/fullscreen/collapsed + fullscreen ✗ collapsed 不直接转移）
- [ ] localStorage 持久化
- [ ] SVG 占位（渲染失败走 fallback）
- [ ] 守卫 9 兼容（源码文本 0 处调 TMPhase8FormalBridge.* / phase8-formal-map）
- [ ] 7 图层结构（terrain/region/route/marker/player/relation/event）

#### 运行结果

- [ ] `node web/scripts/smoke-player-map.js` exit code 0
- [ ] 输出 `PASS`

### M4.6 `web/scripts/smoke-transmigration-e2e.js`（修改）

#### 文件检查

- [ ] `node -c web/scripts/smoke-transmigration-e2e.js` 0 错误

#### 新增断言项

- [ ] shell 集成（TM.PlayerShell 存在 + _assertInvariants 不抛错）
- [ ] rail 集成（render 后右栏 DOM 含 9 槽·隐藏槽除外）
- [ ] map 集成（render 后 container 含 SVG 或 fallback 占位）
- [ ] adapter 集成（renderBlock('PlayerFamily', 'minister', '家族') 返回非空）
- [ ] ai-bridge 集成（mock callLLM 返回有效输出 → invoke 返回非空）

#### 运行结果

- [ ] `node web/scripts/smoke-transmigration-e2e.js` exit code 0
- [ ] 输出 `PASS`

### M4.7 `web/scripts/smoke-transmigration-ui.js`（修改）

#### 文件检查

- [ ] `node -c web/scripts/smoke-transmigration-ui.js` 0 错误

#### 新增/修改断言项

- [ ] 8 tab 断言（既有 7 tab 扩为 8 tab·加 tech）
- [ ] tech tab 灰显断言（maid/infant.tech === 'gray'）
- [ ] renderBlock 委托 adapter 断言（mock adapter → 调 systems-ui.renderBlock → mock 被调用）

#### 运行结果

- [ ] `node web/scripts/smoke-transmigration-ui.js` exit code 0
- [ ] 输出 `PASS`

### M4.8 `web/scripts/smoke-transmigration-ui-phase-b.js`（修改）

#### 文件检查

- [ ] `node -c web/scripts/smoke-transmigration-ui-phase-b.js` 0 错误

#### 新增断言项

- [ ] drawer 断言（openDrawer('family') → document.body 含 `.player-rail-drawer`）
- [ ] AI 双轨断言（mock callLLM 失败 → invoke 降级到 template）
- [ ] 朝代污染检查断言（mock callLLM 返回含 SUSPECT → invoke 降级）
- [ ] 守卫 9 + 守卫 10 自动化跑通断言（spawnSync lint-arch-all.js → exit 0）

#### 运行结果

- [ ] `node web/scripts/smoke-transmigration-ui-phase-b.js` exit code 0
- [ ] 输出 `PASS`

### M4 整体验收

- [ ] M4.1-M4.8 全部 `[x]`
- [ ] 8 个 smoke 文件 `node -c` 全 0 错误
- [ ] 8 个 smoke 文件单独跑全 exit code 0
- [ ] 5 个新 smoke 文件注册到 `ci-smokes.js` 清单

**M4 状态**：⏳ → ✅

---

## M5 · ci-smokes 全量 0 FAIL + git commit + push + PR

### M5.1 全门禁验收

#### ci-smokes 全量

- [ ] `node web/scripts/ci-smokes.js` 全量 0 FAIL
- [ ] smoke 总数 = 既有 774 + 新增 5 = 779
- [ ] 输出末行含 `PASS` / `0 FAIL`

#### lint-arch-all 10/10

- [ ] `node web/scripts/lint-arch-all.js` 10/10 PASS
- [ ] 输出末行 `[lint-arch-all] PASS — 架构守卫全绿`

#### verify-official-scenario-parity

- [ ] `node web/scripts/verify-official-scenario-parity.js` PASS
- [ ] 官方剧本派生物对账无 stale

#### verify-release-contract

- [ ] `node scripts/verify-release-contract.js` PASS
- [ ] 跨管线契约 + 热更基线逐文件对齐无 diff

#### phase8-* 零改动

- [ ] `git diff --stat origin/main -- web/phase8-*.js` 输出为空
- [ ] 皇帝御案 UI 一行未改

### M5.2 git commit

#### 提交前检查

- [ ] `git status` 无未跟踪的敏感文件（.env / credentials 等）
- [ ] `git diff --stat` 改动文件清单与设计文档附录一致：
  - 5 个新核心实现文件（tm-player-systems-adapter/ai-bridge/map/shell/rail）
  - 3 个新 lint 守卫文件（lint-transmigration-isolation/ai-bridge-wrap + lint-arch-all 修改）
  - 5 个现有文件修改（tm-player-systems-ui/ui-render/transmigration-ui.css/game-loop/index.html）
  - 8 个 smoke 文件（5 新建 + 3 修改）
  - 3 个文档文件（design/tasks/checklist）
- [ ] changelog 邸报条目已写（顶条 module 须以版本号开头·AGENTS.md 第一节铁律）

#### 提交

- [ ] `git add` 上述清单（按文件名逐个 add·不用 `git add .`·AGENTS.md Git Safety Protocol）
- [ ] `git commit -m "feat(transmigration): UI 体系重建·shell+rail+map+adapter+ai-bridge 5 新建 + 守卫 9/10 + 8 smoke"`
- [ ] `git status` 验证 commit 成功

### M5.3 git push

- [ ] `git push -u origin feat/transmigration-shell-rebuild`
- [ ] push 成功（不 push 到 main/master·AGENTS.md Git Safety Protocol）
- [ ] 不 force push（NEVER `git push --force`）

### M5.4 开 PR

- [ ] PR 标题：`穿越模式 UI 体系重建·shell+rail+map+adapter+ai-bridge`
- [ ] PR 描述包含：
  - 5 个新核心实现文件清单
  - 3 个 lint 守卫（含 lint-arch-all 扩为 10 项）
  - 5 个现有文件修改
  - 8 个 smoke 文件
  - 3 个文档文件链接（design/tasks/checklist）
  - 全门禁结果：ci-smokes 779/779 + lint-arch-all 10/10 + phase8-* 0 改动
- [ ] PR 不主动 ship（AGENTS.md 〇最高铁律·发版只由仓主显式触发）

### M5.5 等 review · 仓主显式触发发版

- [ ] 等 review 通过
- [ ] 仓主显式触发发版（走 `scripts/release.js --prepare` + `--publish`，AGENTS.md 第一节铁律）
- [ ] 本任务止于 PR，不主动打包、不主动 push、不主动 ship

### M5 整体验收

- [ ] M5.1-M5.5 全部 `[x]`
- [ ] ci-smokes 779/779 + lint-arch-all 10/10 + phase8-* 0 改动
- [ ] PR 已开
- [ ] 不主动发版

**M5 状态**：⏳ → ✅

---

## 验收总览

| 里程碑 | 状态 | 关键产物 |
|--------|------|---------|
| M1 | ⏳ | 5 核心文件语法 OK + 功能冒烟通过 |
| M2 | ⏳ | lint-arch-all 10/10 PASS |
| M3 | ⏳ | 5 现有文件修改完成 + phase8-* 0 改动 |
| M4 | ⏳ | 8 smoke 文件全绿 |
| M5 | ⏳ | ci-smokes 779/779 + PR 已开 + 不主动发版 |

**整体验收**：M1-M5 全部 ✅ 即 PR 可交付 review。

---

## 阻塞与例外记录

> 若任一里程碑卡住，在此处记录阻塞原因 + 已尝试方案 + 待决事项。不跳过、不降级。

| 里程碑 | 阻塞项 | 已尝试 | 待决 |
|--------|--------|--------|------|
| M1 | — | — | — |
| M2 | — | — | — |
| M3 | — | — | — |
| M4 | — | — | — |
| M5 | — | — | — |

---

## 附录 · 验收命令速查

```bash
# M1·5 核心文件语法
node -c web/tm-player-systems-adapter.js
node -c web/tm-player-ai-bridge.js
node -c web/tm-player-map.js
node -c web/tm-player-shell.js
node -c web/tm-player-rail.js

# M2·lint 守卫
node web/scripts/lint-transmigration-isolation.js
node web/scripts/lint-ai-bridge-wrap.js
node web/scripts/lint-arch-all.js  # 期望 10/10 PASS

# M3·5 现有文件语法 + phase8-* 零改动
node -c web/tm-player-systems-ui.js
node -c web/tm-player-ui-render.js
node -c web/tm-game-loop.js
git diff --stat origin/main -- web/phase8-*.js  # 期望空输出

# M4·8 smoke 文件
node web/scripts/smoke-transmigration-shell.js
node web/scripts/smoke-transmigration-rail.js
node web/scripts/smoke-player-ai-bridge.js
node web/scripts/smoke-player-systems-adapter.js
node web/scripts/smoke-player-map.js
node web/scripts/smoke-transmigration-e2e.js
node web/scripts/smoke-transmigration-ui.js
node web/scripts/smoke-transmigration-ui-phase-b.js

# M5·全门禁
node web/scripts/ci-smokes.js                                  # 期望 779/779 · 0 FAIL
node web/scripts/lint-arch-all.js                              # 期望 10/10 PASS
node web/scripts/verify-official-scenario-parity.js            # 期望 PASS
node scripts/verify-release-contract.js                        # 期望 PASS

# M5·git
git status
git diff --stat
git add <逐文件>
git commit -m "feat(transmigration): UI 体系重建·shell+rail+map+adapter+ai-bridge 5 新建 + 守卫 9/10 + 8 smoke"
git push -u origin feat/transmigration-shell-rebuild
# 开 PR · 不主动 ship
```

---

## 验收铁律（再次强调）

1. **5 个里程碑必须顺序通过**——M1 卡住不进 M2，M2 卡住不进 M3，依此类推。
2. **任一勾选项未 `[x]` 即阻塞**——不跳过、不降级、不「先合 PR 后补」。
3. **phase8-* 零改动是硬约束**——`git diff --stat origin/main -- web/phase8-*.js` 必须空输出，否则 M3 不通过。
4. **不主动发版**——M5 止于 PR，发版由仓主显式触发（AGENTS.md 〇最高铁律）。
5. **守卫 9 + 守卫 10 是自动化铁律**——lint-arch-all 必须 10/10，不靠人眼盯「有没有偷偷调 renderEmperorState」。
