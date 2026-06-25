#!/usr/bin/env node
/* eslint-env node */
'use strict';
// diag-guoku-render.js — 诊断:顶栏(_renderGuoku/_barAccountStock)与史记弹窗(_renderUnifiedChanges 裸读 GM.guoku.money)帑廪数据为何不一致。
//   headless·无需真模型(只跑引擎结算·AI 桩掉)。dump GM.guoku 结构 + _prevGuoku + 两条渲染路径取数 + 一次引擎tick前后。
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.resolve(__dirname, '..'); const HEADLESS = path.join(__dirname, 'headless-smoke.js');
const SID = 'sc-tianqi7-1627';
function loadHeadlessHelpers() { const s = fs.readFileSync(HEADLESS, 'utf8').replace(/^#![^\n]*\n/, '').replace(/\nmain\(\);\s*$/, '\nreturn { makeStubs, parseIndexHtmlScripts };'); return (new Function('require', 'process', '__dirname', '__filename', 'module', 'exports', s))(require, process, __dirname, HEADLESS, { exports: {} }, {}); }
const helpers = loadHeadlessHelpers();

const env = helpers.makeStubs();
env.win.console = { log: () => {}, warn: () => {}, error: () => {}, info: () => {}, debug: () => {} };
env.win.location.href = 'http://localhost/index.html'; env.win.location.search = '';
env.win.document.body.insertAdjacentHTML = function () {}; env.win.document.head.insertAdjacentHTML = function () {}; env.win.document.documentElement.insertAdjacentHTML = function () {};
env.win.fetch = function () { return Promise.reject(new Error('no-AI-in-diag')); };
const sandbox = vm.createContext(env.win);
const scripts = helpers.parseIndexHtmlScripts();
const cutoff = scripts.findIndex((src) => path.basename(src) === 'tm-test-harness.js');
(cutoff >= 0 ? scripts.slice(0, cutoff) : scripts).forEach((src) => { try { vm.runInContext(fs.readFileSync(path.join(ROOT, src), 'utf8'), sandbox, { filename: src, timeout: 20000 }); } catch (e) {} });
vm.runInContext('showLoading=function(){};hideLoading=function(){};toast=function(){};["renderGameState","renderMemorials","renderQiju","renderMap"].forEach(function(n){window[n]=function(){};});generateMemorials=function(){if(!GM.memorials)GM.memorials=[];};aiDeepReadScenario=async function(){};aiPlanScenarioForInference=async function(){};aiPlanFactionMatrix=async function(){};aiPlanFirstTurnEvents=async function(){};', sandbox);
vm.runInContext('P=P||{};P.ai=P.ai||{};P.ai.key="";P.conf=P.conf||{};_pendingUseMap=true;_pendingMapModeSid="' + SID + '";_pendingMapModeAt=Date.now();doActualStart("' + SID + '");', sandbox, { timeout: 20000 });

function dump(label) {
  const out = vm.runInContext('JSON.stringify((function(){\n' +
    'var g=GM.guoku||{};var pg=GM._prevGuoku||null;\n' +
    'function lstock(a,r){return (a&&a.ledgers&&a.ledgers[r])?a.ledgers[r].stock:undefined;}\n' +
    'var topbar=null;try{if(typeof _renderGuoku==="function"){var r=_renderGuoku();topbar=(r.subItems||[]).map(function(s){return s.k+"="+s.v+"(Δ"+(s.d||0)+")";});}}catch(e){topbar=["ERR:"+e.message];}\n' +
    'return {\n' +
    '  guoku_raw:{money:g.money,balance:g.balance,grain:g.grain,cloth:g.cloth,monthlyIncome:g.monthlyIncome,turnIncome:g.turnIncome,turnExpense:g.turnExpense},\n' +
    '  guoku_ledgerStock:{money:lstock(g,"money"),grain:lstock(g,"grain"),cloth:lstock(g,"cloth")},\n' +
    '  prevGuoku:pg?{money:pg.money,balance:pg.balance,grain:pg.grain,cloth:pg.cloth}:null,\n' +
    '  topbar_via_renderGuoku:topbar,\n' +
    '  shiji_OLD_rawRead:{银两_new:g.money,粮米_new:g.grain,布匹_new:g.cloth},\n' +
    '  shiji_NEW_barAccountStock:(typeof _barAccountStock==="function")?{银两_new:_barAccountStock(g,"money"),粮米_new:_barAccountStock(g,"grain"),布匹_new:_barAccountStock(g,"cloth")}:"无_barAccountStock"\n' +
    '};})())', sandbox);
  console.log('\n────── ' + label + ' ──────');
  console.log(JSON.stringify(JSON.parse(out), null, 2));
}

dump('doActualStart 后(turn=' + sandbox.GM.turn + ')');

// ★插桩:追踪 GM.guoku.money / .balance 每次写入(old→new + 调用栈前三帧)·抓"谁让 money 偏离 balance"
vm.runInContext(
  'GM.guoku && ["money","balance"].forEach(function(f){' +
  '  var bf="__t_"+f; GM.guoku[bf]=GM.guoku[f];' +
  '  Object.defineProperty(GM.guoku,f,{configurable:true,' +
  '    get:function(){return this[bf];},' +
  '    set:function(v){' +
  '      var st=(new Error().stack||"").split("\\n").slice(2,5).map(function(s){return s.trim().replace(/^at /,"");}).join("  <-  ");' +
  '      (GM.guoku.__traceLog=GM.guoku.__traceLog||[]).push(f+": "+(this[bf]==null?"undef":Math.round(Number(this[bf])||0))+" -> "+(v==null?"undef":Math.round(Number(v)||0))+"   @ "+st);' +
  '      this[bf]=v;' +
  '    }});' +
  '});', sandbox);

// 跑一次引擎结算(engine-first·无 AI)·看 guoku 结算后两条路径
(async function () {
  try {
    if (typeof sandbox._endTurn_updateSystems === 'function') {
      const tr = (typeof sandbox.getTimeRatio === 'function') ? sandbox.getTimeRatio() : 0;
      await sandbox._endTurn_updateSystems(tr, '');
    }
  } catch (e) { console.log('engine-first err(忽略·只看 guoku):', String(e && e.message).slice(0, 80)); }
  dump('引擎结算一次后(turn=' + sandbox.GM.turn + ')');
  var trace = JSON.parse(vm.runInContext('JSON.stringify(GM.guoku.__traceLog||[])', sandbox));
  console.log('\n────── money/balance 写入轨迹(结算期间·按序) ──────');
  trace.forEach(function (t, i) { console.log('  [' + i + '] ' + t); });
  console.log('\n══ 判读 ══');
  console.log('  修复前(shiji_OLD_rawRead 裸读 g.money) vs 顶栏(topbar_via_renderGuoku 走 _barAccountStock):若不同=旧 bug 复现');
  console.log('  修复后(shiji_NEW_barAccountStock 走 _barAccountStock) == 顶栏:二者同源同函数 → 必然一致(修复点)');
  process.exit(0);
})();
