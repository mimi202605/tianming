# Phase 8·御书房·**详细 spec** (殿 1 / 12)

date·2026-05-05·status·**P0·12 殿架构 v2 下·御书房先 lock·user 看·扩 11 殿**·owner·Claude

依据·`phase8-multi-palace-architecture.md` (12 殿 v2)·

**御书房·12 殿 hub**·所有 path 经此·user 决"按你的想法来" → C·先 1 殿详 spec·

---

## §0·御书房功能定位

```
[hub]    所有殿堂进 / 退·御书房中转
[起草]   gt-edict·5 类诏令·5 textarea + 议事清册 sidebar
[召对]   gt-wendui·候朝大臣 click → 跪请
[鸿雁]   gt-letter·远方臣子 + 复杂 form (类型 / 紧急 / 加密 / 密使)
[自审]   p-self·朕亲卡·6 维属性 + 五常
[时辰]   p-time·12 时辰圆盘 + 香烟 / 漏壶 / 窗光
[精力]   p-energy·朕之精力·影响每回合可开御前
[问天]   modal·6 模式·玩家指令系统
[屏风后] 密档·secretMeetings + activeSchemes + D 级遗祸
[议事清册] sidebar·建议库·6 系统来源
[真假切] 朝廷见 vs 真见·切换 button·情报战
```

---

## §1·御书房空间布局·**12 区**

```
┌──────────────────────────────────────────────────────────────┐
│  ① 殿 匾 / 上 方                                              │
│      "大 明" + 年号 + 庙号                                     │
├──────────┬──────────────────────────────┬──────────────────┤
│          │                              │                  │
│  ⑥ 左 墙  │   ② 桌 后 · 屏 风             │  ⑦ 右 墙          │
│   书架    │   山水画 → click 屏风后       │   舆图 + 兵符      │
│   卷宗    │   (内书房·密档)              │   节钺 + 镜       │
│   (历)    │                              │  (出口·军 / 地)  │
│  ⑤ 议 事  │  ────────────────────────    │                  │
│   清 册   │                              │                  │
│   (sidebar) │  ③ 御 书 案 (主交互·~50%) │                  │
│   sticky │   砚 / 笔 / 镇 / 朱印 / 卷  │                  │
│   260px  │   折子叠 / 茶 / 香炉 / 漏壶 │                  │
│          │   ⑧ 真 假 切 (角落 button)   │                  │
│          │                              │                  │
├──────────┴──────────────────────────────┴──────────────────┤
│  ④ 御 阶 / 门 口 (前·候朝大臣)            ⑨ 角 落 / utility│
│  ⑩ 内 侍 (浮·内禀)                       ⑪ 朱 印 状 态 (诏档)│
│                                            ⑫ 问 天 神 镜    │
└──────────────────────────────────────────────────────────────┘
                                              ⑦ 窗 (右上)·光
```

---

## §2·12 区详细映射

### ① 殿匾 / 上方

```
内容·
  - 朝代字大匾 ("大 明") 楷书·烫金漆木·~120×40px 视域内
  - 年号 (壬寅) + 帝王庙号 ("圣 上" or 帝号·若有)
  - "X 朝 X 帝" 副标·小字
持续显示·
  - 朝代切换·匾色 / 字 / 雕梁全换 (主题)
  - hover·浮"〔X 朝·第 X 回合·X 月〕"
非交互·
```

### ② 桌后屏风 (~15%·**重要 transition entry**)

```
内容·
  - 山水画屏·宋画风·明朱漆木框
  - 屏风画·按朝代主题变 (盛世清明上河图 / 衰期山水萧条)
  - 屏风画·按物候变 (春花 / 夏荷 / 秋叶 / 冬雪)

触发·
  - hover·浮"〔屏风后·密档〕"·小字 hint·gold-300
  - click·屏风右移 → 画面 zoom 入 → **内书房 / 密档场景**

内书房 (屏风后)·
  - 灯昏暗·四壁帷幄·密室感
  - 三层堆叠展示·
    [上] 御前密议·GM._secretMeetings·last 5 条 (含 leaked 标记·若 leaked → 闪红)
    [中] 密谋推进·GM.activeSchemes·按 schemer 分组
    [下] D 级遗祸·GM._eventLog (filter 'tinyi3-D')·后续 NPC 抗疏
  - 朱印·"密"·warning·此处不入起居注
  - 警示灯·若有 leaked / scheme 触发·闪红
  - 退出·点画面任意非密档区·屏风左移合·回御书房
```

