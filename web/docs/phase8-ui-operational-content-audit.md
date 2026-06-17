# Phase 8·UI 实际操作内容 audit·**Codex 整屏 prompt 必读**

date·2026-05-05·status·**P0·post screen-overall prompt v1·user catch "你理解错了" → audit 6 区域**·owner·Claude

依据·Path A 全 audit·读 hongyan-office.js + shell-extras.js + topbar-vars.js + game-loop.js + index.html·**~3h 实读**·

---

## §0·**与现 screen-overall prompt 的差距** (核心 catch)

### 0.1 我之前 prompt §3.A·**错的 6 处**

| # | 我之前写 | 实际 | 错处 |
|---|---|---|---|
| 1 | `#gc gt-edict (拟诏) tab dense·展开 2 卷待批奏疏` | gt-edict 是**起草编辑器** (5 textarea)·"待批奏疏"是 **gt-memorial** | 把"起草 outgoing"和"接收 incoming"混 |
| 2 | 6 tab·拟诏 / 发信 / 召对 / 朝议 / 奏疏 / 纪事 | **13 tab·5 组** (政务 4 / 问答 2 / 纪录 4 / 臣子 3 / 文考 2) | 漏 7 tab |
| 3 | 默认打开 gt-edict | 默认 **gt-zhaozheng (朝政)** dashboard·5 group action grid | 默认屏完全错 |
| 4 | 题 = 题本 / 声 = 声望 / 帮 = 帮派 (我猜) | 题 = **主题切换** (UI theme)·声 = **音声** (audio)·帮 = **帮助** | rail 3 颗印章语义错 |
| 5 | rail 印章是装饰 | rail 印章每个 onclick `openSideDrawer('left'/'right', key)` 开 drawer | 功能模型错 |
| 6 | #bar 7 vars 是简单数值 | 每 var = 篆体印 + 主数值 + 趋势箭 + state 药丸 + 3 sub-数 | 信息密度错 |

### 0.2 用 audit 修正 prompt·**~50% prompt 内容必改**

---

## §1·#G 主屏整体架构

### 1.1 真实 5 区 (top → bottom·left → right)

```
┌──────────────────────────────────────────────────────────────┐
│ #bar 顶栏·~80px·中央印章 朝代 / 物候 / 7 vars                  │
├──┬───────────────────────────────────────────────────────┬──┤
│  │ #gc 主区·breadcrumb + tab bar (5 group 13 tab) + panel│  │
│左│   gt-zhaozheng 默认开                                   │右│
│ ↓│                                                         │ ↓│
│12│   每 tab 内·印章 + 4 字主标 + 楹联 + 内容 (form/list/...)│ 9│
│颗│                                                         │颗│
│  │                                                         │  │
├──┴───────────────────────────────────────────────────────┴──┤
│ #gs-status-bar 底·~36px·AI 状态 / 存档 / 回合 / 快捷键          │
└──────────────────────────────────────────────────────────────┘
                                                  + #gs-turn-float 右下浮 fab
```

### 1.2 默认状态·**gt-zhaozheng 朝政中心**·dashboard

`tm-game-loop.js` L1304-1392·**Phase 8 整屏 mock 主屏 default 应展示这屏**·

**结构**·

```
〔 朝 政 中 心 〕                    ← 标题·中央
第 X 回合 · 第 Y 月 / 物候           ← sub·小字

[ 内政 ]  ← 5 group·each 含 3-4 action item (zz-item)
  ├ 下诏令       政令/军令/外交/经济  →  switchGTab(gt-edict)
  ├ 科举取士     开科取士             →  openKejuPanel
  ├ 地方区划     查看地方行政         →  openProvinceEconomy
  └ 地方舆情     各道州府民情         →  switchGTab(gt-difang)

[ 军事 ]
  ├ 军事诏令     调兵遣将             →  switchGTab(gt-edict) + focus mil
  ├ 制度改革     通过诏令发起          →  switchGTab(gt-edict) + focus pol
  └ 地图总览     势力分布             →  TM.Map.open

[ 人事 ]
  ├ 官制任免     查看官制树            →  switchGTab(gt-office)
  ├ 人物志       查看全部角色          →  switchGTab(gt-renwu)
  └ 问对臣子     与角色对话            →  switchGTab(gt-wendui)

[ 外交 ]
  ├ 外交诏令     遣使/和亲/结盟        →  switchGTab(gt-edict) + focus dip
  ├ 遣使出使     派遣使臣谈判          →  openDiplomacyPanel
  └ 鸿雁传书     发送密信              →  switchGTab(gt-letter)

[ 发展 ]
  ├ 科技树       军事/民用科技         →  switchGTab(gt-tech)
  ├ 民政树       城市/政策             →  switchGTab(gt-civic)
  └ 朝议         召开廷议              →  startChaoyiSession (modal)

国库 X 两                            ← 底·小字 summary
战争 N 起 (有则红)
```

每 zz-item·icon (tm-icon SVG) + label + sub + status dot (绿 ● ok / 灰 ○ disabled+理由)·

5 group·每 group 1 标题色 (内政 indigo / 军事 vermillion / 人事 gold / 外交 celadon / 发展 amber)·

**视觉感**·dashboard 网格·非 dense info·**留白足**·中央对称·

### 1.3 breadcrumb (在 #gc 顶)

```
朝野要务 › 本朝纪要 › <当前 tab 名>     (右) [搜寻] [帮助]
```

`tm-hongyan-office.js` L1624-1629·

---

## §2·#gc tab bar·**13 tab·5 group**

### 2.1 完整 tab list (`tm-hongyan-office.js` L1635-1651)

