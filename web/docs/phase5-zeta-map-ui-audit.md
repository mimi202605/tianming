# Phase 5 P5-ζ Map/UI Prep Audit

date·2026-05-04 · mode·**read-only prep audit·doc-only**·owner·Codex (Claude prep)

> 模式·与 phase5-{beta·gamma·delta·epsilon} 同·doc-only·提供 sub-ns 形状候选·命名冲突点·留 window 范围·与 P4-α-1/β-1 协同·

## 0·背景

P5-ζ 是 Codex 第二 slice·**Map cluster 9 文件 (P4-α-1 后) + UI cluster 4 文件**·

P3/P4 历史·

| round | 改动 |
|---|---|
| P4-α-1 (Claude) | map-recognition 5→1 merge·-4 files·HTML 5 tag → 1 |
| P4-α-2 (defer) | map-converter+integration+display 3 文件保独立·**by design split** |
| P4-β-1 (Codex) | tm-icons + modal-system + settings-ui + cheatsheet-overlay → tm-ui-foundation·-3 runtime |
| R87 | TM.MapSystem facade (17 fn whitelist) + .open helper (R106) |
| R200 (P5-α) | TM.Map alias TM.MapSystem·rename canonical·alias 留 |

## 1·Cluster 现状·13 文件·14119 行

| 文件 | 行 | sub-ns 候选 |
|---|---|---|
| **Map runtime (4 文件)** | 5390 | |
| `tm-map-system.js` | 2304 | TM.Map.system (R87 facade 已建·17 fn) |
| `map-recognition.js` | 2268 | TM.Map.recognition (P4-α-1 merged·5 strategy) |
| `map-converter.js` | 381 | TM.Map.converter (数据层) |
| `map-integration.js` | 438 | TM.Map.integration (逻辑层·路径/补给/AI context) |
| `map-display.js` | 367 | TM.Map.display (UI 层) |
| **Standalone editors (3 文件)** | 3713 | TM.Map.editors.* |
| `map-editor-pro.js` | 1119 | (小独 .html 工具·sub-ns optional) |
| `map-editor-smart.js` | 2087 | |
| `map-region-editor.js` | 507 | |
| **UI cluster (4 文件)** | 4648 | TM.UI.* |
| `tm-ui-foundation.js` | 421 | TM.UI.foundation (P4-β-1 merged·icons/modal/settings/cheatsheet) |
| `tm-shell-extras.js` | 1089 | TM.UI.shell (御案时政/独召密问/浮动按钮) |
| `tm-topbar-vars.js` | 1315 | TM.UI.topbar (顶栏 7 变量) |
| `tm-var-drawers.js` | 1823 | TM.UI.varDrawers (变量抽屉 v3·R6 后 final 版) |

**总·~14000 行·~360 globals (top file map-system 134)**·

## 2·Sub-ns 设计推荐

### 2.1 TM.Map (R200 alias TM.MapSystem 留·R87 facade 顶层留·扩 sub)

```js
// R205·P5-ζ Map fill
// TM.Map 顶层是 R87 _buildFacade·whitelist 17 fn·已 valid
// 加 sub·分清 4 layer
TM.Map.system       = window.MapSystem;       // 若存在·或保 R87 facade 自身
                                               // (实际 tm-map-system 无 single export·17 fn 散在 window)
TM.Map.recognition  = _buildWindowRefGroup('Map.recognition', {
  recognizeMapImage: 'recognizeMapImage',      // 主入口
  recognizeMapByBorders: 'recognizeMapByBorders',
  recognizeMapByBordersFast: 'recognizeMapByBordersFast',
  recognizeMapByBordersImproved: 'recognizeMapByBordersImproved',
  recognizeMapEU4Style: 'recognizeMapEU4Style'
});
TM.Map.converter    = _buildWindowRefGroup('Map.converter', {
  convertLeafletToGame: 'convertLeafletToGame',
  convertGameToGeoJSON: 'convertGameToGeoJSON',
  convertVoronoiToGame: 'convertVoronoiToGame',
  convertGeoJSONToGame: 'convertGeoJSONToGame',
  loadMapToScriptData: 'loadMapToScriptData',
  loadMapToGame: 'loadMapToGame',
  loadMapFromURL: 'loadMapFromURL',
  validateMapData: 'validateMapData'
});
TM.Map.integration  = _buildWindowRefGroup('Map.integration', {
  generateMapContextForAI: 'generateMapContextForAI',
  generateProvinceContextForAI: 'generateProvinceContextForAI',
  canSupply: 'canSupply',
  calculateDistance: 'calculateDistance',
  calculateMovementCost: 'calculateMovementCost',
  applyAIMapChanges: 'applyAIMapChanges',
  getMapInfluenceRules: 'getMapInfluenceRules'
  // _miFindPath 是 internal helper·留 window·不入
});
TM.Map.display      = _buildWindowRefGroup('Map.display', {
  renderGameMap: 'renderGameMap',
  showMapInGame: 'showMapInGame',
  closeGameMap: 'closeGameMap',
  showProvinceDetails: 'showProvinceDetails'
});
// Editors (.html 独工具·非 game runtime·optional 不入 24 ns·留 window)
```