### ③ 御书案 (主交互·~50%)

```
[砚台]·圆形·黑润 (端砚)·~80×60px
  hover·浮"〔起 草·砚 池〕"
  click·画面 zoom 入砚池·墨在水中转
       → 浮 5 笔类印 (政 / 军 / 外 / 经 / 他)·篆体小印
       → 选 1 印 → 砚台前展卷 (御笔题"奉天承运皇帝诏曰") → textarea 写
       → 完成后·选 4 文风 (文学化 / 史书体 / 戏剧化 / 古典)
       → 有司润色 (AI 合并 5 类·loading 状态)
       → 卷展·user 看
       → click 朱印 (案右) → 盖印动画 → status promulgated → confirmEndTurn
  对应·gt-edict 完整起草流程
  状态·砚池水位·按"诏令未颁数"·~0-5

[笔架]·两支毛笔
  hover·浮"〔御 笔·分 类〕"
  click·展开 5 笔类 (政 / 军 / 外 / 经 / 他)·快速切

[镇纸]·一对·青铜兽形 (狻猊 / 麒麟)·~70×40px each
  hover·浮"〔奏 疏 待 览·N 折〕"·N 跟 GM.memorials.length
  click·镇纸抬起 → 案右侧 折子叠 现 (~5-15 折堆)
       → click 1 折 → 展开 → 朱批 7 选 modal·
         approve / modify / reject / trial_region / redraft / investigate / refer
       → 完成 → 折归档 / 转处 / 留中
  对应·gt-memorial + processImperialAssentExtended
  状态·折数·按 GM._pendingMemorials.length

[朱印]·朱泥湿润印 + 印章·~50×50px
  hover·浮"〔用 玺〕"
  click·若有未颁诏 → 盖印动画 → confirmEndTurn → status promulgated
       若无 → 浮"无诏可印"
  对应·诏令颁行
  特殊·**敌党阻挠时**·朱印闪 (orange)·浮"敌党 X 控制·阻挠概率 Y%"·click → 选 force vs 听天

[印泥盒]·圆漆·朱内·~40×40px
  装饰·朱印 click 时印泥盒亮
  hover·浮"朱 泥"

[折子叠]·镇纸抬起后才显示
  默认隐藏·镇纸 click 后浮起
  排序·急 → 缓·重 → 轻

[展开诏书]·1 卷·~300×120px·桌面中央
  内容·当前未颁诏 (status='draft')·御笔题 + 5 类 textarea
  edit-able·textarea 直接 type
  状态·若已 promulgated·卷自动卷归档·下一卷展

[半卷起诏书]·~150×80px·桌面左
  内容·近期诏令 (top 1-2)·title 浮
  装饰·点击展开·status 6 徽章显
  对应·诏令档案 entry·full list 在档案 tab

[茶杯]·一只·官窑·桌面左前·~40×40px
  装饰·hover 浮·朝代茶名 ("龙凤团 / 蒙顶 / 武夷")·按朝代变
  click·喝茶·precept 微·能量小幅恢复 (若 energy < max)

[香炉]·小铜·烟形·~60×100px (含烟)
  状态·烟形按时辰·子时纤·午时浓·亥时淡
  hover·浮"〔时 辰·辰 时〕" + 12 时辰圆盘 mini (p-time)
  对应·rail 右"辰" + 时辰系统

[漏壶]·三层铜壶滴漏·~60×120px
  状态·水位按时辰
  装饰·桌左角·小

[镇尺]·小·~80×10px·桌面前
  装饰·非主操作

[精力 chip]·桌右下角·~30×60px
  显示·朕之精力 ("疲 / 可议 / 充")·按 GM.energy 与 max
  状态·进入御前 -10·过低 → 御前 disable
  hover·浮"〔精 力·X / max〕"
```

