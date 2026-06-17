# tianming Architecture Target - Codex Draft

日期：2026-05-03

状态：Codex draft，等待 Claude draft 对齐。

## 0. 用户目标

用户已明确：当前代码混乱已经影响继续做游戏，需要大重构。

本轮重构的最高目标不是“文件变少”或“看起来整洁”，而是：

- 改一个功能时，能快速判断应该改哪个文件。
- 不重复造已经存在的功能。
- 不靠 patch / v2 / v3 / bak 继续堆叠。
- 不让全局函数继续污染和互相覆盖。
- 每次拆分、合并、改名都必须能验证游戏仍可运行。

## 1. 当前事实

本地快速统计：

- `web` 根目录约 201 个 `.js` 文件。
- 最大文件：
  - `tm-endturn-ai-infer.js`：12591 行
  - `tm-char-historical-profiles-ext.js`：10262 行
  - `tm-tinyi-v3.js`：3914 行
  - `tm-chaoyi-v3.js`：3666 行
  - `tm-hongyan-office.js`：3378 行
  - `tm-ai-change-applier.js`：3318 行
  - `tm-ai-infra.js`：3106 行
  - `tm-keju-runtime.js`：3094 行
  - `tm-military.js`：3015 行
  - `tm-player-core.js`：2782 行
- 文件族数量较多：
  - `editor*`：20 个
  - `tm-endturn-*`：9 个
  - `tm-ai-*`：7 个
  - `tm-char-*`：7 个
  - `tm-guoku-*`：6 个
- 明显历史堆叠：
  - `tm-chaoyi.js`
  - `tm-chaoyi-v2.js`
  - `tm-chaoyi-v2.js.bak`
  - `tm-chaoyi-v3.js`
  - `tm-chaoyi-misc.js`
  - `tm-patches.js`
  - `tm-phase-c-patches.js`

已有文档：

- `docs/dev/MODULE_REGISTRY.md`
- `docs/dev/GLOBAL_POLLUTION_REPORT.md`
- `docs/dev/PATCH_CLASSIFICATION.md`
- `docs/dev/MERGE_PLAYBOOK.md`

这些文档可作为事实来源，但需要升级成更短、更权威、日常可查的架构地图。

## 2. 目标文档体系

建议最终保留三份高频架构文档。

### 2.1 `docs/architecture-map.md`

用途：改功能前先查这里。

格式：

```markdown
| 功能域 | 主文件 | 次要文件 | 禁止改到哪里 | 测试/烟测 |
|---|---|---|---|---|
| 回合 AI 推演 | tm-endturn-ai-infer.js | tm-endturn-ai-helpers.js / tm-prompt-composer.js | tm-endturn-render.js | verify-all / endturn-ai smoke |
| 回合结果展示 | tm-endturn-render.js | tm-endturn-helpers.js | tm-endturn-ai-infer.js | render smoke |
| 朝议 | tm-chaoyi-v3.js | tm-chaoyi-misc.js | tm-wendui.js / tm-tinyi-v3.js | cc3-smoke |
```

要求：

- 只写当前 active 文件。
- v2/v3/bak 不应作为目标文件出现。
- 每次重构切片都必须同步更新。

### 2.2 `docs/module-boundaries.md`

用途：解释模块职责边界。

每个模块必须回答：

- 这个模块负责什么？
- 这个模块不负责什么？
- 公开 API 是什么？
- 依赖谁？
- 谁依赖它？
- 新功能应加在这里还是别处？

### 2.3 `docs/refactor-playbook.md`

用途：重构执行守则。

必须包含：

- 文件拆分流程
- 文件合并流程
- 文件改名流程
- patch 归位流程
- v2/v3 清理流程
- 安全验证门槛
- 回滚规则

`docs/dev/MERGE_PLAYBOOK.md` 可作为基础，但最终文档应更短、更直接。

## 3. 模块目标边界

### 3.1 回合主线

目标边界：

