# Phase 7·ctx 对象 contract (P7-α)

date·2026-05-04 · status·**locked·与 Codex 共识 (5 Q 回信)·实施 P7-γ/δ/ε/ζ/η 时按此 grouped shape**
owner·Claude (P7-α)

> 与 Codex 共识 (Q2 答 C·grouped ctx shape)·避免 80-key flat bag·**8 grouped namespaces** + meta·

---

## 0·grouped ctx shape

```js
ctx = {
  // ─── 输入·主入口收·sub-module read-only ───
  input: {
    edicts,        // _endTurn_aiInfer 入参
    xinglu,
    memRes,
    oldVars,
    timeRatio,     // getTimeRatio() 算出
    oldGM,         // GM 快照 (Phase 7 看是否需·若 sub-module 必须读旧值)
    oldP           // P 快照
  },

  // ─── §1 prompt 构建产物·prompt build → ai/subcalls read ───
  prompt: {
    sysP,                    // sysP prompt 主体 (system message·有截断)
    tp,                      // R209a·sub-call prompt 的 base·§3 L229 tp0·L848 tp1 直用
                             //       (sysP 是处理后版本·tp 是原始 buffer·两者都需要)
    sc,                      // findScenarioById(GM.sid) 返回·scenario 引用
    _shiluR, _shiluMin, _shiluMax,    // 实录字数 (sc1 prompt 用)
    _szjR, _szjMin, _szjMax,          // 时政记字数 (sc1 prompt 用)
    _hourenR, _hourenMin, _hourenMax, // 后人戏说字数 (sc2 prompt 用)
    _zwR, _zwMin, _zwMax,             // 兼容保留
    _commentR                          // 评论字数
  },

  // ─── §2 sub-call 基础设施·prompt → ai → followup ───
  subcalls: {
    _runSubcall,             // factory·注册化 fn
    _tok,                    // token cap helper
    _buildFetchBody,         // fetch body builder
    _truncatedOnce: false,   // 截断检测 flag
    _effectiveOutCap: 0,     // _getEffectiveOutputLimit() 结果
    _checkTruncated          // 截断 detect helper
  },

  // ─── §3 sub-call 输出·apply/followup read·按 16 sub-call registry 全 16 entry ───
  results: {
    // main·order < 150
    sc0: null,                // 深度思考记忆 (standard·order 0)
    sc05: null,               // 记忆回顾 (standard·order 5)
    sc1: null,                // 结构化数据 (lite·order 100·主推演)
    sc1b: null,               // 文事鸿雁人际 (lite·order 110)
    sc1c: null,               // 势力外交·NPC阴谋 (lite·order 120)
    // followup·order >= 150
    sc15: null,               // NPC 深度 (standard·order 150)
    sc_memwrite: null,        // R209a·NPC 记忆回写 (lite·order 155)
    sc16: null,               // 势力推演 (full·order 160)
    sc17: null,               // 经济财政 (full·order 170)
    sc18: null,               // 军事态势 (full·order 180)
    sc_audit: null,           // R209a·数据一致性审核 (lite·order 185)
    sc2: null,                // R209a·叙事正文 (lite·order 200)
    sc25: null,               // 伏笔记忆 (lite·order 250)
    sc27: null,               // 叙事审查 (standard·order 270)
    sc07: null,               // NPC 认知整合 (lite·order 275)
    sc28: null,               // R209a·世界快照 (full·order 280)
    sc_consolidate: null      // Phase 7 后台·下回合记忆密度
  },

  // ─── §4 apply 中间产物·apply → followup/record read ───
  apply: {
    _hardConstraints: '',     // L3844 原 §3 中产·§4 apply 用
    applied: {
      chars: null,            // §4 char_updates 写回结果摘要
      factions: null,
      offices: null,
      fiscal: null,
      admin: null,
      events: null,
      harem: null
    }
  },

  // ─── §5 followup 输出·record read ───
  followup: {
    _changeSummary: [],       // R209a·从 apply 移此 (per Codex addendum)·L11502 §5 produce·record consume
    npcDeep: null,            // sc15-18 NPC 深度·势力
    fiscalMil: null,          // sc16-18 财政·军事
    narrative: null           // sc2/sc25/sc27 叙事·丰化
  },

  // ─── 收尾·return assembly ───
  record: {
    shiluText: '',
    szjTitle: '',
    szjSummary: '',
    personnelChanges: [],
    hourenXishuo: '',
    suggestions: []           // R209a·added per Codex addendum·原直接 (p2&&p2.suggestions)||[]·now in ctx.record
  },

  // ─── meta·跨 sub-module 诊断/计时·非 game state ───
  meta: {
    errors: [],               // 各 sub 抛错·不阻塞·收集
    warnings: [],
    timing: {                 // 计时 (debug)·prompt: ms·sc1: ms 等
      promptBuild: 0,
      sc0: 0, sc05: 0, sc1: 0, sc1b: 0, sc1c: 0,
      apply: 0,
      followup: 0
    },
    retries: {                // sub-call 重试次数 (debug)
      sc1: 0, sc1b: 0, sc1c: 0
    }
  }
}
```

