# Phase 8·UI 应用策略·**mock → runtime 拆切 + DOM 边界 + 主题 + responsive**

date·2026-05-05·status·**P0·user 问"Codex 生的图能成功应用吗" → 必先 lock 应用策略再发 letter**·owner·Claude

依据·`phase8-codex-prompt-master.md` (visual identity 母版) + `phase8-ui-operational-content-audit.md` (1012 行·UI 实操) + `phase8-codex-prompt-batch-screen-overall.md` (5 屏 mock prompt) + `phase8-alpha-deepdive.md` (35 finding·z-index / 命名 / 主题 / responsive)·

**核心问题**·5 屏 mock 是不是直接当 UI? **不是**·**mock 是设计稿·进 runtime 的是 ~150-200 张独立资产 + DOM + CSS**·若 mock 视觉好但拆不出来·**Phase 8 5 mock 做完才发现返工 50%**·**本 doc lock 应用路径·避免此**·

---

## §0·**3 行核心**

```
mock 不直接当 UI       (5 屏整图·静态·不能上 runtime)
mock 是设计稿 + 切片源 (Claude 标·Codex 后续 batch 生独立资产)
runtime = 独立资产 + DOM + CSS  (~150-200 资产 + 现有 ~13000 行 UI JS + Phase 8 token)
```

---

## §1·mock 真实 3 用·**非 UI 资产**

### 1.1 用途 1·**视觉身份锁**

5 屏 mock → user 看 → ACK·

- "宋画文人案 / 帝王视角 / 30-50% 留白" 是不是真到位
- "宣纸 / 朱泥 / 寿山石" 材质是不是真
- "default 主题色" 暖深褐 + 暖金 + 朱红 协调度
- 5 屏内风格一致

ACK 后·**Phase 8 视觉身份 lock**·所有后续资产 (~150-200 张) 按此风格生·

### 1.2 用途 2·**切片源**

mock 不直接进 runtime·但 Claude 看 mock·标·

- 这块是 #bar 横额材质 → 后续切下 / 重生
- 这块是 rail 寿山石板 → 后续切下 / 重生
- 这块是 印章 → 后续 B v3 batch 单独生 21 张
- 这块是 装饰 (corner / divider / texture) → 后续切 / 重生

切片成果·**资产清单 + 文件命名**·见 §3·

### 1.3 用途 3·**baseline (后续 Codex batch 风格参考)**

后续 ~150-200 张独立资产·Codex 生时·**看 mock 锁基线**·

- B v3 21 篆刻·按 mock 上 rail 印章风格生
- portrait·按 mock 上人物风格生 (廷议气泡左印)
- texture·按 mock 上宣纸 / 木 / 石 材质生
- icon (5 group / 7 vars / fab)·按 mock 上 icon 风格生

**风格不漂的关键·所有 batch 共享 mock baseline**·

### 1.4·**mock 本身**

```
不进 runtime
不放 web/assets/ (放 web/assets/ui/phase8/scenes/screen-overall-X-trial.webp·trial 后缀)
不写 wire 代码
ACK 后留 dir·作 baseline 参考
```

---

## §2·5 屏 mock → runtime 拆切策略

### 2.1 共享原则

```
✓ 材质 / 装饰 / 大块 scene·从 mock 切·或 Codex 重生 (尺寸优化)
✗ 动态文·必 DOM 渲 (7 vars 数字 / chip 文 / 数字 / list)
✗ 状态切换·必 DOM·rail 12 颗 onclick·tab 13·drawer 滑·modal 弹
✗ 交互·hover / active / focus·CSS state·非 mock 多张
```

### 2.2 屏 A·#G 主屏·**拆切清单**

mock 1280×800 → 拆成·

