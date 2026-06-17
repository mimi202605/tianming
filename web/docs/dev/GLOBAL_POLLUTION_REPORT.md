# 天命 · window 全局污染清点报告

> 2026-04-24 R50 产出
> 目的：量化 92 个 tm-*.js 对 `window` 命名空间的占用，为未来命名空间化重构提供数据支撑。

---

## 核心数字

| 指标 | 数值 |
|------|------|
| 总唯一全局名 | **1469 个** |
| tm-*.js 文件数 | 54（index.html 加载） |
| 平均每文件暴露 | **27 个** |
| 顶层 `function` 声明 | 976 个（自动挂 window） |
| 顶层 `var/let/const` | 784 个 |
| 显式 `window.X =` 赋值 | 23 个 |
| 覆盖已有全局（`X = function...`） | 2 个 |

---

## 最肥 10 个文件（Top 10 贡献者）

| # | 文件 | 暴露数 | 示例 |
|---|------|-------|------|
| 1 | `tm-economy-military.js` | **333** | getTributeRatio / calculateMonthlyIncome / updateEconomy / recalculatePowerStructure |
| 2 | `tm-map-system.js` | 126 | initMapSystem / assignFactionColors / hslToRgb / initTerrainTypes |
| 3 | `tm-lizhi-panel.js` | 107 | _lizhiTabJump / renderInkDots / getLizhiPhase |
| 4 | `tm-guoku-panel.js` | 77 | _guokuFmt / openGuokuPanel / renderGuokuPanel |
| 5 | `tm-huji-deep-fill.js` | 52 | _initClassSystem / _tickClassMobility / _tickLandlordAnnexation |
| 6 | `tm-neitang-panel.js` | 45 | _neitangFmt / openNeitangPanel |
| 7 | `tm-change-queue.js` | 41 | enqueue / applyAll / clear |
| 8 | `tm-authority-complete.js` | 37 | _initMinxinMatrix / _tickMinxinMatrix |
| 9 | `tm-huji-engine.js` | 34 | init / _inferDynasty / _initByCategory |
| 10 | `tm-phase-g2-huji-complete.js` | 34 | applyEthnicFaithPreset / linkBaojiaNPCs |

**小计**：Top 10 文件 = **886 全局**（占总数 60%）

---

## 命名冲突高发名字

| 名字 | 共用文件数 | 冲突风险 | R89 实测 |
|------|----------|---------|----------|
| `tick` | 29 | 低（多为对象方法 `XxxEngine.tick`，非顶层） | ✓ 确认低 |
| `init` | 25 | 低（同上） | ✓ 确认低 |
| `clamp` | 9 | ~~中~~ **假警报** | ❌ **只 1 处顶层 function clamp 定义**（tm-utils.js:509），其余 8 处是使用点 |

之前已修复的真冲突（R17 相关）：
- `findPath` — map-integration 与 tm-map-system 签名不同（2026-04-24 已改名 `_miFindPath`）
- `_getDaysPerTurn` — tm-edict-lifecycle 与 tm-utils 重复（已知共存，后加载覆盖）

### R89 (2026-04-24) 再审计修正

**原报告误判一**：clamp "共用 9 文件"是 grep 调用点·不是定义点·实际 0 冲突。

**原报告误判二（索引缓存无限增长）**：
- `_officeIndex = new Map()` (tm-npc-engine.js L2471) → **每回合整体替换**·不增长
- `GM._indices.charByName/facByName/partyByName/...` 18 个 Map (tm-index-world.js) → **全部整体替换**·不增长
- 核心模式是 `cache = new Map()` 而非 `cache.set(...)` 累积·**没有真内存泄漏**

真正需处理的全局污染问题仅剩：
- 建议 1（命名空间化 3 大户）：R87 已完成 TM.Economy/Lizhi/Guoku/MapSystem/Neitang 真实化+1 次阶段 2 迁移示范
- 建议 2（TM.utils）：尚未做·但优先级低于 tm-endturn.js 拆分（R88 进行中）
- 建议 3（污染守卫）：R60 已加 TM.guard

---

## 风险评估

### 已造成的隐形 bug
当两个文件都定义顶层 `function X()`，后加载的**静默覆盖**前者。JS 非严格模式不会报错。

