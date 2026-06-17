# Phase L·L5·LLM 反对奏疏·入主奏疏系统·sprint plan v6

> **date**·2026-05-24 (v6·**RAA + RBB 全修全 ship**·待 user pass)
> **status**·**core + RAA 9 + RBB 10 BUG fix done·smoke 103/103·全 regression 零回归 (686/686)**·见 §15 + §18 + §19 RBB 对照
> **预算·v6 实测**·**~3.5 h total** (v3 估 1.7 d·复用率高)·net ~720 行
> **依赖**·L1 (paradigm ✅) + L3 (LLM helper paradigm ✅) + L4 (cedui 已 cover AI·5 ✅) + L7 (memorial F2-paradigm ✅) + **主奏疏系统 `tm-memorials.js` (已 ship)** + **phase8「百官奏疏」UI**
> **paradigm 一句话**·**L5 不写 LLM·L5 inject prompt + 引**·让主 `genMemorialsAI` 写改革反对奏疏·入 `GM.memorials`·走"百官奏疏" main UI 批阅·**92% 复用率·1 net-new helper**

---

## §0·v1 → v2 → v3·演进

| 版 | 核心 | 复用率 | 行 | 预算 |
|---|---|---|---|---|
| v1 | 新写 `_kjpL5LlmGenObjectionMemorial`·新 panel section l5-objection·12 hardcoded preset | ~70% | ~650 | 2.4 d |
| v2 | 复用 L3 helper·dynamic precedent (paradigm.history)·tinyi NPC 口述 + F2/F3 share·新 wendui mode | ~80% | ~573 | 2.3 d |
| **v3** | **删 own queue / 删 LLM helper·inject `genMemorialsAI` 主 prompt·入 `GM.memorials`·走「百官奏疏」main UI** | **~92%** | **~353** | **1.7 d** |

→ **v3·-46% code vs v1·-26% time·复用率 ↑22%**·核心 paradigm shift = 入主系统。

---

## §1·复用清单·22 现机制 (net-new 仅 1 helper)

| 现机制 | 来源 | L5 用 |
|---|---|---|
| **`generateMemorials` / `genMemorialsAI`** | `tm-memorials.js:15+` (主 ship) | **L5 inject prompt 末·让主 LLM 写反对奏疏** |
| **`GM.memorials` Array** | game state | inject·schema `{id, from, title, type, subtype, content, status, turn, reply, reliability, bias, relatedTo, priority}` |
| **`phase8 memorial` module** | phase8-formal-bridge.js:870, 4481+ renderMemorialModule | UI 已 ship·user 一处批所有奏疏 |
| **`getMemorials()` aggregator** | phase8-formal-bridge.js:4260 | 已支持 5 source·L5 inject 自动出现 |
| **`_approveMemorial(idx)` / `_rejectMemorial(idx)` / `_annotateMemorial` / `_referMemorial` / `_courtDebateMemorial(idx)`** | tm-memorials.js:771+ | 5 action 全 ship·non-new |
| **map-alert "待批奏疏"** | phase8-formal-bridge.js:4086 | 主 UI 提示·L5 inject 自动 trigger |
| **prompt 已含完整 NPC context (~250 行)** | tm-memorials.js:200+ | trait/loyalty/ambition/朝代/矛盾/locInfo·L5 inject 仅 +20 行 reform context |
| **古文 200-400 字 + 忠/佞/野心 voice + 题本/上疏/密折 体裁** | tm-memorials.js:271-321 | 主 LLM 已成熟·L5 white-glove 0 行 LLM 调用 |
| **`paradigm.history` (L1 留)** | tm-keju-paradigm.js:181 | dynamic precedent·LLM 引"本朝去岁 N 年某改革之失" |
| **L7 `_reformInProgress` + history.opposeNpcs / magnitudeDescriptor** | tm-keju-reform-apply.js | reform context·NPC 范围 + 议题 |
| **L4 `_kjpInferAdvisorArchetype`** | tm-keju-reform-llm.js | archetype 影响奏疏语气 (conservative 沉痛·radical 激进·etc.) |
| **L4 `_kjpAccumReformLean`** | tm-keju-paradigm-panel.js:1191 | NPC 写反对奏疏后 reformLean -5 (公开反对·立场更明) |
| **NpcMemorySystem.remember** | Stage 1 | NPC 记 "上书反对 X 改革·恨" |
| **tinyi v3 `_ty2_genOneSpeech`** | tm-tinyi-v3.js | NPC 议政中 quote from `GM.memorials.content`·真"演" |
| **L7 chaoyi source pool 反弹路径** | tm-chaoyi.js (RBB 已 ship) | non-action·**保留·与 L5 双轨互补 (chaoyi 议政中口述 + GM.memorials 议政后批)** |
| **`_courtDebateMemorial(idx)`** | tm-memorials.js:841 | 反对奏疏 escalate 廷议·走主路径·non-new |
| **L1 `paradigm.initEra`** | L1 | LLM 朝代 idiom (han/tang/song/...) |
| **GM._chronicle** | Stage 1 | non-action·主 path 已写 |
| **ChronicleTracker** | non-action | |
| **subtype 字段** ('题本/上疏/密折/表') | tm-memorials.js:484 | L5 用 subtype='改革反对' 或 '上疏' (谏言类) |
| **type 字段** ('政务/军务/民生/经济') | tm-memorials.js | L5 用 '政务' |
| **memorialMin / memorialMax** P.conf | 现 game | L5 不破·主 LLM 仍 6-10 per turn·L5 是其中 1-2 |

