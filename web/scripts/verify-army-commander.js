#!/usr/bin/env node
/* eslint-env node */
'use strict';
// 部队统帅 linkage 验证·2026-05-30
// 验 tm-ai-change-army.js 新增的三件套：
//   reconcileArmyCommanders（回合末按统帅死活摘帅·death-agnostic·与 apply-deaths 级联去重防双扣士气）
//   vacateArmiesByCommander（免职即解兵权·alive-but-removed）
//   bindCommanderFromAppointment（确定性下诏任免主帅·防区/名称/单兵默认·定不到不硬绑）
// 注：bind 的端到端（诏书文本→extractEdictActions→applyEdictActions→这里）须桌面端真过回合验；
//     此处直测三函数的契约与边界。

var path = require('path');
var ROOT = path.resolve(__dirname, '..');
var passed = 0;
function assert(cond, label) { if (!cond) throw new Error('[assert] ' + label); passed += 1; }

// ── 装最小环境（这些都是 tm-ai-change-army.js 闭包里 global.xxx 取的浏览器全局）──
var EB = [];
global.addEB = function (cat, text) { EB.push(String(cat) + '|' + String(text)); };
global.P = { playerInfo: { factionName: '明廷', characterName: '崇祯' } };
global.GM = { turn: 30, chars: [], armies: [] };
function _findByName(n) { return (global.GM.chars || []).find(function (c) { return c && c.name === n; }) || null; }
global.findCharByName = _findByName;
global._fuzzyFindChar = _findByName;

var Army = require(path.join(ROOT, 'tm-ai-change-army.js'));
assert(Army && typeof Army.reconcileArmyCommanders === 'function', 'reconcileArmyCommanders 已导出');
assert(typeof Army.vacateArmiesByCommander === 'function', 'vacateArmiesByCommander 已导出');
assert(typeof Army.bindCommanderFromAppointment === 'function', 'bindCommanderFromAppointment 已导出');

function setChars() {
  global.GM.chars = [
    { name: '崔呈秀', alive: false, dead: true, deathReason: '赐死' },
    { name: '孙承宗', alive: true },
    { name: '袁崇焕', alive: true },
    { name: '满桂', alive: true }
  ];
}

// ① 死亡摘帅：主帅赐死(alive=false) → 摘帅+清全别名+士气-15+_commanderLost+邸报
(function () {
  setChars();
  EB = [];
  global.GM.armies = [{ name: '京营', commander: '崔呈秀', commanderName: '崔呈秀', commanderTitle: '提督', morale: 70 }];
  var n = Army.reconcileArmyCommanders();
  var a = global.GM.armies[0];
  assert(n === 1, '①摘帅 1 支·实得 ' + n);
  assert(a.commander === '' && a.commanderName === '' && a.commanderTitle === '', '①commander 及别名/title 全清·实得 ' + JSON.stringify([a.commander, a.commanderName, a.commanderTitle]));
  assert(a.morale === 55, '①士气 70→55(死帅-15)·实得 ' + a.morale);
  assert(a._commanderLost === true && a.commanderAlive === false, '①标记出缺·实得 _commanderLost=' + a._commanderLost + ' commanderAlive=' + a.commanderAlive);
  assert(EB.some(function (e) { return e.indexOf('崔呈秀') >= 0 && e.indexOf('赐死') >= 0; }), '①发邸报含死因·实得 ' + JSON.stringify(EB));
  // 幂等：再跑一次不再扣士气（commander 已空·提前返回）
  var n2 = Army.reconcileArmyCommanders();
  assert(n2 === 0 && global.GM.armies[0].morale === 55, '①幂等·再跑不动·实得 n=' + n2 + ' morale=' + global.GM.armies[0].morale);
  console.log('  ①死亡摘帅: 京营 崔呈秀(赐死)→空缺·士气70→55·幂等不重扣');
})();

// ② 与 apply-deaths 级联去重：主字段 commander 已被清('')、仅别名残留死者 → 清别名但不再扣士气
(function () {
  setChars();
  EB = [];
  // 模拟 tm-ai-apply-deaths.js:83 只清了 army.commander，commanderName 别名残留
  global.GM.armies = [{ name: '蓟镇', commander: '', commanderName: '崔呈秀', morale: 60 }];
  var n = Army.reconcileArmyCommanders();
  var a = global.GM.armies[0];
  assert(n === 1, '②处理 1 支·实得 ' + n);
  assert(a.commanderName === '', '②残留别名被清齐·实得 ' + a.commanderName);
  assert(a.morale === 60, '②主字段早已空 → 不再扣士气(防与级联双扣)·实得 ' + a.morale);
  console.log('  ②级联去重: 主字段已空、仅别名残留 → 清别名、士气不双扣(保持60)');
})();

