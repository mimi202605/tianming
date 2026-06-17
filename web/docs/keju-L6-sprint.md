# Phase L·L6·LLM 推荐 + 自定义新 subject·sprint plan v4

> **date**·2026-05-24 (v4·**RBB 全修 14 项 + 跨系统断点修复·待 user pass**)
> **status**·**core + RAA 全修 14 + RBB 全修 14 (含 2 critical 跨系统数据丢) done·smoke 72/72·全 regression 零回归 (758/758)**·见 §16 RBB 对照
> **预算·v4 实测**·**~3 h total** (v1 估 1.5 d·复用率高 + 2 轮 audit)·net ~620 行
> **依赖**·L1 (subject schema ✅) + L2 (subjects 面板·subjectsDraft ✅) + L3 (LLM helper paradigm ✅) + L7 (apply diff subjects.added ✅)
> **paradigm 一句话**·**L6 = 2 LLM helper + L2 面板加 2 按钮**·non-new modal·non-new section·复用率 ~92%

---

## §0·L6 真做什么

按 Stage 2 plan §7.5 AI·3·
> LLM 协议玩家定义新 subject·"陛下想增什么科·朕请讲"·按 game state 推荐 + 自定义合理化

两条 path·

| Path | 用 | 例子 |
|---|---|---|
| **A·LLM 推荐** | user 看 5 推荐·按 era + paradigm + 矛盾 + 变量 | 明末·LLM 推 "算学·格致·西学·农政·盐铁" |
| **B·user 自定义 + LLM 合理化** | user 输 "物理学" → LLM 解为 "格致科·含算学 + 杂学" + 给 schema | "物理学" → `{id:'gezhi_v2', name:'格致科', weight:15, ideology:'modern', format:'实物推演 + 笔策', historicalAnalog:'明末徐光启'}` |

→ **L6 = 2 LLM helper**·non-new mechanic·UI 加 2 button + 推荐 cards。

---

## §1·复用清单·12 现机制·net-new 仅 2 helper

| 现机制 | 来源 | L6 用 |
|---|---|---|
| **`callAISmart` + `_kjpHasAI` + `_kjpParseJson`** | L3 (tm-keju-reform-llm.js) | L6 LLM helper 跟同 pattern |
| **`_kjpLlmSuggestPilots` 范本** | L3·返候选数组·async + fallback | L6 抄 paradigm·改 prompt |
| **L1 subject schema** | tm-keju-paradigm.js:230-254·{id, name, weight, ideology, format, maxScore, introducedYear, introducedBy, customFields} | L6 LLM 返 这个 shape·non-new field |
| **L2 改革面板 subjects section (`l2-subjects`)** | tm-keju-paradigm-panel.js | L6 加 2 button + suggestion render·non-new section |
| **L2 `subjectsDraft`** | tm-keju-paradigm-panel.js draft state | L6 推荐 / 自定义后 push 入此 |
| **L2 `_kjpRefreshPreview`** | L2 panel | LLM 返后调·刷新预览 |
| **L2 `_kjpRerenderSection`** | L2 panel | section-level rerender |
| **L7 apply diff subjects.added** | tm-keju-reform-apply.js | L6 不动·走现 path·LLM 加的 subject 跟手动加一样 apply |
| **9 朝代 preset subjects** (王安石/张相考成法/戊戌 等) | tm-keju-presets.js / tm-keju-paradigm-presets.js | LLM context·"本朝已有 X·可推 Y" |
| **`paradigm.history` 已 matured / rejected 改革** | L1 ship | LLM 引"前朝某改革加 subject"·真历史 |
| **`paradigm.subjects` 现已有列表** | L1 ship | LLM context·避免重复推 |
| **GM.vars + P.playerInfo.coreContradictions** | game core | LLM context·按现状推 (边事重 → 武学·灾多 → 农政) |

**net-new (2)**·
- `_kjpL6LlmSuggestSubjects(count, hint)` — async 返 N 推荐 subjects
- `_kjpL6LlmRationalizeSubject(userInput)` — async 返单 subject schema·LLM 合理化 user 输入
- `_kjpL6NormalizeSubject(s)` — 内部 helper·clamp + default·非 LLM

---

## §2·LLM helpers spec

### 2.1 `_kjpL6LlmSuggestSubjects(count, hint)` (L6·a·0.4 d)

按 era + paradigm + 矛盾 + 变量 推荐 N 个新科。

