# 廷议·三轮 audit·Slice 6 / 8.5 / 9

**作者**·Claude Opus 4.7  **日期**·2026-05-23
**触发**·user "继续三轮"·v2.3 写完后追加 audit·Slice 6 (25 rules + 14 trait + tone) / 8.5 (UI 5 项 + 10 ceremony + 7+1 hotkey) / 9 (cumulative + emperor cue)
**方法**·亲读 v2.3 doc + grep v3 / 常朝 runtime helper 与 ceremony 存在性

---

## TL;DR·1 hard + 2 medium + 3 low

| # | 严重 | 问题 | slice |
|---|---|---|---|
| 1 | **hard** | Slice 8.5 §5.2.4 10 ceremony 动画全新建·v3 0 hit·DoD #4 写 "5" 跟表 "10" 不对应·**1.8d 低估** | 8.5 |
| 2 | medium | Slice 9 helper name 漂·doc `_ty3_*` 常朝 runtime `_cc3_*` (_cc3_cumulativeHint / _cc3_emperorCueHint)·复用方式未明 | 9 |
| 3 | medium | Slice 6 §5.5.5 tone modulation 太薄·5 行 mapping·没说 how to inject (prompt / UI / mode 内置)·DoD #4 实施无方向 | 6 |
| 4 | low | §5.2.2 mode 视觉表 L1629 还有 `cite` (Slice 5 已改 augment)·stale | 8.5 |
| 5 | low | §5.2.3 hotkey 表标题 "7+1"·实际 10 项 (Enter/空格/Esc/T/1-9/[]/M/Ctrl+Enter/H/V) | 8.5 |
| 6 | low | §5.2.1 UI 对照表"廷推 9 候选清单"·v3 实际 byParty 全清单·非固定 9 | 8.5 |

---

## 1·hard 详

### 1.1 (hard)·Slice 8.5 10 ceremony 动画全新建·DoD 数字不一致

**事实** (grep verified)·

```
grep "ty3-cer-|ceremony|鸣鞭|gold-screen" web/tm-tinyi-v3.js → 0 hit
```

§5.2.4 列 10 ceremony·CSS class · `.ty3-cer-openrtn` / `.ty3-cer-archon` / `.ty3-cer-draft` / `.ty3-cer-seal` / `.ty3-cer-pursue` / `.ty3-cer-flog` / `.ty3-cer-strip` / `.ty3-cer-dismiss` / `.ty3-cer-revoke` / `.ty3-cer-reopen`·全新建 100%。

**vs Slice 8.5 DoD**·

```
4. 5 ceremony 动画播·CSS 时长按 §5.2.4 表
```

数字矛盾·5 vs 10。doc 自身不一致。

**工时低估**·按 10 CSS animation (~0.15-0.2d each) + JS 触发 hook (10 ceremony 各自 entry point) + 5 ceremony 跟 Slice 7.5 6 动作绑定·

| 项 | 工时 |
|---|---|
| 10 CSS animation (鸣鞭 8s / 钦定 3s / 草诏 2s / 用印 5s / 追责 4s / 廷杖 5s / 削籍 4s / 摘除 2s / 革职 6s / 更议 3s) | ~1.5d |
| JS 触发 hook (10 ceremony 各自从 v3 phase 入口呼叫) | ~0.5d |
| 三班双轨切换 (V hotkey) | ~0.3d |
| 立场板放大版 (T key·N×9 矩阵) | ~0.4d |
| confront 红线 + 10 mode 视觉 | ~0.3d |
| 用印 2 sub-flow UI polish (v3 已有 modal·美化) | ~0.2d |
| 召集 preset (localStorage) | ~0.3d |
| 7+1 hotkey (含 V·跟 Slice 4.5 footer 集成) | ~0.2d |
| smoke + tune | ~0.3d |
| **小计** | **~4.0d** (vs doc 1.8d) |

**修法**·