```
[材质资产·5-8 张] (从 mock 切·或 Codex 重生·后续 batch)
  bar-bg.png         ~80px 横长·朱漆木 / 黑漆描金·tile horizontally·**核心背景**
  rail-bg.png        ~64-72px 竖长·寿山石板·tile vertically·**rail 背**
  gc-paper-bg.png    宣纸大背·tile 或 9-slice·**主区背**
  status-bar-bg.png  ~36px 横长·拓本横边·tile·**底栏背**
  breadcrumb-bg.png  细横边·tile
  tab-bar-bg.png     tab 条材质·tile·或 1280×40
  fab-circle-bg.png  fab 朱泥小背·圆形·~40×40

[独立 raster·~50-60 张] (后续 Codex 单独 batch)
  rail-seals/seal-01-shi.png ~ seal-21-wen.png         21 颗 (B v3 batch)
  bar-vars/glyph-{tang,nei,hu,li,min,quan,wei}.png    7 颗篆体单字印
  group-icons/{internal,military,personnel,foreign,develop}.png  5 group icon
  zz-status/{ok,disabled}.png                          状态点 (绿 ●·灰 ○)
  fab-icons/{edict,letter,wendui,chaoyi,memorial,jishi}.png  6 fab icon
  date-era-chip-bg.png                                 era chip 朱印
  trend-arrow/{up,down,stable}.png                     ▲/▼/— (或 SVG)
  state-pill/{abundant,ok,tight,deficit,bankrupt}.png  state 药丸 (5 种)

[全 DOM 渲]
  #bar 朝代 / 日期 / 物候 / 7 vars 数字 / 趋势 / state 药丸文
  breadcrumb 路径文 (动态·按当前 tab 改)
  tab bar·13 tab 文 / active class
  gt-zhaozheng·5 group 标签 / 4 项 / 3 项 zz-item / sub / status·**全 DOM**
  rail 12 / 9 颗·onclick·title·drawer 锚点
  底栏·AI 状态 / 已存 / 回合 / 快捷键 hint
  fab cluster·6 + 1 大按钮·onclick

[CSS]
  background-image·tile (rail / gc-paper / bar / status-bar)
  background-position·9-slice (breadcrumb / tab-bar)
  z-index·按 audit J.2 (rail 20·drawer 30·modal 1000·toast 9999)
  filter·主题切换 (hue-rotate / sepia / saturate)
```

**§3.A 资产·~57-68 张** (5-8 材质 + ~50 独立 + 现有 SVG 25 个 TM_ICONS)·

### 2.3 屏 B·#G + 左 drawer·**拆切清单**

```
[材质资产·新增 3 张]
  drawer-bg.png       340px 宽·宣纸卷 + 朱印边框·tile vertically
  drawer-divider.png  墨水横线·1280×2·tile
  drawer-shadow.png   右边墨色淡墨阴影·6-12px·overlay

[独立 raster·新增 ~15 张]
  panel-keys/{dyn,weather,fac,party,class,army,admin,keju,family,tech,item,harem,map,theme,audio,help}.png
    16 段·each panel-hdr 装饰 (题签框 / 计数 chip 框)
    其实多数可走 DOM·只装饰用资产
  faction-color-blocks/{e_lin,yan,zong,xun,shi}.png
    5-8 势力色块 (按 fac type)·小方印
  attitude-chips/{friend,neutral,hostile,vassal}.png
    4 态度 chip·朱印

[全 DOM 渲]
  drawer 顶·"朝野内情" 题 + 当前段名 (动态)
  12 段 panel-hdr·title + count chip 数 + 内容 (势力 list / 党派 bar / 阶层 mood / ...)
  drawer 底注脚 "凡有威权·必朋党"·静态文

[CSS]
  drawer animation·transform: translateX(-110%) → 0·transition 0.35s
  rail 第 1 颗 active·brightness +20%·CSS filter
  drawer 滚动·data-panel-key 锚点·scrollIntoView
```

**§3.B 资产·~3 材质 + ~15 独立 = 18 张** (大部分内容走 DOM)·

### 2.4 屏 C·chaoyi-modal·**拆切清单**

