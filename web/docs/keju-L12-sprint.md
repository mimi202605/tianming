# 科举·Stage 2·Phase L·Slice L12·改革后果 UI + 科举志 timeline + reformer 传记

**date**·2026-05-25
**status**·draft v2·audit 收口·6 项 fix·待 implement
**estimated**·1.6-2.0 d (13-16 h)
**dependency**·L1 paradigm.history·L7 entry full schema·L8 _reformChronicle + archive·L9 canonicalName·L11 rollbackTargetId / rolledBackBy·**GM._chronicle (反向找 retirement event)**
**flag gate**·`P.conf.useNewKejuL12=false` 默认 off

**红线 reminder**·
- **复用·非自建** — 全 piggyback L8 chronicle modal·扩 tabs·**zero 新 paradigm 字段**
- **失败禁玄幻** — LLM bio fail·fallback "(无 LLM·X 朝改革家·主导 Y 改革)"
- **工具 vs 系统** — L12 全 viewer 工具·**零代价**
- **保 keyi 800 行** — L12 不动 keyi
- **9 朝代 preset** — bio prompt 见 era·LLM 自适
- **audit-first** — v1 → audit → v2 → implement

---

## 0·v1 → v2·audit 6 项 fix

| ID | sev | 内容 | v2 处理 |
|---|---|---|---|
| **B1** | HIGH | retired NPC 找·`_retireReason` 字符串无 reformId | §1.2·改走 `GM._chronicle.filter(reformId===entry.id)` |
| **C2/D2** | HIGH | bio cache 持久化矛盾 doc Q1 | §4.3·**改 `GM._kjpReformerBios`** (non-paradigm·per-session) |
| **A3+B6** | MID | timeline 长 span 不可读 | §3.1+§3.3·overflow-x + min-width per bar |
| **A5** | MID | bio panel inline 还是 modal | §4.1·明 **inline expand·单 active** |
| **B5** | MID | timeline 空 history div by 0 | §3.3·early return + UI "(无改革)" |
| **D5** | MID | entry.by '陛下' bio prompt 空 | §4.4·prompt 加 scenario emperor + "当朝你方主导" |

**净加 ~30 行 doc·实施 ~10 行额外·est 不变**

---

## 1·sprint 主旨

**L12 = 纯 visualization slice**·所有数据已沉淀·zero 新 game state·无新 keyi·无新 hook。

4 sub-feature·

| 序 | 内容 | est |
|---|---|---|
| **L12·A·改革后果汇总 panel** | 按 reform·累计 dimDelta·NPC retired list·subjects diff vs initial·rollback 链 | 3-4h |
| **L12·B·科举志 modal 扩 tabs** | 现 L8 chronicle 单视图 → 3 tabs ("年度演化" / "改革列表" / "改革者") | 2h |
| **L12·C·timeline 视图** | 水平 timeline·按 year·status color·rollback chain 联线·overflow-x scroll | 4-5h |
| **L12·D·改革者传记** | LLM async 生 300 字 bio per `entry.by`·**cache `GM._kjpReformerBios`** (per-session·LRU 30) | 4-5h |

**total·~13-16 h ~ 1.6-2.0 d**

**1 LLM helper net-new** + **1 新文件** `tm-keju-reformer-bio.js` (~250 行) + panel.js 扩 ~200 行 + CSS ~80 行。

---

## 2·L12·A·改革后果汇总 panel

### 2.1·UI

```
┌─────────────────────────────────────────┐
│ 📜 熙宁变法 (王安石·1071·active)        │
│   王安石主新法·三经新义·罢诗赋…           │
│   [📊 后果汇总 ↓]                       │
├─────────────────────────────────────────┤
│ 累计影响 (4 年)·                         │
│   loyaltyAccum   总 -15 (support 平均)   │
│   corruption     +8                      │
│   civilianReact  -5                      │
│   factionTension +12                     │
│                                          │
│ 新加科·三经新义 (weight 35)              │
│ 移除·诗赋                                 │
│                                          │
│ NPC 退·吕公著 (1074·不忍祖制更易)         │
│ NPC 反应·司马光·孜孜以求·苏轼·讥之以诗   │
│                                          │
│ 反弹奏疏·3 次 (1072·1074·1076)           │
│ 黑天鹅·1 次 (1075·examiner_corrupt)      │
│ rollback link·已被"元祐更化"废 (1086)    │
└─────────────────────────────────────────┘
```

