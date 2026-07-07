# 天命 · 协作手册（双人 trunk-based）

> 新人（和新 Claude 会话）入口。硬规矩在根目录 `CLAUDE.md`（Claude Code 自动加载）；
> 架构守卫详解在 `web/docs/arch-guards.md`；拆分/重构范式在 `web/docs/split-paradigms.md`。

## 一、快速上手

```bash
git clone <本仓>
git config core.hooksPath hooks        # 安装 pre-push 守卫（~12s 的 8 项架构 lint）
```

**资产补全（必做）**：`web/assets/` 的大件（立绘 647MB/字体/音频等）不入 git，走 release 全量包：

```bash
gh release download ship-1.3.4.6 --repo <本仓> --pattern '1.3.4.6.zip'
# 解出其中 web/assets/** 覆盖到本地 clone 的 web/assets/
```

运行：根目录 `npm start`（Electron 壳）。改 `web/` 后需重启方可见（详见 CLAUDE.md）。

## 二、同步节奏（核心约定）

双人共 main，**小刀快合**（一把刀 = 数小时粒度，干完即落）：

1. **开工前**：`git pull --rebase`（每把刀开工必拉，Claude 会话开场必做）。
2. **push 前**：pre-push hook 自动跑 `lint-arch-all.js` 8 项守卫；自己再跑定向 smoke
   `node scripts/run-smokes.js --grep <主题>`（在 `web/` 下）。
3. **push 后**：GitHub Actions 跑守卫 + 全量 smoke 兜底；红了谁的刀谁立刻 fix-forward。
4. PR 只用于两类改动：大范式重构、跨入对方领地的改动。其余直推 main。

## 三、地界与认领

- 按子系统划地界，同一时刻两人（和各自的 Claude agent）在不同象限动刀。
- 开工先在 GitHub Issues 占坑（一句话即可），避免两边 Claude 同时扑向同一片。

## 四、冲突磁铁文件（必读）

| 文件 | 规矩 |
|---|---|
| `web/scripts/arch-baselines/*.json` | **永不手工合并**。rebase 冲突时取任意一侧，然后重跑对应 lint 的 `--update` 重新生成（棘轮只许收紧）。 |
| `web/index.html` 脚本区 | 只做行级小改；rebase 勤。拆分家族成员改动须整族 bump `?v=` 戳（守卫⑦会拦）。 |
| `web/scripts/lint-split-contracts.js` | 只追加条目，按拆分编号序插入。 |

## 五、刀纪律精要（全文见 CLAUDE.md）

- 一刀一事，大改拆 3–5 slice；说「完成」前先实跑命令验证。
- 重构**禁止顺手把中文 display name 翻英**；改前后 CJK 计数比对。
- 行为等价重构的自证标准：**trim 行多重集差集**（原行零丢失，差集只含申报过的脚手架）。
- GM/P 直写走账（mutator/ledger 或 `// arch-ok` 裁定），`lint-gm-writes` 按源封顶。
- 新 flag 必配设置开关；机制内容跨朝代通用，单朝特例归剧本数据。

## 六、提交风格

commit message 用「战报体」：首行=刀名+量化战果，正文=范式/契约/验证结论。
这不只给人看——**对方的 Claude 靠它读懂你动了什么**。

## 七、发版边界

热更/发版/打包（`scripts/release.js`、双端管线、服务器 autodeploy）**只由仓主触发**。
合进 main ≠ 发版。

## 八、CI 说明

`.github/workflows/ci.yml`：8 项守卫 + 全量 smoke（`web/scripts/ci-smokes.js`）。
fresh checkout 无大资产，故 `arch-baselines/ci-smoke-allowlist.json` 白名单豁免三个
缺资产 smoke（audio-bgm / mapeditor-ui / scenario-editor-reset-preview）；
新增豁免须双方点头。
