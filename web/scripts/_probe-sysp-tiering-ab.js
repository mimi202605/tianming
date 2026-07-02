#!/usr/bin/env node
/* eslint-env node */
'use strict';
/*
 * _probe-sysp-tiering-ab.js — sysP 分级省流 · 真局干跑 A/B（免费·无 key）
 *   headless 起真局(天启) → 干跑 endTurn 驱动到 prompt.build() → 截获真实 ctx.prompt →
 *   同一份真 sysP 上：闸关=逐 id 引用恒等(字节零变) / 闸开=逐 id 量裁剪后尺寸+必需段在位+可删段确失 →
 *   打印每调用省流表 + 全回合估算(按 18 调用×FULL 基线)。
 * 派生自 _probe-realturn-w14.js 干跑基座。node scripts/_probe-sysp-tiering-ab.js
 */
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.resolve(__dirname, '..'); const HEADLESS = path.join(__dirname, 'headless-smoke.js');
const SID = 'sc-tianqi7-1627';
const CTXK = parseInt(process.env.TM_CTXK || '256', 10);   // 256=干净路(量分级省流) · 128=触发分段感知溢出路(验roster存活)
let A = 0, F = 0; function ok(c, m) { if (c) { A++; console.log('  ✓ ' + m); } else { F++; console.log('  ✗ FAIL: ' + m); } }
function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function waitFor(label, fn, timeoutMs) { const s = Date.now(); while (Date.now() - s < timeoutMs) { try { const v = fn(); if (v) return v; } catch (e) {} await delay(80); } throw new Error('timeout: ' + label); }
process.on('uncaughtException', function (e) { var m = String((e && (e.message || e.stack)) || e); if (/insertAdjacentHTML|appendChild|removeChild|is not a function|Cannot (read|set)|null|undefined/.test(m)) return; console.error('[uncaught] ' + m); });
process.on('unhandledRejection', function (e) { var m = String((e && (e.message || e)) || e); if (!/insertAdjacentHTML|is not a function/.test(m)) console.error('[unhandledRejection] ' + m); });
function loadHeadlessHelpers() { const s = fs.readFileSync(HEADLESS, 'utf8').replace(/^#![^\n]*\n/, '').replace(/\nmain\(\);\s*$/, '\nreturn { makeStubs, parseIndexHtmlScripts };'); return (new Function('require', 'process', '__dirname', '__filename', 'module', 'exports', s))(require, process, __dirname, HEADLESS, { exports: {} }, {}); }
const helpers = loadHeadlessHelpers();

function loadGame() {
  const env = helpers.makeStubs();
  env.win.console = { log: () => {}, warn: () => {}, error: () => {}, info: () => {}, debug: () => {} };
  env.win.location.href = 'http://localhost/index.html'; env.win.location.search = '';
  env.win.document.body.insertAdjacentHTML = function () {}; env.win.document.head.insertAdjacentHTML = function () {}; env.win.document.documentElement.insertAdjacentHTML = function () {};
  function mockResp() { return { choices: [{ message: { content: JSON.stringify({ narrative: '（干跑）', summary: '干跑', publicSummary: '干跑' }) } }], usage: { total_tokens: 0 } }; }
  env.win.fetch = function () { var r = mockResp(); return Promise.resolve({ ok: true, status: 200, headers: { get: () => 'application/json' }, text: () => Promise.resolve(JSON.stringify(r)), json: () => Promise.resolve(r) }); };
  env.win.AbortController = (typeof AbortController !== 'undefined') ? AbortController : env.win.AbortController;
  env.win.tianming = { writeTurnData: () => Promise.resolve({ ok: true }), autoSave: () => Promise.resolve({ ok: true }), saveGame: () => Promise.resolve({ ok: true }) };
  const sandbox = vm.createContext(env.win);
  sandbox.__env = env;
  const scripts = helpers.parseIndexHtmlScripts();
  const cutoff = scripts.findIndex((src) => path.basename(src) === 'tm-test-harness.js');
  (cutoff >= 0 ? scripts.slice(0, cutoff) : scripts).forEach((src) => { try { vm.runInContext(fs.readFileSync(path.join(ROOT, src), 'utf8'), sandbox, { filename: src, timeout: 20000 }); } catch (e) {} });
  vm.runInContext('window.Audio=function(){return{play:function(){},pause:function(){},addEventListener:function(){}};};window.AudioContext=function(){return{createGain:function(){return{connect:function(){},gain:{}};},createOscillator:function(){return{connect:function(){},start:function(){},stop:function(){},frequency:{}};},destination:{},currentTime:0};};window.webkitAudioContext=window.AudioContext;showLoading=function(){};hideLoading=function(){};toast=function(){};showTurnResult=function(){};["renderGameState","renderMemorials","renderQiju","renderJishi","renderBiannian","renderShijiList","renderRenwuList","renderMap","renderTopbar","renderProvincePanel"].forEach(function(n){window[n]=function(){};});generateMemorials=function(){if(!GM.memorials)GM.memorials=[];};aiDeepReadScenario=async function(){};aiPlanScenarioForInference=async function(){};aiPlanFactionMatrix=async function(){};aiPlanFirstTurnEvents=async function(){};', sandbox);
  vm.runInContext('P=P||{};P.ai=P.ai||{};P.ai.key="dry";P.ai.url="http://dry.local/v1";P.ai.model="dry";P.ai.provider="deepseek";P.ai.secondary={key:"dry",url:"http://dry.local/v1",model:"dry",provider:"deepseek"};P.conf=P.conf||{};P.conf.npcAiPrecision=false;P.conf.verbosity="standard";P.conf.contextSizeK=' + CTXK + ';getCompressionParams=function(){return {scale:1.0,contextK:' + CTXK + '};};', sandbox);   // headless 里 tm-ai-infra 局部求值失败会丢 getCompressionParams→兜底32K；按 TM_CTXK 档位模拟对应窗口模型
  // 包 build() 截获 ctx（分级 A/B 在同一份真 prompt 上做）
  vm.runInContext('(function(){var ob=TM.Endturn.AI.prompt.build;TM.Endturn.AI.prompt.build=async function(ctx){var r=await ob.call(this,ctx);try{window.__promptCtx=ctx;}catch(e){}return r;};})();', sandbox);
  return { sandbox };
}

function installInputNodes(sandbox) {
  vm.runInContext('(function(){var prevGet=document.getElementById?document.getElementById.bind(document):function(){return null;};function node(v){return{value:v||"",textContent:"",innerHTML:"",style:{},dataset:{},classList:{add:function(){},remove:function(){},toggle:function(){return false;},contains:function(){return false;}},addEventListener:function(){},removeEventListener:function(){},remove:function(){},focus:function(){},blur:function(){},querySelector:function(){return null;},querySelectorAll:function(){return[];},getAttribute:function(){return null;},setAttribute:function(){},appendChild:function(c){return c;}};}var nodes={"edict-pol":node("彻查辽饷亏空。"),"edict-mil":node("命督师经略辽东。"),"edict-dip":node(""),"edict-eco":node(""),"edict-oth":node(""),"xinglu-pub":node("先稳边储。"),"btn-end":node("静待时变"),"btn-end-turn":node("静待时变")};document.getElementById=function(id){return nodes[id]||prevGet(id);};})();', sandbox, { timeout: 10000 });
}

(async function main() {
  console.log('\n████ sysP 分级省流 · 真局干跑 A/B · contextK=' + CTXK + '(预算' + CTXK * 512 + '字) ████\n');
  const { sandbox } = loadGame();
  vm.runInContext('_pendingUseMap=true;_pendingMapModeSid="' + SID + '";_pendingMapModeAt=Date.now();doActualStart("' + SID + '");', sandbox, { timeout: 20000 });
  installInputNodes(sandbox);
  console.log('[起局] turn=' + vm.runInContext('GM.turn', sandbox) + ' · 驱动干跑 endTurn 到 prompt.build…');
  try { vm.runInContext('Promise.resolve().then(function(){return endTurn();}).catch(function(e){__env.__endturnErr=String(e&&e.message||e);});', sandbox, { timeout: 30000 }); } catch (e) {}
  try { await delay(400); vm.runInContext('try{_postTurnCourtChoose(true);}catch(e){}', sandbox, { timeout: 10000 }); } catch (e) {}
  try { await vm.runInContext('Promise.resolve().then(function(){return _onPostTurnCourtEnd();}).catch(function(e){});', sandbox, { timeout: 60000 }); } catch (e) {}
  try { await waitFor('prompt.build ctx', () => vm.runInContext('!!window.__promptCtx', sandbox), 30000); } catch (e) { console.log('✗ ' + e.message); process.exit(1); }

  const rep = JSON.parse(vm.runInContext('JSON.stringify((function(){' +
    'var p=window.__promptCtx.prompt;var out={full:p.sysP.length,blocksOk:!!p.sysBlocks,segs:{}};' +
    'if(p.sysBlocks)Object.keys(p.sysBlocks).forEach(function(k){out.segs[k]=p.sysBlocks[k].length;});' +
    'var ids=["sc17","sc28","sc27","sc07","sc16","sc16L","sc18","sc18L","scOl","scR","scP","sc15","sc15n","memwrite","scTac","scStr","sc25","sc19"];' +
    'P.conf.sysPTieringEnabled=false;out.offIdentical=ids.every(function(id){return p.sysPFor(id)===p.sysP;});' +
    'out.offMainline=(p.sysPFor("sc1")===p.sysP)&&(p.sysPFor("sc2")===p.sysP);' +
    'P.conf.sysPTieringEnabled=true;out.on={};' +
    'var rosterTok=(p.sysBlocks&&p.sysBlocks.roster)?p.sysBlocks.roster.slice(2,26):"";' +
    'var letterTok=(p.sysBlocks&&p.sysBlocks.letters&&p.sysBlocks.letters.length>40)?p.sysBlocks.letters.slice(2,26):"";' +
    'var persTok=(p.sysBlocks&&p.sysBlocks.personnel&&p.sysBlocks.personnel.length>40)?p.sysBlocks.personnel.slice(2,26):"";' +
    'var npcTok=(p.sysBlocks&&p.sysBlocks.npcDeep&&p.sysBlocks.npcDeep.length>40)?p.sysBlocks.npcDeep.slice(2,26):"";' +
    'ids.forEach(function(id){var s=p.sysPFor(id);out.on[id]={len:s.length,roster:rosterTok?s.indexOf(rosterTok)>=0:null,letters:letterTok?s.indexOf(letterTok)>=0:null,personnel:persTok?s.indexOf(persTok)>=0:null,npcDeep:npcTok?s.indexOf(npcTok)>=0:null};});' +
    'P.conf.sysPTieringEnabled=false;' +
    'return out;})())', sandbox, { timeout: 30000 }));

  const diag = JSON.parse(vm.runInContext('JSON.stringify({tail:window.__promptCtx.prompt.sysP.slice(-60),truncated:window.__promptCtx.prompt.sysP.indexOf("部分参考信息已截断")>=0})', sandbox));
  console.log('\n[真 sysP] FULL=' + rep.full + ' 字 · 截断=' + diag.truncated + ' · 尾60字=「' + diag.tail.replace(/\n/g, '⏎') + '」');
  console.log('[分段] ' + JSON.stringify(rep.segs));
  ok(rep.blocksOk, '① 真局 build 分块成功(无 RECON MISMATCH 回退)');
  ok(rep.offIdentical, '② 闸关 → 18 个分级 id 全部引用恒等(字节零变)');
  ok(rep.offMainline, '② 闸关 → 主线 sc1/sc2 恒 FULL');

  let saved = 0, cnt = 0;
  const rows = [];
  Object.keys(rep.on).forEach(function (id) {
    const r = rep.on[id];
    saved += (rep.full - r.len); cnt++;
    rows.push('  ' + id + ': ' + r.len + ' 字 (省' + Math.round((1 - r.len / rep.full) * 100) + '%)');
  });
  console.log('\n[闸开·各调用裁剪后]');
  rows.forEach(function (r) { console.log(r); });
  const overflowed = /超预算/.test(diag.tail);
  if (overflowed) {
    ok(Object.keys(rep.on).every(function (id) { return rep.on[id].len <= rep.full; }), '③ (溢出态)分级不劣于 FULL——可丢段已被溢出守卫清空·无字可省属正确');
  } else {
    ok(Object.keys(rep.on).every(function (id) { return rep.on[id].len < rep.full; }), '③ 闸开 → 18 id 全部小于 FULL');
  }
  ok(Object.keys(rep.on).every(function (id) { return rep.on[id].roster !== false; }), '④ 全部保住 roster(幻觉防火墙名单)');
  ok(rep.on.sc17.letters !== true, '⑤ sc17(LITE) 确删 letters 段');
  ok(rep.on.sc27.personnel !== true, '⑥ sc27(REVIEW·三批纠错:实为叙事审查非诏令) 确删 personnel');
  ok(rep.on.sc07.npcDeep !== false, '⑦ sc07(COG) 保住 npcDeep(性格/弧线/记忆规则)');
  ok(rep.on.sc16.npcDeep !== true && rep.on.sc18.letters !== true, '⑧ sc16/sc18(FAC) 确删 npcDeep/letters');
  // 三批·谨慎区抽查
  ok(rep.on.sc15.npcDeep !== false && rep.on.sc15n.npcDeep !== false, '⑨ sc15/sc15n(NPCDEEP) 保住 npcDeep');
  ok(rep.on.memwrite.npcDeep !== false, '⑨ memwrite(MEMW) 保住 npcDeep(记忆归属身份接地)');
  ok(rep.on.scOl.letters !== true && rep.on.scP.letters !== true, '⑨ scOl/scP(NARR) 确删 letters');
  ok(rep.on.scR.len <= rep.on.scOl.len && rep.on.scR.personnel !== true, '⑨ scR(REVIEW) 最薄·无 personnel');
  ok(rep.on.sc19.npcDeep !== true && rep.on.scTac.npcDeep !== true, '⑨ sc19(ENRICH)/scTac(MEMC) 确删 npcDeep');

  // 全回合估算：实测文档=18 调用带 FULL。首批分级 8 个(sc16/16L、sc18/18L 互斥深度·按 8 全算偏保守上限、按 6 算下限)
  const turn18 = 18 * rep.full;
  const afterTier = turn18 - saved;
  console.log('\n[全回合估算·按18调用×FULL基线] 原 ' + turn18 + ' 字 → 分级后 ' + afterTier + ' 字 · 全回合省 ' + Math.round((saved / turn18) * 100) + '%（首批' + cnt + '调用·主线/谨慎区未动）');

  console.log('\n' + (F === 0 ? 'ALL PASS' : 'FAIL') + ' (' + A + ' pass / ' + F + ' fail)');
  process.exit(F === 0 ? 0 : 1);
})().catch((e) => { console.error('PROBE ERROR:', e && (e.stack || e.message)); process.exit(1); });
