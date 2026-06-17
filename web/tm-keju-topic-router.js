/**
 * tm-keju-topic-router.js
 * 科举 v7.1·Slice B3·keyi topicType 路由
 *
 * 把 keyi (科议) 从 "hardcode 1 topic (筹办科举)" 升级为 "9 议题路由"·
 * 让后续 slice 的议政走同一套 keyi paradigm·复用 800 行 paradigm·**绝不重写 keyi**。
 *
 * 9 议题·
 *   activation       — 制度激活        (A1)
 *   kaike            — 开科决策        (B3 现)
 *   examiner_pick    — 主考钦点        (C1)
 *   question_review  — 题目商议        (C3)
 *   scandal          — 主考弊案        (J4)
 *   reform           — 科举改革        (J3)
 *   allocation       — 进士授官        (E3)
 *   school_ban       — 禁书院          (H3)
 *   eunuch_check     — 宦官制衡        (I2)
 *
 * 用法·
 *   openKeyiSession({ topicType: 'examiner_pick', topicData: { candidates: [...] } })
 *
 * callback·后续 slice 完成时·改对应 default 实现·B3 阶段全 stub。
 */
(function() {
  'use strict';

  /**
   * KEYI_TOPIC_TYPES·9 议题表
   * 每议题·
   *   title          UI 显示标题 (派生)
   *   shortLabel     短标签 (持久化 record.topic 用)
   *   threshold      表决阈值 (0-1·council 路径需达此)
   *   callback       表决通过后的 callback 函数名 (window 上)·B3 阶段全 stub
   *   description    供 LLM prompt 增强用 (议政时背景)
   *   sliceOwner     表示哪个 slice 完成后改 callback (供 grep)
   */
  function _kjTopicShortText(v, max) {
    var s = (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim();
    max = max || 24;
    return s.length > max ? s.slice(0, max) + '…' : s;
  }

  function _kjSummarizeParadigmDiff(diff) {
    if (!diff || typeof diff !== 'object') return '';
    var keys = Object.keys(diff).filter(function(k) { return diff[k] != null; }).slice(0, 3);
    return keys.join('、');
  }

  function _kjReformTopicTitle(td) {
    td = td || {};
    var label = td.topic || td.theme || td.l10PresetCanonicalName || _kjSummarizeParadigmDiff(td.paradigmDiff);
    return '议·科举改革' + (label ? '·' + _kjTopicShortText(label, 28) : '');
  }

  var KEYI_TOPIC_TYPES = {
    activation: {
      title: function(td) { return '议·开科取士制度' + (td && td.mode === 'reform' ? '改革' : ''); },
      shortLabel: '科议·制度激活',
      threshold: 0.5,
      callback: '_kjActivationKeyiCallback',  // A1 接·B3 stub
      description: '本议商议是否启用科举制度·5 档 outcome (full/limited/delay/reform/reject)·影响士林归心',
      sliceOwner: 'A1'
    },
    kaike: {
      title: function(td) { return '议·筹办' + (td && td.examType === 'enke' ? '恩科' : '科举'); },
      shortLabel: '科议·筹办',
      threshold: 0.5,
      callback: 'startKejuByMethod',  // B3 现·复用现 paradigm
      description: '本议商议是否筹办本次科举·council/edict/defy 三路径·council 通过无惩罚',
      sliceOwner: 'B3'
    },
    examiner_pick: {
      title: function(td) { return '议·钦点主考' + (td && td.candidate ? '·' + td.candidate : ''); },
      shortLabel: '科议·主考钦点',
      threshold: 0.4,
      callback: '_kjExaminerKeyiCallback',  // C1 接
      description: '本议商议主考人选·主考 4 属性 (preferContent/preferRegion/strictness/factionBias) 影响录取',
      sliceOwner: 'C1'
    },
    question_review: {
      title: function(td) { return '议·会试题目' + (td && td.examiner ? '·' + td.examiner + '所拟' : ''); },
      shortLabel: '科议·题目',
      threshold: 0.6,
      callback: '_kjQuestionReviewKeyiCallback',  // C3 接
      description: '本议商议会试题目·题目-主考契合度影响开榜评价',
      sliceOwner: 'C3'
    },
    scandal: {
      title: function(td) { return '议·主考弊案' + (td && td.accused ? '·' + td.accused : ''); },
      shortLabel: '科议·弊案',
      threshold: 0.5,
      callback: '_kjScandalKeyiCallback',  // J4 接
      description: '本议商议主考弊案·investigate/dismiss/protect 三路径·涉及党争',
      sliceOwner: 'J4'
    },
    reform: {
      title: _kjReformTopicTitle,
      shortLabel: '科议·改革',
      threshold: 0.6,
      callback: '_kjReformKeyiCallback',  // J3 接
      description: '本议商议玩家提交的科举改革范式调整·依 paradigmDiff 与廷前奏议决定推行/暂缓/强推',
      sliceOwner: 'J3'
    },
    allocation: {
      title: function(td) { return '议·进士授官'; },
      shortLabel: '科议·授官',
      threshold: 0.4,
      callback: '_kjAllocationKeyiCallback',  // E3 接
      description: '本议商议进士授官分配·朝代联动 (明清翰林·唐释褐试·宋直授·元四等)',
      sliceOwner: 'E3'
    },
    school_ban: {
      title: function(td) { return '议·' + (td && td.school ? td.school : '书院') + '存废'; },
      shortLabel: '科议·禁书院',
      threshold: 0.7,
      callback: '_kjSchoolBanKeyiCallback',  // H3 接
      description: '本议商议是否禁书院·禁/容/扶 三路径·涉及私学 vs 官学·东林党根源',
      sliceOwner: 'H3'
    },
    eunuch_check: {
      title: function(td) { return '议·宦官' + (td && td.action ? td.action : '制衡'); },
      shortLabel: '科议·宦官',
      threshold: 0.6,
      callback: '_kjEunuchCheckKeyiCallback',  // I2 接
      description: '本议商议宦官干预·制衡/限制/放任 三路径·明清专有·涉及司礼监批红/东厂阅卷',
      sliceOwner: 'I2'
    },
    special_exam: {
      title: function(td) { return '议·' + (({ enke:'恩科', wuju:'武举', fanyi:'翻译科', tongzi:'童子科' })[td && td.examType] || '特科'); },
      shortLabel: '科议·特科',
      threshold: 0.4,
      callback: '_kjG2SpecialExamKeyiCallback',  // G2 step a 接
      description: '本议商议特科开闭·允/驳/推迟·恩科政治表态·武举选将·翻译开通·童子荐贤',
      sliceOwner: 'G2'
    }
  };

  /**
   * _kjResolveTopic(topicType, topicData)
   * 返完整议题解析·title 派生·threshold·callback (查 window·缺则 stub)
   */
  function _kjResolveTopic(topicType, topicData) {
    var def = KEYI_TOPIC_TYPES[topicType];
    if (!def) {
      console.warn('[keyi·B3] 未知 topicType:', topicType, '·fallback kaike');
      def = KEYI_TOPIC_TYPES.kaike;
      topicType = 'kaike';
    }

    var title = '议';
    try {
      title = typeof def.title === 'function' ? def.title(topicData || {}) : def.title;
    } catch(e) {
      console.warn('[keyi·B3] title 派生失败·fallback shortLabel·err=', e && e.message);
      title = def.shortLabel || '议';
    }

    // callback 查 window·若未定义·走 stub (log warn + 不阻塞 keyi)
    var callbackFn = null;
    if (typeof window !== 'undefined' && typeof window[def.callback] === 'function') {
      callbackFn = window[def.callback];
    } else {
      callbackFn = function _kjStubCallback(method, opts) {
        console.warn('[keyi·B3·stub] callback', def.callback, '(slice', def.sliceOwner, '未实现)·method=', method, '·opts=', opts);
        // 不阻塞·不抛错·让 keyi 跑完
      };
      callbackFn._isStub = true;
      callbackFn._sliceOwner = def.sliceOwner;
    }

    return {
      topicType: topicType,
      title: title,
      shortLabel: def.shortLabel,
      threshold: def.threshold,
      description: def.description,
      callback: callbackFn,
      callbackName: def.callback,
      sliceOwner: def.sliceOwner
    };
  }

  /**
   * _kjListTopicTypes()·返 9 议题列表 (供 editor / 诊断 UI 用)
   */
  function _kjListTopicTypes() {
    return Object.keys(KEYI_TOPIC_TYPES);
  }

  /**
   * _kjTopicSummary(topicType)·返 1 行摘要·诊断用
   */
  function _kjTopicSummary(topicType) {
    var def = KEYI_TOPIC_TYPES[topicType];
    if (!def) return null;
    var hasImpl = (typeof window !== 'undefined' && typeof window[def.callback] === 'function');
    return {
      type: topicType,
      label: def.shortLabel,
      threshold: def.threshold,
      callback: def.callback,
      slice: def.sliceOwner,
      implemented: hasImpl
    };
  }

  // 暴露
  if (typeof window !== 'undefined') {
    window._kjResolveTopic = _kjResolveTopic;
    window._kjListTopicTypes = _kjListTopicTypes;
    window._kjTopicSummary = _kjTopicSummary;
    window.KEYI_TOPIC_TYPES = KEYI_TOPIC_TYPES;  // 诊断用
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      _kjResolveTopic: _kjResolveTopic,
      _kjListTopicTypes: _kjListTopicTypes,
      _kjTopicSummary: _kjTopicSummary,
      KEYI_TOPIC_TYPES: KEYI_TOPIC_TYPES
    };
  }
})();