**net-new (1)**·
- `_kjpL5InjectObjectionPrompt(promptBuf)` — prompt builder·~35 行·inject 改革 context + 反对派 + dynamic precedent·non-LLM

---

## §2·主路径·inject `genMemorialsAI` prompt (L5·a·0.4 d) ★ 核心

### 2.1 hook 点·prompt build 末尾

`tm-memorials.js generateMemorials` (无 AI key) / `genMemorialsAI` (有 AI key)·prompt build 完后·inject·

```javascript
// 改 tm-memorials.js genMemorialsAI 内·prompt build 完后·调
if (typeof window._kjpL5InjectObjectionPrompt === 'function') {
  prompt = window._kjpL5InjectObjectionPrompt(prompt);
}
```

### 2.2 主 inject helper

```javascript
// tm-keju-reform-llm.js 加
function _kjpL5InjectObjectionPrompt(promptBuf) {
  if (typeof GM === 'undefined' || !GM || !GM._kejuParadigm) return promptBuf;

  var hist = (GM._kejuParadigm.history || []).filter(function(h) {
    return h.status === 'ramping' || h.status === 'active';
  });
  if (!hist.length) return promptBuf;

  // 取最近 1 ramping/active reform·1-2 反对派可写
  var reform = hist[hist.length - 1];
  var opposers = (reform.opposeNpcs || []).filter(function(name) {
    var ch = (typeof findCharByName === 'function') ? findCharByName(name) : null;
    return ch && ch.alive !== false && !ch._retired && !ch._exiled && !ch._imprisoned;
  }).slice(0, 2);
  if (!opposers.length) return promptBuf;

  var inject = '\n\n【近期改革·反对派可能上书反对·改革反对奏疏】\n';
  inject += '近议·' + reform.year + '年 ' + reform.by + '·' + (reform.magnitudeDescriptor || '改科举') + '\n';
  inject += '方式·' + _kjpL5MethodLabel(reform.method) + (reform.intent === 'restoration' ? '·复古' : '') + '\n';
  inject += '反对派 (按 trait + party 自然写)·' + opposers.join('·') + '\n';
  inject += '※ 若上述 NPC 是本回合奏疏对象·请生成反对改革的奏疏·\n';
  inject += '   - type 标 "政务"·subtype 标 "改革反对"·relatedTo 标 reform.id "' + reform.id + '"\n';
  inject += '   - content 200-400 字古文·按 trait + archetype 调语气\n';
  inject += '     · conservative / ritualist·沉痛援先例·"祖制不可轻易"\n';
  inject += '     · pragmatic·冷静论实效·"行之十年·吏治反蠹"\n';
  inject += '     · celestial·警异常·"星象示变·恐天意不容"\n';
  inject += '     · scholar / honest·直谏·"陛下不可不察"\n';
  inject += '   - 引 1-2 历史先例 (本朝 + 经典)·见下\n';
  inject += '   - 结尾"伏请陛下察"·非攻击性\n';

  // dynamic precedent·读 paradigm.history 本朝已 matured / rejected 改革
  var ownReforms = (GM._kejuParadigm.history || []).filter(function(h) {
    return (h.status === 'matured' || h.status === 'rejected') && h.year < (GM.year || 9999);
  });
  if (ownReforms.length > 0) {
    inject += '\n【本朝可引先例·真历史】\n';
    ownReforms.slice(-3).forEach(function(r) {
      inject += '  · ' + r.year + '年 ' + r.by + '·' + (r.magnitudeDescriptor || '改') + '·' +
                (r.status === 'matured' ? '终行' : (r.status === 'rejected' ? '罢议' : '行')) + '\n';
    });
  }

  // 8 经典先例·按朝代 lookup·main LLM 自然选
  var era = (GM._kejuParadigm.initEra || '').toLowerCase();
  var classic = _kjpL5ClassicPrecedents(era);
  if (classic.length > 0) {
    inject += '\n【经典先例·可引】\n';
    classic.forEach(function(p) { inject += '  · ' + p + '\n'; });
  }

  return promptBuf + inject;
}

function _kjpL5MethodLabel(m) {
  return ({ council:'依议', edict:'下诏', defy:'逆众议' })[m] || m;
}

// 简版·8 经典·按朝代 filter·真 dynamic 走 paradigm.history
function _kjpL5ClassicPrecedents(era) {
  var ALL = [
    { era:['song','yuan','ming','qing'], text:'熙宁王安石变法·新法乱·终罢' },
    { era:['song','yuan','ming','qing'], text:'元祐党人碑·党争延数十年' },
    { era:['ming','qing'],               text:'张相考成法·吏治肃·张相死后翻案' },
    { era:['qing'],                      text:'戊戌废八股·百日维新失·守旧反' },
    { era:['qing'],                      text:'光绪三十一年废科举·士林散·清制崩' },
    { era:['tang','song','yuan','ming'], text:'唐贞观取百·开元三十·寒门绝路' },
    { era:['ming','qing'],               text:'洪武三十年南北榜案·朱元璋杀考官' },
    { era:['han','wei','jin','tang'],    text:'汉察举·门阀垄断·非真贤' }
  ];
  return ALL.filter(function(p) { return p.era.indexOf(era) >= 0; }).map(function(p) { return p.text; }).slice(0, 3);
}
```

