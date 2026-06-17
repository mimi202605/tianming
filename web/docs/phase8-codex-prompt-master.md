# Phase 8·Codex prompt·**整体 brief (master)**

date·2026-05-05·status·**待 user 视觉 ACK·所有 batch prompt 复用本 brief**·owner·Claude (8-α prompt phase)

本 doc 是 Codex **所有 raster 生图 prompt** 的母版·规格 / 命名 / 主题 / 禁忌 / 验证 / user-judge 协议在此·**任何 batch prompt 不重述·只引本 doc + 补 batch-specific**·

---

## §1·视觉身份 (visual identity)

### 1.1 主方向 (从 Codex 5Q + visual-direction-lock draft)

**宋画山水 / 文人案 / 宣纸墨骨**·真中国古代视觉语言·

- 不是"通用东亚装饰"·不是"红金满堂奢华"·不是"赛博朋克古风"
- 是·**真宣纸的纤维感·真朱泥的湿润·真石材的肌理·真水墨的骨力·真碑拓的斑驳**

### 1.2 辅方向

- **篆刻**·rail icon / 季节印 / 状态印 / modal 印章
- **朝服色**·官房 / 人事 / 任命 / 党派面板色
- **碑拓·题签**·礼仪 header / 回合 modal / 朝议 header

### 1.3 推迟方向 (8-η 后再考虑)

- **工笔重彩**·人物 portrait·8-η 阶段引
- **织锦 / 瓷器**·主题表皮 / 局部纹样·8-θ 阶段引

### 1.4·8 条 Guardrails (硬禁忌·**不可破**)

```
[禁 G1]  generic 红金满屏       (kitsch / luxury Asian / 过年风)
[禁 G2]  龙凤满堆                (cartoon dragon overload)
[禁 G3]  fantasy 宫殿             (palace fantasy framing / "rpg 古装游戏" 通病)
[禁 G4]  渐变球 / bokeh / orb     (modern UI illustration·与古风冲突)
[禁 G5]  霓虹 / 荧光               (neon / cyberpunk·与古风冲突)
[禁 G6]  3D 渲染感                (must be 2D painted / printed feel·非 cinema 4D 出品)
[禁 G7]  西式装饰 flourish        (curlicues / Latin serif frame / acanthus·与中国古代不符)
[禁 G8]  满屏精致无留白          (negative space 是宋画核心·必留 30-50%)
```

### 1.5 正面关键词 (positive prompt 关键)

```
真材质 (real material)·宣纸 / 朱泥 / 寿山石 / 寿山田黄 / 雕版木 / 织锦 / 瓷胎 / 碑拓
笔墨 (ink brush)·水墨皴 / 工笔 / 雕版印
留白 (negative space)·宋画式 / 文人画
质感 (texture)·宣纸纤维 / 石材肌理 / 朱泥湿润 / 木刻刀痕 / 拓本斑驳
构图 (composition)·中正 / 文人案 / 卷轴 / 印章 / 三远法
```

---

## §2·7 主题色板 (token first·color second)

7 主题各一组·**Codex 生 idle base 时·按 default 主题生**·其他主题用 CSS filter / overlay·

### 2.1 default·素宣墨骨 (基线)

```
bg          #241e18  深褐 / 旧宣
bg-2        #1a1510  深褐二
gold-500    #c9a85f  铜金 / 暗金
gold-300    #d4ba6e  亮金
ink-100     #3d342a  墨褐
ink-300     #6b5d47  浅墨
ink-400     #b89a53  题签金
verm-500    #8a3a2e  暗朱
verm-400    #a3582d  赭朱
celadon-400 #3d6b5a  汝青 (辅)
text fill   #d4c9b0  纸白偏暖
```

**Codex 生 idle base 用此**·**所有 batch prompt §2 default 默认**·

### 2.2 paper·净宣阅读 (长文阅读用)

```
bg          #f7f0e3  净宣
ink-100     #3d342a  墨
ink-300     #6b5d47  浅墨
verm        #8a3a2e  朱
gold        #b89a53  题签金
text fill   #1a1410  深墨
```

### 2.3 scroll·拓本古卷

```
bg          #e9d8b8  拓黄
ink         #1a1410  墨黑
umber       #a3582d  赭石
gold        #b89a53  题签金
text fill   #1a1410
```