```
[材质资产·新增 2 张]
  modal-paper-bg.png   modal 主区·真宣纸长卷展开·~1100×680
  modal-mask.png       淡墨水彩遮罩·1920×1080·overlay
  
[独立 raster·新增 ~20-30 张]
  stele-header-bg.png   碑额·阴文"〔X〕"·空白可填·或 5 种 (廷议 / 常朝 / 御前 / 朝议 / 议)
  progress-bar-fill.png 进度条墨水填·青→金渐变·~600×6·tile
  bench-tides/{dang,zhong,di}.png  三班潮汐色块·indigo / gold / verm
  speech-bubble-frame.png   气泡云纹边框·9-slice
  party-color-frames/{indigo,gold,verm,celadon,purple}.png  5 党派色边
  grade-seals/{S,A,B,C,D}.png  5 档位印章·朱泥 (S 上 / A 中上 / B 中 / C 中下 / D 下)

[全 DOM 渲]
  议题题 + 主奏者名 / 党派 / 影响力数
  6-8 气泡发言文 / 党派 / 立场 / 流式 (typewriter effect)
  档位 5 按钮文 + 反馈描述
  底操作·罢 / 打断 / 建言 (text)
  人物名 / 官职 / portrait img

[CSS]
  modal animation·fade in 0.3s + scale 0.9 → 1
  z-index 5000
  气泡 typewriter·CSS clip-path 或 JS 流式 set innerHTML
  party 边色·CSS class.indigo / .gold / .verm
  progress fill·width 0% → 75%·transition
```

**§3.C 资产·~2 材质 + ~25-30 独立 = 27-32 张**·

### 2.5 屏 D·#launch 启动屏·**拆切清单**

```
[材质资产·新增 4 张]
  launch-paper-bg.webp  全屏宣纸 + 拓本黄·1920×1200·~300KB
  launch-mountain.webp  淡淡山水皴 / 远山 / 云气 (后景·overlay)
  card-paper.png        4 卡背景·宣纸 + 木漆·~280×100·tile horizontal
  recent-bg.png         邸报横长拓本·~720×40·tile

[独立 raster·新增 ~10-15 张]
  corner-flowers/{tl,tr,bl,br}.png  4 角装饰 (现有 SVG·或重做 raster)
  title-tianming.png    "天　命" 大字·~240×120·篆体或碑刻
  seal-yi.png           "玺" 朱印·~50×50
  card-icons/{juan,xu,zhu,dian}.png  4 卡 icon·篆体小印 (卷/续/著/典)
  recent-seal-zi.png    [自] 朱印·小
  recent-seal-feng.png  [封] 朱印·小

[全 DOM 渲]
  楹联文·"天行健·君子以自强不息 —— 周易" / "地势坤·君子以厚德载物 —— 周易" (静态·可写死或 DOM)
  4 卡·cn / ti / desc / meta·楷书·全 DOM
  邸报近事·从 localStorage 读·DOM 渲 max 3 卡·或空"未见封卷"
  底栏·v0.9-β / 物候 / kbd (4 段·全 DOM)

[CSS]
  楹联竖排·writing-mode: vertical-rl
  卡 hover·transform: translateY(-2px) + box-shadow 朱印浮起
  corner-flower 装饰·position absolute 4 角
```

**§3.D 资产·~4 材质 + ~10-15 独立 = 14-19 张** (启屏装饰为主·结构走 DOM)·

### 2.6 屏 E·#turn-modal·**拆切清单**

