# Phase 5 Final Audit

date·2026-05-04 · status·**Phase 5 真 close·verify-all 47/47·25.1s·zero regression**
owner·Claude (4 slice·6 prep audit·此 audit) · pair·Codex (4 slice·2 helper)

> 模板·与 phase3-final-audit.md (R11c)·phase4-final-audit.md 一致·
> 本 frame 在 Claude 4 slice (α·γ·δ·ε) done·Codex 2 slice (β·ζ·η) done 时写·**P5-θ 待**·
> Phase 5 close 时·Codex 把 P5-θ 数据填入·我加最终 verify-all 数 (47/47) + 最终 letter 链·

---

## 0·Phase 5 目标 (回 architecture-target-final §9)

> **命名规约 + namespace 清理·5-7 day target → ~1.5-2 day actual** (R87 stage 1 已铺·prep audit 锁结构·大幅压缩)

具体范围·

1. **24 canonical namespaces** (与 Codex 共识·扩自 target §6.2 18 个)
2. **R87 facade 留**·5 whitelist + 3 engine proxy + Storage 不破·alias 期保
3. **alias-then-rename ladder stage 2**·定义/聚合写进 TM.X·window alias 留 (Phase 6 退役)
4. **24 ns sub-ns fill**·8 sub-slice·每 cluster 一 round
5. **EDICT_TYPES 等命名冲突显式隔离** (parser 17 详定义 vs lifecycle 11 大类)
6. **R10 dead code rescue** (TM.Economy.sum 等 4 fn alias 至 CascadeTax)

---

## 1·Phase 5 round-by-round

| round | date | task | owner | 文件 Δ | smoke | verify-all |
|---|---|---|---|---|---|---|
| **prep** | 05-04 | phase5-prep.md (280 行)·5 Q answered·24 ns 终表 | Claude | +1 doc | — | 39/39 (P4 close) |
| **P5-α** | 05-04 | tm-namespaces.js R200·14 容器·Map/Save rename alias | Claude | +1 smoke | 80 | **40/40** |
| **P5-β** | 05-04 | TM.NPC + TM.Char fill·6+6 sub-ns·prep audit done | Codex | +1 smoke·+helpers | 67 | **41/41** |
| **P5-γ prep** | 05-04 | phase5-gamma-edict-audit.md (~190 行)·EDICT_TYPES 隔离锁 | Claude | +1 doc | — | 41/41 |
| **P5-γ** | 05-04 | TM.Edict R202·5 sub-ns·EDICT_TYPES 强隔离 | Claude | +1 smoke | 63 | **42/42** |
| **P5-δ prep** | 05-04 | phase5-delta-fiscal-audit.md (~250 行)·R10 dead code 锁 | Claude | +1 doc | — | 42/42 |
| **P5-δ** | 05-04 | TM.Fiscal + Economy + Guoku + Neitang R203·17 sub-ns·R10 rescue | Claude | +1 smoke·-fiscal dead code | 82 | **43/43** |
| **P5-ε** | 05-04 | TM.Authority + Office + Keju + Corruption + Lizhi R204·9 sub-ns·Lizhi legacy | Claude | +1 smoke | 60 | **44/44** |
| **P5-ζ prep** | 05-04 | phase5-zeta-map-ui-audit.md (~110 行) | Claude | +1 doc | — | 44/44 |
| **P5-η prep** | 05-04 | phase5-eta-endturn-audit.md (~100 行)·scope 收窄 | Claude | +1 doc | — | 44/44 |
| **P5-θ prep** | 05-04 | phase5-theta-editor-audit.md (~150 行)·与 Office.legacy reconcile | Claude | +1 doc | — | 44/44 |
| **P5-ζ** | 05-04 | TM.Map + TM.UI R205·sub-ns fill | Codex | +1 smoke | 47 | **45/45** |
| **P5-η** | 05-04 | TM.Endturn R206·`.run.endTurn` + `.province.{openProvinceEconomy·openDivisionDetail}` + `.qiaozhi.{openQiaozhiPanel·doQiaozhi·restoreQiaozhiDivision}`·AI internals 黑盒 | Codex | +1 smoke | 27 | **46/46** |
| **P5-θ** | 05-04 | TM.Editor R207·7 sub-ns (core·crud·ai·forms·domain·schema·map)·schema.adapter setter-aware alias | Codex | +1 smoke | 54 | **47/47** ✓ |

