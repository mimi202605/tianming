# 天命 · 模块注册表与重构路线图

> 目的：给 92 个 `tm-*.js` 文件标明职责、上下文、合并/重构方向。
> 这是**执行导向**的索引，不是架构理论；要改某个系统时先来这里。
> 最后更新：2026-04-24

---

## 1. 按领域分组

### 1.1 核心运行时
| 文件 | 主要导出 | 合并建议 |
|------|---------|---------|
| `tm-data-model.js` | GM/P 初始形状 | 保留，作为 schema 基础 |
| `tm-game-engine.js` | startGame / enterGame / fullLoadGame | 保留，9k 行过大但拆分风险高 |
| `tm-index-world.js` | buildIndices / findCharByName 等 | 保留，事实 DAL 内核 |
| `tm-data-access.js` | `window.DA` 门面（2026-04-24 新增） | 新代码强制走这里 |
| `tm-utils.js` | callAI / deepClone / 通用工具 | 保留 |
| `tm-ui-foundation.js` | SVG 图标 + 通用弹窗 + 设置占位 + 速查卡 | P4-beta 合并 |
| `tm-traits-data.js` | 特质数据 | 保留 |

### 1.2 回合结算（Phase 4 分片，2026-04-24 有新验证层）
| 文件 | 行数 | 职责 | 重构建议 |
|------|-----|-----|----------|
| `tm-endturn.js` | 18,618 | endTurn 主循环 + AI prompt 构建 + p1 解析 | 拆为 4 个子模块（见 §3） |
| `tm-endturn-helpers.js` | 1,503 | 结算辅助工具 | 合进主模块或保留 |
| `tm-endturn-province.js` | 1,435 | 省级结算 | 保留独立 |
| `tm-endturn-render.js` | 1,803 | 结算结果渲染 | 保留独立 |
| `tm-ai-schema.js` | 300 | AI 字段契约单一真源（2026-04-24 新增） | 字段演化只改这里 |
| `tm-ai-output-validator.js` | 200 | p1 校验，从 schema 读字段（2026-04-24 新增） | 保留 |
| `tm-ai-change-applier.js` | 2,090 | aiOutput → GM 变更应用 | 需重构：旧字段 appointments/regions/institutions 逐步下线 |
| `tm-ai-npc-memorials.js` | ~300 | NPC 死亡墓志铭生成 | 保留 |

### 1.3 子系统引擎（**补丁重灾区**）

| 系统 | 主文件 | 补丁文件 | 合并策略 |
|------|-------|---------|---------|
| **国库 guoku** | `tm-guoku-engine.js` | `tm-guoku-p2/p4/p5/p6.js` + `panel.js` | **重点目标**。先 diff p2→p6 看每版增加什么，再合并到 engine 并用 feature flag 保留回滚。预计 80 小时。 |
| **腐败 corruption** | `tm-corruption-engine.js` | `tm-corruption-p2/p4.js` | 合并难度中等。p2/p4 增量较清晰。预计 30 小时。 |
| **内堂 neitang** | `tm-neitang-engine.js` | `tm-neitang-p2/panel.js` | 合并难度低。预计 15 小时。 |
| **户籍 huji** | `tm-huji-engine.js` | `tm-huji-deep-fill.js` | 合并难度低 |
| **环境 env** | `tm-env-capacity-engine.js` | `tm-env-recovery-fill.js` | 合并难度低 |
| **央地 central-local** | `tm-central-local-engine.js` | `tm-economy-linkage.js` | 合并难度中等 |
| **权威 authority** | `tm-authority-engines.js` | `tm-authority-complete.js` | 合并难度低（complete 是单次补完） |
| **货币 currency** | `tm-currency-engine.js` | `tm-currency-unit.js` | 合并难度极低 |
| **经济 economy** | `tm-economy-military.js` | `tm-economy-gap-fill.js` | 合并难度低 |
| **角色经济 char-economy** | `tm-char-economy-engine.js` | `tm-char-economy-ui.js`、`-full-schema.js`、`-historical-profiles.js` | 保持拆分，职责清晰 |
| **财政级联 fiscal** | `tm-fiscal-cascade.js` | `tm-fiscal-fixed-expense.js` | 保留独立 |
| **集成桥 bridge** | `tm-integration-bridge.js` | — | 保留 |

