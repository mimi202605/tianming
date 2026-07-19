# 天命 · 架构导图

> 目的：让任何维护者（包括三个月后的你自己）在 30 分钟内定位 80% 的代码。
> 这是当前**实然**架构，不是理想架构。理想参见文末"长期演化方向"。
> 最后更新：2026-06-13（数字全部按当日 `web/` 实测重校；上次 2026-04-24 的文件数/行号已大幅过期）

> **速览（2026-06-13 实测）**：`web/` 共约 **662** 个 `.js`、约 **138 万行**（含 4.6MB 生成剧本包与 vendor）；`index.html` 顺序加载 **310** 段 `<script>`；对外挂载点 `window.* =` 约 **1258** 个；`GM.` 被引用 **15,668** 次、`P.` **4,467** 次，统一门面 `DA.*` 仅 **205** 次（建好但采用率仍停在路线图第一步，见 §10）。平铺层 ≥5000 行文件 3 个（`tm-tinyi-v3` 6938 / `tm-endturn-apply` 5378 / `tm-chaoyi-changchao` 5100），2000–5000 行 41 个。

---

## 1. 核心心智模型

天命 = **浏览器 Electron 单页应用** + **AI 驱动的历史模拟器**。

```
玩家
  │
  ├─→ 发诏令/问对/朝议/密问/召对（UI 交互，输入半文言文）
  │
  │   [回合结算 endTurn]
  │     ├─ 诏令抽取 → 构建 prompt → 调 AI → 拿 p1 JSON
  │     ├─ validator 校验 p1 → applier 写回 GM
  │     ├─ 子系统推进（经济/官制/区划/人口/环境）
  │     └─ 渲染史记/叙事/变化摘要
  │
  └─→ 下一回合
```

**两套数据**：
- `GM`（Game Master）：**运行时**状态，每个游戏 session 独立。几乎所有运行时读写应该针对 GM。
- `P`（Persistent）：**持久化** 数据。剧本库、全局设置、玩家档案。跨 session 保留。

**混用陷阱**：运行时渲染若读 `P.adminHierarchy` 就会看到静态剧本数据，必须读 `GM.adminHierarchy`。参见"GM/P 字段所有权表"。

---

## 2. 两套编辑器（容易混淆）

本项目有**两套完全独立**的编辑器：

| | 独立编辑工具 | 游戏内编辑器 |
|---|---|---|
| 入口 | 单独打开 `editor.html` | 游戏中 `enterEditor(sid)` |
| 全局对象 | `scriptData` | `P` |
| 主代码 | `editor.js` | `index.html` + `tm-*.js` |
| 用途 | 从零创建/编辑剧本导出 JSON | 游戏中调整当前存档 |
| 函数示例 | `saveScript()` `addChr()` | `enterEditor` `renderEdTab` `aiGenChr` |

**规则**：
- 改独立编辑工具 → `editor.js` / `editor.html`
- 改游戏内编辑器 → `index.html` + 相关 `tm-*.js`
- `P` 和 `scriptData` **不交叉使用**

---

## 3. 文件加载顺序（重要！全局 window.* 靠顺序）

index.html 按依赖顺序加载 **310 段 `<script>`**（2026-06-13 实测；2026-04-28 时为 161，半年内随功能扩张近翻倍）。**加载顺序 = 依赖关系**：靠前的先就位。下面的分层是"心智骨架"，非逐文件清单——逐行以 `index.html` 为准。关键分层：

```
第 1 层 · 基础数据 & 工具
  tm-icons  tm-data-model  tm-utils  tm-traits-data
  tm-chronicle-tracker  tm-relations

第 2 层 · 索引与生命周期
  tm-edict-lifecycle  tm-mechanics  tm-change-queue
  tm-index-world (← findCharByName/findFacByName 核心入口)
  tm-npc-engine  tm-game-engine

第 3 层 · 子系统引擎
  tm-map-system  tm-dynamic-systems (SaveManager)
  tm-economy-military  tm-event-system  tm-storage

第 4 层 · 回合结算（拆成 4 个文件）
  tm-endturn-helpers  tm-endturn-province  tm-endturn  tm-endturn-render

第 5 层 · 补丁 & 扩展（警告：此层是腐化重灾区）
  tm-patches  tm-three-systems-ext  tm-three-systems-ui
  tm-char-arcs  tm-chaoyi-keju  tm-char-autogen
  tm-audio-theme  tm-topbar-vars  tm-shell-extras

第 6 层 · 领域子系统（每个系统自成一文件或多片）
  腐败(corruption) · 国库(guoku) · 内堂(neitang)
  角色经济(char-economy) · 户籍(huji) · 环境(env) · 权威(authority)
  货币(currency) · 央地(central-local) · 诏令(edict)

第 7 层 · Phase 补丁（A-H 阶段遗留 16 个文件）
  tm-phase-a-patches ... tm-phase-g4-economy-finalize (tm-phase-h-final → tm-tax-atomic → R10 redistribute deleted 2026-05-04)
  tm-phase-f1-fixes  tm-phase-f2-linkage ...

第 8 层 · 集成层
  tm-integration-bridge  tm-fiscal-cascade  tm-fiscal-fixed-expense

第 9 层 · AI 输入/输出（Schema 在 applier 之前）
  tm-ai-schema           ← 字段契约单一真源
  tm-ai-output-validator ← AI 返回 p1 的校验
  tm-data-access (DA)    ← 统一数据访问门面
  tm-ai-change-applier   ← 写回 GM
  tm-ai-npc-memorials    ← NPC 死亡墓志铭

第 10 层 · UI 抽屉与编辑器桥接
  tm-var-drawers / -ext / -final
  editor-*-deep  editor-presets  editor-details

第 11 层 · 测试 & 剧本 & 日志
  tm-test  tm-test-harness (TM.test)
  scenarios/*  tm-changelog
```