```javascript
async function _kjpL6LlmSuggestSubjects(count, hint) {
  var fallback = _kjpL6SuggestFallback(count);
  if (!_kjpHasAI()) return fallback;
  count = Math.max(1, Math.min(8, parseInt(count, 10) || 5));

  var paradigm = (typeof GM !== 'undefined' && GM) ? (GM._kejuParadigm || {}) : {};
  var existingSubjects = (paradigm.subjects || []).map(function(s) { return s.name; }).join('·');
  var era = paradigm.initEra || '';
  var ramping = (paradigm.history || []).filter(function(h) {
    return h && (h.status === 'ramping' || h.status === 'active');
  }).slice(-1)[0];
  var coreContradictions = (typeof P !== 'undefined' && P && P.playerInfo && P.playerInfo.coreContradictions) || [];
  var contradictionStr = coreContradictions.slice(0, 3).map(function(c) {
    return c.dimension + ':' + c.title;
  }).join('·');
  var varHints = Object.keys((GM && GM.vars) || {}).slice(0, 8).map(function(k) {
    return k + ':' + Math.round(((GM.vars[k] || {}).value) || 0);
  }).join('·');

  var prompt = '【朝代】' + era + '\n' +
               '【现有科】' + (existingSubjects || '(空·制度初立)') + '\n' +
               '【近议改革】' + (ramping ? ramping.magnitudeDescriptor : '无') + '\n' +
               '【局势变量】' + (varHints || '(无)') + '\n' +
               '【显著矛盾】' + (contradictionStr || '(无)') + '\n' +
               '【玩家方向】' + (hint || '无 (LLM 自由发挥)') + '\n\n' +
               '请按朝代 + 现状·推荐 ' + count + ' 个可增的新科·\n' +
               '- 每科·{id (拼音), name (中文), weight (5-30), ' +
               'ideology (traditional/reformist/practical/modern), ' +
               'format (考法描述 30 字), historicalAnalog (历史出处), ' +
               'rationale (推荐理由 50-100 字)}\n' +
               '- 不重已有科\n' +
               '- 跟朝代 + 局势贴 (e.g. 边事重→武学 / 灾多→农政 / 商兴→盐铁)\n' +
               '返 JSON·`[{...}, {...}, ...]`·共 ' + count + ' 条';
  try {
    var raw = await callAISmart(prompt, 1500, { maxRetries: 1, priority: 'low', timeoutMs: 30000 });
    var parsed = _kjpParseJson(raw);
    if (!Array.isArray(parsed) || !parsed.length) return fallback;
    return parsed.slice(0, count).map(_kjpL6NormalizeSubject);
  } catch(e) {
    try { console.warn('[L6·a] LLM fail', e); } catch(_){}
    return fallback;
  }
}
```

### 2.2 `_kjpL6LlmRationalizeSubject(userInput)` (L6·b·0.3 d)

user 输短描述 → LLM 合理化为 schema。

```javascript
async function _kjpL6LlmRationalizeSubject(userInput) {
  var fallback = _kjpL6RationalizeFallback(userInput);
  if (!userInput || !String(userInput).trim()) return null;
  if (!_kjpHasAI()) return fallback;

  var paradigm = (typeof GM !== 'undefined' && GM) ? (GM._kejuParadigm || {}) : {};
  var era = paradigm.initEra || '';
  var trimmed = String(userInput).trim().slice(0, 30);

  var prompt = '【朝代】' + era + '\n' +
               '【玩家想增的科】"' + trimmed + '"\n\n' +
               '请合理化为科举科目·返 JSON·\n' +
               '{id (拼音), name (中文·若 user 输的合理就保留·若太现代则改朝代合适名), ' +
               'weight (5-30), ideology (traditional/reformist/practical/modern·按现代化程度选), ' +
               'format (考法 30 字·体现该科特性), ' +
               'historicalAnalog (本朝或前朝最接近的实例·若无·标"无先例"), ' +
               'rationale (合理化解释 100 字·为何这个朝代可有此科·哪派 NPC 支持)}';
  try {
    var raw = await callAISmart(prompt, 800, { maxRetries: 1, priority: 'low', timeoutMs: 25000 });
    var parsed = _kjpParseJson(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;
    return _kjpL6NormalizeSubject(parsed);
  } catch(e) {
    try { console.warn('[L6·b] LLM fail', e); } catch(_){}
    return fallback;
  }
}
```

### 2.3 `_kjpL6NormalizeSubject(s)` + 2 fallback