**方案 A**·doc DoD #4 改成 "10 ceremony 动画播 (匹配 §5.2.4 表全 10 项)"·工时 1.8d → **3.5-4d**·诚实反映
**方案 B**·删 §5.2.4 表里非核心 5 项 (廷杖 / 削籍 / 摘除 / 革职 / 更议·这 5 个跟 Slice 7.5 重叠·可融到 Slice 7.5)·留核心 5 (鸣鞭 / 钦定 / 草诏 / 用印 / 追责)·工时 1.8d 准
**方案 C**·拆 Slice 8.5 → 8.5a (核心 5 ceremony + 3 UI·1.5d) + 8.5b (Slice 7.5 廷杖等 5 ceremony 联合·0.5d 折到 Slice 7.5)

**推荐**·**B**·5 核心 ceremony 留 Slice 8.5·5 Slice 7.5 联动 ceremony 挪到 Slice 7.5·§5.2.4 表分两段·Slice 7.5 工时 0.5d → **0.8d** (+0.3d for 5 7.5-ceremony)·Slice 8.5 工时不变 1.8d。

---

## 2·medium 详

### 2.1 (medium)·Slice 9 helper name 漂

**事实** (grep verified)·

```
tm-chaoyi-changchao.js L2390  function _cc3_cumulativeHint(state, gmCh, item) { ... }
tm-chaoyi-changchao.js L2419  function _cc3_emperorCueHint(item, state) { ... }
tm-chaoyi-changchao.js L2462  nextItem._lastEmperorIntent = { ... }
```

**Slice 9 doc 写**·

```
- _ty3_cumulativeHint·3+ 同党附议时·后续 NPC 一字千钧 (shortReply)
- _ty3_emperorCueHint·玩家话语 → intent → 写 item._lastEmperorIntent·后续 NPC stance 偏移 +20%
```

**问题**·doc 用 `_ty3_*` 前缀·runtime 是 `_cc3_*`·实施时·

- (A) 直接调 `_cc3_cumulativeHint` (跨文件依赖·tm-chaoyi-changchao.js 被 v3 引)
- (B) alias·`window._ty3_cumulativeHint = _cc3_cumulativeHint`·v3 用 alias
- (C) 抄一份到 v3 (复制粘贴)

**修法**·doc 改·

```
**v2.4 修**·复用常朝 `_cc3_cumulativeHint` (tm-chaoyi-changchao.js L2390) + `_cc3_emperorCueHint` (L2419)·

方案 A·直接调 `_cc3_cumulativeHint`·跨文件依赖·风险·若常朝改 helper 签名·廷议失效
方案 B·alias·`window._ty3_cumulativeHint = _cc3_cumulativeHint`·v3 用 alias·decoupling 好
推荐·B·Slice 0.5 已有 expose paradigm·一并 alias

`item._lastEmperorIntent` 字段共享·grep verified L2462 写入·无需新建
```

工时不变 0.5d·只 doc 改。

### 2.2 (medium)·Slice 6 tone modulation spec 太薄

**事实** (亲读 §5.5.5)·

```
5 行 mapping·
  阁臣  庄重 (官式书面)
  言官  激切 (短促·感叹号多)
  武将  直白 (口语化)
  勋戚  谨慎 (回避politically charged)
  外戚  柔曲 (避嫌)
```

**问题**·tone modulation 是什么·

- (A) prompt 段·`prompt += '\n语气·' + tone[ch.class] + '...'` (LLM 自己学)
- (B) UI text styling·气泡字体/颜色按 class 变 (跟 §5.2.2 mode 视觉冲突)
- (C) mode template 内置·6/4 mode × 5 class = 30 个变体 (爆炸)

doc DoD #4 写"tone modulation"·实施者按哪种?

**修法**·§5.5.5 补·

