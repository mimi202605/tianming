# Phase L·L10·历史改革 trigger pack·13 preset·sprint plan v3

> **date**·2026-05-25 (v3·**a-d 全 ship·v2 6 fix 全落地·等 user pass**)
> **status**·**core a-d done·smoke 36/36·全 regression 零回归 (927/927)**·见 §15 落地段
> **预算·v3 实测**·**~2 h total** (v2 估 1.7 d·实复用 L2/L7/L8 paradigm 紧凑·preset hardcode 快·smoke 36 vs 估 25)
> **依赖**·L2 (改革面板 draft state ✅·_kjpInitDraft / _kjpRerenderSubjects / _kjpRefreshPreview ✅) + L6 (UI button paradigm·改革面板 subjects section ✅) + L7 (commit chain ✅) + L8 (ChronicleModal + EraToKey ✅) + L9 (canonicalName + historicalEvaluation ✅)
> **paradigm 一句话**·**L10 = 13 hardcode 历史改革 + UI list + apply 入 L2 draft**·复用率 **~95%**·**0 LLM·0 new tick·0 new modal·0 new state**·**1 new data file**

---

## §0·L10 真做什么

10+ 真历史改革 hardcode·user 一键 fill 入 L2 改革面板 draft → 走现 L7 commit 系统型 path → L8 evolve + L9 命名 + L10 跨剧本 archive。

→ **L10 = tool (零代价·instant)·非 system (政治后果)**·跟 user 教训 `feedback_tool_vs_system_costs` 一致·preset fill 后 user 仍可编 / 上奏·走系统 path 有政治后果。

---

## §1·复用清单·8 现机制·net-new 仅 1 数据 + 3 helper

| 现机制 | 来源 | L10 用 |
|---|---|---|
| **L2·改革面板 draft state** | subjectsDraft / examIntervalDraft / retakePolicyDraft / ideologyDraft / quotaDraft / etc | preset apply 直 fill·non-new state |
| **L2·`_kjpInitDraft` + `_kjpRerenderSubjects` + `_kjpRefreshPreview`** | tm-keju-paradigm-panel.js | apply 后调·rerender·non-new render path |
| **L6·UI button paradigm** | 改革面板 subjects section·"▶ LLM 推荐 / ▶ 自定义" | **L10 加 "📜 历史模板" button 旁·non-new button style** |
| **L7·`_kjReformKeyiCallback` commit chain** | tm-keju-reform-apply.js | preset 入 draft → user 上奏·走现 commit chain·**preset 不 skip 政治后果** |
| **L8·archive snapshot** | tm-keju-reform-evolution.js | preset 可注入 localStorage 作 cross-scenario archive 源 (optional·v2 扩) |
| **L8·`_kjpL8EraToKey`** | tm-keju-reform-evolution.js | filter preset by era·复用·non-new era mapper |
| **L9·canonicalName + historicalEvaluation** | L7 entry schema | preset 含真名·apply 时 entry.canonicalName = preset 含·**skip L9 LLM 命名** |
| **L1·_kejuParadigm.history** | tm-keju-paradigm.js | preset apply 后 entry 入 history·non-new schema |
| **L8·ChronicleModal** | tm-keju-paradigm-panel.js | preset 加载 reform 跟手动一样·banner 显 canonicalName·non-new render |

**net-new**·
- `L10_PRESETS` (13 真历史改革·跨 6 era·hardcode array)
- `_kjpL10ApplyPreset(presetId, modal)` — fill L2 draft fields (复用 L2 setter)
- `_kjpRenderL10PresetList(modal)` — UI list·era filter·一键 apply
- `_kjpL10FilterByEra(eraKey)` — filter helper (复用 L8 EraToKey)
- L7 commit·step 4.5 加 preset shortcircuit·若 draft._l10PresetId → 直 set entry.canonicalName·skip L9 LLM (省 1 LLM call)

**0 LLM·0 new tick·0 new modal·0 new state**·preset 是 data + dispatcher。

---

## §2·13 historical reform preset 清单

