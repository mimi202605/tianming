# 廷议大改 Sprint·implementer Handoff

**版本**·v2.9 (8 轮 audit 收口)
**日期**·2026-05-23
**总工时**·25.2 - 29.0d (含 buffer)·关键路径 ~15.7d
**完整 plan**·`web/docs/tinyi-overhaul-sprint-v2.9.md` (4146 行)
**8 轮 audit doc**·`tinyi-overhaul-3slice-alignment-r1.md` 到 `-r8.md`
**paradigm decision**·`tinyi-slice3-stance-paradigm-detail.md`

---

## 1·Sprint at a glance·5 分钟读

### 1.1·核心 thesis

`tm-tinyi-v3.js` 3942 行·**v3 已是完整 8 阶段政治模拟 system**·并且 **当前已是 active default** (L1534 IIFE 无条件接管 `_cy_pickMode('tinyi')`·v2 路径 dead code)。

**Sprint 做 4 件**·

1. 维护 v3·加 8 处 `currentPhase` update·拆 4.5 浮按钮·全 sprint 走 v3 paradigm
2. **6 增强**·召集制 / 民意度 / 言官离心 / 8D dims stance / mentor + clientelism / NPC 主动议题
3. **3 集成**·NpcMemorySystem + ClassEngine + ChronicleTracker (v3 已有 API·sprint 调用·不重建)
4. **2 bug 修 + 1 verify**·v3 L781 typo + chaoyi/chronicle dual write 收口·chronicleTracker 桥接 verify (v3 phase14 L3648 已调 upsert·非新建 patch)

### 1.2·关键 paradigm 决定

| 决定 | 选项 | 出处 |
|---|---|---|
| Slice 3 stance | **C·hybrid** (Round 1 dims 锚定 initial·Round 2+ LLM 可调 current) | user 选·5 轮 audit |
| Slice 0 gate | **双轨 + verify v2 dead** (Slice 0.0a verify·0.0b 条件修) | user 选·4 轮 audit |
| Slice 11 桥接 | **verify·非 patch** (v3 已调 ChronicleTracker.upsert) | user 选·4 轮 audit |
| Slice 8.5 ceremony | **5 核心留 8.5 + 5 联动挪 7.5** | user 选·3 轮 audit |
| Slice 10 mentor | **拆 10a (前) + 10b (后)** (10a 必先于 2.5) | user 选·1 轮 audit |
| Slice 8.5 trait BIAS | **A·全写 ~50 trait** (覆盖 runtime fill-shaosong-traits.js) | user 选·7 轮 audit |

---

## 2·17 slice 实施顺序 + 工时

```
关键路径·14d 推荐顺序 (v2.9 §9.1 同步)·

Slice 0       (1.0d)  prep + v3 audit + flag + baseline
  └ 0.0a      (0.3d)  verify v2 dead·force orig 跑 5 case
  └ 0.0b      (0-1.2d) 条件·若 v2 broken 修
Slice 0.5     (0.5d)  contract + v3 expose·window._ty3_phase6_recordSeal + endturn decay contract + phase6→7 verify
Slice 2       (1.2d)  议题 27 tag + 映射
Slice 10a     (1.0d)  ★ 必先于 2.5·mentor 数据 + buildMentorIndex
Slice 1       (1.6d)  5 剧本 traitIds 121 chars + _dingyou 字段 (并行 Slice 2/10a)
Slice 2.5     (2.4d)  召集制·6 资格 + 5 后果 + 民意度 + 言官离心 + decay + 5 helper spec + 5 剧本 tinyi config
Slice 3       (2.7d)  hybrid paradigm·dims helper + initial 锚 + current 可调 + schema 扩
Slice 4       (0.8d)  prompt 注入·patch target `_ty2_genOneSpeech` (非 v3 phase2)
Slice 4.5     (1.8d)  玩家发言·8 处 currentPhase update + 5 NPC 并发抢答 + LLM cost cap
Slice 5       (1.2d)  10 mode·复用常朝 6 (含 augment·非 cite) + 廷议 4 新加
Slice 6       (1.5d)  25 RULES + ~50 trait BIAS (runtime SI naming) + tone modulation
Slice 7       (1.6d)  confront 链 + GM._affinityMap 新建 + 2 helper
Slice 7.5     (1.0d)  6 动作 + 5 联动 ceremony + prison 集成 + atmosphere
Slice 8       (1.2d)  反弹 hook·IIFE hook `_ty3_phase6_recordSeal`·affinity 单值·dims helper
Slice 8.5     (1.8d)  UI 升级·5 核心 ceremony + 9+1 hotkey + 用印 polish + preset
Slice 9       (0.5d)  cumulative + emperor cue·alias _cc3_* helper
Slice 10b     (0.5d)  clientelism + 联动 UI·dims priority cancel
Slice 11      (1.7d)  smoke + bug 修 + summary·桥接 verify + tingyi_pending 改名

总·22.5-25.7d (Slice 0.0b 0-1.2d 条件)·30% buffer 上限 ~29d
关键路径·~15.7d
```

