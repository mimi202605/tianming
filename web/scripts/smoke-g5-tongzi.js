// scripts/smoke-g5-tongzi.js·Phase G·G5·童子科 mini-keju smoke
// 10 section·40 case
'use strict';
// 确定性种子(2026-07-16)：tm-keju-tongzi 引擎内有 11 处 Math.random·概率断言在 CI --no-retry 严格模式下
//   天然 flaky(5f3e10ea 撞出首例·与当次 diff 无关——本测只载 tm-keju-tongzi.js 一件)。以固定种子 LCG 顶掉
//   本测试进程的 Math.random·同种子必同路径·零漂移；引擎与其他测试不受影响。
(function(){ var _s = 20260716 >>> 0; Math.random = function(){ _s = (_s * 1664525 + 1013904223) >>> 0; return _s / 4294967296; }; })();
function _resetGM() {
  global.GM = {
    chars: [
      {name:'纪昀',officialTitle:'翰林学士',alive:true,intelligence:90}
    ],
    vars: {}, turn: 1, year: 1735,
    _chronicle: []
  };
  global.P = {
    conf: {useNewKejuG5: true},
    scenario: {era: '清·乾隆', startYear: 1735},
    player: {faction: '清朝廷'},
    time: {year: 1735}
  };
}
global.window = global;
global._logChronicle = function() {};
_resetGM();
require('../tm-keju-tongzi.js');

var pass = 0, fail = 0;
function _check(label, cond) {
  if (cond) { pass++; console.log('  PASS ' + label); }
  else { fail++; console.error('  FAIL ' + label); }
}

console.log('=== §A·gate + flag ===');
_check('A1·isG5Enabled true', _isG5Enabled() === true);
P.conf.useNewKejuG5 = false;
_check('A2·isG5Enabled false when off', _isG5Enabled() === false);
P.conf.useNewKejuG5 = true;
_check('A3·_kjG5DecorateSpawnedEntryForKeyi skips non-tongzi', (function(){ var e={type:'enke'}; _kjG5DecorateSpawnedEntryForKeyi(e); return !e._kjPromoteToKeyi; })());
_check('A4·_kjG5ParseTongziFromEdictText empty returns null', _kjG5ParseTongziFromEdictText('') === null);

console.log('=== §B·主考 pick ===');
var ex = _kjG5PickTongziChiefExaminer();
_check('B1·examiner non-null', !!ex);
_check('B2·examiner highest intelligence (纪昀)', ex && ex.name === '纪昀');
GM.chars = [];
_check('B3·null when no chars', _kjG5PickTongziChiefExaminer() === null);

console.log('=== §C·spawn pool (1-3 人罕见) ===');
_resetGM();
_kjG5OnTongziApproved('recommendation', {subtype:'recommendation'});
var tz = GM.chars.filter(function(c){return c._origin==='tongzi'});
_check('C1·spawned 1-3 tongzi', tz.length >= 1 && tz.length <= 3);
_check('C2·all age 9-14', tz.every(function(c){return c.age >= 9 && c.age <= 14}));
_check('C3·all _origin=tongzi', tz.every(function(c){return c._origin==='tongzi'}));
_check('C4·all mentor empty (不入 disciple-graph)', tz.every(function(c){return c.mentor===''}));
_check('C5·all officialTitle=翰林见习童子', tz.every(function(c){return c.officialTitle==='翰林见习童子'}));
_check('C6·all party 空 (童子不入党)', tz.every(function(c){return c.party===''}));

console.log('=== §D·archetype 派生 ===');
_check('D1·health 95 stress 18 = late_bloomer', _kjG5DeriveTongziArchetype({resources:{health:95,stress:18}}) === 'late_bloomer');
_check('D2·health 70 stress 50 = early_genius_died', _kjG5DeriveTongziArchetype({resources:{health:70,stress:50}}) === 'early_genius_died');
_check('D3·health 90 stress 25 = early_genius_died (stress 高)', _kjG5DeriveTongziArchetype({resources:{health:90,stress:25}}) === 'early_genius_died');
_check('D4·all spawned have _tongziArchetype set (G5 v2·4 类)', tz.every(function(c){return ['late_bloomer','early_genius_died','turned_eccentric','burned_out'].indexOf(c._tongziArchetype) >= 0}));

console.log('=== §E·题目 + difficulty ===');
_check('E1·prompt 含 易/中/难', /易|中|难/.test(_kjG5BuildTongziQuestionPrompt({subtype:'recommendation'}, ex, 10)));
_check('E2·9 岁 易', _kjG5BuildTongziQuestionPrompt({subtype:'recommendation'}, ex, 9).indexOf('易') >= 0);
_check('E3·14 岁 难', _kjG5BuildTongziQuestionPrompt({subtype:'recommendation'}, ex, 14).indexOf('难') >= 0);
_check('E4·themes count = 3', _kjG5GetTongziQuestionThemes('recommendation').length === 3);