**加载顺序敏感场景**：
- 后加载的 `tm-audio-theme.js` 覆盖 `tm-game-engine.js` 的 `renderTechTab/renderRulTab/renderEvtTab`（故意补丁，添加编辑按钮）
- `tm-ai-schema` 必须在 `tm-ai-output-validator` 之前（validator 读 schema）
- `tm-data-access` 必须在 `tm-index-world` 之后（DA 委托 findCharByName）

---

## 4. GM 字段所有权表（核心 40 个，共 193 个已知字段）

按访问频率排序。用 DA 读写的字段标 ✓。

| 字段 | 类型 | 所属系统 | DA 入口 |
|------|------|---------|---------|
| `GM.chars` | Array<Character> | 核心 | ✓ `DA.chars.*` |
| `GM.facs` | Array<Faction> | 核心 | ✓ `DA.factions.*` |
| `GM.parties` | Array<Party> | 核心 | ✓ `DA.parties.*` |
| `GM.classes` | Array<Class> | 核心 | ✓ `DA.classes.*` |
| `GM.turn` | number | 核心 | ✓ `DA.turn.current()` |
| `GM.date` | string | 核心 | ✓ `DA.turn.date()` |
| `GM.running` | boolean | 核心 | ✓ `DA.turn.isRunning()` |
| `GM.guoku` | Object | 财政 | ✓ `DA.guoku.*` |
| `GM.officeTree` | Array<Dept> | 官制 | ✓ `DA.officeTree.*` |
| `GM.adminHierarchy` | Array<Division> | 行政 | ✓ `DA.admin.get()` |
| `GM.provinceStats` | Object<name, stats> | 行政 | ✓ `DA.admin.getProvinceStats()` |
| `GM.currentIssues` | Array<Issue> | 时政 | ✓ `DA.issues.*` |
| `GM._edictSuggestions` | Array | 诏书 | ✓ `DA.edict.*` |
| `GM.armies` | Array<Army> | 军事 | × 用 `GM.armies.find` |
| `GM.activeWars / activeBattles` | Array | 军事 | × |
| `GM.yearlyChronicles` | Array | 史记 | × |
| `GM.authority` | Object | 权威 | × 走 `tm-authority-engines` |
| `GM.harem` | Object | 后宫 | × |
| `GM.memorials` | Array | 奏疏 | × |
| `GM.qijuHistory / jishiRecords` | Array | 起居/纪事 | × |
| `GM._turnReport / _turnAiResults` | Object/Array | AI 推演 | × |
| `GM.eraState` | Object | 时代 | × |
| `GM.keju` | Object | 科举 | × 走 `tm-chaoyi-keju` |
| `GM.huji / corruption / environment` | Object | 子系统 | × |
| `GM.npcMemory` | Object | NPC记忆 | × |
| `GM.chronicleAfterwords / characterArcs / playerDecisions` | Array | 记忆归档 | × |

**完整 193 字段清单**：`DA.meta.coveredGMFields` + grep `GM\.` 自查。

---

## 5. P 字段所有权表（持久化关键 10 个）

| 字段 | 含义 | 写入时机 |
|------|------|---------|
| `P.scenarios` | 所有剧本数组 | 新建/导入剧本 |
| `P.ai` | AI 接口配置（key/model/prompt/第二 api） | 玩家设置 |
| `P.conf` | 游戏配置（回合/奏疏数/字数） | 玩家设置 |
| `P.audio` | 音频设置 | 玩家设置 |
| `P.theme` | 主题 | 玩家设置 |
| `P.officeTree` | 剧本的静态官制预设 | 新游戏首次生成 AI 回写 |
| `P.adminHierarchy` | 剧本的静态行政区划预设 | 新游戏首次生成 AI 回写 |
| `P._indices` | P 的索引（scenarioById） | buildIndices() |
| `P._saveVersion` | 存档版本号 | SaveMigrations.stamp |
| `P.playerProfile` | 玩家跨游戏元数据 | 新游戏时 |

