# Agent 模式·深度保障详设(2026-06)

## 命门(被 owner 点破后重定)
> agent 的自由不是用来偷懒草草收尾的,是用来**该深处比固定管线更深**的。**失深度 = 失职。**
> 一个回合必须横跨全部推演维度,且在局势吃紧处深挖。

**反转**:调用数从"越少越好"→**"每个调用都要换来一层真深度"**。agent 少调用若非因深挖,就是 bug(极浅推演=灾难)。
固定 LLM 管线靠写死 17-25 场景**保证**深度(刚性均匀);agent 要做**自适应深度**(全覆盖保底 + 热点超深)。

## 维度地图 + 缺口
| 维度 | LLM 场景 | agent 手段 | 状态 |
|---|---|---|---|
| 深度研判 | sc0 | 多轮推理 | 有·**要逼多轮** |
| 结构化变更 | sc1/1b/c/d | 读+写工具 | 有 |
| NPC内心/情节 | sc15 | deepen_npcs | 有 |
| 记忆固化/伏笔 | sc25 | recall_consolidate | 有 |
| 世界演化 | sc28 | deepen_world | 有 |
| 认知层 | sc07 | deepen_cognition | 有 |
| 书信 | sc1b | deepen_letters | 有 |
| 势力/外交 | sc16 | 泛泛推理 | ❌ **缺**→D2 deepen_factions |
| 经济财政 | sc17 | 泛泛推理 | ❌ **缺**→D2 deepen_economy |
| 军事 | sc18 | 泛泛推理 | ❌ **缺**→D2 deepen_military |
| 叙事多遍 | sc2链 | finalize单遍 | ❌ **浅**→D3 deepen_narrative |

## 六刀
- **D1 深度脊柱「硬门」**:loop 全程跟踪覆盖(调对应深化工具/在该维度有实质读写=覆盖);finalize_turn 加门——覆盖不足/轮数过少/未固化记忆 → **驳回**并告知缺口·逼继续深推。设上限防死循环(K 次驳回后放行但标记 depthIncomplete)。
- **D2 补缺口深化工具**:deepen_factions(↔sc16)/deepen_economy(↔sc17)/deepen_military(↔sc18)·复用对应 scene 输出目标·同现有 5 工具范式。
- **D3 叙事多遍**:deepen_narrative(纲要→正文→审查·↔sc2链)·叙事打磨到管线档。
- **D4 自适应深度**:开局廉价显著度扫描→各维度排热度→保底全覆盖 + 热点多轮超深挖(把深度预算花刀刃上·固定管线做不到)。
- **D5 驱动 prompt + 反偷懒**:系统提示从"可跳过"改"义务覆盖全脊柱+热点深挖+禁草收";loop 跟踪轮数/覆盖·过浅推回。
- **D6 深度对拍验证**:node 自测——门驳回浅 finalize / 工具齐 / 覆盖跟踪准。比的是深度(维度覆盖+每维度轮次),非调用数。

## A-做对·输出契约完整覆盖(2026-06-21·owner 戳穿"产出只多不少"是 overclaim)
**根因**:mode B 只焊了 _turnReport,从没产 LLM 管线的完整输出(ctx.record 11 字段 + ~25 活态字段·共 ~36/7类)。**真覆盖约 1/3**。
**架构(owner 确认·B 会让 agent 半 LLM 化故否决)**:
- **确定性产出**(纯 GM 变换·非 LLM)→ **复用管线 helper**(不算"变 LLM"):turnChanges(Delta面板)/_lastTurnDigest/_fengwenRecord(风闻)/_edictRelations/personnelChanges。
- **LLM 创作产出** → **agent 用自己的深化工具产**(自适应·保 agent 架构):record 四体+playerStatus/playerInner/suggestions、记忆/伏笔/情节、NPC 心绪/认知、势力暗流/阴谋、因果图、对话/史评。
- 锚 36 字段契约·深度门强制全类覆盖。

**权威契约(tm-endturn-ai-infer.js:73-77 ctx.record + Explore 普查的活态层)**:
| 类 | 字段 | 归属 | DA 刀·状态 |
|---|---|---|---|
| ①叙事记录 | shizhengji/zhengwen/playerStatus/playerInner/turnSummary/shiluText/szjTitle/szjSummary/personnelChanges/hourenXishuo/suggestions | 创作(personnel/turnSummary 半确定) | **DA1 ✅**(deepen_narrative 产全·run 焊 aiResult·d7 14绿) |
| ②状态变更 | turnChanges→Delta面板/_lastTurnDigest | 确定性·复用 helper | **DA2 已查根因**:Delta面板读 GM.turnChanges·由 apply 步(applyAITurnChanges)填·mode B 走工具不跑 apply→turnChanges 空→面板空。修法=run() finalize 用确定性映射 _turnReport→turnChanges(merge 不 clobber 引擎)。⚠先核 generateChangeReport(render.js §6 L341+)读的 turnChanges.characters[]/variables[] 确切字段结构再建·勿猜 |
| ③记忆伏笔情节 | _aiMemory/_consolidatedMemory/_foreshadows/_plotThreads/_stateBoard | 创作 | ✅ recall_consolidate/deepen_world |
| ④NPC心理 | _mood/stress/_scars/_npcCognition | 创作 | ✅ deepen_npcs/cognition |
| ⑤势力层 | _factionUndercurrents/史/activeSchemes | 创作 | DA3 待:扩 deepen_factions 产这些 |
| ⑥书信对话 | letters / conv/_convArchive/chronicleAfterwords | 创作 | letters✅·conv/史评 DA4 待 |
| ⑦史评因果诏令 | _causalGraph(创作)/_edictRelations·_fengwenRecord(确定性) | 混 | DA4 待 |
| 门 | 强制全类覆盖 | — | DA5 待(现门已强制 recall_consolidate+deepen_narrative) |

