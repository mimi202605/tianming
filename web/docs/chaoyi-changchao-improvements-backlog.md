# 常朝·人物发言逻辑·改进 backlog

date·2026-05-21·status·**1 + 2 + 3 (v2) 已纳入·4 长期方案存档**

source·2026-05-21 评审报告 (本会话上文)·对照标尺·

- A·Persona-first 而非 stat-first (tm-npc-engine·tm-prompt-composer)
- B·3 层架构·机械事实 → AI 在事实约束内演绎 (UPGRADE_PLAN.md)
- C·机制必挂政治后果 ([[feedback_tool_vs_system_costs]])
- D·避免模板化无差异 (tm-prompt-composer L6-40)

---

## ✅ 已纳入 sprint (user 拍板)

### 1·`_cc3_aiGenReact` 注入 aiPersonaText / recognitionState (持平 wendui)

**问题**·`_cc3_aiGenReact` (tm-chaoyi-changchao.js:L799) 是 NPC 在朝议中**自发表态**生成器 (selfReact / debate / debate2 / dissent)。这条路径**没有**调 `TM.PromptComposer.buildAiPersonaText(gmCh)`·而**回玩家话**路径 (L1720) 调了。结果·NPC 自发议事时·persona 远薄于回玩家话·相当于朝堂上一群跑龙套·玩家一开口才变活人。

**对比对照**·

- `tm-wendui.js:L1644 _wdBuildPrompt` — 不分场景·**始终**注入 aiPersonaText + appearance + arc + AffinityMap + 后妃 9 分类 + stress
- `tm-faction-npc-llm-decision.js:L902 _buildPrompt(fac)` — 始终注入 ruler.aiPersonaText (capped 200 字)
- `tm-chaoyi-changchao.js:L1720` 玩家话回应 — 注入 ✅
- `tm-chaoyi-changchao.js:L799` 自发表态 — **缺** ❌

**fix**·

```js
// tm-chaoyi-changchao.js:_cc3_aiGenReact 内·拼完 stats 后追加
if (typeof TM !== 'undefined' && TM.PromptComposer && gmCh) {
  try {
    const _aiP = TM.PromptComposer.buildAiPersonaText(gmCh);
    if (_aiP) p += _aiP;
    const _rec = TM.PromptComposer.buildRecognitionState(gmCh);
    if (_rec) p += _rec;
  } catch (_) {}
}
```

**工作量**·~30 分钟·改一处·跑 verify-all·肉眼 sample 3-5 个 NPC selfReact 看是否更有 persona 味。

**ROI**·**最高**·一行换全场质量。

---

### 2·`_cc3_computeStanceFromChar` 接入 8D personality

**问题**·L1528-1594 立场打分用 party_tone (±0.45) / loyalty (±0.5) / integrity (±0.25) / rank / class·**完全没读 8D personality 维度** (勇敢·仁善·理性·贪心·名节·社交·复仇·精干)。`tm-npc-engine.js` 提供的 `getCharacterPersonalityBrief` 在 wendui / NPC 推演里用了·**在常朝立场推导里全程缺席**。

后果·两个忠诚 50 / 清廉 50 / 党派"东林"的官员·立场必然一样。违反"不可互换"原则 (标尺 A)。

**fix 方向**·

在 L1538-1588 现有 score 计算后·追加 8D 维度贡献·

```js
let persona8d = null;
try {
  if (typeof TM_NPC_Engine !== 'undefined' && TM_NPC_Engine.aggregateDims) {
    persona8d = TM_NPC_Engine.aggregateDims(ch);
  }
} catch(_) {}
if (persona8d) {
  if (item.violatesEtiquette && persona8d.mingjie > 60) score -= 0.20;
  if (item.tag === 'foreign-policy' && persona8d.yonggang > 60) score += 0.15;
  if (item.tag === 'reward-distribution' && persona8d.tanxin > 60) score += 0.25;
  if (item.tag === 'penal-harsh' && persona8d.renshan > 60) score -= 0.20;
  if (item.controversial >= 6 && persona8d.lixing > 60) score *= 0.7;
  if (item.target && persona8d.fuchou > 60 && _wasHarmedBy(ch, item.target)) score += 0.25;
}
```

**前置依赖**·

