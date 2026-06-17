# tm-hongyan-office.js audit (Phase 3·Claude own·R5 audit + R6 destructive carve out)

date·2026-05-03 · status·**R6 destructive done·官制 carve out → tm-office-system.js (741 行)·原文件 3391 → 2685·剩 letter+render+edict 3 mix 待下 slice**

## R6 update (2026-05-03·pair-mode first round)

**carve out done**·

| 原 L 范围 | 内容 | 行数 | 去向 |
|---|---|---|---|
| L46-380 | 10 _off* + RANK_HIERARCHY + getRankLevel + getRankInfo + calcOfficialSatisfaction | 335 | tm-office-system.js §1-§3 |
| L1953-1996 | _offMaterialize (async AI gen) | 44 | tm-office-system.js §4 |
| L1998-2033 | _settleOfficeMourning | 36 | tm-office-system.js §5 |
| L2938-3158 | 公库/私产 init 体系 (6 fns) | 221 | tm-office-system.js §6-§7 |
| L3160-3229 | canPerformAction + _findPositionByCharName + window register | 70 | tm-office-system.js §8 |
| L3236 | SettlementPipeline.register('office_mourning') | 1 | tm-office-system.js §9 |

**audit 估错纠正**·
- 原 audit 写 office ~1800 行·**实测 ~706 行** (估高 2.5×)
- 原 audit 写 letter ~1500 行·**实测 ~1800 行** (含 _settleLettersAndTravel · sendLetter · _generateLetterReply · etc.)
- **未发现的 2 域**·**renderGameState (~614 行·主游戏 UI shell)** + **edict UI (~289 行·_showEdictAdoptMenu·_renderPolishedEdict 等)** — 这两域不属于 letter 也不属于 office·**待下 slice 进一步拆**

**剩余 tm-hongyan-office.js 实质 3 mix**·
- letter 主域 (~1800)
- renderGameState (~614·应入 tm-game-ui-shell.js)
- edict UI (~289·应入 tm-edict-ui.js)

**净文件变化·1 → 2 (+1)**·**域分清晰提升**·**verify-all targeted smoke 全 PASS·zero regression**

## R6 verify

| smoke | result |
|---|---|
| smoke-office-dynastification | 33 PASS |
| smoke-letter-full | 15 PASS |
| smoke-letter-intercept-react | 29 PASS |
| smoke-engine-phase0 | 21 PASS |
| smoke-class-engine | 78 PASS |
| smoke-class-party-bidirectional | 34 PASS |
| smoke-influence-groups | 91 PASS |
| smoke-military-systems | 83 PASS |
| smoke-tinyi-fix | 18 PASS |
| smoke-tinyi-impeachment | 149 PASS |
| smoke-chaoyi-v3 | 56 PASS |
| boot-smoke | 179/179 |
| render-smoke | 13 pass / 4 warn / 0 fail |
| official-scenario-smoke | PASS |
| ref-check | PASS |
| find-orphans | 0 真孤岛 |

**syntax-check 因 Codex R6 batch 2 mojibake (4 个 editor-form-* 文件) 而 fail·与本切无关**·

## R5 原 audit (history)

date·2026-05-03 · status·**audit done·non-destructive·**关键发现·2 domain 混·推荐拆 2 (next round 候选)**

## 0·概览

| 项 | 值 |
|---|---|
| 文件 | tm-hongyan-office.js |
| 行数 | 3,378 |
| 性质 | top-level functions (非 IIFE wrap·与 tm-feudal·tm-economy 同 pattern) |
| load | index.html (估 L411 area)·editor.html |
| top-level functions / vars | **40+** (主要 _lt·_off·_hy prefix) |
| 局部 IIFE sub-systems | 0 |
| R127 历史 | 从 tm-player-actions.js L3304-end 拆出 |
| 姊妹 | tm-player-settings.js·tm-player-core.js |

## 1·**关键发现·2 unrelated domains 混 single 文件**

| domain | sections | 行数估 | function prefix | 实质 |
|---|---|---|---|---|
| **鸿雁信件 (letter)** | §1·§6·§7 | ~1500 | `_lt*` + `_hy*` + sendLetter | 通信·信件传递·回复·NPC 来书·UI 渲染 |
| **官制 (office)** | §2·§3·§4·§5 | ~1800 | `_off*` + RANK_HIERARCHY + getRankLevel·calcOfficialSatisfaction·LETTER_* | 官阶·职事·勋贵·officeTree·任免流程·部门统计 |

**结论**·**两 domain 实际无强 functional coupling**·**R127 拆出时 jumbled together**·**典型 user mandate "功能不明" 案例**·

## 2·实际 sections (按 head note + grep)