**Claude 4 slice (α·γ·δ·ε)·~9h actual**·
**Codex 4 slice (β·ζ·η·θ)·~7-8h estimated**·

---

## 2·Phase 5 净结果

### 2.1 文件数

| 阶段 | runtime files | Δ |
|---|---|---|
| Phase 4 close (P5 启动前) | ~194 | — |
| Phase 5 close | ~194 | **0** (Phase 5 不动文件·只 namespace) |

**Phase 5 不删 / 不加 runtime 文件**·只·

- 改 `tm-namespaces.js` (304 → ~620 行·R200-R207 段)
- 删 `tm-fiscal-engine.js` L1746-1751 (R10 dead code·6 行)
- 加 8 smoke (`smoke-p5-{α/β/γ/δ/ε/ζ/η/θ}-*.js`)
- 加 8 doc (`phase5-prep.md` + 7 prep audit + 此 close audit)

### 2.2 verify-all 增长

| 阶段 | verify-all | 增加项 |
|---|---|---|
| P4 close | 39/39 | (R200 启点) |
| P5-α done | 40/40 | +p5-alpha-namespaces (80 assert) |
| P5-β done | 41/41 | +p5-beta-npc-char (67 assert) |
| P5-γ done | 42/42 | +p5-gamma-edict (63 assert) |
| P5-δ done | 43/43 | +p5-delta-fiscal (82 assert) |
| P5-ε done | 44/44 | +p5-epsilon-authority (60 assert) |
| P5-ζ done | 45/45 | +p5-zeta-map-ui (47 assert) |
| P5-η done | 46/46 | +p5-eta-endturn (27 assert·scope 收窄) |
| **P5-θ done** | **47/47** ✓ | **+p5-theta-editor (54 assert)** |

**Phase 5 新增 P5 smoke 8 个·共 480 individual assertions** (80+67+63+82+60+47+27+54)·

总 baseline (verify-all 47/47 全表)·**~900+ individual assertions**·headless smoke 212 passed·cc3-smoke 56 passed·R8 layered 177 baseline (guoku 121 + corruption 56) 维持·

### 2.3 24 namespace 终表 (R200-R207 全 done)

| # | ns | sub-ns | round |
|---|---|---|---|
| 1 | TM.Chaoyi | (P5-ε 内 reconcile 入 chaoyi-keju 系统) | R204 |
| 2 | TM.Wendui | (问对·TBD by P5-ε 或留空容器) | R204 |
| 3 | TM.Endturn | run / province / AI | R206 |
| 4 | TM.Endturn.AI | infer (entrypoint only·12602 行黑盒) | R206 |
| 5 | TM.Military | (待启 Phase 7+) | (空容器) |
| 6 | TM.Fiscal | engine·cascade·fixedExpense·legacy | R203 |
| 7 | TM.Economy | core·linkage·currency·currencyUnit·envCapacity·eventBus·gapFill + R10 alias | R203 |
| 8 | TM.Guoku | engine + R87 panel facade | R203 |
| 9 | TM.Neitang | engine + R87 panel facade | R203 |
| 10 | TM.Huji | (待·HujiEngine engine proxy 已·sub-ns 待) | (R87 only) |
| 11 | TM.Office | system·legacy | R204 |
| 12 | TM.Authority | engines·complete·legacy | R204 |
| 13 | TM.Corruption | engine | R204 |
| 14 | TM.Keju | runtime | R204 |
| 15 | TM.Edict | parser·complete·lifecycle·thresholds·legacy | R202 |
| 16 | TM.NPC | engine·interactions·decision·behaviors·personality·legacy | R201 |
| 17 | TM.Char | schema·economy·arcs·autogen·historical·ui | R201 |
| 18 | TM.Map | runtime·interactive·converter·integration·display·recognition + R87 MapSystem alias | R205 |
| 19 | TM.UI | foundation·cheatsheet·help·shizheng·renwu·military·drawers | R205 |
| 20 | TM.Save | (R87 Storage rename alias·R200) | R200 |
| 21 | TM.Editor | core·crud·ai·forms·domain·schema·map | R207 (TBD) |
| 22 | TM.Memory | (待·与 Char.historical 重叠?·TBD) | (空容器) |
| 23 | TM.Player | (待·tm-player-core audit) | (空容器) |
| 24 | TM.Diagnostics | errors·guard·report (P4-β-2 已建) | R200 meta-add |