### ④ 御阶 / 门口·前 (~10%)

```
位置·画面下前方·御阶 3 级·阶下御门·开
内容·
  - 内侍 1 人·常驻·立·朝服 (青衣小帽)·~60×120px·御阶左
  - 候朝大臣 2-3 人 (按 GM.pendingAudiences)·朝服立·按品级色
  - 鸿雁使者 1 人 (若有外信)·候命·~60×120px·御阶右
触发·
  - hover 内侍·浮"〔内 侍·有事禀奏〕"·click → 浮 brief (今日要事 list 3-5)
  - hover 大臣·浮"〔X·X 品·X 党〕"
  - click 大臣·大臣步上御阶·跪 → 召对画面 (gt-wendui modal)·
                modal: 角色卡 + 6 维属性 + 五常 + 派系 + 选 dialog topic
  - click 信使·信函呈上 → 展信 → gt-letter 编辑器
状态·
  - 大臣数·按 GM.pendingAudiences·~0-5
  - 大臣朝服·一品紫·二品绯·三品青
对应·gt-wendui + gt-letter
```

### ⑤ 议事清册 sidebar (~260px sticky·**核心**)

```
位置·画面左·sticky scroll
内容·
  - 标题"〔议 事 清 册〕"·gold-300 楷书
  - 6 系统建议来源·彩色 chip 区分·
    [朝议] indigo·廷议 phase 5 草诏建议
    [问对] gold·召对建议
    [鸿雁] celadon·信使提案
    [奏疏] vermillion·有司复奏
    [官制] purple·任免建议
    [地方] amber·地方上书
  - 列表·按回合倒序·本回合在最上
  - each entry·
    [来源 chip] + [from·张某 ↘ ID] + [topic·背景] + [content·建议正文]
    [used 标记·若已用]
触发·
  - click 1 entry → 弹分类菜单 (5 类·政 / 军 / 外 / 经 / 他)
  - 选类 → 自动 inserted into 对应 textarea + 保留 topic 作问题背景
  - "删除"按钮·标记 used=true·hide 但 不 delete
对应·_renderEdictSuggestions + _showEdictAdoptMenu
状态·
  - sidebar 高度·max-height 70vh·overflow-y auto
  - 实时 update·
    朝议结束 → entry 入
    问对完 → entry 入
    奏疏 approve+follow → entry 入
    地方上书 → entry 入
```

### ⑥ 左墙·书架 (~15%·**简化**)

```
位置·御书案左侧墙·满架卷宗
内容·
  - 5-7 层书架·每层 ~10-20 卷
  - 卷宗按朝代色分·本朝青绫 / 前朝褐 / 异朝红
  - 1-2 卷在桌左侧·近期看的 (last 5 shijiHistory)
触发·
  - hover 一层·该层卷高亮 + 浮"〔史 / 编 / 起 / 纪 / 文〕"·按层
  - click 一卷·切场景到典藏阁·该卷展开
对应·切场景·**御书房 → 典藏阁** (gt-shiji / biannian / qiju / jishi / wenyuan)
状态·
  - 卷宗数·按各 history.length
  - 朝代色·按 GM.dynasty
```

### ⑦ 右墙·舆图 + 兵符 + 镜 (~10%·**多 transition entry**)