**边界规则**：
- 启动时：`P → GM` 一次性深拷贝（fullLoadGame / startGame）
- 运行时：只改 GM，**不许改 P**（个别兜底恢复路径例外）
- 存档时：`{GM: ..., P: ...}` 一起序列化到 IndexedDB slot

**历史违规**（均已验证或修复）：
- `tm-audio-theme.js:1237` P→GM 兜底恢复（合理）
- `tm-audio-theme.js:1778` 新游戏首次生成时 GM→P（合理，把 AI 生成的官制回写到剧本库）
- `tm-index-world.js` 原 swap hack（2026-04-24 已消除，改为 `_officeBuildTreeV10(opts.officeTree)` 参数化）

---

## 6. 回合结算管道（endTurn 调用链）

> ⚠️ 旧版此节用 `tm-endturn.js:9636` 一类**行号**做锚点，早已全部失效——单体 `tm-endturn.js` 已不存在，结算被拆成 **23 个 `tm-endturn-*.js`** 并**管道化重构**为 6 个可替换 step。下面只用**文件名 + 函数名/step 名**这类稳定锚点；**不写行号**（行号每改一次就腐，是上版此节烂掉的根因）。权威逐字段数据流见 `web/docs/endturn-data-flow.md`。

**入口**：`endTurn()` @ `tm-endturn-core.js`（搜函数名）→ 末尾 `TM.Endturn.Pipeline.run(ctx)` 驱动 6 step。step 名是契约（见 `tm-endturn-pipeline-types.js`）：

```
endTurn()                          ← tm-endturn-core.js（入口 + 前置 actor 推进）
  │
  └─ TM.Endturn.Pipeline.run(ctx)  ← tm-endturn-pipeline-executor.js（每 step 独立 onError + ctx.crossTurn/deferredSteps）
     │   step 定义集中在 tm-endturn-pipeline-steps.js
     │
     ├─ step 'prep'                 ← tm-endturn-prep.js
     │     收集玩家输入：诏令动作 / 朝议结果 / 奏疏批注
     │
     ├─ step 'plan-prefetch'        ← tm-endturn-ai.js（预取/规划）
     │
     ├─ step 'ai'                   ← tm-endturn-prompt.js（建 prompt）+ tm-endturn-ai.js（调用）
     │     prompt 注入 chars/facs/parties/classes 摘要、currentIssues、近 3 回合 chronicles、
     │       国策、provinceStats、官职健康/考课、TM_AI_SCHEMA 字段（单一真源）
     │     主调 subcall1 → extractJSON → p1；TM.validateAIOutput(p1,'subcall1') 校验
     │     并行子调用：subcall1b（文事/势力专项）、subcall1c（诏令问责 directive_compliance）
     │     ⚠️ 安卓侧子调用默认串行 + 响应体积闸（防 WebView OOM，见 memory）
     │
     ├─ step 'post-ai-edict'        ← tm-endturn-edict.js + tm-ai-change-applier.js
     │     applyAITurnChanges(p1) @ tm-ai-change-applier.js ← 写回 GM 的主门面
     │     各 p1.* 段（character_deaths / office_changes / admin_division_updates /
     │       harem_events / current_issues_update）的消费分散在 tm-endturn-apply.js
     │       与 applier；按 p1 字段名 grep 定位，别记行号
     │
     ├─ step 'systems'              ← tm-endturn-systems.js + tm-endturn-province.js + *-helpers.js
     │     每省 population/unrest/prosperity；经济 FiscalCascade；角色经济 CharEconomyEngine；
     │     户籍 HujiEngine；环境 EnvCapacityEngine；科举 advanceKejuByDays；
     │     权威 AuthorityEngines；腐败 CorruptionEngine
     │
     └─ step 'render-and-finalize'  ← tm-endturn-render.js
           yearlyChronicles.push 摘要 / memorialsLog 归档 / showPostTurnCourtBanner /
           renderShiji / renderChronicle；GM.turn++；GM.date=getTSText()；autoSave(slot0)
```

**调试技巧**：
- 每 step 卡住：看 console，搜 `[catch]` `[ai-validator]` `[SaveMigration]`；step 级错误看 `ctx.stepLog`
- AI 返回格式异常：`TM.getLastValidation()` 查最近一次校验
- 变更应用异常：搜 `applyAITurnChanges` 的 try/catch（@ `tm-ai-change-applier.js`）

