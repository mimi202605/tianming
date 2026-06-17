# 科举·Stage 2 计划文档

**date**·2026-05-23 (创立)
**status**·draft·待 user 补充 + 拍板

---

## 0·分界

| 阶段 | 范围 | 状态 |
|---|---|---|
| **Stage 1** | 常科系统·Phase A→F·9 朝代 preset / keyi 议政 / 9 议题路由 / 主考派生 / 殿试代主 6 身份 / 进士 100% 党派 / 朝代选官分配 / D1 长尾·门生网络 + 上书 + 集会 + 言官清议 + incident hookup | ✅ ship 完 (1.2.4.x - 1.2.5.2) |
| **Stage 2** | 特科 + 私学/书院 + 宦官干预 + 三指针闭环 + UI/编辑器 + **user 待补充** | ❌ 全未 ship |

**user 锁**·Stage 2 重做 paradigm 是"4 类特科各做 full mini-keju·内容机制不比常科少"·G 不可走通用 runner。

---

## 1·Stage 1 已 ship 汇总 (作为 Stage 2 baseline)

### 常科系统·Phase A-F

| Phase | 内容 | 文件 |
|---|---|---|
| **A** | 制度激活·sc0 5 档 LLM·UI 入口·_kjInferLearningTraits 派生 | tm-keju-runtime.js·tm-keju-activation.js |
| **B** | KejuTier 数据结构·9 朝代 preset·keyi 接参化·9 议题路由 | tm-keju-tier.js·tm-keju-presets.js·tm-keju-topic-router.js |
| **C** | 主考 4 属性派生·tension + corruption·会试拟题 UX·经费 UI | tm-keju-runtime.js·tm-keju.js |
| **D** | 殿试代主 6 身份·AI 代拟策问 + 玩家亲笔·答卷生成·钦点三甲·进士 eager + crystallization | tm-keju-runtime.js·tm-keju.js·tm-keju-dianshi-events.js |
| **E** | mentor 反向索引·进士 100% 党派·朝代联动选官分配 | tm-keju-mentor.js·tm-keju-allocation.js |
| **F** (D1 维度) | 门生网络·上书 (走常朝)·同年集会 (走常朝)·言官清议 (4 sub-slice·接弹劾 incident) | tm-keju-disciple-graph.js·tm-keju-disciple-memorial.js·tm-keju-cohort-meet.js·tm-keju-yanguan-* |

### Stage 1 设计原则 (Stage 2 继承)

1. **flag gate**·新机制默认 off·user toggle 开
2. **走常朝 source pool**·非 modal·非邸报·LLM 改写 NPC 上奏
3. **9 朝代 preset 可配**·不 hardcode·剧本可改
4. **党争联动**·读 GM.parties·不 hardcode 党名 (因每剧本不同)
5. **触发自然政治**·禁玄幻惩罚 (彗星/天命扣减)
6. **保留 keyi 800 行**·扩 topicType·不重写
7. **历史名臣 + shiliao**·保留原文摘引

---

## 2·Stage 2·Phase G·特科·**4 mini-keju** (核心扩·user 锁深做)

**总估·13-22 d** (G1 1-1.5d + G2-G5 各 3-5d)。

### G1·shared infra (1-1.5 d·Release 1.2.5.3)

| 字段 | 内容 |
|---|---|
| 新文件 | `tm-keju-special-exams.js` (~250 行) |
| GM 命名空间 | `GM._specialExamCalendar = { enke/wuju/fanyi/tongzi: { config, spawned[], history[], cooldown, _activeExam } }` |
| endTurn hook | 跟 F2/F3/F4c 一致 pattern·deferred phase5 + render-finalize 2 处 |
| spawn paradigm | 走 _cc2_collectAgendaSources 常朝 source pool·LLM 改写为礼/兵/理藩院 NPC 上奏 |
| flag gate | `P.conf.useNewKejuD2=false` 默认 off |
| G1 不含 | 任何类型 runner·任何 journey·任何题目·G2-G5 各自带 |

---

### G2·恩科 (Imperial Grace Exam)·3-4 d·Release 1.2.5.4

**历史 paradigm**·"破常制·示天恩"·寿诞 / 改元 / 大婚 / 平大乱 / 瑞祥应天。9 朝代全有。

| 维度 | 内容 |
|---|---|
| **触发 (5 类)** | (1) 皇帝整 60/70/80 大寿必触·30/40/50 概率触<br>(2) 改元后 1 年内<br>(3) 大婚后 1 年内<br>(4) 平大乱后<br>(5) 异瑞应天 (祥瑞奏报) |
| **玩家议政** | 礼部尚书上奏·允/驳/推迟<br>党派立场·帝党支持·清流可能反对 ("恩科不正经") |
| **主考** | 必为内阁大学士 / 礼部尚书 (非通常考官)·体现"恩典出自陛下" |
| **副考** | 翰林学士·清流官员可参与 |
| **journey** | 简化版常科 + 大典仪式·童试可豁免·**新增·谢恩大典** (御前三叩九拜·LLM 生成谢恩奏疏) |
| **题目** | 诗赋为主·题目体例·`策问·圣德颂` / `赋·大典颂`·LLM prompt hint "歌颂体·150-250 字" |
| **录取** | 名额 30 (比常科多 30%·示恩)·名义"特赐进士" |
| **授官** | 正常授官 + 派系偏帝党·affinity +10 |
| **进士后果** | `_specialExamType='enke'`·`memorySeed='蒙陛下不次之恩'`·初始 affinity+10·禁党=帝党 (天然倾向) |
| **长尾 (类 F1)** | 恩科进士同年集会·独立 cohort·身份感强烈·党争中倾向帝党 |
| **联动** | 党争·言官清议时·恩科出身的言官攻击力 -10 (因为受过皇恩)·会被清流标"邀宠" |
| **不办的后果** | 朝臣议"陛下吝赏"·prestige -5·60 大寿不办·士林失望·下次报考 -20% |
| **新文件** | `tm-keju-enke.js` (~400 行) |

---

### G3·武举 (Military Exam)·4-5 d·Release 1.2.5.5·**联动军事 system**

**历史 paradigm**·唐 702 立 (郭子仪 722 武举)·宋以后兴废·明 1387 制度化·清沿袭。

| 维度 | 内容 |
|---|---|
| **触发 (4 类)** | (1) 边事≥60 → "边镇告急·选将"<br>(2) alive 武将<5 → "军中缺将"<br>(3) preset.wuju_interval 到期 (周期性)<br>(4) 玩家主动 keyi 议 (备战) |
| **玩家议政** | 兵部尚书上奏·允/驳<br>党派立场·武将派支持·文官清流反对 ("武人不学") |
| **主考** | 五军都督府都督 / 兵部尚书 (必有军功背景·从 chars filter)·若无合适人选·拒开 |
| **副考** | 军中将领 3-5 人 (从 chars 武将自动 pick·按武功 + 声望) |
| **tier** | 童试 (县校尉) → 乡试 (省都司) → 会试 (兵部) → **殿试·御前比武** (真有比武环节) |
| **题目·三场** | (1) 弓马·骑射成绩 (步射 9 矢中 3·骑射 4 矢中 2 为合格)<br>(2) 韬略·兵法策问 (孙子/吴子/三略)<br>(3) 战例·历史战役分析 (按朝代取近代战例) |
| **录取** | 武进士 5-10 人·一甲三人·**武状元 / 榜眼 / 探花** |
| **授官** | 状元授参将 (从二品)·榜眼游击 (正三品)·探花守备 (正四品)·其余千总/把总·写入 ch.officialTitle |
| **进士后果** | `_specialExamType='wuju'`·**valor+30·武功+30**·入营 `ch.unit='京营'/'边军'`·年龄 18-25 |
| **长尾** | (1) 武进士同年集会·独立 cohort·军中山头<br>(2) 北征/平叛事件可由武进士领·LLM event spawn<br>(3) 武进士派系·跟文官平行·"武进士党 / 武勋党" |
| **联动 (核心价值)** | (1) 真接入 chars 武将·北征/平叛时可被点将<br>(2) 边事事件 spawn 时·武进士有专属 spawn 路径 ("武状元请缨")<br>(3) 武进士可被弹劾 (败战失利)·跟 F4c yanguan qingyi 联动 |
| **不办的后果** | 边事继续恶化·alive 武将<3 时·北征败战概率 +30%·prestige -10 |
| **新文件** | `tm-keju-wuju.js` (~500 行) + 联动 tm-faction-systems.js 加武进士党 spawn |

---

### G4·翻译科 (Translation Exam)·3-4 d·Release 1.2.5.6·**清朝专有**

**历史 paradigm**·雍正元年 (1723) 立·满汉双语取士·入理藩院 / 翻译房 / 军机处秘书。乾隆扩满蒙汉藏·咸丰废。

| 维度 | 内容 |
|---|---|
| **触发 (3 类)** | (1) 首次必触 (年≥fanyi_startYear)·非清自动 false<br>(2) 外藩使节来朝事件后<br>(3) 民族议题·`ethnicTension≥60` |
| **玩家议政** | 理藩院尚书上奏·允/驳<br>党派立场·满洲贵族 + 帝党支持·汉人清流可能反对·**触发民族议题** |
| **主考** | 必任满洲贵族·理藩院尚书 / 翰林院满侍读 (chars 中 _ethnic='满')·若无·拒开 |
| **副考** | 汉满双方·译官参议 (chars 中 _bilingual=true 优先) |
| **tier** | **无童试·无乡试**·直接由理藩院从在职官员 / 通译学堂推荐 → 会试 (满汉对译) → 殿试 (御前亲核) |
| **题目** | (1) 满汉对译·汉文奏疏译满文 + 满文谕旨译汉文<br>(2) 蒙古文 (乾隆后扩)·蒙古使节奏文翻译<br>(3) 边疆地理·准噶尔/西藏/朝鲜/越南 边务问答 |
| **录取** | 翻译进士 5-10 人·满人优先·汉人需精通满文 (从 chars 中 _bilingual=true 才能录) |
| **授官** | 理藩院主事 (从五品) / 翻译房 (从五品) / 军机处秘书 (从六品) |
| **进士后果** | `_specialExamType='fanyi'`·**满汉双语 tag**·`_bilingual=true`·`_eligibleForLifanyuan=true`·初始 affinity (满 +5·汉 +3) |
| **长尾** | (1) 翻译进士遇外藩使节主动上奏·LLM event spawn "理藩院 X 等议·准噶尔来朝事"<br>(2) 翻译进士可入军机处·参议机密<br>(3) 民族议题升级时·翻译进士可调和满汉 |
| **联动** | (1) 跟 ethnic_religion system 联动·满汉 affinity 差异<br>(2) 外藩事件·翻译进士独占 spawn 路径<br>(3) 边疆事件·跟翻译进士 spawn |
| **不办的后果** | 民族矛盾升级·满洲贵族不满·prestige (满人) -5 |
| **新文件** | `tm-keju-fanyi.js` (~400 行) + 联动 tm-ethnic-religion.js |

