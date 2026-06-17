# Phase 8·**多殿堂架构 v2**·真功能 + 真假双值

date·2026-05-05·status·**P0·替代 D1 单御书房·12 殿 + 真功能 + 真假双值 + 反馈循环·user 决"按你的想法来"**·owner·Claude

依据·

- `phase8-codex-prompt-master.md` (visual identity 母版)
- `phase8-ui-operational-content-audit.md` (1012 行·v2·UI 实操)
- `phase8-d1-yushufang-architecture.md` (旧 D1·**已 obsolete**)
- 3 路 deep audit (~2000 行 mechanic detail·诏令 / 朝议 / 7 vars)

---

## §0·**核心 paradigm·5 句**

```
1·  多 殿 堂·12 殿·each 一类操作·御书房 hub·避免拥挤
2·  真 功 能·UI 直射 game mechanic·非 cosmetic·non-decorative
3·  真 假 双 值·perceivedIndex (朝廷见) vs trueIndex (真)·**核心情报战玩法**
4·  反 馈 循 环·明君回路 / 末世链 / 倒 U / 三角·**气数可见**
5·  幕 式 transition·**非 modal 一次完**·朝议 7 phase = 7 幕·常朝 4 phase·御前 3 phase
```

**user 决·E (真假双值·要做)·C (御书房先)**·**所有殿堂应能体现 mechanism·非纯视觉**·

---

## §1·12 殿堂清单·**真功能 driven**

| # | 殿名 | 功能核心 | 真功能机制 | surface 吸纳 |
|---|---|---|---|---|
| 1 | **御书房** (hub) | 起草 / 召对 / 鸿雁 / 自审 / 议事清册 / 屏风后密档 / 问天 | edict draft + 议事清册 + secretMeetings | gt-edict + gt-wendui + gt-letter + p-self + p-time + p-energy + 议事清册 + 问天 modal + 屏风后密档 |
| 2 | **正殿** | 廷议 7 幕 + 常朝 4 幕 + 12 action | grade S/A/B/C/D + 用印阻挠 + 后续遗祸 | gt-chaoyi 4 modes + p-issue + p-char (当班) + #turn-modal |
| 3 | **舆图厅·兵房** | 军事 / 地理 / 兵符 / 边患 | gt-edict 军令 + 兵符 click → 军务 | gt-difang + p-map + p-army + p-admin + p-bian (合 fac filter) |
| 4 | **典藏阁·史馆** | 史 / 编 / 起 / 纪 / 文 / 邸报 | 5 records 系统 + 真假纪 (起居注·朝廷见 vs 实录) | gt-shiji + gt-biannian + gt-qiju + gt-jishi + gt-wenyuan + p-news |
| 5 | **铨衡所·吏部** | 官制 + 任免 + 监察 + 阶层 | gt-office tree + 4 司监察 (censor) + 权臣崛起监测 | gt-office + gt-renwu + p-class + p-keju + p-censor (待确认) |
| 6 | **户部·钱粮厅** | 帑廪 8 源 8 支 + 内帑 6 源 5 支 + 户口 + 物价 | bankruptcy 链 + 调拨阻力 + 宗室压力 | p-fin + 户部内帑 panel + gt-edict 经济 + p-price (待确认) |
| 7 | **太常寺·神阁** | 祭祀 + 朝代主题 + 气数 (反馈循环) + 谶纬 | 明君回路 / 末世链 visualization + 真假双值切 | p-jifa (待确认) + p-goal (大志) + dyn (朝代主题) + p-rumor (谶纬部分) + tyrant/lostAuthority crisis warning |
| 8 | **司天监·天文台** | 时辰 + 物候 + 灾异 + 谶纬 | 灾异 → 反向触发奏疏 (memorial trigger) | p-time + dyn-weather + bian-events (灾异) + 谶纬触发 |
| 9 | **铜镜厅·人事鉴** | 人物详情 + 关系 + 后宫 + 家族 | 真假双值·officer perceived vs true loyalty | gt-renwu detail + p-rel + p-harem + p-family (待确认) |
| 10 | **风闻阁·邸报房** | 风闻 + 近事 + 鸿雁回信 + NPC 抗疏 | 反向 trigger (灾→奏疏 / 腐→奏疏) + 真假信差 | p-rumor + p-news + gt-letter (回信侧) + 抗疏频率 |
| 11 | **学宫·辟雍** | 科举 + 学派 + 制度演进 | gt-keju panel + tech tree + 阶级流动 | gt-keju + p-school (待确认) + p-book (待确认) + gt-tech / civic (条件) |
| 12 | **天工坊·问天阁** | 问天 6 模式 + 设置 + 全部变量 + 诊断 | 玩家指令系统 + dev tools | 问天 modal (6 模式) + 设置 (拆 user / dev) + 全部变量 + todo + p-energy + 诊断 |

