#!/usr/bin/env node
'use strict';
// smoke-memory-sanitize — 刀B·NPC 记忆污染消毒（V1 只治生死类矛盾）·返工版
//   三层消毒 + 全 sink 收口 + Codex 复审复现例锁死：
//   ① remember 写闸拒写 + 弱提示账（tm-mechanics-memory）
//   ② 读侧/注入 sink 收口（_buildTemporalConstraint / npc-hearts / recent-dialogues / persona / agent-mode）
//   ③ 记忆管家写闸 MemoryWriteGate 生死对账（隔离不自动接受）
//   ④ 问对回放占位替换（保 Q-A 配对）
//   重点锁：P0-2 六例误杀放行 + 真阳性仍拦；P1-5 死者「仍在世」永不豁免；P1-4 别称命中；真跑两个
//   tm-endturn-prompt sink 段断言污染条不出现在产出 prompt。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');   // web/

let A = 0;
function ok(c, m) { if (!c) throw new Error('assert failed -> ' + m); A++; console.log('  ✓ ' + m); }
function sliceBlock(src, marker) {
  const a = src.indexOf(marker); if (a < 0) return null;
  let i = src.indexOf('{', a), d = 0, j = i;
  for (; j < src.length; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j++; break; } } }
  return src.slice(a, j);
}

console.log('smoke-memory-sanitize (返工)');

// ═══ 装载真源 tm-mechanics-memory.js（NpcMemorySystem.remember + 检测器 + 过滤器）到隔离沙箱 ═══
const sandbox = { console, Date, Math, JSON };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-mechanics-memory.js'), 'utf8'), sandbox, { filename: 'tm-mechanics-memory.js' });
const NMS = sandbox.NpcMemorySystem;
const detect = function (gm, t) { sandbox.GM = gm; return sandbox._tmDetectVitalConflict(t, gm); };
ok(NMS && typeof NMS.remember === 'function', '装载：NpcMemorySystem.remember 存在');
ok(typeof sandbox._tmDetectVitalConflict === 'function', '装载：_tmDetectVitalConflict 已导出');
ok(typeof sandbox._tmFilterMemories === 'function' && typeof sandbox._tmFilterWenduiEntries === 'function', '装载：统一过滤器 _tmFilterMemories/_tmFilterWenduiEntries 已导出');

function setGM(gm) { sandbox.GM = gm; return gm; }
function memOf(gm, name) { const c = (gm.chars || []).find(x => x.name === name); return (c && c._memory) || []; }
function archiveEvents(gm) { return (gm._memoryArchiveFull || []).map(m => m.event); }
function hints(gm) { return gm._aiWeakWriteHints || []; }

const WEI = '魏忠贤', ZHANG = '张三', WANGAN = '王安';
const POISON = WEI + '已伏诛';               // 直陈·真阳性
const ALIVE_POISON = WEI + '仍在世';         // 反向幻觉
const NORMAL = '面圣问对——商讨盐政利弊';
const weiAlive = () => ({ turn: 5, chars: [{ name: WEI, alive: true }, { name: ZHANG, alive: true }], _aiWeakWriteHints: [] });

// ═══ P0-2·Codex 六例误杀 → 全部必须放行(null)；真阳性仍必须拦 ═══
console.log('\n[P0-2] 误杀放行 vs 真阳性拦截');
const gmWeiAlive = { turn: 5, chars: [{ name: WEI, alive: true }] };
[
  ['魏忠贤如已死朝局必乱', '如(虚拟)'],
  ['魏忠贤将身亡于乱军臣深忧之', '将(将来)'],
  ['魏忠贤或已死于途中尚待查验', '或+待查验'],
  ['传言魏忠贤已死真假未明', '名前传闻标记'],
  ['魏忠贤传言已死真假未明', 'gap 内传闻'],
  ['魏忠贤，已故家父曾与之同朝', '已故家父(亲属)'],
  ['魏忠贤。已故家父曾与之同朝', '句号版(句读切分)']
].forEach(function (row) { ok(detect(gmWeiAlive, row[0]) == null, '误杀放行：' + row[1] + ' 「' + row[0] + '」'); });
[
  ['魏忠贤已伏诛', '直陈已伏诛'],
  ['魏忠贤，已伏诛', '主谓逗号'],
  ['魏忠贤已伏诛，将士称快', '后接将士不误抑'],
  ['魏忠贤如今已死', '如今(剥时间连接词)']
].forEach(function (row) { ok(detect(gmWeiAlive, row[0]) != null, '真阳性仍拦：' + row[1] + ' 「' + row[0] + '」'); });

