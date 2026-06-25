'use strict';
// test-mode-diff.js — 两种模式差异实测(非断言·产出对照报告)
//   我(Claude)当 LLM 脑:同一回合输入·实跑 mode B(AgentMode.run)·完整 dump 产出+机制·再对照 mode A(LLM 管线)契约。
//   ⚠诚实:LLM 全管线(_endTurn_aiInfer·sc0-sc28)node 里跑极脆故以其契约为对照;mode B 是真跑。内容质量由"我当 LLM"提供·此测验机制+产出覆盖·非真模型笔力。
const path = require('path');
const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'tm-ai-change-pathutils.js'));
require(path.join(ROOT, 'tm-endturn-record-specs.js'));
require(path.join(ROOT, 'tm-endturn-agent-read-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-write-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-depth-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-mode.js'));
const TM = globalThis.TM;
const AM = TM.Endturn.AgentMode;

function hr(t) { console.log('\n' + '═'.repeat(72) + '\n  ' + t + '\n' + '═'.repeat(72)); }
function sub(t) { console.log('\n── ' + t + ' ──'); }
function show(label, v) { console.log('  ' + label + ': ' + (v == null || v === '' ? '∅(空)' : (typeof v === 'string' ? v : JSON.stringify(v)))); }

// ── 同一回合输入(崇祯元年·彻查辽饷+起复袁崇焕)──
const TURN_INPUT = { edicts: ['彻查辽饷亏空，户部三日内呈实数', '起复袁崇焕，授蓟辽督师，经略辽东'], xinglu: '夜召孙承宗于文华殿问辽事，三更乃罢' };

function freshGM() {
  return {
    turn: 7, eraName: '崇祯元年',
    guoku: { money: 1000000, balance: 1000000 }, neitang: { money: 200000, balance: 200000 },
    chars: [
      { name: '袁崇焕', alive: true, loyalty: 72, officialTitle: '罢职在籍', location: '广东' },
      { name: '魏忠贤', alive: true, loyalty: 20, officialTitle: '司礼监掌印', location: '京城' },
      { name: '孙承宗', alive: true, loyalty: 85, officialTitle: '兵部尚书', location: '京城' }
    ],
    facs: [{ name: '后金', strength: 82, leader: '皇太极' }, { name: '东林', strength: 48 }],
    armies: [{ name: '关宁军', strength: 60, location: '辽东' }], activeWars: [],
    vars: { socialStability: { value: 50, max: 100 }, centralControl: { value: 55, max: 100 } },
    evtLog: [], _turnReport: [],
    // 上回合遗留的跨回合记忆(供 _memoryDossier 演示 DA-Q3 parity)
    _stateBoard: { turn: 6, mood: '阉党当道·朝局压抑', recent_summary: '新帝即位，阉党未除，辽东糜烂', open_loops: ['辽饷亏空未查', '阉党未除'], unfulfilled_promises: [] },
    _consolidatedMemory: [{ turn: 6, summary: '崇祯即位，魏忠贤暂稳，边事日急' }],
    _plotThreads: [{ id: 'p1', title: '阉党之祸', status: 'active', threadType: 'political' }],
    _foreshadows: [{ turn: 5, content: '袁崇焕五年复辽之诺，他日成两难' }]
  };
}

