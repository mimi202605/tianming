# Phase 5 P5-θ Editor Prep Audit

date·2026-05-04 · mode·**read-only prep audit·doc-only**·owner·Codex (Claude prep)

## 0·背景

P3 R6 后 editor cluster 完成·从 tm-editor-* rename → editor-*·并按域拆分·

| round | 改动 |
|---|---|
| Phase 3 R6 (Codex) | tm-editor-* 4 文件 rename → editor-*·A1 slice |
| Phase 3 R6 (Codex) | editor-game-systems split·1869 行 → 6 文件 (timeline/edicts/goals/offend/influence/game-systems) |
| Phase 5 P5-θ (本) | namespace fill 26 个 editor-*·sub-ns by domain |

## 1·Cluster 现状·26 文件·20766 行

按 domain 分组·

### 1.1 core (3 文件·5061 行)
| 文件 | 行 |
|---|---|
| `editor.js` | 2379 |
| `editor-core.js` | 453 |
| `editor-crud.js` | 2026 |
| `editor-details.js` | 321 |
| `editor-presets.js` | 213 |

### 1.2 AI (3 文件·4092 行)
| 文件 | 行 |
|---|---|
| `editor-ai-gen.js` | 1858 |
| `editor-ai-multipass.js` | 979 |
| `editor-ai-validate.js` | 1255 |

### 1.3 forms (5 文件·429 行·**全 < 200 行 each·小**)
| 文件 | 行 |
|---|---|
| `editor-form-edicts.js` | 73 |
| `editor-form-goals.js` | 88 |
| `editor-form-influence-groups.js` | 83 |
| `editor-form-offend-groups.js` | 93 |
| `editor-form-timeline.js` | 92 |

### 1.4 domain editors (10 文件·8966 行)
| 文件 | 行 |
|---|---|
| `editor-administration.js` | 1974 |
| `editor-game-systems.js` | 1975 |
| `editor-fullgen.js` | 2212 |
| `editor-fiscal.js` | 692 |
| `editor-government.js` | 785 |
| `editor-map.js` | 984 |
| `editor-military.js` | 339 |
| `editor-corruption.js` | 181 |
| `editor-office-deep.js` | 426 |
| `editor-division-deep.js` | 529 |

### 1.5 schema/constants (3 文件·756 行)
| 文件 | 行 |
|---|---|
| `editor-engine-constants.js` | 349 |
| `editor-schema-adapter.js` | 307 |
| `editor-model-requirements.js` | 100 |

## 2·HTML inline 主导·**整个 editor cluster 是大杂烩 inline-callable**

grep 结果·~80+ window.X exports·几乎全是 HTML inline button handlers·

例·

```js
// editor-engine-constants.js 18 个 office subtab fn
window.renderOfficeSubtabs = ...
window.addOfficeSubtab = ...
window.editOfficeSubtab = ...
window.deleteOfficeSubtab = ...
// editor-ai-multipass.js 8 个 aiGen/aiPolish
window.aiGenFiscalConfig = ...
window.aiPolishStructuredField = ...
// editor-details.js·editor-form-* 大量 editXxx/saveXxx/renderXxx
```

**按 Q4 决议·HTML inline 主导文件·sub-ns 主要是 marker·内容大部分留 window**·

## 3·Sub-ns 设计推荐

### 3.1 TM.Editor (按 domain 分 sub)

```js
// R207·P5-θ Editor fill
TM.Editor.core      = _buildWindowRefGroup('Editor.core', {
  // editor-core·主 modal helpers
  openEditorModal: 'openEditorModal',
  closeEditorModal: 'closeEditorModal'
});
TM.Editor.crud      = _buildWindowRefGroup('Editor.crud', {
  // editor-crud + editor-details·主入口
});
TM.Editor.ai        = _buildWindowRefGroup('Editor.ai', {
  // editor-ai-gen / multipass / validate 主入口
  aiGenChr: 'aiGenChr',
  aiGenFac: 'aiGenFac',
  aiGenFiscalConfig: 'aiGenFiscalConfig',
  aiGenPopulationConfig: 'aiGenPopulationConfig',
  aiPolishStructuredField: 'aiPolishStructuredField',
  // ... 8-12 个 aiGen/aiPolish public 入口
});
TM.Editor.forms     = _buildWindowRefGroup('Editor.forms', {
  // 5 form 文件·each <100 行·主入口少·~5-10 个
});
TM.Editor.domain    = _buildWindowRefGroup('Editor.domain', {
  // editor-administration / game-systems / fullgen / fiscal / government / 等
  // 10 个 domain editor 各 1-3 个主入口
});
TM.Editor.schema    = _buildWindowRefGroup('Editor.schema', {
  // editor-schema-adapter / engine-constants / model-requirements
});
TM.Editor.map       = window.editorMap;  // editor-map.js·若有 single export 否则 _buildWindowRefGroup
```

