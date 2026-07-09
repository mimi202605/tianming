// @ts-check
/// <reference path="types.d.ts" />
/**
 * tm-keju-presets.js — 9 朝代 keju 完整 preset (v7·Slice B2)
 *
 * 职责·当 scenario.keju 缺失时·按朝代提供 default preset·让 initKejuSystem
 *      可在无 LLM / LLM 失败 / 老剧本场景下·自动填出符合史实的科举体系。
 *
 * 暴露·TM.Keju.Preset.* + 全局 alias·_kjGetPresetByEra / _kjListAllPresets / _kjPresetSummary
 *
 * 史源依据·见 web/docs/keju-paradigm-research-v7.md §2 9 朝代差异化表
 *           §3 D1 进士长尾·§4 D2 特科·§5 D3 私学/书院·§6 D4 宦官干预
 *
 * red line·
 *   - tier 全走 _kjMakeTier 工厂·禁止裸创 tier object (B1 schema 约定)
 *   - 4 新维度初始值必依 A0.7 doc·不虚构 (待考的史源用 (?) 注)
 *   - 不破坏现 LLM 智能初始化·preset 仅作 default + fallback
 *   - 不动 pickHistoricalCandidates / shiliao / _keyi*
 *
 * Preset 结构·
 *   {
 *     era:                    '宋' 等 normalize 后的朝代名
 *     eraDisplay:             '北宋' / '南宋' 等具体显示名
 *     system:                 'kj' (科举) | 'chaju' (察举) | 'jpzz' (九品中正)
 *     enabled:                bool·非科举朝代为 false
 *     examIntervalNote:       '三年一科' 等
 *     tiers:                  _kjMakeTier 派生数组
 *     jinshiPerExam:          number 或区间字符串 (如 '200-400')
 *     features:               1 行特色描述
 *     specialExamCalendar:    D2·特科日历初始值
 *     schoolNetworkInit:      D3·书院网络初始值
 *     eunuchInterferenceInit: D4·宦官干预初始值 (明清重·其他朝代 0)·键全中立·跨朝代通用·
 *                             {secretary(批红权·司礼监类), agency(内廷侦缉机构·原 dongchang/东厂), partisan(宦党列表)}·
 *                             朝代专名 (东厂/司礼监/十常侍) 仅入 historicalNote 注脚·绝不作 schema 键 (跨朝代铁律)
 *     discipleGraphSeed:      D1·历史 mentor-disciple 关系种子
 *   }
 */
