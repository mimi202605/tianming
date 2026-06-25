#!/usr/bin/env node
/* eslint-env node */
'use strict';
// run-agent-real-fullplay.js — 真模型(BYOK)多回合·**每回合完整玩家操作**·详细统计(token 接 TokenUsageTracker)
//   每回合:~千字诏书(涉各部分) + 常朝问对 + 批奏折×2 + 鸿雁×2 + 任命4人(轮换·中央/地方混) + 迁移。
//   四元认知特性全开。统计:每回合真模型调用次数 / token(prompt+completion) / 估算成本 / 输出指令(tool calls) / 任命迁移是否正确落地(原态→过回合后·验官衔修复) / 驱动 UI 的 aiResult。
//   key 全走环境变量·绝不进聊天/文件/回显(输出替 ***)。
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.resolve(__dirname, '..'); const HEADLESS = path.join(__dirname, 'headless-smoke.js');
const SID = 'sc-tianqi7-1627';
const KEY = process.env.TM_AI_KEY || ''; const URL = process.env.TM_AI_URL || ''; const MODEL = process.env.TM_AI_MODEL || '';
const SECONDARY = process.env.TM_AI_SECONDARY || MODEL; const PROVIDER = process.env.TM_AI_PROVIDER || 'openai';
const MAXROUNDS = parseInt(process.env.TM_AGENT_MAXROUNDS || '6', 10);
const TURNS = parseInt(process.env.TM_TURNS || '3', 10);
function sanitize(s) { s = String(s == null ? '' : s); if (KEY && KEY.length > 6) s = s.split(KEY).join('***KEY***'); return s; }
function log() { console.log.apply(console, Array.prototype.map.call(arguments, function (a) { return typeof a === 'string' ? sanitize(a) : a; })); }
if (!KEY || !URL || !MODEL) { console.log('[fullplay] 缺配置·先设 $env:TM_AI_KEY/URL/MODEL(从 User 注册表读)。KEY=' + (KEY ? '✓' : '✗') + ' URL=' + (URL ? '✓' : '✗') + ' MODEL=' + (MODEL || '✗')); process.exit(2); }

