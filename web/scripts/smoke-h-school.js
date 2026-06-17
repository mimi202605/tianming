/**
 * smoke-h-school.js·Phase H·私学/书院 mini-system·H0 + H1 sub-slice
 *
 * §A·flag gate·6 case
 * §B·init schoolNetwork·6 case
 * §C·founding event + 山长 spawn·10 case
 * §D·banned / restored / officialized·8 case
 * §E·tier 派生·5 case
 * §F·event hook (H0)·4 case
 * §G·民心影响·4 case
 * §H·resume hook·3 case
 */

global.window = {};
global.findCharByName = function(name) {
  if (!global.GM || !Array.isArray(global.GM.chars)) return null;
  return global.GM.chars.find(c => c && c.name === name);
};

require('../tm-keju-school-network.js');

const fns = {};
['_isHEnabled', '_kjpInitSchoolNetwork', '_kjpOnSchoolFounding',
 '_kjpOnSchoolBanned', '_kjpOnSchoolRestored', '_kjpOnSchoolOfficialized',
 '_kjpSpawnShanzhang', '_kjpCalcSchoolNetworkTier', '_kjpGetActiveAcademies',
 '_kjpResumeIfPending', '_kjpHEventOnSchoolFounding', '_kjpHEventOnSchoolBanned'
].forEach(n => fns[n] = global.window[n]);

let pass = 0, fail = 0;
function check(label, ok) { if (ok) { pass++; console.log('  PASS', label); } else { fail++; console.log('  FAIL', label); } }

function resetGM(opts) {
  opts = opts || {};
  global.GM = {
    turn: opts.turn || 100,
    year: opts.year || 1604,
    chars: opts.chars || [],
    vars: opts.vars || { '民心': { value: 50 } },
    _chronicle: []
  };
  global.P = {
    conf:     { useNewKejuH: opts.flagOn !== false },
    keju:     { schoolNetworkInit: opts.schoolNetworkInit || {
      academies: [
        { name: '东林书院', founder: '顾宪成', foundedYear: 1604, faction: '东林' }
      ],
      private_schools_active: true,
      note: 'Test'
    } },
    scenario: opts.scenario || { era: '明', startYear: 1604 },
    player:   { faction: '明朝廷' }
  };
}

// ═══ §A·flag gate ═══
console.log('=== §A·flag gate ===');

resetGM({ flagOn: true });
check('A1·flag on·_isHEnabled=true', fns._isHEnabled() === true);

resetGM({ flagOn: false });
check('A2·flag off·_isHEnabled=false', fns._isHEnabled() === false);

// flag off·OnFounding 返 null
resetGM({ flagOn: false });
check('A3·flag off·OnFounding 返 null',
      fns._kjpOnSchoolFounding({ name:'X', founder:'Y', foundedYear:1604 }) === null);

resetGM({ flagOn: false });
fns._kjpOnSchoolBanned('东林书院', 'reason');
check('A4·flag off·OnBanned 不写 chronicle',
      global.GM._chronicle.length === 0);

resetGM({ flagOn: false });
const t1 = fns._kjpCalcSchoolNetworkTier();
check('A5·flag off·tier=nascent (no SchoolNetwork)', t1 === 'nascent');

resetGM({ flagOn: false });
check('A6·flag off·SpawnShanzhang 返 null',
      fns._kjpSpawnShanzhang({ founder:'X', name:'Y' }) === null);

// ═══ §B·init schoolNetwork ═══
console.log('=== §B·init schoolNetwork ===');

resetGM({ flagOn: true });
fns._kjpInitSchoolNetwork();
check('B1·init·GM._schoolNetwork 存在',
      global.GM._schoolNetwork != null);
check('B2·init·academies 含 preset 东林书院',
      global.GM._schoolNetwork.academies.length === 1 &&
      global.GM._schoolNetwork.academies[0].name === '东林书院');
check('B3·init·academy.type 派生·东林书院 → 书院',
      global.GM._schoolNetwork.academies[0].type === '书院');
check('B4·init·academy.learning 派生·faction=东林 → 实学',
      global.GM._schoolNetwork.academies[0].learning === '实学');
check('B5·init·tier=nascent',
      global.GM._schoolNetwork.tier === 'nascent');

// 幂等·二次 init 不重置
const sn1 = global.GM._schoolNetwork;
fns._kjpInitSchoolNetwork();
check('B6·init·幂等·二次 init 不重置',
      global.GM._schoolNetwork === sn1);

// ═══ §C·founding event + 山长 spawn ═══
console.log('=== §C·founding event + 山长 spawn ===');

resetGM({ flagOn: true });
const academy1 = fns._kjpOnSchoolFounding({
  name: '岳麓书院', founder: '智璿', foundedYear: 976,
  faction: '中立', region: '长沙'
});
check('C1·founding·返 academy', academy1 != null && academy1.name === '岳麓书院');
check('C2·founding·academies 已含',
      global.GM._schoolNetwork.academies.find(a => a.name === '岳麓书院') != null);
check('C3·founding·山长真 spawn 进 GM.chars',
      global.GM.chars.find(c => c.name === '智璿') != null);
check('C4·founding·山长 _origin=shanzhang',
      global.GM.chars.find(c => c.name === '智璿')._origin === 'shanzhang');
check('C5·founding·山长 _academyName=岳麓书院',
      global.GM.chars.find(c => c.name === '智璿')._academyName === '岳麓书院');
check('C6·founding·山长 faction 空·非"在野"',
      global.GM.chars.find(c => c.name === '智璿').faction !== '在野');
check('C7·founding·山长 _inFaction=literati',
      global.GM.chars.find(c => c.name === '智璿')._inFaction === 'literati');
check('C8·founding·chronicle 含 school_founding',
      global.GM._chronicle.some(c => c.type === 'school_founding'));
check('C9·founding·_lastSchoolFoundedYear SET',
      global.GM._lastSchoolFoundedYear === 976);

// 防重·同 name 二次 founding 返 null
const dup = fns._kjpOnSchoolFounding({
  name: '岳麓书院', founder: '其他', foundedYear: 1000
});
check('C10·founding·防重·同 name 二次返 null', dup === null);