---

### G5·童子科 (Child Prodigy Exam)·2-3 d·Release 1.2.5.7·**罕见 + 长尾深**

**历史 paradigm**·汉桓帝偶设·宋天圣立·明清间断。考神童·10-15 岁。

| 维度 | 内容 |
|---|---|
| **触发 (2 类)** | (1) 州县官员主动荐举神童 (非概率·有 trigger 人物)<br>(2) 玩家主动 keyi 议 (备战·培养自己人) |
| **玩家议政** | 州县官荐举奏疏 → 礼部审 → 允/驳<br>党派立场·清流支持 (重视人才)·寒门派可能反对 ("未学先用·乱制") |
| **主考** | 翰林学士 / 侍读学士 (经学权威·chars 中 _scholarPoints≥80) |
| **副考** | 翰林院侍读 / 侍讲 |
| **journey** | **无 tier·无童试·无乡试·无会试**·直接御前考·3 场全部当日完成<br>御前考因年龄·有"温言慰问"环节 (LLM 生成皇帝跟童子对话) |
| **题目·三场** | (1) 五经默写·随机选 1 经 50 字默写<br>(2) 对句·上联给·下联应<br>(3) 诗赋·限题诗 / 命题赋 |
| **录取** | 童子郎 1-3 人·一甲一人 |
| **授官** | 翰林侍读 (正六品·特赐·年龄不符常制) / 侍讲 / 童子侍读 |
| **进士后果** | `_specialExamType='tongzi'`·年龄 10-15·**intelligence+20·prestige+10·career+10y 长尾** |
| **长尾·独特** | (1) **侍读小臣献策**·童子郎可献策·LLM event spawn<br>(2) **早慧不寿风险**·~10% 早卒 (15-25 岁)·LLM 生成"才华横溢·英年早逝"事件<br>(3) **长成大才路径**·若活过 30 岁·intelligence + 政治双爆·可任翰林学士·一甲进士 |
| **联动** | (1) 跟 D1 门生网络平行·童子郎特殊 cohort<br>(2) 翰林院体系·跟翻译科 / 进士翰林平行<br>(3) 童子党 spawn |
| **不办的后果** | 神童无出路·州县官失望·prestige (清流) -3 |
| **新文件** | `tm-keju-tongzi.js` (~350 行) |

---

## 3·Stage 2·Phase H·私学/书院 (D3·10-14 d)

**核心命题**·私学/书院作为 F1 下行通道·东林党根源·宋元明书院 timeline 演进。

| Slice | 目标 | 涉及文件 | 估时 |
|---|---|---|---|
| **H1** | `GM._schoolNetwork` namespace + 5 类书院 (官学/私学/书院/讲会/禁) + 朝代 timeline (北宋应天 / 朱熹白鹿洞 / 元代官化 / 明东林 / 明末复社)·玩家可 monitor/禁/容/扶·新加 `ch._schoolAffiliation` | 新 `web/tm-keju-school-network.js` (~300 行) | 3-4 d |
| **H2** | 书院影响力 + F1 派生加强·F1 = 备考池 / 总士人池 + 私学影响力 × 0.3 - 0.2·`_kjCalcSchoolImpact(school)` 讲会规模 × 影响力 × 党派·F1<30 + 私学占比>50% → "书院非朝廷" tier1·跟 F4 言官联动 | runtime _kjCalcF1 [扩]·新 `_kjCalcSchoolImpact` (~150 行) | 2-3 d |
| **H3** | 书院党派·东林 / 复社·影响选官·examiner 出身书院 factionBias+0.2·进士出身书院 ch.party 自动带书院党·东林='private+应天+同期同地'·复社='应天+1620+'·玩家 keyi `topicType='school_ban'`·禁/容/扶 三路径 | runtime _kejuExaminerView [扩]·_kejuAggregateGradsEffect [扩] | 3-4 d |
| **H4** | 禁书院 toggle + 历史 watershed (朱熹 1190 / 王阳明 1500 / 东林 1604 / 复社 1629 / 清禁讲学 1654)·禁短期 F1+10·长期 minxin-5·新派系"书院遗党" loyalty-15·扶 F1+15 权臣 tension+5·跟 E1 mentor 联动 (禁 mentor 则禁 disciple) | 新 `web/tm-keju-school-events.js` (~250 行)·event-system 集成 | 2-3 d |

**Phase H 总估**·10-14 d

---

## 4·Stage 2·Phase I·宦官干预 (D4·6-9 d)·**明清专有**

**核心命题**·明清司礼监批红 + 东厂阅卷·撕裂 examiner factionBias·宦党 (魏忠贤模式)。

| Slice | 目标 | 涉及文件 | 估时 |
|---|---|---|---|
| **I1** | `GM._eunuchInterference` namespace + 司礼监批红·`{secretary, dongchang, partisan, history}`·仅明清启用·`_kjCanEunuchVeto(decision)` 批红 toggle·`_kjEunuchInterferenceLevel()` 算 corruption + influence × 2 | 新 `web/tm-keju-eunuch.js` (~300 行) | 2-3 d |
| **I2** | 东厂阅卷·examiner factionBias 撕裂·东厂 corruption≥40·factionBias × 1.3·东厂≥60·钦点干预 event "司礼监请陛下钦点 X"·玩家可制衡 (削批红权)·放任 (背锅 minxin-5)·keyi `topicType='eunuch_check'`·Slice D1 殿试代主加第 7 类·司礼监 | runtime _kejuExaminerView [扩]·generateDianshiResults [扩] | 2-3 d |
| **I3** | 宦党 (魏忠贤模式) + 反宦联盟·司礼监 corruption>70 + 政治资本>50 → 宦党 spawn·进士入宦党·恶名+5 prestige-5 门生 disgust+20·反宦=东林+复社+太子党·改革浪潮加 D4·宦党 corruption≥60 → "清宦清议"·弊案 sc16 扩 "impeach_eunuch_in_exam" | runtime _kejuAggregateGradsEffect [扩]·新 `_kjEunuchPartyForm` (~150 行) | 2-3 d |

**Phase I 总估**·6-9 d

---

## 5·Stage 2·Phase J·三指针闭环 + 改革 + 弊案 + 自然政治触发 (横贯·7-10 d)

| Slice | 目标 | 涉及文件 | 估时 |
|---|---|---|---|
| **J0** | **自然政治触发**·6 条件 + 邸报头条 spawn (跟 Slice B3 路径 C 联动)·`_kjCheckNaturalTriggers(ctx)` endTurn 钩·6 条件 (F1<25 + 私学占比>40% / partyTension≥15 / corruption≥60 / 东厂≥60 / 改革派 NPC≥2 / 100 年无改革 fallback)·各 cooldown 5/10/15 年·spawn 邸报头条·玩家点击走 A 路径·不绕过 keyi | 新 `web/tm-keju-natural-triggers.js` (~250 行)·tm-endturn-pipeline-steps.js [扩] | 2 d |
| **J1** | P.keju.indicators F1/F2/F3 公式化 + endTurn 钩子·F1=备考池/总士人池×500 + 私学冲击 (Slice H2)·F2=近 9 年新进士/总官员×400·F3=0.6×偏远进士占比 + 0.4×解额公平度 + 0.2×门生网络多样性 (Slice F1)·endTurn `_kjUpdateIndicators(ctx)`·不进 GM.vars 顶栏 | runtime _kejuAggregateGradsEffect [扩]·新 `web/tm-keju-indicators.js` (~200 行)·tm-endturn-pipeline-steps.js [扩] | 1.5-2 d |
| **J2** | event-based 反馈循环·F1/F2/F3 tier 化事件·F1<30 "公论沸腾" / <20 "罢考请愿" 5+ 联名 / <10 "罢考起义" 新派系·F2<20 "老牌派系强化" / <10 "世家清议党崛起"·F3<30 "边镇 NPC 上书" / <15 "边远士子拒考" 南方解额-20%·加 D3/D4 联动 event·F1<25 + 私学占比>40% → "书院非朝廷"·D4 宦党 corruption≥60 → "宦官诬科"·"陛下旨" modal·4 选项 | 新 `web/tm-keju-events.js` (~400 行) | 2-2.5 d |
| **~~J3~~** ARCHIVED·见 Phase L | ~~改革浪潮 v7·5 触发 + 6 主题池 + D3/D4 联动~~·**superseded by Phase L·科举改革系统**·6 主题归入 L10 历史 trigger pack·原 J3 数值 modifier 归入 L7 apply diff | superseded | 0 d (废) |
| **J4** | 弊案 sc16 v7·扩 D4 宦官参与触发·3 选 2·corruption≥50 + tension≥8 + factionBias>0.6 + (v7) 东厂 corruption≥40·memorial 走 sc16 + memorialType='impeach_examiner'·v7 加 'impeach_eunuch_in_exam'·keyi `topicType='scandal'`·investigate/dismiss/protect·罢黜·削籍·赐死 3 后果·v7 加"宦党连坐" | 新 `web/tm-keju-scandal.js` (~300 行)·sc16 schema 扩 | 1-1.5 d |

**Phase J 总估**·7-10 d

---

## 6·Stage 2·Phase K·UI 双显 + 朝代差异化 + 编辑器 (横贯·8-10 d)

| Slice | 目标 | 涉及文件 | 估时 |
|---|---|---|---|
| **K1** | F1/F2/F3 UI 双显·科举弹窗顶部 3 印石 + 民心面板派生 3 行·跟皇威/皇权印石视觉一致·sparkline·不进 GM.vars 顶栏 | tm-keju-runtime.js renderKejuStage (L327) [扩]·tm-authority-ui.js [扩] | 1.5-2 d |
| **K2** | 9 朝代 preset 编辑器面 + 剧本 keju.* schema 扩展 (~40 字段·含 4 新维度字段)·editor 现 7 字段 → 40+·scenario.keju.{indicators/reformTriggers/scandal/tiers/examInterval/partyTensionInit/convening/historicalFigurePolicy} 全可配·v7 加 specialExamCalendar/schoolNetworkInit/eunuchInterferenceInit/discipleGraphSeed·不动 UI 渲染·仅 schema 扩 | editor-game-systems.js kejuSystem panel [扩]·tm-keju-presets.js | 2-2.5 d |
| **K3** | editor 三面补·KejuTier 列表 form + F1-F3 阈值 3×3=9 input + reformThemes 池 + 历史进士预置·v7 加 D1 mentor 预设 / D2 specialExam 历史 trigger / D3 school 初始网络 / D4 eunuch 初始 corruption·不加 personality8D·复用 wuchang | editor-game-systems.js [扩]·editor-crud.js [扩] | 2.5-3 d |
| **K4** | timeline 解锁 + 朝代 preset 一键加载 + 编辑器 UI 详细·era 优先·"宋以后糊名"·绝对年份 fallback (糊名 992 / 誊录 1005 / 三年制 1065 / 八股永乐 / 翻译科 1723)·D3 timeline (朱熹 1190 / 王阳明 1500 / 东林 1604 / 复社 1629 / 清禁讲学 1654)·preset selector dropdown·tiers 数组 UI 直观 | tm-keju-presets.js·新 `web/tm-keju-timeline.js` (~200 行)·新 `web/editor-keju-detailed.js` (~500 行) | 2-2.5 d |

