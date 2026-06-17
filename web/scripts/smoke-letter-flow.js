// scripts/smoke-letter-flow.js
// 复现"信件没到达·派出去的信使全部失踪"问题
// 用 vm sandbox 加载所有 tm-*.js 然后模拟 endTurn

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

// 极简浏览器 DOM/storage stub - return fake-element for everything to keep startGame happy
function fakeEl() {
  const el = {
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    style: {},
    children: [], childNodes: [],
    innerHTML: '', textContent: '', value: '',
    appendChild(c){ this.children.push(c); return c; },
    removeChild(c){ return c; },
    setAttribute(){}, getAttribute(){ return null; }, removeAttribute(){},
    addEventListener(){}, removeEventListener(){},
    querySelector(){ return fakeEl(); },
    querySelectorAll(){ return []; },
    getBoundingClientRect(){ return {top:0,left:0,bottom:0,right:0,width:0,height:0}; },
    focus(){}, blur(){}, click(){}, scrollIntoView(){},
    insertBefore(c){ return c; },
    cloneNode(){ return fakeEl(); },
    contains(){ return false; },
    parentNode: null, parentElement: null, firstChild: null, lastChild: null,
    nextSibling: null, previousSibling: null,
    dataset: {},
    offsetWidth:0, offsetHeight:0, clientWidth:0, clientHeight:0,
    scrollTop:0, scrollLeft:0, scrollWidth:0, scrollHeight:0
  };
  return el;
}
const sandbox = {
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  Math, Date, JSON, RegExp, Error, Promise,
  Array, Object, String, Number, Boolean,
  parseInt, parseFloat, isNaN, isFinite,
  document: {
    getElementById: () => fakeEl(),
    querySelector: () => fakeEl(),
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    createElement: () => fakeEl(),
    createTextNode: () => fakeEl(),
    body: fakeEl(),
    documentElement: fakeEl(),
    head: fakeEl(),
    readyState: 'complete'
  },
  window: {},
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
  navigator: { userAgent: 'node' },
  performance: { now: () => Date.now() },
  fetch: () => Promise.reject(new Error('no fetch')),
  alert: () => {}, confirm: () => true, prompt: () => null,
  HTMLElement: function(){}, Event: function(){},
  CustomEvent: function(){},
  requestAnimationFrame: (cb) => setTimeout(cb, 16),
  cancelAnimationFrame: () => {},
  indexedDB: undefined,
  location: { href: '', hash: '', search: '', pathname: '/' },
  history: { pushState(){}, replaceState(){}, back(){}, forward(){} },
  getComputedStyle: () => ({ getPropertyValue(){ return ''; } }),
  matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){} })
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
sandbox.addEventListener = () => {};
sandbox.removeEventListener = () => {};
sandbox.dispatchEvent = () => true;

vm.createContext(sandbox);