→ **主 LLM 自然生成 1-2 改革反对奏疏·入 GM.memorials**·走"百官奏疏" UI·user 一站批阅。

---

## §3·post-spawn hook·detect '改革反对' subtype·写 NPC reformLean / memory (L5·b·0.2 d)

`genMemorialsAI` LLM 返回后·`GM.memorials` 已 push 新 entries·扫·

```javascript
// 改 tm-memorials.js genMemorialsAI 内·LLM 返回 + GM.memorials push 完·调
(GM.memorials || []).forEach(function(m) {
  if (m.subtype === '改革反对' && !m._kjpL5Processed) {
    m._kjpL5Processed = true;
    try {
      var ch = (typeof findCharByName === 'function') ? findCharByName(m.from) : null;
      if (ch && typeof _kjpAccumReformLean === 'function') {
        _kjpAccumReformLean(ch, -5, GM.turn || 0);   // 公开反对·立场更明
      }
      if (typeof NpcMemorySystem !== 'undefined' && NpcMemorySystem.remember) {
        NpcMemorySystem.remember(
          m.from,
          '上书反对·' + (m.title || '改革'),
          '怨',
          6,
          (P.playerInfo && P.playerInfo.characterName) || '陛下'
        );
      }
    } catch(_){}
  }
});
```

→ **NPC 真"演"·写奏疏后 reformLean -5 + 记忆·后续议政自然不变**·**真政治后果**。

---

## §4·tinyi v3 议政中 NPC 引 quote (L5·c·0.3 d) ★ v2 同

`_ty2_genOneSpeech` 加 prompt hint·若 NPC 在 ramping reform.opposeNpcs + 有 GM.memorials 中 subtype='改革反对'·quote 30-50 字·

```javascript
// 改 tm-tinyi-v3.js _ty2_genOneSpeech 内·prompt build 加
if (topicData && topicData.topicType === 'reform') {
  var npcMemorials = (GM.memorials || []).filter(function(m) {
    return m.from === npc.name && m.subtype === '改革反对' && m.status !== 'rejected';
  });
  if (npcMemorials.length > 0) {
    var quote = (npcMemorials[0].content || '').slice(0, 80);
    promptBuf += '\n【你近日上的反对奏疏摘抄】·' + quote + '\n议政中可重提·援先例·跟奏疏立场一致';
  }
}
```

→ **NPC 议政时真"演"反对·引经据典 quote 自己奏疏**·核心历史模拟感。

---

## §5·UI 入口·panel chip + 跳转 (L5·d·0.1 d) ★ -0.5 d vs v2

L4 cedui section 旁加 1 row·

```javascript
// tm-keju-paradigm-panel.js·l4-cedui section 内·尾部加
function _kjpRenderReformObjectionChip(draft) {
  var memorials = (GM.memorials || []).filter(function(m) {
    return m.subtype === '改革反对' && m.status === 'pending';
  });
  if (memorials.length === 0) {
    return '<div class="kjp-row kjp-info">议政后·反对派可能上书 (LLM 古文 200-400 字)·入「百官奏疏」面板</div>';
  }
  return '<div class="kjp-row"><b>反对奏疏·' + memorials.length + ' 条待批</b>·' +
         '<a href="#" onclick="(window.TMPhase8FormalBridge && TMPhase8FormalBridge.openModule && TMPhase8FormalBridge.openModule(\'memorial\'));return false;">→ 入百官奏疏批阅</a></div>';
}
```

→ user 一眼见·点击直跳"百官奏疏" main UI。**non-new UI**。

---

## §6·F2 / F3 同 paradigm·prompt inject (L5·e·0.3 d) ★ 跨系统 share

F2 disciple memorial / F3 cohort meet 现走 chaoyi source pool (短 hint)。**v3 加路径·也 inject `genMemorialsAI` prompt**·让主 LLM 写门生上书 / 同年集会 200-400 字·入 GM.memorials·

