# Phase 6 Final Audit

date·2026-05-04 · status·**Phase 6 真 close·verify-all 49/49·27.9s·zero regression·Phase 1-6 全部完成**
owner·Claude (P6-α/δ/ε·此 audit) · pair·Codex (P6-β/γ/ζ)

> 模板·与 phase3-final-audit / phase4-final-audit / phase5-final-audit 一致·

---

## 0·Phase 6 目标 (回 architecture-target-final §9)

> **alias 退役 + architecture 文档 finalize·1-2 day target → ~1 day actual**

具体范围·

1. **R200 rename alias 退役**·删 TM.MapSystem / TM.Storage·改 production call site
2. **HTML inline onclick 412 处审计**·~230 处改 TM.X.fn()·~180 by design 留 window
3. **3 文档 finalize**·architecture-map.md v1·module-boundaries.md v1·refactor-playbook.md v1 (新)
4. **lint 强化**·scripts/lint-namespace.js·检退役 alias + migrated handler regression
5. **changelog.json**·Phase 5+6 总条目

---

## 1·Phase 6 round-by-round

| round | date | task | owner | 文件 Δ | smoke | verify-all |
|---|---|---|---|---|---|---|
| **prep** | 05-04 | phase6-prep.md (~210 行)·412 onclick + 3 alias call site audit | Claude | +1 doc | — | 47/47 (P5 close) |
| **P6-α** | 05-04 | R208·TM.MapSystem/Storage rename in-place·8 文件 ~15 处·改 game-loop / hongyan-office / smokes / test-harness | Claude | +0 (改写)·doc R208 段 | — | **47/47** |
| **P6-δ** | 05-04 | architecture-map.md v1 §9 §10·module-boundaries.md v1 §34·refactor-playbook.md v1 (新)·changelog.json Phase 5+6 entry | Claude | +1 doc (playbook 新)·改 3 doc | — | **47/47** |
| **P6-ε** | 05-04 | verify-all.js R205-R207 注释行 mojibake 修 (P5-味/畏/胃 → P5-ζ/η/θ·路 → ·) | Claude | +0 (注释行) | — | **47/47** |
| **P6-β** | 05-04 | index.html 安全 onclick 迁·TM.UI.topbar/shell/turnResult·TM.Save·TM.UI.tabs·TM.Endturn.run | Codex | 改 1 文件 | 58 (新 smoke) | **48/48** |
| **P6-γ** | 05-04 | editor.html onclick 迁·TM.Editor.core/ai/forms/domain/crud/map·并 load tm-namespaces.js (defer + no-auto-verify) | Codex | 改 1 文件 | (合 P6-β smoke) | 48/48 |
| **P6-ζ** | 05-04 | scripts/lint-namespace.js·检退役 alias·HTML inline regression·canonical 不破·224 文件·222987 rules | Codex | +1 lint | PASS | **49/49** |

**Claude 3 slice·~3h actual** (alias 退役·doc finalize·encoding fix)·
**Codex 3 slice·~4-5h actual** (HTML inline 230 处 + lint)·

---

## 2·Phase 6 净结果

### 2.1 文件数

| 阶段 | runtime files | Δ |
|---|---|---|
| Phase 5 close | ~194 | — |
| Phase 6 close | ~194 | **0** |

Phase 6 不动 runtime 文件·只·

- 改 `tm-namespaces.js` (R208 段·rename in-place + 删 alias·~30 行 net)
- 改 production call site 2 处 (game-loop / hongyan-office) + 8+ 处 smoke / test-harness
- 改 HTML 2 文件 (index.html / editor.html·230 处 onclick 迁)
- 加 2 smoke (`smoke-p6-inline-namespaces.js` 58 assert + `lint-namespace.js`)
- 改 3 doc (architecture-map / module-boundaries / changelog.json)
- 加 4 doc (phase6-prep / phase6-final-audit / refactor-playbook / phase6-inline-namespace-implementation)

### 2.2 verify-all 增长

