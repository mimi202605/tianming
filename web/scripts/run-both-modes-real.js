#!/usr/bin/env node
/* eslint-env node */
'use strict';
// run-both-modes-real.js — 两种模式·真模型(BYOK)·完整过一整回合·全量对比
//   我(测试者)扮演玩家做一套**完整操作**(任免×2 + 诏书×5 + 奏疏×2批复 + 朝会问对 + 鸿雁×2) →
//   两个独立 sandbox 各用**真模型**完整跑 endTurn() 整条管线 + post-turn 朝会(一个环节不少) →
//   全量捕获并对比:① 玩家操作 ② 各模式调用次数+明细 ③ 生成内容(史记四体全文) ④ 是否真改状态/UI(前后差+渲染调用)。
//   mode A = LLM 管线(真 sc 推演)· mode B = agent 接管(真 agent 循环)。两模式同一套玩家操作。
//   配置走环境变量(key 绝不进聊天/文件/回显·输出替 ***):TM_AI_KEY / TM_AI_URL / TM_AI_MODEL / TM_AI_SECONDARY(可) / TM_AI_PROVIDER(可)。
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.resolve(__dirname, '..'); const HEADLESS = path.join(__dirname, 'headless-smoke.js');
const SID = 'sc-tianqi7-1627';

const KEY = process.env.TM_AI_KEY || '';
const URL = process.env.TM_AI_URL || '';
const MODEL = process.env.TM_AI_MODEL || '';
const SECONDARY = process.env.TM_AI_SECONDARY || MODEL;
const PROVIDER = process.env.TM_AI_PROVIDER || 'openai';

function sanitize(s) { s = String(s == null ? '' : s); if (KEY && KEY.length > 6) s = s.split(KEY).join('***KEY***'); return s; }
function log() { console.log.apply(console, Array.prototype.map.call(arguments, function (a) { return typeof a === 'string' ? sanitize(a) : a; })); }

// headless 渲染 pump(setTimeout 驱动·主流程后才触碰未桩的 DOM 方法)会抛未捕获异常崩进程·
//   渲染本就全 stub·与推演/捕获无关·吞掉这类噪音(其余真异常仍打印)·让 mode A 完整真管线能跑完。
process.on('uncaughtException', function (e) {
  var m = String((e && (e.message || e.stack)) || e);
  if (/insertAdjacentHTML|appendChild|removeChild|is not a function|Cannot (read|set)|null|undefined/.test(m)) return;  // 渲染层 headless 噪音
  console.error('[uncaught] ' + sanitize(m));
});
process.on('unhandledRejection', function (e) { var m = String((e && (e.message || e)) || e); if (!/insertAdjacentHTML|is not a function/.test(m)) console.error('[unhandledRejection] ' + sanitize(m)); });

if (!KEY || !URL || !MODEL) {
  console.log('\n[run-both-modes-real] 缺配置·本机 PowerShell 先设(从注册表读·别贴聊天):');
  console.log('  $env:TM_AI_KEY=[Environment]::GetEnvironmentVariable("TM_AI_KEY","User"); (URL/MODEL/SECONDARY 同)');
  console.log('  当前: KEY=' + (KEY ? '已设' : '✗') + ' URL=' + (URL || '✗') + ' MODEL=' + (MODEL || '✗'));
  process.exit(2);
}