## ★决议(owner 拍板 2026-06-21)+ 下一刀清单(给新会话当 checklist)
**已落**:DA1(record 11 字段·deepen_narrative)✅ · DA3(_factionUndercurrents/activeSchemes·deepen_factions)✅ · 门强制 recall_consolidate+deepen_narrative ✅ · 全 16 agent 测 + 契约43 + lint778 零回归 · 未 commit。
**DA-Q2a 已落(2026-06-21·sc1 record 7 字段共享 builder)✅**:新建 `tm-endturn-record-specs.js`(`TM.Endturn.AI.prompt.recordSpecs(ctx)` 返 turnSummary/shilu/szjTitle/shizhengji/szjSummary/playerStatus/playerInner verbatim 片段 + shilu/szj/houren 字数·字数源 ctx.prompt→_getCharRange→默认)→ sc1(tm-endturn-ai.js:2262)硬调 recordSpecs(comments 保留·结构不变)→ deepen_narrative(depth-tools)废 paraphrase + 写死字数·改用 recordSpecs(并修正旧 playerInner 误作"朝野反响"·canonical=主角内心独白)。注册 index.html(record-specs 先于 ai.js)+ 三文件 ?v=bump 20260621-daq2。.bak-pre-20260621-daq2(ai.js+depth-tools)。**验**:scripts/verify-recordspecs-byte-identical.js(eval .bak 真源 sc1 块 vs recordSpecs·4 组字数+回落=5 绿·字节级铁证)+ d2d3 24→28(+4 canonical 接线断言:实录/时政记 canonical 标志在·旧 paraphrase 已废)+ 全 16 agent 测 + 契约43/进度37/validity11/prompt-tokens47/namespace9 + boot 322/322 + syntax 718/718 全零回归 + 中文守恒(ai.js 减388·record-specs 含690[片段+注释])。⚠浏览器 eval 因渲染器繁忙超时未能直查 recordSpecs 挂载·以 boot-smoke(同 index.html 脚本表)+ 零 console 错误为准。
**DA-Q2b 已落(2026-06-21·houren 完整同源化)✅**:`hourenSpec(ctx)` 加进 record-specs 模块(verbatim sc2 静态块 1927-1966·字数 _getCharRange('houren'))→ wire followup sc2(tp2=动态 context 前缀 + hourenSpec(ctx)·字节级不变)→ deepen_narrative **加专用 raw3 houren pass**(镜像管线 sc2·digest+纲要+hourenSpec·富场景叙事·从 raw2 多字段调用移除 houren·hourenXishuo slice 120→1500)。**意义**:agent houren 从"≤50 字一句挤在多字段调用"→ 专调富场景叙事(=管线 sc2 档·且多一次调用=多一层深度·符合命门)。.bak-pre-20260621-daq2b(followup)。**验**:verify byte-identical +houren×3(eval .bak followup sc2 块 vs hourenSpec=逐字一致)+ d2d3 28→30(+2:houren 走专项 pass 用 canonical 全块·结果入 chronicle)+ d7 stub 加 houren 分支(hourenXishuo 来自 raw3)+ 全 16 agent + 契约43/进度37/validity11/prompt-tokens47/namespace9 + boot 322/322 全零回归。followup ?v=bump 20260621-daq2b。

**决议**:
- **Q2 = 共享 builder**(治本零 drift):把 canonical record 提示词抽成两边都调的共享函数。
- **Q3 = parity baseline**(prompt.build 全量)**+ 读工具(按需超集·保 ≥LLM)+ 懒加载工具(治超窗)**。超窗影响=API报错/截断·但 LLM 自己也产~42k 同担·非 agent 独有·玩家大窗口模型即可。