### 3.2 与 TM.Office.legacy 重叠

P5-ε 我已建·

```
TM.Office.legacy = { aiGenChr·aiGenFac·aiGenFullScenario·execFullGen }
```

这 4 个其实在 `tm-office-editor.js` (我列入 office)·**与 P5-θ 候选 重叠**·

**reconcile**·因为 `aiGenChr` 等是·

- 调用方·HTML inline `<button onclick="aiGenChr()">`
- domain·官制编辑器·属 Office 域·**P5-ε 入 .Office.legacy 准**·
- 物理位置·tm-office-editor.js (Office 域·非 Editor 域)·实际归属·Office

P5-θ **不重复 alias**·Editor.ai 只覆盖 editor-ai-* 文件 (editor-ai-gen / multipass / validate)·

## 4·命名冲突

| name | 出处 |
|---|---|
| `editXxx` (editChr, editItm, editChrAttr) | editor-details + editor-crud + editor-domain | sub-ns 隔离·推荐放 .crud 或 .domain |
| `aiGenXxx` (aiGenChr, aiGenFac, aiGenItems, aiGenRules) | editor-ai-gen·editor-details (重复 import?) | grep 看 last-load-wins·应只一处定义 |
| `renderXxx` | 各 form / detail | sub-ns 隔离 |

## 5·留 window (大多数·按 Q4)

editor cluster 几乎全 HTML inline·**sub-ns 只 alias 主 entrypoint·内部 helper 留 window**·

estimate·入 TM.Editor.* 的·~50-80 个 fn·剩 ~200+ 留 window·

## 6·候选首要 entrypoint (Codex 实施时挑)

```
TM.Editor.core
- openEditorModal·closeEditorModal·openGenericModal (alias)·closeGenericModal (alias)
TM.Editor.ai
- aiGenChr/Fac/Var/Tech/Civic/Items/Rules/Events  (8 个·已部分入 TM.Office.legacy·**reconcile**)
- aiGenFiscalConfig/Population/Environment/Authority (4 个 multipass)
- aiPolishStructuredField/CharFamilyMembers/RegionOverrides/CustomTaxes (4 个 polish)
- _polishSuggestions·_executePolishSuggestions·aiPolishCustomTaxes
TM.Editor.crud
- editChr·saveChrEdit·editItm·renderItmTab·renderRulTab·renderEvtTab
TM.Editor.schema
- 18 个 office classifier / rank / inquiry body fn
```

## 7·与 P5-ζ 协同

- `editor-map.js` 是 editor 内地图编辑·**入 TM.Editor.map**·与 TM.Map (game runtime) 完全独立 (P4-α-2 by design split 同理论)·
- map-editor-{pro/smart/region-editor}·独立 .html 工具·**P5-ζ 已决定不入 24 ns**·**P5-θ 也不入**·

## 8·估时·~2h

| 步骤 | est |
|---|---|
| grep editor-* window 全 export 表·实施 audit | 30 min |
| 实施 R207 段 (~70 行) | 30 min |
| smoke (~25 assertions) | 30 min |
| verify-all 验·target +1 (47/47·Phase 5 close 时) | 5 min |
| reconcile TM.Office.legacy ↔ TM.Editor.ai 是否重命名 (我的 P5-ε 已 alias·你看着办) | 10 min |
| 头注 + letter | 15 min |

## 9·关键判断

1. **Editor cluster 是 26 文件最多的 cluster·但单文件公共 API 最少 (HTML inline 主导)**
2. **sub-ns 主要是 marker + 主入口·内部留 window**
3. **`aiGenChr` 等 4 fn·我 P5-ε 已入 TM.Office.legacy** (因属 Office 域)·**P5-θ 不重复 alias·只 cover editor-ai-* 文件内的 aiGen** (12 个 multipass/polish)
4. **editor-map.js 入 TM.Editor.map·与 TM.Map (game runtime) 域分离**
5. **5 form 文件全 <100 行·小·sub-ns 极简或合并入 .forms**

## 10·Phase 5 close 时

P5-θ done 后·**verify-all 47/47·Phase 5 真 close**·

按习惯 close audit doc·我建议由 Claude 写 (我已写过 Phase 3 R11c·Phase 4 final audit)·与 P3/P4 模板一致·

— Claude (P5-θ prep·2026-05-04)
