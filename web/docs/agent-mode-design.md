# 天命 · 回合推演「agent 模式」(模式 b) 详设

> **状态**：v1 设计稿 · 2026-06-20 · 与 owner 讨论钉死契约后产出 · **未开工**
> **定位**：天命第二条回合引擎。与现有 LLM 管线(模式 a)**完全平行**，开关门控，默认关。
> **一句话**：让 AI 成为「局内 Claude Code」——按推演结果**主动**改存档任意内容+对应 UI 字段，
>             读写都是全局·只多不少，**根治**「推演说要改、UI/状态没改」。

---

## 0. 北极星对齐

- 命门：**AI 在玩家自由下给硬核可信回应**(硬核×自由·平行宇宙生成器)。
- 模式 b 是命门的**最纯表达**：玩家想怎么动，agent 把后果推理好+**自己改世界**，不再被 schema 束缚、不再被动检测。
- 但「自由」在游玩中受**活引擎**约束(财政/军事/人口在算同一片状态)——这正是它与「剧本 Claude Code(国师)」的根本不同(见 §8)。

---

## 1. 契约：什么变、什么不变(已与 owner 钉死)

模式 b 要能**热插拔**(开关一拨，游戏其余部分察觉不到换了引擎)，所以**两端接口不变，只有中间黑盒变**：

```
  ┌────────── 不变(契约·与全局的接口) ──────────┐
  接收/依据             【运作方式·变·核心】            产出/结果集
  只多不少                                          只多不少(可超集)
  ┌──────────┐   A: prep→sc0-sc28→JSON→applier   ┌──────────┐
  │基线push   │── ───────────────────────────── ─→│A的交付物 │
  │(prep那份) │   B: prep→agent循环·引擎让步·守护写 │全有 + 多 │
  │+按需pull  │      ↑甲案:引擎先算→agent看真数再改↑ │(_turnReport│
  │全局任意   │                                    │ + GM mutate)│
  └──────────┘                                    └──────────┘
       ↑读全局·只多不少              ↑写全局·只多不少
```

| 维度 | 模式 a (LLM) | 模式 b (agent) | 变? |
|---|---|---|---|
| **接收/依据** | prep 收集那份 | **同一份基线 + agent 可主动 pull 全局任意内容** | 不变(只多) |
| **运作方式** | sc0-sc28 固定管线 → JSON → applier 翻译 | **迭代 tool-calling agent 循环·直接守护写** | **全变(核心)** |
| **产出/结果集** | 叙事/摘要/财政/人事/势力/事件/记忆… | **A 的交付物一个不少 + 可超集** | 不变(只多) |
| **顺序** | AI 先 → 引擎(systems)后 | **引擎先算硬核基线 → agent 看真数再覆写(甲案)** | 变 |
| **引擎冲突** | 不存在(各管各) | **agent 写了引擎就让步**(覆写标记·下回合从新值续) | 新增 |
| **产出与应用** | 分离(声明 JSON→翻译落地·会丢) | **焊死**(agent 直接改·报告=实际改动流水账·不可能背离) | 变=治本命根 |
| **启用** | 默认 | **开关门控·关=a 一字不动·二者平行** | — |

### 1.1 为什么这个边界恰好「治本」
A 的病根：叙事/JSON/状态/UI 是**四份各自生产**的东西，靠 applier 勉强对齐 → 「说了改没真改」。
B 把**产出和应用焊死成一件事**：agent 直接改状态，`_turnReport` 是它实际改动的**忠实流水账**，
render 从 `_turnReport` 渲染 → **UI/报告构造上不可能背离状态**。没有翻译器可丢东西。根治。

### 1.2 白捡的两个好处
- **热插拔安全**：B 跑完必然留下一个 a 也能加载的合法存档(产出契约不变)，随时切回 a。
- **可对拍验证**：同一回合分别跑 a/b，diff `_turnReport`/GM 交付物，b 必须覆盖 a 的全部(只多不少的自动校验)。

---

## 2. 真实接入点(已核实·非凭记忆)

