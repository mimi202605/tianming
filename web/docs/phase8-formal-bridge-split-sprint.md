# phase8-formal-bridge.js·拆分 + 死码清理 sprint

**date**·2026-05-26·**owner**·Claude·**scope**·拆 864 KB / 10603 行 IIFE + 清 V0 死码 + 收 4 处重复定义·**不动**视觉 / 交互 / 老 sidebar-ui+shell-extras

**paradigm 锚**·复用 `tm-ai-change-applier` 拆分 paradigm (memory `feedback_large_file_split_paradigm`·`project_ai_change_applier_split`)·头部 alias 块·body 0 改动·跨闭包 pure helper 复制别抽象

---

## §1·audit 结果

### §1.1·文件量

```
phase8-formal-bridge.js    864 KB / 10603 行 / 单 IIFE
关键 state·                  window.TM_PHASE8_FORMAL (全局闭包)
持久化层·                    GM._phase8FormalDrafts (6 草稿·capture/restore/clear 三件套·★亮点)
```

### §1.2·死码清单 (确认零外部调用·删后零回归)

| # | 函数 | 行范围 | 行数 | 删因 |
|---|---|---|---|---|
| D1 | `renderActionTrayHtml` (V0) | 876-886 | 11 | L10313 重定义 winner·V0 dead |
| D2 | `openRegionDossier` (V0) | 2507-2557 | 51 | L3654 重定义 winner·V0 dead |
| D3 | `openFactionDossier` (V0) | 2559-2594 | 36 | L4029 重定义 winner·V0 dead |
| D4 | `renderRenwuModuleLegacyV0` | 4552-4565 | 14 | 名字带 LegacyV0·零调用 (含外部 grep) |
| D5 | `renderPinnedPeople` (V0) | 8471-8496 | 26 | Rich 版 L9141 用·dispatch 表 `office: renderPinnedPeopleRich` |
| D6 | `renderWen` (V0) | 8507-8513 | 7 | Rich 版 L9017 用·dispatch 表 `policy: renderWenRich` |
| D7 | `renderGang` (V0) | 8515-8533 | 19 | Rich 版 L9101 用·dispatch 表 `ol: renderGangRich` |
| D8 | `renderMapPanel` (V0) | 8752-8762 | 11 | Rich 版 L8864 用·dispatch 表 `map: renderMapPanelRich` |
| D9 | `renderFinance` (V0) | 8764-8777 | 14 | Rich 版 L8943 用·dispatch 表 `finance: renderFinanceRich` |
| D10 | `renderZhi` (V0) | 8779-8783 | 5 | Rich 版 L9255 用·dispatch 表 `archive: renderZhiRich` |
| D11 | `renderRumor` (V0) | 8785-8793 | 9 | Rich 版 L9162 用·dispatch 表 `rumor: renderRumorRich` |

**合计·~203 行 dead**·全删后 phase8-formal-bridge.js → ~10400 行

### §1.3·KEEP·不删 (有引用)

| 函数 | 行 | KEEP 原因 |
|---|---|---|
| `renderZheng` (V0) | 8498-8505 | dispatch 表 L9268 `issue: renderZheng` 用 |
| `renderArmy` (V0) | 8719-8750 | dispatch 表 L9271 `army: renderArmy` 用 |

两个 V0 还活·dispatch 表混 V0+Rich。**不在 scope·留作 future ROI 考察** (是否统一改 Rich)。

### §1.4·tm-sidebar-ui.js + tm-shell-extras.js 不删 (改回早前判断)

之前 plan-B-LOCKED 提"双层 UI 收口"·但深 audit 发现·

**sidebar-ui.js (869 行) 还活·非死**·提供 7 个 active 功能·
- `renderSidePanels` (~348 行)·`enterGame:after` hook·每次进游戏触发
- `renderGameTech` / `unlockTech` / `renderGameCivic` / `adoptCivic`·科技/市政树
- `openClassDetailPanel` / `openPartyDetailPanel` / `openMilitaryDetailPanel`·3 个详情 modal
- `openPalacePanel` + 6 辅助·宫殿面板 (修缮/移居/新建)

外部调用 grep·9 文件 (tm-player-core / tm-hongyan-office / tm-ai-change-applier / tm-shizheng-panel / tm-endturn-core 等核心)。

**结论**·**双层 UI 收口不在本 sprint** — scope 过大·风险过高 (会牵动 9 个核心文件)·留作未来独立 sprint。

本 sprint 严格只动 phase8-formal-bridge.js 内部。

---

## §2·拆分 paradigm

### §2.1·锚·tm-ai-change-applier 成功 split

memory 验证·
- 头部 alias 块·`const TM_F = window.TM_PHASE8_FORMAL` 等绑回原名
- 跨闭包 pure helper 复制别抽象·收益 > 维护成本
- body 0 改动·只搬位置不改逻辑
- backups 留 `web/backups/2026-05-26-phase8-formal-split/`

