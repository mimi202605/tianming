# 建筑功能 · 自拟营建 agent — 全面升级设计案（2026-06-20）

> 承 `region-panel-buildings-fields-design-2026-06.md`（建筑工役引擎 S1–S7 已落运行时）
> + P1/P2 面板字段活化（军备 A1–A4 / 物产 B1–B4 / 治理 C1–C3 已收官）。
> **现状结论：建筑骨架已成熟、自拟营建闭环已完整。本案不重做——把自拟营建升为真 agent，并把建筑接进刚激活的活世界。**
>
> **架构定案（owner 拍板 2026-06-20）**：自拟营建改 **agent 架构**——按玩家描述，AI **当场**核定建筑的效果 / 工期 / 造价 / 可行性；**核定 + 准奏开工**；且**注入回合推演不隔绝**。详见 §三第一组、§六。
>
> **进度 2026-06-20**：**A1 已落**（`tm-custom-build-agent.js`·`inspectRegion` 双源勘地 + `appraise` 单发核定 forceTool + UI【请有司核议】按钮 + `_dfAppraiseCustomBuild` 处理器）。node smoke 42/42 + boot 321/321 + 真机模块层验。⚠ **真机逮到 P/GM 双 adminHierarchy 约定**（建筑系统读 `P.adminHierarchy`、边警/官缺读 `GM.adminHierarchy`，无疆域 save 二者不同步）→ `_findDivByName` 改搜双源（node mock 发现不了的取叶教训）。真 LLM 核议 + 真实 region 勘地待 owner BYOK + 地图剧本真机。
>
> **A2 已落**（落账硬门：`appraise` 的 effectsStructured 必过 `sanitizeStructuredFx`〔白名单 + 费效封顶〕削正才认；`effectsRaw` 留 AI 原拟可观测；人话徽签走 `fxLabels`〔与真实建筑册页同源〕+ 维护费；核议帖卡片升级显效果徽签。**判断当场自由，落账走硬门。** node smoke 50/50〔含真实 tm-building-works 模块：越界 0.5→0.03、白名单外丢弃、城防费不及丢弃〕+ boot 321 + 真浏览器硬门 live 验。）
>
> **A3 已落**（准奏开工 + 注入推演不隔绝：`approveBuild` 扣银走 `FiscalEngine.spendFromGuoku`〔国库·有欠账不阻断·同募兵/军工〕+ 落 `division.buildings[]` status=building〔过既有工期 tick 完工入账·timeActual<1 钳 1·effectsStructured 已 A2 削正·标 `_viaAgent`〕+ 记 `GM._pendingCustomBuilds`；**推演 prompt 新段 2.7「本回合玩家新营建及有司核议」**〔令推演当现行国是·百官/士绅/敌国反应·世界回应〕——`_recordPlayerActionSignal` 只喂 calibrator 不进 prompt 故须显式加段；UI 核议帖加【准奏开工】钮 + `_dfApproveBuild`。node smoke 64/64 + boot 321。⚠ owner 中途把活 preview 浏览器导到「顶栏 v4-vitals 设计稿」mockup 页，故 A3 只 node+boot 验，游戏页 live 留 owner BYOK 真机。）
>
> **A4 已落**（活字段 write 词汇表·**守改源头铁律**：①`defenseBonus` 新源头叶纳白名单 + `tickBorderRisk` 折入防御比〔每档≈2000 驻军之防〕·smoke 雄关边警 **74→24**；②`officialSupply` 新源头叶纳白名单 + `tickOfficeVacancy` 减实任〔育才储官〕·smoke 空府官缺 **1→0**；③DEFAULT_FX 烽燧/巡检升级给 defenseBonus〔原纯叙事现真入账〕+ 书院加 officialSupply；④sanitizeStructuredFx 封顶 + fxLabels 徽签 + agent/主推演 prompt 教 AI〔派生值须经源头叶〕。⚠ **strategicValue 查真实数据是描述性字符串〔「西番羁縻」「首善之区天下中枢」〕非数值** → 不进数值白名单〔addPath 会 NaN 化〕·走叙事〔AI 看营造册自然权衡〕——§三表中「直接纳白名单」假设它是数值，是错的；军压走 economyBase 间接、皇庄走 farmland 传导〔imperialFarmland 派生〕。改 5 文件·node 70/70 + border-risk/office-vacancy 消费验 + boot 321。
>
> **A5 已落**（多步深化 + 谏官对抗审·**全走次要 API**〔owner 拍板「默认走次要 api 优先」·`_TIER` 可配默认 secondary〕：①`appraise` 改多步循环 `_decideMultiStep`〔baseline 勘地注入 + agent 可再调 `inspect_region`/`recall_precedent`·transcript 累积伪多轮·末轮 forceTool 逼 submit·`customBuildAgentRounds` 默认 3 设 1 即单发·护栏 ≤4/轮〕；②`recall_precedent` 复用 `AgentReadTools.handle('recall_history')` → ② 按需取数；③谏官 `_critiqueAppraisal`〔审过誉/工期虚短·过誉→缩 pct/abs·虚短→提 timeActual·谏言缀 reason·`customBuildCriticEnabled` 默认开·失败不动宁严勿宽〕；④toolStats/critique 可观测。node smoke 79/79〔rounds=2 先勘后核·reads=1·谏官 sound=false·工期 4→8·效果 40000×0.5→20000 过硬门留存·三段调用 r1+r2+critique·全程 secondary〕+ boot 321。）
>
> **🎖️🎖️ 自拟营建 agent A1–A5 全落·真 agent 深度齐**：玩家描述 → 请有司核议〔多步勘议 inspect/recall + 硬门〕→ 谏官覆核〔过誉/虚短回调〕→ 核议帖〔徽签〕→ 准奏〔扣国库 + 落库〕→ 注入推演〔不隔绝〕→ 工期 tick 完工入账 → 活字段拨动世界〔边警/官缺〕。~~S4~~、~~S5~~、~~S6~~、~~S7~~ —— **第二组全收官**。
>
> **S6 生命周期已落**（灾损 + 修缮 + 维护费分档·tm-building-works.js）：①维护费分档 `_upkeepRateFor`〔军工/城防/水利 3%·文教/仓廪/宗教 1.2%·余 2%·跨朝代通用词〕；②`damageBuilding`〔按 appliedDelta 逐路径 revert 一半·民心/吏治跳过·存 `_damageReverted`·appliedDelta 同步减→destroy 的 revertBuilding 不双扣〕/`repairBuilding`〔re-apply 那一半复完〕；③灾异触发 `_freshDisasterSeverity`〔读 B4 写的 `economyBase.disasterRecord` startTurn===本回合·重 40%/中 18%/轻 5%〕整合进 tick〔完工遇灾概率半损·半损库银可支半费(造价 30%)则修缮·开关 `buildingHazardEnabled` 默认开〕。node smoke-building-lifecycle 25/0 + 回归（城墙维护 600→900 军工 3%）31/0。
>
> **S7 营造可观测账已落**：`buildingLedger`〔返实入账 appliedDelta 真贡献·区别 per-level 规则·万化 + 维护 + 工成之利岁入 % + 半损态〕+ 营造志卡 bkYeCard 接〔加 damaged 半损态 + 实入账行 + 工成之利·内联样式不碰 styles.css〕。node 33/0 + boot 321。
>
> **🎖️🎖️🎖️ 建筑 + 自拟营建全工程完结**：自拟营建 agent A1–A5（真 agent 深度：描述 → 多步勘议 → 谏官覆核 → 准奏扣银落库 → 注入推演 → 活字段拨世界）+ 第二组 S4 编辑器 bug / S5 NPC 自主营建 / S6 生命周期 / S7 可观测账。全 node + boot 验·**未 commit**·待 owner BYOK 真机整轮验 + commit 固化。
>
> **S4 已落·但前提须更正**（⚠ 详设 S4 前提错——写文档时信了 Explore agent 二手诊断「editor.js:2061 有输入框但填了即丢」，**没核 HTML**。真相：`buildingTypeEffects`/`buildingTypeRequirements` 元素**已随「效果由 AI 判定」改版从 editor.html 删除**〔modal 仅 name/category/description/maxLevel/baseCost/buildTime + 一条「※ 效果由 AI 智能判定·无需手工填写结构化数值」〕；残留 editor.js:2061-2062 **无守卫** `getElementById(...).value` → `openAddBuildingTypeModal` 抛 TypeError →「+ 添加建筑类型」按钮〔editor.html:1741〕点了**模态打不开**·用户可见真 bug）。**修 = 守卫那两行**（同下方各字段已守卫款）·node 语法 OK。**「作者准账 effects UI」已被 AI 判定〔A1–A5 正是其实现〕取代·不逆向重加**——这是「agent 二手诊断先核实」教训的又一例。
>
> **S5 NPC 自主营建已落**（第二组首刀·活世界·按详设批准的 **LLM 维度**）：`decideFor` 增营建维度（grep 原零命中→从无到有）·**骑同次决策调用·零额外成本**（同 proposals/goalUpdates 范式）：①感知段 `_formatBuildOpportunities`〔本派叶借 A4 活字段·边警≥50 宜筑防/官缺≥2 宜兴学/田邑可垦·开关 factionAgentEnabled 守卫返空零回归〕；②prompt 教 `builds` 输出〔territory 须本派真实地块·effectsStructured 白名单 A4 字段〕；③落地 `_landFactionBuilds`〔读 `raw.builds`·只许本派真实叶·过 `sanitizeStructuredFx` 硬门·防重复同名·≤3 护栏·不合理拒·status=building 过既有工期 tick·标 `_viaFactionAgent`·不扣国库〕。node smoke-faction-build 15/15 + boot 321。改 `tm-faction-npc-llm-decision.js`（复用 `_findAdminTreeForFac`/`_collectLeafDivs`/`_formatBorderIntel` 范本）。真机：NPC 势力 LLM 实际产 builds 待 owner BYOK + 有 NPC 疆域的剧本。
>
> **S5 完善已落（2026-06-21·owner「完善 npc 自主营建」）**：补三硬核缺口——①**经济约束** `_landFactionBuilds` 扣本派 `fac.treasury.money`·库银不继则不建（穷国受限·无 treasury 的派经济抽象不约束）；②**可观测** `_ebFactionBuild` → addEB「谍报」让玩家见敌国营建（「后金于宁远筑『镇边堡』」·活世界 intel）；③**NPC 自修** `_repairFactionBuildings` 闭 S6 损坏循环（本派 damaged 建筑库银可支半费则走 `repairBuilding` 复效用 + 扣 treasury + 谍报「葺治」·decideFor 块内独立于本回合是否新建）；④**感知财力门槛**（`_formatBuildOpportunities` 加「本派库银约 X·量入为出」）。node smoke-faction-build 31/31 + boot 321。

