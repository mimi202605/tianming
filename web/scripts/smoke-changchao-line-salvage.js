#!/usr/bin/env node
// scripts/smoke-changchao-line-salvage.js
// 2026-07-03·常朝 bug：大臣发言"先完整陈述·立刻塌缩成一句总结/mock"。
//
// 根因·_cc3_aiGenReact 流式用 extractLineFromPartial 从未闭合 JSON 抠 line 实时吐字(玩家看到完整发言)·
//   但结束后要 raw.match(/\{...\}/) + JSON.parse 完整解析·line 太长触 token 顶未闭合 / 畸形→parse 失败→返回 null·
//   _cc3_streamReactBubble 落 else→用 npc.line(mock 短句)覆盖已吐出的完整发言→塌缩。
// 修·解析失败时 _salvageFromRaw 用同一正则抢救已流式的 line(+抠 stance)·而非返回 null。
// 本测·复制 extractLineFromPartial + 解析块(含抢救)·验完整/截断/畸形/过短四态。

'use strict';
let passed = 0, failed = 0;
function assert(cond, msg){ if(cond) passed++; else { failed++; console.error('  ✗ '+msg); } }

// ── 复制自 tm-chaoyi-changchao.js:1069 extractLineFromPartial ──
function extractLineFromPartial(s) {
  if (!s) return '';
  const m = s.match(/"line"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (!m) return '';
  let v = m[1];
  try { v = v.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\'); } catch (_) {}
  return v;
}
// ── 复制自解析块(含 _salvageFromRaw 抢救)·省去 mode/mismatch 无关部分 ──
function parseReact(raw, modeTrace) {
  function _salvageFromRaw() {
    let ln = extractLineFromPartial(raw);
    if (ln) ln = ln.replace(/[\s"]+$/, '').trim();
    if (!ln || ln.length < 6) return null;
    const sm = raw.match(/"stance"\s*:\s*"(support|oppose|mediate|neutral)"/);
    const salv = { stance: sm ? sm[1] : 'neutral', line: ln, _salvaged: true };
    if (modeTrace) salv._modeTrace = modeTrace;
    return salv;
  }
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return _salvageFromRaw();
    const obj = JSON.parse(m[0]);
    if (!obj || typeof obj.line !== 'string' || obj.line.length < 6) return _salvageFromRaw();
    const validStances = ['support', 'oppose', 'mediate', 'neutral'];
    const stance = validStances.indexOf(obj.stance) >= 0 ? obj.stance : 'neutral';
    return { stance: stance, line: obj.line.trim() };
  } catch (e) {
    return _salvageFromRaw();
  }
}

const FULL = '臣附阎鸣泰公之议。阁公方言后金诘问朝鲜接济毛帅之事，诚系东江存亡、藩篱安危。臣再补一条：朝鲜素称恭顺，若我朝不即刻谕抚绥定，彼恐生贰心。伏乞圣裁。';

console.log('===== 完整合法 JSON→正常解析·全文保留 =====');
var r1 = parseReact('{"stance":"support","mode":"augment","line":"' + FULL.replace(/"/g,'\\"') + '"}');
assert(r1 && r1.line === FULL, '完整 JSON→line 全文 (得 ' + (r1 && r1.line.length) + ' 字)');
assert(r1 && r1.stance === 'support' && !r1._salvaged, 'stance=support·非抢救路径');

console.log('===== ★截断 JSON(line 长·未闭合"})→抢救已流式全文·不塌缩 =====');
// token 触顶：line 吐到一半戛然而止·无收尾 "}
var truncated = '{"stance":"oppose","mode":"rebut","line":"' + FULL;
assert(extractLineFromPartial(truncated) === FULL, '流式期 extractLineFromPartial 已能抠出完整 line(玩家所见)');
var r2 = parseReact(truncated);
assert(r2 && r2._salvaged === true, '截断→走抢救路径');
assert(r2 && r2.line === FULL, '★抢救保留完整发言(非塌缩成 mock 一句) (得 ' + (r2 && r2.line.length) + ' 字)');
assert(r2 && r2.stance === 'oppose', '抢救仍抠出 stance=oppose');

console.log('===== ★畸形 JSON(line 内真换行破 JSON.parse·但有闭合})→catch→抢救 =====');
var malformed = '{"stance":"mediate","line":"臣以为此事关乎国体\n须从长计议，伏乞圣裁。"}';
var r3 = parseReact(malformed);
assert(r3 && r3.line && r3.line.indexOf('臣以为此事关乎国体') >= 0, '★畸形→抢救出 line(不返回 null 致塌缩)');
assert(r3 && r3.stance === 'mediate', '畸形抢救出 stance=mediate');

console.log('===== 抢救携带 modeTrace(下游 guard 一致) =====');
var r4 = parseReact('{"stance":"support","line":"' + FULL, { mode: 'augment', tone: 'firm' });
assert(r4 && r4._modeTrace && r4._modeTrace.mode === 'augment', '抢救结果带 _modeTrace');

console.log('===== 边界·line 过短(<6)截断→抢救返 null(合理落 mock) =====');
var r5 = parseReact('{"stance":"support","line":"臣');
assert(r5 === null, '过短 line 截断→抢救 null(交由 mock·不硬塞残句)');

console.log('===== 边界·完全无 line 字段→null =====');
assert(parseReact('{"stance":"support","mode":"lead"') === null, '无 line→null');
assert(parseReact('乱码非JSON') === null, '纯乱码→null');

console.log('');
console.log(`[smoke-changchao-line-salvage] ${passed} passed / ${failed} failed`);
if (failed > 0) process.exit(1);