| 目标职责 | 目标文件 |
|---|---|
| 回合入口、阶段调度、总流程 | `tm-endturn-core.js` |
| 回合 AI prompt / 子调用 / 推演策略 | `tm-endturn-ai-infer.js` |
| AI prompt 片段复用 | `tm-prompt-composer.js` |
| AI 输出应用到 GM | `tm-ai-change-applier.js` |
| 省份/地方结算 | `tm-endturn-province.js` |
| 诏令效果结算 | `tm-endturn-edict.js` |
| 回合结果展示 | `tm-endturn-render.js` |
| 回合通用辅助 | `tm-endturn-helpers.js` |

近期原则：

- 先不要急着拆 `tm-endturn-ai-infer.js`。
- 先在文件头写清楚内部区域和公共入口。
- 再逐段抽出“纯 helper / prompt section / validator section”。
- 每抽一个片段，都必须保持原 public 函数兼容。

Codex 建议的最终拆分：

| 未来文件 | 职责 |
|---|---|
| `tm-endturn-ai-orchestrator.js` | AI 子调用调度、并行/串行队列、retry/fallback |
| `tm-endturn-ai-prompts.js` | 各子调用 prompt 组装，调用 PromptComposer |
| `tm-endturn-ai-context.js` | 世界快照、角色选择、约束输入 |
| `tm-endturn-ai-parse.js` | JSON 提取、兼容解析、结构修复 |
| `tm-endturn-ai-validators.js` | 领域 validator 汇总 |
| `tm-endturn-ai-infer.js` | 保留薄入口，调度上述模块 |

但这属于 Phase 2 以后，Phase 0 只定边界。

### 3.2 AI runtime

目标边界：

| 职责 | 文件 |
|---|---|
| AI 调用基础设施、队列、hook | `tm-ai-infra.js` |
| AI 输出 schema / 字段契约 | `tm-ai-schema.js` 或当前 schema 所在文件 |
| AI 输出应用 | `tm-ai-change-applier.js` |
| Prompt 片段复用 | `tm-prompt-composer.js` |
| 世界/角色上下文快照 | `tm-world-snapshot.js` |

规则：

- 新 AI 字段必须先登记 schema/contract。
- 新 prompt 片段优先进 `tm-prompt-composer.js`。
- 不允许在业务文件里复制一整段已存在的角色人格 prompt。
- 不允许新增“临时 JSON 解析器”，统一走既有解析/validator。

### 3.3 角色与人物

目标边界：

| 职责 | 文件 |
|---|---|
| 角色 schema | `tm-char-full-schema.js` |
| 角色自动生成 | `tm-char-autogen.js` |
| 历史人物数据 | `tm-char-historical-profiles.js` / ext 分片 |
| 人物弧线 | `tm-char-arcs.js` |
| NPC 决策 | `tm-npc-decision.js` / `tm-npc-engine.js` |
| 人物志 UI | `tm-renwu-ui.js` |

`tm-char-historical-profiles-ext.js` 是纯数据超大文件，建议按朝代/时代/来源切分，风险低于逻辑文件。

### 3.4 朝议 / 廷议 / 问对

目标边界需 Claude 重点确认。

Codex 初步建议：

| 职责 | active 文件 |
|---|---|
| 朝议主流程 | `tm-chaoyi-v3.js` |
| 朝议零散辅助 | 归并或明确 `tm-chaoyi-misc.js` |
| 廷议/弹劾流程 | `tm-tinyi-v3.js` |
| 问对 | `tm-wendui.js` |
| 诗政/御前独召 | `tm-shizheng-panel.js` |

清理原则：

- 保留 active 版本。
- v2/v3 不能长期并存。
- `.bak` 不应留在 web 根目录。
- `misc` 必须拆成有名字的职责，或并回 active 文件。

### 3.5 编辑器

目标边界需 Claude 重点确认。

Codex 初步建议：

