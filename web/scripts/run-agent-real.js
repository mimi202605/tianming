#!/usr/bin/env node
/* eslint-env node */
'use strict';
// run-agent-real.js — 真模型(BYOK)真跑 agent 模式一回合·测决策质量(命门 B1)
//   配置全走环境变量(key 绝不进聊天/文件/回显·输出里替成 ***):
//     TM_AI_KEY    (必)  你的 API key
//     TM_AI_URL    (必)  OpenAI 兼容 /chat/completions 端点
//     TM_AI_MODEL  (必)  主模型(agent 循环用)
//     TM_AI_SECONDARY (可) 次模型(深化工具用·默认=主模型)
//     TM_AI_PROVIDER  (可) openai(默认)/anthropic/...
//     TM_AGENT_MAXROUNDS (可) 限 agent 轮数控成本(默认 12)
//   用法:在本机 PowerShell 先 $env:TM_AI_KEY="..." 等·再 node scripts\run-agent-real.js
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.resolve(__dirname, '..'); const HEADLESS = path.join(__dirname, 'headless-smoke.js');
const SID = 'sc-tianqi7-1627';

const KEY = process.env.TM_AI_KEY || '';
const URL = process.env.TM_AI_URL || '';
const MODEL = process.env.TM_AI_MODEL || '';
const SECONDARY = process.env.TM_AI_SECONDARY || MODEL;
const PROVIDER = process.env.TM_AI_PROVIDER || 'openai';
const MAXROUNDS = parseInt(process.env.TM_AGENT_MAXROUNDS || '12', 10);

// 安全:任何输出前把 key 替成 ***（纵深防泄漏）
function sanitize(s) { s = String(s == null ? '' : s); if (KEY && KEY.length > 6) s = s.split(KEY).join('***KEY***'); return s; }
function log() { console.log.apply(console, Array.prototype.map.call(arguments, function (a) { return typeof a === 'string' ? sanitize(a) : a; })); }

if (!KEY || !URL || !MODEL) {
  console.log('\n[run-agent-real] 缺少配置·请在本机 PowerShell 先设环境变量(key 不要贴聊天里):');
  console.log('  $env:TM_AI_KEY="你的key"');
  console.log('  $env:TM_AI_URL="https://你的端点/v1/chat/completions"');
  console.log('  $env:TM_AI_MODEL="主模型名"');
  console.log('  $env:TM_AI_SECONDARY="次模型名(可选·默认=主)"');
  console.log('  然后: node scripts\\run-agent-real.js');
  console.log('  当前检测: KEY=' + (KEY ? '已设(' + KEY.length + '字符)' : '✗未设') + ' URL=' + (URL || '✗未设') + ' MODEL=' + (MODEL || '✗未设'));
  process.exit(KEY && URL && MODEL ? 0 : 2);
}

