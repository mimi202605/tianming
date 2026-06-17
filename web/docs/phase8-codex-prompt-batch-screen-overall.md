# Phase 8·Codex prompt·**batch screen-overall·5 整屏 mock·v2 audit-revised**

date·2026-05-05·status·**v2·post audit (`phase8-ui-operational-content-audit.md` 1012 行·v2)·5 屏 prompt 全改**·owner·Claude (8-α prompt phase)

依据·`phase8-codex-prompt-master.md` (master) + `phase8-alpha-deepdive.md` (35 finding) + **`phase8-ui-operational-content-audit.md` (v2·6 区域 audit·**must read**)** + B v3 trial 3 张 (材质对·字体错·整屏 baseline 缺) + user 决方案 C·

**v2 改记**·v1 prompt 内容 ~50% 错·因 Codex 不读 codebase·我猜的内容也错·**v2 按 audit 实读重写**·

**本 batch 是 Phase 8 的视觉身份锁定 batch**·5 张整屏 mock·**user ACK 后所有细节 batch (B v3 / portrait / texture / ...) 才有 baseline**·

---

## §1·batch 概述

### 1.1 内容

5 张整屏 raster·覆盖游戏 5 大 state·

| # | state | 屏 | 必现元素 |
|---|---|---|---|
| **A** | #G 主屏 idle | 主玩 | #bar + 左 rail (12) + #gc gt-edict dense + 右 rail (9) + 底 status + 右下 fab |
| **B** | #G + 左 drawer 打开 | 朝野内情 overlay | 同 A·左 drawer 340px 滑出·势力 list dense·rail 部分被盖 |
| **C** | chaoyi-modal 弹起 | 廷议 v3 | 全屏遮罩·议题 chips + 当前议题正文 + 5-8 人物列 + 选项·两侧 rail 仍可见 |
| **D** | #launch 启动屏 | 启屏 | "天命" 大字 + 楹联 + 印章 + 4 卡 (开卷/续卷/著卷/典章) + 邸报近事 |
| **E** | #turn-modal 回合 modal | 回合 | 全屏·碑额标题 + 朝代年号 + 叙事文 3-5 段 + 回合统计 +/- |

### 1.2 顺序与波次

```
波 1·A / B / C  (3 张·#G 状态族)         先生·user 看·ACK
                ↓
波 2·D / E       (2 张·非 #G 状态)         后生·风格按波 1 baseline·user 看·ACK
                ↓
全 5 张 ACK → Phase 8 视觉身份 lock → 所有细节 batch 启
```

**禁一波 5 张**·session 间风格易漂·**5 张分 2 波是底线**·

### 1.3 共享 spec (master 引)

```
分辨率·    1280×800 (idle 桌面·与游戏 viewport 一致)
            或 1920×1200 (2x retina·后期补·先 1280×800)
format·    .webp 优·体积小 (~200-400KB)·或 .png (alpha 满布)
主题·      default 素宣墨骨 (master §2.1)
材质·      全真·宣纸 / 朱泥 / 寿山石 / 雕版木 / 砚石 / 木漆
风格·      宋画文人案 / 帝王视角 / 三远法 / 30-40% 留白
否定词·    NO Latin / NO 3D / NO neon / NO red-gold luxury / NO dragon / NO fantasy palace / NO Western flourish / NO 满屏精致 (8 Guardrails)
```

### 1.4 命名

```
web/assets/ui/phase8/scenes/screen-overall-{a..e}-{state}-trial.png
```

trial 阶段·

```
screen-overall-a-game-idle-trial.webp
screen-overall-b-game-drawer-trial.webp
screen-overall-c-chaoyi-modal-trial.webp
screen-overall-d-launch-trial.webp
screen-overall-e-turn-modal-trial.webp
```

ACK 后去 `-trial` 后缀·

---

## §2·**重要**·整屏 mock 是视觉 baseline·**非最终 UI 资产**

### 2.1 mock 用途

```
[1] user 看视觉身份·材质 / 留白 / 主题色协调度
[2] Codex 自己锁 baseline·后续细节生时风格不漂
[3] Claude 拆 mock·细节 batch (篆刻 / portrait / texture) 按 mock 各部分单独生
[4] mock 本身**不直接进 runtime**·runtime 是细节资产 + Claude code 拼装
```

### 2.2 因此·**精度容忍**

```
✓ 整体视觉身份 / 材质 / 留白 / 主题色协调度·必精
✓ 主体密度 / 元素类型分布·必准
✗ 篆刻字字字精确·**不必**·占位即可 (后细节生独立 PNG 替换)
✗ 数字 / chip 文 / 列表条目·**不必精确**·示意即可
✗ 人物 portrait·**示意即可** (后细节生)
✗ 1px 像素 align·**不必** (raster mock·非 UI 切图)
```

### 2.3 这条规则的意义

**不要让 Codex 在篆刻字上死磕·而错失整体氛围**·B v3 trial 3 张失误就是这个·**整屏对了·细节自然顺**·