// ── 我当 LLM:agent 循环脑(callAIWithTools)·按轮给 tool_calls(模拟自适应深推)──
const ROUNDS = [
  // 轮1·察看(只读工具)
  { toolCalls: [{ name: 'get_overview', input: {} }, { name: 'inspect_entity', input: { kind: 'chars', name: '袁崇焕' } }], text: '先察看辽东与辽饷局面' },
  // 轮2·落地(全量工具)
  { toolCalls: [
      { name: 'appoint_official', input: { name: '袁崇焕', position: '蓟辽督师', reason: '起复经略辽东' } },
      { name: 'adjust_field', input: { path: 'chars.2.loyalty', delta: 5, reason: '君上夜询·孙承宗感奋' } },
      { name: 'set_field', input: { path: 'socialStability', value: 46, reason: '辽饷弊案震动·人心浮动' } },
      { name: 'push_field', input: { path: 'evtLog', value: { turn: 7, text: '户部清查辽饷，亏空逾三十万两，胥吏截留事发' }, reason: '辽饷弊案' } }
    ], text: '准辽饷彻查、起复袁崇焕' },
  // 轮3·深化(势力/经济/军事/记忆固化)
  { toolCalls: [
      { name: 'deepen_factions', input: {} }, { name: 'deepen_economy', input: {} },
      { name: 'deepen_military', input: {} }, { name: 'recall_consolidate', input: {} }
    ], text: '深析势力/经济/军事并固化记忆' },
  // 轮4·叙事(史记四体+NPC内心+书信)
  { toolCalls: [{ name: 'deepen_narrative', input: {} }, { name: 'deepen_npcs', input: { focus: ['袁崇焕', '魏忠贤'] } }, { name: 'deepen_letters', input: { focus: ['袁崇焕'] } }], text: '撰史记四体、深化人物内心、生成书信' },
  // 轮5·收尾
  { toolCalls: [{ name: 'finalize_turn', input: { narrative: '崇祯元年秋，帝锐意辽事，起袁崇焕，查辽饷弊。', summary: '起袁崇焕·查辽饷' } }], text: '本回合深度已足，收尾' }
];