---

## 1·sub-module 接口签名

每 sub-module 暴露 1 个或多个 namespace fn·签名一致·

```js
// §1·tm-endturn-prompt.js
TM.Endturn.AI.prompt = {
  build: async function(ctx) {
    // input·ctx.input.* + GM/P (read)
    // output·ctx.prompt.* (write)
    // ctx.meta.timing.promptBuild = elapsed
    // ctx.meta.errors / .warnings push if any
    // throw on fatal·主入口 catch·标记 endturn fail
    return ctx;
  }
};

// §2+§3·tm-endturn-ai.js
TM.Endturn.AI.subcalls = {
  setupInfra: function(ctx) { /* §2·infra 注册 */ ctx.subcalls.* = ... },
  runMain: async function(ctx) {
    // input·ctx.input·ctx.prompt·ctx.subcalls (read)
    // output·ctx.results.* (write)
    return ctx;
  },
  runSc0: async function(ctx) { /* sc0 单独·若主入口需阶段化 */ },
  runSc1: async function(ctx) { /* 同上 */ },
  // ... 各 sub-call factory 入口
};

// §4·tm-endturn-apply.js
TM.Endturn.AI.apply = {
  writeBack: async function(ctx) {
    // input·ctx.results.sc1 + ctx.input.oldGM/oldP (read)
    // output·GM/P 改写 (durable)·ctx.apply.* (transient summary)
    return ctx;
  },
  _applyChars: function(ctx) { /* 字段族内部·非 namespace·private */ },
  // ... 7 字段族 internal helpers
};

// §5·tm-endturn-followup.js
TM.Endturn.AI.followup = {
  run: async function(ctx) {
    // input·ctx.results + ctx.apply (read)
    // output·ctx.followup.* (write)·GM/P 改写
    return ctx;
  }
};

// 收尾·tm-endturn-record.js
TM.Endturn.AI.record = {
  finalize: function(ctx) {
    // input·ctx.* 全部 (read)
    // output·return 对象·历史 entries 写
    return {
      shiluText: ctx.record.shiluText,
      szjTitle: ctx.record.szjTitle,
      szjSummary: ctx.record.szjSummary,
      personnelChanges: ctx.record.personnelChanges,
      hourenXishuo: ctx.record.hourenXishuo
    };
  }
};
```

---

## 2·主入口·tm-endturn-ai-infer.js (重构后·~500 行)

