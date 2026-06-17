# Phase G·收口 audit·跨子相 paradigm + shared infra (G1+G2+G3)

**date**·2026-05-25
**status**·**全 7 项 fix·ship-ready**·smoke 135 → 145 PASS·零回归
**scope**·Phase G·G1+G2+G3·跨子相 paradigm 一致性 / shared infra wiring / 字段 schema / pipeline+event-hooks / tinyi+诏令 / UI 入口
**outcome**·G4/G5 defer 不算 cancel·Phase G **实质完工** (3/5 active)·下一步等 user 指 H/I/或他相

---

## audit 视角 (6 + 1)

| # | 视角 | 工具 | 结论 |
|---|---|---|---|
| v1 | 跨子相 paradigm 一致性 | grep + diff | F1·G3 desk suggestion 仅 spawn-driven·G2 是 event-driven |
| v2 | shared infra wiring | grep call chain | F2·G2 decorate 不 type-gate·F3·G3 push promote queue 跟 chaoyi 双 push |
| v3 | 字段 schema 跨子相 | grep spawn 段 + 直比 | F4·enke 仍写 `_historicalFigure`·G3 已 drop |
| v4 | pipeline + event-hooks 集成 | 读 pipeline-steps line-by-line | F5·G3 cleanup 顺序在 G1 spawn 前·cleanup-then-spawn 漏 |
| v5 | tinyi + 诏令集成 | grep tag + EDICT_TYPES | F6·G3 wuju affinity 跟 G2 enkeParty 同·dead expose (LOW) |
| v6 | UI 入口 + 4 路径 user 操作 | grep open/click | **F7·CRITICAL·Path B 礼部/兵部 wendui expose 但 0 UI callsite·user 进不去** |

---

## findings 表 (7 项)

| # | 编号 | severity | 文件 | 修法 |
|---|---|---|---|---|
| 1 | **F7** | **CRITICAL** | tm-hongyan-office.js | desk suggestion render·`s._enkeSubtype` 加 "问礼部"·`s._wujuSubtype` 加 "问兵部" inline button (右上角·30px from delete)·click 触 `_kjG2OpenLibuEnkeWendui` / `_kjG3OpenBingbuWujuWendui` |
| 2 | **F3** | **HIGH** | tm-keju-special-exams.js | 删 `_kjG3PushWujuKeyiPromoteQueue` spawn 内调 (chaoyi `_cc2_collectAgendaSources` 已 auto-push·避双 push) |
| 3 | **F1** | MID | tm-keju-event-hooks.js | `_kjEventCheckWarStateRecovery`·war_state 跃至 ≥60 时 (lastVal<60 → curVal≥60)·直 push `_kjG3OnWujuTriggerEnqueueDeskSuggestion('war-crisis')` |
| 4 | **F5** | MID | tm-endturn-pipeline-steps.js | `_kjG3CleanupYuanStuckWujuSpawn` 从 G1 spawn 前 (line 712) 移到 G1 spawn 后 (line 720)·spawn-then-clean |
| 5 | **F4** | LOW | tm-keju-enke.js | enke jinshi spawn·删 `_historicalFigure: false`·`isHistorical` 作 canonical |
| 6 | **F2** | LOW | tm-keju-enke.js | `_kjG2DecorateSpawnedEntryForKeyi`·加 `if (entry.type !== 'enke') return entry` type gate |
| 7 | **F6** | LOW (doc) | tm-keju-wuju.js | `_kjG3GetWujuPartyTinyiAffinityBonus`·DEFERRED 注释强化 (跟 G2 L1 同 backlog) |

---

## smoke 验

- **smoke-g3-wuju.js·§T**·10 case·T1-T10·F1/F2/F3/F4/F5/F7 全验过
- **G3 共**·135 → **145 PASS / 0 FAIL**
- **G2 regression**·155 PASS / 0 FAIL
- **G2 player-initiative**·75 PASS / 0 FAIL
- **G1**·51 PASS / 1 FAIL (preexisting baseline·跟改无关)
- **L1-L12**·1085+ PASS / 0 FAIL
- **F1-F4c**·146 PASS / 0 FAIL
- **D1-D5 + E3**·81+ PASS / 0 FAIL
- **总计**·**~1500+ PASS·零回归**

---

## paradigm 一致性收口