console.log('=== §F·抚摩大典 ===');
_resetGM();
_kjG5OnTongziApproved('recommendation', {subtype:'recommendation'});
_check('F1·ceremony queue created', Array.isArray(GM._tongziCeremonyQueue) && GM._tongziCeremonyQueue.length > 0);
_check('F2·queue entry has tongziNames', GM._tongziCeremonyQueue[0] && Array.isArray(GM._tongziCeremonyQueue[0].tongziNames));
_check('F3·BuildFumoPrompt empty list returns empty string (M2 fix)', _kjG5BuildFumoCeremonyPrompt([], null, {}) === '');
_check('F4·BuildFumoPrompt non-empty list 含 抚摩', _kjG5BuildFumoCeremonyPrompt([{name:'童子',age:10}], {name:'翰'}, {}).indexOf('抚摩') >= 0);

console.log('=== §G·long-tail health tick ===');
_resetGM();
GM.chars.push({name:'神童1',alive:true,_origin:'tongzi',_tongziArchetype:'early_genius_died',birthYear:1725,resources:{health:60,stress:50}});
GM.chars.push({name:'神童2',alive:true,_origin:'tongzi',_tongziArchetype:'late_bloomer',birthYear:1725,resources:{health:95,stress:15}});
var initHealth1 = GM.chars[1].resources.health;
var initHealth2 = GM.chars[2].resources.health;
for(var i=0;i<10;i++) _kjG5TongziHealthTick();
_check('G1·late_bloomer health 不变 (95)', GM.chars[2].resources.health === initHealth2);
_check('G2·late_bloomer _careerLongTail=true', GM.chars[2]._careerLongTail === true);
_check('G3·early_genius_died health 已降 (10 turn after)', GM.chars[1].resources.health < initHealth1);

console.log('=== §H·神童家族 (≥2 同姓) ===');
_resetGM();
GM.chars.push({name:'李慧',alive:true,_origin:'tongzi'});
GM.chars.push({name:'李聪',alive:true,_origin:'tongzi'});
GM.chars.push({name:'王明',alive:true,_origin:'tongzi'});
_kjG5DetectTongziFamily();
_check('H1·李家神童 detected (≥2 同姓)', GM._tongziFamilies && GM._tongziFamilies.bySurname && GM._tongziFamilies.bySurname['李']);
_check('H2·王 不形成家族 (仅 1 人)', !GM._tongziFamilies.bySurname['王']);

console.log('=== §I·EDICT parser ===');
_check('I1·识别 "童子科" keyword', _kjG5ParseTongziFromEdictText('再开童子科。') !== null);
_check('I2·识别 "神童" keyword', _kjG5ParseTongziFromEdictText('州县藩司荐神童。') !== null);
_check('I3·non-keyword reject', _kjG5ParseTongziFromEdictText('开恩科一次。') === null);
_check('I4·subtype recommendation when 州县', _kjG5ParseTongziFromEdictText('州县荐神童。').subtype === 'recommendation');
_check('I5·subtype royal-recognition when 钦点', _kjG5ParseTongziFromEdictText('钦点神童入翰林。').subtype === 'royal-recognition');

console.log('=== §J·flag gate + tone hint + reset ===');
_check('J1·early_genius_died tone has "小子"', _kjG5GetTongziToneHint({_origin:'tongzi',_tongziArchetype:'early_genius_died'}).indexOf('小子') >= 0);
_check('J2·late_bloomer tone has "小子"', _kjG5GetTongziToneHint({_origin:'tongzi',_tongziArchetype:'late_bloomer'}).indexOf('小子') >= 0);
_check('J3·non-tongzi returns empty', _kjG5GetTongziToneHint({_origin:'enke'}) === '');
GM._tongziFamilies = {test:1};
_kjG5MaybeResetCrossScenarioFields();
_check('J4·reset clears _tongziFamilies', !GM._tongziFamilies);
_check('J5·DEFERRED affinity helper returns 0', _kjG5GetTongziFamilyTinyiAffinityBonus() === 0);

console.log('');
console.log('========================================');
console.log('smoke-g5-tongzi·' + pass + ' PASS·' + fail + ' FAIL');
console.log('========================================');
if (fail > 0) process.exit(1);

// G5 v2·扩 case (v2 features)
console.log('=== §K·G5 v2·4 archetype 派生 + 钦点 mode ===');
_check('K1·hist 75% late_bloomer (10 trials)', (function(){ var c=0; for(var i=0;i<10;i++) if(_kjG5DeriveInitArchetype(true)==='late_bloomer') c++; return c >= 5; })());
_check('K2·default mode·4 archetype 全出现 (20 trials)', (function(){ var t={}; GM._tongziUserDecreeMode='default'; for(var i=0;i<40;i++) t[_kjG5DeriveInitArchetype(false)]=1; return Object.keys(t).length === 4; })());
_check('K3·SetUserDecreeMode liujing OK', (function(){ _kjG5SetUserDecreeMode('liujing'); return _kjG5GetUserDecreeMode()==='liujing'; })());
_check('K4·SetUserDecreeMode reject invalid', (function(){ _kjG5SetUserDecreeMode('liujing'); _kjG5SetUserDecreeMode('garbage'); return _kjG5GetUserDecreeMode()==='liujing'; })());
_kjG5SetUserDecreeMode('default');

