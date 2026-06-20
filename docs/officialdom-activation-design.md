# 天命 · 官制活化 详细设计（v0.1 草案）

> 状态：草案，待 owner 过目。2026-06-19 起。
> 决定（owner 已拍板）：**改制形态 = AI 裁定式·硬核**（官僚体系会抵抗、改制要时间与代价）；**起步 = 先出详设/PoC 再定开工序**。
> 命门对齐：本工程是把「AI 在玩家自由下给硬核可信回应」落到官制域。
> 跨朝代铁律：引擎只碰**抽象层**，专名（东厂/内阁/票拟/锦衣卫…）只进**剧本**与**AI 叙事**，绝不进引擎。

---

## 1. 诊断（grep 核对版）

天命的官制**已经是个活的「人事系统」，死的是「权力系统」**。

### 活的（远超预期，复用别重造）
| 维度 | 证据 |
|---|---|
| 数据模型极丰 | Position 已带 `powers`(辟署/荐荫/弹劾/监察/征税/调兵 六标志)、`authority`(决策/执行/咨询/监察)、`duties`、`succession`、`publicTreasury`、`hooks` — `tm-office-system.js:32-86` |
| 推演 prompt 深谙官制 | 继任方式/考课每5回合/丁忧/差遣vs寄禄 — `tm-endturn-prompt.js:3244-3405` |
| 改制能结构落地 | `office_changes(reform)` → `tm-endturn-apply.js:3063` 起真 push/filter 改 `officeTree`：增官职 :3353、增部门 :3376、裁撤 :3398、改名 :3403、并部门 :3414 |
| schema 已声明 | `office_changes` action=appoint/dismiss/promote/demote/transfer/evaluate/reform，`consumedBy:['endturn:11115']` — `tm-ai-schema.js:159-164` |
| 任免链完整 | 选择器/三位一体落地/生涯/好感/回合内撤销 — `tm-office-panel.js`、`tm-ai-change-applier.js:243-444` |

### 死的（真正的命门所在）
| 维度 | 证据 |
|---|---|
| `powers`/`authority`/`duties`/`hooks` 推演零消费 | `tm-endturn-prompt.js` 对 `.powers`/职权/`officeDuties`/`hooks` **零引用**（grep 0 命中） |
| `canPerformAction` 是死代码 | `tm-office-system.js:850` 定义、:1318 导出，全工程**无任何真实调用点**（仅 namespace/1 smoke/注释） |
| `hooks` 仅编辑器 | `triggerOnLowTreasury` 等只现于 `editor-*.js` 与 help，运行时零消费 |
| 任免不改能力 | 任免只改 `officialTitle` + `publicTreasury.binding`，不动 ability/loyalty/任何派生；执行力公式 `tm-endturn-prompt.js:170` 不含官职 |

**一句话**：人事会动，但「**这个官有什么权 → 所以能/不能造成什么影响**」这根神经整条没接。`duties` 是装饰文字，`powers` 是没插头的开关，`canPerformAction` 是没接线的闸门。

### 架构异味：双表示
官制结构有**两条并存通道**，须在 Slice 4 收口：
- `office_changes`(reform) → `endturn:11115` → **改 `officeTree`**（部门/官职树，真相源）
- `institution_changes` → `ai-change-applier:structured-policy` → EdictParser 官制桥 → `registerDynamicInstitution`（`tm-edict-parser.js:1773`）→ **`dynamicInstitutions[]`**（轻量机构表）

旁证可参照的孪生系统：`admin_division_updates`（行政区划树，同样 add/remove/rename/merge/split/reform 词汇，`consumedBy:['endturn:12009']`）；可挂的确定性效果引擎：`reform_effects`（`{type,complianceDelta,rateDelta,corruptionDelta}`，`consumedBy:['ai-change-applier:3081']`）。

---

## 2. 核心架构：职权→行为桥