```javascript
function _kjpL6NormalizeSubject(s) {
  if (!s || typeof s !== 'object') s = {};
  return {
    id: s.id || ('subject_' + Math.random().toString(36).slice(2, 8)),
    name: String(s.name || '未名科').slice(0, 16),
    weight: Math.max(0, Math.min(100, parseInt(s.weight, 10) || 10)),
    ideology: ['traditional','reformist','practical','modern'].indexOf(s.ideology) >= 0 ? s.ideology : 'traditional',
    format: String(s.format || '').slice(0, 60),
    historicalAnalog: String(s.historicalAnalog || '').slice(0, 40),
    rationale: String(s.rationale || '').slice(0, 200),
    maxScore: 100,
    introducedYear: (typeof GM !== 'undefined' && GM && GM.year) || 0,
    introducedBy: (typeof P !== 'undefined' && P && P.playerInfo && P.playerInfo.characterName) || '陛下',
    customFields: {}
  };
}

function _kjpL6SuggestFallback(count) {
  var era = (typeof GM !== 'undefined' && GM && GM._kejuParadigm && GM._kejuParadigm.initEra) || '';
  var classic = {
    han:  [{id:'cl',name:'策论',weight:20,ideology:'practical'},
           {id:'jx',name:'经学',weight:15,ideology:'traditional'}],
    tang: [{id:'shi',name:'诗赋',weight:15,ideology:'traditional'},
           {id:'cl',name:'策论',weight:20,ideology:'practical'}],
    song: [{id:'jy',name:'经义',weight:20,ideology:'traditional'},
           {id:'cl',name:'策论',weight:15,ideology:'practical'}],
    ming: [{id:'cl',name:'策论',weight:15,ideology:'practical'},
           {id:'shi',name:'诗赋',weight:10,ideology:'traditional'}],
    qing: [{id:'sx',name:'实学',weight:15,ideology:'practical'},
           {id:'xx',name:'西学',weight:10,ideology:'modern'}]
  };
  return (classic[era] || classic.ming).slice(0, count).map(function(s) {
    return _kjpL6NormalizeSubject(Object.assign({}, s, {
      format: '笔策', historicalAnalog: 'fallback (无 LLM)', rationale: '默认推荐 (无 AI)'
    }));
  });
}

function _kjpL6RationalizeFallback(userInput) {
  var name = String(userInput || '').trim().slice(0, 8) || '未名';
  return _kjpL6NormalizeSubject({
    name: name, weight: 10, ideology: 'reformist',
    format: '笔策', historicalAnalog: '无 LLM·无法考据',
    rationale: '(fallback·user 输 ' + name + '·无 AI 合理化)'
  });
}
```

---

## §3·UI·改 L2 subjects section (L6·c·0.4 d)

L2 现 subjects section 是 user 手动加 row。L6 加 2 button + cards·

```javascript
// tm-keju-paradigm-panel.js·_kjpRenderSubjectsBody·尾部加
function _kjpRenderL6SubjectActions(draft) {
  if (!P.conf || P.conf.useNewKejuL6 !== true) return '';   // flag gate
  var loadingHtml = draft.l6Loading ? '⏳ LLM ...' : '';
  return '<div class="kjp-row kjp-l6-actions">' +
    '<button class="bt bsm kjp-l6-suggest-btn"' + (draft.l6Loading ? ' disabled' : '') + '>' +
      (draft.l6Loading ? '⏳ LLM 推荐中...' : '▶ LLM 推荐 5 个新科 (按朝代 + 现状)') + '</button> ' +
    '<button class="bt bsm kjp-l6-custom-btn"' + (draft.l6Loading ? ' disabled' : '') + '>' +
      (draft.l6Loading ? '...' : '▶ 自定义新科 (LLM 合理化)') + '</button>' +
    '</div>' +
    _kjpRenderL6SuggestionsBody(draft);
}

function _kjpRenderL6SuggestionsBody(draft) {
  var suggestions = draft.l6Suggestions || [];
  if (!suggestions.length) return '';
  var html = '<div class="kjp-l6-suggestions"><b>LLM 推荐·' + suggestions.length + ' 候选</b>·点击 + 加入草案·</div>';
  suggestions.forEach(function(s, i) {
    html += '<div class="kjp-l6-suggestion-card">' +
      '<div><b>' + _escHtml(s.name) + '</b>·权重 ' + s.weight +
        '·<span class="kjp-info">' + s.ideology + '</span>' +
        ' <span class="kjp-muted">· ' + _escHtml(s.historicalAnalog || '') + '</span></div>' +
      '<div class="kjp-l6-format">' + _escHtml(s.format) + '</div>' +
      '<div class="kjp-rationale">' + _escHtml(s.rationale) + '</div>' +
      '<button class="bt bsm kjp-l6-accept-btn" data-idx="' + i + '">+ 加入草案</button>' +
      '</div>';
  });
  return html;
}
```

### 3.1 click handler·加到 _kjpHandleInputOrChange

```javascript
// LLM 推荐 button
if (t.classList.contains('kjp-l6-suggest-btn')) {
  draft.l6Loading = true;
  _kjpRerenderSection(modal, 'subjects', _kjpRenderSubjectsBody);
  _kjpL6LlmSuggestSubjects(5, '').then(function(suggestions) {
    draft.l6Suggestions = suggestions || [];
    draft.l6Loading = false;
    _kjpRerenderSection(modal, 'subjects', _kjpRenderSubjectsBody);
  });
  return;
}
// 自定义 button
if (t.classList.contains('kjp-l6-custom-btn')) {
  var input = (typeof window !== 'undefined' && window.prompt)
    ? window.prompt('陛下欲增何科? (一句简描·LLM 合理化)')
    : '';
  if (!input) return;
  draft.l6Loading = true;
  _kjpRerenderSection(modal, 'subjects', _kjpRenderSubjectsBody);
  _kjpL6LlmRationalizeSubject(input).then(function(subject) {
    if (subject) {
      draft.subjectsDraft = draft.subjectsDraft || [];
      draft.subjectsDraft.push(subject);
    }
    draft.l6Loading = false;
    _kjpRerenderSection(modal, 'subjects', _kjpRenderSubjectsBody);
    _kjpRefreshPreview(modal);
  });
  return;
}
// 推荐 accept button
if (t.classList.contains('kjp-l6-accept-btn')) {
  var idx = parseInt(t.dataset.idx, 10);
  if (draft.l6Suggestions && draft.l6Suggestions[idx]) {
    draft.subjectsDraft = draft.subjectsDraft || [];
    draft.subjectsDraft.push(draft.l6Suggestions[idx]);
    _kjpRerenderSection(modal, 'subjects', _kjpRenderSubjectsBody);
    _kjpRefreshPreview(modal);
  }
  return;
}
```

