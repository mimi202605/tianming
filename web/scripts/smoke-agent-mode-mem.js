'use strict';
// ============================================================
// smoke-agent-mode-mem.js — 「模式 b · 记忆 grounding + 跨回合连续性」(2026-06·owner"会不会失忆")
//   验:① _playerOpsDigest 收集玩家操作 ② _turnDigest 纳入玩家操作(深化 ground)
//       ③ deepen_narrative 的 prompt 含【跨回合记忆】(上回合状态盘/近回合记忆/进行中情节线/未回收伏笔)→ 史记接前文不失忆
//   纯 node·捕获 callAIMessages 的 prompt 断言其内容·不调真模型。
// ============================================================
const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');
const passed = { value: 0 };
const assert = makeAssert(passed);

require(path.join(ROOT, 'tm-ai-change-pathutils.js'));
require(path.join(ROOT, 'tm-endturn-record-specs.js'));
require(path.join(ROOT, 'tm-endturn-agent-depth-tools.js'));

const DT = globalThis.TM.Endturn.AgentDepthTools;
assert(DT && typeof DT.handle === 'function', 'AgentDepthTools.handle 已导出');
assert(typeof DT._turnDigest === 'function', '_turnDigest 已导出(测试用)');

function makeGM() {
  return {
    turn: 5, eraName: '崇祯元年', guoku: 340000, chars: [{ name: '袁崇焕', loyalty: 83, _mood: '敬' }, { name: '魏忠贤', loyalty: 8 }],
    _turnReport: [{ type: 'narrative', text: '本回合彻查辽饷。', _agent: true }],
    _agentWriteLog: [{ path: 'guoku', reason: '拨袁崇焕军资' }],
    // 玩家操作摘要(run() 会 stash·此处直接置)
    _turnPlayerOps: '【本回合玩家操作 · 你的推演必须逐项落实其后果】\n▸ 诏令/举措:\n   · 命新任蓟辽督师袁崇焕经略辽东\n▸ 奏疏朱批:\n   · 「辽饷告急」(袁崇焕)→批:着户部会核',
    // 跨回合记忆(上回合 recall_consolidate 写)
    _stateBoard: { turn: 4, mood: '锐意辽事·阉党戒心', recent_summary: '上回合起袁崇焕、查辽饷触积弊', open_loops: ['辽饷专员未设', '阉党未除'], unfulfilled_promises: ['五年复辽'] },
    _consolidatedMemory: [{ turn: 3, summary: '诛阉布局' }, { turn: 4, summary: '起袁崇焕授蓟辽督师、查辽饷得亏空三十万' }],
    _plotThreads: [{ id: 't1', title: '辽东复局', status: 'active', threadType: 'military' }, { id: 't2', title: '诛除阉党', status: 'brewing' }],
    _foreshadows: [{ turn: 4, content: '五年复辽之诺日后成两难' }, { turn: 4, content: '辽饷专员成党争焦点' }],
    // ④ 编年长期事势 + 过往史记(实录/时政) + 过往御批 + 压缩层
    _chronicleTracks: [{ id: 'c1', title: '辽东复局工程', status: 'active', currentStage: '整军', progress: 30, narrative: '袁崇焕整饬关宁' }, { id: 'c2', title: '诛除阉党大计', status: 'brewing', narrative: '暗收罪证' }, { id: 'c3', title: '旧案', status: 'completed' }],
    shijiHistory: [{ turn: 3, szjTitle: '诛阉初动', shilu: '三月，锦衣卫田尔耕下狱，阉党震动。', playerInner: '不除此獠寝食难安。' }, { turn: 4, szjTitle: '起袁查饷', shilu: '四月，起袁崇焕为蓟辽督师，诏查辽饷。' }],
    _memoryLayers: { L2: [{ turnBucket: 5, summary: '崇祯初政诛阉布局段' }], L3: [] },
    memorials: [{ turn: 3, title: '请诛魏忠贤', reply: '俟时机·暂隐忍', status: 'annotated' }, { turn: 4, title: '辽东军情', reply: '着袁崇焕便宜行事', status: 'approved' }],
    qijuHistory: [{ turn: 3, text: '帝御文华殿批奏疏至夜' }, { turn: 4, text: '帝召孙承宗议辽事', _annotation: '辽事托付卿矣' }],
    // ④ Q1 多回合综合脉络(recall_consolidate 滚动产·贯穿主线)
    _sagaMemory: { turn: 4, text: '崇祯初政三回合主线:诛阉布局渐成→起袁崇焕经略辽东并彻查辽饷→辽饷亏空牵出阉党、党争由此成焦点。' }
  };
}