| 组 | tab id | label | icon (TM_ICONS) | 性质 |
|---|---|---|---|---|
| **政务** | gt-zhaozheng | 朝政 | office | dashboard·default |
| | gt-edict | 诏令 | scroll | 5 textarea 编辑器 |
| | gt-memorial | 奏疏 | memorial | 待批列表 |
| | gt-chaoyi | 朝议 | dialogue | **action·开 modal**·非 panel |
| **问答** | gt-wendui | 问对 | dialogue | 角色选 grid·点开对话弹窗 |
| | gt-letter | 鸿雁 | scroll | 收件人 + 编辑器·复杂 |
| **纪录** | gt-biannian | 编年 | chronicle | 编年史·搜索 / filter / 导出 |
| | gt-qiju | 起居注 | qiju | 帝王日记·分类·御批 |
| | gt-jishi | 纪事 | event | 时间线·按 时/人/类 view |
| | gt-shiji | 史记 | history | 帝王本纪 |
| **臣子** | gt-office | 官制 | office | 衙门树·六部卿寺 |
| | gt-renwu | 人物志 | person | 全角色 |
| | gt-difang | 地方 | faction | 道州府县 |
| **文考** | gt-wenyuan | 文苑 | scroll | 诗文总集·分类·风险标 |
| | gt-keju | 科举 | scroll | **action·开 panel**·非 tab |

13 tab + 2 conditional (gt-tech 科技树 / gt-civic 民政树·若 P.techTree / P.civicTree 配)·

### 2.2 每 tab 内·**统一标题 grammar** (重要·本身就很古风)

每 tab panel 顶部·`<div class="X-title">` 题签块·

```
[印章·1-3 字·朱泥红方块]  [主标题·4 字·间距大]
                          [副标·楹联 8-12 字·两行]
```

例·

```
[奏]    奏 疏 待 览              ← gt-memorial
[朱]    案牍之司　　百官启奏

[召见]  御 前 问 对              ← gt-wendui
        君臣之对　　面圣请对

[鱼]    鸿 雁 传 书              ← gt-letter
[雁]    笺札往来　　驿使传递

[编]    编 年 纪 事              ← gt-biannian
[年]    天子纪年　　诸事经年累载

[起]    起　居　注              ← gt-qiju
[居]    一日一录　起居饮食言动必书　藏之金匮石室
[注]

[纪]    纪 事 本 末              ← gt-jishi
[事]    以事系日　以日系月　以月系时　以时系年

[史]    史 记 本 纪              ← gt-shiji
[记]    究天人之际　通古今之变　成一家之言

[官]    六 部 卿 寺              ← gt-office
[制]    衙门职官　　班位各司其职

[文]    文 苑 · 诗 文 总 集       ← gt-wenyuan
[苑]    诗词歌赋　序跋记铭　经世风雅
```

**Phase 8 视觉·这套题签 grammar 必保留·这就是"中国古代视觉语言"的实例**·非通用东亚装饰·

### 2.3 每 tab 内容简述 (Codex prompt 用)

**gt-zhaozheng 朝政** (默认开屏)·

```
〔朝政中心〕中央标题
5 group dashboard·内政/军事/人事/外交/发展
每 group·3-4 action item (icon + label + sub + dot)
底·国库 / 战争 summary
风格·宋画 dashboard·疏密相间·非满 list
```

**gt-edict 诏令** (起草编辑)·

```
[君]   君 御 笔
[朱]   奉天承运皇帝　　诏曰

左 sticky sidebar (260px·议事清册 list·建议 chip)
右 主区·5 卡 (政令/军令/外交/经济/其他)
  每卡·圆 badge (政/军/外/经/他) + label + hint + textarea + forecast
风格·御笔题签 + 5 textarea 卡·dense info
```

**gt-memorial 奏疏**·

```
[奉]   奏 疏 待 览
[朱]   案牍之司　百官启奏

主区·zouyi-list·折子叠·每折·题签 + 摘要 + 来源 + 急缓 chip + 操作
风格·折子叠书案·非 list·有压重感
```

**gt-wendui 问对**·

```
[召见]  御 前 问 对
        君臣之对　面圣请对

主区·wendui-chars·角色 grid·每角色卡·portrait + 名 + 官 + status
点 → 弹对话 modal
风格·角色卡片墙·非 dense list
```

**gt-letter 鸿雁**·

```
[鱼/雁]  鸿 雁 传 书
         笺札往来　驿使传递

[路途警示 banner·若有] 红字 banner

主区·hy-main 双栏·
  左 (~30%)·远方臣子 list
    [群发] toggle button
    [搜索] input
    npc-list·每 npc·portrait + 名 + 官 + 地 + 党派
  中 (~70%)·
    letter-history·与该 npc 历史信件
    hy-compose-area·拟稿区
      title "书札拟稿" + target "(选择受信人)"
      row 1·信类型 select (密旨/征调令/问安函/私函/榜文) + 紧急程度 (普通/加急/八百里加急)
      row 2·加密 (不加密/阴符/阴书/蜡丸密函/帛书缝衣) + 发送方式 (普通信使/多路信使/密使)
      row 3 (若 密使)·密使人选 select
      textarea (4 rows·"致书远方臣子……")
      hint + [遣使] button
风格·朝廷尺牍·分栏·dense form
```

**gt-biannian 编年**·

```
[编/年]  编 年 纪 事
         天子纪年　诸事经年累载

bn-active (本朝纪要 - turn-by-turn 摘要)
[编年检索] 标签
tools·查阅 input + 分类 filter (军事/政治/经济/外交/文化/人事/天象灾异) + 导出 button
[编年史册] 标签
biannian-list·按年纵列·每年事件
风格·编年长卷
```