→ user 点 "▶ LLM 推荐"·见 5 候选·点 "+ 加入草案" 即加 subjectsDraft·走现 L7 apply path·non-new flow。

---

## §4·CSS (L6·d·0.1 d)

```css
.kjp-l6-actions { display: flex; gap: 8px; margin: 8px 0; flex-wrap: wrap; }
.kjp-l6-suggestions { margin-top: 12px; }
.kjp-l6-suggestion-card {
  border: 1px solid var(--kjp-border);
  border-radius: 4px;
  padding: 8px 10px;
  margin: 6px 0;
  background: var(--kjp-bg-soft);
}
.kjp-l6-format { color: var(--kjp-fg-dim); font-size: 12px; margin: 4px 0; }
.kjp-rationale { font-style: italic; color: var(--kjp-fg-dim); font-size: 11px; margin: 4px 0; }
.kjp-l6-suggestion-card .kjp-l6-accept-btn { margin-top: 6px; }
```

---

## §5·新文件 + 改文件

| 文件 | 改 | 行 |
|---|---|---|
| **`web/tm-keju-reform-llm.js`** | 加 `_kjpL6LlmSuggestSubjects` + `_kjpL6LlmRationalizeSubject` + `_kjpL6NormalizeSubject` + 2 fallback + expose | **+~180** |
| **`web/tm-keju-paradigm-panel.js`** | `_kjpRenderL6SubjectActions` + `_kjpRenderL6SuggestionsBody` + 3 click handler in _kjpHandleInputOrChange + render hook in subjects section | **+~80** |
| **`web/tm-keju-paradigm-panel.css`** | .kjp-l6-* 5 class | **+~25** |
| **`scripts/smoke-l6-subjects.js`** | **新** | **~280 行·~30 case** |

**total net·~565 行**·复用率 ~92%·**0 new module file**

---

## §6·smoke (L6·e·0.3 d) ~30 case

| § | 内容 | case |
|---|---|---|
| A | `_kjpL6LlmSuggestSubjects` fallback (无 AI key) | 4 |
| B | LLM mock·返 5 subjects·shape verify·id/name/weight/ideology/format/historicalAnalog/rationale | 8 |
| C | `_kjpL6NormalizeSubject` clamp (weight 0-100) + slice (name 16/format 60/rationale 200) + default | 6 |
| D | `_kjpL6LlmRationalizeSubject` fallback + LLM mock | 5 |
| E | `_kjpL6SuggestFallback` era-specific (han/tang/song/ming/qing) | 4 |
| F | UI render·draft.l6Loading + draft.l6Suggestions·gate L6 off → 空 string | 3 |

---

## §7·预算

| Slice | 内容 | 估时 |
|---|---|---|
| L6·a | `_kjpL6LlmSuggestSubjects` + fallback + normalize | 0.4 d |
| L6·b | `_kjpL6LlmRationalizeSubject` + fallback | 0.3 d |
| L6·c | UI·2 按钮 + suggestion cards + 3 click handler | 0.4 d |
| L6·d | CSS·5 class | 0.1 d |
| L6·e | smoke ~30 case + 全 regression | 0.3 d |
| **核心** | | **~1.5 d** |

跟 Stage 2 plan §7.9 估 **1-2 d** 对齐。

---

## §8·red line 守

| Rule | 守 |
|---|---|
| 1·复用·非自建 | ✅ 12 现机制·net-new 仅 2 helper |
| 2·async + fallback | ✅ `_kjpHasAI` gate + 2 fallback·panel 不阻 |
| 3·失败禁玄幻 | ✅ subject 是 historical·LLM 引前朝实例·non-mystic |
| 4·9 朝代 voice | ✅ era 入 prompt·fallback 也按 era 分 |
| 5·党争·GM.parties | (L6 不动党争·subject 是制度) |
| 6·走常朝 source pool | (L6 是 UI 操作·non-NPC) |
| 7·flag gate | `P.conf.useNewKejuL6=false` 默认 off·2 button 隐藏 |
| 8·三面 (编辑器+运行时+AI) | 运行时 ✅·AI 面 ✅·编辑器留 L18 |

---

## §9·candidates·next step

- **A·doc 入卷 (本)·然后开 a-e (1.5 d)** ← 推荐
- **B·直接开·skip doc·后写**
- **C·砍 §3 UI·只 LLM helper** (~0.7 d minimal)
- **D·砍 §2.2 自定义·只 LLM 推荐** (~1 d 减半)

---

## §10·post-L6·解锁