```
位置·御书案右侧墙
内容·
  - 大舆图 (~200×150px 视域内·缩略)·按朝代天下图
  - 兵符 (玉牌)·节钺 (斧钺)·玉玺·立 / 挂
  - 铜镜·圆·镜框雕花·~80×80px·下方·光润
触发·
  - hover 舆图·小道色块亮·浮"〔X 道·民情 X〕"
  - click 舆图·切场景到舆图厅
  - hover 兵符·浮"〔军 务〕"
  - click 兵符·切场景到舆图厅 (军务区·gt-edict 军令 alt 入口)
  - click 节钺·浮"〔出 征〕"·click → 军务出兵 wizard
  - click 玉玺·浮"〔御 印·N 颁 / 待〕"·click → 用玺
  - click 镜·**镜面映出**·朱印 chip (民心 / 皇威 / 朕之态度)·**反观自身**·真假双值差显
对应·切场景·御书房 → 舆图厅·或 军务系统 / 用玺 / 自审
状态·
  - 舆图色块·按 GM.provinceStats·危机道闪朱
  - 镜面 chip·按 perceivedIndex / trueIndex 差·color 编码
  - 玉玺·按未颁诏数
```

### ⑧ 真假切·**核心情报战**

```
位置·桌右下·小盒·或角落 button
默认·朝廷见 (perceivedIndex)
切换·"察实" button (小篆体印章)
切到·真见 (trueIndex) + 差值 chip "+15 虚报"
按钮 visual·
  default·"〔察 实〕" 朱印 (idle)
  hover·"〔察 实·派 督 查 / 特 务〕" 浮选 2 路
       督查·cost 100k·perceivedIndex 逐月 -5
       特务·东厂 / 锦衣卫·主动间谍·查得真值
       (若 cost 不够·灰)
切换 effect·
  御书房 + all 殿堂·var display 全切
  default·朝廷见 (深褐)·虚报数
  真见·真见 (赤红)·虚报差 chip 显
对应·派督查 / 4 司监察·写 GM.* 间谍·校正 perceivedIndex
```

### ⑨ 角落·utility (~3%)

```
位置·御书案右下角小盒·墙角
内容·
  - 小盒·折扇 / 镜·utility
  - 默认隐藏感·hover 角落 / 快捷键 显
触发·
  - hover 案右下 → 浮"〔X〕题 (主题切换)" + "〔X〕声 (音声)" + "〔X〕帮 (帮助)" + "〔X〕设 (设置)"
  - click → 切场景·**御书房 → 天工坊** (问天 / 设置 / 全部变量 / 诊断)
  - 或 浮卡设置面板·**非 modal**·浮卡半透·不挡场景
快捷键·
  - Ctrl+T 主题切换 (御书房内·hue-rotate filter test)
  - Ctrl+M 音声
  - F1 帮助
  - Ctrl+, 设置 (天工坊 / 浮卡)
对应·切场景·御书房 → 天工坊·或 utility 浮卡
```

### ⑩ 内侍·浮·内禀 (~3%)

```
位置·画面 bottom-left·内侍卡 (~80×40px)
内容·
  - 内侍小图 (青衣小帽)
  - 报"今日要事 X 件"·小字
触发·
  - click·浮 brief·今日要事 list 3-5·
    "X 道民变·已 X 月" / "X 部上奏·急" / "X 国遣使" / etc.
  - 浮卡·非 modal·点击外区域 close
状态·
  - 要事数·按 GM._currentIssues + GM.disasterEvents (filter critical)
  - 颜色·急 (红) / 缓 (gold) / 普 (灰)
```

### ⑪ 朱印状态·诏档 (~3%)

```
位置·朱印旁 / 桌右
内容·
  - 朱印小卡·实时显示
  - 当前未颁诏 + last 3 已颁诏·按 status 6 徽章
  - 6 徽章·
    ✅ completed·朱  
    ❌ obstructed·墨  
    ⚠️  partial·橙
    ⏳ executing·灰
    ⭕ pending·空
    📨 pending_delivery·黄 (信使在途)
触发·
  - click·展开诏档 modal·full list
  - hover·浮"〔诏 档·N 颁 / N 待〕"
对应·诏令档案·_edictTracker
状态·实时跟踪
```

### ⑫ 问天·神镜 (~3%·**重要**)

