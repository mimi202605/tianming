# Phase 8-α deepdive·**35 finding·8 轮调查·UI 全貌锁**

date·2026-05-05·status·**lock·Codex mood board 落地 + 8-β/γ/δ/ε/ζ/η/θ/ι/κ 各 sub-phase 必读**·owner·Claude (8-α)

依据·`phase8-alpha-prep.md` (高层 audit) + 8 轮 deep grep / read·共发现 **35 个 hard 约束**·按 11 类组织·**R6/7/8 (12 finding) 为 raster-only reset 后补·重在 runtime 注入 / 通知层 / 辅件**·

---

## 0·doc 与其他 phase8 doc 的关系

```
phase8-alpha-prep.md       (高层 audit·HTML 区域 + CSS 区段 + Token + 5Q)
        +
phase8-alpha-deepdive.md   (本 doc·35 finding·实操约束·R1-8)
        +
phase8-beta-prep.md        (UI baseline 工具 + 20 屏 + demo save)
        =
Phase 8 启动条件·待 Codex mood board (B 重做 + A 6 sub-board) ACK 后启 8-β
```

**本 doc 不重复 prep doc 内容**·仅补 prep doc 没覆盖的实操约束·

---

## 1·11 类·35 finding 全清单

### A·icon / 图形系统 (3 finding)

#### A.1·tmIcon + 25 SVG (stroke=currentColor) 已存·**21 rail / 6 fab / 4 启动菜单未用**

`tm-ui-foundation.js` L17-83·25 SVG icon·

```
游戏标签页·scroll memorial dialogue chronicle office qiju event history
资源指标·treasury grain troops prestige execution strife unrest
操作·save load settings map policy agenda person faction end-turn close
风闻录·drum rumor letter whisper
```

**模式**·`stroke="currentColor"`·**主题切换时 icon 颜色随 theme 变**·

**约束**·Codex 21 篆刻 SVG (B 板重做版)·**必加进 `TM_ICONS` 对象**·走 stroke=currentColor 模式·

**8-δ 实施**·rail 21 按钮 / 6 fab / 4 启动菜单 → tmIcon('shi') 调·

#### A.2·map-display.js Canvas 与 CSS token 不通

`map-display.js` L37·`ctx.fillStyle = '#1a1a1a'` 硬编码·

**约束**·主题切换时 Canvas 不会自动跟随·**必须 dispatch event + redraw**·

**8-δ 实施**·

```js
// 主题切换时
window.dispatchEvent(new Event('tm:theme-changed'));
// map-display.js 监听
window.addEventListener('tm:theme-changed', function() {
  var bgColor = getComputedStyle(document.body).getPropertyValue('--color-background');
  // redraw with new bgColor
});
```

#### A.3·_initMobileNav 移动端底部导航 (`window.innerWidth <= 768`)

`tm-game-loop.js` L1424-1453·4 button (概览 / 诏令 / 结算 / 操作)·

**约束**·**Phase 8 必做 responsive**·

- 桌面·左 rail + #gc + 右 rail
- 移动·顶 bar + 主屏 + 底 nav (现 mobile-nav)
- Codex mood board 4 张全是桌面比例·**移动 layout 待 8-δ 设计**

### B·主题系统 (2 finding)

#### B.1·**2 套 theme 系统并存**·8-γ 必合并 (+1-2d)

| 系统 | 文件 | localStorage key | 实现 |
|---|---|---|---|
| `ThemeSystem` | `tm-audio-theme.js` L338+ | `tianming_theme` | `setAttribute('data-theme', name)` |
| `_tmApplyTheme` | `tm-shell-extras.js` L999 | `tm.theme` | (待精读·可能也是 setAttribute) |

**约束**·Phase 7 之前残留·**8-γ token 重做前必先合并**·

**8-γ 实施 step 1 (合并·~1-2d)**·

1. 选保留套 (建议 ThemeSystem·名字一致)
2. `_tmApplyTheme` 内逻辑 merge 进 ThemeSystem·或改作 alias
3. localStorage 迁数据 (启动时检测·`tm.theme` → `tianming_theme`)
4. 单一 `data-theme` 来源
5. baseline smoke·主题切换 → 视觉变·smoke 验证

#### B.2·**memory-ui.js 自注入 style·全 hex 硬编码**

`tm-memory-ui.js` L23-74·`_injectStyle()` 注入 ~50 行 CSS·

```js
'#tm-mem-panel{background:#1a1410;color:#d4c5a9;border:1px solid #6a5635;...}'
'#tm-mem-panel .mem-hdr{background:#2a1f17;...}'
// 全 hex·全无 var()
```

**约束**·主题切换时 12 表 UI 视觉不变·

**8-θ 实施**·

- 删除 `_injectStyle`
- class 化·新建 `.mem-panel / .mem-hdr / .mem-nav / .mem-tbl` 等到 styles.css
- 颜色用 token (var(--color-elevated)·var(--color-foreground)·...)
- 工作量 ~1d

### C·主屏 #G layout (4 finding)

#### C.1·#gc 是 6 tab 容器·**非 modal**

`switchGTab(null, 'gt-edict')` 在 #gc 内切 tab·**6 tab 全在 #gc 内**·

```
gt-edict     拟诏     诏书草拟·edict-active list·诏书润色卷轴
gt-letter    发信     鸿雁编辑·收件人·正文·封口印
gt-wendui    召对     问对气泡·人物头像·选项
gt-chaoyi    朝议     弹 chaoyi-modal (例外·非 #gc 内)
gt-memorial  奏疏     奏疏列表·折子叠·朱批
gt-jishi     纪事     12 类纪事 timeline
```

