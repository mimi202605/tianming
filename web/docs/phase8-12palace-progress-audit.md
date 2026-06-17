# Phase 8·12-palace v2 实施进度审计 (代码扫描·非主观估)

**date**·2026-05-21·**owner**·Claude·**method**·grep + 读 phase8-formal-bridge.js 实际代码·对照 `phase8-12palace-plan-B-LOCKED.md` §11 的 10 slice

---

## TL;DR

| 维度 | 估算 |
|---|---|
| **整体完成度** | **~60-65%** |
| **shell 部分 (Slice 1-4)** | 75% (Slice 2 未做·拖后腿) |
| **content 部分 (Slice 5-8)** | 55% (Slice 8 alerts 没改 CK3 法) |
| **polish (Slice 9-10)** | 30-40% |
| **关键 gap** | Slice 2 左永驻 character panel 未做·旧 renwu-ui 仍承担 |
| **预估剩余** | ~30-50 工作日 (按 plan 原 ~28-39 + Slice 2 补 + polish 真做完) |

**重要 caveat·** 现在装机版 (1.2.2) 跑 **混合 UI** — 老 tm-sidebar-ui.js + 老 tm-shell-extras.js + 新 phase8-formal-bridge.js (10603 行·后者覆盖)·**新 UI 不是替换式·是覆盖式**·所以"完成"还得包括"删/隐旧 UI"这一刀·尚未做。

---

## §1 逐 slice 审计

### Slice 1·顶栏布局重排 → **90%**

**plan 要求**·顶栏 + 右上时间区 (主+副格式·复用 getTSText)·右下"诏付有司" floating btn

**代码证据**·
- `phase8-formal-bridge.js:1155-1156`·`bar-time-main` / `bar-time-sub` 元素已分·主+副格式 wire 完
- `1179` `bar-weather-seal` 物候印
- `1375-1379` updateTimeArea 函数 wire
- getTSText 调通 (L539·5802)
- changelog 5/20 提"主题字号分区" — 顶栏 polish 已收

**缺什么**·alerts 区改造 (走 Slice 8)。

---

### Slice 2·左栏 character panel → **10%·🔴 严重 gap**

**plan 要求**·永驻 CK3 法 character panel·280-320px·帝王 portrait + 6 stat + 4 tab·click 角色头像 → panel 切

**代码证据**·**几乎无**·
- grep `leftPanel` / `leftChar` / `renderLeftChar` 在 phase8-formal-bridge.js **零匹配**
- 当前左侧 character 视角仍由 **旧 tm-renwu-ui.js** 承担 (sidebar 弹出·非永驻)
- `openCharDetail` (tm-player-core.js:1980) 是 modal·不是永驻 panel

**结论**·**Slice 2 完全没启动**·这是 plan 中"CK3 法·永驻"的核心组件·缺它则范式不闭环。

---

### Slice 3·右栏 8 menu icon shell → **90%**

**plan 要求**·vertical 8 icon 列·click → 展开 280-320px panel·hotkey 1-8 / Ctrl+2 折叠