- `tm-npc-engine.js` 的 `aggregateDims` 入口是否 stable·若已是 namespace `TM.NpcEngine.aggregate(ch)` 之类·调用名跟一下
- 议题需打 `tag` (foreign-policy / penal-harsh / reward-distribution / etiquette-violation)·当前议题生成是否给 tag·若没·先加最小 4-5 个 tag

**工作量**·1-2 天·

- 0.5 天 — verify 8D 聚合 API + 跑通调用
- 0.5 天 — 议题 tag 化 (最小 4-5 个 tag)
- 0.5 天 — 加 6-8 个 persona × tag 贡献项 + 平衡 (不要让 personality 单边压过 party_tone)
- 0.5 天 — sample 测·同党同忠诚两个 NPC 在不同 persona 下立场出现差异

**ROI**·**高**·NPC 不再 stat-clone·朝议出现合乎 persona 的少数派立场。

---

### 3·NPC 应答化·朝议从"群聊"升级为"对话" (v3 设计·详 spec 见独立 doc)

> 📄 **完整设计文档**·`web/docs/chaoyi-npc-dialogue-design-v3.md`·v3 包含 6 mode + 朝堂语词库 + 15 条 persona 修正 + anti-monotony guards + NPC-NPC AffinityMap linkage + 议题 tagging + test harness + 完整 sample walkthrough (绍宋·南幸扬州·6 NPC × 2 round)。**总工作量重估·~5d (Tier 1)·~+1.5d (Tier 2)·共 ~6.5d**。
>
> 以下保留 v2 摘要供历史参考。

#### 问题重述

当前 prompt 只 differ-from·不 reply-to·

- L911·`殿中诸臣已表态（你须有差异）`
- L925·`议论·你须就议题表立场和理由（与他臣有别）`
- L940·`与已表态他臣有所区别·不重复其话`

intent 7 分类只识别**玩家话**·NPC 之间无 intent 链条。结果朝议是 N 个独立陈述·不是一场辩论。

#### 真实廷议的 6 类应答动态 (升级自 v1 的 5 类)

| Mode | 触发 | 内容范式 |
|---|---|---|
| `lead` | 首发 | 开门见山·提出主张 + 1 条理由 |
| `second` | 同党同立场 | 复述前者论点 1 句 + 1 条新理由/案例 (不全文复读) |
| `rebut` | 异党异立场 | 复述其论点 1 句 + 反驳 1 句·语气随 rank 变 |
| `soften` | 同党异立场 | 先肯定其忠悃·再婉言陈己见 |
| `pivot` | 中立/中场 | 提议题未被讨论的侧面·或转 procedural (建议交某部再议) |
| `cite` | 理性/学识高·议题有先例 | 引经据典·托古证今·援引故事案例 |

每个 mode 都是**强制 instruction**·而非建议——LLM 拿到的不是"你可以"而是"你**必须**以 X 模式发言·先 Y 再 Z"。

#### v2 vs v1 的关键升级

v1 只做 stance-arithmetic·v2 加 4 层修正·

##### 层 1·debate state 分析 (替代 v1 只看 last speaker)

```js
function _cc3_analyzeDebate(item, speakerName, gmCh) {
  const prior = ((item.selfReact || []).map(r => ({...r, _src:'self'})))
    .concat((item.debate || []).map(d => ({...d, _src:'debate'})));
  if (!prior.length) {
    return { priorCount: 0, lastSpeaker: null, mode: 'lead' };
  }
  const myStance = _cc3_computeStanceFromChar(speakerName, item, item._lastEmperorIntent || 'neutral');
  const last = prior[prior.length - 1];

  let sameStanceCount = 0, oppStanceCount = 0;
  let alliesPiledOn = 0, alliesLost = 0;
  prior.forEach(r => {
    if (r.stance === myStance) sameStanceCount++;
    if (_oppositeStance(r.stance, myStance)) oppStanceCount++;
    if (_sameParty(CHARS[r.name], gmCh) && r.stance === myStance) alliesPiledOn++;
    if (_sameParty(CHARS[r.name], gmCh) && _oppositeStance(r.stance, myStance)) alliesLost++;
  });

  // 阵营态势 (近 3 位)
  const last3 = prior.slice(-3);
  const last3Same = last3.filter(r => r.stance === myStance).length;
  const momentum = last3Same >= 2 ? 'consensus-with-me'
                : last3Same === 0 ? 'consensus-against-me'
                : 'split';

  return {
    priorCount: prior.length,
    lastSpeaker: last.name,
    lastStance: last.stance,
    lastSamePartyAsMe: _sameParty(CHARS[last.name], gmCh),
    myStance,
    sameStanceCount, oppStanceCount,
    alliesPiledOn, alliesLost,
    momentum,
    emperorIntent: item._lastEmperorIntent || 'neutral',
  };
}
```

