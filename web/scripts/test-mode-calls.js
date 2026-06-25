#!/usr/bin/env node
/* eslint-env node */
'use strict';
// test-mode-calls.js — 两种模式·真实调用次数 + 生成内容(基于 smoke-full-turn-flow 框架)
//   不 mock 整个 _endTurn_aiInfer·改在传输层(_aiFetchWithRetry / callAIMessages / callAIWithTools)拦截:逐次计数 + 我当 LLM 喂内容 + 抓产出。
//   mode A:真实 LLM 管线跑出真实 sc 子调用数(_aiFetchWithRetry);mode B:agent 循环(callAIWithTools)+ 深化工具(callAIMessages)。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const HEADLESS = path.join(__dirname, 'headless-smoke.js');
const SID = 'sc-tianqi7-1627';
function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function waitFor(label, fn, timeoutMs) { const s = Date.now(); let last = null; while (Date.now() - s < timeoutMs) { try { const v = fn(); if (v) return v; } catch (e) { last = e; } await delay(40); } throw new Error('timeout ' + label + (last ? ':' + last.message : '')); }
function loadHeadlessHelpers() {
  const source = fs.readFileSync(HEADLESS, 'utf8').replace(/^#![^\n]*\n/, '').replace(/\nmain\(\);\s*$/, '\nreturn { makeStubs, parseIndexHtmlScripts };');
  return (new Function('require', 'process', '__dirname', '__filename', 'module', 'exports', source))(require, process, __dirname, HEADLESS, { exports: {} }, {});
}
const helpers = loadHeadlessHelpers();

function loadGame() {
  const flow = { logs: [], warns: [], errors: [], aiTrace: [], agentRounds: [] };
  const env = helpers.makeStubs();
  env.win.console = { log: () => {}, warn: (...a) => flow.warns.push(a.map(String).join(' ')), error: (...a) => flow.errors.push(a.map(function (x) { return (x && x.stack) ? x.stack : String(x); }).join(' ')), info: () => {}, debug: () => {} };
  env.win.__flow = flow;
  env.win.location.href = 'http://localhost/index.html'; env.win.location.search = '';
  env.win.document.body.insertAdjacentHTML = function () {}; env.win.document.head.insertAdjacentHTML = function () {}; env.win.document.documentElement.insertAdjacentHTML = function () {};
  env.win.AbortController = class { constructor() { this.signal = { aborted: false, addEventListener() {}, removeEventListener() {} }; } abort() {} };
  env.win.fetch = function () { return Promise.resolve({ ok: true, status: 200, headers: { get() { return ''; } }, text() { return Promise.resolve('{}'); }, json() { return Promise.resolve({ choices: [{ message: { content: '{}' } }], usage: {} }); } }); };
  env.win.tianming = { writeTurnData() { return Promise.resolve({ ok: true }); }, autoSave() { return Promise.resolve({ ok: true }); }, saveGame() { return Promise.resolve({ ok: true }); } };
  const sandbox = vm.createContext(env.win);
  const scripts = helpers.parseIndexHtmlScripts();
  const cutoff = scripts.findIndex((src) => path.basename(src) === 'tm-test-harness.js');
  (cutoff >= 0 ? scripts.slice(0, cutoff) : scripts).forEach((src) => { vm.runInContext(fs.readFileSync(path.join(ROOT, src), 'utf8'), sandbox, { filename: src, timeout: 15000 }); });
  vm.runInContext(`
    showLoading=function(){}; hideLoading=function(){}; toast=function(){};
    showTurnResult=function(){}; ['renderGameState','renderMemorials','renderQiju','renderJishi','renderBiannian','renderShijiList','renderRenwuList','renderMap'].forEach(function(n){ window[n]=function(){}; });
    generateMemorials=function(){ if(!GM.memorials) GM.memorials=[]; };
    var __re=typeof enterGame==='function'?enterGame:null; enterGame=function(){ if(__re) return __re.apply(this,arguments); };
    aiDeepReadScenario=async function(){}; aiPlanScenarioForInference=async function(){}; aiPlanFactionMatrix=async function(){}; aiPlanFirstTurnEvents=async function(){};
    if(!P.ai)P.ai={}; P.ai.key='mock'; P.ai.url='http://mock/v1'; P.ai.model='mock'; if(!P.conf)P.conf={}; P.conf.npcAiPrecision=false;
  `, sandbox);
  sandbox.__flow = flow;
  return sandbox;
}

function installInputNodes(sandbox) {
  vm.runInContext(`(function(){ var pg=document.getElementById?document.getElementById.bind(document):function(){return null;};
    function n(v){return {value:v||'',textContent:'',innerHTML:'',style:{},dataset:{},classList:{add:function(){},remove:function(){},toggle:function(){return false;},contains:function(){return false;}},addEventListener:function(){},removeEventListener:function(){},remove:function(){},focus:function(){},blur:function(){},querySelector:function(){return null;},querySelectorAll:function(){return[];},getAttribute:function(){return null;},setAttribute:function(){},appendChild:function(c){return c;}};}
    var nodes={'edict-pol':n('整饬辽饷，命户部核实辽东军饷，严禁冒支。'),'edict-mil':n('命蓟辽督抚清点边军实额，修缮宁锦诸堡。'),'edict-dip':n('遣使朝鲜，询边情而厚赐安抚。'),'edict-eco':n('准江南漕运暂缓加派，具册奏明实收实支。'),'edict-oth':n('命内阁汇整灾荒、兵饷、矿税三事。'),'xinglu-pub':n('朕意先稳边储，再察财政浮冒。'),'btn-end':n('静待时变'),'btn-end-turn':n('静待时变')};
    document.getElementById=function(id){return nodes[id]||pg(id);};
  })();`, sandbox, { timeout: 10000 });
}

function simulateOps(sandbox) {
  vm.runInContext(`(function(){
    var pref=['袁崇焕','孙承宗','叶向高','韩爌','杨鹤','徐光启','魏忠贤']; var m=null;
    for(var i=0;i<pref.length&&!m;i++) m=(GM.chars||[]).find(function(c){return c&&c.alive!==false&&c.name===pref[i];});
    m=m||(GM.chars||[]).filter(Boolean)[0]||{name:'廷臣'};
    if(!Array.isArray(GM.memorials))GM.memorials=[];
    GM.memorials.push({id:'mem1',from:m.name,title:'辽饷浮冒与边储告急',type:'财政',subtype:'题本',content:'臣闻辽饷支给多有虚冒，请先核实军额与仓储。',status:'pending',turn:GM.turn,reply:''});
    if(typeof _stageMemorialDecision==='function')_stageMemorialDecision(GM.memorials[GM.memorials.length-1],'annotated','着户部、兵部会核辽饷与边储，十日内具册。');
    if(!Array.isArray(GM._courtRecords))GM._courtRecords=[];
    var rec={turn:GM.turn,targetTurn:GM.turn,phase:'in-turn',mode:'changchao',topic:'早朝·辽饷与边备',decisions:[{action:'approve',label:'核辽饷、修边堡',extra:'先清册，后增饷。'}],transcript:[{role:'player',speaker:'皇帝',text:'先核实辽饷，再议增兵。'},{role:'npc',speaker:m.name,text:'边储若虚，清册不可缓。'}],_v3:true};
    GM._courtRecords.push(rec); GM._lastChangchaoDecisions=rec.decisions.slice(); GM._lastChangchaoDecisionMeta={turn:rec.turn,targetTurn:rec.targetTurn,phase:rec.phase,mode:rec.mode}; GM._lastChangchaoDecisionsTargetTurn=rec.targetTurn;
    if(typeof recordCourtHeld==='function')recordCourtHeld({isPostTurn:false,source:'calls'});
    if(!Array.isArray(GM.letters))GM.letters=[];
    GM.letters.push({id:'l1',from:'皇帝',to:m.name,content:'卿可密访辽饷实额，勿使浮冒者预闻。',sentTurn:GM.turn,deliveryTurn:GM.turn+1,status:'traveling',urgency:'urgent',letterType:'personal',_replyExpected:true});
    if(!Array.isArray(GM.evtLog))GM.evtLog=[];
    GM.evtLog.push({turn:GM.turn,type:'玩家操作',text:'早朝议辽饷，御笔下诏核饷修边，朱批一奏疏。'});
    window.__flow.minister=m.name;
  })();`, sandbox, { timeout: 10000 });
}

// 传输层拦截:计数 + 我当 LLM 喂内容(按 prompt 标记)+ 抓产出
function installTransport(sandbox) {
  vm.runInContext(`
    var F = window.__flow; var mn = F.minister || '袁崇焕';
    function rec(kind, marker, contentKey){ F.aiTrace.push({ kind:kind, marker:marker, contentKey:contentKey||'' }); }
    function userOf(body){ try { var b = typeof body==='string'?JSON.parse(body):body; var ms=b&&b.messages; return (ms&&ms[ms.length-1]&&ms[ms.length-1].content)||''; } catch(e){ return ''; } }
    // me-as-LLM:按 prompt 标记返回 JSON 文本(sc 主调与 followup 共用)
    function brain(u){
      if(/【实录·时政记专项】/.test(u)||/shilu_text[\\s\\S]*szj_title[\\s\\S]*shizhengji/.test(u)) return JSON.stringify({ turn_summary:'以财政核查与辽东边备为主线。', shilu_text:'九月，上诏户部核辽饷亏空。是月，起'+mn+'为蓟辽督师。上夜对边臣问辽事至三更。户部奏亏三十余万，多为吏蠹所侵。', szj_title:'核饷修边，整饬辽储', shizhengji:'【朝政】陛下颁谕二道：彻查辽饷、起'+mn+'授蓟辽督师。\\n【吏治】户部清查得亏空逾三十万两，多为胥吏截留。\\n【边防】'+mn+'受命，关宁暂得主心骨，粮饷未充。', szj_summary:'朝廷转向清饷与边备整理。', player_status:'御案劳神而政令已下。', player_inner:'疑饷弊久积，欲先清册再议大征。', char_updates:[{name:mn,loyalty_delta:3,action_type:'reward',reason:'奉旨清点宁锦边务'}], office_assignments:[{name:mn,post:'蓟辽督师',action:'appoint',reason:'起复经略辽东'}], fiscal_adjustments:[{action:'add',target:'guoku',kind:'expense',resource:'money',category:'军饷',name:'辽东核饷拨付',amount:50000,reason:'核饷修边'}], personnel_changes:[{name:mn,change:'奉旨清点宁锦边务'}], events:[], npc_actions:[{name:mn,action:'请核边饷',result:'奏请实支实销'}] });
      if(/后人戏说|houren_xishuo|场景叙事/.test(u)) return JSON.stringify({ houren_xishuo:'九月初七，天未明，乾清宫的灯还亮着。帝搁下户部奏本，揉眼低语三十万两。少顷忽道：传谕，起'+mn+'。夜里召对，问辽事至三更。臣叩首：辽事坏在饷，饷坏在吏。帝默然，只道：朕知道了。窗外秋风过。', zhengwen:'辽事为初政之枢，起边帅意在边防，查辽饷意在吏治。', new_activities:[] });
      if(/大纲|outline|beats|脉络/.test(u)) return JSON.stringify({ outline:['起'+mn,'查辽饷','边备'], beats:['起'+mn+'授蓟辽督师','彻查辽饷亏空三十万','早朝问对辽事'], tone:'锐意暗涌' });
      return JSON.stringify({ summary:'本回合以辽饷与边备为主线。', ok:true });
    }
    // 主 sc 子调用 + followup 都走 _aiFetchWithRetry → 返回 OpenAI shape
    _aiFetchWithRetry = async function(url, body, signal, opts){ var u=userOf(body); rec('sc','fetch', (u.slice(0,18))); return { choices:[{ message:{ content: brain(u) } }], usage:{ prompt_tokens:1, completion_tokens:1, total_tokens:2 } }; };
    // callAIMessages:agent 深化工具 + 部分 sc → 直接返回文本(计数·不再下钻 fetch)
    callAIMessages = async function(messages, maxTok, signal, tier, opts){ var u=(messages&&messages[messages.length-1]&&messages[messages.length-1].content)||''; rec('callAIMessages','msg', u.slice(0,18)); return brainDeepen(u, mn); };
  `, sandbox, { timeout: 10000 });
}

// agent 模式:开关 + 循环脑 + 深化脑
function installAgent(sandbox) {
  vm.runInContext(`
    P.conf=P.conf||{}; P.conf.agentModeEnabled=true; P.conf.agentModeDepthGate=true;
    var mn=window.__flow.minister||'袁崇焕';
    window.__agentRounds=[
      {toolCalls:[{name:'get_overview',input:{}},{name:'list_entities',input:{kind:'chars'}}],text:'察看'},
      {toolCalls:[{name:'appoint_official',input:{name:mn,position:'蓟辽督师',reason:'起复经略辽东'}},{name:'push_field',input:{path:'evtLog',value:{turn:GM.turn,text:'户部清查辽饷，亏空逾三十万两'},reason:'辽饷弊'}}],text:'落地'},
      {toolCalls:[{name:'deepen_factions',input:{}},{name:'deepen_economy',input:{}},{name:'deepen_military',input:{}},{name:'recall_consolidate',input:{}}],text:'深析'},
      {toolCalls:[{name:'deepen_narrative',input:{}},{name:'deepen_npcs',input:{focus:[mn]}},{name:'deepen_letters',input:{focus:[mn]}}],text:'叙事'},
      {toolCalls:[{name:'finalize_turn',input:{narrative:'帝锐意辽事，起'+mn+'，查辽饷弊。',summary:'起'+mn+'·查辽饷'}}],text:'收尾'}
    ];
    window.__agentIdx=0;
    callAIWithTools = async function(transcript, tools){ var r=window.__agentRounds[window.__agentIdx]||{toolCalls:[],text:''}; window.__flow.agentRounds.push({round:window.__agentIdx+1,tools:(tools||[]).length,calls:(r.toolCalls||[]).map(function(c){return c.name;})}); window.__flow.aiTrace.push({kind:'callAIWithTools',marker:'r'+(window.__agentIdx+1),contentKey:''}); window.__agentIdx++; return r; };
  `, sandbox, { timeout: 10000 });
}

// brainDeepen 需在 installTransport 前定义(被 callAIMessages 引用)·注入到 sandbox 全局
function installDeepenBrain(sandbox) {
  vm.runInContext(`
    brainDeepen = function(u, mn){
      mn = mn || '袁崇焕';
      if(/脉络/.test(u)) return JSON.stringify({ beats:['起'+mn+'授蓟辽督师','彻查辽饷亏空三十万','早朝问对辽事','阉党侧目'], tone:'锐意暗涌' });
      if(/撰写《后人戏说》/.test(u)) return JSON.stringify({ houren_xishuo:'九月初七，天未明，乾清宫的灯还亮着。帝搁下户部奏本，揉眼低语三十万两。少顷忽道：传谕，起'+mn+'。夜里召对至三更。臣叩首：辽事坏在饷，饷坏在吏。帝默然：朕知道了。窗外秋风过。', new_activities:[] });
      if(/据此产出完整史记/.test(u)) return JSON.stringify({ shizhengji:'【朝政】陛下颁谕二道：彻查辽饷、起'+mn+'授蓟辽督师。\\n【吏治】户部清查得亏空逾三十万两，多为胥吏截留。\\n【边防】'+mn+'受命，关宁暂得主心骨。', shilu:'九月，上诏户部核辽饷。是月，起'+mn+'为蓟辽督师。上夜对边臣至三更。户部奏亏三十余万。', zhengwen:'辽事为初政之枢，触积弊，朝局暗流渐起。', playerStatus:'新帝威权初立，锐意辽事。', playerInner:'三十万两亏空像一根刺，杀与不杀都是风波。', suggestions:['速定阁臣','辽饷设专员','安抚关宁'], title:'锐意起边帅，彻查蠹辽饷', summary:'起'+mn+'、查辽饷' });
      if(/toward_player/.test(u)) return JSON.stringify({ factions:[{name:'后金',intent:'趁明内顾扰边',move:'联蒙古',toward_player:'敌对·伺机',stance_delta:-3}], undercurrents:[{faction:'阉党',type:'离心',description:'察君上锐意暗结自保',impact:'掣肘新政'}], schemes:[{schemer:'阉党',target:'东林',plan:'构陷',progress:'酝酿'}] });
      if(/fiscal_pressure/.test(u)) return JSON.stringify({ assessment:'太仓亏空·辽饷压顶·三十万缺口', risks:['辽饷无着','清查激变'], trends:['赤字扩大'], fiscal_pressure:'9·辽饷压顶' });
      if(/war_risk/.test(u)) return JSON.stringify({ assessment:'辽东糜烂·关宁独支·后金压境', threats:['后金','蒙古'], recommendations:['足饷','固关宁'], war_risk:'8·后金压境' });
      if(/causal_edges/.test(u)) return JSON.stringify({ memory:'起'+mn+'授蓟辽督师、查辽饷得亏空三十万、早朝问对。', state_board:{mood:'锐意辽事·阉党戒心',recent_summary:'起边帅查辽饷触积弊',open_loops:['辽饷专员未设','阉党未除'],unfulfilled_promises:['五年复辽']}, plot_updates:[{title:'辽东复局',threadType:'military',update:mn+'受命',status:'active',newThread:true}], foreshadow:['辽饷专员成党争焦点','五年复辽伏变数'], causal_edges:[{from:'彻查辽饷',to:'胥吏截留事发',type:'triggered',strength:0.9,explanation:'清查揭三十万'},{from:'起'+mn,to:'关宁军心稳',type:'enabled',strength:0.7,explanation:'边帅有主'}] });
      if(/letterType/.test(u)) return JSON.stringify({ letters:[{from:mn,to:'玩家',letterType:'plea',urgency:'urgent',content:'臣受命经略，然辽饷未充、关宁缺额，乞陛下速发内帑应急。'}] });
      if(/stress_delta/.test(u)) return JSON.stringify({ npcs:[{name:mn,mood:'忧饷',stress_delta:12,inner:'君恩深重然辽事如焚，五年之诺恐难践',hidden_intent:'先稳关宁再图复辽'}] });
      if(/currentView/.test(u)) return JSON.stringify({ npcs:[{name:mn,currentView:'君上可辅然操之过急恐生变',recognition:'已察阉党暗动'}] });
      if(/world_snapshot/.test(u)) return JSON.stringify({ world_snapshot:'崇祯初政，诛阉在即，辽事危殆', next_turn_seeds:'辽饷党争、阉党或先发、'+mn+'请饷', tension_level:'8·内忧外患' });
      return JSON.stringify({});
    };
  `, sandbox, { timeout: 10000 });
}

function snapshotContent(sandbox) {
  return JSON.parse(vm.runInContext(`JSON.stringify((function(){
    var sh=(GM.shijiHistory&&GM.shijiHistory.length)?GM.shijiHistory[GM.shijiHistory.length-1]:{};
    return { shilu:String(sh.shilu||sh.shiluText||'').slice(0,70), shizhengji:String(sh.shizhengji||'').slice(0,70), zhengwen:String(sh.zhengwen||'').slice(0,50), houren:String(sh.houren||sh.hourenXishuo||'').slice(0,70), title:String(sh.szjTitle||sh.title||''), hourenLen:String(sh.houren||sh.hourenXishuo||'').length };
  })())`, sandbox, { timeout: 10000 }));
}

async function runMode(label) {
  const sandbox = loadGame();
  vm.runInContext(`_pendingUseMap=true; _pendingMapModeSid='${SID}'; _pendingMapModeAt=Date.now(); doActualStart('${SID}');`, sandbox, { timeout: 15000 });
  await delay(180);
  if (!(sandbox.GM && sandbox.GM.running)) throw new Error(label + ': not running');
  installInputNodes(sandbox); simulateOps(sandbox);
  installDeepenBrain(sandbox); installTransport(sandbox);
  if (label === 'B') installAgent(sandbox);
  const startTurn = sandbox.GM.turn;
  vm.runInContext(`endTurn();`, sandbox, { timeout: 30000 });
  try { vm.runInContext(`_postTurnCourtChoose(true);`, sandbox, { timeout: 10000 }); } catch (e) {}
  try { await waitFor('payload', () => { const p = sandbox.GM && sandbox.GM._pendingShijiModal; return p && p.aiReady && p.payload; }, 15000); } catch (e) {}
  try { await vm.runInContext(`_onPostTurnCourtEnd();`, sandbox, { timeout: 20000 }); } catch (e) {}
  await delay(150);
  const flow = sandbox.__flow;
  const trace = flow.aiTrace;
  const byKind = {};
  trace.forEach(function (t) { byKind[t.kind] = (byKind[t.kind] || 0) + 1; });
  return { label, startTurn, endTurn: sandbox.GM.turn, total: trace.length, byKind, trace, agentRounds: flow.agentRounds, content: snapshotContent(sandbox), errors: flow.errors.slice(-4) };
}

function main() {
  return runMode('A').then(function (A) {
    return runMode('B').then(function (B) {
      console.log('\n══════ 两种模式·真实调用次数 + 生成内容(真实天启剧本·真 pipeline)══════\n');
      console.log('【模式 A · LLM 管线】turn ' + A.startTurn + '→' + A.endTurn + ' · AI 调用总计 ' + A.total + ' 次');
      console.log('  分类:' + JSON.stringify(A.byKind));
      console.log('  逐次(sc 主调 + followup·按 prompt 首字识别):');
      A.trace.forEach(function (t, i) { console.log('    ' + (i + 1) + '. [' + t.kind + '] ' + (t.marker || '') + (t.contentKey ? ' « ' + t.contentKey + '…»' : '')); });
      console.log('\n【模式 B · Agent】turn ' + B.startTurn + '→' + B.endTurn + ' · AI 调用总计 ' + B.total + ' 次');
      console.log('  分类:' + JSON.stringify(B.byKind) + '  (callAIWithTools=agent 循环轮·callAIMessages=深化工具)');
      B.agentRounds.forEach(function (r) { console.log('    循环轮' + r.round + '(挂' + r.tools + '工具):[' + r.calls.join(',') + ']'); });
      var dt = B.trace.filter(function (t) { return t.kind === 'callAIMessages'; });
      console.log('  深化工具 callAIMessages ' + dt.length + ' 次:' + dt.map(function (t) { return t.contentKey; }).filter(Boolean).join(' / '));

      console.log('\n══════ 生成的具体内容(史记弹窗·两模式同一回合)══════');
      ['A', 'B'].forEach(function (lab) {
        var c = (lab === 'A' ? A : B).content;
        console.log('\n【模式 ' + lab + '】');
        console.log('  实录: ' + c.shilu + '…');
        console.log('  时政记标题: ' + c.title);
        console.log('  时政记: ' + c.shizhengji + '…');
        console.log('  政文: ' + c.zhengwen + '…');
        console.log('  后人戏说(' + c.hourenLen + '字): ' + c.houren + '…');
      });
      console.log('\n── 对比小结 ──');
      console.log('  A(LLM)≈ ' + A.total + ' 次固定 sc 子调用(每维度一调·刚性均匀);B(Agent)= ' + B.total + ' 次自适应(' + (B.byKind.callAIWithTools || 0) + ' 循环轮 + ' + (B.byKind.callAIMessages || 0) + ' 深化)');
      console.log('  ⚠ 内容由"我当 LLM"供·此测真跑完整回合流程量真实调用数·非真模型笔力。');
      if (A.errors.length) console.log('  A 残留:' + A.errors.join(' | '));
      if (B.errors.length) console.log('  B 残留:' + B.errors.join(' | '));
      console.log('');
      process.exit(0);
    });
  }).catch(function (e) { console.error('[mode-calls] FAIL ' + (e && e.message || e)); if (e && e.stack) console.error(e.stack.split('\n').slice(1, 6).join('\n')); process.exit(1); });
}
main();