// ═══ §D·banned / restored / officialized ═══
console.log('=== §D·banned / restored / officialized ===');

resetGM({ flagOn: true });
fns._kjpInitSchoolNetwork();
const r1 = fns._kjpOnSchoolBanned('东林书院', '魏珰禁讲');
check('D1·banned·返 true', r1 === true);
const ax = global.GM._schoolNetwork.academies.find(a => a.name === '东林书院');
check('D2·banned·lifecycle=banned', ax.lifecycle === 'banned');
check('D3·banned·_lastSchoolBannedYear SET',
      global.GM._lastSchoolBannedYear === 1604);
check('D4·banned·chronicle 含 school_banned',
      global.GM._chronicle.some(c => c.type === 'school_banned'));

// banned 后 restored
const r2 = fns._kjpOnSchoolRestored('东林书院');
check('D5·restored·返 true', r2 === true);
check('D6·restored·lifecycle=restored', ax.lifecycle === 'restored');

// officialized
resetGM({ flagOn: true });
fns._kjpInitSchoolNetwork();
const r3 = fns._kjpOnSchoolOfficialized('东林书院');
const ay = global.GM._schoolNetwork.academies.find(a => a.name === '东林书院');
check('D7·officialized·返 true·lifecycle=official',
      r3 === true && ay.lifecycle === 'official');
// 重复 officialize 返 false
const r4 = fns._kjpOnSchoolOfficialized('东林书院');
check('D8·officialized·重复 返 false', r4 === false);

// ═══ §E·tier 派生 ═══
console.log('=== §E·tier 派生 ===');

resetGM({ flagOn: true });
fns._kjpInitSchoolNetwork();
check('E1·tier·初始 1 academy·tier=nascent',
      fns._kjpCalcSchoolNetworkTier() === 'nascent');

// active·≥2 academies
fns._kjpOnSchoolFounding({ name:'白鹿洞', founder:'朱熹', foundedYear:1180, faction:'理学' });
check('E2·tier·2 academies·tier=active',
      fns._kjpCalcSchoolNetworkTier() === 'active');

// dominant·≥5
['岳麓', '应天书院', '嵩阳', '关中', '复社'].forEach((n, i) => {
  fns._kjpOnSchoolFounding({ name:n, founder:'X'+i, foundedYear:1200+i, faction:'理学' });
});
check('E3·tier·≥5 academies·tier=dominant',
      fns._kjpCalcSchoolNetworkTier() === 'dominant');

// banned·若全 banned·tier=banned
resetGM({ flagOn: true });
fns._kjpInitSchoolNetwork();
fns._kjpOnSchoolBanned('东林书院', 'test');
check('E4·tier·全 banned·tier=banned',
      fns._kjpCalcSchoolNetworkTier() === 'banned');

// tier change chronicle
resetGM({ flagOn: true });
fns._kjpOnSchoolFounding({ name:'白鹿洞', founder:'朱熹', foundedYear:1180, faction:'理学' });
fns._kjpOnSchoolFounding({ name:'岳麓', founder:'智璿', foundedYear:976, faction:'中立' });
check('E5·tier·tier change chronicle (nascent → active)',
      global.GM._chronicle.some(c => c.type === 'school_tier_change'));

// ═══ §F·event hook (H0) ═══
console.log('=== §F·event hook (H0) ===');

resetGM({ flagOn: true });
fns._kjpHEventOnSchoolFounding('东林书院', 1604);
check('F1·event·_lastSchoolFoundedYear SET = 1604',
      global.GM._lastSchoolFoundedYear === 1604);

fns._kjpHEventOnSchoolBanned('东林书院', 1622);
check('F2·event·_lastSchoolBannedYear SET = 1622',
      global.GM._lastSchoolBannedYear === 1622);

// year default to GM.year
resetGM({ flagOn: true, year: 1500 });
fns._kjpHEventOnSchoolFounding('X');
check('F3·event·year default to GM.year (1500)',
      global.GM._lastSchoolFoundedYear === 1500);

// no GM·safe (不崩)
const _origGM = global.GM;
global.GM = undefined;
let safe = true;
try { fns._kjpHEventOnSchoolFounding('X', 1604); } catch(e) { safe = false; }
global.GM = _origGM;
check('F4·event·无 GM·不崩', safe === true);

// ═══ §G·民心影响 ═══
console.log('=== §G·民心影响 ===');

resetGM({ flagOn: true });
const before1 = global.GM.vars['民心'].value;
fns._kjpOnSchoolFounding({ name:'X', founder:'Y', foundedYear:1604 });
check('G1·founding·民心 +5·' + before1 + '→' + global.GM.vars['民心'].value,
      global.GM.vars['民心'].value === before1 + 5);

resetGM({ flagOn: true });
fns._kjpInitSchoolNetwork();
const before2 = global.GM.vars['民心'].value;
fns._kjpOnSchoolBanned('东林书院', 'test');
check('G2·banned·民心 -5·' + before2 + '→' + global.GM.vars['民心'].value,
      global.GM.vars['民心'].value === before2 - 5);

// cap 至 0 / 100
resetGM({ flagOn: true });
global.GM.vars['民心'].value = 98;
fns._kjpOnSchoolFounding({ name:'X', founder:'Y', foundedYear:1604 });
check('G3·founding·民心 cap 100·' + global.GM.vars['民心'].value + '<=100',
      global.GM.vars['民心'].value === 100);

resetGM({ flagOn: true });
global.GM.vars['民心'].value = 2;
fns._kjpInitSchoolNetwork();
fns._kjpOnSchoolBanned('东林书院', 'test');
check('G4·banned·民心 cap 0·' + global.GM.vars['民心'].value + '>=0',
      global.GM.vars['民心'].value === 0);

// ═══ §H·resume hook ═══
console.log('=== §H·resume hook ===');

resetGM({ flagOn: true });
fns._kjpResumeIfPending();
check('H1·resume·若 GM._schoolNetwork 不存·自动 init',
      global.GM._schoolNetwork != null);

resetGM({ flagOn: false });
fns._kjpResumeIfPending();
check('H2·resume·flag off·不 init', global.GM._schoolNetwork == null);

