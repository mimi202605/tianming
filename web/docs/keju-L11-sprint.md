# 科举·Stage 2·Phase L·Slice L11·改革反复 rollback + 跨剧本承袭 UI

**date**·2026-05-25
**status**·draft v2·audit 收口·18 项 fix·待 implement
**estimated**·~2-2.5 d (v2 净加 ~75 doc·实施 ~95 行)
**dependency**·L1 _reformInProgress / _reformChronicle / _kjpResetToPreset·L2 _kjpComputeDiff·L7 chronicle entry·**L8 inheritance archive + scenario hook (已 wired)**·L9 canonicalName·L10 preset
**flag gate**·`P.conf.useNewKejuL11=false` 默认 off (需 L7+L8+L9 同 enable)

**红线 reminder**·
- **复用·非自建** — keyi `topicType='reform'` + 新 `intent='rollback'`·非加新 topicType
- **失败禁玄幻** — rollback 失败·政治后果 (chars 反喷 + 名望 -·非天命)
- **工具 vs 系统** — rollback 是系统型·走 keyi + chars + memorial (跟 reform 同代价)
- **保 keyi 800 行** — _kjReformKeyiCallback 已 dispatch by intent·扩 'rollback' 分支即可
- **9 朝代 preset** — radical 派生·L10 preset 已含 rollback chain (xining/yuanyou/shaosheng/chongning)
- **doc v1 误述 2 项已收回** — L8 archive + scenario hook 已 wired·L11 不重做

---

## 0·v1 → v2 audit 18 项·汇总

| # | layer | sev | 内容 | v2 处理 |
|---|---|---|---|---|
| A1 | surface | HIGH | timeline button 缺 flag gate | §4.3 button gate 补 |
| A2 | surface | MID | L10 'rollback' 跨剧本无 target 静默 fail | §1.1(B) 加 fallback 'restoration' + toast |
| A3 | surface | LOW | modal 列死人 | §1.2 加 alive filter |
| **B1** | function | **CRITICAL** | overlap 不识 rollback | §1.3.5 新 + L7 overlap 改 ~10 行 |
| **B2** | function | **CRITICAL** | L9 命名 prompt 不见 intent·生错名 | §3.5 + L9 prompt 改 ~10 行 |
| B3 | function | HIGH | _diffPruned reverseDiff 不可建 | §1.4 改·L7 matured 加 _reverseSnapshot ~25 行 |
| B4 | function | MID | flip 后 chronicle 保留 | §1.5 明保留 |
| B5 | function | MID | NpcMemory weight 叠加 | §1.6 half-weight 限制 |
| C1 | mechanic | HIGH | rollback 自废禁 | §4.3 button gate + Q3 default |
| C2 | mechanic | HIGH | chronicle 文 rollback branch | §3.6 + L7 _kjpL7WriteChronicleSummary 改 3 行 |
| C3 | mechanic | MID | rolledBackBy / rollbackTargetId 双向 link | §1.5 强调 |
| C4 | mechanic | MID | L9 swan rollback ramping 可触·desired | §3.7 doc 补 |
| C5 | mechanic | LOW | _kjpInitParadigm 清 _inheritance? | §3.8 grep verify·doc 状态 |
| ~~D1~~ | cross | — | ~~L8 archive 无人调~~ | **删·已 wired (L7:642)** |
| ~~D2~~ | cross | — | ~~scenario hook 缺~~ | **修·已 wired (runtime:161)·L11 只补 UI** |
| D3 | cross | MID | inheritance modal async hook | §2.3 callback paradigm 设计 |
| D4 | cross | MID | memorial prompt 不见 intent | §3.9 + _kjSpawnReformMemorial 改 5 行 |
| D5 | cross | MID | archive 无 canonicalName fallback | §2.2 fallback chain 设计 |

**净 16 项 fix** (-2 删的误述)·**doc v2 净加 ~75 行·实施净加 ~95 行**·est 1.8 → 2.0-2.5 d·**ship readiness 不变**·全是收口 + 真复用。

---

## 1·rollback 数据流·端到端

### 1.1·UI 触发点 (2 处)

