/**
 * tm-keju-disciple-graph.js
 * v7.1·Slice F1·门生网络 D1 完整版
 *
 * 升级路径·E1 GM._mentorIndex (简版·只名/年) → F1 GM._discipleGraph (含 strength / lastInteraction / events)
 *
 * 数据结构·
 *   GM._discipleGraph.byMentor[examinerName] = {
 *     disciples: [{ name, cohortYear, addedTurn, strength: 60, lastInteraction, events: [] }]
 *   }
 *   GM._discipleGraph.byCohort[String(year)] = { members: [name], events: [] }
 *   GM._discipleGraph.byDisciple[name] = { mentor, cohortYear, strength, lastInteraction }
 *
 * Public API·
 *   _kjInitDiscipleGraph()
 *   _kjUpgradeMentorIndexToDiscipleGraph()    — 从 E1 _mentorIndex 一次性 migrate
 *   _kjAddDiscipleEdge(disciple, mentor, cohortYear, addedTurn)  — 增量加边·同党自动 +18 base strength
 *   _kjGetDiscipleStrength(mentor, disciple) → number  — 含衰减·返当前 strength × 0.95^(年数差)
 *   _kjBumpDiscipleStrength(mentor, disciple, delta, eventType, eventDetail)  — 加减 strength + record event
 *   _kjDiscipleGraphEndTurnDecay()  — endTurn 年度衰减·年初一次跑
 *   _kjGetActiveDisciples(mentor, minStrength) → [...]  — 强度过滤·F2/F4 用
 *   _kjGetCohortActiveMembers(year, minAlive) → [...]   — alive 过滤·F3 用
 *
 * red line·
 *   - flag gate·P.conf.useNewKejuD1 默 false·关时本 module 全 no-op (返空 / skip init)
 *   - E1 _mentorIndex 仍工作 (E1 API 不动)
 *   - 不动 ch schema (用 D5 已写的 _mentorRef + _cohortYear + party)
 *
 * 依赖·
 *   - D5 ch._mentorRef + ch._cohortYear + ch.party (eager write)
 *   - E1 _kjGetMentees / _kjGetMentor (兜底·F1 namespace 空时 fallback)
 */
