/**
 * tm-keju-cohort-meet.js
 * v7.1·Slice F3·同年集会·走常朝 source pool
 *
 * 触发·某 cohort 5+ alive·distance(year - cohortYear) ≥3·20% 随机·5 年 cooldown
 * 输出·写入 GM._kjCohortMeets·_cc2_collectAgendaSources 消费·让 LLM 改写为
 *      言官 NPC 在常朝奏 "X 同年集会·议时政·疑结党"
 *
 * red line·
 *   - flag gate·P.conf.useNewKejuD1=false 全 no-op
 *   - 不发 modal·不发邸报·不动 keyi 800 行
 *   - 走 _cc2_pushAgendaSource·让 LLM 改写为言官 NPC 上奏
 *
 * Public API·
 *   _kjCheckCohortMeetTriggers()             — endTurn 调·检测 cohort·spawn meet
 *   _kjConsumeCohortMeetsForAgenda()         — _cc2_collectAgendaSources 调·消费队列
 *
 * 依赖·
 *   - F1 GM._discipleGraph.byCohort + _kjGetCohortActiveMembers
 *   - tm-chaoyi.js _cc2_pushAgendaSource (在 _cc2_collectAgendaSources 内引)
 */
(function() {
  'use strict';

  var MIN_MEMBERS = 5;
  var COOLDOWN_YEARS = 5;
  var MIN_DISTANCE_YEARS = 3;
  var TRIGGER_PROBABILITY = 0.20;
  var MAX_SPAWN_PER_TURN = 1;
  var MAX_CONSUME_PER_AGENDA = 2;
  var MAX_ATTENDEES = 8;

  function _isD1Enabled() {
    if (typeof P === 'undefined' || !P || !P.conf) return false;
    return P.conf.useNewKejuD1 !== false; // 默认开·2026-06-15·门生/清议解锁（spawn 有冷却·不刷屏；undefined→on·显式 false 才关）
  }

  /** 主入口·endTurn 调·检测所有 cohort·spawn meet */
  function _kjCheckCohortMeetTriggers() {
    if (!_isD1Enabled()) return 0;
    if (typeof GM === 'undefined' || !GM) return 0;
    if (!GM._discipleGraph || !GM._discipleGraph.byCohort) return 0;
    if (!GM._kjCohortMeets) GM._kjCohortMeets = [];
    if (!GM._kjCohortMeetCooldown) GM._kjCohortMeetCooldown = {};
    var year = (GM.year || 0);
    var spawned = 0;

    var cohorts = Object.keys(GM._discipleGraph.byCohort);
    for (var i = 0; i < cohorts.length; i++) {
      if (spawned >= MAX_SPAWN_PER_TURN) break;
      var cy = cohorts[i];
      var cohortYear = parseInt(cy, 10);
      if (isNaN(cohortYear)) continue;
      // distance gate·至少 3 年才能 spawn (避免登科即开会)
      if (year - cohortYear < MIN_DISTANCE_YEARS) continue;
      // cooldown·同 cohort 5 年内不重复
      var lastSpawn = GM._kjCohortMeetCooldown[cy] || 0;
      if (lastSpawn && (year - lastSpawn) < COOLDOWN_YEARS) continue;
      // alive 过滤·5+
      var alive = (typeof _kjGetCohortActiveMembers === 'function')
        ? _kjGetCohortActiveMembers(cohortYear, MIN_MEMBERS) : [];
      if (!alive || alive.length < MIN_MEMBERS) continue;
      // 20% 随机
      if (Math.random() > TRIGGER_PROBABILITY) continue;

      // organizer·alive 首 (后续可按 strength/官位 pick)
      var organizer = alive[0];
      var attendees = alive.slice(0, MAX_ATTENDEES);

      GM._kjCohortMeets.push({
        cohortYear: cohortYear,
        organizer: organizer,
        attendees: attendees,
        attendeeCount: attendees.length,
        totalAlive: alive.length,
        spawnedTurn: (GM.turn || 0),
        spawnedYear: year
      });
      GM._kjCohortMeetCooldown[cy] = year;
      spawned++;
    }
    return spawned;
  }

  /** 供 _cc2_collectAgendaSources 调·消费当前 spawned meets (最多 2·防 spam) */
  function _kjConsumeCohortMeetsForAgenda() {
    if (!_isD1Enabled()) return [];
    if (typeof GM === 'undefined' || !GM) return [];
    if (!GM._kjCohortMeets || !GM._kjCohortMeets.length) return [];
    var out = GM._kjCohortMeets.slice(0, MAX_CONSUME_PER_AGENDA);
    GM._kjCohortMeets = GM._kjCohortMeets.slice(MAX_CONSUME_PER_AGENDA);
    return out;
  }

  /**
   * Phase L·L5 share·inject 主 genMemorialsAI prompt·让主 LLM 写同年集会议·入 GM.memorials
   * 跟 F2/L5 同 paradigm·跨系统 share
   * RAA·B5·gate dependency·F3 独立 D1 flag·跟 L5/F2 各自 flag·non-coupled
   */
  function _kjF3InjectMemorialPrompt(promptBuf) {
    if (!_isD1Enabled()) return promptBuf;
    if (typeof GM === 'undefined' || !GM || !GM._kjCohortMeets || !GM._kjCohortMeets.length) return promptBuf;
    var meets = GM._kjCohortMeets.slice(0, 2);
    if (!meets.length) return promptBuf;
    var inject = '\n\n【F3·同年集会·可能上书】\n';
    meets.forEach(function(m) {
      if (!m || !m.organizer || !m.cohortYear) return;
      inject += '  · ' + m.cohortYear + ' 年同年 ' + m.attendeeCount + ' 人·' + m.organizer + ' 召·议时政·疑结党\n';
    });
    inject += '※ 若上述同年组织者为本回合奏疏对象·生成 200-400 字古文·\n';
    inject += '   - type 标 "政务"·subtype 标 "同年集会"·relatedTo 标 cohortYear\n';
    inject += '   - content·按 "同年情谊"·议时政·或自请释疑 (恐结党之嫌)\n';
    inject += '   - 结尾"伏请陛下"\n';
    return promptBuf + inject;
  }

  // 暴露
  if (typeof window !== 'undefined') {
    window._kjCheckCohortMeetTriggers = _kjCheckCohortMeetTriggers;
    window._kjConsumeCohortMeetsForAgenda = _kjConsumeCohortMeetsForAgenda;
    window._kjF3InjectMemorialPrompt = _kjF3InjectMemorialPrompt;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      _kjCheckCohortMeetTriggers: _kjCheckCohortMeetTriggers,
      _kjConsumeCohortMeetsForAgenda: _kjConsumeCohortMeetsForAgenda,
      _kjF3InjectMemorialPrompt: _kjF3InjectMemorialPrompt
    };
  }
})();