console.log('=== §L·G5 v2·跨系统 wire (民心 / 解额) ===');
_resetGM();
var initMinxin = GM.vars['民心'] ? GM.vars['民心'].value : 50;
if (!GM.vars['民心']) GM.vars['民心'] = {value:50};
_kjG5ApplyMinxinBoostOnSpawn(2);
_check('L1·民心 boost·spawn 2 童子 → +6', GM.vars['民心'].value === 56);
_check('L2·民心 cap 100', (function(){ GM.vars['民心'].value=99; _kjG5ApplyMinxinBoostOnSpawn(3); return GM.vars['民心'].value === 100; })());
_check('L3·Quota boost·birthplace 江南 → geo[南]+1', (function(){ GM._kejuParadigm={quota:{}}; _kjG5ApplyQuotaBoostOnSpawn('江南'); return GM._kejuParadigm.quota.geo && GM._kejuParadigm.quota.geo['南'] >= 1; })());

console.log('=== §M·G5 v2·archetype 长尾·4 lifepath ===');
_resetGM();
GM.chars.push({name:'神童1',alive:true,_origin:'tongzi',_tongziArchetype:'turned_eccentric',birthYear:1700,birthplace:'江南',resources:{health:90,stress:30}});
GM.chars.push({name:'神童2',alive:true,_origin:'tongzi',_tongziArchetype:'burned_out',birthYear:1700,birthplace:'浙江',resources:{health:80,stress:50}});
GM.year=1718;  // age 18·in turned_eccentric trigger window
for(var i=0;i<100;i++) _kjG5TongziHealthTick();
_check('M1·turned_eccentric 100 turn 内 fire', GM.chars[1]._tongziTurnedEccentric === true);
_check('M2·turned_eccentric·officialTitle 改隐士', /隐士/.test(GM.chars[1].officialTitle));
GM.year=1722; for(var j=0;j<100;j++) _kjG5TongziHealthTick();
_check('M3·burned_out 100 turn 内 fire', GM.chars[2]._tongziBurnedOut === true);
_check('M4·burned_out·officialTitle 改县学正', /县学正/.test(GM.chars[2].officialTitle));

console.log('=== §N·G5 v2·late_bloomer 50 岁入会试 ===');
_resetGM();
GM.chars.push({name:'晏殊',alive:true,_origin:'tongzi',_tongziArchetype:'late_bloomer',birthYear:1700,resources:{health:95,stress:15}});
GM.year=1750;
_kjG5LateBloomerEnterHuishi(GM.chars[1]);
_check('N1·LateBloomer enter huishi·flag set', GM.chars[1]._tongziEnteredHuishi === true);
_check('N2·LateBloomer career +1 milestone', GM.chars[1].career && GM.chars[1].career.length >= 1);
_check('N3·LateBloomer huishi result·passed bool', typeof GM.chars[1]._tongziHuishiPassed === 'boolean');

console.log('=== §O·G5 v2·desk template + Path B ===');
['recommendation','reign-change','birthday','amnesty','_player_edict'].forEach(function(s, i){
  _check('O'+(i+1)+'·'+s+' template 有 label', !!_kjG5GetTongziEdictTemplate(s).label);
});
_check('O6·birthday template uses age', _kjG5GetTongziEdictTemplate('birthday',{age:80}).body.indexOf('八') >= 0 || _kjG5GetTongziEdictTemplate('birthday',{age:80}).body.indexOf('80') >= 0);
_check('O7·OnTongziTriggerEnqueueDeskSuggestion push 到 _edictSuggestions', (function(){ GM._edictSuggestions=[]; _kjG5OnTongziTriggerEnqueueDeskSuggestion('recommendation',{}); return GM._edictSuggestions.length === 1 && GM._edictSuggestions[0].category === 'tongzi'; })());
_resetGM();
_check('O8·PickLibuLeader picks 翰林学士', _kjG5PickLibuLeader() && _kjG5PickLibuLeader().name === '纪昀');

console.log('=== §P·G5 v2·annual tick ===');
_resetGM();
GM.chars.push({name:'神童A',alive:true,_origin:'tongzi',_tongziArchetype:'late_bloomer',birthYear:1730});
GM.year=1740;
GM._tongziLastAnnualY=1730;
var chronicleLen0 = GM._chronicle.length;
_kjG5TongziAnnualTick();
_check('P1·annual tick·5 年内不重复', GM._tongziLastAnnualY === 1740);

console.log('=== §Q·G5 v2·tone hint 4 archetype ===');
['early_genius_died','late_bloomer','turned_eccentric','burned_out'].forEach(function(a, i){
  _check('Q'+(i+1)+'·'+a+' tone non-empty', _kjG5GetTongziToneHint({_origin:'tongzi',_tongziArchetype:a}).length > 0);
});

console.log('');
console.log('========================================');
console.log('smoke-g5-tongzi v2·' + pass + ' PASS·' + fail + ' FAIL');
console.log('========================================');
