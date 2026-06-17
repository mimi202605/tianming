#!/usr/bin/env node
// scripts/smoke-changchao-persona-stance.js
// 常朝大改·Slice 3 smoke·验·
//   1. _cc3_inferDimsFromPersonalityText 在绍宋 NPC personality 上能命中 ≥ 50%
//   2. 同党同 stat·不同 personality·stance 分布 ≥ 2 种
//
// 用法·node web/scripts/smoke-changchao-persona-stance.js

'use strict';

const fs = require('fs');
const path = require('path');

// ─── 复制 _cc3_inferDimsFromPersonalityText 逻辑·改时同步 ───
function inferDims(text) {
  if (!text || typeof text !== 'string') return null;
  const dims = { boldness:0, compassion:0, rationality:0, greed:0, honor:0, sociability:0, vengefulness:0, energy:0 };
  let hits = 0;
  if (/勇敢|勇猛|刚直|刚毅|敢言|不畏|无畏|刚强|果敢|敢于|豪侠|忠勇|沉勇|武人/.test(text))     { dims.boldness += 0.4; hits++; }
  if (/怯懦|畏缩|胆小|怕事|避祸|懦弱|畏怯|软弱|优柔|柔弱/.test(text))                          { dims.boldness -= 0.4; hits++; }
  if (/仁善|仁厚|宽仁|爱民|怜悯|不忍|心慈|恻隐|温顺|温和|和善/.test(text))                     { dims.compassion += 0.4; hits++; }
  if (/冷酷|冷漠|残忍|严苛|凉薄|薄情|狠辣|刻薄|无情/.test(text))                              { dims.compassion -= 0.4; hits++; }
  if (/理性|务实|深思|审慎|稳重|冷静|权衡|计虑|计谋|沉稳|老成持重|机变|机敏|有谋|善守|城府|谨慎|识大体|识进退|不喜形色|节俭|聪慧/.test(text)) { dims.rationality += 0.4; hits++; }
  if (/冲动|偏激|急躁|莽撞|意气|轻率|昏聩|任性/.test(text))                                   { dims.rationality -= 0.4; hits++; }
  if (/贪|聚敛|好利|敛财|爱财|图利|逐利|风流/.test(text))                                     { dims.greed += 0.4; hits++; }
  if (/清廉|淡泊|寡欲|不贪|不慕|安贫|节俭/.test(text))                                        { dims.greed -= 0.4; hits++; }
  if (/名节|气节|清议|清流|耿介|忠直|刚正|节操|大义|守节|贞节|贞烈|贞静|重然诺|忠诚|忠悃/.test(text)) { dims.honor += 0.5; hits++; }
  if (/失节|无耻|附阉|逢迎|苟合|圆滑/.test(text))                                             { dims.honor -= 0.4; hits++; }
  if (/善交|结好|合群|和气|圆通|长袖善舞|好好先生/.test(text))                                { dims.sociability += 0.4; hits++; }
  if (/孤僻|寡言|不群|独行|孤介|闷葫芦/.test(text))                                           { dims.sociability -= 0.4; hits++; }
  if (/睚眦必报|记仇|复仇|怀怨|心狭|心狠/.test(text))                                          { dims.vengefulness += 0.5; hits++; }
  if (/宽厚|能容|不计前嫌|大度|隐忍|坚韧/.test(text))                                          { dims.vengefulness -= 0.4; hits++; }
  if (/勤勉|精干|干练|励精|尽心|勤政|敏锐|急切/.test(text))                                    { dims.energy += 0.4; hits++; }
  if (/懒散|怠政|拖沓|疏懒|脾性软弱/.test(text))                                              { dims.energy -= 0.4; hits++; }
  return hits > 0 ? dims : null;
}

// ─── 1. 绍宋 NPC personality fallback hit rate ───
const SHAOSONG = path.resolve(__dirname, '..', '..', 'scenarios', '绍宋·建炎元年八月（官方）.json');
if (!fs.existsSync(SHAOSONG)) {
  console.error('[smoke] 绍宋 剧本未找到·skip');
  process.exit(0);
}
const sc = JSON.parse(fs.readFileSync(SHAOSONG, 'utf8'));
const chars = sc.characters || [];

let totalWithPersonality = 0;
let hitsFallback = 0;
const sampleHits = [];
chars.forEach(c => {
  if (!c.personality) return;
  totalWithPersonality++;
  const dims = inferDims(c.personality);
  if (dims) {
    hitsFallback++;
    const nonZeroKeys = Object.keys(dims).filter(k => dims[k] !== 0);
    if (sampleHits.length < 5) {
      sampleHits.push({ name: c.name, personality: c.personality.slice(0, 50), nonZeroDims: nonZeroKeys });
    }
  }
});

const hitRate = totalWithPersonality > 0 ? hitsFallback / totalWithPersonality : 0;
console.log('[smoke-changchao-persona-stance] 绍宋 personality fallback·');
console.log('  chars with personality·' + totalWithPersonality);
console.log('  hit fallback (≥1 keyword)·' + hitsFallback + ' (' + (hitRate * 100).toFixed(1) + '%)');
sampleHits.forEach(s => {
  console.log('    [' + s.name + '] dims·' + s.nonZeroDims.join(',') + '·persona·' + s.personality + '...');
});

if (hitRate < 0.50) {
  console.error('[smoke-changchao-persona-stance] FAIL·绍宋 fallback hit rate ' + (hitRate * 100).toFixed(1) + '% < 50%');
  process.exit(1);
}

// ─── 2. 同党同 stat·不同 personality·dims 分布 ≥ 2 种 ───
// 用 hand-crafted 测试用 personality 字符串组合
const SAME_PARTY_VARIANTS = [
  { name: 'A', personality: '仁善爱民·宽厚能容·勤勉精干' },          // compassion ++, vengefulness --, energy ++
  { name: 'B', personality: '冷酷严苛·睚眦必报·急躁莽撞' },          // compassion --, vengefulness ++, rationality --
  { name: 'C', personality: '清流耿介·刚直敢言·名节自持' },          // honor ++, boldness ++
  { name: 'D', personality: '附阉逢迎·圆滑无耻·贪婪好利' },          // honor --, greed ++
];
const variantDims = SAME_PARTY_VARIANTS.map(v => ({
  name: v.name,
  personality: v.personality,
  dims: inferDims(v.personality),
}));
console.log('\n[smoke] 同党同 stat 不同 persona·dims diff·');
variantDims.forEach(v => {
  const profile = Object.keys(v.dims).filter(k => v.dims[k] !== 0).map(k => k + '·' + v.dims[k].toFixed(1)).join(', ');
  console.log('  [' + v.name + '] ' + profile);
});
// 检查·4 个 variants 至少有 3 套不同的 dims profile
const profiles = new Set(variantDims.map(v => JSON.stringify(v.dims)));
console.log('  distinct dims profiles·' + profiles.size + '/4');
if (profiles.size < 3) {
  console.error('[smoke] FAIL·dims 分布太集中·persona 推导失效');
  process.exit(1);
}

console.log('\n[smoke-changchao-persona-stance] PASS');
process.exit(0);