**约束**·Codex A 板没画 #gc 内 tab dense info·**必补 sub-board**·至少 2-3 张 (拟诏 / 奏疏 / 纪事)·或全 6 张·

#### C.2·**`_renderShellExtras*Left/Right` ~1700 行 JS innerHTML 渲染**

`tm-shell-extras.js`·

- L27-507·`_renderShellExtrasLeft(gl)`·~480 行·**朝野内情**·势力格局 / 党派纷争 / 阶层动静 / 军事要务 / 行政区划
- L509-1080·`_renderShellExtrasRight()`·~580 行·**朕之案上**·朕亲卡 / 十二时辰 / 紧要之臣 / 关系网 / 议题 / 大志 / 岁入岁出 / 近事 / 风闻

**模式**·`document.createElement('div') + innerHTML 模板字符串拼接 + inline style + className 混用 + color hex 直写`·

**约束**·Phase 8-δ 必动 ~1700 行 JS·非纯 CSS 重皮·

**工作量**·+3d (8-δ 内)·

#### C.3·**十二时辰盘是 visual heavy 的元素**·Codex 没画·必补

`tm-shell-extras.js` L555-577·`.gs-time-dial` + 8 time-mark + 转动 hand + center 点·

**当前**·CSS 仿·CSS 写位置·hard-coded transform/translate·

**8-δ 实施**·**Codex 出 1 张真"圭表 / 日晷 / 漏刻"图**·替换 CSS 仿·

**Codex mood board 必补 5th 板**·"中国古代时辰仪器"·圭表 / 日晷 / 铜壶滴漏 / 走马灯 各一·**作十二时辰盘视觉**·

#### C.4·朕亲卡视觉元素 (gs-self-card)

`tm-shell-extras.js` L526-553·

```
头像 (.gs-self-portrait)·圆形 / 方形·有 portrait img 或 fallback 单字
名 (.gs-self-name) + 字 (.gs-self-title 内"字 ?")
官号 + 年龄 + 4 trait (.gs-self-tag.trait-neu)
6 stat bar (智 政 军 交 仁 威·.gs-stat.zhi/zheng/jun/jiao/ren/wei)
五常 (.gs-wuchang)·5 dot (仁义礼智信)·each .gs-wc-dot.hi/mid/lo
```

**约束**·Codex C 板朝服色制人物卡 ≈ 朕亲卡·**Codex C 板视觉直接 map**·5 朝服色 ↔ 6 stat·5 补子 ↔ 5 五常·

### D·modal 系统 (4 finding)

#### D.1·**#turn-modal 1 modal 3 模式复用**

`tm-utils.js` `showTurnResult(html)` + `tm-player-core.js` `openShiji` (L126) + `_renderShijiPanel` (L131) + `_shijiShowDetail` (L168)·

```
showTurnResult(html)
  ├─ 模式 1·当前回合 (tm-utils 调·shijiHistory[idx])
  ├─ 模式 2·史记列表 (openShiji → _renderShijiPanel → showTurnResult)
  └─ 模式 3·详情 (_shijiShowDetail → showTurnResult(sj.html))
```

**约束**·Codex D 板 modal 设计 = 这 1 个 modal 3 模式·**视觉一致**·

**8-ε 实施**·

- _renderShijiPanel 全 inline style → class
- 新建 `.tr-shiji-list / .tr-shiji-card / .tr-shiji-search / .tr-shiji-pagination`
- D 板碑额标题 + 山水内背景 + 3-button 色制 全用上

#### D.2·**朝议 4 模式同 modal·~9300 行 JS·全 inline style**

| 文件 | 行 | 模式 | 命名空间 |
|---|---|---|---|
| tm-chaoyi.js | 243 | 入口·共享气泡 | (混) |
| tm-chaoyi-changchao.js | 3843 | 常朝 | `_cc3_*` |
| tm-chaoyi-tinyi.js | 789 | 廷议 v1 | (旧·待替) |
| tm-chaoyi-yuqian.js | 504 | 御前会议 | `_cy_*` |
| tm-tinyi-v3.js | 3920 | 廷议 v3·新版 | `_ty3_*` |

`tm-chaoyi.js` L26·`modal.innerHTML='<div style="background:var(--bg-1);border:1px solid var(--gold-d);..."'` ·15 行连续 inline style 拼·

**约束**·**Phase 8-ι 必做·全 inline style → CSS class**·新建 `.cy-modal / .cy-header / .cy-body / .cy-input-row / .cy-bubble.*`·

**8-ι 实施**·D 板碑额标题用上·simplify D 板 8 vertical 简笺为 chaoyi 模式 indicator·

#### D.3·**卷宗存档 ~500 行 inline style modal**

`tm-save-manager.js` L323+ "卷宗存档系统·竹简·玉轴·朱印"·

**约束**·**8-ε 改造**·延 D 板 modal 设计 + C 板色制 chip·

#### D.4·**设置 UI 复杂·R22 标"测试外不动"·Phase 8 仅换皮**

`tm-patches.js` L1-512·**400+ 行 innerHTML + 19 个 sXxx 辅助 + API 检测 + 模型连接**·`tm-ui-foundation.js` L155-224 是 placeholder·

**约束**·**Phase 8 重做 settings·仅换皮·不重写 sSaveAPI / sDetectModels 等业务逻辑**·

**8-θ 实施 (仅换皮·~1d)**·