### §2.2·module 划分 (按 surface family·非随机切)

```
phase8-formal-bridge.js        ~3500 行  ← 主门面 (IIFE + state + alias + dispatch + 老调用兜底)
  保留·draft persistence + state + bridges + openLegacyTab + renderers dispatch
  
phase8-formal-topbar.js        ~500 行   ← 顶栏 (vars/time/weather popover·action tray)
  renderPreviewTopbarVars / renderTimePopoverHtml / renderWeatherPopoverHtml
  renderActionTrayHtml (L10313 winner)
  
phase8-formal-map.js           ~2000 行  ← 中央地图 (含 region/faction dossier·alerts)
  renderFormalMap / renderFormalMapSoon / updateMapChrome / renderLegend / renderMapSearchResults
  openRegionDossier (L3654 winner) / openFactionDossier (L4029 winner)
  renderMapAlerts
  
phase8-formal-modules.js       ~1800 行  ← 中央 module 分发 (12 kind)
  openModule / renderModule
  renderEdictModule / renderMemorialModule / renderLetterModule / renderRecordsModule
  renderRenwuModule / renderShizhengModule / renderWenduiModule / renderChaoyiModule
  renderKejuModule / renderWenshiModule / renderFinanceModule / renderOfficeModule
  
phase8-formal-drafts.js        ~1200 行  ← formal 起草 panel (诏/朱批/鸿雁/issue/desk)
  renderFormalEdictPanel / renderFormalMemorialPanel / renderFormalLetterPanel
  renderEdictSuggestionItem / renderMemorialCardV4 / renderFormalInboxItem / renderFormalLetterCard
  renderFormalMemorialTransit
  openDeskOverlay / captureDeskOverlayState / updateFormal*Draft 系列
  
phase8-formal-records.js       ~400 行   ← 史 / 记 / 注 (records 4 panel + 5 preview)
  openRecordsMenu / renderRecordCard / renderRecordGroup / renderRecordFilterButtons / renderRecordExportButton
  renderFormalRecord{Shiji/Qiju/Jishi/Biannian}Panel
  renderFormalRecordsPanel
  renderBiannianActiveCard
  openZhao/YueZou/Hongyan/Shilu/ShizhengPreviewPanel
  
phase8-formal-rightrail.js     ~1100 行  ← 右 rail 8 menu + drawer
  openPanel / updateRailActive / updateRailBadges
  renderRightWenduiPanel / renderRightChaoyiPanel
  renderRightArmyDetailCard / renderArmy
  renderMapPanelRich / renderFinanceRich / renderWenRich / renderGangRich
  renderRumorRich / renderPinnedPeopleRich / renderZhiRich
  renderRightClassPanel / renderRightPartyPanel / renderRightOfficeNode
  renderZheng (V0 KEEP) / renderArmy (V0 KEEP)
  renderEventFeed / renderEventTurnMenu / openEventDetail
  rightChaoyiModeLabel / rightSelectedPersonFromData / rightAppendWenduiHistory 等
```

合计·7 文件·~10400 行 (清死码后)·平均 ~1500 行/文件·**最大 ~3500 (主门面)**·均合理。

### §2.3·load 顺序 (index.html)

```html
<!-- 主门面 IIFE 必须最先 -->
<script src="phase8-formal-bridge.js?v=20260526-split"></script>

<!-- 6 个 module 同闭包扩展·任何顺序均可 -->
<script src="phase8-formal-topbar.js?v=20260526-split"></script>
<script src="phase8-formal-map.js?v=20260526-split"></script>
<script src="phase8-formal-modules.js?v=20260526-split"></script>
<script src="phase8-formal-drafts.js?v=20260526-split"></script>
<script src="phase8-formal-records.js?v=20260526-split"></script>
<script src="phase8-formal-rightrail.js?v=20260526-split"></script>
```

每个 module 头部·

```js
(function(){
  'use strict';
  var state = window.TM_PHASE8_FORMAL;   // 主门面已 init·这里 alias
  if (!state) { console.error('[phase8-formal-{module}] TM_PHASE8_FORMAL not init'); return; }
  
  // 跨闭包 pure helper·复制别抽象 (paradigm)
  function esc(s) { ... }
  function findPerson(id) { ... }
  
  // module 真正函数 body·0 改动从 bridge.js 搬来
  function renderFormalMap() { ... }
  ...
})();
```

主门面 bridge.js 暴露·

```js
window.TMPhase8FormalBridge = {
  openModule: openModule,
  home: home,
  // ...
};
```

各 module 通过 `TMPhase8FormalBridge.xxx()` 互调·或直接 `state.xxx` 访问共享状态。

---

## §3·实施 phase