```
[材质资产·新增 3 张]
  turn-modal-paper.webp   modal 主体·真宣纸卷展开·~1100×800
  turn-modal-mask.png     遮罩 (复用 chaoyi modal-mask)
  stele-bar.png           底统计 bar 拓本横边·~960×80·tile

[独立 raster·新增 ~10-15 张]
  era-chip-bg.png        era 朱印 chip·小·~30×30
  critical-chips/{war,death,scheme,faction,calamity}.png  5 类要闻 chip·按色
  narr-headers/{shizheng,zhengwen}.png  2 段题签·"〔时政〕" / "〔政文〕" 篆体小印
  turn-stats-glyphs (复用 #bar 7 vars 篆字印)
  delta-arrows/{plus,minus,zero}.png  +/-/= 朱/墨/灰

[全 DOM 渲]
  "第 X 回合" 数字 (动态)
  主日期 / era 文 (动态)
  一句话总曰 (~80 字·动态)
  叙事正文 (3-5 段·动态)
  朱批小字 (动态)
  统计 bar·7 vars 数字 + delta (动态)
  翻阅 [‹前回] / 32/50 / [后回›] / [导出]

[CSS]
  modal fade-in
  z-index 1000
  叙事段·~30-50 字·楷书·墨笔
  delta 颜色·.delta-plus 朱 / .delta-minus 墨 / .delta-zero 灰
```

**§3.E 资产·~3 材质 + ~10-15 独立 = 13-18 张**·

### 2.7 5 屏汇总

```
材质资产·     ~17-21 张  (全屏 / 半屏 / tile / 9-slice)
独立 raster·  ~110-150 张 (印章 / portrait / icon / chip / 装饰)
现有 SVG·      25 张 TM_ICONS (复用·非新生)
─────────────────────────────────────
总资产·       ~152-196 张

DOM 渲·      所有动态文 / 数字 / list / 状态 / 交互
现有 UI JS·   ~13,000 行 (Phase 8 不重写·只换皮 + token 化)
Phase 8 新 CSS·  ~3000-5000 行 (token + components + theme)
```

---

## §3·~150-200 张独立资产清单·**Codex 后续 batch**

### 3.1 资产分类

```
[篆刻印章]·~50-60 张
  rail seals 21 (B v3·已 paused·integral mock ACK 后启)
  bar vars 7 (#bar 7 篆字印)
  fab icons 6 (拟诏 / 发信 / 召对 / 朝议 / 奏疏 / 纪事)
  group icons 5 (内政 / 军事 / 人事 / 外交 / 发展)
  attitude / status chips 10-15 (友好 / 中立 / 敌对 / 充裕 / 紧 / 亏空 / 破产 / 自 / 封 / ...)
  era chip / critical chip / season seals (春夏秋冬) 8-10

[portrait]·~50-100 张 (8-η 后期·按角色数)
  历史人物胸像·256×256·圆切·alpha
  按 character.portrait field 接

[texture / 大背]·~10-20 张
  bar-bg / rail-bg / gc-paper-bg / status-bar-bg / drawer-bg / modal-paper / launch-paper / mountain-bg
  全部·tile / 9-slice / overlay

[装饰]·~20-30 张
  corner-flowers (4 角)
  dividers (墨水横线 / 朱点 / 题签框)
  bubble frames (云纹气泡 9-slice)
  progress fill (墨水青→金)
  stele headers (碑额 阴文)

[scene]·~5-10 张 (整屏背 / 时辰仪器)
  time-instrument (圭表 / 日晷 / 铜壶滴漏·5th batch)
  notify-urgent-frame (J.1·朱印水印雕版边框)
  bigger background scenes (后期 8-η 决)
```

### 3.2 资产命名 (`master.md` §4)

```
web/assets/ui/phase8/
  ├── icons/
  │   ├── rail/                21 篆刻 + 9 (左 12 + 右 9 - 重复·实际 21 unique)
  │   ├── bar-vars/             7 篆字印
  │   ├── fab/                  6 fab icon
  │   ├── group/                5 group icon
  │   └── chip/                 N chip 装饰
  ├── seals/                    大印 (modal 用·era / season / status)
  ├── textures/                 tile bg (paper / wood / stone / stele)
  ├── scenes/                   大背 (mock + time-instrument + notify-urgent)
  ├── portraits/                人物胸像 (按 char-id)
  ├── frames/                   modal 边框 / header 装饰 / bubble frames
  └── moods/                    decoration (corners / dividers)
```