```js
async function _endTurn_aiInfer(edicts, xinglu, memRes, oldVars) {
  // 1. 建 ctx
  var ctx = {
    input: { edicts, xinglu, memRes, oldVars, timeRatio: getTimeRatio() },
    prompt: { sysP: '', shizhengji: '', zhengwen: '', playerStatus: '', playerInner: '', turnSummary: '', lifecycleBlock: '' },
    subcalls: { _runSubcall: null, _tok: null, _buildFetchBody: null, _truncatedOnce: false, _effectiveOutCap: 0, _checkTruncated: null },
    results: { sc0: null, sc05: null, sc1: null, sc1b: null, sc1c: null, sc07: null, sc15: null, sc16: null, sc17: null, sc18: null, sc19: null, sc20: null, sc21: null, sc22: null, sc23: null, sc24: null, sc25: null, sc26: null, sc27: null, sc_consolidate: null },
    apply: { _hardConstraints: '', _changeSummary: [], applied: { chars: null, factions: null, offices: null, fiscal: null, admin: null, events: null, harem: null } },
    followup: { npcDeep: null, fiscalMil: null, narrative: null },
    record: { shiluText: '', szjTitle: '', szjSummary: '', personnelChanges: [], hourenXishuo: '' },
    meta: { errors: [], warnings: [], timing: { promptBuild: 0, sc0: 0, sc05: 0, sc1: 0, sc1b: 0, sc1c: 0, apply: 0, followup: 0 }, retries: { sc1: 0, sc1b: 0, sc1c: 0 } }
  };

  // 2. 逐段 dispatch
  await TM.Endturn.AI.prompt.build(ctx);
  TM.Endturn.AI.subcalls.setupInfra(ctx);
  await TM.Endturn.AI.subcalls.runMain(ctx);     // 跑 sc0/sc05/sc1/sc1b/sc1c/sc07
  await TM.Endturn.AI.apply.writeBack(ctx);      // §4 字段族 GM 落地
  await TM.Endturn.AI.followup.run(ctx);         // §5 sc15-27 后续

  // 3. 收尾 + return
  return TM.Endturn.AI.record.finalize(ctx);
}
window._endTurn_aiInfer = _endTurn_aiInfer;
TM.Endturn.AI.infer = _endTurn_aiInfer;
```

---

## 3·边界规则 (与 Codex 共识)

### 3.1 不许做

- ❌ Phase 7 内不加 feature·不改 prompt 措辞·不改 AI 调用 latency / count / structure
- ❌ 不在 ctx 加未声明的 ad hoc key (新 key 必先 update 本 doc)
- ❌ §4 apply 不再拆 7 字段族 (字段族留 internal helper·非 namespace public)
- ❌ baseline smoke 未 green 时·**禁** 移代码

### 3.2 必须做

- ✅ 每 sub-slice 必跑 focused smoke + full verify-all
- ✅ 公共签名保·`_endTurn_aiInfer(edicts, xinglu, memRes, oldVars)` 不变·`window._endTurn_aiInfer` 不破·`TM.Endturn.AI.infer` 不变
- ✅ API call count + structure 保·`sc07` 行为不变 (除非用户显式重开 latency pass)
- ✅ index.html script load order + `ref-check` 守
- ✅ 编码异常·先 Node bytes 验·非误判 mojibake

### 3.3 boundary 错就 stop

若 sub-slice 实施时发现 ctx 字段定义错·或 §X-§Y 实际 boundary 与 prep 不符·**stop + handoff letter**·非 force move·

---

## 4·R147 line numbers correction (Codex audit·2026-05-04)

| § | R147 估 (stale) | **实测** | 大小 |
|---|---|---|---|
| §1 | L17-3120 | L17-3245 | ~3228 |
| §2 | L3121-3200 | **L3246**-3401 | ~155 |
| §3 | L3201-5055 | **L3402**-5777 | ~2375 |
| §4 | L5056-9580 | **L5778**-10372 | **~4594** (max) |
| §5 | L9581-end | **L10373**-12592 | ~2219 |

按 semantic markers (`§4 sc1 写回`·`§5 sc15-sc27`) 拆·非按 R147 估·

---

## 5·current

- **P7-α done**·ctx contract locked + line numbers updated
- **P7-β baseline 即启**·15-20h·建 12-20 smoke
- 启动条件全 met·

— Claude (P7-α ctx contract·2026-05-04)

---

## 6·boundary 教训 (P7-θ closeout·2026-05-05)

P7-δ/ε/ζ 实施时·Codex 两次纠正了 Claude 的 boundary 判断·**两次都对**·教训 lock·

### 6.1 line marker ≠ lexical scope

R147 / 本 doc §4 的 line number marker 是 **source navigation aid**·非 **JS lexical / semantic boundary**·

未来若再做 mega-fn split·**必须按 lexical scope (callback / try-block / IIFE) 实拆**·非按 line marker 划·切刀前 grep 闭合括号 + 异常路径·