---

## 3·implementer 必知 20 条 (从 57 finding 浓缩)

### 3.1·v3 现状 (4 条)

1. **v3 当前 active default**·不是 OFF·grep `useTinyiV3` 0 hit·v3 L1534 IIFE 一加载就接管 `_cy_pickMode('tinyi')`
2. **`_ty3_phase6_recordSeal` 未 expose**·Slice 0.5 必 patch 1 行·否则 Slice 8 hook 必失败
3. **v3 廷议 prompt build 在 `_ty2_genOneSpeech`** (tm-chaoyi-tinyi.js L292·v2 复用)·非 v3 phase2_run
4. **chronicleTracker 桥接已存**·v3 phase14 L3648 已调 `ChronicleTracker.upsert({type:'chaoyi_pending'})`·**别新建 patch**

### 3.2·字段 / API 严格 (8 条)

5. **`ch.affinity` 是 number 单值**·禁 `ch.affinity.toEmperor` 嵌套 (strict mode TypeError)·5 处 doc 修过
6. **`ch._imprisoned` 非 `_inPrison`** (runtime 44 hit vs 1 hit)
7. **`_dingyou` (丁忧) runtime 0 hit·要新建** (Slice 1)
8. **`GM._chronicleTracks` 复数**·非 `_chronicleTracker` (2 处 doc 修过)
9. **`GM._affinityMap` runtime 0 hit·要新建** + 2 helper (`_ty3_getAffinity / addAffinity`·双向)
10. **dims 字段用 `_ty3_getDims(ch)` helper·非裸 `ch.dims` 或 `ch.aggregateDims`** (Slice 3 helper)
11. **ChronicleTracker API 是 `upsert/add/update/complete/abort`**·**不是 `push`** (Slice 11 桥接 patch v2.4 错·删了)
12. **`CY._ty3.currentPhase` v3 只 init 'opening'·后续 0 update**·Slice 4.5 加 8 处 update·解 phase 分发失效

### 3.3·trait naming 收口 (1 条)

13. **trait id 用 runtime SI naming** (`brave/honest/just/scholar/schemer/gallant/fickle/zealous/...` ~50 trait)·**不要** 中文拼音前缀 (`trait_xianliang/chunzheng/yaohua`)·v2.7 doc 中文拼音 14 全弃·v2.8 全写 ~54 trait BIAS table

### 3.4·跨 slice 顺序 (3 条)

14. **Slice 10a 必先于 Slice 2.5** (mentor 联动调 GM._mentorIndex·Slice 10a 才建)
15. **Slice 2.5 mentor 联动 lazy guard** `if (GM._mentorIndex?.mentor?.[name])`·Slice 10b 后 UI 完整验证
16. **Slice 0.5 expose 块包含 ~10 个 window assign** (recordSeal / getDims / inferStance / dimsFromTraits / dimsFromKeywords / buildToneHint / cumulativeHint alias / emperorCueHint alias / v15 5 helper)

### 3.5·smoke / data 现状 (4 条)

17. **scenario id 跟 doc smoke 全错**·`tianqi-7-9` 实际 `sc-tianqi7-1627` 等·**smoke 按 `scenario.name` load·非 id** (崇祯/挽天倾 id 重复)
18. **smoke 议题自己 fabricate**·scenarios data 0/10 含 doc topic·跟剧本时代 / 人物对齐即可
19. **5 剧本 `scenario.tinyi.convening` 全 0 hit**·Slice 2.5.5 写入 + hardcoded fallback (明朝模板)
20. **5 剧本 chars 现状**·崇祯 45/挽天倾 44/111 32 chars 待补 traitIds·**晋 0/大明 0 chars** (空剧本跳过)·官方·天启 200/203 + 绍宋 98/98 已 100% 覆盖