---

## §4·DOM 渲什么 / 资产渲什么·**边界**

### 4.1 全 DOM 渲·**12 类**

```
[1] 所有数字          7 vars / delta / 回合 / 户口 / 影响力 / strength
[2] 所有动态文        诏书内文 / 奏疏 / 邸报 / 叙事 / 气泡发言 / 议题
[3] 所有 list         势力 / 党派 / 阶层 / 角色 / 议程 / chip 列
[4] 所有 state        药丸文 / 状态 (active / disabled) / hover
[5] 所有 onclick      rail / fab / 卡 / button / chip
[6] 所有 hover         tooltip / data-tip / 浮起 / 高亮
[7] 所有 form          textarea / input / select (诏令编辑·鸿雁书札)
[8] 所有 transition    drawer 滑 / modal 弹 / 气泡 typewriter / progress fill
[9] 所有 responsive    @media / mobile-nav / 桌面 vs ≤768
[10] 所有 a11y          aria-* / role / tabindex / keyboard nav
[11] 所有 i18n / 时区    日期 / era 文 / 物候
[12] 所有 dynamic 主题    theme 切换 / filter 应用
```

### 4.2 全资产渲·**6 类**

```
[1] 材质背 (大块)         bar / rail / gc-paper / status / drawer / modal
[2] 印章 (小元素)          rail seals / bar glyphs / fab / group / chip
[3] portrait (人物)        胸像
[4] 装饰 (固定)            corner / divider / bubble frame
[5] header / 题签 (固定文)  "〔分轮辩议〕" / "奏疏待览" / "天命" 等大字 (装饰字必图·master §6)
[6] 大 scene 背 (整屏)      launch-paper / mountain / time-instrument
```

### 4.3 边界规则·**5 条**

```
[规则 1] 动态 = DOM·静态 = 资产
         数字 / 数据 → DOM
         题签 / 装饰字 (大) → 资产
         按钮 = DOM 文 + 资产背 (背景图·DOM 文 overlay)

[规则 2] 不在视觉资产里写动态字
         例·"7 vars 数字" 写在 mock 上 = 错·永远是 mock 数
         例·"朝代 大明" 写在 #bar 资产 = 错·下个剧本是清就坏

[规则 3] 不在视觉资产里写交互
         例·rail 12 颗印章·全 idle base·**hover / active 走 CSS filter**·非 4 张
         例·tab 13 个·**active class CSS·非 13 张**

[规则 4] 装饰字 (固定·古风) → 必图
         "天命" / "玺" / "〔分轮辩议〕" / "奏疏待览" 这种大字 / 题签 → raster
         理由·楷书 / 篆体的视觉感字体不可靠

[规则 5] 数字 / chip 字 (动态·小·数据) → 必 DOM
         "12300" / "32 回合" / "民心 -2" → 楷书 fallback·走系统字
         理由·必动态·必 a11y 可读
```

---

## §5·主题切换策略·**CSS filter 主导·8-θ 补生备**

### 5.1 7 主题 (master §2)

```
default       素宣墨骨    深褐 / 暖金 / 朱红 / 纸白    ← Codex mock baseline
paper         净宣阅读    净纸 / 墨 / 朱 / 金题签
scroll        拓本古卷    拓黄 / 墨 / 赭 / 题签金
blue          青花瓷       瓷白 / 青花深 / 朱 (印 only)
celadon       汝窑天青    天青 / 汝青深 / 墨
vermillion    朱印宫墙    宫墙红 / 廊金 / 亮朱 / 象牙
highcontrast  a11y         极暗 / 极亮 / 警黄 (走 CSS only·跳 raster)
```

### 5.2 切换实现·**option B (master §5)**

