// @ts-check
/// <reference path="types.d.ts" />
/**
 * tm-keju-tier.js — KejuTier 数据结构 + 工厂 + migration (v7·Slice B1)
 *
 * 职责·把 P.keju.tiers[] 从"半数据 (name/level/interactive·daysCost 在 stageDurationDays dict)"
 *      升级为"全字段 tier object"·向前看 9 朝代 preset (Slice B2) + 8 阶段引擎驱动。
 *
 * 暴露·TM.Keju.Tier.*  + 全局 alias·_kjMakeTier / _kjValidateTier / _kjUpgradeExamSchema / _kjGetDefaultTiers
 *
 * red line·
 *   - 老存档 currentExam.tiers 升级失败时·保留旧字段 + log warning·绝不破坏存档
 *   - 不动 pickHistoricalCandidates / shiliao / _keyi*
 *   - stageDurationDays 作 backwards-compat alias 保留 (从 tier.daysCost 派生·dict 写入仍生效)
 *
 * Schema·KejuTier (~10 字段)·
 *   {
 *     name:             "县试" | "院试" | "乡试" | "会试" | "殿试" 等·人面字符串
 *     level:            "county"|"prefecture"|"province_pre"|"province"|"national"|"imperial"·机器枚举
 *     interactive:      bool·是否需玩家决策 (true → urgent banner)
 *     desc:             string·1 句简述
 *     daysCost:         number·该 tier 占用的天数 (筛阶段独立累计·与 stageDurationDays dict 双轨)
 *     tierKind:         "selection" | "filter" | "imperial"·选拔/筛减/殿廷三型
 *     examinerLevel:    "county"|"provincial"|"national"|"emperor"·主考品阶
 *     contentType:      "classics" | "policy" | "eight_legged" | "poetry"·考核内容类
 *     passRate:         number·该 tier 通过率 (0-1·历史估算·F 公式可读)
 *     scenarioOverride: object | null·剧本 override 槽 (B2/K2 灌入)
 *   }
 */
