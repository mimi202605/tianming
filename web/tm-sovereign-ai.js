// @ts-check
// ============================================================
// tm-sovereign-ai.js — 穿越模式·君主 AI 自动决策引擎（Phase 3 · Task 6-10）
// ------------------------------------------------------------
// 跨朝代铁律：本文件绝不出现任何朝代专属机构/职务/科场专名，
//   一律由剧本 hook 或用通称："朝堂"代中枢机构，"诏令"代拟旨产物，
//   "内廷"代君主近侍组织，"科场"代取士名目。
//   引擎层只提供"君主 AI 决策 → 下旨/朝议/批奏/任免"通用框架。
// ------------------------------------------------------------
// 暴露：window.TM.SovereignAI.{runTurn, _generateEdicts, _triggerChaoyi,
//                               _processOfficeActions, _isEnabled,
//                               _buildPrompt, _validateOutput, _fallbackOutput}
// 依赖（运行时软依赖，缺席时降级）：
//   callAI / extractJSON / classifyEdict / estimateResistance / applyEdictTypedIncidence
//   addCYBubble / addEB / findCharByName / _offAppointPerson / _offDismissPerson
//   onAppointment / onDismissal / TM.Transmigration / P.playerInfo / GM.*
// ============================================================
(function (global) {
  'use strict';

  function _safeNum(v) { return (typeof v === 'number' && isFinite(v)) ? v : 0; }
  function _clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function _arr(v) { return Array.isArray(v) ? v : []; }
  function _str(v, max) {
    if (v == null) return '';
    var s = (typeof v === 'string') ? v : String(v);
    s = s.replace(/\s+/g, ' ').trim();
    return (max && s.length > max) ? (s.slice(0, max) + '…') : s;
  }
  function _sovereignNameFallback() {
    try {
      if (global.P && global.P.playerInfo && global.P.playerInfo.sovereignName) {
        return global.P.playerInfo.sovereignName;
      }
    } catch (_) {}
    return '君主';
  }

  // ── 是否启用：穿越模式 + 玩家非君主 ──
  function _isEnabled() {
    try {
      if (!global.TM || !global.TM.Transmigration) return false;
      if (!global.TM.Transmigration.isTransmigrationMode()) return false;
      if (!global.P || !global.P.playerInfo) return false;
      var role = global.P.playerInfo.playerRole;
      if (role === 'emperor') return false;
      return true;
    } catch (_) { return false; }
  }

  // ── LLM 调用（复用 global.callAI·失败/缺件返回 null）──
  function _withTimeout(promise, ms) {
    if (!ms || typeof global.setTimeout !== 'function') return promise;
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = global.setTimeout(function () {
        if (done) return; done = true; reject(new Error('LLM timeout'));
      }, ms);
      promise.then(function (v) {
        if (done) return; done = true; global.clearTimeout(timer); resolve(v);
      }, function (e) {
        if (done) return; done = true; global.clearTimeout(timer); reject(e);
      });
    });
  }

  function _extractJsonText(raw) {
    var s = String(raw || '').replace(/```json/gi, '```').replace(/```/g, '').trim();
    var a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b <= a) return '';
    return s.slice(a, b + 1).replace(/,\s*([}\]])/g, '$1').replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  }

  function _parseJSON(raw) {
    if (global.extractJSON && typeof global.extractJSON === 'function') {
      try { var j = global.extractJSON(raw); if (j) return j; } catch (_) {}
    }
    var txt = _extractJsonText(raw);
    if (!txt) return null;
    try { return JSON.parse(txt); } catch (_) { return null; }
  }

  async function _callLLM(prompt, opts) {
    opts = opts || {};
    if (typeof global.callAI !== 'function') return null;
    var maxTokens = _clamp(_safeNum(opts.maxTokens) || 4000, 800, 8000);
    var timeoutMs = _safeNum(opts.timeoutMs) || 0;
    var attempts = Math.max(1, _safeNum(opts.maxAttempts) || 2);
    var lastErr = '';
    for (var i = 0; i < attempts; i++) {
      try {
        var p = prompt;
        if (i > 0) p += '\n\nFORMAT_ERROR_RETRY: 上次输出无法解析为 JSON。请只返回一个 JSON object，无 markdown，无解释。错误: ' + lastErr;
        var raw = await _withTimeout(global.callAI(p, maxTokens, null, 'secondary', {
          priority: 'background',
          timeoutMs: timeoutMs || undefined,
          maxRetries: 1
        }), timeoutMs);
        if (!raw) { lastErr = 'empty response'; continue; }
        var parsed = _parseJSON(raw);
        if (parsed) return parsed;
        lastErr = 'no JSON object in response';
      } catch (e) {
        lastErr = (e && e.message) || String(e || 'call failed');
      }
    }
    return null;
  }

  // ── 输出 schema 验证 ──
  // { rationale, edicts[], chaoyiSpeeches[], memorialDecisions[], officeActions[] }
  var _EDICT_TYPES_KNOWN = ['amnesty', 'reward', 'personnel', 'tax_reduction', 'tax_increase',
    'admin_reform', 'economic_reform', 'military_mobilize', 'diplomacy',
    'imperial_ritual', 'criminal_justice', 'education_culture', 'enke'];

  function _validateEdict(e) {
    if (!e || typeof e !== 'object') return null;
    var content = _str(e.content, 200);
    if (!content) return null;
    return {
      type: _str(e.type, 20) || 'amnesty',
      content: content,
      trigger: _str(e.trigger, 60),
      treasuryDelta: _clamp(_safeNum(e.treasuryDelta), -500000, 500000),
      loyaltyDeltas: (e.loyaltyDeltas && typeof e.loyaltyDeltas === 'object') ? e.loyaltyDeltas : {}
    };
  }

  function _validateChaoyiSpeech(s) {
    if (!s || typeof s !== 'object') return null;
    var line = _str(s.line, 200);
    if (!line) return null;
    return {
      topic: _str(s.topic, 60),
      line: line,
      stance: _str(s.stance, 20)
    };
  }

  function _validateMemorialDecision(d) {
    if (!d || typeof d !== 'object') return null;
    var decision = String(d.decision || '').toLowerCase();
    var ok = { approved: 1, rejected: 1, hold: 1, debate: 1, referred: 1 }[decision];
    if (!ok) return null;
    if (!d.memorialId && !d.from) return null;
    return {
      memorialId: _str(d.memorialId, 60),
      from: _str(d.from, 40),
      decision: decision,
      ruling: _str(d.ruling, 120),
      loyaltyDelta: _clamp(_safeNum(d.loyaltyDelta), -10, 10),
      reason: _str(d.reason, 80)
    };
  }

  function _validateOfficeAction(a) {
    if (!a || typeof a !== 'object') return null;
    var kind = String(a.kind || '').toLowerCase();
    if (kind !== 'promote' && kind !== 'demote' && kind !== 'dismiss' && kind !== 'appoint') return null;
    if (!a.target) return null;
    return {
      kind: kind,
      target: _str(a.target, 40),
      newPosition: _str(a.newPosition, 40),
      reason: _str(a.reason, 80),
      loyaltyDelta: _clamp(_safeNum(a.loyaltyDelta), -15, 15)
    };
  }

  function _validateOutput(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var edicts = _arr(raw.edicts).map(_validateEdict).filter(function (x) { return x; });
    var speeches = _arr(raw.chaoyiSpeeches).map(_validateChaoyiSpeech).filter(function (x) { return x; });
    var memDecs = _arr(raw.memorialDecisions).map(_validateMemorialDecision).filter(function (x) { return x; });
    var office = _arr(raw.officeActions).map(_validateOfficeAction).filter(function (x) { return x; });
    if (edicts.length > 3) edicts = edicts.slice(0, 3);
    return {
      rationale: _str(raw.rationale, 200),
      edicts: edicts,
      chaoyiSpeeches: speeches,
      memorialDecisions: memDecs,
      officeActions: office,
      _source: raw._source || 'llm'
    };
  }

  // ── 降级输出：LLM 失败/缺件时的规则引擎兜底 ──
  // 策略：不动诏令（不下旨）、不发朝议、玩家上奏一律"留中"、不动官职
  //   —— 这是"君主怠政"的最小安全兜底，保证流程不崩、不胡乱颁旨。
  //   真实历史质感由 LLM 路径提供；此路径仅防 AI 不可用时玩家回合仍能推进。
  function _fallbackOutput(root, turnCtx) {
    var G = root || (typeof GM !== 'undefined' ? GM : null);
    var memDecs = [];
    try {
      var pending = _arr(G && G.memorials).filter(function (m) {
        return m && m.status === 'pending' && m._playerSubmitted === true;
      });
      pending.forEach(function (m) {
        memDecs.push({
          memorialId: m.id || '',
          from: m.from || '',
          decision: 'hold',
          ruling: '留中再议',
          loyaltyDelta: 0,
          reason: '君主未发谕旨'
        });
      });
    } catch (_) {}
    return {
      rationale: '君主此朝未发谕旨（AI 决策未就绪·留中待下议）。',
      edicts: [],
      chaoyiSpeeches: [],
      memorialDecisions: memDecs,
      officeActions: [],
      _source: 'fallback'
    };
  }

  // ── 构建 prompt：高于派系 NPC，含完整国库/民心/边警/吏治/派系矩阵 + 玩家上奏 ──
  function _sovereignPersonaBlock(G) {
    var sov = _findSovereignChar(G);
    if (!sov) return '【君主】佚名（剧本未配置君主角色）\n';
    var parts = ['【君主·' + _str(sov.name, 20) + '】'];
    if (sov.officialTitle) parts.push('尊号:' + _str(sov.officialTitle, 20));
    if (sov.personality) parts.push('性情:' + _str(sov.personality, 40));
    if (typeof sov.ambition === 'number') parts.push('志向:' + sov.ambition);
    if (typeof sov.intelligence === 'number') parts.push('才智:' + sov.intelligence);
    if (typeof sov.benevolence === 'number') parts.push('仁德:' + sov.benevolence);
    if (typeof sov.loyalty === 'number') parts.push('自律:' + sov.loyalty);
    return parts.join('·') + '\n';
  }

  function _fiscalBlock(G) {
    var parts = ['【国库】'];
    try {
      var guoku = G.guoku || {};
      if (typeof guoku.money === 'number') parts.push('银:' + Math.round(guoku.money));
      if (typeof guoku.grain === 'number') parts.push('粮:' + Math.round(guoku.grain));
      if (typeof G.taxPressure === 'number') parts.push('税压:' + Math.round(G.taxPressure));
      if (typeof G.inflation === 'number') parts.push('通胀:' + Math.round(G.inflation));
    } catch (_) {}
    if (parts.length === 1) return '';
    return parts.join('·') + '\n';
  }

  function _minxinBlock(G) {
    var parts = ['【民心】'];
    try {
      if (typeof G.minxin === 'number') parts.push('天下:' + Math.round(G.minxin));
      if (G.classes && Array.isArray(G.classes)) {
        var top = G.classes.slice(0, 6).map(function (c) {
          return (c && c.name ? c.name : '?') + ':' + Math.round((c && typeof c.satisfaction === 'number') ? c.satisfaction : 50);
        });
        if (top.length) parts.push('阶层(' + top.join(',') + ')');
      }
    } catch (_) {}
    if (parts.length === 1) return '';
    return parts.join('·') + '\n';
  }

  function _borderAlertBlock(G) {
    var parts = ['【边警】'];
    try {
      var wars = _arr(G.wars).slice(-3).map(function (w) {
        return _str(w.name || w.region, 12) + '(' + (w.status || '?') + ')';
      });
      if (wars.length) parts.push(wars.join(','));
      var armies = _arr(G.armies).slice(0, 4).map(function (a) {
        return _str(a.name, 10) + ':' + (a.soldiers || 0) + '兵';
      });
      if (armies.length) parts.push('军(' + armies.join(',') + ')');
    } catch (_) {}
    if (parts.length === 1) return '';
    return parts.join('·') + '\n';
  }

  function _liZhiBlock(G) {
    var parts = ['【吏治】'];
    try {
      if (typeof G.corruptionIndex === 'number') parts.push('腐:' + Math.round(G.corruptionIndex));
      var chars = _arr(G.chars).filter(function (c) { return c && c.alive !== false && c.officialTitle; });
      var avgLoy = 0, n = 0;
      chars.forEach(function (c) { if (typeof c.loyalty === 'number') { avgLoy += c.loyalty; n++; } });
      if (n) parts.push('臣均忠:' + Math.round(avgLoy / n) + '(' + n + '人)');
      var vacant = 0;
      function _vac(nodes) {
        _arr(nodes).forEach(function (nd) {
          _arr(nd && nd.positions).forEach(function (p) {
            if (p && !p.holder && (!p.actualHolders || !p.actualHolders.some(function (h) { return h && h.name; }))) vacant++;
          });
          if (nd && nd.subs) _vac(nd.subs);
        });
      }
      if (G.officeTree) _vac(G.officeTree);
      if (vacant) parts.push('缺员:' + vacant);
    } catch (_) {}
    if (parts.length === 1) return '';
    return parts.join('·') + '\n';
  }

  function _factionMatrixBlock(G) {
    var parts = ['【派系矩阵】'];
    try {
      var facs = _arr(G.facs).slice(0, 6).map(function (f) {
        var nm = _str(f && f.name, 12);
        var str = (f && f.derivedStrength && typeof f.derivedStrength.value === 'number') ? Math.round(f.derivedStrength.value) : (f && typeof f.strength === 'number' ? Math.round(f.strength) : '?');
        return nm + '(势' + str + ')';
      });
      if (facs.length) parts.push(facs.join(','));
      var parties = _arr(G.parties).slice(0, 4).map(function (p) {
        return _str(p && p.name, 10) + '(' + ((p && typeof p.power === 'number') ? Math.round(p.power) : '?') + ')';
      });
      if (parties.length) parts.push('党(' + parties.join(',') + ')');
    } catch (_) {}
    if (parts.length === 1) return '';
    return parts.join('·') + '\n';
  }

  function _playerMemorialsBlock(G) {
    var parts = ['【玩家上奏】'];
    try {
      var pending = _arr(G.memorials).filter(function (m) {
        return m && m.status === 'pending' && m._playerSubmitted === true;
      }).slice(0, 3);
      if (!pending.length) { parts.push('无'); return parts.join('·') + '\n'; }
      pending.forEach(function (m) {
        parts.push(_str(m.from, 12) + '奏「' + _str(m.content, 60) + '」(id:' + (m.id || '?') + ')');
      });
    } catch (_) {}
    return parts.join('·') + '\n';
  }

  function _findSovereignChar(G) {
    try {
      if (typeof global.TM !== 'undefined' && global.TM.Transmigration && typeof global.TM.Transmigration.getSovereignName === 'function') {
        var nm = global.TM.Transmigration.getSovereignName(G);
        if (nm && Array.isArray(G.chars)) {
          for (var i = 0; i < G.chars.length; i++) {
            if (G.chars[i] && G.chars[i].name === nm) return G.chars[i];
          }
        }
      }
      if (Array.isArray(G.chars)) {
        for (var j = 0; j < G.chars.length; j++) {
          var c = G.chars[j];
          if (c && (c.role === '皇帝' || c.isEmperor === true)) return c;
        }
      }
    } catch (_) {}
    return null;
  }

  function _buildPrompt(root, turnCtx) {
    var G = root || (typeof GM !== 'undefined' ? GM : null);
    if (!G) return null;
    turnCtx = turnCtx || {};
    var turn = (typeof G.turn === 'number') ? G.turn : (turnCtx.turn || 0);
    var era = '';
    try {
      if (typeof global.findScenarioById === 'function' && G.sid) {
        var sc = global.findScenarioById(G.sid);
        if (sc) era = sc.era || sc.dynasty || '';
      }
    } catch (_) {}

    var sys = '你是' + (era ? ('【' + era + '】') : '') + '的君主 AI·扮演当朝天子在穿越模式中自动决策。';
    sys += '\n你须以君主口吻裁决朝政·输出 strict JSON·无 markdown·无解释。';
    sys += '\n决策须切合时代质感·古文风·考虑阻力与阶层向背·勿滥颁诏令。';
    sys += '\n可用诏令类型(type): amnesty|reward|personnel|tax_reduction|tax_increase|admin_reform|economic_reform|military_mobilize|diplomacy|imperial_ritual|criminal_justice|education_culture|enke';
    sys += '\n奏疏批答决策(decision): approved(准)|rejected(驳)|hold(留中)|debate(下议/发廷议)|referred(交部)';
    sys += '\n任免动作(kind): promote|demote|dismiss|appoint';

    var user = '回合:' + turn + '\n';
    user += _sovereignPersonaBlock(G);
    user += _fiscalBlock(G);
    user += _minxinBlock(G);
    user += _borderAlertBlock(G);
    user += _liZhiBlock(G);
    user += _factionMatrixBlock(G);
    user += _playerMemorialsBlock(G);

    user += '\n输出 JSON schema:\n';
    user += '{\n';
    user += '  "rationale": "本回合考量(50-150字·古文)",\n';
    user += '  "edicts": [{"type":"...","content":"诏令正文(60-120字古文)","trigger":"动因","treasuryDelta":0,"loyaltyDeltas":{"court":0,"general":0,"clan":0}}],\n';
    user += '  "chaoyiSpeeches": [{"topic":"议题","line":"君主治言(30-80字古文)","stance":"立场"}],\n';
    user += '  "memorialDecisions": [{"memorialId":"...","from":"...","decision":"approved|rejected|hold|debate|referred","ruling":"批语(10-30字)","loyaltyDelta":-5到5,"reason":"动因"}],\n';
    user += '  "officeActions": [{"kind":"promote|demote|dismiss|appoint","target":"人物名","newPosition":"新职(若有)","reason":"动因","loyaltyDelta":-10到10}]\n';
    user += '}\n';
    user += '约束: edicts 长度 0-3·宁少勿多·空数组亦允；memorialDecisions 仅对应【玩家上奏】中真实 id；officeActions.target 必须来自 GM.chars 真实姓名；勿臆造人物/官职。';

    return { system: sys, user: user };
  }

  // ────────────────────────────────────────────────────────────
  // Task 7: 下旨路径
  // ────────────────────────────────────────────────────────────
  function _generateEdicts(root, aiOutput) {
    var G = root || (typeof GM !== 'undefined' ? GM : null);
    if (!G) return { applied: [], failed: [] };
    var applied = [], failed = [];
    var edicts = _arr(aiOutput && aiOutput.edicts);

    edicts.forEach(function (e) {
      try {
        var content = _str(e.content, 200);
        if (!content) { failed.push({ edict: e, reason: 'empty content' }); return; }

        var edictType = 'amnesty';
        if (typeof global.classifyEdict === 'function') {
          try { edictType = global.classifyEdict(content) || 'amnesty'; } catch (_) {}
        }

        if (!Array.isArray(G._edictTracker)) G._edictTracker = []; // arch-ok
        var turn = (typeof G.turn === 'number') ? G.turn : 0;
        var rec = {
          id: 'sov_ai_' + turn + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          content: content,
          type: edictType,
          category: (global.EDICT_TYPES && global.EDICT_TYPES[edictType] && global.EDICT_TYPES[edictType].label) || edictType,
          turn: turn,
          status: 'pending',
          source: 'sovereign-ai',
          trigger: _str(e.trigger, 60),
          treasuryDelta: _clamp(_safeNum(e.treasuryDelta), -500000, 500000),
          loyaltyDeltas: (e.loyaltyDeltas && typeof e.loyaltyDeltas === 'object') ? e.loyaltyDeltas : {},
          aiRationale: _str(aiOutput && aiOutput.rationale, 120)
        };
        G._edictTracker.push(rec); // arch-ok

        var resistance = 30;
        if (typeof global.estimateResistance === 'function') {
          try {
            var state = { classSatisfaction: {} };
            _arr(G.classes).forEach(function (cls) {
              if (cls && cls.name) state.classSatisfaction[cls.name] = (typeof cls.satisfaction === 'number') ? cls.satisfaction : 50;
            });
            resistance = global.estimateResistance(edictType, state) || 30;
          } catch (_) {}
        }
        rec.resistance = resistance;

        if (typeof global.applyEdictTypedIncidence === 'function') {
          try {
            var inc = global.applyEdictTypedIncidence(G, content, { turn: turn });
            if (inc) rec.typedIncidence = inc;
          } catch (_) {}
        }

        if (typeof global.addEB === 'function') {
          try { global.addEB('诏令', '【君主 AI 颁旨】' + _str(content, 80)); } catch (_) {}
        }
        // Task 31·起居注标注君主 AI 决策来源
        if (typeof global.TM !== 'undefined' && global.TM.Qiju && typeof global.TM.Qiju.record === 'function') {
          try {
            global.TM.Qiju.record('【君主 AI 颁旨】' + content, {
              turn: turn,
              date: (typeof global.getTSText === 'function') ? global.getTSText(turn) : '',
              category: '诏令',
              source: 'sovereign-ai'
            });
          } catch (_) {}
        }
        applied.push(rec);
      } catch (ex) {
        failed.push({ edict: e, reason: (ex && ex.message) || 'exception' });
      }
    });

    return { applied: applied, failed: failed };
  }

  // ────────────────────────────────────────────────────────────
  // Task 8: 朝议发言
  // ────────────────────────────────────────────────────────────
  function _triggerChaoyi(root, speeches) {
    var G = root || (typeof GM !== 'undefined' ? GM : null);
    if (!G) return { rendered: 0 };
    var rendered = 0;
    var sovName = _sovereignNameFallback();
    var list = _arr(speeches);

    list.forEach(function (s) {
      try {
        var line = _str(s.line, 200);
        if (!line) return;
        var topic = _str(s.topic, 60);

        if (typeof global.addCYBubble === 'function') {
          try {
            global.addCYBubble(sovName, '【君主 AI 发话】' + (topic ? '〔' + topic + '〕' : '') + '：' + line, false);
            rendered++;
          } catch (_) {}
        }

        if (Array.isArray(G.jishiRecords)) {
          G.jishiRecords.push({ // arch-ok
            turn: (typeof G.turn === 'number') ? G.turn : 0,
            char: sovName,
            playerSaid: line,
            npcSaid: '',
            mode: 'sovereign-ai',
            topic: topic,
            round: 0,
            stance: _str(s.stance, 20),
            final: false, leaked: false, mediation: false,
            playerInterject: false, rescued: false, secret: false, outcome: ''
          });
        }
      } catch (_) {}
    });

    return { rendered: rendered };
  }

  // ────────────────────────────────────────────────────────────
  // Task 9: 批奏（生成决策·应用副作用由 tm-memorials.js 的 _sovereignAIReplyMemorial 完成）
  // ────────────────────────────────────────────────────────────
  function _applyMemorialDecisions(root, decisions) {
    var G = root || (typeof GM !== 'undefined' ? GM : null);
    if (!G) return { applied: 0 };
    var applied = 0;
    var list = _arr(decisions);

    list.forEach(function (d) {
      try {
        if (typeof global._sovereignAIReplyMemorial !== 'function') return;
        var m = null;
        if (d.memorialId) {
          m = _arr(G.memorials).find(function (x) { return x && x.id === d.memorialId; });
        }
        if (!m && d.from) {
          m = _arr(G.memorials).find(function (x) {
            return x && x._playerSubmitted === true && x.status === 'pending' && x.from === d.from;
          });
        }
        if (!m) return;
        var r = global._sovereignAIReplyMemorial(m, d);
        if (r && r.ok) applied++;
      } catch (_) {}
    });

    return { applied: applied };
  }

  // ────────────────────────────────────────────────────────────
  // Task 10: 任免
  // ────────────────────────────────────────────────────────────
  function _findOfficePosByName(tree, positionName) {
    if (!positionName) return null;
    var hit = null;
    function _walk(nodes) {
      _arr(nodes).forEach(function (nd) {
        if (hit) return;
        _arr(nd && nd.positions).forEach(function (p) {
          if (hit) return;
          if (p && (p.name === positionName || p.title === positionName)) hit = { node: nd, pos: p };
        });
        if (nd && nd.subs) _walk(nd.subs);
      });
    }
    _walk(tree);
    return hit;
  }

  function _notifyPlayerIfTarget(targetName, action) {
    try {
      if (!global.P || !global.P.playerInfo) return;
      if (global.P.playerInfo.characterName !== targetName && global.P.playerInfo.selectedCharId !== targetName) return;
      var msg = '';
      if (action.kind === 'promote' || action.kind === 'appoint') {
        msg = '君主 AI 颁旨：擢升你为' + (action.newPosition || '新职');
      } else if (action.kind === 'demote') {
        msg = '君主 AI 颁旨：贬谪你' + (action.newPosition ? ('为' + action.newPosition) : '');
      } else if (action.kind === 'dismiss') {
        msg = '君主 AI 颁旨：罢去你本职';
      }
      if (msg && typeof global.toast === 'function') {
        try { global.toast(msg); } catch (_) {}
      }
      if (!Array.isArray(global.P.playerInfo._sovereignAINotices)) global.P.playerInfo._sovereignAINotices = []; // arch-ok
      global.P.playerInfo._sovereignAINotices.push({ // arch-ok
        turn: (typeof global.GM !== 'undefined' && global.GM && global.GM.turn) || 0,
        kind: action.kind, target: targetName,
        newPosition: action.newPosition || '', reason: action.reason || '', msg: msg
      });
    } catch (_) {}
  }

  function _processOfficeActions(root, actions) {
    var G = root || (typeof GM !== 'undefined' ? GM : null);
    if (!G) return { applied: 0, failed: [] };
    var tree = G.officeTree;
    if (!tree) return { applied: 0, failed: [{ reason: 'no officeTree' }] };
    var applied = 0, failed = [];
    var list = _arr(actions);

    list.forEach(function (a) {
      try {
        var target = _str(a.target, 40);
        if (!target) { failed.push({ action: a, reason: 'empty target' }); return; }
        var ch = (typeof global.findCharByName === 'function') ? global.findCharByName(target) : null;
        if (!ch && Array.isArray(G.chars)) {
          for (var i = 0; i < G.chars.length; i++) {
            if (G.chars[i] && G.chars[i].name === target) { ch = G.chars[i]; break; }
          }
        }
        if (!ch) { failed.push({ action: a, reason: 'target char not found' }); return; }

        if (a.kind === 'dismiss') {
          if (typeof global.onDismissal === 'function') {
            try { global.onDismissal(target, a.reason || '君主 AI 罢黜'); }
            catch (_) {
              if (typeof global._offVacateByCharName === 'function') global._offVacateByCharName(target, 'demote', tree);
            }
          } else if (typeof global._offVacateByCharName === 'function') {
            global._offVacateByCharName(target, 'demote', tree);
          }
          if (ch.officialTitle) ch.officialTitle = ''; // 移除旧衔
          applied++;
          _notifyPlayerIfTarget(target, a);
          return;
        }

        var newPos = _str(a.newPosition, 40);
        if (!newPos) { failed.push({ action: a, reason: 'empty newPosition for promote/demote/appoint' }); return; }

        if (typeof global.onAppointment === 'function') {
          try {
            var r = global.onAppointment(target, newPos, { reason: a.reason || '君主 AI 任免' });
            if (r && r.ok) {
              applied++;
              _notifyPlayerIfTarget(target, a);
              return;
            }
          } catch (_) {}
        }

        var hit = _findOfficePosByName(tree, newPos);
        if (hit && typeof global._offAppointPerson === 'function') {
          try { global._offAppointPerson(hit.pos, target); }
          catch (_) {}
          if (ch.officialTitle !== newPos) ch.officialTitle = newPos;
          applied++;
          _notifyPlayerIfTarget(target, a);
        } else if (hit && typeof global._offDismissPerson === 'function' && a.kind === 'demote') {
          // demote 且找到目标位 → 先免旧职再任新职由上方 onAppointment 路径处理；此处仅兜底
          failed.push({ action: a, reason: 'demote fallback needs onAppointment' });
        } else {
          failed.push({ action: a, reason: 'office position not found or no appoint fn' });
        }
      } catch (ex) {
        failed.push({ action: a, reason: (ex && ex.message) || 'exception' });
      }
    });

    if (applied > 0 && Array.isArray(G._chronicle)) {
      try {
        if (typeof global.TM !== 'undefined' && global.TM.Chronicle && typeof global.TM.Chronicle.record === 'function') {
          list.slice(0, applied).forEach(function (a) {
            global.TM.Chronicle.record({
              turn: (typeof G.turn === 'number') ? G.turn : 0,
              date: G._gameDate || '',
              type: '君主AI任免',
              text: '【君主 AI】' + (a.kind === 'promote' ? '擢' : a.kind === 'demote' ? '贬' : a.kind === 'dismiss' ? '罢' : '任') + ' ' + a.target + (a.newPosition ? (' 为 ' + a.newPosition) : ''),
              tags: ['君主AI', '任免']
            });
          });
        }
      } catch (_) {}
    }

    return { applied: applied, failed: failed };
  }

  // ────────────────────────────────────────────────────────────
  // 主入口：编排下旨/朝议/批奏/任免四个子动作
  // ────────────────────────────────────────────────────────────
  async function runTurn(root, turnCtx) {
    if (!_isEnabled()) {
      return { ok: false, reason: 'sovereign-ai disabled (not transmigration mode or player is emperor)', applied: null };
    }
    var G = root || (typeof GM !== 'undefined' ? GM : null);
    if (!G) return { ok: false, reason: 'no GM root', applied: null };

    turnCtx = turnCtx || {};
    var prompts = _buildPrompt(G, turnCtx);
    var aiOutput = null;
    if (prompts) {
      try {
        var raw = await _callLLM(prompts.system + '\n\n' + prompts.user, {
          maxTokens: turnCtx.maxTokens || 4000,
          timeoutMs: turnCtx.timeoutMs || 0,
          maxAttempts: turnCtx.maxAttempts || 2
        });
        if (raw) aiOutput = _validateOutput(raw);
      } catch (_) { aiOutput = null; }
    }
    if (!aiOutput) aiOutput = _fallbackOutput(G, turnCtx);

    var edictResult = _generateEdicts(G, aiOutput);
    var chaoyiResult = _triggerChaoyi(G, aiOutput.chaoyiSpeeches);
    var memorialResult = _applyMemorialDecisions(G, aiOutput.memorialDecisions);
    var officeResult = _processOfficeActions(G, aiOutput.officeActions);

    return {
      ok: true,
      source: aiOutput._source || 'fallback',
      rationale: aiOutput.rationale || '',
      edicts: edictResult,
      chaoyi: chaoyiResult,
      memorials: memorialResult,
      office: officeResult
    };
  }

  // 同步版（无 LLM·仅供 smoke 测试与确定性场景调用）
  function runTurnSync(root, turnCtx, presetOutput) {
    if (!_isEnabled() && !turnCtx && !presetOutput) {
      return { ok: false, reason: 'sovereign-ai disabled', applied: null };
    }
    var G = root || (typeof GM !== 'undefined' ? GM : null);
    if (!G) return { ok: false, reason: 'no GM root', applied: null };
    var aiOutput = presetOutput ? _validateOutput(presetOutput) : null;
    if (!aiOutput) aiOutput = _fallbackOutput(G, turnCtx || {});

    var edictResult = _generateEdicts(G, aiOutput);
    var chaoyiResult = _triggerChaoyi(G, aiOutput.chaoyiSpeeches);
    var memorialResult = _applyMemorialDecisions(G, aiOutput.memorialDecisions);
    var officeResult = _processOfficeActions(G, aiOutput.officeActions);

    return {
      ok: true,
      source: aiOutput._source || 'fallback',
      rationale: aiOutput.rationale || '',
      edicts: edictResult,
      chaoyi: chaoyiResult,
      memorials: memorialResult,
      office: officeResult
    };
  }

  // ── 暴露 ──
  global.TM = global.TM || {};
  global.TM.SovereignAI = {
    runTurn: runTurn,
    runTurnSync: runTurnSync,
    _isEnabled: _isEnabled,
    _buildPrompt: _buildPrompt,
    _validateOutput: _validateOutput,
    _fallbackOutput: _fallbackOutput,
    _generateEdicts: _generateEdicts,
    _triggerChaoyi: _triggerChaoyi,
    _applyMemorialDecisions: _applyMemorialDecisions,
    _processOfficeActions: _processOfficeActions,
    _callLLM: _callLLM,
    _sovereignName: _sovereignNameFallback
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      runTurn: runTurn,
      runTurnSync: runTurnSync,
      _isEnabled: _isEnabled,
      _buildPrompt: _buildPrompt,
      _validateOutput: _validateOutput,
      _fallbackOutput: _fallbackOutput,
      _generateEdicts: _generateEdicts,
      _triggerChaoyi: _triggerChaoyi,
      _applyMemorialDecisions: _applyMemorialDecisions,
      _processOfficeActions: _processOfficeActions,
      _sovereignName: _sovereignNameFallback
    };
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : globalThis));
