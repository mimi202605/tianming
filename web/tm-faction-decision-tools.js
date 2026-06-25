// tm-faction-decision-tools.js
// ─────────────────────────────────────────────────────────────────────────────
// 【势力 agent · A 按需取数整合(②+③合并) · S1】
// decideFor(势力精算)原本每回合把 ~26 段感知"全塞"+单发 callAI。本模块把其中 ~18 段
// "按需感知"收成 6 个工具·让势力 tool-calling 时**自取所需**(简单回合少查=更省·复杂回合按需深查)。
//   · 工具的实际取数复用现成 _format* 格式化函数·经 ctx.formatters 注入(解耦·便于 node 自测)。
//   · S1 只建工具集 + 执行器·**不接线**(decideFor 路由留 S2)·默认关(factionToolDecisionEnabled)·零回归。
//   · 常驻核心(~8 段:aiStrategy/目标栈/行动候选/邦交战争/财政/君主心理/世界态势简)仍走基础 prompt·不入工具。
// ─────────────────────────────────────────────────────────────────────────────
(function (root) {
  'use strict';
  var TM = root.TM || (root.TM = {});

  // ── 6 个工具定义(喂给 callAIWithTools 的 tools 参数·schema 为 OpenAI/Anthropic 通用 JSON Schema) ──
  var DEFS = [
    {
      name: 'assess_rivals',
      description: '查看对手与盟友的心智模型：谁强谁弱、对本势力的态度、可能的行动倾向。当你要权衡战和、结盟、背叛、防范时调用。',
      parameters: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'review_court',
      description: '查看近期朝堂廷议博弈与君上(玩家)的世界诏令走向。当你的决策与朝局权力消长、君命相关时调用。',
      parameters: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'review_my_record',
      description: '回顾本势力近回合的失败教训、诏令合规、决策风格与历史轨迹。当你要避免重复错误、保持战略连贯时调用。',
      parameters: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'scan_world',
      description: '扫描近期天下大事、君上(玩家)动向与世界态势。当你需要把握大局变化时调用。',
      parameters: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'inspect_my_assets',
      description: '细查本势力的官僚体系、军事实力与财政细节。当你要发动军事、财政或人事行动、需确认家底时调用。',
      parameters: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'recall_history',
      description: '按关键词或人物/势力名检索历史先例与人物记忆，为决策找依据。',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: '检索的关键词或人物/势力名' } },
        required: ['query']
      }
    },
    {
      name: 'query_office',
      description: '按官署名/官职/在任者/所掌权力查某衙门详情：在任者(才/德/履职)、所掌权力、职责(duties)、公库。当你的决策涉及具体衙门、要借重/任免/弹劾某官、或评估对手掌权之臣时调用。',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: '官署名/官职/在任者/权力(如"户部""征税""郭某")' } },
        required: ['query']
      }
    }
  ];

  // ── name → formatter 组合键(实际函数经 ctx.formatters 注入·缺失则跳过·不报错) ──
  var ROUTING = {
    assess_rivals:     ['opponentMindModel', 'allyMindModel'],
    review_court:      ['courtDebate', 'worldDirective'],
    review_my_record:  ['lastTurnFailures', 'lastTurnCompliance', 'decisionStyleTrend', 'factionTrajectory'],
    scan_world:        ['recentWorld', 'playerRecent', 'worldStatus'],
    inspect_my_assets: ['ownAdminHierarchy', 'militaryContext', 'fiscalContext'],
    recall_history:    ['recall'],  // 特殊：带 query 参数
    query_office:      ['officeQuery']  // 特殊：带 query 参数·官制 agent 化按需取数(queryOfficeDetail·返 duties)
  };

  // 调一个注入进来的 formatter·统一兜底(返回字符串·数组→join·异常/缺失→'')
  // 【S3】async：await 兼容同步/异步 formatter(异步如复用②做 query-aware recall)·await 非 Promise 值亦安全
  async function _callFmt(formatters, key, ctx, input) {
    try {
      var fn = formatters && formatters[key];
      if (typeof fn !== 'function') return '';
      // recall 特殊签名(query, ctx)·其余统一 (fac, ctx)
      var out = (key === 'recall' || key === 'officeQuery') ? await fn((input && input.query) || '', ctx) : await fn(ctx.fac, ctx);
      if (out == null) return '';
      return Array.isArray(out) ? out.join('\n') : String(out);
    } catch (e) { return ''; }
  }

  // 执行一个工具调用 → 返回组合好的感知文本(回传给 LLM 第二轮决策)
  //   name: 工具名 · input: 工具入参(如 recall_history 的 {query}) · ctx: { fac, alive, ruler, formatters }
  // 【S3】async：支持异步 formatter(recall 复用②)·调用方须 await
  async function handle(name, input, ctx) {
    ctx = ctx || {};
    var keys = ROUTING[name];
    if (!keys) return { ok: false, name: name, text: '(未知工具：' + name + ')' };
    var parts = [];
    for (var i = 0; i < keys.length; i++) {
      var t = await _callFmt(ctx.formatters, keys[i], ctx, input);
      if (t && t.trim()) parts.push(t.trim());
    }
    var text = parts.join('\n');
    return { ok: true, name: name, text: text || '(无相关信息)' };
  }

  function defs() { return DEFS.slice(); }

  // 工具名集合(护栏/校验用)
  function isToolName(name) { return Object.prototype.hasOwnProperty.call(ROUTING, name); }

  TM.FactionDecisionTools = {
    defs: defs,
    DEFS: DEFS,
    ROUTING: ROUTING,
    handle: handle,
    isToolName: isToolName
  };
})(typeof window !== 'undefined' ? window : globalThis);