---

## 7. AI 调用拓扑

```
callAI / callAIMessagesStream           ← tm-utils.js 基础调用
  │
  │  路由决策：tier
  │    _useSecondaryTier() / _getAITier()  ← 主/副 API 选择
  │
  └─→ fetch OpenAI 兼容 endpoint
      │
      └─ TokenUsageTracker.record         ← 消耗统计

主要调用点：
  ├─ endTurn()                             ← 主推演（最贵）
  ├─ 问对/朝议/廷议/御前                     ← 流式对话
  ├─ 科议 (keyi)                            ← 流式
  ├─ 独召密问 (mizhao)                       ← 流式 + JSON
  ├─ 奏疏生成 (generateMemorials)             ← NPC 自发
  ├─ 科举答卷/考官建议                         ← F3/F4
  ├─ 启动预演规划                             ← 一次性，startGame
  ├─ NPC 主动传书 (playerLetters)             ← 非阻塞
  ├─ 情节弧后台推进                           ← requestIdleCallback
  └─ post-inference 诏令问责                   ← endTurn 末尾
```

所有返回 JSON 的调用都应接入 `TM.validateAIOutput`（目前仅主 subcall1 接入，其他待迁移）。

---

## 8. 关键扩展点与反模式警示

### 做扩展时先看这里

| 想做什么 | 找这里 | 要改几个文件 |
|---------|-------|-------------|
| 新增一个角色字段 | `tm-char-full-schema.js` + `SaveMigrations` | 2-4 |
| 新增一个剧本字段 | 剧本 JSON + `tm-data-model.js` + 编辑器 | 3-5 |
| 新增一个 AI 输出字段 | `tm-ai-schema.js` + endturn prompt + 消费代码 | 3 |
| 新增一个诏令类型 | `tm-edict-complete.js` + `tm-edict-parser.js` | 2 |
| 新增一个子系统引擎 | 新建 `tm-xxx-engine.js` + endTurn hook | 2-3 |
| 新增一个 UI 面板 | `index.html` + 面板 JS + `tm-topbar-vars.js` | 3-4 |

### 反模式清单（别再做）

1. **直接 `GM.chars.find(...)`**：改用 `DA.chars.findByName(...)`
2. **AI prompt 里硬写字段名**：改用 `TM_AI_SCHEMA.describe(field).desc`
3. **新建 `xxx-p2.js / xxx-p4.js` 补丁文件**：在原 engine 内用 version flag 或 feature flag
4. **`catch(e){}`** 完全静默：至少加 `console.warn('[模块名] ...', e)`
5. **在运行时改 P 字段**：除非是兜底恢复，否则走 GM
6. **同概念多套命名**（char/character/npc/person）：优先用 `char`（`GM.chars` 的原生命名）

### 遗留补丁地图（谨慎修改）

```
tm-patches.js           · 2186 行 · 跨多个领域的后补 · 拆难度极高
tm-phase-a..h-patches   · 16 个文件 · 按阶段演化的补丁 · 局部合并可能
tm-phase-f1-fixes       · 某阶段专门修 bug 的补丁
tm-phase-g4-finalize    · 某阶段 "收尾" · 往往包含 monkey patch
tm-corruption-p2/p4     · 腐败系统的 2 个后补版本 · 已于 R9 合并进 tm-corruption-engine.js
tm-guoku-p2/p4/p5/p6    · 国库系统的 4 个后补版本 · 最难合并
tm-neitang-p2           · 内堂系统的补完
tm-var-drawers / -ext / -final · 变量抽屉的 3 代版本
```

---

## 9. 新维护者 15 分钟上手路径

1. 打开 `index.html` 看 `<script src=...>` 列表（~310 段），建立文件分层心智（见 §3）
2. 读 `tm-data-model.js` 了解 GM/P 字段大致形状
3. 读生命周期入口（已不在单一文件）：`startGame` @ `tm-patches.js`（补丁覆盖原始定义）、`enterGame` @ `tm-game-loop.js`、`fullLoadGame` @ `tm-save-lifecycle.js`
4. 打开 `?test=1` 跑 smoke test，看 DA / Schema / Validator 都正常
5. 浏览器控制台试：`DA.chars.player()` `DA.guoku.money()` `DA.turn.current()`
6. 读 `tm-endturn.js` 顶 200 行（endTurn 函数的头部，感受结算流程开端）
7. 遇到不懂的全局变量 → `DA.meta.coveredGMFields` 或 grep `GM\.xxx`

---

## 10. 长期演化方向（路线图）

当前架构处于**可维护但增速放缓**的阶段。下面区分「已落地」与「仍欠」（2026-06-13 复核）：

