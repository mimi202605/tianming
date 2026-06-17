# sysP 去重 + 五大问题处理方案（可落地·分刀）

> 依据：`web/docs/ai-relay-fullturn-analysis.md` 的全回合实测 + Explore 实查代码。
> 关键事实（已核）：sysP 由 `TM.Endturn.AI.prompt.build(ctx)`（tm-endturn-prompt.js:70）**每回合构建一次**写入 `ctx.prompt.sysP`（L3373）；约 **18 个**子调用经 `var sysP = ctx.prompt.sysP` + `_maybeCacheSys(sysP)` **复用同一份 54.8K**（sc1-family 在 tm-endturn-ai.js，sc15/16/17/18/25c/27/28/07/2/memwrite 在 tm-endturn-followup.js:332 起）。QC 类（sc_audit/记忆压缩/史实核查）**本就用精简英文 system**，不在此列。
> ⇒ **一个咽喉点**：所有大 sysP 都过 `_maybeCacheSys(sysP)`。动它即管全部，低风险。

## sysP 解剖（54,791 字，按块·已测）

| 块 | 字数 | 静/动 | 谁真正需要 |
|---|--:|---|---|
| 开篇·剧本·角色·官制总述 | 6.3K | 静 | **全部**（基底） |
| 关键NPC情节弧 | 1.0K | 动 | sc1/sc15/NPC认知 |
| NPC隐藏议程 | 0.66K | 半静 | sc1/sc15 |
| 势力关系矩阵+黑天鹅+核心张力+社会矛盾 | 5.0K | 半静 | sc1/sc15/sc16 |
| AI推演必守规则10条 | 1.9K | 静 | sc1（主推演规则） |
| 主角双重身份+我是朱由检+权臣+争国本 | 1.7K | 半静 | sc1 |
| NPC间自主交互+战术层 | 1.8K | 静 | sc1/sc15 |
| 势力实力趋势+阶层临界+显著矛盾+玩家目标 | 2.5K | 动 | sc1/sc15/sc16 |
| **鸿雁传书·完整态势** | **3.4K** | 动 | sc1/sc1c文事 |
| **各NPC信息时差**（最大单块） | **6.9K** | 动 | sc1对话/NPC认知 |
| 信件驱动+跨系统关联 | 1.2K | 静 | sc1 |
| 当前行政区划树+不完整声明 | 1.4K | 动 | 涉地块的调用 |
| 你的全部权力+NPC自主行为系统+特质驱动+主动来书+触发情景+性格 | 4.7K | 静 | sc1/sc15（生成NPC行止/书信） |
| 记忆一致性绝对规则 | 2.7K | 静 | sc1/memwrite |
| 官制职能分工 | 2.0K | 静 | 人事类（sc1） |
| 时局要务+社会生灭+真实性原则 | 1.5K | 半静 | sc1 |
| 官制人事扩展动作+office_spawn+品级+致仕+派系格局 | 3.3K | 静 | **仅 sc1**（人事变更落地） |
| office_aggregate | 1.5K | 静 | 仅 sc1（部门聚合） |
| 科举政治 | 0.4K | 静 | 恩科相关 |
| **重要角色名单**（防幻觉） | 0.88K | 动 | **点名类**（sc1/sc18/sc16/memwrite/NPC认知） |
| 当前有效地名名单（防幻觉） | 0.3K | 动 | 涉地块类 |

**可砍量**：纯分析调用（sc17/sc27/sc28/sc25c/sc07）用不到 ≈ **20K**；军事/势力类（sc18/sc16）用不到 ≈ **13K**。

---

## P1【头号·可落地】sysP 分块 + 按调用画像裁剪

**目标**：把"一份大 sysP 喂所有人"改成"按调用需要喂对应块"。不改 API、不改语义，仅改字符串拼接组织 + 派发取用。

