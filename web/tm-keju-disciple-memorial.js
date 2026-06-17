/**
 * tm-keju-disciple-memorial.js
 * v7.1·Slice F2·门生联名上书·走常朝 source pool
 *
 * 触发·mentor 致仕 / 被弹劾 / 将卒 (3 条件之一) + 强度>70 门生≥3
 * cooldown·同一 mentor 5 年内不重 spawn
 *
 * 输出·写入 GM._kjDiscipleMemorials 队列·_cc2_collectAgendaSources 消费·
 * 若 cosigners≥5 且跨党·也 push GM._pendingTinyiTopics (廷议待议)
 *
 * red line·
 *   - flag gate·P.conf.useNewKejuD1=false 全 no-op
 *   - 不发 modal·不发邸报·不动 keyi 800 行
 *   - 走 _cc2_pushAgendaSource·让 LLM 改写为 NPC 上奏
 *
 * Public API·
 *   _kjCheckDiscipleMemorialTriggers()             — endTurn 调·检测 mentor·spawn memorial
 *   _kjConsumeDiscipleMemorialsForAgenda()         — _cc2_collectAgendaSources 调·消费队列
 *   _kjDetectMentorState(mentor)                   — 返 trigger type 或 null
 *   _kjIsCrossPartyMemorial(memorial)              — 跨党检测
 *
 * 依赖·
 *   - F1 GM._discipleGraph + _kjGetActiveDisciples
 *   - D5 ch._mentorRef + ch.party (eager write)
 *   - tm-chaoyi.js _cc2_pushAgendaSource (在 _cc2_collectAgendaSources 内引)
 */