---

## 4·关键 file/line list

| 操作 | 文件·行 |
|---|---|
| v3 gate patch | `tm-tinyi-v3.js:1545` (改 override·加 useTinyiV3 check) |
| v3 expose 块 | `tm-tinyi-v3.js:3363+` (跟 phase6_open 等一起) |
| v3 廷议 prompt | `tm-chaoyi-tinyi.js:292` (`_ty2_genOneSpeech`) |
| v3 phase14·桥接 | `tm-tinyi-v3.js:3648` (`_ty3_syncChaoyiChronicleTrack`) |
| v3 phase14·type 改 | `tm-tinyi-v3.js:3690` (`chaoyi_pending` → `tingyi_pending`) |
| v3 typo 修 | `tm-tinyi-v3.js:781` (`</div>` 缺 `<`) |
| v3 currentPhase update | 8 处·phase1_open / phase2_run / phase3_open / settleArchonGrade / phase5_openDraftPicker / phase6_open / preAudit / confront chain start |
| 玩家发言入口 | `tm-tinyi-v3.js:1948` (`_ty3_handlePlayerInterject`·改调 _ty3_onPlayerSpeak) |
| 浮按钮删 | `tm-tinyi-v3.js:545-682` (5 函数 + 2 DOM + ~80 行 CSS) |
| 常朝 mode 模板 | `tm-chaoyi-changchao.js:2092-2174` (复用 lead/second/rebut/soften/pivot/augment) |
| 常朝 cumulative | `tm-chaoyi-changchao.js:2390` (`_cc3_cumulativeHint`) |
| 常朝 emperor cue | `tm-chaoyi-changchao.js:2419` (`_cc3_emperorCueHint`) |
| trait fill tool | `web/tools/fill-shaosong-traits.js` (Slice 1 复用·改剧本输入参数) |
| derived health | `web/scripts/calibrate-derived-health.js` (Slice 1 验证·非 web/tools/) |
| 待新建 | `web/tools/fill-tianqi-mentors.js` (Slice 10a) + `web/scripts/smoke-mentor-coverage.js` |
| ChronicleTracker | `tm-chronicle-tracker.js` (API `add/update/upsert/complete/abort`) |
| ClassEngine | `tm-class-engine.js:575` (`applyPartyOutcomeToClasses`) |

---

## 5·kickoff 前 verify 命令清单

```bash
# 1·v3 状态 verify (4 处)
grep "useTinyiV3" web/*.js                        # 应 0 hit·v3 当前 ON
grep "window._ty3_phase6_recordSeal" web/*.js     # 应 0 hit·Slice 0.5 要 patch
grep "_chronicleTracks" web/tm-tinyi-v3.js        # 应 ≥2 hit·v3 已用
grep "ChronicleTracker.upsert" web/tm-tinyi-v3.js # 应 ≥1 hit·桥接已存

# 2·字段名 verify (6 处)
grep -c "_imprisoned" web/*.js   # 应 44·非 _inPrison
grep -c "_dingyou" web/*.js      # 应 0·要新建
grep "ch.affinity.toEmperor" web/*.js   # 应 0·非 object
grep "_affinityMap" web/*.js     # 应 0·Slice 7 新建
grep "currentPhase\s*=" web/tm-tinyi-v3.js   # 应只 1 处 init·Slice 4.5 加 8 处 update

# 3·trait naming verify
grep "trait_xianliang\|trait_chunzheng" web/*.js  # 应 0·废弃
grep "TRAIT_KEYWORDS" web/tools/fill-shaosong-traits.js   # 应有·~50 SI naming

# 4·smoke / scenario verify
ls scenarios/                                     # 列 9 个剧本
python -c "import json;d=json.load(open('scenarios/天启七年·九月（官方）.json',encoding='utf-8'));print('id:', d['id'])"   # sc-tianqi7-1627
python -c "import json;d=json.load(open('scenarios/崇祯.json',encoding='utf-8'));print('id:', d['id'])"      # scn_1774945158308 (跟挽天倾重复!)

# 5·tool / scripts
ls web/tools/fill-shaosong-traits.js              # 应存·Slice 1 复用
ls web/scripts/calibrate-derived-health.js        # 应存·Slice 1 验证
ls web/tools/fill-tianqi-mentors.js               # 应 NOT 存·Slice 10a 新建
```