### 2.2·数据源·**B1 fix**

| 字段 | 来源 |
|---|---|
| dimDelta 累计 | `_reformChronicle[histId][year][].dimDelta` Σ |
| 新加科 / 移除 | `entry.diff` 或 `entry._reverseSnapshot.addedSubjectIds` |
| **NPC 退** | **`GM._chronicle.filter(e => e.reformId===entry.id && (e.type==='reform-retirement' || e.type==='reform-rollback-retirement'))`** — **非走 `_retireReason` 字符串** |
| NPC 反应 | `chronicle[histId][year][].npcReact` flatten |
| 反弹奏疏 count | `GM._chronicle.filter(e => e.tags?.includes('reform') && e.type==='keju-reform-memorial' && e.reformId===entry.id)` |
| 黑天鹅 count | `chronicle[histId][year][].specialEvent` count |
| rollback link | `entry.rolledBackBy` → find entry in history → display canonicalName |

### 2.3·新 helper·`_kjpL12CollectReformImpactSummary(entry)`

```js
function _kjpL12CollectReformImpactSummary(entry) {
  if (!entry || !entry.id) return null;
  var paradigm = GM._kejuParadigm || {};
  var chronicle = paradigm._reformChronicle || {};
  var yearMap = chronicle[entry.id] || {};
  var accum = { loyaltyAccum: 0, corruptionAccum: 0, civilianReact: 0, factionTension: 0 };
  var npcReactSamples = [];
  var swanList = [];
  Object.keys(yearMap).forEach(function(y) {
    var e = yearMap[y];
    if (!e || e._stub) return;
    if (e.dimDelta) {
      ['loyaltyAccum','corruptionAccum','civilianReact','factionTension'].forEach(function(k) {
        if (typeof e.dimDelta[k] === 'number') accum[k] += e.dimDelta[k];
      });
    }
    if (Array.isArray(e.npcReact)) {
      e.npcReact.slice(0, 3).forEach(function(r) { npcReactSamples.push(r); });
    }
    if (e.specialEvent) swanList.push({ year: parseInt(y, 10), type: e.specialEvent.type });
  });
  // B1·retired NPCs via GM._chronicle reformId reverse lookup
  var retiredEvents = (GM._chronicle || []).filter(function(c) {
    return c && c.reformId === entry.id &&
           (c.type === 'reform-retirement' || c.type === 'reform-rollback-retirement');
  });
  var memorialCount = (GM._chronicle || []).filter(function(c) {
    return c && c.reformId === entry.id &&
           (c.type === 'keju-reform-memorial' || c.type === 'reform-memorial-spawn');
  }).length;
  // rollback link
  var rolledBackByEntry = null;
  if (entry.rolledBackBy) {
    var hist = paradigm.history || [];
    for (var i = 0; i < hist.length; i++) {
      if (hist[i] && hist[i].id === entry.rolledBackBy) { rolledBackByEntry = hist[i]; break; }
    }
  }
  return {
    accumDimDelta: accum,
    addedSubjects: _kjpL12ReadAddedSubjects(entry),
    removedSubjects: _kjpL12ReadRemovedSubjects(entry),
    retiredEvents: retiredEvents,
    npcReactSamples: npcReactSamples.slice(0, 6),
    memorialCount: memorialCount,
    swanList: swanList,
    rolledBackByEntry: rolledBackByEntry,
    ageInGame: (GM.year || 0) - (entry.year || 0)
  };
}
```

复用·**zero 新字段·zero 新写**·全 read 派生。

---

## 3·L12·B·科举志 modal 扩 tabs

### 3.1·扩 3 tabs

```
┌─[改革志]─────────────────────[✕]─┐
│ [年度演化] [改革列表] [改革者]    │ ← 新 3 tabs
├──────────────────────────────────┤
│  (active tab content)            │
└──────────────────────────────────┘
```

