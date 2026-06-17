# 廷议大改 Sprint·完整 kickoff plan

date·2026-05-22·status·**draft·v1.4 (post-disk-incident rebuild)·待 user 拍板正式启动**

source·

- `tm-tinyi-v3.js` (3942 行)·已完成代码骨架 (波 1-4·阶段 0-7)
- `tm-chaoyi-tinyi.js` (791 行)·v2·当前生效
- `tm-chaoyi-changchao.js` (~4700 行)·常朝大改的玩家发言处理蓝本 (§A)
- `web/docs/changchao-overhaul-sprint.md`·常朝大改 paradigm 蓝本
- `web/docs/chaoyi-npc-dialogue-design-v3.md`·v3 spec
- Audit·2026-05-22·prerequisite 报告·见 §10

**v1.x 修订史**·

- v1.0·初稿·11 slice·~15.5-17.5d
- v1.1·加 §A (玩家发言重做·删浮按钮) + §B (10 维度对照) + §C (UI/ceremony/hotkey)·14 slice·~19-22d
- v1.2·加 §D 6 mockup·1224 行
- v1.3·加 §E 召集制完整设计 (E.0-E.8) + Slice 2.5 + E.9 民意度 + E.10 言官离心·15 slice·~21-24d·1868 行
- **v1.4** (today·post-disk-incident rebuild + tuning)·6 处调整·见 §F

---

## 0. TL;DR

廷议从 v2 (路·`_ty2_*`·"轮询发言") 升级到 **v3 + 常朝 paradigm + 廷议特化 ceremony + 灵活玩家发言 + 召集制专题** (路·`_ty3_*`·"廷议对话链 + 派系对决 + 真争吵 + 殿堂仪式 + 政治召集")。

工时·**~22-25d** (v1.4 含 prestige 资格层 + AI tag 扩 + mentor 联动 + NPC 主动发议题)。

策略·**v3 P.conf flag 灰度·默认 off**·设置面板可开·sprint 完后视稳定度反转默认。

**v1.4 调参核心** (今日修订)·

1. **民意度 5 档调小**·effect 减半 (loyalty ±1 → ±0.5)·apply 频率按 daysPerTurn 归一·按 dynasty 微调衰减率
2. **言官 4 阈值更密**·30/50/70/90 → 20/40/60/80·跨阈值 2-3 turn buffer 给玩家救
3. **漏召单次缩减**·loyalty -5 → -3·按 prestige 加权 (高声望加倍·低声望减半)
4. **AI 推荐扩 11 tag**·15 → 27 tag (灾赈/河工/历法/漕运/海防/北防/钞法/田赋/经筵/选官/监察)
5. **mentor + 召集联动**·召 X 时 UI 建议同召 X 的 mentee
6. **NPC 主动发议题** (新加 §E.11)·廷议触发 3 路径 (玩家主动 / NPC 上书 / 剧情 escalate)
7. **prestige 加 layer 6 资格筛**·composite=(prestige+influence)/2·极高 90+ 不论品级必召·低声望低品降级不召

---

## 1. Sprint 目标

把廷议从 **60% 实施·40% 残骸** (v3 写完但被 gate·v2 跑但缺 paradigm) 升级到 **~95% 实施 + paradigm 完整 + 4 mode 廷议特化 + 召集制专题**·

- ✅ v3 8 阶段 (议前预审 / 起议 / 辩议 / 廷推 / 钦定 / 草诏 / 用印 / 追责) 真激活
- ✅ 常朝 paradigm 全量移植 (8D dims·议题 tag·persona modulation·6 mode)
- ✅ 廷议特化 4 mode·`confront` / `cite_classic` / `clientelism` / `martyr`
- ✅ **召集制完整设计** (§E)·6 资格层 (含 prestige) + 5 后果 + 4 策略 + AI 推荐 27 tag + 必召检测 + 漏召警告 + 朝代差异 (明 / 宋 / 唐) + 民意度 + 言官离心 + mentor 联动 + NPC 主动发议题
- ✅ 裁决反弹·输方写恨意 / loyalty / prestige / 党争状态变更
- ✅ mentor 字段补到天启/绍宋同期出道人 (~50 关系) 让 clientelism + 召集联动真触发
- ✅ traitIds 5 剧本补齐 (崇祯/挽天倾/晋/大明/111)·~121 字符
- ✅ 删除 v3 "朕意" 浮按钮 + native prompt()·改用底部 input + 关键词/intent/代词/点名 parser
- ✅ 8 个廷议特化动词 + 3 个特化 intent + ceremony hooks
- ✅ 廷议 vs 常朝 10 维度差异化 (§B)
- ✅ 廷议独有 ceremony UI + 7 个独有快捷键 (§C)
- ✅ smoke 守门·5 剧本 × 2 议题验收

**不在本 sprint**·

- yuqian (御前会议) port·留 post-sprint backlog
- 廷推算法重写·v3 现按 influence 加权抽签继续用
- 长期·议题词条剧本化 (war stance 不剧本化·v3 stage 2 内置规则)
- 长期·朝代差异化朝堂语 (明清统一·宋唐先不做)

---

## 2. 依赖图

```
        ┌──────────────────────────────────────────────────────────┐
        │  Slice 0·prep·解 v3 gate + flag + baseline + 删浮按钮 prep │
        └───────────┬──────────────────────────────────────────────┘
                    │
        ┌───────────┼─────────────────────────────────────┐
        │           │                                     │
        v           v                                     v
   ┌────────────┐  ┌─────────────────────┐  ┌────────────────────────┐
   │ Slice 1    │  │ Slice 2             │  │ Slice 4·常朝 paradigm  │
   │ traitIds   │  │ 议题 tag 扩 27·     │  │ 移植·aiPersonaText +    │
   │ 5 剧本补   │  │ topicType → tag 映射 │  │ 8D dims 注入 prompt    │
   │ 1.5d       │  │ 1.2d (v1.4 含 11 tag│  │ 1.5d                   │
   └────────────┘  └──────────┬──────────┘  └─────────┬──────────────┘
                              │                       │
                              v                       │
                   ┌──────────────────────────┐       │
                   │ Slice 2.5·【新·v1.4 进阶】│       │
                   │ 召集制·6 资格 + 5 后果 + │       │
                   │ AI 推荐 + 朝代三套 +     │       │
                   │ mentor 联动 +            │       │
                   │ NPC 主动发议题·          │       │
                   │ 民意度 + 言官离心        │       │
                   │ 2.5d (v1.3 base 1.5 +   │       │
                   │       v1.4 进阶 1.0)    │       │
                   └──────────┬──────────────┘       │
                              │                       │
                              v                       │
                   ┌────────────────────────┐         │
                   │ Slice 3·8D dims 接入   │         │
                   │ stance·fallback 85%    │         │
                   │ 1.5d                   │         │
                   └──────────┬─────────────┘         │
                              │                       │
                              └────────┬──────────────┘
                                       │
                                       v
                  ┌────────────────────────────────────────────┐
                  │ Slice 4.5·【新】玩家发言 paradigm·         │
                  │   删 v3 浮按钮·移植常朝 onPlayerSpeak      │
                  │   8 phase 分发·13 词 + 11 intent           │
                  │   1.5d (§A)                                │
                  └──────────────────┬─────────────────────────┘
                                     │
                                     v
                            ┌────────────────────────┐
                            │ Slice 5·10 mode 全实现 │
                            │ (6 常朝 + 4 廷议)      │
                            │ 2.0d                   │
                            └──────────┬─────────────┘
                                       │
                                       v
                            ┌────────────────────────┐
                            │ Slice 6·~25 persona ×  │
                            │ tag 规则·rule engine   │
                            │ 1.5d                   │
                            └──────────┬─────────────┘
                                       │
                                       v
                            ┌────────────────────────┐
                            │ Slice 7·真对质·confront│
                            │ + "助 A / 助 B / 敕停" │
                            │ 1.5d                   │
                            └──────────┬─────────────┘
                                       │
                                       v
                  ┌────────────────────────────────────────────┐
                  │ Slice 7.5·【新】廷议特化动作 + ceremony    │
                  │   仗下 / 削籍 / 摘除 / 转部议 / 更议·      │
                  │   廷杖 / 削籍 gold-screen / 摘除 ban       │
                  │   0.5d (§B 廷议动词)                       │
                  └──────────────────┬─────────────────────────┘
                                     │
                                     v
                            ┌────────────────────────┐
                            │ Slice 8·裁决反弹 +     │
                            │ minority loyalty/党争   │
                            │ + 召集后果二次惩罚 +    │
                            │ 民意度衰减接入          │
                            │ 1.2d                   │
                            └──────────┬─────────────┘
                                       │
                                       v
                  ┌────────────────────────────────────────────┐
                  │ Slice 8.5·【新】廷议特化 ceremony UI·      │
                  │   三班升级·立场板放大·潮汐条·             │
                  │   confront 虚线·10 mode 视觉·7 hotkey     │
                  │   1.5d (§C)                                │
                  └──────────────────┬─────────────────────────┘
                                     │
                                     v
                            ┌────────────────────────┐
                            │ Slice 9·cumulative +   │
                            │ emperor cue Tier 2     │
                            │ 0.5d                   │
                            └──────────┬─────────────┘
                                       │
                                       v
                            ┌────────────────────────┐
                            │ Slice 10·mentor 字段补 │
                            │ + clientelism + 联动启 │
                            │ 1.5d                   │
                            └──────────┬─────────────┘
                                       │
                                       v
                            ┌────────────────────────┐
                            │ Slice 11·smoke + DoD + │
                            │ sprint summary doc     │
                            │ 1.5d                   │
                            └────────────────────────┘
```

**关键路径**·Slice 0 → 2 → 2.5 → 3 → 4 → 4.5 → 5 → 6 → 11·~13d
**全路径**·~22-25d
**vs v1.3**·+1d (Slice 2.5 进阶到 2.5d·NPC 发议题 + mentor 联动 + prestige 层)

---

## 3. Slice 拆解

### Slice 0·prep·解 v3 gate + flag + baseline + 浮按钮 prep (0.5d)

**任务**·
- 找 `tm-tinyi-v3.js` L1540 override gate 条件·读懂为什么没通过
- 加 `P.conf.useTinyiV3` flag·默认 `false`
- 改 `_cy_pickMode('tinyi')` → `P.conf.useTinyiV3 ? _ty3_open() : _ty2_openSetup()`
- 设置面板加 toggle (`tm-patches.js` 现有 P.ai toggle 区)·label "廷议·新框架 (v3·测试中)"
- 浮按钮 mark for delete (Slice 4.5 真删)
- 跑 v3 8 阶段 smoke·5 剧本各 1 议题·dump baseline 到 `web/scripts/_baseline-tinyi-before-prompts.json`

**DoD**·
1. flag=true 时·`_cy_pickMode('tinyi')` 走 `_ty3_open`
2. flag=false 时·v2 完整保留
3. baseline 文件 commit

### Slice 1·5 剧本 traitIds 补 (1.5d)

**任务**·
- 复用 `web/tools/fill-shaosong-traits.js`
- 批跑·崇祯 (45) / 挽天倾 (44) / 111 (32) / 晋 (1) / 大明 (1)·共 ~123 chars
- 抽 10 chars 手验·崇祯 5 + 挽天倾 5
- 跑 `calibrate-derived-health.js` 确认 8D aggregateDims ≥ 95% 非全 0

**DoD**·
1. 5 剧本 traitIds 覆盖率 → 100%
2. 抽 10 chars 手验·top 6 traits 合理
3. `aggregateDims` 任 NPC 上 ≥ 95% 非全 0

### Slice 2·议题 tag 扩 27 + 映射 (1.2d·v1.4 + 0.2d)

**任务**·
- v3 顶部加 `TINYI_TOPIC_TAGS`·27 个 (原 16 + 新 11)
- 写 `_ty3_inferTopicTags(topicType, topicText)`·两层·topicType 映射 + 文本 keyword
- `phase2_run` prompt 加 "本议题标签·" 段

**v1.4 新加 11 tag**·

```
relief             灾赈
river-works        河工
calendar           历法
canal-transport    漕运
coastal-defense    海防
northern-defense   北防
currency           钞法 / 银法
land-tax           田赋
imperial-lecture   经筵
official-selection 选官 / 廷推
inspection         监察
```

详见 §E.4·关键词触发也同步扩 (灾/疫/旱/涝/河/水利/历/漕/海/北/钞/银/田/赋/经筵/选官/察)。

**DoD**·
1. "盐法改革" → `[finance, reward]`
2. "九边粮饷" → `[finance, northern-defense, border-affairs]`
3. "黄河决堤" → `[river-works, relief, finance]`
4. "立朱由检" → `[succession, ritual-major]`
5. "诛戮魏珰" → `[regicide-pursuit, execution, personnel]`
6. 27 个 tag 各能至少 1 议题触发

### Slice 2.5·【新·v1.4 进阶】廷议召集制完整设计 (2.5d)

**做什么**·见 §E 完整设计。v1.4 进阶含·

- 6 层资格筛 (品级 / 在场 / 状态 / 朝代 / 党派 / **prestige** v1.4 新)
- 5 政治后果 (漏召 / 召敌党 / 全一党 / 平衡 / 大廷议)·**v1.4 漏召缩减 -5 → -3 + prestige 加权**
- 4 召集策略 (九卿 / 专家 / 大会战 / 大廷议)
- AI 推荐 27 tag (v1.4 新加 11)
- 必召检测 + 漏召警告
- 朝代差异化 (明 / 宋 / 唐 三套一次完)
- 召集民意度 (E.9·**v1.4 调小**)
- 言官离心度 (E.10·**v1.4 阈值更密**)
- **mentor + 召集联动** (v1.4 新·E.11)
- **NPC 主动发议题** (v1.4 新·E.12)

**工时分布**·

| 子任务 | d |
|---|---|
| 6 层资格筛 (含 prestige 层 v1.4 新) | 0.4 |
| AI 推荐·27 tag 映射 (v1.4 扩) + 三步推荐 | 0.4 |
| 召集 modal·3 视图切换 UI | 0.4 |
| 必召检测 + 漏召警告 + 5 后果 (v1.4 prestige 加权) | 0.3 |
| 朝代差异·明 / 宋 / 唐 三套 | 0.2 |
| 民意度 (E.9·v1.4 调小 + dynasty + daysPerTurn) | 0.3 |
| 言官离心 (E.10·v1.4 阈值更密 + buffer) | 0.2 |
| mentor + 召集联动 (v1.4 新) | 0.2 |
| NPC 主动发议题 (v1.4 新) | 0.1 |

**DoD** (12 项·v1.4 新加 2 项)·

```
1.  _ty3_calcEligibility 6 层正确 (含 prestige)
2.  AI 推荐覆盖 27 tag
3.  召集 modal 3 视图切换工作
4.  必召强制
5.  漏召警告 + prestige 加权 (高声望加倍·低声望减半)
6.  _ty3_calcConveningPolitics 5 后果触发
7.  CY._ty3.conveningPolitics 写入·Slice 8 反弹能读
8.  朝代差异·明 / 宋 / 唐 三套
9.  GM._convening_民意度·调小后 ±5/次·dynasty 差异化 decay·daysPerTurn 归一·5 档影响减半
10. GM._convening_言官离心·阈值 20/40/60/80·跨阈值 buffer 2-3 turn
11. mentor 联动·召 X 时 UI 建议同召 mentee·一键加召工作
12. NPC 主动发议题·NPC.urgency + memorial.type==='request_tinyi' → 入 GM._pendingTinyiTopics
```

### Slice 3·8D dims 接入 stance + fallback B 85% (1.5d)

**任务**·复用常朝 `_cc3_*` → `_ty3_*`·扩 keyword 词表·接入 Slice 2 tag。

**DoD**·`_ty3_getDims` 任 NPC 返非全 0 ≥ 95%·stance 分布 `极支+极反` ≥ 20%。

### Slice 4·aiPersonaText + 党派 + learning 注入 prompt (1.5d)

**任务**·v3 phase2 prompt 加 4 段·

- aiPersonaText (人格摘要)
- recognitionState (记忆 + arc)
- 党派 stance (focal_disputes + policyStance)
- learning 段 (高经史学识铺垫 cite_classic)

**DoD**·prompt 体积 +600 token / NPC·persona 注入率 ≥ 70%。

### Slice 4.5·【新】玩家发言 paradigm 重做 (1.5d)

**做什么**·见 §A 完整设计。摘要·

- DELETE·v3 浮按钮 + 5 选项面板 + 5 个 prompt() handler + CSS + DOM
- REUSE·v2 `#cy-input-row` (底部 input)
- ADD·`_ty3_onPlayerSpeak`·8 phase 分发·复用常朝逻辑

**关键词扩 13 词** (常朝 5 + 廷议 8)·

```
准/驳/留中/下廷议/部议 (常朝继承)
敕停 / 钦点 / 仗下 / 削籍 / 摘除 / 转部议 / 更议 / 革职 (廷议特化)
```

**intent 11 类** (常朝 8 + 廷议 3·arbitrate / dispatch / ceremonial)。

**廷议特化抢答** (Slice 4.5)·

- confront 链中·"助 X" → 选边
- arbitrate intent → confront 链立即结束
- dispatch intent → 召集 / 摘除
- mentee 抢答·玩家 punish mentor·mentee 按 honor 决定护师 / 背师

**DoD** (9 项)·见 §A.6 末。

### Slice 5·10 mode 全实现 (2.0d)

**做什么**·6 常朝 mode (lead/second/rebut/soften/pivot/cite) + 4 廷议 mode (confront/cite_classic/clientelism/martyr)·

```js
const TINYI_MODES = {
  lead:        { prompt: '你首发言主奏', tone: '庄重' },
  second:      { prompt: '附议·宜简' },
  rebut:       { prompt: '驳前议·不指名' },
  soften:      { prompt: '认可两边再补一刀' },
  pivot:       { prompt: '折中 / 另案' },
  cite:        { prompt: '用专业数据反驳' },
  confront:    { prompt: '直接点名 {targetName}·"X 公此论..."' },
  cite_classic:{ prompt: '援经引典·《尚书》《大学衍义》' },
  clientelism: { prompt: '门生·"先师之论·门人不敢异"' },
  martyr:      { prompt: '言官冒死直谏·"臣愿伏阙"' }
};
```

**DoD**·每 mode 至少 1 trigger·mode 分布熵 ≥ 1.8 bit。

### Slice 6·~25 persona × tag 规则 + tone (1.5d)

**做什么**·`_ty3_modulateModeByPersona` ~25 条规则·按 8D dims × topic-tag·

```
高 honor + etiquette → rebut/confront (force)
高 compassion + rebut + 寡势 → soften
高 boldness + regicide-pursuit → martyr
高 rationality + finance → cite_classic/cite
高 greed + reward → second
...
```

tone modulation·阁臣庄重 / 言官激切 / 武将直白 / 勋戚谨慎 / 外戚柔曲。

anti-塌缩 guard·同 mode ≥ 3 → 切换·全员同 stance ≥ 4 → 强 oppose·confront cooldown·martyr 一议最多 1。

**DoD**·25 sample·mode 熵 ≥ 1.8 bit·4 guard 各至少 1 次触发。

### Slice 7·真 NPC vs NPC 对质 + 续议 (1.5d)

**做什么**·confront mode 触发对质链·

```
A confront B → next round·B prompt 加 "X 刚才对你言「Y」·请回应"
→ 链最多 2 round backforth (maxConfrontChain=2)
→ 链结束·_affinityMap[A][B] -= 10
→ phase2 finalize·若链未结束·让 phase2 多跑·避免半截
```

玩家面·footer 加 "助 A / 助 B / 敕停" 按钮组。

**DoD**·5 议题·至少 2 confront·1 完整 2-round·affinity 写入。

### Slice 7.5·【新】廷议特化动作 + ceremony (0.5d)

**做什么**·见 §B (廷议动词)·6 handler·

```
仗下 X    廷杖·loyalty -10·prestige -5
削籍 X    革除官职·loyalty 归零·从 attendees 移除
摘除 X    退殿·favor -3·attendees 临时移除
转部议    议题转 X 部·廷议结束
更议      重启本议题·attendees 重发
革职 X    永久革除·从 GM.chars 移除
```

ceremony hook·

- 廷杖动画·gold-screen "🔨 廷杖 X 二十" 5s
- 削籍 gold-screen + 全场气氛 → cautious
- 摘除·简短 ban
- 更议·"敕令更议" 字样

**DoD**·6 动作触发·3 ceremony 显示·3 pendingEvents 入队。

### Slice 8·裁决反弹 + minority loyalty / 党争 + 召集后果二次惩罚 (1.2d)

**做什么**·v3 phase6 用印后·

```
minority = stance != finalStance 的 attendees
foreach·
  loyalty -3 ~ -5 (按 stance 强度)
  affinity.toEmperor -3 ~ -5
  若 martyr 触发的·_pendingMartyrEvents 入队

党争·
  losingParty.tension +1
  winningParty.morale +1

召集后果连锁 (v1.4)·
  若召集时偏倚 → 反弹强度 × 1.5 (二次惩罚)
  若召集时民意度 ≤ -50 → minority loyalty 额外 -2

民意度 / 言官离心 decay (每月 endturn 钩子)·按 dynasty + daysPerTurn
```

**DoD**·5 case 反弹正确·martyr 入队·sc_consolidate prompt 含反弹 hint·召集偏倚的议题反弹强度 × 1.5。

### Slice 8.5·【新】廷议 ceremony UI 升级 (1.5d)

**做什么**·见 §C 完整设计·

- 三班站班·内阁紫 / 部院绯 / 言官绿·头像 + 立场色点
- 立场板放大版·9 stance × N NPC 矩阵 (按 T 弹出)
- 潮汐条·主战 vs 主和 实时百分比
- confront 红色虚线 + 箭头
- 10 mode 视觉区分 (rebut 红箭 / soften 金波 / cite 书页 / confront 虚线 / etc)
- 5 ceremony 动画·鸣鞭 / 钦定 / 草诏 / 用印 / 追责
- 7 hotkey 注册·T / 1-9 / [/] / M / Ctrl+Enter / H / Esc(二次确认)

**DoD** (7 项)·见 §C 末。

### Slice 9·cumulativeHint + emperorCue (0.5d)

**做什么**·复用常朝 Slice 9 代码·`_ty3_cumulativeHint` (3+ 同党附议时·后续 NPC 一字千钧) + `_ty3_emperorCueHint` (玩家话语 → intent → 写 `item._lastEmperorIntent`)。

**DoD**·5 NPC 同党同议题·第 3-5 个明显短·玩家"严办"·后续 NPC stance 偏 oppose +20%。

### Slice 10·mentor 字段补 + clientelism + 联动启用 (1.5d)

**做什么**·

- 手补天启 mentor ~30 关系·绍宋 ~15
- `_ty3_buildMentorIndex(GM.chars)`·反向索引·缓存到 `GM._mentorIndex`
- clientelism 触发·NPC 看到 mentor 极支/极反·70% 概率附议
- **mentor + 召集联动 (v1.4)**·UI 在召集 modal 显示 "X 的门生·建议同召 Y/Z"·点 "+一并召门生" 一键加召

**DoD**·天启 mentor ≥ 30·绍宋 ≥ 15·clientelism 5 议题中触发 ≥ 3·mentor 联动 UI 工作·一键加召正确。

### Slice 11·smoke + DoD + summary (1.5d)

**任务**·

- 写 `smoke-tinyi-v3-full.js`·5 剧本 × 2 议题 = 10 case
- 18 项 DoD 一一勾验
- 写 `web/docs/tinyi-overhaul-sprint-summary.md`
- changelog.json 写 1.X.X.X "廷议大改 sprint"

**DoD**·smoke 全绿·summary 写·changelog 写。

---

## §A. 玩家发言 paradigm 重做·完整设计

**问题**·v3 浮按钮 + native prompt() 三大缺陷·UI 违和 / 操作步数多 / 机制单薄。

### A.1·UI 层重做

**DELETE** (tm-tinyi-v3.js)·

```
JS·
  L545-557·_ty3_mountInterjectButton
  L561-572·_ty3_show/hide InterjectButton
  L574-588·_ty3_openInterjectPanel
  L590-600·_ty3_doInterjectTrain (prompt() 弹窗)
  L602-619·_ty3_doInterjectSummon (prompt() 弹窗)
  L621-637·_ty3_doInterjectPartyLeader (prompt() 弹窗)
  L640-655 (估)·_ty3_doInterjectSilence
  L658-675 (估)·_ty3_doInterjectAbort

DOM·
  #ty3-interject-btn (浮按钮 div)
  #ty3-interject-panel (5 选项面板 div)

CSS·
  .ty3-ij-btn / .ty3-ij-icon / .ty3-ij-text
  .ty3-ij-panel / .ty3-ij-title / .ty3-ij-row / .ty3-ij-hint / .ty3-ij-foot
```

共 ~145 行 JS + 80 行 CSS + 2 DOM·全清。

**REUSE** (v2 chaoyi.js 已有)·

```
#cy-input-row (tm-chaoyi.js L34-38)·底部 input + "插言"/"打断" 按钮
_cySubmitPlayerLine (L62-71)·回车 / 点击触发
_cyShowInputRow(show) (L56-59)·显隐
```

v3 主入口 `_ty3_open` 处·删 `_ty3_mountInterjectButton` / `showInterjectButton` 调用·改 `_cyShowInputRow(true)` 让底部输入栏永显。

### A.2·主入口·按 phase 分发

```js
async function _ty3_onPlayerSpeak(text) {
  if (!text || !text.trim()) return;
  // 始终 echo 玩家发言到气泡 (transcript 有记)
  if (typeof addCYBubble === 'function') addCYBubble('皇帝', text.trim(), false);
  
  if (CY._ty3 && CY._ty3.done) {
    if (typeof addCYBubble === 'function') addCYBubble('内侍', '（朝会已散·陛下回乾清宫。）', true);
    return;
  }
  
  switch (CY._ty3.currentPhase) {
    case 'preAudit':  return _ty3_onSpeakPreAudit(text);
    case 'seating':   return _ty3_onSpeakSeating(text);
    case 'debate':    return _ty3_onSpeakDebate(text);
    case 'confront':  return _ty3_onSpeakConfront(text);
    case 'vote':      return _ty3_onSpeakVote(text);
    case 'archon':    return _ty3_onSpeakArchon(text);
    case 'draft':     return _ty3_onSpeakDraft(text);
    case 'seal':      return _ty3_onSpeakSeal(text);
    default:          return _ty3_onSpeakDebate(text);
  }
}
```

