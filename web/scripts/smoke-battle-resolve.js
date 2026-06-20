#!/usr/bin/env node
'use strict';
/* smoke-battle-resolve — Phase2「抽象带预测器 + 战术result→battleResult 夹带/回填」
 *   ① predictBattleBand:把握度/decisive·swing/损失带/方略
 *   ② tacticalToBattleResult:decisive 夹进带不翻·swing+flipped 用战术实况·将领命运·胜负方·全歼destroyed
 */
const path = require('path');
const R = require(path.resolve(__dirname, '..', 'tm-battle-resolve.js'));
let A = 0, F = 0;
function ok(c, m) { if (c) { A++; console.log('  ✓ ' + m); } else { F++; console.log('  ✗ FAIL: ' + m); } }
console.log('smoke-battle-resolve');

const GM = { chars: [{ name: '岳飞', military: 92, intelligence: 88 }] };

/* ① 预测器 */
const strong = [{ id: 'pa', soldiers: 5000, morale: 85, training: 80, quality: '精锐', commander: '岳飞' }];
const weak = [{ id: 'ea', soldiers: 1500, morale: 60, training: 50, quality: '普通', commander: '宗弼' }];
const b1 = R.predictBattleBand(strong, weak, { GM: GM });
ok(b1.winProb > 0.7 && b1.decisive, '① 强vs弱→decisive·winProb>0.7 (' + b1.winProb + ')');
ok(b1.winner === 'player', '① 强者=winner');
ok(b1.playerLoss.expected < b1.enemyLoss.expected, '① 强者损<弱者损');
const even = [{ id: 'a', soldiers: 3000, morale: 70, training: 60, quality: '普通' }];
const even2 = [{ id: 'b', soldiers: 3000, morale: 70, training: 60, quality: '普通' }];
const b2 = R.predictBattleBand(even, even2, {});
ok(Math.abs(b2.winProb - 0.5) < 0.05 && b2.swing, '① 均势→winProb≈0.5·swing');
const bAgg = R.predictBattleBand(even, even2, { strategy: 'aggressive' });
const bCau = R.predictBattleBand(even, even2, { strategy: 'cautious' });
ok(bAgg.playerLoss.expected > b2.playerLoss.expected, '① 主攻→损升');
ok(bCau.playerLoss.expected < b2.playerLoss.expected, '① 持重→损降');
ok(b1.playerLoss.min < b1.playerLoss.expected && b1.playerLoss.max > b1.playerLoss.expected, '① 带含 min<期望<max');

/* ② 转换·decisive 夹带(战术巨损被夹回带·不翻胜负) */
const pA = [{ id: 'pa', soldiers: 5000, commander: '岳飞' }];
const eA = [{ id: 'ea', soldiers: 1500, commander: '宗弼' }];
const band = R.predictBattleBand(pA, eA, { GM: GM });   // decisive(强玩家)
const tac = { outcome: 'win', flipped: false, units: [{ parentArmyId: 'pa', survivors: 1000 }, { parentArmyId: 'ea', survivors: 0 }], commanders: [{ name: '宗弼', fate: 'captured' }], emperorSafe: true };
const br = R.tacticalToBattleResult(tac, { playerArmies: pA, enemyArmies: eA, band: band, playerFactionName: '宋', enemyFactionName: '金' });
const paL = br.affectedArmies.find(x => x.armyId === 'pa').loss;
ok(paL < 4000, '② decisive:玩家战术巨损(raw4000)被夹回带内→' + paL);
ok(paL <= Math.round(band.playerLoss.max * 5000) + 1 && paL >= Math.round(band.playerLoss.min * 5000) - 1, '② 玩家损落带[min,max]');
const eaA = br.affectedArmies.find(x => x.armyId === 'ea');
ok(eaA.loss <= Math.round(band.enemyLoss.max * 1500) + 1, '② 敌损也夹进带(战术全歼被夹回·decisive不翻)');
ok(br.commanderFate && br.commanderFate.name === '宗弼' && br.commanderFate.outcome === 'captured', '② 敌帅被俘→commanderFate captured(决定性仍由战术定将领命运)');
ok(br.winnerFactionId === '宋' && br.loserFactionId === '金', '② 胜负方=战术outcome');
ok(br._fromTactical === true, '② _fromTactical 标(回填须清 _battleResultTurn 防双扣)');

/* ② 转换·swing+flipped(均势翻盘·损用战术实况·不夹) */
const pW = [{ id: 'pw', soldiers: 3000, morale: 70, training: 60, quality: '普通', commander: '某' }];
const eW = [{ id: 'ew', soldiers: 3200, morale: 70, training: 60, quality: '普通', commander: '敌' }];
const bandSw = R.predictBattleBand(pW, eW, {});
ok(bandSw.swing, '② 近均势=swing(翻盘前提)');
const tacF = { outcome: 'win', flipped: true, units: [{ parentArmyId: 'pw', survivors: 2400 }, { parentArmyId: 'ew', survivors: 0 }], commanders: [{ name: '敌', fate: 'killed' }], emperorSafe: true };
const brF = R.tacticalToBattleResult(tacF, { playerArmies: pW, enemyArmies: eW, band: bandSw, playerFactionName: '宋', enemyFactionName: '金' });
const ewL = brF.affectedArmies.find(x => x.armyId === 'ew');
ok(ewL.loss === 3200 && ewL.state === 'destroyed', '② swing翻盘:敌损用战术实况3200·全歼destroyed(不夹)');
ok(brF.flipped === true, '② flipped 标记');
ok(brF.commanderFate.outcome === 'killed', '② 敌帅战死');

/* ② 永不崩 */
ok(Array.isArray(R.tacticalToBattleResult({}, {}).affectedArmies), '② 空输入→不崩');

console.log('\n结果: ' + A + ' 通过 / ' + F + ' 失败');
process.exit(F ? 1 : 0);