```
┌─────────────────────────────────────────────────────────┐
│  机械脊柱（跨朝代通用·引擎）                                  │
│  · 抽象权力词汇 powers × authority 档                        │
│  · 行动类 → 权力 映射表                                       │
│  · 履职度 dutyState（运行时状态）                             │
│  · 失职 → 通用域效果（挂 reform_effects 引擎）                 │
└───────────────┬─────────────────────────────────────────┘
                │  喂入 / 门控 / 衰减
                ▼
┌─────────────────────────────────────────────────────────┐
│  AI 血肉（本朝代·可信叙事与裁决）                              │
│  · 推演读职权舆图 + 履职度 → 演出可信后果                      │
│  · 改制裁定：权臣抵抗、要时间代价（owner 钦定硬核）              │
└─────────────────────────────────────────────────────────┘
                │  专名只在此层与剧本出现
                ▼
        剧本：哪个官署挂哪个抽象权力（东厂=监察+缉事…）
```

设计准绳：**机械只设地板与压力，AI 填可信纹理**。既非纯公式模拟（会假、会违跨朝代铁律），也非纯 LLM（不硬核、不可追溯）。这正是天命的招牌混合体。

### 2.1 权力词汇（抽象层）
v1 沿用现有 6 个 `powers` 标志，**不新造专名**：

| power | 含义（抽象） | 典型域 |
|---|---|---|
| `taxCollect` | 征课/加派/定税制 | 财政 |
| `militaryCommand` | 调兵/出征/募防 | 军事 |
| `appointment` | 辟署/任免属员 | 人事 |
| `impeach` | 弹劾/纠参 | 监察 |
| `supervise` | 考课/稽查/纠察 | 监察 |
| `yinBu` | 荐举/荫补 | 人事 |

正交的 `authority` 档**调制权力如何作用**（已存字段，复用）：
- `decision` 决策：可**发起/裁定**该类行动（票拟、定策）
- `execution` 执行：可**落实**（实征、实调）
- `advisory` 咨询：仅可**建言/对策**（上奏，不能径行）
- `supervision` 监察：可**稽核/纠弹/封驳**（事前否决或事后追究）

> 扩展位（v2 按需，data 加 key 即可，不改引擎逻辑）：`judicial`(刑狱)、`works`(营造)、`ritual`(礼/祭祀)、`diplomacy`(邦交)、`drafting`(票拟/封驳)。v1 不做，缺口（如刑狱）显式记在 §7。

### 2.2 行动类 → 权力 映射表（引擎·抽象）
把推演已有的结构化动作通道映射到所需 (power, 最低档)。**键是抽象行动类，不是专名**：

| 行动类（来源 schema 字段） | 所需 power · 最低档 |
|---|---|
| 加赋/加派/改税制（`central_local_actions`、税相关） | `taxCollect` · decision |
| 实征/起运存留（`central_local_actions` 执行段） | `taxCollect` · execution |
| 调兵/出征/调防（军事动作） | `militaryCommand` · decision/execution |
| 辟署/任免属员（`office_changes:appoint`） | `appointment` · decision |
| 弹劾/纠参（叙事或 `office_changes` 触发） | `impeach` · supervision |
| 考课/稽查（`office_changes:evaluate`） | `supervise` · supervision |
| 荐举/荫补（`gongming_grants:menyin` 等） | `yinBu` · decision |

> 此表是**唯一新增的"硬表"**，且全为抽象类，跨朝代干净。具体字段名在 Slice 3 实装时对齐 `tm-ai-schema.js`。

### 2.3 履职度 dutyState（运行时·引擎）
挂在每个**主官/掌权官职**上（非每个 position 都挂，控规模）：
```js
position._dutyState = {
  fulfillment: 0..100,          // 履职度
  domain: 'fiscal'|'military'|'supervision'|'personnel'|'justice'|'works'|'general',
  backlog: [{ item: '九边饷未筹', sinceTurn: 12 }],  // 职责积压（从 duties/functions 派生，AI 可增删）
  lastTendedTurn: 14,
  trend: 'rising'|'stable'|'falling'
}
```
- `domain` 由 `group`/`powers` 推断，复用现有分类器（`tm-office-runtime.js:46-71` 的正则模式），**跨朝代通用**。
- 序列化随 GM 存档；缺省惰性初始化（不破坏旧档）。