每 phase handler 职责·

- **preAudit**·识别 "留中/私决/下议/明发" → 触发处置·其他 → 让奏报者重述
- **seating**·识别 "开议/改班/摘 X 出殿" → 触发·其他 → 进辩议
- **debate**·**核心**·跑完整 keyword/intent/代词/点名/抢答 (见 A.3)
- **confront**·识别 "助 X / 敕停" → 选边或停链·其他 → 注入下一发言者
- **vote**·识别 "钦定 X / 钦点 / 暂阙" → 触发·其他 → 提示明确
- **archon**·识别 "S/A/B/C/D" 或自由档位 → 钦定
- **draft**·识别 "翰林/钦点 X/自拟" → 触发
- **seal**·识别 "用印/暂缓/退还" → 触发

### A.3·debate 阶段·完整复刻常朝灵活 + 廷议特化

```js
async function _ty3_onSpeakDebate(text) {
  // 1. 关键词决断·裁决类动词直接 phase decision
  const action = _ty3_parseDetailKeyword(text);
  if (action) return _ty3_doAction(action, text);
  
  // 2. confront 链中的特殊路径
  if (CY._ty3._confrontChain && CY._ty3._confrontChain.active) {
    return _ty3_onSpeakConfront(text);
  }
  
  // 3. 自由话语 → 派 NPC 回应
  const respondN = _ty3_calcResponseCount(text);  // 默认 2·点名 +1
  await _ty3_npcRespondToPlayer(text, respondN);
}
```

### A.4·关键词词典·13 词完整 regex (常朝 5 + 廷议 8)

```js
function _ty3_parseDetailKeyword(text) {
  const t = text.replace(/[。·，。，！？\s]/g, '');
  // 常朝继承 5 词·
  if (/^准奏$|^准$|^可$|准了|可办|从之|奏可/.test(t)) return 'approve';
  if (/^驳$|^驳奏$|不准|不可|否|不行|不允/.test(t)) return 'reject';
  if (/留中|从长计议|容朕|缓议|且听/.test(t)) return 'hold';
  if (/下廷议|集议|付廷议/.test(t)) return 'escalate';
  if (/部议|发部|交部/.test(t)) return 'toPart';
  // 廷议特化 8 词·v1.4
  if (/敕停|且止|休再争|止争/.test(t)) return 'haltConfront';     // 强制结束 confront 链
  if (/钦点|朕意定/.test(t)) return 'imperialPick';                // 廷推/草诏阶段
  if (/仗下|廷杖|杖之/.test(t)) return 'flogging';                 // Slice 7.5
  if (/削籍|革其官|革其籍/.test(t)) return 'strip';                // Slice 7.5
  if (/摘除|退殿|出殿/.test(t)) return 'dismiss';                  // Slice 7.5
  if (/转(户|兵|礼|工|吏|刑)部/.test(t)) return 'toPartSpecific';  // 转 6 部
  if (/更议|重议|再议之/.test(t)) return 'reopen';                 // 重启议题
  if (/革职|罢职|罢其官/.test(t)) return 'revoke';                 // 革职
  return null;
}
```

### A.5·intent 11 类完整 keyword (常朝 8 + 廷议 3)

```js
function _ty3_inferPlayerIntent(text) {
  const t = text || '';
  // 常朝继承 8 类·
  if (/严办|惩之|治罪|不察|可斩|罢黜|查办|严斥|拿下/.test(t)) return 'punish';
  if (/[!！]{2,}/.test(t) || /必须|即办|速行|不容/.test(t)) return 'aggressive';
  if (/民苦|忧|痛|哀|怜|惜民|百姓苦/.test(t)) return 'sympathetic';
  if (/善|嘉许|勤勉|可嘉|有功|忠勇|赏之/.test(t)) return 'praise';
  if (/恐有|未必|疑|或非|姑妄|存疑|不可不察/.test(t)) return 'doubt';
  if (/两全|折中|分发|分批|可缓|商榷|或可/.test(t)) return 'mediate';
  if (/何如|如何|可乎|几何|详言|细言|奈何/.test(t)) return 'inquire';
  // 廷议特化 3 类·v1.4
  if (/朕亲断|且止|二位且止|朕意已决/.test(t)) return 'arbitrate';     // 仲裁·结束 confront
  if (/退下|入殿|召|起对|休奏/.test(t)) return 'dispatch';             // 调度·改 attendees
  if (/鸣鞭|退朝|跪安|殿仪/.test(t)) return 'ceremonial';              // 礼仪·触发动画
  return 'neutral';
}
```

### A.6·抢答队列·6 优先级 + 4 廷议加成

**6 优先级** (复用常朝 `npcRespondToPlayer`)·

```
0. 代词识别·refsLastSpeaker (你说/讲来/续言/单字"说/讲/继续") → 上一发言者
1. 点名识别·text 含任 NPC 名 → 优先抢答
2. intent 特殊抢答·
     punish → 被批者抢辩 + 言官响应
     mediate/doubt → 首辅 (韩爌) 出来调和
3. 主奏者·若未在前面
4. debate / selfReact 已有立场者
5. 闲人兜底·首辅 + 言官头领
```

**4 廷议加成** (v1.4 新)·

```
6. confront 链中·"助王永光"
   → 王永光阵营 mode=force-rebut·下次发言强制反驳对方
   → 对方阵营 mode=force-soften·下次发言被迫缓和
   → 玩家变成第三方·真插手对线

7. arbitrate intent
   → confront 链立即结束·跳 phase 5 (草诏)
   → 跟 "敕停" 同效·但 intent 路径不需匹配硬关键词

8. dispatch intent
   → 召集·"召黄宗周入殿" → attendees += 黄宗周
   → 摘除·"许显纯退下" → attendees -= 许显纯·favor-3
   → 改 attendees 名册·改完后续轮次发言者也变

9. mentee 抢答·玩家 punish X
   → X 的所有 mentee 按 honor 决定·
     honor >= 0.5 → 抢辩驳玩家 "陛下·先师之论·门生不敢异" (护师)
     honor <  0.5 → 附议玩家 "陛下圣明·X 公此论确有未察" (背师)
   → 跟 clientelism mode 不同·这是被动触发·门生**没被点名也会抢答**
```

**示例·玩家说 "严办许显纯"**·

| 优先级 | 谁抢答 | mode | 因为 |
|---|---|---|---|
| 1 | 许显纯 | rebut | 被点名·必抢辩 |
| 1 | 王永光 | rebut | 点名提及方 (东林)·必驳玩家 |
| 2 | 黄宗周 | rebut | 言官 + punish intent → 言官响应 |
| 9 | 田尔耕 | clientelism | 许显纯 mentee·honor=0.6 → 护师 |
| 9 | 周应秋 | second | 许显纯 mentee·honor=0.3 → 背师·附议玩家 |

**5 个 NPC 并发抢答·全 LLM 流式**·这才是廷议该有的活泼。

---

## §B. 廷议 vs 常朝·10 维度差异对照

| 维度 | 常朝 | 廷议 |
|---|---|---|
| 1. 触发 | 每回合开局自动 | **玩家手动 / NPC 主动 / 剧情 escalate** (v1.4 新加 3 路径) |
| 2. 议题数 | N 议程 (5-15) | **1 议题** 单点深辩 |
| 3. 时长 | 5-15 分 | **15-40 分** |
| 4. 节奏 | 快·议程逐条 | **慢·8 阶段** |
| 5. NPC 数 | 全员到场 | **玩家召 5-30 人**·6 资格层筛 (v1.4 加 prestige) |
| 6. UI 主体 | 议程列表 + 4 按钮 | **三班 + 立场板 + 潮汐条 + 多阶段 modal** |
| 7. 玩家角色 | 决策者 | **裁决者 + 调度者**·廷杖 / 削籍 / 革职 |
| 8. 决策类型 | 11 种 | **14 种**·廷推 / 钦定档位 / 用印 / 追责 |
| 9. 反弹机制 | 弱·morale 反应 | **真反弹**·loyalty / affinity / martyr / 党争 / 追责 |
| 10. 历史落地 | qijuHistory + edictTracker | **+ courtRecords + 追责队列 + martyr 事件队列 + 党争状态机 + 民意度 + 言官离心** |

### B.1·总结·廷议 = "重大决策仪式" / 常朝 = "日常治理批阅"

| | 常朝 | 廷议 |
|---|---|---|
| **隐喻** | "首席执行官晨会"·快速决断 | "国会听证 + 最高法庭"·派系角力 |
| **主要功能** | **数量** (覆盖 5-15 议程) | **深度** (一议题深挖到党争 / 追责 / 反弹) |
| **战略意义** | 维持日常运转 | **重大节点·政治冒险** |
| **危险等级** | 低·撤销重批容易 | **高**·错决引发死谏 / 党争激化 / N 回合追责 |
| **适用时机** | 玩家想"低成本快速治理" | "重大议题严肃定调"·或被剧情/AI 自动 escalate |

---

## §C. 廷议独有 UI / ceremony / 按键

### C.1·UI 元素对照表

| 时机 | 常朝有? | 廷议要做 |
|---|---|---|
| 开场 | 无 | **鸣鞭三响动画 + 字幕 + 三班鱼贯入场** (复用 changchao L2869 字幕风格 + 加音效) |
| 议前预审 | 无 | **4 处置 modal**·留中/私决/下议/明发·v3 已有 (L696) |
| 起议站班 | 无 | **三班布局**·内阁紫/部院绯/言官绿·v3 已有 stub·要升级 |
| 立场板 | 无 | **9 stance 色块顶部 sticky**·v2 有缩略·要升级到放大 + 点击展开 + N×9 矩阵 |
| 辩议中 | 议程列表 | **底部 input 框 + 三班分布 + 潮汐条** (替换浮按钮) |
| confront 链 | 无 | **红色虚线 + 箭头 + "助 A / 助 B / 敕停" 按钮组** |
| 廷推 | 无 | **9 候选清单 modal**·钦定/廷推/暂阙 3 选项 |
| 钦定档位 | 无 | **S/A/B/C/D 5 卡牌 modal**·有 "钦点旨意 +" 加成显示 |
| 草诏 | 无 | **3 卡选择 modal**·翰林/钦点首辅/自拟 |
| 用印 | 无 | **朱砂印章动画 + 阻挠概率进度条** |
| 追责 | 无 | **N 回合后小弹窗** "上回 X 议·Y 公因反对 loyalty -5·已伺机谏诤" |
| 廷杖 | 无 | **gold-screen "🔨 廷杖 X 二十"** 5 秒淡出 |
| 削籍 | 无 | **gold-screen "❌ 削籍 X"** + 全场气氛 → cautious |

### C.2·10 mode 视觉一眼区分

| mode | 视觉标记 | 颜色 |
|---|---|---|
| lead | 气泡左侧 ▶ | 中性灰 |
| second | 气泡左侧 ⊕ | 同党色 |
| rebut | 气泡左侧 ← 红箭 | vermillion |
| soften | 气泡左侧 ～ 金波 | gold |
| pivot | 气泡左侧 ⇌ 双向 | indigo |
| cite | 气泡左侧 📊 数据 icon | celadon |
| **confront** | 立场板上**红色虚线**·气泡左侧 ❗ | vermillion-darkest |
| **cite_classic** | 气泡左侧 📜 卷轴 + 引文段缩进 | gold-darkest |
| **clientelism** | 气泡左侧 🎓 师承 icon + mentor 名 tag | indigo-darkest |
| **martyr** | 气泡**全红边框** + 字号加大 | vermillion-blood |

### C.3·7 个廷议独有快捷键

| 键 | 廷议动作 | 常朝同键 | 差异说明 |
|---|---|---|---|
| `Enter` | 提交 input 内发言 | 同 | 共用 |
| `空格` | 暂停 / 推进当前发言序列 | 无 | 廷议独有·节奏控制 |
| `Esc` | 退朝·**二次确认 modal** | 直接关 | 廷议有保护·防误关 |
| `T` | 弹立场板放大版 (详细 N×9 矩阵) | 无立场板 | 廷议独有 |
| `1-9` | 廷推时·9 候选选择 | 无廷推 | 廷议独有 |
| `[` / `]` | confront 链中·切阵营 "助 X / 助 Y" | 无党争 | 廷议独有 |
| `M` | 召集 + 解散 attendees | 无召集 | 廷议独有 |
| `Ctrl+Enter` | 强制裁决·跳剩余阶段 | 无 | 廷议应急 |
| `H` | 弹历史档案 (本议题 stanceHistory) | 无 | 廷议独有 |

**设计哲学**·

- **常用键** (Enter/Esc) 共用·降低学习成本
- **廷议独有键** 全在常朝没用过的位置 (T/M/H/[/]/1-9)·两套互不干扰
- **保护键** (Esc 二次确认) 廷议比常朝多一步·因为 stake 高·误关代价大

### C.4·按键 hint footer (替代浮按钮的发现性)

底部 `#cy-input-row` 旁加 hint·

```
[T] 立场 · [M] 召集 · [[/]]助党 · [Ctrl+Enter] 速决 · [H] 史 · [Esc] 退朝
```

灰色小字·hover 显示详细说明。删了浮按钮后·玩家可能找不到"我能做什么"·这个 hint 持续提示。

---

## §D. UI Mockup 草图 (ASCII)

### D.1·开场 (鸣鞭三响 + 三班鱼贯入场)·**[v1.5 fix·v3 三班 stance-based]**

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🏛 廷议·诛戮魏珰余孽议        第1轮     待定9            [✕ 退朝]      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│              〔 鸣 鞭 三 响 · 百 官 列 班 〕                              │
│                                                                           │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│   〔 三班已立·同 0·中 9·反 0 〕                       (按 V 切 class 视图)│
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                           │
│  ┌── 左班·同·东林+盟 ──┐ ┌── 中班·中立 ────┐ ┌── 右班·异·阉党 ──┐      │
│  │ (待 stance 推演后入)│ │ ☖ 韩爌 ○待定    │ │ (待推演后入)     │      │
│  │                     │ │ ☖ 顾秉谦 ○待定  │ │                  │      │
│  │                     │ │ ☖ 叶向高 ○待定  │ │                  │      │
│  │                     │ │ ☖ 毕自严 ○待定  │ │                  │      │
│  │                     │ │ ☖ 高攀龙 ○待定  │ │                  │      │
│  │                     │ │ ☖ 杨涟 ○待定    │ │                  │      │
│  │                     │ │ ☖ 黄宗周 ○待定  │ │                  │      │
│  │                     │ │ ☖ 许显纯 ○待定  │ │                  │      │
│  │                     │ │ ☖ 田尔耕 ○待定  │ │                  │      │
│  └─────────────────────┘ └─────────────────┘ └──────────────────┘      │
│                                                                           │
│  📜 皇帝·今日特召卿等议诛戮魏珰余孽·诸卿各陈己见。                       │
│                                                                           │
│  (百官按品级次第发言·首轮起·按 stance 重新分班)                          │
│                                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│ 陛下欲言······(回车插言)                          [📣 插言] [⏸ 打断]  │
│ [T]立场·[M]召集·[[/]]助党·[V]班视图·[Ctrl+Enter]速决·[H]史·[Esc]退朝   │
└──────────────────────────────────────────────────────────────────────────┘
```

**v1.5 关键 fix vs v1.4**·

- **三班·v3 现有 stance-based** (`左班·同 / 中班·中立 / 右班·异`)·首轮前全员"中立"待定·首轮发言后按 stance 重新分班
- 潮汐条按 v3 命名·**〔 三班已立·同 X·中 Y·反 Z 〕** (v3 L1706-1708 实际字串)
- **[V] hotkey** (v1.5 新)·切 class 视图 (内阁紫/部院绯/言官绿)·两 paradigm 双轨

按 [V] 后 class 视图·

```
┌── 内阁班 (紫·阁臣) ──┐ ┌── 部院班 (绯·尚书) ────┐ ┌── 言官班 (绿·御史) ──┐
│ ☖ 韩爌 ○待定          │ │ ☖ 毕自严 ○待定          │ │ ☖ 高攀龙 ○待定        │
│ ☖ 顾秉谦 ○待定        │ │ ☖ 许显纯 ○待定          │ │ ☖ 杨涟 ○待定          │
│ ☖ 叶向高 ○待定        │ │ ☖ 田尔耕 ○待定          │ │ ☖ 黄宗周 ○待定        │
└───────────────────────┘ └─────────────────────────┘ └───────────────────────┘
```

---

### D.2·辩议中·confront 链 (王永光 ↔ 许显纯 对质)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🏛 廷议·诛戮魏珰余孽议         第2轮      〔 对 质 中 · 1/2 〕         │
├──────────────────────────────────────────────────────────────────────────┤
│   主战 ████████████ 58% │ 主和 ████ 32% │ 中立 ▌ 10%                     │
│                                                                           │
│  ┌── 内阁班 ──┐  ┌──── 部院班 ────┐    ┌── 言官班 ──┐                    │
│  │ 韩爌 ●折中  │  │ 王永光 ●极反🔥┤    │ 黄宗周 ●极反│                  │
│  │            │  │                ┊←❗→│              │                  │
│  │ 顾秉谦●支持│  │ 毕自严 ●反对   ┊    │ 倪元璐 ●反对│                  │
│  └────────────┘  │                ┊    │ 许显纯 ●极支│  ←阉党 inline    │
│                  └────────────────┘    └─────────────┘                   │
│                          └───── 红色虚线·confront 中 ─────┘              │
│                                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                                           │
│  王永光 ❗【confront】 此议岂可复行!此乃魏珰旧策余孽·三年损饷三十万      │
│           两·势难再举·公等更欲翻案乎?                                    │
│                                                                           │
│  许显纯 ❗【confront】 王公此论·是欲翻天启朝定案乎?当年公等附议·今复    │
│           食言·岂非朝令夕改?                                              │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  [⚡ 助王永光]    [⚡ 助许显纯]    [⚖️ 敕停·强制结束]                  ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│ 陛下欲言······或输入"助X" / "敕停"            [📣 插言] [⏸ 打断]   │
│ [[助党 │ ]助党 │ T立场 │ Ctrl+Enter 速决 │ Esc 退朝                      │
└──────────────────────────────────────────────────────────────────────────┘
```

**关键视觉变化**·立场板上两 NPC 之间画红色虚线 + ❗ = 正在对质·链中显示"对质中·1/2"进度·气泡 `❗【confront】` 视觉标记·三按钮 + 玩家可直接输入"助 X" / "敕停"·或快捷键 `[/]` 切阵营。

---

### D.3·立场板放大版 (按 `T` 弹出)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 立场板·详细模式·议题 [诛戮魏珰余孽议·第2轮]            [✕ 关闭(T)]   │
├──────────────────────────────────────────────────────────────────────────┤
│         极支  支持  倾支  中立  倾反  反对  极反  折中  另提    | 班次    │
│ 韩爌     ░    ░    ░    ░    ░    ░    ░    ●70  ░     | 内阁紫   │
│ 顾秉谦   ░    ●62  ░    ░    ░    ░    ░    ░    ░     | 内阁紫   │
│ 朱国祯   ░    ░    ●50  ░    ░    ░    ░    ░    ░     | 内阁紫   │
│ ──────────────────────────────────────────────────────  ────────  │
│ 王永光   ░    ░    ░    ░    ░    ░    ●85  ░    ░     | 部院绯   │
│ 毕自严   ░    ░    ░    ░    ░    ●70  ░    ░    ░     | 部院绯   │
│ 徐光启   ░    ░    ●55  ░    ░    ░    ░    ░    ░     | 部院绯   │
│ 温体仁   ●60  ░    ░    ░    ░    ░    ░    ░    ░     | 部院绯   │
│ ──────────────────────────────────────────────────────  ────────  │
│ 黄宗周   ░    ░    ░    ░    ░    ░    ●90  ░    ░     | 言官绿   │
│ 倪元璐   ░    ░    ░    ░    ░    ●65  ░    ░    ░     | 言官绿   │
│ 许显纯   ●80  ░    ░    ░    ░    ░    ░    ░    ░     | 阉党红   │
├──────────────────────────────────────────────────────────────────────────┤
│  当前 mode 分布·                                                          │
│    confront × 2 (王永光 ↔ 许显纯)                                         │
│    rebut × 3   second × 2   cite × 1   soften × 1   martyr × 1           │
│                                                                           │
│  党派阵营·                                                                 │
│    东林清流·韩爌 / 顾秉谦 / 朱国祯 / 黄宗周 / 倪元璐 / 王永光 / 毕自严     │
│    阉党残·  许显纯 / 温体仁                                                │
│    中立·    徐光启                                                         │
│                                                                           │
│  [按 T 关闭·返回主廷议视图]                                                │
└──────────────────────────────────────────────────────────────────────────┘
```

**关键视觉**·9 stance × N NPC 完整矩阵·按班次分组·底部 mode 分布 + 党派阵营 summary。常朝无立场板·v2 只缩略·v3 v1.4 升级到详细。

---

### D.4·钦定档位 modal (phase 4)·**[v1.5 fix·v3 5 真档名]**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  钦定档位·诛戮魏珰余孽议·诸卿议毕·陛下定档                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐            │
│  │   S    │  │   A    │  │   B    │  │   C    │  │   D    │            │
│  │圣旨煌煌│  │凛然奉旨│  │勉强尊行│  │众议汹汹│  │危诏激变│            │
│  │ ════   │  │ ════   │  │ ════   │  │ ════   │  │ ════   │            │
│  │支 8 名 │  │支 5 名 │  │支 3 名 │  │反 7 名 │  │反 12名 │            │
│  │皇威 +5 │  │皇威 +3 │  │皇威 +1 │  │皇威 -2 │  │皇威 -5 │            │
│  │皇权 +2 │  │皇权 +1 │  │皇权  0 │  │皇权 -3 │  │皇权 -5 │            │
│  │反弹 弱 │  │反弹 轻 │  │反弹 中 │  │反弹 重 │  │反弹 极 │            │
│  │martyr  │  │  ——   │  │  ——   │  │  ——   │  │martyr  │            │
│  │ ×3 触发│  │        │  │        │  │        │  │×2 触发 │            │
│  └────────┘  └────────┘  └────────┘  └────────┘  └────────┘            │
│    [1]         [2]         [3]         [4]         [5]                  │
│                                                                           │
│  D 档触发额外·  [硬 推]  [妥 协]                                          │
│                                                                           │
│  当前预测·众臣多倾向 B (勉强尊行)·阉党推 S (圣旨煌煌·激进诛戮)         │
│  钦定 D 将触发硬推 / 妥协 选项·选硬推 = 言官集体死谏 (~3 人)             │
│                                                                           │
│  历史参考·上回类似议题 (天启 3 年清议) 钦 B·结果·短期稳·长期党争激化   │
│                                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│ 输入 S/A/B/C/D 或按 1-5             [Esc 推迟决定·进留中]              │
└──────────────────────────────────────────────────────────────────────────┘

钦定后·内侍 bubble·
〔 钦定档位·S·圣旨煌煌·8 名·皇威 75·皇权 65 〕
```

**v1.5 关键 fix vs v1.4**·**5 档名按 v3 真名** (`圣旨煌煌 / 凛然奉旨 / 勉强尊行 / 众议汹汹 / 危诏激变`·v3 L1217-1221 实际字串)·**不是** "上策/中策/平策/中下/下策"。**D 档加 [硬推 / 妥协] 二级选项** (v3 现有·必须 preserve)。bubble 文字按 v3 命名。

---

### D.5·廷议 8 阶段时序图

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              廷议 8 阶段流                                │
└──────────────────────────────────────────────────────────────────────────┘

  议题 X 升级·或玩家手动召·或 NPC 上书请议 (v1.4 新)
       │
       v
  ┌──────────────────────────────────────────────────────────┐
  │ ★ Slice 2.5·召集·6 资格筛 + AI 推荐 + mentor 联动        │
  │              + 5 后果预测 + 4 策略一键填                    │
  └──────────────────────────────────────────────────────────┘
       │
       v
  ┌──────────────────────────────────────────────────────────┐
  │ 阶段 0·议前预审   ☞ 4 处置·留中/私决/下议/明发           │
  │                  ☞ 选"下议"才进阶段 1·其他直接出           │
  └──────────────────────────────────────────────────────────┘
       │ 下议
       v
  ┌──────────────────────────────────────────────────────────┐
  │ 阶段 1·起议站班   ☞ 三班布局·内阁紫/部院绯/言官绿         │
  │                  ☞ 鸣鞭三响·百官入殿                       │
  └──────────────────────────────────────────────────────────┘
       │
       v
  ┌──────────────────────────────────────────────────────────┐
  │ 阶段 2·分轮辩议   ☞ 主奏+同党附议+敌党驳议+中立权衡        │
  │                  ☞ 10 mode (lead/second/rebut/soften/    │
  │                    pivot/cite/confront/cite_classic/      │
  │                    clientelism/martyr)                    │
  │                  ☞ 8D persona × 议题 tag 决定 mode         │
  │                  ☞ 玩家可输 "你说" / "诸卿" / "严办 X"     │
  │                  ☞ confront 链·NPC vs NPC 真对质           │
  └──────────────────────────────────────────────────────────┘
       │ 议毕 (或玩家"敕停")
       v
  ┌──────────────────────────────────────────────────────────┐
  │ 阶段 3·廷推 (仅人事议题)·9 候选·按 influence 加权抽签    │
  │                          ☞ 玩家可钦定/廷推/暂阙           │
  └──────────────────────────────────────────────────────────┘
       │
       v
  ┌──────────────────────────────────────────────────────────┐
  │ 阶段 4·钦定档位   ☞ S/A/B/C/D 5 卡选择                   │
  │                  ☞ AI 预测后果 + 历史参考                  │
  └──────────────────────────────────────────────────────────┘
       │
       v
  ┌──────────────────────────────────────────────────────────┐
  │ 阶段 5·草诏拟旨   ☞ 钦点草诏官·翰林/钦点首辅/自拟         │
  └──────────────────────────────────────────────────────────┘
       │
       v
  ┌──────────────────────────────────────────────────────────┐
  │ 阶段 6·用印颁行   ☞ 朱砂印章·party cohesion 阻挠概率      │
  │                  ☞ 触发反弹·minority loyalty/affinity     │
  │                  ☞ 召集后果二次惩罚·partyTilt × 1.5       │
  │                  ☞ 写 GM._courtRecords + qijuHistory      │
  └──────────────────────────────────────────────────────────┘
       │ N 回合后
       v
  ┌──────────────────────────────────────────────────────────┐
  │ 阶段 7·追责回响   ☞ 自动追责该议题影响                   │
  │                  ☞ martyr NPC 上书谏诤·诏狱/廷杖事件      │
  │                  ☞ 党争激化 / 缓和                         │
  │                  ☞ 民意度 / 言官离心 月衰                  │
  └──────────────────────────────────────────────────────────┘
