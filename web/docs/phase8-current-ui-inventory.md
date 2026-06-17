# Phase 8·当前 UI 清单 (源码扫描·非 audit 漂移)

**date**·2026-05-05·
**scope**·游戏运行时·`#G` 容器内全部 UI surface·从 `index.html` + `tm-shell-extras.js` + `tm-sidebar-ui.js` + `tm-hongyan-office.js` + `tm-topbar-vars.js` 直接抓·

**purpose**·12 殿 v2 paradigm 设计前·先把"现在到底有什么"列清楚·避免漏 panel / 错命名 / 重复造·

**audit 历史更正**·

```
旧说·  9 左 orphan + 4 右 orphan·hidden·42% 玩家找不到
新真·  21 左 panel + 13 右 panel·全部都 visible·全部都有 rail entry
```

---

## §1 顶栏 `#bar`·完整结构 (深读)

源·`index.html` L119-145 (DOM)·`tm-topbar-vars.js` 1300+ 行 (var 渲染)·`tm-player-core.js` L1320-1363 (era/weather 更新)·

### DOM 真实结构 (10 子节点)

```html
<div id="bar">
  <div class="bar-logo">                        ─── ① logo block
    <div class="bar-seal">天<br>命</div>          天命印·click→openWentian
    <button class="bar-wentian">问　天</button>    问天 btn·click→openWentian (与 seal 同动作)
  </div>

  <div class="bar-era-stack" id="bar-era-stack"> ─── ② era 三行栈
    <div id="bar-dynasty"></div>                  动态·剧本名 + " · " + 年号
    <div id="bar-date"></div>                     getTSText(GM.turn)·"X 年 Y 月 Z 日"
    <div id="bar-turn-text"></div>                "第 N 回合"
  </div>
  <span id="bar-era" style="display:none"></span> ─── ③ legacy era·已隐藏 (与 dynasty 重复)

  <div class="bar-weather" id="bar-weather">     ─── ④ 物候印 + 节气
    <div id="bar-weather-seal">秋</div>            季印 (春/夏/秋/冬)
    <div class="bar-weather-info">
      <div id="bar-weather-name">秋分</div>        节气名 (孟春/仲春/季春...)
      <div id="bar-weather-desc">北风起·寒气降</div> 物候描述
    </div>
  </div>

  <div class="bar-vars" id="bar-vars"></div>     ─── ⑤ 7 var 印石区·renderTopBarVars 注入

  <button class="bar-more-vars" id="bar-more-vars" ─── ⑥ 全部变量 btn
    onclick="TM.UI.topbar.openAllVarsModal()">全部变量</button>

  <div class="bar-right-group">                  ─── ⑦⑧⑨ 右侧 3 chip
    <span class="bar-save-chip">已 存</span>      已存档 chip
    <button class="bar-icon-btn2 ai-live"          AI 推演中 btn (闪)
      id="bar-ai-live">AI</button>
    <button class="bar-icon-btn2 badge"            待办 badge (data-n + display:none default)
      id="bar-todo-badge" data-n="0"
      onclick="openTodoPanel()">办</button>
  </div>

  <div class="mr" id="bar-btns"></div>           ─── ⑩ 动态按钮区 (mr·legacy 容器)
</div>
```

### ① 天命 logo block (2 元素)

```
.bar-seal·    "天/命" 双字印 (竖排)·click → openWentian()
.bar-wentian· [问 天] btn·click → openWentian()·与印同动作

→ openWentian() 唤 模态·与推演 AI 直接对话 (问天系统·6 mode)
```

### ② era stack (3 行·`bar-era-stack`)

```
bar-dynasty·   "明 · 天启"           ← scenario.name + GM.eraName
bar-date·      "天启七年九月初一"    ← getTSText(GM.turn)·剧本日期表达
bar-turn-text· "第 1 回合"          ← GM.turn

更新点·tm-player-core.js L1325-1329·每轮 endturn 同步
```

### ③ legacy era·已隐藏

```
#bar-era·display:none·与 bar-dynasty 内容重复·历史遗留
```

### ④ 物候印 (`bar-weather`·`bar-weather-seal` + info)

```
seal·   季节字 (春/夏/秋/冬)·圆形朱印·gradient + amber-400 border

info·
  bar-weather-name·节气名·24 节气 / 月分标签
    ['孟春','仲春','季春']  3-5 月·立春/春分/谷雨
    ['孟夏','仲夏','季夏']  6-8 月·立夏/夏至/大暑
    ['孟秋','仲秋','季秋']  9-11 月·立秋/秋分/霜降
    ['孟冬','仲冬','季冬']  12,1,2 月·立冬/冬至/大寒
  bar-weather-desc·物候 (东风解冻 / 蝼蝈鸣 / 凉风至 / 水始冰...)

更新算法·_mon = ((GM.turn-1) % 12) + 1·按月推算
源·tm-player-core.js L1331-1342

注·这是 surface 物候·**不是 GM.environment 数据**·与环境承载力系统独立
```

### ⑤ 7 var 印石 (`#bar-vars`·`renderTopBarVars`)

源·`tm-topbar-vars.js` L9-18 (`TOP_BAR_VARS`)·L359-406 (`renderTopBarVars`)·

```
TOP_BAR_VARS = [
  { key:'guoku',     name:'帑廪',  display:'fiscal',     click:'openGuokuPanel' },
  { key:'neitang',   name:'内帑',  display:'fiscal',     click:'openNeitangPanel' },
  { key:'hukou',     name:'户口',  display:'population', click:'openHukouPanel' },
  { key:'lizhi',     name:'吏治',  display:'corruption', click:'openCorruptionPanel', dataPath:'corruption' },
  { key:'minxin',    name:'民心',  display:'minxin',     click:'openMinxinPanel' },
  { key:'huangquan', name:'皇权',  display:'phase3',     click:'openHuangquanPanel' },
  { key:'huangwei',  name:'皇威',  display:'phase5',     click:'openHuangweiPanel' }
];
```

> ★ **lizhi 是 UI 名·dataPath 是 corruption**·此映射重要·"吏治印石" 实读 GM.corruption·

### 5 var 单元 visual·**两种** (wide vs simple)

```
wide·  guoku / neitang  ← 含 subItems (银/粮/布 三子值·each w/ delta)
        .bar-var.wide
        ├─ .bar-var-name·  名 (篆字双字)
        └─ .bar-var-sub·   3 子项·每项 sk + sv + sd (delta+/-/±0)

simple· hukou / lizhi / minxin / huangquan / huangwei
        .bar-var
        ├─ .bar-var-name·  名
        └─ .bar-var-value· 主数值 + 趋势箭 (▲ up / ▼ down / — flat)
```

### data-phase class (按 var)

```
guoku·     phase = 'bankrupt' (money < -annualIncome*0.5)
neitang·   '' (no phase·tip 内 state pill 显)
hukou·     'depopulation' (total < initial*0.5)
lizhi·     'corrupt-high' (trueIdx > 70)
minxin·    'revolt'/'thievery'/'endurance'/'peace'/'acclaim' (5 段·按 trueIdx 阈值)
huangquan· 'ministerDominance'/'balance'/'absolutism' (3 段)
huangwei·  'tyrant'/'majesty'/'normal'/'decline'/'lost' (5 段)
```

### Hover tip·**两种 layout** (rich vs legacy)

源·`_showBarVarTip` L752-832·

#### rich 版·**guoku / neitang** 用

```
.bar-var-tip rich [.imperial]                     ← imperial mode = neitang
├─ .bvt-head
│   ├─ .bvt-glyph·       篆字大印 ("帑" / "内")
│   ├─ .bvt-htxt·        title + subtitle
│   └─ .bvt-pill [<kind>]· state 药丸 (ok/warn/bad/gold)·
│                          "充裕" / "尚可" / "紧 · 不足两成" / "亏空" / "⚠ 破产·N 月"
├─ .bvt-stocks·          3 stock 格·each·
│   ├─ .bvt-s-name·      "银" / "粮" / "布"
│   ├─ .bvt-s-val·       _barFmtNum (万/亿)
│   ├─ .bvt-s-unit·      U.money / U.grain / U.cloth (按 CurrencyUnit)
│   └─ .bvt-s-warn·      "⚠" (粮 < 1000 时)
├─ .bvt-flows·           月入 / 月支 (neg) / 年入·each·
│   ├─ .bvt-f-lbl·       "月入" / "月支" / "年入" (turnDays=30 时)
│   ├─ .bvt-f-val·       数值 + unit·trend arrow ▲▼
│   └─ neg class·         月支显红
├─ .bvt-alerts·          chip list·
│   ├─ guoku·    "借贷余 N 月" / "通胀 0.32"
│   └─ neitang·  "内廷侵吞 N%" / "宗室禄米压库" / "特别税·X"
└─ .bvt-note·            "点击查看详情 →"
```

#### legacy rows 版·**5 var 用** (hukou / lizhi / minxin / huangquan / huangwei)

```
.bar-var-tip                                      ← 简版
├─ .bar-var-tip-title·   title (在籍户口 / 吏治 / 民心 / 皇权 / 皇威)
├─ .bar-var-tip-phase·   段位 + (朝廷视野: N) ← 真假双值显此
├─ .bar-var-tip-row[]·   2-7 行·label + val
└─ .bar-var-tip-note·    note·点击说明
```

### **真假双值** (perceived vs true·情报战核心)

| var | true | perceived | 在 tip 显 |
|---|---|---|---|
| **lizhi** (corruption) | trueIndex | perceivedIndex | 真实浊度 N + 朝廷视野 N (地方可能粉饰) |
| **minxin** | trueIndex | perceivedIndex | 真实民心 + 朝廷视野 (地方上报) |
| **huangwei** | index | perceivedIndex | 皇威真值 + 朝廷视野 (颂声扭曲) |
| guoku/neitang | money | money | 无差·硬数 |
| hukou | mouths | mouths | 无差 (隐户已计·非感知扭曲) |
| huangquan | index | index | 无差 |

> ★ **3 var 有真假双值** (lizhi/minxin/huangwei)·这是 12 殿 v2 paradigm 的"情报战核心"·必须在 v2 UI 显·

### lizhi 特殊·**墨点显示**

```
value·    "○○○○" (清明<25) / "○○○●" (尚可<50) / "○○●●" (渐弊<70)
          / "○●●●" (颓靡<85) / "●●●●" (积重>=85)
phase·    名字·清明 / 尚可 / 渐弊 / 颓靡 / 积重
不显数字·  其他 6 var 显 _barFmtNum 数字·**lizhi 显墨点**
```

### click handler (`_handleBarVarClick`·全部 → 详情 panel)

```
guoku     → openGuokuPanel()·     fallback _openVarPanelWithSubsystems('帑廪')
neitang   → openNeitangPanel()·   fallback ('内帑')
hukou     → openHukouPanel()·     fallback ('在籍户口')
lizhi     → openCorruptionPanel()·fallback ('吏治')
minxin    → openMinxinPanel()·    fallback ('民心')
huangquan → openHuangquanPanel()· fallback ('皇权')
huangwei  → openHuangweiPanel()·  fallback ('皇威')
```

> 每个 panel 是独立 modal·非顶栏内嵌·与右下"诏付有司" / "御案时政" 同 modal-bg·

### 子系统并入映射 (`_openVarPanelWithSubsystems`·full panel)

源·tm-topbar-vars.js L905-923 + 个 _renderXxxFullPanel·

```
帑廪 ← 货币 (通胀/铸币/纸币) + 央地分账 (合规/虚报) + 借贷
内帑 ← 宗室压力
户口 ← 环境承载力 + 徭役 + 兵役 + 大徭役 + 军调 + 迁徙 + 阶层
吏治 ← 腐败明细 + 监察
民心 ← 民变 5 级 + 谶纬 + 天象
皇权 ← 奏疏待批 + 抗疏 + 权臣 + 执行率
皇威 ← 暴君综合症 + 失威危机 + 感知扭曲
```

> 这是"7 主变量 + 子系统并入"架构·**6 个原独立顶栏徽标已撤销** (通胀/合规/承载/抗疏/民变/问对)·内容并入对应主变量 panel·

### ⑥ [全部变量] btn (`bar-more-vars`)

源·`openAllVarsModal` L1151·

```
点击 → all-vars-overlay modal·
├─ header·     "全部变量" + ✕
├─ filter·     #all-vars-search input·实时过滤
└─ body·
    ├─ 剧本编辑变量 (scenarioVars)· P.variables[]·each card (name + value + desc)
    ├─ 运行时变量 (extraKeys)·       GM.vars 中不在 scenarioVars 的
    └─ empty fallback·               "此剧本未定义额外变量"

ESC 关
点 overlay 关
```

> ★ 这里显示**剧本自定义变量**·非 7 官方 var·官方变量已在顶栏显·此处不重复·

### ⑦ 已存 chip (`bar-save-chip`)

```
"已 存"·celadon 色·圆点 + 文字
作用·   纯 visual 提示·**未连存档系统的"刚保存"瞬间反馈**
        持久态·只是表 currently has save·不闪不滚

具体·   styles.css L511·
        background rgba(106,154,127,0.06)
        border 1px solid celadon-400
        padding 4px 10px·border-radius 14px·
        ::before 6px 圆点 + box-shadow glow
```

### ⑧ AI live indicator (`bar-ai-live`)

```
.bar-icon-btn2.ai-live·  "AI" 圆 btn
状态·  AI 推演中·闪烁 / disable
       baseline 跑前 disable·smoke 时 hide
```

### ⑨ 待办 badge (`bar-todo-badge`)

```
.bar-icon-btn2.badge·    "办" 圆 btn·data-n="N" attr·
default·                 display:none
有 todo 时 show·         data-n 显数字·click → openTodoPanel()
```

### ⑩ bar-btns·`.mr` 容器 (legacy 动态按钮区)

```
启动时·   innerHTML = "" (清空)·tm-game-loop.js L578
编辑模式· innerHTML = "<span>编辑: 剧本名</span>" 显当前编辑剧本
游戏中·   一般空·过去用作放动态按钮·已迁移到其他位置

renderBarResources L1677·已废弃·container.innerHTML='' (顶栏指标待重新规划·GM.vars 自定义资源已撤出)
```

### click 事件冒泡兜底

```
inline onclick + 全局 delegation 双保险·
HTML 内 onclick="_handleBarVarClick(...)" + onmouseenter/leave/move
+ tm-topbar-vars.js L1256-1310·_bindBarVarDelegation·
  事件委托·若 inline 因 namespace migration 失效·delegation 兜底
  500ms 重试 ×20·确保 #bar-vars 渲染后挂上
```

### **mechanic 层** (audit layer 3)

```
顶栏 = 信息流 + 跳转 hub·
   ↓ 7 印石·   实时显 7 主变量·hover 完整 tip (含真假双值)·click 跳详情 panel
   ↓ era 栈·   时间锚定·年号/日期/回合
   ↓ 物候·     surface only·按 GM.turn 自计·非 GM.environment 数据
   ↓ 已存/AI/办· 状态指示
   ↓ 全部变量·  剧本自定义 var 入口

真假双值 (3 var)·
   trueIndex·     系统真实计算·随政策/灾异/民变实推演
   perceivedIndex 朝廷视野·受地方粉饰 / 颂声扭曲 / 报喜不报忧 影响
   差额 = 信息墙·  12 殿 v2 屏风后密档 / 神镜问天 都是揭穿差额的 mechanic

子系统 (8 个并入 7 主变量)·
   通胀 / 央地合规 → 帑廪
   宗室            → 内帑
   环境/徭役/兵役/大役/军调 → 户口
   腐败明细        → 吏治
   民变/谶纬/天象  → 民心
   奏疏/抗疏/权臣  → 皇权
   暴君症/失威/扭曲 → 皇威

每变量 → tip 即微 dashboard·full panel 即完整子系统 modal·
```

### **关键修正** (audit 中)

```
1· 顶栏共 **10 子节点 DOM** (logo / era-stack / legacy era / weather / vars
   / more-vars / right-group [save chip + AI + todo] / btns)
2· logo block 2 元素 (印 + 问天 btn)·**两者同 onclick**·非两路入口
3· era stack **3 行**·dynasty / date / turn-text·非 1 行
4· legacy era #bar-era 已 hidden·与 dynasty 重复
5· 物候 4 季 ×3 月 = 12 节气文案·按 turn%12 算·**纯 surface·非 GM.environment**
6· 7 var·**lizhi UI 名·dataPath=corruption**·命名错位
7· tip **两 layout**·rich (guoku/neitang) + legacy rows (5 var)
8· **真假双值 3 var** (lizhi/minxin/huangwei)·tip 显 trueIndex + perceivedIndex
9· lizhi value 是 **墨点 ○●**·非数字
10· phase class 5/3/5/3 段·按 var 不同
11· 全部变量 modal 仅显**剧本自定义 var**·非 7 官方 var
12· 子系统 8 项 → 并入 7 主变量·6 原独立顶栏徽标已撤销
13· bar-btns mr 容器·**已废弃**·当前游戏中空·过去用作动态按钮
14· delegation 兜底·inline onclick 失败时 500ms ×20 重试挂事件
```

---

## §2 7 var 印石·参考表 (sub-summary·细节回 §1.⑤)

| # | key | 名 | dataPath | layout | phase | 真假双值 |
|---|---|---|---|---|---|---|
| 1 | guoku | 帑廪 | GM.guoku | wide·3 stock·3 flow | bankrupt | × |
| 2 | neitang | 内帑 | GM.neitang | wide·3 stock·2 flow | (state pill only) | × |
| 3 | hukou | 户口 | GM.population.national | simple | depopulation | × |
| 4 | lizhi | 吏治 | **GM.corruption** ★ | simple·墨点 | corrupt-high | ✓ |
| 5 | minxin | 民心 | GM.minxin | simple | revolt/thievery/endurance/peace/acclaim | ✓ |
| 6 | huangquan | 皇权 | GM.huangquan | simple | ministerDominance/balance/absolutism | × |
| 7 | huangwei | 皇威 | GM.huangwei | simple | tyrant/majesty/normal/decline/lost | ✓ |

---

## §3 中央 #gc tab 区·15 个 tab + 2 conditional

源·`tm-hongyan-office.js` L1636-1650·

### 5 组分类

| 组 | tabs (id·label) |
|---|---|
| **政务** (4) | gt-zhaozheng·朝政 / gt-edict·诏令 / gt-memorial·奏疏 / gt-chaoyi·朝议 |
| **问答** (2) | gt-wendui·问对 / gt-letter·鸿雁 |
| **纪录** (4) | gt-biannian·编年 / gt-qiju·起居注 / gt-jishi·纪事 / gt-shiji·史记 |
| **臣子** (3) | gt-office·官制 / gt-renwu·人物志 / gt-difang·地方 |
| **文考** (2) | gt-wenyuan·文苑 / gt-keju·科举 |
| **conditional** | gt-tech·科技 (有 techTree 时) / gt-civic·市政 (有 civicTree 时) |

### default tab

`gt-zhaozheng` (朝政中心·dashboard·5 组 action grid)·**非** gt-edict·

### 各 tab 内容

| tab | 内容 |
|---|---|
| **gt-zhaozheng** | 朝政中心 dashboard·5 组 action grid (内政/军事/人事/外交/发展)·16 action item·status dot·**详 §3.1** |
| **gt-edict** | 诏令起草·左 sticky 议事清册 sidebar + 5 textarea (政/军/外/经/他) + AI 润色 + 主角行止 + 帝王私行(可删) + 往期档案(conditional)·**详 §3.2** |
| **gt-memorial** | 奏疏待览·4 group (急/百官/留中/已批) + 8 朱批 button + 11 badge + 4 色条 + yanyi 存疑·**详 §3.4** |
| **gt-chaoyi** | 朝议入口·**modal 非 panel**·3 sub-mode (常朝 / 廷议 / 御前)·**详 §3.5 + §3.5.1-3** |
| **gt-wendui** | 御前问对·4 group (待见/求见/候旨/远方)·6 卡片色·2 mode (formal/private)·5 仪式·5 工具·5 推荐话题·emotion 5 级·**详 §3.6** |
| **gt-letter** | 鸿雁传书·9 地域·15 LETTER_TYPES·5 cipher·3 sendmode·8 status·3 信物·11 步 sendLetter·**详 §3.7** |
| **gt-biannian** | 编年纪事·3 段 (长期事势 + 检索 + 永久史册)·9 type 长期·7 cat 色·8 filter·**详 §3.8** |
| **gt-qiju** | 起居注·5 段·6 statbar·7 cat·3 schema·御批·诏令连锁·人名高亮·**详 §3.9** |
| **gt-jishi** | 纪事本末·5 段·13 源类·3 视图 (时间线/按人物/按事类)·4 mood·3 importance·**详 §3.10** |
| **gt-shiji** | 史记列表·**真"史记"=turn-modal 推演弹窗**·layer1+layer2 共 12 板块 (实录/时政记/数值/御批回听/前议追责/人事/戏说/状态/私行/势力/财政/一致性)·**详 §3.11** |
| **gt-office** | 官制树·各级署/官·公库/主官·点击查看 |
| **gt-renwu** | 人物志·全部角色·_rwSearch/_rwFaction/_rwRole/_rwSort/_rwShowDead 过滤·card grid + viewRenwu modal |
| **gt-difang** | 地方·行政区划·督抚 |
| **gt-wenyuan** | 文苑·学派/制度/文化 |
| **gt-keju** | 科举·`openKejuPanel` action·5 stage (童试/乡试/会试/殿试/授官) |
| gt-tech | (conditional) 科技树·unlockTech |
| gt-civic | (conditional) 市政树·adoptCivic |

---

## §3.1 gt-zhaozheng·朝政中心 detail

源·`tm-game-loop.js` `_renderZhaozhengCenter` L1304-1392·

### 标题段
```
〔 朝 政 中 心 〕              大标题·letter-spacing 0.15em·color-primary
第 X 回合 · {干支 / 月}        副·turn + getTSText
```

### 5 group · 16 action item

| group | color | items |
|---|---|---|
| **内政** | indigo | 下诏令 / 科举取士 / 地方区划 / 地方舆情 |
| **军事** | vermillion | 军事诏令 / 制度改革 / 地图总览 |
| **人事** | gold | 官制任免 / 人物志 / 问对臣子 |
| **外交** | celadon | 外交诏令 / 遣使出使 / 鸿雁传书 |
| **发展** | amber | 科技树 / 民政树 / 朝议 |

### action 跳转

```
下诏令       → switchGTab(gt-edict)
科举取士     → openKejuPanel()
地方区划     → openProvinceEconomy()
地方舆情     → switchGTab(gt-difang)
军事诏令     → switchGTab(gt-edict) + focus #edict-mil
制度改革     → switchGTab(gt-edict) + focus #edict-pol + 改 placeholder
地图总览     → TM.Map.open("regions")
官制任免     → switchGTab(gt-office)
人物志       → switchGTab(gt-renwu)
问对臣子     → switchGTab(gt-wendui)
外交诏令     → switchGTab(gt-edict) + focus #edict-dip
遣使出使     → openDiplomacyPanel()
鸿雁传书     → switchGTab(gt-letter)
科技树       → switchGTab(gt-tech)
民政树       → switchGTab(gt-civic)
朝议         → startChaoyiSession()  ★ 直接 modal·非 switchGTab
```

### 每 action item · DOM
```
.zz-item (or .disabled)
  .zz-item-icon       tmIcon('scroll'/'office'/...)
  .zz-item-text·
    .zz-item-label    下诏令 / 科举取士 / ...
    .zz-item-sub      副 (e.g. 政令/军令/外交/经济)
  .zz-item-status·
    .ok               ●  (绿点·可点)
    .no + reason      ○ + 不可原因 (e.g. "未开启科举制度" / "无地方数据")
```

### 5 个动态可用性 gate
```
_canKeju()       P.keju.enabled + 无 currentExam
_canChaoyi()     startChaoyiSession 已加载
_canProvince()   openProvinceEconomy 已加载 + GM.provinceStats 非空
_canMap()        P.map.regions.length > 0
_hasTech() / _hasCivic()    P.techTree / P.civicTree 存在
```

### zz-summary 底部
```
国库 {Math.round(GM.stateTreasury)}        蓝
战争 {GM.activeWars.length}                红 (仅 wars > 0)
```

### 移动端 #mobile-nav (≤768px)
```
4 按钮·  ☰ 概览  /  ✍ 诏令  /  ⏳ 结算  /  ⚙ 操作
```

---

## §3.2 gt-edict·诏令 detail

源·`tm-hongyan-office.js` L1687-1852 + L2289-2351·

### 整体布局·左右并排

```
左 sticky 260px·议事清册 sidebar (#edict-sug-sidebar)
右 flex:1·诏书编辑区·
  御笔标题 (天子/王/侯·dynamic by GM.sid role)
  5 类 ed-card·政/军/外/经/他·textarea rows=2 + 实时 forecast
  润色控制·4 文风 + 有司润色 → #edict-polished
  ── 主 角 行 止 ── (★ 必保留)
    #xinglu-pub textarea rows=4
    近期行止 details (近 5 期 q.xinglu)
  ⏷ 帝 王 私 行 (★ v2 删除)
  ⏷ 往 期 诏 令 档 案 (conditional·gate: _edictTracker 有历史才显)
  [诏付有司] [查看地图(terrain)]
```

### 5 类诏令 textarea

| id | label | badge | hint |
|---|---|---|---|
| edict-pol | 政 令 | 政 (indigo) | 改革官制·任免官员·降旨安抚 |
| edict-mil | 军 令 | 军 (vermillion) | 调兵遣将·加强边防·讨伐叛贼 |
| edict-dip | 外 交 | 外 (celadon) | 遣使和亲·结盟讨伐·册封藩属 |
| edict-eco | 经 济 | 经 (gold) | 减税轻赋·开仓放粮·兴修水利 |
| edict-oth | 其 他 | 他 | 大赦·科举·建造·礼仪 |

每 textarea·rows=2·oninput → `_edictLiveForecast(id)` 实时后果预测·

### 润色控制·4 文风
```
典雅骈文 / 简洁明快 / 华丽文藻 / 白话文言
[有 司 润 色] → AI 润色 5 textarea → #edict-polished div (默认 hidden)
```

### 主角行止 (★ v2 必保留)
```
#xinglu-pub textarea rows=4
placeholder·  召见某臣 / 校阅三军 / 微服私访 / 夜读史书 / 祖庙祭祀 / 宴请群臣
近期·         <details>·近 5 期 q.xinglu·点 T{turn} + 文
作用·         写入 GM.qijuHistory[].xinglu·每回合
```

### 帝王私行 (★ v2 删除)
```
当前·   折叠 button + #tyrant-panel + TyrantActivitySystem.renderPanel()
4 子·   后妃 / 游猎 / 丹药 / 密访
v2·    删·不并入 12 殿
```

### 往期诏令档案 (conditional)
```
gate·   GM._edictTracker 存在 + filter(turn < currentTurn).length > 0
display·按回合分组·turn 倒序·每 edict 显示·
        status icon·  ✅ completed     ❌ obstructed    ⚠️ partial
                      ⏳ executing     ⭕ pending      📨 pending_delivery
        + category + content + assignee
        + 远方送达状态 (8 letter status·见下)
        + feedback 回函内容 (若有)

8 letter status·
  traveling             信使在途
  delivered / replying  已送达
  returned              已送达且回函 (含真假回函·_isForged)
  intercepted           ⚠信使失踪
  intercepted_forging   ⚠信使失踪 (回函伪造中)
  recalled              已追回
  blocked               ⚠中书阻挠未下达
```

