# Phase 8-β UI baseline·prep doc

date·2026-05-05·status·**prep / hold·待 mood board user 确认后启**·owner·Claude (8-β)

---

## 0·目标 + 约束

**目标**·UI 翻修过程任意 sub-phase 后·跑 baseline·防止"改一屏破另一屏"·

**约束**·按 8-α prep + Codex 5Q 答 + 项目原则·

| 约束 | 来源 |
|---|---|
| 项目刻意零 npm 依赖·零编译 | `package.json` 头注释·`_no_dependencies: true`·`_no_build: true` |
| 已有零依赖测试基建·禁重发明 | `tm-test-harness.js` (浏览器原生) + `scripts/headless-smoke.js` (Node vm stub·212 测试) + `scripts/render-smoke.js` (17 panel) |
| Codex 同意 playwright + 双层 baseline | 见 5Q Q5 答·**但**未考虑零依赖原则 |
| deterministic·mask 动态文本 / AI live / toast / 生成区 | Codex 5Q Q5 |
| 不破现 verify-all 60/60 | Phase 7 守则延 |

**矛盾**·Codex 答 playwright vs 项目零依赖原则·**本 doc 重列 option·待共识**·

---

## 1·visual baseline vs structural baseline·分清

UI baseline 实际是两类·

### 1.1 structural baseline (DOM 结构 / class / innerHTML)

- **抓什么**·DOM 树 + innerHTML + class 列表 + style 属性 (inline)
- **能查**·HTML 结构改坏·class 重命名 grep 漏·组件 mount/unmount·panel 挂载错位
- **不能查**·颜色 / 字体 / spacing / 图片实际显示 / 主题切换 visual / 动画
- **跑**·零依赖·Node vm stub·**已有 render-smoke 是 v0**
- **速度**·秒级
- **频次**·verify-all 每跑都过

### 1.2 visual baseline (真 screenshot pixel diff)

- **抓什么**·实际 PNG 截图
- **能查**·全部 visual 现象·颜色 / 字体 / spacing / 图片 / 主题切换效果 / 动画 stop frame
- **不能查**·非 visual 行为 (e.g. 数据计算)·**但 UI 翻修阶段这正是关键**
- **跑**·真浏览器渲染·必须有 Chromium / Firefox / Edge
- **速度**·分钟级 (140 张)
- **频次**·sub-phase 里程碑跑·非每 commit

**Phase 8 UI 翻修必须 visual baseline·structural baseline 不够**·原因·

- 8-γ token 改·DOM 不变·CSS 变·structural 0 diff·visual 100% diff
- 8-δ rail icon 占位·DOM 加 `<img>`·structural 改·visual 改
- 8-η 最终素材·DOM `src` 替换·structural 改·visual 改

但 structural baseline 仍有用·**与 visual baseline 互补**·非互斥·

---

## 2·5 个 baseline 实施 option

| option | 工具 | 类型 | 依赖 | 速度 | 推荐度 |
|---|---|---|---|---|---|
| **A** | playwright (npm) | visual | npm install·破零依赖原则 | 中 | ★★ |
| **B** | puppeteer-core + 本机 Chrome | visual | npm install·稍轻 | 中 | ★★ |
| **C** | Electron 自带 Chromium | visual | 无新依赖·Electron 已是项目 dep | 中 | ★★★★ |
| **D** | 扩展 render-smoke·DOM innerHTML snapshot | structural | 零·Node vm stub | 极快 | ★★★ (互补·非主) |
| **E** | **混合·D structural + C visual** | 双层 | C 复用 Electron | quick D 快·full C 中 | **★★★★★** |

### 2.1 option A·playwright

- 优·主流·API 全·image diff lib 全 (pixelmatch)·中文支持好
- 劣·**npm install·破 `_no_dependencies: true` 原则**·~150MB Chrome 下载

### 2.2 option B·puppeteer-core + 本机 Chrome

- 优·包小·不内置 Chrome
- 劣·仍 npm install·破原则·user 本机需有 Chrome

### 2.3 option C·Electron 自带 Chromium

- 优·**Electron 已是项目部署目标·无新依赖**·零编译延续 (Electron 跑源文件)
- 劣·写 dev-only Electron entry script·~200 行·与正式 Electron 打包并存
- **实施**·`scripts/baseline-screenshots.js` Node script·spawn Electron·load file://index.html·遍历 20 屏·`webContents.capturePage()` 写 PNG

### 2.4 option D·扩展 render-smoke·structural snapshot

- 优·零依赖·秒级·入 verify-all
- 劣·**仅 DOM·非 visual**·UI 翻修阶段不够
- **实施**·扩 `scripts/render-smoke.js` v1·加 panel snapshot·diff DOM tree

### 2.5 option E·混合·D + C