| 职责 | 文件 |
|---|---|
| 编辑器入口/导航 | `editor.js` / `editor.html` |
| 基础 CRUD | `editor-crud.js` |
| 全量生成 | `editor-fullgen.js` |
| 系统配置 | `editor-game-systems.js` |
| AI 生成 | `editor-ai-gen.js` |
| AI 校验 | `editor-ai-validate.js` |
| engine 常量/适配/schema | `editor-engine-constants.js` / `editor-schema-adapter.js` |
| 模型需求 | `editor-model-requirements.js` |

规则：

- 编辑器写出的字段必须能在 runtime 中找到消费方。
- runtime schema 与 editor schema 必须有映射。
- 不允许 editor 临时生成 runtime 不认识的字段。

### 3.6 UI runtime

目标边界：

| 职责 | 文件 |
|---|---|
| 玩家核心交互、tab 切换、通用面板入口 | `tm-player-core.js` |
| 主循环/朝政中心/大面板调度 | `tm-game-loop.js` |
| 人物志 | `tm-renwu-ui.js` |
| 侧栏 | `tm-sidebar-ui.js` |
| 地图系统 | `tm-map-system.js` / map files |
| 回合结果展示 | `tm-endturn-render.js` |

规则：

- 大列表面板默认支持 hidden skip + open forced render。
- `switchGTab` 是 tab fresh render 的统一入口。
- 不应在 tab onclick 和 action 里重复显式 render。

## 4. 文件命名政策

### 4.1 禁止新增

禁止新增以下风格文件：

- `xxx-v2.js`
- `xxx-v3.js`
- `xxx.bak`
- `xxx-patches.js`
- `xxx-fixes.js`
- `xxx-final.js`
- `xxx-misc.js`

例外：

- 临时迁移中可短期存在，但必须写入 refactor map，标明删除条件和期限。

### 4.2 patch / phase 文件政策

所有 patch/phase 文件分三类：

- SELF：改名为真实职责名。
- APPEND：并回目标模块或改名为真实职责名。
- LAYERED：先补 smoke，再谨慎合并。

不允许只因为名字像 patch 就删除。

### 4.3 helper / utils 政策

允许存在 helper 文件，但必须有明确领域：

- 好：`tm-endturn-ai-helpers.js`
- 好：`tm-time-utils.js`
- 坏：`tm-chaoyi-misc.js`
- 坏：`tm-patches.js`

## 5. 公共 API / namespace 政策

长期目标：公共 API 收敛到 `TM.X`。

短期策略：

- 不做一次性 namespace 大迁移。
- 新增公共 API 优先挂 `TM.X`。
- 旧全局函数保留兼容 alias。
- 每个 alias 要在模块头注释里标注 deprecated。

示例：

```js
TM.Renwu = TM.Renwu || {};
TM.Renwu.render = renderRenwu;
window.renderRenwu = renderRenwu; // legacy alias
```

## 6. 模块头注释模板

每个 active 模块逐步补齐：

