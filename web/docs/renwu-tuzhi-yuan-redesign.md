# 人物图志 · 御案米金重做设计 brief

> 立项 2026-06-04。owner 评：当前御案版「人物图志」(tmfRenwu) **远不如旧「完整人物志」(viewRenwu)，大量死字段死数据，UI 不美观**。
> 本次 = 把 viewRenwu 的**真字段深度** + 升级原型的**布局与 SVG 五代家谱树** + 御案米金的**视觉语言** 三合一融合，逐字段对齐引擎真值、**零死字段**。
> 体量：owner 明言「比撰写诏书+百官奏疏+鸿雁传书+史官实录加起来还多」，须慢做。

## 战场坐标（三处真实代码）

| 角色 | 文件 / 函数 | 性质 |
|---|---|---|
| **完整人物志（真字段金标准）** | `tm-renwu-ui.js` `viewRenwu(i)` :481 / `renderRenwu` :112 / `_rwRenderCard` :320 | 旧 modal·读引擎真值·字段最全·样式陈旧(dark) |
| **现御案版图志（死字段重灾区）** | `phase8-formal-modules.js` `renderRenwuModule` :1210 + `tmfRenwu*` 系列 | 已 ship·读一批不存在字段·满屏「未记」·暗色皮 |
| **升级原型（布局/家谱树可借）** | `preview/phase8-person-atlas-upgrade.js` `renderPersonAtlas` :801 | 未 ship 预览·3栏+6tab+SVG五代树+策名页·但 dark 皮 + 也有部分臆造字段 |
| 数据桥 | `phase8-formal-bridge.js` `getPeople()` :221 | **直接返回原始 GM.chars 对象**(只去重) → 深层字段唾手可得 |
| 视觉语言权威 | `preview/records-redesign-preview.html`（史册库 v4·御案米金） | shell + tokens 来源 |

## 真字段清单（authoritative · 全部出自 viewRenwu 实读，引擎确有）

### A. 身份 identity
`name` `title` `zi`/`courtesy` `age` `gender` `birthplace` `ethnicity` `faith` `culture` `learning` `stance` `party`(+`partyRank`) `speechStyle` `family`(+`familyTier`:imperial/noble/gentry/common) `officialTitle` `role` `occupation` `rank` `isPlayer` `alive` `deathReason`/`deathTurn` `appearance` `bio` `description` `personality` `personalGoal`/`goal`

### B. 数值 stats（含 getEffectiveAttr 特质加成）
`loyalty` `intelligence` `valor` `administration` `management` `charisma` `diplomacy` `military` `benevolence` `ambition` `stress` `health` `integrity`(廉) `mingwang`/`reputation`(名望) `xianneng`(贤能)
- 五常 `wuchang{仁,义,礼,智,信}`

### C. 特质 traits
- `traits[]` → `TRAIT_LIBRARY[id]`（name/effects/category·`TRAIT_CATEGORIES[cat].color`）
- `traitIds[]` → `P.traitDefinitions`（name/attrMod/opposite/aiHint/behaviorTendency/stressOn/stressOff）

### D. 状态 status badges
`location` `_travelTo{toLocation}` `_imprisoned`/`imprisoned`(+`_imprisonedTurn`/`_imprisonReason`) `_exiled`/`exiled` `_fled`/`_missing` `_mourning` `_retired` `_scheming` `joinTurn` `_mood`（喜/怒/忧/惧/恨/敬/平）+ `StressSystem.getStressLabel(ch)`

### E. 官制仕途
`_offRenderCareerHTML(name)`（现成 HTML 块·官制与仕途）

### F. 关系（**多源·真**）
- `_relationships{name:[{type,strength}]}`（friend/foe/rival/enemy/spouse/lover）
- `AffinityMap.getRelations(name)` → [{name,value}]（莫逆/亲近/死敌/不睦）
- `getBloodRelatives(name)` → [{name,relation}]（血亲）
- `OpinionSystem.calculateBase/getTotal(ch, playerChar)`（对君主好感·基础+事件分解）
- `_impressions{name:{favor,events}}`（对他人印象·感恩戴德…恨之入骨）