**gt-qiju 起居注**·

```
[起/居/注]  起 居 注
            一日一录　起居饮食言动必书　藏之金匮石室

statbar
tools·搜索 + 分类 filter (诏令/奏疏/朝议/鸿雁/人事/行止/叙事) + 排序 + 御批 only checkbox + 折叠叙事 + 导出
qiju-history·日纪·每条 时 + 类别 + 简述 + (可选御批)
风格·帝王日记本
```

**gt-jishi 纪事**·

```
[纪/事]  纪 事 本 末
         以事系日　以日系月　以月系时　以时系年

statbar
tools·view 切换 (时间线 / 按人物 / 按事类) + 搜索 + 角色 filter + 仅看星标 + 导出
jishi-list·按当前 view 列
风格·纪事时间线·三视图
```

**gt-shiji 史记**·

```
[史/记]  史 记 本 纪
         究天人之际　通古今之变　成一家之言

帝王本纪·按 turn 排序·每条·标题 + 正文 (narr-zhengwen) + 朱批
风格·帝王本纪长篇
```

**gt-office 官制**·

```
[官/制]  六 部 卿 寺
         衙门职官　班位各司其职

[衙门总览] tag·desc + [增设部门] [荐贤廷推] buttons
office-alerts·预警
office-summary·摘要 grid

[衙门层级] tag·desc
图例·正一品 / 二三品 / 四五品 / 六品以下 / 久任 / 不满·缺员
office-tree·SVG 树·六部·节点 = 官位·拖动 + 缩放
风格·衙门职官图谱·树状结构
```

**gt-wenyuan 文苑**·

```
[文/苑]  文 苑 · 诗 文 总 集
         诗词歌赋　序跋记铭　经世风雅

statbar (6 stat card·总录/传世/查禁/政险/本朝/文魁)
tools·搜索 + 触发分类 filter + 文体 filter + 排序 + 仅传世 + 隐查禁
legend
wenyuan-list grid·每作品卡·作者 / 标题 / 正文 / 品评星 / 风险徽
风格·诗文卷轴墙
```

**gt-renwu 人物志**·

```
(题签待 audit·tm-renwu-ui.js 读)

主区·全角色·grid 或 list·portrait + 名 + 官 + 党派 + 关系
搜索 / filter / 详情弹窗
风格·人物画卷
```

**gt-difang 地方**·

```
(题签待 audit·tm-* 读)

道州府县 hierarchy·每地·
  名 / 类型 (道/州/府/县) / 户口 / 民情 / 官员 / 朝廷态度
风格·地方舆情图志
```

---

## §3·左 rail·**12 颗印章·12 drawer**·**3 处我猜错**

### 3.1 完整 list·**实际语义** (`index.html` L156-170)

| # | 字 | title | drawer key | 真义 | 颜色 class |
|---|---|---|---|---|---|
| 01 | 势 | 势力 | fac | 各方势力格局 | c-fac (indigo) |
| 02 | 党 | 党派 | party | 党派纷争 | c-party (purple) |
| 03 | 阶 | 阶层 | class | 士农工商军宗 | c-class (celadon) |
| 04 | 军 | 军事 | army | 兵马要务 | c-army (vermillion) |
| 05 | 政 | **行政区划** | admin | 道州府县 hierarchy·**非"政事"** | c-admin (indigo) |
| 06 | 科 | 科举 | keju | 科举制度 | c-keju (celadon) |
| 07 | 物 | **文物** | item | 国宝 / 礼器·**非"物候"·物候在天气 panel** | c-item (gold) |
| 08 | 宫 | 后宫 | harem | 后妃·宫廷 | c-harem (vermillion) |
| 09 | 图 | 天下图 | map | 舆图 | c-map (?) |
| 10 | 题 | **主题** | theme | **UI 主题切换器·plain/ink/vermillion/celadon**·**我猜的"题本"完全错** | c-theme (?) |
| 11 | 声 | **音声** | audio | **音乐 / 音效 切换·**我猜的"声望"错** | c-audio (?) |
| 12 | 帮 | **帮助** | help | **帮助文档·**我猜的"帮派"完全错** | c-help (?) |

### 3.2 错处影响

`#10/11/12` (题/声/帮) 不是游戏内政经数据·而是 **UI 设置 / 帮助** 类 utility·

**Phase 8 篆刻 prompt·若 21 字按"游戏内容"生·题/声/帮 三字会被 user 误解为"题本/声望/帮派"**·实际它们是 utility 入口·**视觉应低调·与 1-9 颗"内容 rail" 区分**·

### 3.3 视觉建议 (Codex 整屏 mock 用)

```
左 rail 12 颗·上 9 内容颗 + 间隔 + 下 3 utility 颗·
内容 9 颗 (势/党/阶/军/政/科/物/宫/图)·朱泥湿润·亮·
utility 3 颗 (题/声/帮)·朱泥稍干·暗一档·或边框换白色·
间隔·8-12px gap·或细横墨线分隔
```

### 3.4 drawer 内容 (`tm-shell-extras.js` _renderShellExtrasLeft)

drawer 是连续滚动 panel·所有 12 段内容堆 (data-panel-key·dyn/weather/fac/party/class/army/admin/keju/family/tech/item/harem/map/bian/school/price/book/palace/theme/help/audio)·

rail 按钮·`openSideDrawer('left', key)` 开 drawer + 滚到 anchor·**类目录跳转**·

drawer 各段内容·