| § | 行 | 内容 | 主要 functions |
|---|---|---|---|
| §A·LETTER 实质 §1 | L18-368 | 鸿雁传书 + 信件类型 | _hyPromptComposerAddon·_off* (这里混了)·LETTER_TYPES·LETTER_TOKENS·LETTER_CIPHERS |
| §B·OFFICE 实质 §2-§5 | L42-1138 | 官制·任免·品级 | _off*·RANK_HIERARCHY·getRankLevel·getRankInfo·calcOfficialSatisfaction·_offMigratePosition·_offAppointPerson·_offDismissPerson·_offVacateByCharName |
| §C·LETTER UI/动作 §6 | L411-1500 | 信件 panel·UI·玩家撰写·_lt* 大族 | renderLetterPanel·_ltOnSearchInput·_ltRenderLetterCard·_ltSelectTarget·_lt* 30+ |
| §D·LETTER 主入口 §6 续 | L994-1500 | sendLetter + helpers | sendLetter·_ltFindPrimeMinister |
| §E·LETTER 后段 §7 | L1500-3147 | NPC 主动写信·回信 AI | (待详细 read·grep stop 1138) |
| §F·LETTER tail | L3147-3378 | 收尾·hooks | (待详细 read) |

**§A header 段 head note 说"鸿雁"·但 内含 _off* office migrations**·**typical mix**·

## 3·**与 tm-office-runtime / tm-office-panel / tm-office-editor 的关系**

按 architecture-map.md §19·

```
tm-office-runtime.js / tm-office-panel.js / tm-office-editor.js | 官制 runtime·panel·in-game editor
```

**tm-hongyan-office.js 中的 office 部分 (~1800 行) 实际应入 tm-office-runtime**·或合 tm-office-panel·

按 user mandate "代码混乱·功能不明"·**office 部分应 inline 进 tm-office-runtime**·**letter 部分独立 tm-letter.js**·

## 4·拆分判断

| 选项 | 评估 |
|---|---|
| A·保留 single + head note correct (audit only) | **本 round 推荐**·zero risk·清晰度仅提升 |
| **B·拆 2·tm-letter.js (~1500) + (office 部分 → tm-office-runtime)** | **强烈推荐·next round 候选**·按 user mandate "代码混乱·功能不明" 解 2 domain 混 |
| C·按 7 sections 拆 7 sub-file | 否决·小文件杂 |

**B 是真正解决 user 痛点 #1 (代码混乱) 的方案**·**~3-5h work·mid-high risk (top-level fn cross-ref)**·

### B plan 大致

1. backup tm-hongyan-office.js + tm-office-runtime.js
2. extract letter functions (_lt·_hy·sendLetter·LETTER_*·renderLetterPanel·etc·~1500 行)
3. write 新 tm-letter.js
4. extract office functions (_off·RANK_HIERARCHY·getRankLevel·calcOfficialSatisfaction·etc·~1800 行)
5. inline 进 tm-office-runtime.js (或合 tm-office-panel)
6. delete tm-hongyan-office.js
7. update index.html + grep 跨文件 refs + verify

**risk·tm-office-runtime 已 2352 行·+1800 → ~4150 行·single 大**·**或拆 office 部分 → tm-office-system.js (新建)·避免 office-runtime 过大**·

**最终建议·B·tm-letter.js (~1500) + tm-office-system.js (~1800)·delete hongyan-office (1 文件 → 2 文件·净 +1)**·**虽 +1 文件·但 2 domain 解耦·清晰度大幅提升·实质 effect 高**·

或·**inline office 部分 → tm-office-runtime 直接 (1 → 1 net·tm-letter 新建)·net 0 但 office-runtime 更厚**·

## 5·推荐 plan

### 现 round (Phase 3·non-destructive)

1. write 本 audit doc
2. **non-action**·保留 single 文件·zero risk
3. update head note·correct 7 sections + 标 **"2 domain mix·待 next round 拆"**

### Next round (按 user 新模式·me 和 Codex 各一半·互审)

1. **Claude own**·tm-hongyan-office 拆 2 (letter + office)
2. **Codex own**·editor-game-systems split (按其 IIFE plan)
3. 完成后·互审·写信·然后下一 round

## 6·风险

| 风险 | 应对 |
|---|---|
| audit 发现 jumbled domain | next round 启 B plan·小心 cross-ref |
| top-level functions 跨 ref | 拆时 grep 全 functions 调用点·确认无 break |
| office 部分入 tm-office-runtime 过大 | 拆 sub·tm-office-system.js 独立 |

## 7·效果总结·**audit only round**

- **0 文件减少 (audit only·non-destructive)**
- **关键发现 + 推荐 B plan**·**为 next round 备 work**
- **head note 标 2 domain mix·warning 后续 contributor**

— end of tm-hongyan-office-audit.md