---

## 6·8 轮 audit 履历 (history·让 reviewer 看 doc 修订脉络)

| 轮 | 关注 slice/section | finding | hard | 关键修 |
|---|---|---|---|---|
| 1 | 2.5 / 8 / 10 | 12 | 3 | phase6_recordSeal expose / 2.5→10 顺序 / endturn decay contract |
| 2 | 4 / 4.5 / 5 / 7 | 6 | 4 | Slice 4 patch target / mode cite→augment / _affinityMap / affinity.toEmperor |
| 3 | 6 / 8.5 / 9 | 6 | 1 | 8.5 10 ceremony 拆 7.5 |
| 4 | 0 / 0.5 / 1 / 2 / 11 | 6 | 2 | v3 active default / 桥接已存 |
| 5 | 3 / 7.5 / §14 | 7 | 2 | Slice 3 hybrid / §6 affinity 收口 |
| 6 | §5.1 / §10 / §14 | 5 | 4 | currentPhase / smoke 议题 / id / tinyi config |
| 7 | §5.4 / trait naming | 7 | 3 (1⚠️) | **trait naming catastrophic** |
| 8 | §5.1 / §5.2 / §6 / §9 | 8 | 2 | §9 工时表 / _chronicleTracker 重现 |
| **总** | | **57** | **21** | |

**hard 没收敛**·每轮 1-4 hard·提示 sprint doc 大文档 (~4146 行)·跨 review 一致性永有间隙·v2.9 接受为 ship 版本。

---

## 7·decision log (user 决策点)

| 时间 | 决策 | 选 | 出处 |
|---|---|---|---|
| 2026-05-23 | Slice 3 stance paradigm | C·hybrid | 5 轮后 |
| 2026-05-23 | gate paradigm | 双轨 + verify v2 dead | 4 轮后 |
| 2026-05-23 | Slice 11 chronicleTracker | 删 patch + 复查 UI | 4 轮后 |
| 2026-05-23 | trait naming | A·全写 ~50 trait | 7 轮后 |
| 2026-05-23 | 8.5 ceremony | 拆 8.5 留 5 核心 + 7.5 接 5 联动 | 3 轮后 |
| 2026-05-23 | 10 拆分 | 10a (前) + 10b (后) | 1 轮后 |

---

## 8·post-sprint backlog (非本 sprint·留 future)

- 崇祯 / 挽天倾 scenario id 重复 `scn_1774945158308` (data bug·非 sprint)
- chronicleTracker UI 渲染 chaoyi_pending vs tingyi_pending 完整复查 (Slice 11 verify 子任务·若 user 仍报告卡缺·spot 修)
- mentor 关系扩 (天启 30 + 绍宋 15·之后 backlog 扩到 ~60 历史人物)
- 廷议关系图 UI (`GM._affinityMap` NPC-NPC 网络图·非 sprint)
- v2 廷议路径完整修 (若 0.0a verify 发现 broken·0.0b 修后·**user 可决定 post-sprint 彻底删 v2 path**)

---

## 9·sprint 启动 checklist

```
☐ 1·读完本 handoff (15 min)
☐ 2·读 v2.9 §0 TL;DR + §1 v3 现状 audit·15 子节 (亲读 verified) (30 min)
☐ 3·读 §4 Slice 0 / 0.0a / 0.0b / 0.5 详 spec (15 min)
☐ 4·读 §14 v3 亮点保留清单 11 项 (15 min)·verify 4 项 API
☐ 5·跑 §5 verify 命令·全过 (10 min)
☐ 6·拍板 0.0a verify v2 dead·决定 0.0b 走不走
☐ 7·开 Slice 0·按 §4 子任务 0.1-0.7 顺序

预期·1.5h 完成 prep·1-2 周完成 Slice 0-2.5
全 sprint 预期·2026-06-20 ± 3d ship (按 22.5-25.7d 计)
```