### 底部 action bar
```
[诏 付 有 司]   onclick="confirmEndTurn()"   ★ 与右下大按钮同
[查 看 地 图]   onclick="TM.Map.open('terrain')"   注·与"军事·地图总览" (regions) 不同源
```

### dynamic 御笔抬头
```
default·  天子 御笔
若 GM.sid 剧本 role 含 "王"/"侯"·  改为 "{role} 御笔"
```

---

## §3.3 议事清册 (诏书建议库) detail

源·`_renderEdictSuggestions` (tm-hongyan-office L2289-2351) + 13 个 push 入口·

### 关键命名
```
UI 标题·       议 事 清 册
内部代号·      诏书建议库  (toast / 注释 / 文档全用此名·**两个名字一物**)
GM field·      GM._edictSuggestions[]
DA accessor·   DA.edict.suggestions()
DOM·           #edict-sug-sidebar (左 sticky 260px·max-height 70vh)
```

### **13 source 值·全游戏汇入入口**

| # | source | from | 触发 | 文件 |
|---|---|---|---|---|
| 1 | 鸿雁 | NPC 名 | 鸿雁回信附 _suggestion·自动入库 | tm-hongyan-office L576/1115 |
| 2 | 奏疏 | 上奏者 | 朱批奏疏选"摘入清册" | tm-memorials L713 |
| 3 | 官制 | 铨曹 | 任命/免职/增设/裁撤/改名 | tm-office-panel L1041-1077 + tm-office-runtime L2129 |
| 4 | 弹劾按钮 | 铨曹 | 弹劾按钮·**used=true 即时**·不显清册 | tm-office-panel L609 |
| 5 | 文事 | 作者 | 著作完成进言 | tm-player-core L589 |
| 6 | 地方 | 政区名 | 督抚进言 / 更换长官 | tm-player-core L1039/1048 |
| 7 | 工程 | 政区名 | 工程进言 | tm-player-core L1175 |
| 8 | 封建 | 政区名 | 分封进言 | tm-player-core L1273 |
| 9 | 独召 | NPC 名 | 御前独召·AI 返回 suggestions | tm-shizheng-panel L732/734 |
| 10 | 独召·建言要点 | NPC 名 | 顶栏 button·AI 归纳 60-120 字 | tm-shizheng-panel L904 |
| 11 | 独召·划选 | 划选发言者 | mouseup 选中文本·浮动【划入诏书】button | tm-shizheng-panel L949 |
| 12 | 宫建 | 宫殿名 | 宫殿修缮 / 移居 / 新建 | tm-sidebar-ui L791/867/879 |
| 13 | 问对 | NPC 名 / 赏赐 / 处罚 | 问对·AI 建议 / 加官 / 降职 | tm-wendui L550-1819 |

### CSS 着色 _srcClsMap (9 类·5 个 fallback default)

```
鸿雁          → ed-src-letter
奏疏          → ed-src-memorial
官制          → ed-src-office
地方          → ed-src-local
朝议          → ed-src-chaoyi   ★ map 有色·实际无 push (deprecated 或 forward)
问对          → ed-src-wendui
独召          → ed-src-wendui
独召·划选     → ed-src-wendui
独召·建言要点 → ed-src-wendui

文事 / 工程 / 封建 / 弹劾按钮 / 宫建  → ed-src-default (灰)
```

### 渲染规则
```
排序·          按 turn 倒序 + 同回合按插入序
分组 header·   "本回合" / "上回合" / "第 X 回合 · {干支}" / "往日"
empty 文·     "诸事暂宁。召开「朝议」或「问对」，其进言将收入此处。"
filter·       used=false 才显
each item·    
  【source·from】 + topic 〔...〕(若有) + content + "摘入" + [×]
  click·  _showEdictAdoptMenu(event, realIdx) → 5 类 popup (政/军/外/经/他)
  ×·     used=true 软删·重渲
"摘入" 流·     选 5 类之一·content append 到对应 textarea·used=true·清册自动消失
```

### 用户感知 toast (13 处)
```
鸿雁回信·朱批奏疏摘入        "已摘入诏书建议库"
官制 5+1 操作 (含任命/免职)   "已录入诏书建议库——请在诏令中正式下旨"
独召·建言要点                "「{NPC}」之见已纳入诏书建议库"
独召·划选浮动 button         "划选之语 (X 字) 已纳入诏书建议库"
宫殿 3 操作                  "已录入诏令建议库" (注·此处 toast 写"诏令"非"诏书"·小不一致)
问对·加官/降职 / AI          "（许以加官。已录入诏书建议库。）"
著作/地方/工程/封建/独召返回 (auto·静默无 toast)
```

### v2 影响
```
议事清册 sidebar = 全 game 13 入口的汇入端·**已是核心 hub UX**·非新加
御书房 v2 必保留 sidebar·"清册" UX 必映射 13 入口分类着色

12 殿 v2 设计要包含·
  宫建 (铜镜厅或专 surface)·独召·建言要点·独召·划选·弹劾按钮 等触发面
  非只 6 个机关
```

---

## §3.4 gt-memorial·奏疏待览 detail

源·`tm-memorials.js` `renderMemorials` L543-703·

### 整体布局
```
.mem-panel-wrap > .mem-inner
  .mem-title·奉朱印 + "奏 疏 待 览" + 副"案牍之司·百官启奏"
  #mem-transit (条件)·驿站来报·尚有 N 份奏疏在途
  #zouyi-list·主体·4 group 卡片
```

### visible filter
```
GM.memorials filter·  m.turn === GM.turn || pending || pending_review
empty 文·            "案牍清净  百官无事启奏"
```

### 4 group 分类

| group | 触发 | tag | desc |
|---|---|---|---|
| gUrgent | priority='urgent' | 急 奏 待 批 | 加急·告变·边事急报 |
| gPending | 默认 | 百 官 启 奏 | 待批·待批示·待转交 |
| gHeld | status='pending_review' | 留 中 之 折 | 暂搁置·候时机·或观望事势 |
| gDone | approved/rejected/annotated/referred/court_debate | 已 批 档 案 | 本回合已处理·可再次修订 |

### **8 朱批 action button** (我之前说 7 错·实 8)

| # | icon | label | onclick | 说明 |
|---|---|---|---|---|
| 1 | ✓ | 准 奏 | _approveMemorial | status→approved |
| 2 | ✗ | 驳 回 | _rejectMemorial | status→rejected |
| 3 | ✎ | 批示意见 | _annotateMemorial | status→annotated |
| 4 | → | 转交有司 | _referMemorial | status→referred |
| 5 | ⚖ | 发廷议 | _courtDebateMemorial | status→court_debate·**接 廷议 7 phase** |
| 6 | ⏸ | 留 中 | _holdMemorial | status→pending_review·非已留中显 |
| 7 | ⌗ | 摘 入 | _memExcerptToEdict | 划选→议事清册·source='奏疏' |
| 8 | ☄ | 传召问讯 | _summonForMemorial | 召 NPC 问对·非系统奏显 |

### 11 badge

```
急 / 存疑 / 待证 / 留中
✓已准奏 / ✗已驳回 / ✎已批示 / →已转 / ⚖廷议
驿递自{X}
朱批已送达 / 朱批回传中…
```

### 4 色条 mem-c-{cls}

```
danger   priority='urgent' OR sender.loyalty<25
suspect  yanyi+reliability='low' OR sender.loyalty<40
loyal    sender.loyalty>=75
normal   其他
```

### 朱批回传链 (远方奏疏)
```
_memorialSendReply·  m._remoteFrom + 异地 → 自动生 letter
letter.content·      "【朱批回传】{action}。御批：{reply}"
delivery·            calcLetterDays + _getDaysPerTurn → deliveryTurn
badge·               朱批已送达 / 朱批回传中
```

### yanyi (演义) 模式特有
```
P.conf.gameMode === 'yanyi' 时·
  reliability='low'    → mem-c-suspect 色条 + ⚠存疑 badge
  reliability='medium' → ?待证 badge
作用·让玩家感受"奏疏可能掺假"·情报战支撑
```

### v2 影响
```
gt-memorial → 御书房 (hub)·朱批 8 按钮 + 卡片 4 group 是核心循环
⚖ 发廷议 → 跨殿·御书房 → 正殿 (开廷议 7 phase)
☄ 传召 → 跨殿·御书房 → 铜镜厅 (NPC 详情)
朱批回传中 badge → 御书房显·驿递动画
yanyi 存疑/待证 → 御书房 + 司天监 (灾异/谶纬关联)
```

---

## §3.5 gt-chaoyi·朝议 (modal 入口)

源·`tm-chaoyi.js` L20-142·**注·gt-chaoyi tab 不渲 panel·只是 ID·点击触发 modal**·

### 频率限制
```
GM._chaoyiCount[turn] >= 2 → toast 拒
朔朝 (post-turn) 不计入
```

### #chaoyi-modal 结构
```
header·   🏛 朝议 + round-tag + [✕ 退朝]
#cy-topic·议题显示 (hidden until selected)
#cy-body· 气泡流·addCYBubble·system 居中灰文·NPC 28×28 头像 + 圆角气泡
#cy-input-row·   input + [📣 插言] + [⏸ 打断]·hidden until phase='discussion'
#cy-footer· 按钮区
```

### CY state·全局 single
```
{open, topic, selected, messages, speaking, abortCtrl, round, phase, stances,
 mode: 'changchao'/'tinyi'/'yuqian', maxRounds, _playerActions, _pendingPlayerLine, _abortChaoyi}
```

### showChaoyiSetup·**3 mode 选择网格**

| mode | title | desc | scale | energy | 入口 |
|---|---|---|---|---|---|
| changchao | 📜 常 朝 | 多事并奏·百官齐集·逐条裁决 | 30-50 | 10 | _cc3_open |
| tinyi | 🏛 廷 议 | 一议多轮·辩难立场·共识或独断 | 15-30 | 25 | _ty2_openSetup |
| yuqian | 👑 御前会议 | 坦言直陈·君臣密议·**可不录** | 3-8 | 10 | _yq2_openSetup |

### 3 玩家交互 (跨所有 mode)
```
插言 _cySubmitPlayerLine·   回车 / 📣 → 缓存 _pendingPlayerLine
打断 _cyAbortChaoyi·        ⏸ → CY._abortChaoyi=true·停 AI 流式
system 气泡 addCYBubble·    内侍提示
```

---

## §3.5.1 常朝 v3·_cc3_open (含早朝/朔朝)

源·`tm-chaoyi-changchao.js` 3866 行·

### 早朝 vs 朔朝·**核心区分**

```
state._isPostTurn        false (in-turn)        true (post-turn)
state.mode              'changchao'             'shuochao'
GM._isPostTurnCourt     undefined / false       true
触发                    主动召                   endturn 阶段自动
标题                    〔 早 朝 〕              〔 朔 朝 〕
副标                    奉天门 · 五更三点         (按 cfg.dateLabel)
agenda prompt           常态                    + 早朝已议列表注入·避免重复
频率                    计 GM._chaoyiCount      不计·无限
决议生效                当回合·targetTurn=turn   下月·targetTurn=turn+1
退朝后                  showSummary             _onPostTurnCourtEnd → 推演 + 史记
qijuHistory label       【常朝】                【朔朝】
```

### 4 phase·完整时序
```
opening (1958)·  鸣鞭三响 + 山呼 + 缺朝名册 + 季节天气 + 御殿  (~5s)
runAnnounce·     item.announceLine 短陈述
runDetail (2174)·   主奏 detail + selfReact + 玩家 actions
runClosing (2710)·   退朝鸣鞭 + 持久化 + 朔朝触发推演  (~3.5s)
```

### isStrictCourt·肃朝判定 + 6 状态

```
prestige >= 75 + power >= 75 → isStrict = true
note 6 状态·勉强达标 / 将临肃朝 / 皇威皇权两不足 / 皇威不足 (差X) / 皇权不足 / (达标无标)

低朝威·  全 selfReact 直发 'speak'
高朝威·  rank ≤ directSpeakRank (default 2·阁臣) 直发 / 余等举笏请奏 'request'
```

### 11 议程 action (主显 4 + 更多 popover 7)

```
主·准奏 / 驳奏 / 留中 / ⋯更多
更多·发部议 / 下廷议 / 改批 / 追问 / 传召 / 训诫 / 嘉奖
肃朝队列· 📋 请奏 N 人 ▼ → letStrictSpeaker / All / dismiss
```

### 4 金口 actions (cy-jinkou-btn popover)

```
🗣 训问 X 卿  inquire     问任意在场官员立场
👤 指 Y 主奏  reassign    绕开本部尚书
🤫 私下示意 Z private     朝散后入御前问对队列
📜 当庭口述诏令 decree    按皇威皇权 5 tier
```

### 5 tier 当庭口述诏令 (computeDecreeTier)

| tier | name | 触发 | desc |
|---|---|---|---|
| S | 圣旨煌煌 | w≥70 + p≥70 | 全效·皇威+1 名望+1 |
| A | 凛然奉旨 | w≥70 OR p≥70 | 全效·反对派 -1 |
| B | 勉强尊行 | default | 奉行·loyalty 略降 |
| C | 众议汹汹 | w<50+p≥50 | 全效但民心-2 暴名+1 |
| D | 诏不下殿 | w<50+p<50 | 50% 折或转廷议·皇权-1 |
| D | 危诏激变 | w<30 OR p<30 | blocked·皇威-3 派系叛意+ |

### agenda 生成·_cc3_buildAgendaFromGM·11 类注入

```
1·  CY._cc2.attendees seed
2·  季节天气 ambient line
3·  财政状况
4·  在伐之敌
5·  乱政指数 (党争/民变/腐败)
6·  起居注近 3 条
7·  前回合推演摘要
8·  长期诏书 digest
9·  ★ 朔朝特别·"早朝已议·不可重复" + 早朝决议列表
10· 时空约束
11· system prompt·朝代/玩家/规制
```

### agenda item 结构 (本地补 _cc3_enhanceAgendaItem)
```
{presenter, dept, type, urgency, title, announceLine, detail, target, controversial, importance,
 selfReact[1-3], debate[4-6 controversial>5], debate2[3-4 controversial>7]}
```

### 班次·cy-bench 3 列 + 科道
```
.cy-bench-col-east   文 东 班    (#bench-east)
.cy-bench-col-throne 御 座
.cy-bench-col-west   武 西 班    (#bench-west)
.kdao-row            科 道 言 官  (#bench-kdao)
```

### 持久化·_cc3_persistCourtRecord·写 5 处
```
GM._courtRecords (max 8)·       完整 turn report·transcript + stances + adopted + decisions
GM._lastChangchaoDecisions·     下回合 endturn 读
GM.qijuHistory·                  "【常朝/朔朝】共议 N 事·准 X·驳 Y·..."
GM.biannianItems·                重大决议 (importance>=7 或 modify/decree)
ChronicleTracker·                changchao_pending·关键词正则 (清查/屯田/开海/变法/赈/...)
                                4 subkind (变法/边事/工程/赈抚)
```

---

## §3.5.2 廷议 v2·_ty2_openSetup

源·`tm-chaoyi-tinyi.js` 789 行·

### 4 phase (我之前 7 phase 错·preview-tinyi-v3 设计稿是 7·**实装代码 4**)
```
opening (init)·   筹备段·选议题/类型/官员/能耗 25
initial·          2 轮逐人陈议 (我之前 1 轮错·实 2 轮)
debate·           循环 ≤ 4 轮
decide·           4 mode → 持久化
```

### 议题类型 8
```
⚔️战和 / 👑立储 / 📜变法 / ⚖️重案 / 💰财赋 / 🌾灾赈 / 👔廷推 / ❓其他
```

### 不得与议·过滤
```
死 / 下狱 / 流放 / 致仕 / 病重 / 逃亡 / 丁忧 / 失踪
+ _imprisoned·_exiled·_retired·_fled·_mourning·_missing·_graveIll·health<=10
```

### initial·2 轮逐人陈议
```
for (_rd = 1; _rd <= 2; _rd++)
  for (each attendees)
    if pendingPlayerLine → 玩家插言 → npcRespondToPlayer
    res = await _ty2_genOneSpeech (流式·rescue 兜底)
    更新 stances[name].current·initial·confidence
    _ty2_render
```

### _ty2_genOneSpeech·11 类 prompt 注入
```
1·性格 / 2·党派+势力+家族 / 3·数值 (忠/野/望/恩) / 4·学识 / 5·生平 (max 120)
6·情节弧 / 7·近期记忆 (5 条) / 8·本党立场 + 焦点争议 / 9·跨对话上下文 (近 3)
10·他官立场 (前 15) / 11·本轮已发言 (近 3)
```

### stance 9 选项·6 颜色
```
极力支持 / 支持 / 倾向支持      → celadon (青)·support
中立                          → ink (灰)
倾向反对 / 反对 / 极力反对      → vermillion (朱)·oppose
折中                          → amber (金)
另提议                        → indigo (蓝)
```

### offerDebatePhase·4 选
```
🔥 展开辩论 / ⚖️ 召折中 / 🗳 直接裁决 / 📣 朕欲先言
```

### debate·辩论循环
```
roundNum++·挑各立场前 2 confidence 高·max 5 speakers
_ty2_genOneSpeech (流式·考虑 prevSpeeches)
_ty2_judgeStanceShifts·AI 判·"X 立场由 Y 转为 Z"·加 stanceHistory
循环·  ≤ 4 轮
```

### decide·4 mode

| mode | label | direction | 后果 |
|---|---|---|---|
| majority | 从众议 | support>oppose ? '允行' : '否决' | followedMajority=true |
| override | 乾纲独断 | majDir 反向 | **触发 _ty2_afterOverride 遗祸** |
| mediation | 采折中 | '从折中' | 用 _mediation 内容 |
| defer | 留待再议 | '留待再议' | push 到 GM._pendingTinyiTopics |

### 乾纲独断遗祸·6 type (_ty2_afterOverride)

| type | 后果 |
|---|---|
| resign | loyalty -15·addEB·X 因廷议逆意请辞 |
| sick | stress +20 |
| plot | 写 GM.activeSchemes·loyalty -10·ambition +5 |
| leak | NpcMemory '廷议被压制·背后散布不满'·怒 6 |
| accept | 无显惩罚 |
| confront | stress +10 |
| 全员 | NpcMemorySystem·"廷议X 被逆众议——心怀 Y"·恨 7 |

### 持久化·5 处
```
GM._courtRecords·  {turn, targetTurn, phase, topic, mode:'tinyi', stances, decision, stanceHistory}
GM._edictTracker·  廷议诏令·assignee 按 topicType (兵部/户部/刑部/吏部)·minorityDissent
GM.qijuHistory·    "【廷议】topic——direction"
addEB·            "廷议: topic：direction"
EconomyGapFill·    经济改革钩子
```

---

## §3.5.3 御前会议 v2·_yq2_openSetup

源·`tm-chaoyi-yuqian.js` 504 行·

### 议题类型 8 (与廷议不同)
```
🗡️诛戮 / 👑托孤废立 / 🎯军机 / 🎭罢相 / 🏯宫禁 / 💼人事 / 🕵️密谋 / ❓其他
```

### candorMap·B3 优化·一次性预算

```
each advisor·
  deceit = 0
  +30 if deceitful trait
  -20 if honest trait
  candor = clamp(loyalty*0.5 + (100-deceit)*0.3 + 20, 0, 100)
  level·
    >80    推心置腹
    50-80  大致坦言
    ≤50    揣摩圣意
```

### excluded·被排除重臣感

```
gate·  alive + 非 player + 在京 + 非 advisors + loyalty>=70 + rankLevel<=6
处罚·  loyalty -3 (轻)
记忆·  '陛下未召我议密事——疑心中有他意'·忧 4
```

### 3 phase
```
retreating (启议自动)·  屏退宫人 + 排除感触发
question·              帝出疑问·2 选 (令众人直陈 / 单独问某人)
  ├── roundQuery·       2 轮逐人 (_yq2_oneAdvisorSpeak)
  ├── _yq2_pickAdvisor· 单独问·prompt 输入 → _yq2_doAskAdvisor (深言)
  └── offerFollowUp·    点某人深问 / 决断
decide·                4 mode (准行/驳否/再议/自定)
_yq2_evaluateLeak·     泄密判定 (AI)
_yq2_finalEnd·         散
```

### stance 5 选项 (御前·非廷议 9 选)
```
支持 / 反对 / 保留 / 另提 / 推诿
```

### 记录·secret vs keep
```
record === 'keep'·    _cy_jishiAdd·正常入起居 + 纪事
record === 'secret'·  写 GM._secretMeetings·**永不入起居**
```

### 议题分流·3 路对接
```
reject / defer·            无后续诏令·只记忆
approve / custom + 公开·   写 GM._edictTracker·正常诏令
approve / custom + 敏感·   (execution/plot OR secret) → 写 GM.activeSchemes·暗中推进
                           addEB('密谋', '【御前】topic——暗中推进')
```

### 泄密判定·_yq2_evaluateLeak·5 因子

```
each advisor·
  risk = 100 - loyalty
  + 15 if deceitful
  + 10 if gregarious (话多)
  + 10 if ambition > 70
  + 5  if stress > 70
avgRisk = totalRisk / advisors.length
riskLevel·  >60 高·35-60 中·≤35 低

★ 反直觉·secret reduces leak·
leakProb = (avgRisk/100) × (record==='secret' ? 0.5 : 1.2)
actuallyLeaks = Math.random() < (leakProb × 0.4)
```

### 泄密时·AI 决定 leaker·4 channel·3 severity
```
channel·  枕边风 / 门生告密 / 酒后失言 / 密书外传
severity· light / moderate / severe

if record='secret' + leak·  反入纪事·"【泄密】..."·**丑闻显形**
knownTo NPCs·  NpcMemorySystem·重 7
```

### 心腹**机密记忆** (无论 secret)
```
each advisor·NpcMemorySystem.remember
  '【机密】御前议「topic」——决:line'·重 8
```

---

## §3.6 gt-wendui·御前问对 detail

源·`tm-hongyan-office.js` L1862-1868 (DOM) + `tm-wendui.js` L18-1820·

### 整体·.wdp-panel-wrap > .wdp-inner
```
title·"召见" seal + "御 前 问 对"·副"君臣之对·面圣请对"
#wendui-chars·容器·4 group 卡片
```

### 4 group
```
1·阶下待见 (使节·外藩·AI 推送)·  GM._pendingAudiences·[接见]/[暂却]
2·有臣求见 (朱砂高亮)·  4 触发 (loyalty>90+stress>30 / ambition>80+loyalty>60 / stress>60 / 鸿雁未回)
3·百官候旨 (卡片网格)·  atCap 非 _seekAudience·click → openWenduiPick
4·远方臣子 (灰度)·     away 非在京·只显·提示鸿雁
```

### 卡片 6 类·_wdCardClass
```
wdp-consort  ch.spouse                       宫眷 (后妃)
wdp-eunuch   /东厂|司礼|官|太监/.test(t)     宦官
wdp-mili     /将军|总兵|总督|指挥/           武将
wdp-dongin   东林党 / 东林派系                东林
wdp-zhejian  /浙/.test(party)                浙党
wdp-civil    default                          文臣
```

### 忠诚色 3 + 派系 tag 5
```
loy·hi (≥75 绿) / mid (45-74 黄) / lo (<45 红)
tag·宫眷 / 党 / 势力 / 武将 / 宦官
```

### mode 选择 modal·openWenduiPick
```
2 mode·
  formal·  朝堂问对·起居注官在场·严肃正式
  private· 私下叙谈·屏退左右·更坦诚亦更絮叨
```

### 不可召对 gate (改鸿雁)
```
已薨/下狱/流放/致仕/丁忧/逃亡/失踪/病重(health<=10)
+ 在远方 (location 不在 capital · _travelTo · _enRouteToOffice)
```

### 后宫干政触发 (formal + spouse)
```
写 GM._consortFormalAudiences·{name, turn, spouseRank, motherClan, processed}
addEB('后宫', '朝堂问对 X·此举引外臣侧目')
→ 下回合大臣可起弹劾
```

### 主 modal 8 元素
```
header·   [摘入建议库][召人对质][赏][罚] + 名+官衔+mode+忠 + [✕]
hint·     "划出大臣说的话加入建议库" + emotion 5 dot
#wd-topics·  5 推荐话题
#wd-modal-chat· 聊天区·wd-selectable
footer·   语气 select 5 + textarea (rows=3 max 5000) + [奉旨][退下]
counter·  0/5000
```

### 5 语气 + 5 仪式
```
语气·  直问 / 旁敲侧击 / 施压逼问 / 虚与委蛇 / 沉默以对
formal 仪式·  赐座 / 不赐座
private 仪式· 赐茶 / 赐酒 / 直入正题
```

### emotion 5 级·GM._wdState[name]
```
{emotion: 1-5, turns, ceremony, fatigued}
1-2 NPC 坦诚 / 3 平稳 / 4 警惕 / 5 爆发拂袖
```

### NPC 主动求见 + 4 外藩风格
```
_wdOpenAudience → 开 formal modal·NPC 先开场
_wdNpcInitiateSpeak·AI 流式生
外藩 4 风格·  女真/蒙古·朝鲜·海商/南洋·西洋
```

### 持久化 5 处
```
GM.wenduiHistory[name][]·   {role, content, turn}
GM._wdState[name]·           emotion / turns / ceremony / fatigued
GM._npcCommitments[name][]·  _wd_extractCommitments 写
GM._consortFormalAudiences[]·后宫干政记录
GM._edictSuggestions·        source='问对' / '问对·赏赐' / '问对·处罚'
```

---

## §3.7 gt-letter·鸿雁传书 detail

源·`tm-hongyan-office.js` L39-78 (常量) + L115-313 (renderLetterPanel) + L664-810 (sendLetter)·

### 整体·3 列布局
```
.hy-panel-wrap·
  title + #letter-route-bar (驿路告急条件)
  3 列·
    hy-left   远方臣子 (~280px)·群发 + 检索 + #letter-chars
    hy-center 信件区 + 拟稿区·#letter-history + .hy-compose-area
```

### 9 地域分组 (_regionOf)
```
内廷 / 在京 / 辽东·北境 / 宣大·山西 / 西陲·边镇
中原·鲁豫 / 江南·江浙 / 西南·巴蜀 / 南方·海疆 / 其他
```

### 卡片 4 类色 (_cardClass) + 5 indicator
```
hy-c-mili   /将|总兵|督|指挥/
hy-c-loyal  loyalty >= 75
hy-c-scholar /学士|侨|尚书|郎中|侨学|童实|佛|徵士|教授|侨公|蓝知/
hy-c-normal default

5 indicator·
  unread (绿·N)·new (朱闪·NPC来函)·transit (灰·在途)
  lost (红·?·逾期)·blocked (黄·✕·驿路阻断)
```

### 群发 toggle + 80ms debounce 检索
```
[群发]·  GM._ltMultiMode·切多选
检索·    _ltOnSearchInput·debounce·只重渲左侧·保焦点
```

