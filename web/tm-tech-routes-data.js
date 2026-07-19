// ============================================================
// tm-tech-routes-data.js — 穿越模式·玩家科技研发系统·预设固定科技路线数据
// ------------------------------------------------------------
// Phase 4.5 · Task 18 · SubTask 18.3
//
// 跨朝代铁律：本文件绝不出现任何明清专属机构/职务/科场专名（明清内廷秘书
//   机构、特务缉捕机构、科举文体、奏报文书专称、地方督抚专称、宗藩封爵
//   专称等一律由剧本 hook）。固定科技路线取中国古代通用脉络；剧本可加朝代
//   专属支线（如某朝火器、某朝活字）——通过 P.customTechRoutes 覆盖/扩展。
//
// 数据结构（与 tm-dynamic-systems.js 兼容·每条路线 5 级·每级 requires 链式）：
//   window.TECH_ROUTES_DEFAULT = {
//     <field>: {
//       label: '农业',
//       levels: [
//         { name, cost, requires, boost, desc, era },
//         ...
//       ]
//     }
//   }
//   - requires: ['<field>.<idx>'] —— 引用本线上一级的完成态（剧本可跨线 hook）
//   - boost:    { food:+5 / strength:+5 / ... } —— 解锁后落 GM/玩家增益
//   - era:      0-3 —— 时代限制系数（0=上古即有 / 3=近古·剧本可叠加朝代微调）
//
// 暴露：window.TECH_ROUTES_DEFAULT + module.exports.TECH_ROUTES_DEFAULT
// 双路径挂载：浏览器走 window.TECH_ROUTES_DEFAULT；node smoke 走 module.exports。
// ============================================================

(function (global) {
  'use strict';

  // ── 5 条主线 × 5 级·中国古代通用科技脉络 ──────────────────────
  //   boost 字段·朝代中立·剧本可覆盖：
  //     agriculture → food（农业增产）
  //     military    → strength（军事强军）/ defense
  //     craft       → craft（工艺增收）/ commerce
  //     medicine    → health（医药减疫）
  //     water       → food（水利惠农）/ commerce（漕运）
  var TECH_ROUTES_DEFAULT = {
    agriculture: {
      label: '农业',
      levels: [
        { name: '农具改良', cost: 200, requires: [],                       boost: { food: +5 },  era: 0, desc: '改良犁锹·开荒拓亩·亩产略增' },
        { name: '良种选育', cost: 400, requires: ['agriculture.0'],       boost: { food: +8 },  era: 0, desc: '择优留种·抗逆丰产' },
        { name: '水利灌溉', cost: 700, requires: ['agriculture.1'],       boost: { food: +12 }, era: 1, desc: '引水入田·旱涝保收' },
        { name: '耕作制度', cost: 1100, requires: ['agriculture.2'],      boost: { food: +16 }, era: 1, desc: '轮作休耕·地力常新' },
        { name: '多熟种植', cost: 1600, requires: ['agriculture.3'],      boost: { food: +22 }, era: 2, desc: '一年两熟·江南可三熟' }
      ]
    },
    military: {
      label: '军事',
      levels: [
        { name: '冶铁锻造', cost: 250, requires: [],                       boost: { strength: +5 },    era: 0, desc: '铁制兵器渐代铜器' },
        { name: '弩机改良', cost: 500, requires: ['military.0'],          boost: { strength: +8 },    era: 0, desc: '强弩利远·阵射有度' },
        { name: '甲胄升级', cost: 850, requires: ['military.1'],          boost: { defense: +10 },    era: 1, desc: '甲胄坚厚·士卒少伤' },
        { name: '攻城器械', cost: 1300, requires: ['military.2'],         boost: { strength: +12 },   era: 1, desc: '云梯冲车·城池可下' },
        { name: '火药初探', cost: 1900, requires: ['military.3'],         boost: { strength: +18 },   era: 2, desc: '炼丹偶得·军用初探' }
      ]
    },
    craft: {
      label: '工艺',
      levels: [
        { name: '纺织改进', cost: 200, requires: [],                       boost: { craft: +5, commerce: +3 },    era: 0, desc: '织机渐精·布帛丰厚' },
        { name: '陶瓷烧制', cost: 450, requires: ['craft.0'],            boost: { craft: +8, commerce: +5 },    era: 0, desc: '窑火纯青·名瓷行远' },
        { name: '造纸印刷', cost: 800, requires: ['craft.1'],            boost: { craft: +10, learning: +4 },   era: 1, desc: '纸薄字清·典籍广布' },
        { name: '冶铸高炉', cost: 1250, requires: ['craft.2'],           boost: { craft: +13, strength: +4 },   era: 1, desc: '高炉炼铁·百器皆利' },
        { name: '雕版活字', cost: 1800, requires: ['craft.3'],           boost: { craft: +16, learning: +8 },   era: 2, desc: '活字排印·文教大兴' }
      ]
    },
    medicine: {
      label: '医药',
      levels: [
        { name: '本草整理', cost: 250, requires: [],                       boost: { health: +5 },  era: 0, desc: '集录草药·辨性知毒' },
        { name: '方剂编纂', cost: 500, requires: ['medicine.0'],          boost: { health: +8 },  era: 0, desc: '验方集要·临证有据' },
        { name: '针灸推拿', cost: 850, requires: ['medicine.1'],          boost: { health: +10 }, era: 1, desc: '针石导引·经络通畅' },
        { name: '疫病防治', cost: 1300, requires: ['medicine.2'],         boost: { health: +14 }, era: 1, desc: '辨瘟施药·一方得安' },
        { name: '法医检验', cost: 1850, requires: ['medicine.3'],         boost: { health: +6, justice: +8 }, era: 2, desc: '检骨验伤·狱讼得明' }
      ]
    },
    water: {
      label: '水利',
      levels: [
        { name: '沟渠疏浚', cost: 220, requires: [],                       boost: { food: +4 },          era: 0, desc: '通沟洫·除水患' },
        { name: '陂塘修筑', cost: 480, requires: ['water.0'],             boost: { food: +7 },          era: 0, desc: '蓄水防旱·溉田千顷' },
        { name: '堰坝工程', cost: 820, requires: ['water.1'],             boost: { food: +10, defense: +3 }, era: 1, desc: '筑堰截流·利农兼防' },
        { name: '运河开凿', cost: 1350, requires: ['water.2'],            boost: { commerce: +12, food: +6 }, era: 2, desc: '贯通南北·漕运通商' },
        { name: '海塘修筑', cost: 1950, requires: ['water.3'],            boost: { commerce: +8, defense: +6 }, era: 2, desc: '捍海御潮·滨海得安' }
      ]
    }
  };

  // 暴露·双路径
  if (typeof global !== 'undefined') {
    if (typeof window !== 'undefined') {
      window.TECH_ROUTES_DEFAULT = TECH_ROUTES_DEFAULT;
    } else {
      global.TECH_ROUTES_DEFAULT = TECH_ROUTES_DEFAULT;
    }
  }
  if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = { TECH_ROUTES_DEFAULT: TECH_ROUTES_DEFAULT };
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
