# Phase 8 UI 翻修·8-α prep audit

date·2026-05-05·status·**prep·待 Codex + 用户答 5Q·再 lock**·owner·Claude (8-α)

---

## 0·背景与目标

Phase 7 (R110-R210·tm-endturn-ai-infer.js mega-fn split·12602→244·-98%) 闭幕后·进 Phase 8·对整个游戏 UI 翻修。

用户决定·

| Q | 答 |
|---|---|
| Q1·范围 | **全做** (素材+组件+结构+主题层) |
| Q2·风格方向 | **保留中文古风但重立设计语言**·之前的"中文古风"并不中国古代·这次用 Codex 图片赋能 |
| Q3·Codex 角色 | **素材+CSS/HTML+JS 绑定全方位** |
| Q4·切入屏 | **主游戏屏先做** |
| Q5·先素材后结构 vs 先结构后素材 | **骨架先立·素材分两批** (placeholder→最终) |

核心方向·**真正的中国古代视觉语言**·而非 generic asia (楹联+印章+SVG line approximation)·走宋画/明清雕版/工笔/篆刻/织锦/瓷器/朝服/碑帖等真器物·

---

## 1·UI 文件清单

### 1.1 入口 + 主样式

| 文件 | 行数 | 职责 |
|---|---|---|
| `index.html` | 553 | 主入口·5 大区 (#launch / #bar / #G / #loading / #turn-modal) + 侧栏 rail + 浮按钮 |
| `editor.html` | TBD | 编辑器入口 (本 phase 暂不动·待 Phase 8.5 决) |
| `styles.css` | 5079 | 主样式·3 层 token + 7 主题 + ~40 组件区段 |
| `tm-chaoyi-changchao.css` | 1116 | 朝议·长朝特殊视图 (10 区段) |
| `tm-tinyi-v3.css` | 1170 | 廷议 v3 特殊视图 (5 大区段) |

总·**~8000 行 CSS + 553 行 HTML**·

### 1.2 UI 相关 JS (节选·非全)

| 文件 | 职责 |
|---|---|
| `tm-ui-foundation.js` | TM.UI namespace 基础 |
| `tm-ui-shell.js` 等 | side drawer / topbar / turn-result / tabs / 各 panel 渲染 |
| `tm-memory-ui.js` | 12 表 UI |
| `tm-changelog.js` | 邸报弹窗 |
| `map-display.js` | 地图渲染 |

UI JS 散在 `tm-*.js`·Phase 8-α 不全列·8-δ 需要时按视图聚集。

---

## 2·HTML 区域清单 (主屏)

按 `index.html` L28-295·以下是 13 大区域·

### 2.1 启动屏 `#launch` (L28-113)

| 子区 | class | 装饰元素 | 现状评价 |
|---|---|---|---|
| 楹联 (左/右) | `.home-ylian.l/.r` | "天行健·君子以自强不息" "地势坤·君子以厚德载物" + 周易出处·**竖排古诗** | 文字楹联·风格通用 |
| 四角花纹 | `.corner-flower.tl/.tr` | inline SVG·几何线条 + 红点 | **SVG line approximation·非真器物** |
| 主轴 | `.home-axis` | 顶部装饰 ◆ ◇ ◆ + 标题 "天命" + 印章 "玺" + 副标 "AI 历史模拟推演" + 分隔线 + 4 菜单卡 | 文字+SVG 混搭 |
| 印章 | `.home-seal` | "玺" 字 + radial-gradient 红色 + rotate -6deg | **CSS 仿印·非真印章** |
| 4 菜单卡 | `.home-card.c-new/c-load/c-edit/c-set` | "卷/续/著/典" 文字 icon + cn/ti/desc/meta 多层 | **文字占位 icon** |
| 底部栏 | `.home-foot` | 版本号 / "春分·太平·河清海晏" / 邸报 + 快捷键提示 | 文字组合 |
| 近事 | `.home-recent` | 近 3 存档·"〘 近 事 〙" + 列表 | 文字标签 |

**Codex 出图候选**·真宣纸纹·真楹联拓本·真印章 (篆刻 / 朱白文)·真四角花纹 (云纹 / 缠枝)·真菜单 icon (卷宗 / 笔砚 / 石经 / 鼎)·

### 2.2 顶栏 `#bar` (L119-145)

| 子区 | class | 内容 |
|---|---|---|
| Logo·问天 | `.bar-logo` `.bar-seal` `.bar-wentian` | 印章 "天命" + "问天" 按钮 |
| 朝代日期 | `.bar-era-stack` `.dynasty` `.date` `.turn-text` | 朝代 / 年号 / 回合 |
| 物候 | `.bar-weather` `.bar-weather-seal` | 季节印章 "秋" + 节气名 + 描述 |
| 变量 | `.bar-vars` `.bar-more-vars` | 自定义变量列表 + "全部变量" |
| 右组 | `.bar-right-group` | 已存 chip + AI live + todo badge |
| 按钮组 | `.mr#bar-btns` | 顶栏按钮 |

**Codex 出图候选**·真季节图章 (24 节气 各一)·朝代纪元印章 (汉/唐/宋/元/明/清各一)·变量徽章。

### 2.3 主游戏屏 `#G` (L154-208)·**8-δ 主切入点**

| 子区 | class / id | 内容 |
|---|---|---|
| 左 rail (固定 44px) | `.gs-rail-left` | 12 按钮·势/党/阶/军/政/科/物/宫/图/题/声/帮 |
| 中栏 | `.gc#gc` | 主内容 (动态填) |
| 右 rail (固定 44px) | `.gs-rail-right` | 9 按钮·朕/辰/臣/缘/议/志/帑/讯/闻 |
| 左抽屉 (overlay) | `.gs-drawer.left#drawerLeft` `.gl#gl` | "朝野内情"·点 rail 滑出 |
| 右抽屉 (overlay) | `.gs-drawer.right#drawerRight` `.gr#gr` | "朕之案上"·点 rail 滑出 |

21 个 rail 按钮全用**单字文字** ("势/党/阶/军/政...")·**Codex 出图候选最多的区**·每按钮一个真器物 icon·

### 2.4 加载屏 `#loading` (L211)

`.loading-frame` + 装饰角 `.loading-corner-tr/-bl` + 装饰符 "❖ ✦ ❖" + "时移事去" + 分隔线 + "运筹帷幄之中" + 进度条·

**Codex 出图候选**·真加载装饰 (沙漏 / 漏刻 / 滴水 / 走马灯)·替换 ❖ ✦ ❖。

### 2.5 史记弹窗 `#turn-modal` (L214-239)

`.tr-modal-wrap` + 印章 (`.tr-seal` "纪年/史宝") + 前后翻按钮 + 回合号 + 日期 + 摘要条 + 关键事件 + body + 页脚 ("朕已阅") ·

### 2.6 暂停 / 设置背景 (L242-245)

`#pause-bg` `#settings-bg` 空 div·JS 动态填·

### 2.7 浮按钮 (L247-296)

| 浮按钮 | id | 位置 | 内容 |
|---|---|---|---|
| 史记 | `#shiji-btn` | 左下 | tmIcon('history') |
| 存档 | `#save-btn` | 左下 | tmIcon('save') |
| 御案时政 | `#gs-shizheng-btn` | 底部居中 | "御案时政"·**inline 卷轴风 gradient·硬编码 CSS** |
| 诏付有司 | `#gs-turn-float` `#gs-turn-big` | 右下 | 6 fab 按钮 (拟诏/发信/召对/朝议/奏疏/纪事) + 大按钮 "诏付有司·朕意已决·付之百司" |
| 状态栏 | `#gs-status-bar` | 底部 | AI/存档/回合/提示/快捷键 |
| Toast | `#toast` | 底部居中 | 临时提示 |

### 2.8 编辑器隐藏块 `#E` (L148-151)

`.sb#sidebar` `.em#em`·游戏内不可见·暂忽略·

---

## 3·CSS 区段清单 (styles.css 5079 行 ~40 区段)

按 `═══` 分隔·**所有区段都需要 8-γ token / 8-δ-ζ 重做**·

### 3.1 基础架构 (L1-254)

| 区段 | line | 职责 |
|---|---|---|
| 文件头 | L1-5 | 注释·v2 三层 Token 架构 |
| Layer 1 Primitive Tokens | L6-40 | ink-50..900 / gold-300..600 / vermillion / celadon / indigo / 间距 / 字号 / 圆角 / 阴影 / 动画 / z / 字体 |
| Layer 2 Semantic Tokens | L42-60 | color-background / foreground / border / primary / accent / info / success / destructive / warning + 向后兼容 |
| 7 主题 | L62-170 | paper(=light)·scroll(=sepia)·blue·celadon(=green)·vermillion·highcontrast |
| Global Reset & Base | L171-182 | * box-sizing / body / a / button reset |
| 水墨装饰工具类 | L183-191 | `.ink-divider` `.paper-texture` `.seal-active` `.scroll-panel` `.stat-number` `.narrative-text` `.label-text` |
| 通用组件 | L194-254 | `.cd` 卡片 / `.rw` 行 / `.fd` 字段 / `.bt/.bp/.bs/.bd/.bsm/.bai` 按钮族 / `.tg` 标签 / `.dv` 分隔 / `.toast` / notify |

### 3.2 启动屏 (L255-464)

| 区段 | line |
|---|---|
| `.lt-*` v1 (旧) | L255-401 |
| `.home-*` v2 (覆盖 v1) | L402-464 |

### 3.3 顶栏 (L465-705)

| 区段 | line |
|---|---|
| 紫檀案台风 v1 | L465-496 |
| v2·preview-shell v7.1 | L497-518 |
| 右下角悬浮诏付有司 | L519-537 |
| 底部状态栏 | L538-625 |
| .bar-var-tip 富版 (帑廪/内帑) | L626-705 |

### 3.4 主游戏屏 + 抽屉 (L706-1270)

| 区段 | line |
|---|---|
| 侧栏 rail (44px) | L1003-1031 |
| 抽屉 overlay | L1032-1053 |
| gs-panel 通用 | L1054-1270 |

### 3.5 紧要之臣 (L1271-1602)

`.gs-cd` 命名空间·复刻 preview-char-full.html 三·右侧栏人物卡片样式·

### 3.6 6 组 Tab 分栏标签页 (L1603-3211)

| Tab | namespace | line | 行数 |
|---|---|---|---|
| 面包屑 + Tab 分栏 | (no prefix) | L1603-1640 | ~38 |
| 诏令 v2 | (ed-) | L1641-1725 | ~85 |
| 诏书润色卷轴 | `.ed-scroll-` | L1726-1744 | ~19 |
| 问对 v2 | `.wdp-` | L1745-1835 | ~91 |
| 奏疏 | `.mem-` | L1836-1918 | ~83 |
| 鸿雁 v2 | `.hy-` | L1919-2127 | ~209 |
| 编年 | `.bn-` | L2128-2239 | ~112 |
| 官制 v2 | `.og-` | L2240-2384 | ~145 |
| 官制·部门/职位卡 v10 | (preview 复刻) | L2385-2552 | ~168 |
| 官制·v2 视觉升级 | | L2553-2563 | ~11 |
| 十二态职位卡 | | L2564-2740 | ~177 |
| 选任器 v2 | | L2741-2911 | ~171 |
| 纪事 v2 | `.ji-` | L2912-3088 | ~177 |
| 史记 | `.sj-` | L3089-3155 | ~67 |
| 回合推演弹窗·数值变化 | `.tr-cg-` | L3156-3211 | ~56 |

### 3.7 史记 + 弹窗 (L3212-3331)

`.tr-modal-` 全套骨架·

### 3.8 余下面板 (L3332-5079)

| 区段 | namespace | line |
|---|---|---|
| 地方舆情 | `.df-` | L3332-3485 |
| 人物志 | `.rw-` | L3486-3665 |
| 文苑 (Wenyuan) | | L3666-3788 |
| 起居注 (Qiju) | | L3789-4209 |
| Tooltip | | L4210-4217 |
| 全局资源栏 | | L4218-4226 |
| 快速详情面板 (440px 右滑出) | | L4227-4256 |
| 人物志完整页 (1120px 模态) | | L4257-4531 |
| new-game-ui | `.ngui-` | L4532-4734 |
| 卷宗存档系统 | | L4735-4790 |
| 标签页 (印章选中态) | | L4791-4797 |
| 邸报 (更新公告) | | L4798-4828 |
| 核算细目 / 在灾实录 / 公库 / 区划 / 承载力 / 田亩 / 子区 / 户龄 / 地方实绩 / 帑廪 | | L4829-5079 |

---

## 4·Token 体系清单 (现状·8-γ 推翻参考)

### 4.1 Layer 1 Primitive

| 类别 | tokens |
|---|---|
| 墨色阶梯 | --ink-50..900 (10 阶) |
| 金 | --gold-300..600 (4 阶) |
| 朱砂 | --vermillion-300..500 (3 阶) |
| 青瓷 | --celadon-300..500 (3 阶) |
| 靛青 | --indigo-400..500 (2 阶) |
| 语义原色 | --green-400 / --red-400 / --amber-400 |
| 间距 | --space-1..12 (4px grid) |
| 字号 | --text-xs..3xl (8 阶·中文优化) |
| 行高 | --leading-tight..loose (4 阶) |
| 字重 | --weight-normal..bold (3 阶) |
| 圆角 | --radius-sm..xl + full |
| 阴影 | --shadow-xs..xl + ink + gold |
| 动画 | --duration-fast..modal + ease-out/in/spring |
| z-index | --z-base..tooltip (10 阶) |
| 字体 | --font-serif (STKaiti / KaiTi / Noto Serif SC) / --font-mono (LXGW WenKai Mono) |

### 4.2 Layer 2 Semantic

`--color-background / surface / elevated / sunken / foreground / foreground-secondary / foreground-muted / border / border-subtle / border-emphasis / primary / primary-hover / primary-foreground / accent / accent-subtle / info / info-subtle / success / destructive / warning / ring / hover-overlay`·

向后兼容·`--bg-0..4 / --gold/-l/-d / --red / --green / --blue / --purple / --txt/-s/-d / --bdr / --r`·

### 4.3 7 主题 (覆盖 Layer 2)

| 主题 | 风格 | 当前评价 |
|---|---|---|
| `[data-theme="light"]` / `paper` 素宣 | 白底·墨字·金边 | 通用浅色·非中国古代特色 |
| `[data-theme="sepia"]` / `scroll` 古卷 | 旧纸黄·深褐·暗 | 通用 sepia·非中国古代特色 |
| `[data-theme="blue"]` 靛青 | 靛色调 | 通用蓝色 |
| `[data-theme="green"]` / `celadon` 青瓷 | 青瓷绿调 | **唯一可保留·与瓷器釉色契合** |
| `[data-theme="vermillion"]` 朱砂 | 朱红调 | 通用红色 |
| `[data-theme="highcontrast"]` 高对比 | 黑/黄/青·a11y | 仅 a11y·非装饰 |
| 默认 (无 data-theme) | 暗墨·金边 | 当前默认·偏 generic dark |

**8-γ 重做方向**·按真中国古代色谱重做·见 §5。

---

## 5·8 设计方向候选 (8-α prep·待 Q1 决)

每方向·**风格 / 色板 / 字体 / 装饰 / icon 风格 / 适配视图**·Codex 各出 1-2 张 mood board 验·

### 5.1 宋画山水 (Song Landscape)

- **风格**·米家点皴·留白·烟雾朦胧·墨色为主·偶用赭石青绿
- **色板**·墨黑 (#1a1814)·茶褐 (#3d2c1a)·赭石 (#8a5a30)·苔绿 (#4a6b3a)·留白 (#f0e8d8)·偶朱 (#a83828)
- **字体**·瘦金体 (问天问鼎所用)·楷书 (颜柳)·正文宋体
- **装饰**·云气纹·远山轮廓·一笔点苔·墨痕水渍
- **icon 风格**·线描·一笔成形·留白多
- **适配**·主游戏屏·#turn-modal·朝议廷议·**适合所有静态文本视图**

### 5.2 明清雕版 (Ming-Qing Woodblock)

- **风格**·线粗·繁饰·边框双线·章回小说插图风
- **色板**·墨 (#1a1612)·朱砂红 (#a83828) 印章·毛边纸黄 (#e8d8b8)
- **字体**·明体 / 仿宋·不用楷
- **装饰**·龙纹云纹·缠枝牡丹·万字纹·开框
- **icon 风格**·插图风·人物器物白描
- **适配**·#launch·邸报·章回式纪事

### 5.3 工笔重彩 (Gongbi Color)

- **风格**·色饱·勾勒精·矿物颜料·工细
- **色板**·朱红 (#cc3528)·石青 (#3a6080)·石绿 (#5a8055)·胭脂 (#a8405a)·赭 (#9a6030)·金 (#c4a040)
- **字体**·楷书·小篆题首
- **装饰**·缠枝花·几何回纹·吉祥纹
- **icon 风格**·工笔图·彩绘
- **适配**·#G 主屏·人物志·rail 按钮 (各色加工)

### 5.4 篆刻 / 印石 (Seal Engraving)

- **风格**·朱白文·田字格·九叠篆·汉印
- **色板**·朱砂 (#b8362e) 印泥·寿山石黄 (#c4a458)·田黄 (#d4b870)·墨边 (#1a1612)
- **字体**·小篆·汉印篆·**所有标题用篆**
- **装饰**·印章为核心元素·边款 (款识)·边栏
- **icon 风格**·**所有 icon = 单字小篆刻印**·替代当前 "卷/续/著/典/势/党/阶..."
- **适配**·**rail 21 按钮全替**·#bar 季节印章·#turn-modal 朱印

### 5.5 织锦云纹 (Brocade)

- **风格**·宋锦明锦·几何 + 缠枝·满地·色相对比
- **色板**·绛紫 (#5a3050)·绯红 (#a83048)·茶绿 (#4a7050)·土黄 (#a08038)·靛青 (#28406a)
- **字体**·楷书·题字
- **装饰**·云纹·龟背·万字·缠枝·几何重复纹
- **icon 风格**·几何图饰
- **适配**·#bar 背景纹·主屏 rail 背景

### 5.6 瓷器釉色 (Porcelain Glaze)

- **风格**·汝窑天青·钧窑窑变·青花·釉里红·珐琅彩
- **色板**·汝青 (#a8c8c0)·钧紫 (#5a4a78)·青花蓝 (#2a4078)·釉里红 (#a83a30)·乳白 (#f4ecdc)
- **字体**·楷书·宋体
- **装饰**·开片纹·窑变流痕·缠枝花·
- **icon 风格**·圆润 / 釉色渐变
- **适配**·8-θ 5+ 主题之一 (青瓷主题已存·扩为汝/钧/青花/釉里红)

### 5.7 朝服色制 (Court Robe)

- **风格**·品级配色 (一品紫绛·三品红·五品绿·七品青)·补子图饰
- **色板**·绛紫 (#3a1c3c)·绯红 (#9c2828)·绿 (#3c5c3c)·青 (#2c4c6c)·黑 (#1a1a1a)·金线 (#c0a050)
- **字体**·楷书
- **装饰**·补子 (鹤·麒麟·锦鸡·孔雀·云雁·白鹇·鹭鸶·鸂鶒)·腰带·绶带
- **icon 风格**·补子图章
- **适配**·人物志·官制视图 (.og-)·选任器·**与游戏官品系统天然契合**

### 5.8 碑帖书风 (Calligraphy Stele)

- **风格**·颜柳欧赵·瘦金·汉隶·魏碑·章草·**字本身即装饰**
- **色板**·拓本黑 (#0a0908)·宣白 (#f4ecdc)·朱印 (#b8362e)·拓痕灰 (#3c3a36)
- **字体**·**多体混搭**·标题魏碑·正文楷·点缀篆隶
- **装饰**·拓本边框·碑额·碑阴文
- **icon 风格**·字 + 印组合
- **适配**·#turn-modal "纪年/史宝" 印章·朝议廷议台词·**所有大标题区**

---

## 6·Codex 图片赋能·建议素材清单 (8-ε / 8-η)

总量约 ~150-200 张图片 (不含主题扩展)·分类·

### 6.1 icon 系列 (~40 张)

- 21 rail 按钮 icon (势/党/阶/军/政/科/物/宫/图/题/声/帮 + 朕/辰/臣/缘/议/志/帑/讯/闻)·**篆刻方案**·1 字 1 印
- 6 fab 按钮 icon (拟诏/发信/召对/朝议/奏疏/纪事)
- 4 启动屏 icon (开卷/续卷/著卷/典章) — 替代当前 "卷/续/著/典" 文字
- 2 浮按钮 icon (史记/存档)
- 24 节气印章 (立春/雨水/.../大寒)
- 朝代徽章 (汉/唐/宋/元/明/清·若干·按剧本支持)

### 6.2 装饰素材 (~30 张)

- 楹联拓本 (左右 2 张·至少 3 套)
- 四角花纹 (4 角·至少 3 套·云纹/缠枝/回纹)
- 印章·"玺" 大印 (替代 #home-seal CSS 仿)·"史宝/纪年" 印 (#tr-seal)·"问天" 印 (#bar-seal)
- 分隔线·墨痕 / 拓本断裂
- 加载装饰·漏刻 / 沙漏 / 走马灯 (替代 ❖ ✦ ❖)

### 6.3 背景纹理 (~20 张)

- 启动屏背景·宋画远山 / 卷轴展开
- 主屏 #G 背景·宣纸纹 / 织锦
- 抽屉背景·绫罗 / 卷帘
- modal 背景·拓本 / 古籍纸页
- 7 主题各一组 (~7 set × 3 张 = 21)

### 6.4 人物 + 场景立绘 (~50-100 张·**最大量级**)

- 角色立绘 (人物志·选任器)
- 朝议廷议场景图
- 御案 / 朝堂全景
- 各品级官员剪影 (按朝服色制·与官制系统接)
- 季节场景 (春耕 / 秋收 / 冬寒等)

### 6.5 地图素材 (~10-30 张)

- 省份地图分省色块
- 都城 / 重要城市 icon
- 山川 / 河流 / 长城 等地理装饰

---

## 7·Phase 8 sub-phase 拟 (按 Phase 7 letter-ACK 模式)

| 阶段 | scope | owner | 估时 |
|---|---|---|---|
| **8-α** | prep audit (本 doc) + 5Q for Codex+用户 | Claude·写本 doc | ~3-5d (in progress) |
| **8-β** | UI baseline·playwright screenshot snapshot·固定 demo 存档·关键 20 屏 × 7 主题 = 140 张 baseline | Claude | ~5-7d |
| **8-γ** | token 系统重做·按选定方向 1-2 主出新 token·7 主题重做 (3 留 / 4 重) | Codex 出色板·Claude 写 token | ~3-5d |
| **8-δ** | **主游戏屏 #G layout + 21 rail icon + 抽屉 + #gc 内容**·HTML 结构 + CSS 骨架 + 占位 placeholder | Codex+Claude | ~7-10d |
| **8-ε** | 占位素材 (Codex 出 placeholder)·组件库 (按钮/卡/表/弹窗/输入·按选定方向重出) | Codex 素材·Claude 组件 | ~5-7d |
| **8-ζ** | 启动屏 #launch + 顶栏 #bar + #turn-modal + 浮按钮 + status-bar + #loading 重做 (按 8-δ 新组件套) | Codex+Claude | ~5-7d |
| **8-η** | **最终素材出**·替换全部 placeholder·~150-200 张图片 | Codex 主导·Claude 接素材·改 CSS 引用 | ~10-15d |
| **8-θ** | 主题扩展·朝代皮肤 (汉/唐/宋/元/明/清各一?) 或方向皮肤 (宋画/工笔/雕版/篆刻/朝服等) | Codex+Claude | ~3-5d |
| **8-ι** | 朝议 (`tm-chaoyi-changchao.css` 1116) + 廷议 (`tm-tinyi-v3.css` 1170) 特殊视图重做 | Codex+Claude | ~5-7d |
| **8-κ** | closeout + audit·screenshot baseline diff·全主题切验·verify-all 60/60 + UI baseline pass | Claude | ~2-3d |

总·**~50-71d** (Phase 7 ~57d 的 1-1.5 倍)·

---

## 8·5Q for Codex + 用户 (本 doc 关键决策)

**Q1·设计方向选定** (§5 8 候选)·

主方向 1·_______ (适用 #G 主屏 / 主流视图)·
辅方向 1-2·_______ (适用特殊视图·如 朝服色制 → 官制 / 篆刻 → icon 系列 / 工笔 → 人物志)·

我建议·**主·宋画山水 (沉稳基调)** + **辅·篆刻 (icon 系列) + 朝服色制 (官制人物)** + **碑帖书风 (大标题)**·四方向各司其职·**避免单一方向用力过猛**·

**Q2·色板基调** (Q1 后细化)·

7 主题翻修·

- 留·______ 个 (default / celadon ?)
- 改·______ 个 (paper → 宣纸 / scroll → 拓本 / sepia → 古籍 / blue → 青花 / vermillion → 朱印)
- 加·______ 个 (汝窑天青 / 钧窑窑变 / 朝服紫绛?)
- 删·highcontrast 留作 a11y 不动

**Q3·字体策略**·

- 标题·_______ (瘦金 / 魏碑 / 篆 / 楷)
- 正文·_______ (宋体 / 楷 / 仿宋)
- 装饰字·_______ (篆 / 隶)
- web font 加载·_______ (本地 / CDN)·**性能 / 尺寸 / 网络环境** 顾虑

**Q4·Codex 图片输出格式 + 量级**·

- 格式·______·SVG (矢量·icon 优·背景纹理可)·PNG (实拍 / 工笔重彩·人物立绘必)·WebP (混合)
- 量级·~150-200 张 (§6)·分批·8-δ 占位 ~30 / 8-ε 主组件 ~50 / 8-η 最终 ~70-120 / 8-θ 主题扩 ~20-50
- 风格一致性·**Codex 是否需要 style guide doc** (我 8-α 末写出 mood board lock)·或 Codex 自有 style consistency 机制

**Q5·8-β UI baseline 工具 + 范围**·

- playwright (推荐) / puppeteer / 手动
- 关键 20 屏 (各举·#launch / #bar / #G default / #G 12 rail 按钮各 / drawerL/R / #loading / #turn-modal / 朝议 / 廷议 / 浮按钮 / 设置)·~20 屏 × 7 主题 = 140 张
- pixel diff 容差·1% 推荐 (字体抗锯齿 + AI 生成内容随机)
- 固定 demo 存档·我 8-β 写一个 demo.json·所有 baseline 用此存档·确保 deterministic

---

## 9·下一动作

按 Phase 7 协作模式·

1. **本 doc lock**·待 Codex + 你答 Q1-Q5·**5 Q 答完前不动 8-β**
2. Codex 答 Q1 时·建议同时出 **3-4 张 mood board** (主方向 + 辅方向各一)·让你 / Codex / 我 三方 visual 共识
3. **5Q 答完 + mood board 共识** → lock 进 §8.5 doc → 启 8-β

无 commit·无 push·**all local**·

— Claude (Phase 8-α prep audit·2026-05-05)
