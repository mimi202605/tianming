/* smoke-battle-cost-guoku.js — 刀二·战争耗国库（补 guoku._battleCasualtyBonus 悬空读钩）
 * 刀二生产端嵌在 tm-endturn-followup 深层 async·此处走「源码契约 + 公式 + 自清语义」验证两侧接通。
 * 验：① 生产端读 _battleResultCasualtyFactions·按玩家势力过滤(_tmIsPlayerFactionNameForAi)·×5 写 guoku._battleCasualtyBonus
 *   ② 消费端 guoku-engine 读 _battleCasualtyBonus 入军饷总支(total)③ 营葬公式(KIA×5·敌方不计)④ 自清(累加器每回合重置·无战→0)
 * 跑：node scripts/smoke-battle-cost-guoku.js
 */
'use strict';
var pass = 0, fail = 0, fails = [];
function ok(c, m) { if (c) pass++; else { fail++; fails.push(m); console.error('  ✗ ' + m); } }
var fs = require('fs'), path = require('path');
var ROOT = path.join(__dirname, '..');
var fu = fs.readFileSync(path.join(ROOT, 'tm-endturn-followup.js'), 'utf8');
var gk = fs.readFileSync(path.join(ROOT, 'tm-guoku-engine.js'), 'utf8');

// ── ① 生产端契约 ──
ok(/刀二·战争耗国库/.test(fu), '1·tm-endturn-followup 含刀二生产端');
ok(/Object\.keys\(_battleResultCasualtyFactions\)\.forEach[\s\S]{0,160}_tmIsPlayerFactionNameForAi\(_fk, _k2PlayerFac\)/.test(fu), '1·读 _battleResultCasualtyFactions 并按玩家势力过滤(_tmIsPlayerFactionNameForAi)');
ok(/GM\.guoku\._battleCasualtyBonus = Math\.round\(Math\.max\(0, _k2Kia\) \* 5\)/.test(fu), '1·写 guoku._battleCasualtyBonus = 玩家阵亡×5(营葬银)');

// ── ② 消费端契约（悬空钩现已被喂）──
ok(/_battleCasualtyBonus\b/.test(gk), '2·tm-guoku-engine 读 _battleCasualtyBonus');
ok(/var total = [\s\S]{0,200}\bbattleBonus\b/.test(gk), '2·battleBonus 入军饷总支出 total(消费端确在用·钩已接通)');

// ── ③ 营葬公式 + 玩家势力过滤（复刻逻辑·敌方阵亡不由本朝出营葬）──
function k2(casualties, isPlayer) {
  var kia = 0;
  Object.keys(casualties).forEach(function (fk) { if (isPlayer(fk)) kia += (casualties[fk] || 0); });
  return Math.round(Math.max(0, kia) * 5);
}
var isPlayer = function (fk) { return fk === '明廷' || fk === '本朝'; };
ok(k2({ '明廷': 5000, '后金': 3000 }, isPlayer) === 25000, '3·玩家阵亡5000→营葬25000两·敌方(后金3000)不计·实得 ' + k2({ '明廷': 5000, '后金': 3000 }, isPlayer));
ok(k2({ '后金': 9000 }, isPlayer) === 0, '3·只敌方阵亡→本朝营葬0(不为敌出殡)');

// ── ④ 自清语义 ──
ok(k2({}, isPlayer) === 0, '4·无战(空累加器)→营葬0(无陈值)');
ok(/var _battleResultCasualtyFactions = \{\};/.test(fu), '4·_battleResultCasualtyFactions 每回合(sc18)重置为{}=无战自清·不留陈值反复扣库');

console.log('\n[smoke-battle-cost-guoku] ' + pass + ' 通过 / ' + fail + ' 失败');
if (fail) { console.error('失败项：\n - ' + fails.join('\n - ')); process.exit(1); }
process.exit(0);
