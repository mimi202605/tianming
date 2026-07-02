#!/usr/bin/env node
'use strict';
/* smoke-narr-3stage-repair — 叙事三件套 3stage 管线修坏账 (2026-07-02)
 * 背景：3stage 成功时原代码 `return` 直接退出 _runBranchC——连带跳过其后 sc25c/sc25
 *   (记忆合成·伏笔)的排队(sc28 默认折叠进 sc25c·一并死)·且对话历史/建议/subcall2_raw 全缺。
 * 本刀：①return→_threeStageDone 标志位(只跳 legacy sc2 与 sc27·记忆管线照常)
 *   ②补齐 legacy 收尾职责:conv 推正文(同截断策略)/建议兜底(_ensureSc2Suggestions 共享)/subcall2_raw。
 */
const fs = require('fs');
const path = require('path');
const W = path.join(__dirname, '..');

let A = 0, F = 0;
function ok(cond, msg) { if (cond) { A++; console.log('  ✓ ' + msg); } else { F++; console.log('  ✗ ' + msg); } }

const src = fs.readFileSync(path.join(W, 'tm-endturn-followup.js'), 'utf8');

// ① 旧 bug 写法已不存：裸 return 退出 _runBranchC
ok(src.indexOf('return;  // skip legacy sc2 + sc27 below') < 0, '① 旧裸 return(跳过整个 BranchC 余下管线)已删');
ok(/var _threeStageDone = false;/.test(src), '① _threeStageDone 标志位已声明');
ok(/_threeStageDone = true;/.test(src), '① 成功路径置 _threeStageDone=true');
ok(/if \(!_threeStageDone\) await _runLegacySc2\(\);/.test(src), '① legacy sc2 由标志位门控(而非 return 跳过)');

// ② 记忆管线不再被跳：legacy 调用点之后 sc25c/sc25 排队仍无条件可达
const _legacyCallIdx = src.indexOf('if (!_threeStageDone) await _runLegacySc2();');
const _sc25cIdx = src.indexOf("_queuePostTurnSubcall('sc25c'");
const _sc25Idx = src.indexOf("_queuePostTurnSubcall('sc25'");
ok(_legacyCallIdx > 0 && _sc25cIdx > _legacyCallIdx, '② sc25c 排队在 legacy 门控之后·仍可达');
ok(_sc25Idx > _legacyCallIdx, '② sc25 排队仍可达');
const _between = src.slice(_legacyCallIdx, _sc25cIdx);
ok(!/if \(_threeStageDone\) return/.test(_between) && _between.indexOf('return;') < 0, '② legacy→sc25c 之间无新增提前 return');