### Phase 0·prep (~1h)

```
- backup phase8-formal-bridge.js → web/backups/2026-05-26-phase8-formal-split/bridge.pre-split.js
- 跑 baseline smoke·记录全 pass 数 (确认 split 后零回归)
- grep 中文 token 数量·记录·防翻译事故 (memory feedback_chinese_string_translation_during_refactor)
```

### Phase 1·清死码 (~1h)

```
D1-D11·11 dead 函数·~203 行·按行号倒序删 (避免行号偏移)
跑 smoke·零回归验证
git diff 行数预期 -203·中文 token 数量不变
```

### Phase 2·skeleton (~2h)

```
新建 6 个 module 文件·全是空 IIFE skeleton·head alias 块·
index.html 加 6 script 标签
开 browser dev-start.bat·验空 module load 不报错
```

### Phase 3·迁移 module·分 6 wave 各 ~3-5h

每 wave·
1. 从 bridge.js 剪 surface family 函数 → 粘到 module.js
2. 检查 module 头部 alias 是否含足够 helper (esc/findPerson/格式化 etc)·补 alias
3. bridge.js 留 0·确认无 dangling 引用
4. 跑 smoke + browser dev-start.bat 验该 surface 仍工作
5. commit·标签 `phase8-split-wave-N-{module-name}`

```
Wave 1·records.js     (相对小·400 行·先验 paradigm)
Wave 2·topbar.js      (~500 行)
Wave 3·rightrail.js   (~1100 行)
Wave 4·drafts.js      (~1200 行)
Wave 5·modules.js     (~1800 行)
Wave 6·map.js         (~2000 行·最大·留最后)
```

总 Phase 3·~20-30 h·分 3-5 d

### Phase 4·验证 + cleanup (~3h)

```
全 smoke (~830 case) 必须零回归
browser dev-start.bat 跑·手 click 全 surface 验:
  - 顶栏 var 印石 / time popover / weather popover
  - 地图 click region/faction popup
  - 8 menu rail open/close + 内容渲染
  - desk overlay 起草 + GM persistence
  - records 5 panel
  - 12 module 全 dispatch
  - 老 sidebar-ui+shell-extras 仍正常 (科技/市政/阶层/党派/宫殿)
中文 token 数量·全文比对·必须 0 diff (paradigm·feedback_chinese_string_translation_during_refactor)
```

---

## §4·风险 + 缓解

| 风险 | 概率 | 严重度 | 缓解 |
|---|---|---|---|
| pure helper 跨 module 漏带·undefined error | 高 | 高 | head alias 块 + 复制 helper (非抽象 shared utility)·跑 smoke 即可发现 |
| state 闭包访问失败 (race·module load 顺序) | 中 | 高 | 主门面 bridge.js 必先 load + init state·module 头部 guard `if (!state) return` |
| 重复定义后没真删·两版本同 ID | 中 | 中 | git diff 看每 wave 减/增行数对账·grep `function openModule` 整文件全·确认每函数 = 1 处 |
| 中文 string 翻译事故 | 低 | 高 | Phase 0 + Phase 4 grep 中文 token 数量比对·必 0 diff |
| 老 sidebar-ui+shell-extras 因 phase8 拆分意外破坏 | 低 | 高 | 不动 sidebar-ui / shell-extras·browser test verify |

---

## §5·工时估

| Phase | 时长 |
|---|---|
| Phase 0·prep | 1 h |
| Phase 1·清死码 | 1 h |
| Phase 2·skeleton | 2 h |
| Phase 3·6 wave 迁移 | 20-30 h |
| Phase 4·验证 + cleanup | 3 h |
| **合计** | **27-37 h** ≈ **3-5 d** |

---

## §6·非 scope (本 sprint 不做)

- ❌ 双层 UI 收口 (删/隐 sidebar-ui + shell-extras) — 牵动 9 核心文件·留独立 sprint
- ❌ V0 → Rich 统一 (renderZheng / renderArmy 仍 V0) — dispatch 表混·改要谨慎·留独立 sprint
- ❌ 视觉 / 交互优化 — 本 sprint 是结构整理·不动 UX
- ❌ CSS section 拆分 — 多在 styles.css / 各 preview.css·非 phase8-formal-bridge.js 内
- ❌ 新功能 — 严守 paradigm·body 0 改动

---

## §7·ship readiness

- 全 smoke 零回归
- browser e2e click 全 surface 工作
- 中文 token 数 0 diff
- bridge.js 主门面 ~3500 行·6 module 各 400-2000 行·全 < 5000
- git history 留 6 wave commit·每 wave 可独立 revert

ship 路径·跟过去一样·changelog → GitHub push (Path B) → 热更包 → server-side unzip → Cloudflare verify。

— Claude·2026-05-26 (拆分前 plan·待 user 批准)