**(A)·L7 history timeline·"废止"按钮** (§4.3 button gate 见 A1+C1)

- gate·`status ∈ {ramping/active/matured} && status !== 'rolled_back' && !tags.includes('rollback') && P.conf.useNewKejuL11 === true`
- 阻止·rollback 自己再 rollback (C1)·rolled_back entry 不显·flag off 不显
- click → 开 rollback sub-modal·user 选 mode + scope + 提交 → 走现 reform keyi

**(B)·L10 preset 模板·rollback 标记**·**v2·A2 fix·静默 fallback**

- L10 preset `song_yuanyou_genghua` / `song_shaosheng` / `song_chongning` 含 `tags:['rollback', ...]`
- 当 user 点这类 preset 时·**先查 last ramping/active reform**·
  - 有 → UI confirm "此为 rollback preset·将废止现行改革·确认?"·fill draft + `intent='rollback'` + `rollbackTargetId=<id>`
  - 无 → **toast 提示"无前改可废·已退化为复古立法"** + fill draft + `intent='restoration'` (走 _kjpResetToPreset path)
- **A2·静默 fallback** — 防新剧本无前改时静默崩

### 1.2·rollback sub-modal 字段·**v2·A3 fix·alive filter**

```
┌──────────────────────────────────────────┐
│ 废止改革·熙宁变法 (1071·王安石·active)    │
├──────────────────────────────────────────┤
│ 反复 mode·                                │
│   ○ partial·部分回滚·保留新加科·去除…    │
│   ● full·全面更化·还原至 pre-reform 状态 │
│   ○ pivot·改革再造·去旧 + 加新           │
│                                          │
│ 反对派 (将转支持·alive N 人·已亡 K 人灰)·│
│   司马光·苏轼·韩琦·(吕公著·已亡)…         │
│                                          │
│ 支持派 (将转反对·alive M 人·已亡 L 人灰)·│
│   吕惠卿·章惇·曾布·(王安石·已退)…         │
│                                          │
│ 史评 hint·若全面更化·radical=80          │
│   预估·朝野震动·北宋根基动                │
│                                          │
│ [取消]  [发起议政]                       │
└──────────────────────────────────────────┘
```

- alive filter·`ch && !ch._retired && ch.alive !== false` 实色·其余灰色 + 标注
- count 显示·alive 真数·区别死/退

### 1.3·提交 flow

```
user 点"发起议政"
  → _kjpL11OpenRollbackModal()·draft + rollbackTargetId·确认
  → draft.intent = 'rollback'
  → draft.rollbackMode = 'partial'/'full'/'pivot'
  → draft.rollbackTargetId = 'reform_1071_X'
  → _kjpL11BuildReverseDiff(targetEntry, mode, partialKeep)·算 reverseDiff
  → topicData.paradigmDiff = reverseDiff
  → topicData.intent = 'rollback'
  → topicData.rollbackTargetId = <id>
  → openKeyiSession({topicType:'reform', topicData})
  → tinyi v3·廷议
  → 通过 → _kjReformKeyiCallback(method, ctx)
       ├─ intent='rollback' 分支·
       │   1. **B1·overlap check·rollback target===ip.histId 时 bypass** (见 §1.3.5)
       │   2. derive outcome (复用·resistance·原支持派 count + radical)
       │   3. apply reverseDiff (复用 _kjpL7ApplyDiffToParadigm)
       │   4. append history (复用 _kjpL7AppendHistory·entry.tags 含 'rollback')
       │   5. **flip 原 entry**·target.status='rolled_back'·target.rolledBackBy=newEntry.id (§1.5)
       │   6. chars impact·**mirror**·原 support→反对·原 oppose→支持 (§1.6)
       │   7. 反弹·走 _kjpL7MaybeTriggerReformReaction·ctx.intent='rollback' 透传 (§D4)
       │   8. **L9 命名·prompt 加 intent='rollback'·LLM 生 "X更化/X罢法"** (§3.5)
       │   9. chronicle "X 年罢 Y·...更化"·prefix '罢科举·' (§C2)
       └─ done·rollback 自己 ramping (跟普通 reform 同 30y matured)
```

