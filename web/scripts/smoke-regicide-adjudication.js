#!/usr/bin/env node
'use strict';
// smoke-regicide-adjudication — AI 弑君得逞→玩家之死裁决器（鼎革R1c·2026-07-07）
// 病灶(勘察D静默杀漏洞②)：AI 判 regicide succeeded 只 push 一条 GM._conspiracies 史录·
// 不置 _playerDead 不调 resolveHeir——玩家角色照活照玩。
// 修：过 P-QAM 硬门的弑君=「玩家角色被杀」具体事件→标死+R1a 裁决器。
// 硬门降级(君威盛)/palace_coup 得逞(归R1d废帝态)/未遂 皆不触。切片直驱 conspiracy_events 应用块。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let N = 0;
function assert(c, m) { N++; if (!c) { console.error('ASSERT FAIL [' + N + ']:', m); process.exit(1); } }

// ── 切片：_patch.conspiracy_events.forEach(function(e) { ... }) 的回调体 ──
const src = fs.readFileSync(path.join(ROOT, 'tm-endturn-apply-stages.js'), 'utf8');
const marker = '_patch.conspiracy_events.forEach(function(e) {';
const mi = src.indexOf(marker);
assert(mi > 0, '① 切片锚在位(conspiracy_events 应用块)');
let j = src.indexOf('{', mi + marker.length - 1 - 1); // 回调体开括号=marker 末尾的 {
j = mi + marker.length - 1; // 指向 {
let d = 0;
for (let k = j; k < src.length; k++) { const c = src[k]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j = k + 1; break; } } }
const cbBody = src.slice(mi + marker.length, j - 1); // 去头去尾=纯回调体
const fnSrc = 'function applyConspiracyEvent(e) {' + cbBody + '}';

function mkCtx(over) {
  const ctx = { console: { log() {}, warn() {}, error() {} }, Math, JSON, String, Number, Array, Object, parseInt, parseFloat, isFinite, isNaN };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  ctx._ebs = []; ctx.addEB = (cat, txt) => ctx._ebs.push(cat + '|' + txt);
  ctx._adjCalls = [];
  ctx.adjudicatePlayerDeath = (ch, cause, opts) => { ctx._adjCalls.push({ name: ch && ch.name, cause, kind: opts && opts.kind }); return { outcome: 'gameover' }; };
  ctx._semanticFailures = [];
  ctx._stageSemanticFailure = (kind, ref, reason) => { ctx._semanticFailures.push({ kind, ref, reason }); return false; };
  ctx.GM = Object.assign({
    turn: 50, _conspiracies: [], turnChanges: { variables: [] },
    chars: [
      { name: '天子', isPlayer: true, alive: true },
      { name: '权奸', alive: true }
    ],
    huangquan: { index: 20 }, huangwei: { index: 20 }   // 君威衰微=过硬门
  }, (over && over.GM) || {});
  ctx.P = { conf: {}, playerInfo: { characterName: '天子' } };
  if (over && over.P) Object.assign(ctx.P, over.P);
  // 切片只负责把弑君交给统一死亡 sink；用最小 contract double 模拟 sink 的标死与玩家裁决。
  ctx._deathSinkCalls = [];
  ctx.applyOneDeath = (death) => {
    ctx._deathSinkCalls.push(death && death.name);
    const target = (ctx.GM.chars || []).find(ch => ch && ch.name === (death && death.name));
    if (!target || target.alive === false || target.dead === true) return { ok: false, reason: 'missing-or-dead' };
    target.alive = false;
    target.dead = true;
    target.deathReason = String((death && (death.reason || death.cause)) || '');
    if (target.isPlayer || target.name === ctx.P.playerInfo.characterName) {
      if (typeof ctx.adjudicatePlayerDeath === 'function') ctx.adjudicatePlayerDeath(target, target.deathReason, { kind: 'regicide' });
      else ctx.GM._playerDead = true;
    }
    return { ok: true };
  };
  vm.createContext(ctx);
  vm.runInContext(fnSrc, ctx, { filename: 'conspiracy-apply-slice.js' });
  return ctx;
}