// ③ 在任且活着 → 不动；④ 查无此人 → 静默摘帅、不扣士气
(function () {
  setChars();
  EB = [];
  global.GM.armies = [
    { name: '关宁军', commander: '孙承宗', morale: 80 },        // 活着
    { name: '某偏师', commander: '查无此人', morale: 50 }        // 角色表里没有
  ];
  var n = Army.reconcileArmyCommanders();
  assert(global.GM.armies[0].commander === '孙承宗' && global.GM.armies[0].morale === 80, '③活着的主帅不动·实得 ' + global.GM.armies[0].commander + '/' + global.GM.armies[0].morale);
  assert(global.GM.armies[1].commander === '' && global.GM.armies[1].morale === 50, '④查无此人→静默清空、不扣士气·实得 ' + global.GM.armies[1].commander + '/' + global.GM.armies[1].morale);
  assert(n === 1, '③④只处理了查无此人那 1 支·实得 ' + n);
  console.log('  ③活帅不动(孙承宗/80) ④查无此人静默清(不扣士气)');
})();

// ⑤ 免职即解兵权：活着的主帅被免 → vacateArmiesByCommander 摘帅+士气-10
(function () {
  setChars();
  EB = [];
  global.GM.armies = [{ name: '宣大军', commander: '满桂', commanderName: '满桂', morale: 75 }];
  var cnt = Army.vacateArmiesByCommander('满桂', { moraleHit: 10, markLost: true, eb: '{army}主帅{name}奉诏去职、兵权交卸' });
  var a = global.GM.armies[0];
  assert(cnt === 1, '⑤解兵权 1 支·实得 ' + cnt);
  assert(a.commander === '' && a.commanderName === '', '⑤免职后全别名清空·实得 ' + a.commander + '/' + a.commanderName);
  assert(a.morale === 65, '⑤士气 75→65(去职-10)·实得 ' + a.morale);
  assert(EB.some(function (e) { return e.indexOf('宣大军') >= 0 && e.indexOf('满桂') >= 0; }), '⑤邸报含部队名+人名·实得 ' + JSON.stringify(EB));
  console.log('  ⑤免职解兵权: 满桂被免→宣大军空缺·士气75→65');
})();

// ⑥ 确定性任免绑帅：含军职→绑、按防区/名称命中
(function () {
  setChars();
  EB = [];
  global.GM.armies = [
    { name: '蓟辽镇', commander: '', location: '蓟州', faction: '明廷', morale: 60 },
    { name: '京营', commander: '', location: '京师', faction: '明廷', morale: 60 }
  ];
  // 民政官职不绑
  assert(Army.bindCommanderFromAppointment('某文官', '户部尚书') === false, '⑥a 民政官职(户部尚书)不绑帅');
  // 军职 + 防区名(蓟辽)→ 名称含「蓟辽」的兵
  var ok = Army.bindCommanderFromAppointment('袁崇焕', '蓟辽督师', { source: 'edict.appoint_commander' });
  assert(ok === true, '⑥b 蓟辽督师→绑定成功·实得 ' + ok);
  var jl = global.GM.armies.find(function (a) { return a.name === '蓟辽镇'; });
  assert(jl.commander === '袁崇焕' && jl.commanderName === '袁崇焕', '⑥b 蓟辽镇主帅=袁崇焕(全别名同步)·实得 ' + jl.commander + '/' + jl.commanderName);
  assert(jl.commanderAlive === true && jl._commanderLost === false, '⑥b 绑帅后复位 linkage 标记·实得 alive=' + jl.commanderAlive + ' lost=' + jl._commanderLost);
  // 军职 + 部队名直接命中(京营提督→京营)
  var ok2 = Army.bindCommanderFromAppointment('满桂', '京营提督');
  var jy = global.GM.armies.find(function (a) { return a.name === '京营'; });
  assert(ok2 === true && jy.commander === '满桂', '⑥c 京营提督→京营主帅=满桂·实得 ok=' + ok2 + ' cmdr=' + jy.commander);
  console.log('  ⑥任免绑帅: 户部尚书不绑·蓟辽督师→蓟辽镇·京营提督→京营');
})();