**Phase K 总估**·8-10 d

---

## 7·Stage 2·Phase L·**科举改革系统·全朝代 generic + AI 深用** (取代原 J3·22-32 d)

**核心命题**·把"什么是科举"全 field 化·**任何字段都可被改革**·改革后果由 paradigm change 派生 + LLM 推演·全朝代任何方向·user 完全 driving。**取代原 J3 (6 预设主题改革浪潮)**·把"题型主题切换"升级为"paradigm 范式 diff"·支持非预设方向 + 玩家自定义 + AI 协议。

---

### 7.1·完整 KejuParadigm schema·11 类 30+ 字段

```js
GM._kejuParadigm = {
  // === A·题目层 ===
  subjects: [
    { name:'八股', weight:70, ideology:'traditional', format:'代圣立言', maxScore:100 },
    { name:'策论', weight:20, ideology:'reformist',   format:'论述',     maxScore:100 },
    { name:'算学', weight:10, ideology:'practical',   format:'计算',     maxScore:100 }
  ],

  // === B·tier 层 ===
  tiers: [
    { name:'童试', scope:'县', frequency:1, durationDays:1 },
    { name:'乡试', scope:'省', frequency:3, durationDays:3 },
    { name:'会试', scope:'国', frequency:3, durationDays:9 },
    { name:'殿试', scope:'御', frequency:3, durationDays:1 }
  ],
  examInterval: 3,
  retakePolicy: 'allow_3x',

  // === C·考生层 ===
  candidateRules: {
    excludedClasses: ['僧道', '女子', '商贾子', '倡优'],
    requirePrefecture: true,
    requireRecommendation: false,
    minAge: 15, maxAge: 60,
    allowForeigner: false,
    allowMinority: false
  },

  // === D·主考层 ===
  examinerRules: {
    type: ['scholar'],
    partyQuota: null,
    minYears: 10,
    avoidanceRules: ['avoid_kin', 'avoid_native'],
    blindScoring: true,              // 糊名·宋 992 立
    blindCopying: true,              // 誊录·宋 1005 立
    inspectionLevel: 'high',
    mentorBondStrength: 'strong'
  },

  // === E·录取层 ===
  quota: {
    total: 50,
    geo:    { 南:55, 北:35, 中:10 },
    class:  { 寒门:30, 门阀:70 },
    party:  null,
    prefecture: null,
    minority:   null
  },
  rankingRule: 'by_score',

  // === F·授官层 ===
  allocationRules: {
    firstClass:  { count:3,  position:'翰林', rank:'从六品' },
    secondClass: { count:20, position:'六部主事', rank:'正七品' },
    thirdClass:  { count:27, position:'地方', rank:'从七品' },
    waitingYears: 1
  },

  // === G·身份层 ===
  graduateTitle: '进士',
  cohortBondStrength: 'strong',
  mentorLineage: true,

  // === H·联动层 ===
  schoolIntegration: 'optional',
  taxPrivilege: { jinshi:true, juren:true, xiucai:false },
  shadow: 'low',
  clanPrivilege: false,

  // === I·仪轨层 ===
  ceremony: {
    palaceTest: '御前策问',
    rosterRelease: '黄榜张挂',
    flowerRiding: true,
    nameStele: true,
    bondingBanquet: true,
    kowtowRound: 9
  },

  // === J·惩罚层 ===
  penalties: {
    cheating: 'banish',
    leak:     'death',
    taboo:    'demote',
    bribery:  'kin_punishment'
  },

  // === K·语言层 ===
  language: 'classical_chinese',

  // === L·元 paradigm 层 ===
  ideology: 'traditional',
  history: [
    { year, by, field, oldValue, newValue, reason }
  ],
  _reformChronicle: { /* year → LLM 写的改革志 */ },
  _applyDelay: 0,    // 改革延迟生效年数
  _reformInProgress: null   // 当前进行中改革 {stage, startYear, ...}
}
```

---

### 7.2·8 个改革维度·玩家可改的全谱

| # | 改什么 | 实例 | 阻力 |
|---|---|---|---|
| **1** | 题目**权重** | 经义 60→40·加策论 0→20 | 低 (渐进) |
| **2** | 新加 **subject** | 策论 / 算学 / 格致 / 外语 / 律法 / 农工 / 盐铁 / 武学 / 翻译 / 西学 / **玩家自定 (LLM 合理化)** | 中 |
| **3** | 删 **subject** | 废八股 / 废诗赋 | 高 (古文派激烈反) |
| **4** | **tier 增删** | 加复试·改 frequency·废童试 | 中 |
| **5** | **quota** 调 | 改南北卷·改寒门门阀比·加边远 quota | 中 (既得利益反) |
| **6** | **考生资格扩** | 准商贾 / 准僧道 / 准女子 (虚构) / 准外族 | 高 (守旧派激烈反) |
| **7** | **主考资格变** | 准武官主考 / 准外族主考 / 准宦官参与 | 高 |
| **8** | **paradigm 切换** (ideology) | 传统 → 实学 → 现代 (qualitative shift·多 stage·跨数十年) | 极高 |

**1-7 是 incremental reform** (单步 keyi 议)·**8 是 paradigm shift** (多 stage 累积)。

---

### 7.3·玩家操作流·step-by-step

```
Step 1·打开改革面板·UI 概念
  ┌─ 科举改革·当前 paradigm·明洪武八股·南北卷 ─┐
  │ [一键加载历史改革] ▾   [自定义]              │
  │ [A·题目][B·tier][C·考生][D·主考][E·录取]... │
  │                                              │
  │ ▼ A·题目                                    │
  │   ┌ 八股 ─ 70% ─ [───●───]  [删]            │
  │   ├ 策论 ─ 20% ─ [──●────]  [删]            │
  │   └ 算学 ─ 10% ─ [─●─────]  [删]            │
  │   [+ 加新题目] ▾                             │
  │                                              │
  │ ━━ AI 影响预览 ━━                            │
  │   清流派 -15·改革派 +20·考生不满 ⚠         │
  │   财政 800·阻力 高·实施 5 年                │
  │                                              │
  │ [咨张相国] [缓议]            [上奏 →]      │
  └──────────────────────────────────────────────┘

Step 2·一键加载预设 (L10·10+ preset)·或自定义
Step 3·上奏 → keyi `topicType='keju_reform_propose'` 议政
Step 4·议毕准 → apply diff + spawn 派系反应 + 改革延迟生效
Step 5·LLM 演化推演·1-2y 写"改革志"
Step 6·改革者命运·名垂或遗臭
Step 7·新君上任·rollback 风险 / 跨代承袭
```

---

### 7.4·历史改革预设 (L10·10+ preset)

| Preset | 历史 + 改的字段 | 朝代 gate |
|---|---|---|
| **王安石·三经新义** | subjects 改 (废诗赋·增经义)·mentorBond strong | 宋及之后 |
| **朱熹·理学正统** | subjects 改 (经义换四书)·ideology 'reformist' | 宋及之后 |
| **张居正·考成法** | inspectionLevel→high·penalties.cheating→banish | 明及之后 |
| **戊戌·废八股改策论** | subjects 大改 (删八股加策论 + 时事)·ideology→reformist | 清·1898 后 |
| **京师大学堂·西学渐入** | subjects 加 (算学 + 格致 + 万国史)·tiers 加 '复试' | 清·1903 后 |
| **1905 废科举** | 整 paradigm 切学堂制·ideology→modern·graduateTitle→学士 | 清·1905 后 |
| **明 1397 南北卷** | quota.geo 改 (南55北45) | 明及之后 |
| **(虚构) 武则天·女科** | candidateRules.excludedClasses 去 '女子' | 任何 `_timeAnomaly` |
| **(虚构) 元式·色目优先** | quota.minority 加色目·allowMinority=true | 元后或 `_timeAnomaly` |
| **(虚构) 汉察举为科举·提早 200 年** | system='chaju'→'kj'·tiers 重建 | 汉 `_timeAnomaly` |

**preset 是模板·非 lock**·玩家可在 preset 基础上再 diff·完全自由。

---

### 7.5·AI 引擎·**8 个深度利用点** (Phase L 灵魂)

| # | AI 用 | 替代什么 |
|---|---|---|
| **AI·1** | **LLM 推演改革后果**·{paradigm diff + game state} → LLM → 13 派系反应 + 5 类考生反应 + 3-10y 演化 + 经济 (~3-5k token) | hardcode 矩阵 (现 J3 是 hardcode) |
| **AI·2** | **LLM 生成 NPC 反对奏疏**·按 trait + 派系·200-400 字古文·援引历史先例 (~3-5k for 3 NPC) | 浅 stance + reason |
| **AI·3** | **LLM 协议玩家定义新 subject**·"陛下想增什么科·朕请讲"·按 game state 推荐 + 自定义合理化 | 预设 list |
| **AI·4** | **LLM 演化推演**·改革后 1-2y 自动推演 + 写"改革志" (年度文 ~150 字古文·存 `_reformChronicle`) | 无演化 |
| **AI·5** | **LLM 教官咨询**·改革前咨询 NPC·"咨张相国"·LLM 模拟 NPC 给建议 (~200 字) | 玩家瞎拍 |
| **AI·6** | **LLM 改革命名 + 史评**·改革 commit 后命名 (5-12 字·风格匹配王安石/张居正/戊戌)·入科举志 | 无命名 |
| **AI·7** | **LLM 改革黑天鹅**·实施过程意外事件 (主考贿赂 / 考生罢考 / 改革者病 / 外族用兵挪资金) | 平滑无意外 |
| **AI·8** | **LLM 跨朝代承袭推演**·朝代更替时·新朝是否承袭前朝改革·折中 / 反对 / 承袭 + 旨意 200 字 | 改革跟朝代断 |

---

### 7.6·可玩性·5 个新增机制