// ── 我当 LLM:深化工具脑(callAIMessages)·按各工具**唯一 schema key** 精确匹配(避免 digest 内容串)·返回 key 对齐工具读取 ──
function llmBrainForDeepen(userPrompt, sysPrompt) {
  var u = userPrompt || '';
  // deepen_narrative 第1遍·纲要
  if (/脉络/.test(u)) return JSON.stringify({ beats: ['起复袁崇焕授蓟辽督师', '户部彻查辽饷亏空三十万', '孙承宗夜对文华殿', '阉党魏忠贤侧目'], tone: '锐意而暗藏汹涌' });
  // deepen_narrative 第3遍·后人戏说(hourenSpec)
  if (/撰写《后人戏说》/.test(u)) return JSON.stringify({
    houren_xishuo: '九月初七，天未明，乾清宫的灯还亮着。崇祯搁下户部的奏本，揉了揉眼。"三十万两……"他低声重复，指节叩在案上。王承恩在旁不敢出声。少顷，帝忽道："传谕，起袁崇焕。"夜里召孙承宗于文华殿，问辽事至三更。孙承宗叩首："辽事坏在饷，饷坏在吏。"帝默然良久，只道："朕知道了。"窗外秋风过，吹得烛火一晃。',
    new_activities: [{ name: '夜对文华殿', duration: 1, desc: '与孙承宗议辽', effect: {} }]
  });
  // deepen_narrative 第2遍·史记主体(recordSpecs schema·用户提示词含"据此产出完整史记")
  if (/据此产出完整史记/.test(u)) return JSON.stringify({
    shizhengji: '【朝政】崇祯元年九月，陛下本回合颁谕二道：其一，命户部三日内彻查辽饷亏空实数；其二，起复袁崇焕，授蓟辽督师经略辽东。\n\n【吏治】户部清查，得亏空逾三十万两，多为胥吏层层截留，账实不符。陛下震怒，然积弊已深，三日之限恐难尽核。\n\n【边防】袁崇焕受命，关宁军暂得主心骨，然粮饷未充，复辽非旦夕之功。\n\n【宫廷】魏忠贤侧目，阉党隐忧君上锐意，恐及己身。',
    shilu: '九月，上诏户部核辽饷亏空。是月，起袁崇焕为蓟辽督师，经略辽东。上夜召兵部尚书孙承宗于文华殿，问辽事，至三更乃罢。户部奏辽饷亏三十余万，多为吏蠹所侵。',
    zhengwen: '辽事为崇祯初政之枢。起袁崇焕，意在边防；查辽饷，意在吏治。二者皆触阉党与积弊，朝局自此暗流渐起。',
    playerStatus: '新帝威权初立，锐意辽事，然阉党在侧、积弊在下，孤直难行。',
    playerInner: '三十万两的亏空像一根刺。朕不杀几个人，这饷永远是笔糊涂账——可杀了，又是一场风波。',
    suggestions: ['速定阁臣以分阉党之权', '辽饷须设专员稽核', '安抚关宁军心'],
    title: '锐意起边帅，彻查蠹辽饷', summary: '起袁崇焕、查辽饷，初政触积弊'
  });
  // deepen_factions(唯一 key:toward_player/stance_delta)
  if (/toward_player/.test(u)) return JSON.stringify({
    factions: [
      { name: '后金', intent: '趁明内顾·扰边蓄势', move: '联蒙古·窥蓟镇', toward_player: '敌对·伺机', stance_delta: -3 },
      { name: '东林', intent: '借诛阉之机复起', move: '荐贤·清议', toward_player: '亲附', stance_delta: 8 }
    ],
    undercurrents: [{ faction: '阉党', type: '离心', description: '魏忠贤察君上锐意·暗结党羽自保', impact: '掣肘新政·或先发制人' }],
    schemes: [{ schemer: '阉党', target: '东林', plan: '构陷复起诸臣', progress: '酝酿' }]
  });
  // deepen_economy(唯一 key:fiscal_pressure)
  if (/fiscal_pressure/.test(u)) return JSON.stringify({ assessment: '太仓亏空·辽饷压顶·三十万缺口暴露胥吏侵蚀之深', risks: ['辽饷无着', '清查激变胥吏'], trends: ['赤字扩大'], fiscal_pressure: '9·辽饷压顶' });
  // deepen_military(唯一 key:war_risk)
  if (/war_risk/.test(u)) return JSON.stringify({ assessment: '辽东糜烂·关宁独支·后金压境·得袁崇焕暂安军心然粮饷未充', threats: ['后金', '蒙古'], recommendations: ['足饷', '固关宁', '修城堡'], war_risk: '8·后金压境' });
  // recall_consolidate(唯一 key:causal_edges/state_board)
  if (/causal_edges/.test(u)) return JSON.stringify({
    memory: '崇祯起袁崇焕授蓟辽督师、彻查辽饷得亏空三十万、夜对孙承宗议辽。阉党魏忠贤侧目。',
    state_board: { mood: '锐意辽事·阉党暗生戒心', recent_summary: '起边帅、查辽饷，初政触积弊，阉党侧目', open_loops: ['辽饷专员未设', '阉党未除', '复辽承诺'], unfulfilled_promises: ['五年复辽'] },
    plot_updates: [{ threadId: 'p1', title: '阉党之祸', threadType: 'political', update: '君上锐意·阉党暗结自保', status: 'active' }, { title: '辽东复局', threadType: 'military', update: '袁崇焕受命经略', status: 'active', newThread: true }],
    foreshadow: ['辽饷专员一职，他日成党争焦点', '五年复辽之诺，伏崇祯朝最大变数'],
    causal_edges: [
      { from: '彻查辽饷', to: '胥吏截留事发', type: 'triggered', strength: 0.9, explanation: '清查揭出三十万亏空' },
      { from: '起复袁崇焕', to: '关宁军心稳', type: 'enabled', strength: 0.7, explanation: '边帅有主' },
      { from: '君上锐意', to: '阉党离心', type: 'escalated', strength: 0.6, explanation: '魏忠贤戒心起' }
    ]
  });
  // deepen_letters(唯一 key:letterType)
  if (/letterType/.test(u)) return JSON.stringify({ letters: [{ from: '袁崇焕', to: '玩家', letterType: 'plea', urgency: 'urgent', content: '臣受命经略，然辽饷未充、关宁缺额，乞陛下速发内帑应急，否则复辽无从着手。' }] });
  // deepen_npcs(唯一 key:stress_delta/hidden_intent·返回 key 对齐工具读取)
  if (/stress_delta/.test(u)) return JSON.stringify({ npcs: [
    { name: '袁崇焕', mood: '忧饷', stress_delta: 12, inner: '君恩深重，然辽事如焚，饷械皆缺，五年之诺恐难践', hidden_intent: '先稳关宁再图复辽' },
    { name: '魏忠贤', mood: '惊惧', stress_delta: 18, inner: '新帝非天启可比，锐意如此，我辈危矣', hidden_intent: '结党自保·或先发制人' }
  ] });
  // deepen_cognition(唯一 key:currentView·读 p.npcs)
  if (/currentView/.test(u)) return JSON.stringify({ npcs: [{ name: '孙承宗', currentView: '君上可辅，然操之过急恐生变', recognition: '已察阉党暗动' }] });
  // deepen_world(唯一 key:world_snapshot)
  if (/world_snapshot/.test(u)) return JSON.stringify({ world_snapshot: '崇祯初政，诛阉在即，辽事危殆，关宁独支，后金压境', next_turn_seeds: '辽饷党争酝酿、阉党或先发、袁崇焕请饷', tension_level: '8·内忧外患交迫' });
  return JSON.stringify({});
}

