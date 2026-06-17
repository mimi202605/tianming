#!/usr/bin/env node
// smoke-zoushu-ai-draft.js — 奏疏代拟正文 AI 生成(照辅臣拟议范式·decoupled secondary·机械中文兜底)
//   机械奏疏(民情积压·_needsAiBody)以上奏大臣口吻代拟正经正文·失败/空/夹英文则保确定性中文兜底
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function assert(c, m) { if (c) pass++; else { fail++; console.error('  ✗ ' + m); } }

const APPLY = fs.readFileSync(path.join(ROOT, 'tm-endturn-apply.js'), 'utf8');
const PRESS = fs.readFileSync(path.join(ROOT, 'tm-minxin-pressure-actions.js'), 'utf8');

// ── ① 源码契约 ──
(function () {
  // 照辅臣拟议范式·decoupled secondary
  assert(/奏疏代拟/.test(APPLY), '① apply 含奏疏代拟块');
  assert(/_needsAiBody && !m\._aiBodyDone/.test(APPLY), '① 过滤 _needsAiBody 未代拟的');
  assert(/callAI\(_zsPrompt, 2400, undefined, 'secondary'/.test(APPLY), '① 走 callAI secondary(次要优先·基建自动回退主api)');
  assert(/priority: 'low'[\s\S]{0,40}maxRetries: 1/.test(APPLY), '① priority low + maxRetries(同辅臣拟议·失败不影响主流程)');
  assert(/catch \(_zsErr\)/.test(APPLY), '① try/catch 失败不影响主流程');
  assert(/_b\.length >= 20 && !\/\[a-zA-Z\]\{4,\}\/\.test\(_b\)/.test(APPLY), '① 校验:非空(≥20)+无大段英文才采用·否则保中文兜底');
  assert(/_zsDraft\[_ix\]\.content = _b; _zsDraft\[_ix\]\.text = _b; _zsDraft\[_ix\]\._aiBodyDone = true/.test(APPLY), '① 采用后写 content/text/_aiBodyDone');
  assert(/_needsAiBody: true/.test(PRESS), '① pressure-actions spawn 标 _needsAiBody');
  console.log('  [①] 源码契约 OK(照辅臣拟议范式·secondary·robust)');
})();

// ── ② 提取真正则+校验逻辑实跑(JSON解析+采用/拒收) ──
(function () {
  // 抽 apply 里的解析正则
  const m = APPLY.match(/String\(_zsRaw\)\.match\((\/\[\[\\s\\S\]\*\\\]\/)\)/);
  // 直接用与源码同义的正则验证(避免抽取脆弱)
  const jsonArrRe = /\[[\s\S]*\]/;
  function applyBody(raw, draft) {
    var arr = null;
    try { var zm = String(raw).match(jsonArrRe); if (zm) arr = JSON.parse(zm[0]); } catch (e) {}
    if (Array.isArray(arr)) {
      arr.forEach(function (o) {
        if (!o || o.body == null) return;
        var ix = Number(o.i) - 1;
        if (ix < 0 || ix >= draft.length) return;
        var b = String(o.body).trim();
        if (b.length >= 20 && !/[a-zA-Z]{4,}/.test(b)) { draft[ix].content = b; draft[ix].text = b; draft[ix]._aiBodyDone = true; }
      });
    }
  }
  // 正常:AI 返回中文正文 → 采用
  var d1 = [{ content: '兜底', text: '兜底' }];
  applyBody('前缀垃圾[{"i":1,"body":"臣张瑞图谨奏：延安士民困苦，民心实情仅一十一，朝堂观感虚高一十八，臣恐壅蔽。乞遣员查赈、蠲免逋赋，以安人心。臣不胜屏营。"}]后缀', d1);
  assert(d1[0]._aiBodyDone === true && d1[0].content.indexOf('延安') >= 0, '② 中文正文被采用·覆盖兜底');
  // 夹英文 → 拒收·保兜底
  var d2 = [{ content: '兜底中文', text: '兜底中文' }];
  applyBody('[{"i":1,"body":"臣谨奏 dynamic-inference 民心积压亟待绥抚处置安民。"}]', d2);
  assert(d2[0]._aiBodyDone == null && d2[0].content === '兜底中文', '② 夹大段英文被拒·保中文兜底');
  // 太短 → 拒收
  var d3 = [{ content: '兜底中文', text: '兜底中文' }];
  applyBody('[{"i":1,"body":"准奏"}]', d3);
  assert(d3[0].content === '兜底中文', '② 过短被拒·保兜底');
  // AI 失败(空/坏 JSON) → 保兜底
  var d4 = [{ content: '兜底中文', text: '兜底中文' }];
  applyBody('', d4); applyBody('not json', d4);
  assert(d4[0].content === '兜底中文', '② AI空/坏JSON → 保兜底(绝不空/英文)');
  console.log('  [②] JSON解析+采用/拒收/兜底逻辑 OK');
})();

// ── ③ 空体奏疏兜底(图2根治·sc1主推演空content→中文兜底·绝不「暂无正文」) ──
(function () {
  assert(/空体奏疏兜底/.test(APPLY), '③ apply 含空体奏疏兜底块');
  assert(/谨奏，为/.test(APPLY) && /谨奏：具题在案/.test(APPLY), '③ 兜底体为中文奏疏(标题派生/通用两式)');
  assert(/m\.content = _fb; m\.text = _fb; m\._emptyFallbackDone = true/.test(APPLY), '③ 写回 content/text + 标记');
  // 复刻兜底逻辑实测
  function emptyGuard(mems) {
    mems.forEach(function (m) {
      if (!m || m._emptyFallbackDone) return;
      if (String(m.text || m.content || '').trim()) return;
      var _ttl = String(m.title || m.topic || '').trim();
      if (!_ttl && !m.from && !m.type) return;
      var _from = String(m.from || '有司').trim() || '有司';
      var _fb = _ttl ? ('臣' + _from + '谨奏，为' + _ttl + '事：事由如题，谨具题上闻，所陈缘由轻重，伏乞圣鉴裁夺。') : ('臣' + _from + '谨奏：具题在案，容臣面陈缘由，伏乞圣鉴。');
      m.content = _fb; m.text = _fb; m._emptyFallbackDone = true;
    });
  }
  var ms = [
    { from: '黄立极', title: '请蠲免延绥逋赋疏', content: '' },      // 空+标题
    { from: '某臣', content: '臣已具实奏闻，乞圣裁。' },              // 有正文·不动
    { content: '' },                                                  // 空+无身份·跳过
    { from: '某御史', type: '弹章', content: '' }                     // 空+无标题有from/type
  ];
  emptyGuard(ms);
  assert(ms[0].content.indexOf('黄立极') >= 0 && ms[0].content.indexOf('请蠲免延绥逋赋疏') >= 0 && !/[a-zA-Z]/.test(ms[0].content), '③ 空+标题→中文奏疏兜底(含标题)');
  assert(ms[1].content === '臣已具实奏闻，乞圣裁。', '③ 有正文不动');
  assert(!ms[2].content, '③ 空+无身份→不强造(留display层处理)');
  assert(ms[3].content.indexOf('某御史') >= 0 && !/[a-zA-Z]/.test(ms[3].content), '③ 空+无标题有身份→通用中文兜底');
  console.log('  [③] 空体奏疏兜底·绝不「暂无正文」 OK');
})();

console.log('[smoke-zoushu-ai-draft] ' + pass + ' passed / ' + fail + ' failed');
if (fail > 0) process.exit(1);
