# 阶层系统未来构想 · Vic3 级深化（现状 → 愿景 delta）

> 2026-06-16 · 状态：**设计构想，未实现，未 ship、未 commit**。
> 缘起：owner 提出「阶层部分的未来构想，参考 Victoria 3」。本文是数轮讨论的沉淀。
> **重要前提**：动笔前实查代码库（`tm-social-foundation` / `tm-class-mobility` / `renli-yaoyi-design` / `gongming-system-design` / huji 子系统），发现**讨论中当「构想」聊的东西已大量落地或正在落地**。故本文不是空想蓝图，而是**从现状桥到 Vic3 级愿景的真实增量**——已建的如实记账、只把真缺口立为目标。
> **朝代中立铁律（项目 CLAUDE.md）贯穿全文**：引擎层只放跨朝代通用框架；辽饷/矿税/东林党/一条鞭法等一律是**剧本层示例**，绝不硬编进引擎。

---

## 〇、一条核心判断：满意度是「派生量」不是「累加器」

Vic3 阶层政治真正强的，不是它那张阶层清单，是它的**因果链**：

```
经济产出 → 生活水平(SoL) → 顺民/乱民切分 → 政治压力(运动/支持度) → 立法/政策 → 经济政策 → 回到经济产出
```

阶层的政治态度**不是某个数值被各路信号加加减减**，而是从「它这一回合能不能糊口、它的诉求有没有被理睬」**推导**出来的。

**这一判断我们已经赢了一半。** `class-party-overhaul-2026-06.md` 刀2 已把满意度从「无主随机游走积分器」改成「实况派生量 + 事件扰动」：基线 = 材料输入（税负/灾域/战区/欠饷/民心）× 阶层暴露度，满意度每回合向基线缓变 ±1.2。「无缘无故跌 0」变成「有账可查」。`gateSatisfaction` 总闸（±14/回合 + 环账）守住叠扣砸穿。

**愿景 = 把这条链补全到 Vic3 的分辨率**：现状基线是「绝对水平」，缺的是 Vic3 那两块最吃重的中间层——**生活水平的期望落差**（变化比水平更重要）和**顺民/乱民的政治蓄水池**（满意度与民变之间缺的那一层）。

---

## 一、现状盘点（已建 / 在建 · 如实记账）

| 能力 | 现状 | 落点 |
|---|---|---|
| 派生满意度地基 | ✅ 已落地 | `tm-social-foundation.js` · `TM.SocialFoundation`：基线 + 缓变 |
| 满意度总闸 | ✅ 已落地 | `gateSatisfaction`（±14·`cls._satLedger` 环账）|
| 议程引擎（诉求） | ✅ 已落地 | foundation：seed/struct/ai 三源 + 条件解除自动得偿闭环 |
| 地域分账 | ✅ 已落地 | `localInputsFor` / `tickClassRegional` / `applyRegionalDelta`（陕西12 vs 江南40）|
| 属性驱动暴露度 | ✅ 已落地（简版） | economicRole（生产0.8/商0.6/治理0.2）派生税/灾/战/饷暴露 |
| 阶层人口格子 + 守恒流动 | ✅ 已落地 | `tm-class-mobility.js`：`GM.population.byClass{landlord,peasant_self,peasant_tenant,debased,gentry_high...}.mouths`；兼并→债务→破产→流民/贱民/逃户；豪强三级转移 |
| 党派单源对账 + 现生 | ✅ 已落地 | `syncPartyTruth`；emerge/dissolve；`tm-char-autogen.js` 现生阶层/党派 |
| **物质基底（丁/役/农）** | 🔧 **在建（2026-06-16）** | `renli-yaoyi-design`：丁=役与农争夺的稀缺流量、役负物理减产、**死亡螺旋发动机**、变法阶梯、4500 行 huji 子系统 + `classifyPlayerOperation` 五道政道入口 |
| 功名（资格⊕政绩） | 🔧 在建 | `gongming-system-design`：`char.resources.gongming{path,tier,ceiling,youmian...}`，`youmian` 已接赋税/户籍 |
| 民心（阶层聚合派生量） | ✅ 已落地 | `GM.minxin.trueIndex`=分区**人口加权**（`tm-integration-bridge.js:615`）；阶层满意度经 `tm-class-minxin-bridge.js` 已喂入 `minxin.byClass` |
| 皇威 + 死亡螺旋/级联 | ✅ 皇威自由写；**级联已全建** | 皇威=具名事件直写（`adjustHuangwei`，**刻意不自动漂移**）；失威危机/权臣篡位/民变改朝三套 active 级联 + 两个 game-over（`tm-authority-complete.js`）|

> 一句话现状：**已经是一套相当完整的「派生满意度 + 物质基底」系统**，且物质层正在补到位。这不是从零起步。

---

## 二、真实缺口（对照 Vic3 的 delta）

按吃重程度排：

1. **生活水平（SoL）显式指数 + 期望锚 + 落差驱动**〔大〕——现状基线是绝对水平 + 缓变（lag），**没有显式 SoL 期望慢锚，也不以落差驱动激进**。缺「升米恩斗米仇 / 变化比水平更重要」这条 Vic3 第一性原理。
2. **顺民/乱民切分**〔大〕——grep 确认**全无** per-阶层政治激进比例。这是连接「满意度」与「民变」的**缺失中间层**：现状满意度是个标量、流民是人口流，中间缺一个「乱民比例」蓄水池。
3. **民变→流寇 完整升级阶梯**〔中〕——人口流（流民/贱民/逃户）和 per-实体 `rebellionRisk`（少数民族叛乱）已有，但「区域乱民临界 → 民变事件 → 跨省凝成流寇军事实体 → 耗军饷镇压 → 招抚逆流」这条**以阶层激进度为闸的完整阶梯**缺。
4. **合法性按 clout 加权（而非人口加权）**〔中·已核实大幅缩小〕——死亡螺旋**已全建**（失威危机→督抚 compliance↓/外邦蠢动、权臣篡位、民变改朝，皆 active + game-over）；民心**已是**阶层满意度聚合的派生量。真缺口窄：①民心走**人口加权**，Vic3 合法性按 **clout/影响力加权**（士绅作乱比等量农户更动摇合法性）；②皇威**刻意自由写**（设计上拒绝无因漂移）——故不宜硬改成派生，宜另立 clout 加权**读模型**接既有级联。详 §三D。
5. **描述符 schema 扩展 + 现生管线**〔中〕——现状 economicRole 是三分简版；缺多标签描述符 + AI 现生时的「主标 + 对账兜底」管线 + 开放词表，让现生阶层**全自动**插进 SoL/民变引擎。
6. **改革杠杆 typed-incidence：表已有但 orphaned**〔中·已核实〕——`tm-edict-lifecycle.js:10 EDICT_TYPES` **已带** `affectedClasses:{农民:+15,商贾:+8…}` 类型化向量，但**只喂预览文案、从不 apply**（`generateEdictForecast`）。另有结构化诏令真 apply 财政/户口/合法性（`tm-edict-parser.js`）、按标签路由阶层满意度的 `inferClassImpacts`（`tm-social-political-signals.js`）。三段未打通。真活 = **接 orphaned 表到 apply + 统一标签路由**，非新建。详 §三F。
7. **科举守恒上行流**〔小〕——功名是个体级；缺「寒门→士绅 人口格子守恒流 + 配额 throttle → 受阻激进」。

---

## 三、设计（逐块 delta · 每块都接现有模块，不另起炉灶）

### A. 生活水平层：把「基线」升级成「现值/期望/落差」三件套
- 复用 foundation 现有的材料输入（税负/灾域/战区/欠饷），**不重算**——它们已经是 SoL 的原料。把当前「基线」重命名/封装为 **SoL 现值**。
- 新增 **SoL 期望**（慢锚）：最近 N 回合 SoL 现值的指数移动平均（EMA），代表「他们习惯了的日子」。
- 新增 **落差 = 现值 − 期望**。满意度的「材料项」改由**落差**驱动而非绝对水平：长期穷但稳 = 顺；刚被打下去 = 怒。期望随时间自适应（适应苦难 → 激进回落，直到下一次进一步恶化）——历史上「最凶民变在刚变差的地方，不在最穷的地方」自然涌现。
- **与 ±14 总闸的关系**：闸不删，但**降级**。平滑的家从「夹输出」搬到「期望 EMA 跟踪速度 + 冲击衰减常数」。闸最终变成**不变量断言**（「派生满意度本回合移动 > X = 某输入失准，记一笔」），而非承重夹钳——呼应项目已学到的「绝对数值 gate 是 rot-bait，断言才 durable」。

### B. 顺民/乱民层：满意度与民变之间的政治蓄水池
- 每个**阶层×地域格子**新增 `radicalFrac`（乱民比例 0–1）。挂在已有的 `byClass` 格子（或其地域变体）上。
- 驱动：`radicalFrac` 由 **SoL 落差（A）+ 政治边缘化（议程久拖不决 / 其党在野）** 抬高，由 SoL 回升 + 诉求得偿压低。**快激进、慢平复**（一场灾荒几回合拉满，信任要很多回合重建）——这个不对称本身就是硬核来源。
- 它是缺失的中间层：满意度（情绪）→ `radicalFrac`（政治化蓄水）→ 民变（C，行动）。现状满意度直接悬空，没有这个蓄水池。