| key | 段标题 | 内容 |
|---|---|---|
| dyn | 朝代主题 | 兴期/盛世/守成/衰期 + 描述 |
| weather | 四时物候 | 季节圆盘 + 天象 + 物候 + 月 |
| fac | 势力格局 | 8 势力·名/领袖/领土/态度/实力 |
| party | 党派纷争 | 6 党派·名 + 影响力 bar |
| class | 阶层动静 | 6 阶层 (士农工商军宗) + 比例 + 心情 |
| army | 军事要务 | 兵马·番号/驻地/军种/兵力 |
| admin | 行政区划 | 道州府县 hierarchy |
| keju | 科举 | 当前科考 / 中举名单 |
| family | 家族 | (待 audit) |
| tech | 科技 | (待 audit) |
| item | 文物 | 国宝 / 礼器 list |
| harem | 后宫 | 后妃 / 子嗣 |
| map | 天下图 | 舆图 mini-preview |
| theme | 主题 | 4 主题切换卡 (素纸 / 水墨 / 朱砂 / 青绿) |
| audio | 音声 | 音乐音量 / 音效切换 |
| help | 帮助 | 操作指南 / 快捷键 |

---

## §4·右 rail·**9 颗印章·9 drawer** (`index.html` L175-186)

| # | 字 | title | drawer key | 真义 |
|---|---|---|---|---|
| 13 | 朕 | 朕亲 | self | 玩家角色卡·五常 / 性格 / 背景 |
| 14 | 辰 | 时辰 | time | 12 时辰圆盘 + 当前时段 |
| 15 | 臣 | 紧要之臣 | char | 关键大臣列表 |
| 16 | 缘 | 关系网 | rel | 人际关系图 |
| 17 | 议 | 议题 | issue | 当前议题 list |
| 18 | 志 | 大志 | goal | 长期目标·grand ambitions |
| 19 | 帑 | 岁入岁出 | fin | 帑廪流水 / 财政详细 |
| 20 | 讯 | 近事 | news | 近期事件 brief |
| 21 | 闻 | 风闻 | rumor | 民间传言·不确证 |

drawer 内容·`tm-shell-extras.js` _renderShellExtrasRight (L509-960)·堆 panel·各 data-panel-key·

各段标题 grammar 一致 (gs-panel-hdr + 标题 + count chip)·

---

## §5·#bar 顶栏·**7 vars 信息密度高**

### 5.1 vars (`tm-topbar-vars.js` L10-18)

```
帑廪 → openGuokuPanel    (国库 fiscal)
内帑 → openNeitangPanel  (帝王私库 fiscal)
户口 → openHukouPanel    (人口 population)
吏治 → openCorruptionPanel (UI 名"吏治"·数据 corruption)
民心 → openMinxinPanel   (民众心情)
皇权 → openHuangquanPanel (帝王实权 phase3)
皇威 → openHuangweiPanel  (帝王威望 phase5)
```

### 5.2 每 var 显示形式·**远比我以为复杂**

每 var 一个 cell·横排·

```
[篆体单字印·彩 (按 var)]   [主数值·_barFmtNum (大数 万/亿)]   [▲/▼/—]
                                                            [state 药丸·充裕/紧/亏空/破产]
                                                            (hover) → tip 弹·subItems 3-5·更多明细
                                                                                                   3 sub-数 (例·帑廪·银/粮/布·each: 名 + 数 + delta)
```

### 5.3 帑廪 详例 (其他 var 类似结构)

```
帑廪
  主显·money (银)·_barFmtNum
  趋势·moneyDelta > 0 ▲ / < 0 ▼ / = 0 —
  state 药丸·
    bankrupt (破产 N 月) → 红
    亏空 (money < 0) → 红
    紧 (< 20% annualIncome) → 黄
    尚可 (< 50%) → 金
    充裕 (>= 50%) → 绿
  3 sub·银 (money) / 粮 (grain) / 布 (cloth)·each 含 stock + delta
  alertHints·借贷 / 通胀 警示
  tip 详·title="帑廪" subtitle="国库·三账" glyph="帑" stocks 列表
```

### 5.4 视觉建议 (Codex 整屏 mock 用)

```
#bar·~80px 高·横排·分 3 区·

[左·朝代标签]·朝代字 ("大明") + 物候印 (春/夏/秋/冬·小印)·~120px

[中·7 var 横排]·~720-900px·
  每 cell·~110-130px·
    篆体单字印 (32×32·彩)
    主数值 (16-18px·暖金)
    趋势箭 (10-12px·绿/红)
    state 药丸 (10-12px·按 state 色)
  cell 间·细横墨线分隔
  整体·dense·非空白

[右·utility]·~160px·
  AI 状态指示 (圆点·灯·绿/橙/红)
  存档状态 ("已存"·小字)
  todo (next-turn 待办·小数)
  设置 / 帮助 印章 (备用)

材质·朱漆木 / 黑漆描金·非塑料感·
非·"7 个数字横排"·而是"7 颗 var 印章 + 数 + 趋势 + 药丸 + 3 sub 在 hover 时露"
```

---

## §6·chaoyi-modal·**4 模式同 modal·9300 行 JS·已 audit**

### 6.1 入口

```
gt-chaoyi tab·action·startChaoyiSession → 模式选择 _cy_pickMode
朝政中心·发展 group·朝议 → startChaoyiSession
```

模式选择前·先弹小 modal·user 选 "廷议 / 常朝 / 御前"·

### 6.2·**廷议 v3·主流模式**·7 阶段状态机

文件·`tm-tinyi-v3.js` (3920·`_ty3_*`)·消耗能量 25·参会 5-12 人·