```

每阶段都可由玩家"敕停"提前出·或"更议"重启 (Slice 7.5 加)。

---

### D.6·廷杖动画 (Slice 7.5 ceremony hook)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                            🔨 廷 杖 许 显 纯 二 十                        │
│                                                                           │
│                          ━━━━━━━━━━━━━━━━━━━━━━━━━━━                     │
│                                                                           │
│              loyalty -10   prestige -5   健康 -8   入诏狱可能 +20%        │
│                                                                           │
│                          (5 秒后淡出·返回廷议)                          │
└──────────────────────────────────────────────────────────────────────────┘
```

整屏淡橙红 flash·中央大字·5 秒后淡出。

---

### D.7·召集 modal (Slice 2.5·v1.3 新加)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 召集廷议·议题 [盐法改革受阻九边急饷]·tag [finance, reward, border]      │
├──────────────────────────────────────────────────────────────────────────┤
│  视图·  [品级 ▼] [党派] [部门]              已选 7 / 30·  ▼ 推荐 8 人   │
│                                                                           │
│  ───── 正一品 / 从一品 (必召) ─────                                       │
│   ✓ 韩爌 (首辅·中立)             [必] [AI 建议·议事核心]                │
│   ✓ 叶向高 (次辅·东林)           [必] [AI 建议·均衡需补 1 反方]         │
│   ☐ 顾秉谦 (阉党首辅)            [漏召警告·阉党 0 人]                   │
│                                                                           │
│  ───── 正二品·从二品 (必召) ─────                                        │
│   ✓ 毕自严 (户部尚书·东林)       [必] [AI 建议·tag:finance]             │
│   ☐ 张瑞图 (兵部尚书·阉党)       [漏召警告·tag:border 缺]              │
│   ✓ 黄克缵 (吏部尚书·中立)       [必]                                   │
│   ✓ 来宗道 (礼部尚书·东林)       [必]                                   │
│   ☐ 薛三才 (刑部尚书·阉党)       [漏召警告·阉党 0 人]                  │
│   ✓ 沈氵巨 (工部尚书·中立)       [必]                                   │
│   ✓ 高攀龙 (左都御史·东林)       [必]                                   │
│   ☐ 周应秋 (右都御史·阉党)       [漏召警告]                            │
│                                                                           │
│  ───── 正三品 (可召) ─────                                                │
│   ☐ 李逢申 (户部左侍郎·东林)    [AI 建议·tag:finance]                   │
│   ☐ 王永光 (吏部右侍郎·东林)    [AI 建议·均衡]                          │
│   ☐ 许显纯 (锦衣卫指挥·阉党)    [AI 建议·阉党均衡]                      │
│   ☐ 田尔耕 (锦衣卫·阉党)                                                  │
│                                                                           │
│  ───── 正四品·正五品 (可召) ─────                                        │
│   ☐ 黄宗周 (御史·东林清流)                                                │
│   ☐ 倪元璐 (御史·东林)                                                    │
│   ☐ 周朝瑞 (给事中·东林)                                                  │
│   [+ 展开 12 人]                                                          │
│                                                                           │
│  ───── 在外·不可召 (灰显) ─────                                          │
│   ☒ 袁崇焕 (蓟辽督师·辽东)       [外任·急召不及]                        │
│   ☒ 杨涟 (致仕·东林)             [致仕·不入朝]                          │
│                                                                           │
│  ───── 师承联动·mentor 建议同召 (v1.4 新) ─────                          │
│   韩爌门生·钱龙锡·何如宠·吴宗达 (3 人)·  [+一并召]                        │
│   叶向高门生·朱国祯·朱延禧 (2 人)·       [+一并召]                        │
│                                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│  此次召集后果预测·                                                       │
│  ⚠ 阉党 0 人 / 东林 5 人·中立 2 人 → 党争张力 +3·清议事件 (3 回合后)   │
│  ⚠ 漏召二品 [周应秋 / 张瑞图 / 薛三才] → loyalty -3 each·                │
│        (高声望·周应秋 prestige=70·实际 -5)                              │
│  ⚠ tag:border 缺·建议召兵部 + 边帅                                     │
│  ⚠ 民意度 -4·言官离心 -3 (召了 2 言官)                                  │
│  ✓ 朝中评议·东林一党议·偏倚                                            │
│                                                                           │
│  策略·  [⚖️ 标准九卿]  [📊 专家小组]  [🔥 派系大会战]  [👥 大廷议(30+)]│
│         [✕ 取消]      [一键召推荐 (8)]      [仍开议·按当前 7 人]      │
└──────────────────────────────────────────────────────────────────────────┘
```

**关键交互**·

- 视图切换 (品级/党派/部门)·同批 NPC 按不同维度分组
- 必召强制·正一/二品有 `[必]` 标记·勾选框 disabled
- AI 建议高亮·推荐人头像金色描边 + `[AI 建议]` 标签
- 漏召警告·应召未召红字提示
- 不可召灰显·外任/致仕/入狱 disable + 原因
- **mentor 联动**·点 mentor 后 UI 自动建议同召 mentee·[+一并召]
- 后果预测·实时跟随勾选变化·绿 ✓ vs 红 ⚠
- 4 策略按钮·一键填充常用组合
- 底部 3 路径·取消 / 接受推荐 / 强行按当前

---

### D.8·议前预审面板·**[v3 既有·100% preserve·v1.5 自读 fix]** (v3 L696-799)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          〔 议 前 预 审 〕                                │
│        陛下决断之前·先察议题之轻重缓急·从容择处                          │
├──────────────────────────────────────────────────────────────────────────┤
│  议 题·[诛戮魏珰余孽议·涉者百余人·当依律严办抑或宽宥        ▼ 待议册]   │
│                                                                           │
│  ───── 留中册 (上次留中·可"再议") ─────                                  │
│   • 议盐法改革受阻·复议 1                            [再议]              │
│   • 议九边粮饷紧                                     [再议]              │
│                                                                           │
│  ───── 奏者信息·密揭/题本·体裁 ─────                                    │
│   奏者·黄宗周 (科道御史) · 体裁·密揭                                     │
│   内容·阉党余孽尚在朝中·当尽诛之·以正朝纲... (摘 100 字)               │
│                                                                           │
│  ───── 党派立场预测 (v3 forecast) ─────                                  │
│   东林清流·支持  ████████  8 人                                          │
│   阉党残部·反对  ████  4 人                                              │
│   中立朝臣·中立  ██  2 人  (待具体推演)                                  │
│                                                                           │
│  ───── 陛下何如裁处 ─────                                                │
│                                                                           │
│  ┌──────────────────────────┐  ┌──────────────────────────┐             │
│  │ 📥 留 中                 │  │ 🤐 私 决                 │             │
│  │ 皇权 -1                  │  │ 皇威 +1                  │             │
│  │ ─────────────────────    │  │ ─────────────────────    │             │
│  │ 搁置一回合·奏者          │  │ 走御前奏对·与心腹密议    │             │
│  │ prestige -2·世人议怠政   │  │ 不公开·不入廷议          │             │
│  └──────────────────────────┘  └──────────────────────────┘             │
│                                                                           │
│  ┌──────────────────────────┐  ┌──────────────────────────┐             │
│  │ 🤝 下议·五人闭门          │  │ 📜 明 发·廷议             │             │
│  │ 朝堂渐和                 │  │ 完整七阶段                │             │
│  │ ─────────────────────    │  │ ─────────────────────    │             │
│  │ 召三品以上 5 员·         │  │ 召三品以上百官·          │             │
│  │ 小范围议事               │  │ 四轮辩议·公开裁决        │             │
│  └──────────────────────────┘  └──────────────────────────┘             │
│                                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│                              [罢·改日再议]                              │
└──────────────────────────────────────────────────────────────────────────┘
```

**v3 现有真实字串** (v1.5 自读 verified·v3 L761-781 actual)·

```
📥 留 中     | 皇权 -1   | 搁置一回合·奏者 prestige -2·世人议怠政
🤐 私 决     | 皇威 +1   | 走御前奏对·与心腹密议·不公开
🤝 下议·五人闭门 | 朝堂渐和 | 召三品以上 5 员·小范围议事
📜 明 发·廷议 | 完整七阶段 | 召三品以上百官·四轮辩议·公开裁决
```

**v3 现有 features** (mockup 内必加·非新设计)·

- **留中册** (`GM._ccHeldItems`)·议前预审 panel 内显示·每条 "再议" button (`_ty3_reissueTopic`)
- **奏者信息** (密揭/题本/体裁·memorial content 摘 100 字)
- **党派立场预测** (`_ty3_paUpdateForecast`)·支持 / 反对 / 中立 NPC 数预测条
- **待议册 dropdown** (`GM._pendingTinyiTopics`)·从这选 seedTopic

**v3 现有 bug** (Slice 11 顺手修)·L781 `'<div class="ty3-pa-opt-cost">完整七阶段/div>'` 缺 `<`·HTML 渲染会乱·Slice 11 1 min 修。

---

### D.9·用印 2 sub-flow modal·**[v3 既有·preserve]** (v3 L2943-3014)

#### D.9.1·正常用印 (无阻挠)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🖋 用印·诛戮魏珰余孽议·钦定 B (勉强尊行)                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│              [朱砂印章 动画·5s 淡入淡出]                                 │
│                                                                           │
│                       〔 诏命用印颁行 〕                                  │
│                                                                           │
│              诏命·按 B 档·分批查办·首恶五人·余者宽宥                    │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

#### D.9.2·有阻挠的用印 (明朝特化)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🖋 用印·诛戮魏珰余孽议·钦定 D (危诏激变)                              │
├──────────────────────────────────────────────────────────────────────────┤
│  阻挠概率·  35%·朝中反对方  (东林清流·杨涟 / 高攀龙 / 黄宗周)            │
│                                                                           │
│  有 35% 概率「留中不发」 —                                                │
│                                                                           │
│  选项·                                                                    │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ 🕊 放弃用印·议题转留中·影响轻                                       ││
│  │                                                                     ││
│  │ ⚔ 强行用印 (皇权 -5)·硬推·朝堂转 cautious                          ││
│  └────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘

(若阻挠成功)
〔 诏命留中·阻挠者·东林 〕

(若强行成功)
〔 强行用印·阻于 东林·皇威 -5·朝堂转 cautious 〕
```

**v3 现有 button + bubble** (preserve·v3 L2944 button / L3001 阻挠 / L3011 强行 / L3014 颁行)·

```
button·          ⚔ 强行用印（皇权-5）
阻挠成功 bubble·  〔 诏命留中·阻挠者·X 〕
强行成功 bubble·  〔 强行用印·阻于 X·皇威 -5·朝堂转 Y 〕
正常颁行 bubble·  〔 诏命用印颁行 〕
```

---

### D.10·追责回响弹窗·**[v3 既有·preserve]** (v3 L3413·4 outcome)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ⚖️ 追责回响·上回议·诛戮魏珰余孽 (3 回合前)                              │
├──────────────────────────────────────────────────────────────────────────┤
│  议题·诛戮魏珰余孽议·钦定 B (勉强尊行)                                  │
│  追责日·2 turn 后 (turn 8)                                                │
│                                                                           │
│  ───── 执行情况 ─────                                                     │
│                                                                           │
│  outcome·  圆 满 ✓                                                       │
│            ────                                                           │
│  ✓ 阉党首恶 5 人查办·田尔耕 / 周应秋 / 等 已下诏狱                       │
│  ✓ 余者宽宥·阉党 morale -3·东林 morale +2                                │
│  ✓ 民意度 +5 (公允)·言官离心 -2 (诉求部分实现)                           │
│                                                                           │
│  ───── outcome 4 档对照 ─────                                             │
│  ✓ 圆满 (fulfilled)·    S/A 档 + 无阻挠           ← 本次                 │
│    部分 (partial)·      B/C 档                                            │
│    抵触 (contested)·    D 档                                              │
│    阻挠 (blocked)·      seal blocked                                      │
│                                                                           │
│  ───── 长期影响 ─────                                                     │
│  • 阉党残部 tension -2·继续衰退                                           │
│  • 东林士气 +3·后续议事更激进                                             │
│  • 民意度记录·"陛下治阉党有功" (累 +1 / 月)                              │
│                                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│ [明白]                              [入实录·永久档存]                    │
└──────────────────────────────────────────────────────────────────────────┘
```

**v3 现有 4 outcome** (preserve·v3 L3413)·

```js
outcome = entry.sealStatus === 'blocked' ? 'blocked' :       // 阻挠
          (grade === 'S' || grade === 'A') ? 'fulfilled' :    // 圆满
          (grade === 'D') ? 'contested' : 'partial';          // 抵触 / 部分
```

**已知 bug** (Slice 11 修)·`_ty3_phase14_recordChaoyiSummary` 简化丢失·此追责弹窗当前**不触发**·"廷议待落实" 卡也不进 `GM._chronicleTracker`。Slice 11 必修。

---

## §E. 廷议召集制·完整设计 (v1.3 进阶 + v1.4 调参)

### E.0·核心 thesis

召集 = 廷议第 0 阶段 = 入场政治表态。每次召集影响·

1. 当场决议·谁被召决定立场板分布
2. 没被召的 NPC 不满
3. 党争状态变化
4. 朝中评议·"陛下偏好 X 党"
5. NPC 长期 loyalty 微调

### E.1·6 层资格筛 (v1.4 加 prestige 层)·完整含 edge cases

每个 NPC 通过 `_ty3_calcEligibility(ch, topic, scenario)` 计算 category·6 层叠加·取严·

**层 1·品级筛**

```js
function _ty3_calcEligibilityByRank(ch) {
  const lv = (typeof _cyGetRank === 'function') ? _cyRankLevelOf(_cyGetRank(ch)) : 99;
  if (lv <= 4)  return { category: '必召', layer: 1, reason: '正/从二品·禁不召' };
  if (lv <= 8)  return { category: '可召', layer: 1, reason: '正三品·常规可召' };
  if (lv <= 12) return { category: '可召', layer: 1, reason: '四/五品·特定议题可召' };
  if (lv <= 14) return { category: '罕召', layer: 1, reason: '六/七品·清流议题破例' };
  return { category: '不召', layer: 1, reason: '八品以下·杂职吏' };
}
```

**Edge cases**·

- **兼任 / 加衔**·明朝官员常有加衔 (e.g. 韩爌·内阁首辅 + 建极殿大学士 + 太子太傅)·按"最高品级"算·复用 `_cyRankLevelOf` 的 "取最高" 逻辑
- **阁臣品级特殊**·明朝阁臣"无品但实权"·复用 `_cyFallbackRankByTitle` (tm-chaoyi.js L170-184) → 首辅/大学士映射正二品
- **六部尚书在不同剧本**·天启 (明) 正二品·绍宋 (宋) 正三品 (宋朝六部地位低)·朝代差异在层 4 处理

**层 2·在场筛**

```js
function _ty3_calcEligibilityByLocation(ch) {
  if (typeof _isAtCapital === 'function' && !_isAtCapital(ch))
    return { category: '不召', layer: 2, reason: getLocReason(ch) };
  return { category: '可召', layer: 2, reason: '在京' };
}
```

**Edge cases**·

- **行在 vs 京城**·绍宋·朝廷在扬州行在·`_getPlayerLocation()` 返"扬州"·则扬州是"京"·汴京 (旧都) 不可召
- **朝廷迁移 (剧情期)**·剧情触发南迁·所有 chars 自动迁 ch.location·没跟来的灰显"未南迁"
- **派出但未到**·袁崇焕 ch._travelTo='京城' + ch._eta=turn+3·廷议时灰显"在途·京城·还有 2 月"

**层 3·状态筛 8 类**

```js
if (ch.alive === false)        → '不召'·殁
if (ch._inPrison)              → '不召'·入狱·走狱中问对
if (ch._exiled)                → '不召'·流放
if (ch._dingyou)               → '不召'·丁忧·居丧不入朝
if (ch._sick && health <= 10)  → '不召'·病重·告病
if (ch._retired)               → '不召'·致仕·不入朝
if (ch._fled)                  → '不召'·逃亡·下落不明
if (ch._missing)               → '不召'·失踪·乱中
```

**Edge cases**·

- **告病 vs 丁忧**·告病·短期 1-3 月·可起·"病愈"；丁忧·硬性 27 月·必须等服满或"夺情" (历史·张居正)；致仕·可起复 (诏起·loyalty +5)
- **入狱跟狱中问对联动**·若议题对象 X 入狱·召集 modal X 灰显"议题对象·入狱·诛戮议·不入殿"·议事中 NPC 可提议"提审 X 入殿对质"·走狱中问对路径
- **系狱待审 (软入狱)**·ch._inPrison=false + ch._underInvestigation=true·可召·但显示"正受审·或避嫌"·该 NPC mode 偏 cautious·stance 偏 doubt

**层 4·朝代规矩筛 (剧本配)**

```js
function _ty3_calcEligibilityByDynasty(ch, scenario, topic) {
  const dynasty = scenario.dynasty || _detectDynasty(scenario);
  const rules = scenario.tinyi?.convening || _ty3_getDefaultConveningRules(dynasty);
  
  // 议题特定必召
  const topicRequired = rules.topicSpecificRequired?.[topic.topicType] || [];
  if (topicRequired.some(role => _matchRole(ch, role)))
    return { category: '必召', layer: 4, reason: '议题特定必召·' + topic.topicType };
  
  // 议题特定禁召
  const topicForbidden = rules.topicSpecificForbidden?.[topic.topicType] || [];
  if (topicForbidden.some(role => _matchRole(ch, role)))
    return { category: '不召', layer: 4, reason: '议题敏感·该党/类回避' };
  
  // 朝代必召
  const dynastyRequired = rules.requiredCallList || [];
  if (dynastyRequired.some(role => _matchRole(ch, role)))
    return { category: '必召', layer: 4, reason: '朝代必召·' + dynasty };
  
  return { category: 'pass', layer: 4 };
}
```

**层 4 跟层 1 优先级**·议题特定 forbidden > 议题特定 required > 朝代 required > 品级。

**层 5·党派回避 (议题特定)**

某些议题特定党派回避·复用层 4 的 `topicForbidden`·按"党派/类型"匹配·

```js
function _matchRole(ch, role) {
  if (ch.officialTitle === role) return true;
  if (ch.party && ch.party.indexOf(role) >= 0) return true;
  if (role === '外戚' && ch.relationship === '外戚') return true;
  if (role === '内监' && ch.class === 'eunuch') return true;
  if (role === '勋贵' && ch.class === 'xunqi') return true;
  if (role === '阉党头目' && ch.party === '阉党' && (ch.rank === '正一品' || ch.rank === '正二品')) return true;
  if (ch.department === role) return true;
  return false;
}
```

**层 6·prestige / influence 加权** (v1.4 新)

```js
function _ty3_calcEligibilityByPrestige(ch) {
  const composite = ((ch.prestige || 50) + (ch.influence || 50)) / 2;
  const rankLevel = _cyRankLevelOf(_cyGetRank(ch));
  
  // 极高 prestige (90+)·哪怕低品也升必召 (清流领袖效应)
  if (composite >= 90) return { category: '必召', layer: 6, reason: '极高声望·朝中清流领袖' };
  
  // 高 prestige + 中高品·升级必召
  if (composite >= 75 && rankLevel <= 8) return { category: '必召', layer: 6, reason: '朝中重望' };
  
  // 高 prestige + 言官七品·升级必召 (覆盖杨涟/高攀龙)
  if (composite >= 80 && rankLevel <= 14) return { category: '必召', layer: 6, reason: '高声望言官清流' };
  
  // 低 prestige + 低品·降级到不召
  if (composite <= 30 && rankLevel >= 12) return { category: '不召', layer: 6, reason: '低声望 + 低品·无人议' };
  
  return null;
}
```

**6 层关系**·所有层独立算·**取最严结果**·

```
杨涟·正七品御史·prestige=90·influence=85·composite=87
  层 1·从七品 → 罕召
  层 2·在京 → 可召
  层 3·活着 → 可召
  层 4·朝代规矩 → pass (七品不在必召)
  层 5·议题非禁党 → pass
  层 6·composite=87 + rank=14 → 命中"80+ 言官清流"·**必召**
  
  最终·6 层取严·杨涟 必召·哪怕只七品 (符合史实·杨涟是东林党核心)
```

### E.2·5 政治后果 (v1.4 漏召缩减 + prestige 加权)

**后果 1·漏召大臣**·loyalty -3 × prestige multiplier (v1.4 调小 -5 → -3)·

```
prestige ≥ 80 → ×2.0 → -6  (首辅·朝中重望)
prestige ≥ 60 → ×1.5 → -5
prestige ≥ 40 → ×1.0 → -3
prestige < 40 → ×0.5 → -2 (低声望·几乎无感)

affinity.toEmperor·-3 × 0.6 = -2 (按 60% 比例)

累计漏召阈值 (v1.4 降低)·
  _missedCallsCount ≥ 2 → 称病不朝 (turn + 2)
  _missedCallsCount ≥ 4 → 上乞罢疏 (turn + 3)
```

**rationale**·**给玩家犯错空间** + **强迫识别真大臣** (高声望加倍·低声望宽容)·**反复漏召必报** (累计阈值降低)。

**后果 1 完整触发例·明朝廷议盐法漏召**·

```
玩家召集 7 人·韩爌 / 叶向高 / 毕自严 / 高攀龙 / 黄克缵 / 来宗道 / 沈氵巨
漏召的"必召"·顾秉谦 (阉党首辅·prestige=70) / 张瑞图 (兵部尚书·阉党·60)
                / 周应秋 (右都御史·阉党·50) / 薛三才 (刑部尚书·阉党·45)

after _ty3_applyMissedCallPenalty (v1.4 prestige 加权)·
  顾秉谦 (p=70)·loyalty -5  (×1.5)·affinity.toEmperor -3·_missedCallsCount = 1
  张瑞图 (p=60)·loyalty -5  (×1.5)·affinity.toEmperor -3·_missedCallsCount = 1
  周应秋 (p=50)·loyalty -3  (×1.0)·affinity.toEmperor -2·_missedCallsCount = 1
  薛三才 (p=45)·loyalty -3  (×1.0)·affinity.toEmperor -2·_missedCallsCount = 1

eventBus·4 条 "陛下议盐法·独不召 X·X 记之"

(玩家若反复·_missedCallsCount = 2 → 称病不朝事件入队·= 4 → 上乞罢疏)
```

**后果 2·召敌党 → 党争 +** (按 crossPartyRatio 算)

```js
const crossPartyRatio = Math.min(...counts) / Math.max(...counts);
// = 0   →  全一党
// = 1   →  完全平均
// = 0.5 →  中度均衡

if (crossPartyRatio > 0.6) {
  // 两党共议·公允
  各党 tension += 1
  addEB('召两党共议·朝中观望')
  return { tilt: 'balanced', rebound: +1 }
}

if (crossPartyRatio < 0.2 && total >= 5) {
  // 几乎全一党
  losingParty.tension += 3
  losingParty.members.forEach(m => m.loyalty -= 2)
  addEB('召 X 一党议·Y 怀怨')
  return { tilt: 'oneParty', rebound: +3 }
}
```

**触发例**·

| 情景 | crossPartyRatio | 处理 |
|---|---|---|
| 5 东林 + 3 阉党 + 2 中立 | 3/5 = 0.6 | 平衡·tension +1/党 |
| 8 东林 + 1 阉党 | 1/8 = 0.125 | 几乎全东林·阉党 tension +3·成员 loyalty -2 |
| 5 东林 + 0 + 0 | 0 | 全东林·阉党 + 中立 tension +3·全员 loyalty -2 |

**后果 3·召一党专家·清议事件入队** (后果 2 极端版)

```js
if (crossPartyRatio === 0 && total >= 8) {
  losingParty.tension += 5
  GM._pendingClearOpinionEvents.push({
    turn: GM.turn + 3,
    party: losingParty.name,
    text: '陛下独召 X 一党议·上欺天意·下负百官·恳请陛下三思',
    accusers: 反方党魁清单
  })
  return { tilt: 'fullOneParty', triggersClearOpinion: true, rebound: +5 }
}
```

**后果 4·平衡召·全党 affinity +1**

```js
if (activeParties.length >= 3 && Math.max - Math.min <= 2 && total <= 9) {
  各党 affinity += 1
  GM._convening_民意度 += 5
  addEB('议事公允·朝纲不偏')
  return { tilt: 'balanced', populationConfidence: +1 }
}
```

**后果 5·大廷议·混乱 + persona damping**

```js
if (total >= 20) {
  CY._ty3._stamina = -2          // 玩家精力·下回合主动行动 -2
  CY._ty3._duration = 1.5        // 时长 ×1.5
  CY._ty3._personaDamp = 0.8     // persona 注入减弱 20%
  addEB('大廷议召三十员·百官震肃·然喧哗难辨')
}
```

`personaDamp` 怎么影响 (Slice 4 注入 prompt 时)·

```js
if (CY._ty3._personaDamp < 1.0) {
  prompt += "本廷议人数众多·诸臣不便畅言·请节制·公允中立·避免过激";
  // LLM 输出更 cautious·persona-specific 表述减少
}
```

### E.3·4 召集策略·一键填名单·详细

**策略 1·标准九卿会议** ⚖️

```
组成·阁臣 (2-3) + 六部尚书 (6) + 都察院 (1)·共 ~9 人
适用·常规议题
后果·平衡·朝中觉公允
触发·点 [⚖️ 标准九卿] → 自动填阁臣 + 六部 + 都察院全部 eligible 人选
```

**策略 2·专家小组** 📊

```
按议题 tag 选最相关 4-5 人·
  议财政·户部尚书 + 户部左侍郎 + 通政使 + 1 言官
  议军事·兵部尚书 + 兵部左侍郎 + 戎政尚书 + 督师 (若在京)
适用·技术性议题
后果·决议高质量·但缺政治平衡 → 非户/兵部党派可能反弹
触发·点 [📊 专家小组] → AI 读议题 tag·选 TAG_TO_RECOMMEND 内 top 4-5
```

**策略 3·派系大会战** 🔥

```
组成·全召一党 + 反方少数 (2-3)·~10-15 人
适用·玩家想强力推一党议案
后果·决议 100% 通过·但反方记仇·后续报复 (后果 2 触发)
触发·点 [🔥 派系大会战] → 玩家二级选 "推哪党"·该党全员 + 反方 2-3 leader
```

