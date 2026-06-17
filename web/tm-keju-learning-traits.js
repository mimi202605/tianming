// tm-keju-learning-traits.js
// 从 ch.learning 字符串 (中文·40-200 字) 派生 5 维评分。
// 零依赖·浏览器 + Node 双兼容·纯函数无副作用。

(function () {
  'use strict';

  // 每维度 6-10 个关键词·命中 +20·上限 100·允许多维度共享字符
  var TRAIT_KEYWORDS = {
    confucian:  ['经', '史', '春秋', '礼', '孟', '论语', '尚书', '诗经', '五经', '儒'],
    statecraft: ['政', '务', '财', '民', '吏', '治', '钱粮', '经世', '致用', '漕'],
    poetry:     ['诗', '赋', '词', '律', '文', '咏', '七律', '五言', '骈', '辞'],
    philosophy: ['理', '性', '心', '道', '义', '朱', '程', '王阳明', '衍义', '心学'],
    practical:  ['算', '水', '医', '工', '历', '数', '水利', '治河', '天文', '历法']
  };

  function _kjInferLearningTraits(learningText) {
    var result = { confucian: 0, statecraft: 0, poetry: 0, philosophy: 0, practical: 0 };
    if (typeof learningText !== 'string' || !learningText) return result;

    for (var dim in TRAIT_KEYWORDS) {
      if (!Object.prototype.hasOwnProperty.call(TRAIT_KEYWORDS, dim)) continue;
      var kws = TRAIT_KEYWORDS[dim];
      var score = 0;
      for (var i = 0; i < kws.length; i++) {
        if (learningText.indexOf(kws[i]) !== -1) {
          score += 20;
          if (score >= 100) { score = 100; break; }
        }
      }
      result[dim] = score;
    }
    return result;
  }

  if (typeof window !== 'undefined') {
    window._kjInferLearningTraits = _kjInferLearningTraits;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { _kjInferLearningTraits: _kjInferLearningTraits };
  }
})();

/* ===== smoke 测试样例 =====
 * 1. "熟读经史，精通《春秋》《尚书》，宗朱子"
 *    期望主导·confucian (经+史+春秋+尚书=80) + philosophy (朱=20·受"宗朱"影响为低)
 * 2. "深谙经世致用之道，长于吏事钱粮"
 *    期望主导·statecraft (经世+致用+吏+钱粮+财? = 80+)
 * 3. "工诗善赋，擅七律五言"
 *    期望主导·poetry (诗+赋+律+七律+五言+文 ≈ 100)
 * 4. "研朱子理学，著《大学衍义》"
 *    期望主导·philosophy (朱+理+衍义+义 = 80) + confucian (子? 无·~0)
 * 5. "通算学水利，治河有功"
 *    期望主导·practical (算+水+水利+治河 = 80) + statecraft (治 = 20)
 * =========================== */