| 阶段 | verify-all | 增加项 |
|---|---|---|
| P5 close | 47/47 | (R208 启点) |
| P6-α/δ/ε done (Claude) | 47/47 | (改写不增 smoke) |
| P6-β/γ done (Codex) | 48/48 | +smoke-p6-inline-namespaces (58 assert) |
| **P6-ζ done** | **49/49** ✓ | **+lint-namespace (224 文件·222987 rules)** |

**新增 ~58 individual assertions + lint scan 222987 rules**·

### 2.3 zero regression·全程

| 维度 | P5 close | **P6 close** | Δ |
|---|---|---|---|
| verify-all | 47/47 | **49/49·27.9s** | +2 |
| individual assertions | ~960 | **~1018** | +58 |
| headless smoke | 212/0/0 | **212/0/0** | 0 |
| cc3-smoke | 56/0 | **56/0** | 0 |
| 177 baseline (R8 layered) | 全保 | **全保** | 0 |
| LAYERED 残留 | 0 | **0** | 维持 |

---

## 3·Phase 6 范围决策记录

### 3.1 R208 alias 退役·改名 in-place vs delete

P5-α 时·R200 用 `TM.Map = TM.MapSystem` (alias·两个名指同对象)·

P6-α 选·**rename in-place**·R87 段直接 `TM.Map = _buildFacade('Map', MAP_FNS)` (改名·删旧名)·

| 选项 | 评估 |
|---|---|
| A·rename in-place (选) | 干净·canonical 唯一·alias 真删·调用方必走新名 |
| B·留 TM.MapSystem 标 deprecated | 不动·但 grep 噪音·新代码可能误用 |

### 3.2 HTML inline onclick·安全先行 vs 全自动

按 phase6-prep Q4 决议·**安全先行 (Codex 实施)**·

| 类别 | 处理 |
|---|---|
| index.html main-game (~150 处) | 迁 TM.UI.topbar/shell/turnResult/tabs·TM.Save·TM.Endturn.run |
| editor.html (~80 处) | 迁 TM.Editor.core/ai/forms/domain/crud/map |
| **owner-pending game panel** (TM_Changelog.show / openWentian / openTodoPanel / openShiji / openShizhengTasks) | **留 window·by design·Phase 7+ 决** |
| map editors / preview-*.html (~180 处) | **留 window·by design·非 game runtime** |
| dynamic snippets (editor/runtime 内生成) | **留 window·by design** |

实改·~230 处 (index 150 + editor 80)·留 ~180·

### 3.3 lint 范围·窄而非宽

按 P6-ζ 实施·**lint 故意窄**·

- 失败·active code 用退役 TM.MapSystem / TM.Storage
- 失败·index.html / editor.html 已迁 onclick 回退老名
- 验·canonical migrated callsites 仍存在

不禁·**unrelated window handlers**·因 map editors / preview / owner-pending 仍合理依赖 globals·过宽 lint 会误伤·

### 3.4 editor.html load tm-namespaces.js·defer + no-auto-verify

```html
<script src="tm-namespaces.js" defer="" data-tm-no-auto-verify="1"></script>
```

editor 不 load 全 game runtime·若 auto-verify 跑·会 noisy warn missing 函数 (R87 facade 50+ fn 在 game runtime 才有)·

**defer + data-tm-no-auto-verify="1"** 抑 noise·保 manual `TM.namespaces.verify()` 可调·

---

## 4·architecture-target-final §9 reconciliation

| §9 项 | 状态 | 备注 |
|---|---|---|
| alias 退役 | ✓ | R208·TM.MapSystem/Storage 删 |
| HTML inline lint 强化 | ✓ partial | 安全先行·~230 处迁·~180 留 by design |
| architecture-map.md v1 | ✓ | §9 §10 加 |
| module-boundaries.md v1 | ✓ | §34 加 |
| refactor-playbook.md v1 (新) | ✓ | ~470 行·提炼 Phase 1-5 经验 |
| 1-2 day target | **~1 day actual** | prep audit + 草稿 drop-in 大幅压缩 |

---

## 5·Phase 1-6 总收·6 phase 全部完成