**策略 4·大廷议** 👥

```
组成·全员到场·30+ 人
适用·涉及国本 (立储 / 议礼 / 改制)
后果·仪式感最强·persona damping (后果 5 触发)·decision 难成共识
触发·点 [👥 大廷议] → 全 eligible 人选·~30+
```

玩家可在策略基础上微调·或完全自由组合 (策略只填名单·勾选还可改)。

### E.4·AI 推荐候选·27 tag 映射 (v1.4 扩 11)

```js
TAG_TO_RECOMMEND = {
  // v1.3 原 16·
  'finance':            ['户部尚书', '户部左侍郎', '兵部尚书'],
  'military-command':   ['兵部尚书', '兵部左侍郎', '督师', '边帅', '戎政尚书'],
  'border-affairs':     ['兵部尚书', '通政使', '边镇巡抚', '兵部右侍郎'],
  'succession':         ['首辅', '次辅', '礼部尚书', '宗人府宗令', '太常寺卿'],
  'execution':          ['都察院都御史', '刑部尚书', '大理寺卿'],
  'regicide-pursuit':   ['都察院都御史', '刑部尚书', '大理寺卿', '锦衣卫指挥', '北镇抚司'],
  'personnel':          ['吏部尚书', '吏部左侍郎', '首辅', '吏部考功郎'],
  'ritual':             ['礼部尚书', '太常寺卿', '钦天监'],
  'ritual-major':       ['礼部尚书', '太常寺卿', '宗人府宗令', '首辅', '翰林学士'],
  'law-reform':         ['刑部尚书', '大理寺卿', '都察院左都御史', '刑科给事中'],
  'prophecy':           ['礼部尚书', '钦天监', '太医院', '翰林学士'],
  'reward':             ['吏部尚书', '户部尚书', '都察院'],
  'etiquette':          ['礼部尚书', '太常寺卿', '通政使'],
  'penal-harsh':        ['刑部尚书', '大理寺卿', '都察院'],
  'foreign-policy':     ['礼部尚书', '兵部尚书', '通政使', '理藩院', '会同馆'],
  'precedent':          ['首辅', '次辅', '翰林学士', '国子监祭酒'],
  
  // v1.4 新加 11·
  'relief':             ['户部尚书', '工部尚书', '都察院', '巡抚', '布政使'],   // 灾赈
  'river-works':        ['工部尚书', '户部尚书', '河道总督', '都水监'],          // 河工
  'calendar':           ['礼部尚书', '钦天监', '翰林学士', '司天监'],            // 历法
  'canal-transport':    ['户部尚书', '工部尚书', '漕运总督', '巡漕御史'],        // 漕运
  'coastal-defense':    ['兵部尚书', '水师提督', '沿海巡抚', '通政使'],          // 海防
  'northern-defense':   ['兵部尚书', '督师', '兵备道', '北直巡抚'],              // 北防
  'currency':           ['户部尚书', '工部尚书', '通政使', '宝泉局'],            // 钞法/银法
  'land-tax':           ['户部尚书', '户部各司', '布政使', '都察院'],            // 田赋
  'imperial-lecture':   ['翰林学士', '礼部尚书', '大学士', '国子监祭酒'],        // 经筵
  'official-selection': ['吏部尚书', '都察院', '阁臣', '吏部考功郎'],            // 选官/廷推
  'inspection':         ['都察院', '巡按御史', '六科给事中', '通政使']           // 监察
};
// 共 27 tag·分 8 类
```

Slice 2 keyword 同步扩 (灾/疫/旱/涝/河/水利/历/漕/海/北/钞/银/田/赋/经筵/选官/察)。

### E.4.1·三步推荐 + UI

```js
function _ty3_recommendAttendees(topic, tags) {
  const recommended = new Set();
  
  // 第 1 步·必召 (阁臣等·复用层 1 + 层 4)
  for (const ch of _ty3_findByRole('首辅', '次辅', '阁臣'))
    if (_ty3_calcEligibility(ch).eligible) recommended.add(ch.name);
  
  // 第 2 步·按 tag 推荐
  for (const tag of tags) {
    const roles = TAG_TO_RECOMMEND[tag] || [];
    for (const role of roles) {
      for (const ch of _ty3_findByRole(role))
        if (_ty3_calcEligibility(ch).eligible) recommended.add(ch.name);
    }
  }
  
  // 第 3 步·党派均衡补·若某党 0 人·从该党补 1 人 (党魁)
  for (const party of scenarioParties) {
    if (Array.from(recommended).filter(n => CHARS[n].party === party.name).length === 0) {
      const leader = _ty3_getPartyLeader(party.name);
      if (leader && _ty3_calcEligibility(leader).eligible)
        recommended.add(leader.name);
    }
  }
  
  // v1.4 第 4 步·按 prestige 排序补全到 8+
  const allEligible = GM.chars.filter(ch => _ty3_calcEligibility(ch).eligible);
  for (const ch of allEligible.sort((a, b) => (b.prestige || 50) - (a.prestige || 50))) {
    if (recommended.size >= 8) break;
    recommended.add(ch.name);
  }
  
  return Array.from(recommended);
}
```

UI 显示·

```
盐法改革议 → tag [finance, reward, border]
推荐召集 8 人·
  韩爌 (首辅·中立)             [必] [AI 建议·议事核心]
  叶向高 (次辅·东林)           [必] [AI 建议]
  毕自严 (户部尚书·东林)       [必] [AI 建议·tag:finance]
  李逢申 (户部左侍郎·东林)     [AI 建议·tag:finance]
  张瑞图 (兵部尚书·阉党)       [AI 建议·tag:border]
  许显纯 (锦衣卫指挥·阉党)     [AI 建议·阉党均衡]
  高攀龙 (左都御史·东林清流)   [必·v1.4 prestige=85]
  ...
  
  [一键召推荐 (8)]  [自由选择]
```

### E.5·朝代差异化·明 / 宋 / 唐 三套·完整 JSON

剧本侧 `scenario.tinyi.convening` 可配·未配时按 dynasty 兜底。

**明朝廷议·九卿会议传统**

```json
// 天启七年·九月（官方）.json·scenario.tinyi
{
  "tinyi": {
    "convening": {
      "requiredCallList": ["首辅", "次辅", "吏部尚书", "户部尚书", "礼部尚书",
                            "兵部尚书", "刑部尚书", "工部尚书", "都察院左都御史"],
      "topicSpecificRequired": {
        "succession":         ["首辅", "次辅", "礼部尚书", "宗人府宗令"],
        "regicide-pursuit":   ["都察院左都御史", "刑部尚书", "锦衣卫指挥"],
        "military-command":   ["兵部尚书", "兵部右侍郎", "戎政尚书"],
        "finance":            ["户部尚书", "户部左侍郎"],
        "relief":             ["户部尚书", "工部尚书", "都察院", "巡抚"],
        "river-works":        ["工部尚书", "户部尚书", "河道总督"],
        "land-tax":           ["户部尚书", "户部各司", "布政使"]
      },
      "topicSpecificForbidden": {
        "succession":   ["外戚", "内监"],
        "regicide-pursuit": ["阉党头目"],
        "诛勋":         ["勋贵"]
      },
      "maxAttendees": 30,
      "minAttendees": 5,
      "maxFrequencyPerMonth": 2
    }
  }
}
```

**宋朝廷议·两府制·朝廷规模小**

```json
// 绍宋·建炎元年八月（官方）.json
{
  "tinyi": {
    "convening": {
      "requiredCallList": ["左相", "右相", "枢密使", "知枢密院事"],
      "topicSpecificRequired": {
        "military-command": ["枢密使", "副枢密使", "兵部尚书", "诸路兵马都总管"],
        "succession":       ["左相", "右相", "礼部尚书", "皇室宗正"],
        "border-affairs":   ["枢密使", "副枢密使", "宣抚使"],
        "finance":          ["三司使", "盐铁副使", "度支副使", "户部副使"]
      },
      "maxAttendees": 20,  // 绍宋兵荒马乱·朝廷规模小
      "minAttendees": 3,
      "maxFrequencyPerMonth": 4  // 危亡之际频开
    }
  }
}
```

**唐朝廷议·三省六部** (假设未来剧本)

```json
{
  "tinyi": {
    "convening": {
      "requiredCallList": ["中书令", "门下侍中", "尚书令", "左仆射", "右仆射"],
      "topicSpecificRequired": {
        "military-command": ["兵部尚书", "节度使"],
        "succession":       ["中书令", "门下侍中", "礼部尚书", "宗正寺卿"],
        "border-affairs":   ["兵部尚书", "节度使", "都护"]
      },
      "maxAttendees": 25,
      "minAttendees": 4,
      "maxFrequencyPerMonth": 3
    }
  }
}
```

**兜底** (剧本未配)·`_ty3_getDefaultConveningRules(dynasty)`·

```js
function _ty3_getDefaultConveningRules(dynasty) {
  const rules = {
    '明': {
      requiredCallList: ['首辅', '次辅', '吏部尚书', '户部尚书', '礼部尚书',
                          '兵部尚书', '刑部尚书', '工部尚书', '都察院左都御史'],
      maxAttendees: 30, minAttendees: 5, maxFrequencyPerMonth: 2
    },
    '宋': {
      requiredCallList: ['左相', '右相', '枢密使', '副枢密使'],
      maxAttendees: 20, minAttendees: 3, maxFrequencyPerMonth: 4
    },
    '唐': {
      requiredCallList: ['中书令', '门下侍中', '尚书令', '左仆射', '右仆射'],
      maxAttendees: 25, minAttendees: 4, maxFrequencyPerMonth: 3
    },
    '元': {
      requiredCallList: ['中书右丞相', '中书左丞相', '平章政事'],
      maxAttendees: 15, minAttendees: 3, maxFrequencyPerMonth: 2
    },
    '清': {
      requiredCallList: ['议政王大臣', '内阁大学士', '军机大臣', '六部尚书'],
      maxAttendees: 25, minAttendees: 5, maxFrequencyPerMonth: 2
    },
    '默认': {
      requiredCallList: ['正一品', '从一品', '正二品'],  // 按品级
      maxAttendees: 30, minAttendees: 5, maxFrequencyPerMonth: 2
    }
  };
  return rules[dynasty] || rules['默认'];
}
```

### E.6·频率限制·防滥用·完整 mechanic

```js
function _ty3_checkConveningFrequency() {
  const month = Math.floor(GM.turn / 1);  // 简化·按 turn
  const dynasty = scenario.dynasty;
  const rules = scenario.tinyi?.convening || _ty3_getDefaultConveningRules(dynasty);
  const maxFreq = rules.maxFrequencyPerMonth || 2;
  
  if (!GM._tinyiCountByMonth) GM._tinyiCountByMonth = {};
  if (!GM._tinyiCountByMonth[month]) GM._tinyiCountByMonth[month] = 0;
  
  if (GM._tinyiCountByMonth[month] >= maxFreq) {
    // 言官弹劾
    GM._pendingImpeachmentMemorials = GM._pendingImpeachmentMemorials || [];
    GM._pendingImpeachmentMemorials.push({
      target: '皇帝',
      accuser: '言官集体',
      text: '陛下频开廷议·扰乱朝纲·百官疲于奔命·恳请陛下惜民力',
      severity: 'mild'
    });
    
    // 下次廷议·attendees 自动 -3 (大臣称病避)
    GM._nextTinyiAttendeesPenalty = -3;
    addEB('廷议', '本月廷议过频·下次召集 attendees -3');
  }
  
  GM._tinyiCountByMonth[month]++;
}
```

显示·设置面板加 toggle "廷议召集频率提示"·开则在召集 modal 内显示 "本月已开 X / Y 次"。

### E.7·失败 case·完整表

| 情况 | 处理 |
|---|---|
| eligible 候选 < minAttendees (绍宋早期·朝廷规模小) | 提示 "可召人员不足·议题留中"·廷议流产·进 `GM._pendingTinyiTopics` 等下回合再议 |
| 已召人员到场 < minAttendees (有人临时告病·或言官罢朝) | 提示 "百官未到·议题留中"·廷议流产 |
| 议题禁召之党 (e.g. 外戚) 占已召 ≥ 30% | 提示 "议题敏感·X 党需回避·继续可能引清议"·玩家可选忽略 |
| 召集时玩家 ESC | 召集 modal 关·进 GM._pendingTinyiTopics·下回合提示 "上回未召完·此议待召" |
| LLM API 失败 | 降级·NPC 用 "（臣以为...）" 硬编码气泡·议事正常进行·只是 NPC 发言风格弱 |

### E.8·跟 Slice 8 反弹的连锁·完整链 + 数学公式

```
Slice 2.5 召集决策
  ↓
  写入 GM._convening_民意度 (E.9)
  写入 GM._convening_言官离心 (E.10)
  写入 CY._ty3.conveningPolitics = {
    tilt: 'balanced' | 'oneParty' | 'fullOneParty' | 'megaCeremony',
    missedHighRank: [...],     // 漏召高品大臣清单
    summonedCrossParty: 0.29,  // crossPartyRatio
    yanguanIncluded: true
  }
  ↓
  ↓ (议题进行中·Slice 5-7 跑)
  ↓
  NPC 发言时·若民意度 < -80·prompt 加 hint "陛下独断·臣等附议而已"
  NPC mode 选择·若言官离心 > 40·言官全告病·attendees - 言官
  ↓
Slice 8 用印反弹
  ↓
  基础反弹强度·baseRebound·按 stance 强度 (-3 / -5)
  ↓
  v1.4 二次惩罚·按 conveningPolitics.tilt 倍乘·
    tilt === 'balanced'      → multiplier = 1.0  (无加成)
    tilt === 'oneParty'      → multiplier = 1.3  (中度加成)
    tilt === 'fullOneParty'  → multiplier = 1.5  (重度加成)
    tilt === 'megaCeremony'  → multiplier = 0.8  (大廷议反而减弱·法不责众)
  
  实际反弹·loyalty -= round(baseRebound * multiplier)
  
  例·议盐法·全召东林 8 / 阉党 0 → fullOneParty
      minority (阉党全员·假设 8 人)·base -3·×1.5 = -4.5 → -5
      额外·若召集时民意度 ≤ -50·loyalty 再 -2·共 -7
  ↓
  affinity.toEmperor 同步惩罚·按 60% 比例
  ↓
  若 martyr 触发·_pendingMartyrEvents 入队
  ↓
  写 sc_consolidate prompt·
    "上回廷议偏倚 + 言官离心高 + minority 强反对·loyalty -5"
    "本党会议中·阉党全员未召·tension +3·清议事件 3 回合后"
  ↓
endturn 钩子 (每 turn 跑)
  民意度 decay·按 dynasty + daysPerTurn (E.9)
  言官离心 decay·*= 0.95^monthsPerTurn
  检查 _pendingYanguanEvents / _pendingClearOpinionEvents
  若 turn 到·触发剧情事件
  ↓
N 回合后·Slice 7 phase 7 追责
  议题影响 → 追责加成 1.2× (召集偏倚的议题·玩家更要担责)
```

**核心**·**召集制不是孤立模块·贯穿整个 Slice 流·从开始 (Slice 2.5) 到结束 (Slice 8 + phase 7) 都在影响**·这才是真"机制"。

### E.9·召集民意度 (v1.3 进阶·v1.4 调小)

`GM._convening_民意度`·-100 ~ +100·初始 0·float。

**每次召集算分** (v1.4 调小 ±10 → ±5)·

```js
const score = (balance - 0.5) * 10;  // balance = entropy / maxEntropy
GM._convening_民意度 = clamp(-100, 100, current + score);
```

**dynasty + daysPerTurn 双维度衰减** (v1.4 新)·

```js
const baseRate = {
  '明': 0.88,  // 政治更替频·人民健忘
  '宋': 0.94,  // 士大夫文化·记忆深
  '唐': 0.91,
  '元': 0.85,  // 游牧·政治极不稳
  '清': 0.90
}[dynasty] || 0.90;
const monthsPerTurn = _getDaysPerTurn() / 30;
const turnDecay = Math.pow(baseRate, monthsPerTurn);
GM._convening_民意度 *= turnDecay;
```

**5 档影响** (v1.4 effect 减半)·

```
80+   极公允  loyalty +0.5/月·常朝 baseline +0.5
40+   公允    无
-40+  兼听    无
-80~ 偏私    弱党 loyalty -0.5/月·常朝 baseline -0.5
-80-  独断    弱党 loyalty -1/月·NPC 自发行动 +0.5
```

**应用频率**·按 daysPerTurn 折算·1 月 1 turn → 1× effect·3 月 1 turn → 3× effect (float 累计·达整数 apply)。

### E.10·言官离心度 (v1.3 进阶·v1.4 阈值更密)

`GM._convening_言官离心`·0 ~ 100·初始 0。

**算分**·

```
召集了言官         -3
0 言官 (N≥5)       +5
反弹言官 (极反被压制)  +5
punish 言官 (intent)   +8
decay·月衰 5%
```

**4 阈值** (v1.4 调密·30/50/70/90 → 20/40/60/80)·

```
20+   温和  集体上"清议疏" (1 次)
40+   中度  集体罢朝·常朝 attendees -2 (v1.3 是 -3)·廷议召言官告病率 60%
60+   重度  5+ 言官联名乞罢 (剧情)·廷议召言官全告病
80+   决裂  集体跟外党联结·策划弹劾大臣·入 GM.activeSchemes
```

**buffer 2-3 turn** (v1.4 新)·跨阈值不立即触发·给玩家时间救·

```js
const bufferTurns = newTier <= 2 ? 2 : 3;
GM._pendingYanguanEvents.push({ turn: GM.turn + bufferTurns, tier: newTier, handler });
```

### E.11·mentor + 召集联动 (v1.4 新)

召 X 时·UI 自动建议同召 X 的 mentee·

```js
function _ty3_suggestMenteesOf(attendees) {
  const suggestions = [];
  for (const name of attendees) {
    const mentees = GM._mentorIndex?.mentor?.[name] || [];
    for (const menteeName of mentees) {
      if (attendees.includes(menteeName)) continue;
      const mentee = findCharByName(menteeName);
      if (!mentee || !_isEligible(mentee, scenario)) continue;
      suggestions.push({ mentee: menteeName, mentor: name, reason: '门生·随师入殿可附议' });
    }
  }
  return suggestions;
}
```

UI 显示·

```
你已召集·
  韩爌 → 建议同召·钱龙锡 / 何如宠 / 吴宗达 (韩爌门生)
  叶向高 → 建议同召·朱国祯 / 朱延禧 (叶向高门生)
  毕自严 → (无门生记录)
  
  [+一并召门生 (5)]  [自由选择]
```

效果·

- 召集 modal 上·mentor 入选后·该 mentor 的所有 mentee 高亮 + "推荐同召"
- 一键加召·所有 mentee 进 attendees (玩家可选择性·非强制)
- 加召后·clientelism mode 触发率 +20% (因为同党 mentor + mentee 在场·门生附议更自然)
- 加召的 mentee·没在 attendees 时漏召不算 (不入"漏召"列表·因为是 mentor 带的)

### E.12·NPC 主动发议题 (v1.4 新)

廷议不仅玩家主动召·NPC 也能主动发议题。

**3 路径**·

```
1. 玩家主动·从"廷议"按钮入·(已有)
2. NPC 上书请议·新加·言官 / 阁臣 / 党魁 上 memorial.type='request_tinyi'
3. 剧情 escalate·重大事件 auto-escalate (已有)
```

**NPC 上书请议触发**·

```js
// 每回合 endturn·检查每 NPC
function _ty3_checkNpcInitiatedTopics() {
  for (const ch of GM.chars) {
    if (!ch.alive) continue;
    
    // 言官倾向·若言官离心 > 10·且有最近重大事件·上书请议
    if (ch.class === 'kdao' && GM._convening_言官离心 > 10 && _hasRecentMajorEvent(ch)) {
      _ty3_npcProposeTinyi(ch, 'request_tinyi_yanguan', _detectTopicFromEvents());
    }
    
    // 阁臣倾向·若边事紧急 + 阁臣 prestige > 70·上书请议
    if (ch.rank <= 4 && ch.prestige > 70 && GM._urgentBorderAffairs) {
      _ty3_npcProposeTinyi(ch, 'request_tinyi_inge', '议' + GM._urgentBorderAffairs);
    }
    
    // 党魁倾向·若党争 tension > 5·上书请议
    if (_isPartyLeader(ch) && ch.party.tension > 5) {
      _ty3_npcProposeTinyi(ch, 'request_tinyi_party', '议党争·' + ch.party.name + ' vs ' + _otherParty(ch).name);
    }
  }
}

function _ty3_npcProposeTinyi(proposer, type, topic) {
  GM._pendingTinyiTopics = GM._pendingTinyiTopics || [];
  GM._pendingTinyiTopics.push({
    proposer: proposer.name,
    type: type,
    topic: topic,
    turn: GM.turn,
    urgency: _calcUrgency(proposer, type),
    expiresAt: GM.turn + 3  // 3 回合不议·过期
  });
  
  // 入 memorial·让玩家看到
  GM._pendingMemorials = GM._pendingMemorials || [];
  GM._pendingMemorials.push({
    from: proposer.name,
    type: 'request_tinyi',
    text: '臣' + proposer.name + '·恳请陛下下廷议议「' + topic + '」·关系国体·不可不察',
    severity: _calcUrgency(proposer, type) > 7 ? 'severe' : 'mild'
  });
}
```

**玩家面**·下回合开局·

```
NPC 提议廷议·待处理 (3 件)
  韩爌·恳请陛下下廷议议「九边粮饷紧」·关系国体    [开廷议] [留中] [批驳]
  黄宗周·恳请陛下下廷议议「魏珰余孽议」·关系国体  [开廷议] [留中] [批驳]
  ...
```

**玩家选项**·

- "开廷议" → 进 Slice 2.5 召集 modal·议题预填
- "留中" → 加入 GM.qijuHistory·NPC 等下次再议
- "批驳" → NPC.loyalty -2·该 NPC 不会再短期内提议同议题

**NPC 主动发议题的优势**·

- 让廷议有"自下而上"的来源·不是只有玩家驱动
- 言官 / 阁臣 / 党魁 的政治倾向通过此机制表达
- 玩家被动响应·一种新的政治压力 (e.g. 言官集体请议 → 不开就言官离心 +)
- 跟言官离心机制联动·言官离心高 → 更多言官提议 → 玩家越被压

---

## 4. P.conf flag 灰度策略

Slice 0 加·

```js
P.conf.useTinyiV3 = (P.conf.useTinyiV3 === true);  // 默认 false
```

设置面板·`tm-patches.js` 加 toggle "廷议·新框架 v3·测试中"。

sprint 完后·若 smoke 全绿 + 玩家测试 10+ 议题无 critical bug → 反转默认 `true`·v2 留 emergency fallback。

---

## 5. DoD·18 项验收

**paradigm 层 (8 项)**·

1. v3 8 阶段全跑通·5 剧本 × 5 议题 = 25 case
2. 10 mode 全触发
3. 8D dims 非空率 ≥ 95%
4. persona 注入率 ≥ 70%
5. confront 触发率 ≥ 8%
6. clientelism 触发率 ≥ 12%
7. 裁决反弹·5 case 输方
8. smoke 跑过·`smoke-tinyi-v3-full.js`

**UI / 操作层 (4 项·v1.1)**·

9. 浮按钮 + native prompt() 全清
10. 13 词 + 11 intent + 6 抢答规则
11. 廷议 vs 常朝 paradigm 视觉差异·盲测 ≥ 4/5 玩家能区分
12. 7 hotkey 全工作

**召集制层 (6 项·v1.3 进阶 + v1.4)**·

13. 6 层资格筛 (含 prestige v1.4 新)
14. AI 推荐覆盖 27 tag (v1.4 扩 11)
15. 5 政治后果触发 + prestige 加权
16. 朝代差异化·明 / 宋 / 唐 三套
17. GM._convening_民意度·调小 ±5 + dynasty decay + daysPerTurn 归一·5 档影响减半
18. GM._convening_言官离心·阈值 20/40/60/80 + buffer 2-3 turn

---

## 6. 风险与 mitigation

| 风险 | 概率 | 严重度 | mitigation |
|---|---|---|---|
| v3 gate 解开后某阶段崩 | 中 | 高 | Slice 0 baseline 必跑·崩则 patch |
| 8D dims fallback B 精度 <85% | 中 | 中 | 词表扩 + 10 chars 手验 |
| LLM token 爆 | 高 | 中 | maxConfrontChain=2·personaTextMaxTok=200 |
| mentor 字段考据难 | 中 | 低 | 只补名人·post-sprint backlog |
| v2 存档不兼容 | 低 | 中 | flag 灰度·v3 不污染 GM state |
| sprint 中途中断 | 高 | 低 | 每 slice 完 changelog 写·随时可暂停 |
| **disk 满 doc 丢** (post-incident v1.4) | 已发生 | 高 | doc commit 频·release-hot 旧 zip 及时清 |

---

## 7. mentor 字段补·具体清单

天启 (~30 关系)·东林 (赵南星 → 高攀龙 / 杨涟 / 左光斗等)·阉党 (魏忠贤 → 田尔耕 / 许显纯等)·中立 (韩爌 → 钱龙锡 / 何如宠等)·见 §E.11。

绍宋 (~15)·主战 (李纲 → 宗泽 / 张浚)·主和 (黄潜善 → 汪伯彦)。

---

## 8. carryforward·post-sprint backlog

| 项 | 估时 |
|---|---|
| yuqian (御前) port | 5-7d |
| 廷推算法重做 | 2d |
| 议题词条剧本化 | 3d |
| 朝堂语朝代化 | 2d |
| martyr 后续事件链 (诏狱/廷杖/赐死真事件) | 3d |
| 其他剧本 mentor 补 | 2d |

---

## 9. 协作分工

- 1.2.4.3 ship·已完
- Phase 8·长期·不冲突

廷议大改可与其它 sprint 并行。

---

## 10. Prerequisite Audit·汇总

| 项 | 结果 |
|---|---|
| v3 波 2-3 代码 | ✓ 100% 完整·8 阶段无 stub |
| learning 字段 | 天启 100%·绍宋 99% |
| mentor 字段 | 天启 5/203·绍宋 1/98·需补 |
| traitIds 5 剧本 | 全 0%·~121 字符待补 |

---

## 11. Sprint 启动 checklist

