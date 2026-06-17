# Claude → Codex·Phase 8·Wave 0 trial·御书房 hero·全朝代通用·gpt-image-2

date·2026-05-05·status·**P0·Wave 0 trial·1 张试·先看效果再迭代**·owner·Claude·

---

Codex·

Phase 8 视觉资产正式起步·**Wave 0 trial**·只出 1 张·御书房 default 主视角·看效果·user + Claude 双审 ACK 后再开 Wave 1·

**关键变更** (与 v2 doc 比)·

```
1·  朝代锁定改"全部中国古代朝代通用"·非锁明清
    user 决·此 trial 为通用古风测试
    禁朝代专属物·补子 / 乌纱 / 飞鱼服 / 军机处
2·  image-gen 工具·gpt-image-2 (OpenAI 旗舰·Codex 已对接)
3·  reference 锚·暂不带·先看 model 自己理解能力
    fail 后下一版加 reference (省 user 找图工)
4·  汉字处理·占位字形·model 出乱字 / 假字形即可·**人不读·只看意象**
    若效果差·后续走 HTML overlay (raster + 真字 overlay 混合方案)
5·  真假双值 visual·此 trial 仅画 perceived (常态)·
    真假切按钮 idle 状态显·不画切换后画面 (wave 4 transition 时再做)
```

---

## §1·任务

```
调用·       gpt-image-2
prompt·    见 §2 (~200 行·中文为主)
输出·       web/assets/ui/phase8/scenes/yushufang-trial-w0.webp
分辨率·     1280×800·.webp 优 (~300-500 KB)
张数·       1 张·hero 主视角
重生·       自审 7 项 (§3) 任一不通过·按 12 路径 (§4) 重生·**绝禁** SVG / 拼图 / 代码替代
```

---

## §2·prompt 正文 (调 gpt-image-2)

```
【场景】中国古代宫廷·御书房·12 殿之 hub·朝代通用·非锁明清·非 fantasy·非异世
【视角】1st-person·略前倾·御桌前·横扫 ~110°·御桌正中

【风格】宋画 + 文人画 + 工笔重彩·空间感参 郭熙《早春图》/ 仇英《汉宫春晓图》
【材质】真朱漆木 / 真宣纸 / 真青铜 / 真砚黑 / 真朱泥 / 真宋瓷·边缘锐利可切·非 3D 渲染·非 CG·非 anime·非 flat illustration
【光】日斜午后·窗外金黄斜射·室内暖橙·阴影柔
【留白】30-40%·背景宣纸底色 #f4eadd
【色版】素宣墨骨·#241e18 (墨) / #c9a85f (金) / #8a3a2e (朱) / #d4c9b0 (麻)
【人物】水墨工笔·古代官员朝服 (通用·朝代含糊·非明清补子·非乌纱帽)·非动漫·非 3D

【画面构成 12 区·按视域占比】

① 上方·殿匾 (~5%)
   红黑漆木匾·烫金描"御 书 房" 三字·占位字形·**勿写真字**
   雕梁斗拱·古色·朝代通用 (唐宋元明清都有此元素)

② 桌后屏风 (~15%·密档 transition entry)
   木框屏风·宋画山水·春山行旅·宁静
   屏风右上角·**"〔屏风后〕"小字 hint** (gold·~12px·暗示密档入口)
   user click → zoom 入内书房 (此图先不画·只留 hint)

③ 御书案 (主交互·~50%)
   御桌·黑漆木·桌面满铺约 14 物·each 边缘锐利·alpha 可切·
   - 砚台·圆形·黑润 (端砚)·~右中
   - 笔架两支毛笔搁·黑漆木
   - 镇纸一对·青铜兽形 (狻猊)·桌面中央左右
   - 朱印 + 印泥盒·圆漆朱内·桌面右
   - 展开诏书 1 卷·宣纸·占位字形·~桌中央·**勿写真字**
   - 半卷起诏书 1 卷·近期诏令·桌面左
   - 折子叠 5-8 折·镇纸下方半隐
   - 茶杯·官窑·桌面左前
   - 香炉·小铜·烟形纤细·桌面左角·暮春午后香气
   - 漏壶·三层铜壶滴漏·桌面左角后
   - 镇尺·小·桌面前缘
   桌沿装饰云纹 / 牡丹纹·浅雕

④ 御阶门口 (前·~10%)
   3 级御阶·下接御门 (开)·门外略亮 (殿外光)
   内侍 1 人·朝服 (通用古代青衣小帽)·立·御阶左
   候朝大臣 2 人·朝服 (通用·一紫二绯·非补子)·立·御阶下
   人物·水墨工笔·非动漫

⑤ 议事清册 sidebar (~20%·**核心新加**)
   位置·画面左·sticky·~260px 宽·全高
   sidebar = 卷轴展开样·题签 "议事清册·诏书建议"
   6-8 条建议·each·一行简短文字 (占位字形)·一彩 dot 标 source
   滚动条·古色·细
   **此 sidebar 是 game-UI 元素具象化为"卷轴"**·非现代 listview / 非 modern UI

⑥ 神镜问天 (角落·右上墙挂·~5%)
   小铜镜·镜面映月光·"问 天" 二字篆体 (gold·占位字形·**勿写真字**)·~80×80px
   旁小注·"召问推演"·暗示

⑦ 朱印状态卡 (~3%·右下角)
   小竹牌·6 朱印徽章排列·状态色 (idle / active / pending)
   "朱印待用·待陛下取用"

⑧ 真假切按钮 (~2%·桌右下·小)
   〔察 实〕朱印·idle 状态·暗示玩家可"察实"切真值视图
   此 trial 仅画 idle·**不画切换后状态**

⑨-⑫ 辅区 (合 ~5-10%)
   ⑨ 简化左右墙·古色·non-distract
   ⑩ 窗·光来源·窗格疏朗·窗外柳新绿或山景
   ⑪ 角落 utility·灯笼 / 拂尘·小
   ⑫ 留白·近留白宣纸底

【汉字处理】所有汉字·**占位字形**·勿写可读真字·
模型出乱字 / 假字形即可·**人不读·只看意象**
诏书 / 殿匾 / 朱印 / sidebar 标签·全占位·

【绝禁】
- 朝代专属·补子官服·乌纱帽·飞鱼服·军机处·红头文件·明清专属物
- 现代 UI·button / modal / tab / panel / 矩形 list / drop-down
- vector / SVG / wireframe / box-style schematic
- 写实数字·真人名·真年号·真诏文·一律占位
- anime / 3D 渲染 / flat illustration / digital painting style

【输出】1280×800·.webp·~300-500 KB
```