// ═══ P1-5·竞态豁免方向 ═══
console.log('\n[P1-5] 竞态豁免方向');
const weiRaceDeath = { turn: 7, chars: [{ name: WEI, alive: true, deathTurn: 7 }] };   // alive 未翻转·死亡宣称竞态
const weiJustDied = { turn: 7, chars: [{ name: WEI, alive: false, dead: true, deathTurn: 7 }] }; // 本回合刚判死
const weiDead = { turn: 9, chars: [{ name: WEI, alive: false, dead: true, deathTurn: 5 }] };
ok(detect(weiRaceDeath, POISON) == null, '死亡宣称享同回合竞态豁免（alive 未翻转+deathTurn===turn）');
ok(detect(weiJustDied, ALIVE_POISON) != null && detect(weiJustDied, ALIVE_POISON).claimType === 'alive_of_dead', '★存活宣称永不豁免：刚判死者「仍在世」→拦(alive_of_dead)');
ok(detect(weiDead, ALIVE_POISON) != null, '久死者「仍在世」→拦');
ok(detect({ turn: 5, chars: [{ name: WEI, alive: true }] }, ALIVE_POISON) == null, '活人「仍在世」→与GM一致·放行');

// ═══ P1-4·别称命中（zi/haoName/aliases） ═══
console.log('\n[P1-4] 别称域');
ok(detect({ turn: 3, chars: [{ name: '李三', zi: '子明', alive: true }] }, '子明已伏诛') != null, '别称 zi(子明) 命中');
ok(detect({ turn: 9, chars: [{ name: '李清照', haoName: '易安居士', alive: false, dead: true, deathTurn: 2 }] }, '易安居士仍在世') != null, '别称 haoName(易安居士) 反向命中');
ok(detect({ turn: 3, chars: [{ name: WEI, aliases: ['魏阉'], alive: true }] }, '魏阉已伏诛') != null, '别称 aliases(魏阉) 命中');

// ═══ 最长实体消歧 & 永不崩 ═══
console.log('\n[边界] 最长实体 / 永不崩');
ok(detect({ turn: 3, chars: [{ name: WANGAN, alive: true }] }, '王安石已死') == null, '最长实体：王安石不误配王安');
ok(detect({ turn: 3, chars: [{ name: WANGAN, alive: true }] }, '王安已死') != null, '王安本人已死→拦');
ok(detect(null, POISON) == null, 'GM=null 不崩');
ok(detect({ turn: 1, chars: [] }, '') == null, '空文本');
ok(detect({ turn: 1 }, null) == null, 'null 输入');
ok(detect({ turn: 1, chars: [{ name: WEI, alive: true }] }, NORMAL) == null, '正常记忆放行');

// ═══ ① remember 写闸（真跑）═══
console.log('\n[①] remember 写闸');
(function () {
  const gm = setGM(weiAlive());
  NMS.remember(ZHANG, POISON, '平', 6);
  ok(memOf(gm, ZHANG).every(m => m.event !== POISON), '① 拒写：ch._memory 无污染条');
  ok(archiveEvents(gm).indexOf(POISON) < 0, '① 拒写：_memoryArchiveFull 无污染条');
  ok(hints(gm).length === 1 && hints(gm)[0].kind === 'memory_hist_conflict' && hints(gm)[0].claimTarget === WEI, '① 弱提示账落 {kind,claimTarget} 正确');
  const z = gm.chars.find(c => c.name === ZHANG);
  ok(!z._impressions && !z._relationHistory, '① _impressions/_relationHistory 连带不写');
})();
(function () {
  const gm = setGM(weiAlive());
  NMS.remember(ZHANG, NORMAL, '平', 6);
  ok(memOf(gm, ZHANG).some(m => m.event === NORMAL) && hints(gm).length === 0, '② 正常记忆写入且无弱提示');
})();
(function () {
  const gm = setGM({ turn: 9, chars: [{ name: ZHANG, alive: true }, { name: WEI, alive: false, dead: true, deathTurn: 5 }], _aiWeakWriteHints: [] });
  NMS.remember(ZHANG, POISON, '平', 6);
  ok(memOf(gm, ZHANG).some(m => m.event === POISON), '③ 魏真死后同文本→放行写入');
})();

