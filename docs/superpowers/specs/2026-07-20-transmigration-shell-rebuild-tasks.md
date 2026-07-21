# 穿越模式 UI 体系重建 · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为穿越模式重建一套自洽的 shell+rail+map+adapter+ai-bridge 体系，根治「PlayerFamily 无可用渲染入口」一类报错、补齐穿越专属大地图、补齐右栏 3×3 图标栅格、把 AI 调用全部收口到双轨桥，并加 2 条 lint 守卫把隔离铁律钉成自动化门禁。

**Architecture:** 三层分离（皇帝御案 UI / 穿越专属 UI / 数据逻辑层）；穿越专属 UI 内部 5 个新文件分工：`tm-player-shell.js`（主壳）+ `tm-player-rail.js`（右栏栅格）+ `tm-player-map.js`（大地图）+ `tm-player-systems-adapter.js`（渲染适配器）+ `tm-player-ai-bridge.js`（AI 双轨桥）；2 条 lint 守卫 + lint-arch-all 伞形入口扩为 10 项。

**Tech Stack:** 纯原生 JS（无构建系统·310 个顺序 `<script>` 串接 `window.*`）；JSDOM-like vm.createContext smoke；CSS 变量 + 类名空间隔离；项目 lint-arch-all 守卫 + `// arch-ok` 行内豁免。