---

## §3·Codex 自审 7 项 (任一不通过 → 重生)

```
[1] 视角·       1st-person 略前倾御桌前·非俯视·非全景·非平视
[2] 风格·       宋画工笔·非 anime / 非 3D / 非 flat·留白 30%+
[3] 朝代·       **通用古代意象·非锁明清**·朝服无补子·无乌纱·无飞鱼服
[4] 12 区·     全部到位·8 主区显·4 辅区可缩·sidebar 必清晰
[5] 议事清册·   sidebar ~260px sticky·6-8 建议条·彩 dot·**卷轴样·非现代 list**
[6] 三 hint·   屏风后 hint / 神镜问天 / 真假切按钮·三者 visible
[7] 汉字·       占位字形·非真字·非 OCR 可识
```

---

## §4·12 路径重生 (失败时按下表对照修)

```
A·像现代办公室                → "中国古代帝王私案·朝代通用"·重生
B·物品像 vector / flat        → "真材质·真青铜·真砚黑·边缘锐利可切"·重生
C·sidebar 不明显              → "议事清册 sidebar·~260px sticky·卷轴展开样·6-8 chip 颜色明"·重生
D·屏风后 hint 缺              → "屏风右上角·〔屏风后〕小字 hint·gold·~12px"·重生
E·神镜不清                    → "镜面·〔问 天〕二字·篆体·gold·占位字形·清晰"·重生
F·真假切按钮缺                → "桌右下·〔察 实〕朱印·idle 状态·小"·重生
G·色调偏鲜艳                  → "素宣墨骨·#241e18 / #c9a85f / #8a3a2e / #d4c9b0"·重生
H·朝代偏明清                  → "全部中国古代朝代通用·非补子·非乌纱·非飞鱼服"·重生
I·物品融背景                  → "物品边缘锐利·可单独 alpha 切"·重生
J·写实汉字 (model 写真字)     → "占位字形·勿写真字·非阅读"·重生
K·人物像动漫                  → "水墨工笔·非动漫·非 3D"·重生
L·sidebar 画成 modern list    → "卷轴展开样·非 list 框·非 modern UI"·重生
```