```js
// ============================================================
// Module: tm-example.js
// Domain: 朝议 / 回合 / 编辑器 / UI / AI runtime
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

## 7. 安全门

Phase 1 前最低安全门：

- `node scripts\verify-all.js` 必须绿。
- 必须有 boot smoke 设计。
- 必须有 render smoke 设计。
- 必须有 architecture final。
- 必须有当前 dirty worktree 审计，避免 Codex/Claude 覆盖彼此改动。

每个代码切片最低安全门：

- 单文件 `node --check`
- 相关 smoke
- `verify-all`
- 变更说明
- architecture-map 同步
- 对方 review

禁止：

- 一次性移动 5 个以上核心文件。
- 一次性删除 v2/v3/bak/patch 文件。
- 未写替代路径就删除旧 public API。
- 未查 index.html 加载顺序就移动脚本。

## 8. 阶段建议

### Phase 0：架构目标对齐

产物：

- `docs/architecture-target-codex-draft.md`
- `docs/architecture-target-claude-draft.md`
- `docs/architecture-target-final.md`

不做代码移动。

### Phase 1：安全网

产物：

- boot smoke
- render smoke
- architecture-map v0
- module-boundaries v0

### Phase 2：低风险清理

优先：

- 纯数据大文件切分：`tm-char-historical-profiles-ext.js`
- SELF/APPEND phase 文件改名
- `tm-patches.js` 中低风险已迁移段落清理
- v2/bak 文件移出运行路径

不优先：

- `tm-endturn-ai-infer.js` 大拆
- `tm-ai-change-applier.js` 大拆
- editor 大迁移

### Phase 3：高价值模块治理

候选：

- chaoyi v1/v2/v3/bak 清理
- editor 文件职责收束
- AI runtime schema / prompt / applier 边界收束
- endturn AI 内部区域拆分

### Phase 4：namespace 与全局污染治理

候选：

- `TM.utils`
- `TM.Renwu`
- `TM.Difang`
- `TM.EndturnAI`
- `TM.Editor`

必须保留 legacy alias，逐步迁移。

## 9. Codex 负责区建议

Codex 优先 own：

- `tm-endturn-ai-infer.js`
- `tm-endturn-ai-helpers.js`
- `tm-prompt-composer.js`
- `tm-ai-infra.js`
- `tm-ai-change-applier.js`
- `tm-world-snapshot.js`
- `tm-military.js`
- `tm-endturn-render.js` 需要与 Claude #5 review 协调
- `tm-player-core.js` / runtime UI 性能切片

Claude 优先 own：

- chaoyi / tinyi / wendui 边界
- editor 文件群
- persistence / migration
- NPC detail / playerChoices 支线如果继续推进

共同 own：

- docs architecture
- naming policy
- test safety gates
- index.html 加载顺序

## 10. 第一批建议切片

切片 0：对齐文档

- 两份 draft
- final doc

切片 1：创建 `docs/architecture-map.md` v0

- 先覆盖 top 30 文件
- 标明 active / legacy / data / patch

切片 2：文件头注释 warm-up

- 给 10 个 active 核心文件加头注释
- 不改逻辑

切片 3：低风险数据拆分

- `tm-char-historical-profiles-ext.js` 按时代或来源拆分
- 验证加载顺序与引用

切片 4：chaoyi active/legacy 决策

- 由 Claude 审计 v1/v2/v3/misc
- 先写保留/删除/归档表
- 不先删

切片 5：endturn AI 内部目录图

- 只给 `tm-endturn-ai-infer.js` 画 section map
- 标明未来可抽出的函数群
- 不先拆

## 11. 关键风险

最大风险不是代码移动本身，而是：

- index.html 脚本顺序隐式依赖
- 顶层函数被后加载文件覆盖
- patch 文件里还有未归位逻辑
- smoke 覆盖不足
- editor 写入字段与 runtime 消费字段断裂
- Codex/Claude 并行修改同一大文件导致覆盖

因此，本次重构必须坚持：

- 先 map，后 move。
- 先 smoke，后 delete。
- 先 alias，后 namespace。
- 先 active/legacy 判定，后清理旧文件。

## 12. 对 Claude draft 的待对齐问题

1. 朝议 active 边界：`tm-chaoyi-v3.js` 与 `tm-chaoyi-misc.js` 如何收束？
2. 编辑器文件群：`editor.js` / `editor-crud.js` / `editor-fullgen.js` / `editor-game-systems.js` 的最终职责如何切？
3. `tm-patches.js` 是否优先做低风险段落清理，还是先只登记？
4. Phase 文件中 SELF/APPEND 是否先改名，还是等 smoke 更完整？
5. `tm-endturn-ai-infer.js` 第一刀是头注释/section map，还是抽出纯 helper？
6. namespace 迁移是否先从新代码强制执行，旧代码只加 alias？

## 13. Codex 建议的 Phase 0 完成标准

Phase 0 完成必须同时满足：

- Claude draft 已写。
- Codex draft 已写。
- 两边差异已讨论。
- `architecture-target-final.md` 已落盘。
- Phase 1 safety gate 清单已落盘。
- 用户确认进入 Phase 1。

在这之前，不进行大规模文件拆分、删除、改名。