| # | 机制 | 内容 |
|---|---|---|
| **玩·1** | **改革分阶段·有实施过程** | 宣布 → 1y 准备 → 2y 试点 → 3y 推广 → 5y 稳定·每阶段玩家决策点 |
| **玩·2** | **朝中支持率·4 操作真互动** | 拉拢中立 / 打压守旧 / 缓议 / 强推·各有 cost / 风险 |
| **玩·3** | **改革者命运·名垂或遗臭** | 改革成 prestige +50·入"千古名相"·LLM 写传·失败遗臭 |
| **玩·4** | **改革反复·新君 rollback 风险** | 新君上任·守旧派可推翻 (历史·熙宁元祐党争)·改革可被部分 rollback |
| **玩·5** | **跨剧本连续** | 改革遗产可加载下一剧本·LLM 推演承袭·跨剧本累积成就感 |

---

### 7.7·可实现性·UI 减负 + LLM budget

| 项 | 内容 |
|---|---|
| **UI 折叠** | 默认显示 4 常用 tab (题目 / 考生 / 录取 / 授官)·其余折叠·AI 摘要顶 |
| **preset 一键** | 首开改革面板·LLM 推荐 3 个 preset·新手 30 秒完成 |
| **LLM 调用 budget** | 每改革 ~12-25k token (推演 5k + 奏疏 5k + 命名 0.5k + 黑天鹅 5-10k)·flag gate 关时 0 成本 |
| **save/load 兼容** | `_kejuParadigm.version` 字段·旧存档自动 migrate 从 9 朝代 preset |

---

### 7.8·自由度·让玩家完全 driving

| 字段 | 自由度 |
|---|---|
| subjects | 30+ 预设 + 自定义 (LLM 合理化) |
| weight | 任意 0-100·总和 100 |
| ideology tag | traditional/reformist/practical/modern·玩家可标 |
| tiers | 加 / 删 / 改 frequency / duration |
| examInterval | 1-10 年 |
| excludedClasses | 加 / 删任意 class |
| examinerRules.type | 文/武/外/宦·组合 |
| partyQuota | 自定 quota·或不设 |
| quota all 5 layers | 任意 |
| rankingRule | by_score/by_origin/by_party |
| allocationRules | 一甲/二甲/三甲 各几人 + 去哪 + 官品 |
| ideology shift | 任何方向 (含 reimagined 虚构) |
| graduateTitle | 任意名 |
| ceremony | 任意 toggle / 自定 (LLM 助生成新仪式) |
| penalties | 任意力度 |
| language | 任意 (含 reimagined) |

**虚构剧本支持** (`_timeAnomaly`)·唐玩成"科举废止·考实学" / 明玩成"准女子考·恢复武则天则天科" / 清玩成"满汉合一·真平等"·任何朝代任何方向·LLM 合理化 + 推演。

---

### 7.9·Phase L slice·**22-32 d** (拆 L-A + L-B 两 Release)

#### L-A·基础 (10-15 d·先 ship·Release 1.2.6.x)

| Slice | 内容 | 估时 |
|---|---|---|
| **L1** | KejuParadigm 11 类 namespace + 升级 KejuTier + migration | 2-3 d |
| **L2** | 改革面板 UI + diff + AI 影响预览 (4 常用 tab + 其余折叠) | 3-4 d |
| **L3** | 改革幅度 (渐进激进) + 试点 + 通过门槛 + 4 操作 | 2-3 d |
| **L4** | LLM 影响推演 (AI·1) | 2-3 d |
| **L5** | LLM 反对奏疏 + 教官咨询 (AI·2·5) | 2-3 d |
| **L6** | LLM 协议玩家定义新 subject (AI·3) | 1-2 d |
| **L7** | reform keyi 议政 + apply diff + 改革延迟生效 | 2-3 d |

**L-A 总估·10-15 d**

#### L-B·AI 深用 + 长尾 (12-17 d·后 ship·Release 1.2.7.x)

| Slice | 内容 | 估时 |
|---|---|---|
| **L8** | LLM 演化推演 + 改革志 + 跨代承袭 (AI·4·8) | 2-3 d |
| **L9** | LLM 命名 + 改革者命运 + 改革黑天鹅 (AI·6·7) | 2-3 d |
| **L10** | 历史 trigger pack·10+ preset | 2-3 d |
| **L11** | 改革反复 (rollback) + 跨剧本连续 | 1-2 d |
| **L12** | 改革后果 UI + 科举志 + 改革 timeline + 改革者传记 | 1-2 d |

**L-B 总估·12-17 d**

#### L-C·新扩 6 维度 (10-15 d·最后 ship·Release 1.2.8.x)

| Slice | 内容 | 估时 |
|---|---|---|
| **L13** | 玩家手撰诏书 / LLM 共笔·3 模式 (全 AI / 玩家+AI / 玩家自写)·诏书入 chronicle + 措辞影响民间反应 | 1-2 d |
| **L14** | 民间响应·LLM event spawn 10 类·士林集会 / 罢考请愿 / 私塾改章 / 商贾应试 / 女子集会 (虚) / 西教士入 / 民乱小起 / 歌谣传唱 / 乡贤上书 / 海外评议 | 2-3 d |
| **L15** | 主考 LLM 自我演化·主考 NPC 看见新 paradigm·按 trait 适应 (接受 / 辞 / 阳奉阴违)·改自己出题风格 + mentorBondStrength | 1.5-2 d |
| **L16** | 门生网络代际重组·改革后进士构成变·cohort 分裂 (G1 八股代 / G2 策论代 / G3 西学代 / G4 实学代)·代际派系斗·跟 F4c 言官清议联动 | 2-3 d |
| **L17** | 改革谘议会·玩家召集 3-7 NPC·LLM 模拟 3 轮辩论·总结推荐 3 改革方案·复用廷议 v3 paradigm·跟 Stage 1 廷议 8 阶段 + 25 RULES 一致 | 2-3 d |
| **L18** | 科举志 timeline visualization·改革 timeline 可视化·每改革可点查 NPC / 派系 / 演化 / 改革志 / 改革者传记·跨剧本跨朝代 | 1-2 d |

**L-C 总估·10-15 d**

#### L-D·深扩第二波 (15-20 d·Release 1.2.8.x → 1.2.9.x)

| Slice | 内容 | 估时 |
|---|---|---|
| **L19** | 改革派系动态系谱·`GM._kejuReformLineage`·跨改革派系斗 (新党/旧党/复古派·历史·熙宁党 → 元祐党 → 元祐党人碑)·跟 GM.parties 双绑·LLM 推党魁选举 | 2-3 d |
| **L20** | 国子监 / 学官改革·`schoolSystem` schema (国子监 / 太学 / 府学 / 县学 / 三舍法 / 私塾 / 义学)·王安石三舍法·学官资格联动·跟 H 私学比例 | 3-4 d |
| **L21** | 捐纳 / 卖官·`juanna` schema (清专有·咸丰大量捐纳吏治崩坏)·开/限/废 3 路径·LLM 推 5 年吏治影响 | 2-3 d |
| **L22** | 回避制度细化·`avoidanceRules` 6 类 (避亲 / 避籍 / 避门生 / 避近期同年 / 避同党 / 避年龄)·改革加细减·小成本细节戏剧 | 1.5-2 d |
| **L23** | 南北榜 / 边远卷·`quota.geo` 细化·历史 preset (明 1397 南北 / 雍正 中卷 / 咸丰 西北卷)·玩家自定 ratio | 1-2 d |
| **L24** | 改革阻力·三层 LLM 推演 (考官 + 翰林院 + 书院)·跟 H 私学联动·真"穿透"·spawn 翰林联名 / 书院抗议 | 2-3 d |
| **L25** | sandbox 模式·跳过 cost / 阻力·纯 LLM 模拟"假设改革 5 年后"·~10k token·新手友好 | 2 d |
| **L26** | 多项打包改革·一次议政含多 paradigm diff·历史·王安石"一揽子变法"·阻力 max·非 sum | 1-2 d |

**L-D 总估·15-20 d**

#### L-E·深扩第三波 (13-19 d·Release 1.2.9.x → 1.3.0.x)

| Slice | 内容 | 估时 |
|---|---|---|
| **L27** | 密议改革 / 暗中推行·召集心腹 LLM 模拟密谈·跳过 keyi·风险·5y 内被发觉则丑闻 spawn·历史·张相考成法部分暗推 | 2-3 d |
| **L28** | 反向 paradigm / 复古运动·朱元璋复唐宋·张居正复王安石·清末复明制·rollback tag·复古派 spawn | 1.5-2 d |
| **L29** | 政治暗杀 / 改革者刺杀·trigger·改革 magnitude>60 + 守旧派 loyalty<20·LLM 推阴谋 (主谋 + 手段 + 时机 + 应对)·历史·王安石未遂·张居正死后翻案 | 2-3 d |
| **L30** | 廷议 + keyi 双轨议政·按改革 magnitude 自动 / 玩家选·廷议走 Stage 1 廷议 v3·8 阶段·25 RULES·hybrid stance·confront 链 | 1.5-2 d |
| **L31** | 民意调查 / 询民 LLM·7 类民众 (寒门 / 商贾 / 农 / 工 / 边远 / 退休 / 太学生)·~3-5k token / 询·结果可入议政 | 1.5-2 d |
| **L32** | 百年大计·自动 spawn·100y 无改革且 F1/F2/F3 全跌·LLM 自动推 spawn 改革议题·跟 J0 联动 | 1-2 d |
| **L33** | 跨系统联动·改革影响 minxin / 国运 (新 GM.var) / 外交 (朝鲜燕行录) / 财政 / 军事·LLM 算 5 系统派生 | 2-3 d |
| **L34** | 后世评价·百年后 LLM 翻案·100/200/300 年节点·史评 100-300 字·历史地位标 (千古名相 / 罪人 / 毁誉参半) | 1.5-2 d |

**L-E 总估·13-19 d**

#### L-F·深扩第四波 (12-18 d·Release 1.3.0.x → 1.3.1.x)