---

## §3·5 张独立 prompt

### 3.A·#G 主屏 idle·**默认 gt-zhaozheng 朝政中心 dashboard**

**v2 改记**·v1 错描述 gt-edict (拟诏起草)·实际游戏默认开 gt-zhaozheng (朝政中心 dashboard)·内容是 5 group action 网格·非待批奏疏卷轴·

```
中国古代帝王治国游戏 UI·整屏 mock·主屏标准玩态·默认 "朝政" tab·
1280×800·.webp·default 主题·#241e18 / #c9a85f / #8a3a2e / #d4c9b0·

==== 整屏 5 区·top → bottom·left → right ====

[顶栏 #bar·~80px 横长·分 5 段·左→右]

段 1·左 logo·~120px
  bar-seal 印章·"天/命" 二字·朱泥·小方印·
  bar-wentian 按钮·"问 天" 楷书·

段 2·朝代+日期·~160px·竖排小字
  dynasty·"大明" 大字·楷书·
  date·"壬寅四月十二"·小字·
  turn-text·"第 32 回合"·更小字·

段 3·物候印·~100px
  bar-weather-seal·圆形朱印·季节字 (春/夏/秋/冬·当前"春")·
  bar-weather-name·"清明" 小字·
  bar-weather-desc·"东风解冻·萍始生" 更小字·

段 4·7 vars 横排·~720px·**dense·每 cell ~100-110px·非简单数字**
  每 var cell 包含·
    [篆体单字印 (24-28px·彩按 var)]·
    [主数值·暖金·_barFmtNum (大数 万/亿 后缀)]·
    [▲/▼/— 趋势箭 (10-12px·绿/红/灰)]·
    [state 药丸 (8-10px·按 state 色·圆角小标)]·
  7 var 与篆体字·
    帑 (帑廪·国库银粮布·gold)
    内 (内帑·帝王私库·gold)
    户 (户口·人口·celadon)
    吏 (吏治·腐败·purple)
    民 (民心·情绪·vermillion)
    权 (皇权·实权·indigo)
    威 (皇威·威望·amber)
  cell 间·细横墨线分隔·
  state 药丸文·"充裕 / 尚可 / 紧 / 亏空 / 破产" / "稳 / 升 / 跌" 等

段 5·右 utility·~140px
  bar-save-chip "已 存"·小印章·
  bar-ai-live "AI" 圆点 (绿/橙/红 状态)·
  bar-todo-badge "办" 圆角红标 (digit·若有 todo)·
  bar-more-vars "全部变量" 小印章·

#bar 整体·朱漆木 / 黑漆描金背·非塑料·非渐变·

[左 rail·~64-72px 宽·全高·**12 颗·上 9 内容 + 下 3 utility 分档**]

上 9 颗·朱泥湿润·亮·篆体字·
  势 (c-fac·indigo) 党 (c-party·purple) 阶 (c-class·celadon)
  军 (c-army·vermillion) 政 (c-admin·indigo·**行政区划·非政事**)
  科 (c-keju·celadon) 物 (c-item·gold·**文物·非物候**)
  宫 (c-harem·vermillion) 图 (c-map)

[细横墨线分隔]

下 3 颗·朱泥稍干·暗一档·或边框白·篆体字·
  题 (c-theme·**主题切换·UI utility·非题本**)
  声 (c-audio·**音声·音乐音效·非声望**)
  帮 (c-help·**帮助·非帮派**)

每颗·寿山石材方印·8-12px alpha 边距·朱泥填字·色按 c-class·

[中心 #gc·~70% 宽·全高]

[breadcrumb·~26px 横]
"朝野要务 ›  本朝纪要 ›  朝政"  (左·楷书小字·gold-300)
                              [搜寻] [帮助]   (右·小印章按钮)

[tab bar·~32-40px 横·**13 tab·5 group**·非 6 tab]
group 标签灰小字·下排 tab 按钮·按 group 分栏·
  [政务] 朝政 (active·朱印高亮) | 诏令 | 奏疏 | 朝议
  [问答] 问对 | 鸿雁
  [纪录] 编年 | 起居注 | 纪事 | 史记
  [臣子] 官制 | 人物志 | 地方
  [文考] 文苑 | 科举
group 间·细竖墨线分隔·

[panel·当前显示 gt-zhaozheng 朝政中心]

中央标题·"〔 朝 政 中 心 〕" (横排·楷书或篆体·~24-28px)·
sub·"第 32 回合 · 壬寅四月十二·清明" (小字·gold-300)

[5 group action 网格·zz-group 上下堆叠]

[内政] (icon office·gold)
  网格 4 item (zz-item)·横排或 2×2·each·
    icon (16px) + label "下诏令" + sub "政令/军令/外交/经济" + 状态点 (绿●ok)
  4 项·下诏令 / 科举取士 / 地方区划 / 地方舆情

[军事] (icon troops·vermillion)
  3 项·军事诏令 / 制度改革 / 地图总览

[人事] (icon person·gold)
  3 项·官制任免 / 人物志 / 问对臣子

[外交] (icon faction·celadon)
  3 项·外交诏令 / 遣使出使 / 鸿雁传书

[发展] (icon policy·amber)
  3 项·科技树 / 民政树 / 朝议

[底·zz-summary·小字]
"国库 12,300 两  战争 2 起" (战争数字若有则朱字·无则灰)

#gc 整体·真宣纸 + 墨笔楷书·dashboard 网格·**留白足·非 dense list·非待批奏疏**·

[右 rail·~64-72px 宽·全高·9 颗·朱泥]

篆体字 9 颗·
  朕 (c-self·gold) 辰 (c-time·gold·12 时辰)
  臣 (c-class) 缘 (c-rel) 议 (c-issue)
  志 (c-goal) 帑 (c-fin) 讯 (c-news)
  闻 (c-rumor)

每颗·同左 rail 寿山石方印·色按 c-class·

[底栏 #gs-status-bar·~36px·拓本横边]
真碑拓黄·阴文小字·横排·分段·
  "AI · 在 思"  ◆  "已 存"  ◆  "T32 · 戌 时"  ◆  "[Q] 政 [E] 诏 [W] 议 [Esc] 退"·
朱点 ◆ 分隔·

[右下浮 #gs-turn-float·cluster fab]
6 小印章 fab (拟诏✎ / 发信✉ / 召对❋ / 朝议☰ / 奏疏◆ / 纪事❖) + 1 大按钮 "结算回合"·
6 fab 簇·小印章·朱泥·上视角·
大按钮·~120×40px·"结 算 回 合" 篆体·朱泥+金边·

==== 材质 ====

#bar·黑漆描金 OR 朱漆木横额·有漆光泽·非塑料·非渐变·
左 / 右 rail·寿山石板背 / 雕版木 (上 9 亮 / 下 3 暗)·暗褐·
#gc 整屏·真宣纸·偏暖米白·有纤维 + 自然褶痕·
breadcrumb·宣纸题签·墨笔小字·
tab bar·宣纸长卷·tab 按钮·active 朱印盖·idle 墨笔·
朝政中心 5 group·宣纸 + 墨笔楷书·icon 雕版木刻·
zz-item 状态点·green ●·gray ○·色按 group·
底栏·拓本黄·斑驳·阴刻·
fab·朱泥小印章·结算大按钮 朱泥+金边·

==== 风格 ====

宋画文人案 / 帝王视角 / 上视角 / 三远法·
留白·30-50%·宣纸大片·**朝政中心 dashboard·疏密相间·非待批奏疏 dense**·
密度·#bar 信息密 (7 vars)·rail 印章排满·#gc 中央 dashboard 网格·
帝王感·非平民书房·非现代办公桌·非 RPG 主菜单·

==== 颜色 ====

主调·default·暖深褐底 (#241e18-#1a1510) + 暖金 (#c9a85f-#d4ba6e) + 朱红 (#8a3a2e-#a3582d) + 暖纸白 (#d4c9b0) + 墨黑 (#1a1410)·
group 色·内政 indigo / 军事 vermillion / 人事 gold / 外交 celadon / 发展 amber·
**禁·**verm 主题主红 #7a1f1a (这是 default 不是 vermillion)·

==== 否定 ====

NO Latin·NO 3D·NO neon·NO gradient orb·NO red-gold luxury·NO dragon·NO fantasy palace·NO Western flourish·NO 满屏精致·
NO 现代 PC 桌面感·NO RPG 主菜单·NO Material Design·NO Apple HIG·NO Adobe XD·
NO 7 vars 简单数字横排 (必须每 var 印 + 数 + 趋势 + 药丸·dense)·
NO #gc 待批奏疏卷轴 (这是 gt-memorial 不是 gt-zhaozheng)·

==== 安全网 ====

若 #gc 是待批奏疏 / 卷轴叠 / 砚台案上·重生 (这是 gt-memorial 错位)·
若 #bar 7 vars 是简单数字横排·重生 (必须 dense 5 元素 cell)·
若 tab bar 只 6 tab·重生 (必须 13 tab 5 group)·
若 rail 12 颗都同亮度·重生 (上 9 + 下 3 必分档)·
若整屏过满 / 留白不够·重生·
若色调偏 vermillion (主红)·重生·
若 chip / 数字 / icon 字不精确·**OK·mock 是示意·后续细节 batch 单独生**·
```