```
位置·桌后·屏风边·或墙隅·神龛旁
内容·
  - 一面铜镜·与 ⑦ 不同·**镜面有"问 天"二字** (篆体)·非反映
  - 默认暗·静态
触发·
  - hover·浮"〔问 天·与 推 演 AI 对 话〕"·小字
  - click·镜面亮 → 弹**问天 modal** (~6 模式)·
    [自动 / 叙事 / 设定 / 硬改 / 诏令 / 天意]·**优先级条·天意最高**
    历史对话区·input + send button
    导入文档 / 注入记忆 / 清除指令
    指令 N 条 + 记忆 N 条
对应·openWentian + 玩家指令系统
状态·
  - 镜面闪·若有未处理指令 / 天意 absolute pending
  - hover 镜面·浮 brief 当前指令 list (top 3)
visual·
  - 6 模式按色·自动 (灰) / 叙事 (gold) / 设定 (celadon) / 硬改 (vermillion) / 诏令 (朱) / 天意 (神紫·最高)
  - 优先级条·6 段·天意最右最高
  - 玩家选模式 → AI 解读 prompt 不同·effect 不同
```

---

## §3·真假双值·御书房 visual 实施

### 3.1 切换 button (角落 ⑧)

```
default state·朝廷见 (深褐主调)·所有 var 显 perceivedIndex
"察实" button (角落)·朱印 idle
click·浮选 2 路·
  督查·cost 100k·perceivedIndex 逐月 -5
  特务·主动·选 4 司之一·查特定地区 / 官员
切到·真见 (赤红主调)·所有 var 显 trueIndex + 虚报差 chip
```

### 3.2 视觉对比

```
default·朝廷见
  桌上 chip·"民心 65"·墨笔·gold
  镜面·"民心·安"·gold-300
切·真见
  桌上 chip·"民心 50  +15 虚"·朱字
  镜面·"民心·疑·虚报严重"·赤
```

### 3.3 校正手段

```
派督查·御书房·"察实"按钮 → 督查 → cost 100k → 后续 monthly -5/月
派特务 (4 司)·**铨衡所**·东厂 / 锦衣卫 / 都察院 / 大理寺·each 不同 target
泄密·御书房屏风后·密议 leaked → 真见 chip 显
NPC 弹劾·正殿 / 邸报·言官奏疏揭真 → 真见 chip 显
```

---

## §4·切场景·御书房 → X

### 4.1 触发列表

```
[御书房 → 屏风后内书房]    click 屏风·zoom 入·密档
[御书房 → 正殿]            click 朝服 / 朝靴 / 时辰提示·切朝堂
[御书房 → 舆图厅]          click 大舆图·切舆图厅
[御书房 → 典藏阁]          click 书架·切典藏阁
[御书房 → 户部]            click 朱印旁帐册 / 算盘 (新加桌左)·切户部
[御书房 → 铨衡所]          click 朝服图 (新加屏风边)·切铨衡所
[御书房 → 神阁]            click 神龛 / 香案 (新加角落 / 屏风边)·切神阁
[御书房 → 司天监]          click 窗·zoom out 看天·切天文台
[御书房 → 铜镜厅]          click 铜镜大·切铜镜厅 (人物详细)
[御书房 → 风闻阁]          click 内侍 + "邸报"·切风闻阁
[御书房 → 学宫]            click 桌下抽屉·朱卷·切学宫
[御书房 → 天工坊]          click 角落 utility·或 镜中"问天"·modal vs 切场景 user 选
```

### 4.2 transition

```
画面 transition·
  zoom in/out·~0.5-1s
  fade·0.3s
  pan·0.5s (横向场景切)
退·Esc 或 出口物 click → 回御书房·~0.3s
```

---

## §5·responsive·主题