// ═══ ③(P0-3) 记忆管家写闸生死对账（真跑 MemoryWriteGate）═══
console.log('\n[P0-3] MemoryWriteGate 生死对账');
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-memory-writegate.js'), 'utf8'), sandbox, { filename: 'tm-memory-writegate.js' });
const WG = sandbox.TM.MemoryWriteGate;
(function () {
  setGM({ turn: 5, chars: [{ name: WEI, alive: true }, { name: ZHANG, alive: true }], _aiWeakWriteHints: [] });
  const poison = { type: 'character_memory', body: '张三深信魏忠贤已伏诛，奸党当除', source: 'ai_extracted', sourceRefs: [{ type: 'events', id: 'ev1', turn: 5 }], confidence: 0.8, actor: ZHANG, readScope: 'public', extra: { confidence: 0.8 } };
  const env = WG.evaluateCandidate(poison, { forceDraft: false });
  ok(env.status === 'quarantined' && (env.reasons || []).some(r => (r.code || r) === 'memory_hist_conflict'), 'P0-3 污染候选→quarantined + memory_hist_conflict');
  ok(hints(sandbox.GM).some(h => h.kind === 'memory_hist_conflict'), 'P0-3 落弱提示账');
  const clean = { type: 'character_memory', body: '张三与李四商议漕运事', source: 'ai_extracted', sourceRefs: [{ type: 'events', id: 'ev2', turn: 5 }], confidence: 0.8, readScope: 'public', extra: { confidence: 0.8 } };
  ok(WG.evaluateCandidate(clean, { forceDraft: false }).status !== 'quarantined', 'P0-3 正常候选不隔离');
  // enqueue: 隔离项进 quarantine 不进 draft → autoAccept 够不着
  sandbox.GM._memoryWriteQueue = []; sandbox.GM._memoryDraftInbox = []; sandbox.GM._memoryQuarantine = []; sandbox.GM._memoryAccepted = []; sandbox.GM._memoryAuditEvents = [];
  const it = WG.enqueue(sandbox.GM, poison, { forceDraft: true });
  ok(it.status === 'quarantined' && !sandbox.GM._memoryDraftInbox.some(x => x.id === it.id), 'P0-3 enqueue：污染进 quarantine 不进 draftInbox（autoAccept 够不着）');
})();

// ═══ ⑤ 读侧 _buildTemporalConstraint 记忆块（真跑抽取块）═══
console.log('\n[P0-1] 读侧 _buildTemporalConstraint');
(function () {
  setGM({ turn: 4, chars: [{ name: WEI, alive: true }] });
  const infra = fs.readFileSync(path.join(ROOT, 'tm-ai-infra.js'), 'utf8');
  const blk = sliceBlock(infra, '  if (ch && Array.isArray(ch._memory) && ch._memory.length > 0) {');
  ok(!!blk && blk.indexOf('_tmFilterMemories') >= 0, '读侧块已接 _tmFilterMemories');
  const runReadSide = new Function('ch', 'lines', 'GM', '_tmFilterMemories', blk + '\n return lines;');
  const ch = { _memory: [{ event: POISON, turn: 2 }, { event: '商议漕运', turn: 3 }] };
  const out = runReadSide(ch, [], sandbox.GM, sandbox._tmFilterMemories).join('\n');
  ok(out.indexOf(POISON) < 0 && out.indexOf('商议漕运') >= 0, '⑤ 产出约束文本无污染条·含正常条');
})();

// ═══ ⑥ 问对回放占位替换（真跑抽取 forEach）═══
console.log('\n[P1-6] 问对回放占位替换');
(function () {
  setGM({ turn: 4, chars: [{ name: WEI, alive: true }] });
  const wd = fs.readFileSync(path.join(ROOT, 'tm-wendui.js'), 'utf8');
  const replayBlk = sliceBlock(wd, 'history.forEach(function(h){');
  ok(!!replayBlk && replayBlk.indexOf('_vitalBad') >= 0 && replayBlk.indexOf('作废') >= 0, '回放块已改占位替换');
  const runReplay = new Function('history', 'messages', 'GM', '_tmWenduiEntryConflict', replayBlk + ');\n return messages;');
  const history = [
    { role: 'player', content: '问一：盐政如何' },
    { role: 'npc', content: POISON, _histConflict: true },     // 带标·占位
    { role: 'player', content: '问二：漕运如何' },
    { role: 'npc', content: '漕运当疏浚', turn: 4 }             // 正常
  ];
  const msgs = runReplay(history, [{ role: 'system', content: 'sys' }], sandbox.GM, sandbox._tmWenduiEntryConflict);
  const joined = msgs.map(m => m.content).join('||');
  ok(joined.indexOf(POISON) < 0, '⑥ 回放不含污染原文');
  ok(joined.indexOf('作废') >= 0, '⑥ 冲突 assistant 位以占位替换');
  ok(joined.indexOf('漕运当疏浚') >= 0, '⑥ 正常回复保留');
  // ★Q-A 配对：占位保住 assistant 槽·两个 user 未被粘连
  const userMsgs = msgs.filter(m => m.role === 'user');
  ok(userMsgs.some(m => m.content.indexOf('问一') >= 0 && m.content.indexOf('问二') < 0), '⑥ Q-A 配对：问一问二未粘连（占位保住 assistant 槽）');
  // 老存档兜底：无标但运行时侦测出的矛盾条也占位
  const gmDead = setGM({ turn: 9, chars: [{ name: WEI, alive: false, dead: true, deathTurn: 5 }] });
  const msgs2 = runReplay([{ role: 'player', content: 'q' }, { role: 'npc', content: ALIVE_POISON }], [{ role: 'system', content: 's' }], gmDead, sandbox._tmWenduiEntryConflict);
  ok(msgs2.map(m => m.content).join('||').indexOf(ALIVE_POISON) < 0, '⑥ 老存档：无标运行时侦测出的矛盾条也占位');
})();