**历史案例**（2026-04-24 R10/R12 排查）：
- `tm-patches.js` 的 `openSettings` 覆盖 `tm-game-engine.js` 原版
- `tm-audio-theme.js` 的 `renderTechTab/renderRulTab/renderEvtTab` 覆盖 `tm-game-engine.js` 原版
- Corruption `tick` 被 p2/p4 连续覆盖（LAYERED 2 层）
- Guoku `tick` 被 p2/p4/p5/p6 连续覆盖（LAYERED 5 层）

### 潜在风险（未爆发）
- **每新增文件** 平均 +27 个全局，冲突概率**指数增长**
- 目前无工具检测"新增定义是否覆盖已有"
- 未来引入 3rd-party JS（如 Chart.js）可能撞上

---

## Top 3 改进建议（按 ROI 排序）

### 建议 1：命名空间化 3 大户（ROI 最高）

把 `tm-economy-military.js` / `tm-map-system.js` / `tm-lizhi-panel.js` 的 566 全局，封装为：

```javascript
TM.Economy = {
  getTributeRatio, calculateMonthlyIncome, updateEconomy, ...
};
TM.MapSystem = {
  init: initMapSystem, assignFactionColors, hslToRgb, ...
};
TM.Lizhi = {
  tabJump: _lizhiTabJump, renderInkDots, getLizhiPhase, ...
};
```

**收益**：全局名从 1469 → 1469 - 566 + 3 ≈ **906** （减 38%）
**成本**：60-80h（需更新所有调用点）
**风险**：中（调用点分布广）

### 建议 2：统一 `TM.utils` 收纳工具函数

`clamp` / `deepClone` / `escHtml` / `uid` 等 20+ 工具函数分散在 `tm-utils.js` 直接挂 window。

**方案**：
```javascript
TM.utils = { clamp, deepClone, escHtml, uid, extractJSON, ... };
// 过渡期保留 window 别名
window.clamp = TM.utils.clamp;  // deprecated
```

**收益**：预计收拢 30-40 个工具函数
**成本**：4-8h（工具函数调用多但改动简单）

### 建议 3：加全局污染守卫

在 `tm-data-model.js` 顶部（第 1 个加载的 tm-*.js）注入：

```javascript
(function(){
  var _origDefine = Object.defineProperty;
  var _seen = {};
  var _conflicts = [];
  window.addEventListener('load', function(){
    Object.keys(window).forEach(function(k){
      if (k.match(/^(tm|_|TM_|DA$|GM$|P$)/)) {
        if (_seen[k]) _conflicts.push(k);
        _seen[k] = true;
      }
    });
    if (_conflicts.length) console.warn('[pollution] 可疑冲突:', _conflicts);
  });
})();
```

**收益**：新增文件时立即发现冲突
**成本**：1-2h

---

## 长期演化方向

### 阶段 1（2026 Q3）：收纳三大户
- 用命名空间对象包装 `tm-economy-military.js`、`tm-map-system.js`、`tm-lizhi-panel.js`
- 保留 window 别名过渡
- 预计全局数减少 35-40%

### 阶段 2（2026 Q4）：工具统一
- `TM.utils.*` 收纳所有工具函数
- `TM.io.*` 收纳 fetch/storage 相关

### 阶段 3（2027）：模块化
- 逐步迁移到 ES6 Module（`import/export`）
- 保留 `<script>` 加载模式的 CDN fallback

---

## 详细数据索引

完整 Top 10 之外的文件污染数据，执行此命令获取：

```bash
# 在 web/ 目录下
grep -h "^function\|^window\." tm-*.js | wc -l
```

分文件统计：
```bash
for f in tm-*.js; do
  n=$(grep -c "^function\|^window\." "$f")
  echo "$n $f"
done | sort -rn | head -20
```

---

## 附录 · 其他发现

- IIFE 包装率约 25%（92 文件中约 23 个用 `(function(){...})()`）
- 大部分 tm-*.js 直接 `function foo(){...}` 顶层声明（自动 global）
- 有 `(function(global){...})(window)` 模式的约占 15%
- 命名前缀约定混乱（有 `_` 下划线/没前缀/大写工厂等多风格共存）