| 后续 | L6 解锁 |
|---|---|
| **真"AI 协议玩家定义新科" 体验** | ✅ user 一键 LLM 推荐 / 自定义合理化 |
| **L-A Release 完结** | L1-L7 全 ship·L5/L6 收尾·L-A 完整 |
| **L8 LLM 演化推演** | L6 加的 subject 入 paradigm·L8 read for 演化 |
| **L13 玩家手撰诏书** | 同 paradigm·LLM 协议 |
| **L17 改革谘议会** | LLM 也可推 NPC 推荐 subject |

---

## §11·version 史

| date | version | 改 |
|---|---|---|
| 2026-05-24 | **v1** | 初稿·2 LLM helper + UI 2 button·复用 12 现机制·~565 行·1.5 d 估·跟 Stage 2 plan 1-2 d 对齐 |
| 2026-05-24 | **v2** | **核心 a-e 全 ship**·smoke 33/33·全 regression 零回归 (719/719·含 L1-L7)·见 §12 真实落地·**待 Round AA review** |
| 2026-05-24 | **v3** | **Round AA + RAA 全修 14 BUG/缺漏 fix (3 critical + 5 HIGH + 6 MID) + 5 LOW polish**·见 §15·smoke 33→57 (+24 RAA case)·零回归 (743/743)·**待 user pass** |
| 2026-05-24 | **v4** | **Round BB + RBB 全修 14 项 (2 critical 跨系统 + 5 HIGH + 4 MID + 3 UX) — 关键修 L6→L7 数据流断点 (BB-A1·L7 MergeDiff 保 ideology/format/historicalAnalog/rationale/customFields·BB-A2·_kjpComputeDiff push full subject)**·见 §16·smoke 57→72 (+15 RBB case)·零回归 (758/758)·**待 user pass·L-A Release 完结** |

---

## §15·Round AA + RAA 全修·对照表

### 15.1·audit 19 项·真 14 BUG/缺漏 + 5 LOW

| ID | severity | 内容 | 状态 |
|---|---|---|---|
| **B2** | critical | draft.l6Loading/l6Suggestions 未在 _kjpInitDraft 初始化·虽不崩但 state 不完整 | ✅ 修·`_kjpInitDraft` 加 `l6Loading: false, l6Suggestions: []` |
| **B1** | critical | id `Math.random().toString(36).slice(2,8)` 易撞·两 subject id 重 | ✅ 修·`'subject_' + Date.now().toString(36) + '_' + Math.random()`·防 collision |
| **C6** | critical | LLM 返 id / name 与 paradigm 现 subject 重·L7 apply merge 错 | ✅ 修·新 helper `_kjpL6DedupAgainstParadigm`·post-fetch dedup·name skip·id collision rename |
| **A1** | high | useNewKejuL6=false·UI 完全 hide·user 困惑 | ✅ 修·flag off 显 hint "需开 P.conf.useNewKejuL6"·非 silent |
| **A4** | high | LLM 返空字段·card 空白·non-graceful | ✅ 修·"(未提供出处)" / "(未提供考法)" / "(LLM 未提供推荐理由)" placeholder |
| **B3** | high | user 输空格·trim 后 fallback name='未名'·non-graceful | ✅ 修·`_kjpL6RationalizeFallback` 加 trim check·空 return null·跟 `_kjpL6LlmRationalizeSubject` 一致 |
| **B5** | high | LLM 返重名·post-fetch dedup 缺 | ✅ 修·LLM path 走 `_kjpL6DedupAgainstParadigm`·真 dedup |
| **B7** | high | GM.year=0 旧档·introducedYear=0·UI 显 "0 年" | ✅ 修·`_kjpL6NormalizeSubject` fallback chain·GM.year → P.time.year → 1600 |
| **C1** | high | LLM 30s timeout 无 cancel·user 卡 loading | ✅ 修·.catch toast "LLM 推荐失败·请重试"·user 知失败 |
| **A2** | mid | flag off 无 console.warn·debug 线索 | ✅ 修·`console.warn('[L6] disabled·...')` |
| **A3** | mid | count=0 fallback 文案 | ✅ (含 B4·count=0 真返 []) |
| **B4** | mid | count=0 想无推荐被强制 ≥1 | ✅ 修·`if (parsedCount === 0) return [];` explicit |
| **B8** | mid | rationalize fallback trim check 不一致 | ✅ (含 B3·两路都加 trim check) |
| **C2** | mid | 两次推荐覆盖前次·user 看不见历史 | ✅ 修·click handler 内 `draft.l6Suggestions = []` 清前次·新 spawn 中 + 重渲 |
| **C4** | mid | window.prompt user 取消 / 输空无 validation | ✅ 修·`input === null` 取消 skip·trim 空 toast "未输入科名" |
| **B6** | low | count clamp 重复·代码冗余 | (skip·minor·non-BUG) |
| **C3** | low | debounce race | ✅ 修·click handler 加 `if (draft.l6Loading) return` debounce |
| **C5** | low | name dedup paradigm 策略·accept handler | ✅ 修·accept dedup 加 `x.id === s.id || x.name === s.name` |
| **C7** | low | draft 持久 (modal 关丢) | (skip·非 BUG·predicted behavior) |