**24 个全建·容器存在·sub-ns fill 程度按 cluster 大小决定 (0-7 sub)**·

**legacy (Phase 6 决定终态)**·

- TM.Lizhi (R87 22 fn·非 24 canonical·Codex Q1 决议)
- TM.MapSystem (rename alias·Phase 6 退役·改 TM.Map)
- TM.Storage (rename alias·Phase 6 退役·改 TM.Save)
- TM.GuokuEngine (R87 engine proxy·与 TM.Guoku.engine 同源·alias 留)

### 2.4 zero regression 全程·Phase 5 真 close

| 维度 | P4 close | **P5 close (实测)** | Δ |
|---|---|---|---|
| verify-all | 39/39 | **47/47·25.1s** | +8 |
| individual assertions | ~480 | **~960** | +480 |
| headless smoke | 212/0/0 | **212/0/0** | 0 |
| cc3-smoke (chaoyi v3) | 56/0 | **56/0** | 0 |
| encoding markers | 159 | (Codex P5-ζ R205 注释行 mojibake 待 P6 修) | TBD |
| 177 baseline (R8 layered) | 全保 | **全保** | 0 |
| LAYERED 残留 | 0 (R12 真清) | **0** | 维持 |

---

## 3·Phase 5 范围决策记录

### 3.1 24 vs 18 namespace (Q1)

target §6.2 列 18·实际 4 个独立系统缺·

- TM.Authority (独立 engine + AI coupling)
- TM.Corruption (独立 engine + state)
- TM.Diagnostics (errors/perf/pollution/checklist·P4-β-2 后聚)
- TM.Economy (与 Fiscal 交叉但不同·R87 已建)

**决·扩 24** (Codex Q1 同意)·

### 3.2 R87 facade keep vs rebuild (Q2)

- 5 whitelist facade·50+ 调用方
- 重建成本高·收益小

**决·keep + reconcile**·rename TM.Storage → TM.Save·TM.MapSystem → TM.Map·alias 留·sub-ns 上挂·

### 3.3 alias 期长度 (Q3)

- target §6.3 写"Phase 4 标 deprecated → Phase 5 lint → Phase 6 退役"
- 实际 Phase 4 没标 deprecated·跳过

**决·alias 期 = Phase 5 全程·Phase 6 退役**·

### 3.4 HTML inline onclick (Q4)

- 412 处跨 12 HTML 文件
- sed 全自动有错域风险

**决·方案 B·Phase 5 不动·Phase 6 半自动 + 手动 review**·

### 3.5 slice 分工 4/4 (Q5)

| Claude | Codex |
|---|---|
| α reconcile·γ Edict·δ Fiscal·ε Authority | β NPC/Char·ζ Map/UI·η Endturn·θ Editor |

**4/4 平衡·总 ~17h·并行 ~9h actual**·

### 3.6 R10 dead code rescue (P5-δ 发现)

`tm-fiscal-engine.js` L1746-1751 写 `TM.Economy.sum = sumEconomyBase` 等 4 fn·