---

## 零、命门对齐（为什么升这两个功能）

自拟营建是全游戏「**硬核 × 自由**」最直接的化身：玩家凭空想一座建筑（义仓 / 海图测绘局 / 译书馆 / 巡检司 / 养济院……），引擎必须给**硬核可信**的回应——可行吗？造价几何？工期多久？效用落在哪本账？这正是项目北极星「**命门 = AI 在玩家自由下给硬核可信回应**」的微缩样本。一座 agent 当场据实核议，就是这命门最纯粹的落点。

故本案以**自拟营建 agent 为核心**（第一组），建筑系统深化为辅（第二组）。

---

## 一、现状盘点（已实查 file:line · 勿重做）

**成熟、不动：**

| 环节 | 位置 |
|---|---|
| 玩家入口 `_dfBuildModal`（剧本工籍 + 自拟营造两页签）→ 推 `GM._edictSuggestions` → 颁诏 | tm-player-core.js:1160 / 1229 |
| AI 核定 `building_changes[]`（feasibility 三档 / costActual / timeActual / judgedEffects / effectsStructured / armoryProfile） | tm-endturn-prompt.js:3330–3341 |
| 落库 `division.buildings[]` | tm-endturn-apply.js:3787 |
| 工期 tick + 完工入账 + appliedDelta 可逆 + 费效封顶 + 维护失修 | tm-building-works.js（tick:342 / applyCompletion:224 / sanitizeStructuredFx:107） |
| AI 营造册感知（各地已建/在建注入 prompt） | tm-endturn-prompt.js:3180–3208 |
| 工成之利流量状态 / 军工 armoryProfile → 武库 | tm-building-works.js:320 / tm-armory.js:238 |
| 玩家动作信号通道（注入推演用） | tm-player-core.js:1246 `_recordPlayerActionSignal('construction',…)` |

