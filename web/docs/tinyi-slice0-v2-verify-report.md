# Slice 0.0a·v2 dead code verify report (静态 audit)

**日期**·2026-05-23
**版本**·sprint v2.9 kickoff
**方法**·grep / 亲读 v2 entry chain·**实际 game UI 5 case 跑需 user 临时 toggle v3 关**

---

## 1·v2 path entry chain (verified)

```
玩家点 廷议 → _cy_pickMode('tinyi')
  ↓
  v3 L1545 IIFE override 接管·跳 _ty3_open
  
若临时 force orig (绕 v3)·v2 路径·
  _cy_pickMode('tinyi') → tm-chaoyi.js L353·_ty2_openSetup()
    ↓
  L17·_ty2_openSetup (setup modal·选议题类型)
    ↓
  L139·_ty2_startSession (开场)
    ↓
  L244·_ty2_phaseInitialRound (初轮发言)
    ↓
  L462·_ty2_startDebate (辩议)
    ↓
  L499·_ty2_judgeStanceShifts (立场偏移)
    ↓
  L532·_ty2_offerMediation (调和 / 强行)
    ↓
  L560·_ty2_enterDecide (裁决 entry)
    ↓
  L610·_ty2_decide (裁决·准 / 驳 / 折中 / 留中)
    ↓
  L769·_ty2_finalEnd (收口·entry 写 qijuHistory)
```

**v2 phase 函数清单** (21 个·tm-chaoyi-tinyi.js 791 行)·全在·entry chain 完整。

---

## 2·v3 仍在用的 v2 helper (重要)

v3 不是"全替换 v2"·而是"接管入口 + 复用部分 helper"·

| v3 调用点 | v2 helper | 状态 |
|---|---|---|
| `tm-tinyi-v3.js:1133` | `_ty2_openSetup` (私议 5 人闭门) | active·v3 仍调 |
| `tm-tinyi-v3.js:1889` | `_ty2_genOneSpeech` (NPC 发言生成) | active·v3 phase2 复用 |
| `tm-tinyi-v3.js:1933-1935` | `_ty2_genOneSpeech` | active·_ty3_safeGenSpeech 复用 |
| `tm-tinyi-v3.js:1952-1953` | `_ty2_playerTriggeredResponse` | active·_ty3_handlePlayerInterject 复用 (v2.3 改成调 _ty3_onPlayerSpeak fallback) |

**结论**·`_ty2_genOneSpeech` + `_ty2_playerTriggeredResponse` + `_ty2_openSetup` 是 v3 仍依赖的 critical helper·不可删·若删·v3 完全 broken。

---

## 3·静态 audit·v2 完整路径 "likely functional·待 game 实测"

**正面 evidence**·

- v2 21 phase 函数全在 (tm-chaoyi-tinyi.js 791 行)
- v2 entry chain 完整 (open → debate → decide → finalEnd)
- v2 helper 部分仍在 v3 active 调用·说明这些函数依旧能跑
- v2 paradigm·LLM-driven stance + 简化 5 阶段·没复杂 state machine 依赖

**风险 evidence**·

- v3 升级过 GM state 字段 (cohesion / favor / archon grade / unlockedRegalia) v2 可能 silent 漏写·导致后续 phase7 追责 entry 缺失
- v2 没有 ChronicleTracker 集成·跑 v2 议题后·`GM._chronicleTracks` 不写 `chaoyi_pending` entry·user 看不到"廷议待落实"卡
- v2 没有 ClassEngine 集成·裁决不传播到 class layer (士绅 / 寒门 / 言官 满意度)
- v2 没有党派进化 hook·议题结果不影响党派 cohesion / status

**预估 broken 程度**·