### 3.B·#G + 左 drawer·**朝野内情 overlay·势力段被点开**

**v2 改记**·v1 错描述 4 tab (势力/党派/阶层/区划)·实际 drawer 是 **12 段连续堆叠 panel**·rail 12 按钮 = 锚点跳转 (滚到对应 data-panel-key)·非 4 tab 切换·

```
中国古代帝王治国游戏 UI·整屏 mock·朝野内情 drawer 态·势力段已滚到顶·
1280×800·.webp·default 主题·

==== 与 A 的差 ====

[左 rail·状态]·当前点开"势"颗 (第 1 颗)·**该颗高亮 (active 朱印·brightness +20%)**·其余 11 颗 idle·

[左 drawer #side-drawer 滑出·340px 宽·全高·从左 rail 右侧滑出]
盖住·#gc 左侧 ~30% (rail 仍可见在最左 64-72px)·
内容·"朝野内情" 标题 + 4 tab (势力 / 党派 / 阶层 / 区划) + 当前 "势力" 列表·

[drawer 顶·sticky·~50px]
"朝 野 内 情" 篆体题签 + 朱印边框·
[当前段·势 力 格 局]·sub gold-300 (跟随滚动 anchor)·
关闭按钮·小印章 "退" 在右上·

[drawer 主区·12 段连续堆叠 panel·当前滚到 fac (势力) 段顶]

可见段顺序 (按现 _renderShellExtrasLeft 实际堆叠顺序)·
1·朝代主题 (dyn)·panel-hdr "朝 代 主 题" + count chip "衰 期"
   内容·"魏阉初除·党争未息·外虏压境·天象示警" 一段描述
2·四时物候 (weather)·panel-hdr "四 时 物 候" + count chip "孟春"
   内容·季节圆盘 (4 季彩印) + 行 "天象 风调雨顺 / 物候 东风解冻 / 月 第 1 月"
3·**势 力 格 局** (fac·**当前 anchor 滚到此段**·panel 边框朱印高亮)
   panel-hdr "势 力 格 局" + count chip "8"
   ~6 行势力·each 行·
     [色块 (按 fac type)]·势力名 (篆体大字·"东林" / "阉党" / "宗室")
     leader 名·楷书小字·"汪文言 · 江南"
     态度 chip·朱印 (友好/中立/敌对/附属)·
     strength 数字·楷书 "75"
   分隔·墨水横线
4·党 派 纷 争 (party)·partial visible (上面 1-2 行)
   panel-hdr "党 派 纷 争" + count chip "6"
   每行·党名 (篆体大) + 影响力 bar (墨水填) + 数字
5+·阶层 / 军事 / 区划 / 科举 / 文物 / 后宫 / 天下图 / 主题 / 音声 / 帮助
   下方滚出可见区·**Codex mock 不必画**·

[drawer 底·~30px]
小注脚·阴刻字·"凡有威权·必朋党" 楷书小字·

==== drawer overlay 阴影 ====

drawer 右边缘·墨色淡墨阴影向 #gc 弥散·~6-12px·有水墨晕感·非 box-shadow 直角·

==== rest 同 A·部分被盖 ====

#bar 顶栏·全见·
左 rail·全见 (当前 "势" 颗高亮)·
右 rail·全见·
#gc·部分被 drawer 盖 (左 ~30%·右 ~70% 露)·gt-zhaozheng tab 仍 active·只露右半 5 group 的部分·**模糊感**·

==== 材质 ====

drawer 背·宣纸卷·墨水题签·朱印边框·
势力名·篆体大字·墨色·
朱印徽记·各色寿山石+朱泥·
实力条·墨水满布 / 半填·非 LED progress bar·

==== 风格 ====

drawer 是文人画卷感·非现代 sidebar·
overlay 阴影·墨色淡墨·非黑色 box-shadow 现代感·

==== 否定 ====

同 A·+ NO modern sidebar / NO Material drawer / NO LED progress bar·

==== 安全网 ====

若 drawer 像现代 web sidebar·重生·
若势力名不可读 (篆体过于难辨)·重生·
若实力条像 progress bar·重生·
```