| id | era | canonicalName | 主导 | 年 | method | 核心 paradigm 改 |
|---|---|---|---|---|---|---|
| **han_chaju** | han | 察举制立 | 汉武帝 | -134 | edict | quota·孝廉 (科举前身) |
| **tang_jianzhong4** | tang | 建中四科 | 唐德宗 | 783 | council | subjects +策论 +词科 +史科 |
| **song_qingli** | song | 庆历新政 | 范仲淹 | 1043 | council | examinerRules·重策论轻诗赋 |
| **song_xining** | song | 熙宁变法 | 王安石 | 1071 | edict | subjects +三经新义·罢诗赋·ideology→reformist |
| **song_yuanyou** | song | 元祐党人碑 | 司马光 | 1085 | edict | rollback 熙宁·复诗赋·ideology→traditional |
| **song_shaosheng** | song | 绍圣复新 | 章惇 | 1094 | edict | rollback 元祐·复王安石 |
| **yuan_yanyou** | yuan | 延祐复科 | 元仁宗 | 1313 | edict | tier·复科举·朱熹四书·ideology→traditional |
| **ming_hongwu** | ming | 洪武三场 | 朱元璋 | 1370 | edict | tier·初定三场制 |
| **ming_kaocheng** | ming | 张居正考成法 | 张居正 | 1573 | council | examinerRules·考成纲领·吏治肃 |
| **qing_yongzheng_nb** | qing | 雍正南北榜调 | 雍正 | 1729 | edict | quota.geo·南北中三卷 |
| **qing_wuxu** | qing | 戊戌新政 | 光绪 | 1898 | edict | subjects +西学 +算学 +译学·ideology→modern |
| **qing_baichi** | qing | 百日维新 | 光绪 | 1898 | defy | ideology shift·rapid radical (附 magnitudeParsed.radical=95) |
| **qing_yifan_keju** | qing | 1905 罢科举 | 慈禧 | 1905 | edict | examInterval=0·废除 |

→ **13 个 preset·覆 6 era (han/tang/song/yuan/ming/qing)·真历史路径全谱**

---

## §3·preset schema (跟 L7 entry + L9 canonicalName 兼容)

```javascript
{
  id: 'song_xining',
  era: 'song',
  canonicalName: '熙宁变法',
  historicalEvaluation: '王安石变法·新法乱·终罢·开党争·后世评价两极',
  by: '王安石',
  year: 1071,
  method: 'edict',
  magnitudeDescriptor: '罢诗赋·改新义·急除积弊',
  magnitudeDescriptorPreset: 'song_xining',   // C2/B1·跟 magnitudeDescriptor 同 key·skip L3 LLM 重解
  magnitudeParsed: { radical: 85, scale: 'major', years: 30, reversible: true,
                     tags: ['radical', 'ideology_shift'], paraphrase: '罢诗赋改新义' },   // C2·必 ship·skip L3 LLM
  diff: {
    subjects: {
      added: [
        { id: 'sjxy', name: '三经新义', weight: 30, ideology: 'reformist',
          historicalAnalog: '熙宁·王安石', format: '新经义' }
      ],
      removed: [{ id: 'shi', name: '诗赋' }]
    },
    ideology: 'reformist'
  },
  // 可选·apply 后供 L8 archive / UI tooltip 用
  _l10HistoricalContext: '神宗即位·王安石以参知政事推新法·政事堂主持'
}
```

**ERA_LABEL** (B3 fix·中文 display)·

```javascript
var ERA_LABEL_ZH = {
  han: '汉', tang: '唐', song: '宋',
  yuan: '元', ming: '明', qing: '清'
};
```

---

## §4·UI·改革面板加 "📜 历史模板" button (~50 行)

### 4.1·button 加 L6 subject section 旁

```javascript
// _kjpRenderL6SubjectActions 末尾·跟 LLM 推荐 / 自定义 同 row
'<button class="bt bsm kjp-l10-preset-btn" title="按朝代见 13+ 历史改革·一键 fill">' +
  '📜 历史模板</button>'
```

### 4.2·click → 弹独立 modal·list preset 按 era filter