### 2.2 TM.UI

```js
// R205·P5-ζ UI fill
TM.UI.foundation = _buildWindowRefGroup('UI.foundation', {
  // P4-β-1 已加 TM.cheatsheet etc.·此处补 9 public globals
  TM_ICONS: 'TM_ICONS',
  tmIcon: 'tmIcon',
  gv: 'gv',
  openGenericModal: 'openGenericModal',
  closeGenericModal: 'closeGenericModal',
  showModal: 'showModal',
  closeModal: 'closeModal'
});
TM.UI.shell      = _buildWindowRefGroup('UI.shell', {
  // 御案时政/独召密问·HTML inline 主导·按需挑公共 fn
});
TM.UI.topbar     = _buildWindowRefGroup('UI.topbar', {
  // 7 顶栏变量·渲染入口
});
TM.UI.varDrawers = _buildWindowRefGroup('UI.varDrawers', {
  // R6 后 final v3·主 entrypoint
});
```

## 3·命名冲突

| name | 出处 | 解 |
|---|---|---|
| `init` | mapSystem·shell·topbar·varDrawers 多处 | sub-ns 隔离 |
| `tick` | mapSystem 无 tick·UI 也无 | 无冲 |
| `findPath` | tm-map-system A* (主)·map-integration `_miFindPath` (改名后) | 已分·.system.findPath / .integration._miFindPath |
| `renderMap` | tm-map-system | 唯一·OK |

## 4·留 window·HTML inline (Q4 决议)

- map-editor-{pro/smart/region-editor}·独立 .html 工具·全 HTML inline·**不入 TM.Map**·留 window
- map-display·`renderGameMap` 等 4 fn 入 .display·但 inline button (close/show) 仍走 window
- topbar/shell·HTML inline 重·留 window

## 5·与 P5-η/θ 协同

| slice | boundary |
|---|---|
| P5-η Endturn | endturn 不调 map UI·**无冲**·endturn-province 调 map-integration 数据·走 TM.Map.integration 即可 |
| P5-θ Editor | editor-map.js (984) 是 editor 内地图编辑·入 TM.Editor.map (P5-θ owner)·不冲 TM.Map (game runtime) |

## 6·估时·~2h

| 步骤 | est |
|---|---|
| 实施 R205 段 (~80 行) | 30 min |
| smoke (~30 assertions) | 40 min |
| verify-all 验·target +1 (45/45) | 5 min |
| 头注 update + letter | 15 min |

## 7·关键判断

1. **TM.Map 顶层留 R87 facade 不动**·只加 sub·
2. **map-converter/integration/display 不合并**·by design split (P4-α-2 决议)·sub-ns 各自表达 layer·
3. **Editors 独立 .html 工具不入 24 canonical**·全 HTML inline 留 window·
4. **TM.UI 主 fill 集中在 foundation/shell/topbar/varDrawers 4 sub**·panel 类 (lizhi/guoku/neitang panel) 归 P5-δ/ε R87 facade·**P5-ζ 不动**·

— Claude (P5-ζ prep·2026-05-04)