// resume·second call 不 reset
resetGM({ flagOn: true });
fns._kjpResumeIfPending();
const sn3 = global.GM._schoolNetwork;
fns._kjpResumeIfPending();
check('H3·resume·二次 call 幂等', global.GM._schoolNetwork === sn3);

// ═══ §I·H2·党派真 spawn 进 GM.parties ═══
console.log('=== §I·H2·党派真 spawn ===');

// mock _ty3_partySpawn (smoke env·tinyi v3 不 load)
global.window._ty3_partySpawn = function(opts) {
  if (!Array.isArray(global.GM.parties)) global.GM.parties = [];
  if (global.GM.parties.some(p => p.name === opts.name)) return null;
  var p = {
    name: opts.name, leader: opts.leaderName || (opts.founders||[])[0] || '',
    faction: opts.faction || '', influence: opts.initialInfluence || 30,
    cohesion: opts.initialCohesion || 75, ideology: opts.ideology || '',
    members: (opts.founders||[]).join(','), memberCount: (opts.founders||[]).length,
    policyStance: opts.policyStances || [], foundYear: global.GM.year || 0,
    status: opts.status || 'active', desc: opts.desc || '', currentAgenda: opts.agenda || ''
  };
  global.GM.parties.push(p);
  return p;
};

// H2·I1·东林书院 founding·_ty3_partySpawn 真 spawn 东林党
resetGM({ flagOn: true, schoolNetworkInit: { academies: [], private_schools_active: true } });
global.GM.parties = [];
const _ax1 = global.window._kjpOnSchoolFounding({
  name:'东林书院', founder:'顾宪成', foundedYear:1604, faction:'东林', region:'无锡'
});
check('I1·H2·founding 东林·_ty3_partySpawn 真 push 东林党',
      global.GM.parties.some(p => p.name === '东林党'));
check('I2·H2·山长 char.party = 东林党',
      global.GM.chars.find(c => c.name === '顾宪成').party === '东林党');
check('I3·H2·东林党 leader = 顾宪成',
      global.GM.parties.find(p => p.name === '东林党').leader === '顾宪成');
check('I4·H2·东林党 ideology 含"实学·议政清议"',
      global.GM.parties.find(p => p.name === '东林党').ideology.indexOf('实学') >= 0);
check('I5·H2·东林党 policyStance 含 anti-阉党',
      global.GM.parties.find(p => p.name === '东林党').policyStance.indexOf('anti-阉党') >= 0);

// I6·复社·partySpawn
resetGM({ flagOn: true, schoolNetworkInit: { academies: [], private_schools_active: true } });
global.GM.parties = [];
global.window._kjpOnSchoolFounding({ name:'复社', founder:'张溥', foundedYear:1629, faction:'复社' });
check('I6·H2·复社 founding·party 真 spawn',
      global.GM.parties.some(p => p.name === '复社'));

// I7·官学·faction 非已知党派·skip spawn
resetGM({ flagOn: true, schoolNetworkInit: { academies: [], private_schools_active: true } });
global.GM.parties = [];
global.window._kjpOnSchoolFounding({ name:'太学', founder:'X', foundedYear:-124, faction:'官学' });
check('I7·H2·官学 faction·非已知党派·skip spawn (parties=0)',
      global.GM.parties.length === 0);

// I8·防重·同名党再 spawn return existing
resetGM({ flagOn: true, schoolNetworkInit: { academies: [], private_schools_active: true } });
global.GM.parties = [];
global.window._kjpOnSchoolFounding({ name:'东林书院', founder:'顾宪成', foundedYear:1604, faction:'东林' });
global.window._kjpOnSchoolFounding({ name:'首善书院', founder:'邹元标', foundedYear:1622, faction:'东林' });
check('I8·H2·二次 founding 同党·不重 spawn·只 1 个东林党',
      global.GM.parties.filter(p => p.name === '东林党').length === 1);
check('I9·H2·二次 founding·邹元标 add to party.members',
      global.GM.parties.find(p => p.name === '东林党').members.indexOf('邹元标') >= 0);

// ═══ §J·H2·lineage chain (F1 disciple-graph) ═══
console.log('=== §J·H2·lineage chain ===');

// mock _kjAddDiscipleEdge (smoke env·D1 不 load)
const _lineageCalls = [];
global.window._kjAddDiscipleEdge = function(disciple, mentor, cohortYear, addedTurn) {
  _lineageCalls.push({ disciple, mentor, cohortYear, addedTurn });
};

resetGM({ flagOn: true, schoolNetworkInit: { academies: [], private_schools_active: true } });
global.GM.parties = [];
_lineageCalls.length = 0;
global.window._kjpOnSchoolFounding({
  name:'东林书院', founder:'顾宪成', foundedYear:1604, faction:'东林'
});
check('J1·H2·lineage·_kjAddDiscipleEdge 真 wire (≥1 call)',
      _lineageCalls.length >= 1);
check('J2·H2·lineage·顾宪成 → 高攀龙 真 chain',
      _lineageCalls.some(c => c.mentor === '顾宪成' && c.disciple === '高攀龙'));
check('J3·H2·lineage·顾宪成 → 钱一本 真 chain',
      _lineageCalls.some(c => c.mentor === '顾宪成' && c.disciple === '钱一本'));
check('J4·H2·lineage·cohortYear = academy.foundedYear',
      _lineageCalls.every(c => c.cohortYear === 1604));
check('J5·H2·lineage·山长 _disciples 含 高攀龙/钱一本',
      global.GM.chars.find(c => c.name === '顾宪成')._disciples.indexOf('高攀龙') >= 0 &&
      global.GM.chars.find(c => c.name === '顾宪成')._disciples.indexOf('钱一本') >= 0);

// J6·朱熹 lineage·shanzhang 已存 historical 不重 spawn·_disciples 真填
resetGM({ flagOn: true, schoolNetworkInit: { academies: [], private_schools_active: true } });
global.GM.chars = [{ name:'朱熹', alive:true, officialTitle:'侍讲', age:60 }];
_lineageCalls.length = 0;
global.window._kjpOnSchoolFounding({
  name:'白鹿洞书院', founder:'朱熹', foundedYear:1180, faction:'理学'
});
check('J6·H2·朱熹 existing char·lineage 真 wire',
      _lineageCalls.some(c => c.mentor === '朱熹' && c.disciple === '黄榦'));

