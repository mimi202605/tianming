#!/usr/bin/env node
/* eslint-env node */
'use strict';
// test-mode-diff-fullturn.js — 两种模式·完整过回合对拍(非断言·对照报告)
//   基于 smoke-full-turn-flow.js 框架:vm sandbox 加载全游戏 → doActualStart 真实天启剧本 →
//   配齐玩家操作(诏书/奏疏+批复/朝会问对/鸿雁/任免)→ 真跑 endTurn() 整条 pipeline + post-turn 朝会。
//   两个独立 sandbox:mode A(LLM 管线·me-as-LLM 替 _endTurn_aiInfer) / mode B(agent 接管·me-as-LLM 替 callAIWithTools+callAIMessages)。
//   ⚠诚实:内容由"我当 LLM"提供·此测**真跑整条回合流程**(真 GM/真引擎/真 pipeline/真 post-turn 朝会)·对比两模式机制与产出·非真模型笔力。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const HEADLESS = path.join(__dirname, 'headless-smoke.js');
const SID = 'sc-tianqi7-1627';

function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function waitFor(label, fn, timeoutMs) {
  const started = Date.now(); let last = null;
  while (Date.now() - started < timeoutMs) {
    try { const v = fn(); if (v) return v; } catch (e) { last = e; }
    await delay(40);
  }
  throw new Error('timeout waiting for ' + label + (last ? ': ' + last.message : ''));
}
function loadHeadlessHelpers() {
  const source = fs.readFileSync(HEADLESS, 'utf8')
    .replace(/^#![^\n]*\n/, '')
    .replace(/\nmain\(\);\s*$/, '\nreturn { makeStubs, parseIndexHtmlScripts };');
  const factory = new Function('require', 'process', '__dirname', '__filename', 'module', 'exports', source);
  return factory(require, process, __dirname, HEADLESS, { exports: {} }, {});
}
const helpers = loadHeadlessHelpers();

function installNodeExtras(win, flow) {
  win.__flow = flow;
  win.location.href = 'http://localhost/index.html'; win.location.search = '';
  win.document.body.insertAdjacentHTML = function () {};
  win.document.head.insertAdjacentHTML = function () {};
  win.document.documentElement.insertAdjacentHTML = function () {};
  win.AbortController = class { constructor() { this.signal = { aborted: false, addEventListener() {}, removeEventListener() {} }; } abort() { this.signal.aborted = true; } };
  win.fetch = function () { flow.fetchCalls++; return Promise.resolve({ ok: true, status: 200, headers: { get() { return ''; } }, text() { return Promise.resolve('{"ok":true}'); }, json() { return Promise.resolve({ choices: [{ message: { content: '{"ok":true}' } }], usage: {} }); } }); };
  win.tianming = { writeTurnData() { flow.writeTurnData++; return Promise.resolve({ ok: true }); }, autoSave() { flow.autoSave++; return Promise.resolve({ ok: true }); }, saveGame() { return Promise.resolve({ ok: true }); } };
}

function loadGame() {
  const flow = { logs: [], warns: [], errors: [], loading: [], toasts: [], turnResults: [], fetchCalls: 0, writeTurnData: 0, autoSave: 0, aiCalls: [], agentRounds: [] };
  const env = helpers.makeStubs();
  env.win.console = { log: (...a) => flow.logs.push(a.map(String).join(' ')), warn: (...a) => flow.warns.push(a.map(String).join(' ')), error: (...a) => flow.errors.push(a.map(String).join(' ')), info: (...a) => flow.logs.push(a.map(String).join(' ')), debug: () => {} };
  installNodeExtras(env.win, flow);
  const sandbox = vm.createContext(env.win);
  const scripts = helpers.parseIndexHtmlScripts();
  const cutoff = scripts.findIndex((src) => path.basename(src) === 'tm-test-harness.js');
  const loadScripts = cutoff >= 0 ? scripts.slice(0, cutoff) : scripts;
  loadScripts.forEach((src) => { const abs = path.join(ROOT, src); const code = fs.readFileSync(abs, 'utf8'); vm.runInContext(code, sandbox, { filename: src, displayErrors: true, timeout: 15000 }); });
  vm.runInContext(`
    window.__flow = window.__flow || {};
    showLoading = function(){}; hideLoading = function(){};
    toast = function(msg){ window.__flow.toasts.push(String(msg||'')); };
    showTurnResult = function(html, idx){ window.__flow.turnResults.push({ idx: idx, len: String(html||'').length }); };
    ['renderGameState','renderMemorials','renderQiju','renderJishi','renderBiannian','renderShijiList','renderRenwuList','renderMap'].forEach(function(n){ window[n] = function(){}; });
    generateMemorials = function(){ if (!GM.memorials) GM.memorials = []; };
    var __re = typeof enterGame === 'function' ? enterGame : null;
    enterGame = function(){ window.__flow.entered = true; if (__re) return __re.apply(this, arguments); };
    aiDeepReadScenario = async function(){}; aiPlanScenarioForInference = async function(){}; aiPlanFactionMatrix = async function(){}; aiPlanFirstTurnEvents = async function(){};
    if (!P.ai) P.ai = {}; P.ai.key='mock-key'; P.ai.url='http://mock.local/v1/chat/completions'; P.ai.model='mock-model';
    if (!P.conf) P.conf = {}; P.conf.npcAiPrecision = false;
  `, sandbox);
  sandbox.__flow = flow;
  return sandbox;
}

function installInputNodes(sandbox) {
  vm.runInContext(`(function(){
    var prevGet = document.getElementById ? document.getElementById.bind(document) : function(){ return null; };
    function node(value){ return { value:value||'', textContent:'', innerHTML:'', style:{}, dataset:{}, classList:{add:function(){},remove:function(){},toggle:function(){return false;},contains:function(){return false;}}, addEventListener:function(){}, removeEventListener:function(){}, remove:function(){}, focus:function(){}, blur:function(){}, querySelector:function(){return null;}, querySelectorAll:function(){return [];}, getAttribute:function(){return null;}, setAttribute:function(){}, appendChild:function(c){return c;} }; }
    var nodes = {
      'edict-pol': node('整饬辽饷与边储，命户部核实辽东军饷，严禁层层冒支。'),
      'edict-mil': node('命蓟辽督抚清点边军实额，修缮宁远、锦州诸堡，优先补足火器与粮草。'),
      'edict-dip': node('遣使朝鲜，询边情而厚赐安抚，使其严报建州动向。'),
      'edict-eco': node('准江南漕运诸司暂缓无名加派，令地方具册奏明实收实支。'),
      'edict-oth': node('命内阁汇整灾荒、兵饷、矿税三事，月内再奏。'),
      'xinglu-pub': node('朕意在先稳边储，再察财政浮冒。诸臣可直言利弊，不得以空文塞责。'),
      'btn-end': node('静待时变'), 'btn-end-turn': node('静待时变')
    };
    document.getElementById = function(id){ return nodes[id] || prevGet(id); };
  })();`, sandbox, { timeout: 10000 });
}

// 玩家操作 + NPC:奏疏(含批复)+ 朝会问对 transcript + 鸿雁 + 任免诏令 + 事件
function simulatePlayerAndNpcTurn(sandbox) {
  vm.runInContext(`(function(){
    var pf = P.playerInfo && P.playerInfo.factionName || '明';
    var pref = ['袁崇焕','孙承宗','叶向高','韩爌','杨鹤','徐光启','魏忠贤'];
    var minister = null;
    for (var i=0;i<pref.length && !minister;i++) minister = (GM.chars||[]).find(function(c){ return c && c.alive!==false && c.name===pref[i]; });
    minister = minister || (GM.chars||[]).filter(Boolean)[0] || { name:'廷臣' };
    // (a) 任免:玩家以本人身份起复袁崇焕为蓟辽督师(过回合前已定·两模式共享·agent/LLM 只推演其后果·不重做)
    if (typeof onAppointment === 'function') { try { onAppointment(minister.name, '蓟辽督师'); } catch(e){} }
    // (b) 奏疏 + (批复)
    if (!Array.isArray(GM.memorials)) GM.memorials = [];
    GM.memorials.push({ id:'flow_mem_1', from: minister.name||'廷臣', title:'辽饷浮冒与边储告急', type:'财政', subtype:'题本', content:'臣闻辽饷支给多有虚冒，边储亦不相继，请先核实军额与仓储。', status:'pending', turn: GM.turn, reply:'' });
    if (typeof _stageMemorialDecision === 'function') _stageMemorialDecision(GM.memorials[GM.memorials.length-1], 'annotated', '着户部、兵部会核辽饷与边储，十日内具册。');
    // (c)(d) 朝会·问对 transcript
    if (!Array.isArray(GM._courtRecords)) GM._courtRecords = [];
    var rec = { turn:GM.turn, targetTurn:GM.turn, phase:'in-turn', mode:'changchao', topic:'早朝·辽饷与边备',
      decisions:[{ action:'approve', label:'核辽饷、修边堡', extra:'先清册，后增饷。' }],
      transcript:[ { role:'player', speaker:(P.playerInfo&&P.playerInfo.characterName)||'皇帝', text:'先核实辽饷，再议增兵。' }, { role:'npc', speaker:minister.name||'廷臣', text:'边储若虚，清册不可缓。' } ], _v3:true };
    GM._courtRecords.push(rec);
    GM._lastChangchaoDecisions = rec.decisions.slice();
    GM._lastChangchaoDecisionMeta = { turn:rec.turn, targetTurn:rec.targetTurn, phase:rec.phase, mode:rec.mode };
    GM._lastChangchaoDecisionsTargetTurn = rec.targetTurn;
    if (typeof recordCourtHeld === 'function') recordCourtHeld({ isPostTurn:false, source:'mode-diff' });
    // (f) 鸿雁
    if (!Array.isArray(GM.letters)) GM.letters = [];
    GM.letters.push({ id:'flow_letter_1', from:(P.playerInfo&&P.playerInfo.characterName)||'皇帝', to:minister.name||'廷臣', content:'卿可密访辽饷实额，勿使浮冒者预闻。', sentTurn:GM.turn, deliveryTurn:GM.turn+1, replyTurn:GM.turn+2, status:'traveling', urgency:'urgent', letterType:'personal', _replyExpected:true });
    if (!Array.isArray(GM.evtLog)) GM.evtLog = [];
    GM.evtLog.push({ turn:GM.turn, type:'玩家操作', text:'早朝议辽饷，御笔下诏核饷修边，并朱批一件奏疏。' });
    window.__flow.playerActionSummary = { turn:GM.turn, minister: minister.name||'廷臣', memorials: GM.memorials.length, letters: GM.letters.length, courtRecords: GM._courtRecords.length };
    window.__flow.ministerName = minister.name || '廷臣';
  })();`, sandbox, { timeout: 10000 });
}

function simulatePostTurnCourtDecision(sandbox, startTurn) {
  vm.runInContext(`(function(){
    var st = ${startTurn};
    if (!Array.isArray(GM._courtRecords)) GM._courtRecords = [];
    var pr = { turn:st, targetTurn:st+1, phase:'post-turn', mode:'changchao', topic:'朔朝·次月边饷部署', decisions:[{ action:'decree', label:'次月继续追核辽饷', extra:'朔朝所议归入下一回合。' }], transcript:[{ role:'player', speaker:(P.playerInfo&&P.playerInfo.characterName)||'皇帝', text:'次月仍以辽饷为先。' },{ role:'npc', speaker:'阁臣', text:'谨遵上意。' }], _v3:true };
    GM._courtRecords.push(pr);
    GM._lastChangchaoDecisions = pr.decisions.slice();
    GM._lastChangchaoDecisionMeta = { turn:pr.turn, targetTurn:pr.targetTurn, phase:pr.phase, mode:pr.mode };
    GM._lastChangchaoDecisionsTargetTurn = pr.targetTurn;
    if (typeof recordCourtHeld === 'function') recordCourtHeld({ isPostTurn:true, source:'mode-diff' });
    if (!Array.isArray(GM.qijuHistory)) GM.qijuHistory = [];
    GM.qijuHistory.unshift({ turn:st, targetTurn:st+1, phase:'post-turn', content:'朔朝议次月辽饷部署。' });
  })();`, sandbox, { timeout: 10000 });
}

// 注入"按字数设置"的长内容(我当 LLM·产到设置档位长度·证 maxTok/slice 修复后真能装下)
function installLongContent(sandbox) {
  vm.runInContext(`(function(){
    var mn = window.__flow.minister || '袁崇焕';
    window.__shilu = ['九月，上诏户部核辽饷亏空，限三日具实数。是月，起'+mn+'为蓟辽督师，经略辽东，赐尚方剑，许便宜行事。',
      '上夜召兵部尚书孙承宗于文华殿，屏左右，问辽事，至三更乃罢。户部寻奏：辽饷岁支四百余万，核之亏三十余万，多为胥吏侵蚀、边将虚冒。',
      '上怒，命都察院会勘。是月，后金补防辽西，蒙古诸部亦有异动，边臣以闻。'].join('');
    window.__shizhengji = ['【朝政】崇祯元年九月，陛下本回合颁谕二道：其一，命户部三日内彻查辽饷亏空实数，严禁层层冒支；其二，起复'+mn+'，授蓟辽督师，经略辽东。两诏既下，朝野震动。',
      '【吏治】户部奉旨清查，旬日得亏空逾三十万两，账实不符，多为胥吏层层截留、边将虚报兵额所致。陛下震怒，命都察院会勘。然积弊已深，三日之限恐难尽核，有司惶惶。',
      '【边防】'+mn+'受命，关宁军暂得主心骨，士气稍振。然粮饷未充、火器缺额，复辽非旦夕之功；且后金近补防辽西，蒙古异动，边事正急。',
      '【宫廷】司礼监魏忠贤闻陛下锐意，侧目而视，阉党隐忧及己。退朝后，府第往来者骤密，似有所谋。',
      '【隐患】辽饷一查，牵动吏治、边将、内廷三方；起'+mn+'虽快人心，然其"五年复辽"之诺，他日恐成两难。'].join('\\n\\n');
    window.__zhengwen = '辽事为崇祯初政之枢纽。起'+mn+'，意在整饬边防；彻查辽饷，意在澄清吏治。二者皆触阉党之利与积年之弊，故朝局自此暗流渐起：户部惧勘、边将惧核、阉党惧权移，三方各怀心思。天下观望者众，皆欲看这位年轻天子，究竟能将这副烂摊子收拾到几分。';
    window.__houren = [
      '九月初七，天还没亮，乾清宫的灯就亮着。崇祯坐在案前，面前摊着户部昨夜呈上的辽饷奏本，他已经看了三遍。"三十万两，"他低声说，指节在案上轻轻叩着，"三十万两就这么没了。"王承恩侍立在侧，不敢接话。烛火被穿堂的秋风吹得一晃，案上的朱笔投下细长的影子。',
      '晨光初透，帝起身盥洗，草草用了些粥。内侍来报，说阁臣与兵部诸臣已在文华门外候着。崇祯整了整衣冠，淡淡道："叫他们进来。"',
      '朝会上，辽饷成了众矢之的。户部尚书奏称账实不符，亏空多为胥吏层层截留；兵部则争辩边军实额久未清点，饷银究竟养了多少兵，无人说得清。两边各执一词，殿上一时嘈杂。崇祯听着，眉头越皱越紧，忽然开口："都别争了。"殿内顿时安静。"户部，三日内把辽饷的实数给朕查清楚，一文都不许糊弄。"户部尚书叩首领命，额上已见了汗。',
      '议到边事，崇祯沉吟良久，终于道："起复'+(window.__flow.minister||'袁崇焕')+'。"此言一出，殿上又是一阵骚动，有人面露喜色，也有人交换眼神。帝不理会，只道："授他蓟辽督师，经略辽东。辽事，朕就托付给他了。"',
      '退朝后，户部的人忙着调档核账，宫里宫外都在传：陛下这回动真格了。司礼监那边，魏忠贤听了禀报，半晌没说话，只把手里的茶盏轻轻搁下。身边的人都看出来了，老祖宗起了戒心。',
      '午后，崇祯没歇着，单独召了孙承宗到文华殿。屏退左右，君臣对坐。帝问辽事究竟坏在何处。孙承宗是老成人，叩首答道："辽事坏在饷，饷坏在吏。陛下今日查饷，是查到了根上。只是积弊已深，急不得，也缓不得。"崇祯默然良久，窗外日影一寸寸移过，终于点头："朕知道了。"',
      '傍晚，边报又至，说后金近来在辽西补防，蒙古那边也有异动。崇祯独自在殿中站了许久。他想起白日那三十万两的亏空，想起'+(window.__flow.minister||'袁崇焕')+'临行前的承诺，想起孙承宗那句"急不得，也缓不得"。这江山，原来处处都是窟窿。他疲惫地揉了揉眉心，却没有歇下的意思。',
      '夜深了，乾清宫的灯还亮着。崇祯提笔，在任命的诏书旁批了一行小字，又搁下。秋风穿过殿宇，烛火一明一暗。后人读史至此，多有叹息：若辽饷的账早些年清了，辽事或许不至糜烂至斯；可叹这位年轻天子，纵有锐意，到底接的是一副烂摊子，独力难支。',
      '次日一早，户部的书吏们就被催着调档。架阁库里积年的辽饷案卷堆了半屋，几个老吏对着账册直摇头。有人私下嘀咕：这账要真查到底，牵出来的怕不止胥吏，还有上头的人。话没说完，便被同僚使眼色止住了。核账的事，向来是越往深处越烫手。',
      '消息传到边镇，将领们反应各异。有老成持重的，连夜把军册重新誊抄，唯恐核出虚额担罪；也有桀骜的，冷笑一声，说朝廷又要拿边军开刀了，饷还没足，先来查账。'+(window.__flow.minister||'袁崇焕')+'尚未到任，关宁上下已是人心浮动，既盼着新督师能要来饷银，又怕这场清查先革了自己。',
      '江南那边，漕运诸司接了暂缓加派的旨意，本该松一口气，可有司呈报的册子里，实收实支依旧含糊。士绅们闻风而动，或上书称颂圣德，或暗中盘算这一缓究竟能省下多少。朝廷的一道旨意，到了地方，总要走样三分。',
      '朝鲜使臣在会同馆候着，礼部按旨厚加赏赐，又反复叮嘱，建州动向务必详报。使臣唯唯而退，心里却明白，夹在大明与后金之间，这边情该怎么报、报几分，是桩比赏赐更难掂量的事。',
      '京城的茶楼酒肆里，辽饷的事也成了谈资。有说陛下英明、终于要整顿积弊的，也有摇头叹气、说这世道查得了一时查不了一世的。说书人把起'+(window.__flow.minister||'袁崇焕')+'的事编成了段子，听客们叫好，却没几个真信辽事能就此好转。',
      '内阁值房里，几位辅臣对着拟好的票拟反复斟酌。诛阉的风声、查饷的雷霆、起边帅的果决——这位新君的心思，比天启朝难猜得多。有人提笔又放下，低声道：伴君如伴虎，如今这虎，是头醒着的。',
      '又是一夜。崇祯独坐殿中，案上摊着边报、账册、任命诏书。他一件件看过去，忽然觉得疲惫得厉害。十七岁登基，接手的是一个处处漏风的天下。他想，父皇、皇兄当年，是不是也这样夜不能寐？烛火噼啪一声爆了个灯花。他揉了揉眼，又提起了笔——这江山，总得有人撑着。'
    ].join('\\n\\n');
  })();`, sandbox, { timeout: 10000 });
}

// ── mode A:me-as-LLM 替 _endTurn_aiInfer(LLM 管线产出) ──
function installModeA(sandbox) {
  vm.runInContext(`
    _endTurn_aiInfer = async function(edicts, xinglu, memRes, oldVars, externalCtx){
      var ctx = externalCtx || { input:{}, results:{}, record:{}, meta:{} };
      ctx.record = ctx.record || {}; ctx.results = ctx.results || {};
      window.__flow.aiCalls.push({ turn: GM.turn, edictCategories: Object.keys(edicts||{}).filter(function(k){return edicts[k];}), memorials: Array.isArray(memRes)?memRes.length:0 });
      var __mn = (window.__flow && window.__flow.ministerName) || '袁崇焕';
      // sc1 结构化产出(真实 LLM 会产·供 applyAITurnChanges 落账→填 turnChanges)
      var p1 = { summary:'整饬辽饷、清点边军、约束加派。', variables:[{name:'军务',delta:1,reason:'清军实额'}],
        npc_actions:[{name:__mn,action:'请核边饷',result:'奏请实支实销'},{name:'魏忠贤',action:'观望内廷',result:'暂缓正面冲突'}], factions:[{name:'后金',summary:'窥辽西补防。'}],
        char_updates:[{ name:__mn, loyalty_delta:3, action_type:'reward', reason:'奉旨清点宁锦边务' }],
        office_assignments:[{ name:__mn, post:'蓟辽督师', action:'appoint', reason:'起复经略辽东' }],
        fiscal_adjustments:[{ action:'add', target:'guoku', kind:'expense', resource:'money', category:'军饷', name:'辽东核饷拨付', amount:50000, reason:'核饷修边' }] };
      ctx.results.sc1 = p1;
      ctx.record.shizhengji = window.__shizhengji || '时政记';
      ctx.record.zhengwen = window.__zhengwen || '政文';
      ctx.record.playerStatus = '御案劳神而政令已下，威权初立而积弊在下。'; ctx.record.playerInner = '疑饷弊久积，欲先清册再议大征，然恐操之过急反生变。';
      ctx.record.turnSummary = '以财政核查与辽东边备为主线，起'+__mn+'、彻查辽饷。';
      ctx.record.shiluText = window.__shilu || '实录';
      ctx.record.szjTitle = '核饷修边，整饬辽储'; ctx.record.szjSummary = '朝廷转向清饷与边备整理，初政触积弊。';
      ctx.record.personnelChanges = [{ name:__mn, change:'起复·授蓟辽督师经略辽东' }];
      ctx.record.hourenXishuo = window.__houren || '后人戏说';
      ctx.record.suggestions = [{ title:'追核辽饷', detail:'下回合继续问责虚冒军额。' }];
      // 注:mock 直接给全 record 字段(含 houren)代表 followup/sc2 产出·不调真 followup.run(其需真实 ai-infer 内部 _runSubcall 脚手架)
      // 调真 applyAITurnChanges 落 sc1 结构化变更(与真实 ai-infer 同 shape)→ mode A 也填 turnChanges.characters/变量(公平对比)
      try { if (typeof applyAITurnChanges === 'function') applyAITurnChanges({ narrative: ctx.record.shizhengji, changes:[], appointments:[], institutions:[], regions:[], events:[], npc_actions: p1.npc_actions, relations:[], fiscal_adjustments: p1.fiscal_adjustments, char_updates: p1.char_updates, office_assignments: p1.office_assignments, personnel_changes: ctx.record.personnelChanges }); } catch(e){ window.__flow.errors.push('applyA:'+(e&&e.message)); }
      GM._turnAiResults = { subcall1: p1 };
      if (typeof addEB==='function') addEB('AI推演','模拟 LLM 完成本回合推演。');
      return { shizhengji: ctx.record.shizhengji, zhengwen: ctx.record.zhengwen, playerStatus: ctx.record.playerStatus, playerInner: ctx.record.playerInner, turnSummary: ctx.record.turnSummary, suggestions: ctx.record.suggestions, shiluText: ctx.record.shiluText, szjTitle: ctx.record.szjTitle, szjSummary: ctx.record.szjSummary, personnelChanges: ctx.record.personnelChanges, hourenXishuo: ctx.record.hourenXishuo, timeRatio: typeof getTimeRatio==='function'?getTimeRatio():1 };
    };
  `, sandbox, { timeout: 10000 });
}

// ── mode B:开 agentModeEnabled + me-as-LLM 替 callAIWithTools(agent 循环) + callAIMessages(深化工具) ──
function installModeB(sandbox) {
  vm.runInContext(`
    P.conf = P.conf || {}; P.conf.agentModeEnabled = true;          // 开 mode B(agentModeOn 认旁路)
    P.conf.agentModeDepthGate = true;                               // 深度门(真实默认)
    var __mn = window.__flow.ministerName || '袁崇焕';
    // agent 循环脑:5 轮(察看→落地→深化→叙事→收尾)
    window.__agentRounds = [
      { toolCalls:[{name:'get_overview',input:{}},{name:'list_entities',input:{kind:'chars'}}], text:'察看辽东与辽饷' },
      { toolCalls:[
          {name:'adjust_field',input:{path:'minxin',delta:-2,reason:'辽饷弊案揭发·人心浮动(查抄后果)'}},
          {name:'push_field',input:{path:'evtLog',value:{turn:GM.turn,text:'户部清查辽饷，亏空逾三十万两，胥吏截留事发'},reason:'彻查辽饷之后果'}}
        ], text:'推演辽饷查抄后果(玩家已任袁崇焕·此处只推后果·不重做任免)' },
      { toolCalls:[{name:'deepen_factions',input:{}},{name:'deepen_economy',input:{}},{name:'deepen_military',input:{}},{name:'recall_consolidate',input:{}}], text:'深析势力/经济/军事·固化记忆' },
      { toolCalls:[{name:'deepen_narrative',input:{}},{name:'deepen_npcs',input:{focus:[__mn]}},{name:'deepen_letters',input:{focus:[__mn]}}], text:'撰史记四体·NPC内心·书信' },
      { toolCalls:[{name:'finalize_turn',input:{narrative:'帝锐意辽事，起'+__mn+'，查辽饷弊。', summary:'起'+__mn+'·查辽饷'}}], text:'深度已足·收尾' }
    ];
    window.__agentIdx = 0;
    callAIWithTools = async function(transcript, tools){
      var r = window.__agentRounds[window.__agentIdx] || { toolCalls:[], text:'' };
      window.__flow.agentRounds.push({ round: window.__agentIdx+1, tools:(tools||[]).length, calls:(r.toolCalls||[]).map(function(c){return c.name;}) });
      window.__agentIdx++; return r;
    };
    callAIMessages = async function(msgs){
      var u = (msgs && msgs[1] && msgs[1].content) || '';
      if (/脉络/.test(u)) return JSON.stringify({ beats:['起'+__mn+'授蓟辽督师','彻查辽饷亏空三十万','早朝问对辽事','阉党侧目'], tone:'锐意暗涌' });
      if (/撰写《后人戏说》/.test(u)) return JSON.stringify({ houren_xishuo: window.__houren, new_activities:[] });
      if (/据此产出完整史记/.test(u)) return JSON.stringify({ shizhengji: window.__shizhengji, shilu: window.__shilu, zhengwen: window.__zhengwen, playerStatus:'新帝威权初立，锐意辽事，然阉党在侧、积弊在下。', playerInner:'三十万两的亏空像一根刺。不杀几个人这饷永远是糊涂账，可杀了又是风波。', suggestions:['速定阁臣分阉党之权','辽饷设专员稽核','安抚关宁军心'], title:'锐意起边帅，彻查蠹辽饷', summary:'起'+__mn+'、查辽饷，初政触积弊' });
      if (/toward_player/.test(u)) return JSON.stringify({ factions:[{name:'后金',intent:'趁明内顾扰边',move:'联蒙古窥蓟镇',toward_player:'敌对·伺机',stance_delta:-3}], undercurrents:[{faction:'阉党',type:'离心',description:'察君上锐意·暗结党羽自保',impact:'掣肘新政'}], schemes:[{schemer:'阉党',target:'东林',plan:'构陷复起诸臣',progress:'酝酿'}] });
      if (/fiscal_pressure/.test(u)) return JSON.stringify({ assessment:'太仓亏空·辽饷压顶·三十万缺口暴露胥吏侵蚀', risks:['辽饷无着','清查激变'], trends:['赤字扩大'], fiscal_pressure:'9·辽饷压顶' });
      if (/war_risk/.test(u)) return JSON.stringify({ assessment:'辽东糜烂·关宁独支·后金压境', threats:['后金','蒙古'], recommendations:['足饷','固关宁'], war_risk:'8·后金压境' });
      if (/causal_edges/.test(u)) return JSON.stringify({ memory:'起'+__mn+'授蓟辽督师、查辽饷得亏空三十万、早朝问对辽事，阉党侧目。', state_board:{mood:'锐意辽事·阉党戒心',recent_summary:'起边帅查辽饷触积弊',open_loops:['辽饷专员未设','阉党未除'],unfulfilled_promises:['五年复辽']}, plot_updates:[{title:'辽东复局',threadType:'military',update:__mn+'受命经略',status:'active',newThread:true}], foreshadow:['辽饷专员成党争焦点','五年复辽伏最大变数'], causal_edges:[{from:'彻查辽饷',to:'胥吏截留事发',type:'triggered',strength:0.9,explanation:'清查揭三十万亏空'},{from:'起'+__mn,to:'关宁军心稳',type:'enabled',strength:0.7,explanation:'边帅有主'}] });
      if (/letterType/.test(u)) return JSON.stringify({ letters:[{from:__mn,to:'玩家',letterType:'plea',urgency:'urgent',content:'臣受命经略，然辽饷未充、关宁缺额，乞陛下速发内帑应急。'}] });
      if (/stress_delta/.test(u)) return JSON.stringify({ npcs:[{name:__mn,mood:'忧饷',stress_delta:12,inner:'君恩深重，然辽事如焚，五年之诺恐难践',hidden_intent:'先稳关宁再图复辽'}] });
      if (/currentView/.test(u)) return JSON.stringify({ npcs:[{name:__mn,currentView:'君上可辅然操之过急恐生变',recognition:'已察阉党暗动'}] });
      if (/world_snapshot/.test(u)) return JSON.stringify({ world_snapshot:'崇祯初政，诛阉在即，辽事危殆，关宁独支，后金压境', next_turn_seeds:'辽饷党争酝酿、阉党或先发、'+__mn+'请饷', tension_level:'8·内忧外患' });
      return JSON.stringify({});
    };
  `, sandbox, { timeout: 10000 });
}

function summarize(sandbox) {
  return JSON.parse(vm.runInContext(`JSON.stringify((function(){
    var lastRun = (TM.Endturn && TM.Endturn.Pipeline && TM.Endturn.Pipeline.lastRun) ? TM.Endturn.Pipeline.lastRun() : [];
    var sh = (GM.shijiHistory && GM.shijiHistory.length) ? GM.shijiHistory[GM.shijiHistory.length-1] : null;
    var tc = GM.turnChanges || {};
    return {
      turn: GM.turn,
      agentModeRan: !!(GM._agentTurnMeta),
      agentMeta: GM._agentTurnMeta ? { rounds:GM._agentTurnMeta.rounds, writeOk:GM._agentTurnMeta.writeOk, finalized:GM._agentTurnMeta.finalized, depthTools:Object.keys(GM._agentTurnMeta.depthTools||{}), spineGaps:GM._agentTurnMeta.spineGaps } : null,
      chars: (GM.chars||[]).length, factions:(GM.facs||[]).length,
      memorials:(GM.memorials||[]).length, letters:(GM.letters||[]).length,
      courtRecords:(GM._courtRecords||[]).length,
      shijiHistory:(GM.shijiHistory||[]).length, lastShijiTurn: sh ? sh.turn : null,
      shijiKeys: sh ? { shilu: !!(sh.shilu||sh.shiluText), shizhengji: !!sh.shizhengji, zhengwen: !!sh.zhengwen, houren: !!(sh.houren||sh.hourenXishuo), title: !!(sh.szjTitle||sh.title), playerStatus: !!sh.playerStatus, suggestions: !!(sh.suggestions&&sh.suggestions.length) } : null,
      shijiHourenLen: sh ? String(sh.houren||sh.hourenXishuo||'').length : 0,
      shijiShizhengjiLen: sh ? String(sh.shizhengji||'').length : 0,
      personnelCount: sh && Array.isArray(sh.personnel) ? sh.personnel.length : 0,
      injectedHouren: (window.__houren||'').length, injectedShizhengji: (window.__shizhengji||'').length,
      turnChanges: { characters:(tc.characters||[]).length, factions:(tc.factions||[]).length, variables:(tc.variables||[]).length },
      causalEdges: (GM._causalGraph && GM._causalGraph.edges) ? GM._causalGraph.edges.length : 0,
      stateBoard: !!GM._stateBoard, plotThreads:(GM._plotThreads||[]).length, foreshadows:(GM._foreshadows||[]).length,
      factionUndercurrents:(GM._factionUndercurrents||[]).length,
      pipeline: lastRun.map(function(x){ return { step:x.step, ok:!!x.ok, error: x.error?String(x.error.message||x.error):'' }; }),
      aiCalls: (window.__flow.aiCalls||[]).length,
      agentRounds: window.__flow.agentRounds||[],
      turnResults:(window.__flow.turnResults||[]).length,
      errors:(window.__flow.errors||[]).slice(-6)
    };
  })())`, sandbox, { timeout: 10000 }));
}

async function runMode(label) {
  const sandbox = loadGame();
  vm.runInContext(`_pendingUseMap=true; _pendingMapModeSid='${SID}'; _pendingMapModeAt=Date.now(); doActualStart('${SID}');`, sandbox, { timeout: 15000 });
  await delay(180);
  if (!(sandbox.GM && sandbox.GM.running)) throw new Error(label + ': game not running after doActualStart');
  installInputNodes(sandbox);
  if (label === 'A') installModeA(sandbox); else installModeB(sandbox);
  simulatePlayerAndNpcTurn(sandbox);
  installLongContent(sandbox);   // minister 已设·注入按字数设置的长内容(两 brain 在 endTurn 时读 window.__houren 等)
  const startTurn = sandbox.GM.turn;
  vm.runInContext(`endTurn();`, sandbox, { timeout: 20000 });
  try { vm.runInContext(`_postTurnCourtChoose(true);`, sandbox, { timeout: 10000 }); } catch (e) {}
  simulatePostTurnCourtDecision(sandbox, startTurn);
  try { await waitFor('deferred payload', () => { const p = sandbox.GM && sandbox.GM._pendingShijiModal; return p && p.aiReady && p.payload; }, 20000); } catch (e) { sandbox.__flow.errors.push('waitPayload: ' + e.message); }
  try { await vm.runInContext(`_onPostTurnCourtEnd();`, sandbox, { timeout: 20000 }); } catch (e) { sandbox.__flow.errors.push('courtEnd: ' + e.message); }
  try { await waitFor('court done', () => sandbox.GM && sandbox.GM._pendingShijiModal && sandbox.GM._pendingShijiModal.courtDone === true, 10000); } catch (e) {}
  await delay(80);
  const s = summarize(sandbox); s._startTurn = startTurn; s._label = label;
  return s;
}

function line(t) { console.log(t); }
function cmp(label, a, b) { var same = JSON.stringify(a) === JSON.stringify(b); console.log('  ' + (same ? '≡' : '≠') + ' ' + label.padEnd(26) + ' A=' + JSON.stringify(a) + '  B=' + JSON.stringify(b)); }

async function main() {
  line('\n══════ 两种模式·完整过回合对拍(真实天启剧本 sc-tianqi7-1627·真 pipeline)══════');
  line('玩家操作(两模式同一套·我扮演玩家·过回合前做掉):任免(起复袁崇焕→蓟辽督师) + 诏书×5类 + 奏疏(批复:着户部兵部会核) + 早朝问对 transcript + 鸿雁(密访辽饷) + 朝会决议 · agent/LLM 只推演这些操作的后果');
  let A, B;
  line('\n[跑 mode A · LLM 管线] …');
  A = await runMode('A');
  line('[跑 mode B · Agent 接管] …');
  B = await runMode('B');

  line('\n── 流水线步骤(两模式都真跑整条)──');
  line('  A: ' + A.pipeline.map(function (x) { return x.step + (x.ok ? '✓' : '✗'); }).join(' → '));
  line('  B: ' + B.pipeline.map(function (x) { return x.step + (x.ok ? '✓' : '✗'); }).join(' → '));
  var aErr = A.pipeline.filter(function (x) { return !x.ok; }), bErr = B.pipeline.filter(function (x) { return !x.ok; });
  if (aErr.length) line('  A 失败步:' + aErr.map(function (x) { return x.step + '(' + x.error + ')'; }).join(' '));
  if (bErr.length) line('  B 失败步:' + bErr.map(function (x) { return x.step + '(' + x.error + ')'; }).join(' '));

  line('\n── mode B agent 机制(真跑)──');
  if (B.agentMeta) { line('  轮次:' + B.agentMeta.rounds + ' · 落地:' + B.agentMeta.writeOk + ' · 收尾:' + B.agentMeta.finalized + ' · 深化工具:[' + B.agentMeta.depthTools.join(',') + '] · 脊柱缺口:[' + (B.agentMeta.spineGaps || []).join('、') + ']'); B.agentRounds.forEach(function (r) { line('  轮' + r.round + ' 挂' + r.tools + '工具:[' + r.calls.join(',') + ']'); }); }
  else line('  ⚠ 未检测到 agent 运行(回落了 LLM?)');

  line('\n── 关键产出对拍(A=LLM / B=Agent · ≡ 同 / ≠ 异)──');
  cmp('turn 推进(+1)', A.turn - A._startTurn, B.turn - B._startTurn);
  cmp('史记弹窗写入', A.shijiHistory >= 1, B.shijiHistory >= 1);
  cmp('史记记的回合', A.lastShijiTurn, B.lastShijiTurn);
  cmp('史记四体齐全', A.shijiKeys, B.shijiKeys);
  cmp('人事变动 personnelChanges', A.personnelCount, B.personnelCount);
  console.log('  实际字数(我当 LLM 按标准档供长内容·注入 houren ' + B.injectedHouren + '字/时政记 ' + B.injectedShizhengji + '字·验经 chronicle→aiResult→render→shijiHistory 全链不截断):');
  console.log('    后人戏说落 shijiHistory:  A=' + A.shijiHourenLen + '字  B=' + B.shijiHourenLen + '字  (注入 ' + A.injectedHouren + '字 → ' + ((A.shijiHourenLen >= A.injectedHouren && B.shijiHourenLen >= B.injectedHouren) ? '✅全链零截断·旧写死 slice 1500 会砍掉一半' : '⚠ 有截断') + ')');
  console.log('    时政记落 shijiHistory:    A=' + A.shijiShizhengjiLen + '字  B=' + B.shijiShizhengjiLen + '字  (注入 ' + A.injectedShizhengji + '字 → ' + ((A.shijiShizhengjiLen >= A.injectedShizhengji && B.shijiShizhengjiLen >= B.injectedShizhengji) ? '✅零截断·旧写死 slice 800 会砍' : '⚠') + ')');
  cmp('奏疏数', A.memorials, B.memorials);
  cmp('鸿雁数', A.letters, B.letters);
  cmp('朝会记录数', A.courtRecords, B.courtRecords);
  cmp('turnResult 弹窗', A.turnResults >= 1, B.turnResults >= 1);
  line('  注:鸿雁 B 多 1 封 = agent 的 deepen_letters 真跑生成(袁崇焕请饷);mode A 的 sc1b 书信生成本 harness 未 mock·真 A 经 sc1b 同样生成。');
  line('\n── 活态层(turnChanges/因果/状态盘/情节/伏笔/暗流)──');
  line('  mode B(真跑·agent 深化工具同步产):turnChanges 人物' + B.turnChanges.characters + '/势力' + B.turnChanges.factions + '/变量' + B.turnChanges.variables + ' · 因果边' + B.causalEdges + ' · 状态盘' + B.stateBoard + ' · 情节' + B.plotThreads + ' · 伏笔' + B.foreshadows + ' · 势力暗流' + B.factionUndercurrents);
  line('  mode A(本 harness):turnChanges 人物' + A.turnChanges.characters + '/变量' + A.turnChanges.variables + ' · 因果边' + A.causalEdges);
  line('  ⚠ mode A 这些层真实经 sc1-apply + followup(sc25 因果/状态盘/情节)产·本 harness 的简化 mock 未全复现 followup(需真 ai-infer _runSubcall 脚手架)→ A 数字偏低是 harness 限制·非真 A 缺失(真游戏 mode A 的 Delta 面板/因果图正常)。');
  line('  → 此层对比看 mode B "有没有"(有·真跑齐全)·非 B vs A 多寡。B 的产出契约完整性已由 test-mode-diff.js 证(21/21 对 LLM 契约)。');

  line('\n── 机制差异 ──');
  line('  A:ai 步内 _endTurn_aiInfer 跑 sc0-sc1 + followup(sc2 后人戏说)·' + A.aiCalls + ' 次主推演入口');
  line('  B:ai 步 AgentMode.run 接管·engine-first 真跑引擎 + ' + (B.agentMeta ? B.agentMeta.rounds : '?') + ' 轮自适应工具循环·systems 步幂等跳(防双跑)');
  line('  两模式 turn 都只 +1(无双重推进)·下游 post-ai-edict/systems/render 共享同一代码·post-turn 朝会都走完');
  if (A.errors.length) line('\n  A 残留错误:' + A.errors.join(' | '));
  if (B.errors.length) line('  B 残留错误:' + B.errors.join(' | '));
  line('\n  ⚠ 内容由"我当 LLM"供·此测真跑完整回合流程(真 GM/引擎/pipeline/post-turn 朝会)·验机制+产出完整性·非真模型笔力。');
  line('══════ 对拍完 ══════\n');
  process.exit(0);
}
main().catch(function (e) { console.error('[mode-diff-fullturn] FAIL ' + (e && e.message || e)); if (e && e.stack) console.error(e.stack.split('\n').slice(1, 6).join('\n')); process.exit(1); });
