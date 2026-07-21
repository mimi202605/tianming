# 穿越模式非皇帝 UI 重设计 · Design Spec

> **设计日期**：2026-07-19
> **设计依据**：穿越模式 Phase 1-7 已完成（PR #8）·玩家可扮演除皇帝外的任意角色
> **痛点**：当前穿越模式 UI 只是"皇帝模式外壳上贴分支文案"——顶栏 7 大变量、御案 5 tab、CSS 全部沿用皇帝模式；玩家身份/官职/地点未在顶栏展示；14 大玩家专属系统无御案 tab 入口（仅靠控制台访问）；皇帝 AI 决策无弹窗；"奉旨卡片"无独立渲染
> **目标**：为非皇帝角色重新设计一套镜像 UI——双轨渲染、场景化 tab、身份主题色、奉旨卡片浮层，让玩家"一眼看出我不是皇帝"
> **范围**：Phase A（核心 UI 重构）+ Phase B（增量功能）·每个阶段独立 PR

---

## §1 · 整体架构与文件清单

### 1.1 双轨渲染分派

`tm-game-ui-shell.js::renderGameState()` 顶部加 3 行分派逻辑：

```javascript
function renderGameState() {
  var _pi = P.playerInfo || {};
  var _isTrans = _pi.transmigrationMode === true && _pi.playerRole && _pi.playerRole !== 'emperor';
  if (_isTrans) return renderPlayerState();
  return renderEmperorState();
}
```

- 原 `renderGameState` 主体改名为 `renderEmperorState`（皇帝模式代码零改动）
- 新增 `renderPlayerState` 调用 `TM.PlayerUI.*` 系列
- 调用方（`enterGame` / `endTurn` 末尾）零改动

### 1.2 新增 4 个文件

| 文件 | 职责 | 主要导出 |
|------|------|---------|
| `web/tm-player-ui-render.js` | 穿越模式主渲染：顶栏玩家身份条、7 场景 tab 树、主面板按场景渲染、右栏玩家身份卡 | `TM.PlayerUI.renderTopBar()` / `renderLeftTabs()` / `render(sceneKey)` / `renderRightPanel()` / `setAiLiveStatus(state)` |
| `web/tm-player-ui-edict-card.js` | "奉旨卡片"浮层组件：顶部滑下 toast + 详情模态 | `TM.PlayerEdictCard.show(entry)` / `expand(entryId)` / `dismiss()` |
| `web/tm-player-systems-ui.js` | 14 大玩家系统御案 tab 集中渲染入口 | `TM.PlayerSystemsUI.scenesForRole(role)` / `renderTab(sceneKey, role)` / `renderBlock(systemKey)` / `bindEvents(sceneKey)` / `hasUpdate(sceneKey)` |
| `web/tm-transmigration-ui.css` | 穿越模式专属 CSS：5 套身份主题色变量、`src-*` chip 样式、玩家身份条/奉旨卡片/7 场景 tab 视觉 | CSS 变量 `--player-civil` / `--player-royal` / `--player-merchant` / `--player-martial` / `--player-monastic` |

### 1.3 修改 5 个既有文件（皇帝模式零回归）

| 文件 | 改动点 |
|------|-------|
| `tm-game-ui-shell.js` | 顶部加 `_isTrans` 分派；现 `renderGameState` 主体改名为 `renderEmperorState`；新增 `renderPlayerState` 调 `TM.PlayerUI.render()` |
| `tm-topbar-vars.js` | 顶部加 `_isTrans` 早返回，穿越模式由 `TM.PlayerUI.renderTopBar()` 接管 |
| `tm-shiji-qiju-ui.js` | `renderQiju()` 中玩家上奏批答条目调 `TM.PlayerEdictCard.show(entry)` 主动推送 |
| `tm-transmigration.js` | `_ROLE_CHANGE_PATHS` 增加 `label`/`desc` 字段供 UI 展示；新增 `getRoleChangePaths(role)` 公开 API |
| `index.html` | 顶栏新增 `bar-player-identity` DOM 节点；左栏 `#gl` 内新增 `player-left-tabs` 容器；右栏 `#gr` 内新增 `player-right-panel` 容器；加载 4 个新 `<script>` + 1 个新 `<link>` |

### 1.4 架构层次图

```
renderGameState()  ←  tm-game-ui-shell.js（分派入口）
  │
  ├─ if (_isTrans) return renderPlayerState()   ← 新·穿越模式
  │     │
  │     ├─ TM.PlayerUI.renderTopBar()           ← tm-player-ui-render.js
  │     │     ├─ bar-player-identity（玩家身份条）
  │     │     └─ bar-vars 精选 3-4 变量
  │     │
  │     ├─ TM.PlayerUI.renderLeftTabs()         ← tm-player-ui-render.js
  │     │     └─ #player-left-tabs 7 场景 tab
  │     │
  │     ├─ TM.PlayerUI.render(sceneKey)         ← tm-player-ui-render.js
  │     │     └─ #gc 主面板（按选中场景渲染）
  │     │           └─ TM.PlayerSystemsUI.renderTab(sceneKey, role)  ← tm-player-systems-ui.js
  │     │
  │     └─ TM.PlayerUI.renderRightPanel()       ← tm-player-ui-render.js
  │           └─ #player-right-panel（玩家身份卡+人物志+编年）
  │
  └─ else return renderEmperorState()           ← 原 renderGameState 主体改名
        └─（皇帝模式代码零改动）
```

### 1.5 双轨分派带来的隔离保证

- 穿越模式所有新增 UI 代码都在 4 个新文件里
- 皇帝模式走 `renderEmperorState` 一行不改
- CSS 通过 `.transmigration-mode` 根类名空间隔离，不影响皇帝模式样式

---

## §2 · 顶栏玩家身份条 + 精选变量

### 2.1 玩家身份条 DOM 结构