```js
// tone modulation 是 prompt 段·非 UI / 非 mode 内置
function _ty3_buildToneHint(ch) {
  const cls = ch.class || _ty3_classOf(ch);
  const tone = {
    'geechen':  '庄重·官式书面·四字格 / 排比',
    'kdao':     '激切·短促·感叹号多·"伏望陛下察焉"',
    'wujiang':  '直白·口语化·避典故',
    'xunqi':    '谨慎·回避 politically charged·"臣不敢妄议"',
    'waixi':    '柔曲·避嫌·"臣外戚·所言难免有亲"'
  }[cls];
  return tone ? '\n  语气提示·' + tone : '';
}
// 注入到 _ty2_genOneSpeech prompt 中·Section A 之后·~30 token / NPC
```

DoD #4 改·"tone modulation prompt 段注入·5 class × 1 sample 测·阁臣 prompt 含'庄重'·言官 prompt 含'激切'·grep prompt log verify"。

---

## 3·low 详

### 3.1 §5.2.2 mode 视觉表 cite stale

L1629·`| cite | 气泡左侧 📊 数据 icon | celadon |`·应改 augment (跟 Slice 5 一致)。1 行 edit。

### 3.2 §5.2.3 hotkey 表标题 7+1 vs 10 项

caption "7 + 1 廷议独有快捷键"·表实 10 项 (含 Enter / 空格 / Esc / 1-9 / Ctrl+Enter)。`V` 是 "+1" 应指 v1.5 加的 V·其他 9 是 v1.4。但 caption 应明确算法·或改 "9 + 1 = 10"·或改 "1 hotkey 新加 (V)·9 已有"。

### 3.3 §5.2.1 UI 对照表廷推 9 候选

doc 写 "9 候选清单 modal"·v3 实际 `_ty3_phase3_buildCandidates` 按党分组无固定 9·改"按党分组候选清单 (无固定数)"。

---

## 4·建议的 v2.3 → v2.4 调整

| # | 改动 | 工时影响 |
|---|---|---|
| 1 | Slice 8.5 ceremony 表分两段·5 核心留 8.5·5 联动挪 Slice 7.5·doc 改 | Slice 7.5 +0.3d (0.5 → 0.8d) |
| 2 | Slice 9 doc 改·`_ty3_*` → `_cc3_*` alias 方式·Slice 0.5 一并 expose | 0·doc 改 |
| 3 | Slice 6 §5.5.5 tone modulation 补 prompt injection 方式 | 0·doc 改 |
| 4 | §5.2.2 mode 视觉表 cite → augment | 0·doc 改 |
| 5 | §5.2.3 hotkey caption "7+1" → "9+1" or "1 新加 + 9 已有" | 0·doc 改 |
| 6 | §5.2.1 廷推 "9 候选" → "按党分组" | 0·doc 改 |
| **合计** | | **+0.3d** |

**v2.3 总工时·22.1-25.1d → v2.4·22.4-25.4d** (微涨·更准)

---

## 5·DoD 影响

| Slice | v2.3 DoD | v2.4 改后 |
|---|---|---|
| Slice 6 | 4 项 | 4 项·#4 tone modulation 加 "prompt 段·5 class × 1 sample 测·grep prompt log verify" |
| Slice 8.5 | 7 项 | 7 项·#4 "5 ceremony" → "5 核心 ceremony (鸣鞭/钦定/草诏/用印/追责)"·其余 5 ceremony 挪 Slice 7.5 |
| Slice 7.5 | 1 行 DoD | 2 项·"6 动作触发 + 5 ceremony 动画 (廷杖/削籍/摘除/革职/更议)" |
| Slice 9 | 1 行 DoD | 1 行·改 "复用 `_cc3_cumulativeHint` (alias 到 _ty3_*)" |

---

## 6·下一步

| | 选项 | 描述 |
|---|---|---|
| **A** | **批准·写 v2.4** | 6 处修订并入 v2.4·小改·主要 doc 措辞 + ceremony 分配·1 处工时调 (+0.3d Slice 7.5) |
| **B** | 不再 audit·按 v2.3 开工 | hard 只 1 处 + 5 处 doc 漂·implementation 时容易撞 |
| **C** | 进四轮·Slice 0 / 0.5 / 1 / 2 / 11 (5 sprint setup/收口 slice) | 看是否还有隐坑 |
