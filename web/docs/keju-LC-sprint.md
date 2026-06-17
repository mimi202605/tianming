# 科举·Stage 2·Phase L·**L-C·UI 大改·paradigm panel 大整理**

**date**·2026-05-25
**status**·draft v2·audit 收口·6 项 fix·待 implement
**estimated**·**3-5 d** (分 5 slice)
**dependency**·L2-L12 全·refactor 全栈 1083 case 必通
**flag gate**·**无 flag**·重构非新功能·任何破坏即 BUG·smoke 全 regression 必通

**红线 reminder**·
- 重构 vs 重复·真 paradigm 推倒 (memory `feedback_refactor_not_reskin`)
- 大文件拆分·**alias + 内联 paradigm**·头部 alias 块绑回原名·body 0 改动 (memory `feedback_large_file_split_paradigm`)
- 重构禁顺手翻译中文·grep 前后比 (memory `feedback_chinese_string_translation_during_refactor`)
- 保守 1 刀 1 事·5 slice 独立 (memory `feedback_conservative_slicing`)
- P 社 UI 锁 user 截图·non-paradigm (memory `feedback_paradox_ui_unreliable`)
- **audit-first** — v1 → audit → v2 → implement

---

## 0·v1 → v2·audit 6 项 fix 全入 doc

| ID | sev | 内容 | v2 处理 |
|---|---|---|---|
| **B1** | HIGH | alias 块完整性·~30 distinct expose | §1.1.5·全 enumerate + 每拆出文件 smoke verify |
| **B3** | MID | class prefix mutex audit | §1.2.5·11 prefix table·确保无 cross-prefix collision |
| **C4** | HIGH | script load order | §1.1·**先 cedui → l6 → modals → core**·index.html script 顺序 + init smoke check |
| **D2** | HIGH | 热更包必含 4 文件 | §3.5·部署清单·zip filelist + index.html diff |
| **A1** | MID | sub-header rollback button 冗余 | §1.5·gated·`paradigm._reformInProgress` 存在才显 |
| **A2** | MID | header reorg user 学新交互 | §1.5·首开 toast 一次性提示 |

---

## 1·sprint scope·5 slice·**~3-5 d**

### 1.1·**L-C·s1·panel.js 拆 4 文件** (~1.5 d)

| 拆出文件 | 内容 | 行数 (approx) | load order |
|---|---|---|---|
| `tm-keju-paradigm-panel-cedui.js`·**新** | L4·cedui timeline / compare / invoke / outcome | ~400 | **先** (others 可能 ref) |
| `tm-keju-paradigm-panel-l6.js`·**新** | L6 subjects suggestions + L10 actions render | ~150 | **次** |
| `tm-keju-paradigm-panel-modals.js`·**新** | L8 chronicle modal + L10 preset modal + L12 tabs | ~600 | **再次** |
| `tm-keju-paradigm-panel.js`·**保 core** | L2 主体·init/render/diff/preview/submit/click dispatcher | ~1200 | **最后** (依赖前 3) |

#### 1.1.5·**B1·alias 完整性·~30 distinct expose enumerate**

现 panel.js 显式 expose (`global._kjp* = _kjp*` 行)·

```
_kjpOpenReformProposal·_kjpComputeDiff·_kjpClassifyDiffTags·_kjpBuildTopicText·
_kjpEstimateStanceDistribution·_kjpSubmitReform·_kjpDiffMagnitude·_kjpExtractL3Meta·
_kjpDeriveIntentFromPreset·_kjpApplyMagPresetIntent·_kjpApplyAudienceCost·
_kjpAccumReformLean·_kjpBumpLlmConcurrent·
_kjpRenderAudienceBody·_kjpRenderCeduiBody·_kjpRenderCeduiTimeline·_kjpInvokeCedui·
_kjpApplyCeduiOutcome·_kjpBumpForecastReputation·_kjpInitForecastReputation·
_kjpAuditForecastAccuracy·_kjpExtractArchetypeFromEntry·_kjpArchetypeTypicalForecast·
_kjpOnCeduiClose·_kjpMaybeTriggerMultiConsultMerge·
_kjpOpenL8ChronicleModal·_kjpRenderL8ChronicleBody·
_kjpOpenL10PresetModal·_kjpRenderL10PresetList·_kjpL10ApplyPreset·
_kjpRenderL10PresetAction·_kjpL10MarkUserEdited
```

**+ window state vars**·`_kjpCurrentCeduiDraft/Diff/Digest/Archetype` + `_kjpL12RerenderTab` (4 state + 1 helper)

