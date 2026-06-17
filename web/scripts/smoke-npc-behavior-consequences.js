#!/usr/bin/env node
// smoke-npc-behavior-consequences.js
// 验证「~23 种 prompt 已承诺、apply 层却落空(纯叙事零后果)的 NPC behaviorType」现已接上机械后果。
// 手法:把 tm-endturn-apply.js 里**真实**的 behaviorType if-else 链切片出来包成 applyOne()·
//        用 spy 桩(AffinityMap/loyalty/stress/face/memory/armies)实跑·断言落地——非重新实现。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; } else { fail++; console.error('  ✗ ' + m); } }

const src = fs.readFileSync(path.join(ROOT, 'tm-endturn-apply.js'), 'utf8');

// ── 切出真 helper(_NPC_BEHAVIOR_CN + _npcBehaviorVerbCN) ──
const hA = src.indexOf('var _NPC_BEHAVIOR_CN');
const hEnd = src.indexOf('}', src.indexOf('function _edictTypeCN'));
ok(hA >= 0 && hEnd > hA, 'apply.js 含 behaviorType helper 段');
const helperSeg = src.slice(hA, hEnd + 1);

// ── 切出真 behaviorType if-else 链(appoint…desert·到"位置移动"注释前) ──
const cStart = src.indexOf("if (act.behaviorType === 'appoint' && act.target) {");
const cStop = src.indexOf('// NPC行为导致的位置移动');
ok(cStart >= 0 && cStop > cStart, 'apply.js 含 behaviorType if-else 链');
let chain = src.slice(cStart, cStop).trimEnd();
// 链尾应是闭合 `}`(去掉尾随空白后)
ok(/}\s*$/.test(chain), '链尾闭合 }·实尾=' + JSON.stringify(chain.slice(-12)));

// ── 同一 ctx 里:先装 helper·再用真链体定义 applyOne ──
const ctx = { Math: Math, JSON: JSON, Object: Object, Array: Array, String: String, Number: Number, Boolean: Boolean, isFinite: isFinite };
vm.createContext(ctx);
vm.runInContext(helperSeg, ctx, { filename: 'helpers.js' });
ok(typeof ctx._npcBehaviorVerbCN === 'function', '_npcBehaviorVerbCN 装载');
ok(ctx._npcBehaviorVerbCN('petition_jointly') === '联名上书', 'petition_jointly→联名上书(CN表已补)·实=' + ctx._npcBehaviorVerbCN('petition_jointly'));

const applyWrap = 'function applyOne(act, env) {\n' +
  '  var GM = env.GM, AffinityMap = env.AffinityMap, findCharByName = env.findCharByName,\n' +
  '      adjustCharacterLoyalty = env.adjustCharacterLoyalty, NpcMemorySystem = env.NpcMemorySystem, FaceSystem = env.FaceSystem;\n' +
  '  var mechanicallyExecuted = false;\n' +
  '  ' + chain + '\n' +
  '  return mechanicallyExecuted;\n' +
  '}';
vm.runInContext(applyWrap, ctx, { filename: 'applyOne.js' });
ok(typeof ctx.applyOne === 'function', 'applyOne(真链体) 装载成功');

// ── spy 环境工厂 ──
function mkEnv(chars, armies) {
  const aff = [];
  const env = {
    GM: { chars: chars, armies: armies || [] },
    AffinityMap: { add: function (a, b, d, r) { aff.push({ a: a, b: b, d: d, r: r }); } },
    findCharByName: function (n) { return chars.find(function (c) { return c.name === n; }) || null; },
    adjustCharacterLoyalty: function (ch, d, r, o) { ch.loyalty = Math.max(0, Math.min(100, (ch.loyalty == null ? 50 : ch.loyalty) + d)); ch._lastLoyR = r; return { ok: true }; },
    NpcMemorySystem: { remember: function (who, ev, emo, imp, src) { var c = chars.find(function (x) { return x.name === who; }); if (c) { c._memory = c._memory || []; c._memory.push({ event: ev, emotion: emo, importance: imp }); } } },
    FaceSystem: { loseFace: function (ch, amt, r) { ch._face = (ch._face == null ? 100 : ch._face) - amt; } },
    _aff: aff
  };
  return env;
}
function affFind(env, a, b) { return env._aff.find(function (x) { return x.a === a && x.b === b; }); }

