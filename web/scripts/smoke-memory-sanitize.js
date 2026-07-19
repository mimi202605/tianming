#!/usr/bin/env node
'use strict';
// smoke-memory-sanitize — 刀B·NPC 记忆污染消毒（V1 只治生死类矛盾）
//   病根：问对等场景 AI 一句史实幻觉（如「魏忠贤已伏诛」而本局魏在世）被 remember 无校验落库，
//   下回合又被 _buildTemporalConstraint 当「本 NPC 关键记忆」+ wenduiHistory 回放喂回 prompt 自强化。
//   本 smoke 锁死三层消毒：① remember 写闸拒写 + 弱提示账 ② 读侧 _buildTemporalConstraint 过滤
//   ③ wenduiHistory 打标 + 回放跳过。重点锁「防误杀边界」：查无此人/一致/同回合竞态/最长实体消歧。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');   // web/

let A = 0;
function ok(c, m) { if (!c) throw new Error('assert failed -> ' + m); A++; console.log('  ✓ ' + m); }

// 花括号配平抽取（marker 起 → 首个 { 起配平到闭合），仿 smoke-divergence-ledger
function sliceBlock(src, marker) {
  const a = src.indexOf(marker); if (a < 0) return null;
  let i = src.indexOf('{', a), d = 0, j = i;
  for (; j < src.length; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j++; break; } } }
  return src.slice(a, j);
}

console.log('smoke-memory-sanitize');

// ═══ 装载真源 tm-mechanics-memory.js（含 NpcMemorySystem.remember + 检测器）到隔离沙箱 ═══
const sandbox = { console, Date, Math, JSON };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-mechanics-memory.js'), 'utf8'), sandbox, { filename: 'tm-mechanics-memory.js' });
const NMS = sandbox.NpcMemorySystem;
const detect = sandbox._tmDetectVitalConflict;
ok(NMS && typeof NMS.remember === 'function', '装载：NpcMemorySystem.remember 存在');
ok(typeof detect === 'function', '装载：_tmDetectVitalConflict 检测器已 window 导出');

function setGM(gm) { sandbox.GM = gm; return gm; }
function memOf(gm, name) { const c = (gm.chars || []).find(x => x.name === name); return (c && c._memory) || []; }
function archiveEvents(gm) { return (gm._memoryArchiveFull || []).map(m => m.event); }
function hints(gm) { return gm._aiWeakWriteHints || []; }

const WEI = '魏忠贤';   // 魏忠贤
const ZHANG = '张三';        // 张三
const KE = '客氏';           // 客氏
const WANGAN = '王安';       // 王安
const POISON = WEI + '已伏诛';           // 魏忠贤已伏诛
const ALIVE_POISON = WEI + '仍在世';     // 魏忠贤仍在世
const NORMAL = '面圣问对——商讨盐政';   // 面圣问对——商讨盐政
const WANGANSHI_DEAD = WANGAN + '石已死';   // 王安石已死
const WANGAN_DEAD = WANGAN + '已死';            // 王安已死

// ═══ ① 魏在世 + remember(「魏忠贤已伏诛」) → 拒写 + 弱提示落账 + archiveFull 无此条 ═══
(function () {
  const gm = setGM({ turn: 3, chars: [{ name: ZHANG, alive: true }, { name: WEI, alive: true }] });
  NMS.remember(ZHANG, POISON, '平', 6);
  ok(memOf(gm, ZHANG).every(m => m.event !== POISON), '① 魏在世时「已伏诛」拒写：ch._memory 无此条');
  ok(archiveEvents(gm).indexOf(POISON) < 0, '① 拒写：_memoryArchiveFull 也无此条（不归档）');
  const h = hints(gm);
  ok(h.length === 1 && h[0].kind === 'memory_hist_conflict' && h[0].claimTarget === WEI && h[0].npc === ZHANG, '① 弱提示账落 {kind,npc,claimTarget} 正确');
  const z = gm.chars.find(c => c.name === ZHANG);
  ok(!z._impressions && !z._relationHistory, '① 拒写：_impressions/_relationHistory 连带不写');
})();