### 3.C·chaoyi-modal·**廷议 v3·分轮辩议态 (phase=debate)**

**v2 改记**·v1 写"5-8 人物水墨皴"未明示模式 / phase·实际 chaoyi 是 4 模式 modal·v2 明示·**廷议 v3·分轮辩议 phase**·这是 visually 最 rich 的 phase·三班潮汐 + 流式气泡 + 进度条 + 档位选择·

```
中国古代帝王治国游戏 UI·整屏 mock·廷议 v3·分轮辩议态·
1280×800·.webp·default 主题·z-index 5000 全屏 modal·

==== 布局 ====

[全屏遮罩 + 廷议 modal 中央 ~85% 宽 90% 高]
墨色淡墨遮罩·非黑·有水墨晕感·~85% 透明度·
背 #G 主屏隐约可见·rail 退后·

[modal 顶·sticky·~80px]
顶左·碑额·篆体大字·"〔 分 轮 辩 议 〕" (~32-36px)·
sub·楷书小字·"主奏 → 同党附议 → 敌党驳议 → 中立权衡"·
顶右·关闭印章 "✕" + "退" 题签·

[modal 顶下·sticky 进度条·~24px]
"〔 第 三 轮 / 共 四 轮 〕" 篆体小字·
进度横条·~600×6px·墨水填·从青→金渐变·当前 75% 填·
sub·"主 奏 · 同 党 · 敌 党 · 中 立 →" 4 段标·

[modal 主区·上 ~25%·议题块]
议题题签·"议·罢盐铁专卖·疏减赋税" (篆体大字)·
主奏者·"户部尚书 张某" + 党派色块 [东林 indigo] + 影响力 "75"·
弹劾奏疏摘要·~2 行楷书·墨笔·

[modal 主区·中 ~50%·三班潮汐 + 流式气泡]

三班潮汐条·横排·~50px·分 3 段·
  [同党 4 人]·indigo 半透色块·名字簇聚 (4 个小印)·"东 林"
  [中立 3 人]·gold 半透色块·"中 立"
  [敌党 5 人]·vermillion 半透色块·"阉 党"

气泡发言流·~6-8 个气泡·从上到下·流式排列·
  气泡 1·〔同党·主奏〕"江南灾甚·盐铁征敛过重·当减赋以纾民困" (东林 indigo 边)
  气泡 2·〔同党·附议〕"国赋有常·宜先察民情" (东林 indigo)
  气泡 3·〔敌党·驳议〕"国无库则不能御边·减赋速亡" (阉党 verm 边)
  气泡 4·〔敌党·驳议〕"祖宗之法·岂可轻改" (阉党 verm)
  气泡 5·〔中立〕"或可两利·征其七而免其三" (中立 gold)
  气泡 6·〔流式·当前·逐字展开...〕"陛下当察其轻重 ..."·部分字·

气泡形·云纹 / 卷云形·从人物口出·阴墨字·~15-25 字一句·
气泡左侧·小印 (人物名 1-2 字篆体)·

[modal 主区·下 ~25%·档位选择 + 反馈]

档位 5 按钮·横排·朱印 + 篆体大字·~80×80px each·
  [S 上]·朱印·"威 权 大 振"·墨笔反馈
  [A 中上]·朱印·"威 权 略 升"
  [B 中]·朱印·"勉 平 议"
  [C 中下]·朱印·"威 权 略 损"
  [D 下]·朱印·"威 权 大 损"

[底·操作]
[罢·改日再议] [打 断] [建 言 要 点]  按钮·楷书

==== 两侧 ====

modal 边·留 ~7.5% 露左 rail + 右 rail·rail 印章淡化 (modal 焦点)·

==== 材质 ====

遮罩·淡墨水彩·非黑 mask·有水墨晕·
modal 背·真宣纸长卷·展开横铺·边缘略卷·
碑额·真石碑刻·阴文·有岁月磨损·
进度条·墨水填青→金 渐变·真水墨·非 LED·
气泡·宣纸 + 墨笔·云纹卷云·边按党派色 (indigo / verm / gold)·
档位印·朱泥湿润印·篆体阳刻·

==== 风格 ====

朝堂气泡画感·非现代 chat·非 RPG dialog·
进度条·真水墨晕·非 LED progress·
档位印·真朱泥盖·非 button hover·

==== 否定 ====

同 A·+ NO modern modal·NO chat bubble·NO LED progress·NO RPG turn-based menu·NO 动漫·NO emoji·NO 3D portrait·

==== 安全网 ====

若 modal 像 popup window·重生·
若人物 (气泡左印) 像动漫角色·重生·
若气泡像 web chat·重生·
若进度条像 LED·重生·
若档位 5 按钮像 web button·重生·
```