- 字体 + 色 token 更新 (随 8-γ)
- 模态 frame 用 D 板碑额标题
- 内部 form input 用 C 板字段样式
- 不动 19 个 sXxx 辅助

### E·#bar 顶栏 (1 finding)

#### E.1·**顶栏 vars 1315 行 JS**·7 var 独立 render + tooltip

`tm-topbar-vars.js` 1315 行·

```
TOP_BAR_VARS = [
  帑廪 (guoku)     → _renderGuoku    fiscal      → openGuokuPanel
  内帑 (neitang)   → _renderNeitang  fiscal      → openNeitangPanel
  户口 (hukou)     → _renderHukou    population  → openHukouPanel
  吏治 (lizhi)     → _renderLizhi    corruption  → openCorruptionPanel
  民心 (minxin)    → _renderMinxin   minxin      → openMinxinPanel
  皇权 (huangquan) → _renderHuangquan phase3     → openHuangquanPanel
  皇威 (huangwei)  → _renderHuangwei  phase5     → openHuangweiPanel
]
```

每 var 独立 render fn·`_renderGuoku` 单独 ~80 行·处理 3 账本 (money/grain/cloth) + 破产判断 + 趋势箭头 + 警示标签·

tooltip·`.bar-var-tip 富版`·styles.css L626-705·

**约束**·**Phase 8-δ 仅类化 + token 化·不重写 render fn 逻辑**·

**8-δ 实施**·

- className 替换·hex 色 → token
- tooltip 视觉延 D 板 modal 风格
- 1315 行 JS 业务逻辑不动

### F·启动屏 + 新游戏向导 (3 finding)

#### F.1·**ngui 是独立 wizard UI·非主屏 #G**

`styles.css` L4532-4555·`.ngui-topbar / -body / -left (350px tabs+content) / -center (flex 1·black 地图区) / -right (280px·actions·endturn)`·

实际 HTML 在 `tm-launch.js` 内动态生成·querySelector + classList·

**约束**·**Phase 8-ζ 重做启动屏时·ngui 也算**·非仅 #launch + #bar + turn-modal·

**8-ζ 实施**·延 C 板朝服色制 (官选 + 角色配) + D 板 modal frame·

#### F.2·**`showScnSelect` + `previewScenario`·全 inline style**

`tm-launch.js` L118-200+·

- showScnSelect (L118-134)·剧本选择·`.scn-page-title / .scn-grid / .scn-card / .scn-era / .scn-name / .scn-role / .scn-bg`·**inline style 极多** (fixed 按钮·"—— 择一段时日·入其世界 ——"装饰)
- previewScenario (L137+)·~100 行 inline HTML·剧本预览 modal·顶部金线装饰 + 〔name〕+ role + 概述 + 角色信息 + 矛盾 + 统计

**约束**·8-ζ 重做时 inline style → class·

#### F.3·**`backToLaunch` 切屏管理**

`tm-launch.js` L478·控制 launch / bar / E / G / shiji-btn / save-btn 显隐·**inline display 显隐·非 router**·**多个屏共存 in DOM**·

**约束**·**Phase 8 切屏过渡可加 fade / slide 动画**·当前是瞬切·**8-ζ 可加**·非必须·

### G·preview 设计稿 (1 finding)

#### G.1·**preview-shell.html v7 是 Codex 自己的旧设计**

`web/preview-shell.html`·"整体游戏界面·深化美化预览 v7"·**Codex P5/P6 时代做的预览**·

内含·

- 自己的 `:root` tokens (类似 styles.css 但更精细)
- `.gs-*` class 体系 (gs-topbar / gs-seal / gs-wentian / gs-era / gs-weather / gs-vars / gs-var)
- 7 变量类型色 (.v-guoku/neitang/hukou/lizhi/minxin/huangquan/huangwei)

**约束**·**Codex v8 mood board (4 张) 是 v8 起步**·**Codex 可参考 v7 的 token 精细度·然后用 v8 mood 落地**·

**8-γ 实施**·token 精细度参考 v7·色板用 v8 mood + 5Q 答·

### H·命名空间 + 测试 + 类型 (5 finding)

#### H.1·TM.UI 是 facade·实际函数全在 window

`tm-namespaces.js` L632-685·8 子 ns·

```
TM.UI.foundation·tmIcon / openGenericModal / showModal
TM.UI.shell    ·openSideDrawer / closeSideDrawer / renderLeft/Right / applyTheme/Size/BodyFont/TitleFont
TM.UI.topbar   ·vars / render / openAllVarsModal
TM.UI.varDrawers·hukou/minxin/huangquan/huangwei × {open,close,render}
TM.UI.tabs     ·switchGameTab
TM.UI.turnResult·closeTurnResult / navTurn / exportCurrent
TM.UI.cheatsheet
```

**约束**·**Phase 8 改 UI 不破 namespace 接口**·只要 facade 指向的 window 函数签名不变·调用方全 OK·

#### H.2·命名空间严格·`_cc3_* / _ty3_* / _cy_*` 等

每文件有自己的命名空间前缀·非 UI fn 也叫 (e.g. `_ty3_partyMetrics` 是 logic·非 UI)·

**约束**·Phase 8 类化时·**class name 用 namespace prefix**·`.cy-modal / .cy-header` (chaoyi)·`.tr-modal / .tr-body` (turnResult)·`.gs-rail / .gs-drawer` (game shell)·避免冲突·

#### H.3·`_jsEsc` onclick 字符串转义模式

`tm-shell-extras.js` L589·`function _jsEsc(s) { return String(s||'').replace(...)·}`·**inline onclick 字符串拼接普遍**·

