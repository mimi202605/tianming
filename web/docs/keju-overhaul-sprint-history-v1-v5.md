# 科举全面升级 sprint·B+ paradigm 重构计划

**状态**·plan 阶段·**等 user 批准开工**
**创建**·2026-05-22
**预计工时**·~35-52 天 (**18 slice** / 6 phase·Phase 0 1.5-2.5d / Phase 1 5-7d / Phase 2 10-15d / Phase 3 9-15d / Phase 4 4-6d / Phase 5 5-8d·头部跟 Phase 加总数学一致·18 slice = Slice 0 prep + Slice 0.5 UI 入口 + Slice 1-16 main)
**风险**·中-高·tm-keju-runtime 3229 行核心改动 + 多文件深集成·但中层保留 8 阶段引擎降低风险

---

## 1·目标·让科举从"出人物工具"升级为"N 年一次的政治大事件"

**user 4 关注要素**·

1. **N 年一次政治大事件** — 默认 3 年一科 (宋后定制)·朝代 modifier·每场科举牵动整朝廷·走朝议演绎
2. **党争** — 主考派系决定录取倾向·进士默认派系标签 (复用 char.party)·跟现有党派系统集成
3. **选官分配** — 朝代联动·唐释褐试 / 宋直授 / 元四等差额 / 明清翰林 庶吉士 三甲·NPC 派系争夺关键缺。汉察举孝廉→郎官 / 魏晋九品授官 不进本 sprint·留察举 / 九品中正专项 backlog
4. **改革派斗争** — 自然政治触发 (党争/F1-F3/国库/改革派 NPC 上位)·改革派 vs 保守派朝议演绎·可改 paradigm 参数 (考试内容 / 反舞弊 toggle / 解额)·timer 仅作 >100 年 fallback 保底

**整个中国古代覆盖**·跨朝代共性 paradigm 作主干·朝代差异化作 modifier·剧本可 override。

---

## 2·共性 paradigm 主干 (跨朝代不变·所有方向都建在这上)

从 1300+ 年科举史 (隋 605 → 清 1905) 提取的 6 轴不变量·

| 共性轴 | 不变 paradigm |
|---|---|
| **A·权力博弈** | 皇权 vs 文官集团 vs 地方·三向指针 + 4 条侵蚀路径 (恩荫/捐纳/行卷/冒籍) toggle |
| **B·筛选结构** | N 级状态机·人数指数衰减·主考从地方到皇帝·顶级不再黜落只排序 |
| **C·主考官** | 主考实体 (派系/学派/籍贯/风格)·座师-门生网络永远存在 (不可灭只可限) |
| **D·干预 vs 反干预** | 5 反舞弊 toggle (糊名/誊录/锁院/回避/监临) + 改革浪潮事件 (自然政治触发·timer fallback) |
| **E·身份金字塔** | 4-5 级身份阶梯·每级 status flag 包·顶级稀缺身份 (状元/庶吉士) |
| **F·历史功能** | 3 大稳定性指针·**士人吸纳率 / 官僚流动率 / 文化整合度** — 停科/操纵/改科通过这三个传导政治后果 |

详细共性研究 → 见 (后置 attach·若需要可单独存) `web/docs/keju-paradigm-research.md` (本 sprint Phase 0 整理)

---

## 3·三层架构

```
┌─ 顶层·政治事件层 (新建) ──────────────────────────┐
│  开科决策 / 主考任命 / 弊案 / 改革浪潮 / 废停科   │
│  全是离散事件·全走朝议 v3 议题·全朝廷演绎        │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─ 中层·N 级筛选层 (参数化现有 8 阶段) ──────────────┐
│  保留 advanceKejuByDays + stage 状态机·成熟引擎    │
│  改·8 stage 名/天数/数量 → KejuTier[]·剧本 override │
│  唐宋默认 3 tier·明清默认 6 tier·汉/魏晋走非科举分支│
└────────────────────┬────────────────────────────────┘
                     ↓
┌─ 底层·身份转换层 (新建) ─────────────────────────┐
│  进士入 GM.chars (废"懒具象化")·派系标签         │
│  座师-门生关系 (复用 char.party + ch._mentorRef) │
│  选官分配 (朝代联动)·status flag 包               │
└──────────────────────────────────────────────────┘

[侧支] 三大稳定性指针·每场科举更新·两阶段传导
       F1·士人吸纳率   ← 备考池 / 总士人池
       F2·官僚流动率   ← 新进士 / 总官员
       F3·文化整合度   ← 边远省份进士占比 / 解额公平度
       → endTurn 副作用·改皇威/皇权/民心/起义概率·非玄幻惩罚

       **显示位置 (user 锁定)**·
       - 不进 GM.vars 顶栏 resource 条
       - 主显示·科举弹窗专属面板 (顶部·跟皇威/皇权印石视觉一致)
       - 次显示·民心面板 (renderMinxinPanel) expand 时增加 3 行派生细节·概念上 F1-F3 是民心的科举系统派生
       - data namespace·P.keju.indicators.{f1,f2,f3}
```

### 各层职责

**顶层 (政治事件层)**·所有玩家可见 / 可干预的"政治事件"
- **两种触发方式**·
  - 跟中层挂钩 (开科决策·主考任命·放榜·选官分配) — 在 stage 切换 hook 上触发
  - 独立触发 (改革浪潮·弊案) — endTurn 周期 + 政治条件累积·跟中层异步·不需要科举正进行也能触发
- 每事件 = 朝议 v3 议题·NPC 派系演绎·玩家裁决
- 输出·改中层参数 + 底层状态

**中层 (N 级筛选层)**·时间化执行机器
- 保留 `advanceKejuByDays` + 8 阶段·**不破坏成熟引擎**
- 数据结构升级·`stageDurationDays` → `tiers: KejuTier[]`·每 tier 含 `{name, daysCost, tierKind, examinerLevel, contentType, passRate}`
- 朝代 preset 决定·`tiers.length` (汉 0·魏晋 0·隋 3·唐 3·北宋 3·南宋 3·元 3·明 6·清 6) = 9 preset 跟 §7 表对齐
- 阶段切换·继续走 `_finalizeStageAndAdvance` 状态机·但每 case 触发**顶层事件**或**底层副作用**

**底层 (身份转换层)**·实体生成 + 派系归属
- 进士入 GM.chars·crystallization 算法 (而非"懒加载")·每场 20 人
- 主考-座师-门生关系·**复用 char.party + ch._mentorRef** (非 graph entity·跟 6 系统翻新前向兼容)
- **主考 entity = char 的 derived view·不新建 entity 字段**·4 属性从已有 ch.party/learning/origin/personality 派生·不污染 char schema
- 派系标签·基于 (主考的 ch.party × 进士的 ch.origin × 进士 8D) 算·写入新进士的 ch.party 字符串
- status flag 包·秀才/举人/进士/翰林/庶吉士 5 级·每级附带终身特权 (翰林/庶吉士仅明清·汉唐宋为空)

**侧支 (三大稳定性指针)**·政治后果显式化
- F1 士人吸纳率·体系内备考/在考/候补 / 全国总士人池
- F2 官僚流动率·过去 9 年新进士入官 / 当前总官员数
- F3 文化整合度·偏远省份进士占比 / 解额配额公平度
- 三指针 → endTurn 副作用·改皇威/皇权/民心/起义概率·**显式中间层避免黑盒**

---

## 4·18 个 slice·6 phase (Phase 0 prep + Phase 1-5 main·含 Slice 0.5 UI 入口)

### Phase 0·Prep (1.5-2.5 d·含 Slice 0.5 UI 入口)

| Slice | 目标 | 涉及文件 | 验收 |
|---|---|---|---|
| **0** | 通读 tm-keju-runtime 3229 行 + tm-keju 1076 行·建 field inventory baseline doc·记录 8 阶段→KejuTier 字段映射规则 | tm-keju-runtime.js, tm-keju.js, docs/phase8-current-ui-inventory.md §3.16 | doc `web/docs/keju-field-inventory.md` 完整·8 阶段每字段都标记保留/重命名/废 |
| **0.5** | **新 UI 入口·右侧"文"panel 拆分 + 加科举按钮**·当前右侧栏"文"按钮打开的 panel 顶端是"文事科举"四字·没有真正可点的科举入口 (科举入口现在挂在左侧 rail `.c-keju`)。改成·panel 顶端只剩"文事"两字·右侧加"科举"按钮·click → `openKejuPanel()` 唤起现有科举专属弹窗 (后续 sprint slice 升级弹窗内容) | `phase8-formal-bridge.js`·titles.policy (L9281)·#rp-title render (L9847, L9863)·panel header DOM | (1) panel 顶端只显示"文事"·(2) 右侧出现"科举"按钮 (gold 样式·跟现有 panel 按钮 paradigm 一致)·(3) 点击唤起 `openKejuPanel()` modal·(4) 不破坏其他 8 个 panel 的 title (ol/issue/office/army/map/finance/rumor/archive 不动) |

### Phase 1·共性主干 (中层 paradigm + 三指针 data) (~5-7 d)

| Slice | 目标 | 涉及文件 | 验收 |
|---|---|---|---|
| **1** | `KejuTier` 数据结构 + 朝代 modifier 默认值表 (~30 参数) | 新 `web/tm-keju-tier.js` (~200 行)·tm-keju-runtime.js initKejuSystem | 9 默认 preset 跑通·smoke·初始化 P.keju.tiers = [...] |
| **2** | 9 朝代 preset (汉察举特例·魏晋九品禁科·隋唐宋元明清不同 N) | tm-keju-tier.js·新 `web/tm-keju-presets.js` (~400 行) | 9 preset 跑 smoke·汉/魏晋走非科举分支不报错·**chaju/jpzz 仅做 stub** (init 短路 + 占位 enabled flag·真正流程留察举/九品中正专项 backlog) |
| **3** | 三大稳定性指针·data 模型 + 每场科举更新 hook·**不进 GM.vars 顶栏** | tm-keju-runtime.js _kejuArchiveExam·新 `web/tm-keju-indicators.js` (~150 行) | 每场科举完更新 P.keju.indicators.{f1,f2,f3}·smoke·指针仅 data·UI 渲染留 Slice 13 |

### Phase 2·顶层政治事件层 (~10-15 d)

| Slice | 目标 | 涉及文件 | 验收 |
|---|---|---|---|
| **4** | 开科决策事件·council/edict/defy 3 路径包装成朝议 v3 议题 | tm-keju.js startKejuByMethod·tm-chaoyi-changchao.js summonablePool | 提议筹办 → 朝议 v3 议题·NPC stance 计算·user 看到争议 |
| **5** | 主考任命事件·NPC 派系角逐 + 玩家钦点·**主考 = char 的 derived view** (4 属性从 ch.party/learning/origin/personality 派生·不新建 entity) | tm-keju-runtime.js examiner_select·新 `web/tm-keju-examiner.js` (~250 行)·tm-faction-action-engine.js | 主考从已有 chars 中选·4 属性自动派生·NPC 派系派人争夺·user 钦点·smoke·**0 新 char 字段** |
| **6** | 改革浪潮事件·**自然政治触发** (非 timer)·主题池·朝议演绎 | 新 `web/tm-keju-reform.js` (~300 行)·tm-keju.js startKejuReform (升级 wrapper) | 触发条件·党争烈度积累 + F1/F2/F3 失衡 + 国库危机 + 改革派 NPC 上位·任一满足时上议改革。**timer >100 年仅作 fallback 保底** (避免完全静态)。主题池 (王安石经义/朱熹理学/张居正考成/戊戌策论)·每主题附带改字段映射表 (主题 → KejuTier/toggle/解额 改动·设计阶段产出)·smoke |
| **7** | 弊案/大狱事件·**政治触发** (非 random)·朝议演绎·罢免/斩考官 | 新 `web/tm-keju-scandal.js` (~200 行)·tm-corruption-engine.js 联动·tm-endturn-followup.js memorial 链 | 触发链·腐败 > X + 主考派系冲突 + 进士派系不满 → NPC 弹劾 (走 memorial schema·跟现有 sc16 路径接) → 调查事件 → 弊案 chaoyi 议题·罢/斩考官。**砍 random·全政治驱动**·smoke |

### Phase 3·底层身份与派系 (~9-15 d·Slice 9 砍 graph -1d 已反映)

| Slice | 目标 | 涉及文件 | 验收 |
|---|---|---|---|
| **8** | 进士入 GM.chars·crystallization 算法·废现"懒加载" | tm-keju-runtime.js _kejuArchiveExam·新 `web/tm-keju-crystallize.js` (~250 行)·tm-char-full-schema.js | 殿试完入 GM.chars·**每场 20 人**·跟现有 startDianshi 生成的 20 卷答卷数对等 (一甲 3 + 二甲 ~10 + 三甲 ~7·或剧本 modifier 调整)·历史名臣去重池 P.keju._historicalFiguresUsed 保留·smoke·100 年 ~7 场 ~140 人增长 (跟现有 char 池量级匹配) |
| **9** | 主考-门生关系·**复用 char.party**·不建独立 graph entity | 新 `web/tm-keju-network.js` (~200 行·砍 100 行)·tm-three-systems-ui.js 新 tab | **不建大型 graph**·每进士加 `ch._mentorRef = 主考 name`·进士派系直接写 `ch.party = '<主考派系>'`·UI 用现有党派列表展示"门生"·跟 6 系统翻新 partyRef entity 化设计前向兼容·smoke |
| **10** | 进士派系标签生成 (基于主考派系 × 籍贯 × 8D)·跟 char.party 写入 | tm-keju-crystallize.js·tm-faction-action-engine.js (_facIndex 跟势力·不是党派·朝廷内党派走 ch.party) | 进士分配 char.party 字段 (使用现有朝廷党派 string·剧本预设的"东林党/阉党"等)·进入 NPC LLM prompt 时 ch.party 已自动带入 sc1b 文事段·smoke |
| **11** | 选官分配·**朝代联动**·**仅 `keju.system='kj'` 朝代 (隋唐宋元明清) 生效**·NPC 派系角逐 + 玩家钦点 | 新 `web/tm-keju-allocation.js` (~400 行)·tm-office-system.js·tm-keju-runtime.js renderFinishedStage·tm-keju-presets.js | 明清·一甲直翰林·二甲选庶吉士·三甲外放。唐·进士+吏部释褐试·二阶段。宋·状元直授高位·三甲县令。元·四等人差额授官·汉/魏晋走 keju.system 分支不进本 slice (汉察举孝廉→郎官在察举系统·非科举·留察举专项 backlog)·NPC 派系角逐关键缺·user 可改·smoke |

### Phase 4·三指针 → 政权稳定性 (~4-6 d·Slice 13 砍独立面板 -1d 已反映)

| Slice | 目标 | 涉及文件 | 验收 |
|---|---|---|---|
| **12** | 三指针 → endTurn 副作用·士人造反/门阀化加深/边疆离心 | tm-keju-indicators.js·tm-endturn-pipeline-steps.js (新 step) | F1 < threshold 时士人造反事件触发概率 +·F2 < 触发门阀派系坐大·F3 < 触发边疆离心·smoke |
| **13** | F1/F2/F3 UI 渲染·**双位置** (科举弹窗 + 民心面板派生)·非独立顶栏 | tm-keju-runtime.js renderKejuStage (顶部加 3 印石区·~50 行)·tm-authority-ui.js renderMinxinPanel (expand 段加 3 行细节·~30 行) | 科举弹窗顶部·3 印石视觉一致皇威/皇权·hover tooltip 解释。民心面板·expand "民心派生" 段·新增 3 行 (士人吸纳/官僚流动/文化整合·小字灰色) + 历史曲线 sparkline。**砍独立面板·~1 d** |

### Phase 5·朝代差异化 + 编辑器 (~5-8 d)

| Slice | 目标 | 涉及文件 | 验收 |
|---|---|---|---|
| **14** | 9 朝代 preset 编辑器面 + 剧本 keju.* schema 扩展 (~30 字段) | editor-game-systems.js kejuSystem panel·tm-keju-presets.js | 编辑器可选朝代 preset 一键加载·剧本 keju 字段从当前 5 字段扩到 30 字段·smoke |
| **15** | timeline 解锁·**era 优先**·绝对年份 fallback·剧本可 override | tm-keju-presets.js·新 `web/tm-keju-timeline.js` (~150 行) | era 优先·"宋以后糊名默认开" (era 字符串包含'宋/辽/金/元/明/清')·绝对年份 fallback (GM.year 用于 era 不明剧本)·糊名 992 / 誊录 1005 / 三年制 1065 / 八股 永乐 / 翻译科 1723·剧本 keju.* override·smoke |
| **16** | 编辑器 UI·KejuTier 列表编辑·朝代 preset 一键加载 | editor-game-systems.js·新 `web/editor-keju-detailed.js` (~400 行) | 编辑器可编辑 tiers 数组·UI 直观·新建剧本可基于 preset 改 |

---

## 5·user 4 关注要素的覆盖深度

| 要素 | 主体 slice | 深度 |
|---|---|---|
| **N 年政治大事件** | Slice 4-7·四类事件全朝议演绎 | 高 |
| **党争** | Slice 5/9/10/11·主考派系 + 座师网络 + 进士派系 + 选官角逐 | 极高 |
| **选官分配** | Slice 11·朝代联动 (唐释褐试/宋直授/元四等差额/明清翰林+庶吉士+三甲) + 派系暗战·汉/魏晋察举/九品授官留专项 backlog | 高 |
| **改革派斗争** | Slice 6·浪潮主题池·可改 paradigm 参数 (考试内容/反舞弊/解额) | 高 |

## 6·集成系统映射 (Agent 2 top 5 全做)

| Agent 2 集成方向 | slice | 改动文件 |
|---|---|---|
| 1·朝议议题化 | Slice 4·6·7 | tm-chaoyi-changchao.js summonablePool/agenda |
| 2·进士 trait + 派系归属 | Slice 8·10 | tm-traits-data.js·tm-faction-action-engine.js |
| 3·地区解额动态 | Slice 14 | 跟 admin_division 集成·tm-region-enrich.js |
| 4·NPC 决策扩展 (科举专属 actions) | Slice 5 | tm-faction-npc-llm-decision.js schema |
| 5·腐败考官干预 | Slice 7 | tm-corruption-engine.js |

## 7·朝代 modifier 落位表