### 3.D·#launch 启动屏

```
中国古代帝王治国游戏 UI·整屏 mock·启动屏·非 #G·
1280×800·.webp·default 主题偏暖·

==== 布局 ====

**v2 改记**·v1 楹联用"天命在兹·问鼎中原"占位·实际硬 quote 周易·v1 4 卡描述泛·实际 4 卡有具体 cn / ti / desc / meta / kbd·v2 全按 audit §8.4 实写·

[全屏背景]
真宣纸 / 拓本黄底·斑驳·有古意·有水墨晕染·
背景纹·淡淡山水皴 / 远山 / 云气·非满堆·30-50% 留白·

[左侧·楹联竖排·home-ylian.l]
"天 行 健 · 君 子 以 自 强 不 息" 竖排·墨色·
下小字·"—— 周易"·更小·灰·
透明度 0.4·背景装饰·

[右侧·楹联竖排·home-ylian.r]
"地 势 坤 · 君 子 以 厚 德 载 物" 竖排·墨色·
下小字·"—— 周易"·更小·灰·
透明度 0.4·

[四角·corner-flower·tl/tr/bl/br]
4 角各一·SVG 装饰·金线 + 朱点 (现 SVG 已美·**Codex 重做时 raster 化·或保留 SVG 当装饰**·非主体)·

[中央上·home-axis 主轴]
"天　命" 二字大字 (横排·~80-120px 高)·篆体或碑刻·墨色填 + 描金·
下·"奉 天 承 运 皇 帝 　诏 曰 ：" 楷书 + 朱印 "玺" (~44×44px·朱泥)·
下·"AI  历  史  模  拟  推  演" 副标·小字·gold-300·

[中央偏下·home-menu·4 卡 grid 2×2 (或 4 卡横排)]
gap 16px·each ~280×100px·
卡 1·c-new (开卷)
  icon 圆 ~38px·"卷" 字·篆体小印·gold-300
  cn (主标) "开　卷"·篆体 ~19px
  ti (副标) "开 始 新 游 戏"·楷书 ~12px
  desc·"选择剧本 · 载入世界 · 敕定天命"·楷书 ~15.5px
  meta·左 "官方 · 自定义剧本" / 右 "↵" kbd

卡 2·c-load (续卷)
  icon "续"·cn "续　卷"·ti "读 取 存 档"
  desc·"启封卷宗 · 抄录副本 · 承续推演"
  meta·左 "卷宗目录" / 右 "Ctrl+L" kbd

卡 3·c-edit (著卷)
  icon "著"·cn "著　卷"·ti "创 作 新 剧 本"
  desc·"开炉鼓铸 · 立言成卷 · 遗之后人"
  meta·左 "编辑器" / 右 "Ctrl+E" kbd

卡 4·c-set (典章)
  icon "典"·cn "典　章"·ti "游 戏 设 置"
  desc·"API · 字数 · 文风 · 音声"
  meta·左 "偏好调度" / 右 "Ctrl+," kbd

每卡·宣纸纹背 + 朱印 icon + 墨笔 + 楷书 desc + 灰小字 meta·**非 modern card shadow**·

[邸报·近事·home-recent·~720×40px]
横长·拓本黄横边·阴刻小字·
"〘 近 事 〙" 题签·朱印小印·
3 卡·each·朱印 [自] 或 [封] + 楷书 "明启盛 第八回" / "崇祯七年 第十六回" 等·**占位即可**·
若空 (无存档)·"未 见 封 卷 · 启 新 纪 元" 楷书一行·

[底栏·home-foot·~36px·横长]
左·"天 命　v0.9-β" 楷书小字·gold-300·
中·物候·"春 分 ◆ 太 平 ◆ 河 清 海 晏" (◆ 朱点·楷书)·
右·快捷键 4 段·
  [📜 邸 报]  [↵ 开 卷]  [? 帮 助]  [Esc 退 出]
  kbd 边框小字·gold-300·

==== 材质 ====

背景·真宣纸 / 拓本·斑驳·
"天命" 二字·真石刻 / 真碑·阴刻或阳刻·墨色填或描金·
4 卡·宣纸 + 木漆·有手感·非 modern UI card·
邸报·拓本横长·阴刻字·

==== 风格 ====

中国古代书院 / 文人案启程感·
非游戏启动屏·非现代 launcher·非 RPG 主菜单·
留白·~50%·非满布·

==== 颜色 ====

主调·default 暖偏·deep brown bg + 暖金 + 朱红印章·
"天命" 大字·墨色 + 描金·气派·
4 卡·朱印 + 墨笔·

==== 否定 ====

NO Latin·NO 3D·NO neon·NO red-gold luxury (太满)·NO dragon·NO fantasy·
NO modern game launcher·NO RPG main menu·NO Material card·NO web hero section·

==== 安全网 ====

若像现代游戏启动屏·重生·
若"天命"二字像 logo design·重生·
若 4 卡像 Material card·重生·
若楹联过满 / 喧宾夺主·重生·
```