**效果来源优先级**（resolveEffects:146）：剧本模板 `buildingTypes[i].effects`（作者准账）＞实例 `effectsStructured`（AI 核定·白名单+费效封顶）＞`DEFAULT_FX` 关键词推断。

---

## 二、缺口（精准 · 已核）

| # | 缺口 | 证据 | 命门伤害 |
|---|---|---|---|
| **G1** | **盲提交 · 无当场核定** | 自拟提交直进 `GM._edictSuggestions`，须颁诏、待回合末推演才知行不行、费几何 | 创意的**瞬间**得不到硬核回应——自由有输入、无反馈 |
| **G2** | **白名单坍缩 · 活字段脱节** | `WHITELIST` 仅 14 条 economyBase + fortLevel/coastalDefense/militaryRecruits；P1/P2 刚激活的活字段（borderRisk / armyPressure / officeVacancy / strategicValue / imperialFarmland）**建筑一概碰不到** | 创意效果出白名单即静默丢弃→沦为纯叙事建筑；**字段活化工程与建筑工程两套没接通** |
| **G3** | **核定缺硬数据** | feasibility 凭叙事判——AI 未被告知此地有无矿藏/盐井/沿海、farmland 余量、已建同类、边境威胁、丁口余量 | 「硬核可信」缺地基——沿海可建市舶/内陆不可的硬约束无据 |
| **G4** | **编辑器 effects/requirements 是孤儿** | editor.js:2061–2062 有输入框，但 `saveBuildingType`(:2110–2116) 不存、`editBuildingType`(:2079) 不载——**填了即丢**（bug） | 作者准账（最高优先级槽位）**有位无 UI** |
| **G5** | **NPC 不自主营建** | `tm-faction-npc-llm-decision.js` 的 building/营建/营造/筑城 **grep 零命中** | 活世界缺一块——势力不像玩家筑城/囤粮/兴学 |
| **G6** | **生命周期单薄** | damaged 态半接；维护费一刀切 `cost×2%` | 无灾损/兵燹反馈，军工与文教同价养护 |
| **G7** | **营造无可观测账** | 工成之利流量隐于状态系统 | 违「可追因果」判据——玩家不知每座建筑本回合贡献几何 |