| Slice | 内容 | 估时 |
|---|---|---|
| **L35** | 跨剧本传承·改革遗产可加载下一剧本·`_kjReformInheritance` namespace·LLM 推承袭 / 反对 / 折中·跨剧本累积成就 | 1.5-2 d |
| **L36** | 学派志 LLM·跨代师承谱 (经学派 / 实学派 / 西学派 / 复古派)·LLM 写学派志 ~300 字 / 学派·跟 mentor lineage 联动 | 2-3 d |
| **L37** | 跨国改革对比·朝贡国 NPC (朝鲜 / 日本 / 越南) 上奏·"X 国 Y 改革·我朝当借鉴"·跟 G4 翻译科联动 | 1.5-2 d |
| **L38** | 配套政策建议·LLM 协议·改 A 必配 B (e.g. 加算学 → 必配算学教材)·改革面板加"配套提示"·跟 L-G 教材联动 | 1.5-2 d |
| **L39** | 改革成败评分·5 star (政治成功 / 经济效益 / 民众接受 / 历史影响 / 派系平衡)·历史成就 trophy·跟跨剧本联动 | 1-2 d |
| **L40** | 内臣外戚干预·后宫 / 外戚 / 内臣 LLM 推改革·宫斗 (太后反 / 后妃议 / 外戚求封)·跟 Phase I 宦官联动 | 2-3 d |
| **L41** | 改革封赏·LLM 推奖励 (主导 NPC 加官 + 进爵 + 题字 + 御书)·prestige + 5-50 / 派系 loyalty +20 | 1-2 d |
| **L42** | 派系换血·NPC 死亡 + 新生·改革 30 年后·原派系 NPC 死亡·LLM 推新党魁·跨代党争 | 1.5-2 d |

**L-F 总估·12-18 d**

#### L-G·教材 / 培训 / 师资 (6-10 d·Release 1.3.1.x)

| Slice | 内容 | 估时 |
|---|---|---|
| **L43** | 教材编纂·新 subject 需教材·LLM 推编纂过程 (任主考为编纂使 + 半年完成 + 颁行)·教材入 GM._kejuParadigm.textbooks·影响出题方向 | 2-3 d |
| **L44** | 考生培训·新 subject 加后·考生 5y 内培训·LLM 推培训机构 / 师资 / 培训费·寒门补助 (跟 L-F 配套政策) | 1.5-2 d |
| **L45** | 学馆开办·新派学馆 (西学馆 / 算学馆 / 武学馆 / 翻译馆)·官办 + 私办·跟 H 私学联动·新派人才入学馆 | 2-3 d |
| **L46** | 朝廷资助·改革配套财政·scholarship (寒门补助 / 偏远补助 / 新派补助)·LLM 推预算·跟 P.economic 联动 | 1.5-2 d |

**L-G 总估·6-10 d**

#### L-H·朝代过渡·`_timeAnomaly` 支持 (6-9 d·Release 1.3.2.x)

| Slice | 内容 | 估时 |
|---|---|---|
| **L47** | 朝代过渡·paradigm 跨代承袭细化·朝代更替时·新朝皇帝看前朝 paradigm·LLM 推三态 (承袭 / 反对 / 折中) + 旨意 200 字 | 1.5-2 d |
| **L48** | 新朝 LLM 审改革·新朝审前朝改革史·按新朝 ideology + 民族 + 派系·LLM 推 5y 内"改前朝制" 路径 | 1.5-2 d |
| **L49** | `_timeAnomaly` 联动·虚构剧本支持·任何朝代可现代化·汉可有"察举 → 科举"·唐可有"科举 → 实学"·LLM 合理化 | 2-3 d |
| **L50** | 跨剧本 paradigm 累积·"宇宙改革历史"·跨剧本改革遗产 + 跨剧本派系谱·跨剧本学派志·累积成就跟跨剧本联动 | 1-2 d |

**L-H 总估·6-9 d**

**Phase L 总估·**·L-A 10-15 + L-B 12-17 + L-C 10-15 + L-D 15-20 + L-E 13-19 + L-F 12-18 + L-G 6-10 + L-H 6-9 = **84-123 d** (50 slice)

---

### 7.10·L-C 6 扩详细机制

#### L13·玩家手撰诏书·3 模式

```
改革通过后·玩家选·
  [全 AI 代拟]·LLM 按改革内容 + 朝代风格生成诏书 ~500 字
  [玩家手撰首段 + AI 续写]·玩家写 50-100 字开头·LLM 续 400-450 字
  [玩家全自写]·玩家自由写·LLM 不参与
诏书入 GM._chronicle + 民间反应跟诏书措辞挂钩·
  e.g.·诏书措辞激进 → 清流反应 +20·诏书措辞折中 → 清流反应 +5
```

#### L14·民间响应 10 类·LLM event spawn

| event 类 | 触发 + 内容 |
|---|---|
| **士林集会** | F1<40·LLM 生成"江南书生集会议新章·名士 X 等论"·入风闻 |
| **罢考请愿** | F1<25·考生 5+ 联名罢考·跟 F2 反馈 |
| **私塾改章** | H 私学≥5 时·私塾率先教新科·跟 H 联动 |
| **商贾应试** | candidateRules 准商贾后·商贾子蜂拥·人数 +50·新派系候选 spawn |
| **女子集会** (虚) | reimagined·candidateRules 准女子·spawn"江南女子集会请准考" |
| **西教士入** (清末) | L 推进到现代 stage·spawn"传教士请教数学"·跟外族 NPC 联动 |
| **民乱小起** | F1<20 + paradigm 激进改·spawn 守旧派煽动小民乱 |
| **歌谣传唱** | 任何改革后·LLM 生成"新章歌谣"·讽刺 / 颂扬·入风闻 |
| **乡贤上书** | 退休 NPC prestige≥70·上书·跟改革立场一致或反 |
| **海外评议** | 朝鲜 / 日本 / 越南·LLM 写"X 国燕行录笔记"·评本朝改革 |

#### L15·主考 LLM 自我演化

```
prompt·
"NPC·张相国·trait scholar/honest·任主考 5 年
原 paradigm·八股 70 / 经义 30
新 paradigm·八股 30 / 策论 40 / 算学 30
请张相国推演·
  1. 是否接受新章 (按 trait·honest 多接受·conservative 多拒)
  2. 若接受·改自己出题风格·LLM 写主考新风格 hint
  3. 若不接受·辞主考 / 阳奉阴违 / 公开反对·spawn 反应事件
  4. 改自己 mentorBondStrength (若接受新章·门生关系也变)
返回 JSON + 推演 narrative ~200 字"
```

主考自适应·让改革真"穿透"到考官行为。

#### L16·门生网络代际重组

```
原·张相国是八股进士·门生网络 50 人 (全八股)
新·张相国接受新章·开始收策论生
  → mentorBondStrength 'strong' → 'weak' (因新生跟旧生有代沟)
  → cohort 内分裂·八股门生 vs 策论门生
  → 内部清议·LLM 生成"老门生劝师·勿引狼入室"
  → 新派系 spawn·跟 F4c (言官清议) 联动

代际派系·
  门生分代·G1 (八股代) / G2 (策论代) / G3 (西学代) / G4 (实学代)
  代际派系斗·历史·北宋元祐党 (旧学) vs 熙宁党 (新学)
  跟 paradigm.history 联动·谁主导改革哪代门生归他

→ 让门生网络 (Stage 1·F1) 有 paradigm 时间深度·不止是党争
```

#### L17·改革谘议会·复用廷议 v3 paradigm

```
玩家选·
  [召集] → 选 NPC (3-7 人·trait 多样·正反派混合)
  → LLM 模拟 3 轮辩论·每轮 NPC 各 100-200 字
  → 第 1 轮·各自表态 (支持 / 反对 / 折中)
  → 第 2 轮·相互反驳 (引经据典)
  → 第 3 轮·折中方案 / 妥协 / 决裂
  → 谘议结果·LLM 总结 + 推荐 3 改革方案
  → 玩家选方案·继续走 keyi 议政

→ 改革前有"集思广益"环节·非玩家瞎拍
→ 跟廷议 paradigm 联动·跟 Stage 1 廷议 v3 一致 (8 阶段 / 25 RULES / hybrid stance 等)
```

#### L18·科举志 timeline visualization

```
科举志·改革 timeline (visualization)·
  -1500│ (剧本起·明洪武)
  -1397│ 南北卷·朱元璋·御笔主导·prestige +0
  -1582│ 张相考成法·张居正·政绩主导·prestige +50
  -1620│ 八股微调·王某·失败·prestige -30
  -1640│ 玩家·废八股·张相辅·成功·prestige +80 (千古名相候选)
  -1660│ 新君·清·承袭·LLM 推演·策论 → 满汉双策论
  -1700│ ...

每改革可点·查 NPC 主导 / 派系反应 / LLM 演化 / 改革志全文 / 改革者传记
→ user 看历史感·跨剧本·跨朝代·感受"历史是我改的"
```

---

### 7.11·L-D 8 扩详细机制

#### L19·改革派系动态系谱

```js
GM._kejuReformLineage = [
  { id:'r1', year:1582, leader:'张居正', faction:'考成派', supporters:[...], opponents:[...],
    next:'r2', prev:null, status:'success' },
  { id:'r2', year:1620, leader:'王某',   faction:'守旧派', supporters:[...], opponents:[...],
    next:'r3', prev:'r1', status:'rollback', rollbackOf:'r1' },
  { id:'r3', year:1640, leader:'玩家',   faction:'实学派', supporters:[...], opponents:[...],
    next:null, prev:'r2', status:'success', against:['r2'] }
]
```

**派系谱效应**·
- 同派系 NPC·新改革支持率 +30·反派系 -30
- 跨代党争·LLM 推 X 党魁去世后新党魁选举
- 跟 GM.parties 双绑·改革派系 ⇄ 政治派系
- 玩家改革面板可查"本朝五十年·改革三起·一兴一废一再兴"

#### L20·国子监 / 学官改革

```js
GM._kejuParadigm.schoolSystem = {
  guozijian: { capacity:300,   type:'official', funding:'imperial', curriculum:['经义'] },
  taixue:    { capacity:200,   type:'official', funding:'imperial', curriculum:['经义','律法'] },
  fuxue:     { count:200,  totalCapacity:6000,  type:'official', funding:'local' },
  xianxue:   { count:1500, totalCapacity:30000, type:'official', funding:'local' },
  threeHallSystem: false,  // 王安石三舍法 (外舍 / 内舍 / 上舍·上舍可直接除官)
  shesxiao: 'none',         // 私塾·跟 H 私学联动
  yixiao:   'none'          // 义学 (扶贫学校·宋后)
}
```

**改革路径**·增国子监 capacity·寒门入学 + F1 +5 / 加三舍法·上舍生直接除官·激进 / 学官资格改 (教谕 / 训导)·跟 D 主考资格联动 / 跟 H 私学比例

#### L21·捐纳 / 卖官 (清专有)

```js
GM._kejuParadigm.juanna = {
  enabled: false,
  priceTable: { 监生:1000, 举人:5000, 进士:50000, 知县:8000, 知府:30000 },
  totalRevenue: 0,
  juannaCount: { 监生:0, 举人:0, 进士:0, 知县:0, 知府:0 },
  scenarios: ['none'/'limited'/'normal'/'extended']
}
```