### 刀 1A — 拆块（行为零变，纯重组）
在 `tm-endturn-prompt.js` build() 里，把现在 `sysP += ...` 的链式拼接，**改为先拼进命名块对象**再合并：
```js
ctx.prompt.sysBlocks = {
  base:        ...,   // 开篇剧本角色官制 + 规则10条 + 真实性原则（全员必备）
  worldState:  ...,   // 势力矩阵/黑天鹅/张力/矛盾/趋势/玩家目标/行政区划（局势类）
  npcDeep:     ...,   // NPC情节弧+隐藏议程+信息时差+自主行为+性格触发（NPC生成类）
  letters:     ...,   // 鸿雁传书完整态势（文事类）
  personnel:   ...,   // 官制分工+扩展动作+office_spawn+品级+致仕+派系格局+office_aggregate（仅人事落地）
  roster:      ...,   // 重要角色名单+地名名单（防幻觉·点名类）
  socialRules: ...,   // 后宫妃嫔+门阀寒门（叙事类）
  syncRules:   ...,   // 叙事-状态同步铁律+记忆一致性（落地结构化类）
  temporal:    ...,   // 时空约束（全员必备·防穿越）
};
// 现状等价物 = 全块按原序拼接
ctx.prompt.sysP = [base, npcDeep, worldState, letters, ... , roster].join('');
```
**验收**：拼接结果与改前 `ctx.prompt.sysP` **逐字节相同**（写个 diff 断言，diff=0 才算过）。这一刀只重组、不改一个字。

### 刀 1B — profile 表 + `sysPFor(scId)`
```js
const SYS_PROFILES = {
  FULL: ['base','worldState','npcDeep','letters','personnel','roster','socialRules','syncRules','temporal'], // sc1/sc1b/sc1c/sc1d
  NPC:  ['base','worldState','npcDeep','roster','syncRules','temporal'],          // sc0/sc05/sc15/sc15n/NPC认知/memwrite
  FAC:  ['base','worldState','roster','temporal'],                                 // sc16势力/sc18军事（需名单+局势，去NPC深档/书信/后宫/人事）
  LITE: ['base','worldState','temporal'],                                          // sc17财政/sc27诏令周期/sc28快照/sc25c/sc07体检（不点新名、不需深档）
};
function sysPFor(scId){
  const prof = SYS_PROFILE_OF[scId] || 'FULL';     // 拿不准默认 FULL（保守）
  return SYS_PROFILES[prof].map(k=>ctx.prompt.sysBlocks[k]).join('');
}
```
- profile 归属保守起步：**只把最确定安全的几个降到 LITE/FAC**（sc17/sc27/sc28/sc25c/sc07 → LITE；sc16/sc18 → FAC），**其余一律 FULL**。
- 先 `log` 每 profile 实际字数，确认 LITE≈12-15K、FAC≈18-22K 再推进。

### 刀 1C — 换调用点（分两组冒烟）
把 ~18 处 `_maybeCacheSys(sysP)` 改为 `_maybeCacheSys(sysPFor('scXX'))`：
- 组一：tm-endturn-ai.js 的 sc0/sc05/sc1/sc1b/sc1c/sc1d（先全保 FULL/NPC，确认无回归）。
- 组二：tm-endturn-followup.js（L332 起）的 sc15/16/17/18/25c/27/28/07/2/memwrite（逐个按 profile）。
- 每组改完跑一回合冒烟：endTurn 不报错、T→T+1、各 sc 输出字段完整、无"虚构人名/地名"告警（防幻觉名单是否被误删的关键检验）。

**预期收益**：LITE 类（~5 调用）每个省 ~40K、FAC 类（~3 调用）每个省 ~33K ⇒ **turn 级省 ~30-40% 输入**。对 BYOK 第三方中转是真金白银（它拿不到缓存）；对 native 渠道减少 cache-miss 首发体量。
**风险**：LITE/FAC 调用若仍点了名单内人名 → 防幻觉名单缺位。缓解：profile 保守 + roster 块很小（1.2K），FAC/NPC 都保留它；只有纯 LITE 去掉，而 LITE 类（财政/诏令周期/快照/体检）本就不产生人名实体。sc_audit + 一致性审核兜底。

### P1 补充（渠道层·非游戏改）
- native Anthropic：`_maybeCacheSys` 已加 cache_control（重复 sysP 享 ~90% 折扣）；可进一步**对块加分级 cache_control**（base/规则等长寿块单独 ephemeral）提高命中。
- 第三方中转：客户端无法缓存（数组格式会 400）。真正省钱靠 P1 裁剪；如可控中转，可在**中转侧**做 system-prefix 缓存（属 server 改，不强求）。

---

