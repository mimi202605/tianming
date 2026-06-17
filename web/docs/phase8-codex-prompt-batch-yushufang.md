# Phase 8·Codex prompt·**batch yushufang·御书房 default 主视角**

date·2026-05-05·status·**🛑 OBSOLETE·v1 D1 御书房塞 23 操作·12 殿 v2 替代·新 prompt 待写**·owner·Claude

---

## ⚠️ OBSOLETE (2026-05-05)

v1 D1 单御书房 paradigm 废·新 12 殿 v2·御书房 hub 仅吸纳 ~6 surfaces·**不再是 23 操作 9 区**·

**新 prompt 待写**·`phase8-codex-prompt-batch-yushufang-v2.md` (12 区·议事清册 sidebar·屏风后密档·神镜问天·真假切·~500 行)·**禁发本 v1 prompt**·

依据 v2·`phase8-yushufang-detailed-spec.md` (621 行)·

---

依据·`phase8-d1-yushufang-architecture.md` (架构 doc·必先读) + `phase8-codex-prompt-master.md` (visual identity 母版) + user 决"按你的来·利用 Codex 生图优势"·

**与原 batch-screen-overall 关系**·原 5 屏 mock (#G 主屏 + drawer + chaoyi + launch + turn-modal) **全废**·因 D1 paradigm 把所有 UI 融入御书房·**第 1 张 mock = 御书房 default 主视角**·**ACK 后才扩切场景 + 主题**·

---

## §1·batch 概述

### 1.1 内容

第 1 张·**御书房 default 主视角**·1280×800·.webp·default 主题 (素宣墨骨 / 暖深褐 / 暖金 / 朱红)·

### 1.2 不画 (本 batch 不在工作)

```
[ ] 朝堂 (gt-chaoyi 廷议 / 常朝)        ── 后续 batch
[ ] 内书房 (御前 v2)                    ── 后续 batch
[ ] 舆图 (gt-difang)                    ── 后续 batch
[ ] 卷展开 (gt-shiji / biannian / etc.) ── 后续 batch
[ ] 7 主题朝代陈设 (default 外 6 主题)  ── 8-η 阶段
[ ] portrait 立绘 (官员朝服)            ── 后续 batch
[ ] 物品独立切片 (砚 / 印 / 笔)         ── ACK 后从 mock 切·或后续单独生
[ ] mobile 版                           ── 不生 (CSS only fallback)
```

### 1.3 spec

```
分辨率·    1280×800·.webp 优 (~300-500KB)
format·    .webp 或 .png (alpha 满布·或不必 alpha 因为是 full scene)
主题·      default·素宣墨骨
材质·      全真·宣纸 / 真朱漆木 / 真砚黑 / 真朱泥 / 真青铜 / 真宋画
风格·      宋画 + 工笔 + 文人画·1st-person·略前倾视角
朝代·      default = 明代 (崇祯前期·壬寅年)
时辰·      default = 申时 (午后·光斜·窗外金黄)
物候·      default = 春 (清明)·窗外柳新绿
留白·      墙 / 上方 / 远景 ~30-40% 留白
```

### 1.4 文件名

```
web/assets/ui/phase8/scenes/yushufang-default-trial.webp
```

---

## §2·**核心 prompt** (~280 行·dense)

### 2.1 视域 + 视角

```
1st-person 御书房视角·略前倾·御桌前·~110° 横扫·
看到·桌面 ~50% + 桌后屏风 ~15% + 左墙书架 ~15% + 右墙 (舆图+兵符) ~10% + 御阶门口 ~10% + 上方殿匾 ~5% + 窗 (右上) ~5%·
桌面占下半画面·屏风/墙占中段·殿匾/上方占上段·御阶/门占前下方·

仿养心殿三希堂或乾清宫西暖阁·真历史可考·非 fantasy·
```

### 2.2 9 区元素清单

#### ① 上方·殿匾 (~5%)

```
红黑漆木匾·烫金描"大 明"楷书·~120×40px 视域内·
左右雕梁·斗拱古色·
匾下小字·"壬 寅 年" + "圣 上"
高悬·略仰视感·
```

#### ② 桌后·屏风 (~15%)

```
木框屏风·~600×400px 视域内·宋画山水画屏 (远山近水·渔舟唱晚·或 春山行旅图)·
屏风右侧露窗·窗格 (棂)·明式 6 棂·
屏风左侧·墙·有题字小匾 ("大 学 之 道·在 明 明 德")·
屏风右上角·有"〔屏风后·密议〕"小字 hint (可选)·提示后是内书房·
朝代主题感·明朱漆木框 + 宋画屏面·非 generic Asian·
```

#### ③ 御书案 (主交互·~50%)

```
御桌·黑漆木 / 朱漆木·~1100×400px 视域内 (占下半画面)·桌面满铺·
桌面 7-12 物·each 独立·边缘锐利·alpha 可切·

[砚台]·圆形·黑润 (端砚)·有水波·~80×60px·桌面右中
[笔架]·两支毛笔搁·黑漆木·~80×60px·桌面右
[镇纸]·一对·青铜兽形 (狻猊)·~70×40px each·桌面中央左右
[朱印]·朱泥湿润印 + 印章·~50×50px·桌面右
[印泥盒]·圆漆·朱内·~40×40px·朱印旁
[展开诏书 1 卷]·宣纸卷·御笔题"奉天承运皇帝诏曰"·朱字部分·~300×120px·桌面中央
[半卷起诏书 1 卷]·~150×80px·桌面左
[折子叠]·镇纸下方·5-8 折堆·~120×80px·**镇纸抬起前可见但低调**·或半隐
[茶杯]·一只·官窑·桌面左前·~40×40px
[香炉]·小铜·烟形纤细 (申时·烟略浓)·~60×100px (含烟)·桌面左角
[漏壶]·三层铜壶滴漏·~60×120px·桌面左角后
[镇尺]·小·~80×10px·桌面前

桌前缘·略前倾·user 视角接近桌前缘·有手感
桌沿装饰·云纹 / 牡丹纹·浅雕
```

#### ④ 御阶 / 门口 (前·~10%)

```
御阶 3 级·下接御门·开·门外略亮 (殿外光)·
内侍 1 人·常驻·立·朝服 (青衣小帽)·~60×120px·御阶左侧
候朝大臣 2-3 人·朝服 (一品紫·二品绯·三品青)·立·~60×120px each·御阶下
鸿雁使者 1 人 (可选·若有信)·候命·~60×120px·御阶右
人物·水墨工笔·非动漫·非 3D
```

#### ⑤ 角落·utility (~3%)

```
御书案右下角·小盒·盒上几样小物 (折扇·镜·小印)·
默认隐藏感·hover 显·**这是 utility 入口** (题/声/帮)
mock 中·可画 1 折扇 + 1 小镜·暗示有此入口·非主体
```

#### ⑥ 左墙书架 (~15%)

```
左墙·满架卷宗·5-7 层·每层 ~10-20 卷·~250×500px 视域内·
卷宗按色分·本朝青绫 / 前朝褐 / 异朝红·
1-2 卷在桌左侧 (近期看的)·略凸出·
书架顶层·~5 卷·中上 / 中 / 中下 / 下·each 一层·
书架柜·朱漆木·古朴
书架旁·墙挂·"诗 书 礼 乐" 题字小匾
```

#### ⑦ 右墙·舆图 + 兵符 + 镜 (~10%)

```
右墙·上挂·大舆图 (~200×150px 视域内·缩略)·明代天下图·色块按道 (北直 / 南直 / 浙 / 等)·
舆图下·兵符 (玉牌)·节钺 (斧钺)·玉玺 (大方印)·立·or 挂·
铜镜 (圆·镜框雕花)·~80×80px·下方·光润·
墙边·有装饰·云纹 / 牡丹·浅雕·
```

#### ⑧ 窗 (右上·~5%)

```
窗格·明式 6 棂·~150×200px 视域内·
窗外景·春景·柳枝新绿·远山隐约·光斜射 (申时·金黄)·
光从窗入·照桌右半·有光斑感·
窗下·小几·有花瓶 (春花·梅或牡丹)·
```

#### ⑨ 桌下·抽屉 (~2%)

```
桌前缘下·抽屉·略凸·铜环把手·~80×40px 视域内·
默认关·暗示有内容·
```

### 2.3 整体氛围

```
1st-person·user = 帝王·略俯视御桌·殿匾在视域上方·屏风在桌后·墙在左右·门在前·
光线·申时·斜射光·桌面有光斑·暖色调·
材质·全真·非 vector·非 3D·非 PS 滤镜·
风格·宋画 + 工笔 + 文人画·真历史可考·
留白·墙 / 上方 / 远景 ~30-40%·非满堆·
密度·桌面 dense (主交互区·物品多)·墙 / 上方 / 远景 sparse (留白)·
朝代感·明代御书房·非 generic Asian·非 RPG fantasy·
```

### 2.4 颜色

```
主调·default·暖深褐底 (#241e18-#1a1510) + 暖金 (#c9a85f-#d4ba6e) + 朱红 (#8a3a2e-#a3582d) + 暖纸白 (#d4c9b0)·
点缀·墨黑 (#1a1410)·砚黑·
窗光·暖金 (申时金黄)·
书架卷宗·青绫 / 褐 / 红 (本朝色)·
朝服·紫 (一品) / 绯 (二品) / 青 (三品)·
山水屏风·宋画青绿色·或墨笔
```

### 2.5 否定 (8 Guardrails + 切片可行性)

```
NO Latin·NO 3D render·NO neon·NO gradient orb·NO red-gold luxury (满金)·
NO dragon overload·NO fantasy palace (Ming Dynasty real palace·非奇幻)·
NO Western flourish (curlicue)·NO 满屏精致 (留白必)·NO 现代办公桌·
NO RPG 主菜单·NO 古装游戏 generic UI·NO Material Design·
NO 物品嵌入背景 (each 物品必边缘锐利·可切)·
NO 写实数字 (诏书内文 / 大臣名 / 数字示意即可·留 placeholder)·
NO modal / button / panel paradigm (此 mock 是世界·非 UI)·
NO Codex 退回 SVG / wireframe / schematic
```

### 2.6 切片可行性 (critical·application strategy 延)

```
[必] 物品边缘锐利·**可单独切**·砚 / 笔 / 镇 / 朱印 / 卷 / 屏风 / 镜 / 兵符·each 独立
[必] 桌面 / 屏风 / 墙·可独立切作 tile / 9-slice 背景
[必] 物品阴影 / alpha·后续切出时透明边距 8-12px
[必] 状态 placeholder·非写实数 (诏书示意·大臣数占位·折数示意)
[必] 5-7 区切线明显·桌 / 屏 / 墙 / 阶 / 殿匾 / 窗 之间·**有清晰视觉边界**
```

### 2.7 安全网

```
若御书房像现代办公室·重生 (强调"明代御书房·养心殿三希堂参考")
若物品像 vector / flat·重生 (强调"真材质·真青铜·真砚黑·真宣纸")
若画面太满·留白 < 30%·重生 (强调"宋画式留白")
若色调偏 vermillion (主红)·重生 (default 主题·非 vermillion)
若朝代不明 (像 generic Asian)·重生 (强调"明代·万历后·崇祯前")
若物品嵌入背景 (画成一体)·重生 (强调"each 物品边缘锐利·可切")
若 Codex 退回 SVG / 拼图·**memory lock 违·禁**·重做
```

---

## §3·**绝对禁止** (raster-only memory lock)

```
[禁 1] 输出 .svg / .css / .js / .html / wireframe
[禁 2] 用 SVG / vector 替代 raster
[禁 3] 用 box / rectangle schematic 代替 dense scene
[禁 4] 物品嵌入背景画成一体 (切不出来)
[禁 5] 写实数字 / 实人名 / 实诏文·占位即可
[禁 6] 现代 UI 元素 (button / modal / panel / tab) 入画
```

---

## §4·验证 protocol

### 4.1 Codex 自审 (生图后立即·15 项)

```
[ ] 整体·1st-person 御书房·明代·养心殿 / 乾清宫风
[ ] 视角·略前倾·御桌前·~110° 横扫
[ ] 9 区·殿匾 / 屏风 / 御桌 / 御阶 / 角落 / 左墙 / 右墙 / 窗 / 桌下·齐
[ ] 桌面 7-12 物·砚 / 笔 / 镇 / 朱印 / 卷 / 折子叠 / 茶 / 香炉 / 漏壶·齐 (按 §2.2 ③)
[ ] 御阶 + 内侍 + 2-3 候朝大臣·齐
[ ] 左墙书架·5-7 层·卷宗按色分
[ ] 右墙·舆图 + 兵符 + 镜·齐
[ ] 窗 + 春景 + 申时光·齐
[ ] 殿匾"大明" + 年号·齐
[ ] 屏风山水画 + 题字小匾·齐
[ ] 整体氛围·宋画·文人画·非 RPG / 非 Material / 非 fantasy
[ ] 留白·30-40%
[ ] 主题色·default·非 vermillion
[ ] 材质·真·宣纸 / 朱漆木 / 砚黑 / 朱泥 / 青铜·非 vector / 非 PS 滤镜
[ ] 切片可行·物品边缘锐利·5-7 区切线明·状态 placeholder
```

任一不通 → 重生·禁退回 SVG·

### 4.2 输出后·letter to Claude

```markdown
# Codex -> Claude: Phase 8·御书房 default 主视角 done

放·web/assets/ui/phase8/scenes/yushufang-default-trial.webp

风格 baseline·材质 / 留白 / 朝代 / 主题色·

(说明 ~10-15 行·重点·
- 朝代选择 (明代是哪一时期·万历 / 天启 / 崇祯)
- 时辰光选 (申时金黄)
- 物候 (春·清明)
- 7-12 物的具体形态选择
- 屏风山水画类型
- 窗外景描述
)

待 user ACK · 进波 2 (切场景·朝堂 / 内书房 / 舆图 / 卷)
或 user 调 · 重生
```

### 4.3 user ACK / 调

- ACK → 我转你"波 2 启"letter (朝堂 + 内书房 + 舆图 + 卷·一波 4 张·按 御书房 baseline)
- 调 → 我转 user 反馈 + 调 prompt → 重生
- 小调 (色 / 物品布局) → 直接 prompt patch 重生
- 大调 (整体方向) → 回到 architecture doc 重看

---

## §5·若失败·重生路径

### 5.1 错处分类

```
A·像现代办公室              → 强调"明代御书房·养心殿三希堂"·重生
B·物品像 vector / flat       → 强调"真材质·真青铜·真砚黑"·重生
C·满堆·留白不够             → 强调"宋画式留白·30-40%"·重生
D·色调偏 vermillion          → 强调"default 主题·非 vermillion"·重生
E·物品嵌入背景               → 强调"each 物品边缘锐利·可切"·重生
F·朝代不明                   → 强调"明代·崇祯前期·非 generic Asian"·重生
G·缺 9 区·物品不齐           → 强调按 §2.2 9 区清单·重生
H·人物像动漫                 → 强调"水墨工笔·非动漫"·重生
I·写实数字 / 实诏文           → 强调"占位·示意"·重生
J·切线不明 / 物品融背景       → 强调"5-7 区切线明·物品独立可切"·重生
K·现代 UI 元素入画 (button)   → 强调"非 UI·是世界"·重生
```

### 5.2 ABSOLUTE NO

```
若 Codex 自觉·"分块 SVG 拼更稳"·"vector 更可控"·
→ 立刻意识·**这背离 D1 paradigm + image-based UI 前提**·
→ 推回 Claude·让 Claude 加固 prompt·
→ B v2 教训·禁第二次·
```

---

## §6·切片清单 (ACK 后·Claude 工作)

mock ACK 后·Claude 切片·**~10-15 张材质 / 物品**·或 Codex 单独 batch 重生 (尺寸优化)·

```
[材质大背·~5 张]
  yushufang-bg-base.webp        全屏背景 (墙 + 殿匾 + 屏风 + 御阶)·1280×800
  table-surface.png              桌面材质·~1100×200·tile horizontal
  bookshelf-bg.png               左墙书架·~250×500
  right-wall-bg.png              右墙 (墙底 + 镜框 + 兵符立架)·~250×500
  window-frame.png               窗格 + 光感·~150×200

[物品独立·~10-15 张]
  yan-tai-inkstone.png           砚台·alpha·~80×60·切自 mock 或 Codex 重生
  bi-jia-brushrack.png           笔架
  zhen-zhi-paperweight.png       镇纸 (一对)
  zhu-yin-vermillion-seal.png    朱印 (印章 + 印泥)
  yin-ni-seal-paste.png          印泥盒
  zhao-shu-edict-roll.png        诏书展开
  zhe-zi-memorial-stack.png      折子叠
  cha-bei-tea-cup.png            茶杯
  xiang-lu-incense-burner.png    香炉 (烟分多帧)
  lou-hu-water-clock.png         漏壶
  jian-chi-rule.png              镇尺

[墙挂·~3-5 张]
  yu-tu-map.png                  舆图
  bing-fu-tiger-tally.png        兵符
  jie-yue-axe.png                节钺
  yu-xi-jade-seal.png            玉玺
  tong-jing-bronze-mirror.png    铜镜

[人物 portrait·~5-10 张]
  nei-shi-eunuch.png             内侍立
  guan-yuan-rank-1.png ~ rank-3.png  3 品官员朝服立绘
  hong-yan-courier.png           鸿雁信使
  (具体角色 portrait·8-η 阶段批量)

[装饰·~5-10 张]
  ping-feng-painting.png         屏风画 (山水)
  dian-bian-plaque.png           殿匾 "大 明"
  scrolls-on-shelf.png           书架卷宗
  qi-pao-imperial-robe.png       朝服 (切场景入口)
  da-jia-imperial-throne.png     朝堂龙椅 (切场景预览)
```

---

## §7·后续 batch 顺序 (本 doc 后)

```
本 doc·    御书房 default 主视角·1 张        ← 当前·P0
ACK 后·    波 2·切场景 4 张
            - 朝堂 (廷议 + 常朝)
            - 内书房 (御前 v2)
            - 舆图 (gt-difang)
            - 卷展开 (gt-shiji 等共用模板)
波 2 ACK·  波 3·物品独立切片 / 重生 (~10-15 张·从 mock 切或 Codex 单生)
波 3 ACK·  波 4·portrait 立绘 (~30-50 张·8-η)
波 4 ACK·  波 5·7 主题朝代陈设 (default 外 6 主题·~30-50 张)
波 5 ACK·  Phase 8 视觉资产完成·进 8-δ 主屏 wire (~15-20d)
```

---

## §8·变更日志

- 2026-05-05·init·Claude·D1 御书房·1 张试·post user "按你的来"·~400 行

---

— Claude (Phase 8·Codex prompt batch yushufang·v1·post D1 决·2026-05-05)