**约束**·Phase 8 重做时·**继续 inline onclick 模式·不引入 framework**·与项目"零依赖"原则一致·

#### H.4·**测试基建已成熟**

- `tm-test-harness.js` 421 行·浏览器原生·`?test=1` URL 参数 auto-run
- `scripts/headless-smoke.js` 零依赖 Node vm + DOM stub·**212 测试**
- `scripts/render-smoke.js` UI panel render fn 17 panel
- 项目原则·`"_no_dependencies": true / "_no_build": true`

**约束**·**8-β baseline 必走零依赖路线** (option E·D structural + C visual via Electron Chromium)·非 playwright npm install·

#### H.5·`@ts-check` + `types.d.ts` 已 typed

每 .js 顶部·`// @ts-check / /// <reference path="types.d.ts" />`·

**约束**·Phase 8 改 JS 走 type check·改完 `node --check`·与 `tsc --noEmit` (若有) 通过·

---

### I·runtime style 注入 / load 链 (R6·5 finding)

R6 是 raster-only reset 后补·重在·**Phase 8 改 styles.css 不一定生效·因运行时还有 5 道 override 通道**·

#### I.1·tm-shell-extras 注入 5 个 `<style>`·**override styles.css**

`tm-shell-extras.js`·5 处 `document.createElement('style')`·

| line | id | 内容 | 触发 |
|---|---|---|---|
| 956 | (无 id·_style) | UI extras 一次性 css | 启动时一次 |
| 1020 | `_tmThemeOverride` | `:root{--gold-500/300, --vermillion-*, --celadon-400, --bg-2/3}` | `_tmApplyTheme(name)` 调时 |
| 1050 | `_tmSizeOverride` | `:root{--text-xs..3xl}` 全 size scale | `_tmApplySize(size)` |
| 1066 | `_tmBodyFontOverride` | `:root{--font-serif: ...}` | `_tmApplyBodyFont(font)` |
| 1075 | `_tmTitleFontOverride` | `.home-title,.gs-panel-title,h1..h4{font-family:... !important}` | `_tmApplyTitleFont(font)` |

**约束**·Phase 8 改 `styles.css` 的 `:root` token·**会被 _tmTheme/Size/BodyFont/TitleFont 后注入的 :root 块覆盖** (CSS 后写胜·且 TitleFont 用 `!important`)·

**8-γ 实施**·
1. 把 styles.css 里的 token 默认值视为"出厂"
2. _tmApply* 注入仍是"用户定制覆盖" — 保留
3. **但要改的**·_tmApplyTheme 只识 `plain/ink/vermillion/celadon` 4 种 (L1031)·而 ThemeSystem 有 7 种·**8-γ 合并时·_tmApplyTheme 必扩到 7 (与 B.1 同向)**

#### I.2·`_tmApplyTitleFont` 用 `!important`·**Phase 8 typography 必兼容**

L1073·`.home-title,.turn-summary-bar,.gs-panel-title,.gs-drawer-title,.mem-title,.wdp-title,.hy-title,.bn-title,h1,h2,h3,h4{font-family:"<font>" ... !important;}`·

**约束**·Phase 8 标题字 token (`--font-display` 之类) 不能被 `!important` 摧毁·两个方案·

- (a) 8-γ 时把标题字 token 化·_tmApplyTitleFont 改写 token (而非 !important 覆盖)
- (b) 保留覆盖通道·Phase 8 token 仅作"未定制"默认值

推荐 (a)·**与 _tmApplyTheme 改造一并做**·

#### I.3·**index.html·174 `<script>` + 1 stylesheet**·load 链不可改

L19-552·**174 `<script src="...">` 顺序串接·1 `<link rel="stylesheet">` (styles.css)**·只 1 个外部 CDN (mammoth)·

**约束**·
- Phase 8 不能拆 styles.css 为多文件 (多 link 会破坏 cascade 顺序)
- 新加 phase8 css 必排 styles.css 之后 (后写胜)·或在 styles.css 末尾追加 `@import` (反模式)
- 推荐方案·**styles.css 内追加 Phase 8 区段**·或新 `styles-phase8.css` 在 index.html L18 之后插入

**8-γ 决**·先方案 1 (追加)·8-θ 主题扩展再考虑分文件·

#### I.4·**~72 处 `.style.background / .color / .borderColor` inline mutation**·跨 20 JS 文件

`grep -c "\.style\.\(background\|color\|borderColor\)"` 跨 .js·

| 文件 | 次数 |
|---|---|
| editor-map.js | 13 |
| editor-game-systems.js / editor-crud.js | 各 8 |
| map-editor-smart.js | 7 |
| editor-fiscal.js | 5 |
| tm-chaoyi-* (各) | 3-4 |
| 其他 | 1-3 |

**约束**·Phase 8 token 化·**对 inline style mutation 无效**·

- editor 不动 (Phase 8 仅游戏 UI)
- 游戏 JS 内 inline style mutation·**8-δ/ε/ι 各阶段顺手类化**·或保留作"用户操作动态反馈"
- 重点·`tm-court-meter.js (3) / tm-chaoyi-changchao.js (4) / tm-chaoyi-yuqian.js (4) / tm-fiscal-ui.js (2) / tm-shizheng-panel.js (6)`·**朝议 modal 里这些是 inline 染色逻辑**·D.2 已记·**8-ι 类化时一并整理**

#### I.5·**map-display.js 4 处硬编码 hex**·非仅 1 处

`map-display.js`·`fillStyle / strokeStyle = '...'`·