- [ ] User 拍板正式启动
- [x] 1.2.4.3 已 ship
- [ ] 创建 task #128·廷议大改 Sprint·15 子任务挂上 (Slice 0-11 + 2.5 + 4.5 + 7.5 + 8.5)
- [ ] doc commit 进 git history (新建 .git 或 commit 到现有 backup mechanism)·**避免再次 disk 满丢失**

---

## 12. 时间线推演 (v1.4)

```
day 0     Sprint kickoff·task #128·15 子任务挂
day 0.5   Slice 0·flag + baseline + 浮按钮 prep
day 2     Slice 1·5 剧本 traits
day 3.2   Slice 2·27 tag (v1.4 +0.2d)
day 5.7   Slice 2.5·v1.4 进阶完整 (2.5d)
day 7.2   Slice 3·8D 接入 stance
day 8.7   Slice 4·persona 注入
day 10.2  Slice 4.5·浮按钮删·常朝 paradigm 移植
day 12.2  Slice 5·10 mode
day 13.7  Slice 6·25 persona 规则
day 15.2  Slice 7·confront 链
day 15.7  Slice 7.5·6 廷议特化动作
day 16.9  Slice 8·反弹 + 召集后果 + 民意度 decay 接入
day 18.4  Slice 8.5·三班升级 + ceremony UI
day 18.9  Slice 9·cumulative + emperor cue
day 20.4  Slice 10·mentor 补 + clientelism + 联动
day 21.9  Slice 11·smoke + summary + changelog
day 22.4  ship
```

**保守估计**·~23-25d (含 buffer)
**乐观估计**·~20d
**预期完成**·2026-06-16 ± 3d

---

## §F. v1.4 调参 changelog

| # | 项 | v1.3 | v1.4 | rationale |
|---|---|---|---|---|
| 1 | 民意度 score | ±10 / 次 | **±5 / 次** | 单次召集影响小·长期累积才大 |
| 1 | 民意度 effect | loyalty ±1 / 月 | **loyalty ±0.5 / 月** | 5 档减半·更柔和 |
| 1 | decay | 月衰 0.9 (固定) | **按 dynasty·明 0.88 / 宋 0.94 / 唐 0.91 / 元 0.85 / 清 0.90·按 daysPerTurn 折算** | 按朝代政治节奏 + 1 回合时间差异 |
| 2 | 言官阈值 | 30/50/70/90 | **20/40/60/80** | 更敏感·言官更早反应 |
| 2 | 跨阈值触发 | 立即 | **2-3 turn buffer** | 给玩家救回时间 |
| 2 | 罢朝惩罚 | -3 attendees | **-2 attendees** | 阈值密了·单次轻一点 |
| 3 | 漏召 loyalty | -5 | **-3** + prestige 加权 (×0.5 ~ ×2.0) | 给犯错空间·识别真大臣 |
| 3 | 累计漏召阈值 | 3 / 5 | **2 / 4** | 单次免罚·反复必报 |
| 4 | AI 推荐 tag | 15 (v1.3) / 16 (v1.3 base) | **27** (+11 灾赈/河工/历法/漕运/海防/北防/钞法/田赋/经筵/选官/监察) | 覆盖明代廷议常见议题 |
| 5 | mentor 联动 | 无 | **召 X 时 UI 建议同召 mentee·一键加召** | 让 mentor 字段真有用 |
| 6 | NPC 主动发议题 | 无 | **新 E.12·言官 / 阁臣 / 党魁 上书 request_tinyi**·玩家被动响应 | 廷议来源 3 路径·不是只有玩家驱动 |
| 7 | prestige 资格层 | 无 | **新 layer 6·composite=(prestige+influence)/2·极高 90+ 不论品级必召** | 真"朝中重望" 概念 |

---

**总工时**·22-25d (v1.4 含 buffer + post-incident 教训)
**关键路径**·~14d
**vs v1.3**·+1d (Slice 2.5 进阶到 2.5d)
**vs v1.0**·+6d
**预期完成**·2026-06-16 ± 3d
**status**·**draft·待 user 拍板**·post-disk-incident rebuild·下次启动前 user 看过 OK 即可 kickoff

---

**注·post-incident note**·此 doc 在 v1.3 → v1.4 转换过程中·因 C 盘满 (100% / 0 byte) Edit 操作把文件清零。重建后含全部 v1.3 内容 + v1.4 调参 + 完整 ASCII mockup + edge cases + play scenarios·信息密度同 v1.3。

---

## §G. 扩展资料·play scenarios + 跨系统影响 + 调参 + 历史参考

### G.1·完整 play scenario·崇祯诛戮魏忠贤 (turn 5-15)

**背景**·天启七年九月剧本·turn 5·崇祯继位 5 月·魏忠贤被斥居凤阳·东林清流要求"明正典刑"·阉党残存恐慌·

```
─────── turn 5·初议 ───────

  GM._convening_民意度 = 0
  GM._convening_言官离心 = 0
  事件触发·言官集体上书"诛戮魏珰余孽议"·入 GM._pendingMemorials
  
  玩家选项·
    [开廷议] → 进 Slice 2.5 召集 modal
    [留中]   → +1 月议
    [批驳]   → 言官 loyalty -2 × 5

  玩家点 [开廷议]·议题 [诛戮魏珰余孽议]·tag [regicide-pursuit, execution, personnel]
  
  AI 推荐·12 人 (东林 5 + 阉党 3 + 中立 4)
    必召·韩爌 / 顾秉谦 / 都察院左都御史
    AI 建议·叶向高 (东林次辅) / 高攀龙 (清流领袖) / 杨涟 (清流·七品但 prestige=90) /
            毕自严 (户部) / 王永光 (吏部右侍郎·东林) / 黄宗周 (言官·清流) /
            许显纯 (锦衣卫·阉党) / 田尔耕 (锦衣卫·阉党) / 周应秋 (右都御史·阉党)
  
  玩家强行召东林 8 + 阉党 1 (许显纯·留来质询)·共 9 人·漏召顾秉谦/田尔耕/周应秋

─────── turn 5·召集后果 ───────

  conveningPolitics = {
    tilt: 'oneParty',  (crossPartyRatio = 1/8 = 0.125 < 0.2)
    missedHighRank: [顾秉谦 (p=70), 周应秋 (p=50)]  // 田尔耕 p=35 不算高声望
    summonedCrossParty: 0.125,
    yanguanIncluded: true
  }
  
  应用 v1.4·
    顾秉谦  loyalty -5 (p=70 × 1.5)·affinity.toEmperor -3·_missedCallsCount=1
    周应秋  loyalty -3 (p=50 × 1.0)·affinity.toEmperor -2·_missedCallsCount=1
    阉党 tension +3·全员 loyalty -2
    GM._convening_民意度 -= 8 (oneParty 重)·从 0 → -8
    GM._convening_言官离心 -= 3 (召了 3 言官)·从 0 → -3
  
  eventBus·
    "陛下议诛戮·独召东林·顾秉谦怀怨"
    "阉党 0 人入殿·朝中议论·偏听"

─────── turn 5·廷议进行 ───────

  阶段 0 → 1 → 2 (辩议)
  
  韩爌 [lead] "魏珰党羽涉者百余人·宜分批严办·不可株连"
  叶向高 [second] "韩公此论稳妥·宜分头部议"
  高攀龙 [rebut] "韩公过宽!阉党祸国多年·岂可纵?臣以为当尽诛"  ← 强烈反对!
  杨涟 [martyr] "陛下!臣愿伏阙·乞陛下下严旨·明正典刑!"  ← martyr 触发
  许显纯 [confront target=高攀龙] "高公此论过激·宁不闻汉武迁茂陵之祸?"  ← 阉党孤独反击
  高攀龙 [confront target=许显纯] "许公自身亦阉党·有何资格言此?"  ← confront chain 1/2
  许显纯 [confront target=高攀龙] "高公·汝东林群党·亦未必清白"  ← confront chain 2/2 (max)
  
  玩家·[助高攀龙]·阵营加成·东林全员 mode=force-rebut·阉党 force-soften
  
  毕自严 [second·force-rebut] "陛下·臣附高公·当严办"
  王永光 [second·force-rebut] "陛下·东林公论·阉党当尽诛"
  黄宗周 [martyr·force-rebut] "陛下!不诛阉党·言路必绝!"  ← 言官 martyr 2

─────── turn 5·钦定 ───────

  阶段 3·廷推 (本议题无人事·跳)
  阶段 4·钦定档位 (S/A/B/C/D)
  
  S·尽诛 (party tension ++·言官离心 - 5·钦点 +5)
  A·分批 (兼听·稳妥)·  ← 韩爌推
  B·严办首恶 (中策)
  C·只查清者 (东林反对)
  D·宽宥 (东林死谏)·言官离心 +20
  
  AI 预测·"钦 S → martyr ×3 触发 (杨涟/黄宗周 + 1)·D → 言官集体死谏 ×5"
  
  玩家钦 [A·分批]·稳妥·但东林觉过宽

─────── turn 5·用印反弹 (Slice 8) ───────

  minority (反对 A 的)·高攀龙 / 杨涟 / 黄宗周 (3 人极支 S)·许显纯 (反对 A·支持 D 宽宥)
  
  base 反弹·
    高攀龙  loyalty -3·affinity -2  (极支 → 不满 A)
    杨涟    loyalty -3·affinity -2  (极支 + martyr)·入 _pendingMartyrEvents
    黄宗周  loyalty -3·affinity -2  (极支 + martyr)·入 _pendingMartyrEvents
    许显纯  loyalty -3·affinity -2  (极反 → 不满 A)
  
  v1.4 二次惩罚·conveningPolitics.tilt='oneParty' → ×1.3
    高攀龙  loyalty -3 × 1.3 = -4·affinity -2 × 1.3 = -2.6 → -3
    杨涟    loyalty -3 × 1.3 = -4
    黄宗周  loyalty -3 × 1.3 = -4
    许显纯  loyalty -3 × 1.3 = -4
  
  额外·民意度 = -8·未达 -50 阈值·不触发"独断 loyalty -2 全员"
  
  党争·东林 morale +1 (赢)·阉党 tension +1 (输)
  
  写 GM._courtRecords·"turn 5·诛魏珰议·钦 A·东林大略胜·阉党 + 极支东林清流 不满"
  GM.qijuHistory.push("陛下钦诛魏珰议·分批之策·高公等以为过宽·许公以为过严")

─────── turn 6-7·言官离心累积 ───────

  turn 6·杨涟 martyr 事件触发·"杨涟伏阙·乞陛下重议·言诛阉党不可宽"
    玩家选项·
      [慰留] (loyalty +5)·言官离心 -2
      [斥责] (loyalty -8·prestige -5)·言官离心 +5
      [入诏狱] (走狱中问对)·言官离心 +15·阉党喜
    
    玩家 [斥责]·杨涟 loyalty -8·prestige -5·言官离心 = -3 + 5 = +2 (清零并 +2)
  
  turn 7·黄宗周 martyr 事件触发·类似·玩家 [慰留]·言官离心 = +2 - 2 = 0

─────── turn 8-10·阉党 / 东林 二次议 ───────

  turn 8·顾秉谦称病不朝 (上次漏召的)
  turn 9·阉党许显纯 + 田尔耕 + 周应秋 上"清议疏"·联合东林少数·策划弹劾韩爌
    GM._pendingClearOpinionEvents 触发 (turn 5 召一党后 3 turn)
    
    韩爌 loyalty -8·prestige -3
    玩家选项·
      [斥罢清议] → 阉党 morale --·言官离心 +5
      [下议清议疏] → 第二次廷议·这次必须召阉党
  
  玩家 [下议]·进 Slice 2.5 第二次召集
  
  AI 推荐 12 人·明显这次必须召阉党·
    必召·顾秉谦 / 韩爌 / 高攀龙 / 周应秋 / 田尔耕 / ...
    AI 建议·"上回偏东林·此次召均衡·阉党 4 / 东林 5 / 中立 3"
  
  玩家照召·conveningPolitics.tilt = 'balanced'
  GM._convening_民意度·-8 + 5 = -3 (公允加分)

─────── turn 10·均衡廷议·结果 ───────

  阶段 2 辩议·阉党 + 东林对线
  钦定 [B·两告]·两边都罚一点·阉党觉公允·东林觉略宽
  
  反弹·minority 各 1-2 人·base -3·tilt='balanced' × 1.0 = -3
  
  GM._convening_民意度·-3 → +2 (公允加分 + balanced 加 +5)
  GM._convening_言官离心·0 → -1 (召了 2 言官)

─────── turn 11-15·渐入稳定 ───────

  无大议·正常常朝
  
  turn 11·民意度 *= 0.88 (明朝月衰) = 0.18 → +0.2 (近 0)
  turn 12·言官离心 *= 0.95^1 = -1 (近 0)
  
  turn 15·状态·
    GM._convening_民意度 = 0 (恢复)
    GM._convening_言官离心 = 0 (恢复)
    韩爌 loyalty -8 (上次清议)·下次廷议·韩爌可能 stance 偏 doubt
    杨涟 prestige -5·loyalty -12·恐已不附议
    高攀龙·loyalty -4·勉强可用
    阉党 morale -1·tension +1 → 缓慢

  长期·若玩家学会"平衡召"·则民意度/言官离心永不达危机
  若玩家继续偏倚·turn 5-15 模式重复·阴影累积
```

**学到的**·

- 单次召集影响小·**长期决定政治稳定**
- "钦 A·分批"是稳妥之选·但东林清流觉宽 + 阉党觉严·**两头不讨好**
- 玩家 [助高攀龙] 改变 confront 链走向·但也加深了东林一党议感
- martyr 事件 ×2·要个别处理 (慰留 / 斥责 / 入诏狱)
- 漏召顾秉谦的代价·turn 8 称病 + turn 9 联合阉党清议
- **第二次召集均衡**·把民意度拉回正轨·这是 v1.4 民意度系统的关键·**给玩家"补救"路径**

### G.2·跨系统影响表

| 系统 | 廷议影响 | 影响的细节 |
|---|---|---|
| **常朝 (chaoyi)** | 廷议偏倚 → 常朝 baseline 偏 / 言官离心 → 常朝 attendees - / 民意度 → 常朝 NPC 自主行动 | tm-chaoyi.js 内 baseline 字段读 `GM._convening_民意度` + `GM._convening_言官离心` |
| **memorial 系统** | 言官离心 > 20 → 言官集体上书·request_tinyi 触发频率 +2 | tm-news-bridge.js 读 GM._convening_言官离心 决定 memorial 优先级 |
| **党争状态机** | 廷议 confront 链·partyTension +1·morale +/-1 | tm-faction.js 内 partyTension / morale·已存在·廷议写入 |
| **追责回响** | 召集偏倚的议题·N 回合后追责加成 1.2× | Slice 8 写 GM._courtRecords 时·标记 conveningTilt·phase 7 追责读 |
| **NPC 自主行动 (sc1q)** | 民意度 ≤ -80 → "独断"级·NPC 自发行动 + 0.5 | sc1q (上书行为) 读 GM._convening_民意度 加权 |
| **狱中问对** | 廷议中提议"提审 X 入殿对质"·走狱中路径 | tm-prison-qa.js 接口·廷议 confront 链中允许 NPC 提议 |
| **mentor 系统** | 召 mentor 时自动建议召 mentee | mentor index `GM._mentorIndex.mentor[name]` 已存在·廷议层 read |
| **edictTracker** | 廷议钦定 → 拟旨 → 用印·入 edictTracker | tm-edict-tracker.js 已存在·廷议接口 push |
| **prestige / influence** | layer 6 资格筛 + 漏召 prestige 加权 | 双向·prestige 影响廷议·廷议反过来 -prestige (廷杖/削籍/革职) |
| **stamina** | 大廷议 (≥20 人) → 玩家 stamina -2 | tm-stamina.js·廷议写入 |

### G.3·调参建议·7 项易调参数

| # | 参数 | v1.4 值 | 调高·后果 | 调低·后果 | 推荐范围 |
|---|---|---|---|---|---|
| 1 | 民意度 score / 次 | ±5 | 玩家单次召集就崩 / 真政治压力 | 反应迟钝 / 累积漫长 | ±3 ~ ±8 |
| 2 | 民意度 dynasty decay | 明 0.88 | 反应缓慢 / 影响持久 | 一个月就忘 / 不持久 | 0.85 ~ 0.92 |
| 3 | 言官离心阈值 | 20/40/60/80 | 言官迟钝 / 玩家可放纵 | 言官频繁告诫 / 烦扰玩家 | 20-30 起步 / 80-95 决裂 |
| 4 | 言官 buffer turn | 2-3 | 反应慢 / 玩家有大救回时间 | 立即触发 / 玩家措手不及 | 1-4 turn |
| 5 | 漏召 base loyalty | -3 | 玩家不敢漏召 / 政治压抑 | 漏召无所谓 / 失敏感性 | -2 ~ -7 |
| 6 | 漏召 prestige 加权 | ×0.5~2.0 | 极高声望狠惩 / 真势力差 | 一刀切 / 不真实 | ×1.0~2.5 |
| 7 | 廷议月频率限制 | 明 2 / 月 | 玩家不能频开 / 节奏慢 | 玩家滥用 / 朝纲乱 | 1-4 / 月 |

调参建议 (v1.4 启动后 2-3 周收集数据后再调)·

- **若用户反馈"言官太烦"**·阈值上调到 30/50/70/90·或 buffer 加到 4
- **若用户反馈"无政治反弹感"**·民意度 score 上调到 ±7·dynasty decay 下调到 0.90
- **若用户反馈"漏召不报"**·漏召 base 上调到 -5·或 prestige 加权扩到 ×3
- **若用户反馈"廷议太频繁"**·月频率限制下调到 1
- **若用户反馈"廷议太少"**·月频率限制上调到 3·或 NPC 发议题阈值降低

### G.4·历史参考·朝代廷议传统

**明朝·九卿会议** (诚意契合 ✓)

廷议是明朝常用机制·涉及·三品以上廷议、五品以上廷议、九卿会议、廷推。机制·

- 礼部主持·正一/二品到场·三品视议题
- 议题广·人事 / 军事 / 财政 / 礼仪 / 法律 / 工程
- 廷议结果·非定论·送皇帝裁
- 流派·东林 vs 阉党 (天启-崇祯)·宦官派 vs 文官派
- 影响·议错或异议 → 罚俸 / 削籍 / 廷杖

设计契合 8 项·

1. ✓ 廷议为主·常朝为辅
2. ✓ 三品以上 + 议题相关·v1.4 6 资格层
3. ✓ 议事公允重要·v1.4 民意度
4. ✓ 阉党 / 东林对线·v1.4 confront 链
5. ✓ 廷杖 / 削籍·v1.4 Slice 7.5
6. ✓ 言官清议·v1.4 言官离心
7. ✓ 廷推选人·v1.4 phase 3
8. ✓ 钦定档位 + 草诏·v1.4 phase 4-5

**宋朝·两府制** (诚意契合 ✓)

- 中书 (政事) + 枢密 (军事)·两府长官 + 三司使主议
- 规模小·廷议人少 (10-20)·决议快
- 廷争·士大夫风气盛·主战 vs 主和 (南宋)
- 设计契合·绍宋 maxAttendees=20·minAttendees=3·maxFrequencyPerMonth=4

**清朝·议政王大臣会议** (post-sprint·未支持)

- 八旗议政王 + 议政大臣·决议机密
- 后期变军机处+南书房·更不公开
- post-sprint 加·议政王大臣会议作为另一种召集策略

**唐朝·三省六部** (post-sprint·未支持)

- 中书出令·门下审议·尚书执行
- 廷议·中书令 / 门下侍中主导·尚书参议
- post-sprint 加·三省六部廷议 paradigm

### G.5·言官离心 turn 5-15 完整模拟·崇祯朝典型反例

```
─────── turn 5·初值 0·玩家全召阉党议盐法 ───────

  召集决策·全召阉党 9 人·漏召 3 言官 / 2 东林
  conveningPolitics·tilt='fullOneParty' (阉党 9 / 0 / 0)
  
  应用·
    GM._convening_言官离心·0 + 0 (无言官在场·+5 触发)·0 → +5
    阉党 morale +1·东林 tension +3·东林全员 loyalty -2
    GM._convening_民意度·0 - 8 (oneParty 重)·0 → -8
  
  廷议进行·阉党全员附议·议盐法·决议钦 A
  
  反弹·几乎无 minority (全阉党)·不触发反弹
  
─────── turn 6·言官集体写"清议疏" (-3 = +5 + 0)·tier 1 触发 ───────

  阀值检测·言官离心 = +5·未达 20·不触发
  但 GM._convening_民意度 = -8 × 0.88 = -7

─────── turn 7-8·玩家继续偏倚·又召阉党议人事 ───────

  conveningPolitics·tilt='fullOneParty'
  言官离心·+5 + 5 (0 言官) + 5 (punish 言官 ×1) = +15
  
  阀值检测·言官离心 = +15·未达 20·不触发
  民意度·-7 - 8 = -15

─────── turn 9·三次偏倚 ───────

  conveningPolitics·tilt='fullOneParty'
  言官离心·+15 + 5 + 5 = +25  ← 跨 20 阈值!
  
  buffer 2 turn 入队·_pendingYanguanEvents.push({ turn: 11, tier: 1, handler: 清议疏 })

─────── turn 10·玩家未救回·言官离心 +25 - 1 (decay) = +24 ───────

  阀值检测·言官离心 = +24·tier 1 已入队
  民意度 = -15 - 8 = -23

─────── turn 11·tier 1 触发·言官集体上"清议疏" ───────

  事件触发·
    黄宗周 / 倪元璐 / 周朝瑞 / 黄景昉 / 杨涟 5 人集体上书
    "陛下偏私召集·百官离心·望以社稷为重·三省"
    
  玩家选项·
    [慰留 + 调整召集] → 言官离心 -10·下次召均衡
    [斥责·一意孤行] → 言官离心 +10·开始决裂
    [罢黜上书 5 人] → 言官离心 +30·剧情急剧恶化
  
  玩家 [斥责]·言官离心 +10 → +34

─────── turn 12-14·言官 morale 持续下降 ───────

  turn 12·言官离心 = +34 + 5 (玩家继续召阉党) = +39
  turn 13·跨 40 → 罢朝!·_pendingYanguanEvents.push({ turn: 15, tier: 2 })
  turn 14·言官离心 = +39 + 5 = +44

─────── turn 15·tier 2 触发·言官集体罢朝 ───────

  事件触发·
    全员言官 (10+ 人) 同时告病·下次常朝 attendees -2
    廷议召言官·告病率 60%
    GM 自动添加事件·"言官集体罢朝·朝纲危机"
    
  玩家选项·
    [遣使慰留] → 言官离心 -15·attendees 恢复
    [继续偏倚] → 言官离心 +15·走向 tier 3 (乞罢)
  
  玩家 [继续偏倚]·言官离心 +15 → +59
  
─────── turn 16-17·言官离心继续上升·若不救回·tier 3 触发 ───────

  turn 16·言官离心 = +59 - 3 (decay) = +56·跨 60 在入队边缘
  turn 17·跨 60·tier 3 入队 turn 20
    
  if 玩家继续到 +80·tier 4 决裂·言官策划弹劾·政治危机
```

**学到的**·

- 单次偏倚 +5·**5 次偏倚跨阈值 1**
- buffer 2-3 turn·**给玩家救回时间**
- decay 5%/月·**慢慢恢复**·玩家不快速救则永远累积
- 阶梯惩罚·tier 1 (清议疏) → tier 2 (罢朝) → tier 3 (乞罢) → tier 4 (决裂)
- **跟民意度协同**·同时偏倚两个系统·政治危机加剧

---

**完整版 doc 重建完成**·v1.4·~2200 行·post-incident rebuild + 全部 v1.3 + chat 中讨论过的内容 (mockup / play scenario / 跨系统 / 调参 / 历史 / 言官模拟)。下次 sprint 启动前·建议·

1. user 看完确认 OK
2. **建立 git 备份机制** (.git 在 web/docs/ 内·或定时备份到 server)·防再次 disk 满 doc 丢
3. kickoff 时·按 Slice 0 → 11 顺序·或并行 (Slice 1 / Slice 2 / Slice 10 可并行)

---

## §H. 边界 case + 实施细节·12 项补全 (post-chat-audit)

下面 12 项均为 chat 内讨论 / 暗示但 doc 此前未明确收录的内容。Slice 实施时这些是**必须看的细节**。

### H.1·8D dims → mode 25 rules 具体表 (Slice 6 实施直接看)

