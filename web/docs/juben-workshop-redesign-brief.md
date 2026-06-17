# 剧本工坊 UI 重设 · 准备 brief

> 状态：**准备阶段**（2026-06-02）。范围＝整个剧本工坊；性质＝范式重构 + 视觉换肤（两者都要）；驱动＝四个痛点全中。
> 当前编辑器＝`preview/scenario-editor-reset-preview.html` + `scenario-editor-reset-app.js`（Codex 留下、~110 slice、已修 smoke 假红、浏览器实跑干净）。
> **本文是 brief，不是已批方案。范式 fork（§6）待 owner 拍。**

---

## 1. 背景

剧本工坊是天命的剧本制作台，编辑游戏的原生 scenario JSON（编辑器↔运行时 1:1，无转换层）。它是"宪法制定者"，游戏是"历史演绎者"。本轮要把它从一个**巨型单列滚动表单**重铸成对齐游戏御案范式、以 AI 为中心的创作台。

## 2. 现状 · 三层 audit（surface / function / mechanic）

### 2.1 视觉层（现编辑器）
- 暗色磨砂玻璃 + 做旧帝国羊皮纸；墨底金线，**宋体**通铺；jade(AI)/indigo(状态)/cinnabar(错误) 三色语义。
- Palette：`--ink #17130d` · `--paper #eadcb8` · `--gold #caa24c` · `--jade #5f9d8c` · `--cinnabar #b64232` · `--indigo #364e76`。
- **token 极穷**：颜色/字号/间距全硬编码，字面 `rgba()` 重复数百次；无 spacing/radius/font token。圆角 8px；磨砂 blur 满屏。
- 三列：左 9 模块 rail（230–270px，sticky 内滚）｜中 `.main-stack` 巨型滚动｜右 inspector（300–380px，sticky 内滚）。两 rail 可塌到 52px。

### 2.2 功能/信息架构层
- **9 顶级模块**（左 rail）：剧本总览·人物·势力·朝廷制度·行政区划·经济人口·军务·事件·规则AI。每模块圈一组 scenario 顶级 key。
- **3 层 hierarchy**：模块 → 字段组 → 字段。**但字段组层只对人物/势力/区划三类实体存在**（各 6/6/2 组），其余 ~90 字段是无分组的 chip 云。← 层级不一致的根。
- 中心 `renderDetailApp` 一次 innerHTML 吐出"字段云 + ~10 个 workbench 面板"全堆叠；`renderStructuredWorkbench` 是 ~40 路 `if` 级联，每模块中心体高度差异巨大。无锚定字段导航，靠 Slice 85 加的文本搜索兜。
- **两套互不相干的 AI 子系统**：①浮层 BYOK agent（`#tm-aa-fab` 右下浮按钮 → 380px 私有面板，自带 transcript/diff/validate，`adapter.commit` 提交）；②in-app 字段草稿队列（`simulateAiDraft`/`acceptDraft`，自带另一套 diff 渲染）。各有重复 diff/审阅 UI，都在边缘。
- 右 rail `runtime-field-audit`（`RUNTIME_FIELD_SURFACES` 100+ 行）＝**权威的"游戏真读哪些字段"交叉核对**，标注每个 key 的运行时读点 + 出处（启/宋/旧编辑器）。

### 2.3 机制/数据层（**不可动的地基**，见 §4）
- **存档＝clone-then-overlay**：`state.scenario = clone(DATA.scenario)`，~50 个 `save*` 原地 overlay，从不从 0 重建；`absorbOrphanScenarioKeys` 兜蓝图外 key。✅ 符合既定铁律。
- **schema 1:1 映射运行时 JSON**，导出 verbatim，无 rename/transform。
- **双方言**：天启 v48（array variables/string globalRules/flat admin）vs 绍宋 v1.6（kinded variables/array globalRules/recursive admin），多处兜底 alias。
- **AI agent 沙箱隔离**：deep-copy draft、墙开 window/GM/FS、BLOCKED 路径表（id/`_*`/ai/conf/meta），NL→draft→diff→人审→`应用到剧本` 才落，绝不自动写。
- **地图编辑器是独立窗口**（`map-editor.html`），区划/地图模块 #5 部分外派 → `detectRisks` 已标 `map-editor-link-split-brain`。重设导航须处理。

