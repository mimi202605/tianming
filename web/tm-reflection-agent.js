// @ts-check
/// <reference path="types.d.ts" />
// ============================================================
// tm-reflection-agent.js — 自我反思 agent（S1·核心模块·未接线）
//
// 目的：替代写死的 _scReflect(post-turn-jobs.js)。现状 _scReflect 是个已闭合但"笨"的反馈环：
//   sc0 产 thinking(预测·tm-endturn-ai.js:1256) → _scReflect 比"上回合预测 vs 这回合 memory blurb" → 写 _aiReflections
//   → 下回合 sc1 注入 <self-reflections>(L1961)。三缺口：①只看单点(看不到系统性偏差) ②"实际"是记忆 blurb 非结构化真实结果 ③产出被动 lesson 非可执行校准。
//
// 本 agent 把它升级：每回合比对 + 维护一份**滚动偏差画像**(systematic biases·分域)·把"已知偏差→本回合预测时如何修正"
//   注入 sc0 **预测阶段**(而非 sc1 事后)——让 AI 在预测时就校正自己的盲点。命门(见 [[tianming-top-level-vision]])直接增强：预测越玩越可信。
//
// 守铁律：后台(玩家不等)·单跳不自主循环·开关默认关·_scReflect 兜底零回归·跨朝代中立(domain 用通用词)。
// 复用：MemorySourceBound(provenance·authority 'reflection') / callAIMessages / extractJSON。
// 向后兼容：仍写 GM._aiReflections(同 _scReflect 形状)·故 sc1 的 L1961 注入零改仍工作。新增 GM._aiBiasProfile(滚动画像·供 sc0 注入)。
//
// 接线(S2·未做)：post-turn-jobs _scReflect 在 P.ai.reflectionAgentEnabled 开时跳·改调 TM.ReflectionAgent.run(GM)；
//   sc0 prompt(tm-endturn-ai.js) 注入 TM.ReflectionAgent.formatBiasForSc0(GM)。
// ============================================================

