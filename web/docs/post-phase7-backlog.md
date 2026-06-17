# Post-Phase 7 backlog (留档·待启动)

date·2026-05-05·status·**全 4 项均待做·用户优先级未定·暂搁置进新环节**

Phase 7 已闭幕 (ai-infer.js 12602 → 244·-98%·6 module split·verify-all 60/60·all local)·下列 4 项是 Phase 7 closeout letter (`codex-claudecode-dialogue/2026-05-05-claude-p7-eta-theta-done-phase7-closeout.md` §6) 提出的候选方向·**用户已确认 1-4 全要做**·只是先做更重要的事·

---

## 1·commit + push Phase 7 落地

scope·将本地 6 module split + 309 baseline assertions + contract doc §6/§7/§8 推到 `tianming/main`·

工作量·~30min·

依赖·

- 本地无 .git (per `reference_github_push.md`)·需临时 clone 中转
- HTTP/1.1 绕网络问题
- 仓库 `misfit-user/tianming`

落地内容 (本地 vs main 的 diff)·

- 新文件·`tm-endturn-prompt.js`·`tm-endturn-ai.js`·`tm-endturn-apply.js`·`tm-endturn-followup.js`·`tm-endturn-record.js`
- 修改·`tm-endturn-ai-infer.js` (12602 → 244)·`index.html` (load order 加 5 文件)
- 新文件·`scripts/smoke-endturn-baseline-helpers.js` + 11 smoke·`docs/phase7-ctx-contract.md` + `docs/phase7-gamma-prompt-prep.md` + `docs/phase7-prep.md`
- 修改·`scripts/verify-all.js` (加 11 endturn baseline)·部分受影响 smoke (smoke-class-engine·smoke-class-party-bidirectional·smoke-military-systems)

commit 策略·

- option A·单 commit "Phase 7·tm-endturn-ai-infer.js mega-fn split (12602→244·-98%)·6 module"
- option B·按 P7-α/β/γ/δ/ε/ζ/η/θ 分 8 commit (审 PR 友好·但工作量翻倍)

建议·option A·因 8 sub-phase 已在 contract doc §8 表里·codex-claudecode-dialogue/ 也有完整 letter trail·git history 不必复刻·

---

## 2·Phase 8·apply.js 进一步拆

scope·`tm-endturn-apply.js` (4677 行) 是 6 module 中最大·拆 7 字段族·~600 行/字段·

候选 split·

```
tm-apply-chars.js        ~600  (char_updates·_applyChars)
tm-apply-factions.js     ~700  (faction_updates·军势·dynasty)
tm-apply-offices.js      ~600  (office_assignments·六部·任免)
tm-apply-fiscal.js       ~700  (fiscal_adjustments·财政·税收·赋·军费)
tm-apply-admin.js        ~500  (admin·province·civil)
tm-apply-events.js       ~700  (events·event_log·17 类事件)
tm-apply-harem.js        ~500  (harem·后宫·blood_line·marriage)
tm-endturn-apply.js      ~400  (主入口 writeBack·dispatch·import 7 sub-file)
```

工作量·~15-25h (类比 P7-ε)·

风险·

- 7 字段族间有 shared helper (e.g. _logChange·_applyDelta) 需先抽出 common module
- 不像 P7-α/β/γ/δ/ε/ζ/η 是线性·而是 7 路并行 (字段族间无依赖)·可并行 sub-slice
- 但·**ROI 边际**·主入口已 244 行·apply.js 4677 仍是合理 module size·拆 7 文件 仅审更友好·性能不变

建议·**待用户判断 ROI**·若不是为了进一步审更细·可暂缓·

---

## 3·6 系统翻新 phase 5/6 (per `project_renovation_phase0.md`)

scope·阶段 0-4 已定·5/6 待讨论·总预算原 21-30 天压到 ~17-24 天·

目前已知·

- 阶段 0-4 已定·具体 phase 名 + 边界看 `project_renovation_phase0.md`
- 阶段 5/6 待讨论·**具体 phase 名 + scope + 时长 待定**

action·读 `project_renovation_phase0.md` + 历史讨论·确认 5/6 内容·

工作量·待定·

---

## 4·绍宋 1.2 剧本 (per `project_shaosong_scenario.md`)

scope·绍宋是天命第二个官方剧本·release 1.1 已部署 (52 chars·tianming/scenarios)·1.2 设计已写·待启动信号·

目前已知·

- 1.1 release·52 chars·已入 main
- 1.2 规划·写好待启动·**具体 scope + 时长 待读 1.2 设计**

action·读 1.2 设计 doc·确认 scope·

工作量·待定 (类比 1.1 是 ~1-2 周)·

---

## 5·原 closeout letter §6 候选 5·跳

> 5. 空一段·休息·14400 行级重构刚收·先放放

被用户跳过·进新大环节·

---

## 优先级 (用户已默示)

1-4 全要做·**新大环节优先于 1-4**·完成新大环节后回来按用户届时判断的顺序做 1-4·

— Claude (post-Phase 7 backlog 留档·2026-05-05)
