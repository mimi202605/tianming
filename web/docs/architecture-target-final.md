# tianming Architecture Target - Final Aligned

日期·2026-05-03
状态·**Codex draft + Claude draft align 后最终产物**·**待用户确认进入 Phase 1**

来源·

- `web/docs/architecture-target-codex-draft.md` (Codex draft·~510 行)
- `web/docs/architecture-target-claude-draft.md` (Claude draft·~600 行)
- 5 封 dialogue letters (proposal v0 → namespace recon → editor audit-first ack)

**实际 disagree·0 项**·全 align。
---

## 0·用户 Mandate + 2 Critical 诉求

用户原话·

> "现在有一个最大的问题·代码混乱·大文件多·小文件杂·功能不明·导致每次修改完善都更杂乱·解决问题改来改去·维护成本极高·我需要你和codex深度合作·彻底解决这个问题·不惜将现有代码全部重构·全盘推翻"

> "新代码要职责分明·之前你经常理解错各板块的功能"

**2 critical 诉求**·

| # | 诉求 | 落地 |
|---|---|---|
| 1 | 职责清晰·改时一眼知改哪·不重复造 | architecture-map.md (功能→文件) + 模块头注 + 命名规约 |
| 2 | 板块命名 explicit·防 Claude/AI 理解错 | rename 模糊命名·头注 explicit·map.md 双锁 |

---

## 1·Top Principles (Override 一切)

1. **职责清晰**·每文件/ module 单一明确职责·**改功能时一眼知改哪**
2. **命名 explicit**·**防 Claude/AI 理解错**·禁泛名(misc/helpers/patches/v2/v3)
3. **每次重构必可验证**·verify-all + smoke + acceptance 全绿·失败即 revert·非强行 fix
4. **不 patch、不 v2、不 misc**·新代码必入正式 module
5. **先 map·后 move**·**先 smoke·后 delete**·**先 alias·后 namespace**

本次重构最高目标**不是**·"文件变少"或看起来整洁·**而是**·**让继续做游戏不再被代码混乱阻塞**。
---

## 2·Doc 体系 (3 高频文档)

最终保留3 份高频架构docs·每次重构必同步。
### 2.1 `docs/architecture-map.md`

用途·**改功能前先查这里**·

```markdown
| 功能域 | 主文件| 次要文件 | 禁止改到哪里 | 测试/烟测 |
|---|---|---|---|---|
| 回合 AI 推演 | tm-endturn-ai-infer.js | tm-endturn-ai-helpers.js / tm-prompt-composer.js | tm-endturn-render.js | endturn-ai smoke |
| 回合结果展示 | tm-endturn-render.js | tm-endturn-helpers.js | tm-endturn-ai-infer.js | render smoke |
| 朝议 | tm-chaoyi.js | (cleanup 后唯一) | tm-wendui.js / tm-tinyi.js | cc3-smoke |
```

要求·

- 只写 **active** 文件·v2/v3/bak 不应作为目标文件出现
- 每次重构 slice 必同步更新
### 2.2 `docs/module-boundaries.md`

每 module 必答·

- 这个模块负责什么
- 这个模块不负责什么
- 公开 API 是什么
- 依赖谁
- 谁依赖它
- 新功能应加在这里还是别处

### 2.3 `docs/refactor-playbook.md`

执行守则·

- 文件拆分 / 合并 / 改名流程
- patch 归位流程
- v2/v3 清理流程
- 安全验证门槛
- 回滚规则

---

## 3·现状 Facts

- **201 个 .js 文件**·**190,456 行**
- **27 个≥1500 行**·**26 个 <200 项**
- top 5 巨怪·
  - tm-endturn-ai-infer.js·12,591 (runtime 心脏)
  - tm-char-historical-profiles-ext.js·10,298 (纯数据)
  - tm-tinyi-v3.js·3,914
  - tm-chaoyi-v3.js·3,837
  - tm-hongyan-office.js·3,378