---

## 三、升级设计

### 第一组 · 自拟营建 agent（命门核心 · 架构定案）

> owner 拍板：把自拟营建从「提交 → 回合末核定」升为**真 agent——按玩家描述，AI 当场核定效果/工期/造价/可行性**。这是「加强原架构」到「真 agent」的跃迁。

**一条纪律钉死（防玄幻）：判断当场自由，落账走确定性硬门。**
- *判断*（agent 当场做·可多步）：勘此地 → 查先例 → 创意核定效果/工期/造价/可行性——自由、有据、可创意。
- *落账*（铁律不松）：agent 的 `effectsStructured` 仍过 `sanitizeStructuredFx`（白名单 + 费效封顶），仍落 `division.buildings[]` 走工期 tick 完工入账，仍守「改源头叶子」。**十两银修不出雄关——不因 agent 而废。** 这是 P-QAM 两层范式（提示词软约束 + apply 硬门）用在营建：**创意自由，账面铁律。**

**闭环（核定 + 准奏开工，且注入回合推演不隔绝）：**

```
玩家自拟描述（弹窗）
  → 【请有司核议】
  → 自拟营建 agent 当场核定（read 工具勘地 → 创意核效 → 硬门封顶）
  → 核议帖：可行性档 + 判语 + 估算费/期 + 预期效果徽签
  → 玩家【准奏】（或改了重核 / 撤案）
  → 准奏即扣银开工：落 division.buildings[] status=building · effectsStructured 锁定 · remainingTurns=工期
  → ★注入回合推演（不隔绝）：玩家新营建 + 有司核议记为本回合现行事件，
     推演 AI 当其织叙事、引百官议/士绅应/敌国警，世界亦可回应（战乱/灾异扰工）
  → 工期 tick → 完工入账（既有引擎 · 不变）
```

