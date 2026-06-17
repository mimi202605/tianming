# Guoku LAYERED 5 层链·R8 行为快照 smoke prep (Claude·R7 idle 时间·R8 启动前 prep)

date·2026-05-04 · status·**non-destructive prep·R8 启动前 spec 铺路·待 Codex R7 ai-infer Region 1 完成 + 互审过后·正式启 R8 写 smoke**

## 0·目的

**R8 任务 (按 schedule)**·Claude 写 guoku LAYERED 5 层链行为快照 smoke 5-8 个·**为 R9 LAYERED merge 提供回归 baseline**·

**R9 merge 策略 (R116c 已记)**·以 p6.tick 为 engine.tick 基础·追加 p4/p5 APPEND·保 p2 computeTaxFlow

**本 prep 的产出**·smoke spec + 待覆盖 8 个行为·R8 启时直接照写

## 1·LAYERED 5 层链拓扑 (R19/R116c verified)

```
engine          tick v1 / computeTaxFlow / Sources / Expenses / yearlySettle / initFromDynasty
  ↓
p2 (P0 补完)    OVERRIDE computeTaxFlow (民心+皇权+皇威+赋税反馈)
                OVERRIDE tick v2
                APPEND applyTyrantFiscalDistortion · applyTaxMinxinFeedback ·
                       updateRegionalAccounts · updateGrainClothFlow · getRegions
  ↓
p4 (P1 补完)    OVERRIDE Sources (scenario 禁用税 wrap)
                OVERRIDE initFromDynasty
                OVERRIDE tick v3
                OVERRIDE Expenses.junxiang (物价浮动)
                OVERRIDE yearlySettle
                APPEND FISCAL_REFORMS · canEnactReform · enactReform · tickReforms ·
                       updatePriceIndex · aiParseFiscalDecree
  ↓
p5 (A 级补完)   OVERRIDE tick v4
                APPEND LOAN_SOURCES · takeLoanBySource · calcCaoyunLossRate ·
                       aiFiscalAdvisor · isAIAvailable
  ↓
p6 (终版)       OVERRIDE tick v5 (终)
                APPEND calcCustomTaxes
```

## 2·待覆盖 8 个行为快照 smoke (spec)

| # | smoke 名 | 覆盖层 | 输入 fixture | 期望 snapshot |
|---|---|---|---|---|
| 1 | **smoke-guoku-compute-tax-flow** | p2 computeTaxFlow OVERRIDE | annualNominal=1200000·minxin.trueIndex=80·huangquan.index=70·huangwei.index=50 | base=1200000·compliance=0.86·huangquanMult=1.0·actualTaxRate / actualReceived 数值 |
| 2 | **smoke-guoku-compute-tax-flow-tyrant** | p2 OVERRIDE + 暴君段 | huangwei.index=85·tyrant=true | actualReceived 含 phantom 增量·真实 vs 账面差距 |
| 3 | **smoke-guoku-tick-full-pass** | engine + p2/p4/p5/p6 全链 tick | scenario fixture + 1 turn settle | balance / sources (8 类) / expenses (8 类) / byRegion / ledgers.grain·cloth·money 全 snapshot |
| 4 | **smoke-guoku-sources-scenario-disabled** | p4 Sources wrap | scenarioOverride.taxEnabled = {tianfu:true·dingshui:false} | Sources.dingshui 返 0·tianfu 正常 |
| 5 | **smoke-guoku-yearly-settle** | p4 yearlySettle OVERRIDE | 12 turn settle 后调 yearlySettle | history.yearly[-1] snapshot·archive 字段完整 |
| 6 | **smoke-guoku-init-from-dynasty** | p4 initFromDynasty OVERRIDE | dynasty='明'·phase='天启'·scenarioOverride={...} | balance·monthlyIncome·monthlyExpense·sources/expenses 初始值 |
| 7 | **smoke-guoku-enact-reform** | p4 APPEND·enactReform | enactReform('两税法') | FISCAL_REFORMS active 状态·canEnactReform·tickReforms 持续效果 |
| 8 | **smoke-guoku-loan-and-bankruptcy** | p5 APPEND + engine bankruptcy | balance=-50000·takeLoanBySource('JIN_PIAO_HAO'·100000) | bankruptcy.active·loan.amount·monthsLeft·后续 tick 利息扣 |

(可选第 9 smoke: **smoke-guoku-custom-taxes** for p6 APPEND·calcCustomTaxes·若时间充裕加)