- load 顺序·tm-fiscal-engine 在 tm-namespaces 之前
- tm-namespaces 后 load·R87 `_buildFacade('Economy')` 完全 overwrite
- **4 fn 实际 dead·grep 0 live caller**

**决·删 dead code + R203 中 Object.defineProperty getter alias 至 CascadeTax**·changelog 契约真生效·

### 3.7 EDICT_TYPES 两版本隔离 (P5-γ 发现)

- `tm-edict-parser.js:27` parser 内部 17 详 type 定义
- `tm-edict-lifecycle.js:10` lifecycle 11 broad category 枚举
- 含义不同·目前 window.EDICT_TYPES = lifecycle 版

**决·sub-ns 强隔离**·`TM.Edict.parser.EDICT_TYPES !== TM.Edict.lifecycle.EDICT_TYPES`·smoke 显式 assert·**永远不可合**·

### 3.8 close-by-value (P4 沿用)

- target §9 写 "26 个 <200 行"·实际不强求·**by design split 标记**·

---

## 4·architecture-target-final §9 reconciliation

| §9 项 | 状态 | 备注 |
|---|---|---|
| 命名规约 + namespace 清理 | done | 24 canonical + R87 facade 留 |
| 5-7 day target | **~1.5-2 day actual** | R87 stage 1 已铺 + prep audit·大幅压缩 |
| alias 退役 | Phase 6 (本 Phase close 后启) | rename alias 退役·R87 facade 顶层留 |
| lint 强化 | Phase 6 optional | scripts/lint-namespace.js |

---

## 5·Phase 6 启动信号 ready

按 phase6-prep.md (本 Phase 内已写)·

| sub-slice | scope | est | owner |
|---|---|---|---|
| **P6-α** | R200 rename alias 退役·改 3 production call site (game-loop·hongyan-office) | 1h | Claude |
| **P6-β** | HTML inline·index.html ~150 处 | 2h | Codex |
| **P6-γ** | HTML inline·editor.html ~80 处 | 1.5h | Codex |
| **P6-δ** | architecture-map.md v1 + module-boundaries.md v1 + refactor-playbook.md v1 (已草) | 2h | Claude |
| **P6-ε** | lint-namespace.js (optional) | 30 min | 任一 |

总 ~7h·并行 ~4-5h·**1 day 内 Phase 6 close**·

启动条件全 met·

- Phase 5 close (本 doc)
- 24 ns 终表锁
- HTML inline 412 处全表 (phase6-prep.md 已扫)
- 3 文档现状已读·refactor-playbook v1 草稿已写

---

## 6·pair-mode rounds 协议 (Phase 5 沿用 Phase 3·4)

继承·

- 一 slice 一 letter·done 后即写
- prep audit-first (大 slice >1h)
- verify-all gate 每 slice
- 4/4 平衡分工
- 5 关键开放问题·3 round 内 closed

新加 (Phase 5)·

- **24 ns 终表锁**·R200 段所有后续 slice 引用
- **boundary discussion via prep audit**·doc-only round·不动 tm-namespaces.js (避并行 conflict)
- **跨 slice non-冲**·Codex β/ζ/η/θ 与 Claude α/γ/δ/ε 完全独立 sub-ns·tm-namespaces.js 同文件按 R 段顺序追加 (R200·R201·R202·...·R207)·避免 git conflict

---

## 7·Phase 5 letter 链 (本 doc 写时·~12 letter)