| Phase | id | 中文 | 屏 |
|---|---|---|---|
| 0 | pa | **议前预审** | 议题 + 党派预测 + 4 选项 (留中/私决/下议/明发) |
| 1 | standing | 起议站班 | 三班分坐 (同党左 / 中立中 / 敌党右) + 潮汐条 |
| 2 | debate | 分轮辩议 | 主奏→同党附议→敌党驳议→中立权衡·4 轮 + 兜底 |
| 3 | impeach | 廷推/弹劾 | 若人事议题·廷推选官 |
| 4 | grade | 钦定档位 | S/A/B/C/D 档·权威反馈 |
| 5 | edict | 草诏拟旨 | 拟诏 + 选官·prestige/favor 反馈 |
| 6 | seal | 用印颁行 | 朝代差异化·党派阻挠·留中状态 |
| 7 | aftermath | 追责回响 | N 回合后强制复盘·遗祸 |

**典型一屏** (议前预审·phase=pa)·

```
〔 议 前 预 审 〕     [✕]
陛下决断之前·先察议题之轻重缓急

[议 题]
  [INPUT 议题文本]
  [SELECT 从待议册]
  [LIST 留中册项目]

[主 奏]
  张姓 [官职] [党派色块]
  理由描述 / 影响力分值

[奏疏正文] (若弹劾)
  奏者: xxx · 体裁: 密揭 / 大拆
  正文滚动区

[党派预测]
  各党立场色块文案

[四 选 项 grid 2×2]
  📥 留中 (皇权-1·搁置)
  🤐 私决 (皇威+1·御前密议)
  🤝 下议 (五人闭门)
  📜 明发 (完整七阶段)

[罢·改日再议]
```

**典型一屏** (分轮辩议·phase=debate)·

```
顶 sticky·进度条·Progress X/N (青→金渐变)
中·三班潮汐条·同党/中立/敌党
中·发言气泡流式·〔立场〕发言 + 党派色 + 流式逐字
底·档位选择 (5 按钮 S/A/B/C/D)
```

**Class name 范例**·`ty3-pa-modal / ty3-pa-title / ty3-pa-section / ty3-pa-opt / ty3-prog / ty3-st-title`·

z-index·5000·

### 6.3·**常朝 v3·日常 4 阶段**

文件·`tm-chaoyi-changchao.js` (3843·`_cc3_*`)·能量 0·参会全廷 20-50 人·

| Phase | 中文 | 屏 |
|---|---|---|
| 1 | opening | 〔奉天门·五更三点〕鼓声 + 班次全景 |
| 2 | runAnnounce | 议程宣布·内侍逐项宣读 + 紧急度 |
| 3 | runDetail | 逐议讨论·展开议题 + 多人短反应 |
| 4 | closing | 〔鸣鼓退朝〕总结·诏令·朝仪结束 |

**典型一屏** (议程展开)·

```
〔 早 朝 〕(post-turn flag·朔朝 等)
奉天门 · 五更三点
铮 ── 铮 ── 铮 ──             ← 朝鼓音效行

sticky·〔早朝〕[已议 0/N] [殿中 ?] [⏸] [✕]

[朝堂全景 ▼ 折叠]
  左班 (京官·绿)·xx xx xx xx xx
  中班 (外官·蓝)·yy yy yy yy
  右班 (宗室·黄)·zz zz zz
  ─── 缺朝者·aaa(远离) bbb(病)

[议程卡 1]·[礼部] 秋猎预期 [URGENT 红]·~80 字预览·[展开此议]
[议程卡 2]·[户部] xxxx·[展开]
...

[展开议题·detail]
  【2】秋猎预期许可
  部门·礼部  类型·routine
  完整说明 (AI 生成)
  〔赞成〕 侍郎李某·"有利无害……"
  〔反对〕 御史赵某·"为费……"
  〔赞成〕 内侍·"陛下……"

底·[下一议] [⚖️ 裁决] [打断] [建言要点]

(closing) 〔鸣鼓退朝〕诏令总结 + 事件板 + 礼成
```

**Class**·`cy-ceremony / cy-bench / cy-titlebar / agenda-card`·

### 6.4·**御前 v2·密室 3 阶段**

文件·`tm-chaoyi-yuqian.js` (504·`_yq2_*`)·能量 10·心腹 1-8 人·

| Phase | 中文 | 屏 |
|---|---|---|
| 0 | 筹备 | 议题 + 8 议题类型 (诛戮/托孤/军机/罢相/宫禁/人事/密谋/其他) + 心腹候选 8 人 + 记录选项 (起居注 / 不录密议) |
| 1 | question/roundQuery | 帝出疑问·令众直陈 OR 单独问 |
| 2 | decide | 决断·四选 (准行/驳否/再议/自定) |

**典型一屏** (筹备)·

```
〔 御 前 会 议 · 筹 备 〕  [✕]
屏退宫人，与心腹重臣密议机要。

议题 (机密事项)
  [INPUT placeholder "废太子议·罢某相……"]

议题类型
  [🗡️诛戮] [👑托孤] [🎯军机] [⚔️罢相] [🚪宫禁] [👤人事] [🕷️密谋] [其他]

心腹候选 (至多 8 人)
  ☑ 张某 [官职] 忠 80 野 40
  ☑ 李某 [官职] 忠 75 野 30
  ☐ 王某 [官职] 忠 65 野 50
  (列表·可滚动)

起居注记录
  ◉ 📜 记起居注 (正常)
  ○ 🤐 不录 (密议·泄密风险)
  · 警告·"不录者·议事不入起居注·若泄密则成丑闻"

[开议] [取消]
```

**典型一屏** (会议中)·