// ════════ 社交结好家族 ════════
(function () {
  var chars = [{ name: '甲' }, { name: '乙', loyalty: 50 }];
  var env = mkEnv(chars);
  var me = ctx.applyOne({ name: '甲', action: '馈赠古玩', target: '乙', behaviorType: 'gift_present' }, env);
  ok(me === true, 'gift_present mechanicallyExecuted=true(旧为 narrative_only)');
  ok(affFind(env, '甲', '乙').d === 6, 'gift_present 甲→乙 亲疏+6·实=' + (affFind(env, '甲', '乙') || {}).d);
  ok(affFind(env, '乙', '甲').d === 4, 'gift_present 乙→甲 回拢+4(round 6*0.6)·实=' + (affFind(env, '乙', '甲') || {}).d);
})();
(function () {
  var chars = [{ name: '师' }, { name: '徒', loyalty: 50 }];
  var env = mkEnv(chars);
  ctx.applyOne({ name: '师', action: '收徒', target: '徒', behaviorType: 'master_disciple' }, env);
  ok(affFind(env, '师', '徒').d === 12, 'master_disciple 师→徒 +12(强纽带)·实=' + (affFind(env, '师', '徒') || {}).d);
  ok(chars[1].loyalty === 53, 'master_disciple 徒 loyalty +3·实=' + chars[1].loyalty);
})();

// ════════ 倾轧构陷家族 ════════
(function () {
  var chars = [{ name: '甲' }, { name: '乙', loyalty: 50, stress: 0, _face: 100 }];
  var env = mkEnv(chars);
  var me = ctx.applyOne({ name: '甲', action: '构陷', target: '乙', behaviorType: 'frame_up' }, env);
  ok(me === true, 'frame_up mechanicallyExecuted=true');
  ok(chars[1].loyalty === 44, 'frame_up 乙 loyalty-6·实=' + chars[1].loyalty);
  ok(chars[1].stress === 12, 'frame_up 乙 stress+12·实=' + chars[1].stress);
  ok(chars[1]._face === 88, 'frame_up 乙 掉面子12·实=' + chars[1]._face);
  ok(affFind(env, '乙', '甲').d === -15, 'frame_up 乙→甲 亲疏-15·实=' + (affFind(env, '乙', '甲') || {}).d);
  ok((chars[1]._memory || []).length === 1, 'frame_up 乙 记一条受害记忆');
})();
(function () {
  var chars = [{ name: '甲', stress: 0 }, { name: '乙', stress: 0 }];
  var env = mkEnv(chars);
  ctx.applyOne({ name: '甲', action: '当廷对质', target: '乙', behaviorType: 'confront' }, env);
  ok(affFind(env, '甲', '乙').d === -8 && affFind(env, '乙', '甲').d === -8, 'confront 双向亲疏-8');
  ok(chars[1].stress === 5 && chars[0].stress === 3, 'confront 乙stress+5/甲stress+3·实=' + chars[1].stress + '/' + chars[0].stress);
})();

// ════════ 弹劾家族 ════════
(function () {
  var chars = [{ name: '言官' }, { name: '权臣', stress: 0 }];
  var env = mkEnv(chars);
  ctx.applyOne({ name: '言官', action: '联名上书劾权臣', target: '权臣', behaviorType: 'petition_jointly' }, env);
  ok(chars[1].stress === 8, 'petition_jointly 被劾者 stress+8·实=' + chars[1].stress);
  ok(affFind(env, '言官', '权臣').d === -8, 'petition_jointly 亲疏-8');
})();

