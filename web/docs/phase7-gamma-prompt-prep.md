# Phase 7 P7-γ §1 prompt 拆·prep audit

date·2026-05-04 · status·**P7-γ 启·prep 完后即实施**·owner·Claude

> §1 = L25-3245·~3220 行·sysP prompt 构建·主体是 `tp += ...` string concat·
> P7-γ 目标·把这 3220 行迁出至 `tm-endturn-prompt.js` `TM.Endturn.AI.prompt.build(ctx)`·
> 主入口减肥到 ~9000 行 (12602 - 3220)·

---

## 1·§1 边界 (Codex correction confirmed)

| boundary | line | marker |
|---|---|---|
| §1 start | L25 | `// §1 入参初始化 + sysP prompt 构建` |
| §1 end (sysP 完工) | ~L3245 | `if (sysP.length > _sysPMaxChars) { ... 截断 ... }` |
| §2 start | L3246 | `// §2 Sub-call 注册化基础设施` |

§1 内容·

- L25-30·5 record vars 声明 (shizhengji, zhengwen, etc·**留主入口·因 §2-§5 需要**)
- L31·`var timeRatio = getTimeRatio()` (留主入口或 ctx.input)
- L33-3245·sysP 构建主体 (3210 行·**全迁**)

---

## 2·§1 inputs (read·main entry 仍读)

### 2.1 函数 params (4)
- `edicts`·`xinglu`·`memRes`·`oldVars`

### 2.2 globals·read-only
- `GM`·`P` (大量 read·~150 处)
- `getTimeRatio` (1 处·L27)
- `_getDaysPerTurn` (helper·诏令时长计算)
- `_getCharRange` (helper·char range 计算)
- `findScenarioById` (helper·`var sc=findScenarioById(GM.sid)` L41)
- `EDICT_TYPES`·`REFORM_PHASES`·`RESISTANCE_SOURCES` (R10/R202·tm-edict-lifecycle 数据)
- `getEdictLifecycleTurns` (helper·R10/R202)
- `showLoading` (UI helper)
- `_dbg` (debug helper)
- `findCharByName`·`findFacByName`·etc (从 tm-index-world)

### 2.3 globals·read+write (state mutation)
- `GM._playerDirectives` (问天·会标 _absolutes·dir id 补)·**§1 内修·留**
- `GM._aiDispatchStats` (init if missing·L3306·**实际属 §2·不在 §1 范围**)

---

## 3·§1 outputs·后续 phase consume

**关键·必须 export 到 ctx.prompt**·

### 3.1 主输出
- `sysP` (string·system prompt)·§3 sub-call 全用

### 3.2 char ranges (§3 sc1·§5 sc2 用)
- `_shiluR`·`_shiluMin`·`_shiluMax` (实录字数·sc1 prompt L4030)
- `_szjR`·`_szjMin`·`_szjMax` (时政记字数·sc1 prompt L4033)
- `_hourenR`·`_hourenMin`·`_hourenMax` (后人戏说字数·sc2 prompt L11428)
- `_zwR`·`_zwMin`·`_zwMax` (兼容保留)
- `_commentR` (评论字数)

### 3.3 scenario 引用
- `sc` (scenario 对象·`findScenarioById(GM.sid)`)·§4 写回时也用

### 3.4 prompt 中间产物 (debug 用·optional)
- `tp` (临时 buffer·**internal·不 export**)
- `_dpv0` (days-per-turn·**internal·不 export**)
- `_eparts`·`_rparts`·`_routes`·`_rkeys`·`_ekeys` (loop locals·**internal**)

### 3.5 其他·疑似 §1 produce 的
- `playerStatus`·`playerInner` (record vars·**先在 main entry 声明 ""·§1 内 maybe 改·待 audit 确认**)
- `turnSummary` (同上)

---

## 4·主入口减肥后 shape