- Tab 1·年度演化 — 现 `_kjpRenderL8ChronicleBody` 内容
- Tab 2·改革列表 — timeline (L12·C 内容·**overflow-x scroll**)
- Tab 3·改革者 — reformer biography (L12·D 内容)

### 3.2·tab 切换 logic

```js
modal._kjpActiveTab = 'evolution'; // 'evolution' / 'list' / 'reformer'
// click tab → 改 modal._kjpActiveTab → re-render body
```

modal close 后 state 丢·重开 default 'evolution'·OK·non-bug。

---

## 4·L12·C·timeline 视图·**B5+A3+B6 fix**

### 4.1·UI·overflow-x scroll

```
┌─[改革列表]────────────────────────[scroll-x ↔]┐
│ 1071    1074  1076  1086  1093  1097          │ ← year axis
│  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░                     │ ← 熙宁变法 (active)
│             ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                   │ ← 元祐更化 (rolled_back)
│                       ▓▓▓▓▓                   │ ← 绍圣绍述 (active)
│                                                │
│ [hover]·熙宁变法·1071-1086 (废)               │
│  王安石·罢诗赋·三经新义                         │
│  → 元祐更化·1086 废                             │
└────────────────────────────────────────────────┘
```

### 4.2·算法

- 排序 entry by year asc
- min year = paradigm.history 最小 year (或 paradigm.initYear)
- max year = max(GM.year, last reform startYear + rampUpYears + 30)
- **B6 fix**·若 `(maxY - minY) > 100`·**min-width per bar = 40px** + 父 `overflow-x: scroll`·避 0.x% 宽不可读
- **B5 fix**·若 history 空·early return·UI "(无改革·施行后会逐年累积)"
- 每 entry 算 startX·widthPct·CSS flex 或 absolute position
- rollback chain·虚线 div + position absolute·或 simple "→" 链接 hover 显·**doc·用 CSS div border·非 SVG·避复杂**

### 4.3·status color

```css
.kjp-l12-tl-bar.status-ramping  { background: #d4a017; }    /* yellow */
.kjp-l12-tl-bar.status-active   { background: #4a90b8; }    /* blue */
.kjp-l12-tl-bar.status-matured  { background: #5a8a4a; }    /* green */
.kjp-l12-tl-bar.status-rolled_back {
  background: repeating-linear-gradient(45deg,
    #8b4848, #8b4848 4px, #6b3030 4px, #6b3030 8px);    /* red 斜划 */
}
```

### 4.4·click entry → 跳 Tab 1

需 anchor·`scrollIntoView`·Tab 1 中每 section 加 `data-rid` attr。

---

## 5·L12·D·改革者传记·**C2/D2·D5 fix**

### 5.1·UI·**A5·inline expand·单 active**

```
┌─[改革者]────────────────────────┐
│ [王安石·宋·1071]   [📜 传记]    │ ← reformer card list
│ [司马光·宋·1086]   [📜 传记]    │
│ [章惇·宋·1093]    [📜 传记]    │
│                                  │
│ (click 一张 → inline expand·single active) │
│ (click 别张 → switch·非 stack)             │
│                                  │
│ ─────[王安石·展开]─────           │
│ 王安石·字介甫·宋抚州临川人·熙宁    │
│ 主新法·罢诗赋立三经新义…后世评两极  │
│   主导改革·熙宁变法 (1071)        │
│   史评·三经新义·后世评两极         │
└─────────────────────────────────┘
```

- A5·`modal._kjpActiveBioName = name`·click 别张·改 active name·**只 1 active**·非 stack

### 5.2·新文件·`tm-keju-reformer-bio.js` (~250 行)

```
- §0·gate·_isL12Enabled
- §1·_kjpL12LlmReformerBio(name, reforms, scenario)·LLM 生 300 字 bio
- §2·_kjpL12MaybeGenBio(name)·dispatcher·cache check·LRU 30
- §3·_kjpL12CollectReformers(paradigm)·从 paradigm.history 派 unique by name·trim
- §4·_kjpL12RenderReformerList(paradigm)·DOM build
- §5·_kjpL12RenderBioPanel(name)·展开 bio 详细 + cache miss 时 loading
- §6·expose
```

