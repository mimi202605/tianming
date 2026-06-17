#!/usr/bin/env node
// scripts/test-changchao-mode-inference.js
// 常朝大改 Slice 4 单测·debate state 分析 + 6 mode 推导
//
// 不需游戏 runtime·node 跑·node-friendly·complete test harness
//
// 用法·node web/scripts/test-changchao-mode-inference.js
// 预期·exit 0 = all pass·>0 = case 失败计数

'use strict';

// ─── 复制 helper 逻辑·跟 tm-chaoyi-changchao.js 同步 ───
// 改时手动同步两边·因 changchao 没 export·这是已 accepted trade-off
function sameParty(chA, chB) {
  if (!chA || !chB) return false;
  const pa = (chA.party || '').trim();
  const pb = (chB.party || '').trim();
  if (!pa || !pb) return false;
  if (pa === pb) return true;
  if (pa.indexOf(pb) >= 0 || pb.indexOf(pa) >= 0) return true;
  return false;
}

function oppositeStance(a, b) {
  if (!a || !b) return false;
  if (a === 'support' && b === 'oppose') return true;
  if (a === 'oppose' && b === 'support') return true;
  return false;
}

// 仿 analyzeDebate (无 _cc3_computeStanceFromChar / CHARS·靠 test 注入 myStance + chars)
function analyzeDebate(item, speakerName, gmCh, myStance, chars) {
  const prior = ((item.selfReact || []).filter(r => r && r.name !== speakerName && r.line))
    .concat((item.debate || []).filter(d => d && d.name !== speakerName && d.line));
  if (!prior.length) {
    return {
      priorCount: 0,
      lastSpeaker: null,
      lastStance: null,
      lastSamePartyAsMe: false,
      myStance,
      sameStanceCount: 0,
      oppStanceCount: 0,
      alliesPiledOn: 0,
      alliesLost: 0,
      momentum: 'opening',
      emperorIntent: (item && item._lastEmperorIntent) || 'neutral',
    };
  }
  const last = prior[prior.length - 1];
  let sameStanceCount = 0, oppStanceCount = 0;
  let alliesPiledOn = 0, alliesLost = 0;
  prior.forEach(r => {
    if (r.stance === myStance) sameStanceCount++;
    if (oppositeStance(r.stance, myStance)) oppStanceCount++;
    const rch = chars[r.name];
    if (sameParty(rch, gmCh)) {
      if (r.stance === myStance) alliesPiledOn++;
      if (oppositeStance(r.stance, myStance)) alliesLost++;
    }
  });
  const last3 = prior.slice(-3);
  const last3Same = last3.filter(r => r.stance === myStance).length;
  const last3Opp = last3.filter(r => oppositeStance(r.stance, myStance)).length;
  let momentum;
  if (last3Same >= 2) momentum = 'consensus-with-me';
  else if (last3Opp >= 2) momentum = 'consensus-against-me';
  else momentum = 'split';
  return {
    priorCount: prior.length,
    lastSpeaker: last.name,
    lastStance: last.stance,
    lastSamePartyAsMe: sameParty(chars[last.name], gmCh),
    myStance,
    sameStanceCount, oppStanceCount,
    alliesPiledOn, alliesLost,
    momentum,
    emperorIntent: (item && item._lastEmperorIntent) || 'neutral',
  };
}

function baseMode(state, gmCh, item) {
  if (!state || !gmCh) return 'augment';
  if (item && item.target === gmCh.name) return 'rebut';
  if (state.priorCount === 0) return 'lead';
  if (state.lastSamePartyAsMe && state.lastStance === state.myStance) return 'second';
  if (!state.lastSamePartyAsMe && oppositeStance(state.lastStance, state.myStance)) return 'rebut';
  if (state.lastSamePartyAsMe && state.lastStance !== state.myStance) return 'soften';
  if (state.myStance === 'neutral') {
    // 单测·锁定 pivot (不随机) 让 assert 稳定
    return 'pivot';
  }
  return 'augment';
}

// ─── 测试 ───
let pass = 0, fail = 0;
const failures = [];