### C. 民变→流寇阶梯：数值后果 + LLM 双层（接 mobility + 五道政道入口）
- **数值层（ground truth）**：某格子 `radicalFrac` 越区域阈值 → 触发民变。后果立即结算并复用现有管线：抛荒（减 `carryingCapacity.arable`）、税基↓（接 huji `applyFiscalHardEffect` 的 collectionMultiplier）、compliance↓。**接 mobility 的守恒流**：乱民 = 从 `peasant_self/tenant` 格子流出的真人口（每个流寇都是不再纳税的农户）。
- **升级**：相邻高 `radicalFrac` 格子跨省凝成**流寇军事实体**（roving）；镇压耗军饷 + 战损；招抚 = 逆流回编户/军户（接 huji `buildMilitaryPool`），但开恶例（合法性代价）。
- **LLM 层（界面/戏剧化）**：民变从 ground truth **派生**一道督抚奏报，把真实数字当 prompt 上下文（「某省连岁亢旱，自耕生计跌至 X，乱民什九」），走**已有的 `classifyPlayerOperation` 五道政道入口**（诏令/奏疏/廷议/鸿雁）给朝廷 赈/蠲/抚/剿 选项；选择**写回** A 的材料输入。闭环——呼应「写后果必须 prompt 注入回去才闭环」。
- **不同阶层不同造反方式**（描述符 E 的 `unrestArchetype` 决定）：下层暴烈（揭竿/流寇），上层安静而致命（隐田/抗税/通敌——接 mobility 的 `harboredHidden`/逃户）。这是比 Vic3 更细的一层。

### D. 合法性：clout 加权 + 复用既有死亡螺旋（已核实 · delta 大幅缩小）
实查纠正了构想：**死亡螺旋不用建——已全建**。失威危机（皇威<30 → 各 region `compliance-=0.003/回合` 督抚怠奉诏 + 外邦 `autonomy+=0.1`，`tm-authority-complete.js:745 _tickLostAuthorityCrisis`）、权臣篡位（`huangquan` 三级拦诏→game-over，`:163-191`）、民变改朝（`div.minxin<25`→升级→level≥4 反扣皇威-8→level5 game-over，`:283-292`）三套 active 级联 + 闭环已成立。**民心也已是阶层满意度的派生聚合**（`tm-class-minxin-bridge` 喂 `minxin.byClass` → `tm-integration-bridge.js:615` 人口加权 `trueIndex`）。
- **真 delta①：clout 加权**。现状 `trueIndex` 是**人口加权**；Vic3 合法性按**政治权力加权**。新增一个 clout 加权聚合（阶层满意度 × 影响力/阶等）——直接复用 `minxin.byClass` 这套现成的「阶层→派生标量」范式，只换权重。一个士绅阶层崩盘比等量农户更动摇合法性。
- **真 delta②：尊重「皇威刻意自由写」的设计**。皇威是几十处具名事件直写的（`adjustHuangwei`），团队**故意**关掉了 minxin→皇威 被动联动（`_allowPassiveAuthorityLinkage` 默认 false，changelog 注明「避免核心权威值无因漂移」）。**故不把皇威改成派生**——而是立一个 clout 加权的**「天命」读模型**（派生展示量）接到**既有失威/民变级联的阈值**上，皇威保持「有可读事件才动」。两不相犯。
- **两层杠杆别混**：物质层（赈灾/蠲免救 SoL）与符号层（罪己诏/改元走 `triggerHuangweiEvent` 既有具名事件救合法性）分开。

### E. 描述符 schema 扩展 + 现生管线（让 autogen 阶层自动插进 A/B/C）
- economicRole（三分）扩成多标签描述符，挂在每个阶层（种子=预填实例、现生=同码路）：
  - `stratum` 上/中/下 —— **唯一强制闭合字段**，做保底地板（任何阶层都有通用 SoL + 物质/政治权重）。
  - `economicBase`（地租/自耕/佃租/工商/走私/俸饷/屯田/教权/清议…）、`fiscalStatus`（优免/编户/法外/受饷）、`unrestArchetype`（暴烈/撤离/不合作/哗变/倒戈）—— **开放词表**。
- 驱动规则**按标签触发**（economicBase 含自耕 → SoL 吃年成−田赋−徭役；fiscalStatus=优免 → 加派 incidence≈0，「负担挤到编户」自动涌现）。现生一个表外阶层（盐枭/教民/土司）零引擎代码即插入。
- **现生管线 = 主标 + 对账兜底**（owner 拍「两者都要」）：AI 现生时结构化标签**可选、非阻塞**（保自由）；确定性对账器补全缺栏 + 校验 + 归一（保准确）；硬骨头升一个 `secondary` 低优先 LLM 调用裁（复用「辅臣拟议」范式）。**描述符是 sticky 存储态、SoL/满意度才是每回合派生视图**（呼应单一真相源边界）。
- **开放词表 + 降级 + 待补账**（owner 拍「按你想法」→ 取此）：表外标签**留原词** + 绑最近已知原型（别名表/secondary 裁/落 stratum 地板）→ 永远可算；novel 标签进**待补 ledger**，高频者升格为头等标签配专属驱动。**词表从推演里长大**，不一次拍死。

### F. 改革杠杆 typed-incidence（已核实：抽象既有 + 补路由，非新建）
实查确认结构化效果数据**已分散存在三处**，缺的是打通：
- **最高杠杆一刀：接上 orphaned 表**。`tm-edict-lifecycle.js:10 EDICT_TYPES` 已有 18 类诏令的 `affectedClasses` 类型化向量 + `resistance`，但只被 `generateEdictForecast`(:337) 拼预览文案、**从不写游戏态**。把它接到 apply（经 `applyClassImpact`+`gateSatisfaction` 落地），诏令立刻有结构化跨阶层后果。
- **统一到标签路由**。现状两套并存且不一致：通用事件→阶层走 `inferClassImpacts`（`tm-social-political-signals.js:1079`，按 economicRole/tags 匹配，**已能自动命中现生阶层**）；但 huji 硬效果桥（`tm-huji-runtime-bridge.js:574/691/625`）和诏令预览表用**硬编码阶层名**（'农户'/'军户'/'编户齐民'）。统一改走标签路由，现生阶层才自动正确。
- **变法 preset + 科举变法补 incidence**。`renli-yaoyi` 变法阶梯的政治后果层是空的（只有财政/户口机械后果）；`tm-keju-reform-*` 是最成熟的「带后果改革」但**跨阶层赢家/输家维度完全缺失**（只改考试结构/NPC忠诚/全局指标/LLM叙事）。给每个变法 preset 配一张 typed incidence 表。
- 铁律：**没有免费杠杆** = 跨阶层再分配 + 财政Δ（已有 `aiEntry` 确定性 apply）+ 合法性Δ（已有 `triggerHuangweiEvent`）。杠杆与议程（B）咬合：阶层点名索要某杠杆，触怒则生反对运动。

### G. 科举守恒上行流（个体登科 = 人口格子迁移）
- 一个寒门 NPC 殿试登科（gongming 个体事件）**同时** = 人口格子「寒门 −1 / 士绅 +1」（守恒）。
- 配额（科举名额，杠杆 F）做 throttle：名额窄 → 上行受阻 → 士人格子激进（B）↑（范进式怨望）。放宽 → 泄压但稀释士绅身份 + 优免财政代价。

---

## 四、分阶段（每阶段标"接哪个现有模块"）

- **第一阶段 · 闭环地基**：A（SoL 期望落差，升级 foundation 基线）+ B（`radicalFrac` 蓄水池）+ C 的农户民变数值后果（接 mobility 守恒流 + huji 硬效果）+ C 的 LLM 督抚奏报（接已有 `classifyPlayerOperation`）。这四件让「物质→激进→民变→朝廷决断→物质」闭环转起来，顺手把满意度 bug 的根（缺期望/缺蓄水）补掉。
- **第二阶段 · 牙齿与现生**：C 的阶层差异化造反 + 流寇升级阶梯；D 合法性 clout 加权读模型（接既有失威/民变级联，**不动皇威**）；E 描述符 schema + 现生管线（让 autogen 阶层全自动）。
- **第三阶段 · 加深**：F 改革杠杆 typed-incidence 抽象；G 科举守恒上行流；SoL 驱动项加深（粮价微观、兼并存量动力学已部分在 mobility）。

---

## 五、与现有设计/铁律的关系

- **物质基底 = `renli-yaoyi-design`**：它管「丁/役/农/税基/兵源」的物理层（且自带死亡螺旋发动机、变法阶梯）。本案的 A（SoL）**消费它的输出**（役负/抛荒/税基），不重算。两文档是「物质层 ⊕ 阶层政治层」。
- **个体层 = `gongming-system-design`**：管角色出身/政绩/优免。G 把它接成人口流。账不混（个体 vs 人口格子）。
- **已落地地基 = `class-party-overhaul-2026-06`**：foundation/总闸/议程/地域分账/党派对账。本案在其上叠 A/B，不推倒。
- **CLAUDE.md 铁律**：引擎层全部跨朝代通用（描述符标签、SoL 公式、杠杆 incidence 框架都是通用的）；辽饷/矿税/东林/一条鞭法是**剧本层实例**。UI chrome 用朝代中立词。

---

## 六、已核实 / 待定

