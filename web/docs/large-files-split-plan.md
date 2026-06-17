# 大文件拆分评估·2026-05-21

> 目标·识别 web/ 下 3000+ 行的非 bundle 文件·按 ROI / 风险 / 工作量给推荐
> 状态·**评估完成·实际拆分待用户拍板**
> 触发·#I5 user 要求评估并拆 1-2 个最值得的

## 当前 5 个候选

| 文件 | 行数 | 函数数 | 行/fn | 当前结构 | 拆分风险 |
|---|---|---|---|---|---|
| tm-ai-change-applier.js | 5295 | 168 | 31 | §1-§8 8 章节·有 navigator 注释 | 🟢 低·章节已分明 |
| tm-endturn-apply.js | 4843 | 44 | 110 | 7 字段族 (chars/factions/offices/fiscal/admin/events/harem) | 🟡 中·有 shared helper 需先抽 |
| tm-tinyi-v3.js | 3942 | 143 | 28 | 廷议·按 stage 1-9 章节 | 🔴 高·**编码事故敏感** (memory) |
| tm-chaoyi-changchao.js | 3932 | 105 | 37 | 常朝·开场/朝议主体/退朝 | 🔴 高·编码事故敏感 |
| tm-ai-infra.js | 3686 | 99 | 37 | callAI 基础设施 | 🟡 中·所有 AI 流量都过它·改一点要全跑 e2e |
| tm-endturn-prompt.js | 3353 | 16 | 210 | 3 个超巨 fn·prompt 字符串拼接 | 🔴 高·字符串硬连不易物理切 |
| tm-endturn-ai.js | 3370 | 36 | 94 | sc0/sc05/sc1/sc1b/sc1c 子调度 | 🟡 中·subcall 已分类清·拆按子调用即可 |

## 推荐顺序 (按 ROI / risk 比)

### A·tm-ai-change-applier.js (强烈推荐先做)

理由·

- 章节注释明确 (§1 路径工具·§2 白名单·§3 实体查找·§4 公库绑定·§5 任免钩子·§6 动态机构·§7 主应用·§8 v2 扩展)
- 168 函数密集·拆后单文件 600-900 行·维护成本明显降
- 不含中文显示字符串·**编码风险低**
- 没有大段 verbatim search/replace 移植·全是结构化 logic

候选 split·

```
tm-ai-change-path-utils.js     ~280  §1 路径解析 + §2 白名单
tm-ai-change-entity-lookup.js  ~90   §3 跨类型 byName
tm-ai-change-fiscal-binding.js ~65   §4 公库绑定解析
tm-ai-change-office-hooks.js   ~240  §5 任免钩子
tm-ai-change-registry.js       ~50   §6 动态机构/区划注册
tm-ai-change-applier.js        ~600  §7 主入口 applyAITurnChanges
tm-ai-change-ext-v2.js         ~3970 §8 v2 扩展通道 (anyPathChanges 全域)
```

**注意** §8 是真正的胖子 (3970 行)·拆 §1-§6 + §7 主入口后·§8 仍然 3970 行·下一刀再细分。

工作量·~4-6h (含 smoke baseline 写 + 跑)
ROI·★★★★

### B·tm-endturn-apply.js (其次推荐)

post-phase7-backlog §2 已经写出 7 字段族 split 方案·按字段族切·~600 行/字段。

工作量·~15-25h
ROI·★★★

### C·tm-endturn-ai.js (中规中矩)

按 subcall 切·sc0/sc05/sc1/sc1b/sc1c 各自一文件。但 subcall 间共享 _runSubcall/_runSubcallBatch·需先抽 common module。

工作量·~6-10h
ROI·★★★

### D·tm-tinyi-v3.js / tm-chaoyi-changchao.js (**不建议动**)

理由·

- memory `feedback_encoding_recovery.md`·这俩历史上 mojibake 过
- memory `feedback_chinese_string_translation_during_refactor.md`·重写 export 段时 LLM 易把 display name 翻译成英文
- 含大量中文 UI 字符串·物理切容易触发编码事故
- 当前 3900 行虽大但 stable·**不动是最佳策略**

ROI·★ (don't)

### E·tm-endturn-prompt.js (**不建议动**)

3 个超巨 fn·全是 prompt 字符串拼接·拆完不改可读性·只增加跨文件跳转成本。

ROI·★ (don't)

### F·tm-ai-infra.js (待定)

callAI / fetch / 截断检测 / 重试·所有 AI 流量经过它·一旦改错全游戏卡死。需要先把整套 AI test fixture 准备好再动。

工作量·~10-15h (含 fixture)
ROI·★★ (高风险中收益)

## 建议执行

**只做 A·tm-ai-change-applier.js §1-§6 + §7 提取**。

- 工作量·4-6h
- 安全·章节已分·无编码风险
- 收益·-90% 主入口文件大小·剩 §8 留作后续
- 验证·verify-all 227/0 + 单独 smoke ai-change-applier-path-utils·entity-lookup·office-hooks 三个 micro-smoke

B/C/F 暂留 backlog·D/E **建议永不拆**。

## 现状不动也行

实际上现在·

- verify-all 全绿
- 用户开发 / Codex 添加新功能正常推进
- 大文件主要是 **审 PR / 改 bug 时的隐形成本**·不是阻塞项

如果近期没有针对 ai-change-applier 的功能扩展计划·**完全可以选择不拆**·把时间给 #I2 (肖像压缩) 或 NPC parity 三本剧本补 (中期产品)。

— Claude (#I5 评估·2026-05-21)