// ════════ 缔结/举荐/调和家族 ════════
(function () {
  var chars = [{ name: '甲' }, { name: '乙', loyalty: 50 }];
  var env = mkEnv(chars);
  ctx.applyOne({ name: '甲', action: '联姻', target: '乙', behaviorType: 'marriage_alliance' }, env);
  ok(affFind(env, '甲', '乙').d === 15 && affFind(env, '乙', '甲').d === 15, 'marriage_alliance 双向+15');
  ok(chars[1].loyalty === 53, 'marriage_alliance 乙 loyalty+3·实=' + chars[1].loyalty);
})();
(function () {
  var chars = [{ name: '举主' }, { name: '后进' }];
  var env = mkEnv(chars);
  ctx.applyOne({ name: '举主', action: '举荐后进入台省', target: '后进', behaviorType: 'recommend' }, env);
  ok(affFind(env, '后进', '举主').d === 8, 'recommend 后进→举主 荐拔之恩+8·实=' + (affFind(env, '后进', '举主') || {}).d);
})();
(function () {
  var chars = [{ name: '甲' }, { name: '乙' }];
  var env = mkEnv(chars);
  ctx.applyOne({ name: '甲', action: '居中调和', target: '乙', behaviorType: 'mediate' }, env);
  ok(affFind(env, '甲', '乙').d === 6, 'mediate 调和+6(弱化版和解)·实=' + (affFind(env, '甲', '乙') || {}).d);
})();

// ════════ 军事家族(recruit/desert + fortify 修 no-op) ════════
(function () {
  var armies = [{ name: '甲营', commander: '甲', morale: 50, training: 50 }];
  var env = mkEnv([{ name: '甲' }], armies);
  ctx.applyOne({ name: '甲', action: '募兵', behaviorType: 'recruit' }, env);
  ok(armies[0].morale === 53, 'recruit 甲营 morale+3·实=' + armies[0].morale);
})();
(function () {
  var armies = [{ name: '乙营', commander: '乙', morale: 50, training: 50 }];
  var env = mkEnv([{ name: '乙' }], armies);
  ctx.applyOne({ name: '乙', action: '哗变', behaviorType: 'desert' }, env);
  ok(armies[0].morale === 44 && armies[0].training === 45, 'desert 乙营 morale-6/training-5·实=' + armies[0].morale + '/' + armies[0].training);
})();
(function () {
  var armies = [{ name: '丙营', commander: '丙', morale: 50, fortification: 30 }];
  var env = mkEnv([{ name: '丙' }], armies);
  var me = ctx.applyOne({ name: '丙', action: '加固城防', behaviorType: 'fortify' }, env);
  ok(me === true && armies[0].morale === 52 && armies[0].fortification === 35, 'fortify 修 no-op:丙营 morale+2/城防+5·实=' + armies[0].morale + '/' + armies[0].fortification);
})();

// ════════ 回归:旧分支未被切片破坏(reward 仍生效) ════════
(function () {
  var chars = [{ name: '甲' }, { name: '乙', loyalty: 50 }];
  var env = mkEnv(chars);
  var me = ctx.applyOne({ name: '甲', action: '赏赐', target: '乙', behaviorType: 'reward' }, env);
  ok(me === true && chars[1].loyalty === 55 && affFind(env, '乙', '甲').d === 10, '回归:reward 旧分支仍 乙loyalty+5/亲疏+10·实=' + chars[1].loyalty);
})();

// ════════ 源码契约:各家族分支确实存在 ════════
ok(/act\.behaviorType === 'gift_present'/.test(src), '契约:社交结好家族分支存在');
ok(/act\.behaviorType === 'frame_up'/.test(src), '契约:构陷家族分支存在');
ok(/act\.behaviorType === 'marriage_alliance'/.test(src), '契约:缔结家族分支存在');
ok(/act\.behaviorType === 'recruit' \|\| act\.behaviorType === 'desert'/.test(src), '契约:军事 recruit/desert 分支存在');
ok(/act\.behaviorType === 'fortify'\) \{ _armyMatch\.morale/.test(src), '契约:fortify 不再 no-op');
ok(/npc-action-marriage|npc-action-bond|npc-action-frameup/.test(src), '契约:新分支 source 标记存在');

console.log('[smoke-npc-behavior-consequences] ' + pass + ' passed / ' + fail + ' failed');
process.exit(fail ? 1 : 0);