### 2.4 失职 → 通用域效果（引擎，挂确定性引擎）
每回合通用更新（无专名）：
- 官职**出缺/被裁** → `fulfillment` 快速衰减。
- **在任** → `Δ = f(才 ability, 忠 loyalty, 廉 integrity, 负荷)`；才忠廉高则进、低则滞/退。
- `fulfillment` 跌破阈值 → 触发**通用域效果**，落到既有全局量（**impl 时对齐真实变量名**，不新造朝代变量）：

| domain | 失职后果（通用） | 落点（待 impl 钉名） |
|---|---|---|
| fiscal | 税收实收↓、调度迟滞 | 走 `reform_effects.rateDelta`/税压 |
| supervision | 腐败抬头 | `reform_effects.corruptionDelta` |
| military | 军备/动员↓ | 军事相关全局量 |
| personnel | 铨政滞、冗官/缺员积压 | 政务效率/合规 `complianceDelta` |
| justice/works | （v2）治安↓/工程停 | 预留 |

> 关键：效果只设**地板与方向**；具体多大、怎么演，喂给 AI 由推演定。避免把模拟做"死"。

### 2.5 分层归属表（跨朝代铁律落实——本表是红线）
| 内容 | 引擎 | 剧本 | AI 推演 |
|---|---|---|---|
| 抽象 powers/authority 词汇 | ✅ | | |
| 行动类→权力 映射表 | ✅ | | |
| 履职度结构与通用衰减 | ✅ | | |
| 哪个官署挂哪个权力 | | ✅ | |
| 专名语义（东厂缉事/内阁票拟） | | ✅ | ✅ |
| 出缺/越权/失职的**可信后果叙事** | | | ✅ |
| 改制能否落地·权臣如何抵抗 | | | ✅ |

---

## 3. 四刀分期

每刀均：**独立开关 · 独立可发 · node 自测 · 默认关 · 跨朝代干净**。推荐序 ①→②→③→④（每刀让下一刀更有意义；④的树改写已存在，缺的是裁定与抵抗）。

### Slice ① 职权感知注入（楔子·最软·零回归）
**目标**：让推演与势力决策"看见"每官的职权/履职/才忠/出缺，立刻在**叙事**里活。纯 prompt 工程（呼应①最软打法）。

**数据流**：`buildOfficePowerMap(GM)`（新，纯读）→ 注入 `tm-endturn-prompt.js` 的 sysP；→ 注入势力 `decideFor` 感知段（`tm-faction-npc-llm-decision.js`，复用 `_pushSection` 模式）。