- **structural baseline** (option D)·扩 render-smoke·~30 panel snapshot·**入 verify-all**·每跑都过·防 DOM 结构 regression
- **visual baseline** (option C)·Electron Chromium·**20 屏 × 7 主题 = 140 张**·**不入 verify-all** (慢)·sub-phase 里程碑手工跑·diff PNG 用 Node-native pixelmatch (~80 行自写) 或简单 file size + Base64 hash 比对

**option E 优势**·

- ✅ 零 npm 依赖 (Electron 已有)
- ✅ 双层覆盖·structural 快 + visual 全
- ✅ verify-all 不变重 (仅 +1 structural check·~1s)
- ✅ visual baseline 仅里程碑跑·不影响日常
- ✅ Codex 5Q Q5 双层 baseline plan 落地 (quick = D·full = C)

我推荐 **option E**·待 user / Codex 共识·

---

## 3·deterministic demo save 设计

### 3.1 现存 save 系统

- `tm-save-manager.js` 816 行·`tm-save-lifecycle.js` 1059 行
- save 走 IndexedDB (主) + localStorage (索引<2KB)·见 L15-28
- save 数据 key·`tm_save_<id>`·内容·`{GM, P, meta, version, ...}` JSON

### 3.2 demo save 方案

**A·git-tracked JSON file**·`web/baseline/phase8/demo-save.json`·

- 内容·一份完整 save (GM 全状态 + P 配置)·**人工调好**
- 加载·baseline harness 启动时·`localStorage.setItem('tm_save_demo', JSON.stringify(...))` + 触发 `TM.Save.load('demo')`
- 优·git-tracked·diff 可见·人工可改
- 劣·~50-200KB JSON·git 体积·复杂状态难手编

**B·script 生成**·`scripts/build-demo-save.js`·

- 内容·deterministic seed (e.g. `Math.random` 替为种子 PRNG)·脚本生成 GM/P 全状态
- 加载·同上
- 优·deterministic·脚本可调·git diff 仅 script
- 劣·脚本写复杂·维护成本

**C·真存档导出**·从 user 真游戏 1 回合存档导出·json 化·

- 优·真状态·覆盖广·快
- 劣·user 私人数据混入·非 deterministic (AI 生成内容随机)

**推荐 A·git-tracked JSON**·配 `scripts/build-demo-save.js` 半自动 helper (option B 部分)·

### 3.3 mask 策略 (deterministic 不够时)

某些区域无法 deterministic·必须 mask·