```
[5.2.1 资产侧]
  Codex 只生 default 主题 idle base
  禁·7 主题各 1 套 (= 1050+ 张资产·重)

[5.2.2 CSS filter 转]
  body[data-theme="paper"]    filter: brightness(1.5) hue-rotate(-10deg)
  body[data-theme="scroll"]   filter: sepia(0.5) saturate(1.2)
  body[data-theme="blue"]     filter: hue-rotate(180deg) saturate(1.3)
  body[data-theme="celadon"]  filter: hue-rotate(120deg) brightness(1.1) saturate(0.9)
  body[data-theme="vermillion"] filter: brightness(0.85) saturate(1.5) hue-rotate(-15deg)
  body[data-theme="highcontrast"] (full custom CSS·禁 filter)

  apply target·body / .gs-rail / .gc / .modal-bg·按层级

[5.2.3 hue-rotate 风险]
  朱印红 → hue-rotate 180 = 青·风格破
  缓解·关键朱印 + 印章·**单独不 filter** (CSS isolation·或 mask layer)
  例·.rail-btn img { filter: none; }·主体 body filter 不传

[5.2.4 若 filter 不够·8-θ 补生]
  8-θ 阶段·若 user 觉得 vermillion / blue 主题 filter 后丑
  Codex 单独生 1-2 主题专属资产 (~30-50 张 each)
  最后总资产·~150-200 (default) + 30-50 (vermillion 专属) + 30-50 (blue 专属) = ~250-300
```

### 5.3 主题切换 a11y

```
[a11y 1] highcontrast 走 CSS only (禁 filter·必精确控制对比度 4.5:1+)
[a11y 2] prefers-reduced-motion·主题切换 transition 0.3s → 0.01ms
[a11y 3] localStorage 持久·已经走 _tmApplyTheme (deepdive B.1)·8-γ 合并
```

---

## §6·responsive 策略·**桌面 mock + CSS-only mobile fallback**

### 6.1 断点 (audit J.3)

```
≤900px·  .gl/.gr 隐藏·#G 单列
≤1024px· ngui-* 紧凑 + tab 字小
≤768px·  ngui-left/right 折叠为底 drawer·#mobile-nav 56px (4 button)
≤480px·  zz-items 单列
```

### 6.2 资产策略

```
桌面 (>768)·   走 mock + 资产·满级体验
平板 (768-1024)·桌面资产·CSS 缩比 + 字号小
手机 (≤768)·  **大资产隐藏** (rail 印章 / 大 scene 背)·走 CSS-only fallback
              留·#mobile-nav (4 fab)·gt-zhaozheng dashboard 单列
              用·gc-paper-bg (复用·tile / cover)
              不用·rail-bg (rail 隐藏)
              不用·drawer-bg (drawer 隐藏·走顶/底 push panel)
```

### 6.3 mobile mock 不生·**节省 50%**

```
理由·mobile UI 是 functional fallback·非视觉重点
理由·user 决·"mobile 走 CSS-only" (J.3)
节省·~75-100 张移动版资产 (mock 5 屏 mobile + 独立资产 mobile)·**禁生**

例外·若 user 后期觉得 mobile UX 太丑·8-θ / 8-η 后期补生
```

### 6.4 桌面尺寸·**~1280-1920 viewport**

```
mock 1280×800·覆盖 1280-1600 viewport (padding ok)
若 user >1920·走 max-width 1920 + center·或拉伸 (background-size: cover)
若 user <1280·走 ≤1024 平板路径·CSS 缩
```

---

## §7·demo / test 路径

### 7.1 单屏 wire demo (8-δ 主屏)

```
[1] §3.A mock ACK
[2] Claude 切下材质·~5-8 张 (bar-bg / rail-bg / gc-paper / status / breadcrumb / tab-bar)
[3] Claude 写 demo HTML (web/dev/phase8-screen-a-demo.html)
    - <div class="phase8-bar">  background-image bar-bg
    - <aside class="phase8-rail-left">  background-image rail-bg + 12 print 占位 div
    - <main class="phase8-gc">  background-image gc-paper + breadcrumb DOM + tab DOM + zz-group DOM
    - <aside class="phase8-rail-right">
    - <footer class="phase8-status">
[4] 浏览器看·风格对? 比例对? 留白对?
[5] ACK → 进 §3.B 拆切
   不对 → mock 重生 / 切片调
```

