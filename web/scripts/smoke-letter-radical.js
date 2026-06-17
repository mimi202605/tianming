// scripts/smoke-letter-radical.js
// 验证：截获率重构 + 严重逾期自愈 + letterDoctor 控制台工具
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function fakeEl() {
  return {
    classList:{add(){},remove(){},toggle(){},contains(){return false}},style:{},
    appendChild(c){return c},removeChild(c){return c},setAttribute(){},getAttribute(){return null},
    addEventListener(){},removeEventListener(){},
    querySelector(){return fakeEl()},querySelectorAll(){return[]},
    children:[],childNodes:[],innerHTML:'',textContent:'',value:'',dataset:{}
  };
}
const sandbox = {
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  Math, Date, JSON, RegExp, Error, Promise,
  Array, Object, String, Number, Boolean,
  parseInt, parseFloat, isNaN, isFinite,
  document: { getElementById:()=>fakeEl(), querySelector:()=>fakeEl(), querySelectorAll:()=>[], addEventListener(){}, createElement:()=>fakeEl(), body:fakeEl(), readyState:'complete' },
  window: {}, localStorage: {getItem:()=>null,setItem:()=>{},removeItem:()=>{}},
  navigator: {userAgent:'node'}, performance: {now:()=>Date.now()},
  fetch:()=>Promise.reject(new Error('no fetch')),
  alert:()=>{}, confirm:()=>true, prompt:()=>null,
  HTMLElement:function(){}, Event:function(){}, requestAnimationFrame:cb=>setTimeout(cb,16)
};
sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
sandbox.addEventListener = ()=>{}; sandbox.removeEventListener = ()=>{};
vm.createContext(sandbox);

const html = fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const re = /<script[^>]+src="([^"]+\.js)/g;
let m;
while ((m = re.exec(html))) {
  const fp = path.join(ROOT, m[1].split('?')[0]);
  if (!fs.existsSync(fp)) continue;
  try { vm.runInContext(fs.readFileSync(fp,'utf8'), sandbox, { filename: m[1] }); } catch(e) {}
}
try { vm.runInContext(fs.readFileSync(path.join(ROOT,'scenarios/tianqi7-1627.js'),'utf8'), sandbox); } catch(e) {}