// J7·non-historical founder·无 lineage table·skip
resetGM({ flagOn: true, schoolNetworkInit: { academies: [], private_schools_active: true } });
_lineageCalls.length = 0;
global.window._kjpOnSchoolFounding({
  name:'XX 书院', founder:'无名小辈', foundedYear:1500, faction:'理学'
});
check('J7·H2·non-historical founder·lineage call=0', _lineageCalls.length === 0);

// ═══ §K·H2·5 archetype tone ═══
console.log('=== §K·H2·archetype tone ===');

const arch1 = global.window._kjpInferShanzhangArchetype({ _origin:'shanzhang', _lectureLearning:'心学' });
check('K1·H2·archetype·心学 → radical_xinxue', arch1 === 'radical_xinxue');

const arch2 = global.window._kjpInferShanzhangArchetype({ _origin:'shanzhang', _lectureLearning:'实学·议政' });
check('K2·H2·archetype·实学议政 → reformist_shixue', arch2 === 'reformist_shixue');

const arch3 = global.window._kjpInferShanzhangArchetype({ _origin:'shanzhang', _lectureLearning:'理学' });
check('K3·H2·archetype·理学 → traditional_lixue', arch3 === 'traditional_lixue');

const arch4 = global.window._kjpInferShanzhangArchetype({ _origin:'shanzhang', _lectureLearning:'关学·实学' });
check('K4·H2·archetype·关学·实学 → reformist_shixue (实学先)',
      arch4 === 'reformist_shixue');

const arch5 = global.window._kjpInferShanzhangArchetype({ _origin:'shanzhang', name:'黄宗羲' });
check('K5·H2·archetype·黄宗羲 → yimin_skeptic', arch5 === 'yimin_skeptic');

const tone1 = global.window._kjpGetShanzhangToneHint({ _origin:'shanzhang', _lectureLearning:'心学' });
check('K6·H2·tone·心学 含 "知行合一"', tone1.indexOf('知行合一') >= 0);

const tone2 = global.window._kjpGetShanzhangToneHint({ _origin:'enke' });
check('K7·H2·tone·non-shanzhang 返空', tone2 === '');

// ═══ §L·H2·tinyi affinity helper (DEFERRED) ═══
console.log('=== §L·H2·tinyi affinity ===');

resetGM({ flagOn: true });
global.GM.chars = [
  { name:'A', party:'东林党' },
  { name:'B', party:'理学派' },
  { name:'C', party:'心学派' },
  { name:'D', party:'' }
];
check('L1·H2·affinity·东林党+阉党议题=-30',
      global.window._kjpGetSchoolPartyTinyiAffinityBonus('A', '议·阉党 X') === -30);
check('L2·H2·affinity·东林党+讲学议题=+25',
      global.window._kjpGetSchoolPartyTinyiAffinityBonus('A', '议·讲学') === +25);
check('L3·H2·affinity·东林党+禁讲学=-40',
      global.window._kjpGetSchoolPartyTinyiAffinityBonus('A', '议·禁讲学') === -40);
check('L4·H2·affinity·理学派+格物=+20',
      global.window._kjpGetSchoolPartyTinyiAffinityBonus('B', '议·格物致知') === +20);
check('L5·H2·affinity·心学派+知行=+20',
      global.window._kjpGetSchoolPartyTinyiAffinityBonus('C', '议·知行合一') === +20);
check('L6·H2·affinity·无党人=0',
      global.window._kjpGetSchoolPartyTinyiAffinityBonus('D', '议·X') === 0);

// ═══ §M·RAA·small audit 全修 8 项 ═══
console.log('=== §M·RAA·small audit ===');

// C1·cross-scenario reset·H 字段入 reset list
require('../tm-keju-event-hooks.js');
resetGM({ flagOn: true });
global.GM.year = 1700;
global.GM._schoolNetwork = { academies: [], tier: 'active' };
global.GM._lastSchoolFoundedYear = 1604;
global.GM._lastSchoolBannedYear = 1622;
global.GM._kjpHTierChangeFiredTurn = 99;
// 模拟新 scenario·跳到 1127 startYear
global.P.scenario = { era: '宋', startYear: 1127 };
global.GM.year = 1127;
global.window._kjG2MaybeResetCrossScenarioFields();
check('M1·C1·跨剧本·_schoolNetwork 清', global.GM._schoolNetwork == null);
check('M2·C1·跨剧本·_lastSchoolFoundedYear 清', global.GM._lastSchoolFoundedYear == null);
check('M3·C1·跨剧本·_lastSchoolBannedYear 清', global.GM._lastSchoolBannedYear == null);
check('M4·C1·跨剧本·_kjpHTierChangeFiredTurn 清', global.GM._kjpHTierChangeFiredTurn == null);

// H1·existing dead char·skip spawn (返 null)
resetGM({ flagOn: true, schoolNetworkInit: { academies: [], private_schools_active: true } });
global.GM.chars = [{ name:'朱熹', alive:false, _origin:'enke' }];
const skipDead = global.window._kjpSpawnShanzhang({
  founder: '朱熹', name: '白鹿洞', foundedYear: 1180, faction: '理学'
});
check('M5·H1·existing dead char·spawn 返 null', skipDead == null);

// H2·existing char with _origin·preserve (不 override)
resetGM({ flagOn: true, schoolNetworkInit: { academies: [], private_schools_active: true } });
global.GM.chars = [{ name:'朱熹', alive:true, _origin:'enke' }];
const sz = global.window._kjpSpawnShanzhang({
  founder: '朱熹', name: '白鹿洞', foundedYear: 1180, faction: '理学'
});
check('M6·H2·existing char _origin=enke·preserve (非 override)', sz._origin === 'enke');
check('M7·H2·existing char·_academyName mark', sz._academyName === '白鹿洞');