(function(global) {
  'use strict';

  // ════════════════════════════════════════════════════════════════
  // §1·默认值常量
  // ════════════════════════════════════════════════════════════════

  // tier level → daysCost 默认 (各 tier 占多少天·base preset·9 朝代可 override)
  var DEFAULT_DAYS_BY_LEVEL = {
    county:       20,
    prefecture:   20,
    province_pre: 20,
    province:     90,
    national:     90,   // 会试 60 + 拟题 30 (撇拟题外·会试 tier 占 60)
    imperial:     45    // 殿试 30 + 拟题 15
  };

  // tier level → tierKind 默认
  var DEFAULT_KIND_BY_LEVEL = {
    county:       'selection',
    prefecture:   'selection',
    province_pre: 'filter',
    province:     'filter',
    national:     'filter',
    imperial:     'imperial'
  };

  // tier level → examinerLevel 默认
  var DEFAULT_EXAMINER_BY_LEVEL = {
    county:       'county',
    prefecture:   'county',
    province_pre: 'provincial',
    province:     'provincial',
    national:     'national',
    imperial:     'emperor'
  };

  // tier level → passRate 默认 (历史估算 1300 年共性)
  var DEFAULT_PASS_RATE_BY_LEVEL = {
    county:       0.30,
    prefecture:   0.25,
    province_pre: 0.20,
    province:     0.05,
    national:     0.10,
    imperial:     1.00   // 殿试不黜·只排名
  };

  // 已知 level 集 (validate 用)
  var KNOWN_LEVELS = [
    'local', 'county', 'prefecture', 'province_pre',
    'province', 'national', 'imperial'
  ];

  // ════════════════════════════════════════════════════════════════
  // §2·工厂 _kjMakeTier
  // ════════════════════════════════════════════════════════════════

  /**
   * 构造一个完整字段的 KejuTier·缺字段填 default·已有字段不覆盖
   * @param {string} name        eg '县试'
   * @param {string} level       eg 'county'
   * @param {boolean} interactive
   * @param {number} daysCost
   * @param {Object} [opts]      可选 override·{ desc, tierKind, examinerLevel, contentType, passRate, scenarioOverride }
   * @returns {Object} 完整 KejuTier
   */
  function _kjMakeTier(name, level, interactive, daysCost, opts) {
    opts = opts || {};
    var lvl = String(level || 'local');
    return {
      name:             String(name || ''),
      level:            lvl,
      interactive:      !!interactive,
      desc:             opts.desc != null ? String(opts.desc) : '',
      daysCost:         (typeof daysCost === 'number' && isFinite(daysCost) && daysCost >= 0)
                          ? daysCost
                          : (DEFAULT_DAYS_BY_LEVEL[lvl] || 30),
      tierKind:         opts.tierKind || DEFAULT_KIND_BY_LEVEL[lvl] || 'selection',
      examinerLevel:    opts.examinerLevel || DEFAULT_EXAMINER_BY_LEVEL[lvl] || 'county',
      contentType:      opts.contentType || 'classics',
      passRate:         (typeof opts.passRate === 'number' && isFinite(opts.passRate))
                          ? opts.passRate
                          : (DEFAULT_PASS_RATE_BY_LEVEL[lvl] != null ? DEFAULT_PASS_RATE_BY_LEVEL[lvl] : 0.20),
      scenarioOverride: opts.scenarioOverride || null
    };
  }

  /**
   * 验证 tier 全字段·缺关键字段 log warning·返 {ok, missing[]}
   */
  function _kjValidateTier(tier) {
    var missing = [];
    if (!tier || typeof tier !== 'object') {
      return { ok: false, missing: ['<tier itself is null/non-object>'] };
    }
    var required = ['name', 'level', 'interactive', 'daysCost', 'tierKind', 'examinerLevel', 'contentType', 'passRate'];
    required.forEach(function(k){
      if (tier[k] == null || tier[k] === '') missing.push(k);
    });
    // level 必须在已知集
    if (tier.level && KNOWN_LEVELS.indexOf(tier.level) < 0) {
      missing.push('level<unknown:' + tier.level + '>');
    }
    if (missing.length) {
      try { console.warn('[keju·tier] validate failed·tier=', tier && tier.name, '·missing=', missing); } catch(_){}
    }
    return { ok: missing.length === 0, missing: missing };
  }

  /**
   * 把"半 tier" (LLM 返的 / 老存档的·只 name/level/interactive) 升级为完整 schema
   * 已经是完整 schema 的·无变化
   */
  function _kjUpgradeTier(partial) {
    if (!partial || typeof partial !== 'object') return null;
    // 已经完整·跳过
    if (partial.daysCost != null && partial.tierKind && partial.examinerLevel) return partial;
    return _kjMakeTier(
      partial.name,
      partial.level,
      partial.interactive,
      partial.daysCost,
      {
        desc:             partial.desc,
        tierKind:         partial.tierKind,
        examinerLevel:    partial.examinerLevel,
        contentType:      partial.contentType,
        passRate:         partial.passRate,
        scenarioOverride: partial.scenarioOverride
      }
    );
  }

  /**
   * tier 数组批量升级
   */
  function _kjUpgradeTiers(tiers) {
    if (!Array.isArray(tiers)) return [];
    return tiers.map(_kjUpgradeTier).filter(function(t){ return !!t; });
  }

  // ════════════════════════════════════════════════════════════════
  // §3·9 朝代 preset _kjGetDefaultTiers
  //    按 web/docs/keju-paradigm-research-v7.md §2 表
  // ════════════════════════════════════════════════════════════════

  function _kjGetDefaultTiers(era) {
    var e = String(era || '');

    // 汉·察举 4 科 (非科举本体·v7 backlog·此处返 stub·上层 isKejuEra=false 不会走 tier 路径)
    if (/汉/.test(e) && !/南汉|北汉|后汉/.test(e)) return [];

    // 魏晋·九品中正 (同上·非科举本体)
    if (/魏|晋/.test(e) && !/北魏/.test(e)) return [];

    // 隋·进士科初设·3 tier (州试 → 礼部 → 殿试·实际隋无定制殿试·此处给 3-tier 形态)
    if (/隋/.test(e)) return [
      _kjMakeTier('州试',  'province',  false, 60, { desc:'地方初选',     contentType:'classics' }),
      _kjMakeTier('省试',  'national',  true,  60, { desc:'礼部主持',     contentType:'classics' }),
      _kjMakeTier('殿试',  'imperial',  true,  30, { desc:'天子亲策',     contentType:'policy'  })
    ];

    // 唐·解试 → 省试 → (吏部释褐)·3 tier·此处殿试归 imperial 代表
    if (/唐/.test(e)) return [
      _kjMakeTier('解试',  'province',  false, 60, { desc:'州府选拔',     contentType:'classics', passRate:0.10 }),
      _kjMakeTier('省试',  'national',  true,  60, { desc:'礼部知贡举',   contentType:'policy',   passRate:0.15 }),
      _kjMakeTier('殿试',  'imperial',  true,  30, { desc:'武则天后定制', contentType:'policy',   passRate:1.00 })
    ];

    // 五代·沿唐 3-tier (制度短乱·此处给 stub 同唐)
    if (/五代/.test(e)) return [
      _kjMakeTier('解试',  'province',  false, 60, { desc:'州府选拔',     contentType:'classics' }),
      _kjMakeTier('省试',  'national',  true,  60, { desc:'礼部',         contentType:'classics' }),
      _kjMakeTier('殿试',  'imperial',  true,  30, { desc:'天子亲策',     contentType:'policy'  })
    ];

    // 辽·部分行科举 (汉人科·非主体)·给 3-tier stub
    if (/辽/.test(e)) return [
      _kjMakeTier('乡贡',  'province',  false, 60, { desc:'汉地选拔',     contentType:'classics' }),
      _kjMakeTier('礼部试','national',  true,  60, { desc:'中央汉科',     contentType:'classics' }),
      _kjMakeTier('殿试',  'imperial',  true,  30, { desc:'天子亲策',     contentType:'policy'  })
    ];

    // 金·汉科 + 女真进士科·3-tier
    if (/金/.test(e)) return [
      _kjMakeTier('乡试',  'province',  false, 60, { desc:'路府选拔',     contentType:'classics' }),
      _kjMakeTier('府试',  'national',  true,  60, { desc:'中央',         contentType:'classics' }),
      _kjMakeTier('殿试',  'imperial',  true,  30, { desc:'天子亲策',     contentType:'policy'  })
    ];

    // 北宋·解试 → 省试 → 殿试·3-tier·北宋"千年龙虎榜"模式
    // 南宋同·宋统一返此 3-tier
    if (/宋/.test(e)) return [
      _kjMakeTier('解试',  'province',  false, 60, { desc:'州军选拔',         contentType:'classics', passRate:0.10 }),
      _kjMakeTier('省试',  'national',  true,  60, { desc:'礼部权知贡举',     contentType:'policy',   passRate:0.20 }),
      _kjMakeTier('殿试',  'imperial',  true,  30, { desc:'天子亲策·不黜',    contentType:'policy',   passRate:1.00 })
    ];

    // 元·乡试 → 会试 → 殿试·3-tier·蒙汉色目南人 4 等差额 (Slice B2 加 ethnicity 限额)
    if (/元/.test(e)) return [
      _kjMakeTier('乡试',  'province',  false, 60, { desc:'行省选拔·四等差额', contentType:'classics', passRate:0.08 }),
      _kjMakeTier('会试',  'national',  true,  60, { desc:'礼部·四等差额',     contentType:'policy',   passRate:0.15 }),
      _kjMakeTier('殿试',  'imperial',  true,  30, { desc:'天子亲策',          contentType:'policy',   passRate:1.00 })
    ];

    // 明·童试 → 府试 → 院试 → 乡试 → 会试 → 殿试·6-tier (preserve 既存 _getDefaultTiers 形态)
    if (/明/.test(e)) return [
      _kjMakeTier('县试',  'county',       false, 20, { desc:'县内初试·童生进取',   contentType:'classics',    passRate:0.30 }),
      _kjMakeTier('府试',  'prefecture',   false, 20, { desc:'府城复试',             contentType:'classics',    passRate:0.25 }),
      _kjMakeTier('院试',  'province_pre', false, 20, { desc:'学政主持·秀才',       contentType:'classics',    passRate:0.20 }),
      _kjMakeTier('乡试',  'province',     false, 90, { desc:'省城举人考·秋闱',     contentType:'eight_legged',passRate:0.05 }),
      _kjMakeTier('会试',  'national',     true,  60, { desc:'礼部主持·玩家可参与', contentType:'eight_legged',passRate:0.10 }),
      _kjMakeTier('殿试',  'imperial',     true,  30, { desc:'天子亲策',             contentType:'policy',      passRate:1.00 })
    ];

    // 清·同明 6-tier·满汉双榜 + 翻译科 (Slice G1 加特科)
    if (/清/.test(e)) return [
      _kjMakeTier('县试',  'county',       false, 20, { desc:'县内初试',             contentType:'classics',    passRate:0.30 }),
      _kjMakeTier('府试',  'prefecture',   false, 20, { desc:'府城复试',             contentType:'classics',    passRate:0.25 }),
      _kjMakeTier('院试',  'province_pre', false, 20, { desc:'学政主持·秀才',       contentType:'classics',    passRate:0.20 }),
      _kjMakeTier('乡试',  'province',     false, 90, { desc:'省城举人考·秋闱',     contentType:'eight_legged',passRate:0.05 }),
      _kjMakeTier('会试',  'national',     true,  60, { desc:'礼部·满汉双榜',       contentType:'eight_legged',passRate:0.10 }),
      _kjMakeTier('殿试',  'imperial',     true,  30, { desc:'天子亲策',             contentType:'policy',      passRate:1.00 })
    ];

    // 默认 fallback·3-tier·local/national/imperial
    return [
      _kjMakeTier('初试',  'local',     false, 60, { desc:'地方选拔',     contentType:'classics' }),
      _kjMakeTier('会试',  'national',  true,  60, { desc:'中央考试',     contentType:'classics' }),
      _kjMakeTier('殿试',  'imperial',  true,  30, { desc:'天子亲策',     contentType:'policy'  })
    ];
  }

  // ════════════════════════════════════════════════════════════════
  // §4·_kjUpgradeExamSchema·老存档 currentExam 升级
  //    v6.5 → v7·补 schema 字段 + tier 数组每项升级
  //    扩展自原 _kejuUpgradeExamSchema (runtime L384)·向后兼容
  // ════════════════════════════════════════════════════════════════

  function _kjUpgradeExamSchema(exam) {
    if (!exam) return;
    try {
      // 老 stage 名映射 (v5 → v5.1)
      if (exam.stage === 'preliminary') exam.stage = 'preliminary_local';

      // 补默认值 (沿用原 _kejuUpgradeExamSchema)
      if (!exam.id) exam.id = 'keju_legacy_' + (exam.startTurn || 0);
      if (!exam.type) exam.type = 'zhengke';
      if (exam.stageElapsedDays == null) exam.stageElapsedDays = 0;
      if (exam.stageStartTurn == null) exam.stageStartTurn = exam.startTurn || (typeof GM !== 'undefined' && GM.turn) || 0;
      if (!exam.launchMethod) exam.launchMethod = 'council';
      if (exam.libuSupport === undefined) exam.libuSupport = null;
      if (!exam.chiefExaminerMemorial) exam.chiefExaminerMemorial = null;
      if (!Array.isArray(exam.subExaminers)) exam.subExaminers = [];
      if (!Array.isArray(exam.huishiTopicCandidates)) exam.huishiTopicCandidates = [];
      if (exam.dianshiDelegate === undefined) exam.dianshiDelegate = null;
      if (!exam.costsPaid) exam.costsPaid = { local:0, provincial:0, central:0 };
      if (exam.costShortfall === undefined) exam.costShortfall = false;
      if (!Array.isArray(exam.gradPool)) exam.gradPool = [];
      if (!Array.isArray(exam.historicalHits)) exam.historicalHits = [];
      if (!exam.examinerSuggestions) exam.examinerSuggestions = {};
      if (exam.finalRanking === undefined) exam.finalRanking = null;

      // v7·tier 数组每项升级·把"半 tier" → 完整 schema
      if (Array.isArray(exam.tiers) && exam.tiers.length) {
        var before = JSON.stringify(exam.tiers).length;
        exam.tiers = _kjUpgradeTiers(exam.tiers);
        var after = JSON.stringify(exam.tiers).length;
        if (after !== before) {
          try { console.info('[keju·tier] upgraded ' + exam.tiers.length + ' tiers in exam=' + exam.id); } catch(_){}
        }
      }
    } catch (e) {
      try { console.warn('[keju·tier] _kjUpgradeExamSchema failed·exam.id=', exam && exam.id, '·err=', e && e.message); } catch(_){}
      // 故意 swallow·保留旧字段不破坏存档
    }
  }

  // ════════════════════════════════════════════════════════════════
  // §5·stage→tier 派生 helper (backwards-compat)
  //    8 阶段引擎 (proposal/preliminary_local/.../finished) → tier index
  //    用于·initKejuSystem 写 stageDurationDays dict 时·从 tier.daysCost 派生
  // ════════════════════════════════════════════════════════════════

  /**
   * 8 阶段 stage 名 → tier 数组 index (按 6-tier 明清布局)
   * 返 -1 表示该 stage 无对应 tier (筹办 / 选考官 / 拟题 等流程性阶段)
   */
  function _kjStageToTierIndex(stage, tiersLen) {
    var len = tiersLen || 6;
    // 6-tier (明清·县/府/院/乡/会/殿)
    if (len >= 6) {
      switch (stage) {
        case 'preliminary_local':      return 2;   // 院试 (含县/府/院)
        case 'preliminary_provincial': return 3;   // 乡试
        case 'huishi':                 return 4;   // 会试
        case 'dianshi':                return 5;   // 殿试
        default:                       return -1;  // proposal / examiner_select / *_draft / finished
      }
    }
    // 3-tier (唐宋元等·解/省/殿)
    if (len === 3) {
      switch (stage) {
        case 'preliminary_local':      return 0;
        case 'preliminary_provincial': return 0;   // 3-tier 无独立乡试·并入解试
        case 'huishi':                 return 1;
        case 'dianshi':                return 2;
        default:                       return -1;
      }
    }
    return -1;
  }

  /**
   * 从 P.keju.tiers 派生 stageDurationDays dict (backwards-compat)
   * 流程性阶段 (proposal/examiner_select/*_draft) 保留原 dict 值·否则从 tier.daysCost 推
   * @param {Array} tiers
   * @param {Object} [existingDict] - 已存在的 dict·会合并保留流程阶段
   * @returns {Object} 完整 stageDurationDays dict
   */
  function _kjDeriveStageDurationDict(tiers, existingDict) {
    var base = existingDict ? Object.assign({}, existingDict) : {};
    // 默认流程性阶段时长 (无 tier 对应·复用 v6.5 默认)
    if (base.proposal == null)        base.proposal = 30;
    if (base.examiner_select == null) base.examiner_select = 30;
    if (base.huishi_draft == null)    base.huishi_draft = 30;
    if (base.dianshi_draft == null)   base.dianshi_draft = 15;
    if (base.finished == null)        base.finished = 0;

    if (Array.isArray(tiers) && tiers.length) {
      var L = tiers.length;
      // 漏斗式 stage 取 tier.daysCost
      var localIdx = _kjStageToTierIndex('preliminary_local', L);
      var provIdx  = _kjStageToTierIndex('preliminary_provincial', L);
      var huishiIdx = _kjStageToTierIndex('huishi', L);
      var dianshiIdx = _kjStageToTierIndex('dianshi', L);

      if (L >= 6 && localIdx >= 0) {
        // 6-tier·preliminary_local = 县+府+院 三 tier 总和
        base.preliminary_local = (tiers[0] && tiers[0].daysCost || 0)
                               + (tiers[1] && tiers[1].daysCost || 0)
                               + (tiers[2] && tiers[2].daysCost || 0);
      } else if (localIdx >= 0 && tiers[localIdx]) {
        base.preliminary_local = tiers[localIdx].daysCost || base.preliminary_local || 60;
      } else if (base.preliminary_local == null) {
        base.preliminary_local = 60;
      }

      if (provIdx >= 0 && tiers[provIdx] && L >= 6) {
        base.preliminary_provincial = tiers[provIdx].daysCost || 90;
      } else if (base.preliminary_provincial == null) {
        base.preliminary_provincial = 90;
      }

      if (huishiIdx >= 0 && tiers[huishiIdx]) {
        base.huishi = tiers[huishiIdx].daysCost || base.huishi || 60;
      } else if (base.huishi == null) {
        base.huishi = 60;
      }

      if (dianshiIdx >= 0 && tiers[dianshiIdx]) {
        base.dianshi = tiers[dianshiIdx].daysCost || base.dianshi || 30;
      } else if (base.dianshi == null) {
        base.dianshi = 30;
      }
    } else {
      // 无 tiers·全用默认
      if (base.preliminary_local == null)      base.preliminary_local = 60;
      if (base.preliminary_provincial == null) base.preliminary_provincial = 90;
      if (base.huishi == null)                 base.huishi = 60;
      if (base.dianshi == null)                base.dianshi = 30;
    }
    return base;
  }

  // ════════════════════════════════════════════════════════════════
  // §6·导出
  // ════════════════════════════════════════════════════════════════

  global.TM = global.TM || {};
  global.TM.Keju = global.TM.Keju || {};
  global.TM.Keju.Tier = {
    makeTier:               _kjMakeTier,
    validateTier:           _kjValidateTier,
    upgradeTier:            _kjUpgradeTier,
    upgradeTiers:           _kjUpgradeTiers,
    upgradeExamSchema:      _kjUpgradeExamSchema,
    getDefaultTiers:        _kjGetDefaultTiers,
    stageToTierIndex:       _kjStageToTierIndex,
    deriveStageDurationDict:_kjDeriveStageDurationDict,
    // 常量 (read-only·测试 / 检视用)
    KNOWN_LEVELS:           KNOWN_LEVELS,
    DEFAULT_DAYS_BY_LEVEL:  DEFAULT_DAYS_BY_LEVEL,
    DEFAULT_KIND_BY_LEVEL:  DEFAULT_KIND_BY_LEVEL,
    DEFAULT_EXAMINER_BY_LEVEL: DEFAULT_EXAMINER_BY_LEVEL,
    DEFAULT_PASS_RATE_BY_LEVEL: DEFAULT_PASS_RATE_BY_LEVEL
  };

  // 全局 alias·便于 runtime 直接调 (沿 _ke* / _kj* 命名约定)
  global._kjMakeTier               = _kjMakeTier;
  global._kjValidateTier           = _kjValidateTier;
  global._kjUpgradeTier            = _kjUpgradeTier;
  global._kjUpgradeTiers           = _kjUpgradeTiers;
  global._kjUpgradeExamSchema      = _kjUpgradeExamSchema;
  global._kjGetDefaultTiers        = _kjGetDefaultTiers;
  global._kjStageToTierIndex       = _kjStageToTierIndex;
  global._kjDeriveStageDurationDict= _kjDeriveStageDurationDict;

  // Node·测试 export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.TM.Keju.Tier;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