agent 架构把原 S1/S2/S3 三刀**合一**，更紧：

| 原刀 | 在 agent 架构里的归宿 |
|---|---|
| **S1 即时预核**（advisory） | **升成 agent 当场核定**（权威·非建议）：玩家描述 → 多步推理 → 出账，玩家准奏即开工 |
| **S3 营建勘报**（我们预喂静态数据包） | **内化成 agent 的 read 工具**：agent 自己勘地（沿海? 有矿? farmland 余量? 已建同类? 边境 borderRisk? 官缺? 丁口? 财力?），非硬喂 |
| **S2 活字段耦合** | **成 agent 的 write 词汇表**：可核定效果扩到活字段，仍守改源头叶子（见下表） |

**活字段 write 词汇表（agent 可核定 · 守改源头铁律）：**

| 活字段 | 接法 | 建筑例 |
|---|---|---|
| `borderRisk` 边警（派生） | 新增源头叶 `defenseBonus` → `tickBorderRisk` 纳入 → 边警降 | 巡检司 / 堡寨 / 敌台 / 烽燧 |
| `officeVacancy` 官缺（派生） | 新增源头 `officialSupply`（育才储官）→ `tickOfficeVacancy` 实任加成 → 官缺降 | 书院 / 学宫 / 贡院 |
| `armyPressure` 军压（派生） | 已可间接：军屯增 economyBase → 本地留用↑ → tick 重算 → 军压降（prompt 教此路） | 军屯 / 养兵庄 |
| `strategicValue` 战略价值 | 直接纳白名单（decideFor 已读·雄关要塞抬升它） | 雄关 / 要塞 / 锁钥城 |
| `imperialFarmland` 皇庄 | 已是源头（farmland×0.05 派生）·皇庄类写 farmland 自然传导 | 皇庄 / 官田 |

每条配 `fxCostCaps` 封顶（费效为度）。**这一刀让字段活化工程与建筑工程焊在一起。**

**复用现成积木**：`callAIWithTools` + read-tool 范式（`tm-endturn-agent-read-tools.js` 6 工具）+ `sanitizeStructuredFx` 硬门 + 国师 `runWithCritics` 对抗式（可选·谏官当场审「效果过誉/工期虚短」再锁）。
**成本**：自拟营建是玩家**偶发、刻意**的动作（非每回合每地），一次多步 agent 调用可承受——深度优先（定位=换深度非降本）。

### 第二组 · 建筑系统深化（活世界 / 作者权 / 可观测）

#### S4 · 编辑器 effects/requirements 落地（修孤儿 bug + 编排）
`saveBuildingType` / `editBuildingType` 补读写 `effects`（结构化 oneShot/perTurn/upkeep）+ `requirements`（前置：沿海 / 矿藏 / 已开海 / 最低繁荣）。作者准账优先级槽位终于有 UI 喂；requirements 喂给 agent 勘地当硬约束。

#### S5 · NPC 自主营建（活世界）
`decideFor` 增「营建」维度（grep 零命中→从无到有）：边境受威胁→筑堡降边警、灾前→囤仓、财政宽裕→兴利、官缺重→兴学。骑现有 `building_changes` 通道落库。开关并入势力 agent 总闸。

#### S6 · 生命周期深化
`damaged` 态真接（兵燹 / 灾异过境 → 半损 · 效果减半 · 可半费半期修复）；维护费随类别分档（军工/水利贵养，文教/仓廪廉养）。

#### S7 · 营造可观测账
每座建筑「本回合贡献」ledger 透明化，营造志卷每卡显「岁入 +X / 边警 −Y」——呼应字段活化「可追因果」判据。

---

## 四、自拟营建 agent · 实现切片（一刀一事）