### 拟稿区·4 select + textarea
```
letter-type·     5 选 (玩家发)·密旨/征调令/问安函/私函/檄文 (default personal)
letter-urgency·  3·普通驿递 (50里/日)·加急 (300)·八百里加急 (800)
letter-cipher·   5·不加密/阴符 (0.2)/阴书 (0.05·拆三)/蜡丸 (0.4)/帛书缝衣 (0.3)
letter-sendmode· 3·普通信使/多路信使 (default)/密使 (须选 agent)
textarea·        rows=4
[遣使]
```

### LETTER_TYPES·15 类 (5 玩家显 + 10 NPC 来 + 1 衍生)
```
玩家发 5·secret_decree(密旨) / military_order(征调令) / greeting(问安函) / personal(私函) / proclamation(檄文)
        + formal_edict (正式诏令·内置)
NPC 来 10·report(奏报) / plea(陈情) / warning(急报) / intelligence(密信)
         / thanks(谢恩) / recommend(荐表) / impeach(密告) / condolence(吊唁)
         / gift(附礼) / diplomatic(国书) / diplomatic_dispatch(外交文书)
```

### LETTER_TOKENS·3 信物 + LETTER_CIPHERS·5
```
seal (玺印·密旨需) / tally (虎符·征调令需) / gold_tablet (金牌·八百里加急)
none(1.0) / yinfu(0.2) / yinshu(0.05·最强) / wax_ball(0.4) / silk_sewn(0.3)
```

### 8 letter status
```
traveling / delivered / replying / returned (含_isForged)
intercepted / intercepted_forging (伪信生成中)
recalled / blocked (中书阻挠)
```

### sendLetter·11 步
```
1·读 textarea + 4 select
2·确定 targets·multi 或 pendingLetterTo
3·自检剔除·自己 + 在京 (在京改面陈)
4·信物检查·needsToken 缺则警告
5·密使选择·sendmode='secret_agent' 时
6·正式诏令阻挠·_formalBlocked·权臣 loyalty<30 + ambition>70
7·default normal → multi_courier
8·each target·calcLetterDays·密使*1.5·建 letter (14 字段)
9·若 _ltReplyingTo·原 letter._playerReplied=true
10·征调令/密旨/正式诏令·自动注 _edictTracker
11·push GM.letters·清 _pendingLetterTo·写起居 + 邸报·重渲
```

### 驿递天数 calcLetterDays
```
速度 (里/日)·normal=50 / urgent=300 / extreme=800
距离·default 1000·同前缀 150·同顶级行政区 200
days = ceil(li/speed)·密使×1.5
deliveryTurns = ceil(days/dpv)·dpv=30
replyDays = days×2+3
```

### 3 layer 情报战
```
攻击面·  intercept (按 interceptWeight × 路径风险) / forge / block / 延 (route disruption)
防御面·  cipher 5 级 / sendmode (多路或密使) / token (信物) / urgency / 群发
```

---

## §3.8 gt-biannian·编年纪事 detail

源·`tm-hongyan-office.js` L1921-1937 + `tm-office-panel.js` L1111-1411·

### 整体·3 段
```
title + 
Section 1·#bn-active     "长 期 事 势"·进行中·9 type 分组
Section 2·.bn-tools      "编 年 检 索"·检索 + 8 filter + 导出 + 卷帙统计
Section 3·#biannian-list "编 年 史 册"·按年 details·按季节细分
```

### Section 1·9 type (_BN_TYPE)
```
keju 科举行朝(文) / edict 长期诏令(诏) / project 工程商队(工)
pending_memorial 积压奏疏(积) / faction_treaty 势力约期(盟) / npc_action NPC 持续行动(动)
tingyi_pending 廷议待落实(议) / chaoyi_pending 朝议待执行(议)
dynasty_event 朝代事件(朝) / other 其他(事)

源·ChronicleTracker.getVisible() + 旧 GM.biannianItems
```

### Section 3·7 cat 色 (_bnEntryCat·正则匹配)
```
cat-mil  /军|兵|战|裨|帅|密/             朱
cat-nat  /灾|异|旱|涝|地震|星|...|虎|狼/  灰
cat-eco  /经|赋|税|财|米|银|租|币|.../    金
cat-dip  /外交|藩|贡|负盟|使臣|.../       蓝
cat-cult /文|科举|贤|学|礼|祥|...|书/     青
cat-pol  /政|官|诏|吕|罢|免|.../          紫
cat-misc default                          默
```

### 8 filter
```
全部类别 / 军事 / 政事 / 经济 / 外交 / 文化 / 人事 / 天象灾异
```

### processBiannian·每 endturn 调
```
1·ChronicleTracker.tick·  采集本回合 (科举/诏令/阴谋/工程/积压奏疏)
2·biannianItems 完成检查·  elapsed >= duration → completed → 进 _chronicle
3·_bnExtractFromShiji·     从 shijiHistory 抽 turnSummary 入 _chronicle·标 _fromShiji
4·renderBiannian
```

### ChronicleTracker fields
```
{id, type, category, title, narrative, actor, stakeholders[], 
 startTurn, expectedEndTurn, progress 0-100, currentStage, priority, nextDeadline,
 hidden, effectProfile}
```

---

## §3.9 gt-qiju·起居注 detail

源·`tm-hongyan-office.js` L1999-2016 + `tm-shiji-qiju-ui.js` L268-488·

### 整体·5 段
```
title + #qj-statbar (6 卡) + .qj-tools (6 控件) + #qj-legend (7 类) + #qiju-history (主体) + .qj-paging
```

### 6 statbar 卡
```
总录·近日 (curTurn-4)·诏令·奏疏·朝议·御批
```

### 7 cat 色
```
诏令 c-edict / 奏疏 c-memo / 朝议 c-chaoyi / 鸿雁 c-letter
人事 c-person / 行止 c-xingzhi / 叙事 c-narrative
```

### _qijuNormalize·3 schema (兼容)
```
schema 1·  {edicts: {pol/mil/dip/eco/other}, xinglu, edictsSource}·cat='诏令' 或 '行止'
schema 2·  {zhengwen} → cat='叙事'
schema 3·  {content}·按前缀推断 (鸿雁/朝议/奏疏/人事 / 默认叙事)
```

### 御批·_qijuAnnotate
```
showPrompt·  "御批：" + 当前 _annotation
保存·       GM.qijuHistory[idx]._annotation = text
显·         朱字斜体·永久保留·导出带
```

### 诏令连锁·.qj-chain (条件)
```
gate·  cat='诏令' && _edictTracker
匹配 3 规则·  同 turn + content 子串包含·或反向包含
显·        执行 (assignee/status/progress%) + 反馈 + 近 6 chain (T+X effect)

★ 起居注成"诏令实施追踪"·非纯历史
```

### 人名高亮·_qijuHighlight
```
源·  GM.chars + GM.allCharacters·name length 2-6·sort 长度降序
替换·RegExp 包成 <span class="name">
```

### 折叠叙事 toggle
```
_qijuCollapseNarr·  叙事类正文截 60 字·opacity 0.75
```

---

## §3.10 gt-jishi·纪事本末 detail

源·`tm-hongyan-office.js` L2018-2038 + `tm-wendui.js` L1827-2065·

### 整体·5 段
```
title + #jishi-statbar (4 卡) + .ji-tools (3 视图 + 检索 + 人物 + 仅星标 + 导出)
+ #jishi-legend (13 源 chip + 计数) + #jishi-list (主体) + .ji-paging
```

### 4 statbar 卡
```
总纪事·★星标·本回合·时间跨度
```

### 3 视图切·_jishiView
```
time     按回合 ↓ (default)
char     按 r.char 分组·条目数降序
type     按 srcKey 分组·fixed 13 类顺
```

### 13 源类 (_jishiSource)
```
朝议 5·  changchao(朝) / yuqian(御) / tinyi/tingyi(廷) / keyi(科) / jingyan(经)
对话 2·  formal(殿)·private(私)
文书 4·  kangshu(抗)·memo(奏)·letter(雁)
杂 4·    mibao(密)·audience(觉)·record(录)·(fallback)

按 r.mode 直判·或按 playerSaid 关键字推断
```

### 4 mood (_jishiMood·仅群议)
```
yuqian secret  → solemn (肃穆·深紫)
yuqian default → tense (紧张·朱)
tinyi mediation → harmonic (和合·青)
tinyi stances 非空 → hostile (对峙·暗红)
jingyan/keyi → solemn
changchao → harmonic
```

### 3 importance (_jishiImportance)
```
major   _starred / r.final / mediation / playerSaid 含 /重大|战和|立储|帝位/
minor   changchao && !action
normal  default
```

### 写入触发·_cy_jishiAdd
```
朝议 5 种全调·额外字段·round / stance / candor / secret / mediation / final / playerInterject
```

---

## §3.11 gt-shiji·史记 (=turn-modal 推演弹窗)

**最重要的修正**·gt-shiji tab 只是**历史列表**·真"史记" = endturn 后 turn-modal·

源·`tm-endturn-render.js` L760-1244 + `index.html` L213-239 (modal DOM)·

### turn-modal 整体框架
```
.tr-head·     ✕ + 史宝 seal + ‹ tr-prev / tr-turn-no + tr-date / tr-next ›
顶 bar (sticky 条件)·
  .tr-summary-bar (#tr-summary)·从 sj.turnSummary 直读·gold 斜体
  .tr-critical-bar (#tr-critical)·_trDetectCritical 自动侦测
                                  战事 / 人殁 / 密谋 / 势力冲突
#turn-body·   layer1 (展开) + ▼ 详情 toggle + layer2 (折叠)
.tr-footer·   提示 + [导出本回] [朕已阅]
```

### layer1Html·**默认展开·叙事+标签** (4 段)
```
shiluHtml      实录·正史体 + "史官" seal·shiluText
summaryHtml    (空·已被 tr-summary-bar 显)
criticalHtml   (空·已被 tr-critical-bar 显)
battleVisHtml  战况可视化 (条件·若有战事)
```

### layer2Html·**默认折叠·11 板块**
```
1·szjSectionHtml      时政记 (szjTitle + 正文 + szjSummary)·**szj=时政记缩写·非戏说**
2·unifiedChangesHtml  数值变化说明·统一·7 var + 财政 + 军事 + 党派 + 人物
3·efficacyHtml        ★ 御批回听·诏令执行问责·6 维 + 4 status + 朝野反响
4·tinyiReviewHtml     ★ 前议追责·3 回前廷议/常朝/御前 复盘·4 outcome
5·personnelHtml       人事变动
6·hourenHtml          后人戏说·野史·野老传言·调侃风
7·statusHtml          玩家状态·playerStatus + playerInner
8·tyrantHtml          帝王私行·后妃/游猎/丹药/密访
9·factionEvtHtml      势力事件·当回合
10·financeReportHtml  财政报告·详尽
11·consistencyHtml    ★ 一致性校验·邸报附录·9 域 validator + 20 域 patch
```

### 御批回听·efficacyHtml·**核心** (板块 3)

```
源·  GM._edictEfficacyReport (AI 生·aiEdictEfficacyAudit)
顶·  代理强度 X% (≥75 绿·≥50 金·<50 红)·共 N 条·trend
6 维·  军事 / 财政 / 人事 / 外交 / 民心 / 皇权·each 0-100·雷达条 (2×3 grid)

每条诏令·4 status·
  executed   ✓ 执行   绿
  partial    ◐ 部分   金
  delayed    ⏳ 延宕   琥珀
  ignored    ✗ 忽略   红

13 字段·content / executionLevel / evidence / outcomeShortTerm / outcomeLongTerm /
       affectedEntities (max 6) / costPaid / oppositionFaced / linkedEdicts /
       missed / reason / nextAdvice / status

AI 自发事件·unexpectedEvents·severity (危/重/中)·category·title·detail·triggeredBy·playerCouldHavePrevented

朝野反响·courtReaction·
  clearFaction (清流·绿) / eunuchFaction (当权阉党·红) / neutralFaction (中立·灰)
popularReaction·  民间/市井·琥珀

oppositionSummary·主要阻力 top 5
strategicInsight·  御前战略 (绿底·"📜")
topPriority·       下回合首要 (金底·"⚡")
```

### 前议追责·tinyiReviewHtml·**核心** (板块 4)

```
源·  GM._turnReport.filter(type='tinyi_review' && turn===turn-1)
意·  3 回合前的廷议 / 常朝 / 御前 决议·此回合到期复盘

4 outcome·
  fulfilled   ★ 兑现       绿
  partial     ○ 部分       灰
  unfulfilled ⚠ 未兑搁置   琥珀
  backfire    ✗ 反弹       红

4 venueType 色·
  廷议 (金) / 常朝 (灰) / 亲诏 (红) / 御前 (紫)

每条·  histLabel + edictContent + proposerParty + leaderName + assigneeName + delayTurns
```

### 一致性校验·consistencyHtml·**Wave 2/3 新加** (板块 11)

```
源·  GM._reconcileLog (validator 警告·9 域)
     GM._reconcilePatchLog (AI tool_use 二审 patch·20 域)

20 域 patch·
  personnel_changes 👤 / office_assignments 🎖️ / fiscal_adjustments 💰
  military_changes ⚔️ / sentiment_changes 📊 / population_changes 👥
  war_events 🏹 / revolt_events 🔥 / disaster_events 🌪️ / diplomacy_events 🕊️
  keju_events 📜 / party_events ⚖️ / edict_events 📋 / court_ceremony_events 👑
  construction_events 🏛️ / omen_events ✨ / marriage_birth_events 💑
  conspiracy_events 🗡️ / currency_events 🪙 / religion_events ⛩️

mode badge·  tool_use 严格 (绿) / fallback 兜底 (金)

机制·   叙事说"X 死了"但 ch.alive 没变 → validator 检 → AI 二审 patch · 数据真实性 self-check
```

### sj 完整 13 字段 (实际 push L1160)
```js
{
  turn: GM.turn-1,         // ★ 上回合·因 endturn 时已 ++
  time, 
  // 史官 3 体
  shizhengji,    // 时政记主体·朝政纪要体
  zhengwen,      // 正文·叙事体·gt-qiju cat='叙事' 源
  shilu,         // 实录·正史体
  // 时政记子段·**非戏说子**
  szjTitle, szjSummary,
  // 玩家状态
  playerStatus, playerInner,
  // 后人戏说·野史
  houren,        // hourenXishuo
  // 摘要
  turnSummary,   // _summaryText·biannian 抽用
  // 副数据
  personnel, edicts: _thisTurnEdicts,  // 5 类按分类·patch L6061 加
  // 完整 HTML 包·点 gt-shiji 卡 → showTurnResult 直接呈现
  html: layer1Html + layer2Html
}
```

### 5 历史储存对照 (修正)
```
GM.qijuHistory          日级·条目·gt-qiju
GM.jishiRecords         事件级·对话·gt-jishi
GM.shijiHistory         回合级·完整 (sj 13 字段·含 html 包)·gt-shiji 列表 + turn-modal 显
GM._chronicle (biannian) 回合摘要级·gt-biannian 永久档案
ChronicleSystem (yearChronicles + monthDrafts)·**5 风格**·年度正史·年末 AI 生
                         5 风格·biannian/shilu/jizhuan/jishi/biji/custom
                         ★ 目前无独立 tab 显·只在 turn-modal 后台
```

### 风闻录事·跨钩 (从 turn-modal 衍生)
```
源·  GM.evtLog filter type='NPC自主' + turn===turn-1
写·  GM._fengwenRecord
4 类·密札 (密谋) / 耳报 (私交) / 军情 (军事动向) / 风议 (舆论)
排除·奏疏类 (奏/谏/弹劾/上书/疏/表)
```

### gt-shiji tab·**只是列表 replay**
```
卡片·3 列 (turn-col + body-col + delta-col)
6 tag (war/death/scheme/faction/calamity/event)
点卡 → showTurnResult(sj.html, idx) → 重唤 turn-modal·**replay layer1+layer2**
```

---

## §3.12 gt-office·官制 detail

源·`tm-hongyan-office.js` L1941-1977 (panel DOM)·`tm-office-runtime.js` L524-560 (renderOfficeTree dispatch)·L953-1226 (`_renderOfficeTreeSVG`·v10 SVG 树)·L1483-1605 (`renderOfficeDeptV2`·树状回退版)·L1748-1910 (`_renderOfficeSummary`·三栏 + 预警)·L13-65 (`OFFICE_SUBTABS` + `_OFFICE_CLASSIFIER_PATTERNS`)·L1912-2050 (`_offOpenZhongtui`·荐贤廷推)·

### panel DOM 结构 (3 段)

```
.og-panel-wrap > .og-inner
├─ .og-title (印章 "官制" + 主标 "六部卿寺" + sub "衙门职官 班位各司其职")
├─ .og-section-hdr [衙门总览]
│   └─ act buttons·[+部门] _offReformToEdict('add_dept') / [荐贤廷推] _offOpenZhongtui()
├─ #office-alerts        ← _renderOfficeSummary 注入预警条
├─ #office-summary       ← _renderOfficeSummary 注入三摘要卡
├─ .og-section-hdr [衙门层级]·"鼠轮缩放·拖拽平移·点击卡片展开详情"
├─ .og-tree-topbar (图例 4 品级色 + 2 状态点)
│   ├─ 正一品·#e4c579   二三品·gold-400   四五品·celadon-400   六品以下·ink-500
│   └─ 久任·amber-400 (圆点)·不满/缺员·vermillion-400
└─ #office-tree          ← renderOfficeTree → SVG 树 / 列表 (二选一)
```

### 视图模式·tree vs list (2)

```
GM._officeViewMode·  默认 tree (v10·点 [树图]/[列表] 切)
GM._officeViewModeExplicit·  user 手切过才 lock·否则可 migrate
GM._officeFilterMode·  all / empty / filled (3)
GM._officeSearchKw·    实时关键字 (姓名/官职/籍贯/派系)
GM._officeCollapsed·   {pathJSON: bool} 折叠状态
GM._officeCourt·       'central' / 'inner' / 'region' (3 朝)
GM._officeSubTab·      {courtKey: subKey} 二级分类
```

### 三朝 court tabs (3)

| key | label | desc |
|---|---|---|
| **central** 外朝 | 中央百司 | 衙门总览 |
| **inner** 内朝 | 内廷宫禁 | 司礼监/锦衣卫/侍卫/内务 |
| **region** 外朝 | 地方督抚 | 总督巡抚/三司/郡县/边镇 |

> 三 court 都标"外朝/内朝"·**注意**·UI label 上 central 和 region 都叫"外朝"·区分在 desc·

### 二级 subtab (5+4+4 = 13)

```
central 5·
  shuji   枢机辅政·相辅·秦汉三公/唐三省/宋二府/明阁/清军机
  liucao  六曹百司·吏户礼兵刑工·秦汉九卿→唐宋六部
  taijian 台谏风宪·御史台/都察院/六科·风宪监察
  sijian  寺监九卿·九寺五监·职事礼乐医卜马政
  xunqi   勋戚加衔·三公虚衔/宗室/首善之府

inner 4·
  zhongchao 中朝机要·近侍批阅·汉中朝/明司礼/清军机汉化前
  tiqi      缇骑耳目·侦缉特务·汉绣衣/明锦衣卫东厂
  suwei     宿卫禁军·宫禁甲兵·汉南北军/唐北衙/明御马四卫/清侍卫
  gongyu    供御宫务·宫闱供御·汉少府/唐殿中/明二十四监/清内务府

region 4·
  fengjiang 封疆督抚·方面大员·唐节度/宋安抚/明清督抚经略
  fannie    藩臬三司·省级三司·唐观察/明清布按都
  junxian   郡县牧守·府州县·秦郡县/唐州县/明清府州县
  bianzhen  边镇节帅·边塞军帅·唐节度/明九边总兵/清八旗将军
```

### `_OFFICE_CLASSIFIER_PATTERNS` 12 条 (按部门名 regex 自动归类)

```
正则匹配按先后顺序·首个命中即返回·
分类逻辑独立于编辑器配置·游戏运行时实时分组·
源·tm-office-runtime.js L40-65
```

### filter bar (`og-filter-bar`)

```
[官制树 title]
[全部 N]·[空缺 N]·[在任 N]·[搜索框]·| [列表]·[树图]·[T+回 · 剧本名]
```

### 三栏摘要 (`#office-summary`·_renderOfficeSummary)

| 卡 | 内容 | 颜色 |
|---|---|---|
| **c-count** 编制·实有·具象 | 部门数·编制 (headCount)·实有 (actualCount)·具象 (materialized)·缺员 | gold-400 |
| **c-power** 权力格局 | faction bar (派系占比) + chip 图例 + 空缺 | vermillion-400 |
| **c-cost** 岁俸开支 | 实付万两 + 编制全员应支差额 | amber-400 |

### 预警条 (`#office-alerts`·3 类)

```
1. 权臣预警 (danger)·rank<=3 + 派系>=25% + 忠诚<60·实权指数计算
2. 职位空缺 (warn)·列前 5 名·共 N 职待补
3. 具象化   (info)·名字占位但无具体人物·从有司递补
```

### SVG 树·v10 (`_renderOfficeTreeSVG`)

```
布局参数·
  EMP_W:240 H:96   皇帝节点
  GROUP_H:60       群组横幅
  DEPT_W:240 H:120 部门卡
  POS_W:260 H:210  职位卡
  H_GAP:22 DEPT_GAP:18 V_GAP:46

绘制·
  svgLines· 主干 (皇帝→群组) + Group→Dept elbow + Dept→Pos elbow (虚线)
            主干 gold-400·dept themeCol·pos celadon-400 dashed
  wrapperBgs· 群组包围框 (主题 class·theme-inner / theme-region)
  nodes·    _ogRenderEmperorCard / _ogRenderGroupBanner / _ogRenderDeptCardV10 / _ogRenderPosCardV10

zoom·   wheel 缩放 (0.18-3) + 长按拖动·autoFit 居中·resize 防抖
keybd·  '/' 聚焦搜索框 (仅官制 tab 可见时拦截)
```

### 部门卡 v10 (`_ogRenderDeptCardV10`)

```
.og-v10-dept[.theme-inner|.theme-region]
├─ collapse btn (▲/▼)
├─ seal·首字 (默认部门名首字)
├─ 部门名
├─ description (可选)
└─ meta· 编 N · 实 N · 缺 N (有缺员显 vac-pip 红点)
点卡 → 折叠/展开 (排除 collapse btn)
```

### 部门卡·legacy 版 (`_ogRenderDeptCard`·SVG 失败回退)

```
.og-dept-card[.depth-0|.depth-1]
├─ 顶栏· 名 + chevron + og-power-ring (实权指数 SVG 圆环·hi/mid/lo) + collapse
├─ body·
│   ├─ og-dept-func-row·  职能 chip ≤5 (皇帝节点显玩家姓名+年)
│   ├─ og-dept-fill·      编制条 (filled/vacant 双层 bar) + 满/缺 chip
│   └─ og-dept-actions·   [+官] [+局] [改] [裁]·全部 → _offReformToEdict
└─ 实权指数·avg(智+政)/2 + (18-rank)*3·皇帝特例用 imperialAuthority
```

### 职位卡 v10 (`_ogRenderPosCardV10`·12 态)

```
品级 css·rank-top (1品) / rank-high (2-6) / rank-mid (7-12) / rank-low (13+)
状态 class·
  vacant·  空缺待补  (vermillion-400 dot)
  loyal·   忠诚>=70 (celadon)
  mid·     35-70    (amber)
  danger·  忠诚<35  (vermillion)

特殊 state·
  _mourning·    丁忧 (og-mourn-badge "丁忧" + 27月期)
  _sickLeave·   告病 (og-sick-banner "告病")
  _actingPos·   权摄 (og-acting-stamp "署")
  _demoted·     贬谪 (og-demoted-tag)
  _retirePending· 致仕 (og-retire-glow)
  _concurrentWith· 兼任 (og-concurrent-stack "+兼")
  _pendingEdict·  待下诏书 (og-pending-edict + [撤销] btn·turn==当前回合)
```

### 职位卡·legacy 完整字段 (`_ogRenderPosCard`)

```
顶栏·
  官职 + 朱砂印品级 (og-rank-seal·sealCls=mid-lvl/low-lvl)
  + sub-line·部门 · 职能首项
  + 主按钮·[改换] (有 holder) / [具象] (unmaterialized) / [任命] (空缺)

在任者行·
  portrait + 任期环 (og-tenure-ring·任 N 回合·>0 显)
  imperial class·rank<=4 帝王专属边
  名 + onclick showCharPopup
  党派 tag (.dongin/.zhe/.yan/.kun/.qing 5 派色)
  hc/ac chip·编 N·实 N (头数>1 时)
  sub line·年 N · 任 N · 满意度 N (calcOfficialSatisfaction)

能力四维·
  智 政 军 忠 (loy hi/mid/lo)·mini bar

权限图标·5 (powers·辟/弹/税/兵/监 + off class)

meta row·
  公库银/米 (publicTreasuryInit·万)
  陋规·肥缺 (illicitRisk=high) / 清要 (low)
  久留警告 (>12 回·warn)
  考评 dot·近 3 次 (上甲/中乙/下丁·up/mid/dn)

状态文本·
  丁忧·  因父殁·依制守孝·T_until 期满
  告病·  reason + N 日
  权摄·  以供职摄尚书事·俟院下简拔正官
  贬谪·  被贬·回任希望渺茫
  致仕·  N 岁 · M 度请辞 · 陛下未允
  兼任·  兼 + 他职名

历任链·_history.slice(-3) + current
待下诏书·_pendingEdict (turn==GM.turn)·[撤销] btn
```

### 实权指数计算 (部门级·power-ring)

```
psCount > 0·
  per pos· (holder ? avg(intel+admin)/2 : 30) + max(0, 18-rank)*3
  avg over 所有 pos
皇帝节点· imperialAuthority || huangquan || 60

颜色档·>70 hi (celadon) / >45 mid (amber) / 其余 lo (vermillion)
```

### 操作流·`_offReformToEdict` (部门改制走诏书)

```
4 种·add_pos / add_sub / rename / abolish
点击 → 生成诏书草案 → gt-edict 议事清册 source='官制'·非直改 GM.officeTree
```

### 操作流·`_offOpenPicker` (任免)

```
开 picker modal·候选人按 8 维评分排序·
点选 → _pendingEdict 占位 (本回合可撤) → endturn 落地·写 _history
```

### 操作流·`_offTingTui` (高品廷推·rank<=6 自动触发)

```
_offOpenZhongtui()·全局空缺 picker·分组 [高品·廷推] / [一般·荐贤]
高品·走廷推 modal·**多人提名 + 票数**·非单人任命
```

### 操作流·`_offMaterialize` (具象化)

```
unmaterialized> 0 时·按 _ac>0 但 holder 空·
点 [具象] → 从有司库递补 → holder 落定
```

### 持久化字段 (GM 级)

```
GM.officeTree·       核心数据·递归 {name,positions[],subs[],functions,description}
GM._officeCollapsed· {pathJSON: bool}
GM._officeViewMode·  list / tree
GM._officeFilterMode·all / empty / filled
GM._officeSearchKw·  字符串
GM._officeCourt·     central / inner / region
GM._officeSubTab·    {courtKey: subKey}
```

position 字段 (递归 nd)·