(async function () {
  hr('两种模式差异实测 · 同一回合输入');
  show('回合', '崇祯元年(T7)');
  show('玩家诏令', TURN_INPUT.edicts.join(' / '));
  show('玩家行止', TURN_INPUT.xinglu);

  // ════ 跑 mode B(agent 模式·真跑)════
  delete globalThis._endTurn_updateSystems;            // 无引擎(node)·agent 在当前态推演
  // 只断 prompt.build(强制薄 baseline)·保留 recordSpecs/hourenSpec(真实运行时它们独立加载·恒在)
  if (TM.Endturn.AI && TM.Endturn.AI.prompt) TM.Endturn.AI.prompt.build = null;
  // stub 语义写引擎(真实运行时 onAppointment/onDismissal 由 core 提供·node 缺→appoint 会失败)
  globalThis.onAppointment = function (name, pos) { return { ok: true, name: name, position: pos }; };
  globalThis.onDismissal = function (name, reason) { return { ok: true, name: name }; };
  globalThis.P = { conf: { agentModeDepthGate: true } };  // 深度门开(真实默认)
  var trace = [];
  var si = 0;
  globalThis.callAIWithTools = async function (transcript, tools) {
    var r = ROUNDS[si] || { toolCalls: [], text: '' };
    trace.push({ round: si + 1, toolCount: (tools || []).length, calls: (r.toolCalls || []).map(function (c) { return c.name; }) });
    si++; return r;
  };
  globalThis.callAIMessages = async function (msgs) {
    var u = (msgs && msgs[1] && msgs[1].content) || '';
    var s = (msgs && msgs[0] && msgs[0].content) || '';
    return llmBrainForDeepen(u, s);
  };
  var gmB = freshGM();
  var resB = await AM.run({ GM: gmB, input: TURN_INPUT });

  hr('模式 B(Agent)· 实跑结果');
  sub('① 机制(自适应工具循环)');
  trace.forEach(function (t) { console.log('  轮' + t.round + ' · 挂载工具 ' + t.toolCount + ' 个 · 调用:[' + t.calls.join(', ') + ']'); });
  show('总轮数', (gmB._agentTurnMeta || {}).rounds);
  show('深度门驳回次数', (gmB._agentTurnMeta || {}).finalizeRejects);
  show('深化工具记账', (gmB._agentTurnMeta || {}).depthTools);
  show('ok/fallback', resB.ok + '/' + resB.fallback);

  var ar = resB.aiResult || {};
  sub('② 产出 · 史记弹窗四体 + record 契约(aiResult)');
  show('实录(shiluText)', String(ar.shiluText || '').slice(0, 90) + '…');
  show('时政记标题(szjTitle)', ar.szjTitle);
  show('时政记正文(shizhengji)', String(ar.shizhengji || '').slice(0, 90) + '…');
  show('政文(zhengwen)', String(ar.zhengwen || '').slice(0, 60) + '…');
  show('后人戏说(hourenXishuo)', String(ar.hourenXishuo || '').slice(0, 90) + '…');
  show('后人戏说·字数', String(ar.hourenXishuo || '').length);
  show('君上状态(playerStatus)', ar.playerStatus);
  show('主角内心(playerInner)', ar.playerInner);
  show('宰辅进言(suggestions)', ar.suggestions);
  show('一句话摘要(turnSummary)', ar.turnSummary);
  show('人事变动(personnelChanges)', ar.personnelChanges);

  sub('③ GM 副作用 · 状态变更/记忆/连续性(mode A 靠 apply+followup 出·mode B 靠守护写+深化工具)');
  show('turnChanges.人物', (gmB.turnChanges && gmB.turnChanges.characters || []).map(function (c) { return c.name + '[' + c.changes.map(function (h) { return h.field; }).join(',') + ']'; }));
  show('turnChanges.势力', (gmB.turnChanges && gmB.turnChanges.factions || []).map(function (f) { return f.name; }));
  show('turnChanges.变量', (gmB.turnChanges && gmB.turnChanges.variables || []).map(function (v) { return v.name + '(' + v.oldValue + '→' + v.newValue + ')'; }));
  show('势力暗流(_factionUndercurrents)', (gmB._factionUndercurrents || []).map(function (u) { return u.faction + ':' + u.type; }));
  show('活跃阴谋(activeSchemes)', (gmB.activeSchemes || []).map(function (s) { return s.schemer + '→' + s.target; }));
  show('经济深析(_economyDeepening)', gmB._economyDeepening && gmB._economyDeepening.fiscalPressure);
  show('军事深析(_militaryDeepening)', gmB._militaryDeepening && gmB._militaryDeepening.warRisk);
  show('状态盘(_stateBoard.mood)', gmB._stateBoard && gmB._stateBoard.mood);
  show('固化记忆条数(_consolidatedMemory)', (gmB._consolidatedMemory || []).length);
  show('情节线索(_plotThreads)', (gmB._plotThreads || []).map(function (t) { return t.title; }));
  show('伏笔(_foreshadows)条数', (gmB._foreshadows || []).length);
  show('因果链(_causalGraph.edges)', (gmB._causalGraph && gmB._causalGraph.edges || []).map(function (e) { return e.from + '→' + e.to; }));
  show('书信(letters)', (gmB.letters || []).map(function (L) { return L.from + '→' + L.to; }));
  show('NPC内心(袁崇焕._mood/stress)', (function () { var c = (gmB.chars || []).filter(function (x) { return x.name === '袁崇焕'; })[0]; return c ? (c._mood + '/压力' + c.stress) : '∅'; })());

  // ════ mode A(LLM 管线)契约对照 ════
  hr('模式 A(LLM 管线)· 契约对照');
  sub('① 机制(固定场景管线)');
  console.log('  _endTurn_aiInfer 内固定跑 sc0→sc28(~17-25 次 LLM 调用·每次一个固定维度)');
  console.log('  sc0 深研判 / sc1 结构化变更 / sc1b 文事鸿雁 / sc1c 势力暗流 / sc1d 实录时政救援 / sc2 后人戏说 / sc15 NPC / sc16 势力 / sc17 经济 / sc18 军事 / sc25 记忆固化 / sc28 世界快照 …');
  console.log('  → 刚性均匀:每维度必跑一次·与本回合是否吃紧无关');

  sub('② 产出契约(ai-infer:73 ctx.record + 活态层)对照 mode B 覆盖');
  var contract = [
    ['shilu_text 实录', !!ar.shiluText], ['szj_title 时政记标题', !!ar.szjTitle], ['shizhengji 时政记正文', !!ar.shizhengji],
    ['szj_summary 总结', !!ar.szjSummary], ['zhengwen 政文', !!ar.zhengwen], ['houren_xishuo 后人戏说', !!ar.hourenXishuo],
    ['player_status 君上状态', !!ar.playerStatus], ['player_inner 主角内心', !!ar.playerInner], ['suggestions 进言', !!(ar.suggestions && ar.suggestions.length)],
    ['turn_summary 摘要', !!ar.turnSummary], ['personnel_changes 人事', Array.isArray(ar.personnelChanges)],
    ['turnChanges→Delta面板', !!(gmB.turnChanges && (gmB.turnChanges.characters.length || gmB.turnChanges.variables.length))],
    ['_factionUndercurrents 势力暗流', !!(gmB._factionUndercurrents && gmB._factionUndercurrents.length)],
    ['activeSchemes 阴谋', !!(gmB.activeSchemes && gmB.activeSchemes.length)],
    ['_stateBoard 状态盘', !!gmB._stateBoard], ['_consolidatedMemory 固化记忆', !!(gmB._consolidatedMemory && gmB._consolidatedMemory.length)],
    ['_plotThreads 情节线索', !!(gmB._plotThreads && gmB._plotThreads.length)], ['_foreshadows 伏笔', !!(gmB._foreshadows && gmB._foreshadows.length)],
    ['_causalGraph 因果链', !!(gmB._causalGraph && gmB._causalGraph.edges.length)], ['letters 书信', !!(gmB.letters && gmB.letters.length)],
    ['NPC _mood/stress 内心', (gmB.chars || []).some(function (c) { return c._mood || c.stress != null; })]
  ];
  var cov = 0;
  contract.forEach(function (row) { if (row[1]) cov++; console.log('  ' + (row[1] ? '✅' : '❌') + ' ' + row[0]); });
  console.log('\n  ▶ mode B 覆盖 LLM 契约: ' + cov + '/' + contract.length + ' 字段');

  sub('③ 输入 parity(DA-Q3)· mode B baseline 是否含跨回合记忆(地板)');
  var md = AM.memoryDossier(gmB);
  console.log('  _memoryDossier 含: ' + ['状态盘', '固化记忆', '情节线索', '伏笔', '因果链'].filter(function (k) {
    return (k === '状态盘' && /状态盘/.test(md)) || (k === '固化记忆' && /固化记忆/.test(md)) || (k === '情节线索' && /情节线索/.test(md)) || (k === '伏笔' && /伏笔/.test(md)) || (k === '因果链' && /因果链/.test(md));
  }).join(' · '));
  console.log('  (LLM sc1 靠 _sc1Prefix push 同批记忆·mode B 此前缺·DA-Q3 补齐为地板·读工具是超集)');

  hr('结论');
  console.log('  · 机制差异:mode A 固定 17-25 场景(刚性均匀) vs mode B 自适应 ' + ((gmB._agentTurnMeta || {}).rounds) + ' 轮工具循环(察看→落地→深化→叙事·深度门逼多轮)');
  console.log('  · 产出差异:A-做对前 mode B 仅~1/3 契约;现 ' + cov + '/' + contract.length + ' 覆盖(史记四体逐字同源+turnChanges+记忆+因果+书信+NPC内心)');
  console.log('  · 同源:史记字段提示词两端共用 recordSpecs/hourenSpec(零 drift·字节级一致)·字数同 _getCharRange');
  console.log('  · ⚠本测为机制+覆盖实测(我当 LLM 供内容)·真模型决策质量须 owner BYOK 真机整局玩验');
})().catch(function (e) { console.error('测试异常:', e); process.exit(1); });