// H3·_kjpMaybeSpawnSchoolParty fallback·chronicle 写 (smoke env·_ty3_partySpawn mock 失败时)
resetGM({ flagOn: true, schoolNetworkInit: { academies: [], private_schools_active: true } });
global.GM.parties = [];
delete global.window._ty3_partySpawn;   // 真删·走 fallback
const chronBefore = global.GM._chronicle.length;
global.window._kjpOnSchoolFounding({
  name:'东林书院', founder:'顾宪成', foundedYear:1604, faction:'东林'
});
const fbChron = global.GM._chronicle.find(c => c.type === '党祸·新党生');
check('M8·H3·fallback 也写 chronicle 新党生', fbChron != null);
check('M9·H3·fallback 标 source=school-fallback',
      fbChron && Array.isArray(fbChron.tags) && fbChron.tags.indexOf('school-fallback') >= 0);

// M2·YIMIN_SCHOLARS 配置表
const arch_huang = global.window._kjpInferShanzhangArchetype({ _origin:'shanzhang', name:'黄宗羲' });
const arch_wang = global.window._kjpInferShanzhangArchetype({ _origin:'shanzhang', name:'王夫之' });
const arch_gu = global.window._kjpInferShanzhangArchetype({ _origin:'shanzhang', name:'顾炎武' });
check('M10·M2·黄宗羲 → yimin_skeptic', arch_huang === 'yimin_skeptic');
check('M11·M2·王夫之 → yimin_skeptic', arch_wang === 'yimin_skeptic');
check('M12·M2·顾炎武 → yimin_skeptic (扩 list)', arch_gu === 'yimin_skeptic');

// M3·per-turn tier dedupe
resetGM({ flagOn: true, schoolNetworkInit: { academies: [], private_schools_active: true } });
// 同 turn·spawn 多 academies·tier change 应 chronicle 仅一次
global.window._kjpOnSchoolFounding({ name:'白鹿洞', founder:'朱熹', foundedYear:1180, faction:'理学' });
global.window._kjpOnSchoolFounding({ name:'岳麓', founder:'张栻', foundedYear:1180, faction:'理学' });
const tierChrons = global.GM._chronicle.filter(c => c.type === 'school_tier_change');
check('M13·M3·同 turn 多 founding·tier change chronicle 仅 1 次',
      tierChrons.length === 1);

// M4·HISTORICAL_LINEAGE keys 入 founders 自动 isHistorical (验通过 spawn check)
resetGM({ flagOn: true, schoolNetworkInit: { academies: [], private_schools_active: true } });
const sz_zhang = global.window._kjpSpawnShanzhang({
  founder: '张溥', name: '复社', foundedYear: 1629, faction: '复社'
});
check('M14·M4·张溥·HISTORICAL_LINEAGE keys 自动 isHistorical=true',
      sz_zhang.isHistorical === true);

// ═══ §N·H3·学说改 paradigm.subjects ═══
console.log('=== §N·H3·paradigm.subjects ===');

// N1·LEARNING_TO_SUBJECT map·理学 → lixue
const subj1 = global.window._kjpMapLearningToSubject('理学');
check('N1·H3·理学 → subject lixue', subj1 && subj1.id === 'lixue');
const subj2 = global.window._kjpMapLearningToSubject('心学');
check('N2·H3·心学 → subject xinxue', subj2 && subj2.id === 'xinxue');
const subj3 = global.window._kjpMapLearningToSubject('实学');
check('N3·H3·实学 → subject shixue', subj3 && subj3.id === 'shixue');
const subj4 = global.window._kjpMapLearningToSubject('杂学');
check('N4·H3·杂学 → null (无映射)', subj4 == null);

// N5·Path β·weight tick drift·小幅 +2
resetGM({ flagOn: true, schoolNetworkInit: { academies: [], private_schools_active: true } });
global.GM._kejuParadigm = {
  subjects: [
    { id: 'bagu',  name: '八股', weight: 70, ideology: 'traditional' },
    { id: 'lixue', name: '理学', weight: 10, ideology: 'traditional' }
  ]
};
// spawn 理学 academy + flourishing
global.window._kjpOnSchoolFounding({ name:'白鹿洞', founder:'朱熹', foundedYear:1180, faction:'理学' });
const ax_bld = global.GM._schoolNetwork.academies.find(a => a.name === '白鹿洞');
// lifecycle = 'founding' (init)·tick 应漂
const driftCount = global.window._kjpHTickSubjectWeightDrift();
check('N5·H3·Path β·tick drift +1 (理学书院)', driftCount >= 1);
const lixueSubj = global.GM._kejuParadigm.subjects.find(s => s.id === 'lixue');
check('N6·H3·Path β·理学 weight 10 → 12 (+2)', lixueSubj.weight === 12);

// N7·Path β·cap ±10·多次 tick 不超
for (let i = 0; i < 10; i++) global.window._kjpHTickSubjectWeightDrift();
const lixueSubjFinal = global.GM._kejuParadigm.subjects.find(s => s.id === 'lixue');
check('N7·H3·Path β·上限 10·weight 不超 20 (10 + 10)',
      lixueSubjFinal.weight <= 20);

// N8·Path α·enqueue paradigm shift keyi
resetGM({ flagOn: true, schoolNetworkInit: { academies: [], private_schools_active: true } });
global.GM._kejuParadigm = { subjects: [{ id:'bagu', name:'八股', weight:80 }] };
global.window._kjpOnSchoolFounding({ name:'阳明书院', founder:'王守仁', foundedYear:1510, faction:'心学' });
const ax_ym = global.GM._schoolNetwork.academies.find(a => a.name === '阳明书院');
const entry = global.window._kjpHEnqueueParadigmShiftKeyi(ax_ym, 'add');
check('N8·H3·Path α·enqueue 返 entry', entry != null);
check('N9·H3·Path α·entry.paradigmDiff.subjects.added 含 心学',
      entry.paradigmDiff.subjects.added.length === 1 &&
      entry.paradigmDiff.subjects.added[0].name === '心学');