```
{
  name, holder, rank, desc,
  headCount, actualCount,           // 编制 vs 实有
  functions[],                      // 职能 chip
  powers·{appointment,impeach,taxCollect,militaryCommand,supervise},
  publicTreasuryInit·{money,grain}, // 公库
  privateIncome·{illicitRisk:'high'|'low'},  // 陋规
  _history[]·任职链 {holder,...},
  _evaluations[]·考评 {grade},
  _pendingEdict·{turn,prevHolder,newHolder,deptName,posName},
  _materializedFlag, ...
}
```

holder character 字段·

```
{
  name, age, intelligence, administration, military, loyalty,
  party, faction, portrait,
  _tenure·{posKey: turns},
  _mourning, _sickLeave, _actingPos, _demoted, _retirePending,
  _concurrentWith
}
```

### 11 段架构·重新核对

```
1·   .og-title              主标
2·   §衙门总览 hdr           头按钮
3·   #office-alerts          预警条 (3 类)
4·   #office-summary         3 摘要卡
5·   §衙门层级 hdr           说明
6·   .og-tree-topbar         图例 4 品+2 状态
7·   filter-bar              all/empty/filled + 搜 + 列/树
8·   3 court tabs            外/内/外
9·   subtabs (5+4+4)         二级分类
10·  #office-tree-wrap       SVG 主区·zoom hint + zoom-ctrl
11·  canvas                  svg lines + group bgs + nodes
```

> ★ "11 段"·此前 progress memo 写的"11 段"实指 panel + tree 模块的视觉分块·此处复核·实际 11 个独立 visual block·**确认**·

### **mechanic 层** (audit layer 3)

```
官制 = 政治系统的核心拓扑·
  ↑ 编辑器 (editor.html)·定 P.officeTree (蓝图)
  ↓ runtime·GM.officeTree (现实)·随诏书改

任免 → _pendingEdict·当回合 [撤] / endturn 落地·入 _history
派系 % → _renderOfficeSummary 派系 bar·影响廷议联合体
实权 → 部门 power-ring + 反馈到 huangquan (实权 vs 皇权)
公库 → 部门私库·可被 [+库 -库] 政策动·非中央财政
陋规 → 影响财政流·hot 肥缺会有腐败风险事件
丁忧 → endturn 检 _mourning 倒计·到期 reset

兼任 / 权摄 / 致仕 / 贬谪 / 告病·
  全是 endturn endregisterSystems 处理·UI 仅 surface

廷推·rank<=6 自动·非任命·多人提名·撤销/票决在 chaoyi (御前 / 廷议) 路径
荐贤·rank>6·走 _offOpenPicker → 单 holder 任命

考评·_evaluations·三回考一·上甲/中乙/下丁
  影响·满意度·兼任建议·迁转优先级 (calcOfficialSatisfaction)
```

### **关键修正** (audit 中)

```
1· 11 段是 11 个 visual block (tree 内·非 panel 总段)·之前 memo 的 "11 段" 模糊
2· 6 部卿寺只是 .og-title 副标·**实际不止 6 部**·c-court 5 subtab 中 liucao 才是六部
3· **三朝**·central / inner / region·非"中央"单层·
4· OFFICE_SUBTABS = 5+4+4 = 13 子类 (不含 'all')·之前 memo "6 部卿寺" 是顶层副标的诗意名
5· 公库 + 主官·实权环·** 实权环 = 部门级 power ring**·非主官个人指标
6· 视图 list / tree·**默认 tree** (v10)·之前 default = list 已 migrate
```

---

## §3.13 gt-renwu·人物志 detail

源·`tm-hongyan-office.js` L2065-2083 (panel DOM)·`tm-renwu-ui.js` L57-179 (`renderRenwu`·~110 行)·L266-413 (`_rwRenderCard`)·L415-960+ (`viewRenwu`·~546 行 modal)·

### panel DOM 结构 (3 段 + 1 grid)

```
.rw-panel-wrap > .rw-inner
├─ .rw-title (印 "人物" + 主标 "人物志" + sub "英杰列传 臧否品评")
├─ #rw-statbar              ← 6 卡 (在朝群臣/文臣/武将/后宫/布衣/已殁)
├─ .rw-tools (披览栏)
│   ├─ [策名] btn → TM.ceming.openDialog (将历史人物纳入)
│   ├─ #rw-search input (姓名/字号/官职)·_rwSearch
│   ├─ #rw-faction select·全部派系 (动态填 GM.facs)·_rwFaction
│   ├─ #rw-role select·全部身份 / 文臣 / 武将 / 后宫 / 布衣 (5)·_rwRole
│   ├─ #rw-sort select·忠诚 / 智力 / 政务 / 军事 / 野心 (5)·_rwSort
│   └─ [□ 显已殁] checkbox·_rwShowDead
├─ #rw-legend            ← 派系 chip top 10 (动态)
└─ #rw-grid              ← 卡片网格 (按派系分组·>1 时)
```

### 6 statbar card (renderRenwu L102-110)

| key | label | 计数 | 颜色 |
|---|---|---|---|
| s-all | 在朝群臣 | 有 officialTitle/title 的 alive | gold |
| s-civil | 文臣 | military < admin·有官职 | celadon |
| s-mili | 武将 | military >= admin && military>=40 | vermillion |
| s-harem | 后宫 | spouse=true | rose |
| s-bu | 布衣 | 无官职无 spouse | ink |
| s-dead | 已殁 | alive===false | grey |

### 数据源·**两路并入** (重要)

```
_all = []
+= GM.chars (现役)
+= GM.allCharacters (全图谱·含已死/未仕者)
去重·_seenNames map (按 name)
默认 alive=true (若未 set)
```

### filter chain (4 stage)

```
1· _rwShowDead = false →  filter alive!==false
2· _rwSearch (kw)·       name + officialTitle/title + faction (lowercase contains)
3· _rwFaction !== 'all' → c.faction === val
4· _rwRole !== 'all'·
     civil·    admin > military && !spouse
     military· military >= admin && !spouse
     harem·    !!spouse
     none·     !officialTitle && !spouse
```

### sort 逻辑

```
top fixed·  alive>dead, isPlayer first
然后·      val(_rwSort) desc·loyalty / intelligence / administration / military / ambition
```

### 派系分组·**5 派 css class** (`_rwFacClass`)

| pattern | class | chip color |
|---|---|---|
| 东林 / 复社 | `rw-dongin` | celadon-400 |
| 浙 (浙党) | `rw-zhe` | indigo-400 |
| 宦/阉/内廷 | `rw-yan` | purple-400 |
| 昆/齐/楚 | `rw-kun` | amber-400 |
| 清流/正学 | `rw-qing` | gold-400 |
| 无/布衣 | `rw-bu` | ink-500 |
| spouse | `rw-consort` | rose |
| military>=60 | `rw-mili` | vermillion |

### 卡片字段 (_rwRenderCard·~150 行)

```
.rw-card[<facCls>]  onclick → viewRenwu(name) | openCharRenwuPage
├─ .rw-portrait-col
│   ├─ .rw-portrait·portrait img / 单字
│   └─ _rwLoyRing·SVG 圆环 (loy hi/mid/lo·>=70/40/<40)·中央 数值 + "忠"
├─ .rw-info-col
│   ├─ .rw-name-row· name · 字 · N岁
│   ├─ .rw-office-row· officialTitle / title / role / occupation / 后宫 / 布衣
│   │                  + _rwRankChip (rank-top/high/mid/low·5 档)
│   │                  + faction chip
│   ├─ .rw-states (可选)·6 chip 类
│   │   ├─ rw-loc·    位置 (away·非京城)·有 _travelTo 加 → 地名
│   │   ├─ mourn·     丁忧
│   │   ├─ retired·   致仕
│   │   ├─ stress·    重压 (stress>70)
│   │   ├─ away·      赴任
│   │   ├─ scheme·    密谋
│   │   ├─ new·       新晋 (joinTurn 5 回内)
│   │   └─ veteran·   老成 (age>=60)
│   ├─ .rw-stats·     6 属性条 (智 智 政 军 交 抱 压 + bar)
│   ├─ .rw-wuchang·   五常 dot (仁/义/礼/智/信·hi>=60/mid/lo/none)
│   ├─ .rw-rep·       名望 + 贤能 + 廉 (有则显)
│   ├─ .rw-traits·    特质 chip ≤4 (pos/neg/neu·按 effects sum)
│   ├─ .rw-rels·      关系 chip top 3 (friend/foe/spouse)
│   └─ .rw-actions·
│       ├─ [问对] → openWenduiPick (在京且非赴任·非死)
│       ├─ [传书] → GM._pendingLetterTo + switchGTab gt-letter
│       └─ [详情/遗事] (primary) → openCharRenwuPage / viewRenwu
```

### 6 属性条 (`_rwStatRow`)

```
智 zhi (intelligence)
政 zheng (administration)
军 jun (military)
交 jiao (diplomacy)
抱 ye (ambition)        ← '野' 写作 '抱' 字头·**实际是 ambition**
压 ya (stress)
```

> ★ 之前 memo 提"_rwSearch / _rwFaction / _rwRole / _rwSort / _rwShowDead"·**全部 verified**·5 个 filter state 全在·

### viewRenwu modal·~546 行 (重要 ★)

源·`tm-renwu-ui.js` L415-960+·**人物详情弹窗**·`closeGenericModal` 触发关·

```
1·  头部·                  名 + title (灰) + faction chip (右)
2·  快捷操作栏·              [问对] / [传书] / [官制] (alive 非 player)·依在京/赴任分支
3·  亡逝条·                 alive===false·"已故 + reason + (T_n)"·vermillion
4·  身份档案·12 字段 chip·   年龄/性别/籍贯/民族/信仰/文化/学识/立场/党派/语风/家族 + 家族档
5·  官制与仕途·              _offRenderCareerHTML(name)·11 段 (仕途/简历/任期等)
6·  双重身份·                公职 (官职 + faction + party) | 私人 (年/personality/personalGoal)
6.5· 玩家专属·              近日心绪·shijiHistory.playerInner top 3
7·  外貌·                    appearance·italic
8·  家族 + 家谱树 (3 代)·     父辈 → 自己+配偶+兄弟 → 子辈 (节点 click → viewRenwu 跳)
9·  文事作品·                _myWorks·写过的诗文 (link wenyuan)
10· 性格特质·                traits (按 TRAIT_LIBRARY 完整描述)
11· 人际关系·                _relationships 完整列表 (top N)
12· 经历·                    experiences[]
13· 生平·                    biography
14· 人生历练·                trials / lifeEvents
15· 此人记忆·                memory / _memories
16· 对他人印象·              _impressions·about 别人的看法
17· 后宫·                    spouse 则显·_rkDisplay (皇后/王后/妃/嫔/侍妾) + 母族 + 子女
18· 后宫 (leader 才显完整)·   GM.chars.spouse 全部·按 _rkOrder 排
19· 继承顺序·                GM.harem.heirs·N → 太子标识
20· 子嗣·                    非 leader 时·children 列表
21· 亲属·                    getBloodRelatives top 10·跳查
```

### viewRenwu 字段调用源 (重要)

```
getEffectiveAttr(ch, key)·  特质加成后的属性 (8 维·int/val/adm/mng/cha/dip/mil/ben)
findCharByName·             通用查找
getRankLevel·               1-99 数字档
RANK_HIERARCHY·             label table
TRAIT_LIBRARY·              特质效果 + 名
calculateWuchang·           计算五常 dim
FaceSystem.getFace·         面子值
EnYuanSystem.getTextForChar 恩怨摘要
getBloodRelatives·          血亲
getHaremRankIcon·           后宫 emoji
getHaremRankName·           后宫文字
getFamilyTierName·          门第 label (皇族/世家/士族/寒门)
_offRenderCareerHTML·       仕途段 (跨 office 系统注入)
```

### 操作流·**3 出口** (从人物志)

```
A· [问对] → 仅在京·非赴任·非已死·开 wendui (gt-wendui tab)
B· [传书] → 离京·开 letter (gt-letter tab)·_pendingLetterTo set
C· [详情] / [遗事] → openCharRenwuPage·若无 fallback viewRenwu modal
   modal 内·父子兄弟跳 → closeGenericModal + viewRenwu(name)
   modal 内·后宫成员跳 → 同上
```

### 右侧 panel·人物 (in `gr` 容器)

```
源·tm-hongyan-office.js L2107-2230+
.gr 内容·[人物 N人] hdr + chars 列表 (alive)
分页·  default 30·_showAllChars=true 时显全部
每行·  loy color · stress tag · mood icon · ambition tag (>75) · spouse tag
       · faction tag · stance/party tag · officeLine · ageTag · locTag
       · trait brief · goal brief · 恩怨 brief · 五常+气质 line · 面子 line
       · trait color tags
```

> 这是 §5 右 rail "人物" panel 的实现·此处提及是因为 renwu tab 与右 rail 是**并行入口**·非互斥·

### 持久化字段 (GM 级)

```
_rwSearch / _rwFaction / _rwRole / _rwSort / _rwShowDead·  filter state·non-GM (页面级)
GM.chars / GM.allCharacters·                               人物源
GM.facs·                                                   派系列表 (color + leader)
GM.harem·                                                  后宫 (heirs / pregnancies)
GM.families·                                               家族 (renown)
GM.shijiHistory·                                           近日心绪 (playerInner)
P.traitDefinitions / P.playerInfo·                         蓝图配置
```

### **mechanic 层** (audit layer 3)

```
人物志 = 人事系统的"主索引"·UI 仅是表层·
  写入·  人物在编辑器+蓝图定义·runtime 由 endturn 增删 (招募/死亡/弹劾/丁忧)
  读出·  各系统都引此·
        - office  ·任免选人池
        - chaoyi  ·廷议班次/御前候选
        - wendui  ·问对入选
        - letter  ·收信人列表
        - keju    ·新晋士子注入
        - jishi   ·人名高亮跳详情

特质 → effects 加成属性 → effective stats
五常 → calculateWuchang dim → 气质标签 → faction 倾向
面子 → FaceSystem → 弹劾/羞辱 事件触发
忠诚 → loyalty < 35 危险·影响 不轨 / 谋反 / 投敌 概率
野心 → ambition > 75 影响 篡权 / 自立 / 党争 概率
压力 → stress > 70 影响 病故 / 罢官 / 失德 概率
关系 → _relationships graph → 党争 / 联姻 / 推荐 触发
家族 → 门第 → 科举出身 / 联姻配额 / 声望传承
后宫 → spouseRank + heirs · 储位 / 立后 / 继承斗争
```

### **关键修正** (audit 中)

```
1· 6 statbar (非简单 grid)·分类·在朝/文/武/后宫/布衣/已殁
2· 数据源·_all = GM.chars + GM.allCharacters (合并去重)·包含未仕/已死
3· filter 是 4 阶链 + sort·**没有"星标/收藏"功能**
4· 5 派 css·dongin/zhe/yan/kun/qing·rw- prefix
5· **6 属性条**·"抱" 字头是 ambition (野心)·不是"抱负"另立
6· viewRenwu = ~546 行 modal·非简单卡片·**21 段** (头/操作/亡/档/仕/双重/外貌/家谱/作品/特质/关系/经历/生平/历练/记忆/印象/后宫/继承/子/亲)
7· 3 出口·问对 (在京) / 传书 (离京) / 详情 (落地 viewRenwu)
8· 与右 rail 人物 panel **并行**·两者数据源同·渲染方式不同
```

---

## §3.14 gt-difang·地方舆情 detail

源·`tm-hongyan-office.js` L2086-2105 (panel DOM·**conditional·仅 P.adminHierarchy 存在时**)·`tm-player-core.js` L620-1021 (`_renderDifangPanel`·~400 行)·L1035-1051 (`_dfEdict` / `_dfChangeGov`)·L1182-1280+ (`_dfNonDirectAction`·非直辖 modal)·`tm-feudal.js` L43-89 (`AUTONOMY_TYPES`)·

### conditional·panel 仅在 `P.adminHierarchy` 存在时挂

```
gt-difang·   不是默认 tab·条件加载·若剧本无行政区划数据·tab 完全不渲染
gt-tech / gt-civic 同此模式
```

### panel DOM 结构 (4 段)

```
.df-panel-wrap > .df-inner
├─ .df-title (印 "地方" + 主标 "地方舆情" + sub "一省一民情 按察抚民·安民为本")
├─ #df-statbar             ← 5 stat card
├─ .df-tools (按察栏)
│   ├─ #df-search input·_dfSearch (地名/官名/事由)
│   ├─ #df-sort select·名称/民变↑/腐败↑/人口↓/税收↓ (5)·_dfSort
│   ├─ [□ 仅危机] checkbox·_dfCrisis
│   └─ [详细区划] btn → openProvinceEconomy
├─ #df-legend             ← 5 chip 管辖类型
├─ #df-alerts (display:none)·条件显·top 3 危机
└─ #difang-grid           ← 省份卡网格 (可多列)
```

### 5 stat card

| key | label | 计数 | sub |
|---|---|---|---|
| s-all | 行政区划 | 全部顶级区划 | 各道·布政司·藩镇·羁縻 |
| s-zhi | 直辖 | autonomy.type==='zhixia' | 郡县制·流官管理 |
| s-fan | 藩镇 | type∈{fanzhen,fanguo} | 节度使·藩国 |
| s-ji | 羁縻·土司 | jimi 或 regionType==='tusi' | 因俗而治 |
| s-crisis | ⚠ 危机 | unrest>40 \|\| corruption>50 \|\| fugitives>4% | 民变高·腐败重·逃户多 |

> **注**·朝贡 (chaogong) 在 statbar **没有独立卡**·只在 legend 显·

### 5 legend chip (管辖类型 css class)

```
df-legend-chip zhi·  直辖   (zhixia·京畿直辖)
df-legend-chip fan·  藩镇   (fanzhen / fanguo)
df-legend-chip ji·   羁縻   (jimi)
df-legend-chip tu·   土司   (regionType=tusi·jimi 子集)
df-legend-chip shu·  朝贡   (chaogong·属国外藩)
```

### `AUTONOMY_TYPES` 5 类 (`tm-feudal.js` L43-47)

| key | name | label | desc |
|---|---|---|---|
| **zhixia** | 直辖 | 京畿直辖 | 郡县制·流官三年一迁·税入国库·政令直达 |
| **fanguo** | 藩国 | 分封藩国 | 宗室或功臣受封·实封/虚封之别·诏令须经藩王 |
| **fanzhen** | 藩镇 | 藩镇自治 | 军政合一·节度使自任官吏·自征赋税·朝廷册封但难节制 |
| **jimi** | 羁縻 | 羁縻土司 | 土司世袭·因俗而治·敕谕形式管辖·可行改土归流 |
| **chaogong** | 朝贡 | 朝贡外藩 | 属国外藩·仅礼制朝贡·政令不达其内·可遣使册封 |

子类 (subtype)·

```
fanguo_real·    实封藩国 (汉初诸王·明初塞王)·有真兵·真财·真政
fanguo_nominal· 虚封藩国 (明中后期·清宗室)·食禄不治事
```

### 数据派生 (核心·递归聚合)

```
ah = GM.adminHierarchy || P.adminHierarchy   (运行时优先·含推演更新)
↓
deriveAutonomy(d, fac, playerFac)            tm-feudal.js·按势力归属判 type
↓
applyAutonomyToAllDivisions()                启动派生

每个 div· _dfRecurseAggregate (从叶子聚合)·
  pop / households / ding / fugitives / hiddenCount
  minxin (人口加权) / corruption (人口加权)
  remit / actual / pubMoney / pubGrain / pubCloth / envLoad

回退·         GM.provinceStats[name] (旧 ps schema)
趋势·         GM._prevProvinceStats·prosperity/corruption/unrest 三箭
```

### filter chain (3 stage)

```
1· _dfSearch·   name + governor + faction (lowercase contains)
2· _dfCrisis·   unrest>40 || corruption>50
3· _dfSort·     name (default) / unrest↓ / corruption↓ / population↓ / tax↓
```

### **危机预警** (`#df-alerts`·top 3)

```
排序·     unrest * 1.5 + corruption (复合危险度)
filter·   unrest>40 || corruption>50
显·       前 3 个

icon·     乱 (unrest>60) / 腐 (corruption>60) / 警 (其他)
cause·    民变 N · 腐败 N · 逃户 N · 长官 X (有则显)
```

### 省份卡 (`.df-card[<typeCls>]`·11 段)

```
1·  顶部·       名 + 管辖 chip (直辖/藩镇/羁縻/土司/朝贡) + faction tag + 大人口 (N 万口)
2·  持爵者·     非直辖时·"实封藩王/土司/节度使" + 名 + 忠 N + 贡率 N%
3·  4 数据条·   民心 / 腐败 / 繁荣 / 叛乱·(各色 + 阈值 hi/mid/lo)
4·  环境条·     envLoad·>=85% hi / >=60% mid (loadbearing 用)
5·  户口细项·   户/口/丁 (常显) + 逃/隐 (>0 显·warn/danger)
6·  财政·       实收 + 上解 (直辖) / 贡赋 (非直辖·按 tributeRate)
7·  公库行·     州库·钱 N 两 / 粮 N 石 / 布 N 匹
8·  环境负担·   仅 envLoad>0 显
9·  危机说明·   isCrisis 时·民变危急/腐败泛滥/逃户浪潮/载重超限·亟须早筹处置
10· 事件 chips· ≤5·rebellion/calamity/drought/flood/plague/war/bumper
                自动检·unrest>70/envLoad>0.9·disasters[]·activeEvents[]·activeWars
11· 长官行·     portrait + 长官头衔 (巡抚/总兵官/宣慰使/长官) + name + loy chip
                + 操作按钮 2-3
```

### 长官头衔 (按 autonomyType 派生)

```
zhixia·    巡抚
fanzhen·   总兵官
jimi·      宣慰使
其他·      长官 (chaogong / fanguo)
```

### 操作按钮·**2 路** (按 isDirect 分支)

```
A· 直辖区 (3 btn)·
   [下旨]·_dfEdict → showPrompt → 入议事清册 (source='地方')
   [换官]·_dfChangeGov → 入议事清册 (content='更换 X 长官')
   [赈济]·crisis 时显·同 _dfEdict

B· 非直辖 (2 btn)·
   [传旨]·_dfEdict → 入议事清册
   [可行之策]·_dfNonDirectAction → modal·按 type 4 strategy
```

### 非直辖 modal·**4 策略 / type** (`_dfNonDirectAction`·重要)

**fanguo (藩国)**·"陛下若欲置喙·有数策可行"·

```
1· 行推恩令·    强制分封其子等·汉武故事·五代后藩权自消
2· 断然削藩·    剥夺藩王爵土·忠诚暴跌·恐引七国/靖难
3· 传旨规谏·    令藩王整治·看忠诚
4· 暖毋拜命·    赐物加封以恩拉拢
```

**jimi (羁縻土司)**·"朝廷例不置流官"·

```
1· 改土归流·    取消土司身份·置流官 (须叛乱或绝嗣·或强推)
2· 敦谕安抚·    赐封安抚使·维持属使关系
3· 调整贡额·    增减年贡额度
4· 准其承袭·    承认新任土司
```

**chaogong (朝贡外藩)**·"天朝不得直辖·唯有"·

```
1· 册封其君·    遣使册封国王/世子·强化宗藩关系
2· 勖令进贡·    勖令初贡或假道介入
3· 派遣使臣·    临时派使调解纠律或冲突
4· 兴师征讨·    征讨并置郡 (汉武灭南越故事·需年马压境)
```

**fanzhen (藩镇)**·"军政合一·朝廷难以节制"·

```
1· 宣谕入朝·    勖令节度使入朝见驾·交出兵权 (一般被阿连或反抗)
2· 阻其传袭·    阻止其子继承藩镇·易引自立
3· 兴师讨伐·    出兵讨伐·平定后改直辖
```

> 选定 → 落入议事清册·source='地方'·**实际诏书要走 gt-edict 颁发**·此处仅是建议生成·

### `openProvinceEconomy()`·详细区划 modal

源·`tm-endturn-province.js` L2213+·

```
点 [详细区划] btn → 全屏 modal
内容·    省级 economy detail (税收 / 公库 / 户口 / 财政流 / 历史)·
        非 panel 内嵌·独立 modal·便于展开
```

### 持久化字段

```
GM.adminHierarchy·       动态 (推演更新)·优先源
P.adminHierarchy·        蓝图 fallback
GM.provinceStats·        老 schema·部分字段回退
GM._prevProvinceStats·   趋势对比
GM.activeWars·           检测 location 是否有战
GM._edictSuggestions·    [下旨/换官/可行之策] 全部入此·source='地方'

_dfSearch / _dfSort / _dfCrisis·  filter state (页面级)
```

### 区划数据字段

```
division·{
  name, id,
  population: { mouths, households, ding, fugitives, hiddenCount },
  minxin, corruption, prosperity, unrest,
  fiscal: { remittedToCenter, actualRevenue },
  publicTreasury: { money:{stock}, grain:{stock}, cloth:{stock} },
  environment: { currentLoad },
  governor,                  // 长官名
  regionType: 'normal'|'tusi',
  autonomy: {                // 自治字段·关键
    type,                    // zhixia / fanguo / fanzhen / jimi / chaogong
    subtype,                 // real / nominal (fanguo)
    holder,                  // 持爵者·非直辖必有
    suzerain,                // 朝贡上国
    loyalty,
    tributeRate              // 贡率·0-1
  },
  disasters: [],
  activeEvents: [],
  yearOutput,                // 当年产出比·>1.2 显丰离
  children: []               // 递归子区划
}
```

### **mechanic 层** (audit layer 3)

```
地方系统 = 央地财政 + 行政区划 + 自治度 三联系统·
  ↑ editor·P.adminHierarchy·区划树 + autonomy 配置
  ↓ runtime·GM.adminHierarchy·随诏书/战乱/灾异/改土归流推演

5 自治度 → 不同 mechanic·
  zhixia·    全税入国库·官员任免·政令直达
  fanguo·    部分税收·诏令须藩王副署·实封者有兵
  fanzhen·   军政合一·上贡少·难调度
  jimi·      仅敕谕·世袭·改土归流是激进选项
  chaogong·  无政令·仅册封 + 朝贡

民心 → 推演 unrest → 民变事件 → 战事
腐败 → 推演 corruption → 火耗·官场风气
财政 → remittedToCenter → 中央财政·tax-atomic
公库 → 州库三元·钱粮布·灾年/战时调用
环境负担 → envLoad → 灾害概率 + 逃户

逃户 / 隐户 → 户籍崩坏指标·影响 ding 兵源 + 税基

事件 chips·  drought / flood / plague / rebellion / war / bumper
            ↑ 此处仅 surface·写入在 endturn-province / disaster 系统

操作 → _edictSuggestions·议事清册 source='地方'
       → 玩家 gt-edict 颁诏 → endturn 落地·非直改 GM
```

### **关键修正** (audit 中)

```
1· 这是 conditional tab·**仅 P.adminHierarchy 存在时挂**
2· **5 stat card** (非 4)·all/zhi/fan/ji+tu/crisis·朝贡无独立卡
3· **5 legend chip**·zhi/fan/ji/tu/shu·**土司 = jimi 的 regionType 子集**
4· **5 自治类型**·zhixia/fanguo/fanzhen/jimi/chaogong·非"4 类"
5· 非直辖 4 策略 / type·共 15 个具体动作·全部生成议事清册建议
6· 详细区划 = 独立 modal·非 panel 内嵌·走 openProvinceEconomy
7· 数据 4 数据条 (民心/腐败/繁荣/叛乱) + 1 envLoad·非 5 条
8· 数据源 优先 GM.adminHierarchy·_dfRecurseAggregate 从叶子聚合
9· 长官头衔 4 种 (巡抚/总兵官/宣慰使/长官)·非"督抚"单层
```