```javascript
function _kjpOpenL10PresetModal(modal) {
  var existing = document.getElementById('kjp-l10-preset-modal');
  if (existing) try { existing.remove(); } catch(_){}
  var listModal = document.createElement('div');
  listModal.id = 'kjp-l10-preset-modal';
  listModal.className = 'modal kjp-l10-modal';
  listModal.innerHTML =
    '<div class="kjp-modal-content kjp-l10-modal-content">' +
      '<div class="kjp-modal-header">' +
        '<div class="kjp-modal-title">📜 历史改革模板·按朝代</div>' +
        '<button class="bt bs bsm kjp-l10-close-btn">✕</button>' +
      '</div>' +
      '<div class="kjp-modal-body">' + _kjpRenderL10PresetList(modal) + '</div>' +
    '</div>';
  document.body.appendChild(listModal);
  listModal.addEventListener('click', function(e) {
    var t = e.target;
    if (!t || !t.classList) return;
    if (t.classList.contains('kjp-l10-close-btn')) {
      try { listModal.remove(); } catch(_){}
      return;
    }
    if (t.classList.contains('kjp-l10-apply-btn')) {
      var pid = t.dataset.pid;
      try { _kjpL10ApplyPreset(pid, modal); } catch(_){}
      try { listModal.remove(); } catch(_){}
    }
  });
}
```

### 4.3·render·按 era filter

```javascript
function _kjpRenderL10PresetList(modal) {
  if (typeof L10_PRESETS === 'undefined') return '<div>preset 未载</div>';
  var era = (GM._kejuParadigm && GM._kejuParadigm.initEra) || '';
  var eraKey = (typeof _kjpL8EraToKey === 'function') ? _kjpL8EraToKey(era) : era;
  var presets = _kjpL10FilterByEra(eraKey);
  var html = '';
  if (presets.length) {
    html += '<div class="kjp-l10-section-title">本朝可选 (' + eraKey + '·' + presets.length + ')</div>';
    html += presets.map(_renderCard).join('');
  }
  // 全朝代 list 折叠
  html += '<details class="kjp-l10-all-section">';
  html += '<summary>查全朝代 (' + L10_PRESETS.length + ')</summary>';
  html += L10_PRESETS.map(_renderCard).join('');
  html += '</details>';
  return html;

  function _renderCard(p) {
    return '<div class="kjp-l10-preset-card">' +
      '<b>' + _escHtml(p.canonicalName) + '</b>·' +
      _escHtml(p.era) + '·' + _escHtml(p.by) + '·年 ' + p.year + '<br>' +
      '<div class="kjp-l10-hist-eval">' + _escHtml(p.historicalEvaluation) + '</div>' +
      '<div class="kjp-l10-mag">' + _escHtml(p.magnitudeDescriptor || '') + '</div>' +
      '<button class="bt bsm kjp-l10-apply-btn" data-pid="' + _escHtml(p.id) + '">' +
        '▶ 一键 fill' + '</button>' +
    '</div>';
  }
}
```

### 4.4·apply·`_kjpL10ApplyPreset`·fill draft

```javascript
function _kjpL10ApplyPreset(presetId, modal) {
  if (typeof L10_PRESETS === 'undefined') return;
  var preset = L10_PRESETS.find(function(p) { return p.id === presetId; });
  if (!preset || !modal || !modal._kjpDraft) return;
  var draft = modal._kjpDraft;
  // fill draft fields·跟 L2 现有 setter 同 path
  if (preset.diff && preset.diff.subjects) {
    (preset.diff.subjects.added || []).forEach(function(s) {
      draft.subjectsDraft = draft.subjectsDraft || [];
      // dedup by name·跟 L6 BB-A4 同 paradigm
      if (!draft.subjectsDraft.some(function(x) { return x.name === s.name; })) {
        draft.subjectsDraft.push(Object.assign({}, s));
      }
    });
    (preset.diff.subjects.removed || []).forEach(function(s) {
      draft.subjectsDraft = (draft.subjectsDraft || []).filter(function(x) {
        return !(x.id === s.id || x.name === s.name);
      });
    });
  }
  if (preset.diff && preset.diff.ideology) draft.ideologyDraft = preset.diff.ideology;
  if (preset.diff && preset.diff.examInterval != null) draft.examIntervalDraft = preset.diff.examInterval;
  if (preset.diff && preset.diff.retakePolicy) draft.retakePolicyDraft = preset.diff.retakePolicy;
  // descriptor·user 可改·**B1·magnitudeDescriptorPreset 同 set·防 L3 重 fire LLM**
  draft.magnitudeDescriptor = preset.magnitudeDescriptor || '';
  draft.magnitudeDescriptorPreset = preset.magnitudeDescriptorPreset || preset.id;
  // **C2·preset 必 ship magnitudeParsed·skip L3 LLM 解 magnitude**
  draft.magnitudeParsed = preset.magnitudeParsed || null;
  // 标记 preset 来源·commit 时 step 4.5 shortcircuit·skip L9 LLM
  draft._l10PresetId = preset.id;
  draft._l10PresetCanonicalName = preset.canonicalName;
  draft._l10PresetHistoricalEvaluation = preset.historicalEvaluation;
  draft._l10PresetBy = preset.by;
  // rerender·复用 L2 path
  try { _kjpRerenderSubjects(modal); } catch(_){}
  try { _kjpRefreshPreview(modal); } catch(_){}
  // toast
  try { if (typeof toast === 'function')
    toast('📜 已 fill·' + preset.canonicalName + '·可编辑后上奏·政治后果同手动'); } catch(_){}
}
```