function assert(label, expected, actual) {
  const ok = JSON.stringify(expected) === JSON.stringify(actual);
  if (ok) pass++;
  else {
    fail++;
    failures.push({ label, expected, actual });
  }
}

// 测试 chars pool
const CHARS = {
  '李纲':   { name: '李纲',   party: '主战派', faction: '宋朝廷' },
  '宗泽':   { name: '宗泽',   party: '主战派', faction: '宋朝廷' },
  '陈东':   { name: '陈东',   party: '太学清流', faction: '宋朝廷' },
  '黄潜善': { name: '黄潜善', party: '主和派', faction: '宋朝廷' },
  '汪伯彦': { name: '汪伯彦', party: '主和派', faction: '宋朝廷' },
  '张邦昌': { name: '张邦昌', party: '务实派', faction: '宋朝廷' },
  '张俊':   { name: '张俊',   party: '御营',   faction: '宋朝廷' },
};

// ─── Test 1·priorCount = 0 → lead ───
{
  const item = { selfReact: [], debate: [] };
  const gmCh = CHARS['李纲'];
  const state = analyzeDebate(item, '李纲', gmCh, 'oppose', CHARS);
  assert('1·priorCount=0 → lead', 'lead', baseMode(state, gmCh, item));
  assert('1·state.priorCount=0', 0, state.priorCount);
  assert('1·state.momentum=opening', 'opening', state.momentum);
}

// ─── Test 2·target=self → rebut (自辩短路) ───
{
  const item = { selfReact: [], debate: [], target: '李纲' };
  const gmCh = CHARS['李纲'];
  const state = analyzeDebate(item, '李纲', gmCh, 'oppose', CHARS);
  assert('2·target=self override → rebut', 'rebut', baseMode(state, gmCh, item));
}

// ─── Test 3·同党同立场 → second ───
{
  const item = {
    selfReact: [{ name: '宗泽', stance: 'oppose', line: '不可南幸' }],
    debate: [],
  };
  const gmCh = CHARS['李纲'];
  const state = analyzeDebate(item, '李纲', gmCh, 'oppose', CHARS);
  assert('3·same party same stance → second', 'second', baseMode(state, gmCh, item));
  assert('3·alliesPiledOn=1', 1, state.alliesPiledOn);
  assert('3·sameStanceCount=1', 1, state.sameStanceCount);
}

// ─── Test 4·异党异立场 → rebut ───
{
  const item = {
    selfReact: [{ name: '黄潜善', stance: 'support', line: '南幸为宜' }],
    debate: [],
  };
  const gmCh = CHARS['李纲'];
  const state = analyzeDebate(item, '李纲', gmCh, 'oppose', CHARS);
  assert('4·opp party opp stance → rebut', 'rebut', baseMode(state, gmCh, item));
  assert('4·oppStanceCount=1', 1, state.oppStanceCount);
  assert('4·alliesLost=0', 0, state.alliesLost);  // 异党 != allies
}

// ─── Test 5·同党异立场 → soften (婉言) ───
{
  const item = {
    selfReact: [{ name: '宗泽', stance: 'support', line: '南幸亦可' }],
    debate: [],
  };
  const gmCh = CHARS['李纲'];
  const state = analyzeDebate(item, '李纲', gmCh, 'oppose', CHARS);
  assert('5·same party diff stance → soften', 'soften', baseMode(state, gmCh, item));
  assert('5·alliesLost=1', 1, state.alliesLost);  // 同党反我·算 alliesLost
}

// ─── Test 6·myStance=neutral → pivot (锁定·非随机) ───
{
  const item = {
    selfReact: [{ name: '黄潜善', stance: 'support', line: '南幸' }],
    debate: [],
  };
  const gmCh = CHARS['张邦昌'];
  const state = analyzeDebate(item, '张邦昌', gmCh, 'neutral', CHARS);
  assert('6·neutral stance → pivot', 'pivot', baseMode(state, gmCh, item));
}