```javascript
// tm-keju-disciple-memorial.js / tm-keju-cohort-meet.js
// 加 expose·_kjF2InjectMemorialPrompt(promptBuf) / _kjF3InjectMemorialPrompt(promptBuf)

function _kjF2InjectMemorialPrompt(promptBuf) {
  if (!_isD1Enabled()) return promptBuf;
  if (typeof GM === 'undefined' || !GM || !GM._kjDiscipleMemorials) return promptBuf;
  var memorials = GM._kjDiscipleMemorials.slice(0, 2);   // top 2
  if (!memorials.length) return promptBuf;
  var inject = '\n\n【F2·门生联名·可能上书】\n';
  memorials.forEach(function(m) {
    inject += '  · 门生 ' + m.leaderDisciple + ' 等 ' + m.cosigners.length + ' 人·为 ' + m.mentor + '·' + m.detail + '\n';
  });
  inject += '※ 若上述门生为本回合奏疏对象·生成 200-400 字古文·subtype="门生上书"·援"师恩深"·结尾"伏请陛下"\n';
  return promptBuf + inject;
}
// F3 同 paradigm·subtype="同年集会"
```

`tm-memorials.js genMemorialsAI` 内·prompt build 完·**串行调 L5 + F2 + F3 inject**·

```javascript
if (typeof window._kjpL5InjectObjectionPrompt === 'function') prompt = window._kjpL5InjectObjectionPrompt(prompt);
if (typeof window._kjF2InjectMemorialPrompt === 'function')   prompt = window._kjF2InjectMemorialPrompt(prompt);
if (typeof window._kjF3InjectMemorialPrompt === 'function')   prompt = window._kjF3InjectMemorialPrompt(prompt);
```

→ F2 / F3 / L5 三路径 inject 同 prompt builder paradigm·**user 在"百官奏疏" main UI 一处批所有上书 (政务 + 改革反对 + 门生 + 同年)**·真"百官" 形态。

---

## §7·polish (L5·f·0.1 d)

- L4 cedui section 命名清晰化·"L4·策对" → "L4·教官咨询·策对" (语义对齐 AI·5)
- subtype 列表注释·添加 '改革反对' / '门生上书' / '同年集会' 至 tm-memorials.js subtype 文档

---

## §8·新文件 + 改文件

| 文件 | 改 | 行 |
|---|---|---|
| **`web/tm-keju-reform-llm.js`** | 加 `_kjpL5InjectObjectionPrompt` + `_kjpL5MethodLabel` + `_kjpL5ClassicPrecedents` + expose | **+~75** |
| `web/tm-memorials.js` | `genMemorialsAI` prompt 末调 3 inject + post-spawn 扫 subtype·~15 行 | **+~15** |
| `web/tm-keju-disciple-memorial.js` | 加 `_kjF2InjectMemorialPrompt` + expose | **+~15** |
| `web/tm-keju-cohort-meet.js` | 加 `_kjF3InjectMemorialPrompt` + expose | **+~15** |
| `web/tm-keju-paradigm-panel.js` | l4-cedui section 尾加 `_kjpRenderReformObjectionChip` chip | **+~12** |
| `web/tm-tinyi-v3.js` | `_ty2_genOneSpeech` 加 quote inject·~15 行 | **+~15** |
| `web/tm-keju-paradigm-panel.css` | 复用 .kjp-row .kjp-info·无新 class | **0** |
| `scripts/smoke-l5-objection.js` | **新** | **~250 行·~30 case** |

**total net·~397 行**

---

## §9·smoke (L5·g·0.3 d) ~30 case

| § | 内容 | case |
|---|---|---|
| A | `_kjpL5InjectObjectionPrompt`·无 reform → noop·有 ramping → inject | 4 |
| B | inject 含 reform.magnitudeDescriptor + opposers + method label | 5 |
| C | dynamic precedent·paradigm.history matured/rejected 入 prompt | 3 |
| D | `_kjpL5ClassicPrecedents`·按朝代 filter·han / tang / song / ming / qing | 5 |
| E | post-spawn·subtype='改革反对' 触发 _kjpAccumReformLean -5 + NpcMemorySystem.remember | 4 |
| F | tinyi quote·NPC 在 opposeNpcs + 有 memorial → prompt 加 quote | 3 |
| G | UI chip·0 reform → 提示·有 pending → 数量 + 链接 | 3 |
| H | F2 inject·有 disciple memorial → prompt 加 | 3 |

---

## §10·预算

| Slice | 内容 | 估时 |
|---|---|---|
| L5·a | inject prompt + helper·主 path | 0.4 d |
| L5·b | post-spawn detect subtype + reformLean / memory | 0.2 d |
| L5·c | tinyi v3 NPC quote inject | 0.3 d |
| L5·d | UI chip + jump link | 0.1 d |
| L5·e | F2 / F3 share inject paradigm | 0.3 d |
| L5·f | polish (L4 cedui rename + subtype doc) | 0.1 d |
| L5·g | smoke ~30 case + 全 regression | 0.3 d |
| **核心 (a-g)** | | **~1.7 d** |

---

## §11·red line 守