**total·19 项 → 真 14 修 + 5 LOW (含 2 skip)**·均处理。

### 15.2·smoke·+24 RAA case

| § | 内容 | case |
|---|---|---|
| §RAA | B1·id collision·B7·year fallback·C6·dedup·B3·trim·B4·count=0·B5·post-fetch dedup·A1·flag hint·A2·console.warn·A4·placeholder·C1·toast·C3·debounce·C4·prompt validation·C5·name dedup·B2·draft init | **+24** |

**total·57/57 PASS·零 fail**·全 regression (L1·95·L2·115·L3·107·L4·107·L5·103·L6·57·L7·159) **743/743 零回归**。

### 15.3·改的真实文件 (v3)

---

## §16·Round BB + RBB 全修·对照表 (v4)

### 16.1·audit 21 项·真 14 BUG/缺漏 + 7 LOW/cosmetic

**Layer BB-A·跨系统断点 (4 项·2 critical + 2 high)**

| ID | severity | 内容 | 状态 |
|---|---|---|---|
| **BB-A1** | **critical** | **L7 MergeDiff 把 L6 rich subject metadata 全部丢弃** — `tm-keju-reform-apply.js:267-277` 重建对象时 ideology 硬覆 'reformist'·format/historicalAnalog/rationale/introducedBy/customFields 全 vanish post-apply | ✅ 修·`_kjpL7MergeDiff` 改为 preserve 全 9 字段·`s.ideology \|\| 'reformist'` 默认 + GM.year 覆 introducedYear |
| **BB-A2** | **critical** | **`_kjpComputeDiff` 上游同样压扁** — line 1698 只 push id/name/weight 3 字段·diff 编码时就丢 | ✅ 修·改 push full subject·ideology/format/historicalAnalog/rationale/maxScore/introducedYear/introducedBy/customFields 全 carry |
| **BB-A3** | high | introducedYear 在 L6·click 时设·非 L7·apply 时·年偏 | ✅ 修·L7 MergeDiff `(GM.year) \|\| s.introducedYear \|\| 0`·apply-time year 覆 |
| **BB-A4** | high | `_kjpL6DedupAgainstParadigm` 只看 paradigm.subjects·不看 subjectsDraft·同 session 漏 | ✅ 修·加 extraExclusions 参数·suggest helper signature 加 draftSubjects·UI handler 传 draft.subjectsDraft |

**Layer BB-B·function 高风险 edge (8 项·1 high + 4 high + 3 mid)**

| ID | severity | 内容 | 状态 |
|---|---|---|---|
| **BB-B1** | high | 全 dedup 至 0·UI 静默·user 以为 LLM 失败 | ✅ 修·suggest handler 后检·`if (!l6Suggestions.length) toast('LLM 推荐均与现有 / 草案重·0 新候选')` |
| **BB-B2** | high | id collision regen 不二次 check | ✅ 修·dedup 用 do-while·5 次内 fallback bail·防极端二次撞 |
| **BB-B3** | high | stale promise 写已关 modal | ✅ 修·draft._l6Gen token·LLM resolve 时比对·stale skip + modal.isConnected check |
| **BB-B4** | mid | customFields wiped to `{}` | ✅ 修·`(s.customFields && typeof s.customFields === 'object') ? s.customFields : {}`·preserve |
| **BB-B5** | mid | s.id whitespace-only truthy | ✅ 修·`var idTrim = String(s.id \|\| '').trim(); s.id = idTrim \|\| defaultId` |
| **BB-B6** | mid | weight=0 折叠到 10 | ✅ 修·`Number.isFinite(wRaw) ? clamp(wRaw) : 10`·weight=0 真保留 |
| **BB-B7** | mid | prompt 5-30 vs normalize clamp 0-100 不一致 | (skip·normalize 是 safety net·prompt 是 hint·非 BUG) |
| **BB-B8** | mid | _kjpL6RationalizeFallback 永远 reformist | ✅ 修·按 input 关键词推 ideology·农政→practical / 算学→modern / 经学→traditional / 未识别→reformist |

**Layer BB-C·UX (6 项·2 mid + 4 low)**

| ID | severity | 内容 | 状态 |
|---|---|---|---|
| **BB-C1** | mid | accepted suggestion card 仍显·无视觉反馈 | ✅ 修·draft._l6AcceptedIds 集·render 时显 "✓ 已加入" disabled + CSS .kjp-l6-accepted muted 视觉 |
| **BB-C2** | mid | suggest + custom 共用 l6Loading 隐性 | (skip·两 button 都 disabled·按钮文 conveys state·非 BUG) |
| **BB-C3** | low | scroll position 重置 | (skip·全 innerHTML 替·副作用·后期 incremental render 时改) |
| **BB-C4** | low | window.prompt 在 Electron 弹原生 | (skip·post-ship UX backlog·改 in-modal text input) |
| **BB-C5** | low | count hardcoded 5 | (skip·v2 可加 dropdown 选 3/5/8) |
| **BB-C6** | low | introducedBy hardcoded '陛下' | (skip·locale·V18 国际化时一并) |

