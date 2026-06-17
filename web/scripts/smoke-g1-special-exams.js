/**
 * smoke-g1-special-exams.js·G1·特科 trigger + namespace + spawn/consume/cooldown
 *  (1)  flag=false·全 no-op
 *  (2)  init·从 preset copy 配置
 *  (3)  enke·万寿 60 必触
 *  (4)  enke·万寿 30 概率触 (强制 Math.random < 0.5)
 *  (5)  enke·寿诞非 10 倍数·不触
 *  (6)  enke·改元·1 年内触
 *  (7)  enke·大婚·1 年内触
 *  (8)  wuju·边事≥60 触发
 *  (9)  wuju·缺将领 (alive<5) 触发
 *  (10) wuju·preset disabled·不触
 *  (11) wuju·startYear 未到·不触
 *  (12) fanyi·1723 首次必触
 *  (13) fanyi·disabled·不触
 *  (14) fanyi·startYear 未到·不触
 *  (15) tongzi·概率 stub Math.random=0.99·不触 (>0.05)
 *  (16) tongzi·概率 stub 0.01·触
 *  (17) cooldown·enke 1y 内 spawn 失败
 *  (18) cooldown·enke 5y 后可再 spawn
 *  (19) MAX_SPAWN_PER_TURN=1·多 type 同 turn 只 spawn 1
 *  (20) consume·清队列·返 1 条
 *  (21) spawn 历史 + cooldown 写入
 *  (22) flag=false·spawn 返 false·consume 返空
 */

global.window = {};
global.GM = { turn: 100, year: 1627, chars: [], vars: {} };
global.P = { conf: {}, keju: {}, playerInfo: {}, time: { year: 1627 } };

require('../tm-keju-special-exams.js');

const fns = {};
['_kjInitSpecialExamCalendar','_kjCheckSpecialExamTriggers','_kjConsumeSpecialExamForAgenda','_kjSpawnSpecialExam',
 '_kjCheckEnkeTriggers','_kjCheckWujuTriggers','_kjCheckFanyiTriggers','_kjCheckTongziTriggers'].forEach(n => fns[n] = global.window[n]);

let pass = 0, fail = 0;
function check(label, ok) { if (ok) { pass++; console.log('  PASS', label); } else { fail++; console.log('  FAIL', label); } }

function resetGM(opts) {
  opts = opts || {};
  global.GM = {
    turn: opts.turn || 100,
    year: opts.year || 1627,
    chars: opts.chars || [],
    vars:  opts.vars  || {},
    _specialExamCalendar: undefined,
    _lastReignChangeYear: opts.reignChangeYear || 0,
    _lastImperialWeddingYear: opts.weddingYear || 0
  };
  global.P = {
    conf: { useNewKejuD2: opts.flagOn !== false },
    keju: { specialExamCalendar: opts.preset || {} },
    playerInfo: { birthYear: opts.birthYear || 0 },
    time: { year: opts.year || 1627 }
  };
}

console.log('=== 1·flag=false·全 no-op ===');
resetGM({ flagOn: false, preset: { wuju_enabled: true, fanyi_enabled: true, tongzi_enabled: true } });
fns._kjInitSpecialExamCalendar();
check('flag=false·init 后 GM 不建 namespace', global.GM._specialExamCalendar === undefined || !global.GM._specialExamCalendar);
check('flag=false·CheckTriggers 返 0', fns._kjCheckSpecialExamTriggers() === 0);
check('flag=false·Spawn 返 false', fns._kjSpawnSpecialExam('enke', 'x') === false);
check('flag=false·Consume 返空', fns._kjConsumeSpecialExamForAgenda().length === 0);

console.log('\n=== 2·init·从 preset copy ===');
resetGM({
  preset: { wuju_enabled: true, wuju_interval: 5, wuju_startYear: 1387, fanyi_enabled: true, fanyi_startYear: 1723, tongzi_enabled: true }
});
fns._kjInitSpecialExamCalendar();
check('namespace 已建', !!global.GM._specialExamCalendar);
const cal = global.GM._specialExamCalendar;
check('wuju_enabled=true', cal.wuju_enabled === true);
check('wuju_interval=5', cal.wuju_interval === 5);
check('fanyi_startYear=1723', cal.fanyi_startYear === 1723);
check('tongzi_enabled=true', cal.tongzi_enabled === true);
check('spawned 空数组', Array.isArray(cal.spawned) && cal.spawned.length === 0);
check('history 4 类 init', cal.history.enke && cal.history.wuju && cal.history.fanyi && cal.history.tongzi);
check('cooldown 4 类 init', cal.cooldown.enke === 0 && cal.cooldown.wuju === 0);

