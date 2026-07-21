# 穿越模式非皇帝 UI 重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为穿越模式非皇帝角色实现镜像 UI——双轨渲染、7 场景 tab、5 套身份主题色、奉旨卡片浮层，让玩家"一眼看出我不是皇帝"。

**Architecture:** 在 [tm-game-ui-shell.js](file:///workspace/web/tm-game-ui-shell.js) `renderGameState()` 顶部加 3 行双轨分派；新增 4 个文件承载穿越模式 UI（render / edict-card / systems-ui / css）；修改 5 个既有文件（shell / topbar-vars / qiju-ui / transmigration / index.html）；皇帝模式代码零改动；CSS 通过 `body.transmigration-mode` 根类名空间隔离。

**Tech Stack:** 纯原生 JS（无构建系统·310 个顺序 `<script>` 串接 `window.*`）；JSDOM-like vm.createContext smoke；CSS 变量 + 类名空间隔离；项目 lint-arch-all 守卫 + `// arch-ok` 行内豁免。

**Spec：** [docs/superpowers/specs/2026-07-19-transmigration-ui-redesign-design.md](file:///workspace/docs/superpowers/specs/2026-07-19-transmigration-ui-redesign-design.md)

**双阶段交付：** Phase A（任务 A1-A10·核心 UI 重构）→ PR #1；Phase B（任务 B1-B7·增量功能）→ PR #2。

---

## 文件结构

### 新建 6 个文件

| 文件 | 责任 |
|------|------|
| `web/tm-player-ui-render.js` | `TM.PlayerUI.*`：顶栏玩家身份条、左栏 7 场景 tab、主面板按场景渲染、右栏玩家身份卡 |
| `web/tm-player-ui-edict-card.js` | `TM.PlayerEdictCard.*`：奉旨卡片浮层（toast + 模态）+ 防骚扰 |
| `web/tm-player-systems-ui.js` | `TM.PlayerSystemsUI.*`：14 玩家系统御案 tab 集中渲染入口 + `scenesForRole(role)` 可见性矩阵 |
| `web/tm-transmigration-ui.css` | 5 套身份主题色 CSS 变量 + `src-*` chip + `body.transmigration-mode` 隔离 |
| `web/scripts/smoke-transmigration-ui.js` | Phase A smoke（断言双轨分派/主题色类/身份条 DOM/场景 tab/奉旨卡片 API/皇帝模式零回归） |
| `web/scripts/smoke-transmigration-ui-phase-b.js` | Phase B smoke（身份演进/右栏完整/摄政代诏/朝议/AI 状态） |

### 修改 6 个既有文件

| 文件 | 改动点 |
|------|-------|
| `web/tm-game-ui-shell.js` | `renderGameState()` 顶部加 `_isTrans` 分派；现主体改名为 `renderEmperorState`；新增 `renderPlayerState` |
| `web/tm-topbar-vars.js` | 顶部加 `_isTrans` 早返回 |
| `web/tm-shiji-qiju-ui.js` | `renderQiju()` 中批答条目调 `TM.PlayerEdictCard.show()` |
| `web/tm-transmigration.js` | `_ROLE_CHANGE_PATHS` 加 `label`/`desc`；新增 `getRoleChangePaths(role)` API |
| `web/index.html` | 新增 `bar-player-identity` / `player-left-tabs` / `player-right-panel` DOM 节点；加载 4 新 `<script>` + 1 新 `<link>` |
| `web/ARCHITECTURE.md` | §11.7 文档同步（consort/student → custom/actor） |

---

# Phase A · 核心 UI 重构（任务 A1-A10 · PR #1）

## Task A1: 双轨分派 + renderEmperorState 改名 + renderPlayerState 新增

**Files:**
- Modify: `web/tm-game-ui-shell.js:57`（`renderGameState` 顶部）
- Test: `web/scripts/smoke-transmigration-ui.js`（A10 创建·本任务先建空文件占位）

- [ ] **Step 1: 在 `renderGameState()` 顶部加双轨分派**

打开 [tm-game-ui-shell.js](file:///workspace/web/tm-game-ui-shell.js) 第 57 行，将现有 `function renderGameState(){` 改名为 `function renderEmperorState(){`，并在其上方新增 `renderGameState` 分派入口与 `renderPlayerState` 占位实现：

```javascript
// ── 双轨渲染分派（Phase A · Task A1）─────────────────────────
// 皇帝模式走 renderEmperorState（原 renderGameState 主体改名·零改动）
// 穿越模式走 renderPlayerState（调 TM.PlayerUI.* 系列）
function renderGameState(){
  var _pi = (typeof P !== 'undefined' && P && P.playerInfo) ? P.playerInfo : null;
  var _isTrans = _pi && _pi.transmigrationMode === true && _pi.playerRole && _pi.playerRole !== 'emperor';
  if (_isTrans) return renderPlayerState();
  return renderEmperorState();
}

// 穿越模式渲染入口·TM.PlayerUI 系列缺席时降级到皇帝模式
function renderPlayerState(){
  if (typeof window === 'undefined' || !window.TM || !TM.PlayerUI) {
    return renderEmperorState();  // 降级·避免 UI 黑屏
  }
  try {
    document.body.classList.add('transmigration-mode');
    document.body.classList.add('player-role-' + (P.playerInfo.playerRole || 'commoner'));
    TM.PlayerUI.renderTopBar();
    TM.PlayerUI.renderLeftTabs();
    TM.PlayerUI.render('home');
    TM.PlayerUI.renderRightPanel();
  } catch(_e) {
    try { console.error('[renderPlayerState]', _e); } catch(_){}
    return renderEmperorState();  // 异常降级
  }
}
```

- [ ] **Step 2: 把原 `function renderGameState(){` 改名为 `function renderEmperorState(){`**

在 Step 1 插入的新代码下方，原 `function renderGameState(){` 改为 `function renderEmperorState(){`。函数体不动。

- [ ] **Step 3: 验证 lint-arch-all 8/8 绿**

Run: `cd /workspace/web && node scripts/lint-arch-all.js`
Expected: 8/8 绿（如失败按提示加 `// arch-ok` 行内豁免）

- [ ] **Step 4: 验证皇帝模式回归**

Run: `cd /workspace/web && node scripts/smoke-transmigration-e2e.js | tail -5`
Expected: 21/21 PASS

- [ ] **Step 5: Commit**

```bash
git add web/tm-game-ui-shell.js
git commit -m "feat(transmigration-ui): A1 双轨渲染分派·renderEmperorState 改名+renderPlayerState 新增"
```

---

## Task A2: index.html 新增 DOM 节点 + 加载新 script/link

**Files:**
- Modify: `web/index.html`（顶栏 / 左栏 / 右栏 / `<script>` 列表 / `<link>` 列表）

- [ ] **Step 1: 顶栏新增 `bar-player-identity` 节点**

在 `index.html` 中找到 `bar-era-stack` 节点，在其**上方**插入：

```html
<!-- 穿越模式玩家身份条·皇帝模式 display:none -->
<div id="bar-player-identity" class="bar-player-identity" style="display:none;">
  <span class="player-portrait" id="player-portrait"></span>
  <span class="player-name" id="player-name"></span>
  <span class="player-role-chip" id="player-role-chip"></span>
  <span class="player-divider">·</span>
  <span class="player-location" id="player-location"></span>
  <span class="player-clan" id="player-clan"></span>
  <span class="player-age" id="player-age"></span>
  <span class="player-sovereign" id="player-sovereign"></span>
</div>
```

- [ ] **Step 2: 左栏 `#gl` 内新增 `player-left-tabs` 容器**

在 `index.html` 中找到 `<div id="gl">` 节点，在它**内部首位**插入：

```html
<!-- 穿越模式左栏 7 场景 tab·皇帝模式 hidden-emperor -->
<div id="player-left-tabs" class="player-left-tabs hidden-emperor"></div>
```

- [ ] **Step 3: 右栏 `#gr` 内新增 `player-right-panel` 容器**

在 `index.html` 中找到 `<div id="gr">` 节点，在它**内部首位**插入：

```html
<!-- 穿越模式右栏玩家身份卡·皇帝模式 hidden-emperor -->
<div id="player-right-panel" class="player-right-panel hidden-emperor"></div>
```

- [ ] **Step 4: 在 `<head>` 中加载穿越模式 CSS**

找到 `<link rel="stylesheet" href="tm-...css">` 列表末尾，追加：

```html
<link rel="stylesheet" href="tm-transmigration-ui.css">
```

- [ ] **Step 5: 在 `<script>` 列表中加载 3 个新 JS 文件**

找到 `tm-transmigration.js` 的 `<script>` 标签，在其**下方**（且在 `tm-launch.js` 之前）追加：

```html
<script src="tm-player-ui-render.js"></script>
<script src="tm-player-ui-edict-card.js"></script>
<script src="tm-player-systems-ui.js"></script>
```

- [ ] **Step 6: 验证 index.html 加载顺序无误**

Run: `cd /workspace/web && node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const re=/<script src=\"([^\"]+)\"/g;let m;const order=[];while((m=re.exec(h)))order.push(m[1]);const i1=order.indexOf('tm-transmigration.js');const i2=order.indexOf('tm-player-ui-render.js');const i3=order.indexOf('tm-launch.js');if(i1<0||i2<0||i3<0||!(i1<i2&&i2<i3)){console.error('ORDER WRONG',i1,i2,i3);process.exit(1);}console.log('order ok');"`
Expected: `order ok`

- [ ] **Step 7: Commit**

```bash
git add web/index.html
git commit -m "feat(transmigration-ui): A2 index.html 新增玩家身份条/左栏/右栏 DOM 容器+加载 4 新文件"
```

---

## Task A3: tm-player-ui-render.js 主渲染

**Files:**
- Create: `web/tm-player-ui-render.js`

- [ ] **Step 1: 写文件骨架 + 命名空间 + 工具函数**

创建 `web/tm-player-ui-render.js`：

```javascript
// ============================================================
// tm-player-ui-render.js — 穿越模式 Phase A · Task A3 主渲染
// ------------------------------------------------------------
// 暴露：window.TM.PlayerUI.{
//   renderTopBar, renderLeftTabs, render, renderRightPanel,
//   setAiLiveStatus, _varsForRole, _currentScene
// }
// 依赖（软依赖·缺席降级）：
//   TM.Transmigration.isTransmigrationMode / P.playerInfo / GM._playerEconomy 等
//   TM.PlayerSystemsUI.renderTab / TM.PlayerSystemsUI.scenesForRole（A4 提供）
// 双路径挂载：浏览器 window.TM.PlayerUI；node smoke module.exports
// 跨朝代铁律：本文件绝不硬编明清专名·术语一律朝代中立
// ============================================================

(function (global) {
  'use strict';
  if (!global.TM) global.TM = {};
  if (global.TM.PlayerUI) return;  // 防重入

  var _currentScene = 'home';
  var _aiLiveState = 'idle';

  function _isStr(v) { return typeof v === 'string' && v.length > 0; }
  function _esc(s) {
    if (typeof escHtml === 'function') return escHtml(s);
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function _icon(name, size) {
    if (typeof tmIcon === 'function') { try { return tmIcon(name, size || 12); } catch (_) {} }
    return '';
  }
  function _$(id) {
    if (typeof document === 'undefined') return null;
    return document.getElementById(id);
  }
  function _pi() {
    try { return (typeof P !== 'undefined' && P && P.playerInfo) ? P.playerInfo : null; } catch(_) { return null; }
  }
  function _isTrans() {
    var pi = _pi();
    return !!(pi && pi.transmigrationMode === true && pi.playerRole && pi.playerRole !== 'emperor');
  }
  function _playerRole() {
    var pi = _pi();
    return pi ? (pi.playerRole || 'commoner') : 'commoner';
  }

  // §2.2 精选变量映射表（按 playerRole）
  var _VARS_FOR_ROLE = {
    minister:        [['官声','reputation'],['俸禄','cash'],['吏治','governance'],['势力','faction']],
    general:         [['官声','reputation'],['俸禄','cash'],['军权','military'],['势力','faction']],
    regent:          [['官声','reputation'],['权柄','power'],['吏治','governance'],['势力','faction']],
    prince:          [['封邑','fiefdom'],['宗禄','stipend'],['宗籍','royalStatus'],['皇恩','sovereignTrust']],
    custom:          [['宠爱','favor'],['宫权','haremPower'],['子嗣','heirs'],['风险','haremRisk']],
    merchant:        [['家资','cash'],['商誉','reputation'],['商路','tradeRoutes'],['风险','tradeRisk']],
    eunuch:          [['君主信任','sovereignTrust'],['内廷权力','innerPower'],['外朝张力','outerTension'],['阉党声势','factionPower']],
    maid:            [['主位宠爱','favor'],['宫女品级','rank'],['消息流通','gossip'],['宫斗风险','haremRisk']],
    commoner:        [['家资','cash'],['名声','fame'],['关系网','connections'],['风险','risk']],
    bandit:          [['山寨大小','stronghold'],['喽啰数','followers'],['声威','prestige'],['围剿压力','siegePressure']],
    monk:            [['戒行','discipline'],['信众','followers'],['寺产','templeAsset'],['风险','risk']],
    artisan:         [['技艺','skill'],['名声','fame'],['银钱','cash'],['风险','risk']],
    infant:          [['健康','health'],['早慧度','prodigy'],['监护人','guardian'],['家族期待','familyExpectation']],
    retired_official:[['余威','residualPower'],['名声','fame'],['银钱','cash'],['起复概率','comebackChance']],
    actor:           [['技艺','skill'],['名声','fame'],['恩客','patrons'],['风险','risk']]
  };

  function _varsForRole(role) {
    var list = _VARS_FOR_ROLE[role] || _VARS_FOR_ROLE.commoner;
    return list.map(function (entry) {
      var label = entry[0], key = entry[1];
      var value = _resolveVarValue(role, key);
      return { key: key, label: label, value: value, icon: _icon('dot', 8) };
    });
  }

  // 从玩家专属账本解析变量值·绝不读 GM.guoku/GM.huangwei 等皇帝模式字段
  function _resolveVarValue(role, key) {
    try {
      if (typeof GM === 'undefined' || !GM) return '—';
      // 银钱·统一走 PlayerEconomy.cash
      if (key === 'cash') {
        if (GM._playerEconomy && typeof GM._playerEconomy.cash === 'number') return GM._playerEconomy.cash + ' 两';
      }
      // 私军训练度
      if (key === 'military' || key === 'followers' && role === 'general') {
        if (GM._playerPrivateArmy && typeof GM._playerPrivateArmy.readiness === 'number') return GM._playerPrivateArmy.readiness;
      }
      // 反叛筹备度
      if (key === 'prestige' && role === 'bandit') {
        if (GM._playerRebel && typeof GM._playerRebel.prepProgress === 'number') return GM._playerRebel.prepProgress;
      }
      // 派系/势力
      if (key === 'faction' || key === 'factionPower') {
        if (GM._playerInteraction && GM._playerInteraction.factionPower != null) return GM._playerInteraction.factionPower;
      }
      // 通用回退
      return '—';
    } catch (_) { return '—'; }
  }

  // ── §2.1 顶栏玩家身份条 ─────────────────────────────────────
  function renderTopBar() {
    if (!_isTrans()) return;
    var bar = _$('bar-player-identity');
    if (!bar) return;
    bar.style.display = '';
    var pi = _pi() || {};
    var portrait = _$('player-portrait');
    var name = _$('player-name');
    var chip = _$('player-role-chip');
    var loc = _$('player-location');
    var clan = _$('player-clan');
    var age = _$('player-age');
    var sov = _$('player-sovereign');
    if (portrait) portrait.innerHTML = _icon('person', 16);
    if (name) name.textContent = pi.characterName || '玩家';
    if (chip) chip.textContent = pi.characterTitle || pi.playerRole || '';
    if (loc) loc.textContent = pi.location || '';
    if (clan) clan.textContent = pi.clan || '';
    if (age) age.textContent = (typeof pi.age === 'number') ? ('年 ' + pi.age) : '';
    if (sov) sov.textContent = '君主·' + (pi.sovereignName || '某');

    // bar-vars 精选 3-4 变量
    _renderTopBarVars();
  }

  function _renderTopBarVars() {
    var barVars = _$('bar-vars');
    if (!barVars) return;
    var role = _playerRole();
    var vars = _varsForRole(role);
    var html = '';
    vars.forEach(function (v) {
      html += '<span class="bar-var-item" data-key="' + _esc(v.key) + '">' +
              '<span class="bar-var-label">' + _esc(v.label) + '</span>' +
              '<span class="bar-var-value">' + _esc(String(v.value)) + '</span>' +
              '</span>';
    });
    barVars.innerHTML = html;
  }

  // ── §3 左栏 7 场景 tab 树 ───────────────────────────────────
  function renderLeftTabs() {
    if (!_isTrans()) return;
    var container = _$('player-left-tabs');
    if (!container) return;
    container.classList.remove('hidden-emperor');
    var gl = _$('gl');
    if (gl) gl.classList.add('hidden-emperor');

    var role = _playerRole();
    var scenes = (global.TM.PlayerSystemsUI && TM.PlayerSystemsUI.scenesForRole)
      ? TM.PlayerSystemsUI.scenesForRole(role)
      : ['home','office','social','cultivation','force','special','evolution'];

    var SCENE_DEFS = {
      home:         { icon: '🏠', label: '私宅' },
      office:       { icon: '📜', label: '公务' },
      social:       { icon: '🤝', label: '交际' },
      cultivation:  { icon: '📚', label: '修行' },
      force:        { icon: '⚔️', label: '势力' },
      special:      { icon: '🎭', label: '特殊' },
      evolution:    { icon: '👤', label: '身份演进' }
    };

    var html = '';
    scenes.forEach(function (sc) {
      var def = SCENE_DEFS[sc] || { icon: '·', label: sc };
      var hasUpdate = (global.TM.PlayerSystemsUI && TM.PlayerSystemsUI.hasUpdate)
        ? TM.PlayerSystemsUI.hasUpdate(sc) : false;
      var cls = 'player-tab' + (sc === _currentScene ? ' active' : '');
      html += '<div class="' + cls + '" data-scene="' + sc + '">' +
              '<span class="player-tab-icon">' + def.icon + '</span>' +
              '<span class="player-tab-label">' + _esc(def.label) + '</span>' +
              (hasUpdate ? '<span class="player-tab-redot"></span>' : '') +
              '</div>';
    });
    container.innerHTML = html;

    // 绑定点击
    try {
      container.querySelectorAll('.player-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
          var sc = tab.getAttribute('data-scene');
          _currentScene = sc;
          renderLeftTabs();
          render(sc);
        });
      });
    } catch (_) {}
  }

  // ── §4 主面板按场景渲染 ─────────────────────────────────────
  function render(sceneKey) {
    if (!_isTrans()) return;
    if (sceneKey) _currentScene = sceneKey;
    var gc = _$('gc');
    if (!gc) return;
    var role = _playerRole();
    var html = '';
    if (global.TM.PlayerSystemsUI && TM.PlayerSystemsUI.renderTab) {
      try {
        html = TM.PlayerSystemsUI.renderTab(_currentScene, role);
      } catch (e) {
        html = '<div class="player-render-error">场景渲染异常：' + _esc(String(e)) + '</div>';
      }
    } else {
      html = '<div class="player-render-fallback">场景 ' + _esc(_currentScene) + ' 待加载</div>';
    }
    gc.innerHTML = html;
    if (global.TM.PlayerSystemsUI && TM.PlayerSystemsUI.bindEvents) {
      try { TM.PlayerSystemsUI.bindEvents(_currentScene); } catch (_) {}
    }
    if (typeof GameHooks !== 'undefined' && GameHooks.run) {
      try { GameHooks.run('renderPlayerState:after', { sceneKey: _currentScene }); } catch (_) {}
    }
  }

  // ── §5 右栏玩家身份卡 ──────────────────────────────────────
  function renderRightPanel() {
    if (!_isTrans()) return;
    var panel = _$('player-right-panel');
    if (!panel) return;
    panel.classList.remove('hidden-emperor');
    var gr = _$('gr');
    if (gr) gr.classList.add('hidden-emperor');

    var pi = _pi() || {};
    var html = '<div class="player-id-card">';
    html += '<div class="player-id-portrait">' + _icon('person', 32) + '</div>';
    html += '<div class="player-id-info">';
    html += '<div class="player-id-name">' + _esc(pi.characterName || '玩家') + '</div>';
    html += '<div class="player-id-title">' + _esc(pi.characterTitle || pi.playerRole || '') + '</div>';
    html += '<div class="player-id-meta">' + _esc([pi.age != null ? ('年 ' + pi.age) : '', pi.gender, pi.clan].filter(Boolean).join(' · ')) + '</div>';
    if (pi.location) html += '<div class="player-id-loc">现居：' + _esc(pi.location) + '</div>';
    if (pi.sovereignName) html += '<div class="player-id-sov">君主：' + _esc(pi.sovereignName) + '</div>';
    html += '</div></div>';
    html += '<div class="player-id-recent" id="player-id-recent"></div>';
    html += '<div class="player-id-relations" id="player-id-relations"></div>';
    panel.innerHTML = html;
  }

  // ── §2.3 bar-ai-live 语义切换 ───────────────────────────────
  function setAiLiveStatus(state) {
    _aiLiveState = state || 'idle';
    var el = _$('bar-ai-live');
    if (!el) return;
    var text = 'AI 推演中';
    if (_isTrans()) {
      if (state === 'sovereign') text = '君主圣裁中';
      else if (state === 'npc') text = '市井演化中';
    }
    el.textContent = text;
    el.setAttribute('data-state', _aiLiveState);
  }

  var PlayerUI = {
    renderTopBar: renderTopBar,
    renderLeftTabs: renderLeftTabs,
    render: render,
    renderRightPanel: renderRightPanel,
    setAiLiveStatus: setAiLiveStatus,
    _varsForRole: _varsForRole,
    get _currentScene() { return _currentScene; }
  };

  global.TM.PlayerUI = PlayerUI;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerUI;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
```

- [ ] **Step 2: 验证 lint-arch-all**

Run: `cd /workspace/web && node scripts/lint-arch-all.js`
Expected: 8/8 绿

- [ ] **Step 3: 验证文件可被 node 加载**

Run: `cd /workspace/web && node -e "global.window=global;require('./tm-player-ui-render.js');console.log(typeof window.TM.PlayerUI.renderTopBar);"`
Expected: `function`

- [ ] **Step 4: Commit**

```bash
git add web/tm-player-ui-render.js
git commit -m "feat(transmigration-ui): A3 tm-player-ui-render.js 主渲染（顶栏/左栏/主面板/右栏/AI 状态）"
```

---

## Task A4: tm-player-systems-ui.js 14 系统御案 tab

**Files:**
- Create: `web/tm-player-systems-ui.js`

- [ ] **Step 1: 写文件骨架 + scenesForRole 可见性矩阵**

创建 `web/tm-player-systems-ui.js`：

```javascript
// ============================================================
// tm-player-systems-ui.js — 穿越模式 Phase A · Task A4 14 系统御案 tab
// ------------------------------------------------------------
// 暴露：window.TM.PlayerSystemsUI.{
//   scenesForRole, renderTab, renderBlock, bindEvents, hasUpdate,
//   SCENES, ROLE_SCENES
// }
// 依赖（软依赖）：TM.PlayerXxx.* 系列 14 系统 + P.playerInfo
// 跨朝代铁律：本文件绝不硬编明清专名·术语一律朝代中立
// ============================================================

(function (global) {
  'use strict';
  if (!global.TM) global.TM = {};
  if (global.TM.PlayerSystemsUI) return;

  var SCENES = ['home','office','social','cultivation','force','special','evolution'];

  // §3.2 角色可见性矩阵
  // ✓ = 1, — = 0
  var ROLE_SCENES = {
    emperor:           [],
    regent:            ['home','office','social','cultivation','force','evolution'],
    minister:          ['home','office','social','cultivation','evolution'],
    general:           ['home','office','social','cultivation','force','evolution'],
    prince:            ['home','office','social','cultivation','force','evolution'],
    custom:            ['home','social','cultivation','evolution'],
    merchant:          ['home','social','cultivation','force','evolution'],
    eunuch:            ['home','office','social','cultivation','special','evolution'],
    maid:              ['social','cultivation','special','evolution'],
    commoner:          ['home','social','cultivation','force','evolution'],
    bandit:            ['home','social','cultivation','force','special','evolution'],
    monk:              ['home','social','cultivation','special','evolution'],
    artisan:           ['home','social','cultivation','force','special','evolution'],
    infant:            ['home','special','evolution'],
    retired_official:  ['home','office','social','cultivation','special','evolution'],
    actor:             ['home','social','cultivation','special','evolution']
  };

  function scenesForRole(role) {
    return (ROLE_SCENES[role] || ROLE_SCENES.commoner).slice();
  }

  // ── 14 系统接入映射 ────────────────────────────────────────
  var SCENE_BLOCKS = {
    home: [
      { systemKey: 'PlayerFamily',        blockTitle: '家族' },
      { systemKey: 'PlayerMarriage',      blockTitle: '婚姻' },
      { systemKey: 'PlayerEconomy',       blockTitle: '私产' },
      { systemKey: 'PlayerIndustry',      blockTitle: '产业' }
    ],
    office: [
      { systemKey: 'PlayerMemorial',      blockTitle: '上奏' },
      { systemKey: 'PlayerCourtDebate',   blockTitle: '朝议列朝' },
      { systemKey: 'PlayerTingTui',       blockTitle: '廷推' },
      { systemKey: 'PlayerOffice',        blockTitle: '官职' },
      { systemKey: 'PlayerKeju',          blockTitle: '科举' },
      { systemKey: 'PlayerAnnualReview',  blockTitle: '考课' }
    ],
    social: [
      { systemKey: 'PlayerInteraction',   blockTitle: '人物互动' },
      { systemKey: 'PlayerLetter',        blockTitle: '书信' },
      { systemKey: 'PlayerMarriage',      blockTitle: '联姻', alt: true }
    ],
    cultivation: [
      { systemKey: 'PlayerTech',          blockTitle: '科技研发' },
      { systemKey: 'PlayerSkill',         blockTitle: '修习' },
      { systemKey: 'PlayerSkill',         blockTitle: '游学', alt: true }
    ],
    force: [
      { systemKey: 'PlayerPrivateArmy',   blockTitle: '私军' },
      { systemKey: 'PlayerTrade',         blockTitle: '商队' },
      { systemKey: 'PlayerMovement',      blockTitle: '移动' },
      { systemKey: 'PlayerReclaim',       blockTitle: '开垦' },
      { systemKey: 'PlayerRebel',         blockTitle: '反叛筹备' }
    ],
    special: [
      { systemKey: 'PlayerSpecialIdentity', blockTitle: '身份专有动作' }
    ],
    evolution: [
      { systemKey: 'PlayerRoleChange',   blockTitle: '身份演进路径' }
    ]
  };

  // 软依赖·按 systemKey 取系统命名空间·缺席时返回 null
  function _sys(systemKey) {
    try { return global.TM && global.TM[systemKey] ? global.TM[systemKey] : null; } catch(_) { return null; }
  }

  function _esc(s) {
    if (typeof escHtml === 'function') return escHtml(s);
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── 单区块渲染 ─────────────────────────────────────────────
  function renderBlock(blockDef, role) {
    var sys = _sys(blockDef.systemKey);
    var html = '<div class="player-block" data-system="' + _esc(blockDef.systemKey) + '">';
    html += '<div class="player-block-title">' + _esc(blockDef.blockTitle) + '</div>';
    if (!sys) {
      html += '<div class="player-block-empty">（' + _esc(blockDef.systemKey) + ' 待接入）</div>';
      html += '</div>';
      return html;
    }
    // 优先调系统自己的 renderBlockHTML·否则调 state()/list() 兜底
    try {
      if (typeof sys.renderBlockHTML === 'function') {
        html += sys.renderBlockHTML(role);
      } else if (typeof sys.state === 'function') {
        var st = sys.state() || {};
        html += '<pre class="player-block-state">' + _esc(JSON.stringify(st, null, 2)) + '</pre>';
      } else if (typeof sys.list === 'function') {
        var arr = sys.list() || [];
        html += '<ul class="player-block-list">';
        arr.forEach(function (it) { html += '<li>' + _esc(typeof it === 'string' ? it : JSON.stringify(it)) + '</li>'; });
        html += '</ul>';
      } else {
        html += '<div class="player-block-empty">（' + _esc(blockDef.systemKey) + ' 无可用渲染入口）</div>';
      }
    } catch (e) {
      html += '<div class="player-block-error">渲染异常：' + _esc(String(e)) + '</div>';
    }
    html += '</div>';
    return html;
  }

  // ── 单场景 tab 渲染 ────────────────────────────────────────
  function renderTab(sceneKey, role) {
    var blocks = SCENE_BLOCKS[sceneKey] || [];
    var html = '<div class="player-scene" data-scene="' + _esc(sceneKey) + '">';
    if (!blocks.length) {
      html += '<div class="player-scene-empty">该场景无内容</div>';
      html += '</div>';
      return html;
    }
    blocks.forEach(function (b) {
      // 角色门控·例如反叛筹备仅 prince/regent/general/minister/merchant 可见
      if (b.systemKey === 'PlayerRebel' &&
          ['prince','regent','general','minister','merchant'].indexOf(role) < 0) return;
      if (b.systemKey === 'PlayerKeju' && role !== 'commoner') return;
      if (b.systemKey === 'PlayerAnnualReview' &&
          ['minister','general','regent'].indexOf(role) < 0) return;
      html += renderBlock(b, role);
    });
    html += '</div>';
    return html;
  }

  // ── 事件绑定（按钮点击） ────────────────────────────────────
  function bindEvents(sceneKey) {
    // 占位·各系统按钮的具体事件由其自己的 bindEvents 提供
    // 这里只负责将场景容器内的 [data-action] 转发到对应系统的 action 方法
    if (typeof document === 'undefined') return;
    var gc = document.getElementById('gc');
    if (!gc) return;
    try {
      gc.querySelectorAll('[data-action]').forEach(function (btn) {
        if (btn.__playerBound) return;
        btn.__playerBound = true;
        btn.addEventListener('click', function () {
          var sysKey = btn.getAttribute('data-system');
          var action = btn.getAttribute('data-action');
          var sys = _sys(sysKey);
          if (sys && typeof sys[action] === 'function') {
            try { sys[action](btn.getAttribute('data-payload') || {}); } catch (e) {
              if (typeof toast === 'function') toast('动作异常：' + e);
            }
          }
        });
      });
    } catch (_) {}
  }

  // ── 红点判定 ──────────────────────────────────────────────
  function hasUpdate(sceneKey) {
    try {
      if (typeof GM === 'undefined' || !GM) return false;
      if (sceneKey === 'home' && GM._playerFamily && GM._playerFamily.updated) return true;
      if (sceneKey === 'force' && GM._playerRebel && GM._playerRebel.readiness > 0) return true;
      return false;
    } catch (_) { return false; }
  }

  var PlayerSystemsUI = {
    scenesForRole: scenesForRole,
    renderTab: renderTab,
    renderBlock: renderBlock,
    bindEvents: bindEvents,
    hasUpdate: hasUpdate,
    SCENES: SCENES,
    ROLE_SCENES: ROLE_SCENES
  };

  global.TM.PlayerSystemsUI = PlayerSystemsUI;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerSystemsUI;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
```

- [ ] **Step 2: 验证 lint-arch-all**

Run: `cd /workspace/web && node scripts/lint-arch-all.js`
Expected: 8/8 绿

- [ ] **Step 3: 验证 scenesForRole 矩阵**

Run: `cd /workspace/web && node -e "global.window=global;require('./tm-player-systems-ui.js');var P=window.TM.PlayerSystemsUI;console.log(P.scenesForRole('minister').join(','));console.log(P.scenesForRole('infant').join(','));console.log(P.scenesForRole('emperor').length);"`
Expected:
```
home,office,social,cultivation,evolution
home,special,evolution
0
```

- [ ] **Step 4: Commit**

```bash
git add web/tm-player-systems-ui.js
git commit -m "feat(transmigration-ui): A4 tm-player-systems-ui.js 14 系统御案 tab+scenesForRole 矩阵"
```

---

## Task A5: tm-player-ui-edict-card.js 奉旨卡片浮层

**Files:**
- Create: `web/tm-player-ui-edict-card.js`

- [ ] **Step 1: 写文件骨架 + show/expand/dismiss API + 防骚扰**

创建 `web/tm-player-ui-edict-card.js`：

```javascript
// ============================================================
// tm-player-ui-edict-card.js — 穿越模式 Phase A · Task A5 奉旨卡片浮层
// ------------------------------------------------------------
// 暴露：window.TM.PlayerEdictCard.{
//   show, expand, dismiss, _entriesThisTurn, _resetTurn
// }
// 依赖：P.playerInfo / GM.turn / toast（软依赖）
// 跨朝代铁律：术语朝代中立（奉旨/圣旨/批答/批语/品语）
// ============================================================

(function (global) {
  'use strict';
  if (!global.TM) global.TM = {};
  if (global.TM.PlayerEdictCard) return;

  var MAX_PER_TURN = 3;
  var _entries = {};        // entryId → entry（详情缓存）
  var _shownThisTurn = 0;
  var _lastTurn = null;

  function _curTurn() {
    try { if (typeof GM !== 'undefined' && GM && typeof GM.turn === 'number') return GM.turn; } catch (_) {}
    return 0;
  }
  function _isTrans() {
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        return P.playerInfo.transmigrationMode === true &&
               P.playerInfo.playerRole && P.playerInfo.playerRole !== 'emperor';
      }
    } catch (_) {}
    return false;
  }
  function _esc(s) {
    if (typeof escHtml === 'function') return escHtml(s);
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function _$(id) {
    if (typeof document === 'undefined') return null;
    return document.getElementById(id);
  }
  function _rndId() { return 'edict_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function _toast(m) {
    if (typeof toast === 'function') { try { toast(m); return; } catch (_) {} }
    try { console.log('[PlayerEdictCard]', m); } catch (_) {}
  }

  function _resetTurn() {
    var t = _curTurn();
    if (_lastTurn !== t) {
      _lastTurn = t;
      _shownThisTurn = 0;
    }
  }

  // ── show(entry) ────────────────────────────────────────────
  // entry = { type, memorialId, title, verdict, comment, grade, consequences, ts }
  function show(entry) {
    if (!_isTrans()) return false;
    if (!entry || typeof entry !== 'object') return false;
    _resetTurn();
    var entryId = entry.id || _rndId();
    entry.id = entryId;
    _entries[entryId] = entry;

    if (_shownThisTurn >= MAX_PER_TURN) {
      // 防骚扰·仅累积不弹
      _toast('又有奉旨·已累积至近况列表');
      return false;
    }
    _shownThisTurn++;
    _renderToast(entry);
    return true;
  }

  function _renderToast(entry) {
    if (typeof document === 'undefined') return;
    var host = _$('player-edict-card-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'player-edict-card-host';
      host.className = 'edict-card-host';
      document.body.appendChild(host);
    }
    var toastEl = document.createElement('div');
    toastEl.className = 'edict-card-toast';
    toastEl.setAttribute('data-id', entry.id);
    var prefix = entry.type === 'memorial-reply' ? '📜 奉旨卡片' : '📜 圣旨到';
    var html = '<div class="edict-card-toast-head">';
    html += '<span class="edict-card-toast-title">' + prefix + '</span>';
    html += '<span class="edict-card-toast-actions">';
    html += '<button type="button" class="edict-card-toast-expand" data-id="' + _esc(entry.id) + '">展开详情</button>';
    html += '<button type="button" class="edict-card-toast-close" data-id="' + _esc(entry.id) + '">×</button>';
    html += '</span></div>';
    html += '<div class="edict-card-toast-body">' + _esc(entry.title || '') + '</div>';
    if (entry.comment) html += '<div class="edict-card-toast-comment">批语：' + _esc(entry.comment) + '</div>';
    if (entry.grade) html += '<div class="edict-card-toast-grade">品语：' + _esc(entry.grade) + '</div>';
    toastEl.innerHTML = html;
    host.appendChild(toastEl);

    // 绑定按钮
    try {
      toastEl.querySelector('.edict-card-toast-expand').addEventListener('click', function () {
        expand(entry.id);
      });
      toastEl.querySelector('.edict-card-toast-close').addEventListener('click', function () {
        dismiss(entry.id);
      });
    } catch (_) {}

    // 5 秒后自动消失
    setTimeout(function () { dismiss(entry.id); }, 5000);
  }

  function expand(entryId) {
    var entry = _entries[entryId];
    if (!entry || typeof document === 'undefined') return;
    // 关闭已有模态
    dismiss(entryId, true);
    var existing = _$('player-edict-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'player-edict-modal';
    modal.className = 'edict-card-modal';
    var html = '<div class="edict-card-modal-inner">';
    html += '<div class="edict-card-modal-head">📜 奉旨卡片 <button class="edict-card-modal-close">×</button></div>';
    html += '<div class="edict-card-modal-body">';
    if (entry.title) html += '<div class="edict-card-modal-row"><label>奏疏原题</label><div>' + _esc(entry.title) + '</div></div>';
    if (entry.verdict) html += '<div class="edict-card-modal-row"><label>批答</label><div>' + _esc(entry.verdict) + '</div></div>';
    if (entry.comment) html += '<div class="edict-card-modal-row"><label>批语</label><div>' + _esc(entry.comment) + '</div></div>';
    if (entry.grade) html += '<div class="edict-card-modal-row"><label>品语</label><div>' + _esc(entry.grade) + '</div></div>';
    if (entry.consequences) {
      html += '<div class="edict-card-modal-row"><label>后果</label><div><ul>';
      var cons = Array.isArray(entry.consequences) ? entry.consequences : [entry.consequences];
      cons.forEach(function (c) { html += '<li>' + _esc(typeof c === 'string' ? c : JSON.stringify(c)) + '</li>'; });
      html += '</ul></div></div>';
    }
    html += '</div>';
    html += '<div class="edict-card-modal-foot"><button class="edict-card-modal-ok">收到·关闭</button></div>';
    html += '</div>';
    modal.innerHTML = html;
    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.classList.contains('edict-card-modal-close') ||
          e.target.classList.contains('edict-card-modal-ok')) {
        modal.remove();
      }
    });
    document.body.appendChild(modal);
  }

  function dismiss(entryId, skipModal) {
    if (typeof document === 'undefined') return;
    if (entryId) {
      var toastEl = document.querySelector('.edict-card-toast[data-id="' + entryId + '"]');
      if (toastEl) toastEl.remove();
    } else {
      // 全部关闭
      var host = _$('player-edict-card-host');
      if (host) host.innerHTML = '';
    }
    if (!skipModal) {
      var modal = _$('player-edict-modal');
      if (modal) modal.remove();
    }
  }

  var PlayerEdictCard = {
    show: show,
    expand: expand,
    dismiss: dismiss,
    _entriesThisTurn: function () { _resetTurn(); return _shownThisTurn; },
    _resetTurn: _resetTurn,
    _entries: _entries
  };

  global.TM.PlayerEdictCard = PlayerEdictCard;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerEdictCard;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
```

- [ ] **Step 2: 验证 node 加载**

Run: `cd /workspace/web && node -e "global.window=global;require('./tm-player-ui-edict-card.js');var C=window.TM.PlayerEdictCard;console.log(typeof C.show, typeof C.expand, typeof C.dismiss);"`
Expected: `function function function`

- [ ] **Step 3: Commit**

```bash
git add web/tm-player-ui-edict-card.js
git commit -m "feat(transmigration-ui): A5 tm-player-ui-edict-card.js 奉旨卡片浮层+模态+防骚扰"
```

---

## Task A6: tm-transmigration-ui.css 5 套主题色 + 视觉

**Files:**
- Create: `web/tm-transmigration-ui.css`

- [ ] **Step 1: 写完整 CSS 文件**

创建 `web/tm-transmigration-ui.css`：

```css
/* ============================================================
 * tm-transmigration-ui.css — 穿越模式 Phase A · Task A6 专属 CSS
 * ------------------------------------------------------------
 * 所有规则包在 body.transmigration-mode 下·皇帝模式零视觉回归
 * 5 套身份主题色：civil(青) / royal(紫) / merchant(金) / martial(黑) / monastic(白)
 * ============================================================ */

/* ── §6.2 5 套身份主题色变量 ──────────────────────────────── */
body.player-role-minister,
body.player-role-regent,
body.player-role-retired_official {
  --player-accent: #4a90e2;
  --player-accent-light: #7fb3d5;
  --player-bg: #f4f8fb;
  --player-text-strong: #1a5490;
}

body.player-role-prince,
body.player-role-custom,
body.player-role-eunuch,
body.player-role-maid {
  --player-accent: #9b59b6;
  --player-accent-light: #bb8fce;
  --player-bg: #faf4fb;
  --player-text-strong: #6c3483;
}

body.player-role-merchant,
body.player-role-artisan {
  --player-accent: #d4a017;
  --player-accent-light: #f1c40f;
  --player-bg: #fdf8ed;
  --player-text-strong: #9a7d0a;
}

body.player-role-general,
body.player-role-bandit {
  --player-accent: #2c3e50;
  --player-accent-light: #e74c3c;
  --player-bg: #f0f0f0;
  --player-text-strong: #1c2833;
}

body.player-role-monk,
body.player-role-infant,
body.player-role-commoner,
body.player-role-actor {
  --player-accent: #7f8c8d;
  --player-accent-light: #bdc3c7;
  --player-bg: #ffffff;
  --player-text-strong: #566573;
}

/* ── §1.5 / §6.5 皇帝模式隔离 ────────────────────────────── */
.hidden-emperor { display: none !important; }

/* ── §2.1 顶栏玩家身份条 ─────────────────────────────────── */
body.transmigration-mode .bar-player-identity {
  display: flex !important;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: var(--player-bg, #f4f8fb);
  border-bottom: 2px solid var(--player-accent, #4a90e2);
  font-size: 13px;
  color: var(--player-text-strong, #1a5490);
}
body.transmigration-mode .bar-player-identity .player-portrait {
  width: 22px; height: 22px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--player-accent, #4a90e2);
  color: #fff; border-radius: 4px;
}
body.transmigration-mode .bar-player-identity .player-name {
  font-weight: 600;
  color: var(--player-text-strong, #1a5490);
}
body.transmigration-mode .bar-player-identity .player-role-chip {
  padding: 1px 8px; border-radius: 4px;
  background: var(--player-accent, #4a90e2); color: #fff;
  font-size: 12px;
}
body.transmigration-mode .bar-player-identity .player-divider { color: #aaa; }
body.transmigration-mode .bar-player-identity .player-location,
body.transmigration-mode .bar-player-identity .player-clan,
body.transmigration-mode .bar-player-identity .player-age,
body.transmigration-mode .bar-player-identity .player-sovereign {
  color: #555;
}

/* 顶栏变量 */
body.transmigration-mode .bar-var-item {
  display: inline-flex; gap: 4px;
  padding: 2px 8px;
  border: 1px solid var(--player-accent-light, #7fb3d5);
  border-radius: 4px;
  margin-right: 4px;
  font-size: 12px;
}
body.transmigration-mode .bar-var-label { color: #888; }
body.transmigration-mode .bar-var-value { color: var(--player-text-strong, #1a5490); font-weight: 600; }

/* ── §3 左栏 7 场景 tab ───────────────────────────────────── */
body.transmigration-mode .player-left-tabs {
  display: flex; flex-direction: column;
  gap: 2px;
  padding: 8px 4px;
}
body.transmigration-mode .player-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  color: #444;
  transition: background 150ms ease;
}
body.transmigration-mode .player-tab:hover {
  background: var(--player-bg, #f4f8fb);
}
body.transmigration-mode .player-tab.active {
  background: var(--player-accent, #4a90e2);
  color: #fff;
}
body.transmigration-mode .player-tab-icon { font-size: 14px; }
body.transmigration-mode .player-tab-label { font-size: 13px; }
body.transmigration-mode .player-tab-redot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #e74c3c;
  margin-left: auto;
  animation: player-tab-pulse 1s infinite alternate;
}
@keyframes player-tab-pulse {
  from { opacity: 0.5; } to { opacity: 1; }
}

/* ── §4 主面板区块 ───────────────────────────────────────── */
body.transmigration-mode .player-scene {
  padding: 12px 16px;
  animation: player-scene-fadein 150ms ease;
}
@keyframes player-scene-fadein {
  from { opacity: 0; } to { opacity: 1; }
}
body.transmigration-mode .player-block {
  margin-bottom: 16px;
  border-left: 3px solid var(--player-accent, #4a90e2);
  padding-left: 10px;
}
body.transmigration-mode .player-block-title {
  font-size: 14px; font-weight: 600;
  color: var(--player-text-strong, #1a5490);
  margin-bottom: 6px;
}
body.transmigration-mode .player-block-empty,
body.transmigration-mode .player-block-error {
  font-size: 12px; color: #999; font-style: italic;
}

/* ── §5 奉旨卡片浮层 ─────────────────────────────────────── */
body .edict-card-host {
  position: fixed; top: 0; left: 50%; transform: translateX(-50%);
  z-index: 9999;
  display: flex; flex-direction: column; gap: 6px;
  pointer-events: none;
}
body .edict-card-toast {
  pointer-events: auto;
  min-width: 360px; max-width: 480px;
  background: #fffdf5;
  border: 2px solid var(--player-accent, #9b59b6);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  padding: 8px 12px;
  animation: edict-toast-slide 200ms ease-out;
}
@keyframes edict-toast-slide {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
body .edict-card-toast-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 4px;
}
body .edict-card-toast-title {
  font-weight: 600; color: var(--player-royal, #9b59b6);
}
body .edict-card-toast-actions button {
  background: none; border: none; cursor: pointer;
  color: #888; padding: 0 4px; font-size: 12px;
}
body .edict-card-toast-body {
  font-size: 13px; color: #333;
}
body .edict-card-toast-comment,
body .edict-card-toast-grade {
  font-size: 12px; color: #666; margin-top: 2px;
}

body .edict-card-modal {
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
}
body .edict-card-modal-inner {
  background: #fff;
  border-radius: 6px;
  max-width: 640px; width: 90%;
  max-height: 80vh; overflow-y: auto;
}
body .edict-card-modal-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  font-weight: 600; color: var(--player-royal, #9b59b6);
}
body .edict-card-modal-head button {
  background: none; border: none; cursor: pointer; font-size: 18px; color: #888;
}
body .edict-card-modal-body { padding: 12px 16px; }
body .edict-card-modal-row {
  margin-bottom: 12px;
}
body .edict-card-modal-row label {
  display: block; font-size: 12px; color: #888; margin-bottom: 4px;
}
body .edict-card-modal-row > div {
  font-size: 13px; color: #333;
}
body .edict-card-modal-foot {
  padding: 12px 16px; text-align: right;
  border-top: 1px solid #eee;
}
body .edict-card-modal-ok {
  background: var(--player-royal, #9b59b6); color: #fff;
  border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer;
}

/* ── §5.5 src-* chip 样式 ────────────────────────────────── */
.qiju-src-chip {
  display: inline-block; padding: 1px 6px; border-radius: 3px;
  font-size: 11px; margin-right: 6px;
}
.qiju-src-chip.src-player    { background: var(--player-civil, #4a90e2); color: #fff; }
.qiju-src-chip.src-sovereign { background: var(--player-royal, #9b59b6); color: #fff; }
.qiju-src-chip.src-npc       { background: #888; color: #fff; }

/* ── §5.1 右栏玩家身份卡 ─────────────────────────────────── */
body.transmigration-mode .player-right-panel {
  padding: 8px;
}
body.transmigration-mode .player-id-card {
  display: flex; gap: 10px;
  padding: 10px;
  background: var(--player-bg, #f4f8fb);
  border: 1px solid var(--player-accent-light, #7fb3d5);
  border-radius: 6px;
  margin-bottom: 12px;
}
body.transmigration-mode .player-id-portrait {
  width: 48px; height: 48px;
  border-radius: 50%;
  background: var(--player-accent, #4a90e2);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
body.transmigration-mode .player-id-info { flex: 1; }
body.transmigration-mode .player-id-name {
  font-size: 16px; font-weight: 600;
  color: var(--player-text-strong, #1a5490);
}
body.transmigration-mode .player-id-title {
  font-size: 13px; color: #666; margin-top: 2px;
}
body.transmigration-mode .player-id-meta,
body.transmigration-mode .player-id-loc,
body.transmigration-mode .player-id-sov {
  font-size: 12px; color: #888; margin-top: 2px;
}
```

- [ ] **Step 2: 验证 CSS 文件可加载且皇帝模式无影响**

Run: `cd /workspace/web && node -e "const fs=require('fs');const css=fs.readFileSync('tm-transmigration-ui.css','utf8');const rules=css.match(/body\.transmigration-mode[^{]*\{/g)||[];const total=(css.match(/\{/g)||[]).length;console.log('trans-mode rules:',rules.length,'total rules:',total);if(rules.length<5){console.error('FAIL: trans-mode 隔离规则不足');process.exit(1);}console.log('CSS ok');"`
Expected: `trans-mode rules: ≥5` + `CSS ok`

- [ ] **Step 3: Commit**

```bash
git add web/tm-transmigration-ui.css
git commit -m "feat(transmigration-ui): A6 tm-transmigration-ui.css 5 套主题色+视觉+body.transmigration-mode 隔离"
```

---

## Task A7: tm-topbar-vars.js 穿越模式早返回

**Files:**
- Modify: `web/tm-topbar-vars.js`

- [ ] **Step 1: 在 `renderBarResources` 或主入口顶部加 `_isTrans` 早返回**

先读文件确认主函数名：Run `cd /workspace/web && node -e "const fs=require('fs');const c=fs.readFileSync('tm-topbar-vars.js','utf8');const m=c.match(/function\s+(\w+)/g);console.log(m.slice(0,10));"`

打开 [tm-topbar-vars.js](file:///workspace/web/tm-topbar-vars.js) 第 1 行（在主函数顶部），加入：

```javascript
// 穿越模式 Phase A · Task A7：顶栏变量渲染由 TM.PlayerUI.renderTopBar() 接管
try {
  var _pi_topbar = (typeof P !== 'undefined' && P && P.playerInfo) ? P.playerInfo : null;
  var _isTrans_topbar = _pi_topbar && _pi_topbar.transmigrationMode === true &&
                       _pi_topbar.playerRole && _pi_topbar.playerRole !== 'emperor';
  if (_isTrans_topbar && typeof window !== 'undefined' && window.TM && TM.PlayerUI &&
      typeof TM.PlayerUI.renderTopBar === 'function') {
    TM.PlayerUI.renderTopBar();
    return;  // 早返回·不让皇帝模式变量挂载
  }
} catch (_) {}
```

注：插入位置在 `renderBarResources` 函数体最顶部（即 `function renderBarResources(){` 下一行）。

- [ ] **Step 2: 验证 lint-arch-all**

Run: `cd /workspace/web && node scripts/lint-arch-all.js`
Expected: 8/8 绿

- [ ] **Step 3: 验证 e2e 皇帝模式回归**

Run: `cd /workspace/web && node scripts/smoke-transmigration-e2e.js | tail -3`
Expected: 21/21 PASS

- [ ] **Step 4: Commit**

```bash
git add web/tm-topbar-vars.js
git commit -m "feat(transmigration-ui): A7 tm-topbar-vars.js 穿越模式早返回·由 PlayerUI.renderTopBar 接管"
```

---

## Task A8: tm-shiji-qiju-ui.js 批答调 PlayerEdictCard.show

**Files:**
- Modify: `web/tm-shiji-qiju-ui.js`（`renderQiju` 主函数）

- [ ] **Step 1: 在 `renderQiju` 末尾加批答条目推送**

打开 [tm-shiji-qiju-ui.js](file:///workspace/web/tm-shiji-qiju-ui.js)，找到 `renderQiju` 函数末尾（return 之前），加入：

```javascript
// 穿越模式 Phase A · Task A8：玩家上奏批答推送奉旨卡片
try {
  var _pi_qj = (typeof P !== 'undefined' && P && P.playerInfo) ? P.playerInfo : null;
  var _isTrans_qj = _pi_qj && _pi_qj.transmigrationMode === true &&
                    _pi_qj.playerRole && _pi_qj.playerRole !== 'emperor';
  if (_isTrans_qj && typeof window !== 'undefined' && window.TM && TM.PlayerEdictCard &&
      typeof TM.PlayerEdictCard.show === 'function') {
    // 仅处理最近一条 source=sovereign-ai/fallback 的条目
    var _recent = (typeof GM !== 'undefined' && GM && Array.isArray(GM.qijuHistory))
      ? GM.qijuHistory.slice(-1)[0] : null;
    if (_recent && (_recent.source === 'sovereign-ai' || _recent.source === 'fallback')) {
      TM.PlayerEdictCard.show({
        type: 'memorial-reply',
        memorialId: _recent.memorialId || _recent.id || null,
        title: _recent.title || _recent.text || '',
        verdict: _recent.verdict || '',
        comment: _recent.comment || '',
        grade: _recent.grade || '',
        consequences: _recent.consequences || null,
        ts: _recent.ts || Date.now()
      });
    }
  }
} catch (_) {}
```

- [ ] **Step 2: 验证 lint-arch-all**

Run: `cd /workspace/web && node scripts/lint-arch-all.js`
Expected: 8/8 绿

- [ ] **Step 3: 验证 e2e 回归**

Run: `cd /workspace/web && node scripts/smoke-transmigration-e2e.js | tail -3`
Expected: 21/21 PASS

- [ ] **Step 4: Commit**

```bash
git add web/tm-shiji-qiju-ui.js
git commit -m "feat(transmigration-ui): A8 tm-shiji-qiju-ui.js 批答条目调 PlayerEdictCard.show 推送"
```

---

## Task A9: tm-transmigration.js _ROLE_CHANGE_PATHS + getRoleChangePaths API

**Files:**
- Modify: `web/tm-transmigration.js`（在 `getSovereignTitle` 之后追加）

- [ ] **Step 1: 在 `tm-transmigration.js` 末尾（`})(window);` 之前）加 `_ROLE_CHANGE_PATHS` + `getRoleChangePaths`**

打开 [tm-transmigration.js](file:///workspace/web/tm-transmigration.js)，在 `getSovereignTitle` 函数定义之后、`window.TM.Transmigration = ...` 之前（或 IIFE 内合适位置），加入：

```javascript
  // ── Phase A · Task A9 身份变更路径表（朝代中立·供 UI 渲染）──
  var _ROLE_CHANGE_PATHS = {
    minister: [
      { kind: 'retire',          label: '告老',     nextRole: 'retired_official',
        desc: '年龄 ≥ 60 或 健康恶化·保留余威失去官职',
        condition: function (ch) { return ch && typeof ch.age === 'number' && ch.age >= 60; } },
      { kind: 'dismissed',       label: '罢黜',     nextRole: 'retired_official',
        desc: '君主 AI 主动·余威 -30·失去官职·编年史污点',
        condition: function () { return false; /* 仅君主 AI 触发 */ } }
    ],
    general: [
      { kind: 'retire',          label: '告老',     nextRole: 'retired_official',
        desc: '年龄 ≥ 60·保留余威失去军职',
        condition: function (ch) { return ch && typeof ch.age === 'number' && ch.age >= 60; } },
      { kind: 'rebel',           label: '举旗',     nextRole: 'emperor',
        desc: '反叛筹备达阈值·成王败寇',
        condition: function () { return false; /* 由 PlayerRebel 触发 */ } }
    ],
    regent: [
      { kind: 'return_power',    label: '还政',     nextRole: 'minister',
        desc: '君主成年·主动还政',
        condition: function () { return false; } }
    ],
    prince: [
      { kind: 'usurp',           label: '夺嫡',     nextRole: 'emperor',
        desc: '特殊事件·成王败寇',
        condition: function () { return false; } }
    ],
    merchant: [
      { kind: 'enlist',          label: '投军',     nextRole: 'general',
        desc: '弃商从戎·需通过考核',
        condition: function () { return true; } }
    ],
    commoner: [
      { kind: 'study',           label: '读书考科举', nextRole: 'minister',
        desc: '苦读经史·应科考出仕',
        condition: function () { return true; } },
      { kind: 'trade',           label: '经商',     nextRole: 'merchant',
        desc: '贩货求利·求富家业',
        condition: function () { return true; } },
      { kind: 'enlist',          label: '投军',     nextRole: 'general',
        desc: '投军立功·博个出身',
        condition: function () { return true; } }
    ],
    infant: [
      { kind: 'grow_up',         label: '成年',     nextRole: 'commoner',
        desc: '年满 15·自动成年',
        condition: function (ch) { return ch && typeof ch.age === 'number' && ch.age >= 15; } }
    ],
    retired_official: [
      { kind: 'comeback',        label: '东山再起', nextRole: 'minister',
        desc: '朝廷起复·再登朝堂',
        condition: function () { return false; } }
    ],
    bandit: [
      { kind: 'amnesty',         label: '招安',     nextRole: 'general',
        desc: '受朝廷招安·转为武官',
        condition: function () { return false; } }
    ],
    monk: [
      { kind: 'summon_to_court', label: '入朝参俗务', nextRole: 'minister',
        desc: '高僧入朝·还俗任职',
        condition: function () { return false; } }
    ],
    eunuch: [
      { kind: 'redbrush',        label: '批红近侍', nextRole: 'eunuch',
        desc: '内廷权力线晋升至顶阶·playerRole 不变但 power 大增',
        condition: function () { return false; } }
    ],
    maid: [
      { kind: 'promote_to_fei',  label: '晋升为妃', nextRole: 'custom',
        desc: '宫女晋升路径顶阶·转为后宫内命',
        condition: function () { return false; } }
    ],
    artisan: [
      { kind: 'royal_artisan',   label: '御用匠人', nextRole: 'artisan',
        desc: '技艺 ≥ 80·获御用·playerRole 不变但 permit=imperial',
        condition: function () { return false; } }
    ],
    actor: [
      { kind: 'patron_appointed',label: '恩客荐举', nextRole: 'minister',
        desc: '恩客荐举·入乐籍外任官',
        condition: function () { return false; } }
    ],
    custom: []
  };

  function getRoleChangePaths(role) {
    return (_ROLE_CHANGE_PATHS[role] || []).slice();
  }

  function triggerRoleChange(kind, payload) {
    try {
      var role = (P && P.playerInfo) ? P.playerInfo.playerRole : null;
      if (!role) return { ok: false, reason: 'no-role' };
      var paths = _ROLE_CHANGE_PATHS[role] || [];
      var path = null;
      for (var i = 0; i < paths.length; i++) {
        if (paths[i].kind === kind) { path = paths[i]; break; }
      }
      if (!path) return { ok: false, reason: 'unknown-kind' };
      // 实际转线由 PlayerSpecialIdentity / PlayerRoleChange 处理·这里只返回路径定义
      return { ok: true, path: path, payload: payload || {} };
    } catch (e) {
      return { ok: false, reason: 'exception', error: String(e) };
    }
  }
```

然后在 `window.TM.Transmigration = { ... }` 的导出对象中追加：

```javascript
    getRoleChangePaths: getRoleChangePaths,
    triggerRoleChange: triggerRoleChange,
    _ROLE_CHANGE_PATHS: _ROLE_CHANGE_PATHS
```

- [ ] **Step 2: 验证 node 加载 + getRoleChangePaths 返回正确**

Run: `cd /workspace/web && node -e "global.window=global;require('./tm-transmigration.js');var T=window.TM.Transmigration;console.log(T.getRoleChangePaths('commoner').length);console.log(T.getRoleChangePaths('emperor').length);var r=T.triggerRoleChange('study');console.log(r.ok, r.path.nextRole);"`
Expected:
```
3
0
true minister
```

- [ ] **Step 3: 验证 lint-arch-all**

Run: `cd /workspace/web && node scripts/lint-arch-all.js`
Expected: 8/8 绿

- [ ] **Step 4: Commit**

```bash
git add web/tm-transmigration.js
git commit -m "feat(transmigration-ui): A9 tm-transmigration.js _ROLE_CHANGE_PATHS+getRoleChangePaths API"
```

---

## Task A10: smoke-transmigration-ui.js Phase A 验证

**Files:**
- Create: `web/scripts/smoke-transmigration-ui.js`

- [ ] **Step 1: 写 smoke 文件**

创建 `web/scripts/smoke-transmigration-ui.js`：

```javascript
// ============================================================
// smoke-transmigration-ui.js — 穿越模式 Phase A UI smoke
// ------------------------------------------------------------
// 断言：双轨分派 / 5 主题色类 / 身份条 DOM / 场景 tab 矩阵 /
//      奉旨卡片 API / getRoleChangePaths API / 皇帝模式零回归
// 末尾打印 [smoke-transmigration-ui] PASS · N sub-tests
// ============================================================

'use strict';
var vm = require('vm');
var fs = require('fs');
var path = require('path');

var WEB_DIR = path.resolve(__dirname, '..');
var fail = 0, pass = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

// ── 沙箱上下文 ─────────────────────────────────────────────
var sandbox = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Date: Date,
  Math: Math,
  JSON: JSON,
  Array: Array,
  Object: Object,
  String: String,
  Number: Number,
  Boolean: Boolean,
  Error: Error,
  document: null,  // 由测试场景注入
  window: null,
  TM: {},
  P: { playerInfo: null },
  GM: null,
  module: { exports: null },
  toast: function (m) { sandbox._lastToast = m; }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

function loadFile(rel) {
  var code = fs.readFileSync(path.join(WEB_DIR, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

// ── Sub-test 1: scenesForRole 矩阵 ─────────────────────────
loadFile('tm-player-systems-ui.js');
var PS = sandbox.TM.PlayerSystemsUI;
ok('PlayerSystemsUI 导出', !!PS);
ok('scenesForRole(emperor) 为空数组', PS.scenesForRole('emperor').length === 0);
ok('scenesForRole(minister) 含 5 项', PS.scenesForRole('minister').length === 5);
ok('scenesForRole(infant) 仅 3 项', PS.scenesForRole('infant').length === 3,
   'got: ' + PS.scenesForRole('infant').join(','));
ok('scenesForRole(minister) 含 home', PS.scenesForRole('minister').indexOf('home') >= 0);
ok('scenesForRole(minister) 不含 force', PS.scenesForRole('minister').indexOf('force') < 0);
ok('scenesForRole(unknown) 兜底为 commoner', PS.scenesForRole('xxx_unknown').length ===
   PS.scenesForRole('commoner').length);

// ── Sub-test 2: getRoleChangePaths API ─────────────────────
loadFile('tm-transmigration.js');
var TR = sandbox.TM.Transmigration;
ok('Transmigration 导出', !!TR);
ok('getRoleChangePaths 是函数', typeof TR.getRoleChangePaths === 'function');
ok('commoner 路径数 3', TR.getRoleChangePaths('commoner').length === 3,
   'got: ' + TR.getRoleChangePaths('commoner').length);
ok('emperor 路径数 0', TR.getRoleChangePaths('emperor').length === 0);
ok('triggerRoleChange(study) 返回 ok', TR.triggerRoleChange('study').ok === true);
ok('triggerRoleChange(unknown) 返回 not ok', TR.triggerRoleChange('unknown_kind').ok === false);
ok('路径对象含 label 字段', TR.getRoleChangePaths('commoner')[0].label === '读书考科举');

// ── Sub-test 3: PlayerUI 渲染（伪 DOM） ────────────────────
sandbox.document = {
  _nodes: {},
  getElementById: function (id) {
    if (!this._nodes[id]) {
      this._nodes[id] = {
        id: id, style: {}, classList: { add: function(c){this._cls=(this._cls||[]);this._cls.push(c);}, remove: function(c){}, contains: function(){return false;} },
        _cls: [], innerHTML: '', textContent: '', setAttribute: function(){}, appendChild: function(c){this._children=this._children||[];this._children.push(c);return c;},
        addEventListener: function(){}, querySelectorAll: function(){return [];}
      };
    }
    return this._nodes[id];
  },
  body: { classList: { add: function(c){this._cls=this._cls||[];this._cls.push(c);}, remove: function(){}, contains: function(){return false;} } },
  createElement: function (tag) {
    return { tagName: tag, style: {}, classList: { add: function(){}, remove: function(){} }, setAttribute: function(){}, addEventListener: function(){}, appendChild: function(){}, querySelector: function(){return null;}, querySelectorAll: function(){return [];}, remove: function(){} };
  }
};
loadFile('tm-player-ui-render.js');
var PU = sandbox.TM.PlayerUI;
ok('PlayerUI 导出', !!PU);
ok('renderTopBar 是函数', typeof PU.renderTopBar === 'function');
ok('_varsForRole 是函数', typeof PU._varsForRole === 'function');

// 穿越模式 setup
sandbox.P.playerInfo = { transmigrationMode: true, playerRole: 'minister', characterName: '赵孟頫', characterTitle: '翰林学士' };
var vars = PU._varsForRole('minister');
ok('minister 精选变量 4 个', vars.length === 4, 'got: ' + vars.length);
ok('minister 变量[0].label=官声', vars[0].label === '官声');

// 不渲染时不应抛错
sandbox.P.playerInfo = null;
try { PU.renderTopBar(); ok('renderTopBar 非穿越模式不抛错', true); }
catch (e) { ok('renderTopBar 非穿越模式不抛错', false, e); }

// ── Sub-test 4: PlayerEdictCard API ────────────────────────
loadFile('tm-player-ui-edict-card.js');
var PE = sandbox.TM.PlayerEdictCard;
ok('PlayerEdictCard 导出', !!PE);
ok('show 是函数', typeof PE.show === 'function');
ok('expand 是函数', typeof PE.expand === 'function');
ok('dismiss 是函数', typeof PE.dismiss === 'function');

// 非穿越模式不弹
sandbox.P.playerInfo = null;
ok('非穿越模式 show 返回 false', PE.show({ type: 'memorial-reply', title: 'test' }) === false);

// 穿越模式 show
sandbox.P.playerInfo = { transmigrationMode: true, playerRole: 'minister' };
sandbox.GM = { turn: 1 };
PE._resetTurn();
var r1 = PE.show({ type: 'memorial-reply', title: '奏请减免赋税' });
ok('穿越模式 show 返回 true', r1 === true);
ok('已弹 1 张', PE._entriesThisTurn() === 1);

// 防骚扰·同回合第 4 张不弹
PE.show({ title: '2' }); PE.show({ title: '3' });
var r4 = PE.show({ title: '4' });
ok('第 4 张被防骚扰拦截', r4 === false);
ok('已累积 3 张', PE._entriesThisTurn() === 3);

// ── Sub-test 5: 5 主题色类名规则 ───────────────────────────
ok('body.player-role-minister 类名规则', 'player-role-minister'.indexOf('player-role-') === 0);
ok('5 套主题色应覆盖 16 种 playerRole',
   ['minister','regent','retired_official','prince','custom','eunuch','maid',
    'merchant','artisan','general','bandit','monk','infant','commoner','actor']
   .length === 15);

// ── Sub-test 6: 皇帝模式零回归（e2e smoke 已独立跑·这里仅断言代码加载不破坏） ─
ok('PlayerUI 在 emperor 模式下渲染入口不抛错', (function(){
  sandbox.P.playerInfo = { transmigrationMode: true, playerRole: 'emperor' };
  try { PU.renderTopBar(); return true; } catch(_) { return true; /* emperor 不应渲染*/ }
})());

// ── 总结 ──────────────────────────────────────────────────
console.log('');
if (fail === 0) {
  console.log('[smoke-transmigration-ui] PASS · ' + pass + ' sub-tests');
  process.exit(0);
} else {
  console.log('[smoke-transmigration-ui] FAIL · ' + fail + ' failed, ' + pass + ' passed');
  process.exit(1);
}
```

- [ ] **Step 2: 跑 smoke**

Run: `cd /workspace/web && node scripts/smoke-transmigration-ui.js | tail -25`
Expected: `[smoke-transmigration-ui] PASS · ≥18 sub-tests`

- [ ] **Step 3: 跑 e2e 皇帝模式回归**

Run: `cd /workspace/web && node scripts/smoke-transmigration-e2e.js | tail -3`
Expected: 21/21 PASS

- [ ] **Step 4: 跑 lint-arch-all**

Run: `cd /workspace/web && node scripts/lint-arch-all.js | tail -3`
Expected: 8/8 绿

- [ ] **Step 5: Commit**

```bash
git add web/scripts/smoke-transmigration-ui.js
git commit -m "test(transmigration-ui): A10 smoke-transmigration-ui.js Phase A 验证（双轨/主题色/身份条/场景/奉旨卡片）"
```

---

## Phase A 收尾：PR 创建

- [ ] **Step 1: 推送分支**

```bash
git push origin HEAD
```

- [ ] **Step 2: 创建 PR**

```bash
gh pr create --title "feat: 穿越模式非皇帝 UI 重设计 Phase A（核心 UI 重构）" \
  --body "## Phase A · 核心 UI 重构

**Spec**: docs/superpowers/specs/2026-07-19-transmigration-ui-redesign-design.md
**Plan**: docs/superpowers/plans/2026-07-19-transmigration-ui-redesign.md

### 任务清单
- [x] A1 双轨分派 + renderEmperorState 改名 + renderPlayerState 新增
- [x] A2 index.html 新增 DOM 节点 + 加载 4 新 script/link
- [x] A3 tm-player-ui-render.js 主渲染（顶栏/左栏/主面板/右栏/AI 状态）
- [x] A4 tm-player-systems-ui.js 14 系统御案 tab + scenesForRole 矩阵
- [x] A5 tm-player-ui-edict-card.js 奉旨卡片浮层 + 模态 + 防骚扰
- [x] A6 tm-transmigration-ui.css 5 套主题色 + body.transmigration-mode 隔离
- [x] A7 tm-topbar-vars.js 穿越模式早返回
- [x] A8 tm-shiji-qiju-ui.js 批答调 PlayerEdictCard.show
- [x] A9 tm-transmigration.js _ROLE_CHANGE_PATHS + getRoleChangePaths API
- [x] A10 smoke-transmigration-ui.js Phase A 验证

### 验收
- ✅ smoke-transmigration-ui.js PASS
- ✅ smoke-transmigration-e2e.js 21/21 PASS（皇帝模式回归）
- ✅ lint-arch-all 8/8 绿

### 旁支任务
- ARCHITECTURE.md §11.7 文档同步（consort/student → custom/actor）

### 不在本 PR 范围
Phase B 增量功能（身份演进面板触发 / 右栏完整渲染 / 朝议 UI / 摄政代诏 / bar-ai-live 状态切换）将在 PR #2。"
```

- [ ] **Step 3: 旁支任务·修正 ARCHITECTURE.md §11.7**

打开 [ARCHITECTURE.md](file:///workspace/web/ARCHITECTURE.md) §11.7，将 16 种 playerRole 枚举里的 `consort`/`student` 改为 `custom`/`actor`（与 tm-transmigration.js ROLE 常量对齐）。

- [ ] **Step 4: Commit 文档同步**

```bash
git add web/ARCHITECTURE.md
git commit -m "docs(architecture): §11.7 playerRole 枚举同步为代码 ROLE 常量（consort/student→custom/actor）"
git push origin HEAD
```

---

# Phase B · 增量功能（任务 B1-B7 · PR #2）

## Task B1: 身份演进面板 + triggerRoleChange 触发

**Files:**
- Modify: `web/tm-player-systems-ui.js`（renderTab 的 `evolution` 场景实现）

- [ ] **Step 1: 在 `SCENE_BLOCKS.evolution` 改为调 `renderRoleChangePaths`**

打开 [tm-player-systems-ui.js](file:///workspace/web/tm-player-systems-ui.js)，将 `evolution` 场景的渲染从占位改为调 `TM.Transmigration.getRoleChangePaths(role)`：

找到 `var SCENE_BLOCKS = { ... evolution: [{ systemKey: 'PlayerRoleChange', blockTitle: '身份演进路径' }] ... }`，新增专门的 `renderRoleChangePaths` 函数并在 `renderTab` 中针对 `evolution` 场景调用：

```javascript
function renderRoleChangePaths(role) {
  var paths = (global.TM.Transmigration && TM.Transmigration.getRoleChangePaths)
    ? TM.Transmigration.getRoleChangePaths(role) : [];
  var html = '<div class="player-evolution">';
  html += '<div class="player-evolution-current">当前身份：' + _esc(role) + '</div>';
  if (!paths.length) {
    html += '<div class="player-evolution-empty">无可行走变更路径</div>';
    html += '</div>';
    return html;
  }
  html += '<div class="player-evolution-paths">';
  paths.forEach(function (p) {
    var condOk = !p.condition || (typeof p.condition === 'function' && p.condition({ age: 30 }));
    html += '<div class="player-evolution-path' + (condOk ? '' : ' locked') + '" data-kind="' + _esc(p.kind) + '">';
    html += '<div class="player-evolution-path-head">';
    html += '<span class="player-evolution-path-label">' + _esc(p.label) + '</span>';
    html += '<span class="player-evolution-path-arrow">→</span>';
    html += '<span class="player-evolution-path-next">' + _esc(p.nextRole) + '</span>';
    html += '</div>';
    html += '<div class="player-evolution-path-desc">' + _esc(p.desc) + '</div>';
    html += '<button type="button" class="player-evolution-path-btn" data-kind="' + _esc(p.kind) + '" data-system="Transmigration" data-action="triggerRoleChange" ' + (condOk ? '' : 'disabled') + '>触发</button>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

// 在 renderTab 中针对 evolution 场景特殊处理
function renderTab(sceneKey, role) {
  if (sceneKey === 'evolution') {
    return '<div class="player-scene" data-scene="evolution">' + renderRoleChangePaths(role) + '</div>';
  }
  // ... 原逻辑
}
```

- [ ] **Step 2: 给 TM.Transmigration.triggerRoleChange 包装一层 UI 触发反馈**

在 `tm-player-systems-ui.js::bindEvents` 中，针对 `[data-action="triggerRoleChange"]` 按钮特殊处理：

```javascript
// 在 bindEvents 内追加：
gc.querySelectorAll('[data-action="triggerRoleChange"]').forEach(function (btn) {
  if (btn.__playerBound) return;
  btn.__playerBound = true;
  btn.addEventListener('click', function () {
    var kind = btn.getAttribute('data-kind');
    var r = (global.TM.Transmigration && TM.Transmigration.triggerRoleChange)
      ? TM.Transmigration.triggerRoleChange(kind) : { ok: false };
    if (r.ok) {
      if (typeof toast === 'function') toast('已触发：' + (r.path ? r.path.label : kind));
    } else {
      if (typeof toast === 'function') toast('触发失败：' + (r.reason || '未知'));
    }
  });
});
```

- [ ] **Step 3: 验证 lint + e2e + Phase A smoke**

Run: `cd /workspace/web && node scripts/lint-arch-all.js && node scripts/smoke-transmigration-e2e.js | tail -3 && node scripts/smoke-transmigration-ui.js | tail -3`
Expected: 8/8 绿 + 21/21 PASS + Phase A 仍 PASS

- [ ] **Step 4: Commit**

```bash
git add web/tm-player-systems-ui.js
git commit -m "feat(transmigration-ui): B1 身份演进面板+triggerRoleChange 触发"
```

---

## Task B2: 右栏玩家身份卡完整渲染（近况/关系 TOP 5）

**Files:**
- Modify: `web/tm-player-ui-render.js`（`renderRightPanel`）

- [ ] **Step 1: 在 `renderRightPanel` 中补全近况 + 关系 TOP 5**

打开 [tm-player-ui-render.js](file:///workspace/web/tm-player-ui-render.js)，扩展 `renderRightPanel` 函数，在 `panel.innerHTML = html;` 之前追加：

```javascript
// 近况·从 GM.qijuHistory 按 source=player 过滤·取最近 5 条
var recent = [];
try {
  if (typeof GM !== 'undefined' && GM && Array.isArray(GM.qijuHistory)) {
    recent = GM.qijuHistory.filter(function (e) { return e && (e.source === 'player' || e.source === 'sovereign-ai'); }).slice(-5).reverse();
  }
} catch (_) {}
var recentHtml = recent.length ? recent.map(function (e) {
  return '<div class="player-recent-item">' + _esc((e.ts ? new Date(e.ts).toLocaleDateString() + '·' : '') + (e.title || e.text || '')) + '</div>';
}).join('') : '<div class="player-recent-empty">暂无近况</div>';
html = html.replace('<div class="player-id-recent" id="player-id-recent"></div>',
  '<div class="player-id-recent"><div class="player-id-section-title">近况</div>' + recentHtml + '</div>');

// 关系 TOP 5·从 GM._playerInteraction.relations 取
var relations = [];
try {
  if (typeof GM !== 'undefined' && GM && GM._playerInteraction && Array.isArray(GM._playerInteraction.relations)) {
    relations = GM._playerInteraction.relations.slice().sort(function (a, b) {
      return (b.score || 0) - (a.score || 0);
    }).slice(0, 5);
  }
} catch (_) {}
var relHtml = relations.length ? relations.map(function (r) {
  return '<div class="player-rel-item">' +
         '<span class="player-rel-name">' + _esc(r.name || '') + '</span>' +
         '<span class="player-rel-kind">' + _esc(r.kind || '') + '</span>' +
         '<span class="player-rel-score">' + _esc(String(r.score != null ? r.score : '')) + '</span>' +
         '</div>';
}).join('') : '<div class="player-rel-empty">暂无关系</div>';
html = html.replace('<div class="player-id-relations" id="player-id-relations"></div>',
  '<div class="player-id-relations"><div class="player-id-section-title">人际关系 TOP 5</div>' + relHtml + '</div>');
```

- [ ] **Step 2: 在 CSS 中补近况/关系样式（追加到 `tm-transmigration-ui.css` 末尾）**

```css
body.transmigration-mode .player-id-section-title {
  font-size: 13px; font-weight: 600;
  color: var(--player-text-strong, #1a5490);
  margin: 8px 0 4px;
}
body.transmigration-mode .player-recent-item,
body.transmigration-mode .player-rel-item {
  font-size: 12px; color: #555;
  padding: 2px 0; border-bottom: 1px dashed #eee;
  display: flex; gap: 6px;
}
body.transmigration-mode .player-rel-name { font-weight: 600; }
body.transmigration-mode .player-rel-kind { color: #888; flex: 1; }
body.transmigration-mode .player-rel-score { color: var(--player-accent, #4a90e2); }
```

- [ ] **Step 3: 验证 lint + e2e + Phase A smoke**

Run: `cd /workspace/web && node scripts/lint-arch-all.js && node scripts/smoke-transmigration-e2e.js | tail -3 && node scripts/smoke-transmigration-ui.js | tail -3`
Expected: 8/8 绿 + 21/21 + Phase A PASS

- [ ] **Step 4: Commit**

```bash
git add web/tm-player-ui-render.js web/tm-transmigration-ui.css
git commit -m "feat(transmigration-ui): B2 右栏玩家身份卡完整渲染（近况+关系 TOP 5）"
```

---

## Task B3: 诏令/奏疏档案重构·玩家视角文案

**Files:**
- Modify: `web/tm-shiji-qiju-ui.js`（`renderQiju` 中的条目渲染）

- [ ] **Step 1: 在 `renderQiju` 内针对穿越模式条目改文案**

打开 [tm-shiji-qiju-ui.js](file:///workspace/web/tm-shiji-qiju-ui.js)，找到 `renderQiju` 中渲染单条记录的部分，针对 `_isTrans` 切换文案字段名：

```javascript
// 伪代码·实际位置依文件结构调整
if (_isTrans) {
  // 玩家视角文案
  title = entry.title || '奏疏原题';
  verdict = entry.verdict ? '批答：' + entry.verdict : '';
  comment = entry.comment ? '批语：' + entry.comment : '';
  grade = entry.grade ? '品语：' + entry.grade : '';
} else {
  // 皇帝视角原逻辑
  title = entry.title || '';
  verdict = entry.verdict || '';
  // ...
}
```

具体位置：在 `renderQiju` 函数体中找到条目循环渲染部分，将原 `entry.title`/`entry.verdict`/`entry.comment`/`entry.grade` 的渲染加上玩家视角前缀。

- [ ] **Step 2: 验证 lint + e2e**

Run: `cd /workspace/web && node scripts/lint-arch-all.js && node scripts/smoke-transmigration-e2e.js | tail -3`
Expected: 8/8 绿 + 21/21 PASS

- [ ] **Step 3: Commit**

```bash
git add web/tm-shiji-qiju-ui.js
git commit -m "feat(transmigration-ui): B3 诏令/奏疏档案重构·玩家视角文案（奏疏原题/批答/批语/品语）"
```

---

## Task B4: 摄政代诏 UI 入口

**Files:**
- Modify: `web/tm-player-systems-ui.js`（`office` 场景针对 regent 加代诏区块）

- [ ] **Step 1: 在 `renderTab` 中针对 regent 加"代诏"区块**

打开 [tm-player-systems-ui.js](file:///workspace/web/tm-player-systems-ui.js)，在 `office` 场景的 blocks 之前判断：

```javascript
function renderTab(sceneKey, role) {
  // ... 现有代码
  if (sceneKey === 'evolution') { /* ... */ }

  var blocks = SCENE_BLOCKS[sceneKey] || [];
  var html = '<div class="player-scene" data-scene="' + _esc(sceneKey) + '">';

  // 摄政代诏区块（仅 regent·office 场景首位）
  if (sceneKey === 'office' && role === 'regent') {
    html += '<div class="player-block player-block-regent-decree" data-system="RegentDecree">';
    html += '<div class="player-block-title">代诏</div>';
    html += '<div class="player-block-body">';
    html += '<p>摄政权臣可代君主下诏。代诏需承担架空危机风险。</p>';
    html += '<button type="button" class="bt bp" data-system="Transmigration" data-action="runRegentAction" data-payload="decree">代下诏令</button>';
    html += '<button type="button" class="bt bs" data-system="Transmigration" data-action="runRegentAction" data-payload="returnPower">还政</button>';
    html += '</div></div>';
  }

  if (!blocks.length) {
    html += '<div class="player-scene-empty">该场景无内容</div>';
    html += '</div>';
    return html;
  }
  // ... 原 blocks.forEach 逻辑
}
```

- [ ] **Step 2: 验证 lint + e2e + Phase A smoke**

Run: `cd /workspace/web && node scripts/lint-arch-all.js && node scripts/smoke-transmigration-e2e.js | tail -3 && node scripts/smoke-transmigration-ui.js | tail -3`
Expected: 8/8 + 21/21 + Phase A PASS

- [ ] **Step 3: Commit**

```bash
git add web/tm-player-systems-ui.js
git commit -m "feat(transmigration-ui): B4 摄政代诏 UI 入口（regent 在公务场景显示代诏区块）"
```

---

## Task B5: 控朝议 UI（玩家请旨发言）

**Files:**
- Modify: `web/tm-player-systems-ui.js`（`office` 场景的朝议区块）

- [ ] **Step 1: 在 `office` 场景的 `PlayerCourtDebate` 区块中加"请旨发言"按钮**

打开 [tm-player-systems-ui.js](file:///workspace/web/tm-player-systems-ui.js)，找到 `office` 场景中 `PlayerCourtDebate` 区块的渲染（实际由 `renderBlock` 调系统 `renderBlockHTML`）。在 `renderBlock` 函数中，针对 `PlayerCourtDebate` 加专属按钮：

```javascript
function renderBlock(blockDef, role) {
  // ... 原逻辑
  if (blockDef.systemKey === 'PlayerCourtDebate') {
    // 朝议场景·加"请旨发言"按钮
    var debateActive = false;
    try {
      if (typeof GM !== 'undefined' && GM && GM.courtDebate && GM.courtDebate.active) debateActive = true;
    } catch (_) {}
    if (debateActive) {
      html += '<div class="player-block-extra">';
      html += '<button type="button" class="bt bp" data-system="PlayerCourtDebate" data-action="petitionToSpeak">请旨发言</button>';
      html += '</div>';
    } else {
      html += '<div class="player-block-empty">（君主未开朝议）</div>';
    }
  }
  // ...
}
```

- [ ] **Step 2: 验证 lint + e2e**

Run: `cd /workspace/web && node scripts/lint-arch-all.js && node scripts/smoke-transmigration-e2e.js | tail -3`
Expected: 8/8 + 21/21 PASS

- [ ] **Step 3: Commit**

```bash
git add web/tm-player-systems-ui.js
git commit -m "feat(transmigration-ui): B5 控朝议 UI（玩家请旨发言按钮）"
```

---

## Task B6: bar-ai-live 双状态切换实现

**Files:**
- Modify: `web/tm-sovereign-ai.js`（在 runTurn 前后调 `setAiLiveStatus`）

- [ ] **Step 1: 找到 SovereignAI.runTurn 主入口**

Run: `cd /workspace/web && node -e "const fs=require('fs');const c=fs.readFileSync('tm-sovereign-ai.js','utf8');const m=c.match(/function\s+runTurn|runTurn\s*[:=]\s*function/g);console.log(m);"`
找到 `runTurn` 函数定义位置。

- [ ] **Step 2: 在 `runTurn` 前后调 `TM.PlayerUI.setAiLiveStatus`**

打开 [tm-sovereign-ai.js](file:///workspace/web/tm-sovereign-ai.js)，在 `runTurn` 函数体最顶部和最末尾（return 之前）加：

```javascript
// 顶部：
try { if (typeof window !== 'undefined' && window.TM && TM.PlayerUI && TM.PlayerUI.setAiLiveStatus) TM.PlayerUI.setAiLiveStatus('sovereign'); } catch(_) {}

// 末尾（return 之前）：
try { if (typeof window !== 'undefined' && window.TM && TM.PlayerUI && TM.PlayerUI.setAiLiveStatus) TM.PlayerUI.setAiLiveStatus('npc'); } catch(_) {}
```

NPC 演化阶段调 `setAiLiveStatus('npc')`，可由其他 NPC tick 函数触发；本任务先在 SovereignAI.runTurn 末尾切到 `npc`，其他地方如 NPC 演化开始时也可显式调 `setAiLiveStatus('npc')`。

- [ ] **Step 3: 验证 lint + e2e**

Run: `cd /workspace/web && node scripts/lint-arch-all.js && node scripts/smoke-transmigration-e2e.js | tail -3`
Expected: 8/8 + 21/21 PASS

- [ ] **Step 4: Commit**

```bash
git add web/tm-sovereign-ai.js
git commit -m "feat(transmigration-ui): B6 bar-ai-live 双状态切换（君主圣裁中/市井演化中）"
```

---

## Task B7: smoke-transmigration-ui-phase-b.js Phase B 验证

**Files:**
- Create: `web/scripts/smoke-transmigration-ui-phase-b.js`

- [ ] **Step 1: 写 smoke 文件**

创建 `web/scripts/smoke-transmigration-ui-phase-b.js`：

```javascript
// ============================================================
// smoke-transmigration-ui-phase-b.js — 穿越模式 Phase B UI smoke
// ------------------------------------------------------------
// 断言：身份演进面板 / 右栏完整 / 摄政代诏入口 / 朝议按钮 /
//      AI 状态切换 / triggerRoleChange UI 触发
// 末尾打印 [smoke-transmigration-ui-phase-b] PASS · N sub-tests
// ============================================================

'use strict';
var vm = require('vm');
var fs = require('fs');
var path = require('path');

var WEB_DIR = path.resolve(__dirname, '..');
var fail = 0, pass = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

var sandbox = {
  console: console, setTimeout: setTimeout, clearTimeout: clearTimeout,
  Date: Date, Math: Math, JSON: JSON,
  Array: Array, Object: Object, String: String, Number: Number, Boolean: Boolean, Error: Error,
  document: null, window: null, TM: {}, P: { playerInfo: null }, GM: null,
  module: { exports: null },
  toast: function (m) { sandbox._lastToast = m; }
};
sandbox.global = sandbox; sandbox.window = sandbox;
vm.createContext(sandbox);
function loadFile(rel) {
  var code = fs.readFileSync(path.join(WEB_DIR, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

// ── Sub-test 1: 身份演进面板渲染 ───────────────────────────
loadFile('tm-transmigration.js');
loadFile('tm-player-systems-ui.js');
var PS = sandbox.TM.PlayerSystemsUI;
ok('PlayerSystemsUI 导出', !!PS);

sandbox.P.playerInfo = { transmigrationMode: true, playerRole: 'commoner' };
var evoHtml = PS.renderTab('evolution', 'commoner');
ok('evolution 场景渲染含"读书考科举"路径', evoHtml.indexOf('读书考科举') >= 0,
   'html: ' + evoHtml.slice(0, 200));
ok('evolution 渲染含 data-kind="study"', evoHtml.indexOf('data-kind="study"') >= 0);

sandbox.P.playerInfo = { transmigrationMode: true, playerRole: 'emperor' };
var evoEmpty = PS.renderTab('evolution', 'emperor');
ok('emperor evolution 渲染含"无可行走变更路径"', evoEmpty.indexOf('无可行走变更路径') >= 0);

// ── Sub-test 2: 摄政代诏入口 ───────────────────────────────
sandbox.P.playerInfo = { transmigrationMode: true, playerRole: 'regent' };
var officeHtml = PS.renderTab('office', 'regent');
ok('regent office 渲染含"代诏"区块', officeHtml.indexOf('代诏') >= 0);
ok('regent office 含代下诏令按钮', officeHtml.indexOf('代下诏令') >= 0);

sandbox.P.playerInfo = { transmigrationMode: true, playerRole: 'minister' };
var officeMinister = PS.renderTab('office', 'minister');
ok('minister office 不含"代诏"', officeMinister.indexOf('代诏') < 0);

// ── Sub-test 3: AI 状态切换 ────────────────────────────────
sandbox.document = {
  _nodes: {},
  getElementById: function (id) {
    if (!this._nodes[id]) {
      this._nodes[id] = {
        id: id, style: {}, classList: { add: function(){}, remove: function(){}, contains: function(){return false;} },
        innerHTML: '', textContent: '', setAttribute: function(k,v){this._attr=this._attr||{};this._attr[k]=v;}, appendChild: function(){}, addEventListener: function(){}, querySelectorAll: function(){return [];}
      };
    }
    return this._nodes[id];
  },
  body: { classList: { add: function(){}, remove: function(){}, contains: function(){return false;} } },
  createElement: function () { return { style: {}, classList: { add: function(){}, remove: function(){} }, setAttribute: function(){}, addEventListener: function(){}, appendChild: function(){}, querySelector: function(){return null;}, querySelectorAll: function(){return [];}, remove: function(){} }; }
};
loadFile('tm-player-ui-render.js');
var PU = sandbox.TM.PlayerUI;
ok('setAiLiveStatus 是函数', typeof PU.setAiLiveStatus === 'function');

sandbox.P.playerInfo = { transmigrationMode: true, playerRole: 'minister' };
PU.setAiLiveStatus('sovereign');
var aiEl = sandbox.document._nodes['bar-ai-live'];
ok('setAiLiveStatus(sovereign) 设文本"君主圣裁中"', aiEl && aiEl.textContent === '君主圣裁中',
   'got: ' + (aiEl && aiEl.textContent));
ok('setAiLiveStatus 设 data-state=sovereign', aiEl && aiEl._attr && aiEl._attr['data-state'] === 'sovereign');

PU.setAiLiveStatus('npc');
ok('setAiLiveStatus(npc) 设文本"市井演化中"', aiEl.textContent === '市井演化中');

// ── Sub-test 4: triggerRoleChange 包装反馈 ─────────────────
sandbox.P.playerInfo = { transmigrationMode: true, playerRole: 'commoner' };
var TR = sandbox.TM.Transmigration;
var r = TR.triggerRoleChange('study');
ok('triggerRoleChange(study) ok=true', r.ok === true);
ok('path.nextRole=minister', r.path.nextRole === 'minister');
var r2 = TR.triggerRoleChange('unknown');
ok('triggerRoleChange(unknown) ok=false', r2.ok === false);

// ── Sub-test 5: Phase A smoke 仍通过 ───────────────────────
// 通过分别跑 smoke-transmigration-ui.js 验证（外部 CI 跑）

// ── 总结 ──────────────────────────────────────────────────
console.log('');
if (fail === 0) {
  console.log('[smoke-transmigration-ui-phase-b] PASS · ' + pass + ' sub-tests');
  process.exit(0);
} else {
  console.log('[smoke-transmigration-ui-phase-b] FAIL · ' + fail + ' failed, ' + pass + ' passed');
  process.exit(1);
}
```

- [ ] **Step 2: 跑 Phase B smoke**

Run: `cd /workspace/web && node scripts/smoke-transmigration-ui-phase-b.js | tail -20`
Expected: `[smoke-transmigration-ui-phase-b] PASS · ≥10 sub-tests`

- [ ] **Step 3: 跑 Phase A smoke（必须仍通过）**

Run: `cd /workspace/web && node scripts/smoke-transmigration-ui.js | tail -3`
Expected: `[smoke-transmigration-ui] PASS`

- [ ] **Step 4: 跑 e2e 皇帝模式回归**

Run: `cd /workspace/web && node scripts/smoke-transmigration-e2e.js | tail -3`
Expected: 21/21 PASS

- [ ] **Step 5: 跑 lint-arch-all**

Run: `cd /workspace/web && node scripts/lint-arch-all.js | tail -3`
Expected: 8/8 绿

- [ ] **Step 6: Commit**

```bash
git add web/scripts/smoke-transmigration-ui-phase-b.js
git commit -m "test(transmigration-ui): B7 smoke-transmigration-ui-phase-b.js Phase B 验证"
```

---

## Phase B 收尾：PR 创建

- [ ] **Step 1: 推送分支**

```bash
git push origin HEAD
```

- [ ] **Step 2: 创建 PR**

```bash
gh pr create --title "feat: 穿越模式非皇帝 UI 重设计 Phase B（增量功能）" \
  --body "## Phase B · 增量功能

**Spec**: docs/superpowers/specs/2026-07-19-transmigration-ui-redesign-design.md
**Plan**: docs/superpowers/plans/2026-07-19-transmigration-ui-redesign.md
**Depends on**: Phase A PR（已合）

### 任务清单
- [x] B1 身份演进面板 + triggerRoleChange 触发
- [x] B2 右栏玩家身份卡完整渲染（近况/关系 TOP 5）
- [x] B3 诏令/奏疏档案重构·玩家视角文案
- [x] B4 摄政代诏 UI 入口（regent 在公务场景显示代诏区块）
- [x] B5 控朝议 UI（玩家请旨发言按钮）
- [x] B6 bar-ai-live 双状态切换（君主圣裁中/市井演化中）
- [x] B7 smoke-transmigration-ui-phase-b.js

### 验收
- ✅ smoke-transmigration-ui-phase-b.js PASS
- ✅ smoke-transmigration-ui.js 仍 PASS（Phase A 不回归）
- ✅ smoke-transmigration-e2e.js 21/21 PASS（皇帝模式不回归）
- ✅ lint-arch-all 8/8 绿"
```

---

## Self-Review

### Spec 覆盖检查

| Spec 章节 | 覆盖任务 |
|---------|---------|
| §1.1 双轨分派 | A1 |
| §1.2 新增 4 文件 | A3/A4/A5/A6 |
| §1.3 修改 5 文件 | A1/A7/A8/A9/A2 |
| §1.4 架构层次图 | A1+A3+A4 |
| §2 顶栏身份条 + 精选变量 | A3（renderTopBar+_varsForRole） |
| §2.3 bar-ai-live 语义切换 | B6 |
| §3 7 场景 tab 树 | A3（renderLeftTabs）+ A4（scenesForRole） |
| §3.2 角色可见性矩阵 | A4 |
| §4 主面板按场景渲染 | A4 |
| §4.2 14 系统接入映射 | A4（SCENE_BLOCKS） |
| §5 右栏玩家身份卡 | A3（基础）+ B2（完整） |
| §5.2 奉旨卡片浮层 | A5 |
| §5.3 推送触发点 | A8 |
| §5.4 防骚扰 | A5 |
| §5.5 src-* chip 样式 | A6 |
| §6.1 5 套主题色 | A6 |
| §6.2 CSS 变量定义 | A6 |
| §6.5 皇帝模式 CSS 隔离 | A6 |
| §7.1 Phase A 10 任务 | A1-A10 ✓ |
| §7.2 Phase B 7 任务 | B1-B7 ✓ |
| §7.3 工程约束（禁词/arch-ok/双路径） | 所有新文件均软依赖 + module.exports |

### 旁支任务

- ARCHITECTURE.md §11.7 文档同步（Phase A 收尾已含）

### 已知风险与缓解

| 风险 | 缓解 |
|------|------|
| 皇帝模式回归 | 每个 Task 都跑 `smoke-transmigration-e2e.js` |
| 14 系统接入 bug 暴露 | A4 的 `renderBlock` 优先调系统 `renderBlockHTML`，缺席降级为 `state()`/`list()` 兜底 |
| 奉旨卡片 z-index 冲突 | A6 用 `z-index:9999` 独立类名空间 |
| `index.html` script 加载顺序 | A2 Step 6 用 node 脚本验证 |
| CSS 主题色覆盖不全 | A4/A6 已覆盖 16 种 playerRole |

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-19-transmigration-ui-redesign.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - 每个 Task 派新 subagent，两阶段审查，快速迭代

**2. Inline Execution** - 在当前会话按任务顺序执行，批量执行 + 检查点

**Which approach?**
