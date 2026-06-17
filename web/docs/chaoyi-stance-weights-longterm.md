# 常朝立场权重剧本化·长期方案 (deferred)

date·2026-05-21·status·**长期存档·不立即实施·待创作者需求催才启动**

source·`web/docs/chaoyi-changchao-improvements-backlog.md` §候选 4·已被 user 推到长期方案。

---

## 问题陈述

`tm-chaoyi-changchao.js:L1528-1594 _cc3_computeStanceFromChar` 内立场打分权重·

```
party_tone     ±0.45     ← 党派
loyalty - 50   ±0.50     ← 数值
integrity - 50 ±0.25     ← 数值
stanceText     ±0.15 / ±0.35
rank/class     ±0.15
random         ±0.12
thresholds     ±0.40 / ±0.30 / 0.12
```

全部**硬编码**在 JS 内·剧本不可调。

`factionMap` 已在 `sc.chaoyi.factionMap` 剧本可配 ✓·但**权重数字本身**编辑器无入口。

## 这违反什么

**标尺 B**·UPGRADE_PLAN.md 的"编辑器是宪法制定者·游戏是历史演绎者"·新机制必须**同时有编辑器面 + 运行时面 + AI 面**。当前权重只有运行时面·缺编辑器面。

## 为什么暂缓

| 理由 | 详 |
|---|---|
| **用户基数小** | 只有剧本创作者会调权重·普通玩家不碰 |
| **当前痛点不强** | 现有 2 套剧本 (天启七年·绍宋) 没出现"气候不合"的反馈·没有 user/玩家在催 |
| **被项 1-3 推后** | 朝议层项 1+2+3 (Tier 1) 落地后·persona-driven 立场已实现·"气候差异"已从 stat 维度部分自然涌现 (8D personality)·权重剧本化是锦上添花 |
| **跟编辑器主线无关** | Phase 8 12-殿编辑器优先级远高·不该跟它抢资源 |

## 真正需要做的触发信号

只有当下列 ≥ 1 个出现·才立即启动·

1. **第 3 套剧本** (如汉末三国 / 北朝 / 民国) 在创作时·创作者明确反馈"现有权重让朝议气候不对"·例如·汉末武将话语权远高于文官·但当前 partyTone 占 0.45 + loyalty 占 0.50·武将系派系话语权被 loyalty 干扰
2. **玩家社区** 反馈不同朝代朝议都太像·觉得"明朝党争和宋朝党争玩起来一样"
3. **mod / workshop 作者**·要求开放权重接口·让他们自己出"金代武勋朝廷" mod

## 启动后的实施方案 (3 步·~1.5-2d + 1-1.5d for UI)

### Step 1·DEFAULT_STANCE_WEIGHTS 常量化 + cfg.stanceWeights 读取 (~0.5d)

```js
// tm-chaoyi-changchao.js 顶部
const DEFAULT_STANCE_WEIGHTS = {
  partyTone:       0.45,
  loyalty:         0.50,
  integrityMercy:  0.25,
  stanceText: {
    clear:         0.15,
    sycophant:     0.35,
  },
  intentMod: {
    punish_kdao:        0.35,
    punish_party:       0.15,
    aggressive_rank2:  -0.15,
    aggressive_kdao:    0.15,
    sympathetic_integrity_div: 200,
    doubt_rank2:       -0.05,
    praise_global:      0.20,
  },
  randomNoise:     0.12,
  thresholds: {
    support:         0.40,
    oppose:         -0.30,
    neutralAbs:      0.12,
  },
};

function _cc3_computeStanceFromChar(name, item, intent) {
  const cfg = _cc3_getScenarioConfig();
  const w = _deepMerge({}, DEFAULT_STANCE_WEIGHTS, cfg.stanceWeights || {});
  // 全文 hardcoded 数字换 w.X
  // 例·score += w.partyTone (而非 0.45)
  //    score += (loyalty - 50) / 100 * (w.loyalty / 0.5)  // 保持原 ±0.5 范围语义
  // ...
}
```

需要确保权重替换**不改变默认行为** — 旧测试应仍 pass。

### Step 2·剧本 schema 加字段 + smoke (~0.5d)