### 1.3.5·**v2 新·B1 fix·overlap 不识 rollback**

**L7 _kjpL7CheckOverlapAccept 改 ~10 行**·

```js
function _kjpL7CheckOverlapAccept(outcome, ctx) {                // 加 ctx 参
  var paradigm = ...;
  var ip = paradigm && paradigm._reformInProgress;
  if (!ip) return true;

  // v2·B1·rollback 之 target 就是 ip 本身·跳 overlap·rollback 本质是答案
  if (outcome.intent === 'rollback' &&
      ctx && ctx.topicData && ctx.topicData.rollbackTargetId === ip.histId) {
    // 标记·防 L7 tick 在 rollback 时仍推进 target
    ip._beingRolledBack = true;
    return true;
  }
  // ... 现 prompt path 不变
}
```

- 调用方·`_kjReformKeyiCallback` step 2 改·`_kjpL7CheckOverlapAccept(outcome, ctx)` 传 ctx
- 标 `ip._beingRolledBack = true`·`_kjpL7TickRampingReform` 见此标·跳本 entry tick (防 target ramping → active 在 rollback 期间)

### 1.4·reverseDiff 计算·**v2·B3 fix·依赖 _reverseSnapshot**

```js
// L11·new·_kjpL11BuildReverseDiff(targetEntry, rollbackMode, partialKeep)
function _kjpL11BuildReverseDiff(targetEntry, rollbackMode, partialKeep) {
  // 1·优先用 targetEntry.diff (未 matured)
  if (targetEntry.diff && !targetEntry._diffPruned) {
    return _buildFromDiff(targetEntry.diff, rollbackMode, partialKeep);
  }
  // 2·matured 后·diff = null·用 _reverseSnapshot (L7 matured 时 snapshot)
  if (targetEntry._reverseSnapshot) {
    return _buildFromSnapshot(targetEntry._reverseSnapshot, rollbackMode, partialKeep);
  }
  // 3·都没·degraded·走 _kjpResetToPreset 全 reset (类似 'restoration' intent)
  return { _degradedReset: true, era: GM._kejuParadigm.initEra };
}
```

- **L7 改 ~25 行**·matured 分支 line 608 前·snapshot 入 entry·
```js
// v2·L11·B3·matured 时 snapshot reverse 数据·防 prune 后 rollback 无据
entry._reverseSnapshot = {
  addedSubjectIds: (entry.diff && entry.diff.subjects && entry.diff.subjects.added || []).map(function(s){ return s.id; }),
  addedSubjectNames: (entry.diff && entry.diff.subjects && entry.diff.subjects.added || []).map(function(s){ return s.name; }),
  removedSubjectSnapshots: (entry.diff && entry.diff.subjects && entry.diff.subjects.removed || []).map(function(s){ return Object.assign({}, s); }),
  ideologyOld: (entry.diff && entry.diff.ideology && entry.diff.ideology.old) || null,
  examIntervalOld: (entry.diff && entry.diff.examInterval && entry.diff.examInterval.old) != null ? entry.diff.examInterval.old : null,
  retakePolicyOld: (entry.diff && entry.diff.retakePolicy && entry.diff.retakePolicy.old) || null
};
// 然后 entry._diffPruned=true; entry.diff=null;
```

### 1.5·原 entry flip·**v2·B4+C3 强调**

```js
function _kjpL11FlipTargetReform(targetEntry, newEntryId) {
  targetEntry.status = 'rolled_back';
  targetEntry.rolledBackBy = newEntryId;                // C3·双向 link
  targetEntry.rolledBackYear = GM.year || 0;
  // 清 _reformInProgress·若指 targetEntry
  var ip = GM._kejuParadigm._reformInProgress;
  if (ip && ip.histId === targetEntry.id) {
    GM._kejuParadigm._reformInProgress = null;
    GM._kejuParadigm._applyDelay = 0;
  }
  // _l8FailCount + _lastEvolveYear clear·防 L8 evolve tick 持续 hit
  targetEntry._l8FailCount = 0;
  targetEntry._lastEvolveYear = 0;
  // **v2·B4·chronicle text 保留** — chronicle[targetEntry.id] 历史 record 留·L18 timeline 用
  // L8 evolve tick filter 自动 skip (status===rolled_back 不在 ramping/active list)
}
```