(async function () {
  // ── _turnDigest 纳入玩家操作 ──
  const gm0 = makeGM();
  const digest = DT._turnDigest(gm0);
  assert(/玩家操作/.test(digest) && /袁崇焕经略辽东/.test(digest), '_turnDigest 纳入玩家操作(深化工具 ground 在玩家所为)');
  assert(/本回合彻查辽饷/.test(digest), '_turnDigest 仍含本回合纪事(原有不丢)');

  // ── deepen_narrative 的 prompt 含跨回合记忆 + 玩家操作 ──
  const gm = makeGM();
  const prompts = [];
  globalThis.callAIMessages = async function (msgs) {
    const u = (msgs && msgs[1] && msgs[1].content) || '';
    prompts.push(u);
    if (/脉络/.test(u)) return JSON.stringify({ beats: ['辽东复局推进'], tone: '锐意' });
    if (/撰写《后人戏说》/.test(u)) return JSON.stringify({ houren_xishuo: '是日…' });
    if (/据此产出完整史记/.test(u)) return JSON.stringify({ shizhengji: '时政记。', shilu: '实录。', zhengwen: '政文。', playerStatus: '状', playerInner: '内', suggestions: ['进言'], title: '标', summary: '摘' });
    return JSON.stringify({});
  };
  await DT.handle('deepen_narrative', {}, { GM: gm });

  const all = prompts.join('\n\n');
  assert(/跨回合记忆/.test(all), 'deepen_narrative prompt 含【跨回合记忆】段(治内容失忆)');
  assert(/辽东复局/.test(all) && /进行中情节线/.test(all), 'prompt 含进行中情节线(史记须推进·勿重造)');
  assert(/五年复辽|未回收伏笔/.test(all), 'prompt 含未回收伏笔(史记须推进伏笔)');
  assert(/上回合状态|锐意辽事/.test(all), 'prompt 含上回合状态盘(续接)');
  assert(/起袁崇焕授蓟辽督师|近回合记忆/.test(all), 'prompt 含近回合固化记忆(接前文)');
  assert(/袁崇焕经略辽东/.test(all), 'prompt 含本回合玩家操作(grounding·扣玩家所为)');
  // 纲要遍也须带记忆(史记从纲要起就接前文)
  const beatsPrompt = prompts.find(function (p) { return /列出本回合史记应涵盖的关键脉络/.test(p); });
  assert(beatsPrompt && /跨回合记忆/.test(beatsPrompt), '纲要遍(raw1)也含跨回合记忆(从立纲要就接前文)');

  // ④ 编年长期事势 + 过往史记 进 deepen_narrative prompt(完成的不进·进行中的进)
  assert(/辽东复局工程/.test(all) && /诛除阉党大计/.test(all), '④ prompt 含编年进行中长期事势(史记须呼应推进)');
  assert(!/旧案/.test(all), '④ 编年已完成项(status=completed)不进(只读进行中)');
  assert(/起袁崇焕为蓟辽督师|前几回合史记/.test(all), '④ prompt 含前几回合史记·实录(续接历史)');
  // ④ Q1 多回合综合脉络进 deepen prompt(史记接贯穿主线·非另起)
  assert(/多回合.*脉络|崇祯初政三回合主线/.test(all), 'Q1 prompt 含多回合综合脉络(贯穿主线·叙事须接)');
  // Q2 人物言行一致(防人格分裂):deepen_narrative prompt 须含一致性指令
  assert(/言行.*一致|人格分裂/.test(all), 'Q2 deepen_narrative prompt 含人物言行一致指令(防人格分裂)');
  // 信史校准(镜像 sc27·防时代错乱/人名错误):deepen_narrative prompt 须含校准约束 + 在世名单
  assert(/信史校准/.test(all) && /时代错乱/.test(all), '信史校准:deepen_narrative prompt 含防时代错乱/人名错误约束(镜像 LLM sc27)');
  assert(/袁崇焕/.test(all), '信史校准:在世人名名单注入(prompt 含真实人物名·禁杜撰)');

  // ④ Q1 recall_consolidate 滚动产出 saga(综合多回合)
  const gm2 = makeGM(); delete gm2._sagaMemory;  // 清空·验从无到有产出
  globalThis.callAIMessages = async function (msgs) {
    var u = (msgs && msgs[1] && msgs[1].content) || '';
    if (/固化为记忆与连续性/.test(u)) {
      assert(/近回合记忆.*综合|请综合成连贯脉络/.test(u), 'Q1 recall_consolidate prompt 喂入近回合记忆供综合');
      return JSON.stringify({ memory: '本回合查辽饷。', saga: '主线:诛阉→起袁查饷→党争升温(综合三回合)。', state_board: { mood: '锐意', recent_summary: '查饷', open_loops: [], unfulfilled_promises: [] } });
    }
    return JSON.stringify({});
  };
  await DT.handle('recall_consolidate', {}, { GM: gm2 });
  assert(gm2._sagaMemory && /综合三回合/.test(gm2._sagaMemory.text), 'Q1 recall_consolidate 产出并存入 gm._sagaMemory(滚动多回合脉络)');

  // bug 修:后人戏说健壮抽取(治"houren 空→render 回落 zhengwen=政文")
  //   模拟弱模型:长 prose 塞 JSON·字面换行致标准 JSON.parse 失败→旧版 _houren 空→render 把政文当后人戏说。
  const gm3 = makeGM();
  globalThis.callAIMessages = async function (msgs) {
    var u = (msgs && msgs[1] && msgs[1].content) || '';
    var sysc = (msgs && msgs[0] && msgs[0].content) || '';
    if (/撰写《后人戏说》/.test(sysc)) return '{"houren_xishuo":"是日清晨，宁远城头\n朔风猎猎，袁崇焕按剑而立，\n谓左右曰：城在人在、城亡人亡。"}'; // 字面换行·非法 JSON·匹配 raw3 专属系统词(raw2 系统也提"后人戏说"会误中)
    if (/据此产出完整史记/.test(u)) return JSON.stringify({ shizhengji: '时政记主体。', zhengwen: '政文宏观政论主体内容。', shilu: '实录。', playerStatus: '状', playerInner: '内', title: '标', summary: '摘' });
    if (/脉络/.test(u)) return JSON.stringify({ beats: ['辽事推进'], tone: '锐意' });
    return JSON.stringify({});
  };
  await DT.handle('deepen_narrative', {}, { GM: gm3 });
  assert(gm3._agentChronicle && gm3._agentChronicle.hourenXishuo && /袁崇焕按剑而立/.test(gm3._agentChronicle.hourenXishuo), 'bug修:后人戏说 JSON 解析失败时健壮抽取(非空·不致 render 回落政文)');
  assert(gm3._agentChronicle.hourenXishuo !== gm3._agentChronicle.zhengwen, 'bug修:后人戏说 ≠ 政文(文风迥异·非回落复制)');

  console.log('[smoke-agent-mode-mem] pass assertions=' + passed.value);
})().catch(function (e) { console.error(e); process.exit(1); });
