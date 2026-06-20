/* tm-faction-goal-stack.js · ③-S1 — 势力前瞻式目标栈（带状态 + 多步计划 + 生命周期）
 *
 * 用途：把现状的「回溯式行为标签累积」（aiStrategy.objectives 等）升级为
 *       「前瞻式目标栈」——势力有要达成的目标、分多步、可跨回合连贯推进/观察/调整。
 *       本刀纯新增数据层 + 管理 API，不接任何决策流程（S2 才接 _buildPrompt / _applyDecision）。
 *
 * 与现状并存：goals 挂在 fac.aiStrategy.goals，不动现有 objectives/threats/... 字段。
 *
 * 跨朝代铁律：本模块只含通用机制（目标状态机 / 多步 / 分层），
 *   绝无朝代专名；目标内容 desc/steps 由调用方（LLM + 剧本数据）提供。
 *
 * 中等深度（owner 拍板）：同时活跃 long≤2 + short≤2 = 4 个目标，每目标 steps≤5。
 *
 * 环境：浏览器（window.TM）与 node（globalThis.TM·供自测）双兼容。
 */
(function (root) {
  'use strict';
  root.TM = root.TM || {};
  var NS = root.TM.FactionGoalStack = root.TM.FactionGoalStack || {};

  var MAX_ACTIVE_LONG = 2;
  var MAX_ACTIVE_SHORT = 2;
  var MAX_STEPS = 5;
  var STALE_TURNS = 12;     // active 目标 >12 回合无进展 → 自动放弃
  var KEEP_ENDED = 8;       // 已结束目标最多留 8 条历史

  function _num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function _arr(v) { return Array.isArray(v) ? v : []; }
  function _str(v, n) { return String(v == null ? '' : v).trim().slice(0, n || 120); }
  function _find(goals, id) {
    id = String(id == null ? '' : id);
    for (var i = 0; i < goals.length; i++) if (goals[i] && String(goals[i].id) === id) return goals[i];
    return null;
  }
  function _byPriorityDesc(a, b) {
    return (_num(b.priority) - _num(a.priority)) || (_num(b.lastProgressTurn) - _num(a.lastProgressTurn));
  }

  function ensureGoals(fac) {
    if (!fac) return null;
    if (!fac.aiStrategy || typeof fac.aiStrategy !== 'object') fac.aiStrategy = {};
    if (!Array.isArray(fac.aiStrategy.goals)) fac.aiStrategy.goals = [];
    if (typeof fac.aiStrategy._goalSeq !== 'number') fac.aiStrategy._goalSeq = 0;
    return fac.aiStrategy.goals;
  }

  // 超出分层上限 → 把最旧/最低优先的 active 目标降为 abandoned
  function _enforceActiveCap(fac) {
    var goals = fac.aiStrategy.goals;
    [['long', MAX_ACTIVE_LONG], ['short', MAX_ACTIVE_SHORT]].forEach(function (pair) {
      var h = pair[0], cap = pair[1];
      var act = goals.filter(function (g) { return g.status === 'active' && g.horizon === h; });
      if (act.length > cap) {
        act.sort(function (a, b) {
          return (_num(a.priority) - _num(b.priority)) || (_num(a.lastProgressTurn) - _num(b.lastProgressTurn));
        });
        act.slice(0, act.length - cap).forEach(function (g) { g.status = 'abandoned'; });
      }
    });
  }

  function addGoal(fac, spec, turn) {
    var goals = ensureGoals(fac);
    if (!goals) return null;
    spec = spec || {};
    var desc = _str(spec.desc, 120);
    if (!desc) return null;
    // 去重：已有同 desc 的 active 目标 → 返回它，不重复建
    var dup = goals.filter(function (g) { return g.status === 'active' && g.desc === desc; })[0];
    if (dup) return dup;
    var horizon = (spec.horizon === 'long') ? 'long' : 'short';
    var steps = _arr(spec.steps).slice(0, MAX_STEPS).map(function (s) {
      return { desc: _str((s && s.desc != null) ? s.desc : s, 80), done: !!(s && s.done) };
    }).filter(function (s) { return s.desc; });
    var t = _num(turn);
    var g = {
      id: 'g' + t + '-' + (fac.aiStrategy._goalSeq++),
      desc: desc, horizon: horizon, status: 'active',
      steps: steps, curStep: 0,
      createdTurn: t, lastProgressTurn: t,
      progressNote: _str(spec.note, 120), priority: _num(spec.priority)
    };
    goals.push(g);
    _enforceActiveCap(fac);
    return g;
  }

  function advanceGoal(fac, id, info, turn) {
    var goals = ensureGoals(fac);
    if (!goals) return null;
    info = info || {};
    var g = _find(goals, id);
    if (!g || g.status !== 'active') return null;
    if (info.stepDone && g.steps[g.curStep]) {
      g.steps[g.curStep].done = true;
      g.curStep = Math.min(g.curStep + 1, g.steps.length);
    }
    if (info.note != null) g.progressNote = _str(info.note, 120);
    g.lastProgressTurn = _num(turn);
    // 全部步骤完成 → 自动达成
    if (g.steps.length > 0 && g.curStep >= g.steps.length && g.steps.every(function (s) { return s.done; })) {
      g.status = 'achieved';
    }
    return g;
  }

  function resolveGoal(fac, id, status, turn) {
    var goals = ensureGoals(fac);
    if (!goals) return null;
    var g = _find(goals, id);
    if (!g) return null;
    if (['achieved', 'failed', 'abandoned'].indexOf(status) < 0) status = 'abandoned';
    g.status = status;
    g.lastProgressTurn = _num(turn);
    return g;
  }

  // 取活跃目标（分层 cap：long≤2 + short≤2），按 priority 降序
  function activeGoals(fac) {
    var goals = ensureGoals(fac);
    if (!goals) return [];
    var act = goals.filter(function (g) { return g.status === 'active'; });
    var longs = act.filter(function (g) { return g.horizon === 'long'; }).sort(_byPriorityDesc).slice(0, MAX_ACTIVE_LONG);
    var shorts = act.filter(function (g) { return g.horizon === 'short'; }).sort(_byPriorityDesc).slice(0, MAX_ACTIVE_SHORT);
    return longs.concat(shorts);
  }

  // 淘汰：陈旧 active → abandoned；已结束目标超量截断
  function pruneGoals(fac, turn) {
    var goals = ensureGoals(fac);
    if (!goals) return;
    var t = _num(turn);
    goals.forEach(function (g) {
      if (g.status === 'active' && (t - _num(g.lastProgressTurn)) > STALE_TURNS) g.status = 'abandoned';
    });
    var ended = goals.filter(function (g) { return g.status !== 'active'; });
    if (ended.length > KEEP_ENDED) {
      ended.sort(function (a, b) { return _num(a.lastProgressTurn) - _num(b.lastProgressTurn); });
      var remove = ended.slice(0, ended.length - KEEP_ENDED);
      fac.aiStrategy.goals = goals.filter(function (g) { return remove.indexOf(g) < 0; });
    }
  }

  // S3 批量：把 LLM 报告的 goalUpdates 应用到目标栈
  // updates = { newGoals:[{desc,horizon,steps,priority,note}], advance:[{id,note,stepDone}], resolve:[{id,status}] }
  function applyUpdates(fac, updates, turn) {
    var out = { added: 0, advanced: 0, resolved: 0 };
    if (!fac) return out;
    updates = updates || {};
    _arr(updates.newGoals).forEach(function (s) { if (addGoal(fac, s, turn)) out.added++; });
    _arr(updates.advance).forEach(function (u) { if (u && advanceGoal(fac, u.id, u, turn)) out.advanced++; });
    _arr(updates.resolve).forEach(function (u) { if (u && resolveGoal(fac, u.id, u.status, turn)) out.resolved++; });
    pruneGoals(fac, turn);
    return out;
  }

  // S2：生成喂进决策 prompt 的文本（朝代中立英文，与现有 _formatOwnStrategicMemory 同语域）
  function formatForPrompt(fac) {
    var act = activeGoals(fac);
    if (!act.length) return '';
    var lines = ['  Your active multi-turn goals (pursue coherently across turns·advance ONE step at a time·report progress via goalUpdates):'];
    act.forEach(function (g) {
      var stepInfo;
      if (g.steps.length) {
        var cur = g.steps[g.curStep];
        stepInfo = 'step ' + Math.min(g.curStep + 1, g.steps.length) + '/' + g.steps.length + (cur ? ': ' + cur.desc : ' (all done)');
      } else { stepInfo = 'no steps'; }
      lines.push('  [' + g.id + '·' + g.horizon + '] ' + g.desc + ' (' + stepInfo + (g.progressNote ? '·note: ' + g.progressNote : '') + ')');
    });
    return lines.join('\n');
  }

  NS.ensureGoals = ensureGoals;
  NS.addGoal = addGoal;
  NS.advanceGoal = advanceGoal;
  NS.resolveGoal = resolveGoal;
  NS.activeGoals = activeGoals;
  NS.pruneGoals = pruneGoals;
  NS.applyUpdates = applyUpdates;
  // S4：进度摘要（只读·无副作用·给 NPC 决策 ledger / 诊断面板可观测）
  function summarize(fac) {
    var goals = (fac && fac.aiStrategy && Array.isArray(fac.aiStrategy.goals)) ? fac.aiStrategy.goals : [];
    var act = goals.filter(function (g) { return g && g.status === 'active'; });
    var longs = act.filter(function (g) { return g.horizon === 'long'; }).sort(_byPriorityDesc).slice(0, MAX_ACTIVE_LONG);
    var shorts = act.filter(function (g) { return g.horizon === 'short'; }).sort(_byPriorityDesc).slice(0, MAX_ACTIVE_SHORT);
    var top = longs.concat(shorts).slice(0, 3).map(function (g) {
      return {
        id: g.id, desc: g.desc, horizon: g.horizon,
        step: (g.steps && g.steps.length) ? (Math.min(g.curStep + 1, g.steps.length) + '/' + g.steps.length) : '-',
        note: g.progressNote || ''
      };
    });
    return {
      active: act.length,
      achieved: goals.filter(function (g) { return g && g.status === 'achieved'; }).length,
      failed: goals.filter(function (g) { return g && g.status === 'failed'; }).length,
      top: top
    };
  }

  NS.formatForPrompt = formatForPrompt;
  NS.summarize = summarize;
  NS.limits = { MAX_ACTIVE_LONG: MAX_ACTIVE_LONG, MAX_ACTIVE_SHORT: MAX_ACTIVE_SHORT, MAX_STEPS: MAX_STEPS };
  NS.version = '0.2.0-s4';
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