### 6.2 sc1 callback owns apply/writeback·§5 in top-level

P7-δ/ε 落地时确认·**§4 sc1 writeback 不是 top-level**·而是 sc1 callback 内·因 sc1 retry / error / timing wrapper 必须包写回·硬切到 top-level 会破·

- ✅ §4 写回·必须在 `await TM.Endturn.AI.subcalls.runMain(ctx, async function afterSc1(){ ... apply.writeBack(ctx) ... })` 内
- ✅ §5 follow-up·在 sc1 callback **关闭后** 调·top-level·`await TM.Endturn.AI.followup.run(ctx)`
- ❌ §4 移 top-level·破 sc1 retry 语义·禁
- ❌ §5 入 sc1 callback·破 sc1 wrapper 边界·禁

### 6.3 整 callback 一刀·非半搬

P7-ε 落地时确认·若 callback body 整体属同一语义单元·**整搬**·非半搬·

- 同 sc1 callback 的预处理 (`applyAITurnChanges`·`GM._needsReconcile` 二审) + 7 字段族写回 + record 字段 hand-off·**全是 apply unit**·整迁 `tm-endturn-apply.js`·
- 留半个 callback 在 ai-infer·破语义边界·**禁**·

---

## 7·hand-off 字段表 (P7-θ closeout·2026-05-05)

5 module 之间 ctx 字段 hand-off 全 lock·实施时 grep 字段名·验明 producer/consumer·

### 7.1 prompt → ai/subcalls (§1 → §2/§3)

| 字段 | producer | consumer | 说明 |
|---|---|---|---|
| `ctx.prompt.sysP` | prompt.build | subcalls.runMain (sc0/sc05/sc1/sc1b/sc1c/sc07) | system message·有截断 |
| `ctx.prompt.tp` | prompt.build | subcalls.runMain (sc0 L229 tp0·sc1 L848 tp1) | sub-call prompt base·R209a |
| `ctx.prompt.sc` | prompt.build | subcalls.runMain | scenario ref·findScenarioById(GM.sid) |
| `ctx.prompt._shiluR/_shiluMin/_shiluMax` | prompt.build | sc1 prompt | 实录字数范围 |
| `ctx.prompt._szjR/_szjMin/_szjMax` | prompt.build | sc1 prompt | 时政记字数范围 |
| `ctx.prompt._hourenR/_hourenMin/_hourenMax` | prompt.build | sc2 prompt | 后人戏说字数范围 |
| `ctx.prompt._zwR/_zwMin/_zwMax` | prompt.build | 兼容保留 | 兼容旧字段·未来可去 |
| `ctx.prompt._commentR` | prompt.build | sc2 prompt | 评论字数 |
| `ctx.subcalls.{_runSubcall, _tok, _buildFetchBody, _checkTruncated, _effectiveOutCap}` | subcalls.setupInfra | subcalls.runMain·apply.writeBack·followup.run | sub-call 基础设施·factory + helpers |

### 7.2 ai/subcalls + apply → followup (§2/§3 + §4 → §5)

| 字段 | producer | consumer | 说明 |
|---|---|---|---|
| `ctx.results.sc0` | runMain (sc0) | followup.run (sc15 prompt) | 深度思考记忆 |
| `ctx.results.sc05` | runMain (sc05) | followup.run (sc15 prompt) | 记忆回顾 |
| `ctx.results.sc1` | runMain (sc1) | apply.writeBack·followup.run | 主结构化推演·**apply 写回 GM 的源** |
| `ctx.results.sc1b` | runMain (sc1b) | followup.run | 文事鸿雁人际 |
| `ctx.results.sc1c` | runMain (sc1c) | followup.run | 势力外交·NPC阴谋 |
| `ctx.results.sc07` | runMain (sc07) | followup.run | NPC 认知整合 |
| `ctx.apply.applied.{chars,factions,offices,fiscal,admin,events,harem}` | apply.writeBack | followup.run (sc15-18 引用) | 7 字段族写回结果摘要 |
| `ctx.apply._hardConstraints` | apply.writeBack | followup.run (sc15+ prompt) | 硬约束·sub-call 反推 |
| `ctx.followup.p1Summary` | apply.writeBack (内部 sc1 后) | followup.run | sc1 摘要·sc15+ prompt 用 |