**改革路径**·开捐 (朝廷增收 + corruption +20 + 清流大反 ~咸丰) / 限捐 (只准监生·朝廷少收·清流不反) / 废捐 (士林大喜·财政压力)
**LLM 推演**·捐纳生入官 5 年后吏治影响

#### L22·回避制度细化 (6 类)

```js
examinerRules.avoidanceRules = {
  avoid_kin:        true,   // 避亲 (五服内)
  avoid_native:     true,   // 避籍 (主考不出本省)
  avoid_disciple:   false,  // 避门生 (改革加)
  avoid_recent:     false,  // 避近期同年
  avoid_party:      false,  // 避同党·激进改革
  avoid_age:        false   // 避年龄相近
}
```

**改革效**·加避制 → party tension -10·行政成本 +20·主考人选缩 / 松避 → 清流反 (传统不可破)

#### L23·南北榜 / 边远卷·`quota.geo` 细化

```js
quota.geo_preset = {
  none:           { 全国一榜: 100 },
  ming_1397:      { 南:60, 北:40 },
  qing_yongzheng: { 南:55, 北:35, 中:10 },
  qing_xianfeng:  { 南:50, 北:30, 中:15, 西北:5 },
  reimagined:     { 自定: '玩家任意' }
}
```

**改革路径**·加西北卷 → 西北 NPC loyalty +30·南方 -10 / 加边远 (云贵川藏) → 边镇民心 +30 / 取消分卷 → 南方进士 80%·北方大反

#### L24·改革阻力·三层 LLM 推演

```
prompt·改革·废八股加策论 30%·算学 10%
请三层反应分别推演·

考官层 (10 NPC 主考)·各 NPC 按 trait·反应 / 拒任 / 阳奉阴违·LLM 推 3-5 NPC 具体反应 200 字
翰林院层 (20 NPC 翰林)·collective·LLM 推院内辩论·spawn 翰林联名上书 / 罢学
书院层 (5 大书院)·改课程 / 抗议 / 解散·跟 H 私学联动

返回 JSON·{examinerReactions, hanlinCollective, schoolReactions}
```

真"穿透"·让改革阻力是多层结构。

#### L25·sandbox 模式

```
改革面板加 [sandbox 模式]
  → 跳出当前 game state·LLM 模拟"假设改革 5 年后"·
    - 派系分布·进士构成·民间反应·经济
  → 玩家看 sandbox 结果·决定是否真改
  → 不消耗 game state·纯 LLM 推演 (~10k token)
```

**适用**·新手不敢动 / 激进改革前试 / 比较多方案

#### L26·多项打包改革

```
改革面板 [多项打包]
  玩家选·+ 题目权重改·+ 加 subject·+ 改 mentorBondStrength·+ 改 quota
  → 4 项打包·一次议政
  → 阻力·按各项 max·非 sum
  → 通过·全 apply·失败·全 rollback

对比·一项一项议·阻力低但慢·一揽子议·阻力高但快
历史·王安石变法是"一揽子"·张居正考成法是分批
```

---

### 7.12·L-E 8 扩详细机制

#### L27·密议改革 / 暗中推行

```
玩家选·
  [公议] → keyi 议政路径 (默认·阻力低·透明)
  [密议] → 召集 3-5 心腹·LLM 模拟密谈·暗中下旨
    - 阻力·朝中不议·只对 1-2 主考下旨
    - 风险·5y 内被发觉·"X 相奉旨阴改章程"丑闻 spawn
    - 收益·快速 + 跳过反对·激进改革有效
    - cost·prestige -10 (政治诚信代价) + 派系恨意 +20 (若发觉)
```

历史·张居正考成法部分暗推·政事归一办。

#### L28·反向 paradigm / 复古运动

```
复古候选 preset·
  - 朱元璋·复唐宋八股 (汉唐复礼)
  - 张居正·复王安石经义 (中复古)
  - 嘉靖·废宋糊名 (回归唐制)
  - 清末·复明制 (反西学·守旧派理想)

mechanic·
  - paradigm.history 加 'rollback' tag
  - 复古派 NPC spawn·跟改革派对抗
  - LLM 推 "复古浪潮" timeline (与改革浪潮平行)
  - ideology 转回 traditional / 自定 ('复古实学' / '伪改革派')
```

#### L29·政治暗杀

```
trigger·改革 magnitude>60 + 守旧派 loyalty<20 + 派系仇恨高
LLM 推阴谋·
  - 主谋·哪个 NPC (按 loyalty + trait·brave-honest 不会·devious-ambitious 会)
  - 手段·投毒 / 刺杀 / 政治诬告·LLM 写阴谋 200-400 字
  - 时机·改革实施 X 年第 Y 月
  - 应对·玩家可探听 (LLM 暗示 NPC 异动·玩家可 keyi 启 secret 调查)

后果·
  - 改革者死 → prestige +50·成"千古名相"·LLM 写"祭文"
  - 改革派魁失·改革停滞 / rollback
  - 阴谋败露 → 守旧派大反·跟 F4c 言官清议联动
```

历史·王安石被刺未遂·张居正死后被翻案。

#### L30·廷议 + keyi 双轨议政

```
[keyi 常朝路径]·1 turn·5-10 NPC·阻力中·适小改革
[廷议路径]·3-5 turn·30+ NPC + 召集·阻力按 trait + 派系展开·适大改革
  复用·廷议 v3 8 阶段·25 RULES·hybrid stance·confront 链
  cost·廷议费 + 5y prestige -5 (浪费朝廷时间)

玩家选·按 reform magnitude·小走 keyi·大走廷议
```

#### L31·民意调查 / 询民 LLM

```
玩家选·[询民]
  → LLM 模拟 5-7 类民众·
    寒门读书人 / 商贾 / 农民 / 工匠 / 边远士子 / 退休官员 / 太学生
  → 各 100-200 字 (口语化·跟朝中文言不同)
  → 调查结果·支持率分布·愿不愿出钱供养子读新章

cost·~3-5k token / 询民
效果·让玩家接地气·非朝廷孤岛
后续·询民结果可用作议政 reference
```

#### L32·百年大计·自动 spawn

```
trigger·年 - paradigm.history[最后改革年] ≥ 100·且 F1/F2/F3 全跌
LLM 推演·
  - "祖宗成法已 X 年·今日科举·已不复昔日"
  - "X 朝臣议·当行某改革·望陛下察"
  - 自动 spawn 改革议题 keyi·内容按当下 game state
  - 跟 J0 自然政治触发联动
```

让 paradigm 不能永远不动·历史·明清后期百年八股·F1 大跌。

#### L33·跨系统联动

```
改革后·LLM 算跨系统影响·
  minxin·寒门进士比例 +20% → minxin +15·门阀 +20% → minxin -10
  国运 (新 GM.var)·改革成功 5y +20·失败 -30
  外交·朝鲜燕行录中本朝改革被赞 / 嗤·跟 G4 翻译科联动·影响 ethnic_religion
  财政·新 subject 培训 / 教材 / 师资·GM.vars.国库 -X
  军事·武举改革跟 G3 联动·valor 兵 +Y
```

paradigm 是中枢·影响发散到 minxin/外交/财政/军事/国运 5 系统。

#### L34·后世评价·百年后 LLM 翻案

```
trigger·改革者死后 100/200/300 年节点 (LLM check)
LLM 推演·
  - X 朝史评·张相新章·LLM 写 100-300 字史评 (跟史记/通鉴风格)
  - 历史地位·"千古名相" / "千古罪人" / "毁誉参半"
  - 后世改革借鉴·"X 朝再变·议引张相故事"
  - 跟 paradigm.history 联动·X 改革被后世推为"X 学派"源头
```

历史·王安石本朝被骂·清末维新派翻案·"千古一人"。

---

### 7.13·L-F 8 扩详细机制

#### L35·跨剧本传承

```js
GM._kjReformInheritance = {
  prevScenario: '天启七年·崇祯死局',
  prevDynasty: '明',
  prevParadigm: {...},      // 上剧本最终 paradigm
  prevReformLineage: [...], // 改革派系谱
  prevPrestigeLevels: {...}, // 各改革者历史地位
  inheritanceChoice: 'partial'  // 'full' / 'partial' / 'reject'
}
```

新剧本载入·若同朝代 + 后期·LLM 推承袭·"前朝 X 改革·本朝当承否"·三态。

#### L36·学派志 LLM

```
prompt·
"师承谱·张相国 (1582) → 门生 A (1592) → 再门生 B (1605) → ... ['策论派'·5 代]
请生成'策论派学派志'·300-500 字·跟史记/明史风格
含·起源·宗师·主张·门生事迹·政治成就·后世评价
返回·学派志全文 + 学派属性 (ideology / 主流 subject / 影响时代)"

入·GM._kejuSchoolsOfThought (学派志总集)·跟 mentor lineage 联动·跨代师承
```

#### L37·跨国改革对比·朝贡国 NPC

```
trigger·朝贡国使节来朝事件·或翻译科触发后
LLM 推朝贡国 NPC 上奏·
  "朝鲜·李退溪议·X 朝改革有 X 利 X 弊·我朝当借鉴"
  "日本·德川中期·X 学派盛·借鉴"
  "越南·阮朝·李朝 X 改革成功·堪师"
玩家可议·借鉴 / 不借鉴·跟 G4 翻译科联动·跟 ethnic_religion 联动
```

#### L38·配套政策建议·LLM 协议

```
改革面板加 "配套提示" (LLM 实时算)
玩家加 subject 'algorithm' → LLM 提示·
  "陛下加算学·宜配套·
    1. 编算学教材 (李善兰·算学启蒙)
    2. 设算学馆 (跟 L-G 学馆联动)
    3. 算学补助寒门 (跟 L-G 朝廷资助)
    4. 招外籍算学家 (跟 L-H _timeAnomaly)
  若不配套·5y 内培训不足·考生罢考概率 +30%"
```

#### L39·改革成败评分·5 star

```
改革 5y 后·LLM 评·
  政治成功 ★★★★☆  (派系平衡 + 制度延续)
  经济效益 ★★★☆☆  (税收 + 财政开销)
  民众接受 ★★★★☆  (minxin + 罢考率)
  历史影响 ★★★★★  (跨代承袭)
  派系平衡 ★★☆☆☆  (派系动荡)

总分·17/25·"中上"
跟历史成就 trophy 联动·"千古一相·5 星全满才解锁"
跨剧本累积成就 (跟 L-H L50)
```

#### L40·内臣外戚干预·后宫宫斗