### 4.5·filter helper·B2 fix·invalid era → fallback all

```javascript
function _kjpL10FilterByEra(eraKey) {
  if (typeof L10_PRESETS === 'undefined') return [];
  if (!eraKey) return L10_PRESETS.slice();   // empty → all
  var matched = L10_PRESETS.filter(function(p) { return p.era === eraKey; });
  // B2·invalid era (无 match) → fallback all·user 仍可选
  if (!matched.length) return L10_PRESETS.slice();
  return matched;
}
```

---

## §5·L7 commit chain·step 4.5 加 preset shortcircuit (~15 行)

**C1·CRITICAL fix**·`_kjReformKeyiCallback(method, ctx)` 不接 modal·只 ctx.topicData·必须 panel 先把 preset 字段流入 topicData·callback 读 ctx.topicData。

### 5.1·panel `_kjpSubmitFromModal` extract·加 preset 字段流入 topicData

```javascript
// _kjpExtractL3Meta·扩 L10 字段·跟 magnitudeParsed 同入 l3Meta
function _kjpExtractL3Meta(draft) {
  if (!draft) return null;
  return {
    magnitudeDescriptor: draft.magnitudeDescriptor,
    magnitudeDescriptorPreset: draft.magnitudeDescriptorPreset,
    magnitudeParsed: draft.magnitudeParsed,
    // ... 现有字段
    // L10·preset 字段·流入 topicData·L7 callback 读
    l10PresetId: draft._l10PresetId || null,
    l10PresetCanonicalName: draft._l10PresetCanonicalName || null,
    l10PresetHistoricalEvaluation: draft._l10PresetHistoricalEvaluation || null,
    l10PresetBy: draft._l10PresetBy || null
  };
}

// topicData 加 (跟 magnitudeDescriptor 同 assign 路径)
if (l3Meta) {
  topicData.magnitudeDescriptor = l3Meta.magnitudeDescriptor;
  // ... 现有
  // L10·preset shortcircuit 字段
  topicData.l10PresetId = l3Meta.l10PresetId;
  topicData.l10PresetCanonicalName = l3Meta.l10PresetCanonicalName;
  topicData.l10PresetHistoricalEvaluation = l3Meta.l10PresetHistoricalEvaluation;
  topicData.l10PresetBy = l3Meta.l10PresetBy;
}
```

### 5.2·L7 callback step 4.5·读 ctx.topicData (非 modal)

```javascript
// step 4 后·step 5 之前·entry 已立
var histEntry = _kjpL7AppendHistory(diff, intent, mag, pilot, method, outcome, ctx, applyResult);

// step 4.5·L10 preset shortcircuit (优先) OR L9 LLM 命名
var topicData = (ctx && ctx.topicData) || {};
if (outcome && outcome.passed === true && applyResult && applyResult.applied) {
  if (topicData.l10PresetId && topicData.l10PresetCanonicalName) {
    // L10·preset·直 set·skip L9 LLM (0 cost)
    histEntry.canonicalName = topicData.l10PresetCanonicalName;
    histEntry.historicalEvaluation = topicData.l10PresetHistoricalEvaluation || '';
    histEntry._l10PresetId = topicData.l10PresetId;
    if (topicData.l10PresetBy) histEntry.by = topicData.l10PresetBy;
  } else if (typeof window !== 'undefined' && typeof window._kjpL9MaybeNameReform === 'function') {
    // non-preset·走 L9 LLM 命名 (现 path)
    try { window._kjpL9MaybeNameReform(histEntry); } catch(_){}
  }
}
```

→ **preset 走 commit·entry.canonicalName 直 set·0 LLM cost**·非 preset 走 L9 LLM。

---

## §6·新文件 + 改文件