### 7.3 followup → record/final return (§5 → return)

| 字段 | producer | consumer | 说明 |
|---|---|---|---|
| `ctx.results.{sc15, sc_memwrite, sc16, sc17, sc18, sc_audit, sc25, sc27, sc28, sc_consolidate}` | followup.run | (debug/trace·无消费) | 11 sub-call 输出·后台 trace |
| `ctx.results.sc2` | followup.run (Branch C) | record.finalize·via ctx.record.suggestions | 叙事正文·suggestions 提自此 |
| `ctx.followup.{npcDeep, fiscalMil, narrative}` | followup.run | (汇总 view·debug) | 三路汇总·非 record |
| `ctx.followup._changeSummary` | followup.run (sc25 body) | record (内部 hand-off·R209a) | 变化摘要·R209a 移自 apply |
| `ctx.record.shizhengji` | followup.run | record.finalize | 时政记 (sanitize 后由 ai-infer 写回) |
| `ctx.record.zhengwen` | followup.run | record.finalize | 朝堂正文 (sanitize 后由 ai-infer 写回) |
| `ctx.record.playerStatus` | followup.run | record.finalize | 玩家状态 |
| `ctx.record.playerInner` | followup.run | record.finalize | 玩家内心 |
| `ctx.record.turnSummary` | followup.run | record.finalize | 回合摘要 |
| `ctx.record.shiluText` | followup.run | record.finalize | 实录正文 (sanitize 后由 ai-infer 写回) |
| `ctx.record.szjTitle` | followup.run | record.finalize | 时政记标题 |
| `ctx.record.szjSummary` | followup.run | record.finalize | 时政记摘要 |
| `ctx.record.personnelChanges` | followup.run | record.finalize | 人事变动数组 |
| `ctx.record.hourenXishuo` | followup.run | record.finalize | 后人戏说 (sanitize 后由 ai-infer 写回) |
| `ctx.record.suggestions` | followup.run (sc2 → ctx.record.suggestions) | record.finalize | 玩家建议·**优先 ctx.record·非 (p2&&p2.suggestions) 直读** |
| `ctx.input.timeRatio` | ai-infer (主入口) | record.finalize | 时间倍率·getTimeRatio() |

### 7.4 sanitize 边界 (P7-η)

| 字段 | sanitize 操作 | 位置 |
|---|---|---|
| `shizhengji` | `_stripHtmlResidue(shizhengji)` | ai-infer (主入口·非 record) |
| `zhengwen` | 同上 | ai-infer |
| `shiluText` | 同上·条件 | ai-infer |
| `hourenXishuo` | 同上·条件 | ai-infer |

**sanitize 后必须先写回 ctx.record·再调 record.finalize(ctx)**·否则 finalize 返回未 sanitize 值·

---

## 8·Phase 7 closeout·6 module split 完成 (P7-θ·2026-05-05)

| § | module | 行数 | owner | 阶段 |
|---|---|---|---|---|
| §1 | tm-endturn-prompt.js | 3268 | Claude | P7-γ |
| §2+§3 | tm-endturn-ai.js | 2686 | Codex | P7-δ |
| §4 | tm-endturn-apply.js | 4677 | Codex | P7-ε |
| §5 | tm-endturn-followup.js | 2279 | Codex | P7-ζ |
| record | tm-endturn-record.js | 51 | Claude | P7-η |
| 主入口 + bridge + sanitize + 兜底 | tm-endturn-ai-infer.js | 244 | (collab) | P7-α/β/γ/δ/ε/ζ/η bridge |

总·原 ai-infer.js 12602 行 → 6 module 13205 行 (+4.8% from head notes / IIFE wrapper / ctx re-bind bridge)·

ai-infer.js 12602 → 244·**-98%**·

verify-all 60/60·**11 endturn baseline 309 assertions**·zero regression·

— Claude + Codex (Phase 7 6 module split·2026-05-05)
