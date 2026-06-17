/**
 * tm-keju-yanguan-attribution.js
 * v7.1·Slice F4a·言官 attribution 派生 (D1 三维)
 *
 * 派生·非持久化字段·_kjYanguanClassify + _kjYanguanResolveAttribution + _kjYanguanPromptHint
 *
 * 三维·
 *   - mentor·门生于谁 (ch._mentorRef·D5 已 eager 写)
 *   - cohortYear·哪年进士 (ch._cohortYear·D5 已 eager 写)
 *   - school·学派/书院 (ch._schoolAffiliation·可选·暂返 null)
 *
 * red line·
 *   - flag gate·P.conf.useNewKejuD1=false 全 no-op·返 null / ''
 *   - 纯派生·不动 ch schema·不写持久化字段
 *   - 不动 keyi 800 行·不动 chaoyi/tinyi LLM
 *
 * Public API·
 *   _kjYanguanClassify(ch)           → {isYanguan, yanguanType, yanguanRank, mentor, cohortYear, ...} | null
 *   _kjYanguanResolveAttribution(ch) → 加 mentorParty + mentorAlive + mentorTitle + discipleStrength
 *   _kjYanguanPromptHint(ch)         → string·LLM prompt 注入用·flag off 返 ''
 *
 * 依赖·
 *   - D5 ch._mentorRef + ch._cohortYear (eager write)
 *   - F1 _kjGetDiscipleStrength (含衰减)
 *   - findCharByName (resolve mentor party / alive)
 */
(function() {
  'use strict';

  function _isD1Enabled() {
    if (typeof P === 'undefined' || !P || !P.conf) return false;
    return P.conf.useNewKejuD1 !== false; // 默认开·2026-06-15·门生/清议解锁（spawn 有冷却·不刷屏；undefined→on·显式 false 才关）
  }

  /** 言官 classify·非言官返 null */
  function _kjYanguanClassify(ch) {
    if (!ch) return null;
    if (!_isD1Enabled()) return null;
    var title = ch.officialTitle || ch.title || '';
    if (!/御史|给事中|监察/.test(title)) return null;
    return {
      isYanguan: true,
      yanguanType: /都御史|御史/.test(title) ? '御史' : '给事中',
      yanguanRank: /左都|右都|都/.test(title) ? 'high' : 'low',
      mentor: ch._mentorRef || null,
      mentorParty: null,
      cohortYear: ch._cohortYear || null,
      school: ch._schoolAffiliation || null,
      examPath: ch.source === '科举',
      discipleStrength: 0
    };
  }

  /** F4a·resolve attribution·加 mentor 状态 + strength */
  function _kjYanguanResolveAttribution(ch) {
    var attr = _kjYanguanClassify(ch);
    if (!attr || !attr.mentor) return attr;
    if (typeof findCharByName === 'function') {
      var mentor = findCharByName(attr.mentor);
      if (mentor) {
        attr.mentorParty = mentor.party || null;
        attr.mentorAlive = mentor.alive !== false;
        attr.mentorTitle = mentor.officialTitle || mentor.title || '';
      }
    }
    if (typeof _kjGetDiscipleStrength === 'function') {
      attr.discipleStrength = _kjGetDiscipleStrength(attr.mentor, ch.name);
    }
    return attr;
  }

  /** F4b 用·派生 LLM prompt 注入·返 string·flag off 时返 '' */
  function _kjYanguanPromptHint(ch) {
    if (!_isD1Enabled()) return '';
    var attr = _kjYanguanResolveAttribution(ch);
    if (!attr || !attr.isYanguan || !attr.mentor) return '';
    var hint = '';
    if (attr.mentorAlive) {
      hint = '· 此言官出身·' + (attr.cohortYear ? attr.cohortYear + '年' : '') +
        '进士·门生于' + attr.mentor + ' (' + (attr.mentorParty || '无党') + ')·强度 ' + attr.discipleStrength +
        '·清议倾向跟恩师党·若议题涉党争·必出言相向';
    } else {
      hint = '· 此言官·门生于' + attr.mentor + ' (已逝)·因师义务·清议守恩师遗志';
    }
    return hint;
  }

  // 暴露
  if (typeof window !== 'undefined') {
    window._kjYanguanClassify = _kjYanguanClassify;
    window._kjYanguanResolveAttribution = _kjYanguanResolveAttribution;
    window._kjYanguanPromptHint = _kjYanguanPromptHint;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      _kjYanguanClassify: _kjYanguanClassify,
      _kjYanguanResolveAttribution: _kjYanguanResolveAttribution,
      _kjYanguanPromptHint: _kjYanguanPromptHint
    };
  }
})();