setTimeout(() => {
  try {
    const sc = sandbox.P.scenarios.find(s=>s.id==='sc-tianqi7-1627');
    const sid = sc.id;
    const GM = sandbox.GM = {
      running:true, sid, turn:1, busy:false,
      vars:{}, rels:{}, evtLog:[], officeChanges:[], qijuHistory:[],
      facs:(sandbox.P.factions||[]).filter(f=>f.sid===sid).map(f=>Object.assign({},f)),
      chars:(sandbox.P.characters||[]).filter(c=>c.sid===sid).map(c=>Object.assign({},c)),
      letters:[], _pendingNpcLetters:[], _letterSuspects:[], _courierStatus:{},
      _routeDisruptions:[], _capital:(sc.playerInfo&&sc.playerInfo.capital)||'京师',
      adminHierarchy: sc.adminHierarchy || sandbox.P.adminHierarchy,
      _edictTracker:[]
    };
    sandbox.P.conf = sandbox.P.conf || {};

    // ===== 测试 1: 截获率参数 =====
    console.log('========== 测试 1: 截获率参数（strict_hist）==========');
    sandbox.P.conf.gameMode = 'strict_hist';
    const sun = GM.chars.find(c=>c.name==='孙承宗');
    const yuan = GM.chars.find(c=>c.name==='袁崇焕');
    const houjinFac = GM.facs.find(f=>f.name && f.name.indexOf('后金')>=0);
    if (houjinFac) houjinFac.playerRelation = -100;

    function rate(letter, label) {
      const hostile = (GM.facs||[]).filter(f=>!f.isPlayer && (f.playerRelation||0)<-50);
      const r = sandbox._ltCalcInterceptRate(letter, hostile);
      console.log(`  ${label}: ${(r*100).toFixed(1)}%`);
      return r;
    }
    rate({letterType:'formal_edict', urgency:'normal', fromLocation:'京师', toLocation:sun.location, _sendMode:'normal'}, '玩家→孙承宗(保定高阳·formal_edict·普通)');
    rate({letterType:'formal_edict', urgency:'normal', fromLocation:'京师', toLocation:sun.location, _sendMode:'courier_official'}, '玩家→孙承宗(formal_edict·官方驿递)');
    rate({letterType:'formal_edict', urgency:'normal', fromLocation:'京师', toLocation:'山海关', _sendMode:'courier_official'}, '玩家→山海关(边关·formal·官方驿递)');
    rate({letterType:'formal_edict', urgency:'urgent', fromLocation:'京师', toLocation:'盛京', _sendMode:'courier_official'}, '玩家→盛京(后金都·formal·官方驿递·加急)');
    rate({letterType:'personal', urgency:'normal', fromLocation:'京师', toLocation:'京师', _sendMode:'normal'}, '京内私函');

    sandbox.P.conf.gameMode = 'light_hist';
    console.log('-- light_hist 模式 --');
    rate({letterType:'formal_edict', urgency:'normal', fromLocation:'京师', toLocation:sun.location, _sendMode:'courier_official'}, '玩家→孙承宗(formal·官方·light_hist)');

    sandbox.P.conf.gameMode = 'yanyi';
    console.log('-- yanyi 模式（应不触发截获）--');
    console.log('  _canIntercept (yanyi):', sandbox.P.conf.gameMode === 'strict_hist' || sandbox.P.conf.gameMode === 'light_hist');

    // ===== 测试 2: 严重逾期自愈 =====
    console.log('\n========== 测试 2: 严重逾期自愈 ==========');
    sandbox.P.conf.gameMode = 'yanyi';
    GM.turn = 1;
    GM.letters = [];
    // 注入一封"假装来自 5 回合前但卡住"的信
    GM.letters.push({
      id:'stuck1', from:'玩家', to:sun.name,
      fromLocation:'京师', toLocation:sun.location,
      content:'测试卡死信', status:'traveling',
      sentTurn:1, deliveryTurn:2, replyTurn:3,
      letterType:'formal_edict'
    });
    GM.turn = 8; // 模拟过了 6 回合后仍 traveling
    console.log('  注入 stuck1: deliveryTurn=2, GM.turn=8, status=traveling');
    sandbox.SubTickRunner.run({ timeRatio: 0.25, turn: GM.turn });
    const stuck1 = GM.letters.find(l=>l.id==='stuck1');
    console.log('  自愈后 status:', stuck1.status, '_autoHealed:', stuck1._autoHealed, 'reply:', (stuck1.reply||'').slice(0,30));

    // 测试 intercepted 久未消化
    GM.letters.push({
      id:'stuck2', from:'玩家', to:yuan.name,
      fromLocation:'京师', toLocation:yuan.location||'山海关',
      content:'测试久滞 intercepted', status:'intercepted',
      sentTurn:1, deliveryTurn:2,
      letterType:'formal_edict'
    });
    GM.turn = 12;
    console.log('  注入 stuck2: deliveryTurn=2, GM.turn=12, status=intercepted');
    sandbox.SubTickRunner.run({ timeRatio: 0.25, turn: GM.turn });
    const stuck2 = GM.letters.find(l=>l.id==='stuck2');
    console.log('  自愈后 status:', stuck2.status, '_autoHealed:', stuck2._autoHealed, 'reply:', (stuck2.reply||'').slice(0,30));

    // ===== 测试 3: letterDoctor 控制台工具 =====
    console.log('\n========== 测试 3: letterDoctor() ==========');
    GM.letters = [];
    GM.turn = 5;
    // 各种卡死状态
    GM.letters.push({id:'d1', _npcInitiated:false, status:'traveling', deliveryTurn:3, replyTurn:4, from:'玩家', to:'A', toLocation:'某地'});
    GM.letters.push({id:'d2', _npcInitiated:false, status:'replying', deliveryTurn:3, replyTurn:4, from:'玩家', to:'B'});
    GM.letters.push({id:'d3', _npcInitiated:true, status:'traveling', deliveryTurn:3, from:'C', to:'玩家'});
    GM.letters.push({id:'d4', _npcInitiated:true, status:'delivered', deliveryTurn:3, from:'D', to:'玩家'});
    GM.letters.push({id:'d5', status:'intercepted', deliveryTurn:1, from:'玩家', to:'E'});
    console.log('  letters before:', GM.letters.map(l=>l.id+':'+l.status).join(', '));
    const fixed = sandbox.letterDoctor();
    console.log('  letters after:', GM.letters.map(l=>l.id+':'+l.status).join(', '));
    console.log('  返回值:', fixed);

    // ===== 测试 4: _replyExpected 字段一致性 =====
    console.log('\n========== 测试 4: 字段命名一致性 ==========');
    GM.letters = [];
    // 模拟开局信件路径
    GM.turn = 1;
    GM._openingLettersActivated = false;
    if (sc.openingLetters) sc.openingLetters = [{
      from: '孙承宗', to: '朱由检', fromLocation: '保定高阳',
      letterType: 'personal', subjectLine: '陈情', content: '臣谨陈辽东方略',
      replyExpected: true
    }];
    if (typeof sandbox.activateOpeningLetters === 'function') {
      sandbox.activateOpeningLetters();
    } else if (typeof sandbox._activateOpeningLetters === 'function') {
      sandbox._activateOpeningLetters();
    } else {
      console.log('  跳过 activateOpeningLetters（未导出）');
    }
    const opLt = GM.letters.find(l=>l._fromOpeningLetter);
    if (opLt) {
      console.log('  开局信 _replyExpected:', opLt._replyExpected, '(应为 true)');
      console.log('  开局信 replyExpected (旧字段·应不存在):', opLt.replyExpected);
    } else {
      console.log('  开局信未生成（可能 sc.openingLetters 接口不同·非阻塞）');
    }

    // ===== 测试 5: letterDoctor 消费 pending NPC + 清 _undeliveredLetters =====
    console.log('\n========== 测试 5: pending NPC + undelivered 清理 ==========');
    GM.letters = [];
    GM._pendingNpcLetters = [
      { from:'孙承宗', type:'report', urgency:'urgent', content:'辽东军情', suggestion:'增饷' },
      { from:'袁崇焕', type:'plea', urgency:'normal', content:'宁远请援' },
      { from: null, content: '坏数据' }, // 故意 null·测异常隔离
      { from:'熊廷弼', type:'warning', content:'广宁危急' }
    ];
    GM._undeliveredLetters = [
      { from:'玩家', to:'孙承宗', content:'测试旧 undelivered', turn:1, interceptor:'后金' }
    ];
    // 注入一封 intercepted 久未处理·目标内容匹配 undelivered
    GM.letters.push({
      id:'lostL', from:'玩家', to:'孙承宗',
      fromLocation:'京师', toLocation:'保定高阳',
      content:'测试旧 undelivered', status:'intercepted',
      sentTurn:1, deliveryTurn:2, letterType:'formal_edict'
    });
    GM.turn = 10;
    console.log('  before: letters=' + GM.letters.length + ' pending=' + GM._pendingNpcLetters.length + ' undelivered=' + GM._undeliveredLetters.length);
    var fixedR = sandbox.letterDoctor();
    console.log('  after letterDoctor: letters=' + GM.letters.length + ' pending=' + GM._pendingNpcLetters.length + ' undelivered=' + GM._undeliveredLetters.length);
    console.log('  fixed:', fixedR);
    console.log('  expect: pendingFlushed=3 (跳过坏数据)·interceptedHealed=1·undelivered 应清为 0');

    // ===== 测试 6: letterDiag 诊断 =====
    console.log('\n========== 测试 6: letterDiag() 诊断输出 ==========');
    var diag = sandbox.letterDiag();
    console.log('  pipelineHasLetters:', diag.pipelineHasLetters, '(应为 true)');
    console.log('  lettersTotal:', diag.lettersTotal);
    console.log('  byStatus:', diag.byStatus);

    // ===== 测试 7: pending NPC 在 settle 中 try-catch 隔离·坏数据不阻塞 =====
    console.log('\n========== 测试 7: pending 异常隔离 ==========');
    GM._pendingNpcLetters = [
      { from:'李三才', type:'report', content:'测试1' },
      null, // 坏
      { from:'高攀龙', type:'plea', content:'测试2' }
    ];
    GM.turn = 1;
    var beforeLen = GM.letters.length;
    sandbox.SubTickRunner.run({ timeRatio: 0.25, turn: GM.turn });
    var afterLen = GM.letters.length;
    console.log('  letters 增加:', afterLen - beforeLen, '(应为 2·坏数据被跳过)');
    console.log('  pending 清空:', GM._pendingNpcLetters.length, '(应为 0)');

    process.exit(0);
  } catch (e) {
    console.error('SIM ERROR:', e.message, '\n', e.stack);
    process.exit(1);
  }
}, 250);