| 接入点 | 位置 | B 怎么用 |
|---|---|---|
| 回合入口 | `endTurn()` → `_endTurnCore()` → `TM.Endturn.Pipeline.run(ctx)` [tm-endturn-core.js:245/276/342] | 不动入口·在 pipeline 步骤层分叉 |
| **prep 步**(接收/依据) | pipeline step `prep` [tm-endturn-pipeline-steps.js:187] · `_endTurn_init`/`_endTurn_collectInput` [tm-endturn-prep.js] | **B 复用**·拿同一份基线依据 |
| **ai 步**(运作方式) | pipeline step `ai` [steps:324] · sc0-sc28 [tm-endturn-ai.js:563-585] | **B 替换此步**为 agent 循环·a 保留 |
| **systems 步**(引擎) | pipeline step `systems` [steps:475] · 写 `GM.turn++/guoku/neitang/huji/environment` [steps:508] · `global.FiscalEngine` | **甲案:B 让它先跑**(或先跑纯机械部分)给硬核基线 |
| **render 步**(产出消费) | pipeline step `render-and-finalize` [steps:526] | **B 复用**·从 `_turnReport` 渲染 |
| **产出焊缝** | `GM._turnReport`(applier push@tm-ai-change-applier.js:949+·render 读) | B 直接 push·绕开 JSON 中间人 |
| **通用守护写(现成!)** | `aiOutput.changes:[{path,op,value/delta,reason}]` → `_applyPathSet`/`_applyPathPush`/`_applyPathDelta` + `_isPathBlocked` 黑名单 [applier:970+] | **B 的守护写工具直接复用这套**·不是照搬 |
| **AI 网关** | `callAIWithTools` [tm-ai-infra.js] | B 的 agent 循环走这个 |
| **开关基建** | `agentFlagOn(name)` = 总闸 `agentUpgradesEnabled` \|\| 独立开关 [tm-agent-flags.js] | 加 `agentModeEnabled`(实验模式·见 §7) |
| **按需取数范本** | `TM.FactionDecisionTools`(7 工具·formatters 注入·handle async)[tm-faction-decision-tools.js] | B 的只读工具仿此模式·范围扩到全局 |
| **国师工具(参考非照搬)** | `AGENT_TOOLS`(applyEdit/getField/globalSearch/…)[editor-authoring-agent.js] | 借鉴工具形态·但 live/自主/共处引擎(见 §8) |

---

## 3. 运作方式：甲案·单纪律 agent 循环

一个 agent(不是一发大调用)，迭代 tool-calling：

```
1. 接手    ── prep 给的基线依据 + 全局只读工具 + 全局守护写工具 + 覆盖脊柱清单
2. 感知    ── (甲案)先看引擎算好的硬核数字 → 再按需 pull 任何它关心的局面
3. 裁断+落地(多轮循环)──
            推一块 → 直接守护写一块 → 再按需深查 → 再写……
            深浅/顺序 agent 自己定(自由)。每次写即时校验(§5 闸)。
4. 覆盖脊柱 ── 一份「本回合必须交付」清单盯着别漏(§6)；脊柱之外想加什么加什么(超集)
5. 叙述    ── 产出史记/摘要 = 它**实际改动的忠实流水账**(焊死·从 _turnReport 反推·不另写声明)
6. 收尾    ── 状态自检过 → 提交；崩 → 快照回滚(§5)
```

**为什么选甲(单纪律 agent)而非乙(lead+专精子pass)**：
- 最像真 Claude Code、最对照 a、最简、最不像「把管线重造成 agent」(owner 警告的「那一套」影子)。
- 风险=单上下文包圆全回合·深度可能不如 a 的 18 个专精 scene → 靠**按需深查工具**补。
- 演化路径：play-test 若某域深度不够，再让 agent **临时 spawn 子pass**(向乙演化)，而非一开始背固定子流程。

---

## 4. 三件套工具

### 4.1 只读工具(全局·按需·只多不少)
- 范本=`TM.FactionDecisionTools`，范围扩到**整局存档任意内容**。
- 形态:少量「看局面/看某实体/全局检索/查历史先例」工具 + 一个通用 `get_field(path)` 兜底(读任意 GM 路径)。
- 基线(prep 那份)直接喂进首轮 prompt(地板)，深查靠工具(超集)。

### 4.2 守护写工具(全局·自主·复用现成)
- **核心复用** applier 的 `_applyPathSet`/`_applyPathPush`/`_applyPathDelta` + `_isPathBlocked`。
- 形态:通用 `set_field`/`push_field`/`adjust_field`(path 化·任意 GM 字段) + 少量语义糖(任命/调动/发事件…→ 内部仍走通用写+引擎入口)。
- 每次写:① 黑名单拦截 ② clamp/类型校验 ③ 引用完整性 ④ 玩家保护 ⑤ **引擎让步标记**(写引擎域→打标→systems/派生重算见标即跳) ⑥ 成功 push `_turnReport`。
- 这套**就是产出**(写=报告条目)，焊死。

### 4.3 收尾工具
- `finalize_turn`:agent 自报「本回合交付完毕」→ 触发状态自检 → 过则提交、崩则回滚。

---

## 5. 安全架构(命门:硬核可信·自主无审批的兜底)

去掉玩家审批 = 护栏就是命。多层:

1. **每写即校验闸**(4.2 的 ⑥步):黑名单/clamp/引用完整性/玩家保护——**写不进非法状态**。
2. **回合快照**:agent 跑前存(复用现成 `pre_endturn` 快照机制[core.js:302])。
3. **状态自检**:收尾时跑现成 validator(applier 已有保守/激进版数量校验[applier:937-944])。
4. **崩则回滚**:自检不过 → 还原快照 → 可降级到模式 a 重跑该回合(平行的安全网)。
5. **引擎让步而非引擎被破坏**:agent 写引擎域是「覆写」(标记+下回合从新值续)，不是写脏数(甲案=引擎先算好硬核基线·agent 在正确数上改)。
6. **平行兜底**:b 永远只留下合法的、a 也能加载的存档(§1.2)。