**总 surfaces·~50 → 38** (砍 12 + 待确认 7 暂保)·

**12 殿 each ~3-7 surfaces·疏密分明**·

---

## §2·**核心机制·真功能**·UI 必体现

### 2.1 诏令 3 pathway (gt-edict + 御书房)

```
玩家在 5 textarea (政/军/外/经/他) 起草
   ↓ 有司润色 (AI 合并 + 4 文风)
GM.edicts (status='draft')
   ↓ 玩家点"诏付有司" (confirmEndTurn)
EdictParser.tryExecute() → 3 pathway·

  pathway='direct'    → 直断执行·当回合 effects → status 'promulgated' → 'executing'
  pathway='memorial'  → 转下回合·有司提案·入 GM._pendingMemorials → 正殿/邸报 UI
  pathway='ask'       → 问疑·入 GM._pendingClarifications → 御书房问疑 UI

3 pathway 在 UI 上的差·

  direct·    诏令档案 status 即时更新·朱印盖
  memorial·  下回合·有司返"复奏"·正殿弹·朱批 7 选 (approve/modify/reject/trial_region/redraft/investigate/refer)
  ask·       即时·御书房弹问疑·player 补 input·返
```

**视觉 implication·诏令档案 (御书房)** 应有 6 状态徽章·

```
✅ completed     ❌ obstructed     ⚠️ partial
⏳ executing     ⭕ pending         📨 pending_delivery (信使在途)
```

### 2.2 反向 trigger·**奏疏不是 player 起·是系统产生**

```
[trigger]              → [memorial]
水灾 disasterLevel>0.35 → 工部"水灾赈济疏"
腐败 corruption>55     → 御史"整饬吏治疏"
兼并 annexation>0.6    → 户部"均田抑兼并疏"
年初 month==1          → 户部"年度赋役总纲"
战争 activeWars>0      → 兵部"前线急报疏"
```

**视觉 implication·正殿·**奏疏·**有"由来"印记**·非简单 list·**朱批 7 选 modal**·

### 2.3 朝议 7 phase·**幕式 transition·非 modal 一次完**

```
[phase 0·议前预审]   4 路径·留中 / 私决 / 下议 (5 人) / 明发 (全廷)
   ↓
[phase 1·起议站班]   三班分坐·支持 / 中立 / 反对 + 潮汐条
   ↓
[phase 2·分轮辩议]   主奏→同党→敌党→中立·5 轮·插言可
   ↓ (人事议题)
[phase 2.5·廷推]    钦点 vs 公开票决
   ↓
[phase 3·决议]       approve/reject/defer/custom/escalate (5 选)
   ↓
[phase 4·钦定档位]   S/A/B/C/D (huangwei + huangquan 计算)
   ↓
[phase 5·草诏拟旨]   按惯例 / 主奏 / 自由 (S 级)·或 skip
   ↓
[phase 6·用印颁行]   敌党阻挠 prob·force / 听天
   ↓
[phase 7·后续遗祸]   D 级遗祸·留中后果·NPC 抗疏
```

**视觉 implication·正殿·**7 幕 transition·**每幕画面切**·非 modal scroll·**fade in/out 0.5s 等**·

**grade 5 档·visual differentiation**·

```
S·圣旨煌煌·    画面金光·百官伏首·跳过 phase 5
A·凛然奉旨·    画面正·主奏者赞·快通过
B·勉强尊行·    画面平·完整流程
C·众议汹汹·    画面阴·主奏党凝聚力 -8
D·危诏激变·    画面赤·D-force vs D-yield 选项·遗祸警示
```

### 2.4 密议 / 密谋 / 不录·**3 隔离 storage**

```
御前不录 (record='secret')      → GM._secretMeetings (隔离)
御前敏感 (诛戮 / 密谋 / 宫禁)    → GM.activeSchemes (密谋·暗中推进)
廷议 D 级 force                  → GM._eventLog (后果记录)
```

**视觉 implication·御书房屏风后**·密档专格·

```
平时·屏风山水画·常态
hover·浮"〔屏风后·密档〕"·user 知有
click·屏风右移·画面 zoom 入·
后面·密室·灯昏暗·四壁帷幄·
密室内·
  - 密档卷·layered·
    GM._secretMeetings·密议记录 (含 leaked 标记)
    GM.activeSchemes·密谋推进
    GM._eventLog·D 级遗祸 + 留中后果
  - 朱印·密 (signal 卡此处不入起居注)
  - 警示灯·若 leaked → 闪
退·屏风左移合·回御书房

**真假双值在此·**密议泄密·从隔离 → 入纪事·**user 看到"丑闻"事件**
```

### 2.5 反馈循环·**气数可见**

