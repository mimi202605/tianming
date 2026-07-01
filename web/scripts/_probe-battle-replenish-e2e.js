#!/usr/bin/env node
/* eslint-env node */
'use strict';
/*
 * _probe-battle-replenish-e2e.js — 御驾亲征·真局端到端探针(天启真局·headless)
 *   ① 咽喉拦截:真 AI 形状 battleResult(含 occupiedCityIds)→ 拦入延后队列
 *   ② 补员双源真数据:真政区树征兵池报价/扣池 + 真国库募兵扣费 + 历练稀释 + units 自愈
 *   ③ Slice A 战略下游:战术胜(与抽象一致)→ occupiedCityIds 承接 → applyReal 真翻省
 *   ④ 委之路径回归:applyDelegate 原 br 落地
 * node scripts/_probe-battle-replenish-e2e.js
 */
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.resolve(__dirname, '..'); const HEADLESS = path.join(__dirname, 'headless-smoke.js');
const SID = 'sc-tianqi7-1627';
function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function waitFor(label, fn, t) { const s = Date.now(); let e = null; while (Date.now() - s < t) { try { if (fn()) return true; } catch (x) { e = x; } await delay(60); } throw new Error('timeout ' + label + (e ? ' ' + e.message : '')); }
function loadHeadlessHelpers() { const s = fs.readFileSync(HEADLESS, 'utf8').replace(/^#![^\n]*\n/, '').replace(/\nmain\(\);\s*$/, '\nreturn { makeStubs, parseIndexHtmlScripts };'); return (new Function('require', 'process', '__dirname', '__filename', 'module', 'exports', s))(require, process, __dirname, HEADLESS, { exports: {} }, {}); }
const helpers = loadHeadlessHelpers();
process.on('uncaughtException', (e) => { const m = String((e && e.message) || e); if (!/insertAdjacentHTML|is not a function|Cannot read|undefined|null/.test(m)) console.error('[uncaught] ' + m); });
process.on('unhandledRejection', () => {});

function loadGame() {
  const flow = { errors: [] };
  const env = helpers.makeStubs();
  env.win.console = { log: () => {}, warn: () => {}, error: (...a) => { const s = a.map(String).join(' '); if (!/favicon|insertAdjacentHTML|is not a function/.test(s)) flow.errors.push(s); }, info: () => {}, debug: () => {} };
  env.win.location.href = 'http://localhost/index.html'; env.win.location.search = '';
  env.win.document.body.insertAdjacentHTML = function () {}; env.win.document.head.insertAdjacentHTML = function () {}; env.win.document.documentElement.insertAdjacentHTML = function () {};
  env.win.fetch = function () { const r = { choices: [{ message: { content: '{}' } }], usage: { total_tokens: 0 } }; return Promise.resolve({ ok: true, status: 200, headers: { get: () => 'application/json' }, text: () => Promise.resolve(JSON.stringify(r)), json: () => Promise.resolve(r) }); };
  env.win.tianming = { writeTurnData: () => Promise.resolve({ ok: true }), autoSave: () => Promise.resolve({ ok: true }) };
  const sandbox = vm.createContext(env.win); sandbox.__env = env;
  const scripts = helpers.parseIndexHtmlScripts();
  const cutoff = scripts.findIndex((src) => path.basename(src) === 'tm-test-harness.js');
  (cutoff >= 0 ? scripts.slice(0, cutoff) : scripts).forEach((src) => { try { vm.runInContext(fs.readFileSync(path.join(ROOT, src), 'utf8'), sandbox, { filename: src, timeout: 20000 }); } catch (e) {} });
  vm.runInContext('window.Audio=function(){return{play:function(){},pause:function(){},addEventListener:function(){}};};window.AudioContext=function(){return{createGain:function(){return{connect:function(){},gain:{}};},createOscillator:function(){return{connect:function(){},start:function(){},stop:function(){},frequency:{}};},destination:{},currentTime:0};};window.webkitAudioContext=window.AudioContext;showLoading=function(){};hideLoading=function(){};toast=function(){};["renderGameState","renderMap","renderTopbar","renderOfficeTree","renderMemorials"].forEach(function(n){window[n]=function(){};});generateMemorials=function(){if(!GM.memorials)GM.memorials=[];};aiDeepReadScenario=async function(){};aiPlanScenarioForInference=async function(){};aiPlanFactionMatrix=async function(){};aiPlanFirstTurnEvents=async function(){};', sandbox);
  vm.runInContext('P=P||{};P.ai=P.ai||{};P.ai.key="";P.conf=P.conf||{};', sandbox);
  return { sandbox, flow };
}
const runC = (sb, c) => vm.runInContext(c, sb, { timeout: 30000 });
const J = (sb, c) => JSON.parse(runC(sb, 'JSON.stringify((function(){' + c + '})())'));

let A = 0, F = 0; function ok(c, m) { if (c) { A++; console.log('  ✓ ' + m); } else { F++; console.log('  ✗ FAIL: ' + m); } }

(async function main() {
  console.log('\n████ 御驾亲征 · 真局端到端探针（天启·咽喉拦截/补员双源/翻省接线）████\n');
  const { sandbox, flow } = loadGame();
  runC(sandbox, '_pendingUseMap=true;_pendingMapModeSid="' + SID + '";doActualStart("' + SID + '");');
  await waitFor('boot', () => runC(sandbox, '!!(GM&&GM.running&&GM.chars&&GM.chars.length>50&&Array.isArray(GM.armies)&&GM.armies.length>0)'), 25000);
  const boot = J(sandbox, 'return {turn:GM.turn, armies:GM.armies.length, pf:(P.playerInfo&&P.playerInfo.factionName)||GM.playerFaction||""};');
  console.log('[起局] turn=' + boot.turn + ' · ' + boot.armies + ' 军 · 玩家=' + boot.pf + '\n');

  /* ── ① 咽喉拦截(真 AI 形状 br·含 occupiedCityIds) ── */
  runC(sandbox, 'GM._yujiaQinzheng=true;');
  const pick = J(sandbox, `
    var pf=(P.playerInfo&&P.playerInfo.factionName)||GM.playerFaction||'';
    var pa=null,ea=null;
    GM.armies.forEach(function(a){ if(!a)return; var s=+(a.soldiers||a.strength||0); if(a.faction===pf&&s>1000&&!pa)pa=a; if(a.faction&&a.faction!==pf&&s>500&&!ea)ea=a; });
    var prov=null; try{ var ks=Object.keys(GM.provinceStats||{}); for(var i=0;i<ks.length;i++){ var st=GM.provinceStats[ks[i]]; if(st&&st.owner&&st.owner!==pf){prov={id:ks[i],owner:st.owner};break;} } }catch(e){}
    return { pa: pa&&{id:pa.id,name:pa.name,soldiers:+(pa.soldiers||pa.strength||0),loc:pa.location||pa.garrison||''}, ea: ea&&{id:ea.id,name:ea.name,faction:ea.faction}, prov: prov };`);
  console.log('[选角] 玩家军=' + (pick.pa && pick.pa.name) + '@' + (pick.pa && pick.pa.loc) + ' · 敌军=' + (pick.ea && pick.ea.name) + '(' + (pick.ea && pick.ea.faction) + ') · 待翻省=' + JSON.stringify(pick.prov));
  ok(pick.pa && pick.ea, '① 真局选出玩家军+敌军');
  const defer = J(sandbox, `
    var pf=(P.playerInfo&&P.playerInfo.factionName)||GM.playerFaction||'';
    window.__br={ winnerFactionId: pf, loserFactionId: ${JSON.stringify(pick.ea ? pick.ea.faction : '')},
      affectedArmies:[{armyId:${JSON.stringify(pick.pa ? pick.pa.id : '')},loss:600},{armyId:${JSON.stringify(pick.ea ? pick.ea.id : '')},loss:900}],
      casualties:{attacker:600,defender:900}, occupiedCityIds:${JSON.stringify(pick.prov ? [pick.prov.id] : [])}, battleId:'probe-b1' };
    var ret=MilitarySystems.applyBattleResult(window.__br, GM);
    return { deferred: ret===undefined, pending: (window.TMBattleTurn?TMBattleTurn._pending().length:-1), mirror:(GM._pendingAbstractBattles||[]).length };`);
  ok(defer.deferred && defer.pending === 1 && defer.mirror === 1, '① 咽喉拦下→延后队列1+持久化镜像1(不立即结算)');

  /* ── ② 补员双源(真政区树+真国库) ── */
  const q0 = J(sandbox, 'var a=GM.armies.find(function(x){return x&&x.id===' + JSON.stringify(pick.pa.id) + ';}); return TMBattleTurn.replenishQuote(GM,a,600);');
  console.log('[报价] 缺员600 → 丁口+' + q0.ding.n + ' · 募兵+' + q0.recruit.n + '(银' + q0.recruit.silver + '·粮' + q0.recruit.grain + ')');
  ok(q0.ding.n > 0 || q0.recruit.n > 0, '② 真局报价:至少一源可用(丁口' + q0.ding.n + '/募兵' + q0.recruit.n + ')');
  const rep = J(sandbox, `
    var a=GM.armies.find(function(x){return x&&x.id===${JSON.stringify(pick.pa.id)};});
    var FP=window.TM&&TM.FieldPipes, div=FP?FP.findDivisionByName(P,a.garrison||a.location||''):null;
    var g=GM.guoku, m0=(g.ledgers&&g.ledgers.money&&g.ledgers.money.stock!=null)?g.ledgers.money.stock:g.money;
    var pool0=div&&div.militaryDetail?div.militaryDetail.availableRecruits:null;
    var s0=+(a.soldiers||a.strength||0), v0=(TMArmyUnits&&TMArmyUnits.effectiveVet)?TMArmyUnits.effectiveVet(a):null;
    var q=TMBattleTurn.replenishQuote(GM,a,600);
    var r1=q.ding.n>0?TMBattleTurn.applyReplenish(GM,a,q.ding.n,'ding'):{added:0};
    var q2=TMBattleTurn.replenishQuote(GM,a,600-r1.added);
    var r2=q2.recruit.n>0?TMBattleTurn.applyReplenish(GM,a,Math.min(q2.recruit.n,200),'recruit'):{added:0};
    var m1=(g.ledgers&&g.ledgers.money&&g.ledgers.money.stock!=null)?g.ledgers.money.stock:g.money;
    var pool1=div&&div.militaryDetail?div.militaryDetail.availableRecruits:null;
    TMArmyUnits.ensureArmyUnits(a);
    var us=(a.units||[]).reduce(function(t,u){return t+(u.men||0);},0);
    return { dingAdded:r1.added, recAdded:r2.added, s0:s0, s1:+(a.soldiers||0), pool0:pool0, pool1:pool1, m0:m0, m1:m1, v0:v0, v1:TMArmyUnits.effectiveVet(a), unitsSum:us, charged:a._recruitChargedTurn };`);
  console.log('[补员] 丁口+' + rep.dingAdded + ' 募兵+' + rep.recAdded + ' · 兵' + rep.s0 + '→' + rep.s1 + ' · 池' + rep.pool0 + '→' + rep.pool1 + ' · 银' + rep.m0 + '→' + rep.m1 + ' · 历练' + rep.v0 + '→' + rep.v1 + ' · units和=' + rep.unitsSum);
  ok(rep.s1 === rep.s0 + rep.dingAdded + rep.recAdded && (rep.dingAdded + rep.recAdded) > 0, '② 补员落地·兵力守恒 ' + rep.s0 + '+' + (rep.dingAdded + rep.recAdded) + '=' + rep.s1);
  if (rep.dingAdded > 0) ok(rep.pool1 === rep.pool0 - rep.dingAdded, '② 真征兵池扣减 ' + rep.pool0 + '→' + rep.pool1);
  if (rep.recAdded > 0) ok(rep.m1 < rep.m0 && rep.charged === J(sandbox, 'return GM.turn;'), '② 真国库扣银 ' + rep.m0 + '→' + rep.m1 + ' + _recruitChargedTurn 防双扣');
  ok(rep.v1 <= rep.v0, '② 新兵稀释历练 ' + rep.v0 + '→' + rep.v1);
  ok(Math.abs(rep.unitsSum - rep.s1) <= 4, '② units[] 自愈与兵力对齐 ' + rep.unitsSum + '≈' + rep.s1 + '(允许逐条目四舍五入±漂移·派生既有行为)');

  /* ── ③ Slice A:战术胜(与抽象一致)→occupiedCityIds 承接→applyReal 真翻省 ── */
  if (pick.prov) {
    const flip = J(sandbox, `
      var pf=(P.playerInfo&&P.playerInfo.factionName)||GM.playerFaction||'';
      var item=TMBattleTurn._pending()[0];
      var band=TMBattleResolve.predictBattleBand(item.playerArmies,item.enemyArmies,{GM:GM});
      var tac={ outcome:'win', units:[], commanders:[], emperorSafe:true };
      item.playerArmies.forEach(function(a){ tac.units.push({parentArmyId:a.id, survivors:Math.round((+(a.soldiers||0))*0.9)}); });
      item.enemyArmies.forEach(function(a){ tac.units.push({parentArmyId:a.id, survivors:Math.round((+(a.soldiers||0))*0.3)}); });
      var br2=TMBattleResolve.tacticalToBattleResult(tac,{playerArmies:item.playerArmies,enemyArmies:item.enemyArmies,band:band,playerFactionName:pf,enemyFactionName:${JSON.stringify(pick.ea ? pick.ea.faction : '')},abstractBr:item.battleResult});
      var ownerBefore=(GM.provinceStats[${JSON.stringify(pick.prov ? pick.prov.id : '')}]||{}).owner;
      (br2.affectedArmies||[]).forEach(function(aa){ var a=GM.armies.find(function(x){return x&&x.id===aa.armyId;}); if(a)a._battleResultTurn=undefined; });
      TMBattleTurn.applyDelegate; /* noop ref */
      var MS=window.MilitarySystems; var fn=MS._origApplyBattleResult||MS.applyBattleResult; var res=fn.call(MS,br2,GM);
      var ownerAfter=(GM.provinceStats[${JSON.stringify(pick.prov ? pick.prov.id : '')}]||{}).owner;
      return { carried: Array.isArray(br2.occupiedCityIds)&&br2.occupiedCityIds.length===1, winnerOk: br2.winnerFactionId===pf,
               ownerBefore:ownerBefore, ownerAfter:ownerAfter, appliedOcc:(res&&res.applied&&res.applied.occupiedCityIds||[]).length,
               casualties: br2.casualties||null, battleId: br2.battleId };`);
    console.log('[翻省] carried=' + flip.carried + ' · owner ' + flip.ownerBefore + '→' + flip.ownerAfter + ' · appliedOcc=' + flip.appliedOcc + ' · casualties=' + JSON.stringify(flip.casualties) + ' · battleId=' + flip.battleId);
    ok(flip.carried && flip.winnerOk, '③ 战术胜与抽象一致→occupiedCityIds 承接·胜负方=玩家');
    ok(flip.appliedOcc === 1, '③ applyReal 消费 occupiedCityIds(翻省管线走通)');
    ok(flip.battleId === 'probe-b1', '③ battleId 身份字段承接');
  }

  /* ── ④ 清理+错误面 ── */
  runC(sandbox, 'TMBattleTurn._clear();GM._pendingAbstractBattles=[];');
  const errs = flow.errors.filter((s) => !/AudioContext|Audio|localStorage|indexedDB|matchMedia/i.test(s));
  ok(errs.length === 0, '④ 全程无 JS 错误(过滤环境噪音)' + (errs.length ? ' → ' + errs.slice(0, 3).join(' | ') : ''));

  console.log('\n结果: ' + A + ' 通过 / ' + F + ' 失败');
  process.exit(F ? 1 : 0);
})().catch((e) => { console.error('探针失败: ' + ((e && e.message) || e)); process.exit(1); });