**PoC 草图**（示意，非最终）：
```js
// tm-office-powermap.js (新)
function buildOfficePowerMap(GM, opts){
  const cap = (opts&&opts.cap) || 12;
  const rows = [];
  walkOfficeTree(GM.officeTree, (dept, pos) => {
    const hasPower = pos.powers && Object.values(pos.powers).some(Boolean);
    const isHead = /尚书|都御史|大学士|卿|总督|巡抚|首辅/.test(pos.name); // 仅作"是否主官"启发，非专名语义
    if (!hasPower && !isHead) return;
    const h = resolveHolder(GM, pos);           // 在任者或"出缺N回合"
    const pw = formatPowers(pos.powers, pos.authority); // 权[征税·决策][辟署]
    const ds = pos._dutyState;                  // 履职58↓(积欠:…) —— Slice②前先留空
    rows.push(`· ${dept.name}·${pos.name} — ${h} — ${pw}${ds?(' — '+fmtDuty(ds)):''}`);
  });
  rows.sort(byPowerWeight).splice(cap);          // 成本纪律：只列掌权/主官，封顶
  return '【职权舆图】(才/忠/廉百分制)\n' + rows.join('\n');
}
```
喂入示意：
```
【职权舆图】(才/忠/廉百分制)
· 户部·尚书 — 李某(才82 忠60 廉40) — 权[征税·决策][辟署] — 履职58↓(积欠:九边饷未筹)
· 都察院·左都御史 — 出缺3回合 — 权[监察·纠弹] — 失职(纠弹停摆)
· 兵部·尚书 — 王某(才45 忠88 廉70) — 权[调兵·执行] — 履职71
```
**schema**：无新增（纯输入）。
**开关**：`officePowerPerceptionEnabled`（默认关）。
**node 自测**：powermap 文本生成/封顶/出缺标注/才忠廉拼装；开关关=prompt 零差异（零回归铁证）。
**成本**：每回合 prompt +N 行，**封顶 cap≤12**，呼应成本审计纪律。
**命门**：AI 立刻能可信推理"户部尚书贪而怠、九边饷无人筹"。
**可发**：独立，先 live 验"叙事是否真的引用职权"再决定深做。

### Slice ② 履职度 + 失职衰减
**目标**：把 §2.3/§2.4 落地，"真正履职"成真。
**数据流**：回合推演前/后 `tickDutyState(GM)`（新）更新 `_dutyState`；衰减→既有 `reform_effects`/全局量；履职度回灌 Slice① 的 powermap（叙事可见）；UI 在官制面板显示"履职/失职"。
**schema**：可选 `duty_updates`（AI 增删 backlog 项），或纯引擎不开放 AI 写。
**开关**：`officeDutyStateEnabled`（默认关）。
**node 自测**：出缺快衰/才忠廉高进、低退/阈值触发域效果/旧档惰性初始化不崩。
**跨朝代**：domain 由分类器推断，效果落通用全局量，无专名。
**风险**：把模拟做"死"——靠"只设地板、AI 填纹理"规避；衰减幅度保守、可调。

### Slice ③ 权限门控（接活 canPerformAction）
**目标**：§2.2 落地，"真实权限并造成影响"成真——任对人到对官**真的有用**。
**数据流**：在 `office_changes`/财政/军事等结构化动作**落账前**插一道门：`gateAction(GM, actor, actionClass)` → 复用并修活 `canPerformAction`（`tm-office-system.js:850`）→ 返回 `{effectiveness, route, costs, resistance}`：
- 皇帝径行但走中旨/内降 → 合法性代价；
- 掌权且才忠廉高 → 满效；低 → 降效/阳奉阴违/贪墨；
- 越权但有合格官署在 → 强制经其手（其忠诚/能力决定成败）；
- 权力出缺（裁撤/空缺）→ 阻断或高代价走偏门（**"废户部→财政瘫"的兑现点**）。
**消费点**：`tm-endturn-apply.js`(office_changes 落账) 与 `ai-change-applier:structured-policy`(央地/制度) 前置。
**schema**：无新增字段；门控产出经 `edict_feedback`/事件回流叙事。
**开关**：`officeAuthorityGateEnabled`（默认关）。
**node 自测**：六类行动各一例（满效/降效/越权改道/出缺阻断/皇帝中旨代价）；开关关=旧路径零变。
**风险/回归**：最硬、触面最广 → 默认关 + 每动作类**失败回落原路径**（仿 [[势力 tool-calling]] 的"每失败回落原单发"防呆）。
**命门**：硬核可信的核心兑现。

### Slice ④ AI 裁定式改制闭环（owner 钦定）+ 双表示收口
**目标**：自由改官制真正闭环，且**硬核**——改制要过 AI 裁定、遭权臣抵抗、付代价。结构树改写已存在（`tm-endturn-apply.js:3063`），本刀补的是**裁定 + 抵抗 + 可见 + 收口双表示**，不是树改写本身。