```
明君回路 (3 回合)·
  huangwei[70,90)+huangquan[50,75]+minxin≥65+corr<35
  → 三者缓升 + guoku +0.002
  → 6 回触发"四海归心·明君气象" event

末世链 (2 回合)·
  huangwei≤30+huangquan≤35+minxin≤30+corr≥65
  → 三者猛跌 + guoku -0.003
  → 3 回触发"风雨飘摇·气数将尽" event

腐败三角·
  tyrantSyndrome.active + corr>55 + low guoku
  → 浮收蚕食 (10%/月 event prob)

倒 U·
  皇权 ∈ [55,75]·民心最优 +0.05/月
  皇权偏离 > 25·民心 -0.1×(distance-25)/35/月
```

**视觉 implication·神阁太常寺**·

```
中央·"气 数" 大字 (篆体或碑刻)·
四方·明君 / 末世 / 三角 / 倒U 4 区域·
each·小图·

明君回路·
  3 回合内累 → 卷起·6 回内"四海归心" → 大象 (祥)
末世链·
  2 回合内累 → 风云·3 回内"风雨飘摇" → 暴雨 (凶)
腐败三角·
  当前·tyrantSyndrome 激活·corr 闪红·guoku 闪红
倒 U·
  皇权-民心曲线·当前点闪 (绿/黄/红)
```

### 2.6 真假双值·**核心情报战玩法**

```
[变量·真假]
民心     trueIndex (真) vs perceivedIndex (朝廷见)·corr>60+huangwei<50 → 虚报+15~25
吏治     trueIndex (真) vs perceivedIndex (朝廷见)·感知差 +15
皇威     trueIndex (真) vs perceivedIndex (朝廷见)·暴君时近臣献媚
人物     trueLoyalty (真) vs perceivedLoyalty (朝廷见)·NPC 表面忠 ≠ 真心
地方     真治 vs 报治·腐败地方虚报 ±20%

[校正手段]
派督查 (cost 100k)·perceivedIndex 逐月 -5/月 (真假差缩)
特务 (东厂 / 锦衣卫)·主动间谍·查得真值
事后泄密·密议 leaked·真见显
NPC 弹劾·言官奏疏·揭真
```

**视觉 implication·all UI surface 必有"真见 / 朝廷见"切换**·

```
default·朝廷见 (perceivedIndex)·
切换 button (角落 utility 隐藏)·"察实"·
切到·真见 (trueIndex) + 差值 chip "+15 虚报"·
用·派督查 (御书房) / 特务 (铨衡所·4 司) / 等待泄密 (御书房屏风后)·
长期玩法·**情报战是核心·UI 直视化**
```

### 2.7 玩家 agency 关键节点·**强 UI 提示**

```
廷议 phase 0·  4 路径选·画面变·重大决策提示
廷议 phase 3·  5 决议选·档位预测显
廷议 phase 6·  用印阻挠·force / 听天·prob 数显
常朝 phase 2·  12 action·hover 各 effect 浮
御前 phase 3·  4 决断·泄密 risk 数显
问天·         6 模式·**优先级条**·天意最高
```

---

## §3·切场景导航·**御书房 hub**

```
御书房 (hub) ←──┬──→ 正殿 (廷议 / 常朝 / 御前 modal)
                ├──→ 舆图厅 (军 + 地)
                ├──→ 典藏阁 (5 records + 文苑)
                ├──→ 铨衡所 (官制 + 人事 + 监察)
                ├──→ 户部 (帑廪 + 内帑 + 户口 + 物价)
                ├──→ 神阁 (气数 + 谶纬 + 真假切)
                ├──→ 司天监 (时辰 + 物候 + 灾异)
                ├──→ 铜镜厅 (人物详情 + 关系 + 后宫)
                ├──→ 风闻阁 (奏疏由来 + 鸿雁 + 抗疏)
                ├──→ 学宫 (科举 + 学派)
                └──→ 天工坊 (问天 + 设置 + 诊断)·**modal 不进殿堂 paradigm**

御书房屏风后·内书房 / 密档·非独立殿·御书房 sub-zoom

切·画面 transition 0.5-1s·非 modal·
退·Esc 或 出口物 click → 回御书房·~0.3s
```

---

## §4·obsolete 旧 doc

