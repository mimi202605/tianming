# chaoyi 5 文件 cleanup audit (Phase 3 first slice·Claude own)

date·2026-05-03 · status·**Step 1 audit done·待 Step 2-7 execute**

## 0·新规约满足 (architecture-target-final.md §8.1.1)

| Prerequisite | 状态 |
|---|---|
| 1·本地 backup | ✓ done·`Desktop/tianming/backups/2026-05-03-chaoyi/` (5 文件·~330KB) |
| 2·wrapper / IIFE audit | ✓ done·**仅 tm-chaoyi-misc.js:150-159 有 9 行 inline IIFE·无跨段·安全** |
| 3·github latest check | ⏳ optional (chaoyi 5 是 user / Codex 多次改·local 可能 newer) |
| 4·boundary 验证 | (Step 2-7 执行时 each boundary 验) |

## 1·5 文件 inventory

| 文件 | 行数 | 性质 | 行动 |
|---|---|---|---|
| `tm-chaoyi.js` | 161 (10KB) | v1·入口·频率限制·位置判定·三模式选卡 + addCYBubble | 留新 chaoyi.js·吸 v2 _cc2 prompts |
| `tm-chaoyi-v2.js` | 1,366 (76KB) | **三块**·_cc2 prompts (L20-99·~80·v3 调) + **_ty2_* 廷议 (L102-879·~778·active)** + **_yq2_* 御前 (L882-1366·~485·active)** | **拆 3**·prompts → chaoyi.js·_ty2 → chaoyi-tinyi.js·_yq2 → chaoyi-yuqian.js |
| `tm-chaoyi-v3.js` | 3,843 (188KB) | v3·常朝主流程·**76 funcs·全 _cc3_·self-contained·只 L303 调 _cc2 prompt** | rename → tm-chaoyi-changchao.js (常朝独立) |
| `tm-chaoyi-misc.js` | 535 (24KB) | R125 中转 dump·应分到 6 area | **逐项重分** to office-panel/launch/memorials/storage/map-system/audio-theme |
| `tm-chaoyi-v3.css` | (CSS) | 样式 | rename → tm-chaoyi-changchao.css (跟随 js) |

**净变化·5 → 4 文件**·按朝议三模式 (常朝/廷议/御前) + 入口 shared·**职责分明**·

## 2·IIFE / wrapper audit (新规约 #2)

| 文件 | IIFE | 跨段? |
|---|---|---|
| tm-chaoyi.js | 0 | - |
| tm-chaoyi-v2.js | 0 | - |
| tm-chaoyi-v3.js | 0 | - |
| **tm-chaoyi-misc.js** | **1** at line 150-159 (9 行 inline) | ✗ 不跨段·小 |

**所有 chaoyi 文件 都 top-level functions·无大 IIFE wrapper·安全 split**·

## 3·tm-chaoyi.js (v1·161 行) 内容

按 head note·

```
R157 章节导航·
  §1 [L20]  openChaoyi/closeChaoyi 入口 + 频率限制
  §2 [L57]  _cyShowInputRow / _cySubmitPlayerLine 玩家输入
  §3 [L83]  _getPlayerLocation / _isAtCapital 位置判定
  §4 [L100] showChaoyiSetup 三模式选卡
  §5 [L126] _cy_pickMode 分发到 v2  ← need 改为 v3
  §6 [L134] startChaoyiSession 旧名兼容桩
  §7 [L143] addCYBubble 共享气泡 (v2 主调)  ← v3 调
```

**全 v1 入口逻辑·v3 仍依赖**·**应 inline 入新 chaoyi.js·非 delete**·

## 4·tm-chaoyi-v2.js (1,366 行) 实质·**修正**

**前次 audit 错**·原判 "其余 ~1300 行 deprecated" 不对·v2 实际三块·**两块 active**·

| 段 | 行 | 函数数 | 状态 |
|---|---|---|---|
| _cc2 prompts | L22-98 | 2 (_cc2_buildAgendaPrompt + _cc2_fallbackAgenda) | v3 调·**保留** |
| _ty2_* 廷议 | L102-879 | 12 (_ty2_openSetup ~ _ty2_finalEnd + _cy_suggestBtnHtml) | **active 主流程·非 deprecated** |
| _yq2_* 御前 | L882-1366 | 12 (_yq2_openSetup ~ _yq2_globalFooter) | **active 主流程·非 deprecated** |

只 v2 §1 常朝 (~1670 行) 曾被 v3 替代·已物理删除·剩 _cc2 prompts (~80 行) + _ty2 + _yq2 全 1366 行·**全 active**·

**所以原 single 5370 行合并方案 不合理**·应按朝议三模式分·**5 → 4 文件**·

## 5·tm-chaoyi-misc.js (535 行) R125 中转 dump

按 head note·**应分到 6 area**·

| sub-section | 目标 area | 估行 |
|---|---|---|
| 官员表任命 (renderOfficeDeptV2) | tm-office-panel.js | ~100 |
| 继续游戏按钮 | tm-launch.js | ~30 |
| 奏议批复扩展 | tm-memorials.js | ~80 |
| Electron 桌面端存档 | tm-storage.js | ~50 |
| 游戏内小地图/交互 | tm-map-system.js | ~150 |
| 音效和音乐 | tm-audio-theme.js | ~100 |