### 2.4 blue·青花瓷 (冷主题)

```
bg          #f0eee0  瓷白
blue-500    #1a4d7a  青花深
blue-300    #4a7ba6  青花浅
verm        #8a3a2e  朱 (印章 only)
text fill   #1a4d7a
```

### 2.5 celadon·汝窑天青 (雅)

```
bg          #cfe0d5  天青
celadon-500 #3d6b5a  汝青深
celadon-300 #7a9b8a  汝青浅
ink-100     #3d342a  墨
text fill   #3d342a
```

### 2.6 vermillion·朱印宫墙 (暖)

```
bg          #7a1f1a  宫墙红
gold-300    #d4a060  宫廊金
verm-400    #c9533e  亮朱
paper       #fef4e8  象牙
text fill   #fef4e8
```

### 2.7 highcontrast·a11y (无障碍)

```
bg          #0a0a0a  极暗
fg          #ffffff  极亮
accent      #ffeb3b  警示黄
verm        #ff5722  警朱
```

**a11y 主题不生 raster·走 CSS only·Codex 跳过**·

### 2.8·主题切换策略

- Codex 只生 default 主题 idle base
- Claude 用 CSS filter / overlay 合成其他 6 主题
- filter 例·`hue-rotate / sepia / saturate / brightness`·或 mix-blend-mode 加色层
- 若某主题 filter 不够·**8-θ 阶段补生 1 套**

---

## §3·资产规格 (技术约束)

### 3.1 格式

```
首选·   .png   (alpha 透明·icon / portrait / 印章 必)
备选·   .webp  (scene 主屏 / texture 大图·体积优)
禁·     .svg / .jpg (jpg 无 alpha)
```

### 3.2 分辨率·**按资产类型分**

