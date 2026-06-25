/* tm-office-recall-agent.js — 官制活化 #1·主推演 office-recall 子调用（agent 按需取数·走次要 API）
 *
 * 用途：主推演前，先用次要 API 跑一个 tool-calling agent，让它按本回合态势 + 玩家本回合官制操作
 *       自决「该细查哪些官署」(query_office)，把焦点官署详情(含 duties 职责)喂进主推演 prompt 的职权舆图槽。
 * 设计：镜像 tm-memory-agent-tools.js 的 runRecall（单轮多工具·callAIWithTools·tier:'secondary'·护栏≤4）。
 * 不脱节三铁律(owner 2026-06-20)：
 *   (a) 玩家本回合人事/改制/诏令落 GM 后才跑（hook 在主推演前置子调用阶段，天然在玩家操作之后）；
 *   (b) 查当前 GM.officeTree，含玩家刚任免的人 + _pendingReforms 拟制中改制；
 *   (c) 输出喂进主推演 prompt 的职权舆图注入点（非旁路自嗨）。
 * 状态：默认关(officeRecallAgentEnabled / 组闸 officeActivationEnabled)·关=主推演走静态 buildOfficePowerMap·零回归。
 * 跨朝代：只认抽象 power / 官署树·不认朝代专名。
 */
(function (root) {
  'use strict';
  var TM = root.TM || (root.TM = {});

  // query_office 工具定义（单工具·喂给 callAIWithTools 的 tools 参数·通用 JSON Schema）
  var TOOL_DEFS = [
    {
      name: 'query_office',
      description: '细查某官署：在任者(才/德/履职)、所掌权力、职责(duties)、公库。按官署名/官职/在任者/所掌权力查。当某衙门被玩家动过、与本回合大事相关、或要害出缺/失职时调用——只查关键的(每回合至多数个)。',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: '官署名/官职/在任者/权力(如"户部""征税""郭某")' } },
        required: ['query']
      }
    }
  ];

  // 玩家本回合官制操作摘要（不脱节铁律 b：让 agent 知道玩家动了哪些官署→优先细查）
  function _playerOfficeOps(GM) {
    var ops = [];
    var pr = GM && GM._pendingReforms;
    if (Array.isArray(pr) && pr.length) {
      pr.forEach(function (r) {
        if (!r) return;
        ops.push('改制(拟制中)：' + (r.actionLabel || r.action || '改制') + (r.targetName || r.name ? '·' + (r.targetName || r.name) : ''));
      });
    }
    // 本回合人事任免（字段名不定·尽量从可得处取·取不到则只列改制）
    var ap = GM && (GM._turnAppointments || GM._recentAppointments);
    if (Array.isArray(ap) && ap.length) {
      ap.slice(0, 6).forEach(function (a) { if (a) ops.push('任免：' + (a.name || a.who || '') + (a.office || a.position ? '→' + (a.office || a.position) : '')); });
    }
    return ops;
  }

  // 构造 office-recall 子调用 prompt：衙门概览(全覆盖·便宜) + 玩家本回合官制操作 + 本回合预判焦点
  function _buildOfficeRecallPrompt(GM, ctx) {
    ctx = ctx || {};
    var L = [];
    L.push('【官制按需细查·辅助主推演】你是主推演的前置助手。下面是本回合官制态势概览与玩家本回合的官制操作。');
    L.push('请判断哪些官署在本回合最关键（被玩家动过、与大事相关、要害出缺或失职），用 query_office 工具逐一细查（至多 4 个）。其详情将供主推演使用。只查关键的，勿滥查。');
    var overview = '';
    try { if (typeof root.buildOfficePowerMap === 'function') overview = String(root.buildOfficePowerMap(GM, { cap: 8 }) || ''); } catch (e) {}
    if (overview) L.push('\n' + overview);
    var ops = _playerOfficeOps(GM);
    if (ops.length) L.push('\n〔玩家本回合官制操作〕\n' + ops.map(function (o) { return '· ' + o; }).join('\n'));
    if (ctx.focus) L.push('\n〔本回合预判焦点〕' + String(ctx.focus).replace(/\s+/g, ' ').slice(0, 300));
    return L.join('\n');
  }

  /**
   * 单轮多工具 office-recall：发一次 callAIWithTools(tier:'secondary')，执行返回的 query_office 调用(≤4)，
   * 拼成焦点官署详情文本(含 duties)。失败/无能力/无结果 → 返回空 text（上层落回静态 buildOfficePowerMap）。
   * @param {object} GM
   * @param {object} [ctx] { focus?:string 本回合预判焦点(供 agent 判断查哪些) }
   * @returns {Promise<{text:string, toolCalls:Array, toolCallCount:number, fallback:boolean}>}
   */
  async function runOfficeRecall(GM, ctx) {
    ctx = ctx || {};
    GM = GM || root.GM;
    var out = { text: '', toolCalls: [], toolCallCount: 0, fallback: false };
    if (!GM || !GM.officeTree || !GM.officeTree.length) return out;
    var cawt = root.callAIWithTools;
    var qod = root.queryOfficeDetail;
    if (typeof cawt !== 'function' || typeof qod !== 'function') return out;
    var P = root.P || {};
    var maxTok = (P.conf && P.conf.officeRecallMaxTok) || 700;
    var resp;
    try {
      resp = await cawt(_buildOfficeRecallPrompt(GM, ctx), TOOL_DEFS, {
        maxTok: maxTok, tier: 'secondary', priority: 'normal',
        timeoutMs: 45000, maxRetries: 1, id: 'sc_office_recall'
      });
    } catch (e) { return out; }
    if (!resp) return out;
    out.fallback = !!resp.fallback;
    var calls = (Array.isArray(resp.toolCalls) ? resp.toolCalls : []).slice(0, 4); // 护栏：≤4 工具调用
    out.toolCalls = calls;
    out.toolCallCount = calls.length;
    var blocks = [], seen = {};
    for (var i = 0; i < calls.length; i++) {
      var c = calls[i] || {};
      if (c.name !== 'query_office') continue;
      var q = String((c.input && c.input.query) || '').trim();
      if (!q || seen[q]) continue;
      seen[q] = 1;
      var detail;
      try { detail = qod(GM, q); } catch (_e) { continue; }
      if (detail) blocks.push(detail);
    }
    if (blocks.length) out.text = blocks.join('\n');
    return out;
  }

  TM.OfficeRecallAgent = {
    TOOL_DEFS: TOOL_DEFS,
    runOfficeRecall: runOfficeRecall,
    _buildOfficeRecallPrompt: _buildOfficeRecallPrompt,
    version: '0.1.0'
  };
  root.runOfficeRecall = runOfficeRecall;
  if (typeof module !== 'undefined' && module.exports) module.exports = TM.OfficeRecallAgent;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