### 5.3·cache·**C2/D2·改 GM. namespace**

```js
// 非 paradigm._reformerBios·改 GM·避免 save 持久化 (per-session·跨剧本 reset)
GM._kjpReformerBios = {
  '王安石': { text: '...', generatedYear: 1071, generatedAt: <ts>, faction: '改革派' },
  ...
};
// LRU 30·evict 最早 generatedAt
// reload save·GM._kjpReformerBios 不在 paradigm·不会序列化进 P save (verify)
```

**verify·GM 哪些字段被 save**·grep `_kjpReformerBios` 必非 P save target — 默 GM. 临时字段·不入 P.* save chain。**doc·留 RAA 时实测**

### 5.4·LLM prompt 草案·**D5 fix**

```js
function buildBioPrompt(name, reforms, scenario) {
  var emperorName = (scenario && scenario.emperor) || (P.playerInfo && P.playerInfo.characterName) || '陛下';
  var isPlayerEmperor = (name === '陛下' || name === emperorName);
  var nameLabel = isPlayerEmperor
    ? (emperorName + ' (当朝你方·主导)')
    : name;
  var reformLines = reforms.map(function(r) {
    return '- ' + (r.canonicalName || r.magnitudeDescriptor) +
           ' (' + r.year + ')·radical ' + (r.magnitudeParsed?.radical || '?') +
           '·method ' + r.method;
  }).join('\n');
  return '【人名】' + nameLabel + '·' + (scenario.era || '') + '·' +
         (reforms[0]?.year || '') + '\n' +
         '【主导改革】\n' + reformLines + '\n\n' +
         '请按真历史 + 改革数据·写 300 字 reformer 传记 (古文体)·\n' +
         '- 头·人名·字号·籍贯 (若识·虚构合理)\n' +
         '- 中·主导改革列表 + 改革立场\n' +
         '- 尾·后世评 (持中)\n' +
         '- 若 "当朝你方"·尾"今上之政·百年后未定" 之类\n\n' +
         '返 JSON·{text, birthYear, deathYear, faction}';
}
```

### 5.5·cost

- 一 bio·~600-1000 token·一剧本 ~5-10 unique reformer·~5-10 LLM calls·~5k token / 剧本
- user 主动 click·zero auto·LRU 30·**纯 per-session cache·跨剧本不持**

---

## 6·新文件 + 改动文件

### 6.1·`tm-keju-reformer-bio.js`·**新** (~250 行)

§0-§6·见 §5.2

### 6.2·`tm-keju-paradigm-panel.js`·**改** (~200 行)

| 改 | 内容 | 行 |
|---|---|---|
| `_kjpOpenL8ChronicleModal` | 加 tabs container + initial tab 'evolution' | ~20 |
| `_kjpRenderL8ChronicleBody` | tab switch·route to 3 sub-render | ~10 |
| `_kjpRenderL12TimelineTab` | 新·timeline + overflow-x | ~70 |
| `_kjpRenderL12ReformerTab` | 新·reformer list + bio inline panel | ~40 |
| `_kjpL12CollectReformImpactSummary` | 新·按 reform 算 summary | ~50 |
| `_kjpL12RenderImpactSummary` | 新·折叠 panel + 折叠 click handler | ~25 |

### 6.3·`tm-keju-paradigm-panel.css`·**改** (~80 行)

- `.kjp-l12-tabs` + `.kjp-l12-tab-active`
- `.kjp-l12-impact-summary` + dim labels color
- `.kjp-l12-timeline` + `overflow-x: scroll` + `min-width: 600px`
- `.kjp-l12-tl-bar` + 4 status colors (含 rolled_back 斜划)
- `.kjp-l12-reformer-card` + `.kjp-l12-bio-text` + active 高亮

### 6.4·`index.html`·**改** (~1 行)

```html
<script src="tm-keju-reformer-bio.js?v=20260525-l12"></script>
```

### 6.5·smoke `scripts/smoke-l12-result-ui.js`·**新** (~45-55 case)