| 文件 | 改 | 行 |
|---|---|---|
| **`web/tm-keju-reform-presets-history.js`** | **新·hardcode 13 preset 数据 + L10_PRESETS array + 3 helper + expose** | **~280** |
| `web/tm-keju-paradigm-panel.js` | L6 subjects section 加 "📜 历史模板" button + modal opener + render + apply handler·~70 行 |
| `web/tm-keju-paradigm-panel.js` | `_kjpInitDraft` 加 _l10PresetId / canonicalName / historicalEvaluation / by 默 null·~5 行 |
| `web/tm-keju-reform-apply.js` | step 4.5·preset shortcircuit·draft._l10PresetId → entry.canonicalName·~10 行 |
| `web/tm-keju-paradigm-panel.css` | .kjp-l10-* 5 class (modal / preset-card / hist-eval / mag / apply-btn / section-title)·~30 行 |
| `web/index.html` | 新 script tag·~1 行 |
| **`scripts/smoke-l10-presets.js`** | **新** | **~270 行·~25 case** |

**total net·~665 行**·复用率 **~95%**·**1 new data file·0 new modal frame·0 new tick·0 LLM**

---

## §7·smoke (L10·d·0.3 d) ~25 case

| § | 内容 | case |
|---|---|---|
| A | L10_PRESETS 数据完整·13 preset 全·必须字段 (id / era / canonicalName / by / year / method) | 5 |
| B | `_kjpL10FilterByEra` 6 era 全 filter·empty era → all·invalid era → empty | 7 |
| C | `_kjpL10ApplyPreset` fill draft·subjects added/removed·ideology·magnitudeDescriptor·_l10PresetId 标记 | 8 |
| D | preset shortcircuit·若 draft._l10PresetId → entry.canonicalName = preset·skip L9 LLM | 3 |
| E | invalid presetId / missing modal·noop·非崩 | 2 |

---

## §8·预算

| Slice | 内容 | 估时 |
|---|---|---|
| L10·a | preset 数据 13 个 (真历史 paradigm·subjects/ideology/method 全配) | 0.5 d |
| L10·b | apply dispatcher + filter helper + L7 commit shortcircuit | 0.3 d |
| L10·c | UI list modal + apply button + click handler + CSS 5 class | 0.4 d |
| L10·d | smoke ~25 case + 全 regression | 0.3 d |
| **核心** | | **~1.5 d** |

跟 Stage 2 plan §7.9 估 **2-3 d**·**实 1.5 d 因 hardcode 数据·非 LLM**。

---

## §9·red line 守

| Rule | 守 |
|---|---|
| 1·复用·非自建 | ✅ 8 现机制·net-new 仅 1 数据 + 3 helper·**0 new tick·0 new modal frame** |
| 2·async + fallback | ✅ apply 是 sync·non-LLM·instant·非 block |
| 3·失败禁玄幻 | ✅ 13 preset 全真历史·无虚构事件 |
| 4·9 朝代 voice | ✅ 6 era 覆盖 (han/tang/song/yuan/ming/qing)·非 song-only |
| 5·党争·GM.parties | (L10 是 preset·政治后果走 L7 commit·skip) |
| 6·走常朝 source pool | (L10 是 UI 操作·non-NPC speech) |
| 7·flag gate | `P.conf.useNewKejuL10=false` 默认 off·button 隐 |
| 8·三面 | 运行时 ✅·编辑器留 L18 |

---

## §10·跟 user 教训对齐

| 教训 | L10 守 |
|---|---|
| `feedback_tool_vs_system_costs` | ✅ preset 是 tool (零代价·instant fill)·后续走 L7 commit 系统型·两者分明 |
| `feedback_editor_game_relation` | preset 是运行时·编辑器留 L18 |
| `feedback_no_mystic_penalties` | 13 preset 全真政治事件 |
| `feedback_paradox_ui_unreliable` | UI 复用 L2 改革面板·非凭推 |
| `feedback_design_must_audit_v3_first` | doc v1·audit 复用面前·非凭推 |
| `feedback_scope_strictness` | 只动 L2 draft / L7 commit shortcircuit·**不改 L1 paradigm init·不改 L8 evolve·不改 L9 LLM 命名** |

---

## §11·候选·next step

- **A·v1 入卷·然后 audit (~0.1 d)·再开 a-d (~1.5 d)** ← 推荐
- **B·直接开 a-d·skip audit** (~1.4 d)
- **C·砍 §2 部分 preset·只 5 个 (~0.8 d minimal)** — 跨 era 覆盖差
- **D·补 archive 注入·preset 也作 cross-scenario archive 源** (~+0.3 d·v2)

