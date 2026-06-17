# Phase 5 P5-η Endturn Prep Audit

date·2026-05-04 · mode·**read-only prep audit·doc-only**·owner·Codex (Claude prep)

> **scope 收窄**·按 24 ns 共识·P5-η 只 namespace **public entrypoints**·内部 helper 不动·内部跨 phase 闭包变量不动·

## 0·背景

`tm-endturn.js` 原 18,618 行被 P3/P4 拆为 11 个文件·

| 文件 | 行 | 域 |
|---|---|---|
| `tm-endturn-core.js` | 943 | 主入口·endTurn() pipeline 编排 |
| `tm-endturn-prep.js` | 512 | Phase A·收集玩家输入 |
| `tm-endturn-helpers.js` | 1516 | 跨 phase 工具 |
| `tm-endturn-edict.js` | 502 | edict pipeline integration |
| `tm-endturn-province.js` | 2236 | Phase 省级结算 (R7 carve) |
| `tm-endturn-qiaozhi.js` | 269 | 侨置 (P3 R7 carve) |
| `tm-endturn-render.js` | 2099 | Phase F·结算结果渲染 |
| `tm-endturn-systems.js` | 399 | Phase E·子系统推进调度 |
| `tm-endturn-ai-context.js` | 233 | AI context isolation (R7) |
| `tm-endturn-ai-helpers.js` | 427 | AI helpers |
| `tm-endturn-ai-infer.js` | **12602** | AI 主推演·1b/1c 并行 (巨型) |

**总·21738 行·~150 globals**·tm-endturn-ai-infer.js 单文件 12602 行·**Phase 5 不动其内部**·

## 1·HTML inline / window 暴露 (grep 结果)

| 文件 | window.X 暴露 |
|---|---|
| tm-endturn-province | `openDivisionDetail`·`_peLijuanPick`·`_peLijuanClear` |
| tm-endturn-ai-infer | `window.TM.lastPromptTokens` (3 处·diagnostic·非 entrypoint) |
| 其他 | **无 top-level window export** (全 IIFE / 内部) |

**结论**·**endturn cluster 全是 internal pipeline·暴露面极小**·sub-ns 主要是 marker·Phase 6 时 alias 退役阶段不会有大量 grep call site·

## 2·Sub-ns 设计推荐 (scope 收窄)

### 2.1 TM.Endturn (主 entrypoint)

```js
// R206·P5-η Endturn fill (scope 收窄)
// 主入口·endTurn() 函数本身·从 tm-endturn-core.js 暴露
TM.Endturn.run         = _buildWindowRefGroup('Endturn.run', {
  endTurn: 'endTurn',                 // 主 pipeline (从 tm-endturn-core 暴露)
  // 若 endTurn 已 namespaced·或不在 window·则 TM.Endturn.run = {} 待 audit
});

// Phase 切片入口·若可识别·可 alias
TM.Endturn.province    = _buildWindowRefGroup('Endturn.province', {
  openDivisionDetail: 'openDivisionDetail'   // R7 carve 后·province UI entrypoint
});
```

### 2.2 TM.Endturn.AI (sub-ns 已由 R200 P5-α 建)

```js
// AI 推演 sub-ns·tm-endturn-ai-infer.js (12602 行) 主体不动·仅 alias 主 entrypoint
TM.Endturn.AI.infer    = _buildWindowRefGroup('Endturn.AI.infer', {
  // 待 Codex audit 决定哪些是 public entrypoint
  // 候选·subcall1·subcall2·promptBuild 等
});
```

### 2.3 不入 sub-ns 的 (留 window·按 Q4)

- 全部 IIFE 内部 helper (Phase B·C·D·E 内部 fn)·不暴露·不入
- `_peLijuanPick`·`_peLijuanClear` (HTML inline·留 window)
- `window.TM.lastPromptTokens` (diagnostic·非 entrypoint)
- 12602 行 ai-infer 内部·100% 内部·**不动**

## 3·关键判断·**scope 收窄到极致**

- **endturn 主体是 internal pipeline·无 public API surface**
- **R201/R202/R203/R204 sub-ns 都很丰富·但 R206 (Endturn) 应是最瘦的 R 段**
- 实施可能只 5-10 行·主要是 marker·让 24 ns 表名义上完整
- smoke 5-10 assertions 即可

## 4·候选 entrypoint (待 Codex grep audit)

```
endTurn()·或在 tm-endturn-core 暴露
endTurnPart2()·若有
attachEndturnHooks()·若有
buildPromptForRegions(...)·subcall1 / subcall2 入口
runAIDecisionLayer(...)
applyAIOutputToGM(...)
```

Codex grep `tm-endturn-*.js` window/global exports·决定哪些列入·

## 5·命名冲突

| name | 出处 |
|---|---|
| `tick` | endturn 内部许多 phase 都有内部 _tickX·但 sub-engine 各自 (ChangeQueue.tick 等)·**不暴露**·**无冲** |
| `init` | 同上 |

**因 endturn 主体无 export·命名冲突几乎不存在**·

## 6·与 P5-ε 协同

- endturn-systems 调 corruption / authority / fiscal tick·这些 sub-ns 已由 P5-ε/δ 建·**P5-η 不需重复**
- endturn 不写 sub-ns 的内容·只 alias 自己的 entrypoint
- **boundary clean**·

## 7·估时·~1h (低于 prep doc 估 2h)

| 步骤 | est |
|---|---|
| grep `tm-endturn-*.js` window export 全表·15 min audit | 15 min |
| 实施 R206 段 (~10-30 行 · scope 收窄) | 15 min |
| smoke (~10 assertions) | 20 min |
| verify-all 验·target +1 | 5 min |
| 头注 + letter | 5 min |

## 8·关键决策推荐

1. **不要 namespace internal helpers**·12602 行 ai-infer 永远是黑盒·
2. **只 alias public entrypoint**·endTurn / openDivisionDetail / 几个 phase 切入
3. **smoke 极简**·验主入口存在即可·
4. **Phase 6 退役期**·endturn 几乎没有 alias 删除负担·

— Claude (P5-η prep·2026-05-04)