// 读 index.html 找 <script src="tm-*.js"> 顺序
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scriptRe = /<script[^>]+src="([^"]+\.js)[^"]*"/g;
const scripts = [];
let m;
while ((m = scriptRe.exec(indexHtml)) !== null) {
  scripts.push(m[1].split('?')[0]);
}

let loaded = 0, failed = 0;
for (const s of scripts) {
  const fp = path.join(ROOT, s);
  if (!fs.existsSync(fp)) continue;
  try {
    const code = fs.readFileSync(fp, 'utf8');
    vm.runInContext(code, sandbox, { filename: s });
    loaded++;
  } catch (e) {
    failed++;
    if (failed < 5) console.warn('[load fail]', s, e.message.slice(0, 100));
  }
}
console.log(`[smoke-letter] loaded ${loaded} files (${failed} failed)`);

// 加官方剧本
try {
  const scenarioCode = fs.readFileSync(path.join(ROOT, 'scenarios/tianqi7-1627.js'), 'utf8');
  vm.runInContext(scenarioCode, sandbox);
} catch (e) {
  console.error('scenario load fail:', e.message);
}

// 等剧本注册（setTimeout 50）
setTimeout(() => {
  try {
    if (!sandbox.P || !sandbox.P.scenarios || !sandbox.P.scenarios.length) {
      console.error('NO scenarios registered'); process.exit(1);
    }
    console.log('[smoke-letter] scenarios:', sandbox.P.scenarios.length);

    // 故意不调 startGame·模拟"加载存档"路径
    if (!sandbox.GM) sandbox.GM = {};
    const GM = sandbox.GM;
    const sc = sandbox.P.scenarios.find(s => s.id === 'sc-tianqi7-1627');
    if (!GM.chars || GM.chars.length === 0) {
      // 手动按 startGame 的方式注水核心字段
      GM.running = true;
      GM.sid = 'sc-tianqi7-1627';
      GM.turn = GM.turn || 1;
      GM.vars = GM.vars || {};
      GM.rels = GM.rels || {};
      const allP = sandbox.P;
      const sid = 'sc-tianqi7-1627';
      GM.facs = (allP.factions || []).filter(f => f.sid === sid).map(f => Object.assign({}, f));
      GM.chars = (allP.characters || []).filter(c => c.sid === sid).map(c => Object.assign({}, c));
      GM.letters = [];
      GM._pendingNpcLetters = [];
      GM._letterSuspects = [];
      GM._courierStatus = {};
      GM._routeDisruptions = [];
      GM.adminHierarchy = sc.adminHierarchy || (sandbox.P.adminHierarchy ? sandbox.P.adminHierarchy : null);
      GM._capital = (sc.playerInfo && sc.playerInfo.capital) || '京师';
      GM.evtLog = [];
      GM.officeChanges = [];
      console.log('[smoke-letter] hand-initialized GM.chars=' + GM.chars.length + ' capital=' + GM._capital);
    }
    console.log('[smoke-letter] GM.turn =', GM.turn);
    console.log('[smoke-letter] GM._capital =', GM._capital);
    console.log('[smoke-letter] GM.chars count =', (GM.chars||[]).length);

    // 找 孙承宗
    const ch = (sandbox.GM.chars||[]).find(c => c.name === '孙承宗');
    console.log('[smoke-letter] 孙承宗:', ch ? `at ${ch.location}` : 'NOT FOUND');

    // 手动注入一封 letter（模拟 _endTurn_collectInput 创建的 edict 信函）
    if (!sandbox.GM.letters) sandbox.GM.letters = [];
    const dpv = sandbox._getDaysPerTurn ? sandbox._getDaysPerTurn() : 30;
    const days = sandbox.calcLetterDays ? sandbox.calcLetterDays(sandbox.GM._capital, ch.location, 'normal') : 20;
    const deliveryTurns = Math.max(1, Math.ceil(days / dpv));
    const letter = {
      id: 'test_letter_1',
      from: '玩家', to: '孙承宗',
      fromLocation: sandbox.GM._capital, toLocation: ch.location,
      content: '【政令】令孙承宗为地方督抚辽东经略。',
      sentTurn: sandbox.GM.turn,
      deliveryTurn: sandbox.GM.turn + deliveryTurns,
      replyTurn: sandbox.GM.turn + deliveryTurns + 1,
      reply: '', status: 'traveling',
      urgency: 'normal', letterType: 'formal_edict',
      _autoFromEdict: true
    };
    sandbox.GM.letters.push(letter);
    console.log('[smoke-letter] letter pushed: sentTurn=' + letter.sentTurn + ' deliveryTurn=' + letter.deliveryTurn + ' (days=' + days + ' dpv=' + dpv + ')');

    // 通过 SettlementPipeline 走真实链路（验证 top-level 注册是否生效）
    const pipe = sandbox.SettlementPipeline;
    if (!pipe) { console.error('SettlementPipeline undefined!'); process.exit(1); }
    const stepNames = pipe.list().map(s => s.id);
    console.log('[smoke-letter] pipeline steps incl:', stepNames.indexOf('letters') >= 0 ? '✓ letters registered' : '✗ letters MISSING');

    function runPipeLetters() {
      const ctx = { timeRatio: 0.25, turn: sandbox.GM.turn };
      const beforeLog = sandbox.console.log;
      try { pipe.runBySchedule('perturn', ctx); } catch(e) { console.warn('pipeline err', e.message); }
    }

    console.log('\n--- TURN', sandbox.GM.turn, '(letter sent this turn) ---');
    runPipeLetters();
    console.log('  letter.status =', letter.status, '(expected traveling: still in transit)');

    // 推进 turn
    sandbox.GM.turn++;
    console.log('\n--- TURN', sandbox.GM.turn, '(should arrive) ---');
    runPipeLetters();
    console.log('  letter.status =', letter.status, '(expected delivered/replying/returned)');
    console.log('  letter.reply =', String(letter.reply||'').slice(0, 60));

    // 推进
    sandbox.GM.turn++;
    console.log('\n--- TURN', sandbox.GM.turn, '(should be returned) ---');
    runPipeLetters();
    console.log('  letter.status =', letter.status);
    console.log('  letter.reply =', String(letter.reply||'').slice(0, 80));

    // 同时测试 NPC 来函：模拟一封 _pendingNpcLetters
    if (!sandbox.GM._pendingNpcLetters) sandbox.GM._pendingNpcLetters = [];
    sandbox.GM._pendingNpcLetters.push({
      from: '孙承宗', type: 'report', urgency: 'normal',
      content: '辽东战况：后金压境，请增援。',
      suggestion: '调拨饷银 50 万'
    });
    console.log('\n--- TURN', sandbox.GM.turn, '(NPC letter pending) ---');
    runPipeLetters();
    const npcLetter = sandbox.GM.letters.find(l => l._npcInitiated);
    console.log('  npcLetter created:', !!npcLetter);
    if (npcLetter) console.log('  npcLetter.status =', npcLetter.status, 'deliveryTurn=', npcLetter.deliveryTurn);

    sandbox.GM.turn++;
    console.log('\n--- TURN', sandbox.GM.turn, '(NPC letter should arrive) ---');
    runPipeLetters();
    if (npcLetter) console.log('  npcLetter.status =', npcLetter.status);

    process.exit(0);
  } catch (e) {
    console.error('SIMULATION ERROR:', e.message, e.stack);
    process.exit(1);
  }
}, 200);