## 6·Step 2-7 execution plan

### Step 2·读 tm-chaoyi.js v1 全 161 行·确认 inline target

### Step 3·读 tm-chaoyi-v2.js 提取 _cc2_buildAgendaPrompt + _cc2_fallbackAgenda (find line ranges)

### Step 4·建 4 新文件·按朝议三模式分·**结构·**

| 新文件 | 来源 | 行 | 内容 |
|---|---|---|---|
| **tm-chaoyi.js** (入口·替原 v1) | v1 (161) + v2 _cc2 prompts (L20-99·~80) | ~250 | openChaoyi/closeChaoyi·_cy* 玩家输入·_isAtCapital·showChaoyiSetup·_cy_pickMode (分发)·addCYBubble·_cc2_buildAgendaPrompt·_cc2_fallbackAgenda |
| **tm-chaoyi-changchao.js** (常朝·rename v3) | v3 (3843) | ~3850 | 76 _cc3_ 函数·常朝主流程·UI/动作/AI/落库 |
| **tm-chaoyi-tinyi.js** (廷议·从 v2 抽) | v2 L102-879·12 funcs | ~780 | _ty2_openSetup ~ _ty2_finalEnd + _cy_suggestBtnHtml |
| **tm-chaoyi-yuqian.js** (御前·从 v2 抽) | v2 L882-1366·12 funcs | ~485 | _yq2_openSetup ~ _yq2_globalFooter |

**load 顺序·tm-chaoyi.js 必先 (其他三调本文件 addCYBubble + _cc2 prompts)·然后 changchao/tinyi/yuqian 任意顺**·

每文件 head note·12 字段 (Module / Domain / Status / Last Updated / Owner / Imports / Exports / Used by / Side effects / Test / Notes)·

### Step 5·misc 535 行 重分·**6 Edit·each area 加 sub-section** (与原 plan 同·不变)

### Step 6·delete 5 + create 4 + update index.html

- delete·tm-chaoyi.js (v1·old name) → **rename 新 chaoyi.js (v1+v2 prompts)**
- delete·tm-chaoyi-v2.js (拆 3·prompts 入 chaoyi.js·_ty2 入 chaoyi-tinyi.js·_yq2 入 chaoyi-yuqian.js)
- delete·tm-chaoyi-v3.js → **rename tm-chaoyi-changchao.js**
- delete·tm-chaoyi-misc.js (重分 6 area)
- delete·tm-chaoyi-v3.css → **rename tm-chaoyi-changchao.css**
- update·index.html script tags (4 chaoyi script·old order vs new order)

### Step 7·verify-all + cc3-smoke 必过 (cc3 是关键 smoke·56 assertions)·boot-smoke + render-smoke 不破

## 7·风险 + 应对·**4 文件 plan 修订**

| 风险 | 应对 |
|---|---|
| 5 → 4 destructive·一次过多 | **分 3 batch**·(1) 建 chaoyi.js + 入 v1 + v2 prompts (2) v3 → changchao rename·v2 拆 _ty2/_yq2 (3) misc 重分·delete 5 |
| v2 拆 _ty2 / _yq2·中间是否共享? | grep 已 verify·两者独立·不互调·_cy_suggestBtnHtml at L858 (_ty2 块尾)·入 chaoyi-tinyi.js |
| v3 调 _cc2_buildAgendaPrompt (L303) | _cc2 入新 chaoyi.js·v3 changchao 调本 chaoyi.js·load 顺序保证 |
| addCYBubble v3 + _ty2 + _yq2 多处调 | inline 入 chaoyi.js·三个模式文件 load 在 chaoyi.js 后·全可访问 |
| index.html load 顺序 chaoyi.js 必先 | 写入 index.html 时·chaoyi.js 顺序最前 |
| misc 重分·target area 已有 function 同名 | 重命名·或 wrap namespace |
| cc3-smoke 56 assertions break | revert·diagnose·fix |
| boot-smoke / render-smoke 破 | 同上 |

## 8·ETA total·**4 文件 plan**

- Step 0 backup·done (5 min)
- Step 1 audit·done + **修订 (本 doc 改)** (30 min)
- Step 2-3·read v1 + grep v2 / v3·**done** (15 min)
- Step 4·建 4 文件·**1 hour** (chaoyi.js 建 + v3 rename + v2 拆 _ty2/_yq2)
- Step 5·misc 重分 6 area·**1-2 hour** (deep work)
- Step 6·delete 5 + html script tags·30 min
- Step 7·verify-all + cc3 / boot / render smoke·15 min

**total ~3-5 hours**·**Phase 3 first slice·按朝议三模式分**·**incremental verify each step**

## 9·Codex 协作

- Codex parallel·**IIFE audit editor-game-systems** (per his ack·见 dialogue)
- Claude own chaoyi cleanup·**不冲突·different files**
- 完后 review at merge

— end of chaoyi-5-cleanup-audit.md