### 1.6·chars impact·mirror·**v2·B5 fix·half-weight**

```js
function _kjpL11ApplyRollbackCharsImpact(targetEntry, outcome, newEntry) {
  // 1·原 supportNpcs (现 rollback 反对者)·
  //   - reformLean 倒一半 (走 _kjpAccumReformLean·delta = -原 deltas/2)
  //   - NpcMemorySystem.remember 加"X 年朝议罢 Y·心有不甘"
  //   - **weight = Math.min(原 weight, deltas.oppLoyalty/2)** (v2·B5·防 memory 叠加爆)
  //   - 若 magnitudeParsed.radical >= 70 && !_retired·30% 概率挂冠
  // 2·原 opposeNpcs (现 rollback 支持者)·
  //   - reformLean 倒一半 (positive)
  //   - remember "X 年朝议罢 Y·如释重负"·weight half
  // 3·新 supportNpcs + opposeNpcs (本次 rollback 议政真站队)·
  //   - 走 _kjpL7ApplyCharsImpact (复用)
  //   - overlap 时·step 3 覆 step 1+2 (priority 新意愿)
}
```

---

## 2·跨剧本承袭·UI announce modal (L8 已 wired·L11 只补 UI)

### 2.1·当前 L8 状态·**v2·D2 修**

- `initKejuSystem(scenario)` (tm-keju-runtime.js:23) 每次 load 新 scenario 都 call
- 内部尾部 line 161 调 `_initKejuL8Hook()`
- `_initKejuL8Hook` 内部 setTimeout 0 调 `_kjpL8MaybeApplyInheritance()`
- **结论·hook 已每次 scenario load 都触·L11 不补 trigger·只补 UI announce modal**

### 2.2·UI announce modal·**v2·D5 fix·fallback chain**

`_kjpL11RenderInheritanceModal(verdict, archive)`·展示·

```
┌────────────────────────────────────────────┐
│ 📜 新朝承前·X 朝改革               [关闭] │
├────────────────────────────────────────────┤
│ 前朝·宋·神宗朝                              │
│ 改革·熙宁变法 (王安石·1071)                 │
│ 史评·王安石主新法·三经新义·罢诗赋…          │
│                                            │
│ 本朝决议·折中                                │
│ 诏曰·"诏曰·前朝改革有得有失·朕酌行之…钦此" │
│                                            │
│ 实际加 2 科·三经新义·策论                   │
│ 实际去 1 科·诗赋                             │
│                                            │
│              [知道了]                       │
└────────────────────────────────────────────┘
```

- **A·archive.canonicalName fallback chain (v2·D5)**·
  - `archive.canonicalName || (archive.emperor + '改革') || '前朝改革'`
  - 兼容旧 archive·canonicalName 是 L9 RBB BB-A1 才补
- **B·subjects 加/去 count**·从 verdict.mode + paradigm.subjects 实算 (diff with snapshot before/after)
- modal 用 div + CSS·非 alert·跟 L8/L9/L10 modal 同 paradigm

### 2.3·async hook·**v2·D3 fix·callback paradigm**

```js
// L8·_kjpL8MaybeApplyInheritance·改 4 行·末尾加 callback
function _kjpL8MaybeApplyInheritance() {
  ...
  _kjpL8LlmInheritanceVerdict(archive, scenario).then(function(verdict) {
    if (!verdict) return;
    if (!GM._kejuParadigm) return;
    GM._kejuParadigm._inheritance = verdict;
    _kjpL8ApplyInheritanceMode(verdict, archive);
    // ... 现 chronicle + toast 留
    // v2·L11·D3·async hook·spawn UI modal
    try {
      if (typeof window !== 'undefined' && typeof window._kjpL11RenderInheritanceModal === 'function') {
        window._kjpL11RenderInheritanceModal(verdict, archive);
      }
    } catch(_){}
  });
}
```

- L11 file 暴露 `_kjpL11RenderInheritanceModal` global·L8 callback 调
- 若 L11 flag off·**modal function 内部 guard·noop**·不破 L8