function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function waitFor(label, fn, timeoutMs) {
  const started = Date.now(); let last = null;
  while (Date.now() - started < timeoutMs) { try { const v = fn(); if (v) return v; } catch (e) { last = e; } await delay(60); }
  throw new Error('timeout: ' + label + (last ? ' · ' + last.message : ''));
}
function loadHeadlessHelpers() { const s = fs.readFileSync(HEADLESS, 'utf8').replace(/^#![^\n]*\n/, '').replace(/\nmain\(\);\s*$/, '\nreturn { makeStubs, parseIndexHtmlScripts };'); return (new Function('require', 'process', '__dirname', '__filename', 'module', 'exports', s))(require, process, __dirname, HEADLESS, { exports: {} }, {}); }
const helpers = loadHeadlessHelpers();

function loadGame(agentMode) {
  const flow = { warns: [], errors: [], renderCalls: {}, toasts: [], loadingMsgs: [] };
  const env = helpers.makeStubs();
  env.win.console = { log: () => {}, warn: (...a) => flow.warns.push(sanitize(a.map(String).join(' '))), error: (...a) => flow.errors.push(sanitize(a.map(function (x) { return (x && x.stack) ? x.stack : String(x); }).join(' '))), info: () => {}, debug: () => {} };
  env.win.location.href = 'http://localhost/index.html'; env.win.location.search = '';
  env.win.document.body.insertAdjacentHTML = function () {}; env.win.document.head.insertAdjacentHTML = function () {}; env.win.document.documentElement.insertAdjacentHTML = function () {};
  var _doFetch;
  if (process.env.TM_DRYRUN) {
    // 干跑:假 fetch(免费·秒回)·只验机制+我的捕获/报告代码不崩·内容空属正常
    var _dry = agentMode
      ? { choices: [{ message: { content: '', tool_calls: [{ id: 't1', type: 'function', function: { name: 'finalize_turn', arguments: '{"narrative":"干跑","summary":"干跑"}' } }] } }], usage: {} }
      : { choices: [{ message: { content: '{"ok":true}' } }], usage: {} };
    _doFetch = function () { return Promise.resolve({ ok: true, status: 200, headers: { get: function () { return 'application/json'; } }, text: function () { return Promise.resolve(JSON.stringify(_dry)); }, json: function () { return Promise.resolve(_dry); } }); };
  } else {
    _doFetch = function (u, o) { return fetch(u, o); };                    // node 原生真 fetch → 真模型
  }
  // 数每次 fetch = 真 API 调用次数(模式无关·权威计数:agent 调用不走 _aiDispatchStats·只有 fetch 计数对两模式都准)
  env.win.fetch = function (u, o) { flow.fetchCount = (flow.fetchCount || 0) + 1; return _doFetch(u, o); };
  env.win.AbortController = (typeof AbortController !== 'undefined') ? AbortController : env.win.AbortController;
  env.win.tianming = { writeTurnData() { return Promise.resolve({ ok: true }); }, autoSave() { return Promise.resolve({ ok: true }); }, saveGame() { return Promise.resolve({ ok: true }); } };
  const sandbox = vm.createContext(env.win);
  sandbox.__flow = flow;
  const scripts = helpers.parseIndexHtmlScripts();
  const cutoff = scripts.findIndex((src) => path.basename(src) === 'tm-test-harness.js');
  (cutoff >= 0 ? scripts.slice(0, cutoff) : scripts).forEach((src) => { try { vm.runInContext(fs.readFileSync(path.join(ROOT, src), 'utf8'), sandbox, { filename: src, timeout: 20000 }); } catch (e) {} });
  // 渲染函数:计数(代理"UI 刷新被触发")·非真渲染
  vm.runInContext('window.Audio=function(){return{play:function(){},pause:function(){},addEventListener:function(){}};};window.AudioContext=function(){return{createGain:function(){return{connect:function(){},gain:{}};},createOscillator:function(){return{connect:function(){},start:function(){},stop:function(){},frequency:{}};},destination:{},currentTime:0};};window.webkitAudioContext=window.AudioContext;showLoading=function(m,p){try{if(__flow.loadingMsgs&&String(m).indexOf("⟨执政⟩")===0)__flow.loadingMsgs.push(String(m));}catch(e){}};hideLoading=function(){};toast=function(m){__flow.toasts.push(String(m||""));};showTurnResult=function(){};["renderGameState","renderMemorials","renderQiju","renderJishi","renderBiannian","renderShijiList","renderRenwuList","renderMap","renderTopbar","renderProvincePanel"].forEach(function(n){window[n]=function(){__flow.renderCalls[n]=(__flow.renderCalls[n]||0)+1;};});generateMemorials=function(){if(!GM.memorials)GM.memorials=[];};var __re=typeof enterGame==="function"?enterGame:null;enterGame=function(){if(__re)return __re.apply(this,arguments);};aiDeepReadScenario=async function(){};aiPlanScenarioForInference=async function(){};aiPlanFactionMatrix=async function(){};aiPlanFirstTurnEvents=async function(){};', sandbox);
  // 真 AI 配置(key 经全局·内存·不回显)+ 模式开关
  sandbox.__AI_KEY = KEY; sandbox.__AI_URL = URL; sandbox.__AI_MODEL = MODEL; sandbox.__AI_SECONDARY = SECONDARY; sandbox.__AI_PROVIDER = PROVIDER; sandbox.__AGENT = !!agentMode;
  vm.runInContext('P=P||{};P.ai=P.ai||{};P.ai.key=__AI_KEY;P.ai.url=__AI_URL;P.ai.model=__AI_MODEL;P.ai.provider=__AI_PROVIDER;P.ai.secondary={key:__AI_KEY,url:__AI_URL,model:__AI_SECONDARY,provider:__AI_PROVIDER};P.conf=P.conf||{};P.conf.npcAiPrecision=false;P.conf.verbosity="standard";P.conf.agentModeEnabled=__AGENT;P.conf.agentModeDepthGate=true;', sandbox);
  return sandbox;
}

function installInputNodes(sandbox) {
  vm.runInContext('(function(){var prevGet=document.getElementById?document.getElementById.bind(document):function(){return null;};function node(v){return{value:v||"",textContent:"",innerHTML:"",style:{},dataset:{},classList:{add:function(){},remove:function(){},toggle:function(){return false;},contains:function(){return false;}},addEventListener:function(){},removeEventListener:function(){},remove:function(){},focus:function(){},blur:function(){},querySelector:function(){return null;},querySelectorAll:function(){return[];},getAttribute:function(){return null;},setAttribute:function(){},appendChild:function(c){return c;}};}var nodes={"edict-pol":node("彻查辽饷亏空：命户部三日内核实辽东军饷实数，严禁层层冒支，查实者依律抄没。"),"edict-mil":node("命新任蓟辽督师袁崇焕经略辽东，清点边军实额，修缮宁远、锦州诸堡，优先补足火器与粮草。"),"edict-dip":node("遣使朝鲜，厚赐安抚，令其严报建州动向，不得私通后金。"),"edict-eco":node("准江南漕运暂缓无名加派，令地方具册奏明实收实支，以纾民困。"),"edict-oth":node("命内阁汇整灾荒、兵饷、矿税三事，旬月内具奏。"),"xinglu-pub":node("朕意先稳边储、再清财政浮冒。诸臣直言利弊，毋得空文塞责。"),"btn-end":node("静待时变"),"btn-end-turn":node("静待时变")};document.getElementById=function(id){return nodes[id]||prevGet(id);};})();', sandbox, { timeout: 10000 });
}

// 完整玩家操作:任免×2(玩家本人做·过回合前)+ 奏疏×2批复 + 朝会问对 + 鸿雁×2 + 事件
function setupRichPlayerOps(sandbox) {
  vm.runInContext('(function(){var find=function(n){return (GM.chars||[]).find(function(c){return c&&c.name===n;});};var pickAlive=function(prefs){for(var i=0;i<prefs.length;i++){var c=find(prefs[i]);if(c&&c.alive!==false)return c;}return (GM.chars||[]).filter(Boolean)[0]||{name:"廷臣"};};'
    + 'var du=pickAlive(["袁崇焕","孙承宗","熊廷弼","王在晋"]);var fu=pickAlive(["孙承宗","叶向高","韩爌","徐光启"]);'
    /* (a) 任免×2:玩家本人任命(过回合前已定·两模式同·agent/LLM 只推演后果·不重做) */
    + 'window.__ops={appoints:[],minister:du.name,fu:fu.name};'
    + 'if(typeof onAppointment==="function"){try{onAppointment(du.name,"蓟辽督师");window.__ops.appoints.push(du.name+"→蓟辽督师");}catch(e){}'
    + 'try{if(fu.name!==du.name){onAppointment(fu.name,"东阁大学士");window.__ops.appoints.push(fu.name+"→东阁大学士");}}catch(e){}}'
    /* (b) 奏疏×2 + 批复 */
    + 'if(!Array.isArray(GM.memorials))GM.memorials=[];'
    + 'GM.memorials.push({id:"m1",from:du.name,title:"辽饷浮冒与边储告急",type:"财政",subtype:"题本",content:"臣闻辽饷支给多有虚冒，边储不相继，请先核实军额仓储，再议增兵。",status:"pending",turn:GM.turn,reply:""});'
    + 'GM.memorials.push({id:"m2",from:fu.name,title:"请慎选辽东监军",type:"人事",subtype:"奏本",content:"辽事方殷，监军非人则掣肘前敌，乞陛下慎择。",status:"pending",turn:GM.turn,reply:""});'
    + 'if(typeof _stageMemorialDecision==="function"){_stageMemorialDecision(GM.memorials[GM.memorials.length-2],"annotated","着户部、兵部会核辽饷与边储，十日内具册。");_stageMemorialDecision(GM.memorials[GM.memorials.length-1],"rejected","监军暂仍其旧，俟辽事稍定再议。");}'
    /* (c)(d) 朝会·问对 transcript */
    + 'if(!Array.isArray(GM._courtRecords))GM._courtRecords=[];var rec={turn:GM.turn,targetTurn:GM.turn,phase:"in-turn",mode:"changchao",topic:"早朝·辽饷与边备",decisions:[{action:"approve",label:"核辽饷、修边堡",extra:"先清册，后增饷。"}],transcript:[{role:"player",speaker:"皇帝",text:"先核实辽饷，再议增兵。卿等以为如何？"},{role:"npc",speaker:du.name,text:"边储若虚，清册不可缓；臣请先核宁锦二镇。"},{role:"npc",speaker:fu.name,text:"辽饷积弊在胥吏，非严法不能清。"}],_v3:true};GM._courtRecords.push(rec);GM._lastChangchaoDecisions=rec.decisions.slice();GM._lastChangchaoDecisionMeta={turn:rec.turn,targetTurn:rec.targetTurn,phase:rec.phase,mode:rec.mode};GM._lastChangchaoDecisionsTargetTurn=rec.targetTurn;if(typeof recordCourtHeld==="function")recordCourtHeld({isPostTurn:false,source:"both-modes"});'
    /* (f) 鸿雁×2 */
    + 'if(!Array.isArray(GM.letters))GM.letters=[];GM.letters.push({id:"l1",from:"皇帝",to:du.name,content:"卿可密访辽饷实额，勿使浮冒者预闻；如有掣肘，可径奏朕知。",sentTurn:GM.turn,deliveryTurn:GM.turn+1,replyTurn:GM.turn+2,status:"traveling",urgency:"urgent",letterType:"personal",_replyExpected:true});GM.letters.push({id:"l2",from:"皇帝",to:fu.name,content:"内阁票拟辽事，务以实心任事，毋蹈因循。",sentTurn:GM.turn,deliveryTurn:GM.turn+1,status:"traveling",urgency:"normal",letterType:"personal"});'
    /* (e) 人物问对:让 NPC 表鲜明态度·验回合推演 NPC 反应一致性(防人格分裂) */
    + 'if(!GM.wenduiHistory)GM.wenduiHistory={};'
    + 'GM.wenduiHistory[du.name]=(GM.wenduiHistory[du.name]||[]).concat([{turn:GM.turn,role:"player",content:"辽事危殆，卿有何以教朕？"},{turn:GM.turn,role:"npc",speaker:du.name,content:"臣"+du.name+"受陛下知遇，誓守宁锦！五年复辽，宁远城在臣在、城亡臣亡，纵粉身碎骨亦不负皇恩！"}]);'
    + 'var wz=(GM.chars||[]).find(function(c){return c&&c.name==="魏忠贤";});if(wz){GM.wenduiHistory["魏忠贤"]=(GM.wenduiHistory["魏忠贤"]||[]).concat([{turn:GM.turn,role:"player",content:"辽饷浮冒一案，卿以为如何？"},{turn:GM.turn,role:"npc",speaker:"魏忠贤",content:"陛下，辽饷牵连甚广，骤查恐激边镇之变，老奴愚见当从缓图、先安边军为上……"}]);window.__ops.wzAsked=true;}'
    + 'if(!Array.isArray(GM.evtLog))GM.evtLog=[];GM.evtLog.push({turn:GM.turn,type:"玩家操作",text:"早朝议辽饷，起袁崇焕督师、辅臣入阁，下诏五道，朱批二奏疏，遣密札二，召对袁崇焕、魏忠贤。"});'
    + 'window.__ops.memorials=GM.memorials.length;window.__ops.letters=GM.letters.length;window.__ops.court=GM._courtRecords.length;window.__ops.wendui=Object.keys(GM.wenduiHistory).length;'
    + '})();', sandbox, { timeout: 10000 });
}

function installTrace(sandbox) {
  vm.runInContext('window.__trace=[];(function(){var oM=callAIMessages;if(typeof oM==="function")callAIMessages=async function(msgs){var u=(msgs&&msgs[1]&&msgs[1].content)||"";var s=(msgs&&msgs[0]&&msgs[0].content)||"";var r;try{r=await oM.apply(this,arguments);}catch(e){__trace.push({k:"cam",err:String(e&&e.message||e),head:String(u).slice(0,46)});throw e;}__trace.push({k:"cam",head:String(u).slice(0,46),sys:String(s).slice(0,30),outLen:(typeof r==="string"?r.length:0),hasMem:/跨回合记忆|前几回合史记|编年|未回收伏笔|远期压缩/.test(u),hasOps:/玩家操作/.test(u)});return r;};var oT=callAIWithTools;if(typeof oT==="function")callAIWithTools=async function(p,t,o){var r;try{r=await oT.apply(this,arguments);}catch(e){__trace.push({k:"cwt",err:String(e&&e.message||e)});throw e;}__trace.push({k:"cwt",tools:(t||[]).length,calls:(r&&r.toolCalls||[]).map(function(c){return c.name;}),outLen:(r&&r.text||"").length});return r;};})();', sandbox);
}

function snapState(sandbox) {
  return JSON.parse(vm.runInContext('JSON.stringify((function(){var num=function(v){if(v&&typeof v==="object"){var ks=["balance","money","value","current","trueIndex","amount","total"];for(var i=0;i<ks.length;i++){if(v[ks[i]]!=null)return Math.round(v[ks[i]]*100)/100;}return JSON.stringify(v).slice(0,24);}return v;};var keyNames=[window.__ops&&__ops.minister,window.__ops&&__ops.fu,"魏忠贤","崔呈秀"].filter(Boolean);var seen={};var kc=[];keyNames.forEach(function(n){if(seen[n])return;seen[n]=1;var c=(GM.chars||[]).find(function(x){return x&&x.name===n;});if(c)kc.push({name:n,office:c.officialTitle||c.position||c.office||c.title||"",loyalty:c.loyalty!=null?c.loyalty:c.zhongcheng,mood:c.mood||c._mood||""});});return {turn:GM.turn,guoku:num(GM.guoku),neitang:num(GM.neitang),minxin:num(GM.minxin),chars:kc,facsTop:(GM.facs||[]).slice(0,4).map(function(f){return {name:f.name,power:f.power!=null?f.power:f.strength,stance:f.stance||f.posture||f.toPlayer};}),memPending:(GM.memorials||[]).filter(function(m){return m&&m.status==="pending";}).length,evtLog:(GM.evtLog||[]).length};})())', sandbox, { timeout: 10000 }));
}

function capture(sandbox, before, after, startTurn, label) {
  const out = JSON.parse(vm.runInContext('JSON.stringify((function(){var meta=GM._agentTurnMeta||null;var sh=(GM.shijiHistory&&GM.shijiHistory.length)?GM.shijiHistory[GM.shijiHistory.length-1]:null;var tc=GM.turnChanges||{};var disp=GM._aiDispatchStats||{};return {turn:GM.turn,'
    + 'agentMeta:meta?{rounds:meta.rounds,writeOk:meta.writeOk,scaffolded:!!meta.scaffolded,scaffoldActions:meta.scaffoldActions||0,autoClosed:!!meta.autoClosed,finalized:meta.finalized,depthTools:Object.keys(meta.depthTools||{}),deepenSkipped:meta.deepenSkipped||[],spineGaps:meta.spineGaps||[]}:null,'
    + 'shiji:sh?{title:sh.szjTitle||sh.title||"",summary:sh.szjSummary||sh.summary||"",shilu:sh.shilu||sh.shiluText||"",shizhengji:sh.shizhengji||"",zhengwen:sh.zhengwen||"",houren:sh.houren||sh.hourenXishuo||"",playerStatus:sh.playerStatus||"",playerInner:sh.playerInner||"",suggestions:sh.suggestions||[],personnel:Array.isArray(sh.personnel)?sh.personnel:(sh.personnelChanges||[])}:null,'
    + 'turnChanges:{characters:(tc.characters||[]).length,factions:(tc.factions||[]).length,variables:(tc.variables||[]).length,military:(tc.military||[]).length},'
    + 'causalEdges:(GM._causalGraph&&GM._causalGraph.edges||[]).length,stateBoard:!!GM._stateBoard,plotThreads:(GM._plotThreads||[]).length,foreshadows:(GM._foreshadows||[]).length,factionUndercurrents:(GM._factionUndercurrents||[]).length,letters:(GM.letters||[]).length,shijiHistory:(GM.shijiHistory||[]).length,'
    + 'npcReactions:["袁崇焕","魏忠贤","孙承宗"].map(function(nm){var c=(GM.chars||[]).find(function(x){return x&&x.name===nm;});if(!c)return null;var lastScar=(Array.isArray(c._scars)&&c._scars.length)?c._scars[c._scars.length-1]:null;return {name:nm,mood:c._mood||c.mood||"",stress:c.stress,inner:lastScar?lastScar.event:"",scarTurn:lastScar?lastScar.turn:null};}).filter(Boolean),'
    + 'pipeline:((TM.Endturn&&TM.Endturn.Pipeline&&TM.Endturn.Pipeline.lastRun)?TM.Endturn.Pipeline.lastRun():[]).map(function(x){return {step:x.step,ok:!!x.ok,error:x.error?String(x.error.message||x.error).slice(0,90):""};}),'
    + 'tokens:disp.totalTokens||0,dispCalls:disp.successCount||0,dispFail:disp.failCount||0,fetchCount:__flow.fetchCount||0,renderCalls:__flow.renderCalls||{},agentLoading:(__flow.loadingMsgs||[]).slice(0,40),trace:__trace||[],errors:(__flow.errors||[]).slice(-8)};})())', sandbox, { timeout: 15000 }));
  out.before = before; out.after = after; out._startTurn = startTurn; out._label = label;
  return out;
}

async function runMode(label, agentMode) {
  const sandbox = loadGame(agentMode);
  vm.runInContext('_pendingUseMap=true;_pendingMapModeSid="' + SID + '";_pendingMapModeAt=Date.now();doActualStart("' + SID + '");', sandbox, { timeout: 20000 });
  await delay(220);
  if (!(sandbox.GM && sandbox.GM.running)) throw new Error(label + ': doActualStart 失败');
  installInputNodes(sandbox);
  installTrace(sandbox);                                                  // 包一次(每回合重置 __trace)
  var WAIT_MS = parseInt(process.env.TM_WAIT_MS || '1500000', 10);
  const turns = Math.max(1, parseInt(process.env.TM_TURNS || '1', 10));   // ①:TM_TURNS=2 验记忆连续性
  const caps = [];
  for (let t = 1; t <= turns; t++) {
    vm.runInContext('window.__trace=[];__flow.fetchCount=0;__flow.renderCalls={};__flow.loadingMsgs=[];', sandbox);  // 本回合 trace/计数/渲染/加载文案单独(非累积)
    setupRichPlayerOps(sandbox);                                          // 本回合玩家操作(再做一套·累积·验 turn2 读 turn1 记忆)
    const before = snapState(sandbox);
    const startTurn = sandbox.GM.turn;
    vm.runInContext('endTurn();', sandbox, { timeout: 30000 });
    try { vm.runInContext('_postTurnCourtChoose(true);', sandbox, { timeout: 10000 }); } catch (e) {}
    try { vm.runInContext('(function(){if(!Array.isArray(GM._courtRecords))GM._courtRecords=[];var st=' + startTurn + ';GM._courtRecords.push({turn:st,targetTurn:st+1,phase:"post-turn",mode:"changchao",topic:"朔朝·次月边饷",decisions:[{action:"decree",label:"次月续核辽饷",extra:""}],transcript:[{role:"player",speaker:"皇帝",text:"次月仍以辽饷为先。"},{role:"npc",speaker:"阁臣",text:"谨遵上意。"}],_v3:true});if(typeof recordCourtHeld==="function")recordCourtHeld({isPostTurn:true,source:"both-modes"});})();', sandbox, { timeout: 10000 }); } catch (e) {}
    try { await waitFor('AI payload T' + t, () => { const p = sandbox.GM && sandbox.GM._pendingShijiModal; return (p && p.aiReady && p.payload) || (sandbox.GM && sandbox.GM.shijiHistory && sandbox.GM.shijiHistory.length >= t && sandbox.GM.turn > startTurn); }, WAIT_MS); } catch (e) { sandbox.__flow.errors.push('waitPayload T' + t + ': ' + e.message); }
    try { await vm.runInContext('_onPostTurnCourtEnd();', sandbox, { timeout: 30000 }); } catch (e) {}
    try { await waitFor('court done T' + t, () => sandbox.GM && sandbox.GM._pendingShijiModal && sandbox.GM._pendingShijiModal.courtDone === true, 60000); } catch (e) {}
    try { vm.runInContext('if(GM._pendingShijiModal)GM._pendingShijiModal=null;', sandbox); } catch (e) {}  // 清待决·下回合重置
    await delay(120);
    const after = snapState(sandbox);
    caps.push(capture(sandbox, before, after, startTurn, label + '·T' + t));
  }
  return caps;
}

function diffState(b, a) {
  const lines = [];
  if (b.turn !== a.turn) lines.push('回合 ' + b.turn + '→' + a.turn);
  ['guoku', 'neitang', 'minxin'].forEach(function (k) { if (JSON.stringify(b[k]) !== JSON.stringify(a[k])) lines.push(k + ' ' + b[k] + '→' + a[k]); });
  (a.chars || []).forEach(function (ac) { var bc = (b.chars || []).find(function (x) { return x.name === ac.name; }) || {}; var d = []; if (bc.office !== ac.office) d.push('职:' + (bc.office || '—') + '→' + (ac.office || '—')); if (bc.loyalty !== ac.loyalty) d.push('忠:' + bc.loyalty + '→' + ac.loyalty); if (bc.mood !== ac.mood) d.push('情:' + (bc.mood || '—') + '→' + (ac.mood || '—')); if (d.length) lines.push(ac.name + '(' + d.join(' ') + ')'); });
  if (b.evtLog !== a.evtLog) lines.push('事件日志 ' + b.evtLog + '→' + a.evtLog + ' 条');
  if (b.memPending !== a.memPending) lines.push('待批奏疏 ' + b.memPending + '→' + a.memPending);
  return lines.length ? lines : ['(无可见核心字段变化)'];
}

function callSummary(trace) {
  const cam = trace.filter(function (t) { return t.k === 'cam'; });
  const cwt = trace.filter(function (t) { return t.k === 'cwt'; });
  const errs = trace.filter(function (t) { return t.err; });
  return { total: trace.length, cam: cam.length, cwt: cwt.length, errs: errs.length, cwtDetail: cwt, camDetail: cam };
}

function clip(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '…[共' + s.length + '字]' : s + (s ? '[' + s.length + '字]' : ''); }

function reportMode(r) {
  log('\n══════════ 模式 ' + r._label + ' ' + (r._label === 'A' ? '(LLM 管线)' : '(Agent 接管)') + ' ══════════');
  const cs = callSummary(r.trace);
  log('【调用次数】真模型 API 调用 ' + r.fetchCount + ' 次(数 fetch·权威·两模式可比) · tokens≈' + r.tokens + ' · dispatcher 另计成功' + r.dispCalls + '/失败' + r.dispFail);
  log('  (trace 抓明细 ' + cs.total + ' 条:cam ' + cs.cam + '/cwt ' + cs.cwt + '/报错 ' + cs.errs + '·部分模块加载期绑定原函数故 trace 偏少·以 fetch 计数为准)');
  if (cs.cwt) { log('  agent 循环每轮:'); cs.cwtDetail.forEach(function (t, i) { log('    轮' + (i + 1) + ' 挂' + t.tools + '工具 → [' + (t.calls || []).join(',') + ']' + (t.err ? ' 报错:' + t.err : '')); }); }
  log('  各调用(prompt 头·识别用途):');
  cs.camDetail.forEach(function (t, i) { log('    #' + (i + 1) + ' 「' + sanitize(t.head) + '」' + (t.err ? ' ✗' + t.err : ' →' + t.outLen + '字')); });
  if (r.agentMeta) log('  agent 机制: 轮' + r.agentMeta.rounds + ' 落地' + r.agentMeta.writeOk + ' 脚手架' + r.agentMeta.scaffolded + '(' + r.agentMeta.scaffoldActions + ') 自动收尾' + r.agentMeta.autoClosed + ' 深化[' + r.agentMeta.depthTools.join(',') + '] 自适应跳过[' + (r.agentMeta.deepenSkipped || []).join('、') + '] 脊柱缺口[' + r.agentMeta.spineGaps.join('、') + ']');
  if (r.agentLoading && r.agentLoading.length) { log('  ⟨工作流可观测⟩加载动画"正"行(' + r.agentLoading.length + ' 条·owner 要的轨迹显示):'); r.agentLoading.forEach(function (m) { log('    ▸ ' + sanitize(m)); }); }
  if (r.pipeline && r.pipeline.length) { log('  管线步骤(看是否走完到 turn++/史记):'); log('    ' + r.pipeline.map(function (x) { return x.step + (x.ok ? '✓' : '✗'); }).join(' → ')); var pe = r.pipeline.filter(function (x) { return !x.ok; }); if (pe.length) log('    ✗ 失败步:' + pe.map(function (x) { return x.step + '(' + sanitize(x.error) + ')'; }).join(' | ')); }

  log('\n【是否真改状态/UI】');
  log('  核心字段前后差:');
  diffState(r.before, r.after).forEach(function (l) { log('    · ' + l); });
  log('  turnChanges(Delta 面板):人物' + r.turnChanges.characters + ' 势力' + r.turnChanges.factions + ' 变量' + r.turnChanges.variables + ' 军事' + r.turnChanges.military);
  log('  活态层:因果边' + r.causalEdges + ' 状态盘' + r.stateBoard + ' 情节' + r.plotThreads + ' 伏笔' + r.foreshadows + ' 势力暗流' + r.factionUndercurrents + ' 书信' + r.letters);
  log('  渲染调用(UI 刷新触发):' + Object.keys(r.renderCalls || {}).map(function (k) { return k + '×' + r.renderCalls[k]; }).join(' · '));
  log('  史记入库:shijiHistory ' + r.shijiHistory + ' 条');

  log('\n【生成内容】');
  if (!r.shiji) { log('  ⚠ 未产出史记(可能管线报错·见末errors)'); }
  else {
    log('  标题:' + sanitize(r.shiji.title));
    log('  摘要:' + sanitize(r.shiji.summary));
    log('  实录(' + String(r.shiji.shilu).length + '字):' + sanitize(clip(r.shiji.shilu, 400)));
    log('  时政记(' + String(r.shiji.shizhengji).length + '字):' + sanitize(clip(r.shiji.shizhengji, 700)));
    log('  政文(' + String(r.shiji.zhengwen).length + '字):' + sanitize(clip(r.shiji.zhengwen, 500)));
    log('  后人戏说(' + String(r.shiji.houren).length + '字):' + sanitize(clip(r.shiji.houren, 600)));
    log('  君上状态:' + sanitize(clip(r.shiji.playerStatus, 160)));
    log('  主角内心:' + sanitize(clip(r.shiji.playerInner, 160)));
    log('  宰辅进言:' + JSON.stringify(r.shiji.suggestions).slice(0, 300));
    log('  人事变动记录:' + JSON.stringify(r.shiji.personnel).slice(0, 300));
  }
  // Q2 人格一致性:问对里 NPC 的态度 vs 回合推演出的内心(对照判有无人格分裂)
  if (r.npcReactions && r.npcReactions.length) {
    log('\n【Q2 人格一致性 · 问对态度 → 回合推演内心(对照)】');
    log('  问对中:袁崇焕=誓守宁锦五年复辽城在臣在(忠烈死守) · 魏忠贤=辽饷牵连甚广宜缓图(反对彻查·自保)');
    r.npcReactions.forEach(function (n) {
      log('  · ' + n.name + ' 推演:情=' + sanitize(n.mood || '—') + ' 压=' + (n.stress != null ? n.stress : '—') + ' 内心/暗筹=' + sanitize(n.inner || '(无)'));
    });
    log('  → 人工判:袁崇焕内心应忠烈/担当(勿莫名消极);魏忠贤内心应忧惧/自保(可表里不一但勿无故倒戈)。');
  }
  if (r.errors && r.errors.length) log('  残留错误:' + r.errors.map(sanitize).join(' | '));
}

async function main() {
  log('\n████████ 两种模式·真模型·完整过一整回合·全量对比 ████████');
  log('模型: 主=' + MODEL + ' · 次=' + SECONDARY + ' · provider=' + PROVIDER + ' · 端点=' + URL.replace(/\/\/[^/]+/, '//***'));
  log('剧本: ' + SID + ' · 字数档: standard · (key 不回显·已脱敏)');

  var only = (process.env.TM_MODE || '').toUpperCase();  // 'A' / 'B' / 空=两个都跑
  let A, B;
  if (only !== 'B') { log('\n[跑 模式 A · LLM 管线 · 真模型] … 完整 endTurn + post-turn(真 sc 推演·耗时数分钟)'); try { A = await runMode('A', false); } catch (e) { log('✗ 模式A 抛错: ' + sanitize(e && (e.stack || e.message))); } }
  if (only !== 'A') { log('\n[跑 模式 B · Agent 接管 · 真模型] … 完整 endTurn + post-turn(真 agent 循环·耗时数分钟)'); try { B = await runMode('B', true); } catch (e) { log('✗ 模式B 抛错: ' + sanitize(e && (e.stack || e.message))); } }

  log('\n────── 玩家操作(两模式同一套·我扮演玩家·过回合前做掉)──────');
  log('  · 任免×2:起袁崇焕→蓟辽督师、辅臣→东阁大学士(玩家本人 onAppointment·非 AI)');
  log('  · 诏书×5:彻查辽饷 / 命督师整饬关宁 / 遣使朝鲜 / 缓江南加派 / 内阁汇整三事');
  log('  · 奏疏×2 + 批复:辽饷告急(着会核) / 请慎选监军(驳·仍其旧)');
  log('  · 朝会问对:早朝议辽饷边备(君+督师+辅臣 三方对答)');
  log('  · 鸿雁×2:密札督师(访辽饷实额) / 札辅臣(内阁实心任事)');
  log('  · 行止:夜召辅臣文华殿问辽事');

  // runMode 返回每回合 capture 数组
  function reportRun(caps, label) {
    if (!caps || !caps.length) return;
    caps.forEach(function (c) { reportMode(c); });
    if (caps.length >= 2) {
      // ① 记忆连续性检查:末回合的深化调用是否含【跨回合记忆】段(只有 turn1 写了记忆·turn2 才读得到→证不失忆)
      var last = caps[caps.length - 1];
      var cams = (last.trace || []).filter(function (t) { return t.k === 'cam'; });
      var memHits = cams.filter(function (t) { return t.hasMem; }).length;
      var opsHits = cams.filter(function (t) { return t.hasOps; }).length;
      var lastShiji = last.shiji ? [last.shiji.shilu, last.shiji.shizhengji, last.shiji.zhengwen].join(' ') : '';
      var contWords = (lastShiji.match(/上月|上回|上一?回|前番|此前|继之?前|去岁|前次|延续|续查|续核|月前/g) || []).length;
      log('\n══════════ ① 记忆连续性检查(' + label + ' · 末回合 T' + caps.length + ' · 共' + caps.length + '回合)══════════');
      log('  末回合深化调用(cam)' + cams.length + ' 次 · 含【跨回合记忆】段的 ' + memHits + ' 次 · 含【玩家操作】段的 ' + opsHits + ' 次');
      log('  → ' + (memHits > 0 ? '✅ 末回合真读到了前回合记忆(turn1 写→turn' + caps.length + ' 读·非失忆)' : '⚠ 末回合深化未见跨回合记忆段(可能记忆未写/未读·查)'));
      log('  末回合史记承接词("上月/此前/续查…")出现 ' + contWords + ' 处' + (contWords > 0 ? '(>0 提示叙事承接前文)' : '(0·人工判下方片段)'));
      log('  末回合史记片段(人工判是否接前文):\n    ' + sanitize(clip(lastShiji, 360)));
    }
  }
  if (A) reportRun(A, '模式A');
  if (B) reportRun(B, '模式B');

  if (A && A.length && B && B.length) {
    var a = A[A.length - 1], b = B[B.length - 1];
    log('\n══════════ 对比小结(末回合)══════════');
    log('  API 调用次数:A=' + a.fetchCount + ' 次  ·  B=' + b.fetchCount + ' 次  (数 fetch·权威·两模式可比)');
    log('  tokens:      A≈' + a.tokens + '  ·  B≈' + b.tokens);
    log('  史记四体字数:A=实' + S(a, 'shilu') + '/时' + S(a, 'shizhengji') + '/政' + S(a, 'zhengwen') + '/戏' + S(a, 'houren') + '  ·  B=实' + S(b, 'shilu') + '/时' + S(b, 'shizhengji') + '/政' + S(b, 'zhengwen') + '/戏' + S(b, 'houren'));
    log('  turnChanges: A=人' + a.turnChanges.characters + '/变' + a.turnChanges.variables + '  ·  B=人' + b.turnChanges.characters + '/变' + b.turnChanges.variables);
    log('  活态层:      A=因果' + a.causalEdges + '/暗流' + a.factionUndercurrents + '/伏笔' + a.foreshadows + '  ·  B=因果' + b.causalEdges + '/暗流' + b.factionUndercurrents + '/伏笔' + b.foreshadows);
  }
  log('\n████████ 完 ████████\n');
  process.exit(0);
}
function S(r, k) { return r && r.shiji ? String(r.shiji[k] || '').length : 0; }
main().catch(function (e) { log('[run-both-modes-real] FAIL ' + sanitize(e && (e.stack || e.message) || e)); process.exit(1); });