**已落地（原路线图项）**
- ✅ 合并 `tm-guoku-p2/p4/p5/p6` → 现仅存 `tm-guoku-engine.js`（`tm-corruption`/`tm-neitang` 的 p2/p4 后补也已并）
- ✅ endTurn 拆为显式管道：6 step（`prep/plan-prefetch/ai/post-ai-edict/systems/render-and-finalize`，见 §6），每 step 独立 onError
- ✅ JSDoc/类型：`@ts-check` 已覆盖 `tm-*.js` 的 **78%**（239/306）
- ✅ 导航债清零：1500+ 行根文件 TOC 覆盖 **62/62 = 100%**（2026-06-13 一刀补齐；`debt-report.js` 已认 `§字母`/`Module:` 等约定）。各大文件顶部均有「章节导航」块，靠 grep 小节标题跳转、不写行号

**仍欠（按杠杆排序，优先做上面的）**
1. **DA 门面采用率停滞**：`DA.*` 仅 **205** 次调用 vs `GM.` 裸访问 **15,668** 次。门面建好了却没人用 → 解耦收益没兑现。该按文件分批把热路径 `GM.guoku/officeTree/chars` 迁到 `DA.*`（不破坏、加标注、逐文件验 smoke）。
2. **巨石文件**：平铺层 `tm-tinyi-v3.js`(6938)/`tm-endturn-apply.js`(5378)/`tm-chaoyi-changchao.js`(5100) 仍是单 IIFE，且有 ~3200 行单函数。按 DEV-GUIDE 小步切，保持 `window.*` 挂载名不变。
3. **回退项**：`localStorage` 未 try 从 0 涨回 33；空 catch 159。lint 工具已能逐个定位。
4. **持续**：每新增 AI 字段必经 `TM_AI_SCHEMA`，每新增数据字段优先经 `DA.*`（别再加裸 `GM.` 访问扩大 #1 的债）。
5. **文件名规范化**：`tm-tinyi-v3.js`/`phase8-formal-*` 等违例改名见 `docs/NAMING-PLAN.md`（搭车整包热更发，别单发）。

---

## 11. 穿越模式架构（Phase 1-7 · 2026-07 新增）

> 穿越模式打破 §1「玩家=皇帝」北极星第 4 条，允许玩家扮演除皇帝外的任意角色。本节是穿越模式的「实然」架构地图——理想参见 spec `add-transmigration-mode/spec.md`。
> 文件清单与职责速查见 [INDEX.md](INDEX.md) §「🎭 穿越模式文件注册」。

### 11.1 单一真相源：`P.playerInfo`

```
P.playerInfo = {
  transmigrationMode:  boolean   // true = 穿越模式 / false = 皇帝模式（默认）
  playerRole:          string    // 16 种角色：emperor / regent / minister / general /
                                 //             prince / custom / merchant / actor /
                                 //             eunuch / maid / commoner / bandit /
                                 //             infant / retired_official / monk / artisan
  sovereignName:       string    // 当前君主姓名（穿越模式由 GM.chars 中 _offIsSovereign 反推）
  sovereignTitle:      string    // 君主尊号（朝代中立·剧本 hook）
  selectedCharId:      string    // 玩家所选角色 ID
  characterTitle:      string    // 玩家角色职衔
  characterName:       string    // 玩家角色姓名
}
```

**玩家身份唯一标识**：`c.isPlayer`（`GM.chars` 中有且仅有一个角色 `isPlayer=true`）。`P.playerInfo.playerRole` 是其派生缓存，由 `TM.Transmigration.derivePlayerRole(c)` 在 `confirmCharacter` 时写入。

### 11.2 14 大玩家系统数据流图

