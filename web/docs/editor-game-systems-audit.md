# editor-game-systems.js Audit

date路2026-05-03 路 status路**Phase 1 slice 7路Claude audit 路 寰?Codex review**

鏉ユ簮路`web/editor-game-systems.js` (2,449 琛?路鍘熷ご娉?鍓ф湰缂栬緫鍣?鈥?绉戞妧/鏀跨瓥/鍙橀噺/瑙勫垯/浜嬩欢/鏃堕棿绾?

瀹為檯鍐呭路**18 sub-section** (杩滆秴澶存敞 6 椤孤?*鏈€澶?editor 鐭ヨ瘑缁?*)

---

## 1路鍏?18 Sub-section

| 搂 | 琛岃寖鍥?| 鍐呭 | 浼拌 | 鍏叡鍑芥暟 |
|---|---|---|---|---|
| 1 | 1-151 | **绉戞妧鏍?* (military/civil) | ~150 | renderTechTree / addTech / editTech*/Mil/Civil / deleteTech*/Mil/Civil / editTechItem / + 閫氱敤 _costRow / _effectRow / _addCost/_addEffect / _collectCosts/_collectEffects / _buildTechCivicForm / _renderTechCard |
| 2 | 152-198 | **姘戞斂鏍?* | ~50 | renderCivicTree / addCivic |
| 3 | 199-498 | **鍙橀噺** (base/other/formula) | ~300 | renderVariables / addBaseVar / editBaseVar / deleteBaseVar / addOtherVar / editOtherVar / deleteOtherVar / addFormula / editFormula / deleteFormula |
| 4 | 499-535 | **瑙勫垯** | ~40 | renderRules / updateRule |
| 5 | 537-708 | **浜嬩欢** | ~170 | renderEvents / addEvent |
| 6 | 710-794 | **鏃堕棿绾?* | ~85 | renderTimeline / _buildTimelineForm / _collectTimelineForm / addTimeline |
| 7 | 797-879 | **鐩爣 Goals** | ~80 | renderGoalsList / addGoalEntry / editGoalEntry / deleteGoalEntry / aiGenerateGoals |
| 8 | 880-948 | **甯濈帇璇忎护** | ~70 | render/add/edit/deleteImperialEdictEntry |
| 9 | 950-1037 | **瑙︽€掗泦鍥?(OffendGroups)** | ~85 | render/add/edit/deleteOffendGroups + aiGenerateOffendGroups |
| 10 | 1042-1146 | **褰卞搷鍔涢泦鍥?(InfluenceGroups)** | ~105 | render/add/edit/deleteInfluenceGroup |
| 11 | 1147-1424 | **鍚庡路harem rank** | ~280 | _haremRankColor / _haremRankModal |
| 12 | 1425-1696 | **瀹路palace** | ~270 | _palaceModal |
| 13 | 1697-1849 | **鏄捐憲鐭涚浘 (榛戞牸灏斿摬瀛?** | ~150 | renderContradictions / addContradiction / editContradiction / deleteContradiction |
| 14 | 1850-1977 | **鎴樹簤娉曞垯路warConfig** | ~130 | renderWarConfig / addWarCB / editWarCB |
| 15 | 1978-2052 | **鍒濆鎭╂€?闂ㄧ敓** | ~75 | renderInitialEnYuan / addInitialEnYuan / addInitialPatron |
| 16 | 2053-2085 | **琛屾斂灞傜骇路adminConfig** | ~30 | renderAdminConfig |
| 17 | 2086-2136 | **NPC 琛屼负/浜や簰** | ~50 | renderNpcBehaviors |
| 18 | 2137-2449 | **Prompt 妯℃澘 + mechanicsConfig** | ~310 | openPromptOverridesEditor / openMechanicsConfigEditor / _mc* (coupling/behavior/agenda/eraRules/tradeRoute) 6 瀛?|

---

## 2路鎷嗗垎鎻愯路**13 鏂囦欢 (涓瓑绮掑害路鍚堢悊鍚堝苟)**

| # | 鐩爣鏂囦欢 | 鏉ユ簮 搂 | 浼拌 | 澶囨敞 |
|---|---|---|---|---|
| 1 | `editor-form-tech-civic.js` | 搂1 + 搂2 | ~200 | 绉戞妧 + 姘戞斂鍏辩敤 _costRow / _effectRow utils路鍚?|
| 2 | `editor-form-variables.js` | 搂3 | ~300 | 鍙橀噺 base/other/formula |
| 3 | `editor-form-rules.js` | 搂4 | ~40 | 灏徛锋垨鍚堝苟 events |
| 4 | `editor-form-events.js` | 搂5 | ~170 | 浜嬩欢路5 绫?(historical/random/conditional/story/chain) |
| 5 | `editor-form-timeline.js` | 搂6 | ~85 | 鏃堕棿绾?(past/future) |
| 6 | `editor-form-goals.js` | 搂7 | ~80 | 鐩爣 + AI 鐢熸垚 |
| 7 | `editor-form-edicts.js` | 搂8 | ~70 | 甯濈帇璇忎护 |
| 8 | `editor-form-influence-groups.js` | 搂9 + 搂10 + 搂15 | ~270 | 瑙︽€?褰卞搷鍔?鍒濆鎭╂€ㄩ棬鐢熉峰潎 NPC 闆嗗洟鍏崇郴 |
| 9 | `editor-form-harem-palace.js` | 搂11 + 搂12 | ~550 | 鍚庡 + 瀹路鍧囧悗瀹煙 |
| 10 | `editor-form-contradictions.js` | 搂13 | ~150 | 榛戞牸灏旂煕鐩韭风嫭绔嬪煙 |
| 11 | `editor-form-war-admin.js` | 搂14 + 搂16 | ~160 | 鎴樹簤娉曞垯 + 琛屾斂灞傜骇路鍧?system config |
| 12 | `editor-form-npc-behaviors.js` | 搂17 | ~50 | NPC 琛屼负妯℃澘 |
| 13 | `editor-form-prompts-mechanics.js` | 搂18 | ~310 | Prompt + mechanicsConfig路UI 鍦ㄤ竴涓?modal路鍚?|

**鎬宦穨2,435 琛?鈮?2,449 (鍘?**路OK 鎷嗗畬銆?
---

## 3路鍏辩敤 utils 澶勭悊

搂1-搂2 鍏辩敤 (cost/effect rows)路

```js
function _costRow(c, i, prefix) { ... }
function _effectRow(varName, delta, i, prefix) { ... }
function _addCostRow(prefix) { ... }
function _addEffectRow(prefix) { ... }
function _collectCosts(prefix) { ... }
function _collectEffects(prefix) { ... }
```

鎻愯路

- 閫夐」 A路**inline 鍏?`editor-form-tech-civic.js`** (绉戞妧/姘戞斂鏄富鐢峰彉閲?浜嬩欢鍙兘涔熺敤)
- 閫夐」 B路**鎶藉嚭 `editor-form-shared-utils.js`** (璺?form 鍏辩敤路~70 琛?

鎴戝€惧悜路**B路shared utils**路鍥犅?
- 6 utils 鏄€氱敤 cost/effect 琛屄?*浜嬩欢/瑙勫垯/褰卞搷鍔涢泦鍥篃鍙兘鐢?*
- 鍗曠嫭鎶藉嚭路鍚庣画 form 鍙鐢?- 鍛藉悕 explicit路`editor-form-shared-utils.js` 璐ｄ换娓?
---

## 4路鎷嗗垎椤哄簭寤鸿 (P3 鍚姩鏃?

鎸?risk + size路

| Slice | 鏂囦欢 | 浼版椂 | risk |
|---|---|---|---|
| 1 | shared utils 鎶?(B) | 0.5h | 浣?|
| 2 | rules + events + timeline (搂4-6) | 1h | 浣?|
| 3 | goals + edicts + npc-behaviors + war-admin (搂7-8 + 搂16-17) | 1h | 浣?|
| 4 | tech-civic (搂1-2) | 1h | 涓峰叡鐢?utils |
| 5 | variables (搂3) | 1h | 涓穊ase/other/formula 3 绫?|
| 6 | influence-groups (搂9-10 + 搂15) | 1h | 涓? sub-form |
| 7 | contradictions (搂13) | 0.5h | 浣?|
| 8 | harem-palace (搂11-12) | 1.5h | 楂樎峰鏉?modal路~550 琛?|
| 9 | prompts-mechanics (搂18) | 1h | 楂樎? _mc* 瀛惵穨310 琛?|
| 10 | delete editor-game-systems.js + verify-all + smoke | 0.5h | 鍏抽敭 |

**鎬宦穨9 hours路~1.5 day**

---

## 5路Phase 瀹夋帓

- **Phase 1 (鏈?audit)**路**浠?audit + propose**路**涓嶅姩浠ｇ爜**
- **Phase 3路鎷?*路鎸?搂4 椤哄簭路姣?slice verify-all + smoke 蹇呯豢
- **鏇夸唬鏂规 (濡?Codex 涓嶅悓鎰?13 鏂囦欢 涓瓑绮掑害)**路**18 鏂囦欢 1-1 鎷?* (姣?sub-section 1 鏂囦欢)路鏇?explicit路鏇寸粏

---

## 6路渚濊禆

editor-game-systems.js 渚濊禆 (澶存敞)路

- `editor-core.js`路scriptData / escHtml / autoSave / etc

鎷嗗悗路姣?form 鏂囦欢渚濊禆鍚屄?*鏃犳柊澧炰緷璧?*

---


## 6.5·Wrapper/IIFE boundary audit

- 这份文件不是单个顶层 IIFE wrapper；前半段是直接挂载的 editor 脚本，后半段夹着几个局部自执行块。
- 小 IIFE 只包住局部编辑器动作：`184-198`、`596-644`、`710-730`。
- 真正需要防切的长包裹段是 `1061-2072`，它把 `renderHaremConfig`、`renderPalaceSystem`、`renderContradictions`、`renderWarConfig`、`renderInitialEnYuan`、`renderAdminConfig`、`renderNpcBehaviors` 和 `renderAll` override 包在一起。
- 切分规则：任何 Phase 3 slice 都不能穿过一个仍然打开的 `})()`；如果目标片段碰到这个大包裹段，必须先重划边界，再拆文件。
- 这也意味着 `editor.html` 的 script tag 重排不能先于边界验证。
## 7路index.html 鍔犺浇椤哄簭

闇€ verify路editor.html 鏄惁浠?load editor-game-systems.js路鎷嗗悗鏀?13 涓?script tag路**Phase 3 鎷嗘椂鍚屾鏀?editor.html**

---

## 8路鍏叡 API (window.X) audit

搂13路`window.renderContradictions / window.addContradiction / window.editContradiction / window.deleteContradiction`
搂14路`window.renderWarConfig / window.addWarCB / window.editWarCB`
搂15路`window.renderInitialEnYuan / window.addInitialEnYuan / window.addInitialPatron`
搂16路`window.renderAdminConfig`
搂17路`window.renderNpcBehaviors`

鍏朵粬 sub-section路鍏ㄥ眬鍑芥暟 (鏃?window.X 鏄惧紡)路

鎷嗗悗路**淇濈暀 window.X alias**路閬?break editor.html 璋冪敤路**Phase 5 鏃堵?*TM.Editor.Form.X namespace路alias 閫€褰?*

---

## 9路Tests

褰撳墠路editor-game-systems.js 鏃?specific smoke路渚濊禆 syntax-check + headless-smoke路**Phase 3 鎷嗘椂路鎻愯鍔?editor-form-* smoke** (mock scriptData路call render*路楠?DOM 鍐欏嚭)

---

## 10路缁撹

- **18 sub-section**路**杩滆秴澶存敞鍛藉悕 6 椤?*路**纭 editor 鏈€澶х煡璇嗙粨**
- 鎻愯鎷?**13 鏂囦欢 涓瓑绮掑害** (澶囬€?18 1-1 鎷?
- shared utils 鎶?(~70 琛?
- 鎷嗗垎椤哄簭路浣?risk first路harem-palace 鏈€ risky路prompts-mechanics 绗簩
- Phase 3 鍚姩鏃堵穨9 hours / ~1.5 day
- **淇濈暀 window.X alias路Phase 5 namespace 杩?*

---

## 11路寰?Codex review

- 13 鏂囦欢涓瓑绮掑害 vs 18 鏂囦欢 1-1 鎷喡烽€夊摢涓?- shared utils路閫?A inline vs B 鎶藉嚭
- 鎷嗗垎椤哄簭鍚堢悊鎬?- 鏄惁闇€ Phase 1.5 鍐?editor-form-* smoke (vs Phase 3 鍚屾)

鏃?commit路鏃?push路**audit 浠?doc路涓嶅姩浠ｇ爜**銆?
鈥?Claude