| 朝代 | preset 关键差异 | 在哪 slice 实现 |
|---|---|---|
| 汉 | 察举·岁举·无考试·分支处理·`keju.system: 'chaju'` | Slice 1·14 |
| 魏晋 | 九品中正·禁科 `keju.system: 'jpzz'`·`enabled: false` | Slice 14 |
| 隋 | 分科初创·糊名 false·`keju.system: 'kj'` | Slice 14·15 |
| 唐 | 行卷强 / 座师强 / 进士+明经双轨 | Slice 5·9·14 |
| 北宋 | 糊名+誊录+锁院 1005·三年制 1065·王安石经义改革 | Slice 6·15 |
| 南宋 | 道学官学化 (朱熹《四书》)·三舍法尾·主考偏好转道学派 | Slice 5·6·14 |
| 元 | 4 等人左右榜·根脚优先·解额差异 | Slice 14 |
| 明 | 八股 + 南北中卷 55/35/10 + 翰林分流 | Slice 11·14 |
| 清 | 满汉分卷 + 翻译科 + 捐纳冲击 + 1905 废 | Slice 7·14 |

## 8·三大指针 F1/F2/F3·并列方案 (user 锁定显示位置)

```
[科举事件] (Slice 4-7·Slice 11)
     ↓ 改
[F1-F3 指针] (Slice 3·12·13)
     ├─ 显示·科举弹窗顶部 3 印石 (renderKejuStage)
     ├─ 显示·民心面板派生 3 行 (renderMinxinPanel expand)
     └─ endTurn 副作用 (Slice 12)
                  ↓
[全局稳定性]
   皇威 huangwei (已有)·诏令/朝议改
   皇权 huangquan (已有)·诏令/朝议改
   民心 (已有)·F1-F3 概念上是民心的科举派生
   起义概率 (已有·tm-arcs/event-system)
   派系势力 (已有·_facIndex 跟势力外·朝廷内党派走 char.party)
```

**user 锁定**·

- F1-F3 **不进 GM.vars 顶栏 resource 条** (避免印石过载)
- 主显示·**科举弹窗专属面板**·跟皇威/皇权印石视觉一致
- 次显示·**民心面板 expand 时增加 3 行派生细节** (概念上是民心的科举派生·user 拆开看就理解)
- data namespace·`P.keju.indicators.{f1,f2,f3}`·不污染 GM.vars

**好处**·

- 显式中间层·user 看见科举因果 (e.g. 改革浪潮 → F1 +5%)
- 皇威/皇权/民心不被科举污染·F1-F3 仅在科举/民心两面板显示
- 跟 [feedback_no_mystic_penalties] 对齐·F1-F3 下降 → 自然政治后果 (士人造反·门阀化·边疆离心)·非"扣皇威"黑盒

---

## 9·风险点 + 应对

| 风险 | slice | 应对 |
|---|---|---|
| 进士入 chars 让 GM 膨胀 | Slice 8 | **每场默认 20 人** (跟现有殿试 20 卷答卷数对等·user 锁定)·100 年 ~7 场 ~140 人·量级跟现有 char 池可比·历史名臣去重池保留 |
| 8 阶段 vs 新 KejuTier 双轨期 | Slice 1-2 | KejuTier 字段名复用 P.keju.stageDurationDays·一次性切换不留双轨·写 migration |
| 改革浪潮事件 + 现有 startKejuReform 双轨 | Slice 6 | 旧 startKejuReform = 新事件 entry 的 wrapper·不破坏调用方·alias 块保留 [[feedback_large_file_split_paradigm]] |
| 9 朝代 preset (汉/魏晋特殊) | Slice 2·14 | 非科举朝代用 `keju.system: 'chaju'/'jpzz'/'kj'` 三选项。**本 sprint 只做 'kj' 完整流程**·chaju/jpzz 仅 stub (init 短路·剧本/编辑器/UI 不崩)·真正流程 (汉察举孝廉/魏晋九品中正) 留独立 sprint backlog |
| 顶层事件层 + 中层时间化 同步问题 | Slice 4-7 | 两路 trigger·(1) **中层挂钩** (开科决策/主考任命/放榜/选官·Slice 4/5/11)·在 stage 切换 hook 上·跟 advanceKejuByDays 串行不并发·(2) **独立触发** (改革浪潮/弊案·Slice 6/7)·endTurn 周期 + 政治条件累积·跟中层异步·不需科举正进行也可触发 |
| 多文件深集成 (chaoyi/faction/office/corruption) | Slice 5/7/10/11 | 每 slice 限制只动 1-2 个集成文件·smoke 跑覆盖·不一刀多事 [[feedback_conservative_slicing]] |
| 老存档兼容 (P.keju.currentExam.stage 等) | Slice 1-2 | `_kejuUpgradeExamSchema` 已有 (现仅做 stage 名映射 preliminary→preliminary_local)·**Slice 1-2 工作必含扩展**·新增 stage→KejuTier index 映射 + 字段保留 + 默认值填充·写入 smoke-keju-legacy-save-migration |
| 朝廷党派 char.party 字符串 vs 6 系统翻新 partyRef entity 化前向兼容 | Slice 9-10 | 现用 char.party 字符串 (剧本已设·"东林党/阉党")·ch._mentorRef 单字段。**6 系统翻新做 partyRef entity 时**·写 migration 把 char.party → partyRef·ch._mentorRef → mentorRef·两步走 |
| Slice 6 改革触发依赖 F1-F3 data | Slice 3 / Slice 6 | **Slice 3 必须先于 Slice 6**·提到 Phase 1·见开发顺序 §11 |

## 10·灰度 / migration 策略

- **新剧本**·默认走 B+ paradigm·preset 一键加载
- **老存档**·_kejuUpgradeExamSchema 升级 8 阶段→KejuTier·首次进游戏自动转换
- **进行中科举**·迁移时取当前 stage·映射到对应 KejuTier·继续推进
- **GM.chars 进士追溯**·历史进士 (P.keju.history) 不入 chars·新进士才入

## 11·开发顺序 (按 dependency 严格排序)

```
Slice 0 (prep)
  ↓
Slice 0.5 (UI 入口·右侧文事 panel 拆分 + 科举按钮·早做让后续 slice 测试方便)
  ↓
Slice 1+2 (中层基础·KejuTier + 9 朝代 preset)
  ↓
Slice 3 (三指针 data 模型·必须先于 Slice 6 改革触发依赖)
  ↓
Slice 4 (开科事件·最 visible·快速 demo)
  ↓
Slice 5 (主考事件·建主考 entity·party/学派/籍贯/风格·**必须先于 Slice 8/9/10**)
  ↓
Slice 8 (进士入 chars 20 人/场·依赖 Slice 5 主考 entity 派系)
  ↓
Slice 9+10 (主考-门生关系 + 派系标签·依赖 Slice 5 + Slice 8)
  ↓
Slice 11 (选官分配 朝代联动 + 派系暗战·依赖 Slice 9+10 char.party 已写)
  ↓
Slice 6 (改革浪潮·政治触发·依赖 Slice 3 F1-F3 data)
  ↓
Slice 7 (弊案·政治触发·走 memorial 链)
  ↓
Slice 12+13 (指针闭环 + UI 渲染·科举弹窗 + 民心面板派生)
  ↓
Slice 14-16 (朝代 preset 编辑器 + timeline + KejuTier 编辑收口)
```

## 12·验收·sprint 完成标准

- 全 18 slice node -c PASS
- smoke 覆盖
  - `smoke-keju-full-cycle.js`·一场完整科举跑通·8 阶段切换·朝议演绎·进士入 chars (20 人·party 已写)·选官分配 (朝代联动)
  - `smoke-keju-multi-dynasty.js`·9 朝代 preset 各跑一场科举·汉/魏晋走非科举分支不报错·南宋道学化生效·明南北中卷生效·清满汉分卷生效
  - `smoke-keju-indicators.js`·F1/F2/F3 计算正确·endTurn 副作用触发·UI 双位置 (科举弹窗 + 民心面板派生) 渲染
  - `smoke-keju-reform-trigger.js`·改革浪潮政治触发条件 (党争/F1-F3/国库/改革派 NPC) 各自正确·timer fallback 仅 >100 年生效
  - `smoke-keju-scandal-flow.js`·弊案 memorial 弹劾链·腐败+派系冲突 → memorial → 调查 → chaoyi 议题
  - `smoke-keju-legacy-save-migration.js`·老 8 阶段存档升级到 KejuTier·字段不丢·进行中科举 stage 映射正确·历史数据保留
- E2E·绍宋 / 天启七年两剧本各跑 5 回合·新科举系统不破坏现有 NPC 推演 / 朝议 / 派系 / endTurn·老存档加载成功

## 13·关联文件

- `web/tm-keju.js` (1076 行) — UI + 启动
- `web/tm-keju-runtime.js` (3229 行) — 主战场
- `web/phase8-formal-bridge.js` — Slice 0.5 UI 入口改动 (titles.policy·右侧 panel header)
- `web/tm-authority-ui.js` — Slice 13 民心面板派生 3 行
- `web/tm-chaoyi-changchao.js` — Slice 4/6/7 朝议议题化集成
- `web/tm-faction-action-engine.js` — Slice 5/10 NPC 派系 + char.party 联动
- `web/tm-corruption-engine.js` — Slice 7 腐败联动
- `web/tm-endturn-followup.js` — Slice 7 memorial 弹劾链
- `web/tm-office-system.js` — Slice 11 选官分配
- `web/tm-three-systems-ui.js` — Slice 9 主考-门生关系 UI tab
- `web/docs/phase8-current-ui-inventory.md` §3.16 — 当前 UI 细节
- `web/docs/design/设计方案-6系统翻新.md` — partyRef entity 化设计 (前向兼容点)
- 待建·`web/docs/keju-paradigm-research.md` (Phase 0 整理共性研究)
- 待建·`web/docs/keju-field-inventory.md` (Slice 0 输出)
- memory `project_admin_division_design` — 解额跟行政区划集成
- memory `project_faction_center_layers` — 跟现有派系系统集成
- memory `project_chaoyi_changchao_backlog` — 朝议 v3 议题化集成
- memory `feedback_audit_layers_ui_vs_mechanic` — 三层 audit 必穿透
- memory `feedback_conservative_slicing` — 17 slice 守一刀一事
- memory `feedback_no_mystic_penalties` — F1-F3 自然政治后果
- memory `feedback_paradox_ui_unreliable` — 训练记忆 P 社不可信·runtime 渲染器才是权威

---

## 14·下一步

**等 user 批准开工**。批准后·