## 3. 痛点 → 设计目标

| # | 痛点 | 根因（audit 实证） | 设计目标 |
|---|---|---|---|
| 1 | 整页太长/难定位 | 中心一次堆叠 9 面板 + 23 子面板（~11000+7866px）；无结构性分区，只有 bolt-on 滚动条+搜索 | **杀掉巨型单列滚动**：中心一次只聚焦一个模块/一件事 |
| 2 | 视觉跟游戏不统一 | 编辑器用宋体/8px圆角/磨砂/自造硬编码色；游戏用楷体/方角/雕版/styles.css token 体系 + 御案隐喻 | **视觉收敛到游戏 styles.css token + 御案视觉词汇**（§5） |
| 3 | AI 写剧本不够中心 | 两套 AI 子系统都在边缘（浮层 FAB + 草稿队列），各自重复 diff | **把 NL→草稿→diff→纳入 提升为主画布**，并统一两套 |
| 4 | 信息密度/层级乱 | 字段组中层只对 3 类实体存在；完成度信号散在 3 处（tile 进度条/云 presence/右 rail 审计）冗余无权威 | **统一三层 hierarchy**（每模块都有字段组）+ **单一完成度真源**（收口到 runtime-field-audit） |

## 4. 不可动的地基（重设必须保留）

1. 存档 clone-then-overlay，禁从 0 重建。
2. schema 1:1 运行时 JSON，无转换层，导出 verbatim。
3. 双方言（天启/绍宋）+ 兜底 alias + orphan key 存活。
4. AI agent 沙箱隔离 + 人审才落（哪怕 AI 变中心，"不自动写"不变）。
5. runtime-field-audit 作为"游戏真读什么"的权威核对，重设里应**升为完成度真源**，而非又一个冗余面板。
6. 重写任何导出/显示段，**前后 grep 中文 token 数比对**，防 LLM 顺手把 display name 译成英文。

## 5. 视觉收敛方案（确定项 · 锚＝游戏 styles.css）

游戏已有**正规 token 体系**（`styles.css :root`），编辑器只有硬编码。收敛＝编辑器改用游戏 token：

| 语义 | 编辑器现值 | 游戏目标 token | 动作 |
|---|---|---|---|
| 墨底 | `--ink #17130d` | `--ink-800 #12100e`（御案桌 `#120a05`） | 接 ink ramp（50→900） |
| 纸字 | `--paper #eadcb8` | `--ink-50 #f8f3e8` / `--color-foreground` | |
| 金 | `--gold #caa24c` | `--gold-400 #b89a53`（+300/500/600） | |
| AI/创作 | `--jade #5f9d8c` | `--celadon-400 #7eb8a7` | **jade→celadon** |
| 错误/校验 | `--cinnabar #b64232` | `--vermillion-400 #c04030` | |
| 状态/日志 | `--indigo #364e76` | `--indigo-400 #4a6fa5` | |
| 正文字体 | 宋体 Noto Serif SC | **楷体** STKaiti（`--font-serif`） | 宋→楷 |
| 圆角 | 8px | 0–6px（方/雕版） | 收方 |
| 质感 | 磨砂 blur | 雕版 inset bevel + raster PNG underlay | 换质感语言 |

**御案视觉词汇**可借用：金线方牌（右 rail 国事 slot 风）、雕版 inset bevel、倾斜折子（action card 诏奏书录）、卷轴杆 ribbon、L 角封印记、竖排 vertical-rl 标签、楷体宽字距。**先建编辑器自己的 token 层（映射到游戏值），不直接 import 游戏 CSS**（两边 review 路径不混，scope strict）。