```json
// scenarios/<name>.json
{
  "chaoyi": {
    "factionMap": { ... },
    "stanceWeights": {
      "partyTone": 0.30,
      "loyalty": 0.65,
      "intentMod": { "punish_kdao": 0.50 }
    }
  }
}
```

加 smoke·`smoke-chaoyi-stance-weights.js`·

- default 剧本 + scenario.stanceWeights 缺失 → 用 DEFAULT
- 三种 preset 剧本 (北宋/明末/金代) → stance 倾向不同
- partial override (只给 partyTone) → 其他维度走 default·deepMerge 正确

### Step 3·编辑器"朝议气候"面板 (~1-1.5d·可选·按需做)

UI·

```
朝议气候配置 [preset: 北宋文官 / 明末党争 / 金代武勋 / 自定义]

[==slider==] 党派倾向权重    partyTone     0.45
[==slider==] 忠诚倾向权重    loyalty       0.50
[==slider==] 清廉共情权重    integrityMercy 0.25
[==slider==] 清流加成        stanceText.clear 0.15
[==slider==] 附阉加成        stanceText.sycophant 0.35
[==slider==] 随机扰动        randomNoise   0.12

[==slider==] support 阈值    0.40
[==slider==] oppose 阈值    -0.30
[==slider==] neutral 区间    ±0.12

[预览]  3 个 sample NPC × 当前权重 = 立场分布饼图
```

3 个 preset 按钮·

```
[北宋文官]  partyTone 0.30  loyalty 0.65  integrityMercy 0.35  // 重忠诚轻党争·文官话语权高
[明末党争]  partyTone 0.70  loyalty 0.30  integrityMercy 0.15  // 党争压倒一切
[金代武勋]  partyTone 0.20  loyalty 0.20  integrityMercy 0.05  randomNoise 0.30  // 武勋时代规则崩塌·随机性高
[南宋偏安]  partyTone 0.45  loyalty 0.40  integrityMercy 0.30  // 平衡·主战主和拉锯
```

### Step 4·测试与校准 (~0.5d)

- 跑 4 个 preset × 同一剧本 NPC pool·检查立场分布
- 验·相同 NPC 在不同 preset 下 stance 分布合理变化
- 极端 preset 不崩溃 (e.g., randomNoise 1.0 → stance 应近全随机·测可 stress)

## Step 1+2 与 Step 3 的解耦

Step 1+2 是**脚本层暴露**·让 advanced users (mod 作者) 手动写 JSON 改权重·**这一步价值最高**·因为创作者社区只要 Step 1+2 就能用。

Step 3 是**编辑器 UI**·让普通创作者也能调·价值偏向 UX·**可独立后做**·不阻塞核心功能。

启动时·**先做 Step 1+2 (~1d) ship**·观察是否真有人用 (workshop 数据 / forum 反馈)·**有人用再做 Step 3**。

## 总工作量

| Step | 工作量 | 阶段产物 |
|---|---|---|
| 1+2 | ~1d | 脚本可写 stanceWeights·smoke 守门 |
| 3 | ~1-1.5d | 编辑器 UI + 4 preset |
| 4 | ~0.5d | 测试 + 校准 |
| 总 | ~2.5-3d | 完整闭环 |

## 不做的边界 (即便启动后)

- **不做 server-side 权重热更** — 权重是剧本配置·跟剧本绑·不该剧本不变权重热更
- **不做权重 A/B 实验** — 没那么多用户·成本远大于收益
- **不做权重 AI 推荐** — "AI 根据剧本朝代自动选权重"·过工程·creator 自己挑 preset 就行

## 触发后回查

启动这个长期方案时·先回读·

- `web/docs/chaoyi-changchao-improvements-backlog.md` 看项 1-3 落地后实际表现
- `tm-chaoyi-changchao.js` 看 `_cc3_computeStanceFromChar` 是否在期间被项 2 大改 (8D personality 接入后·DEFAULT_STANCE_WEIGHTS 需扩 8D 维度的默认权重)
- `scenarios/<新剧本>.json` 看新剧本是否已经 hack 进了 stanceWeights·有的话先对齐

---

**结论**·已存档·不立即做。项 1-3 完成后·若仍有"朝议气候不对"反馈·再启动。