1. **皇威/合法性现状**（D）✅ 已核实（2026-06-16 双 agent 实查）：**皇威=自由变量**（`adjustHuangwei` 事件直写，且故意关掉被动漂移）；**民心=阶层满意度的派生聚合**（已落地，人口加权）；**死亡螺旋/级联已全建**（失威/权臣/民变三套 + game-over）。→ D 大幅缩小为「clout 加权读模型 + 复用既有级联」，**不动皇威**。详 §三D。
2. **改革杠杆现状**（F）✅ 已核实：typed incidence 表**已有但 orphaned**（`EDICT_TYPES.affectedClasses` 仅供预览）；标签路由器 `inferClassImpacts` 已在；缺的是接上 apply + 统一路由。→ F 为「抽象既有 + 补路由」，**非新建**。详 §三F。
3. 已拍板（前几轮）：现生管线**主标+对账兜底两者都要**（E）；词表**开放+地板+待补账**（E）；地域颗粒**要**（B/C 落地域格子）；民变**LLM+数值都做**（C）；难度**硬核**（既有死亡螺旋已难逆转）。

> 落地纪律（项目铁律）：一刀一事、改前 `.bak`、node/smoke 验、swap-test 证伪、**整套完工前不 ship 不 commit**。满意度重构走影子模式（派生与存值并算记背离）→ 逐通道改写输入 → 翻读取 → 闸降级断言。

---

## 七、开刀前置 · 接缝与集成约束（2026-06-16 勘察实录）

动刀前实读 A/B/C 落点代码，校正三处与构想的偏差，记下必须先解决的接缝。

### 7.1 满意度阶层 ≠ 人口格子：靠 1:多 关键词 resolver 搭桥
- **满意度**在 `GM.classes`（数组·一把有名社会阶层：name/satisfaction/influence/economicRole/regionalVariants/_agenda/_satLedger/_satBudget…），`tm-social-foundation.js` 每回合 tick。
- **人口 mouths**在 `GM.population.byClass`（更细键：gentry_high/gentry_low/peasant_self/peasant_tenant/bianhu/merchant/military/debased…），`tm-class-mobility.js` 跑守恒流（兼并→破产→流民）。
- 桥 = `tm-class-engine.js:119 resolvePopulationKeys(cls)`：优先 `cls.populationKeys` 显式键 → 名字索引 → **硬编码关键词图**（士绅→gentry_high+low / 农→peasant_self+bianhu / 佃→peasant_tenant…）→ 兜底 `[名字]` → `[]`。**1:多、关键词制**。
- **当前 mobility 与满意度脱钩**：`tm-class-mobility.js` 只读 `landAnnexation.concentration` / `fiscal._peasantBurdenAvg`，**不读阶层满意度**。所以 B/C 的真正活 = 把这两套耦合起来。

### 7.2 三处决定（已拍 / 必修）
1. **乱民比例（B）挂 `GM.classes`**（拍板）——紧贴满意度、直接吃 A 的 gap，A→B 零摩擦；只有 C 经 resolver 把 radicalFrac 摊到 1:多 人口格子驱动流民外流。
2. **现生阶层必须有人口格子（命门·必修）**——autogen 现生表外阶层时 resolver 大概率落兜底 `[名字]`，而 `population.byClass` 无此键 = 无 mouths = B/C 守恒流算不出。**§E 描述符管线必须额外：现生时绑 `populationKeys` + 建人口格子**，否则「现生阶层全自动插进民变引擎」是空头。
3. **统一走 `populationKeys` 显式键**（种子预填 / 现生绑定），关键词只当兜底——根治 resolver 的关键词误配老毛病。

### 7.3 调整后的开刀顺序（去风险）
A（纯 `GM.classes`·不碰接缝）→ B（radicalFrac 挂 `GM.classes`·出数不接人口）→ C（跨接缝：radicalFrac 经 resolver 摊到人口格子 + 民变事件 + huji 硬效果；命门 7.2.② 须先解决）。

### 7.4 已落地 · 第一刀 A：不对称缓变 ✅（2026-06-16 · 未 ship 未 commit）
- 改 `tm-social-foundation.js`：新增 `asymDrift(gap, baseCap)` 助手，`tickClassDrift`(:289) 与 `tickClassRegional`(:372) 的对称 `×0.12/±cap` 换成**不对称**——恶化向（gap<0）rate 0.18/cap×1.6（快），回升向（gap>0）rate 0.08/cap×0.75（慢）。复用既有 `(基线−sat)` gap，纯 `GM.classes` 侧、不碰接缝。
- 验：`smoke-social-foundation` **69/0**（新增 4b 不对称专项：同 |gap| 恶化-1.8 vs 回升+0.8·比率≥1.8×；line 70 旧对称契约**有意更新**）；全 class/social/minxin/party/renli smoke 套件**全绿 0 失败**。`.bak-asymdrift-20260616`。
- 注：`_satExpect` 独立期望锚（A 可选第二步）暂缓——勘察发现 `sat` 追 `基线` 的 lag 本身已是粗糙的「现值−习惯值」，不对称已捕获核心动态；独立锚留作后续精修。

### 7.5 已落地 · 第二刀 B：乱民比例蓄水池 ✅（2026-06-16 · 未 ship 未 commit）
- 改 `tm-social-foundation.js`：新增 `tickClassRadical`（+ `agendaUrgencyLoad`），tick 每回合（drift 后）算 `cls._radicalFrac`（0..1）=「低满意度均衡 + 急性恶化（读 `cls._lastDrift` 本回合骤跌）+ 政治边缘化（未得偿高急议程·AI 槽不计）」加权压力，向目标**快激进（≤0.12/回合）/ 慢平复（≤0.04/回合）**移动；首回合按满意度播种（苦难阶层非 0）。透明字段 `cls._radicalPressure` 挂账供 UI/prompt；`tickClassDrift` 顺带存 `cls._lastDrift` 作急性信号。纯 `GM.classes` 侧，出数不接人口。
- 验：新 `smoke-class-radical-fraction` **12/0**（均衡慢平复 / 危局快升 / 不对称 / 急性 change-matters / 播种 / 夹[0,1] / AI 槽不计 / tick 集成）；`smoke-social-foundation` 仍 **69/0**；全 class/social/minxin/party/renli 套件**退出码全 0**。`.bak-radicalfrac-20260616`。
- 注：`_radicalFrac` 现为**全国级**；地域级乱民（每变体一个）与「其党在野」政治边缘化留待 C/D；radicalFrac→人口流民外流是第三刀 C 的跨接缝活（须先解 §7.2.② 现生人口格子命门）。

### 7.6 已落地 · 乱民喂 prompt（B 的可见收益）✅（2026-06-16 · 未 ship 未 commit）
- 把 `_radicalFrac` 注入主推演【阶层正册】**两处构建器**（`tm-endturn-ai-context.js` 活路径 + `tm-endturn-prompt.js` 死分支——历史曾漏迁一处致回归，故必同步）：阶层行在 `·态:` 后增 `·乱民N成(不稳/汹汹/鼎沸)`，仅 `radicalFrac≥0.2` 才显（安康阶层不扰）；图例补「乱民=激进民情(汹涌则近民变)」。程度词朝代中立。LLM 朝廷据此可叙事乱情、酝酿民变奏报。
- 实样：`- 农户·满意28·影响15·势位22·乱民5成(汹汹)·求:减役`。
- 验：`smoke-class-roster-ai-inject` 扩到 **11/0**（乱民 token 注入 + 阈值守卫只显告急阶层 + 两路径源同步）；`verify-live-playthrough` 11/0；全 class/social/minxin/party/renli/roster 套件**退出码全 0**。`.bak-radicalprompt-20260616`（两文件；prompt 为 CRLF 故走单行内编辑）。
- 注：UI 面（纲纪页签 `phase8-formal-rightrail`）显乱民徽留作后续；这刀只喂 LLM（最高叙事杠杆）。

### 7.7 已落地 · §7.2.② 命门：现生阶层人口格子 ✅（2026-06-16 · 未 ship 未 commit）
- 实查坐实：阶层确会动态现生（AI `class_emerge`·schema `tm-ai-schema.js:127`·prompt `tm-endturn-ai.js:2315`·落地 `tm-endturn-apply.js:2938 GM.classes.push(newC)`），但 newC **无 populationKeys、不建人口格子** → B/C 的人口流对它算不出（命门坐实，非空想）。
- 修：`tm-class-engine.js` 新增导出 `ensureClassPopulationCell(cls, root)`（就近复用 `resolvePopulationKeys`/`parseSizeShare`）：①固化 `cls.populationKeys`（止关键词误配）；②命中既有格子则绑之复用；③否则按 `size` 播种一个专属 `population.byClass` 格子（标 `_emergedCell`）；幂等；无人口模型只固化键不臆造。现生落地点（apply `class_emerge`）push 后即调用。
- 验：新 `smoke-class-emerge-population` **13/0**（关键词复用 / 全新名按 size 播种 40000 / 幂等 / 无人口模型安全 / 显式键优先 / 现生点源契约）；广回归 **53 现行 smoke 退出码全 0**（唯一红 `faction-npc-endturn-e2e` 经证伪=既存假红「npcAiPrecision 默认值」·该 e2e 不加载 apply.js·与本刀无关）。`.bak-emergepop-20260616`（class-engine LF / apply CRLF 走单行内编辑）。
- 注：**这解开了 C 的硬前提**——现生阶层现在有人口格子可供守恒流。第三刀 C（`radicalFrac` 经 resolver 摊到格子 → 流民外流 + 民变事件 + huji 硬效果）现可动手。