**拆后 alias 分布**·

| 拆出文件 | 该文件需 expose 的 helper |
|---|---|
| `cedui.js` | `_kjpRenderCeduiBody·_kjpRenderCeduiTimeline·_kjpInvokeCedui·_kjpApplyCeduiOutcome·_kjpExtractArchetypeFromEntry·_kjpArchetypeTypicalForecast·_kjpOnCeduiClose·_kjpMaybeTriggerMultiConsultMerge` (8) |
| `l6.js` | `_kjpRenderL10PresetAction` (1·L6 inline) |
| `modals.js` | `_kjpOpenL8ChronicleModal·_kjpRenderL8ChronicleBody·_kjpOpenL10PresetModal·_kjpRenderL10PresetList·_kjpL10ApplyPreset·_kjpL10MarkUserEdited` (6) |
| `panel.js` core 留 | 其余 `_kjpOpenReformProposal·_kjpComputeDiff·...` (~16) + 4 state vars + L12 hook |

**smoke verify**·
- 每拆出文件·grep `window.<name> = ` count·跟 doc 表 match
- panel core init·assert `typeof window._kjpRenderCeduiBody === 'function'` (depends 全 load)·若 undefined → load order bug

#### 1.1.6·**C4·script load order**

index.html 改·

```html
<!-- 拆 panel.js·load order strict -->
<script src="tm-keju-paradigm-panel-cedui.js?v=20260525-lc"></script>
<script src="tm-keju-paradigm-panel-l6.js?v=20260525-lc"></script>
<script src="tm-keju-paradigm-panel-modals.js?v=20260525-lc"></script>
<script src="tm-keju-paradigm-panel.js?v=20260525-lc"></script>
```

**panel core init**·首行加 sanity check·

```js
(function() {
  ['_kjpRenderCeduiBody', '_kjpOpenL8ChronicleModal', '_kjpRenderL10PresetAction'].forEach(function(fn) {
    if (typeof window[fn] !== 'function') {
      console.error('[L-C·load order] missing dependency: ' + fn);
    }
  });
})();
```

**risk control**·`tm-keju-reform-rollback.js` `tm-keju-reformer-bio.js` 等独立·load 在 panel 后即可·**不需 cross**

### 1.2·**L-C·s2·click dispatcher 拆 per-feature** (~0.5 d)

#### 1.2.5·**B3·class prefix mutex table**

各拆出 sub-handler 用 class prefix 路由·必无 collision·

| handler | class prefix | sample |
|---|---|---|
| L2 core | `kjp-` (无下划 sub) | `kjp-close-btn·kjp-submit-btn·kjp-subject-del·kjp-add-subject-btn·kjp-mag-preset` |
| L4 cedui | `kjp-cedui-*`·`kjp-multi-*` | `kjp-cedui-card·kjp-multi-consult-btn` |
| L6 | `kjp-l6-*` | `kjp-l6-accept-btn·kjp-l6-reject-btn` |
| L8 chronicle | `kjp-l8-*` | `kjp-l8-chronicle-btn·kjp-l8-close-btn` |
| L10 preset | `kjp-l10-*` | `kjp-l10-open-btn·kjp-l10-apply-btn` |
| L11 rollback | `kjp-l11-*` | `kjp-l11-rollback-btn·kjp-l11-submit-btn` |
| L12 tabs | `kjp-l12-*` | `kjp-l12-tab·kjp-l12-bio-btn·kjp-l12-sum-toggle·kjp-l12-tl-bar` |

**collision check**·
- `kjp-` (无 sub) 跟所有 sub-prefix·**fall-through last**·OK
- L8/L10/L11/L12 各独 prefix·mutex ✓
- L4 用 `kjp-cedui-*`·非 `kjp-l4-*`·**legacy naming**·跟 doc spec 不一致但已 ship·**保留·不改**

**dispatcher 结构**·

```js
function _kjpHandleClick(modal, e) {
  var t = e.target;
  if (!t || !t.classList) return;
  if (_kjpClickHandlersCedui(modal, t, e)) return;    // L4·kjp-cedui-*
  if (_kjpClickHandlersL6(modal, t, e)) return;       // L6·kjp-l6-*
  if (_kjpClickHandlersL10(modal, t, e)) return;      // L10·kjp-l10-*
  // L8/L11/L12 click 在 chronicle modal·非 paradigm modal·不在此 dispatcher
  _kjpClickHandlersL2(modal, t, e);                    // L2·kjp-* fallback
}
```