```
桌面 (>1280)·御书房 1280×800·完整 12 区
平板 (768-1280)·CSS 缩·御书房 cover·部分 hide (例·议事清册 sidebar 折叠)
手机 (≤768)·**御书房 mock 全隐**·走 .ngui-* mobile fallback (CSS-only)

主题 7 套·each·御书房 baseline 微调
default·素宣墨骨 (Codex 生·#241e18 / #c9a85f / #8a3a2e / #d4c9b0)
paper·  净宣阅读·御书房光足
scroll· 拓本古卷·桌换青铜古朴
blue·   青花瓷·屏风画青花·朝服青
celadon·汝窑天青·桌换青玉
vermillion·朱印宫墙·朝代盛世·朱漆全
highcontrast·a11y·CSS only

CSS filter 主导·关键朱印 / 印章·CSS isolation·filter: none
若 filter 不够·8-θ 阶段补生 1-2 主题专属 ~10-15 张资产 (御书房专属)
```

---

## §6·切片清单·**Codex 后续 batch**

```
[材质大背·~5-7 张]
  yushufang-bg-base.webp        全屏背景 (墙 + 殿匾 + 屏风 + 御阶)·1280×800
  table-surface.png              桌面材质·~1100×200·tile horizontal
  bookshelf-bg.png               左墙书架·~250×500
  right-wall-bg.png              右墙·~250×500
  window-frame.png               窗格 + 春景·~150×200
  pingfeng-painting.png          屏风画 (山水)·~600×400
  inner-room-bg.png              屏风后内书房·~1280×800

[物品独立·~15-20 张]
  yan-tai.png                    砚台 (4 状态·hover/click/active/idle)
  bi-jia.png                     笔架
  zhen-zhi.png                   镇纸 (一对)
  zhu-yin-stamp.png              朱印·idle
  zhu-yin-active.png             朱印·活动 (盖印)
  zhu-yin-blocked.png            朱印·阻挠态 (橙闪)
  yin-ni-box.png                 印泥盒
  zhao-shu-roll.png              诏书展开
  zhe-zi-stack.png               折子叠
  cha-bei.png                    茶杯
  xiang-lu-frames.png            香炉 (12 时辰烟形)
  lou-hu.png                     漏壶
  jian-chi.png                   镇尺
  che-shi-button.png             "察实" 按钮 (真假切)
  shen-jing-mirror.png           神镜 (问天)
  bro-mirror.png                 铜镜 (反观自身)

[人物 portrait·~5-8 张]
  nei-shi.png                    内侍立
  guan-yuan-zi-pao.png           一品紫朝服立
  guan-yuan-fei.png              二品绯朝服立
  guan-yuan-qing.png             三品青朝服立
  hong-yan-courier.png           鸿雁信使

[墙挂·~3-5 张]
  yu-tu-map-thumbnail.png        舆图缩略
  bing-fu.png                    兵符
  jie-yue.png                    节钺
  yu-xi.png                      玉玺
  qi-pao-rack.png                朝服图 (出口·铨衡所)

[内书房密档·~5-7 张]
  mi-dang-rolls.png              密档卷轴·layered
  mi-yi-records.png              密议记录卡
  mi-mou-cards.png               密谋推进卡
  d-grade-warning.png            D 级遗祸警示

[气数 / 神龛装饰·~5 张]
  shen-kan.png                   神龛·入神阁切场景
  xiang-an.png                   香案
  lei-yun-shi.png                镇雷云石

[装饰·~10 张]
  corner-flowers.png             4 角装饰 (复用 launch)
  table-edge-cloud.png           桌沿云纹
  shelf-divider.png              书架分层墨线
  dropdown-zhu-dian.png          朱点装饰

总·~50-60 张资产 (御书房 1 殿)
```

---

## §7·DOM 边界 (master strategy §4 延)

### 7.1 全 DOM 渲

```
#bar 顶栏·朝代 / 日期 / 7 vars 数字 / 趋势 / 药丸 (持续)
御书房内·
  议事清册 sidebar·6 系统 entry list·dynamic
  朱印状态·6 徽章 + 数·dynamic
  内侍要事 brief·dynamic
  候朝大臣 list·dynamic
  神镜·指令 N + 记忆 N·dynamic
  真假切·perceivedIndex / trueIndex / 差值 chip·dynamic

modal·
  砚台 5 笔类·click 弹·DOM
  问天·modal·6 模式 + 历史对话·DOM
  朱批 7 选 (镇纸 click 折子展开)·DOM
  召对·gt-wendui modal·DOM
  鸿雁·gt-letter modal·DOM
```