console.log('\n=== 3·enke·万寿 60 必触 ===');
resetGM({ year: 1627, birthYear: 1567 }); // 60 寿
fns._kjInitSpecialExamCalendar();
const e60 = fns._kjCheckEnkeTriggers();
check('60 寿必触', e60 !== null);
check('subtype=birthday', e60 && e60.subtype === 'birthday');
check('age=60', e60 && e60.age === 60);
check('reason 含 60', e60 && /60/.test(e60.reason));

console.log('\n=== 4·enke·万寿 30·Math.random<0.5 触 ===');
resetGM({ year: 1627, birthYear: 1597 }); // 30 寿
fns._kjInitSpecialExamCalendar();
const origRandom = Math.random;
Math.random = () => 0.3; // force trigger
const e30 = fns._kjCheckEnkeTriggers();
check('30 寿·随机 0.3 触', e30 !== null && e30.subtype === 'birthday');
Math.random = () => 0.7; // force skip
const e30s = fns._kjCheckEnkeTriggers();
check('30 寿·随机 0.7 不触', e30s === null);
Math.random = origRandom;

console.log('\n=== 5·enke·寿诞非 10 倍数·不触 ===');
resetGM({ year: 1627, birthYear: 1572 }); // 55 寿
fns._kjInitSpecialExamCalendar();
check('55 寿·不触', fns._kjCheckEnkeTriggers() === null);

console.log('\n=== 6·enke·改元 1 年内触 ===');
resetGM({ year: 1627, reignChangeYear: 1627 });
fns._kjInitSpecialExamCalendar();
const eR = fns._kjCheckEnkeTriggers();
check('改元当年·触', eR !== null && eR.subtype === 'reign-change');
check('reason 含改元', eR && /改元/.test(eR.reason));

console.log('\n=== 7·enke·大婚 1 年内触 ===');
resetGM({ year: 1627, weddingYear: 1626 });
fns._kjInitSpecialExamCalendar();
const eW = fns._kjCheckEnkeTriggers();
check('大婚 1 年前·触', eW !== null && eW.subtype === 'wedding');

console.log('\n=== 8·wuju·边事≥60 触发 ===');
resetGM({ year: 1627, preset: { wuju_enabled: true, wuju_startYear: 1387 }, vars: { '边事': { value: 75 } } });
fns._kjInitSpecialExamCalendar();
const w8 = fns._kjCheckWujuTriggers();
check('边事 75·触', w8 !== null);
check('subtype=war-crisis', w8 && w8.subtype === 'war-crisis');
check('warLevel=75', w8 && w8.warLevel === 75);

console.log('\n=== 9·wuju·缺将领·alive<5 触发 ===');
resetGM({
  year: 1627,
  preset: { wuju_enabled: true, wuju_startYear: 1387 },
  chars: [
    { name: '将1', officialTitle: '总兵', alive: true },
    { name: '将2', officialTitle: '游击', alive: true }
  ]
});
fns._kjInitSpecialExamCalendar();
const w9 = fns._kjCheckWujuTriggers();
check('alive 将<5·触', w9 !== null);
check('subtype=general-shortage', w9 && w9.subtype === 'general-shortage');

console.log('\n=== 10·wuju·disabled·不触 ===');
resetGM({ year: 1627, preset: { wuju_enabled: false }, vars: { '边事': { value: 80 } } });
fns._kjInitSpecialExamCalendar();
check('wuju disabled·不触', fns._kjCheckWujuTriggers() === null);

console.log('\n=== 11·wuju·startYear 未到·不触 ===');
resetGM({ year: 1380, preset: { wuju_enabled: true, wuju_startYear: 1387 }, vars: { '边事': { value: 80 } } });
fns._kjInitSpecialExamCalendar();
check('1380 < 1387·不触', fns._kjCheckWujuTriggers() === null);

console.log('\n=== 12·fanyi·trigger 已 stub (G4 翻译科 2026-05-26 user 拍·冗余删) ===');
resetGM({ year: 1723, preset: { fanyi_enabled: true, fanyi_startYear: 1723 } });
fns._kjInitSpecialExamCalendar();
const f12 = fns._kjCheckFanyiTriggers();
check('fanyi trigger stub returns null (G4 已删)', f12 === null);
check('fanyi 不再 spawn (G4 已删)', f12 === null);