### 1.3·**L-C·s3·modal state cleanup helpers** (~0.3-0.5 d)

新 helpers·

```js
function _kjpDraftClearL10(draft) {
  draft._l10PresetId = null;
  draft._l10PresetCanonicalName = null;
  draft._l10PresetHistoricalEvaluation = null;
  draft._l10PresetBy = null;
}
function _kjpModalClearL12(modal) {
  modal._kjpActiveTab = 'evolution';
  modal._kjpActiveBioName = null;
}
function _kjpModalClearL11(modal) {
  modal._kjpL11Target = null;
  modal._kjpL11Mode = null;
  modal._kjpL11Keep = null;
}
```

**调用·**
- modal close·cascade clear
- 集中·非散布各 click branch

### 1.4·**L-C·s4·CSS 收口** (~0.3-0.5 d)

CSS section reorder + comment·

```css
/* ════════ §1·L2·panel 主体 frame ════════ */
.kjp-modal, .kjp-modal-content, .kjp-modal-header, .kjp-modal-body, .kjp-modal-footer
.kjp-section, .kjp-section-title, ...

/* ════════ §2·L4·cedui ════════ */
.kjp-cedui-*, .kjp-multi-*, .kjp-cedui-timeline-*, ...

/* ════════ §3·L6·subjects ════════ */
.kjp-l6-*, ...

/* ════════ §4·L8·chronicle modal ════════ */
.kjp-l8-*, ...

/* ════════ §5·L10·preset modal ════════ */
.kjp-l10-*, ...

/* ════════ §6·L11·rollback + inheritance modal ════════ */
.kjp-l11-rollback-modal, .kjp-l11-rollback-*, .kjp-l11-inheritance-modal, .kjp-l11-inh-*, ...

/* ════════ §7·L12·tabs + timeline + bio ════════ */
.kjp-l12-tabs, .kjp-l12-tab*, .kjp-l12-tl-*, .kjp-l12-bio-*, .kjp-l12-sum-*, .kjp-l12-impact-*, ...
```

**modal frame share**·`.kjp-modal-content` `.kjp-modal-header` 等被 L7/L8/L10/L11/L12 modal 全复用·doc 显式标·避后续误改。

### 1.5·**L-C·s5·header reorg + sub-header polish** (~0.3-0.5 d)

#### 1.5.1·header reorg

```
现·⚖️ 改革科举范式 [📜 改革志] [✕]
新·⚖️ 改革科举范式                              [✕]
    [📜 改革志]  [📊 历史模板]  [⟲ 废止 X]      ← sub-header
```

- 主 header·title + close 清净
- sub-header·feature buttons 一行·避 squeeze

#### 1.5.2·**A1·rollback button gated**

`[⟲ 废止 X]` 按钮·

- gate·`paradigm._reformInProgress` 存在 && `paradigm._reformInProgress.histId` 真 (有 active reform)
- 无 active reform·**hide** (非 disabled·hide)
- label·显 target 改革名 (e.g. "⟲ 废止 熙宁变法")

click → 直开 L11 rollback modal·target 自取 `_reformInProgress.histId`·**非冗余·non-conflict timeline button**

#### 1.5.3·**A2·首开 toast 一次性提示**

`_kjpOpenReformProposal` 内·首次调时 toast·

```js
if (!localStorage.getItem('tm_lc_intro_seen')) {
  toast('💡 改革面板已重整·头部为快捷按钮·点 [📜 改革志] 见历史');
  localStorage.setItem('tm_lc_intro_seen', '1');
}
```

- 一次性·persist localStorage
- 跨 reload 不重弹

---

## 2·实施序·**~3-5 d**

| step | slice | est |
|---|---|---|
| a | L-C·s1·panel.js 拆 4 文件·alias enumerate + IIFE·**load order 严** | 1-1.5 d |
| b | L-C·s2·click dispatcher 拆 per-feature handler·class prefix mutex | 0.5 d |
| c | L-C·s3·modal state cleanup helpers | 0.3-0.5 d |
| d | L-C·s4·CSS section reorg + comment | 0.3-0.5 d |
| e | L-C·s5·header reorg + sub-header rollback button gated + 首开 toast | 0.3-0.5 d |
| f | smoke·全 L1-L12 regression + **每拆出文件 smoke verify expose** + 中文 token count 比对 | 0.5-0.7 d |
| **total** | | **3-5 d** |

---

## 3·red line check + deploy