function loadHeadlessHelpers() { const s = fs.readFileSync(HEADLESS, 'utf8').replace(/^#![^\n]*\n/, '').replace(/\nmain\(\);\s*$/, '\nreturn { makeStubs, parseIndexHtmlScripts };'); return (new Function('require', 'process', '__dirname', '__filename', 'module', 'exports', s))(require, process, __dirname, HEADLESS, { exports: {} }, {}); }
const helpers = loadHeadlessHelpers();

function loadGame() {
  const env = helpers.makeStubs();
  env.win.console = { log: () => {}, warn: () => {}, error: () => {}, info: () => {}, debug: () => {} };
  env.win.location.href = 'http://localhost/index.html'; env.win.location.search = '';
  env.win.document.body.insertAdjacentHTML = function () {}; env.win.document.head.insertAdjacentHTML = function () {}; env.win.document.documentElement.insertAdjacentHTML = function () {};
  env.win.fetch = function (u, o) { return fetch(u, o); };
  env.win.AbortController = (typeof AbortController !== 'undefined') ? AbortController : env.win.AbortController;
  env.win.tianming = { writeTurnData() { return Promise.resolve({ ok: true }); }, autoSave() { return Promise.resolve({ ok: true }); }, saveGame() { return Promise.resolve({ ok: true }); } };
  const sandbox = vm.createContext(env.win);
  const scripts = helpers.parseIndexHtmlScripts();
  const cutoff = scripts.findIndex((src) => path.basename(src) === 'tm-test-harness.js');
  (cutoff >= 0 ? scripts.slice(0, cutoff) : scripts).forEach((src) => { try { vm.runInContext(fs.readFileSync(path.join(ROOT, src), 'utf8'), sandbox, { filename: src, timeout: 20000 }); } catch (e) {} });
  vm.runInContext('showLoading=function(){};hideLoading=function(){};toast=function(){};showTurnResult=function(){};["renderGameState","renderMemorials","renderQiju","renderJishi","renderBiannian","renderShijiList","renderRenwuList","renderMap"].forEach(function(n){window[n]=function(){};});generateMemorials=function(){if(!GM.memorials)GM.memorials=[];};var __re=typeof enterGame==="function"?enterGame:null;enterGame=function(){if(__re)return __re.apply(this,arguments);};aiDeepReadScenario=async function(){};aiPlanScenarioForInference=async function(){};aiPlanFactionMatrix=async function(){};aiPlanFirstTurnEvents=async function(){};', sandbox);
  sandbox.__AI_KEY = KEY; sandbox.__AI_URL = URL; sandbox.__AI_MODEL = MODEL; sandbox.__AI_SECONDARY = SECONDARY; sandbox.__AI_PROVIDER = PROVIDER; sandbox.__MAXROUNDS = MAXROUNDS;
  vm.runInContext('P=P||{};P.ai=P.ai||{};P.ai.key=__AI_KEY;P.ai.url=__AI_URL;P.ai.model=__AI_MODEL;P.ai.provider=__AI_PROVIDER;P.ai.secondary={key:__AI_KEY,url:__AI_URL,model:__AI_SECONDARY,provider:__AI_PROVIDER};P.conf=P.conf||{};P.conf.npcAiPrecision=false;P.conf.verbosity="standard";P.conf.agentModeEnabled=true;P.conf.agentModeDepthGate=true;P.conf.agentModeMaxRounds=__MAXROUNDS;P.conf.agentSelfReflectEnabled=true;P.conf.agentQualityGateEnabled=true;P.conf.agentEdictOversightEnabled=true;P.conf.agentAnomalyEnabled=true;', sandbox);
  return sandbox;
}

// 每回合任命计划(轮换·中央职 moveTo=空·地方职 moveTo=任所)
const APPT_PLANS = [
  [{ cands: ['袁崇焕'], post: '蓟辽督师', moveTo: '蓟辽' }, { cands: ['孙承宗', '叶向高', '韩爌'], post: '东阁大学士', moveTo: '' }, { cands: ['卢象升', '洪承畴'], post: '宣大总督', moveTo: '宣府' }, { cands: ['孙元化', '袁可立'], post: '登莱巡抚', moveTo: '登州' }],
  [{ cands: ['洪承畴', '杨鹤'], post: '陕西三边总督', moveTo: '西安' }, { cands: ['祖大寿', '满桂'], post: '辽东总兵', moveTo: '宁远' }, { cands: ['徐光启'], post: '礼部尚书', moveTo: '' }, { cands: ['毕自严', '李标'], post: '户部尚书', moveTo: '' }],
  [{ cands: ['满桂', '赵率教'], post: '大同总兵', moveTo: '大同' }, { cands: ['赵率教', '何可纲'], post: '山海关总兵', moveTo: '山海关' }, { cands: ['毛文龙'], post: '平辽总兵官', moveTo: '皮岛' }, { cands: ['王洽', '袁可立'], post: '兵部尚书', moveTo: '' }]
];

function setupPlayerOps(sandbox, turnIdx) {
  sandbox.__plan = JSON.stringify(APPT_PLANS[Math.min(turnIdx - 1, APPT_PLANS.length - 1)]);
  return JSON.parse(vm.runInContext('JSON.stringify((function(){\n' +
    'var T=GM.turn;var plan=JSON.parse(__plan);\n' +
    'var pick=function(names){for(var i=0;i<names.length;i++){var c=(GM.chars||[]).find(function(x){return x&&x.alive!==false&&x.name===names[i];});if(c)return c;}return null;};\n' +
    'if(!Array.isArray(GM.memorials))GM.memorials=[];if(!Array.isArray(GM._courtRecords))GM._courtRecords=[];if(!Array.isArray(GM.letters))GM.letters=[];if(!Array.isArray(GM.evtLog))GM.evtLog=[];if(!Array.isArray(GM._turnMoveCommands))GM._turnMoveCommands=[];if(!GM.wenduiHistory)GM.wenduiHistory={};\n' +
    'if(!GM.__instRule){GM.__instRule=1;if(!Array.isArray(GM._playerDirectives))GM._playerDirectives=[];GM._playerDirectives.push({type:"rule",content:"人事调动即刻瞬间抵达到任",_absolute:true,turn:T});}\n' +
    'var appointed=[],moved=[],pristine=[],firstName=null;\n' +
    'plan.forEach(function(a){var c=pick(a.cands);if(!c)return;if(!firstName)firstName=c.name;pristine.push({name:c.name,loc:c.location,title:c.officialTitle});\n' +
    '  if(typeof onAppointment==="function"){try{onAppointment(c.name,a.post);appointed.push(c.name+"→"+a.post);}catch(e){}}\n' +
    '  if(a.moveTo){GM._turnMoveCommands.push({name:c.name,to:a.moveTo,reason:"赴任"+a.post,instant:false});moved.push(c.name+"→"+a.moveTo);}\n' +
    '});\n' +
    'var who=firstName||"廷臣";\n' +
    // 批奏折 ×2
    'var m1={id:"m"+T+"a",from:who,title:"辽饷边储与军额疏",type:"财政",content:"臣核辽饷有虚冒，边储不继，乞先清册再议增兵。",status:"pending",turn:T,reply:""};GM.memorials.push(m1);if(typeof _stageMemorialDecision==="function")_stageMemorialDecision(m1,"annotated","着户部兵部会核辽饷边储，十日具册。");\n' +
    'var m2={id:"m"+T+"b",from:who,title:"汰冗澄吏与边镇协防疏",type:"吏治",content:"乞考课汰冗、边镇协防、专责成。",status:"pending",turn:T,reply:""};GM.memorials.push(m2);if(typeof _stageMemorialDecision==="function")_stageMemorialDecision(m2,"approved","准考课协防，汰冗须缓行。");\n' +
    // 常朝 + 问对
    'GM._courtRecords.push({turn:T,targetTurn:T,phase:"in-turn",mode:"changchao",topic:"早朝·辽饷边备与用人(第"+T+"回)",decisions:[{action:"approve",label:"核辽饷修边备"},{action:"approve",label:"简任边帅"}],transcript:[{role:"player",speaker:"皇帝",text:"辽饷清册与边帅简任，何如？"},{role:"npc",speaker:who,text:"清册不可缓，边帅须假事权、宽文法。"}],_v3:true});\n' +
    'if(who){if(!GM.wenduiHistory[who])GM.wenduiHistory[who]=[];GM.wenduiHistory[who].push({turn:T,role:"player",content:"卿任此重寄，何以报朕？"});GM.wenduiHistory[who].push({turn:T,role:"npc",content:"臣愿竭股肱，然乞钱粮器械事权不从中制。"});}\n' +
    // 鸿雁 ×2(一致前线·一为 NPC↔NPC)
    'if(who){GM.letters.push({id:"L"+T+"a",from:"皇帝",to:who,content:"卿可密访军实，浮冒者勿使预闻，器械朕力给。",sentTurn:T,deliveryTurn:T+1,status:"traveling",urgency:"urgent",letterType:"personal"});}\n' +
    'var ally=pick(["孙承宗","叶向高","徐光启","李标"]);if(ally&&who&&ally.name!==who){GM.letters.push({id:"L"+T+"b",from:ally.name,to:who,content:"边事赖公，朝议勿萦怀，老夫于内调护粮饷。",sentTurn:T,deliveryTurn:T+1,status:"traveling",urgency:"normal",letterType:"personal"});}\n' +
    'GM.evtLog.push({turn:T,type:"玩家操作",text:"第"+T+"回:早朝议辽饷用人，御笔长诏，任命数人、迁边帅赴任，朱批二奏，密谕前线。"});\n' +
    'return {appointed:appointed,moved:moved,pristine:pristine};\n' +
    '})())', sandbox));
}

function snap(sandbox) {
  return JSON.parse(vm.runInContext('JSON.stringify((function(){var s=(typeof TokenUsageTracker!=="undefined"&&TokenUsageTracker.getStats)?TokenUsageTracker.getStats():{totalCalls:0,totalTokens:0,promptTokens:0,completionTokens:0,estimatedCostUSD:0};return {calls:s.totalCalls||0,tokens:s.totalTokens||0,prompt:s.promptTokens||0,completion:s.completionTokens||0,cost:s.estimatedCostUSD||0,turn:GM.turn};})())', sandbox));
}

(async function () {
  log('\n══════ 真模型·每回合完整玩家操作·详细统计 ══════');
  log('模型 主=' + MODEL + ' 次=' + SECONDARY + ' provider=' + PROVIDER + ' 端点=' + URL.replace(/\/\/[^/]+/, '//***') + ' · maxRounds=' + MAXROUNDS + ' · 回合数=' + TURNS);
  log('四元认知特性全开 · token 接 TokenUsageTracker · (key 已脱敏)\n');
  const sandbox = loadGame();
  vm.runInContext('_pendingUseMap=true;_pendingMapModeSid="' + SID + '";_pendingMapModeAt=Date.now();doActualStart("' + SID + '");', sandbox, { timeout: 20000 });
  await new Promise(function (r) { setTimeout(r, 250); });
  if (!(sandbox.GM && sandbox.GM.running)) { log('✗ doActualStart 失败'); process.exit(1); }
  log('剧本载入: chars=' + sandbox.GM.chars.length + ' facs=' + sandbox.GM.facs.length + ' 起始回合=' + sandbox.GM.turn + '\n');

  // 三封 ~千字诏书(各回合·涉各部分:军/财/吏/边/赈/法/言)
  sandbox.__edict1 = '奉天承运皇帝诏曰：朕嗣大统，夙夜兢业。辽事日棘，帑藏空虚，吏治因循，民生凋敝，朕甚忧之，今颁数事，著内外奉行。一、辽饷亏空积弊已久，层层冒支，军不得食。著户部兵部三日内会核辽饷实数，自万历末迄今逐年清册，凡虚冒侵渔者无论勋戚近幸一体严追，限一月具狱以闻。二、关宁军备废弛，火器粮草不继。著蓟辽督师经略辽东，整饬关宁，补足火器粮秣战马，简练士卒毋虚冒兵额；所需钱粮户部先于太仓拨给不得迟误。三、宣大蓟镇边堡颓圮，著宣大总督督修边墙墩台，料价核实工竣具图；登莱海防紧要，著登莱巡抚移镇要害严备海道。四、畿辅山东河南连岁灾荒流民载道，著有司开仓赈济，蠲免被灾州县今岁钱粮，设粥厂活饥民毋使激而为乱。五、吏治贪冗，著吏部考课澄汰不职、举劾分明毋徇情，清直敢任事者不次擢用。六、宫府用度朕当先自撙节，内帑非军国急需不轻发；在京文武俸饷从优，侵克军民者罪无赦。七、台谏风闻言事许直陈得失，毋挟私构陷空言塞责。布告中外，咸使闻知。钦此。';
  sandbox.__edictMove1 = '著宣大总督即赴宣府开府督理边备，著登莱巡抚移镇登州整饬海防，毋得逗留。';
  sandbox.__edict2 = '诏曰：辽饷清册渐有端绪，朕览之而忧喜参半。今申明数事。一、清册既出，凡侵冒有据者著三法司论罪追赃入边储，承办怠玩者并劾。二、增兵方略，著陕西三边总督统筹西陲，辽东总兵练宁远精卒，关宁锦防线次第修筑，毋得浪战亦毋得株守。三、漕运盐法久弊，著户部清理盐引、疏通漕渠，岁额核实，灶户商引之困一体疏理，以裕国用。四、蠲赈续行，被灾州县春耕在即，著发种牛农具，招抚流亡复业，胥吏借赈渔利者重惩。五、考成之法，著吏部都察院按月稽核诸司奏销与积逋，殿最分明。六、礼部纂修历法、整饬学政，造就实学之士以济时艰。七、边镇协防，著各镇互为犄角，塘报核实毋得虚张声势、讳败为胜。布告中外。钦此。';
  sandbox.__edict3 = '诏曰：边备渐张，然奴势犹炽，流寇渐起，朕思深虑远，再申数端。一、战守之策，著督师诸帅相机进取，能复一城一堡者优叙，丧师失地者重谴，毋得轻进亦毋得怯战。二、军屯民屯并举，著边镇召民垦荒、寓兵于农，岁课粮草以省转输；屯政侵欺者论如军法。三、币制钱法久滥，著户部工部鼓铸足值制钱、清厘私铸，平物价以安民生。四、流寇初起于秦晋，著抚剿兼施，能抚则散其党、当剿则歼其魁，毋使滋蔓燎原。五、督抚事权，著假诸帅以便宜，文法毋得掣肘，然岁终核其成败功罪。六、宗藩冗费日繁，著议节制禄米、限制兼并，以纾民困而存国体。七、凡有奇谋异略、敢任难事者，许诸臣荐举不次超擢。咸使闻知。钦此。';

  const perTurn = []; let prev = snap(sandbox);
  for (let t = 1; t <= TURNS; t++) {
    const resolutionTurn = sandbox.GM.turn;
    log('────── 回合 ' + t + '(turn=' + resolutionTurn + ')· 配玩家操作 ──────');
    const ops = setupPlayerOps(sandbox, t);
    log('  任命: ' + ops.appointed.map(sanitize).join(' / '));
    log('  迁移: ' + ops.moved.map(sanitize).join(' / '));
    vm.runInContext('window.__trace=[];if(!window.__wrapped){window.__wrapped=true;var _oCWT=callAIWithTools;callAIWithTools=async function(p,tt,o){var r;try{r=await _oCWT(p,tt,o);}catch(e){window.__trace.push({k:"cwt",err:1});throw e;}window.__trace.push({k:"cwt",calls:(r&&r.toolCalls||[]).map(function(c){return c.name;}),fb:!!(r&&r.fallback)});return r;};var _oCAM=callAIMessages;callAIMessages=async function(){var r;try{r=await _oCAM.apply(this,arguments);}catch(e){window.__trace.push({k:"cam",err:1});throw e;}window.__trace.push({k:"cam"});return r;};}', sandbox);
    const edictsExpr = (t === 1) ? '[__edict1, __edictMove1]' : (t === 2 ? '[__edict2]' : '[__edict3]');
    const xinglu = (t === 1) ? '夜召辅臣于文华殿问辽事三更乃罢，亲阅关宁塘报' : (t === 2 ? '御文华殿阅辽饷清册，召户部尚书面询积逋' : '召诸边帅塘报会议战守，亲定进取方略');
    log('  诏书: ~千字长诏(七事·涉军财吏边赈法言) · 行止: ' + xinglu);
    log('  ⟨真模型推演中…⟩');
    const t0 = Date.now(); let res;
    try { res = await Promise.resolve(await vm.runInContext('(function(){return TM.Endturn.AgentMode.run({GM:GM,input:{edicts:' + edictsExpr + ',xinglu:"' + xinglu + '"}});})()', sandbox, { timeout: 900000 })); }
    catch (e) { log('  ✗ run 抛错: ' + sanitize(e && (e.stack || e.message) || e)); }
    const dt = Math.round((Date.now() - t0) / 1000);
    const cur = snap(sandbox);
    const trace = JSON.parse(vm.runInContext('JSON.stringify(window.__trace||[])', sandbox));
    const cwt = trace.filter(function (e) { return e.k === 'cwt'; }); const cam = trace.filter(function (e) { return e.k === 'cam'; });
    const toolCounts = {}; cwt.forEach(function (e) { (e.calls || []).forEach(function (n) { toolCounts[n] = (toolCounts[n] || 0) + 1; }); });
    const after = JSON.parse(vm.runInContext('JSON.stringify((function(){var names=' + JSON.stringify((ops.pristine || []).map(function (w) { return w.name; })) + ';return names.map(function(n){var c=(GM.chars||[]).find(function(x){return x&&x.name===n;})||{};return {name:n,loc:c.location,travelTo:c._travelTo,title:c.officialTitle};});})())', sandbox));
    const meta = JSON.parse(vm.runInContext('JSON.stringify((function(){var m=GM._agentTurnMeta||{};var ch=GM._agentChronicle||{};var tc=GM.turnChanges||{};return {rounds:m.rounds,writeOk:m.writeOk,writeAttempts:m.writeAttempts,finalized:m.finalized,autoClosed:!!m.autoClosed,scaffolded:!!m.scaffolded,depthTools:Object.keys(m.depthTools||{}).length,deepenSkipped:(m.deepenSkipped||[]).length,spineGaps:m.spineGaps||[],szjTitle:ch.szjTitle,shiluLen:String(ch.shiluText||"").length,szjLen:String(ch.shizhengji||"").length,zwLen:String(ch.zhengwen||"").length,hourenLen:String(ch.hourenXishuo||"").length,personnel:(ch.personnelChanges||[]).length,tcChars:(tc.characters||[]).length,tcVars:(tc.variables||[]).length,turnReportN:(GM._turnReport||[]).length};})())', sandbox));
    const cog = JSON.parse(vm.runInContext('JSON.stringify((function(){var bp=GM._aiBiasProfile||{};var qr=GM._agentQualityReport||{};var er=GM._edictEfficacyReport||{};var an=GM._agentAnomaly||{};return {biases:(bp.biases||[]).map(function(b){return b.domain+":"+b.direction;}),quality:{pass:qr.pass,issues:(qr.issues||[]).length,repaired:!!qr.repaired},edict:{total:er.total,overall:er.overallEfficacy,skipped:!!er.skipped},anomaly:{unusual:!!an.unusual,aspect:an.aspect||""}};})())', sandbox));
    perTurn.push({ t: t, dt: dt, ok: res && res.ok, fallback: res && res.fallback, reason: res && res.reason, callsDelta: cur.calls - prev.calls, tokDelta: cur.tokens - prev.tokens, promptDelta: cur.prompt - prev.prompt, compDelta: cur.completion - prev.completion, costDelta: Math.round((cur.cost - prev.cost) * 1000) / 1000, cwt: cwt.length, cam: cam.length, toolCounts: toolCounts, meta: meta, cog: cog, pristine: ops.pristine, after: after });
    prev = cur;
    log('  ✓ ' + dt + 's ok=' + (res ? res.ok : '?') + ' fallback=' + (res ? res.fallback : '?') + ' · 调用≈' + perTurn[perTurn.length - 1].callsDelta + ' token≈' + perTurn[perTurn.length - 1].tokDelta);
  }

  log('\n══════════════ 汇总 ══════════════');
  let totCalls = 0, totTok = 0, totCost = 0;
  perTurn.forEach(function (p) {
    totCalls += p.callsDelta; totTok += p.tokDelta; totCost += p.costDelta;
    log('\n【回合 ' + p.t + '】(' + p.dt + 's) ok=' + p.ok + ' fallback=' + p.fallback + (p.reason ? ' · ' + sanitize(p.reason) : ''));
    log('  ◆调用次数: 真模型 ' + p.callsDelta + ' 次(API)· trace: loop ' + p.cwt + ' 轮 + 深化/元认知 ' + p.cam + ' 次');
    log('  ◆token: 总 ' + p.tokDelta + '(入 ' + p.promptDelta + '/出 ' + p.compDelta + ') · 估算成本 ≈ $' + p.costDelta);
    log('  ◆输出指令(tool calls): ' + (Object.keys(p.toolCounts).length ? Object.keys(p.toolCounts).map(function (k) { return k + '×' + p.toolCounts[k]; }).join(' / ') : '(loop 未产 tool·走脚手架)'));
    log('  agent: 轮' + p.meta.rounds + ' 落地' + p.meta.writeOk + '/' + p.meta.writeAttempts + ' 脚手架' + p.meta.scaffolded + ' 自动收尾' + p.meta.autoClosed + ' · 深化' + p.meta.depthTools + '跑/' + p.meta.deepenSkipped + '跳 脊柱缺口[' + (p.meta.spineGaps || []).join('、') + ']');
    log('  落地: turnReport ' + p.meta.turnReportN + ' 条 · turnChanges 人物' + p.meta.tcChars + '/变量' + p.meta.tcVars + ' · 人事' + p.meta.personnel);
    log('  史记(UI): 「' + sanitize(p.meta.szjTitle || '') + '」 实录' + p.meta.shiluLen + ' 时政记' + p.meta.szjLen + ' 政文' + p.meta.zwLen + ' 后人戏说' + p.meta.hourenLen + ' 字');
    log('  ◆元认知: 自省[' + (p.cog.biases || []).map(sanitize).join(',') + '] 质量闸pass=' + p.cog.quality.pass + '/问题' + p.cog.quality.issues + '/修补' + p.cog.quality.repaired + ' 诏令督查总' + p.cog.edict.total + (p.cog.edict.skipped ? '(无活诏跳)' : ('/效力' + p.cog.edict.overall)) + ' 冷门' + (p.cog.anomaly.unusual ? ('「' + sanitize(p.cog.anomaly.aspect) + '」') : '未触发'));
    log('  ★任命/迁移落地(原态→过回合后·验官衔修复):');
    p.after.forEach(function (a) {
      var b = (p.pristine || []).find(function (w) { return w.name === a.name; }) || {};
      log('    ' + sanitize(a.name) + ': 衔「' + sanitize(b.title || '') + '」→「' + sanitize(a.title || '') + '」 所在「' + sanitize(b.loc || '') + '」→「' + sanitize(a.loc || '') + '」' + (a.travelTo ? (' 在途→' + sanitize(a.travelTo)) : ''));
    });
  });
  log('\n────── 总计 ' + TURNS + ' 回合 ──────');
  log('  真模型调用 ' + totCalls + ' 次 · token ' + totTok + ' · 估算成本 ≈ $' + (Math.round(totCost * 1000) / 1000) + ' · 平均 ' + Math.round(totCalls / TURNS) + ' 次 & ' + Math.round(totTok / TURNS) + ' token / 回合');
  log('\n══════ 完 ══════\n');
  process.exit(0);
})().catch(function (e) { console.error('[fullplay] FAIL ' + sanitize(e && (e.stack || e.message) || e)); process.exit(1); });