```
L37   ctx.fillStyle = '#1a1a1a';   // bg
L104  ctx.fillStyle = '#ffffff';   // 区域边界 stroke
L128  ctx.strokeStyle = '#000';    // 文字描边
L149  ctx.fillStyle = '#fff';      // 区域名 fill
```

**约束**·A.2 finding 已说"硬编码"·deepdive 补·**4 处都要 token 化** (`--map-bg / --map-stroke / --map-text-stroke / --map-text-fill`)·**`tm:theme-changed` event 触发 redraw**·

**8-δ 实施**·

```js
function _tmGetMapColors() {
  var s = getComputedStyle(document.body);
  return {
    bg: s.getPropertyValue('--map-bg').trim() || '#1a1a1a',
    boundary: s.getPropertyValue('--map-stroke').trim() || '#fff',
    textStroke: s.getPropertyValue('--map-text-stroke').trim() || '#000',
    textFill: s.getPropertyValue('--map-text-fill').trim() || '#fff'
  };
}
window.addEventListener('tm:theme-changed', function() { drawMap(); });
```

---

### J·通知层 / z-index / responsive (R7·4 finding)

#### J.1·**3 层 NotificationSystem (toast / persist / urgent)**

`tm-utils.js` L134-196·

| 层 | API | DOM | z-index | 用途 |
|---|---|---|---|---|
| flash | `toast(msg)` / `NotificationSystem.flash` | `#toast` (单 div·复用) | 9999 | 日常反馈·2.2s |
| persist | `notifyPersist(msg, icon)` | `#notify-container` 内多 `.notify-persist` | 9998 | 成就 / 里程碑·手动关 |
| urgent | `notifyUrgent(title, detail, onConfirm)` | overlay `.notify-urgent` (动态 append) | 10001 | 战争 / 死亡·全屏遮罩·必须确认 |

**约束**·Phase 8 raster 装饰这 3 层·

- toast 9999·已是 `var(--bg-2) / 1px var(--gold-d)` token·**8-γ 跟随 token 即可·无需 raster**
- persist 9998·建议 8-ε 加印章感装饰 (朱泥背 + 印边·**待 Codex 5th 板后讨论**)
- urgent 10001·全屏 mask·**最适合用 raster 雕版边框 + 朱印水印**·**Codex 后续生 1 张作通用模板**

**记入 Phase 8 backlog (Codex 待生)**·`web/assets/ui/phase8/scenes/notify-urgent-frame.png`·

#### J.2·**z-index 层级表**·Phase 8 不可破

由 grep `z-index:\s*\d+` styles.css·

```
10001  notify-urgent           (全屏紧急·最顶)
9999   .toast / .toast-flash
9998   #notify-container
1005   .ai-gen-modal-bg        (AI 生成弹窗)
1000   modal mask 通用 (.modal-mask·tm-utils)
100    [data-tip]:hover::after (tooltip)
60     .gs-turn-float          (右下浮 fab)
55     .gs-status-bar          (底部状态条)
30     .gs-drawer              (左右抽屉)
20     .gs-rail-left/-right    (12+9 按钮 rail)
10     input/textarea/select   (form pointer-events 兜底)
5      .home-foot              (启动屏底栏)
3      .gs-rel-node.center     (关系图中心)
2      .home-axis/.home-menu/.home-recent  (启动屏内容层)
1      .home-ylian/.corner-flower (启动屏装饰)
```

**约束**·Phase 8 任何新浮层 / 装饰 / overlay·**必落进现有层级**·新增建议保留 `1100, 1200, 1300, 1500` 作 future-modal·`200-500` 作主屏 floating·`70-90` 作 rail-adjacent·

**8-γ 实施**·`styles.css` 顶部加 `--z-toast: 9999; --z-modal: 1000; --z-drawer: 30 ...` token·避免 Phase 8 误用·

#### J.3·**responsive·3 断点 + `.ngui-*` 重排**·设计待补

`styles.css` L4114-4181·

```
≤900px·  .gl/.gr 隐藏·#G 单列
≤1024px· ngui-* 紧凑 + tab 字小
≤768px·  ngui-left/right 折叠为底 drawer·#mobile-nav 56px 底栏 (4 button·概览/诏令/结算/操作)
≤480px·  zz-items 单列·notify 全宽
```

**约束**·
- `.ngui-*` 类只在 `tm-game-loop.js` (5 处) + styles.css 用·`tm-game-loop.js` L1403-1453 是唯一 binder·**legacy naming·与新 `.gs-*` 体系并存**
- Phase 8 移动 layout·**Codex 桌面 raster 重做不能直用**·必再生移动版 raster (1 套桌面 + 1 套移动·或 raster + 移动 CSS-only fallback)

**8-δ 决·暂用 CSS-only 移动**·桌面 raster 在 ≤768px 隐藏·走现 `.ngui-*` mobile rewire·**Codex 不必生移动 raster**·(节省 50% 资产)·

#### J.4·**`@media(prefers-reduced-motion)` 2 处**·Phase 8 动画必从

`styles.css` L181 (全局) + L397 (启动屏)·

```css
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:0.01ms!important;transition-duration:0.01ms!important;}
}
```

**约束**·Phase 8 raster swap·若有 `transition / animation` 装饰 (印章 hover 浮起 / drawer 滑入)·**自动尊重 prefers-reduced-motion**·`!important` 已生效·**Phase 8 新动画也要可被同 selector 关闭**·

---

### K·tooltip / portrait / 时辰盘 (R8·3 finding)