```js
// tm-endturn-ai-infer.js (P7-γ 后·~9400 行)
async function _endTurn_aiInfer(edicts, xinglu, memRes, oldVars) {
  // ─── Record vars (留主入口·§2-§5 mutate) ───
  var shizhengji="", zhengwen="", playerStatus="", playerInner="", turnSummary="";
  var shiluText="", szjTitle="", szjSummary="", personnelChanges=[], hourenXishuo="";

  // ─── ctx 对象·全 phase 共享 ───
  var ctx = {
    input: {
      edicts: edicts, xinglu: xinglu, memRes: memRes, oldVars: oldVars,
      timeRatio: getTimeRatio()
    },
    prompt: {
      sysP: '',
      _shiluR: null, _shiluMin: 0, _shiluMax: 0,
      _szjR: null, _szjMin: 0, _szjMax: 0,
      _hourenR: null, _hourenMin: 0, _hourenMax: 0,
      _zwR: null, _zwMin: 0, _zwMax: 0,
      _commentR: null,
      sc: null
    }
    // (其他 ctx groups·留 P7-δ/ε/ζ 实施时填)
  };

  // §1 → tm-endturn-prompt.js (P7-γ)
  if (P.ai.key) {
    if (P.conf.gameMode === 'strict_hist' && P.conf.refText) {
      showLoading("检索数据库中", 20);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    showLoading("打包数据", 25);

    await TM.Endturn.AI.prompt.build(ctx);

    // re-bind locals·§2-§5 仍以局部 var name 引用 (最小 diff)
    var sysP = ctx.prompt.sysP;
    var sc = ctx.prompt.sc;
    var _shiluR = ctx.prompt._shiluR, _shiluMin = ctx.prompt._shiluMin, _shiluMax = ctx.prompt._shiluMax;
    var _szjR = ctx.prompt._szjR, _szjMin = ctx.prompt._szjMin, _szjMax = ctx.prompt._szjMax;
    var _hourenR = ctx.prompt._hourenR, _hourenMin = ctx.prompt._hourenMin, _hourenMax = ctx.prompt._hourenMax;
    var _zwR = ctx.prompt._zwR, _zwMin = ctx.prompt._zwMin, _zwMax = ctx.prompt._zwMax;
    var _commentR = ctx.prompt._commentR;

    // §2 onwards (still inline·待 P7-δ/ε/ζ 拆)
    try {
      // ... (§2 sub-call infra·§3 sub-calls·§4 apply·§5 followup)
    }
  }

  // ─── return·留·待 P7-η record 拆 ───
  return {
    shizhengji, zhengwen, playerStatus, playerInner, turnSummary,
    timeRatio: ctx.input.timeRatio,
    suggestions: (p2 && p2.suggestions) || [],
    shiluText, szjTitle, szjSummary, personnelChanges, hourenXishuo
  };
}
```

---

## 5·tm-endturn-prompt.js shape

```js
// @ts-check
/// <reference path="types.d.ts" />
// ============================================================
// tm-endturn-prompt.js — endturn AI 推演·§1 sysP prompt 构建 (R209 P7-γ 拆出)
//
// Phase 7 P7-γ (2026-05-04·Claude)·从 tm-endturn-ai-infer.js §1 (原 L25-3245·~3220 行) 拆出·
// 责任·读 GM/P/scriptData·建 sysP·char ranges·scenario·写入 ctx.prompt
// 不动·prompt 措辞·content·只搬位置 (refactor-only per Phase 7 gates)
//
// Module:    TM.Endturn.AI.prompt
// Domain:    endturn / prompt building
// Status:    active
// Owner:     Claude (P7-γ)
// Imports:   GM, P, scriptData (read), getTimeRatio, _getDaysPerTurn, _getCharRange,
//            findScenarioById, EDICT_TYPES, REFORM_PHASES, RESISTANCE_SOURCES,
//            getEdictLifecycleTurns, showLoading, _dbg
// Exports:   TM.Endturn.AI.prompt.build(ctx)
// Used by:   tm-endturn-ai-infer.js (主入口·§1 替换)
// Side effects: 读 GM/P / 写 ctx.prompt
// Test:      smoke-endturn-prompt-tokens.js·smoke-endturn-public-contract.js (baseline)
// Notes:     R209·P7-γ·依据 phase7-gamma-prompt-prep.md
// ============================================================
(function(global) {
  'use strict';
  if (typeof global.TM === 'undefined') global.TM = {};
  if (typeof global.TM.Endturn === 'undefined') global.TM.Endturn = {};
  if (typeof global.TM.Endturn.AI === 'undefined') global.TM.Endturn.AI = {};
  if (typeof global.TM.Endturn.AI.prompt === 'undefined') global.TM.Endturn.AI.prompt = {};

  /**
   * §1·sysP prompt 构建
   * @param {Object} ctx - endturn pipeline 共享 ctx (per phase7-ctx-contract.md)
   * @returns {Promise<void>} 写入 ctx.prompt
   */
  global.TM.Endturn.AI.prompt.build = async function(ctx) {
    // 从 ctx.input read·主入口 already populated
    var edicts = ctx.input.edicts;
    var xinglu = ctx.input.xinglu;
    var memRes = ctx.input.memRes;
    var oldVars = ctx.input.oldVars;
    var timeRatio = ctx.input.timeRatio;

    // ===== §1 内容 (从 ai-infer.js L33-3245 verbatim 迁) =====
    var sc = findScenarioById(GM.sid);
    var _shiluR = _getCharRange('shilu'), _shiluMin = _shiluR[0], _shiluMax = _shiluR[1];
    var _szjR = _getCharRange('szj'), _szjMin = _szjR[0], _szjMax = _szjR[1];
    var _hourenR = _getCharRange('houren'), _hourenMin = _hourenR[0], _hourenMax = _hourenR[1];
    var _zwR = _getCharRange('zw'), _zwMin = _zwR[0], _zwMax = _zwR[1];
    var _commentR = _getCharRange('comment');

    var tp = '';
    // ... (3200 行 prompt 构建·全迁)
    // ... 末尾·sysP 拼装 + 截断

    // ===== 写入 ctx.prompt =====
    ctx.prompt.sysP = sysP;
    ctx.prompt.sc = sc;
    ctx.prompt._shiluR = _shiluR;
    ctx.prompt._shiluMin = _shiluMin;
    ctx.prompt._shiluMax = _shiluMax;
    ctx.prompt._szjR = _szjR;
    ctx.prompt._szjMin = _szjMin;
    ctx.prompt._szjMax = _szjMax;
    ctx.prompt._hourenR = _hourenR;
    ctx.prompt._hourenMin = _hourenMin;
    ctx.prompt._hourenMax = _hourenMax;
    ctx.prompt._zwR = _zwR;
    ctx.prompt._zwMin = _zwMin;
    ctx.prompt._zwMax = _zwMax;
    ctx.prompt._commentR = _commentR;
  };

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
```