### G. 家族 family
- `GM.families[family]`{renown, branches[{name,members}]}
- `children[]` `spouse` `spouseRank`(empress/queen/consort/concubine/attendant) `motherClan`
- `GM.harem`{heirs[], pregnancies[{motherName}]}
- 家谱三/五代靠 getBloodRelatives + children 拼

### H. 记忆与经历（AI 记忆系统）
- `GM._memoryArchiveFull`(filter char===name) / `ch._memory` [{turn,emotion,event,who}]
- `ch._memArchive` [{period,summary}]（往事归档）
- `GM.characterArcs[name]` [{turn,type,desc}]（角色弧线）
- `ch._lifeExp` [{domain,desc}]（人生历练·按 domain 分组：军旅/治理/仕途/求学/师承/帝师/蛰伏/暮年/磨难）

### I. 文事
`GM.culturalWorks`(filter author===name) [{title,genre,subtype,turn,quality,mood,isPreserved}]·`_WENYUAN_GENRES[genre]`

## 死字段黑名单（tmfRenwu 现读·GM.chars 根本没有·**禁用**）
`publicPurse` `privateWealth`/`wealth` `clanPrestige`/`familyPrestige` `familyMembers` `relatives` `familyTree` `stressSources`/`pressureSources` `fame`(用 mingwang) `virtue`/`virtueMerit`(用 xianneng) `resources`/`resource` `leverage` `secret` `weakness` `aiPersona`/`behaviorModel` `historicalSources` `sourceRelations` `superior` `officeDuties` `hobbies` `mentor`(除非剧本确有) `haoName` `valueSystem` `personalGoals`(数组·真字段是单 `personalGoal`)
> 原则：**任何字段先在 viewRenwu / char-autogen / 剧本数据里 grep 到实例，才允许进设计**；grep 不到的一律不画，宁可不显也不留空壳「未记」。

## 融合设计 paradigm

御案壳（与 records/奏疏/鸿雁 同构）：`.zhi-stage>.zhi-frame>(.zhi-titlebar + .global-bar + .zhi-body[名籍 nav | 列传 main | 案侧 folio])`
独立命名空间 `.zhi-yuan`（志），CSS 走生成器或 install 注入，**不碰 styles.css**。

- **左·名籍（roster）**：统计条(在朝群臣/文/武/后宫/布衣/已殁·读真 _stat 逻辑) + 检索 + 党派/身份/状态筛选 + 排序 + 按派系分组的人物卡列表（卡片复用 _rwRenderCard 的信息密度：立绘+忠诚环+六维条+五常dot+状态chip+关系chip）。
- **中·列传（main）**：人物头屏（立绘大图+姓名字号+官职品秩派系chip+忠野压康四数+主操作行）+ 页签 + 详情卷轴。
  - 页签（**只保真数据 tab**）：**总览 / 身份 / 心绪 / 关系 / 仕途 / 家族 / 记忆 / 文事**（资源 tab 删——全是死字段；行动并入头屏操作行）。
- **右·案侧（folio）**：可用入口（问对/传书/官制/钉选·按位置闸门 tmfRenwuInCapital）+ 朝堂研判（忠野压康名贤·真值）+ 关系焦点（top5·AffinityMap）+ 风险与记忆（真 _memory）+ 五常速览。

### 灵魂细节（御案米金）
- 立绘走 `tmfRenwuPortrait` + 失败降级字形（同 records 的 `.pt-img`+`fallback::after`）。
- **五代家谱树 SVG**（借原型 renderFamilyTreeSvg·但喂 getBloodRelatives+children 真值）：金框=本人·虚线=姻亲·†=已故。
- 数值条用米金渐变；忠诚 SVG 环（_rwLoyRing）。
- 角色弧线/人生历练用 records 的 timeline2 / 乌丝栏样式。
- 对君主好感、印象用「御批」朱批色块呈现。
- chrome 文案朝代中立（名籍/列传/案侧/在朝/在外/内廷），官衔走剧本数据可留专名。