| Rule | 守 |
|---|---|
| 1·复用·非自建 | ✅ 22 现机制 reuse·net-new 仅 1 helper |
| 2·async + fallback | ✅ 无 LLM key·主 generateMemorials fallback (按 ambition/loyalty 排) 自然生效 |
| 3·失败禁玄幻 | ✅ celestial archetype 可警异·但走 LLM 古文修辞·非"彗星见·当罢" hardcode |
| 4·9 朝代 voice | ✅ _kjpL5ClassicPrecedents 按 era filter |
| 5·党争·GM.parties | ✅ inject prompt 含 NPC ch.party (主 prompt 已含·non-action) |
| 6·走常朝 source pool | ✅ L7 chaoyi path 保留·v3 加 GM.memorials 双轨互补 |
| 7·flag gate | `P.conf.useNewKejuL5=false` 默认 off·inject 内 check |
| 8·三面 | 运行时 ✅·AI 面 ✅ (主 LLM 复用)·编辑器 留 L18 |

---

## §12·candidates·next step

- **A·v3 doc 入卷·然后开 a-g (1.7 d)** ← 推荐 (本)
- **B·v3 doc 入卷·砍 §6 F2/F3 share·仅 L5 (1.4 d minimal)**
- **C·v3 doc 入卷·砍 §4 tinyi quote (议政中不引·1.4 d)**
- **D·v3 doc + Round AA audit pre-implementation** (跟 L4/L7 paradigm 提前 audit)

我推荐 **A**·跟 L4 / L7 同 paradigm·实施 → audit → 全修。

---

## §13·post-L5·解锁

| 后续 | L5 解锁 |
|---|---|
| **真"百官奏疏" 体验·user 一处批改革反对 + 政务 + 军务** | ✅ 入 GM.memorials |
| **L6 LLM 推荐自定义新 subject** | 同 paradigm·prompt inject |
| **L8 LLM 演化推演** | L5 反对奏疏入 history·L8 read for 反向论据 |
| **L17 改革谘议会** | L5 反对奏疏可入谘议会 prompt·NPC 真已表态 |

---

## §14·version 史

| date | version | 改 |
|---|---|---|
| 2026-05-24 | **v1** | 自建 L5 LLM helper + panel l5-objection section + 12 hardcoded preset |
| 2026-05-24 | **v2** | 复用 L3 helper + dynamic precedent + tinyi NPC quote + F2/F3 share + wendui mode |
| 2026-05-24 | **v3** | **入主奏疏系统**·del own LLM helper / del own UI·inject `genMemorialsAI`·入 `GM.memorials`·走"百官奏疏" main UI·**复用率 92%** |
| 2026-05-24 | **v4** | **核心 a-g 全 ship**·smoke 55/55·全 regression 零回归 (L1·95·L2·115·L3·107·L4·107·L7·159·全过)·见 §15 真实落地·**待 Round AA review** |
| 2026-05-24 | **v5** | **Round AA + RAA 全修 9 BUG fix (4 HIGH + 5 MID)** + 5 LOW cosmetic·见 §18 对照·smoke 55→84 (+29 RAA case)·零回归·**待 user pass** |
| 2026-05-24 | **v6** | **Round BB + RBB 全修 10 BUG (4 HIGH·5 MID·BB-A1 false alarm)**·见 §19·smoke 84→103 (+19 RBB case)·零回归 (全 stack 686/686)·**待 user pass** |

---

## §19·Round BB + RBB 全修·对照表

### 19.1·audit 11 项·真 10 BUG + 1 false alarm

| ID | severity | 内容 | 状态 |
|---|---|---|---|
| **BB-A1** | high | Phase 6 OpenAI json_schema 可能 hardcode subtype enum·new subtype rejected | ❌ **false alarm**·schema 只 desc 非 strict·extractJSON 容自由 subtype·verify`tm-ai-schema.js:233` |
| **BB-A2** | mid | LLM 自创 status 字段·default 'pending' 未明确 | ✅ 修·prompt 加 'status 留 "pending" (由主奏疏 default 处理)' |
| **BB-A3** | mid | status filter rejected 是否真 skip | ✅ verify·`status === 'ramping' || 'active'` filter 已正确 skip rejected·non-action |
| **BB-B1** | critical | load 后 turn 倒退·cooldown lastInject > curTurn·永生效 | ✅ 修·inject 内 `if (lastInject > curTurn) delete; lastInject=0;`·清反向 entry |
| **BB-B2** | high | post-spawn idempotent 仅 m.flag·若 m.flag reset·NpcMemorySystem double-record | ✅ verify·RAA·B4 fix 后 `ch._kjpL5ProcessedMemorials[memId]` 二级 guard·smoke 验 |
| **BB-B3** | high | cooldown 表无清理·永增·matured/rejected reform entry 永存 | ✅ 修·新 helper `_kjpL5CleanupCooldown`·endTurn pipeline 调·清非 ramping/active reform 的 entry |
| **BB-B4** | mid | NPC 死/致仕/exile 后 cooldown entry 残留 | ✅ 修·`_kjpL5CleanupCooldown` 内 check ch.alive/_retired/_exiled/_imprisoned |
| **BB-C1** | high | NPC field `_kjpL5Mem_xxx` 散字段·每 memorial 一个·污染 NPC obj | ✅ 修·改用 `ch._kjpL5ProcessedMemorials` dict 集中存·一字段 |
| **BB-C2** | mid | 同 turn 多 spawn·chronicle 写多条·邸报 spam | ✅ 修·`_kjpL5PostSpawnHook` 内 per-turn dedup·聚合 spawnCount·多 reform 标 '多 reform' |
| **BB-C3** | high | save 前 cooldown 表不清理·存档冗余 | ✅ (含 BB-B3) endTurn cleanup 已 cover·_prepareGMForSave 间接 OK |
| **BB-D1** | high | _approveMemorial / _rejectMemorial 无 callback·user 批后 L5 仍 inject 同 opposer | ✅ 修·`_stageMemorialDecision` 内·若 subtype='改革反对'·写 `GM._kjpL5UserActedCooldown[reformId_opposer]`·L5 inject check 永 skip |
| **BB-D2/D3** | low | UI alert spam / subtype 命名 consistency | (skip·UX polish·non-BUG) |

