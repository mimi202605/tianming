# 廷议大改·Slice 0 prep·实际代码 + 命令

date·2026-05-23·status·**ready to apply on kickoff**

source·audit by Explore agent (2026-05-23)·实际 file:line confirmed against `tm-tinyi-v3.js` (3942 行) / `tm-chaoyi.js` (45K) / `tm-patches.js` (162K)

工时·**1.0d** (v1.5·原 0.5d + 0.5d v3 audit·audit 部分已完成)

---

## 0. Pre-flight checklist

实施前·必须·

- [x] doc 已备份 (`D:\tianming-backups\2026-05-23\`·见 `backup-critical-docs.ps1`)
- [x] v3 现有 UI 字串 audit (本文件含)
- [ ] **user 拍板正式启动 sprint**
- [ ] 创建 task #130-145·15 子任务挂上 (Slice 0-11 + 2.5/4.5/7.5/8.5)
- [ ] git status·确认 work tree clean·或先 backup

---

## 1. v3 gate·加 P.conf.useTinyiV3 flag

### 1.1·当前状态 (无 gate)

**位置** `web/tm-tinyi-v3.js:1544-1553`

```javascript
var orig = window._cy_pickMode;
window._cy_pickMode = function(mode) {
  if (mode === 'tinyi') {
    if (typeof CY !== 'undefined') CY.mode = mode;
    _ty3_open();
    return;
  }
  return orig.apply(this, arguments);
};
window._cy_pickMode._ty3Override = true;
```

### 1.2·改后 (加 flag·灰度)

**patch** `web/tm-tinyi-v3.js:1544-1553`

```javascript
var orig = window._cy_pickMode;
window._cy_pickMode = function(mode) {
  if (mode === 'tinyi') {
    // Slice 0·v1.4 gate·默认 v2·user 在设置面板可切 v3
    var v3On = !!(window.P && window.P.conf && window.P.conf.useTinyiV3 === true);
    if (v3On) {
      if (typeof CY !== 'undefined') CY.mode = mode;
      _ty3_open();
      return;
    }
    // fallback·走 v2 (orig 内含 v2 setup)
  }
  return orig.apply(this, arguments);
};
window._cy_pickMode._ty3Override = true;
```

**注意**·`orig` 是原始 `_cy_pickMode`·已含 `tm-chaoyi.js:353` 的 `_ty2_openSetup()`·所以 flag=false 时自然走 v2。

### 1.3·tm-chaoyi.js·确认 v2 入口未动

**位置** `web/tm-chaoyi.js:353`·

```javascript
if (mode === 'tinyi')  { _ty2_openSetup(); return; }
```

**不动**·v3 override 已包 `orig.apply`·v2 路径保留。

---

## 2. 设置面板·加 useTinyiV3 toggle

### 2.1·现有 P.conf toggle 模式 (参考)

**位置** `web/tm-patches.js:355-369`·

```javascript
var _gateOn   = !!(P.conf && P.conf.recallGateEnabled === true);
var _consolOn = !(P.conf && P.conf.consolidationEnabled === false);
var _semOn    = !(P.conf && P.conf.semanticRecallAutoload === false);
// ...
'<input type="checkbox" id="s-recall-gate" ' + (_gateOn?'checked ':'')
  + 'onchange="_togglePConf(\'recallGateEnabled\',this.checked)" style="...">' +
```

### 2.2·加 toggle (Slice 0 加在同区·~L370 附近)

**patch** `web/tm-patches.js`·找到 recall-gate / consol 那块 (~L355-385)·加在末尾·

```javascript
var _tinyiV3On = !!(P.conf && P.conf.useTinyiV3 === true);

// ...在 settings panel HTML 末尾加·
'<div class="s-row s-tinyi-v3" style="margin-top:0.6rem;">' +
  '<input type="checkbox" id="s-tinyi-v3" ' + (_tinyiV3On?'checked ':'')
    + 'onchange="_togglePConf(\'useTinyiV3\',this.checked)" style="margin-top:0.15rem;flex-shrink:0;">' +
  '<label for="s-tinyi-v3" style="margin-left:0.4rem;">' +
    '<b>廷议·新框架 (v3·测试中)</b>' +
    '<span style="display:block;font-size:0.85rem;color:#888;margin-top:0.15rem;">' +
    '8 阶段·议前预审 / 起议 / 辩议 / 廷推 / 钦定 / 草诏 / 用印 / 追责·' +
    '<u>测试期·遇 bug 关掉走 v2</u>' +
    '</span>' +
  '</label>' +
'</div>'
```

**位置选择**·v3 audit 显示 `tm-patches.js` 设置面板内 toggle 都在 `_renderConfPanel` 或类似 function 内·**Slice 0 实施时 grep `recallGateEnabled` 找具体行**·这里 patch 是模板。

---

## 3. baseline·dump 当前 v3 输出 (for regression)

### 3.1·创建 baseline 录入脚本

**新文件** `web/scripts/baseline-tinyi-before-prompts.js`·

```javascript
// 用途·sprint 启动前·跑 v3 一议·dump 输出 → JSON·后续每 Slice 改完比对
// 跑·node web/scripts/baseline-tinyi-before-prompts.js
// 输出·web/scripts/_baseline-tinyi-before-prompts.json

const fs = require('fs');
const path = require('path');

// 简化·此脚本是 placeholder·实际 baseline 应在 electron 内跑 (game state)
// 跑法·
//   1. 启动游戏·选 "天启七年九月"·进 turn 2
//   2. spawn 弹劾议题·进 v3 廷议
//   3. dev tool console·跑·
//      console.log(JSON.stringify({
//        attendees: CY._ty3.attendees,
//        transcript: CY._ty3.transcript,
//        finalStance: CY._ty3._finalStance,
//        archonChoice: CY._ty3._archonChoice
//      }, null, 2));
//   4. 拷贝 console output → 此目录 _baseline.json

console.log('Run inside electron dev tools.  See comment for instructions.');
console.log('Output dir: ' + path.join(__dirname, '_baseline-tinyi-before-prompts.json'));
```

### 3.2·baseline DoD

```
跑·5 剧本 × 1 议题 = 5 baseline (v3 关·走 v2·dump v2 输出 作 control)
跑·5 剧本 × 1 议题 = 5 baseline (v3 开·走 v3·dump v3 现状输出)
两组 baseline 比对·后续每 Slice 改完跑·若 v3 输出 diverge > 30%·停查
保存·web/scripts/_baseline-tinyi-before-prompts.json (v2 + v3·2 组)
```

---

## 4. Slice 0 子任务清单 + 工时

| # | 子任务 | 工时 | DoD |
|---|---|---|---|
| 0.1 | grep v3 中文 string 全表 → audit doc | 0.2d | 输出 `web/docs/tinyi-v3-existing-strings-audit.md`·~200 行·所有 UI 字串 + file:line |
| 0.2 | 加 P.conf.useTinyiV3 flag (§1) | 0.05d | smoke·flag=false → v2·flag=true → v3 |
| 0.3 | 设置面板 toggle (§2) | 0.1d | UI 显示·点击 toggle 后存 P.conf·重启游戏保留 |
| 0.4 | 浮按钮 mark for delete (Slice 4.5 真删) | 0.05d | 加 `// SLICE_4_5_DELETE` comment marker·L545-682·9 函数 + 2 DOM |
| 0.5 | baseline dump (§3) | 0.2d | 10 baseline (5 v2 + 5 v3) JSON·入 git |
| 0.6 | task #130-145 创建 + 挂依赖 | 0.1d | TaskList 显 15 子 task·按 Slice 拆 |
| 0.7 | v3 已有 UI string 全审 (Round 4 教训) | 0.3d | grep + 跟 mockup 对照·任何 mismatch 列入修正 backlog |

**总** 1.0d (vs v1.4 0.5d·v1.5 加 0.5d 因 Round 4 v3 audit 教训)

---

## 5. 浮按钮 deletion plan (Slice 4.5 实施·这里只 mark)

**Slice 0 加 marker** (delete in Slice 4.5)·

```javascript
// tm-tinyi-v3.js·9 函数 + 2 DOM·全删

// SLICE_4_5_DELETE_START·L545
function _ty3_mountInterjectButton() { ... }       // L545-557
// SLICE_4_5_DELETE_END

// SLICE_4_5_DELETE_START·L561
function _ty3_showInterjectButton() { ... }        // L561-564
function _ty3_hideInterjectButton() { ... }        // L567-572
// SLICE_4_5_DELETE_END

// SLICE_4_5_DELETE_START·L574
function _ty3_openInterjectPanel() { ... }         // L574-588
// SLICE_4_5_DELETE_END

// SLICE_4_5_DELETE_START·L590
function _ty3_doInterjectTrain() { ... }           // L590-603
function _ty3_doInterjectSummon() { ... }          // L611-631
function _ty3_doInterjectSilence() { ... }         // L641-657
function _ty3_doInterjectPartyLeader() { ... }     // L640-661
function _ty3_doInterjectAbort() { ... }           // L670-682
// SLICE_4_5_DELETE_END

// CSS·tm-tinyi-v3.js 内嵌 CSS·grep '.ty3-ij-' 找·全删
// DOM·#ty3-interject-btn / #ty3-interject-panel·查 createElement / appendChild·全删
```

**marker convention**·只加 comment·不删代码 (Slice 0 不动逻辑·只标)·便于 Slice 4.5 grep `SLICE_4_5_DELETE` 一刀处理。

---

## 6. v3 已实现 UI string·preserve 清单 (Slice 0.1 输出)

**这是本 sprint 任何 mockup / Slice DoD 必须保留的 v3 现有字串**·**不可换名**。

### 6.1·议前预审 4 处置 (v3·L761-781)

```
🔒 留中            存入留中册·议题缓处·不外漏·可后续私决或明发
🎯 私决            皇威 +1·走御前奏对·与心腹密议·不公开
🤝 下议·五人闭门  (部分阶段)
📜 明发·廷议      (完整七阶段)
```

### 6.2·三班 (v3·L1706-1708)·**stance-based**

```
左班·同·X 党+盟    (proposerParty 的同党)
中班·中立
右班·异
```

**v1.5·双轨 view**·默认 stance·V 键切 class (内阁/部院/言官)。

### 6.3·辩议 4 轮 (v3·L1888 / 1894 / 1903 / 1912)

```
〔 第一轮·主奏起议 〕
〔 第二轮·同党附议 〕
〔 第三轮·敌党驳议 〕
〔 第四轮·中立权衡 〕
```

### 6.4·钦定 5 档 (v3·L1217-1221)

```
S·圣旨煌煌    hw>=70 && hq>=70
A·凛然奉旨    max>=70
B·勉强尊行    min>=50
C·众议汹汹    min>=30
D·危诏激变    else  (触发硬推 / 妥协 modal)
```

### 6.5·用印 2 sub-flow (v3·L2943-3014)

```
强行用印 (button)·  ⚔ 强行用印（皇权-5）
诏命留中·阻挠者·X
强行用印·阻于 X·皇威 -5·朝堂转 Y
诏命用印颁行
```

### 6.6·追责 4 outcome (v3·L3413)

```
fulfilled  圆满  (S / A grade)
partial    部分  (B / C grade)
contested  抵触  (D grade)
blocked    阻挠  (seal blocked)
```

### 6.7·已知 bug·`_ty3_phase14_recordChaoyiSummary` (v3·L3604-3643)

**当前**·collects metadata 但**未推 chronicleTracker**·"廷议待落实" 卡不进 GM._chronicleTracker。

**Slice 11 必修**·function 末尾加·

```javascript
// SLICE_11 fix·broken chronicleTracker integration
if (typeof GM !== 'undefined' && Array.isArray(GM._chronicleTracker)) {
  GM._chronicleTracker.push({
    type: 'tinyi-pending',
    turn: GM.turn,
    topic: topic,
    decision: decision,
    grade: grade,
    dueAt: GM.turn + 3,  // 3 回合后追责检查
    status: 'pending'
  });
}
```

---

## 7. Slice 0 完成后·confirm + git commit

```bash
# Slice 0 完成后·5 个 commit·按子任务·
git add web/docs/tinyi-v3-existing-strings-audit.md
git commit -m "[tinyi-overhaul Slice 0.1] v3 现有 UI string 全审"

git add web/tm-tinyi-v3.js web/tm-patches.js
git commit -m "[tinyi-overhaul Slice 0.2-0.3] 加 P.conf.useTinyiV3 flag + 设置面板 toggle"

git add web/tm-tinyi-v3.js
git commit -m "[tinyi-overhaul Slice 0.4] 浮按钮 mark for Slice 4.5 delete"

git add web/scripts/baseline-tinyi-before-prompts.js web/scripts/_baseline-tinyi-before-prompts.json
git commit -m "[tinyi-overhaul Slice 0.5] baseline 录·10 case (5 v2 + 5 v3)"

git add (task list)
git commit -m "[tinyi-overhaul Slice 0.6] task 创建·15 子任务挂上 (Slice 0-11)"

# 跑备份·确保 doc 不丢
powershell -ExecutionPolicy Bypass -File web/scripts/backup-critical-docs.ps1
```

---

## 8. Slice 0 → Slice 1 transition

Slice 0 完成验收 ALL PASS 后·开始 Slice 1·

```
Slice 1·5 剧本 traitIds 补   1.5d
  - 复用 web/tools/fill-shaosong-traits.js
  - 批跑·崇祯 (45) / 挽天倾 (44) / 111 (32) / 晋 (1) / 大明 (1)·共 ~123 chars
  - 抽 10 chars 手验
  - 跑 calibrate-derived-health.js
```

---

## 9. status

```
Slice 0 prep doc·complete·ready to apply
依赖·user 拍板"开工"·然后按 §7 step-by-step 跑
工时·1.0d  (审 0.3 + 实施 0.5 + baseline 0.2)
```