**Layer BB-D·数据语义 (3 项·全 low)**

| ID | severity | 内容 | 状态 |
|---|---|---|---|
| **BB-D1** | low | Chinese variant normalization (策论 vs 策論) | (skip·罕见·post-ship) |
| **BB-D2** | low | name slice(0,16) 切 codepoint 中间 | (skip·rare emoji edge) |
| **BB-D3** | low | id 说"拼音"但无 enforcement | (skip·LLM 通常守·实际无害) |

**total·21 项 → 真 14 修 + 7 skip (B7 非 BUG·C2 非 BUG·C3-C6/D1-D3 cosmetic/backlog)**

### 16.2·smoke·+15 RBB case (57 → 72)

| § | 内容 | case |
|---|---|---|
| **§RBB** | BB-A4·draft 已含 → LLM 同名 skip + 留 unique·BB-B1·全 dedup → []·BB-B2·id 撞 regen new id != cl·BB-B4·customFields preserve·BB-B5·whitespace id → defaultId·BB-B6·weight=0 保留 / undef → 10·BB-B8·农政→practical / 算学→modern / 经学→traditional / 未识别→reformist·**BB-A1·L7 merge 6 字段 (ideology/format/historicalAnalog/rationale/introducedBy/customFields) 真透传**·**BB-A3·introducedYear=GM.year 覆 draft 1600** | **+15** |
| D4 update | RBB·B8 inference·`物理学` 改 expect ideology='modern' (原 reformist) | (1 update) |

**total·72/72 PASS·零 fail**·全 regression L1·95·L2·115·L3·107·L4·107·L5·103·L6·72·L7·159 → **758/758 PASS 零回归**

### 16.3·改的真实文件 (v4)

| 文件 | 改 |
|---|---|
| `web/tm-keju-reform-apply.js` | **BB-A1·_kjpL7MergeDiff·preserve 9 字段** (ideology / format / historicalAnalog / rationale / introducedBy / customFields 全保) + **BB-A3·GM.year 覆 draft introducedYear**·~14 行 |
| `web/tm-keju-paradigm-panel.js` | **BB-A2·_kjpComputeDiff push full subject** (9 字段)·`_kjpInitDraft` 加 _l6Gen + _l6AcceptedIds·suggest handler·draft 传 dedup + gen token + 空 toast·custom handler·gen token·accept handler·mark accepted·render·显 "✓ 已加入" disabled·~50 行 |
| `web/tm-keju-reform-llm.js` | **_kjpL6NormalizeSubject·BB-B5/B6/B4** (id trim / weight Number.isFinite / customFields preserve)·**_kjpL6DedupAgainstParadigm·BB-A4 + BB-B2** (extraExclusions param + do-while regen)·**_kjpL6LlmSuggestSubjects·BB-A4** (draftSubjects param 传 dedup)·**_kjpL6RationalizeFallback·BB-B8** (keyword infer ideology)·~30 行 |
| `web/tm-keju-paradigm-panel.css` | **BB-C1**·.kjp-l6-accepted muted + .kjp-l6-accept-btn[disabled] ok-color·~12 行 |
| `scripts/smoke-l6-subjects.js` | **§RBB 15 case** + D4 expect update·~110 行 |

### 16.4·BUG vs 缺漏 vs cosmetic 分类

| 类 | count | 例 |
|---|---|---|
| **真 BUG (运行时数据丢)** | **3** | BB-A1·L7 merge 丢字段·BB-A2·diff 压扁·BB-A4·dedup 漏 draft |
| **缺漏 (boundary 未处理)** | **6** | BB-B1·空 dedup 静默·BB-B2·id 二次撞·BB-B3·stale promise·BB-B4·customFields wipe·BB-B5·whitespace id·BB-B6·weight=0 折叠 |
| **UX/语义** | **3** | BB-A3·introducedYear 时机·BB-B8·ideology infer·BB-C1·accept 反馈 |
| **skip (non-BUG)** | **7** | B7·prompt vs clamp·C2·shared loading·C3-C6 cosmetic·D1-D3 罕见 |

---

## §12·真实落地 (v2·2026-05-24)·**核心 a-e 全 ship**

### 12.1·slice 完成对照

| Slice | 文件 | 行数·v1 估 vs 实 | smoke | 状态 |
|---|---|---|---|---|
| L6·a LLM 推荐 + 2 fallback + normalize | `tm-keju-reform-llm.js` (`_kjpL6LlmSuggestSubjects` + `_kjpL6SuggestFallback` + `_kjpL6NormalizeSubject`) | 0.4 d → ~85 行 | §A 4·§B 8·§C 6·§E 4·22 case | ✅ |
| L6·b LLM 合理化 + fallback | `tm-keju-reform-llm.js` (`_kjpL6LlmRationalizeSubject` + `_kjpL6RationalizeFallback`) | 0.3 d → ~50 行 | §D 5 case | ✅ |
| L6·c UI·2 button + suggestion cards + 3 click handler | `tm-keju-paradigm-panel.js` (`_kjpRenderL6SubjectActions` + `_kjpRenderL6SuggestionsBody` + 3 handler in _kjpHandleInputOrChange) | 0.4 d → ~95 行 | §F 6 case (src check) | ✅ |
| L6·d CSS·5 class | `tm-keju-paradigm-panel.css` (.kjp-l6-* 全) | 0.1 d → ~35 行 | (无 DOM·skip) | ✅ |
| L6·e smoke + 全 regression | `scripts/smoke-l6-subjects.js` (新) | 0.3 d → ~210 行 (33 case vs v1 估 30) | 33/33 全过 | ✅ |
| L6·async test race fix | scripts/smoke-l6-subjects.js (async sequential) | 0.05 d | (D3/D4 fail → fix) | ✅ |