在 `index.html` 顶栏新增 `bar-player-identity` 节点，置于 `bar-era-stack` 之上（皇帝模式隐藏，穿越模式显示）：

```
顶栏（穿越模式）
┌──────────────────────────────────────────────────────────────────────────┐
│ bar-player-identity                                                       │
│   ├─ player-portrait       玩家头像（按 playerRole 取 ICON）              │
│   ├─ player-name           玩家姓名（"赵孟頫"）                           │
│   ├─ player-role-chip      身份徽章（"朝臣·翰林学士"·按主题色着色）        │
│   ├─ player-divider        分隔符                                         │
│   ├─ player-location       所在地（"京师·翰林院"）                        │
│   ├─ player-clan           家族（"赵氏·三代书香"）                        │
│   ├─ player-age            年龄（"年四十二"）                             │
│   └─ player-sovereign      当今君主（"君主·朱由检"）                      │
└──────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────┐
│ bar-era-stack（保留）   bar-dynasty / bar-date / bar-turn-text           │
│   bar-weather           节气物候                                          │
│   bar-vars              精选 3-4 变量（详见 2.2）                          │
│   bar-ai-live           AI 推演徽章（语义切换·详见 2.3）                   │
│   bar-time              时间                                              │
│   bar-btns              功能按钮                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

皇帝模式下 `bar-player-identity` 设 `display:none`，不影响原顶栏布局。

### 2.2 精选变量（3-4 个·按 playerRole 切换）

不再硬编"帑廪/内帑/户口/吏治/民心/皇权/皇威"7 个皇帝模式变量。改为按 playerRole 选 3-4 个：

| playerRole | 精选变量 1 | 精选变量 2 | 精选变量 3 | 精选变量 4 |
|-----------|-----------|-----------|-----------|-----------|
| `minister` / `general` / `regent` | 官声（上级评价） | 俸禄（个人银钱） | 吏治（地方治理） | 势力（派系权重） |
| `prince` | 封邑（封国收入） | 宗禄（宗室俸禄） | 宗籍（宗室地位） | 皇恩（君主信任） |
| `custom`（后宫内命） | 宠爱（君主恩宠） | 宫权（内廷权力） | 子嗣（皇嗣数） | 风险（宫斗危机） |
| `merchant` | 家资（个人银钱） | 商誉（商队信誉） | 商路（活跃路线数） | 风险（市舶司调查） |
| `eunuch` | 君主信任 | 内廷权力 | 外朝张力 | 阉党声势 |
| `maid` | 主位宠爱 | 宫女品级 | 消息流通 | 宫斗风险 |
| `commoner` | 家资 | 名声 | 关系网 | 风险 |
| `bandit` | 山寨大小 | 喽啰数 | 声威 | 围剿压力 |
| `monk` | 戒行 | 信众 | 寺产 | 风险 |
| `artisan` | 技艺 | 名声 | 银钱 | 风险 |
| `infant` | 健康 | 早慧度 | 监护人 | 家族期待 |
| `retired_official` | 余威 | 名声 | 银钱 | 起复概率 |
| `actor` | 技艺 | 名声 | 恩客 | 风险 |

> playerRole 枚举严格对齐 [tm-transmigration.js](file:///workspace/web/tm-transmigration.js) `ROLE` 常量（15 可选 + emperor 不可选 = 16 种）。无 `consort`/`student` 单独枚举——后宫内命归入 `custom`，布衣读书人归入 `commoner`（由 `COMMONER_PATHS.STUDY` 走科举转 minister）。
>
> ⚠️ **注意**：[ARCHITECTURE.md](file:///workspace/web/ARCHITECTURE.md) §11.7 写的 16 种枚举里包含 `consort`/`student`（缺 `custom`/`actor`），与 [tm-transmigration.js](file:///workspace/web/tm-transmigration.js) 的 `ROLE` 常量不同步。本 spec 以代码实际 `ROLE` 常量为准；ARCHITECTURE.md §11.7 的文档同步问题作为 Phase A 收尾的旁支任务（在 A1 任务中顺手修正文档）。

**实现**：`tm-player-ui-render.js::_varsForRole(role)` 返回 `[{key, label, value, icon, alert?}]`，调用既有 `GM._playerEconomy.cash` / `GM._playerPrivateArmy.readiness` / `GM._playerRebel.prepProgress` 等玩家专属账本（**不读 GM.guoku/GM.huangwei 等皇帝模式字段**）。

每个角色顶栏显 3-4 个变量；若剧本 hook 注入了第 5+ 个变量，则进抽屉（`bar-more-vars` 复用）。

### 2.3 `bar-ai-live` 语义切换

皇帝模式：`AI 推演中`（绿色脉动点）

穿越模式分两种状态：
- **君主 AI 决策中**：金色脉动点 + "君主圣裁中" 文案
- **NPC 演化中**：灰色脉动点 + "市井演化中" 文案

由 `TM.PlayerUI.setAiLiveStatus(state)` 控制，在 `TM.SovereignAI.runTurn` 前后调用。

### 2.4 顶栏不再显示的内容

穿越模式下顶栏**移除**（设 `display:none` 或不渲染）：
- `bar-more-vars`（剧本自定义变量入口·多为皇帝模式语境）
- `bar-todo-badge`（皇帝模式的待办语义）
- `bar-vars` 中 7 大皇帝变量

---

## §3 · 左栏 7 场景 tab 树

### 3.1 7 大场景 tab

左栏 `#gl` 在皇帝模式下保持原 5 大分类（政务/问答/纪录/臣子/文考）。穿越模式下，左栏内新增 `#player-left-tabs` 容器（皇帝模式 `#gl` 主体隐藏），渲染 7 大场景 tab（5 个常规 + 特殊 + 身份演进）：