#### K.1·**`[data-tip]` CSS-only tooltip**·无 raster 路径

`styles.css` L526·

```css
.gs-fab-btn[data-tip]:hover::after{
  content:attr(data-tip);
  ... font-family:STKaiti ... color:var(--gold-300) ...
}
```

**约束**·tooltip 是 `attr(data-tip)` text·**Phase 8 不需 raster·走 token 着色即可**·

**8-ε 实施**·扩 `[data-tip]` 到所有按钮 (rail / fab / panel-hdr·~30 处)·非新 tooltip 系统·

#### K.2·**`.ji-char-portrait` `<img>` 已就位**·Codex 出 portrait raster 直插

`styles.css` L2994-2995·

```css
.ji-char-portrait{ ... background:linear-gradient(...); ... overflow:hidden; }
.ji-char-portrait img{width:100%;height:100%;border-radius:50%;object-fit:cover;}
```

`tm-renwu-ui.js` L277·`<img src="'+escHtml(_ch.portrait)+'">` 占位·

**约束**·Phase 8 portrait raster·**character data 加 `portrait` 字段 (URL)** → 自动渲·**无 DOM 变动**·

**8-η 实施**·Codex 生 portrait raster (~50-150 张·按 character 数)·命名 `web/assets/ui/phase8/portraits/{char-id}.png`·`character.portrait = "assets/ui/phase8/portraits/<id>.png"`·

#### K.3·**`.gs-time-dial` 12 时辰盘·8 visible mark + JS-rotated hand**

`tm-shell-extras.js` L555-577·

```
data·     12 时辰 (子丑寅卯辰巳午未申酉戌亥)
visible·  8 mark (子卯午酉 + 4 偏角·CSS top/left % 硬编码)
hand·     `transform: ... rotate(<deg>deg)` JS 算 (_shi*30 - 90)
```

**约束**·5th 板 (Codex 待生·中国古代时辰仪器)·**raster 替换的是 dial 背 + 12 mark 文·指针 hand 必保留 DOM overlay**·

**8-δ 实施**·

```html
<div class="gs-time-dial">
  <img class="gs-time-bg" src="assets/ui/phase8/scenes/time-instrument-rikui.png">
  <!-- 12 mark 不再 inline div·改 background-image 内置 -->
  <div class="gs-time-hand" style="transform:translate(-50%,-100%) rotate(<deg>deg);"></div>
  <div class="gs-time-center"></div>
</div>
```

**注**·若 Codex raster 生 圭表 / 铜壶滴漏 (非圆盘)·**hand overlay 模式破**·只能用 raster + 静态时辰文字 (不再有指针)·**这是设计选择·待 Codex 5th 板出后讨论**·

---

## 2·受影响文件清单·**Phase 8 改动范围**

按文件分·按 sub-phase 标·

### 2.1 HTML 入口

| 文件 | 行 | 8-α prep | deepdive 补 | sub-phase |
|---|---|---|---|---|
| `index.html` | 553 | 主入口·5 大区 | (无补) | 8-δ / 8-ζ |
| `editor.html` | TBD | 编辑器 | **Phase 8 不动** | - |
| 25+ `preview-*.html` | 1421 inline style | 设计稿 | preview-shell v7 = 起步 | 8-κ 决留删 |

### 2.2 主样式 CSS

| 文件 | 行 | 主要 sub-phase |
|---|---|---|
| `styles.css` | 5079 | 8-γ token + 8-δ 主屏组件 + 8-ε 通用组件 + 8-ζ 启动 + 8-θ 主题 |
| `tm-chaoyi-changchao.css` | 1116 | 8-ι |
| `tm-tinyi-v3.css` | 1170 | 8-ι |

### 2.3 UI JS·按 finding 重组

| 文件 | 行 | finding | sub-phase |
|---|---|---|---|
| `tm-ui-foundation.js` | 421 | A.1 (icon)·D.1 (modal) | 8-δ (icon 加) + 8-ε (modal 类化) |
| `tm-shell-extras.js` | 1089 | C.2 (1700 JS·_renderShellExtras*)·B.1 (_tmApplyTheme) | 8-γ (theme merge) + 8-δ (主屏 panel) |
| `tm-topbar-vars.js` | 1315 | E.1 (7 var) | 8-δ (类化 + token·不重写) |
| `tm-audio-theme.js` | 572 | B.1 (ThemeSystem) | 8-γ (合并) |
| `tm-utils.js` | (大) | D.1 (showTurnResult) | 8-ε |
| `tm-player-core.js` | (大) | D.1 (openShiji) | 8-ε |
| `tm-launch.js` | 1167 | F.1 (ngui)·F.2 (showScnSelect / previewScenario) | 8-ζ |
| `tm-game-loop.js` | (大) | A.3 (mobile-nav)·F.1 (ngui inline at L1403) | 8-δ + 8-ζ |
| `tm-save-manager.js` | 816 | D.3 (卷宗存档 ~500) | 8-ε |
| `tm-memory-ui.js` | 508 | B.2 (注入 style hex) | 8-θ (token 化) |
| `tm-patches.js` | 1915 | D.4 (设置 UI ~500) | 8-ι (仅换皮) |
| `tm-chaoyi.js` | 243 | D.2 (chaoyi inline) | 8-ι |
| `tm-chaoyi-changchao.js` | 3843 | D.2 (cc3 mostly logic) | 8-ι (UI 部分) |
| `tm-chaoyi-tinyi.js` | 789 | D.2 (旧·待 deprecate?) | 8-ι (评估) |
| `tm-chaoyi-yuqian.js` | 504 | D.2 (御前) | 8-ι |
| `tm-tinyi-v3.js` | 3920 | D.2 (ty3 mostly logic) | 8-ι (UI 部分) |
| `map-display.js` | 367 | A.2 (Canvas 不通 token) | 8-δ |