##### 层 2·base mode inference (规则·6 类 mode)

```js
function _cc3_baseMode(state, gmCh, item) {
  if (state.priorCount === 0) return 'lead';
  // 强约束·议题点名你 → 自辩 (走 oppose 单独路径·非本 mode 表)
  if (item.target === gmCh.name) return 'rebut';  // 借 rebut 模式自辩
  // 同党同立场
  if (state.lastSamePartyAsMe && state.lastStance === state.myStance) return 'second';
  // 异党异立场
  if (!state.lastSamePartyAsMe && _oppositeStance(state.lastStance, state.myStance)) return 'rebut';
  // 同党异立场
  if (state.lastSamePartyAsMe && state.lastStance !== state.myStance) return 'soften';
  // 中立 → 随机 pivot / augment
  if (state.myStance === 'neutral') return Math.random() < 0.5 ? 'pivot' : 'augment';
  // 其他 → 默认补充
  return 'augment';
}
```

##### 层 3·personality modulation (8D 修正 base mode)

| 触发条件 | base mode | 修正 |
|---|---|---|
| 仁善 ≥ 60 | rebut | → soften (除非 oppStanceCount ≥ 3·阵营失势再让他出手) |
| 复仇 ≥ 70·上一位 = 曾损害本人/同党 | second/augment | → rebut |
| 理性 ≥ 70·议题有 historicalPrecedent tag | 任意 | 追加 cite 修饰 (不替换 mode·加引证段) |
| 名节 ≥ 70·议题 violatesEtiquette | 任意 | 强制 rebut·即便同党 |
| 社交 ≥ 70·alliesLost ≥ 2 | rebut | → soften (社交达人在阵营失势时找台阶) |
| 精干 ≥ 70·议题为执行类 (执行细节 tag) | augment | → pivot to specific (具体方案) |

##### 层 4·rank/class tone modulation (语气层·不改 mode)

| 条件 | tone instruction |
|---|---|
| rank ≤ 2 (阁臣) + rebut | 委婉·复述论点 2 句 + 驳 1 句·末加"伏乞圣裁" |
| rank ≥ 5 (郎官以下) + rebut | 不直接驳·建议交都察院/三法司再议 |
| class === 'kdao' (言官) + rebut | 直接·激烈·可点名同党反对者 |
| class === 'wuchen' (武臣) + rebut | 粗朴直白·少修辞·"末将以为..." |
| 任意 + second | 简短·不啰嗦·"臣附议·惟补 X" |

##### 层 5·cumulative reference (≥ 3 人发言后)

```js
function _cc3_cumulativeHint(state) {
  if (state.alliesPiledOn >= 3) {
    // 同党已强 → 强调附议而非啰嗦
    return '·诸臣多言此·汝可一字千钧附议·或言"诸臣已具陈·臣略补 X"·勿啰嗦';
  }
  if (state.oppStanceCount >= 3 && state.sameStanceCount === 0) {
    // 阵营失势 → 据理力争或折中
    return '·此议你方已落下风·或据理力争·复述同党论点 + 新论据·或退而求折中案';
  }
  if (state.momentum === 'consensus-against-me') {
    return '·近 3 位皆反·若再硬刚需有重磅理由·否则宜软化或转 pivot';
  }
  return '';
}
```

##### 层 6·emperor cue tracking (跨发言传递)

回玩家话路径 (L1720) 已识别 intent。把它**存到 item._lastEmperorIntent**·让后续 NPC selfReact / debate 读·

```js
// L1720 周围·intent 识别后追加
if (intent && item) item._lastEmperorIntent = intent;
```

selfReact / debate prompt 加·