| Phase | 目标 | verify-all | 总耗时 |
|---|---|---|---|
| Phase 0 | 架构目标·target-final align | — | 已完 (P0a/P0b) |
| Phase 1 | 安全网·map.md v0·lint·audit | — | 已完 (9 slices) |
| Phase 2 | 低风险清理 (administration·data 切分·SELF rename·patches 已迁段) | — | 已完 |
| Phase 3 | 高价值模块治理 (chaoyi 5·editor 16·fiscal 15·patches LAYERED) | 35/35 | 已完 (R6/R7/R8/R9/R10/R11/R12) |
| Phase 4 | 小文件合并 (close-by-value·11 文件合·-10 runtime) | **39/39** | 已完 (P4-α/β) |
| Phase 5 | 命名规约 + namespace 清理 (24 canonical·R200-R207) | **47/47** | 已完 (P5-α/β/γ/δ/ε/ζ/η/θ) |
| **Phase 6** | **alias 退役 + docs finalize** | **49/49** | **本 phase 真 close** |

---

## 6·Phase 6 letter 链 (实操参考)

```
P5-θ done + Phase 5 close 47/47 (Codex)
  ↓
Phase 5 close 双向 ack + Phase 6 ready (Claude·~2620 行 doc 落地)
  ↓
用户 启 Phase 6
  ↓
Phase 6 P6-α/δ/ε done·47/47 维持 (Claude·alias 退役 + doc finalize + encoding fix)
  ↓
P6-β/γ/ζ done + Phase 6 close (Codex·HTML inline + lint·49/49)
  ↓
Phase 6 final audit (本 doc·Claude)
```

---

## 7·Phase 6 close 条件 (全 met)

| 条件 | done? |
|---|---|
| R200 rename alias 退役·canonical 直接定义 | ✓ (P6-α) |
| HTML inline onclick·index 150 + editor 80 处迁 | ✓ (P6-β/γ Codex) |
| HTML inline·~180 处 by design 留 window·标 owner-pending / dynamic / preview | ✓ |
| architecture-map.md v1 | ✓ (P6-δ) |
| module-boundaries.md v1 | ✓ (P6-δ) |
| refactor-playbook.md v1 (新建) | ✓ (P6-δ Claude·上回合写) |
| changelog.json Phase 5+6 entry | ✓ (P6-δ) |
| R205-R207 注释行 mojibake 修 | ✓ (P6-ε) |
| lint-namespace.js (P6-ζ) | ✓ (Codex·窄 lint·224 文件·222987 rules PASS) |
| **verify-all 49/49·zero regression** | ✓ (本 audit) |
| Phase 7+ owner-pending list | ✓ (Codex letter §Close Call·standalone editors·owner-pending entrypoints·dynamic snippets) |

---

## 8·Phase 7+ 留给后人 (owner-facade work·optional)

按 Codex letter §"Close Call"·**Phase 7+ 留**·

- standalone map/editor/preview HTML tools (map-editor-pro/smart/region·preview-*.html)
- owner-pending game panel entrypoints (TM_Changelog·openWentian·openTodoPanel·openShiji·openShizhengTasks)
- dynamic snippets generated inside editor/runtime modules
- TM.Lizhi → TM.Office.Lizhi / TM.UI.Lizhi 决定 (Codex Q1 留 Phase 7)
- TM.Memory vs TM.Char.historical 是否合并
- TM.Player·TM.Wendui·TM.Military 待 fill (Phase 5 留空容器)

---

## 9·current

- **Phase 6 真 close**·49/49·27.9s·zero regression
- **Phase 1-6 全部完成**·24 ns canonical 投产·alias-then-rename ladder 3 阶段终结
- **总耗时·~7 day** (Phase 1-6·estimate target ~21-30 day → actual ~7 day·prep audit + helper + 4/4 分工 + close-by-value 大幅压缩)
- 待用户决定·**Phase 7+ owner-facade work** (optional·非必要)·或停在 Phase 6·

无 commit·无 push·**all local**·

— Claude (Phase 6 final audit·Phase 1-6 总收·2026-05-04)