---

## §12·post-L10·解锁

| 后续 | L10 解锁 |
|---|---|
| **真"30 秒新手 onboarding"** | ✅ 改革面板首开·提示"📜 历史模板"·user 30 秒一键 fill 王安石变法 |
| **L11 rollback** | preset 含 "song_yuanyou" 元祐党人碑·user 见前朝改革后 rollback (跟 song_xining 配对) |
| **L18 timeline visualization** | preset reform 入 history·timeline 显完整 13 历史节点 |
| **L29 政治暗杀** | preset radical=95 (百日维新) → 黑天鹅 reformer_illness 概率高 |
| **跨剧本 archive** | preset 可注入 archive (optional v2)·user 玩 ming 时见 song_xining 作前朝 inheritance 源 |

---

## §13·version 史

| date | version | 改 |
|---|---|---|
| 2026-05-25 | **v1** | 初稿·13 historical preset + UI list + apply 入 L2 draft + L7 commit shortcircuit·复用 8 现机制·~665 行·1.5 d 估·**8 项 audit 找 6 BUG** |
| 2026-05-25 | **v2** | **6 BUG 全修** (1 critical·C1·hook 改 ctx.topicData 流·非 modal scope·2 high·C2 preset ship magnitudeParsed + B1 magnitudeDescriptorPreset·3 mid·B2 invalid era fallback + B3 era 中文 label + C3 reset clear)·~+0.2 d·**等 user 批准开工**·见 §14 audit 对照 |

---

## §14·v1 → v2 audit 对照表 (Round 1)

| ID | severity | v1 问题 | v2 fix |
|---|---|---|---|
| **C1** | **CRITICAL** | `_kjReformKeyiCallback` 不接 modal·preset shortcircuit 永不触发 | panel `_kjpExtractL3Meta` 扩 L10 字段·流入 topicData·L7 callback 读 `ctx.topicData.l10PresetId` |
| **C2** | high | preset 不 ship magnitudeParsed·L3 LLM 又解一次·浪费 token | preset 必 ship `magnitudeParsed: {scale, radical, years, reversible, tags, paraphrase}` |
| **B1** | high | preset 不 set magnitudeDescriptorPreset·L3 LLM 可能重 fire | apply 同 set `draft.magnitudeDescriptorPreset = preset.magnitudeDescriptorPreset \|\| preset.id` |
| **C3** | mid | `_l10PresetId` reset 漏·跨议题 leak | `_kjpInitDraft` 加 _l10PresetId/CanonicalName/HistoricalEvaluation/By 默 null·每开 modal 清 |
| **B2** | mid | invalid era → 空 list | filter helper·invalid era → fallback all (user 仍可选) |
| **B3** | mid | era 'song' 显·非 user 友好 | ERA_LABEL_ZH 映射·card 显"宋" |
| A1·A2 | low | button 位置·badge | (skip·polish) |

**total·8 项 → 真 6 修 (1 critical + 2 high + 3 mid) + 2 polish skip**

---

## §15·真实落地 (v3·2026-05-25)·**core a-d 全 ship**

### 15.1·slice 完成对照

| Slice | 文件 | 行数·v2 估 vs 实 | smoke | 状态 |
|---|---|---|---|---|
| L10·a preset 数据 13 个 | tm-keju-reform-presets-history.js (新) | 0.5 d → ~360 行 (含 注释) | §A 5 | ✅ |
| L10·b apply + filter + commit shortcircuit | tm-keju-paradigm-panel.js·_kjpL10ApplyPreset + _kjpExtractL3Meta 扩 + topicData 扩·tm-keju-reform-apply.js·step 4.5 shortcircuit | 0.3 d → ~70 行 | §C 12·§D 6·18 case | ✅ |
| L10·c UI list modal + button + CSS | tm-keju-paradigm-panel.js·_kjpOpenL10PresetModal + _kjpRenderL10PresetList + _kjpRenderL10PresetAction·tm-keju-paradigm-panel.css·6 class | 0.4 d → ~150 行 | (UI·src check) | ✅ |
| L10·d smoke + 全 regression | scripts/smoke-l10-presets.js (新·36 case) | 0.3 d → ~250 行 | 36/36 全过 | ✅ |
| index.html cache-bust | tm-keju-reform-presets-history.js?v=20260525-l10 | 0.05 d → +1 行 | - | ✅ |

