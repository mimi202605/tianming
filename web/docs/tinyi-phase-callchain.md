# 廷议 v3·phase6 → phase7 调用链 verify

**版本**·v2.6 Slice 0.5
**目的**·verify v3 phase6 (用印) → phase7 (追责) 时序·确保 Slice 8 反弹 hook 的 timing 正确·**phase6 effects 已应用·phase7 effects 尚未发生**。
**方法**·亲读 tm-tinyi-v3.js L2778-2922 + L3407-3517·grep call chain verified

---

## 1·phase6 调用链 (亲读 verified)

```
玩家完成钦定 → _ty3_phase6_open(decision, archonGrade, opts)
  L2924·UI entry·呈现用印 UI (modal·朱砂印章动画)
  ├ S 档·直接 doSeal
  ├ 其他·呈现 "强行用印 / 留中阻挠 / 退还修改" 选项
  └ 玩家 click 用印 button
    ↓
_ty3_phase6_doSeal(force)
  L2999·UI handler·expose window L3386
  ↓
_ty3_phase6_resolveSeal(force, ctx)
  L2902·async wait 用印动画·处理 hostile party 阻挠 roll
  ↓ 计算 status (issued / blocked / reissued / contested)
  return _ty3_phase6_recordSeal(status, ctx, detail)
    ↓
_ty3_phase6_recordSeal(status, ctx, detail)
  L2778·状态写入·v2.6 Slice 0.5 已加 window expose (Slice 8 hook 必经)
  ├ 1·更新 seal status·写 CY._ty3.sealStatus + sealedEdict
  ├ 2·调 TM.ClassEngine.applyPartyOutcomeToClasses (L2870·issued case)
  │     → class 层传播 (士绅 / 寒门 / 言官满意度)
  ├ 3·调 _ty3_pushChronicle (L2881·写 GM._chronicle 短文本)
  ├ 4·调 _ty3_enqueueTinyiFollowUp (L2889·入 GM.tinyi.followUpQueue·delay=6 turn)
  └ return seal
```

**v3 加 Slice 8 hook 后**·

```
_ty3_phase6_recordSeal (orig)
  ↓
seal returned·原 v3 effects 全应用 (ClassEngine·chronicle·followUp)
  ↓
_ty3_v15_appendMinorityRebound(seal, ctx, detail)   ← Slice 8 hook 追加
  ├ 1·find minority NPCs
  ├ 2·calc rebound (按 dims·8D)
  ├ 3·扣 loyalty·affinity (单值·v2.3 修)
  ├ 4·conveningPolitics tilt 二次惩罚
  ├ 5·martyr 入队 (_pendingMartyrEvents)
  ├ 6·NpcMemorySystem.remember (emo 恨·intensity 5-8)
  └ 7·decay counters (跨 turn 通过 endturn pipeline·见 tinyi-decay-contract.md)
```

---

## 2·phase7 调用链 (异步·N turn 后)

```
endturn pipeline 跑 → _ty3_phase7_runFollowUpQueue()
  L3496·非 window expose·内部用·遍历 GM.tinyi.followUpQueue
  ↓
取到期 entry (entry.turn + 6 <= GM.turn·tinyiFollowUpDelay)
  ↓
_ty3_phase7_reviewFollowUp(entry)
  L3418
  ├ 1·调 LLM (sc1q-like) 生成 review feedback
  ├ 2·calc 4 outcome (fulfilled / partial / unfulfilled / backfire)
  │     按 progressPercent + feedback 文本
  ├ 3·call applyArchonGrade·update cohesion / prestige / favor
  ├ 4·TM.ClassEngine.applyPartyOutcomeToClasses (L2861 同位置·outcome='reviewed')
  ├ 5·ChronicleTracker upsert (chaoyi_pending → fulfilled / partial / etc.)
  ├ 6·NpcMemorySystem.remember (按 outcome·喜/平/忧/恨)
  └ 7·entry 出队
```

---

## 3·时序对照表 (Slice 8 hook 关键)

