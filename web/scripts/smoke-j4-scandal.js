// smoke-j4-scandal.js · 科举 Phase J·Slice J4 · 科场弊案 (跨朝代通用)
// 覆盖：flag gate / init 幂等 / 触发评估 / spawn+consume / 三路径处置后果 / 未通过 / 跨朝代通用
'use strict';
var path = require('path');
var m = require(path.join(__dirname, '..', 'tm-keju-scandal.js'));
var pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; } else { fail++; console.error('  FAIL: ' + name); } }

function resetGM(opts) {
  opts = opts || {};
  global.P = { conf: { useNewKejuScandal: opts.flag !== false }, keju: {} };
  global.GM = {
    year: 1600, turn: 5,
    corruption: (opts.corruption != null ? opts.corruption : 60),
    minxin: 50,
    _chronicle: [],
    keju: {
      stage: opts.stage || 'exam-held',
      tension: (opts.tension != null ? opts.tension : 20),
      examiner: opts.examiner || { name: '主考甲', factionBias: 0.7 }
    }
  };
}

// 1 · flag gate
resetGM({ flag: false });
check('flag=off · CheckTriggers 返 0', m._kjCheckScandalTriggers() === 0);
check('flag=off · Consume 返空', m._kjConsumeScandalForAgenda().length === 0);

// 2 · init 幂等
resetGM();
m._kjInitScandalState();
var s1 = GM.keju._scandal;
m._kjInitScandalState();
check('init 幂等 (同一对象)', GM.keju._scandal === s1);
check('init 结构完整', !!(s1 && Array.isArray(s1.spawned) && Array.isArray(s1.history) && Array.isArray(s1.coveredUp)));

// 3 · 触发评估 (通用三因子)
resetGM({ corruption: 60, tension: 20, examiner: { name: '张三', factionBias: 0.7 } });
var a = m._scAssess();
check('高值场景触发 (3 因子全中)', !!(a && a.hits >= 2 && a.severity > 0));
resetGM({ corruption: 10, tension: 0, examiner: { name: '李四', factionBias: 0.1 } });
check('低值场景不触发', m._scAssess() === null);
resetGM({ corruption: 90, tension: 90, stage: 'idle', examiner: { name: '王五', factionBias: 0.9 } });
check('idle 阶段不触发 (无在办科举)', m._kjCheckScandalTriggers() === 0);

// 4 · spawn + consume
resetGM({ corruption: 70, tension: 30, examiner: { name: '赵六', factionBias: 0.8 } });
check('触发 spawn 1 桩', m._kjCheckScandalTriggers() === 1);
check('spawned 队列有 1', GM.keju._scandal.spawned.length === 1);
var consumed = m._kjConsumeScandalForAgenda();
check('consume 取出 1 桩 (带 type)', consumed.length === 1 && !!consumed[0].type);
check('consume 后队列清空', GM.keju._scandal.spawned.length === 0);
check('cooldown 内不再 spawn', m._kjCheckScandalTriggers() === 0);

// 5 · 议政三路径处置
// 查办 · high → 削籍流放
resetGM();
var ex = GM.keju.examiner;
m._kjScandalKeyiCallback('investigate', { passed: true, topicData: { examinerName: ex.name, severityTier: 'high', type: 'bribery' } });
check('查办·high → 主考流放削籍 (_exiled/_degraded)', ex._exiled === true && ex._degraded === true);
check('查办 → 主考留 careerHistory', Array.isArray(ex.careerHistory) && ex.careerHistory.length > 0);
check('查办 → 吏治下降 (肃贪)', GM.corruption < 60);
check('查办 → 民心上升', GM.minxin > 50);
check('查办 → history 记 1 桩', GM.keju._scandal.history.length === 1);

// 查办 · low → 夺俸记过 (留任)
resetGM();
var exL = GM.keju.examiner;
m._kjScandalKeyiCallback('council', { passed: true, topicData: { examinerName: exL.name, severityTier: 'low' } });
check('查办·low → 记过留任 (_demerit·不去职)', exL._demerit >= 1 && !exL._exiled && !exL._dismissed);

// 罢免 → 去职
resetGM();
var ex2 = GM.keju.examiner;
m._kjScandalKeyiCallback('dismiss', { passed: true, topicData: { examinerName: ex2.name, severityTier: 'mid' } });
check('罢免 → 主考去职 (_dismissed)', ex2._dismissed === true && !ex2._exiled);

// 庇护 → 主考无事·吏治升·留隐患
resetGM();
var ex3 = GM.keju.examiner;
var corrBefore = GM.corruption;
m._kjScandalKeyiCallback('protect', { passed: true, topicData: { examinerName: ex3.name, severityTier: 'high', type: 'leak' } });
check('庇护 → 主考无事', !ex3._exiled && !ex3._dismissed && ex3.alive !== false);
check('庇护 → 吏治上升 (纵容)', GM.corruption > corrBefore);
check('庇护 → 留 coveredUp 隐患', GM.keju._scandal.coveredUp.length === 1);

// 未通过 → 不了了之
resetGM();
var ex4 = GM.keju.examiner;
m._kjScandalKeyiCallback('investigate', { passed: false, topicData: { examinerName: ex4.name, severityTier: 'high' } });
check('未通过 → 主考无事', !ex4._exiled && !ex4._dismissed);
check('未通过 → history 记 unresolved', GM.keju._scandal.history.some(function (h) { return h.resolution === 'unresolved'; }));

// 6 · 跨朝代通用
check('4 类弊案类型', Object.keys(m.SCANDAL_TYPES).length === 4);
check('弊案类型文本无明清专名', !/东厂|司礼监|锦衣卫|内阁|票拟|八股|军机处/.test(JSON.stringify(m.SCANDAL_TYPES)));

console.log('[smoke-j4-scandal] pass=' + pass + ' fail=' + fail);
if (fail > 0) process.exit(1);