```
左栏（穿越模式·#player-left-tabs）
┌────────────────────────────┐
│ 🏠 私宅                     │ ← PlayerFamily + PlayerMarriage + PlayerEconomy + PlayerIndustry
│   ├─ 家族                   │
│   ├─ 婚姻                   │
│   ├─ 私产                   │
│   └─ 产业                   │
├────────────────────────────┤
│ 📜 公务                     │ ← 上奏/朝议/廷推/官制/科举/AnnualReview
│   ├─ 上奏（奏疏）           │
│   ├─ 朝议（列朝）           │
│   ├─ 廷推                   │
│   ├─ 官职                   │
│   ├─ 科举（仅 commoner·STUDY 分支） │
│   └─ 考课                   │
├────────────────────────────┤
│ 🤝 交际                     │ ← PlayerInteraction + 鸿雁传书
│   ├─ 人物互动               │
│   ├─ 书信                   │
│   └─ 联姻                   │
├────────────────────────────┤
│ 📚 修行                     │ ← PlayerTech + PlayerSkill + PlayerKeju
│   ├─ 科技研发               │
│   ├─ 修习（学塾/拜师）      │
│   └─ 游学                   │
├────────────────────────────┤
│ ⚔️ 势力                     │ ← PlayerPrivateArmy + PlayerRebel + PlayerTrade + PlayerMovement + PlayerReclaim
│   ├─ 私军                   │
│   ├─ 商队                   │
│   ├─ 移动                   │
│   ├─ 开垦                   │
│   └─ 反叛筹备               │
├────────────────────────────┤
│ 🎭 特殊                     │ ← PlayerSpecialIdentity（仅 eunuch/maid/bandit/monk/infant/retired/artisan/actor）
│   └─ 身份专有动作           │
├────────────────────────────┤
│ 👤 身份演进                 │ ← triggerRoleChange 路径表
│   └─ 可走变更路径列表       │
└────────────────────────────┘
```

**7 大场景 tab**（5 常规 + 特殊 + 身份演进，按角色可见性过滤）。

### 3.2 角色可见性矩阵

`TM.PlayerSystemsUI.scenesForRole(role)` 返回该角色可见的场景数组：

| playerRole | 私宅 | 公务 | 交际 | 修行 | 势力 | 特殊 | 身份演进 |
|-----------|------|------|------|------|------|------|---------|
| `emperor` | — | — | — | — | — | — | — |
| `regent` | ✓ | ✓（含代诏） | ✓ | ✓ | ✓ | — | ✓ |
| `minister` | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| `general` | ✓ | ✓（含请旨出征） | ✓ | ✓ | ✓（私军） | — | ✓ |
| `prince` | ✓ | ✓（含朝贡上表） | ✓ | ✓ | ✓ | — | ✓ |
| `custom`（后宫内命） | ✓ | — | ✓ | ✓ | — | — | ✓ |
| `merchant` | ✓ | — | ✓ | ✓ | ✓（商队/产业/开垦） | — | ✓ |
| `eunuch` | ✓（养子/义子） | ✓ | ✓ | ✓ | — | ✓（内廷权力） | ✓ |
| `maid` | — | — | ✓ | ✓ | — | ✓（宫女晋升） | ✓ |
| `commoner` | ✓（含读书考科举） | ✓（仅 STUDY 路径走科举） | ✓ | ✓ | ✓ | — | ✓ |
| `bandit` | ✓ | — | ✓ | ✓ | ✓（山寨/喽啰） | ✓ | ✓ |
| `monk` | ✓（寺产） | — | ✓ | ✓ | — | ✓ | ✓ |
| `artisan` | ✓ | — | ✓ | ✓ | ✓（作坊） | ✓ | ✓ |
| `infant` | ✓（监护人代行） | — | — | — | — | ✓（自动成长） | ✓（成年后转身份） |
| `retired_official` | ✓ | ✓（被起复） | ✓ | ✓ | — | ✓ | ✓ |
| `actor` | ✓ | — | ✓ | ✓ | — | ✓ | ✓ |