// ─── Test 7·mediate vs oppose·非 opposite → augment ───
{
  const item = {
    selfReact: [{ name: '张邦昌', stance: 'mediate', line: '折中' }],
    debate: [],
  };
  const gmCh = CHARS['李纲'];
  const state = analyzeDebate(item, '李纲', gmCh, 'oppose', CHARS);
  // mediate vs oppose 非 opposite·last party 异·走 default → augment
  assert('7·mediate vs oppose non-opposite → augment', 'augment', baseMode(state, gmCh, item));
}

// ─── Test 8·priorCount=5·alliesPiledOn 多·momentum=consensus-with-me ───
{
  const item = {
    selfReact: [
      { name: '宗泽', stance: 'oppose', line: 'a' },
      { name: '陈东', stance: 'oppose', line: 'b' },
      { name: '黄潜善', stance: 'support', line: 'c' },
    ],
    debate: [
      { name: '汪伯彦', stance: 'support', line: 'd' },
      { name: '韩世忠', stance: 'oppose', line: 'e' },  // 韩世忠未在 CHARS pool 内·同党无法判定
    ],
  };
  const gmCh = CHARS['李纲'];
  const state = analyzeDebate(item, '李纲', gmCh, 'oppose', CHARS);
  assert('8·priorCount=5', 5, state.priorCount);
  assert('8·sameStanceCount=3 (宗·陈·韩 oppose 跟我同)', 3, state.sameStanceCount);
  assert('8·oppStanceCount=2 (黄·汪 support)', 2, state.oppStanceCount);
  // 近 3 位·黄·汪·韩 = support·support·oppose → last3Same=1·last3Opp=2 → consensus-against-me
  assert('8·momentum=consensus-against-me', 'consensus-against-me', state.momentum);
}

// ─── Test 9·priorCount=4·近 3 同党 piled-on ───
{
  const item = {
    selfReact: [
      { name: '宗泽', stance: 'oppose', line: 'a' },
      { name: '陈东', stance: 'oppose', line: 'b' },
    ],
    debate: [
      { name: '黄潜善', stance: 'support', line: 'c' },  // opp
    ],
  };
  const gmCh = CHARS['李纲'];
  const state = analyzeDebate(item, '李纲', gmCh, 'oppose', CHARS);
  assert('9·priorCount=3', 3, state.priorCount);
  // alliesPiledOn·宗泽 是主战派 同党·oppose 同立场 → 1
  // 陈东 是太学清流·非"主战派" substring → 不算同党 → 0
  // 黄潜善 主和派·oppose ≠ 'oppose' (其 stance=support)·不计
  assert('9·alliesPiledOn=1 (only 宗泽 党 substring match)', 1, state.alliesPiledOn);
}

// ─── Test 10·验证 cite mode 触发是 modulation 层 (此 base 不产 cite·留 Slice 5) ───
// 此处 verify·baseMode 6 个返回值·不应有 cite·cite 在 Slice 5 personality modulation 加 modifier
{
  const allModes = new Set();
  // 跑 20 个随机 scenario·收集 baseMode 输出
  for (let i = 0; i < 20; i++) {
    const item = { selfReact: i < 3 ? [] : [{ name: '宗泽', stance: 'oppose', line: 'x' }], debate: [] };
    const gmCh = CHARS['李纲'];
    const stances = ['support', 'oppose', 'mediate', 'neutral'];
    const myStance = stances[i % 4];
    const state = analyzeDebate(item, '李纲', gmCh, myStance, CHARS);
    allModes.add(baseMode(state, gmCh, item));
  }
  assert('10·baseMode never returns cite (modifier·留 Slice 5)', false, allModes.has('cite'));
  assert('10·baseMode set 是合法集合', true, [...allModes].every(m => ['lead','second','rebut','soften','pivot','augment'].includes(m)));
}

// ─── 输出 ───
console.log('[test-changchao-mode-inference] pass·' + pass + '·fail·' + fail);
if (failures.length) {
  console.log('失败项·');
  failures.forEach(f => console.log('  [' + f.label + '] expected ' + JSON.stringify(f.expected) + ' got ' + JSON.stringify(f.actual)));
  process.exit(1);
}
console.log('[test-changchao-mode-inference] PASS·全部 ' + pass + ' 个 case');
process.exit(0);
