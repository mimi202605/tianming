# 天命项目 · 工作纪律

> 精炼硬规矩。详细背景/进度在记忆系统（`~/.claude/.../memory/`），此处只放「必须遵守」的那几条。

## 验证
- 说「完成 / 已修 / 还坏着 / 没有 X」之前，**先跑命令实查当前状态**，别凭印象、别复述旧诊断当现状。
- 改完代码先 `node` 跑通或跑断言再说完成；关键改动留 `.bak`。
- 回复「我能不能 / 有没有 X」时先核实，别凭记忆下断言。

## 改动边界
- 用户说「改 X」就**只动 X**，别顺手改无关文件（如 styles.css）。preview/mockup 与运行时代码是两条 review 路径，不混。
- 大改拆 3–5 个小 slice，一刀只做一件事，拒绝把无关事捆进同一刀。
- 重写/重构含中文的段落时，**禁止顺手把中文 display name 翻成英文**；改前后 grep 中文 token 数量比对。
- 遇 GBK→UTF-8 乱码：**禁 ASCII-safe 替换**，从 1.1.6 备份做参考还原。
- 对齐 schema 以**运行时渲染器**（`_peRender*` / `_render*Panel`）为权威，preview-*.html 只是 mockup。

## 发版（ship / 热更 / git）
- ship 热更、commit、push 都是**用户显式触发**的动作，别自作主张；进行中的大功能（如科举大改）整套完工前不 ship、不 commit。
- 发热更走 **server-side SSH `python3` 解 zip**，不走 SFTP per-file。
- `changelog.json` 要 `/tianming` 与 `/hot` 两处同步（skill `upload-hot.py` 已自动同步）。
- 发增量包前确认基线对齐，避免「版本号跳最新但 UI 退版」的假更新。
- **热更要发两次**：电脑端（Electron·`build-hot-update-package.js`→服务器 `/tianming/hot/`）和**安卓端**（Capgo·`build-capgo-bundle.ps1`→`/tianming/capgo/`）是**两条独立管线**·同一份 `web/` 源码要分别发·**别只发一端**。一键双端打包：skill `tianming-hotupdate-push` 的 `publish-all.ps1`。SSH 从开发会话被封→两端都走 `gh release`→owner 在服务器 `curl` 拉落位。安卓首更 Capgo 大概率全量(~460MB)·之后才差量。

## 内容与文案 · 跨朝代通用
- **游戏内容（机制 / 事件 / 制度 / 数值）禁止局限于某一朝代**：设计任何内容前先判断「这是中国古代通用的，还是某朝独有的」。通用的进通用层，朝代独有的归剧本数据，绝不把单朝特例硬编进引擎。
- UI 固定文案（chrome）用**朝代中立词**，不写死「内阁 / 票拟 / 司礼监」等明清专名；角色官衔属剧本数据，可保留专名。
- 不臆测 P 社 UI 先例（训练记忆不可信），设计以游戏内截图为锚。

## 协作风格
- 长 `--do` 链里别变成「无情干活机器」，保留判断和人味（owner 反馈）。