---

## 6·风险

| 风险 | 等级 | 缓解 |
|---|---|---|
| **3200 行迁移·diff 大·copy/paste 错** | 高 | 用 sed / Read+Write·一次性整段移·不分段 |
| §1 内 closure refs 漏 (e.g. 内部 helper function) | 中 | grep 出 §1 内所有 `function` 声明·全迁 |
| sysP 截断逻辑·`_sysPMaxChars` 等 magic number | 低 | 一并迁·不改值 |
| 主入口 var 重声明 (sysP 在 §1 declared·又在主入口 re-bind) | 低 | re-bind 用 `var sysP = ctx.prompt.sysP;`·避 strict mode 冲突 |
| baseline smoke (parse ai-infer.js) 找不到 §1 markers | **必发** | **更新 baseline helper·读 ai-infer + prompt 两文件 concat** |
| index.html load 顺序·tm-endturn-prompt 必在 ai-infer 之前 | 低 | 加 `<script src="tm-endturn-prompt.js">` 在 ai-infer 之前 |
| `_playerDirectives` mutation 跨 §1·§5 (问天 directive _absolutes) | 中 | mutation 仍走 GM·非 ctx·_playerDirectives 是 GM 字段·迁 §1 不破 |

---

## 7·实施步骤

1. **更新 baseline helper** (`smoke-endturn-baseline-helpers.js`)·readSource() concat ai-infer + prompt
2. **创建 tm-endturn-prompt.js skeleton** (空 build·只 ctx export ⊥)
3. **加 index.html script tag** (`<script src="tm-endturn-prompt.js">` 在 ai-infer 之前)
4. **跑 verify-all + headless-smoke**·确认 skeleton 不破现有
5. **从 ai-infer §1 (L33-3245) 提 prompt 构建代码**·verbatim copy 到 prompt.js build()
6. **末尾加 ctx.prompt.* 写入**
7. **替换 ai-infer §1 段为 `await TM.Endturn.AI.prompt.build(ctx);` + re-bind locals**
8. **跑 verify-all 60/60 + headless-smoke 212/0/0 + endturn-prompt-tokens 全 PASS**
9. **letter Codex·P7-γ done**

---

## 8·current

- **P7-γ prep done** (本 doc)
- 即启实施 (~6-8h actual·按 Q4 答 sequential·无并行)

— Claude (P7-γ prep·2026-05-04)