## 落地计划（保守拆刀·一刀一事·**先预览后 ship**）
0. 设计 brief + 真字段清单落盘 ✓
1. UI skill 拔高视觉方向（ui-ux-pro-max ×4查 + frontend-design）✓
   - 关键产出：八维/五常用**雷达命盘**(5–8轴最优)；风格双锚 E-Ink/Paper(哑光宣纸)+Skeuomorphism(装裱印玺质感)；动效 150-300ms/reduced-motion/每屏1-2主元素；纯衬线善本排印(楷+仿宋)。
2. 出独立预览页 `preview/renwu-tuzhi-yuan-preview.html` ✓（御案米金·7真字段形状样例·禀赋双命盘·五代家谱树SVG·全8 tab·名籍/列传/案侧三栏）
3. playwright 截图自审 ✓（无 JS 报错；总览+家族/关系/仕途/记忆四签+换人魏忠贤均渲染正常；命盘按角色差异化——魏忠贤五常多边形萎缩、忠诚环18飘红，一眼见人品）。截图存 `docs/renwu-preview-shots/`。**待 owner 审**。
4. 审过 → 运行时落地：新 `_gen_zhicss.js`(或 install 注入) + 重写 `tmfRenwu*` 渲染器读真字段（删死字段）+ 把 viewRenwu 深字段（_relationships/AffinityMap/OpinionSystem/getBloodRelatives/characterArcs/_lifeExp/GM.families/culturalWorks/_offRenderCareerHTML）接进御案壳。
5. 验：grep 死字段=0 / node 跑通 / 各 tab 真值 / playwright 截图。
> ship/热更须 owner 显式触发；预览阶段不碰运行时 tmfRenwu。
> ⚠️ 注意：另有实例可能并行改 phase8-formal-modules.js，运行时落地前先确认基线，防 clobber。

## v2 升级（已落预览·2026-06-04·owner「放开手脚·可结构调整+加新功能」）
在 v1 基础上做了结构调整 + 4 项新功能 + 视觉精修，全部 playwright 验过无 JS 报错：
1. **关系图谱 ego-network**（关系 tab 头牌）：SVG·本人居中金环、关系放射、青友/朱敌(虚线)、线粗≈强度、边labels、点节点跳转。原列表降为「强弱细览」。
2. **两人对参**（新功能）：roster 卡 hover 出 ⇌ 钮 → 与当前选中者对参。中区切为对参视图：**禀赋叠盘**(雷达双数据集·朱砂实线vs靛蓝虚线)+心性声望**发散并校条**+两人之间关系+**权衡批语**。决策利器(谁可托付)。雷达函数加 `opts.second` 支持叠加。
3. **印鉴**：按姓名程序化生成方印(玩家金/常人朱/已殁灰·双框)，钤于名讳旁。
4. **境遇横幅**：下狱/流放/赴任/丁忧/已殁/密谋醒目横幅(各配色+字徽)，嵌头屏。
5. **视觉精修**：立轴题跋(竖排仿宋)、版心角花、纸纤理、按压回弹微交互、题首居中钤印。
截图存 `docs/renwu-preview-shots/v2-*.png`。

