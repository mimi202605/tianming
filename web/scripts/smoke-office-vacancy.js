// smoke-office-vacancy.js — P1-C1 地方官缺写口断言(2026-06-20)
//   建制(regionType 省3/府2/州县1) − 实任(officialTitle 含地名)=官缺·出缺→升·governor兜底·开关守卫
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, '..', 'tm-office-vacancy.js');
global.window = global;
vm.runInThisContext(fs.readFileSync(SRC, 'utf8'), { filename: 'tm-office-vacancy.js' });
var OV = global.OfficeVacancy;
if (!OV || typeof OV.tick !== 'function') { console.log('FAIL: OfficeVacancy 未加载'); process.exit(1); }

// ── T5：建制(省3/府2/州县1) ──
var T5 = (OV._establishedOffices({ name: '山东省' }) === 3 && OV._establishedOffices({ regionType: '府' }) === 2 && OV._establishedOffices({ regionType: '县' }) === 1);

var 济南府 = { name: '济南府', regionType: '府', governor: '张三' };   // est=2
var 李四 = { name: '李四', officialTitle: '济南同知', alive: true };
global.GM = { adminHierarchy: { player: { divisions: [济南府] } }, chars: [{ name: '张三', officialTitle: '济南知府', alive: true }, 李四] };
global.P = { conf: { officeVacancyEnabled: false } };

// ── T1：开关关·不算 ──
OV.tick();
var T1 = (济南府.officeVacancy === undefined);

// ── T2：开关开·满编(2 官·est2-实2=0) ──
global.P.conf.officeVacancyEnabled = true;
OV.tick();
var T2 = (济南府.officeVacancy === 0);

// ── T3：出缺(李四免)→officeVacancy 升 ──
李四.officialTitle = '';
OV.tick();
var T3 = (济南府.officeVacancy === 1);   // est2 - 实1(张三) = 1

// ── T4：governor 兜底(无匹配 char·但有 governor→主官1) ──
var 空府 = { name: '空府', regionType: '府', governor: '王五' };
global.GM.adminHierarchy.player.divisions.push(空府);
OV.tick();
var T4 = (空府.officeVacancy === 1);   // est2 - governor兜底1 = 1

// ── T6：A4·officialSupply 育才储官补官缺(书院/学宫自拟营建写) ──
空府.officialSupply = 1;
OV.tick();
var T6 = (空府.officeVacancy === 0);   // est2 - governor1 - 育官1 = 0

console.log('[C1] 济南府(满编)=' + 0 + ' · 出缺后=' + 济南府.officeVacancy + ' · 空府(仅governor)=' + 1 + ' · 空府+育官1=' + 空府.officeVacancy + ' · 建制 省=' + OV._establishedOffices({name:'山东省'}) + '/府=' + OV._establishedOffices({regionType:'府'}) + '/县=' + OV._establishedOffices({regionType:'县'}));
console.log('  [T1] 开关关不算：' + (T1 ? 'OK' : 'FAIL'));
console.log('  [T2] 满编 officeVacancy=0(est2-实2)：' + (T2 ? 'OK' : 'FAIL'));
console.log('  [T3] 出缺→officeVacancy 升(est2-实1=1)：' + (T3 ? 'OK' : 'FAIL'));
console.log('  [T4] governor 兜底(est2-主官1=1)：' + (T4 ? 'OK' : 'FAIL'));
console.log('  [T5] 建制 省3/府2/县1：' + (T5 ? 'OK' : 'FAIL'));
console.log('  [T6] A4·officialSupply 育官补官缺(est2-主官1-育官1=0)：' + (T6 ? 'OK' : 'FAIL'));
var all = T1 && T2 && T3 && T4 && T5 && T6;
console.log('\n=== ' + (all ? 'ALL PASS' : 'FAIL') + ' ===');
process.exit(all ? 0 : 1);