```
                       ┌─────────────────────────────────────┐
                       │   TM.Transmigration (Phase 1 入口)    │
                       │   startFlow → showCharacterSelect     │
                       │   → confirmCharacter → enterGame      │
                       └───────────────┬─────────────────────┘
                                       │ 写入 P.playerInfo
                                       ▼
        ┌──────────────────────────────────────────────────────────┐
        │                  玩家角色（c.isPlayer=true）                │
        └──────────────────────────────────────────────────────────┘
                                       │
        ┌──────────────┬──────────────┼──────────────┬──────────────┐
        ▼              ▼              ▼              ▼              ▼
  ┌──────────┐  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
  │Interaction│  │ Economy  │   │  Trade   │   │   Tech   │   │ Movement │
  │ interact  │  │ cash/    │   │ caravan  │   │ research │   │ travelTo │
  │ marry/    │  │ gray/    │   │ route/   │   │ unlock/  │   │ arrive/  │
  │ recruit   │  │ confiscate│   │ risk/    │   │ discover │   │ encounter│
  └─────┬────┘  └────┬─────┘   └────┬─────┘   └────┬────┘   └────┬────┘
        │            │              │              │             │
        │     ┌──────┴──────┐       │       ┌──────┴──────┐      │
        │     ▼             ▼       │       ▼             ▼      │
        │  ┌──────┐   ┌─────────┐   │   ┌────────┐   ┌────────┐  │
        │  │Family│   │Industry │   │   │Reclaim │   │ Private│  │
        │  │marry/│   │ build/  │   │   │survey/ │   │  Army  │  │
        │  │heir/ │   │ operate │   │   │permit/ │   │recruit/│  │
        │  │rebel │   │ upgrade │   │   │harvest │   │deploy  │  │
        │  └──┬───┘   └─────────┘   │   └────────┘   └───┬────┘  │
        │     │                     │                   │       │
        │     ▼                     │                   │       ▼
        │  ┌─────────┐              │                   │  ┌─────────┐
        │  │Marriage │              │                   │  │ Rebel   │
        │  │ 六礼/   │              │                   │  │ prep/   │
        │  │ 赘婿/   │              │                   │  │ launch/ │
        │  │ 和离    │              │                   │  │ resolve │
        │  └─────────┘              │                   │  └─────────┘
        │                           │
        ▼                           ▼
  ┌──────────┐                ┌──────────┐
  │ Keju     │                │Skill     │
  │ exam/    │                │ 学塾/    │
  │ pass/    │                │ 拜师/    │
  │ scandal  │                │ 游学/    │
  └──────────┘                │ 历练     │
                              └──────────┘
        ┌──────────────┐
        │Annual Review │
        │ 9-grade /    │
        │ promote /    │
        │ demote       │
        └──────────────┘
        ┌──────────────┐
        │SpecialIdentity│
        │ eunuch/maid/ │
        │ bandit/      │
        │ infant/...   │
        └──────────────┘

  ↑                              ↑
  │                              │
  └── TM.PlayerActionSignals ────┘
      （Phase 5 · 动作信号聚合·统一打标 source 字段）
                                      │
                                      ▼
                          ┌────────────────────────┐
                          │ TM.Qiju.record(        │ ←─── 起居注单一写口
                          │   content, {source})   │      CAP=240
                          └────────────┬───────────┘
                                       │
                                       ▼
                          ┌────────────────────────┐
                          │ TM.Chronicle.record(   │ ←─── 编年史单一写口
                          │   entry)               │      月稿两段制
                          └────────────────────────┘
                              sovereignDecisions[]
                              playerActions[]
```

**依赖关系**（spec Task Dependencies 摘录）：
- `PlayerTrade` ← `PlayerEconomy`（商队需银钱账本）
- `PlayerTech` ← `PlayerInteraction` + `PlayerEconomy`（招匠人 + 研发投入）
- `PlayerFamily` ← `PlayerInteraction` + `PlayerKeju`（联姻 + 子女出仕）
- `PlayerPrivateArmy` ← `PlayerEconomy`（装备投入）
- `PlayerIndustry` / `PlayerReclaim` ← `PlayerEconomy` + `PlayerMovement`（购地 + 选址）
- `PlayerRebel` ← `PlayerInteraction` + `PlayerEconomy` + `PlayerPrivateArmy` + `TM.SovereignAI`
- `PlayerMarriage` ← `PlayerFamily` + `PlayerInteraction`
- `PlayerSkill` ← `PlayerMovement` + `PlayerInteraction`（游学 + 拜师）
- `PlayerSpecialIdentity` ← `TM.Transmigration` + `TM.SovereignAI` + 多个玩家系统（特殊身份的复合路径）

### 11.3 玩家身份与决策来源标识

```
玩家动作产生                  写口                     起居注渲染
─────────────────────────────────────────────────────────────────
玩家上奏（奏疏）          source='player-memorial'     src-player · 「玩家·上奏」
玩家其他动作              source='player'              src-player · 「玩家」
玩家皇帝模式（旧）        source='sovereign-player'    src-sovereign · 「玩家·君主」
皇帝 AI 自动决策          source='sovereign-ai'        src-sovereign · 「君主AI」
LLM 失败·规则兜底         source='fallback'            src-sovereign · 「君主AI·兜底」
派系 NPC 决策             source='npc'                 src-npc · 「NPC」
```

老存档兜底：`_qijuNormalize` 从「【君主 AI」前缀反推 `source='sovereign-ai'`（向后兼容）。

### 11.4 Endturn Pipeline 穿越模式分支