```
[废 v1] phase8-d1-yushufang-architecture.md (~700 行·D1 单御书房塞 23 操作)
        头加废止说明·留参考·**D1 单场景废·12 殿替代**

[废]    phase8-codex-prompt-batch-yushufang.md (~400 行·D1 御书房 prompt)
        12 殿 v2 后·御书房 prompt 重写

[废]    2026-05-05-claude-phase8-yushufang-launch.md (~250 行·letter)
        新 letter 待写·**禁发**

[废]    phase8-codex-prompt-batch-screen-overall.md (~822 行·5 屏 mock)
        头已加 obsolete (前次)·留参考

[废]    phase8-codex-prompt-batch-b-v3-seals.md (~442 行·21 篆刻)
        rail 12+9 颗在 D1 已废·12 殿 v2 中 rail 全废 (无 rail 模式·物品 spatial)

[partial] phase8-ui-application-strategy.md (670 行·应用策略)
        §2.2 拆切清单 (单御书房) 全废·改 12 殿各殿拆切
        §4 DOM 边界 5 规则·仍 valid
        §5 主题策略·partial valid·12 殿 + 7 主题 ~84 张资产·砍 7×4 殿 = 主题专属 ~28 张
        §6 mobile fallback·valid
        §8 5 风险点·partial valid + 新加 12 殿 specific 风险

[新 P0] phase8-multi-palace-architecture.md (本 doc·~1000 行)
[待写]  phase8-yushufang-detailed-spec.md (~600 行·御书房 1 殿详 spec)
[待写]  phase8-codex-prompt-batch-yushufang-v2.md (~500 行·12 殿配下御书房 prompt)
[待写]  letter to Codex (~280 行)
```

---

## §5·responsive·主题·与 v1 同

```
桌面 (>1280)·    12 殿 mock·default 主题
平板 (768-1280)·桌面 mock·CSS 缩
手机 (≤768)·    桌面 mock 全隐·走 .ngui-* mobile fallback (CSS-only)
**禁生 mobile mock**·12 殿 × mobile = 12 张·砍

主题 7 套·each 12 殿微调
  default·素宣墨骨 (baseline·Codex 生)
  6 主题·CSS filter / 朝代陈设替换
  关键朱印 / 印章·CSS isolation·filter: none
  若 filter 不够·8-θ 阶段补生 1-2 主题专属 ~30 张资产
```

---

## §6·实施 phase·v2 工作量

```
8-α prep (本阶段·~已完)
  audit + strategy + 12 殿 architecture·~5d

8-β baseline·5-7d (现有 ngui-* fallback 保留)

8-γ token + 主题合并·7-10d
  Phase 8 token·暖深褐 / 暖金 / 朱红 / 纸白 (default)
  7 主题 = 7 张御书房 baseline + filter

8-δ 御书房·**核心**·15-20d
  Codex 生·御书房 default 主视角 + 屏风后密档 + 议事清册 sidebar (~7-10 张)
  Claude 写·御书房 wire (DOM zoom / hover / click + 真假双值切换 + 6 状态诏令档案)

8-ε 切场景·正殿 / 朝议 / 户部 / 铨衡所·~12-15d
  Codex 生·正殿 + 朝议 7 幕 + 户部 + 铨衡所 主背景 (~6-10 张)
  Claude 写·朝议 7 phase wire (state machine·非 modal) + 朱批 7 选 modal + 12 action

8-ζ 切场景·舆图 / 典藏 / 铜镜·~10-12d
  Codex 生·~5-8 张
  Claude 写·5 records 系统 view·gt-renwu detail

8-η 神阁 / 司天监 / 风闻 / 学宫·~12-15d
  Codex 生·~6-10 张·神阁气数图·谶纬·学宫
  Claude 写·气数循环 visual + 谶纬 + 学派

8-θ utility (天工坊·主题专属补生)·~5-7d
  Codex 生·~10-30 张主题专属 (vermillion / blue 朝代陈设)
  Claude 写·设置拆 (user / dev) + 问天 6 模式 visual

8-ι portrait·~10-15d
  Codex 生·~50-100 张人物胸像
  Claude 写·portrait 接 character.portrait field

8-κ closeout + baseline test·~3-5d

────────
总·~75-110d (Phase 7 ~57d 的 1.3-1.9 倍)·**user 接受·"不顾风险"**
比 D1 单御书房 (~70-95d) 多 ~5-15d·因 12 殿 + 真假双值 + 反馈循环
```

---

## §7·**风险接受 + 新风险**

```
[已接受 v1] 工作量·重做范围·主题成本·mock 失败·视觉风险·交互复杂度·移动 fallback
[新 v2] 真假双值 visual·难·若 user 看不懂·UI 复杂度炸·**8-δ demo 必验**
[新 v2] 反馈循环 visual·神阁气数·若过抽象·user 不感受到·**8-η 必 user-test**
[新 v2] 朝议 7 幕·若每幕 transition 太长·user 烦·**8-ε baseline 测 transition 速**
[新 v2] 12 殿切场景·若 user 迷路·**御书房 hub + bread crumb·8-δ 必含**
[新 v2] 7 个待确认 panel·若无 mechanic·砍·8-η 阶段 user-test 决留删
```

---

## §8·变更日志

- 2026-05-05·init·Claude·**12 殿 v2·post deep audit + user 决 E+C**·~1000 行·**真功能 + 真假双值 + 反馈循环 + 幕式 transition**

---

— Claude (Phase 8·多殿堂架构 v2·post deep audit·2026-05-05)