**Phase 8 真实 UI 改动 JS·~17000-20000 行 partial 重做**·

### 2.4 测试基建 (8-β)

| 文件 | 行 | sub-phase |
|---|---|---|
| `tm-test-harness.js` | 421 | 不动 (复用) |
| `scripts/headless-smoke.js` | (大) | 8-β (扩 baseline check) |
| `scripts/render-smoke.js` | (大) | 8-β (扩 panel snapshot 比对) |

---

## 3·Phase 8 sub-phase 工作量·**8 轮调查后终值**

| 阶段 | 8-α prep 估 | 8 轮调后 | 调整理由·refer 35 finding |
|---|---|---|---|
| 8-α | 3-5d | done | 本 doc |
| 8-β baseline | 5-7d | 5-7d (hold) | 等 mood board |
| 8-γ token + 主题合并 | 3-5d | **6-8d** | B.1 (2 套合并 +1-2d) + I.1/I.2 (_tmApply* 4→7 主题·title-font 兼容 +1d) + J.2 (z-index token 化 +0.5d) |
| 8-δ 主屏 + rail + #bar | 7-10d | **13-16d** | C.2 (~1700 JS) + E.1 (1315 类化) + A.2 / I.5 (Canvas 4 hex token + redraw) + A.3 / J.3 (responsive·暂 CSS-only) + C.3 / K.3 (十二时辰盘 raster + hand overlay) +6d |
| 8-ε 占位素材 + 组件 + #turn-modal | 5-7d | **8-11d** | D.1 (3 模式类化) + D.3 (卷宗存档) + J.1 (notify-urgent raster frame) + K.1 (data-tip 扩) +3d |
| 8-ζ #launch + ngui + 切屏 | 5-7d | **7-10d** | F.1 (ngui wizard) + F.2 (剧本选择) +2-3d |
| 8-η 最终素材 ~150-200 张 | 10-15d | **12-17d** | K.2 (portrait raster ~50-150 张·Codex 主·+2d Claude 接) |
| 8-θ 主题扩展 + memory-ui token + 设置 UI 仅换皮 | 3-5d | **5-7d** | B.2 (memory-ui) + D.4 (设置仅换皮) + I.4 (~72 inline style mutation 部分类化·8-δ/ε/ι 已分摊·此处补遗) +1-2d |
| 8-ι 朝议 + 廷议 inline style 化 | 5-7d | **8-10d** | D.2 (chaoyi inline class 化) + I.4 (chaoyi-changchao/yuqian/tinyi/court-meter 共 ~14 inline 染色) +2-3d |
| 8-κ closeout | 2-3d | 2-3d | 无变 |
| **总** | ~50-71d | **~64-92d** | +14-21d |

仍在 Phase 7 (~57d) **1.1-1.6 倍范围**·**可控**·R6/7/8 加 ~4-6d 主要在 8-γ/δ/ε·

---

## 4·给 Codex 的 hard 约束 (mood board 落地 + 后续 sub-phase)

### 4.1 mood board (B 重做 + A 6 sub-board + 5th 板)

**B 重做**·21 个具体汉字篆刻·**势 党 阶 军 政 科 物 宫 图 题 声 帮 + 朕 辰 臣 缘 议 志 帑 讯 闻**·篆体 (小篆 / 汉印篆 / 九叠篆)·4 状态 (active / hover / inactive / disabled)·SVG-extractable·stroke=currentColor 模式·

**A 6 sub-board**·#gc 6 tab dense info 各一·或至少 2-3 张 (拟诏 / 奏疏 / 纪事)·

**5th 板·中国古代时辰仪器**·圭表 / 日晷 / 铜壶滴漏 / 走马灯·替换 `.gs-time-dial` CSS 仿 (C.3)·

### 4.2 token 系统 (8-γ Codex 出色板时)

- 7 主题语义已在 5Q Q2 答 lock·default 素宣墨骨 / paper 净宣阅读 / scroll 拓本古卷 / blue 青花瓷 / celadon 汝窑天青 / vermillion 朱印宫墙 / highcontrast a11y 不动
- 2 套 theme 系统并存·8-γ 必先合并 (B.1)·**Codex 先答合并方案**·或我 8-γ 启动时合并

### 4.3 字体 (Q3 答 + deepdive 补)

- 本地 fallback·STKaiti / KaiTi / FangSong / Noto Serif SC
- **第一轮不引网络字体**
- 装饰字 (篆刻 / 碑拓 / 题签) 做 SVG / 图片资产·非字体依赖
- type-check 走 `@ts-check` (H.5)

### 4.4 visual-direction-lock.md (Codex 写)

- palette·按 7 主题各一组色 (5Q Q2 已答)
- 构图禁区 (Codex 5Q answer 8 条 Guardrails 已 lock·**Phase 8 不破**)
- 纹理密度 (避免 "满屏红金 / 到处龙纹 / 抽象渐变")
- 边框半径 (token --radius-sm/md/lg/xl/full)
- icon 语法 (B 重做 + A.1 stroke=currentColor)
- 资产命名 (`web/assets/ui/phase8/{icons,seals,textures,scenes,portraits}/`·5Q Q4 已答)
- prompt 模板 (Codex 风格一致性)