| Slice | 内容 | 依赖 |
|---|---|---|
| **A1 · agent 骨架 + 勘地 read 工具** | 新 `tm-custom-build-agent.js`：自拟弹窗【请有司核议】→ agent 入口；read 工具集 `inspect_region`（地理/物产 tag/farmland 余量/已建/fortLevel/边境/官缺/丁口/财力·复用 tm-endturn-agent-read-tools 范式）；先单发核定。无 agent / 关闭时回落原建议库路径。 | — |
| **A2 · 核定硬门 + 核议帖 UI** | agent 产 `{feasibility, costActual, timeActual, effectsStructured, judgedEffects, reason}` → 过 `sanitizeStructuredFx`（白名单+费效封顶）→ 核议帖卡片（可行性档+判语+费/期+效果徽签）；玩家【准奏】/【改了重核】/【撤案】。 | A1 |
| **A3 · 准奏开工 + 注入回合推演** | 准奏 → 扣银、落 `division.buildings[]` status=building、effectsStructured 锁定；**注入推演**：`_recordPlayerActionSignal('construction',…)` + 推演 prompt 新段「本回合玩家新营建及有司核议」→ AI 当现行事件织叙事/反应，世界可回应（不隔绝）。 | A2 |
| **A4 · 活字段 write 词汇表** | 新源头叶 `defenseBonus`/`officialSupply` + `tickBorderRisk`/`tickOfficeVacancy` 消费 + 封顶；`strategicValue`/`imperialFarmland` 纳白名单。agent 核定可拨活世界。 | A2 |
| **A5 · 多步深化 + 对抗式审核（可选）** | agent 升多步（inspect → `recall_precedent` 查史实先例 → 核定）；国师式谏官 critic 当场审「过誉/虚短」再锁。 | A1–A4 |

第二组（建筑系统深化·原案不变）：S5 NPC 自主营建 → S4 编辑器 effects 落地 → S6 生命周期 → S7 可观测账。

每片：独立 smoke 断言 + 关键改动留 `.bak` + node 跑通再说完成 + **真机验关键路径**（取叶 / prompt 注入历史教训：node mock 会掩盖真实 bug）。开关 `customBuildAgentEnabled`：关时回落原建议库路径。

---

## 五、范式对齐自检

- ✅ **改源头叶子，不直写派生值**——A4 为活字段配源头加成叶（defenseBonus/officialSupply），borderRisk/officeVacancy 各自 tick 重算
- ✅ **玩家操作只走诏令/拍板**——agent 核议是据实判断，玩家**准奏**才扣银开工，面板纯视图
- ✅ **提示词软约束 + apply 硬门双层**（P-QAM）——agent 判断自由，effectsStructured 仍过 `sanitizeStructuredFx` 白名单 + 费效封顶
- ✅ **注入推演不隔绝**——自拟营建是模拟世界一等公民，非侧信道孤岛（防「推演不知/UI 不落」旧坑）
- ✅ **跨朝代通用**——巡检司 / 义仓 / 书院 / 堡寨 / 烽燧皆通用古制；东厂 / 辽饷等专名归剧本
- ✅ **失败禁玄幻惩罚**——不合理 = 不开工 + 陈情；无据 = 工期延 / 费用增，皆自然账务结果
- ✅ **复用现成 agent 积木**——callAIWithTools / read-tool 范式 / sanitizeStructuredFx 硬门 / 国师 runWithCritics

---

## 六、架构决议（owner 拍板 2026-06-20）

1. ✅ **自拟营建 = 真 agent 架构**——按玩家描述当场核定效果/工期/造价/可行性（非回合末才判）。
2. ✅ **核定 + 准奏开工**——agent 当场核议 → 玩家**准奏**即扣银开工（守玩家拍板·闭环在瞬间·不待回合末）。
3. ✅ **注入回合推演不隔绝**——新营建 + 有司核议记为本回合现行事件，推演 AI 当其织叙事/反应，世界可回应。自拟营建是模拟世界的一等公民，非旁支孤岛。
4. ✅ **判断当场自由，落账走硬门**——agent 判断自由多步，effectsStructured 仍过白名单 + 费效封顶 + 工期 tick。

待实现时拍：A5 多步/对抗式审核是否首版即上；`customBuildAgentEnabled` 默认开关（agent 有调用成本·倾向可 toggle·关则回落原建议库路径）。