check('N10·H3·Path α·entry.intent=reform', entry.intent === 'reform');
check('N11·H3·Path α·GM._kjpHPendingParadigmShifts +1',
      global.GM._kjpHPendingParadigmShifts.length === 1);
check('N12·H3·Path α·chronicle 含 school_paradigm_shift_enqueued',
      global.GM._chronicle.some(c => c.type === 'school_paradigm_shift_enqueued'));

// N13·DetectParadigmShiftCandidate·dominant tier + ≥2 同学派
resetGM({ flagOn: true, schoolNetworkInit: { academies: [], private_schools_active: true } });
['白鹿洞', '岳麓·朱', '嵩阳·朱', '应天·朱', '关中·朱'].forEach((n, i) => {
  global.window._kjpOnSchoolFounding({ name:n, founder:'X'+i, foundedYear:1200+i, faction:'理学' });
});
const cand = global.window._kjpHDetectParadigmShiftCandidate();
check('N13·H3·dominant tier + ≥2 理学书院·候选 ≥1',
      cand.length >= 1 && cand[0].subjectId === 'lixue');

// ═══ §O·H4·讲会 LLM ═══
console.log('=== §O·H4·讲会 LLM ===');

// O1·pick template by name
const tpl1 = global.window._kjpHPickLectureTemplate({ name:'东林书院', learning:'实学' });
check('O1·H4·东林书院 → 东林讲会', tpl1 && tpl1.venue === '东林书院');
const tpl2 = global.window._kjpHPickLectureTemplate({ name:'白鹿洞', learning:'理学' });
check('O2·H4·白鹿洞 → 白鹿洞讲会', tpl2 && tpl2.year === 1180);
const tpl3 = global.window._kjpHPickLectureTemplate({ name:'其他', learning:'心学' });
check('O3·H4·fallback by learning·心学 → 泰州学派', tpl3 && tpl3.year === 1530);

// O4·build prompt 含 academy name + year + topic
resetGM({ flagOn: true });
const tpl4 = global.window._kjpHPickLectureTemplate({ name:'白鹿洞', learning:'理学' });
const prompt = global.window._kjpHBuildLectureMeetingPrompt(
  { name:'白鹿洞', founder:'朱熹', learning:'理学' }, null, tpl4
);
check('O4·H4·prompt 含 "讲会"', prompt.indexOf('讲会') >= 0);
check('O5·H4·prompt 含 "朱熹"', prompt.indexOf('朱熹') >= 0);
check('O6·H4·prompt 含 "禁玄幻"', prompt.indexOf('禁玄幻') >= 0);

// O7·fallback 生成
const fb = global.window._kjpHGenLectureMeetingFallback(
  { name:'东林书院', founder:'顾宪成', learning:'实学' }, null, tpl1
);
check('O7·H4·fallback 含 academy name', fb.indexOf('东林书院') >= 0);
check('O8·H4·fallback 含 founder', fb.indexOf('顾宪成') >= 0);

// O9·run LLM·无 callAI·走 fallback·_finalize·写 chronicle + queue 清
resetGM({ flagOn: true, schoolNetworkInit: { academies: [{ name:'东林书院', founder:'顾宪成', foundedYear:1604, faction:'东林' }], private_schools_active: true } });
global.window._kjpInitSchoolNetwork();
const ax_dl = global.GM._schoolNetwork.academies[0];
let cbCalled = false;
global.window._kjpHRunLectureMeetingLLM(ax_dl, null, function(rec) { cbCalled = true; });
check('O9·H4·run·callback fired', cbCalled === true);
check('O10·H4·run·chronicle 含 lecture_meeting',
      global.GM._chronicle.some(c => c.type === 'lecture_meeting'));
check('O11·H4·run·queue finalize 清', !global.GM._kjpHLectureQueue || global.GM._kjpHLectureQueue.length === 0);
check('O12·H4·run·academy._lastLectureYear SET', ax_dl._lastLectureYear === 1604);

// O13·防重·同 academy + year·queue dedupe
resetGM({ flagOn: true, schoolNetworkInit: { academies: [{ name:'东林书院', founder:'顾宪成', foundedYear:1604, faction:'东林' }], private_schools_active: true } });
global.window._kjpInitSchoolNetwork();
// mock callAI to leave pending (never resolve)
global.window.callAI = function() { return new Promise(function() {}); };
global.P.ai = { key: 'x' };
global.window._kjpHRunLectureMeetingLLM(global.GM._schoolNetwork.academies[0], null, null);
const qLen1 = (global.GM._kjpHLectureQueue || []).length;
global.window._kjpHRunLectureMeetingLLM(global.GM._schoolNetwork.academies[0], null, null);
const qLen2 = (global.GM._kjpHLectureQueue || []).length;
check('O13·H4·防重·同 key 不二次 push', qLen1 === qLen2);
delete global.window.callAI;
delete global.P.ai;

// O14·resume·stale (>3 turn) 清 + chronicle 散佚
resetGM({ flagOn: true });
global.GM._kjpHLectureQueue = [{
  key: 'X:1604', academyName:'X', year:1604, startTurn:90   // GM.turn=100·staleTurns=10
}];
global.window._kjpHResumeLectureIfPending();
check('O14·H4·resume·stale queue 清', global.GM._kjpHLectureQueue.length === 0);
check('O15·H4·resume·散佚 chronicle 写',
      global.GM._chronicle.some(c => c.type === 'lecture_meeting' && (c.tags || []).indexOf('fallback') >= 0));

// ═══ §P·H5·desk template + Path B wendui + parser ═══
console.log('=== §P·H5·player initiative ===');

// P1·desk template suggestion·ban subtype·source 含书院
resetGM({ flagOn: true, schoolNetworkInit: { academies: [], private_schools_active: true } });
global.window._kjpHOnSchoolTriggerEnqueueDeskSuggestion('ban', { academyName: '东林书院' });
check('P1·H5·desk suggestion push 1·source 含 书院',
      global.GM._edictSuggestions && global.GM._edictSuggestions[0].source.indexOf('书院') >= 0);
check('P2·H5·topic 含 禁讲',
      global.GM._edictSuggestions[0].topic.indexOf('禁讲') >= 0);

