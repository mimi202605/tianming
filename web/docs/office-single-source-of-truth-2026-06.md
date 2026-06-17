# 官制树·单一真相源重构 (2026-06-12)

## 病
玩家报三症状:①官制树不与人物实际官职同步 ②官员这回合正常下回合变布衣 ③人物图志不反映推演人事变动。

根因(turn-18 真存档实证):**双源真相**——`GM.officeTree` 每职位的 `holder/actualHolders`(谁坐位子) 与人物 `officialTitle/title` 各自维护,只靠任命/罢免显式双写同步,双写依赖 AI输出 `dept/position` ⇄ 树节点名 ⇄ 人物 officialTitle 三方精确匹配,长期漂移。

- **症状②**:许多树 holder 的 `officialTitle` 已是 undefined(靠 title 兜底),endturn 罢免无条件清 `title=''` 而 `officialTitle` 仅在 `===oc.position` 时清→两字段全空→布衣。
- **症状③**:office_changes 落地被"树节点精确匹配"卡死(`tm-endturn-apply.js` walkTree),AI 报的 dept/position 对不上树时 `ch.officialTitle` 根本没写,只进叙事。
- **次因**:存档 chars 有重复人物(残桩#0 无 officialTitle + 真#1),`findCharByName` 命中残桩。

## 决策 (owner 2026-06-12)
- **单一真相源 = 人物 officialTitle**;官制树每次渲染从人物**派生**任职者,彻底消漂移。
- **树展开包含全部任职者**:编制外的本朝活跃官按分类器挂动态部门。

## 架构
- **结构权威**仍是 `GM.officeTree`(部门/职位/编制/世袭);只有 holder 被重算。
- **`_offSyncHoldersFromChars(opts)`** (tm-office-system.js) 派生流水线:
  - Pass0 导入(`opts.importSeats`):树既有 holder 回填到缺 officialTitle 的人物(保剧本 government.nodes 授予的座)。
  - Pass1 硬锁:既有 holder 活着且仍 claim 兼容→原地保留(保左/右侍郎等重名槽位绑定稳定)。
  - Pass2 贪心填空:余 claims × 余槽容量按匹配分(阈值40)。
  - Pass3 编制外:未匹配的**本朝(realm)**活跃官→按 `_OFFICE_CLASSIFIER_PATTERNS` 挂动态部门(`_offDynamic` 标记,每次重建)。
  - Pass4 重算 counts(保留 office_aggregate 的匿名填充占位 `filledTurn`)。
- **匹配评分** `_offTitleSlotScore`:精确等100/部门+职位98/包含88/最长公共子串≥4→76/核心后缀(尚书侍郎都督总兵大学士…)+部门对应72。
- **realm 过滤**:只收 `faction===玩家朝廷`(`_offResolveRealmFaction`:GM.playerFaction→player char faction→人数最多 faction)。敌国/外藩封号("后金汗"/"征夷大将军")绝不进本朝树。
- **排除**:致仕罢归(`_OFF_RETIRE_RE`)、后宫封号(`_OFF_HAREM_RE`)、皇帝(已是树根)。
- **去重** `_offDedupGMChars`:合并同名重复人物到最丰富条目(只补不覆盖字段)。
- **签名守卫** `opts.ifChanged`:渲染高频调用·chars officialTitle 哈希未变则跳过。

## 接线 (5处)
| 点 | 文件 | 调用 |
|---|---|---|
| 官制树 SVG 渲染 | tm-office-runtime.js `renderOfficeTree` | `{ifChanged:true}` |
| 御案右栏 | phase8-formal-rightrail.js `rightOfficeTree` | `{ifChanged:true}` |
| endturn office_changes 后 | tm-endturn-apply.js | `{force:true}` |
| 读档 | tm-save-lifecycle.js | `{importSeats,dedupChars,force}` |
| 开局 | tm-patches.js | `{importSeats,dedupChars,force}` |

## office_changes 改造 (治症状②③)
- 树无精确匹配的 appoint/dismiss 仍写人物 officialTitle(`_ocMatchedTree` 追踪+回退),派生据此落座/卸座→图志反映。
- 卸任改用 `_offRemoveCharOfficeTitle`(title 同步为剩余主职·无职才空)·防误清成布衣。

## 验证
- `scripts/verify-office-sync-derive.js`(18断言·对 turn-18 真存档):复现36/37正式座·改座3(兼任/重名槽·无害)·丢座0·敌国/后宫不入树·编制外进动态组·去重214→202·officialTitle 同步20/20·幂等。
- `scripts/smoke-office-derive-contract.js`(12断言):AI改officialTitle即落座·卸单职真布衣·兼任卸一职不误布衣·敌国不入树·幂等。
- 既有 smoke-office-appointment-sync(30)/imprison-dismiss-refresh(17)/concurrent(15) 无回归。

## 人物图志
TMZhi(tm-renwu-tuzhi.js) 读 `officialTitle||title||'布衣'`·open 时重建·officialTitle 成真相+去重后自动正确·无需接线。

## 备份 / 状态
`.bak-officesync-20260612`:tm-office-system / tm-office-runtime / tm-endturn-apply / tm-save-lifecycle / tm-patches。**未 ship**·待 owner 实测。