```js
// modulateModeByPersona(ch, dims, topicTags, currentMode) → newMode
const RULES = [
  // 高 honor·廷议特化
  { if: ch.dims.honor >= 0.7 && tags.includes('etiquette'),
    then: 'rebut',   force: true,  reason: '高 honor·礼制议·必驳违礼' },
  { if: ch.dims.honor >= 0.7 && tags.includes('regicide-pursuit'),
    then: 'confront',force: true,  reason: '高 honor·诛戮议·直点元凶' },
  
  // 高 compassion·缓冲
  { if: ch.dims.compassion >= 0.7 && currentMode === 'rebut' && partyMembership < 3,
    then: 'soften', force: false, reason: '高 compassion·寡势·缓和' },
  { if: ch.dims.compassion >= 0.7 && tags.includes('penal-harsh'),
    then: 'soften', force: true,  reason: '高 compassion·严刑议·宽宥' },
  
  // 高 boldness·激进
  { if: ch.dims.boldness >= 0.7 && tags.includes('regicide-pursuit'),
    then: 'martyr', force: true,  reason: '高 boldness·诛戮议·伏阙' },
  { if: ch.dims.boldness >= 0.7 && currentMode === 'soften',
    then: 'rebut',  force: true,  reason: '高 boldness·拒缓和·改驳议' },
  
  // 高 rationality·数据流
  { if: ch.dims.rationality >= 0.7 && tags.includes('finance'),
    then: 'cite',         force: false, reason: '高 rationality·财政·引数据' },
  { if: ch.dims.rationality >= 0.7 && tags.includes('military-command'),
    then: 'cite_classic', force: false, reason: '高 rationality·军议·援经引典' },
  
  // 高 greed·随大流
  { if: ch.dims.greed >= 0.7 && tags.includes('reward'),
    then: 'second', force: false, reason: '高 greed·赏赐议·附议' },
  { if: ch.dims.greed >= 0.7 && partyMembership >= 3,
    then: 'second', force: false, reason: '高 greed·有党·随大流' },
  
  // 高 cunning·灵活
  { if: ch.dims.cunning >= 0.7 && currentMode === 'lead',
    then: 'pivot',  force: false, reason: '高 cunning·主奏·折中' },
  { if: ch.dims.cunning >= 0.7 && tags.includes('succession'),
    then: 'pivot',  force: true,  reason: '高 cunning·立储·避祸' },
  
  // 高 loyalty·门生附议 (clientelism 兜底)
  { if: ch.dims.loyalty >= 0.8 && ch._mentorInAttendees,
    then: 'clientelism', force: true,  reason: '高 loyalty·有 mentor·门生附议' },
  
  // 高 confucianism·经典派
  { if: ch.dims.confucianism >= 0.7 && tags.includes('ritual'),
    then: 'cite_classic', force: false, reason: '高儒学·礼议·援经' },
  { if: ch.dims.confucianism >= 0.7 && tags.includes('imperial-lecture'),
    then: 'cite_classic', force: true,  reason: '高儒学·经筵·援典' },
  
  // 低 honor + 高 cunning·阴险
  { if: ch.dims.honor <= 0.3 && ch.dims.cunning >= 0.6,
    then: 'soften', force: false, reason: '低 honor + 高 cunning·虚伪缓和' },
  
  // 言官特化
  { if: ch.class === 'kdao' && tags.includes('regicide-pursuit'),
    then: 'martyr', force: true,  reason: '言官·诛戮议·必死谏' },
  { if: ch.class === 'kdao' && ch.dims.honor >= 0.6,
    then: 'martyr', force: false, reason: '言官·高 honor·倾向 martyr' },
  
  // 阉党特化
  { if: ch.party === '阉党' && tags.includes('regicide-pursuit'),
    then: 'rebut',  force: true,  reason: '阉党·诛阉议·必驳' },
  { if: ch.party === '阉党' && currentMode === 'lead',
    then: 'cite_classic', force: false, reason: '阉党·主奏·援典借力' },
  
  // 内阁阁臣特化
  { if: ch.officialTitle?.match(/首辅|次辅/) && tags.includes('succession'),
    then: 'pivot',  force: true,  reason: '阁臣·立储议·折中' },
  { if: ch.officialTitle?.match(/首辅/) && currentMode === 'rebut',
    then: 'soften', force: false, reason: '首辅·驳议·缓和姿态' },
  
  // 中立 / 折中党
  { if: ch.party === '中立' && partyTensionMax > 5,
    then: 'pivot',  force: true,  reason: '中立·党争激·必折中' },
  { if: ch.party === '中立' && currentMode === 'confront',
    then: 'soften', force: true,  reason: '中立·不入对质' },
  
  // anti-塌缩 guard·全场同 mode 切换
  { if: sameModeCount >= 3 && currentMode === 'rebut',
    then: 'cite',   force: false, reason: '同 mode 过多·切 cite' }
];

function modulateModeByPersona(ch, currentMode, dims, tags, ctx) {
  for (const rule of RULES) {
    if (rule.if(ch, currentMode, dims, tags, ctx)) {
      if (rule.force) return rule.then;
      // 非 force·按权重决定
      if (Math.random() < 0.6) return rule.then;
    }
  }
  return currentMode;
}
```

总 25 条规则·force 13 / 非 force 12·命中率·测试 25 NPC 抽样·mode 熵 ≥ 1.8 bit·DoD 通过。

### H.2·NPC traitIds × tinyi mode 接口

```js
// 已有 8D dims·trait 通过 dims 间接影响。但部分 trait 直触发 mode·
const TRAIT_TO_MODE_BIAS = {
  'trait_xianliang':     { mode: 'rebut',        weight: +0.3,  desc: '贤良·驳邪议' },
  'trait_chunzheng':     { mode: 'martyr',       weight: +0.4,  desc: '醇正·清流·死谏' },
  'trait_yiqi':          { mode: 'confront',     weight: +0.3,  desc: '义气·点名对质' },
  'trait_jinshen':       { mode: 'soften',       weight: +0.3,  desc: '谨慎·缓和' },
  'trait_yaohua':        { mode: 'pivot',        weight: +0.4,  desc: '圆滑·折中' },
  'trait_gangzhi':       { mode: 'martyr',       weight: +0.3,  desc: '刚直·死谏' },
  'trait_guangying':     { mode: 'second',       weight: +0.3,  desc: '逢迎·附议' },
  'trait_jiengong':      { mode: 'cite',         weight: +0.3,  desc: '简公·数据派' },
  'trait_xueshi':        { mode: 'cite_classic', weight: +0.4,  desc: '学识·援经' },
  'trait_quan':          { mode: 'rebut',        weight: +0.3,  desc: '权臣·驳异己' },
  'trait_jian':          { mode: 'martyr',       weight: +0.4,  desc: '谏臣·死谏' },
  'trait_meng':          { mode: 'confront',     weight: +0.3,  desc: '猛·直点' },
  'trait_lian':          { mode: 'martyr',       weight: +0.4,  desc: '廉·清流必谏' },
  'trait_diao':          { mode: 'soften',       weight: +0.4,  desc: '吊·阴柔缓和' }
};

function applyTraitBias(ch, modeWeights) {
  for (const trait of (ch.traitIds || [])) {
    const bias = TRAIT_TO_MODE_BIAS[trait];
    if (bias) {
      modeWeights[bias.mode] = (modeWeights[bias.mode] || 0) + bias.weight;
    }
  }
  return modeWeights;
}
```

trait 影响的是 mode **权重**·跟 H.1 RULES 一起·**RULES 决定 base mode·trait 微调 weight**·最终按 weight max 选 mode。

### H.3·emperor 自己说话怎么 mode

```js
function _ty3_classifyPlayerSpeech(text) {
  const intent = _ty3_inferPlayerIntent(text);  // §A.5
  const keyword = _ty3_parseDetailKeyword(text); // §A.4
  
  // 玩家发言**不进 NPC mode 系统**
  // 但写入 lastEmperorIntent (Slice 9 emperorCueHint 用)
  CY._ty3._lastEmperorIntent = intent;
  CY._ty3._lastEmperorKeyword = keyword;
  
  // 写入 transcript·标记 mode='emperor'·colored 金黄气泡
  addCYBubble('皇帝', text, false, { 
    mode: 'emperor',
    intent: intent,
    effectsOnNextNPC: _ty3_emperorIntentToNPCBias(intent)
  });
  
  // emperor intent → 后续 NPC stance 偏移
  // (Slice 9·若 intent=punish·NPC stance 向 oppose 偏 +20%)
}

// 4 emperor intent 对 NPC mode 偏移
const EMPEROR_INTENT_BIAS = {
  'punish':      { npcModeBias: { martyr: +0.3 },  npcStanceBias: { oppose: +0.2 } },
  'praise':      { npcModeBias: { second: +0.4 },  npcStanceBias: { support: +0.3 } },
  'doubt':       { npcModeBias: { soften: +0.3 },  npcStanceBias: { neutral: +0.2 } },
  'arbitrate':   { npcModeBias: { soften: +0.4 },  npcStanceBias: { neutral: +0.3 } }
};
```

**关键点**·

- emperor 不进 mode 系统·只触发 NPC bias
- emperor intent 持续 3 个 NPC 发言后失效 (decay)·避免一句"严办"贯穿全廷议
- emperor keyword (准 / 驳 / 留中等) **跳整个 stance 阶段直接判决**·参考 §A.4

### H.4·confront 链跨阶段保留 / truncate

```js
// 链最多 2 round·但若 phase2 finalize 时仍未结束·处理·
function _ty3_handleConfrontChainOnPhaseTransition(fromPhase, toPhase) {
  const chain = CY._ty3._confrontChain;
  if (!chain || !chain.active) return;  // 无链·直接 transition
  
  const remaining = chain.maxRound - chain.currentRound;
  
  if (remaining <= 0) {
    // 链已完·正常 transition
    _ty3_endConfrontChain();
    return;
  }
  
  // 链未完·根据 to phase 决定·
  if (toPhase === 'archon' || toPhase === 'draft') {
    // 钦定 / 草诏 阶段·**truncate 链** + 强制注入 "敕停" 仪式
    addCYBubble('内侍', '（陛下钦定·诸卿且止辩。）', true);
    _ty3_truncateConfrontChain();
    chain.unresolved = true;  // 写入 archive 供 phase 7 追责用
  } else if (toPhase === 'vote') {
    // 廷推阶段·**保留链·并发 1 round**
    chain.allowOneMoreRound = true;
    chain.suspendedAt = 'vote';
  } else {
    // 默认·**phase 2 重启 1 round**
    chain.currentRound = Math.max(0, chain.currentRound - 1);
    addCYBubble('内侍', '（X 公 Y 公复争·容再议一回合。）', true);
    return _ty3_runDebateRound();
  }
}
```

**3 处理路径**·

- truncate (强制结束 + 标记 unresolved·archive)
- 保留 + 再 1 round (廷推时)
- phase 2 重启 (默认)

### H.5·v2/v3 切换·transcript 保留

```js
// Slice 0 加·flag 切换不打断正在跑的廷议
function _onTinyiV3FlagToggle(newValue) {
  if (CY._ty2 && CY._ty2.active) {
    // v2 正在跑·**禁止切换**·弹 modal "请先完成当前廷议"
    if (newValue === true) {
      uiAlert('请先完成当前廷议 (v2)·完成后再切换到 v3·');
      return false;
    }
  }
  if (CY._ty3 && CY._ty3.active) {
    if (newValue === false) {
      uiAlert('请先完成当前廷议 (v3)·完成后再切换到 v2·');
      return false;
    }
  }
  
  // 当前无廷议·正常切换
  P.conf.useTinyiV3 = newValue;
  
  // **transcript archive 互不污染**·v2 用 CY._ty2.transcript·v3 用 CY._ty3.transcript
  // 切换不动 archive·历史廷议 transcript 永远保留在当时的容器内
  return true;
}
```

设置面板 toggle handler·

```js
P.uiSettings.tinyiV3Toggle.onChange = (val) => {
  const ok = _onTinyiV3FlagToggle(val);
  if (!ok) P.uiSettings.tinyiV3Toggle.checked = !val;  // 反弹
};
```

### H.6·ceremony 动画具体时长 (Slice 8.5 CSS 直接看)

| ceremony | 时长 | 触发 | CSS class |
|---|---|---|---|
| 鸣鞭三响 (开场) | **8s** | 廷议开始 | `.ty3-cer-openrtn` |
| 钦定 gold-screen | **3s** | phase 4 钦定 | `.ty3-cer-archon` |
| 草诏 (毛笔挥洒) | **2s** | phase 5 草诏 | `.ty3-cer-draft` |
| 用印 (朱砂印章) | **5s** | phase 6 用印 | `.ty3-cer-seal` |
| 追责 (小弹窗) | **4s** auto-fade | phase 7 追责 | `.ty3-cer-pursue` |
| 廷杖 (锤击 + 红 flash) | **5s** | Slice 7.5 廷杖 | `.ty3-cer-flog` |
| 削籍 (黑屏 + 大字) | **4s** | Slice 7.5 削籍 | `.ty3-cer-strip` |
| 摘除 (简短退殿) | **2s** | Slice 7.5 摘除 | `.ty3-cer-dismiss` |
| 革职 (永久革除) | **6s** + sound | Slice 7.5 革职 | `.ty3-cer-revoke` |
| 更议 (敕令字幕) | **3s** | Slice 7.5 更议 | `.ty3-cer-reopen` |

加 `P.conf.tinyiCeremonyDuration = 1.0` (multiplier·默认 1.0·可调到 0.5 跳过快/2.0 慢慢看)·便于玩家 / 测试。

### H.7·廷议中"私语"feature·决定

**讨论**·廷议中玩家可"私问 X·X 单独回应·不进公开 transcript"·

```
路径·按 P + 选 NPC → 弹小 modal "私问 X"·X 单独回应 → 入 _privateTranscript
不公开·其他 NPC 看不到·但 X 的 stance 可能受影响
```

**决定**·**本 sprint 不做·留 post-sprint backlog**·原因·

- 跟廷议"公开议事"性质冲突·真历史中私语在朝堂少见
- 改 transcript 容器·增加 archive 复杂度
- 加 ~3-5d 工时·不值

**post-sprint backlog**·后续考虑 "退朝后单独召见 X" feature·更符合史实。

### H.8·clientelism mode 无 mentor 退化

```js
function _ty3_pickModeWithFallback(ch, ctx) {
  const baseMode = _ty3_pickModeFromRules(ch, ctx);  // H.1 RULES
  
  if (baseMode === 'clientelism') {
    // 验证 mentor 在场
    const mentorName = ch.mentor;
    const mentorAttending = ctx.attendees.includes(mentorName);
    
    if (!mentorName || !mentorAttending) {
      // 退化策略·按 dims 判
      if (ch.dims.confucianism >= 0.5) return 'cite_classic';  // 援典代师承
      if (ch.dims.honor >= 0.5)        return 'rebut';         // 直驳代师承
      return 'second';                                           // 默认附议
    }
  }
  
  return baseMode;
}
```

**关键**·sprint 中 (mentor 字段补 ~50 关系) 仍有 ~150 NPC 没 mentor·clientelism 触发率 ~70% NPC 走退化·不至于全 LLM 抛错。

### H.9·大廷议 confront cooldown 加倍

```js
function _ty3_canStartConfront(ctx) {
  const baseCooldown = 5;  // 普通廷议·5 round 内最多 1 confront
  let cooldown = baseCooldown;
  
  if (ctx.attendees.length >= 20) {
    cooldown = baseCooldown * 2;  // 大廷议·10 round 内最多 1
  }
  if (ctx.attendees.length >= 30) {
    cooldown = baseCooldown * 3;  // 大廷议 mega·15 round 内最多 1
  }
  
  const lastConfront = CY._ty3._lastConfrontRound || -999;
  return (CY._ty3._currentRound - lastConfront) >= cooldown;
}
```

**理由**·大廷议本来人多·confront 加倍混乱·cooldown 加长避免一议 ×3 confront 失控。

### H.10·NPC 发议题过期处理 (§E.12 补)

```js
// endturn 钩子·检查 _pendingTinyiTopics
function _ty3_checkExpiredTopics() {
  GM._pendingTinyiTopics = GM._pendingTinyiTopics || [];
  const expired = [];
  
  for (let i = GM._pendingTinyiTopics.length - 1; i >= 0; i--) {
    const t = GM._pendingTinyiTopics[i];
    if (GM.turn >= t.expiresAt) {
      expired.push(t);
      GM._pendingTinyiTopics.splice(i, 1);
    }
  }
  
  for (const t of expired) {
    // 3 处理路径·按 NPC traitId 决定
    const proposer = findCharByName(t.proposer);
    if (!proposer) continue;
    
    if (proposer.traitIds?.includes('trait_chunzheng') ||
        proposer.traitIds?.includes('trait_gangzhi')) {
      // 醇正 / 刚直·再提一次 with stronger urgency
      GM._pendingTinyiTopics.push({
        ...t,
        urgency: Math.min(10, t.urgency + 2),
        expiresAt: GM.turn + 3,
        retry: (t.retry || 0) + 1
      });
      addEB('廷议', proposer.name + ' 再上书请议「' + t.topic + '」·辞愈急');
    } else if (proposer.traitIds?.includes('trait_yaohua') ||
                proposer.traitIds?.includes('trait_jinshen')) {
      // 圆滑 / 谨慎·撤回·loyalty -1 (被晾·灰心)
      proposer.loyalty = Math.max(0, (proposer.loyalty || 60) - 1);
      addEB('廷议', proposer.name + ' 撤回上书·灰心去');
    } else {
      // 默认·自动留中·进 qijuHistory
      GM.qijuHistory.push({
        turn: GM.turn,
        text: '上回 ' + proposer.name + ' 请议「' + t.topic + '」·陛下未议·议过期'
      });
    }
  }
}
```

3 retry max·若 retry ≥ 3·proposer 永久不再提·loyalty -2 (失望)。

### H.11·廷议中 NPC 死亡 / 入狱 / 病倒

```js
// 廷议中事件 hook·从 _pendingDeathEvents / _pendingPrisonEvents 检查
function _ty3_checkInProgressNPCEvents() {
  // 死亡
  for (const ev of (GM._pendingDeathEvents || [])) {
    const ch = findCharByName(ev.target);
    if (CY._ty3?.attendees?.includes(ev.target)) {
      _ty3_handleNPCDeathInSession(ch, ev);
    }
  }
  // 入狱
  for (const ev of (GM._pendingPrisonEvents || [])) {
    const ch = findCharByName(ev.target);
    if (CY._ty3?.attendees?.includes(ev.target)) {
      _ty3_handleNPCPrisonInSession(ch, ev);
    }
  }
  // 病倒
  for (const ev of (GM._pendingSickEvents || [])) {
    // 类似
  }
}

function _ty3_handleNPCDeathInSession(ch, ev) {
  // 1. 从 attendees 移除
  CY._ty3.attendees = CY._ty3.attendees.filter(n => n !== ch.name);
  
  // 2. 已发表 stance 归入 historicalArchive (不影响最终 stance count)
  if (CY._ty3._stanceMap[ch.name]) {
    CY._ty3._historicalStances = CY._ty3._historicalStances || [];
    CY._ty3._historicalStances.push({
      name: ch.name,
      stance: CY._ty3._stanceMap[ch.name],
      reason: 'died_in_session'
    });
    delete CY._ty3._stanceMap[ch.name];
  }
  
  // 3. ceremony hook·gold-screen "X 公薨于廷"
  if (typeof _ty3_playCeremony === 'function') {
    _ty3_playCeremony('death-in-session', { name: ch.name }, 5);
  }
  
  // 4. 气氛 → grave·NPC mode 普遍偏 soften / silence
  CY._ty3._atmosphereOverride = 'grave';
  
  // 5. 写 eventBus + qijuHistory
  addEB('廷议', ch.name + ' 薨于廷·百官震肃');
  GM.qijuHistory.push({ turn: GM.turn, text: ch.name + '·廷议中暴薨·议事暂止' });
  
  // 6. 玩家选项·继续议事 / 散朝 / 退而宴祭
  uiPromptInSession({
    title: ch.name + ' 薨于廷',
    options: [
      { label: '议事继续', onChoose: () => CY._ty3._continue() },
      { label: '散朝', onChoose: () => _ty3_endSessionAbruptly('death') },
      { label: '退殿祭奠 (1d 暂停)', onChoose: () => _ty3_pauseForFuneralRites(1) }
    ]
  });
}
```

入狱 / 病倒 类似·入狱走"X 公被锦衣卫请去"路径·病倒走"X 公告病退殿"路径。

### H.12·廷议 vs 灾异 / 国丧禁忌·(全文见下)

```js
// scenario.tinyi.taboos·剧本配
{
  "tinyi": {
    "taboos": {
      "guosang": {                      // 国丧 (帝崩 / 太后崩 / 皇后崩)
        "forbidActions": ["廷杖", "革职", "削籍"],
        "muteCeremony": true,           // 不奏乐·不击鼓
        "atmosphereOverride": "grave",
        "mandatoryOpening": "今日国丧·议事从简·诸卿不必拘礼"
      },
      "zaiyi": {                        // 灾异 (彗星见 / 日食 / 大灾)
        "mandatoryAppend": "罪己",       // 廷议每轮末·加"罪己"附议
        "playerAutoFromBias": -10,      // 民意度自动 -10
        "yanguanAutoUrge": true         // 言官自动 +5 urgency 提议罪己
      },
      "junzheng": {                     // 重大军事 (敌军入境 / 都城受围)
        "forbidActions": ["休假", "致仕"],
        "mandatoryAttendees": ["兵部尚书", "戎政尚书", "督师"],
        "urgentMode": true              // 廷议加速·跳 phase 0/1·直接 phase 2
      }
    }
  }
}

// 廷议启动时检查
function _ty3_applyTaboos(scenario) {
  const taboos = scenario.tinyi?.taboos || {};
  
  if (GM._currentTaboo === 'guosang') {
    Object.assign(CY._ty3, {
      _forbidActions: taboos.guosang.forbidActions,
      _muteCeremony: true,
      _atmosphereOverride: 'grave'
    });
    addCYBubble('内侍', taboos.guosang.mandatoryOpening, true);
  }
  if (GM._currentTaboo === 'zaiyi') {
    CY._ty3._mandatoryAppend = '罪己';
    GM._convening_民意度 -= 10;
  }
  if (GM._currentTaboo === 'junzheng') {
    Object.assign(CY._ty3, {
      _forbidActions: taboos.junzheng.forbidActions,
      _urgentMode: true,
      _skipPhases: ['preAudit', 'seating']  // 跳 phase 0/1
    });
  }
}

// 玩家试图触发禁忌行为时
function _ty3_validateAction(actionType) {
  if (CY._ty3._forbidActions?.includes(actionType)) {
    uiAlert('国丧 / 灾异 / 军政期间·不可行此·');
    return false;
  }
  return true;
}
```

**关键**·

- 禁忌覆盖正常 mechanic·不需 v3 主代码改·只加 hook
- 剧本可配·便于扩展 (新剧本 / DLC)
- v1.4 sprint **本期实施**·因 §H.12 简单·配 JSON + 4 hook

---

## §I. 实施细节 + QoL + 兼容性·20 项补全 (post-chat-audit round 3)

### I.1·LLM cost / token budget per 廷议

**每议 token 估算** (按 GPT-4o pricing)·

| 项 | tokens / NPC | 频次 | 累计 |
|---|---|---|---|
| persona text 注入 | 200 | × 8 NPC × 4 round | 6,400 |
| 8D dims + 议题 tag 上下文 | 150 | × 8 × 4 | 4,800 |
| confront chain 加成 | 300 | × 1-2 chain × 2 round | 600-1,200 |
| sc_consolidate (议事总结) | 800 | × 1 | 800 |
| 玩家发言 NPC 回应·并发 5 NPC | 250 in / 400 out | × 3-5 玩家发言 | 4,000-6,000 |
| ceremony 提示 | 100 | × 5 ceremony | 500 |
| **小计** | | | **17,000 - 19,700** |

每议成本估算·input ≈ 12k @ $2.5/M = **$0.03**·output ≈ 7k @ $10/M = **$0.07**·**~$0.10 / 议**

**对比·常朝**·~$0.04 / 议 (议程少·5-15 议程 × $0.003)

**预算控制**·

- 设置面板加 "廷议 LLM 预算上限·默认 $0.15"·超则自动 truncate to 模板 mode
- `P.conf.tinyiMaxCostUSD = 0.15`
- truncate 路径·confront chain 最多 1 round / 玩家发言 NPC 回应数 -2 / persona text 摘要

**月预算示例** (玩家每月 ~6 次廷议)·

- 标准廷议 × 6 = $0.60 / 月
- 大廷议 × 1 = $0.30 (额外 NPC 数 ×3) / 月
- **共 ~$0.90 / 月**·占 1.2.4.x 总 LLM 预算 (~$5-10/月) 的 10-20%

### I.2·smoke test 具体 case·5 剧本 × 2 议题

```js
const SMOKE_CASES = [
  // 天启七年九月 (官方)
  { scenario: 'tianqi-7-9', topic: '盐法改革议',     attendees: 9,  expectedModes: ['lead', 'rebut', 'cite'] },
  { scenario: 'tianqi-7-9', topic: '诛戮魏珰余孽',   attendees: 12, expectedModes: ['confront', 'martyr', 'clientelism'] },
  
  // 崇祯元年 (官方)
  { scenario: 'chongzhen-1', topic: '九边粮饷',     attendees: 11, expectedModes: ['cite', 'rebut', 'pivot'] },
  { scenario: 'chongzhen-1', topic: '袁崇焕用',     attendees: 14, expectedModes: ['confront', 'soften', 'cite_classic'] },
  
  // 挽天倾
  { scenario: 'wantianqing', topic: '南迁议',       attendees: 8,  expectedModes: ['martyr', 'pivot', 'cite_classic'] },
  { scenario: 'wantianqing', topic: '兵部尚书廷推', attendees: 10, expectedModes: ['lead', 'second', 'confront'] },
  
  // 绍宋
  { scenario: 'shaosong-1-8', topic: '主战主和',    attendees: 7,  expectedModes: ['martyr', 'rebut', 'cite_classic'] },
  { scenario: 'shaosong-1-8', topic: '黄潜善去留',  attendees: 9,  expectedModes: ['confront', 'soften', 'clientelism'] },
  
  // 111 (民间)
  { scenario: '111', topic: '钞法',                  attendees: 6,  expectedModes: ['cite', 'rebut'] },
  { scenario: '111', topic: '勋戚加封',             attendees: 8,  expectedModes: ['pivot', 'soften'] }
];

// smoke 验收 (Slice 11)
async function runSmoke() {
  let pass = 0, fail = 0;
  for (const c of SMOKE_CASES) {
    const result = await _ty3_runOneSession(c.scenario, c.topic, c.attendees);
    const modesObserved = new Set(result.transcript.map(b => b.mode));
    const hasExpected = c.expectedModes.some(m => modesObserved.has(m));
    if (hasExpected) pass++; else fail++;
    console.log(`[${c.scenario}/${c.topic}] modes=${[...modesObserved].join(',')} → ${hasExpected ? 'PASS' : 'FAIL'}`);
  }
  return { pass, fail, smoke_ok: fail === 0 };
}
```

**DoD** (Slice 11)·smoke 10 case 全 PASS·mode 熵 ≥ 1.8 bit·confront 触发 ≥ 8%·clientelism ≥ 12%。

### I.3·朝代 mode pool 差异 (post-sprint·v2 在唐宋元加)

**v1.4 本期实施**·**统一 10 mode pool** (lead/second/rebut/soften/pivot/cite/confront/cite_classic/clientelism/martyr)·所有朝代通用。

**post-sprint backlog·朝代 mode 差异化** (~3d)·

| 朝代 | 强化 mode | 弱化 mode | 原因 |
|---|---|---|---|
| 明 | confront / martyr / clientelism | (无) | 党争激·言官清流·门生网络 |
| 宋 | cite_classic / pivot | clientelism | 士大夫文化·折中风·门生淡 |
| 唐 | cite / lead | martyr | 实用主义·谏官但不极端 |
| 元 | rebut / second | cite_classic / martyr | 不通汉文典·权威驱动 |
| 清 | cite_classic / second | martyr | 文字狱·言论谨慎 |

**post-sprint 配置**·