// ③ 3stage 成功路径补齐 legacy 收尾职责
ok(/GM\.conv\.push\(\{ role: 'assistant', content: _cc3 \}\)/.test(src), '③ 正文入对话历史(后续回合 AI 记得本回合故事)');
ok(/GM\._turnAiResults\.subcall2\.suggestions = _ensureSc2Suggestions\(/.test(src), '③ 建议兜底接入 3stage 成功路径');
ok(/GM\._turnAiResults\.subcall2_raw = _pCall\.raw \|\| ''/.test(src), '③ subcall2_raw 镜像(诊断/agent 工具读)');
ok(/_skipped: 'threeStageAlreadyReviewed'/.test(src), '③ 旧 sc27 在 3stage 路径显式跳过(与原意一致)');

// ④ legacy 建议兜底改用共享 helper(语义不变)
ok(/p2\.suggestions = _ensureSc2Suggestions\(p2\.suggestions\);/.test(src), '④ legacy 建议兜底走共享 helper');

// ⑤ 行为：抽真 _ensureSc2Suggestions 跑
function extractFn(anchor) {
  const st = src.indexOf(anchor);
  if (st < 0) return null;
  let depth = 0, end = -1;
  for (let i = src.indexOf('{', st); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  return end > st ? src.slice(st, end) : null;
}
const fnSrc = extractFn('var _ensureSc2Suggestions = function(sugg) {');
ok(!!fnSrc, '⑤ _ensureSc2Suggestions 闭包提取');
const mkFn = new Function('GM', 'random', 'return (' + fnSrc.replace('var _ensureSc2Suggestions = ', '') + ')');

// 5a: ≥2 条建议原样返回（引用恒等=legacy 不触碰语义）
let fn = mkFn({ eraState: {}, _tyrantDecadence: 0 }, function(){ return 0; });
const twoSugg = ['甲', '乙'];
ok(fn(twoSugg) === twoSugg, '⑤ ≥2 条 → 原样返回(引用恒等·与 legacy 语义一致)');

// 5b: 空 → 兜底 2-4 条
const filled = fn(null);
ok(Array.isArray(filled) && filled.length >= 2 && filled.length <= 4, '⑤ 空 → 兜底 ' + filled.length + ' 条(2-4)');

// 5c: 荒淫值高 → 混入佞臣建议
fn = mkFn({ eraState: {}, _tyrantDecadence: 30 }, function(){ return 0; });
const decadent = fn([]);
ok(decadent.some(function(s){ return /宴饮群臣/.test(s); }), '⑤ 荒淫>25 → 混入佞臣"好建议"(random=0 → 首条宴饮)');

// 5d: 军备松弛 → 边防建议
fn = mkFn({ eraState: { militaryProfessionalism: 0.2 }, _tyrantDecadence: 0 }, function(){ return 0; });
ok(fn([]).some(function(s){ return /操练兵马/.test(s); }), '⑤ 军备松弛 → 边防建议进兜底');

// ⑥ 事实同源(commit 2)：_buildSc2FactsCore 抽出·legacy 与 scOl 双消费
ok(/var _buildSc2FactsCore = function\(\) \{/.test(src), '⑥ _buildSc2FactsCore 已定义');
ok(/var _factsCore2 = _buildSc2FactsCore\(\);\s*\n\s*p1Summary = _factsCore2\.p1Summary;\s*\n\s*var _basisBrief = _factsCore2\.basisBrief;/.test(src), '⑥ legacy sc2 改走共享组装');
ok(/var _fOl = _buildSc2FactsCore\(\);/.test(src), '⑥ sc2_outline 改走共享组装(原5条切片弃用)');
ok(src.indexOf("_olCtx += _tmLimitPromptSection('结构化推演摘要', _fOl.p1Summary, 4500)") >= 0, '⑥ scOl 事实预算 4500+3500(比 legacy 紧)');
ok(/if \(!p1Summary\) p1Summary = _tmLimitPromptSection\('结构化推演摘要', _buildSc2FactsCore\(\)\.p1Summary, 6500\)/.test(src), '⑥ 3stage 成功路径补 p1Summary 镜像(下游 ctx.followup 读)');

// ⑦ O1 因果综述 / O2 时代用语 / O4 场景伸缩 契约
ok(/WorldDigest\.promptBlock\(GM, \{ turnsBack: 1 \}\)/.test(extractFn('var _buildSc2FactsCore = function() {') || ''), '⑦ O1·W1 因果综述折进共享组装(两路径同享)');
ok(src.indexOf('时代用语（场景细节与 time_period_markers 优先从中选用') >= 0, '⑦ O2·periodVocabulary 开卷给 scOl');
ok(/var _sceneCap = _factN >= 10 \? 8 : \(_factN >= 5 \? 6 : 4\);/.test(src), '⑦ O4·场景数 4/6/8 随事实量伸缩');
ok(src.indexOf('须顺【天下牵动·因果综述】的因果脉络组织') >= 0, '⑦ O1·narrative_arc 要求沿因果链组织');

// ⑧ 行为：抽真 _buildSc2FactsCore 喂假闭包跑
const coreSrc = extractFn('var _buildSc2FactsCore = function() {');
ok(!!coreSrc, '⑧ _buildSc2FactsCore 闭包提取');
const mkCore = new Function('p1', 'shizhengji', 'shiluText', 'personnelChanges', 'GM', 'edicts', 'xinglu', 'memRes',
  '_buildLateSpecialtySummary', '_tmLimitPromptSection', 'TM', '_dbg', 'WorldDigest',
  'return (' + coreSrc.replace('var _buildSc2FactsCore = ', '') + ')');
const fakeGM = { turn: 3, chars: [], _energy: 100, _courtRecords: null, _ty3_pendingReviewForPrompt: null };
const core = mkCore(
  { npc_actions: [{ name: '张甲', action: '上疏言事' }], character_deaths: [{ name: '李乙', reason: '病故' }], faction_ai_outcomes: [] },
  '今岁大旱，河南饥', '实录一行', [{ name: '王丙', change: '升侍郎' }], fakeGM,
  { decree: '开仓赈济河南' }, '夜读典籍', [{ from: '御史台', type: '弹章', status: 'approved', reply: '准' }],
  function(){ return ''; }, function(n, t, c){ return String(t || '').slice(0, c); }, {}, function(){},
  { promptBlock: function(){ return '\n【本回合天下牵动·因果综述】\n· [财政] 赈济→牵动户部\n'; } }
);
const coreOut = core();
ok(coreOut.p1Summary.indexOf('【时政记(摘要)】今岁大旱') >= 0 && coreOut.p1Summary.indexOf('【NPC行动】张甲:上疏言事') >= 0
  && coreOut.p1Summary.indexOf('【死亡】李乙:病故') >= 0 && coreOut.p1Summary.indexOf('【人事】王丙→升侍郎') >= 0,
  '⑧ p1Summary 含时政/NPC行动/死亡/人事(与 legacy 原内联一致)');
ok(coreOut.basisBrief.indexOf('【玩家诏令(须在场景中具体展开执行过程)】') >= 0 && coreOut.basisBrief.indexOf('颁行诏书:开仓赈济河南') >= 0
  && coreOut.basisBrief.indexOf('【主角私人行止') >= 0 && coreOut.basisBrief.indexOf('【本回合奏疏批复') >= 0,
  '⑧ basisBrief 含玩家诏令/行止/奏疏批复');
ok(coreOut.basisBrief.indexOf('【本回合天下牵动·因果综述】') >= 0, '⑧ O1·因果综述已折进 basisBrief');
const coreNoWd = mkCore(null, '', '', [], fakeGM, null, '', [], function(){ return ''; }, function(n, t, c){ return String(t || ''); }, {}, function(){}, { promptBlock: function(){ return ''; } })();
ok(coreNoWd.basisBrief.indexOf('因果综述') < 0, '⑧ 无信号 → 因果综述不注入(返空不污染)');

// ⑨ O3 传递预算化(commit 3)
ok(/var _outlineJsonBudget = function\(ol, budget\) \{/.test(src), '⑨ _outlineJsonBudget 已定义');
ok(src.indexOf('_outlineJsonBudget(_sc2OutlineResult, 5000)') >= 0, '⑨ scR 传递走预算化(原盲切5000)');
ok(src.indexOf('_outlineJsonBudget(_sc2OutlineResult, 4500)') >= 0, '⑨ scP 传递走预算化(原盲切4500)');
const budSrc = extractFn('var _outlineJsonBudget = function(ol, budget) {');
const mkBud = new Function('return (' + budSrc.replace('var _outlineJsonBudget = ', '') + ')');
const bud = mkBud();
const bigOutline = { scenes: [], narrative_arc: '主线弧甲乙丙', character_features: [{ name: '张甲', trait: '刚直' }], time_period_markers: ['廷杖'] };
for (let i = 0; i < 12; i++) bigOutline.scenes.push({ id: i + 1, location: '某地某地某地某地', time: '辰时', characters: ['张甲', '李乙'], event_seed: '事件种子'.repeat(12), outline_lines: ['要点一'.repeat(8), '要点二'.repeat(8), '要点三'.repeat(8), '要点四'.repeat(8), '要点五'.repeat(8)], mood: '肃杀' });
const budOut = bud(bigOutline, 3000);
let budParsed = null;
try { budParsed = JSON.parse(budOut); } catch (_e) {}
ok(budOut.length <= 3000 && !!budParsed, '⑨ 超预算大纲 → ≤预算且仍是合法 JSON(len=' + budOut.length + ')');
ok(budParsed && budParsed.narrative_arc === '主线弧甲乙丙' && Array.isArray(budParsed.character_features) && budParsed.character_features.length === 1, '⑨ 降载后 narrative_arc/character_features 保全(不再被尾切)');
const smallOutline = { scenes: [{ id: 1 }], narrative_arc: 'x' };
ok(bud(smallOutline, 5000) === JSON.stringify(smallOutline), '⑨ 未超预算 → 原样直传');

// ⑩ 确定性亡者审计
ok(/var _outlineDeadAudit = function\(ol\) \{/.test(src), '⑩ _outlineDeadAudit 已定义');
const deadSrc = extractFn('var _outlineDeadAudit = function(ol) {');
const mkDead = new Function('GM', 'return (' + deadSrc.replace('var _outlineDeadAudit = ', '') + ')');
const deadFn = mkDead({ chars: [{ name: '王死', alive: false }, { name: '张活', alive: true }, { name: '李活2' }] });
const deadHits = deadFn({ scenes: [{ characters: ['王死', '张活'] }], character_features: [{ name: '李活2' }] });
ok(deadHits.length === 1 && deadHits[0] === '王死', '⑩ 已亡角色被揪出·在世角色零误报');
ok(deadFn(null).length === 0 && deadFn({}).length === 0, '⑩ 空大纲安全返 []');
ok(src.indexOf('（已亡故·不可现身·除非追忆）') >= 0 && /GM\._turnAiResults\.subcall27_review = _sc27ReviewResult;[\s\S]{0,200}确定性亡者审计/.test(src), '⑩ 亡者并入 name_errors 交 prose 禁用(scR 跳过也兜住)');

// ⑪ scP 单文成文+建议/编年产出
ok(src.indexOf('同 zhengwen·后人戏说体') < 0, '⑪ 双份同文异体请求已删(输出减半·防两份漂移)');
ok(/expectedKeys: \['zhengwen'\], priority: 'high'/.test(src), '⑪ expectedKeys 同步为单 zhengwen');
ok(/var _wcP = _scNP <= 4 \? '500-1000' : '700-1500';/.test(src), '⑪ 字数随场景数伸缩');
ok(src.indexOf('"suggestions":["2-4条大臣进言(忠言可冗长说教)"]') >= 0, '⑪ scP 产真建议(原 3stage 恒空靠兜底)');
ok(/GM\._turnAiResults\.subcall2\.suggestions = _pResult\.suggestions\.slice\(0, 4\)/.test(src), '⑪ 建议写回 subcall2');
ok(/_pResult\.new_activities\.forEach\(function\(a\)\{ if \(a && a\.name\) GM\.biannianItems\.push/.test(src), '⑪ new_activities 进编年(与 legacy 对齐)');

console.log('\n' + (F === 0 ? 'ALL PASS' : 'FAIL') + ' (' + A + ' pass / ' + F + ' fail)');
process.exit(F === 0 ? 0 : 1);