// ⑦ 定不到部队不硬绑：军职但无防区匹配 且 玩家有>1支兵 → 不绑、发提示邸报
(function () {
  setChars();
  EB = [];
  global.GM.armies = [
    { name: '蓟辽镇', commander: '', location: '蓟州', faction: '明廷' },
    { name: '京营', commander: '', location: '京师', faction: '明廷' }
  ];
  var ok = Army.bindCommanderFromAppointment('孙承宗', '宣府总兵'); // 无「宣府」兵·有2支兵→不默认
  assert(ok === false, '⑦定不到部队→不绑·实得 ' + ok);
  assert(global.GM.armies.every(function (a) { return a.commander === ''; }), '⑦没有任何兵被误绑');
  assert(EB.some(function (e) { return e.indexOf('未能定位部队') >= 0; }), '⑦发了「未能定位部队」提示·实得 ' + JSON.stringify(EB));
  console.log('  ⑦定不到不硬绑: 宣府总兵无对应兵+多支→不误绑·发提示');
})();

// ⑧ 单支兵默认：军职、无防区匹配、但玩家只有 1 支兵 → 默认绑它
(function () {
  setChars();
  EB = [];
  global.GM.armies = [{ name: '勤王师', commander: '', location: '京师', faction: '明廷' }];
  var ok = Army.bindCommanderFromAppointment('孙承宗', '总督军务'); // 无防区·仅1支→默认
  assert(ok === true && global.GM.armies[0].commander === '孙承宗', '⑧单支兵默认绑·实得 ok=' + ok + ' cmdr=' + global.GM.armies[0].commander);
  console.log('  ⑧单支兵默认: 仅1支兵→军职任命默认绑它');
})();

// ⑨ 死后再任命复位：先死帅(_commanderLost=true)、再下诏补任 → 标记复位(commanderAlive=true/_commanderLost=false)
(function () {
  setChars();
  EB = [];
  global.GM.armies = [{ name: '京营', commander: '崔呈秀', morale: 70, location: '京师', faction: '明廷' }];
  Army.reconcileArmyCommanders();                 // 崔呈秀死→摘帅·_commanderLost=true
  assert(global.GM.armies[0]._commanderLost === true, '⑨前置·死后出缺标记');
  Army.bindCommanderFromAppointment('孙承宗', '京营提督'); // 补任
  var a = global.GM.armies[0];
  assert(a.commander === '孙承宗' && a._commanderLost === false && a.commanderAlive === true, '⑨补任后复位·实得 cmdr=' + a.commander + ' lost=' + a._commanderLost + ' alive=' + a.commanderAlive);
  console.log('  ⑨死后补任: 崔呈秀死→出缺→诏补孙承宗→标记复位(可再触发下次惩罚)');
})();

// ⑩ 绑帅前校验角色在不在/死没死：朝无此人 或 已殁 → 不绑（防幽灵帅 + 防死帅被回合末倒扣士气）
(function () {
  setChars();
  EB = [];
  global.GM.armies = [{ name: '京营', commander: '', location: '京师', faction: '明廷', morale: 70 }];
  // a 朝无此人
  var okGhost = Army.bindCommanderFromAppointment('查无此人', '京营提督');
  assert(okGhost === false && global.GM.armies[0].commander === '', '⑩a 朝无此人→不绑(无幽灵帅)·实得 ok=' + okGhost + ' cmdr=' + global.GM.armies[0].commander);
  // b 已殁之人（崔呈秀 alive=false）
  var okDead = Army.bindCommanderFromAppointment('崔呈秀', '京营提督');
  assert(okDead === false && global.GM.armies[0].commander === '', '⑩b 已殁之人→不绑(免被回合末当死帅倒扣士气)·实得 ok=' + okDead + ' cmdr=' + global.GM.armies[0].commander);
  // c 活人正常绑（回归确认 guard 没误伤活人）
  var okLive = Army.bindCommanderFromAppointment('孙承宗', '京营提督');
  assert(okLive === true && global.GM.armies[0].commander === '孙承宗', '⑩c 活人正常绑·实得 ok=' + okLive + ' cmdr=' + global.GM.armies[0].commander);
  console.log('  ⑩绑帅校验存活: 查无此人/已殁→不绑·活人(孙承宗)正常绑');
})();

console.log('[verify-army-commander] PASS assertions=' + passed);