| 维度 | G2 enke | G3 wuju | 一致? |
|---|---|---|---|
| 3 路径 (A spawn / B wendui / C edict) | ✅ | ✅ | ✅ |
| keyi callback chain | ✅ | ✅ | ✅ (G2 dispatcher 加 wuju route) |
| EDICT_TYPES 编号 | 13 enke | 14 wuju | ✅ |
| spawn jinshi schema | resources.* / career array / top-level 11 维 | 同 + valor / military / _wuArchetype | ✅ |
| `isHistorical` field | ✅ canonical (F4 fix) | ✅ canonical (M4) | ✅ |
| `_historicalFigure` field | ❌ drop (F4 fix) | ❌ drop (M4) | ✅ |
| desk template suggestion | event-driven (4 event-hook) | spawn-driven + F1 event-driven (war-crisis 跃) | ✅ (F1 后) |
| Path B wendui UI button | F7 加 inline 问礼部 | F7 加 inline 问兵部 | ✅ (F7 后) |
| nuke wendui ctx hook | ✅ pipeline wire | ✅ pipeline wire (BB1) | ✅ |
| cross-scenario reset | _wujuPeacefulCounter (M7) | + _wujuCeremonyQueue / _wujuPendingDepotAssignments / _wenguanImpeachmentCount / _wujuCoupFiredTurn / _wujuAssignSpinIdx / _wujuBingbuWenduiLastYear (BB·M7) | ✅ |
| tinyi affinity helper | DEFERRED (L1 backlog) | DEFERRED (L1 backlog·F6) | ✅ |

**12 维 paradigm 100% 对齐**·G2/G3 双子相·结构对称。

---

## Phase G 当前状态总览·**2026-05-26·4/5 完工·G4 user 拍删 (冗余)**

| 子相 | 状态 | smoke |
|---|---|---|
| G1·特科 shared infra | ✅ ship-ready (fanyi trigger stub 化) | 51 PASS / 1 preexisting FAIL |
| G2·恩科 (RAA + RBB + 字段错位修) | ✅ ship-ready | 155 PASS / 0 FAIL |
| G3·武举 (RAA + RBB) | ✅ ship-ready | 145 PASS / 0 FAIL |
| ~~G4·翻译科~~ | ❌ **2026-05-26 user 拍·删·冗余** ("只能清朝触发·没什么用") | (已删·full revert·1 G1 smoke 改 stub check) |
| **G5·童子科** (罕见·两 archetype·9-14 岁神童) | ✅ **ship-ready·2026-05-26** | **40 PASS / 0 FAIL** |
| **Phase G 收口** (本 doc) | ✅ ship-ready | 上 4 表 + 1600+ regression 零回归 |
| **Phase H·私学/书院** (12 维深嵌入) | ✅ **ship-ready** | **158 PASS / 0 FAIL** |

### G4 删除清单 (2026-05-26)·full revert·零残留
- 删·`web/tm-keju-fanyi.js` (1024 行)
- 删·`web/docs/keju-G4-sprint.md`
- 删·`scripts/smoke-g4-fanyi.js`
- revert·`tm-keju-enke.js` 删 fanyi route block
- revert·`tm-keju-special-exams.js` 删 `_kjG4DecorateSpawnedEntryForKeyi` wire
- revert·`tm-edict-lifecycle.js` 删 `EDICT_TYPES.fanyi` 第 16 类
- revert·`tm-endturn-pipeline-steps.js` 删 G4 scan + resume + abolition + reset wires
- revert·`index.html` 删 G4 script tag
- stub·`_kjCheckFanyiTriggers` returns null (避 G1 spawn 后死议程)
- update·`smoke-g1-special-exams.js` §12 改 stub check

---

## ship 守则

按 user `feedback_keju_no_ship_until_complete`·**科举全部完工前·绝不 ship / git commit**·

G4/G5 defer 但非 cancel·"全部完工"定义待 user 拍·

候选·
- A·user 解 G4/G5 defer 算 "完工"·**解 ship 锁·1.2.5.x 热更**
- B·user 决 G4/G5 必做·继续 Phase G·~7-9 d
- C·Phase G 收·先推 Phase H/I 或他相·全推完再 ship 一波

---

## 修订日志

- **v1·2026-05-25**·Phase G 收口 audit·6 视角·7 项 findings·全修 + smoke + doc