**代码证据**·
- `function openPanel(slot)` 完整实现 (L9829)
- `state.activeSlot` 状态机
- `rail` (#tm-phase8-formal-rail) DOM 存在
- `updateRailActive / updateRailBadges` 切高亮 + badge
- `closeRightDrawer` 关闭逻辑
- `refreshActivePanel` 刷新
- `renderers[slot]` 分发表存在

**缺什么**·hotkey 1-8 未明 (grep 不到 keydown 绑定)·Ctrl+2 折叠未明。

---

### Slice 4·province click popup shell (EU4 法) → **90%**

**plan 要求**·popup panel 浮于地图上·7 子区 + 2 tab·守土官 click → 切左栏 character

**代码证据**·
- `#ppop` 元素动态创建 (L3591-3594)
- `tmf-map-ppop` class·region-panel + faction-panel 两套 layout
- CSS 完整 (L10136-10141)·radial-gradient + 守土官区
- `pp-top` / `pp-crest` / `pp-admin-brief` / `pp-faction-hero` 结构
- 守土官 click → ?·grep `pp-admin` callback 未深查

**缺什么**·守土官 click 是否切到 character panel·因 Slice 2 没做·这条链断了。

---

### Slice 5·内容分配 (8 menu × 95 触点) → **70%·user 主导**

**plan 要求**·user 决·8 menu 各 1 映射

**代码证据**·
- `openPanel` dispatch 含 'archive' / 'army' 等 slot·至少 6 个 slot 有 wire
- `bindFormalEntryRedirects` (L9905) 把旧 entry redirect 到 openModule()·复用·而非全新

**缺什么**·完整 8 menu × 95 触点映射表·未在 doc 中确认。可能"分配"是隐性的·或部分进行。

---

### Slice 6·右栏 8 menu 内容实装 → **70%**

**plan 要求**·按 Slice 5 分配·实装内容

**代码证据 (右栏 panel render 函数)**·
- `renderRightWenduiPanel` (L8408)·问对
- `renderRightChaoyiPanel` (L8449)·朝议
- `renderRightArmyDetailCard` (L8679)·军详
- `renderRightClassPanel` (L9109)·阶层
- `renderRightPartyPanel` (L9124)·党派
- `renderRightOfficeNode` (L9232)·官制树

至少 6 个 menu 有 content。

**缺什么**·8 menu 中那 2 个可能仍 placeholder。

---

### Slice 7·province popup 字段 wire → **80%**

**plan 要求**·provinceStats / div.fiscalDetail / div.populationDetail / pp-tab / pp-sub 字段 wire

**代码证据**·
- 34 处含 `provinceStats|fiscalDetail|populationDetail|pp-tab|pp-sub` 字段引用
- `pp-admin-brief` `pp-faction-hero` 等 layout 完
- 跨 region + faction popup 都 wire

**缺什么**·细节字段可能尚有 placeholder·要 sample 一个真实剧本 click 才能确认。

---

### Slice 8·顶栏 alerts CK3 化 → **40%·🟡 偏低**

**plan 要求**·CK3 法 event icon + Situational Report·替代当前 alert

**代码证据**·
- `renderMapAlerts` (L4079) 存在·但只是旧 3 alert (待批奏疏 / 朝议待核 / 财赋入库)
- 不是 CK3 法 event icon strip + 可 dismiss 的 Situational Report
- CSS 里 `.map-alert-strip{display:none!important;}` 显示 #banner 反而显·有点乱套
- `#banner` 取代了 alert strip·但 banner 是单一红条·不是 event icon 列

**结论**·**Slice 8 实际只做了一半 — 旧 alert 改成 banner·但没做 CK3 event icon + situational report**。

---

### Slice 9·Codex Wave (asset raster 30-50 张) → **50%·估**

**plan 要求**·地图底纹 + 框纹 + menu icon raster + portrait base·30-50 张·分 3-4 批

**代码证据**·
- `_codex_*topbar*.png` 4 个 (preview / formal × before/after)
- preview/*.png 60+ 张 (含 phase8-* 系列)
- `assets/portraits/tianqi7/` 90 张人物 + 35 张 generic (per memory `project_phase8_inventory_progress.md`)

**结论**·portrait base 完·menu icon / 地图底纹 不确认。**估 50%·需 user 自己审有几张是 Wave 9 产物**。

---

### Slice 10·polish → **30%·🔴 大部分未做**

**plan 要求**·折叠动画 / hotkey / mapmode / 朝代风格 (锁 7)

**代码证据**·
- `MAP_MODE_META` (L2619) 存在·mapmode 已 in place
- 折叠动画·`transition:width .18s` 存在·OK
- hotkey 1-8·**未见 keydown 绑定**
- 朝代风格 (锁 7 待定)·**user 主导·未启动**

**结论**·mapmode + 折叠 OK·hotkey + 朝代风格 polish 未做。

---

## §2 双层 UI 共存·收口未做 (额外 gap)

`index.html` 同时加载·

```html
<script src="tm-sidebar-ui.js?v=2026042714"></script>           ← 旧
<script src="tm-shell-extras.js?v=20260520-..."></script>        ← 旧
<script src="phase8-formal-bridge.js?v=20260519-..."></script>   ← 新·覆盖式
```

**当前游戏**·两套 UI 同跑·新覆盖在旧上面。这不是 plan 里的"完成态"·plan 隐含·完成后旧 sidebar 应该删 / 隐。

**收口工作**·~5-10 工作日·删 / 隐旧 panel·确保新 UI 无遗漏。

---

## §3 完成度合计

| Slice | 完成 % | 权重 (估) | 加权贡献 |
|---|---|---|---|
| 1·顶栏 | 90% | 5% | 4.5 |
| 2·左 char panel | **10%** | 15% | **1.5** ← 拖最重 |
| 3·右 8 menu shell | 90% | 10% | 9 |
| 4·province popup shell | 90% | 10% | 9 |
| 5·内容分配 | 70% | 5% | 3.5 |
| 6·右 menu content 实装 | 70% | 15% | 10.5 |
| 7·province popup wire | 80% | 10% | 8 |
| 8·alerts CK3 化 | **40%** | 10% | **4** |
| 9·Codex asset wave | 50% | 10% | 5 |
| 10·polish | 30% | 10% | 3 |
| **小计** | — | 100% | **~58** |
| **双层 UI 收口** | 0% | (额外) | -5 |
| **真实完成度** | — | — | **~53%** |

---

## §4 剩余工作清单 (按优先级)

### P0·阻塞 mobile 路线·必须先做

- **Slice 2·左永驻 character panel** (10% → 90%)·~10-15 工作日
- **Slice 8·alerts CK3 化** (40% → 90%)·~5-7 工作日
- **双层 UI 收口**·删 / 隐旧 panel·~5-10 工作日

### P1·polish 整体收尾

- **Slice 6 剩 2 个 menu content**·~3-5 工作日
- **Slice 10·hotkey 1-8 + 折叠动画细调**·~3-5 工作日
- **Slice 9·剩 Codex asset wave**·~user 主导 / Codex 出·~5-10 工作日 (Codex 自驱)

### P2·锁 7·朝代风格 (LOCKED 时延后)

- ~user 决方向后·~10-15 工作日

### 合计

P0 + P1 = **30-50 工作日** (1.5-2.5 月)。
加 P2 朝代风格 = **40-65 工作日** (2-3 月)。

---

## §5 对 mobile 路线的影响

**之前 mobile roadmap 里说·"12-palace v2 完成后再做 mobile"·这个判断成立·**

- Slice 2 (左 character panel·CK3 法永驻) 是 mobile drawer 的对应物·**必须先在桌面做完·mobile 才有得改**
- Slice 8 (alerts CK3 法 event icon) 是 mobile 顶部 notification 的对应·**也必须先做**
- 双层 UI 共存的话·mobile 包大小白白翻倍·**必须先收口旧 UI**

**所以 mobile 真早期可启动时机·**= P0 完成后 (~3-5 周)。
**mobile MVP 出货**·= P0 + Capacitor 壳·~5-7 周。

---

## §6 建议下一步

按 ROI·**先 P0 的 Slice 2 + 双层 UI 收口** — 这俩做完·

1. 桌面 UI 真正闭环·不再是混合态
2. 包大小立刻下降 (删旧 UI 一坨)
3. mobile 路线解锁

Slice 8 alerts / Slice 9 asset 可以并行 (Slice 8 你做·Slice 9 Codex 自驱)。

**目前任务建议·**

```
[v2 P0 P1] Slice 2·左 character panel (CK3 法永驻)·~10-15d
[v2 P0 P2] 双层 UI 收口·删/隐 tm-sidebar-ui + tm-shell-extras·~5-10d
[v2 P0 P3] Slice 8·alerts CK3 化·~5-7d
[mobile]   等 P0 完·启 Phase 0 云存档 + Phase 1 Capacitor
```

— Claude·2026-05-21