1. 建 18 个 slice task (#128-#145·含 Slice 0 prep + Slice 0.5 UI 入口 + Slice 1-16 main)·按"开发顺序"链 blockedBy
2. 启动 Slice 0 (prep) — 读全 4305 行 + 写 field inventory doc
3. 每 slice 完成·node -c + smoke + 跟 user 同步进度
4. Phase 完成时·考虑是否 ship 中间版本 (e.g. Phase 2 完成可 ship "事件层" demo)

## 15·plan review 修订记录 (2026-05-22)

User 完整审查后的修订·

| # | 原 plan 生硬点 | 修订 |
|---|---|---|
| 1 | F1-F3 进 GM.vars 顶栏 | **不进顶栏**·主显科举弹窗 + 次显民心面板派生 3 行 |
| 2 | 主考-门生 graph entity | **复用 char.party**·ch._mentorRef 单字段·跟 6 系统翻新前向兼容 |
| 3 | 朝代 preset 砍到 4 个 | **保留 9 个 preset** (user 锁) |
| 4 | 改革浪潮 timer 触发 | **自然政治触发**·党争/F1-F3/国库/改革派 NPC·timer 仅 fallback |
| 5 | 弊案 random 触发 | **政治触发**·腐败 + 派系冲突 → memorial 弹劾 → 调查 → chaoyi |
| 6 | 选官分配明清制 default | **朝代联动**·汉郎官/唐释褐试/宋直授/明清翰林 各自 |
| 7 | timeline 绝对年份 | **era 优先**·绝对年份 fallback |
| 8 | 进士入 chars 数量未定 | **每场 20 人** (跟现有殿试 20 卷对等·user 锁) |
| 9 | Slice 0.5 v2 12 殿迁移 | **暂不考虑十二殿 ui**·按现 phase8-formal-bridge 新 UI |
| 10 | Slice 13 独立三指针面板 | **砍**·改为科举弹窗 + 民心面板派生 |

---

## 16·算法 / 公式表 (v2·补 plan 数值精度)

### 16.1·F1 士人吸纳率公式 (Slice 3·Slice 12)

```js
function _kjCalcF1() {
  // 备考池·所有 ch.status === '秀才' || '举人' || '生员' 的活人
  const candidatePool = GM.chars.filter(c =>
    c.alive && ['秀才', '举人', '生员', '监生', '童生'].includes(c.status)
  ).length;
  
  // 全国总士人池·读书人估计·按行政区划 + 文化基础 (Slice 14 admin_division 集成)
  // 兜底·按 GM.year 估算·明朝 ~50万·宋朝 ~30万·汉 ~5万 (绝对数对玩家无意义·相对比例对)
  const totalScholarPool = scenario.demographics?.totalScholars 
    || _kjEstimateScholarPool(scenario.dynasty, GM.year);
  
  // F1 = (备考池 / 全国总士人池) × 标准化系数
  // 标准化·历史最盛 (明万历) ~20%·历史最低 (五代) ~2%
  // F1 输出 0-100·线性映射 0-20% → 0-100
  const ratio = candidatePool / Math.max(totalScholarPool, 1);
  return Math.min(100, Math.max(0, ratio * 500));  // 0.2 → 100
}
```

**衰减率·alpha**·F1 跟科举频率挂钩·N 年无科 alpha = 0.95^N·N=10 → 60% 衰减·N=20 → 36%。

**触发阈值** (Slice 12 endTurn 副作用)·
- F1 < 30·士人造反事件概率 +5%/turn (跟 起义概率系统加权·非直接扣)
- F1 < 15·边远士人聚啸罢考 (剧情事件·非数值)
- F1 > 80·士人吸纳良好·人才储备 +1 (走 GM.population.scholars +1/turn)

### 16.2·F2 官僚流动率公式

```js
function _kjCalcF2() {
  // 过去 9 年新进士入官 = P.keju.history 中 examYear >= GM.year-9 的进士数·已入官的
  const recentJinshi = (P.keju.history || []).filter(exam =>
    exam.examYear >= GM.year - 9 && exam.placements && exam.placements.length
  ).reduce((sum, exam) => sum + exam.placements.length, 0);
  
  // 当前总官员·有 ch.officialTitle 的活人
  const totalOfficials = GM.chars.filter(c =>
    c.alive && c.officialTitle && c.officialTitle !== '草民'
  ).length;
  
  // F2 = (近 9 年新进士入官 / 总官员) × 标准化
  // 标准化·历史最高 (北宋熙宁) ~25% (3 年一科 ×3·每场 20 ~60 人·官员 ~500)
  // 历史最低 (元朝禁科期) ~0%
  const ratio = recentJinshi / Math.max(totalOfficials, 1);
  return Math.min(100, Math.max(0, ratio * 400));  // 0.25 → 100
}
```

**触发阈值**·
- F2 < 20·官僚僵化·门阀化加深·`P.factions.<某老牌党派>.cohesion += 0.01/turn`
- F2 < 5·朝廷腐化·腐败值 base +0.5/turn
- F2 > 70·官僚流动良好·新派系崛起概率 +5% (走 _facIndex 新党派 spawn)

### 16.3·F3 文化整合度公式

```js
function _kjCalcF3() {
  // 偏远省份进士占比·近 9 年所有进士中·origin 是边远省份的占比
  const peripheryProvinces = ['云南', '贵州', '陕西', '甘肃', '广西', '宁夏', '辽东', '蜀']; // 简化
  
  const all9YearJinshi = (P.keju.history || [])
    .filter(exam => exam.examYear >= GM.year - 9)
    .flatMap(exam => exam.placements || []);
  
  const peripheryJinshi = all9YearJinshi.filter(j =>
    peripheryProvinces.some(p => (j.origin || '').includes(p))
  ).length;
  
  const peripheryRatio = peripheryJinshi / Math.max(all9YearJinshi.length, 1);
  
  // 解额公平度·各省解额标准差倒数 (Slice 14 admin_division 集成)
  const quotaList = Object.values(scenario.demographics?.quotaByProvince || {});
  const quotaStdev = _stdev(quotaList);
  const quotaFairness = 1 / (1 + quotaStdev / Math.max(_mean(quotaList), 1));
  
  // F3 = 0.6 × 偏远进士占比 × 100 + 0.4 × 解额公平度 × 100
  // 历史最高·南宋三舍法 ~80·历史最低·元四等人法 ~10
  return Math.min(100, Math.max(0, 0.6 * peripheryRatio * 250 + 0.4 * quotaFairness * 100));
}
```

**触发阈值**·
- F3 < 30·边疆离心·边镇 NPC loyalty -1/turn (走 NPC loyalty 系统·非直接扣皇威)
- F3 < 15·偏远省进士罢仕集体请愿事件 (剧情·进 GM._pendingPetitions)
- F3 > 75·文化整合良好·新设府县 (扩张事件) 解额自动给

### 16.4·主考 4 属性派生公式 (Slice 5)

主考不新建 entity·**view 即派生**·读 4 字段·

```js
function _kjExaminerView(ch) {
  return {
    // 属性 1·preferContent·偏好考试内容
    preferContent: (() => {
      if ((ch.party || '').includes('道学')) return 'philosophy_zhuxi';  // 朱熹理学
      if ((ch.party || '').includes('东林')) return 'classics_practical'; // 经世致用
      if ((ch.party || '').includes('阉党')) return 'eight_legged';      // 八股
      const learning = ch.learning || {};
      if (learning.confucian >= 70) return 'classics';
      if (learning.statecraft >= 70) return 'statecraft';
      if (learning.poetry >= 70) return 'poetry';
      return 'classics';  // default
    })(),
    
    // 属性 2·preferRegion·偏好籍贯 (老乡情结)
    preferRegion: ch.origin || null,
    
    // 属性 3·strictness·阅卷严格度·派生自 personality.rigor
    strictness: Math.min(100, Math.max(0, (ch.personality?.rigor || 50) + (ch.personality?.honor || 50) - 50)),
    
    // 属性 4·factionBias·派系偏向强度
    factionBias: ((ch.party && ch.party !== '中立') ? 0.6 : 0.2)
                  + (ch.personality?.ambition || 0) / 200
                  + (ch.personality?.loyalty_to_party || 0) / 200
  };
}
```

**应用** (Slice 8 crystallization)·主考的 4 属性直接进 crystallizationSeed·影响进士的派系标签 + 学派印记。

### 16.5·进士 crystallization 算法 (Slice 8)

```js
function _kjCrystallizeJinshi(examiner, examYear, rank, slot) {
  const view = _kjExaminerView(examiner);
  const seed = view.preferRegion + '_' + examYear + '_' + rank + '_' + slot;
  const rng = _kjMulberry32(_kjHashSeed(seed));
  
  // 1. 籍贯·按 examiner.preferRegion 偏好 +20%·其他按 quota 加权随机
  const origin = rng() < 0.3 && view.preferRegion
    ? view.preferRegion
    : _kjPickWeightedProvince(scenario.demographics?.quotaByProvince, rng);
  
  // 2. 党派·按 examiner.factionBias 派生
  const party = rng() < view.factionBias
    ? examiner.party                  // 拉同党
    : (rng() < 0.5 ? '中立' : _kjPickAlternateParty(examiner.party, rng));
  
  // 3. 8D persona·依赖主考 preferContent
  const persona = {
    rigor:      view.preferContent === 'eight_legged' ? 70 + rng() * 20 : 30 + rng() * 40,
    honor:      view.preferContent === 'philosophy_zhuxi' ? 70 + rng() * 20 : 40 + rng() * 40,
    boldness:   view.preferContent === 'statecraft' ? 65 + rng() * 25 : 30 + rng() * 50,
    rationality: 30 + rng() * 60,
    compassion:  30 + rng() * 60,
    ambition:    30 + rng() * 60,
    greed:       20 + rng() * 40,
    loyalty_to_party: party === examiner.party ? 65 + rng() * 25 : 30 + rng() * 40
  };
  
  // 4. learning·依赖 preferContent
  const learning = {
    confucian: view.preferContent === 'classics' ? 60 + rng() * 30 : 40 + rng() * 40,
    statecraft: view.preferContent === 'statecraft' ? 65 + rng() * 25 : 30 + rng() * 40,
    poetry: 30 + rng() * 50
  };
  
  // 5. mentor·指向 examiner
  const _mentorRef = examiner.name;
  
  // 6. status·rank 决定
  const status = rank === 1 ? '状元' 
              : rank <= 3   ? '一甲进士' 
              : rank <= 13  ? '二甲进士'
              :               '三甲进士';
  
  // 7. 历史名臣去重·P.keju._historicalFiguresUsed 保留
  const name = _kjGenJinshiName(origin, rng, P.keju._historicalFiguresUsed);
  
  return {
    name, alive: true, age: 25 + Math.floor(rng() * 15),
    status, officialTitle: '待选',
    origin, party, _mentorRef,
    personality: persona, learning,
    prestige: 30 + Math.floor(rng() * 30),
    influence: 20 + Math.floor(rng() * 20)
  };
}
```

**8D 维度权重**·`rigor` / `honor` / `boldness` / `loyalty_to_party` 跟主考 4 属性强联动·其他 4 维 (rationality/compassion/ambition/greed) 随机分布。

### 16.6·改革浪潮触发条件 (Slice 6)·阈值表

```js
function _kjReformTriggers() {
  // 任一满足·触发改革浪潮议题
  
  // 条件 A·党争烈度积累
  const partyTension = _kjCalcTotalPartyTension();  // 各党 tension 求和
  if (partyTension >= 15) return { reason: 'partyTension', value: partyTension };
  
  // 条件 B·F1-F3 任一失衡
  const indicators = P.keju.indicators;
  if (indicators.f1 < 25) return { reason: 'F1_too_low', value: indicators.f1 };
  if (indicators.f2 < 15) return { reason: 'F2_too_low', value: indicators.f2 };
  if (indicators.f3 < 20) return { reason: 'F3_too_low', value: indicators.f3 };
  
  // 条件 C·国库危机
  if (GM.vars?.tianxiaTreasury < 1000) return { reason: 'treasury_crisis' };
  
  // 条件 D·改革派 NPC 上位·任一阁臣 + 主考 + 改革派 NPC 同时占位
  const reformistOnTop = GM.chars.filter(c => 
    c.alive && c.rank && _cyRankLevelOf(c.rank) <= 4 &&
    c.party && (c.party.includes('改革') || c.party.includes('维新'))
  );
  if (reformistOnTop.length >= 2) return { reason: 'reformist_rising' };
  
  // Fallback·>100 年无改革·timer 保底
  const lastReform = (P.keju.reforms || []).slice(-1)[0];
  if (lastReform && GM.year - lastReform.year >= 100) return { reason: 'timer_fallback' };
  if (!lastReform && GM.year - scenario.startYear >= 100) return { reason: 'timer_fallback' };
  
  return null;
}
```

**冷却**·改革浪潮触发后·15 年冷却 (防天天改)·冷却期内只 timer fallback 不计。

**主题池映射**·

| 条件 | 主题候选 |
|---|---|
| partyTension | "经义革新" (王安石范式·分裂党争) |
| F1_too_low | "广开科目" (扩大解额) |
| F2_too_low | "考成法" (张居正·官僚效率) |
| F3_too_low | "南北中卷" (明制·或类似分区) |
| treasury_crisis | "捐纳冲击" (清制·缩科举财政依赖) |
| reformist_rising | "实学改革" (戊戌策论·或道学派 vs 实学派) |

### 16.7·弊案触发条件 (Slice 7)·阈值表

```js
function _kjScandalTriggers(examOutcome) {
  // 触发条件三选二·"腐败值高 + 派系冲突高 + 进士派系不满"
  
  // 条件 A·腐败值
  const corruptionScore = _corrCalcExaminerCorruption(examOutcome.examiner);
  const condA = corruptionScore >= 50;
  
  // 条件 B·派系冲突·主考派系 vs 朝中其他党派 tension
  const examinerParty = examOutcome.examiner.party;
  const enemyParties = _kjGetEnemyParties(examinerParty);
  const totalEnemyTension = enemyParties.reduce((sum, p) =>
    sum + (P.factions?.[p]?.tension || 0), 0
  );
  const condB = totalEnemyTension >= 8;
  
  // 条件 C·进士派系不满·新进士中·非 examiner 党派的 + 排名靠后的占比
  const jinshi = examOutcome.placements || [];
  const unsatisfied = jinshi.filter(j =>
    j.party !== examinerParty && j.rank > 10
  ).length;
  const condC = unsatisfied / Math.max(jinshi.length, 1) >= 0.4;
  
  // 三选二·返回弹劾路径
  const matched = [condA, condB, condC].filter(Boolean).length;
  if (matched >= 2) {
    return {
      severity: matched === 3 ? 'major' : 'minor',
      reasons: [condA && 'corruption', condB && 'partyConflict', condC && 'jinshiDissent'].filter(Boolean),
      accuserPool: enemyParties.flatMap(p => _kjGetPartyLeaders(p))
    };
  }
  return null;
}
```

**memorial 链结构** (走 sc16 schema)·

```js
{
  memorialType: 'impeach_examiner',
  target: examiner.name,
  accuser: '<弹劾人 char.name>',
  severity: 'major' | 'minor',
  reasons: ['corruption', 'partyConflict', 'jinshiDissent'],
  text: '臣<accuser>·谨弹劾本届主考<target>·...<动态生成>',
  evidence: { corruptionScore, totalEnemyTension, unsatisfied },
  next: 'investigate_kejuScandal',
  expiresAt: GM.turn + 5
}
```

**调查事件 → chaoyi 议题映射**·

- investigate_kejuScandal 议题进 changchao 当日 agenda·标签 ['regicide-pursuit', 'penal-harsh', 'inspection']
- NPC 议论后 → 玩家裁决·罢黜 / 削籍 / 赐死 / 保 / 调案
- 罢黜 → examiner.officialTitle = '待罪'·loyalty -10
- 削籍 → examiner.alive = true, status = '庶人'
- 赐死 → examiner.alive = false (martyr 入队)

---

## 17·集成接口 / 跨 sprint 衔接 (v2 新)

### 17.1·跟廷议大改 sprint 衔接

科举议题 (Slice 4 / 6 / 7) 全走廷议 v3·使用廷议 sprint 加的 27 tag·

| 科举议题 | 廷议 tag | 召集策略 |
|---|---|---|
| 开科决策 (Slice 4) | ['official-selection', 'precedent'] | 标准九卿会议 |
| 主考任命 (Slice 5) | ['official-selection', 'personnel'] | 标准九卿会议 |
| 改革浪潮 (Slice 6) | ['precedent', 'law-reform', 'imperial-lecture'] | 派系大会战 (改革派 vs 保守派) |
| 弊案弹劾 (Slice 7) | ['regicide-pursuit', 'penal-harsh', 'inspection'] | 专家小组 (都察院 + 刑部) |
| 选官分配 (Slice 11) | ['official-selection', 'personnel'] | 标准九卿会议 |

**confront 触发**·改革浪潮议题最易触发 (主考派系 vs 反方党魁·废科 vs 维科直接对线)·廷议 sprint 的 confront 链 + 真 NPC vs NPC 对质 这里自动生效。

**clientelism 触发**·主考任命议题·门生 NPC 自动跳出来推老师·走廷议 sprint 的 clientelism mode。

### 17.2·跟 6 系统翻新 partyRef entity 化的 migration

**Phase 1·科举 sprint 期间**·

- char.party 保持字符串 (Slice 9/10)
- 写 `_kjUpgradeJinshiSchema(jinshi)` 函数·支持未来字符串 → entity 切换

**Phase 2·6 系统翻新 ship 后**·

- 写 `_kjMigrateCharPartyToPartyRef()`·一次性迁移·所有 char.party 字符串 → partyRef
- ch._mentorRef 字符串 → mentorRef entity reference
- 进士 crystallization 输出·party 改为 partyRef·_mentorRef 改为 mentorRef

**双方先 ship 顺序**·**科举 sprint 先 ship**·6 系统翻新做 partyRef 时·已有完整科举数据可做迁移测试。

### 17.3·跟 admin_division 集成 (Slice 14)

**依赖关系**·Slice 14 (剧本 keju.* schema 扩展) **依赖** admin_division design 的 quotaByProvince 字段。

**Block 处理**·

- 若 admin_division 未 ship·Slice 14 用 fallback·`scenario.demographics?.quotaByProvince || _kjDefaultQuotaByDynasty(scenario.dynasty)`
- 这样 Slice 14 不 block 在 admin_division 上·可独立完成
- 后续 admin_division ship 时·自动接管 fallback

**Slice 14 + admin_division 双 sprint 并行**·两边独立·完成后做一次集成 smoke。

### 17.4·跟常朝大改 selfReact 衔接

科举议题在常朝议程时 (e.g. "下廷议议开科")·NPC 反应**走常朝大改的 _ty3_getDims 8D persona**·跟科举内部触发的廷议**复用同套**·不独立维护。

**统一入口**·

```js
function _kjGetNpcStanceForKejuTopic(npc, topic, topicType) {
  // 复用常朝/廷议 sprint 的 stance 系统
  return _ty3_getStanceWithDims(npc, topic, topicType);
}
```

**特殊扩展**·科举议题加 keju-specific keyword (糊名/誊录/座师/八股/经义/捐纳/择官)·写进 Slice 2 keyword 词表的 keju 子段。

---

## 18·Phase 0 + backlog 缺漏补全 (v2 新)

### 18.1·新增 Slice 0.7·共性 paradigm 研究 doc

**遗漏修正**·原 plan §2 提了"详细共性研究 → 见 `web/docs/keju-paradigm-research.md` (本 sprint Phase 0 整理)"·但 Phase 0 slice 表只有 Slice 0 + 0.5·没整理 doc 的 slice。

**Slice 0.7 加入 Phase 0**·

| Slice | 目标 | 涉及文件 | 验收 |
|---|---|---|---|
| **0.7** | 整理 6 轴不变量研究 doc | 新 `web/docs/keju-paradigm-research.md` (~600 行)·Agent 1 跨朝代 doc + Agent 2 共性 doc 内容合并 | (1) 6 轴不变量逐项写满·各朝代如何具象化·(2) 9 朝代差异化表·1300 年时间线 timeline·(3) 共性 paradigm 提取规则·(4) doc 是后续 Slice 1-16 设计参考·**必须实施前完成** |

**Phase 0 修订**·

```
Phase 0·Prep (2-3 d·含 Slice 0.5 UI 入口 + Slice 0.7 paradigm doc)
  Slice 0   — 0.5-1 d  通读 keju 代码 + field inventory
  Slice 0.5 — 0.5-1 d  UI 入口·"文事" panel 拆分 + 科举按钮
  Slice 0.7 — 1-1.5 d  共性 paradigm research doc
```

总工时·plan 18 slice → **19 slice**·~36-53 d (+1 d for Slice 0.7)。

### 18.2·察举 / 九品中正 专项 backlog 文件

**新文件**·`web/docs/keju-backlog-chaju-jiupin.md`

**内容**·

- 汉察举·孝廉 / 茂才 / 贤良方正 / 童子 4 科·岁举 / 特举·中正官·清议·东汉名士月旦评
- 魏晋九品中正·中正官品评·上下九品·门阀士族优先·"上品无寒门·下品无势族"
- 这两套**不复用 KejuTier 引擎**·独立 entity·`P.juli.system` 或类似 namespace
- 涉及 stub 后续展开·主考变中正·考试变品评·进士变察举名单
- 估时·8-12 d·独立 sprint·**等科举大改 ship 后启动**

### 18.3·明化 Slice 14 vs Slice 16 职责差异

**原 plan 重叠**·

- Slice 14·9 朝代 preset 编辑器面 + 剧本 keju.* schema 扩展
- Slice 16·编辑器 UI·KejuTier 列表编辑·朝代 preset 一键加载

**修订职责**·

- **Slice 14**·**数据层**·schema 字段扩展 + 9 朝代 preset 数据填充·**不动 UI**
- **Slice 16**·**UI 层**·编辑器面板·KejuTier 列表 form + preset selector dropdown·**调用 Slice 14 数据**

依赖·Slice 16 依赖 Slice 14·必须 Slice 14 先 done。

---

## 19·ship / 灰度 / 回滚策略 (v2 新)

### 19.1·中间 ship 节点决策

**3 个中间 ship 候选**·

| 节点 | 内容 | 是否 ship |
|---|---|---|
| Phase 2 完成 (Slice 0-7) | 顶层政治事件层 demo·开科 / 主考 / 改革 / 弊案 全朝议演绎 | **不 ship** (无底层·进士不入 chars·体验残缺) |
| Phase 3 完成 (Slice 0-11) | 顶层 + 底层完整·进士入 chars·派系标签·选官分配 | **ship 1.3.0.0** (新科举 minor release) |
| Phase 5 完成 (Slice 0-16) | 全完成 | **ship 1.3.1.0** (完成) |

**决策**·Phase 3 完成 ship 1.3.0.0 给 user 真试用·获反馈再 Phase 4/5。

### 19.2·feature flag 灰度策略

```js
// 加 P.conf.useNewKeju 默认 false (Slice 0.5 加)
P.conf.useNewKeju = (P.conf.useNewKeju === true);

// Slice 1 → 11 实施期间·所有新代码 gate
function startKejuByMethod(method) {
  if (P.conf.useNewKeju) {
    return _kjV2_startKejuByMethod(method);  // 新流程
  }
  return _kjV1_startKejuByMethod(method);    // 旧流程·原样保留
}
```

**ship 1.3.0.0**·flag 默认 **true** (新流程默认开)·旧流程保留 emergency fallback。

**ship 1.3.1.0** (Phase 5 完成)·flag 删除·旧流程废 (3 个月稳定期后)。

### 19.3·数值 hardcode vs scenario 可配

**scenario 可配** (剧本 override)·

```json
{
  "keju": {
    "indicators": {
      "f1_thresholds":      { "critical": 15, "low": 30, "high": 80 },
      "f2_thresholds":      { "critical": 5, "low": 20, "high": 70 },
      "f3_thresholds":      { "critical": 15, "low": 30, "high": 75 }
    },
    "reformTriggers": {
      "partyTension_threshold":   15,
      "treasury_crisis_threshold": 1000,
      "reformistOnTop_count":      2,
      "timer_fallback_years":      100,
      "cooldown_years":            15
    },
    "scandal": {
      "corruption_threshold":      50,
      "enemyTension_threshold":    8,
      "unsatisfied_ratio":         0.4
    },
    "jinshiPerExam":   20,
    "tiers":           [/* KejuTier[] */],
    "examInterval":    3  // 3 年一科
  }
}
```

**hardcode** (paradigm-level·不剧本可配)·

- crystallization 算法的权重 (0.3 籍贯偏好 / 0.6 同党拉拢 / etc)
- 主考 4 属性派生公式 (preferContent 关键词映射 / strictness 计算式)
- 标准化系数 (F1 ratio × 500 / F2 ratio × 400)
- 8D 维度名 (rigor / honor / boldness / etc·跟 character schema 一致)

### 19.4·smoke fail 的 block 规则

5 个 smoke 跑顺序·

```
1. smoke-keju-full-cycle.js     ← 最基础·若 fail block 所有
2. smoke-keju-indicators.js     ← Slice 3 完成后跑
3. smoke-keju-multi-dynasty.js  ← Slice 14 完成后跑
4. smoke-keju-reform-trigger.js ← Slice 6 完成后跑
5. smoke-keju-scandal-flow.js   ← Slice 7 完成后跑
6. smoke-keju-legacy-save-migration.js ← Slice 1-2 完成后跑·迁移测试
```

**block 规则**·

- smoke 1 fail → 所有 slice block·必须先修
- smoke 2-5 fail → 对应 slice block·其他 slice 可继续
- smoke 6 (migration) fail → ship 1.3.0.0 block·必须先修
- E2E (绍宋 / 天启七年) fail → ship 1.3.0.0 block

### 19.5·回滚策略·feature flag + ship rollback

**3 级回滚**·

- **Slice 内回滚**·git revert 该 slice commit·flag 仍 false·无影响
- **Phase 内回滚**·恢复 phase 起点 commit·跑 smoke 确认 baseline
- **Ship 后回滚**·若 1.3.0.0 ship 后用户报严重 bug·下一热更 (1.3.0.1) 设 `P.conf.useNewKeju = false`·旧流程默认·新流程等修

**老存档 migration**·一次性·若 migration 失败·**回退·保留 v1 数据**·log warning·**不破坏存档**·user 可手动重启或 contact。

### 19.6·总 sprint 估时修订

| Phase | 原估 | v2 调整 (含 Slice 0.7) |
|---|---|---|
| Phase 0 | 1.5-2.5 d | **2.5-4 d** (+1-1.5 d for Slice 0.7) |
| Phase 1 | 5-7 d | 5-7 d (无变) |
| Phase 2 | 10-15 d | 10-15 d |
| Phase 3 | 9-15 d | 9-15 d |
| Phase 4 | 4-6 d | 4-6 d |
| Phase 5 | 5-8 d | 5-8 d |
| **总** | **35-52 d** | **36-55 d** |

---

## v2 修订总览 (2026-05-22 post-廷议-incident rebuild)

| # | 章节 | 加什么 |
|---|---|---|
| §16 | 算法 / 公式表 | F1/F2/F3 完整公式 + 阈值 / 主考 4 属性派生 / crystallization 算法 / 改革浪潮触发 / 弊案触发 |
| §17 | 集成接口 | 廷议 sprint 27 tag 映射 / 6 系统翻新 partyRef migration / admin_division block 处理 / 常朝 selfReact 复用 |
| §18 | Phase 0 + backlog | Slice 0.7 共性 paradigm research doc (新加 1 slice) / 察举九品 backlog doc / Slice 14 vs 16 职责明化 |
| §19 | ship / 灰度 / 回滚 | Phase 3 ship 1.3.0.0 / P.conf.useNewKeju flag / scenario 可配 vs hardcode 边界 / smoke block 规则 / 3 级回滚 |

---

## 20·v3 修订 (post-game-audit·2026-05-22)

**触发**·4 路并行 audit (科举 runtime / 朝议 / char schema / endturn-memorial) 找出 plan v2 跟实游戏 12 处 mismatch·按生硬度排序·

### 20.1·【新 Slice 0.3】·数据结构升级 (Phase 0 prep)·~2 d

**问题**·plan v2 §16.4/16.5 假设的字段·在实剧本中是字符串或不存在·

| plan 假设 | 实剧本数据 | 影响 |
|---|---|---|
| `ch.personality.{rigor/honor/boldness/...}` 8D 数值子字段 | `personality: "刚烈·多疑·勤政·急切·寡恩·自苦"` 字符串 | crystallization + 主考派生**全废** |
| `ch.learning.{confucian/statecraft/poetry}` subkey | `learning: "皇子·经筵"` 单层字符串 | 学派偏好生成全废 |
| `ch.status='秀才/举人/进士/翰林'` 科举身份 | `status: "良民(士)/皇族"` 社会阶层 | F1 公式 0 命中 |
| `ch.origin` 籍贯 | 实际字段名 `ch.birthplace` | 简单 alias 不阻断 |

**Slice 0.3·数据结构升级**·

```js
// 1. personality 拆 8 字段·**保留旧字符串字段·新加 personality8D 顶层 object**
ch.personality8D = {
  rigor:               0-100,
  honor:               0-100,
  boldness:            0-100,
  rationality:         0-100,
  compassion:          0-100,
  ambition:            0-100,
  greed:               0-100,
  loyalty_to_party:    0-100
};
ch.personality = "刚烈·多疑·..." // 旧字段保留·LLM prompt 仍用·不破坏现 NPC 推演

// 2. learning 拆 subkey·**保留旧字段·新加 learningProfile object**
ch.learningProfile = {
  confucian:    0-100,  // 经史
  statecraft:   0-100,  // 经世
  poetry:       0-100,  // 诗赋
  philosophy:   0-100,  // 理学
  practical:    0-100   // 实学
};
ch.learning = "皇子·经筵" // 旧字段保留

// 3. 新字段·keju_status (status 不动·status 现是社会阶层)
ch.keju_status = '秀才' | '举人' | '进士' | '翰林' | '庶吉士' | null;
// 老剧本 char default null·新进士 (Slice 8) 写入

// 4. origin → birthplace alias·plan 文字改 ch.birthplace
// (代码里 plan §16.5 step 1 origin 改 birthplace)

// 5. P.keju._historicalFiguresUsed·已存在 (audit 1 确认)·不动
```

**填充策略·老剧本 char 字段 default**·

```js
function _kjUpgradeCharSchema(ch) {
  // personality8D·若缺·按 personality 字符串关键词推断默认
  if (!ch.personality8D) {
    ch.personality8D = _kjInferPersonality8D(ch.personality || '');
    // 推断 e.g. "刚烈" → boldness+30·"多疑" → rationality+20
    // 详细映射表见 web/data/personality-keyword-map.json (Slice 0.3 生成)
  }
  
  // learningProfile·按 learning 关键词推断
  if (!ch.learningProfile) {
    ch.learningProfile = _kjInferLearningProfile(ch.learning || '');
    // "经筵" → confucian+40·"理学" → philosophy+50·etc
  }
  
  // keju_status·按 ch.title/学位 关键词
  if (!ch.keju_status) {
    if ((ch.title || '').includes('翰林')) ch.keju_status = '翰林';
    else if ((ch.title || '').includes('庶吉士')) ch.keju_status = '庶吉士';
    else if ((ch.officialTitle || '').includes('进士出身')) ch.keju_status = '进士';
    // 等等
  }
  
  // origin (旧名兼容)·若缺·读 birthplace
  if (!ch.origin && ch.birthplace) ch.origin = ch.birthplace;
}
```

**DoD·Slice 0.3**·

1. `_kjInferPersonality8D(str)` 函数·关键词映射表 ≥ 30 词·准确率 ≥ 70%
2. `_kjInferLearningProfile(str)` 函数·关键词映射表 ≥ 20 词
3. `_kjUpgradeCharSchema(ch)` 自动 migration·5 剧本 N chars 全升级·不报错
4. smoke·新进士 crystallization 走通·使用 personality8D + learningProfile + keju_status·**不用 plan v2 假设字段名**
5. plan §16.4-16.5 公式同步改字段名 (rigor → personality8D.rigor·confucian → learningProfile.confucian·origin → birthplace·status='秀才' → keju_status='秀才')

**rationale**·

- **保留旧字段** (personality 字符串 + learning 字符串 + status)·**不破坏现 NPC 推演 prompt**
- **新加 personality8D / learningProfile / keju_status**·并列结构·数据冗余但简单
- 老剧本 migration 用关键词推断·**non-perfect 但 ≥ 70%**·sprint 后期可手工 calibrate
- **避免大规模剧本数据重写**·剧本 char 字段不动

### 20.2·sprint dependency 图·廷议 sprint 前置锁

**问题**·plan v2 §17.1 假设廷议 v3 default on + 27 tag 已挂·实际·

- `_cy_pickMode('tinyi')` 硬调 `_ty2_openSetup(setup)` (v2)·v3 是死代码
- 朝议常朝**只 8 tag**·廷议 sprint Slice 2 才扩到 27 tag
- confront 链 / clientelism 都是廷议 sprint 才加的 mode

**dependency 锁**·

```
廷议大改 sprint·
  Slice 0  (P.conf.useTinyiV3 flag + baseline)            ← 必须 done
  Slice 2  (议题 tag 扩 27 + 映射)                          ← 必须 done
  Slice 5  (10 mode 全实现·含 confront / clientelism)       ← 必须 done

  ↓ block ↓

科举大改 sprint·
  Phase 2 (Slice 4-7) — 顶层政治事件层·走廷议 v3 议题
```

**plan §17.1 修订**·把"前提·廷议 sprint Slice 0+2+5 已完成"明示·

```markdown
**前置条件** (block 关系)·

科举 Phase 2 (Slice 4-7) 启动前·**必须**·
  ✅ 廷议 sprint Slice 0 done (P.conf.useTinyiV3 flag 加 + v3 可激活)
  ✅ 廷议 sprint Slice 2 done (27 tag 完整)
  ✅ 廷议 sprint Slice 5 done (confront mode 工作)

若廷议 sprint 未完成·
  - 科举 Phase 0/1/3-5 仍可独立做 (跟廷议无关)
  - 科举 Phase 2 Slice 4-7 **block**·等廷议 sprint 完后接入
  - 或·廷议 sprint + 科举 sprint **串行**·廷议先 ship 后科举启动
```

**总 sprint 工时再调** (v3)·

```
廷议大改 sprint·     22-25 d  (已 plan)
科举大改 sprint·     36-55 d  (v2) + Slice 0.3 数据升级 ~2 d + Slice 5.5 ~1.5 d = 39.5-58.5 d (v3)

并行 vs 串行·
  并行·  Phase 0/1/3-5 独立·Phase 2 block 在廷议 sprint 完后接·实质 partial 串行
  串行·  廷议 sprint 先 ship → 科举 sprint 完整跑·~62-83 d 总
```

### 20.3·【新 Slice 5.5】·tension + corruption 架架·~1.5 d

**问题**·plan v2 §16.6/§16.7 用 `P.factions[*].tension` 和 `ch.corruption / _corrCalcExaminerCorruption()`·**实游戏不存在**·

- tension 仅在 sc0 LLM prompt 论述里·**非结构化字段**
- 腐败仅在 `GM.corruption.subDepts.{central/provincial/...}` (按部门)·**无 ch.corruption**

**Slice 5.5 工作** (Slice 5 后 / Slice 6 前)·

**Part A·建 GM._factionTension namespace**·

```js
function _kjInitFactionTension() {
  if (!GM._factionTension) GM._factionTension = {};
  for (const party of _kjGetAllPartyNames()) {
    if (!(party in GM._factionTension)) GM._factionTension[party] = 0; // 0-20
  }
}

function _kjUpdateFactionTension(eventLog) {
  // eventLog·一次科举 / 朝议 / 弊案 等输出
  // 加权·跟自身利益冲突·tension +0.5 ~ +3
  // 各党 tension decay·每 endturn 月衰 5%
  
  for (const event of eventLog) {
    if (event.partyA && event.partyB && event.tilt === 'oneParty') {
      GM._factionTension[event.partyB] += 1;
    }
    if (event.kejuOutcome && event.kejuOutcome.minorityParty) {
      GM._factionTension[event.kejuOutcome.minorityParty] += 2;
    }
  }
}

function _kjCalcTotalPartyTension() {
  return Object.values(GM._factionTension || {}).reduce((a, b) => a + b, 0);
}

function _kjGetEnemyParties(partyName) {
  // 简化·按 scenario.partyEnmity 配置·或按 party.alignment 反向
  const enmity = scenario?.partyEnmity?.[partyName] || _kjDefaultEnmity(partyName);
  return enmity;  // ['阉党', '齐党'] etc
}

function _kjGetPartyLeaders(partyName) {
  return GM.chars.filter(c => c.alive && c.party === partyName)
                  .sort((a, b) => (b.prestige || 50) - (a.prestige || 50))
                  .slice(0, 3)
                  .map(c => c.name);
}
```

**Part B·定义 `_corrCalcExaminerCorruption(ch)` 算法**·

```js
function _corrCalcExaminerCorruption(ch) {
  // 现 GM.corruption.subDepts 按部门·examiner 个人 corruption 派生
  
  // 1. 部门级·examiner 所在部门腐败度
  const deptKey = _kjMapTitleToDept(ch.officialTitle); // 礼部尚书 → 'central' etc
  const deptCorruption = GM.corruption?.subDepts?.[deptKey] || 30; // default 30
  
  // 2. 派系级·examiner 党派的腐败传染
  const partyCorr = _kjCalcPartyCorruption(ch.party);
  
  // 3. 个人调整·greed - honor·-50 ~ +50
  const personalAdj = (ch.personality8D?.greed || 50) - (ch.personality8D?.honor || 50);
  
  // 合成·部门 60% + 派系 30% + 个人 10%
  const score = 0.6 * deptCorruption + 0.3 * partyCorr + 0.1 * (personalAdj + 50);
  return Math.min(100, Math.max(0, score));
}

function _kjCalcPartyCorruption(partyName) {
  // 按 entrenched factions 判断·或党派成员的部门腐败均值
  if (GM.corruption?.entrenchedFactions?.includes(partyName)) return 70;
  const members = GM.chars.filter(c => c.party === partyName);
  const avgDeptCorr = _avg(members.map(m => 
    GM.corruption?.subDepts?.[_kjMapTitleToDept(m.officialTitle)] || 30
  ));
  return avgDeptCorr;
}
```

**Part C·sc0 LLM tension 抽取**·

```js
// endturn ai step 之后·sc0 prompt 内 LLM 论述如有 "X 党反感 +1" 等·结构化抽
function _kjExtractTensionFromSc0(sc0Output) {
  // sc0 output·{factions: [{name, tension_delta, reason}]}·LLM 可输出
  // strict schema 在 Slice 5.5 加
  for (const f of sc0Output.factions || []) {
    if (typeof f.tension_delta === 'number') {
      GM._factionTension[f.name] = (GM._factionTension[f.name] || 0) + f.tension_delta;
    }
  }
}
```

**DoD·Slice 5.5**·

1. `GM._factionTension` 顶层 namespace·初始化所有 scenario 党派为 0
2. `_kjUpdateFactionTension(eventLog)` 工作·一次科举 / 朝议 / 弊案 后 tension 变化合理
3. `_kjCalcTotalPartyTension()` 返合理 sum·Slice 6 改革浪潮触发用
4. `_corrCalcExaminerCorruption(ch)` 返 0-100·依赖现 GM.corruption.subDepts + ch.personality8D
5. `_kjGetEnemyParties(party)` / `_kjGetPartyLeaders(party)` 工作
6. sc0 LLM tension 抽取 ≥ 50% 命中 (LLM 论述常含 tension hint·schema 严格化)·结构化写入 GM._factionTension
7. smoke·tension + corruption 双数据流通·Slice 6 触发条件全可计算·Slice 7 弊案触发条件全可计算

### 20.4·Slice 7 cycle bug 修·不依赖进士派系

**问题**·plan v2 §16.7 弊案触发条件 C·

```js
const unsatisfied = jinshi.filter(j => j.party !== examinerParty && j.rank > 10).length;
```

但·**Slice 7 弊案触发跑时·Slice 8/10 还没做·j.party 全空**·条件 C 0 命中。

**v3 修订**·改弊案触发条件·**不依赖进士派系**·

```js
function _kjScandalTriggers(examOutcome) {
  // 条件 A·examiner 个人腐败 (依赖 Slice 5.5 _corrCalcExaminerCorruption)
  const corruptionScore = _corrCalcExaminerCorruption(examOutcome.examiner);
  const condA = corruptionScore >= 50;
  
  // 条件 B·examiner 党派 vs 反方党派 tension (依赖 Slice 5.5 GM._factionTension)
  const examinerParty = examOutcome.examiner.party;
  const enemyParties = _kjGetEnemyParties(examinerParty);
  const totalEnemyTension = enemyParties.reduce((sum, p) =>
    sum + (GM._factionTension?.[p] || 0), 0
  );
  const condB = totalEnemyTension >= 8;
  
  // 条件 C (v3 改)·examiner 偏好程度·examiner.factionBias × 录取偏倚
  const factionBias = examOutcome.examinerView?.factionBias || 0.3;
  const acceptedSameParty = (examOutcome.placements || []).filter(j =>
    j._examinerDerivedParty === examinerParty  // crystallization 时记录·非 j.party
  ).length;
  const totalAccepted = examOutcome.placements?.length || 20;
  const samePartyRatio = acceptedSameParty / totalAccepted;
  const condC = factionBias > 0.6 && samePartyRatio > 0.7;  // 录取过分偏一党
  
  // 触发·3 选 2
  const matched = [condA, condB, condC].filter(Boolean).length;
  if (matched >= 2) {
    return {
      severity: matched === 3 ? 'major' : 'minor',
      reasons: [condA && 'corruption', condB && 'partyConflict', condC && 'factionBias'].filter(Boolean),
      accuserPool: enemyParties.flatMap(p => _kjGetPartyLeaders(p))
    };
  }
  return null;
}
```

**变化**·

- 条件 C 改用 examiner 4 属性派生 (Slice 5 done·factionBias 已有) + 录取偏倚 (Slice 8 crystallization 记录派生派系)
- **不依赖进士 ch.party** (Slice 10 才写)
- **依赖 Slice 8 _examinerDerivedParty 元字段** (crystallization 时记录原本应得派系·跟 examiner 党派对比)

**Slice 8 配合修订**·crystallization 加 `j._examinerDerivedParty = examiner.party`·**不等 Slice 10**。

### 20.5·Slice 12 endturn step 插入位置·决策

**问题**·plan v2 Slice 12 "endTurn 副作用·新 step"·没说插哪。

**3 选项 + 决策**·

| 选项 | 插哪 | 优点 | 缺点 |
|---|---|---|---|
| A·`systems` step 内扩 | tm-endturn-pipeline-steps.js L185 systems step 内·跟现 keju 推进 / 经济 / 腐败 tick 并排 | 不增加管道层级·跟现 paradigm 一致 | 跟其他子系统 tick 耦合·debug 难 |
| B·插新 step | systems step 后·render-and-finalize 前 | 显式·解耦 | 增加管道层级 |
| C·deferred phase | render-and-finalize 之后·courtClose 后 | 异步·跟 turn 切换无关 | 玩家本回合看不到副作用·UI 延迟一回合 |

**v3 决策·选 A** (systems step 内扩)·

```js
// tm-endturn-pipeline-steps.js·systems step·现已有
async function _stepSystems(ctx) {
  await keju.tickAdvance(ctx);             // 现有·科举推进
  await economy.tick(ctx);                  // 现有
  await corruption.tick(ctx);               // 现有
  
  // v3 新·F1-F3 更新 + 副作用 (Slice 12)
  await _kjUpdateIndicators(ctx);           // 更新 P.keju.indicators
  await _kjApplyIndicatorSideEffects(ctx);  // 副作用·rebel概率 / 派系cohesion / 边镇离心
}
```

**rationale**·

- **跟现 paradigm 一致** (跟 keju 推进 / 经济 / 腐败 同 step)·学习成本低
- **不增加管道层级** (现 6 step 不动)
- **debug 难度可接受** (副作用日志加 step 内 tag)
- 副作用本回合可见·UI 不延迟

### 20.6·plan 函数·new vs existing 标注

**问题**·plan v2 §16 / §17 引用了一堆 `_kjGetEnemyParties / _kjGetPartyLeaders / _corrCalcExaminerCorruption / _kejuExaminerView / _kjCrystallizeJinshi / etc`·读 plan 的人不知道哪些**新建**·哪些**已有**。

**v3 全文加 [new] vs [existing] tag**·

```
[existing] (现已有·不动)·
  startKejuByMethod              (tm-keju.js L247)
  _finalizeStageAndAdvance        (runtime L431)
  _kejuArchiveExam                (runtime L557)
  examiner_select                 (runtime L698)
  P.keju.{enabled, history, currentExam, stageDurationDays, attributeBonus,
           historicalFigurePolicy, _historicalFiguresUsed, tiers, chiefExaminer,
           alternativeSystem}      (runtime L27-83)
  P.keju.history.push             (runtime L569-580)
  GM._pendingMemorials            (tm-authority-complete.js)
  GM._pendingTinyiTopics          (tm-chaoyi-tinyi.js)
  GM.corruption.subDepts          (corruption engine Phase 3 R9)
  endturn pipeline 6 step         (tm-endturn-pipeline-steps.js L185)

[new] (本 sprint 新建)·
  _kjV2_startKejuByMethod         (Slice 1·KejuTier 流程)
  _kjCalcF1 / F2 / F3             (Slice 3)
  P.keju.indicators               (Slice 3)
  _kejuExaminerView               (Slice 5·4 属性派生)
  _kjCrystallizeJinshi            (Slice 8)
  _kjMulberry32 / _kjHashSeed     (Slice 8·RNG)
  _kjPickWeightedProvince         (Slice 8)
  _kjGenJinshiName                (Slice 8)
  _kjReformTriggers               (Slice 6)
  _kjScandalTriggers              (Slice 7·v3 改不依赖进士派系)
  _kjGetEnemyParties              (Slice 5.5)
  _kjGetPartyLeaders              (Slice 5.5)
  _corrCalcExaminerCorruption     (Slice 5.5)
  _kjCalcPartyCorruption          (Slice 5.5)
  _kjMapTitleToDept               (Slice 5.5)
  GM._factionTension              (Slice 5.5)
  _kjUpdateFactionTension         (Slice 5.5)
  _kjCalcTotalPartyTension        (Slice 5.5)
  _kjUpdateIndicators             (Slice 12·step A 内)
  _kjApplyIndicatorSideEffects    (Slice 12)
  _kjUpgradeCharSchema            (Slice 0.3)
  _kjInferPersonality8D           (Slice 0.3)
  _kjInferLearningProfile         (Slice 0.3)
  
[modified] (现有·本 sprint 改)·
  _kejuArchiveExam                (Slice 8·改 lazy → eager·进士入 GM.chars)
  startKejuByMethod               (Slice 4·包装走廷议 v3 议题)
  examiner_select                 (Slice 5·走 _kejuExaminerView 派生)
  _kejuUpgradeExamSchema          (Slice 1-2·扩 stage→tier index 映射)
  _cy_pickMode                    (Slice 0·廷议 sprint·P.conf.useTinyiV3 gate)

[new schema field]·
  ch.personality8D                (Slice 0.3·新顶层 object·并列 personality 字符串)
  ch.learningProfile              (Slice 0.3·新顶层 object·并列 learning 字符串)
  ch.keju_status                  (Slice 0.3·新顶层字段·status 不动)
  ch._mentorRef                   (Slice 9·单字段·string·指向主考 name)
  P.keju.indicators               (Slice 3·新顶层·{f1, f2, f3})
  GM._factionTension              (Slice 5.5·新顶层·{partyName: number 0-20})
  
[unchanged] (跟科举 sprint 无关·已有)·
  ch.personality                  (字符串·LLM prompt 用·并列 personality8D)
  ch.learning                     (字符串·LLM prompt 用·并列 learningProfile)
  ch.status                       (社会阶层·并列 keju_status·**不冲突**)
  ch.party                        (字符串·Slice 9 直接写)
  ch.birthplace                   (籍贯·plan v3 把 origin 改 birthplace)
```

### 20.7·sprint 总工时再调 v3

```
Phase 0·Prep                v2: 2.5-4 d   →  v3: 4.5-6.5 d  (+2 d Slice 0.3 数据升级)
Phase 1·共性主干            v2: 5-7 d     →  v3: 5-7 d      (无变)
Phase 2·顶层政治事件        v2: 10-15 d   →  v3: 11.5-16.5 d (+1.5 d Slice 5.5 tension/corruption)
Phase 3·底层身份与派系      v2: 9-15 d    →  v3: 9-15 d
Phase 4·三指针闭环          v2: 4-6 d     →  v3: 4-6 d
Phase 5·朝代差异化 + 编辑器  v2: 5-8 d     →  v3: 5-8 d

总            v2: 36-55 d   →  v3: 39.5-58.5 d  (+3.5 d)

slice 数        v2: 19       →  v3: 21  (新 Slice 0.3 + Slice 5.5)
```

### 20.8·v3 修订总览

| 项 | v2 → v3 |
|---|---|
| 新 Slice 0.3·数据结构升级 | Pre-Slice 加 Phase 0·~2 d·解极生硬 1-4 |
| sprint 依赖·廷议前置锁 | §17.1 + §20.2 明示 block 关系·解 5 |
| 新 Slice 5.5·tension + corruption 架架 | Slice 5 后 Slice 6 前·~1.5 d·解 6-7 |
| Slice 7 cycle bug 修 | 不依赖进士派系·改用 examinerDerivedParty + factionBias·解 cycle |
| Slice 12 endturn step | 决策选 A (systems 内扩)·解 11 |
| new vs existing 函数标注 | §20.6 全 [new] / [existing] / [modified] / [unchanged] tag·解 8 |
| 总工时 +3.5 d | 36-55 → 39.5-58.5 d |
| 总 slice +2 | 19 → 21 |

**audit 完成·plan v3 实施 ready**。所有 plan 假设字段 / 函数都跟实游戏对账·new vs existing 全标·sprint 依赖明示。下一步·user 拍板 → 启动 Slice 0 + Slice 0.3 + Slice 0.5 + Slice 0.7 Phase 0 4 slice 同时开。

---

## 21·v4 修订 (round 2 paradigm-audit·post-design-rule-recheck·2026-05-23)

**触发**·按 user 锁定的 3 个 design rule 重审 plan v3·

- [feedback_editor_game_relation] 新机制必须同时有编辑器面 + 运行时面 + AI 面
- [feedback_tool_vs_system_costs] 玩家工具 vs 世界系统的代价区分
- [feedback_audit_layers_ui_vs_mechanic] UI audit 必三层·穿透到 game state machine + 反馈循环

发现 plan v3 (12 处 v2 mismatch 解了) 仍**违反这 3 rule 的 5 类生硬**·v4 全补。

### 21.1·三面统一补全 (A 组)

**rule**·新机制三面必须 ship·plan v3 几乎只 runtime 面·**5 处 ❌ editor + 6 处 ❌ AI**·必须补。

#### 21.1.A·editor 面 5 处补全

| 机制 | 现 plan | v4 补 |
|---|---|---|
| **personality8D** (Slice 0.3) | runtime only | **editor-crud.js char editor 加 8 数值 input** (rigor/honor/...·每个 0-100 slider)·剧本可手填覆盖关键词推断 |
| **learningProfile** (Slice 0.3) | runtime only | **editor-crud.js 加 5 数值 input** (confucian/statecraft/poetry/philosophy/practical)·剧本可手填 |
| **keju_status** (Slice 0.3) | runtime only | **editor-crud.js 加 dropdown**·秀才/举人/进士/翰林/庶吉士/null·剧本预置 |
| **examiner 预倾向** (Slice 5) | runtime only | **editor-game-systems.js kejuSystem panel 加 examinerBias 段**·剧本可预置某 chars "tinted examiner candidate" tag |
| **GM._factionTension 初始** (Slice 5.5) | runtime only | **editor-game-systems.js 加 partyTensionInit 段**·剧本可初始化各党 tension 0-20 (e.g. 天启七年·阉党 tension=8 起步) |
| **改革主题池** (Slice 6) | hardcode | **editor-game-systems.js 加 reformThemes 段**·剧本自定义主题 + 改字段映射 (e.g. "本朝特设 X 改革") |
| **历史进士预置** (Slice 8) | runtime only | **editor-crud.js 加 historicalJinshi 段**·剧本预置·避免重 crystallize |
| **indicators 阈值** (Slice 3) | scenario.keju.indicators (说了可配·没说编辑器) | **editor-game-systems.js indicators 段**·F1/F2/F3 各 3 阈值 (critical/low/high) 编辑器 input |

**新 Slice 14.5·编辑器三面补全** (Phase 5 内)·~1.5 d·

```
Slice 14.5·把上面 8 处 editor 字段全加到 editor-game-systems.js 
            + editor-crud.js·跟现 paradigm 一致 (label / input / saveCharCrud 兼容)
```

#### 21.1.B·AI 面 6 处补全

**核心问题**·LLM 不读新数值字段·**只读 personality / learning 老字符串**·新数值 0 贡献。

**v4 修订**·LLM prompt 模板里**双轨注入**·

| sc | 现 prompt 段 | v4 加 |
|---|---|---|
| **sc1b·文事段** | 现读 ch.party / ch.officialTitle | **加注入** `<8D>{rigor: 70, honor: 85, ...}</8D>` + `<learning>{confucian: 60, ...}</learning>` + `<科举身份>进士</科举身份>` |
| **sc0·势力论述** | 现读派系名 + tension 论述 | **加 schema 抽取** `factions: [{name, tension_delta: ±N}]`·Slice 5.5 _kjExtractTensionFromSc0 用 |
| **sc1q·人物对话** | 现读 personality 字符串 | **加 8D 简略提示** "本性·rigor:严谨/honor:守节/boldness:..." 6-10 字概括·LLM 用风格 |
| **sc16·memorial** | 现 memorialType 几种 | **扩 union 加 'impeach_examiner'** + 弊案 evidence 段 prompt |
| **sc1b·主考描述** | 现存 ch.party / intelligence / stance | **加 4 属性派生注入** `<主考>preferContent: 八股, preferRegion: 河南, strictness: 75, factionBias: 0.7</主考>`·LLM 用以决定阅卷倾向 |
| **新进士 persona text** (Slice 8) | runtime crystallize 后没说 | **新加 _kjGenJinshiPersonaText(j)**·按 j.personality8D + learningProfile + party + origin 生成 60-100 字简介·写入 ch.personaText 字段·后续 LLM prompt 用 |

**新 Slice 5.7·LLM prompt 三面对齐** (Slice 5 后 Slice 5.5 后)·~1 d·

```
Slice 5.7·扩 sc1b / sc0 / sc1q / sc16 / sc1b-examiner prompt 模板·
            注入 personality8D / learningProfile / keju_status / examiner 4 属性 / tension
            schema 严格化 sc0 factions[].tension_delta union 字段
            新加 _kjGenJinshiPersonaText 函数·crystallize 后注入 ch.personaText
```

**rationale**·

- editor 面让**剧本设计师**能预置数据·不靠 70% 关键词推断
- AI 面让 **LLM 读新数值**·真贡献·不是 dead data
- 三面同步·才符合 [feedback_editor_game_relation] 核心 rule

### 21.2·三大玩家动作代价明示 (B 组)

**rule** [feedback_tool_vs_system_costs]·**工具型** = 零代价即时·**系统型** = 挂政治后果。三动作 v4 全归"系统型"·明示代价·

#### 21.2.A·主考钦点 (Slice 5)

```js
function _kjEmperorPickExaminer(emperorChoice, candidates, scenarioCtx) {
  // 系统型·明示代价·
  const picked = emperorChoice;
  
  // 代价 1·picked.party tension +1 (该党被宠·其他党 tension +0.5)
  const enemyParties = _kjGetEnemyParties(picked.party);
  for (const p of enemyParties) {
    GM._factionTension[p] = (GM._factionTension[p] || 0) + 1.0;
  }
  
  // 代价 2·非 picked 候选 (其他被 NPC 推的 candidates)·loyalty -2·affinity.toEmperor -1
  for (const other of candidates.filter(c => c.name !== picked.name)) {
    other.loyalty = Math.max(0, (other.loyalty || 50) - 2);
    other.affinity = other.affinity || {};
    other.affinity.toEmperor = Math.max(-100, (other.affinity.toEmperor || 0) - 1);
  }
  
  // 代价 3·若 picked 来自小党·picked.party affinity +5 (受宠)
  if (_kjGetPartySize(picked.party) < 5) {
    _kjModifyPartyAffinity(picked.party, 5);
  }
  
  // 代价 4·若 picked 是廷议 v3 召集的 attendees 中票数最低的·朝野议"陛下违众钦点"
  if (_kjWasMinorityInTinyiVote(picked)) {
    addEB('陛下违众钦点·朝中议论纷纷');
    GM._convening_民意度 = (GM._convening_民意度 || 0) - 5;  // 跟廷议 sprint 民意度联动
  }
}
```

**DoD·Slice 5 v4**·钦点动作记 5 处代价·邸报有可见反馈。

#### 21.2.B·选官钦点 (Slice 11)

```js
function _kjEmperorPickOfficeAllocation(jinshi, office, scenarioCtx) {
  // 系统型·明示代价·
  
  // 代价 1·jinshi.party 跟 office department 联动
  const deptParty = _kjGetDepartmentDominantParty(office.department);
  if (deptParty && deptParty !== jinshi.party) {
    GM._factionTension[deptParty] = (GM._factionTension[deptParty] || 0) + 0.5;
  }
  
  // 代价 2·若 jinshi 是状元 + 不直翰林·该状元 loyalty -3·prestige -5 (按朝代规矩)
  if (jinshi.keju_status === '状元' && office.deptType !== 'hanlin' && _isMingQingDynasty()) {
    jinshi.loyalty -= 3;
    jinshi.prestige -= 5;
    addEB('陛下违制·状元不入翰林·朝野议论');
  }
  
  // 代价 3·若 office.department 是肥缺·而 jinshi 是反方党派·该党 affinity +3
  if (_kjIsLucrativeOffice(office) && jinshi.party !== _kjGetPlayerPartyAlign()) {
    _kjModifyPartyAffinity(jinshi.party, 3);
  }
  
  // 代价 4·跟廷议 sprint 选官分配议题挂·走廷议 v3 走 [official-selection] tag
}
```

**DoD·Slice 11 v4**·分配动作记 4 处代价。

#### 21.2.C·改革决策 (Slice 6)

```js
function _kjPlayerDecideReform(theme, decision, scenarioCtx) {
  // 系统型·明示代价·
  
  const reformerParty = _kjGetReformerParty(theme);  // 主张该主题的党
  const opposerParty = _kjGetOpposerParty(theme);    // 反对的党
  
  if (decision === 'accept') {
    // 代价 1·改革派 prestige +5·loyalty +3
    _kjModifyPartyMembers(reformerParty, { prestige: +5, loyalty: +3 });
    // 代价 2·保守派 loyalty -3·tension +2
    _kjModifyPartyMembers(opposerParty, { loyalty: -3 });
    GM._factionTension[opposerParty] = (GM._factionTension[opposerParty] || 0) + 2;
    // 代价 3·长期·F1 / F2 / F3 按主题 modifier (e.g. "广开科目" → F1 +10)
    _kjApplyReformIndicatorMods(theme);
    // 代价 4·考试内容 / 反舞弊 toggle / 解额 改 (按 reformTheme.changeMap)
    _kjApplyReformParadigmChanges(theme);
  } else if (decision === 'reject') {
    // 代价 1·改革派 loyalty -3·prestige -2 (失望)
    _kjModifyPartyMembers(reformerParty, { loyalty: -3, prestige: -2 });
    // 代价 2·保守派 affinity +2 (满意)
    _kjModifyPartyAffinity(opposerParty, 2);
    // 代价 3·F1-F3 不变·但 timer fallback 15 年冷却内不再触发
    GM._reformCooldown = GM.year + 15;
  } else if (decision === 'defer') {
    // 代价 1·两方都不满·loyalty -1 both·拖延
    _kjModifyPartyMembers(reformerParty, { loyalty: -1 });
    _kjModifyPartyMembers(opposerParty, { loyalty: -1 });
    // 代价 2·F1-F3 跌·状态继续·原触发条件不变·下回合可能再触发
  }
}
```

**DoD·Slice 6 v4**·3 决策路径 (accept/reject/defer) 各记 ≥3 代价·邸报可见。

### 21.3·event-based 反馈循环 (C 组)

**rule** [feedback_audit_layers_ui_vs_mechanic]·必穿透到 state machine + 反馈循环·**线性数值惩罚不算反馈循环**·必须 event-based。

#### 21.3.A·F1 跌·罢考请愿事件链

```js
function _kjF1IndicatorSideEffects(f1Value) {
  // v3 原·起义概率 +5%/turn (数值)·v4 改为 event-based
  
  if (f1Value < 30 && f1Value >= 20) {
    // tier 1·士论沸腾·邸报头条事件
    if (!GM._pendingF1Events?.tier1) {
      GM._pendingF1Events = GM._pendingF1Events || {};
      GM._pendingF1Events.tier1 = {
        turn: GM.turn + 2,
        type: 'public_opinion_brewing',
        text: '今夏会试落第者千余人·聚于贡院前痛斥科举失公·人心浮动',
        severity: 'minor',
        eventBus: true,  // 写邸报
        followUp: { rebelProbBonus: 3, durationTurns: 5 }  // 后续影响
      };
    }
  }
  
  if (f1Value < 20 && f1Value >= 10) {
    // tier 2·集体罢考请愿
    if (!GM._pendingF1Events?.tier2) {
      GM._pendingF1Events.tier2 = {
        turn: GM.turn + 1,
        type: 'collective_petition',
        text: '士子聚伏阙·痛斥科举 / 联名请愿·名单中含名臣门生数人',
        severity: 'major',
        memorial: { from: '士林代表', type: 'request_reform', urgency: 'high' },
        chaoyi_topic: '议平息士论 / 重开科目',  // 自动进 GM._pendingTinyiTopics
        followUp: { rebelProbBonus: 5, partyTension: { '清流': +3 } }
      };
    }
  }
  
  if (f1Value < 10) {
    // tier 3·罢考起义
    if (!GM._pendingF1Events?.tier3) {
      GM._pendingF1Events.tier3 = {
        turn: GM.turn,
        type: 'scholar_revolt',
        text: '南方士林倡议罢考·有举人率众入城闹事·遣使弹压',
        severity: 'critical',
        crisisEvent: true,
        followUp: { 
          rebelProbBonus: 15, 
          spawnFaction: '清流罢考派',  // 新派系 spawn
          turnsToRecover: 30
        }
      };
    }
  }
}
```

**对玩家可见**·

```
邸报头条·"南方士林倡议罢考"
事件 modal·"陛下·南方士林倡议罢考·有举人率众入城闹事·请陛下旨"
选项·[严办主谋] [安抚士林] [广开科举] [置之不理]
每选项后续效果明示·loyalty / tension / F1-F3 调整
```

#### 21.3.B·F2 跌·门阀沙龙崛起事件

```js
function _kjF2IndicatorSideEffects(f2Value) {
  // v3 原·派系 cohesion +0.01/turn (数值)·v4 改 event-based
  
  if (f2Value < 20 && f2Value >= 10) {
    // tier 1·老牌派系强化 cohesion +0.5 (一次性·非每 turn)
    _kjGetEntrenchedParties().forEach(p => _kjModifyPartyMembers(p, { cohesion: +0.5 }));
  }
  
  if (f2Value < 10) {
    // tier 2·门阀沙龙崛起·新派系 spawn
    if (!GM._pendingF2Events?.tier2) {
      GM._pendingF2Events.tier2 = {
        turn: GM.turn + 3,
        type: 'aristocratic_salon_rise',
        text: '京中世家子弟结社·议政·渐成气候·或为新派系',
        spawnFaction: { name: '世家清议党', alignment: 'conservative', initialMembers: 8 },
        memorial: { from: '都察院', type: 'warning_aristocratic', text: '京师世家结党议政·请陛下察' }
      };
    }
  }
}
```

#### 21.3.C·F3 跌·边远士子拒考事件

```js
function _kjF3IndicatorSideEffects(f3Value) {
  if (f3Value < 30 && f3Value >= 15) {
    // tier 1·边镇 NPC 上书 (现 plan v3 -1/turn·v4 改 event)
    if (!GM._pendingF3Events?.tier1) {
      const borderNpcs = GM.chars.filter(c => c.alive && _isFrontierNpc(c));
      const speaker = borderNpcs.find(c => (c.prestige || 50) >= 60);
      if (speaker) {
        GM._pendingF3Events.tier1 = {
          turn: GM.turn + 1,
          type: 'frontier_official_petition',
          memorial: {
            from: speaker.name,
            type: 'border_complaint',
            text: '臣' + speaker.name + '·伏闻今届科举·边远诸省解额减·寒士绝望·恐生异志'
          }
        };
      }
    }
  }
  
  if (f3Value < 15) {
    // tier 2·边远士子拒不赴试
    if (!GM._pendingF3Events?.tier2) {
      GM._pendingF3Events.tier2 = {
        turn: GM.turn + 2,
        type: 'frontier_boycott',
        text: '滇黔陕甘四省·士子绝迹会试·当地总督上奏·恳请陛下察',
        followUp: { 
          quotaModifier: { south: -0.2 },  // 南方解额自然减
          partyTension: { '南方派': +5 }
        }
      };
    }
  }
}
```

**新 Slice 12.5·event-based 副作用** (Slice 12 后)·~1.5 d·

```
Slice 12.5·把 F1/F2/F3 数值副作用全改 event-based·
            写 _kjF1IndicatorSideEffects / F2 / F3·tier 化阈值
            写 endturn pipeline 钩子·检查 _pendingF*Events·按 turn 触发事件
            写 邸报头条 + 事件 modal 显示·跟现 event-system 集成
            玩家可见的因果链完整·"F1 跌 → 罢考事件 → loyalty / tension / 起义"
```

### 21.4·廷议 + 科举 5 处交叉点 (D 组)

#### 21.4.1·廷议召集制 vs 科举主考人选

**问题**·廷议召集制 6 资格筛默认按品级·主考人选可能正三品-翰林学士·会被过滤·

**v4 修订**·廷议 sprint Slice 2.5 召集制·**topicSpecificRequired** 加 'examiner-pick' 议题特定·

```js
// 廷议 plan §E.5 配置加·
'examiner-pick': ['首辅', '次辅', '礼部尚书', '翰林学士', '翰林侍读', '翰林编修']
// 翰林虽中低品·按层 4 (议题特定) 必召
```

**plan v4 §21.4.1 同步**·科举 plan §17.1 标·"廷议召集制专为 examiner-pick 议题加翰林层"·**跟廷议 sprint 协作**。

#### 21.4.2·新进士发议题 (廷议 E.12) vs prestige 低

**问题**·新进士充任言官·prestige 初始 30-60·按廷议 E.12 言官倾向条件·`class==='kdao' + 言官离心 > 10 + 最近重大事件 → 上书请议`·**但低 prestige 言官发议题·玩家可能 dismiss·无意义**。

**v4 修订**·廷议 sprint E.12 加 prestige 加权·

```js
// 廷议 E.12 v2·
function _ty3_npcProposeTinyi(proposer, type, topic) {
  // v4 加·按 prestige 加权
  const prestigeWeight = (proposer.prestige || 50) / 100;
  if (prestigeWeight < 0.4 && Math.random() > 0.3) {
    // 低 prestige 言官·70% 概率被现实压制·不上书
    return;
  }
  
  // 否则上书·正常
  GM._pendingTinyiTopics.push({
    proposer: proposer.name,
    urgency: prestigeWeight * 10,  // urgency 跟 prestige 联动
    ...
  });
}
```

**plan v4 §21.4.2 同步**·新进士 (低 prestige) **聚啸联名**·5+ 进士联名才上书 (跟廷议 E.12 配合)·

```js
// 科举 plan v4·Slice 8 crystallize 后·新进士行为补
function _kjJinshiCollectiveAction(jinshi_cohort) {
  // 同年进士 (e.g. 同主考 + 同年) 联名上书概率高
  if (jinshi_cohort.length >= 5 && _kjHasGrievance(jinshi_cohort)) {
    GM._pendingMemorials.push({
      from: jinshi_cohort.map(j => j.name).join('·') + ' 等' + jinshi_cohort.length + '人',
      type: 'jinshi_collective',
      text: '同年进士' + jinshi_cohort.length + '人·联名上书议 X',
      severity: 'mild',  // 因为低 prestige·初不严重·但联名增 weight
    });
  }
}
```

#### 21.4.3·廷议 民意度+言官离心 vs 科举 F1-F3

**问题**·4 个全局指标 (廷议·民意度 / 言官离心 ; 科举·F1 / F2 / F3) 各自影响 endturn·**互相牵连可能矛盾**。

**v4 协调表**·

| 指标 | 主导 sprint | 影响 |
|---|---|---|
| 民意度 (廷议) | 廷议 | 廷议召集偏倚·朝中评议 |
| 言官离心 (廷议) | 廷议 | 言官集体罢朝 / 弹劾 |
| F1 士人吸纳 (科举) | 科举 | 罢考请愿 / 起义 |
| F2 官僚流动 (科举) | 科举 | 派系沙龙 / 门阀化 |
| F3 文化整合 (科举) | 科举 | 边远拒考 / 边镇离心 |

**没冲突·并列影响**。但·**民意度 / 言官离心·跟 F1 强联动** (人民 + 言官 = 文官系统底盘)·

```js
function _kjF1AffectsTinyiIndicators(f1Value) {
  // F1 < 20·言官离心 + 5/turn (科举不公·言官代士子愤)
  // F1 < 30·民意度 -2/turn (朝中议事偏倚·士林观望)
}
```

#### 21.4.4·廷议 27 tag vs 科举 5 类议题

**v4 协调·廷议 27 tag 扩到 30 tag·加 3 个 keju-specific**·

```
27 tag (廷议 v1.4)
  +
'examiner-pick'      主考任命 (Slice 5)
'keju-reform'        科举改革 (Slice 6) 
'keju-scandal'       科举弊案 (Slice 7)
```

**Slice 2 (科举) v4 修订**·议题 tag 扩除 27 廷议 tag + 3 keju 专属·共 30 tag。

#### 21.4.5·廷议 confront 链 2 round 限·改革议题对线复杂

**v4 修订**·廷议 sprint Slice 7 (confront 链·maxConfrontChain=2)·**改革议题特例·= 3**·

```js
// 廷议 plan §Slice 7 v4·
const maxChain = topic.tags?.includes('keju-reform') ? 3 : 2;
```

改革议题往返激·**3 round 给改革派 + 保守派 + 折衷派各 1 次完整对线**·跟典型廷议 (2 round) 差异化。

### 21.5·数据 calibration·防串行误差累积 (E 组)

**问题**·Slice 0.3 `_kjInferPersonality8D` 70% 准确·下游串行误差累积 → 弊案触发 ~50%+ 错。

**v4 修订**·

#### 21.5.A·关键 chars 手 calibrate

**Slice 0.3 v4 加**·

```
Slice 0.3 子任务·
  A·关键词推断·覆盖 5 剧本所有 chars·~70% 准确率
  B·关键 chars 手 calibrate (v4 新)·
     - 玩家 (5 剧本各 1)·~5 chars
     - 主要党魁 (东林·阉党·浙党·楚党·齐党 leader)·~10 chars
     - 历代主考 / 教育大臣·~15 chars (如有)
     - 共 ~30 chars 手 calibrate personality8D + learningProfile·提至 95%+
     - 写入 web/data/keju-char-calibration.json·init 时优先读
```

**rationale**·关键 chars 数量少 (~30)·手 calibrate 成本 (~0.5 d) 远比串行误差 50%+ 错的下游成本低。

#### 21.5.B·crystallization seed 防撞

**Slice 8 v4 加**·

```js
function _kjCrystallizeJinshi(examiner, examYear, rank, slot) {
  // v3·seed = preferRegion + examYear + rank + slot
  // 问题·重启游戏 same examiner + same year + same rank·进士 name 撞
  
  // v4·加 GM.runId·每次新游戏 / 重读存档 init 时生成
  const seed = view.preferRegion + '_' + examYear + '_' + rank + '_' + slot + '_' + (GM._runId || '0');
  const rng = _kjMulberry32(_kjHashSeed(seed));
  
  // 还有·进士 name 跟历史名臣去重 (现已有 P.keju._historicalFiguresUsed) + 跟当朝 chars 去重
  // 重复时·revertSeed + 重 gen
}

// init 时·
if (!GM._runId) GM._runId = Math.floor(Math.random() * 1e9);
```

#### 21.5.C·数据 quality regression smoke

**Slice 11 v4 加 smoke**·

```
smoke-keju-data-quality.js·
  1. 跑 5 剧本 init·关键 30 chars personality8D 数值 vs calibration.json·diff ≤ 5
  2. 跑 100 年模拟·新进士 personality8D 分布·8 维度 stddev 各 ≥ 15 (非全集中一值)
  3. 跑 main vs scenario.partyTensionInit·alignment 检查
  4. 跑 _corrCalcExaminerCorruption·5 主考 sample·数值合理 (15-85 范围·非全 50 或全 0)
```

### 21.6·v4 总览

**新 slice**·

```
Slice 5.7   LLM prompt 三面对齐 (Slice 5.5 后)               ~1 d
Slice 12.5  event-based 副作用 (Slice 12 后)                  ~1.5 d
Slice 14.5  编辑器三面补全 (Phase 5 内)                       ~1.5 d
```

**修订 slice**·

```
Slice 0.3   v4 加关键 chars 手 calibrate (~+0.5 d)
Slice 5     v4 加钦点 5 代价
Slice 6     v4 加 3 决策路径代价
Slice 8     v4 加 crystallization seed 防撞 + 同年联名行为
Slice 11    v4 加 4 代价 + data quality smoke
Slice 12    v4 数值副作用 → 转移到 Slice 12.5
```

**廷议 sprint 协作修订** (需跟廷议 sprint owner 协调)·

```
廷议 plan v4 协作点·
  §E.5 召集制 topicSpecificRequired 加 'examiner-pick' (翰林层)
  §E.12 NPC 主动发议题·加 prestige 加权 (低 prestige 70% 不上书)
  §Slice 7 confront 链 maxChain·改革议题特例 = 3
  §Slice 2 议题 tag·扩 3 keju-specific (examiner-pick / keju-reform / keju-scandal)·共 30 tag
```

**总工时再调 v4**·

```
v3:  39.5-58.5 d  / 21 slice
v4:  44-65.5 d   / 24 slice   (+4.5-7 d / +3 slice)

Phase 0·Prep                v3: 4.5-6.5  → v4: 5-7      (+0.5 d Slice 0.3 calibrate)
Phase 1·共性主干            v3: 5-7      → v4: 5-7
Phase 2·顶层政治事件         v3: 11.5-16.5 → v4: 14-19.5 (+2.5 d Slice 5.7 + 代价明示)
Phase 3·底层身份与派系       v3: 9-15     → v4: 9.5-15.5 (+0.5 d crystallization 防撞 + 联名)
Phase 4·三指针闭环           v3: 4-6      → v4: 5.5-7.5  (+1.5 d Slice 12.5)
Phase 5·朝代差异化 + 编辑器   v3: 5-8      → v4: 6.5-9.5  (+1.5 d Slice 14.5)
```

### 21.7·v4 修订总览

| 组 | 改了什么 | slice 影响 |
|---|---|---|
| A·三面补全 | 5 处 editor + 6 处 AI 全补·**新 Slice 5.7 + Slice 14.5** | +2 slice·+2.5 d |
| B·代价明示 | 主考 / 选官 / 改革 三动作明示系统型代价·Slice 5/6/11 加 | +0 slice·+1.5 d |
| C·event-based 反馈 | F1/F2/F3 数值副作用 → 事件触发·邸报头条·**新 Slice 12.5** | +1 slice·+1.5 d |
| D·廷议交叉 5 点 | 协作修订廷议 sprint·扩 3 tag·prestige 加权·confront 链特例 | +0 slice·跟廷议 owner 协调 |
| E·数据 calibration | Slice 0.3 关键 chars 手 calibrate·crystallization 防撞·新 smoke | +0 slice·+1 d |

**总**·v3 → v4·**+3 slice / +4.5-7 d**·真正符合 [feedback_editor_game_relation] / [feedback_tool_vs_system_costs] / [feedback_audit_layers_ui_vs_mechanic] 三 design rule。

**audit 完成·plan v4 实施 ready (二次)**。

下一步·

1. 看 §21 有想再调的·指我
2. OK → 启动 Phase 0·5 slice (0/0.3 v4/0.5/0.7) 同时开
3. **跟廷议 sprint owner 协调 §21.4 协作点** (若 user 是 owner·plan 同步调)

---

## 22·v5 修订 (paradigm-correction·post-runtime-read·2026-05-23)

**触发**·user 要求"再看旧科举机制"·亲读 keju 全 4305 行代码·发现 plan v1-v4 全程**假装游戏没东西**·实际旧科举是个**完整中型机制·800 行 keyi 议政 + LLM 全字段进士生成 + 集团效果·crystallize / startKejuReform / 等核心函数全已存在**。违反 [feedback_refactor_not_reskin] (paradigm 应不应改) + [feedback_runtime_renderer_canonical_for_schema] (runtime 才是权威) 两大 design rule。

**v5 paradigm correction·user 拍板 A + D + G 三选项**·

### 22.1·A 决定·扩 keyi (科议) 加 5 议题类型·保现 paradigm

**问题**·v1-v4 §17.1 / §A 假设科举议题"走廷议 v3"·借廷议召集制 / confront 链 / 27 tag / clientelism。**实际旧机制·keyi (科议) 已经是 800 行完整议政流程** (L1564-2353)·包含·

| 廷议 v3 plan 假装新建 | keyi 实际已有·行号 |
|---|---|
| 召集制 + 6 资格筛 | L1569-1580·排妃/学生/太监·至少 3 人 ✓ |
| 立场均衡挑发言人 | L1602-1626·礼部尚书必入 + 支持/反对/观望各至少 1 + 综合分填到 6 ✓ |
| LLM 2 轮流式发言 + stance 标记 | L1799 _keyiStreamRound·每人 80-160 字 + 首行 stance ✓ |
| 玩家插话 + 立场推断 | L1721 _keyiPlayerSpeak + L1710 _keyiInferPlayerStance keyword 推断 ✓ |
| 算式兜底 (无 AI) | L1904 _keyiInferStance·loyalty + class + 部门 + 国库 + 战事 + 圣谕拉拽 ✓ |
| AI 表决精修 (单向不变量) | L1965 _keyiGenAllStances·讨论中没出现的立场不能用 ✓ |
| 三路径决策 council/edict/defy | L2197 _keyiConfirmStart + tm-keju.js L247 startKejuByMethod·完整代价 ✓ |
| _courtRecords / _edictTracker / qijuHistory / jishiRecords / eventBus 完整数据流 | L2212-2295 完整持久化 ✓ |
| NPC 记忆 + 人际影响 | L2311 _keyiMemoryEffects·forEach attendees 写 _memorySeeds ✓ |

**v5 修订**·**plan §17.1 (廷议 sprint 集成) 彻底重写**·**科举议题不走廷议 v3·走科议 keyi (扩 5 议题类型)**·

#### Slice 4-7 v5 修订·扩 keyi 引擎

```js
// v5·keyi 加 topic 参数化·支持 5 议题类型

const KEYI_TOPIC_TYPES = {
  // 现 (1 类·已有)
  'kaike':         { label: '筹办科举',    confirmMethods: ['council','edict','defy'] },
  
  // v5 新 (4 类)
  'examiner_pick': { label: '主考任命',    confirmMethods: ['council','edict','defy'],
                     candidateField: 'examinerCandidate',  // 谁被讨论
                     stancePrompt: '是否同意邒推 X 公为主考' },
  'scandal':       { label: '弊案弹劾',    confirmMethods: ['investigate','dismiss','protect'],
                     candidateField: 'accusedExaminer',
                     stancePrompt: '是否查办 X 公 弊案' },
  'reform':        { label: '科举改革',    confirmMethods: ['accept','reject','defer'],
                     themeField: 'reformTheme',
                     stancePrompt: '是否推行 X 改革' },
  'allocation':    { label: '选官分配',    confirmMethods: ['council','edict','defy'],
                     candidateField: 'allocationProposal',
                     stancePrompt: '是否同意这个选官方案' }
};

// v5·openKeyiSession 加 topicType 参数
function openKeyiSession(topicType /* default 'kaike' */, topicData) {
  topicType = topicType || 'kaike';
  const topicCfg = KEYI_TOPIC_TYPES[topicType];
  if (!topicCfg) throw new Error('Unknown keyi topic: ' + topicType);
  
  // 现 L1564-1631 逻辑 + topicCfg 注入
  KEYI_STATE = {
    ...现有 state,
    topicType: topicType,
    topicLabel: topicCfg.label,
    topicData: topicData,
    confirmMethods: topicCfg.confirmMethods,
    stancePrompt: topicCfg.stancePrompt
  };
  
  // 立场均衡挑发言人·按 topicType 调整必入大臣
  // 'examiner_pick' → 礼部尚书·吏部尚书·首辅必入
  // 'scandal'        → 都察院·刑部·首辅必入
  // 'reform'         → 翰林·礼部·吏部必入
  // 'allocation'     → 吏部尚书·吏部侍郎·首辅必入
}

// v5·_keyiStreamRound prompt 加 topic context
async function _keyiStreamRound() {
  // 现 L1819-1843 prompt 构造·加·
  var topicCtx = KEYI_STATE.topicLabel + '·' + (KEYI_STATE.topicData ? JSON.stringify(KEYI_STATE.topicData).slice(0, 120) : '');
  var prompt = '【该议题】' + topicCtx + '\n' + 现 prompt;
}

// v5·_keyiConfirmStart 按 topicType 派发
function _keyiConfirmStart(method) {
  switch (KEYI_STATE.topicType) {
    case 'kaike':         return startKejuByMethod(method, opts);        // 现有
    case 'examiner_pick': return _kjPickExaminerByMethod(method, opts);  // v5 新
    case 'scandal':       return _kjHandleScandalByMethod(method, opts); // v5 新
    case 'reform':        return _kjReformByMethod(method, opts);        // v5 新
    case 'allocation':    return _kjAllocateByMethod(method, opts);      // v5 新
  }
}
```

**Slice 4-7 工时·v5 -3-5 d** (因为不用集成廷议·复用 keyi 引擎)·

```
v4·  Slice 4 (1.5d) / Slice 5 (1.5d) / Slice 5.5 (1.5d) / Slice 5.7 (1d) / Slice 6 (3d) / Slice 7 (3d) = 11.5 d
v5·  Slice 4 (1d) / Slice 5 (1d) / Slice 5.5 (1.5d) / Slice 6 (2d) / Slice 7 (2d) = 7.5 d  (-4 d)
     废 Slice 5.7 (LLM prompt 三面对齐·因为 keyi 已有 LLM stream)
```

**§17.1 廷议 sprint 集成·v5 缩**·

廷议 sprint 跟科举 sprint **不再深度集成**·只·

- 廷议 v3 主管"非科举"政治议题 (国策 / 战争 / 礼制 etc)
- 科议 keyi 主管"科举专属"议题 (5 类型)
- 两 sprint 并行·**互不依赖**
- 廷议 sprint 仍前进·但**不 block 科举 Phase 2**

### 22.2·D 决定·char schema 全复用现有·删 3 新字段

**问题**·plan v4 §20.1 加 personality8D / learningProfile / keju_status·但·

| v4 假新建 | 实际游戏 schema |
|---|---|
| `ch.personality8D.{rigor/honor/boldness/rationality/compassion/ambition/greed/loyalty_to_party}` (8 子字段) | **已有·6 顶层数值 + 五常 5D**·`intelligence` / `administration` / `valor` / `benevolence` / `loyalty` / `integrity` / `ambition` / `charisma` (8 顶层数值) + `wuchang.{ren, yi, li, zhi, xin}` (5D subkey) |
| `ch.learningProfile.{confucian/statecraft/poetry/philosophy/practical}` | `ch.learning` 字符串描述 (LLM 已生成) + 字符串 keyword 推断 |
| `ch.keju_status='秀才/举人/进士/翰林/庶吉士'` | **已有 `ch.title='状元/榜眼/探花/进士'`** (L2992 `_aiGenerateFullCharacter` 写入) |

**v5 修订·全复用现有字段映射**·

```
plan 用语        →  实际字段
rigor 严谨        →  integrity·或 wuchang.li (礼)
honor 守节        →  wuchang.yi (义) + loyalty
boldness 胆量     →  valor (勇)
rationality 理性  →  wuchang.zhi (智) + intelligence
compassion 怜悯   →  benevolence + wuchang.ren (仁)
ambition 野心     →  ambition (已有顶层)
greed 贪婪        →  (100 - integrity) 派生
loyalty_to_party  →  loyalty + party.cohesion 派生
confucian 经史    →  ch.learning 字符串 keyword 推断 ("经/史/儒")
statecraft 经世   →  ch.learning 字符串 keyword 推断 ("经世/实学")
poetry 诗赋       →  ch.learning 字符串 keyword 推断 ("诗/赋")
philosophy 理学   →  ch.learning 字符串 keyword 推断 ("理学/道学")
practical 实学    →  ch.learning 字符串 keyword 推断 ("实学/格致")
科举身份          →  ch.title (已有·状元/榜眼/探花/进士)
```

**Slice 0.3 v5 大幅简化**·

```
v4·  Slice 0.3 (2 d) - personality8D + learningProfile + keju_status + 推断函数 + migration + smoke
v5·  Slice 0.3 (0.5 d) - 仅·
       (1) 加 _kjLearningKeywordMap·30 词关键词 → confucian/statecraft/poetry/philosophy/practical 5 维度
       (2) 加 _kjInferLearningTraits(ch.learning) → {confucian: 0-100, ...} 派生函数 (不写入 ch)
       (3) Slice 5 主考派生 + Slice 8 crystallize 时 call·当场计算·不持久化
     **不加新 char 字段**·不污染 schema·不破坏 LLM 推演
```

**rationale**·

- 减少字段冗余 (8 顶层数值 + 5D wuchang 已经足够丰富)
- 跟中国古代 paradigm 一致 (wuchang = 仁义礼智信 = 道德 5 轴·plan v4 的 rigor/honor/... 是西式 OCEAN 派生)
- LLM prompt 不破坏 (现 _aiGenerateFullCharacter 输出 wuchang + 6 数值·继续用)
- 编辑器面已支持现字段 (editor-crud.js 有 wuchang 编辑·有 6 数值 input)

### 22.3·G 决定·plan §20.6 函数表全重标

**问题**·plan §20.6 [new] 标了一堆**实际已存在的函数**·

| 函数 | plan v4 标 | 实际位置 |
|---|---|---|
| `_kjCrystallizeJinshi` | [new] (Slice 8) | **重命名为 `crystallizeKejuGrad`·L3131 已存在** |
| `_kjV2_startKejuByMethod` | [new] (Slice 1) | **重命名为 `startKejuByMethod`·tm-keju.js L247 已存在** |
| 改革浪潮触发 (Slice 6) | [new] | **`startKejuReform`·tm-keju.js L1011 已存在·扩自然政治触发** |
| F1/F2/F3 公式 (Slice 3) | [new] | **`_kejuAggregateGradsEffect` L3088 是雏形** (阶层满意度 / 党派吸纳 / 吏治) |
| 召集制 (Slice 4-7 via 廷议) | [new] | **`openKeyiSession` L1564 已存在·扩 5 议题类型** |
| 立场均衡挑发言人 (Slice 4-7) | [new] | **L1602-1626 已实现** |
| LLM 2 轮流式 (Slice 4-7) | [new] | **`_keyiStreamRound` L1799 已实现** |
| AI 表决精修 (Slice 4-7) | [new] | **`_keyiGenAllStances` L1965 已实现** |
| 三路径代价 council/edict/defy (Slice 4) | [new] | **`startKejuByMethod` tm-keju.js L247 + `_kejuQueryLibuStance` 已实现** |
| 进士入 chars eager (Slice 8) | [new] (重构 ~250 行) | **`_aiGenerateFullCharacter` L2917 + `GM.chars.push(newChar)` L3041 已 eager·实际 ~50 行简化** |
| NPC 记忆 + 人际影响 (Slice 4-7) | 没提·plan 假装新建 | **`_keyiMemoryEffects` L2311 已实现** |
| 阶层满意度调整 (Slice 3) | 没提·plan F1 假装新建 | **L3098-3107 已实现·按阶层占比调 satisfaction** |
| 党派吸纳 20% (Slice 9-10) | 没提 | **L3109-3120 已实现·主考党派 +20% 进士** |
| 吏治调整 (Slice 12) | 没提·plan endturn 副作用假装新建 | **L3122-3127 已实现·avgScore 调 bureaucracyStrength** |

**v5 修订·全重标 [modified] 不 [new]**·

```
[modified] (现有·v5 扩展·非新建)·
  openKeyiSession                   (L1564·v5 加 topicType 参数·支持 5 议题类型)
  _keyiStreamRound                  (L1799·v5 prompt 加 topic context)
  _keyiConfirmStart                 (L2197·v5 按 topicType 派发到 5 路径)
  _keyiMemoryEffects                (L2311·v5 按议题类型加不同 affinity 影响)
  startKejuByMethod                 (tm-keju.js L247·v5 不动·已完美)
  startKejuReform                   (tm-keju.js L1011·v5 改自然政治触发 + 主题池)
  crystallizeKejuGrad               (L3131·v5 加 4 属性派生算法·删 lazy 分支)
  _aiGenerateFullCharacter          (L2917·v5 prompt 加 examiner 4 属性 hint·让 LLM 顺主考倾向)
  _kejuAggregateGradsEffect         (L3088·v5 数学化 F1/F2/F3·阶层满意度 → F1·党派吸纳 → F2·吏治 → F3)
  _kejuArchiveExam                  (L557·v5 写 P.keju.indicators 更新钩子)

[new] (v5 真新建)·
  KejuTier 数据结构                 (Slice 1·从 stageDurationDays 扩 tier object)
  9 朝代 KejuTier preset            (Slice 2·tm-keju-presets.js)
  P.keju.indicators                 (Slice 3·{f1, f2, f3} 数学化·从 _kejuAggregateGradsEffect 派生)
  GM._factionTension namespace      (Slice 5.5·structured·sc0 抽取)
  _corrCalcExaminerCorruption(ch)   (Slice 5.5·派生 GM.corruption.subDepts × ch.integrity)
  _kjGetEnemyParties / Leaders      (Slice 5.5·辅助函数)
  sc16 memorialType='impeach_examiner' (Slice 7·schema union 扩)
  _kjReformThemePool                (Slice 6·6 主题映射表)
  _kjF*IndicatorSideEffects 事件链  (Slice 12.5·event-based 反馈)
  scenario.tinyi.convening 朝代 JSON (Slice 14·明/宋/唐三套)
  KEYI_TOPIC_TYPES 5 议题类型表      (Slice 4-7·扩 keyi)
  
[unchanged·v5 不动]·
  keyi 800 行核心议政流程 (L1564-2353)
  startKejuByMethod 三路径代价
  _aiGenerateFullCharacter LLM 全字段进士生成
  _kejuAggregateGradsEffect 集团效果
  _keyiInferStance 算式兜底
  _keyiGenAllStances AI 表决精修 (单向不变量)
  _keyiPersistToCourtRecords 完整数据流
```

### 22.4·v5 总工时再调 (大幅缩)

```
v4:  44-65.5 d  / 24 slice
v5:  31-46.5 d  / 22 slice   (-13-19 d / -2 slice)

变化·
  Slice 0.3 v4: 2 d → v5: 0.5 d   (-1.5 d·删 personality8D / keju_status·仅保 _kjInferLearningTraits 派生函数)
  Slice 4   v4: 1.5 d → v5: 1 d   (-0.5 d·复用 keyi 引擎·只加 topicType='kaike' 现有路径)
  Slice 5   v4: 1.5 d → v5: 1 d   (-0.5 d·复用 keyi 加 topicType='examiner_pick')
  Slice 5.5 v4: 1.5 d → v5: 1.5 d (无变·真新建 tension + corruption 架架)
  Slice 5.7 v4: 1 d → 删           (-1 d·LLM prompt 三面对齐·因为 keyi 已有 LLM stream·不需独立)
  Slice 6   v4: 3 d → v5: 2 d     (-1 d·复用 startKejuReform + keyi topicType='reform'·只扩主题池)
  Slice 7   v4: 3 d → v5: 2 d     (-1 d·复用 keyi topicType='scandal'·加 sc16 memorialType 扩 schema)
  Slice 8   v4: 4 d → v5: 1.5 d   (-2.5 d·进士入 chars 已 eager·删 lazy 分支 + 加 4 属性派生·~50 行非 250)
  Slice 11  v4: 4 d → v5: 2 d     (-2 d·复用 keyi topicType='allocation' + 现 _kejuAutoAssign / _kejuAssignConfirm)
  Slice 12  v4: 1 d → v5: 0.5 d   (-0.5 d·F1/F2/F3 公式扩 _kejuAggregateGradsEffect·非新建)
  Slice 12.5 v4: 1.5 d → v5: 1.5 d (无变·event-based 反馈)
  Slice 14.5 v4: 1.5 d → v5: 1 d  (-0.5 d·editor 字段·只补·KejuTier 编辑 + F1-F3 阈值 + 主题池·删 personality8D/learningProfile/keju_status editor)
  
  其他 slice 不变
```

```
Phase 0·Prep            v4: 5-7    → v5: 3-5    (-2 d·Slice 0.3 大缩)
Phase 1·共性主干        v4: 5-7    → v5: 5-7    (无变)
Phase 2·顶层政治事件    v4: 14-19.5 → v5: 7.5-12 (-6.5 d·复用 keyi)
Phase 3·底层身份与派系  v4: 9.5-15.5 → v5: 6-10 (-3.5 d·Slice 8 简化)
Phase 4·三指针闭环      v4: 5.5-7.5 → v5: 4.5-6 (-1 d·Slice 12 简化)
Phase 5·朝代差异化      v4: 6.5-9.5 → v5: 5-6.5 (-1.5 d·Slice 14.5 editor 缩)
```

### 22.5·v5 sprint 重排

```
Phase 0·Prep (3-5 d)
  Slice 0     prep·读代码 + field inventory baseline   (0.5-1 d)
  Slice 0.3   仅·_kjInferLearningTraits 派生函数 + 30 词关键词表  (0.5 d)
  Slice 0.5   UI 入口·"文" panel 拆 + 科举按钮         (0.5-1 d)
  Slice 0.7   keju-paradigm-research.md doc 整理       (1-1.5 d)

Phase 1·共性主干 (5-7 d)
  Slice 1     KejuTier 数据结构 (扩 P.keju.tiers schema)·朝代 modifier 默认值表  (1.5-2 d)
  Slice 2     9 朝代 preset (汉察举/魏晋九品 stub·隋唐宋元明清完整)               (1.5-2 d)
  Slice 3     P.keju.indicators·F1/F2/F3 公式扩 _kejuAggregateGradsEffect       (2-3 d)

Phase 2·顶层政治事件 (7.5-12 d)  ← 大缩
  Slice 4     扩 keyi·topicType='kaike'·复现有路径                              (1 d)
  Slice 5     扩 keyi·topicType='examiner_pick'·复用 keyi 引擎·4 属性派生 view (1 d)
  Slice 5.5   tension + corruption 架架·新建 GM._factionTension + corruption 派生 (1.5 d)
  Slice 6     扩 keyi·topicType='reform'·复用 startKejuReform·扩主题池          (2 d)
  Slice 7     扩 keyi·topicType='scandal'·sc16 schema 扩 memorialType            (2 d)

Phase 3·底层身份与派系 (6-10 d)
  Slice 8     进士 eager 统一·删 crystallize lazy 分支·4 属性派生算法            (1.5 d)
  Slice 9     mentor 字段补·ch._mentorRef 单字段·跟现 ch.mentor 并存             (1.5 d)
  Slice 10    进士派系标签·复用 _kejuAggregateGradsEffect 党派吸纳 20%·扩到 100% (1.5 d)
  Slice 11    扩 keyi·topicType='allocation'·选官分配朝代联动                    (2 d)

Phase 4·三指针闭环 (4.5-6 d)
  Slice 12    F1/F2/F3 endturn 副作用·扩 _kejuAggregateGradsEffect 写 indicators (0.5 d)
  Slice 12.5  event-based 反馈·F1/F2/F3 tier 化事件·邸报头条                     (1.5 d)
  Slice 13    F1/F2/F3 UI 渲染·科举弹窗顶部 3 印石 + 民心面板派生 3 行            (1.5 d)

Phase 5·朝代差异化 + 编辑器 (5-6.5 d)
  Slice 14    9 朝代 preset 编辑器面 + 剧本 keju.* schema 扩展                    (2 d)
  Slice 14.5  editor 三面补·KejuTier 编辑 + F1-F3 阈值 + 主题池编辑 (删 personality8D editor) (1 d)
  Slice 15    timeline 解锁·era 优先·绝对年份 fallback                           (1 d)
  Slice 16    编辑器 UI·KejuTier 列表编辑·朝代 preset 一键加载                    (1.5 d)

新 slice 数·22 (v4 是 24·删 Slice 5.7 LLM prompt 三面对齐 + Slice 0.3 大幅减)
```

### 22.6·v5 修订总览

| 决定 | 对应 | 影响 |
|---|---|---|
| **A·扩 keyi 加 5 议题** | keyi 800 行保留作主体·廷议 sprint 不深集成 | Phase 2 工时 -6.5 d·廷议 sprint 解除前置锁 |
| **D·char schema 全复用** | 删 personality8D + learningProfile + keju_status·用现 wuchang + 6 数值 + ch.title | Slice 0.3 -1.5 d·Slice 14.5 editor -0.5 d·不污染 schema |
| **G·§20.6 全重标 modified** | 14 个函数从 [new] 改 [modified]·明示扩现有 | Slice 8 -2.5 d (eager 已实·非 250 行)·Slice 12 -0.5 d (公式扩非新建) |

**总**·v4 → v5·**-13-19 d / -2 slice**·**真符合 [feedback_refactor_not_reskin] (paradigm 应不应改) + [feedback_runtime_renderer_canonical_for_schema] (runtime 才是权威)**。

**audit 完成·plan v5 paradigm-correct·真 ready (三次)**。

下一步·

1. 看 §22 有想再调的·指我
2. OK → 启动 Phase 0·4 slice (0/0.3 v5 大缩/0.5/0.7) 同时开
3. **廷议 sprint 不再前置锁**·并行可独立 ship

---

## 23·旧科举亮点保留清单 (post-deep-read·2026-05-23)

**触发**·user 要求"看旧科举有什么亮点值得保留"·亲读 initKejuSystem / renderExaminerSelectStage / runPreliminaryExams / generateHuishiResults / pickHistoricalCandidates / _kejuGenChiefExaminerMemorial / _kejuSettleCentralCost / _keyiInferStance / _keyiGenAllStances 等核心段·**旧科举不只是"完整中型机制"·而是天命游戏的精神内核之一**。

### 23.1·🌟🌟🌟 顶级亮点 (10 项)·plan v5 实施时必 explicit 保留

#### 亮点 1·三路径开科 + 完整代价梯度 (startKejuByMethod·tm-keju.js L247)

```
council   依议开科       零代价
edict     下诏强推       皇威-10·皇权-5·反对大臣 affinity-8
defy      逆众议强推     皇威-20·皇权-10·民心-5·反对党-8·反对大臣-15
```

**亮点本质**·**[feedback_tool_vs_system_costs] 教材级范例**·三 tier 代价梯度。plan v5 §22.1 扩 5 议题·**每议题都该有 council/edict/defy 三路径** (e.g. 弊案·investigate/dismiss/protect·改革·accept/reject/defer)·**不要发明新代价 paradigm·复用这套**。

#### 亮点 2·按天推进 8 阶段时间化 (advanceKejuByDays + stageDurationDays)

```
proposal 30 / preliminary_local 60 / preliminary_provincial 90 / examiner_select 30 /
huishi_draft 30 / huishi 60 / dianshi_draft 15 / dianshi 30 = 345 天 ≈ 1 年
```

**亮点本质**·**科举挂在后台跑·游戏继续推进·不是 modal 阻塞**·跟现实"三年一科·秋闱/春闱/殿试"对齐。plan v5 KejuTier 参数化必**保留"按天推"·非"按 turn 一次跑完"**。

#### 亮点 3·历史名臣 + 演义跨朝代 (pickHistoricalCandidates·tm-keju.js L827)

```
3 模式·strict_hist (100 年窗口) / light_hist (150) / yanyi (不限·允跨朝代)
硬规则·必须是布衣/监生/举人/未出仕·不能已任官
shiliao 字段强制史料原文·"《明史·列传》卷二百六十五·..."
跨场去重池·P.keju._historicalFiguresUsed
跨朝代·_timeAnomaly = true·bio 加"【异世奇缘】此人本为其本朝之人·不知因何缘份在此世为士"
```

**亮点本质**·**天命游戏最独特的"时空交织 + 史料考证"机制·是游戏精神内核**·plan v5 必须·标 [unchanged·绝对保留]·crystallization 必含 historicalHits 路径 (优先用历史名臣·补不足才 LLM 凭空生)·_timeAnomaly 写入 ch._timeAnomaly·LLM 推演 prompt 用。

#### 亮点 4·主考奏折机制 (_kejuGenChiefExaminerMemorial·tm-keju.js L495)

```js
// 主考拟 3 道备选题·prompt 含 examiner 党派 + stance + intelligence + personality
output·{ memorial: "题本文 200-400 字半文言", candidates: [{topic, rationale, style}×3], styleHint }
// 自动·eventBus + NpcMemorySystem.remember('为本科会试拟题', '志', 6) + qijuHistory + jishiRecords
```

**亮点本质**·**真"君臣对答"叙事·不是数值堆**·一个机制同时跑 4 系统集成。plan v5 Slice 4-7 议题类型扩展·**全部走这套 paradigm**·不发明新 prompt 模板。

#### 亮点 5·三级经费 graceful degrade (_kejuSettleCentralCost·L924)

```
国库 ≥ amount  → 国库扣钱·正常
国库 < amount + 内帑 ≥ amount → 内帑补贴·**皇威 +2** (士林感频)
两边都不够 → 流产·**皇威 -10 + 民心 -5**

恩科·enkeMultiplier = 1.3
```

**亮点本质**·**教科书级"资源约束 + 政治代价"**·内帑补贴**反而提升皇威**·"陛下慷慨"·真政治。**plan v5 不要简化成"国库 -X"**。

#### 亮点 6·资格判定·廷议 sprint 召集制的原型 (_isPlayerFactionChar / _kejuIsEligibleChiefExaminer·L594-620)

```js
function _kejuIsEligibleChiefExaminer(c) {
  return !!(c && c.alive !== false && !c.isPlayer
    && (c.intelligence || 0) >= 60         // 能力门槛
    && _isPlayerFactionChar(c)              // 同势力
    && _kejuHasChiefExaminerOffice(c));     // 在任官员·非妃/太监/学生/公主
}
```

**亮点本质**·**廷议 sprint plan v1.5 §E.1 6 资格筛·几乎完全是这套的扩展**·plan v5 没承认这是廷议设计原型·应明示。

#### 亮点 7·殿试代主·身份决定政治后果 (openDianshiDelegatePicker·L623)

```
6 类身份分类·不同代主不同副作用·
  太子    无负作用
  首辅    正统
  礼部    礼制正统
  宗室    宗室满意度 +10
  权臣    皇威 -3 (私相授受)
  武将    民心 -2 (礼部抗议·"武人主文事")
```

**亮点本质**·**"中国古代礼制" paradigm 的精确数字化**·plan v5 选官分配 (Slice 11) 应学这套·**不同候选缺·不同政治后果**。

#### 亮点 8·党派推荐 (renderExaminerSelectStage·L656)

```
每党 influence>20·从该党挑最高 intelligence ≥55 的成员·标"X 党推荐"
UI 显示·"各党推荐·东林→李三才·阉党→周延儒·浙党→某某"
```

**亮点本质**·**完美"党争演绎"**·plan v5 Slice 5 主考任命议题·**100% 复用·不发明新算法**。

#### 亮点 9·LLM 评卷 + 治理传导 (generateHuishiResults·L806)

```
prompt 输入·治理状况 (国库 / 民心 / 教育 / 经济·从 GM.vars 智能查找) + 考官党派 + 朝中党派
LLM 输出·passedCount (治理好 200-300·治理差 80-150) / quality / partyRatio (考官党派会偏多·真党争) / localEffect
```

**亮点本质**·**治理状况直接影响科举质量** — 国库穷考生少·教育低考生质量差。plan v5 F1/F2/F3 公式数学化是从这扩·非新建。

#### 亮点 10·完整数据流·7 处持久化

```
每次科举关键事件 (任命主考 / 选代主 / 钦点状元 / 议政决议) 写入·
  GM._courtRecords         (议政记录·AI 推演读)
  GM._edictTracker         (诏令追踪·后续 turn AI 报告执行)
  GM.qijuHistory           (起居注·UI)
  GM.jishiRecords          (纪事·UI)
  eventBus (addEB)          (事件栏·UI)
  NpcMemorySystem.remember (NPC 情感记忆·emotion + intensity 1-10)
  AffinityMap.add           (人际关系 -100~+100 + reason)
  + classes / parties 影响
```

**亮点本质**·**完整闭环·LLM 推演读得到 + 玩家看得到**·**真"反馈循环"** [feedback_audit_layers_ui_vs_mechanic]·plan v5 Slice 12.5 是扩这套·非新建。

### 23.2·🌟🌟 二级亮点 (10 项)·plan 应用但没强调

| # | 亮点 | 位置 | plan v5 用法 |
|---|---|---|---|
| 11 | 答卷查看 + 钦点 UI | viewAnswer L2452 + _qinDianPick L1471 + showAnswerModal L2495 | 沉浸式君臣对答 UI·plan v5 §13 必保留 |
| 12 | 诹议 keyi 单向不变量 v7 | _keyiGenAllStances L1965 | 防 LLM 幻觉·single source of truth·plan v5 sc16 严格化是扩这 paradigm |
| 13 | 算式兜底 + AI 精修双轨 | _keyiInferStance L1904 + _keyiGenAllStances 双轨 | gracefully degrade·从不 crash·plan v5 所有 LLM 调用必应用 |
| 14 | 玩家立场拉拽 (圣谕影响) | _keyiInferStance L1922-1929·pullStrength = (loy-30)*0.7·权臣 ambition>70+loy<50 → ×-0.5 逆圣意 | 完美中国古代政治 paradigm·plan v5 Slice 5/11 钦点必沿用 |
| 15 | NPC 记忆 + AffinityMap 双轨 | NpcMemorySystem.remember + AffinityMap.add | AI 推演时 NPC 真"记仇/报恩"·plan v5 Slice 4-7 议题扩展必沿用 |
| 16 | 党派吸纳 20% | _kejuAggregateGradsEffect L3109 | 真"门生网络"·plan v5 §17.2 partyRef migration 是延伸 |
| 17 | 阶层 + 吏治派生 | _kejuAggregateGradsEffect L3088-3127 | F1/F2/F3 雏形·plan v5 §16.1-3 是扩 |
| 18 | gameMode 联动·_kejuHistoricalWindow | strict_hist/light_hist/yanyi 3 模式 | plan v5 §19.3 scenario 可配·这套已在 |
| 19 | 跟问对集成·kejuConsult* | L542-583·会试咨询大臣·殿试咨询馆阁 | plan v5 §17.4 接口已有·复用 |
| 20 | UX·急办横幅 + 紧急通知 | _kejuShowUrgentBanner + _kejuNotifyUrgentStage tm-keju.js L728-810 | plan v5 §13 已有·复用 |

### 23.3·🌟🌟🌟🌟 真正的精神内核 (3 项)·plan v5 没承认

#### 亮点 21·半文言 + 历史考据 + 演义自由·三位一体

```
LLM prompt 全程·
  "你是 [era] 科举主考官 [name]"·"150-250 字策问体·仿古文"
  "《明史·列传》卷二百六十五·..." (shiliao 强制原文摘引)

3 游戏模式·
  strict_hist·真历史名臣按 shiliao 严格史料
  light_hist·150 年窗口
  yanyi·允许跨朝代奇缘·_timeAnomaly 标签·"此人本为其本朝之人·不知因何缘份在此世为士"

所有 UI 文案半文言·策问 / 题本 / 答卷 / 钦点
```

**亮点本质**·**天命独有·游戏精神内核**。plan v5 §22 必明示·[unchanged·绝对保留]·LLM prompt 风格 + shiliao 强制 + _timeAnomaly 标签 + UI 文案半文言·**绝不"现代化"或"简化"**。

#### 亮点 22·君臣对答 paradigm·非数值堆

```
主考拟题 (LLM 含 examiner 党派 stance)
  → 玩家修改 / 钦点
    → 评卷 LLM 含考官倾向
      → 答卷可读 (showAnswerModal·UI)
        → 钦点状元 (玩家手钦·3 名)
          → 殿试代主有政治后果 (6 身份)
            → NPC 记忆 + AffinityMap 双轨写入
              → AI 后续推演读到 (sc1b 文事段)
                → 邸报头条 + qijuHistory + jishiRecords
```

**每一步都是"故事 + 数值"双轨**·plan v5 §22.5 sprint 重排**绝不能为缩工时丢这套深度**。

#### 亮点 23·完整中国古代政治 paradigm·非西式

```
ch.wuchang.{ren, yi, li, zhi, xin}  仁义礼智信五常·非西式 Big5/OCEAN
ch.party                            朝廷党派·string 不 entity (东林/阉党/浙党)
ch.faction                          朝外势力·跟党派分离
ch.class                            阶层 (寒门/士族/商贾)
ch.mentor                           师生·string
ch.spouse                           妃 (排出科举)
ch.role (太子/太监/公主)            排出科举

经费·国库 / 内帑 (两级·非 modern budget)
仪式·封糊 / 鸣鞭 / 跪安 (UI 文案)
身份·状元/榜眼/探花/二甲进士/三甲同进士 (ch.title)
封赠·tongsheng/xiucai/juren/gongshi/zhuangyuan/bangyan/tanhua/erjia/sanjia 9 档 attributeBonus
```

**亮点本质**·**plan v5 §22.2 D 决定删 personality8D 已对齐**·但要明示**为什么** — 因为**中国古代 paradigm 是 wuchang + 阶层 + 党派 + 师生·plan 不能借西式 OCEAN 假装新建**。

### 23.4·v5 §20.6 函数表·新分组 [unchanged·保留亮点]

```
[unchanged·保留亮点] (v5 实施不动·只在 calling 时复用)·
  
  // 议政 paradigm (亮点 12-15)·
  openKeyiSession                 keyi 800 行·扩 5 议题但保 paradigm
  _keyiInferStance                算式兜底 + 圣谕拉拽
  _keyiGenAllStances              单向不变量 v7
  _keyiPersistToCourtRecords      7 处持久化数据流
  _keyiMemoryEffects              NPC 记忆 + AffinityMap
  
  // 历史名臣 paradigm (亮点 3·21)·
  pickHistoricalCandidates        AI 检索 + shiliao 强制 + 跨场去重
  _kejuHistoricalWindow           strict/light/yanyi 3 模式
  P.keju._historicalFiguresUsed   跨场去重池
  _timeAnomaly                    演义跨朝代标签
  
  // 君臣对答 paradigm (亮点 4·11·22)·
  _kejuGenChiefExaminerMemorial   主考拟题 + 3 候选 + styleHint
  examinerProposeTopic            主考拟会试题
  generateDianshiQuestion         殿试出题
  viewAnswer / showAnswerModal     答卷查看 UI
  _qinDianPick                    钦点 (玩家手钦)
  
  // 经费 paradigm (亮点 5)·
  _kejuSettleLocalCosts           县/府/院三级
  _kejuSettleProvincialCosts      省级
  _kejuSettleCentralCost          国库 → 内帑 → 流产·三级 fallback
  
  // 殿试代主 paradigm (亮点 7)·
  openDianshiDelegatePicker       6 身份分类
  _kejuClassifyDelegate           身份判定
  
  // 党派 paradigm (亮点 8·16)·
  renderExaminerSelectStage 党派推荐段
  _kejuAggregateGradsEffect 党派吸纳段
  
  // 资格 paradigm (亮点 6)·廷议召集制原型
  _isPlayerFactionChar
  _kejuIsEligibleChiefExaminer
  _kejuHasChiefExaminerOffice
  
  // UX (亮点 20)·
  _kejuShowUrgentBanner
  _kejuNotifyUrgentStage
```

### 23.5·v5 Slice 实施时的"绝不做"清单 (12 条 red line)

```
❌ 绝不重写 keyi 800 行
❌ 绝不删 _kejuGenChiefExaminerMemorial (主考奏折)
❌ 绝不简化历史名臣检索 (shiliao 字段必保)
❌ 绝不删演义模式 _timeAnomaly
❌ 绝不改半文言风格 (LLM prompt 文案)
❌ 绝不删殿试代主 6 身份分类
❌ 绝不删党派推荐机制
❌ 绝不简化经费三级 fallback
❌ 绝不破坏 7 处持久化数据流
❌ 绝不替换 wuchang 5D 为西式 personality8D
❌ 绝不发明新代价 paradigm·复用 council/edict/defy 三 tier
❌ 绝不删 NpcMemorySystem.remember + AffinityMap.add 双轨
```

### 23.6·v5 真实工时分布 (亮点全保留 → 真新建工时缩)

```
真新建 (~15-20 d)·
  KejuTier 参数化 + 9 朝代 preset      4 d
  P.keju.indicators F1/F2/F3 数学公式  3 d (扩 _kejuAggregateGradsEffect)
  GM._factionTension namespace         1.5 d
  _corrCalcExaminerCorruption 派生     0.5 d
  sc16 'impeach_examiner' schema 扩    1 d
  reformThemePool 主题映射             1.5 d
  F1/F2/F3 event-based tier 事件       1.5 d
  editor 字段扩                        1.5 d
  smoke 6 个                           2 d

扩 keyi 加 4 议题 (~3-5 d)·复用 800 行 paradigm
  examiner_pick / scandal / reform / allocation  各 1 d

扩 _aiGenerateFullCharacter / crystallize (~2-3 d)·
  4 属性派生注入 prompt + 历史名臣优先路径

集成 / migration / smoke / doc (~5-8 d)
─────────────────────────────────────
总·25-36 d (比 v5 estimate 31-46.5 d 更精确·因为亮点全是 [unchanged] 不算新建)
```

### 23.7·v5 paradigm 升级·**不是重构而是数学化 + 体系化**

```
旧科举·叙事性强·数据流完整·政治深度足
  - tier 数 hardcode (明清 6 / 唐宋元 3 两套)
  - 集团效果 (阶层 / 党派 / 吏治) 没数学化为 F1/F2/F3
  - 改革浪潮触发条件 hardcode·没接 F1-F3 / tension
  - 弊案完全没实现
  - keyi 只跑筹办·没 5 议题类型

v5 升级方向·**数学化 + 体系化·不是重构**·
  Slice 1-2   tier 参数化扩 9 朝代
  Slice 3     F1/F2/F3 公式化扩 _kejuAggregateGradsEffect
  Slice 5.5   GM._factionTension 结构化 (真新增)
  Slice 4-7   keyi 加 4 议题类型 (扩引擎)
  Slice 8     crystallize 4 属性派生 (扩 _aiGenerateFullCharacter)
  Slice 12.5  F1/F2/F3 event-based (扩 7 处持久化)
```

**audit 终极完成 (四次·亮点 audit 完成)**·plan v5 真正 paradigm-correct + 亮点全保留·实施 ready。

下一步·

1. 看 §23 亮点清单·有我漏的亮点·指我
2. OK → 启动 Phase 0·实施严格按 §23.5 12 条 red line + §23.4 [unchanged] 函数列
3. plan v5 真实工时·**25-36 d** (亮点全保留后·v5 estimate 31-46.5 d 偏保守)