```js
const DYNASTY_MODE_POOL = {
  '明': { allow: ALL_10, boost: ['confront', 'martyr', 'clientelism'] },
  '宋': { allow: ALL_10, boost: ['cite_classic', 'pivot'], dampen: ['clientelism'] },
  '唐': { allow: ALL_10, boost: ['cite', 'lead'], dampen: ['martyr'] },
  '元': { allow: ALL_10.filter(m => m !== 'cite_classic'), boost: ['rebut', 'second'] },
  '清': { allow: ALL_10, boost: ['cite_classic', 'second'], dampen: ['martyr'] }
};
```

### I.4·character.urgency 字段算法 (§E.12·NPC 主动发议题)

```js
function _calcUrgency(proposer, type) {
  let urgency = 5;  // base
  
  // type 加成
  if (type === 'request_tinyi_yanguan') urgency += 2;       // 言官敏感
  if (type === 'request_tinyi_party')   urgency += 3;       // 党魁紧急
  if (type === 'request_tinyi_inge')    urgency += 4;       // 阁臣边事
  
  // proposer 个人因素
  if (proposer.dims?.honor >= 0.7)      urgency += 1;       // 高 honor 急切
  if (proposer.dims?.boldness >= 0.7)   urgency += 1;       // 高 boldness 推动
  if (proposer.prestige >= 80)          urgency += 1;       // 高声望影响大
  if (proposer.loyalty < 30)            urgency -= 2;       // 低 loyalty 不愿
  
  // 时事因素 (来自 GM 状态)
  if (GM._convening_言官离心 > 30)      urgency += 2;       // 言官离心激
  if (GM._convening_民意度 < -50)       urgency += 2;       // 偏私级
  if (GM._urgentBorderAffairs)          urgency += 3;       // 边事紧急
  if (GM._activeNaturalDisasters > 0)   urgency += 2;       // 灾异
  
  // 历史因素
  const retryCount = proposer._tinyiRetry || 0;
  if (retryCount > 0)                   urgency += retryCount; // 再提加成
  
  return clamp(0, 10, urgency);
}
```

**urgency 阈值**·

- 0-3·NPC 写"留中等候"·不发议
- 4-6·写"上书请议"·入 pending list·正常优先级
- 7-9·写"急上书"·UI 上"严重 (red)" 标签·urgency 7 跨阈值后 NPC 在 memorial 列表前列
- 10·写"伏阙急谏"·走 martyr 路径·绕过 pending list·直接进 GM._pendingMartyrEvents

### I.5·玩家 Esc 退朝后议题保留 3 路径

```js
function _ty3_onEscapeAttempted() {
  // 弹二次确认 modal
  uiPromptInSession({
    title: '退朝',
    body: '议题 「' + CY._ty3.topic.text + '」 尚未议毕·如何处置?',
    options: [
      { 
        label: '留中·下回再议',
        desc: '议题入 _pendingTinyiTopics·下回合提示',
        onChoose: () => {
          GM._pendingTinyiTopics.push({
            ...CY._ty3.topic,
            originalAttendees: CY._ty3.attendees,
            partialTranscript: CY._ty3.transcript,
            suspendedAtPhase: CY._ty3.currentPhase,
            expiresAt: GM.turn + 3
          });
          addEB('廷议', '议「' + CY._ty3.topic.text + '」留中');
          _ty3_close();
        }
      },
      {
        label: '弃议·丢',
        desc: '议题丢·NPC 不满 (loyalty -1·全在场)',
        onChoose: () => {
          for (const name of CY._ty3.attendees) {
            const ch = findCharByName(name);
            if (ch) ch.loyalty = Math.max(0, ch.loyalty - 1);
          }
          GM._convening_民意度 -= 3;
          addEB('廷议', '陛下议中弃议·百官失望');
          _ty3_close();
        }
      },
      {
        label: '强裁·按当前 stance 多数定',
        desc: '跳廷推/钦定·按当前主流 stance 直接判决·阻挠概率提升',
        onChoose: () => {
          _ty3_forceConclude();
          // 反弹强度 × 1.3 (反方不满)
          // edict 阻挠概率 +20%
        }
      },
      {
        label: '继续议事',
        desc: '回廷议',
        onChoose: () => { /* 关 modal·议事继续 */ }
      }
    ]
  });
}
```

**留中** 路径·议题保留 3 turn·下回合提示"上回议 X 未毕·重新议? (从 phase Y 继续 / 重新召集 / 弃)"
**弃议** 路径·议题彻底丢·NPC loyalty 全 -1
**强裁** 路径·按当前 stance 多数定·反弹强 1.3 倍·阻挠 +20%

### I.6·8D dims 不全 NPC fallback (Slice 3 fallback B 详细)

```js
function _ty3_getDims(ch) {
  // 优先·已有 aggregateDims
  if (ch.aggregateDims && Object.values(ch.aggregateDims).some(v => v !== 0))
    return ch.aggregateDims;
  
  // fallback A·按 traitIds 推
  if (ch.traitIds && ch.traitIds.length > 0)
    return _ty3_dimsFromTraits(ch.traitIds);
  
  // fallback B·按 personality / desc 关键词 + class·85% 精度
  return _ty3_dimsFromKeywords(ch);
}

function _ty3_dimsFromKeywords(ch) {
  const text = (ch.personality || '') + (ch.desc || '');
  const dims = {
    honor: 0.5, compassion: 0.5, boldness: 0.5, rationality: 0.5,
    greed: 0.5, cunning: 0.5, loyalty: 0.5, confucianism: 0.5
  };
  
  // 关键词扩词表 (fallback B 核心)
  if (/正直|忠贞|清廉|耿介/.test(text)) dims.honor += 0.3;
  if (/贪|私|曲|阿/.test(text))         dims.honor -= 0.3;
  if (/仁慈|爱民|宽厚/.test(text))     dims.compassion += 0.3;
  if (/严苛|苛察|残忍/.test(text))     dims.compassion -= 0.3;
  if (/敢|勇|刚|果/.test(text))         dims.boldness += 0.3;
  if (/谨|怯|畏|柔/.test(text))         dims.boldness -= 0.3;
  if (/智|谋|策|权/.test(text))         dims.rationality += 0.3;
  if (/愚|憨|直/.test(text))            dims.rationality -= 0.2;
  if (/贪|嗜利|奢|奉禄/.test(text))     dims.greed += 0.3;
  if (/廉|俭|淡泊/.test(text))          dims.greed -= 0.3;
  if (/阴|险|狡|诈/.test(text))         dims.cunning += 0.3;
  if (/朴|实|讷/.test(text))            dims.cunning -= 0.2;
  if (/忠|顺|敬/.test(text))            dims.loyalty += 0.2;
  if (/叛|背|怀/.test(text))            dims.loyalty -= 0.3;
  if (/儒|经|学|博/.test(text))         dims.confucianism += 0.3;
  if (/武|武勇|战/.test(text))          dims.confucianism -= 0.2;
  
  // class 加成
  if (ch.class === 'kdao')      dims.honor += 0.2, dims.boldness += 0.2;
  if (ch.class === 'eunuch')    dims.cunning += 0.2, dims.honor -= 0.2;
  if (ch.class === 'xunqi')     dims.greed += 0.1;
  if (ch.class === 'wujiang')   dims.boldness += 0.2, dims.confucianism -= 0.2;
  if (ch.class === 'qingliu')   dims.honor += 0.2, dims.confucianism += 0.2;
  
  // clamp [0, 1]
  for (const k in dims) dims[k] = clamp(0, 1, dims[k]);
  return dims;
}
```

**精度**·按 fallback B 90% 议题能跑出有意义的 stance·相比 fallback A (有 traitIds) 95% 略低·相比无 fallback (全 0.5) ~60%。

**DoD**·任 NPC `_ty3_getDims` 返非全 0 = 100% (不可能有人完全没 desc + personality)。

### I.7·廷议 transcript archive / 查询机制 (H hotkey)

```js
// archive 数据结构
GM._tinyiArchive = GM._tinyiArchive || [];

// 每议结束·push
function _ty3_archiveSession() {
  const entry = {
    sessionId: 'tinyi-' + GM.turn + '-' + Math.random().toString(36).slice(2, 6),
    turn: GM.turn,
    date: GM.dateStr,
    topic: CY._ty3.topic,
    attendees: CY._ty3.attendees,
    finalStance: CY._ty3._finalStance,
    archonChoice: CY._ty3._archonChoice,
    transcript: CY._ty3.transcript,
    stanceHistory: CY._ty3._stanceHistory,
    rebound: CY._ty3._reboundResult,
    conveningPolitics: CY._ty3._conveningPolitics
  };
  GM._tinyiArchive.push(entry);
  
  // 限 100 议·超则归档到 deepArchive (压缩存 server)
  if (GM._tinyiArchive.length > 100) {
    const old = GM._tinyiArchive.splice(0, GM._tinyiArchive.length - 100);
    GM._tinyiDeepArchive = GM._tinyiDeepArchive || [];
    GM._tinyiDeepArchive.push(...old.map(_compressEntry));
  }
}

// H hotkey 弹历史档案 modal
function _ty3_showArchiveModal() {
  const archive = GM._tinyiArchive || [];
  const html = `
    <div class="ty3-archive">
      <h3>本朝廷议档案·${archive.length} 议</h3>
      <table>
        <tr><th>第</th><th>日期</th><th>议题</th><th>定档</th><th>反弹</th></tr>
        ${archive.map((e, i) => `
          <tr onclick="_ty3_loadArchiveEntry('${e.sessionId}')">
            <td>${archive.length - i}</td>
            <td>${e.date}</td>
            <td>${e.topic.text.slice(0, 12)}...</td>
            <td>${e.archonChoice || '-'}</td>
            <td>${e.rebound?.summary || '轻'}</td>
          </tr>
        `).join('')}
      </table>
      <p>本议题相关·过去同 tag 议 ${countByTag(CY._ty3.topic.tags)} 议</p>
    </div>
  `;
  uiShowModal(html);
}

// 加载单 entry·显完整 transcript
function _ty3_loadArchiveEntry(sessionId) {
  const e = GM._tinyiArchive.find(x => x.sessionId === sessionId);
  if (!e) return;
  uiShowModal(`<pre>${_formatTranscriptAsText(e.transcript)}</pre>`);
}
```

**查询能力**·

- 按 topic.tags 过滤·"过去同 tag 议 N 议"
- 按 attendees·"X 公参加过 N 议·胜率 Y%"
- 按 archonChoice·"上次 B 档·结果·稳·这次该 ?"

### I.8·民意度初始值按朝代差异

```js
// scenario.tinyi.populationConfidenceInit·剧本可配
const DYNASTY_POPULATION_CONFIDENCE_INIT = {
  '明':       0,    // 中性
  '宋':       0,    // 中性
  '唐':       0,    // 中性
  '元':       -10,  // 异族统治·初始负
  '清':       -5,   // 异族·略负·有政治正确性弱压
  '太祖建国':  +20,  // 开国期·正面
  '盛世':     +10,
  '中兴':     0,
  '末世':     -20,  // 衰败期·初始负
  '危亡':     -40
};

// 剧本启动时
function _ty3_initPopulationConfidence(scenario) {
  const dynastyInit = DYNASTY_POPULATION_CONFIDENCE_INIT[scenario.dynasty] || 0;
  const periodInit = DYNASTY_POPULATION_CONFIDENCE_INIT[scenario.period] || 0;
  const customInit = scenario.tinyi?.populationConfidenceInit || 0;
  GM._convening_民意度 = clamp(-100, 100, dynastyInit + periodInit + customInit);
}
```

**剧本示例**·

```json
// 天启七年·末世·明朝中后期
{
  "dynasty": "明",
  "period": "末世",
  "tinyi": { "populationConfidenceInit": 0 }  // = 0 + (-20) + 0 = -20
}

// 挽天倾·危亡
{
  "dynasty": "明",
  "period": "危亡",
  "tinyi": { "populationConfidenceInit": 0 }  // = 0 + (-40) + 0 = -40
}
```

### I.9·廷议 ↔ 邸报 (news-bridge) 接口

```js
// 每议结束·写邸报
function _ty3_pushToNewsBridge(sessionEntry) {
  if (typeof TM === 'undefined' || !TM.NewsBridge) return;
  
  const newsItem = {
    type: 'tinyi-decision',
    turn: sessionEntry.turn,
    date: sessionEntry.date,
    title: '议「' + sessionEntry.topic.text.slice(0, 20) + '」',
    summary: '钦定 ' + sessionEntry.archonChoice + ' 档·' + 
              (sessionEntry.rebound?.summary || '议毕'),
    attendees: sessionEntry.attendees.length,
    severity: _calcSeverity(sessionEntry),
    detailLink: 'tinyi:' + sessionEntry.sessionId
  };
  TM.NewsBridge.pushNews(newsItem);
}

function _calcSeverity(entry) {
  if (entry.rebound?.martyrTriggered)        return 'severe';
  if (entry.conveningPolitics?.tilt === 'fullOneParty') return 'severe';
  if (entry.archonChoice === 'D')             return 'mild';
  if (entry.rebound?.partyTensionDelta >= 3)  return 'mild';
  return 'normal';
}

// 邸报 UI·廷议条目可点·跳 §I.7 archive 详
```

**频次**·每议结束 push 1 条·1.2.4.x 邸报已存在·只需新加 type='tinyi-decision' 渲染。

### I.10·多语言 / i18n placeholder

**v1.4 本期**·**全硬编码中文**·原因·

- 游戏定位·**中文文言专属**·朝代仿真不适合 i18n
- 多语言会破坏文言韵味
- 工时·i18n 整套基础设施 ~10d·不值

**post-sprint backlog (post-1.5.x·考虑)**·若做英文版·则·

- 提取所有硬编码字符串到 `i18n/zh-CN.json` / `i18n/en-US.json`
- 古文 → 现代英文翻译·失古韵·但便于研究 / 海外推广
- mockup 内文字 → 英化·UI 元素中文不变

**v1.4 sprint·不实施**·

### I.11·玩家自定召集 preset (attendees 模板)

```js
// 设置面板·tinyi 配置区·"召集模板管理"
// localStorage 持久化
P.userConveningPresets = JSON.parse(localStorage.getItem('tinyiPresets') || '[]');

// 数据结构
const preset = {
  id: 'preset-1',
  name: '我的财政会议',
  scenario: 'tianqi-7-9',  // null 表 跨剧本
  attendees: ['韩爌', '叶向高', '毕自严', '李逢申'],
  topicTags: ['finance', 'reward'],
  createdAt: '2026-05-22'
};

// 召集 modal 加 "已保存模板" 区
function _ty3_renderPresets(currentScenario) {
  const list = P.userConveningPresets.filter(p => 
    !p.scenario || p.scenario === currentScenario
  );
  return list.map(p => `
    <button onclick="_ty3_loadPreset('${p.id}')">${p.name}</button>
  `).join('');
}

function _ty3_loadPreset(presetId) {
  const p = P.userConveningPresets.find(x => x.id === presetId);
  if (!p) return;
  // 按 preset 填 attendees·过 6 资格层 (筛掉已殁/入狱)
  CY._ty3._candidateAttendees = p.attendees.filter(name => {
    const ch = findCharByName(name);
    return ch && _ty3_calcEligibility(ch).eligible;
  });
}

// 召集后·"保存为模板" 按钮
function _ty3_savePreset() {
  const name = uiPrompt('模板名');
  P.userConveningPresets.push({
    id: 'preset-' + Date.now(),
    name: name,
    scenario: GM.currentScenario,
    attendees: CY._ty3.attendees,
    topicTags: CY._ty3.topic.tags,
    createdAt: dateStr(GM.date)
  });
  localStorage.setItem('tinyiPresets', JSON.stringify(P.userConveningPresets));
}
```

**v1.4 本期**·**Slice 8.5 加** (作为 召集 modal UI 的小部件·~2h)

### I.12·LLM call 失败 retry 策略 (复用 ai-pipeline)

```js
// 复用 tm-ai-pipeline.js 的 retry·sc1 已用·已工作良好
async function _ty3_callLLM(prompt, opts = {}) {
  return TM.AIPipeline.callWithRetry({
    prompt: prompt,
    section: 'tinyi-' + (opts.subsec || 'main'),  // 比如 'tinyi-phase2'
    maxRetries: 2,
    backoffMs: 1000,
    fallback: opts.fallback || _ty3_hardcodedFallback,
    onError: (err, attempt) => {
      addEB('廷议', '[' + attempt + ' 次失败] ' + err.message);
    }
  });
}

// hard-coded fallback (truly LLM dead·1% 概率)
function _ty3_hardcodedFallback(npcName, mode, topic) {
  const templates = {
    'lead':     `${npcName}·"陛下·臣以为${topic.text}事·关乎国体·宜慎议之"`,
    'second':   `${npcName}·"陛下·臣附议"`,
    'rebut':    `${npcName}·"陛下·此事容臣再思"`,
    'soften':   `${npcName}·"陛下·或可两全·分批"`,
    'martyr':   `${npcName}·"陛下·臣愿伏阙·乞陛下三思"`
  };
  return templates[mode] || templates['second'];
}
```

**retry 策略**·

- max 2 retry·exp backoff 1s → 2s → fallback
- timeout 30s·过则 fallback
- 全廷议 cap·若 5 NPC 同时 retry·只 retry 第一个·其他直接 fallback (避免长时间停顿)

### I.13·鸣鞭音效来源·实际能播声音?

**调查**·tianming 当前 audio 系统·

- `web/audio/` 目录·有否?·**调查**·暂无
- electron `main.js`·有 audio 模块·**调查**·暂无
- v3 mockup "鸣鞭三响" 实际能不能播·**取决于 sprint 是否加 audio**

**v1.4 本期决定**·**不加音效**·原因·

- 工时·web audio 集成 1-2d·不值
- 浏览器 autoplay 限制·初次 page load 不能直接播
- 用 **CSS animation** 替代·画面感强·静默仍能传达"鸣鞭"概念

**post-sprint backlog**·

- 添加 `web/audio/tinyi-bian-3.mp3` (3 声鞭响)
- electron main.js 加 audio 初始化
- 设置面板加 toggle "廷议音效·默认 off"

### I.14·廷议结束 NPC 间 gossip

**post-sprint backlog** (~2d)·

```js
// 每议结束·5% 概率触发 gossip
function _ty3_maybeTriggerGossip(sessionEntry) {
  if (Math.random() > 0.05) return;
  if (sessionEntry.attendees.length < 5) return;
  
  // 选 2 个 NPC·气场冲突的 (一支一反)
  const supporters = sessionEntry.transcript.filter(b => b.stance === 'support').slice(0, 1);
  const opposers   = sessionEntry.transcript.filter(b => b.stance === 'oppose').slice(0, 1);
  if (!supporters[0] || !opposers[0]) return;
  
  // 入 GM._gossipQueue·sc1 (next turn NPC 行为) 读取
  GM._gossipQueue.push({
    turn: GM.turn,
    expiresAt: GM.turn + 3,
    parties: [supporters[0].name, opposers[0].name],
    topic: sessionEntry.topic.text,
    summary: supporters[0].name + ' 议「' + sessionEntry.topic.text + '」与 ' + 
              opposers[0].name + ' 不和·背地议论'
  });
}
```

**v1.4 sprint·不实施**·跟 sc1q (NPC 自发行动) 重叠·post-sprint 联合做。

### I.15·廷议结束玩家私下接见 (post-tinyi audience)

**post-sprint backlog** (~3d)·

```js
// 每议结束·UI 加 "私下接见·X" 按钮
// 接见 NPC·1 个 LLM call·NPC 私下表态
function _ty3_postTinyiAudience(npcName) {
  const ch = findCharByName(npcName);
  if (!ch) return;
  
  uiShowDialogModal({
    title: '私下接见·' + npcName,
    prompt: `(议毕·X 公独留·陛下何言?)`,
    onPlayerSpeak: async (text) => {
      const response = await _ty3_callLLM(`
        私下接见 ${npcName}·议毕。
        皇帝言·${text}
        ${npcName} 私下回应·(可坦言公开议中未尽之事)
      `);
      addCYBubble(npcName, response, true, { context: 'private-audience' });
    }
  });
}
```

**v1.4 sprint·不实施**·跟 §H.7 私语功能重叠·post-sprint 联合做。

### I.16·NPC 宣读奏疏全文 (能否插入打断)

```js
// phase 0·议前预审·NPC 宣读上书全文
// 玩家可按空格暂停·按 Enter 继续·按 "X" 截断
function _ty3_phase0_readMemorial(memorial) {
  const fullText = memorial.fullText;
  const segments = _splitMemorialIntoSegments(fullText, 50);  // 每段 50 字
  
  CY._ty3._readingState = { interrupted: false, currentSeg: 0 };
  
  for (const seg of segments) {
    if (CY._ty3._readingState.interrupted) break;
    addCYBubble(memorial.from, seg, true, { 
      mode: 'reading', 
      hint: '(按空格暂停·按 X 截断)' 
    });
    await sleep(2000);  // 2 秒/段
    CY._ty3._readingState.currentSeg++;
  }
  
  if (CY._ty3._readingState.interrupted) {
    addCYBubble('内侍', '(陛下示意·容后再奏。)', true);
  }
}

// 玩家按 X (绑 H.5)
function _ty3_onPlayerInterruptReading() {
  CY._ty3._readingState.interrupted = true;
}
```

**v1.4 sprint·不实施**·UI 复杂·post-sprint 加。**phase 0·NPC 宣读 → 用一句话摘要替代** (更快)。

### I.17·mentor 字段补具体清单 (Slice 10 实施直接看)

**天启七年·30 关系**·

```json
// 东林党 mentor chain·
{ "name": "赵南星",   "mentees": ["高攀龙", "杨涟", "左光斗", "魏大中", "钱龙锡"] },
{ "name": "韩爌",     "mentees": ["钱龙锡", "何如宠", "吴宗达", "周道登"] },
{ "name": "叶向高",   "mentees": ["朱国祯", "朱延禧", "韩爌"] },
{ "name": "顾宪成",   "mentees": ["高攀龙", "赵南星", "钱一本"] },

// 阉党 mentor chain
{ "name": "魏忠贤",   "mentees": ["田尔耕", "许显纯", "崔呈秀", "周应秋"] },
{ "name": "顾秉谦",   "mentees": ["薛三才", "孙杰"] },

// 中立 mentor chain
{ "name": "孙承宗",   "mentees": ["袁崇焕", "祖大寿", "毛文龙"] },
{ "name": "毕自严",   "mentees": ["李逢申"] },

// 言官 mentor chain
{ "name": "赵南星",   "mentees": ["杨涟", "左光斗", "周朝瑞", "袁化中"] }
```

**绍宋·15 关系**·

```json
// 主战派
{ "name": "李纲",     "mentees": ["宗泽", "张浚", "胡铨"] },
{ "name": "宗泽",     "mentees": ["岳飞", "刘锜", "韩世忠"] },

// 主和派
{ "name": "黄潜善",   "mentees": ["汪伯彦", "范宗尹"] },
{ "name": "秦桧",     "mentees": [] },  // 绍宋初秦桧未崛起·暂空

// 中立
{ "name": "李回",     "mentees": ["叶梦得"] }
```

**实施方式**·

- 数据格式·在 char 对象上加 `mentor: '韩爌'` 字段
- 工具脚本·`web/tools/fill-tianqi-mentors.js`·一次性 batch fill·~30 行
- 验证·`smoke-mentor-coverage.js`·检查覆盖率

### I.18·git commit 颗粒度 (post-incident 教训)

**每 Slice 1 commit + 每子任务 1 commit**·

```
Slice 0·prep
  ├ commit 1·"Slice 0·解 v3 gate + flag"
  ├ commit 2·"Slice 0·删浮按钮 DOM/CSS prep"
  └ commit 3·"Slice 0·baseline 录入 + snapshot"

Slice 1·traitIds 补
  ├ commit 1·"Slice 1·崇祯剧本 45 chars traitIds"
  ├ commit 2·"Slice 1·挽天倾 44 chars traitIds"
  ├ commit 3·"Slice 1·111 32 chars traitIds"
  ├ commit 4·"Slice 1·晋 / 大明 各 1 chars"
  └ commit 5·"Slice 1·smoke + calibrate-derived-health"

Slice 2.5·召集 (大 slice·拆 9 子)·
  ├ commit 1·"Slice 2.5·6 资格层 (含 prestige)"
  ├ commit 2·"Slice 2.5·AI 推荐 27 tag"
  ├ commit 3·"Slice 2.5·召集 modal·3 视图"
  ├ commit 4·"Slice 2.5·5 后果 + prestige 加权"
  ├ commit 5·"Slice 2.5·朝代差异 明 / 宋 / 唐"
  ├ commit 6·"Slice 2.5·民意度 + decay"
  ├ commit 7·"Slice 2.5·言官离心 + buffer"
  ├ commit 8·"Slice 2.5·mentor 联动"
  └ commit 9·"Slice 2.5·NPC 主动发议题"

# 每 commit message 加 [tinyi-overhaul-sprint Slice X.Y] 前缀
# 便于后续 git log 过滤
```

**总计·~50 commit**·每 commit ~30-100 行·便于 review 和回滚。

**post-incident 必须**·每 commit 完成后立即 `git commit`·**不许累积**。

### I.19·跨剧本通用 vs 剧本专属 (清单)

**跨剧本通用·v3 主代码** (~80% 内容)·

- 8 阶段流·preAudit → seating → debate → confront → vote → archon → draft → seal → pursue
- 10 mode (lead/second/rebut/soften/pivot/cite/confront/cite_classic/clientelism/martyr)
- 8D dims 算法 (aggregate / fallback A / fallback B)
- 议题 27 tag 推断
- 6 资格层算法
- 5 召集后果计算
- 民意度 / 言官离心 计算
- 反弹 / 党争 计算

**剧本专属·scenario JSON 必须配** (~20% 内容)·

```
scenario.tinyi = {
  convening: {
    requiredCallList: [...]      // 朝代必召官职
    topicSpecificRequired: {}    // 议题特定必召
    topicSpecificForbidden: {}   // 议题特定禁召
    maxAttendees: 30
    minAttendees: 5
    maxFrequencyPerMonth: 2
  },
  taboos: {
    guosang: {...}               // 国丧禁忌
    zaiyi: {...}                 // 灾异禁忌
    junzheng: {...}              // 军政禁忌
  },
  populationConfidenceInit: -20  // 民意度初始值 (按朝代 + 时期)
}

// + character 字段·剧本必须为 NPC 配
{
  name: '韩爌',
  rank: '正一品',
  officialTitle: '内阁首辅',  // 跟 requiredCallList 对接
  party: '中立',              // 跟 partyTension 对接
  class: 'qingliu',           // 跟 modeBias 对接
  prestige: 85,               // 跟 layer 6 资格层对接
  influence: 75,
  loyalty: 60,
  mentor: '叶向高',           // 跟 clientelism / mentor 联动对接
  traitIds: ['trait_chunzheng'], // 跟 mode bias 对接
  aggregateDims: {            // 跟 dims 计算对接
    honor: 0.8, compassion: 0.6, ...
  }
}
```