---

## 3·复用面汇总·**v2·更新**

| L11 需要 | 复用 / 新加 | 文件 / 函数 |
|---|---|---|
| keyi flow | 复用 | `KEYI_TOPIC_TYPES.reform` + `openKeyiSession` |
| outcome derive | 复用 | `_kjpL7DeriveOutcome` (intent='rollback' branch fall-through OK) |
| **overlap check** | **复用 + 改** | `_kjpL7CheckOverlapAccept` 加 rollback bypass (**v2·B1**) |
| apply diff | 复用 | `_kjpL7ApplyDiffToParadigm` + `_kjpL7MergeDiff` |
| append history | 复用 | `_kjpL7AppendHistory` (entry.intent 透传) |
| state machine | 复用 | `_kjpL7TickRampingReform` (注·rollback target ip._beingRolledBack 标·tick skip) |
| chars impact | 半 mirror | `_kjpAccumReformLean` + `NpcMemorySystem.remember` (weight half·v2·B5) |
| **反弹 memorial** | **复用 + intent passthrough** | `_kjpL7MaybeTriggerReformReaction` + `_kjSpawnReformMemorial` (v2·D4) |
| **chronicle 文** | **复用 + branch** | `_kjpL7WriteChronicleSummary` 加 'rollback' → '罢科举·' (v2·C2) |
| **LLM 命名** | **复用 + prompt intent** | `_kjpL9MaybeNameReform` + `_kjpL9LlmNameReform` prompt 加 intent (v2·B2) |
| 黑天鹅 | 复用 | `_kjpL9MaybeSpawnBlackSwan` (rollback ramping 全 type 可触·desired·v2·C4) |
| LLM evolve | 复用 | `_kjpL8EvolveTick` (rollback ramping 也走年度演化) |
| **archive (L8)** | **已 wired·不动** | `_kjpL8ArchiveMatured` (tm-keju-reform-apply.js:642·v2·D1 收回) |
| **inheritance trigger** | **已 wired·不动** | `_initKejuL8Hook` (runtime:161·v2·D2 收回) |
| **inheritance UI modal** | **新** | `_kjpL11RenderInheritanceModal` + L8 callback hook (v2·D3) |
| reverseDiff 算 | **新** + L7 snapshot | `_kjpL11BuildReverseDiff` + L7 matured `_reverseSnapshot` (v2·B3) |
| 原 entry flip | **新** | `_kjpL11FlipTargetReform` |
| chars mirror | **新薄 wrapper** | `_kjpL11ApplyRollbackCharsImpact` |
| rollback modal UI | **新** | `_kjpL11OpenRollbackModal` + `_kjpL11RenderRollbackContent` |
| timeline 注 button | **新** | panel.js 渲 entry 时·rollback button gate |

**新 helper 数·7 (3 logic + 3 UI + 1 inheritance modal)·全在 `tm-keju-reform-rollback.js` (~430 行)**
**改 L7/L8/L9/memorial/panel 全是 micro-edit·总 ~95 行**

### 3.5·**v2·B2 fix·L9 命名 prompt 加 intent**

`_kjpL9LlmNameReform`·prompt 加 4 行·

```js
var natureLbl = entry.intent === 'rollback' ? '废止 / 复旧'
              : entry.intent === 'restoration' ? '复古'
              : '改新';
var prompt =
  '【改革】' + entry.magnitudeDescriptor + '·' + (entry.method || '') + '\n' +
  '【性质】' + natureLbl + '\n' +                          // v2·新
  '【朝代】' + (paradigm.initEra || '') + '·年 ' + (entry.year || '') + '\n' +
  '【主导】' + (entry.by || '陛下') + '\n' +
  '【新加科】' + addedLine + '\n\n' +
  '请按真历史命名 paradigm 起改革之名 (5-12 字)·\n' +
  '- 改新风格·"熙宁变法" / "张居正考成法" / "戊戌新政"\n' +
  '- 废止 / 复旧风格·"元祐更化" / "绍圣绍述" / "崇宁党禁" / "X 罢法"\n' +     // v2·新
  '- 复古风格·"X 复古" / "X 还古制"\n' +                                          // v2·新
  '- 若主导有名·头冠主导者姓·若年号·冠年号·若核心方·冠"X 法"\n' +
  '- 史评·客观持中·50 字·非褒非贬·叙方向 + 后世评价倾向\n\n' +
  '返 JSON·{canonicalName, historicalEvaluation}';
```

