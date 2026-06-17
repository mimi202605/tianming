#!/usr/bin/env node
// scripts/smoke-changchao-mode-pipeline.js
// 常朝大改 Slice 8 主守门 smoke·验 6-layer mode pipeline 不崩
//
// 不需 game runtime / LLM·node 直接跑·模拟 _cc3_aiGenReact 内部的 6 层 mode pipeline
//
// 用法·node web/scripts/smoke-changchao-mode-pipeline.js

'use strict';

// ─── helper·跟 tm-chaoyi-changchao.js 同步·改时手动同步 ───
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
  if (a === 'support' && b === 'oppose') return true;
  if (a === 'oppose' && b === 'support') return true;
  return false;
}
function inferDims(text) {
  if (!text || typeof text !== 'string') return null;
  const dims = { boldness:0, compassion:0, rationality:0, greed:0, honor:0, sociability:0, vengefulness:0, energy:0 };
  let hits = 0;
  if (/勇敢|勇猛|刚直|刚毅|敢言|不畏|无畏|刚强|果敢|敢于|豪侠|忠勇|沉勇|武人/.test(text)) { dims.boldness += 0.4; hits++; }
  if (/怯懦|畏缩|胆小|怕事|避祸|懦弱|畏怯|软弱|优柔|柔弱/.test(text)) { dims.boldness -= 0.4; hits++; }
  if (/仁善|仁厚|宽仁|爱民|怜悯|不忍|心慈|恻隐|温顺|温和|和善/.test(text)) { dims.compassion += 0.4; hits++; }
  if (/冷酷|冷漠|残忍|严苛|凉薄|薄情|狠辣|刻薄|无情/.test(text)) { dims.compassion -= 0.4; hits++; }
  if (/理性|务实|深思|审慎|稳重|冷静|权衡|计虑|计谋|沉稳|老成持重|机变|机敏|有谋|善守|城府|谨慎|识大体|识进退|不喜形色|节俭|聪慧/.test(text)) { dims.rationality += 0.4; hits++; }
  if (/冲动|偏激|急躁|莽撞|意气|轻率|昏聩|任性/.test(text)) { dims.rationality -= 0.4; hits++; }
  if (/贪|聚敛|好利|敛财|爱财|图利|逐利|风流/.test(text)) { dims.greed += 0.4; hits++; }
  if (/清廉|淡泊|寡欲|不贪|不慕|安贫|节俭/.test(text)) { dims.greed -= 0.4; hits++; }
  if (/名节|气节|清议|清流|耿介|忠直|刚正|节操|大义|守节|贞节|贞烈|贞静|重然诺|忠诚|忠悃/.test(text)) { dims.honor += 0.5; hits++; }
  if (/失节|无耻|附阉|逢迎|苟合|圆滑/.test(text)) { dims.honor -= 0.4; hits++; }
  if (/善交|结好|合群|和气|圆通|长袖善舞|好好先生/.test(text)) { dims.sociability += 0.4; hits++; }
  if (/孤僻|寡言|不群|独行|孤介|闷葫芦/.test(text)) { dims.sociability -= 0.4; hits++; }
  if (/睚眦必报|记仇|复仇|怀怨|心狭|心狠/.test(text)) { dims.vengefulness += 0.5; hits++; }
  if (/宽厚|能容|不计前嫌|大度|隐忍|坚韧/.test(text)) { dims.vengefulness -= 0.4; hits++; }
  if (/勤勉|精干|干练|励精|尽心|勤政|敏锐|急切/.test(text)) { dims.energy += 0.4; hits++; }
  if (/懒散|怠政|拖沓|疏懒|脾性软弱/.test(text)) { dims.energy -= 0.4; hits++; }
  return hits > 0 ? dims : null;
}

// ─── 模拟 base mode ───
function baseMode(state, gmCh, item) {
  if (item && item.target === gmCh.name) return 'rebut';
  if (state.priorCount === 0) return 'lead';
  if (state.lastSamePartyAsMe && state.lastStance === state.myStance) return 'second';
  if (!state.lastSamePartyAsMe && oppositeStance(state.lastStance, state.myStance)) return 'rebut';
  if (state.lastSamePartyAsMe && state.lastStance !== state.myStance) return 'soften';
  if (state.myStance === 'neutral') return 'pivot';
  return 'augment';
}