## v3 升级（已落预览·2026-06-04·owner 八项菜单全选）
owner 用 AskUserQuestion 菜单全选，八项全做，全部 playwright 验过无 JS 报错（截图 `docs/renwu-preview-shots/v3-*.png`）：
**结构/新视图**（顶层视图切换 列传/朝局/排行）：
1. **朝局全景**：全体按派系聚类 SVG 势力图(皇室居中放射)+派系张力线(赤敌青亲·虚线)+权力天平彩条+派系卡(成员可点)+案侧派系势力榜。
2. **群臣排行榜**：忠诚/贤能/野心/压力/名望/廉介/军政 多维速排表(主维条形+点行入列传)+案侧前三。
**列传新页签**：
3. **本纪长卷**：横向编年长卷(履历milestone+近事arcs 沿时间轴·关键朱点·可滚)+官制+历练。
4. **此人眼中(视角)**：第一人称主观视角(自陈/吾眼中诸人/萦怀之事/立场)·接 _impressions/_memory。
5. **御笔朱批**：玩家持久批注(localStorage)·朱批样式·头屏可编(御批/改批/钤定)+案侧显示。
**功能扩展**：
6. **三人对参**：雷达三色叠盘(朱实/靛虚/青点)+三列并校条+两两关系+权衡·radar 加 opts.third。⇌钮渐进加人，✕移出。
**视觉**：
7. **善本质感深化**：纸纤理加层+四角做旧晕+命盘描入动画(radarIn)+视图翻卷动效(pageTurn)。
8. **立绘装裱体系**：立轴描金锦边多环框+天杆+画角钤印·支持真 img/glyph 降级。

技术补充：视图切换基建(state.view+renderViewTabs/setView)、setCompare 渐进 2→3、selectP 复位 view/compare。**当前预览=御案米金 v3·8 视图特性全活·仍待 owner 审 → 再进运行时落地（重写 tmfRenwu 读真字段+接 viewRenwu 深字段+本设计的视图/对参/朱批）。**

## 运行时落地·接线图（2026-06-04 实证审码·带 file:line）
> 核验方法：grep 定义处+写入处，**不信单一来源**（派出的 Explore agent 误判 `_impressions`/`AffinityMap`/`OpinionSystem`/`_mood`/`culturalWorks` 为"不存在/部分"，经亲自 grep 全部纠正为"真实可变"）。判定：真实可变=有字段+有生成+有读取+有变更；静态=生成后基本不变；需新增=游戏没有。