### 7.8 已落地 · 第三刀 C 之 C1：radicalFrac 驱动起义态机 ✅（2026-06-16 · 未 ship 未 commit）
- **C 分解（风险递增）**：**C1** radicalFrac→起义态机（`refreshClassPhase`·纯 GM.classes）→ **C2** radicalFrac→流民外流（mobility·跨接缝·动 `population.byClass`）→ **C3** 民变后果（huji 税基/抛荒硬效果 + LLM 督抚奏报）→ **C4（押后）** 流寇跨省凝聚（军事实体）。
- C1 修：`tm-class-engine.js refreshClassPhase`(:985) 原起义阶梯 calm→brewing→uprising 只看 satisfaction 阈值；增 `_radicalFrac` 作**独立触发**（≥0.6→起义「乱民鼎沸」/≥0.4→酝酿「民情汹汹」）。蓄水池满则起义，即便瞬时满意度未到阈——政治蓄水跨回合记忆 grievance。纯增量、纯 `GM.classes` 侧、无人口 mutation。
- **回归安全**：无 `_radicalFrac` 的旧阶层 `Number(undefined)||0=0` → 退回原 satisfaction 阈值行为，零影响。
- 验：新 `smoke-class-radical-revolt` **10/0**（乱民驱 uprising/brewing + 无乱民退回旧 sat 行为 + 边界 + 源契约）；`smoke-class-engine` 82/0；广回归 **55 现行 smoke 退出码全 0**。`.bak-radicalrevolt-20260616`。

### 7.9 已落地 · C2：radicalFrac→流民外流（跨接缝·首动人口存量）✅（2026-06-16 · 未 ship 未 commit）
- 改 `tm-class-mobility.js`：新增 `_tickRadicalFlight(ctx, mr)`（挂 `PhaseF3.tick`·try 包裹同既有风格）。乱民比例 ≥0.4 的阶层经 `populationKeys`（§7.2.② 固化）/ `resolvePopulationKeys` 找源人口格子，按 `(rf-0.4)×0.012`（封顶 0.8%/回合·×monthRatio）向 `byLegalStatus.taoohu`（逃户）**守恒外流**——每个逃户都是从生产格子流出的真人口（经济牙齿的人口底）。挂账 `cls._fledMouths/_fledTurn` 供 C3/UI。
- 这是 C 链**首刀动 `population.byClass` 存量**（跨 GM.classes↔population 接缝），靠 §7.2.② 的 populationKeys 桥；无 populationKeys 则关键词 resolver 回退；无源格子/逃户缺失皆安全（lazy 建逃户保守恒）。
- 验：新 `smoke-class-radical-flight` **12/0**（守恒总数不变 / 率∝rf 封顶 / 低乱民不失血 / 无源格子安全 / 逃户自动建 / 关键词回退 / 源契约）；广回归 **63 现行 smoke 退出码全 0**（含 mobility/huji）。`.bak-radicalflight-20260616`。
- 注：C2 只做人口外流（substrate）；其税基/抛荒财政后果 + LLM 督抚奏报由 C3 接 huji 硬效果落地。

### 7.10 已落地 · C3：流民的财政后果 + 督抚奏报 ✅（2026-06-16 · 未 ship 未 commit）
- 实查定案：huji `applyFiscalHardEffect`(:574) 的 `fugitivePressure`/`hiddenPressure` 直接压 `collectionMultiplier`（税基），且读 `population.hiddenCount`（既有豪强路 `_tickMagnateAnnexation` 正靠写它喂 huji）。
- C3 修（`tm-class-mobility.js _tickRadicalFlight`）：流民外流时**同步 `population.hiddenCount += flee`** → huji fugitive/hidden 压力↑ → 税基↓（同豪强路机制·precedented）；起义阶层（C1 phase=uprising）且失血 ≥200 时 `addEB('民变','…流民载道…税基亏折')` 入邸报（玩家可见+史册）。LLM 叙事面：`态:uprising·乱民N成` 早已在阶层正册喂 LLM（§7.6 prompt 刀），C3 补邸报督抚奏报 salience。
- 验：`smoke-class-radical-flight` 扩到 **16/0**（C3 增：hiddenCount 财政 += flee / 起义阶层流民载道入邸报 / 非起义静默 / 源契约）；广回归 **63 现行 smoke 全 0**（含 mobility/huji）。`.bak-radicalfiscal-20260616`。
- 注：fiscal 经 huji `Math.max(既有 hidden)` 聚合——剧本区域隐口已极大则边际被淹（方向正确·量级随剧本）。**C4（流寇跨省凝聚军事实体）仍押后。**

### 7.11 已落地 · §三D：合法性 clout 加权读模型 ✅（2026-06-16 · 未 ship 未 commit）
- 实查定案：`GM.minxin.trueIndex` 是**人口加权**（`tm-integration-bridge.js:615`），阶层满意度已喂民心（`tm-class-minxin-bridge`）；死亡螺旋/级联（失威/权臣/民变）早已全建。真 delta = **clout 加权**（Vic3：缙绅作乱 ≫ 等量农户）+ **不动刻意自由的皇威**。
- D 修（`tm-social-foundation.js`）：新增 `computeLegitimacy(GM)`（tick 末调用·存 `GM._legitimacy`）——clout 加权满意度 = Σ(sat × influence × 阶等权)/Σclout（治理2.2/军1.6/教1.2/商1.1/农1.0），对照人口加权 `minxin.trueIndex` 出背离旗标（≤-12「缙绅离心」/≥+12「民怨上达」/否则「相安」）。**纯只读派生**，不写皇威/民心。两正册构建器 surface「〔天命权重〕权贵满意(clout)X vs 民心(人口)Y·旗标」喂 LLM。
- 验：新 `smoke-class-legitimacy` **10/0**（缙绅离心/民怨上达/相安 + 权重非均值[clout88·sat0 勋贵主导→10.2] + tick 集成 + 两正册 surface 契约）；roster smoke 11/0（surface 不破既有）；广回归 **65 现行 smoke 全 0**。`.bak-legitimacy-20260616`（foundation + 两 prompt）。
- 注：D 现为**读模型只喂 LLM**；接入既有失威/民变级联阈值（让 clout 加权真正驱动死亡螺旋）留作 D2。

### 7.12 已落地 · 死亡螺旋闭合：士绅离心（墙头草）+ 合法性计忠诚 ✅（2026-06-16 · 未 ship 未 commit）
- 集成验证（§八）暴露的缺口：**庶民反而权贵未痛，死亡螺旋差「士绅离心」那一脚**。
- 修（`tm-social-foundation.js`·2 处紧耦合）：① `tickClassRadical` 增**墙头草项**——皇威（`GM.huangwei.index`）<45（王朝可见倾危）时激进加速，按 clout 阶等权放大（治理桶最烈、农最弱）=树倒猢狲散/缙绅通敌降；② `computeLegitimacy` 忠诚改为 `satisfaction − radicalFrac×60`——乱民化的权贵纵满意度尚可亦不忠，拖低 clout 加权合法性，士绅离心在此现形。
- 闭环：（既有 authority 引擎）民变→皇威↓ → 皇威坍 → 权贵墙头草离心(radicalFrac↑) → 忠诚↓ → clout 加权合法性↓ → **缙绅离心** →（士绅 uprising/失血→更多民变/财政→皇威更低）正反馈死亡螺旋。
- 验：集成台加**死亡螺旋闭合相**（皇威坍到 8 后连跑 8 回合）→ `verify-class-chain-integration` **13/0**：士绅乱民 0.1→0.5、态 calm→brewing、clout 加权合法性 **40.96→22.29**、旗标 相安→**缙绅离心**、正册 surface；`smoke-class-radical-fraction` 15/0（墙头草）、`smoke-class-legitimacy` 12/0（乱民拉低忠诚）；广回归 **69 现行 smoke 全 0**。`.bak-bandwagon-20260616`。
- 注：墙头草读既有 `huangwei`（民变已反哺它）；clout 加权合法性直接驱动 authority 失威/失国判定（D2）仍可深化；flag 阈值/loyalty 系数为可调首版。