## 6. 范式 fork（**已拍 · D** · owner 2026-06-02）

**选定 D 推荐混合**：御案视觉外壳 + 国事右 rail + **案侧常驻国师** ⊕ **单模块聚焦中心** ⊕ 统一并前置的 AI 草稿环。四痛点一次全治，**直接手编与 AI 两条路并存**（不像 C 弱化手编）。
```
┌国事右rail┐┌─── 单模块聚焦工作台 ───┐┌─案侧国师(常驻AI)─┐
│纲 政 文 ││ 人物·朝堂                ││ 你:加三东林谏官  │
│臣 军 图 ││ [身份|家族|官职|AI人格] ││ 国师:[diff预览]   │
│户 闻 制 ││ ┌字段组卡┐ ┌字段组卡┐  ││  纳入? 弃?       │
│(竖楷雕版)││ └────────┘ └────────┘  ││ (浮层FAB收编于此)│
└─────────┘└─只渲染当前模块·杀滚动─┘└─案侧·非右下浮层─┘
```
被否的：A（壳不动·御案隐喻不到位）、B（全折子隐喻·概念跳跃过大）、C（对话压字段·手编弱化有风险）。三者留档备查。

## 7. 保守拆分执行计划（按 D 展开 · 每刀一件事）

> 顺序＝先安全后结构：视觉/token 先落且可独立验，再动中心范式，最后收口。每刀独立 smoke + playwright 实跑验；**全程不 ship/git，直到整套验收**（沿用科举那条纪律）。

| 刀 | 内容 | 动什么 / 不动什么 | 验收 |
|---|---|---|---|
| **1 Token 地基** | 建编辑器 token 层（`--je-*` 之类，值映射游戏 styles.css）：jade→celadon、cinnabar→vermillion、gold/ink 接 ramp、宋→楷、圆角收方。**不直接 import 游戏 CSS**。 | 只换 CSS 变量定义 + 把硬编码 rgba 逐步指回 token；DOM 结构 0 动 | 视觉 diff + 现有 smoke 全绿 + grep 中文 token 数前后一致 |
| **2 御案外壳** | 壳的视觉词汇换成御案：topbar 黄铜 cartouche、左模块 rail → 国事方牌雕版 + 竖排楷体、桌面木纹质感、磨砂→inset bevel。 | 三列骨架/交互不变，纯换皮 | playwright 截图比对御案；交互回归 |
| **3a 单模块聚焦** | 中心**只渲染选中模块**，停掉"一次堆叠 9 面板 + 10 workbench"；杀掉巨型滚动。 | 改 `renderDetailApp` 渲染边界；存档/字段逻辑不动 | 新 smoke：切模块只出当前模块 DOM；滚动高度断言 |
| **3b 字段组中层补齐** | 给**每个模块**都建字段组层（现只人物/势力/区划有），字段组做成分区卡/tab；统一三层 hierarchy。 | 扩 field-group 定义；schema/存档不动 | 每模块字段组覆盖断言 |
| **4 AI 中心化** | 统一两套 AI 子系统（浮层 FAB + in-app 草稿队列）为**一个案侧常驻国师**，一条 NL→草稿→diff→纳入 管线并前置。 | **保留沙箱隔离 + 人审才落**；合并重复 diff 渲染 | 沙箱/人审 smoke 不破；单一 diff 管线断言 |
| **5 完成度收口** | runtime-field-audit 升为**单一完成度真源**，tile 进度/云 presence 改为读它（去冗余）。 | 完成度计算收口；不新增面板 | 完成度三处一致性断言 |

**横切注意**：① 地图模块 #5 是独立窗口（`map-editor.html`），3a 聚焦时要决定"打开地图编辑器"在单模块台里怎么摆（别又制造 split-brain）。② 每刀都先读后改（reset-app.js 1.1MB，grep 定位别整读）。③ 重写显示/导出段前后 grep 中文 token 比对，防顺手翻译。