### 4.5 实施纪律

- ✅ refactor-only / 不改游戏功能 / DOM id 不动 / encoding 守 / letter ACK gate (Phase 7 守则延)
- ✅ 接口稳定·TM.UI.* facade 不破 (H.1)
- ✅ 命名空间·class name 用 prefix·`.cy- / .tr- / .gs- / .ji- / .sj- / .og- / .wdp- / .mem- / .hy- / .ed- / .bn- / .df- / .rw- / .ngui- / .scn-` (H.2)
- ✅ 零依赖·8-β baseline 走 option E·非 playwright npm install (H.4)
- ✅ inline onclick 模式继续·不引入 framework (H.3)

---

## 5·总览图 (UI architecture)

```
┌──────────────────── index.html ────────────────────┐
│  #launch (启动屏)                                   │
│   ├─ 楹联 + 印章 + 4 卡 (开卷/续卷/著卷/典章)        │
│   └─ 邸报·近事                                      │
│                                                     │
│  #scn-page (剧本选择 / 编辑器入口)                   │
│   ├─ scn-grid·scn-card                              │
│   └─ previewScenario modal (inline)                 │
│                                                     │
│  ngui wizard (新游戏向导·.ngui-topbar/body/L/C/R)   │
│   └─ 选剧本 → 自定义 → 开局 → 进 #G                  │
│                                                     │
│  #bar (顶栏)                                        │
│   ├─ 印章·问天·朝代·日期·物候 (季节印)               │
│   ├─ 7 vars (帑廪·内帑·户口·吏治·民心·皇权·皇威)     │
│   │   tm-topbar-vars.js 1315 行                     │
│   └─ 已存·AI live·todo·按钮组                       │
│                                                     │
│  #G (主游戏屏)                                       │
│   ├─ 左 rail (12 按钮·势/党/阶/军/政/科/物/宫/图/题/声/帮) │
│   │   → 左 drawer overlay·_renderShellExtrasLeft (~480) │
│   │     朝野内情·势力 / 党派 / 阶层 / 军事 / 区划       │
│   │                                                 │
│   ├─ #gc (6 tab 容器·非 modal)                      │
│   │   ├─ gt-edict      拟诏                          │
│   │   ├─ gt-letter     发信                          │
│   │   ├─ gt-wendui     召对                          │
│   │   ├─ gt-chaoyi     朝议 (例外·弹 chaoyi-modal)   │
│   │   ├─ gt-memorial   奏疏                          │
│   │   └─ gt-jishi      纪事                          │
│   │                                                 │
│   └─ 右 rail (9 按钮·朕/辰/臣/缘/议/志/帑/讯/闻)      │
│       → 右 drawer overlay·_renderShellExtrasRight (~580) │
│         朕之案上·朕亲卡·十二时辰·紧要之臣·关系·议题·大志·岁入岁出·近事·风闻 │
│                                                     │
│  #turn-modal (1 modal·3 模式·全 inline style)        │
│   ├─ 当前回合 (showTurnResult·tm-utils)             │
│   ├─ 史记列表 (openShiji → _renderShijiPanel)       │
│   └─ 详情 (_shijiShowDetail)                         │
│                                                     │
│  chaoyi-modal (4 模式同 modal·~9300 行 JS)           │
│   ├─ 廷议 v3 (_ty3_*·tm-tinyi-v3.js 3920)           │
│   ├─ 常朝 (_cc3_*·tm-chaoyi-changchao.js 3843)      │
│   ├─ 御前 (tm-chaoyi-yuqian.js 504)                 │
│   └─ 廷议 v1 旧版 (tm-chaoyi-tinyi.js 789·待替)     │
│                                                     │
│  其他 modal·                                        │
│   ├─ memory-ui (12 表·#tm-mem-panel·自注入 style)   │
│   ├─ 卷宗存档 (~500 行 inline style)                 │
│   ├─ 设置 UI (tm-patches·~500 行·R22 仅换皮)         │
│   └─ openGenericModal / showModal 通用              │
│                                                     │
│  浮按钮 + status bar + Toast (零碎)                  │
│   ├─ #shiji-btn / #save-btn (左下浮)                │
│   ├─ #gs-shizheng-btn (底部居中浮·inline gradient)   │
│   ├─ #gs-turn-float (右下浮·6 fab + 大按钮)          │
│   ├─ #gs-status-bar (底部·AI/存档/回合/快捷键)       │
│   └─ #toast (底部居中)                               │
│                                                     │
│  地图 (#gc 内 Canvas·map-display.js 367·硬编码色)    │
│                                                     │
│  移动端底 nav (mobile <=768·_initMobileNav)          │
└─────────────────────────────────────────────────────┘
```

---

## 6·下一步 (8-α deepdive lock 后)

按 Phase 7 letter-ACK 模式·

1. **Codex 出 B 重做 + A 6 sub-board + 5th 板** (中国古代时辰仪器)
2. **Codex 写 `phase8-visual-direction-lock.md`** (palette + Guardrails + 命名 + prompt 模板)
3. **user 确认 mood board** → 共识 lock 进 doc
4. **Claude 启 8-β** baseline·按 phase8-beta-prep.md option E·~5-7d
5. **Codex / Claude 协作 8-γ token** (含 2 套 theme 合并)·~5-7d
6. **协作 8-δ 主屏**·~12-15d (最大 slice)
7. ... (后续按 sub-phase 表)

无 commit·无 push·**all local**·

— Claude (Phase 8-α deepdive·8 轮调查·35 finding lock·2026-05-05)