```
trigger·改革涉及·内臣 (司礼监) / 外戚 / 太后 / 后妃 利益
LLM 推宫斗·
  太后·"祖宗成法不可乱动·哀家不允" (跟 GM.太后 NPC 联动)
  后妃·"X 妃娘家请封·改革后娘家不再为官·后妃求情"
  外戚·"X 国舅议·改革断我子弟出路"
  内臣·"司礼监 X 阴谋·改革损批红权·内监合谋反"

应对·玩家可妥协 / 强推 / 调和
跟 Phase I 宦官联动·跟 emperor_authority 联动
```

#### L41·改革封赏

```
改革通过后·玩家可封赏推动 NPC·
LLM 推奖励 (按 NPC trait + 改革贡献度)·
  - 加官·吏部尚书 → 大学士
  - 进爵·男 → 伯·公
  - 御书·"X 相之名·朕亲题"
  - 加禄·岁俸 +X
  - 题名·入"功臣阁"

cost·朝廷支出·prestige -2 (封赏过度伤公平)
效果·派系 loyalty +20·跨代家族荫子 (跟 L20 学官联动)
```

#### L42·派系换血·NPC 死亡 + 新生

```
trigger·改革 30 年后·LLM 推
原派系 NPC 死亡 (按年龄)·新党魁 LLM 推
  - 老党魁张相国 (75岁) 卒
  - 派系内 NPC 竞·LLM 推选举 (按 trait + prestige + 派系内支持)
  - 新党魁王某 (50岁) 接·跟老党魁不同 trait·派系 ideology 微调

跨代派系斗·"X 派 (老党魁主) vs Y 派 (新党魁主)"
跟 GM.parties 联动·派系内换血
跟 L19 派系谱联动·派系谱多代延续
```

---

### 7.14·L-G 教材 / 培训 / 师资·4 slice

#### L43·教材编纂

```js
GM._kejuParadigm.textbooks = {
  '八股':   { compiler:'王守仁', year:1500, status:'official' },
  '策论':   { compiler:'张居正', year:1582, status:'official' },
  '算学':   { compiler:'李善兰', year:1640, status:'in_progress', progress:0.4 }
}

LLM 推编纂过程·
  - 主考可任编纂使·半年完成 (按主考 wisdom)
  - 颁行天下·寒门 / 偏远跟不上 → F3 暂跌 5y·然后回升
  - 教材影响出题方向·主考 LLM 出题时引教材
```

#### L44·考生培训

```
新 subject 加后·考生 5y 内培训
LLM 推培训机构·
  - 官办·国子监 + 太学·朝廷资助
  - 私办·私塾 + 书院·自费 (跟 H 私学联动)
  - 师资·LLM 推 5-10 培训师 (按 _scholarPoints + subject 专长)
  - 寒门补助 (跟 L-F L38 配套政策·跟 L46 朝廷资助)
培训不足·罢考率 +30%
```

#### L45·学馆开办

```
新派学馆 (西学馆 / 算学馆 / 武学馆 / 翻译馆)·
  GM._kejuParadigm.academies = [
    { name:'西学馆', type:'private', founder:'X', year:1640, students:50, faction:'实学派' },
    { name:'算学馆', type:'official', founder:'李善兰', year:1645, students:100 },
    ...
  ]
官办 / 私办·跟 H 私学联动·新派人才入学馆
学馆党派化·"西学馆党"·跟 GM.parties 联动
```

#### L46·朝廷资助

```
改革配套财政·
  GM._kejuParadigm.scholarship = {
    寒门补助·1000 / 年·100 寒门生
    偏远补助·500 / 年·50 偏远士子
    新派补助·800 / 年·30 新 subject 培训生
    学馆资助·5000 / 年 / 学馆
  }

LLM 推预算·按 P.economic 国库·若不足·改革延期 / 缩范围
跟 P.economic 联动·改革财政 audit
```

---

### 7.15·L-H 朝代过渡·`_timeAnomaly` 支持·4 slice

#### L47·朝代过渡·paradigm 跨代承袭细化

```
朝代更替时 (e.g. 明 → 清·或玩家换帝)
新朝皇帝 LLM 推三态·
  承袭·"先朝 X 改革·我朝亦继之·惟微调"
  反对·"先朝 X 改革害我朝·当复古"
  折中·"先朝 X 改革有利有弊·取利除弊"
+ 旨意 200 字 (新朝皇帝口吻)
跟 GM._kjReformInheritance (L35) 联动
```

#### L48·新朝 LLM 审改革

```
新朝建国 5y 内·LLM 审前朝改革史
按新朝 ideology + 民族 + 派系·推 5y 内"改前朝制" 路径
  - 元 → 明·朱元璋废元代很多·恢复唐宋制 (复古)
  - 明 → 清·满洲贵族审明八股·加翻译科 (折中)
  - 清初 → 清末·光绪审清制·废八股 (改革)

每新朝有"X 朝制" timeline·跟 L19 派系谱联动
```

#### L49·`_timeAnomaly` 联动·虚构剧本支持

```
任何朝代可现代化·虚构剧本支持·
  汉·察举 → 科举 (历史早隋唐)·_timeAnomaly·演义模式
  唐·科举 → 实学 (历史晚 1898 年)·_timeAnomaly
  宋·糊名 → 取消糊名 (反向)·_timeAnomaly
  元·色目优先 → 满汉合一 (民族平等)·_timeAnomaly
  明·廷议 → 民议 (虚构民主萌芽)·_timeAnomaly

LLM 合理化·"在 X 朝 X 年·若先觉者 Y 力推·或可···"
跟现有 _timeAnomaly 系统联动·演义模式独有
```

#### L50·跨剧本 paradigm 累积·"宇宙改革历史"

```
跨剧本累积·
  GM._kjUniverseHistory = {
    scenarios: [
      { name:'天启七年', dynasty:'明', reforms:[...], lineage:[...] },
      { name:'崇祯死局', dynasty:'明',  reforms:[...], lineage:[...] },
      { name:'绍宋',     dynasty:'宋',  reforms:[...], lineage:[...] }
    ],
    universeAchievements: [...],   // 跨剧本 trophy
    universeLineages: [...]        // 跨剧本派系谱
  }

玩家可看·"我在 5 个剧本主导的改革史 + 跨代派系谱 + 跨学派"
累积成就·"宇宙改革大师"·解锁特殊 scenario
```

---

### 7.16·跟其他 Phase 的关系

| 跟谁 | 关系 |
|---|---|
| **J3 改革浪潮** | **取代**·L 完全取代 J3·6 主题归入 L10 preset |
| **Phase G 特科** | **联动**·武举 = subjects 加 '武学' / 翻译科 = 加 '翻译'·G 保留为"单独开科"机制·L 是"题型权重调"机制·两层独立 |
| **Phase H 私学/书院** | **联动**·书院影响 ideology shift (东林 → 经世)·H 触发 L 改革候选 |
| **Phase I 宦官** | **联动**·I3 反宦改革主题在 L10 preset |
| **Phase J0 自然政治触发** | **必要**·J0 trigger 走 L 路径·非现 J3 主题 |
| **Phase K 编辑器** | **加段**·K2 schema 扩 + KejuParadigm 全字段编辑·K3 加 "reform preset 编辑面" |

---

## 8·char schema·Stage 2 加 3 字段 (Stage 1 已加 2)

```
ch._mentorRef         string  // Slice E1·进士硬指向主考          (Stage 1·v6.5)
ch._cohortYear        number  // Slice F1·同年 cohort 标签         (Stage 1·v7)
ch._specialExamType   string  // Slice G1·特科出身标签             (Stage 2·G·待)
ch._schoolAffiliation string  // Slice H1·书院归属                 (Stage 2·H·待)
ch._examStyle         string  // Slice L7·改革后进士题型 style·八股/celun/xixue/shixue (Stage 2·L·待)
```

**rationale**·4 维度全是第一公民·独立字段 ≠ 派生·派生不能承担 graph 边 / 历史标签 / 多对一关系。

---

## 9·GM 顶层 namespace·Stage 2 加 5 (Stage 1 已加 1)

```
GM._mentorIndex            // Stage 1·F1·进士反向 mentor 索引       (已 ship)
GM._discipleGraph          // Stage 1·F1·门生 graph + 强度 + 衰减   (已 ship)
GM._specialExamCalendar    // Stage 2·G1·特科 4 类配置 + 队列       (待)
GM._schoolNetwork          // Stage 2·H1·书院 5 类 + 历史 timeline   (待)
GM._eunuchInterference     // Stage 2·I1·司礼监 + 东厂 + 宦党       (待)
GM._kjIndicators           // Stage 2·J1·F1/F2/F3 实时值 + 历史      (待)
GM._kejuParadigm           // Stage 2·L1·科举 paradigm 11 类 30+ 字段·改革 history + 改革志 (待)
GM._kejuReformLineage      // Stage 2·L19·改革派系动态系谱·跨代党争    (待)
GM._kejuSchoolsOfThought   // Stage 2·L36·学派志总集·跨代师承谱        (待)
GM._kjReformInheritance    // Stage 2·L35·改革遗产·跨剧本传承          (待)
GM._kjUniverseHistory      // Stage 2·L50·跨剧本宇宙改革历史 + 派系谱  (待)
```

---

## 10·Stage 2 总预算

| Phase | 估时 | Release |
|---|---|---|
| **G·特科** (4 mini-keju + shared infra) | **13-22 d** | 1.2.5.3 → 1.2.5.7 |
| **H·私学/书院** | **10-14 d** | 1.2.6.x |
| **I·宦官干预** (明清专有) | **6-9 d** | 1.2.7.x |
| **J·三指针闭环 + 弊案 + 自然触发** (~~原 J3 改革浪潮 → Phase L~~) | **5.5-8 d** (减 1.5-2d·因 J3 删) | 1.2.8.x |
| **K·UI + 朝代差异化 + 编辑器** | **8-10 d** | 1.2.9.x |
| **L·科举改革系统** (全朝代 generic + AI 深用 + 跨剧本宇宙·拆 L-A + L-B + L-C + L-D + L-E + L-F + L-G + L-H) | **84-123 d** (50 slice) | 1.2.6.x → 1.3.2.x (并行 H/I) |
| **Stage 2 总计** | **126-186 d** | Release 1.2.5.3 → 1.3.2.x |

---

## 11·Stage 2 决策点 (待 user 拍板·**优先 + 顺序 + 增项**)

### a·顺序

| 选 | Phase 顺序 | 理由 |
|---|---|---|
| **A** (默认) | G → H → I → J → K | 按 sprint doc·维度顺序·先扩玩法再闭环 |
| **B** (玩家价值) | G3 武举 → G2 恩科 → J → 其余 | 武举触发最频繁 (边事) + J 闭环让现有系统更鲜活 |
| **C** (清新可玩) | G → J (闭环先) → H/I/K | 让玩家先有反馈循环再加机制 |