### 3.6·**v2·C2 fix·chronicle 文 rollback branch**

`_kjpL7WriteChronicleSummary` line 793-795 改·

```js
// v2·L11·C2·intent='rollback' 加 branch·非落入'改科举·'误导
var verbPrefix = histEntry.intent === 'restoration' ? '复古·'
               : histEntry.intent === 'rollback'    ? '罢科举·'
               : '改科举·';
var text = voice + '·' + verb + '·' + verbPrefix +
           (histEntry.magnitudeDescriptor || '') + '·' + _kjpL7MethodLabel(histEntry.method);
```

### 3.7·**v2·C4·L9 swan rollback ramping**·desired·doc 补

- rollback 入 ramping 期·L9 swan 4 type 均可触
- examiner_corrupt / student_boycott / reformer_illness / finance_diversion 跟 reform ramping 同对待
- LLM swan prompt 已含 entry.magnitudeDescriptor·rollback 的 magnitudeDescriptor 是"罢..."·prompt naturally 生 rollback-context swan (无需改 L9)
- 注·rollback 中"reformer_illness" 的 reformer 是新 rollback 的发起者 (entry.by)·非 target.by — verify L9 prompt 用的是 entry.by·**已 verify**·OK

### 3.8·**v2·C5·_kjpInitParadigm _inheritance 重置**

需 grep verify·_kjpInitParadigm 是否在 force 重新建时清 `_inheritance`·若否·load 同剧本不清·user 仍见"前朝承前"toast 但其实是旧 cache。

**实施时**·grep _kjpInitParadigm·若不清·补 1 行 `paradigm._inheritance = null` (force=true 时)。
**doc·non-blocking** — 暂留作实施 task。

### 3.9·**v2·D4 fix·memorial 加 intent passthrough**

`_kjSpawnReformMemorial(hist, ctx)`·prompt 加 4 行·

```js
var natureLbl = hist.intent === 'rollback' ? '废止前改' :
                hist.intent === 'restoration' ? '复古立法' : '改革';
prompt += '\n【性质】' + natureLbl + '\n';
prompt += hist.intent === 'rollback'
  ? '若改革者门生·反对废止·若守旧·拥护废止·若新进·中立观望\n'
  : '若改革者·支持·若守旧·反对·若新进·中立\n';
```

- `_kjpL7MaybeTriggerReformReaction` 调时·hist.intent 已透传 (entry.intent in append)
- memorial spawn 自动用·零改 caller

---

## 4·新文件 + 改动文件·**v2 净加 ~95 行**

### 4.1·`tm-keju-reform-rollback.js`·**新** (~430 行)

```
- §0·gate·_isL11Enabled (L7+L8+L9 全 enable check)
- §1·UI 触发点·timeline 注 [废止] button + click handler
- §2·_kjpL11OpenRollbackModal(targetEntry)·开 sub-modal
- §3·_kjpL11RenderRollbackContent(targetEntry)·DOM build (含 alive filter·v2·A3)
- §4·_kjpL11BuildReverseDiff(targetEntry, mode, partialKeep)·_reverseSnapshot 优先 (v2·B3)
- §5·_kjpL11SubmitRollback(targetEntry, mode, partialKeep)·提交·openKeyiSession
- §6·_kjpL11FlipTargetReform(targetEntry, newEntryId) (v2·B4)
- §7·_kjpL11ApplyRollbackCharsImpact(targetEntry, outcome, newEntry) (v2·B5 half-weight)
- §8·_kjpL11ApplyL10RollbackPreset(preset)·v2·A2·fallback 'restoration' if no target
- §9·_kjpL11RenderInheritanceModal(verdict, archive)·v2·D5 fallback chain
- §10·expose·window._kjpL11* + TM.Keju.Rollback
```

### 4.2·`tm-keju-reform-apply.js`·**改** (~50 行)