| red line | 适应 |
|---|---|
| 重构非重复 | 真拆文件 + 真整理 dispatcher·非保旧加新 |
| alias + 内联 paradigm | IIFE·头部 alias block·callsite 0 change·~30 expose enumerate |
| 禁顺手翻译中文 | smoke 前后 `grep [一-鿿] -c` 一致·678 行 |
| 保守拆分 1 刀 1 事 | 5 slice 独立 |
| 无 flag·破即 BUG | 全 1083 case 必通 |
| audit-first | v1 → audit → v2·6 项 fix |
| zero 新 game state | 全 UI 重构·zero data change |
| zero LLM cost change | bio cache / inheritance LLM 不动 |
| user 拍 UX 改 | A1 button gated·A2 首开 toast·小改 user 不需独审 |
| **B1 alias 完整** | ~30 expose enumerate·smoke per-file count verify |
| **C4 script load order** | 严格 cedui → l6 → modals → core·init sanity check |

### 3.5·**D2·部署清单·热更包**

(memory `feedback_server_side_unzip_paradigm` + `reference_dev_workflow`)

L-C ship 时·`hot.zip` **必含全 4 文件**·

```
web/
├── tm-keju-paradigm-panel-cedui.js       ← 新
├── tm-keju-paradigm-panel-l6.js          ← 新
├── tm-keju-paradigm-panel-modals.js      ← 新
├── tm-keju-paradigm-panel.js             ← 改 (slim core)
├── tm-keju-paradigm-panel.css            ← 改 (section reorg)
└── index.html                             ← 改 (3 新 script tag·按 load order)
```

**ship 前 smoke**·
- packaged build·浏览器 dev tool console·verify 4 script load·no 404
- packaged build·open paradigm panel·verify 不崩
- packaged build·open chronicle modal·verify L8 tab + timeline tab + reformer tab 全 render
- **若漏拆出文件**·user 浏览器 console 显 `_kjpRenderCeduiBody is not defined`

---

## 4·待 user 拍板·候选问题

| Q | 内容 | default |
|---|---|---|
| Q1 | 拆 4 文件还是 3 | **4** |
| Q2 | dispatcher 拆全 5 feature | **是** |
| Q3 | header sub-header row vs hamburger | **sub-header row** |
| Q4 | 含 mobile responsive | **否** (留 mobile sprint) |
| Q5 | split unit test | **是** (10 case 验 callsite) |
| **Q6** | **v2 新** | sub-header rollback button gate by `_reformInProgress`·non-redundant timeline button | **是** |
| **Q7** | **v2 新** | A2 首开 toast·persist localStorage·一次性 | **是** |

---

## 5·风险评估·v2 加 4 项

| 风险 | 缓解 |
|---|---|
| 拆文件破 callsite | smoke regression·1083 case 必通 + alias enumerate verify |
| click dispatcher branch order 变 | 保现 order·sub-handler 独立 mutex prefix |
| z-index modal stack 破 | s4 CSS·z-index 加 layer (modal 9998·sub 9999·confirm 10000) |
| 顺手翻译中文 | grep `[一-鿿] -c` 678·前后比·一致 |
| **load order 错** | C4·init sanity check·console.error if undefined |
| **热更漏文件** | D2·部署清单·packaged build smoke |
| **alias expose 漏** | B1·~30 enumerate·每拆出文件 smoke verify count |
| **class prefix collision** | B3·11 prefix mutex table·preview 后审 |

---

## 6·post-L-C·next

- L-C 完工·panel.js ~1200 (core)·3 拆出 (~400 + ~150 + ~600)·清净
- next options·
  - **D·开 Phase G·特科 4 mini-keju** (Stage 2 §G·~13-22 d·大块 mechanic)
  - **E·开 Phase H·私学/书院** (Stage 2 §H·~10-14 d)
  - **F·开 Phase I·宦官干预** (Stage 2 §I·~6-9 d·明清专有)
  - **G·开 mobile responsive sprint**
  - **H·user 检视全 panel·提 UI 改进**

---

## 7·v2 ready 验

- ✅ 6 项 audit fix 全入 doc
- ✅ B1·~30 expose enumerate + per-file smoke verify
- ✅ B3·11 prefix mutex table
- ✅ C4·load order + init sanity check
- ✅ D2·部署清单·zip filelist + packaged smoke
- ✅ A1·sub-header button gated
- ✅ A2·首开 toast 一次性
- ✅ 7 决定全列·default 全推荐
- ✅ red line 11 项·全合规
- ✅ 风险评估 8 项

**v2 ship readiness·等 implement**