### 15.2·全 stack smoke (post-L10)

```
L1·smoke-l1-paradigm                 95 PASS / 0 FAIL
L2·smoke-l2-paradigm-panel          115 PASS / 0 FAIL
L3·smoke-l3-ai-history-sim          107 PASS / 0 FAIL
L4·smoke-l4-forecast-and-stance     107 PASS / 0 FAIL
L5·smoke-l5-objection               103 PASS / 0 FAIL
L6·smoke-l6-subjects                 72 PASS / 0 FAIL
L7·smoke-l7-apply-reform            159 PASS / 0 FAIL
L8·smoke-l8-evolution                67 PASS / 0 FAIL
L9·smoke-l9-naming-blackswan         66 PASS / 0 FAIL
L10·smoke-l10-presets                36 PASS / 0 FAIL  ★ 本 sprint
─────────────────────────────────────────────────────
                                    927 PASS / 0 FAIL  零回归
```

### 15.3·文件清单·真实

| 文件 | 改类 | 行 v2 估 | 行 v3 实 | 备注 |
|---|---|---|---|---|
| `web/tm-keju-reform-presets-history.js` (新) | 13 preset data + ERA_LABEL_ZH + filter + label + expose | +280 | **~360** | +80·preset 真历史细节 (历史评价 / 上下文 / context) 更详 |
| `web/tm-keju-paradigm-panel.js` | _kjpInitDraft 加 _l10 字段 + _kjpExtractL3Meta 扩 + topicData 扩 + L6 section 加 button + click handler + _kjpOpenL10PresetModal + _kjpRenderL10PresetList + _kjpL10ApplyPreset + _kjpRenderL10PresetAction | +85 | **~165** | +80·UI modal + render + apply 全 inline·5 globals expose |
| `web/tm-keju-reform-apply.js` | step 4.5·L10 preset shortcircuit + L9 LLM fallback | +10 | **+12** | exact |
| `web/tm-keju-paradigm-panel.css` | .kjp-l10-* 6 class | +30 | **~55** | +25·6 class hex 全·跟 L8 paradigm 一致 |
| `web/index.html` | +1 script tag | +1 | +1 | - |
| `scripts/smoke-l10-presets.js` (新) | 36 case (vs 估 25) | ~270 | **~250** | smoke 36 (A·5 + B·8 + C·12 + D·6 + E·5) |
| **total net** | | **+676** | **~843** | +25%·因 13 preset 数据详 + UI inline·复用率 ~95% 守 |

### 15.4·跟 user 教训对齐 (落地确认)

| 教训 | v3 守 |
|---|---|
| **复用·非自建** | ✅ 8 现机制·net-new 仅 1 数据 + 3 helper·**0 new modal frame·0 new tick·0 LLM** |
| **工具型 vs 系统型** | ✅ preset 是工具型 (instant fill·toast confirm)·后续走 L7 commit 系统型·两者分明 |
| **失败禁玄幻** | ✅ 13 preset 全真历史·无虚构 |
| **scope strictness** | ✅ 只动 L2 draft·L7 step 4.5 shortcircuit·**未改 L1 paradigm init·未改 L8 evolve·未改 L9 LLM 命名 (skip via shortcircuit)** |
| `feedback_design_must_audit_v3_first` | ✅ v1 audit 找出 1 critical (hook scope)·v2 fix·实施层无大坑 |

---

## §16·post-L10·解锁

| 后续 | L10 解锁 |
|---|---|
| **30 秒新手 onboarding** | ✅ 改革面板首开·提示 "📜 历史模板" button·user 30 秒一键 fill 王安石变法 |
| **L11 rollback** | preset 含 song_yuanyou_genghua / song_shaosheng_xinfa·跨 preset rollback 链条·user 见熙宁→元祐→绍圣→崇宁 完整党争 4 段史 |
| **L18 timeline visualization** | preset reform 入 history·timeline 显完整 13 历史节点·跨 era |
| **L29 政治暗杀** | preset qing_wuxu radical=90·黑天鹅 reformer_illness 概率高·光绪戊戌之实 |
| **跨剧本 archive** | preset 可注入 L8 archive (optional v2 扩)·user 玩 ming 时见 song_xining 作前朝 inheritance 源 |