### 1.4 UI & 面板
| 文件 | 职责 | 合并建议 |
|------|-----|---------|
| `tm-three-systems-ui.js` | 权势/户籍/内堂 UI（旧版） | 与 ext 合并时参考 |
| `tm-three-systems-ext.js` | 权势/户籍/内堂 扩展 | 重构候选——与 UI 并入统一文件 |
| `tm-var-drawers.js` | 变量抽屉（v1） | **三代共存** — 先理清哪些还在用 |
| `tm-var-drawers-ext.js` | 变量抽屉扩展（v2） | 合并到 final 后删除 |
| `tm-var-drawers-final.js` | 变量抽屉最终版（v3） | 最终版，保留 |
| `tm-topbar-vars.js` | 顶栏七变量 | 保留 |
| `tm-shell-extras.js` | 御案时政/独召密问/浮动按钮 | 保留 |
| `tm-lizhi-panel.js` | 吏治面板 | 保留 |
| `tm-guoku-panel.js` | 国库面板 | 保留（但与 engine 关系要梳理） |
| `tm-neitang-panel.js` | 内堂面板 | 保留 |
| `tm-corruption-*-p2/p4.js` 中的 UI 部分 | 腐败面板 | 与 engine 一同合并 |
| `tm-audio-theme.js` | 音频+主题+官制编辑 tab | **跨职责** — 长期应拆为 3 个文件 |
| `tm-topbar-vars.js` | 顶栏七变量 | 保留 |
| `tm-dynamic-systems.js` | SaveManager + SaveMigrations + 动态系统 | 保留；SaveMigrations 已完备 |

### 1.5 NPC & 角色
| 文件 | 职责 |
|------|-----|
| `tm-npc-engine.js` | NPC 主 AI 决策 |
| `tm-char-arcs.js` | 角色弧 |
| `tm-char-autogen.js` | 角色自动生成 |
| `tm-char-full-schema.js` | 角色完整字段 schema |
| `tm-char-historical-profiles.js` | 历史人物档案 |
| `tm-chronicle-tracker.js` | 编年史追踪 |
| `tm-relations.js` | 人物关系 |

### 1.6 科举 / 朝议 / 诏令
| 文件 | 行数 | 职责 |
|------|-----|-----|
| `tm-chaoyi-keju.js` | 9,454 | 朝议系统 + 科举系统（混杂） — 应拆为 `tm-chaoyi.js` + `tm-keju.js` |
| `tm-edict-lifecycle.js` | ~500 | 诏令生命周期 |
| `tm-edict-parser.js` | ~400 | 诏令解析 |
| `tm-edict-complete.js` | ~800 | 诏令完整处理 |
| `tm-mechanics.js` | ~1500 | 游戏机制工具 |
| `tm-event-system.js` | ~500 | 事件系统 |
| `tm-change-queue.js` | ~300 | 变更队列 |
| `tm-historical-presets.js` | ~800 | 历史预设 |

### 1.7 地图
| 文件 | 职责 | 备注 |
|------|-----|-----|
| `map-display.js` | 游戏中地图渲染 | 2026-04-22 修过 ESC 退出 |
| `map-integration.js` | 地图集成 | 2026-04-24 findPath 改名为 _miFindPath |
| `map-converter.js` | 地图格式转换 | 保留 |
| `tm-map-system.js` | 地图系统（findPath A\*） | 保留 |

### 1.8 Phase 补丁（最危险一群，16 个文件）

| 文件 | 作用猜测 | 合并可能性 |
|------|---------|-----------|
| `tm-phase-a-patches.js` | 阶段 A 补丁 | 低 |
| `tm-phase-b-fills.js` | 阶段 B 填充 | 低 |
| ~~`tm-phase-c-patches.js`~~ | 阶段 C 补丁 | R12b done：已合并到 `tm-edict-parser.js` |
| `tm-phase-d-patches.js` | 阶段 D 补丁 | 低 |
| `tm-phase-e-patches.js` | 阶段 E 补丁 | 低 |
| ~~`tm-phase-f1-fixes.js`~~ | F1 修复 | R12d done：已合并到 `tm-authority-engines.js` + `tm-prophecy.js` |
| `tm-phase-f2-linkage.js` | F2 联动 | 审视 + 合并到 `economy-linkage` |
| `tm-phase-f3-depth.js` | F3 深化 | 审视 + 合并到对应 engine |
| `tm-phase-f4-authority-deep.js` | F4 权威深化 | 合并到 `authority-engines` |
| `tm-phase-f5-ui-ai.js` | F5 UI+AI | 审视 + 分别合并 |
| `tm-phase-f6-economy-deep.js` | F6 经济深化 | 合并到 `economy-linkage` |
| `tm-phase-g1-authority-ui.js` | G1 权威 UI | 合并到 `authority-engines` 或 panel |
| `tm-phase-g2-huji-complete.js` | G2 户籍补完 | 合并到 `huji-engine` |
| `tm-phase-g3-edict-finalize.js` | G3 诏令 finalize | 合并到 `edict-complete` |
| `tm-phase-g4-economy-finalize.js` | G4 经济 finalize | 合并到对应 engine |
| `tm-phase-h-final.js` | H 终极补丁 | ✓ R10 (2026-05-04)·rename → `tm-tax-atomic.js` → §A-§Q redistribute → file deleted |

