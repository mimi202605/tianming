# Phase 4 Final Audit

date·2026-05-04 · status·**Phase 4 close·verify-all 39/39·-7 net runtime files·zero regression**
owner·Claude (P4-α-1·此 audit doc) · pair·Codex (P4-β-1·P4-β-2)

## 0·Phase 4 目标 (回 architecture-target-final §9)

> **小文件合并 (26 个 <200 行)·utils 整理·3-5 day**

实际范围 (按 close-by-value·非 close-by-count)·

1. **map-recognition cluster** (5 文件·image processing strategy)·P3 R11post catch-up
2. **ui-foundation cluster** (4 文件·icons/modal/settings/cheatsheet)·P4-β-1
3. **diagnostics-foundation cluster** (3 文件·errors/panel/guard)·P4-β-2
4. **map-converter/integration/display**·**defer·by design split** (3 文件·清晰分层 数据/逻辑/UI)
5. **剩余 <200 候选**·**defer·close by value 而非 file-count 绝对**

## 1·Phase 4 round-by-round

| round | date | task | owner | 文件 Δ | 行 Δ | verify-all | 备注 |
|---|---|---|---|---|---|---|---|
| **P4-α-1** | 05-04 | map-recognition + borders + fast + improved + eu4 → 1 | Claude | **-4** | -1789 行 | 37/37 | byte-for-byte concat·5 strategy 全保 window export·HTML 5 tag → 1 |
| **P4-α-2** | 05-04 | map-converter + integration + display 3→1 audit | Claude | **defer** | — | — | **by design split**·数据/逻辑/UI 三层独立·非未完成项 |
| **P4-β-1** | 05-04 | tm-icons + modal-system + settings-ui + cheatsheet-overlay → tm-ui-foundation | Codex | **-3 runtime / -2 net** | ~+18 lines net | 38/38 | +1 smoke·9 public globals 全保·index.html 5 tag → 1 |
| **P4-β-2** | 05-04 | tm-error-collector + errors-panel + pollution-guard → tm-diagnostics-foundation | Codex | **-3 runtime / -2 net** | ~ similar | 39/39 | +1 smoke·11 public globals 保·新 TM.Diagnostics facade·tm-diagnostics-panel 留独立 (单独 dashboard) |

## 2·Phase 4 净结果

### 2.1 runtime 文件数

| 阶段 | runtime files | Δ |
|---|---|---|
| Phase 4 start (P3 close 后) | ~204 | — |
| P4-α-1 done | -4 | -4 |
| P4-β-1 done | -7 (累计) | -3 |
| P4-β-2 done | **-10 (累计)** | -3 |

**净·-10 runtime files** (但 +2 new merged·+2 new smoke·repo net **-7**)·

### 2.2 行数

无明显增减·均为 byte-for-byte concat·新 smoke 各 ~150-200 行·总 +500 行 smoke·

### 2.3 verify-all baseline 增长

| 阶段 | verify-all | 增加项 |
|---|---|---|
| P3 close | 37/37 | +2 layered (R12 phase-c-smoke·phase-f1-smoke) |
| P4-β-1 done | **38/38** | +1 ui-foundation smoke (18 assertions) |
| P4-β-2 done | **39/39** | +1 diagnostics-foundation smoke (24 assertions) |

**新增 42 assertions** (18 + 24)·总 baseline ~221 individual assertions across 39 checks·

### 2.4 headless smoke

`smoke` 检查·**212 passed / 0 failed / 0 skipped**·与 P3 close 时相同·zero regression·

### 2.5 cluster 现状

| cluster | P3 close | P4 close | Δ |
|---|---|---|---|
| **map** | 13 .js | 9 .js | -4 (recognition family 5→1) |
| **ui foundation** | 4 small files (icons/modal/settings/cheatsheet) | 1 file (tm-ui-foundation) | -3 |
| **diagnostics foundation** | 3 small files (error-collector/errors-panel/pollution-guard) | 1 file (tm-diagnostics-foundation) | -3 |
| 其他 cluster | 不动 | 不动 | 0 |

## 3·Phase 4 范围决策记录

### 3.1 close-by-value vs close-by-count