### 3.E·#turn-modal 回合 modal

```
中国古代帝王治国游戏 UI·整屏 mock·回合 modal 态·
1280×800·.webp·default 主题·

**v2 改记**·v1 简略叙事文·v2 按 audit §7 实写·头有要闻 chip 5 类·叙事 narr-shizhengji + narr-zhengwen 两段题签·统计 bar 7 vars delta·翻阅 + 导出·

==== 布局 ====

[全屏遮罩]
墨水淡黑·非纯黑·有水墨晕·
透明度 ~85%·背 #G 主屏隐约可见·z-index 1000·

[modal 中央·~80% 宽 90% 高]
真宣纸卷·展开横铺·边缘卷起·

[modal 顶·~120px·sticky·tr-header]

  顶左·
    "第 3 2 回 合" 楷书大字·gold-300·~24-28px·
  顶中·
    主日期·"壬 寅 四 月 十 二" 楷书 ~18-20px·
    era chip·"[甲 子]" 篆体小印·朱泥·边小印章·
  顶下·一句话总曰 (tr-summary)
    "边 事 告 急 · 西 凉 急 报" 楷书 + 朱批·~16-18px·
  顶下·要闻 chip 行·"本 回 要 闻" 灰小字 + 5 类 chip·
    war 战 事 (红边·朱字)
    death 人 殂 (紫边·墨字)
    scheme 密 谋 (灰边·墨字)
    faction 党 争 (橙边·墨字)
    calamity 灾 异 (黄边·墨字)
    mock 中·展示其中 1-3 chip (例·[战 事] [人 殂])·
  顶右上·关闭印章 "退" + "✕" 题签·

[modal 主区·~70% 宽·叙事区·turn-body]

narr-shizhengji 段 (时政 narrative)·
  题签·"〔 时 政 〕" 篆体小印·朱泥·
  正文·墨笔楷书·~30-50 字一段·~3 段
    "壬寅四月·西凉急报·虏骑南下·边将告急 ..."
    "户部上奏·军费支出大增·请减太仓 ..."
    "民间风声·传言朝中有内通敌·京师小动 ..."
  朱批·小字注脚·"已下圣旨" / "驳回" / "留中"·~10 字·

narr-zhengwen 段 (政文 narrative)·
  题签·"〔 政 文 〕" 篆体小印·朱泥·
  正文·墨笔楷书·~30-50 字一段·~2-3 段
    "诏曰·西凉边事紧急·特命户部尚书张某率军北上 ..."
    "又诏·罢盐铁专卖·疏减赋税·以纾民困 ..."

分隔·墨水横线·或留白·

[modal 底·turn-summary-bar·~80-100px]
回合统计·横长卡·拓本横边·阴刻数字·
7 var delta 横排·each·
  小印章 (var 篆字 帑/内/户/吏/民/权/威·彩) + 数字 + 升降箭
  朱字 + (帑廪 +200·正向)
  墨字 - (民心 -2·负向)
  灰字 — (皇威 0·持平)

[modal 底底·翻阅 + 导出]
横排·gold-300 楷书 button·
  [‹ 前 回]   现 32 / 总 50  [后 回 ›]   ◇   [导 出]
gap 16px·

[modal 边]
modal 周围露 #G 主屏 ~10%·rail / #bar 隐约可见 (墨色淡)·

==== 材质 ====

遮罩·淡墨·非黑 mask·
modal 背·真宣纸卷·展开·有褶痕·边缘自然卷·
碑额·真石碑·阴刻·有岁月磨损·
正文·墨笔楷书·非印刷字·
朱批·朱泥小字·真朱·
统计 bar·拓本横边·阴刻数字·

==== 风格 ====

帝王观史·非游戏 popup·非现代 modal·
卷轴展开感·非 dialog box·
留白·modal 内 ~30%·非满字·

==== 否定 ====

同 A·+ NO modern dialog / NO popup window / NO RPG turn end screen·

==== 安全网 ====

若 modal 像 popup·重生·
若卷轴边缘机械直·重生·
若叙事文像现代印刷·重生·
若统计 bar 像 progress dashboard·重生·
```