// ─── 模拟 persona modulation·强制规则部分 ───
function modulateByPersona(mode, dims, item, state) {
  const result = { mode, modifiers: { cite:false, force:false, reason:'' } };
  if (!dims) return result;
  const tags = item.tags || [];
  // 强制·名节高 ritual
  if (dims.honor >= 0.7 && tags.indexOf('ritual') >= 0) {
    result.mode = 'rebut'; result.modifiers.force = true; result.modifiers.reason = 'honor + ritual';
  }
  // 强制·仁善高 penal-harsh
  else if (dims.compassion >= 0.5 && tags.indexOf('penal-harsh') >= 0) {
    result.mode = 'soften'; result.modifiers.force = true; result.modifiers.reason = 'compassion + penal-harsh';
  }
  // cite modifier
  if (dims.rationality >= 0.5 && tags.indexOf('historicalPrecedent') >= 0) {
    result.modifiers.cite = true;
  }
  // 弱·compassion ≥ 0.3 + base rebut → soften
  if (!result.modifiers.force && mode === 'rebut' && dims.compassion >= 0.3 && (!state || state.oppStanceCount < 3)) {
    result.mode = 'soften'; result.modifiers.reason = 'compassion ≥0.3·weak rebut → soften';
  }
  return result;
}

// ─── 模拟 anti-monotony Guard 1 ───
function guardMonotony(mode, item) {
  const modesSoFar = (item.selfReact || []).map(r => r._mode).filter(Boolean)
    .concat((item.debate || []).map(d => d._mode).filter(Boolean));
  const counts = {};
  modesSoFar.forEach(m => { counts[m] = (counts[m] || 0) + 1; });
  if (counts[mode] >= 3) {
    if (mode === 'rebut')  return 'soften';
    if (mode === 'second') return 'augment';
    if (mode === 'pivot')  return 'augment';
  }
  return mode;
}

let pass = 0, fail = 0;
const failures = [];
function check(label, cond) { if (cond) pass++; else { fail++; failures.push(label); } }

// ─── Test 1·完整 pipeline·六层应答全流程 ───
{
  const chars = {
    '李纲':   { name: '李纲',   party: '主战派', personality: '刚直急切·制度感强·不肯妥协·罢后忧愤而不悔' },
    '宗泽':   { name: '宗泽',   party: '主战派', personality: '刚直·忠诚·不顾己身·屡奏不报犹奏' },
    '黄潜善': { name: '黄潜善', party: '主和派', personality: '阴狡·逢迎·圆滑·主和派当权' },
    '陈东':   { name: '陈东',   party: '太学清流', class: 'kdao', personality: '清流耿介·勇敢敢言·名节自持·上书直陈' },
  };
  const item = {
    title: '南幸扬州议',
    detail: '金人将至 应天孤悬',
    tags: ['foreign-policy'],
    controversial: 8,
    selfReact: [
      { name: '黄潜善', stance: 'support', line: '南幸为宜', _mode: 'lead', _aiGen: true },
    ],
    debate: [],
  };

  // 李纲 跑·应推 rebut (主战 vs 主和异党·support vs oppose)
  const ngmCh = chars['李纲'];
  const dims = inferDims(ngmCh.personality);
  check('1·李纲 dims 非空 (boldness 推到)', !!dims && dims.boldness !== 0);

  // 模拟 state
  const myStance = 'oppose';
  const prior = item.selfReact;
  const last = prior[prior.length - 1];
  const state = {
    priorCount: prior.length,
    lastSpeaker: last.name,
    lastStance: last.stance,
    lastSamePartyAsMe: sameParty(chars[last.name], ngmCh),
    myStance,
    sameStanceCount: 0,
    oppStanceCount: 1,
    alliesPiledOn: 0,
    alliesLost: 0,
    momentum: 'split',
  };

  const mode1 = baseMode(state, ngmCh, item);
  check('1·李纲 base mode = rebut', mode1 === 'rebut');

  const gateMode = guardMonotony(mode1, item);
  check('1·monotony guard 不变 rebut (counts.rebut=0)', gateMode === 'rebut');

  const modulated = modulateByPersona(gateMode, dims, item, state);
  // compassion 在李纲 personality 没明显·boldness 有·所以 rebut 不会被 compassion 弱修正
  check('1·李纲 modulated mode 不变 (无 compassion)', modulated.mode === 'rebut');
}