```
👑 御前会议·废太子议  [密议不录·红]

内侍·(陛下入御书房·内侍宫娥尽皆屏退)
内侍·(殿中仅余陛下与 3 员心腹)

皇帝·朕有一事难决·诸卿可直言——……

张某·〔推心置腹·第1轮〕不若…… (AI 流式)
李某·〔大致坦言·第1轮〕微臣以为……

底 (按 phase)·
  question·[📣 令众直陈] [👤 单独问某人]
  roundQuery·[🎯 点某人深问] [⚖️ 决断]
  decide·[准行] [驳否] [再议] [自定]
  finalEnd·[退]
```

**Class**·`yq2-setup-bg / yq2-advisor / cy-bubble`·z-index 1300·

### 6.5·**廷议 v1·deprecated** (`tm-chaoyi-tinyi.js` 789·`_ty2_*`)

Phase 3 (2026-05-03) 全量迁移至 v3·**Codex mock 不画**·仅向后兼容旧存档·

### 6.6·**4 模式对比表** (Codex 选 mock 屏用)

| 维度 | 廷议 v3 | 常朝 v3 | 御前 v2 |
|---|---|---|---|
| 能量 | 25 | 0 | 10 |
| 参会 | 5-12 | 20-50 全廷 | 1-8 心腹 |
| Phases | 7 | 4 | 3 |
| 决策 | 党派辩 + 档位 | 议程 + 简裁 | 密言 + 帝定 |
| 录入起居注 | 默认录 | 默认录 | **可选录** |
| 特色 | 党派对抗 / 档位 | 班次 / 朝仪 | 坦白度 / 泄密 |
| 复杂度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

### 6.7·**Codex mock 屏 C·建议·廷议 v3·分轮辩议态**

非筹备·非用印·**辩议态最 visually rich**·三班分坐 + 流式气泡 + 进度条 + 档位选择·

或备选·**御前 v2·会议中态**·1-3 心腹围皇帝·屏退·流式气泡·密议感强·更小但更"古风密室"·

---

## §7·#turn-modal·**已 audit·3 模式同 modal**

### 7.1 触发与函数

`tm-utils.js` L763·`showTurnResult(html, idx)`·

调用源·

```
tm-game-loop.js L1268        showTurnResult(html)         结束回合·主调用
tm-endturn-render.js L1244   showTurnResult(shijiHtml...)  结算回合·shijiHistory 弹
tm-endturn-core.js L425       showTurnResult(_pdHtml)       前置弹
tm-court-meter.js L193        showTurnResult              法庭·临时调
tm-player-core.js L127/166/172/206  showTurnResult       史记列表 / 详情 / 对比
```

### 7.2 modal 结构 (DOM·`#turn-modal`)

```
#turn-modal.show       (z-index 1000·full overlay·墨色淡墨遮罩)
  顶·tr-header
    #tr-turn-no      "第 X 回合"
    #tr-date         主日期 + era chip (甲乙...子丑·篆体小印)
    #tr-summary      一句话总曰 (~80 char·turnSummary 或 shizhengji 首句)
    #tr-critical     要闻标签·5 类
                       ·war   战 事 (战役 / 攻城 / 大捷 / 出兵 / 旋师 / 失陷)
                       ·death 人 殂 (殂 / 崩 / 薨 / 人殁 / 病死 / 自刎)
                       ·scheme 密 谋 (密谋 / 阴谋 / 谋避)
                       ·faction 党 争 (党争 / 党派 / 东林 / 阉党)
                       ·calamity 灾 异 (旱灾 / 洪 / 雪 / 震 / 疫 / 瘟 / 天火 / 地震 / 天帝汜)
  中·#turn-body      主 HTML (见 7.3 三模式)
  底·tr-prev / tr-next   翻阅前后回合
       _trExportCurrent  导出本回 (txt)
```

### 7.3 三模式 (#turn-body 内容切换)

| 模式 | 触发 | 内容 |
|---|---|---|
| **当前回合** | 结束回合·`tm-game-loop.js` showTurnResult(html) | 叙事文 (narr-shizhengji + narr-zhengwen) + 统计 bar (delta) |
| **史记列表** | rail.讯 / 史记按钮·openShiji | shijiHistory 全 list·按 turn 倒序·题签 / 摘要 / 翻阅 |
| **详情** | 史记列表点单条·_shijiShowDetail | 单 turn 详细·shiji.html (全部叙事 + 统计) + 返回按钮 |

### 7.4·**视觉建议** (Codex mock 屏 E)

```
〔 第 X 回 合 〕            ✕ (右上)
壬寅四月十二 [子时 朱印 chip]
本朝纪要·"边事告急·西凉急报"  ← 一句话总曰·墨笔
本回要闻·[战 事]  [人 殂]    ← chip·按 5 类色

═══ 主体·叙事卷 ═══
narr-shizhengji 题签 + 正文 (第一段叙事)
narr-zhengwen 题签 + 正文 (第二段叙事)
... 3-5 段

═══ 统计 bar (turn-summary-bar) ═══
帑廪 +200 (▲)  内帑 -80 (▼)  户口 +1.2 万 (▲)  吏治 +1 (▲)
民心 -2 (▼)   皇权 +1 (▲)   皇威 0 (—)
朱字·正向 / 墨字·负向 / 灰·持平

═══ 翻阅 ═══
[‹ 前回] 现 X / 总 N [后回 ›]   [导出]
```

---

## §8·#launch 启动屏·**已 audit·非常完整**

### 8.1 文件 + 位置

`index.html` L25-113·**HTML 写死·非动态生成**·

`tm-launch.js` 1167 行·处理·剧本选择 / 编辑器入口 / 切屏·