console.log('\n=== 13·fanyi·disabled·不触 ===');
resetGM({ year: 1723, preset: { fanyi_enabled: false } });
fns._kjInitSpecialExamCalendar();
check('fanyi disabled·不触', fns._kjCheckFanyiTriggers() === null);

console.log('\n=== 14·fanyi·startYear 未到·不触 ===');
resetGM({ year: 1700, preset: { fanyi_enabled: true, fanyi_startYear: 1723 } });
fns._kjInitSpecialExamCalendar();
check('1700 < 1723·不触', fns._kjCheckFanyiTriggers() === null);

console.log('\n=== 15·tongzi·随机 0.99·不触 ===');
resetGM({ year: 1627, preset: { tongzi_enabled: true } });
fns._kjInitSpecialExamCalendar();
Math.random = () => 0.99;
check('概率 0.99·不触', fns._kjCheckTongziTriggers() === null);

console.log('\n=== 16·tongzi·随机 0.01·触 ===');
Math.random = () => 0.01;
const t16 = fns._kjCheckTongziTriggers();
check('概率 0.01·触', t16 !== null && t16.subtype === 'recommendation');
Math.random = origRandom;

console.log('\n=== 17·cooldown·enke 1y 内 spawn 失败 ===');
resetGM({ year: 1627 });
fns._kjInitSpecialExamCalendar();
check('1st spawn enke 成功', fns._kjSpawnSpecialExam('enke', '万寿', {}) === true);
check('1y 内同 type 失败', fns._kjSpawnSpecialExam('enke', '改元', {}) === false);

console.log('\n=== 18·cooldown·enke 5y 后可再 spawn ===');
global.GM.year = 1632;
check('5y 后 spawn enke 成功', fns._kjSpawnSpecialExam('enke', '大婚', {}) === true);
check('history 2 条', global.GM._specialExamCalendar.history.enke.length === 2);

console.log('\n=== 19·MAX_SPAWN_PER_TURN=1·多 type 同 turn 只 spawn 1 ===');
resetGM({
  year: 1723,
  birthYear: 1663,
  preset: { wuju_enabled: true, wuju_startYear: 1387, fanyi_enabled: true, fanyi_startYear: 1723, tongzi_enabled: true },
  vars: { '边事': { value: 70 } },
  reignChangeYear: 1723
});
fns._kjInitSpecialExamCalendar();
const n19 = fns._kjCheckSpecialExamTriggers();
check('CheckTriggers 返 1 (非 4)', n19 === 1);
check('spawned 1 条', global.GM._specialExamCalendar.spawned.length === 1);
check('spawn 的是 enke (优先序首)', global.GM._specialExamCalendar.spawned[0].type === 'enke');

console.log('\n=== 20·consume·MAX=1·清队列 ===');
const c20 = fns._kjConsumeSpecialExamForAgenda();
check('consume 返 1 条', c20.length === 1);
check('type=enke', c20[0].type === 'enke');
check('队列空', global.GM._specialExamCalendar.spawned.length === 0);
check('再 consume 返空', fns._kjConsumeSpecialExamForAgenda().length === 0);

console.log('\n=== 21·spawn 历史 + cooldown 写入 ===');
resetGM({ year: 1627 });
fns._kjInitSpecialExamCalendar();
fns._kjSpawnSpecialExam('wuju', '边镇告急', { warLevel: 70 });
check('cooldown.wuju=1627', global.GM._specialExamCalendar.cooldown.wuju === 1627);
check('history.wuju 1 条', global.GM._specialExamCalendar.history.wuju.length === 1);
check('history.wuju[0].year=1627', global.GM._specialExamCalendar.history.wuju[0].year === 1627);

console.log('\n=== 22·flag=false·spawn 返 false·consume 返空 ===');
global.P.conf.useNewKejuD2 = false;
check('flag=false·spawn 返 false', fns._kjSpawnSpecialExam('enke', 'x') === false);
check('flag=false·consume 返空', fns._kjConsumeSpecialExamForAgenda().length === 0);
check('flag=false·CheckTriggers 返 0', fns._kjCheckSpecialExamTriggers() === 0);

console.log('\n========================================');
console.log('PASS:', pass, '· FAIL:', fail);
console.log('========================================');
process.exit(fail === 0 ? 0 : 1);
