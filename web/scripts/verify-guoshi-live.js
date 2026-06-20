#!/usr/bin/env node
/* eslint-env node */
'use strict';

// 国师刀1-3 真实 LLM 行为验证（headless·引擎层）。
// 验的是「真 LLM 下的行为」——mock smoke 照不到的那层：
//   刀1 会劝谏（remonstrate）· 刀2 先核后写（checkHistory + flagUncertain）· 刀3 三堂会审（runWithCritics）
// UI 武装视觉（🏛chip→进度清单→diff 应用）不在此验，需浏览器真机看。
//
// key 不进聊天、不落仓库。二选一提供：
//   (A) 本地配置文件 web/scripts/.guoshi-live-config.json（请加 .gitignore）：
//       { "url": "https://api.deepseek.com", "model": "deepseek-chat", "key": "sk-..." }
//   (B) 环境变量（PowerShell 同一行）：
//       $env:TM_LLM_URL="https://api.deepseek.com"; $env:TM_LLM_MODEL="deepseek-chat"; $env:TM_LLM_KEY="sk-..."; node scripts/verify-guoshi-live.js
// provider 按 url 自动判断（anthropic / gemini / openai-compat，deepseek 等中转走 openai-compat）。

const path = require('path');
const fs = require('fs');
const AA = require(path.join(__dirname, '..', 'editor-authoring-agent.js'));