### 8.2 完整 DOM 结构

```
#launch
  .home-stage 主舞台
    .home-ylian.l   左 楹联 ↓
                     "天行健 · 君子以自强不息"
                     "—— 周易"
    .home-ylian.r   右 楹联 ↓
                     "地势坤 · 君子以厚德载物"
                     "—— 周易"
    .corner-flower.tl     左上角·SVG 装饰 (金色线 + 朱点)
    .corner-flower.tr     右上角·同上 (4 角各 1)
    .home-axis 主轴
      .home-deco-top      顶饰
      .home-title #lt-title  "天　命" 大字
      .home-seal-wrap
        .home-seal-lbl     "奉 天 承 运 皇 帝 　诏 曰 ："
        .home-seal         "玺" 朱印
      .home-sub             "AI  历  史  模  拟  推  演"
      .home-div             分隔
    .home-menu              4 卡 grid (2×2)
      .home-card.c-new      开 卷 ↓ (#btn-new-game)
        .home-card-icon     "卷"
        .home-card-cn       "开　卷"
        .home-card-ti       "开 始 新 游 戏"
        .home-card-desc     "选择剧本 · 载入世界 · 敕定天命"
        .home-card-meta     "官方 · 自定义剧本"  ↵
      .home-card.c-load     续 卷 ↓ (#btn-load-save)
        icon "续"·cn "续　卷"·ti "读 取 存 档"
        desc "启封卷宗 · 抄录副本 · 承续推演"·meta "卷宗目录" Ctrl+L
      .home-card.c-edit     著 卷 ↓ (#btn-editor)
        icon "著"·cn "著　卷"·ti "创 作 新 剧 本"
        desc "开炉鼓铸 · 立言成卷 · 遗之后人"·meta "编辑器" Ctrl+E
      .home-card.c-set      典 章 ↓ (#btn-settings)
        icon "典"·cn "典　章"·ti "游 戏 设 置"
        desc "API · 字数 · 文风 · 音声"·meta "偏好调度" Ctrl+,
    .home-recent #home-recent
      .rh "〘 近 事 〙"
      (动态从 localStorage tm_save_index 读·max 3·each·"[自/封] [eraName 第X回]")
      若空·.r-empty "未 见 封 卷 · 启 新 纪 元"
  .home-foot 底栏
    .f-ver  "天 命　v0.9-β"
    .f-mid  "春 分◆太 平◆河 清 海 晏" (动态物候)
    .f-right
      .lt-dibao-btn  "📜 邸 报"  (邸报 button·更新公告)
      kbd ↵ 开卷 / kbd ? 帮助 / kbd Esc 退出
```

### 8.3 楹联是**固定**·邸报是**动态**

- 楹联·硬写"天行健·君子以自强不息"·"地势坤·君子以厚德载物"·**Codex mock 直 quote**
- 邸报·从 localStorage `tm_save_index` 读·max 3·**Codex mock 占位 "甲子 第八回·明启盛"·"自 第十六回·崇祯七年" 之类**
- 4 卡内容·**全固定**·Codex 直按上述 desc / meta 画

### 8.4·**视觉建议** (Codex mock 屏 D)

```
全屏背景·真宣纸 + 拓本黄·斑驳·30-50% 留白·

[左竖楹联]·"天 行 健·君 子 以 自 强 不 息"·墨色篆体·下小字 "—— 周易"·透 0.4
[右竖楹联]·"地 势 坤·君 子 以 厚 德 载 物"·同上

[四角]·SVG 装饰金线 + 朱点 (现已是 SVG·**保留即可·非 raster 必要**·或 Codex 重画)

[中央上]·"天　命" 大字 (篆体或碑刻·墨色填或描金)
[中央]·"奉 天 承 运 皇 帝 　诏 曰 ：" + 印章"玺" (朱泥)
[中央下]·"AI 历 史 模 拟 推 演" 副标·小字

[2×2 grid 4 卡]·each 卡·
  圆 icon (字 卷/续/著/典)
  cn (开卷/续卷/著卷/典章)·篆体
  ti (子标·"开始新游戏" 等·楷书)
  desc (描述·"选择剧本·载入世界·敕定天命")
  meta (左·"官方·自定义剧本" / 右·"↵" 或 "Ctrl+L")
  风格·宣纸 + 朱印 + 木漆·非现代 card·

[邸报近事]·横长·"〘 近 事 〙" 题 + 3 卡 (每卡·朱印 [自/封] + "明启盛 第八回")
若空·"未 见 封 卷 · 启 新 纪 元" 楷书

[底栏]·
  左·"天 命　v0.9-β"
  中·"春 分◆太 平◆河 清 海 晏" (◆ 朱点)
  右·邸报 button + 快捷键提示 (kbd 边框小字)

材质·全真·宣纸 / 朱泥 / 拓本黄 / 木漆 / 阴文小字
```

---

## §9·gt-renwu 人物志·**已 audit**

### 9.1 题签 (`tm-renwu-ui.js` 推断·待精读·grammar 一致)

```
[人/物/志]  人 物 志  (题签待精读·按 grammar 推)
            (楹联待精读)
```

### 9.2 主区结构

`renderRenwu()` 渲 `#rw-grid`·

