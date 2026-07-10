#!/usr/bin/env node
'use strict';
/* smoke-appoint-commander-living — 易将只列在世将才(将领不得为死人·UI侧):
 * _tsLivingCommanderCandidates 过滤死者(alive=false/dead=true)·剔现任·同朝优先·武略综合降序·武智字段正确读出。 */
global.window = global;
global.GM = { chars: [], armies: [] };
global.openGenericModal = function () {};
global.closeGenericModal = function () {};
global.toast = function () {};
global.GameHooks = { on: function () {} };
global.findCharByName = function (n) { return (global.GM.chars || []).find(function (c) { return c.name === n; }); };

require('../tm-three-systems-ui.js');
const cand = global._tsLivingCommanderCandidates;
let A = 0, F = 0; function ok(c, m) { if (c) { A++; console.log('  ✓ ' + m); } else { F++; console.log('  ✗ FAIL: ' + m); } }
console.log('smoke-appoint-commander-living');

if (typeof cand !== 'function') { console.log('  ✗ FAIL: _tsLivingCommanderCandidates 未暴露'); process.exit(1); }

global.GM.chars = [
  { name: '活将甲', faction: '明', military: 80, intelligence: 60, alive: true },
  { name: '死将乙', faction: '明', military: 90, intelligence: 70, alive: false },   // 死(alive=false)
  { name: '殁将丙', faction: '明', military: 85, dead: true },                        // 死(dead=true)
  { name: '现帅丁', faction: '明', military: 70 },                                     // 现任(应剔除)
  { name: '外将戊', faction: '金', military: 88, intelligence: 50, alive: true },      // 外朝
  { name: '文官己', faction: '明', military: 40, intelligence: 95, alive: true }       // 低武高智·本朝
];
const army = { name: '京营', faction: '明', commander: '现帅丁' };
const out = cand(army);
const names = out.map(function (c) { return c.name; });

ok(!names.includes('死将乙') && !names.includes('殁将丙'), '① 死者(alive=false/dead=true)不入候选');
ok(!names.includes('现帅丁'), '② 现任主帅剔除');
ok(names.includes('活将甲') && names.includes('外将戊') && names.includes('文官己'), '③ 在世者入候选(含外朝/文官)');
ok(out[0].name === '活将甲', '④ 同朝优先+武略降序→活将甲居首(武80·本朝)');
ok(out[out.length - 1].name === '外将戊', '⑤ 外朝末位(同朝优先于高武外人)');
ok(out.find(function (c) { return c.name === '活将甲'; }).mil === 80 && out.find(function (c) { return c.name === '活将甲'; }).intel === 60, '⑥ 武/智字段正确读出');

global.GM.chars = [];
ok(Array.isArray(cand({ name: 'x' })) && cand({ name: 'x' }).length === 0, '⑦ 无人→[]不崩');

// 接线:确认易将与防选死人守卫在源
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.resolve(__dirname, '..', 'tm-three-systems-ui.js'), 'utf8');
ok(/ch\.alive === false \|\| ch\.dead === true.*不可拜将|不可拜将/.test(src), '⑧ _tsConfirmAppoint 含死人/幽灵守卫');
ok(/ts_appoint_sel/.test(src) && /_tsConfirmAppoint/.test(src), '⑨ 易将下拉 + 确认接线在源');

// 接线:右栏部队详情易将钮(2026-07-11·玩家反馈行13——新版右栏漏易将入口)
const rrSrc = fs.readFileSync(path.resolve(__dirname, '..', 'phase8-formal-rightrail.js'), 'utf8');
ok(/data-command="appoint"/.test(rrSrc) && /rightArmyBelongsToPlayer\(a\)\s*\?\s*'<button[^']*data-command="appoint"/.test(rrSrc), '⑩ 右栏部队详情有易将钮·仅玩家军显示');
ok(/cmd === 'appoint'/.test(rrSrc) && /_tsAppointGeneral\(army\.name \|\| name, \{ ret: 'rightrail' \}\)/.test(rrSrc), '⑪ appoint 分支调 _tsAppointGeneral 带 rightrail 来源标记');
ok(/_tsAppointRet === 'rightrail'/.test(src) && /refreshArmyFlyout/.test(src), '⑫ 确认后 rightrail 来源回刷飞出层而非旧军务面板');
ok(/_tsAppointRet = \(opts && opts\.ret\) \|\| null/.test(src), '⑬ 来源标记每次打开重置(取消不残留)');

console.log('\nsmoke-appoint-commander-living ' + (F === 0 ? 'PASS' : 'FAIL') + ' ' + A + '/' + (A + F));
process.exit(F === 0 ? 0 : 1);
