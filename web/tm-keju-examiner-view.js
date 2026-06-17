// tm-keju-examiner-view.js
// C1·主考 4 属性派生 view·从 char 派生主考偏好/严格度/派系倾向。
// 派生不持久化·不加 char schema 字段。
// 零依赖 (运行时依赖 _kjInferLearningTraits·缺时降级返 0 vec)。
// 浏览器 + Node 双兼容·纯函数无副作用 (除 _kjExaminerKeyiCallback 写 P.keju.currentExam.examinerView)

(function () {
  'use strict';

  // --- 党派 → preferContent 硬编 (5-6 党·命中即返) ---
  // 顺序敏感·先匹配的优先 (东林/阉党 不会同时命中·浙楚齐宣昆 同族)
  function _pickPreferContentByParty(party) {
    if (!party || typeof party !== 'string') return null;
    if (/东林/.test(party))                       return 'classics_practical';
    if (/阉党|魏忠贤/.test(party))                return 'eight_legged';
    if (/浙党|楚党|齐党|宣党|昆党/.test(party))   return 'policy';
    if (/道学|理学/.test(party))                  return 'philosophy_zhuxi';
    return null;
  }

  // --- learningTraits 5 维 → preferContent (fallback) ---
  // 选最高维度·tie 时按 priority order·philosophy > statecraft > poetry > confucian/practical
  function _pickPreferContentByTraits(traits) {
    if (!traits || typeof traits !== 'object') return 'classics';
    // priority order·tie 时靠前胜
    var order = [
      ['philosophy', 'philosophy_zhuxi'],
      ['statecraft', 'policy'],
      ['poetry',     'poetry'],
      ['confucian',  'classics'],
      ['practical',  'classics_practical']
    ];
    var maxScore = -1, picked = 'classics';
    for (var i = 0; i < order.length; i++) {
      var dim = order[i][0], label = order[i][1];
      var v = traits[dim] || 0;
      if (v > maxScore) { maxScore = v; picked = label; }
    }
    // 全 0 时·默认 classics
    return maxScore > 0 ? picked : 'classics';
  }

  // --- 1 句话 _summary 派生 ---
  function _buildSummary(dynasty, party, region, strictness, preferContent) {
    var parts = [];
    if (dynasty) parts.push(String(dynasty));
    if (party && party !== '中立' && party !== '无党' && party !== '无党派') {
      parts.push(String(party));
    } else {
      parts.push('无党');
    }
    if (region) parts.push(String(region));
    // 严格度·>=70 严·<=30 宽·中
    var strictLabel = strictness >= 70 ? '严' : strictness <= 30 ? '宽' : '中';
    parts.push(strictLabel);
    // preferContent 简称
    var contentLabel = {
      classics:           '偏经史',
      classics_practical: '偏经世',
      policy:             '偏策论',
      eight_legged:       '偏八股',
      poetry:             '偏诗赋',
      philosophy_zhuxi:   '偏理学'
    }[preferContent] || '偏经史';
    parts.push(contentLabel);
    return parts.join('·');
  }

  /**
   * _kejuExaminerView(ch)
   * 从 char 派生主考 4 属性 view·不持久化。
   *
   * @param {Object} ch·char 对象 (party/wuchang/integrity/birthplace/origin/learning/ambition/loyalty)
   * @returns {Object} { preferContent, preferRegion, strictness, factionBias, _summary }
   */
  function _kejuExaminerView(ch) {
    ch = ch || {};

    // --- 1·preferContent·党派优先·fallback learningTraits ---
    var byParty = _pickPreferContentByParty(ch.party);
    var preferContent;
    if (byParty) {
      preferContent = byParty;
    } else {
      // fallback·派生 _kjInferLearningTraits (缺时返 0 vec)
      var traits;
      try {
        var inferFn = (typeof window !== 'undefined' && window._kjInferLearningTraits) ||
                      (typeof _kjInferLearningTraits === 'function' ? _kjInferLearningTraits : null);
        traits = inferFn ? inferFn(ch.learning || '') :
                 { confucian: 0, statecraft: 0, poetry: 0, philosophy: 0, practical: 0 };
      } catch (e) {
        traits = { confucian: 0, statecraft: 0, poetry: 0, philosophy: 0, practical: 0 };
      }
      preferContent = _pickPreferContentByTraits(traits);
    }

    // --- 2·preferRegion·birthplace 优先·fallback origin ---
    var preferRegion = ch.birthplace || ch.origin || null;

    // --- 3·strictness·integrity 0.6 + wuchang.li 0.4·钳制 0-100 ---
    var integrity = (typeof ch.integrity === 'number') ? ch.integrity : 50;
    var li = (ch.wuchang && typeof ch.wuchang.li === 'number') ? ch.wuchang.li : 50;
    var strictness = Math.min(100, Math.max(0, integrity * 0.6 + li * 0.4));

    // --- 4·factionBias·党派 0.6/0.2 + ambition/200 + loyalty/400·钳制 0-1 ---
    var hasParty = (ch.party && ch.party !== '中立' && ch.party !== '无党派' && ch.party !== '无党');
    var bias = hasParty ? 0.6 : 0.2;
    bias += ((typeof ch.ambition === 'number') ? ch.ambition : 50) / 200;
    bias += ((typeof ch.loyalty === 'number') ? ch.loyalty : 50) / 400;
    // TODO·v7.1·D4 完后·东厂 corruption≥40 × 1.3 加强·此处先不加 D4 hook
    var factionBias = Math.min(1.0, Math.max(0, bias));

    // --- 5·_summary·1 句话 ---
    var dynasty = '';
    try {
      if (typeof P !== 'undefined' && P) dynasty = P.dynasty || P.era || '';
      if (!dynasty && typeof GM !== 'undefined' && GM) dynasty = GM.dynasty || '';
    } catch (e) { dynasty = ''; }
    var summary = _buildSummary(dynasty, ch.party, preferRegion, strictness, preferContent);

    return {
      preferContent:  preferContent,
      preferRegion:   preferRegion,
      strictness:     strictness,
      factionBias:    factionBias,
      _summary:       summary
    };
  }

  /**
   * _kjExaminerKeyiCallback(method, opts)
   * B3 keyi dispatch·examiner_pick 议题通过后·应用 view + 反方党 loyalty-2。
   *
   * @param {string} method·'council' | 'edict' | 'defy'
   * @param {Object} opts·{ topicType, topicData, opposingMinisters, opposingParties, breakdown, support, passed }
   */
  function _kjExaminerKeyiCallback(method, opts) {
    opts = opts || {};
    var data = opts.topicData || {};
    // topicData.candidate·B3 dispatch 携·可能是 ch 对象·或 ch.name·按 C1 plan 接 ch 对象
    var picked = data.candidate;
    if (!picked) {
      console.warn('[C1·_kjExaminerKeyiCallback] topicData.candidate 缺·不应用 view·method=', method);
      return;
    }

    // 派生 view + 持久化到 P.keju.currentExam.examinerView
    var view = _kejuExaminerView(picked);
    try {
      if (typeof P !== 'undefined' && P && P.keju && P.keju.currentExam) {
        P.keju.currentExam.examinerView = view;
      }
    } catch (e) {
      console.warn('[C1] 写 P.keju.currentExam.examinerView 失败·', e && e.message);
    }

    // 后果·C2·picked.party tension+1·走 _kjUpdateFactionTension
    // (无党 / 中立 时跳过·不污染 tension 字典)
    if (picked.party && picked.party !== '中立' && picked.party !== '无党派' && picked.party !== '无党') {
      try {
        var updFn = (typeof window !== 'undefined' && window._kjUpdateFactionTension) ||
                    (typeof _kjUpdateFactionTension === 'function' ? _kjUpdateFactionTension : null);
        if (updFn) {
          updFn({ party: picked.party, delta: +1, reason: '主考钦点' });
        }
      } catch (e) {
        console.warn('[C2] _kjUpdateFactionTension 失败·', e && e.message);
      }
    }

    // 反方党 loyalty-2·走 AffinityMap (现 paradigm·不写 char.loyalty)
    try {
      var ops = opts.opposingMinisters || [];
      if (ops.length && typeof AffinityMap !== 'undefined' && AffinityMap && typeof AffinityMap.add === 'function') {
        var emperor = '';
        try { emperor = (typeof P !== 'undefined' && P && P.playerInfo && P.playerInfo.characterName) || '陛下'; }
        catch (e) { emperor = '陛下'; }
        for (var i = 0; i < ops.length; i++) {
          AffinityMap.add(ops[i], emperor, -2, '主考钦点·反方党不满');
        }
      }
    } catch (e) {
      console.warn('[C1] AffinityMap.add 失败·', e && e.message);
    }

    // 纪事·邸报
    try {
      if (typeof addEB === 'function') {
        addEB('科举', '主考·' + (picked.name || '未名') + '·' + view._summary);
      }
    } catch (e) { /* silent */ }
  }

  // 暴露
  if (typeof window !== 'undefined') {
    window._kejuExaminerView = _kejuExaminerView;
    window._kjExaminerKeyiCallback = _kjExaminerKeyiCallback;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      _kejuExaminerView:        _kejuExaminerView,
      _kjExaminerKeyiCallback:  _kjExaminerKeyiCallback,
      // 测试导出 (内部 helper)
      _pickPreferContentByParty:   _pickPreferContentByParty,
      _pickPreferContentByTraits:  _pickPreferContentByTraits
    };
  }
})();