---

## 6. 覆盖脊柱(保「只多不少」)

从 a 的产出契约(applier 读的字段)导出「本回合必须考虑/交付」清单，agent 逐项过(可超集、绝不缺):

- 叙事(`narrative`) · 摘要 · 数据变化(`changes` 通用路径)
- 财政(`tax_reforms`/`currency_adjustments` → FiscalEngine) · 人口(`population_adjustments`)
- 人事(`personnel_changes`/`char_updates`/office_assignments) · 制度(`institution_changes`)
- 省份/央地(`province_changes`/`central_local_actions`) · 环境(`environment_actions`)
- 势力(faction priorities/actions/diplomacy) · 事件(`new_events`) · 关系(`relation_changes`) · 记忆/伏笔
- (脊柱即清单·实现时从 applier 字段全表 + sc1-sc28 产出全表机械导出·确保不漏)

---

## 7. 与模式 a 共存(完全平行)

- **开关**:`agentModeEnabled`(标注「实验玩法·agent 模式」)·并入或独立于总闸 `agentUpgradesEnabled`·默认关。
- **分叉点**:pipeline `ai` 步内首行判 `agentFlagOn('agentModeEnabled')`:
  - 关 → 走原 sc0-sc28(**一字不动**)。
  - 开 → 走 agent 循环步;并按甲案确保 `systems` 引擎基线在 agent 前就绪。
- **共享**:prep(接收) + render-and-finalize(产出消费) + `_turnReport` 焊缝 + 快照机制·全复用。
- **设置面板**:实验玩法区加一个 toggle(仿现有 agent 开关 UI)。

---

## 8. 与国师 agent 的根本区别(切忌照搬)

| | 国师(剧本 Claude Code) | 模式 b(存档/游玩 Claude Code) |
|---|---|---|
| 对象 | 静态草稿·离线 | **活的运行中的游戏** |
| 把关 | draft 沙箱 + validate + **玩家审批** | **自主·无审批·靠护栏+回滚兜底** |
| 时机 | 慢慢编·无压力 | 每回合·有成本/延迟(实验模式可接受) |
| 写法 | `makeDraft`/`applyEdit` 绕过运行时副作用 | **直接改运行时 GM·必须触发派生重算/引擎让步** |
| **最大不同** | 凭空造内容·**没有活引擎** | **存档里有确定性引擎在跑同一片状态·必须共处** |
| 产出 | 改好的剧本 | 状态 mutation + 叙事 + UI 刷新(焊死) |

**结论**:可借鉴国师的工具形态(path 化读写/全局检索)，但 live-save/自主/共处引擎三点决定了 b 是另一套实现，不能照搬。

---

## 9. 分期落地(每刀 node 可测·门控默认关·留 .bak)

| Slice | 内容 | 验收 |
|---|---|---|
| **S1** | 骨架:`agentModeEnabled` 开关 + pipeline `ai` 步分叉 + 空 agent 步(开=进新步但仅 log·关=原管线零回归) | node 守卫:关=sc 数不变·开=进分支 |
| **S2** | 只读工具集(全局按需·复用 FactionDecisionTools 范式 + `get_field`) | node:每工具取数正确 |
| **S3** | 守护写工具 + 校验闸(复用 `_applyPathSet`/`_isPathBlocked` + clamp/玩家保护/引擎让步标记) | node:非法写被拦·合法写落 GM+`_turnReport` |
| **S4** | agent 循环 + 覆盖脊柱(感知→多轮裁断落地→叙述→收尾) | node:脊柱全覆盖·`_turnReport` 焊死 |
| **S5** | 甲案引擎先:systems/纯机械引擎在 agent 前就绪 + 引擎让步(见标即跳) + 快照/自检/回滚 | node:引擎域被 agent 写后不被覆盖·崩能回滚 |
| **S6** | 设置面板 toggle + **a/b 对拍验证**(同回合跑两模式·diff 交付物·b⊇a) | 真机:开 b 过一整回合·对拍报告 |

**未决/风险**:
- 单 agent 深度风险(缓解:按需深查工具 + 必要时演化子pass)。
- systems 步现位于 ai 后·甲案需调查「systems 能否/哪些部分能在 agent 前跑」(纯机械 vs 需判断的拆分)——S5 落地前先核实。
- 成本/延迟变大(实验模式·玩家自愿·可接受)。
- **真机玩验是最终瓶颈**(菜单态跑不动整局 endTurn·tool-calling/落地行为只能真机玩)。

---

## 10. 一句话总结
模式 b = **接收只多不少(全局按需读) + 运作方式全变(单纪律 agent 循环·引擎让步) + 产出只多不少(全局自主守护写·焊死=报告) + 完全平行(开关·关=a 不动)**。
这是天命「高自由度·平行宇宙生成器」命门的最纯落子。