```
rw-statbar (6 stat card)
  在朝群臣 N·文臣 N·武将 N·后宫 N·布衣 N·已殂 N

rw-legend (派系 chip)
  派 系·东林·阉党·宗室·勋戚·... + 数

tools (in tab title 区·待 audit)
  搜索·派系 select·角色 filter (文/武/后/无)·排序·显示已殂 checkbox

rw-grid (主区·按派系分组卡片墙)
  每卡·portrait + 名字 + 官职 + 派系 + 心情 + 五常 + 关系 chip
  心情·〔喜 / 怒 / 忧 / 惧 / 恨 / 敬〕·古典方括号
  野心标 (>75)·朱字"野"
  spouse·后宫 icon (花·按 rank)
  压力·"焦" (>40·橙) / "崩" (>60·红)
```

### 9.3 视觉

```
分派系卡片墙·非 list·每派系有色 chip·
卡 = portrait img (.ji-char-portrait alike) + 信息块
密度·dense·~30 卡墙·搜索 / filter / 排序在顶
```

---

## §10·gt-difang 地方·**已 audit**

### 10.1 题签 (`tm-hongyan-office.js` L2091)

```
[地/方]  地 方 舆 情
         一 省 一 民 情　按 察 抚 民 · 安 民 为 本
```

### 10.2 主区结构

```
df-statbar (各级地方汇总)
df-tools
  按察 (search)·名 / 官 / 事
  排序 (民变↑ / 腐败↑ / 人口↓ / 税收↓)
  仅危机 checkbox
  详细区划 button → openProvinceEconomy
df-legend
df-alerts (危机预警·若有)
difang-grid (主 grid)
  按道 / 州 / 府 / 县 hierarchy
  每地·名 + 类型 + 户口 + 民情 + 官员 + 朝廷态度
  心情·安 / 躁 / 怨
```

### 10.3 视觉

```
舆图风感·按道分块·每块·
  地名 (篆体 + 楷书)
  小数据 (户口·腐败·税·民变)
  官员名
  危机·朱印警示 (若有)
密度·中度·非 grid 也非 list·分块布局
```

---

## §11·**audit 续完成清单**

```
[✓] gt-renwu·题签 + 内容
[✓] gt-difang·题签 + 内容
[✓] chaoyi 4 模式·廷议 v3 / 常朝 / 御前 / v1 deprecated·全 audit
[✓] turn-modal·3 模式 + 5 类要闻标签
[✓] launch·完整 DOM + 楹联是固定 + 邸报是动态
[ ] tech / civic 树 (条件 tab·非 default·先跳)
```

**audit 完成度·~95%**·条件 tab (tech / civic) Phase 8 整屏 mock 不在主屏·跳·后续 8-η 阶段补·

---

## §12·**Codex 整屏 prompt 改清单更新** (audit 续后)

### 12.1 §3.A 主屏 mock·**5 处改** (同前)

```
[改 1] 默认 tab·gt-edict → **gt-zhaozheng 朝政中心 dashboard·5 group 网格**
[改 2] 题签 + 第X回合·物候 sub
[改 3] tab bar·6 → **13 tab·5 group**
[改 4] breadcrumb·"朝野要务 › 本朝纪要 › 朝政"+ 右 [搜寻] [帮助]
[改 5] #bar 7 vars·每 var = 印章 + 数 + 趋势 + 药丸 + 3 sub
```

### 12.2 §3.B drawer mock·**3 处改** (同前)

```
[改 1] 12 段堆叠 + 锚点跳转·非 4 tab
[改 2] 上 9 内容 + 下 3 utility (题/声/帮·UI 设置)
[改 3] gs-panel-title + cnt chip
```

### 12.3 §3.C chaoyi mock·**新明示**

```
[改] 选 **廷议 v3·分轮辩议态** (主流 / visually 最 rich)
     - 顶 sticky·进度条 (青→金渐变)
     - 中·三班潮汐条 (同党左 / 中立中 / 敌党右·色块)
     - 中·流式气泡发言·〔立场〕+ 党派色 + 字逐显
     - 底·档位选择 5 按钮 S/A/B/C/D + 反馈文案
     - 周·墨色淡墨遮罩·非黑

或备选·**御前 v2·会议中态** (密室·屏退·1-3 心腹围皇帝·更小但更密室古风)
```

### 12.4 §3.D launch mock·**已修正·新清单**

```
[改 1] 楹联硬 quote "天行健·君子以自强不息 —— 周易" / "地势坤·君子以厚德载物 —— 周易"
[改 2] 4 卡·按 audit §8.4·icon (卷/续/著/典) + cn + ti + desc + meta + 快捷键
[改 3] 邸报近事·占位 "[自/封] 明启盛 第八回" 之类·或空"未见封卷·启新纪元"
[改 4] 底栏·"天命 v0.9-β" + "春分◆太平◆河清海晏" + 邸报 button + kbd 提示
```

### 12.5 §3.E turn-modal mock·**新明示**

```
[改 1] "第 X 回合" + 主日期 + era chip (甲乙子丑)
[改 2] 一句话总曰·~80 字
[改 3] 要闻 chip·5 类 (战事 / 人殂 / 密谋 / 党争 / 灾异)·按色
[改 4] 主体·narr-shizhengji + narr-zhengwen 两段题签
[改 5] 统计 bar·7 vars delta + 朱/墨/灰 颜色编码
[改 6] 底·翻阅 + 导出
```

---

## §13·变更日志

- 2026-05-05·init·Claude·Path A audit 6 区域 round 1·~3h·~600 行·screen-overall prompt 必改 ~50%
- 2026-05-05·patch·Path A audit 续·chaoyi 4 模式 + turn-modal + launch + renwu + difang·~2h·~400 行 +·**audit 完成度 95%**

---

— Claude (Phase 8·UI 实际操作内容 audit·v2·post audit 续·2026-05-05)

(旧 v1 §7-§10 内容已并入 §6.6 / §7 / §8 / §11 / §12·v2 完整·清理止此·)