// P3·幂等·同 subtype + 同年 + 同 academy 不重
global.window._kjpHOnSchoolTriggerEnqueueDeskSuggestion('ban', { academyName: '东林书院' });
check('P3·H5·幂等·同 subtype/academy 不重', global.GM._edictSuggestions.length === 1);

// P4·朝代 label
resetGM({ flagOn: true, scenario: { era: '明', startYear: 1604 } });
check('P4·H5·明 → 学政 label', global.window._kjpHGetXuezhengLabel() === '学政');
resetGM({ flagOn: true, scenario: { era: '清·乾隆', startYear: 1735 } });
check('P5·H5·清 → 督学使 label', global.window._kjpHGetXuezhengLabel() === '督学使');
resetGM({ flagOn: true, scenario: { era: '唐', startYear: 700 } });
check('P6·H5·唐 → 礼部·议讲学 label', global.window._kjpHGetXuezhengLabel().indexOf('礼部') >= 0);

// P7·Path B wendui open
resetGM({ flagOn: true });
global.GM.chars = [{ name:'王锡爵', alive:true, officialTitle:'礼部尚书', integrity:80, intelligence:80 }];
global.window.openWenduiModal = function(name, mode, prefill) { global._wenduiCall = { name, mode }; };
global.window.toast = function() {};
const okWendui = global.window._kjpHOpenLibuSchoolWendui();
check('P7·H5·Path B open·返 true', okWendui === true);
check('P8·H5·openWenduiModal 调·name=王锡爵', global._wenduiCall && global._wenduiCall.name === '王锡爵');
check('P9·H5·context set', global.window._kjpHSchoolWenduiContext != null);

// P10·防重·本年已问
const okWendui2 = global.window._kjpHOpenLibuSchoolWendui();
check('P10·H5·本年已问·返 false', okWendui2 === false);

// P11·wendui close stance·high integrity → support
resetGM({ flagOn: true });
global.GM.chars = [{ name:'高攀龙', alive:true, officialTitle:'学政', integrity:95, intelligence:80 }];
global.window._kjpHSchoolWenduiContext = { leaderName:'高攀龙', year:1604, schoolTier:'active', openedAtTurn:100 };
const cls1 = global.window._kjpHOnSchoolWenduiClose('高攀龙');
check('P11·H5·high integrity close·返 true', cls1 === true);
check('P12·H5·support → desk suggestion promote push',
      global.GM._edictSuggestions && global.GM._edictSuggestions.some(s => s._schoolSubtype === 'promote'));

// P13·parser·ban
const parsed1 = global.window._kjpHParseSchoolFromEdictText('诏·禁讲学一概·钦此');
check('P13·H5·parser·ban', parsed1 != null && parsed1.subtype === 'ban');

const parsed2 = global.window._kjpHParseSchoolFromEdictText('诏·扶白鹿洞书院·赐田一千亩');
check('P14·H5·parser·扶 → promote', parsed2 != null && parsed2.subtype === 'promote');

const parsed3 = global.window._kjpHParseSchoolFromEdictText('诏·复立东林书院');
check('P15·H5·parser·复立 → restore', parsed3 != null && parsed3.subtype === 'restore');

const parsed4 = global.window._kjpHParseSchoolFromEdictText('诏·不相干内容');
check('P16·H5·parser·无关·null', parsed4 == null);

// P17·keyi callback·ban path
resetGM({ flagOn: true, schoolNetworkInit: { academies: [{ name:'东林书院', founder:'顾宪成', foundedYear:1604, faction:'东林' }], private_schools_active: true } });
global.window._kjpInitSchoolNetwork();
global.window._kjSchoolBanKeyiCallback('ban', { passed:true, topicData:{ school:'东林书院', reason:'议禁' } });
const ax_dl_b = global.GM._schoolNetwork.academies.find(a => a.name === '东林书院');
check('P17·H5·keyi callback ban·lifecycle=banned', ax_dl_b.lifecycle === 'banned');

// P18·keyi callback·promote path
resetGM({ flagOn: true, schoolNetworkInit: { academies: [{ name:'东林书院', founder:'顾宪成', foundedYear:1604, faction:'东林', influence:30 }], private_schools_active: true } });
global.window._kjpInitSchoolNetwork();
global.window._kjSchoolBanKeyiCallback('promote', { passed:true, topicData:{ school:'东林书院' } });
const ax_dl_p = global.GM._schoolNetwork.academies.find(a => a.name === '东林书院');
check('P18·H5·keyi callback promote·influence +10', ax_dl_p.influence === 40);

// ═══ §Q·H6·incident hookup ═══
console.log('=== §Q·H6·incident hookup ===');

// 山长被押 → _kjSpawnYanguanQingyi 真触
let yqCalled = null;
global.window._kjSpawnYanguanQingyi = function(party, attacked, detail) {
  yqCalled = { party, attacked, detail };
  return true;
};
resetGM({ flagOn: true, schoolNetworkInit: { academies: [], private_schools_active: true } });
global.GM.parties = [];
global.window._kjpOnSchoolFounding({ name:'东林书院', founder:'顾宪成', foundedYear:1604, faction:'东林' });
const yqRes = global.window._kjpHOnShanzhangImpeached('顾宪成', '魏珰禁讲学');
check('Q1·H6·shanzhang impeached·返 true', yqRes === true);
check('Q2·H6·_kjSpawnYanguanQingyi 真调·party=东林党',
      yqCalled && yqCalled.party === '东林党');
check('Q3·H6·attacked=顾宪成', yqCalled.attacked === '顾宪成');

// Q4·martyred·spawn 反弹党
resetGM({ flagOn: true, schoolNetworkInit: { academies: [], private_schools_active: true } });
global.GM.parties = [];
global.window._kjpOnSchoolFounding({ name:'东林书院', founder:'顾宪成', foundedYear:1604, faction:'东林' });
const rebel = global.window._kjpHOnShanzhangMartyred('顾宪成', 'test-ws');
check('Q4·H6·martyred·spawn 反弹党', rebel != null && rebel.name === '东林党遗党');
const gushan = global.GM.chars.find(c => c.name === '顾宪成');
check('Q5·H6·martyred·char.alive=false', gushan.alive === false);