function loadHeadlessHelpers() { const s = fs.readFileSync(HEADLESS, 'utf8').replace(/^#![^\n]*\n/, '').replace(/\nmain\(\);\s*$/, '\nreturn { makeStubs, parseIndexHtmlScripts };'); return (new Function('require', 'process', '__dirname', '__filename', 'module', 'exports', s))(require, process, __dirname, HEADLESS, { exports: {} }, {}); }
const helpers = loadHeadlessHelpers();

function loadGame() {
  const flow = { warns: [], errors: [] };
  const env = helpers.makeStubs();
  env.win.console = { log: () => {}, warn: (...a) => flow.warns.push(sanitize(a.map(String).join(' '))), error: (...a) => flow.errors.push(sanitize(a.map(function (x) { return (x && x.stack) ? x.stack : String(x); }).join(' '))), info: () => {}, debug: () => {} };
  env.win.location.href = 'http://localhost/index.html'; env.win.location.search = '';
  env.win.document.body.insertAdjacentHTML = function () {}; env.win.document.head.insertAdjacentHTML = function () {}; env.win.document.documentElement.insertAdjacentHTML = function () {};
  // 真 fetch + 真 AbortController(node 原生)·让 agent 走真模型
  env.win.fetch = function (u, o) { return fetch(u, o); };
  env.win.AbortController = (typeof AbortController !== 'undefined') ? AbortController : env.win.AbortController;
  env.win.tianming = { writeTurnData() { return Promise.resolve({ ok: true }); }, autoSave() { return Promise.resolve({ ok: true }); }, saveGame() { return Promise.resolve({ ok: true }); } };
  const sandbox = vm.createContext(env.win);
  const scripts = helpers.parseIndexHtmlScripts();
  const cutoff = scripts.findIndex((src) => path.basename(src) === 'tm-test-harness.js');
  (cutoff >= 0 ? scripts.slice(0, cutoff) : scripts).forEach((src) => { try { vm.runInContext(fs.readFileSync(path.join(ROOT, src), 'utf8'), sandbox, { filename: src, timeout: 20000 }); } catch (e) {} });
  vm.runInContext('showLoading=function(){};hideLoading=function(){};toast=function(){};showTurnResult=function(){};["renderGameState","renderMemorials","renderQiju","renderJishi","renderBiannian","renderShijiList","renderRenwuList","renderMap"].forEach(function(n){window[n]=function(){};});generateMemorials=function(){if(!GM.memorials)GM.memorials=[];};var __re=typeof enterGame==="function"?enterGame:null;enterGame=function(){if(__re)return __re.apply(this,arguments);};aiDeepReadScenario=async function(){};aiPlanScenarioForInference=async function(){};aiPlanFactionMatrix=async function(){};aiPlanFirstTurnEvents=async function(){};', sandbox);
  // 注入真 AI 配置(key 经 sandbox 全局·只在内存·不写文件不回显)
  sandbox.__AI_KEY = KEY; sandbox.__AI_URL = URL; sandbox.__AI_MODEL = MODEL; sandbox.__AI_SECONDARY = SECONDARY; sandbox.__AI_PROVIDER = PROVIDER; sandbox.__MAXROUNDS = MAXROUNDS;
  vm.runInContext('P=P||{};P.ai=P.ai||{};P.ai.key=__AI_KEY;P.ai.url=__AI_URL;P.ai.model=__AI_MODEL;P.ai.provider=__AI_PROVIDER;P.ai.secondary={key:__AI_KEY,url:__AI_URL,model:__AI_SECONDARY,provider:__AI_PROVIDER};P.conf=P.conf||{};P.conf.npcAiPrecision=false;P.conf.verbosity="standard";P.conf.agentModeEnabled=true;P.conf.agentModeDepthGate=true;P.conf.agentModeMaxRounds=__MAXROUNDS;', sandbox);
  return sandbox;
}

function setupOps(sandbox) {
  vm.runInContext('(function(){var pref=["袁崇焕","孙承宗","叶向高","韩爌","杨鹤","徐光启","魏忠贤"];var m=null;for(var i=0;i<pref.length&&!m;i++)m=(GM.chars||[]).find(function(c){return c&&c.alive!==false&&c.name===pref[i];});m=m||(GM.chars||[]).filter(Boolean)[0]||{name:"廷臣"};/* 玩家操作·任免:以玩家身份起复袁崇焕为蓟辽督师(过回合前已定·agent 只推演其后果·不重做)*/if(typeof onAppointment==="function"){try{onAppointment(m.name,"蓟辽督师");}catch(e){}}if(!Array.isArray(GM.memorials))GM.memorials=[];GM.memorials.push({id:"mem1",from:m.name,title:"辽饷浮冒与边储告急",type:"财政",subtype:"题本",content:"臣闻辽饷支给多有虚冒，边储不相继，请先核实军额与仓储，再议增兵。",status:"pending",turn:GM.turn,reply:""});if(typeof _stageMemorialDecision==="function")_stageMemorialDecision(GM.memorials[GM.memorials.length-1],"annotated","着户部、兵部会核辽饷与边储，十日内具册。");if(!Array.isArray(GM._courtRecords))GM._courtRecords=[];GM._courtRecords.push({turn:GM.turn,targetTurn:GM.turn,phase:"in-turn",mode:"changchao",topic:"早朝·辽饷与边备",decisions:[{action:"approve",label:"核辽饷、修边堡",extra:"先清册，后增饷。"}],transcript:[{role:"player",speaker:"皇帝",text:"先核实辽饷，再议增兵。"},{role:"npc",speaker:m.name,text:"边储若虚，清册不可缓。"}],_v3:true});if(!Array.isArray(GM.letters))GM.letters=[];GM.letters.push({id:"l1",from:"皇帝",to:m.name,content:"卿可密访辽饷实额，勿使浮冒者预闻。",sentTurn:GM.turn,deliveryTurn:GM.turn+1,status:"traveling",urgency:"urgent",letterType:"personal"});if(!Array.isArray(GM.evtLog))GM.evtLog=[];GM.evtLog.push({turn:GM.turn,type:"玩家操作",text:"早朝议辽饷，御笔下诏核饷修边，朱批一奏疏。"});window.__minister=m.name;})();', sandbox);
}

(async function () {
  log('\n══════ 真模型真跑 agent 模式一回合(命门 B1·决策质量验)══════');
  log('模型: 主=' + MODEL + ' · 次=' + SECONDARY + ' · provider=' + PROVIDER + ' · 端点=' + URL.replace(/\/\/[^/]+/, '//***'));
  log('剧本: ' + SID + ' · 字数档: standard · maxRounds: ' + MAXROUNDS);
  log('(key 已从环境变量读入·不回显·输出已做 *** 脱敏)\n开始…\n');

  const sandbox = loadGame();
  vm.runInContext('_pendingUseMap=true;_pendingMapModeSid="' + SID + '";_pendingMapModeAt=Date.now();doActualStart("' + SID + '");', sandbox, { timeout: 20000 });
  await new Promise(function (r) { setTimeout(r, 200); });
  if (!(sandbox.GM && sandbox.GM.running)) { log('✗ doActualStart 失败'); process.exit(1); }
  log('剧本载入: chars=' + sandbox.GM.chars.length + ' facs=' + sandbox.GM.facs.length + ' 当前回合=' + sandbox.GM.turn);
  setupOps(sandbox);
  log('玩家操作已配(我扮演玩家·过回合前做掉): 任免(起复袁崇焕→蓟辽督师)+诏书×2+奏疏批复+朝会问对+鸿雁 · agent 只推演这些操作的后果 · 辅臣=' + sanitize(sandbox.__minister || ''));
  log('agentModeOn=' + vm.runInContext('typeof agentModeOn==="function"&&agentModeOn()', sandbox));
  // 诊断包裹:抓每轮模型返回的 tool 名 + 文本头 + fallback(定位为何空转)
  vm.runInContext('window.__trace=[];var _oCWT=callAIWithTools;callAIWithTools=async function(p,t,o){var r;try{r=await _oCWT(p,t,o);}catch(e){window.__trace.push({k:"cwt",err:String(e&&e.message||e)});throw e;}window.__trace.push({k:"cwt",tools:(t||[]).length,calls:(r&&r.toolCalls||[]).map(function(c){return c.name;}),textLen:(r&&r.text||"").length,textHead:(r&&r.text||"").slice(0,200),fb:!!(r&&r.fallback)});return r;};var _oCAM=callAIMessages;callAIMessages=async function(){var r;try{r=await _oCAM.apply(this,arguments);}catch(e){window.__trace.push({k:"cam",err:String(e&&e.message||e)});throw e;}window.__trace.push({k:"cam",textLen:(typeof r==="string"?r.length:0),head:(typeof r==="string"?r.slice(0,120):"")});return r;};', sandbox);

  const t0 = Date.now();
  log('\n⟨真模型 agent 推演中·会发真请求·请稍候(可能数分钟)⟩…\n');
  let res;
  try {
    res = await vm.runInContext('(function(){return TM.Endturn.AgentMode.run({GM:GM,input:{edicts:["彻查辽饷亏空·户部三日内呈实数·严禁层层冒支","命新任蓟辽督师袁崇焕经略辽东·整饬关宁军备·优先补足火器粮草"],xinglu:"夜召辅臣于文华殿问辽事，三更乃罢"}});})()', sandbox, { timeout: 600000 });
    res = await Promise.resolve(res);
  } catch (e) { log('✗ AgentMode.run 抛错: ' + sanitize(e && (e.stack || e.message) || e)); }
  const dt = Math.round((Date.now() - t0) / 1000);

  const out = JSON.parse(vm.runInContext('JSON.stringify((function(){var meta=GM._agentTurnMeta||{};var ch=GM._agentChronicle||{};var tc=GM.turnChanges||{};var disp=GM._aiDispatchStats||{};return {ok:(window.__lastRes&&window.__lastRes.ok),meta:{rounds:meta.rounds,writeOk:meta.writeOk,finalized:meta.finalized,depthTools:Object.keys(meta.depthTools||{}),spineGaps:meta.spineGaps,depthOk:meta.depthOk,scaffolded:!!meta.scaffolded,scaffoldActions:meta.scaffoldActions||0,autoClosed:!!meta.autoClosed},chronicle:{shiluLen:String(ch.shiluText||"").length,shizhengjiLen:String(ch.shizhengji||"").length,zhengwenLen:String(ch.zhengwen||"").length,hourenLen:String(ch.hourenXishuo||"").length,szjTitle:ch.szjTitle,szjSummary:ch.szjSummary,suggestions:ch.suggestions,playerStatus:ch.playerStatus,playerInner:ch.playerInner},full:{shilu:ch.shiluText,shizhengji:ch.shizhengji,zhengwen:ch.zhengwen,houren:ch.hourenXishuo},turnChanges:{chars:(tc.characters||[]).length,facs:(tc.factions||[]).length,vars:(tc.variables||[]).length},causalEdges:(GM._causalGraph&&GM._causalGraph.edges||[]).length,stateBoard:GM._stateBoard&&GM._stateBoard.mood,factionUndercurrents:(GM._factionUndercurrents||[]).length,letters:(GM.letters||[]).length,tokens:disp.totalTokens||0,calls:disp.successCount||0};})())', sandbox));

  log('══════ 结果(耗时 ' + dt + 's)══════');
  log('ok/fallback: ' + (res ? (res.ok + '/' + res.fallback + (res.reason ? ' · ' + sanitize(res.reason) : '')) : '(run 未返回)'));
  log('agent 机制: 轮' + out.meta.rounds + ' · 落地' + out.meta.writeOk + ' · 脚手架' + out.meta.scaffolded + '(' + out.meta.scaffoldActions + '动作) · 自动收尾' + out.meta.autoClosed + ' · 收尾' + out.meta.finalized + ' · 深度达标' + out.meta.depthOk + ' · 深化工具[' + (out.meta.depthTools || []).join(',') + '] · 脊柱缺口[' + (out.meta.spineGaps || []).join('、') + ']');
  log('成本: 真模型调用 ' + out.calls + ' 次 · 累计 tokens ≈ ' + out.tokens);
  try {
    var trace = JSON.parse(vm.runInContext('JSON.stringify(window.__trace||[])', sandbox));
    log('\n────── 每轮 trace(模型返回 tool 名 / 文本头·定位空转)──────');
    trace.forEach(function (e, i) {
      if (e.k === 'cwt') log('  cwt#' + (i + 1) + ' [挂' + (e.tools || 0) + '工具] ' + (e.err ? ('✗err:' + sanitize(e.err)) : ('toolCalls=[' + (e.calls || []).join(',') + ']' + (e.fb ? '(fallback)' : '') + ' textLen=' + e.textLen + (e.textHead ? ' 文本头:「' + sanitize(e.textHead) + '」' : ''))));
      else log('    深化 ' + (e.err ? ('✗err:' + sanitize(e.err)) : ('len=' + e.textLen + (e.head ? ' 「' + sanitize(e.head) + '」' : ''))));
    });
  } catch (te) { log('(trace 读取失败:' + sanitize(te.message) + ')'); }
  log('字数(标准档 实录200-400/时政记600-1200/后人戏说2500-6000): 实录' + out.chronicle.shiluLen + ' 时政记' + out.chronicle.shizhengjiLen + ' 政文' + out.chronicle.zhengwenLen + ' 后人戏说' + out.chronicle.hourenLen);
  log('活态层: turnChanges 人物' + out.turnChanges.chars + '/势力' + out.turnChanges.facs + '/变量' + out.turnChanges.vars + ' · 因果' + out.causalEdges + ' · 状态盘[' + sanitize(out.stateBoard || '') + '] · 势力暗流' + out.factionUndercurrents + ' · 书信' + out.letters);
  log('\n────── 生成内容(真模型·供质量判断)──────');
  log('【时政记标题】' + sanitize(out.chronicle.szjTitle || ''));
  log('【实录】\n' + sanitize(out.full.shilu || '(空)'));
  log('\n【时政记】\n' + sanitize(out.full.shizhengji || '(空)'));
  log('\n【政文】\n' + sanitize(out.full.zhengwen || '(空)'));
  log('\n【后人戏说】\n' + sanitize(out.full.houren || '(空)'));
  log('\n【君上状态】' + sanitize(out.chronicle.playerStatus || ''));
  log('【主角内心】' + sanitize(out.chronicle.playerInner || ''));
  log('【宰辅进言】' + sanitize(JSON.stringify(out.chronicle.suggestions || [])));
  const errs = sandbox.__flow ? [] : []; const flowErrs = vm.runInContext('JSON.stringify((window.__flow&&window.__flow.errors)||[])', sandbox);
  try { const fe = JSON.parse(flowErrs); if (fe.length) { log('\n────── 残留报错(已脱敏·去音频噪声)──────'); fe.filter(function (e) { return !/Audio|AudioContext|背景音乐|音效/.test(e); }).slice(0, 8).forEach(function (e) { log('  ' + sanitize(e).split('\n')[0]); }); } } catch (e) {}
  log('\n══════ 完 ══════\n');
  process.exit(0);
})().catch(function (e) { console.error('[run-agent-real] FAIL ' + sanitize(e && (e.message) || e)); process.exit(1); });