- 文件族·editor* 16·tm-endturn-* 9·tm-ai-* 8·tm-char-* 7·tm-guoku-* 5
- 历史堆叠·chaoyi 5 (v1+v2+v2.bak+v3+misc)·patches 2 (tm-patches + tm-phase-c-patches)
- 22 业务域·见 Claude draft §1

---

## 4·Module 目标边界 (按业务域)

### 4.1 朝议 / 廷议 / 问对

| 职责 | active 唯一文件 |
|---|---|
| 朝议主流程(常朝/廷议/御前) | `tm-chaoyi.js` (Phase 3 cleanup·合 v3+v1 入口+v2 留prompts) |
| 廷议 / 弹劾 | `tm-tinyi.js` (rename from v3) |
| 问对 (1v1) | `tm-wendui.js` |
| 诗政 / 御前独召 | `tm-shizheng-panel.js` |

清理·v2.bak delete·misc 535 行**逐项重分**到 office-panel / launch / memorials / storage / map-system / audio-theme

### 4.2 回合结算 (endturn)

| 职责 | active 文件 |
|---|---|
| 回合入口·主管道| `tm-endturn-pipeline.js` (rename from core) |
| AI 推演 (内部 section map first) | `tm-endturn-ai-infer.js` |
| AI prompts 组装 | `tm-prompt-composer.js` (已有) |
| AI 输出应用 | `tm-ai-change-applier.js` |
| 省份/地方结算 | `tm-endturn-province.js` |
| 诏令效果 | `tm-endturn-edict.js` |
| 回合结果展示 | `tm-endturn-render.js` (Claude review at merge) |
| Step 3 系统调度 | `tm-endturn-step3-systems.js` (rename from systems) |
| 通用 helpers | `tm-endturn-shared-utils.js` (rename from helpers·或拆) |

ai-infer 12591 拆 (Phase 3+)·

| 未来文件 | 职责 |
|---|---|
| `tm-endturn-ai-orchestrator.js` | 子调用调度·并行/串行·retry/fallback |
| `tm-endturn-ai-prompts.js` | 各子 prompt 组装 |
| `tm-endturn-ai-context.js` | snapshot·角色选择·约束输入 |
| `tm-endturn-ai-parse.js` | JSON 提取·结构修复 |
| `tm-endturn-ai-validators.js` | 领域 validator |
| `tm-endturn-ai-infer.js` | 薄入口·调度上述|

**Phase 0 / 1·只 mark·不抽**

### 4.3 AI Runtime

| 职责 | 文件 |
|---|---|
| LLM 调度基础设施 | `tm-ai-infra.js` |
| AI 输出 schema | `tm-ai-schema.js` |
| AI 输出应用 | `tm-ai-change-applier.js` |
| Prompt 片段复用 | `tm-prompt-composer.js` |
| 世界/角色 snapshot | `tm-world-snapshot.js` |

规则·新 AI 字段必入 schema·新 prompt 片段优先 composer·禁复制人格 prompt·禁新增临时 JSON 解析、
### 4.4 角色 / NPC

| 职责 | 文件 |
|---|---|
| 角色 schema | `tm-char-full-schema.js` |
| 角色自动生成 | `tm-char-autogen.js` |
| 历史人物 base | `tm-char-historical-profiles.js` |
| 历史人物 ext (待按朝代切·Phase 2) | `tm-char-historical-profiles-ext.js` |
| 人物弧线 | `tm-char-arcs.js` (异步·idle-driven 推演) / `tm-arcs.js` (同步·event-driven 记录) |
| NPC 决策 / engine | `tm-npc-decision.js` / `tm-npc-engine.js` |
| 人物志 UI | `tm-renwu-ui.js` |
| 关系 / 关系图 | `tm-relations.js` / `tm-rel-graph.js` |

### 4.5 编辑器(Phase 1 audit-first)

**editor-game-systems.js (2,449 行) = top-priority audit target**·**Phase 1 audit 决定拆N 文件**·