### 7.2 主题切换 demo (8-γ)

```
[1] default 主屏 demo 跑通
[2] 加 7 theme button (临时 dev panel)·切·body[data-theme=...]·CSS filter
[3] 看·default → paper / scroll / blue / celadon / vermillion / highcontrast
[4] 风险点·朱印 / 印章 hue-rotate 后丑?·
    → 给 .rail-btn img 加 filter: none·或 mix-blend-mode: multiply
    → 若仍丑·8-θ 阶段补生主题专属资产
```

### 7.3 responsive demo (8-δ)

```
[1] 桌面 demo 跑通
[2] resize 到 1024 / 768 / 480·看·
    - 1024·rail / #gc 是否缩
    - 768·rail 隐 / mobile-nav 显
    - 480·zz-items 单列
[3] 关键·桌面资产在 mobile **不显**·避免拉伸
[4] 测·.ngui-* mobile 系统是否仍 work (deepdive J.3)
```

### 7.4 5 屏全 demo (8-δ + 8-ε + 8-ζ + 8-ι 后)

```
walk-through demo·
  [启动屏 D] → 选剧本 → [主屏 A] → 点 rail "势" → [drawer B] → 点 "朝议" → [chaoyi modal C] → 结束回合 → [turn-modal E] → 回 [主屏 A]
跑通 = Phase 8 wire 成功
```

### 7.5 baseline test (8-β)

```
20 屏 × 7 主题 × 3 viewport (1280 / 1024 / 480) = 420 baseline screenshots
对比·default vs Phase 8·structural diff (DOM 一致) + visual diff (按 token)
零依赖·option E (现 tm-test-harness + headless-smoke + render-smoke 扩)
```

---

## §8·关键风险点 + 缓解 (5 条·user 必知)

### 8.1 风险 1·mock 切线不明显

```
风险·Codex 把 #bar / rail / #gc 画成"一幅画"·切起来缝隙难找
缓解·
  prompt 强调"5 区分明·细横墨线分隔"
  prompt 加"mock 是设计稿·必须可切"
  v2 §3.A prompt 已加·但需 user 看 mock 后判断
失败·若切不出·重生 mock 1 张·prompt 加约束
```

### 8.2 风险 2·mock 含动态文

```
风险·Codex 生的 "7 vars 12,300" 写死在图上·永远不变
缓解·
  v2 §3.A prompt 已说"chip 字 / 数字示意即可"
  Codex 看 mock 时·这些区域应留空 / 占位字 / 模糊化
  Claude 切片时·mock 上这些字·不切下·DOM 渲
失败·若 Codex 把数字写得过实·重生·prompt 强调"留 placeholder 框"
```

### 8.3 风险 3·主题 hue-rotate 破朱印

```
风险·朱印是核心视觉·hue-rotate 180 = 青·风格破
缓解·
  关键朱印资产 (rail seals / bar vars / chip) → CSS isolation·filter: none
  body filter 只 apply 大块材质 (bar-bg / rail-bg / paper-bg)
  印章资产层级单独控
失败·若仍破·8-θ 补生 vermillion 主题专属朱印 (~50 张)
```

### 8.4 风险 4·mock 比例不匹配 runtime

```
风险·mock 1280×800·user resize / mobile / 不同 viewport
缓解·
  桌面·max-width 1920·center + cover
  平板 1024·CSS 缩
  ≤768·桌面资产隐·走 .ngui-* mobile fallback (CSS-only·不重生)
  关键·mock 不直当背景·切片后 tile / 9-slice (适应 resize)
失败·若 mobile UX 太丑·8-θ 阶段补生 mobile 版资产·或调整 fallback CSS
```