| 改 | v2 fix | 行 |
|---|---|---|
| `_kjReformKeyiCallback` step 4 后·intent='rollback' 分支 (call mirror chars + flip target) | core | ~15 |
| `_kjpL7CheckOverlapAccept(outcome, ctx)`·rollback bypass | **B1** | ~10 |
| `_kjpL7TickRampingReform`·`ip._beingRolledBack` skip | **B1** | ~5 |
| `_kjpL7TickRampingReform` matured 分支·`_reverseSnapshot` snapshot 前 prune | **B3** | ~25 |
| `_kjpL7WriteChronicleSummary`·`verbPrefix` 加 rollback branch | **C2** | ~3 |

### 4.3·`tm-keju-paradigm-panel.js`·**改** (~150 行)

| 改 | v2 fix | 行 |
|---|---|---|
| timeline entry 加 [废止] button·gate (status + flag + !rollback tag + !rolled_back) | A1+C1 | ~30 |
| L10 preset rollback tag·confirm + fallback restoration | A2 | ~25 |
| rollback sub-modal 渲·alive filter + count | A3 | ~80 |
| inheritance modal hook (受 L8 callback)·已在 §9 of rollback.js | D3 | ~0 |
| `_kjpL11MarkUserEdited` 类·rollback draft 也需 mark | extension | ~15 |

### 4.4·`tm-keju-reform-evolution.js`·**改** (~15 行)

| 改 | v2 fix | 行 |
|---|---|---|
| `_kjpL9LlmNameReform`·prompt 加【性质】+ 命名 hint·rollback / restoration / 改新 | **B2** | ~10 |
| `_kjpL8MaybeApplyInheritance` `.then` 末尾·callback `_kjpL11RenderInheritanceModal` | D3 | ~5 |

### 4.5·`tm-keju-reform-memorial.js`·**改** (~8 行)

| 改 | v2 fix | 行 |
|---|---|---|
| `_kjSpawnReformMemorial` prompt 加【性质】+ 立场 hint | D4 | ~8 |

### 4.6·`tm-keju-paradigm.js`·**改 (optional)** (~3 行)

| 改 | v2 fix | 行 |
|---|---|---|
| `_kjpInitParadigm` force=true 分支·清 `_inheritance` | C5 | ~3 |

### 4.7·`tm-keju-paradigm-panel.css`·**改** (~50 行)

- `.kjp-l11-rollback-modal`·`.kjp-l11-rollback-actions`·`.kjp-l11-mode-radio`
- `.kjp-l11-npc-dead`·`.kjp-l11-npc-retired` (灰色 + 删除线 alive filter)
- `.kjp-l11-inheritance-modal`·`.kjp-l11-inh-edict`·`.kjp-l11-inh-subjects`
- `.kjp-l11-rollback-btn`·timeline button

### 4.8·`index.html`·**改** (~1 行)

```html
<script src="tm-keju-reform-rollback.js?v=20260525-l11"></script>
```

### 4.9·smoke `scripts/smoke-l11-rollback-inheritance.js`·**新** (~55-65 case)

- §A·_kjpL11BuildReverseDiff·10 case·added/removed/weight 反·partial keep·_reverseSnapshot 优先·degraded fallback
- §B·_kjpL11FlipTargetReform·5 case·_reformInProgress clear·_l8FailCount reset·rolledBackBy 双向 link
- §C·_kjpL11ApplyRollbackCharsImpact·8 case·support→反对·oppose→支持·weight half·alive filter·新意愿 priority
- §D·rollback flow e2e·6 case·click [废止] → modal → 提交 → callback → history flip + chronicle 文 verb
- §E·L7 overlap·rollback target === ip.histId bypass·3 case·非 rollback overlap 仍 prompt·_beingRolledBack 标
- §F·L9 命名·intent='rollback' prompt path·3 case (mock LLM 验 prompt 含【性质】)
- §G·L7 chronicle verb·'罢科举·' for rollback·'复古·' for restoration·'改科举·' for reform·3 case
- §H·inheritance UI modal·_kjpL11RenderInheritanceModal·spawn / 不重 spawn / canonicalName fallback chain·5 case
- §I·L7 matured _reverseSnapshot·snapshot 写在 prune 前·5 case
- §J·L10 preset rollback fallback·有 target 走 rollback·无 target 走 restoration·toast 提示·3 case
- §K·red line·flag off 全 noop·rollback 自废禁·rolled_back entry 无 button·4 case