| 面板元素 | 引擎真源(读) | 生成处 | 变更处 | 判定 |
|---|---|---|---|---|
| 命盘八维/数值条/排行/对参 智武军政管交魅仁 | GM.chars[].{intelligence,valor,military,administration,management,charisma,diplomacy,benevolence}·viewRenwu 用 getEffectiveAttr | tm-char-autogen.js:147-185 | AI char_updates delta(tm-ai-change-applier) | 真实可变 |
| 忠诚 loyalty | .loyalty·viewRenwu:334 | tm-char-autogen.js:173 | global adjustCharacterLoyalty/setCharacterLoyalty(AI applier 调用) | 真实可变 |
| 压力/健康 stress/health | .stress/.health·viewRenwu:368,389,715 | tm-char-full-schema.js:119-120 | tm-char-economy-engine.js 每回合 tick | 真实可变 |
| 廉/名望/贤能 integrity/mingwang/xianneng | viewRenwu:401-405 | autogen:183 + economy _inferInitialFame:34 / _inferInitialVirtue:66 | NPC 互动(NPC_INTERACTION_TYPES.fameActor) | 真实可变 |
| 五常命盘 wuchang{仁义礼智信} | .wuchang·viewRenwu:392-397 | tm-char-autogen.js:117-145(_tmNormalizeWuchang) | 喂 economy:43-73；少有直接写 | 真实·生成为主少变 |
| 特质 traits/traitIds | TRAIT_LIBRARY / P.traitDefinitions·viewRenwu:409-423,767 | tm-traits-data.js 库；autogen | AI add_traits/remove_traits(endturn) | 真实可变 |
| 关系图谱/视角·关系网 | **三源**：①_relationships{name:[{type,strength}]} ②AffinityMap.getRelations ③OpinionSystem | tm-relations.js:118；tm-help-social.js:787(AffinityMap)/871(OpinionSystem) | AffinityMap.add(tm-chaoyi-changchao:1858/2607)；朝议/互动 | 真实可变 |
| 对君主好感/印象 _impressions{name:{favor,events}} | viewRenwu:833-845,938 | tm-mechanics.js:1667-1669(init) | tm-mechanics.js:1940/1997/2015(增/删/prune)；读 tm-hongyan-office:1392 | 真实可变(agent曾误判不存在) |
| 心绪 _mood | viewRenwu:890 | tm-mechanics.js:1766(由记忆算) | tm-mechanics.js:1772 / tm-endturn-followup.js:648(AI设) | 真实可变(agent曾误判) |
| 本纪/记忆/视角·AI记忆 _memory/_memoryArchiveFull/_memArchive | viewRenwu:897-935 | tm-memory-*(50+文件)·每回合推演 | tm-memory-turn-archive/rollup·persist | 真实可变·增长 |
| 角色弧线 characterArcs[name] / 历练 _lifeExp | viewRenwu:848,870 | tm-char-arcs.js；tm-memory-turn-inference | 推演追加 | 真实可变 |
| 家族 GM.families(renown/branches) | viewRenwu:613-699 | tm-char-full-schema.js:66-70 | endturn char_updates；事件 | 真实可变 |
| 后宫/子嗣 children/spouse/spouseRank/GM.harem | viewRenwu:631-662,989-1010 | full-schema:124；harem 系统 | 生育/婚配/继承；editor-crud | 真实可变 |
| 血亲 getBloodRelatives | viewRenwu:627,804 | 由 families+children 推 | 随家族变 | 真实可变 |
| 文事 GM.culturalWorks(author/genre/quality)+ch.works | viewRenwu:744-762 | **游戏内 push**:tm-game-loop:628/endturn-prep:175/endturn-apply:4178+ch.works:4165 | AI 推演创作累积 | 真实可变(agent曾误判无持久化) |
| 境遇横幅·状态 _imprisoned/_exiled/_fled/_mourning/_retired/_scheming/_travelTo | viewRenwu:365-379 | — | endturn/权限引擎置位 | 真实可变 |
| 位置/生卒 location/alive/deathReason/deathTurn | viewRenwu:356-362,527-529 | autogen/scenario | tm-endturn-apply(deathTurn=GM.turn)/tm-ai-apply-deaths | 真实可变 |
| 本纪/仕途·官制履历 career[]+officeTree+_offRenderCareerHTML | full-schema:77；viewRenwu:553 | autogen/office 系统 | tm-office-system/runtime 任免追加 careerEvent | 真实可变 |
| 朝局·派系势力 | GM.facs(leader)+**derivedStrength** | tm-faction-derived-strength.js 多维算 | endturn faction_updates·每回合 | 真实可变(预览用名望聚合占位→落地换 derivedStrength) |
| 朝局·派系张力 | **conflict_level(0-5)** FACTION_INTERACTION_TYPES | tm-relations.js:84-100 | 冲突演化记录 | 真实可变(预览用关系聚合→落地换 conflict_level) |
| **御笔朱批(玩家对人物批注)** | **无** | **无** | **无**（游戏"朱批"仅=奏疏/诏令批红 _edictEfficacyHistory） | **需新增**：char 加字段或客户端/存档存(预览已用 localStorage) |

**落地三注意**：① 数据形状适配——预览样例 shape ≠ 引擎 shape（`_relationships` 是对象 `{name:[{type,strength}]}`；`AffinityMap.getRelations(name)`→`[{name,value}]`；`_impressions` 是 `{name:{favor,events}}`），渲染器按真 shape 读。② 朝局两指标换真源(derivedStrength / conflict_level)。③ 御笔朱批是唯一"需新增"项，其余七大块直接接。
> 落地顺序建议：先接「只读真值」块(命盘/排行/对参/关系图谱/本纪/家族/状态)→ 再接「换源」块(朝局)→ 最后「新增」块(御笔朱批)。每块 grep 死字段=0 + node 验 + playwright 截图。