| 阶段 | 触发 | v3 effects | Slice 8 hook 看到的 state |
|---|---|---|---|
| phase6_recordSeal 进入 | 玩家 doSeal click | (none) | seal.status / sealedEdict 写之前 |
| 中段·ClassEngine call | recordSeal 内 L2870 | cohesion/prestige/favor 已变 | (hook 在 return 之后跑·OK) |
| recordSeal return·hook 触发 | recordSeal 返 seal | **phase6 effects 全应用** | hook 可读完整 seal + 已变 char 字段 |
| recordSeal return·N turn 内 | (waiting) | phase7 effects 尚未 | hook 不会撞 phase7 已变字段 |
| N=6 turn 后·phase7 触发 | endturn pipeline 跑 | phase7 effects 应用·会再调 ClassEngine | (hook 已完成·跟 phase7 独立) |

**结论 (verified)**·

- ✅ Slice 8 hook 在 `_ty3_phase6_recordSeal` 之后跑·phase6 effects (cohesion/prestige/favor) 已应用·OK
- ✅ phase7 真追责 (N=6 turn 后) 跟 hook 异步分离·hook 不撞 phase7 effects
- ✅ ClassEngine 在 phase6 + phase7 各调一次·hook 不重调·避 2x 惩罚 (Slice 8 v2.1 DoD #8)

---

## 4·hook 时序断言 (Slice 8 实施 verify)

```js
// Slice 8 实施时·hook 内 assert·
async function _ty3_v15_appendMinorityRebound(seal, ctx, detail) {
  // assert·phase6 effects 已应用 (ClassEngine 已调过)
  if (typeof TM !== 'undefined' && TM.ClassEngine && TM.ClassEngine._lastCallSource !== 'tinyi-stage6-issued') {
    // hook 在 phase6 effects 之后跑·ClassEngine._lastCallSource 应是 tinyi-stage6-issued
    console.warn('[Slice 8 hook] timing·phase6 ClassEngine call 未在·可能 hook 装错位置');
  }
  
  // assert·phase7 effects 尚未触发 (followUpQueue entry 应仍 active)
  var matchingFollowUp = (GM.tinyi.followUpQueue || []).find(function(e) {
    return e.topicId === seal.chaoyiTrackId;
  });
  if (!matchingFollowUp) {
    console.warn('[Slice 8 hook] timing·followUp 未入队·phase7 可能已跑过');
  }
  
  // ... 正常 hook logic ...
}
```

Slice 11 smoke 加 5 case·verify hook 时序断言全 pass。

---

## 5·DoD (Slice 0.5)

| 项 | 验证 |
|---|---|
| 1 | `window._ty3_phase6_recordSeal` expose verified·typeof === 'function' |
| 2 | phase6 → 6.5 (recordSeal) → 7 (followUp 入队) 调用链亲读对齐 |
| 3 | Slice 8 hook 装在 recordSeal 之后·phase6 effects 已应用 |
| 4 | phase7 异步·N=6 turn 后才跑·hook 不撞 |
| 5 | ClassEngine 在 phase6 + phase7 各调 1 次·hook 不重调 |

---

## 6·v3 phase 函数 expose 状态 (verified·v2.6 Slice 0.5 后)

| 函数 | 行号 | window expose | 用途 |
|---|---|---|---|
| `_ty3_phase6_open` | L2924 | ✓ L3371 | UI entry |
| `_ty3_phase6_resolveSeal` | L2902 | ✓ L3367 (老) | 异步 wait |
| `_ty3_phase6_doSeal` | L2999 | ✓ L3386 (老) | UI handler |
| **`_ty3_phase6_recordSeal`** | **L2778** | **✓ L3364 (v2.6 新)** | **状态写入·Slice 8 hook 必经** |
| `_ty3_phase7_reviewFollowUp` | L3418 | ✗ (内部用·非 hook 目标) | LLM review feedback |
| `_ty3_phase7_runFollowUpQueue` | L3496 | ✗ (endturn pipeline 调) | 队列消费 |
| `_ty3_enqueueTinyiFollowUp` | L2729 | ✓ L3378 | 入队 |