// ── 弑君得逞(君威衰·过硬门)→ 标死+裁决器 ──
var c1 = mkCtx();
c1.applyConspiracyEvent({ action: 'regicide', outcome: 'succeeded', instigator: '权奸', reason: '弑逆' });
var sov1 = c1.GM.chars[0];
assert(sov1.alive === false && sov1.dead === true && sov1.deathReason.indexOf('权奸') >= 0, '② 弑君得逞：天子标死·死因具名弑逆者');
assert(c1._deathSinkCalls.length === 1 && c1._deathSinkCalls[0] === '天子', '③ 弑君得逞只路由一次统一死亡 sink');
assert(c1._adjCalls.length === 1 && c1._adjCalls[0].kind === 'regicide', '④ 死亡 sink 交 R1a 裁决器(kind=regicide·不再只记史册)');
assert(c1._ebs.some(e => e.indexOf('国变|') === 0 && e.indexOf('所弑') > 0), '⑤ 国变讣文入编年');
assert(c1.GM._conspiracies.length === 1 && c1.GM._conspiracies[0].outcome === 'succeeded', '⑥ 史录照记(账不丢)');

// ── 君威正盛：P-QAM 硬门降级未遂·天子无恙 ──
var c2 = mkCtx({ GM: { huangquan: { index: 80 }, huangwei: { index: 80 } } });
c2.applyConspiracyEvent({ action: 'regicide', outcome: 'succeeded', instigator: '权奸' });
assert(c2.GM.chars[0].alive === true && c2._adjCalls.length === 0, '⑦ 君威盛：硬门降级·天子无恙(护栏不破)');
assert(c2.GM._conspiracies[0]._qamGated === true && c2.GM._conspiracies[0].action === 'coup_failed', '⑧ 降级落账(coup_failed·主谋下狱路照旧)');
assert(c2.GM.chars[1]._imprisoned === true, '⑨ 被门降级的主谋照旧下诏狱');

// ── palace_coup 得逞：不弑君(归R1d废帝态·此处不越界) ──
var c3 = mkCtx();
c3.applyConspiracyEvent({ action: 'palace_coup', outcome: 'succeeded', instigator: '权奸' });
assert(c3.GM.chars[0].alive === true && c3._adjCalls.length === 0, '⑩ 宫变得逞≠弑君·天子活(废立归R1d)');

// ── 弑君未遂：不触 ──
var c4 = mkCtx();
c4.applyConspiracyEvent({ action: 'regicide', outcome: 'failed', instigator: '权奸' });
assert(c4.GM.chars[0].alive === true && c4._adjCalls.length === 0, '⑪ 弑君未遂不触路由');

// ── 天子已死(同回合他路先死)：不重杀不重裁 ──
var c5 = mkCtx({ GM: { chars: [{ name: '天子', isPlayer: true, alive: false, dead: true }, { name: '权奸', alive: true }] } });
c5.applyConspiracyEvent({ action: 'regicide', outcome: 'succeeded', instigator: '权奸' });
assert(c5._adjCalls.length === 0, '⑫ 已死之君不重裁(幂等)');

// ── 裁决器缺位回落 ──
var c6 = mkCtx();
delete c6.adjudicatePlayerDeath;
c6.applyConspiracyEvent({ action: 'regicide', outcome: 'succeeded', instigator: '权奸' });
assert(c6.GM._playerDead === true, '⑬ 裁决器缺位回落终局(宁终局勿尸政)');

// ── 死亡 sink 缺位：不得裸写 alive/dead，必须失败留痕 ──
var c7 = mkCtx();
delete c7.applyOneDeath;
delete c7.applyCharacterDeaths;
c7.applyConspiracyEvent({ action: 'regicide', outcome: 'succeeded', instigator: '权奸' });
assert(c7.GM.chars[0].alive === true && !c7.GM.chars[0].dead, '⑭ sink 缺位不裸写玩家死亡');
assert(c7._semanticFailures.some(f => f.kind === 'conspiracy_events.regicide' && /pipeline unavailable/.test(f.reason)), '⑮ sink 缺位写入语义失败留痕');

console.log('smoke-regicide-adjudication OK — ' + N + ' 断言全绿（弑君→统一死亡sink/裁决器/硬门护栏/宫变不越界/未遂/幂等/sink缺位留痕）');