### 8.5 风险 5·状态切换无法 mock 全·DOM 多

```
风险·5 屏 mock 只 5 状态·实际 tab 13 + drawer 12 + modal 4 模式·状态 ~30-50
缓解·
  mock 5 屏 + 后续独立资产 (~150-200 张)·可拼绝大多数状态
  状态 (active / hover / disabled) 走 CSS filter·非 mock 多张
  tab 13 切换走 DOM·panel innerHTML 切·非整屏 mock
失败·若某状态特别 visually 重·**8-η 阶段补 mock** (例·gt-edict 起草态·gt-letter 鸿雁态)
```

---

## §9·**应用路径回答 user 的问题**·"能成功应用吗"

### 9.1 答·**能·按本 doc 路径**

```
[1] 5 屏 mock·锁视觉身份 + 切片源 + baseline
[2] Claude 切片·材质 ~17-21 张·从 mock 切下
[3] Codex 后续 batch·独立资产 ~110-150 张 (印章 / portrait / icon / chip / 装饰)
[4] Claude 8-δ wire·DOM + CSS·tile / 9-slice / overlay
[5] 现有 ~13000 行 UI JS·token 化 + 换皮 (8-γ / 8-θ / 8-ι)
[6] CSS filter 切 7 主题 + responsive
[7] demo + baseline test
```

### 9.2 总工作量·~64-92d (Phase 7 ~57d 的 1.1-1.6 倍)

```
8-α prep·~5d (本阶段含 audit + strategy doc)
8-β baseline·5-7d
8-γ token + 主题合并·6-8d
8-δ 主屏 wire (含 §3.A 应用)·13-16d
8-ε 通用组件·8-11d
8-ζ launch + ngui·7-10d
8-η 最终素材 (~150-200 张独立资产·Codex 主)·12-17d
8-θ 主题扩展 + 设置 UI·5-7d
8-ι 朝议·8-10d
8-κ closeout·2-3d

mock 5 屏·~1-2d (Codex 出 + ACK·走子集)
```

### 9.3 关键里程碑

```
M1·5 屏 mock 全 ACK         (视觉身份 lock·所有 batch 启动条件)
M2·§3.A 主屏 demo wire 跑通  (8-δ 完·切片可行)
M3·7 主题切换 demo 跑通       (8-γ 完·CSS filter 验证)
M4·5 屏 walk-through 全跑通  (Phase 8 wire 完成·8-ι 后)
M5·baseline test 全过        (Phase 8 closeout·8-κ)
```

---

## §10·**lock 检查·user ACK 后才发 letter**

### 10.1 user 看本 doc·确认

```
[ ] §1 mock 用途·非直接 UI·我懂
[ ] §2 5 屏拆切策略·我看·能落地
[ ] §3 ~150-200 资产清单·我看·合理
[ ] §4 DOM 边界·5 规则·我懂
[ ] §5 主题切换·CSS filter·我懂
[ ] §6 mobile CSS-only fallback·我同意 (节省 50%)
[ ] §7 demo / test 路径·我懂
[ ] §8 5 风险点·我接受
[ ] §9 64-92d 总工作量·我接受
```

### 10.2 ACK 后

```
我即发 letter `2026-05-05-claude-phase8-screen-a-only-launch.md`
启 §3.A·1 张试·主屏 idle dashboard
```

### 10.3 若 user 调整

```
[A] 调资产数 (~150 → ~80·砍 portrait)·我改 §3 + §9
[B] 调主题 (CSS filter 不够·8-θ 多生)·我改 §5
[C] 调 mobile (重生 mobile 版)·我改 §6
[D] 调 demo 顺序 (先做 §3.D launch·非 §3.A)·我改 §10.2 letter target
```

---

## §11·变更日志

- 2026-05-05·init·Claude·post user 问"能成功应用吗" → 强制先 lock 应用策略·~600 行

---

— Claude (Phase 8·UI 应用策略·v1·post user catch "能应用吗"·2026-05-05)