### 7.13 已落地 · D2：clout 加权合法性接失威危机级联（缙绅离心提速）✅（2026-06-16 · 未 ship 未 commit）
- 接 §三D delta② 的悬置项：D 建的 `GM._legitimacy`（clout 加权读模型）此前**只喂 LLM**、不驱动任何级联。D2 把它接到既有失威危机 tick，让 clout 加权信号**真正驱动死亡螺旋**。
- 实查定案（四路勘察核实 + 亲验行号）：`tm-authority-complete.js _tickLostAuthorityCrisis`(:745) 是最安全钩子——gated 在皇威危机态（`lostAuthorityCrisis.active`·皇威<30 激活），每回合加速「抗疏频次 / 地方合规流失 / 外邦蠢动」三项，**完全不读 minxin**；而人口加权民变线 `_tickRevoltUpgrade`(:258 读 `div.minxin`) 与之正交。故在此加 clout 加权信号**不与人口加权民变双计**、**不碰刻意自由写的皇威**。
- D2 修（`tm-authority-complete.js`·1 处·LF）：tick 内新增 `_escMult`——`GM._legitimacy.flag==='缙绅离心'`（clout 加权远低于人口加权·缙绅/督抚离心）时按离心深度 `1+min(0.6,(pop−clout)/40)` 放大三项恶化增量（封顶 +60%）。缙绅即督抚胥吏之身，他们离心则地方观望加剧、外邦窥伺、抗疏频发——失威危机本就是「号令不出京师」，缙绅离心正是其加速器。
- 闭环补全：（既有）民变→皇威↓→失威危机激活；（D2 新）士绅/权贵乱民化→clout 加权合法性崩→缙绅离心旗标→**失威危机提速**→督抚更怠、外邦更骄→朝廷更难弹压民变→正反馈死亡螺旋。
- 验：新 `smoke-d2-legitimacy-cascade` **14/0**（缙绅离心 1.6× 提速合规流失/外邦/抗疏 + 按深度分级 gap12→1.3× + 封顶 + 民怨上达不误加速 + 脏数据 gap≤0 守卫 + **swap-test 无 _legitimacy 退回基线·回归安全** + **不碰皇威** + 不活跃 no-op + 源契约）；authority 回归 **10 套全绿**（f1/linkage-effects/linkage-matrix485/epsilon/huangwei/revolt-local/ai-revolt-gate + class-legitimacy/radical-revolt/radical-fraction）；真 bundle 活体 **12/0**（authority-complete 全量载入无碍）；集成台 **13/0**。`.bak-d2legitcascade-20260616`。
- 注：D2 用 flag 门控 + 离心深度分级（首版可调）；权臣篡位 `controlLevel` / 民变升级概率等更多阈值可后续深化，但失威危机是 clout 加权信号语义最贴合的落点（缙绅=督抚=号令载体）。

### 7.14 已落地 · §三G：科举守恒上行流（寒门受阻→士人激进 + 守恒人口流）✅（2026-06-16 · 未 ship 未 commit）
- 接 §三G：个体登科 = 人口格子守恒迁移 + 名额 throttle→士人激进（范进式怨望）。
- 实查定案（亲读 keju 结案码 + 阶层谱）：`tm-keju-runtime.js finishKeju`(:3126·LF) 是科举定义性结案点（置 `currentExam=null`·toast 圆满结束·已有 `stats.classRatio`→阶层满意度块），`results`/`stats`/`GM`/`P` 全在作用域。阶层谱：`士大夫`(50万·含生员秀才·科举上行通道之身)、`缙绅`(300万·乡绅终点)、`自耕农`(3000万·"科举资格虽实难"·寒门源)。`resolvePopulationKeys` 实查：自耕→`peasant_self/bianhu`，但士大夫/缙绅**不匹配 `士绅` 关键词**→无 gentry 格子；且真剧本未定义 `population.byClass`。
- G 修（2 文件·均 LF）：
  - **G-core（teeth·纯 GM.classes）**：新 `_kejuMobilityFlow(exam,stats,results)` 读 `stats.classRatio` 寒门占比（键含 寒/庶/平民/布衣/自耕/农/贫）判通道开放度；占比 <30% = 避途被门阀把持→士大夫 `_aspirationBlock`↑（线性·封顶 0.45），占比宽则泄压（−0.15）。`tm-social-foundation.js tickClassRadical` 增第⑤项 `aspirationComp`（读 `_aspirationBlock`·入 pressure·封顶 0.5）+ 逐回合自衰减 0.04（不被新一科再塞则消退）——受阻怨望经 B 引擎快激进/慢平复转成 radicalFrac，跨回合记忆 grievance。
  - **G-flow（守恒·best-effort）**：寒门登科者按占比估算（round(results.length×占比)），自耕→士绅人口格子守恒迁移（每进士擢升其门户 ×8·封顶 2% 源格子）；经 `resolvePopulationKeys` 找源/目标（缙绅/士大夫·兜底 `gentry_low/high` 常见键），**仅当两格子已存在才移·不创建·无则 no-op**（真剧本未定义 byClass·此半多为待命·teeth 不依赖它）。
- 回归安全：无 `_aspirationBlock` 旧阶层 `aspirationComp=0`→零影响；无 classRatio/无人口格子皆 no-op。朝代中立（读阶层名/占比·不写死专名）。
- 验：新 `smoke-keju-mobility-flow` **17/0**（Part A 真模块：受阻抬 radicalFrac 0.06→0.22 + 衰减 0.04 + **无字段回归安全**；Part B 真函数抽取：寒门塞→怨望 0.3 + 邸报「士林怨望渐深」+ 通道宽泄压 + **守恒上行流 −64/+64 总数不变** + 无格子 no-op + 无 classRatio 全 no-op + 源契约）；B 层回归全绿（radical-fraction 15/revolt 10/flight 16/legitimacy 12/foundation 69/d2 14）；keju/gongming 回归全绿（gongming-engine 61/consequence 8/production 15/keju-guoku 9/hl 37/specialexam 43）；真 bundle 活体 **12/0**；集成台 **13/0**。`.bak-keju-g-20260616`（foundation + keju-runtime）。
- 注：G-flow 量级象征性（〔小〕·真量级随剧本人口模型）；teeth 在 G-core 受阻怨望。名额 `P.keju.quotaPerExam` 作显式 throttle 杠杆可后续接（现以寒门占比作动态「通道开放度」代理）。

### 7.15 已落地 · §三C·C4：流寇跨省凝聚（民变→流寇军事实体的升级阶梯）✅（2026-06-16 · 未 ship 未 commit）
- 接 §三C 押后项：民变→流寇军事实体。实查定案（亲读 PhaseF3 + 双勘察）：`tm-class-mobility.js PhaseF3.tick`(:387·LF) 编排链，`_tickRadicalFlight`(C2/C3) 已产出 `byLegalStatus.taoohu`（逃户·守恒）+ hiddenCount 底；`GM.armies` 是扁平军队数组（**无既有流寇实体**·rebellionRisk 仅概率指标）；区域邻接在 `mapData.regions[].neighbors`；既有 `mx.revolts`（5级·区域·game-over）由 minxin 驱动、与 radicalFrac 链正交（我的 C 链不 spawn 它·羁縻叛乱是独立路径）。
- 架构决策：流寇取**独立 `GM.rovingRebels[]` 实体**（非扩 mx.revolts·不碰 game-over 级联·隔离风险）；因 radicalFrac/逃户现为**全国级**（§7.5 注），C4 做**全国蓄水凝聚**（起义阶层在场 + 逃户池≥5万 → 逃户守恒入伙），起义低满意省份 best-effort 标记 `regions`（跨省 flavor）。**真·区域邻接凝聚待 radicalFrac 地域化**（诚实记档·非空头）。
- C4 修（`tm-class-mobility.js`·LF·纯增量）：新 `_tickRovingCoalesce`（挂 tick·_tickRadicalFlight 后）——逃户守恒凝成流寇·不喂新血则自溃散 −10%/回合（守恒回逃户）·势穷(<5000)瓦解；新 API `suppressRovingRebel(force)`（斩首者离籍=人口净减·溃散者守恒回逃户·耗军饷扣国库·战损）+ `pacifyRovingRebel`（招抚守恒回编户`huangji`/军户`byClass.military`·开恶例 `_amnestyPrecedent` 记账·**不擅动刻意自由的皇威**）。三 API 导出 PhaseF3 供 UI/AI/诏令后续接。
- 守恒不变量：凝聚/溃散/招抚全守恒（逃户↔流寇↔编户/军户）；镇压人口净减=斩首数（其余守恒）——镇压杀人是设计真相，非 bug。
- 验：新 `smoke-class-roving-coalesce` **21/0**（凝聚守恒 + 跨省省份标记[陕西非江南] + 无血溃散守恒 + 镇压斩首/溃散/军饷扣库 + 续剿瓦解 + 招抚守恒回编户/军户 + 开恶例 + 小池/无起义不凝聚 + 源契约）；mobility/huji 回归全绿（radical-flight 16/revolt 10/emerge 13/huji×6）；**集成台扩到 17/0**（+C4 端到端相：苛政链产逃户 335518→起义→流寇凝聚 53682→招抚守恒回编户）；真 bundle 活体 **13/0**（+C4 三 API 在全 310 脚本在位·6 回合连跑不抛）。`.bak-c4roving-20260616`。
- 注：C4 现为 ground-truth 层（凝聚/溃散自动·镇压/招抚 API 待 UI/AI/诏令 wiring·同 C2/C3「先 substrate 后 UX」节奏）；接既有 battle 引擎精细镇压、连 mx.revolts/game-over、prompt 喂 LLM 流寇威胁皆可后续深化。

