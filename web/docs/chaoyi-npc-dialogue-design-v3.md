# 常朝 NPC 应答化·完整设计文档 v3

date·2026-05-21·status·**spec·Slice 0 后已 5 处 correction·8D 维度名 + 数值范围按真实 API 对齐·新增 §4.5 personality-text fallback (B 方案)**

替代 `chaoyi-changchao-improvements-backlog.md §3·v2` 的设计部分。本文档是 v3·v2 在背景 backlog 里留作历史参考。

**v3 → v3.1 修订点** (Slice 0 verify gate 报告后)·

- 8D 维度名·中文 → 英文 (`boldness/compassion/rationality/greed/honor/sociability/vengefulness/energy`)
- 8D 阈值·0-100 → ±0.3/0.5/0.7 (实际 trait dims ±0.1~±0.5 累加范围)
- `AffinityMap.adjust` → `AffinityMap.add(a, b, delta, reason)`
- `NpcMemorySystem.remember` object form → positional·`remember(name, text, '中文 emotion', weight, source)`
- 入口·`window.TM.NpcEngine.aggregateDims(ch)` (Slice 0 已暴露)
- 新增 §4.5·personality-text fallback (绍宋等 traitIds 为空时·从 ch.personality 字符串推 dims)

---

## 目录

1. [设计思路：从"群聊"到"廷议"的本质差异](#1)
2. [6 应答 mode 完整定义 + 朝堂语风格库](#2)
3. [6 层架构详解](#3)
4. [8D personality modulation·15 条修正表](#4)
5. [rank/class tone modulation·5 套 + 朝堂语词库](#5)
6. [anti-monotony guards·4 条](#6)
7. [NPC-NPC consequence linkage (AffinityMap)](#7)
8. [议题 tagging 系统](#8)
9. [完整流程示例·绍宋·南幸扬州议题 (6 NPC × 2 round)](#9)
10. [完整 prompt 模板渲染示例](#10)
11. [test harness·3 类测试](#11)
12. [degradation chain·4 级 fallback](#12)
13. [scope·changchao / yuqian / tinyi 分界](#13)
14. [实施步骤·9 step + 工作量重估](#14)
15. [验收标准 (DoD)](#15)
16. [边界·不做什么](#16)

---

<a id="1"></a>
## 1. 设计思路·从"群聊"到"廷议"的本质差异

**群聊**·N 个人独立陈述·各说各话·prompt 只要求"与他臣有别"。
**廷议**·N 个人有 dialogue 链·每个发言对前文有明确关系·关系决定语言模式与情感色彩。

真实廷议的语言行为·

- **附议**·"臣附李给事之议"·**复述**核心 + **补充**新证据 / 案例
- **驳斥**·"臣窃以为某御史所言未当"·先**复述对方论点 1 句** + **反驳 1-2 句**
- **缓和**·"某丞相忠悃可嘉·惟此事或可再议"·先**肯定对方动机**·再陈己见
- **转移焦点**·"诸臣所议皆当·然臣窃见尚有未论者"·提**未被讨论的侧面**
- **引经据典**·"汉光武渡江故事·臣尚记之·或可援为今鉴"·**援引先例**
- **首发**·"陛下·臣有一议"·**开题**·提主张 + 1 条理由

这 6 类是 **朝堂礼定的 dialogue 范式**·不是 LLM 自由发挥能稳定产出的。规则化推 mode → 强约束注入 prompt → LLM 在朝堂语风格库内填充内容。

---

<a id="2"></a>
## 2. 6 应答 mode 完整定义 + 朝堂语风格库

| Mode | 触发 | 内容范式 | 朝堂语开头池 | 朝堂语结句池 |
|---|---|---|---|---|
| `lead` | priorCount = 0·首发 | 开门见山·主张 + 1 理由 | `陛下·臣窃以为...` / `陛下·臣有一议·愿陈之...` / `启奏陛下·臣 X 谨议...` | `伏乞圣裁` / `伏惟陛下察焉` / `臣谨奏闻` |
| `second` | 同党同立场 | 复述前者核心 1 句 + 1 新证据/案例 | `臣附 X 之议·` / `X 公所言甚是·臣亦以为...` / `X 公已具陈·臣略补一条...` | `不啻 X 之言·愿陛下俯纳` |
| `rebut` | 异党异立场 OR target=self | 复述对方 1 句 + 反驳 1-2 句·语气随 rank 变 | `臣窃以为 X 所言未当·` / `X 公方言...·然臣 不敢同其议...` / `X 公此论·臣有惑焉...` | `伏惟陛下明察·勿堕其策` / `愚见如此·伏乞圣裁` |
| `soften` | 同党异立场·or 仁善高 alleviating | 肯定对方动机 + 婉言陈己见 | `X 公忠悃可嘉·惟...` / `X 公此心拳拳·然臣愚以为...` | `望陛下兼听·权宜处之` |
| `pivot` | 中立·or 中场 alliesLost ≥ 2 | 提议题未被讨论的侧面 OR 建议交某部再议 | `诸臣所议皆当·然臣窃见...` / `此议尚有一端未及...` / `事关 X·或可交 Y 部详议...` | `俟有定论·再呈陛下` |
| `cite` | 理性 ≥ 70 / 学识 ≥ 70·议题有 historicalPrecedent tag | 援引先例 + 类比当前 | `汉 X 故事·臣尚记之...` / `昔 X 朝有 Y 之事·或可为今鉴...` / `史载 X·正与今同...` | `古今同道·惟陛下察焉` |

**注意**·`cite` 可以独立 mode·也可以修饰其他 mode (e.g., `rebut + cite` = 用先例驳斥)。实现时·base mode 决定主结构·cite 是 boolean modifier。

---

<a id="3"></a>
## 3. 6 层架构详解

```
[prompt 构造 _cc3_aiGenReact]
        |
        v
+-------+--------+
| 层 1·debate state 分析  |  ← 读 item.selfReact / debate / debate2·算 momentum / alliesPiledOn / lastSpeaker
+-------+--------+
        |
        v
+-------+--------+
| 层 2·base mode inference  |  ← 规则·6 类 mode + cite modifier
+-------+--------+
        |
        v
+-------+--------+
| 层 3·8D persona modulation  |  ← 仁善降级 rebut / 复仇升级 / 理性加 cite / 名节强制 / 社交转 soften
+-------+--------+
        |
        v
+-------+--------+
| 层 4·rank/class tone  |  ← 阁臣委婉 / 言官激烈 / 武臣粗朴 / 郎官 procedural
+-------+--------+
        |
        v
+-------+--------+
| 层 5·cumulative reference (Tier 2)  |  ← alliesPiledOn ≥ 3 / oppCount ≥ 3 / momentum = consensus-against-me
+-------+--------+
        |
        v
+-------+--------+
| 层 6·emperor cue (Tier 2)  |  ← item._lastEmperorIntent: praise / punish / doubt
+-------+--------+
        |
        v
[最终 prompt instruction 段·拼接到原 _cc3_aiGenReact prompt 之后]
```

每层产出一段 instruction·全部拼接·形成 v3 prompt 增量段·~250-400 字。

---

<a id="4"></a>
## 4. 8D personality modulation·15 条修正表 (扩自 v2 的 6 条)

**注意**·实际 API 是 `TM.NpcEngine.aggregateDims(ch)` 返 `{boldness, compassion, rationality, greed, honor, sociability, vengefulness, energy}`·**英文 key·signed 范围典型 ±2** (单 trait dims ±0.1~±0.5·N traits 累加)。阈值用 ±0.3 ~ ±0.7。

| 8D 维度 (英文 key) | 阈值 | 触发条件 | mode 修正 |
|---|---|---|---|
| **compassion (仁善)** | ≥ +0.3 | base = rebut·且 oppStanceCount < 3 (阵营不算失势) | → soften |
| **compassion** | ≥ +0.5 | 议题涉刑罚/杀戮 (penal-harsh tag) | 强制 soften·即便异党异立场 |
| **vengefulness (复仇)** | ≥ +0.5 | 上一位 = 曾损害本人或本派 (查 affinity history) | second/augment → rebut |
| **vengefulness** | ≥ +0.7 | item.target ∈ 本人 enemies list | 强制 rebut·语气更激烈·朝堂语用"诛"/"诛之"等狠词 |
| **rationality (理性)** | ≥ +0.5 | 议题有 historicalPrecedent tag | 任意 mode → 追加 cite modifier (不替换主 mode) |
| **rationality** | ≥ +0.7 | controversial ≥ 6·情绪化议题 | score × 0.7 (在 stance 计算中)·结果偏中立 → 更易 mediate / pivot |
| **honor (名节)** | ≥ +0.5 | 议题 violatesEtiquette tag | 强制 rebut·即便同党 (清议派不护同党失德) |
| **honor** | ≥ +0.7 | 议题涉皇室/宗庙/礼制 (ritual tag) | 强制 rebut·语气凛然·朝堂语用"祖宗成法"/"宗庙不可" |
| **sociability (社交)** | ≥ +0.5 | alliesLost ≥ 2 (本派近被反驳 ≥2 次) | rebut → soften·找台阶 |
| **sociability** | ≥ +0.7 | 任意 mode | 加情感词缓和·朝堂语用"共勉"/"共图"/"和衷" |
| **greed (贪心)** | ≥ +0.3 | 议题为 reward-distribution tag | stance 偏 support (在 stance 计算)·mode 偏 second (附议派肥案) |
| **greed** | ≥ +0.5 | 议题涉自身或亲族利益 | 强制 second 或 lead (主动争取) |
| **boldness (勇敢)** | ≥ +0.3 | 议题为 foreign-policy tag | stance 偏强硬 (战派 support·和派 oppose)·mode 偏 lead / rebut |
| **boldness** | ≥ +0.7 | item.target = 本人 | 强制 lead 自辩·语气强硬·朝堂语"臣不惧死"/"臣身赴重典" |
| **energy (精干)** | ≥ +0.5 | 议题为执行类 (execution-detail tag) | augment / pivot → pivot to specific (提具体方案) |

负向也对称·**compassion ≤ -0.5** (callous 冷酷) 在 penal-harsh 议题反而 → rebut 主张严办·诸如此类。负向规则数量 ~5 条·暂从略·实施时补在 §4 末尾。

**优先级冲突**·

- 强制规则 (`vengefulness ≥ +0.7` / `honor ≥ +0.7` / `compassion ≥ +0.5` / `boldness ≥ +0.7`) 互相冲突时·按 8D 维度数值高者优先
- 强制 vs 弱修正冲突·强制胜
- 多个弱修正·按 `compassion > vengefulness > rationality > honor > sociability` 顺序裁决 (避免不可预测)

---

## 4.5·Personality-text fallback (B 方案·绍宋等 traitIds 缺失剧本)

**Slice 0 发现**·绍宋 98 NPC traitIds 全为 0·`aggregateDims` 全返 0·§4 所有 15 条规则**全部失效**。

**B 方案**·若 `dims` 全 0·从 `ch.personality` (中文字符串) keyword 推 dims·中等精度·~70% 准确率。

### 实现·`_cc3_inferDimsFromPersonalityText(text)`

```js
function _cc3_inferDimsFromPersonalityText(text) {
  if (!text || typeof text !== 'string') return null;
  const dims = { boldness:0, compassion:0, rationality:0, greed:0, honor:0, sociability:0, vengefulness:0, energy:0 };
  let hits = 0;

  // boldness·勇敢
  if (/勇敢|勇猛|刚直|刚毅|敢言|不畏|无畏|刚强|果敢|敢于/.test(text)) { dims.boldness += 0.4; hits++; }
  if (/怯懦|畏缩|胆小|怕事|避祸/.test(text))                          { dims.boldness -= 0.4; hits++; }

  // compassion·仁善
  if (/仁善|仁厚|宽仁|爱民|怜悯|不忍|心慈|恻隐/.test(text))            { dims.compassion += 0.4; hits++; }
  if (/冷酷|冷漠|残忍|严苛|凉薄|薄情|狠辣/.test(text))                  { dims.compassion -= 0.4; hits++; }

  // rationality·理性
  if (/理性|务实|深思|审慎|稳重|冷静|权衡|计虑|计谋/.test(text))        { dims.rationality += 0.4; hits++; }
  if (/冲动|偏激|急躁|莽撞|意气|轻率/.test(text))                       { dims.rationality -= 0.4; hits++; }

  // greed·贪心
  if (/贪|聚敛|好利|敛财|爱财|图利|逐利/.test(text))                    { dims.greed += 0.4; hits++; }
  if (/清廉|淡泊|寡欲|不贪|不慕|安贫/.test(text))                       { dims.greed -= 0.4; hits++; }

  // honor·名节
  if (/名节|气节|清议|清流|耿介|忠直|刚正|节操|大义/.test(text))        { dims.honor += 0.5; hits++; }
  if (/失节|无耻|附阉|逢迎|苟合|圆滑/.test(text))                       { dims.honor -= 0.4; hits++; }

  // sociability·社交
  if (/善交|结好|合群|温和|和气|圆通|长袖善舞/.test(text))               { dims.sociability += 0.4; hits++; }
  if (/孤僻|寡言|不群|独行|孤介/.test(text))                            { dims.sociability -= 0.4; hits++; }

  // vengefulness·复仇
  if (/睚眦必报|记仇|复仇|怀怨|心狭|心狠/.test(text))                    { dims.vengefulness += 0.5; hits++; }
  if (/宽厚|能容|不计前嫌|大度/.test(text))                             { dims.vengefulness -= 0.4; hits++; }

  // energy·精干
  if (/勤勉|精干|干练|励精|尽心|勤政|敏锐/.test(text))                   { dims.energy += 0.4; hits++; }
  if (/懒散|怠政|拖沓|疏懒/.test(text))                                 { dims.energy -= 0.4; hits++; }

  return hits > 0 ? dims : null;  // 没命中关键词·返 null 走 mode-only 路径
}
```

### 调用点·`_cc3_modulateModeByPersona` 内

```js
function _cc3_modulateModeByPersona(mode, gmCh, item, state) {
  // 1. 优先 traitIds aggregate
  let dims = null;
  try {
    if (window.TM && TM.NpcEngine && TM.NpcEngine.aggregateDims) {
      dims = TM.NpcEngine.aggregateDims(gmCh);
    }
  } catch (_) {}

  // 2. 若 dims 全 0 (即 NPC 无 traitIds)·fallback 从 personality 文本推
  const allZero = dims && Object.values(dims).every(v => v === 0);
  if (!dims || allZero) {
    const inferred = _cc3_inferDimsFromPersonalityText(gmCh && gmCh.personality);
    if (inferred) {
      dims = inferred;
      // 标记·让 prompt 知道这是 fallback (debug 友好)
      if (state) state._dimsSource = 'personality-text-fallback';
    }
  }

  if (!dims) return mode;  // 完全无 persona 信息·走 base mode

  // 3. 应用 §4 的 15 条规则 + 5 条负向 (省略·见 §4)
  // ...

  return modifiedMode;
}
```

### 精度评估

随机抽 20 个绍宋 NPC 跑 inferDims·预期·

- ~70% NPC 至少命中 1 个 keyword·dims 非 0
- ~50% NPC 命中 2+ keyword·dims 较准
- ~30% NPC 命中 0 keyword (personality 文本风格特殊)·走 mode-only

**这是中等精度的兜底·不是替代**·长期仍需独立 slice 补绍宋 traitIds (A 方案)。

### Slice 7 manual sample 时验证

跑绍宋·南幸扬州议题·6 NPC·prompt 中应能看到·

- ≥ 4 个 NPC·persona modulation 触发 (dims 非 0)
- state._dimsSource = 'personality-text-fallback' 标记可见 (debug)
- mode 分布跟天启同议题相比·persona 调制效果~70% 强度

---

<a id="5"></a>
## 5. rank/class tone modulation·5 套 + 朝堂语词库

mode 决定**主结构**·tone 决定**语言风格层**·二者正交。

| 条件 | tone 名 | 朝堂语自称 | 风格描述 | prompt instruction 模板 |
|---|---|---|---|---|
| rank ≤ 2 (阁臣·三公·宰执) | `gravitas` | 臣 / 微臣 / 老臣 | 委婉·稳重·复述论点 2 句·末加伏乞·避免直接攻击 | `语气稳重委婉·先复对方论点 2 句以示尊重·再陈己见·末加"伏乞圣裁"` |
| rank ≥ 5 (郎官/给事/主簿以下) | `procedural` | 臣 / 卑职 / 末职 | 不直接驳·建议交某部/三法司/都察院再议 | `不直接驳·宜建议"交 [部/院] 详议"·或"请陛下命有司勘查"` |
| class = `kdao` (言官·御史·给事中) | `righteous` | 臣 / 微臣 / 言官某 | 直接·激烈·可点名·朝堂语带"风闻奏事"/"上达天听" | `言官风骨·直陈不讳·可点名对方·语气激烈但不失体·朝堂语带"风闻奏事"/"上达天听"` |
| class = `wuchen` (武臣·将领) | `martial` | 末将 / 微臣 / 老将 | 粗朴直白·少修辞·多军事术语·短句 | `武臣口吻·粗朴直白·少修辞·多军事术语·短句·避免文饰` |
| class = `houfei` (后妃·若入议) | `decorum` | 妾 / 妾身 / 臣妾 | 婉转·重礼·常自抑 | `自抑·先言"妾不当与议"·后言"惟臣妾愿陈一二"·语气婉转重礼` |
| **其他** | `default` | 臣 | 标准朝堂体 | (无特殊 instruction) |

**朝堂语自称对应朝代差异**·建议在 `sc.chaoyi.toneOverrides` 字段允许剧本覆盖 (e.g., 唐宋 vs 明清自称用法不同·初版用明清默认)·**长期方案 4 的范畴·此处不做**·先全部用明清自称。

---

<a id="6"></a>
## 6. anti-monotony guards·4 条

mode 分布会塌缩到几个常见模式 (e.g., 6 个 NPC 全 rebut)·需要主动 cap。

### Guard 1·全场 mode 多样性 cap

```js
function _cc3_capModeDistribution(mode, item, gmCh) {
  const modesSoFar = ((item.selfReact || []).concat(item.debate || []))
    .filter(r => r._mode).map(r => r._mode);
  const counts = {};
  modesSoFar.forEach(m => { counts[m] = (counts[m] || 0) + 1; });

  // 若同 mode 已 ≥ 3 个·本人选其他相容 mode
  if (counts[mode] >= 3) {
    if (mode === 'rebut') return 'soften';      // 太多人驳·降一个为缓和
    if (mode === 'second') return 'augment';    // 太多人附议·补一个新角度
    if (mode === 'lead') return 'augment';      // 不可能·lead 只第一个
    if (mode === 'pivot') return 'augment';     // 太多人 pivot·补一个 augment
  }
  return mode;
}
```

### Guard 2·避免连续同 mode

```js
function _cc3_avoidConsecutive(mode, lastMode) {
  if (mode === lastMode && mode !== 'augment') {
    // 连续 same mode 太单调·小概率换 augment
    if (Math.random() < 0.4) return 'augment';
  }
  return mode;
}
```

### Guard 3·mode 强度随轮次衰减

debate2 第二轮·mode 应偏 soften / pivot·

```js
function _cc3_softenModeForRound2(mode, role) {
  if (role !== 'debate2') return mode;
  // 第二轮·rebut → soften (50%)·lead → augment (强制)
  if (mode === 'rebut' && Math.random() < 0.5) return 'soften';
  if (mode === 'lead') return 'augment';
  return mode;
}
```

### Guard 4·cite cooldown

cite mode 太多次显得卖弄·

```js
function _cc3_capCite(citeFlag, item) {
  const citesSoFar = ((item.selfReact || []).concat(item.debate || []))
    .filter(r => r._cite).length;
  if (citesSoFar >= 2 && citeFlag) {
    return Math.random() < 0.3;  // 70% 时间 drop cite·避免连引经据典
  }
  return citeFlag;
}
```

**调用顺序**·`base mode → 8D persona modulation → 4 guards → final mode`。guards 最后一关·拦塌缩。

---

<a id="7"></a>
## 7. NPC-NPC consequence linkage·AffinityMap 更新

**问题**·当前 `_cc3_writeActionToGM` (L2446-2557) 只更新**玩家与 NPC** 的关系。NPC 之间 rebut / second 不留痕迹。意味着·朝堂上 A 驳 B 三回·下一轮 A 跟 B 在野外相遇还是中立。

**fix**·NPC 互动也走 AffinityMap·

```js
// 在 _cc3_aiGenReact 末尾·LLM 返结果后追加
// 注意·AffinityMap 真 API 是 .add(a, b, delta, reason)·单向·两 NPC 需调 2 次
// NpcMemorySystem.remember signature·positional·(name, text, '中文 emotion', weight, source)
function _cc3_writeNpcInteraction(name, mode, lastSpeaker, item, gmCh) {
  if (!lastSpeaker || lastSpeaker === name) return;
  if (typeof AffinityMap === 'undefined' || !AffinityMap.add) return;

  const intensity = item.controversial >= 6 ? 3 : 2;  // 高争议 议题影响更大
  const itemTitle = item.title || '议事';
  switch (mode) {
    case 'rebut':
      AffinityMap.add(name, lastSpeaker, -intensity, '常朝议事·' + name + '驳' + lastSpeaker);
      AffinityMap.add(lastSpeaker, name, -intensity, '常朝议事·被' + name + '驳');
      break;
    case 'second':
      AffinityMap.add(name, lastSpeaker, +intensity, '常朝议事·' + name + '附议' + lastSpeaker);
      AffinityMap.add(lastSpeaker, name, +1, '常朝议事·' + name + '附议');
      break;
    case 'soften':
      // 同党异立场·缓和不伤关系·略升 (理解为讲情面)
      AffinityMap.add(name, lastSpeaker, +1, '常朝议事·' + name + '婉言劝' + lastSpeaker);
      break;
    case 'pivot':
    case 'augment':
    case 'lead':
    case 'cite':
      // 不直接互动·不动 affinity
      break;
  }

  // memory·NPC 自己记得此事·影响后续 wendui / NPC 推演
  // 真 API·positional·中文 emotion ('喜'/'忧'/'怒'/'平'/'敬'/'重' 等)
  if (typeof NpcMemorySystem !== 'undefined' && NpcMemorySystem.remember) {
    const verb = mode === 'rebut' ? '驳' : (mode === 'second' ? '附议' : '回应');
    const emotion = mode === 'rebut' ? '怒' : (mode === 'second' ? '喜' : '平');
    const weight = mode === 'rebut' ? 6 : (mode === 'second' ? 4 : 3);
    NpcMemorySystem.remember(
      name,
      '常朝议事·' + verb + lastSpeaker + '于「' + itemTitle + '」',
      emotion,
      weight,
      lastSpeaker
    );
  }
}
```

**为什么这件事重要**·

- 让朝议**真的塑造朝堂派系网**·而不只玩家-NPC 二元关系
- 跨场景一致性·下一轮 wendui 找 A 谈 B·A 因刚才 rebut 而对 B 有怨·会用 affinity 反映
- 朝议**自己变成势力斗争场**·符合标尺 C (机制必挂政治后果)

**注意**·affinity 调整不能太重·否则一次廷议派系全裂。`intensity = 2-3` 是合理量级·一次议事 -3·要 5+ 次才能让中立变敌对。

---

<a id="8"></a>
## 8. 议题 tagging 系统

层 3 (personality modulation) 和层 5 (cumulative) 都依赖 `item.tag`·必须先把 议题 tag 化。

**8 个核心 tag** (初版)·

| Tag | 含义 | persona 联动 |
|---|---|---|
| `foreign-policy` | 涉外·战和·封贡 | 勇敢 → 强硬·仁善 → 主和 |
| `penal-harsh` | 刑罚·诛戮·谳狱 | 仁善 → 反对·复仇 → 支持 |
| `reward-distribution` | 赏赐·分肥·封赏 | 贪心 → 支持 / 主动 second |
| `etiquette-violation` | 违礼·僭越·失仪 | 名节 → 强制 rebut |
| `ritual` | 祭祀·宗庙·礼制 | 名节 ≥ 80 → 强 rebut |
| `historicalPrecedent` | 有先例可援·复古议 | 理性 / 学识 → cite modifier |
| `execution-detail` | 执行细节·具体方案 | 精干 → pivot to specific |
| `personnel` | 人事·任免·迁转 | 党争权重升·intentMod·partyTone × 1.3 |

**tag 入议程的 3 种来源**·

1. **scenario.events 预定义** — 剧本里的 conditional / opening 事件·trigger 时携带 tag
2. **NPC 推演结果带回** — `tm-faction-npc-llm-decision.js` 生成议题时·LLM 输出含 `tags: ["penal-harsh"]`
3. **manual fallback** — 议题文本含关键词时·rule-based 推 tag (e.g., "诛"/"斩" → penal-harsh·"封赏"/"赐"→ reward-distribution)

**fallback rules** (`_cc3_inferTagsFromText`)·

```js
function _cc3_inferTagsFromText(item) {
  const text = (item.title || '') + ' ' + (item.detail || '');
  const tags = [];
  if (/和议|封贡|战守|出师|金人|党项|羁縻/.test(text)) tags.push('foreign-policy');
  if (/诛|斩|戮|大辟|谳狱|罪当死|抄家/.test(text)) tags.push('penal-harsh');
  if (/封赏|分赐|食邑|赐田|加禄/.test(text)) tags.push('reward-distribution');
  if (/失仪|僭越|不臣|大不敬|违制/.test(text)) tags.push('etiquette-violation');
  if (/祭|郊|庙|社稷|宗庙|礼制/.test(text)) tags.push('ritual');
  if (/汉.{0,3}故事|唐.{0,3}故事|先朝|祖宗|前事/.test(text)) tags.push('historicalPrecedent');
  if (/方略|具体|施行|条陈|分项/.test(text)) tags.push('execution-detail');
  if (/任|免|迁|擢|黜|罢|起复/.test(text)) tags.push('personnel');
  return tags;
}
```

`_cc3_enhanceAgendaItem` (L420) 末尾追加·`if (!item.tags) item.tags = _cc3_inferTagsFromText(item);`

---

<a id="9"></a>
## 9. 完整流程示例·绍宋·南幸扬州议题 (6 NPC × 2 round)

**剧本**·`scenarios/绍宋·建炎元年八月（官方）.json`
**议题**·"是否南幸扬州" (历史·1127 年 10 月真实事件)·tags = `['foreign-policy', 'historicalPrecedent']`·controversial = 8 (极高)

**参议 NPC** (6 人·按层 1 算 mode 顺序)·

| # | NPC | 党派 | rank | class | 8D 关键值 | stance |
|---|---|---|---|---|---|---|
| 1 | 黄潜善 | 主和 | 2 (右相) | wenchen | 仁善 35·名节 25·贪心 70 | support (南幸) |
| 2 | 李纲 | 主战 | (刚罢相·rank 临时降为 3) | wenchen | 名节 88·仁善 60·勇敢 70 | oppose |
| 3 | 张俊 | 御营·偏主和 | 3 | wuchen | 勇敢 65·贪心 60·名节 30 | mediate (倾 support·圣安先) |
| 4 | 陈东 | 太学清流 | 7 (布衣) | kdao | 名节 95·仁善 70·勇敢 80 | oppose |
| 5 | 张邦昌 | 务实 | 2 (太宰) | wenchen | 理性 75·名节 40 | mediate |
| 6 | 韩世忠 | 主战 | 3 | wuchen | 勇敢 85·名节 60·复仇 70 | oppose |

### Round 1 (selfReact·controversial ≥ 6 → 3 人 selfReact + 6 人 debate)

#### NPC 1·黄潜善 (selfReact·priorCount = 0)

- **层 1 debate state**·priorCount = 0 → mode = lead
- **层 2 base mode**·`lead`
- **层 3 persona modulation**·贪心 70 + reward-distribution tag·但本议题无 reward tag·无变化。仁善 35 不触发·名节 25 不触发。无修正
- **层 4 rank/class tone**·rank 2·阁臣·tone = `gravitas`
- **mode final**·`lead`·tone·`gravitas`
- **prompt 附加**·

```
【应答模式·lead】
你为本议题首发·开门见山·提出主张并给出 1 条理由。
朝堂语开头·"陛下·臣窃以为..." / "陛下·臣有一议·愿陈之..."
朝堂语结句·"伏乞圣裁" / "伏惟陛下察焉"
语气稳重委婉·避免激烈·末加"伏乞圣裁"
```

**LLM 输出 (期望)**·
> 陛下·臣窃以为·应天孤悬·非久驻之地。金兵铁骑·岁岁南牧·此地无险可守。扬州漕运通达·又有长江为屏·圣体宜暂幸之·以图后举。伏乞圣裁。

`_cc3_writeNpcInteraction`·priorCount = 0·无 lastSpeaker·skip。

#### NPC 2·李纲 (selfReact·priorCount = 1·last = 黄潜善)

- **层 1**·priorCount = 1·lastSpeaker = 黄潜善·lastStance = support·myStance = oppose·lastSamePartyAsMe = false (主和 vs 主战) → 异党异立场
- **层 2 base mode**·`rebut`
- **层 3 persona**·名节 88 高·但议题非 etiquette-violation tag·无强制·仁善 60·但议题非 penal-harsh·不触发 80 强制。仁善 60 触发**层 3 规则 1**·`base = rebut·且 oppStanceCount < 3` → 降为 soften？**等**·此处 oppStanceCount = 0 (我刚发声·没人附议我·也没人反我)·oppStanceCount 看的是**反我立场的人数**·黄潜善 stance=support·我 oppose·所以 oppStanceCount = 1。我是第 2 个发言·总数 1·所以 oppStanceCount = 1 < 3·**仁善 60 触发降级**·rebut → soften

  但是·我是李纲·主战派 leader·**勇敢 70 + foreign-policy tag**·触发**层 3 规则 13**·"勇敢 ≥ 60 + foreign-policy → stance 偏强硬·mode 偏 lead/rebut"·这跟仁善 60 → soften 冲突。

  按优先级·仁善 > 复仇 > 理性 > 名节 > 社交·**仁善 60 弱修正 vs 勇敢 60 弱修正**·都属弱·按 8D 数值高者·名节 88 > 勇敢 70 > 仁善 60。但名节 88 此议题无关 (无 etiquette/ritual tag)。

  **冲突仲裁** (优先级新增·见 §4 末尾)·**议题 tag 相关的修正优先于一般修正**·即·勇敢 + foreign-policy 是 tag-driven·优先于仁善 + 一般。**最终·mode = rebut** (保持·勇敢覆盖仁善)
- **层 4 tone**·rank 3 → 不算阁臣·class wenchen·tone = `default`
- **层 5 (Tier 2)**·alliesPiledOn = 0·skip
- **anti-monotony guard 1**·modesSoFar = [lead]·counts = {lead:1}·rebut count = 0·不 cap
- **mode final**·`rebut`
- **prompt 附加**·

```
【应答模式·rebut】
上一位 黄潜善（支持）方言·"应天孤悬...扬州漕运通达..."
你的立场异·须驳之。
朝堂语开头·"臣窃以为 黄潜善 所言未当·" / "黄公方言...·然臣 不敢同其议..."
朝堂语结句·"伏惟陛下明察·勿堕其策"
内容范式·先复述对方论点 1 句·再反驳 1-2 句
【强调·勇敢 70 + 外交议题·语气可坚定·不必委婉】
```

**LLM 输出 (期望)**·
> 黄相方言扬州可幸·然臣窃以为未当。汴京未陷·宗庙犹存·二圣北望·岂可一去千里？金人闻陛下南幸·必谓宋有畏心·将益骄横。当此之时·正宜聚兵汴京·号令河朔·岂可避地东南？伏惟陛下明察·勿堕黄相之策。

`_cc3_writeNpcInteraction`·李纲 rebut 黄潜善·

- AffinityMap.adjust(李纲, 黄潜善, -3, '常朝议事·李纲驳黄潜善')
- AffinityMap.adjust(黄潜善, 李纲, -3, '常朝议事·被李纲驳')
- NpcMemorySystem.remember(李纲, {text:'常朝议事·李纲驳黄潜善于「南幸扬州」', emotion:'hostile', ...})

#### NPC 3·陈东 (selfReact·priorCount = 2·last = 李纲)

- **层 1**·lastStance = oppose·myStance = oppose·lastSamePartyAsMe = true (太学清流 ⊂ 主战阵营) → 同党同立场
- **层 2 base mode**·`second`
- **层 3 persona**·名节 95·foreign-policy tag·**勇敢 80** 触发**层 3 规则 13**·"勇敢 ≥ 60 + foreign-policy → mode 偏 lead/rebut"·跟 second 冲突？陈东主张更激烈·我们应让他不只附议·而是**强化李纲的论点 + 进一步推**。

  **裁决·second + 强化** (我们让 second mode 在勇敢 ≥ 80 时附议得**更激烈**·朝堂语用"臣亦以为"+"不啻 X 之言"+加重)。**mode 仍 second·但 tone 强化**

  另外·**仁善 70** 不触发降级 (它是 second 不是 rebut)。**勇敢 80** 没强制规则·不变 mode。
- **层 4 tone**·class = kdao → tone = `righteous` (言官激烈风)
- **anti-monotony**·counts = {lead:1, rebut:1}·second 是新 mode·不 cap
- **mode final**·`second`·tone·`righteous`
- **prompt 附加**·

```
【应答模式·second】
上一位 李纲（反对）方言·"汴京未陷·宗庙犹存..."
你与之同党同立场·须附议·并补充新理由 / 案例·不可全文重复。
朝堂语开头·"臣附 李纲 之议·" / "李公所言甚是·臣亦以为..."
朝堂语结句·"不啻 李公之言·愿陛下俯纳"
【强调·言官风骨·直陈不讳·可点名·语气激烈】
【强调·勇敢 80 + 外交·附议得激烈·非客套式附议】
```

**LLM 输出 (期望)**·
> 臣附李公之议。李公方言「宗庙犹存·岂可一去千里」·臣陈东亦以为然。臣闻黄、汪二公唱南幸之议·实欲弃汴京、弃二圣、弃河朔之民也！太学诸生闻之·无不痛哭。陛下若南幸·则金人长驱·豪杰离心·宋祚危矣。臣愿伏阙·以死请陛下留汴京。不啻李公之言·愿陛下俯纳。

`_cc3_writeNpcInteraction`·陈东 second 李纲·

- AffinityMap.adjust(陈东, 李纲, +3, '常朝议事·陈东附议李纲')
- AffinityMap.adjust(李纲, 陈东, +1, '常朝议事·陈东附议')

#### NPC 4·张俊 (debate·priorCount = 3·last = 陈东)

- **层 1**·lastStance = oppose·myStance = mediate (倾 support)·lastSamePartyAsMe = false (御营 vs 太学)
- **层 2 base mode**·lastStance ≠ myStance + 异党 → `rebut`?? 不对·myStance 是 mediate·算"异"吗？看 `_oppositeStance` 实现·

  ```js
  function _oppositeStance(a, b) {
    return (a === 'support' && b === 'oppose') || (a === 'oppose' && b === 'support');
  }
  ```

  mediate vs oppose·**不是 opposite**·base mode 走兜底·`augment`
- **层 3 persona**·贪心 60·议题非 reward·不触发。勇敢 65·foreign-policy·**层 3 规则 13**·mode 偏 lead/rebut·但我 stance mediate·**stance 跟 mode 强约束矛盾时·stance 胜·mode 改 pivot** (给中立态度一个出口)
- **层 4 tone**·class = wuchen → tone = `martial` (粗朴直白)
- **anti-monotony**·counts = {lead:1, rebut:1, second:1}·pivot 是新 mode·不 cap
- **mode final**·`pivot`·tone·`martial`
- **prompt 附加**·

```
【应答模式·pivot】
诸臣已议·或战或和·你为中立·提议题未被讨论的侧面 / 或建议交某部再议。
朝堂语开头·"诸臣所议皆当·然臣窃见..." / "事关 X·或可交 Y 部详议..."
【强调·武臣口吻·粗朴直白·少修辞·短句】
```

**LLM 输出 (期望)**·
> 末将张俊·诸公所议皆有理。然末将以为·南幸与否·尚需问明几事·御营兵粮可支几日？金人前锋离应天几里？汴京守城兵几许？此三事不明·议守议幸皆是空谈。请陛下命枢密院、户部、兵部勘报·末将再陈己见。

`_cc3_writeNpcInteraction`·pivot mode·不动 affinity·只 memory·

- NpcMemorySystem.remember(张俊, {text:'常朝议事·张俊提折中议于「南幸扬州」', emotion:'neutral', ...})

#### NPC 5·张邦昌 (debate·priorCount = 4·last = 张俊)

- **层 1**·lastStance = mediate·myStance = mediate·lastSamePartyAsMe = false (御营 vs 务实)
- **层 2**·stance 同·party 异·`second`?  规则·`sameParty && sameStance → second`·此 sameParty = false·不 trigger second。`!sameParty && oppositeStance` 也不 trigger。落到默认 `augment`
- **层 3 persona**·理性 75·foreign-policy + historicalPrecedent tag·**层 3 规则 5**·`理性 ≥ 70 + historicalPrecedent → 追加 cite modifier`
- **层 4 tone**·rank 2 (太宰)·阁臣·tone = `gravitas`
- **anti-monotony**·counts = {lead:1, rebut:1, second:1, pivot:1}·augment 是新·不 cap。cite cooldown·citesSoFar = 0·允许
- **mode final**·`augment + cite`·tone·`gravitas`
- **prompt 附加**·

```
【应答模式·augment + cite】
诸臣已陈说·你补充未提及的视角·并援引先例 (你理性 75 + 议题有历史先例)。
朝堂语开头·"诸臣所议皆当·然臣窃见尚有未论者..." / "汉 X 故事·臣尚记之..."
朝堂语结句·"古今同道·惟陛下察焉"
【强调·阁臣口吻·语气稳重·复述论点 2 句·末加伏乞】
【强调·援引一段史事 (汉光武渡江 / 唐玄宗幸蜀)·作类比】
```

**LLM 输出 (期望)**·
> 臣张邦昌窃以为·诸公所议或战或和或勘报·皆有理。然臣窃见尚有未论者·人心向背也。汉光武渡江·人心向汉·故能中兴。唐玄宗幸蜀·人心散乱·遂有马嵬之变。今宗庙未远·人心思宋·若骤南幸·恐失民望。然若死守应天·又难支金人铁骑。臣愚以为·宜先南幸而扬声不幸·使金人疑·使百姓不惊·徐图后举。古今同道·惟陛下察焉·伏乞圣裁。

#### NPC 6·韩世忠 (debate·priorCount = 5·last = 张邦昌)

- **层 1**·lastStance = mediate·myStance = oppose·lastSamePartyAsMe = false → 异党 mediate vs 我 oppose·非 opposite·**augment**
- **层 3 persona**·**勇敢 85** + foreign-policy → 层 3 规则 13·偏 lead/rebut。我 stance oppose·跟 rebut 兼容·**mode 改 rebut** (针对张邦昌的"先南幸而扬声不幸")。**复仇 70**·查 affinity-history·张邦昌曾立伪楚·韩世忠主战·属"曾被损害的派系"·**触发层 3 规则 3**·second/augment → rebut。两个规则同向·确认 rebut
- **anti-monotony guard 1**·counts = {lead:1, rebut:1, second:1, pivot:1, augment:1, cite:0}·rebut = 1 < 3·不 cap
- **guard 3 (round)**·此为 round 1 debate·不衰减
- **层 4 tone**·class = wuchen → `martial`
- **mode final**·`rebut`·tone·`martial`
- **prompt 附加**·

```
【应答模式·rebut】
上一位 张邦昌（折中）方言·"宜先南幸而扬声不幸..."
你的立场异·须驳之·语气坚定 (你勇敢 85)。
张邦昌曾立伪楚·你对其有旧仇·语气可激烈但不失体。
朝堂语开头·"末将不敢同 张邦昌 之议..." / "张相方言...·然末将以为..."
朝堂语结句·"伏惟陛下明察·勿堕其策"
【强调·武臣粗朴·短句·避免文饰】
```

**LLM 输出 (期望)**·
> 末将韩世忠·不敢同张相之议。张相方言「先南幸而扬声不幸」·此即欺君也！金人探报无孔不入·宋境内民间动静尚知·南幸车马如何掩饰？张相昔日立伪楚·已失大节·今复进此欺君之策·末将不敢苟同。陛下若南幸·末将愿与诸将殿后·以死御金。伏惟陛下明察·勿堕其策。

`_cc3_writeNpcInteraction`·

- AffinityMap.adjust(韩世忠, 张邦昌, -3, '常朝议事·韩世忠驳张邦昌')
- AffinityMap.adjust(张邦昌, 韩世忠, -3, '常朝议事·被韩世忠驳')

### Round 1 总览·mode 分布

| Position | NPC | Stance | Mode | Tone |
|---|---|---|---|---|
| 1 | 黄潜善 | support | lead | gravitas |
| 2 | 李纲 | oppose | rebut | default |
| 3 | 陈东 | oppose | second | righteous |
| 4 | 张俊 | mediate | pivot | martial |
| 5 | 张邦昌 | mediate | augment+cite | gravitas |
| 6 | 韩世忠 | oppose | rebut | martial |

**多样性检验**·6 个 mode·有 5 个不同的 mode (lead, rebut×2, second, pivot, augment+cite)·分布健康。

**affinity 变化**·李纲↔黄潜善 -3·陈东↔李纲 +3/+1·韩世忠↔张邦昌 -3。三对关系被本议事重塑。

**memory 变化**·6 个 NPC 都记此事·下次 wendui / NPC 推演会用上。

### Round 2 (debate2·controversial > 7 → 触发·复用 round 1 前 4 位)

复用前 4 位 (黄潜善·李纲·陈东·张俊)·**guard 3** 触发·mode 偏 soften / pivot。

- 黄潜善·原 lead·round 2 改 `augment` (guard 3·lead 强制)·tone gravitas
- 李纲·原 rebut·round 2 (50% prob) 改 soften·若不改仍 rebut。设此 trial 改 soften
- 陈东·原 second·round 2 不衰减·仍 second·但说"再申一议·惟乞陛下早定"
- 张俊·原 pivot·round 2 仍 pivot·改提议交户部再议

具体输出略·机制同 round 1。

---

<a id="10"></a>
## 10. 完整 prompt 模板渲染示例

以 NPC 2·李纲·round 1 为例·展开 v3 prompt 全文。**斜体** = v3 新增段·其他 = 原 prompt。

> 你扮演 李纲。
>
> ── 你的档案 ──
> 官职：(空·罢相)
> 势力：宋朝廷·党派：主战
> 性格：刚直·名节·不畏强御
> 特质：直谏·廉洁·儒臣
> 能力：忠诚 92 · 清廉 88 · 野心 35
> 家世：世家
> 对陛下：忠悃·然恨黄潜善蒙蔽
> 与陛下关系值: 60
> 【近期记忆】
>   - 1127.08·罢相·黄潜善汪伯彦构陷
>   - 1127.07·主张河防·三上奏疏
>
> *(buildAiPersonaText·phase 6 字段) 你曾上《十议》·主战·力主太上皇还都...*
>
> *── 议题 tags ──*
> *foreign-policy, historicalPrecedent*
>
> ── 今日早朝议题 ──
> 主奏：黄潜善（中书省）
> 议题：「是否南幸扬州」
> 内容：金兵将至·应天孤悬·黄相奏请圣驾南幸扬州·暂避锋芒
>
> ── 殿中诸臣已表态（你须有差异）──
>   黄潜善（支持）：陛下·臣窃以为·应天孤悬·非久驻之地...伏乞圣裁。
>
> 时令：八月·秋燥
> 朝威：众言（百官较活跃）
>
> *── 你的应答策略 ──*
> *【应答模式·rebut】*
> *上一位 黄潜善（支持）方言·"应天孤悬...扬州漕运通达..."*
> *你的立场异·须驳之。*
> *朝堂语开头·"臣窃以为 黄潜善 所言未当·" / "黄公方言...·然臣 不敢同其议..."*
> *朝堂语结句·"伏惟陛下明察·勿堕其策"*
> *内容范式·先复述对方论点 1 句·再反驳 1-2 句*
> *【强调·勇敢 70 + 外交议题·语气可坚定·不必委婉】*
>
> ── 任务 ──
> 殿中议论·你须就议题表立场和理由（与他臣有别）。
>
> 严格按 JSON 输出（不带其他文字、不带代码块标记）：
> {"stance":"support|oppose|mediate|neutral","line":"..."}
>
> 要求：
> · stance 必须基于你档案中的派系/性格/忠诚...
> · *line 必须遵循应答模式·不得脱离 rebut·脱离视为生成失败*
> · 半文言·朝堂奏对体·"臣……"开头·体现你的性格与身份
> · 紧扣议题具体内容·有具体观点·不可空泛附和
> · *先复对方论点 1 句·再反驳·末加"伏惟陛下明察·勿堕其策"*
> · 直接 JSON·不要解释·不要 ```json 包裹

**字数估算**·

- 原 prompt·~1500 字
- v3 增量·议题 tags ~30 字·应答策略段 ~250 字·要求段加 1 行 ~30 字·共 ~310 字
- v3 总·~1810 字·中等密度 LLM 调用·~600-700 tokens (中文 ratio ~3 char/token)·完全可接受

---

<a id="11"></a>
## 11. test harness·3 类测试

### 11.1·mode 分布测试

```
跑 30 次议题模拟 (随机议题 × 不同 NPC pool)·收集·
- mode 分布·lead/second/rebut/soften/pivot/cite/augment 各占比
- 验·6 个发言里·至少出现 3 个不同 mode
- 验·rebut + second 占比 < 70% (避免太对抗)
- 验·cite 占比 < 25% (避免太掉书袋)
```

实现·`scripts/smoke-changchao-mode-distribution.js`·跑 30 trial·assert 分布在合理区间。

### 11.2·内容 novelty 测试

```
同议题 × 不同 NPC·检查·
- LLM 输出文本相似度 < 0.4 (Jaccard token-overlap)
- 含目标 mode 关键词 (如 rebut 必含驳/不敢同/未当 之一)
- 不重复前文 selfReact 中的核心论点 (token-overlap < 0.3)
```

实现·`scripts/smoke-changchao-content-novelty.js`·跑 5 议题·assert similarity / overlap thresholds。

### 11.3·persona 一致性测试

```
同 NPC × 多议题·检查·
- 高名节 NPC 在 etiquette-violation tag 议题始终 oppose·≥ 80% 时间
- 高仁善 NPC 在 penal-harsh 议题始终 oppose·≥ 80% 时间
- 高复仇 NPC 在 target = 旧仇 时始终 rebut·≥ 90% 时间
```

实现·`scripts/smoke-changchao-persona-consistency.js`·定 5 个 strong-persona NPC × 5 议题·assert 立场/mode 命中率。

**3 个 smoke 都进 verify-all**·守门后续回归。

---

<a id="12"></a>
## 12. degradation chain·4 级 fallback

```
[Tier 0·full v3]
  ├ 8D persona ✓·议题 tags ✓·AffinityMap ✓·LLM ✓
  └ 走全流程 (层 1-6 + guards + linkage)

[Tier 1·8D 缺失]
  ├ TM_NPC_Engine.aggregateDims 不可用 (新剧本未填 8D 字段)
  └ 跳过层 3 persona modulation·走 base mode + 层 4 tone·其他不变

[Tier 2·议题 tags 缺失]
  ├ scenario 未带 tag·_cc3_inferTagsFromText 也匹配不到关键词
  └ 跳过 tag-dependent 修正·走 stance 算术 base mode·persona 只读 8D 通用维度

[Tier 3·AffinityMap 缺失]
  ├ AffinityMap 未加载
  └ 跳过 NPC-NPC linkage·只走 memory.remember (因 NpcMemorySystem 必存)

[Tier 4·LLM 失败]
  ├ callAI 返 null·或 P.ai.key 空
  └ 走原 _cc3_genShortReact / _cc3_genDebateLine 模板池 (本 backlog 项 fallback 模板·user 拍板不改)
```

**4 级降级都不崩溃·都能产出 line + stance**·这是 production 必要的健壮性。

---

<a id="13"></a>
## 13. scope·changchao / yuqian / tinyi 分界

| 系统 | 文件 | 性质 | 是否纳入 v3 |
|---|---|---|---|
| **常朝** | tm-chaoyi-changchao.js | 日常早朝·百官·公开议事 | ✅ **主目标** |
| **御前** | tm-chaoyi-yuqian.js | 御前小议·近臣·私密 | ⚠️ Tier 1 完成后**评估**·可能 selfReact 路径相同 → 顺手纳入 |
| **廷议** | tm-chaoyi-tinyi.js | 特殊朝会·专议大事·重臣 | ⚠️ 同上 |

**初版只动 tm-chaoyi-changchao.js**·yuqian / tinyi 等 v3 在 changchao 跑稳后·再 evaluate 是否复用。可能复用度 60-80%·主要差异在 tone (御前更亲近·廷议更庄重)。

---

<a id="14"></a>
## 14. 实施步骤·9 step + 工作量重估

| Step | 内容 | 工作量 | 依赖 |
|---|---|---|---|
| 3.1 | `_cc3_inferTagsFromText` 议题 tag fallback + scenario 议题字段加 `tags` | 0.5d | 无 |
| 3.2 | `_cc3_analyzeDebate` debate state 分析器 + `_sameParty` / `_oppositeStance` / `_wasHarmedBy` helper | 0.5d | 无 |
| 3.3 | `_cc3_baseMode` 6 mode + cite modifier 推导 | 0.5d | 3.2 |
| 3.4 | 8D persona modulation·15 条修正表·调用 `TM_NPC_Engine.aggregateDims` | 1d | 项 2·8D 接入 |
| 3.5 | rank/class tone modulation·5 套 + 朝堂语开头/结句池 | 0.5d | 3.3 |
| 3.6 | anti-monotony guards·4 条 (`_cc3_capModeDistribution` + 3) | 0.3d | 3.3 + 3.4 |
| 3.7 | `_cc3_writeNpcInteraction` NPC-NPC affinity + memory linkage | 0.5d | 无 |
| 3.8 | prompt 拼接到 `_cc3_aiGenReact`·分 6 段拼接函数 + 强约束 instruction | 0.4d | 3.1-3.6 |
| 3.9 | test harness·3 类 smoke·进 verify-all | 0.8d | 3.1-3.8 |

**Tier 1 总**·**~5d** (原 v2 estimate 2.5d·因为加了议题 tagging + linkage + harness)
**Tier 2 (cumulative + emperor cue)**·**~+1.5d**
**完整 v3**·**~6.5d**

### 工作量爆涨的原因

v2 → v3 加了·

1. **议题 tagging** (0.5d) — 必须·否则层 3 一半规则跑不了
2. **NPC-NPC linkage** (0.5d) — 否则朝议消费完即烧·派系网不变·标尺 C 不闭环
3. **anti-monotony guards** (0.3d) — 否则 mode 塌缩
4. **test harness** (0.8d) — 否则不知道 mode 有没有被 LLM 听
5. **8D persona 扩到 15 条** (~+0.5d 跟原 6 条比) — 覆盖度足够·一致性更好
6. **朝堂语词库 + tone modulation** (~+0.3d) — 让 mode 不只是 instruction·有实际语言纹理

每一项都不能砍。**v3 才是 production-ready·v2 是 MVP-shell**。

### 实施前置·必要 dependency

- **项 2·8D personality 接入 stance 必先做** (~1-2d)·提供 `TM_NPC_Engine.aggregateDims` 入口·v3 层 3 直接复用
- **议程 tag 化** (step 3.1·0.5d)·跟项 2 可并行
- 项 1·aiPersonaText 注入·**可在 v3 任意时点做** (30min)·建议跟 step 3.8 一起·改一处 prompt 拼接

---

<a id="15"></a>
## 15. 验收标准·DoD

| # | 标准 | 测试方式 |
|---|---|---|
| 1 | mode 分布在 30 trial 中至少出现 5 种不同 mode | smoke 3.9.1 |
| 2 | rebut + second 占比 < 70% | smoke 3.9.1 |
| 3 | 同议题 6 NPC 输出 token-overlap < 0.4 | smoke 3.9.2 |
| 4 | 高名节 NPC 在 etiquette-violation 议题 oppose ≥ 80% | smoke 3.9.3 |
| 5 | 高复仇 NPC 在 target = 旧仇时 rebut ≥ 90% | smoke 3.9.3 |
| 6 | 8D 缺失剧本·v3 不崩·降到 Tier 1 流程 | manual 测·跑无 8D 的剧本 |
| 7 | AffinityMap 变化在朝议后可读·≥ 1 对 NPC 关系变 | manual 测 |
| 8 | 内存中可读 v3 mode trace·debug 友好 | `item.selfReact[i]._mode / _tone / _modeReason` 字段填充 |

---

<a id="16"></a>
## 16. 边界·不做什么

- ❌ **不让 LLM 决 mode** — 规则化才能保证可控·persona 通过层 3 修正·persona 仍有话语权
- ❌ **不做 mode 二次 LLM 推导** — L2 LLM 化版本·每议题 doubles API call·ROI 太低
- ❌ **不做议题完结 summary** — 那是 `_cc3_writeActionToGM` 的事·解耦
- ❌ **不做 NPC 主动插话/抢辩** — 顺序当前规则决定·改抢辩是另一项工程
- ❌ **不做 NPC 私下交易/串联** — 跟 _facIndex 派系系统耦合·不在本 backlog
- ❌ **不做 fallback 模板 persona-aware** — user 拍板不做 (backlog §5)
- ❌ **不做朝堂语自称的剧本可配** — 长期方案 4 范畴·明清自称兜底
- ❌ **不动 yuqian / tinyi** — 评估后再 port·初版只 changchao
- ❌ **不做 mode 概率分布编辑器** — 创作者用 mod 改难度的范畴·后续视需求

---

## 附·跟标尺对照

| 标尺 | v3 是否合规 | 说明 |
|---|---|---|
| A·Persona-first | ✅ 大幅改善 | 8D personality 接入 stance + mode modulation 15 条·persona 真正驱动行为 |
| B·3 层架构 | ✅ 保持 | 议题 tag = 机械事实·mode 推导 = 规则·prompt = AI 演绎层 |
| C·机制挂政治后果 | ✅ 大幅改善 | NPC-NPC AffinityMap linkage 让朝议**真的塑造朝堂派系网** |
| D·避免模板化 | ✅ 大幅改善 | 6 mode × 5 tone × 朝堂语词库·组合差异巨大·每个 NPC 不可互换 |

**v3 让常朝从 60% 合规升级到 ~95% 合规**·剩 5% 是 fallback 模板兜底 (user 不动)。

---

**memory 留档**·本 doc 替代 backlog §3·1+2+3 (v3) + 4 (long-term) 索引在·
- `web/docs/chaoyi-changchao-improvements-backlog.md` (项 1+2 + 项 3 摘要)
- `web/docs/chaoyi-npc-dialogue-design-v3.md` (本 doc·项 3 完整 spec)
- `web/docs/chaoyi-stance-weights-longterm.md` (项 4 长期)