(function() {
  'use strict';

  var COOLDOWN_YEARS = 5;
  var MIN_STRENGTH = 70;
  var MIN_COSIGNERS = 3;
  var ESCALATE_TINYI_COSIGNERS = 5;
  var MAX_SPAWN_PER_TURN = 1;
  var MAX_CONSUME_PER_AGENDA = 3;
  var NEUTRAL_PARTIES = ['中立', '无党', '无党派'];

  function _isD1Enabled() {
    if (typeof P === 'undefined' || !P || !P.conf) return false;
    return P.conf.useNewKejuD1 !== false; // 默认开·2026-06-15·门生/清议解锁（spawn 有冷却·不刷屏；undefined→on·显式 false 才关）
  }

  /** 判断 mentor 当前状态·返 trigger type 或 null */
  function _kjDetectMentorState(mentor) {
    if (typeof findCharByName !== 'function') return null;
    var ch = findCharByName(mentor);
    if (!ch) return null;
    if (ch.alive === false) return 'mentor_passing';  // 已逝·一次性 trigger
    var title = ch.officialTitle || ch.title || '';
    if (title.indexOf('致仕') >= 0) return 'retire';
    // 被弹劾·读 incident 等 state
    if (ch.incident) {
      try {
        var incStr = JSON.stringify(ch.incident);
        if (/impeach|劾|罪/.test(incStr)) return 'impeach';
      } catch (_) {}
    }
    // 将卒·age > 70 OR health < 20
    var health = (ch.resources && typeof ch.resources.health === 'number') ? ch.resources.health
               : (typeof ch.health === 'number') ? ch.health : 100;
    var age = (typeof ch.age === 'number') ? ch.age : 50;
    if (age > 70 || health < 20) return 'passing';
    return null;
  }

  /** 跨党检测·mentor 党 vs 中立/无党 → false·否则 true */
  function _kjIsCrossPartyMemorial(memorial) {
    if (!memorial || !memorial.mentor) return false;
    if (typeof findCharByName !== 'function') return false;
    var mentorCh = findCharByName(memorial.mentor);
    if (!mentorCh || !mentorCh.party) return false;
    return NEUTRAL_PARTIES.indexOf(mentorCh.party) < 0;
  }

  /** 主入口·endTurn 调·检测所有 mentor·spawn memorial */
  function _kjCheckDiscipleMemorialTriggers() {
    if (!_isD1Enabled()) return 0;
    if (typeof GM === 'undefined' || !GM) return 0;
    if (!GM._discipleGraph || !GM._discipleGraph.byMentor) return 0;
    if (!GM._kjDiscipleMemorials) GM._kjDiscipleMemorials = [];
    if (!GM._kjMemorialCooldown) GM._kjMemorialCooldown = {};
    var year = (GM.year || 0);
    var spawned = 0;

    var mentors = Object.keys(GM._discipleGraph.byMentor);
    for (var i = 0; i < mentors.length; i++) {
      if (spawned >= MAX_SPAWN_PER_TURN) break;
      var mentor = mentors[i];
      // cooldown
      var lastSpawn = GM._kjMemorialCooldown[mentor] || 0;
      if (lastSpawn && (year - lastSpawn) < COOLDOWN_YEARS) continue;
      // state
      var state = _kjDetectMentorState(mentor);
      if (!state) continue;
      // 强度门生
      var active = (typeof _kjGetActiveDisciples === 'function')
        ? _kjGetActiveDisciples(mentor, MIN_STRENGTH) : [];
      if (active.length < MIN_COSIGNERS) continue;

      var leader = active[0];
      var cosigners = active.slice(0, 10).map(function(d) { return d.name; });

      var memorial = {
        triggerType: state,
        mentor: mentor,
        leaderDisciple: leader.name,
        cosigners: cosigners,
        spawnedTurn: (GM.turn || 0),
        spawnedYear: year,
        detail: (state === 'mentor_passing' || state === 'passing') ? '请祭恩师'
              : state === 'impeach' ? '请陛下明察'
              : state === 'retire' ? '请恩师起复' : '门生联名'
      };
      GM._kjDiscipleMemorials.push(memorial);
      GM._kjMemorialCooldown[mentor] = year;
      spawned++;

      // escalate·跨党 + cosigners≥5 → 廷议待议
      if (cosigners.length >= ESCALATE_TINYI_COSIGNERS && _kjIsCrossPartyMemorial(memorial)) {
        if (!Array.isArray(GM._pendingTinyiTopics)) GM._pendingTinyiTopics = [];
        GM._pendingTinyiTopics.push({
          title: '门生联名议·' + mentor + '身后事',
          topic: memorial.detail,
          from: leader.name + '等门生联名 (' + cosigners.length + '人)',
          dept: '门生·廷议',
          importance: 7
        });
      }
    }
    return spawned;
  }

  /** 供 _cc2_collectAgendaSources 调·消费当前 spawned memorials (最多 3·防 spam) */
  function _kjConsumeDiscipleMemorialsForAgenda() {
    if (!_isD1Enabled()) return [];
    if (typeof GM === 'undefined' || !GM) return [];
    if (!GM._kjDiscipleMemorials || !GM._kjDiscipleMemorials.length) return [];
    var out = GM._kjDiscipleMemorials.slice(0, MAX_CONSUME_PER_AGENDA);
    GM._kjDiscipleMemorials = GM._kjDiscipleMemorials.slice(MAX_CONSUME_PER_AGENDA);
    return out;
  }

  /**
   * Phase L·L5 share·inject 主 genMemorialsAI prompt·让主 LLM 写门生上书·入 GM.memorials
   * 跟 L5 同 paradigm·跨系统 share·user 在「百官奏疏」main UI 一处批
   * RAA·B5·gate dependency·F2 独立 D1 flag (useNewKejuD1)·L5 是 useNewKejuL5·两 flag 独立
   * 若 L5 on + D1 off → L5 inject 反对奏疏·F2 不 inject 门生上书 (符合 F2 启用语义)
   */
  function _kjF2InjectMemorialPrompt(promptBuf) {
    if (!_isD1Enabled()) return promptBuf;
    if (typeof GM === 'undefined' || !GM || !GM._kjDiscipleMemorials || !GM._kjDiscipleMemorials.length) return promptBuf;
    var memorials = GM._kjDiscipleMemorials.slice(0, 2);
    if (!memorials.length) return promptBuf;
    var inject = '\n\n【F2·门生联名·可能上书】\n';
    memorials.forEach(function(m) {
      if (!m || !m.mentor || !m.cosigners) return;
      var stateLbl = (m.triggerType === 'mentor_passing') ? '已逝'
                   : (m.triggerType === 'passing') ? '将逝'
                   : (m.triggerType === 'impeach') ? '被劾'
                   : (m.triggerType === 'retire') ? '致仕' : '';
      inject += '  · 门生 ' + (m.leaderDisciple || '?') + ' 等 ' + m.cosigners.length +
                ' 人·为 ' + m.mentor + (stateLbl ? '(' + stateLbl + ')' : '') + '·' +
                (m.detail || '联名') + '\n';
    });
    inject += '※ 若上述门生为本回合奏疏对象·生成 200-400 字古文·\n';
    inject += '   - type 标 "政务"·subtype 标 "门生上书"·relatedTo 标 mentor 名\n';
    inject += '   - content 援"师恩深"·按 triggerType 调语气·\n';
    inject += '     · mentor_passing / passing·哀痛·"请祭恩师"\n';
    inject += '     · impeach·诚惶·"请陛下明察·恩师无罪"\n';
    inject += '     · retire·恳切·"请恩师起复·朝廷不可无此老臣"\n';
    inject += '   - 结尾"伏请陛下"\n';
    return promptBuf + inject;
  }

  // 暴露
  if (typeof window !== 'undefined') {
    window._kjCheckDiscipleMemorialTriggers = _kjCheckDiscipleMemorialTriggers;
    window._kjConsumeDiscipleMemorialsForAgenda = _kjConsumeDiscipleMemorialsForAgenda;
    window._kjDetectMentorState = _kjDetectMentorState;
    window._kjIsCrossPartyMemorial = _kjIsCrossPartyMemorial;
    window._kjF2InjectMemorialPrompt = _kjF2InjectMemorialPrompt;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      _kjCheckDiscipleMemorialTriggers: _kjCheckDiscipleMemorialTriggers,
      _kjConsumeDiscipleMemorialsForAgenda: _kjConsumeDiscipleMemorialsForAgenda,
      _kjDetectMentorState: _kjDetectMentorState,
      _kjIsCrossPartyMemorial: _kjIsCrossPartyMemorial,
      _kjF2InjectMemorialPrompt: _kjF2InjectMemorialPrompt
    };
  }
})();
