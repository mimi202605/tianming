# 廷议 sprint·endturn decay 接入契约

**版本**·v2.6 Slice 0.5
**目的**·定义召集制 + 反弹相关 GM state 字段的 decay (衰减) 接入点·跨 sprint 协调·避免跟 endturn pipeline sprint 冲突。
**适用 slice**·Slice 2.5 (民意度 / 言官离心 decay·conveningPolitics reset)·Slice 8 (反弹 hook)·Slice 11 (smoke verify)

---

## 1·触发时机·每 turn endturn 阶段的"末段后处理"

```
endturn 流程·
  ... AI 推演 ...
  ... AI change applier ...
  ... apply (loyalty / military / fiscal / etc.) ...
  ... event 触发 ...
  ── 末段后处理 ──
  partyStrife decay     (v3 已有·不动)
  chronicleTrack decay  (v3 已有·tm-chronicle-tracker.js tick())
  ===  v2.6 sprint 新加  ===
  _ty3_v15_decayConveningCounters()    ← Slice 2.5 新建·本契约目标
```

---

## 2·decay 时序·4 步

```js
// v2.6 Slice 2.5 实施·tm-tinyi-v3.js 新建·暴露 window._ty3_v15_decayConveningCounters
function _ty3_v15_decayConveningCounters() {
  if (typeof GM === 'undefined') return;
  
  // 1·民意度 decay (按 dynasty + monthsPerTurn·见 §5.4.8)
  if (typeof GM._convening_民意度 === 'number') {
    var dynasty = (GM.scenario && GM.scenario.dynasty) || '明';
    var baseRate = { '明':0.88, '宋':0.94, '唐':0.91, '元':0.85, '清':0.90 }[dynasty] || 0.90;
    var monthsPerTurn = (typeof _getDaysPerTurn === 'function' ? _getDaysPerTurn() : 30) / 30.4375;  // v2.5 精度修
    GM._convening_民意度 *= Math.pow(baseRate, monthsPerTurn);
    // clamp
    GM._convening_民意度 = Math.max(-100, Math.min(100, GM._convening_民意度));
  }
  
  // 2·言官离心 decay (5%/月·按 monthsPerTurn 折算·见 §5.4.9)
  if (typeof GM._convening_言官离心 === 'number') {
    var monthsPerTurn2 = (typeof _getDaysPerTurn === 'function' ? _getDaysPerTurn() : 30) / 30.4375;
    GM._convening_言官离心 *= Math.pow(0.95, monthsPerTurn2);
    GM._convening_言官离心 = Math.max(0, Math.min(100, GM._convening_言官离心));
  }
  
  // 3·conveningPolitics tilt 7-turn 后 reset (非持续·临时·只影响下一议反弹)
  if (CY._ty3 && CY._ty3.conveningPolitics) {
    var tilt = CY._ty3.conveningPolitics;
    if (tilt.turn != null && (GM.turn - tilt.turn) >= 7) {
      CY._ty3.conveningPolitics = null;
    }
  }
  
  // 4·_pendingSickLeaveEvents / _pendingResignMemorials / _pendingClearOpinionEvents
  //   按 expireTurn 清理 (跟 partyStrife decay 同 pattern·v3 paradigm)
  ['_pendingSickLeaveEvents', '_pendingResignMemorials', '_pendingClearOpinionEvents'].forEach(function(key) {
    if (!Array.isArray(GM[key])) return;
    GM[key] = GM[key].filter(function(e) {
      return !e.expireTurn || e.expireTurn > GM.turn;
    });
  });
}
```

---

## 3·接入点·按 endturn pipeline 版本

### 3.1·当前 endturn pipeline (sprint 默认走此)

```js
// tm-endturn-apply.js 末尾·跟 sc_consolidate / chronicleTrack decay 同列追加
// 找 endturn 主函数末尾·一般是 finalizeEndturn 或类似 wrapper
// 插入·
try {
  if (typeof _ty3_v15_decayConveningCounters === 'function') {
    _ty3_v15_decayConveningCounters();
  }
} catch (_decayE) {
  try { window.TM && TM.errors && TM.errors.captureSilent(_decayE, 'tinyi-decay'); } catch (_) {}
}
```

风险·低·末尾追加调用·不破坏前置 pipeline·若 decay 函数 throw·catch silent·不阻塞 endturn 完成。

### 3.2·endturn pipeline sprint 完成后 (Slice 11 收口迁移)

```js
// 新 pipeline·挂 ctx.crossTurn step
// (见 [[project_endturn_pipeline]] sprint doc)
pipeline.crossTurn.push({
  name: 'tinyi-decay',
  run: function(ctx) { _ty3_v15_decayConveningCounters(); }
});
```

Slice 11 实施时·若 endturn pipeline sprint 已 ship·迁移到新 paradigm。

---

## 4·DoD (Slice 2.5 + Slice 11 收口)

| 项 | 验证 |
|---|---|
| 1 | `_ty3_v15_decayConveningCounters` 函数存在 + window expose |
| 2 | tm-endturn-apply.js 末尾追加调用 (try/catch) |
| 3 | 5 turn smoke·`GM._convening_民意度` 从 ±50 收敛到 ±20 内 (按 dynasty=明·0.88^5≈0.527 衰减率) |
| 4 | 5 turn smoke·`GM._convening_言官离心` 从 50 衰到 ~38 (0.95^5≈0.774) |
| 5 | 7 turn 后·`CY._ty3.conveningPolitics` 自动 reset 为 null |
| 6 | endturn 抛 error·decay 不阻塞·error 入 TM.errors log |

---

## 5·跨 sprint 协调

| sprint | 关系 | 操作 |
|---|---|---|
| 廷议 sprint v2.6 | own decay logic | Slice 2.5 实施时跟本契约 |
| [[project_endturn_pipeline]] sprint | own pipeline 主架构 | 若先 ship·Slice 11 收口加 ctx.crossTurn step·迁移 |
| 常朝大改 sprint | 已 ship | partyStrife decay 已有·sprint 不动 |

**冲突解决**·若两 sprint 并行·廷议 sprint 先 patch tm-endturn-apply.js·endturn sprint 后续 refactor 时·把廷议 decay 迁到新 pipeline。**廷议 Slice 11 加 verify·迁完后 grep 旧 patch = 0 hit**。