注 1：`infant` 大部分场景不可见，仅"特殊·自动成长"+ 身份演进（成年后转 minister/general/prince 等）。
注 2：`commoner` 走 `COMMONER_PATHS.STUDY` 分支时才显"公务·科举"入口（`PlayerKeju`），其他分支（经商/务农/投军/江湖/隐居）不显科举。
注 3：playerRole 枚举严格对齐 [tm-transmigration.js](file:///workspace/web/tm-transmigration.js) `ROLE` 常量（15 可选 + emperor 不可选）。

### 3.3 tab 视觉

每个场景 tab 用 ICON + 标签 + 红点（有新事件时）：
- 私宅 🏠 / 公务 📜 / 交际 🤝 / 修行 📚 / 势力 ⚔️ / 特殊 🎭 / 身份演进 👤

红点由 `TM.PlayerSystemsUI.hasUpdate(sceneKey)` 判定（查 `GM._playerFamily.updated` / `GM._playerRebel.readiness` 变化等）。

### 3.4 左栏皇帝模式分支的隔离

```javascript
// tm-game-ui-shell.js 顶部
function renderGameState() {
  var _pi = P.playerInfo || {};
  var _isTrans = _pi.transmigrationMode === true && _pi.playerRole && _pi.playerRole !== 'emperor';
  if (_isTrans) return renderPlayerState();
  return renderEmperorState();
}

function renderPlayerState() {
  document.getElementById('gl').classList.add('hidden-emperor');     // 隐藏皇帝左栏
  document.getElementById('player-left-tabs').classList.remove('hidden-emperor');
  document.getElementById('gr').classList.add('hidden-emperor');     // 隐藏皇帝右栏
  document.getElementById('player-right-panel').classList.remove('hidden-emperor');
  document.body.classList.add('transmigration-mode');                // CSS 根类
  document.body.classList.add('player-role-' + _pi.playerRole);      // 主题色类
  TM.PlayerUI.renderTopBar();
  TM.PlayerUI.renderLeftTabs();
  TM.PlayerUI.render('home');   // 默认进"私宅"或"公务"
  TM.PlayerUI.renderRightPanel();
}
```

`hidden-emperor` 是 CSS 类，皇帝模式下 `#player-left-tabs` / `#player-right-panel` 默认 hidden-emperor，穿越模式下加到 `#gl` / `#gr`。

---

## §4 · 主面板（#gc）按场景渲染 + 14 系统接入

主面板 `#gc` 不再用皇帝模式的"诏令 textarea + 5 类分类 + 帝王私行块"渲染。改为：选中哪个场景 tab，主面板就渲染那个场景的内容。

### 4.1 各场景主面板内容

#### 🏠 私宅场景

```
#gc（私宅）
┌─────────────────────────────────────────────────────────────────┐
│ 【家族】                                            [刷新]         │
│  ├─ 父母：父亲 赵某（致仕·在乡）/ 母亲 李氏（康健）              │
│  ├─ 兄弟：兄 赵甲（同朝为官） / 弟 赵乙（游学）                 │
│  ├─ 配偶：妻 王氏（贤良·婚后 5 年）                              │
│  ├─ 子女：子 赵丙（5 岁·启蒙中） / 女 赵丁（3 岁）              │
│  └─ 宗族：赵氏·三代书香·宗族声望 65                              │
│                                                                  │
│ 【婚姻】                                                         │
│  ├─ 当前状态：已婚                                               │
│  ├─ 配偶档案：王氏 / 22 岁 / 父王尚书 / 性格贤淑                 │
│  └─ 动作：[纳妾] [和离] [为子女议亲]                             │
│                                                                  │
│ 【私产】                                                         │
│  ├─ 银钱：1240 两（含本月俸禄 80 两）                            │
│  ├─ 灰色收入：本月受贿 200 两（吏治腐败风险 +5）                 │
│  ├─ 产业：酒楼×1（月入 30 两）/ 当铺×1（月入 20 两）            │
│  └─ 动作：[购产业] [放贷] [囤货]                                 │
│                                                                  │
│ 【产业】                                                         │
│  ├─ 庄园：杭州·中庄·投产·月产粮 50 担                           │
│  ├─ 农场：扬州·小庄·施工中（剩 2 月）                           │
│  └─ 动作：[选址新建] [经营] [升级]                               │
└─────────────────────────────────────────────────────────────────┘
```

每个区块由 `TM.PlayerSystemsUI.renderBlock(systemKey)` 渲染，调对应系统的 `list()` / `state()` API。

#### 📜 公务场景

```
#gc（公务）
┌─────────────────────────────────────────────────────────────────┐
│ 【上奏】臣 赵孟頫 谨奏                                          │
│  ┌────────────────────────────────────────────────┐             │
│  │ （奏疏 textarea 1·半文言文·300-800 字）        │             │
│  └────────────────────────────────────────────────┘             │
│  ┌────────────────────────────────────────────────┐             │
│  │ （奏疏 textarea 2·可选）                       │             │
│  └────────────────────────────────────────────────┘             │
│  奏疏类别：[陈情] [建言] [劾奏] [请旨] [谢恩]                    │
│                                                                  │
│ 【往期奏疏档案】                                                 │
│  ├─ 天启七年九月十二日·陈情·乞骸骨·奉旨：不许                   │
│  ├─ 天启七年八月三日·建言·请减免江南赋税·奉旨：下部议           │
│  └─ ...                                                          │
│                                                                  │
│ 【朝议列朝】（仅当君主开朝议时可见）                             │
│  └─ 当前议题：征辽粮草·[请旨发言]                                │
│                                                                  │
│ 【廷推】（仅当 playerRole 有廷推权时）                           │
│  └─ 当前推举：兵部尚书·候选 3 人·[荐举]                          │
│                                                                  │
│ 【官职】                                                         │
│  ├─ 现任：翰林学士·正五品·翰林院                                 │
│  ├─ 兼任：太子侍讲·从四品                                        │
│  └─ 权限：可荐举三品以下·不可任命                                 │
│                                                                  │
│ 【科举】（仅 commoner 走 STUDY 分支时）                          │
│  └─ 当前级别：乡试·下次：天启七年九月·[报名]                     │
│                                                                  │
│ 【考课】（仅 minister/general/regent）                           │
│  └─ 上年：中上·评语：勤勉供职·[查看详情]                         │
└─────────────────────────────────────────────────────────────────┘
```

#### 🤝 交际场景

```
#gc（交际）
┌─────────────────────────────────────────────────────────────────┐
│ 【人物互动】                                                     │
│  可互动 NPC：                                                    │
│  ├─ 王将军（死党·关系 80）[拜访] [密谈] [托付] [赠礼] [结义]    │
│  ├─ 李尚书（同僚·关系 60）[拜访] [赠礼]                          │
│  ├─ 张妃（枕边人·关系 90）[探望] [密谈]                          │
│  └─ ...                                                          │
│                                                                  │
│ 【书信】                                                         │
│  ├─ 收件：3 封未读·[查看]                                        │
│  └─ 写信：[撰书]                                                 │
│                                                                  │
│ 【联姻】                                                         │
│  ├─ 子女议亲：赵丙（5 岁）·可议亲 NPC 家族 5 家                  │
│  └─ 自身再婚：（若丧偶/和离）                                    │
└─────────────────────────────────────────────────────────────────┘
```

#### 📚 修行场景

```
#gc（修行）
┌─────────────────────────────────────────────────────────────────┐
│ 【科技研发】                                                     │
│  当前研发：农业线·良种选育·进度 60/100                           │
│  科技树：                                                        │
│  ├─ 农业：✓ 农具改良 → ▶ 良种选育 → 🔒 水利灌溉 → ...          │
│  ├─ 军事：🔒 冶铁锻造 → ...                                      │
│  └─ ...                                                          │
│  动作：[启动研发] [招匠人加速] [上奏推广] [私藏自用]             │
│                                                                  │
│ 【修习】                                                         │
│  ├─ 当前属性：学识 65 / 诗赋 50 / 算学 30 / ...                  │
│  ├─ 师承：师从 王大儒·经史加成 +20%                              │
│  └─ 动作：[入读学塾] [拜名师] [自学] [游学] [江湖习武] [修道礼佛]│
│                                                                  │
│ 【游学】（与 PlayerMovement 联动）                               │
│  └─ 当前地点：杭州·可游学地点：西湖书院 / 灵隐寺 / 岳王庙       │
└─────────────────────────────────────────────────────────────────┘
```

#### ⚔️ 势力场景

```
#gc（势力）
┌─────────────────────────────────────────────────────────────────┐
│ 【私军】                                                         │
│  ├─ 家丁 100 人·训练度 70·装备 良                                │
│  ├─ 门客剑士 20 人·训练度 90                                     │
│  └─ 动作：[招募] [训练] [装备] [护卫商队] [自卫]                 │
│                                                                  │
│ 【商队】                                                         │
│  ├─ 商队 1：京师→扬州·丝绸 50 匹·护卫 30·在途                   │
│  ├─ 商队 2：杭州→苏州·茶叶 30 担·护卫 10·到达·盈 200 两         │
│  └─ 动作：[组建商队] [派遣贸易]                                  │
│                                                                  │
│ 【移动】                                                         │
│  ├─ 当前位置：京师·翰林院                                        │
│  ├─ 移动状态：静止                                               │
│  └─ 动作：[发起移动] [选目的地] [选方式]                         │
│                                                                  │
│ 【开垦】                                                         │
│  ├─ 项目 1：杭州·中块·施工中·进度 50/100                         │
│  └─ 动作：[勘探荒地] [请许可] [施工]                             │
│                                                                  │
│ 【反叛筹备】（仅 prince/regent/general/minister/merchant）       │
│  ├─ 筹备度：军权 30 / 粮草 40 / 势力 20 / 舆论 10                │
│  ├─ 阈值：60                                                     │
│  └─ 动作：[笼络军权] [积累粮草] [联络势力] [制造舆论] [举事]     │
└─────────────────────────────────────────────────────────────────┘
```

#### 🎭 特殊场景（仅 eunuch/maid/bandit/monk/infant/retired/artisan/actor）

```
#gc（特殊·以 eunuch 为例）
┌─────────────────────────────────────────────────────────────────┐
│ 【内廷权力】                                                     │
│  ├─ 当前阶：CONTROL·把持内廷·君主信任 50                         │
│  ├─ 晋升路径：ATTEND → ▶ CONTROL → 🔒 SEAL → 🔒 REDBRUSH       │
│  └─ 动作：[讨好君主] [把持内廷] [勾结外臣] [阉党揽权]            │
│                                                                  │
│ 【养子/义子】                                                    │
│  └─ 动作：[收养义子]                                             │
└─────────────────────────────────────────────────────────────────┘
```

#### 👤 身份演进场景

```
#gc（身份演进）
┌─────────────────────────────────────────────────────────────────┐
│ 当前身份：朝臣·翰林学士                                          │
│                                                                  │
│ 可走变更路径：                                                   │
│  ├─ [告老] → 退休官员                                            │
│  │   条件：年龄 ≥ 60 或 健康恶化                                  │
│  │   后果：保留余威 + 失去官职                                    │
│  │                                                                │
│  ├─ [罢黜] → 退休官员（被罢）                                    │
│  │   条件：君主 AI 主动                                           │
│  │   后果：余威 -30 + 失去官职 + 编年史污点                       │
│  │                                                                │
│  └─ [夺嫡] → 宗室（仅当原为宗室·过继入继大宗时）                 │
│      条件：特殊事件                                               │
│      后果：playerRole 转 prince                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 14 大玩家系统接入御案 tab 的映射

| 系统 | 接入场景 | 接入区块 |
|------|---------|---------|
| `PlayerInteraction` | 交际 | 人物互动 |
| `PlayerEconomy` | 私宅 | 私产 |
| `PlayerTrade` | 势力 | 商队 |
| `PlayerTech` | 修行 | 科技研发 |
| `PlayerFamily` | 私宅 | 家族 |
| `PlayerMarriage` | 私宅 | 婚姻 |
| `PlayerPrivateArmy` | 势力 | 私军 |
| `PlayerMovement` | 势力 | 移动 |
| `PlayerIndustry` | 私宅 | 产业 |
| `PlayerReclaim` | 势力 | 开垦 |
| `PlayerKeju` | 公务 | 科举 |
| `PlayerAnnualReview` | 公务 | 考课 |
| `PlayerRebel` | 势力 | 反叛筹备 |
| `PlayerSkill` | 修行 | 修习 + 游学 |
| `PlayerSpecialIdentity` | 特殊 | 身份专有动作 |

### 4.3 主面板渲染入口

```javascript
// tm-player-ui-render.js
TM.PlayerUI.render = function(sceneKey) {
  var html = TM.PlayerSystemsUI.renderTab(sceneKey, _pi.playerRole);
  document.getElementById('gc').innerHTML = html;
  TM.PlayerSystemsUI.bindEvents(sceneKey);  // 绑定按钮事件
  GameHooks.run('renderPlayerState:after', { sceneKey: sceneKey });
};
```

---

## §5 · 右栏玩家身份卡 + 奉旨卡片浮层

### 5.1 右栏玩家身份卡

皇帝模式右栏 `#gr` 保持原内容（人物志/编年等）。穿越模式下 `#gr` 主体隐藏，内嵌的 `#player-right-panel` 显示，置顶是"玩家身份卡"：

```
#player-right-panel
┌────────────────────────────────────────────────┐
│ 【玩家身份卡】                                  │
│  ┌──────┐                                       │
│  │头像  │  赵孟頫                              │
│  │ICON  │  朝臣·翰林学士·正五品                │
│  └──────┘  年 42 · 男 · 赵氏·三代书香          │
│            现居：京师·翰林院                    │
│            性格：温润·好学·清流                 │
│            君主：朱由检·年号崇祯                │
│                                                │
│  【近况】                                       │
│   ├─ 天启七年九月·考课·中上                     │
│   ├─ 天启七年八月·上奏·请减免江南赋税·下部议   │
│   └─ 天启七年七月·生子赵丙                     │
│                                                │
│  【人际关系 TOP 5】                             │
│   ├─ 王将军·死党·80                             │
│   ├─ 李尚书·同僚·60                             │
│   ├─ 张妃·枕边人·90                             │
│   ├─ 师王大儒·师徒·95                           │
│   └─ 赵乙（弟）·血亲·85                         │
└────────────────────────────────────────────────┘

（身份卡下方仍保留编年史精简版 + 起居注时间线·但只显示与玩家相关条目）
```

由 `TM.PlayerUI.renderRightPanel()` 渲染，调 `P.playerInfo` + `GM._playerFamily` + `GM._playerInteraction.relations` + `GM.qijuHistory`（按 source=player 过滤）。

### 5.2 奉旨卡片浮层组件

玩家上奏后，君主 AI 批答到达时，**顶部滑下 toast**：

```
┌─────────────────────────────────────────────────────────────────┐
│ 📜 奉旨卡片                                  [展开详情] [×]      │  ← 顶部滑下
│  臣 赵孟頫 奏请减免江南赋税·奉旨：下部议                       │
│  批语：卿言有理·然国用方殷·下部议覆奏                          │
│  品语：君主态度·从善如流·君主信任 +5                           │
└─────────────────────────────────────────────────────────────────┘
```

- 5 秒后自动消失（除非玩家悬停或点击展开）
- 点击"展开详情"打开**模态卡片**：

```
┌───────────────────────────────────────────────────────────────┐
│  📜 奉旨卡片                                              [×]   │
├───────────────────────────────────────────────────────────────┤
│  奏疏原题：臣 赵孟頫 谨奏·为请减免江南赋税事                  │
│  ...（奏疏原文）                                               │
│                                                                │
│  ───────────────────────────────────                           │
│                                                                │
│  批答：下部议                                                  │
│  批语：卿言有理·然国用方殷·下部议覆奏                         │
│  品语：从善如流·君主信任 +5                                    │
│                                                                │
│  后果：                                                        │
│   ├─ 江南赋税临时减免 5%（待部议最终议覆）                     │
│   ├─ 派系关系：东林党 +3                                       │
│   └─ 编年史已记录                                              │
│                                                                │
│  [收到·关闭]                                                   │
└───────────────────────────────────────────────────────────────┘
```

### 5.3 推送触发点

`tm-shiji-qiju-ui.js::renderQiju()` 检测到新条目 `source === 'sovereign-ai'` 或 `source === 'fallback'`，且条目与玩家上奏关联（`memorialId` 匹配），调：

```javascript
TM.PlayerEdictCard.show({
  type: 'memorial-reply',
  memorialId: entry.memorialId,
  title: entry.title,
  verdict: entry.verdict,
  comment: entry.comment,
  grade: entry.grade,
  consequences: entry.consequences,
  ts: entry.ts
});
```

非批答类的君主 AI 决策（如下旨/任免）也推送，但用"📜 圣旨到"前缀。

### 5.4 防骚扰策略

- 同回合内最多推送 3 张奉旨卡片
- 第 4 张起仅累积到"近况"列表，不弹浮层
- 玩家可在设置中关闭浮层推送（仅保留近况记录）

### 5.5 `src-player`/`src-sovereign`/`src-npc` chip 样式

在 `tm-transmigration-ui.css` 中补齐：

```css
.qiju-src-chip { display: inline-block; padding: 1px 6px; border-radius: 3px;
                  font-size: 11px; margin-right: 6px; }
.qiju-src-chip.src-player    { background: var(--player-civil, #4a90e2);
                                color: #fff; }
.qiju-src-chip.src-sovereign { background: var(--player-royal, #9b59b6);
                                color: #fff; }
.qiju-src-chip.src-npc       { background: #888; color: #fff; }
```

---

## §6 · CSS 5 套身份主题色 + 视觉风格

### 6.1 5 套主题色（按场景大类划分）

不按 16 种 playerRole 单独配色（工程量大且差异不明显），归并为 5 套：

| 主题色名 | 适用 playerRole | 主色 | 辅色 | 背景 | 寓意 |
|---------|----------------|------|------|------|------|
| `--player-civil`（青·清雅） | minister / regent / retired_official | `#4a90e2`（青蓝） | `#7fb3d5` | `#f4f8fb` | 朝堂文官·清流 |
| `--player-royal`（紫·雍容） | prince / custom / eunuch / maid | `#9b59b6`（紫） | `#bb8fce` | `#faf4fb` | 宗室内廷·贵 |
| `--player-merchant`（金·富贵） | merchant / artisan | `#d4a017`（金） | `#f1c40f` | `#fdf8ed` | 商贾百工·富 |
| `--player-martial`（黑·剽烈） | general / bandit | `#2c3e50`（深墨） | `#e74c3c`（朱砂） | `#f0f0f0` | 武将江湖·烈 |
| `--player-monastic`（白·出尘） | monk / infant / commoner / actor | `#7f8c8d`（灰白） | `#bdc3c7` | `#ffffff` | 方外布衣·素 |

### 6.2 CSS 变量定义

在 `tm-transmigration-ui.css` 顶部定义 5 套主题，按 `body.player-role-*` 根类切换：

```css
/* 默认·皇帝模式不变 */

/* 穿越模式根类 */
body.transmigration-mode { /* 启用穿越模式 CSS 命名空间 */ }

/* 5 套身份主题色 */
body.player-role-minister,
body.player-role-regent,
body.player-role-retired_official {
  --player-accent: #4a90e2;
  --player-accent-light: #7fb3d5;
  --player-bg: #f4f8fb;
  --player-text-strong: #1a5490;
}

body.player-role-prince,
body.player-role-custom,
body.player-role-eunuch,
body.player-role-maid {
  --player-accent: #9b59b6;
  --player-accent-light: #bb8fce;
  --player-bg: #faf4fb;
  --player-text-strong: #6c3483;
}

body.player-role-merchant,
body.player-role-artisan {
  --player-accent: #d4a017;
  --player-accent-light: #f1c40f;
  --player-bg: #fdf8ed;
  --player-text-strong: #9a7d0a;
}

body.player-role-general,
body.player-role-bandit {
  --player-accent: #2c3e50;
  --player-accent-light: #e74c3c;
  --player-bg: #f0f0f0;
  --player-text-strong: #1c2833;
}

body.player-role-monk,
body.player-role-infant,
body.player-role-commoner,
body.player-role-actor {
  --player-accent: #7f8c8d;
  --player-accent-light: #bdc3c7;
  --player-bg: #ffffff;
  --player-text-strong: #566573;
}
```

### 6.3 应用范围

主题色变量在以下位置消费：

| 应用位置 | 用途 |
|---------|------|
| `bar-player-identity` | 身份徽章背景色 + 边框 |
| 左栏场景 tab | 选中态背景 + 边框 |
| 主面板区块标题 | 标题颜色 + 左侧色条 |
| 奉旨卡片浮层 | 边框 + 标题色 + 品语高亮 |
| 玩家身份卡 | 头像框 + 名字色 |
| `src-player` chip | 背景 |

### 6.4 视觉风格细节

**字体**：穿越模式字体与皇帝模式一致（沿用项目既有 serif），不另设字体。

**边框圆角**：皇帝模式偏方正（4px）；穿越模式偏柔和（6px），增强"非朝廷"语境。

**icon 系统**：用 emoji（🏠📜🤝📚⚔️🎭👤📜）而非 SVG，避免新增加图标资源。皇帝模式仍用既有 ICON 系统。

**动效**：
- 奉旨卡片浮层：从顶部滑下 200ms ease-out
- 场景 tab 切换：主面板淡入 150ms
- 红点：脉动 1s infinite alternate

**响应式**：本特性不涉及响应式（项目为桌面端 Electron），保持原 1280+ 分辨率。

### 6.5 皇帝模式 CSS 隔离

`tm-transmigration-ui.css` 所有规则都包在 `body.transmigration-mode` 下：

```css
body.transmigration-mode .bar-player-identity { ... }
body.transmigration-mode #player-left-tabs { ... }
body.transmigration-mode .edict-card-toast { ... }
/* ... */
```

皇帝模式下 `body` 无 `transmigration-mode` 类，所有规则失效，**零视觉回归**。

---

## §7 · 双阶段交付范围 + smoke 验证

### 7.1 Phase A（必做）· 核心 UI 重构

| 任务 | 内容 |
|------|------|
| A1 | `tm-game-ui-shell.js::renderGameState` 双轨分派；`renderEmperorState` 改名；新增 `renderPlayerState` |
| A2 | `index.html` 新增 `bar-player-identity` / `player-left-tabs` / `player-right-panel` DOM 节点 + 加载 4 新 `<script>` + 1 新 `<link>` |
| A3 | `tm-player-ui-render.js`：`TM.PlayerUI.renderTopBar()` / `renderLeftTabs()` / `render()` / `renderRightPanel()` + `_varsForRole(role)` 精选变量映射 |
| A4 | `tm-player-systems-ui.js`：7 场景 tab 渲染 + `scenesForRole(role)` 可见性矩阵 + `renderBlock(systemKey)` 14 系统接入 |
| A5 | `tm-player-ui-edict-card.js`：奉旨卡片浮层 + 模态详情 + 防骚扰 |
| A6 | `tm-transmigration-ui.css`：5 套主题色变量 + `src-*` chip 样式 + 玩家身份条/奉旨卡片/场景 tab 视觉 + `body.transmigration-mode` 隔离 |
| A7 | `tm-topbar-vars.js`：穿越模式早返回，由 `TM.PlayerUI.renderTopBar()` 接管 |
| A8 | `tm-shiji-qiju-ui.js`：批答条目调 `TM.PlayerEdictCard.show()` 推送 |
| A9 | `tm-transmigration.js`：`_ROLE_CHANGE_PATHS` 加 `label`/`desc` + 新增 `getRoleChangePaths(role)` API |
| A10 | smoke：`smoke-transmigration-ui.js`（新增·断言双轨分派/主题色类/身份条 DOM/场景 tab 可见性矩阵/奉旨卡片 API/皇帝模式零回归） |

**Phase A 验收**：
- ✅ `smoke-transmigration-ui.js` 全过
- ✅ `smoke-transmigration-e2e.js` 仍 21/21 PASS（皇帝模式回归）
- ✅ `lint-arch-all` 8/8 绿
- ✅ 浏览器手动验证：进入穿越模式，看到玩家身份条 + 7 场景 tab + 5 套主题色切换

### 7.2 Phase B（可选）· 增量功能

| 任务 | 内容 |
|------|------|
| B1 | 身份演进面板：`TM.PlayerSystemsUI.renderRoleChangePaths(role)` + 点击触发 `triggerRoleChange(kind, payload)` |
| B2 | 右栏玩家身份卡完整渲染（近况/关系 TOP 5） |
| B3 | 诏令/奏疏档案重构：条目内容文案改为玩家视角（"奏疏原题/批答/批语/品语"）|
| B4 | 摄政代诏 UI 入口：regent 在"公务"场景显示"代诏"区块 |
| B5 | 控朝议 UI：玩家在朝议中"请旨发言"按钮 + 君主 AI 准否反馈 |
| B6 | `bar-ai-live` 双状态切换实现（君主圣裁中 / 市井演化中） |
| B7 | smoke 增量：`smoke-transmigration-ui-phase-b.js` |

**Phase B 验收**：
- ✅ `smoke-transmigration-ui-phase-b.js` 全过
- ✅ `smoke-transmigration-ui.js` 仍全过
- ✅ `lint-arch-all` 8/8 绿

### 7.3 工程约束

**禁词清单沿用 ARCHITECTURE.md §11.6**：引擎层绝不硬编明清专名（内阁/票拟/司礼监/东厂/八股等）。本特性新增 UI 文案使用朝代中立术语：
- "上奏"（非"题本/奏本/奏折"）
- "奏疏"（非"奏折"）
- "圣旨"/"奉旨"（非"上谕/朱批"）
- "君主"（非"皇帝/皇上/万岁"）——但 `P.playerInfo.sovereignName` 显示真名
- "考课"（非"大计/京察"）

**架构守卫**：
- 新增 4 个文件的 GM/P 写操作加 `// arch-ok` 行内豁免
- `arch-baselines/gm-writes.json` 通过 `--update` 收紧（如有需要）
- `tm-game-ui-shell.js` 体积预计 <5000 行（baseline 5000 阈值内）
- `tm-transmigration-ui.css` 体积预计 <1000 行（不进 file-size baseline）

**双路径挂载**：所有新文件按穿越模式惯例，同时挂 `window.TM.*` 与 `module.exports`，供 node smoke 加载。

### 7.4 风险与缓解

| 风险 | 缓解 |
|------|------|
| 双轨分派可能遗漏皇帝模式回归 | Phase A 验收强制跑 `smoke-transmigration-e2e.js` + 浏览器手动验证皇帝模式 |
| 5 套主题色视觉差异不足 | 在 Phase A 完成后请用户实际感受，必要时调色 |
| 14 系统御案 tab 化可能暴露既有系统 bug | `renderBlock` 调既有 `list()`/`state()` API·bug 由原系统负责·本特性仅 UI 渲染 |
| 奉旨卡片浮层与既有 toast 冲突 | 浮层用独立 z-index（9999）+ 独立类名空间 `edict-card-toast` |
| `index.html` 加载新 `<script>` 顺序错位 | 新文件置于 `tm-transmigration.js` 之后、`tm-launch.js` 之前；smoke 验证 `window.TM.PlayerUI` 可访问 |

---

## 附录 · 探索阶段发现（背景信息）

### 现有 UI 架构层次（皇帝模式）

```
index.html (DOM 骨架)
  #launch (启幕) ─ #btn-transmigration (穿越入口)
  #scn-page (剧本页容器)
  顶栏 bar-* (一行式):
    bar-era-stack (年号栈) / bar-dynasty / bar-date / bar-turn-text
    bar-era (hidden) / bar-weather (节气物候)
    bar-vars (七官方变量挂载点) ← tm-topbar-vars.js
    bar-more-vars (剧本自定义变量入口)
    bar-save-chip / bar-ai-live / bar-todo-badge
    bar-time (时间) / bar-btns (右侧功能按钮)
  #gc (主游戏容器)
    #gl (左栏：御案 tab 树 + 抽屉入口)
    #gc 主面板 ← tm-game-ui-shell.js::renderGameState()
    #gr (右栏：人物/编年等)
```

### 穿越模式 UI 已完成（10 项·Phase 1-7）

1. 穿越模式判定字段 `_isTrans` / `_playerRole` / `_characterName` / `_sovereignName`
2. 诏令 / 奏疏分类切换 `_edictCatsForRole(role)`
3. 角色专属动作按钮 `_roleActionButtons(role)`
4. 御笔标题/结束按钮文案切换
5. 帝王私行块隐藏
6. 官制任命权限判定
7. 结束回合文案切换
8. 起居注来源 chip `_qijuSourceClass` / `_qijuSourceLabel`
9. 玩家角色推导引擎 `derivePlayerRole(ch)`
10. 摄政代诏 / 还政 / 架空危机 `runRegentAction`

### 穿越模式 UI 待完成（13 项·本 spec 解决）

1. 顶栏 7 大变量沿用皇帝模式语言
2. 顶栏未展示玩家身份/官职/所在地点/家族
3. 皇帝 AI 决策无独立弹窗/通知
4. 玩家上奏批答（奉旨卡片）无独立渲染
5. 无穿越模式专属 CSS 视觉风格
6. 玩家专属 14 大模块无御案 tab 入口
7. 角色变更路径无 UI 触发
8. 摄政代诏无 UI 入口
9. 顶栏时间/节气仍用皇帝模式语境
10. 御案"朝议"tab 无穿越分支
11. 御案"诏令"档案名切换已做但内部条目仍用皇帝语言
12. 顶栏 AI 推徽 `bar-ai-live` 无穿越分支
13. CSS 变量系统无穿越模式主题

---

## Spec 元信息

- **设计依据**：`docs/superpowers/specs/2026-07-19-transmigration-ui-redesign-design.md`（本文件）
- **前置 spec**：`.trae/specs/add-transmigration-mode/spec.md`（Phase 1-7 已完成）
- **关联文档**：`web/ARCHITECTURE.md` §11 穿越模式架构 / `web/INDEX.md` §🎭 穿越模式文件注册
- **PR 计划**：Phase A 一个 PR（含 10 任务）；Phase B 一个 PR（含 7 任务）