| 类型 | 1x | 2x (retina) | 备注 |
|---|---|---|---|
| icon 篆刻 | 132×132 | 264×264 | 印章·正方·alpha 必 |
| icon 风闻 / 操作 | 24×24 | 48×48 | 走 TM_ICONS·**Codex 不生·Claude 写 SVG** |
| scene 主屏 (#gc 各 tab) | 1280×800 | (no 2x) | webp·~150-300KB |
| scene 时辰仪器 | 480×480 | 960×960 | 圆形 / 矩形按选 |
| scene notify-urgent frame | 960×540 | (no 2x) | 边框 + 朱印水印·中央留空 |
| portrait | 256×256 | 512×512 | 圆切割·alpha·胸像构图 |
| texture (大背景) | 1920×1080 | (no 2x) | webp·tile 可 |
| seal 状态印 / 季节印 | 96×96 | 192×192 | alpha·边角装饰 |

### 3.3 边距 (transparent padding)

- 印章·8-12px (alpha 边距·防裁切)
- portrait·16-24px (alpha 边距 + 胸像顶留白)
- scene·0 (满布)
- frame·内框留 30-40% 中心透明区 (用 mask·非黑边)

### 3.4 DPI 与色彩空间

- web·sRGB·72 DPI 默认
- 2x 资产·@2x 命名后缀 (例·`seal-01-shi@2x.png`)
- 禁 CMYK·禁 P3 (兼容性)

---

## §4·命名规范 (asset path 与 file)

### 4.1 根目录

```
web/assets/ui/phase8/
  ├── icons/
  │   ├── rail/        21 篆刻 (B v3)
  │   ├── season/      4 季节印
  │   ├── status/      状态印 (吉/凶/急/缓/...)
  │   └── action/      操作小图 (TM_ICONS 不够时·罕见)
  ├── seals/           大印 (modal 用)
  ├── textures/        纸 / 木 / 石 / 织锦 大背
  ├── scenes/          主屏 raster (A v3 / 5th / notify-urgent)
  ├── portraits/       人物胸像
  └── frames/          modal 边框 / header 装饰
```

### 4.2 命名

```
kebab-case·全小写·英文·拼音可
不含·中文 / 空格 / 特殊符 / 非 ASCII
后缀·.png / .webp 一致 (一资产一格式·不混)
2x·后缀 @2x.png
```

### 4.3 命名示例

```
icons/rail/seal-01-shi.png        (势·left rail 第 1)
icons/rail/seal-21-wen.png        (闻·right rail 第 21)
icons/season/spring.png           春·三月印
scenes/main-screen-edict.png      拟诏 dense
scenes/main-screen-memorial.png   奏疏
scenes/time-instrument-rikui.png  日晷
scenes/time-instrument-touhu.png  铜壶滴漏
scenes/notify-urgent-frame.png    紧急通知框
portraits/cao-cao.png             (按 char-id)
frames/modal-header-stele.png     碑额 modal header
```

---

## §5·状态合成策略 (option B·**核心**)

### 5.1 Codex 只生 idle base·**禁生 4 状态**

每个 icon / 印章 / 装饰元素·**1 张 idle base**·

active / hover / disabled / focus 状态·**Claude CSS filter 合成**·

```css
/* idle */            filter: none;
/* hover */           filter: brightness(1.1);
/* active (按下) */   filter: brightness(1.2) saturate(1.4);
/* disabled */        filter: grayscale(0.7) opacity(0.5);
/* focus (a11y) */    outline: 2px solid var(--gold-300);
```

### 5.2 例外·**仅 3 种情况 Codex 生多张**

1. **季节印 4 张** (春夏秋冬)·色 / 字 / 构图均不同·非状态·必独生
2. **关键 modal frame** (notify-urgent)·1 张通用·主题 6 个走 filter
3. **portrait**·每人一张·**非状态变化**

### 5.3·**绝对禁止** Codex 生

- 21 篆刻 × 4 状态 = 84 张·**禁**·只生 21
- 7 主题 × 21 篆刻 = 147 张·**禁**·只生 21 (default 基线)
- 移动版 × 桌面版 = 2 套·**禁**·只生 1 套桌面 (移动 CSS-only fallback)

**省·从 ~588 张 (84+147+移动) 砍到 ~21 张·节省 96%**·

---

## §6·字体禁区·**装饰字必图·非字体**

### 6.1 字体策略

```
正文 (body)·   STKaiti / KaiTi / FangSong / Noto Serif SC / serif fallback
                第一轮不引网络字体 (CDN font 慢 + 离线坏)
装饰字·       篆刻 / 碑拓 / 题签 / 雕版印 → 必 raster 图·非字体
```

### 6.2·**必图字 (Codex 生)** 清单

```
篆刻字 21 (B v3)·                    势 党 阶 军 政 科 物 宫 图 题 声 帮 + 朕 辰 臣 缘 议 志 帑 讯 闻
季节印 4·                            春 夏 秋 冬
状态印 N (待定·8-ε)·                  吉 凶 急 缓 准 否 已 待 ...
modal header 题签 (8-ε)·             "诏" "议" "纪" "策" 等大字 (各按 modal)
启动屏标题 (8-ζ)·                    "天命" 二字大字
```

### 6.3·**走字体的字** (Codex 不生)

- 所有正文 (诏书内文 / 奏疏正文 / 列表)
- 所有 UI label (按钮文 / chip 文 / table header)
- 所有 tooltip (CSS `::after content:attr(data-tip)`)
- 所有 toast / notify text

---

## §7·prompt 模板 (master template)

### 7.1 base template

```
[材质]·真[宣纸 / 朱泥 / 寿山石 / 雕版木 / 织锦 / 青瓷 / 拓本] 质感·
[主体]·[一字 / 一物 / 一景 / 一人]·
[构图]·[正方 / 横长 / 圆 / 不规则]·[中央 / 主体居中 / 三远法]·
[风格]·[宋画山水 / 篆刻汉印 / 工笔 / 雕版印 / 文人案]·
[规格]·[像素]·[alpha / 透明 / 满布]·
[否定词]·NO Latin·NO abstract·NO 3D render·NO neon·NO gradient orb·NO red-gold luxury·NO dragon overload·NO fantasy palace·
[安全网]·若主体 (字 / 物) 不准·重生·禁 SVG·禁 CSS·禁 code·
```

### 7.2 示例 1·篆刻

```
中国古代篆刻印章·寿山石质感·朱泥湿润印面·篆体汉字"势"·汉印 / 九叠篆 / 田字格 任选·
square 132×132·alpha 透明 8-12px 边距·正方·上视角·
NO Latin·NO abstract·NO 3D·NO neon·NO red-gold luxury·NO gradient·
exactly 1 Chinese character "势"·若字不准重生·禁退回 SVG / CSS·
```

### 7.3 示例 2·主屏 dense (gt-edict)

```
中国古代文人书案·宋画风格·宣纸纤维质感·真水墨·
案上·待批奏疏卷轴叠 (3-5 卷·部分展开)·砚台·镇纸·朱印泥盒·毛笔·待批朱字·
构图·横长 1280×800·主体偏左·留白偏右·上视角 / 三远法·
风格·宋画 / 文人画 / 文房四宝·
NO 3D render·NO neon·NO gradient orb·NO red-gold luxury·NO fantasy palace·NO Latin·
留 30-40% 留白用作 UI overlay·若元素堆挤重生·
```

### 7.4 示例 3·portrait

```
中国古代官员胸像·工笔风格·绢本设色·真朝服 (官品按角色: 一品红 / 二品紫 / 三品绯)·
构图·256×256·圆切割可走 mask·alpha·胸像·正面 / 三分侧·
表情·[威严 / 温和 / 阴沉 / 谦恭] 任选·
NO 3D·NO realism photo·NO Western portrait·NO neon·NO fantasy crown·
若朝服规格不准 (品级与色不符) 重生·
```

### 7.5 示例 4·texture (大背)

```
中国古代宣纸纤维质感·宋代米白·tileable seamless·1920×1080·.webp·
风格·真宣纸·非纸纹 vector·非 generic kraft·
NO 3D·NO neon·NO gradient·NO Latin watermark·NO logo·
若纹理重复明显 (tile seam visible) 重生·
```

### 7.6 prompt 写法守则

- **正面词在前**·材质 / 主体 / 构图先列
- **否定词在后**·NO ... 列尽 8 Guardrails
- **安全网最后**·若主体不准·重生·禁退回 SVG
- **每 prompt 长度 100-200 字**·过长 = 风格漂
- **关键字重复 OK**·"真宣纸"可在材质 + 风格各出一次·强化

---

## §8·验证 checklist (per asset·**每张资产 Codex + user 双验**)

### 8.1 Codex 自审 (生图后立即)

```
[ ] 字 / 物 / 人 主体准确 (篆刻字对·官员朝服品级符·器物形制对)
[ ] 风格在 §1 §2 内·非 8 Guardrails 区
[ ] 边距留白合规 (印章 8-12px·portrait 16-24px·scene 30-50%)
[ ] 分辨率达标 (按 §3.2 表)
[ ] alpha 透明 (印章·portrait·必)
[ ] file 命名按 §4
```

任一不通 → **重生·禁退回 SVG / CSS**·

### 8.2 user-judge (Codex 自审通过后)

```
[ ] 风格"真中国古代"还是"通用东亚"
[ ] 材质"真宣纸朱泥"还是"PS 滤镜"
[ ] 主体"准确"还是"伪字 / 伪官 / 伪器"
[ ] 留白"宋画式"还是"满屏"
[ ] 主题协调"7 主题任一可走 filter 适配"还是"主题坏死"
```

任一不通 → **letter to Codex 调 prompt → 重生**·

### 8.3 试 batch 协议

每 batch (B v3 / A v3 / 5th / portrait / texture) 启时·

1. **试 1-3 张** (代表性强·或 user 指定)
2. **user 看 → ACK / 调整 / 重生**
3. ACK 后 **批量** (剩余张数)
4. 批量出齐 → **user 全看 → 全 ACK**
5. 全 ACK → **Claude 启 wire (8-δ / ε / η 落地)**

---

## §9·边界·禁忌·**raster only**

### 9.1 输出格式·**硬约束** (memory feedback_phase8_image_based_ui_raster_only.md lock)

```
Codex 输出·   .png / .webp / .jpg only
Codex 禁·    .svg / .css / .js / .html / inline mock / wireframe
违规·        视为越权·必重做
```

### 9.2 Claude prompt 中**禁出现**的开后门词

```
禁词清单·"SVG-extractable"·"code-friendly"·"vector-style"·
        "easily traced"·"flat 2D shape"·"icon-style geometric"·
        "minimalist outline"·"single-stroke"·
原因·这些词暗示 Codex 退回 SVG 写·**B v2 教训**
替代·"真 raster"·"真材质"·"真 ink"·"真石材"·"painted"·"printed"
```

### 9.3 Codex 见技术理性诱惑必 push back

若 Codex 自觉·"图片生成易写错字·SVG 更稳"·**必立刻意识到 这背离 Phase 8 生图前提**·**应推回 Claude·让 Claude 加固 prompt·而非顺势写 SVG**·

### 9.4 错字 / 风格漂

- 篆刻 21 字·**易错·必每张 OCR 或视觉自审**
- 错 → **改 prompt 加约束 (例·"九叠篆 specifically·汉印 NOT 小篆") → 重生**
- **绝对不退回 SVG**

---

## §10·user-judge 协议 (review flow)

### 10.1 流程

```
Codex 生 → 自审通过 → 命名落 generated_images dir
            ↓
        Claude letter to user·"B v3 第 1-3 字试已出·路径 ..."
            ↓
        user 看·ACK / 调整 / 重生
            ↓ ACK
        Codex 续生剩余
            ↓
        全出·user 全看·全 ACK
            ↓
        Claude 移资产至 web/assets/ui/phase8/
            ↓
        Claude 启 wire (8-δ / ε / η)
```

### 10.2 调整路径

- 风格不对 → letter 改 §1 §2 加约束·重生
- 字不对 → letter 加 "九叠篆 NOT 小篆 / 汉印 NOT 玉箸篆" 类细约束·重生
- 边距不对 → letter 改 §3.3 数值·重生
- 主题色板不对 → letter 改 §2.X color·重生
- 否定词漏 → 加进 §1.4 / §7 base template

### 10.3 Codex 不读 codebase·Claude 替代

- Codex 不知 z-index 9999·不知 174 script·不知 .gs-* 命名
- **本 doc 替代·Codex 只读本 doc + batch prompt**
- codebase 变化·**Claude 必同步本 doc (master)** → 各 batch 自动跟随

---

## §11·doc 与其他 phase8 doc 的关系

```
phase8-alpha-prep.md          (高层 audit·HTML / CSS / Token)
phase8-alpha-deepdive.md      (35 finding·实操约束·Claude 用)
phase8-beta-prep.md           (UI baseline 工具)
phase8-visual-direction-lock.md (Codex 写·draft·visual lock)
phase8-codex-prompt-master.md (本 doc·Codex prompt 母版)
phase8-codex-prompt-batch-*.md (Codex prompt batch·按生图顺序)
        ↓
Codex 生 raster → user ACK → Claude wire (8-δ/ε/η/...)
```

### 11.1·batch 启动顺序 (2026-05-05 post B v3 trial reset)

```
[P0 当前]   batch-screen-overall.md  (5 整屏 mock·拆 2 波·A/B/C + D/E)
                ↓ user ACK 5 张
[P1]       batch-b-v3-seals.md      (21 篆刻·PAUSED·待整屏 ACK 后启)
[P2]       batch-5th-time.md        (时辰仪器 1-2 张·待写)
[P3]       batch-notify-urgent.md   (紧急通知 frame·待写)
[P4]       batch-portrait.md        (~50-150 张人物胸像·8-η·待写)
[P5]       batch-texture.md         (大背 / 主题表皮·8-η·待写)
```

**关键·整屏 mock 是所有细节 batch 的 baseline**·先整体后细节·

---

## §12·当前状态 (2026-05-05·post B v3 trial 评估)

- B v2 SVG fiasco → reset → B v3 raster trial 3 张
- B v3 trial 评估·**材质对·字体错·整屏 baseline 缺**
- **方向修正**·user 决·**整屏 mock 5 张先**·细节 batch (B v3 / portrait / etc.) 全暂停
- 当前 P0·`phase8-codex-prompt-batch-screen-overall.md` 已写·待 user ACK master + screen-overall → letter to Codex
- 波 1·A/B/C (主屏 idle / drawer 打开 / chaoyi modal)·一波出
- 波 2·D/E (启动屏 / 回合 modal)·按波 1 baseline 出

---

## §13·变更日志 (本 doc·后续每改记)

- 2026-05-05·init·Claude·8-α prompt phase·post B v2 reset
- 2026-05-05·patch·post B v3 trial·重排 batch 启动顺序 (整屏先·细节后)·§11.1 + §12 update

---

— Claude (Phase 8·Codex prompt master·v1·2026-05-05)