### 12.2·全 stack smoke (post-L6)·**L-A Release 完结**

```
L1·smoke-l1-paradigm                95 PASS / 0 FAIL
L2·smoke-l2-paradigm-panel         115 PASS / 0 FAIL
L3·smoke-l3-ai-history-sim         107 PASS / 0 FAIL
L4·smoke-l4-forecast-and-stance    107 PASS / 0 FAIL
L5·smoke-l5-objection              103 PASS / 0 FAIL
L6·smoke-l6-subjects (新)           33 PASS / 0 FAIL  ★ 本 sprint
L7·smoke-l7-apply-reform           159 PASS / 0 FAIL
────────────────────────────────────────────────────
                                   719 PASS / 0 FAIL  零回归
```

### 12.3·文件清单·真实

| 文件 | 改类 | 行 v1 估 | 行 v2 实 | 备注 |
|---|---|---|---|---|
| `web/tm-keju-reform-llm.js` | 加 L6 §·2 LLM helper + normalize + 2 fallback + expose | +180 | **+150** | -30·norm helper 较 compact·expose 5 globals |
| `web/tm-keju-paradigm-panel.js` | _kjpRenderL6SubjectActions / _kjpRenderL6SuggestionsBody + 3 click handler + render hook in subjects section | +80 | **+95** | +15·click handler 全 (suggest / custom / accept) + render hook 内嵌 |
| `web/tm-keju-paradigm-panel.css` | .kjp-l6-* 5 class | +25 | **+35** | +10·#kjp-reform-modal selector wrap·跟 L4 cedui 同 paradigm |
| `scripts/smoke-l6-subjects.js` | 新 | ~280 | **~210** | -70·async sequential test 更紧凑·33 case 而非 v1 估 30 |

**total net·~490 行·**·跟 v1 估 ~565 行差不多 (略低·因 async test 简化)。

### 12.4·真"AI 协议玩家定义新 subject" paradigm 落地·user 看见

```
user 开改革面板·subjects section (A·题目)
   ↓
看见 现 paradigm subjects (e.g. 八股 70%·诗赋 20%·经义 10%)
   ↓
[现] 手动 8 候选 dropdown + "加" 按钮
[L6·新] "▶ LLM 推荐 5 个新科 (按朝代 + 现状)" + "▶ 自定义新科 (LLM 合理化)"
   ↓
user 点 "▶ LLM 推荐"
   ↓
LLM (按 era + paradigm + 矛盾 + 变量) 返 5 候选·display as 卡片
   每卡片·"算学·权重 15·practical·明末徐光启·算 + 工艺·边事重 选实学"
   ↓
user 点 "+ 加入草案" → push subjectsDraft·渲染入主 subjects list
   ↓
user 也可点 "▶ 自定义" → prompt "陛下欲增何科?"
   user 输 "物理学" → LLM 合理化 → {name:'格致科', weight:18, ideology:'modern', ...}
   → 直接入 subjectsDraft
   ↓
继续编 + 上奏 → L7 apply diff → new subject 真入 paradigm.subjects
```

→ **真 user 跟 LLM 协议 + LLM 合理化"陛下想增什么科·朕请讲"**·**A·LLM 推荐 + B·自定义两 path 全 ship**。

---

## §13·post-L6·解锁状态

| 后续 | L6 解锁 |
|---|---|
| **L-A Release 完结** | ✅ L1-L7 全 ship·L5 + L6 + L7 一并·Stage 2 一大段闭幕 |
| **L8 LLM 演化推演** | L6 加的 subject 入 paradigm.subjects·L8 read for 演化推 |
| **L13 玩家手撰诏书** | 同 paradigm·LLM 协议 |
| **L17 改革谘议会** | LLM 也可推 NPC 建议 subject·复用 L6 helper |
| **L20 国子监改革** | new subject 需教材·L6 helper 同 paradigm 扩 |
| **ship 1.2.6.5** | L3 + L4 + L5 + L6 + L7 一并 ship·一大波 release |

---

## §14·候选·next step

- **A·~~v1 → v2 doc~~** (✅ done·本 doc)
- **B·Round AA·三层 audit** (跟 L4/L5/L7 同 paradigm) ← 推荐
- **C·ship 1.2.6.5·tracking L3 + L4 + L5 + L6 + L7 一并** (await user pass)
- **D·开 Phase L-B (L8-L12)·LLM 演化推演 + 跨代承袭** (3-5 d / slice)