### 7.16 已落地 · §三F：改革杠杆 typed-incidence（接 orphaned EDICT_TYPES.affectedClasses）✅（2026-06-16 · 未 ship 未 commit）
- 接 §三F「专门一 pass」：把 18 类诏令的 `EDICT_TYPES.affectedClasses`（跨阶层赢家/输家向量·此前 **100% orphaned**·仅 generateEdictForecast 预览）接到 apply。
- 双计风险勘察定案（四路勘察实证）：三条改阶层满意度路径——① AI `class_changes`（tm-class-engine applyTurn·AI 推演路径）② huji 硬效果桥（fiscal/corvee/military·参数变即发·硬编码农户/军户/编户）③ inferClassImpacts（仅当诏令喂 signal·当前未发生）。
- **去重策略（三重保险）**：① **仅玩家诏令路径**（`processEdictEffects` 尾）调用——与 AI class_changes（AI 路径）**天然分离**，玩家诏令无同回合 AI class_changes 竞争；② 全程走 `gateSatisfaction`（±14/回合/阶层预算）——与 huji 硬效果若重叠（税/役/兵诏令）由**总闸自动夹**组合位移上界（实测双道加派被夹至 −14）；③ source 记账 `edict-typed-incidence:type` 入 `_satLedger` 可审计。
- F 修（2 文件·均 LF·纯增量）：`tm-edict-lifecycle.js` 新 `applyEdictTypedIncidence(root,text,opts)` + `_EDICT_CLASS_MATCH` 标签路由图——`classifyEdict` 定类型→`affectedClasses` 按标签路由匹配真 GM.classes（含现生阶层）→ 经 gateSatisfaction 落地（×0.5 不独占预算）。**仅阶层类键**（农民/官僚/士绅/豪强/商贾/军/士人/士林/寒门/宗室）；**非阶层键跳过**（国库/皇权/民心/囚犯/党派/外藩/地方/朝野）；**盲 fallback 不施**（无关键词命中→默认 amnesty→跳过防误砸）；**按类取最大绝对值 delta**（防粗键重叠 e.g. 士绅+豪强 同砸缙绅 → −25 非 −45）；**无总闸则不施**（守纪律·不绕闸直写）。`tm-endturn-edict.js processEdictEffects` 尾挂调用。
- 验：新 `smoke-edict-typed-incidence` **16/0**（标签路由命中真阶层 + 非阶层键跳过 + **盲 fallback 不施** + **±14 闸夹双计上界** + max-abs 防叠加 + source 记账 + 仅玩家路径 + 无闸不施）；edict 回归全绿（decree-whole 16/parser-layered 47/institution/office-reform/p5-gamma 61…·codemod-edict-archive-lazy 既存 rc=1 经 swap-test 证 .bak 同样 = 已应用 codemod·非回归）；真 bundle 活体 **13/0**；集成台 **17/0**；阶层信号闸 smoke 11/0。`.bak-f-typedincidence-20260616`（两文件）。
- 注：F 为玩家诏令的跨阶层政治后果层；AI 诏令仍由 AI class_changes 主理（不双砸）；resistance（实施阻力）属诏令效力层、未在此用；变法 preset typed-incidence（renli/keju 变法的赢家/输家维度）可后续按同范式补。

### 7.17 已落地 · §三E：描述符 schema 多标签 + 现生对账管线（确定性兜底层）✅（2026-06-16 · 未 ship 未 commit）
- 接 §三E：economicRole（三分简版）扩成多标签描述符，让现生阶层零引擎代码插进 A/B/C 驱动。
- 实查定案（亲读 foundation 暴露度系统）：`classExposure`(:123) 按 `bucketOf` 五桶（治理 tax0.15/农 0.8…）派生税/灾/战/饷暴露，`economicIndicators.taxBurden` 覆盖；tick 主循环(:544) 每回合 per-class 跑 drift/radical/regional。
- E 修（2 文件·foundation LF / apply CRLF 单行）：
  - **描述符 schema**：`cls.descriptor = {stratum, economicBase, fiscalStatus, unrestArchetype}`。`stratum`（上/中/下）**唯一强制闭合字段**（保底地板·非法值纠正）；其余三栏**开放词表**。
  - **确定性对账兜底**（`reconcileClassDescriptor`）：从 economicRole/name/privileges/influence 派生缺栏；**主标 sticky**——AI/种子给的 `cls.descriptor` 标签被尊重（含表外原词·只补缺）；幂等（`_reconciled` 守卫）。
  - **开放词表 + 待补账**：开放栏 novel 标签（表外）入 `GM._descriptorLedger`（field/tag/count/firstClass·高频者后续升格配专属驱动）。
  - **驱动规则（头牌）**：`classExposure` 接 `descriptor.fiscalStatus`——优免→tax 暴露夹至 0.05（加派 incidence≈0）、法外→0.1、受饷→欠饷暴露拉满。**「负担挤到编户」自动涌现**（实测加派 1.5× 下编户基线 35.8 ≪ 优免 59.88）。
  - **现生/种子 reconcile**：tick 懒对账（首遇即固化·sticky）覆盖种子阶层；现生（apply class_emerge·紧随 ensureClassPopulationCell）即对账→现生表外阶层（盐枭/教民）自动得 stratum/fiscalStatus → 自动插进 SoL/暴露度/民变引擎（§E「零引擎代码即插入」兑现）。
- 验：新 `smoke-class-descriptor-reconcile` **17/0**（四类阶层确定性对账 + 主标 sticky 尊重表外原词「盐课专营」+ **stratum 强制闭合纠正非法值** + 待补账 + **优免 tax≈0/负担挤编户** + 加派基线分化 + tick 懒对账 + 幂等 + 现生契约）；核心 `smoke-social-foundation` **69/0** 无基线回归；class 链全绿；**广扫 class/social/party/minxin/renli 55 smoke 0 fail**；真 bundle 活体 **13/0**；集成台 **17/0**。`.bak-e-descriptor-20260616`（foundation）+ apply 单行。
- 注：deferred 的是 §E「主标」AI 结构化标签 schema/prompt（描述符已 sticky·AI 给则尊重·schema 字段未加）+「硬骨头升 secondary LLM 裁」——确定性对账兜底是 robust 核心、已让现生阶层全自动插入；AI 主标/secondary 是可选增量层（同 C/D「先 ground-truth 后 AI/UX」节奏）。`unrestArchetype` 标签（暴烈/撤离/不合作/哗变）已派生存储·可后续接 C4 流寇凝聚的差异化造反方式。

---

## 八、本会话实现进度（A→B→prompt→§7.2.②→C1→C2→C3 · 2026-06-16）

从「未来构想」一路落到可运行的因果链，全程一刀一事 + .bak + swap-test/smoke + 广回归，**未 ship 未 commit**：

| 刀 | 内容 | 文件 | smoke |
|---|---|---|---|
| A | 满意度不对称缓变（升米恩斗米仇） | tm-social-foundation | smoke-social-foundation 69/0 |
| B | 乱民比例蓄水池 `_radicalFrac` | tm-social-foundation | smoke-class-radical-fraction 12/0 |
| prompt | 乱民喂阶层正册（两构建器） | tm-endturn-ai-context / tm-endturn-prompt | smoke-class-roster-ai-inject 11/0 |
| §7.2.② | 现生阶层人口格子保障 | tm-class-engine / tm-endturn-apply | smoke-class-emerge-population 13/0 |
| C1 | radicalFrac 驱动起义态机 | tm-class-engine | smoke-class-radical-revolt 10/0 |
| C2 | radicalFrac→流民外流（守恒·跨接缝） | tm-class-mobility | smoke-class-radical-flight 16/0 |
| C3 | 流民财政后果（税基↓）+ 督抚奏报 | tm-class-mobility | （并入 flight smoke） |
| D | 合法性 clout 加权读模型（喂 LLM·不动皇威） | tm-social-foundation + 两 prompt | smoke-class-legitimacy 12/0 |
| 闭合 | 死亡螺旋闭合：士绅离心(墙头草)+合法性计忠诚 | tm-social-foundation | 集成台 13/0 + 两 smoke |
| UI | 乱民徽 + 天命权重行（纲纪页签阶层卡/详情·喂玩家） | phase8-formal-rightrail | 真 bundle 载入 + 19 phase8 smoke 回归 |
| D2 | clout 加权合法性接失威危机级联（缙绅离心提速·不碰皇威） | tm-authority-complete | smoke-d2-legitimacy-cascade 14/0 |
| G | 科举守恒上行流（寒门受阻→士人激进 + 守恒人口流） | tm-keju-runtime + tm-social-foundation | smoke-keju-mobility-flow 17/0 |
| C4 | 流寇跨省凝聚（民变→军事实体·凝聚/溃散/镇压/招抚·守恒） | tm-class-mobility | smoke-class-roving-coalesce 21/0 |
| F | 改革杠杆 typed-incidence（接 orphaned 表·玩家路径·闸夹防双计） | tm-edict-lifecycle + tm-endturn-edict | smoke-edict-typed-incidence 16/0 |
| E | 描述符 schema 多标签 + 现生对账（确定性兜底·开放词表·驱动规则） | tm-social-foundation + tm-endturn-apply | smoke-class-descriptor-reconcile 17/0 |

**现在通的链**：物质 SoL 恶化（A 不对称）→ 乱民蓄水上涨（B）→ 起义态机点燃（C1）+ 人口向逃户失血（C2）→ 税基亏折（C3·huji）+ 邸报督抚奏报（C3）+ 阶层正册喂 LLM 叙事（prompt）。现生阶层亦全程在册（§7.2.②）。