## P2【sc1 减负 + 防降级】
- **刀 2A**：P1 已让 sc1 保 FULL（它需要）。可把 sysP 里"已被 sc15/16/17/18 专项承接"的指导段从 sc1 profile 移除（如把 personnel 扩展动作细则的一部分留给确实做人事的路径）。**谨慎**：逐段确认 sc1 输出未用到再移；拿不准不动。
- **刀 2B（更重要·防整回合降级）**：sc1 要求"首字`{`末字`}`否则整回合降级"。在 sc1 结果**落地解析处**（tm-ai-change-applier 入口 / sc1 parse）前置一道**本地确定性 JSON 修复**（截 ```json 围栏、补未闭合括号、剥前后 prose），仅当本地修复仍失败才走 LLM 修复调用。降低对模型一次成功的依赖。（与 P3-3B 同一处实现。）

---

## P3【QC 调用合并 + schema 同步】
- **刀 3A（真 bug）**：排查 057↔解析器 schema 不同步——057 的 prompt 主讲 `edict_lifecycle_update`，而 JSON 修复(060)显示解析器要 `houren_xishuo/hourenXishuo/houren/zhengwen/new_activities`。定位 057 的 prompt 构建处 + 其结果消费/解析处，**对齐字段名**（要么 prompt 补齐这些键的说明，要么解析器改读 edict_lifecycle）。修好可**省掉每回合一个 JSON 修复调用**。
- **刀 3B**：把 JSON 修复(060)逻辑**本地化**为确定性函数（补必需键空值/闭合结构/剥围栏），LLM 修复仅作兜底。省调用 + 更可靠。
- **刀 3C（可选）**：评估 sc_audit（050，叙事 vs 结构化）与跨 sub-call 一致性审核（058）能否合并为一个审核调用（输入有重叠）。先量二者输入差异再定。
- 注：sc_audit **确有实效**（本回合真抓出 sc1 的 fiscal_adjustments 未落地），不可删，只可合并/前置本地预检。

---

## P4【常朝批量化】
现状：单议题 N 个在场朝臣 = N 次调用（各带 mode 必含约束，且发言趋模板）。
- **刀 4A**：找常朝对话调用点，改为**一次批量生成 K 人表态**（传 K 人档案+各自 mode，返回 K 条 `{name,stance,mode,line}`）。K≤5/批，降调用数。
- **刀 4B（替代/叠加）**：按重要度采样——核心 3-5 人逐个实答（保留个性化），其余降级为一句 `stance` 标签（不单独发调用）。
- 风险：批量易让多人"声音趋同"。缓解：prompt 内强调"K 人须各自独立声口/立场分明"，并保留 mode 必含。

---

## P5【落地层 schema 校验 + 乱码探测·底层保险】
与渠道无关，防弱模型脏输出静默写库（本回合实测模型自发吐 `trajectoryN�xt10Turns`/`north面`/`年迈multi病侵`/`体statute`）。
- **刀 5A**：在 AI 结果落地总入口（tm-ai-change-applier 入口 / 各 sc parse 后）加通用守卫：
  1. `JSON.parse` 成功？失败→走本地修复(P3-3B)。
  2. **U+FFFD（`�`）探测**：命中则记日志 + 剔除该字段（而非整条），不写脏。
  3. 关键英文 key 完整性 + 值里混入成块拉丁字母的探测（白名单枚举除外）。
  4. 失败字段**降级跳过**而非静默入库。
- 这正是我在中转侧每个 builder 做的那层校验（U+FFFD/拉丁残留探测），应内化进游戏落地层。

---

## 落地顺序建议（保守·一刀一事）
1. **P1 刀 1A**（拆块·diff=0 验证）——零行为变更，最安全，先落。
2. **P1 刀 1B**（profile 表 + sysPFor，先全返 FULL，等价现状）——再验等价。
3. **P5 刀 5A**（落地守卫）——独立、纯增益、防脏。
4. **P3 刀 3A**（057 schema 同步真 bug）——独立修。
5. **P1 刀 1C**（按 profile 降 LITE/FAC，分两组冒烟）——收益兑现，风险最高放在守卫(P5)之后。
6. P3-3B/P2-2B（本地 JSON 修复）→ P4（常朝批量）→ P3-3C（QC 合并）按需。

每刀：备份 `.bak` → 改 → `node -c` 语法 → 跑一回合冒烟（endTurn 不崩、T→T+1、字段完整、无幻觉告警）→ 中文 token 数前后比对（防误删/误译）。**全部完工前不 ship 热更、不 commit**（沿用既定纪律）。
</content>