---

## §4·试 batch 协议·**2 波**

### 4.1 波 1·A / B / C·**3 张 #G 状态族**

```
[Codex] 一次接 3 prompt·一次 session 出 3 张·
        风格强统一 (同 baseline)·
        若 session 出 1-2 张就漂·停下·重生·
        放·web/assets/ui/phase8/scenes/screen-overall-{a/b/c}-{state}-trial.webp
        ↓
[user] 看 3 张·ACK / 调 / 重生
        ↓ ACK
        进波 2
```

### 4.2 波 2·D / E·**2 张 非 #G 状态**

```
[Codex] 一次接 2 prompt·一次 session 出 2 张·
        风格按波 1 baseline·**Codex 应自看波 1 三张·锁基线再生**·
        放·screen-overall-{d/e}-{state}-trial.webp
        ↓
[user] 看 2 张·ACK / 调 / 重生
        ↓ ACK
        全 5 张 ACK → Phase 8 视觉身份 lock
```

### 4.3 ACK 标准 (per 张)

```
[ ] 整体视觉身份在 §1·真宋画文人案 / 帝王视角·非现代 / 非 RPG / 非 Material
[ ] 材质·真宣纸 + 真朱泥 + 真石材·非 PS 滤镜
[ ] 留白·30-50%·非满堆
[ ] 主题色·default 主调 (深褐 + 暖金 + 朱红 + 纸白)·非 vermillion 主红或他主题
[ ] 主体密度合理·rail 印章排满·#gc 适中·留白足
[ ] 元素类型分布对·#bar 7 vars / rail 12+9 印章 / #gc dense / 底 status
[ ] 风格 5 张内一致·非 5 张 5 风格
[ ] 篆刻字 / chip 文 / 数字·**示意即可**·不必精确
```

### 4.4 5 张全 ACK 后

```
[Claude] 写 letter to Codex·"波 1+2 视觉 lock"
         → 启所有细节 batch·按 master §11 doc 关系图顺序·
         B v3 (21 篆刻) → 5th (时辰仪器) → portrait → texture → ...
```

---

## §5·若错·重生路径

### 5.1 错处分类