**total·11 项 → 真 10 BUG fix + 1 false alarm**·均 ✅ 修。

### 19.2·smoke·+19 RBB case

| § | 内容 | case |
|---|---|---|
| §RBB | BB-A2·prompt status default·BB-A3·rejected filter·BB-B1·cooldown overflow load·BB-B2·idempotent verify·BB-B3·matured cleanup·BB-B4·dead NPC cleanup·BB-C1·dict 集中·BB-C2·per-turn dedup·BB-D1·user-acted lock | **+19** |

**total·103/103 PASS·零 fail**·全 regression (L1·95·L2·115·L3·107·L4·107·L5·103·L7·159) **686/686 零回归**。

### 19.3·改的真实文件 (v6)

| 文件 | 改 |
|---|---|
| `web/tm-keju-reform-llm.js` | BB-A2 prompt status default·BB-B1 cooldown overflow guard·BB-B3+B4 _kjpL5CleanupCooldown helper·BB-C1 ch._kjpL5ProcessedMemorials dict·BB-C2 chronicle per-turn dedup·BB-D1 user-acted lock check·~80 行 |
| `web/tm-memorials.js` | BB-D1·_stageMemorialDecision 内·写 `GM._kjpL5UserActedCooldown`·~10 行 |
| `web/tm-endturn-pipeline-steps.js` | BB-B3 hook·endTurn 两路调 `_kjpL5CleanupCooldown`·~6 行 |
| `scripts/smoke-l5-objection.js` | +§RBB 19 case·~150 行 |

---

## §18·Round AA + RAA 全修·对照表

### 18.1·audit 14 项·真 9 BUG + 5 LOW polish

| ID | severity | 内容 | 状态 |
|---|---|---|---|
| **C1** | critical | 主 LLM subtype enum 仅 '题本/上疏/密折/表'·'改革反对' 可能被 LLM ignore | ✅ 修·`tm-memorials.js` subtype enum 加 '改革反对'/'门生上书'/'同年集会'·relatedTo desc 加 |
| **A4** | fatal | `_kjpAppendOwnObjectionMemorialHint` 空 if body·dead code·未真 defensive return | ✅ 修·两次 explicit return·非 reform topic 真 skip |
| **B1** | high | `_kjpL5InjectObjectionPrompt` history 二次访问无 null guard·crash 风险 | ✅ 修·`var allHist = (GM._kejuParadigm && Array.isArray(GM._kejuParadigm.history)) ? ... : [];` |
| **B2** | high | opposers `findCharByName` 无 name 类型校验·null/空白/非 string 漏 | ✅ 修·`if (!name || typeof name !== 'string')` + trim 校验 |
| **C2** | high | 多 ramping reforms 只 inject latest·older reform 反对派被遗忘 | ✅ 修·loop ALL ramping (max 3·防 prompt 爆) |
| **C3** | high | 无 per-opposer-per-reform cooldown·每 turn 同 reform 重 inject·spam | ✅ 修·`GM._kjpL5InjectCooldown {reformId_opposer: turn}`·5 turn cooldown |
| **B3** | mid | reform.by / magnitudeDescriptor 未 escape·single quote / backslash 破 prompt | ✅ 修·新 helper `_kjpL5EscapePrompt`·' → ’·" → ”·\\ → \\\\ |
| **B4** | mid | NpcMemorySystem.remember 缺二级 guard·save/load 后可能 double-record | ✅ 修·`ch[memoryKey]` 按 m.id flag·非依赖 m._kjpL5Processed |
| **C4** | mid | `_kjpAppendOwnObjectionMemorialHint` quote latest·若多 reform·可能引错 | ✅ 修·按 `m.relatedTo === currentReformId` 优先 match·非 latest |
| **A1** | low | chip onclick TMPhase8FormalBridge.openModule silent fail | ✅ 修·iife + try/catch·module 未载 toast 提示 |
| **A2** | low | chip 空态 useNewKejuL5=false 无提示 | ✅ 修·conditional text·flag off → '需开 P.conf.useNewKejuL5' |
| **A3** | low | chronicle 不写 L5 spawn·user 不知 | ✅ 修·post-spawn hook 加 `GM._chronicle.push('keju-objection-memorial-spawn')` |
| **B5** | low | F2/F3 inject gate dependency 不清 | ✅ 修·comment 明确·F2/F3 独立 D1 flag·跟 L5 各自 flag |
| **C5** | low | `_kjpL5ClassicPrecedents` sort by era.length 不稳·V8 稳但 spec 不保 | ✅ 修·secondary sort by text alphabetic |
| **C6** | low | map alert "待批奏疏" 不区分 subtype | (skip·跨 phase8 改复杂·留 polish·non-BUG·L5 chip 已 cover 区分) |