(function() {
  'use strict';

  var BASE_STRENGTH = 60;
  var SAME_PARTY_BONUS = 18;
  var DECAY_RATE = 0.95;
  var STRENGTH_MIN = 0;
  var STRENGTH_MAX = 100;
  var HOT_SET_THRESHOLD = 10;  // strength < 10·从 hot set 摘除

  /** flag gate·D1 总开关 */
  function _isD1Enabled() {
    if (typeof P === 'undefined' || !P) return false;
    if (!P.conf) return false;
    return P.conf.useNewKejuD1 !== false; // 默认开·2026-06-15·门生/清议解锁（spawn 有冷却·不刷屏；undefined→on·显式 false 才关）
  }

  function _kjInitDiscipleGraph() {
    if (typeof GM === 'undefined' || !GM) return;
    if (!_isD1Enabled()) return;  // flag gate
    if (!GM._discipleGraph) GM._discipleGraph = {};
    if (!GM._discipleGraph.byMentor) GM._discipleGraph.byMentor = {};
    if (!GM._discipleGraph.byCohort) GM._discipleGraph.byCohort = {};
    if (!GM._discipleGraph.byDisciple) GM._discipleGraph.byDisciple = {};
  }

  /** 一次性 migrate·E1 _mentorIndex → F1 _discipleGraph·老存档自动跑 */
  function _kjUpgradeMentorIndexToDiscipleGraph() {
    if (typeof GM === 'undefined' || !GM) return;
    if (!_isD1Enabled()) return;
    _kjInitDiscipleGraph();
    if (!GM._mentorIndex || !GM._mentorIndex.byMentor) return;

    Object.keys(GM._mentorIndex.byMentor).forEach(function(mentor) {
      var e1List = GM._mentorIndex.byMentor[mentor] || [];
      e1List.forEach(function(e) {
        _kjAddDiscipleEdge(e.disciple, mentor, e.cohortYear, e.addedTurn);
      });
    });
  }

  function _kjAddDiscipleEdge(disciple, mentor, cohortYear, addedTurn) {
    if (!disciple || !mentor) return;
    if (typeof GM === 'undefined' || !GM) return;
    if (!_isD1Enabled()) return;
    _kjInitDiscipleGraph();
    addedTurn = addedTurn || (GM.turn || 0);
    cohortYear = cohortYear || (GM.year || 0);
    var addedYear = (GM.year || cohortYear);  // v7.1·F1·存 year·避免 turn→year 换算错

    // 同党 bonus·D5 已写 ch.party·查询 examiner ch + disciple ch
    // 中立/无党/无党派 不算"同党" (避免无党 disciple 也吃 bonus)
    var examinerCh = (typeof findCharByName === 'function') ? findCharByName(mentor) : null;
    var discipleCh = (typeof findCharByName === 'function') ? findCharByName(disciple) : null;
    var samePartyBonus = 0;
    var NEUTRAL_PARTIES = ['中立', '无党', '无党派'];
    if (examinerCh && discipleCh && examinerCh.party && discipleCh.party
        && examinerCh.party === discipleCh.party
        && NEUTRAL_PARTIES.indexOf(examinerCh.party) < 0) {
      samePartyBonus = SAME_PARTY_BONUS;
    }
    var initialStrength = BASE_STRENGTH + samePartyBonus;
    initialStrength = Math.max(STRENGTH_MIN, Math.min(STRENGTH_MAX, initialStrength));

    // byMentor·去重
    if (!GM._discipleGraph.byMentor[mentor]) GM._discipleGraph.byMentor[mentor] = { disciples: [] };
    var mentorRec = GM._discipleGraph.byMentor[mentor];
    if (!mentorRec.disciples.find(function(e){ return e.name === disciple; })) {
      mentorRec.disciples.push({
        name: disciple,
        cohortYear: cohortYear,
        addedTurn: addedTurn,
        addedYear: addedYear,
        strength: initialStrength,
        lastInteractionYear: addedYear,
        events: []
      });
    }

    // byCohort
    var cy = String(cohortYear);
    if (!GM._discipleGraph.byCohort[cy]) GM._discipleGraph.byCohort[cy] = { members: [], events: [] };
    if (GM._discipleGraph.byCohort[cy].members.indexOf(disciple) < 0) {
      GM._discipleGraph.byCohort[cy].members.push(disciple);
    }

    // byDisciple
    GM._discipleGraph.byDisciple[disciple] = {
      mentor: mentor,
      cohortYear: cohortYear,
      strength: initialStrength,
      lastInteractionYear: addedYear
    };
  }

  /** strength 含衰减·年数差 ^ 0.95·lastInteractionYear 单位是 year */
  function _kjGetDiscipleStrength(mentor, disciple) {
    if (!_isD1Enabled()) return 0;
    if (typeof GM === 'undefined' || !GM || !GM._discipleGraph || !GM._discipleGraph.byDisciple) return 0;
    var rec = GM._discipleGraph.byDisciple[disciple];
    if (!rec || rec.mentor !== mentor) return 0;
    var year = (GM.year || 0);
    var lastYr = rec.lastInteractionYear || rec.cohortYear || year;
    var yearGap = Math.max(0, year - lastYr);
    var decayed = (rec.strength || BASE_STRENGTH) * Math.pow(DECAY_RATE, yearGap);
    return Math.round(decayed * 10) / 10;
  }

  function _kjBumpDiscipleStrength(mentor, disciple, delta, eventType, eventDetail) {
    if (!_isD1Enabled()) return;
    if (typeof GM === 'undefined' || !GM || !GM._discipleGraph) return;
    var mRec = GM._discipleGraph.byMentor[mentor];
    if (!mRec) return;
    var dRec = mRec.disciples.find(function(e){ return e.name === disciple; });
    if (!dRec) return;
    dRec.strength = Math.max(STRENGTH_MIN, Math.min(STRENGTH_MAX, (dRec.strength || BASE_STRENGTH) + (delta || 0)));
    dRec.lastInteractionYear = (GM.year || 0);
    if (eventType) {
      dRec.events.push({
        turn: (GM.turn || 0),
        year: (GM.year || 0),
        type: eventType,
        detail: eventDetail || '',
        delta: delta || 0
      });
      // 限 events 长度·防溢
      if (dRec.events.length > 30) dRec.events = dRec.events.slice(-30);
    }
    // 同步 byDisciple
    if (GM._discipleGraph.byDisciple[disciple]) {
      GM._discipleGraph.byDisciple[disciple].strength = dRec.strength;
      GM._discipleGraph.byDisciple[disciple].lastInteractionYear = dRec.lastInteractionYear;
    }
  }

  /** endTurn·hot set cleanup·strength<10 的 disciple 从 hot 列表移除·**不 mutate strength**
   *  (decay 已由 _kjGetDiscipleStrength 即时计算·避免 double decay) */
  function _kjDiscipleGraphEndTurnDecay() {
    if (!_isD1Enabled()) return;
    if (typeof GM === 'undefined' || !GM || !GM._discipleGraph) return;
    // 仅清理 hot set·strength (含衰减) <10 的 disciple 标 cold·F2/F3 active 过滤已用 minStrength
    // 此处保留 hook·后续可加 archived 队列等
  }

  /** F2 用·返该主考强度过 minStrength 的活门生 */
  function _kjGetActiveDisciples(mentor, minStrength) {
    if (!_isD1Enabled()) return [];
    if (typeof GM === 'undefined' || !GM || !GM._discipleGraph || !GM._discipleGraph.byMentor) return [];
    var mRec = GM._discipleGraph.byMentor[mentor];
    if (!mRec || !mRec.disciples) return [];
    minStrength = (typeof minStrength === 'number') ? minStrength : 0;
    return mRec.disciples.filter(function(d) {
      if (_kjGetDiscipleStrength(mentor, d.name) < minStrength) return false;
      // alive 检查
      var ch = (typeof findCharByName === 'function') ? findCharByName(d.name) : null;
      return !ch || ch.alive !== false;
    }).map(function(d) {
      return {
        name: d.name,
        cohortYear: d.cohortYear,
        strength: _kjGetDiscipleStrength(mentor, d.name),
        lastInteractionYear: d.lastInteractionYear
      };
    }).sort(function(a, b) { return b.strength - a.strength; });
  }

  /** F3 用·返同年活成员 (alive 过滤) */
  function _kjGetCohortActiveMembers(year, minAlive) {
    if (!_isD1Enabled()) return [];
    if (typeof GM === 'undefined' || !GM || !GM._discipleGraph || !GM._discipleGraph.byCohort) return [];
    var cy = String(year);
    var cRec = GM._discipleGraph.byCohort[cy];
    if (!cRec || !cRec.members) return [];
    var alive = cRec.members.filter(function(name) {
      var ch = (typeof findCharByName === 'function') ? findCharByName(name) : null;
      return !ch || ch.alive !== false;
    });
    if (typeof minAlive === 'number' && alive.length < minAlive) return [];
    return alive;
  }

  // 暴露
  if (typeof window !== 'undefined') {
    window._kjInitDiscipleGraph = _kjInitDiscipleGraph;
    window._kjUpgradeMentorIndexToDiscipleGraph = _kjUpgradeMentorIndexToDiscipleGraph;
    window._kjAddDiscipleEdge = _kjAddDiscipleEdge;
    window._kjGetDiscipleStrength = _kjGetDiscipleStrength;
    window._kjBumpDiscipleStrength = _kjBumpDiscipleStrength;
    window._kjDiscipleGraphEndTurnDecay = _kjDiscipleGraphEndTurnDecay;
    window._kjGetActiveDisciples = _kjGetActiveDisciples;
    window._kjGetCohortActiveMembers = _kjGetCohortActiveMembers;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      _kjInitDiscipleGraph: _kjInitDiscipleGraph,
      _kjUpgradeMentorIndexToDiscipleGraph: _kjUpgradeMentorIndexToDiscipleGraph,
      _kjAddDiscipleEdge: _kjAddDiscipleEdge,
      _kjGetDiscipleStrength: _kjGetDiscipleStrength,
      _kjBumpDiscipleStrength: _kjBumpDiscipleStrength,
      _kjDiscipleGraphEndTurnDecay: _kjDiscipleGraphEndTurnDecay,
      _kjGetActiveDisciples: _kjGetActiveDisciples,
      _kjGetCohortActiveMembers: _kjGetCohortActiveMembers
    };
  }
})();