---

## 5·实施序·**v2 总 16-21 h ~ 2-2.6 d**

| step | 内容 | est |
|---|---|---|
| a | `tm-keju-reform-rollback.js` §0-§5·UI + reverseDiff core | 4-5h |
| b | apply.js·rollback 分支 + overlap bypass + chronicle verb + matured snapshot | 2.5h |
| c | rollback.js §6-§8·flip + chars mirror + L10 fallback | 2.5h |
| d | paradigm-panel.js·timeline button + L10 confirm + rollback modal | 3-4h |
| e | rollback.js §9 + L8 callback + memorial intent + L9 prompt intent | 2-2.5h |
| f | CSS + index.html + (optional) _kjpInitParadigm _inheritance clear | 1h |
| g | smoke 55-65 case + 全 regression | 2-3h |
| **total** | | **17-20.5 h ~ 2.1-2.6 d** |

---

## 6·red line check

| red line | 适应 |
|---|---|
| 复用 first | net-new 7 helper + 1 文件·5 micro-edit (~95 行)·rest 全复用 |
| 失败禁玄幻 | rollback failed·政治后果 (chars 反喷 + 名望 -)·非天命 |
| 工具 vs 系统 | rollback 是系统型·走 keyi + chars + memorial (跟 reform 同代价) |
| flag gate | useNewKejuL11 默认 off·gated by L7+L8+L9 enable |
| 9 朝代 preset | radical 派生·L10 preset 已含 rollback chain |
| 邸报中文 | 全中文 chronicle·verbPrefix 含 rollback branch |
| race / idempotent | rollback ramping 用 _lastL7TickTurn idempotent (复用·非新) |
| audit-first | doc v1 → v2·18 项 audit fix·2 项 doc 误述收回 |
| 大文件拆分 paradigm | rollback.js 是新文件·单一职责 (rollback + L11 modal)·非嵌入 evolution.js |
| 重构不顺手翻译 | 不 touch L7/L8/L9 中文 string·只加 verb/intent 分支 |

---

## 7·待 user 决定 (post-v2)

| Q | 内容 | default |
|---|---|---|
| Q1 | rollback 是否触发 L9 黑天鹅 | **是** (走现 4 type·v2·C4 doc 明) |
| Q2 | partial mode 是否允改 ideology | **否** (避 cascade) |
| Q3 | rollback 自己再被 rollback·禁还是允 | **禁** (v2·C1 button gate·防 chain 无终) |
| Q4 | cross-scenario inherit·modal 还是 toast | **modal** (v2·§2 设计·跟 L8/L9/L10 同 paradigm) |
| **Q5** | **v2 新** | A2·L10 'rollback' tag 跨剧本无 target·静默 fallback 'restoration' OK? | **是** (避免 user 体验崩) |
| **Q6** | **v2 新** | D3·inheritance modal async hook·callback paradigm (L8.then 调 L11) OK? | **是** (简净·非 polling) |

---

## 8·post-L11·L-B 剩余

- L12·改革后果 UI + 科举志 + timeline + 改革者传记 (1-2 d·UI 重·data 已全有)

L-B 全闭后·**ship 1.2.6.5·tracking L3-L11**·然后 GitHub push。

---

## 9·v2 ready 验

- ✅ 18 项 audit fix 全入 doc
- ✅ 2 项 doc 误述收回 (D1 L8 archive·D2 scenario hook)
- ✅ 5 文件改动行数明确 (~95 行)
- ✅ 1 新文件 ~430 行
- ✅ smoke 55-65 case·11 section
- ✅ 实施序 7 step·2.1-2.6 d
- ✅ 6 决定全列·5 default 明
- ✅ red line 10 项·全合规

**v2 ship readiness·waiting on user pass Q1-Q6 (5 default 推荐·1 待回)·或直 implement (default 全采)**