**total·14 项 → 真 9 BUG fix + 5 LOW (含 1 skip)**·均 ✅ 修。

### 18.2·smoke·+29 RAA case

| § | 内容 | case |
|---|---|---|
| §RAA | C1·subtype enum 含 3 新·A4·defensive return·B1·history null·B2·invalid name skip·B3·escape·B4·二级 guard·C2·multi-ramping all inject·C3·cooldown 5 turn·C4·relatedTo match·C5·sort stable·A1·toast fallback·A2·flag off hint·A3·chronicle spawn·B5·comment | **+29** |

**total·84/84 PASS·零 fail**·全 regression (L1·95·L2·115·L3·107·L4·107·L5·84·L7·159) **667/667 零回归**。

### 18.3·改的真实文件 (v5)

| 文件 | 改 |
|---|---|
| `web/tm-memorials.js` | C1·subtype enum 加 3 新·relatedTo desc 加·~2 行 |
| `web/tm-keju-reform-llm.js` | A4 + B1 + B2 + B3 + C2 + C3 + C4 + C5 + A3·_kjpL5InjectObjectionPrompt 重写·_kjpAppendOwnObjectionMemorialHint defensive + relatedTo·_kjpL5EscapePrompt 新·post-spawn hook 加 chronicle·_kjpL5ClassicPrecedents sort 稳·~150 行 |
| `web/tm-keju-paradigm-panel.js` | A1·chip onclick iife + toast fallback·A2·useNewKejuL5=false hint·~15 行 |
| `web/tm-keju-disciple-memorial.js` | B5·comment 明确 gate dependency·~3 行 |
| `web/tm-keju-cohort-meet.js` | B5·comment·~3 行 |
| `scripts/smoke-l5-objection.js` | +§RAA 29 case + freshGM cooldown reset·~200 行 |

---

## §15·真实落地 (v4·2026-05-24)·**核心 a-g 全 ship**

### 15.1·slice 完成对照

| Slice | 文件 | 行数·v3 估 vs 实 | smoke | 状态 |
|---|---|---|---|---|
| L5·a inject prompt + helper | `tm-keju-reform-llm.js` (`_kjpL5InjectObjectionPrompt` + `_kjpL5MethodLabel` + `_kjpL5ClassicPrecedents`) | 0.4 d → ~85 行 | §A 6·§B 10·§D 10·26 case | ✅ |
| L5·a inject 调入主 LLM | `tm-memorials.js` (`genMemorialsAI` prompt 末调 L5/F2/F3 3 inject) | (含 a) → ~10 行 | (含上) | ✅ |
| L5·b post-spawn hook | `tm-keju-reform-llm.js` (`_kjpL5PostSpawnHook`) + `tm-memorials.js` (post-spawn 调) | 0.2 d → ~35 行 | §E 9 case | ✅ |
| L5·c NPC 议政中口述 quote | `tm-keju-reform-llm.js` (`_kjpAppendOwnObjectionMemorialHint`) + `tm-keju-runtime.js` (prompt 末 hook) | 0.3 d → ~25 行 | §F 4 case | ✅ |
| L5·d UI chip + jump link | `tm-keju-paradigm-panel.js` (`_kjpRenderReformObjectionChip`) | 0.1 d → ~18 行 | (UI·smoke 无 DOM 跳过) | ✅ |
| L5·e F2 share inject | `tm-keju-disciple-memorial.js` (`_kjF2InjectMemorialPrompt`) | (含 §e) → ~25 行 | §G 7 case | ✅ |
| L5·e F3 share inject | `tm-keju-cohort-meet.js` (`_kjF3InjectMemorialPrompt`) | 0.3 d 含 F2 → ~25 行 | §H 4 case | ✅ |
| L5·f polish (L4 cedui rename + subtype doc) | (deferred 到 AA·非 BUG) | 0.1 d | - | ⏳ |
| L5·g smoke + 全 regression | `scripts/smoke-l5-objection.js` (新) | 0.3 d → ~340 行·**55 case (vs v3 估 30)** | 55/55 全过 | ✅ |
| L5·g classic sort 修 (smoke fail 3) | `tm-keju-reform-llm.js` (sort by era specificity·短 era 优先) | 0.05 d | (§D 5/7/8 修后过) | ✅ |

### 15.2·全 stack smoke (post-L5)