## 3·smoke 实现策略

按现 smoke 文件 pattern (web/scripts/smoke-*.js)·

```js
const path = require('path');
const fs = require('fs');
require('./_smoke-bootstrap');  // 加载 GM·tm-utils·tm-guoku-engine·p2/p4/p5/p6

// fixture
GM.guoku = {};
GuokuEngine.ensureModel();
// ... apply scenario state ...

// act
const result = GuokuEngine.computeTaxFlow(1200000);

// snapshot assert
assert.equal(result.actualTaxRate.toFixed(2), '0.86');
assert.equal(result.actualReceived, ...);
// ... etc.
```

**核心 assertion 类型**·
- 字段存在 (assert.ok(g.balance !== undefined))
- 数值精度 (assert.equal(.toFixed(2)·...))
- 数组长度 (assert.equal(g.history.yearly.length·...))
- 状态机 (assert.equal(g.bankruptcy.active·true))

## 4·Codex 那边 (corruption LAYERED) 平行参考

按 R12·corruption OVERRIDE chain 同样有 p2/p4 层·smoke 思路同·

| corruption smoke | 覆盖 |
|---|---|
| smoke-corruption-tick-full-pass | engine + p2/p4 全链 tick |
| smoke-corruption-detection-event | 弹劾/察查触发 |
| smoke-corruption-impact-on-treasury | 实征率扣 (与 guoku tick 联动) |
| smoke-corruption-purge | 抄家 + holders 清 |
| ... etc 5-8 个 |

## 5·R8 启动条件

- [x] R7 own done (tm-endturn-province carve)
- [ ] Codex R7 done (ai-infer Region 1 split)
- [ ] R7 互审 PASS
- [ ] schedule confirm·R8 启

R8 启时·按 §2 spec 直接写 smoke·~5-8h·**预期产出**·
- 8 个新 smoke 文件 (web/scripts/smoke-guoku-*.js)
- web/scripts/verify-all.js 入新 smoke
- guoku 行为 baseline 锁定·**R9 merge 安全网就位**

## 6·R9 merge 预案 (按 R116c)

R8 smoke 全过后·R9 merge·

1. **以 p6.tick (终版) 为 engine.tick** — 复制 p6.tick body → engine.tick·删 p6.tick
2. **追加 p4/p5 APPEND 到 engine** — FISCAL_REFORMS·LOAN_SOURCES·etc. 直接挪入
3. **保 p2 computeTaxFlow** — 这是 OVERRIDE 关键·挪入 engine·删 p2
4. **逐文件 delete** p2/p4/p5/p6
5. **每 step 跑 R8 8 smoke**·确认 zero regression
6. **index.html 删 4 script tag**

R9 完成后·**guoku cluster 5 文件 → 1 文件 (-4)**·域内自包含·

## 7·R8 own·**完成报告 (2026-05-04)**

R7 close 后立即启 R8·**8 个 smoke 全过·121 assertions**·

| smoke | assertions | 覆盖层 |
|---|---|---|
| smoke-guoku-compute-tax-flow | 17 | p2 OVERRIDE computeTaxFlow (民心+皇权·6 段) |
| smoke-guoku-compute-tax-flow-tyrant | 4 | p2 applyTyrantFiscalDistortion + applyTaxMinxinFeedback |
| smoke-guoku-tick-full-pass | 38 | engine + p2/p4/p5/p6 全链 tick (5 层 OVERRIDE) |
| smoke-guoku-sources-scenario-disabled | 12 | p4 OVERRIDE Sources (禁用税·multiplier) |
| smoke-guoku-yearly-settle | 6 | p4 OVERRIDE yearlySettle (history.yearly archive) |
| smoke-guoku-init-from-dynasty | 11 | p4 OVERRIDE initFromDynasty (12 朝代×4 phase + 单位 override) |
| smoke-guoku-enact-reform | 15 | p4 APPEND·4 大改革 (twoTax/fieldEquity/oneWhip/tanDingRuMu) |
| smoke-guoku-loan-and-bankruptcy | 18 | p5 APPEND·3 借贷源 + 副作用 + bankruptcy 联动 |
| **总** | **121** | **5 层链全覆盖** |

verify-all 总·**27/27 PASS** (从 19 → 27·+8)·39.0s·zero regression·

**R9 merge baseline 锁定**·任何 merge 后行为变化都会被这 121 assertions 测出·

— end of guoku-layered-smoke-prep.md
