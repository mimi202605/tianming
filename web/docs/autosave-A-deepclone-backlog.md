# Backlog·A 方案·拆 autoSave deepClone

**状态**·待启动 (gated on 实测·先观察 1.2.4.3 B+C 后的卡顿是否仍可感知)
**创建**·2026-05-22·跟 1.2.4.3 ship 同期 (B+C 已落地)
**前置**·#125 完成·B+C 通过 hot update 推 1.2.4.3 已生效

---

## 问题域

C 砍掉了 autoSave 链条里的 **IO 部分** (atomic async writeFile) + **重入** + **lite 频率**。
但 `deepClone(GM)` + `deepClone(P)` 仍在主线程同步·

```
deepClone(P)  ≈ 100-500ms 主线程同步
deepClone(GM) ≈ 500-2000ms 主线程同步     ← C 不能动
```

structuredClone 是 native code·**没办法用更快算法**·只能拆 / 错开 / 砍范围。

---

## 触发 A 的判定

C ship 后·**先量化 (30 min·不写代码)**·

1. 让玩家用 1.2.4.3 玩一会儿
2. F12 Performance 录 70 秒
3. 看 60s 那个 tick 的 main thread blocking 实际耗时

| 实测 deepClone | 动作 |
|---|---|
| < 500ms | **不做 A**·已够流畅 |
| 500ms-1500ms | **做 A-1** (选择性 clone) |
| > 1500ms | **做 A-1 + A-2** (选择性 + incremental) |

---

## 候选实现

### A-1·选择性 clone (推荐先做·成本 0.5-1 d)

**思路**·deepClone(GM) 里有些字段根本没必要每 60s 拷一次

- 历史 logs (qijuRecords / chronicleHistory / newsHistory)·**append-only**·上次拷过的没变·新增单独拷
- AI telemetry / debug (failedCalls / costAccum / lastResponse)·崩溃恢复用不上·可 skip
- jishiRecords / memorial 大数组·同理 append-only

**草图**·

```js
function _makeAutoSaveSnapshot(GM){
  return {
    // 必拷·游戏核心·频繁 mutate
    turn: GM.turn,
    date: GM.date,
    chars: deepClone(GM.chars),
    factions: deepClone(GM.factions),
    eraState: deepClone(GM.eraState),
    // ... 核心字段

    // 引用·append-only·上层不会 mutate 老元素
    qijuHistory: GM.qijuHistory,
    chronicleHistory: GM.chronicleHistory,
    jishiRecords: GM.jishiRecords,

    // skipped·崩溃恢复用不上
    // _aiTelemetry: skipped
    // _debugSnapshots: skipped
  };
}
```

**预期**·deepClone 1500ms → 300-600ms·砍 60-80%
**风险**·如错把会 mutate 的字段标"引用"·下次恢复时部分历史被后写覆盖
**关键工作**·审 GM 顶层每个 key·标三色 (必拷 / 引用 / skip)·写 doc

### A-2·incremental clone with frame yield (中等成本 1-1.5 d)

**思路**·deepClone 拆 10 帧·`requestAnimationFrame` 让 UI 喘气

```js
async function deepCloneIncremental(obj){
  var keys = Object.keys(obj);
  var result = {};
  var BATCH = Math.ceil(keys.length / 10);
  for(var i = 0; i < keys.length; i += BATCH){
    var chunk = keys.slice(i, i + BATCH);
    chunk.forEach(k => result[k] = deepClone(obj[k]));
    await new Promise(r => requestAnimationFrame(r));  // yield
  }
  return result;
}
```

**预期**·每帧 150-200ms·**UI 有 10 次 100ms 顿挫但无 5 秒卡**

**关键风险**·**clone 撕裂**·横跨多帧期间 GM 可能被改

| 场景 | 应对 |
|---|---|
| 玩家点诏令·GM.chars 改了 | `GM.__mutateVersion++` 埋点·检测变化 → abort + retry 下次 |
| 中途 endTurn 推演·GM.turn 改了 | 同上 |
| 实在没办法 abort | 接受 mid-state·恢复时少量字段不一致·靠 invariant fix |

### A-3·delta autoSave (不推荐先做·成本 3-5 d + 长期维护)

**思路**·只写"上次 autoSave 之后改的字段"·全 snapshot 5 min 一次

- 需要 GM 改动 tracker (mutation observer) 或 diff 上次 snapshot
- 恢复时·从最近 full snapshot 开始·叠加 N 个 delta

**为何不推荐**·delta 一致性是分布式系统经典难题·漏埋点 / 顺序错 / 半 apply 都损坏存档·memory 里已有类似 incremental 路线塌过的教训。

---

## 推荐执行顺序

1. **量化** (30 min)·F12 录 + 看 deepClone 时间
2. 如确认需做·先 **A-1** (~0.5-1 d)·性价比最高
3. A-1 后再量化·仍卡才上 **A-2** (~1-1.5 d)
4. **绝不动 A-3** 除非 A-1 + A-2 都不够·目前看用不上

---

## 关键约束

- **改动只能动 `_makeAutoSaveSnapshot`·不动 saveToSlot / fullLoadGame**·这两是主存档路径·改一次怕一次
- deepClone fallback 保留 (worker 异常 / requestAnimationFrame 不可用时)
- 加 perf marker·`performance.mark('autosave-clone-start/end')` 让玩家 F12 看得到耗时
- smoke·恢复来回测·atomic snapshot 不丢字段

---

## 关联文件

- web/tm-save-lifecycle.js:1130 — autoSave setInterval (B+C 已改)
- web/tm-utils.js:877 — `deepClone` 定义 (structuredClone + JSON.parse(JSON.stringify) fallback)
- web/tm-save-manager.js:68 — saveToSlot 也用 deepClone·有同样问题但触发频率低·先不动
- main.js:1131-1144 — auto-save handler atomic write (C1 已改·等下个 installer)