// Q6·cap·同 watershed 二次 不 spawn
const rebel2 = global.window._kjpHOnShanzhangMartyred('其他人', 'test-ws');
check('Q6·H6·cap·同 watershed key·二次 returns null', rebel2 == null);

// ═══ §R·H7·地理 + 民心 ═══
console.log('=== §R·H7·地理 + 民心 ===');

resetGM({ flagOn: true });
global.GM.provinces = [{ name:'无锡', _bonusInfra: { kejuQuota: 5 } }];
global.window._kjpHApplyRegionEffects({
  region: '无锡', lifecycle: 'flourishing'
});
check('R1·H7·flourishing·prov.kejuQuota +1·5 → 6',
      global.GM.provinces[0]._bonusInfra.kejuQuota === 6);

global.window._kjpHApplyRegionEffects({
  region: '无锡', lifecycle: 'banned'
});
check('R2·H7·banned·prov.kejuQuota -1·6 → 5',
      global.GM.provinces[0]._bonusInfra.kejuQuota === 5);

// R3·tagJinshiFromRegion·_academyOrigin
resetGM({ flagOn: true });
global.GM._schoolNetwork = {
  academies: [{ name:'东林书院', region:'无锡', faction:'东林' }],
  tier: 'active', shanzhangByAcademy: {}
};
const j = { name:'X', birthplace:'无锡' };
global.window._kjpHTagJinshiFromRegion(j);
check('R3·H7·jinshi birthplace=无锡 → _academyOrigin=东林书院',
      j._academyOrigin === '东林书院');

// ═══ §S·H8·反馈循环 ═══
console.log('=== §S·H8·反馈循环 ===');

resetGM({ flagOn: true, schoolNetworkInit: { academies: [], private_schools_active: true } });
global.GM._corruption = 70;
global.GM.partyStrife = 80;
const fb_s1 = global.window._kjpHTickFeedbackLoop();
check('S1·H8·腐败 + 党争·trigger 1', fb_s1 === 1);
check('S2·H8·spawn 民间书院',
      global.GM._schoolNetwork.academies.some(a => a.name.indexOf('民间书院') >= 0));

// S3·cooldown·二次 tick 不 fire
const fb_s2 = global.window._kjpHTickFeedbackLoop();
check('S3·H8·cooldown·二次 tick 不 fire', fb_s2 === 0);

// S4·per-turn guard·同 turn 不 fire
global.GM._kjpHFeedbackCooldown = {};
global.window._kjpHTickFeedbackLoop();
const fb_s4 = global.window._kjpHTickFeedbackLoop();
check('S4·H8·per-turn guard·同 turn 二次 不 fire', fb_s4 === 0);

// ═══ §T·H9·watershed event ═══
console.log('=== §T·H9·watershed event ===');

// T1·1604 东林书院立·party-spawn 东林党
resetGM({ flagOn: true, year: 1604, scenario: { era: '明', startYear: 1604 } });
global.GM.parties = [];
const wsFired1 = global.window._kjpHCheckWatershedEvents();
check('T1·H9·1604·watershed fired 1+', wsFired1 >= 1);
check('T2·H9·1604·watershed chronicle',
      global.GM._chronicle.some(c => c.type === 'school_watershed'));

// T3·1290·元朝 gate·若 era=元·officialize-all
resetGM({ flagOn: true, year: 1290, scenario: { era: '元', startYear: 1271 } });
global.GM._schoolNetwork = { academies: [{ name:'X', lifecycle:'founding', faction:'中立' }], tier:'active', shanzhangByAcademy:{} };
global.window._kjpHCheckWatershedEvents();
check('T3·H9·元·1290·officialize-all',
      global.GM._schoolNetwork.academies[0].lifecycle === 'official');

// T4·1654·清·ban-all
resetGM({ flagOn: true, year: 1654, scenario: { era: '清', startYear: 1644 } });
global.GM._schoolNetwork = { academies: [{ name:'Y', lifecycle:'founding', faction:'中立' }], tier:'active', shanzhangByAcademy:{} };
global.window._kjpHCheckWatershedEvents();
check('T4·H9·清·1654·ban-all',
      global.GM._schoolNetwork.academies[0].lifecycle === 'banned');

// T5·防重·同 turn 二次 check·不 fire (_kjpHWatershedFired 标)
resetGM({ flagOn: true, year: 1190, scenario: { era: '宋', startYear: 1127 } });
global.GM._kejuParadigm = { subjects: [{ id:'lixue', name:'理学', weight:10 }] };
const fired_a = global.window._kjpHCheckWatershedEvents();
const fired_b = global.window._kjpHCheckWatershedEvents();
check('T5·H9·防重·一次后 fired=0', fired_b === 0);

// T6·era gate skip·若非清·1654 不触
resetGM({ flagOn: true, year: 1654, scenario: { era: '宋', startYear: 1127 } });
global.GM._schoolNetwork = { academies: [{ name:'Z', lifecycle:'founding', faction:'中立' }], tier:'active', shanzhangByAcademy:{} };
global.window._kjpHCheckWatershedEvents();
check('T6·H9·era gate·非清·1654 不 ban',
      global.GM._schoolNetwork.academies[0].lifecycle !== 'banned');

// ═══ §U·H10·字段深生成 ═══
console.log('=== §U·H10·字段深生成 ===');

const a1 = { name:'X', faction:'东林' };
global.window._kjpHEnrichAcademyFields(a1);
check('U1·H10·东林 → ideology=reformist', a1.ideology === 'reformist');
check('U2·H10·东林 → curriculum 含 时务',
      Array.isArray(a1.curriculum) && a1.curriculum.indexOf('时务') >= 0);

const a2 = { name:'Y', faction:'理学' };
global.window._kjpHEnrichAcademyFields(a2);
check('U3·H10·理学 → ideology=traditional', a2.ideology === 'traditional');
check('U4·H10·events array init', Array.isArray(a2.events));

// ═══ summary ═══
console.log('\n========================================');
console.log(`smoke-h-school·${pass} PASS·${fail} FAIL`);
console.log('========================================');