// ─── Test 2·persona 触发 compassion·rebut → soften ───
// 注意·fallback 单 regex 命中 = 0.4·达不到 0.5 强制阈值·只触发 0.3 弱修正
// 强制阈值仅对 traitIds 聚合 (多 trait 累加 0.5+) 适用·实际游戏中常见
{
  const dimsFromTraits = { boldness:0, compassion:0.6, rationality:0, greed:0, honor:0, sociability:0, vengefulness:0, energy:0 };
  const item = { title: '诛某官', tags: ['penal-harsh'], controversial: 5, selfReact: [], debate: [] };
  check('2·dims.compassion 0.6 (模拟 traitIds 聚合)', dimsFromTraits.compassion >= 0.5);
  const result = modulateByPersona('rebut', dimsFromTraits, item, { oppStanceCount: 0 });
  check('2·penal-harsh + compassion ≥0.5 强制 → soften', result.mode === 'soften' && result.modifiers.force);
}

// ─── Test 2b·fallback 单 hit·只触发弱修正 ───
{
  const gmCh = { name: '范仲淹', party: '清流', personality: '仁善爱民·宽仁·心慈' };
  const item = { title: '诛某官', tags: ['penal-harsh'], controversial: 5, selfReact: [], debate: [] };
  const dims = inferDims(gmCh.personality);
  check('2b·范仲淹 fallback compassion ≥0.3', dims && dims.compassion >= 0.3);
  check('2b·fallback compassion < 0.5 (单 hit 限制)', dims && dims.compassion < 0.5);
  // 弱修正·rebut + compassion ≥0.3 + oppStanceCount<3 → soften (非 force)
  const result = modulateByPersona('rebut', dims, item, { oppStanceCount: 0 });
  check('2b·弱修正·rebut → soften', result.mode === 'soften' && !result.modifiers.force);
}

// ─── Test 3·anti-monotony·3 rebut 后·下一 rebut → soften ───
{
  const item = {
    selfReact: [
      { name: 'A', _mode: 'rebut' },
      { name: 'B', _mode: 'rebut' },
      { name: 'C', _mode: 'rebut' },
    ],
    debate: [],
  };
  const out = guardMonotony('rebut', item);
  check('3·3 rebut 后 guard 改 soften', out === 'soften');
}

// ─── Test 4·cite modifier·rationality 高 + historicalPrecedent ───
// 用 traitIds 聚合·模拟 rationality 0.6 (多个 calm/patient/diligent traits stack)
{
  const dims = { boldness:0, compassion:0, rationality:0.6, greed:0, honor:0, sociability:0, vengefulness:0, energy:0 };
  const item = { tags: ['historicalPrecedent'] };
  const result = modulateByPersona('augment', dims, item, {});
  check('4·rationality ≥0.5 + historicalPrecedent → cite modifier', result.modifiers.cite);
}

// ─── Test 5·dims source·tracking ───
// 此 test 只是 sanity·确认 inferDims 不抛错
{
  const dims = inferDims('刚直·勇敢·忠诚·勤勉');
  check('5·dims 多维同时填', dims && dims.boldness !== 0 && dims.honor !== 0 && dims.energy !== 0);
}

console.log('[smoke-changchao-mode-pipeline] pass·' + pass + '·fail·' + fail);
if (failures.length) {
  console.log('失败项·');
  failures.forEach(f => console.log('  ·' + f));
  process.exit(1);
}
console.log('[smoke-changchao-mode-pipeline] PASS');
process.exit(0);