**集成验证（2026-06-16·`verify-class-chain-integration.js` 9/0）**：八刀真函数按真实回合序（SF.tick[drift→radical→legitimacy] → refreshClassPhase → PhaseF3._tickRadicalFlight）在苛政剧本连跑 8 回合，整条链如期涌现、组装无序 bug、总人口守恒：自耕农满意 56→43、乱民 0.1→0.7、态 calm→brewing→uprising（第5回合）、逃户/隐口 0→75910、督抚奏报触发、天命权重「民怨上达」（士绅高 clout 未崩→clout 加权 54 高于民心 40，正确指出「庶民反而权贵未痛」）。**这是 node 集成验证（确定性·验组装顺序），非浏览器+AI 真推演。** 涌现观察：死亡螺旋要真转，尚差「士绅离心」（gentry defection）那一脚——**已于 §7.12 建成并验证**（皇威坍→士绅墙头草离心→缙绅离心→正反馈闭合，集成台死亡螺旋闭合相 13/0）。
**真 bundle 活体验证（2026-06-16·`verify-class-chain-live.js` 12/0）**：headless 真启动整 bundle（按 index.html 顺序载入 **310/310** 脚本）→ 用真实加载顺序里的真全局（SF.tick / refreshClassPhase / PhaseF3._tickRadicalFlight / computeLegitimacy）驱动整条链 6 回合。验：**6 改动文件全 bundle 载入无错 + 真全局接线 + 全代码在场时整条链组装无异常**，真 bundle 正册实样喂 LLM。比集成台强一档（抓加载/接线/全局碰撞）。**捕获一处仅真 bundle 才暴露的集成问题**：C3 的 addEB 调用走到真 addEB（写 `GM.evtLog`）→ 定性为测试 GM 不全的 artifact（真 play `evtLog` 开局即建·C3 与所有 addEB 调用同 guard·**真 play 安全**），补测试 GM 后 12/0。**仍非浏览器+AI 真推演**（AI 非确定·待 owner 侧实跑）。

**UI（2026-06-16·`phase8-formal-rightrail`）**：纲纪页签阶层卡（列表 + 详情）在「满意/趋势/承压徽」后增 **乱民N成·不稳/汹汹/鼎沸** 徽（`_radicalFrac≥0.2` 才显·复用既有 `tmrp-trend` CSS·不碰 styles.css），详情卡加「**天命权重** 权贵满意(clout) / 民心(人口) · 旗标」行。玩家与 LLM（正册）现在看同一套乱民/合法性信号。验：真 bundle 载入无误 + 19 phase8/rightrail smoke 回归全绿；**playwright 实机截图已确认（2026-06-16）**——真浏览器(msedge)开局→纲纪页签：阶层卡渲出「乱民5成·汹汹 / 乱民4成·汹汹 / 乱民3成·不稳 / 乱民2成·不稳」徽，详情卡渲出「天命权重 / 缙绅离心」行，布局完好（`_pw-scratch/ui-radical-00-class-list.png` / `ui-radical-01-class-detail.png`·DOM 文本断言 hasRadical/hasTianming/缙绅离心 全 true）。

**未竟（皆可选增量层·§三 A–G 主体已成 + UI 已实机确认）**：§三 E 的「主标」AI 结构化标签 schema/prompt + secondary-LLM 裁（确定性对账兜底已覆盖现生插入）；C4 镇压/招抚 UI/AI/诏令 wiring + prompt 喂 LLM 流寇威胁；D2 余级联阈值（权臣篡位 controlLevel/民变升级概率）；G 名额显式 throttle 杠杆；**真浏览器+AI 跑一局**（AI 非确定·owner 侧实跑·非确定性故非自动验证范畴）。

> 进度更新（2026-06-16 续）：D2 / G / C4 / F / E 五刀已落（详 §7.13–7.17）。**§三 七大块 A–G 全部落成。** 集成台扩到 **17/0**（含 C4 端到端相），真 bundle 活体 **13/0**（含 D2/G/C4/F/E 全 bundle 载入 + C4 三 API 在位），广扫 class/social/party/minxin/renli **55 smoke 0 fail**。本会话新增 smoke：d2-legitimacy-cascade 14 / keju-mobility-flow 17 / class-roving-coalesce 21 / edict-typed-incidence 16 / class-descriptor-reconcile 17。**UI playwright 实机截图已确认**（乱民徽 + 天命权重行真浏览器渲染无误）。本地 commit checkpoint `7238f3a`（15 文件·未推 main·web/ 与 GitHub main 分叉 43/454 + fetch 不通待理清）。

---

## 九、增量层（2026-06-16 续 · owner「五道刀全开」· 未 ship 未 commit）

A–G 主体落成后，owner 拍板把五个可选增量层全做。每刀仍一刀一事 + .bak + smoke + 回归。

### 9.1 ② E↔C4 联动：按 unrestArchetype 分化造反方式 ✅
- 接 §三C「下层暴烈(揭竿/流寇)·上层安静而致命(隐田/抗税)」+ §三E 已存的 `descriptor.unrestArchetype`。
- 修（`tm-class-mobility.js _tickRovingCoalesce`·LF）：新 `_isViolentUprising(c)`——只「暴烈/哗变/倒戈」(下层揭竿/军哗变)起义阶层聚流寇；「不合作/撤离/请愿」(上层)走隐田/抗税(已由 C2 flight→hiddenCount 承接)·**不聚流寇**；**无描述符默认计入(回归安全)**。凝聚 gate + 省份标记皆改读它。
- 验：`smoke-class-roving-coalesce` 扩到 **27/0**（+不合作/撤离不聚 + 暴烈/哗变聚 + 无描述符回归）；radical-flight 16/live 13/集成台 17 全绿。`.bak-e2c4arch-20260616`。

### 9.2 ① C4 接进游戏循环（prompt 喂 LLM + AI op 剿/抚）✅
- C4 此前是「半死」：流寇自动凝聚/溃散但 suppress/pacify API 无人调。本刀接通玩家/AI 能动性。
- 修（3 文件）：**(a) prompt**（`tm-endturn-ai-context.js`·LF）阶层正册后增【流寇警报】块（流寇名/众/流窜省 + 告知出 `roving_actions` 剿/抚·只在场才显）；**(b) schema**（`tm-ai-schema.js`·CRLF 单行）加 `roving_actions` 字段；**(c) apply**（`tm-endturn-apply.js`·CRLF 单行避混 EOL）消费器→`PhaseF3.suppressRovingRebel(force)`/`pacifyRovingRebel`（中英 action 皆认）。顺手强化 `_findRoving`：无 ref/未命中→回退首股在编流寇（AI 笼统下令「剿流寇」不给精确 id 亦可执行·对象/命名匹配不变·无回归）。
- 验：新 `smoke-c4-ai-wiring` **13/0**（流寇警报喂 LLM·兵力/省份/roving_actions 提示·已瓦解不喂·无流寇不出块 + apply 真消费器 eval 派发：剿降兵力+扣军饷、抚消编+守恒回编户、脏数据安全 + 三处契约）；C4 27/roster 11/AI·endturn·apply 域 32 真 smoke 全绿/live 13/集成台 17。`.bak-c4wire-20260616`（3 文件）。
- 注：剿用 force 抽象扣国库+战损（未绑具体军队·ground-truth 层·精细接 battle 引擎可后续）；流寇 UI 面板留作后续。

### 9.3 ③ D2 余级联：缙绅离心→权臣坐大加速 ✅
- 接 §7.13 D2（已接失威危机）的余级联：把 clout 离心信号接进**权臣篡位**。
- 修（`tm-authority-complete.js _tickPowerMinister`·LF）：`controlLevel` 累积处加 `_pmLegBoost`——`GM._legitimacy.flag==='缙绅离心'`（权贵弃君）时坐大 +50%（权贵倒向强人）·默认 1·纯读 _legitimacy·**不碰皇权**。与失威危机（地方/外邦）正交、非双计（皆缙绅离心的并行后果）。
- 验：`smoke-d2-legitimacy-cascade` 扩到 **19/0**（+权臣坐大 0.3→0.315 vs 相安 0.31 + swap-test 无 _legitimacy 常速回归 + 源契约）；authority 回归全绿（f1/huangwei/revolt-local/epsilon）。`.bak-d2power-20260616`。

### 9.4 ④ G 名额显式 throttle 杠杆 ✅
- 接 §7.14 G（以寒门占比作通道开放度代理）：补 §三G 的「名额做 throttle」+ 加可调杠杆。实查 `quotaPerExam` 是剧本/编辑器设的静态值（350）·运行时无杠杆。
- 修（2 文件）：**(a) throttle**（`tm-keju-runtime.js _kejuMobilityFlow`·LF）：名额较基线（懒设首见值·向当前缓移=change vs 近期常态）收紧→`qBlock`∝收紧幅度（封顶 0.5）·与寒门避途 `shareBlock` 合成受阻；放宽不加阻。**(b) 杠杆**（`tm-ai-schema.js` + `tm-endturn-apply.js`·CRLF 单行）：AI op `keju_quota_change{value|delta,reason}`→调 `P.keju.quotaPerExam`（夹 50-1500）+ 邸报（收紧「恐激士林怨望」/放宽「稀清流增优免」）。下一科 throttle 据新名额算受阻→闭环。
- 回归安全：无 P/无 quotaPerExam→qBlock 0（既有 G 行为不变）。
- 验：新 `smoke-keju-quota-lever` **13/0**（名额收紧 350→200→受阻 0.19 + 基线懒设 + 放宽泄压 + 无 P 安全 + 杠杆 value/delta 改名额 + 夹 50-1500 + 源契约）；keju 回归全绿（mobility-flow 17/guoku 9/hl 37/gongming 61）。`.bak-keju-quota-20260616`（3 文件）。
- 注：「放宽稀释士绅+优免财政代价」现以邸报点出（实际优免财政影响走 gongming/赋税子系统·未在此量化扣减·避越界双计）。