```js
if (state.emperorIntent === 'praise') {
  p += '【陛下方才嘉许上一位发言·氛围倾向附和·若你 stance 异·当慎言或软化】\n';
}
if (state.emperorIntent === 'punish') {
  p += '【陛下方才训诫上一位·此人此刻较孤立·阵营机会落井下石·须慎度自身立场】\n';
}
if (state.emperorIntent === 'doubt') {
  p += '【陛下方才怀疑上一位·宜援引故事或提折中案·勿一味跟从】\n';
}
```

#### v2 完整 prompt 结构 (在原 prompt 基础上追加)

```
── 殿中诸臣已表态 ──
李纲（反对）：臣以为南幸非计...
宗泽（反对）：北望东京·二圣尚陷...
黄潜善（支持）：兵戎甫息·圣体宜安...

── 你的应答策略 ──
模式：rebut (异党异立场·上一位 黄潜善 为主和派·你为主战派)
策略：先复述其论点 1 句 + 反驳 1 句·语气直接 (你是言官)
近 3 位同党连续发言·阵营尚强·可一字千钧·附议同党 + 驳此言
【陛下方才训诫黄潜善·此刻可落井下石·但须慎度自身立场】

【引证】你 理性 72·此议涉建炎初南幸·有先例可援 (建武渡江·光武中兴)

要求：
- 半文言·言官 (kdao) 口吻·直接·激烈·可点名
- 必须先复述黄潜善论点 1 句 ("黄给事方言兵戎甫息·圣体宜安")
- 再反驳 1 句 (具体理由)
- 可援引建武渡江故事 (你理性高·议题有先例)
- 字数 50-120
```

#### 实现 7 步 (分两 tier·MVP + 进阶)

**Tier 1·MVP (~2-2.5d)**·只做层 1+2+3+4·即基础对话动态

| 步 | 内容 | 工作量 |
|---|---|---|
| 3.1 | `_cc3_analyzeDebate` debate state 分析器 + `_sameParty` / `_oppositeStance` helper | 0.5d |
| 3.2 | `_cc3_baseMode` 6 类 mode 推导 + `_cc3_inferReactionMode` 主入口 | 0.5d |
| 3.3 | 层 3 8D persona modulation·调用 `TM_NPC_Engine.aggregateDims` (依赖项 2 已完成) | 0.5d |
| 3.4 | 层 4 rank/class tone instruction 5 套 + prompt 拼接到 `_cc3_aiGenReact` | 0.5d |
| 3.5 | sample 测·跑 5-10 个 NPC 在 3 轮辩论的输出·检查 mode 多样性·tune | 0.5d |

**Tier 2·进阶 (~+1-1.5d)**·加层 5+6·让对话有"势头"和"皇威 trace"

| 步 | 内容 | 工作量 |
|---|---|---|
| 3.6 | 层 5 cumulative reference (`_cc3_cumulativeHint`) | 0.3d |
| 3.7 | 层 6 emperor cue tracking·item._lastEmperorIntent 跨发言传递 | 0.5d |
| 3.8 | 进阶 sample 测·5+ 人辩论时观感是否升级 | 0.4d |

#### 风险与对策

| 风险 | 对策 |
|---|---|
| **prompt 膨胀** — 当前 1000-1500 字·v2 加 ~200-300 字·总 ~1800 字 | 监控·若有模型 token 限制·分别 prompt (system + user)·或精简 base 描述 |
| **mode instruction 太复杂·LLM 简化忽略** | 关键 instruction 用 `【必须】` 强约束·末尾加 `不得脱离此模式·脱离视为生成失败` |
| **alliesPiledOn / momentum 计算不准** (议题缺 stance/party tag 时) | fallback 到 v1 简单 mode (lead/augment 二选一)·不崩 |
| **personality modulation 过度·NPC 反复横跳** | 测试时 sample 30+ 输出·看 mode 分布·若单边压倒·调权重 |
| **emperor cue 跨发言串扰** (item._lastEmperorIntent 未 reset) | 议题结束时 _cc3_writeActionToGM 清空·或议题切换时 reset |

#### 不做的边界

