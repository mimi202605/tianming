/**
 * tm-keju-question-ui.js
 * 科举 v7.1·Slice C3·会试拟题 UX·主考偏好 hint
 *
 * 提供·
 *   _kjRenderExaminerHintBar(examiner)  — UI 顶部 hint bar (主考 4 属性 + warning)
 *   _kjCalcTopicAlignment(topic, view)  — 0-100·题目-主考契合度
 *   _kjRenderAlignmentWarning(score)    — alignment <40 时显 warning HTML
 *   _kjOpenLibuKeyi()                    — 召礼部商议 button handler
 *   _kjQuestionReviewKeyiCallback        — keyi question_review 通过 callback
 *
 * red line·
 *   #2 ❌ 绝不改 _kejuGenChiefExaminerMemorial paradigm·只读返回值
 *   #5 ❌ 绝不改半文言风格·UI 文案 only
 *
 * 依赖·
 *   - _kejuExaminerView(ch)         C1·主考 4 属性
 *   - _kjInferLearningTraits(text)  A0.3·5 维派生
 *   - openKeyiSession + proposeKejuPreparation  B3·9 议题路由
 */
(function() {
  'use strict';

  /** preferContent → 5 维主导映射 */
  var PREFER_CONTENT_TO_TRAIT = {
    'classics': 'confucian',
    'classics_practical': 'confucian',  // 兼顾经史与经世·主导仍 confucian
    'policy': 'statecraft',
    'eight_legged': 'confucian',         // 八股本质走经义·偏 confucian
    'poetry': 'poetry',
    'philosophy_zhuxi': 'philosophy'
  };

  var PREFER_CONTENT_DISPLAY = {
    'classics': '经史',
    'classics_practical': '经世致用',
    'policy': '策论',
    'eight_legged': '八股经义',
    'poetry': '诗赋',
    'philosophy_zhuxi': '理学'
  };

  /**
   * _kjCalcTopicAlignment(topic, view) → 0-100
   * 复用 _kjInferLearningTraits·按 view.preferContent 主导维度评分
   */
  function _kjCalcTopicAlignment(topicText, view) {
    if (!topicText || !view) return 50;  // 无题目默中性
    if (typeof _kjInferLearningTraits !== 'function') return 50;
    var traits = _kjInferLearningTraits(topicText);
    var dim = PREFER_CONTENT_TO_TRAIT[view.preferContent] || 'confucian';
    var score = traits[dim] || 0;

    // 兼顾·若 classics_practical·额外加 statecraft 一半
    if (view.preferContent === 'classics_practical') {
      score = Math.min(100, score + (traits.statecraft || 0) * 0.3);
    }
    return Math.round(score);
  }

  /**
   * _kjRenderAlignmentWarning(score, examinerName)
   * <40 错配 warning·40-70 中性·>70 契合·返 HTML 文案 (半文言)
   */
  function _kjRenderAlignmentWarning(score, examinerName) {
    if (score >= 70) {
      return '<div style="color:var(--celadon-400);font-size:0.78rem;margin-top:3px;">✓ 题目契合主考偏好·开榜评价加成</div>';
    } else if (score >= 40) {
      return '<div style="color:var(--txt-d);font-size:0.78rem;margin-top:3px;">○ 题目无明显偏向·中性</div>';
    } else {
      var name = examinerName || '主考';
      return '<div style="color:var(--vermillion-400);font-size:0.78rem;margin-top:3px;">⚠ 题目偏离主考偏好·' + name + '可能私议陛下偏题</div>';
    }
  }

  /**
   * _kjRenderExaminerHintBar(examiner)
   * 顶部 hint bar HTML·_kejuExaminerView 4 属性 + summary
   */
  function _kjRenderExaminerHintBar(examiner) {
    if (!examiner || typeof _kejuExaminerView !== 'function') return '';
    var view;
    try { view = _kejuExaminerView(examiner); }
    catch(e) { console.warn('[C3] examinerView 派生失败', e); return ''; }
    if (!view) return '';

    var preferDisplay = PREFER_CONTENT_DISPLAY[view.preferContent] || view.preferContent;
    var strictnessLabel = view.strictness >= 70 ? '严' : (view.strictness <= 30 ? '宽' : '中');
    var biasLabel = view.factionBias >= 0.6 ? '高·' + (examiner.party || '党争') : (view.factionBias <= 0.3 ? '低' : '中');

    return '<div class="kj-examiner-hint" style="background:linear-gradient(135deg,rgba(184,154,83,0.08),transparent);'
      + 'padding:0.6rem 0.8rem;border-left:3px solid var(--gold-d);border-radius:4px;margin-bottom:0.6rem;font-size:0.82rem;line-height:1.7;">'
      + '<div style="color:var(--gold);font-weight:700;margin-bottom:0.2rem;">📜 主考偏好·' + _esc(examiner.name) + '</div>'
      + '<div style="color:var(--txt-s);">' + _esc(view._summary || '未知') + '</div>'
      + '<div style="color:var(--txt-d);font-size:0.78rem;margin-top:0.2rem;">'
      +   '偏好内容·<strong>' + preferDisplay + '</strong>·'
      +   '偏好籍贯·' + _esc(view.preferRegion || '无') + '·'
      +   '严格度·' + Math.round(view.strictness) + ' (' + strictnessLabel + ')·'
      +   '派系偏向·' + view.factionBias.toFixed(2) + ' (' + biasLabel + ')'
      + '</div>'
      + '</div>';
  }

  /**
   * _kjUpdateAlignmentUI()
   * textarea oninput 时调·实时算 alignment + 更新 warning div
   */
  function _kjUpdateAlignmentUI() {
    if (typeof document === 'undefined') return;  // Node 测试 guard
    var exam = P.keju && P.keju.currentExam;
    if (!exam || !exam.chiefExaminer) return;
    // v7.1·D2·支持·会试 textarea (huishi-topic) + 殿试 textarea (dianshi-question)
    var ta = document.getElementById('huishi-topic') || document.getElementById('dianshi-question');
    var warnDiv = document.getElementById('kj-alignment-warn');
    if (!ta || !warnDiv) return;

    var ch = (typeof findCharByName === 'function') ? findCharByName(exam.chiefExaminer) : null;
    if (!ch) return;
    var view = _kejuExaminerView(ch);
    if (!view) return;

    var score = _kjCalcTopicAlignment(ta.value || '', view);
    exam._topicAlignment = score;  // 持久化·供 generateHuishiResults 读
    warnDiv.innerHTML = _kjRenderAlignmentWarning(score, exam.chiefExaminer);
  }

  /**
   * _kjOpenLibuKeyi() — 召礼部商议 button handler
   * 走 keyi `topicType='question_review'`·走 B3 dispatch·callback 此处实
   */
  function _kjOpenLibuKeyi() {
    var exam = P.keju && P.keju.currentExam;
    if (!exam || !exam.chiefExaminer) {
      if (typeof toast === 'function') toast('请先选主考·再议题目');
      return;
    }
    var ta = document.getElementById('huishi-topic');
    var topicText = (ta && ta.value) || exam.huishiTopic || '';
    if (!topicText.trim()) {
      if (typeof toast === 'function') toast('请先拟题·再议');
      return;
    }
    if (typeof proposeKejuPreparation !== 'function') {
      if (typeof toast === 'function') toast('keyi 路由未载·议题暂不可');
      return;
    }
    proposeKejuPreparation('question_review', {
      examiner: exam.chiefExaminer,
      topic: topicText,
      alignment: exam._topicAlignment || 50
    });
  }

  /**
   * _kjQuestionReviewKeyiCallback(method, opts)
   * B3 dispatch 自动调·议政通过/驳回时应用后果
   */
  function _kjQuestionReviewKeyiCallback(method, opts) {
    var data = (opts && opts.topicData) || {};
    var exam = P.keju && P.keju.currentExam;
    if (!exam) return;

    if (method === 'council' && opts.passed) {
      // 议通过·礼部支持当前题目·alignment 加 10
      exam._topicAlignment = Math.min(100, (exam._topicAlignment || 50) + 10);
      if (typeof toast === 'function') toast('礼部议定·题目妥当·士林无虞');
      if (typeof addEB === 'function') addEB('科举', '礼部议·题目妥当 (alignment+10)');
    } else if (method === 'edict' || method === 'defy') {
      // 强推·不顾礼部·alignment 减 5·勋戚反方党不满
      exam._topicAlignment = Math.max(0, (exam._topicAlignment || 50) - 5);
      if (typeof toast === 'function') toast('陛下强推·礼部抗议·士林侧目');
      if (typeof addEB === 'function') addEB('科举', '强推题目 (alignment-5·礼部抗议)');
    } else {
      if (typeof toast === 'function') toast('议罢·题目未定');
    }

    // 立即刷新 UI (若仍在 huishi stage)
    if (typeof _kjUpdateAlignmentUI === 'function') {
      setTimeout(_kjUpdateAlignmentUI, 100);  // 微延迟·等 keyi modal 关闭
    }
  }

  /**
   * _kjApplyAlignmentEvent(exam, examiner)
   * generateHuishiResults 开榜后调·若 alignment<40 → event spawn + tension/loyalty
   */
  function _kjApplyAlignmentEvent(exam, examiner) {
    if (!exam || !examiner) return;
    var alignment = exam._topicAlignment || 50;
    if (alignment >= 40) return;  // 不触发

    // event spawn (轻量·toast + addEB·event-system 完后改 modal)
    if (typeof toast === 'function') toast('⚠ 考官私议·陛下偏题·' + examiner.name + '不悦');
    if (typeof addEB === 'function') addEB('科举·议', examiner.name + '私议陛下偏题·alignment=' + alignment);

    // tension/loyalty 后果
    if (examiner.party && typeof _kjUpdateFactionTension === 'function') {
      _kjUpdateFactionTension({ party: examiner.party, delta: +1, reason: '考官私议陛下偏题' });
    }
    // 主考 affinity 略降
    if (typeof AffinityMap !== 'undefined' && AffinityMap.add) {
      var playerName = (P.playerInfo && P.playerInfo.characterName) || '陛下';
      AffinityMap.add(examiner.name, playerName, -2, '陛下殿试题不合士林正统');
    }
    // NPC 记忆
    if (typeof NpcMemorySystem !== 'undefined' && NpcMemorySystem.remember) {
      NpcMemorySystem.remember(examiner.name, '陛下殿试出题偏离主考偏好·士林私议', '忧', 6, (P.playerInfo && P.playerInfo.characterName) || '陛下');
    }
    // 持久化 marker·_kejuGenChiefExaminerComments 可读
    exam._alignmentEventFired = true;
  }

  function _esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // 暴露
  if (typeof window !== 'undefined') {
    window._kjCalcTopicAlignment = _kjCalcTopicAlignment;
    window._kjRenderAlignmentWarning = _kjRenderAlignmentWarning;
    window._kjRenderExaminerHintBar = _kjRenderExaminerHintBar;
    window._kjUpdateAlignmentUI = _kjUpdateAlignmentUI;
    window._kjOpenLibuKeyi = _kjOpenLibuKeyi;
    window._kjQuestionReviewKeyiCallback = _kjQuestionReviewKeyiCallback;
    window._kjApplyAlignmentEvent = _kjApplyAlignmentEvent;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      _kjCalcTopicAlignment: _kjCalcTopicAlignment,
      _kjRenderAlignmentWarning: _kjRenderAlignmentWarning,
      _kjRenderExaminerHintBar: _kjRenderExaminerHintBar,
      _kjOpenLibuKeyi: _kjOpenLibuKeyi,
      _kjQuestionReviewKeyiCallback: _kjQuestionReviewKeyiCallback,
      _kjApplyAlignmentEvent: _kjApplyAlignmentEvent
    };
  }
})();