```
phase5-prep.md write (Claude P4 期间空闲产出)
  ↓
P4-β-1 ACK + P5 prep doc done (Claude)
  ↓
P5 prep input + P4-β-2 go (Codex·5 Q answered)
  ↓
P5 prep reconciled to 24 ns (Claude)
  ↓
P4-β-2 done + Phase 4 close ready (Codex)
  ↓
Phase 4 close audit + P5-α start (Claude)
  ↓
P5-α done + P5-β go (Claude)
  ↓
P5-β done + P5-γ go (Codex)
  ↓
P5-γ prep audit done (Claude·P5-β 期间空闲)
  ↓
P5-γ done + P5-δ start (Claude)
  ↓
P5-δ prep audit done (Claude·P5-γ 期间空闲)
  ↓
P5-δ + P5-ε done·Claude side complete (Claude)
  ↓
P5-ζ/η/θ prep audits done (Claude·空闲产出)
  ↓
P5-ζ done (Codex·TBD letter)
  ↓
P5-η done (Codex·TBD letter)
  ↓
P5-θ done + Phase 5 close ready (Codex·TBD letter)
  ↓
Phase 5 final audit (本 doc·Claude·待 P5-θ 后填)
  ↓
Phase 6 启 (P6-α + P6-δ first)
```

---

## 8·Phase 5 真 close 条件 (全 met·2026-05-04 验)

| 条件 | done? |
|---|---|
| 24 ns 终表全建 (R200-R207) | ✓ |
| Codex 4 slice done (β/ζ/η/θ) | ✓ |
| Claude 4 slice done (α/γ/δ/ε) | ✓ |
| **verify-all 47/47·25.1s** | ✓ |
| individual assertions ~960 | ✓ |
| headless smoke 212/0/0 | ✓ |
| 177 baseline (R8 layered) 全保 | ✓ |
| encoding markers | (P5-ζ R205 注释行 mojibake·P6 修·non-blocking) |
| LAYERED 0 残留 | ✓ |
| zero regression | ✓ |

**Phase 5 真 close**·Codex 信 (`2026-05-04-codex-p5-theta-done-phase5-close-47of47.md`) 双向确认·

---

## 9·Phase 6 启动信号 ready (实施清单)

按 `phase6-prep.md`·

| sub-slice | scope | est | owner |
|---|---|---|---|
| **P6-α** | R200 rename alias 退役·grep 调用方 (`TM.MapSystem` 2·`TM.Storage` 1)·改 TM.Map / TM.Save·删 alias | 1h | Claude |
| **P6-β** | HTML inline·index.html ~150 处·改 TM.X.fn() | 2h | Codex |
| **P6-γ** | HTML inline·editor.html ~80 处·改 TM.Editor.X.fn() | 1.5h | Codex |
| **P6-δ** | architecture-map.md / module-boundaries.md update + refactor-playbook.md v1 (草稿已写) + changelog.json Phase 5 entry (草稿已写) | 2h | Claude |
| **P6-ε** | encoding fix·R205 注释行 mojibake 还原 (从备份)·optional | 30 min | Claude (memory rule) |
| **P6-ζ** | lint-namespace.js (optional)·新代码强制 TM.X·禁裸 window.fn | 30 min | 任一 |

总 ~7-8h·并行 ~4-5h·**1 day 内 close**·

启动条件全 met·

- ✅ Phase 5 close (本 doc)
- ✅ 24 ns 终表锁 (R200-R207 全 done)
- ✅ HTML inline grep 完成 (412 处全表·phase6-prep.md)
- ✅ 3 文档现状已读·**3 doc 草稿已写** (`phase5-changelog-entry.json`·`phase5-architecture-map-addendum.md`·`phase5-module-boundaries-addendum.md`)
- ✅ refactor-playbook v1 草稿 (~470 行)

---

## 10·current

- **Phase 5 真 close**·47/47·25.1s·zero regression
- **Claude 4 slice done** (α 80·γ 63·δ 82·ε 60·共 285)
- **Codex 4 slice done** (β 67·ζ 47·η 27·θ 54·共 195)
- **总 480 P5 assertions**·全 baseline ~960
- **Phase 6 启信号 ready**·所有 prep doc + 3 P6-δ doc 草稿落地
- 待用户启 Phase 6 信号·或我自己 P6-α start

无 commit·无 push·**all local**·

— Claude (Phase 5 final audit·2026-05-04)
