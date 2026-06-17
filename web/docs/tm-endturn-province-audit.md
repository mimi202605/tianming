# tm-endturn-province.js audit (Phase 3·Claude own·R7)

date·2026-05-04 · status·**audit done + R7 destructive (qiaozhi carve out + tail dead 删)**

## 0·概览

| 项 | 值 |
|---|---|
| 文件 | tm-endturn-province.js |
| 原行数 | 2,488 |
| R7 后行数 | 2,229 (- 259·-10.4%) |
| 性质 | top-level functions (非 IIFE wrap·与 tm-feudal·tm-economy·tm-hongyan-office 同 pattern) |
| top-level functions / vars | 50+ (`_pe*` UI 35+·initProvinceEconomy·updateProvinceEconomy·executeProvincePolicy·appoint*Governor·openDivisionDetail·openProvinceEconomy·`qiaozhi*`) |
| 局部 IIFE | 0 |
| R130/R161 历史 | 从 tm-endturn.js 拆分而来 |

## 1·实际 4 region (按 grep + Read 探出)

| Region | 行 | 行数 | 内容 | 域 | R7 处理 |
|---|---|---|---|---|---|
| **A·省级经济 runtime** | L1-449 | 432 | initProvinceEconomy·updateProvinceEconomy·executeProvincePolicy·appointProvinceGovernor·doAppointGovernor | core 省级 econ | **保留** |
| **B·province expand UI panel renderer** | L450-2229 | 1,780 | 35+ `_pe*` helper·`_aggregateDivisionStats`·`_renderDivisionNode`·12+ `_peRender*`·`openDivisionDetail`·`openProvinceEconomy`·`formatNumberComma` | UI panel renderer | **保留** (域内紧耦合·待 R8/R9 单切) |
| **C·侨置 qiaozhi** | L2230-2479 | 250 | `openQiaozhiPanel`·`doQiaozhi`·`restoreQiaozhiDivision` (3 fns·独立 feature) | 侨置 (P3 feature) | **R7 carve → tm-endturn-qiaozhi.js** |
| **D·tail dead** | L2480-2488 | 9 | `// AI 深度预热` section header·**无函数体·孤儿** | dead | **R7 删** |

## 2·R7 destructive 详细

### 2.1 carve out qiaozhi → tm-endturn-qiaozhi.js

| 原 L | 内容 | 行数 | 去向 |
|---|---|---|---|
| L2230-2479 | 侨置 section header + 3 fns (openQiaozhiPanel·doQiaozhi·restoreQiaozhiDivision) | 250 | **新建 tm-endturn-qiaozhi.js** (~280 行·含新 head note 12 字段 + 3 fns) |
| L2480-2488 | dead boilerplate (AI 深度预热 section header·无函数体·孤儿) | 9 | **删** |

**理由**·
- **侨置是独立 feature** — P3 期加入·处理"领土丢失/收复·侨置行政区生命周期"
- **3 fns 域内自洽** — 数据结构 GM._lostTerritories·_isQiaozhi·_qiaozhiType 是 qiaozhi 专用
- **跨 ref 仅 1 文件** (tm-memorials.js)·**通 global scope OK**
- **tail dead** — 孤儿 section header (8 行)·应删·不留垃圾

### 2.2 net 文件变化

- 1 文件 → 2 文件 (+1)
- tm-endturn-province.js·2488 → 2229 (-259)
- tm-endturn-qiaozhi.js·新 ~280 行
- 域分清晰提升·侨置独立成模

## 3·**R8/R9 后续 propose** (Region B 单切)

Region B (1780 行 UI panel renderer) 是 tm-endturn-province.js 中最大段·建议单 round 处理·

**plan B (next slice·R8 或 R9)**·
- backup
- extract L450-2229 (1780 行·35+ `_pe*` helper + `openDivisionDetail` + panel renderer) → `tm-endturn-province-ui.js` (~1850 行)
- 留 tm-endturn-province.js·L1-449 (432 行·core econ runtime) + tail registers
- net·1 文件 → 2 文件·UI 与 runtime 解耦

**risk**·
- `_pe*` helper 大族·跨 fn ref 多·extract 须保完整 cluster
- `openDivisionDetail` 调 `_peBuiltContent` 调 `_peRender*` 系列·**全在 Region B 内·extract 无 break**

**ETA**·5-8h (mid-high risk·UI 渲染域)·待 R8/R9

## 4·与 endturn cluster 的关系

按 architecture-map.md ·

```
tm-endturn-core.js (943) | 入口/管道
tm-endturn-helpers.js (1516) | helpers
tm-endturn-render.js (2099) | 结果展示
tm-endturn-province.js (2488 → 2229) | 省级·R7 拆 qiaozhi
tm-endturn-edict.js (502) | 诏令效果
tm-endturn-ai-infer.js (12591) | AI 推演 (Codex own·R7 平行 split)
```

R7 后·**endturn cluster·6 文件 → 7 文件 (+qiaozhi)**·**Codex 那边 ai-infer Region 1 split 后再加 1**·

## 5·verify (R7 完成·19/19 PASS·zero regression)

| 项 | result |
|---|---|
| **verify-all 总** | **19/19 PASS·34.4s** |
| syntax-check | 226/226 ✓ |
| encoding-check | 274 files clean·0 mojibake |
| ref-check | 所有引用有效 |
| find-orphans | 0 真孤岛·tm-endturn-qiaozhi.js 入加载链 |
| official-scenario-smoke | PASS (admin 行政区数据流·关键 path) |
| engine-phase0 | 21 PASS |
| office-dynastification | 33 PASS |
| military-systems | 83 PASS |
| influence-groups | 91 PASS |
| class-engine | 78 PASS |
| class-party-bidi | 34 PASS |
| letter-full | 15 PASS |
| letter-intercept | 29 PASS |
| tinyi-fix | 18 PASS |
| tinyi-impeach | 149 PASS |
| boot-smoke | 180/180 (含新 tm-endturn-qiaozhi) |
| render-smoke | 13 pass / 4 warn / 0 fail |
| smoke | 212/0 |
| cc3-smoke | 56/0 |
| node -c tm-endturn-qiaozhi.js | PASS |
| node -c tm-endturn-province.js (修剪后) | PASS |

## 6·风险

| 风险 | 应对 |
|---|---|
| qiaozhi 跨 ref (tm-memorials) 失效 | extract 后通 global scope·验跑 official-scenario-smoke + 主 smoke |
| Region B 后续单切 risky | R8/R9 单 round 处理·5-8h·有 audit 铺路 |
| dead L2480-2488 删·影响 unknown | grep 确认无 callers·删 |

## 7·效果总结

- **tm-endturn-province.js 2488 → 2229 (-10.4%)**
- **+tm-endturn-qiaozhi.js (~280 行·独立 feature 解耦)**
- **删 dead 9 行 (孤儿 section header)**
- **域分清晰·侨置独立成模·便于后续维护**
- **铺路 R8/R9·Region B UI panel 单切**

— end of tm-endturn-province-audit.md (R7 完成时 update verify 节)
