# Phase 8·Codex prompt·**batch B v3·21 篆刻 rail icons**

date·2026-05-05·status·**🛑 PAUSED·待 `phase8-codex-prompt-batch-screen-overall.md` 5 张全 ACK 后再启**·owner·Claude (8-α prompt phase)

---

## ⚠️ PAUSE 原因 (2026-05-05·post B v3 trial 评估)

B v3 trial 3 张 (seal-01-shi/02-dang/03-jie) 评估·

- ✅ 材质·真石材·真朱泥·raster·完美 (vs B v2 SVG fiasco)
- ❌ 字体·**楷体·非篆体**·最大问题
- ❌ **整屏 baseline 缺**·细节生在没整体氛围 lock 时·必猜·必漂

**user 决·先整屏 mock·后细节**·见 `phase8-codex-prompt-batch-screen-overall.md`·5 张 #G/drawer/chaoyi/launch/turn-modal·拆 2 波·

**B v3 启动条件**·

1. screen-overall 波 1+2 全 5 张 user ACK
2. 篆刻字体类型 lock (从 mock 上印章看·汉印 / 九叠 / 小篆 哪种)
3. 主题色 / 朱泥湿度 baseline lock
4. 然后·B v3 按 mock baseline 重启 21 字

**当前状态**·`-trial` 3 张 (`web/assets/ui/phase8/icons/rail/seal-0X-XX-trial.png`)·留 dir·**整屏 ACK 后看是否能继续用·或重生**·

---

依据·`phase8-codex-prompt-master.md` (master brief·必先读) + `phase8-alpha-deepdive.md` (35 finding) + B v2 SVG fiasco reset letter·

**本 batch 不重述 master**·只列 batch-specific spec·

---

## §1·batch 概述

### 1.1 内容

21 个汉字·**每字一张独立 raster PNG**·篆刻印章风格·

| rail | 字数 | 字 list (按 rail 顺序) |
|---|---|---|
| 左 rail (12) | 12 | 势 党 阶 军 政 科 物 宫 图 题 声 帮 |
| 右 rail (9) | 9 | 朕 辰 臣 缘 议 志 帑 讯 闻 |

### 1.2 规格 (master §3 引)

```
format·     .png (alpha 必)
1x·         132×132
2x·         264×264 (后期补·先 1x)
边距·       8-12px alpha 透明·防裁切
构图·       正方·主体 (字) 居中·上视角
```

### 1.3 状态合成 (master §5·option B)

**Codex 只生 idle base**·active / hover / disabled 状态·**Claude CSS filter 合成**·

```css
.gs-rail-btn.idle      { filter: none; }
.gs-rail-btn:hover     { filter: brightness(1.1); }
.gs-rail-btn.active    { filter: brightness(1.2) saturate(1.4); }
.gs-rail-btn.disabled  { filter: grayscale(0.7) opacity(0.5); }
```

**绝对禁止 Codex 生 4 状态**·只 21 张·

### 1.4 命名 (master §4)

```
web/assets/ui/phase8/icons/rail/seal-XX-{pinyin}.png
```

XX = 01..21 (按 list 顺序)·pinyin = 单字拼音 (无声调)·

| # | 字 | pinyin | 文件名 |
|---|---|---|---|
| 01 | 势 | shi | `seal-01-shi.png` |
| 02 | 党 | dang | `seal-02-dang.png` |
| 03 | 阶 | jie | `seal-03-jie.png` |
| 04 | 军 | jun | `seal-04-jun.png` |
| 05 | 政 | zheng | `seal-05-zheng.png` |
| 06 | 科 | ke | `seal-06-ke.png` |
| 07 | 物 | wu | `seal-07-wu.png` |
| 08 | 宫 | gong | `seal-08-gong.png` |
| 09 | 图 | tu | `seal-09-tu.png` |
| 10 | 题 | ti | `seal-10-ti.png` |
| 11 | 声 | sheng | `seal-11-sheng.png` |
| 12 | 帮 | bang | `seal-12-bang.png` |
| 13 | 朕 | zhen | `seal-13-zhen.png` |
| 14 | 辰 | chen | `seal-14-chen.png` |
| 15 | 臣 | chen2 | `seal-15-chen2.png` |
| 16 | 缘 | yuan | `seal-16-yuan.png` |
| 17 | 议 | yi | `seal-17-yi.png` |
| 18 | 志 | zhi | `seal-18-zhi.png` |
| 19 | 帑 | tang | `seal-19-tang.png` |
| 20 | 讯 | xun | `seal-20-xun.png` |
| 21 | 闻 | wen | `seal-21-wen.png` |