**时序**（详见 §5）：
1. 玩家下诏改制 / 用改制按钮（现有 `_offReformToEdict`）→ 进入 **`_pendingReform` 拟制态**（UI 可见"拟制中"，officeTree 暂不动）。
2. 推演回合：AI 裁定，喂入 (拟改内容、受影响权力的现掌权者及其利害、朝局/势力 posture)。
3. AI 返 verdict：准/驳/打折/拖延 + 抵抗事件(弹劾/封驳/拖延/阳奉阴违) + 代价(政治资本/合法性/动荡)。
4. 仅"准(可部分)"才走现有 `office_changes(reform)` 落账改树；驳/拖则拟制留滞或消亡，附叙事。
5. 抵抗接 [[tianming-faction-agent]]/[[tianming-faction-diplomacy]]：权臣/部门作为势力或个体抵抗。

**双表示收口**：officeTree 定为结构**唯一真相源**；`institution_changes`/`dynamicInstitutions` 仅留给**非官署制度**（货币/科举等）；官署类 reform 一律走 officeTree。加一层桥/迁移，老数据兼容。
**schema**：复用 `office_changes(reform)`、`restructurePlan[]`；裁定结果走 `edict_feedback`。可加 `reformVerdict` 子字段。
**开关**：`officeReformAdjudicationEnabled`（默认关）。
**node 自测**：拟制态进出/准驳打折三分支/抵抗事件生成/双表示无重复落账/旧档兼容。
**命门**：硬核×自由的最强戏——"我要废丞相"不是点一下就成，是一场博弈。

---

## 4. 开关与设置面板
沿用现有 `xxxEnabled` 命名与 🧪 实验勾选模式：
- `officePowerPerceptionEnabled` / `officeDutyStateEnabled` / `officeAuthorityGateEnabled` / `officeReformAdjudicationEnabled`
- 可选组闸 `officeActivationEnabled`（一键开四刀，`||` 独立开关，仿 [[tianming-agent-master-switch]] 的总闸模式）。
- 归入 `tm-office-flags.js`（新）或并入现有 flags；设置面板加"官制活化(实验)"组。

## 5. AI 裁定式改制 时序（细化）
```
玩家诏令/改制钮
      │ _offReformToEdict（现有）
      ▼
GM._pendingReform[] ← {dept,position,action,reformDetail,restructurePlan,proposedTurn}
      │  UI:"拟制中·待廷议裁定"（可撤）
      ▼  下一回合推演
喂 AI：拟改内容 + 受影响权力现掌者(才/忠/利害) + 朝局posture + 史实顾问(可选)
      ▼
AI verdict: approve | partial | reject | delay
  ├─ approve/partial → office_changes(reform) → tm-endturn-apply:3063 改 officeTree
  │                     + 代价落账（政治资本/合法性/动荡）
  ├─ reject → 拟制消亡 + 抵抗叙事（权臣弹劾/封驳）
  └─ delay → 留滞 _pendingReform，积压计时
      ▼
edict_feedback / 事件 → 玩家可见裁断与抵抗
```

## 6. 风险登记册
| 风险 | 缓解 |
|---|---|
| prompt 膨胀/成本 | powermap 封顶 cap≤12；履职段精简；呼应 [[tianming-ai-cost-audit-2026-06]] |
| 回归（人事/财政既有链） | 全默认关；Slice③ 每动作类失败回落原路径；开关关=零差异 node 断言 |
| 过度机械化杀可信度 | 机械只设地板，AI 填纹理；衰减保守可调 |
| 跨朝代泄漏（违铁律） | §2.5 分层表为红线；引擎只碰抽象；专名进剧本/AI |
| 双表示重复落账 | Slice④ 收口，officeTree 唯一真相源 + 去重断言 |
| AI 不吐 office_changes（间接路不可靠） | Slice① 先让 AI"看见"提升相关性；prompt 强约束"玩家诏令提及增设/裁撤→必出 reform 动作"（现已有 :3327） |