**Spec：** [docs/superpowers/specs/2026-07-20-transmigration-shell-rebuild-design.md](file:///workspace/docs/superpowers/specs/2026-07-20-transmigration-shell-rebuild-design.md)

**Checklist：** [docs/superpowers/specs/2026-07-20-transmigration-shell-rebuild-checklist.md](file:///workspace/docs/superpowers/specs/2026-07-20-transmigration-shell-rebuild-checklist.md)

**5 阶段交付：** 阶段 1（5 核心文件）+ 阶段 2（3 lint 守卫）+ 阶段 3（5 现有文件修改）+ 阶段 4（8 smoke 文件）+ 阶段 5（全门禁验收 + PR）→ 单一 PR。

---

## 文件结构

### 新建 5 个核心实现文件

| 文件 | 行数 | 责任 |
|------|------|------|
| `web/tm-player-systems-adapter.js` | 140 | 15 个 systemKey 统一 renderBlock 入口·RENDER_ADAPTERS 覆盖 PlayerFamily/PlayerMarriage/PlayerEconomy/PlayerIndustry/PlayerTech/PlayerPrivateArmy/PlayerRebel/PlayerInteraction/PlayerMovement/PlayerMemorial/PlayerCourtDebate/PlayerOffice/PlayerSkill/PlayerFortune/PlayerAdversity |
| `web/tm-player-ai-bridge.js` | 474 | AI 双轨入口·18 应用点 + 降级链 + Map 缓存 + schema 校验 + 朝代污染检查 |
| `web/tm-player-map.js` | 299 | 穿越专属大地图·独立 SVG·三态折叠·localStorage 持久化 |
| `web/tm-player-shell.js` | 447 | shell 主壳·组合顶栏/左栏/主面板/右栏·SCENE_BLOCKS 8 tab·ROLE_STATS 15 行 |
| `web/tm-player-rail.js` | 270 | 右栏 3×3 图标栅格 + drawer·SCENE_RAIL 9 槽·RAIL_MATRIX v2 15×9 |

### 新建 3 个 lint 守卫文件

| 文件 | 守卫号 | 责任 |
|------|--------|------|
| `web/scripts/lint-transmigration-isolation.js` | 9 | 拦截 tm-player-shell/rail/map 中 renderEmperorState( / TMPhase8FormalBridge.<method>( 实际调用 |
| `web/scripts/lint-ai-bridge-wrap.js` | 10 | 拦截穿越 UI 文件中 callLLM( / callAI( 实际调用（例外：tm-player-ai-bridge.js） |
| `web/scripts/lint-arch-all.js`（修改） | — | CHECKS 数组从 8 项扩为 10 项 |

### 修改 5 个既有文件

| 文件 | 改动点 |
|------|--------|
| `web/tm-player-systems-ui.js` | 加 tech tab + renderBlock 委托给 TM.PlayerSystemsAdapter + ROLE_SCENES 加 tech |
| `web/tm-player-ui-render.js` | renderTopBar/renderLeftTabs/render/renderRightPanel 委托给 TM.PlayerShell |
| `web/tm-transmigration-ui.css` | 加 8 tab / 3×3 栅格 / drawer / 地图 / AI 渲染样式 |
| `web/tm-game-loop.js` | _showSituationOverview 加穿越模式守卫（不显示「开始治国」按钮·改为「开始穿越」） |
| `web/index.html` | 加 5 个新 script 标签（adapter/ai-bridge/map/shell/rail） |

### 新建/修改 8 个 smoke 文件

| 文件 | 类型 | 责任 |
|------|------|------|
| `web/scripts/smoke-transmigration-shell.js` | 新建 | TM.PlayerShell 8 tab / 顶栏四段式 / 不变量 |
| `web/scripts/smoke-transmigration-rail.js` | 新建 | TM.PlayerRail 9 槽 / RAIL_MATRIX v2 / drawer 开新关旧 |
| `web/scripts/smoke-player-ai-bridge.js` | 新建 | 降级链 / 缓存 / schema 校验 / 朝代污染检查 |
| `web/scripts/smoke-player-systems-adapter.js` | 新建 | 15 systemKey 全覆盖 / 异常 fallback / 未知系统占位 |
| `web/scripts/smoke-player-map.js` | 新建 | 三态折叠 / localStorage 持久化 / SVG 占位 |
| `web/scripts/smoke-transmigration-e2e.js` | 修改 | 加 shell+rail+map 集成断言 |
| `web/scripts/smoke-transmigration-ui.js` | 修改 | 加 8 tab + tech tab 灰显断言 |
| `web/scripts/smoke-transmigration-ui-phase-b.js` | 修改 | 加 drawer + AI 双轨断言 |

---

# 阶段 1 · 5 个核心实现文件（已完成）

## Task 1.1: tm-player-systems-adapter.js — 15 systemKey 统一 renderBlock 入口

**Files:**
- Create: `web/tm-player-systems-adapter.js`（140 行）

- [x] **Step 1: 定义 RENDER_ADAPTERS 覆盖 15 个 systemKey**

15 个 systemKey 与对应 PlayerXxx 模块：

1. PlayerFamily
2. PlayerMarriage
3. PlayerEconomy
4. PlayerIndustry
5. PlayerTech
6. PlayerPrivateArmy
7. PlayerRebel
8. PlayerInteraction
9. PlayerMovement
10. PlayerMemorial
11. PlayerCourtDebate
12. PlayerOffice
13. PlayerSkill
14. PlayerFortune
15. PlayerAdversity

每条结构：`{ fn: function(role, ctx){...}, fallback: function(role, ctx){...} }`

- [x] **Step 2: 实现 renderBlock 五步流程**

```
renderBlock(systemKey, role, blockTitle):
  1. 取 RENDER_ADAPTERS[systemKey]
  2. 未知 systemKey → 占位「未知系统 <systemKey>」
  3. try { return adapter.fn(role, ctx) }
  4. catch (e) { console.warn + return adapter.fallback(role, ctx) }
  5. fallback 是占位字符串，不是 renderEmperorState
```

- [x] **Step 3: 双路径挂载**

浏览器：`window.TM.PlayerSystemsAdapter = { renderBlock, RENDER_ADAPTERS }`
node smoke：`module.exports = { renderBlock, RENDER_ADAPTERS }`

## Task 1.2: tm-player-ai-bridge.js — AI 双轨入口 + 降级链 + 缓存 + schema 校验 + 朝代污染检查

**Files:**
- Create: `web/tm-player-ai-bridge.js`（474 行）

- [x] **Step 1: 定义 AI_SCENARIOS 18 条（L1×4 / L2×8 / L3×6）**

L1×4：family.daily / economy.daily / fortune.tick / adversity.tick
L2×8：marriage.propose / interaction.dialogue / memorial.draft / court.debate.opening / movement.travel.log / skill.practice.feedback / industry.inspect / tech.research.hint
L3×6：court.debate.speech / rebel.plan / privatearmy.deploy / marriage.negotiation / memorial.finalize / endturn.review

- [x] **Step 2: 实现降级链五步**

```
invoke(scenarioKey, opts):
  1. 查缓存（Map·key = scenarioKey + '|' + hash(opts)）→ 命中返回
  2. 调 callLLM（5s 超时）→ 成功且 schema 通过 → 缓存 + 返回
  3. callLLM 失败/超时 → 调 callAI（5s 超时）→ 成功且 schema 通过 → 缓存 + 返回
  4. callAI 失败/超时 → 用 opts.template（程序模板·L1 骨架）→ 返回
  5. 朝代污染检查 → 污染则降级到 opts.template
```

- [x] **Step 3: 实现 COMMON_DYNASTY_TERMS 白名单 + SUSPECT 黑名单**

- COMMON_DYNASTY_TERMS：朝代中立词（皇帝/君主/朝廷/州县/京师/...）
- SUSPECT：明清专名（锦衣卫/东厂/西厂/内行厂/万历/康熙/乾隆/...）
- `checkDynastyPollution(text)` 返回 `{ polluted, term }`

- [x] **Step 4: 实现 Map 缓存 + LRU 淘汰**

- key = `scenarioKey + '|' + djb2(JSON.stringify(opts))`
- 有效期：当前 turn（GM.turn 不变时复用）
- 上限：100 条（LRU 淘汰）

- [x] **Step 5: 实现 schema 校验**

L3 应用点必须带 schema：`{ field: { type, required, enum?, minItems?, maxItems?, maxLength? } }`
- JSON.parse 失败 → 降级
- schema 校验失败 → 降级

## Task 1.3: tm-player-map.js — 穿越专属大地图·独立 SVG·三态折叠

**Files:**
- Create: `web/tm-player-map.js`（299 行）

- [x] **Step 1: 实现三态状态机**

- expanded（45vh）/ fullscreen（90vh）/ collapsed（24vh）
- 转移：expanded ⇄ fullscreen / expanded ⇄ collapsed / fullscreen ✗ collapsed（不直接转移）
- 持久化 `localStorage.playerMapState`

- [x] **Step 2: 实现独立 SVG 渲染（7 图层）**

1. terrain-layer（5 色地形）
2. region-layer（行政区划边界）
3. route-layer（道路与河流）
4. marker-layer（城市/要塞/资源点）
5. player-layer（玩家位置·红色脉冲点）
6. relation-layer（玩家关系网·按关系类型着色）
7. event-layer（当前 turn 事件点·按事件类型着色）

**铁律**：绝不调 `phase8-formal-map.js` / `TMPhase8FormalBridge.renderMap`

- [x] **Step 3: 渲染失败走 SVG 占位**

```javascript
try { container.innerHTML = buildSvg(...); }
catch (e) { container.innerHTML = '<div class="player-map-fallback">地图暂不可用</div>'; }
```

## Task 1.4: tm-player-shell.js — shell 主壳·组合顶栏/左栏/主面板/右栏

**Files:**
- Create: `web/tm-player-shell.js`（447 行）

- [x] **Step 1: 定义 SCENE_BLOCKS 8 tab**

home/court/social/study/tech/military/fortune/adversity
每条 `{ key, label, icon, roleStats: { ... 14 角色 + custom } }`

- [x] **Step 2: 定义 ROLE_STATS 15 行 × 8 列**

值 `'on'` / `'off'` / `'gray'`，按 design §3.2 矩阵。
maid/infant 的 tech tab 设为 `gray`（历史依据）。

- [x] **Step 3: 实现顶栏四段式**

identity（头像/姓名/身份徽章/所在地）+ affiliation（官职/阵营/家族/君主）+ time（年号/季节/年龄/在位年数）+ stats（按当前 tab 优先级动态精选 3-4）

- [x] **Step 4: 实现 _assertInvariants 8 条不变量**

1. body.classList.contains('transmigration-mode') 必为 true
2. body.classList.contains('tm-phase8-formal') 必为 false（互斥）
3. playerRole 必非空且非 emperor
4. SCENE_BLOCKS 当前 tab 必在 scenesForRole(role) 返回集
5. TM.PlayerSystemsAdapter 必存在（软依赖·缺席走占位）
6. TM.PlayerMap 必存在（软依赖·缺席走占位）
7. TM.PlayerRail 必存在（软依赖·缺席走占位）
8. currentSceneKey 必在 SCENE_BLOCKS 中

- [x] **Step 5: 实现 refreshAll / switchTab / renderScene / retry**

- `refreshAll()`：重渲染顶栏 + 左栏 + 主面板 + 右栏
- `switchTab(sceneKey)`：切 tab + 重渲染主面板 + 刷新顶栏 stats 段
- `renderScene(sceneKey)`：按场景渲染主面板（调 PlayerSystemsAdapter.renderBlock + PlayerMap.render）
- `retry()`：渲染失败后重试

## Task 1.5: tm-player-rail.js — 右栏 3×3 图标栅格 + drawer

**Files:**
- Create: `web/tm-player-rail.js`（270 行）

- [x] **Step 1: 定义 SCENE_RAIL 9 槽**

family/marriage/economy/industry/memorial/courtdebate/interaction/movement/military（altKey=rebel）

- [x] **Step 2: 定义 RAIL_MATRIX v2（15 行 × 9 列）**

值 `'enabled'` / `'disabled'` / `'hidden'`，按 design §6.2 矩阵。
v2 放宽点：槽 8 military 对 minister/regent/eunuch/custom/commoner 从 v1 的 disabled 改为 enabled（历史依据：design §6.3）。

- [x] **Step 3: 实现 openDrawer 懒创建 + 开新关旧**

```javascript
function openDrawer(railKey) {
  if (currentDrawer) closeDrawer();  // 关旧
  var drawer = createDrawer(railKey);
  document.body.appendChild(drawer);
  currentDrawer = drawer;
}
```

- [x] **Step 4: drawer body 复用 TM.PlayerSystemsAdapter.renderBlock**

与场景区渲染入口一致，保持穿越铁律（不调 phase8-formal-rightrail）。

- [x] **Step 5: 实现 getSlotState / clearReddot / notifyRail**

- `getSlotState(railKey)` 返回 `{ state, reddot, pulse }`
- `clearReddot(railKey)` 清红点
- `notifyRail(railKey, opts)` 触发红点/脉冲

---

# 阶段 2 · 3 个 lint 守卫（已完成）

## Task 2.1: lint-transmigration-isolation.js — 守卫 9·穿越隔离

**Files:**
- Create: `web/scripts/lint-transmigration-isolation.js`

- [x] **Step 1: 扫描文件清单**

`tm-player-shell.js` / `tm-player-rail.js` / `tm-player-map.js`

- [x] **Step 2: 拦截模式（正则·实际调用·含空白）**

- `renderEmperorState\s*\(`
- `TMPhase8FormalBridge\.\w+\s*\(`
- `phase8FormalBridge\.\w+\s*\(`
- `TM\.Phase8FormalBridge\.\w+\s*\(`

- [x] **Step 3: 行内豁免 `// arch-ok`**

行尾标记 `// arch-ok` 的行跳过。

- [x] **Step 4: 命中即报错（文件名 + 行号 + 匹配文本）+ process.exit(1)**

## Task 2.2: lint-ai-bridge-wrap.js — 守卫 10·AI 包装

**Files:**
- Create: `web/scripts/lint-ai-bridge-wrap.js`

- [x] **Step 1: 扫描文件清单**

`tm-player-shell.js` / `tm-player-rail.js` / `tm-player-map.js` / `tm-player-systems-ui.js` / `tm-player-systems-adapter.js` / `tm-player-ui-render.js`

- [x] **Step 2: 拦截模式（正则）**

- `callLLM\s*\(`
- `callAI\s*\(`

- [x] **Step 3: 例外 `tm-player-ai-bridge.js`**

包装器本身允许调 callLLM/callAI（不在扫描清单中）。

- [x] **Step 4: 行内豁免 `// arch-ok` + 命中即报错 + process.exit(1)**

## Task 2.3: lint-arch-all.js — 伞形入口扩为 10 项

**Files:**
- Modify: `web/scripts/lint-arch-all.js`

- [x] **Step 1: CHECKS 数组从 8 项扩为 10 项**

在 `lint-smoke-family-order` 与 `ref-check` 之间插入：
- `{ name: 'lint-transmigration-isolation', file: 'lint-transmigration-isolation.js' }`
- `{ name: 'lint-ai-bridge-wrap', file: 'lint-ai-bridge-wrap.js' }`

- [x] **Step 2: 跑 `node web/scripts/lint-arch-all.js` 输出 10/10 全绿**

输出末行：`[lint-arch-all] PASS — 架构守卫全绿`（或既有 `FAIL — N/10 项未过`）

---

# 阶段 3 · 5 个现有文件修改

## Task 3.1: tm-player-systems-ui.js — 加 tech tab + 委托 adapter

**Files:**
- Modify: `web/tm-player-systems-ui.js`

- [ ] **Step 1: ROLE_SCENES 加 tech**

在 ROLE_SCENES（或既有 7 tab 结构）中加入 `tech`（格物）条目，与 design §3.1 一致。

- [ ] **Step 2: renderTab 加 tech case**

`renderTab(sceneKey, role)` switch 加 `case 'tech':` 分支，调 `TM.PlayerSystemsAdapter.renderBlock('PlayerTech', role, '格物')`。

- [ ] **Step 3: renderBlock 委托给 TM.PlayerSystemsAdapter**

```javascript
function renderBlock(systemKey, role) {
  if (typeof TM !== 'undefined' && TM.PlayerSystemsAdapter) {
    return TM.PlayerSystemsAdapter.renderBlock(systemKey, role);
  }
  // 旧 switch 路径作为兜底（不删除，作为 adapter 缺席时的 fallback）
  return legacyRenderBlock(systemKey, role);
}
```

- [ ] **Step 4: scenesForRole(role) 加 tech 过滤**

按 ROLE_STATS（design §3.2）过滤 maid/infant 的 tech 为 `gray`、其他角色 `on`。

## Task 3.2: tm-player-ui-render.js — 委托给 TM.PlayerShell

**Files:**
- Modify: `web/tm-player-ui-render.js`

- [ ] **Step 1: renderTopBar 委托**

```javascript
TM.PlayerUI.renderTopBar = function() {
  if (TM.PlayerShell) return TM.PlayerShell.renderTopBar();
  return legacyRenderTopBar();  // 兜底
};
```

- [ ] **Step 2: renderLeftTabs 委托**

```javascript
TM.PlayerUI.renderLeftTabs = function() {
  if (TM.PlayerShell) return TM.PlayerShell.renderLeftTabs();
  return legacyRenderLeftTabs();
};
```

- [ ] **Step 3: render(sceneKey) 委托**

```javascript
TM.PlayerUI.render = function(sceneKey) {
  if (TM.PlayerShell) return TM.PlayerShell.render(sceneKey);
  return legacyRender(sceneKey);
};
```

- [ ] **Step 4: renderRightPanel 委托**

```javascript
TM.PlayerUI.renderRightPanel = function() {
  if (TM.PlayerShell) return TM.PlayerShell.renderRightRail();
  return legacyRenderRightPanel();
};
```

## Task 3.3: tm-transmigration-ui.css — 加 8 tab / 3×3 栅格 / drawer / 地图 / AI 样式

**Files:**
- Modify: `web/tm-transmigration-ui.css`

- [ ] **Step 1: 8 tab 样式**

`.transmigration-mode .player-shell-left-tabs` 加 8 tab 网格布局（grid 8 列 / 自适应宽度）。
tech tab 灰显：`.player-tab-tech.gray { opacity: 0.5; cursor: not-allowed; }`

- [ ] **Step 2: 3×3 栅格样式**

`.transmigration-mode .player-rail-grid` 3×3 grid 布局，每槽 60×60px 图标。
槽位状态：`.slot-enabled` / `.slot-disabled`（灰显）/ `.slot-hidden`（display:none）。
红点：`.slot-reddot::after` 红色圆点；脉冲：`.slot-pulse` 动画。

- [ ] **Step 3: drawer 样式**

`.player-rail-drawer` 固定定位（右下角），280px 宽，max-height 70vh，overflow-y auto。
drawer 头部 + body + 底部三段式。
drawer 进入动画：`transform: translateX(100%) → translateX(0)` 200ms ease。

- [ ] **Step 4: 地图样式**

`.player-map-container` 三态高度：
- `.state-expanded { height: 45vh; }`
- `.state-fullscreen { height: 90vh; }`
- `.state-collapsed { height: 24vh; }`

切换按钮右上角绝对定位。
`.player-map-fallback` 居中占位文案。

- [ ] **Step 5: AI 渲染样式**

`.ai-loading` 加载态（骨架屏·脉冲动画）。
`.ai-fallback` 降级态（淡灰色边框 + 「程序骨架」标签）。
`.ai-polluted` 污染态（黄色边框 + 「朝代污染·已降级」标签）。

## Task 3.4: tm-game-loop.js — _showSituationOverview 加穿越模式守卫

**Files:**
- Modify: `web/tm-game-loop.js`

- [ ] **Step 1: 在 _showSituationOverview 顶部加穿越模式判定**

```javascript
function _showSituationOverview() {
  var _pi = (typeof P !== 'undefined' && P && P.playerInfo) ? P.playerInfo : null;
  var _isTrans = _pi && _pi.transmigrationMode === true && _pi.playerRole && _pi.playerRole !== 'emperor';
  if (_isTrans) return _showPlayerSituationOverview();  // 穿越模式走专属概览
  // 既有皇帝模式概览代码不动
  ...
}
```

- [ ] **Step 2: 新增 _showPlayerSituationOverview 占位**

```javascript
function _showPlayerSituationOverview() {
  // 穿越模式概览：显示「开始穿越」按钮（不是「开始治国」）
  // 调 TM.PlayerShell.refreshAll()
  ...
}
```

- [ ] **Step 3: 把「开始治国」按钮文案在穿越模式改为「开始穿越」**

既有「开始治国」按钮的渲染分支加 `if (_isTrans) btnText = '开始穿越'; else btnText = '开始治国';`

## Task 3.5: index.html — 加 5 个新 script 标签

**Files:**
- Modify: `web/index.html`

- [ ] **Step 1: 在既有 player script 块后追加 5 个新 script**

加载顺序（依赖前置）：
1. `tm-player-systems-adapter.js`（无依赖）
2. `tm-player-ai-bridge.js`（无依赖·但需要 callLLM/callAI 全局可用）
3. `tm-player-map.js`（软依赖 PlayerSystemsAdapter）
4. `tm-player-shell.js`（软依赖 PlayerSystemsAdapter/PlayerMap/PlayerRail）
5. `tm-player-rail.js`（软依赖 PlayerSystemsAdapter）

注：shell 与 rail 互不依赖（rail 是 shell 的右栏子组件，但通过软依赖 + 占位解耦），顺序按上述。

- [ ] **Step 2: 验证 5 个 script 加载顺序在 callLLM/callAI 定义之后**

callLLM/callAI 来自 `tm-ai-infra.js` 一类既有模块，5 个新 script 应在所有 AI 基础设施之后加载。

---

# 阶段 4 · 8 个 smoke 文件

## Task 4.1: smoke-transmigration-shell.js（新建）

**Files:**
- Create: `web/scripts/smoke-transmigration-shell.js`

- [ ] **Step 1: 断言 SCENE_BLOCKS 8 tab 全在**

```javascript
assert(SCENE_BLOCKS.length === 8, 'SCENE_BLOCKS 必须 8 tab');
['home','court','social','study','tech','military','fortune','adversity'].forEach(function(k){
  assert(SCENE_BLOCKS.find(s => s.key === k), '缺 tab: ' + k);
});
```

- [ ] **Step 2: 断言 ROLE_STATS 15 行 × 8 列**

```javascript
assert(Object.keys(ROLE_STATS).length === 15, 'ROLE_STATS 必须 15 行（14 角色 + custom）');
```

- [ ] **Step 3: 断言 maid/infant 的 tech 为 gray**

```javascript
assert(ROLE_STATS.maid.tech === 'gray', 'maid.tech 必须 gray');
assert(ROLE_STATS.infant.tech === 'gray', 'infant.tech 必须 gray');
```

- [ ] **Step 4: 断言顶栏四段式渲染**

mock P/GM → 调 renderTopBar() → 断言输出含 identity/affiliation/time/stats 四段。

- [ ] **Step 5: 断言 _assertInvariants 8 条**

构造违反场景（如 body.classList 不含 transmigration-mode）→ 断言 _assertInvariants 抛错。

- [ ] **Step 6: 断言守卫 9（不调 renderEmperorState / TMPhase8FormalBridge.*）**

读 tm-player-shell.js 源码文本，正则匹配 `renderEmperorState\s*\(` 应为 0 命中（或仅 `// arch-ok` 行内豁免）。

## Task 4.2: smoke-transmigration-rail.js（新建）

**Files:**
- Create: `web/scripts/smoke-transmigration-rail.js`

- [ ] **Step 1: 断言 SCENE_RAIL 9 槽**

```javascript
assert(SCENE_RAIL.length === 9, 'SCENE_RAIL 必须 9 槽');
['family','marriage','economy','industry','memorial','courtdebate','interaction','movement','military'].forEach(function(k){
  assert(SCENE_RAIL.find(s => s.key === k), '缺槽: ' + k);
});
```

- [ ] **Step 2: 断言 RAIL_MATRIX 15 行 × 9 列**

```javascript
assert(Object.keys(RAIL_MATRIX).length === 15, 'RAIL_MATRIX 必须 15 行');
```

- [ ] **Step 3: 断言 v2 放宽（槽 8 military 对 minister/regent/eunuch/custom/commoner = enabled）**

```javascript
['minister','regent','eunuch','custom','commoner'].forEach(function(role){
  assert(RAIL_MATRIX[role].military === 'enabled', role + '.military 必须 enabled (v2 放宽)');
});
```

- [ ] **Step 4: 断言 openDrawer 开新关旧**

```javascript
openDrawer('family');
assert(currentDrawer !== null, 'openDrawer 后 currentDrawer 应非空');
openDrawer('marriage');  // 开新
assert(currentDrawer !== null, '二次 openDrawer 后 currentDrawer 应仍非空（新 drawer）');
closeDrawer();
assert(currentDrawer === null, 'closeDrawer 后 currentDrawer 应为空');
```

- [ ] **Step 5: 断言 drawer body 复用 PlayerSystemsAdapter.renderBlock**

mock PlayerSystemsAdapter.renderBlock → 调 openDrawer → 断言 mock 被调用。

- [ ] **Step 6: 断言守卫 9（不调 phase8-formal-rightrail）**

读源码文本，正则匹配 `TMPhase8FormalBridge\.\w+\s*\(` 应为 0 命中。

## Task 4.3: smoke-player-ai-bridge.js（新建）

**Files:**
- Create: `web/scripts/smoke-player-ai-bridge.js`

- [ ] **Step 1: 断言 AI_SCENARIOS 18 条（L1×4 / L2×8 / L3×6）**

```javascript
var l1 = Object.keys(AI_SCENARIOS).filter(k => AI_SCENARIOS[k].level === 'L1');
var l2 = Object.keys(AI_SCENARIOS).filter(k => AI_SCENARIOS[k].level === 'L2');
var l3 = Object.keys(AI_SCENARIOS).filter(k => AI_SCENARIOS[k].level === 'L3');
assert(l1.length === 4, 'L1 必须 4 条');
assert(l2.length === 8, 'L2 必须 8 条');
assert(l3.length === 6, 'L3 必须 6 条');
```

- [ ] **Step 2: 断言降级链（callLLM 失败 → callAI → template）**

mock callLLM 抛错 + mock callAI 抛错 → 调 invoke → 断言返回 opts.template 结果。

- [ ] **Step 3: 断言缓存（同 opts 二次调不重复调 callLLM）**

mock callLLM 计数 → 调 invoke 两次（同 opts）→ 断言 callLLM 仅被调 1 次。

- [ ] **Step 4: 断言 schema 校验（L3 输出不符 schema → 降级）**

mock callLLM 返回 `{ stance: 'invalid' }`（不在 enum）→ 调 invoke('court.debate.speech') → 断言降级到 template。

- [ ] **Step 5: 断言朝代污染检查（输出含 SUSPECT 词 → 降级）**

mock callLLM 返回含「锦衣卫」→ 调 invoke → 断言降级到 template + 控制台 warning。

- [ ] **Step 6: 断言守卫 10（穿越 UI 文件 0 处直接调 callLLM/callAI）**

读 6 个穿越 UI 文件源码文本，正则匹配 `callLLM\s*\(` / `callAI\s*\(` 应为 0 命中（或仅 `// arch-ok` 豁免）。

## Task 4.4: smoke-player-systems-adapter.js（新建）

**Files:**
- Create: `web/scripts/smoke-player-systems-adapter.js`

- [ ] **Step 1: 断言 RENDER_ADAPTERS 15 个 systemKey 全覆盖**

```javascript
var expected = ['PlayerFamily','PlayerMarriage','PlayerEconomy','PlayerIndustry','PlayerTech','PlayerPrivateArmy','PlayerRebel','PlayerInteraction','PlayerMovement','PlayerMemorial','PlayerCourtDebate','PlayerOffice','PlayerSkill','PlayerFortune','PlayerAdversity'];
expected.forEach(function(k){
  assert(RENDER_ADAPTERS[k], 'RENDER_ADAPTERS 缺: ' + k);
  assert(typeof RENDER_ADAPTERS[k].fn === 'function', k + '.fn 必须函数');
  assert(typeof RENDER_ADAPTERS[k].fallback === 'function', k + '.fallback 必须函数');
});
```

- [ ] **Step 2: 断言未知 systemKey 走占位**

```javascript
var html = renderBlock('PlayerUnknown', 'minister', 'test');
assert(html.indexOf('未知系统') !== -1, '未知 systemKey 应走占位');
```

- [ ] **Step 3: 断言 fn 抛异常走 fallback**

mock adapter.fn 抛 Error → 调 renderBlock → 断言返回 fallback 结果 + 不抛异常。

- [ ] **Step 4: 断言不调 renderEmperorState（守卫 9 兼容）**

读源码文本，正则匹配 `renderEmperorState\s*\(` 应为 0 命中。

## Task 4.5: smoke-player-map.js（新建）

**Files:**
- Create: `web/scripts/smoke-player-map.js`

- [ ] **Step 1: 断言三态状态机**

```javascript
setState('expanded');
assert(getState() === 'expanded');
setState('fullscreen');
assert(getState() === 'fullscreen');
setState('collapsed');
assert(getState() === 'collapsed');
// fullscreen ✗ collapsed 不直接转移
setState('fullscreen');
setState('collapsed');  // 应自动经 expanded 或拒绝
assert(getState() !== 'fullscreen', 'fullscreen 不能直接切 collapsed');
```

- [ ] **Step 2: 断言 localStorage 持久化**

mock localStorage → setState('fullscreen') → 重载（重新读 localStorage）→ 断言 getState() === 'fullscreen'。

- [ ] **Step 3: 断言 SVG 占位（渲染失败走 fallback）**

mock buildSvg 抛错 → 调 render(container) → 断言 container.innerHTML 含「地图暂不可用」。

- [ ] **Step 4: 断言不调 phase8-formal-map（守卫 9 兼容）**

读源码文本，正则匹配 `TMPhase8FormalBridge\.\w+\s*\(` / `phase8FormalMap` 应为 0 命中。

- [ ] **Step 5: 断言 7 图层结构**

调 render → 解析 SVG → 断言含 7 个 `<g class="*-layer">` 节点。

## Task 4.6: smoke-transmigration-e2e.js（修改）

**Files:**
- Modify: `web/scripts/smoke-transmigration-e2e.js`

- [ ] **Step 1: 加 shell 集成断言**

在既有 e2e 流程中，进穿越模式后断言 `TM.PlayerShell` 存在 + `TM.PlayerShell._assertInvariants()` 不抛错。

- [ ] **Step 2: 加 rail 集成断言**

断言 `TM.PlayerRail.render()` 后右栏 DOM 含 9 槽（隐藏槽除外）。

- [ ] **Step 3: 加 map 集成断言**

断言 `TM.PlayerMap.render(container)` 后 container 含 SVG 或 fallback 占位。

- [ ] **Step 4: 加 adapter 集成断言**

断言调 `TM.PlayerSystemsAdapter.renderBlock('PlayerFamily', 'minister', '家族')` 返回非空字符串。

- [ ] **Step 5: 加 ai-bridge 集成断言**

mock callLLM 返回有效输出 → 调 `TM.PlayerAIBridge.invoke('family.daily', {...})` → 断言返回非空。

## Task 4.7: smoke-transmigration-ui.js（修改）

**Files:**
- Modify: `web/scripts/smoke-transmigration-ui.js`

- [ ] **Step 1: 加 8 tab 断言**

既有 7 tab 断言扩为 8 tab（加 tech）。

- [ ] **Step 2: 加 tech tab 灰显断言（maid/infant）**

```javascript
assert(scenesForRole('maid').find(s => s.key === 'tech').state === 'gray', 'maid.tech 必须 gray');
assert(scenesForRole('infant').find(s => s.key === 'tech').state === 'gray', 'infant.tech 必须 gray');
```

- [ ] **Step 3: 加 renderBlock 委托 adapter 断言**

mock TM.PlayerSystemsAdapter.renderBlock → 调 TM.PlayerSystemsUI.renderBlock('PlayerFamily', 'minister') → 断言 mock 被调用。

## Task 4.8: smoke-transmigration-ui-phase-b.js（修改）

**Files:**
- Modify: `web/scripts/smoke-transmigration-ui-phase-b.js`

- [ ] **Step 1: 加 drawer 断言**

调 TM.PlayerRail.openDrawer('family') → 断言 document.body 含 `.player-rail-drawer` 节点。

- [ ] **Step 2: 加 AI 双轨断言**

mock callLLM 失败 → 调 TM.PlayerAIBridge.invoke → 断言降级到 template。

- [ ] **Step 3: 加朝代污染检查断言**

mock callLLM 返回含 SUSPECT 词 → 调 invoke → 断言降级。

- [ ] **Step 4: 加守卫 9 + 守卫 10 自动化跑通断言**

调用 `require('child_process').spawnSync(process.execPath, ['web/scripts/lint-arch-all.js'])` → 断言 exit code 0。

---

# 阶段 5 · 全门禁验收 + PR

## Task 5.1: 全门禁验收

**Files:** 无（仅跑命令）

- [ ] **Step 1: node web/scripts/ci-smokes.js 全量 0 FAIL**

```bash
node web/scripts/ci-smokes.js
# 期望：现 774 smoke + 新增 5 smoke = 779 smoke 全绿
```

- [ ] **Step 2: node web/scripts/lint-arch-all.js 10/10 PASS**

```bash
node web/scripts/lint-arch-all.js
# 期望：[lint-arch-all] PASS — 架构守卫全绿
#       10/10 项 PASS（含 lint-transmigration-isolation + lint-ai-bridge-wrap）
```

- [ ] **Step 3: node web/scripts/verify-official-scenario-parity.js PASS**

```bash
node web/scripts/verify-official-scenario-parity.js
# 官方剧本派生物对账（与本次重建无关·但全门禁要求）
```

- [ ] **Step 4: node scripts/verify-release-contract.js PASS**

```bash
node scripts/verify-release-contract.js
# 跨管线契约 + 热更基线逐文件对齐
```

- [ ] **Step 5: git diff 检查 phase8-* 文件 0 行变化**

```bash
git diff --stat origin/main -- web/phase8-*.js
# 期望：空输出（皇帝御案 UI 零改动）
```

## Task 5.2: git commit + push + PR

**Files:** 无

- [ ] **Step 1: git add 所有改动文件**

5 个新核心实现文件 + 3 个新 lint 守卫文件 + lint-arch-all.js 修改 + 5 个现有文件修改 + 8 个 smoke 文件新建/修改。

- [ ] **Step 2: 写 changelog 邸报条目（顶条 module 须以版本号开头）**

在 changelog.json 顶部加一条：
```
<下一版本号>·穿越模式 UI 体系重建·shell/rail/map/adapter/ai-bridge 5 新建 + 守卫 9/10 + 8 smoke
```

- [ ] **Step 3: git commit**

```bash
git commit -m "feat(transmigration): UI 体系重建·shell+rail+map+adapter+ai-bridge 5 新建 + 守卫 9/10 + 8 smoke"
```

- [ ] **Step 4: git push 到短命分支**

```bash
git push -u origin feat/transmigration-shell-rebuild
```

- [ ] **Step 5: 开 PR**

PR 标题：`穿越模式 UI 体系重建·shell+rail+map+adapter+ai-bridge`
PR 描述：
- 5 个新核心实现文件
- 3 个 lint 守卫（含 lint-arch-all 扩为 10 项）
- 5 个现有文件修改
- 8 个 smoke 文件
- 设计文档：docs/superpowers/specs/2026-07-20-transmigration-shell-rebuild-design.md
- 任务清单：docs/superpowers/specs/2026-07-20-transmigration-shell-rebuild-tasks.md
- 验收清单：docs/superpowers/specs/2026-07-20-transmigration-shell-rebuild-checklist.md
- 全门禁：ci-smokes 779/779 + lint-arch-all 10/10 + phase8-* 0 改动

- [ ] **Step 6: 等 review · 仓主显式触发发版**

> **AGENTS.md 铁律**：发版只由仓主显式触发，合进 main ≠ 发版。本任务止于 PR，不主动 ship。

---

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 守卫 9/10 误伤既有合法代码 | 行内豁免 `// arch-ok`；先在分支跑 lint-arch-all 看误伤点，逐一加豁免或重构 |
| RAIL_MATRIX v2 放宽引发平衡性问题 | smoke 仅断言矩阵值，平衡性由后续 playtest 调整；本 PR 不动业务逻辑 |
| AI 双轨降级链在 LLM 真实可用时不被测到 | smoke 用 mock 强制 callLLM 失败，覆盖降级路径；L1 骨架必跑 |
| 大地图 SVG 在 JSDOM-like vm 中渲染不完整 | smoke 只断言 SVG 节点存在 + fallback 占位，不断言像素；浏览器实际渲染靠手动 playtest |
| 8 个 smoke 文件加进来后 ci-smokes 总数变化 | 既有 774 → 779（+5 新建），3 个修改不增数；Task 5.1 Step 1 期望数同步更新 |
| changelog 邸报条目版本号写错 | 走 `scripts/release.js --prepare --version <版本>` 一把盖 6 处，不手搓（AGENTS.md 第二节铁律） |

---

## 完成标准

- 5 个新核心实现文件语法 OK + 功能冒烟通过（M1）
- 3 个 lint 守卫运行 PASS，lint-arch-all 10/10（M2）
- 5 个现有文件修改完成 + 语法 OK（M3）
- 8 个 smoke 文件全绿（M4）
- ci-smokes 全量 0 FAIL + git commit + push + PR（M5）

详见 [验收清单](file:///workspace/docs/superpowers/specs/2026-07-20-transmigration-shell-rebuild-checklist.md)。
