#!/usr/bin/env node
// scripts/smoke-chaoyi-interject-respond.js
// 2026-07-03·锁住『廷议/御前中途插话』移植——共享智能响应器 _cyInterjectRespond 的选人逻辑
//
// 玩家报·廷议/御前无法像常朝那样中途插话。真因·pending 玩家插言只在第一阶段循环消费(辩论/轮询阶段不读)·
//        且响应弱(廷议随机挑人·御前无响应)。修·新共享 _cyInterjectRespond(点名>代词>相关者选人)+接进各循环。
// 本测·vm 加载 tm-chaoyi.js·stub callAI/addCYBubble·验插言按点名/代词/诸卿选对回应者。

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0, failed = 0;
function assert(cond, msg){ if(cond) passed++; else { failed++; console.error('  ✗ '+msg); } }

let bubbles = [];  // 捕获 addCYBubble 的 (name, reply) —— 即回应者
function makeCtx() {
  const ctx = { console: { log(){}, warn(){}, error(){} }, Math, JSON, Object, Array, String, Number, Boolean, RegExp, parseInt, parseFloat, isNaN, isFinite, Promise, setTimeout: (f)=>f&&f(), clearTimeout: ()=>{} };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  ctx.CY = { open: true, _abortChaoyi: false, _pendingPlayerLine: null };
  ctx.callAI = async (p) => {
    // 从 prompt 的「你扮演X（」抽出扮演者·回一句带其名的话·令测试可判"谁回应"
    var m = String(p).match(/你扮演([^（(]+)[（(]/);
    var who = m ? m[1].trim() : '?';
    return '{"line":"臣' + who + '谨对：容臣细陈。","newStance":""}';
  };
  ctx.extractJSON = (raw) => { try { return JSON.parse(raw); } catch(e){ return null; } };
  ctx.addCYBubble = (name, html, sys, reply) => { if (name !== '内侍' && name !== '皇帝') bubbles.push({ name: name, reply: !!reply }); };
  ctx.findCharByName = (n) => ({ name: n, officialTitle: n + '·某官', personality: '刚直', loyalty: 60, party: '无' });
  ctx.escHtml = (s) => String(s);
  ctx._cy_jishiAdd = () => {};
  ctx._aiDialogueTok = () => 400;
  ctx._aiDialogueWordHint = () => '';
  ctx._useSecondaryTier = () => true;
  ctx.toast = () => {};
  vm.createContext(ctx);
  // 只需 tm-chaoyi.js(含 _cyInterjectRespond)·其顶层皆函数声明·加载无副作用
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-chaoyi.js'), 'utf8'), ctx, { filename: 'tm-chaoyi.js' });
  // ★tm-chaoyi.js 自身定义了 addCYBubble(用 document)·加载会覆盖上面的 stub→加载后重新覆盖·免真函数触 DOM 抛错被吞
  ctx.addCYBubble = (name, html, sys, reply) => { if (name !== '内侍' && name !== '皇帝') bubbles.push({ name: name, reply: !!reply }); };
  // callAI 捕获每次 prompt·供行为锁断言"约束真落进每个 responder 的 prompt"
  ctx._prompts = [];
  ctx.callAI = async (p) => { ctx._prompts.push(String(p)); var m = String(p).match(/你扮演([^（(]+)[（(]/); var who = m ? m[1].trim() : '?'; return '{"line":"臣' + who + '谨对。","newStance":""}'; };
  ctx.extractJSON = (raw) => { try { return JSON.parse(raw); } catch(e){ return null; } };
  ctx.findCharByName = (n) => ({ name: n, officialTitle: n + '·某官', personality: '刚直', loyalty: 60, party: '无' });
  ctx.escHtml = (s) => String(s);
  ctx._cy_jishiAdd = () => {};
  // sentinel 版时空约束(行为锁)：返回可识别标记(编入 ch 值与 mentionedNames)·扫描命中"魏忠贤"即回填名单。
  //   注入被守卫改 if(false)/删除→prompt 无 <<TC>>；删扫描→无魏忠贤；换 ch→ch 值不符·三向皆红。
  ctx._buildTemporalConstraint = (ch, opts) => '\n<<TC ch=' + (ch === null ? 'null' : (ch && ch.name) || '?') + ' mn=[' + (((opts && opts.mentionedNames) || []).join('|')) + ']>>';
  ctx._tcScanMentionedNames = (text, seeds, cap) => { const out = (seeds || []).slice(); if (String(text || '').indexOf('魏忠贤') >= 0 && out.indexOf('魏忠贤') < 0) out.push('魏忠贤'); return out; };
  return ctx;
}

const ATT = ['温体仁', '毕自严', '韩爌', '倪元璐'];

async function run() {
  console.log('===== 点名·话中提到谁·谁回应 =====');
  (function(){ bubbles = []; const ctx = makeCtx(); })();
  let ctx = makeCtx(); bubbles = [];
  await ctx._cyInterjectRespond('温体仁，你此议未免误国，作何解释？', { kind:'tinyi', topic:'辽饷', attendees: ATT, stances: {} });
  assert(bubbles.length === 1 && bubbles[0].name === '温体仁', '点名温体仁→只温体仁回应 (得 ' + bubbles.map(b=>b.name).join('/') + ')');

  console.log('===== 代词·"卿以为"→上一发言者回应 =====');
  ctx = makeCtx(); bubbles = [];
  await ctx._cyInterjectRespond('卿以为如何？', { kind:'tinyi', topic:'辽饷', attendees: ATT, stances: {}, lastSpeaker: '毕自严' });
  assert(bubbles.length === 1 && bubbles[0].name === '毕自严', '代词卿→上一发言者毕自严 (得 ' + bubbles.map(b=>b.name).join('/') + ')');

  console.log('===== 诸卿·群体·多人回应 =====');
  ctx = makeCtx(); bubbles = [];
  await ctx._cyInterjectRespond('诸卿都说说，此饷从何而出？', { kind:'tinyi', topic:'辽饷', attendees: ATT, stances: {} });
  assert(bubbles.length >= 2 && bubbles.length <= 3, '诸卿→2-3 人回应 (得 ' + bubbles.length + ')');
  assert(bubbles.every(b => ATT.indexOf(b.name) >= 0), '回应者都是在场者');

  console.log('===== 泛问·无点名·1-2 相关者回应(非崩溃) =====');
  ctx = makeCtx(); bubbles = [];
  await ctx._cyInterjectRespond('此事当如何决断？', { kind:'yuqian', topic:'和战', attendees: ATT, stances: {} });
  assert(bubbles.length >= 1 && bubbles.length <= 2, '泛问→1-2 人 (得 ' + bubbles.length + ')');
  assert(bubbles.every(b => ATT.indexOf(b.name) >= 0), '御前回应者都是在场心腹');

  console.log('===== 边界·无在场者→静默不崩 =====');
  ctx = makeCtx(); bubbles = [];
  await ctx._cyInterjectRespond('谁在？', { kind:'tinyi', topic:'x', attendees: [] });
  assert(bubbles.length === 0, '无 attendees→无回应不崩 (得 ' + bubbles.length + ')');

  console.log('===== 点名优先于代词 =====');
  ctx = makeCtx(); bubbles = [];
  await ctx._cyInterjectRespond('韩爌，你且说说', { kind:'tinyi', topic:'x', attendees: ATT, stances: {}, lastSpeaker: '毕自严' });
  assert(bubbles.length === 1 && bubbles[0].name === '韩爌', '既点名韩爌又有"你"→点名优先韩爌 (得 ' + bubbles.map(b=>b.name).join('/') + ')');

  console.log('===== Codex①·"你们"是群体非单指上一发言者 =====');
  ctx = makeCtx(); bubbles = [];
  await ctx._cyInterjectRespond('你们都说说，此事如何？', { kind:'tinyi', topic:'x', attendees: ATT, stances: {}, lastSpeaker: '毕自严' });
  assert(bubbles.length >= 2, '"你们"应多人回应·非只上一发言者 (得 ' + bubbles.length + ' 人:' + bubbles.map(b=>b.name).join('/') + ')');

  console.log('===== Codex疑1·长名命中不牵连被包含的短名 =====');
  ctx = makeCtx(); bubbles = [];
  var ATT2 = ['王安石', '王安', '司马光'];
  await ctx._cyInterjectRespond('王安石旧法可复行乎？', { kind:'tinyi', topic:'新法', attendees: ATT2, stances: {} });
  assert(bubbles.length === 1 && bubbles[0].name === '王安石', '点名王安石·不应牵连王安 (得 ' + bubbles.map(b=>b.name).join('/') + ')');

  console.log('===== Codex②·会话已散(CY.open=false)→静默不写 =====');
  ctx = makeCtx(); bubbles = []; ctx.CY.open = false;
  await ctx._cyInterjectRespond('温体仁，你怎么看', { kind:'tinyi', topic:'x', attendees: ATT, stances: {} });
  assert(bubbles.length === 0, '会话已散→不写气泡 (得 ' + bubbles.length + ')');

  console.log('===== Codex③·共享 _cyCannotAttend 覆盖全变体 =====');
  ctx = makeCtx();
  var CA = ctx._cyCannotAttend;
  assert(typeof CA === 'function', '_cyCannotAttend 已导出');
  assert(CA({ _jailed: true }) === true, '_jailed 变体判受限');
  assert(CA({ _inJail: true }) === true, '_inJail 变体判受限');
  assert(CA({ health: 8 }) === true, 'health<=10(病危)判受限');
  assert(CA({ health: 'dead' }) === true, "health==='dead' 判受限");
  assert(CA({ health: 'imprisoned' }) === true, "health==='imprisoned' 判受限");
  assert(CA({ _status: 'sick_grave' }) === true, "_status==='sick_grave' 判受限");
  assert(CA({ _imprisoned: true }) === true, '_imprisoned 判受限');
  assert(CA({ name: '在朝者', health: 90, loyalty: 60 }) === false, '正常在朝者不判受限');

  // ── 时空约束·行为锁(2026-07-19·Codex 复审加固)：真跑 _cyInterjectRespond·锁"约束落进每个 responder 的 prompt" ──
  console.log('===== 时空约束·诸卿·每个 responder 的 prompt 都注入(守卫/扫描/ch 三向锁) =====');
  ctx = makeCtx(); bubbles = [];
  await ctx._cyInterjectRespond('诸卿都说说，魏忠贤当如何处置？', { kind:'tinyi', topic:'阉党清算', attendees: ATT, stances: {} });
  var proms = ctx._prompts;
  assert(proms.length >= 2, '诸卿→多 responder 各发一次 prompt (得 ' + proms.length + ')');
  assert(proms.every(p => p.indexOf('<<TC ch=') >= 0), '每个 responder 的 prompt 都须含时空约束(守卫改 if(false)/删注入则红)');
  assert(proms.every(p => p.indexOf('魏忠贤') >= 0), '玩家话中"魏忠贤"须经扫描进每个 prompt 的 mentionedNames(删扫描则红)');
  assert(proms.every(p => { var m = p.match(/你扮演([^（(]+)[（(]/); var who = m ? m[1].trim() : '?'; return p.indexOf('<<TC ch=' + who + ' ') >= 0; }), '每个 prompt 的约束 ch 须为该 responder 本人=findCharByName(nm)(换 ch 则红)');

  console.log('===== 时空约束·点名单人也注入·扫描命中涉议人 =====');
  ctx = makeCtx(); bubbles = [];
  await ctx._cyInterjectRespond('温体仁，魏忠贤之事你怎么看？', { kind:'yuqian', topic:'阉党', attendees: ATT, stances: {} });
  assert(ctx._prompts.length === 1, '点名温体仁→只一次 prompt (得 ' + ctx._prompts.length + ')');
  assert(ctx._prompts[0].indexOf('<<TC ch=温体仁 ') >= 0, '点名口·prompt 注入约束且 ch=温体仁(响应者)');
  assert(ctx._prompts[0].indexOf('魏忠贤') >= 0, '点名口·话中魏忠贤(非在场者)经扫描进 mentionedNames·防按史实答"已伏诛"');

  console.log('');
  console.log(`[smoke-chaoyi-interject-respond] ${passed} passed / ${failed} failed`);
  if (failed > 0) process.exit(1);
}
run();
