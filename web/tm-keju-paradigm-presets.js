// @ts-check
/// <reference path="types.d.ts" />
/**
 * tm-keju-paradigm-presets.js — 9 朝代 paradigm-specific 字段 preset (Stage 2·L1)
 *
 * 职责·提供 paradigm-specific 字段 (subjects / ceremony / penalties / language / ideology)
 *      base 字段 (era / system / tiers / specialExamCalendar / schoolNetworkInit / eunuchInterferenceInit / discipleGraphSeed)
 *      复用 tm-keju-presets.js (_kjGetPresetByEra)·避免 duplication
 *
 * 暴露·_kjpGetParadigmAddonByEra(era)·返 paradigm-specific 字段 object
 *      _kjpListAllParadigmAddons()·返全 9 朝代 addon
 *
 * red line·
 *   - 不重复 tm-keju-presets.js 已有字段 (tiers / specialExamCalendar / etc.)
 *   - subjects ideology 4 类·traditional / reformist / practical / modern
 *   - subjects weight 总和 ≤ 100 (validated)
 *   - subject id immutable·改革可改 name·不可改 id
 *   - 4 新维度初始值依 keju-paradigm-research-v7.md
 *
 * Schema·见 web/docs/keju-stage2-plan.md §7.1
 */
(function(global) {
  'use strict';

  // ════════════════════════════════════════════════════════════════
  // §1·9 朝代 paradigm addon·按朝代差异化
  //    每函数返 paradigm-specific 字段 object (跟 base preset merge)
  // ════════════════════════════════════════════════════════════════

  /**
   * 汉·察举 4 科·主考非"考试"是"举荐"
   * 史源·两汉书·察举孝廉 / 茂才 / 贤良方正 / 明经
   */
  function _addonHan() {
    return {
      subjects: [
        { id: 'xiaolian',    name: '孝廉',   weight: 40, ideology: 'traditional', format: '州郡荐举·三公审议', maxScore: 100 },
        { id: 'maocai',      name: '茂才',   weight: 25, ideology: 'traditional', format: '州牧岁举',           maxScore: 100 },
        { id: 'xianliang',   name: '贤良方正', weight: 20, ideology: 'traditional', format: '诏举·策问',         maxScore: 100 },
        { id: 'mingjing',    name: '明经',   weight: 15, ideology: 'traditional', format: '通经义',             maxScore: 100 }
      ],
      examInterval: 1,                            // 岁举·每年
      retakePolicy: 'unlimited',
      candidateRules: {
        excludedClasses: ['倡优', '商贾子', '罪人'],
        requirePrefecture: false,                 // 察举不要求户籍
        requireRecommendation: true,              // 必须荐举
        minAge: 20, maxAge: 60,
        allowForeigner: false,
        allowMinority: false,
        feeReimbursement: 'state_subsidy'         // 州郡资助
      },
      examinerRules: {
        type: ['scholar'],                        // 主考是州牧 / 三公
        partyQuota: null,
        minYears: 15,
        avoidanceRules: {
          avoid_kin: false,                       // 汉代避亲不严
          avoid_native: false,
          avoid_disciple: false,
          avoid_recent: false,
          avoid_party: false,
          avoid_age: false
        },
        blindScoring: false,                      // 无糊名 (宋以后立)
        blindCopying: false,
        inspectionLevel: 'low',
        mentorBondStrength: 'strong',             // 门生故吏遍天下
        leakPenalty: 'demote'
      },
      quota: {
        total: 200,
        ratios: {
          geo:       { enabled: true,  strategy: 'by_prefecture', values: {}, strictness: 'soft' },
          class:     { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          party:     { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          prefecture:{ enabled: true,  strategy: 'by_prefecture', values: {}, strictness: 'soft' },
          minority:  { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' }
        }
      },
      rankingRule: 'by_origin',                   // 按出身
      allocationRules: {
        firstClass:  { count:1,  positions:['博士', '议郎'],                    ranks:{ default:'六百石' }, privileges:{} },
        secondClass: { count:20, positions:['郎中', '中郎'],                    ranks:{ default:'四百石' }, privileges:{} },
        thirdClass:  { count:179, positions:['地方掾史', '县令'],               ranks:{ default:'三百石' }, privileges:{} },
        waitingYears: 1,
        imperialReviewRequired: false,
        posthumousAdjustment: false
      },
      graduateTitle: '孝廉',
      cohortBondStrength: 'strong',
      mentorLineage: true,
      schoolIntegration: 'required',              // 必入太学
      taxPrivilege: { jinshi: false, juren: false, xiucai: false },  // 汉无三级身份免税
      shadow: 'high',                             // 任子制·官秩二千石可保子弟
      clanPrivilege: true,
      ceremony: {
        palaceTest: '诏对',
        rosterRelease: '黄牒',
        flowerRiding: false,
        nameStele: false,
        bondingBanquet: false,
        kowtowRound: 5,
        customRituals: ['对策', '射策']
      },
      penalties: {
        cheating: 'demote', leak: 'banish', taboo: 'demote', bribery: 'individual'
      },
      language: 'classical_chinese',
      ideology: 'traditional'
    };
  }

  /**
   * 魏晋·九品中正·非"考"·中正官评品
   */
  function _addonWeijin() {
    return {
      subjects: [
        { id: 'jiupin',   name: '品评',   weight: 80, ideology: 'traditional', format: '中正官评',     maxScore: 100 },
        { id: 'qingtan',  name: '清谈',   weight: 20, ideology: 'traditional', format: '玄理对辩',     maxScore: 100 }
      ],
      examInterval: 0,                            // 无定期
      retakePolicy: 'unlimited',
      candidateRules: {
        excludedClasses: ['寒门', '庶族', '倡优'],
        requirePrefecture: true,
        requireRecommendation: true,
        minAge: 18, maxAge: 70,
        allowForeigner: false,
        allowMinority: false,
        feeReimbursement: 'self'
      },
      examinerRules: {
        type: ['scholar', 'aristocrat'],
        partyQuota: null,
        minYears: 20,
        avoidanceRules: {
          avoid_kin: false, avoid_native: false, avoid_disciple: false,
          avoid_recent: false, avoid_party: false, avoid_age: false
        },
        blindScoring: false,
        blindCopying: false,
        inspectionLevel: 'low',
        mentorBondStrength: 'strong',
        leakPenalty: 'demote'
      },
      quota: {
        total: 100,
        ratios: {
          geo:       { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          class:     { enabled: true,  strategy: 'clan_only', values: { 门阀: 100 }, strictness: 'strict' },  // 上品无寒门
          party:     { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          prefecture:{ enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          minority:  { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' }
        }
      },
      rankingRule: 'by_origin',
      allocationRules: {
        firstClass:  { count:9,  positions:['上品官'],   ranks:{ default:'一品' }, privileges:{} },
        secondClass: { count:27, positions:['中品官'],   ranks:{ default:'三品' }, privileges:{} },
        thirdClass:  { count:64, positions:['下品官'],   ranks:{ default:'六品' }, privileges:{} },
        waitingYears: 0,
        imperialReviewRequired: false,
        posthumousAdjustment: false
      },
      graduateTitle: '士',
      cohortBondStrength: 'weak',                 // 门阀靠血统·非门生关系
      mentorLineage: false,
      schoolIntegration: 'none',
      taxPrivilege: { jinshi: false, juren: false, xiucai: false },
      shadow: 'high',
      clanPrivilege: true,                        // 门阀世袭
      ceremony: {
        palaceTest: '无', rosterRelease: '中正品状',
        flowerRiding: false, nameStele: false, bondingBanquet: false,
        kowtowRound: 0, customRituals: ['玄谈雅集']
      },
      penalties: {
        cheating: 'demote', leak: 'demote', taboo: 'demote', bribery: 'individual'
      },
      language: 'classical_chinese',
      ideology: 'traditional'
    };
  }

  /**
   * 隋·进士科初设·587/605
   */
  function _addonSui() {
    return {
      subjects: [
        { id: 'jinshi',   name: '进士',   weight: 60, ideology: 'traditional', format: '试策',         maxScore: 100 },
        { id: 'mingjing', name: '明经',   weight: 30, ideology: 'traditional', format: '通经义',       maxScore: 100 },
        { id: 'xiucai',   name: '秀才',   weight: 10, ideology: 'traditional', format: '方略策',       maxScore: 100 }
      ],
      examInterval: 0,                            // 不定期·制度初创
      retakePolicy: 'unlimited',
      candidateRules: {
        excludedClasses: ['僧道', '商贾子', '倡优', '罪人'],
        requirePrefecture: true,
        requireRecommendation: false,
        minAge: 18, maxAge: 60,
        allowForeigner: false,
        allowMinority: true,                      // 隋唐 胡人可考
        feeReimbursement: 'self'
      },
      examinerRules: {
        type: ['scholar'],
        partyQuota: null,
        minYears: 10,
        avoidanceRules: {
          avoid_kin: false, avoid_native: false, avoid_disciple: false,
          avoid_recent: false, avoid_party: false, avoid_age: false
        },
        blindScoring: false,
        blindCopying: false,
        inspectionLevel: 'medium',
        mentorBondStrength: 'strong',
        leakPenalty: 'banish'
      },
      quota: {
        total: 30,
        ratios: {
          geo:       { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          class:     { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          party:     { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          prefecture:{ enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          minority:  { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' }
        }
      },
      rankingRule: 'by_score',
      allocationRules: {
        firstClass:  { count:1,  positions:['秘书省'],         ranks:{ default:'正九品上' }, privileges:{} },
        secondClass: { count:10, positions:['吏部'],           ranks:{ default:'从九品上' }, privileges:{} },
        thirdClass:  { count:19, positions:['地方'],           ranks:{ default:'从九品下' }, privileges:{} },
        waitingYears: 2,
        imperialReviewRequired: true,
        posthumousAdjustment: false
      },
      graduateTitle: '进士',
      cohortBondStrength: 'strong',
      mentorLineage: true,
      schoolIntegration: 'optional',
      taxPrivilege: { jinshi: true, juren: false, xiucai: false },
      shadow: 'low',
      clanPrivilege: false,
      ceremony: {
        palaceTest: '殿试·天子亲策', rosterRelease: '黄榜',
        flowerRiding: false,                      // 簪花跨马·宋立
        nameStele: false,                         // 进士题名碑·唐末立
        bondingBanquet: true,
        kowtowRound: 5,
        customRituals: ['谒主考']
      },
      penalties: {
        cheating: 'banish', leak: 'death', taboo: 'demote', bribery: 'kin_punishment'
      },
      language: 'classical_chinese',
      ideology: 'traditional'
    };
  }

  /**
   * 唐·进士 + 明经 + 明法 + 明算·多科并设·武举 702 立
   */
  function _addonTang() {
    return {
      subjects: [
        { id: 'jinshi',   name: '进士',   weight: 40, ideology: 'traditional', format: '诗赋 + 策',     maxScore: 100 },
        { id: 'mingjing', name: '明经',   weight: 35, ideology: 'traditional', format: '帖经 + 墨义',   maxScore: 100 },
        { id: 'mingfa',   name: '明法',   weight: 10, ideology: 'practical',   format: '律令策',         maxScore: 100 },
        { id: 'mingsuan', name: '明算',   weight: 10, ideology: 'practical',   format: '九章算术',       maxScore: 100 },
        { id: 'mingzi',   name: '明字',   weight: 5,  ideology: 'practical',   format: '说文解字',       maxScore: 100 }
      ],
      examInterval: 1,                            // 唐·岁举
      retakePolicy: 'unlimited',
      candidateRules: {
        excludedClasses: ['僧道', '商贾子', '倡优', '罪人'],
        requirePrefecture: true,
        requireRecommendation: false,
        minAge: 18, maxAge: 60,
        allowForeigner: true,                     // 宾贡科·新罗 / 渤海 / 大食可考
        allowMinority: true,
        feeReimbursement: 'self'
      },
      examinerRules: {
        type: ['scholar'],
        partyQuota: null,
        minYears: 10,
        avoidanceRules: {
          avoid_kin: false, avoid_native: false, avoid_disciple: false,
          avoid_recent: false, avoid_party: false, avoid_age: false
        },
        blindScoring: false,                      // 唐主考可见考生·主考偏好烈
        blindCopying: false,
        inspectionLevel: 'medium',
        mentorBondStrength: 'strong',             // 唐"门生主考"关系极强·见牛李党争
        leakPenalty: 'banish'
      },
      quota: {
        total: 30,
        ratios: {
          geo:       { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          class:     { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          party:     { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          prefecture:{ enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          minority:  { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' }
        }
      },
      rankingRule: 'by_score',
      allocationRules: {
        firstClass:  { count:1,  positions:['翰林'],     ranks:{ default:'从九品下' }, privileges:{ 御赐袍服:false } },
        secondClass: { count:10, positions:['秘书省'],   ranks:{ default:'从九品下' }, privileges:{} },
        thirdClass:  { count:19, positions:['地方'],     ranks:{ default:'流外' },    privileges:{} },
        waitingYears: 3,
        imperialReviewRequired: true,
        posthumousAdjustment: false
      },
      graduateTitle: '进士',
      cohortBondStrength: 'strong',
      mentorLineage: true,
      schoolIntegration: 'optional',
      taxPrivilege: { jinshi: true, juren: false, xiucai: false },
      shadow: 'high',                             // 唐宗室 / 勋贵荫子盛
      clanPrivilege: false,
      ceremony: {
        palaceTest: '殿试·武则天立·天子御策',
        rosterRelease: '黄榜·门生谢主考',
        flowerRiding: false, nameStele: true,    // 进士题名碑·唐立 (慈恩塔)
        bondingBanquet: true, kowtowRound: 9,
        customRituals: ['雁塔题名', '曲江宴']
      },
      penalties: {
        cheating: 'banish', leak: 'death', taboo: 'demote', bribery: 'kin_punishment'
      },
      language: 'classical_chinese',
      ideology: 'traditional'
    };
  }

  /**
   * 北宋·糊名 992·誊录 1005·三年一科 1065·进士盛
   */
  function _addonBeisong() {
    return {
      subjects: [
        { id: 'jinshi',   name: '进士',   weight: 50, ideology: 'traditional', format: '策论 + 诗赋',   maxScore: 100 },
        { id: 'jingyi',   name: '经义',   weight: 30, ideology: 'reformist',   format: '王安石新义',     maxScore: 100 },
        { id: 'shifu',    name: '诗赋',   weight: 20, ideology: 'traditional', format: '律诗·赋',       maxScore: 100 }
      ],
      examInterval: 3,                            // 三年一科·1065 立
      retakePolicy: 'allow_3x',
      candidateRules: {
        excludedClasses: ['僧道', '商贾子', '倡优', '罪人'],
        requirePrefecture: true,
        requireRecommendation: false,
        minAge: 15, maxAge: 70,                   // 宋宽·年长可考
        allowForeigner: false,
        allowMinority: true,
        feeReimbursement: 'state_subsidy'         // 宋·州县资助贫寒
      },
      examinerRules: {
        type: ['scholar'],
        partyQuota: null,
        minYears: 10,
        avoidanceRules: {
          avoid_kin: true,                        // 避亲·宋立
          avoid_native: false,
          avoid_disciple: false,
          avoid_recent: false, avoid_party: false, avoid_age: false
        },
        blindScoring: true,                       // 糊名·992 (淳化三年)
        blindCopying: true,                       // 誊录·1005 (景德二年)
        inspectionLevel: 'high',                  // 监临严
        mentorBondStrength: 'weak',               // 宋糊名后·主考门生关系弱
        leakPenalty: 'death'
      },
      quota: {
        total: 300,                               // 北宋取士盛·一榜 200-400
        ratios: {
          geo:       { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          class:     { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          party:     { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          prefecture:{ enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          minority:  { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' }
        }
      },
      rankingRule: 'by_score',
      allocationRules: {
        firstClass:  { count:3,  positions:['翰林', '集贤院'], ranks:{ 状元:'将作监丞', 榜眼:'大理评事', 探花:'大理评事' }, privileges:{ 御赐袍服:true, 跨马游街:false, 题名碑:true } },
        secondClass: { count:50, positions:['六部', '州县'],   ranks:{ default:'通直郎' }, privileges:{} },
        thirdClass:  { count:247, positions:['县丞', '主薄'],  ranks:{ default:'承事郎' }, privileges:{} },
        waitingYears: 1,
        imperialReviewRequired: true,
        posthumousAdjustment: false
      },
      graduateTitle: '进士',
      cohortBondStrength: 'strong',
      mentorLineage: true,
      schoolIntegration: 'optional',
      taxPrivilege: { jinshi: true, juren: true, xiucai: false },  // 宋立举人 / 进士免赋
      shadow: 'low',                              // 宋抑制荫子
      clanPrivilege: false,
      ceremony: {
        palaceTest: '殿试·天子亲策', rosterRelease: '唱名传胪',
        flowerRiding: true,                       // 簪花跨马·宋立
        nameStele: true, bondingBanquet: true, kowtowRound: 9,
        customRituals: ['唱名', '簪花', '跨马', '琼林宴']
      },
      penalties: {
        cheating: 'banish', leak: 'death', taboo: 'demote', bribery: 'kin_punishment'
      },
      language: 'classical_chinese',
      ideology: 'traditional'
    };
  }

  /**
   * 南宋·朱熹理学官学化·1190+·余同北宋
   */
  function _addonNansong() {
    var a = _addonBeisong();
    a.subjects = [
      { id: 'jinshi',  name: '进士', weight: 50, ideology: 'traditional', format: '策论',           maxScore: 100 },
      { id: 'lixue',   name: '理学', weight: 30, ideology: 'traditional', format: '朱子四书集注',   maxScore: 100 },  // 朱熹理学官学化
      { id: 'jingyi',  name: '经义', weight: 20, ideology: 'traditional', format: '注疏',           maxScore: 100 }
    ];
    a.quota.total = 200;                          // 南宋偏小·100-300
    a.ideology = 'traditional';                   // 理学官学化后·更保守
    return a;
  }

  /**
   * 元·蒙汉分卷·色目特权·非主流朝代·1313 复科举
   */
  function _addonYuan() {
    return {
      subjects: [
        { id: 'jinshi',  name: '进士',  weight: 60, ideology: 'traditional', format: '试策·分卷',     maxScore: 100 },
        { id: 'jingyi',  name: '经义',  weight: 40, ideology: 'traditional', format: '经书',           maxScore: 100 }
      ],
      examInterval: 3,
      retakePolicy: 'allow_3x',
      candidateRules: {
        excludedClasses: ['倡优', '罪人'],
        requirePrefecture: true,
        requireRecommendation: false,
        minAge: 18, maxAge: 60,
        allowForeigner: false,
        allowMinority: true,                      // 蒙古色目可考·分卷
        feeReimbursement: 'self'
      },
      examinerRules: {
        type: ['scholar', 'aristocrat'],          // 主考蒙汉
        partyQuota: null,
        minYears: 10,
        avoidanceRules: {
          avoid_kin: true, avoid_native: true, avoid_disciple: false,
          avoid_recent: false, avoid_party: false, avoid_age: false
        },
        blindScoring: true,
        blindCopying: true,
        inspectionLevel: 'medium',
        mentorBondStrength: 'weak',
        leakPenalty: 'banish'
      },
      quota: {
        total: 100,
        ratios: {
          geo:       { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          class:     { enabled: true,  strategy: 'ethnic_split', values: { 蒙古:25, 色目:25, 汉人:25, 南人:25 }, strictness: 'strict' },
          party:     { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          prefecture:{ enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          minority:  { enabled: true,  strategy: 'minority_preferred', values: { 蒙古:50, 色目:30, 汉:20 }, strictness: 'strict' }
        }
      },
      rankingRule: 'by_origin',
      allocationRules: {
        firstClass:  { count:3,  positions:['翰林', '集贤院'], ranks:{ default:'从六品' }, privileges:{} },
        secondClass: { count:30, positions:['六部', '行省'],   ranks:{ default:'正七品' }, privileges:{} },
        thirdClass:  { count:67, positions:['路府', '州县'],   ranks:{ default:'从七品' }, privileges:{} },
        waitingYears: 1,
        imperialReviewRequired: false,
        posthumousAdjustment: false
      },
      graduateTitle: '进士',
      cohortBondStrength: 'weak',
      mentorLineage: false,
      schoolIntegration: 'optional',
      taxPrivilege: { jinshi: true, juren: false, xiucai: false },
      shadow: 'high',
      clanPrivilege: true,
      ceremony: {
        palaceTest: '殿试', rosterRelease: '黄榜',
        flowerRiding: false, nameStele: true, bondingBanquet: true,
        kowtowRound: 9, customRituals: ['分卷唱名']
      },
      penalties: {
        cheating: 'banish', leak: 'death', taboo: 'demote', bribery: 'kin_punishment'
      },
      language: 'classical_chinese',              // 蒙译可
      ideology: 'traditional'
    };
  }

  /**
   * 明·八股 1402·南北卷 1397·六 tier·锦衣东厂监临
   */
  function _addonMing() {
    return {
      subjects: [
        { id: 'baguwen', name: '八股', weight: 70, ideology: 'traditional', format: '代圣立言·破承起讲', maxScore: 100 },
        { id: 'jingyi',  name: '经义', weight: 20, ideology: 'traditional', format: '四书五经',           maxScore: 100 },
        { id: 'celun',   name: '策论', weight: 10, ideology: 'traditional', format: '时务策',             maxScore: 100 }
      ],
      examInterval: 3,
      retakePolicy: 'allow_3x',
      candidateRules: {
        excludedClasses: ['僧道', '商贾子', '倡优', '罪人', '匠户'],
        requirePrefecture: true,
        requireRecommendation: false,
        minAge: 15, maxAge: 60,
        allowForeigner: false,
        allowMinority: false,
        feeReimbursement: 'self'
      },
      examinerRules: {
        type: ['scholar'],
        partyQuota: null,
        minYears: 10,
        avoidanceRules: {
          avoid_kin: true, avoid_native: true, avoid_disciple: false,
          avoid_recent: false, avoid_party: false, avoid_age: false
        },
        blindScoring: true,
        blindCopying: true,
        inspectionLevel: 'high',                  // 锦衣东厂监临
        mentorBondStrength: 'strong',             // 明门生网络复盛·东林党源
        leakPenalty: 'death'
      },
      quota: {
        total: 200,
        ratios: {
          geo:       { enabled: true,  strategy: 'south_north', values: { 南:60, 北:40 }, strictness: 'strict' },   // 明 1397 南北卷
          class:     { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          party:     { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          prefecture:{ enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          minority:  { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' }
        }
      },
      rankingRule: 'by_score',
      allocationRules: {
        firstClass:  { count:3,  positions:['翰林'], ranks:{ 状元:'修撰', 榜眼:'编修', 探花:'编修' }, privileges:{ 御赐袍服:true, 跨马游街:true, 题名碑:true } },
        secondClass: { count:30, positions:['六部主事', '翰林庶吉士'], ranks:{ default:'正七品' }, privileges:{} },
        thirdClass:  { count:167, positions:['知县', '主薄'],         ranks:{ default:'正七品' }, privileges:{} },
        waitingYears: 1,
        imperialReviewRequired: true,
        posthumousAdjustment: false
      },
      graduateTitle: '进士',
      cohortBondStrength: 'strong',
      mentorLineage: true,
      schoolIntegration: 'required',              // 必入学·明立县府州学
      taxPrivilege: { jinshi: true, juren: true, xiucai: true },  // 明立秀才免役
      shadow: 'low',
      clanPrivilege: false,
      ceremony: {
        palaceTest: '殿试·天子亲策', rosterRelease: '金榜·传胪大典',
        flowerRiding: true, nameStele: true, bondingBanquet: true,
        kowtowRound: 9,
        customRituals: ['传胪', '簪花', '跨马', '琼林宴', '谢恩大典']
      },
      penalties: {
        cheating: 'banish', leak: 'death', taboo: 'demote', bribery: 'kin_punishment'
      },
      language: 'classical_chinese',
      ideology: 'traditional'
    };
  }

  /**
   * 清·袭明 + 翻译科 1723·满汉双榜·六 tier·严反舞弊
   */
  function _addonQing() {
    return {
      subjects: [
        { id: 'baguwen', name: '八股',   weight: 60, ideology: 'traditional', format: '代圣立言',     maxScore: 100 },
        { id: 'jingyi',  name: '经义',   weight: 20, ideology: 'traditional', format: '四书五经',     maxScore: 100 },
        { id: 'celun',   name: '策论',   weight: 15, ideology: 'traditional', format: '时务策',       maxScore: 100 },
        { id: 'fanyi',   name: '翻译',   weight: 5,  ideology: 'practical',   format: '满汉对译',     maxScore: 100 }  // 1723 雍正立
      ],
      examInterval: 3,
      retakePolicy: 'allow_3x',
      candidateRules: {
        excludedClasses: ['僧道', '商贾子', '倡优', '罪人', '匠户', '皂吏'],
        requirePrefecture: true,
        requireRecommendation: false,
        minAge: 15, maxAge: 70,
        allowForeigner: false,
        allowMinority: true,                      // 满蒙汉八旗 + 满汉双榜
        feeReimbursement: 'self'
      },
      examinerRules: {
        type: ['scholar', 'aristocrat'],          // 满洲贵族主考
        partyQuota: null,
        minYears: 10,
        avoidanceRules: {
          avoid_kin: true, avoid_native: true, avoid_disciple: true,    // 清严·避门生
          avoid_recent: true, avoid_party: false, avoid_age: false
        },
        blindScoring: true,
        blindCopying: true,
        inspectionLevel: 'high',                  // 清严反舞弊·顺治丁酉案重 / 咸丰戊午案
        mentorBondStrength: 'weak',               // 清"绝师生"·门生关系弱
        leakPenalty: 'death'                      // 清主考泄题斩
      },
      quota: {
        total: 250,
        ratios: {
          geo:       { enabled: true,  strategy: 'south_north_middle', values: { 南:55, 北:35, 中:10 }, strictness: 'strict' },  // 雍正分中卷
          class:     { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          party:     { enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          prefecture:{ enabled: false, strategy: 'none', values: {}, strictness: 'guidance' },
          minority:  { enabled: true,  strategy: 'man_han_dual', values: { 满:40, 汉:60 }, strictness: 'strict' }  // 满汉双榜
        }
      },
      rankingRule: 'by_score',
      allocationRules: {
        firstClass:  { count:3,  positions:['翰林'], ranks:{ 状元:'修撰', 榜眼:'编修', 探花:'编修' }, privileges:{ 御赐袍服:true, 跨马游街:true, 题名碑:true } },
        secondClass: { count:30, positions:['六部主事', '翰林庶吉士'], ranks:{ default:'从七品' }, privileges:{} },
        thirdClass:  { count:217, positions:['知县', '主薄'],         ranks:{ default:'正七品' }, privileges:{} },
        waitingYears: 1,
        imperialReviewRequired: true,
        posthumousAdjustment: false
      },
      graduateTitle: '进士',
      cohortBondStrength: 'weak',                 // 清"绝师生"
      mentorLineage: false,
      schoolIntegration: 'required',
      taxPrivilege: { jinshi: true, juren: true, xiucai: true },
      shadow: 'low',
      clanPrivilege: false,
      ceremony: {
        palaceTest: '殿试·御前亲策', rosterRelease: '金榜·传胪大典',
        flowerRiding: true, nameStele: true, bondingBanquet: true,
        kowtowRound: 9,
        customRituals: ['传胪', '簪花', '跨马', '琼林宴', '谢恩', '满汉同榜']
      },
      penalties: {
        cheating: 'banish', leak: 'death', taboo: 'banish', bribery: 'kin_punishment'  // 清避讳严·乾隆文字狱
      },
      language: 'classical_chinese+manchu',
      ideology: 'traditional'
    };
  }

  /**
   * fallback·未识别朝代·default 走明制 (最 generic)
   */
  function _addonFallback() {
    var a = _addonMing();
    a._fallbackUsed = true;
    return a;
  }

  // ════════════════════════════════════════════════════════════════
  // §2·主入口·_kjpGetParadigmAddonByEra
  // ════════════════════════════════════════════════════════════════

  /**
   * 按朝代字符串返 paradigm-specific addon
   * fuzzy match (跟 _kjGetPresetByEra 一致)
   * @param {string} era - 朝代名
   * @returns {object} addon object (paradigm-specific 字段)
   */
  function _kjpGetParadigmAddonByEra(era) {
    if (!era) return _addonFallback();
    var e = String(era);

    if (/汉/.test(e) && !/南汉|北汉|后汉/.test(e)) return _addonHan();
    if (/魏晋|三国|两晋|东晋|西晋|五胡|南北朝/.test(e)) return _addonWeijin();
    if (/^魏$/.test(e) || /^晋$/.test(e)) return _addonWeijin();
    if (/北魏/.test(e)) return _addonWeijin();
    if (/隋/.test(e)) return _addonSui();
    if (/唐/.test(e)) return _addonTang();
    if (/五代/.test(e)) return _addonTang();      // 五代近唐
    if (/^辽$|^金$|辽朝|金朝/.test(e)) return _addonBeisong();  // 辽金近宋 3-tier
    if (/北宋|宋·北|北宋朝/.test(e)) return _addonBeisong();
    if (/南宋|宋·绍兴|宋·靖康后|宋·建炎/.test(e)) return _addonNansong();
    if (/宋/.test(e)) return _addonBeisong();    // 默认宋走北宋
    if (/元/.test(e)) return _addonYuan();
    if (/明/.test(e)) return _addonMing();
    if (/清/.test(e)) return _addonQing();

    return _addonFallback();
  }

  function _kjpListAllParadigmAddons() {
    return [
      _addonHan(), _addonWeijin(), _addonSui(), _addonTang(),
      _addonBeisong(), _addonNansong(), _addonYuan(), _addonMing(), _addonQing()
    ];
  }

  // ════════════════════════════════════════════════════════════════
  // §3·暴露
  // ════════════════════════════════════════════════════════════════

  global._kjpGetParadigmAddonByEra = _kjpGetParadigmAddonByEra;
  global._kjpListAllParadigmAddons = _kjpListAllParadigmAddons;

  if (!global.TM) global.TM = {};
  if (!global.TM.Keju) global.TM.Keju = {};
  if (!global.TM.Keju.Paradigm) global.TM.Keju.Paradigm = {};
  global.TM.Keju.Paradigm.getAddonByEra = _kjpGetParadigmAddonByEra;
  global.TM.Keju.Paradigm.listAllAddons = _kjpListAllParadigmAddons;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      _kjpGetParadigmAddonByEra: _kjpGetParadigmAddonByEra,
      _kjpListAllParadigmAddons: _kjpListAllParadigmAddons
    };
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