---

## §3.15 gt-wenyuan·文苑 detail

源·`tm-hongyan-office.js` L1980-1996 (panel DOM)·`tm-player-core.js` L352-362 (`_WENYUAN_GENRES` / `_WENYUAN_CATS`)·L391-534 (`renderWenyuan`)·L536-575 (`_showWorkDetail`)·L578-594 (`_workAction`)·

### panel DOM 结构 (3 段 + grid)

```
.wy-panel-wrap > .wy-inner
├─ .wy-title (印 "文苑" + 主标 "文苑·诗文总集" + sub "诗词歌赋 序跋记铭 经世风雅")
├─ #wy-statbar              ← 6 卡 (总录/传世/查禁/政险/本朝/文魁)
├─ .wy-tools (披览栏)
│   ├─ #wy-search input·title/author/content/trigger/location 全文搜
│   ├─ #wy-cat-filter·     8 触发类 (career/adversity/social/duty/travel/private/times/mood)
│   ├─ #wy-genre-filter·   10 文体 (shi/ci/fu/qu/ge/wen/apply/ji/ritual/paratext)
│   ├─ #wy-sort·           近作 / 品评 / 作者 / 年代 (4)
│   ├─ [□ 仅传世] checkbox
│   └─ [□ 隐查禁] checkbox
├─ #wy-legend             ← 触发类 chip 动态
└─ #wenyuan-list (.wy-grid) ← 卡片网格
```

### 6 statbar card

| key | label | 计数 |
|---|---|---|
| s-all | 总录 | works.length |
| s-preserve | 传世 | isPreserved |
| s-forbid | 查禁 | isForbidden |
| s-risk | 政险 | politicalRisk∈{high,medium} |
| s-era | 本朝 | turn >= curTurn-8 (近 8 回内) |
| s-author | 文魁 | unique authors count |

### 8 触发类·`_WENYUAN_CATS`

| key | label | color | 注 |
|---|---|---|---|
| career | 科举宦途 | #3498db | 取仕 / 春试 |
| adversity | 逆境贬谪 | #c0392b | 黄州 / 永州 |
| social | 社交酬酢 | #e67e22 | 寄赠 / 唱和 |
| duty | 任上施政 | #9b59b6 | 政务感发 |
| travel | 游历山水 | #16a085 | 山水 / 行旅 |
| private | 家事私情 | #e91e63 | 怀人 / 悼亡 |
| times | 时局天下 | #f39c12 | 议事 / 兴亡 |
| mood | 情感心境 | #607d8b | 闺怨 / 隐居 |

### 10 文体·`_WENYUAN_GENRES`

```
shi 诗 / ci 词 / fu 赋 / qu 曲 / ge 歌行
wen 散文 / apply 应用文 / ji 记叙 / ritual 祭碑 / paratext 序跋
```

excerpt class 三档 (`_excerptCls`)·

```
韵文 (shi/ci/qu/ge)· wy-excerpt elegant
辞赋 (fu)·            wy-excerpt fu
散文 (wen/ji/ritual/paratext)· wy-excerpt wen
```

### filter chain (5 stage)

```
1· catFil !== 'all'·    triggerCategory match
2· genFil !== 'all'·    genre match
3· preservedOnly·        isPreserved
4· hideForbidden·        !isForbidden
5· kw search·            author + title + content + trigger + location

sort·   recent (turn↓) | quality | author (locale) | date
```

### 卡片字段 (`.wy-card[<catCls>][.preserved][.forbidden]`)

```
左·  .wy-tab-col (题签卷轴)
     ├─ wy-tab-author·     作者首字 (≤3)
     ├─ wy-tab-date·       date.slice(0,10) 或 T<turn>
     └─ wy-tab-seal·       "印" (传世)
右·  .wy-main-col
     ├─ .wy-hdr-row·       标题 + 文体 chip + subtype
     ├─ .wy-meta-row·      触发 chip + 地点 + 情绪
     ├─ .wy-excerpt[.elegant|.fu|.wen]·  节选前 4 行 / 160 字
     ├─ .wy-assess·
     │   ├─ wy-quality·    5 星 (q/20 ≈ stars) + 数值
     │   ├─ wy-risk·       政险 高/中/低 chip (low / medium / high)
     │   └─ wy-tag·        题材 + motivation (11 种 mapped)
     ├─ .wy-ctx·           narrativeContext·创作背景
     ├─ .wy-implicit·      politicalImplication·政治暗讽
     └─ .wy-actions·6 btn·
         ├─ [赏析]   appreciate
         ├─ [题序]   inscribe
         ├─ [追和]   echo
         ├─ [传抄]   circulate (非禁)
         ├─ [查禁/解禁] ban / unban (按 isForbidden 切)
         └─ [详情]   primary → _showWorkDetail
```

### 11 motivation 映射 (`_motMap`)

```
commissioned·受命   flattery·干谒    response·酬答    mourning·哀悼
critique·讽谏       celebration·颂扬  farewell·送别    memorial·纪念
ghostwrite·代笔    duty·应制         self_express·自抒
```

### `_showWorkDetail(idx)` modal

```
- 全屏 modal·max-width 620 / max-height 90vh
- 标题 + 作者 · date · 于 location
- 全文 (font-serif·line-height 2.0·gold-500 left border)
- 创作背景 (narrativeContext·按 cat.color)
- 元数据 grid 2x·触发/文体/情绪/题材/动机/雅俗/质量/风险
- isPreserved → ★ 传世
- isForbidden → ⚠ 已查禁
- politicalImplication → 政治暗讽 banner
- dedicatedTo·赠 X·Y
- 6 btn·赐阅赏析 / 御题赐序 / 追和 / 传抄 / 查禁 (非禁) / 关闭
```

### `_workAction(idx, action)`·**6 操作 → 议事清册**

```
appreciate· 赐阅 X《Y》·表嘉赏之意
inscribe·   御题 X《Y》·亲笔题跋或作序·准其刊行
echo·       命 X 或朝中文臣追和《Y》·再作一篇次韵酬答
circulate·  将 X《Y》传抄行世·刻本广布
ban·        查禁 X《Y》·不宜流布·若有 politicalImplication 加原因
unban·      解禁 X《Y》·准其重新流布

→ GM._edictSuggestions.push({source:'文事', from:author, content, turn, used:false})
```

### 持久化字段

```
GM.culturalWorks·          作品池·全部 work {title,author,content,...}
GM._edictSuggestions·      [赏析/题序/追和/传抄/查禁/解禁] 全部入此·source='文事'

work·{
  title, author, content, date, turn,
  triggerCategory,        // 8 cat·career...mood
  genre,                  // 10 genre·shi...paratext
  subtype,                // 子文体 (七律/小令/碑...)
  trigger,                // 具体触发事件 (科举宦途·登第·会试等)
  location, mood, theme,
  motivation,             // spontaneous + 11 种
  elegance,               // 雅 / 俗 / 中
  quality,                // 0-100
  politicalRisk,          // low / medium / high
  isPreserved,            // 传世名作
  isForbidden,            // 查禁
  narrativeContext,       // 创作背景
  politicalImplication,   // 政治暗讽
  dedicatedTo: []
}
```

### **mechanic 层** (audit layer 3)

```
文苑 = 文化生产 + 文化政治 双系统·
  写入·   endturn · NPC 触发 (科举/贬谪/送别等场景生成)
          玩家 · _workAction → 通过议事清册间接干预
  
  传世·   isPreserved=true 影响 dynastyTheme · 文化声望
  查禁·   isForbidden·影响 author 名望 / face / 朝野舆论
  政险·   politicalImplication 触发 弹劾事件 / 文字狱
  品评·   quality 影响 author xianneng (贤能) + family renown

8 cat × 10 genre 组合 → 80 子类·覆盖·
  科举宦途×诗·     金榜诗 / 落第诗
  逆境贬谪×词·     谪居词
  时局天下×赋·     哀亡赋 / 议政赋
  社交酬酢×应用文· 寄赠书 / 答谢札
  ...

文苑 ↔ 人物志·   work.author = char.name → 在人物志卡上显文事作品
文苑 ↔ 杂记·     创作触发 → jishi (家事私情 / 时局天下)
文苑 ↔ 史记·     传世作 / 查禁案 → turn-modal 11 板块·人物条目
文苑 ↔ 议事清册·  [赏析/查禁] 6 操作 → gt-edict 颁诏
```

### **关键修正** (audit 中)

```
1· 8 触发 cat (career/adversity/social/duty/travel/private/times/mood)
2· 10 文体 (shi/ci/fu/qu/ge/wen/apply/ji/ritual/paratext)
3· 4 sort (recent/quality/author/date)
4· **6 statbar** (总录/传世/查禁/政险/本朝/文魁)·之前 memo 漏 stat
5· **6 操作 → 议事清册**·非直改·全部走诏书 source='文事'
6· 11 motivation·非"动机"单一字段·完整 mapped
7· 卡片 excerpt 三 css 档·韵文/辞赋/散文 不同字体处理
```

---

## §3.16 gt-keju·科举 detail

源·`tm-hongyan-office.js` L1650 (tab def·**特殊·action='openKejuPanel'**)·`tm-keju.js` L108-202 (`openKejuPanel`)·`tm-keju-runtime.js` L218-292 (`startKejuExam`)·L297-347 (`showKejuModal` + `renderKejuStage`)·L354-376 (`advanceKejuByDays`)·L1551+ (`openKeyiSession`)·

### **★ 特殊·这不是常规 tab**

```
tab def·  {id:'gt-keju', label:'科举', icon:'scroll', group:'文考', action:'openKejuPanel'}
              ↑ 唯一带 action 字段的 tab

button onclick·  window['openKejuPanel']()   (调 modal)
没有·            gt-keju panel DOM·没有 switchGTab(panelId='gt-keju')

行为·  click [科举] tab → 不切 panel·直接弹 modal (类似 gt-chaoyi)
       但 visually·active class 只 lock 在当前实际 panel·**[科举] btn 不亮**
       (因 switchGTab 没被调用)
```

> **注**·此模式与 gt-chaoyi 同·"伪 tab"·按钮触发 modal 而非 tab 切换·

### `openKejuPanel()` modal·制度概况

源·`tm-keju.js` L108-202·

#### 状态 A·`P.keju.enabled === true` + `P.keju.currentExam` 存在

```
直接转调 → showKejuModal()·进入考试流程 modal·跳过制度面板
```

#### 状态 B·`P.keju.enabled === true` 无在考

```
"📜 科举制度" modal·max-width 700 / max-height 80vh·
├─ 制度概况
│   ✅ 科举制度已启用
│   考试间隔·examIntervalNote (本朝三年一科)
│   考试科目·examSubjects (进士科 / 明经科...)
│   每科取士·quotaPerExam 人进入殿试
│   特殊规则·specialRules (糊名 / 誊录 / ...)
│   上次科举·lastExamDate.year + month
│   ↓
│   GM.keju.preparingExam·"🔄 正在筹办科举考试" (条件显)
│   "筹办进展将在史记正文中展示·请耐心等待"
├─ 历史记录·history.slice(-5).reverse()
│   每条·年月 / 录取 N 人 / 质量 / 状元 / 榜眼 / 探花
└─ 操作·
    │ [📋 提议筹办科举] btn → proposeKejuPreparation() → openKeyiSession()
    │ (筹办中时·disabled "正在筹办中..."·提示等待)
```

#### 状态 C·`P.keju.enabled === false` (科举未启用)

```
"❌ 科举制度未启用"·
├─ 当前朝代尚未实行科举制度 / 因特殊原因未启用
├─ isPreKeju (era 在隋之前)·
│   ⚠️ 选官制度改革 banner
│   "改革为科举制度将遭遇世家大族的强烈反对·可能引发政治动荡"
│   [🔄 发起科举改革] btn → startKejuReform()
└─ 否则·
    [📜 请求启用科举] btn → requestEnableKeju()
```

### `isKejuEra(era)`·朝代判定

```
keju 朝代·['隋', '唐', '五代', '宋', '辽', '金', '元', '明', '清']
era contains 任一 → true
```

### 默认 5/3/3 层 `_getDefaultTiers(era)`

| 朝代 | tiers |
|---|---|
| **明清** | 县试 / 府试 / 院试 / 乡试 / 会试 / 殿试 (6) |
| **唐宋辽金元** | 解试 / 省试 / 殿试 (3) |
| **其他** | 初试 / 会试 / 殿试 (3) |

> ★ 之前 memo 写"5 stage"·实际**默认明清 6 stage**·唐宋 3 stage·"5 stage" 不准·

### v5 实考阶段 (8 phase·按天推进)

源·`startKejuExam` L218-292·`P.keju.stageDurationDays`·

| stage | 默认天数 | 性质 |
|---|---|---|
| **proposal** | 30 | 朝议筹办 1 月 |
| **preliminary_local** | 60 | 童/府/院试 2 月 |
| **preliminary_provincial** | 90 | 乡试 3 月 (秋闱) |
| **examiner_select** | 30 | 选考官 1 月·**玩家决策** |
| **huishi_draft** | 30 | 主考官拟题 1 月·**玩家审阅** |
| **huishi** | 60 | 会试 2 月 |
| **dianshi_draft** | 15 | 殿试拟题 半月·**玩家拟题** |
| **dianshi** | 30 | 殿试阅卷+钦定 1 月·**玩家钦定三甲** |
| finished | 0 | 完结 |

合计·~315 天 ≈ 10-11 回合 (daysPerTurn=30)·

### 9 档属性加成 (`P.keju.attributeBonus`)

| 档 | name | fame+ | virtue+ |
|---|---|---|---|
| tongsheng | 童生·县试通过 | 1 | 0 |
| xiucai | 秀才·院试通过 | 5 | 3 |
| juren | 举人·乡试通过 | 10 | 6 |
| gongshi | 贡士·会试通过 | 18 | 12 |
| zhuangyuan | 状元 | 35 | 18 |
| bangyan | 榜眼 | 28 | 14 |
| tanhua | 探花 | 22 | 12 |
| erjia | 二甲进士 (4-20) | 15 | 8 |
| sanjia | 三甲同进士 (21+) | 10 | 5 |

### 经费 (`P.keju.costs`)

```
local·       perCounty 80 / perPrefecture 250 / perProvinceExam 500
provincial·  perProvince 1000
examiner·    500
huishi·      10000
dianshi·     4000
enkeMultiplier·  1.3 (恩科加成)
```

### **3 路径启动** (`startKejuByMethod`)·**重要 mechanic**

```
A· council· 朝议通过 → 无惩罚
B· edict·   下诏强推 → 皇威-10 / 皇权-5 / 反对大臣 AffinityMap-8
C· defy·    逆众议强推 → 皇威-20 / 皇权-10 / 民心-5 / 反对党派-8 / AffinityMap-15

礼部尚书态度·
  loy + affinity >= 110 → 'support'·惩罚×0.5
  loy + affinity <=  70 → 'oppose'·惩罚×1.5
  其他·null·无修正
```

> 此 3 路径在 council session 后·user 选定后才进 `startKejuExam`·

### 玩家互动阶段 (4 处)

```
1· proposal → openKeyiSession()·〔科议〕专属朝议
2· examiner_select → 选考官 modal (renderExaminerSelectStage)
3· huishi_draft → 审阅主考官拟的多题 (renderHuishiDraftStage)
4· dianshi_draft → 玩家亲拟殿试题 + 选 dianshiDelegate (代主)
5· dianshi → 玩家钦定三甲 (renderDianshiStage)
```

> 其余阶段·按天自动推进·`advanceKejuByDays(daysPassed)` 在 endturn 调·达 stageDurationDays 切下一阶段·

### exam 状态机字段 (`startKejuExam` 创建)

```
{
  id, type: 'zhengke' | 'enke',
  startTurn, startDate,
  tiers, stage, stageStartTurn, stageElapsedDays,
  launchMethod, libuSupport,
  
  // 选拔统计
  preliminaryStats, preliminaryProvincialStats,
  
  // 考官·v5
  chiefExaminer, examinerParty, examinerStance, examinerIntelligence,
  chiefExaminerMemorial,    // 题本{candidates:[],reasoning,styleHint}
  subExaminers: [],
  
  // 会试
  huishiTopic, huishiTopicCandidates: [], huishiPassed: [], huishiCandidates: [],
  
  // 殿试
  playerQuestion, dianshiDelegate, dianshiCandidates: [], dianshiResults: [],
  examinerSuggestions: {},  // {考官名: [考生名排序, 理由]}
  finalRanking,             // 玩家钦定三甲
  
  // 经费
  costsPaid: { local, provincial, central },
  costShortfall,
  
  // 进士池
  gradPool: [],             // {name,age,origin,class,party,score,rank,allocatedOffice,_crystallized}
  historicalHits: [],       // 本场命中的历史名臣
  
  statistics, examOfficials
}
```

### 持久化字段

```
P.keju·                     蓝图配置
  enabled, examIntervalNote, examSubjects, quotaPerExam, specialRules
  alternativeSystem (非科举朝)
  tiers, stageDurationDays, costs, attributeBonus
  historicalFigurePolicy, _historicalFiguresUsed
  history: []              历史科举记录
  currentExam              当前正科
  currentEnke              当前恩科
  lastExamDate

GM.keju·
  preparingExam            筹办标志
  _pendingProposal         朝议提议待解
```

### `openKeyiSession()`·〔科议〕专属朝议

```
v5 起·proposeKejuPreparation 不再直接 startKejuExam·
而是 openKeyiSession() → 朝议 modal·
  ├─ 玩家选 launchMethod (council / edict / defy)
  ├─ 礼部尚书态度自动检 (support / oppose / null)
  └─ resolveKejuCouncilResult → startKejuByMethod
```

### **mechanic 层** (audit layer 3)

```
科举系统 = 选官 + 政治 + 文化 三联·
  ↑ editor·P.keju 蓝图 (era / tiers / costs / attributeBonus)
  ↓ runtime·P.keju.currentExam·按天推进 (advanceKejuByDays)

新进士 → GM.allCharacters 注入 (gradPool 具象化)
        → 新晋 chip 在 renwu 卡显
        → faction = 同籍 / 同年 自动联结
属性加成·   fame + virtue → renown / xianneng → 影响 office picker
launch 路径· 影响 huangwei / huangquan / minxin / partyInfluence
礼部尚书·   态度修正惩罚·政治依赖核心
经费缺口·   costShortfall → 影响 quality + 名望·钱粮系统联动
历史名臣·   gradPool 命中真实历史人物 (仿明清史·受 scenario 控)
玩家拟题·   殿试题 + 钦定三甲 → 影响 author 后续仕途 + 文苑作品
朝议路径·   council/edict/defy → 党争记忆·朝野反响

筹办过程·  100% AI 推演·进展在 jishi / 史记中显·
            非玩家直接控·只有 4 关键节点 user input
```

### **关键修正** (audit 中)

```
1· **gt-keju 是伪 tab**·action='openKejuPanel'·click 弹 modal·非切 panel
2· **8 phase** (proposal/preliminary_local/preliminary_provincial/examiner_select/
   huishi_draft/huishi/dianshi_draft/dianshi)·非"5 stage"
3· 默认 6 tiers (明清) / 3 tiers (唐宋)·非"5 stage 进程"
4· 9 档属性加成·童生→状元·非简单"中举"二态
5· 3 launch 路径·council/edict/defy·**附礼部尚书惩罚修正系数**
6· 玩家互动 4 处·选考官 / 审会试题 / 拟殿试题 / 钦定三甲
7· enke (恩科) + zhengke (正科) **并行·两 currentExam 槽**·costMultiplier 1.3
8· openKeyiSession 是 v5 新流程·替代直接 startKejuExam
9· gradPool 历史名臣命中·跨场去重池·_historicalFiguresUsed
```

---

## §3.17 抽屉 (drawer) 通用机制·左右共用 (深读)