---

## §5·绝对禁止 (raster-only lock·勿违)

```
[禁 1] 输出 .svg / .css / .js / wireframe / 任何代码代替图像
[禁 2] 用 SVG / vector 替代 raster
[禁 3] schematic / box / rectangle 代替图像
[禁 4] 物品嵌入背景画成一体 (要可独立切片)
[禁 5] 写实可读汉字·一律占位字形
[禁 6] 现代 UI 元素入画 (button / modal / panel / tab / drop-down)
[禁 7] modal paradigm·世界即 UI
[禁 8] 朝代专属物 (补子 / 乌纱 / 飞鱼服 / 军机处 / 红头文件 / 任何后代专属符号)
```

> 提醒·之前 v1 阶段曾把 Codex 当 code agent·SVG 代替生图·user 评"荒唐"·此次**raster-only lock·绝禁违**·

---

## §6·完成后·letter back to Claude

```markdown
# Codex → Claude·Phase 8·Wave 0 trial·御书房 hero done

放·web/assets/ui/phase8/scenes/yushufang-trial-w0.webp

自审 7 项·全过 / 部分过 (列哪几项不过 + 重生次数)

效果说明 (~10-15 行·重点)·
- 12 区分布是否合理 (8 主区 + 4 辅区)
- 议事清册 sidebar·卷轴样是否成立
- 屏风后 hint / 神镜问天 / 真假切按钮·三 hint 是否可见
- 汉字占位·model 出何样 (乱字 / 假字 / 真字 / 无字)
- 风格 baseline·宋画工笔是否真宋画感
- 朝代偏向·model 实际偏哪朝 (明清 / 唐宋 / 通用 / 其他)
- 留白比例·真到 30%+ ?

待 user + Claude 双审·
ACK → Wave 1·正殿 + 舆图厅 + 典藏阁 (3 张·按此 baseline)
不通过 → 12 路径重生
```

---

## §7·后续 wave 规划 (此 trial ACK 后)

```
Wave 0   (本次)·   御书房 hero·1 张试·**全朝代通用 baseline**
Wave 1   (ACK 后)· 正殿 + 舆图厅 + 典藏阁·3 张·按本 trial baseline
Wave 2·            铨衡所 + 户部 + 神阁 + 司天监·4 张
Wave 3·            铜镜厅 + 风闻阁 + 学宫 + 天工坊·4 张
Wave 4·            内书房密档 + 朝议 7 幕 + 切场景 transition·~5-7 张
Wave 5·            物品独立切片 + portrait + 主题专属·~50-100 张
Wave 6·            Phase 8 视觉资产完成·进 8-δ wire (~15-20d)
```

---

## §8·trial 风险预判 (未必发生·参考)

```
风险 A·  风格漂·宋画工笔 → digital illustration / anime
         缓解·prompt 强调 "non-digital·real ink wash·brushstroke visible"
         
风险 B·  汉字 model 强行写真字·错·乱·与朝代不配
         缓解·trial 看·若严重·下版用 HTML overlay 方案
         
风险 C·  议事清册 sidebar 画成 modern list 框
         缓解·重生加 "卷轴展开样·非 list·非 modern UI"
         
风险 D·  12 区太多·model 漏 4-5 区
         缓解·重生 prompt 减区 (8 主区强制·4 辅区 optional)
         
风险 E·  全朝代通用·model 必偏向训练集 (大概率明清)
         缓解·此正是 trial 目的·看 model 偏向哪朝·
              偏离严重 → 下版加 reference 锚 (用户提古画)
```

---

## §9·关键 reminder

```
1·  raster-only·绝禁 SVG / 代码代替图像 (memory lock)
2·  全朝代通用·非锁明清 (user 决)
3·  汉字占位·非真字
4·  trial 单张·先看效果·非批量
5·  letter back·user + Claude 双审才进 Wave 1
```

---

ready·Codex 启动·

— Claude (Phase 8·Wave 0 trial yushufang launch·全朝代通用·gpt-image-2·2026-05-05)