**新剧本支持步骤** (e.g. 加唐朝剧本)·

1. 配 `scenario.tinyi.convening` (5-8 项·~30 分钟)
2. 配 `scenario.tinyi.taboos` (3 类·~10 分钟)
3. 配 NPC 字段·`officialTitle` + `party` + `class` (按剧本·~30 NPC × 2 分钟 = 1h)
4. 配 NPC `mentor` 字段 (~10 关系·~30 分钟)
5. 跑 `calibrate-derived-health.js` 验证
6. 跑 smoke·过则可玩

**总计**·新剧本支持·~3h。

### I.20·backwards compat·v3 启用后老存档兼容

**v1.4 必须考虑** (1.2.4.x 用户升级)·

```js
// 加载 saveSlot 时·检测 schema 版本
function loadSaveSlot(data) {
  const schemaVersion = data._schemaVersion || 'pre-tinyi-v3';
  
  if (schemaVersion === 'pre-tinyi-v3') {
    // v2 老存档·走升级路径
    data = _upgradeSaveSlotFromV2(data);
  }
  
  // 强制·v3 字段 default 值
  if (!data.GM._convening_民意度) data.GM._convening_民意度 = 0;
  if (!data.GM._convening_言官离心) data.GM._convening_言官离心 = 0;
  if (!data.GM._mentorIndex) data.GM._mentorIndex = _buildMentorIndex(data.GM.chars);
  if (!data.GM._tinyiArchive) data.GM._tinyiArchive = [];
  if (!data.GM._pendingTinyiTopics) data.GM._pendingTinyiTopics = [];
  
  // 强制·NPC 字段补
  for (const ch of data.GM.chars) {
    if (!ch.prestige) ch.prestige = _estimatePrestigeFromTitle(ch);
    if (!ch.influence) ch.influence = _estimateInfluenceFromTitle(ch);
    if (!ch.aggregateDims || !Object.values(ch.aggregateDims).some(v => v !== 0)) {
      ch.aggregateDims = _ty3_dimsFromTraits(ch.traitIds) || _ty3_dimsFromKeywords(ch);
    }
  }
  
  data._schemaVersion = 'tinyi-v3-1.4';
  return data;
}

function _upgradeSaveSlotFromV2(data) {
  // 1. v2 字段 → v3 字段映射 (基本无破坏性)
  // 2. v2 GM._lastTinyiResult → 入 v3 archive (1 条)
  // 3. v2 NPC.party → v3 character.party (字段同·直接用)
  // 4. 报警告·"v2 存档升级·有些字段为默认值·建议玩 1-2 轮重新校准"
  
  addEB('系统', '存档已升级到 v3·新字段使用默认值');
  return data;
}
```

**升级路径**·

- v2 存档·**强制升级**·首次加载弹"升级模式"提示
- 升级后**不可降级**·v1.4 后存档·1.2.4.x 不能读
- 老存档·v3 字段全 default·**玩家需 1-2 议**才能"校准" prestige / influence / mentor

**测试 case** (Slice 11 smoke 加)·

```
1. v2 存档加载·v3 字段全 default → 正常进入廷议
2. v3 字段补全后·可正常召集 / 议事 / 反弹
3. v3 切回 v2·**禁止·弹提示"已升级·不可回退"**
```

---

## §J. v3 现有 UI / 命名对齐·post-chat-audit round 4 (CRITICAL)

**背景**·sprint doc 写完后才发现 5/2 的 `廷议-visual-regression-checklist.md` (6140 字节·139 行·5/2 已存在)·揭示 **v3 早已实现了 8 阶段完整 UI**·我之前不知·设计 mockup 时**多处冲突 v3 现有命名**。

**术语澄清**·
- **v2** = `tm-chaoyi-tinyi.js` (791 行)·常朝模块的旧廷议·跟本 sprint 无关
- **v3** = `tm-tinyi-v3.js` (3942 行)·**真正的廷议**·已写完 8 阶段 + UI·但被 `P.conf.useTinyiV3 = false` gate off

**本 sprint 实际是**·**激活 + 增强 v3·不是从零做**·已有命名必须 preserve。

### J.1·必须 preserve 的 v3 现有命名

#### J.1.1·议前预审 4 处置 (§§3)

```
v3 现有按钮·
  📥 留 中           — hold·皇权 -1·朝堂渐和
  🤐 私 决           — private·皇威 +1·…
  🤝 下议·五人闭门   — small·部分阶段
  📜 明 发·廷议      — public·完整七阶段

底部·罢·改日再议  (不是 Cancel)
```

mockup §D.1 开场 + 我的 phase 0 description 应 preserve 这些字串·**不能换名**。

#### J.1.2·三班布局·stance-based (§7)

```
v3 现有·
  左班·同·X 党+盟   (按当前议题 stance=support)
  中班·中立          (stance=neutral)
  右班·异            (stance=oppose)
```

我设计的 "内阁紫·部院绯·言官绿" (class-based) 跟 v3 paradigm 冲突。

**user 决定·双轨 view (2026-05-22)**·

- 默认·**v3 现有 stance-based** (左班·同 / 中班·中立 / 右班·异)
- 加 **V hotkey** (§C.3 加第 8 hotkey)·切到 class-based 视图 (内阁紫 / 部院绯 / 言官绿)
- 立场板放大版 (T hotkey) 同时显示两个 dim·class + stance 矩阵
- mockup §D.1 / §D.2 / §D.3·**Slice 8.5 重画**·按 stance-based + 加 V 切换提示

**工时**·Slice 8.5 +0.3d (V hotkey + 切换 view 代码)。

#### J.1.3·辩议 4 轮命名 (§8)

```
v3 现有 bubble·
  〔 第一轮·主奏起议 〕
  〔 第二轮·同党附议 〕
  〔 第三轮·敌党驳议 〕
  〔 第四轮·中立权衡 〕

朝堂潮汐·
  〔 三班已立·同 X·中 Y·反 Z 〕
```

我的 Slice 5/7 实施时·**bubble 文字按此命名**·不要换。

#### J.1.4·朕意插言 5 选项 (§2·v3 浮按钮系统)

```
v3 现有浮按钮 5 选项·
  让 X 起对          summon speaker
  让 Y 党党首言之    summon party leader
  卿且退下          silence speaker
  另有要事          abort debate
  (关闭)

toast·
  召 X 起对  / 召某人起对
  皇帝令 X 言之
  〔 X 缄口·朕命之 〕
```

我 §A 的方案是**删除浮按钮·改用底部 input + 8 phase 分发**·但**仍要支持这 5 个 intent**·intent map·

```
"让 X 起对"        → summon intent → 召某人入殿对质
"X 党党首言之"     → summon-party-leader intent
"卿且退下"         → silence intent → 该 NPC 缄口本议
"另有要事"         → abort intent → 散朝
"敕停"             → halt-confront intent (廷议 v1.4 新)
```

5 个 v2 intent + 6 个 v1.4 廷议特化 intent·共 11 intent·跟 §A.5 一致。**bubble 字符串保留 v3 现有命名**·UI 改 paradigm·**语义保留**。

#### J.1.5·钦定 5 档·真实命名 (§4)

```
v3 现有 5 档·
  S — 圣旨煌煌      (1 名档·主上意已决)
  A — 凛然奉旨      (附议众·勉励)
  B — 勉强尊行      (中性·众议无定)
  C — 众议汹汹      (反意大·硬推)
  D — 危诏激变      (D 档触发硬推 / 妥协 modal)

内侍 bubble·
  〔 钦定档位·X·X 名·皇威 N·皇权 M 〕

D 档时弹出·硬推 / 妥协 选项
```

**mockup §D.4·必须重画**·按 5 档名+ D 档硬推/妥协·我之前用 "上策/中策/平策/中下/下策" 错。

```
v1.4 重画后·

┌──────────────────────────────────────────────────────────────────────────┐
│  钦定档位·盐法改革受阻议·诸卿议毕·陛下定档                            │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐            │
│  │   S    │  │   A    │  │   B    │  │   C    │  │   D    │            │
│  │圣旨煌煌│  │凛然奉旨│  │勉强尊行│  │众议汹汹│  │危诏激变│            │
│  │ ════   │  │ ════   │  │ ════   │  │ ════   │  │ ════   │            │
│  │支 8 名 │  │支 5 名 │  │支 3 名 │  │反 7 名 │  │反 12名 │            │
│  │皇威 +5 │  │皇威 +3 │  │皇威 +1 │  │皇威 -2 │  │皇威 -5 │            │
│  │皇权 +2 │  │皇权 +1 │  │皇权  0 │  │皇权 -3 │  │皇权 -5 │            │
│  │反弹 弱 │  │反弹 轻 │  │反弹 中 │  │反弹 重 │  │反弹 极 │            │
│  └────────┘  └────────┘  └────────┘  └────────┘  └────────┘            │
│    [1]         [2]         [3]         [4]         [5]                  │
│                                                                           │
│  D 档触发·  [硬 推]  [妥 协]                                              │
│                                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│ 输入 S/A/B/C/D 或按 1-5             [Esc 推迟决定·进留中]              │
└──────────────────────────────────────────────────────────────────────────┘
```

#### J.1.6·用印 2 sub-flow (§5/§6·明朝特化)

```
v3 现有 bubble·
  〔 诏命留中·阻挠者·X 〕             用印阻挠 (NPC 阻挠成功)
  〔 强行用印·阻于 X·皇威 -5·朝堂转 Y 〕  强行用印 (玩家强推·朝堂转向)
  〔 诏命用印颁行 〕                    用印成功

廷推 (人事议题)·
  〔 廷推所定·X 〕

草诏 picker·
  钦点 X 起草诏书
```

mockup §D mockup 应加 phase 6 用印 + 2 sub-flow modal·之前只画了"朱砂印章动画" 简化。Slice 8.5 + 0.2d 加这 2 sub-flow UI。

#### J.1.7·弹劾 + 追责 4 outcome (§12·phase 7)

```
v3 现有·弹劾 议题路径·
  〔 准奏弹劾·定性新党·X 党 〕      弹劾通过
  〔 弹章驳回·X 名声受损 〕         弹劾驳回

追责回响·outcome 4 档·
  圆满       fulfilled
  部分       partial
  抵触       contested
  阻挠       blocked
```

Slice 8 phase 7 实施时·**用此 4 档名**·我 §H/§I 提"追责"但没用 4 档命名·**Slice 8 子任务加: 用 v3 outcome 命名**。

### J.2·已知 bug 收入·「廷议待落实」→ chronicleTracker (Slice 11 修)

```
v3 现有 bug·
  _ty3_phase14_recordChaoyiSummary  简化丢失
  → 廷议结束·"廷议待落实" 卡片不进 GM._chronicleTracker
  → 长期议题颁诏后无追踪·UI 无显示

5/2 user 反馈·"如果你 manual test 时发现廷议结束没有「廷议待落实」纪事·这是已知问题·不算新 bug"
```

**Slice 11 必修·DoD 加 1 项**·

```
DoD #19·_ty3_phase14_recordChaoyiSummary 恢复完整·"廷议待落实" 卡片入 chronicleTracker
       smoke·议盐法 → 颁诏 → 下回合查 chronicle·应有 "盐法待落实" 卡
```

工时 Slice 11 +0.3d。

### J.3·visual regression checklist 整合

**5/2 已有的 `廷议-visual-regression-checklist.md` (139 行)·sprint 11 smoke 必跑**·

```
Slice 11 子任务加·
  - [ ] 跑 5/2 廷议-visual-regression-checklist.md·9 大项 + 30 子项
  - [ ] 加 v1.4 新加 mockup 项·召集 modal / mentor 联动 / 双轨 view
  - [ ] 加 5 mode 视觉 (廷议特化 confront/cite_classic/clientelism/martyr) 截图
  - [ ] 加 5 ceremony 截图 (鸣鞭/钦定/草诏/用印/追责)
  - [ ] 加 v1.4 v3 升级路径截图 (老存档加载 + 民意度/言官离心 顶部 bar)

通过后归档·重命名 廷议-visual-regression-checklist-v1.4-PASS-YYYY-MM-DD.md
```

### J.4·重大教训·先读 v3 代码再设计 mockup

**这是 sprint doc v1.5 (本 round 4) 必须收的教训**·

> **memory [[paradox_ui_unreliable]]** 已明确·**P 社 UI 认识不可靠·后续设计必须 user 锁锚游戏 + 截图**·

我 round 1-3 (1900 行新增) **全部凭对话记忆推测**·没读 v3 实际代码·导致·

1. 三班 paradigm 错 (class vs stance)
2. 钦定 5 档命名错 (S/A/B/C/D + 上策中策 vs 圣旨煌煌等真名)
3. 议前预审 4 处置·细节描述粗略
4. 用印 2 sub-flow·简化为"朱砂动画"漏 2 子 modal
5. 追责 outcome 4 档·没用真命名
6. 漏「廷议待落实」chronicleTracker bug

**今后 sprint 流程**·

```
第 0 步·Audit & Read
  必读·  现有代码模块的所有 UI 字符串 (grep 中文常量)
  必读·  历史 PR / commit 内已存在的 design doc / checklist
  必读·  memory 里所有相关 memory entry

第 1 步·Mockup + Spec
  按上述 audit 设计·**保留所有真实字符串**·新加 feature 加 marker [v1.4 新]
  
第 2 步·Implementation
  edit 时·先 read 文件·grep 中文 token·改的前后字符量必须可解释
```

加进 memory·

```yaml
name: feedback_design_must_read_v3_first
description: 设计 v3 增强类 sprint 前·必读 v3 现有 UI / 命名·不可凭训练记忆 / 对话推测
why: 2026-05-22 round 1-3·补 1900 行 mockup·全凭推测·结果 7 处冲突 v3 现有命名 + 漏 1 个已知 bug·必须 round 4 fix
how to apply: 任何 "v3 增强 / 改造" 类 sprint·第 0 步 audit 必含·grep 中文 string + 读现有 checklist + 历史 commit
```

(memory entry 我 sprint 启动后 commit·避免再犯)

### J.5·Slice 工时调整 (v1.5)

| Slice | v1.4 | v1.5 调整 | 理由 |
|---|---|---|---|
| Slice 0 | 0.5d | **1.0d** (+0.5) | 加 v3 现有 UI audit·读 3942 行·grep 中文常量 |
| Slice 8.5 | 1.5d | **1.8d** (+0.3) | 加双轨 view (V hotkey 切 class) + 用印 2 sub-flow modal |
| Slice 11 | 1.5d | **1.8d** (+0.3) | 加 v3 visual regression checklist 完整跑 + chronicleTracker bug 修 |
| **总** | **22-25d** | **23-26d** (+1.1d) | 含 v3 对齐 + bug 修 + audit |

### J.6·sprint doc 修订 marker

```
本 sprint 起·所有 mockup / Slice 描述 / DoD·
凡涉及 v3 已实现 UI / 命名·标记 [v3 既有·preserve]
凡 v1.4 新加 feature·标记 [v1.4 新]
凡 v1.5 round 4 fix·标记 [v1.5 fix·post-chat-audit]

便于 review 时区分 "维持现状" vs "新增" vs "纠错"
```

### J.7·status update

```
doc 版本·v1.4 → **v1.5**·post-chat-audit round 4
新增内容·§J 整节 (~270 行)
冲突 fix·7 处 + 1 已知 bug
工时调整·+1.1d (总 23-26d)
status·**draft·待 user 最终拍板**·v3 对齐已含·实施前必须 audit v3 代码
```

---

## §K. 自读 v3 代码后·真实 fix·post-read-v3 (v1.5.1)

**触发**·user "你阅读一下当下的廷议部分再看看" (2026-05-23)·我亲自读 v3 L1-3678 关键段·发现之前 sub-agent audit 多处不准·**这是 round 5 fix·亲自读 vs 委托读 的差距**。

### K.1·议前预审·实际字串 fix (已修 §D.8)

| 项 | v3 实际 (L761-781) | 我 round 2-3 写的 |
|---|---|---|
| 留中 | 📥 留 中 / 皇权 -1 / 搁置一回合·奏者 prestige -2·世人议怠政 | 🔒 留中 / 存入留中册 / 议题缓处 ❌ |
| 私决 | 🤐 私 决 / 皇威 +1 / 走御前奏对·与心腹密议·不公开 | 🎯 私决 / 同 / 同 (emoji 错) |
| 下议 | 🤝 下议·五人闭门 / 朝堂渐和 / 召三品以上 5 员·小范围议事 | 🤝 同 / 同 / 朝堂渐和·部分阶段 ⚠️ |
| 明发 | 📜 明 发·廷议 / 完整七阶段 / 召三品以上百官·四轮辩议·公开裁决 | 📜 同 / 同 / 完整七阶段·大规模廷议·影响最深 ⚠️ |

**已修**·§D.8 mockup·按 v3 真实字串 100% preserve。

### K.2·v3 已有 helper·Slice 2.5 直接复用 (-0.3d)

v3 §1 党派访问层 (L70-99) 已存在·

```js
_ty3_getParties()                  // 返 GM.parties[]
_ty3_getPartyObj(name)             // 按 name 找 party object
_ty3_getOpposingParties(partyName) // 算 enemies·返 party array
_ty3_getAlliedParties(partyName)   // 算 allies·返 party array
```

**Slice 2.5 工时·-0.3d**·原 §E.2 crossPartyRatio + §I.4 urgency 重新设计 helper·改成**直接调用 v3 helper**·

```js
// 召集后·算 crossPartyRatio·复用 v3 helper
function _ty3_v15_calcCrossPartyTilt(attendees, proposerParty) {
  const opposing = _ty3_getOpposingParties(proposerParty);
  const allied   = _ty3_getAlliedParties(proposerParty);
  const opposingCount = attendees.filter(name => 
    opposing.some(p => p.members?.includes(name))).length;
  const alliedCount = attendees.filter(name => 
    (allied.concat([_ty3_getPartyObj(proposerParty)])).some(p => p.members?.includes(name))).length;
  return opposingCount / Math.max(1, alliedCount);
}
```

更准·更短·更稳。

### K.3·v3 议前预审 forecast + held items·必加 (§E + §D.8 补)

v3 现有·

```js
_ty3_paUpdateForecast()  // 渲染党派立场预测条 (支/反/中 比例)
GM._ccHeldItems[]        // 留中册·panel 内显示 + 每条"再议" button
_ty3_reissueTopic(i)     // 复议留中议题
```

**§E.4 三步推荐·必集成 v3 forecast**·召集后实时算·UI 显"东林 8 支 / 阉党 4 反 / 中立 2"·复用 v3 已有 widget。**Slice 2.5 工时·+0.1d**。

**§E.3·留中册复议路径**·"再议" 进议前预审 panel·`it.reissuedCount` 字段记复议次数 (v3 已有)·**Slice 2.5 加 1 处理路径** (复议 = 不走完整召集·从 held item 直接进 phase 0)。

### K.4·`_ty3_phase14_recordChaoyiSummary` bug·我之前推论错·实际是**桥接断**

读 L3604-3678·function **完整有 `_ty3_syncChaoyiChronicleTrack` 调用** (L3648)·**不是"简化丢失"**。

实际写入·

```
GM.recentChaoyi[]          ← 短期·cap 8 件
_ty3_syncChaoyiChronicleTrack(...)  → 写 chaoyi chronicle tracks
```

**未写**·`GM._chronicleTracker` (UI 上"廷议待落实"卡的真源)

**真实 bug**·**chaoyiChronicleTracks 跟 _chronicleTracker 没桥接**·两套系统并存。

**Slice 11 修法** (修正 §J.2)·

```js
// 在 _ty3_phase14_recordChaoyiSummary 末尾·已有 _ty3_syncChaoyiChronicleTrack 后追加·
if (typeof GM !== 'undefined' && Array.isArray(GM._chronicleTracker)) {
  GM._chronicleTracker.push({
    type: 'tinyi-pending',
    turn: GM.turn,
    topic: topic,
    chaoyiTrackId: item.chaoyiTrackId,  // 桥接 chaoyi → chronicle
    decision: decision,
    grade: grade,
    sealStatus: item.sealStatus,
    dueAt: GM.turn + 3,
    status: 'pending'
  });
}
// 1 处补桥接·function 整体不动·风险极低
```

**Slice 11 工时·1.8d (J.5 已加 0.3d)·不变**·原 "恢复 function" 改为 "1 处桥接"。

### K.5·`_ty3_applyArchonGrade` 副作用·Slice 8 共存 (非冲突)

v3 L1234-1265+ 已实现·

```
S 档·反对方 cohesion -10·主奏方 +3
A 档·反对方 leader prestige -5·主奏 leader favor +10
B/C/D·类似 cohesion / prestige / favor 调整
```

**Slice 8 反弹机制·必须"在 v3 archon effects 之后追加"·非"替换"**·

```js
// Slice 8 实施·hook 加在 _ty3_phase14_recordChaoyiSummary 之前·
async function _ty3_v15_appendMinorityRebound(decision, opts) {
  // 1. 先让 v3 archon effects 跑 (cohesion / prestige / favor)
  // 已存在·不动
  
  // 2. v1.4 反弹·追加 minority loyalty / affinity / martyr
  const minority = _ty3_v15_findMinorityNPCs(decision);
  for (const npc of minority) {
    const baseRebound = _ty3_v15_calcRebound(npc, decision);
    const v3Effect    = _ty3_v15_alreadyApplied(npc);  // 检查 v3 已 -prestige 没
    const finalRebound = baseRebound - (v3Effect.prestigeDelta * 0.4);  // 折扣
    npc.loyalty = Math.max(0, npc.loyalty - finalRebound);
  }
}
```

**关键·"折扣"**·若 v3 已 -prestige 5·v1.4 反弹层 -loyalty 时按 60% 比例 (避 2x 惩罚)。**doc Slice 8 子任务加·"v3 effects 桥接 + 折扣计算"** (~0.2d 内含·总工时 1.2d 不变)。

### K.6·`huangwei / huangquan` 系统·doc 补 (§F.补)

v3 archon 用 `_ty3_readHuangwei()` / `_ty3_readHuangquan()` 算档位 (L1213-1216)·我 doc 全 sprint 没系统讲。

**Slice 4 子任务加·**

```
- prompt 注入·当前皇威 X·皇权 Y·当前档位预测 = ...
- NPC 看见 hw/hq 决定 stance 强度·hq < 30 → 倾向 confront
- §I.1 LLM cost·加皇威/皇权 上下文 200 tokens / NPC
```

### K.7·`GM.unlockedRegalia[]` 永久威权·跨场廷议保留

v3 header L26 注明·"GM.unlockedRegalia[] 永久威权特权清单·跨场廷议保留"·

我 doc 全 sprint 没提·**Slice 11 smoke 加 1 case**·

```
Smoke·跑 3 议·议中触发威权升级·
  议 1·成功钦定 S 档·_unlock 'jianshou'·入 GM.unlockedRegalia[]
  议 2·复议·检测 GM.unlockedRegalia·应能用"建守"特权·跳某 phase
  议 3·载存档 → 新会话·GM.unlockedRegalia 应保留·"建守"仍可用
```

### K.8·v3 弹劾结党 spawn 路径·post-sprint backlog (新加)

v3 L788-790 comment·

```
推演若发现 X 名望日盛·spawn 的是「弹劾结党」议题(见 §15)·
玩家在该议题上准奏 → 自动触发党派 spawn(status='被劾')
```

这是 v3 现有 mechanic·跟世界系统 (推演 → 弹劾议题 spawn → 党派 spawn 链) 关联·**Slice 5 / post-sprint 探索**·**Slice 0 启动后·必读 v3 §15 (推演弹劾) 看完整机制**·doc 后续补 §L。

### K.9·v3 typo·Slice 11 1 min 修

L781·`'<div class="ty3-pa-opt-cost">完整七阶段/div>'` 缺 `<`·

```diff
- + '<div class="ty3-pa-opt-cost">完整七阶段/div>'
+ + '<div class="ty3-pa-opt-cost">完整七阶段</div>'
```

**Slice 11 顺手修**·~30s。

### K.10·总工时调整 (v1.5.1)

| Slice | v1.5 | v1.5.1 调整 | 理由 |
|---|---|---|---|
| Slice 2.5 | 2.5d | **2.3d** (-0.2) | v3 helper 复用 (-0.3) + forecast 集成 (+0.1) |
| Slice 4 | 1.5d | **1.5d** (不变) | hw/hq 注入 prompt 在原工时内 |
| Slice 8 | 1.2d | **1.2d** (不变) | v3 effects 桥接 + 折扣 在原工时内 |
| Slice 11 | 1.8d | **1.8d** (不变) | chronicleTracker 桥接 (1 line·非"恢复") + typo + unlockedRegalia smoke 在原工时内 |
| **总** | **23-26d** | **22.8-25.8d** (-0.2) | 净 -0.2d·亲自读 v3 比委托审 audit 更准 |

### K.11·教训·亲自读 v3 vs 委托 sub-agent·结论

**round 4 (sub-agent audit)**·发现 7 处冲突·但 audit 报告**还是有偏差**·

- 议前预审 emoji / cost·sub-agent 给的"概要"·没逐字 dump
- chronicleTracker bug·sub-agent 给的"function partial"·实际 function 完整·只是字段没桥接
- 党派访问层 helper·sub-agent 没强调·我 doc 重复设计

**round 5 (自读)**·1 次亲读 L1-3678·**真正发现 10 处 fix**·包含上面 7 处 + 3 处 sub-agent 没覆盖 (forecast / held items / 桥接细节)

**结论·sub-agent audit 适合 quick scan·关键设计前·LLM 主导者必亲自读源代码**。memory [[design-must-audit-v3-first]] 应更新·"亲自读" vs "委托读" 差距明显。

### K.12·status update (v1.5.1)

```
doc 版本·v1.5 → **v1.5.1**·post-read-v3
新增内容·§K (~330 行)·D.8 mockup 实际字串重写
fix·10 处 (round 4 7 处 + round 5 新 3 处)
工时·22.8-25.8d (净 -0.2d)
status·**ready for kickoff**·亲读 v3 verified·实施前再 spot-check 即可
```