**注·15 "臣" 与 14 "辰" 拼音冲突 (chen)**·15 加后缀 `chen2` 区分·

---

## §2·prompt base (per-char 通用模板)

### 2.1 模板

```
中国古代篆刻印章·寿山石质感·朱泥湿润印面·
篆体汉字"<X>"·篆刻字体类型·[汉印篆 / 九叠篆 / 小篆·任 1]·
方寸印·田字格 OR 无栏·
square 132×132·alpha 透明·8-12px 边距·正方·上视角·
真石材肌理 (寿山石 / 田黄 / 鸡血石 任选)·朱泥红润·
风格·中国古代篆刻·非装饰图形·非 logo·非 generic Asian·
NO Latin·NO abstract shape·NO 3D render·NO neon·NO gradient orb·
NO red-gold luxury·NO dragon·NO fantasy·NO Western flourish·
exactly 1 Chinese character "<X>"·非伪字·非简化·非异体·
若字不准 (生成偏旁错 / 笔画漏 / 伪字) → 重生·禁退回 SVG·禁退回 CSS·
若 4 状态 (active/hover/idle/disabled) 同时生 → 错·只生 idle base·状态由 CSS filter 落地·
```

`<X>` = 当前字 (势 / 党 / ...)·

### 2.2 一致性强约束

**21 张 prompt 必同结构·只换 `<X>` + (可选) 篆刻字体类型偏好**·

为 21 张风格一致·Codex 应·

- 一次性接 21 prompt·而非 21 次单独发起 (避免风格漂)
- 或一次接 5-7 prompt 一波·一波内风格强统一
- **生第 1 张时·Codex 自定·材质 / 印石色 / 朱泥湿度 / 边缘磨损度**·后续 20 张沿用同 baseline

### 2.3 篆刻字体类型选择 (Codex 自决·**3 种**)

| 字体 | 适用 | 风格 |
|---|---|---|
| 汉印篆 | 主流·端庄·**推荐 default** | 方正满布·田字格内 |
| 九叠篆 | 官印感·繁复 | 笔画反复折叠·空白少 |
| 小篆 | 文人雅·瘦长 | 笔画圆润·上下舒展 |

**全 21 字 1 种字体最稳**·或 12 left + 9 right 各 1 种 (左党政 用 汉印 / 右朝廷 用 九叠)·**Codex 自定·user 看 1-3 字试 后决**·

---

## §3·21 字独立 prompt 列表

### 3.1 left rail 12 (势/党/阶/军/政/科/物/宫/图/题/声/帮)

#### 01·势 (shi)

```
中国古代篆刻印章·寿山石质感·朱泥湿润印面·
篆体汉字"势"·汉印篆 / 九叠篆 / 小篆·田字格内·
square 132×132·alpha 透明·8-12px 边距·正方·上视角·真石材肌理·
NO Latin·NO abstract·NO 3D·NO neon·NO red-gold·NO dragon·NO fantasy·
exactly 1 Chinese character "势"·非伪字·若字不准重生·禁 SVG / CSS·
仅生 idle base·状态由 CSS filter·
注·"势"为政治权势义·繁体 / 简体均可·篆体优先繁体 (勢)·
```

#### 02·党 (dang)

```
... (同模板·字"党") ...
注·"党"为党派 / 朋党义·繁体 (黨) 优·篆体 (黨)·
```

#### 03·阶 (jie)

```
... (同模板·字"阶") ...
注·"阶"为阶层 / 等级义·繁体 (階) 优·
```

#### 04·军 (jun)

```
... (同模板·字"军") ...
注·"军"为军事义·繁体 (軍) 优·
```