```
endTurn() @ tm-endturn-core.js
  │
  └─ TM.Endturn.Pipeline.run(ctx) @ tm-endturn-pipeline-executor.js
     │
     ├─ step 'prep'                 ← tm-endturn-prep.js
     │     _endTurn_collectInput 按 P.playerInfo.playerRole 分支：
     │       皇帝模式 → 收集诏令 + 朝议 + 奏疏批注
     │       穿越模式 → 收集玩家上奏（奏疏 textarea × 1-3 篇）
     │
     ├─ step 'sovereign-ai'         ← tm-endturn-pipeline-steps.js（新增·穿越模式专用）
     │     穿越模式：调 TM.SovereignAI.runTurn(root, ctx) → 下旨/朝议/批奏/任免
     │     皇帝模式：跳过（玩家即皇帝，无 AI 代行）
     │     LLM 降级：callAI → callLLM → 规则引擎兜底（source='fallback'）
     │
     ├─ step 'plan-prefetch'        ← tm-endturn-ai.js
     ├─ step 'ai'                   ← tm-endturn-prompt.js + tm-endturn-ai.js
     │     prompt 注入区分两段：
     │       sovereignDecisions[]（君主 AI 自动决策·穿越模式）
     │       playerActions[]（玩家上奏与动作·两模式通用）
     │
     ├─ step 'post-ai-edict'        ← tm-endturn-edict.js + tm-ai-change-applier.js
     ├─ step 'systems'              ← tm-endturn-systems.js
     └─ step 'render-and-finalize'  ← tm-endturn-render.js
           confirmEndTurn 文案（tm-office-panel.js）按 playerRole 切换：
             皇帝模式：「诏令颁行」
             穿越模式：「上奏呈递」
```

### 11.5 皇帝 AI 双入口设计

```
TM.SovereignAI.runTurn(root, ctx)        异步·LLM 路径
  ├─ 构建 prompt：国库/民心/边警/吏治/派系矩阵 + 玩家上奏
  ├─ 调 callAI / callLLM → extractJSON → 校验 schema
  ├─ 写 TM.Qiju.record(content, {source:'sovereign-ai'})
  └─ 失败降级 → runTurnSync(presetOutput)

TM.SovereignAI.runTurnSync(root, opts)   同步·presetOutput·供 smoke
  ├─ 用 opts.presetOutput 或规则引擎生成
  ├─ 写 TM.Qiju.record(content, {source:'fallback'})
  └─ smoke 用此入口断言「至少生成 1 个决策」
```

### 11.6 跨朝代铁律（spec 强约束）

引擎层（`tm-transmigration.js` / `tm-sovereign-ai.js` / `tm-player-*.js` / `tm-tech-routes-data.js`）**绝不硬编**以下明清专名：

| 类别 | 禁词清单 |
|------|---------|
| 内廷秘书 | 内阁 / 票拟 / 批红 / 票拟批红 / 司礼监 / 内书堂 |
| 特务缉捕 | 东厂 / 西厂 / 锦衣卫 / 内行厂 / 提刑按察 |
| 科举文体 | 八股 / 制义 / 四书文 / 小题文 / 大题文 |
| 奏报文书 | 奏折 / 题本 / 奏本 / 揭帖 / 题奏 |
| 地方督抚 | 总督 / 巡抚 / 提督 / 总兵 / 巡按 |
| 宗藩封爵 | 亲王 / 郡王 / 镇国将军 / 奉国将军 |

**通用术语允许**（不属于禁词）：皇帝 / 君主 / 朝廷 / 命官 / 臣子 / 妃嫔 / 内廷 / 外朝 / 诏令 / 奏疏 / 上奏 / 朝议 / 廷推 / 科举 / 县试 / 乡试 / 会试 / 殿试。

剧本层（`scenarios/*.json` 与 `P.customTechRoutes` 等）可任意 hook 朝代专属机构/职务/科场文体——引擎只提供通用框架。

### 11.7 玩家角色枚举（16 种）

| playerRole | 中文 | 触发场景 |
|-----------|------|---------|
| `emperor` | 皇帝 | 皇帝模式（默认） |
| `regent` | 摄政权臣 | 玩家选摄政角色 / 幼主在位 |
| `minister` | 朝臣 | 玩家选文官角色 |
| `general` | 武将 | 玩家选武官角色 |
| `prince` | 宗室 | 玩家选宗室角色 |
| `custom` | 后宫内命 | 玩家选妃嫔/自定义内命角色 |
| `merchant` | 商贾 | 玩家选商人角色 |
| `actor` | 伶人乐师 | 玩家选伶人角色 |
| `eunuch` | 太监 | 玩家选宦官角色 |
| `maid` | 宫女 | 玩家选宫女角色 |
| `commoner` | 布衣 | 玩家选平民角色 |
| `bandit` | 盗贼 | 玩家选草寇角色 |
| `infant` | 婴幼儿 | 玩家选幼童角色 |
| `retired_official` | 退休官员 | 玩家选致仕角色 |
| `monk` | 僧道 | 玩家选出家人角色 |
| `artisan` | 匠人 | 玩家选手工艺人角色 |