源·`index.html` L154-208 (DOM·#G grid 52/1fr/52 + 2 rail + 2 drawer + drawer-hdr/body)·L297-340 (`openSideDrawer`/`closeSideDrawer` + 键盘 + 外部点击)·`styles.css` L997 (#G grid)·L1004-1052 (.gs-rail / .gs-drawer / .gs-drawer-hdr/body / 隐藏 base render)·`tm-namespaces.js` L647-651 (`TM.UI.shell`)·`tm-sidebar-ui.js` L353-697 (`renderSidePanels`·base + shell extras 双轨 → CSS 隐藏 base)·

### 整体布局·`#G` grid (3 列)

```
源·styles.css L997·

#G {
  display: none;                       ← default 隐藏·游戏启动后 = grid
  grid-template-columns: 52px 1fr 52px;  ← 3 栏·rail 永远 52px
  margin-top: 62px;                    ← 让出顶栏 #bar
  height: calc(100vh - 62px);
  position: relative;                  ← drawer absolute 定位的锚
}

布局·

┌──────────────────────────────────────────────────┐
│  顶栏 #bar  (62px)                                │
├────┬───────────────────────────────────────┬─────┤
│ 52 │                                       │ 52  │
│ rl │  .gc 中栏 (15 tab)                     │ rr  │
│ ai │                                       │ ai  │
│ l  │                                       │ l   │
│    │                                       │     │
└────┴───────────────────────────────────────┴─────┘
   ↑                                              ↑
   .gs-rail-left  (永远 52px·12 按钮)          .gs-rail-right (永远 52px·9 按钮)

         ↓ click rail btn
┌────┬─ .gs-drawer.left ──────────┬─ .gc ─────────────┬─.rr─┐
│ rl │ overlay·340px·z=30·       │ 中栏被压·layered   │ rr  │
│ ai │ left:52px (覆 .gc 左缘)    │ underneath        │ ai  │
│ l  │                             │                   │ l   │
└────┴────────────────────────────┴───────────────────┴─────┘
```

### 4 元素 DOM 结构 (source `index.html` L154-208)

```html
<div id="G">                                     ← grid 3 列·default hidden
  <aside class="gs-rail-left">                   ← col 1·52px
    <div class="gs-rail">
      <button class="gs-rail-btn c-fac" ...>势</button>   ← 12 button (左) / 9 (右)
      ...
    </div>
  </aside>

  <div class="gc" id="gc"></div>                  ← col 2·1fr·中栏 15 tab

  <aside class="gs-rail-right">                  ← col 3·52px
    <div class="gs-rail">
      <button class="gs-rail-btn c-self" ...>朕</button>
      ...
    </div>
  </aside>

  <!-- drawer overlay·absolute 定位·z=30 -->
  <div class="gs-drawer left" id="drawerLeft">
    <div class="gs-drawer-hdr">
      <div class="gs-drawer-title">朝 野 内 情</div>   ← 左 drawer title
      <button class="gs-drawer-close">×</button>
    </div>
    <div class="gs-drawer-body">
      <div class="gl" id="gl"></div>                 ← panel 注入容器
    </div>
  </div>

  <div class="gs-drawer right" id="drawerRight">
    <div class="gs-drawer-hdr">
      <div class="gs-drawer-title">朕 之 案 上</div>   ← 右 drawer title
      <button class="gs-drawer-close">×</button>
    </div>
    <div class="gs-drawer-body">
      <div class="gr" id="gr"></div>                 ← panel 注入容器
    </div>
  </div>
</div>
```

### CSS·`.gs-drawer` overlay 完整属性 (源 styles.css L1033-1046)

```
.gs-drawer {
  position: absolute;                   ← 相对 #G 定位·overlay 中栏
  top: 0; bottom: 0;
  width: 340px;                         ← 默认 340px (左)
  height: 100%;
  background: var(--bg-2, #1a1510);
  z-index: 30;                          ← 高于 rail (z=20)·低于 modal
  border-right: 1px solid rgba(184,154,83,0.35);
  display: flex; flex-direction: column;
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);    ← 缓动滑入
  box-shadow: 6px 0 24px rgba(0,0,0,0.5);                      ← 右侧阴影
  transform: translateX(-110%);         ← 默认推到屏幕外左 110%
  overflow: hidden;
}

.gs-drawer.right {                      ← 右版差异
  right: 52px; left: auto;              ← 紧贴右 rail 内侧
  border-right: none;
  border-left: 1px solid rgba(184,154,83,0.35);
  box-shadow: -6px 0 24px rgba(0,0,0,0.5);
  transform: translateX(110%);          ← 推到右 110%
  width: 360px;                         ← ★ 右版 360px·非 340·**比左多 20px**
}

.gs-drawer.left {
  left: 52px;                           ← 紧贴左 rail 内侧
  width: 340px;
}

.gs-drawer.open {
  transform: translateX(0);             ← .open 触发滑入动画
}
```

### 左 vs 右·**关键差异**

| 项 | 左 drawer | 右 drawer |
|---|---|---|
| id | drawerLeft | drawerRight |
| class | gs-drawer.left | gs-drawer.right |
| 位置 | left: 52px | right: 52px |
| 宽度 | **340px** | **360px** ★ 多 20px |
| 滑出方向 | left → translateX(-110% → 0) | right → translateX(110% → 0) |
| border | border-right | border-left |
| shadow | 右投 6px | 左投 -6px |
| 容器 id | #gl | #gr |
| title | 朝 野 内 情 | 朕 之 案 上 |
| 内部容器 | .gl (12 panel + 9 隐 panel) | .gr (~13 panel) |
| 渲染函数 | `_renderShellExtrasLeft(gl_real)` | `_renderShellExtrasRight()` (无参) |

### header (`gs-drawer-hdr`·源 L1037-1041)

```
.gs-drawer-hdr {
  padding: 10px 12px;
  background: linear-gradient(to bottom, var(--bg-paper), var(--bg-2));
  border-bottom: 1px solid var(--color-border-subtle);
  flex-shrink: 0;                       ← 固定不缩
}

.gs-drawer-title {
  font-family: STKaiti·KaiTi·楷体, serif;
  font-size: 13px;
  color: var(--gold-300);
  letter-spacing: 0.25em;               ← 字间距大·"朝 野 内 情" 显
  font-weight: 500;
}

.gs-drawer-title::before {
  content: "◆ ";                        ← 钻石符
  color: var(--gold-d);
}

.gs-drawer-close {                       ← ✕ 按钮
  width: 22px; height: 22px;
  border: 1px solid var(--color-border-subtle);
  color: #d4c9b0;
  border-radius: 3px;
}
.gs-drawer-close:hover {
  color: var(--vermillion-400);          ← hover 朱红
  border-color: var(--vermillion-400);
}
```

### body (`gs-drawer-body`·重要 CSS 隐藏规则·源 L1042-1052)

```
.gs-drawer-body {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;                     ← 滚动条 (panel 多·必滚)
  overflow-x: hidden;
  padding: 10px 10px 40px;
  display: flex; flex-direction: column;
  gap: 12px;
  scrollbar-width: thin;                ← FF 细滚条
  scrollbar-color: var(--gold-d) rgba(26,20,16,0.5);
}

.gs-drawer-body::-webkit-scrollbar       自定义 webkit 滚条
.gs-drawer-body::-webkit-scrollbar-track 暗底
.gs-drawer-body::-webkit-scrollbar-thumb 金边渐变
.gs-drawer-body::-webkit-scrollbar-thumb:hover  hover 高亮

.gs-drawer-body .gl,
.gs-drawer-body .gr {
  display: flex; flex-direction: column;
  gap: 8px;
}

★ 关键 3 条规则·shell mode 隐藏 base render·

.gs-drawer-body #side-panels-ext {                            ← 隐 base panel 容器
  display: none;
}
.gs-drawer-body .gl > *:not(.gs-panel):not(.gs-self-card):not(.gs-energy) {  ← 左·只白名单 3 类
  display: none;
}
.gs-drawer-body .gr > *:not(#_shell_extras_right) {           ← 右·只白名单 1 容器
  display: none;
}
```

> ★ **CSS hides base panel·shell-extras 才显**·这是 phase 5 之后的 shell mode·避免 base render 与 shell-extras 重叠·**user 只看 shell extras**·

### `renderSidePanels()` 双轨架构 (重要)

源·`tm-sidebar-ui.js` L353-697·

```
renderSidePanels()                      ← 单一入口·每回合 endturn 调
  ├─ 创建 _wrap = <div id="side-panels-ext">
  ├─ 走完整 base render (15 panel·~340 行)·全部 append 到 _wrap·非 #gl
  ├─ _renderShellExtrasLeft(gl_real)    ← 真 shell extras 注入 #gl 容器 (21 panel)
  ├─ gl_real.appendChild(_wrap)          ← _wrap 也挂到 #gl·但 CSS 隐
  └─ _renderShellExtrasRight()           ← 右 shell extras 注入 #gr (~13 panel)

DOM 结果·
#gl
├─ <gs-panel data-panel-key="dyn">      ← shell extras·visible
├─ <gs-panel data-panel-key="weather">
├─ ... (21 panel·全可见)
└─ <div id="side-panels-ext">           ← base render·CSS 隐藏
     ├─ 势力一览 base panel
     ├─ 党派 base panel
     ├─ ... (15 base panel)
     └─ ...

#gr
└─ <div id="_shell_extras_right">       ← shell extras·visible
    ├─ self / time / char / ... (~13 panel)
```

> base panel 仍然渲染·但 CSS 完全隐藏·**冗余渲染开销**·phase 5 遗留·之前 audit 说 "9 left orphan + 4 right orphan" 的"orphan" 概念实际指·`shell extras` 内的 9/4 没 rail btn (只 scroll 见) 的 panel·与 base render 无关·

### `openSideDrawer(side, key)` 完整代码 (源 index.html L301-316)

```js
window.openSideDrawer = function(side, key){
  var id = (side === 'right' ? 'drawerRight' : 'drawerLeft');
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');             ← 触发 CSS 滑入动画 0.35s
  if (key){                             ← key = 'fac' / 'party' / 'self' / ...
    setTimeout(function(){              ← 360ms·等动画完
      try {
        var body = el.querySelector('.gs-drawer-body');
        var target = body && body.querySelector('[data-panel-key="'+key+'"]');
        if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
      } catch(e){}
    }, 360);
  }
};
```

> ★ **rail btn 不是 panel switcher·是 anchor scrollIntoView**·所有 panel 始终全部贯穿渲染·rail btn 只是滑滚定位·

### `closeSideDrawer(side)` 完整代码

```js
window.closeSideDrawer = function(side){
  var id = (side === 'right' ? 'drawerRight' : 'drawerLeft');
  var el = document.getElementById(id);
  if (el) el.classList.remove('open');  ← 反转 transform·滑出
};
```

### **4 关闭路径** (重要)

源·`index.html` L322-339·

```
1·  ✕ 按钮·               .gs-drawer-close click → closeSideDrawer(side)

2·  ESC 键·                document keydown
                           if e.key === 'Escape' → 两 drawer 全 remove .open
                           **但** 焦点在 INPUT/TEXTAREA/SELECT 时不拦截 (避免干扰输入)

3·  [ 键·                  toggle drawerLeft  (.classList.toggle('open'))
    ] 键·                  toggle drawerRight
                           同样不在 INPUT/TEXTAREA/SELECT 焦点时拦截
                           **toggle = 开则关·关则开**·非单向

4·  外部点击·              document mousedown (capture phase·`true` 参)
                           if 任一 drawer .open && 点击非 .gs-drawer / .gs-rail-left / .gs-rail-right
                           → 两 drawer 全关
                           注·点击 rail 不会关 (因 rail click 触发新 open)
                                点击 drawer 内不会关 (允许操作 panel)
```

### 键盘事件·非阻塞 (重要)

```
['(' / ')'] = 1 输入流处理·

document.addEventListener('keydown', function(e){
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;  ← 焦点保护
  ...
});

→ 焦点在 input 时·[ ] / ESC 不拦截·正常输入
→ 焦点在 button / 全局时·[ ] / ESC 触发 drawer toggle
```

### z-index 分层 (drawer 在中)

```
z-index 顺序·
  rail (rail-left/right)·          z=20
  drawer (gs-drawer overlay)·      z=30           ← 比 rail 高·覆盖中栏
  topbar #bar·                     默认堆叠 (高于 z=30 的 drawer 内 default)
  bar 内变量 tip·                  z 通常较低
  shizheng / status-bar·           z=55
  gs-turn-float·                   z=60
  shiji / save 浮按钮·              z=998
  pause / settings / 议题 modal·    z=1100~9998
  shizheng-task-detail·            z=9999

drawer 关键·    z=30·**只盖中栏**·不盖顶栏·不盖浮按钮
                rail (z=20) 在 drawer 之下·但 drawer left:52px·rail 永远露出
                所以·rail 仍然可见·click 仍可换 drawer (anchor scroll)
```

### `TM.UI.shell` namespace (重要 phase 6 inline migration)

源·`tm-namespaces.js` L647-651·

```js
TM.UI.shell = _buildWindowRefGroup('UI.shell', {
  openSideDrawer: 'openSideDrawer',     ← window.openSideDrawer 包装
  closeSideDrawer: 'closeSideDrawer',   ← window.closeSideDrawer 包装
  renderLeft: '_renderShellExtrasLeft',
  renderRight: '_renderShellExtrasRight'
});

→ HTML inline onclick 用 TM.UI.shell.openSideDrawer('left','fac')
→ 内部仍调 window.openSideDrawer
→ 双向兼容·phase 6 namespace migration 留下·
```

### .gs-rail-btn 12 色 css 变量 (`--m-c`)

源·styles.css L1011-1030·

```
左 rail (12)·
  c-fac     indigo-400      c-party   purple-400      c-class   celadon-400
  c-army    vermillion-400  c-admin   indigo-400      c-keju    celadon-400
  c-item    gold-300        c-harem   vermillion-300  c-map     celadon-400
  c-help    gold-300        c-theme   purple-400      c-audio   blue-400

右 rail (9)·
  c-self    gold-300        c-time    indigo-400      c-class   celadon-400 (复用左)
  c-issue   vermillion-400  c-news    amber-400       c-goal    purple-400
  c-rumor   purple-400      c-fin     gold-400        c-rel     celadon-400

注·c-class 在左右 rail 都用·**同 css class·不同语义** (左=阶层·右=紧要之臣)
   实读 button.title 区别·"阶层" vs "紧要之臣"
```

### 各 rail-btn 状态视觉 (源 L1009-1010)

```
.gs-rail-btn {
  width: 38px; height: 42px;
  background: rgba(184,154,83,0.04);
  border: 1px solid var(--m-c, gold-d);
  color: var(--m-c, gold-400);
  font-family: STKaiti·楷体, serif;
  font-size: 16px;                      ← 单字符 16px
  border-radius: 4px;
  transition: all 0.18s;
}

.gs-rail-btn:hover {
  background: rgba(184,154,83,0.18);
  transform: scale(1.08);                ← 放大 8%
  box-shadow: 0 0 6px var(--m-c, gold-400);  ← 主题色发光
}

★ 没有 .active 状态·  rail btn 不 lock active·因为 rail click 不切 panel·只 scroll
                       (与中栏 .g-tab-btn 不同·中栏 active 锁当前 tab)
```

### **drawer 与中栏 (gc) 的关系**

```
drawer 不 push·只 overlay·

drawer 关·  .gs-drawer transform: translateX(-110% 或 110%)
              中栏 .gc 占满 (52, 1fr, 52)·gc 全宽

drawer 开·  .gs-drawer.open transform: translateX(0)
              drawer 出现在 .gc 上方·**遮挡 .gc 左侧 340 / 右侧 360 像素**
              .gc 仍渲染·只是被压在底层·部分可见
              user 中栏读不全·必关 drawer 才看完

★ 这与"push" mode (drawer 推中栏侧滑) 不同·
   当前是 "overlay" mode·drawer 是浮层·中栏不变形
```

### **mechanic 层** (audit layer 3)

```
drawer = 信息读取的"侧面板 hub"·非操作主路径·
   读多·  21 (左) + 13 (右) panel·全是 readout / status 显
   操作少· 大多 panel 静态显·~10 panel 有 click → modal 或 jump
   写更少· 唯一直接写 GM/localStorage 的是 theme panel (写 localStorage)

drawer 开 = 玩家"侧目一瞥"·查 status·快速回中栏继续主操作
drawer 关 (4 路) = "回到主案上"·

shell mode CSS 隐藏 base render·
   设计本意·迁移完毕后删 base render·避免冗余·
   实际现状·base render 仍跑·CSS 只隐·**性能损失**·
   12 殿 v2 paradigm·**应彻底删 base render**·迁移到殿堂式渲染

key=anchor 模式·
   rail btn 不 toggle panel·只 scroll·**全 panel 永远渲染**
   优势·  数据全在·随时可见·无 panel switching cost
   劣势·  长滚动·user 找具体 panel 慢·rail btn 12 个但滚动 21 panel
   ↑ 12 殿 v2 设计反例·12 殿是"切场景"·非"滚 panel"·**场景切换是中栏切·非侧栏滚**

drawer overlay 模式·
   优·     不破中栏·user 可同时看主案 + 侧情
   劣·     遮挡 ~340 像素·中栏部分被压
   12 殿 v2·  保留 overlay·但侧栏 panel 减·因主信息搬到殿堂场景内
```

### **关键发现·12 殿 v2 paradigm 影响**

```
1·  rail btn anchor 模式·与"切殿堂"模式根本不同
    旧·rail click → drawer 滑出 + scroll 到 panel
    新·12 殿 click → 切场景 (整个中栏变·侧栏可关或减)
    → 12 殿后·rail 是否保留?·user 已 lock 12 殿·暗示 rail 简化或删除

2·  base render 冗余·应彻底删
    现 CSS 隐藏·base 仍跑·迁移成本已付

3·  左 340 vs 右 360·**右多 20 像素**·
    原因·右"紧要之臣"卡片字段多 (16+ 字段)·
    12 殿后·若紧要之臣搬入"铜镜厅"·右 drawer 可减回 340 或弃

4·  4 关闭路径·完整无 bug·12 殿后保留同套
    [/] 键 toggle 是好习惯·长按隐藏侧栏 = 沉浸主殿堂
```

### **关键修正** (audit 中)

```
1· **drawer 是 overlay·非 push**·中栏不变形·只被遮挡
2· 左 340·右 360·**宽不一致** (右多 20)·此前 memo 未提
3· z=30·**只盖中栏**·不盖顶栏 / 浮按钮·layer 设计明确
4· **rail btn 不 toggle·只 scroll**·panel 全常驻渲染
5· **4 关闭路径** (✕ / ESC / [ ] / 外部点击)·全完整
6· 键盘事件**非阻塞**·焦点保护 INPUT/TEXTAREA/SELECT
7· `renderSidePanels` 双轨·base + shell·CSS 隐 base·**冗余渲染**
8· `TM.UI.shell` namespace·phase 6 inline migration·包装 4 函数
9· 12 色 css 变量 c-*·rail btn 主题色·c-class 左右复用 (不同语义)
10· rail btn **无 active 状态**·因不 lock panel
11· transform: translateX(±110%)·default off-screen·.open → 0 滑入
12· 缓动 0.35s cubic-bezier(0.4,0,0.2,1)·material design 标准缓出
13· webkit + FF 自定义滚条 (gold 渐变)
14· left:52px / right:52px·紧贴 rail 内侧·rail 永远露出
```

### **12 殿 v2 paradigm 改造建议** (drawer 机制层)

```
A· 保留 4 关闭路径 + key=anchor scrollIntoView·成熟
B· 删 base render 冗余·彻底走 shell mode (或殿堂模式)
C· 重审 rail·12 殿后是否保留 (12+9 button 是否冗余于殿堂切换)
D· 左右 width 统一 360·或彻底重设 (12 殿后侧栏功能减·width 可缩)
E· 添加 active 状态·12 殿模式下·rail 可锁当前殿·或锁当前 panel
F· transition 升级·0.35s 可保留·或加场景切换专用动画
```

---

## §4 左 rail / drawer·完整 (深读)

源·`index.html` L156-171 (rail btn) + L188-197 (drawer container) + L301-336 (drawer 开关 + 键盘事件)·`tm-shell-extras.js` L27-506 (`_renderShellExtrasLeft`·21 panel 渲染)·

### 架构概览·rail + drawer + base render 三层

```
┌─ .gs-rail-left  (永远可见·12 圆按钮纵列)        rail btn
│      │
│      │ click → openSideDrawer('left', key)
│      ↓
├─ .gs-drawer.left#drawerLeft  (overlay·.open 显)  drawer
│      │
│      ├─ .gs-drawer-hdr  ("朝 野 内 情" + ✕)
│      └─ .gs-drawer-body
│           └─ .gl#gl  ← 21 panel 全部贯穿渲染
│                                                   panel
│
└─ legacy base render   ← shell mode 下 CSS 隐藏
   side-panels-ext       (避免重复)
```

### 12 rail btn·`.gs-rail-btn.c-<key>`

源·`index.html` L156-171·

| # | 字 | title | onclick → key | rail c-class |
|---|---|---|---|---|
| 1 | 势 | 势力 | fac | c-fac |
| 2 | 党 | 党派 | party | c-party |
| 3 | 阶 | 阶层 | class | c-class |
| 4 | 军 | 军事 | army | c-army |
| 5 | 政 | 行政区划 | admin | c-admin |
| 6 | 科 | 科举 | keju | c-keju |
| 7 | 物 | 文物 | item | c-item |
| 8 | 宫 | 后宫 | harem | c-harem |
| 9 | 图 | 天下图 | map | c-map |
| 10 | 题 | 主题 | theme | c-theme |
| 11 | 声 | 音声 | audio | c-audio |
| 12 | 帮 | 帮助 | help | c-help |

> 注·rail btn onclick = `TM.UI.shell.openSideDrawer('left', key)`·`key` 用于 drawer 内 scrollIntoView 到 `[data-panel-key=key]` 元素·

### `openSideDrawer(side, key)`·开抽屉机制 (重要)

源·`index.html` L301-316·

```js
window.openSideDrawer = function(side, key){
  var id = (side === 'right' ? 'drawerRight' : 'drawerLeft');
  var el = document.getElementById(id);
  el.classList.add('open');                    // 加 .open 触发 CSS overlay slide
  if (key){
    setTimeout(function(){                     // 360ms·等 slide 动画完
      var body = el.querySelector('.gs-drawer-body');
      var target = body.querySelector('[data-panel-key="'+key+'"]');
      if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
    }, 360);
  }
};
```

> ★ **rail 不切 panel·只 scroll**·所有 21 panel 都已贯穿渲染·rail btn 只是 anchor 跳转·

### 关闭机制·**4 路**

```
1·  ✕ btn (.gs-drawer-close)·  closeSideDrawer('left')
2·  ESC 键·                     两 drawer 全关
3·  [ 键 (toggle)·               drawerLeft.classList.toggle('open')
4·  外部点击·                    document.mousedown·点 rail/drawer 之外自动关
```

> 键盘只在非 INPUT/TEXTAREA/SELECT 焦点时拦截·避免干扰输入·

### 21 panel·按渲染顺序 + data 源 + click handler

源·`tm-shell-extras.js` L27-506 (`_renderShellExtrasLeft(gl)`)·

| # | key | 标题 | data 源 | 条件 | click → |
|---|---|---|---|---|---|
| 1 | **dyn** | 朝 代 主 题 | `GM.eraState` | 总显 | (无) |
| 2 | **weather** | 四 时 物 候 | `GM.turn`+`GM.activeDisasters` | 总显 | (无) |
| 3 | **fac** | 势 力 格 局 | `GM.facs` (top 8) | facs.length>0 | viewFac(name) / openFacPanel |
| 4 | **party** | 党 派 纷 争 | `GM.parties` (top 6) | parties.length>0 | openPartyDetailPanel |
| 5 | **class** | 阶 层 动 静 | `GM.classes` | classes.length>0 | openClassDetailPanel |
| 6 | **army** | 军 事 要 务 | `GM.armies` (top 6) | armies.length>0 | openMilitaryDetailPanel |
| 7 | **admin** | 行 政 区 划 | `GM.adminHierarchy` ?? `P.adminHierarchy` (top 10·sort unrest↓) | _adminSrc 存在 | openProvinceEconomy |
| 8 | **keju** | 科 举 进 程 | `P.keju` | P.keju 存在 | (无) |
| 9 | **family** | 家 族 门 第 | `GM.families` (top 6·sort renown↓) | families 非空 | (无) |
| 10 | **tech** | 制 度 演 进 | `GM.civicTree` (top 5) | civicTree 非空·**注·UI 写"制度"·实读 civicTree 字段** | (无) |
| 11 | **item** | 文 物 奇 珍 | `GM.items` (前 8 slot) | items 非空 | (无) |
| 12 | **harem** | 后 宫 嫔 御 | `GM.chars.filter(c=>c.spouse)` (top 6) | _consorts 非空 | (无) |
| 13 | **map** | 天 下 之 图 | `P.adminHierarchy` (前 6 pin·伪坐标) | 总显 | (无) |
| 14 | **bian** | 边 患 外 族 | `GM.facs.filter(hostile)` (top 4) | 总显·空时 fallback "暂无外患" | (无) |
| 15 | **school** | 学 派 流 变 | `P.schools` ?? 5 默认 (程/阳/考/西/佛) | 总显 | (无) |
| 16 | **price** | 物 价 行 情 | `GM.prices` ?? `P.prices` ?? 默认 4 项 | try/catch·总显 | (无) |
| 17 | **book** | 典 藏 书 阁 | `GM.library` ?? `P.library` ?? {jing:2418,shi:3862,zi:5273,ji:8146} | try/catch·总显 | (无) |
| 18 | **palace** | 宫 殿 之 序 | `P.palaceSystem.capitalName` (默认"紫禁城") | try/catch·总显 | (无) |
| 19 | **theme** | 界 面 主 题 | localStorage·`tm.theme`/`tm.fontSize`/`tm.fontBody`/`tm.fontTitle` | try/catch·总显 | _tmApplyTheme/_tmApplySize/_tmApplyBodyFont/_tmApplyTitleFont |
| 20 | **help** | 帮 助 · 典 范 | (静态 4 项) | try/catch·总显 | openHelpNewbie/openHelpPresets/openHelpAI/openHelpHotkey |
| 21 | **audio** | 音 声 调 度 | (静态 mock + file input) | try/catch·总显 | shellAudioIn (file)·songs (mock) |

### 12 rail btn ↔ 21 panel mapping (重要)

```
rail key  → drawer panel·scrollIntoView 锚点·

fac      ✓ (panel #3)
party    ✓ (panel #4)
class    ✓ (panel #5)
army     ✓ (panel #6)
admin    ✓ (panel #7)
keju     ✓ (panel #8)
item     ✓ (panel #11)
harem    ✓ (panel #12)
map      ✓ (panel #13)
theme    ✓ (panel #19)
audio    ✓ (panel #21)
help     ✓ (panel #20)
```

> ★ **12 rail btn 全 12 都有锚点**·**9 panel 没 rail 入口** (dyn / weather / family / tech / bian / school / price / book / palace)·user 必滚动 drawer 自找·

### 9 "无 rail 入口" panel·一览

```
dyn        朝代主题   ↑ 顶部固定·dr open 即第 1 屏可见
weather    四时物候   ↑ 顶部·第 1 屏可见
family     家族门第   ↓ 在 keju 之后
tech       制度演进   ↓ 在 family 之后
bian       边患外族   ↓ 在 map 之后
school     学派流变   ↓ 在 bian 之后
price      物价行情   ↓ 在 school 之后
book       典藏书阁   ↓ 在 price 之后
palace     宫殿之序   ↓ 在 book 之后
```

> ★ 这 9 panel 是"潜显"内容·无 rail entry·只有 drawer 滚动可见·12 殿 v2 paradigm 设计时·这些都需要找新归宿·

### 各 panel 字段细节

#### #1 dyn·朝代主题

```
phase 6 段·  founding 草创 / rising 兴期 / peak 盛世 / stable 守成 / decline 衰期 / collapse 末路
data·       GM.eraState.dynastyPhase + GM.eraState.contextDescription
fallback·   '衰期' + '魏阉初除·党争未息·外虏压境·天象示警' (天启示意)
visual·     phase 字 + arc 描述·无 click
```

#### #2 weather·四时物候

```
mon = ((GM.turn-1) % 12) + 1
4 季 ×3 月 = 12 节气·   东风解冻/雷乃发声/萍始生... 凉风至/鸿雁来/草木黄落 (与 §1.④ 重叠)
disasterTxt·            GM.activeDisasters[0].name·default '风调雨顺'
visual·                 圆 disc·季节字·3 行 (天象/物候/月)
```

#### #3 fac·势力格局

```
8 facs·sort 不限·读全 GM.facs·
attitude 4 类·
  友好/联盟·   friend·    f-friend·gold
  敌对/交战/敌视· hostile·  f-hostile·vermillion
  附属/宗主/朝贡· vassal·   f-vassal·purple
  其他·         neutral·   f-neutral
isPlayer·     f-self (玩家自己·gold 边)
显·           color bar + name + leader+territory + att chip + strength
click·        viewFac(name) → 唤 fac panel·fallback openFacPanel
```

#### #4 party·党派纷争

```
6 parties·  GM.parties.slice(0,6)
5 色循环·   celadon/purple/indigo/amber/gold (按 index)
显·         name + influence bar (max 100) + 数值
click·      openPartyDetailPanel
```

#### #5 class·阶层动静

```
全部 GM.classes·
icon 取 name 首字·6 经典·士/农/工/商/军/宗 → 5 色 (gold/celadon/amber/indigo/vermillion/purple)
mood 3 段·  >65 stable 安·>40 unrest 躁·<=40 angry 怨
显·         icon + name + populationPct + mood
click·      openClassDetailPanel
```

#### #6 army·军事要务

```
6 armies·top 6
size 字段·  size || troops || soldiers || strength || initialTroops·容错
morale 3 色· >75 celadon·>55 amber·<=55 vermillion
faction chip· 我 (gold) / 外 (vermillion)·按是否玩家 fac 同
显·         ⚔ icon + name + faction chip + 位置·指挥官 + size + morale bar
click·      openMilitaryDetailPanel
```

#### #7 admin·行政区划

```
src·         GM.adminHierarchy ?? P.adminHierarchy·扁平所有 divisions·sort unrest↓·top 10
class 4 段·  unrest>70 crisis·>50 war·<25 stable·其他 default
type·        d.autonomy ?? d.autonomyType ?? '直辖'
显·          dot + name + type chip + unrest val
click·       openProvinceEconomy
```

#### #8 keju·科举进程

```
5 阶段·    童试 → 乡试 → 会试 → 殿试 → 授官 (5 节点)
默认·      curIdx=2 (会试)
stage 映射· {tongshi:0, xiangshi:1, huishi:2, dianshi:3, shouguan:4}
visual·    track + done/current 节点 + label
sub·       主考官 (chiefExaminer || ?) + 应试 (candidates.length || 0) 人

★ 注·与 §3.16 gt-keju 实考 8 phase 不同·这里是简化 5 阶段·
   §3.16 实际 phases·proposal/preliminary_local/preliminary_provincial/
                     examiner_select/huishi_draft/huishi/dianshi_draft/dianshi
   两套·panel 用 5 phase 简表·实考用 8 phase·**两不一致**
```

#### #9 family·家族门第

```
6 family·  Object.keys(GM.families).map → renown desc·top 6
3 tier·    gaomen 甲 / shizu 乙 / 默认 hanmen 丙
显·        name + tier chip + renown
```

#### #10 tech·制度演进 (UI 错位)

```
★ UI 标题 "制 度 演 进"·实读 GM.civicTree·非 GM.techTree
top 5·     civicTree.slice(0,5)
显·        ⚙ icon + name + progress bar + 数值

注·与 §3 中 gt-civic / gt-tech 不同·此处仅显 civicTree·tech 树没 panel·
   user 已决定 gt-tech / gt-civic 两 tab 删除·此 panel 也应同步删
```

#### #11 item·文物奇珍

```
8 slot grid·  GM.items.slice(0,8)·空 slot 显 "—"
rarity 4 档·  legendary/epic/rare/common→uncommon
4 色 css·     r-jing 经 (gold)·r-gui 贵 (amber)·r-bi 比 (celadon)·r-chang 常 (ink)
显·           item name 首字 + rarity color
title attr·   item.name (悬停)
```

#### #12 harem·后宫嫔御

```
6 consorts·   GM.chars.filter(c.spouse).slice(0,6)
4 rank·       /皇后/ empress / /贵妃/ guifei / /妃/ fei / pin (其他)
显·           portrait (name 首字) + name 首字 + rank 字符 (嫔/妃/...)
```

#### #13 map·天下之图

```
mini-map·     6 pin·伪坐标·top/left = (20+(idx%3)*30)% / (20+floor(idx/3)*40+(idx%2)*10)%
class 3 段·   unrest>60 crisis·>40 war·<20 stable
显·           pin 圆点 + label 文字·**纯 schematic·非真地图**
```

#### #14 bian·边患外族

```
threats·      GM.facs.filter(attitude=敌对/交战/敌视)
3 level·      strength>60 hi·>40 mid·<=40 lo
fallback·     [{name:'暂无外患',desc:'四方晏然'}]·永显
显·           急/中/缓 chip + name + desc + force
```

#### #15 school·学派流变

```
5 默认·  程朱理学(主流·gold) / 陆王心学(方兴·celadon) / 考据朴学(渐盛·indigo)
         / 西学东渐(新潮·amber) / 禅净儒释(民间·purple)
src·     P.schools 优先·fallback 5 默认
显·      icon (k 字) + name + level chip + 影响 val
```

#### #16 price·物价行情

```
4 商品·   米/布/盐/银 (4 默认)
fields·   val / unit / trend (%) / spark[6] (柱状)
trend·    >5 up·<-5 down·其他 stable
4 默认·   米 1.8 两/石 +42 / 布 0.8 两/匹 +8 / 盐 3.2 两/引 +6 / 银 650 /两金 -14
显·       name + val + unit + spark 6 柱 + trend ↑↓
```

#### #17 book·典藏书阁

```
4 部·    经 (jing) / 史 (shi) / 子 (zi) / 集 (ji)
默认·    {jing:2418, shi:3862, zi:5273, ji:8146}
显·      4 卡 grid·name + num + sub (十三经·注疏 / 二十二史·实录 / 百家·兵农医 / 诗文·笔记)
```

#### #18 palace·宫殿之序

```
6 殿·   乾清宫 / 保和殿 / 中和殿 / 太和殿 / 文华殿 / 武英殿 + 午门·端门·承天门
visual· diag 块状 + 金色重点 + 小块文华/武英 + 底部门阶
注·    cap 名 P.palaceSystem.capitalName ?? '紫禁城'
```

#### #19 theme·界面主题 (★ 实装·**唯一 panel 写 localStorage**)

```
4 主题·   plain 素纸 / ink 水墨 / vermillion 朱砂 / celadon 青绿
4 字号·   sm 小 / md 中 / lg 大 / xl 特大
6 body font·  STKaiti / SimSun / FangSong / FZQiTi / Noto Serif SC / LXGW WenKai
4 title font· STKaiti / STXingkai / STLiti / STXinghkaiti

读·   localStorage.getItem('tm.theme'/'tm.fontSize'/'tm.fontBody'/'tm.fontTitle')
写·   _tmApplyTheme/_tmApplySize/_tmApplyBodyFont/_tmApplyTitleFont
```

#### #20 help·帮助·典范

```
4 项·
  ?  新手入门     openHelpNewbie  / fallback toast
  典 历代典范     openHelpPresets / fallback toast
  AI AI 推演原理  openHelpAI      / fallback toast
  键 键位速查     openHelpHotkey  / fallback toast (其中显 [ ] 切抽屉·Ctrl+1..9 切 tab·F1 帮助)
```

#### #21 audio·音声调度 (mock·非实装)

```
3 slider·  殿乐 70 / 朝钟 45 / 笔墨 60 (静态·非动态)
正奏·      《秋声赋》·古琴独奏 (mock)
3 song lib· 秋声赋 (playing) / 流水 (paused) / 阳关三叠 (paused)·全 mock·.del 假删
3 loop·    顺序 (active) / 单曲 / 随机
导入·      <input type=file accept="audio/*" multiple>·真 file picker·但**未真接**
```

### shell mode·CSS 隐藏 base render

源·`styles.css` (gs-drawer-body 选择器)·`tm-namespaces.js` legacy fallback·

```
.gs-drawer-body #side-panels-ext { display: none; }   ← 隐藏 legacy base render
```

> 说明·过去 base render 直接挂 `#gl` 容器·与 shell-extras 重叠·**phase 5 之后已迁移到 shell mode**·base render 仍执行·CSS 隐藏避免重叠·user 只看 shell-extras 21 panel·

### click handler·**外部 modal 跳转一览**

```
viewFac(name) / openFacPanel·                  唤 faction modal
openPartyDetailPanel·                            党派详情
openClassDetailPanel·                            阶层详情
openMilitaryDetailPanel·                         军事详情
openProvinceEconomy·                             省级 economy detail (与 gt-difang [详细区划] 同)
_tmApplyTheme/_tmApplySize/_tmApplyBodyFont/_tmApplyTitleFont·  界面主题·写 localStorage
openHelpNewbie / openHelpPresets / openHelpAI / openHelpHotkey·  4 帮助 modal
```

> **drawer 内 panel 不开 modal 一些**·dyn / weather / keju / family / tech / item / harem / map / bian / school / price / book / palace / audio = **14 panel 静态显·无 click**·

### **mechanic 层** (audit layer 3)

```
左 drawer·"朝 野 内 情"·**信息读取·非操作**
   21 panel 全是 readout·click 仅 7 panel 有 (跳详情 modal 或 apply theme)
   主操作仍走中央 tab·此处只是 status overview

panel 三类·
   1·  dynamic data·有 GM 源·条件渲染 (fac/party/class/army/admin/keju/family/civicTree/item/harem/bian/map)
   2·  semi-static·有 P 源 + fallback·总显 (school/price/book/palace)
   3·  meta·UI 设置 / 帮助 / mock (theme/help/audio)

数据流·
   GM 优先·  GM.adminHierarchy ?? P.adminHierarchy·体现"运行时 vs 蓝图"
   try/catch· price/book/palace/theme/help/audio·容错·确保任一 panel 错不影响其他

panel 缺·
   tech 实读 civicTree·**UI 名"制度"误导**·与 user 决定的 gt-tech 删除矛盾·要同步处理
   audio 是 mock 假实装·导入 file input 没接到 audio engine·
   map 是伪坐标 schematic·**非真地图**·真地图在 right rail·**待考**

reading vs writing·
   theme panel·   写 localStorage·全局生效·persistent
   audio panel·   理论上写 GM.audio·目前 mock·写无效
   其他·          全只读
```

### **关键修正** (audit 中)

```
1· **rail btn 不切 panel·只 scroll**·21 panel 全部贯穿渲染·rail 是 anchor
2· **9 panel 没 rail 入口**·dyn/weather/family/tech/bian/school/price/book/palace
   user 必滚 drawer 自找·12 殿 v2 设计要找归宿
3· **12 rail btn 全 12 都有锚点**·**没缺**·之前 memo "8 个无 rail" 错·实是 9 个
4· **panel #10 tech 标题"制度演进"·实读 civicTree**·UI 名错位·user 已决定删·
   panel 同步处理 (从 21 → 20)
5· dyn 6 段·founding/rising/peak/stable/decline/collapse·非简单"盛/衰"二态
6· keju panel 5 阶段·与 §3.16 实考 8 phase **不一致**·panel 简表
7· admin panel 数据源·GM.adminHierarchy ?? P.adminHierarchy·与 gt-difang 同
8· theme panel·**唯一写 localStorage 的 panel**·真实装·非 mock
9· audio panel·**mock·非真**·虽有 file input·没接 audio engine
10· school 5 默认硬编·非剧本驱动·P.schools 可 override
11· book/palace/price·全有静态 fallback·永显·非条件
12· **drawer 关·4 路** (✕/ESC/[/外部点击)·完整覆盖
13· **shell mode·CSS 隐藏 base render**·防重叠·legacy 已弃用
```

### **12 殿 v2 paradigm 影响**

```
21 panel → 12 殿后 mapping·

【保留 → 12 殿】
admin (#7)·     → 舆图厅 / 户部 / 央地 (3 处分流)
army (#6)·      → 舆图厅·兵房
fac (#3)·       → 太常寺·神阁 (势力主题)
party (#4)·     → 风闻阁
keju (#8)·      → 学宫·辟雍
family (#9)·    → 铜镜厅·人事鉴
class (#5)·     → 户部·钱粮厅 (阶层经济)
harem (#12)·    → 御书房·后宫密档 (屏风后)
bian (#14)·     → 舆图厅·边患
school (#15)·   → 学宫·辟雍

【meta·保留浮动 / 设置 modal】
theme (#19)·    → 设置 modal
help (#20)·     → 帮助 modal
audio (#21)·    → 设置 modal (audio 子段)

【顶栏 / 已并入】
weather (#2)·   → 顶栏物候 (重叠·去 1)
dyn (#1)·       → 太常寺·神阁 (朝代气数)
map (#13)·      → 舆图厅 (伪 schema 升真地图)

【删除】
tech (#10)·     → 删 (gt-tech / gt-civic 两 tab + 此 panel 同步)
item (#11)·     → 文物奇珍归典藏阁·或独立殿堂
price (#16)·    → 户部·物价
book (#17)·     → 典藏阁·史馆
palace (#18)·   → 12 殿就是 palace·此 panel 自然消失 (12 殿替代)
```

---

## §5 右 rail / drawer·完整 (深读)

源·`index.html` L175-187 (rail btn) + L199-207 (drawer container)·`tm-shell-extras.js` L509-952 (`_renderShellExtrasRight()`·~440 行)·

### 9 rail btn·`.gs-rail-btn.c-<key>`

源·`index.html` L177-185·**注**·按钮顺序 ≠ panel 渲染顺序·

| # | 字 | title | onclick → key | rail c-class | mapped panel# |
|---|---|---|---|---|---|
| 1 | 朕 | 朕亲 | self | c-self | #1 self |
| 2 | 辰 | 时辰 | time | c-time | #2 time |
| 3 | 臣 | 紧要之臣 | char | **c-class** ★ 复用左 | #3 char |
| 4 | 缘 | 关系网 | rel | c-rel | #9 rel |
| 5 | 议 | 议题 | issue | c-issue | #4 issue |
| 6 | 志 | 大志 | goal | c-goal | #5 goal |
| 7 | 帑 | 岁入岁出 | fin | c-fin | #6 fin |
| 8 | 讯 | 近事 | news | c-news | #7 news |
| 9 | 闻 | 风闻 | rumor | c-rumor | #8 rumor |

### 9 rail btn ↔ 13 panel mapping

```
9 rail btn 全 9 都有锚点·**4 panel 没 rail 入口**·
    panel #10 jifa     祭祀礼仪    无 rail btn
    panel #11 censor   监察百司    无 rail btn
    panel #12 agenda   宫廷日程    无 rail btn
    panel #13 energy   精力气血    无 rail btn

→ 4 个 panel 是"潜显"内容·必滚 drawer 才见
   12 殿 v2 设计要找新归宿 (祀礼→太常寺·监察→都察院/铜镜厅·日程→御书房·精力→meta)
```

### 13 panel·按代码渲染顺序 + 数据源 + 条件 + click

源·`tm-shell-extras.js` L509-952·

| # | key | 标题 | 数据源 | 条件 | 接 click |
|---|---|---|---|---|---|
| 1 | **self** | (无 hdr·朕亲卡) | findPlayerChar() / GM.chars.find(isPlayer) / P.playerInfo | 总显 | (无) |
| 2 | **time** | 十 二 时 辰 | GM.currentDay (mock 推算) | 总显 | (无) |
| 3 | **char** | 紧 要 之 臣 | GM.chars.filter(alive && !isPlayer) sort importance+0.3*loyalty desc | 总显 (空 list 也显) | openCharDetail(name) |
| 4 | **issue** | 当 前 议 题 | GM.currentIssues (pending only) | issues.length>0 | (无 click) |
| 5 | **goal** | 朕 之 大 志 | pc.goals (top 3) | pc.goals 非空 | (无) |
| 6 | **fin** | 岁 入 岁 出 | GM.guoku.history (近 6 回) | 总显 (空时显 mock) | (无) |
| 7 | **news** | 近 事 快 报 | GM.qijuHistory (前 30 条·reverse) | news.length>0 | (无) |
| 8 | **rumor** | 风 闻 坊 录 | GM.rumors / GM._rumors (top 4) | rumors.length>0 | (无) |
| 9 | **rel** | 人 脉 关 系 | GM.chars (top 6·重排) | _relChars.length>0 | (无 click·但 hover title 显忠) |
| 10 | **jifa** | 祭 祀 礼 仪 | (静态 mock·12 日历 + 3 待办) | 总显 | (无) |
| 11 | **censor** | 监 察 百 司 | GM.memorials filter type/subtype·GM.pendingCases | 总显 | (无) |
| 12 | **agenda** | 宫 廷 日 程 | _relChars[0] / GM.memorials / GM.currentIssues | 总显 (动态拼) | (无) |
| 13 | **energy** | 精 力 气 血 | GM._energy / GM._energyMax | 总显 (default 80/100) | (无) |

### #1 self·朕亲卡 (`.gs-self-card`)

```
源·  pc = findPlayerChar() ?? GM.chars.find(isPlayer) ?? {}
     pName = pc.name ?? P.playerInfo.name ?? '朕'
     pTitle = pc.officialTitle ?? pc.title ?? '皇帝'

DOM 结构 (3 段)·
  .gs-self-row·
    portrait (img / name 首字)
    + name (gs-self-name)
    + title (gs-self-title) + 字 (zi/courtesy)
    + meta·  age 岁 chip + traits 4 chip (.trait-neu)

  .gs-self-stats·6 stat bar·
    智 zhi (intelligence)
    政 zheng (administration)
    军 jun (military)
    交 jiao (diplomacy ?? charisma)
    仁 ren (benevolence)
    威 wei (★ GM.huangwei ?? GM.authority ?? 60)  ← 唯一从 GM 读·非 char 字段

  .gs-self-wuchang·5 dot·
    仁 / 义 / 礼 / 智 / 信
    val>=60 hi·>=30 mid·<30 lo·null none

★ "威" 来自 GM.huangwei (顶栏 7 var 之一)·与 char 其他 5 stat 不同维度
```

### #2 time·十二时辰 (`.gs-panel.p-time`)

```
源·  shi = floor((GM.currentDay % 1) * 12) || 8     ← 实际 mock·非真时辰
     shiName = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'][shi]
     deg = (shi * 30) - 90        ← 指针角度

visual·
  .gs-time-dial·         圆盘
  .gs-time-mark·         **8 个标记** (子/卯/午/申/酉/戌/卯/丑)
                          ★ 12 时辰但只画 8 标·**重复"卯"两次** (10%/50%·设计 bug?)
  .gs-time-mark.cur·     当前时辰高亮
  .gs-time-hand·         指针·rotate(deg)
  .gs-time-center·       中心点
  .gs-time-text·         主时辰名 + sub "日 昳 · 未 至 酉" (静态·非动态生成)

★ time panel = mock·  shi 推算 currentDay 不靠谱 (currentDay % 1 是小数)
                       sub 文字静态写死·不随 shi 变
                       12 殿 v2·若保留·需重写为真时辰
```

### #3 char·紧要之臣 (`.gs-panel.p-quick`·**最大 panel**·~176 行代码)

```
源·  chars = GM.chars.filter(alive!==false && !isPlayer)
     sort·   ia = importance + loyalty * 0.3·desc
     全部展示·  无 slice·只在 .gs-cd-scroll 内 max-height 520 + overflow auto

每张 cd 卡·~25 字段·见下深拆
click → openCharDetail(name)·name 经 _jsEsc 转义 (防 XSS·特别是引号/反斜杠/<)
```

#### char cd 卡片·**~25 字段** (★ 最丰富 panel)

```
顶部行 (.gs-cd-name-row)·
  ├─ 左 (.gs-cd-name-left)·
  │   ├─ name (.gs-cd-name)
  │   ├─ zi 字 (.gs-cd-courtesy·· 前缀)·zi || courtesy
  │   ├─ gender-age·    ♂N / ♀N (女含 .female class)
  │   ├─ travelBadge·   →地名 (前 6 字·_enRouteToOffice ?? _travelTo ?? location)
  │   ├─ spouseBadge·   🌸
  │   └─ faceBadge·     "颜面尽失" (_faceLost / _humiliated)
  └─ 右 (.gs-cd-name-right)·
      ├─ loyChip·   忠N·hi(>=70) / mid(40-69) / lo(<40)
      ├─ ambChip·   野N·ambition
      └─ stressBadge· 压/紧/崩 (>=80 crit·>=60 warn)

子行 (.gs-cd-subrow)·
  ├─ office·      officialTitle ?? title ?? '布衣'
  │                + rank·  rankLevel<=3 正一品·<=5 正三品·<=8 正五品·else 九品
  └─ faction chip· (有则显)

tags row (.gs-cd-tags·≤3 tag)·
  trait chip·  按名字模式分 4 色·
    /忠仁爱民温恕慈/ → heart  (gold-celadon)
    /勇武权狡悍烈凶/ → valor  (vermillion)
    /智谋深慎敏/   → mind   (indigo)
    /清简廉直正/   → gold   (gold)
    其他·             → gold (default)
  ★ traitIds 优先 (resolveTraitName: 英文 id → P.traitDefinitions.name)
    fallback traits 数组
  + stance chip·  reform (改革/变法/维新/革新/兴/除弊) / conserve (保守/循规/遵法/祖制/稳/中庸)
  + party chip·   name.slice(0,4)

wuchang line·  (条件·hasWc·有 benevolence 或 righteousness)
  仁N 义N 礼N 智N 信N + 气质·
    avg>=75 士人·>=60 雅儒·>=40 寻常·<40 粗野

resources row·  (条件·hasRes·任一非零)
  公·  钱 SVG + 数 (neg 红) / 粮 SVG / 布 SVG (条件显)
  私·  同上 (条件显)
  SVG·  3 种·硬编 9px 内联 svg (coin 圆+方·grain 麦穗·cloth 折布)

pills 4·
  名 fame    (resources.fame·neg 红)
  贤 virtue  (resources.virtueMerit)
  健 health  (resources.health || 80)
  压 stress  (>=80 warn 朱红)

goal·  (条件·有 personalGoal/longGoal)
  志：title.slice(0,20) + 满足度% (hi>=60 / mid>=30 / lo<30)
  hover title 显完整 goal

enyuan·  (条件·feuds 或 mentor)
  积怨·  feuds.slice(0,2).map(with || target).join('·')
  师承·  mentor (无积怨时 fallback)

portrait·
  img·   c.portrait·错误时 fallback name 首字
  text·  name 首字
  female·color #e84393·border #e84393

mood (注·当前未在卡上显·只 var 解析)·
  忧/愁 worry / 喜/乐 happy / 怒/恨 angry / 敬 respect / 平 peace
```

> ★ 这是**全游戏最丰富的卡**·25 字段·SVG icon·条件渲染·trait 4 色分类·5 stance 模式·
> 12 殿 v2·**直接搬入"铜镜厅·人事鉴"**·单独成殿堂内容·此卡片 80% 字段都用得上·

### #4 issue·当前议题 (`.gs-panel.p-issue`)

```
源·   GM.currentIssues.filter(status !== 'resolved')
显·   pendingIssues.length·有则显
list·  .gs-scroll-list·max-height 220·overflow auto

each item·
  .gs-issue-item.<sev>·
    sev → urgent/high → 'urgent' (红) / info → 'info' (蓝) / 其他 'warn' (黄)
  .gs-issue-num·  '一' '二' ... '廿' (前 20 用汉数·之后 21+)
  .gs-issue-text· issue.text ?? title ?? description ?? name ?? '(未详)'
  .gs-issue-time· issue.time ?? (urgent ? '即刻' : '本回')

★ 与 §6 御案时政 panel 同源 (GM.currentIssues)·但显 N 条·不展开决断
   click 不触发 (与御案时政 modal 不同)·只读
```

### #5 goal·朕之大志 (`.gs-panel.p-goal`)

```
源·   pc.goals.slice(0,3)
显·   pc.goals 非空时

each item·
  .gs-goal-hdr·   title (g.title || g.name) + prio (甲乙丙 priority)
  .gs-goal-desc·  longTerm || shortTerm || description
  .gs-goal-prog·  progress 0-100·fill bar

★ 玩家长期目标·priority 三级·progress 可视化
```

### #6 fin·岁入岁出 (`.gs-panel.p-finance`)

```
源·   GM.guoku.history (近 6 回)·读 last 6 entry
计算·  inP / outP = (income or expense) / annualIncome * 100·clamp [10,100]
fallback· 70 / 75 (空 history)

visual·
  6 group·each = 2 bar (income blue + expense red·**当前只画 income**·outP 计算但未画)
  ★ 实际渲染只有 income·expense bar 缺·  bug or 设计简化?
   .gs-fin-bars·  bar height % + .gs-fin-lbl·turn 编号

legend·  岁入 / 岁出 (双色 chip)

★ history 字段·若 guoku.history 不存在·全 fallback·完全是 mock
```

### #7 news·近事快报 (`.gs-panel.p-news`)

```
源·   GM.qijuHistory.slice(0, 30).reverse()  ← 取最新 30 条
显·   news.length>0
list·  .gs-scroll-list·max-height 240

each item·
  .gs-news-item.<cls>·  按 cat 分 5 色·
    诏令 → 'edict'    (gold)
    奏疏 → 'memo'     (vermillion)
    朝议 → 'chaoyi'   (purple)
    鸿雁 → 'letter'   (celadon)
    人事 → 'person'   (default)
    其他 → 'person'

  .t·   time.slice(0,3)        ← 短日期 (如 "正初" / "九廿")
  .body·  q.content ?? text ?? zhengwen·.slice(0,60) + …

★ 这是**起居注实时摘要**·与 gt-qiju (中栏 tab) 同源·此处简化
   12 殿 v2·搬入"风闻阁·邸报房" (与 gt-qiju 一起)
```

### #8 rumor·风闻坊录 (`.gs-panel.p-rumor`)

```
源·   GM.rumors || GM._rumors·top 4
显·   rumors.length>0

each item·
  .gs-rumor-item·  text ?? content ?? name
  .cred·            credibility ?? confidence ?? '中'  (·前缀)

★ 风闻 = 未证实情报·credibility 三级中/低/高·
   12 殿 v2·搬入"风闻阁"
   注·目前 GM.rumors 字段·  AI 推演填充·此 panel 是"信息战"重要 surface
```

### #9 rel·人脉关系 (`.gs-panel.p-rel`)

```
源·   _relChars = GM.chars filter(alive && !isPlayer) sort importance+0.3*loy desc·top 6
显·   _relChars.length>0

布局·  朕中心 + 6 节臣放射状 (★ visual mini graph)
  6 _positions·硬编伪坐标·top/left/deg·

  pos 1·  20%/76%·deg -55     (右上偏外)
  pos 2·  82%/72%·deg 42      (右下)
  pos 3·  38%/6%·deg 170      (左上)
  pos 4·  72%/14%·deg 130     (左下)
  pos 5·  12%/28%·deg -130    (上中)
  pos 6·  82%/40%·deg 90      (下中)

each·
  .gs-rel-edge.<cls>·  3 类·
    friend  (loy>=65)        gold
    foe     (loy<35 || amb>75) red
    neutral (其他)             dashed

  edgeLen·  44 + random*20px (随机长度·**每次渲染都变**)
  rotate·   pos.deg

  .gs-rel-node.<cls>·  same cls·
    name 首字·hover title 显 "name(忠N)"

中心·   .gs-rel-node.center·  '朕'

★ 注·**edgeLen 用 Math.random·每次渲染长度变**·非数据驱动·**纯装饰**
   方位 6 hardcoded·rel 数据没真的"位置"
   12 殿 v2·"铜镜厅·人事鉴"主图·**升级为真关系图** (按真实数据·非伪坐标)
```

### #10 jifa·祭祀礼仪 (`.gs-panel.p-jifa`·静态 mock)

```
源·   today = (GM.turn % 12) + 1   ← 用 turn 算"今日"
calendar·  12 格·硬编 _dayLabels·
  ['朔','初二','祭太庙','初四','吉日','初六','初七','初八','初九','祀天','十一','望']
  cls·  ['','','jisi','','auspicious','','','','','jisi','','']
  today 格·加 .today.auspicious

3 待办行 (硬编)·
  【祀天】秋分大祀·圜丘     2日后
  【祭祖】太庙告庙·升祔     已备
  【朝贺】万寿节·百官朝贺   下月

★ 完全静态 mock·**无任何 GM/P 数据驱动**·12 殿 v2 必须真实装到太常寺
```

### #11 censor·监察百司 (`.gs-panel.p-censor`)

```
源·  _mems = GM.memorials || []
     _tanhe = filter (type/subtype 含'弹' || content 含'弹劾').length
     _mizou = filter (subtype === '密折' || '密揭').length

4 司行·**前 2 动态·后 2 mock**·
  都察院 (都·indigo)·       弹劾 N·   N>3 hi / N>0 mid / lo
  东厂   (厂·purple)·       密奏 N·   N>0 hi / lo
  锦衣卫 (锦·vermillion)·   巡视·     固定 lo  ★ mock·无数据
  大理寺 (理·celadon)·      刑案 N·   GM.pendingCases.length·固定 mid

★ 半 mock·都察院 + 东厂 真·锦衣卫 + 大理寺 假
   12 殿 v2·并入"铨衡所·吏部" 或独立"都察院"殿堂
```

### #12 agenda·宫廷日程 (`.gs-panel.p-agenda`·"明日安排")

```
固定 5 行 (动态拼)·
  卯时 常朝         群臣
  辰时 召见         _relChars[0].name (top 1 关系臣)·条件显
  巳时 批阅奏疏     N 封 (GM.memorials filter !reviewed.length)
  午时 廷议         _currentIssues[0].title.slice(0,6) (top 1 议题)·条件显
  申时 祀节气       圜丘 (固定·与 jifa panel 重复)

★ 半 mock·call out _relChars[0] / memorials / currentIssues
   "明日" 设计·暗示 endTurn 后第二天计划·与 confirmEndTurn 衔接
   12 殿 v2·并入御书房 hub 或正殿
```

### #13 energy·精力气血 (`.gs-energy`·**特殊·无 .gs-panel class**)

```
源·   GM._energy ?? 80
     GM._energyMax ?? 100
     pct = energy / max * 100

visual·
  .gs-energy-hdr·  "精 力 气 血" lbl + value/max
  .gs-energy-bar·  fill bar·width pct
  .gs-energy-tick· 3 段·"疲" / "可议" / "充"

★ 注·class 不是 .gs-panel·而是 .gs-energy·
   被 CSS 白名单 (.gl > *:not(.gs-panel):not(.gs-self-card):not(.gs-energy)) 单独 allow
   ★ 三类白名单·gs-panel / gs-self-card / gs-energy·**3 顶级类才显**

mechanic·
   精力影响·御前 cost 10·朝议参与上限·密召频率·
   endturn 自然恢复·但有上限·
   皇帝玩法核心限速器
```

### **共享渲染机制**·`gr` 容器 + wrap

源·`tm-shell-extras.js` L509-952·

```js
window._renderShellExtrasRight = function(){
  var gr = $('gr'); if (!gr || !GM.running) return;
  
  // 清除上次注入 (防重复)
  var _ex = gr.querySelector('#_shell_extras_right'); 
  if (_ex) _ex.remove();
  
  var wrap = document.createElement('div');
  wrap.id = '_shell_extras_right';
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
  
  // ... 13 panel 全部 wrap.appendChild()
  
  gr.appendChild(wrap);
};
```

> ★ 与左 drawer 不同·**右用 wrap container**·.gs-drawer-body .gr > *:not(#_shell_extras_right) {display:none}·
> 只 wrap 内容显·legacy gr 内容全 CSS 隐·

### CSS 季节圆盘动态注入 (L954-962·应在左 drawer)

```js
// 在 _renderShellExtrasRight 末尾注入·但实际控制 weather panel (左 drawer)
.gs-season-disc[data-season="春"]::after { content:"春"; color:celadon }
.gs-season-disc[data-season="夏"]::after { content:"夏"; color:amber }
.gs-season-disc[data-season="秋"]::after { content:"秋"; color:amber }
.gs-season-disc[data-season="冬"]::after { content:"冬"; color:indigo }
```

> 此样式属左 drawer 的 weather panel·但代码写在右 drawer 函数末尾·设计耦合·

### 渲染顺序的 UX 含义

```
代码渲染顺序 (default 显)·
  1·  self     朕亲 (始终最上·user 自我状态)
  2·  time     时辰 (时间锚)
  3·  char     紧要之臣 (★ 占最大空间·~176 行 + scroll 520px)
  4·  issue    议题 (条件显)
  5·  goal     大志 (条件显)
  6·  fin      财政
  7·  news     近事
  8·  rumor    风闻
  9·  rel      人脉网
  10· jifa     祭祀
  11· censor   监察
  12· agenda   日程
  13· energy   精力 (始终最下·user 资源底部)

★ 底部 energy panel 不带 .gs-panel·**唯一其他 class**
   设计意图·energy 是"全局资源指标"·永远在底·与 self 头尾呼应
```

### **mechanic 层** (audit layer 3)

```
右 drawer = "朕之案上"·**user 自身视角的 status hub**
   self·     自己 (5 stat + 1 GM stat 威 + 五常)
   time·     时辰 (mock·待真实装)
   char·     周围臣 (核心·25 字段)
   issue·    待办议题 (与 §6 御案时政同源)
   goal·     长期目标 (3 个)
   fin·      帑 (与顶栏 guoku 同源·近 6 回 trend)
   news·     起居注 (与 gt-qiju 同源·30 条)
   rumor·    风闻 (情报战)
   rel·      关系图 (mini graph)
   jifa·     祭祀 (静态 mock)
   censor·   监察 (半 mock)
   agenda·   明日 (动态拼·5 行)
   energy·   精力 (操作限制)

数据流·
   纯 GM 读·  self/char/issue/goal/news/rumor/rel/censor/agenda/energy
   GM/P 混读·time (currentDay)
   纯 mock·   jifa·time·rel.edgeLen (random)·agenda 部分
   GM 写·     **完全没有**·**全 readout·零写入**

★ 右 drawer 比左 drawer 更"个人视角"·
   左 = 朝野内情 (帝国 status)·right = 朕之案上 (帝王 status)
   两者互补·非重复

12 殿 v2 paradigm 改造·
   self     → 御书房·桌前正中 (帝王自像·小 portrait)
   char     → **铜镜厅·人事鉴**·25 字段全保留
   rel      → **铜镜厅·关系图**·升级真关系数据
   issue    → 御书房·议事清册 (与 §6 御案时政合并)
   goal     → 御书房·桌前·或独立"志" panel
   fin      → 户部·钱粮厅 (与顶栏 guoku 合并面板)
   news     → 风闻阁·邸报房
   rumor    → 风闻阁·风闻坊
   jifa     → 太常寺·神阁
   censor   → 都察院·或铨衡所子段
   agenda   → 御书房·桌前左侧"明日"卡
   time     → 顶栏 (与物候合并)
   energy   → 御书房·或全局浮显
```

### **关键修正** (audit 中)

```
1·  9 rail btn → 13 panel·**4 panel 无 rail 入口** (jifa/censor/agenda/energy)
2·  rail btn 顺序 ≠ panel 渲染顺序·rail 4 (缘) 对应 panel 9 (rel)·rail 5 (议) 对应 panel 4 (issue)
3·  **char panel 是最大 panel**·~176 行代码·25 字段·max-height 520·user-scroll
4·  char trait 4 色分类·heart/valor/mind/gold·按名字模式 regex
5·  char 5 stance 模式·改革/保守/中立·名字 regex 识别
6·  self panel 6 stat·**最后一个 "威" 来自 GM.huangwei**·非 char 字段
7·  energy panel 不是 .gs-panel·是 .gs-energy·**独立白名单 class**
8·  time panel·**12 时辰但只画 8 标·重复"卯"两次**·设计 bug or mock
9·  rel panel·**edgeLen 用 Math.random·每渲染都变**·非数据·纯装饰
10· jifa panel·**100% 静态 mock**·无 GM/P 驱动
11· censor panel·**半 mock**·都察院+东厂真·锦衣卫+大理寺假
12· fin panel·**只画 income·expense bar 缺**·设计简化或 bug
13· agenda·"明日"暗示 endTurn 衔接·5 行半动态
14· 右 drawer 用 wrap container (#_shell_extras_right)·CSS 白名单方式
15· 季节 disc CSS·写在右 drawer 函数末尾·实际给左 drawer weather panel 用 (耦合)
16· **right drawer 全 readout·零写入**·与左 (theme 写 localStorage) 不同
17· char click → openCharDetail (modal)·与左 drawer fac/party/class/army click 同 pattern
```

### **12 殿 v2 paradigm 关键决策建议**

```
A·  char 25 字段·**完整搬入铜镜厅·人事鉴**·此 panel 80% 字段全用得上
B·  rel·铜镜厅升级真关系图·删 random edgeLen + 伪坐标
C·  jifa/agenda·  全部重写真实装·目前 mock 不能用
D·  censor·       4 司全实装·或并入吏部
E·  energy·       考虑提为 meta status·与回合 cost 直接关联
F·  self·         浓缩到御书房·5 stat 简化为玩家肖像
G·  time·         12 时辰真实装·或并入顶栏
H·  4 无 rail panel·  jifa/censor/agenda/energy·无 rail 入口·**最差候选删** 或 整合
```

---

## §6 浮动 / 角落 UI·完整 (深读)

源·`index.html` L247-295 (DOM)·`tm-player-core.js` L126-170 (`openShiji`·史记 modal)·`tm-shizheng-panel.js` L13-260 (御案时政)·`tm-office-panel.js` L1437-1476 (`confirmEndTurn`)·`styles.css` L520-554 (gs-turn-float / gs-status-bar)·L4039-4042 (.float-btn)·

### 全 4 浮动 UI 一览

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│ 左下·     ① 史记 (gold)  ② 存档 (indigo)·圆形 48px              │
│           bottom 48px·left 1.5rem / 4.5rem                       │
│                                                                   │
│ 底中·     ③ 御案时政 (卷轴)·                                      │
│           bottom 30px·left 50%·宣纸金线                           │
│                                                                   │
│ 右下·     ④ gs-turn-float (1 group·朱红大按钮 + 6 fab + summary)  │
│           bottom 56px·right 24px                                  │
│                                                                   │
│ 底栏·     gs-status-bar (横条·非按钮)                             │
│           bottom 0·height 36px·                                   │
│                                                                   │
│ 全屏 toast·#toast (非按钮·临时消息)                                │
└──────────────────────────────────────────────────────────────────┘
```

### ① 史记浮按钮 (`#shiji-btn`·圆 48px·gold)

```
DOM·    <button class="float-btn" id="shiji-btn"
          style="left:1.5rem; background: gold gradient"
          onclick="openShiji()">
          <span id="_ico_shiji"></span>  ← tmIcon('history',20) 注入
        </button>

style·  .float-btn (styles.css L4039)·
        position:fixed; bottom:48px; z-index:998
        width:48px; height:48px; border-radius:50%
        display:none·default → .show 才出
        :hover·  scale(1.1)·shadow expand
        :active· scale(0.95)
        animation·fi 0.3s ease (fade-in)

显示·   游戏启动后·tm-launch.js L1154 加 .show
触发·   openShiji() → 唤 史记 modal (turnModal·layer1+layer2 11 板块·见 §3.11)
```

### `openShiji()` 实现 (重要)

源·`tm-player-core.js` L126·

```
if (GM.shijiHistory.length === 0) → showTurnResult("尚无史记")
否则 → _shijiPage=0; _shijiKw=''; _renderShijiPanel()

_renderShijiPanel·走 turn-modal 的 #turn-body 容器
  header·  "史记 / 起居注" + 搜索 + [↓ 导出] + [⚖ 历史对比] + ✕
  list·    GM.shijiHistory.reverse()·按 _shijiPageSize 分页
            每条·T<n> · time · shizhengji 摘要·click → _shijiShowDetail(idx)
  footer·  分页 ‹/›·N/M (X 条)
```

> **此即 gt-shiji tab 的 replay 入口·与 §3.11 turn-modal 同**·浮按钮版无 layer1+layer2 包·只有列表·

### ② 存档浮按钮 (`#save-btn`·圆 48px·indigo)

```
DOM·    <button class="float-btn" id="save-btn"
          style="left:4.5rem; background: indigo gradient"
          onclick="TM.Save.openManager()">
          <span id="_ico_save"></span>  ← tmIcon('save',20)

触发·   TM.Save.openManager() → save manager modal
        多 slot·载入 / 保存 / 删除 / 导出 / 导入
        命名空间·TM.Save·tm-save-lifecycle.js
```

### ③ 御案时政按钮 (`#gs-shizheng-btn`·卷轴风)

```
DOM·    <div id="gs-shizheng-btn"
          style="position:fixed; bottom:30px; left:50%; translateX(-50%);
                 z-index:55;
                 padding:10px 48px; min-width:160px;
                 background:linear-gradient(180deg,#f4e8cc,#e8dbb4,#d9c897);  宣纸黄
                 border:1px solid #a8895a;
                 box-shadow:外阴影 + 内高光 + 内底纹"
          onclick="openShizhengTasks()">
          <span style="transform:translateX(0.275em);">御 案 时 政</span>
        </div>

字风·   STKaiti / KaiTi / 楷体·serif
        font-size 1.05rem·letter-spacing 0.55em·color #3d2f1a
        font-weight 700

hover·  translateY(-2px) + 大阴影·过渡 0.15s

→ openShizhengTasks() 唤 modal (overlay 全屏·1020px panel)
```

### `openShizhengTasks()` modal·御案时政 (重要)

源·`tm-shizheng-panel.js` L13-105·

```
overlay·         rgba(18,12,6,0.85) + blur(3px)·z-index 9998
panel·           min(92vw,1020px) × max-height 78vh

header·          [‹ 返 回] + "御 案 时 政" (居中·gold·间距 0.7rem)
                 + "N 待 / M 决" 角标

数据源·          GM.currentIssues
分类·
  pending·       status !== 'resolved'·按 raisedTurn 倒序
  resolved·      status === 'resolved'·按 resolvedTurn 倒序

empty·           "四海升平·暂无要务"
非空·            grid 2 列·每 issue 一卡

issue card·
  bg / border / 颜色·  pending = 鲜亮 / resolved = 暗淡 (opacity 0.78)
  右上 badge·          "待解决" (vermillion·rotate 6deg) / "已解决" (灰)
  标题·                title (1rem·KaiTi)
  日期·                raisedDate / getTSText(raisedTurn)
  描述·                description.slice(0,70) + …
  click → _openShizhengDetail(id)
```

### `_openShizhengDetail(id)` modal·议题详情

```
全屏 overlay·    rgba(15,10,5,0.88) + blur(4px)·z-index 9999
panel·           760px × 82vh

正文段 (10 部分)·
  1·  标题·         issue.title (1.55rem·gold)
  2·  meta 行·     date · category · 影响地域 · severity (urgent/high/warn/info) · 状态 chip
  3·  description· 大字段·italic·black-quote 风
  4·  详情奏闻·     〔 详 情 奏 闻 〕issue.narrative
  5·  关涉群臣·     issue.linkedChars[]·gold chip
  6·  牵动势力·     issue.linkedFactions[]·vermillion chip
  7·  风势推演·     〔 风 势 推 演 〕issue.longTermConsequences·k:v 多行
  8·  史馆旧案·     〔 史 馆 旧 案 〕issue.historicalNote (italic)
  9·  陛下已断·     〔 陛 下 已 断 〕issue.chosenText (resolved 时显)
  10· 陛下决断·     〔 陛 下 决 断 〕issue.choices[]·each btn → _chooseIssueOption
```

> **此 modal 是议题枢纽·非简单待办**·关联 longTermConsequences (3-5 维) + linkedChars/Factions·决断后会进入 jishi + shiji 11 板块·

### ④ 右下大按钮组 (`gs-turn-float`·1 group·**核心 UI**)

```
DOM·    <div class="gs-turn-float" id="gs-turn-float">
          <div class="gs-turn-fab-bar"> ─── 6 fab 圆按钮
            ✎ 拟诏  → switchGameTab(null,'gt-edict')
            ✉ 发信  → switchGameTab(null,'gt-letter')
            ❋ 召对  → switchGameTab(null,'gt-wendui')
            ☰ 朝议  → switchGameTab(null,'gt-chaoyi')
            ◆ 奏疏  → switchGameTab(null,'gt-memorial')
            ❖ 纪事  → switchGameTab(null,'gt-jishi')
          </div>
          <div class="gs-turn-summary" id="gs-turn-summary">
            诏 N · 疏 M · 待处置 / 朕意已决
          </div>
          <button class="gs-turn-big" onclick="TM.Endturn.run.confirmEndTurn()">
            诏 　 付 　 有 　 司
            <span class="sub">朕 意 已 决　付 之 百 司</span>
          </button>
        </div>

style·   styles.css L520-536·
         position:fixed; bottom:56px; right:24px
         z-index:60·flex-direction:column·gap 8px·align flex-end
         display:none·default → .show 才出
         pointer-events:none·只在子元素上 auto
```

### `gs-turn-fab-bar`·6 fab 设计

```
.gs-fab-bar·     横排·padding 6 10·圆角 24px
                 background gradient + border gold-d
                 backdrop-filter blur(8px)·shadow

.gs-fab-btn·     圆 36px·border gold-d·
                 hover · translateY(-2)·gold-300 border·glow
                 [data-tip] hover·上方 tooltip ("拟诏" / ...)·STKaiti

6 个 fab·         单字符 icon (✎ / ✉ / ❋ / ☰ / ◆ / ❖)
                 全部 → switchGameTab → 切 tab
                 注·朝议是 modal 入口·此处仍叫 switchGameTab 但实际 modal·已在 §3.5 verify
```

### `gs-turn-summary`·摘要文字 (动态)

```
更新·   tm-player-core.js L1356-1361·
         _ec = (GM._edictSuggestions||[]).filter(!used).length
         _mc = (GM.memorials||[]).filter(!reviewed).length
         "诏 N · 疏 M · 待处置" (有事时·warn 红)
         "朕意已决" (无事时·celadon 绿)
```

### `gs-turn-big`·**朱红大按钮** (核心)

```
style·   styles.css L530·
         min-width 210px·padding 16 24
         background gradient vermillion-400 → vermillion-600
         color #f4eadd·KaiTi·20px·letter-spacing 0.45em
         border vermillion-600·shadow + inset gleam
         animation·  gs-turn-glow 3s ease infinite (脉动)
         hover·       translateY(-3) + animation off
         disabled·    opacity 0.55 + cursor wait + grayscale 0.3

::before / ::after· 左右两条横线 (#f4eadd 渐变)·装饰

.sub·     "朕 意 已 决　付 之 百 司"·italic·14.5px·rgba 78% white

onclick → TM.Endturn.run.confirmEndTurn() → 唤 confirm modal
```

### `confirmEndTurn()` modal (重要)

源·`tm-office-panel.js` L1437·

```
检查·   读 8 textarea (edict-pol/mil/dip/eco/oth + xinglu/pub/prv)
        empty = 全空·hasTyActs = TyrantActivitySystem.selectedActivities>0

3 种 msg·
  empty && !hasTyActs·   "今日无事·不如休息一番·天下太平·何必事事操心"
  hasTyActs && empty·    "不理朝政·只顾享乐·如此甚好！"
  其他·                   "诏令已拟·是否颁行天下？"

警告·   pendingMem (status='pending') > 0 → "尚有 N 份奏疏未批复"
显示·   getTSText(GM.turn) → "第N+1回合"
按钮·   [颁行天下] (primary) / [再斟酌]
点 [颁行天下] → endTurn() (核心 mechanic·走 endturn-core 推演链)
```

### ⑤ 底部状态栏 `gs-status-bar` (横条·非按钮)

```
DOM·    <div class="gs-status-bar" id="gs-status-bar">
          <div class="gs-status-left">
            <div id="gs-status-ai">
              <span class="dot"></span><span class="k">AI</span><span class="v">待命</span>
            </div>
            <div><span class="k">存档</span><span class="v" id="gs-status-save">—</span></div>
            <div><span class="k">回合</span><span class="v" id="gs-status-turn">—</span></div>
          </div>
          <div class="gs-status-tip" id="gs-status-tip">〘 提示 〙 按 F1 查看帮助</div>
          <div class="gs-status-right">
            <kbd>Ctrl</kbd>+<kbd>1..9</kbd> 切 tab
            <kbd>Ctrl</kbd>+<kbd>S</kbd> 存档
            <kbd>F1</kbd> 帮助
          </div>
        </div>

style·   styles.css L539·position:fixed bottom:0·height 36px
         display:none default → .show 才显
         backdrop blur(6px)·KaiTi 14.5px·#d4c9b0
         ::before·顶部 1px gold-500 渐变线·opacity 0.5

更新点·  L1347-1349·
         gs-status-save·  GM.saveName || '未命名'
         gs-status-turn·  '第 N 回合'
```

### 全屏 toast (`#toast`·非按钮·临时)

```
DOM·    <div class="toast" id="toast" role="status" aria-live="polite"></div>
作用·   全局短消息·toast(text) 调·~3s 自隐
位置·   底部居中·z-index 高于 status bar 低于 modal
```

### 显隐时机表

```
游戏启动·               浮按钮全部 hide
tm-launch.js L1154·     启动 + GM.running·shiji-btn / save-btn 加 .show
tm-game-loop.js L578·   清 bar-btns / 显 G·浮按钮跟 G 显隐
tm-electron.js L379·    同上·electron 包
tm-save-lifecycle.js L788·  载入存档·清 bar-btns

gs-turn-float·          tm-player-core.js L1345·
                        if (_gsTurnFloat) _gsTurnFloat.classList.add('show')
gs-status-bar·          tm-player-core.js L1346·同上
gs-turn-big disabled·   GM.busy || GM._endTurnBusy 时 disable·灰 + 禁 hover
```

### **z-index 层级** (重要·重叠时显示顺序)

```
55·   gs-shizheng-btn·         御案时政
55·   gs-status-bar·            底部状态栏
60·   gs-turn-float·            右下大按钮组
998·  .float-btn·               史记 / 存档浮按钮
9998· shizheng-tasks-overlay·   议题列表 modal
9999· shizheng-task-detail·     议题详情 modal
4800· keju resolveCouncilResult·朝议结果 dialog (上下文相关)
```

> **gs-turn-float 在前 (z=60)·shiji/save 浮按钮在后 (z=998)·这是按 layer 设计**·shiji/save 必须永远可点击·不被任何 inline UI 遮·而 modal (z=9998+) 全压在最上·

### **mechanic 层** (audit layer 3)

```
4 浮按钮·**4 种角色**·
   ① 史记浮按钮·   过去史观入口·非操作·只读
   ② 存档浮按钮·   meta 操作·游戏外
   ③ 御案时政·     当前议题枢纽·**最重要 inline 决策入口**
                   关联 issue model·decision 影响后续 longTermConsequences
   ④ gs-turn-float· 回合内 + 回合切换·**双重作用**
                   6 fab → 切 tab·快速跳到 6 工作 panel
                   gs-turn-big → endTurn·**唯一回合推进入口**

御案时政 issue model·
  raised → pending → choices selected → resolved → longTermConsequences 注入推演
  is jishi 的 prequel·决断后入 jishi + shiji 11 板块

gs-turn-summary·实时·
  edict 待执行 N + 奏疏待批 M·**ui 给的 endTurn 前清单**
  非阻塞·可空 endTurn (但触发 "今日无事"·meta 提示)

confirmEndTurn 3 msg·
  empty + 无昏君活动·    "天下太平" (中性)
  empty + 昏君活动·       "如此甚好" (反讽 + 影响 huangwei)
  非空·                  "诏令已拟" (常态)
  → endTurn() → AI 推演 → 写 shijiHistory + 史记 modal 弹

stack 关系·
  gs-turn-float·         右下·永远在 gs-shizheng-btn 上 (z=60 vs z=55)
  shiji/save 浮按钮·     永远最高 panel-level (z=998)·modal 之下
  modal·                 最高 z=9998+
```

### **关键修正** (audit 中)

```
1· **4 浮按钮** (非"7"·之前 §6 数字漂移)·shiji / save / shizheng / turn-float
   + 1 状态栏 (横条·非按钮)·+ toast·共 6 surface
2· 浮按钮显示是**条件性**的·default hide·tm-launch L1154 才 add .show
3· z-index 层·gs-turn-float (60) > shizheng (55) > status-bar (55)·非平面
4· 御案时政是**核心议题枢纽**·非简单待办·关联 currentIssues + longTermConsequences
5· issue 详情 modal **10 段** (标题/meta/desc/narrative/linkedChars/linkedFactions/
   longTerm/historical/chosen/choices)·非简单决策
6· gs-turn-big 是**唯一 endTurn 入口**·confirmEndTurn → 3 msg modal → endTurn
7· 6 fab 全 onclick switchGameTab·朝议特殊 (实际 modal·别名 tab)·见 §3.5
8· gs-turn-summary 是动态·诏 N + 疏 M·实时反映待处置工作量
9· 浮按钮 .float-btn·**圆 48px·hover scale·z=998**·与 inline UI 不同 layer
10· 状态栏·  AI / 存档 / 回合 + tip + 3 shortcut hint·非按钮·不点击
```

### **12 殿 v2 paradigm 影响** (重要)

```
4 浮按钮 → 12 殿后 mapping·
   史记      → 典藏阁·史馆 (4 殿之一·已 lock)
   存档      → 保留浮按钮·meta 操作不分殿
   御案时政  → 御书房·议事清册 + 屏风后密档·**核心 hub 元素之一**
   gs-turn-float·
     6 fab → 12 殿全部·拟诏=御书房·朝议=正殿·奏疏=御书房·召对=御书房·发信=御书房·纪事=典藏阁
     诏付有司大按钮·  保留·**唯一 endTurn 入口**·12 殿后仍是这个

御案时政·12 殿 v2 中预备并入·
   御书房·议事清册 (玩家面)
   或独立殿堂"承运殿"·目前 lock 在 12 殿之一 (见 project_phase8_12palace_lock.md)
```

---

## §7 modal·弹窗

| modal | trigger | content |
|---|---|---|
| 问天 | bar-seal click / 问天 button click | 6 模式 AI 对话 (策/审/省/问/编/补)·override system |
| 全部变量 | 全部变量 button | 剧本自定义变量 modal·非 7 standard |
| 史记 | 浮按钮 | 编年/年度/事件 history viewer |
| 存档 | 浮按钮 | save manager·multi slot |
| 暂停 | id=pause-bg | 暂停菜单 |
| 设置 | id=settings-bg | 设置弹窗 |
| 邸报 (changelog) | f-right 邸报 chip | TM_Changelog.show·更新公告 |
| 史记弹窗 (turn-modal) | 回合结束 / nav | tr-prev / tr-next / tr-summary / tr-critical / 导出本回·朕已阅 |
| 帮助 | F1 / help panel item | openHelpNewbie / openHelpPresets / openHelpAI / openHelpHotkey |
| 阶层详情 | class panel click | openClassDetailPanel |
| 党派详情 | party panel click | openPartyDetailPanel |
| 军事详情 | army panel click | openMilitaryDetailPanel |
| 行政详情 | admin panel click | openProvinceEconomy |
| 角色详情 | char card click | openCharDetail / viewRenwu (gt-renwu) |
| 宫殿详情 | palace panel click | openPalacePanel + 子 modal (修缮 / 移居 / 新建) |
| 帑/内/户/吏/民/权/威 详情 | bar var click | openGuoku/Neitang/Hukou/Corruption/Minxin/Huangquan/Huangwei Panel·各自专属 |

---

## §8 keyboard shortcut

```
[       toggle 左 drawer
]       toggle 右 drawer
Esc     close all drawer
Ctrl+1..9   切 tab
Ctrl+S      存档
F1          帮助
↵       开卷 (启动页)
?       帮助 (启动页)
```

源·`index.html` L322-339·

---

## §9 base render 层 (legacy·CSS 隐藏)

**注**·`tm-sidebar-ui.js` `renderSidePanels` (L353-698) 还会渲染 15 个 base panel·但被 CSS `.gs-drawer-body #side-panels-ext` 隐藏·**玩家看不到**·shell-extras 是真实可见层·

base 15 panel 列表 (供 audit·非 active)·势力一览·军事力量·目标条件·显著矛盾·头衔爵位·封建关系·行政区划·阶层·党派·重要物品·后宫·建筑概览·事件概览·官制消耗·皇城宫殿·

---

## §10 总 UI surface 数

```
顶栏元素·   12  (含 7 var)
中央 tab·   15 + 2 conditional
左 panel·   21
右 panel·   13
浮按钮·     4  (史记/存档/御案时政/诏付有司大)
fab·        6
modal·      ~17 (含 var-detail / class-detail 等)
状态栏·     1 (3 段)
快捷键·     8

= ~95 UI 触点
```

---

## §11 12 殿 v2 paradigm 分流·初稿

(待与 user 对齐)·

| 殿 | 吸收 panel | 核心动作 |
|---|---|---|
| 御书房 (hub) | self·time·energy + 起草 + 召对 + 鸿雁 + 屏风后密档 | 6 surfaces |
| 正殿 | (chaoyi/changchao 7 phase 转幕式) | 朝议 / 常朝 |
| 舆图厅 | bian·army·map·admin (10 panel→4 厅) | 兵·地理·边·政区 |
| 典藏阁 | book·biannian·qiju·jishi·shiji·news | 史 / 编 / 起 / 纪 / 邸报 |
| 铨衡所 | office·party·class·family·censor | 官制 / 任免 / 党 / 阶 / 监察 4 司 |
| 户部 | guoku·neitang·hukou·price·fin | 7 var 中 4 var + 物价 |
| 太常寺 | dyn·jifa·school | 朝代主题 / 祭祀 / 学派 (反馈循环) |
| 司天监 | weather·time-detail | 时辰 / 物候 / 灾异 / 谶纬 |
| 铜镜厅 | char·rel·harem·renwu | 人物详情 / 关系 / 后宫 |
| 风闻阁 | rumor·issue·letter·agenda | 风闻 / 议题 / 鸿雁 / 日程 |
| 学宫 | keju·tech·civic·wenyuan | 科举 / 学派 / 制度 / 文苑 |
| 天工坊 | 问天·全部变量·设置·邸报·diagnostics·item | 问天 / 设置 / 物品奇珍 |

**注**·这是初稿·待 user 验证·

panel 数验证·

```
左 21·  fac→铨衡 party→铨衡 class→铨衡 army→舆图 admin→舆图 keju→学宫
        item→天工 harem→铜镜 map→舆图 theme→天工 audio→天工 help→天工
        dyn→太常 weather→司天 family→铨衡 tech→学宫 bian→舆图
        school→太常 price→户部 book→典藏 palace→铜镜
        共 21 ✓
右 13·  self→御书房 time→司天 char→铜镜 rel→铜镜 issue→风闻 goal→御书房
        fin→户部 news→典藏 rumor→风闻 jifa→太常 censor→铨衡
        agenda→风闻 energy→御书房
        共 13 ✓
tab 15·  zhaozheng→御书房(hub) edict→御书房 memorial→御书房 chaoyi→正殿
        wendui→御书房 letter→御书房 biannian→典藏 qiju→典藏 jishi→典藏
        shiji→典藏 office→铨衡 renwu→铜镜 difang→舆图 wenyuan→学宫 keju→学宫
        共 15 ✓
var 7·  guoku→户部 neitang→户部 hukou→户部 lizhi→铨衡(吏治) minxin→太常
        huangquan→正殿 huangwei→御书房
        共 7 ✓

总·56 surface·分到 12 殿·平均 ~4.7 surface/殿·**御书房 hub ~6**·合理
```

---

## §12 改动建议 (12 殿前要确认的)

```
1·  rail 12+9 button 是否保留
    保留·  作为殿门入口 (12 殿对 12 button + 御前 hub)
    弃·    完全 image-based·点物入殿
2·  bar 7 var 是否保留顶栏
    保留·  顶栏永驻 (info 高频)
    挪·    分到户部 / 太常 / 正殿 / 御书房
3·  下侧浮按钮 (御案时政 / 诏付有司大 + 6 fab) 是否保留
    保留·  全局工具·跨殿
    挪·    入御书房 (御桌 14 物)
```

---

(待 user 验证此清单·确认后再发 letter v2 / 调 12 殿分配)
