#!/usr/bin/env node
'use strict';
// smoke-diebao-log — 我朝谍报史接入(GM._npcInterventions·访问器原仅 1 处薄调用且泄漏英文 action 码)
//   A. 访问器:require 真模块·getLog() 全量 / getLog(facName) 按 targetFac 过滤
//   B. 显示做厚:tm-three-systems-ui 中文化 action(不漏英文)+花费+成败/策反结果
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function ok(c, m) { if (!c) throw new Error('FAIL: ' + m); A++; console.log('  ✓ ' + m); }

console.log('smoke-diebao-log');

// ───────── A. 访问器功能测(require 真模块) ─────────
global.GM = {
  turn: 6,
  _npcInterventions: [
    { id: 'a', turn: 4, action: 'bribe', fromPlayer: '明朝廷', targetFac: '后金', targetChar: '范文程', cost: { money: 50000 }, effects: { loyaltyBefore: 40, loyaltyAfter: 15, bribed: true }, success: true },
    { id: 'b', turn: 5, action: 'spreadRumor', fromPlayer: '明朝廷', targetFac: '后金', cost: { money: 20000 }, success: true },
    { id: 'c', turn: 5, action: 'sponsorRebellion', fromPlayer: '明朝廷', targetFac: '蒙古', cost: { money: 100000, grain: 50000 }, success: false }
  ]
};
const I = require(path.join(ROOT, 'tm-faction-npc-intervention.js'));
ok(I && typeof I.getLog === 'function', 'A① 模块导出 getLog');
ok(I.getLog().length === 3, 'A② getLog() 全量=3');
ok(I.getLog('后金').length === 2 && I.getLog('后金').every(r => r.targetFac === '后金'), 'A③ getLog(后金) 按 targetFac 过滤=2');
ok(I.getLog('蒙古').length === 1, 'A④ getLog(蒙古)=1');
ok(I.getLog('不存在之邦').length === 0, 'A⑤ 无记录之邦 → 空');

// ───────── B. 显示源契约 ─────────
const ui = fs.readFileSync(path.join(ROOT, 'tm-three-systems-ui.js'), 'utf8');
ok(/_actCN = \{ bribe:'暗结收买', spreadRumor:'散播谣言', sponsorRebellion:'资助内斗', espionage:'刺探军情' \}/.test(ui), 'B① action 中文化映射(暗结/散谣/资助内斗/刺探)');
ok(ui.indexOf('我朝谍报·已对') >= 0, 'B② 标题「我朝谍报」(原「已用干预」薄行已替换)');
ok(ui.indexOf("var actCN = _actCN[i.action] || '密遣'") >= 0, 'B③ 未知 action 兜底「密遣」(绝不漏英文码)');
ok(/已策反/.test(ui) && /忠诚-/.test(ui), 'B④ bribe 结果:已策反/忠诚-N');
ok(/得手/.test(ui) && /未果/.test(ui), 'B⑤ 其它动作成败:得手/未果');
ok(/万两/.test(ui) && /万石/.test(ui), 'B⑥ 花费渲染(万两/万石)');
// ★旧英文泄漏行已除
ok(ui.indexOf("['+esc(i.action)+']") < 0, 'B⑦ ★旧 [英文action] 泄漏行已除');
ok(/TM\.FactionNpcIntervention\.getLog\(fac\.name\)/.test(ui), 'B⑧ 仍真读 getLog(fac.name)');

console.log('\n结果: ' + A + ' 通过 / 0 失败');