#### 05·政 (zheng)

```
... (同模板·字"政") ...
注·"政"为政事 / 政务义·"政"字本身简繁同形·
```

#### 06·科 (ke)

```
... (同模板·字"科") ...
注·"科"为科举 / 学科义·篆体本身复杂 (禾 + 斗)·
```

#### 07·物 (wu)

```
... (同模板·字"物") ...
注·"物"为物候 / 万物义·非"物品"·
```

#### 08·宫 (gong)

```
... (同模板·字"宫") ...
注·"宫"为宫廷 / 后宫义·"宫"字本身简繁同形·
```

#### 09·图 (tu)

```
... (同模板·字"图") ...
注·"图"为舆图 / 图籍义·繁体 (圖) 优·
```

#### 10·题 (ti)

```
... (同模板·字"题") ...
注·"题"为题本 / 题奏义·繁体 (題) 优·
```

#### 11·声 (sheng)

```
... (同模板·字"声") ...
注·"声"为声望 / 风声义·繁体 (聲) 优·
```

#### 12·帮 (bang)

```
... (同模板·字"帮") ...
注·"帮"为帮派 / 帮会义·繁体 (幫) 优·
```

### 3.2 right rail 9 (朕/辰/臣/缘/议/志/帑/讯/闻)

#### 13·朕 (zhen)

```
... (同模板·字"朕") ...
注·"朕"为皇帝自称·**最重要的字**·必精·"朕"字本身简繁同形·
篆体 (朕) 月 + 关·笔画相对简·
```

#### 14·辰 (chen)

```
... (同模板·字"辰") ...
注·"辰"为时辰 / 日子义·篆体笔画弯折较多·
```

#### 15·臣 (chen2)

```
... (同模板·字"臣") ...
注·"臣"为臣子 / 官员义·"臣"字本身简繁同形·篆体笔画为框 + 内笔·端正·
```

#### 16·缘 (yuan)

```
... (同模板·字"缘") ...
注·"缘"为人缘 / 缘分义·繁体 (緣) 优·篆体 糸 + 彖·
```

#### 17·议 (yi)

```
... (同模板·字"议") ...
注·"议"为议政 / 朝议义·繁体 (議) 优·篆体 言 + 义·
```

#### 18·志 (zhi)

```
... (同模板·字"志") ...
注·"志"为志向 / 大志义·"志"字本身简繁同形·篆体 士 + 心·
```

#### 19·帑 (tang)

```
... (同模板·字"帑") ...
注·"帑"为国帑 / 钱币义·**生僻字·Codex 易错**·必精校·篆体 巾 + 奴·
**附 unicode·U+5E51**·**附说明·"国库 / 公帑"义**·
```

#### 20·讯 (xun)

```
... (同模板·字"讯") ...
注·"讯"为讯息 / 风讯义·繁体 (訊) 优·篆体 言 + 卂·
```

#### 21·闻 (wen)

```
... (同模板·字"闻") ...
注·"闻"为风闻 / 听闻义·繁体 (聞) 优·篆体 门 + 耳·
```

---

## §4·试 batch 策略

### 4.1 试 3 字 (建议)

代表性强·覆盖三种难度·

| 字 | 选理由 | 难度 |
|---|---|---|
| **势** | 笔画中等·常见·风格基线 | 中 |
| **朕** | 政治核心·必精·小字数代表 | 易 |
| **帑** | 生僻·篆体易错·错字必重生测试 | 难 |

3 字 user ACK·**风格 + 字准 + 状态合成可行**·三关都过 → 续生剩 18·

### 4.2 替代 (user 自选)

若 user 想试不同字·可选·

- **势 / 朕 / 议** (左 rail 起 + 右 rail 中 + 政治核心)
- **党 / 政 / 闻** (3 个常见·风格基线优先)
- **势 / 帑 / 闻** (易 / 难 / 中 各 1·覆盖最广)

### 4.3 ACK 标准