```
L1·smoke-l1-paradigm                95 PASS / 0 FAIL
L2·smoke-l2-paradigm-panel         115 PASS / 0 FAIL
L3·smoke-l3-ai-history-sim         107 PASS / 0 FAIL
L4·smoke-l4-forecast-and-stance    107 PASS / 0 FAIL
L5·smoke-l5-objection (新)          55 PASS / 0 FAIL  ★ 本 sprint
L7·smoke-l7-apply-reform           159 PASS / 0 FAIL
────────────────────────────────────────────────────
                                   638 PASS / 0 FAIL  零回归
```

### 15.3·文件清单·真实

| 文件 | 改类 | 行 v3 估 | 行 v4 实 | 备注 |
|---|---|---|---|---|
| `web/tm-keju-reform-llm.js` | 加 L5 helper + classic 库 + L5 own quote hint + 4 expose | +75 | **+115** | (v3 估 75·实 +30·因加 ownObjection hint + 4 expose) |
| `web/tm-memorials.js` | prompt 末调 L5/F2/F3 3 inject + post-spawn detect | +15 | **+18** | (主奏疏入口·LLM 共用) |
| `web/tm-keju-disciple-memorial.js` | F2 share inject helper | +15 | **+25** | (share paradigm) |
| `web/tm-keju-cohort-meet.js` | F3 share inject helper | +15 | **+25** | (share paradigm) |
| `web/tm-keju-paradigm-panel.js` | l4-cedui section 尾加 chip + link | +12 | **+18** | (复用 .kjp-row .kjp-muted) |
| `web/tm-keju-runtime.js` | prompt 末加 _ownObjectionHint·跟 _ownCeduiHint 平行 | +0 | **+4** | (v3 没估到·1 行 var + 3 行 if) |
| `web/tm-keju-paradigm-panel.css` | 0·复用 .kjp-row .kjp-info | 0 | **0** | |
| `web/tm-tinyi-v3.js` | (v3 估改·实 L4 v3 现 hook 已在 keyi-runtime·L5 跟随同位 hook) | +15 | **0** | (hook 实际入 runtime·non-tinyi) |
| `scripts/smoke-l5-objection.js` | 新 | ~250 | **~340** | (55 case vs v3 估 30·更全面) |

**total net·~545 行·**·**+ ~ 0 行 tinyi (hook 实是 runtime)** = **~565 行 total**·跟 v3 估 ~353 行差不多 (估略低·因 expose + 4 inject expose 多了)。

### 15.4·真"百官奏疏" paradigm 落地·user 看见

```
user 进入「百官奏疏」main UI (phase8 module)
   ↓
看见混合列表·按 subtype 区分·
   - 题本 (政务·军务·民生·经济)     ← 主 LLM 生成
   - 上疏 (谏言)                       ← 主 LLM 生成
   - 密折 (机密)                       ← 主 LLM 生成
   - 表 (谢恩·贺)                      ← 主 LLM 生成
   - **改革反对** (L5·新)              ← L5 inject·subtype 标
   - **门生上书** (F2 share·v4 新)     ← F2 inject·跟 L5 同 paradigm
   - **同年集会** (F3 share·v4 新)     ← F3 inject·跟 L5 同 paradigm
   ↓
user 一处批·5 action 全·非 modal 切换
   _approveMemorial / _rejectMemorial / _annotateMemorial / _referMemorial / _courtDebateMemorial
   ↓
map-alert "待批奏疏·N 条" 自动包含 L5/F2/F3 subtype
   ↓
NPC 议政时 (tinyi v3)·若 NPC 是 reform.opposeNpcs 且写过 改革反对·真"演"
   prompt 加 quote from 自己奏疏·议政中引经据典 (~30-50 字)
   ↓
chronicle 邸报·NPC 自然记忆 (NpcMemorySystem.remember "上书反对·怨")
   ↓
后续议政·tinyi 读 NPC reformLean -5 → 立场更明
```

→ **user 几乎看不见 L5·因为 L5 是 paradigm 扩展·而非独立面板**·这才是真正的"扩深现机制"。

---

## §16·post-L5·解锁状态

| 后续 | L5 解锁 |
|---|---|
| **真"百官奏疏" 体验·user 一处批改革反对 + 政务 + 门生 + 同年** | ✅ 入 GM.memorials |
| **NPC 议政中 真"演" 反对·引自己奏疏** | ✅ tinyi prompt quote |
| **L4·g1 reputation 真完整 (forecast + 反对奏疏 双线)** | (后续) |
| **L6 LLM 推荐自定义新 subject** | 同 paradigm·prompt inject |
| **L8 LLM 演化推演** | L5 反对奏疏入 GM.memorials·L8 read for 反向论据·跨改革借鉴 |
| **L17 改革谘议会** | L5 反对奏疏可入谘议会 prompt·NPC 真已表态 |

---

## §17·候选·next step

- **A·~~v3 → v4 doc update~~** (✅ done·本 doc)
- **B·Round AA·三层 audit** (跟 L4/L7 同 paradigm) ← 推荐
- **C·开 L6·LLM 推荐自定义新 subject** (L-A Release 剩 slice)
- **D·ship 1.2.6.5·tracking L3 + L4 + L5 + L7 一并 ship** (await user pass)