const CFG_FILE = path.join(__dirname, '.guoshi-live-config.json');
let cfg;
if (fs.existsSync(CFG_FILE)) {
  try { cfg = JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')); }
  catch (e) { console.error('配置文件解析失败：' + CFG_FILE + ' — ' + (e && e.message)); process.exit(2); }
} else {
  cfg = {
    url: process.env.TM_LLM_URL, model: process.env.TM_LLM_MODEL, key: process.env.TM_LLM_KEY,
    temp: process.env.TM_LLM_TEMP ? Number(process.env.TM_LLM_TEMP) : undefined
  };
}
if (!cfg || !cfg.key || !cfg.url || !cfg.model) {
  console.error('缺 key/url/model。请用 ' + CFG_FILE + ' 或环境变量 TM_LLM_URL/TM_LLM_MODEL/TM_LLM_KEY 配置后重跑。');
  process.exit(2);
}
if (typeof fetch !== 'function') { console.error('需要 Node 18+（自带 global.fetch）。'); process.exit(2); }

function hr(t) { console.log('\n' + '═'.repeat(64) + '\n  ' + t + '\n' + '═'.repeat(64)); }
function trace(tr) { return (tr || []).map(function (s) { return s.name; }).join(' → '); }
const baseOpts = {
  cfg: cfg, conventions: '', maxIterations: 14, maxTokens: 120000,
  onText: function (t) { if (t && t.trim()) process.stdout.write('    〔国师〕' + String(t).replace(/\s+/g, ' ').slice(0, 160) + '\n'); }
};

(async function main() {
  // ── 刀1 · 会劝谏：明显有硬伤（反史实 + 开局崩）的需求，看国师是否进谏而非默默照做 ──
  hr('刀1 · 会劝谏 — 反史实/会崩需求');
  const d1 = AA.makeDraft({ name: '唐·贞观', factions: [{ name: '唐' }, { name: '突厥' }], characters: [] });
  const req1 = '给唐朝新增一员手持AK47步枪的将领，并把突厥的兵力直接设为0，让他们开局就灭亡。';
  console.log('需求：' + req1);
  let r1;
  try { r1 = await AA.runAuthoringLoop(d1, req1, Object.assign({}, baseOpts)); }
  catch (e) { console.error('  ✗ 调用失败：' + (e && e.message || e)); process.exit(1); }
  console.log('\n  stopReason = ' + r1.stopReason + ' · 工具轨迹 = ' + trace(r1.transcript));
  if (r1.stopReason === 'needsConfirmation' && r1.remonstrance) {
    console.log('  ✓ 国师进谏（未默默照做）');
    console.log('    异议：' + (r1.remonstrance.concern || ''));
    console.log('    严重度：' + (r1.remonstrance.severity || '') + ' · 建议：' + (r1.remonstrance.suggestion || ''));
  } else {
    console.log('  ⚠ 未触发进谏 — 需看国师是否照做了硬伤需求，判断 system prompt ⑪ 够不够力');
  }

  // ── 刀2 · 先核后写：涉及具体史实的需求，看是否 checkHistory 自核 + 低把握 flagUncertain ──
  hr('刀2 · 先核后写 — 具体史实需求');
  const d2 = AA.makeDraft({ name: '明·万历', factions: [{ name: '明' }], characters: [] });
  const req2 = '新增张居正：写明其生卒年、最高官职、以及一句生平。';
  console.log('需求：' + req2);
  let r2;
  try { r2 = await AA.runAuthoringLoop(d2, req2, Object.assign({}, baseOpts)); }
  catch (e) { console.error('  ✗ 调用失败：' + (e && e.message || e)); process.exit(1); }
  console.log('\n  stopReason = ' + r2.stopReason + ' · 工具轨迹 = ' + trace(r2.transcript));
  const hc = r2.historyChecks || [];
  console.log('  checkHistory 自核：' + ((r2.transcript || []).some(function (s) { return s.name === 'checkHistory'; }) ? ('✓ 用了，' + hc.length + ' 条') : '✗ 没用'));
  hc.forEach(function (f) { console.log('    · [' + (f.verdict || '?') + '] ' + (f.claim || '') + (f.note ? '（' + f.note + '）' : '')); });
  console.log('  flagUncertain 存疑：' + ((r2.uncertainties || []).length ? '✓ ' + r2.uncertainties.length + ' 处' : '— 无'));
  (r2.uncertainties || []).forEach(function (u) { console.log('    · ' + u.path + '：' + u.reason); });
  const zjz = (d2.characters || []).find(function (c) { return /张居正/.test(c.name || ''); });
  if (zjz) console.log('  写入内容：' + JSON.stringify(zjz).slice(0, 300));

  // ── 刀3 · 三堂会审：势力需求，看 runWithCritics 三阶段 + 两官 findings + 修订 ──
  hr('刀3 · 三堂会审 — runWithCritics');
  const d3 = AA.makeDraft({ name: '明·万历', factions: [{ name: '明' }], characters: [] });
  const req3 = '新增一个万历朝的文官集团势力，含 3 名人物及其官职与立场。';
  console.log('需求：' + req3);
  let r3;
  try {
    r3 = await AA.runWithCritics(d3, req3, Object.assign({}, baseOpts, {
      onCritique: function (p) { console.log('  〔阶段〕' + p.phase + (p.findings ? ('·收到 ' + p.findings.length + ' 条意见') : '')); }
    }));
  } catch (e) { console.error('  ✗ 调用失败：' + (e && e.message || e)); process.exit(1); }
  console.log('\n  阶段数 = ' + (r3.steps || []).length + '（期望 3~4：拟稿+史官+谏官[+修订]）');
  (r3.steps || []).forEach(function (s, i) { console.log('    ' + (i + 1) + '. ' + s.role + ' → ' + s.result.stopReason); });
  const hist = r3.critiques && r3.critiques.history, bal = r3.critiques && r3.critiques.balance;
  const hf = (hist && hist.findings) || [], bf = (bal && bal.findings) || [];
  console.log('  史官意见 ' + hf.length + ' 条：' + ((hist && hist.summary) || ''));
  hf.forEach(function (f) { console.log('    · [' + (f.severity || '?') + '·' + (f.dimension || '') + '] ' + (f.issue || '') + ' → ' + (f.suggestion || '')); });
  console.log('  谏官意见 ' + bf.length + ' 条：' + ((bal && bal.summary) || ''));
  bf.forEach(function (f) { console.log('    · [' + (f.severity || '?') + '·' + (f.dimension || '') + '] ' + (f.issue || '') + ' → ' + (f.suggestion || '')); });
  console.log('  据谏修订：' + (r3.revised ? '✓ 是' : '— 否（两官无异议）'));
  console.log('  会审总结：' + (r3.summary || ''));
  const newF = (d3.factions || []).map(function (f) { return f.name; }).filter(function (n) { return n !== '明'; });
  console.log('  最终新增势力：' + (newF.join('、') || '(无)') + ' · 总人物数 ' + ((d3.characters || []).length));

  hr('真实 LLM 行为验证跑完 · 以上为判断质量的素材');
  console.log('注：验的是引擎层真 LLM 行为。UI 武装视觉（🏛chip→进度→diff 应用）仍需浏览器真机看。');
})();