```
[ ] 字对 (篆体形对·非伪字)
[ ] 风格在·真石材 / 真朱泥·非 PS 滤镜 / 非 vector
[ ] 边距 8-12px·alpha 透明·非黑边
[ ] 132×132·非小图放大
[ ] 3 字风格一致·非 3 张 3 风格
[ ] CSS filter 合成 4 状态·idle 风格不被 filter 破 (Claude 试)
```

任一不通 → 调 prompt → 重生·

### 4.4 续生 18 字

3 字 ACK 后·**Codex 一次接 18 prompt** (按 list 04..12 + 14..21 跳 13)·

或拆 2 波·

- 波 A·left rail 04..12 (9 张)·user 看 → ACK
- 波 B·right rail 14..21 (8 张·朕已生)·user 看 → ACK

---

## §5·若错·**绝对不退回 SVG**

(memory feedback_phase8_image_based_ui_raster_only.md lock)

### 5.1 错处分类

```
A·字错 (笔画 / 偏旁)        → 改 prompt 加约束 ("汉印篆·非草书 / 非异体") → 重生
B·风格漂 (3 张 3 风格)      → 改 prompt 加 "风格 baseline·参考第 X 张" → 重生
C·材质假 (像 vector)        → 加 "真石材·非 vector / 非 flat" → 重生
D·边距错 (黑边 / 满布)       → 加 "alpha 8-12px·背景透明" → 重生
E·分辨率错 (96×96 / 256×256) → 加 "exact 132×132" → 重生
F·主题色板 (verm / 金 偏)    → 加 §2.1 default 色板·"主朱印 #8a3a2e" → 重生
```

### 5.2 ABSOLUTE NO

```
若 Codex 自觉·"字易错·SVG 更稳"·"vector 更可控"·
→ 立刻意识·**这背离 Phase 8 image-based UI 前提**·
→ 推回 Claude·让 Claude 加固 prompt 而非顺势写 SVG·
→ B v2 教训·禁第二次·
```

---

## §6·Codex 输出 (Codex 看)

### 6.1 试 batch (3 张)

放 `C:/Users/37814/.codex/generated_images/<session>/`·

文件名建议·`seal-01-shi.png` / `seal-13-zhen.png` / `seal-19-tang.png`·

附说明·

```
3 张试·风格 baseline·材质 / 朱泥湿度 / 字体类型 (汉印 / 九叠 / 小篆 哪种) lock·
若 user ACK → 续 18 张·
若 user 调 → 重生·
```

### 6.2 全 21 张

试 ACK 后·**全 21 张一次出**·**强烈不要分多 session 出**·session 间风格易漂·

放同 dir·**user 全看 → 全 ACK**·

### 6.3 Claude 接 (ACK 后)

Claude 移资产至 `web/assets/ui/phase8/icons/rail/`·写 8-δ wire·**24-字 unicode 与 file 命名一致 verify**·

---

## §7·**Codex 不生**·清单 (本 batch 不在 Codex 工作)

```
[ ] 4 状态 (active/hover/idle/disabled) ──── Claude CSS filter 合成
[ ] 7 主题色板 ─────────────────────────── Claude CSS hue-rotate / overlay
[ ] 移动版 (≤768px) ─────────────────────── Claude CSS-only fallback (J.3)
[ ] @2x retina ────────────────────────── 待 8-η 后期补
[ ] PNG → SVG 互换 ──────────────────────── 禁 (memory lock·B v2 教训)
[ ] icon css class / DOM wire ──────────── Claude 8-δ
[ ] tooltip text (data-tip) ────────────── Claude 8-ε
[ ] hover transition / animation ────────── Claude 8-δ
```

---

## §8·后续 batch 顺序 (本 doc 后)

```
本 doc·    B v3 (21 篆刻)         ← 当前
后·        A v3 (#gc 5 tab dense)
后·        5th (时辰仪器 1-2 张)
后·        notify-urgent frame (1 张)
后·        portrait (~50-150 张·8-η)
后·        texture / 启动屏 / 主题素材 (8-η)
```

---

## §9·变更日志

- 2026-05-05·init·Claude·B v3 raster only·post B v2 reset

---

— Claude (Phase 8·Codex prompt batch B v3·21 篆刻·v1·2026-05-05)