### DA-Q2a ✅ 已落:共享 record-prompt builder(sc1 record 7 字段·见上方"已落"块详情)
落地要点回填:canonical 在 `tm-endturn-ai.js:2262`(sc1·非 prompt.js·那句"verbatim"只覆盖前缀 tp)·字数源 `_getCharRange`(全局·裸调·tm-utils/chronicle/memorials 全用)→ recordSpecs 回落它即与管线同字数(不依赖 ctx.prompt 透传 agent)。
**决策:sc1d(:3867)不并入**——它是降级紧凑救援·文本有意≠ sc1 富版·单个 recordSpecs 无法对两者都字节级一致·gold standard 是 sc1。sc1d 维持独立(低 drift 风险:仅 sc1 失败时命中·非黄金标准)。
**教训补**:① Write/Edit 内容里 `\\n`→文件落两反斜杠+n(与源一致·已探针实证)·`\n`→落一反斜杠+n(字面非换行)。② 字节级对拍要从 .bak **程序化 eval 真源**·别手写 EXPECTED(手写 = 双重转写风险)。③ 浏览器重载后 eval 易被重渲染器卡死超时·boot-smoke(node·同 index.html 脚本表)是权威加载等价证。

### DA-Q3 ✅ 已落(2026-06-21):parity baseline + 读工具 + 懒加载
**勘误**:① parity baseline **早已是默认**(S9·line 266 `basis = await _basisDossier || _buildTurnPrompt`·非旧记"开关后默认关")。② 读工具**早已是超集**(get_field 读任意路径 / recall_history 复用② / get_overview)→ owner「能读到不少于」已满足。
**真缺口=记忆层 push vs pull**:_basisDossier 用 `ctx.prompt.sysP+tp`·但 grep 证 tp **不含** LLM sc1 的 `_sc1Prefix`(世界快照/记忆表/状态盘/跨回合固化记忆/伏笔·全在 ai.js sc1 内建·非 prompt.build)→ agent 能 pull 记忆但默认没 push。
**落地**:① `_memoryDossier(gm)`(纯 gm 直读 _stateBoard/_consolidatedMemory||_aiMemory/_plotThreads/_foreshadows·全 guarded·turn1空)→ run() push 进 transcript(地板·命门记忆 parity)·读工具仍天花板。② `_readToolsOnly()`(只读+finalize)首轮挂·轮≥2 挂 _allTools(写/深化 ~8k 推迟·首轮≈LLM·治 agent 独有超窗·合"察看→落地"流·D1 门本逼多轮)。导出 memoryDossier/readToolsOnly。**未碰 ai.js _sc1Prefix 抽取**(大重构·直读同字段+读工具超集已够·drift 低)。.bak-pre-20260621-daq3。**验**:smoke-agent-mode-daq3 27 绿 + 全 17 agent + 契约43/进度37/validity11/prompt-tokens47/namespace9 + boot322 零回归·?v=bump daq3。

### DA2 ✅ 已落(2026-06-21):turnChanges→Delta 面板
核实桶结构(tm-dynamic-systems.js:432 + render.js §6 L341):characters/factions/parties/classes/military `{name,changes:[{field,oldValue,newValue,reason}]}`·variables `{name,oldValue,newValue,delta}`。新增 `_mapReportToTurnChanges(gm)`(run() finalize 自检过后调·失败不阻断):把守护写的 _turnReport(扁平 path)确定性映射进 GM.turnChanges。**保守**:只映射能干净分类的——`chars/<name>`|`chars.<idx>.<field>`→characters(idx→name 解析)·`facs...`→factions·核心变量(GM.vars 有此 key)→variables;**结构化账(guoku.*/neitang.*)跳过**(fiscal/topbar 另 render·不污染)·**非 _agent 条目跳过**。additive merge(find-or-create·不 clobber 引擎已填)·variables update-or-push 合并(引擎旧值→agent 新值)。验:smoke-agent-mode-da2 12 绿。
### DA4 ✅ 已落(2026-06-21):因果链连续性
诊断:DA4 字段多数已被现有 deepen 工具覆盖(风闻≈deepen_factions undercurrents/schemes·且 agent 写 evtLog 已喂"风闻情报"面板[读 evtLog 同源];conv≈deepen_letters;后人评≈houren;edict≈write工具+currentIssues)。**唯一清晰缺口=_causalGraph**(被 ai.js:1952 下回合推演读·save-lifecycle 持久·agent 无产者)。落地:recall_consolidate 加 `causal_edges` 产出 → gm._causalGraph.edges(镜像 followup sc-memwrite:938 结构 id/from/to/type/strength/explanation/turn·LRU≤300)+ _memoryDossier 纳入近期因果链(agent 下回合读自己的因果图·与 ai.js:1952 同源·闭环)。验:smoke-agent-mode-da4 8 绿。**其余 DA4 长尾(独立 _fengwenRecord/chronicleAfterwords/_edictRelations 专项生成)= 边际递减·已被现有工具实质覆盖·不另造薄/死字段**。

### 教训(钉死)
锚权威契约(ctx.record/_getCharRange/canonical prompt)·**别逆向猜消费端**(弹窗/桶结构我已错 2 次)。碰核心管线必 .bak + node 验 mode A 零回归 + 中文 token 数比对。

## 纪律
switch 门控(并入 agentModeOn/experimental)·node 自测·留 .bak·只动 agent 模式文件(tm-endturn-agent-mode.js / tm-endturn-agent-depth-tools.js)·不碰 LLM 管线。