| 路径 | 状态 |
|---|---|
| 开场 / 议题选择 | ✅ 应 work (modal + 选 5 议题类型 / 议题文本) |
| 初轮发言 (5-8 NPC LLM) | ✅ 应 work (_ty2_genOneSpeech v3 仍用) |
| 辩议 (多轮·立场转换) | ⚠️ 可能 work·但 stance 表现简陋 (无 8D dims·全 LLM) |
| 裁决 (准 / 驳 / 折中 / 留中) | ✅ 应 work (v2 paradigm 简单) |
| 收口·qijuHistory entry | ✅ 应 work |
| ChronicleTracker 桥接 | ❌ v2 path 不调·廷议待落实卡缺 |
| ClassEngine 反弹 | ❌ v2 path 不调·class 层无变化 |
| 党派进化 hook | ❌ v2 path 不调·partyStrife / cohesion 不更新 |

**总评**·**"功能 70% 完整"**·核心 5 阶段 likely work·后处理集成全 absent。

---

## 4·建议给 user

### 4.1·verify 命令 (user 在 game 里跑)

```js
// 1·开浏览器控制台·临时关 v3 接管 (force orig)
window._cy_pickMode = window._cy_pickMode._origPreV3 || ... ;
// 注·v3 L1543 if (_ty3Override) return; 阻止重 hook·要先·
window._cy_pickMode._ty3Override = false;
// 然后 re-load tm-tinyi-v3.js·force IIFE 再跑·这次绕过

// 简单办法·临时改 v3 L1545 加 return·或 加 P.conf.useTinyiV3 = false 但 v3 还没此 gate·所以直接 reload 必走 v3
// 最简·devtools 改 L1545 onkeyup early return·跑一议·然后 reload restore
```

**更简单**·sprint Slice 0.2 加 useTinyiV3 gate 后·user 设置面板关掉 toggle·走 v2·跑 5 case。

### 4.2·5 case 跑 expected outcome

按 §3 表预估·

- 5 case **核心 5 阶段** likely pass (开场 + 辩议 + 裁决 + 收口)
- 5 case **后处理集成** (chronicleTracker / ClassEngine / 党派进化) 100% fail·因 v2 不调
- 若 user 觉得 "v2 跑能玩·只是简陋"·跳 0.0b·走 v3-only paradigm·sprint 砸时 toggle 关 → v2 fallback 可用 (虽然简陋)
- 若 user 觉得 "v2 必须跟 v3 parity"·走 0.0b·按 §3 表 spot 修后处理集成 (~1.5d·跟 v3 完整) — **但 user 选 双轨 paradigm 时可能不必走 0.0b·只要 v2 能 fallback 即可**

---

## 5·结论 + 推荐

**结论**·

- v2 entry chain functionally 完整·核心 5 阶段 likely work
- v3 仍 active 调 3 个 v2 helper·v2 部分 dead·但**入口 alive**
- 后处理集成 v2 全无·v2 path 是"简陋版廷议"

**推荐**·

- **Slice 0.0b 跳过** (跟 user 同步)·走 user 选的 "双轨" paradigm·v2 留 emergency fallback (简陋·但 toggle 可用)
- post-sprint backlog 加 1 项·"v2 ChronicleTracker / ClassEngine 集成补·若 user 觉得 fallback 太简陋" (~1.5d)
- 实际 sprint 期间·toggle 默认 v3 (`useTinyiV3 != false`)·user 主动关到 v2

---

## 6·下一步

| | 选项 | 描述 |
|---|---|---|
| **A** | **跳 0.0b·按"双轨 + v2 简陋 fallback"paradigm 走·进 Slice 0 主流程** | 推荐·静态 audit 已够 verify·user 在 sprint 期间若需可手动 toggle 实测 |
| **B** | user 在 game 里跑 5 case 后决定是否走 0.0b | 严谨·但需 user 手动操作 + 等待 |
| **C** | 直接走 v3-only paradigm·删 toggle UI + fallback 代码·-0.2d Slice 0 | 激进·若 sprint 砸 user 无 fallback·风险 |