- §A·`_kjpL12CollectReformImpactSummary`·dimDelta Σ·subjects parse·**retired NPC 走 GM._chronicle reformId 反查**·rollback link find·8 case
- §B·timeline render·position calc·status color·rollback line·**empty history early return**·6 case
- §C·reformer collect·dedup by name·trim·按 era 排·4 case
- §D·LLM bio·prompt 含 nameLabel + reforms + emperor (D5 fix)·fallback·4 case
- §E·LRU cache·30 cap·evict oldest·**verify GM._kjpReformerBios 非 paradigm**·4 case
- §F·tab switch·initial 'evolution'·click 切·body re-render·4 case
- §G·flag gate·L12 off·tabs 不显·summary noop·3 case
- §H·red line·zero new game state·summary 全 read·verify 不写 paradigm·6 case
- §I·bio inline expand·single active·click 别张 switch·非 stack·3 case

---

## 7·实施序·**~13-16 h ~ 1.6-2.0 d**

| step | 内容 | est |
|---|---|---|
| a | `tm-keju-reformer-bio.js` §0-§3·LLM + cache (GM. namespace) + collect | 3-4h |
| b | panel.js·tabs 框架·tab switch·`_kjpRenderL8ChronicleBody` route | 2h |
| c | panel.js·`_kjpRenderL12TimelineTab` + scroll-x + `_kjpL12RenderImpactSummary` | 4-5h |
| d | panel.js·`_kjpRenderL12ReformerTab` + inline bio (single active) | 2-3h |
| e | CSS + index.html | 1h |
| f | smoke 45-55 case + 全 regression | 1-1.5h |
| **total** | | **13-16.5 h ~ 1.6-2.0 d** |

---

## 8·red line check

| red line | 适应 |
|---|---|
| 复用 first | net-new 1 文件 + ~200 panel.js·rest 全 piggyback L8 modal |
| **zero 新 paradigm 字段** | **bio cache → GM._kjpReformerBios** (per-session·非 paradigm·非 save 持久) |
| 失败禁玄幻 | LLM bio fail → fallback "(无 LLM·X 朝改革家)" |
| 工具 vs 系统 | viewer·zero cost·非系统型 |
| flag gate | useNewKejuL12 默认 off |
| 邸报中文 | bio + summary 全中文 |
| LLM cost 控 | user click 触发·LRU 30·~5-10 call / 剧本 |
| audit-first | v1 → audit → v2·6 项 fix |
| **retired NPC find** | **走 GM._chronicle reformId 反查·非 string grep** (B1) |
| **timeline scroll-x** | overflow + min-width per bar·避长 span 不可读 (A3+B6) |

---

## 9·待 user 拍板·候选问题

| Q | 内容 | default |
|---|---|---|
| Q1 | bio 跨剧本持久 | **否** (per-session·改 GM. namespace) |
| Q2 | timeline 含 'rejected' | **否** (只显 applied) |
| Q3 | bio 触发 | **click** (避 auto) |
| Q4 | bio prompt 真历史 hint | **是** (LLM 自识) |
| Q5 | summary chars loyalty chart | **否** (L-C 时再加) |
| **Q6** | **v2 新** | bio cache 改 `GM._kjpReformerBios` 还是改 paradigm + bump version | **GM.** (非 paradigm·避 save) |
| **Q7** | **v2 新** | retired NPC 找·走 GM._chronicle reformId 反查 OK | **是** (已 verify reformId 存在) |

---

## 10·post-L12·L-B 全完工·next

- L-B (L8-L12) 完成·全 sprint 双轮 audit·~40 项 BUG fix 全 ship-ready
- **next**·user 拍·ship 1.2.6.5 + GitHub push

---

## 11·v2 ready 验

- ✅ 6 项 audit fix 全入 doc
- ✅ B1 retired NPC chronicle 反查·真路径
- ✅ C2/D2 bio cache 改 GM. namespace·解持久矛盾
- ✅ A3+B6 timeline scroll-x + min-width
- ✅ A5 bio inline single active
- ✅ B5 empty history early return
- ✅ D5 emperor bio prompt fix
- ✅ 7 决定全列·default 全推荐
- ✅ red line 10 项·全合规

**v2 ship readiness·等 implement**