### 7.2 全资产渲

```
材质·桌 / 墙 / 屏风 / 御阶 / 书架·tile / 9-slice
物品·砚 / 笔 / 镇 / 朱印 / 卷 / 折子叠 / 茶 / 香炉 / 漏壶 / 镇尺·each PNG
人物·内侍 / 候朝大臣 / 信使·portrait
装饰·corner / 桌沿 / 书架分层 / 朱点·decorative
```

### 7.3 切片可行性 (master strategy §5.3 延)

```
[必] 物品边缘锐利·**可单独切**
[必] 桌 / 墙 / 屏风·**可独立切作 tile / 9-slice 背景**
[必] 物品阴影 / alpha·后续切出时透明边距 8-12px
[必] placeholder data·非写实数 (大臣数占位·折数示意·朱印未盖)
[必] 5-7 区切线明显
[必] 真假切·朝廷见 / 真见 2 套·CSS class swap·**Codex 仅生 default (朝廷见)·真见走 CSS overlay**
```

---

## §8·验证 protocol

### 8.1 Codex 自审 (生御书房 mock 后·15 项)

```
[ ] 御书房·明代·养心殿三希堂或乾清宫西暖阁参考·1st-person 略前倾
[ ] 12 区·殿匾 / 屏风 / 御桌 / 御阶 / 议事清册 / 左墙 / 右墙 / 真假切 / 角落 / 内侍 / 朱印状态 / 神镜·齐
[ ] 桌面 12 物·砚 / 笔 / 镇 / 朱印 / 印泥 / 卷 / 折子叠 / 茶 / 香炉 / 漏壶 / 镇尺 / 精力 chip·齐
[ ] 议事清册 sidebar·~260px sticky·6 系统 chip 区分·~3-5 entry 占位
[ ] 屏风·明朱漆木框 + 宋画山水·hover hint "〔屏风后·密档〕"
[ ] 神镜·"问 天" 篆体·桌后或墙隅
[ ] 真假切·桌右下·"〔察 实〕" 朱印 idle
[ ] 内侍 + 候朝大臣 + 信使·御阶
[ ] 朱印状态卡·桌右
[ ] 朝代色·default·暖深褐 + 暖金 + 朱红 + 纸白·非 vermillion
[ ] 留白 ~30-40%
[ ] 物品 placeholder·非写实数
[ ] 切线明·5-7 区视觉边界
[ ] 物品独立·alpha·可切
[ ] 风格·宋画 + 工笔 + 文人画·非 RPG / 非 Material
```

### 8.2 输出后

```markdown
# Codex -> Claude: Phase 8·御书房 default 主视角 done (12 区·真假切)

放·web/assets/ui/phase8/scenes/yushufang-default-trial-v2.webp

风格 baseline·材质 / 朝代 / 时辰 / 12 区分布·

(说明 ~15-20 行·重点·
- 12 区分布是否合理
- 议事清册 sidebar 视觉·sticky 260px 是否能切
- 屏风后入口 hint 是否明显
- 神镜·"问 天"二字是否清晰
- 真假切按钮位置·是否易找
- 朱印状态卡·6 徽章是否能 separate
- 物品独立切片·边缘是否锐利
)

待 user ACK · 进波 2 (其他 11 殿)
或 user 调 · 重生
```

### 8.3 user ACK / 调

- ACK → 我转你"波 2"letter (正殿 + 舆图厅 + 典藏阁·一波 3 张·按御书房 baseline)
- 调 → letter 反馈·重生
- 大调 (12 区方案错·真假切方案错) → 回 architecture 重看

---

## §9·变更日志

- 2026-05-05·init·Claude·**御书房 detailed spec v2·12 殿架构下**·~600 行·**真假切 + 屏风后密档 + 议事清册 + 神镜问天**

---

— Claude (Phase 8·御书房 detailed spec·v2·post 12 殿 architecture·2026-05-05)