| 区域 | 原因 | mask 方法 |
|---|---|---|
| AI live indicator (`#bar-ai-live`) | 真时间状态 | CSS `visibility: hidden` 或 baseline 跑前 disable |
| Toast (`#toast`) | 随机弹出 | clear before screenshot |
| 加载条 (`#loading-fill`) | 进度变 | freeze frame·pre-set width |
| 时间相关字段 (今日 / 现在) | 系统时钟 | mock `Date.now()` to fixed |
| AI 生成内容 (#turn-modal body) | 真 AI 调 | 用 demo save 内 fixed AI 输出 |
| 错误日志 / debug 数字 | 计数器 | hide selector |

mask config·`web/baseline/phase8/mask.json`·

```json
{
  "hide": ["#bar-ai-live", "#toast", "#gs-status-tip"],
  "freeze": [{"selector": "#loading-fill", "width": "60%"}],
  "mockDate": "2024-01-01T12:00:00Z"
}
```

---

## 4·20 屏列表 lock (Codex 5Q Q5 落地)

按 `phase8-alpha-prep.md` §2 区域 + 关键交互态·

| # | 屏 / 状态 | 触发方式 | 优先级 |
|---|---|---|---|
| 1 | `#launch` 默认 | 进入 index.html | ★★★ |
| 2 | `#launch` 剧本选择 | click "开卷" → 剧本列表 | ★★ |
| 3 | `#G` 主屏 default | 加载 demo save | ★★★ |
| 4 | `#G` + drawerLeft (势力) | click rail "势" | ★★★ |
| 5 | `#G` + drawerLeft (科举) | click rail "科" | ★★ |
| 6 | `#G` + drawerLeft (天下图) | click rail "图" | ★★ |
| 7 | `#G` + drawerRight (朕亲) | click rail "朕" | ★★★ |
| 8 | `#G` + drawerRight (紧要之臣) | click rail "臣" | ★★★ |
| 9 | `#G` + drawerRight (帑廪) | click rail "帑" | ★★ |
| 10 | `#turn-modal` 史记弹窗 | trigger 回合后展示 | ★★★ |
| 11 | `#loading` 加载层 | freeze 中段 | ★★ |
| 12 | 朝议视图 (`tm-chaoyi-changchao.css`) | click fab "朝议" | ★★★ |
| 13 | 廷议视图 (`tm-tinyi-v3.css`) | trigger 廷议 | ★★ |
| 14 | 浮按钮·诏付有司 (右下) | hover/active state | ★★ |
| 15 | 浮按钮·御案时政 (底部居中) | hover/active state | ★★ |
| 16 | 设置弹窗 (`#settings-bg`) | click ⚙ 或 Ctrl+, | ★★ |
| 17 | 卷宗存档管理 | click 存档浮按钮 | ★★ |
| 18 | 邸报 changelog | click "📜 邸报" | ★ |
| 19 | 12 表 UI (memory-ui) | trigger 记忆面板 | ★ |
| 20 | 选任器 v2 / 官制 (.og-) | click 官制 tab | ★★ |

7 主题切换·切 default / paper / scroll / blue / celadon / vermillion / highcontrast 各跑一遍 = 140 张·

quick gate (3 主题·default / celadon / highcontrast) = 60 张·~2 min Electron 跑·

---

## 5·实施 sub-slice (待 mood board 后启)

按 Phase 7 P7-β 模式·**8-β 是 Claude 一人活·不需拆给 Codex**·

| sub-slice | scope | 估时 |
|---|---|---|
| **8-β-1** | demo save 编 (option A·git-tracked JSON) + `scripts/build-demo-save.js` helper | ~1d |
| **8-β-2** | structural baseline (option D)·扩 render-smoke v1·加 panel snapshot + DOM diff·入 verify-all | ~1-2d |
| **8-β-3** | visual baseline harness (option C)·`scripts/baseline-screenshots.js` (~250 行 Electron entry)·遍历 20 屏 × 7 主题 | ~2d |
| **8-β-4** | 跑 baseline·140 张存 `web/baseline/phase8/snapshots/{theme}/{screen}.png` (git LFS or git-tracked) | ~0.5d |
| **8-β-5** | mask config + diff tool (Node-native pixelmatch ~80 行自写) + tolerance 1% | ~1d |
| **8-β-6** | letter to Codex·8-β done·greenlight 8-γ token | ~0.1d |

总 ~5-7d·与 8-α prep 估时一致·

---

## 6·git LFS or 直 commit·140 张 baseline PNG

140 张 PNG·每张 ~300-800KB·总 ~50-100MB·**git 直 commit 会大胖仓库**·option·

- **A·git LFS**·标准方案·user 需装 LFS·misfit-user/tianming GitHub 默认已支持
- **B·git 直 commit**·简单·100MB 在 repo size limit (1GB) 内·但克隆慢
- **C·不入 git·local-only**·baseline 在本地·.gitignore 排除·**diff 仅人工跑**

我推荐 **C·local-only**·因·

- baseline 是 dev-time check·非 production
- 100MB git 直 commit 影响 clone 速度·影响 reference_github_push.md 工作流 (临时 clone 中转 + HTTP/1.1)
- 真要存 repo·git LFS·但 LFS 配置门槛 > local-only

**baseline 文件 path**·`web/baseline/phase8/{snapshots,demo-save,mask}/`·.gitignore 排除·

---

## 7·5Q for Codex (本 doc 待答)

**Q1·5 option 选哪**·我推荐 **option E (D + C 混合)**·你 5Q Q5 答 playwright·考虑零依赖原则后·**option E 是 zero-dep 版本的 playwright equivalent**·你认可吗？

**Q2·demo save** (§3 ABC) ·我推荐 A (git-tracked JSON)·你 OK？

**Q3·20 屏列表 lock** (§4)·有需要加 / 减 / 改 priority 的吗？

**Q4·140 张 PNG 入 git 否** (§6 ABC)·我推荐 C (local-only)·你 OK？

**Q5·structural baseline 入 verify-all 否**·扩 render-smoke v1·加 ~30 panel DOM snapshot diff·~1s 加成·你 OK？

---

## 8·hold·待 mood board 启

按 user "等我看 mood board 再启" + Codex letter "在 mood board 和截图基线完成前·不做运行时代码改动"·

本 doc **prep only·非实施**·

启动条件·

1. Codex 出 4 张 mood board (A 山水主屏·B 篆刻 rail·C 朝服官制·D 碑帖标题)
2. user 看·visual 共识 (lock / 改方向 / 推翻重出)
3. Codex 写 `phase8-visual-direction-lock.md`·palette + 构图禁区 + 纹理密度 + 边框 + icon 语法 + 资产命名 + prompt 模板
4. user / Codex 答本 doc Q1-Q5
5. **8-β 实施**·sub-slice 1-6 (~5-7d)
6. 8-β done letter to Codex·greenlight 8-γ token

无 commit·无 push·**all local**·

— Claude (Phase 8-β prep done·hold·2026-05-05)