(function(global) {
  'use strict';

  // ════════════════════════════════════════════════════════════════
  // §0·依赖检查·_kjMakeTier 必须先于本文件加载
  // ════════════════════════════════════════════════════════════════
  function _safeMakeTier(name, level, interactive, daysCost, opts) {
    if (typeof global._kjMakeTier === 'function') {
      return global._kjMakeTier(name, level, interactive, daysCost, opts);
    }
    // fallback·裸 object (违规·但避免本文件单测时崩)
    try { console.warn('[keju·preset] _kjMakeTier not loaded·fallback bare tier·name=', name); } catch(_){}
    opts = opts || {};
    return {
      name:String(name||''), level:String(level||'local'), interactive:!!interactive,
      desc:opts.desc||'', daysCost:daysCost||30,
      tierKind:opts.tierKind||'selection', examinerLevel:opts.examinerLevel||'county',
      contentType:opts.contentType||'classics', passRate:opts.passRate!=null?opts.passRate:0.20,
      scenarioOverride:null
    };
  }

  // ════════════════════════════════════════════════════════════════
  // §1·9 朝代 preset 构造函数·每函数返完整 preset object
  //    顺序按 A0.7 doc §2 表·汉 → 清
  // ════════════════════════════════════════════════════════════════

  /**
   * 汉·察举 4 科 (非科举本体·tier 空·system='chaju')
   * 史源·A0.7 §2 第 1 列 / §5.3 太学
   */
  function _presetHan() {
    return {
      era: '汉',                          // 汉
      eraDisplay: '汉',
      system: 'chaju',
      enabled: false,                          // 非科举朝代·runtime isKejuEra() 也会返 false
      examIntervalNote: '岁举（每年选孝廉）',  // 岁举·每年选孝廉
      alternativeSystem: '察举制',  // 察举制
      tiers: [],                               // 察举非 tier 制·空数组
      jinshiPerExam: 0,                        // 无进士概念
      features: '察举4科：孝廉/茂才/贤良方正/明经·州郡荐举 + 三公审议',  // 察举4科:孝廉/茂才/贤良方正/明经·州郡荐举+三公审议
      specialExamCalendar: {
        enke_triggers: [],
        wuju_enabled: false,
        wuju_interval: 0,
        fanyi_enabled: false,
        tongzi_enabled: true,                  // 汉桓帝偶设童子科 (§4.1)
        tongzi_note: '汉桓帝偶设'  // 汉桓帝偶设
      },
      schoolNetworkInit: {
        academies: [
          { name: '太学',  founder: '汉武帝', foundedYear: -124, faction: '官学' }   // 太学·汉武帝·元朔五年立·官学
        ],
        private_schools_active: true,          // 汉私学盛 (§5.3)
        note: '太学 + 郡学 + 私学三路并行'  // 太学+郡学+私学三路并行
      },
      eunuchInterferenceInit: {
        secretary: 0,                          // 汉无司礼监
        agency: 0,
        partisan: [],
        affectsExam: true,                     // 东汉十常侍涉察举 (§6.1)
        level: 'political',
        historicalNote: '东汉十常侍涉察举 (167+)'  // 东汉十常侍涉察举
      },
      discipleGraphSeed: [
        // 东汉袁绍门生故吏遍天下 (§3.2)
        { mentor: '袁安', disciples: [], year: 167, note: '四世三公·门生故吏网络起点' }  // 袁安·四世三公·门生故吏网络起点
      ]
    };
  }

  /**
   * 魏晋·九品中正 (非科举本体·tier 空·system='jpzz')
   * 史源·A0.7 §2 第 2 列 / §5.3 玄学清谈
   */
  function _presetWeijin() {
    return {
      era: '魏晋',                     // 魏晋
      eraDisplay: '魏晋',
      system: 'jpzz',
      enabled: false,
      examIntervalNote: '无定期·中正品评',   // 无定期·中正品评
      alternativeSystem: '九品中正制',                    // 九品中正制
      tiers: [],
      jinshiPerExam: 0,
      features: '九品中正·中正官品评·门阀世家主导·上品无寒门下品无势族',  // 九品中正·中正官品评·门阀世家主导·上品无寒门下品无势族
      specialExamCalendar: {
        enke_triggers: [],
        wuju_enabled: false,
        wuju_interval: 0,
        fanyi_enabled: false,
        tongzi_enabled: false
      },
      schoolNetworkInit: {
        academies: [],                         // 魏晋无书院·玄学清谈非书院 (§5.3)
        private_schools_active: false,
        note: '玄学清谈·非书院 (竹林七贤等)'  // 玄学清谈·非书院 (竹林七贤等)
      },
      eunuchInterferenceInit: {
        secretary: 0,
        agency: 0,
        partisan: [],
        affectsExam: false,
        level: 'none'
      },
      discipleGraphSeed: [
        // 王导/谢安世家门第 (§2 表 D1 列)
        { mentor: '王导', disciples: [], year: 317, note: '东晋朱门·世家门第·非门生' }  // 王导·东晋朱门·世家门第·非门生
      ]
    };
  }

  /**
   * 隋·进士科初设·3 tier
   * 史源·A0.7 §2 第 3 列·§7 #1/#2 (587/605 初设)·v7 取 605 为锚
   */
  function _presetSui() {
    return {
      era: '隋',                           // 隋
      eraDisplay: '隋',
      system: 'kj',
      enabled: true,
      examIntervalNote: '不定期·制度初创',     // 不定期·制度初创
      alternativeSystem: '',
      tiers: [
        _safeMakeTier('州试',  'province',  false, 60, { desc:'地方初选',         contentType:'classics' }),                // 州试·地方初选
        _safeMakeTier('省试',  'national',  true,  60, { desc:'礼部主持',         contentType:'classics' }),                // 省试·礼部主持
        _safeMakeTier('殿试',  'imperial',  true,  30, { desc:'天子亲策',         contentType:'policy' })                    // 殿试·天子亲策
      ],
      jinshiPerExam: '数十',           // 数十
      features: '进士科初设·587/605·以试策取士',         // 进士科初设·587/605·以试策取士
      specialExamCalendar: {
        enke_triggers: [],
        wuju_enabled: false,
        wuju_interval: 0,
        fanyi_enabled: false,
        tongzi_enabled: false
      },
      schoolNetworkInit: {
        academies: [],
        private_schools_active: true,
        note: '国子学初设·书院未起'  // 国子学初设·书院未起
      },
      eunuchInterferenceInit: {
        secretary: 0,
        agency: 0,
        partisan: [],
        affectsExam: false,
        level: 'none'
      },
      discipleGraphSeed: []                     // 制度初·无典型门生案 (§2 D1 列)
    };
  }

  /**
   * 唐·解试→省试→殿试·3 tier·武举 702 起
   * 史源·A0.7 §2 第 4 列·§4.3 (郭子仪 722 武举)·§7 #4/#5
   */
  function _presetTang() {
    return {
      era: '唐',                           // 唐
      eraDisplay: '唐',
      system: 'kj',
      enabled: true,
      examIntervalNote: '每年一科',                            // 每年一科
      alternativeSystem: '',
      tiers: [
        _safeMakeTier('解试',  'province',  false, 60, { desc:'州府选拔',           contentType:'classics', passRate:0.10 }),  // 解试·州府选拔
        _safeMakeTier('省试',  'national',  true,  60, { desc:'礼部知贡举',       contentType:'policy',   passRate:0.15 }),  // 省试·礼部知贡举
        _safeMakeTier('殿试',  'imperial',  true,  30, { desc:'武则天后定制', contentType:'policy',   passRate:1.00 })   // 殿试·武则天后定制
      ],
      jinshiPerExam: '20-30',
      features: '进士/明经等6科·诗赋·糊名未全',  // 进士/明经等6科·诗赋·糊名未全
      specialExamCalendar: {
        enke_triggers: ['新帝登基'],                          // 新帝登基
        wuju_enabled: true,                                                    // 武举 702 长安二年起 (§4.3)
        wuju_interval: 5,                                                      // (?·唐武举频次不定·取近似)
        wuju_startYear: 702,
        fanyi_enabled: false,
        tongzi_enabled: true,                                                  // 唐定制 (§4.1)
        tongzi_note: '唐定制·偶考'                   // 唐定制·偶考
      },
      schoolNetworkInit: {
        academies: [
          { name: '国子学', founder: '唐高祖', foundedYear: 618, faction: '官学' },  // 国子学·唐高祖·官学
          { name: '州县学', founder: '朝廷',     foundedYear: 627, faction: '官学' }    // 州县学·朝廷·官学
        ],
        private_schools_active: true,
        note: '唐私学盛·书院未大起 (§5.3)'  // 唐私学盛·书院未大起 (§5.3)
      },
      eunuchInterferenceInit: {
        secretary: 0,
        agency: 0,
        partisan: [],
        affectsExam: false,                                                    // 唐末高力士涉政但弱涉考 (§6.1)
        level: 'political',
        historicalNote: '唐末高力士/鱼朝恩涉政·弱涉考'  // 唐末高力士/鱼朝恩涉政·弱涉考
      },
      discipleGraphSeed: [
        // 牛李党争 (§3.2 833-850)
        { mentor: '牛僧孺', disciples: [], year: 808, note: '牛党领袖·制科门生网络' },   // 牛僧孺·牛党领袖·制科门生网络
        { mentor: '李德裕', disciples: [], year: 821, note: '李党领袖·与牛党争' }                  // 李德裕·李党领袖·与牛党争
      ]
    };
  }

  /**
   * 北宋·解试→省试→殿试·3 tier·5 toggle 全开
   * 史源·A0.7 §2 第 5 列·§3.2 (1057 千年龙虎榜)·§5.3 (四大书院)·§7 #8-#13
   */
  function _presetBeisong() {
    return {
      era: '宋',                           // 宋·共用 era key
      eraDisplay: '北宋',              // 北宋
      system: 'kj',
      enabled: true,
      examIntervalNote: '三年一科 (1065起)',               // 三年一科 (1065起)
      alternativeSystem: '',
      tiers: [
        _safeMakeTier('解试',  'province',  false, 60, { desc:'州军选拔',                     contentType:'classics', passRate:0.10 }),  // 解试·州军选拔
        _safeMakeTier('省试',  'national',  true,  60, { desc:'礼部权知贡举',           contentType:'policy',   passRate:0.20 }),  // 省试·礼部权知贡举
        _safeMakeTier('殿试',  'imperial',  true,  30, { desc:'天子亲策·不黜',     contentType:'policy',   passRate:1.00 })   // 殿试·天子亲策·不黜
      ],
      jinshiPerExam: '200-400',                // 峰 1057 嘉祐二年 388
      features: '糊名 + 誊录 + 锁院 + 别头试 + 监临·5 toggle 全开',  // 糊名+誊录+锁院+别头试+监临·5 toggle 全开
      specialExamCalendar: {
        enke_triggers: ['天下庆典', '新帝登基'],   // 天下庆典·新帝登基
        wuju_enabled: true,
        wuju_interval: 3,
        wuju_startYear: 960,
        fanyi_enabled: false,
        tongzi_enabled: true,                                                       // 北宋晏殊 14 岁童子赐进士 (§4.1)
        tongzi_note: '晏殊1004·最14岁赐进士'      // 晏殊1004·14岁赐进士
      },
      schoolNetworkInit: {
        // 北宋四大书院 (§5.3)
        academies: [
          { name: '应天书院',   founder: '宋真宗',       foundedYear: 1010, faction: '官学化' },           // 应天书院·宋真宗·1010·官学化
          { name: '岳麓书院',   founder: '智璿等',         foundedYear: 976,  faction: '中立' },                  // 岳麓书院·智璿等·976·中立
          { name: '白鹿洞书院', founder: '南唐',         foundedYear: 940,  faction: '中立' },                  // 白鹿洞书院·南唐·940·中立
          { name: '嵩阳书院',   founder: '范仲淹',           foundedYear: 1035, faction: '理学' }                    // 嵩阳书院·范仲淹·1035·理学
        ],
        private_schools_active: true,
        note: '四大书院·胡瑗湖学·程颢程颐理学起'   // 四大书院·胡瑗湖学·程颢程颐理学起
      },
      eunuchInterferenceInit: {
        secretary: 0,                                                                  // 北宋宦官地位低 (§6.1)
        agency: 0,
        partisan: [],
        affectsExam: false,
        level: 'low',
        historicalNote: '北宋宦官低·徽宗朝童贯/梁师成后高'  // 北宋宦官低·徽宗朝童贯/梁师成后高
      },
      discipleGraphSeed: [
        // §3.2 第 3 行·千年龙虎榜 1057
        { mentor: '欧阳修', disciples: ['苏轼','苏辙','曾巩','程颢','程颐','张载','吕惠卿'], year: 1057, note: '千年龙虎榜·9宰相门生' },  // 欧阳修·苏轼苏辙曾巩程颢程颐张载吕惠卿·千年龙虎榜·9宰相门生
        // §3.2 第 4 行·新党
        { mentor: '王安石', disciples: ['吕惠卿','章惇'], year: 1069, note: '新学·变法家门生' }   // 王安石·吕惠卿章惇·新学·变法家门生
      ]
    };
  }

  /**
   * 南宋·同北宋 3-tier·理学官学化
   * 史源·A0.7 §2 第 6 列·§5.3 (朱熹四书院)·§7 #14-#16
   */
  function _presetNansong() {
    return {
      era: '宋',                           // 宋·共用 era key
      eraDisplay: '南宋',              // 南宋
      system: 'kj',
      enabled: true,
      examIntervalNote: '三年一科',
      alternativeSystem: '',
      tiers: [
        _safeMakeTier('解试',  'province',  false, 60, { desc:'州军选拔',                     contentType:'classics', passRate:0.10 }),  // 解试·州军选拔
        _safeMakeTier('省试',  'national',  true,  60, { desc:'礼部·理学渗透',   contentType:'policy',   passRate:0.20 }),  // 省试·礼部·理学渗透
        _safeMakeTier('殿试',  'imperial',  true,  30, { desc:'天子亲策·不黜',     contentType:'policy',   passRate:1.00 })   // 殿试·天子亲策·不黜
      ],
      jinshiPerExam: '100-300',
      features: '同北宋 + 理学官学化 + 武举强',     // 同北宋+理学官学化+武举强
      specialExamCalendar: {
        enke_triggers: ['天下庆典', '新帝登基'],
        wuju_enabled: true,
        wuju_interval: 3,
        wuju_startYear: 1127,
        fanyi_enabled: false,
        tongzi_enabled: true,                                                       // 南宋朱虎臣 9 岁童子出身 (§4.1)
        tongzi_note: '朱虎臣1207·9岁·射箭出身'  // 朱虎臣1207·9岁·射箭出身
      },
      schoolNetworkInit: {
        // 朱熹四书院 (§5.3)
        academies: [
          { name: '白鹿洞书院·重建', founder: '朱熹', foundedYear: 1180, faction: '理学' },  // 白鹿洞书院·重建·朱熹·1180·理学
          { name: '岳麓书院·主讲',       founder: '朱熹', foundedYear: 1194, faction: '理学' },  // 岳麓书院·主讲·朱熹·1194·理学
          { name: '武夷精舍',                         founder: '朱熹', foundedYear: 1183, faction: '理学' },  // 武夷精舍·朱熹·1183·理学
          { name: '沧洲精舍',                         founder: '朱熹', foundedYear: 1192, faction: '理学' }   // 沧洲精舍·朱熹·1192·理学
        ],
        private_schools_active: true,
        note: '朱熹理学官学化载体·书院鼎盛'  // 朱熹理学官学化载体·书院鼎盛
      },
      eunuchInterferenceInit: {
        secretary: 0,
        agency: 0,
        partisan: [],
        affectsExam: false,
        level: 'low'
      },
      discipleGraphSeed: [
        // §3.5·南宋朱熹门生
        { mentor: '朱熹', disciples: [], year: 1180, note: '理学门生·朱门四杰等' }  // 朱熹·理学门生·朱门四杰等
      ]
    };
  }

  /**
   * 元·乡试→会试→殿试·3 tier·四等差额·1313 复
   * 史源·A0.7 §2 第 7 列·§5.3 (书院官化)·§7 #17/#18
   */
  function _presetYuan() {
    return {
      era: '元',                           // 元
      eraDisplay: '元',
      system: 'kj',
      enabled: true,
      examIntervalNote: '三年一科 (1313复)',               // 三年一科 (1313复)
      alternativeSystem: '',
      tiers: [
        _safeMakeTier('乡试',  'province',  false, 60, { desc:'行省选拔·四等差额', contentType:'classics', passRate:0.08 }),  // 乡试·行省选拔·四等差额
        _safeMakeTier('会试',  'national',  true,  60, { desc:'礼部·四等差额',           contentType:'policy',   passRate:0.15 }),  // 会试·礼部·四等差额
        _safeMakeTier('殿试',  'imperial',  true,  30, { desc:'天子亲策',                             contentType:'policy',   passRate:1.00 })   // 殿试·天子亲策
      ],
      jinshiPerExam: '30-100',                 // 民族限额
      features: '蒙汉色目南人4等差额·1313复·中断79年',     // 蒙汉色目南人4等差额·1313复·中断79年
      specialExamCalendar: {
        enke_triggers: ['新汗登基'],                          // 新汗登基
        wuju_enabled: false,                                                   // 元无武举 (§2 D2 列)
        wuju_interval: 0,
        fanyi_enabled: false,                                                  // 元有色目特权代翻译科
        tongzi_enabled: false
      },
      schoolNetworkInit: {
        academies: [],                                                         // 元代书院官化·山长朝廷任 (§5.3·1290)
        private_schools_active: false,
        note: '书院官化 (1290 至元二十七年)·反朝廷据点功能消解'  // 书院官化 (1290 至元二十七年)·反朝廷据点功能消解
      },
      eunuchInterferenceInit: {
        secretary: 0,                                                          // 元宦官弱 (§6.1)
        agency: 0,
        partisan: [],
        affectsExam: false,
        level: 'none'
      },
      discipleGraphSeed: []                     // 元色目限·门生网络弱 (§3.5)
    };
  }

  /**
   * 明·童试→府试→院试→乡试→会试→殿试·6 tier·八股 + 司礼监 + 东厂
   * 史源·A0.7 §2 第 8 列·§3.2 (张居正/顾宪成)·§5.3 (东林/复社)·§6.2-6.3 (3 大宦官案)·§7 #19-#28
   */
  function _presetMing() {
    return {
      era: '明',                           // 明
      eraDisplay: '明',
      system: 'kj',
      enabled: true,
      examIntervalNote: '三年一科',
      alternativeSystem: '',
      tiers: [
        _safeMakeTier('县试',  'county',       false, 20, { desc:'县内初试·童生进取',   contentType:'classics',    passRate:0.30 }),  // 县试·县内初试·童生进取
        _safeMakeTier('府试',  'prefecture',   false, 20, { desc:'府城复试',                                contentType:'classics',    passRate:0.25 }),  // 府试·府城复试
        _safeMakeTier('院试',  'province_pre', false, 20, { desc:'学政主持·秀才',               contentType:'classics',    passRate:0.20 }),  // 院试·学政主持·秀才
        _safeMakeTier('乡试',  'province',     false, 90, { desc:'省城举人考·秋闱',           contentType:'eight_legged',passRate:0.05 }),  // 乡试·省城举人考·秋闱
        _safeMakeTier('会试',  'national',     true,  60, { desc:'礼部主持·玩家可参与', contentType:'eight_legged',passRate:0.10 }),  // 会试·礼部主持·玩家可参与
        _safeMakeTier('殿试',  'imperial',     true,  30, { desc:'天子亲策',                                  contentType:'policy',      passRate:1.00 })   // 殿试·天子亲策
      ],
      jinshiPerExam: '100-300',
      features: '八股·1437全定·房师+同年+东林+魏忠贤',  // 八股·1437全定·房师+同年+东林+魏忠贤
      specialExamCalendar: {
        enke_triggers: ['皇帝寿辰', '皇帝大婚', '新帝登基', '万寿节'],  // 皇帝寿辰·大婚·新帝登基·万寿节
        wuju_enabled: true,                                                                                                          // 武举·戚继光 1556 武乡试 (§4.3)
        wuju_interval: 3,
        wuju_startYear: 1387,                                                                                                        // 洪武二十年武举起
        fanyi_enabled: false,
        tongzi_enabled: true,
        tongzi_note: '明设·偶考'                                                                                // 明设·偶考
      },
      schoolNetworkInit: {
        // 明末书院第三波 (§5.3)
        academies: [
          { name: '东林书院', founder: '顾宪成', foundedYear: 1604, faction: '东林' },     // 东林书院·顾宪成·1604·东林
          { name: '首善书院', founder: '邹元标', foundedYear: 1622, faction: '东林' },     // 首善书院·邹元标·1622·东林
          { name: '关中书院', founder: '冯从吾', foundedYear: 1609, faction: '关学' },     // 关中书院·冯从吾·1609·关学
          { name: '复社',         founder: '张溥',         foundedYear: 1629, faction: '复社' }      // 复社·张溥·1629·复社
        ],
        private_schools_active: true,
        note: '东林 + 首善 + 关中·讲会+议政+党社三合'  // 东林+首善+关中·讲会+议政+党社三合
      },
      eunuchInterferenceInit: {
        secretary: 40,                                                                                                              // 司礼监批红 1420 立 (§6.2)
        agency: 50,                                                                                                                 // 内廷侦缉机构·原东厂 1420 立·明中后期主考被监临 (专名仅注脚)
        partisan: ['阉党'],                                                                                                  // 阉党 (§6.3 魏忠贤朝)
        affectsExam: true,                                                                                                           // 明 D4 重度涉考 (§6.1)
        level: 'severe',
        historicalNote: '王振1442-49 + 刘瑾1506-10焦芳 + 魏忠贤1624-27大狱东林'  // 王振1442-49+刘瑾1506-10焦芳+魏忠贤1624-27大狱东林
      },
      discipleGraphSeed: [
        // §3.2 第 5 行·张居正同年
        { mentor: '张居正', disciples: [], year: 1547, note: '同年·夺情案死保' },          // 张居正·同年·夺情案死保
        // §3.2 第 6 行·顾宪成同年·东林源
        { mentor: '顾宪成', disciples: ['高攀龙','钱一本'], year: 1580, note: '东林党源·1604书院' }  // 顾宪成·高攀龙钱一本·东林党源·1604书院
      ]
    };
  }

  /**
   * 清·同明 6-tier·翻译科 + 满汉双榜 + 严反舞弊
   * 史源·A0.7 §2 第 9 列·§3.2 (曾国藩 1838)·§4.3 (翻译科 1723)·§6.1 (清严禁宦官)·§7 #30-#38
   */
  function _presetQing() {
    return {
      era: '清',                           // 清
      eraDisplay: '清',
      system: 'kj',
      enabled: true,
      examIntervalNote: '三年一科',
      alternativeSystem: '',
      tiers: [
        _safeMakeTier('县试',  'county',       false, 20, { desc:'县内初试',                                contentType:'classics',    passRate:0.30 }),  // 县试·县内初试
        _safeMakeTier('府试',  'prefecture',   false, 20, { desc:'府城复试',                                contentType:'classics',    passRate:0.25 }),  // 府试·府城复试
        _safeMakeTier('院试',  'province_pre', false, 20, { desc:'学政主持·秀才',               contentType:'classics',    passRate:0.20 }),  // 院试·学政主持·秀才
        _safeMakeTier('乡试',  'province',     false, 90, { desc:'省城举人考·秋闱',           contentType:'eight_legged',passRate:0.05 }),  // 乡试·省城举人考·秋闱
        _safeMakeTier('会试',  'national',     true,  60, { desc:'礼部·满汉双榜',                  contentType:'eight_legged',passRate:0.10 }),  // 会试·礼部·满汉双榜
        _safeMakeTier('殿试',  'imperial',     true,  30, { desc:'天子亲策',                                  contentType:'policy',      passRate:1.00 })   // 殿试·天子亲策
      ],
      jinshiPerExam: '100-300',                // 含满汉
      features: '袭明制 + 翻译科 (1723) + 满汉双榜 + 宗室机构',  // 袭明制+翻译科(1723)+满汉双榜+宗室机构
      specialExamCalendar: {
        enke_triggers: ['皇帝寿辰', '皇帝大婚', '新帝登基', '万寿节', '千叟宴'],  // 皇帝寿辰·大婚·新帝登基·万寿节·千叟宴
        wuju_enabled: true,
        wuju_interval: 3,
        wuju_startYear: 1644,
        fanyi_enabled: true,                                                                                                          // 雍正元年 1723 立翻译科 (§4.3)
        fanyi_startYear: 1723,
        fanyi_note: '雍正元年1723·满蒙汉翻译·直入军机',                  // 雍正元年1723·满蒙汉翻译·直入军机
        tongzi_enabled: true,
        tongzi_note: '清袭·偶考'                                                                                  // 清袭·偶考
      },
      schoolNetworkInit: {
        // 清初禁讲学·乾隆后省书院 (§5.3)
        academies: [
          { name: '岳麓书院·重建', founder: '清初官修', foundedYear: 1684,  faction: '官学化' },  // 岳麓书院·重建·清初官修·1684·官学化
          { name: '省城书院',                 founder: '乾隆朝',   foundedYear: 1742,  faction: '官学化' }   // 省城书院·乾隆朝·1742·官学化
        ],
        private_schools_active: false,                                                                                              // 1654 禁讲学
        note: '1654顺治禁讲学·1742乾隆重立·山长督抚任'             // 1654顺治禁讲学·1742乾隆重立·山长督抚任
      },
      eunuchInterferenceInit: {
        secretary: 0,                                                                                                                // 清严禁宦官干政 (§6.1)
        agency: 0,
        partisan: [],
        affectsExam: false,                                                                                                          // 清不涉考
        level: 'political',                                                                                                          // 清末李莲英涉政但不涉考 (§6.5 清 D4 特例)
        historicalNote: '清严禁·慈禧朝李莲英涉政不涉考'                  // 清严禁·慈禧朝李莲英涉政不涉考
      },
      discipleGraphSeed: [
        // §3.2 末·曾国藩 1838 同年·湘军核心
        { mentor: '曾国藩', disciples: ['李鸿章','左宗棠·不同年'], year: 1838, note: '同年+门生·湘军核心' },  // 曾国藩·李鸿章/左宗棠不同年·同年+门生·湘军核心
        // §3.2 末·翁同龢 1856 帝师
        { mentor: '翁同龢', disciples: [], year: 1856, note: '帝师·清末同年网络' }    // 翁同龢·帝师·清末同年网络
      ]
    };
  }

  // ════════════════════════════════════════════════════════════════
  // §2·主入口·_kjGetPresetByEra·fuzzy match
  //    era 字符串 → 唯一 preset
  // ════════════════════════════════════════════════════════════════

  /**
   * 按朝代字符串返完整 preset
   * fuzzy match·支持·
   *   - "西汉" / "东汉" / "汉"          → _presetHan
   *   - "三国" / "魏" / "晋" / "五胡" / "魏晋" → _presetWeijin
   *   - "隋" / "隋朝"                    → _presetSui
   *   - "唐" / "唐朝" / "李唐"           → _presetTang
   *   - "五代" / "五代十国"              → _presetTang (近唐·v7 简化)
   *   - "辽" / "辽朝"                    → _presetSong (辽汉科·近宋 3-tier 形态)
   *   - "金" / "金朝"                    → _presetSong (金汉科·同上)
   *   - "北宋" / "宋·北" / "北宋朝"      → _presetBeisong
   *   - "南宋" / "宋·绍兴" / "宋·靖康后" → _presetNansong
   *   - "宋" (无北/南) → _presetBeisong (默认·user 可改)
   *   - "元" / "蒙元" / "大元"           → _presetYuan
   *   - "明" / "大明" / "明朝"           → _presetMing
   *   - "清" / "大清" / "清朝"           → _presetQing
   *
   * @param {string} era
   * @returns {Object|null} preset 或 null (era 为空)
   */
  function _kjGetPresetByEra(era) {
    if (!era) return null;
    var e = String(era);

    // 汉 (排除南汉/北汉/后汉·五代十国时期)
    if (/汉/.test(e) && !/南汉|北汉|后汉/.test(e)) return _presetHan();

    // 魏晋 (含三国·两晋·五胡十六国·南北朝)
    if (/魏晋|三国|两晋|东晋|西晋|五胡|南北朝/.test(e)) return _presetWeijin();
    // 单字 "魏" 必排除"北魏" (北魏归南北朝·与 9 朝代差异化表魏晋同 stub)
    if (/^魏$/.test(e) || /^晋$/.test(e)) return _presetWeijin();
    if (/北魏/.test(e)) return _presetWeijin();   // 北魏·走魏晋 stub (非科举本体)

    // 隋
    if (/隋/.test(e)) return _presetSui();

    // 唐
    if (/唐/.test(e) && !/后唐|南唐/.test(e)) return _presetTang();

    // 五代十国 (含后唐/后汉/南唐/前蜀/后蜀等)·制度短乱·近唐·v7 简化用唐 preset
    if (/五代|后唐|后汉|后晉|后周|后梁|南唐/.test(e)) return _presetTang();

    // 辽·汉人科·近宋 3-tier·但实质制度弱·v7 用北宋 preset 作近似 (后可拆)
    if (/辽/.test(e)) {
      var liao = _presetBeisong();
      liao.eraDisplay = '辽';                              // 辽
      liao.features = '辽·汉人科·不主体';  // 辽·汉人科·不主体
      liao.jinshiPerExam = '数十';                     // 数十
      liao.schoolNetworkInit = { academies: [], private_schools_active: true, note: '辽不主体' };  // 辽不主体
      return liao;
    }

    // 金·汉科 + 女真进士科·近宋 3-tier
    if (/金/.test(e) && !/后金/.test(e)) {
      var jin = _presetBeisong();
      jin.eraDisplay = '金';                                // 金
      jin.features = '金·汉科+女真进士科';   // 金·汉科+女真进士科
      jin.jinshiPerExam = '50-150';
      jin.schoolNetworkInit = { academies: [], private_schools_active: true, note: '金·与宋中分' };  // 金·与宋中分
      return jin;
    }

    // 南宋 (优先匹配·必先于宋)
    if (/南宋|宋·绍兴|宋·隆兴|靖康后|南渡/.test(e)) return _presetNansong();
    // 北宋 (优先匹配·必先于宋)
    if (/北宋/.test(e)) return _presetBeisong();
    // 宋 (无北/南限定·按年份猜测·v7 默认走北宋)
    if (/宋/.test(e)) {
      // 简单启发·若 era 含 "绍兴" "靖康" "建炎" "孝宗" "理宗" "度宗" → 南宋
      if (/绍兴|建炎|孝宗|理宗|度宗|恭帝/.test(e)) return _presetNansong();
      return _presetBeisong();
    }

    // 元
    if (/元|蒙元|大元/.test(e) && !/元和/.test(e)) return _presetYuan();   // 排除唐"元和"

    // 明
    if (/明|大明|明朝/.test(e) && !/明经|明字|明法/.test(e)) return _presetMing();   // 排除"明经"等

    // 清
    if (/清|大清|清朝/.test(e)) return _presetQing();

    // 无 match·返 null
    try { console.warn('[keju·preset] no match for era=' + e + '·caller 需处理 null'); } catch(_){}
    return null;
  }

  // ════════════════════════════════════════════════════════════════
  // §3·列全 9 preset 数组·供 editor / preset selector 用
  // ════════════════════════════════════════════════════════════════

  /**
   * 返 9 朝代 preset 数组 (顺序按 A0.7 doc §2 表)
   * 注·北宋/南宋是同 era key "宋" 的 2 个 variant·共占 9 中 2 席
   * @returns {Array<Object>} 9 个 preset
   */
  function _kjListAllPresets() {
    return [
      _presetHan(),
      _presetWeijin(),
      _presetSui(),
      _presetTang(),
      _presetBeisong(),
      _presetNansong(),
      _presetYuan(),
      _presetMing(),
      _presetQing()
    ];
  }

  // ════════════════════════════════════════════════════════════════
  // §4·preset summary·UI 用
  // ════════════════════════════════════════════════════════════════

  /**
   * 单行摘要·适合 UI tooltip / select option
   * @param {Object} preset
   * @returns {string}
   */
  function _kjPresetSummary(preset) {
    if (!preset) return '';
    var tierCount = Array.isArray(preset.tiers) ? preset.tiers.length : 0;
    var jinshi = preset.jinshiPerExam || '-';
    var feat = (preset.features || '').slice(0, 40);
    return (preset.eraDisplay || preset.era) + '·' +
           preset.system + '·' +
           tierCount + '层·' +                      // 层
           '进士 ' + jinshi + '·' +              // 进士
           feat;
  }

  // ════════════════════════════════════════════════════════════════
  // §5·导出
  // ════════════════════════════════════════════════════════════════

  global.TM = global.TM || {};
  global.TM.Keju = global.TM.Keju || {};
  global.TM.Keju.Preset = {
    getPresetByEra: _kjGetPresetByEra,
    listAllPresets: _kjListAllPresets,
    presetSummary:  _kjPresetSummary,
    // 单 preset 直暴 (B3/K2 可单调·便于 spot test)
    _presetHan:      _presetHan,
    _presetWeijin:   _presetWeijin,
    _presetSui:      _presetSui,
    _presetTang:     _presetTang,
    _presetBeisong:  _presetBeisong,
    _presetNansong:  _presetNansong,
    _presetYuan:     _presetYuan,
    _presetMing:     _presetMing,
    _presetQing:     _presetQing
  };

  // 全局 alias·便于 runtime 直接调
  global._kjGetPresetByEra = _kjGetPresetByEra;
  global._kjListAllPresets = _kjListAllPresets;
  global._kjPresetSummary  = _kjPresetSummary;

  // Node·测试 export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.TM.Keju.Preset;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