// ═══ ② 正常记忆通过 ═══
(function () {
  const gm = setGM({ turn: 3, chars: [{ name: ZHANG, alive: true }, { name: WEI, alive: true }] });
  NMS.remember(ZHANG, NORMAL, '平', 6);
  ok(memOf(gm, ZHANG).some(m => m.event === NORMAL), '② 正常记忆写入 ch._memory');
  ok(archiveEvents(gm).indexOf(NORMAL) >= 0, '② 正常记忆归档 archiveFull');
  ok(hints(gm).length === 0, '② 正常记忆无弱提示');
})();

// ═══ ③ 魏真死后同文本 → 放行（与 GM 一致·边界②）═══
(function () {
  const gm = setGM({ turn: 9, chars: [{ name: ZHANG, alive: true }, { name: WEI, alive: false, dead: true, deathTurn: 5 }] });
  NMS.remember(ZHANG, POISON, '平', 6);
  ok(memOf(gm, ZHANG).some(m => m.event === POISON), '③ 魏真死后同文本→放行（写入）');
  ok(hints(gm).length === 0, '③ 与 GM 一致→无弱提示');
})();

// ═══ ④ 同回合竞态（deathTurn === turn）→ 放行（边界③）═══
(function () {
  const gm = setGM({ turn: 7, chars: [{ name: ZHANG, alive: true }, { name: WEI, alive: true, deathTurn: 7 }] });
  NMS.remember(ZHANG, POISON, '平', 6);
  ok(memOf(gm, ZHANG).some(m => m.event === POISON), '④ 同回合刚判死 deathTurn===turn→放行');
})();

// ═══ ⑤ 「王安石已死」在只有王安在世时 → 不误配王安（最长实体消歧）═══
(function () {
  const gm = setGM({ turn: 3, chars: [{ name: WANGAN, alive: true }, { name: ZHANG, alive: true }] });
  ok(detect(WANGANSHI_DEAD) == null, '⑤ 只有王安在世时「王安石已死」→不误配王安');
  NMS.remember(ZHANG, WANGANSHI_DEAD, '平', 6);
  ok(memOf(gm, ZHANG).some(m => m.event === WANGANSHI_DEAD), '⑤ 王安石已死→放行写入（不误杀）');
  // 反证：王安 本人被称已死 → 命中
  const gm2 = setGM({ turn: 3, chars: [{ name: WANGAN, alive: true }] });
  const r = detect(WANGAN_DEAD);
  ok(r && r.claimTarget === WANGAN, '⑤b 「王安已死」(真指本人)→命中冲突');
})();

// ═══ ⑥ 读侧：ch._memory 预置污染条目 → _buildTemporalConstraint 注入文本不含它 ═══
(function () {
  setGM({ turn: 4, chars: [{ name: WEI, alive: true }] });
  const infra = fs.readFileSync(path.join(ROOT, 'tm-ai-infra.js'), 'utf8');
  const blk = sliceBlock(infra, '  if (ch && Array.isArray(ch._memory) && ch._memory.length > 0) {');
  ok(!!blk && blk.indexOf('_tmDetectVitalConflict') >= 0, '⑥ 读侧块抽取成功且已接入检测器');
  const runReadSide = new Function('ch', 'lines', '_tmDetectVitalConflict', blk + '\n return lines;');
  const NORMAL2 = '商议漕运';   // 商议漕运
  const ch = { _memory: [{ event: POISON, turn: 2 }, { event: NORMAL2, turn: 3 }] };
  const out = runReadSide(ch, [], detect).join('\n');
  ok(out.indexOf(POISON) < 0, '⑥ 注入约束文本不含污染条目「已伏诛」');
  ok(out.indexOf(NORMAL2) >= 0, '⑥ 正常记忆「商议漕运」仍注入');
})();