## 7. 已知缺口（v1 不做，显式记账）
- 权力词汇 v1 仅 6 项，刑狱/营造/礼/邦交/票拟封驳缺位 → v2 扩 key。
- 履职度仅挂主官/掌权职，佐贰/胥吏不建模。
- domain→全局量的精确变量名待 impl 钉定（本文标"待 impl 钉名"处）。

## 8. 开工序建议与验收口径
- **建议序**：①（楔子，验价值）→②（履职）→③（权限门）→④（裁定闭环）。
- 若想"自由感"先到：可把 ④ 的**拟制态+裁定 UX** 提前薄做（树改写已在），但其行为牙齿仍依赖 ①③。
- **每刀验收**：node 自测全绿 + 开关关零回归断言 + 真浏览器 live 验一条龙（呼应推演落地修复的"真机验"纪律）。

## 9. owner 裁示（2026-06-19 落定）
1. **权力词汇：首发就扩**。不止 6 项，纳入 `judicial`(刑狱)/`works`(营造)/`drafting`(票拟封驳) 等。认账：Slice③ 门控表首发须覆盖这些 domain；剧本须 author"每官挂哪权"（接国师工坊 AI 辅助 author——现实测 142 官职 power 标志仅填 ~20 处，连 6 权都没填满）。
2. **履职度：开放 AI 写 backlog**。分工=**引擎管数**（履职度分值确定性算：才忠廉+时间）+**AI 管料**（backlog 内容本朝代叙事）。
3. **组闸：要**。`officeActivationEnabled` 总闸一键开四刀，与四分关 OR（仿 [[agentUpgradesEnabled]]）。
4. **双表示收口：取 (b) 划界**。officeTree 管衙门；dynamicInstitutions 只留非衙门制度（货币/科举/赋役）；官署类 reform 不再走它。

## 10. 关键细化（认可后坐实）

### 10.1 "怎么喂"——四层过滤（实测：天启七年剧本 **142 官职**，带实权标志仅 **~20 处 ≈ 十几官**）
1. **过滤**：只留"带 power 或主官" → 142 → ~15，砍 90%。
2. **分层**：衙门级一行概览（全部顶层衙门·~8 行·便宜）+ 职位级详情仅给本回合相关/异常者（cap≤10）。
3. **相关度排序+封顶**：相关度 = 本回合事件/诏令触及的权力域 + 异常态（出缺/失职/才忠廉极端）。复用势力 agent 的"3 固定+5 动态相关度"激活策略（`tm-faction-npc-in-turn-driver.js`）。
4. **规模兜底**：超大官僚转按需取数 tool-call（复用 `tm-faction-decision-tools.js`），舆图变可查询工具。

结果：喂入恒定 ~18 行，**不随官数线性涨**。两层示例：
```
〔衙门概览〕户部·健全 ┊ 兵部·弱(尚书才45) ┊ 都察院·瘫(出缺3回合) ┊ 内阁·健全 …
〔本回合相关〕(边警→兵部上浮·墨吏案→都察院上浮)
· 兵部·尚书 王某(才45 忠88 廉70) 权[调兵·执行] 履职71
· 都察院·左都御史 出缺3回合 权[监察·纠弹] 失职(纠弹停摆)
```

### 10.2 两条防"死字段"铁律
- **power 活的充要条件 = gate 表里有行动类需要它**。不准加一个没有对应被门控行动类的 power。实现一个 power=①data 加 flag ②gate 表加它门控的行动类 ③schema 确保 AI 吐该行动类 ④gate 按掌权者 才忠廉×履职度 路由效果。
- **dutyState 不准先于其消费者落地**。消费者须同刀具名落地：①Slice② 域效果的状态量（履职度即驱动变量·带时间惯性）②Slice③ 门控效率输入（才忠廉×履职度）③Slice①/④ 叙事锚+改制阻力（瘫痪衙门好裁/健全难裁）。判活死=grep 其消费者。
