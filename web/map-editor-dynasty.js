// map-editor-dynasty.js
// Phase 8·地图编辑器·朝代 preset
// 9 朝代·商周 / 秦 / 汉 / 唐 / 宋 / 元 / 明 / 清 / 民
// 每朝代·  level labels (各级名)·默认 autonomy·默认 terrain·常用 sample
// schema 字段不在此·此仅 dynasty 元数据
// 2026-05-06

(function(global){
  'use strict';

  var DYNASTY_PRESETS = {

    shang_zhou: {
      id: 'shang_zhou',
      label: '商·周',
      yearRange: [-1600, -256],
      sampleEra: '西周·成周',
      // level 数 = 3 (含 country)
      levels: [
        { key: 'country',    label: '天下',    placeholder: '商 / 西周 / 东周' },
        { key: 'province',   label: '邦国',    placeholder: '齐 / 鲁 / 晋 / 楚 / 秦 ...' },
        { key: 'prefecture', label: '采邑',    placeholder: '邑 / 都' }
      ],
      defaultAutonomy: 'fanguo',
      defaultRegionType: 'normal',
      autonomyHint: '诸侯邦国制·实分封·公侯伯子男五等',
      defaultTerrain: '平原',
      ethnicityDefault: { 华夏: 0.85, 蛮: 0.05, 夷: 0.05, 戎: 0.03, 狄: 0.02 },
      faithDefault: { 巫: 0.5, 祖: 0.4, 民间: 0.1 },
      bitmapAnchor: '中原 + 四夷 (东夷 / 西戎 / 南蛮 / 北狄)',
      sampleDivisions: [
        { name: '王畿',     level: 'province', autonomy: 'zhixia' },
        { name: '齐',       level: 'province', autonomy: 'fanguo' },
        { name: '鲁',       level: 'province', autonomy: 'fanguo' },
        { name: '晋',       level: 'province', autonomy: 'fanguo' },
        { name: '楚',       level: 'province', autonomy: 'fanguo' },
        { name: '秦',       level: 'province', autonomy: 'fanguo' }
      ]
    },

    qin: {
      id: 'qin',
      label: '秦',
      yearRange: [-221, -207],
      sampleEra: '秦·始皇',
      // 郡县制·level 数 = 3
      levels: [
        { key: 'country',    label: '天下',    placeholder: '秦' },
        { key: 'province',   label: '郡',      placeholder: '陇西郡 / 北地郡 / 上郡 ...' },
        { key: 'prefecture', label: '县',      placeholder: '咸阳 / 栎阳 / 雍 ...' }
      ],
      defaultAutonomy: 'zhixia',
      defaultRegionType: 'normal',
      autonomyHint: '郡县制·官吏皆中央委派·首推中央集权',
      defaultTerrain: '平原',
      ethnicityDefault: { 华夏: 0.95, 戎: 0.03, 越: 0.02 },
      faithDefault: { 巫: 0.4, 祖: 0.4, 民间: 0.2 },
      bitmapAnchor: '36 郡 (后增至 48 郡)',
      sampleDivisions: [
        { name: '内史',     level: 'province' },
        { name: '陇西郡',   level: 'province' },
        { name: '北地郡',   level: 'province' },
        { name: '上郡',     level: 'province' },
        { name: '汉中郡',   level: 'province' },
        { name: '蜀郡',     level: 'province' }
      ]
    },

    han: {
      id: 'han',
      label: '汉',
      yearRange: [-202, 220],
      sampleEra: '西汉·武帝',
      // 州 → 郡国 → 县·level 数 = 4
      levels: [
        { key: 'country',    label: '天下',    placeholder: '西汉 / 东汉' },
        { key: 'province',   label: '州',      placeholder: '司隶 / 豫州 / 冀州 ...' },
        { key: 'prefecture', label: '郡国',    placeholder: '颍川 / 南阳 / 楚国 ...' },
        { key: 'county',     label: '县',      placeholder: '阳翟 / 宛 / 彭城 ...' }
      ],
      defaultAutonomy: 'mixed',
      defaultRegionType: 'normal',
      autonomyHint: '郡国并行·汉初分封·后渐削·西域置都护府',
      defaultTerrain: '平原',
      ethnicityDefault: { 汉: 0.92, 匈奴: 0.02, 羌: 0.02, 越: 0.02, 夷: 0.02 },
      faithDefault: { 儒: 0.3, 巫: 0.3, 祖: 0.3, 道: 0.05, 民间: 0.05 },
      bitmapAnchor: '13 州 + 西域都护府',
      sampleDivisions: [
        { name: '司隶校尉部', level: 'province' },
        { name: '豫州',       level: 'province' },
        { name: '冀州',       level: 'province' },
        { name: '兖州',       level: 'province' },
        { name: '徐州',       level: 'province' },
        { name: '扬州',       level: 'province' },
        { name: '荆州',       level: 'province' },
        { name: '益州',       level: 'province' },
        { name: '凉州',       level: 'province' },
        { name: '并州',       level: 'province' },
        { name: '幽州',       level: 'province' },
        { name: '青州',       level: 'province' },
        { name: '交州',       level: 'province' },
        { name: '西域都护府', level: 'province', autonomy: 'jimi' }
      ]
    },

    tang: {
      id: 'tang',
      label: '唐',
      yearRange: [618, 907],
      sampleEra: '唐·玄宗 (开元)',
      // 道 → 州 → 县·level 数 = 4 (后期改府)
      levels: [
        { key: 'country',    label: '天下',    placeholder: '唐' },
        { key: 'province',   label: '道',      placeholder: '关内道 / 河南道 / 河北道 ...' },
        { key: 'prefecture', label: '州/府',   placeholder: '京兆府 / 河南府 / 太原府 / 凉州 ...' },
        { key: 'county',     label: '县',      placeholder: '长安 / 万年 / 洛阳 ...' }
      ],
      defaultAutonomy: 'zhixia',
      defaultRegionType: 'normal',
      autonomyHint: '道为监察·州县实治·西域 / 漠北置都护府 (羁縻)',
      defaultTerrain: '平原',
      ethnicityDefault: { 汉: 0.88, 突厥: 0.04, 吐蕃: 0.03, 回鹘: 0.02, 诸蕃: 0.03 },
      faithDefault: { 儒: 0.35, 佛: 0.3, 道: 0.2, 祆: 0.05, 民间: 0.1 },
      bitmapAnchor: '10 道 + 安西 / 北庭 / 安北 / 安东 / 安南 / 单于 6 都护府',
      sampleDivisions: [
        { name: '关内道',     level: 'province' },
        { name: '河南道',     level: 'province' },
        { name: '河东道',     level: 'province' },
        { name: '河北道',     level: 'province' },
        { name: '山南道',     level: 'province' },
        { name: '陇右道',     level: 'province' },
        { name: '淮南道',     level: 'province' },
        { name: '江南道',     level: 'province' },
        { name: '剑南道',     level: 'province' },
        { name: '岭南道',     level: 'province' },
        { name: '安西大都护府', level: 'province', autonomy: 'jimi' },
        { name: '北庭都护府',  level: 'province', autonomy: 'jimi' },
        { name: '安北都护府',  level: 'province', autonomy: 'jimi' },
        { name: '安东都护府',  level: 'province', autonomy: 'jimi' }
      ]
    },

    song: {
      id: 'song',
      label: '宋',
      yearRange: [960, 1279],
      sampleEra: '北宋·神宗 (元丰)',
      // 路 → 府/州 → 县·level 数 = 4
      levels: [
        { key: 'country',    label: '天下',    placeholder: '北宋 / 南宋' },
        { key: 'province',   label: '路',      placeholder: '京东东路 / 京西南路 / 河东路 ...' },
        { key: 'prefecture', label: '府/州',   placeholder: '开封府 / 应天府 / 兴元府 / 杭州 ...' },
        { key: 'county',     label: '县',      placeholder: '开封 / 祥符 / 长安 ...' }
      ],
      defaultAutonomy: 'zhixia',
      defaultRegionType: 'normal',
      autonomyHint: '路司分掌·州县实治·北边面对辽 / 西夏 / 金',
      defaultTerrain: '平原',
      ethnicityDefault: { 汉: 0.92, 契丹: 0.02, 党项: 0.02, 女真: 0.01, 诸蕃: 0.03 },
      faithDefault: { 儒: 0.4, 佛: 0.3, 道: 0.2, 民间: 0.1 },
      bitmapAnchor: '北宋 23 路 + 后期 26 路·南宋 16 路',
      sampleDivisions: [
        { name: '京畿路',     level: 'province' },
        { name: '京东东路',   level: 'province' },
        { name: '京东西路',   level: 'province' },
        { name: '京西南路',   level: 'province' },
        { name: '京西北路',   level: 'province' },
        { name: '河北东路',   level: 'province' },
        { name: '河北西路',   level: 'province' },
        { name: '河东路',     level: 'province' },
        { name: '永兴军路',   level: 'province' },
        { name: '秦凤路',     level: 'province' },
        { name: '淮南东路',   level: 'province' },
        { name: '淮南西路',   level: 'province' },
        { name: '两浙路',     level: 'province' },
        { name: '江南东路',   level: 'province' },
        { name: '江南西路',   level: 'province' },
        { name: '荆湖南路',   level: 'province' },
        { name: '荆湖北路',   level: 'province' },
        { name: '成都府路',   level: 'province' },
        { name: '梓州路',     level: 'province' },
        { name: '利州路',     level: 'province' },
        { name: '夔州路',     level: 'province' },
        { name: '福建路',     level: 'province' },
        { name: '广南东路',   level: 'province' },
        { name: '广南西路',   level: 'province' }
      ]
    },

    yuan: {
      id: 'yuan',
      label: '元',
      yearRange: [1271, 1368],
      sampleEra: '元·世祖 (至元)',
      // 行省 → 路 → 府 → 州 → 县·5 levels !!
      levels: [
        { key: 'country',    label: '天下',    placeholder: '元' },
        { key: 'province',   label: '行省',    placeholder: '中书省 / 河南江北行省 / 陕西行省 ...' },
        { key: 'prefecture', label: '路',      placeholder: '大都路 / 真定路 / 顺天路 ...' },
        { key: 'county',     label: '府/州',   placeholder: '大兴府 / 宛平州 ...' },
        { key: 'district',   label: '县',      placeholder: '大兴 / 宛平 ...' }
      ],
      defaultAutonomy: 'zhixia',
      defaultRegionType: 'normal',
      autonomyHint: '行省为分中央·宣政院辖吐蕃·朝鲜为征东行省',
      defaultTerrain: '平原',
      ethnicityDefault: { 汉: 0.65, 蒙: 0.15, 色目: 0.1, 女真: 0.05, 诸蕃: 0.05 },
      faithDefault: { 佛: 0.3, 萨满: 0.2, 道: 0.15, 儒: 0.15, 伊: 0.1, 也里可温: 0.1 },
      bitmapAnchor: '11 行省 + 中书省 + 宣政院',
      sampleDivisions: [
        { name: '中书省',          level: 'province' },
        { name: '岭北行省',        level: 'province' },
        { name: '辽阳行省',        level: 'province' },
        { name: '河南江北行省',    level: 'province' },
        { name: '陕西行省',        level: 'province' },
        { name: '甘肃行省',        level: 'province' },
        { name: '四川行省',        level: 'province' },
        { name: '云南行省',        level: 'province' },
        { name: '湖广行省',        level: 'province' },
        { name: '江浙行省',        level: 'province' },
        { name: '江西行省',        level: 'province' },
        { name: '宣政院辖地',      level: 'province', autonomy: 'jimi' },
        { name: '征东行省',        level: 'province', autonomy: 'fanguo' }
      ]
    },

    ming: {
      id: 'ming',
      label: '明',
      yearRange: [1368, 1644],
      sampleEra: '明·万历 / 天启 / 崇祯',
      // 布政司 → 府/直隶州 → 州 → 县·level 数 = 5 (含都司)
      levels: [
        { key: 'country',    label: '天下',    placeholder: '明' },
        { key: 'province',   label: '布政司/都司', placeholder: '北直隶 / 南直隶 / 山东 / 山西 / 河南 ... 辽东都司 / 大宁都司 ...' },
        { key: 'prefecture', label: '府/直隶州', placeholder: '顺天府 / 应天府 / 济南府 / 太原府 ...' },
        { key: 'county',     label: '州',      placeholder: '通州 / 蓟州 / 涿州 ...' },
        { key: 'district',   label: '县',      placeholder: '大兴 / 宛平 / 顺义 ...' }
      ],
      defaultAutonomy: 'zhixia',
      defaultRegionType: 'normal',
      autonomyHint: '布政司管民政·都司管军·两京直隶·西南土司羁縻',
      defaultTerrain: '平原',
      ethnicityDefault: { 汉: 0.94, 蒙: 0.02, 苗: 0.02, 壮: 0.01, 诸土司: 0.01 },
      faithDefault: { 儒: 0.5, 佛: 0.2, 道: 0.15, 民间: 0.15 },
      bitmapAnchor: '13 布政司 + 7 都司 + 北/南 2 直隶 + 西南 4 土司',
      sampleDivisions: [
        { name: '北直隶',     level: 'province' },
        { name: '南直隶',     level: 'province' },
        { name: '山东布政司', level: 'province' },
        { name: '山西布政司', level: 'province' },
        { name: '河南布政司', level: 'province' },
        { name: '陕西布政司', level: 'province' },
        { name: '四川布政司', level: 'province' },
        { name: '湖广布政司', level: 'province' },
        { name: '江西布政司', level: 'province' },
        { name: '浙江布政司', level: 'province' },
        { name: '福建布政司', level: 'province' },
        { name: '广东布政司', level: 'province' },
        { name: '广西布政司', level: 'province' },
        { name: '云南布政司', level: 'province' },
        { name: '贵州布政司', level: 'province' },
        { name: '辽东都司',   level: 'province' },
        { name: '大宁都司',   level: 'province' },
        { name: '万全都司',   level: 'province' },
        { name: '陕西行都司', level: 'province' },
        { name: '四川行都司', level: 'province' },
        { name: '湖广行都司', level: 'province' },
        { name: '福建行都司', level: 'province' },
        { name: '乌斯藏都司', level: 'province', autonomy: 'jimi' },
        { name: '朵甘都司',   level: 'province', autonomy: 'jimi' }
      ]
    },

    qing: {
      id: 'qing',
      label: '清',
      yearRange: [1636, 1912],
      sampleEra: '清·乾隆 / 嘉庆 / 道光',
      // 省 → 府/直隶州 → 县/散州·level 数 = 4
      levels: [
        { key: 'country',    label: '天下',    placeholder: '清' },
        { key: 'province',   label: '省/将军辖区', placeholder: '直隶 / 山东 / 江苏 ... 盛京将军 / 吉林将军 / 黑龙江将军 / 伊犁将军 ...' },
        { key: 'prefecture', label: '府/直隶州', placeholder: '顺天府 / 保定府 / 济南府 ...' },
        { key: 'county',     label: '县/散州', placeholder: '大兴 / 宛平 / 通州 ...' }
      ],
      defaultAutonomy: 'zhixia',
      defaultRegionType: 'normal',
      autonomyHint: '内地 18 省·满蒙置将军·西藏 / 青海 / 蒙古为羁縻 / 朝贡',
      defaultTerrain: '平原',
      ethnicityDefault: { 汉: 0.88, 满: 0.04, 蒙: 0.03, 回: 0.02, 藏: 0.01, 诸夷: 0.02 },
      faithDefault: { 儒: 0.45, 佛: 0.2, 道: 0.1, 萨满: 0.05, 伊: 0.05, 民间: 0.15 },
      bitmapAnchor: '18 省 + 5 将军辖区 (盛京/吉林/黑龙江/伊犁/绥远) + 西藏 / 蒙古',
      sampleDivisions: [
        { name: '直隶省',     level: 'province' },
        { name: '山东省',     level: 'province' },
        { name: '山西省',     level: 'province' },
        { name: '河南省',     level: 'province' },
        { name: '江苏省',     level: 'province' },
        { name: '安徽省',     level: 'province' },
        { name: '江西省',     level: 'province' },
        { name: '浙江省',     level: 'province' },
        { name: '福建省',     level: 'province' },
        { name: '湖北省',     level: 'province' },
        { name: '湖南省',     level: 'province' },
        { name: '陕西省',     level: 'province' },
        { name: '甘肃省',     level: 'province' },
        { name: '四川省',     level: 'province' },
        { name: '广东省',     level: 'province' },
        { name: '广西省',     level: 'province' },
        { name: '云南省',     level: 'province' },
        { name: '贵州省',     level: 'province' },
        { name: '盛京将军辖区', level: 'province' },
        { name: '吉林将军辖区', level: 'province' },
        { name: '黑龙江将军辖区', level: 'province' },
        { name: '伊犁将军辖区', level: 'province', autonomy: 'jimi' },
        { name: '乌里雅苏台',   level: 'province', autonomy: 'jimi' },
        { name: '西藏',         level: 'province', autonomy: 'jimi' }
      ]
    },

    republic: {
      id: 'republic',
      label: '民国',
      yearRange: [1912, 1949],
      sampleEra: '民国·南京政府',
      // 省 → 行政督察区 → 县·level 数 = 4
      levels: [
        { key: 'country',    label: '天下',    placeholder: '中华民国' },
        { key: 'province',   label: '省',      placeholder: '河北 / 山东 / 江苏 ...' },
        { key: 'prefecture', label: '行政督察区', placeholder: '保定督察区 / 烟台督察区 ...' },
        { key: 'county',     label: '县',      placeholder: '保定 / 安国 / 涿县 ...' }
      ],
      defaultAutonomy: 'zhixia',
      defaultRegionType: 'normal',
      autonomyHint: '省级行政督察区·部分省份军阀实控·西部 / 边疆羁縻',
      defaultTerrain: '平原',
      ethnicityDefault: { 汉: 0.92, 满: 0.01, 蒙: 0.02, 回: 0.02, 藏: 0.01, 诸: 0.02 },
      faithDefault: { 儒: 0.3, 佛: 0.2, 道: 0.1, 基: 0.05, 伊: 0.05, 民间: 0.3 },
      bitmapAnchor: '35 省 + 12 直辖市 + 2 地方 (西藏 / 蒙古)',
      sampleDivisions: [
        { name: '河北省',     level: 'province' },
        { name: '山东省',     level: 'province' },
        { name: '河南省',     level: 'province' },
        { name: '江苏省',     level: 'province' },
        { name: '浙江省',     level: 'province' },
        { name: '安徽省',     level: 'province' },
        { name: '福建省',     level: 'province' },
        { name: '江西省',     level: 'province' },
        { name: '湖北省',     level: 'province' },
        { name: '湖南省',     level: 'province' },
        { name: '广东省',     level: 'province' },
        { name: '广西省',     level: 'province' },
        { name: '云南省',     level: 'province' },
        { name: '贵州省',     level: 'province' },
        { name: '四川省',     level: 'province' },
        { name: '陕西省',     level: 'province' },
        { name: '甘肃省',     level: 'province' },
        { name: '青海省',     level: 'province' },
        { name: '宁夏省',     level: 'province' },
        { name: '绥远省',     level: 'province' },
        { name: '察哈尔省',   level: 'province' },
        { name: '热河省',     level: 'province' },
        { name: '辽宁省',     level: 'province' },
        { name: '吉林省',     level: 'province' },
        { name: '黑龙江省',   level: 'province' },
        { name: '新疆省',     level: 'province', autonomy: 'jimi' },
        { name: '西藏地方',   level: 'province', autonomy: 'jimi' },
        { name: '蒙古地方',   level: 'province', autonomy: 'fanguo' }
      ]
    }
  };

  // 默认朝代 (新建空地图时载入)
  var DEFAULT_DYNASTY = 'ming';

  // ───────────────────────────────────────────────────────────
  // 公共 API
  // ───────────────────────────────────────────────────────────

  function listDynasties(){
    var arr = [];
    for (var k in DYNASTY_PRESETS){
      if (Object.prototype.hasOwnProperty.call(DYNASTY_PRESETS, k)) arr.push(DYNASTY_PRESETS[k]);
    }
    return arr;
  }

  function getDynasty(id){
    return DYNASTY_PRESETS[id] || DYNASTY_PRESETS[DEFAULT_DYNASTY];
  }

  function getLevelLabel(dynastyId, levelKey){
    var d = getDynasty(dynastyId);
    var lvl = (d.levels || []).find(function(L){ return L.key === levelKey; });
    return lvl ? lvl.label : levelKey;
  }

  function getLevelKeysFor(dynastyId){
    var d = getDynasty(dynastyId);
    return (d.levels || []).map(function(L){ return L.key; });
  }

  // 验证 level 在 dynasty 是否合法
  function isLevelValid(dynastyId, levelKey){
    return getLevelKeysFor(dynastyId).indexOf(levelKey) !== -1;
  }

  // expose
  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.dynasty = {
    DYNASTY_PRESETS: DYNASTY_PRESETS,
    DEFAULT_DYNASTY: DEFAULT_DYNASTY,
    list: listDynasties,
    get: getDynasty,
    levelLabel: getLevelLabel,
    levelKeys: getLevelKeysFor,
    isLevelValid: isLevelValid
  };

})(typeof window !== 'undefined' ? window : this);