- **不让 LLM 决定 mode** — 规则化才能保证可控对话动态·persona 通过 layer 3 修正 mode·persona 仍有话语权
- **不做议题完结 summary** — 那是 _cc3_writeActionToGM 的事·跟发言生成解耦
- **不做 NPC 主动插话/抢辩** — 现在发言顺序规则决定·改抢辩是另一项工程
- **不做 NPC 私下交易/串联** — 跟 _facIndex 派系系统耦合·不在本 backlog
- **不做 mode 二次 LLM 推导** — 规则版 (L1) 不走二次 API call·L2 LLM 化版本 ROI 太低·**砍掉**

#### 跟项 1·2 的耦合点

- 项 2 (8D personality 接入 stance) 完成后·层 3 的 personality modulation 可直接读 `TM_NPC_Engine.aggregateDims`·**项 3 强依赖项 2**·必须 2 先做或同 sprint 做
- 项 1 (aiPersonaText 注入) 跟项 3 独立·先后都可
- **推荐 sprint 顺序**·1 → 2 → 3.1-3.5 (Tier 1) → (可选) 3.6-3.8 (Tier 2)

#### 总工作量与 ROI

| 套餐 | 内容 | 工作量 | ROI |
|---|---|---|---|
| Tier 1 MVP | 3.1 - 3.5 | ~2.5d | **高** — 朝议从"群聊"变"对话"·80% 价值 |
| Tier 1 + Tier 2 | 3.1 - 3.8 | ~4d | **中高** — 加 emperor cue trace + 阵营势头·完整闭环 |

**强烈建议先做 Tier 1·sample 跑过再决定是否上 Tier 2**·

---

## 📦 长期方案存档·候选 4

**立场权重剧本化** — 见 `web/docs/chaoyi-stance-weights-longterm.md`·

理由·当前权重 0.45/0.50/0.25/0.15 硬编码·不可剧本配置·违反"编辑器是宪法制定者"原则·但·

- 玩家不会调这数·只创作者用·**用户基数小**
- 当前剧本只有"天启七年"和"绍宋"两套·没出现"气候不合"的痛
- 项 1+2+3 落地后·朝议层已大改·此时再做权重剧本化是锦上添花
- 优先级被 sprint 1+2+3 推后·**不立即实施**·待创作者催再启动

---

## 优先级建议 (修订)

| # | 项 | 工作量 | ROI | 时机 |
|---|---|---|---|---|
| 1 | aiPersonaText 注入到 selfReact 路径 | 30min | 极高 | sprint 顺手做 |
| 2 | 8D personality 接入 stance 计算 | 1-2d | 高 | 独立 slice |
| 3·Tier 1 | NPC 应答化 MVP (6 mode + 4 layer) | 2.5d | 高 | 项 2 完成后做 |
| 3·Tier 2 | 应答化进阶 (cumulative + emperor cue) | 1.5d | 中高 | Tier 1 sample 后决定 |
| 4 | 立场权重剧本化 | — | — | **长期存档·待催** |

---

## 相关代码锚点

- `tm-chaoyi-changchao.js:L799` — `_cc3_aiGenReact` 自发表态生成 (P 项 1+3 主目标)
- `tm-chaoyi-changchao.js:L894-911` — peer lines 拼接 (P 项 3 的修改点)
- `tm-chaoyi-changchao.js:L922-930` — role-specific task instruction (P 项 3 替换 + 扩展)
- `tm-chaoyi-changchao.js:L1528-1594` — `_cc3_computeStanceFromChar` (P 项 2 主目标)
- `tm-chaoyi-changchao.js:L1720-1834` — 玩家话回应 prompt (P 项 1 的参考 base + 项 3·Tier2 emperor cue 注入点)
- `tm-chaoyi-changchao.js:L420-456` — `_cc3_enhanceAgendaItem` selfReact/debate 池生成
- `tm-chaoyi-changchao.js:L2446-2557` — `_cc3_writeActionToGM` 后果回流 (Tier 2 emperor cue reset 处)
- `tm-prompt-composer.js` — buildAiPersonaText / buildRecognitionState 入口
- `tm-npc-engine.js:L21-100` — 8D personality 聚合入口 (P 项 2+3 共用)

---

**memory 留档**·本 doc 入存档时·MEMORY.md 加一行 `[常朝发言改进 backlog]`·链回此文件。