### 9.5 ⑤ E 主标：AI 现生时提供 descriptor 标签 ✅
- 接 §7.17 E（确定性对账兜底已成）：补 §三E「主标+对账兜底两者都要」的**主标**——让 AI 现生阶层时直接给描述符标签。
- 修（3 文件）：**(a) apply**（`tm-endturn-apply.js`·CRLF）class_emerge 构造 newC 时透传 `ce.descriptor`→`newC.descriptor`（reconciler 已 sticky 尊重·含表外原词·补缺·非法 stratum 纠正）；**(b) schema**（`tm-ai-schema.js`）class_emerge desc 列描述符词表；**(c) prompt**（`tm-endturn-ai.js`·CRLF）class_emerge 模板内联 `descriptor:{stratum,fiscalStatus,unrestArchetype}` 示例词表（因 schema desc 喂 prompt 截 60 字·故词表直接进模板）。
- 验：新 `smoke-class-descriptor-ai-tags` **9/0**（AI 主标尊重表外原词「盐课专营」+ 缺栏补全 + 入待补账 + 无主标确定性派生 + 非法 stratum 纠正 + apply/schema/prompt 三处契约）；descriptor-reconcile 17/0 回归。`.bak-e5aimaobiao-20260616`。
- 注：「secondary-LLM 裁硬骨头」初判 ROI 低暂缓 → **owner 拍板后已补**（详 §9.7）·只对罕见表外 novel 标签触发以化解 ROI。

### 9.6 C4 流寇 UI 面板（军务面板「流寇警报」卡）✅（2026-06-16·b 续）
- 接 ①：C4 此前只在邸报/prompt 可见·界面不可见。补军务边防面板「流寇警报」卡，让流寇成玩家可见的威胁。
- 修（`phase8-formal-rightrail.js renderArmy`·LF）：新 `rightRovingCard()`——读 `GM.rovingRebels`·显在场流寇名/众/流窜省/势头（燎原≥10万·势盛≥3万·啸聚<3万）·仅有活贼才显（同军情预警 hot 卡范式·复用 `tmrp-card`·**不碰 styles.css**）·插于军情预警后、部队名册前。
- 验：新 `smoke-c4-roving-ui` **12/0**（渲名/众/流窜/势头分级 + 已散/零众排除 + 无贼返空回归 + 注入契约）；phase8/formal/military 域 **19 smoke 0 fail**；真 bundle 13/0；**playwright 实机截图确认**（军务面板渲出「流寇警报·陕北流寇 众135000 流窜陕西/山西/河南·燎原」·`_pw-scratch/ui-roving-army-panel.png`·DOM 断言 hasAlert/hasName/hasRegions/hasTier 全 true）。`.bak-c4ui-20260616`。

### 9.7 ⑤ 续 · secondary-LLM 裁硬骨头（owner 拍板补·2026-06-17）✅
- 上轮我判 ROI 低暂缓·owner 拍板要做。以「只对罕见硬骨头触发」化解 ROI 顾虑：仅现生阶层带**表外 novel 标签**（确定性归一不了的）才升 secondary-LLM。
- 修（2 文件·foundation LF / apply CRLF）：
  - **foundation（可测纯逻辑）**：`reconcileClassDescriptor` 遇表外 novel 标签（且未裁过）置 `descriptor._needsAdjudication`；新 `applyAdjudicatedDescriptor(cls,parsed)`——采用 LLM 归一的通用词表为 canonical（表外原词存 `_raw_*`·开放词表「留原词」）·非法值不采用（保确定性兜底）·置 `_adjudicated` 止重裁·导出。
  - **apply（AI 调用·照辅臣拟议/奏疏代拟 范式）**：class_emerge reconcile 后若 `_needsAdjudication`→fire-and-forget `callAI(...,'secondary',{priority:'low',timeoutMs:40000,maxRetries:1})` 求归一 JSON→`applyAdjudicatedDescriptor` 落地→邸报【定性】。失败/空/非法保确定性兜底·decoupled 不阻主流程。
- 验：新 `smoke-class-descriptor-adjudicate` **13/0**（novel→_needsAdjudication·全通用不待裁·归一「盐课专营→法外」drive 可用·留原词 _raw_*·非法兜底·**_adjudicated 防反复调 AI**·apply secondary 契约 + foundation 导出契约）；descriptor-reconcile 17/ai-tags 9/emerge 13/foundation 69 回归全绿；ai/endturn/class/social 域 **61 smoke 0 fail**；真 bundle 13/0；集成台 17/0。`.bak-e5secondary-20260616`（2 文件）。
- ROI 化解：仅表外 novel 标签触发（现生本罕见·novel 更罕见）·`_adjudicated` 守卫防同一阶层反复调·fire-and-forget 不阻主流程·失败有确定性兜底。**§三E「主标 + 对账兜底 + 硬骨头 secondary 裁」三件套全齐。**

### 9.8 radicalFrac 地域化（per-region 乱民 + C4 真热区跨省凝聚）· 第二轮增量「4」✅（2026-06-17）
- 接 §7.5/§7.15 注的悬置项「radicalFrac 现全国级·真区域邻接凝聚待地域化」。本刀把乱民蓄水池地域化（最深的一刀·动核心 radical 引擎·owner 知其高成本而选）。
- 修（2 文件·均 LF）：
  - **per-region radicalFrac**（`tm-social-foundation.js tickClassRegional`）：每 regionalVariant 算独立 `_radicalFrac`（本地满意度 satComp + 急性骤跌 `_lastDrift` 驱动·快激进≤0.12/慢平复≤0.04·同 national 动力学·不含 agenda/bandwagon 全局项）。national `cls._radicalFrac` 仍由 `tickClassRadical` 独算·**保持不变**（C1/C2/D/prompt 全依赖·零回归）——地域化是**附加分辨率**。
  - **C4 真热区凝聚**（`tm-class-mobility.js _tickRovingCoalesce`）：拆出 `_isViolentArchetype`；收集**热区**（暴烈类 per-region rf≥0.5 地域·按乱民排序）；触发/recruit 按 `max(全国暴烈起义数, 热区数)`（愈多省糜烂愈盛·cap 0.3→0.35）；区域标记取**真热区**（非 best-effort 满意度猜测）·≥2 热区即「跨省连结」（邸报点名）；无热区回退既有 national + best-effort（回归安全）。archetype 门控贯穿地域层（不合作类的热区不聚流寇·走隐田）。
- 验：新 `smoke-class-radical-regional` **10/0**（苛政地域乱民 > 安稳地域 + change-matters 急跌抬升 + 慢平复 + national 仍在场 + 夹[0,1]）；`smoke-class-roving-coalesce` 扩到 **32/0**（+地域热区触发/真热区标记排序/非热区排除/不合作类地域热区不聚）；core+chain 全绿（foundation 69/radical 链/c4-wiring 13）；广扫 class/social/party/minxin/renli **70 smoke 0 fail**；真 bundle 13/0；集成台 17/0。`.bak-regionalrf-20260617`（2 文件）。
- 注：流寇区域现由 per-region 真乱民驱动（大跃进于 best-effort 猜测）·跨省=多热区共燃。**真·地理邻接**（陕西↔山西 经 `mapData.neighbors` 判邻）仍是 further refinement（现以「多热区共燃」近似邻接·不依赖 mapData 桥脆弱的名称匹配）；per-region taoohu（地域逃户池）未拆（全国池守恒不变·避大重构）。这两点是地域化的下一档深化。

---

> **增量层小结（2026-06-16·五道刀全开）**：① C4 接通（prompt+AI op 剿/抚）· ② E↔C4 分化造反 · ③ D2 权臣余级联 · ④ G 名额杠杆 · ⑤ E AI 主标。新增 smoke：c4-ai-wiring 13 / keju-quota-lever 13 / descriptor-ai-tags 9（+ roving-coalesce 21→27、d2-cascade 14→19、keju-mobility 复用）。**全量域回归 144 smoke 0 fail · 真 bundle 13/0 · 集成台 17/0。** 全部 `.bak`、中文零乱码、CRLF/LF 各守、未 ship 未推 main（本地 commit `7238f3a` 之后的增量改动**尚未 commit**·待你定）。
>
> 追加（b 续）：**C4 流寇 UI 面板已落**（§9.6·军务面板流寇警报卡·smoke-c4-roving-ui 12/0 + phase8 域 19/0 + playwright 实拍）+ **⑤ secondary-LLM 裁已补**（§9.7·owner 拍板·smoke-class-descriptor-adjudicate 13/0）。**§三 A–G 主体 + 第一轮增量层（①②③④⑤ + C4 UI + secondary-LLM）皆落成。**
>
> 第二轮增量（owner 选「4」）：**radicalFrac 地域化已落**（§9.8·per-region 乱民 + C4 真热区跨省凝聚·smoke-class-radical-regional 10/0 + roving 扩 32/0 + 广扫 70 smoke 0 fail）。乱民蓄水池现地域化、流寇由真热区驱动跨省。剩可选深化：真地理邻接(mapData.neighbors)、per-region 逃户池、民变→朝廷决断闭环、C4→game-over、SoL 期望 EMA 锚。唯一 owner 侧验证：真浏览器+AI 跑一局。
