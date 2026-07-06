// @ts-check
/* ═══════════════════════════════════════════════════════════════
 *  tm-endturn-followup-helpers.js — endturn 后续子调用·顶层纯 helper 族
 *  （2026-07-06 立项拆分·第十九拆·alias 范式·自 tm-endturn-followup.js 切出）
 *  内容：27 个顶层纯 helper（ensureGroups、_tm 系列、_applyMwList、
 *        _memWriteFallbackFromNarrative、copyResultsFromTurnState 等）+ 6 个 ns 公开导出。
 *  【装载期契约】本片须在 tm-endturn-followup.js【之前】装载(index.html 紧邻其前)：
 *    装载期填充 bucket global.TM.__etFollowupParts·origin 顶部 alias 块逐名回绑闭包本地名。
 *    错序/漏载 → origin 侧 helper 别名=undefined（vm 沙箱只载 origin 时同理·smoke 须先载本片）。
 *  纯 helper 搬家·业务体 0 改动·非严格模式（与 origin 一致·勿加 use strict·否则 TDZ/this 语义漂移）。
 * ═══════════════════════════════════════════════════════════════ */
(function(global) {
  if (typeof global.TM === "undefined") global.TM = {};
  if (typeof global.TM.Endturn === "undefined") global.TM.Endturn = {};
  if (typeof global.TM.Endturn.AI === "undefined") global.TM.Endturn.AI = {};
  if (typeof global.TM.Endturn.AI.followup === "undefined") global.TM.Endturn.AI.followup = {};

  var ns = global.TM.Endturn.AI.followup;

  function ensureGroups(ctx) {
    ctx.input = ctx.input || {};
    ctx.prompt = ctx.prompt || {};
    ctx.subcalls = ctx.subcalls || {};
    ctx.results = ctx.results || {};
    ctx.apply = ctx.apply || {};
    ctx.apply.applied = ctx.apply.applied || { chars: null, factions: null, offices: null, fiscal: null, admin: null, events: null, harem: null };
    ctx.followup = ctx.followup || {};
    ctx.followup._changeSummary = Array.isArray(ctx.followup._changeSummary) ? ctx.followup._changeSummary : [];
    ctx.record = ctx.record || {};
    ctx.meta = ctx.meta || { errors: [], warnings: [], timing: {}, retries: {} };
    ctx.meta.timing = ctx.meta.timing || {};
    return ctx;
  }

  function _tmFirstText() {
    for (var i = 0; i < arguments.length; i++) {
      var v = arguments[i];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  }

  function _tmPickHouren(p2, raw) {
    var text = "";
    if (p2 && typeof p2 === "object") {
      text = _tmFirstText(
        p2.houren_xishuo,
        p2.hourenXishuo,
        p2.houren,
        p2.zhengwen,
        p2.text,
        p2.content,
        p2.narrative,
        p2.story
      );
      if (text) return text;
    }
    text = _tmFirstText(raw);
    if (!text) return "";
    if (p2 && /^\s*[\{\[]/.test(text)) return "";
    return text;
  }

  function _tmXmlText(v) {
    return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function _tmHiddenMoveForMemory(h) {
    var actor = "";
    var text = "";
    if (typeof h === "string") {
      text = h.trim();
      var m = text.match(/^([^:：]{1,16})[:：]/);
      actor = m ? m[1].trim() : "";
    } else if (h && typeof h === "object") {
      actor = _tmFirstText(h.char, h.name, h.actor, h.schemer);
      text = _tmFirstText(h.action, h.move, h.text, h.content, h.plan, h.summary);
    }
    return { actor: actor, text: text };
  }

  // 应用一批 memory_writes(供 sc_memwrite 首轮 + 截断续写复用)·covered 记已录入 char·续写据此去重。
  // skipCovered:仅续写阶段传 true→拦截已录入角色(不重复补);首轮不传→全录(同一角色多件不同事件都录·不吞·
  //   完全重复的 event 由 NpcMemorySystem.remember 内部近窗去重挡)。
  function _applyMwList(list, covered, skipCovered) {
    if (!Array.isArray(list) || typeof NpcMemorySystem === 'undefined' || !NpcMemorySystem.remember) return 0;
    var n = 0;
    var witTotal = 0;  // ★2026-07-04 目击传播每批封顶·防 witnesses 滥填爆记忆
    list.forEach(function(mw) {
      if (!mw || !mw.char || !mw.event) return;
      if (skipCovered && covered && covered[mw.char]) return;  // 仅续写阶段拦截已录入角色
      try {
        NpcMemorySystem.remember(mw.char, mw.event, mw.emotion || '平', mw.importance || 5, mw.relatedPerson || '',
          { type: mw.type, source: mw.source, credibility: mw.credibility, location: mw.location, witnesses: mw.witnesses, participants: mw.participants, arcId: mw.arcId });
        if (covered) covered[mw.char] = 1;
        n++;
        // ★2026-07-04 方向B·目击者传播：要事(imp>=6)填了 witnesses·目击者本人也得一条"亲见"记忆
        //   (重要度-2地板3·source witnessed)——否则 witnesses 只是当事人记忆上的注脚·杀一儆百从不儆百。
        //   每条至多3人·每批至多12条·死者/玩家/当事人自己不写·不占 covered(续写去重语义只属当事人)。
        if ((mw.importance || 5) >= 6 && Array.isArray(mw.witnesses) && witTotal < 12) {
          mw.witnesses.slice(0, 3).forEach(function(wn) {
            if (witTotal >= 12 || !wn || typeof wn !== 'string' || wn === mw.char) return;
            var wc = null;
            try { if (typeof GM !== 'undefined' && Array.isArray(GM.chars)) GM.chars.some(function(c) { if (c && c.name === wn) { wc = c; return true; } return false; }); } catch (_wfE) {}
            if (!wc || wc.alive === false || wc.isPlayer) return;
            NpcMemorySystem.remember(wn, '亲见：' + String(mw.event).slice(0, 60), mw.emotion || '忧', Math.max(3, (mw.importance || 5) - 2), mw.char,
              { type: 'witnessed', source: 'witnessed', location: mw.location, _noMirror: true }); // _noMirror:当事人已有原始记忆·每个目击者再镜像回弹=同事件重复灌水(2026-07-04 审查定罪)
            witTotal++;
          });
        }
      } catch(_amwE) { if (typeof _dbg === 'function') _dbg('[MemWrite] remember failed for', mw.char, _amwE); }
    });
    return n;
  }

  // ★通道②(sc_memwrite)真空兜底·确定性·不依赖 AI(截断/失败/静默吞均不影响)：
  //   本回合叙事(时政记/实录/npc_actions)提到、在 GM.chars、且本回合起(m.turn>=源回合T·覆盖通道①的T与②的T+1)
  //   尚无任何记忆的活人 NPC·补一条轻量"亲历"记忆(取含其名的叙事句·importance 4)·
  //   保证纯叙事涉事者不因通道②截断/失败而"失忆停在开局"·跨界面(问对/朝议/图志)人格连续。
  function _memWriteFallbackFromNarrative(p1, sourceTurn) {
    try {
      if (!p1 || typeof GM === 'undefined' || !GM.chars) return 0;
      if (typeof NpcMemorySystem === 'undefined' || !NpcMemorySystem.remember) return 0;
      var text = String(p1.shizhengji || '') + '\n' + String(p1.shilu_text || p1.zhengwen || '');
      if (Array.isArray(p1.npc_actions)) p1.npc_actions.slice(0, 60).forEach(function(a){ if (a) text += '\n' + (a.name || '') + (a.action || '') + (a.result || '') + (a.target || ''); });
      // 也扫势力事件/通用事件的涉事者(faction_events/events 的当事人也算本回合"经历"·扩兜底覆盖面)
      if (Array.isArray(p1.faction_events)) p1.faction_events.slice(0, 30).forEach(function(fe){ if (fe) text += '\n' + (fe.actor || '') + (fe.action || '') + (fe.result || '') + (fe.target || ''); });
      if (Array.isArray(p1.events)) p1.events.slice(0, 30).forEach(function(e){ if (e && e.desc) text += '\n' + String(e.desc); });
      if (text.replace(/\s/g, '').length < 8) return 0;
      // 判重基准=叙事源回合T：优先 post-turn 队列入队时捕获的 GM._postTurnJobs.turn(不依赖 GM.turn++ 与本兜底完成的先后·
      //   避免时序偏移把"上回合已有任意记忆"的 NPC 误判为已覆盖而漏写)·回退 GM.turn-1(旧行为)。①tag=T·②/本兜底 tag=T+1·m.turn>=T 覆盖三者。
      var recent = (typeof sourceTurn === 'number') ? sourceTurn
        : (GM._postTurnJobs && typeof GM._postTurnJobs.turn === 'number') ? GM._postTurnJobs.turn
        : (typeof GM.turn === 'number' ? Math.max(0, GM.turn - 1) : 0);
      var sentences = text.split(/[。！？!?\n；;]/).map(function(s){ return s.trim(); }).filter(function(s){ return s.length >= 4; });
      var n = 0, CAP = 50;
      for (var i = 0; i < GM.chars.length && n < CAP; i++) {
        var ch = GM.chars[i];
        if (!ch || !ch.name || String(ch.name).length < 2 || ch.alive === false || ch.isPlayer) continue;
        if (text.indexOf(ch.name) < 0) continue;
        if (Array.isArray(ch._memory) && ch._memory.some(function(m){ return m && typeof m.turn === 'number' && m.turn >= recent; })) continue;
        var sent = null;
        for (var j = 0; j < sentences.length; j++) { if (sentences[j].indexOf(ch.name) >= 0) { sent = sentences[j]; break; } }
        if (!sent) continue;
        var ev = sent.length > 48 ? sent.slice(0, 48) + '…' : sent;
        try { NpcMemorySystem.remember(ch.name, ev, '平', 4, '', { source: 'witnessed', type: 'general', _fallback: true }); n++; } catch(_re) {}
      }
      if (n > 0 && typeof _dbg === 'function') _dbg('[MemWrite] 真空兜底·补 ' + n + ' 名涉事 NPC 轻量记忆(通道②未覆盖)');
      return n;
    } catch(_e) { return 0; }
  }

  function _tmNormFactionName(v) {
    return String(v == null ? "" : v).replace(/\s+/g, "").trim();
  }

  function _tmPlayerFactionNameList(v) {
    var raw = Array.isArray(v) ? v : [v];
    var out = [];
    raw.forEach(function(x) {
      var s = String(x == null ? "" : x).trim();
      var k = _tmNormFactionName(s);
      if (s && out.map(_tmNormFactionName).indexOf(k) < 0) out.push(s);
    });
    return out;
  }

  function _tmIsMarkedPlayerFaction(f) {
    return !!(f && (f.isPlayer || f.playerControlled || f.controlledBy === "player" || f.controller === "player" || f.controlType === "player"));
  }

  function _tmResolvePlayerFactionNamesForAi(G, P0) {
    G = G || global.GM || {};
    P0 = P0 || global.P || {};
    var names = [];
    function push(v) {
      var s = String(v == null ? "" : v).trim();
      var k = _tmNormFactionName(s);
      if (s && names.map(_tmNormFactionName).indexOf(k) < 0) names.push(s);
    }
    var pi = P0.playerInfo || {};
    push(pi.factionName);
    push(P0.playerFactionName);
    push(P0.playerFaction);
    push(G.playerFactionName);
    push(G.playerFaction);
    if (G.playerInfo) push(G.playerInfo.factionName);
    (Array.isArray(G.facs) ? G.facs : []).forEach(function(f) {
      if (_tmIsMarkedPlayerFaction(f)) push(f.name);
    });
    (Array.isArray(G.chars) ? G.chars : []).forEach(function(c) {
      if (c && (c.isPlayer || c.playerControlled || c.controlledBy === "player")) push(c.faction || c.factionName || c.ownerFaction);
    });
    return names;
  }

  function _tmResolvePlayerFactionNameForAi(G, P0) {
    return _tmResolvePlayerFactionNamesForAi(G, P0)[0] || "";
  }

  function _tmIsPlayerFactionNameForAi(name, playerFactionName) {
    var k = _tmNormFactionName(name);
    if (!k) return false;
    return _tmPlayerFactionNameList(playerFactionName).some(function(n) { return _tmNormFactionName(n) === k; });
  }

  function _tmIsPlayerFactionForAi(f, playerFactionName) {
    return !!(f && (_tmIsMarkedPlayerFaction(f) || _tmIsPlayerFactionNameForAi(f.name, playerFactionName)));
  }

  function _tmFilterSc16PlayerOutputs(p16, playerFactionName) {
    if (!p16 || typeof p16 !== "object") return p16;
    var names = _tmPlayerFactionNameList(playerFactionName);
    if (!names.length) return p16;
    var removedActions = 0;
    var removedDiplomacy = 0;
    if (Array.isArray(p16.faction_actions)) {
      p16.faction_actions = p16.faction_actions.filter(function(fa) {
        var actor = _tmFirstText(fa && fa.faction, fa && fa.name, fa && fa.actor, fa && fa.from, fa && fa.source, fa && fa.initiator);
        if (_tmIsPlayerFactionNameForAi(actor, names)) { removedActions++; return false; }
        return true;
      });
    }
    if (Array.isArray(p16.diplomatic_shifts)) {
      p16.diplomatic_shifts = p16.diplomatic_shifts.filter(function(ds) {
        var actor = _tmFirstText(ds && ds.from, ds && ds.actor, ds && ds.faction, ds && ds.source, ds && ds.initiator);
        if (_tmIsPlayerFactionNameForAi(actor, names)) { removedDiplomacy++; return false; }
        return true;
      });
    }
    p16._playerFactionGuard = {
      playerFactionName: names[0],
      playerFactionNames: names,
      removedFactionActions: removedActions,
      removedDiplomaticShifts: removedDiplomacy
    };
    return p16;
  }

  function _tmSc16TextBlob(obj) { if (obj == null) return ""; if (typeof obj === "string") return obj; try { return JSON.stringify(obj); } catch(_) { return String(obj); } }
  function _tmMentionsFactionForAi(obj, facName) { var k = _tmNormFactionName(facName); return !!k && _tmNormFactionName(_tmSc16TextBlob(obj)).indexOf(k) >= 0; }
  function _tmSc16ActorOf(obj) { return _tmFirstText(obj && obj.faction, obj && obj.name, obj && obj.actor, obj && obj.from, obj && obj.source, obj && obj.initiator); }
  function _tmSc16MatchesFac(obj, facName) {
    if (!obj || !facName) return false;
    var k = _tmNormFactionName(facName);
    return _tmNormFactionName(_tmSc16ActorOf(obj)) === k
      || _tmNormFactionName(_tmFirstText(obj.target, obj.targetFaction, obj.to, obj.receiver, obj.object)) === k
      || _tmMentionsFactionForAi(obj, facName);
  }
  function _tmSc16HasDirectContent(row) { return !!(row && ((Array.isArray(row.actions) && row.actions.length) || (Array.isArray(row.diplomacy) && row.diplomacy.length) || (Array.isArray(row.directives) && row.directives.length))); }
  function _tmSc16PriorityValue(row) { var v = row && (row.priority != null ? row.priority : (row.score != null ? row.score : row.weight)); v = Number(v); return isFinite(v) ? v : 0; }
  // F2 Sub 2·2026-05-22·directive 内容指纹·用于 cross-turn cooldown 与 已执行 check
  function _tmSc16DirectiveHash(row) {
    if (!row) return '';
    var parts = [];
    (Array.isArray(row.actions) ? row.actions : []).forEach(function(a) {
      parts.push('a:' + _tmFirstText(a.target, a.targetFaction, a.to, a.province) + '|' + _tmFirstText(a.action, a.intent, a.kind));
    });
    (Array.isArray(row.diplomacy) ? row.diplomacy : []).forEach(function(d) {
      parts.push('d:' + _tmFirstText(d.from) + '>' + _tmFirstText(d.to) + '|' + _tmFirstText(d.type, d.new_relation));
    });
    (Array.isArray(row.directives) ? row.directives : []).forEach(function(dd) {
      parts.push('p:' + _tmFirstText(dd.strategic_intent, dd.must_follow, dd.reason).slice(0, 60));
    });
    return parts.sort().join('||');
  }
  function _tmBuildSc16PriorityQueue(p16, playerNames) {
    var raw = Array.isArray(p16.faction_priorities) ? p16.faction_priorities : (Array.isArray(p16.factionPriorities) ? p16.factionPriorities : []);
    return raw.map(function(row) {
      var fac = _tmFirstText(row && row.faction, row && row.name, row && row.targetFaction);
      return { faction: fac, priorityScore: _tmSc16PriorityValue(row), urgency: _tmFirstText(row && row.urgency, row && row.level), priorityReason: _tmFirstText(row && row.reason, row && row.rationale, row && row.motive), raw: row || {} };
    }).filter(function(row) { return row.faction && !_tmIsPlayerFactionNameForAi(row.faction, playerNames); }).sort(function(a, b) { return (b.priorityScore || 0) - (a.priorityScore || 0); });
  }
  function _tmBuildSc16DirectiveLedger(p16, G, playerFactionName) {
    G = G || global.GM || {};
    p16 = p16 || {};
    var playerNames = _tmPlayerFactionNameList(playerFactionName);
    var ledger = { turn: G.turn || 1, source: "sc16", byFaction: {}, order: [], directCount: 0, priorityQueue: [] };
    ledger.priorityQueue = _tmBuildSc16PriorityQueue(p16, playerNames);
    var priorityByFaction = {};
    ledger.priorityQueue.forEach(function(row) {
      priorityByFaction[_tmNormFactionName(row.faction)] = row;
    });
    (Array.isArray(G.facs) ? G.facs : []).forEach(function(fac) {
      if (!fac || !fac.name) return;
      if (_tmIsPlayerFactionForAi(fac, playerNames)) return;
      var row = { faction: fac.name, turn: ledger.turn, source: "sc16", actions: [], diplomacy: [], directives: [],
        territorialChanges: _tmFirstText(p16.territorial_changes, p16.territorialChanges),
        powerBalanceShift: _tmFirstText(p16.power_balance_shift, p16.powerBalanceShift) };
      var priority = priorityByFaction[_tmNormFactionName(fac.name)] || null;
      row.priorityScore = priority ? priority.priorityScore : 0;
      row.priorityUrgency = priority ? priority.urgency : "";
      row.priorityReason = priority ? priority.priorityReason : "";
      if (Array.isArray(p16.faction_actions)) row.actions = p16.faction_actions.filter(function(a) { return _tmSc16MatchesFac(a, fac.name); }).slice(0, 8);
      if (Array.isArray(p16.diplomatic_shifts)) {
        row.diplomacy = p16.diplomatic_shifts.filter(function(d) {
          var k = _tmNormFactionName(fac.name);
          return d && (_tmNormFactionName(d.from) === k || _tmNormFactionName(d.to) === k || _tmMentionsFactionForAi(d, fac.name));
        }).slice(0, 8);
      }
      if (Array.isArray(p16.faction_directives)) row.directives = p16.faction_directives.filter(function(d) { return _tmSc16MatchesFac(d, fac.name); }).slice(0, 4);
      row.hasDirectContent = _tmSc16HasDirectContent(row);
      if (!row.priorityScore && row.hasDirectContent) row.priorityScore = 65;
      if (!row.priorityReason && row.hasDirectContent) row.priorityReason = "sc16-directive";
      // F2 Sub 2/3·2026-05-22·cooldown + 已执行检查·防 SC16 反复推同方向
      row.directiveHash = _tmSc16DirectiveHash(row);
      if (row.directiveHash) {
        var history = Array.isArray(fac._sc16DirectiveHistory) ? fac._sc16DirectiveHistory : [];
        var recentSameHash = history.filter(function(h){ return h && h.directiveHash === row.directiveHash; });
        var compHistory = Array.isArray(fac._sc16ComplianceHistory) ? fac._sc16ComplianceHistory : [];
        // Sub 3·已执行标记·查 compliance history 中是否对同 hash 的 directive 已采纳率 ≥ 70%
        var alreadyExecutedRecently = compHistory.slice(-3).some(function(c){
          return c && c.complianceScore >= 70 && c.directiveHash === row.directiveHash;
        });
        if (alreadyExecutedRecently) {
          row.priorityScore = Math.max(0, (Number(row.priorityScore) || 0) - 30);
          row.cooldownApplied = 'already-executed';
          row.cooldownDelta = -30;
        } else if (recentSameHash.length >= 2) {
          // Sub 2·cooldown·近 8 回合内重复 ≥ 2 次·未达成 70% 采纳率·priority 降 20·防单调
          var avgCompliance = compHistory.length ? Math.round(compHistory.slice(-3).reduce(function(s, c){ return s + (c.complianceScore || 0); }, 0) / Math.min(compHistory.length, 3)) : 0;
          if (avgCompliance < 50) {
            row.priorityScore = Math.max(0, (Number(row.priorityScore) || 0) - 20);
            row.cooldownApplied = 'repetition';
            row.cooldownDelta = -20;
            row.cooldownAvgCompliance = avgCompliance;
          }
        }
      }
      row.actionBudgetHint = row.priorityScore >= 80 ? "precision-soon" : (row.priorityScore >= 55 ? "precision-normal" : "watch");
      ledger.byFaction[fac.name] = row;
      if (!priority) ledger.priorityQueue.push({ faction: fac.name, priorityScore: row.priorityScore, urgency: row.priorityUrgency, priorityReason: row.priorityReason, raw: null });
      if (row.hasDirectContent) ledger.directCount++;
    });
    ledger.priorityQueue.sort(function(a, b) { return (b.priorityScore || 0) - (a.priorityScore || 0); });
    ledger.priorityQueue.forEach(function(item, idx) { if (ledger.byFaction[item.faction]) ledger.byFaction[item.faction].priorityRank = idx + 1; });
    ledger.order = ledger.priorityQueue.map(function(x) { return x.faction; });
    return ledger;
  }

  function _tmStoreSc16DirectiveLedger(p16, G, playerFactionName) {
    if (!p16 || typeof p16 !== "object") return null;
    G = G || global.GM || {};
    var ledger = _tmBuildSc16DirectiveLedger(p16, G, playerFactionName);
    G._sc16FactionDirectives = ledger;
    (Array.isArray(G.facs) ? G.facs : []).forEach(function(fac) {
      if (!fac || !fac.name) return;
      var row = ledger.byFaction[fac.name];
      if (!row) return;
      fac._sc16Directive = row;
      if (row.hasDirectContent) {
        if (!Array.isArray(fac._sc16DirectiveHistory)) fac._sc16DirectiveHistory = [];
        fac._sc16DirectiveHistory.push(row);
        if (fac._sc16DirectiveHistory.length > 8) fac._sc16DirectiveHistory = fac._sc16DirectiveHistory.slice(-8);
      }
    });
    p16._factionDirectiveLedger = { turn: ledger.turn, source: ledger.source, count: ledger.order.length, directCount: ledger.directCount, factions: ledger.order.slice(), priorityQueue: ledger.priorityQueue.slice() };
    if (!G._npcFactionAiTurnLedger || G._npcFactionAiTurnLedger.turn !== ledger.turn) {
      G._npcFactionAiTurnLedger = { turn: ledger.turn, createdAt: ledger.turn, sc16: null, dispatch: G._npcFactionLlmDispatchLedger || null, runs: (G._npcFactionLlmLedger && G._npcFactionLlmLedger.runs) || {}, actions: [], candidateRanks: [], notes: [], stats: {} };
    }
    G._npcFactionAiTurnLedger.sc16 = ledger;
    return ledger;
  }

  function _tmDetectModelFamily(model, fallbackFamily) {
    if (model && typeof ModelAdapter !== "undefined" && ModelAdapter.detectFamily) {
      try { return ModelAdapter.detectFamily(model); } catch(_) {}
    }
    return fallbackFamily || "";
  }

  function copyResultsFromTurnState(ctx, p2) {
    var r = (global.GM && GM._turnAiResults) ? GM._turnAiResults : {}; ctx.results.sc1d = r.subcall1d || ctx.results.sc1d || null;
    ctx.results.sc15 = r.subcall15 || ctx.results.sc15 || null;
    ctx.results.sc_memwrite = r.subcallMemwrite || ctx.results.sc_memwrite || null;
    ctx.results.sc16 = r.subcall16 || ctx.results.sc16 || null;
    ctx.results.sc17 = r.subcall17 || ctx.results.sc17 || null;
    ctx.results.sc18 = r.subcall18 || ctx.results.sc18 || null;
    ctx.results.sc_audit = r.subcallAudit || ctx.results.sc_audit || null;
    ctx.results.sc2 = p2 || r.subcall2 || ctx.results.sc2 || null;
    ctx.results.sc25 = r.subcall25 || ctx.results.sc25 || null;
    ctx.results.sc27 = r.subcall27 || ctx.results.sc27 || null;
    ctx.results.sc07 = r.subcall07 || ctx.results.sc07 || null;
    ctx.results.sc28 = r.subcall28 || ctx.results.sc28 || null;
    ctx.results.sc_consolidate = r.subcallConsolidate || ctx.results.sc_consolidate || null;
    return ctx.results;
  }

  ns._resolvePlayerFactionNamesForAi = _tmResolvePlayerFactionNamesForAi;
  ns._resolvePlayerFactionNameForAi = _tmResolvePlayerFactionNameForAi;
  ns._isPlayerFactionForAi = _tmIsPlayerFactionForAi;
  ns._filterSc16PlayerOutputs = _tmFilterSc16PlayerOutputs;
  ns._buildSc16DirectiveLedger = _tmBuildSc16DirectiveLedger;
  ns._storeSc16DirectiveLedger = _tmStoreSc16DirectiveLedger;

  // ── 导出 bucket（origin alias 块逐名回绑·装载期填充·勿动序）──
  var _EFP = global.TM.__etFollowupParts = global.TM.__etFollowupParts || {};
  _EFP.ensureGroups = ensureGroups;
  _EFP._tmFirstText = _tmFirstText;
  _EFP._tmPickHouren = _tmPickHouren;
  _EFP._tmXmlText = _tmXmlText;
  _EFP._tmHiddenMoveForMemory = _tmHiddenMoveForMemory;
  _EFP._applyMwList = _applyMwList;
  _EFP._memWriteFallbackFromNarrative = _memWriteFallbackFromNarrative;
  _EFP._tmNormFactionName = _tmNormFactionName;
  _EFP._tmPlayerFactionNameList = _tmPlayerFactionNameList;
  _EFP._tmIsMarkedPlayerFaction = _tmIsMarkedPlayerFaction;
  _EFP._tmResolvePlayerFactionNamesForAi = _tmResolvePlayerFactionNamesForAi;
  _EFP._tmResolvePlayerFactionNameForAi = _tmResolvePlayerFactionNameForAi;
  _EFP._tmIsPlayerFactionNameForAi = _tmIsPlayerFactionNameForAi;
  _EFP._tmIsPlayerFactionForAi = _tmIsPlayerFactionForAi;
  _EFP._tmFilterSc16PlayerOutputs = _tmFilterSc16PlayerOutputs;
  _EFP._tmSc16TextBlob = _tmSc16TextBlob;
  _EFP._tmMentionsFactionForAi = _tmMentionsFactionForAi;
  _EFP._tmSc16ActorOf = _tmSc16ActorOf;
  _EFP._tmSc16MatchesFac = _tmSc16MatchesFac;
  _EFP._tmSc16HasDirectContent = _tmSc16HasDirectContent;
  _EFP._tmSc16PriorityValue = _tmSc16PriorityValue;
  _EFP._tmSc16DirectiveHash = _tmSc16DirectiveHash;
  _EFP._tmBuildSc16PriorityQueue = _tmBuildSc16PriorityQueue;
  _EFP._tmBuildSc16DirectiveLedger = _tmBuildSc16DirectiveLedger;
  _EFP._tmStoreSc16DirectiveLedger = _tmStoreSc16DirectiveLedger;
  _EFP._tmDetectModelFamily = _tmDetectModelFamily;
  _EFP.copyResultsFromTurnState = copyResultsFromTurnState;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