// ═══ ⑦ wenduiHistory 带 _histConflict entry → 回放不含（＋打标助手真源验证）═══
(function () {
  setGM({ turn: 4, chars: [{ name: WEI, alive: true }, { name: KE, alive: true }] });
  const wd = fs.readFileSync(path.join(ROOT, 'tm-wendui.js'), 'utf8');
  // 打标助手真源：污染 npc entry → _histConflict=true；正常 → 不打标
  const flagBlk = sliceBlock(wd, 'function _wdFlagVitalConflict(entry) {');
  ok(!!flagBlk, '⑦ _wdFlagVitalConflict 抽取成功');
  // 装进主沙箱：此处 _tmDetectVitalConflict 及其依赖(扫描器/正则)俱在，GM 为当前 setGM 值
  vm.runInContext(flagBlk + '\nthis.__wdFlag=_wdFlagVitalConflict;', sandbox);
  const e1 = sandbox.__wdFlag({ role: 'npc', content: POISON });
  const e2 = sandbox.__wdFlag({ role: 'npc', content: NORMAL });
  ok(e1._histConflict === true, '⑦ 污染回复→_histConflict=true');
  ok(!e2._histConflict, '⑦ 正常回复→不打标');
  // 回放侧真源：带标条目不进 messages
  const replayBlk = sliceBlock(wd, 'history.forEach(function(h){');
  ok(!!replayBlk && replayBlk.indexOf('_histConflict') >= 0, '⑦ 回放 forEach 已插入跳过逻辑');
  // sliceBlock 抽到 function 体闭合 }，需补回 forEach 调用的 ); 才是完整语句
  const runReplay = new Function('history', 'messages', '_tmDetectVitalConflict',
    replayBlk + ');\n return messages;');
  const history = [
    { role: 'player', content: 'ask1' },
    { role: 'npc', content: POISON, _histConflict: true },      // 带标·跳过
    { role: 'npc', content: ALIVE_POISON },                     // 无标·但运行时侦测(魏在世·此条不冲突→保留)
    { role: 'npc', content: NORMAL }                            // 正常·保留
  ];
  const msgs = runReplay(history, [], detect);
  const joined = msgs.map(m => m.content).join('\n');
  ok(joined.indexOf(POISON) < 0, '⑦ 回放不含带 _histConflict 标的条目');
  ok(joined.indexOf(NORMAL) >= 0, '⑦ 回放仍含正常条目');
  // 老存档兜底：无标但运行时侦测出的矛盾条目也剔（魏已死时「仍在世」）
  const gmDead = setGM({ turn: 9, chars: [{ name: WEI, alive: false, dead: true, deathTurn: 5 }] });
  const msgs2 = runReplay([{ role: 'npc', content: ALIVE_POISON }], [], detect);
  ok(msgs2.map(m => m.content).join('\n').indexOf(ALIVE_POISON) < 0, '⑦ 老存档：无标但运行时侦测出的矛盾条也剔');
})();

// ═══ ⑧ 死者「仍在」→ 拒 ═══
(function () {
  const gm = setGM({ turn: 9, chars: [{ name: ZHANG, alive: true }, { name: WEI, alive: false, dead: true, deathTurn: 5 }] });
  const r = detect(ALIVE_POISON);
  ok(r && r.claimType === 'alive_of_dead' && r.claimTarget === WEI, '⑧ 称已故者仍在→alive_of_dead 冲突');
  NMS.remember(ZHANG, ALIVE_POISON, '平', 6);
  ok(memOf(gm, ZHANG).every(m => m.event !== ALIVE_POISON), '⑧ remember 拒写「魏忠贤仍在世」');
})();

// ═══ ⑨ 无 GM / 空输入 → 永不崩 ═══
(function () {
  let noThrow = true;
  try {
    setGM(null); ok(detect(POISON) == null, '⑨ GM=null → 返回 null 不崩');
    setGM({ turn: 1, chars: [] });
    ok(detect('') == null, '⑨ 空字符串 → null');
    ok(detect(null) == null, '⑨ null 输入 → null');
    ok(detect(undefined) == null, '⑨ undefined 输入 → null');
    ok(detect(POISON) == null, '⑨ chars=[] → null（无在册人）');
    setGM({ turn: 1 });   // 无 chars 字段
    ok(detect(POISON) == null, '⑨ GM 无 chars 字段 → null');
  } catch (e) { noThrow = false; console.log('  crash:', e && e.message); }
  ok(noThrow, '⑨ 全程无抛异常');
})();

console.log('\n结果: ' + A + ' 通过 / 0 失败');
