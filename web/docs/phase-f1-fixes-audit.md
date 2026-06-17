# tm-phase-f1-fixes.js Audit

date·2026-05-03 · status·**Phase 2·Claude audit**·tier 决定 done

来源·`tm-phase-f1-fixes.js` (247 行)·原头注·"F 阶段 ①·快速修正"

---

## 1·tier 决定·**LAYERED** (与 tm-phase-c-patches.js 同级)

依据·**R116b · 2026-04-24 原注**·

> ⚠ 状态·**"ACCEPTED LAYERING · 暂不合并"**
> ⚠ 补丁分类 (R26 评估)·**LAYERED (真 monkey patch)**

---

## 2·内容分类

### 2.1 APPEND (低风险·可独立)

- `PhaseF1.init` / `PhaseF1.tick` — 注册自身 tick 调度

### 2.2 OVERRIDE (高风险·真 monkey patch)

- `AuthorityEngines.tick` — **替换** tm-authority-engines.js 的简化版 `_updatePerceivedHuangwei`
  - 新版·五段粉饰 (暴君/威严/常望/衰微/失威) + 党羽轮换 + 三段皇权
- `PhaseD.COUNTER_STRATEGIES.rotate_officials` — **修改** 权臣反击策略的衰减算法
  - 新算法·核心党羽 -0.12/个·外围 -0.04/个·控制度衰减

### 2.3 覆盖链 (R26 已认识)

```
authority-engines.tick v1 → f1-fixes.tick v2 (五段粉饰 + 党羽轮换 + 三段皇权)
```

---

## 3·补完功能 list

- D 粉饰度五段位完整修正
- 党羽轮换衰减算法
- 皇权三段统一处理器
- B 户口 phase-b 运行时调用·徭役民变 / 迁徙 / 年龄金字塔 / 疫病 / 作物 / 税基流失
- 诏书五要素接入编辑器实时检查

---

## 4·合并 prerequisite (R26 评估)

合并前必需·

- **AuthorityEngines.tick 路径 smoke test** (10 个用例·五段粉饰 × 两段党羽)
- **PhaseD.COUNTER_STRATEGIES 行为快照** (原策略 + 新策略 fixture 对比)

合并工时估算·**15-25h**

合并策略·

- F1 的 `_updatePerceivedHuangwei_full` 整段替换 authority-engines 内对应函数
- `PhaseD.COUNTER_STRATEGIES.rotate_officials` 直接修改 phase-d 源 (phase-d 也不是 SELF·此改动相依)

---

## 5·Phase 安排

- **Phase 1·已 audit** (本 doc)·标记 LAYERED
- **Phase 2·保留** (与 phase-c-patches 同·R116b 决定)
- **Phase 3+·合并 (条件 1·先写 10 smoke + 行为快照)**
  - 优先级·**低** (不是当前阻塞)
  - 与 phase-c-patches 同级处理·**两 LAYERED 一起 Phase 3 末批准**

---

## 6·与 architecture-target-final.md / map.md 一致性

- ✓ final.md §4.11·"tm-phase-f1-fixes.js (247) 待 audit·**Phase 1 audit**·SELF/APPEND 决定" → **本 audit done·实际 LAYERED**
- ✓ map.md §1 行 83·"tm-phase-f1-fixes.js (247·P1 audit)" → **audit done·标 LAYERED·Phase 3+ 合并**
- ✓ boundaries.md §31·"`tm-phase-f1-fixes.js` (247) | 待 audit | (P1 audit)" → **本 audit done·更新 entry**

---

## 7·结论

| 项 | 结果 |
|---|---|
| tier | **LAYERED** (真 monkey patch) |
| Phase 2 行动 | **保留**·**不动**·与 phase-c-patches 同 |
| Phase 3+ 行动 | 合并·先写 10 smoke + 行为快照·~15-25h |
| 当前 active | ✓ (R116b decision)·**作 monkey-patch 分层 active 加载·index.html 内** |
| 头注 | ✓ 已有 (R116b 详细分类 + 合并 checklist) |
| lint rule 3 | ✓ pass (头注 explicit) |
| lint rule 2 | ⚠ -fixes 后缀·**LAYERED 例外·临时迁移可短期存在** (final §5.1 例外条款) |

---

## 8·next slice candidates (Phase 2)

按 architecture-target-final.md §9 Phase 2·

- char-historical-profiles-ext.js (10298·按朝代切·**首 priority**·data·低 risk)
- tm-patches.js 已迁段清理 (按 PATCH_CLASSIFICATION.md)
- 其他 SELF / APPEND phase 文件 audit (tm-guoku-p* / tm-corruption-p* / tm-neitang-p*)

---

— end of phase-f1-fixes-audit.md