```
A·整屏过满 / 留白不够      → 加 "30-50% 留白·宋画式" → 重生
B·材质像 PS 滤镜            → 加 "真宣纸纤维·非 vector / 非 flat" → 重生
C·风格偏现代 / RPG          → 加 "非 RPG / 非 game launcher / 非 Material" → 重生
D·色调偏 vermillion         → 加 "default 主题·非 vermillion / 非 verm bg" → 重生
E·5 张风格不一致 (波内)      → 重生 1 张·按已 ACK 张作 baseline → 重生
F·篆刻字 / chip 字 不对      → **OK·mock 是示意·不必修**
G·3D / neon / luxury         → 加 8 Guardrays 重述 → 重生
```

### 5.2 ABSOLUTE NO

```
若 Codex 自觉·"整屏太复杂·SVG 拼更稳"·"分块拼图更可控"·
→ 立刻意识·**这背离 Phase 8 image-based UI 前提**·
→ 推回 Claude·让 Claude 加固 prompt·
→ B v2 教训·禁第二次·
```

---

## §6·Codex 输出 (Codex 看)

### 6.1 波 1·3 张

放 `C:/Users/37814/.codex/generated_images/<session>/`·或直 `web/assets/ui/phase8/scenes/`·

文件名·

```
screen-overall-a-game-idle-trial.webp
screen-overall-b-game-drawer-trial.webp
screen-overall-c-chaoyi-modal-trial.webp
```

附说明·

```
波 1·3 张 #G 状态族·
风格 baseline·材质 / 留白 / 主题色 / 密度 lock·
若 user ACK → 进波 2 (D/E)·
若 user 调 → 重生·
```

### 6.2 波 2·2 张

```
screen-overall-d-launch-trial.webp
screen-overall-e-turn-modal-trial.webp
```

附说明·

```
波 2·按波 1 ACK baseline 生·非 #G 状态·
启动屏 / 回合 modal·
风格统一·
```

### 6.3 Claude 接 (5 张全 ACK 后)

去 `-trial` 后缀·**不删 trial**·留作 baseline 参考·**8-δ wire 启**·所有细节 batch 启 (按 master §11)·

---

## §7·Codex 不生 (本 batch 不在工作)

```
[ ] 篆刻 21 字独立 PNG ─────── 后续 batch B v3 (paused·待波 1+2 ACK 启)
[ ] portrait 独立 PNG ───────── 后续 batch (8-η)
[ ] texture tile / seamless ─── 后续 batch (8-η)
[ ] 6 主题各 1 套 (5 张×6) ───── 后续 (option B·CSS filter / hue-rotate)·禁本波生
[ ] 移动 (≤768px) ────────────── CSS-only fallback·Codex 不生
[ ] 4 状态 (active/hover/idle/disabled) ── option B·CSS filter·Codex 只生 idle baseline
```

---

## §8·后续 batch 顺序 (本 doc 后)

```
本 doc·    screen-overall (5 张整屏 mock)        ← 当前·P0
波 1+2 ACK 后·    Phase 8 视觉身份 lock
                ↓
后·    B v3 (21 篆刻 rail icons)·prompt 已写·待启
后·    A v3 alt (#gc 5 tab dense·若整屏 mock 已 cover·可省·或精化)
后·    5th (时辰仪器 1-2 张)
后·    notify-urgent frame
后·    portrait (~50-150 张·8-η)
后·    texture / 6 主题素材 (8-η)
```

---

## §9·与 batch B v3 的关系

`phase8-codex-prompt-batch-b-v3-seals.md` (419 行·21 篆刻) **暂停 (PAUSED)**·

```
[ ] 等本 doc (screen-overall) 5 张全 ACK
[ ] B v3 篆刻字体类型 lock (汉印篆 / 九叠篆 / 小篆 哪种)
[ ] B v3 主题色 lock (整屏 mock 上印章颜色 + 朱泥湿度 baseline)
[ ] 然后·B v3 启·按 mock baseline 生 21 字
```

`-trial` 3 张 (seal-01-shi/02-dang/03-jie-trial.png) 留 dir·**整屏 ACK 后看是否能继续用·或重生**·

---

## §10·变更日志

- 2026-05-05·init·Claude·post B v3 trial 评估·user 选方案 C 5 张·
- 2026-05-05·v2·post audit (`phase8-ui-operational-content-audit.md` 1012 行) **5 屏 prompt 全改**·
  - §3.A 主屏·默认 gt-zhaozheng dashboard (非 gt-edict)·tab 13 (非 6)·breadcrumb·#bar 7 vars dense·rail 12 上 9 + 下 3 分档
  - §3.B drawer·12 段连续 (非 4 tab)·势力段 anchor 滚到顶
  - §3.C chaoyi·明示 廷议 v3 分轮辩议态·三班潮汐 + 流式气泡 + 进度条 + 档位 5 按钮
  - §3.D launch·楹联硬 quote 周易·4 卡精确内容 (cn / ti / desc / meta / kbd)
  - §3.E turn-modal·头有 5 类要闻 chip + 主日期 era chip·叙事 narr-shizhengji + narr-zhengwen 两段·统计 7 vars delta + 翻阅 + 导出

---

— Claude (Phase 8·Codex prompt batch screen-overall·v2·post audit·2026-05-05)