// ═══ ⑦ 真跑 tm-endturn-prompt 两个 sink 段：断言污染条不出现在产出 prompt ═══
console.log('\n[P0-1] 真跑 tm-endturn-prompt sink 段');
const prompt = fs.readFileSync(path.join(ROOT, 'tm-endturn-prompt.js'), 'utf8');
(function () {
  // npc-hearts <memory> 注入段（从 _cleanMem 定义到 top.forEach 闭合）
  const start = prompt.indexOf('var _cleanMem = (typeof _tmFilterMemories');
  const anchorEnd = prompt.indexOf('heartCount++;', start);
  const segEnd = prompt.indexOf('});', anchorEnd) + 3;
  const seg = prompt.slice(start, segEnd);
  ok(seg.indexOf('_tmFilterMemories(c._memory, GM)') >= 0, 'npc-hearts sink 段已接 _tmFilterMemories');
  const runHearts = new Function('c', 'GM', '_tmFilterMemories', '_memScore', 'impMin', 'perChar', '_xE', 'xmlLines', 'heartCount', 'totalCap',
    seg + '\n return xmlLines;');
  setGM({ turn: 5, chars: [{ name: WEI, alive: true }] });
  const c = { name: ZHANG, _memory: [{ event: POISON, turn: 5, importance: 9 }, { event: '盐政奏对已毕', turn: 5, importance: 8 }] };
  const xml = runHearts(c, sandbox.GM, sandbox._tmFilterMemories, function (m) { return m.importance || 0; }, 1, 10, function (x) { return String(x); }, [], 0, 99).join('\n');
  ok(xml.indexOf('已伏诛') < 0, '⑦ npc-hearts 产出 <memory> 无污染条「已伏诛」');
  ok(xml.indexOf('盐政奏对已毕') >= 0, '⑦ npc-hearts 保留正常记忆');
})();
(function () {
  // recent-dialogues wenduiHistory 注入段
  const blk = sliceBlock(prompt, 'if (GM.wenduiHistory) {');
  ok(!!blk && blk.indexOf('_tmFilterWenduiEntries(msgs, GM)') >= 0, 'recent-dialogues sink 段已接 _tmFilterWenduiEntries');
  const runRD = new Function('GM', 'onStageNames', 'curTurn', 'recentTurns', 'xmlItems', '_tmFilterWenduiEntries', blk + '\n return xmlItems;');
  const gm = setGM({ turn: 5, chars: [{ name: WEI, alive: true }], wenduiHistory: { [ZHANG]: [
    { role: 'npc', content: POISON, turn: 5, _histConflict: true },
    { role: 'player', content: '陛下问盐政', turn: 5 },
    { role: 'npc', content: '盐政宜缓', turn: 5 }
  ] } });
  const items = runRD(gm, { [ZHANG]: true }, 5, 3, [], sandbox._tmFilterWenduiEntries);
  const joined = items.join('\n');
  ok(joined.indexOf('已伏诛') < 0, '⑦ recent-dialogues 产出无污染条「已伏诛」');
  ok(joined.indexOf('盐政宜缓') >= 0, '⑦ recent-dialogues 保留正常对话');
})();

// ═══ ⑧ 各 sink 源码接线结构断言（persona-views / agent-mode）═══
console.log('\n[P0-1] sink 接线结构');
ok(fs.readFileSync(path.join(ROOT, 'tm-wendui-persona-views.js'), 'utf8').indexOf('_tmFilterWenduiEntries((GM.wenduiHistory && GM.wenduiHistory[ch.name])') >= 0, '⑧ persona-views 承续上下文已接过滤器');
ok(fs.readFileSync(path.join(ROOT, 'tm-endturn-agent-mode.js'), 'utf8').indexOf('_tmFilterWenduiEntries(arr, gm)') >= 0, '⑧ agent-mode 问对注入已接过滤器');

console.log('\n结果: ' + A + ' 通过 / 0 失败');