(function (global) {
  var TM = global.TM = global.TM || {};
  if (TM.ReflectionAgent) return;

  var FAIL_THRESHOLD = 2, RETRY_EVERY = 5;

  function _dbg() {
    try { if (global.DebugLog && typeof global.DebugLog.log === 'function') global.DebugLog.log.apply(global.DebugLog, ['ai'].concat(Array.prototype.slice.call(arguments))); } catch (e) {}
  }
  function _now() { return (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0; }

  function _provenance(GM, type, turn, text, sourceItems) {
    try {
      if (TM.MemorySourceBound && typeof TM.MemorySourceBound.buildSummaryMetadata === 'function') {
        return TM.MemorySourceBound.buildSummaryMetadata(GM, { type: type, turn: turn, turnRange: 'T' + turn, text: text || '', sourceItems: sourceItems || [], maxBasisRefs: 12 }) || {};
      }
    } catch (e) {}
    return {};
  }
  function _attachMeta(rec, meta) {
    if (!meta) return rec;
    ['id', 'sourceRefs', 'basisRefs', 'evidenceRefs', 'contentHash', 'authorityLevel', 'authorityRank', 'basisMaxAuthorityRank', 'factStatus', 'lane'].forEach(function (k) { if (meta[k] !== undefined) rec[k] = meta[k]; });
    return rec;
  }
  function _logRun(GM, entry) {
    try { if (!GM._reflectionAgentLog) GM._reflectionAgentLog = []; GM._reflectionAgentLog.push(entry); if (GM._reflectionAgentLog.length > 20) GM._reflectionAgentLog = GM._reflectionAgentLog.slice(-20); } catch (e) {}
  }

  // ── 本回合结构化真实结果（比"记忆 blurb"硬：势力实际增减/事件/玩家诏/死亡）作为 ground truth ──
  function _actualStructured(GM) {
    var p1 = (GM._turnAiResults && GM._turnAiResults.subcall1) || {};
    var lines = [];
    if (Array.isArray(p1.faction_changes)) p1.faction_changes.slice(0, 8).forEach(function (fc) {
      if (!fc || !fc.name) return;
      var d = []; if (fc.strength_delta != null) d.push('力' + (fc.strength_delta > 0 ? '+' : '') + fc.strength_delta);
      if (fc.economy_delta != null) d.push('economy' + (fc.economy_delta > 0 ? '+' : '') + fc.economy_delta);
      if (fc.playerRelation_delta != null) d.push('对玩家' + (fc.playerRelation_delta > 0 ? '+' : '') + fc.playerRelation_delta);
      lines.push('势力' + fc.name + ':' + d.join('/') + (fc.reason ? '(' + String(fc.reason).slice(0, 30) + ')' : ''));
    });
    if (Array.isArray(p1.faction_events)) p1.faction_events.slice(0, 5).forEach(function (fe) { if (fe && fe.actor) lines.push('事件:' + fe.actor + (fe.action || '') + (fe.result ? '→' + fe.result : '')); });
    if (Array.isArray(p1.character_deaths)) p1.character_deaths.slice(0, 4).forEach(function (d) { if (d && d.name) lines.push('亡:' + d.name + '(' + (d.reason || '') + ')'); });
    if (p1.event && p1.event.title) lines.push('主事件:' + p1.event.title);
    // 玩家本回合诏令(真实操作·ground truth)
    if (Array.isArray(GM._edictTracker)) {
      var cur = GM.turn || 0;
      GM._edictTracker.filter(function (e) { return e && e.turn === cur; }).slice(0, 5).forEach(function (e) { lines.push('玩家诏:' + (e.category || '') + ':' + String(e.content || '').slice(0, 40)); });
    }
    // agent 模式无 subcall1·补读 _turnReport(agent 守护写的实际改动流水)作结构化 ground truth(LLM 模式有 subcall1·此块仅 agent 触发·零影响)
    if (!(GM._turnAiResults && GM._turnAiResults.subcall1) && Array.isArray(GM._turnReport)) {
      GM._turnReport.forEach(function (e) {
        if (!e || e.type === 'narrative' || e.type === 'summary') return;
        var s = e._op ? (e._op + '·' + String(e.path || '').replace(/^chars[\/.]/, '')) : (e.path ? (String(e.path) + (e.new !== undefined ? ('→' + String(e.new).slice(0, 24)) : '')) : '');
        if (s) lines.push(s + (e.reason ? '(' + String(e.reason).slice(0, 28) + ')' : ''));
      });
      if (lines.length > 22) lines = lines.slice(0, 22);
    }
    return lines.join('\n');
  }

  function _curBiasProfile(GM) { return (GM && GM._aiBiasProfile && Array.isArray(GM._aiBiasProfile.biases)) ? GM._aiBiasProfile.biases : []; }

  // ── sc0 注入用：把滚动偏差画像格式化为"已知偏差→本回合预测时修正"(S2 接线调用) ──
  function formatBiasForSc0(GM) {
    GM = GM || global.GM;
    var biases = _curBiasProfile(GM);
    if (!biases.length) return '';
    var s = '\n【已知系统性偏差·本回合预测时务必修正(来自自我反思·按此校准·勿重蹈)】\n';
    biases.slice(0, 5).forEach(function (b) {
      if (!b || !b.domain) return;
      s += '  · ' + b.domain + '·你倾向「' + (b.direction || '') + '」→' + (b.correction || '') + '\n';
    });
    return s;
  }

  function buildRequest(GM) {
    var turn = (GM && GM.turn) || 0;
    var lastPred = (GM._lastTurnPredictions && GM._lastTurnPredictions.thinking) || '';
    var actual = _actualStructured(GM);
    var curBias = _curBiasProfile(GM);
    var sys = '你是一个自省的推演者。客观比较「上回合的预测」与「本回合的结构化真实结果」·提炼教训·并维护一份**系统性偏差画像**(你反复犯的预测错误·分域)。诚实·不避讳自己的错。仅返回 JSON。';
    var u = '【上回合预测(你的局势分析摘录)】\n' + String(lastPred).slice(0, 1400) + '\n\n';
    u += '【本回合结构化真实结果(硬 ground truth·非叙事)】\n' + (actual || '(无显著结构化变动)') + '\n\n';
    if (curBias.length) { u += '【当前偏差画像(更新它·确认/修正/移除已纠正的)】\n'; curBias.forEach(function (b) { u += '  · ' + b.domain + ':' + (b.direction || '') + '(' + (b.correction || '') + ')\n'; }); u += '\n'; }
    u += '返回 JSON·\n{'
      + '"predictedLast":"上回合你预测的主走向(60字)",'
      + '"actualThis":"本回合实际发生(60字)",'
      + '"divergence":"high|mid|low",'
      + '"lesson":"本回合教训(60字)",'
      + '"confidence_calibration":-1.0到1.0(负=过于自信需降调),'
      + '"systematic_biases":[{"domain":"势力忠诚|危机时点|经济财政|军事|民心|党争|外交(通用域·非朝代专名)","direction":"高估|低估|偏早|偏晚|忽视","evidence":"依据(近数回合·30字)","correction":"本回合预测时如何修正(40字)"}]'
      + '}·systematic_biases ≤5 项·只留确有证据的·把已纠正的移除。';
    return { system: sys, user: u, turn: turn };
  }

  function applyReflection(GM, parsed) {
    GM = GM || global.GM;
    if (!GM || !parsed) return { applied: false };
    var turn = GM.turn || 0;
    // ① 写 _aiReflections(同 _scReflect 形状·向后兼容 sc1 L1961 注入) + provenance
    if (parsed.lesson) {
      if (!GM._aiReflections) GM._aiReflections = [];
      var rec = {
        turn: turn, predictedLast: parsed.predictedLast || '', actualThis: parsed.actualThis || '',
        divergence: parsed.divergence || 'mid', lesson: parsed.lesson,
        confidence_calibration: parseFloat(parsed.confidence_calibration) || 0
      };
      _attachMeta(rec, _provenance(GM, 'reflection', turn, parsed.lesson, []));
      GM._aiReflections.push(rec);
      if (GM._aiReflections.length > 30) GM._aiReflections = GM._aiReflections.slice(-30);
    }
    // ② 更新滚动偏差画像(新·供 sc0 注入)
    if (Array.isArray(parsed.systematic_biases)) {
      GM._aiBiasProfile = {
        turn: turn, updatedAt: _now(),
        biases: parsed.systematic_biases.filter(function (b) { return b && b.domain; }).slice(0, 5).map(function (b) {
          return { domain: String(b.domain).slice(0, 20), direction: String(b.direction || '').slice(0, 10), evidence: String(b.evidence || '').slice(0, 40), correction: String(b.correction || '').slice(0, 60) };
        })
      };
    }
    return { applied: true, biases: (GM._aiBiasProfile && GM._aiBiasProfile.biases.length) || 0 };
  }

  // ── S4 兜底：连失 FAIL_THRESHOLD 回合→回落 _scReflect·每 RETRY_EVERY 回合重试·每回合缓存决策 ──
  function shouldHandle(GM) {
    GM = GM || global.GM;
    if (!GM) return false;
    var P = global.P || {};
    if (!((typeof global.agentFlagOn==='function' ? global.agentFlagOn('reflectionAgentEnabled') : (P.ai && P.ai.reflectionAgentEnabled)) && TM.ReflectionAgent)) return false;
    var turn = GM.turn || 0;
    if (GM._reflectionDecision && GM._reflectionDecision.turn === turn) return GM._reflectionDecision.active;
    var streak = GM._reflectionFailStreak || 0;
    var active = (streak < FAIL_THRESHOLD) || (turn % RETRY_EVERY === 0);
    GM._reflectionDecision = { turn: turn, active: active };
    return active;
  }

  // ── 编排：首回合存基线→返回；之后比对→单次调用→写回。后台·单跳。 ──
  async function run(GM, opts) {
    opts = opts || {};
    GM = GM || global.GM;
    if (!GM) return { skipped: 'noGM' };
    var P = global.P || {};
    if (!P.ai || !P.ai.key) return { skipped: 'noKey' };
    var thinking = opts.thinking || (GM._turnAiResults && GM._turnAiResults.thinking) || '';  // opts.thinking:agent 模式传本回合推演叙事作"预测"基线(LLM 模式不传·读 subcall0 thinking)
    if (!thinking) return { skipped: 'noThinking' };
    // 首回合(无上回合预测)：存基线·不反思
    if (!GM._lastTurnPredictions) {
      GM._lastTurnPredictions = { turn: GM.turn || 0, thinking: String(thinking).slice(0, 1500) };
      return { skipped: 'baseline', turn: GM.turn || 0 };
    }
    if (typeof global.callAIMessages !== 'function') return { skipped: 'noCaller' };

    var req = buildRequest(GM);
    _dbg('[ReflectionAgent] run T' + req.turn);
    var raw;
    try {
      raw = await global.callAIMessages([{ role: 'system', content: req.system }, { role: 'user', content: req.user }], opts.maxTok || 2000, opts.signal || null, opts.tier || 'primary', { priority: 'background', timeoutMs: opts.timeoutMs || 45000, maxRetries: 1, id: 'reflection_agent' });
    } catch (e) {
      GM._reflectionFailStreak = (GM._reflectionFailStreak || 0) + 1;
      _logRun(GM, { turn: req.turn, failed: true, reason: 'call', error: String(e && e.message || e), streak: GM._reflectionFailStreak, ts: _now() });
      return { failed: true, error: String(e && e.message || e), streak: GM._reflectionFailStreak };
    }
    var parsed = null;
    try { parsed = (typeof global.extractJSON === 'function') ? global.extractJSON(raw) : JSON.parse(raw); } catch (e) {}
    if (!parsed) {
      GM._reflectionFailStreak = (GM._reflectionFailStreak || 0) + 1;
      _logRun(GM, { turn: req.turn, failed: true, reason: 'parse', streak: GM._reflectionFailStreak, ts: _now() });
      return { failed: true, error: 'parse', streak: GM._reflectionFailStreak };
    }
    GM._reflectionFailStreak = 0;
    var res = applyReflection(GM, parsed);
    // 存本回合预测为下回合基线
    GM._lastTurnPredictions = { turn: GM.turn || 0, thinking: String(thinking).slice(0, 1500) };
    var entry = { turn: req.turn, divergence: parsed.divergence, lesson: (parsed.lesson || '').slice(0, 60), biases: res.biases, provenance: !!(TM.MemorySourceBound && TM.MemorySourceBound.buildSummaryMetadata), calls: 1, ts: _now() };
    _logRun(GM, entry);
    _dbg('[ReflectionAgent] divergence=' + parsed.divergence + ' biases=' + res.biases + ' lesson=' + (parsed.lesson || '').slice(0, 40));
    return { ok: true, turn: req.turn, divergence: parsed.divergence, biases: res.biases, lesson: parsed.lesson };
  }

  function lastRun(GM) { GM = GM || global.GM; var l = GM && GM._reflectionAgentLog; return (l && l.length) ? l[l.length - 1] : null; }
  function biasProfile(GM) { GM = GM || global.GM; return (GM && GM._aiBiasProfile) || null; }

  TM.ReflectionAgent = {
    run: run,
    shouldHandle: shouldHandle,
    buildRequest: buildRequest,
    applyReflection: applyReflection,
    formatBiasForSc0: formatBiasForSc0,
    lastRun: lastRun,
    biasProfile: biasProfile,
    _actualStructured: _actualStructured
  };
})(typeof window !== 'undefined' ? window : globalThis);