### b·Phase G 内顺序 (4 类特科)

| 选 | 内顺序 | 理由 |
|---|---|---|
| **A** (默认) | G1 → G2 恩科 → G3 武举 → G4 翻译科 → G5 童子科 | 按通用性·恩科 9 朝代全有·童子科最罕见 |
| **B** (玩家价值) | G1 → G3 武举 → G2 恩科 → G4 → G5 | 武举触发更频繁 + 联动深 |
| **C** (剧本驱动) | G1 → 看 user 当前主玩剧本是天启 (明) → G3+G2 → G4 (清·绍宋后) → G5 | 跟当前测试剧本 priority 一致 |

### c·联动深度 (G3 武举 / G4 翻译科 / G5 童子科 真接入现有 chars system？)

| 选 | 内容 | 工时影响 |
|---|---|---|
| **A** (默认·user 锁) | 真接入·武进士入营 / 翻译进士入军机 / 童子郎入翰林 + 后续事件 spawn | 各 +0.5-1d (已含估时) |
| **B** | 只发字段·孤岛·不接现有 system | 各 -0.5-1d (~减 2-3d 总) |

### d·G5 早慧不寿 (~10% 早卒)

| 选 | 内容 | 工时 |
|---|---|---|
| **A** (默认·user 锁) | 做·童子科核心戏剧性 | +0.5d (已含估时) |
| **B** | 不做·童子郎只是天才设定 | -0.5d |

### e·每 slice 单 ship vs 全做完一刀 ship

| 选 | 内容 | 风险 |
|---|---|---|
| **A** (默认) | 每 slice 单 ship·G1 ship 1.2.5.3·G2 ship 1.2.5.4...·user 玩反馈再 G3 | D1 经验·反馈驱动 |
| **B** | G2-G5 全做完一刀 ship | 一旦 paradigm 错 4 类全废 |

### f·**user 准备补充的内容** (留白·user 增项)

> _此段留给 user 补充·当前是 placeholder_
>
> **user 在此添加新的特科 / 新的 Phase / 新的 slice / 新的决策点·我会补完整设计 + 估时·然后我们一起拍板。**
>
> 候选方向 (我建议·non-exhaustive)·
>
> 1. **博学鸿词科** (清康熙博学鸿词·特设)
> 2. **制科** (唐宋制科·临时制策)
> 3. **荫科** (世家荫子入官·非考)
> 4. **南北中卷分榜** (明 1397 南北卷) — **已纳入 Phase L 维度 5·quota.geo 改**
> 5. **科举舞弊大案** (顺治丁酉科场案 / 咸丰戊戌科场案)·扩 J4
> 6. **科举废止** (1905 光绪废科举)·**已纳入 Phase L preset (1905 废科举·ideology→modern)**
> 7. **女科** (历史无·剧本虚构·武则天则天科 / 朝代 reimagined) — **已纳入 Phase L preset (虚构·女科)**
> 8. **乡试解额政策**·南北/边远 quota·**已纳入 Phase L quota.geo + prefecture**
> 9. **学堂制 (1905 废科举 之后)**·切学堂 system·进士改"学士"·**已纳入 Phase L paradigm shift (维度 8)**

---

### g·Phase L 内·LLM 影响推演 (AI·1)

| 选 | 内容 | 工时 |
|---|---|---|
| **A** (默认) | 必做·Phase L 灵魂·非 hardcode 矩阵 | (已含估时) |
| **B** | 不做·只 hardcode 矩阵·失自由度 | -3-4 d (但 Phase L 价值打 5 折) |

### h·Phase L 内·LLM 反对奏疏 (AI·2)

| 选 | 内容 | 工时 |
|---|---|---|
| **A** (默认) | 每 NPC 200-400 字古文奏疏·3 NPC 一改革·~3-5k token | (已含估时) |
| **B** | 只 stance + reason 短句 | -2 d (但 NPC 浅薄) |

### i·Phase L 内·LLM 协议玩家定义新 subject (AI·3)

| 选 | 内容 | 工时 |
|---|---|---|
| **A** (默认) | 玩家加 subject·LLM 提议 + 自定义 + 合理化·**真"任何方向"** | (已含估时) |
| **B** | 玩家从 30+ 预设选·无自定义 | -1-2 d |

### j·Phase L 内·LLM 演化推演 (AI·4)

| 选 | 内容 | 工时 |
|---|---|---|
| **A** (默认) | 改革后 1-2y LLM 自动推演 + 写"改革志"·跨年度感 | (已含估时) |
| **B** | 改革立即生效·无演化 | -2 d |

### k·Phase L 内·LLM 黑天鹅 (AI·7)

| 选 | 内容 | 工时 |
|---|---|---|
| **A** (默认·difficulty toggle) | 实施过程意外事件·有 toggle (玩家可关) | (已含估时) |
| **B** | 平滑无意外 | -1.5 d (但失戏剧性) |

### l·Phase L 内·改革者命运 (玩·3)

| 选 | 内容 | 工时 |
|---|---|---|
| **A** (默认) | 改革主导 NPC 名垂或遗臭·LLM 写传 1000 字 | (已含估时) |
| **B** | 不做·NPC 无后果 | -1 d |

### m·Phase L 内·跨剧本连续 (玩·5)

| 选 | 内容 | 工时 |
|---|---|---|
| **A** (有特色) | 改革遗产可加载下一剧本·LLM 推演承袭 | (已含估时) |
| **B** (默认·后期再做) | 跳过·v2 加 | -1 d |

### n·Phase L 内·切分 L-A + L-B 两 Release

| 选 | 内容 | 影响 |
|---|---|---|
| **A** (默认) | L-A (L1-L7·10-15d) 先 ship·L-B (L8-L12·12-17d) 后 ship | user 玩 L-A 反馈再 L-B |
| **B** | L 全做完一刀 ship | 风险·22-32d 长跑·中途 paradigm 错全废 |

### o·Phase L 优先级·跟 Phase G/H/I/J/K 关系

| 选 | 顺序 | 理由 |
|---|---|---|
| **A** (默认) | G → L-A → H → I → J → K → L-B/C/D/E/F/G/H | 先 G 让玩家见特科·再 L-A 开改革·H/I 沿用 L paradigm |
| **B** (改革优先) | L-A → G → H → I → L-B/C/D → J → K → L-E/F/G/H | 改革是 v7.1 终极机制·先开闭环再加内容 |
| **C** (并行) | G + L-A 并行 → H + L-B 并行 → I + L-C 并行 → J + L-D + K → L-E/F/G/H | 工时 -20-30d·但需 user 多线 review |

### p-ll·Phase L L-A/B/C 决策 (见前面对话)

### ee-ll·Phase L L-D/E 决策 (见前面对话)

### mm-tt·Phase L L-F 决策 (新加 8)

| # | 问题 | 默认建议 |
|---|---|---|
| **mm** | L35·跨剧本传承·要做？(玩家累积成就) | **要·跨剧本宇宙·user 锁可玩深度** |
| **nn** | L36·学派志 LLM·要做？(经学派 / 实学派 / 西学派 师承谱) | **要·历史感** |
| **oo** | L37·跨国改革对比·要做？(朝贡国 NPC) | **要·跟 G4 翻译科联动·小成本** |
| **pp** | L38·配套政策建议·要做？(LLM 协议·改 A 必配 B) | **要·改革真"系统"·非孤立 toggle** |
| **qq** | L39·改革成败评分·要做？(5 star + trophy) | **要·成就感** |
| **rr** | L40·内臣外戚干预·要做？(后宫宫斗) | **要·跟 emperor_authority / Phase I 联动深** |
| **ss** | L41·改革封赏·要做？(LLM 推奖励) | **要·NPC 真有动机推改革** |
| **tt** | L42·派系换血·要做？(NPC 死亡 + 新生) | **要·跨代延续·小成本** |

### uu-xx·Phase L L-G 决策 (新加 4)

| # | 问题 | 默认建议 |
|---|---|---|
| **uu** | L43·教材编纂·要做？(主考可任编纂使) | **要·内容真扩** |
| **vv** | L44·考生培训·要做？(培训机构 + 师资) | **要·跟 L-G 学馆联动** |
| **ww** | L45·学馆开办·要做？(西学馆 / 算学馆 / 武学馆) | **要·跟 H 私学联动·新派物理载体** |
| **xx** | L46·朝廷资助·要做？(scholarship + 学馆资助) | **要·跟 P.economic 联动·改革财政 audit** |

### yy-bb·Phase L L-H 决策 (新加 4)

| # | 问题 | 默认建议 |
|---|---|---|
| **yy** | L47·朝代过渡·paradigm 跨代承袭·要做？ | **要·跟 GM._kjReformInheritance 联动** |
| **zz** | L48·新朝 LLM 审改革·要做？(新朝建国 5y 内审前朝改革史) | **要·跟跨代承袭联动** |
| **aaa** | L49·`_timeAnomaly` 联动·要做？(虚构剧本支持) | **要·user 锁全朝代全方向必有** |
| **bbb** | L50·跨剧本宇宙·要做？(跨剧本 paradigm + 派系谱 + 学派志累积) | **要·真宇宙成就·v3 长期愿景** |

---

## 12·待补完成后的 next step

1. user 补完 §11·f·特科 / Phase 扩项 (Phase L 已含 1905 废科举 / 女科 / 南北卷 / 解额 / 学堂制)
2. Claude 补完整设计 (每项给出·历史 paradigm / 触发 / 玩家议政 / 主考 / 题目 / 录取 / 授官 / 进士后果 / 长尾 / 联动 / 不办后果 / 新文件 / 估时)
3. user 拍板·a (Phase 顺序) + b (G 内顺序) + g-o (Phase L 决策) + 其余取舍
4. 开 Stage 2 第一刀 (按 §11·a + §11·o 决策)

---

## 附录·Stage 1 → Stage 2 设计原则继承

| 原则 | Stage 1 | Stage 2 |
|---|---|---|
| flag gate | useNewKejuD1 | useNewKejuD2 / D3 / D4 |
| 走常朝 paradigm | F2/F3/F4c | G/H/I 全继承 |
| 不发邸报 | ✅ | 继续 |
| 9 朝代 preset 可配 | ✅ | 继续·加 specialExamCalendar / schoolNetworkInit |
| 党争联动·读 GM.parties | ✅ | 继续 |
| 触发自然政治 | ✅ | 继续·禁玄幻 |
| 保留 keyi 800 行 | ✅ | 继续·扩 topicType |
| 历史名臣 + shiliao | ✅ | 继续·G/H 加强 |
| 内容机制不少于常科 | (本 Stage 1) | **user 锁·每 mini-system 都 full** |