### 11.8 穿越模式回归验证

| smoke 文件 | 验证范围 |
|----------|---------|
| `scripts/smoke-transmigration-e2e.js` | 端到端 21 sub-tests：选角色→进入→回合→14 系统各 1 动作 |
| `scripts/smoke-transmigration-endturn.js` | pipeline sovereign-ai step + 两段制月稿 |
| `scripts/smoke-transmigration-chronicle.js` | 起居注 source 标识 + chip 渲染 + 老存档兜底 |
| `scripts/smoke-transmigration-edict-panel.js` | 诏令面板按 playerRole 分支渲染 |
| `scripts/smoke-transmigration-chaoyi.js` | 朝议面板「皇帝」字面量动态化 |
| `scripts/smoke-transmigration-office-permission.js` | 官制权限按 playerRole 分支 |
| `scripts/smoke-transmigration-regent.js` | 摄政权臣代诏 + 还政危机 |
| `scripts/smoke-transmigration-role-change.js` | triggerRoleChange 角色切换 |
| `scripts/smoke-sovereign-ai-edict.js` | 皇帝 AI 下旨 + 阻力计算 |
| `scripts/smoke-sovereign-ai-chaoyi.js` | 皇帝 AI 朝议发言 |
| `scripts/smoke-sovereign-ai-memorial.js` | 皇帝 AI 批奏 |
| `scripts/smoke-sovereign-ai-office.js` | 皇帝 AI 任免 |
| `scripts/smoke-player-interaction.js` | 玩家互动 10 动作 |
| `scripts/smoke-player-economy.js` | 玩家银钱账本 |
| `scripts/smoke-player-trade.js` | 玩家跑商 |
| `scripts/smoke-player-tech.js` | 玩家科技 + 前置解锁 |
| `scripts/smoke-player-family.js` | 玩家家族 + 婚姻 |
| `scripts/smoke-player-private-army.js` | 玩家私军 |
| `scripts/smoke-player-movement.js` | 玩家移动 |
| `scripts/smoke-player-industry.js` | 玩家产业 |
| `scripts/smoke-player-reclaim.js` | 玩家开垦 |
| `scripts/smoke-player-keju.js` | 玩家科举 |
| `scripts/smoke-player-annual-review.js` | 玩家年终考核 |
| `scripts/smoke-player-rebel.js` | 玩家反叛 |
| `scripts/smoke-player-skill.js` | 玩家自我技能提升 |
| `scripts/smoke-player-special-identity.js` | 特殊身份路线 |

皇帝模式回归（Task 33）：`smoke-chaoyi-v3.js` / `smoke-edict-typed-incidence.js` / `smoke-office-dup-seat-heal.js` 等已有 smoke 全绿，`verify-all` 仅 `tm-keju-indicators.js` 历史孤岛（Phase J1 遗留·与本特性无关）。

架构守卫（Task 34）：`lint-arch-all` 8/8 绿；新穿越模式文件 GM/P 写操作均加 `// arch-ok` 行内豁免（玩家专属账本·不进 gm-writes baseline）。

---

## 附录 A · 常用调试控制台片段

```javascript
// 查看当前玩家角色
DA.chars.player()

// 查看当前回合+日期+是否运行
DA.turn.current(); DA.turn.date(); DA.turn.isRunning();

// 查看国库三账
DA.guoku.money(); DA.guoku.grain(); DA.guoku.cloth();

// 查找某官员的所有兼任
DA.officeTree.postsOf('袁崇焕')

// 查看时局要务
DA.issues.pending()

// 查看最近一次 AI 校验
TM.getLastValidation()

// 运行所有测试
TM.test.run()

// 运行子集
TM.test.runOnly('DA.chars')

// 列出所有已注册测试
TM.test.listSuites()

// 启用/关闭 DAL 访问日志（分析热点）
DA.meta.enableLog(true);
// ...操作...
DA.meta.logSummary()

// 查看 Schema 已定义字段
TM_AI_SCHEMA.listFields()
TM_AI_SCHEMA.describe('office_changes')
```

---

## 附录 B · 最危险的底线

1. **SAVE_VERSION**：改数据结构时必须 bump + 写迁移函数，否则老存档全坏
2. **scenarios/*.js**：剧本文件一旦发布不可随意删字段，靠迁移兼容
3. **AI prompt 的字段顺序**：prompt 里字段说明越靠前权重越高，移动有性能影响
4. **index.html 加载顺序**：改顺序容易让后加载的覆盖失效