Phase 0 不lock split count·**仅标 highest-priority 编辑器知识结**

audit 后预期：
| 角色 | 文件 |
|---|---|
| shell / 导航 | `editor.js` |
| 通用 CRUD | `editor-crud.js` |
| schema adapter | `editor-schema-adapter.js` |
| AI 生成 / 多轮 / 全量 | (Phase 1 audit 后定·`editor-ai-*.js`) |
| 业务 form (按域分·N 个 | `editor-form-*.js` (Phase 1 audit 后定 N) |
| engine 常量 | `editor-engine-constants.js` |
| 模型要求 | `editor-model-requirements.js` |

异常·`tm-editor-*` 4 文件 (前缀异常)·**Phase 3 统一 `editor-` 前缀**

### 4.6 财政 / 经济

15 文件·**Phase 3 合并到 ~6 文件**·

| 目标 | 合并源 |
|---|---|
| `tm-fiscal-engine.js` | fiscal-cascade + tax-atomic + fiscal-fixed-expense |
| `tm-fiscal-panel.js` | fiscal-ui |
| `tm-economy-engine.js` | economy + linkage + gap-fill + currency-engine + currency-unit + env-capacity |
| `tm-corruption-engine.js` | corruption-p2 + p4 |
| `tm-guoku-engine.js` | guoku-p2 + p4 + p5 + p6 |
| `tm-guoku-panel.js` | (保留) |
| `tm-neitang-engine.js` | + neitang-p2 |
| `tm-neitang-panel.js` | (保留) |

### 4.7 军事 / 户口 / 官制 / 地方

| 域 | active 文件 | 备注 |
|---|---|---|
| 军事 | `tm-military.js` (Codex own) | + ui (薄) |
| 户口 | `tm-huji-engine.js` + `tm-huji-deep-fill.js` | 边界 clear |
| 官制 | `tm-office-runtime.js` + `tm-office-panel.js` + `tm-office-editor.js` | Phase 3 audit·in-game vs game-editor |
| 科举 | `tm-keju-runtime.js` (3209) | Phase 3 内audit |
| 信房 | `tm-hongyan-office.js` (3378) | **关系不清·Phase 3 deep audit** |
| 策命 | `tm-ceming.js` | |
| 皇权 | `tm-authority-*` 4 文件 + court-meter | Phase 3 audit + cleanup·**phase dump 嫌疑** |
| 行政 | `editor-administration.js` (rename from administration·editor- 前缀) | `tm-central-local-engine.js` + region-enrich + division-deep |

### 4.8 地图

12 文件·**Phase 3 合到 ~6 文件**·

| 目标 | 源 |
|---|---|
| `map-system.js` | tm-map-system rename |
| `map-recognition.js` (strategy) | recognition base + improved + eu4 + borders + fast (5 →1) |
| `map-editor.js` | smart + pro audit 重叠 |
| `map-region-editor.js` | (保留) |
| `map-display.js` + `map-converter.js` + `map-integration.js` | 含 `map-utils.js` |

前缀·**保留 `map-`** (与 editor- 同等子域明示)

### 4.9 法度 / 诏令 / 机制

| 文件 | 职责 |
|---|---|
| `tm-mechanics.js` + `tm-mechanics-world.js` | 机制 |
| `tm-edict-parser.js` | 解析 |
| `tm-edict-thresholds.js` | 阈值 |
| `tm-edict-complete.js` | active·诏令补完 (11 类奏疏触发 + 6 主题问对) |
| `tm-edict-lifecycle.js` | 生命周期 |

### 4.10 世界 / 持久化/ 数据 / 内存 / 玩家 / UI / 编辑器
详见 Claude draft §1.12-1.20·边界相对 clear·**待 Phase 3 微调**

### 4.11 Patches / Phase 文件

| 文件 | tier | Phase 行动 |
|---|---|---|
| `tm-patches.js` (1915·6 段) | 已分 SELF/APPEND/LAYERED | Phase 2-3 按段处理 |
| `tm-phase-c-patches.js` (498) | LAYERED 真monkey patch | Phase 3+·必 5-8 smoke 后合 |
| `tm-phase-f1-fixes.js` (247) | 待audit | Phase 1 audit·SELF/APPEND 决定 |
| `tm-guoku/corruption/neitang -p* 文件` (~3000 总) | 大概率 APPEND | Phase 3 inline engine |

---

## 5·命名政策

### 5.1 禁止新增

- `xxx-v2.js` / `xxx-v3.js` / `xxx.bak`
- `xxx-patches.js` / `xxx-fixes.js` / `xxx-final.js`
- `xxx-misc.js`

例外·临时迁移可短期存在·**必须写入 refactor map·标明删除条件和期限**

### 5.2 前缀策略

| 前缀 | 含义 | 示例 |
|---|---|---|
| `tm-` | 游戏 runtime / engine / data / utils | tm-chaoyi.js |
| `editor-` | scenario editor (editor.html) | editor.js / editor-crud.js |
| `map-` | 地图子域 | map-system.js / map-display.js |

异常·

- `administration.js` →`editor-administration.js` (Phase 2·editor-only)
- `tm-editor-*` 4 → `editor-*` (Phase 3)

### 5.3 Helper / Utils 政策

允许·**必须有明确领域**·

- ✓ `tm-endturn-ai-helpers.js` (域明确)
- ✓ `tm-time-utils.js` (域明确)
- ✗ `tm-chaoyi-misc.js` (misc 无域)
- ✗ `tm-patches.js` (patches 无域)

### 5.4 Patch / Phase 文件分 tier

| Tier | 行动 |
|---|---|
| SELF·独立逻辑 | rename 真实职责名|
| APPEND·并入目标 module | 合并 + delete |
| LAYERED·真 monkey patch | 必 smoke 5-8 后合·或保留 |

不允许只因名字像 patch 就删除。
### 5.5 模块头注模板 (强制·每个 active module)

```js
// ============================================================
// Module: tm-example.js
// Domain: 朝议 / 回合 / 编辑器 / UI / AI runtime / etc
// Owns:
//   - 这个文件负责的功能
// Does not own:
//   - 容易误放到这里、但不属于这里的功能
// Public API:
//   - window.oldName / TM.NewName
// Depends on:
//   - 依赖文件或全局对象
// Used by:
//   - 主要调用方
// Tests:
//   - verify-all / smoke 名称
// Refactor notes:
//   - 是否计划拆分/合并/改名
// ============================================================
```

---

## 6·Namespace Policy

### 6.1 专 concept 层
| concept | Phase | 内容 |
|---|---|---|
| 新代码 namespace rule | **Phase 1 起强制** | 新public API 必`TM.X`·legacy alias 允许且标 |
| 旧代码 namespace migration | **Phase 5/6** | 大迁·alias 期verify all 调用方迁完·alias 退役|

### 6.2 Sub-namespace inventory (18)

| namespace | 含义 |
|---|---|
| `TM.Chaoyi` | 朝议/廷议/御前 |
| `TM.Wendui` | 问对 |
| `TM.Endturn` | endTurn / pipeline |
| `TM.Endturn.AI` | AI 推演 |
| `TM.Military` | 军事 |
| `TM.Fiscal` | 财政 |
| `TM.Huji` | 户口 |
| `TM.Office` | 官制 |
| `TM.Keju` | 科举 |
| `TM.Edict` | 诏令 |
| `TM.NPC` | NPC engine/decision |
| `TM.Char` | 角色 schema/data |
| `TM.Map` | 地图 |
| `TM.UI` | UI 公共 |
| `TM.Save` | 存档 |
| `TM.Editor` | 编辑器|
| `TM.Memory` | 记忆 |
| `TM.Player` | 玩家 |

### 6.3 Alias 5 phases

| Phase | 状态|
|---|---|
| 1 | 新代码强制TM.X·lint check |
| 2-3 | 重构区域加alias |
| 4 | alias 标deprecated |
| 5 | 旧代码大迁·verify all 调用方|
| 6 | alias 退役|

### 6.4 Alias 形式

```js
TM.Chaoyi = TM.Chaoyi || {};
TM.Chaoyi.open = openChaoyi;
window.openChaoyi = openChaoyi; // legacy alias·Phase 5 退出
```

---

## 7·依赖图 5 层
```
Layer 5 (UI / Shell)        player-core / game-loop / editor / panel*
                            topbar / sidebar / drawer / overlay
                                  │ Layer 4 (Domain Runtime)    endturn / chaoyi / tinyi / wendui /
                            military / fiscal / huji / office / keju /
                            edict / mechanics / world / NPC
                                  │ Layer 3 (AI / Engine)       ai-infra / ai-change-applier /
                            prompt-composer / ai-schema / *-engine
                                  │ Layer 2 (Data / State)      data-model / data-access /
                            state / state-snapshot /
                            storage / save-* / migration
                                  │ Layer 1 (Foundation)        utils / time-utils / event-bus /
                            namespaces / engine-constants / icons
```

规则·

- Layer N 可依赖Layer < N
- 同 Layer 间禁循环 (A→B→A)
- 跨 Layer 反向依赖 (低层依高层·**critical**·必修)

---

## 8·Safety Gates

### 8.1 Phase 1 前最低安全门

- `node scripts\verify-all.js` 必绿
- boot smoke 设计完成 (Codex own)
- render smoke 设计完成 (Claude own)
- architecture-target-final.md 落盘 ✓ (本 doc)
- dirty worktree 审计·避免 Codex/Claude 覆盖

### 8.1.1 大文件切分前

- 本地操作前，先保留一份可回退的原始文件。
- 先审 wrapper/IIFE 边界，再决定切分点。
- 确认 GitHub / 远端 / 备份状态无误后，再动大文件。
- 切分点必须在明确 seam，禁止 mid-IIFE split；目标 slice 若跨越 wrapper，先重画边界。
### 8.2 每代码切片最低安全门

- 单文件 `node --check`
- 相关 smoke 必绿
- `verify-all` 必绿
- 变更说明
- architecture-map 同步
- 对方 review

### 8.3 禁止

- 一次性移动20 个核心文件- 一次性删除v2/v3/bak/patch 文件
- 未写替代路径就删除旧 public API
- 未查 index.html 加载顺序就移动脚本
### 8.4 Render-smoke 设计 (Claude own)

Mock GM·

```js
{
  turn: 1, era: '熹宗·天启', dynasty: '明,
  scenario: 'tianqi', protagonist: 'mock-emperor',
  characters: [/* 10 mock NPC */],
  variables: { base: {帑廪:100,内帑:100,户口:1000,吏治:50,民心:50,皇权:50,皇威:50}, other: {} },
  events: { historical: [], random: [], conditional: [], story: [], chain: [] },
  armies: [/* 3 mock */],
  officeTree: [/* mock */],
  adminHierarchy: [/* mock */]
}
```

Render·14 panel (朝政中心 / 人物志/ 地方 / 国库 / 内帑 / 财政 / 军事 / 编年史/ 礼制 / 时机 / endturn report / topbar / sidebar / drawer)

PASS·全 panel 不 throw·DOM 写出·无 'undefined'/'null'/'[object Object]' 字面

### 8.5 Boot-smoke 设计 (Codex own)

Codex draft §7 / Phase 1 详案
---

## 9·Phase 0-6 计划

| Phase | 内容 | ETA |
|---|---|---|
| **0** | 调研 + 两 draft + final + Phase 1 gate | **1-2 day·当前完成** |
| **1** | 安全网 (boot-smoke + render-smoke) + architecture-map v0 + module-boundaries v0 + 命名 lint script + editor-game-systems audit + 头注 warm-up (10 active 核心) | 2-3 day |
| **2** | 低风险清理·char-historical-profiles-ext 切分·SELF phase 改名·tm-patches 已迁段·v2/bak 移出运行路径·administration.js →editor-administration.js | 3-5 day |
| **3** | **高价值模块治理*·chaoyi 5 cleanup·editor 16 reorganize·patches LAYERED + smoke·ai-infer 抽出·财政 15 → 6·map 12 →6·office/hongyan deep audit·tm-editor-* 前缀统一 | 1-2 weeks |
| **4** | **小文件合并** (26 个<200 行)·utils 整理 | 3-5 day |
| **5** | **namespace 大迁**·alias 期·verify all 调用方迁完| 5-7 day |
| **6** | docs finalize·architecture-map.md v1·module-boundaries.md v1·refactor-playbook.md v1·alias 退役·lint 强化 | 1-2 day |

**总·~3-6 weeks**·preserve verify-all 全程绿。
---

## 10·Ownership

| 区 | Codex own | Claude own | 共做 |
|---|---|---|---|
| chaoyi / wendui / NPC / event | review | own | - |
| editor 16 文件 | review | own | - |
| persistence / save / migration | review | own | - |
| **endturn-ai-infer 12591** | **own** | review | - |
| military / battle | review | own | - |
| AI runtime (infra / change-applier) | own | review | - |
| `tm-endturn-render.js` / battle display | own with Claude review at merge | review at merge | coordinated |
| docs (architecture map / boundaries / playbook) | mixed | mixed | **共做** |
| naming / lint / safety gates | mixed | mixed | **共做** |
| index.html 加载顺序 | mixed | mixed | **共做·必协调** |

---

## 11·第一批 Slices (Phase 1 + 早期 Phase 2)

| Slice | 内容 | Owner |
|---|---|---|
| 0 | 写 final.md | **当前完成 (本 doc)** |
| 1 | architecture-map.md v0 (top 30 文件) | 共做 |
| 2 | module-boundaries.md v0 | 共做 |
| 3 | 头注 warm-up (10 active 核心) | 共做 |
| 4 | 命名 lint script | Claude |
| 5 | render-smoke 实现 | Claude |
| 6 | boot-smoke 实现 | Codex |
| 7 | editor-game-systems audit | Claude |
| 8 | ai-infer section map (12591 行内部navigation) | Codex |
| 9 | char-historical-profiles-ext 拆分 (Phase 2 起) | Claude |

---

## 12·Phase 0 完成 Checklist

| 项 | 状态|
|---|---|
| Claude draft 已写 | ✓|
| Codex draft 已写 | ✓|
| 两边差异已讨论| ✓ (实际 0 disagree·全align) |
| `architecture-target-final.md` 已落盘 | ✓(本 doc) |
| Phase 1 safety gate 清单已落盘| ✓ (§8) |
| 用户确认进入 Phase 1 | 🟡 **待用户确认** |

**5/6 已 done**·**最后 1 项·待用户启 Phase 1 信号**

---

## 13·Risks

- index.html 脚本顺序隐式依赖
- 顶层函数被后加载文件覆盖
- patch 文件里还有未归位逻辑
- smoke 覆盖不足
- editor 写入字段与runtime 消费字段断裂
- Codex/Claude 并行修改同一大文件导致覆盖
- 重构期间用户插队任务·**接受 plan 暂停 / 恢复**

---

## 14·Refactor Playbook 总则

- **先 map·后 move**
- **先 smoke·后 delete**
- **先 alias·后 namespace**
- **全 active/legacy 判定·后清理旧文件**
- **一刀一事·禁 big bang**
- **每 slice·verify-all + smoke + acceptance 必绿**
- **失败即 revert·非强行 fix**

---

## 15·Next

**待用户确认**·

- ☐ 同意 final.md
- ☐ 同意进入 Phase 1
- 同意后·Codex 启 boot-smoke / ai-infer section map·Claude 启render-smoke / editor-game-systems audit / 命名 lint script

无 commit·无 push·**Phase 0 内**。
— end of architecture-target-final.md