architecture-target-final §9 写 "26 个 <200 行小文件合并"·实际**没全做**·原因·

> 不是所有 <200 行文件都该合并。有些是清晰分层的独立小文件 (e.g. map-converter / map-integration / map-display 3 文件 = 数据/逻辑/UI)·合并会**破坏分层**·违反 §1 Top Principle #1 "职责清晰优先于文件少"·

决议·**close-by-value**·只合并·

- 真正同 cluster·load 顺序绑定·相互依赖的文件 (recognition family·ui foundation·diagnostics foundation)
- **不合并**·分层独立·重叠少·domain 不同的 (map 三层·tm-diagnostics-panel = 大 dashboard)

### 3.2 by design split 列表

以下文件 **Phase 4 内 audit 后 explicitly 不合并**·标 by design split·非未完成项·

| 文件 | 域 | 理由 |
|---|---|---|
| `map-converter.js` | 数据层 | Leaflet ↔ game format 转换 |
| `map-integration.js` | 逻辑层 | game-AI integration·距离/路径/补给 |
| `map-display.js` | UI 层 | canvas + DOM 渲染 |
| `tm-diagnostics-panel.js` | 大 dashboard | 不同于 foundation·is unified diagnostic dashboard·留独立 |

### 3.3 not done 候选 (Phase 5+ 决定)

剩余 <200 行文件 (~ 20 候选) **未自动合并**·留 Phase 5+ 按 namespace 自然 cluster·或保独立·

## 4·architecture-target-final §9 reconciliation

| §9 项 | 状态 | 备注 |
|---|---|---|
| 26 个 <200 行小文件合并 | partial done | 11 文件已合 (5+4+3=12·实际 -10 runtime)·剩按 by-value 决策不合 |
| utils 整理 | partial | tm-icons/tm-utils 关系明确·剩 utils-mid·utils-edit 等留独立 |
| 3-5 day | **2 day actual** | 实际 ~2 day·因为 close-by-value 不强求 26 全做 |

## 5·Phase 5 启动信号 ready

按 4/4 分工 (与 Codex 共识 2026-05-04)·`docs/phase5-prep.md` 已 reconcile·

| slice | owner | 估时 |
|---|---|---|
| P5-α reconcile (first·必须) | **Claude** | 1.5h |
| P5-β NPC/Char | **Codex** | 2h |
| P5-γ Edict | **Claude** | 1.5h |
| P5-δ Fiscal/Economy/Guoku/Neitang | **Claude** | 3h |
| P5-ε Authority/Office/Keju/Corruption/Lizhi | **Claude** | 3h |
| P5-ζ Map/UI | **Codex** | 2h |
| P5-η Endturn (scope 收窄) | **Codex** | 2h |
| P5-θ Editor | **Codex** | 2h |

总 ~18h·并行 ~9h·**1.5 day**·

## 6·pair-mode rounds 协议 (Phase 4)

继承 Phase 3 的协议·

- 一 slice 一 letter·done 后即写
- 双向 ack·不 chain·并行
- verify-all gate 每 slice·39/39 全程
- HTML/index.html 改动同 commit
- by design split 在 audit doc explicit 标·避免后续误判为未完成

**Phase 4 letter 链**·

```
P4-α-1 done & P4-α-2 defer rationale (Claude)
  ↓
P4-α-1 ACK + P4-β-1 done + α-2 defer agreed (Codex)
  ↓
P4-β-1 ACK + P5 prep doc done (Claude)
  ↓
P5 prep input + P4-β-2 go (Codex)
  ↓
P5 prep reconciled to 24 ns (Claude)
  ↓
P4-β-2 done + Phase 4 close ready (Codex)
  ↓
Phase 4 final audit (本 doc·Claude)
  ↓
Phase 5 启 (P5-α first)
```

## 7·current

- **Phase 4 close**·39/39·-10 runtime / -7 repo net·zero regression
- **Phase 5 启动信号 ready**·4/4 分工·24 ns 终表锁
- **下一步·P5-α (Claude·首 slice·必须 first)**·扩 tm-namespaces.js·锁 24 canonical·alias 留

无 commit·无 push·**all local**·

— Claude (Phase 4 close audit·2026-05-04)