**Phase 文件的典型反模式**：
- `window.someFn = wrapFn(originalFn)` — 在加载时覆盖游戏函数
- `GM._xxxInitialized || (GM._xxxInitialized = someDefault)` — 补字段
- `if (!P.xxx) P.xxx = ...` — 补剧本默认值

合并策略（通用）：
1. 读补丁文件，标记所有 "被覆盖的函数" 与 "被补充的字段"
2. 把覆盖逻辑直接 inline 到目标文件（一次性）
3. 把补字段逻辑放到 `SaveMigrations` 或初始化函数中
4. 在 `changelog.json` 记录补丁归位历史
5. 从 `index.html` 删除 `<script>` 引用
6. 保留原补丁文件改名为 `.archive.js`（git 历史中可查）

### 1.9 编辑器深化 / 其他

| 文件 | 职责 |
|------|-----|
| `tm-editor-division-deep.js` | 行政区划深化编辑 |
| `tm-editor-office-deep.js` | 官职深化编辑 |
| `tm-editor-custom-presets.js` | 自定义预设 |
| `tm-patches.js` | **2,186 行大杂烩** — 长期目标拆散 |
| `tm-storage.js` | IndexedDB 存储 + 压缩 |
| `tm-test.js` | 旧手写单测（保留作补充） |
| `tm-test-harness.js` | 新测试框架（2026-04-24 新增） |
| `tm-changelog.js` | 邸报 UI |
| `tm-changelog.json` | 更新日志数据 |

---

## 2. 重构优先级矩阵

| 优先级 | 目标 | 风险 | 收益 | 预估工时 |
|-------|-----|-----|-----|---------|
| **P0** | 把新代码强制走 DA / Schema | 极低 | 高 | 持续 |
| **P1** | 合并 `guoku-p2/p4/p5/p6` | 中 | 极高 | 80h |
| **P1** | 合并 `var-drawers / -ext / -final` | 低 | 中 | 15h |
| **P1** | 合并 `corruption-p2/p4` | 中 | 高 | 30h |
| **P2** | 拆分 `tm-chaoyi-keju.js` 为两文件 | 中 | 高 | 40h |
| **P2** | 把 `tm-phase-f4-authority-deep.js` 等 F/G 补丁归位 | 中 | 高 | 60h |
| **P3** | 拆 `tm-endturn.js` 为 4 个子模块 | 极高 | 中 | 200h |
| **P3** | 把 `tm-patches.js` 里的 monkey patch 归位 | 极高 | 高 | 150h |
| **P3** | 更多 GM 字段接入 DA（armies/authority/harem...） | 低 | 中 | 40h |
| **P4** | JSDoc + d.ts 发布 | 低 | 中 | 80h |

**"持续"**：每次新增代码时，强制走 DA / Schema，不是一次性重构。

---

## 3. tm-endturn.js 长远拆分草案（P3）

```
tm-endturn.js (18,618 行)
  ↓ 拆分为：
  tm-endturn-collect.js    ~1500 行 · Phase A 收集玩家输入
  tm-endturn-prompt.js     ~4000 行 · Phase B prompt 构建（最大一片）
  tm-endturn-ai.js         ~2000 行 · Phase C AI 调用 + 1b/1c 并行
  tm-endturn-apply.js      ~5000 行 · Phase D 应用变更（p1.* 处理）
  tm-endturn-systems.js    ~3000 行 · Phase E 子系统推进调度
  tm-endturn-record.js     ~1500 行 · Phase F 记录归档（已有 render.js）
  tm-endturn.js            ~1000 行 · 主入口，调用以上各步
```

**风险**：
- `tm-endturn.js` 内部大量跨 phase 闭包变量共享（_tier1/_hardConstraints/_changeSummary 等）
- 拆分需要把这些变量显式 passing，重构量大
- 每拆一块必须通过完整 smoke test

**先决条件**（必须先做）：
1. TM_AI_SCHEMA 稳定（已完成 ✓）
2. TM.validateAIOutput 覆盖所有子调用（当前只覆盖 subcall1）
3. 测试框架 + 至少 20 个 endturn 路径的 smoke test（框架已有 ✓，测试待补）

---

## 4. 应急规则

> 项目已经到了"新增时慢但现状可维护"阶段。不要冒进重构核心。

**可以立即做的**：
- 新代码强制走 DA / Schema（不破坏现有）
- 新增 AI 字段必先在 `tm-ai-schema.js` 声明
- 新增 GM 字段必在 `ARCHITECTURE.md` 表 §4 补上
- 新增 `catch` 块必加 `console.warn` 至少一行
- 新增任何功能的 PR 必同时写一个 `TM.test.describe` smoke test

**不要做**：
- 把 `tm-patches.js` 一次性拆散
- 把 `tm-endturn.js` 大规模拆分（除非有 P3 的先决条件）
- 删除任何 `tm-phase-*` 文件（先确认其内容已归位）
- 新建 `xxx-p2.js / xxx-p4.js` 风格的补丁文件
